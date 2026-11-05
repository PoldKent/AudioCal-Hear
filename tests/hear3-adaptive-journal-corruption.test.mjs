import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3AdaptiveProgressStore,ADAPTIVE_BUNDLE_FORMAT}
 from '../src/hear3/adaptive-progress-store.mjs';

class Storage {
 constructor(){this.values=new Map();}
 getItem(k){return this.values.get(k)??null;}
 setItem(k,v){this.values.set(k,v);}
 removeItem(k){this.values.delete(k);}
}
function bundle(){
 return {format:ADAPTIVE_BUNDLE_FORMAT,profileId:'p1',
  plan:{interpretation:'preliminary-sweep-navigation-only',
   initialOrder:[{id:'a',frequencyHz:125},{id:'b',frequencyHz:500}]},
  progress:{format:'hear3-adaptive-discrete-progress-v1',profileId:'p1',
   bands:[{id:'a'},{id:'b'}]},
  audioSession:{schemaVersion:1,profileId:'p1',status:'ready',observations:[],
   authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42}},
 };
}
test('a corrupted slot remains untouched when a valid sibling can store the new revision',()=>{
 const device=new Storage();
 const store=createHear3AdaptiveProgressStore({profileId:'p1',deviceStorage:device,tabStorage:null});
 store.save(bundle());store.save(bundle());
 const damagedKey='hear3:adaptive-progress:p1:1';
 device.setItem(damagedKey,'{DAMAGED ORIGINAL BYTES}');
 const saved=store.save(bundle(),{expectedRevision:2});
 assert.equal(saved.persistedOnDevice,true);
 assert.match(saved.warning,/damaged checkpoint slot was preserved/);
 assert.equal(device.getItem(damagedKey),'{DAMAGED ORIGINAL BYTES}');
 const loaded=store.load();
 assert.equal(loaded.revision,3);
 assert.equal(loaded.durability,'device-local');
 assert.ok(loaded.warnings.some(w=>w.includes('Damaged local snapshot slot')));
});
test('if both device slots are corrupted save only to volatile without erasing either copy',()=>{
 const device=new Storage();
 const store=createHear3AdaptiveProgressStore({profileId:'p1',deviceStorage:device,tabStorage:null});
 store.save(bundle());store.save(bundle());
 const a='hear3:adaptive-progress:p1:0',b='hear3:adaptive-progress:p1:1';
 device.setItem(a,'CORRUPT-A');device.setItem(b,'CORRUPT-B');
 const result=store.save(bundle(),{expectedRevision:2});
 assert.equal(result.persistedOnDevice,false);
 assert.equal(result.durability,'volatile');
 assert.match(result.warning,/damaged local slots were not overwritten/);
 assert.equal(device.getItem(a),'CORRUPT-A');
 assert.equal(device.getItem(b),'CORRUPT-B');
 const independent=createHear3AdaptiveProgressStore({
  profileId:'p1',deviceStorage:device,tabStorage:null,
 });
 assert.equal(independent.load().checkpoint,null);
 assert.ok(independent.load().warnings.some(w=>w.includes('Damaged')));
});
test('explicit deletion clears damaged slots; later saves may persist again',()=>{
 const device=new Storage();
 const store=createHear3AdaptiveProgressStore({profileId:'p1',deviceStorage:device,tabStorage:null});
 store.save(bundle());
 const bad='hear3:adaptive-progress:p1:1';
 device.setItem(bad,'INVALID');
 assert.throws(()=>store.clear(),/Explicit/);
 assert.equal(device.getItem(bad),'INVALID');
 const result=store.clear({confirmed:true});
 assert.equal(result.cleared,true);
 assert.equal(device.getItem(bad),null);
 assert.equal(store.save(bundle()).persistedOnDevice,true);
});
test('healthy two-slot journal still rotates normally after corruption protection',()=>{
 const device=new Storage();
 const store=createHear3AdaptiveProgressStore({profileId:'p1',deviceStorage:device,tabStorage:null});
 for(let i=0;i<5;i++)assert.equal(store.save(bundle()).persistedOnDevice,true);
 assert.equal(store.load().revision,5);
 assert.ok(device.getItem('hear3:adaptive-progress:p1:0'));
 assert.ok(device.getItem('hear3:adaptive-progress:p1:1'));
 assert.deepEqual(store.load().warnings,[]);
});
