/**
 * Hear 3.0 D-059 P0: inspect and explicitly delete KNOWN Hear site storage.
 * Never erases the entire origin or unknown keys. No image databases/caches,
 * service workers, downloaded files or browser-wide storage are touched.
 *
 * No write at preview. Before commit rechecks scoped key/value inventory.
 * Deletion is best effort: localStorage is NOT transactional.
 */
import {checkpointFingerprint} from './local-checkpoint-store.mjs';

export const HEAR_STORAGE_CLEANUP_FORMAT='hear3-scoped-storage-cleanup-v1';
export const HEAR_STORAGE_ERASE_PHRASE='BORRAR DATOS HEAR';
export const HEAR_STORAGE_V3_PHRASE='BORRAR V3';
const V2_KEYS=new Set([
 'audiocal-hear-profiles-v1','audiocal-hear-active-v1','audiocal-language-v1',
]);
const V3_KEYS=new Set(['hear3:catalog:v1:0','hear3:catalog:v1:1']);
const V2_VAULT_KEYS=new Set(['hear3:v2-history:v1:0','hear3:v2-history:v1:1']);
const EXAM_KEY=/^hear3:(?:exam-checkpoint|adaptive-progress):[A-Za-z0-9._-]{1,96}:[01]$/;
const check=(x,message)=>{if(!x)throw Error(message);};
function nameBelongs(key,scope){
 const isV3=V3_KEYS.has(key)||V2_VAULT_KEYS.has(key)||EXAM_KEY.test(key);
 return isV3||(scope==='all-hear'&&V2_KEYS.has(key));
}
function storageDefault(name){
 try{return typeof window!=='undefined'?window[name]??null:null;}
 catch{return null;}
}
function snapshot(storage,scope){
 if(!storage)return {available:false,records:[],warning:'Storage not available.'};
 try{
  const count=storage.length;
  check(Number.isSafeInteger(count)&&count>=0&&count<=100000,
   'Invalid storage key count');
  const records=[];
  for(let i=0;i<count;i++){
   const key=storage.key(i);
   check(typeof key==='string','Storage changed while scanning');
   if(!nameBelongs(key,scope))continue;
   const value=storage.getItem(key);
   check(typeof value==='string','Storage changed while scanning');
   records.push({key,checksum:checkpointFingerprint(value)});
  }
  records.sort((a,b)=>a.key.localeCompare(b.key));
  return {available:true,records,warning:null};
 }catch(error){
  return {available:false,records:[],warning:
   'Storage enumeration unavailable or interrupted: '+(error?.message??String(error))};
 }
}
function identity(state){
 return checkpointFingerprint(JSON.stringify({
  scope:state.scope,
  local:state.local,
  tab:state.tab,
 }));
}
const summarize=records=>({
 v2:records.filter(x=>V2_KEYS.has(x.key)).length,
 v3Catalog:records.filter(x=>V3_KEYS.has(x.key)).length,
 v3LegacyHistoryVault:records.filter(x=>V2_VAULT_KEYS.has(x.key)).length,
 v3Exams:records.filter(x=>EXAM_KEY.test(x.key)).length,
 count:records.length,
});
export function createHear3ScopedStorageCleanup({
 deviceStorage=storageDefault('localStorage'),
 tabStorage=storageDefault('sessionStorage'),
}={}){
 let proposal=null;
 function discard(){proposal=null;}
 function inspect({scope='v3-only'}={}){
  check(['v3-only','all-hear'].includes(scope),'Unknown deletion scope');
  proposal=null;
  const local=snapshot(deviceStorage,scope),tab=snapshot(tabStorage,scope);
  const state={scope,local:local.records,tab:tab.records};
  const preview={
   format:HEAR_STORAGE_CLEANUP_FORMAT,scope,
   deviceLocal:summarize(local.records),tabSession:summarize(tab.records),
   allKnownEntries:local.records.length+tab.records.length,
   readableScopes:[local.available,tab.available].filter(Boolean).length,
   unreadableScopes:[local,tab].filter(x=>!x.available).length,
   warnings:[local.warning,tab.warning].filter(Boolean),
   includesHear2:scope==='all-hear',
   downloadedBackupsTouched:false,
   unknownStorageTouched:false,
   browserCacheTouched:false,
   imageDatabaseTouched:false,
   deletionAtomic:false,
   confirmationPhrase:scope==='all-hear'?HEAR_STORAGE_ERASE_PHRASE:HEAR_STORAGE_V3_PHRASE,
  };
  // If a present storage API cannot be listed, claiming complete deletion
  // would be incorrect. We allow an inspection with a warning, not a commit.
  proposal={scope,identity:identity(state),state,
   readable:local.available&&tab.available,
   preview};
  return structuredClone(preview);
 }
 function commit({userInitiated=false,confirmed=false,phrase=''}={}){
  check(userInitiated===true&&confirmed===true,
   'Explicit confirmed user action required for storage deletion');
  check(proposal,'Preview exact storage scope before deleting');
  const selected=proposal;
  check(phrase===selected.preview.confirmationPhrase,
   'Type the exact deletion phrase before proceeding');
  check(selected.readable,
   'Some storage areas could not be inspected; deletion cannot be verified');
  const nowLocal=snapshot(deviceStorage,selected.scope);
  const nowTab=snapshot(tabStorage,selected.scope);
  check(nowLocal.available&&nowTab.available,
   'Storage availability changed; preview again');
  check(identity({scope:selected.scope,local:nowLocal.records,tab:nowTab.records})
   ===selected.identity,'Hear storage changed since preview; review deletion again');
  proposal=null;
  const failures=[];
  const reports=[];
  for(const [storage,kind,records] of [
   [deviceStorage,'device-local',selected.state.local],
   [tabStorage,'tab-session',selected.state.tab],
  ]){
   for(const record of records){
    try{
     storage.removeItem(record.key);
     check(storage.getItem(record.key)===null,'Delete could not be verified');
    }catch{failures.push(kind);}
   }
   reports.push({kind,attempted:records.length});
  }
  const afterLocal=snapshot(deviceStorage,selected.scope);
  const afterTab=snapshot(tabStorage,selected.scope);
  const leftover=(afterLocal.available?afterLocal.records.length:0)
    +(afterTab.available?afterTab.records.length:0);
  const cleared=failures.length===0&&afterLocal.available&&afterTab.available&&leftover===0;
  return {
   scope:selected.scope,cleared,attempted:selected.preview.allKnownEntries,
   failedDeletions:failures.length,remainingEntries:leftover,
   unreadableAfter:[afterLocal,afterTab].filter(x=>!x.available).length,
   reports,
   message:cleared
    ?'Known scoped keys were removed. Previously exported files, browser caches and unknown storage were NOT deleted. Reload other open Hear tabs.'
    :'Some keys could not be verified as removed, or a new key was created by another tab. Review and retry after closing other Hear tabs.',
   browserWideClearAttempted:false,
   deletionAtomic:false,
  };
 }
 return Object.freeze({inspect,commit,discard});
}
