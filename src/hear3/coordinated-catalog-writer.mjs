export const HEAR3_CATALOG_WRITE_LOCK_NAME='hear3:catalog:v1:write';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function createHear3CatalogWriteCoordinator({
 store,getLockManager=()=>globalThis.navigator?.locks??null,
 lockName=HEAR3_CATALOG_WRITE_LOCK_NAME,
}={}){
 check(store&&typeof store.load==='function','Readable catalog store required');
 check(typeof getLockManager==='function','Lock provider required');
 check(typeof lockName==='string'&&/^[a-z0-9:_-]{1,120}$/.test(lockName),'Invalid lock');
 function supported(){try{return typeof getLockManager()?.request==='function';}catch{return false;}}
 async function run(commit,{expectedRevision=null}={}){
  check(typeof commit==='function','Mutation callback required');
  check(expectedRevision===null||
   (Number.isSafeInteger(expectedRevision)&&expectedRevision>=0),'Invalid expected revision');
  const locks=getLockManager();
  check(locks&&typeof locks.request==='function',
   'Exclusive cross-tab locks unavailable. Export a backup and use a compatible secure browser before changing the catalog.');
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
