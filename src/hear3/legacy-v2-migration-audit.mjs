/**
 * Hear 3.0 P0 — read-only audit and lossless source archive of Hear 2.0
 * profile data. Stage only profile metadata for V3 review: V2 measurements,
 * EQ/manual corrections, listening conditions and all other V2 fields stay
 * in an exact raw archive. NEVER claim a complete history migration.
 */
import { checkpointFingerprint } from './local-checkpoint-store.mjs';
import { validateHear3Catalog } from './catalog-contract.mjs';

export const LEGACY_V2_PROFILE_KEY = 'audiocal-hear-profiles-v1';
export const LEGACY_V2_ACTIVE_KEY = 'audiocal-hear-active-v1';
export const LEGACY_V2_ARCHIVE_FORMAT = 'hear3-legacy-v2-source-archive-v1';
export const MAX_LEGACY_V2_TEXT_LENGTH = 4_194_304;

const HISTORIC_FIELDS = new Set([
  'measures','sweepRecords','testBandPlan','loudness','loudnessInline',
  'personalSoundReview','manual','balance','balanceProof','taste','context',
  'channels','passes','testMode','testStart','testFloor',
  'preset','formatFrom','min','max','controlMin','controlMax',
  'step','createdAt','updatedAt',
]);
function check(test,message){if(!test)throw new Error(message);}
function obj(value){return value!==null && typeof value==='object' && !Array.isArray(value);}
function validId(value){return typeof value==='string' && value.length>0 && value.length<=100 &&
  !/[\u0000-\u001f\u007f]/.test(value);}
function isFilled(value){
  if(value===null || value===undefined)return false;
  if(Array.isArray(value))return value.length>0;
  if(obj(value))return Object.keys(value).length>0;
  return value!=='' && value!==false;
}
function summarizeProfile(profile,index){
  check(obj(profile),'Invalid V2 profile at index '+index);
  check(validId(profile.id),'V2 profile missing a stable id at index '+index);
  check(typeof profile.name==='string' && profile.name.length>0 && profile.name.length<=70,
    'V2 profile name must be reviewed at index '+index);
  check(['headphones','car','speaker'].includes(profile.type),
    'V2 device type not recognized at index '+index);
  const bands=profile.bands;
  check(Array.isArray(bands) && bands.length>=2 && bands.length<=31,
    'V2 bands require manual review at index '+index);
  check(bands.every((f,i)=>typeof f==='number' && Number.isFinite(f) &&
    f>=20 && f<=20000 && (!i||f>bands[i-1])),
    'V2 frequency ordering or units invalid at index '+index);
  const token=index+'-'+checkpointFingerprint(profile.id);
  const deviceId='legacy-device-'+token;
  const profileId='legacy-profile-'+token;
  const retainedOnlyInArchive=Object.keys(profile).filter(key=>
    !['id','name','type','bands'].includes(key) && isFilled(profile[key])
  ).sort();
  const potentiallyHistoric=retainedOnlyInArchive.filter(key=>HISTORIC_FIELDS.has(key));
  const unknownFields=retainedOnlyInArchive.filter(key=>!HISTORIC_FIELDS.has(key));
  const device={id:deviceId,name:profile.name,category:profile.type};
  const converted={
    id:profileId,deviceId,name:profile.name,
    graphicEq:{
      type:'graphic',deviceId,
      bands:bands.map((f,i)=>({
        id:'band-'+(i+1),frequencyHz:f,
        source:'provisional',verification:'unverified',
      })),
    },
  };
  return {sourceId:profile.id,device,profile:converted,retainedOnlyInArchive,
    potentiallyHistoric,unknownFields};
}

/** All raw V2 bytes are preserved inside the export, not normalized away. */
export function exportUnmodifiedLegacyV2Archive(rawProfilesText,{activeId=''}={}){
  check(typeof rawProfilesText==='string' && rawProfilesText.length>0 &&
    rawProfilesText.length<=MAX_LEGACY_V2_TEXT_LENGTH,'Invalid V2 source size');
  check(typeof activeId==='string' && activeId.length<=100,'Invalid V2 active profile');
  return JSON.stringify({
    format:LEGACY_V2_ARCHIVE_FORMAT,
    originalStorageKey:LEGACY_V2_PROFILE_KEY,
    originalActiveKey:LEGACY_V2_ACTIVE_KEY,
    sourceText:rawProfilesText,activeId,
    integrity:{
      algorithm:'fnv1a32',
      value:checkpointFingerprint(JSON.stringify({sourceText:rawProfilesText,activeId})),
    },
  },null,2);
}
export function verifyLegacyV2Archive(archiveText){
  check(typeof archiveText==='string' && archiveText.length<=MAX_LEGACY_V2_TEXT_LENGTH*2,
    'Legacy archive too large');
  let archive;
  try{archive=JSON.parse(archiveText)}catch{throw Error('Invalid V2 source archive JSON');}
  check(obj(archive) && archive.format===LEGACY_V2_ARCHIVE_FORMAT
    && archive.originalStorageKey===LEGACY_V2_PROFILE_KEY
    && archive.originalActiveKey===LEGACY_V2_ACTIVE_KEY
    && typeof archive.sourceText==='string'
    && typeof archive.activeId==='string' && archive.activeId.length<=100
    && archive.integrity?.algorithm==='fnv1a32'
    && Object.keys(archive).every(k=>[
      'format','originalStorageKey','originalActiveKey','sourceText','activeId','integrity',
    ].includes(k)), 'Unrecognized V2 source archive');
  check(archive.integrity.value===checkpointFingerprint(JSON.stringify({
    sourceText:archive.sourceText,activeId:archive.activeId,
  })),'Damaged V2 source archive');
  return {sourceText:archive.sourceText,activeId:archive.activeId};
}

/**
 * An audit is read-only. Its V3 candidate deliberately contains NO results,
 * because V2 tests are not equivalent to independently verified V3 evidence.
 * This module does not write to either storage format or import the candidate.
 */
export function auditLegacyV2Profiles(rawProfilesText,{activeId=''}={}){
  check(typeof rawProfilesText==='string' && rawProfilesText.length>0 &&
    rawProfilesText.length<=MAX_LEGACY_V2_TEXT_LENGTH,'Invalid V2 source size');
  let source;
  try{source=JSON.parse(rawProfilesText)}catch{throw Error('Invalid V2 profile JSON');}
  check(Array.isArray(source) && source.length<=200,'V2 profile list invalid or exceeds 200');
  const checked=source.map(summarizeProfile);
  const ids=new Set();
  for(const p of checked){
    check(!ids.has(p.sourceId),'Duplicate V2 profile id: migration blocked');
    ids.add(p.sourceId);
  }
  check(typeof activeId==='string' && activeId.length<=100,'Invalid V2 active profile id');
  const active=checked.find(p=>p.sourceId===activeId);
  const catalog=validateHear3Catalog({
    catalogVersion:1,
    devices:checked.map(x=>x.device),
    profiles:checked.map(x=>x.profile),
    results:[],
    activeProfileId:active?.profile.id??null,
  });
  const preview={
    sourceFormat:LEGACY_V2_PROFILE_KEY,
    profileCount:checked.length,
    candidateDevices:catalog.devices.length,
    candidateProfiles:catalog.profiles.length,
    migratedResults:0,
    skippedProfiles:0,
    activeProfileMapped:Boolean(active),
    sourceArchiveRequired:true,
    automaticCommitAllowed:false,
    // Every archived-only field remains available in the original export,
    // but is NOT silently discarded into the narrower V3 data model.
    profiles:checked.map(p=>({
      sourceId:p.sourceId,previewProfileId:p.profile.id,
      archivedOnlyFields:[...p.retainedOnlyInArchive],
      historicFields:[...p.potentiallyHistoric],
      unknownFields:[...p.unknownFields],
    })),
    warning:'Preview only. V2 measurements and edits are not V3 results. Export and verify the full original V2 archive before a separately approved migration.',
  };
  return {
    preview,
    candidateCatalog:catalog,
    originalArchive:exportUnmodifiedLegacyV2Archive(rawProfilesText,{activeId}),
  };
}
