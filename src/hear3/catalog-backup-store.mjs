/**
 * Hear 3.0 P0 — local device/profile/result catalog persistence and backup.
 * No cloud, no hidden writes while previewing; no audio or EQ computation.
 * FNV-1a detects accidental corruption, NOT authenticity or encryption.
 */
import { HEAR3_CATALOG_FORMAT, emptyHear3Catalog, validateHear3Catalog }
  from './catalog-contract.mjs';
import { checkpointFingerprint } from './local-checkpoint-store.mjs';

export const CATALOG_BACKUP_FORMAT = 'hear3-catalog-backup-v1';
export const MAX_CATALOG_JSON_CHARS = 2_097_152;
const LOCAL_FORMAT = 'hear3-catalog-local-v1';

function check(ok,msg) { if(!ok) throw new Error(msg); }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function defaultStorage(name) {
  try { return typeof window === 'undefined' ? null : window[name] ?? null; }
  catch { return null; }
}
function parseRecord(text) {
  const value=JSON.parse(text);
  check(value && value.format===LOCAL_FORMAT && Number.isSafeInteger(value.revision)
    && value.revision>=1 && typeof value.checksum==='string', 'Invalid catalog storage envelope');
  check(checkpointFingerprint(JSON.stringify({
    format:value.format,revision:value.revision,catalog:value.catalog,
  }))===value.checksum, 'Catalog checksum mismatch');
  return { revision:value.revision, catalog:validateHear3Catalog(value.catalog) };
}
function persistedRecord(revision,catalog) {
  const value={ format:LOCAL_FORMAT,revision,catalog };
  return JSON.stringify({ ...value,checksum:checkpointFingerprint(JSON.stringify(value)) });
}
function backupText(catalog) {
  const safe=validateHear3Catalog(catalog);
  return JSON.stringify({
    format:CATALOG_BACKUP_FORMAT,exportedAt:new Date().toISOString(),
    catalog:safe,
    integrity:{ algorithm:'fnv1a32',value:checkpointFingerprint(JSON.stringify(safe)) },
  },null,2);
}

export function createHear3CatalogStore({
  deviceStorage=defaultStorage('localStorage'),
  tabStorage=defaultStorage('sessionStorage'),
  key='hear3:catalog:v1',
}={}) {
  check(typeof key==='string' && /^[a-z0-9:_-]{1,120}$/.test(key), 'Invalid catalog storage key');
  let volatile=null;
  function inspect(storage,kind) {
    const records=[]; let corrupt=false, unavailable=!storage;
    if(!storage) return {records,corrupt,unavailable};
    for(let slot=0;slot<2;slot++){
      try {
        const raw=storage.getItem(key+':'+slot);
        if(raw==null) continue;
        records.push({...parseRecord(raw),durability:kind});
      } catch(e) {
        if(e instanceof SyntaxError || /checksum|envelope|catalog|device|profile|result|EQ|observation|version|fields|duplicate|Unknown|Unsupported/i.test(String(e.message)))corrupt=true;
        else unavailable=true;
      }
    }
    return {records,corrupt,unavailable};
  }
  function current() {
    const dev=inspect(deviceStorage,'device-local');
    const tab=inspect(tabStorage,'tab-session');
    const persisted=[...dev.records,...tab.records];
    const candidates=[...persisted,...(volatile?[{...volatile,durability:'volatile'}]:[])];
    candidates.sort((a,b)=>b.revision-a.revision || (
      { 'device-local':2,'tab-session':1,'volatile':0 }[b.durability] -
      { 'device-local':2,'tab-session':1,'volatile':0 }[a.durability]
    ));
    return {dev,tab,persisted,best:candidates[0]??null};
  }
  function load() {
    const data=current(),warnings=[];
    if(data.dev.corrupt||data.tab.corrupt)warnings.push('Some catalog copies are damaged; only validated records were recovered.');
    if(data.dev.unavailable&&data.tab.unavailable)warnings.push('Local catalog storage cannot be read reliably.');
    return {
      catalog:clone(data.best?.catalog??emptyHear3Catalog()),
      revision:data.best?.revision??0,
      durability:data.best?.durability??'none',
      persistedOnDevice:data.best?.durability==='device-local',
      warnings,
    };
  }
  function save(catalog) {
    const checked=validateHear3Catalog(catalog);
    const data=current();
    const revision=(data.best?.revision??0)+1;
    const raw=persistedRecord(revision,checked);
    volatile={revision,catalog:clone(checked)};
    if(raw.length>MAX_CATALOG_JSON_CHARS) return {
      revision,durability:'volatile',persistedOnDevice:false,
      warning:'Catalog exceeds local snapshot size; export a backup before closing.',
    };
    if(!data.persisted.length && (data.dev.corrupt||data.tab.corrupt)) return {
      revision,durability:'volatile',persistedOnDevice:false,
      warning:'Damaged catalog copies were preserved. Export the temporary catalog before closing.',
    };
    for(const [storage,durability] of [[deviceStorage,'device-local'],[tabStorage,'tab-session']]) {
      if(!storage)continue;
      try {
        const slot=revision%2;
        storage.setItem(key+':'+slot,raw);
        check(storage.getItem(key+':'+slot)===raw,'Catalog write/read mismatch');
        parseRecord(raw);
        return {revision,durability,persistedOnDevice:durability==='device-local',
          warning:durability==='device-local'
            ? 'Catalog saved in this browser; clearing browser data still erases it.'
            : 'Catalog stored only for this tab session. Export a backup.'};
      } catch { /* use another local option, never a remote fallback */ }
    }
    return {
      revision,durability:'volatile',persistedOnDevice:false,
      warning:'Catalog is in temporary memory only. Export a backup before closing.',
    };
  }
  function exportBackup() { return backupText(load().catalog); }
  function clear({confirmed=false}={}){
    check(confirmed===true,'Explicit catalog deletion confirmation required');
    let errors=[];
    for(const [storage,name] of [[deviceStorage,'device-local'],[tabStorage,'tab-session']]){
      if(!storage)continue;
      for(let slot=0;slot<2;slot++){
        try {storage.removeItem(key+':'+slot);
          check(storage.getItem(key+':'+slot)===null,'Deletion unverified');
        } catch {errors.push(name+':'+slot);}
      }
    }
    volatile=null;
    return {cleared:errors.length===0,failedSlots:errors,
      warning:errors.length?'Some catalog copies could not be deleted.':null};
  }
  return Object.freeze({load,save,exportBackup,clear});
}

function parseBackup(text) {
  check(typeof text==='string' && text.length>0 && text.length<=MAX_CATALOG_JSON_CHARS,
    'Catalog backup exceeds allowed size or is empty');
  let doc;
  try { doc=JSON.parse(text); } catch { throw new Error('Invalid catalog backup JSON'); }
  check(doc && typeof doc==='object' && !Array.isArray(doc) &&
    Object.keys(doc).every(k=>['format','exportedAt','catalog','integrity'].includes(k)) &&
    doc.format===CATALOG_BACKUP_FORMAT &&
    doc.integrity?.algorithm==='fnv1a32' && typeof doc.integrity.value==='string',
    'Unknown catalog backup format');
  check(typeof doc.exportedAt==='string' && Number.isFinite(Date.parse(doc.exportedAt)),
    'Invalid catalog export timestamp');
  const catalog=validateHear3Catalog(doc.catalog);
  // Compare checksum against the exact original JSON structure to avoid
  // accepting a modified payload that normalization would silently change.
  check(checkpointFingerprint(JSON.stringify(doc.catalog))===doc.integrity.value,
    'Catalog backup checksum mismatch');
  return {catalog,exportedAt:doc.exportedAt};
}

function combineWithoutOverwrite(existing,incoming){
  const devices=[...existing.devices,...incoming.devices];
  const profiles=[...existing.profiles,...incoming.profiles];
  const results=[...existing.results,...incoming.results];
  // validateHear3Catalog rejects duplicate entity identifiers or dangling
  // references. Never silently merge distinct records under the same id.
  return validateHear3Catalog({
    catalogVersion:1,devices,profiles,results,
    activeProfileId:existing.activeProfileId??incoming.activeProfileId,
  });
}

export function createHear3CatalogBackupTransfer({store}={}) {
  check(store && typeof store.load==='function' && typeof store.save==='function',
    'Catalog store required');
  let proposed=null;
  function discard(){proposed=null;}
  function preview(text,{mode='merge-new'}={}){
    proposed=null;
    check(['merge-new','replace'].includes(mode),'Unknown catalog import mode');
    const backup=parseBackup(text);
    const current=store.load();
    const token=checkpointFingerprint(JSON.stringify({
      revision:current.revision,catalog:current.catalog,
      durability:current.durability,
    }));
    const replacement=mode==='replace';
    const catalog=replacement?backup.catalog:combineWithoutOverwrite(current.catalog,backup.catalog);
    const existingCount=current.catalog.devices.length+current.catalog.profiles.length+current.catalog.results.length;
    proposed={catalog,token,mode,needsConfirm:replacement&&existingCount>0};
    return Object.freeze({
      mode,existingCount,replacesExisting:proposed.needsConfirm,
      devices:backup.catalog.devices.length,profiles:backup.catalog.profiles.length,
      results:backup.catalog.results.length,
      outputDevices:catalog.devices.length,outputProfiles:catalog.profiles.length,
      outputResults:catalog.results.length,exportedAt:backup.exportedAt,
      warning:'FNV-1a only detects accidental corruption; this file is not authenticated.',
    });
  }
  function commit({userInitiated=false,confirmReplace=false}={}){
    check(userInitiated===true,'Catalog import needs explicit user action');
    check(proposed,'Preview a compatible catalog backup first');
    const pending=proposed;
    const now=store.load();
    check(checkpointFingerprint(JSON.stringify({
      revision:now.revision,catalog:now.catalog,durability:now.durability,
    }))===pending.token,'Catalog changed since preview; inspect the backup again');
    check(!pending.needsConfirm || confirmReplace===true,
      'Replacing an existing catalog requires separate confirmation');
    proposed=null;
    const result=store.save(clone(pending.catalog));
    return {
      imported:true,
      mode:pending.mode,
      durability:result.durability,
      persistedOnDevice:result.persistedOnDevice===true,
      warning:result.warning??null,
      requiresReload:true,
      // This module never automatically activates a profile or starts audio.
      audioStarted:false,
    };
  }
  return Object.freeze({preview,commit,discard});
}
