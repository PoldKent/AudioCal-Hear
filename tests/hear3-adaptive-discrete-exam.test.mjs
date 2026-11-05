import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3AudioSession} from '../src/hear3/audio-session-controller.mjs';
import {createHear3AdaptiveDiscreteExam} from '../src/hear3/adaptive-discrete-exam.mjs';
import {createSweepPlan,planSweepConfirmations} from '../src/hear3/sweep-planner.mjs';

const bands=[{id:'bass',frequencyHz:125},{id:'mid',frequencyHz:1000}];
const sweep=createSweepPlan({minHz:125,maxHz:2000,durationSeconds:20});
function fixture({defer=false}={}){
 let active=null,contextState='running',resolveStart=null;
 const calls=[];
 const controller=createHear3AudioSession({
  profileId:'headphones-experimental',minDbfs:-80,maxDbfs:-42,
  adapterFactory:()=>{
   return {
    async playTone(tone){
      calls.push(['start',tone]);
      if(defer)await new Promise(resolve=>{resolveStart=resolve});
      active=tone.toneId;
      return {started:true,toneId:tone.toneId};
    },
    stop(){calls.push(['stop']);active=null;return true;},
    getStatus(){return {activeToneId:active,contextState,visible:true};},
    async dispose(){},
   };
  },
 });
 const plan=planSweepConfirmations(sweep,[],bands);
 const exam=createHear3AdaptiveDiscreteExam({plan,sessionController:controller,
  initialDbfs:-60,coarseStepDb:6,maxTrialsPerBand:7,durationSeconds:2});
 return {exam,controller,calls,setContext:v=>contextState=v,release:()=>resolveStart?.()};
}
async function reply(f,response) {
 const p=await f.exam.playNext({userInitiated:true});
 assert.equal(p.started,true);
 const tone=p.tone;
 f.exam.answer(response);
 return tone;
}
test('a sweep plan becomes ordered discrete candidates without calculated thresholds or EQ',()=>{
 const f=fixture(),s=f.exam.snapshot();
 assert.equal(s.currentBandId,'bass');
 assert.equal(s.nextDigitalLevelDbfs,-60);
 assert.equal(s.thresholdsEstimated,0);
 assert.equal(s.eqGainsCalculated,0);
 assert.equal(s.totalBands,2);
 assert.equal(s.authorizedDigitalRangeDbfs.maxDbfs,-42);
 assert.equal(s.bands[0].status,'pending');
 assert.throws(()=>createHear3AdaptiveDiscreteExam({
  plan:planSweepConfirmations(sweep,[],bands),sessionController:f.controller,initialDbfs:-20,
 }),/already-authorized/);
});
test('tone starts only on explicit interaction and verified controller answers silence audio first',async()=>{
 const f=fixture();
 await assert.rejects(f.exam.playNext(),/Explicit action/);
 assert.throws(()=>f.exam.answer('heard'),/No verified/);
 const tone=await reply(f,'heard');
 assert.equal(tone.frequencyHz,125);
 assert.equal(tone.digitalLevelDbfs,-60);
 assert.deepEqual(f.calls.map(c=>c[0]),['start','stop']);
 assert.equal(f.exam.snapshot().nextDigitalLevelDbfs,-66);
 assert.equal(f.controller.getSession().observations[0].provenance,'user-response');
});
test('adaptive search preserves subjective interval and selectively verifies boundary',async()=>{
 const f=fixture();
 const a=await reply(f,'heard');
 const b=await reply(f,'not-heard');
 const c=await reply(f,'heard');
 const d=await reply(f,'not-heard');
 assert.deepEqual([a.digitalLevelDbfs,b.digitalLevelDbfs,c.digitalLevelDbfs,d.digitalLevelDbfs],
   [-60,-66,-63,-64.5]);
 assert.equal(f.exam.snapshot().nextDigitalLevelDbfs,-63);
 const confirm=await reply(f,'heard');
 assert.equal(confirm.digitalLevelDbfs,-63);
 const s=f.exam.snapshot();
 assert.equal(s.completedBands,1);
 assert.equal(s.bands[0].status,'bounded-subjective-interval');
 assert.deepEqual(s.bands[0].intervalDbfs,{notHeardAtDbfs:-64.5,heardAtDbfs:-63});
 assert.equal(s.bands[0].confidence,'medium');
 assert.equal(s.nextDigitalLevelDbfs,-60);
 assert.equal(s.thresholdsEstimated,0);
 assert.equal(s.eqGainsCalculated,0);
});
test('contradictory repeated response gates further play until explicit consent or skip',async()=>{
 const f=fixture();
 for(const response of ['heard','not-heard','heard','not-heard','not-heard'])
  await reply(f,response);
 let s=f.exam.snapshot();
 assert.equal(s.status,'awaiting-confirmation');
 assert.equal(s.needsContradictionConfirmation,true);
 assert.match(s.contradictionExplanation,/Confirma antes de repetir/);
 await assert.rejects(f.exam.playNext({userInitiated:true}),/eligible tone/);
 s=f.exam.confirmContradiction({userConfirmed:false});
 assert.equal(s.bands[0].status,'inconclusive');
 assert.equal(s.bands[0].intervalDbfs,null);
 assert.equal(s.currentBandId,'mid');
 assert.equal(s.bands[0].observations.length,5);
});
test('consenting to retry does not erase contradictory reports or increase digital limits',async()=>{
 const f=fixture();
 for(const response of ['heard','not-heard','heard','not-heard','not-heard'])
  await reply(f,response);
 const s=f.exam.confirmContradiction({userConfirmed:true});
 assert.equal(s.status,'ready');
 const tone=await reply(f,'heard');
 assert.equal(tone.digitalLevelDbfs,-63);
 const next=f.exam.snapshot();
 assert.equal(next.bands[0].observations.length,6);
 assert.equal(next.status,'awaiting-confirmation');
 assert.ok(next.authorizedDigitalRangeDbfs.maxDbfs===-42);
});
test('unheard band at maximum authorized digital level remains inconclusive, no unsafe escalation',async()=>{
 const f=fixture();
 const steps=[];
 while(f.exam.snapshot().currentBandId==='bass'){
  const tone=await reply(f,'not-heard');steps.push(tone.digitalLevelDbfs);
  assert.ok(tone.digitalLevelDbfs<=-42);
 }
 assert.deepEqual(steps,[-60,-54,-48,-42]);
 assert.equal(f.exam.snapshot().bands[0].status,'inconclusive');
 assert.equal(f.exam.snapshot().bands[0].intervalDbfs,null);
});
test('session suspension rejects an unverified answer and requires manual resume',async()=>{
 const f=fixture();
 await f.exam.playNext({userInitiated:true});
 f.setContext('suspended');
 assert.throws(()=>f.exam.answer('not-heard'),/no longer verified/);
 assert.equal(f.exam.snapshot().status,'paused');
 assert.equal(f.exam.snapshot().bands[0].observations.length,0);
 assert.throws(()=>f.exam.resume(),/Explicit action/);
 f.exam.confirmRoute({userConfirmed:true});
 f.setContext('running');
 assert.equal(f.exam.resume({userInitiated:true}).status,'ready');
 assert.equal(f.calls.filter(x=>x[0]==='start').length,1);
});
test('late asynchronous tone start cannot reopen audio after interruption',async()=>{
 const f=fixture({defer:true});
 const pending=f.exam.playNext({userInitiated:true});
 f.exam.interrupt();
 f.release();
 const res=await pending;
 assert.equal(res.started,false);
 assert.equal(f.exam.snapshot().status,'paused');
 assert.equal(f.exam.snapshot().bands[0].observations.length,0);
});
test('final output covers every band and can be explicitly finished without assigning a threshold',async()=>{
 const f=fixture();
 for(let i=0;i<2;i++){
  while(f.exam.snapshot().currentBandId!==null){
   const s=f.exam.snapshot();
   if(s.currentBandId!==(i===0?'bass':'mid'))break;
   await reply(f,'not-heard');
  }
 }
 const final=f.exam.snapshot();
 assert.equal(final.status,'completed');
 assert.equal(final.completedBands,2);
 assert.equal(final.bands.every(b=>b.status==='inconclusive'),true);
 assert.equal(final.thresholdsEstimated,0);
 assert.equal(final.eqGainsCalculated,0);
 assert.equal(f.exam.finish().status,'completed');
});
