/**
 * Hear 3.0 - conservative legacy Hear 2.0 migration preflight (D-051/D-059/D-060).
 *
 * This adapter imports *only* device/profile identity and the manually stored
 * graphic band frequencies. No V2 threshold, EQ, mic, preference, or result
 * is silently reinterpreted as a validated V3 result. Exact V2 JSON is kept
 * in a separate exportable archive; original localStorage is never mutated.
 */
import { emptyHear3Catalog, validateHear3Catalog } from './catalog-contract.mjs';
import { checkpointFingerprint } from './local-checkpoint-store.mjs';

export const LEGACY_V2_SOURCE_KEY = 'audiocal-hear-profiles-v1';
export const LEGACY_V2_ACTIVE_KEY = 'audiocal-hear-active-v1';
export const LEGACY_ARCHIVE_FORMAT = 'hear3-preserved-legacy-v2-archive-v1';
export const MAX_LEGACY_V2_CHARS = 4_194_304;
const ensure=(v,message)=>{if(!v)throw Error(message);};
const validObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fingerprint=v=>checkpointFingerprint(JSON.stringify(v));
const deepClone=v=>JSON.parse(JSON.stringify(v));

function summarizeLegacy(rawProfiles) {
  const details = rawProfiles.map((profile,index)=>{
    ensure(validObject(profile),'Legacy profile '+(index+1)+' is malformed');
    ensure(typeof profile.id==='string'&&profile.id.length>0,
      'Legacy profile '+(index+1)+' has no stable id');
    ensure(typeof profile.name==='string'&&profile.name.trim().length>0
      &&profile.name.length<=120,
      'Legacy profile '+(index+1)+' has no usable name');
    ensure(['car','headphones','speaker'].includes(profile.type),
      'Legacy profile '+(index+1)+' has an unsupported device category');
    ensure(Array.isArray(profile.bands)&&profile.bands.length>=2&&profile.bands.length<=31,
      'Legacy profile '+(index+1)+' has an invalid EQ band count');
    const bands=profile.bands.map(Number);
    ensure(bands.every((f,i)=>Number.isFinite(f)&&f>=20&&f<=20000&&
      (i===0||f>bands[i-1])), 'Legacy profile '+(index+1)+' has invalid or unsorted EQ frequencies');
    const rawMeasures=validObject(profile.measures)?Object.values(profile.measures):[];
    const measureGroups=rawMeasures.filter(Array.isArray).length;
    const measurementRecords=rawMeasures.reduce((total,v)=>
      total+(Array.isArray(v)?v.length:0),0);
    return {
      legacyId:profile.id,
      name:profile.name,
      type:profile.type,
      bands,
      measureGroups,
      measurementRecords,
      supplementaryFields:Object.keys(profile).filter(k=>!['id','name','type','bands'].includes(k)),
    };
  });
  ensure(new Set(details.map(p=>p.legacyId)).size===details.length,
    'Duplicate legacy profile ids require manual resolution before migration');
  return details;
}

function makeArchive(rawProfilesText,activeId) {
  const archive={
    format:LEGACY_ARCHIVE_FORMAT,
    sourceKey:LEGACY_V2_SOURCE_KEY,
    activeKey:LEGACY_V2_ACTIVE_KEY,
    profilesRaw:rawProfilesText,
    activeProfileId:activeId,
  };
  return { ...archive,
    integrity:{algorithm:'fnv1a32',value:fingerprint(archive)},
  };
}

function prepare(rawProfilesText,activeId,baseline) {
  ensure(typeof rawProfilesText==='string'&&rawProfilesText.length>0&&
    rawProfilesText.length<=MAX_LEGACY_V2_CHARS, 'Legacy source is missing or exceeds size limit');
  ensure(typeof activeId==='string'&&activeId.length<=1000,'Invalid legacy active profile id');
  let parsed;
  try { parsed=JSON.parse(rawProfilesText); }
  catch { throw Error('Invalid legacy Hear 2.0 JSON; original remains untouched'); }
  ensure(Array.isArray(parsed)&&parsed.length<=200,
    'Legacy profile collection cannot be imported without manual review');
  const details=summarizeLegacy(parsed);
  const base=validateHear3Catalog(baseline);
  const existingProfiles=new Set(base.profiles.map(p=>p.id));
  const existingDevices=new Set(base.devices.map(d=>d.id));
  const devices=[...base.devices], profiles=[...base.profiles];
  const byLegacyId=new Map();
  details.forEach((item,i)=>{
    const serial=String(i+1).padStart(4,'0');
    const deviceId='legacy-v2-device-'+serial;
    const profileId='legacy-v2-profile-'+serial;
    ensure(!existingDevices.has(deviceId)&&!existingProfiles.has(profileId),
      'Legacy migration identifiers conflict with existing catalog; do not overwrite');
    devices.push({id:deviceId,name:item.name,category:item.type});
    profiles.push({
      id:profileId,deviceId,name:item.name,
      graphicEq:{
        type:'graphic',deviceId,
        bands:item.bands.map((frequencyHz,index)=>({
          id:'band-'+String(index+1).padStart(2,'0'),
          frequencyHz,
          source:'provisional',
          verification:'unverified',
        })),
      },
    });
    byLegacyId.set(item.legacyId,profileId);
  });
  const archive=makeArchive(rawProfilesText,activeId);
  const catalog=validateHear3Catalog({
    ...base,devices,profiles,
    activeProfileId:base.activeProfileId??byLegacyId.get(activeId)??null,
  });
  const unconvertedCount=details.reduce((n,d)=>n+d.measurementRecords,0);
  return {
    catalog,
    archive,
    report:{
      sourceProfiles:details.length,
      mappedDevices:details.length,
      mappedProfiles:details.length,
      mappedResults:0,
      unmigratedMeasurementRecords:unconvertedCount,
      unmigratedSupplementaryFields:details.reduce((n,d)=>n+d.supplementaryFields.length,0),
      warning:'Only device and band metadata can be mapped without inventing Hear 3 evidence. V2 measurements, EQ adjustments and other fields remain ONLY in the unaltered archive and original V2 storage. Export the archive before importing V3 profiles.',
    },
  };
}

export function createHear2MigrationTransfer({
  store,
  readLegacy,
}={}) {
  ensure(store&&typeof store.load==='function'&&typeof store.save==='function',
    'V3 catalog store required');
  ensure(typeof readLegacy==='function','Explicit read-only legacy data reader required');
  let proposal=null;

  function currentLegacy(){
    const data=readLegacy();
    ensure(data&&typeof data.profilesRaw==='string',
      'Legacy reader must provide raw profiles JSON');
    return {profilesRaw:data.profilesRaw,activeProfileId:data.activeProfileId??''};
  }
  function stateToken(state){
    return fingerprint({
      revision:state.revision,
      catalog:state.catalog,
      durability:state.durability,
      persistedOnDevice:state.persistedOnDevice,
    });
  }
  function preview() {
    proposal=null;
    const source=currentLegacy();
    const current=store.load();
    const candidate=prepare(source.profilesRaw,source.activeProfileId,current.catalog);
    proposal={
      catalog:candidate.catalog,
      archive:candidate.archive,
      baselineToken:stateToken(current),
      sourceToken:fingerprint(source),
    };
    return deepClone({
      ...candidate.report,
      requiresBackupExport:true,
      requiresExplicitConfirmation:true,
      imported:false,
      backupFormat:LEGACY_ARCHIVE_FORMAT,
      futureResultsRequireSeparateValidatedConversion:true,
    });
  }
  function exportLegacyArchive(){
    ensure(proposal!==null,'Preview legacy source before exporting');
    return JSON.stringify(proposal.archive,null,2);
  }
  function commit({userInitiated=false,confirmBackupExported=false}={}){
    ensure(userInitiated===true,'Migration requires explicit user action');
    ensure(proposal!==null,'Preview legacy source before migration');
    ensure(confirmBackupExported===true,
      'User must confirm separate preservation/export of the exact V2 archive');
    const source=currentLegacy(), current=store.load();
    ensure(fingerprint(source)===proposal.sourceToken,
      'Legacy Hear 2.0 data changed since preview; inspect again');
    ensure(stateToken(current)===proposal.baselineToken,
      'V3 catalog changed since preview; inspect again');
    const toSave=proposal.catalog;
    proposal=null;
    const result=store.save(toSave);
    return {
      migratedProfileMetadata:true,
      migratedHistoricalResults:false,
      originalV2StorageUnchanged:true,
      durability:result.durability,
      persistedOnDevice:result.persistedOnDevice===true,
      warning:result.warning??null,
      requiresReload:true,
    };
  }
  function discard(){proposal=null;}
  return Object.freeze({preview,exportLegacyArchive,commit,discard});
}
