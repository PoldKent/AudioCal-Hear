import test from 'node:test';
import assert from 'node:assert/strict';
import {previewHear3EqControlTransfer,HEAR3_EQ_CONTROL_TRANSFER_FORMAT}
 from '../src/hear3/eq-control-quantization.mjs';
import {HEAR3_EQ_ENGINE_FORMAT} from '../src/hear3/bounded-eq-engine.mjs';

function eq(gains=[1,2.5,-1,0,3],freqs=[125,250,500,1000,2000]){
 const rows=gains.map((gainDb,i)=>({
  bandId:'eq-'+i,frequencyHz:freqs[i],gainDb,
  source:gainDb===0?'neutral-inconclusive':'direct-subjective-contrast',
 }));
 const values=rows.map(x=>({bandId:x.bandId,gainDb:x.gainDb}));
 return {format:HEAR3_EQ_ENGINE_FORMAT,profileId:'profile-test',channel:'joint',
  deviceCategory:'headphones',capDb:3,stepDb:0.5,
  autoApplyAllowed:false,validatedForProduction:false,
  originalEq:values,currentEq:values.map(x=>({...x})),rows,bandCount:rows.length};
}
function device(frequencies=[125,250,500,1000,2000],options={}){
 const {unit='dB',step=1,min=-6,max=6,
  source='official-document',verification='documented'}=options;
 return {
  deviceId:'claimed-device-1',type:'graphic',
  bands:frequencies.map((frequencyHz,i)=>({
   id:'physical-band-'+i,frequencyHz,source,verification,
   control:{unit,min,max,step},
  })),
 };
}
test('documented dB control produces nearest representable positions with residuals',()=>{
 const result=previewHear3EqControlTransfer({eqDraft:eq(),graphicEqProfile:device()});
 assert.equal(result.format,HEAR3_EQ_CONTROL_TRANSFER_FORMAT);
 assert.equal(result.mappedCount,5);
 assert.equal(result.unmappedCount,0);
 assert.deepEqual(result.rows.map(x=>x.attainableDb),[1,2,-1,0,3]);
 assert.deepEqual(result.rows.map(x=>x.residualDb),[0,-0.5,0,0,0]);
 assert.equal(result.rows[1].roundedToStep,true);
 assert.equal(result.rows[1].clampedToRange,false);
 assert.equal(result.rows[1].transferStatus,'declared-documented-not-hardware-verified');
 assert.equal(result.rows[1].controlUnit,'dB');
 assert.equal(result.deviceIdentityVerified,false);
 assert.equal(result.autoApplyAllowed,false);
 assert.equal(result.devicePresetExportAllowed,false);
 assert.equal(result.referenceDigitalPreampNotApplicableToDevice,true);
});
test('rounding tie prefers a smaller absolute setting rather than silently boosting',()=>{
 const e=eq([1,0,0,0,0]);
 const d=device(undefined,{step:2,min:-6,max:6});
 const p=previewHear3EqControlTransfer({eqDraft:e,graphicEqProfile:d});
 assert.equal(p.rows[0].attainableDb,0);
 assert.equal(p.rows[0].residualDb,-1);
 assert.equal(p.rows[0].representableStepIndex,3);
});
test('out-of-range targets are clamped to actual discrete endpoints, never outside declared device scale',()=>{
 const d=device(undefined,{step:2,min:-2,max:2});
 const p=previewHear3EqControlTransfer({eqDraft:eq([3,-3,0,1.5,0]),graphicEqProfile:d});
 assert.equal(p.rows[0].attainableDb,2);
 assert.equal(p.rows[0].clampedToRange,true);
 assert.equal(p.rows[1].attainableDb,-2);
 assert.equal(p.rows[1].clampedToRange,true);
 assert.equal(p.rows[3].attainableDb,2);
 assert.equal(p.rows[3].roundedToStep,true);
 assert.ok(p.rows.every(row=>row.attainableDb>=-2&&row.attainableDb<=2));
});
test('physical steps without documented neutral position cannot be invented',()=>{
 const e=eq();
 const d=device(undefined,{unit:'physical-step',step:1,min:0,max:10});
 for(const band of d.bands){
  band.control.dbPerStep=2;band.control.dbPerStepSource='documented';
 }
 const result=previewHear3EqControlTransfer({eqDraft:e,graphicEqProfile:d});
 assert.equal(result.mappedCount,0);
 assert.equal(result.unmappedCount,5);
 assert.equal(result.rmsErrorDb,null);
 assert.ok(result.rows.every(row=>row.controlValue===null &&
  row.transferStatus==='unresolved-no-documentable-zero-reference-position'));
 assert.equal(result.autoApplyAllowed,false);
});
test('missing controls remain unresolved while independent known dB controls are preserved',()=>{
 const d=device();
 d.bands[0].control=null;
 d.bands[1].control.unit='physical-step';
 d.bands[2].source='manual';d.bands[2].verification='unverified';
 const p=previewHear3EqControlTransfer({eqDraft:eq(),graphicEqProfile:d});
 assert.equal(p.mappedCount,3);
 assert.equal(p.unmappedCount,2);
 assert.equal(p.rows[0].attainableDb,null);
 assert.equal(p.rows[1].attainableDb,null);
 assert.equal(p.rows[2].transferStatus,'provisional-unverified-scale');
 assert.equal(p.rows[3].transferStatus,'declared-documented-not-hardware-verified');
});
test('frequency mismatch or wrong order rejects rather than guessing a band transfer',()=>{
 const data=eq();
 for(const edit of [
  p=>{p.bands[2].frequencyHz=510;},
  p=>{p.bands.reverse();},
  p=>{p.bands.pop();},
  p=>{p.bands[1].frequencyHz=p.bands[0].frequencyHz;},
 ]){
  const d=device();edit(d);
  assert.throws(()=>previewHear3EqControlTransfer({eqDraft:data,graphicEqProfile:d}),
   /frequency|frequencies|band counts/i);
 }
});
test('rejects tainted EQ source, invalid control scale and misleading clinical flags',()=>{
 const mutations=[
  x=>{x.autoApplyAllowed=true;},
  x=>{x.validatedForProduction=true;},
  x=>{x.channel='left';},
  x=>{x.rows[1].gainDb=10;},
  x=>{x.rows[1].gainDb=0.25;},
  x=>{x.currentEq[1].gainDb=1.5;},
  x=>{x.rows[1].source='neutral-inconclusive';},
 ];
 for(const mutate of mutations){
  const e=eq();mutate(e);
  assert.throws(()=>previewHear3EqControlTransfer({eqDraft:e,graphicEqProfile:device()}));
 }
 for(const change of [
  x=>{x.bands[0].control.step=0;},
  x=>{x.bands[0].control.min=10;},
  x=>{x.bands[0].control.unit='unknown';},
 ]){
  const d=device();change(d);
  assert.throws(()=>previewHear3EqControlTransfer({eqDraft:eq(),graphicEqProfile:d}));
 }
});
test('pure transfer remains deterministic, never mutates input or writes user data',()=>{
 const e=eq(),d=device();
 const input=JSON.stringify({e,d});
 const a=previewHear3EqControlTransfer({eqDraft:e,graphicEqProfile:d});
 const b=previewHear3EqControlTransfer({eqDraft:e,graphicEqProfile:d});
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify({e,d}),input);
 assert.equal(a.validatedForProduction,false);
 assert.equal(a.filterResponseVerified,false);
 assert.equal(a.intersampleHeadroomVerified,false);
});
test('two and thirty-one exact device bands can be mapped without hardcoded layouts',()=>{
 for(const n of [2,3,4,5,7,10,15,31]){
  const freqs=Array.from({length:n},(_,i)=>100*Math.pow(100,i/(n-1)));
  const e=eq(Array.from({length:n},(_,i)=>(i%3-1)*1.5),freqs);
  const d=device(freqs,{step:0.5,min:-3,max:3});
  const p=previewHear3EqControlTransfer({eqDraft:e,graphicEqProfile:d});
  assert.equal(p.rows.length,n);
  assert.equal(p.unmappedCount,0);
  assert.equal(p.mappedCount,n);
  assert.ok(p.rows.every(x=>x.roundedToStep===false));
 }
});
test('inconclusive results cannot acquire nonzero EQ from quantization',()=>{
 const p=previewHear3EqControlTransfer({
  eqDraft:eq([0,0,0,0,0]),
  graphicEqProfile:device(undefined,{step:1,min:-6,max:6}),
 });
 assert.ok(p.rows.every(x=>x.targetGainDb===0&&x.attainableDb===0));
 assert.equal(p.rmsErrorDb,0);
});
