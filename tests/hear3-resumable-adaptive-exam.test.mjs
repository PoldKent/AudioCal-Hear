import test from 'node:test';
import assert from 'node:assert/strict';
import {createSweepPlan,planSweepConfirmations} from '../src/hear3/sweep-planner.mjs';
import {createHear3AdaptiveProgressStore,ADAPTIVE_BUNDLE_FORMAT}
 from '../src/hear3/adaptive-progress-store.mjs';
import {createHear3ResumableAdaptiveExam}
 from '../src/hear3/resumable-adaptive-exam.mjs';

class MemoryStorage {
 constructor(){this.data=new Map();this.failWrites=false;this.failDelete=false;}
 getItem(key){return this.data.get(key)??null;}
 setItem(key,value){if(this.failWrites)throw Error('blocked');this.data.set(key,value);}
 removeItem(key){if(this.failDelete)throw Error('blocked');this.data.delete(key);}
}
const plan=()=>planSweepConfirmations(createSweepPlan({
 minHz:125,maxHz:2000,durationSeconds:20,
}),[],[{id:'a',frequencyHz:125},{id:'b',frequencyHz:500}]);
function setup({device=new MemoryStorage(),tab=null,profileId='test-profile'}={}){
 const store=createHear3AdaptiveProgressStore({profileId,deviceStorage:device,tabStorage:tab});
 const starts=[];
 const create=()=>createHear3ResumableAdaptiveExam({
  plan:plan(),profileId,minDbfs:-80,maxDbfs:-42,
  initialDbfs:-60,progressStore:store,
  adapterFactory:()=>({
   async playTone({toneId}){starts.push(toneId);return {started:true,toneId};},
   stop(){},async dispose(){},
  }),
 });
 return {store,device,tab,starts,create};
}
async function toneAndAnswer(exam,response='heard'){
 const started=await exam.playNext({userInitiated:true});
 assert.equal(started.started,true);
 return {tone:started.tone,state:exam.answer(response)};
}
test('fresh exam never writes or initiates audio on construction and recovery preview',()=>{
 const f=setup();
 const exam=f.create();
 assert.equal(f.starts.length,0);
 assert.equal(f.store.load().checkpoint,null);
 assert.equal(exam.getRecoveryProposal().available,false);
 assert.equal(exam.snapshot().status,'ready');
 assert.equal(f.device.data.size,0);
});
test('adaptive observation and exact plan persist together without affecting V2 data',async()=>{
 const f=setup();
 f.device.setItem('audiocal-hear-profiles-v1','KEEP_V2');
 const exam=f.create();
 await toneAndAnswer(exam);
 const stored=f.store.load();
 assert.equal(stored.persistedOnDevice,true);
 assert.equal(stored.checkpoint.format,ADAPTIVE_BUNDLE_FORMAT);
 assert.equal(stored.checkpoint.progress.bands[0].observations.length,1);
 assert.equal(stored.checkpoint.audioSession.observations.length,1);
 assert.equal(stored.checkpoint.progress.thresholdsEstimated,0);
 assert.equal(stored.checkpoint.progress.eqGainsCalculated,0);
 assert.equal(f.device.getItem('audiocal-hear-profiles-v1'),'KEEP_V2');
 assert.equal(exam.getRecoveryProposal().available,false,'cannot recover over active exam');
});
test('recovery needs a click and restores a silent paused session and the next adaptive level',async()=>{
 const f=setup();
 const original=f.create();
 await toneAndAnswer(original,'heard');
 const oldStarts=f.starts.length;
 const next=f.create();
 assert.equal(next.getRecoveryProposal().observationCount,1);
 assert.throws(()=>next.resume({userInitiated:true}),/not paused/);
 await assert.rejects(next.recover(),/explicit user action/);
 const savedRevision=f.store.load().revision;
 const result=await next.recover({userInitiated:true});
 assert.equal(result.restored,true);
 assert.equal(result.state.status,'paused');
 assert.equal(result.state.bands[0].observations.length,1);
 assert.equal(f.starts.length,oldStarts,'recovery must not generate an oscillator');
 assert.equal(f.store.load().revision,savedRevision,'recovery must not write a checkpoint');
 assert.throws(()=>next.answer('heard'),/No verified/);
 assert.throws(()=>next.resume({userInitiated:true}),/Route check/);
 assert.throws(()=>next.confirmRoute(),/Explicit route confirmation/);
 next.confirmRoute({userConfirmed:true});
 assert.throws(()=>next.resume(),/Explicit action/);
 assert.equal(next.resume({userInitiated:true}).nextDigitalLevelDbfs,-66);
 const continued=await next.playNext({userInitiated:true});
 assert.equal(continued.started,true);
 assert.equal(continued.tone.digitalLevelDbfs,-66);
 assert.equal(continued.tone.toneId,'hear3-2');
 next.answer('not-heard');
 assert.equal(next.getSession().observations.length,2);
});
test('checkpoint captured while playing is never audible after restoration',async()=>{
 const f=setup();
 const exam=f.create();
 const started=await exam.playNext({userInitiated:true});
 assert.equal(started.started,true);
 assert.equal(f.store.load().checkpoint.audioSession.status,'playing');
 const resumed=f.create();
 const out=await resumed.recover({userInitiated:true});
 assert.equal(out.state.status,'paused');
 assert.equal(out.state.activeToneId,null);
 assert.equal(out.state.bands[0].observations.length,0);
 assert.equal(f.starts.length,1);
 assert.throws(()=>resumed.answer('not-heard'),/No verified/);
 assert.equal(resumed.getSession().currentTone,null);
});
test('a forged planner mismatch never replaces the original fresh controller',async()=>{
 const f=setup();
 const original=f.create();
 await toneAndAnswer(original);
 const snapshot=f.store.load();
 const changed=structuredClone(snapshot.checkpoint);
 changed.plan.initialOrder[0].frequencyHz=190;
 f.store.save(changed,{expectedRevision:snapshot.revision});
 const other=f.create();
 await assert.rejects(other.recover({userInitiated:true}),/plan does not match/);
 assert.equal(other.snapshot().status,'ready');
 assert.equal(f.starts.length,1);
});
test('duplicated or altered audio evidence is rejected before recovery',async()=>{
 const f=setup();
 const original=f.create();
 await toneAndAnswer(original);
 const checkpoint=f.store.load();
 const modified=structuredClone(checkpoint.checkpoint);
 modified.progress.bands[0].observations[0].response='not-heard';
 f.store.save(modified,{expectedRevision:checkpoint.revision});
 const other=f.create();
 await assert.rejects(other.recover({userInitiated:true}),/evidence disagree/);
 assert.equal(other.snapshot().status,'ready');
 assert.equal(f.starts.length,1);
});
test('a checkpoint with a raised authorization limit cannot be accepted',async()=>{
 const f=setup();
 await toneAndAnswer(f.create());
 const record=f.store.load();
 const data=structuredClone(record.checkpoint);
 data.progress.authorizedDigitalRangeDbfs.maxDbfs=-10;
 f.store.save(data,{expectedRevision:record.revision});
 await assert.rejects(f.create().recover({userInitiated:true}),/authorized digital bounds/);
});
test('same revision guard rejects stale writes across two store instances',async()=>{
 const device=new MemoryStorage();
 const f=setup({device});
 const another=createHear3AdaptiveProgressStore({
  profileId:'test-profile',deviceStorage:device,tabStorage:null,
 });
 const original=f.create();
 await toneAndAnswer(original);
 const checkpoint=f.store.load();
 another.save(checkpoint.checkpoint,{expectedRevision:checkpoint.revision});
 assert.throws(()=>f.store.save(checkpoint.checkpoint,{
  expectedRevision:checkpoint.revision,
 }),/changed since/);
});
test('storage failures report fallback without claiming device persistence',async()=>{
 const device=new MemoryStorage(),tab=new MemoryStorage();
 device.failWrites=true;
 const f=setup({device,tab});
 const exam=f.create();
 await toneAndAnswer(exam);
 assert.equal(exam.getPersistence().persistedOnDevice,false);
 assert.equal(exam.getPersistence().durability,'tab-session');
 assert.equal(f.store.load().checkpoint.progress.bands[0].observations.length,1);
 tab.failWrites=true;
 const again=f.create();
 await toneAndAnswer(again,'heard');
 assert.equal(again.getPersistence().durability,'volatile');
 assert.equal(again.getPersistence().persistedOnDevice,false);
});
test('corrupted copies never load as valid adaptive evidence',async()=>{
 const f=setup();
 const original=f.create();
 await toneAndAnswer(original);
 const key=[...f.device.data.keys()].find(k=>k.startsWith('hear3:adaptive-progress:'));
 f.device.setItem(key,'{ "malformed":"true"');
 const data=f.store.load();
 assert.equal(data.checkpoint,null);
 assert.ok(data.warnings.some(w=>w.includes('Damaged')));
 const newExam=f.create();
 assert.equal(newExam.getRecoveryProposal().available,false);
});
test('checkpoint deletion requires consent, clears both slots and does not delete legacy profiles',async()=>{
 const f=setup();
 f.device.setItem('audiocal-hear-profiles-v1','DO_NOT_ERASE');
 const exam=f.create();
 await toneAndAnswer(exam);
 assert.throws(()=>exam.clearCheckpoint(),/Explicit deletion/);
 const out=exam.clearCheckpoint({confirmed:true});
 assert.equal(out.cleared,true);
 assert.equal(f.store.load().checkpoint,null);
 assert.equal(f.device.getItem('audiocal-hear-profiles-v1'),'DO_NOT_ERASE');
});
test('backup export is local text with an explicit non-encryption warning',async()=>{
 const f=setup();
 await toneAndAnswer(f.create());
 const exportText=f.store.exportBackup();
 const file=JSON.parse(exportText);
 assert.equal(file.format,ADAPTIVE_BUNDLE_FORMAT);
 assert.match(file.warning,/Not encrypted/);
 assert.equal(file.integrity.algorithm,'fnv1a32');
 assert.equal(file.checkpoint.profileId,'test-profile');
});
test('saved contradictions preserve consent gate after explicit route check and resume',async()=>{
 const f=setup();
 const exam=f.create();
 for(const reply of ['heard','not-heard','heard','not-heard','not-heard']){
  await toneAndAnswer(exam,reply);
 }
 assert.equal(exam.snapshot().status,'awaiting-confirmation');
 const restored=f.create();
 await restored.recover({userInitiated:true});
 assert.equal(restored.snapshot().status,'paused');
 restored.confirmRoute({userConfirmed:true});
 assert.equal(restored.resume({userInitiated:true}).status,'awaiting-confirmation');
 await assert.rejects(restored.playNext({userInitiated:true}),/No eligible tone/);
 restored.confirmContradiction({userConfirmed:false});
 assert.equal(restored.snapshot().bands[0].status,'inconclusive');
});
