/**
 * Hear 3 D-051/D-059/D-060 — explicitly imported, lossless V2 history vault.
 * Stores raw V2 JSON as opaque legacy evidence, separate from the V3 catalog.
 * Never converts V2 measures, controls, EQ or hearing thresholds into V3
 * calibrated observations. FNV detects accidents, not malicious alteration.
 */
import {parseLegacyV2Source} from './legacy-v2-migration-audit.mjs';
import {summarizeLegacyV2History} from './legacy-v2-history-view.mjs';
import {checkpointFingerprint} from './local-checkpoint-store.mjs';

export const HEAR3_V2_VAULT_FORMAT='hear3-lossless-v2-history-vault-v1';
export const HEAR3_V2_VAULT_KEY='hear3:v2-history:v1';
const MAX_SOURCE_CHARS=4_194_304;
const check=(yes,msg)=>{if(!yes)throw Error(msg);};
const clone=x=>JSON.parse(JSON.stringify(x));
const defaultStore=()=>{
 try{return typeof localStorage==='undefined'?null:localStorage;}
 catch{return null;}
};
function parsePackage(text){
 check(typeof text==='string'&&text.length>0&&text.length<=MAX_SOURCE_CHARS*2,
  'Invalid legacy V2 portable package length');
 let doc;
 try{doc=JSON.parse(text);}catch{throw Error('Invalid V2 history package JSON');}
 check(doc&&doc.format===HEAR3_V2_VAULT_FORMAT&&
  typeof doc.sourceText==='string'&&typeof doc.activeProfileId==='string'&&
  doc.activeProfileId.length<=1000&&
  doc.integrity?.algorithm==='fnv1a32'&&
  typeof doc.integrity.value==='string',
  'Unknown lossless V2 history format');
 const canonical={format:doc.format,sourceText:doc.sourceText,
  activeProfileId:doc.activeProfileId,sourceFormat:doc.sourceFormat};
 check(doc.integrity.value===checkpointFingerprint(JSON.stringify(canonical)),
  'Damaged V2 history archive; no data were imported');
 const parsed=parseLegacyV2Source(doc.sourceText);
 check(parsed.inputKind===doc.sourceFormat,'Source format changed inside package');
 const summary=summarizeLegacyV2History(doc.sourceText);
 return {sourceText:doc.sourceText,activeProfileId:doc.activeProfileId,
  sourceFormat:doc.sourceFormat,summary};
}
export function exportHear3LosslessV2History(sourceText,{activeProfileId=''}={}){
 check(typeof sourceText==='string'&&sourceText.length>0&&
  sourceText.length<=MAX_SOURCE_CHARS,'V2 history exceeds import limit');
 check(typeof activeProfileId==='string'&&activeProfileId.length<=1000,
  'Invalid legacy V2 active profile id');
 const sourceFormat=parseLegacyV2Source(sourceText).inputKind;
 summarizeLegacyV2History(sourceText);
 const canonical={format:HEAR3_V2_VAULT_FORMAT,
  sourceText,activeProfileId,sourceFormat};
 return JSON.stringify({...canonical,integrity:{
  algorithm:'fnv1a32',value:checkpointFingerprint(JSON.stringify(canonical)),
 }},null,2);
}
export function importHear3LosslessV2History(text){
 return clone(parsePackage(text));
}
export function createHear3LosslessV2HistoryVault({
 storage=defaultStore(),key=HEAR3_V2_VAULT_KEY,
}={}){
 check(typeof key==='string'&&/^[a-z0-9:_-]{1,120}$/.test(key),
  'Invalid scoped history key');
 let volatile=null,proposal=null;
 function read(){
  const valid=[],damaged=[];
  let unavailable=!storage;
  if(storage){
   for(let i=0;i<2;i++){
    let raw;
    try{raw=storage.getItem(key+':'+i);}
    catch{unavailable=true;continue;}
    if(raw==null)continue;
    try{
     const item=JSON.parse(raw);
     check(Number.isSafeInteger(item.revision)&&item.revision>=1&&
      typeof item.packageText==='string'&&
      checkpointFingerprint(JSON.stringify({
       revision:item.revision,packageText:item.packageText,
      }))===item.checksum,'Damaged vault record');
     valid.push({revision:item.revision,
      ...parsePackage(item.packageText),packageText:item.packageText,
      durability:'device-local'});
    }catch{damaged.push(i);}
   }
  }
  if(volatile)valid.push({...volatile,durability:'volatile'});
  valid.sort((a,b)=>b.revision-a.revision||
   (a.durability==='device-local'?-1:1));
  return {best:valid[0]??null,damaged,unavailable};
 }
 function load(){
  const data=read(),best=data.best;
  return {
   revision:best?.revision??0,
   available:Boolean(best),
   persistedOnDevice:best?.durability==='device-local',
   sourceText:best?.sourceText??null,
   activeProfileId:best?.activeProfileId??'',
   sourceFormat:best?.sourceFormat??null,
   summary:best?clone(best.summary):null,
   warnings:[
    ...(data.damaged.length?['Some V2 history vault slots are damaged and preserved.']:[]),
    ...(data.unavailable?['V2 history storage cannot be read reliably.']:[]),
   ],
  };
 }
 function preview(sourceText,{activeProfileId=''}={}){
  proposal=null;
  const packageText=exportHear3LosslessV2History(sourceText,{activeProfileId});
  const source=parsePackage(packageText),base=read();
  proposal={packageText,revision:base.best?.revision??0,
   baseline:checkpointFingerprint(base.best?.packageText??'none')};
  return Object.freeze({
   sourceFormat:source.sourceFormat,
   profileCount:source.summary.profileCount,
   completeSourceChars:sourceText.length,
   historicalRecords:source.summary.profiles.reduce((n,p)=>
    n+p.historicalRecordCount+p.unclassifiedRecordCount,0),
   requiresSeparateBackup:true,requiresExplicitConfirmation:true,
   replacesExisting:Boolean(base.best),
   migratedAsV3ClinicalResults:0,
   completeOpaqueLegacyRecordsPreserved:true,
   previewOnly:true,
   warning:'All V2 source fields are kept unchanged in an opaque V3 vault, not interpreted as new V3 clinical or EQ results.',
  });
 }
 function previewPackage(packageText){
  const source=parsePackage(packageText);
  return preview(source.sourceText,{activeProfileId:source.activeProfileId});
 }
 function exportPending(){
  check(proposal,'Review the legacy source before exporting its full portable history');
  return proposal.packageText;
 }
 function commit({userInitiated=false,confirmed=false,
  confirmSourceBackupExported=false,confirmOverwrite=false}={}){
  check(userInitiated===true&&confirmed===true,
   'Explicit user confirmation required for lossless migration');
  check(proposal,'Preview V2 history source before import');
  check(confirmSourceBackupExported===true,
   'Preserve the complete portable V2 source archive separately first');
  const before=read(),selected=proposal;
  check((before.best?.revision??0)===selected.revision&&
   checkpointFingerprint(before.best?.packageText??'none')===selected.baseline,
   'V2 history vault changed since preview; inspect again');
  check(!before.best||confirmOverwrite===true,
   'Existing V2 history copy requires separate replacement confirmation');
  proposal=null;
  const revision=selected.revision+1;
  volatile={...parsePackage(selected.packageText),
   packageText:selected.packageText,revision};
  const envelope={revision,packageText:selected.packageText};
  const raw=JSON.stringify({...envelope,checksum:
   checkpointFingerprint(JSON.stringify(envelope))});
  if(storage&&!before.unavailable){
   const slots=[revision%2,(revision+1)%2]
    .filter(i=>!before.damaged.includes(i));
   for(const slot of slots){
    try{
     storage.setItem(key+':'+slot,raw);
     check(storage.getItem(key+':'+slot)===raw,'Vault write not verified');
     return {revision,persistedOnDevice:true,
      historyRecordsPreserved:true,v3ClinicalResultsCreated:0,
      legacyV2SourceModified:false,
      warning:'Opaque V2 archive saved locally; export a backup for recovery.'};
    }catch{/* another safe slot or volatile fallback */}
   }
  }
  return {revision,persistedOnDevice:false,
   historyRecordsPreserved:true,v3ClinicalResultsCreated:0,
   legacyV2SourceModified:false,
   warning:'History is in volatile memory only; immediately download the portable archive.'};
 }
 function exportStored(){
  const item=read().best;
  check(item,'No verified V2 history archive to export');
  return item.packageText;
 }
 function discard(){proposal=null;}
 return Object.freeze({load,preview,previewPackage,exportPending,commit,exportStored,discard});
}
