import test from 'node:test';
import assert from 'node:assert/strict';
import {createSweepPlan,planSweepConfirmations} from '../src/hear3/sweep-planner.mjs';
import {createHear3ResumableAdaptiveExam} from '../src/hear3/resumable-adaptive-exam.mjs';
import {createHear3AdaptiveProgressStore} from '../src/hear3/adaptive-progress-store.mjs';
import {createHear3CatalogStore} from '../src/hear3/catalog-backup-store.mjs';
import {createHear3AdaptiveCatalogArchive} from '../src/hear3/adaptive-catalog-archive.mjs';

class Storage{
 constructor(){this.entries=new Map();this.writable=true;}
 getItem(k){return this.entries.get(k)??null;}
 setItem(k,v){if(!this.writable)throw Error('blocked');this.entries.set(k,v);}
 removeItem(k){this.entries.delete(k);}
}
function fixture(){
 const local=new Storage(),cat=createHear3CatalogStore({deviceStorage:local,tabStorage:null});
 const progress=createHear3AdaptiveProgressStore({
  profileId:'real-exam',deviceStorage:local,tabStorage:null,
 });
 const plan=planSweepConfirmations(createSweepPlan({minHz:125,maxHz:2000,durationSeconds:20}),
  [],[{id:'band-125',frequencyHz:125},{id:'band-500',frequencyHz:500}]);
 let starts=0;
 const exam=createHear3ResumableAdaptiveExam({
  plan,profileId:'real-exam',minDbfs:-80,maxDbfs:-42,
  initialDbfs:-60,progressStore:progress,
  adapterFactory:()=>({
   async playTone({toneId}){starts++;return {started:true,toneId};},
   stop(){},async dispose(){},
  }),
 });
 const archive=createHear3AdaptiveCatalogArchive({catalogStore:cat,exam,now:()=>1791000000000});
 const args={deviceId:'new-device',profileId:'new-profile',
  resultId:'result-1',deviceName:'Audífonos de prueba',
  profileName:'Prueba experimental',category:'headphones'};
 return {local,cat,exam,archive,args,getStarts:()=>starts};
}
async function answer(exam,response){
 const playing=await exam.playNext({userInitiated:true});
 assert.equal(playing.started,true);
 exam.answer(response);
}
async function finish(exam){
 for(const response of ['heard','not-heard','heard','not-heard','heard'])
  await answer(exam,response);
 assert.equal(exam.snapshot().bands[0].status,'bounded-subjective-interval');
 for(let i=0;i<4;i++)await answer(exam,'not-heard');
 assert.equal(exam.snapshot().status,'completed');
 assert.equal(exam.finish().status,'completed');
}
test('uncompleted or unanswered exam cannot be archived',async()=>{
 const f=fixture();
 assert.throws(()=>f.archive.preview(f.args),/explicitly finished/);
 await answer(f.exam,'heard');
 assert.throws(()=>f.archive.preview(f.args),/explicitly finished/);
 assert.equal(f.cat.load().catalog.results.length,0);
});
test('explicit archive saves subjective observations, no clinical EQ or thresholds',async()=>{
 const f=fixture();
 f.local.setItem('audiocal-hear-profiles-v1','KEEP_OLD');
 await finish(f.exam);
 const revision=f.cat.load().revision;
 const preview=f.archive.preview(f.args);
 assert.equal(f.cat.load().revision,revision,'preview must never write');
 assert.equal(preview.subjectiveResponses,9);
 assert.equal(preview.bands,2);
 assert.equal(preview.status,'inconclusive');
 assert.equal(preview.originalEqBands,0);
 assert.equal(preview.currentEqBands,0);
 assert.throws(()=>f.archive.commit(),/explicit user action/);
 const result=f.archive.commit({userInitiated:true,confirmed:true});
 assert.equal(result.archived,true);
 assert.equal(result.resultStatus,'inconclusive');
 assert.equal(result.persistedOnDevice,true);
 assert.equal(result.audioStarted,false);
 assert.equal(result.legacyV2Touched,false);
 const saved=f.cat.load().catalog;
 assert.deepEqual(saved.devices.map(x=>x.id),['new-device']);
 assert.deepEqual(saved.profiles.map(x=>x.id),['new-profile']);
 assert.equal(saved.results.length,1);
 const record=saved.results[0];
 assert.equal(record.provenance,'experimental-tone-test');
 assert.equal(record.status,'inconclusive');
 assert.deepEqual(record.originalEq,[]);
 assert.deepEqual(record.currentEq,[]);
 assert.deepEqual(record.editHistory,[]);
 assert.equal(record.observations.length,9);
 assert.equal(record.observations[0].provenance,'user-response');
 assert.ok(saved.profiles[0].graphicEq.bands.every(b=>
  b.source==='provisional'&&b.verification==='unverified'));
 assert.equal(f.local.getItem('audiocal-hear-profiles-v1'),'KEEP_OLD');
});
test('cannot save the same preview twice; a duplicate result ID is rejected',async()=>{
 const f=fixture();await finish(f.exam);
 f.archive.preview(f.args);
 f.archive.commit({userInitiated:true,confirmed:true});
 assert.throws(()=>f.archive.commit({userInitiated:true,confirmed:true}),/Review/);
 assert.throws(()=>f.archive.preview(f.args),/Duplicate/);
 assert.equal(f.cat.load().catalog.results.length,1);
});
test('archive refuses stale catalog when another local write occurs after preview',async()=>{
 const f=fixture();await finish(f.exam);
 f.archive.preview(f.args);
 const cat=f.cat.load();
 f.cat.save({...cat.catalog,activeProfileId:null});
 assert.throws(()=>f.archive.commit({userInitiated:true,confirmed:true}),/changed since archive preview/);
 assert.equal(f.cat.load().catalog.results.length,0);
});
test('optimistic catalog save rejects known stale revisions',()=>{
 const f=fixture(),base=f.cat.load();
 f.cat.save(base.catalog,{expectedRevision:base.revision});
 assert.throws(()=>f.cat.save(base.catalog,{expectedRevision:base.revision}),/changed since it was read/);
});
test('archive detects changed exam responses after preview and never writes them',async()=>{
 const f=fixture();await finish(f.exam);
 let changed=false;
 const facade={
  snapshot:()=>f.exam.snapshot(),
  getSession:()=>{
   const session=f.exam.getSession();
   if(changed)session.observations[0].response='not-heard';
   return session;
  },
 };
 const transfer=createHear3AdaptiveCatalogArchive({catalogStore:f.cat,exam:facade});
 transfer.preview(f.args);
 changed=true;
 assert.throws(()=>transfer.commit({userInitiated:true,confirmed:true}),
  /disagree with the adaptive evidence/);
 assert.equal(f.cat.load().catalog.results.length,0);
});
test('archive refuses forged IDs, duplicate IDs, invalid device class and labels',async()=>{
 const f=fixture();await finish(f.exam);
 assert.throws(()=>f.archive.preview({...f.args,resultId:'<tag>'}),/unique device/);
 assert.throws(()=>f.archive.preview({...f.args,resultId:'new-profile'}),/IDs must differ/);
 assert.throws(()=>f.archive.preview({...f.args,category:'clinical-certified'}),/Unknown device category/);
 assert.throws(()=>f.archive.preview({...f.args,deviceName:'\u0001unsafe'}),/Invalid device label/);
 assert.equal(f.cat.load().catalog.devices.length,0);
});
test('archive warns about unverified persistent write rather than falsely confirming saving',async()=>{
 const f=fixture();await finish(f.exam);
 f.archive.preview(f.args);
 f.local.writable=false;
 const result=f.archive.commit({userInitiated:true,confirmed:true});
 assert.equal(result.archived,true);
 assert.equal(result.persistedOnDevice,false);
 assert.equal(result.durability,'volatile');
 assert.match(result.warning,/temporary memory/);
 assert.equal(f.local.getItem('audiocal-hear-profiles-v1'),null);
});
test('existing catalog entities remain unchanged when appending experimental archive',async()=>{
 const f=fixture();await finish(f.exam);
 const current=f.cat.load().catalog;
 current.devices.push({id:'existing-device',name:'Original',category:'speaker'});
 current.profiles.push({id:'existing-profile',deviceId:'existing-device',name:'Unmodified',
  graphicEq:{type:'graphic',deviceId:'existing-device',bands:[
   {id:'a',frequencyHz:125,source:'manual'},
   {id:'b',frequencyHz:1000,source:'manual'},
  ]}});
 current.results.push({id:'original-result',profileId:'existing-profile',
  capturedAt:1000,status:'inconclusive',provenance:'manual',
  originalEq:[],currentEq:[],observations:[],editHistory:[]});
 current.activeProfileId='existing-profile';
 f.cat.save(current);
 const old=f.cat.load().catalog;
 const archive=f.archive.preview(f.args);
 assert.equal(archive.existingResultsUnchanged,1);
 f.archive.commit({userInitiated:true,confirmed:true});
 const saved=f.cat.load().catalog;
 assert.deepEqual(saved.results[0],old.results[0]);
 assert.deepEqual(saved.profiles[0],old.profiles[0]);
 assert.equal(saved.activeProfileId,'existing-profile');
 assert.equal(saved.results.length,2);
});
