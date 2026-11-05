/**
 * Hear3 D-043/D-045/D-046 — device-control transfer PREVIEW only.
 *
 * A known frequency layout and a declared dB scale allow an exact discrete
 * least-squares quantization without inventing hardware positions.
 * No verified response curve, level safety or device preset is implied.
 */
import {HEAR3_EQ_ENGINE_FORMAT} from './bounded-eq-engine.mjs';
import {validateGraphicEqProfile} from './device-profile-contract.mjs';
export const HEAR3_EQ_CONTROL_TRANSFER_FORMAT='hear3-graphic-eq-control-transfer-review-v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const round=x=>Number(x.toFixed(5));
const caps={headphones:3,speaker:2,car:2,application:3,interface:3};
function validDraft(source){
 check(source?.format===HEAR3_EQ_ENGINE_FORMAT&&
  source.autoApplyAllowed===false&&source.validatedForProduction===false&&
  source.channel==='joint'&&Object.hasOwn(caps,source.deviceCategory)&&
  source.capDb===caps[source.deviceCategory]&&source.stepDb===0.5,
  'Source EQ must be a bounded unvalidated joint output');
 check(Array.isArray(source.rows)&&source.rows.length>=2&&source.rows.length<=31&&
  source.rows.length===source.bandCount&&
  Array.isArray(source.originalEq)&&Array.isArray(source.currentEq)&&
  source.originalEq.length===source.rows.length&&
  JSON.stringify(source.originalEq)===JSON.stringify(source.currentEq),
  'Source EQ coverage mismatch');
 let last=0;
 const seen=new Set();
 for(const [i,row] of source.rows.entries()){
  check(row&&typeof row.bandId==='string'&&!seen.has(row.bandId)&&
   finite(row.frequencyHz)&&row.frequencyHz>last&&row.frequencyHz<=20000&&
   finite(row.gainDb)&&Number.isInteger(row.gainDb*2)&&
   Math.abs(row.gainDb)<=source.capDb,'Invalid source EQ band or limits');
  check(source.originalEq[i]?.bandId===row.bandId&&
   source.originalEq[i]?.gainDb===row.gainDb,'Original EQ source was altered');
  check(['direct-subjective-contrast','estimated-from-neighbor-subjective-brackets',
   'neutral-inconclusive','neutral-wide-interval',
   'neutral-insufficient-coverage'].includes(row.source),
   'Unknown subjective evidence source');
  check(!row.source.startsWith('neutral-')||row.gainDb===0,
   'Neutral evidence cannot be converted into boosted EQ');
  seen.add(row.bandId);last=row.frequencyHz;
 }
}
function quantizeControl(target,control){
 const {min,max,step}=control;
 const steps=Math.floor((max-min)/step+1e-10);
 check(Number.isSafeInteger(steps)&&steps>=0&&steps<=100000,
  'Control grid would be too large');
 const targetStep=(target-min)/step;
 const choices=new Set([0,steps,Math.floor(targetStep),Math.ceil(targetStep)]);
 let selected=null;
 for(const i of choices){
  if(!Number.isFinite(i))continue;
  const idx=Math.max(0,Math.min(steps,i));
  const val=min+step*idx;
  if(val<min-1e-8||val>max+1e-8)continue;
  const error=Math.abs(val-target);
  if(selected===null||error<selected.error-1e-8||
   (Math.abs(error-selected.error)<1e-8&&Math.abs(val)<Math.abs(selected.value)-1e-8)||
   (Math.abs(error-selected.error)<1e-8&&
    Math.abs(Math.abs(val)-Math.abs(selected.value))<1e-8&&val<selected.value)){
   selected={index:idx,value:val,error};
  }
 }
 check(selected!==null,'No representable control values');
 return {
  attainableDb:round(selected.value),index:selected.index,
  residualDb:round(selected.value-target),
  clampedToRange:target<min-1e-8||target>max+1e-8,
  roundedToStep:Math.abs(selected.value-target)>1e-8,
 };
}
export function previewHear3EqControlTransfer({
 eqDraft,graphicEqProfile,
}={}){
 validDraft(eqDraft);
 const profile=validateGraphicEqProfile(graphicEqProfile);
 const bands=profile.bands;
 check(bands.length===eqDraft.rows.length,'Device and target EQ band counts differ');
 const seen=new Set();
 for(let i=0;i<bands.length;i++){
  const b=bands[i],r=eqDraft.rows[i];
  check(finite(b.frequencyHz)&&b.frequencyHz===r.frequencyHz&&!seen.has(b.frequencyHz),
   'Exact EQ frequencies and ordering must match; no invented remapping');
  seen.add(b.frequencyHz);
 }
 let squaredError=0,weightedError=0,weight=0,mappedCount=0,unmappedCount=0;
 const rows=eqDraft.rows.map((r,i)=>{
  const b=bands[i],control=b.control;
  const base={
   originalBandId:r.bandId,deviceControlBandId:b.id,
   frequencyHz:r.frequencyHz,
   targetGainDb:r.gainDb,
   subjectiveSource:r.source,scaleProvenance:b.source,
   controlVerification:b.verification,
   attainableDb:null,controlValue:null,
   transferStatus:'unresolved',residualDb:null,
   roundedToStep:false,clampedToRange:false,
  };
  const unit=control?.unit??null;
  if(unit!=='dB'){
   unmappedCount++;
   return Object.freeze({...base,
    transferStatus:unit==='physical-step'
     ?'unresolved-no-documentable-zero-reference-position'
     :'unresolved-no-dB-scale',
    reason:unit==='physical-step'
     ?'dB/step alone does not establish the neutral physical control position.'
     :'A real dB range/step must be supplied and confirmed.',
   });
  }
  const q=quantizeControl(r.gainDb,control);
  const confidence=b.source==='official-document'&&b.verification==='documented'
   ?'declared-documented-not-hardware-verified'
   :b.verification==='user-confirmed'
    ?'user-confirmed-not-acoustically-verified'
    :'provisional-unverified-scale';
  mappedCount++;
  const weightPer=r.source==='direct-subjective-contrast'?1:
   r.source==='estimated-from-neighbor-subjective-brackets'?0.25:0.5;
  squaredError+=q.residualDb**2;
  weightedError+=weightPer*q.residualDb**2;
  weight+=weightPer;
  return Object.freeze({...base,
   attainableDb:q.attainableDb,
   controlValue:q.attainableDb,
   controlUnit:'dB',representableStepIndex:q.index,
   residualDb:q.residualDb,transferStatus:confidence,
   roundedToStep:q.roundedToStep,clampedToRange:q.clampedToRange,
   declaredMinimumDb:control.min,declaredMaximumDb:control.max,
   declaredStepDb:control.step,
  });
 });
 return Object.freeze({
  format:HEAR3_EQ_CONTROL_TRANSFER_FORMAT,
  sourceEqFormat:eqDraft.format,sourceProfileId:eqDraft.profileId,
  deviceId:profile.deviceId,
  deviceBandCount:bands.length,deviceCategory:eqDraft.deviceCategory,
  optimizationModel:'separable-nearest-dB-step-squared-error-no-filter-coupling',
  rows:Object.freeze(rows),
  mappedCount,unmappedCount,
  weightedRmseDb:weight>0?round(Math.sqrt(weightedError/weight)):null,
  rmsErrorDb:mappedCount>0?round(Math.sqrt(squaredError/mappedCount)):null,
  manualDeviceConfirmationRequired:true,
  deviceIdentityVerified:false,filterResponseVerified:false,
  controlMappingExternallyVerified:false,
  intersampleHeadroomVerified:false,
  referenceDigitalPreampNotApplicableToDevice:true,
  autoApplyAllowed:false,devicePresetExportAllowed:false,
  validatedForProduction:false,
  warnings:Object.freeze([
   'These targets originate in an uncalibrated experimental subjective EQ, not measured acoustic correction.',
   'Discrete dB values are only as trustworthy as the supplied control descriptions; device identity has not been verified.',
   'Physical-step values cannot be mapped without a documented neutral/zero position, even when dB per step is known.',
   'Rounding minimizes independent squared target-gain errors; real filters may interact and need device-specific measurements.',
   'No device presets are applied or exported. Intersample clipping, SPL, EQ response and safety remain unverified.',
  ]),
 });
}
