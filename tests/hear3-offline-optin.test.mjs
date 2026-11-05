import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {
 validateHear3OfflineManifest,detectHear3OfflineSupport,
 enableHear3Offline,disableHear3Offline,HEAR3_OFFLINE_CACHE_NAME,
} from '../src/hear3/offline-optin.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'hear3-offline-manifest.json'),'utf8'));
test('static offline manifest contains real local, public pilot assets and no user records',()=>{
 const validated=validateHear3OfflineManifest(manifest);
 assert.equal(validated.paths.length,34);
 const required=[
  'hear3-preview/','hear3-privacy/','hear3-diagnostics/','src/hear3/local-diagnostics.mjs',
  'tests/fixtures/hear3-integrated-exam-pilot.html',
  'src/hear3/contextual-tone-comparison.mjs',
  'src/hear3/adaptive-progress-store.mjs',
  'src/hear3/audio-capability-preflight.mjs',
  'src/hear3/read-throttle.mjs',
  'src/hear3/scoped-storage-cleanup.mjs',
 ];
 for(const path of required)assert.ok(validated.paths.includes(path),path);
 for(const path of validated.paths){
  const filename=path.endsWith('/')?path+'index.html':path;
  assert.ok(readFileSync(resolve(root,filename)).length>0,'missing '+filename);
 }
 assert.equal(validated.paths.some(p=>/audiocal-hear-profiles|users|photos|\.png$/.test(p)),false);
});
test('manifest rejects duplicates, traversal, unrelated origin and code bundles',()=>{
 const invalid=['../other','/personal','src/js/01-core.js',
  'tests/fixtures/private.html','src/hear3/data.json'];
 for(const value of invalid){
  assert.throws(()=>validateHear3OfflineManifest({
   ...manifest,paths:[...manifest.paths.slice(1),value],
  }),/unsafe|outside experimental/i);
 }
 assert.throws(()=>validateHear3OfflineManifest({
  ...manifest,paths:[...manifest.paths.slice(0,-1),manifest.paths[0]],
 }),/duplicate/);
 assert.throws(()=>validateHear3OfflineManifest({...manifest,format:'fake'}),/unknown format/);
});
test('compatibility is capability-based, not based on browser brand',()=>{
 assert.equal(detectHear3OfflineSupport({isSecureContext:false,
  navigator:{serviceWorker:{}},caches:{},fetch:()=>{}}).supported,false);
 assert.equal(detectHear3OfflineSupport({isSecureContext:true,
  navigator:{},caches:{},fetch:()=>{}}).supported,false);
 assert.equal(detectHear3OfflineSupport({isSecureContext:true,
  navigator:{serviceWorker:{}},caches:{},fetch:()=>{}}).supported,true);
});
function environment({missing=null,unsupported=false}={}){
 const cache={
  async match(url){return missing!==null&&url.includes(missing)?null:{status:200};},
 };
 const calls=[];
 const serviceWorker={
  async register(url,opts){
   calls.push(['register',url,opts]);
   return {active:{scriptURL:url}};
  },
  get ready(){
   return Promise.resolve({active:{scriptURL:'fake-active'}});
  },
  async getRegistration(){
   return {active:{scriptURL:'fake-sw'},unregister:async()=>{calls.push('unregister');return true;}};
  },
 };
 const env={isSecureContext:!unsupported,
  navigator:{serviceWorker},
  caches:{
   async open(name){calls.push(['open',name]);return cache;},
   async keys(){return ['OTHER-CACHE',HEAR3_OFFLINE_CACHE_NAME];},
   async delete(name){calls.push(['delete',name]);return true;},
  },
  async fetch(url){calls.push(['fetch',url]);return {ok:true,json:async()=>manifest};},
 };
 return {env,calls};
}
test('successful user-initiated enable verifies every cached static asset',async()=>{
 const f=environment();
 const result=await enableHear3Offline({env:f.env,waitMs:1000});
 assert.equal(result.enabled,true);
 assert.equal(result.staticResources,manifest.paths.length+1);
 assert.ok(f.calls.some(x=>Array.isArray(x)&&x[0]==='register'));
 assert.equal(f.calls.some(x=>Array.isArray(x)&&x[0]==='delete'),false);
});
test('failed static precache verification never claims offline readiness',async()=>{
 const f=environment({missing:'hear3-integrated-exam-pilot'});
 await assert.rejects(enableHear3Offline({env:f.env,waitMs:1000}),/not verified/);
});
test('unavailable service workers block install and never fetch remote resources',async()=>{
 const f=environment({unsupported:true});
 await assert.rejects(enableHear3Offline({env:f.env}),/does not support/);
 assert.equal(f.calls.length,0);
});
test('disabling offline only targets the Hear experimental cache prefix',async()=>{
 const f=environment();
 const result=await disableHear3Offline({env:f.env});
 assert.equal(result.requested,true);
 assert.equal(result.removedCaches,1);
 assert.equal(result.complete,true);
 assert.ok(f.calls.some(x=>Array.isArray(x)&&x[0]==='delete'&&
  x[1]===HEAR3_OFFLINE_CACHE_NAME));
 assert.equal(f.calls.some(x=>Array.isArray(x)&&x[0]==='delete'&&
  x[1]==='OTHER-CACHE'),false);
});
