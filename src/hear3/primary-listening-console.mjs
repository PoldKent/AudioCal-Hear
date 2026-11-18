import {translateHear3Ui} from './app-i18n.mjs';

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
 'tone-resume','tone-finish','recover-exam',
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
 if(has(available,'sweep-start'))return source('sweep-start',
  'Iniciar exploración','start',
  'Confirma las bandas del equipo. Empieza cuando la salida y el volumen estén preparados.');
 if(has(available,'recover-exam'))return source('recover-exam',
  'Recuperar mi examen','recover',
  'Encontramos un examen anterior. Recupéralo si quieres continuar sin repetir los tonos.');
 return source(null,'Revisar las bandas del equipo','setup',
  'Primero confirma las frecuencias de tu ecualizador y revisa la salida de sonido.');
}
export function mountHear3ListeningConsole({root,sourceRoot,eqReady=()=>false,env=globalThis}={}){
 if(!root||!sourceRoot||typeof eqReady!=='function')
  throw Error('Faltan los controles del recorrido principal.');
 const $=id=>root.querySelector('[data-console="'+id+'"]');
 const source=id=>sourceRoot.querySelector('#'+id);
 const action=$('action'),prompt=$('prompt'),modeText=$('mode');
 const frequency=$('frequency'),level=$('level'),answerRow=$('answers');
 const heard=$('heard'),notHeard=$('not'),stop=$('stop');
 const comparison=$('comparison'),skip=$('skip'),recover=$('recover');
 const route=$('route'),routeInput=$('route-input');
 if([action,prompt,modeText,frequency,level,answerRow,heard,notHeard,
  stop,comparison,skip,recover,route,routeInput,source('route-verified')]
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
  const [freqId,levelId]=currentSourceIds();
  const f=shown(source(freqId)),l=shown(source(levelId));
  if(frequency.textContent!==f)frequency.textContent=f;
  if(level.textContent!==l)level.textContent=l;
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
 }
 function clickSource(id){
  if(id==='__view-eq'){
   source('eq-heading')?.scrollIntoView({block:'start',behavior:'auto'});
   source('eq-heading')?.focus({preventScroll:true});
   return;
  }
  if(id==='__setup'){
   source('layout-heading')?.scrollIntoView({block:'start',behavior:'auto'});
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
   view.mode==='setup'?'__setup':view.primaryId);
 });
 heard.addEventListener('click',()=>clickSource(view.answers==='tone'?
  'tone-heard':view.answers==='sweep'?'sweep-heard':null));
 notHeard.addEventListener('click',()=>clickSource(view.answers==='tone'?
  'tone-not':view.answers==='sweep'?'sweep-not':null));
 stop.addEventListener('click',()=>clickSource(view.stopId));
 skip.addEventListener('click',()=>clickSource(view.mode==='contradiction'?
  'tone-skip':null));
 recover.addEventListener('click',()=>clickSource('recover-exam'));
 routeInput.addEventListener('change',()=>{
  if(view.mode!=='resume')return;
  const original=source('route-verified');
  original.checked=routeInput.checked;
  original.dispatchEvent(new Event('change',{bubbles:true}));
  render();
 });
 source('route-verified').addEventListener('change',render);
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
  'sweep-status','tone-status','eq-rows','eq-status','coverage']){
  const el=source(id);
  if(el)observer.observe(el,{
   attributes:true,attributeFilter:['disabled'],
   subtree:true,characterData:true,childList:true,
  });
 }
 render();
 return frozen({render,dispose:()=>{observer.disconnect();
   env.removeEventListener?.('hear3:language-change',schedule);}});
}
