/**
 * Hear 3 D-039/D-040/D-045/D-046: ideal DIGITAL DSP model.
 * RBJ peaking biquad coefficients and COMPLEX frequency transfer functions.
 * Finite-horizon impulse L1 headroom protects bounded input samples in THIS
 * zero-state mathematical model only. NOT physical SPL/clipping/intersample
 * certification, a device EQ response, or permission to enable/apply an EQ.
 */
import {HEAR3_EQ_ENGINE_FORMAT} from './bounded-eq-engine.mjs';

export const HEAR3_EQ_DSP_MODEL_FORMAT='hear3-graphic-eq-digital-model-v1';
const check=(yes,message)=>{if(!yes)throw Error(message);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const fix=x=>Number(x.toFixed(4));
const GAIN_GRID=4096;
const HORIZON_SAMPLES=8192;
const REFERENCE_Q=1;
const GUARD_MARGIN_DB=1;
const MAX_REFERENCE_ATTENUATION_DB=24;
const SAMPLE_RATES=new Set([44100,48000,88200,96000,176400,192000]);
const caps={headphones:3,speaker:2,car:2,application:3,interface:3};
const ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;

function ensureDraft(draft){
 check(draft?.format===HEAR3_EQ_ENGINE_FORMAT &&
  draft.validatedForProduction===false &&
  draft.autoApplyAllowed===false &&
  draft.physicalRouteVerified===false &&
  draft.channel==='joint', 'Expected unvalidated joint Hear 3 EQ hypothesis');
 check(Object.hasOwn(caps,draft.deviceCategory),'Unknown device category');
 check(Array.isArray(draft.rows)&&draft.rows.length>=2&&draft.rows.length<=31&&
  draft.bandCount===draft.rows.length,'Expected 2–31 EQ bands');
 check(draft.capDb===caps[draft.deviceCategory]&&
  draft.stepDb===0.5&&draft.preamplificationDb===null,
  'The source EQ must use the original bounded research policy');
 const ids=new Set();let previous=0;
 const gainRows=draft.rows.map(row=>{
  check(row&&typeof row.bandId==='string'&&ID.test(row.bandId)&&!ids.has(row.bandId)&&
   finite(row.frequencyHz)&&row.frequencyHz>previous&&row.frequencyHz>=20&&row.frequencyHz<=20000,
   'Invalid, duplicated or disordered EQ bands');
  check(finite(row.gainDb)&&Math.abs(row.gainDb)<=draft.capDb&&
   Number.isInteger(row.gainDb*2),'Invalid or unbounded EQ gain');
  check(['direct-subjective-contrast','estimated-from-neighbor-subjective-brackets',
   'neutral-inconclusive','neutral-insufficient-coverage',
   'neutral-wide-interval'].includes(row.source),
   'Unsupported EQ evidence source');
  check(!(row.source.startsWith('neutral-')&&row.gainDb!==0) &&
   (row.source!=='estimated-from-neighbor-subjective-brackets'||Math.abs(row.gainDb)<=1),
   'Neutral or estimated gain exceeds its evidence policy');
  ids.add(row.bandId);previous=row.frequencyHz;
  return {bandId:row.bandId,frequencyHz:row.frequencyHz,
   gainDb:row.gainDb,source:row.source};
 });
 check(Array.isArray(draft.currentEq)&&Array.isArray(draft.originalEq)&&
  JSON.stringify(draft.currentEq)===JSON.stringify(draft.originalEq)&&
  JSON.stringify(draft.currentEq)===
   JSON.stringify(gainRows.map(r=>({bandId:r.bandId,gainDb:r.gainDb}))),
  'EQ gains must match unchanged source evidence');
 return gainRows;
}
function designPeaking({bandId,frequencyHz,gainDb,source},sampleRateHz){
 if(gainDb===0)return Object.freeze({bandId,frequencyHz,gainDb,source,
  q:REFERENCE_Q,coefficients:Object.freeze({b0:1,b1:0,b2:0,a1:0,a2:0})});
 const w=2*Math.PI*frequencyHz/sampleRateHz;
 const sin=Math.sin(w),cos=Math.cos(w),alpha=sin/(2*REFERENCE_Q);
 const A=10**(gainDb/40);
 const a0=1+alpha/A;
 const coefficients={
  b0:(1+alpha*A)/a0,
  b1:-2*cos/a0,
  b2:(1-alpha*A)/a0,
  a1:-2*cos/a0,
  a2:(1-alpha/A)/a0,
 };
 check(Object.values(coefficients).every(finite)&&
  1+coefficients.a1+coefficients.a2>0 &&
  1-coefficients.a1+coefficients.a2>0 &&
  1-coefficients.a2>0,'Unstable or invalid peaking biquad');
 return Object.freeze({bandId,frequencyHz,gainDb,source,
  q:REFERENCE_Q,coefficients:Object.freeze(coefficients)});
}
function logMagnitudeAtHz(filters,hz,sr){
 const w=2*Math.PI*hz/sr,cos=Math.cos(w),sin=Math.sin(w),
  cos2=Math.cos(2*w),sin2=Math.sin(2*w);
 let gainDb=0,phaseRadians=0;
 for(const f of filters){
  const {b0,b1,b2,a1,a2}=f.coefficients;
  const nr=b0+b1*cos+b2*cos2;
  const ni=-b1*sin-b2*sin2;
  const dr=1+a1*cos+a2*cos2;
  const di=-a1*sin-a2*sin2;
  const numerator=nr*nr+ni*ni;
  const denominator=dr*dr+di*di;
  check(numerator>1e-28&&denominator>1e-28,
   'Numeric filter response is undefined');
  gainDb+=10*Math.log10(numerator/denominator);
  phaseRadians+=Math.atan2(ni,nr)-Math.atan2(di,dr);
 }
 check(finite(gainDb)&&finite(phaseRadians),'Non-finite filter response');
 return {gainDb,phaseRadians:Math.atan2(Math.sin(phaseRadians),
  Math.cos(phaseRadians))};
}
function filterImpulseL1(filters,samples){
 const states=filters.map(()=>({z1:0,z2:0}));
 let norm=0,maximum=0,terminal=0;
 for(let i=0;i<samples;i++){
  let x=i===0?1:0;
  for(let j=0;j<filters.length;j++){
   const {b0,b1,b2,a1,a2}=filters[j].coefficients;
   const st=states[j];
   const y=b0*x+st.z1;
   const z1=b1*x-a1*y+st.z2;
   const z2=b2*x-a2*y;
   st.z1=z1;st.z2=z2;x=y;
  }
  check(finite(x),'Impulse simulation produced invalid samples');
  norm+=Math.abs(x);maximum=Math.max(maximum,Math.abs(x));terminal=x;
 }
 check(finite(norm)&&norm>0,'Impulse norm is invalid');
 return {l1Norm:norm,l1Db:20*Math.log10(norm),maxImpulseSample:maximum,
  terminalSample:terminal};
}

/**
 * Creates coefficients and a limited-horizon mathematical headroom plan.
 * sampleRateHz is a REFERENCE / explicitly supplied value, NOT detected
 * physical output rate, and Q=1 is an IDEALIZED peaking-filter assumption.
 */
export function modelHear3GraphicEqDigitalTransfer({
 eqDraft,sampleRateHz=48000,
}={}){
 const rows=ensureDraft(eqDraft);
 check(SAMPLE_RATES.has(sampleRateHz),'Unsupported reference sample rate');
 check(rows.every(r=>r.frequencyHz<sampleRateHz*0.49),
  'Band is too close to Nyquist for the reference filter model');
 const filters=rows.map(r=>designPeaking(r,sampleRateHz));
 let modeledPeakDb=-Infinity,peakHz=0;
 for(let i=0;i<=GAIN_GRID;i++){
  const hz=i*(sampleRateHz/2)/GAIN_GRID;
  const db=logMagnitudeAtHz(filters,hz,sampleRateHz).gainDb;
  if(db>modeledPeakDb){modeledPeakDb=db;peakHz=hz;}
 }
 // Add precisely targeted band centers so low-resolution sweeps cannot miss
 // the nominal peak of a very narrow high-frequency biquad.
 for(const band of rows){
  const db=logMagnitudeAtHz(filters,band.frequencyHz,sampleRateHz).gainDb;
  if(db>modeledPeakDb){modeledPeakDb=db;peakHz=band.frequencyHz;}
 }
 const impulse=filterImpulseL1(filters,HORIZON_SAMPLES);
 const active=rows.some(x=>x.gainDb!==0);
 const attenuationNeedDb=active
  ?Math.max(0,modeledPeakDb,impulse.l1Db)+GUARD_MARGIN_DB:0;
 const quantized=attenuationNeedDb>0?
  -Math.ceil(attenuationNeedDb*4-1e-10)/4:0;
 const modelHeadroomAvailable=quantized>=-MAX_REFERENCE_ATTENUATION_DB;
 const preamp=modelHeadroomAvailable?quantized:null;
 const finiteBound=preamp===null?null:impulse.l1Db+preamp;
 const sampledResponseHz=[0,125,250,500,1000,2000,4000,8000,12000,
  16000,20000,sampleRateHz/2].filter((v,i,a)=>v<=sampleRateHz/2&&a.indexOf(v)===i);
 const responseSamples=sampledResponseHz.map(frequencyHz=>{
  const result=logMagnitudeAtHz(filters,frequencyHz,sampleRateHz);
  return Object.freeze({frequencyHz,gainDb:fix(result.gainDb),
   phaseRadians:fix(result.phaseRadians)});
 });
 return Object.freeze({
  format:HEAR3_EQ_DSP_MODEL_FORMAT,
  model:'RBJ-peaking-biquad-cascade-ideal-digital-reference-v1',
  sourceEqFormat:eqDraft.format,profileId:eqDraft.profileId,
  deviceCategory:eqDraft.deviceCategory,sourceBandCount:rows.length,
  referenceSampleRateHz:sampleRateHz,
  referenceQ:REFERENCE_Q,frequencyGridIntervals:GAIN_GRID,
  filterType:'peaking-biquad',
  filters:Object.freeze(filters),
  frequencyResponseSamples:Object.freeze(responseSamples),
  modeledPeakMagnitudeDb:fix(modeledPeakDb),
  modeledPeakHz:fix(peakHz),
  partialImpulseL1Db:fix(impulse.l1Db),
  finiteHorizonSamples:HORIZON_SAMPLES,
  referenceGuardMarginDb:GUARD_MARGIN_DB,
  maximumReferenceAttenuationDb:MAX_REFERENCE_ATTENUATION_DB,
  suggestedReferencePreampDb:preamp,
  finiteHorizonWorstCaseSamplePeakDbfs:finiteBound===null?null:fix(finiteBound),
  finiteHorizonSampleBoundEstablished:
   modelHeadroomAvailable&&finiteBound!==null&&finiteBound<=1e-8,
  modeledAttenuationBudgetExceeded:!modelHeadroomAvailable,
  // Real implementation needs filter-specific sample rate, Q and
  // physical-output/ISP inspection before a preset may be exported.
  sampleRateAssumed:true,
  filterQAssumed:true,zeroInitialStateAssumed:true,
  impulseTailBeyondHorizonCertified:false,
  intersamplePeaksVerified:false,
  realDeviceFiltersVerified:false,
  physicalHeadroomVerified:false,
  physicalClippingVerified:false,
  validatedForProduction:false,autoApplyAllowed:false,
  devicePresetExportAllowed:false,
  warnings:Object.freeze([
   'Only an ideal RBJ Q=1 digital peaking cascade at an assumed reference sample rate was modeled.',
   'Finite-horizon sample bound assumes zero initial state and a digital input with |sample| <= 1.',
   'Filter tails after the finite simulation, arbitrary device DSP, resampling and intersample peaks were NOT certified.',
   'dBFS is not dB SPL; never infer safe exposure or improved hearing from these values.',
   'No automatic application or physical-device EQ preset is authorized.',
  ]),
 });
}

/** Offline test of the exact modeled DSP topology; no browser audio, no file
 * or personal audio involved. This validates sample-domain math only. */
export function simulateHear3DigitalEqSamples(plan,samples){
 check(plan?.format===HEAR3_EQ_DSP_MODEL_FORMAT&&
  plan.validatedForProduction===false&&plan.autoApplyAllowed===false &&
  plan.suggestedReferencePreampDb!==null &&
  plan.filters?.length>=2&&plan.filters.length<=31,
  'A valid inspectable EQ digital-model plan is required');
 check(Array.isArray(samples)&&samples.length>=1&&
  samples.length<=plan.finiteHorizonSamples &&
  samples.every(x=>finite(x)&&Math.abs(x)<=1),
  'Provide bounded input samples within modeled horizon');
 const states=plan.filters.map(()=>({z1:0,z2:0}));
 const preamp=10**(plan.suggestedReferencePreampDb/20);
 let maximumAbsoluteInput=0,maximumAbsoluteOutput=0,firstClippedSample=null;
 const output=[];
 for(let i=0;i<samples.length;i++){
  const input=samples[i];
  maximumAbsoluteInput=Math.max(maximumAbsoluteInput,Math.abs(input));
  let x=input;
  for(let j=0;j<plan.filters.length;j++){
   const {b0,b1,b2,a1,a2}=plan.filters[j].coefficients,st=states[j];
   const y=b0*x+st.z1;
   st.z1=b1*x-a1*y+st.z2;
   st.z2=b2*x-a2*y;
   x=y;
  }
  const result=x*preamp;
  check(finite(result),'Simulated digital output diverged');
  if(firstClippedSample===null&&Math.abs(result)>1+1e-8)
   firstClippedSample=i;
  maximumAbsoluteOutput=Math.max(maximumAbsoluteOutput,Math.abs(result));
  output.push(result);
 }
 return Object.freeze({
  referenceOnly:true,
  sampleCount:samples.length,peakInput:fix(maximumAbsoluteInput),
  peakOutput:fix(maximumAbsoluteOutput),
  maximumAbsoluteOutput,
  modelSampleClippingObserved:firstClippedSample!==null,
  firstClippedSample,
  intersamplePeaksVerified:false,physicalClippingVerified:false,
  output:Object.freeze(output),
 });
}
