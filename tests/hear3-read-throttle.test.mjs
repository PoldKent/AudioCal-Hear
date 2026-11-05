import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3ReadThrottle} from '../src/hear3/read-throttle.mjs';

test('D-062 returns a stable cached snapshot instead of reading every 120 ms',()=>{
 let clock=0,reads=0;
 const reader=createHear3ReadThrottle({
  read:()=>({revision:++reads}),now:()=>clock,intervalMs:1000,
 });
 assert.equal(reader.get().revision,1);
 for(let i=1;i<=8;i++){
  clock=i*120;
  assert.equal(reader.get().revision,1);
 }
 assert.equal(reads,1);
 clock=1000;
 assert.equal(reader.get().revision,2);
 assert.equal(reader.stats().reads,2);
});
test('explicit user action invalidates cache for immediate local durability refresh',()=>{
 let clock=0,reads=0;
 const reader=createHear3ReadThrottle({read:()=>++reads,now:()=>clock});
 assert.equal(reader.get(),1);
 clock=2;
 assert.equal(reader.get(),1);
 reader.invalidate();
 assert.equal(reader.get(),2);
 assert.deepEqual(reader.stats(),{reads:2,cached:true,invalidated:false});
});
test('forced refresh and clock reset do not require a full interval',()=>{
 let t=2000,read=0;
 const r=createHear3ReadThrottle({read:()=>++read,now:()=>t});
 assert.equal(r.get(),1);
 assert.equal(r.get({force:true}),2);
 t=100;
 assert.equal(r.get(),3);
});
test('failed reads cannot masquerade as verified or fresh persisted state',()=>{
 let tries=0;
 const r=createHear3ReadThrottle({now:()=>100,read:()=>{
  if(++tries===1)throw Error('blocked storage');
  return {durability:'volatile'};
 }});
 assert.throws(()=>r.get(),/blocked storage/);
 assert.equal(r.stats().cached,false);
 assert.equal(r.get().durability,'volatile');
 assert.equal(r.stats().reads,1);
});
test('invalid dependencies, intervals and non-monotonic values fail closed',()=>{
 assert.throws(()=>createHear3ReadThrottle({read:undefined}),/dependencies/);
 assert.throws(()=>createHear3ReadThrottle({read:()=>0,intervalMs:0}),/interval/);
 assert.throws(()=>createHear3ReadThrottle({read:()=>0,now:()=>NaN}).get(),/clock/);
 const r=createHear3ReadThrottle({read:()=>0});
 assert.throws(()=>r.get({force:'yes'}),/force/);
});
