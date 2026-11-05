/**
 * Hear 3.0 P0 D-039/D-040/D-041 — RESEARCH ONLY.
 * Compare three bounded HYPOTHETICAL EQ-gain models on subjective
 * digital tone-detection brackets. No algorithm has been selected.
 *
 * Do not send this output to the consumer EQ or mistake it for acoustic
 * calibration, hearing thresholds, SPL, safe gains or a device preset.
 */
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clean=n=>Number(n.toFixed(2));
const median=xs=>{
 const sorted=[...xs].sort((a,b)=>a-b);
 const half=Math.floor(sorted.length/2);
 return sorted.length%2?sorted[half]:(sorted[half-1]+sorted[half])/2;
};
const clamp=(v,cap)=>Math.max(-cap,Math.min(cap,v));
const METHOD_DESCRIPTIONS={
 'global-median':'Relative contrast to the median of available subjective digital detection midpoints.',
 'local-neighbors':'Relative contrast to the nearest observed frequencies in the log-frequency domain.',
 'hybrid-prototype':'Equal-weight blend of global median and local-neighbor hypothetical contrasts.',
};

export const HEAR3_EQ_RESEARCH_FORMAT='hear3-hypothetical-eq-comparison-v1';

function validateSubjectiveBands(input){
 assert(Array.isArray(input)&&input.length>=2&&input.length<=31,'Expected 2–31 subjective bands');
 const ids=new Set();
 let lastHz=0;
 return input.map(b=>{
  assert(b&&typeof b.id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(b.id)
    &&!ids.has(b.id),'Invalid or repeated band id');
  ids.add(b.id);
  assert(finite(b.frequencyHz)&&b.frequencyHz>lastHz&&b.frequencyHz>=20&&b.frequencyHz<=20000,
    'Frequencies must be unique, ascending and within hearing-pilot scope');
  lastHz=b.frequencyHz;
  assert(['bounded-subjective-interval','inconclusive'].includes(b.status),'Unknown evidence status');
  if(b.status==='inconclusive'){
   assert(b.intervalDbfs==null,'Inconclusive band cannot claim an interval');
   return {id:b.id,frequencyHz:b.frequencyHz,eligible:false,reason:'inconclusive',
     midpointDbfs:null,intervalDbfs:null};
  }
  const a=b.intervalDbfs;
  assert(a&&finite(a.notHeardAtDbfs)&&finite(a.heardAtDbfs)
    &&a.notHeardAtDbfs>=-120&&a.heardAtDbfs<=0
    &&a.notHeardAtDbfs<a.heardAtDbfs,
    'Invalid subjective digital observation interval');
  const span=a.heardAtDbfs-a.notHeardAtDbfs;
  // Width is an experimental inclusion policy, not clinical confidence.
  const eligible=span<=12;
  return {id:b.id,frequencyHz:b.frequencyHz,eligible,
    reason:eligible?'subjective-bracket':'too-wide-to-interpret',
    midpointDbfs:eligible?(a.heardAtDbfs+a.notHeardAtDbfs)/2:null,
    intervalDbfs:{notHeardAtDbfs:a.notHeardAtDbfs,heardAtDbfs:a.heardAtDbfs}};
 });
}

function nearestReference(bands,i,anchor){
 const at=bands[i];
 const left=bands.slice(0,i).reverse().find(b=>b.eligible);
 const right=bands.slice(i+1).find(b=>b.eligible);
 if(left&&right){
  // Interpolate along logarithmic frequency. This is a mathematical
  // hypothesis, not a measured frequency response.
  const span=Math.log(right.frequencyHz/left.frequencyHz);
  const share=span>0?Math.log(at.frequencyHz/left.frequencyHz)/span:0.5;
  return left.midpointDbfs*(1-share)+right.midpointDbfs*share;
 }
 if(left)return left.midpointDbfs;
 if(right)return right.midpointDbfs;
 return anchor;
}

function candidate(bands,{method,factor,capDb}){
 const observed=bands.filter(b=>b.eligible);
 const anchor=observed.length>=2?median(observed.map(b=>b.midpointDbfs)):null;
 const rows=bands.map((b,i)=>{
  if(!b.eligible||anchor===null)return {
   bandId:b.id,frequencyHz:b.frequencyHz,
   hypotheticalGainDb:0,classification:'neutral-not-enough-evidence',
   evidence:b.reason,
  };
  const globalDelta=b.midpointDbfs-anchor;
  const localDelta=b.midpointDbfs-nearestReference(bands,i,anchor);
  const contrast=method==='global-median'?globalDelta:
    method==='local-neighbors'?localDelta:(globalDelta+localDelta)/2;
  return {
   bandId:b.id,frequencyHz:b.frequencyHz,
   hypotheticalGainDb:clean(clamp(contrast*factor,capDb)),
   classification:'hypothetical-subjective-contrast',
   evidence:b.reason,
  };
 });
 const gains=rows.map(r=>r.hypotheticalGainDb);
 return {
  method,description:METHOD_DESCRIPTIONS[method],
  experimentalFactor:factor,experimentalCapDb:capDb,
  anchorDbfs:anchor,
  rows,
  metrics:{
   neutralBands:rows.filter(r=>r.classification==='neutral-not-enough-evidence').length,
   nonzeroBands:gains.filter(g=>g!==0).length,
   maximumAbsoluteGainDb:clean(Math.max(...gains.map(Math.abs))),
   positiveBoostDb:clean(Math.max(0,...gains)),
   maximumAdjacentGainJumpDb:clean(Math.max(0,...gains.slice(1).map((g,i)=>Math.abs(g-gains[i])))),
  },
 };
}

/**
 * All candidate caps and slopes below are research hyperparameters, not an
 * approved production correction policy. They must NOT be selected solely
 * because output is more audible on a synthetic corpus.
 */
export function compareHear3HypotheticalEqModels(input){
 const bands=validateSubjectiveBands(input);
 const candidates=[
  candidate(bands,{method:'global-median',factor:0.3,capDb:2}),
  candidate(bands,{method:'local-neighbors',factor:0.35,capDb:3}),
  candidate(bands,{method:'hybrid-prototype',factor:0.4,capDb:4}),
 ];
 return {
  format:HEAR3_EQ_RESEARCH_FORMAT,deployable:false,
  evidenceClass:'subjective-digital-detection-intervals-not-acoustic-calibration',
  sourceBandCount:bands.length,
  eligibleBandCount:bands.filter(b=>b.eligible).length,
  candidates,
  limitations:[
   'No real-device or audiometric validity demonstrated.',
   'No method selected or claimed to improve perceived sound.',
   'Hypothetical gains are NOT an authorized EQ recommendation.',
   'dBFS does not establish physical SPL or safe compensation.',
   'Missing, inconclusive, or excessively wide intervals remain neutral.',
  ],
 };
}
