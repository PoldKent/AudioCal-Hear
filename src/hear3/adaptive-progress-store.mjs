/**
 * Hear 3.0 D-051/D-054/D-059: experimental local adaptive-exam bundle.
 * Holds the planner and audio-state snapshot together; NEVER plays audio.
 * Checksums detect accidental corruption, not malicious tampering.
 * No cloud/storage API outside the caller-selected local or session storage.
 */
import {checkpointFingerprint} from './local-checkpoint-store.mjs';

export const ADAPTIVE_BUNDLE_FORMAT='hear3-adaptive-exam-bundle-v1';
const LOCAL_FORMAT='hear3-adaptive-exam-local-v1';
const MAX_BYTES=262144;
const check=(valid,message)=>{if(!valid)throw Error(message);};
const clone=value=>JSON.parse(JSON.stringify(value));
const defaultStorage=name=>{
 try{return typeof window==='undefined'?null:window[name]??null;}
 catch{return null;}
};

export function createHear3AdaptiveProgressStore({
 profileId,deviceStorage=defaultStorage('localStorage'),
 tabStorage=defaultStorage('sessionStorage'),
}={}){
 check(typeof profileId==='string'&&/^[a-zA-Z0-9._-]{1,96}$/.test(profileId),
  'A stable, scoped profile id is required');
 const prefix='hear3:adaptive-progress:'+profileId+':';
 let volatile=null;

 function validate(bundle) {
  check(bundle&&bundle.format===ADAPTIVE_BUNDLE_FORMAT&&
   bundle.profileId===profileId&&bundle.progress?.profileId===profileId&&
   bundle.audioSession?.profileId===profileId,'Invalid adaptive exam bundle profile or format');
  check(bundle.plan?.interpretation==='preliminary-sweep-navigation-only'&&
   Array.isArray(bundle.plan.initialOrder)&&
   bundle.plan.initialOrder.length>=2&&bundle.plan.initialOrder.length<=31,
   'Invalid saved sweep-confirmation plan');
  check(bundle.progress?.format==='hear3-adaptive-discrete-progress-v1'&&
   Array.isArray(bundle.progress.bands)&&bundle.progress.bands.length===bundle.plan.initialOrder.length,
   'Invalid saved adaptive progression');
  check(bundle.audioSession?.schemaVersion===1&&
   ['ready','playing','paused','completed'].includes(bundle.audioSession.status)&&
   Array.isArray(bundle.audioSession.observations),'Invalid saved audio session');
  check(Number.isFinite(bundle.audioSession.authorizedDigitalRangeDbfs?.minDbfs)&&
   Number.isFinite(bundle.audioSession.authorizedDigitalRangeDbfs?.maxDbfs),
   'Missing authorized digital limits');
  return clone(bundle);
 }
 function encode(revision,bundle){
  const payload={format:LOCAL_FORMAT,revision,bundle};
  const raw=JSON.stringify({...payload,checksum:checkpointFingerprint(JSON.stringify(payload))});
  check(raw.length<=MAX_BYTES,'Adaptive checkpoint exceeds the local storage size limit');
  return raw;
 }
 function decode(raw){
  check(typeof raw==='string'&&raw.length<=MAX_BYTES,'Invalid checkpoint text length');
  const parsed=JSON.parse(raw);
  check(parsed?.format===LOCAL_FORMAT&&Number.isSafeInteger(parsed.revision)&&
   parsed.revision>=1&&typeof parsed.checksum==='string',
   'Invalid adaptive checkpoint envelope');
  check(checkpointFingerprint(JSON.stringify({
   format:parsed.format,revision:parsed.revision,bundle:parsed.bundle,
  }))===parsed.checksum,'Adaptive checkpoint integrity mismatch');
  return {revision:parsed.revision,bundle:validate(parsed.bundle)};
 }
 function inspect(storage, durability){
  const records=[],warnings=[];
  if(!storage)return {records,warnings};
  for(let slot=0;slot<2;slot++){
   let raw;
   try{raw=storage.getItem(prefix+slot);}
   catch{warnings.push('Storage is blocked ('+durability+').');break;}
   if(raw==null)continue;
   try{records.push({...decode(raw),durability});}
   catch{warnings.push('Damaged local snapshot slot '+slot+' ('+durability+'); ignored.');}
  }
  return {records,warnings};
 }
 function current(){
  const device=inspect(deviceStorage,'device-local');
  const tab=inspect(tabStorage,'tab-session');
  const records=[...device.records,...tab.records,...(volatile?[{...volatile,durability:'volatile'}]:[])];
  records.sort((a,b)=>b.revision-a.revision||
    (a.durability==='device-local'?-1:b.durability==='device-local'?1:0));
  return {best:records[0]??null,warnings:[...device.warnings,...tab.warnings]};
 }
 function load(){
  const result=current();
  return {
   checkpoint:result.best?clone(result.best.bundle):null,
   revision:result.best?.revision??0,
   durability:result.best?.durability??'none',
   persistedOnDevice:result.best?.durability==='device-local',
   warnings:result.warnings,
  };
 }
 function save(bundle,{expectedRevision=null}={}){
  const safe=validate(bundle);
  const state=load();
  check(expectedRevision===null||expectedRevision===state.revision,
   'Adaptive checkpoint changed since it was read; review before saving');
  const revision=state.revision+1;
  // Validate size before touching any stored checkpoint.
  const raw=encode(revision,safe);
  volatile={revision,bundle:safe};
  const slot=String(revision%2);
  for(const [storage,durability] of [[deviceStorage,'device-local'],[tabStorage,'tab-session']]){
   if(!storage)continue;
   try{
    storage.setItem(prefix+slot,raw);
    check(storage.getItem(prefix+slot)===raw,'Saved checkpoint could not be verified');
    return {revision,durability,persistedOnDevice:durability==='device-local',
     warning:durability==='device-local'?null:
      'Only tab-session storage is verified; export a copy before closing the tab.'};
   }catch{/* retain volatile and try another local scope */}
  }
  return {revision,durability:'volatile',persistedOnDevice:false,
   warning:'The adaptive checkpoint is only in memory; progress may be lost.'};
 }
 function clear({confirmed=false}={}){
  check(confirmed===true,'Explicit checkpoint deletion confirmation required');
  const errors=[];
  for(const [storage,name] of [[deviceStorage,'device-local'],[tabStorage,'tab-session']]){
   if(!storage)continue;
   for(let i=0;i<2;i++){
    try{
     storage.removeItem(prefix+i);
     check(storage.getItem(prefix+i)===null,'Deletion not verified');
    }catch{errors.push(name+':'+i);}
   }
  }
  volatile=null;
  return {cleared:errors.length===0,failedSlots:errors,
   warning:errors.length?'Some local checkpoint copies could not be removed.':null};
 }
 function exportBackup(){
  const value=load();
  check(value.checkpoint,'No adaptive checkpoint is available to export');
  const payload={format:ADAPTIVE_BUNDLE_FORMAT,
   warning:'Not encrypted or authenticated; never treated as acoustic calibration.',
   checkpoint:value.checkpoint};
  return JSON.stringify({...payload,integrity:{
   algorithm:'fnv1a32',value:checkpointFingerprint(JSON.stringify(payload.checkpoint)),
  }},null,2);
 }
 return Object.freeze({load,save,clear,exportBackup});
}
