/**
 * Hear — brand-new focused user journey.
 * Deliberately not mounted over the old dashboard. The validated Web Audio,
 * adaptive state, checkpoint and bounded-EQ modules remain the only engines.
 * No remote requests, autoplay, microphone, hearing diagnosis or EQ auto-apply.
 */
import {createSweepPlan,planSweepConfirmations,frequencyAtSweepTime} from './sweep-planner.mjs';
import {createSweepAudioRunner} from './sweep-audio-runner.mjs';
import {proposeHear3ExperimentalListeningEq} from './experimental-listening-eq.mjs';
import {resolveHear3GraphicBandLayout} from './eq-band-layouts.mjs';
import {inspectHear3AudioCapabilities} from './audio-capability-preflight.mjs';
import {createHear3AdaptiveProgressStore} from './adaptive-progress-store.mjs';
import {createHear3ResumableAdaptiveExam} from './resumable-adaptive-exam.mjs';
import {calculateHear3BoundedJointEq} from './bounded-eq-engine.mjs';
import {inspectHear3ImmediateEq,formatHear3ImmediateEq} from './immediate-eq-result.mjs';
import {createHear3CatalogStore} from './catalog-backup-store.mjs';
import {createHear3AdaptiveCatalogArchive} from './adaptive-catalog-archive.mjs';
import {enableHear3Offline,disableHear3Offline,detectHear3OfflineSupport}
 from './offline-optin.mjs';
import {translateHear3Ui} from './app-i18n.mjs';

export const HEAR_FOCUS_PROFILE_ID='hear3-integrated-pilot';
export const HEAR_FOCUS_LIMITS=Object.freeze({minDbfs:-80,maxDbfs:-42});
const $=id=>document.getElementById(id);
const VIEWS=['welcome','ready','sweep','tones','result'];
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
 // Only equipment category and declared EQ frequencies are remembered.
 // The verified tone checkpoint remains the source of truth for progression.
 const eqEquipmentKey='hear3:focus-equipment:v1';
 const allowedCategories=new Set(['headphones','speaker','car','application','interface']);
 const allowedBandPresets=new Set(['4','5','7','10','15','31','custom']);
 function restoreEquipment(){
  try{
   const saved=JSON.parse(env.localStorage?.getItem(eqEquipmentKey)||'null');
   if(!saved||!allowedCategories.has(saved.category)||!allowedBandPresets.has(saved.preset))return;
   const custom=typeof saved.custom==='string'&&saved.custom.length<=360?saved.custom:'';
   buildHearFocusLayout({preset:saved.preset,custom});
   element('category').value=saved.category;
   element('bands').value=saved.preset;
   element('custom-bands').value=custom;
   element('custom-bands').hidden=saved.preset!=='custom';
   element('custom-label').hidden=saved.preset!=='custom';
  }catch{}
 }
 function rememberEquipment(){
  try{env.localStorage?.setItem(eqEquipmentKey,JSON.stringify({
   category:element('category').value,preset:element('bands').value,
   custom:element('custom-bands').value,
  }));}catch{}
 }
 restoreEquipment();
 const catalogStore=createHear3CatalogStore();
 let view='welcome',pendingRecovery=false,exam=null,eq=null,review=null;
 let bands=null,sweepPlan=null,starting=false,disposed=false;
 let saveResultId=null;
 const preflight=inspectHear3AudioCapabilities(env);
 // A perception of 'too loud' is never a hearing threshold or acoustic
 // measurement. Keep it scoped to the current local exam and verify every
 // marked tone ID against the finished audio session before using it.
 const loudKey='hear3:focus-loudness:v1';
 function restoreLoud(){
  try{
   const parsed=JSON.parse(env.sessionStorage?.getItem(loudKey)||'null');
   return parsed?.profileId===HEAR_FOCUS_PROFILE_ID&&
    Array.isArray(parsed.reports)&&parsed.reports.length<=64?parsed.reports:[];
  }catch{return [];}
 }
 let loudReports=restoreLoud();
 function clearLoud(){
  loudReports=[];
  try{env.sessionStorage?.removeItem(loudKey);}catch{}
 }
 function markLoud(report){
  if(loudReports.some(x=>x.toneId===report.toneId))return;
  loudReports.push({toneId:report.toneId,frequencyHz:report.frequencyHz});
  if(loudReports.length>64)loudReports=loudReports.slice(-64);
  try{env.sessionStorage?.setItem(loudKey,JSON.stringify({
   profileId:HEAR_FOCUS_PROFILE_ID,reports:loudReports,
  }));}catch{}
 }
 if(!store.load().checkpoint)clearLoud();
 const sweep=createSweepAudioRunner({
  onEnded:()=>{if(!disposed&&view==='sweep')void run(prepareTonesFromSweep);},
  onInterrupted:()=>{if(!disposed&&view==='sweep'){
   go('ready');notice('El barrido se detuvo. Comprueba el volumen físico antes de continuar.');
  }},
 });
 const themeKey='hear3:ui-theme:v1',themeChoice=element('hear3-theme-choice');
 const allowedThemes=new Set(['system','light','dark']);
 const media=env.matchMedia?.('(prefers-color-scheme: dark)');
 let theme='system';
 try{const stored=env.localStorage?.getItem(themeKey);
  if(allowedThemes.has(stored))theme=stored;}catch{}
 function applyTheme(){
  doc.documentElement.dataset.hear3Theme=theme==='system'
   ?media?.matches?'dark':'light':theme;
  themeChoice.value=theme;
 }
 applyTheme();
 themeChoice.addEventListener('change',()=>{
  if(!allowedThemes.has(themeChoice.value))return;
  theme=themeChoice.value;
  try{if(theme==='system')env.localStorage.removeItem(themeKey);
   else env.localStorage.setItem(themeKey,theme);}catch{}
  applyTheme();
 });
 const onThemeChange=()=>{if(theme==='system')applyTheme();};
 media?.addEventListener?.('change',onThemeChange);
 const support=element('ajustes');
 const openHelp=()=>{if(env.location?.hash==='#ajustes')support.open=true;};
 env.addEventListener('hashchange',openHelp);
 openHelp();
 const offlineStatus=element('offline-status');
 const offlineOn=element('offline-enable'),offlineOff=element('offline-disable');
 const offlineSupported=detectHear3OfflineSupport(env).supported;
 if(!offlineSupported){
  offlineOn.disabled=true;offlineOff.disabled=true;
  offlineStatus.textContent='La instalación sin conexión no está disponible.';
 }else offlineStatus.textContent='Disponible, sin descargar nada automáticamente.';
 async function optOffline(enable){
  const action=enable?offlineOn:offlineOff;action.disabled=true;
  offlineStatus.textContent=enable?'Guardando recursos…':'Retirando recursos…';
  try{
   const result=enable?await enableHear3Offline({env}):await disableHear3Offline({env});
   offlineStatus.textContent=enable
    ?'Recursos estáticos verificados: '+result.staticResources+'. '+result.warning
    :result.complete?'Se solicitó retirar los recursos sin conexión. '+result.warning
      :'No pudimos confirmar la retirada total de la descarga.';
  }catch(e){offlineStatus.textContent=safeError(e);}
  finally{action.disabled=!offlineSupported;}
 }
 offlineOn.addEventListener('click',()=>void optOffline(true));
 offlineOff.addEventListener('click',()=>void optOffline(false));
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
  const base=calculateHear3BoundedJointEq({
   examSnapshot:state,sessionSnapshot:session,
   deviceCategory:element('category').value,
  });
  // All three perceptions affect a bounded hypothesis, never raw hardware.
  const draft=proposeHear3ExperimentalListeningEq({
   baseEq:base,examSnapshot:state,sessionSnapshot:session,
   loudToneReports:loudReports,
  });
  review=inspectHear3ImmediateEq(draft);eq=draft;
  const rows=element('eq-rows');
  rows.replaceChildren(...review.rows.map(row=>{
   const section=doc.createElement('div');
   section.className='eq-row';
   const hz=doc.createElement('span');hz.className='hz';
   hz.textContent=row.frequencyHz+' Hz';
   const reason=doc.createElement('small');
   reason.className='eq-reason';
   reason.textContent=row.source==='explicit-too-loud-attenuate'?'Bajar':
    row.source==='inaudible-at-digital-ceiling-hypothesis'?'Explorar subida':
    row.source==='heard-without-contrast-maintain'?'Mantener':
    row.gainDb>0?'Explorar subida':row.gainDb<0?'Explorar bajada':'Mantener';
   hz.append(reason);
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
  output('eq-quality',
   'Curva experimental con límite de '+draft.capDb+' dB: '+
   review.rows.filter(r=>r.gainDb>0).length+' subidas pequeñas, '+
   review.rows.filter(r=>r.gainDb<0).length+' bajadas, '+
   review.rows.filter(r=>r.gainDb===0).length+' bandas sin cambio.');
  go('result');return true;
 }
 async function prepareTonesFromSweep(){
  if(view!=='sweep'||exam||!bands||!sweepPlan)return;
  const finished=sweep.lastResult();
  const reports=finished?.reports??[];
  const plan=planSweepConfirmations(sweepPlan,reports,bands);
  createExam(plan);
  // Always silent after the sweep. Each discrete tone needs an explicit click.
  go('tones');
 }
 function markSweep(heard){
  if(view!=='sweep'||sweep.snapshot().status!=='playing')return;
  const report=sweep.recordResponse(heard);
  output('sweep-feedback',(heard?'Se oye bien':'No se oye')+
   ' cerca de '+Math.round(report.frequencyHz)+' Hz. Continúa escuchando.');
 }
 function skipSweep(){
  if(view!=='sweep')return;
  sweep.stop('user-skipped');
  return prepareTonesFromSweep();
 }
 function loudSweep(){
  if(view!=='sweep'||sweep.snapshot().status!=='playing')return;
  // A discomfort indication immediately silences this continuous tone.
  // Sweep reports are only navigation hints and must be retested separately.
  try{sweep.recordResponse(true);}finally{sweep.stop('reported-uncomfortable');}
  output('sweep-feedback','Barrido detenido por incomodidad. No subas el volumen físico.');
  return prepareTonesFromSweep();
 }
 async function begin(){
  // The primary journey always takes precedence over secondary tools.
  support.open=false;
  element('foot-tech').open=false;
  const checkpoint=readCheckpoint();
  pendingRecovery=Boolean(checkpoint);
  element('recovery-options').hidden=!pendingRecovery;
  element('recovery-options').open=false;
  element('volume-ok').checked=false;
  notice('');
  output('confirm',pendingRecovery?'Recuperar mi prueba →':'Empezar a escuchar →');
  if(pendingRecovery){
   output('ready-hint','Tu prueba anterior está guardada. Se recuperará sin reproducir sonido.');
  }
  go('ready');
 }
 function downloadProgress(){
  if(!readCheckpoint())throw Error('No hay una prueba a medias para descargar.');
  const content=store.exportBackup();
  const blob=new Blob([content],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=doc.createElement('a');
  a.href=url;a.download='hear-prueba-en-curso.json';
  doc.body.append(a);a.click();a.remove();
  env.setTimeout(()=>URL.revokeObjectURL(url),1200);
 }
 async function resetProgress(){
  if(!readCheckpoint())throw Error('No encontramos una prueba anterior para eliminar.');
  const wasResult=view==='result';
  if(!env.confirm(wasResult
   ?'¿Hacer otra prueba? Se descartará la sesión actual y el EQ no guardado. Los resultados que ya guardaste permanecerán intactos.'
   :'¿Eliminar solamente la prueba incompleta y comenzar otra? Los perfiles y resultados ya guardados no se borrarán.'))return;
  let outcome;
  if(exam){
   outcome=exam.clearCheckpoint({confirmed:true});
   await exam.dispose();
   exam=null;
  }else outcome=store.clear({confirmed:true});
  if(!outcome.cleared)throw Error('No pudimos verificar que el progreso anterior se haya eliminado.');
  pendingRecovery=false;eq=null;review=null;
  sweepPlan=null;
  sweep.stop('reset');
  clearLoud();
  element('recovery-options').hidden=true;
  element('recovery-options').open=false;
  element('volume-ok').checked=false;
  output('confirm','Empezar a escuchar →');
  if(wasResult)go('ready');
  notice('Puedes comenzar otra prueba. Confirma el volumen físico bajo antes de escuchar.');
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
  rememberEquipment();
  clearLoud();
  sweepPlan=createSweepPlan({
   minHz:bands[0].frequencyHz,maxHz:bands.at(-1).frequencyHz,
   durationSeconds:20,
  });
  go('sweep');
  try{
   const started=await sweep.start({
    plan:sweepPlan,digitalLevelDbfs:-60,
    authorizedDigitalRangeDbfs:HEAR_FOCUS_LIMITS,
    channel:'joint',userInitiated:true,
   });
   if(!started.started)throw Error('El barrido no se pudo reproducir.');
  }catch(e){
   sweep.stop('failed-to-start');go('ready');throw e;
  }
 }
 async function toneAction(){
  if(!exam)throw Error('Todavía no hay tonos preparados.');
  const status=exam.snapshot().status;
  if(status==='paused'){
   // Normal completion without an answer leaves no new hearing evidence.
   // If the audio route has not changed, a single deliberate replay click
   // resumes the existing silent session without another setup form.
   if(!exam.getSession().routeCheckRequired){
    exam.resume({userInitiated:true});
    const replay=await exam.playNext({userInitiated:true});
    if(!replay.started)throw Error('El tono no se pudo repetir. Comprueba el sonido.');
    render();return;
   }
   pendingRecovery=true;
   element('volume-ok').checked=false;
   notice('La salida de audio cambió. Confirma otra vez el equipo y el volumen antes de continuar.');
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
  const active=exam.snapshot();
  const band=active.bands.find(b=>b.id===active.currentBandId);
  exam.answer(response==='too-loud'?'heard':response);
  if(response==='too-loud'&&band){
   markLoud({toneId:active.activeToneId,frequencyHz:band.frequencyHz});
  }
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
  if(view==='sweep'){
   sweep.stop('user-stop');
   go('ready');
   notice('Barrido detenido. Revisa el volumen y vuelve a comenzar cuando quieras.');
  }else if(exam&&['playing','ready','starting'].includes(exam.snapshot().status)){
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
   category,includeProvisionalEq:true,loudToneReports:loudReports,
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
   const lang=doc.documentElement.lang?.split('-')[0]||'es';
   const beginText=translateHear3Ui('home.start',lang)||'Comenzar mi prueba';
   const resumeText=translateHear3Ui('console.recover',lang)||'Continuar mi prueba';
   output('begin',(checkpoint?resumeText:beginText)+' →');
  }
  if(view==='sweep'){
   const current=sweep.snapshot();
   if(current.status==='playing'){
    const elapsed=current.elapsedSeconds;
    element('sweep-progress').value=elapsed;
    output('sweep-time',Math.ceil(Math.max(0,20-elapsed))+' s');
    output('sweep-hz',Math.round(frequencyAtSweepTime(current.plan,elapsed))+' Hz');
   }
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
   const changedRoute=paused&&exam.getSession().routeCheckRequired;
   output('tone-note',playing?'¿Lo escuchas bien, no lo escuchas o te resulta demasiado fuerte?':
    changedRoute?'La salida cambió. Confirma el volumen antes de continuar.':
    paused?'El tono terminó sin respuesta. Puedes escucharlo otra vez.':
    uncertain?'Puedes repetir el tono o dejar esta frecuencia sin estimación.':
     'Pulsa el botón. El sonido nunca comenzará automáticamente.');
   output('tone-play',changedRoute?'Comprobar equipo →':
    paused?'Repetir tono ▶':'Escuchar tono ▶');
  }
 }
 const listen=(id,fn)=>element(id).addEventListener('click',()=>void run(fn));
 listen('begin',begin);
 listen('confirm',confirmReady);
 listen('sweep-yes',()=>markSweep(true));
 listen('sweep-no',()=>markSweep(false));
 listen('sweep-loud',loudSweep);
 listen('sweep-skip',skipSweep);
 listen('sweep-stop',interrupt);
 listen('download-progress',downloadProgress);
 listen('reset-progress',resetProgress);
 listen('new-test',resetProgress);
 listen('tone-play',toneAction);
 listen('tone-yes',()=>answer('heard'));
 listen('tone-no',()=>answer('not-heard'));
 listen('tone-loud',()=>answer('too-loud'));
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
   if(view==='sweep'||(view==='tones'&&['playing','starting'].includes(exam?.snapshot().status))){
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
  sweep.stop('pagehide');
  void sweep.dispose();
  if(exam){
   if(exam.getSession().status!=='completed'){
    try{exam.interrupt({routeMayHaveChanged:true});}catch{}
   }
   void exam.dispose();
  }
  doc.removeEventListener('keydown',stopKey);
  env.removeEventListener('hashchange',openHelp);
  media?.removeEventListener?.('change',onThemeChange);
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
