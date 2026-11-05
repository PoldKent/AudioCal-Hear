/**
 * Hear 3.0 D-060: explicit offline pilot opt-in and removal.
 * Browser feature detection, exact static-resource verification, no telemetry.
 * Does not read, transmit or cache hearing results or personal profiles.
 */
export const HEAR3_OFFLINE_MANIFEST_FORMAT='hear3-offline-static-manifest-v1';
export const HEAR3_OFFLINE_CACHE_NAME='audiocal-hear3-prototype-static-v1';
export const HEAR3_OFFLINE_CACHE_PREFIX='audiocal-hear3-prototype-static-';
const check=(ok,message)=>{if(!ok)throw Error(message);};

export function validateHear3OfflineManifest(doc){
 check(doc&&doc.format===HEAR3_OFFLINE_MANIFEST_FORMAT&&
  Array.isArray(doc.paths)&&doc.paths.length>=10&&doc.paths.length<=80,
  'Offline static manifest has an unknown format or size');
 const unique=new Set();
 for(const path of doc.paths){
  check(typeof path==='string'&&path.length<=180&&
   /^[A-Za-z0-9._/-]+$/.test(path)&&!path.startsWith('/')&&
   !path.split('/').some(v=>v==='.'||v==='..')&&!unique.has(path),
   'Manifest includes an unsafe or duplicate resource');
  check(/^(hear3-preview\/|hear3-privacy\/|tests\/fixtures\/hear3-[a-z0-9-]+\.html$|src\/hear3\/[a-z0-9-]+\.mjs$)/.test(path),
   'Manifest contains a resource outside experimental Hear 3.0');
  unique.add(path);
 }
 return {format:doc.format,paths:[...doc.paths]};
}
export function detectHear3OfflineSupport(env=globalThis){
 return Object.freeze({
  supported:env?.isSecureContext===true&&
   Boolean(env?.navigator?.serviceWorker)&&
   Boolean(env?.caches)&&typeof env?.fetch==='function',
  secureContext:env?.isSecureContext===true,
  serviceWorker:Boolean(env?.navigator?.serviceWorker),
  cacheStorage:Boolean(env?.caches),
 });
}
function paths(){
 const base=new URL('../../',import.meta.url);
 return {
  base,
  manifest:new URL('hear3-offline-manifest.json',base),
  worker:new URL('hear3-offline-sw.js',base),
 };
}
export async function enableHear3Offline({
 env=globalThis,waitMs=15000,
}={}){
 check(detectHear3OfflineSupport(env).supported,
  'This browser does not support verified offline mode on this secure origin');
 check(Number.isFinite(waitMs)&&waitMs>=100&&waitMs<=30000,
  'Invalid activation timeout');
 const loc=paths();
 const response=await env.fetch(loc.manifest.href,{cache:'no-store'});
 check(response?.ok,'Offline asset manifest could not be fetched');
 const manifest=validateHear3OfflineManifest(await response.json());
 const registration=await env.navigator.serviceWorker.register(loc.worker.href,{
  scope:loc.base.pathname,
 });
 let handle;
 try{
  const ready=await Promise.race([
   env.navigator.serviceWorker.ready,
   new Promise((_,reject)=>{
    handle=setTimeout(()=>reject(Error('Offline worker activation could not be verified')),waitMs);
   }),
  ]);
  check(ready?.active&&registration?.active,
   'Offline worker is not activated');
  const cache=await env.caches.open(HEAR3_OFFLINE_CACHE_NAME);
  const missing=[];
  const required=[loc.manifest.href,...manifest.paths.map(p=>new URL(p,loc.base).href)];
  for(const asset of required){
   try{if(!await cache.match(asset))missing.push(asset);}
   catch{missing.push(asset);}
  }
  check(missing.length===0,
   'Some required experimental resources are not verified in the offline cache');
  return Object.freeze({
   enabled:true,staticResources:required.length,
   scope:loc.base.pathname,
   warning:'Resources are cached locally, but offline availability depends on browser storage and may be lost when cleared. Not validated on physical hardware.',
  });
 }finally{if(handle!==undefined)clearTimeout(handle);}
}
export async function disableHear3Offline({env=globalThis}={}){
 check(Boolean(env?.navigator?.serviceWorker)&&Boolean(env?.caches),
  'Offline removal is unavailable in this browser');
 const loc=paths();
 let unregistered=false;
 const existing=await env.navigator.serviceWorker.getRegistration(loc.base.href);
 // Never unregister an unrelated worker even when sharing the URL origin.
 if(existing?.active?.scriptURL===loc.worker.href)
  unregistered=await existing.unregister();
 const keys=await env.caches.keys();
 const cacheResults=[];
 for(const key of keys){
  if(!key.startsWith(HEAR3_OFFLINE_CACHE_PREFIX))continue;
  cacheResults.push(await env.caches.delete(key));
 }
 return Object.freeze({
  requested:true,unregistered,
  removedCaches:cacheResults.filter(Boolean).length,
  complete:cacheResults.every(Boolean),
  warning:'Only experimental Hear 3.0 offline static caches were targeted; private results, backups and other website caches were not changed.',
 });
}
