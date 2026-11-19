/**
 * Hear — brand-new focused user journey.
 * Deliberately not mounted over the old dashboard. The validated Web Audio,
 * adaptive state, checkpoint and bounded-EQ modules remain the only engines.
 * No remote requests, autoplay, microphone, hearing diagnosis or EQ auto-apply.
 */
import {createSweepPlan,planSweepConfirmations} from './sweep-planner.mjs';
import {resolveHear3GraphicBandLayout} from './eq-band-layouts.mjs';
import {inspectHear3AudioCapabilities} from './audio-capability-preflight.mjs';
import {createHear3AdaptiveProgressStore} from './adaptive-progress-store.mjs';
import {createHear3ResumableAdaptiveExam} from './resumable-adaptive-exam.mjs';
import {calculateHear3BoundedJointEq} from './bounded-eq-engine.mjs';
import {inspectHear3ImmediateEq,formatHear3ImmediateEq} from './immediate-eq-result.mjs';
import {createHear3CatalogStore} from './catalog-backup-store.mjs';
import {createHear3AdaptiveCatalogArchive} from './adaptive-catalog-archive.mjs';

export const HEAR_FOCUS_PROFILE_ID='hear3-integrated-pilot';
export const HEAR_FOCUS_LIMITS=Object.freeze({minDbfs:-80,maxDbfs:-42});
const $=id=>document.getElementById(id);
const VIEWS=['welcome','ready','tones','result'];
const text=(id,value)=>{const node=$(id),next=String(value);if(node.textContent!==next)node.textContent=next;};
const safeError=e=>typeof e?.message==='string'&&e.message.length<280
 ?e.message:'No pudimos completar esa acción. El sonido permanece detenido.';

export function buildHearFocusLayout({preset='5',custom=''}={}){
 return resolveHear3GraphicBandLayout({
  preset,customFrequencies:custom,
 });
}
export function formatHearFocusGain(gain){return (gain>0?'+':'')+gain+' dB';}

export function mountHearFocus({doc=document,env=window}={}){
 if(!doc?.getElementById)throw Error('Hear necesita una pantalla válida');
 const element=id=>doc.getElementById(id);
 const output=(id,value)=>{const target=element(id);if(target.textContent!==String(value))target.textContent=String(value);};
 const store=createHear3AdaptiveProgressStore({profileId:HEAR_FOCUS_PROFILE_ID});
 const catalogStore=createHear3CatalogStore();
 let view='welcome',pendingRecovery=false,exam=null,eq=null,review=null;
 let bands=null,starting=false,disposed=false;
 let saveResultId=null;
 const preflight=inspectHear3AudioCapabilities(env);
 function error(e){
  const target=element('app-error');
  target.textContent=safeError(e);
  target.hidden=false;
  if(view==='ready')notice(safeError(e));
 }
 function clearError(){const target=element('app-error');target.hidden=true;target.textContent='';}
 async function run(task){
  if(disposed||starting)return;
  starting=true;clearError();
  try{await task();}
  catch(e){error(e);}
  finally{starting=false;render();}
 }
 function notice(message){output('ready-hint',message);}
 function go(next){
  if(!VIEWS.includes(next))throw Error('Pantalla desconocida');
  view=next;
  for(const id of VIEWS)element(id).hidden=id!==next;
  const step=next==='welcome'||next==='ready'?1:next==='result'?3:2;
  for(let i=1;i<=3;i++)element('p-'+i).classList.toggle('filled',i<=step);
  render();
 }
 function readCheckpoint(){return store.load().checkpoint;}
 function chooseBands(){
  const preset=element('bands').value;
  const custom=element('custom-bands').value;
  return buildHearFocusLayout({preset,custom});
 }
 function currentExamOptions(plan){
  return {plan,profileId:HEAR_FOCUS_PROFILE_ID,
   minDbfs:HEAR_FOCUS_LIMITS.minDbfs,maxDbfs:HEAR_FOCUS_LIMITS.maxDbfs,
   initialDbfs:-60,maxTrialsPerBand:7,coarseStepDb:6,
   durationSeconds:3,progressStore:store};
 }
 function createExam(plan){
  if(exam)throw Error('Esta prueba ya está en curso');
  exam=createHear3ResumableAdaptiveExam(currentExamOptions(plan));
  return exam;
 }
 function buildEq(){
  if(!exam)return false;
  const state=exam.snapshot(),session=exam.getSession();
  if(state.status!=='completed'||session.status!=='completed')return false;
  const draft=calculateHear3BoundedJointEq({
   examSnapshot:state,sessionSnapshot:session,
   deviceCategory:element('category').value,
  });
  review=inspectHear3ImmediateEq(draft);eq=draft;
  const rows=element('eq-rows');
  rows.replaceChildren(...review.rows.map(row=>{
   const section=doc.createElement('div');
   section.className='eq-row';
   const hz=doc.createElement('span');hz.className='hz';
   hz.textContent=row.frequencyHz+' Hz';
   const track=doc.createElement('div');track.className='eq-track';
   track.setAttribute('aria-hidden','true');
   const zero=doc.createElement('span');zero.className='eq-zero';
   const fill=doc.createElement('span');fill.className='eq-fill';
   const amount=Math.min(50,Math.abs(row.gainDb)/review.capDb*50);
   fill.style.left=(row.gainDb<0?50-amount:50)+'%';
   fill.style.width=amount+'%';
   track.append(zero,fill);
   const gain=doc.createElement('span');gain.className='gain';
   gain.textContent=formatHearFocusGain(row.gainDb);
   section.append(hz,track,gain);
   return section;
  }));
  output('eq-quality',review.resultStatus);
  go('result');return true;
 }
 async function begin(){
  const checkpoint=readCheckpoint();
  pendingRecovery=Boolean(checkpoint);
  element('volume-ok').checked=false;
  notice('');
  output('confirm',pendingRecovery?'Recuperar mi prueba →':'Empezar a escuchar →');
  if(pendingRecovery){
   output('ready-hint','Tu prueba anterior está guardada. Se recuperará sin reproducir sonido.');
  }
  go('ready');
 }
 async function confirmReady(){
  if(!element('volume-ok').checked){
   notice('Marca la confirmación de volumen bajo para continuar.');
   element('volume-ok').focus();
   return;
  }
  if(!preflight.canAttemptJointTone){
   throw Error('Este navegador no permite reproducir los tonos necesarios. Prueba un navegador compatible.');
  }
  if(pendingRecovery){
   if(!exam){
    const existing=readCheckpoint();
    if(!existing)throw Error('No encontramos una prueba anterior recuperable.');
    createExam(existing.plan);
    await exam.recover({userInitiated:true});
   }
   // Recover only for a newly opened page. A still-live paused exam must
   // resume from its own verified controller, never re-import over itself.
   // This user click confirms output/volume, not automatic audio playback.
   const session=exam.getSession();
   if(session.status==='paused'){
    if(session.routeCheckRequired)exam.confirmRoute({userConfirmed:true});
    exam.resume({userInitiated:true});
   }
   if(exam.snapshot().status==='completed'){
    if(exam.getSession().status==='ready')exam.finish();
    if(buildEq())return;
   }
   go('tones');return;
  }
  if(readCheckpoint())throw Error('Hay una prueba anterior. Continúala para no borrar tus respuestas.');
  bands=chooseBands();
  // The exploratory 20-second sweep is NOT required for mathematical tone
  // evidence. Each real EQ band is confirmed through independent tones.
  // An empty sweep report does not invent hearing evidence or thresholds.
  const plan=planSweepConfirmations(createSweepPlan({
   minHz:bands[0].frequencyHz,maxHz:bands.at(-1).frequencyHz,
   durationSeconds:20,
  }),[],bands);
  createExam(plan);
  go('tones');
  // The user deliberately clicked "Empezar a escuchar" *after* confirming
  // physical volume. This click starts one tone; no autoplay or subsequent
  // sounds are scheduled without another direct click.
  const started=await exam.playNext({userInitiated:true});
  if(!started.started){
   exam.interrupt({routeMayHaveChanged:true});
   throw Error('No se reprodujo el tono. Revisa tus auriculares y vuelve a confirmar el volumen.');
  }
 }
 async function toneAction(){
  if(!exam)throw Error('Todavía no hay tonos preparados.');
  const status=exam.snapshot().status;
  if(status==='paused'){
   pendingRecovery=true;
   element('volume-ok').checked=false;
   notice('El audio se interrumpió. Comprueba otra vez la salida y el volumen para continuar.');
   output('confirm','Reanudar mi prueba →');
   go('ready');return;
  }
  if(status==='completed'){
   if(exam.getSession().status==='ready')exam.finish();
   buildEq();return;
  }
  if(status!=='ready')return;
  const started=await exam.playNext({userInitiated:true});
  if(!started.started)throw Error('El tono no llegó a reproducirse de forma verificable.');
  render();
 }
 function answer(response){
  if(!exam||exam.snapshot().status!=='playing')throw Error('Primero escucha el tono.');
  exam.answer(response);
  const state=exam.snapshot();
  if(state.status==='completed'){
   exam.finish();buildEq();return;
  }
  render();
 }
 function contradiction(repeat){
  if(!exam||exam.snapshot().status!=='awaiting-confirmation')
   throw Error('No hay respuestas contradictorias por revisar.');
  exam.confirmContradiction({userConfirmed:repeat});
  render();
 }
 function interrupt(){
  if(exam&&['playing','ready','starting'].includes(exam.snapshot().status)){
   exam.interrupt({routeMayHaveChanged:false});render();
  }
 }
 function reviewPrevious(){
  if(!exam?.snapshot().canReviewPreviousBand)return;
  const band=exam.snapshot().reviewableFrequencyHz;
  if(!env.confirm('¿Repetir '+band+' Hz? Las respuestas anteriores seguirán registradas como anuladas.'))return;
  exam.retakePreviousBand({userConfirmed:true});render();
 }
 async function copyEq(){
  if(!review)throw Error('No hay ajustes que copiar.');
  const content=formatHear3ImmediateEq(review,{format:'txt'});
  if(!env.navigator?.clipboard?.writeText){
   // Clipboard APIs may be unavailable in an insecure/restricted context:
   // never claim success. TXT download remains available.
   throw Error('El portapapeles no está disponible aquí. Usa Descargar TXT.');
  }
  await env.navigator.clipboard.writeText(content);
  output('copy-status','Ajustes copiados. Ahora puedes introducirlos manualmente en tu equipo.');
 }
 function downloadEq(){
  if(!review)throw Error('Primero termina la prueba.');
  const content=formatHear3ImmediateEq(review,{format:'txt'});
  const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=doc.createElement('a');
  a.href=url;a.download='hear-ecualizador-orientativo.txt';
  doc.body.append(a);a.click();a.remove();
  env.setTimeout(()=>URL.revokeObjectURL(url),1200);
 }
 function saveEq(){
  if(!eq||!exam)throw Error('Primero obtén tu ecualizador.');
  if(!element('save-consent').checked){
   output('save-status','Confirma primero que deseas conservar los datos en este navegador.');
   return;
  }
  if(!env.confirm('¿Guardar tus respuestas y el EQ matemático provisional en este navegador? No se aplicará al equipo.'))return;
  if(!env.crypto?.randomUUID)throw Error('Para guardar se necesita una conexión segura del navegador.');
  const uuid=()=>env.crypto.randomUUID();
  const category=element('category').value;
  const name={headphones:'Mis auriculares',speaker:'Mis altavoces',car:'Mi automóvil',
   application:'Mi aplicación',interface:'Mi interfaz de audio'}[category];
  const archive=createHear3AdaptiveCatalogArchive({catalogStore,exam});
  const preview=archive.preview({
   deviceId:'v3-device-'+uuid(),profileId:'v3-profile-'+uuid(),
   resultId:'v3-result-'+uuid(),deviceName:name,profileName:'Mi prueba Hear',
   category,includeProvisionalEq:true,
  });
  const saved=archive.commit({
   userInitiated:true,confirmed:true,confirmProvisionalEq:true,
  });
  saveResultId=preview.resultId;
  output('save-status',saved.persistedOnDevice
   ?'Guardado en este navegador. Puedes consultarlo en Ayuda y datos.'
   :'No pudimos verificar el guardado permanente. Descarga una copia TXT.');
 }
 function render(){
  if(disposed)return;
  if(view==='welcome'){
   const checkpoint=readCheckpoint();
   output('begin',checkpoint?'Continuar mi prueba →':'Empezar prueba →');
  }
  if(view==='tones'&&exam){
   const state=exam.snapshot();
   if(state.status==='completed'){
    if(exam.getSession().status==='completed'){buildEq();return;}
    if(!starting){exam.finish();buildEq();return;}
   }
   const index=Math.min(state.completedBands+1,state.totalBands);
   const current=state.bands.find(b=>b.id===state.currentBandId);
   output('tone-hz',current?current.frequencyHz+' Hz':'—');
   output('band-count','Frecuencia '+index+' de '+state.totalBands);
   element('band-progress').max=state.totalBands;
   element('band-progress').value=state.completedBands;
   const playing=state.status==='playing';
   const uncertain=state.status==='awaiting-confirmation';
   element('tone-answers').hidden=!playing;
   element('tone-uncertain').hidden=!uncertain;
   element('tone-play').hidden=playing||uncertain||state.status==='starting';
   element('tone-stop').hidden=!['playing','starting'].includes(state.status);
   element('tone-review').hidden=!state.canReviewPreviousBand||playing||uncertain;
   const paused=state.status==='paused';
   output('tone-title',playing?'¿Escuchas este tono?':paused?'Sonido detenido':
    uncertain?'Necesitamos confirmar una respuesta':'Escucha el siguiente tono');
   output('tone-note',playing?'Responde mientras escuchas.':
    paused?'Comprueba los auriculares y confirma el volumen antes de reanudar.':
    uncertain?'Puedes repetir el tono o dejar esta frecuencia sin estimación.':
     'Pulsa el botón. El sonido nunca comenzará automáticamente.');
   output('tone-play',paused?'Continuar mi prueba →':'Escuchar tono ▶');
  }
 }
 const listen=(id,fn)=>element(id).addEventListener('click',()=>void run(fn));
 listen('begin',begin);
 listen('confirm',confirmReady);
 listen('tone-play',toneAction);
 listen('tone-yes',()=>answer('heard'));
 listen('tone-no',()=>answer('not-heard'));
 listen('tone-repeat',()=>contradiction(true));
 listen('tone-skip',()=>contradiction(false));
 listen('tone-stop',interrupt);
 listen('tone-review',reviewPrevious);
 listen('copy-eq',copyEq);
 listen('download-eq',downloadEq);
 listen('save-eq',saveEq);
 element('bands').addEventListener('change',()=>{
  const custom=element('bands').value==='custom';
  element('custom-bands').hidden=!custom;
  element('custom-label').hidden=!custom;
 });
 element('volume-ok').addEventListener('change',()=>{if(element('volume-ok').checked)notice('');});
 const stopKey=e=>{
  if(e.key==='Escape'&&!e.repeat&&!e.altKey&&!e.metaKey&&!e.ctrlKey){
   if(view==='tones'&&['playing','starting'].includes(exam?.snapshot().status)){
    e.preventDefault();interrupt();
   }
  }
 };
 doc.addEventListener('keydown',stopKey);
 const timer=env.setInterval(render,250);
 const onLeave=()=>{
  if(disposed)return;
  disposed=true;
  env.clearInterval(timer);
  if(exam){
   if(exam.getSession().status!=='completed'){
    try{exam.interrupt({routeMayHaveChanged:true});}catch{}
   }
   void exam.dispose();
  }
  doc.removeEventListener('keydown',stopKey);
 };
 env.addEventListener('pagehide',onLeave,{once:true});
 render();
 return Object.freeze({getView:()=>view,getExam:()=>exam,stop:interrupt,dispose:onLeave,
  getEq:()=>eq});
}
if(typeof document!=='undefined'){
 const boot=()=>mountHearFocus();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
}
