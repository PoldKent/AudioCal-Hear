/**
 * Hear 3.0 D-060: opt-in pilot-only offline caching.
 * Does not cache personal profiles, responses, localStorage or uploads.
 * Intercepts ONLY manifest-listed static Hear 3.0 prototype resources.
 * This worker is not automatically registered by Hear 2.0.
 */
'use strict';

const CACHE_PREFIX='audiocal-hear3-prototype-static-';
const CACHE_NAME=CACHE_PREFIX+'v1';
const SCOPE=new URL(self.registration.scope);
const MANIFEST_URL=new URL('hear3-offline-manifest.json',SCOPE).href;

function validateManifest(doc){
 if(!doc||doc.format!=='hear3-offline-static-manifest-v1'||
  !Array.isArray(doc.paths)||doc.paths.length<10||doc.paths.length>80)
  throw Error('Invalid offline manifest format');
 const seen=new Set();
 for(const path of doc.paths){
  if(typeof path!=='string'||path.length>180||
    !/^[A-Za-z0-9._/-]+$/.test(path)||path.startsWith('/')||
    path.split('/').some(v=>v==='.'||v==='..')||seen.has(path))
   throw Error('Unsafe or duplicated offline asset path');
  if(!(/^(hear3-preview\/|hear3-privacy\/|hear3-diagnostics\/|tests\/fixtures\/hear3-[a-z0-9-]+\.html$|src\/hear3\/[a-z0-9-]+\.mjs$)/.test(path)))
   throw Error('Unscoped offline resource');
  seen.add(path);
 }
 return doc;
}
async function validatedCachedManifest(){
 const cache=await caches.open(CACHE_NAME);
 const cached=await cache.match(MANIFEST_URL);
 if(!cached)return null;
 try{return validateManifest(await cached.json());}catch{return null;}
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const response=await fetch(MANIFEST_URL,{cache:'no-store'});
  if(!response.ok)throw Error('Offline manifest unavailable');
  const manifest=validateManifest(await response.json());
  const urls=[MANIFEST_URL,...manifest.paths.map(path=>new URL(path,SCOPE).href)];
  const cache=await caches.open(CACHE_NAME);
  // addAll rejects on a 404/network interruption. A failed install must
  // never claim offline readiness. No personal data is placed in the cache.
  await cache.addAll(urls);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys()){
   if(key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME)
    await caches.delete(key);
  }
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const relative=url.pathname.slice(SCOPE.pathname.length);
 // Hear 2.0 itself and any other apps are not intercepted, even while
 // this optional worker controls the scope.
 if(!/^(hear3-preview\/|hear3-privacy\/|hear3-diagnostics\/|tests\/fixtures\/hear3-|src\/hear3\/|hear3-offline-manifest\.json$)/.test(relative))
  return;
 event.respondWith((async()=>{
  const manifest=await validatedCachedManifest();
  const allowed=new Set([MANIFEST_URL,
   ...(manifest?.paths??[]).map(path=>new URL(path,SCOPE).href)]);
  if(!allowed.has(url.href))return fetch(request);
  const cache=await caches.open(CACHE_NAME);
  try{
   // Prefer current code online; refresh the cached static resource.
   const response=await fetch(request);
   if(response.ok&&response.type==='basic')await cache.put(request,response.clone());
   return response;
  }catch{
   const offline=await cache.match(request);
   return offline??Response.error();
  }
 })());
});
