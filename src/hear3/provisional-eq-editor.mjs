/**
 * Hear 3.0 — D-023/D-024/D-041/D-049/D-050/D-051.
 * Explicit edit/restore/export of an opt-in PROVISIONAL joint graphic EQ.
 * No audio graph, no deployment to devices, no clinical/acoustic claims.
 * All mutations must be invoked under the shared Web Locks coordinator.
 */
import {validateHear3Catalog} from './catalog-contract.mjs';
import {checkpointFingerprint} from './local-checkpoint-store.mjs';

export const HEAR3_EQ_REVIEW_FORMAT='hear3-provisional-eq-review-v1';
const caps=Object.freeze({headphones:3,car:2,speaker:2,application:3,interface:3});
const check=(ok,message)=>{if(!ok)throw Error(message);};
const clone=obj=>JSON.parse(JSON.stringify(obj));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const sign=n=>n>0?'+'+n:String(n);
const cell=s=>'"'+String(s).replaceAll('"','""')+'"';
function targetFromCatalog(catalog,resultId){
 const valid=validateHear3Catalog(catalog);
 check(typeof resultId==='string'&&resultId.length>0,'Select a saved result');
 const result=valid.results.find(x=>x.id===resultId);
 check(result,'The selected result does not exist');
 const profile=valid.profiles.find(x=>x.id===result.profileId);
 const device=valid.devices.find(x=>x.id===profile.deviceId);
 const capDb=caps[device.category];
 check(result.status==='provisional'&&result.provenance==='experimental-tone-test'&&
  result.originalEq.length===profile.graphicEq.bands.length&&
  result.currentEq.length===profile.graphicEq.bands.length,
  'Only an explicitly archived provisional subjective EQ can be edited here');
 check(result.originalEq.every(x=>finite(x.gainDb)&&Number.isInteger(x.gainDb*2)&&
  Math.abs(x.gainDb)<=capDb) &&
  result.currentEq.every(x=>finite(x.gainDb)&&Number.isInteger(x.gainDb*2)&&
  Math.abs(x.gainDb)<=capDb),
  'Stored EQ exceeds the bounded engineering policy; preserve original data');
 return {catalog:valid,result,profile,device,capDb};
}
function revisionToken(loaded){
 return checkpointFingerprint(JSON.stringify({
  revision:loaded.revision,catalog:loaded.catalog,durability:loaded.durability,
 }));
}
export function inspectHear3ProvisionalEq(catalog,resultId){
 const {result,profile,device,capDb}=targetFromCatalog(catalog,resultId);
 return Object.freeze({
  format:HEAR3_EQ_REVIEW_FORMAT,deviceName:device.name,
  deviceCategory:device.category,profileName:profile.name,
  profileId:profile.id,resultId:result.id,provenance:result.provenance,
  status:'provisional',captureTimestamp:result.capturedAt,
  capDb,stepDb:0.5,editCount:result.editHistory.length,
  rows:profile.graphicEq.bands.map((band,i)=>({
   bandId:band.id,frequencyHz:band.frequencyHz,originalGainDb:result.originalEq[i].gainDb,
   currentGainDb:result.currentEq[i].gainDb,frequencySource:band.source,
   frequencyVerification:band.verification,
  })),
  autoApplyAllowed:false,hardwarePreset:false,acousticallyValidated:false,
  hearingThresholdCalibrated:false,preampHeadroomVerified:false,
  warning:'EQ experimental derivado de tonos digitales subjetivos. No calibrado acústicamente, no valida seguridad ni posiciones físicas.',
 });
}
export function exportHear3ProvisionalEq(catalog,resultId,{format='csv',draftGains=null}={}){
 check(['txt','csv','json'].includes(format),'Unsupported review export type');
 const savedReview=inspectHear3ProvisionalEq(catalog,resultId);
 if(draftGains!==null){
  check(Array.isArray(draftGains)&&draftGains.length===savedReview.rows.length&&
   draftGains.every(v=>finite(v)&&Number.isInteger(v*2)&&
    Math.abs(v)<=savedReview.capDb),
   'Invalid visible EQ gains: export aborted rather than returning stale saved values');
 }
 const draftUnsaved=draftGains!==null&&
  draftGains.some((v,i)=>v!==savedReview.rows[i].currentGainDb);
 const review=draftGains===null?savedReview:{
  ...savedReview,draftUnsaved,rows:savedReview.rows.map((r,i)=>({
   ...r,currentGainDb:draftGains[i],
  })),
 };
 const heading='HEAR 3.0 - EQ PROVISIONAL / NO CALIBRADO / NO APLICAR AUTOMATICAMENTE';
 const rows=review.rows;
 const draftWarning=draftUnsaved?'VALORES VISIBLES AUN NO GUARDADOS EN EL HISTORIAL.':null;
 if(format==='json')return JSON.stringify(review,null,2);
 if(format==='txt')return [
  heading,
  'Equipo: '+review.deviceName+' | Perfil: '+review.profileName,
  'Una curva conjunta; +/-'+review.capDb+' dB, pasos de 0.5 dB (limites de investigacion).',
  ...(draftWarning?[draftWarning]:[]),
  ...rows.map(r=>r.frequencyHz+' Hz: '+sign(r.currentGainDb)+' dB (original: '+sign(r.originalGainDb)+' dB)'),
  'No se verificaron presion sonora, headroom, filtros fisicos o ajustes de equipo.',
 ].join('\n')+'\n';
 return [
  cell(heading),
  ...(draftWarning?[cell(draftWarning)]:[]),
  ['frecuencia_Hz','ganancia_actual_dB','ganancia_original_dB','fuente_frecuencia','verificacion_frecuencia'].map(cell).join(','),
  ...rows.map(r=>[r.frequencyHz,r.currentGainDb,r.originalGainDb,
   r.frequencySource,r.frequencyVerification].map(cell).join(',')),
  cell('No calibrado acusticamente. No preset ni instruccion automatica de aplicacion.'),
 ].join('\r\n')+'\r\n';
}
export function createHear3ProvisionalEqEditor({
 store,resultId,now=()=>Date.now(),
}={}){
 check(store&&typeof store.load==='function'&&typeof store.save==='function',
  'Writable V3 catalog store required');
 check(typeof now==='function','Clock required');
 let pending=null;
 function snapshot(){
  const loaded=store.load();
  return {...inspectHear3ProvisionalEq(loaded.catalog,resultId),
   revision:loaded.revision,persistedOnDevice:loaded.persistedOnDevice,
   durability:loaded.durability};
 }
 function discard(){pending=null;}
 function preview({values=null,restoreOriginal=false}={}){
  pending=null;
  check(restoreOriginal===true||Array.isArray(values),
   'Provide explicit band values or choose restore original');
  check(!(restoreOriginal===true&&values!==null),
   'Choose either edit values or restore original');
  const loaded=store.load(),target=targetFromCatalog(loaded.catalog,resultId);
  const {result,capDb,profile}=target;
  const bandIds=profile.graphicEq.bands.map(x=>x.id);
  const proposed=restoreOriginal?clone(result.originalEq):clone(result.currentEq);
  if(!restoreOriginal){
   check(values.length>0&&values.length<=proposed.length,'Invalid count of edited bands');
   const seen=new Set();
   for(const item of values){
    check(item&&typeof item.bandId==='string'&&
     bandIds.includes(item.bandId)&&!seen.has(item.bandId),
     'Unknown or duplicate EQ band');
    check(finite(item.gainDb)&&Number.isInteger(item.gainDb*2)&&
     Math.abs(item.gainDb)<=capDb,'Gain outside provisional EQ bounds or 0.5 dB steps');
    seen.add(item.bandId);
    proposed[bandIds.indexOf(item.bandId)].gainDb=item.gainDb;
   }
  }
  const changes=proposed.flatMap((item,i)=>{
   const previous=result.currentEq[i];
   return item.gainDb===previous.gainDb?[]:[{
    bandId:item.bandId,frequencyHz:profile.graphicEq.bands[i].frequencyHz,
    fromGainDb:previous.gainDb,toGainDb:item.gainDb,
   }];
  });
  check(changes.length>0,'No EQ changes to save');
  check(result.editHistory.length+changes.length<=1000,
   'EQ edit journal full; export your catalog before further changes');
  let at=now();
  check(Number.isSafeInteger(at)&&at>=0,'Invalid EQ edit timestamp');
  const latest=result.editHistory.at(-1)?.at??0;
  at=Math.max(at,latest+1);
  check(Number.isSafeInteger(at),'EQ edit timestamp exhausted');
  const resultNew={...result,currentEq:proposed,
   editHistory:[...result.editHistory,...changes.map(x=>({
    bandId:x.bandId,fromGainDb:x.fromGainDb,toGainDb:x.toGainDb,at,
   }))]};
  const candidate=validateHear3Catalog({
   ...target.catalog,results:target.catalog.results.map(x=>
    x.id===resultId?resultNew:x),
  });
  pending={candidate,revision:loaded.revision,token:revisionToken(loaded),
   changes:clone(changes),restoreOriginal};
  return Object.freeze({
   previewOnly:true,resultId,changeCount:changes.length,changes:clone(changes),
   restoresOriginal:restoreOriginal,requiresConfirmation:true,
   acousticValidation:'not-established',autoApplyAllowed:false,
   warning:'Manual review-only changes. No automatic EQ application, calibration, SPL or clipping certification.',
  });
 }
 function commit({userInitiated=false,confirmed=false}={}){
  check(userInitiated===true&&confirmed===true,
   'Explicit user confirmation required to save edited EQ');
  check(pending,'Preview EQ changes before committing');
  const selected=pending,loaded=store.load();
  check(loaded.revision===selected.revision&&
   revisionToken(loaded)===selected.token,
   'Catalog changed since EQ preview; inspect again');
  pending=null;
  const saved=store.save(clone(selected.candidate),
   {expectedRevision:selected.revision});
  return {saved:true,persistedOnDevice:saved.persistedOnDevice,
   revision:saved.revision,durability:saved.durability,warning:saved.warning,
   changeCount:selected.changes.length,restoredOriginal:selected.restoreOriginal,
   autoApplyAllowed:false,acousticallyValidated:false,
   legacyV2Modified:false,audioStarted:false};
 }
 return Object.freeze({snapshot,preview,commit,discard});
}
