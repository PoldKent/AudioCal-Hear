import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear2MigrationTransfer,LEGACY_ARCHIVE_FORMAT}
 from '../src/hear3/legacy-v2-migration.mjs';
import {createHear3CatalogStore} from '../src/hear3/catalog-backup-store.mjs';
import {checkpointFingerprint} from '../src/hear3/local-checkpoint-store.mjs';

class Storage{
 constructor(){this.records=new Map();}
 getItem(k){return this.records.get(k)??null;}
 setItem(k,v){this.records.set(k,v);}
 removeItem(k){this.records.delete(k);}
}
const oldProfile=(id='old')=>({
 id,name:'Audífonos V2',type:'headphones',bands:[125,250,500,1000],
 measures:{'500|left':[{kind:'heard',db:-53,confidence:'low'}]},
 manual:{500:2},balance:{250:-1},channels:'separate',
});
function environment(raw){
 const currentSource={profilesRaw:raw,activeProfileId:''};
 const old=new Storage(),v3=new Storage();
 old.setItem('audiocal-hear-profiles-v1','EXISTING_V2_UNTOUCHED');
 const store=createHear3CatalogStore({deviceStorage:v3,tabStorage:null});
 const transfer=createHear2MigrationTransfer({store,readLegacy:()=>currentSource});
 return {currentSource,old,v3,store,transfer};
}
test('official Hear 2.0 export retains identical original text, fields and unverified results',()=>{
 const raw=JSON.stringify({app:'AudioCal Hear',version:1,
  profiles:[oldProfile()]},null,2);
 const f=environment(raw);
 const preview=f.transfer.preview();
 assert.equal(preview.sourceFormat,'hear2-official-export-v1');
 assert.equal(preview.sourceProfiles,1);
 assert.equal(preview.mappedResults,0);
 assert.equal(preview.unmigratedMeasurementRecords,1);
 assert.equal(f.store.load().catalog.devices.length,0);
 const archive=JSON.parse(f.transfer.exportLegacyArchive());
 assert.equal(archive.format,LEGACY_ARCHIVE_FORMAT);
 assert.equal(archive.profilesRaw,raw);
 assert.equal(JSON.parse(archive.profilesRaw).profiles[0].measures['500|left'][0].db,-53);
 assert.equal(JSON.parse(archive.profilesRaw).profiles[0].manual[500],2);
 assert.equal(archive.activeProfileId,'');
 const unsigned={format:archive.format,sourceKey:archive.sourceKey,
  activeKey:archive.activeKey,profilesRaw:archive.profilesRaw,
  activeProfileId:archive.activeProfileId};
 assert.equal(archive.integrity.value,checkpointFingerprint(JSON.stringify(unsigned)));
 assert.throws(()=>f.transfer.commit({userInitiated:true}),/confirm separate preservation/);
 assert.equal(f.store.load().revision,0);
 const saved=f.transfer.commit({userInitiated:true,confirmBackupExported:true});
 assert.equal(saved.persistedOnDevice,true);
 assert.equal(saved.originalV2StorageUnchanged,true);
 assert.equal(saved.migratedHistoricalResults,false);
 const c=f.store.load().catalog;
 assert.equal(c.devices.length,1);
 assert.equal(c.profiles.length,1);
 assert.equal(c.results.length,0);
 assert.equal(c.activeProfileId,null);
 assert.deepEqual(c.profiles[0].graphicEq.bands.map(b=>b.frequencyHz),
  [125,250,500,1000]);
 assert.ok(c.profiles[0].graphicEq.bands.every(b=>b.verification==='unverified'));
 assert.equal(f.old.getItem('audiocal-hear-profiles-v1'),'EXISTING_V2_UNTOUCHED');
});
test('V2 local-storage JSON array remains accepted for the existing browser import',()=>{
 const f=environment(JSON.stringify([oldProfile()]));
 assert.equal(f.transfer.preview().sourceFormat,'local-storage-array');
 assert.equal(f.transfer.commit({userInitiated:true,confirmBackupExported:true}).persistedOnDevice,true);
});
test('unknown export wrappers cannot be mistaken for a trusted Hear V2 export',()=>{
 const cases=[
  {app:'Other',version:1,profiles:[oldProfile()]},
  {app:'AudioCal Hear',version:2,profiles:[oldProfile()]},
  {app:'AudioCal Hear',version:1,profiles:'not-an-array'},
  {app:'AudioCal Hear',version:1,profiles:[{...oldProfile(),bands:[500,125]}]},
 ];
 for(const input of cases){
  const f=environment(JSON.stringify(input));
  assert.throws(()=>f.transfer.preview(),/Invalid legacy|invalid or unsorted/);
  assert.equal(f.store.load().revision,0);
 }
});
test('a changed official exported file snapshot invalidates its earlier review',()=>{
 const raw=JSON.stringify({app:'AudioCal Hear',version:1,profiles:[oldProfile()]});
 const f=environment(raw);
 f.transfer.preview();
 f.currentSource.profilesRaw=JSON.stringify({
  app:'AudioCal Hear',version:1,profiles:[oldProfile('altered')],
 });
 assert.throws(()=>f.transfer.commit({userInitiated:true,confirmBackupExported:true}),
  /Legacy Hear 2.0 data changed since preview/);
 assert.equal(f.store.load().revision,0);
});
test('official export rejects duplicate IDs, preserving unrelated existing V3 catalog',()=>{
 const f=environment(JSON.stringify({app:'AudioCal Hear',version:1,
  profiles:[oldProfile(),oldProfile()]}));
 f.store.save({catalogVersion:1,
  devices:[{id:'device-existing',name:'Existente',category:'headphones'}],
  profiles:[],results:[],activeProfileId:null});
 assert.throws(()=>f.transfer.preview(),/Duplicate legacy profile/);
 assert.deepEqual(f.store.load().catalog.devices.map(d=>d.id),['device-existing']);
});
