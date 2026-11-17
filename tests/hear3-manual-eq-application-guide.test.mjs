import test from 'node:test';
import assert from 'node:assert/strict';
import {planHear3ManualEqApplication,HEAR3_GUIDE_CATEGORIES}
 from '../src/hear3/manual-eq-application-guide.mjs';

const review={capDb:3,rows:[
 {frequencyHz:64,gainDb:-1},
 {frequencyHz:160,gainDb:0},
 {frequencyHz:400,gainDb:1.5},
 {frequencyHz:1000,gainDb:0},
 {frequencyHz:2500,gainDb:-0.5},
 {frequencyHz:6250,gainDb:0},
 {frequencyHz:15625,gainDb:1},
]};
test('every supported destination uses exactly the user-visible gain values, not guessed hardware positions',()=>{
 for(const category of HEAR3_GUIDE_CATEGORIES){
  const guide=planHear3ManualEqApplication({category,review});
  assert.equal(guide.rows.length,review.rows.length);
  assert.deepEqual(guide.rows.map(x=>x.gainDb),review.rows.map(x=>x.gainDb));
  assert.equal(guide.rows[0].text,'64 Hz · -1 dB');
  assert.equal(guide.rows[2].text,'400 Hz · +1.5 dB');
  assert.match(guide.warning,/no se aplican automáticamente/i);
  assert.match(guide.warning,/no inventes una conversión/i);
  assert.ok(guide.steps.length>=4);
  assert.equal(guide.hasNonNeutralGain,true);
 }
});
test('car guidance requires the vehicle to be stationary and warns about invalid control equivalence',()=>{
 const guide=planHear3ManualEqApplication({category:'car',review});
 assert.ok(guide.steps.some(x=>x.includes('estacionado')));
 assert.ok(guide.steps.some(x=>x.includes('no inventes')));
});
test('neutral results remain neutral with no fake corrective dB',()=>{
 const data={capDb:2,rows:review.rows.map(r=>({...r,gainDb:0}))};
 const guide=planHear3ManualEqApplication({review:data,category:'speaker'});
 assert.equal(guide.hasNonNeutralGain,false);
 assert.ok(guide.rows.every(r=>r.gainDb===0));
});
test('reject malformed, unsorted, out-of-range or exaggerated manual EQ instructions',()=>{
 const invalid=[
  {category:'medical',review},
  {review:{capDb:100,rows:review.rows}},
  {review:{capDb:3,rows:review.rows.slice(0,1)}},
  {review:{capDb:3,rows:[review.rows[1],review.rows[0]]}},
  {review:{capDb:3,rows:[review.rows[0],{frequencyHz:100000,gainDb:0}]}},
  {review:{capDb:3,rows:[review.rows[0],{frequencyHz:200,gainDb:5}]}},
  {review:{capDb:3,rows:[review.rows[0],{frequencyHz:200,gainDb:NaN}]}},
 ];
 for(const args of invalid)assert.throws(()=>planHear3ManualEqApplication(args));
});
