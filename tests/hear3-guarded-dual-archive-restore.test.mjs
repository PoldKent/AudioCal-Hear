import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3CatalogStore,createHear3CatalogBackupTransfer}
 from '../src/hear3/catalog-backup-store.mjs';
import {createHear3LosslessV2HistoryVault}
 from '../src/hear3/legacy-v2-history-vault.mjs';
import {createHear3GuardedDualRestore,HEAR3_DUAL_RESTORE_JOURNAL_KEY}
 from '../src/hear3/guarded-dual-archive-restore.mjs';
import {validateHear3Catalog} from '../src/hear3/catalog-contract.mjs';

class Storage{
 constructor(){this.data=new Map();this.blockedPrefixes=[];this.blockDelete=false;}
 getItem(k){return this.data.get(k)??null;}
 setItem(k,v){
  if(this.blockedPrefixes.some(prefix=>k.startsWith(prefix)))
   throw Error('Quota exceeded or interrupted write');
  this.data.set(k,v);
 }
 removeItem(k){
  if(this.blockDelete)throw Error('Delete blocked');
  this.data.delete(k);
 }
}
const catalog=id=>{
 const deviceId='device-'+id,profileId='profile-'+id;
 return {catalogVersion:1,
  devices:[{id:deviceId,name:'Equipo '+id,category:'headphones'}],
  profiles:[{id:profileId,deviceId,name:'Perfil '+id,
   graphicEq:{type:'graphic',deviceId,bands:[
    {id:'b125',frequencyHz:125,source:'manual'},
    {id:'b1000',frequencyHz:1000,source:'manual'},
   ]}}],
  results:[{id:'result-'+id,profileId,capturedAt:1790000000000,
   status:'provisional',provenance:'manual',
   originalEq:[{bandId:'b125',gainDb:0},{bandId:'b1000',gainDb:0}],
   currentEq:[{bandId:'b125',gainDb:1},{bandId:'b1000',gainDb:-1}],
   observations:[],editHistory:[]}],
  activeProfileId:profileId};
};
const v2=id=>JSON.stringify({app:'AudioCal Hear',version:1,profiles:[{
 id:'old-'+id,type:'headphones',name:'Viejo '+id,bands:[125,500,1000],
 measures:{'125|left':[{kind:'heard',db:-65,history:[-70,-60]}]},
 balance:{125:-2},manual:{500:1},privateOther:{kept:'opaque-'+id},
}]},null,2);
function site(storage=new Storage()){
 const store=createHear3CatalogStore({deviceStorage:storage,tabStorage:null});
 const vault=createHear3LosslessV2HistoryVault({storage});
 const coordinator={run:async(callback,{expectedRevision=null}={})=>{
  if(expectedRevision!==null&&store.load().revision!==expectedRevision)
   throw Error('Catalog changed in another tab; review again');
  return {response:await callback()};
 }};
 const create=()=>createHear3GuardedDualRestore({
  catalogStore:store,historyVault:vault,coordinator,journalStorage:storage,
 });
 return {storage,store,vault,create};
}
function seed(site,id){
 assert.equal(site.store.save(catalog(id)).persistedOnDevice,true);
 site.vault.preview(v2(id));
 site.vault.exportPending();
 assert.equal(site.vault.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true}).persistedOnDevice,true);
 return {catalogText:site.store.exportBackup(),historyText:site.vault.exportStored()};
}
function arm(engine,backup){
 const preflight=engine.preview({
  catalogBackupText:backup.catalogText,historyBackupText:backup.historyText,
 });
 const old3=engine.exportPreviousV3();
 const old2=engine.exportPreviousV2();
 return {preflight,old3,old2};
}
const consent={userInitiated:true,confirmBothReplacements:true,
 confirmRollbackDownloads:true};

test('dual restore requires two validated files, two prior backups and explicit consent',async()=>{
 const source=site(),destination=site();const a=seed(source,'source'),b=seed(destination,'before');
 const engine=destination.create();
 assert.equal(engine.status().state,'clear');
 const beforeKeys=JSON.stringify([...destination.storage.data]);
 const p=engine.preview({catalogBackupText:a.catalogText,historyBackupText:a.historyText});
 assert.equal(p.previewOnly,true);
 assert.equal(p.sourceV2HistoricalRecords,1);
 assert.equal(p.historicV2ConvertedIntoV3Results,0);
 assert.equal(JSON.stringify([...destination.storage.data]),beforeKeys);
 await assert.rejects(()=>engine.commit(consent),/Request both prior/);
 const b3=engine.exportPreviousV3();
 await assert.rejects(()=>engine.commit(consent),/Request both prior/);
 const b2=engine.exportPreviousV2();
 assert.deepEqual(JSON.parse(b3).catalog,JSON.parse(b.catalogText).catalog);
 assert.equal(b2,b.historyText);
 await assert.rejects(()=>engine.commit({userInitiated:true,
  confirmRollbackDownloads:true}),/Explicit consent/);
 const done=await engine.commit(consent);
 assert.equal(done.restored,true);
 assert.equal(done.journalCleared,true);
 assert.equal(done.atomicAcrossIndependentArchives,false);
 assert.equal(done.noAudioStarted,true);
 assert.equal(destination.storage.getItem(HEAR3_DUAL_RESTORE_JOURNAL_KEY),null);
 const reopened=site(destination.storage);
 assert.deepEqual(reopened.store.load().catalog,validateHear3Catalog(catalog('source')));
 assert.equal(reopened.vault.load().sourceText,v2('source'));
 assert.equal(reopened.create().status().state,'clear');
});

test('interrupted V2 stage keeps durable in-progress marker and rejects mixed-pair acknowledgement',async()=>{
 const from=site(),to=site();const a=seed(from,'new'),original=seed(to,'old');
 const engine=to.create();const prior=arm(engine,a);
 to.storage.blockedPrefixes=['hear3:v2-history:v1:'];
 await assert.rejects(()=>engine.commit(consent),/V2 restore is not device-persistent/);
 const next=site(to.storage);
 const state=next.create().status();
 assert.equal(state.state,'in-progress');
 assert.equal(state.requiresRecovery,true);
 assert.equal(state.coherentSnapshotVerified,false);
 assert.equal(state.matches,'mixed-or-unverified');
 assert.deepEqual(next.store.load().catalog,validateHear3Catalog(catalog('new')));
 assert.equal(next.vault.load().sourceText,v2('old'));
 assert.throws(()=>next.create().preview({
  catalogBackupText:a.catalogText,historyBackupText:a.historyText,
 }),/Unresolved dual-restore/);
 await assert.rejects(()=>next.create().acknowledgeCoherentRecovery({
  userInitiated:true,confirmed:true,
 }),/Recovery incomplete/);
 assert.ok(to.storage.getItem(HEAR3_DUAL_RESTORE_JOURNAL_KEY));
 // Manual two-file rollback on recovered storage, not automatic hidden writes.
 to.storage.blockedPrefixes=[];
 const transfer=createHear3CatalogBackupTransfer({store:next.store});
 transfer.preview(prior.old3,{mode:'replace'});
 assert.equal(transfer.commit({userInitiated:true,confirmReplace:true})
  .persistedOnDevice,true);
 const oldSource=JSON.parse(prior.old2);
 next.vault.previewPackage(prior.old2);
 assert.equal(next.vault.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true,confirmOverwrite:true})
  .persistedOnDevice,true);
 assert.equal(next.vault.load().sourceText,v2('old'));
 assert.equal(oldSource.sourceText,v2('old'));
 const verified=next.create().status();
 assert.equal(verified.coherentSnapshotVerified,true);
 assert.equal(verified.matches,'previous-baseline');
 assert.equal((await next.create().acknowledgeCoherentRecovery({
  userInitiated:true,confirmed:true,
 })).acknowledged,true);
 assert.equal(next.create().status().state,'clear');
 assert.equal(original.historyText,next.vault.exportStored());
});

test('failed V3 write never attempts V2 and keeps baseline recoverable after reload',async()=>{
 const source=site(),target=site();const a=seed(source,'a');seed(target,'b');
 const engine=target.create();arm(engine,a);
 target.storage.blockedPrefixes=['hear3:catalog:v1:'];
 await assert.rejects(()=>engine.commit(consent),/V3 restore is not device-persistent/);
 const reopened=site(target.storage);
 assert.deepEqual(reopened.store.load().catalog,validateHear3Catalog(catalog('b')));
 assert.equal(reopened.vault.load().sourceText,v2('b'));
 assert.equal(reopened.create().status().matches,'previous-baseline');
 target.storage.blockedPrefixes=[];
 assert.equal((await reopened.create().acknowledgeCoherentRecovery({
  userInitiated:true,confirmed:true,
 })).acknowledged,true);
});

test('stale V2 vault revision blocks joint restore before any journal mutation',async()=>{
 const src=site(),dst=site();const b=seed(src,'source');seed(dst,'old');
 const runner=dst.create();arm(runner,b);
 const competing=createHear3LosslessV2HistoryVault({storage:dst.storage});
 competing.preview(v2('other'));competing.exportPending();
 competing.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true,confirmOverwrite:true});
 await assert.rejects(()=>runner.commit(consent),/sources changed since preview/);
 assert.equal(dst.storage.getItem(HEAR3_DUAL_RESTORE_JOURNAL_KEY),null);
 assert.deepEqual(dst.store.load().catalog,validateHear3Catalog(catalog('old')));
 assert.equal(dst.vault.load().sourceText,v2('other'));
});

test('corrupted input or journal fails closed and does not mutate archives',async()=>{
 const src=site(),dst=site();const a=seed(src,'new');seed(dst,'old');
 const damaged=JSON.parse(a.historyText);
 damaged.sourceText=damaged.sourceText.replace('-65','-15');
 const service=dst.create();
 assert.throws(()=>service.preview({
  catalogBackupText:a.catalogText,historyBackupText:JSON.stringify(damaged),
 }),/Damaged V2 history/);
 assert.equal(dst.storage.getItem(HEAR3_DUAL_RESTORE_JOURNAL_KEY),null);
 dst.storage.setItem(HEAR3_DUAL_RESTORE_JOURNAL_KEY,'{broken}');
 assert.throws(()=>dst.create().status(),/Damaged dual-restore journal/);
 assert.throws(()=>dst.create().preview({
  catalogBackupText:a.catalogText,historyBackupText:a.historyText,
 }),/Damaged dual-restore journal/);
 assert.deepEqual(dst.store.load().catalog,validateHear3Catalog(catalog('old')));
 assert.equal(dst.vault.load().sourceText,v2('old'));
});

test('missing durable old history or unwritable marker rejects restoration without mutations',async()=>{
 const src=site(),empty=site();const a=seed(src,'source');
 empty.store.save(catalog('blank'));
 assert.throws(()=>empty.create().preview({
  catalogBackupText:a.catalogText,historyBackupText:a.historyText,
 }),/Both existing V3 catalog and V2 historic vault/);
 const dst=site();seed(dst,'old');
 const service=dst.create();arm(service,a);
 dst.storage.blockedPrefixes=[HEAR3_DUAL_RESTORE_JOURNAL_KEY];
 await assert.rejects(()=>service.commit(consent),/Cannot persist dual-restore recovery marker/);
 assert.deepEqual(dst.store.load().catalog,validateHear3Catalog(catalog('old')));
 assert.equal(dst.vault.load().sourceText,v2('old'));
});

test('when marker removal is blocked, completed pair is recognizable and explicitly clearable',async()=>{
 const src=site(),dst=site();const a=seed(src,'new');seed(dst,'old');
 const engine=dst.create();arm(engine,a);
 dst.storage.blockDelete=true;
 const result=await engine.commit(consent);
 assert.equal(result.restored,true);
 assert.equal(result.journalCleared,false);
 const state=dst.create().status();
 assert.equal(state.state,'completed');
 assert.equal(state.matches,'restored-target');
 dst.storage.blockDelete=false;
 assert.equal((await dst.create().acknowledgeCoherentRecovery({
  userInitiated:true,confirmed:true,
 })).matches,'restored-target');
 assert.equal(dst.create().status().state,'clear');
});
