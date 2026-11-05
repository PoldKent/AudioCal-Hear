import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createHear3ContextualToneComparison,planHear3ContradictionComparison,
 HEAR3_COMPARISON_FORMAT,
} from '../src/hear3/contextual-tone-comparison.mjs';

const bounds={minDbfs:-80,maxDbfs:-42};
const pair=()=>planHear3ContradictionComparison({
 comparisonId:'cmp-1',frequencyHz:1000,channel:'joint',currentDbfs:-60,
 authorizedDigitalRangeDbfs:bounds,durationSeconds:1,gapMilliseconds:200,
});
function fixture(){
 const tones=[],jobs=[],callbacks={};
 let active=null,contextState='running',visible=true,disposed=false;
 const ctrl=createHear3ContextualToneComparison({
  adapterFactory:opts=>{
   Object.assign(callbacks,opts);
   return {
    async playTone(tone){tones.push(tone);active=tone.toneId;
     return {started:true,toneId:tone.toneId};},
    stop(){active=null;},
    getStatus(){return {activeToneId:active,contextState,visible,disposed};},
    async dispose(){disposed=true;active=null;},
   };
  },
  schedule:(fn,ms)=>{const job={fn,ms,cancelled:false};jobs.push(job);return job;},
  cancel:job=>{job.cancelled=true;},
 });
 function end(id=active){
  active=null;
  callbacks.onToneEnded({toneId:id});
 }
 async function gap(){
  const job=jobs.shift();
  assert.ok(job,'scheduled auto-second missing');
  if(!job.cancelled)await job.fn();
  await Promise.resolve();
 }
 return {ctrl,tones,jobs,end,gap,callbacks,
  getActive:()=>active,setState:x=>{contextState=x;},
  setVisible:x=>{visible=x;},isDisposed:()=>disposed};
}
test('pair planning stays within digital bounds and never increases the authorization',()=>{
 const p=pair();
 assert.deepEqual([p.firstDbfs,p.secondDbfs],[-63,-57]);
 assert.equal(p.channel,'joint');
 assert.equal(p.authorizedDigitalRangeDbfs.maxDbfs,-42);
 const min=planHear3ContradictionComparison({
  comparisonId:'min',frequencyHz:125,currentDbfs:-80,
  authorizedDigitalRangeDbfs:bounds,
 });
 assert.deepEqual([min.firstDbfs,min.secondDbfs],[-80,-77]);
 const max=planHear3ContradictionComparison({
  comparisonId:'max',frequencyHz:125,currentDbfs:-42,
  authorizedDigitalRangeDbfs:bounds,
 });
 assert.deepEqual([max.firstDbfs,max.secondDbfs],[-45,-42]);
 assert.throws(()=>planHear3ContradictionComparison({
  comparisonId:'invalid',frequencyHz:125,currentDbfs:-42,
  authorizedDigitalRangeDbfs:{minDbfs:-42,maxDbfs:-42},
 }),/too narrow/);
});
test('one deliberate click plays first tone then automatically the second with a bounded gap',async()=>{
 const f=fixture();
 assert.equal(f.tones.length,0);
 await assert.rejects(f.ctrl.start({comparison:pair()}),/user action/);
 assert.equal(f.tones.length,0);
 const started=await f.ctrl.start({comparison:pair(),userInitiated:true});
 assert.equal(started.started,true);
 assert.deepEqual(f.tones.map(x=>x.toneId),['cmp-1-first']);
 assert.equal(f.tones[0].digitalLevelDbfs,-63);
 assert.equal(f.ctrl.snapshot().state,'first');
 assert.throws(()=>f.ctrl.respond('second-clearer'),/Both tones/);
 f.end();
 assert.equal(f.ctrl.snapshot().state,'gap');
 assert.equal(f.jobs[0].ms,200);
 await f.gap();
 assert.equal(f.ctrl.snapshot().state,'second');
 assert.deepEqual(f.tones.map(x=>x.toneId),['cmp-1-first','cmp-1-second']);
 assert.equal(f.tones[1].digitalLevelDbfs,-57);
 assert.equal(f.tones[1].authorizedDigitalRangeDbfs.maxDbfs,-42);
 f.end();
 assert.equal(f.ctrl.snapshot().state,'awaiting-response');
 const evidence=f.ctrl.respond('second-clearer');
 assert.equal(evidence.format,HEAR3_COMPARISON_FORMAT);
 assert.equal(evidence.response,'second-clearer');
 assert.equal(evidence.provenance,'user-response');
 assert.equal(evidence.calibratedThresholds,0);
 assert.equal(evidence.eqGainsCalculated,0);
 assert.equal(f.ctrl.snapshot().state,'completed');
 assert.throws(()=>f.ctrl.respond('first-clearer'),/Both tones/);
});
test('stop during first tone invalidates callback and never schedules second',async()=>{
 const f=fixture();
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 const old=f.getActive();
 f.ctrl.interrupt();
 f.end(old);
 assert.deepEqual(f.tones.map(x=>x.toneId),['cmp-1-first']);
 assert.equal(f.jobs.length,0);
 assert.equal(f.ctrl.snapshot().state,'interrupted');
});
test('stop during gap cancels pending automatic sound and no evidence can be recorded',async()=>{
 const f=fixture();
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 f.end();
 f.ctrl.interrupt();
 await f.gap();
 assert.equal(f.tones.length,1);
 assert.equal(f.ctrl.snapshot().state,'interrupted');
 assert.throws(()=>f.ctrl.respond('similar'),/Both tones/);
});
test('browser becomes invisible before second; fail closed rather than auto-resume audio',async()=>{
 const f=fixture();
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 f.end();
 f.setVisible(false);
 await f.gap();
 assert.equal(f.tones.length,1);
 assert.equal(f.ctrl.snapshot().state,'interrupted');
 assert.equal(f.ctrl.snapshot().completeSequence,false);
});
test('suspended audio context before second prevents second sound and response',async()=>{
 const f=fixture();
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 f.end();
 f.setState('suspended');
 await f.gap();
 assert.equal(f.tones.length,1);
 assert.equal(f.ctrl.snapshot().state,'interrupted');
 assert.throws(()=>f.ctrl.respond('neither'),/Both tones/);
});
test('interrupted route can be restarted only by another explicit user action',async()=>{
 const f=fixture();
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 f.ctrl.interrupt();
 await assert.rejects(f.ctrl.start({comparison:pair()}),/user action/);
 assert.equal(f.tones.length,1);
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 assert.equal(f.tones.length,2);
});
test('unknown tone IDs, premature answers and repeated starts do not count as evidence',async()=>{
 const f=fixture();
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 f.end('wrong-tone');
 assert.equal(f.ctrl.snapshot().state,'first');
 await assert.rejects(f.ctrl.start({comparison:pair(),userInitiated:true}),/must finish/);
 assert.throws(()=>f.ctrl.respond('uncertain'),/Both tones/);
});
test('completion preserves uncertain response instead of inferring perceptual ability',async()=>{
 const f=fixture();
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 f.end();await f.gap();f.end();
 const e=f.ctrl.respond('uncertain');
 assert.equal(e.uncertaintyPreserved,true);
 assert.equal(e.calibratedThresholds,0);
 assert.equal(f.ctrl.snapshot().thresholdsEstimated,0);
});
test('dispose silences, cancels gaps and disallows future playback',async()=>{
 const f=fixture();
 await f.ctrl.start({comparison:pair(),userInitiated:true});
 f.end();
 await f.ctrl.dispose();
 await f.gap();
 assert.equal(f.tones.length,1);
 assert.equal(f.isDisposed(),true);
 await assert.rejects(f.ctrl.start({comparison:pair(),userInitiated:true}),/disposed/);
});
test('bad or out-of-range pair cannot create any oscillator',async()=>{
 const f=fixture();
 await assert.rejects(f.ctrl.start({userInitiated:true,comparison:{
  ...pair(),secondDbfs:-10,
 }}),/previously authorized digital range/);
 assert.equal(f.tones.length,0);
 await assert.rejects(f.ctrl.start({userInitiated:true,comparison:{
  ...pair(),durationSeconds:40,
 }}),/duration/);
 assert.equal(f.tones.length,0);
});
