/**
 * Hear 3 D-039/D-040/D-041/D-047 — bounded ENGINEERING EQ v1.
 * Computes one REVIEW-ONLY joint digital EQ from completed subjective
 * brackets. A math policy is not a clinical threshold, calibrated device EQ,
 * SPL safety guarantee, or evidence of improved hearing.
 */
export const HEAR3_EQ_ENGINE_FORMAT='hear3-bounded-joint-eq-engine-v1';
export const HEAR3_EQ_ENGINE_METHOD='bounded-hybrid-subjective-contrast-v1';
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const CATEGORIES=Object.freeze({
 headphones:3,car:2,speaker:2,application:3,interface:3,
});
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>Math.round(n*2)/2;
const rounded=n=>Number(n.toFixed(2));
const clamp=(n,cap)=>Math.max(-cap,Math.min(cap,n));
function median(nums){
 const s=[...nums].sort((a,b)=>a-b),m=Math.floor(s.length/2);
 return s.length%2?s[m]:(s[m-1]+s[m])/2;
}
function verifyInputs(exam,session){
 requireValue(exam&&session&&exam.status==='completed'&&session.status==='completed',
  'An explicitly finished adaptive exam and audio session are required');
 requireValue(typeof exam.profileId==='string'&&exam.profileId===session.profileId,
  'Adaptive exam/session profile mismatch');
 requireValue(exam.channel==='joint'&&Array.isArray(session.observations),
  'Only jointly verified channel evidence can create a shared EQ');
 requireValue(exam.thresholdsEstimated===0&&exam.eqGainsCalculated===0,
  'Unexpected precomputed clinical or EQ evidence');
 requireValue(Array.isArray(exam.bands)&&exam.bands.length>=2&&exam.bands.length<=31
  &&exam.totalBands===exam.bands.length&&exam.completedBands===exam.bands.length,
  'Missing or unfinished adaptive bands');
 requireValue(exam.activeToneId===null&&session.currentTone===null,
  'Audio must be stopped before computing an EQ');
 const a=exam.authorizedDigitalRangeDbfs,b=session.authorizedDigitalRangeDbfs;
 requireValue(a&&b&&finite(a.minDbfs)&&finite(a.maxDbfs)&&a.minDbfs<=a.maxDbfs&&
  a.minDbfs>=-120&&a.maxDbfs<=0&&a.minDbfs===b.minDbfs&&a.maxDbfs===b.maxDbfs,
  'Digital evidence authorization does not match');
 const observed=[],ids=new Set(),tones=new Set(),flat=[];
 let previous=0;
 for(const band of exam.bands){
  requireValue(band&&typeof band.id==='string'&&ID.test(band.id)&&!ids.has(band.id)&&
   finite(band.frequencyHz)&&band.frequencyHz>previous&&
   band.frequencyHz>=20&&band.frequencyHz<=20000,
   'Invalid EQ band ordering or identity');
  previous=band.frequencyHz;ids.add(band.id);
  requireValue(['bounded-subjective-interval','inconclusive'].includes(band.status)&&
   Array.isArray(band.observations)&&band.observations.length<=20 &&
   ['low','medium','inconclusive'].includes(band.confidence),
   'Invalid adaptive evidence state');
  const heard=[],unheard=[];
  for(const o of band.observations){
   requireValue(o&&typeof o.toneId==='string'&&ID.test(o.toneId)&&!tones.has(o.toneId)&&
    o.frequencyHz===band.frequencyHz&&o.channel==='joint'&&
    finite(o.digitalLevelDbfs)&&o.digitalLevelDbfs>=a.minDbfs&&
    o.digitalLevelDbfs<=a.maxDbfs&&
    ['heard','not-heard'].includes(o.response)&&o.provenance==='user-response',
    'Invalid or cross-channel tone observation');
   tones.add(o.toneId);
   (o.response==='heard'?heard:unheard).push(o.digitalLevelDbfs);
   flat.push(o);
  }
  let bracket=null,reason='inconclusive';
  if(band.status==='bounded-subjective-interval'){
   const low=unheard.length?Math.max(...unheard):null;
   const high=heard.length?Math.min(...heard):null;
   requireValue(low!==null&&high!==null&&low<high&&
    band.intervalDbfs?.notHeardAtDbfs===low&&
    band.intervalDbfs?.heardAtDbfs===high&&
    band.confidence===(band.observations.length>=4?'medium':'low'),
    'Subjective interval is inconsistent with explicit tone responses');
   const width=high-low;
   if(width<=12){
    bracket={midpoint:(low+high)/2,width,high,low};
    reason='usable-subjective-bracket';
   }else reason='interval-too-wide';
  }else{
   requireValue(band.intervalDbfs===null&&band.confidence==='inconclusive',
    'Inconclusive evidence must never claim an observed bracket');
  }
  observed.push({
   id:band.id,frequencyHz:band.frequencyHz,
   bracket,reason,confidence:band.confidence,
   observationCount:band.observations.length,status:band.status,
  });
 }
 // The audio-session record is the source of truth for a played/answered tone.
 requireValue(JSON.stringify(flat)===JSON.stringify(session.observations),
  'Adaptive bands and Web Audio evidence disagree');
 return observed;
}
function localReference(data,index,anchor){
 const left=data.slice(0,index).reverse().find(x=>x.bracket);
 const right=data.slice(index+1).find(x=>x.bracket);
 if(!left||!right)return anchor; // avoid edge extrapolation
 const logSpan=Math.log2(right.frequencyHz/left.frequencyHz);
 if(logSpan>3)return anchor; // do not interpolate across very distant evidence
 const share=Math.log(data[index].frequencyHz/left.frequencyHz)/
  Math.log(right.frequencyHz/left.frequencyHz);
 return left.bracket.midpoint*(1-share)+right.bracket.midpoint*share;
}
/**
 * Returns an immediately inspectable numerical EQ hypothesis. Never apply
 * automatically to Web Audio or a physical equalizer.
 */
export function calculateHear3BoundedJointEq({
 examSnapshot,sessionSnapshot,deviceCategory='headphones',
}={}){
 requireValue(Object.hasOwn(CATEGORIES,deviceCategory),'Unknown EQ device category');
 const data=verifyInputs(examSnapshot,sessionSnapshot);
 const capDb=CATEGORIES[deviceCategory];
 const direct=data.filter(x=>x.bracket);
 const anchor=direct.length>=2?median(direct.map(x=>x.bracket.midpoint)):null;
 let rows=data.map((b,i)=>{
  if(!b.bracket||anchor===null)return {
   bandId:b.id,frequencyHz:b.frequencyHz,gainDb:0,
   source:b.reason==='interval-too-wide'?'neutral-wide-interval':
    anchor===null?'neutral-insufficient-coverage':'neutral-inconclusive',
   confidence:b.confidence,intervalDbfs:b.bracket?
    {notHeardAtDbfs:b.bracket.low,heardAtDbfs:b.bracket.high}:null,
   observedResponses:b.observationCount,estimated:false,
  };
  const global=b.bracket.midpoint-anchor;
  const local=b.bracket.midpoint-localReference(data,i,anchor);
  const reliability=b.bracket.width<=4?1:b.bracket.width<=8?0.75:0.5;
  const confirmation=b.confidence==='medium'?1:0.8;
  const contrast=0.65*global+0.35*local;
  const gain=round(clamp(contrast*0.4*reliability*confirmation,capDb));
  return {
   bandId:b.id,frequencyHz:b.frequencyHz,gainDb:gain,
   source:'direct-subjective-contrast',confidence:b.confidence,
   intervalDbfs:{
    notHeardAtDbfs:b.bracket.low,heardAtDbfs:b.bracket.high,
   },
   observedResponses:b.observationCount,estimated:false,
  };
 });
 // Estimate only ONE entirely unmeasured band between two immediately
 // adjacent, narrow, medium-confidence brackets with close frequencies.
 // Contradictions or wide intervals must remain neutral.
 if(anchor!==null){
  rows=rows.map((row,i)=>{
   const b=data[i],left=data[i-1],right=data[i+1];
   if(b.status!=='inconclusive'||b.observationCount!==0||
    !left?.bracket||!right?.bracket||left.confidence!=='medium'||
    right.confidence!=='medium'||left.bracket.width>6||
    right.bracket.width>6||right.frequencyHz/left.frequencyHz>2.5||
    Math.abs(left.bracket.midpoint-right.bracket.midpoint)>8)return row;
   const share=Math.log(b.frequencyHz/left.frequencyHz)/
    Math.log(right.frequencyHz/left.frequencyHz);
   const estimate=round(clamp(
    (rows[i-1].gainDb*(1-share)+rows[i+1].gainDb*share)*0.5,1,
   ));
   if(estimate===0)return row;
   return {...row,gainDb:estimate,
    source:'estimated-from-neighbor-subjective-brackets',
    confidence:'low',estimated:true,
   };
  });
 }
 const positive=rows.filter(r=>r.gainDb>0).reduce((n,r)=>n+r.gainDb,0);
 return Object.freeze({
  format:HEAR3_EQ_ENGINE_FORMAT,method:HEAR3_EQ_ENGINE_METHOD,
  modelStatus:'implemented-engineering-policy-not-acoustically-validated',
  finishedExam:true,profileId:examSnapshot.profileId,
  channel:'joint',deviceCategory,
  bandCount:rows.length,observedEligibleBands:direct.length,
  resultAvailable:true,
  sourceEvidence:'subjective-digital-brackets-not-verified-hearing-thresholds',
  selectedMethod:'bounded-hybrid-subjective-contrast',
  capDb,stepDb:0.5,
  modelCoefficients:Object.freeze({globalWeight:0.65,localWeight:0.35,
   contrastFactor:0.4}),
  correctionCoverage:direct.length>=2?'relative-model':'neutral-only-no-valid-contrast',
  rows,
  eligibleEstimateCount:rows.filter(r=>r.estimated).length,
  nominalPositiveGainSumDb:rounded(positive),
  preamplificationDb:null,
  headroomVerified:false,clippingVerified:false,
  acousticCalibration:'not-established',
  physicalRouteVerified:false,
  autoApplyAllowed:false,
  devicePositionConversionAllowed:false,
  validatedForProduction:false,
  originalEq:rows.map(r=>({bandId:r.bandId,gainDb:r.gainDb})),
  currentEq:rows.map(r=>({bandId:r.bandId,gainDb:r.gainDb})),
  warnings:[
   'EQ mathematical hypothesis derived from uncalibrated subjective dBFS contrasts; no measured acoustic correction.',
   'No filter transfer-function, phase, physical output or intersample headroom was measured; preamp and clipping safety are unknown.',
   'Do not apply automatically or advertise clinical hearing correction; real-device safety and subjective evaluation remain pending.',
   'Inconclusive and very wide evidence is neutral except narrow clearly labeled neighbor-only estimates.',
  ],
 });
}
