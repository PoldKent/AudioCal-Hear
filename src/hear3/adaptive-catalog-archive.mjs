/**
 * Hear 3.0 P0 — opt-in archiving of CONFIRMED subjective tone responses.
 * Appends confirmed results to a selected compatible existing profile, or
 * creates a new profile/device only with explicit user selection.
 * Defaults to no EQ. An explicitly consented, bounded numerical EQ can
 * be stored as PROVISIONAL, never as calibrated, deployable or clinical.
 * Does not modify Hear 2.0 storage keys or downloaded backup files.
 */
import {validateHear3Catalog} from './catalog-contract.mjs';
import {calculateHear3BoundedJointEq} from './bounded-eq-engine.mjs';
import {proposeHear3ExperimentalListeningEq} from './experimental-listening-eq.mjs';
import {checkpointFingerprint} from './local-checkpoint-store.mjs';

const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const clone=v=>JSON.parse(JSON.stringify(v));
const validId=s=>typeof s==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(s);
const finite=n=>typeof n==='number'&&Number.isFinite(n);

function evidenceFromExam(exam){
 check(exam&&typeof exam.snapshot==='function'&&typeof exam.getSession==='function',
   'An actual adaptive exam is required to archive evidence');
 const status=exam.snapshot(),session=exam.getSession();
 check(status?.status==='completed'&&session?.status==='completed',
   'Only explicitly finished adaptive exams can be archived');
 check(status.profileId===session.profileId &&
   status.thresholdsEstimated===0&&status.eqGainsCalculated===0 &&
   status.activeToneId===null &&
   status.completedBands===status.totalBands,
   'Unverified clinical or unfinished adaptive evidence');
 check(status.authorizedDigitalRangeDbfs?.minDbfs===session.authorizedDigitalRangeDbfs?.minDbfs &&
   status.authorizedDigitalRangeDbfs?.maxDbfs===session.authorizedDigitalRangeDbfs?.maxDbfs &&
   finite(session.authorizedDigitalRangeDbfs?.minDbfs)&&
   finite(session.authorizedDigitalRangeDbfs?.maxDbfs),
   'Adaptive limits differ from the audio evidence');
 check(Array.isArray(status.bands)&&status.bands.length>=2&&status.bands.length<=31,
   'Invalid adaptive band count');
 check(Array.isArray(session.observations)&&session.observations.length<=2000,
   'Invalid recorded tone observations');
 check(session.invalidatedToneIds===undefined||
   Array.isArray(session.invalidatedToneIds),
   'Invalid audio invalidation record');
 const invalidated=new Set(session.invalidatedToneIds??[]);
 check(invalidated.size===(session.invalidatedToneIds??[]).length,
   'Duplicate audio invalidation record');
 const ids=new Set(),toneIds=new Set(),observations=[],rawObservations=[];
 let previous=0;
 const eqBands=status.bands.map((band,i)=>{
  check(band&&validId(band.id)&&!ids.has(band.id)&&
   finite(band.frequencyHz)&&band.frequencyHz>previous&&
   band.frequencyHz>=20&&band.frequencyHz<=20000 &&
   ['inconclusive','bounded-subjective-interval'].includes(band.status),
   'Unverified finished band layout');
  ids.add(band.id);previous=band.frequencyHz;
  check(Array.isArray(band.observations)&&band.observations.length<=40,
   'Invalid band response history');
  const heard=[],misses=[];
  for(const o of band.observations){
   check(o&&validId(o.toneId)&&!toneIds.has(o.toneId)&&
    o.frequencyHz===band.frequencyHz&&
    finite(o.digitalLevelDbfs)&&
    o.digitalLevelDbfs>=session.authorizedDigitalRangeDbfs.minDbfs&&
    o.digitalLevelDbfs<=session.authorizedDigitalRangeDbfs.maxDbfs&&
    ['heard','not-heard'].includes(o.response)&&
    ['left','right','joint'].includes(o.channel)&&
    o.channel===status.channel&&o.provenance==='user-response',
    'Unverified or duplicate subjective tone response');
   toneIds.add(o.toneId);
   rawObservations.push(clone(o));
   observations.push(invalidated.has(o.toneId)?{...clone(o),retired:true}:clone(o));
   if(!invalidated.has(o.toneId))
    (o.response==='heard'?heard:misses).push(o.digitalLevelDbfs);
  }
  if(band.status==='bounded-subjective-interval'){
   const lower=misses.length?Math.max(...misses):null;
   const upper=heard.length?Math.min(...heard):null;
   check(lower!==null&&upper!==null&&lower<upper&&
     band.intervalDbfs?.notHeardAtDbfs===lower&&
     band.intervalDbfs?.heardAtDbfs===upper,
     'Unverified subjective interval');
  }else{
   check(band.intervalDbfs===null,
    'An inconclusive band cannot supply a threshold interval');
  }
  return {id:band.id,frequencyHz:band.frequencyHz,
   source:'provisional',verification:'unverified'};
 });
 check(JSON.stringify(session.observations)===JSON.stringify(rawObservations),
  'Recorded Web Audio responses disagree with the adaptive evidence');
 for(const band of status.bands)
  if(band.reviewedOnce===true)check(
   band.observations.some(o=>invalidated.has(o.toneId)),
   'Reviewed frequency must preserve its retired responses');
 return {status,session,eqBands,observations};
}

function catalogToken(loaded){
 return checkpointFingerprint(JSON.stringify({
  revision:loaded.revision,catalog:loaded.catalog,durability:loaded.durability,
 }));
}
function examToken(evidence){
 return checkpointFingerprint(JSON.stringify({
  status:evidence.status,session:evidence.session,
 }));
}

export function createHear3AdaptiveCatalogArchive({catalogStore,exam,now=()=>Date.now()}={}){
 check(catalogStore&&typeof catalogStore.load==='function'&&
   typeof catalogStore.save==='function','A writable V3 catalog store is required');
 check(typeof now==='function','Timestamp provider is required');
 let proposed=null;
 function discard(){proposed=null;}
 function preview({
  deviceId,profileId,resultId,deviceName,profileName,category='headphones',
  includeProvisionalEq=false,reuseDeviceId=null,reuseProfileId=null,
  loudToneReports=null,
 }={}){
  check(typeof includeProvisionalEq==='boolean','Provisional EQ opt-in must be explicit');
  proposed=null;
  check(validId(deviceId)&&validId(profileId)&&validId(resultId),
   'Explicit unique device, profile and result IDs are required');
  check(new Set([deviceId,profileId,resultId]).size===3,'Archive entity IDs must differ');
  const evidence=evidenceFromExam(exam);
  const time=now();
  check(Number.isSafeInteger(time)&&time>=0,'Invalid archive timestamp');
  const current=catalogStore.load();
  check(!(reuseDeviceId!==null&&reuseProfileId!==null),
   'Choose either an existing device or an existing profile');
  const reusedProfile=reuseProfileId===null?null:
   current.catalog.profiles.find(p=>p.id===reuseProfileId);
  check(reuseProfileId===null||reusedProfile,
   'Selected saved profile no longer exists');
  const existingDeviceId=reusedProfile?.deviceId??reuseDeviceId;
  const reusedDevice=existingDeviceId===null?null:
   current.catalog.devices.find(d=>d.id===existingDeviceId);
  check(existingDeviceId===null||reusedDevice,
   'Selected saved device no longer exists');
  check(!reusedDevice||reusedDevice.category===category,
   'Stored device category differs from the current exam; review it');
  if(reusedProfile){
   const savedBands=reusedProfile.graphicEq.bands;
   check(savedBands.length===evidence.eqBands.length&&
    savedBands.every((b,i)=>b.id===evidence.eqBands[i].id&&
     b.frequencyHz===evidence.eqBands[i].frequencyHz),
    'Existing profile EQ frequencies or identities differ from the completed test');
  }
  const targetDeviceId=reusedDevice?.id??deviceId;
  const targetProfileId=reusedProfile?.id??profileId;
  const baseEq=includeProvisionalEq?calculateHear3BoundedJointEq({
   examSnapshot:evidence.status,sessionSnapshot:evidence.session,
   deviceCategory:category,
  }):null;
  // Optional subjective preference policy is recomputed from the same
  // verified immutable exam and audio history used for archival.
  // Unmatched or forged loudness events fail closed.
  check(loudToneReports===null||includeProvisionalEq,
   'A preference overlay requires explicit provisional EQ consent');
  const eq=baseEq&&loudToneReports!==null
   ?proposeHear3ExperimentalListeningEq({
     baseEq,examSnapshot:evidence.status,sessionSnapshot:evidence.session,
     loudToneReports,
    }):baseEq;
  check(!eq||(eq.autoApplyAllowed===false&&eq.validatedForProduction===false&&
   eq.channel==='joint'&&eq.bandCount===evidence.eqBands.length&&
   eq.originalEq.every((band,i)=>band.bandId===evidence.eqBands[i].id)),
   'EQ must remain a bounded review-only joint mathematical hypothesis');
  const currentEq=eq?clone(eq.currentEq):[];
  const originalEq=eq?clone(eq.originalEq):[];
  const next=validateHear3Catalog({
   ...current.catalog,
   devices:reusedDevice?current.catalog.devices:
    [...current.catalog.devices,{id:deviceId,name:deviceName,category}],
   profiles:reusedProfile?current.catalog.profiles:
    [...current.catalog.profiles,{id:profileId,deviceId:targetDeviceId,
     name:profileName,graphicEq:{type:'graphic',
      deviceId:targetDeviceId,bands:evidence.eqBands}}],
   results:[...current.catalog.results,{
    id:resultId,profileId:targetProfileId,capturedAt:time,
    status:eq?'provisional':'inconclusive',provenance:'experimental-tone-test',
    originalEq,currentEq,observations:evidence.observations,editHistory:[],
   }],
   activeProfileId:current.catalog.activeProfileId??targetProfileId,
  });
  proposed={next,catalogAtPreview:catalogToken(current),
   examAtPreview:examToken(evidence),revision:current.revision,
   includeProvisionalEq};
  return Object.freeze({
   deviceId:targetDeviceId,profileId:targetProfileId,resultId,
   deviceName:reusedDevice?.name??deviceName,
   profileName:reusedProfile?.name??profileName,category,
   reusedDevice:Boolean(reusedDevice),reusedProfile:Boolean(reusedProfile),
   subjectiveResponses:evidence.observations.filter(o=>o.retired!==true).length,
   retiredResponses:evidence.observations.filter(o=>o.retired===true).length,
   bands:evidence.eqBands.length,
   status:eq?'provisional':'inconclusive',
   originalEqBands:originalEq.length,currentEqBands:currentEq.length,
   provisionalEqOptIn:includeProvisionalEq,
   eqModelStatus:eq?.modelStatus??null,
   eqAcousticallyValidated:false,eqAutoApplyAllowed:false,
   existingResultsUnchanged:current.catalog.results.length,
   requiresConfirmation:true,
   warning:eq
    ?'Optional mathematically bounded review-only EQ: not acoustically calibrated, not a device preset and never automatically applied.'
    :'Only subjective Web Audio observations; no calibrated hearing threshold, diagnosis, SPL or usable EQ.',
  });
 }
 function commit({userInitiated=false,confirmed=false,confirmProvisionalEq=false}={}){
  check(userInitiated===true&&confirmed===true,
   'Archiving requires explicit user action and confirmation');
  check(proposed,'Review a completed exam archive before saving');
  const selected=proposed;
  check(!selected.includeProvisionalEq||confirmProvisionalEq===true,
   'Provisional EQ requires separate explicit confirmation');
  const current=catalogStore.load();
  check(catalogToken(current)===selected.catalogAtPreview,
   'Catalog changed since archive preview; review again');
  check(examToken(evidenceFromExam(exam))===selected.examAtPreview,
   'Exam evidence changed since archive preview; review again');
  proposed=null;
  // Guarded revision is optimistic conflict detection, NOT cross-tab atomicity.
  const saved=catalogStore.save(clone(selected.next),{
   expectedRevision:selected.revision,
  });
  return {
   archived:true,
   resultStatus:selected.includeProvisionalEq?'provisional':'inconclusive',
   originalEqBands:selected.includeProvisionalEq?selected.next.results.at(-1).originalEq.length:0,
   currentEqBands:selected.includeProvisionalEq?selected.next.results.at(-1).currentEq.length:0,
   provisionalEqStored:selected.includeProvisionalEq,
   autoApplyAllowed:false,validatedForProduction:false,
   revision:saved.revision,
   durability:saved.durability,
   persistedOnDevice:saved.persistedOnDevice===true,
   warning:saved.warning??null,
   acousticCalibration:'none',legacyV2Touched:false,audioStarted:false,
  };
 }
 return Object.freeze({preview,commit,discard});
}
