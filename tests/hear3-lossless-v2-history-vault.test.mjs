import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3LosslessV2HistoryVault,exportHear3LosslessV2History,
 importHear3LosslessV2History,HEAR3_V2_VAULT_FORMAT,HEAR3_V2_VAULT_KEY}
 from '../src/hear3/legacy-v2-history-vault.mjs';
class Storage{
 constructor(){this.items=new Map();this.throwOnWrite=false;}
 getItem(k){return this.items.get(k)??null;}
 setItem(k,v){if(this.throwOnWrite)throw Error('Quota exceeded');this.items.set(k,v);}
 removeItem(k){this.items.delete(k);}
}
const source=(suffix='a')=>JSON.stringify({app:'AudioCal Hear',version:1,
 profiles:[{
  id:'v2-'+suffix,name:'Old Headphones',type:'headphones',bands:[125,500,1000],
  measures:{'500|left':[{kind:'heard',db:-59,history:[{db:-65,heard:false}]}],
   '1000|right':[{kind:'timeout',db:null}]},
  manual:{500:2},balance:{500:-1},sweepRecords:{both:{events:[{hz:350,heard:true}]}},
  privateUnrecognizedField:{nested:[42,'keep-all-bytes']},
 }]},null,2);
test('V2 official JSON migrates every original historical field verbatim into isolated legacy vault',()=>{
 const s=new Storage(),v=createHear3LosslessV2HistoryVault({storage:s});
 const raw=source();
 const p=v.preview(raw);
 assert.equal(p.completeOpaqueLegacyRecordsPreserved,true);
 assert.equal(p.historicalRecords,2);
 assert.equal(p.migratedAsV3ClinicalResults,0);
 assert.equal(v.load().available,false);
 const exact=importHear3LosslessV2History(v.exportPending());
 assert.equal(exact.sourceText,raw);
 assert.deepEqual(JSON.parse(exact.sourceText).profiles[0].privateUnrecognizedField,
  {nested:[42,'keep-all-bytes']});
 assert.throws(()=>v.commit({userInitiated:true,confirmed:true}),
  /Preserve the complete/);
 const saved=v.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true});
 assert.equal(saved.persistedOnDevice,true);
 assert.equal(saved.v3ClinicalResultsCreated,0);
 assert.equal(saved.legacyV2SourceModified,false);
 const reloaded=createHear3LosslessV2HistoryVault({storage:s});
 assert.equal(reloaded.load().sourceText,raw);
 assert.equal(reloaded.load().summary.profiles[0].historicalRecordCount,2);
 assert.equal(importHear3LosslessV2History(reloaded.exportStored()).sourceText,raw);
 assert.equal(s.getItem('audiocal-hear-profiles-v1'),null);
});
test('local V2 array is imported without rewriting fields or channel records',()=>{
 const raw=JSON.stringify([JSON.parse(source()).profiles[0]]);
 const v=createHear3LosslessV2HistoryVault({storage:new Storage()});
 const p=v.preview(raw,{activeProfileId:'v2-a'});
 assert.equal(p.sourceFormat,'local-storage-array');
 const doc=JSON.parse(v.exportPending());
 assert.equal(doc.format,HEAR3_V2_VAULT_FORMAT);
 assert.equal(doc.sourceText,raw);
 assert.equal(doc.activeProfileId,'v2-a');
});
test('portable package integrity catches changed history, V2 export version and format',()=>{
 const original=exportHear3LosslessV2History(source());
 const altered=JSON.parse(original);
 altered.sourceText=altered.sourceText.replace('-59','-29');
 assert.throws(()=>importHear3LosslessV2History(JSON.stringify(altered)),/Damaged V2 history/);
 assert.throws(()=>exportHear3LosslessV2History(JSON.stringify({
  app:'AudioCal Hear',version:3,profiles:[],
 })),/Unrecognized/);
 const wrapped={format:'different',sourceText:source(),activeProfileId:''};
 assert.throws(()=>importHear3LosslessV2History(JSON.stringify(wrapped)),/Unknown lossless/);
});
test('import into a second browser retains all V2 evidence without creating clinical results',()=>{
 const first=createHear3LosslessV2HistoryVault({storage:new Storage()});
 first.preview(source('second'));
 const archive=first.exportPending();
 const second=createHear3LosslessV2HistoryVault({storage:new Storage()});
 assert.equal(second.previewPackage(archive).historicalRecords,2);
 const result=second.commit({userInitiated:true,confirmed:true,confirmSourceBackupExported:true});
 assert.equal(result.v3ClinicalResultsCreated,0);
 assert.equal(second.load().sourceText,source('second'));
});
test('stale local revision is rejected and existing history preserved',()=>{
 const storage=new Storage();
 const a=createHear3LosslessV2HistoryVault({storage});
 const b=createHear3LosslessV2HistoryVault({storage});
 a.preview(source('old'));
 b.preview(source('new'));
 a.commit({userInitiated:true,confirmed:true,confirmSourceBackupExported:true});
 assert.throws(()=>b.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true}),/changed since preview/);
 assert.equal(a.load().sourceText,source('old'));
});
test('overwriting old history requires separate explicit confirmation',()=>{
 const storage=new Storage(),v=createHear3LosslessV2HistoryVault({storage});
 v.preview(source('old'));
 v.commit({userInitiated:true,confirmed:true,confirmSourceBackupExported:true});
 const next=v.preview(source('new'));
 assert.equal(next.replacesExisting,true);
 assert.throws(()=>v.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true}),/replacement confirmation/);
 v.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true,confirmOverwrite:true});
 assert.equal(v.load().sourceText,source('new'));
});
test('storage quota failure is explicitly volatile, never claims durable restoration',()=>{
 const storage=new Storage();storage.throwOnWrite=true;
 const v=createHear3LosslessV2HistoryVault({storage});
 v.preview(source());
 const result=v.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true});
 assert.equal(result.persistedOnDevice,false);
 assert.equal(v.load().persistedOnDevice,false);
 assert.equal(v.load().sourceText,source());
 assert.ok(result.warning.includes('volatile'));
});
test('corrupt copied vault stays untouched and never silently overwritten',()=>{
 const storage=new Storage();
 storage.setItem(HEAR3_V2_VAULT_KEY+':1','{broken}');
 const v=createHear3LosslessV2HistoryVault({storage});
 assert.ok(v.load().warnings.some(x=>x.includes('damaged')));
 v.preview(source());
 const result=v.commit({userInitiated:true,confirmed:true,
  confirmSourceBackupExported:true});
 assert.equal(result.persistedOnDevice,true);
 assert.equal(storage.getItem(HEAR3_V2_VAULT_KEY+':1'),'{broken}');
});
test('malformed V2 measurements remain opaque; invalid profile frequencies block import',()=>{
 const doc=JSON.parse(source());
 doc.profiles[0].measures['broken-record']=[{kind:'unknown',data:{gps:'never convert'}}];
 const v=createHear3LosslessV2HistoryVault({storage:new Storage()});
 const p=v.preview(JSON.stringify(doc));
 assert.equal(p.historicalRecords,3);
 const archive=v.exportPending();
 assert.equal(importHear3LosslessV2History(archive).summary.profiles[0].unclassifiedRecordCount,1);
 doc.profiles[0].bands=[1000,500];
 assert.throws(()=>v.preview(JSON.stringify(doc)),/ordering or units/);
});
