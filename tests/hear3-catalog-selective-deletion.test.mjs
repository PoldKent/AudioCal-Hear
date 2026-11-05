import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3CatalogStore} from '../src/hear3/catalog-backup-store.mjs';
import {createHear3CatalogDeletion} from '../src/hear3/catalog-selective-deletion.mjs';

class Storage {
  constructor(){this.data=new Map();this.writable=true;}
  getItem(k){return this.data.get(k)??null;}
  setItem(k,v){if(!this.writable)throw Error('denied');this.data.set(k,v);}
  removeItem(k){this.data.delete(k);}
}
function catalog(){
  const device=(id)=>({id,name:id,category:'headphones'});
  const profile=(id,deviceId)=>({id,deviceId,name:id,
    graphicEq:{type:'graphic',deviceId,bands:[
      {id:'a',frequencyHz:125,source:'manual'},
      {id:'b',frequencyHz:1000,source:'manual'},
    ]}});
  const result=(id,profileId)=>({id,profileId,capturedAt:1790000000000,
    status:'inconclusive',provenance:'manual',originalEq:[],currentEq:[],
    observations:[],editHistory:[]});
  return {
    catalogVersion:1,devices:[device('d1'),device('d2')],
    profiles:[profile('p1','d1'),profile('p2','d1'),profile('p3','d2')],
    results:[result('r1','p1'),result('r2','p2'),result('r3','p3')],
    activeProfileId:'p1',
  };
}
function setup(){
  const device=new Storage();device.setItem('audiocal-hear-profiles-v1','LEGACY_UNTOUCHED');
  const store=createHear3CatalogStore({deviceStorage:device,tabStorage:null});
  store.save(catalog());
  return {device,store,deletion:createHear3CatalogDeletion({store})};
}

test('a single result can be deleted without affecting other results, profiles or V2',()=>{
  const f=setup();
  const p=f.deletion.preview({kind:'result',id:'r1'});
  assert.deepEqual([p.removedDevices,p.removedProfiles,p.removedResults],[0,0,1]);
  assert.throws(()=>f.deletion.commit(),/explicit/);
  assert.equal(f.store.load().catalog.results.length,3);
  const outcome=f.deletion.commit({userInitiated:true,confirmed:true});
  assert.equal(outcome.persistedOnDevice,true);
  const c=f.store.load().catalog;
  assert.deepEqual(c.results.map(x=>x.id),['r2','r3']);
  assert.equal(c.activeProfileId,'p1');
  assert.equal(c.profiles.length,3);
  assert.equal(f.device.getItem('audiocal-hear-profiles-v1'),'LEGACY_UNTOUCHED');
});

test('profile deletion cannot silently erase dependent result',()=>{
  const f=setup();
  assert.throws(()=>f.deletion.preview({kind:'profile',id:'p1'}),/separate cascade preview/);
  assert.equal(f.store.load().catalog.results.length,3);
  const p=f.deletion.preview({kind:'profile',id:'p1',cascade:true});
  assert.equal(p.removedResults,1);
  assert.equal(p.removedProfiles,1);
  assert.equal(p.activeProfileCleared,true);
  assert.throws(()=>f.deletion.commit({userInitiated:true,confirmed:true}),/separate cascade confirmation/);
  assert.equal(f.store.load().catalog.activeProfileId,'p1');
  const saved=f.deletion.commit({userInitiated:true,confirmed:true,confirmCascade:true});
  assert.equal(saved.deleted,true);
  const c=f.store.load().catalog;
  assert.deepEqual(c.profiles.map(x=>x.id),['p2','p3']);
  assert.deepEqual(c.results.map(x=>x.id),['r2','r3']);
  assert.equal(c.activeProfileId,null);
});

test('deleting a device requires explicit cascade and keeps unrelated device unchanged',()=>{
  const f=setup();
  assert.throws(()=>f.deletion.preview({kind:'device',id:'d1'}),/cascade/);
  const p=f.deletion.preview({kind:'device',id:'d1',cascade:true});
  assert.equal(p.removedDevices,1);
  assert.equal(p.removedProfiles,2);
  assert.equal(p.removedResults,2);
  assert.equal(p.willDeleteOtherProfiles,true);
  f.deletion.commit({userInitiated:true,confirmed:true,confirmCascade:true});
  const c=f.store.load().catalog;
  assert.deepEqual(c.devices.map(x=>x.id),['d2']);
  assert.deepEqual(c.profiles.map(x=>x.id),['p3']);
  assert.deepEqual(c.results.map(x=>x.id),['r3']);
  assert.equal(f.device.getItem('audiocal-hear-profiles-v1'),'LEGACY_UNTOUCHED');
});

test('stale preview detects a concurrent catalog change and does not overwrite it',()=>{
  const f=setup();
  f.deletion.preview({kind:'result',id:'r1'});
  const updated=f.store.load().catalog;
  updated.results.pop();
  f.store.save(updated);
  assert.throws(()=>f.deletion.commit({userInitiated:true,confirmed:true}),/changed since/);
  assert.deepEqual(f.store.load().catalog.results.map(x=>x.id),['r1','r2']);
});

test('discard and unknown entity selections fail closed without mutation',()=>{
  const f=setup(),before=f.store.load().revision;
  assert.throws(()=>f.deletion.preview({kind:'file',id:'r1'}),/Unknown/);
  assert.throws(()=>f.deletion.preview({kind:'result',id:'missing'}),/does not exist/);
  assert.throws(()=>f.deletion.preview({kind:'result',id:''}),/specific/);
  f.deletion.preview({kind:'result',id:'r1'});
  f.deletion.discard();
  assert.throws(()=>f.deletion.commit({userInitiated:true,confirmed:true}),/Preview/);
  assert.equal(f.store.load().revision,before);
});

test('a denied disk write cannot be reported as durable deletion',()=>{
  const f=setup();
  f.deletion.preview({kind:'result',id:'r1'});
  f.device.writable=false;
  const result=f.deletion.commit({userInitiated:true,confirmed:true});
  assert.equal(result.persistedOnDevice,false);
  assert.equal(result.durability,'volatile');
  assert.equal(result.requiresVerifiedBackup,true);
  assert.deepEqual(f.store.load().catalog.results.map(x=>x.id),['r2','r3']);
  assert.throws(()=>f.deletion.commit({userInitiated:true,confirmed:true}),/Preview/);
});

test('full V3 deletion is deliberately outside scoped individual operation',()=>{
  const f=setup();
  assert.throws(()=>f.deletion.preview({kind:'all',id:'all',cascade:true}),/Unknown deletion category/);
  assert.equal(f.device.getItem('audiocal-hear-profiles-v1'),'LEGACY_UNTOUCHED');
});

test('result deletion never implies a change to audio or clinical confidence',()=>{
  const f=setup();
  f.deletion.preview({kind:'result',id:'r2'});
  const result=f.deletion.commit({userInitiated:true,confirmed:true});
  assert.equal(result.audioStarted,false);
  assert.equal(result.legacyV2Touched,false);
  assert.equal(f.store.load().catalog.results[0].status,'inconclusive');
});
