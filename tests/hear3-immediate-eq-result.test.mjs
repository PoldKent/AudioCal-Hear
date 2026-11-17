import test from 'node:test';
import assert from 'node:assert/strict';
import {HEAR3_EQ_ENGINE_FORMAT} from '../src/hear3/bounded-eq-engine.mjs';
import {
 inspectHear3ImmediateEq,formatHear3ImmediateEq,
} from '../src/hear3/immediate-eq-result.mjs';

const original={
 format:HEAR3_EQ_ENGINE_FORMAT,bandCount:3,channel:'joint',
 capDb:3,autoApplyAllowed:false,validatedForProduction:false,
 headroomVerified:false,acousticCalibration:'not-established',
 correctionCoverage:'relative-model',
 rows:[
  {bandId:'band-125',frequencyHz:125,gainDb:-1,source:'direct-subjective-contrast'},
  {bandId:'band-500',frequencyHz:500,gainDb:0,source:'neutral-inconclusive'},
  {bandId:'band-2000',frequencyHz:2000,gainDb:1.5,source:'direct-subjective-contrast'},
 ],
 currentEq:[{bandId:'band-125',gainDb:-1},{bandId:'band-500',gainDb:0},
  {bandId:'band-2000',gainDb:1.5}],
};
test('a completed EQ has exactly one truth for graphics, copy, TXT and CSV',()=>{
 const draft=structuredClone(original);
 const view=inspectHear3ImmediateEq(draft);
 assert.equal(view.rows.length,3);
 assert.deepEqual(view.rows.map(x=>x.gainDb),[-1,0,1.5]);
 assert.match(formatHear3ImmediateEq(view),/125 Hz = -1 dB/);
 assert.match(formatHear3ImmediateEq(view),/500 Hz = 0 dB/);
 assert.match(formatHear3ImmediateEq(view),/2000 Hz = \+1.5 dB/);
 assert.match(formatHear3ImmediateEq(view),/no calibrado/i);
 assert.match(formatHear3ImmediateEq(view,{format:'csv'}),/2000,1.5,/);
 assert.match(formatHear3ImmediateEq(view,{format:'csv'}),/125,-1,/);
 assert.deepEqual(draft,original,'Inspection may not alter the source hearing evidence');
});
test('invalid, exaggerated or mismatched recommendations never reach the EQ view',()=>{
 const invalid=[
  {rows:[{...original.rows[0],gainDb:17},...original.rows.slice(1)]},
  {autoApplyAllowed:true},
  {headroomVerified:true},
  {acousticCalibration:'established'},
  {bandCount:2},
  {currentEq:[{bandId:'unknown',gainDb:-1},...original.currentEq.slice(1)]},
  {rows:[original.rows[1],original.rows[0],original.rows[2]]},
  {rows:[original.rows[0],{...original.rows[1],gainDb:NaN},original.rows[2]]},
  {rows:[original.rows[0],{...original.rows[1],gainDb:0.2},original.rows[2]]},
 ];
 for(const change of invalid){
  const candidate={...structuredClone(original),...change};
  assert.throws(()=>inspectHear3ImmediateEq(candidate),undefined,
   JSON.stringify(Object.keys(change)));
 }
});
test('neutral outcomes are explained, never boosted for appearance',()=>{
 const neutral=structuredClone(original);
 neutral.correctionCoverage='neutral-only-no-valid-contrast';
 neutral.rows.forEach(r=>r.gainDb=0);
 neutral.currentEq.forEach(r=>r.gainDb=0);
 const view=inspectHear3ImmediateEq(neutral);
 assert.match(view.resultStatus,/curva neutra/);
 assert.deepEqual(view.rows.map(r=>r.gainDb),[0,0,0]);
 assert.throws(()=>formatHear3ImmediateEq(view,{format:'pdf'}));
});
