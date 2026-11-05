import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3CatalogStore,createHear3CatalogBackupTransfer}
 from '../src/hear3/catalog-backup-store.mjs';
import {createHear3CatalogDeletion}
 from '../src/hear3/catalog-selective-deletion.mjs';
import {createHear2MigrationTransfer}
 from '../src/hear3/legacy-v2-migration.mjs';

class Storage{
 constructor(){this.records=new Map();}
 getItem(k){return this.records.get(k)??null;}
 setItem(k,v){this.records.set(k,v);}
 removeItem(k){this.records.delete(k);}
}
function catalog(...ids){
 return {catalogVersion:1,
  devices:ids.map(id=>({id,name:'Device '+id,category:'headphones'})),
  profiles:[],results:[],activeProfileId:null};
}
function fresh(){
 return createHear3CatalogStore({deviceStorage:new Storage(),tabStorage:null});
}
function withConflict(store,concurrent){
 let loads=0;
 return {
  load(){
   const old=store.load();
   if(++loads===2)store.save(concurrent); // between final read and CAS write
   return old;
  },
  save:(value,options)=>store.save(value,options),
 };
}
test('backup replace rejects commit-time write conflict after successful preview recheck',()=>{
 const store=fresh();
 store.save(catalog('before'));
 const other=fresh();
 other.save(catalog('from-backup'));
 const facade=withConflict(store,catalog('concurrent'));
 const transfer=createHear3CatalogBackupTransfer({store:facade});
 transfer.preview(other.exportBackup(),{mode:'replace'});
 assert.throws(()=>transfer.commit({userInitiated:true,confirmReplace:true}),
  /Catalog changed since it was read/);
 assert.deepEqual(store.load().catalog.devices.map(x=>x.id),['concurrent']);
});
test('selective deletion rejects commit-time write conflict and preserves concurrent records',()=>{
 const store=fresh();
 store.save(catalog('keep','remove'));
 const facade=withConflict(store,catalog('concurrent','remove'));
 const deletion=createHear3CatalogDeletion({store:facade});
 deletion.preview({kind:'device',id:'remove'});
 assert.throws(()=>deletion.commit({userInitiated:true,confirmed:true}),
  /Catalog changed since it was read/);
 assert.deepEqual(store.load().catalog.devices.map(x=>x.id),['concurrent','remove']);
});
test('V2 metadata import rejects commit-time write conflict without modifying V2 original',()=>{
 const store=fresh(),source=JSON.stringify([{
  id:'legacy-id',name:'Legacy phone',type:'headphones',bands:[125,1000],
 }]);
 const original={profilesRaw:source,activeProfileId:'legacy-id'};
 const facade=withConflict(store,catalog('new-during-import'));
 const migration=createHear2MigrationTransfer({store:facade,readLegacy:()=>original});
 const preview=migration.preview();
 assert.equal(preview.mappedResults,0);
 const backup=migration.exportLegacyArchive();
 assert.equal(JSON.parse(backup).profilesRaw,source);
 assert.throws(()=>migration.commit({
  userInitiated:true,confirmBackupExported:true,
 }),/Catalog changed since it was read/);
 assert.deepEqual(store.load().catalog.devices.map(x=>x.id),['new-during-import']);
 assert.equal(original.profilesRaw,source);
});
test('unchanged catalog flows remain permitted and preserve recorded revision',()=>{
 const store=fresh();
 store.save(catalog('one','two'));
 const deletion=createHear3CatalogDeletion({store});
 const preview=deletion.preview({kind:'device',id:'two'});
 assert.equal(preview.removedDevices,1);
 const outcome=deletion.commit({userInitiated:true,confirmed:true});
 assert.equal(outcome.persistedOnDevice,true);
 assert.equal(store.load().revision,2);
 assert.deepEqual(store.load().catalog.devices.map(x=>x.id),['one']);
});
