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
import {inspectHear3ImmediateEq,formatHear3ImmediateEq,paintHear3ImmediateEqPng} from './immediate-eq-result.mjs';
import {createHear3CatalogStore} from './catalog-backup-store.mjs';
import {createHear3AdaptiveCatalogArchive} from './adaptive-catalog-archive.mjs';
import {enableHear3Offline,disableHear3Offline,detectHear3OfflineSupport}
 from './offline-optin.mjs';
import {translateHear3Ui} from './app-i18n.mjs';
import {createHear3EqEditHistory} from './eq-edit-history.mjs';

export const HEAR_FOCUS_PROFILE_ID='hear3-integrated-pilot';
export const HEAR_FOCUS_LIMITS=Object.freeze({minDbfs:-80,maxDbfs:-42});
export const HEAR_FOCUS_TONE_DURATION_SECONDS=3;
export const HEAR_FOCUS_START_LEVELS=Object.freeze([-60,-54,-48]);
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
 const tr=(key,values={})=>{
  const lang=doc.documentElement.lang?.split('-')[0]||'es';
  let result=translateHear3Ui('focus.d.'+key,lang)??key;
  for(const [name,value] of Object.entries(values))
   result=result.replaceAll('{'+name+'}',String(value));
  return result;
 };
 const msg=(key,values={})=>{
  const lang=doc.documentElement.lang?.split('-')[0]||'es';
  let result=translateHear3Ui('focus.m.'+key,lang)??key;
  for(const [name,value] of Object.entries(values))
   result=result.replaceAll('{'+name+'}',String(value));
  return result;
 };
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
 let initialLevel=-60;
 let lastAnnouncedToneId=null;
 let activeToneStartedAt=null;
 let saveResultId=null,eqHistory=null,originalReview=null;
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
 function verifiedLoudReports(session){
  const retired=new Set(session.invalidatedToneIds??[]);
  // The verified checkpoint is authoritative across tabs or reloads.
  // Legacy tab-session marks may still exist; merge only unique, non-retired
  // IDs. The experimental EQ module verifies every matched audible tone.
  const stored=exam?.getLoudToneReports?.()??[];
  const all=[...stored,...loudReports];
  const seen=new Set();
  return all.filter(r=>{
   if(retired.has(r.toneId)||seen.has(r.toneId))return false;
   seen.add(r.toneId);return true;
  });
 }
 function markLoud(report){
  // The checkpoint commits this report only after the corresponding verified
  // "heard" observation exists. An invalid record fails without contaminating
  // the optional experimental EQ calculation.
  exam?.rememberLoudTone?.(report);
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
   go('ready');notice(msg('sweepInterrupted'));
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
  offlineStatus.textContent=msg('offlineUnsupported');
 }else offlineStatus.textContent=msg('offlineAvailable');
 async function optOffline(enable){
  const action=enable?offlineOn:offlineOff;action.disabled=true;
  offlineStatus.textContent=msg(enable?'offlineSaving':'offlineRemoving');
  try{
   const result=enable?await enableHear3Offline({env}):await disableHear3Offline({env});
   offlineStatus.textContent=enable
    ?msg('offlineReady',{n:result.staticResources})
    :msg(result.complete?'offlineRemoved':'offlineRemovalPartial');
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
  const changed=view!==next;
  view=next;
  for(const id of VIEWS)element(id).hidden=id!==next;
  const step=next==='welcome'||next==='ready'?1:next==='result'?3:2;
  for(let i=1;i<=3;i++)element('p-'+i).classList.toggle('filled',i<=step);
  render();
  // Stage transitions must not strand keyboard focus on a hidden button.
  // Focusing headings never schedules audio playback.
  if(changed&&view===next){
   const heading=element(next).querySelector('h1');
   heading?.setAttribute('tabindex','-1');
   heading?.focus({preventScroll:true});
  }
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
   initialDbfs:initialLevel,maxTrialsPerBand:7,coarseStepDb:6,
   durationSeconds:HEAR_FOCUS_TONE_DURATION_SECONDS,progressStore:store};
 }
 function createExam(plan){
  if(exam)throw Error('Esta prueba ya está en curso');
  exam=createHear3ResumableAdaptiveExam(currentExamOptions(plan));
  return exam;
 }
 function editMsg(key,values={}){
  const lang=doc.documentElement.lang?.split('-')[0]||'es';
  return Object.entries(values).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),translateHear3Ui('focus.edit.'+key,lang));
 }
 function eqReason(row){
  if(row.source==='manual-user-adjustment')return editMsg('manual');
  return row.source==='explicit-too-loud-attenuate'?msg('eqCut'):
   row.source==='inaudible-at-digital-ceiling-hypothesis'?msg('eqBoost'):
   row.source==='heard-without-contrast-maintain'?msg('eqMaintain'):
   row.gainDb>0?msg('eqBoost'):row.gainDb<0?msg('eqCutExplore'):msg('eqMaintain');
 }
 function renderEqText(){
  if(!review)return;
  const labels=element('eq-rows').querySelectorAll('.eq-reason');
  review.rows.forEach((row,i)=>{
   const value=eqReason(row);
   if(labels[i]&&labels[i].textContent!==value)labels[i].textContent=value;
  });
  output('eq-quality',msg('eqSummary',{
   cap:eq.capDb,
   up:review.rows.filter(r=>r.gainDb>0).length,
   down:review.rows.filter(r=>r.gainDb<0).length,
   flat:review.rows.filter(r=>r.gainDb===0).length,
  }));
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
   loudToneReports:verifiedLoudReports(session),
  });
  originalReview=inspectHear3ImmediateEq(draft);eq=draft;
  eqHistory=createHear3EqEditHistory({initial:originalReview.rows.map(r=>r.gainDb),capDb:originalReview.capDb});
  element('eq-edit-options').open=false;
  createEqEditControls();
  syncEqEdits();
  go('result');return true;
 }
 function renderEqGraph(){
  const graph=element('eq-graph');
  graph.replaceChildren(...review.rows.map(row=>{
   const cell=doc.createElement('div');cell.className='eq-graph-band';
   cell.dataset.direction=row.gainDb>0?'up':row.gainDb<0?'down':'neutral';
   const area=doc.createElement('div');area.className='eq-graph-area';
   const zero=doc.createElement('span');zero.className='eq-graph-zero';
   const bar=doc.createElement('span');bar.className='eq-graph-bar';
   const height=Math.min(79,Math.abs(row.gainDb)/review.capDb*78);
   bar.style.height=Math.max(2,height)+'px';
   bar.style.top=row.gainDb>=0?(80-height)+'px':'80px';
   area.append(zero,bar);
   const hz=doc.createElement('small');hz.className='eq-graph-frequency';
   hz.textContent=row.frequencyHz+' Hz';
   const db=doc.createElement('small');db.className='eq-graph-gain';
   db.textContent=formatHearFocusGain(row.gainDb);
   cell.append(area,db,hz);
   return cell;
  }));
  const rows=element('eq-rows');
  rows.replaceChildren(...review.rows.map(row=>{
   const section=doc.createElement('div');
   section.className='eq-row';
   section.dataset.direction=row.gainDb>0?'up':row.gainDb<0?'down':'neutral';
   const hz=doc.createElement('span');hz.className='hz';
   hz.textContent=row.frequencyHz+' Hz';
   const reason=doc.createElement('small');
   reason.className='eq-reason';
   reason.textContent=eqReason(row);
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
  renderEqText();
 }
 const changedBands=()=>eqHistory?eqHistory.current().filter((v,i)=>v!==eqHistory.original()[i]).length:0;
 function createEqEditControls(){
  const container=element('focus-edit-bands');
  container.replaceChildren(...originalReview.rows.map((r,i)=>{
   const row=doc.createElement('div');row.className='eq-edit-band';
   const id='focus-edit-band-'+i;
   const label=doc.createElement('label');label.htmlFor=id;label.textContent=r.frequencyHz+' Hz';
   const input=doc.createElement('input');input.type='range';input.id=id;
   input.min=String(-originalReview.capDb);input.max=String(originalReview.capDb);input.step='0.5';
   input.dataset.testid=id;input.value=String(r.gainDb);
   const value=doc.createElement('span');value.className='eq-edit-value';
   const reset=doc.createElement('button');reset.type='button';reset.className='small-action';
   reset.dataset.testid='focus-edit-reset-'+i;
   input.addEventListener('input',()=>{
    if(saveResultId||!eqHistory)return;
    const next=[...eqHistory.current()];next[i]=Number(input.value);
    eqHistory.record(next);syncEqEdits();
   });
   reset.addEventListener('click',()=>{
    if(!saveResultId&&eqHistory){eqHistory.resetBand(i);syncEqEdits();}
   });
   row.append(label,input,value,reset);
   return row;
  }));
 }
 function syncEqEditor(){
  if(!eqHistory||!originalReview)return;
  const values=eqHistory.current(),original=eqHistory.original();
  const disabled=Boolean(saveResultId);
  [...element('focus-edit-bands').children].forEach((row,i)=>{
   const [label,input,value,reset]=row.children;
   const hz=originalReview.rows[i].frequencyHz;
   input.value=String(values[i]);input.disabled=disabled;
   input.setAttribute('aria-label',editMsg('gainLabel',{hz}));
   input.setAttribute('aria-valuetext',formatHearFocusGain(values[i]));
   value.textContent=formatHearFocusGain(values[i]);
   reset.textContent=editMsg('bandReset');reset.setAttribute('aria-label',editMsg('bandLabel',{hz}));
   reset.disabled=disabled||values[i]===original[i];
  });
  const count=changedBands();
  element('focus-edit-undo').disabled=disabled||!eqHistory.canUndo();
  element('focus-edit-redo').disabled=disabled||!eqHistory.canRedo();
  element('focus-edit-restore').disabled=disabled||count===0;
  output('focus-edit-status',disabled?editMsg('saved'):count?editMsg('changed',{n:count}):editMsg('original'));
 }
 function syncEqEdits(){
  if(!eqHistory||!originalReview)return;
  const values=eqHistory.current();
  const edited=changedBands()>0;
  review=Object.freeze({...originalReview,
   warning:originalReview.warning+(edited?' Ajustes manuales: no son una nueva medición auditiva.':''),
   rows:Object.freeze(originalReview.rows.map((r,i)=>Object.freeze({
    ...r,gainDb:values[i],source:values[i]===r.gainDb?r.source:'manual-user-adjustment',
   }))),
  });
  renderEqGraph();
  syncEqEditor();
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
  output('sweep-feedback',msg(heard?'sweepHeard':'sweepNotHeard',
   {hz:Math.round(report.frequencyHz)}));
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
  try{sweep.recordResponse(true);}
  catch{/* The stop remains mandatory even if the audio clock rejects the mark. */}
  finally{sweep.stop('reported-uncomfortable');}
  initialLevel=-60;
  element('start-level').value='-60';
  output('sweep-feedback',msg('sweepLoud'));
  return prepareTonesFromSweep();
 }
 async function begin(){
  // The primary journey always takes precedence over secondary tools.
  support.open=false;
  element('foot-tech').open=false;
  const checkpoint=readCheckpoint();
  pendingRecovery=Boolean(checkpoint);
  element('start-level-options').hidden=pendingRecovery;
  element('start-level').value='-60';
  element('recovery-options').hidden=!pendingRecovery;
  element('recovery-options').open=false;
  element('volume-ok').checked=false;
  notice('');
  output('confirm',(pendingRecovery?tr('recover'):tr('confirm'))+' →');
  if(pendingRecovery){
   output('ready-hint',msg('resumeHint'));
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
  env.setTimeout(()=>URL.revokeObjectURL(url),30000);
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
  pendingRecovery=false;eq=null;review=null;eqHistory=null;originalReview=null;
  initialLevel=-60;element('start-level').value='-60';element('start-level-options').hidden=false;
  saveResultId=null;
  element('saved-eq-link').hidden=true;
  sweepPlan=null;
  sweep.stop('reset');
  clearLoud();
  element('recovery-options').hidden=true;
  element('recovery-options').open=false;
  element('volume-ok').checked=false;
  output('confirm',tr('confirm')+' →');
  if(wasResult)go('ready');
  notice('Puedes comenzar otra prueba. Confirma el volumen físico bajo antes de escuchar.');
 }
 async function confirmReady(){
  if(!element('volume-ok').checked){
   notice(msg('lowVolumeRequired'));
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
    const savedLevel=existing.progress?.options?.initialDbfs;
    if(!HEAR_FOCUS_START_LEVELS.includes(savedLevel))throw Error('Invalid saved initial digital level');
    initialLevel=savedLevel;
    createExam(existing.plan);
    await exam.recover({userInitiated:true});
    // One-time migration from older tab-only discomfort reports: the
    // checkpoint strictly validates them against the restored audio log.
    for(const report of loudReports){
     try{exam.rememberLoudTone(report);}catch{/* invalid legacy hints are ignored */}
    }
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
  const selectedLevel=Number(element('start-level').value);
  if(!HEAR_FOCUS_START_LEVELS.includes(selectedLevel))throw Error('Invalid initial digital level');
  initialLevel=selectedLevel;
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
    plan:sweepPlan,digitalLevelDbfs:initialLevel,
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
    activeToneStartedAt=env.performance?.now?.()??Date.now();
    render();return;
   }
   pendingRecovery=true;
   element('volume-ok').checked=false;
   notice(msg('routeChanged'));
   output('confirm',tr('recover')+' →');
   go('ready');return;
  }
  if(status==='completed'){
   if(exam.getSession().status==='ready')exam.finish();
   buildEq();return;
  }
  if(status!=='ready')return;
  const started=await exam.playNext({userInitiated:true});
  if(!started.started)throw Error('El tono no llegó a reproducirse de forma verificable.');
  activeToneStartedAt=env.performance?.now?.()??Date.now();
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
   notice(msg('sweepStopped'));
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
 function updateCorrectionOptions(scope,choices=[]){
  const details=element(scope+'-correction-options');
  const select=element(scope+'-correction-band');
  const key=choices.map(x=>x.bandId+':'+x.frequencyHz).join('|');
  if(select.dataset.choices!==key){
   const previous=select.value;
   const nodes=choices.map(x=>{
    const option=doc.createElement('option');
    option.value=x.bandId;
    option.textContent=x.frequencyHz+' Hz';
    return option;
   });
   select.replaceChildren(...nodes);
   if(choices.some(x=>x.bandId===previous))select.value=previous;
   select.dataset.choices=key;
  }
  details.hidden=choices.length===0;
  if(details.hidden)details.open=false;
 }
 function correctSelectedBand(scope){
  if(!exam)throw Error('La prueba no está preparada.');
  const bandId=element(scope+'-correction-band').value;
  const selected=exam.snapshot().reviewableBands?.find(x=>x.bandId===bandId);
  if(!selected)throw Error('Esta frecuencia no se puede corregir en este momento.');
  const lang=doc.documentElement.lang?.split('-')[0]||'es';
  const message=(translateHear3Ui('focus.review.confirm',lang)||
   '¿Repetir solo {hz} Hz? Las demás bandas y resultados guardados se conservarán.')
   .replace('{hz}',String(selected.frequencyHz));
  if(!env.confirm(message+(changedBands()&&!saveResultId?' '+editMsg('discard'):'')))return;
  exam.retakeBand({bandId,userConfirmed:true});
  // A persisted result stays immutable. A corrected test produces a new
  // optional result only after it finishes and the user saves it again.
  review=null;eq=null;saveResultId=null;eqHistory=null;originalReview=null;
  element('saved-eq-link').hidden=true;
  element('save-consent').checked=false;
  output('save-status','');
  output('copy-status','');
  element('result-correction-options').open=false;
  element('tone-correction-options').open=false;
  // A corrected frequency is intentionally PAUSED: the listening route may
  // have changed while the user inspected the result. Require a new low
  // physical-volume check, then a separate click to play the first tone.
  pendingRecovery=true;
  element('volume-ok').checked=false;
  output('confirm',tr('recover')+' →');
  go('ready');
  notice(msg('correctionNotice',{hz:selected.frequencyHz}));
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
  output('copy-status',msg('copied'));
 }
 function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=doc.createElement('a');
  a.href=url;a.download=name;
  doc.body.append(a);a.click();a.remove();
  env.setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function downloadEq(format='txt'){
  if(!review)throw Error('Primero termina la prueba.');
  if(format==='png'){
   const canvas=paintHear3ImmediateEqPng(doc.createElement('canvas'),review);
   const a=doc.createElement('a');
   a.href=canvas.toDataURL('image/png');
   a.download='hear-ecualizador-experimental.png';
   doc.body.append(a);a.click();a.remove();
   return;
  }
  if(!['txt','csv'].includes(format))throw Error('Formato de descarga desconocido.');
  const content=formatHear3ImmediateEq(review,{format});
  downloadBlob(new Blob([content],{type:format==='csv'?
   'text/csv;charset=utf-8':'text/plain;charset=utf-8'}),
   'hear-ecualizador-experimental.'+format);
 }
 function saveEq(){
  if(!eq||!exam)throw Error('Primero obtén tu ecualizador.');
  if(saveResultId){
   output('save-status',msg('alreadySaved'));
   return;
  }
  if(!element('save-consent').checked){
   output('save-status',msg('saveConsent'));
   return;
  }
  if(!env.confirm(editMsg('saveConfirm')))return;
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
   loudToneReports:verifiedLoudReports(exam.getSession()),
   manualEqGains:changedBands()?[...eqHistory.current()]:null,
  });
  const saved=archive.commit({
   userInitiated:true,confirmed:true,confirmProvisionalEq:true,
  });
  if(saved.persistedOnDevice){
   saveResultId=preview.resultId;
   const savedLink=element('saved-eq-link');
   savedLink.href='./hear3-eq-editor/?result='+encodeURIComponent(saveResultId);
   savedLink.hidden=false;
   syncEqEditor();
  }
  output('save-status',msg(saved.persistedOnDevice?'saved':'saveNotVerified'));
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
   output('sweep-level',tr('digitalLevel',{db:initialLevel}));
   const current=sweep.snapshot();
   if(current.status==='playing'){
    const elapsed=current.elapsedSeconds;
    element('sweep-progress').value=elapsed;
    output('sweep-time',Math.ceil(Math.max(0,20-elapsed))+' s');
    output('sweep-hz',Math.round(frequencyAtSweepTime(current.plan,elapsed))+' Hz');
   }
  }
  if(view==='result'&&exam){
   updateCorrectionOptions('result',exam.snapshot().reviewableBands);
  }
  if(view==='tones'&&exam){
   const state=exam.snapshot();
   if(state.status==='completed'){
    if(exam.getSession().status==='completed'){buildEq();return;}
    if(!starting){exam.finish();buildEq();return;}
   }
   updateCorrectionOptions('tone',state.reviewableBands);
   // During selective correction, completedBands is not the same as the
   // position of the selected frequency: later bands remain verified.
   const currentIndex=state.bands.findIndex(b=>b.id===state.currentBandId);
   const index=currentIndex>=0?currentIndex+1:state.totalBands;
   const current=state.bands.find(b=>b.id===state.currentBandId);
   output('tone-hz',current?current.frequencyHz+' Hz':'—');
   output('band-count',tr('bandCount',{i:index,n:state.totalBands}));
   element('band-progress').max=state.totalBands;
   element('band-progress').value=state.completedBands;
   const playing=state.status==='playing';
   if(playing&&state.activeToneId!==lastAnnouncedToneId){
    lastAnnouncedToneId=state.activeToneId;
    const active=exam.getSession().currentTone;
    if(active)output('tone-announcement',
     tr('announce',{hz:active.frequencyHz,db:active.digitalLevelDbfs}));
   }
   const now=env.performance?.now?.()??Date.now();
   const audio=exam.getSession().currentTone;
   const digital=playing?audio?.digitalLevelDbfs:state.nextDigitalLevelDbfs;
   output('tone-level',tr('digitalLevel',{db:Number.isFinite(digital)?digital:'—'}));
   const total=HEAR_FOCUS_TONE_DURATION_SECONDS*1000;
   const progress=playing&&Number.isFinite(activeToneStartedAt)
    ?Math.max(0,Math.min(total,now-activeToneStartedAt)):0;
   element('tone-time-progress').max=total;
   element('tone-time-progress').value=progress;
   output('tone-time',playing
    ?tr('timeEstimate',{s:(Math.max(0,total-progress)/1000).toFixed(1)})
    :tr('duration',{s:HEAR_FOCUS_TONE_DURATION_SECONDS}));
   if(!playing)activeToneStartedAt=null;
   const uncertain=state.status==='awaiting-confirmation';
   element('tone-answers').hidden=!playing;
   element('tone-uncertain').hidden=!uncertain;
   element('tone-play').hidden=playing||uncertain||state.status==='starting';
   element('tone-stop').hidden=!['playing','starting'].includes(state.status);
   element('tone-review').hidden=!state.canReviewPreviousBand||playing||uncertain;
   const paused=state.status==='paused';
   output('tone-title',tr(playing?'tonePlaying':paused?'tonePaused':
    uncertain?'toneConflict':'toneNext'));
   const changedRoute=paused&&exam.getSession().routeCheckRequired;
   output('tone-note',tr(playing?'notePlaying':changedRoute?'noteRoute':
    paused?'notePaused':uncertain?'noteUncertain':'noteNext'));
   output('tone-play',tr(changedRoute?'route':paused?'replay':'play')+(changedRoute?' →':' ▶'));
  }
 }
 const onLanguageChange=()=>{
  render();
  if(view==='result'){renderEqText();syncEqEditor();}
 };
 env.addEventListener('hear3:language-change',onLanguageChange);
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
 listen('tone-correction-action',()=>correctSelectedBand('tone'));
 listen('result-correction-action',()=>correctSelectedBand('result'));
 listen('copy-eq',copyEq);
 listen('download-eq',()=>downloadEq('txt'));
 listen('download-eq-csv',()=>downloadEq('csv'));
 listen('download-eq-png',()=>downloadEq('png'));
 listen('save-eq',saveEq);
 listen('focus-edit-undo',()=>{if(!saveResultId&&eqHistory){eqHistory.undo();syncEqEdits();}});
 listen('focus-edit-redo',()=>{if(!saveResultId&&eqHistory){eqHistory.redo();syncEqEdits();}});
 listen('focus-edit-restore',()=>{if(!saveResultId&&eqHistory){eqHistory.restoreAll();syncEqEdits();}});
 element('bands').addEventListener('change',()=>{
  const custom=element('bands').value==='custom';
  element('custom-bands').hidden=!custom;
  element('custom-label').hidden=!custom;
 });
 element('start-level').addEventListener('change',()=>{element('volume-ok').checked=false;});
 element('volume-ok').addEventListener('change',()=>{if(element('volume-ok').checked)notice('');});
 const stopKey=e=>{
  if(e.key==='Escape'&&!e.repeat&&!e.altKey&&!e.metaKey&&!e.ctrlKey){
   if(view==='sweep'||(view==='tones'&&['playing','starting'].includes(exam?.snapshot().status))){
    e.preventDefault();interrupt();
   }
  }
 };
 doc.addEventListener('keydown',stopKey);
 // Avoid repeatedly loading the checkpoint while idle without
 // slowing down the 250 ms progress updates during audio playback.
 let idleTicks=0;
 const timer=env.setInterval(()=>{
  if(view==='sweep'||view==='tones'){
   idleTicks=0;render();
  }else if(++idleTicks>=5){
   idleTicks=0;render();
  }
 },250);
 const onLeave=(event)=>{
  if(disposed)return;
  if(event?.persisted===true){
   // The audio runner registered its pagehide listener before this one.
   // It may already have silenced the sweep and switched to 'ready', so
   // always invalidate prior low-volume consent regardless of view.
   element('volume-ok').checked=false;
   // Returning from the browser back-forward cache does not execute boot
   // again. Keep the existing controller, but silence and revalidate any
   // active test: never resume sound from a frozen tab without consent.
   if(view==='sweep'){
    sweep.stop('pagehide-bfcache');
    element('volume-ok').checked=false;
    go('ready');
    notice(msg('sweepInterrupted'));
   }else if(exam&&exam.getSession().status!=='completed'){
    try{exam.interrupt({routeMayHaveChanged:true});}catch{}
    pendingRecovery=true;
    element('volume-ok').checked=false;
    output('confirm',tr('recover')+' →');
    go('ready');
    notice(msg('routeChanged'));
   }
   return;
  }
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
  env.removeEventListener('hear3:language-change',onLanguageChange);
  media?.removeEventListener?.('change',onThemeChange);
  env.removeEventListener('pagehide',onLeave);
 };
 // Do not use once:true: pagehide may fire repeatedly for BFCache cycles.
 env.addEventListener('pagehide',onLeave);
 render();
 return Object.freeze({getView:()=>view,getExam:()=>exam,stop:interrupt,dispose:onLeave,
  getEq:()=>eq});
}
if(typeof document!=='undefined'){
 const boot=()=>mountHearFocus();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
}
