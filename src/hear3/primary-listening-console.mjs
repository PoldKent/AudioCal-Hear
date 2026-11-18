import {translateHear3Ui} from './app-i18n.mjs';
import {buildHear3DigitalToneWavePath} from './digital-tone-visualizer.mjs';

/**
 * Hear's human-first listening console.
 * Delegates every user-initiated action to existing exam controls. It never
 * creates an AudioContext, calls exam methods directly, auto-plays sound,
 * stores evidence, mutates gains or bypasses the confirmed listening route.
 */
const has=(items,id)=>items.has(id);
const frozen=value=>Object.freeze(value);
const choices=frozen([
 {id:'comparison-first',label:'El primero'},
 {id:'comparison-second',label:'El segundo'},
 {id:'comparison-similar',label:'Los escuché parecido'},
 {id:'comparison-neither',label:'No escuché ninguno'},
 {id:'comparison-uncertain',label:'No estoy seguro'},
]);
export const HEAR3_CONSOLE_SOURCES=frozen([
 'sweep-start','sweep-stop','sweep-heard','sweep-not','plan','tone-next',
 'tone-stop','tone-heard','tone-not','tone-confirm','tone-skip',
 'tone-resume','tone-finish','tone-review-previous','recover-exam',
 ...choices.map(choice=>choice.id),
]);
export function chooseHear3ListeningConsoleState({enabled=[],eqReady=false}={}){
 const available=new Set(enabled);
 const source=(id,label,mode,prompt)=>frozen({mode,primaryId:id,
  primaryLabel:label,prompt,answers:null,stopId:null});
 if(eqReady)return source(null,'Ver mi ecualizador','result',
  'Tu curva está lista. Revísala y copia los valores; no se aplica a tu equipo automáticamente.');
 if(choices.some(c=>has(available,c.id)))return frozen({
  mode:'comparison',primaryId:null,primaryLabel:'',
  prompt:'Escuchaste dos tonos. Elige cuál se percibió más claramente.',
  answers:'comparison',stopId:has(available,'tone-stop')?'tone-stop':null,
 });
 if(has(available,'tone-heard')&&has(available,'tone-not'))
  return frozen({mode:'tone-response',primaryId:null,primaryLabel:'',
   prompt:'¿Escuchas el tono actual? Responde ahora, sin esperar a que termine.',
   answers:'tone',stopId:has(available,'tone-stop')?'tone-stop':null});
 if(has(available,'sweep-heard')&&has(available,'sweep-not'))
  return frozen({mode:'sweep-response',primaryId:null,primaryLabel:'',
   prompt:'Explora el sonido. Puedes marcar las zonas que escuchas o no escuchas.',
   answers:'sweep',stopId:has(available,'sweep-stop')?'sweep-stop':null});
 if(has(available,'tone-confirm'))return source('tone-confirm',
  'Comparar los tonos','contradiction',
  'Hay una respuesta contradictoria. Puedes confirmar la comparación, o conservar la banda inconclusa.');
 if(has(available,'tone-finish'))return source('tone-finish',
  'Terminar y ver mi EQ','finish',
  'Has terminado las bandas. Finaliza para consultar las ganancias disponibles.');
 if(has(available,'tone-resume'))return source('tone-resume',
  'Reanudar mi examen','resume',
  'El examen está pausado. Comprueba la salida de audio y el volumen físico antes de reanudar.');
 if(has(available,'tone-next'))return source('tone-next',
  'Reproducir el siguiente tono','next-tone',
  'Cuando quieras, reproduce el siguiente tono. No iniciaremos sonido sin tu acción.');
 if(has(available,'plan'))return source('plan',
  'Continuar con los tonos','plan',
  'Barrido terminado. Prepara los tonos de confirmación para completar tu EQ.');
 if(has(available,'sweep-stop'))return frozen({
  mode:'sweep-running',primaryId:null,primaryLabel:'',
  prompt:'El barrido está sonando. Escucha con volumen bajo y marca las zonas cuando lo necesites.',
  answers:null,stopId:'sweep-stop',
 });
 if(has(available,'recover-exam'))return source('recover-exam',
  'Continuar mi examen guardado','recover',
  'Encontramos tu examen anterior. Continúa cuando quieras, sin volver a empezar ni reproducir sonido automáticamente.');
 if(has(available,'sweep-start'))return source('sweep-start',
  'Comenzar mi prueba','start',
  'Elige dónde escuchas, comprueba que el volumen esté bajo y pulsa comenzar.');
 return source(null,'Comprobar preparación','setup',
  'Hear todavía no puede iniciar la prueba. Revisa el aviso de audio o los cambios de bandas pendientes.');
}
export function mountHear3ListeningConsole({root,sourceRoot,eqReady=()=>false,env=globalThis}={}){
 if(!root||!sourceRoot||typeof eqReady!=='function')
  throw Error('Faltan los controles del recorrido principal.');
 const $=id=>root.querySelector('[data-console="'+id+'"]');
 const source=id=>sourceRoot.querySelector('#'+id);
 const action=$('action'),prompt=$('prompt'),modeText=$('mode'),step=$('step');
 const frequency=$('frequency'),level=$('level'),answerRow=$('answers');
 const setup=$('setup'),device=$('device'),safety=$('safety'),
  setupFeedback=$('setup-feedback'),meters=$('meters');
 const heard=$('heard'),notHeard=$('not'),stop=$('stop');
 const comparison=$('comparison'),skip=$('skip'),recover=$('recover'),review=$('review');
 const route=$('route'),routeInput=$('route-input');
 const live=$('live'),wave=$('wave'),wavePath=$('wave-path');
 const progress=$('progress'),remaining=$('remaining');
 if([action,prompt,modeText,step,frequency,level,answerRow,setup,device,safety,
  setupFeedback,meters,heard,notHeard,
  stop,comparison,skip,recover,review,route,routeInput,live,wave,wavePath,progress,
  remaining,source('route-verified')]
  .some(element=>!element))
  throw Error('El panel principal no tiene todos sus controles.');
 let view=null;
 const ids=HEAR3_CONSOLE_SOURCES;
 function active(id){return !!source(id)&&!source(id).disabled;}
 function enabled(){
  return ids.filter(id=>active(id));
 }
 function currentSourceIds(){
  if(['sweep-response','sweep-running'].includes(view?.mode))return [
   'sweep-frequency','sweep-level'
  ];
  return ['frequency','dbfs'];
 }
 const shown=node=>node?.textContent?.trim()||'—';
 function render(){
  const newState=chooseHear3ListeningConsoleState({
   enabled:enabled(),eqReady:!!eqReady(),
  });
  view=newState;
  const language=(env.document?.documentElement?.lang??'es').split('-')[0];
  const translated=(key,fallback)=>translateHear3Ui(key,language)??fallback;
  const modeKey={
   'sweep-running':'console.sweep','sweep-response':'console.sweep',
   'tone-response':'console.tone',comparison:'console.comparison',
   result:'console.result',
  }[view.mode];
  const modeFallback={
   setup:'PREPARACIÓN',start:'PREPARACIÓN',recover:'RECUPERACIÓN',
   'sweep-running':'BARRIDO','sweep-response':'BARRIDO',
   plan:'TONOS','next-tone':'TONOS','tone-response':'TONO ACTUAL',
   contradiction:'CONFIRMACIÓN',comparison:'COMPARACIÓN',
   resume:'EXAMEN EN PAUSA',finish:'FINALIZAR',result:'MI ECUALIZADOR',
  }[view.mode]??'EXAMEN';
  modeText.textContent=modeKey?translated(modeKey,modeFallback):modeFallback;
  const promptKey={
   setup:'prompt.setup',start:'prompt.start',recover:'prompt.recover',
   'sweep-running':'prompt.running','sweep-response':'prompt.sweep',
   plan:'prompt.plan','next-tone':'prompt.next','tone-response':'prompt.heard',
   contradiction:'prompt.contradiction',comparison:'prompt.compare',
   resume:'prompt.resume',finish:'prompt.finish',result:'prompt.result',
  }[view.mode];
  const localizedPrompt=promptKey?translated(promptKey,view.prompt):view.prompt;
  if(prompt.textContent!==localizedPrompt)prompt.textContent=localizedPrompt;
  const preparing=['start','setup'].includes(view.mode);
  setup.hidden=!preparing;
  meters.hidden=preparing||view.mode==='recover';
  const isResult=view.mode==='result',isTest=
   ['sweep-running','sweep-response','plan','next-tone','tone-response',
    'contradiction','comparison','resume','finish'].includes(view.mode);
  step.textContent=isResult?'Paso 3 de 3 · Tu ecualizador':
   isTest?'Paso 2 de 3 · Escucha y responde':'Paso 1 de 3 · Tu equipo';
  const [freqId,levelId]=currentSourceIds();
  const f=shown(source(freqId)),l=shown(source(levelId));
  if(frequency.textContent!==f)frequency.textContent=f;
  if(level.textContent!==l)level.textContent=l;
  // The existing audio engine owns these readings. Mirroring them does not
  // estimate a new duration, create Web Audio or invent acoustic measurements.
  const sweeping=['sweep-response','sweep-running'].includes(view.mode);
  const playingTone=view.mode==='tone-response';
  const playing=sweeping||playingTone;
  const sourceProgress=source(sweeping?'sweep-progress':'tone-progress');
  const maximum=Number(sourceProgress?.max);
  const elapsed=Number(sourceProgress?.value);
  const usable=playing&&Number.isFinite(maximum)&&maximum>0&&
   Number.isFinite(elapsed)&&elapsed>=0;
  live.hidden=!usable;
  if(usable){
   progress.max=maximum;
   progress.value=Math.min(maximum,elapsed);
   const rem=sweeping?shown(source('sweep-remaining')):
    ((Math.max(0,maximum-elapsed))/1000).toFixed(1)+' s';
   if(remaining.textContent!==rem)remaining.textContent=rem;
   const hz=Number.parseFloat(f);
   const path=buildHear3DigitalToneWavePath(hz);
   if(wavePath.getAttribute('d')!==path)wavePath.setAttribute('d',path);
  }else{
   progress.value=0;
   remaining.textContent='—';
   wavePath.removeAttribute('d');
  }
  wave.classList.toggle('hear-wave-active',usable);
  const isAnswer=!!view.answers;
  answerRow.hidden=!['tone','sweep'].includes(view.answers);
  comparison.hidden=view.answers!=='comparison';
  if(view.answers==='tone'){
   heard.disabled=!active('tone-heard');notHeard.disabled=!active('tone-not');
  }else if(view.answers==='sweep'){
   heard.disabled=!active('sweep-heard');notHeard.disabled=!active('sweep-not');
  }else{heard.disabled=true;notHeard.disabled=true;}
  for(const item of choices){
   const button=comparison.querySelector('[data-console-choice="'+item.id+'"]');
   button.disabled=!active(item.id);
  }
  action.hidden=isAnswer||view.mode==='sweep-running';
  const actionKey={
   setup:'console.setup',start:'console.start',plan:'console.plan',
   'next-tone':'console.next',finish:'console.finish',result:'console.view',
   resume:'console.resume',recover:'console.recover',
   contradiction:'console.compare',
  }[view.mode];
  action.textContent=actionKey?translated(actionKey,view.primaryLabel):view.primaryLabel;
  route.hidden=view.mode!=='resume';
  routeInput.checked=Boolean(source('route-verified').checked);
  routeInput.disabled=view.mode!=='resume';
  // The existing engine still independently enforces this user confirmation.
  // The mirror prevents a confusing failed action in the simplified panel.
  action.disabled=(!!view.primaryId&&!active(view.primaryId))||
   (view.mode==='resume'&&!source('route-verified').checked);
  stop.hidden=!view.stopId;
  stop.disabled=!view.stopId||!active(view.stopId);
  skip.hidden=view.mode!=='contradiction'||!active('tone-skip');
  skip.disabled=!active('tone-skip');
  recover.hidden=view.mode==='recover'||!active('recover-exam')||
   !!view.answers||view.mode==='result';
  recover.disabled=!active('recover-exam');
  review.hidden=!active('tone-review-previous')||!!view.answers||view.mode==='result';
  review.disabled=!active('tone-review-previous');
 }
 function startGuidedExam(){
  if(!safety.checked){
   setupFeedback.textContent='Para continuar, confirma que conectaste tu equipo y bajaste el volumen físico.';
   safety.focus();
   return;
  }
  if(!active('sweep-start')){
   setupFeedback.textContent=source('audio-preflight')?.textContent?.trim()||
    'Revisa las bandas de tu equipo y confirma los cambios antes de comenzar.';
   return;
  }
  const category=source('archive-category');
  if(category){
   category.value=device.value;
   category.dispatchEvent(new Event('change',{bubbles:true}));
  }
  setupFeedback.textContent='Preparando la exploración. Escucha a volumen bajo.';
  // This click is synchronous with the user's explicit button activation.
  // The original engine still enforces sound limits, state and opt-in.
  source('sweep-start').click();
 }
 function clickSource(id){
  if(id==='__guided-start'){startGuidedExam();return;}
  if(id==='__review-setup'){
   setupFeedback.textContent=source('audio-preflight')?.textContent?.trim()||
    'Revisa la salida y confirma las frecuencias antes de comenzar.';
   source('layout-heading')?.scrollIntoView({block:'start',behavior:'auto'});
   return;
  }
  if(id==='__view-eq'){
   source('eq-heading')?.scrollIntoView({block:'start',behavior:'auto'});
   source('eq-heading')?.focus({preventScroll:true});
   return;
  }
  if(!id||!active(id))return;
  if(id==='tone-resume'&&!source('route-verified').checked)return;
  // This call is synchronous, only from a real button activation; the tested
  // engine's own confirmations, audio preflight and error handling remain.
  source(id).click();
 }
 action.addEventListener('click',()=>{
  clickSource(view.mode==='result'?'__view-eq':
   view.mode==='start'?'__guided-start':
   view.mode==='setup'?'__review-setup':view.primaryId);
 });
 heard.addEventListener('click',()=>clickSource(view.answers==='tone'?
  'tone-heard':view.answers==='sweep'?'sweep-heard':null));
 notHeard.addEventListener('click',()=>clickSource(view.answers==='tone'?
  'tone-not':view.answers==='sweep'?'sweep-not':null));
 stop.addEventListener('click',()=>clickSource(view.stopId));
 skip.addEventListener('click',()=>clickSource(view.mode==='contradiction'?
  'tone-skip':null));
 recover.addEventListener('click',()=>clickSource('recover-exam'));
 review.addEventListener('click',()=>clickSource('tone-review-previous'));
 routeInput.addEventListener('change',()=>{
  if(view.mode!=='resume')return;
  const original=source('route-verified');
  original.checked=routeInput.checked;
  original.dispatchEvent(new Event('change',{bubbles:true}));
  render();
 });
 source('route-verified').addEventListener('change',render);
 safety.addEventListener('change',()=>{
  if(safety.checked)setupFeedback.textContent='Equipo listo. Ya puedes comenzar.';
 });
 // Report real backend errors next to the primary action; never let the
 // user click and see an error only at the bottom of a long document.
 const sourceError=source('error');
 if(sourceError)new MutationObserver(()=>{
  const message=sourceError.textContent?.trim();
  if(message)setupFeedback.textContent=message;
 }).observe(sourceError,{childList:true,characterData:true,subtree:true});
 for(const item of choices){
  const button=comparison.querySelector('[data-console-choice="'+item.id+'"]');
  button.addEventListener('click',()=>clickSource(view.mode==='comparison'?item.id:null));
 }
 let queued=false;
 function schedule(){
  if(queued)return;
  queued=true;
  Promise.resolve().then(()=>{queued=false;render();});
 }
 env.addEventListener?.('hear3:language-change',schedule);
 const observer=new MutationObserver(schedule);
 for(const id of [...ids,'sweep-frequency','sweep-level','frequency','dbfs',
  'sweep-status','tone-status','eq-rows','eq-status','coverage',
  'sweep-progress','tone-progress','sweep-remaining']){
  const el=source(id);
  if(el)observer.observe(el,{
   attributes:true,attributeFilter:['disabled','value','max'],
   subtree:true,characterData:true,childList:true,
  });
 }
 render();
 return frozen({render,dispose:()=>{observer.disconnect();
   env.removeEventListener?.('hear3:language-change',schedule);}});
}
