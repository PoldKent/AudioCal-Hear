/**
 * Hear guided journey. Pure navigation cues; the established Web Audio engine
 * remains the ONLY authority about tone playback, evidence and progression.
 * Never starts audio, changes measured evidence or persists a new state.
 */
export const HEAR3_JOURNEY_STEPS=Object.freeze(['prepare','sweep','tones','result']);
const labels=Object.freeze({
 prepare:'1 · Mi equipo',sweep:'2 · Barrido',tones:'3 · Tonos',result:'4 · Mi EQ',
});
export function determineHear3JourneyStage({sweep=null,sweepResult=null,exam=null,eq=null}={}){
 if(eq?.resultAvailable===true||(Array.isArray(eq?.rows)&&eq.rows.length>=2))return 'result';
 if(exam?.status&&exam.status!=='unstarted')return 'tones';
 if(sweepResult?.status==='completed')return 'tones';
 if(sweep?.status==='playing'||sweep?.status==='starting')return 'sweep';
 return 'prepare';
}
export function createHear3JourneyModel(state){
 const active=determineHear3JourneyStage(state);
 const activeIndex=HEAR3_JOURNEY_STEPS.indexOf(active);
 return Object.freeze({
  active,activeIndex,
  items:HEAR3_JOURNEY_STEPS.map((name,i)=>Object.freeze({
   name,label:labels[name],current:i===activeIndex,
   available:i<=activeIndex,
  })),
 });
}
export function mountHear3GuidedJourney({root,getState,env=globalThis}={}){
 if(!root||typeof getState!=='function')throw Error('Journey navigation requires state');
 const $=name=>root.querySelector('[data-journey="'+name+'"]');
 const status=$('status'),back=$('back'),next=$('next');
 const nav=$('nav');
 const links=HEAR3_JOURNEY_STEPS.map(name=>nav.querySelector('[data-journey-stage="'+name+'"]'));
 if(!status||!back||!next||links.some(x=>!x))throw Error('Missing journey UI');
 const ids=Object.freeze({
  prepare:'layout-heading',sweep:'sweep-heading',
  tones:'tones-heading',result:'eq-heading',
 });
 let model=null;
 function canNavigate(){
  const s=getState();
  return s?.sweep?.status!=='playing'&&!['playing','starting'].includes(s?.exam?.status)&&
   !['first','gap','second'].includes(s?.comparison?.state);
 }
 function go(step){
  if(!canNavigate()){
   status.textContent='Detén el tono o el barrido antes de cambiar de etapa; no se perderán respuestas válidas.';
   return;
  }
  // Navigation previews existing sections but NEVER advances the audio
  // engine or marks an unfinished stage complete.
  const heading=env.document?.getElementById(ids[step]);
  heading?.scrollIntoView?.({block:'start',behavior:'auto'});
 }
 function render(){
  const nextModel=createHear3JourneyModel(getState());
  if(model?.active===nextModel.active)return;
  model=nextModel;
  for(const [i,item] of model.items.entries()){
   const link=links[i];
   if(item.current)link.setAttribute('aria-current','step');
   else link.removeAttribute('aria-current');
   link.dataset.reached=String(item.available);
  }
  status.textContent='Etapa actual: '+model.items[model.activeIndex].label+
   '. Puedes volver a una etapa anterior para revisar los datos sin borrar el progreso.';
  back.disabled=model.activeIndex===0;
  next.disabled=model.activeIndex>=3;
  back.textContent='Volver a '+(model.items[model.activeIndex-1]?.label??'la etapa anterior');
  next.textContent='Ir a '+(model.items[model.activeIndex+1]?.label??'la siguiente etapa');
 }
 links.forEach((link,i)=>link.addEventListener('click',event=>{
  event.preventDefault();go(HEAR3_JOURNEY_STEPS[i]);
 }));
 back.addEventListener('click',()=>{
  if(!model||model.activeIndex===0)return;
  go(HEAR3_JOURNEY_STEPS[model.activeIndex-1]);
 });
 next.addEventListener('click',()=>{
  if(!model||model.activeIndex>=3)return;
  // "Next" only scrolls. No sound, new measurements or progression.
  go(HEAR3_JOURNEY_STEPS[model.activeIndex+1]);
 });
 const targets=['sweep-status','tone-status','eq-status','sweep-count','coverage'];
 const observer=new MutationObserver(render);
 for(const id of targets){
  const node=env.document?.getElementById(id);
  if(node)observer.observe(node,{childList:true,characterData:true,subtree:true});
 }
 render();
 return Object.freeze({render,dispose:()=>observer.disconnect()});
}
