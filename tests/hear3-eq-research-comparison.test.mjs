import test from 'node:test';
import assert from 'node:assert/strict';
import {compareHear3HypotheticalEqModels,HEAR3_EQ_RESEARCH_FORMAT}
 from '../src/hear3/eq-research-comparison.mjs';

const b=(id,frequencyHz,from=-66,to=-62)=>({
 id,frequencyHz,status:'bounded-subjective-interval',
 intervalDbfs:{notHeardAtDbfs:from,heardAtDbfs:to},
});
const empty=(id,frequencyHz)=>({id,frequencyHz,status:'inconclusive',intervalDbfs:null});
const flat=()=>[b('low',100),b('midlow',300),b('mid',1000),b('high',8000)];

test('research output never marks any candidate deployable or acoustically calibrated',()=>{
 const result=compareHear3HypotheticalEqModels(flat());
 assert.equal(result.format,HEAR3_EQ_RESEARCH_FORMAT);
 assert.equal(result.deployable,false);
 assert.equal(result.candidates.length,3);
 assert.equal(result.sourceBandCount,4);
 assert.equal(result.eligibleBandCount,4);
 assert.match(result.evidenceClass,/not-acoustic-calibration/);
 assert.ok(result.limitations.some(x=>x.includes('dBFS')));
 assert.ok(result.candidates.every(c=>typeof c.description==='string'));
});

test('flat subjective midpoints produce zero hypothetical gains in all models',()=>{
 const out=compareHear3HypotheticalEqModels(flat());
 for(const model of out.candidates){
  assert.deepEqual(model.rows.map(r=>r.hypotheticalGainDb),[0,0,0,0]);
  assert.equal(model.metrics.maximumAbsoluteGainDb,0);
  assert.equal(model.metrics.positiveBoostDb,0);
 }
});
test('different frequency response hypotheses produce different bounded results',()=>{
 const data=[b('low',100),b('midlow',300),b('mid',1000,-48,-44),b('high',8000)];
 const out=compareHear3HypotheticalEqModels(data);
 const [global,local,hybrid]=out.candidates;
 assert.equal(global.method,'global-median');
 assert.equal(local.method,'local-neighbors');
 assert.equal(hybrid.method,'hybrid-prototype');
 assert.ok(global.rows[2].hypotheticalGainDb>0);
 assert.ok(local.rows[2].hypotheticalGainDb>0);
 assert.ok(hybrid.rows[2].hypotheticalGainDb>0);
 assert.ok(out.candidates.every(c=>c.rows.every(r=>Math.abs(r.hypotheticalGainDb)<=c.experimentalCapDb)));
 assert.ok(out.candidates.every(c=>c.metrics.maximumAdjacentGainJumpDb>=0));
});
test('missing and inconclusive bands remain neutral, not inferred or interpolated',()=>{
 const bands=[b('low',100),empty('unknown',500),b('mid',1000),b('high',8000)];
 const out=compareHear3HypotheticalEqModels(bands);
 for(const model of out.candidates){
  assert.equal(model.rows[1].hypotheticalGainDb,0);
  assert.equal(model.rows[1].classification,'neutral-not-enough-evidence');
  assert.equal(model.rows[1].evidence,'inconclusive');
 }
});
test('all inconclusive and one isolated interval both produce only neutral gains',()=>{
 for(const data of [
  [empty('a',100),empty('b',1000)],
  [b('a',100),empty('b',1000)],
 ]){
  const out=compareHear3HypotheticalEqModels(data);
  assert.ok(out.candidates.every(c=>c.rows.every(r=>r.hypotheticalGainDb===0)));
  assert.ok(out.candidates.every(c=>c.anchorDbfs===null));
 }
});
test('very wide subjective brackets remain neutral without being silently normalized',()=>{
 const out=compareHear3HypotheticalEqModels([
  b('low',100,-95,-60),b('mid',1000),b('high',8000)
 ]);
 assert.equal(out.eligibleBandCount,2);
 for(const model of out.candidates){
  assert.equal(model.rows[0].evidence,'too-wide-to-interpret');
  assert.equal(model.rows[0].hypotheticalGainDb,0);
 }
});
test('reject forged intervals and misleading inconclusive evidence',()=>{
 assert.throws(()=>compareHear3HypotheticalEqModels([b('a',100,-60,-66),b('b',1000)]),/Invalid subjective/);
 assert.throws(()=>compareHear3HypotheticalEqModels([b('a',100,-120,1),b('b',1000)]),/Invalid subjective/);
 assert.throws(()=>compareHear3HypotheticalEqModels([
  {id:'a',frequencyHz:100,status:'inconclusive',intervalDbfs:{notHeardAtDbfs:-60,heardAtDbfs:-50}},
  b('b',1000)
 ]),/cannot claim/);
 assert.throws(()=>compareHear3HypotheticalEqModels([
  {...b('a',100),status:'clinically-proven'},b('b',1000)
 ]),/Unknown evidence/);
});
test('reject unsorted, duplicate and out-of-bounds device frequency layouts',()=>{
 assert.throws(()=>compareHear3HypotheticalEqModels([b('a',1000),b('b',100)]),/ascending/);
 assert.throws(()=>compareHear3HypotheticalEqModels([b('a',100),b('a',1000)]),/repeated/);
 assert.throws(()=>compareHear3HypotheticalEqModels([b('a',100),b('b',22000)]),/ascending/);
 assert.throws(()=>compareHear3HypotheticalEqModels([b('a',100)]),/2–31/);
});
test('candidate evaluation does not mutate the input or choose an overall winner',()=>{
 const input=[b('low',125),b('mid',1000,-55,-51),b('hi',8000)];
 const before=JSON.stringify(input);
 const output=compareHear3HypotheticalEqModels(input);
 assert.equal(JSON.stringify(input),before);
 assert.equal('recommendedMethod' in output,false);
 assert.equal('originalEq' in output,false);
 assert.equal('finalEq' in output,false);
 assert.deepEqual(compareHear3HypotheticalEqModels(input),output);
});
