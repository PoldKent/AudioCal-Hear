import test from 'node:test';
import assert from 'node:assert/strict';
import {runHear3SyntheticEqStressBenchmark,HEAR3_EQ_BENCHMARK_FORMAT}
 from '../src/hear3/eq-research-benchmark.mjs';

const get=()=>runHear3SyntheticEqStressBenchmark();
test('D-039/040 benchmark uses deterministic synthetic cases and never picks a deployable EQ',()=>{
 const a=get(),b=get();
 assert.deepEqual(a,b);
 assert.equal(a.format,HEAR3_EQ_BENCHMARK_FORMAT);
 assert.equal(a.deployable,false);
 assert.equal(a.chosenMethod,null);
 assert.equal(a.generatedFromPersonalData,false);
 assert.equal(a.comparisons.length,8);
 assert.deepEqual(a.summary.map(x=>x.method),
  ['global-median','local-neighbors','hybrid-prototype']);
 assert.ok(a.requiredNextEvidence.some(x=>x.includes('SPL')));
 assert.ok(a.requiredNextEvidence.some(x=>x.includes('intersample')));
 assert.equal(JSON.stringify(a).includes('originalEq'),false);
 assert.equal(JSON.stringify(a).includes('currentEq'),false);
});
test('flat identical digital intervals give neutral gains in all models',()=>{
 const flat=get().comparisons.find(c=>c.scenario==='flat-digital-brackets');
 assert.equal(flat.eligibleBands,7);
 for(const m of flat.models){
  assert.equal(m.activeBands,0);
  assert.equal(m.peakNominalPositiveBoostDb,0);
  assert.equal(m.illustrativePreampOffsetDb,0);
  assert.equal(m.maximumUniformShiftDeltaDb,0);
 }
});
test('no evidence or only one band prevents fabrication of EQ gains',()=>{
 const cases=get().comparisons.filter(c=>
  ['single-eligible','all-inconclusive'].includes(c.scenario));
 assert.equal(cases.length,2);
 for(const c of cases)for(const m of c.models){
  assert.equal(m.activeBands,0);
  assert.equal(m.neutralBands,7);
  assert.equal(m.illustrativePreampOffsetDb,0);
  assert.equal(m.peakNominalPositiveBoostDb,0);
 }
});
test('inconclusive and very wide bands stay neutral in every candidate',()=>{
 const report=get();
 for(const id of ['missing-center','wide-endpoint']){
  const scenario=report.comparisons.find(c=>c.scenario===id);
  assert.equal(scenario.eligibleBands,6);
  for(const m of scenario.models){
   assert.ok(m.neutralBands>=1);
   assert.ok(m.activeBands<=6);
  }
 }
});
test('synthetic boosts expose a proxy headroom deficit rather than falsely authorizing clipping',()=>{
 const report=get();
 const raised=report.comparisons.find(c=>c.scenario==='mid-digital-contrast');
 for(const m of raised.models){
  assert.ok(m.peakNominalPositiveBoostDb>=0);
  assert.equal(m.illustrativePreampOffsetDb,-m.peakNominalPositiveBoostDb);
  assert.equal(m.requiresHardwareHeadroomVerification,m.peakNominalPositiveBoostDb>0);
  assert.ok(m.maximumAdjacentGainJumpDb>=0);
 }
 assert.equal(report.deployable,false);
});
test('frequency-dependent shifts can affect EQ hypotheses; uniform offsets do not',()=>{
 const report=get();
 assert.ok(report.summary.some(m=>m.maxAlternatingPerturbationDeltaDb>0));
 assert.ok(report.summary.every(m=>m.maxUniformShiftDeltaDb<=0.01));
 assert.ok(report.summary.every(m=>m.syntheticScenarios===8));
});
test('research gain hypotheses remain within their experimental caps',()=>{
 const report=get();
 const caps={'global-median':2,'local-neighbors':3,'hybrid-prototype':4};
 for(const scenario of report.comparisons){
  assert.equal(scenario.models.length,3);
  for(const model of scenario.models){
   assert.ok(model.peakNominalPositiveBoostDb<=caps[model.method]);
   assert.ok(model.peakNominalPositiveBoostDb>=0);
   assert.ok(model.maximumAdjacentGainJumpDb<=2*caps[model.method]);
  }
 }
});
