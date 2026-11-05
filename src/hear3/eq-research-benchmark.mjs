/**
 * Hear 3.0 D-039/D-040 — deterministic STRESS BENCHMARK only.
 * Compare three already-bounded mathematical hypotheses using synthetic
 * subjective digital intervals. Not a sound measurement, calibrated
 * audiogram, perceptual preference, usable EQ or device gain policy.
 */
import {compareHear3HypotheticalEqModels} from './eq-research-comparison.mjs';

export const HEAR3_EQ_BENCHMARK_FORMAT='hear3-eq-synthetic-stress-benchmark-v1';
const BAND_HZ=[125,250,500,1000,2000,4000,8000];

function observed(hz,midpointDbfs,width=4){
 return {id:'hz-'+hz,frequencyHz:hz,status:'bounded-subjective-interval',
  intervalDbfs:{notHeardAtDbfs:midpointDbfs-width/2,
   heardAtDbfs:midpointDbfs+width/2}};
}
function inconclusive(hz){
 return {id:'hz-'+hz,frequencyHz:hz,status:'inconclusive',intervalDbfs:null};
}
const CASES=[
 {id:'flat-digital-brackets',about:'Same digital midpoint across bands',
  bandStates:[-62,-62,-62,-62,-62,-62,-62]},
 {id:'mid-digital-contrast',about:'One synthetic higher digital midpoint',
  bandStates:[-62,-62,-62,-46,-62,-62,-62]},
 {id:'high-digital-contrast',about:'High-frequency digital midpoint differences',
  bandStates:[-62,-62,-62,-62,-62,-50,-48]},
 {id:'missing-center',about:'Inconclusive missing center never interpolated to EQ',
  bandStates:[-62,-58,-56,null,-54,-62,-62]},
 {id:'wide-endpoint',about:'Excessively wide interval neutralized',
  bandStates:[-62,-62,{mid:-58,width:28},-56,-60,-62,-62]},
 {id:'single-eligible',about:'No contrast from a single observed band',
  bandStates:[null,null,null,-62,null,null,null]},
 {id:'all-inconclusive',about:'No evidence anywhere',
  bandStates:[null,null,null,null,null,null,null]},
 {id:'alternating-digital-contrast',about:'Abrupt alternating synthetic differences',
  bandStates:[-62,-50,-62,-50,-62,-50,-62]},
];

function scenarioBands(config){
 return config.bandStates.map((entry,i)=>{
  const hz=BAND_HZ[i];
  if(entry===null)return inconclusive(hz);
  if(typeof entry==='number')return observed(hz,entry);
  return observed(hz,entry.mid,entry.width);
 });
}
function shifted(bands,shift){
 return bands.map(b=>b.status==='inconclusive'?{...b}:{
  ...b,intervalDbfs:{
   notHeardAtDbfs:b.intervalDbfs.notHeardAtDbfs+shift,
   heardAtDbfs:b.intervalDbfs.heardAtDbfs+shift,
  },
 });
}
function alternating(bands,amount){
 return bands.map((b,i)=>b.status==='inconclusive'?{...b}:{
  ...b,intervalDbfs:{
   notHeardAtDbfs:b.intervalDbfs.notHeardAtDbfs+(i%2?amount:-amount),
   heardAtDbfs:b.intervalDbfs.heardAtDbfs+(i%2?amount:-amount),
  },
 });
}
const round=n=>Number(n.toFixed(2));
function evaluate(result,scenarioId){
 if(result.deployable!==false||result.candidates?.length!==3)
  throw Error('Unexpected EQ research contract');
 return result.candidates.map(model=>{
  const gains=model.rows.map(r=>r.hypotheticalGainDb);
  if(gains.length!==BAND_HZ.length||
   gains.some((g,i)=>!Number.isFinite(g)||Math.abs(g)>model.experimentalCapDb||
    (model.rows[i].classification==='neutral-not-enough-evidence'&&g!==0)))
   throw Error('Synthetic case violates neutral and bounded research contract');
  const positives=gains.filter(g=>g>0);
  const boostDb=positives.length?Math.max(...positives):0;
  return {
   method:model.method,
   neutralBands:model.metrics.neutralBands,
   activeBands:model.metrics.nonzeroBands,
   peakNominalPositiveBoostDb:round(boostDb),
   illustrativePreampOffsetDb:round(-boostDb),
   maximumAdjacentGainJumpDb:model.metrics.maximumAdjacentGainJumpDb,
   requiresHardwareHeadroomVerification:boostDb>0,
   gains,
   scenarioId,
  };
 });
}
function maxDelta(one,two){
 const a=one.gains,b=two.gains;
 return round(Math.max(...a.map((g,i)=>Math.abs(g-b[i]))));
}
export function runHear3SyntheticEqStressBenchmark(){
 const cases=CASES.map(item=>{
  const input=scenarioBands(item);
  const base=evaluate(compareHear3HypotheticalEqModels(input),item.id);
  // A *uniform* ±1 dB shift should not change a contrast-only model.
  // Alternating ±1 dB tests sensitivity to contradictory/noisy reports.
  const uniform=evaluate(compareHear3HypotheticalEqModels(shifted(input,1)),item.id);
  const noise=evaluate(compareHear3HypotheticalEqModels(alternating(input,1)),item.id);
  return {
   scenario:item.id,description:item.about,
   syntheticSource:true,
   eligibleBands:compareHear3HypotheticalEqModels(input).eligibleBandCount,
   models:base.map((m,i)=>({
    method:m.method,
    neutralBands:m.neutralBands,
    activeBands:m.activeBands,
    peakNominalPositiveBoostDb:m.peakNominalPositiveBoostDb,
    illustrativePreampOffsetDb:m.illustrativePreampOffsetDb,
    maximumAdjacentGainJumpDb:m.maximumAdjacentGainJumpDb,
    maximumUniformShiftDeltaDb:maxDelta(m,uniform[i]),
    maximumAlternatingPerturbationDeltaDb:maxDelta(m,noise[i]),
    requiresHardwareHeadroomVerification:m.requiresHardwareHeadroomVerification,
   })),
  };
 });
 const summary=['global-median','local-neighbors','hybrid-prototype'].map(method=>{
  const models=cases.map(c=>c.models.find(m=>m.method===method));
  return {
   method,
   syntheticScenarios:models.length,
   peakNominalBoostAcrossScenariosDb:round(Math.max(...models.map(m=>m.peakNominalPositiveBoostDb))),
   maxAdjacentJumpAcrossScenariosDb:round(Math.max(...models.map(m=>m.maximumAdjacentGainJumpDb))),
   maxUniformShiftDeltaDb:round(Math.max(...models.map(m=>m.maximumUniformShiftDeltaDb))),
   maxAlternatingPerturbationDeltaDb:round(Math.max(...models.map(m=>m.maximumAlternatingPerturbationDeltaDb))),
   anyHeadroomReviewNeeded:models.some(m=>m.requiresHardwareHeadroomVerification),
  };
 });
 return {
  format:HEAR3_EQ_BENCHMARK_FORMAT,
  benchmarkKind:'deterministic-synthetic-invariants-not-human-perceptual-quality',
  generatedFromPersonalData:false,
  deployable:false,chosenMethod:null,
  comparisons:cases,summary,
  requiredNextEvidence:[
   'No measured acoustic response or physical SPL; no real-device validation.',
   'Illustrative preamp offset is NOT guaranteed clipping protection for real filters, summation or intersample peaks.',
   'Evaluate biquad/filter response and numerical peak/headroom before choosing EQ correction.',
   'Validate contradictions, user preference, L/R and device safety with real hardware.',
   'No clinical thresholds, psychoacoustic accuracy or preferred EQ model have been established.',
  ],
 };
}
