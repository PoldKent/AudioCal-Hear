import test from 'node:test';
import assert from 'node:assert/strict';
import {HEAR3_EQ_ENGINE_FORMAT} from '../src/hear3/bounded-eq-engine.mjs';
import {proposeHear3ExperimentalListeningEq,HEAR_EXPERIMENTAL_EQ_POLICY}
 from '../src/hear3/experimental-listening-eq.mjs';
import {inspectHear3ImmediateEq,formatHear3ImmediateEq}
 from '../src/hear3/immediate-eq-result.mjs';

function fixture(){
 const frequencies=[125,250,500],profileId='hear3-integrated-pilot';
 const makeTone=(f,dB,response,id)=>({
  toneId:id,frequencyHz:f,digitalLevelDbfs:dB,channel:'joint',
  response,provenance:'user-response',
 });
 const bands=[
  {id:'band-125',frequencyHz:125,observations:[
   makeTone(125,-60,'heard','a'),makeTone(125,-66,'heard','b')]},
  {id:'band-250',frequencyHz:250,observations:[
   makeTone(250,-60,'not-heard','c'),
   makeTone(250,-54,'not-heard','d'),
   makeTone(250,-48,'not-heard','e'),
   makeTone(250,-42,'not-heard','f')]},
  {id:'band-500',frequencyHz:500,observations:[
   makeTone(500,-60,'heard','g')]},
 ];
 const rows=bands.map((b,i)=>({
  bandId:b.id,frequencyHz:b.frequencyHz,gainDb:i===0?1:0,
  source:'direct-subjective-contrast',confidence:'low',
  observedResponses:b.observations.length,estimated:false,
 }));
 const baseEq={
  format:HEAR3_EQ_ENGINE_FORMAT,method:'bounded-hybrid-subjective-contrast-v1',
  profileId,channel:'joint',bandCount:3,
  capDb:3,rows,autoApplyAllowed:false,validatedForProduction:false,
  headroomVerified:false,clippingVerified:false,acousticCalibration:'not-established',
  correctionCoverage:'relative-model',currentEq:rows.map(r=>({
   bandId:r.bandId,gainDb:r.gainDb,
  })),
 };
 const examSnapshot={status:'completed',profileId,bands};
 const sessionSnapshot={status:'completed',profileId,observations:
  bands.flatMap(b=>b.observations),invalidatedToneIds:[],
  authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42},
 };
 return {baseEq,examSnapshot,sessionSnapshot};
}
test('user-perception model maintains heard tones, gently explores inaudible and attenuates explicitly loud',()=>{
 const f=fixture();
 const out=proposeHear3ExperimentalListeningEq({...f,
  loudToneReports:[{toneId:'g',frequencyHz:500}]});
 assert.equal(out.selectedMethod,HEAR_EXPERIMENTAL_EQ_POLICY);
 assert.deepEqual(out.rows.map(x=>x.gainDb),[0,0.5,-1]);
 assert.deepEqual(out.rows.map(x=>x.source),[
  'heard-without-contrast-maintain',
  'inaudible-at-digital-ceiling-hypothesis',
  'explicit-too-loud-attenuate']);
 assert.equal(out.autoApplyAllowed,false);
 assert.equal(out.headroomVerified,false);
 assert.equal(out.validatedForProduction,false);
 const view=inspectHear3ImmediateEq(out);
 assert.match(formatHear3ImmediateEq(view),/250 Hz = \+0\.5 dB/);
 assert.match(formatHear3ImmediateEq(view),/500 Hz = -1 dB/);
});
test('without explicit loudness mark a heard band cannot be silently attenuated',()=>{
 const f=fixture();
 const out=proposeHear3ExperimentalListeningEq(f);
 assert.deepEqual(out.rows.map(x=>x.gainDb),[0,0.5,0]);
});
test('one missed tone or missing evidence never produces invented amplification',()=>{
 const f=fixture();
 f.examSnapshot.bands[1].observations=f.examSnapshot.bands[1].observations.slice(0,1);
 f.sessionSnapshot.observations=f.examSnapshot.bands.flatMap(b=>b.observations);
 assert.equal(proposeHear3ExperimentalListeningEq(f).rows[1].gainDb,0);
});
test('a missing frequency never justifies an amplified correction before digital ceiling',()=>{
 const f=fixture();
 f.examSnapshot.bands[1].observations=f.examSnapshot.bands[1].observations.slice(0,3);
 f.sessionSnapshot.observations=f.examSnapshot.bands.flatMap(b=>b.observations);
 assert.equal(proposeHear3ExperimentalListeningEq(f).rows[1].gainDb,0);
});
test('forged, duplicate and retired loudness records fail closed',()=>{
 const f=fixture();
 for(const reports of [
  [{toneId:'invented',frequencyHz:500}],
  [{toneId:'c',frequencyHz:250}],
  [{toneId:'g',frequencyHz:125}],
  [{toneId:'g',frequencyHz:500},{toneId:'g',frequencyHz:500}],
 ]){
  assert.throws(()=>proposeHear3ExperimentalListeningEq({...f,
   loudToneReports:reports}),/verified tone|Invalid loudness/);
 }
 f.sessionSnapshot.invalidatedToneIds=['g'];
 assert.throws(()=>proposeHear3ExperimentalListeningEq({...f,
  loudToneReports:[{toneId:'g',frequencyHz:500}]}),/verified tone/);
});
test('invalid EQ origin and incomplete exam cannot create a preferential curve',()=>{
 const f=fixture();
 assert.throws(()=>proposeHear3ExperimentalListeningEq({...f,
  baseEq:{...f.baseEq,autoApplyAllowed:true}}),/verified/);
 assert.throws(()=>proposeHear3ExperimentalListeningEq({...f,
  examSnapshot:{...f.examSnapshot,status:'playing'}}),/completed/);
 assert.throws(()=>proposeHear3ExperimentalListeningEq({...f,
  loudToneReports:Array(65).fill({toneId:'x',frequencyHz:500})}),/Invalid loudness/);
});
