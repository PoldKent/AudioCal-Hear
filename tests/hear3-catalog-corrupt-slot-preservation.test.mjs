import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3CatalogStore} from '../src/hear3/catalog-backup-store.mjs';

class Storage {
 constructor(){this.data=new Map();this.unreadable=false;this.writes=0;}
 getItem(k){if(this.unreadable)throw Error('Read denied');return this.data.get(k)??null;}
 setItem(k,v){this.writes++;this.data.set(k,v);}
 removeItem(k){this.data.delete(k);}
}
const key=slot=>'hear3:catalog:v1:'+slot;
function catalog(n){
 return {catalogVersion:1,
  devices:[{id:'d-'+n,name:'Equipo '+n,category:'speaker'}],
  profiles:[],results:[],activeProfileId:null};
}
test('known corrupt V3 slot is never overwritten on a later rotating revision',()=>{
 const device=new Storage();
 const store=createHear3CatalogStore({deviceStorage:device,tabStorage:null});
 store.save(catalog('a'));
 store.save(catalog('b'));
 device.setItem(key(1),'{DAMAGED-ORIGINAL}');
 const result=store.save(catalog('c'),{expectedRevision:2});
 assert.equal(result.revision,3);
 assert.equal(result.persistedOnDevice,true);
 assert.match(result.warning,/damaged catalog slot was preserved/);
 assert.equal(device.getItem(key(1)),'{DAMAGED-ORIGINAL}');
 const recovered=createHear3CatalogStore({deviceStorage:device,tabStorage:null}).load();
 assert.equal(recovered.revision,3);
 assert.equal(recovered.catalog.devices[0].id,'d-c');
 assert.ok(recovered.warnings.some(w=>w.includes('damaged')));
});
test('two corrupt device slots are preserved when a healthy tab copy exists',()=>{
 const device=new Storage(),tab=new Storage();
 const store=createHear3CatalogStore({deviceStorage:device,tabStorage:tab});
 store.save(catalog('a'));
 const valid=device.getItem(key(1));
 tab.setItem(key(1),valid);
 device.setItem(key(0),'damaged-0');
 device.setItem(key(1),'damaged-1');
 const result=store.save(catalog('b'),{expectedRevision:1});
 assert.equal(result.durability,'tab-session');
 assert.equal(result.persistedOnDevice,false);
 assert.equal(device.getItem(key(0)),'damaged-0');
 assert.equal(device.getItem(key(1)),'damaged-1');
 assert.equal(store.load().catalog.devices[0].id,'d-b');
});
test('unreadable device storage is never blindly written even if setItem accepts writes',()=>{
 const device=new Storage();
 device.setItem(key(1),'SECRET-UNVERIFIABLE');
 device.unreadable=true;
 const writesBefore=device.writes;
 const store=createHear3CatalogStore({deviceStorage:device,tabStorage:null});
 const result=store.save(catalog('c'));
 assert.equal(result.persistedOnDevice,false);
 assert.equal(result.durability,'volatile');
 assert.equal(device.writes,writesBefore);
 assert.equal(device.data.get(key(1)),'SECRET-UNVERIFIABLE');
});
test('only explicit deletion can remove damaged slots and permit normal rotation again',()=>{
 const device=new Storage();
 const store=createHear3CatalogStore({deviceStorage:device,tabStorage:null});
 store.save(catalog('a'));
 device.setItem(key(0),'INVALID-DATA');
 assert.throws(()=>store.clear(),/Explicit/);
 assert.equal(device.getItem(key(0)),'INVALID-DATA');
 assert.equal(store.clear({confirmed:true}).cleared,true);
 assert.equal(device.getItem(key(0)),null);
 assert.equal(device.getItem(key(1)),null);
 const result=store.save(catalog('b'));
 assert.equal(result.persistedOnDevice,true);
});
