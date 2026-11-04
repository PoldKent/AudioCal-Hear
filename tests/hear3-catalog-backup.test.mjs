import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyHear3Catalog,validateHear3Catalog} from '../src/hear3/catalog-contract.mjs';
import {createHear3CatalogStore,createHear3CatalogBackupTransfer,CATALOG_BACKUP_FORMAT,MAX_CATALOG_JSON_CHARS}
  from '../src/hear3/catalog-backup-store.mjs';

class MemoryStorage {
  constructor(){this.records=new Map();this.failWrite=false;this.failRead=false;this.failDelete=false;}
  getItem(k){if(this.failRead)throw Error('Storage denied');return this.records.get(k)??null;}
  setItem(k,v){if(this.failWrite)throw Error('Quota exceeded');this.records.set(k,v);}
  removeItem(k){if(this.failDelete)throw Error('Deletion denied');this.records.delete(k);}
}

function catalog(suffix='1'){
  const did='device-'+suffix,pid='profile-'+suffix;
  return {
    catalogVersion:1,
    devices:[{id:did,name:'Auriculares '+suffix,category:'headphones'}],
    profiles:[{
      id:pid,deviceId:did,name:'Perfil '+suffix,
      graphicEq:{type:'graphic',deviceId:did,bands:[
        {id:'low',frequencyHz:125,source:'manual'},
        {id:'high',frequencyHz:8000,source:'manual'},
      ]},
    }],
    results:[{
      id:'result-'+suffix,profileId:pid,capturedAt:1790000000000,
      status:'provisional',provenance:'experimental-tone-test',
      originalEq:[{bandId:'low',gainDb:0},{bandId:'high',gainDb:0}],
      currentEq:[{bandId:'low',gainDb:1},{bandId:'high',gainDb:0}],
      observations:[{
        toneId:'tone1',frequencyHz:125,digitalLevelDbfs:-60,
        channel:'left',response:'heard',provenance:'user-response',
      }],
      editHistory:[{bandId:'low',fromGainDb:0,toGainDb:1,at:1790000000100}],
    }],
    activeProfileId:pid,
  };
}
function factory(device=new MemoryStorage(),tab=null){
  const store=createHear3CatalogStore({deviceStorage:device,tabStorage:tab});
  return {device,store,transfer:createHear3CatalogBackupTransfer({store})};
}
function exportedCatalog(suffix='1') {
  const a=factory();
  a.store.save(catalog(suffix));
  return a.store.exportBackup();
}

test('V3 catalogs preserve device/profile/result relationships, EQ provenance and edit history',()=>{
  const c=validateHear3Catalog(catalog());
  assert.equal(c.devices.length,1);
  assert.equal(c.profiles[0].graphicEq.bands.length,2);
  assert.equal(c.profiles[0].graphicEq.bands[0].source,'manual');
  assert.equal(c.results[0].originalEq[0].gainDb,0);
  assert.equal(c.results[0].currentEq[0].gainDb,1);
  assert.equal(c.results[0].editHistory[0].bandId,'low');
  assert.equal(c.results[0].observations[0].channel,'left');
  assert.equal(c.activeProfileId,'profile-1');
});

test('unknown record fields including photographs or unsupported audio metadata are rejected',()=>{
  const c=catalog();c.profiles[0].photoData='PRIVATE_IMAGE';
  assert.throws(()=>validateHear3Catalog(c),/Unknown profile fields/);
  delete c.profiles[0].photoData;
  c.results[0].secret='NEVER_PERSIST';
  assert.throws(()=>validateHear3Catalog(c),/Unknown result fields/);
});

test('catalog rejects duplicate identities and missing device/profile/band references',()=>{
  const c=catalog();c.devices.push({...c.devices[0]});
  assert.throws(()=>validateHear3Catalog(c),/Duplicate device/);
  c.devices.pop();
  c.profiles[0].deviceId='missing';
  assert.throws(()=>validateHear3Catalog(c),/missing device/);
  c.profiles[0].deviceId='device-1';
  c.results[0].profileId='unknown';
  assert.throws(()=>validateHear3Catalog(c),/missing profile/);
  c.results[0].profileId='profile-1';
  c.results[0].currentEq[0].bandId='different';
  assert.throws(()=>validateHear3Catalog(c),/missing or unordered band/);
});

test('inconclusive results cannot be archived as usable calculated EQ',()=>{
  const c=catalog();c.results[0].status='inconclusive';
  assert.throws(()=>validateHear3Catalog(c),/Inconclusive results/);
  c.results[0].originalEq=[];c.results[0].currentEq=[];
  assert.equal(validateHear3Catalog(c).results[0].status,'inconclusive');
});

test('unverified observation, illegal gains and unknown schema version fail closed',()=>{
  const c=catalog();
  c.results[0].observations[0].response='maybe';
  assert.throws(()=>validateHear3Catalog(c),/Invalid observation evidence/);
  c.results[0].observations[0].response='heard';
  c.results[0].originalEq[0].gainDb=100;
  assert.throws(()=>validateHear3Catalog(c),/Invalid stored EQ gain/);
  c.results[0].originalEq[0].gainDb=0;
  c.catalogVersion=999;
  assert.throws(()=>validateHear3Catalog(c),/Unsupported/);
});

test('catalog local save verifies readback, exports full structured and checksummed backup',()=>{
  const f=factory(),saved=f.store.save(catalog());
  assert.equal(saved.durability,'device-local');
  assert.equal(saved.persistedOnDevice,true);
  const loaded=f.store.load();
  assert.equal(loaded.revision,1);
  assert.equal(loaded.catalog.results.length,1);
  const exported=JSON.parse(f.store.exportBackup());
  assert.equal(exported.format,CATALOG_BACKUP_FORMAT);
  assert.match(exported.integrity.value,/^[0-9a-f]{8}$/);
  assert.equal(exported.catalog.results[0].editHistory.length,1);
});

test('preview only reads and explicit commit imports a complete catalog without audio',()=>{
  const f=factory(),raw=exportedCatalog();
  const p=f.transfer.preview(raw);
  assert.deepEqual([p.devices,p.profiles,p.results],[1,1,1]);
  assert.equal(f.device.records.size,0);
  assert.throws(()=>f.transfer.commit(),/explicit user action/);
  assert.equal(f.device.records.size,0);
  const commit=f.transfer.commit({userInitiated:true});
  assert.equal(commit.imported,true);
  assert.equal(commit.audioStarted,false);
  assert.equal(commit.persistedOnDevice,true);
  assert.equal(f.store.load().catalog.results[0].originalEq.length,2);
});

test('add-only import merges different device/profile/result sets without losing originals',()=>{
  const f=factory();
  f.store.save(catalog('1'));
  const preview=f.transfer.preview(exportedCatalog('2'));
  assert.equal(preview.mode,'merge-new');
  assert.deepEqual([preview.outputDevices,preview.outputProfiles,preview.outputResults],[2,2,2]);
  f.transfer.commit({userInitiated:true});
  const result=f.store.load().catalog;
  assert.deepEqual(result.devices.map(x=>x.id),['device-1','device-2']);
  assert.deepEqual(result.results.map(x=>x.id),['result-1','result-2']);
  assert.equal(result.activeProfileId,'profile-1');
});

test('add-only import refuses duplicate entity IDs even if their content is identical',()=>{
  const f=factory();f.store.save(catalog());
  assert.throws(()=>f.transfer.preview(exportedCatalog()),/Duplicate device/);
  assert.equal(f.store.load().catalog.results.length,1);
});

test('full replace requires separate confirmation and preserves data if declined',()=>{
  const f=factory();f.store.save(catalog('1'));
  const p=f.transfer.preview(exportedCatalog('2'),{mode:'replace'});
  assert.equal(p.replacesExisting,true);
  assert.throws(()=>f.transfer.commit({userInitiated:true}),/separate confirmation/);
  assert.equal(f.store.load().catalog.devices[0].id,'device-1');
  f.transfer.commit({userInitiated:true,confirmReplace:true});
  assert.equal(f.store.load().catalog.devices[0].id,'device-2');
  assert.equal(f.store.load().catalog.results[0].id,'result-2');
});

test('accidentally damaged JSON checksum is refused before any write',()=>{
  const f=factory();let b=JSON.parse(exportedCatalog());
  b.catalog.results[0].currentEq[0].gainDb=30;
  assert.throws(()=>f.transfer.preview(JSON.stringify(b)),/checksum mismatch/);
  assert.equal(f.store.load().revision,0);
});

test('unknown backup version and malicious extra root metadata cannot import',()=>{
  const f=factory();const b=JSON.parse(exportedCatalog());
  b.format='hear4-catalog';
  assert.throws(()=>f.transfer.preview(JSON.stringify(b)),/Unknown catalog backup/);
  b.format=CATALOG_BACKUP_FORMAT;b.telemetry='PRIVATE';
  assert.throws(()=>f.transfer.preview(JSON.stringify(b)),/Unknown catalog backup/);
});

test('stale preview is rejected even if a new save has identical entity contents',()=>{
  const f=factory();f.store.save(catalog('1'));
  f.transfer.preview(exportedCatalog('2'),{mode:'replace'});
  f.store.save(catalog('1')); // revision increment without content change
  assert.throws(()=>f.transfer.commit({userInitiated:true,confirmReplace:true}),/changed since preview/);
  assert.equal(f.store.load().catalog.devices[0].id,'device-1');
});

test('one damaged local copy cannot erase earlier intact full catalog',()=>{
  const f=factory();f.store.save(catalog('1'));f.store.save(catalog('2'));
  const broken=JSON.parse(f.device.getItem('hear3:catalog:v1:0'));
  broken.catalog.results[0].id='modified-without-checksum';
  f.device.setItem('hear3:catalog:v1:0',JSON.stringify(broken));
  const reloaded=factory(f.device);
  const result=reloaded.store.load();
  assert.equal(result.catalog.devices[0].id,'device-1');
  assert.ok(result.warnings.some(x=>x.includes('damaged')));
});

test('storage failures degrade to tab session or volatile export with honest durability',()=>{
  const device=new MemoryStorage(),tab=new MemoryStorage();
  device.failWrite=true;
  const f=factory(device,tab);
  assert.equal(f.store.save(catalog()).durability,'tab-session');
  assert.equal(f.store.load().persistedOnDevice,false);
  tab.failWrite=true;
  const s=f.store.save(catalog());
  assert.equal(s.durability,'volatile');
  assert.equal(s.persistedOnDevice,false);
  assert.equal(JSON.parse(f.store.exportBackup()).catalog.results.length,1);
});

test('damaged persistent copies are not silently overwritten and remain available for investigation',()=>{
  const device=new MemoryStorage();
  device.setItem('hear3:catalog:v1:0','{broken}');
  const f=factory(device);
  const saved=f.store.save(catalog());
  assert.equal(saved.durability,'volatile');
  assert.equal(device.getItem('hear3:catalog:v1:0'),'{broken}');
  assert.equal(f.store.load().catalog.profiles.length,1);
});

test('explicit scoped catalog deletion leaves legacy Hear 2.0 data intact',()=>{
  const device=new MemoryStorage();device.setItem('audiocal-hear-profiles-v1','legacy');
  const f=factory(device);f.store.save(catalog());
  assert.throws(()=>f.store.clear(),/Explicit/);
  assert.equal(f.store.clear({confirmed:true}).cleared,true);
  assert.equal(f.store.load().catalog.results.length,0);
  assert.equal(device.getItem('audiocal-hear-profiles-v1'),'legacy');
});

test('empty catalog exports and imports as schema v1 without invented devices',()=>{
  const f=factory();const empty=emptyHear3Catalog();
  f.store.save(empty);
  const b=f.store.exportBackup();
  const other=factory();
  other.transfer.preview(b);
  other.transfer.commit({userInitiated:true});
  assert.deepEqual(other.store.load().catalog,empty);
});

test('oversized import is refused without touching existing state',()=>{
  const f=factory();f.store.save(catalog());
  assert.throws(()=>f.transfer.preview(' '.repeat(MAX_CATALOG_JSON_CHARS+1)),/allowed size/);
  assert.equal(f.store.load().catalog.results.length,1);
});
