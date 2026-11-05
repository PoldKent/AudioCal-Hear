import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3CatalogWriteCoordinator} from '../src/hear3/coordinated-catalog-writer.mjs';
function lockManager(){
 const previous=new Map();
 return {request(name,{mode},cb){
  assert.equal(mode,'exclusive');
  const running=(previous.get(name)??Promise.resolve()).catch(()=>{})
   .then(()=>cb({name,mode}));
  previous.set(name,running.catch(()=>{}));
  return running;
 }};
}
function store(){
 let revision=0,data=[];
 return {
  load:()=>({revision,catalog:{data:[...data]},persistedOnDevice:true}),
  save:(next,expected)=>{
   assert.equal(revision,expected);revision++;data=[...next];
   return {revision,persistedOnDevice:true};
  },
 };
}
test('cooperating tabs serialize exclusive writes and reject stale previews',async()=>{
 const raw=store(),locks=lockManager();
 const tab1=createHear3CatalogWriteCoordinator({store:raw,getLockManager:()=>locks});
 const tab2=createHear3CatalogWriteCoordinator({store:raw,getLockManager:()=>locks});
 const a=tab1.run(({revision})=>raw.save(['first'],revision),{expectedRevision:0});
 const b=tab2.run(({revision})=>raw.save(['stale'],revision),{expectedRevision:0});
 const saved=await a;
 assert.equal(saved.observedRevision,1);
 await assert.rejects(b,/Catalog changed/);
 assert.deepEqual(raw.load().catalog.data,['first']);
 assert.equal(saved.atomicAcrossUncooperativeWriters,false);
 assert.equal(saved.transactionallyDurable,false);
});
test('failed commit releases lock and permits another reviewed write',async()=>{
 const raw=store(),locks=lockManager();
 const api=createHear3CatalogWriteCoordinator({store:raw,getLockManager:()=>locks});
 await assert.rejects(api.run(()=>{throw Error('rejected');}),/rejected/);
 assert.equal((await api.run(({revision})=>raw.save(['next'],revision))).observedRevision,1);
});
test('missing Web Locks fail closed without writing or claiming a transaction',async()=>{
 const raw=store(),api=createHear3CatalogWriteCoordinator({
  store:raw,getLockManager:()=>null});
 assert.equal(api.supported(),false);
 await assert.rejects(api.run(()=>raw.save(['unsafe'],0)),/locks unavailable/);
 assert.equal(raw.load().revision,0);
});
test('fake exclusive acknowledgement cannot bypass the coordinator',async()=>{
 const raw=store(),api=createHear3CatalogWriteCoordinator({
  store:raw,getLockManager:()=>({request:(_,__,callback)=>callback(null)})});
 await assert.rejects(api.run(()=>raw.save(['unsafe'],0)),/not granted/);
 assert.equal(raw.load().revision,0);
});
