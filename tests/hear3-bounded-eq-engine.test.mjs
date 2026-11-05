import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHear3BoundedJointEq,HEAR3_EQ_ENGINE_FORMAT,HEAR3_EQ_ENGINE_METHOD}
 from '../src/hear3/bounded-eq-engine.mjs';

const freqs=[125,250,500,1000,2000];
function makeCase(levels=freqs.map(()=>-63),{repeat=4,channel='joint'}={}){
 let sequence=0;
 const bands=freqs.map((frequencyHz,i)=>{
  const mid=levels[i];
  const obs=mid===null?[]:Array.from({length:repeat},(_,j)=>{
   const heard=j%2===0;
   return {toneId:'tone-'+(++sequence),frequencyHz,
    digitalLevelDbfs:mid+(heard?3:-3),channel,
    response:heard?'heard':'not-heard',provenance:'user-response'};
  });
  return {
   id:'band-'+frequencyHz,frequencyHz,status:mid===null?'inconclusive':'bounded-subjective-interval',
   intervalDbfs:mid===null?null:{notHeardAtDbfs:mid-3,heardAtDbfs:mid+3},
   confidence:mid===null?'inconclusive':repeat>=4?'medium':'low',
   observations:obs,
  };
 });
 const exam={
  status:'completed',profileId:'pilot',channel,
  completedBands:bands.length,totalBands:bands.length,
  activeToneId:null,thresholdsEstimated:0,eqGainsCalculated:0,
  authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42},bands,
 };
 const session={
  status:'completed',profileId:'pilot',currentTone:null,
  authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42},
  observations:bands.flatMap(b=>b.observations),
 };
 return {examSnapshot:exam,sessionSnapshot:session,deviceCategory:'headphones'};
}
function compute(c){return calculateHear3BoundedJointEq(c);}
test('produces one deterministic joint EQ with explicit caps, zero autoplay and no physical validity claim',()=>{
 const input=makeCase([-63,-63,-63,-51,-63]);
 const before=JSON.stringify(input);
 const first=compute(input);
 assert.deepEqual(first,compute(input));
 assert.equal(JSON.stringify(input),before);
 assert.equal(first.format,HEAR3_EQ_ENGINE_FORMAT);
 assert.equal(first.method,HEAR3_EQ_ENGINE_METHOD);
 assert.equal(first.channel,'joint');
 assert.equal(first.bandCount,5);
 assert.equal(first.observedEligibleBands,5);
 assert.equal(first.capDb,3);
 assert.equal(first.stepDb,0.5);
 assert.equal(first.autoApplyAllowed,false);
 assert.equal(first.devicePositionConversionAllowed,false);
 assert.equal(first.validatedForProduction,false);
 assert.equal(first.headroomVerified,false);
 assert.equal(first.clippingVerified,false);
 assert.equal(first.preamplificationDb,null);
 assert.equal(first.acousticCalibration,'not-established');
 assert.equal(first.physicalRouteVerified,false);
 assert.ok(first.warnings.some(w=>w.includes('dBFS')));
 assert.ok(first.warnings.some(w=>w.includes('headroom')));
 assert.equal(first.rows.length,5);
 assert.ok(first.rows[3].gainDb>0);
 assert.ok(first.rows.every(r=>Number.isFinite(r.gainDb)&&Math.abs(r.gainDb)<=3));
 assert.deepEqual(first.originalEq,first.currentEq);
});
test('flat subjective brackets produce flat zero gain without fabricated boost',()=>{
 const r=compute(makeCase());
 assert.ok(r.rows.every(x=>x.gainDb===0));
 assert.ok(r.rows.every(x=>x.source==='direct-subjective-contrast'));
 assert.equal(r.nominalPositiveGainSumDb,0);
 assert.equal(r.correctionCoverage,'relative-model');
});
test('all inconclusive or just one valid bracket produce a neutral result, not guessed thresholds',()=>{
 for(const levels of [
  [null,null,null,null,null],
  [null,null,-63,null,null],
 ]){
  const r=compute(makeCase(levels));
  assert.equal(r.correctionCoverage,'neutral-only-no-valid-contrast');
  assert.equal(r.eligibleEstimateCount,0);
  assert.ok(r.rows.every(x=>x.gainDb===0));
  assert.equal(r.validatedForProduction,false);
 }
});
test('inconclusive bands with contradictory observations remain neutral and do not get interpolated',()=>{
 const data=makeCase([-63,-51,-63,-51,-63]);
 const b=data.examSnapshot.bands[2];
 b.status='inconclusive';b.intervalDbfs=null;b.confidence='inconclusive';
 // Existing responses at this band are preserved, never reinterpreted.
 const r=compute(data);
 assert.equal(r.rows[2].gainDb,0);
 assert.equal(r.rows[2].source,'neutral-inconclusive');
 assert.equal(r.rows[2].estimated,false);
 assert.equal(r.eligibleEstimateCount,0);
});
test('overly broad brackets stay neutral even when surrounding bands are eligible',()=>{
 const data=makeCase([-63,-63,-63,-51,-63]);
 const b=data.examSnapshot.bands[2];
 for(const o of b.observations){
  o.digitalLevelDbfs=o.response==='heard'?-55:-75;
 }
 b.intervalDbfs={notHeardAtDbfs:-75,heardAtDbfs:-55};
 data.sessionSnapshot.observations=data.examSnapshot.bands.flatMap(x=>x.observations);
 const r=compute(data);
 assert.equal(r.rows[2].source,'neutral-wide-interval');
 assert.equal(r.rows[2].gainDb,0);
 assert.equal(r.observedEligibleBands,4);
});
test('only one narrow unmeasured gap with two nearby medium-confidence flanks may be estimated',()=>{
 const input=makeCase([-63,-51,null,-51,-63]);
 // Move the flanks close to the middle; all center bands remain sorted.
 input.examSnapshot.bands[1].frequencyHz=500;
 input.examSnapshot.bands[2].frequencyHz=630;
 input.examSnapshot.bands[3].frequencyHz=800;
 input.examSnapshot.bands[4].frequencyHz=2000;
 for(let i=1;i<=4;i++){
  const b=input.examSnapshot.bands[i];
  b.id='custom-'+i;
  for(const o of b.observations)o.frequencyHz=b.frequencyHz;
 }
 input.sessionSnapshot.observations=input.examSnapshot.bands.flatMap(b=>b.observations);
 const r=compute(input);
 assert.equal(r.rows[2].source,'estimated-from-neighbor-subjective-brackets');
 assert.equal(r.rows[2].estimated,true);
 assert.equal(r.rows[2].confidence,'low');
 assert.equal(r.rows[2].intervalDbfs,null);
 assert.ok(Math.abs(r.rows[2].gainDb)<=1);
 assert.equal(r.eligibleEstimateCount,1);
});
test('non-adjacent gaps, weak neighboring confidence and very wide frequency spans stay neutral',()=>{
 const input=makeCase([-63,-51,null,-51,-63],{repeat:2});
 const r=compute(input);
 assert.equal(r.rows[2].gainDb,0);
 assert.equal(r.rows[2].estimated,false);
});
test('different categories restrict mathematical gain magnitude, not physical output safety',()=>{
 const i=makeCase([-63,-63,-63,-45,-63]);
 const headphone=compute(i);
 const speaker=compute({...i,deviceCategory:'speaker'});
 const car=compute({...i,deviceCategory:'car'});
 for(const r of [speaker,car]){
  assert.equal(r.capDb,2);
  assert.ok(r.rows.every(b=>Math.abs(b.gainDb)<=2));
  assert.equal(r.autoApplyAllowed,false);
 }
 assert.equal(headphone.capDb,3);
 assert.ok(headphone.rows.some(r=>r.gainDb>speaker.rows.find(x=>x.bandId===r.bandId).gainDb));
});
test('half-dB quantization and category caps hold across 2-31 supported bands',()=>{
 for(const count of [2,4,5,7,10,15,31]){
  const freqs=Array.from({length:count},(_,i)=>100*Math.pow(150,i/(count-1)));
  const rows=freqs.map((frequencyHz,i)=>({
   id:'b'+i,frequencyHz,status:'bounded-subjective-interval',
   intervalDbfs:{notHeardAtDbfs:-70+(i%4)*5,heardAtDbfs:-64+(i%4)*5},
   confidence:'medium',
   observations:[
    {toneId:'lo-'+i,frequencyHz,channel:'joint',digitalLevelDbfs:-70+(i%4)*5,response:'not-heard',provenance:'user-response'},
    {toneId:'hi-'+i,frequencyHz,channel:'joint',digitalLevelDbfs:-64+(i%4)*5,response:'heard',provenance:'user-response'},
    {toneId:'lo2-'+i,frequencyHz,channel:'joint',digitalLevelDbfs:-70+(i%4)*5,response:'not-heard',provenance:'user-response'},
    {toneId:'hi2-'+i,frequencyHz,channel:'joint',digitalLevelDbfs:-64+(i%4)*5,response:'heard',provenance:'user-response'},
   ],
  }));
  const r=compute({
   examSnapshot:{status:'completed',profileId:'p',channel:'joint',bands:rows,
    completedBands:count,totalBands:count,activeToneId:null,thresholdsEstimated:0,
    eqGainsCalculated:0,authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42}},
   sessionSnapshot:{status:'completed',profileId:'p',currentTone:null,
    observations:rows.flatMap(b=>b.observations),
    authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42}},
   deviceCategory:'application',
  });
  assert.equal(r.rows.length,count);
  assert.ok(r.rows.every(x=>Math.abs(x.gainDb)<=3&&Number.isInteger(x.gainDb*2)));
 }
});
test('uniform digital shift preserves relative correction if still within authorized bounds',()=>{
 const i=makeCase([-66,-63,-60,-54,-66]);
 const shifted=makeCase([-64,-61,-58,-52,-64]);
 const a=compute(i),b=compute(shifted);
 assert.deepEqual(a.rows.map(x=>x.gainDb),b.rows.map(x=>x.gainDb));
});
test('rejects unfinished, mismatched, per-ear and invalid digital evidence before generating EQ',()=>{
 const originals=[
  d=>{d.examSnapshot.status='paused';},
  d=>{d.sessionSnapshot.status='playing';},
  d=>{d.examSnapshot.activeToneId='tone';},
  d=>{d.sessionSnapshot.currentTone={toneId:'tone'};},
  d=>{d.examSnapshot.profileId='other';},
  d=>{d.examSnapshot.channel='left';},
  d=>{d.examSnapshot.totalBands=6;},
  d=>{d.examSnapshot.eqGainsCalculated=1;},
  d=>{d.examSnapshot.bands[1].frequencyHz=50;},
  d=>{d.examSnapshot.bands[1].id=d.examSnapshot.bands[0].id;},
  d=>{d.examSnapshot.bands[1].observations[0].response='other';},
  d=>{d.examSnapshot.bands[1].intervalDbfs.heardAtDbfs=-80;},
  d=>{d.examSnapshot.bands[1].observations[0].digitalLevelDbfs=0;},
  d=>{d.examSnapshot.bands[1].observations[0].channel='left';},
  d=>{d.examSnapshot.bands[1].observations[0].provenance='legacy-unverified';},
  d=>{d.sessionSnapshot.observations.pop();},
  d=>{d.sessionSnapshot.authorizedDigitalRangeDbfs.maxDbfs=-20;},
  d=>{d.deviceCategory='not-a-device';},
 ];
 for(const corrupt of originals){
  const input=makeCase([-63,-63,-63,-51,-63]);
  corrupt(input);
  assert.throws(()=>compute(input));
 }
});
