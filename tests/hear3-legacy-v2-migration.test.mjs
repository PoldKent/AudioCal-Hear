import test from 'node:test';
import assert from 'node:assert/strict';
import { createHear2MigrationTransfer, LEGACY_ARCHIVE_FORMAT, LEGACY_V2_SOURCE_KEY }
  from '../src/hear3/legacy-v2-migration.mjs';
import { createHear3CatalogStore } from '../src/hear3/catalog-backup-store.mjs';
import { checkpointFingerprint } from '../src/hear3/local-checkpoint-store.mjs';

class Storage {
  constructor() { this.values=new Map(); this.failWrite=false; }
  getItem(k) { return this.values.get(k)??null; }
  setItem(k,v) { if(this.failWrite)throw Error('storage denied'); this.values.set(k,v); }
  removeItem(k) { this.values.delete(k); }
}
const legacyProfile=(id='old-id',overrides={})=>({
  id,name:'Audífonos de prueba',type:'headphones',bands:[125,250,500,1000],
  preset:'custom',measures:{
    '125|left':[{kind:'heard',db:-60,confidence:'low'},{kind:'unheard',db:null}],
    '250|right':[{kind:'timeout',db:null}],
  },
  manual:{125:3},balance:{1000:-1},taste:{bass:2},
  context:{subtype:'inear',seal:'unknown'},sweepRecords:{},
  updatedAt:1790000000000,
  ...overrides,
});
function setup(profiles=[legacyProfile()],activeProfileId='old-id'){
  const legacyStorage=new Storage(),newStorage=new Storage();
  legacyStorage.setItem(LEGACY_V2_SOURCE_KEY,JSON.stringify(profiles));
  legacyStorage.setItem('audiocal-hear-active-v1',activeProfileId);
  const store=createHear3CatalogStore({deviceStorage:newStorage,tabStorage:null});
  const transfer=createHear2MigrationTransfer({
    store,
    readLegacy:()=>({
      profilesRaw:legacyStorage.getItem(LEGACY_V2_SOURCE_KEY),
      activeProfileId:legacyStorage.getItem('audiocal-hear-active-v1'),
    }),
  });
  return {legacyStorage,newStorage,store,transfer};
}

test('legacy V2 preview is read-only and preserves every original field in the archive',()=>{
  const f=setup();
  const original=f.legacyStorage.getItem(LEGACY_V2_SOURCE_KEY);
  const proposal=f.transfer.preview();
  assert.equal(proposal.sourceProfiles,1);
  assert.equal(proposal.mappedProfiles,1);
  assert.equal(proposal.mappedResults,0);
  assert.equal(proposal.unmigratedMeasurementRecords,3);
  assert.equal(proposal.requiresBackupExport,true);
  const archive=JSON.parse(f.transfer.exportLegacyArchive());
  assert.equal(archive.format,LEGACY_ARCHIVE_FORMAT);
  assert.equal(archive.sourceKey,LEGACY_V2_SOURCE_KEY);
  assert.equal(archive.profilesRaw,original);
  assert.equal(archive.activeProfileId,'old-id');
  const payload={format:archive.format,sourceKey:archive.sourceKey,activeKey:archive.activeKey,
    profilesRaw:archive.profilesRaw,activeProfileId:archive.activeProfileId};
  assert.equal(archive.integrity.value,checkpointFingerprint(JSON.stringify(payload)));
  assert.deepEqual(JSON.parse(archive.profilesRaw)[0].measures,legacyProfile().measures);
  assert.equal(f.newStorage.values.size,0);
  assert.equal(f.legacyStorage.getItem(LEGACY_V2_SOURCE_KEY),original);
});

test('requires explicit user action and separate acknowledgment of legacy archive export',()=>{
  const f=setup();f.transfer.preview();
  assert.throws(()=>f.transfer.commit(),/explicit user action/);
  assert.throws(()=>f.transfer.commit({userInitiated:true}),/preservation\/export/);
  assert.equal(f.store.load().catalog.profiles.length,0);
  const result=f.transfer.commit({userInitiated:true,confirmBackupExported:true});
  assert.equal(result.migratedProfileMetadata,true);
  assert.equal(result.migratedHistoricalResults,false);
  assert.equal(result.originalV2StorageUnchanged,true);
  assert.equal(result.persistedOnDevice,true);
  const c=f.store.load().catalog;
  assert.equal(c.devices.length,1);
  assert.equal(c.profiles.length,1);
  assert.equal(c.results.length,0);
  assert.equal(c.activeProfileId,'legacy-v2-profile-0001');
  assert.deepEqual(c.profiles[0].graphicEq.bands.map(b=>b.frequencyHz),[125,250,500,1000]);
  assert.ok(c.profiles[0].graphicEq.bands.every(b=>b.source==='provisional'&&b.verification==='unverified'));
});

test('preserves two legacy profiles as distinct devices and references without inventing EQ',()=>{
  const f=setup([
    legacyProfile('one',{name:'Headset'}),
    legacyProfile('two',{name:'Coche',type:'car',bands:[60,120,240,1000,8000],measures:{}}),
  ],'two');
  f.transfer.preview();
  f.transfer.commit({userInitiated:true,confirmBackupExported:true});
  const c=f.store.load().catalog;
  assert.equal(c.devices.length,2);
  assert.equal(c.profiles.length,2);
  assert.equal(c.results.length,0);
  assert.equal(c.profiles[1].deviceId,c.devices[1].id);
  assert.equal(c.activeProfileId,'legacy-v2-profile-0002');
  assert.deepEqual(c.profiles[1].graphicEq.bands.map(b=>b.frequencyHz),[60,120,240,1000,8000]);
});

test('changed V2 source after preview stops the migration without modifying either store',()=>{
  const f=setup();
  f.transfer.preview();
  f.legacyStorage.setItem(LEGACY_V2_SOURCE_KEY,JSON.stringify([legacyProfile('new')]));
  assert.throws(()=>f.transfer.commit({userInitiated:true,confirmBackupExported:true}),/changed since preview/);
  assert.equal(f.store.load().catalog.profiles.length,0);
});

test('changed V3 baseline revision blocks stale migration',()=>{
  const f=setup();f.transfer.preview();
  f.store.save(f.store.load().catalog);
  assert.throws(()=>f.transfer.commit({userInitiated:true,confirmBackupExported:true}),/catalog changed/);
  assert.equal(f.store.load().catalog.profiles.length,0);
});

test('invalid legacy JSON and unknown profile type fail without silent truncation',()=>{
  const f=setup();
  f.legacyStorage.setItem(LEGACY_V2_SOURCE_KEY,'not json');
  assert.throws(()=>f.transfer.preview(),/Invalid legacy/);
  f.legacyStorage.setItem(LEGACY_V2_SOURCE_KEY,JSON.stringify([legacyProfile('x',{type:'unknown'})]));
  assert.throws(()=>f.transfer.preview(),/unsupported device category/);
  assert.equal(f.store.load().catalog.devices.length,0);
});

test('invalid frequency, unsorted bands and duplicates are rejected, not normalized silently',()=>{
  for(const bands of [[100,100],[250,125],[0,1000],[100,NaN],Array(32).fill(100)]){
    const f=setup([legacyProfile('a',{bands})]);
    assert.throws(()=>f.transfer.preview(),/invalid EQ band count|invalid or unsorted/);
    assert.equal(f.store.load().catalog.profiles.length,0);
  }
});

test('duplicate legacy identifiers are not mapped ambiguously',()=>{
  const f=setup([legacyProfile('same'),legacyProfile('same',{name:'Different'})]);
  assert.throws(()=>f.transfer.preview(),/Duplicate legacy/);
});

test('new migration cannot overwrite an existing legacy-prefixed V3 profile',()=>{
  const f=setup();const current=f.store.load().catalog;
  current.devices=[{id:'legacy-v2-device-0001',name:'Existing',category:'headphones'}];
  current.profiles=[{id:'legacy-v2-profile-0001',deviceId:'legacy-v2-device-0001',name:'Existing',
    graphicEq:{type:'graphic',deviceId:'legacy-v2-device-0001',bands:[
      {id:'b1',frequencyHz:100,source:'manual'},
      {id:'b2',frequencyHz:500,source:'manual'},
    ]}}];
  f.store.save(current);
  assert.throws(()=>f.transfer.preview(),/identifiers conflict/);
  assert.equal(f.store.load().catalog.profiles.length,1);
});

test('when V3 storage is blocked, migration warns about volatile persistence and V2 remains',()=>{
  const f=setup();const original=f.legacyStorage.getItem(LEGACY_V2_SOURCE_KEY);
  f.newStorage.failWrite=true;
  f.transfer.preview();
  const result=f.transfer.commit({userInitiated:true,confirmBackupExported:true});
  assert.equal(result.durability,'volatile');
  assert.equal(result.persistedOnDevice,false);
  assert.match(result.warning,/temporary memory/);
  assert.equal(f.legacyStorage.getItem(LEGACY_V2_SOURCE_KEY),original);
  assert.equal(f.store.load().catalog.profiles.length,1);
});

test('discard prevents committing an unreviewed V2 migration',()=>{
  const f=setup();f.transfer.preview();f.transfer.discard();
  assert.throws(()=>f.transfer.exportLegacyArchive(),/Preview legacy/);
  assert.throws(()=>f.transfer.commit({userInitiated:true,confirmBackupExported:true}),/Preview legacy/);
  assert.equal(f.store.load().catalog.profiles.length,0);
});

test('31-band legacy EQ metadata remains real and unverified, never assumed documented',()=>{
  const bands=Array.from({length:31},(_,i)=>100+i*150);
  const f=setup([legacyProfile('31',{bands})]);
  f.transfer.preview();
  f.transfer.commit({userInitiated:true,confirmBackupExported:true});
  const mapped=f.store.load().catalog.profiles[0].graphicEq.bands;
  assert.deepEqual(mapped.map(x=>x.frequencyHz),bands);
  assert.ok(mapped.every(x=>x.verification==='unverified'));
});
