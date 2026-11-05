import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createHear3ScopedStorageCleanup,HEAR_STORAGE_V3_PHRASE,HEAR_STORAGE_ERASE_PHRASE,
} from '../src/hear3/scoped-storage-cleanup.mjs';

class Store{
 constructor(entries={}){this.values=new Map(Object.entries(entries));this.block=false;this.failKey=null;}
 get length(){if(this.block)throw Error('blocked');return this.values.size;}
 key(i){if(this.block)throw Error('blocked');return [...this.values.keys()][i]??null;}
 getItem(k){if(this.block)throw Error('blocked');return this.values.get(k)??null;}
 setItem(k,v){this.values.set(k,v);}
 removeItem(k){if(this.block||this.failKey===k)throw Error('blocked');this.values.delete(k);}
}
function fixture(){
 const local=new Store({
  'audiocal-hear-profiles-v1':'V2-JSON',
  'audiocal-hear-active-v1':'old-profile',
  'audiocal-language-v1':'es',
  'hear3:catalog:v1:0':'CATALOG-A',
  'hear3:catalog:v1:1':'CATALOG-B',
  'hear3:adaptive-progress:old:0':'ADAPTIVE',
  'hear3:exam-checkpoint:old:1':'TONE',
  'third-party-privacy':'KEEP',
  'hear3:other:external':'KEEP',
  'hear3:catalog:v1:settings':'KEEP',
 });
 const tab=new Store({
  'hear3:catalog:v1:0':'TAB-CATALOG',
  'other-app-session':'KEEP',
 });
 return {local,tab,cleanup:createHear3ScopedStorageCleanup({
  deviceStorage:local,tabStorage:tab,
 })};
}

test('inspection is read-only and shows exact scoped counts without leaking data',()=>{
 const f=fixture();
 const before=[...f.local.values];
 const s=f.cleanup.inspect();
 assert.equal(s.scope,'v3-only');
 assert.equal(s.deviceLocal.v3Catalog,2);
 assert.equal(s.deviceLocal.v3Exams,2);
 assert.equal(s.deviceLocal.v2,0);
 assert.equal(s.tabSession.v3Catalog,1);
 assert.equal(s.allKnownEntries,5);
 assert.equal(s.downloadedBackupsTouched,false);
 assert.equal(s.unknownStorageTouched,false);
 assert.equal(s.imageDatabaseTouched,false);
 assert.deepEqual([...f.local.values],before);
 assert.equal(JSON.stringify(s).includes('V2-JSON'),false);
});
test('V3-only explicit cleanup preserves every V2 and other-party origin key',()=>{
 const f=fixture();
 f.cleanup.inspect();
 assert.throws(()=>f.cleanup.commit(),/Explicit/);
 assert.throws(()=>f.cleanup.commit({userInitiated:true,confirmed:true,phrase:'ERASE ALL'}),
  /exact deletion phrase/);
 const outcome=f.cleanup.commit({userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_V3_PHRASE});
 assert.equal(outcome.cleared,true);
 assert.equal(outcome.attempted,5);
 assert.equal(f.local.getItem('audiocal-hear-profiles-v1'),'V2-JSON');
 assert.equal(f.local.getItem('audiocal-hear-active-v1'),'old-profile');
 assert.equal(f.local.getItem('audiocal-language-v1'),'es');
 assert.equal(f.local.getItem('third-party-privacy'),'KEEP');
 assert.equal(f.local.getItem('hear3:other:external'),'KEEP');
 assert.equal(f.local.getItem('hear3:catalog:v1:settings'),'KEEP');
 assert.equal(f.tab.getItem('other-app-session'),'KEEP');
 assert.equal(f.local.getItem('hear3:catalog:v1:0'),null);
 assert.equal(f.local.getItem('hear3:adaptive-progress:old:0'),null);
 assert.throws(()=>f.cleanup.commit({userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_V3_PHRASE}),/Preview/);
});
test('all-hear explicitly includes known three V2 keys and never a foreign key',()=>{
 const f=fixture();
 const s=f.cleanup.inspect({scope:'all-hear'});
 assert.equal(s.deviceLocal.v2,3);
 assert.equal(s.allKnownEntries,8);
 assert.equal(s.includesHear2,true);
 assert.equal(s.confirmationPhrase,HEAR_STORAGE_ERASE_PHRASE);
 const r=f.cleanup.commit({userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_ERASE_PHRASE});
 assert.equal(r.cleared,true);
 assert.equal(f.local.getItem('audiocal-hear-profiles-v1'),null);
 assert.equal(f.local.getItem('audiocal-hear-active-v1'),null);
 assert.equal(f.local.getItem('audiocal-language-v1'),null);
 assert.equal(f.local.getItem('third-party-privacy'),'KEEP');
 assert.equal(f.tab.getItem('other-app-session'),'KEEP');
});
test('new target key between preview and commit aborts without deleting anything',()=>{
 const f=fixture();
 f.cleanup.inspect();
 f.local.setItem('hear3:adaptive-progress:new-profile:1','FUTURE');
 assert.throws(()=>f.cleanup.commit({
  userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_V3_PHRASE,
 }),/changed since preview/);
 assert.equal(f.local.getItem('hear3:catalog:v1:0'),'CATALOG-A');
 assert.equal(f.local.getItem('hear3:adaptive-progress:new-profile:1'),'FUTURE');
});
test('changed key value after preview aborts without touching current state',()=>{
 const f=fixture();
 f.cleanup.inspect();
 f.local.setItem('hear3:catalog:v1:0','NEW-CATALOG');
 assert.throws(()=>f.cleanup.commit({
  userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_V3_PHRASE,
 }),/changed since preview/);
 assert.equal(f.local.getItem('hear3:catalog:v1:0'),'NEW-CATALOG');
});
test('blocked source disallows claiming verified complete cleanup',()=>{
 const f=fixture();
 f.tab.block=true;
 const s=f.cleanup.inspect({scope:'all-hear'});
 assert.equal(s.unreadableScopes,1);
 assert.ok(s.warnings[0].includes('blocked'));
 assert.throws(()=>f.cleanup.commit({
  userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_ERASE_PHRASE,
 }),/could not be inspected/);
 assert.equal(f.local.getItem('audiocal-hear-profiles-v1'),'V2-JSON');
});
test('removeItem denial reports partial cleanup and does not claim success',()=>{
 const f=fixture();
 f.local.failKey='hear3:catalog:v1:0';
 f.cleanup.inspect();
 const outcome=f.cleanup.commit({
  userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_V3_PHRASE,
 });
 assert.equal(outcome.cleared,false);
 assert.equal(outcome.failedDeletions,1);
 assert.equal(outcome.remainingEntries,1);
 assert.equal(f.local.getItem('hear3:catalog:v1:0'),'CATALOG-A');
 assert.equal(f.local.getItem('third-party-privacy'),'KEEP');
});
test('does not match arbitrary profile prefixes, invalid ids, or unlisted photo keys',()=>{
 const f=fixture();
 f.local.setItem('hear3:adaptive-progress:wrong profile:0','KEEP');
 f.local.setItem('hear3:adaptive-progress:x:2','KEEP');
 f.local.setItem('hear3:photo:photo-1','KEEP');
 f.local.setItem('hear3:catalog:v2:0','KEEP');
 f.cleanup.inspect({scope:'all-hear'});
 f.cleanup.commit({userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_ERASE_PHRASE});
 for(const k of ['hear3:adaptive-progress:wrong profile:0','hear3:adaptive-progress:x:2',
  'hear3:photo:photo-1','hear3:catalog:v2:0']){
  assert.equal(f.local.getItem(k),'KEEP');
 }
});
test('discard prevents late commit even after an authorized preview',()=>{
 const f=fixture();
 f.cleanup.inspect({scope:'all-hear'});
 f.cleanup.discard();
 assert.throws(()=>f.cleanup.commit({
  userInitiated:true,confirmed:true,phrase:HEAR_STORAGE_ERASE_PHRASE,
 }),/Preview/);
 assert.equal(f.local.getItem('audiocal-language-v1'),'es');
});
