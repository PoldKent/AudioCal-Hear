/**
 * WebKit has shown that two same-origin tabs can both report persistent V2
 * commits despite using Web Locks + localStorage revision CAS (CI WebKit
 * reproduction 2026-11-17). Fail CLOSED if another participating Hear 3 tab
 * answers a presence probe. This is risk reduction, not an ACID guarantee.
 * Browser contexts that cannot probe must not mutate sensitive local state.
 */
const HEAR3_WEBKIT_PRESENCE_SYMBOL=Symbol.for('hear3:webkit:writer-presence:v1');
const HEAR3_WEBKIT_PRESENCE_CHANNEL='hear3:webkit:writer-presence:v1';
function isConservativeWebKit(){
 const ua=String(globalThis.navigator?.userAgent??'');
 return /iPhone|iPad|iPod/i.test(ua)||
  (/AppleWebKit/i.test(ua)&&/Safari\//i.test(ua)&&
   !/Chrome|Chromium|Edg\//i.test(ua));
}
function webKitPresenceGuard(){
 if(!isConservativeWebKit())return null;
 const existing=globalThis[HEAR3_WEBKIT_PRESENCE_SYMBOL];
 if(existing)return existing;
 let channel;
 try{
  if(typeof globalThis.BroadcastChannel!=='function')
   throw Error('Missing BroadcastChannel');
  channel=new globalThis.BroadcastChannel(HEAR3_WEBKIT_PRESENCE_CHANNEL);
 }catch{
  return Object.freeze({assertSingleTab:async()=>{
   throw Error('WebKit tab-safety probe unavailable; cannot save shared local history safely');
  }});
 }
 const id='tab-'+Math.random().toString(36).slice(2)+'-'+Date.now().toString(36);
 let counter=0;
 const pending=new Map();
 channel.addEventListener('message',event=>{
  const msg=event?.data;
  if(!msg||typeof msg!=='object'||msg.from===id)return;
  if(msg.kind==='probe'&&typeof msg.probeId==='string'){
   try{channel.postMessage({
    kind:'present',from:id,to:msg.from,probeId:msg.probeId,
   });}catch{/* writer in the probing tab will reject on missing capability */}
  }else if(msg.kind==='present'&&msg.to===id){
   pending.get(msg.probeId)?.();
  }
 });
 const guard=Object.freeze({
  async assertSingleTab(){
   const probeId=id+':'+(++counter);
   await new Promise((resolve,reject)=>{
    let settled=false;
    const complete=(error)=>{
     if(settled)return;
     settled=true;pending.delete(probeId);clearTimeout(timer);
     if(error)reject(error);else resolve();
    };
    const timer=setTimeout(()=>complete(),450);
    pending.set(probeId,()=>complete(Error(
     'Another Hear 3 tab is open in WebKit. Close other Hear 3 tabs before changing local data; no write was started.'
    )));
    try{channel.postMessage({kind:'probe',from:id,probeId});}
    catch{complete(Error('WebKit tab-safety probe failed; local data were not changed'));}
   });
  },
 });
 globalThis[HEAR3_WEBKIT_PRESENCE_SYMBOL]=guard;
 return guard;
}

export const HEAR3_CATALOG_WRITE_LOCK_NAME='hear3:catalog:v1:write';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function createHear3CatalogWriteCoordinator({
 store,getLockManager=()=>globalThis.navigator?.locks??null,
 lockName=HEAR3_CATALOG_WRITE_LOCK_NAME,
}={}){
 check(store&&typeof store.load==='function','Readable catalog store required');
 check(typeof getLockManager==='function','Lock provider required');
 check(typeof lockName==='string'&&/^[a-z0-9:_-]{1,120}$/.test(lockName),'Invalid lock');
 const webKitGuard=webKitPresenceGuard();
 function supported(){try{return typeof getLockManager()?.request==='function';}catch{return false;}}
 async function run(commit,{expectedRevision=null}={}){
  check(typeof commit==='function','Mutation callback required');
  check(expectedRevision===null||
   (Number.isSafeInteger(expectedRevision)&&expectedRevision>=0),'Invalid expected revision');
  const locks=getLockManager();
  check(locks&&typeof locks.request==='function',
   'Exclusive cross-tab locks unavailable. Export a backup and use a compatible secure browser before changing the catalog.');
  // Probe before Web Locks: a WebKit implementation may expose locks yet
  // fail to serialize localStorage visibility between different tabs.
  if(webKitGuard)await webKitGuard.assertSingleTab();
  return locks.request(lockName,{mode:'exclusive'},async lock=>{
   check(lock?.name===lockName&&lock?.mode==='exclusive','Exclusive catalog lock not granted');
   const before=store.load();
   check(Number.isSafeInteger(before?.revision)&&before.revision>=0,'Cannot inspect catalog');
   if(expectedRevision!==null)check(before.revision===expectedRevision,
    'Catalog changed in another tab; review again');
   const response=await commit({revision:before.revision,catalog:before.catalog});
   const after=store.load();
   return {response,coordination:'web-locks-exclusive-cooperative',
    sourceRevision:before.revision,observedRevision:after.revision,
    persistedOnDevice:after.persistedOnDevice===true,
    atomicAcrossUncooperativeWriters:false,transactionallyDurable:false};
  });
 }
 return Object.freeze({supported,run,lockName});
}
