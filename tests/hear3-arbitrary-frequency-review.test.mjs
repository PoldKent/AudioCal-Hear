import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,transitionSession} from '../src/hear3/session-contract.mjs';
import {createSweepPlan,planSweepConfirmations} from '../src/hear3/sweep-planner.mjs';
import {createHear3ResumableAdaptiveExam} from '../src/hear3/resumable-adaptive-exam.mjs';
import {createHear3AdaptiveProgressStore} from '../src/hear3/adaptive-progress-store.mjs';

class Storage{
 constructor(){this.records=new Map();}
 getItem(k){return this.records.get(k)??null;}
 setItem(k,v){this.records.set(k,v);}
 removeItem(k){this.records.delete(k);}
}
const makePlan=()=>planSweepConfirmations(createSweepPlan({
 minHz:125,maxHz:2000,durationSeconds:20,
}),[],[
 {id:'bass',frequencyHz:125},{id:'middle',frequencyHz:500},
 {id:'treble',frequencyHz:2000},
]);
function harness(){
 const device=new Storage(),starts=[],store=createHear3AdaptiveProgressStore({
  profileId:'arbitrary-review',deviceStorage:device,tabStorage:null,
 });
 const make=()=>createHear3ResumableAdaptiveExam({
  plan:makePlan(),profileId:'arbitrary-review',minDbfs:-80,maxDbfs:-42,
  initialDbfs:-60,maxTrialsPerBand:7,coarseStepDb:6,
  progressStore:store,adapterFactory:()=>({
   async playTone(tone){starts.push(tone.toneId);return {started:true,toneId:tone.toneId};},
   stop(){return true;},getStatus(){return null;},async dispose(){},
  }),
 });
 const answer=async(exam,response='not-heard')=>{
  const out=await exam.playNext({userInitiated:true});
  assert.equal(out.started,true);
  exam.answer(response);
  return out.tone;
 };
 const finishCurrent=async(exam)=>{
  const id=exam.snapshot().currentBandId;
  let count=0;
  while(exam.snapshot().currentBandId===id){
   await answer(exam);
   assert.ok(++count<=7,'a frequency must finish within its budget');
  }
 };
 return {device,starts,store,make,answer,finishCurrent};
}
test('verified selective retirement is silent, atomic and cannot alter other frequencies',()=>{
 let s=createSession({profileId:'p',minDbfs:-80,maxDbfs:-42});
 const record=(id,frequencyHz)=>({toneId:id,frequencyHz,digitalLevelDbfs:-60,
  channel:'joint',response:'heard',provenance:'user-response'});
 s={...s,observations:[record('hear3-1',125),record('hear3-2',500),record('hear3-3',125)]};
 const before=structuredClone(s.observations);
 for(const input of [
  {type:'REVISE_VERIFIED_BAND',toneIds:['hear3-1','hear3-3']},
  {type:'REVISE_VERIFIED_BAND',confirmed:true,toneIds:['hear3-1']},
  {type:'REVISE_VERIFIED_BAND',confirmed:true,toneIds:['hear3-1','hear3-2']},
  {type:'REVISE_VERIFIED_BAND',confirmed:true,toneIds:['invented']},
 ]){
  assert.throws(()=>transitionSession(s,input));
  assert.deepEqual(s.observations,before);
  assert.deepEqual(s.invalidatedToneIds,[]);
 }
 const revised=transitionSession(s,{
  type:'REVISE_VERIFIED_BAND',confirmed:true,toneIds:['hear3-1','hear3-3'],
 });
 assert.equal(revised.status,'paused');
 assert.equal(revised.routeCheckRequired,true);
 assert.deepEqual(revised.observations,before);
 assert.deepEqual(revised.invalidatedToneIds,['hear3-1','hear3-3']);
 assert.equal(revised.observations[1].frequencyHz,500);
 assert.throws(()=>transitionSession(revised,{
  type:'REVISE_VERIFIED_BAND',confirmed:true,toneIds:['hear3-1','hear3-3'],
 }),/non-retired/);
 const completed={...s,status:'completed'};
 assert.equal(transitionSession(completed,{
  type:'REVISE_VERIFIED_BAND',confirmed:true,toneIds:['hear3-1','hear3-3'],
 }).status,'paused');
 const playing={...s,status:'playing',currentTone:{
  toneId:'hear3-4',frequencyHz:125,digitalLevelDbfs:-60,channel:'joint',
 }};
 assert.throws(()=>transitionSession(playing,{
  type:'REVISE_VERIFIED_BAND',confirmed:true,toneIds:['hear3-1','hear3-3'],
 }),/stopped/);
});
test('a non-adjacent frequency may be retested after later bands and does not replay them',async()=>{
 const f=harness(),exam=f.make();
 await f.finishCurrent(exam);
 await f.finishCurrent(exam);
 await f.finishCurrent(exam);
 const done=exam.snapshot();
 assert.equal(done.status,'completed');
 assert.deepEqual(done.reviewableBands.map(b=>b.bandId),
  ['bass','middle','treble']);
 exam.finish();
 const original=exam.getSession().observations;
 const middle=original.filter(o=>o.frequencyHz===500);
 const treble=original.filter(o=>o.frequencyHz===2000);
 const originalCount=f.starts.length;
 assert.throws(()=>exam.retakeBand({bandId:'bass'}),/Explicit/);
 assert.throws(()=>exam.retakeBand({bandId:'unknown',userConfirmed:true}),/not safely reviewable/);
 assert.equal(exam.getSession().status,'completed');
 const correction=exam.retakeBand({bandId:'bass',userConfirmed:true});
 assert.equal(correction.currentBandId,'bass');
 assert.equal(correction.status,'paused');
 assert.equal(correction.completedBands,2);
 assert.equal(f.starts.length,originalCount,'correction must never auto-play');
 assert.deepEqual(exam.getSession().observations,original);
 assert.deepEqual(exam.getSession().invalidatedToneIds,
  original.filter(o=>o.frequencyHz===125).map(o=>o.toneId));
 assert.deepEqual(exam.snapshot().bands.find(b=>b.id==='middle').observations,middle);
 assert.throws(()=>exam.resume({userInitiated:true}),/Route check required/);
 exam.confirmRoute({userConfirmed:true});
 exam.resume({userInitiated:true});
 await f.finishCurrent(exam);
 assert.equal(exam.snapshot().status,'completed');
 assert.equal(exam.snapshot().completedBands,3);
 assert.equal(f.starts.length-originalCount,4,'only chosen frequency was played');
 assert.deepEqual(exam.getSession().observations.filter(o=>o.frequencyHz===500),middle);
 assert.deepEqual(exam.getSession().observations.filter(o=>o.frequencyHz===2000),treble);
 assert.ok(!exam.snapshot().reviewableBands.some(b=>b.bandId==='bass'),
  'same band cannot be revised repeatedly without limit');
 assert.equal(exam.finish().status,'completed');
});
test('checkpoint after arbitrary review restores in silence, then preserves unedited bands',async()=>{
 const f=harness(),original=f.make();
 await f.finishCurrent(original);
 await f.finishCurrent(original);
 const recorded=original.getSession().observations;
 const later=recorded.filter(o=>o.frequencyHz===500);
 const correction=original.retakeBand({bandId:'bass',userConfirmed:true});
 assert.equal(correction.currentBandId,'bass');
 assert.equal(correction.completedBands,1);
 const saved=f.store.load().checkpoint;
 assert.equal(saved.progress.position,0);
 assert.equal(saved.progress.bands[1].status,'inconclusive');
 assert.deepEqual(saved.audioSession.observations,recorded);
 const starts=f.starts.length;
 const reopened=f.make();
 const restored=await reopened.recover({userInitiated:true});
 assert.equal(restored.state.status,'paused');
 assert.equal(f.starts.length,starts);
 assert.equal(restored.state.currentBandId,'bass');
 assert.equal(restored.state.completedBands,1);
 assert.deepEqual(reopened.getSession().observations,recorded);
 assert.deepEqual(reopened.getSession().observations.filter(o=>o.frequencyHz===500),later);
 reopened.confirmRoute({userConfirmed:true});
 reopened.resume({userInitiated:true});
 await f.finishCurrent(reopened);
 assert.equal(reopened.snapshot().currentBandId,'treble');
 assert.equal(reopened.snapshot().completedBands,2);
 assert.deepEqual(reopened.getSession().observations.filter(o=>o.frequencyHz===500),later);
});
test('a target frequency cannot be invalidated while an unfinished current tone has evidence',async()=>{
 const f=harness(),exam=f.make();
 await f.finishCurrent(exam);
 await f.answer(exam,'heard');
 assert.deepEqual(exam.snapshot().reviewableBands,[]);
 const before=exam.getSession();
 assert.throws(()=>exam.retakeBand({bandId:'bass',userConfirmed:true}),
  /not safely reviewable/);
 assert.deepEqual(exam.getSession(),before);
});

test('too-loud preference is bound to a verified tone and survives fresh-tab recovery',async()=>{
 const f=harness(),exam=f.make();
 const tone=await f.answer(exam,'heard');
 const report={toneId:tone.toneId,frequencyHz:125};
 assert.throws(()=>exam.rememberLoudTone({toneId:'invented',frequencyHz:125}),
  /verified active tone/);
 assert.deepEqual(exam.getLoudToneReports(),[]);
 assert.deepEqual(exam.rememberLoudTone(report),[report]);
 assert.deepEqual(f.store.load().checkpoint.loudToneReports,[report]);
 const started=f.starts.length;
 const freshTab=f.make();
 await freshTab.recover({userInitiated:true});
 assert.equal(f.starts.length,started);
 assert.deepEqual(freshTab.getLoudToneReports(),[report]);
 freshTab.confirmRoute({userConfirmed:true});
 freshTab.resume({userInitiated:true});
 // Completing the original band makes it eligible for selective correction.
 while(freshTab.snapshot().currentBandId==='bass')
  await f.answer(freshTab,'heard');
 const selected=freshTab.retakeBand({bandId:'bass',userConfirmed:true});
 assert.equal(selected.currentBandId,'bass');
 assert.deepEqual(freshTab.getLoudToneReports(),[]);
 assert.deepEqual(f.store.load().checkpoint.loudToneReports,[]);
});

test('a tampered discomfort preference cannot be recovered as verified evidence',async()=>{
 const f=harness(),exam=f.make();
 const tone=await f.answer(exam,'heard');
 exam.rememberLoudTone({toneId:tone.toneId,frequencyHz:125});
 const original=f.store.load(),changed=structuredClone(original.checkpoint);
 changed.loudToneReports[0].frequencyHz=2000;
 f.store.save(changed,{expectedRevision:original.revision});
 const fresh=f.make();
 await assert.rejects(fresh.recover({userInitiated:true}),/verified active tone/);
 assert.equal(fresh.getSession().observations.length,0);
 assert.equal(fresh.getLoudToneReports().length,0);
});
