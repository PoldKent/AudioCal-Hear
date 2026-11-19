/**
 * Hear: explicit experimental listening preference hypothesis.
 *
 * The input EQ must already have passed the verified bounded tone engine.
 * We never infer SPL, diagnose hearing, control device volume or apply EQ.
 * Optional loudness marks are matched only against verified, non-retired
 * audio responses; sweep clicks can guide the examination, not set gains.
 */
import {HEAR3_EQ_ENGINE_FORMAT} from './bounded-eq-engine.mjs';

export const HEAR_EXPERIMENTAL_EQ_POLICY='hear3-listening-preference-experiment-v1';
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const roundHalf=n=>Math.round(n*2)/2;
const clamp=(n,limit)=>Math.max(-limit,Math.min(limit,n));
export function proposeHear3ExperimentalListeningEq({
 baseEq,examSnapshot,sessionSnapshot,loudToneReports=[],
}={}){
 check(baseEq?.format===HEAR3_EQ_ENGINE_FORMAT&&
  baseEq.autoApplyAllowed===false&&baseEq.validatedForProduction===false&&
  baseEq.headroomVerified===false&&baseEq.acousticCalibration==='not-established'&&
  Number.isInteger(baseEq.bandCount)&&baseEq.bandCount>=2&&baseEq.bandCount<=31&&
  Array.isArray(baseEq.rows)&&baseEq.rows.length===baseEq.bandCount&&
  finite(baseEq.capDb)&&baseEq.capDb>0&&baseEq.capDb<=3,
  'Only verified, bounded experimental EQ input is accepted');
 check(examSnapshot?.status==='completed'&&sessionSnapshot?.status==='completed'&&
  examSnapshot.profileId===sessionSnapshot.profileId&&
  baseEq.profileId===examSnapshot.profileId&&
  Array.isArray(examSnapshot.bands)&&examSnapshot.bands.length===baseEq.bandCount&&
  Array.isArray(sessionSnapshot.observations)&&
  Array.isArray(sessionSnapshot.invalidatedToneIds),
  'Experimental EQ requires the completed and verified session');
 check(Array.isArray(loudToneReports)&&loudToneReports.length<=64,
  'Invalid loudness marks');
 const retired=new Set(sessionSnapshot.invalidatedToneIds);
 const heardTones=new Map(sessionSnapshot.observations
  .filter(o=>!retired.has(o.toneId)&&o.response==='heard')
  .map(o=>[o.toneId,o]));
 const loudByFrequency=new Set(),used=new Set();
 for(const report of loudToneReports){
  check(report&&typeof report.toneId==='string'&&!used.has(report.toneId)&&
   finite(report.frequencyHz)&&
   heardTones.get(report.toneId)?.frequencyHz===report.frequencyHz,
   'Loudness must be an explicit answer to a verified tone');
  used.add(report.toneId);
  loudByFrequency.add(report.frequencyHz);
 }
 const values=baseEq.rows.map((row,i)=>{
  const band=examSnapshot.bands[i];
  check(band?.id===row.bandId&&band.frequencyHz===row.frequencyHz&&
   finite(row.gainDb)&&Math.abs(row.gainDb)<=baseEq.capDb&&
   Array.isArray(band.observations),
   'EQ bands no longer match the verified exam');
  const valid=band.observations.filter(o=>!retired.has(o.toneId));
  const heard=valid.filter(o=>o.response==='heard');
  const unheard=valid.filter(o=>o.response==='not-heard');
  let gain=row.gainDb,reason='relative-tone-contrast',confidence=row.confidence;
  if(loudByFrequency.has(row.frequencyHz)){
   // A user-reported uncomfortable tone is a signal to CUT, never boost.
   // Limit the suggestion to a 1 dB attenuation, independent of volume.
   gain=-Math.min(baseEq.capDb,1);
   reason='explicit-too-loud-attenuate';
   confidence='subjective-single-response';
  }else if(heard.length===0&&unheard.length>=2&&
   Math.max(...unheard.map(o=>o.digitalLevelDbfs))>=
    sessionSnapshot.authorizedDigitalRangeDbfs.maxDbfs-0.01){
   // All trials remain inaudible even at the *authorized digital ceiling*.
   // Propose at most +0.5 dB as a review-only experiment; a missing tone
   // may be equipment, fit, masking or hearing, so NEVER auto-apply or
   // recommend raising the physical volume.
   gain=Math.min(baseEq.capDb,0.5);
   reason='inaudible-at-digital-ceiling-hypothesis';
   confidence='low-not-acoustic-evidence';
  }else if(unheard.length===0&&heard.length>0){
   gain=0;
   reason='heard-without-contrast-maintain';
   confidence='low';
  }else if(row.source!=='direct-subjective-contrast'){
   gain=0;reason='inconclusive-remain-neutral';
  }
  gain=roundHalf(clamp(gain,baseEq.capDb));
  return Object.freeze({...row,gainDb:gain,source:reason,confidence});
 });
 const changed=values.some((r,i)=>r.gainDb!==baseEq.rows[i].gainDb);
 const currentEq=values.map(r=>Object.freeze({bandId:r.bandId,gainDb:r.gainDb}));
 const nominalPositiveGainSumDb=values.filter(x=>x.gainDb>0).reduce((a,b)=>a+b.gainDb,0);
 return Object.freeze({
  ...baseEq,
  modelStatus:'user-directed-experimental-not-acoustically-validated',
  selectedMethod:HEAR_EXPERIMENTAL_EQ_POLICY,
  policyVersion:HEAR_EXPERIMENTAL_EQ_POLICY,
  correctionCoverage:changed?'experimental-subjective-preferences':baseEq.correctionCoverage,
  rows:Object.freeze(values),
  originalEq:Object.freeze(currentEq),
  currentEq:Object.freeze(currentEq),
  nominalPositiveGainSumDb:Number(nominalPositiveGainSumDb.toFixed(2)),
  autoApplyAllowed:false,validatedForProduction:false,
  headroomVerified:false,clippingVerified:false,
  warnings:Object.freeze([
   'Experimental listening preferences: keep clearly heard tones, attenuate explicit discomfort, and cautiously review frequencies unheard at the authorized digital ceiling.',
   'A missing digital tone does not establish hearing loss or a safe gain; check fit, device response and ambient noise first.',
   'No calibrated acoustic output, device headroom, clipping, SPL, or health benefit has been established. Do not auto-apply.',
  ]),
 });
}
