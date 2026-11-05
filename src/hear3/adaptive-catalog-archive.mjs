/**
 * Hear 3.0 P0 — opt-in archiving of CONFIRMED subjective tone responses.
 * Creates new device/profile/result records in the local V3 catalog.
 * Deliberately stores NO EQ, threshold, SPL or acoustic validation.
 * Does not modify Hear 2.0 storage keys or downloaded backup files.
 */
import {validateHear3Catalog} from './catalog-contract.mjs';
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
 const ids=new Set(),toneIds=new Set(),observations=[];
 let previous=0;
 const eqBands=status.bands.map((band,i)=>{
  check(band&&validId(band.id)&&!ids.has(band.id)&&
   finite(band.frequencyHz)&&band.frequencyHz>previous&&
   band.frequencyHz>=20&&band.frequencyHz<=20000 &&
   ['inconclusive','bounded-subjective-interval'].includes(band.status),
   'Unverified finished band layout');
  ids.add(band.id);previous=band.frequencyHz;
  check(Array.isArray(band.observations)&&band.observations.length<=20,
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
   toneIds.add(o.toneId);observations.push(clone(o));
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
 check(JSON.stringify(session.observations)===JSON.stringify(observations),
  'Recorded Web Audio responses disagree with the adaptive evidence');
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
 }={}){
  proposed=null;
  check(validId(deviceId)&&validId(profileId)&&validId(resultId),
   'Explicit unique device, profile and result IDs are required');
  check(new Set([deviceId,profileId,resultId]).size===3,'Archive entity IDs must differ');
  const evidence=evidenceFromExam(exam);
  const time=now();
  check(Number.isSafeInteger(time)&&time>=0,'Invalid archive timestamp');
  const current=catalogStore.load();
  const next=validateHear3Catalog({
   ...current.catalog,
   devices:[...current.catalog.devices,{id:deviceId,name:deviceName,category}],
   profiles:[...current.catalog.profiles,{id:profileId,deviceId,name:profileName,
    graphicEq:{type:'graphic',deviceId,bands:evidence.eqBands}}],
   results:[...current.catalog.results,{
    id:resultId,profileId,capturedAt:time,status:'inconclusive',
    provenance:'experimental-tone-test',
    originalEq:[],currentEq:[],observations:evidence.observations,editHistory:[],
   }],
   activeProfileId:current.catalog.activeProfileId??profileId,
  });
  proposed={next,catalogAtPreview:catalogToken(current),
   examAtPreview:examToken(evidence),revision:current.revision};
  return Object.freeze({
   deviceId,profileId,resultId,deviceName,profileName,category,
   subjectiveResponses:evidence.observations.length,
   bands:evidence.eqBands.length,
   status:'inconclusive',originalEqBands:0,currentEqBands:0,
   existingResultsUnchanged:current.catalog.results.length,
   requiresConfirmation:true,
   warning:'Only subjective Web Audio observations; no calibrated hearing threshold, diagnosis, SPL or usable EQ.',
  });
 }
 function commit({userInitiated=false,confirmed=false}={}){
  check(userInitiated===true&&confirmed===true,
   'Archiving requires explicit user action and confirmation');
  check(proposed,'Review a completed exam archive before saving');
  const selected=proposed;
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
   archived:true,resultStatus:'inconclusive',
   originalEqBands:0,currentEqBands:0,
   revision:saved.revision,
   durability:saved.durability,
   persistedOnDevice:saved.persistedOnDevice===true,
   warning:saved.warning??null,
   acousticCalibration:'none',legacyV2Touched:false,audioStarted:false,
  };
 }
 return Object.freeze({preview,commit,discard});
}
