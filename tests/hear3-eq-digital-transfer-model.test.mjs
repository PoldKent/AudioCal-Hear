import test from 'node:test';
import assert from 'node:assert/strict';
import {modelHear3GraphicEqDigitalTransfer,simulateHear3DigitalEqSamples,
 HEAR3_EQ_DSP_MODEL_FORMAT} from '../src/hear3/eq-digital-transfer-model.mjs';
import {HEAR3_EQ_ENGINE_FORMAT} from '../src/hear3/bounded-eq-engine.mjs';

function draft(gains=[0,0,0,0,0],{category='headphones',freqs=[125,250,500,1000,2000]}={}){
 const cap=category==='speaker'||category==='car'?2:3;
 const rows=gains.map((gainDb,i)=>({
  bandId:'band-'+i,frequencyHz:freqs[i],gainDb,
  source:gainDb===0?'neutral-inconclusive':'direct-subjective-contrast',
 }));
 const eq=rows.map(r=>({bandId:r.bandId,gainDb:r.gainDb}));
 return {format:HEAR3_EQ_ENGINE_FORMAT,channel:'joint',profileId:'synthetic',
  deviceCategory:category,bandCount:rows.length,rows,
  capDb:cap,stepDb:0.5,preamplificationDb:null,
  validatedForProduction:false,autoApplyAllowed:false,
  physicalRouteVerified:false,currentEq:eq,originalEq:eq.map(r=>({...r}))};
}
const model=(gains,options)=>modelHear3GraphicEqDigitalTransfer({
 eqDraft:draft(gains,options),sampleRateHz:48000,
});
test('flat EQ is exact identity, no preamp, zero phase and no fabricated clipping claim',()=>{
 const p=model([0,0,0,0,0]);
 assert.equal(p.format,HEAR3_EQ_DSP_MODEL_FORMAT);
 assert.equal(p.suggestedReferencePreampDb,0);
 assert.equal(p.partialImpulseL1Db,0);
 assert.equal(p.modeledPeakMagnitudeDb,0);
 assert.equal(p.finiteHorizonWorstCaseSamplePeakDbfs,0);
 assert.equal(p.finiteHorizonSampleBoundEstablished,true);
 assert.equal(p.physicalHeadroomVerified,false);
 assert.equal(p.physicalClippingVerified,false);
 assert.equal(p.intersamplePeaksVerified,false);
 assert.equal(p.validatedForProduction,false);
 assert.equal(p.autoApplyAllowed,false);
 assert.ok(p.filters.every(f=>f.coefficients.b0===1&&
  f.coefficients.a1===0&&f.coefficients.a2===0));
 assert.ok(p.frequencyResponseSamples.every(x=>x.gainDb===0&&x.phaseRadians===0));
 const stress=simulateHear3DigitalEqSamples(p,[1,-1,0.75,0,-0.2]);
 assert.deepEqual(stress.output,[1,-1,0.75,0,-0.2]);
 assert.equal(stress.modelSampleClippingObserved,false);
});
test('RBJ peaking center reaches nominal +3 dB, coefficient poles remain within unit circle',()=>{
 const p=model([0,0,0,3,0]);
 const filter=p.filters[3].coefficients;
 assert.ok(Object.values(filter).every(Number.isFinite));
 const a1=filter.a1,a2=filter.a2;
 assert.ok(1+a1+a2>0&&1-a1+a2>0&&1-a2>0);
 const at1000=p.frequencyResponseSamples.find(x=>x.frequencyHz===1000);
 assert.ok(Math.abs(at1000.gainDb-3)<0.02,
  'exact center of single peaking filter should be +3 dB');
 assert.ok(p.modeledPeakMagnitudeDb>=2.99);
 assert.ok(p.modeledPeakMagnitudeDb<=3.01);
 assert.ok(p.suggestedReferencePreampDb<=-4);
 assert.ok(p.finiteHorizonWorstCaseSamplePeakDbfs<=-0.99);
 assert.equal(p.finiteHorizonSampleBoundEstablished,true);
});
test('multiple active biquads combine complex response and require conservative preamp',()=>{
 const p=model([0,2,3,-1,2]);
 assert.equal(p.filters.length,5);
 assert.equal(p.referenceQ,1);
 assert.equal(p.frequencyGridIntervals,4096);
 assert.equal(p.finiteHorizonSamples,8192);
 assert.ok(p.modeledPeakMagnitudeDb>0);
 assert.ok(p.partialImpulseL1Db>=p.modeledPeakMagnitudeDb-0.2);
 assert.ok(p.suggestedReferencePreampDb<0);
 assert.ok(p.suggestedReferencePreampDb>=-24);
 assert.ok(p.finiteHorizonWorstCaseSamplePeakDbfs<=0);
 assert.equal(p.filterQAssumed,true);
 assert.equal(p.sampleRateAssumed,true);
 assert.equal(p.impulseTailBeyondHorizonCertified,false);
 assert.equal(p.physicalClippingVerified,false);
});
test('model-only reference sample rates recalculate filters without implying hardware sampling',()=>{
 const d=draft([0,0,3,0,0]);
 const r441=modelHear3GraphicEqDigitalTransfer({eqDraft:d,sampleRateHz:44100});
 const r48=modelHear3GraphicEqDigitalTransfer({eqDraft:d,sampleRateHz:48000});
 const r96=modelHear3GraphicEqDigitalTransfer({eqDraft:d,sampleRateHz:96000});
 for(const p of [r441,r48,r96]){
  assert.equal(p.sampleRateAssumed,true);
  assert.equal(p.realDeviceFiltersVerified,false);
  assert.equal(p.devicePresetExportAllowed,false);
  assert.equal(p.finiteHorizonSampleBoundEstablished,true);
  assert.equal(p.responseSampleCount,undefined);
 }
 assert.notEqual(r48.filters[2].coefficients.b0,r96.filters[2].coefficients.b0);
 assert.throws(()=>modelHear3GraphicEqDigitalTransfer({eqDraft:d,sampleRateHz:48001}),
  /Unsupported reference sample rate/);
});
test('finite-horizon L1 gain bounds full-scale input samples under the exact zero-state model',()=>{
 const p=model([2,-3,3,1,-2]);
 const n=4096,inputs=[
  Array.from({length:n},(_,i)=>i===0?1:0),
  Array.from({length:n},(_,i)=>i%2?-1:1),
  Array.from({length:n},(_,i)=>Math.cos(2*Math.PI*1000*i/48000)),
  Array.from({length:n},(_,i)=>Math.sign(Math.sin(2*Math.PI*500*i/48000))),
  Array.from({length:n},(_,i)=>{
   const v=(i*2654435761>>>0)/4294967295;
   return v*2-1;
  }),
 ];
 for(const signal of inputs){
  const result=simulateHear3DigitalEqSamples(p,signal);
  assert.equal(result.sampleCount,n);
  assert.equal(result.modelSampleClippingObserved,false);
  assert.ok(result.maximumAbsoluteOutput<=1+1e-8);
  assert.equal(result.firstClippedSample,null);
  assert.equal(result.physicalClippingVerified,false);
  assert.equal(result.intersamplePeaksVerified,false);
  assert.ok(result.output.every(Number.isFinite));
 }
});
test('mathematical bound is never marketed as a guarantee beyond zero-state finite sample window',()=>{
 const p=model([0,0,0,3,0]);
 assert.equal(p.finiteHorizonSamples,8192);
 assert.equal(p.zeroInitialStateAssumed,true);
 assert.equal(p.impulseTailBeyondHorizonCertified,false);
 assert.equal(p.realDeviceFiltersVerified,false);
 assert.equal(p.sampleRateAssumed,true);
 assert.equal(p.validatedForProduction,false);
 assert.equal(p.autoApplyAllowed,false);
 assert.equal(p.devicePresetExportAllowed,false);
 assert.ok(p.warnings.some(x=>x.includes('intersample')));
});
test('fail closed when modeled reference attenuation would exceed the experimental budget',()=>{
 const gains=Array.from({length:31},()=>3);
 const freqs=Array.from({length:31},(_,i)=>80*Math.pow(16000/80,i/30));
 const d=draft(gains,{freqs});
 const p=modelHear3GraphicEqDigitalTransfer({eqDraft:d,sampleRateHz:48000});
 assert.equal(p.modeledAttenuationBudgetExceeded,true);
 assert.equal(p.suggestedReferencePreampDb,null);
 assert.equal(p.finiteHorizonSampleBoundEstablished,false);
 assert.throws(()=>simulateHear3DigitalEqSamples(p,[1]),/valid inspectable/);
});
test('rejects forged clinical claims, altered gain rows, wrong channel and unsafe bands',()=>{
 const original=draft([0,0,3,0,0]);
 const mutate=[
  d=>{d.validatedForProduction=true;},
  d=>{d.autoApplyAllowed=true;},
  d=>{d.physicalRouteVerified=true;},
  d=>{d.channel='left';},
  d=>{d.capDb=20;},
  d=>{d.preamplificationDb=-4;},
  d=>{d.rows[2].gainDb=6;},
  d=>{d.rows[2].gainDb=0.1;},
  d=>{d.rows[2].source='neutral-inconclusive';},
  d=>{d.rows[2].bandId=d.rows[1].bandId;},
  d=>{d.rows[2].frequencyHz=10;},
  d=>{d.currentEq[2].gainDb=1;},
  d=>{d.rows[2].source='fake-measured-SPL';},
  d=>{d.rows[2].frequencyHz=250;},
 ];
 for(const edit of mutate){
  const d=structuredClone(original);edit(d);
  assert.throws(()=>modelHear3GraphicEqDigitalTransfer({eqDraft:d,sampleRateHz:48000}));
 }
});
test('invalid near-Nyquist model, NaN and unacceptable signal samples cannot be simulated',()=>{
 const d=draft([0,0,3,0,0],{freqs:[125,250,500,1000,23000]});
 assert.throws(()=>modelHear3GraphicEqDigitalTransfer({eqDraft:d}),/Invalid, duplicated/);
 const near=draft([0,0,3,0,0],{freqs:[125,250,500,1000,20000]});
 assert.throws(()=>modelHear3GraphicEqDigitalTransfer({eqDraft:near,sampleRateHz:32000}),
  /Unsupported reference sample/);
 const p=model([0,0,0,0,0]);
 for(const signal of [[1,1.1],[NaN],[],[Infinity],new Array(8193).fill(0)]){
  assert.throws(()=>simulateHear3DigitalEqSamples(p,signal),/bounded input/);
 }
});
