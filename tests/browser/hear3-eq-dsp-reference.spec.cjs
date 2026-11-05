const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';
const draft=(gains,freqs=[125,250,500,1000,2000])=>{
 const rows=gains.map((gainDb,i)=>({
  bandId:'band-'+i,frequencyHz:freqs[i],gainDb,
  source:gainDb===0?'neutral-inconclusive':'direct-subjective-contrast',
 }));
 const eq=rows.map(r=>({bandId:r.bandId,gainDb:r.gainDb}));
 return {format:'hear3-bounded-joint-eq-engine-v1',
  validatedForProduction:false,autoApplyAllowed:false,
  physicalRouteVerified:false,preamplificationDb:null,
  profileId:'browser-synthetic',deviceCategory:'headphones',
  channel:'joint',capDb:3,stepDb:0.5,bandCount:rows.length,rows,
  originalEq:eq,currentEq:eq.map(x=>({...x})),
 };
};
test('D-040 modeled biquad DSP exposes bounded digital headroom, but never hardware certification',async({page})=>{
 await page.goto(PILOT);
 const result=await page.evaluate(async data=>{
  const {modelHear3GraphicEqDigitalTransfer,simulateHear3DigitalEqSamples}=
   await import('/src/hear3/eq-digital-transfer-model.mjs');
  const p=modelHear3GraphicEqDigitalTransfer({eqDraft:data,sampleRateHz:48000});
  const length=2048;
  const wave=Array.from({length},(_,i)=>Math.sin(2*Math.PI*1000*i/48000));
  const test=simulateHear3DigitalEqSamples(p,wave);
  return {plan:p,peak:test.maximumAbsoluteOutput,
   clipped:test.modelSampleClippingObserved,
   physical:test.physicalClippingVerified};
 },draft([0,0,1.5,3,0]));
 expect(result.plan.format).toBe('hear3-graphic-eq-digital-model-v1');
 expect(result.plan.modeledPeakMagnitudeDb).toBeGreaterThan(0);
 expect(result.plan.suggestedReferencePreampDb).toBeLessThan(0);
 expect(result.plan.finiteHorizonWorstCaseSamplePeakDbfs).toBeLessThanOrEqual(0);
 expect(result.plan.finiteHorizonSampleBoundEstablished).toBe(true);
 expect(result.plan.realDeviceFiltersVerified).toBe(false);
 expect(result.plan.validatedForProduction).toBe(false);
 expect(result.plan.autoApplyAllowed).toBe(false);
 expect(result.plan.devicePresetExportAllowed).toBe(false);
 expect(result.clipped).toBe(false);
 expect(result.physical).toBe(false);
 expect(result.peak).toBeLessThanOrEqual(1);
});
test('D-040 changing the assumed sample rate changes coefficients and never detects physical output',async({page})=>{
 await page.goto(PILOT);
 const p=await page.evaluate(async data=>{
  const {modelHear3GraphicEqDigitalTransfer}=
   await import('/src/hear3/eq-digital-transfer-model.mjs');
  const a=modelHear3GraphicEqDigitalTransfer({eqDraft:data,sampleRateHz:44100});
  const b=modelHear3GraphicEqDigitalTransfer({eqDraft:data,sampleRateHz:96000});
  return {a:a.filters[3].coefficients.b0,b:b.filters[3].coefficients.b0,
   modes:[a.sampleRateAssumed,b.sampleRateAssumed],
   safe:[a.devicePresetExportAllowed,b.devicePresetExportAllowed]};
 },draft([0,0,0,3,0]));
 expect(p.a).not.toBe(p.b);
 expect(p.modes).toEqual([true,true]);
 expect(p.safe).toEqual([false,false]);
});
test('D-040 invalid reference filter cannot be used to bypass limits or auto-apply',async({page})=>{
 await page.goto(PILOT);
 const rejection=await page.evaluate(async data=>{
  const {modelHear3GraphicEqDigitalTransfer,simulateHear3DigitalEqSamples}=
   await import('/src/hear3/eq-digital-transfer-model.mjs');
  const issues=[];
  data.rows[3].gainDb=25;
  try{modelHear3GraphicEqDigitalTransfer({eqDraft:data});}
  catch(error){issues.push(error.message);}
  data.rows[3].gainDb=3;
  const p=modelHear3GraphicEqDigitalTransfer({eqDraft:data});
  try{simulateHear3DigitalEqSamples(p,[1,2]);}
  catch(error){issues.push(error.message);}
  return {issues,modelAutoApply:p.autoApplyAllowed,preamp:p.suggestedReferencePreampDb};
 },draft([0,0,0,3,0]));
 expect(rejection.issues).toHaveLength(2);
 expect(rejection.issues[0]).toContain('Invalid or unbounded');
 expect(rejection.issues[1]).toContain('bounded input');
 expect(rejection.modelAutoApply).toBe(false);
 expect(rejection.preamp).toBeLessThan(0);
});
