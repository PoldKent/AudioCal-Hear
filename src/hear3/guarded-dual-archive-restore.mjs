/**
 * Hear 3 D-051/D-059/D-060: recovery-first, cooperative dual-archive restore.
 * No ACID guarantees across storage keys, browser crashes, or writers that
 * ignore Web Locks. No sound, hardware, telemetry or EQ application.
 */
import {createHear3CatalogBackupTransfer} from './catalog-backup-store.mjs';
import {validateHear3Catalog} from './catalog-contract.mjs';
import {importHear3LosslessV2History} from './legacy-v2-history-vault.mjs';
import {checkpointFingerprint} from './local-checkpoint-store.mjs';

export const HEAR3_DUAL_RESTORE_JOURNAL_KEY='hear3:dual-restore:v1:journal';
export const HEAR3_DUAL_RESTORE_JOURNAL_FORMAT='hear3-dual-restore-journal-v1';
const check=(condition,message)=>{if(!condition)throw Error(message);};
const clone=value=>JSON.parse(JSON.stringify(value));
const hash=value=>checkpointFingerprint(JSON.stringify(value));
const defaultStorage=()=>{
 try{return globalThis.localStorage??null;}catch{return null;}
};
const validHash=value=>typeof value==='string'&&/^[a-f0-9]{8}$/.test(value);
function identity(catalog,history){
 return {
  catalog:hash(catalog.catalog),
  history:hash({sourceText:history.sourceText,activeProfileId:history.activeProfileId}),
 };
}
function durable(catalog,history){
 return catalog.persistedOnDevice===true&&history.available===true&&
  history.persistedOnDevice===true;
}
function same(a,b){
 return a.catalog===b.catalog&&a.history===b.history;
}
function journalText(doc){
 const envelope={format:HEAR3_DUAL_RESTORE_JOURNAL_FORMAT,
  state:doc.state,baseline:doc.baseline,target:doc.target};
 return JSON.stringify({...envelope,checksum:hash(envelope)});
}
function parseJournal(raw){
 if(raw===null)return null;
 let value;
 try{value=JSON.parse(raw);}catch{throw Error('Damaged dual-restore journal; preserve it and inspect recovery files');}
 check(value?.format===HEAR3_DUAL_RESTORE_JOURNAL_FORMAT&&
  ['in-progress','completed'].includes(value.state)&&
  value.baseline&&value.target&&
  [value.baseline.catalog,value.baseline.history,
   value.target.catalog,value.target.history].every(validHash)&&
  value.checksum===hash({format:value.format,state:value.state,
   baseline:value.baseline,target:value.target}),
  'Damaged dual-restore journal; preserve it and inspect recovery files');
 return value;
}
export function createHear3GuardedDualRestore({
 catalogStore,historyVault,coordinator,journalStorage=defaultStorage(),
 journalKey=HEAR3_DUAL_RESTORE_JOURNAL_KEY,
}={}){
 check(catalogStore&&typeof catalogStore.load==='function'&&
  typeof catalogStore.exportBackup==='function','Readable V3 catalog required');
 check(historyVault&&typeof historyVault.load==='function'&&
  typeof historyVault.exportStored==='function','Readable V2 history vault required');
 check(coordinator&&typeof coordinator.run==='function','Exclusive coordinator required');
 check(typeof journalKey==='string'&&/^[a-z0-9:_-]{1,120}$/.test(journalKey),
  'Invalid dual-restore journal key');
 const transfer=createHear3CatalogBackupTransfer({store:catalogStore});
 let proposal=null;
 const load=()=>({catalog:catalogStore.load(),history:historyVault.load()});
 function inspectJournal(){
  check(journalStorage&&typeof journalStorage.getItem==='function',
   'Durable dual-restore journal storage unavailable');
  let raw;
  try{raw=journalStorage.getItem(journalKey);}
  catch{throw Error('Cannot read dual-restore journal; no writes are allowed');}
  return parseJournal(raw);
 }
 function status(){
  const record=inspectJournal();
  if(!record)return {state:'clear',requiresRecovery:false};
  const current=load(),observed=identity(current.catalog,current.history);
  const coherent=durable(current.catalog,current.history)&&
   (same(observed,record.baseline)||same(observed,record.target));
  return {
   state:record.state,requiresRecovery:true,
   coherentSnapshotVerified:coherent,
   matches:coherent?(same(observed,record.target)?'restored-target':'previous-baseline'):'mixed-or-unverified',
   warning:'Inspect both V3 and opaque V2 archives before acknowledging interrupted restoration.',
  };
 }
 function discard(){
  proposal=null;transfer.discard();historyVault.discard();
 }
 function preview({catalogBackupText,historyBackupText}={}){
  discard();
  check(typeof catalogBackupText==='string'&&typeof historyBackupText==='string',
   'Both independent JSON backups must be supplied');
  check(inspectJournal()===null,'Unresolved dual-restore journal; inspect and resolve before replacing more data');
  const before=load();
  check(durable(before.catalog,before.history),
   'Both existing V3 catalog and V2 historic vault must be durably readable; use separate non-destructive imports otherwise');
  const catalogRollback=catalogStore.exportBackup();
  const historyRollback=historyVault.exportStored();
  let catalogPreview,historyPreview,desiredCatalog,desiredHistory;
  try{
   catalogPreview=transfer.preview(catalogBackupText,{mode:'replace'});
   historyPreview=historyVault.previewPackage(historyBackupText);
   // The two preceding previews validate schema and accidental checksums.
   desiredCatalog=validateHear3Catalog(JSON.parse(catalogBackupText).catalog);
   const importedHistory=importHear3LosslessV2History(historyBackupText);
   desiredHistory={sourceText:importedHistory.sourceText,
    activeProfileId:importedHistory.activeProfileId};
  }catch(error){discard();throw error;}
  const after=identity({catalog:desiredCatalog},desiredHistory);
  proposal={
   baseline:identity(before.catalog,before.history),target:after,
   catalogRevision:before.catalog.revision,historyRevision:before.history.revision,
   catalogRollback,historyRollback,
   catalogBackupRequested:false,historyBackupRequested:false,
  };
  return Object.freeze({
   previewOnly:true,requiresExplicitConsent:true,
   rollbackFilesRequired:2,sourceFilesRequired:2,
   sourceV3Devices:catalogPreview.devices,
   sourceV3Profiles:catalogPreview.profiles,
   sourceV3Results:catalogPreview.results,
   sourceV2Profiles:historyPreview.profileCount,
   sourceV2HistoricalRecords:historyPreview.historicalRecords,
   historicV2ConvertedIntoV3Results:0,
   atomicAcrossIndependentArchives:false,
   powerLossRecoveryCertified:false,
   warning:'Export BOTH previous snapshots before replacement. A crash or quota failure may leave a mixed pair requiring manual rollback.',
  });
 }
 function exportPreviousV3(){
  check(proposal,'Review both restore files before exporting rollback data');
  proposal.catalogBackupRequested=true;
  return proposal.catalogRollback;
 }
 function exportPreviousV2(){
  check(proposal,'Review both restore files before exporting rollback data');
  proposal.historyBackupRequested=true;
  return proposal.historyRollback;
 }
 function saveJournal(record){
  check(journalStorage&&typeof journalStorage.setItem==='function',
   'Durable dual-restore journal storage unavailable');
  const raw=journalText(record);
  try{
   journalStorage.setItem(journalKey,raw);
   check(journalStorage.getItem(journalKey)===raw,'Dual-restore journal readback failed');
  }catch{throw Error('Cannot persist dual-restore recovery marker; no new operation is authorized');}
 }
 function removeJournal(){
  try{
   journalStorage.removeItem(journalKey);
   return journalStorage.getItem(journalKey)===null;
  }catch{return false;}
 }
 async function commit({userInitiated=false,confirmBothReplacements=false,
  confirmRollbackDownloads=false}={}){
  check(userInitiated===true&&confirmBothReplacements===true&&
   confirmRollbackDownloads===true,'Explicit consent to both replacements and recovery files required');
  check(proposal&&proposal.catalogBackupRequested&&proposal.historyBackupRequested,
   'Request both prior independent rollback files before committing');
  const staged=proposal;
  const executed=await coordinator.run(async()=>{
   check(inspectJournal()===null,'Unresolved dual-restore journal blocks new writes');
   const before=load();
   check(durable(before.catalog,before.history)&&
    before.catalog.revision===staged.catalogRevision&&
    before.history.revision===staged.historyRevision&&
    same(identity(before.catalog,before.history),staged.baseline),
    'One of the V2/V3 sources changed since preview; inspect both again');
   saveJournal({state:'in-progress',baseline:staged.baseline,target:staged.target});
   // The marker deliberately remains when a commit fails, so a later reload
   // can detect a partially-restored pair. Never silently roll back data.
   const newV3=transfer.commit({userInitiated:true,confirmReplace:true});
   check(newV3.persistedOnDevice===true,
    'V3 restore is not device-persistent; manual recovery from BOTH backups required');
   const newV2=historyVault.commit({userInitiated:true,confirmed:true,
    confirmSourceBackupExported:true,confirmOverwrite:true});
   check(newV2.persistedOnDevice===true,
    'V2 restore is not device-persistent; manual recovery from BOTH backups required');
   const after=load();
   check(durable(after.catalog,after.history)&&
    same(identity(after.catalog,after.history),staged.target),
    'Dual restore verification failed; inspect BOTH archives before recovery');
   let markerCompleted=false;
   try{
    saveJournal({state:'completed',baseline:staged.baseline,target:staged.target});
    markerCompleted=true;
   }catch{/* In-progress marker is preserved for explicit recovery acknowledgement. */}
   const cleared=markerCompleted&&removeJournal();
   return {restored:true,v3Persisted:true,v2Persisted:true,
    journalCleared:cleared,
    requiresRecoveryAcknowledgement:!cleared,
    powerLossRecoveryCertified:false,atomicAcrossIndependentArchives:false,
    noAudioStarted:true};
  },{expectedRevision:staged.catalogRevision});
  discard();
  return executed.response;
 }
 function acknowledgeCoherentRecovery({userInitiated=false,confirmed=false}={}){
  check(userInitiated===true&&confirmed===true,
   'Explicit inspection and acknowledgement required');
  const record=inspectJournal();
  check(record,'No pending recovery marker to acknowledge');
  const s=status();
  check(s.coherentSnapshotVerified===true,
   'Recovery incomplete: V3 and V2 do not match the same verified before/after pair');
  check(removeJournal(),'Cannot clear recovery marker; preserve it for manual investigation');
  discard();
  return {acknowledged:true,matches:s.matches,restoredAutomatically:false};
 }
 return Object.freeze({preview,exportPreviousV3,exportPreviousV2,commit,
  status,acknowledgeCoherentRecovery,discard});
}
