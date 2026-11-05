/**
 * Hear 3.0 P0 — adaptive progression + audio session saved as ONE local unit.
 * Recovery requires a deliberate click and always yields paused/silent state.
 * This is an experimental prototype, not a calibrated audiometric workflow.
 */
import {createHear3AudioSession} from './audio-session-controller.mjs';
import {createHear3AdaptiveDiscreteExam} from './adaptive-discrete-exam.mjs';
import {createHear3AdaptiveProgressStore,ADAPTIVE_BUNDLE_FORMAT}
 from './adaptive-progress-store.mjs';

const check=(ok,message)=>{if(!ok)throw Error(message);};
const clone=value=>JSON.parse(JSON.stringify(value));

export function createHear3ResumableAdaptiveExam({
 plan,profileId,minDbfs,maxDbfs,routeId=null,adapterFactory,
 initialDbfs=-60,maxTrialsPerBand=7,coarseStepDb=6,durationSeconds=3,channel='joint',
 progressStore=null,
}={}){
 const store=progressStore??createHear3AdaptiveProgressStore({profileId});
 check(store&&typeof store.load==='function'&&typeof store.save==='function'&&
  typeof store.exportBackup==='function','Invalid adaptive progress store');
 const options={profileId,minDbfs,maxDbfs,routeId,adapterFactory};
 const examOptions={plan,initialDbfs,maxTrialsPerBand,coarseStepDb,durationSeconds,channel};
 let controller=createHear3AudioSession(options);
 let exam=createHear3AdaptiveDiscreteExam({...examOptions,sessionController:controller});
 let touched=false,disposed=false;
 const initial=store.load();
 let revision=initial.revision;
 let lastSavedState=null;
 let persistence={durability:'none',persistedOnDevice:false,
  warning:'No adaptive progress saved yet.'};

 function ensureLive(){check(!disposed,'Adaptive exam has been disposed');}
 function bundle(){
  return {
   format:ADAPTIVE_BUNDLE_FORMAT,profileId,plan:clone(plan),
   progress:exam.exportProgress(),
   audioSession:controller.getSession(),
  };
 }
 function attemptSave(){
  ensureLive();
  if(!touched)return clone(persistence);
  const candidate=bundle();
  const fingerprint=JSON.stringify(candidate);
  if(fingerprint===lastSavedState)return clone(persistence);
  try{
   const result=store.save(candidate,{expectedRevision:revision});
   revision=result.revision;
   lastSavedState=fingerprint;
   persistence={durability:result.durability,
    persistedOnDevice:result.persistedOnDevice===true,
    warning:result.warning??null};
  }catch(error){
   persistence={durability:'unverified',persistedOnDevice:false,
    warning:'Adaptive progress was NOT saved: '+(error?.message??String(error))};
  }
  return clone(persistence);
 }
 function snapshot(){
  ensureLive();
  const result=exam.snapshot();
  // An oscillator may have expired asynchronously; persist the fail-closed
  // pause only if the state actually changed, never on each timer tick.
  if(touched)attemptSave();
  return result;
 }
 function getSession(){ensureLive();return controller.getSession();}
 function getPersistence(){ensureLive();return clone(persistence);}
 function getRecoveryProposal(){
  ensureLive();
  if(touched)return {available:false,warning:'A new examination is already in progress.'};
  const current=store.load();
  return {
   available:Boolean(current.checkpoint),
   revision:current.revision,durability:current.durability,
   persistedOnDevice:current.persistedOnDevice,
   observationCount:current.checkpoint?.audioSession?.observations?.length??0,
   requiresManualOutputCheck:Boolean(current.checkpoint&&
    current.checkpoint.audioSession?.status!=='completed'),
   warnings:current.warnings,
  };
 }
 async function recover({userInitiated=false}={}){
  ensureLive();
  check(userInitiated===true,'Recovery requires explicit user action');
  check(!touched,'Cannot overwrite an exam after new activity');
  const saved=store.load();
  check(saved.checkpoint,'No verified adaptive progress exists');
  const content=saved.checkpoint;
  // All stored options, profile, plan, observation log and digital limits are
  // independently checked BEFORE replacing the current live controller.
  check(JSON.stringify(content.plan)===JSON.stringify(plan),
   'Recovered sweep plan does not match the selected examination');
  let nextController;
  try{
   nextController=createHear3AudioSession({
    ...options,restoredSession:content.audioSession,
   });
   const nextExam=createHear3AdaptiveDiscreteExam({
    ...examOptions,sessionController:nextController,restoredProgress:content.progress,
   });
   await controller.dispose();
   controller=nextController;exam=nextExam;
  }catch(error){
   await nextController?.dispose();
   throw error;
  }
  touched=true;
  revision=saved.revision;
  lastSavedState=null;
  persistence={durability:saved.durability,
   persistedOnDevice:saved.persistedOnDevice,
   warning:'Recovered in silence. Recheck physical volume and output; confirm the route before resuming.'};
  // Important: do not save or play a tone simply because the user viewed
  // or recovered an older checkpoint; resume is a separate manual action.
  const state=exam.snapshot();
  lastSavedState=JSON.stringify(bundle());
  return {restored:true,state,persistence:clone(persistence)};
 }
 async function playNext(args){
  ensureLive();
  const before=JSON.stringify(bundle());
  const operation=exam.playNext(args);
  if(JSON.stringify(bundle())!==before){touched=true;attemptSave();}
  try{return await operation;}
  finally{
   if(JSON.stringify(bundle())!==before){touched=true;attemptSave();}
  }
 }
 function update(action){
  ensureLive();
  const before=JSON.stringify(bundle());
  try{return action();}
  finally{
   // A rejected/disabled user action must not clobber an older recoverable
   // checkpoint just because the user clicked the wrong button.
   if(JSON.stringify(bundle())!==before){touched=true;attemptSave();}
  }
 }
 function answer(response){return update(()=>exam.answer(response));}
 function confirmContradiction(args){return update(()=>exam.confirmContradiction(args));}
 function interrupt(args){return update(()=>exam.interrupt(args));}
 function confirmRoute(args){return update(()=>exam.confirmRoute(args));}
 function resume(args){return update(()=>exam.resume(args));}
 function finish(){return update(()=>exam.finish());}
 function exportBackup(){ensureLive();return store.exportBackup();}
 function clearCheckpoint({confirmed=false}={}){
  ensureLive();
  check(confirmed===true,'Explicit deletion confirmation required');
  // Stop any live tone BEFORE clearing the stored copy.
  if(controller.getSession().status!=='completed'){
   exam.interrupt({routeMayHaveChanged:true});
  }
  touched=true;
  check(typeof store.clear==='function','Checkpoint deletion is unavailable');
  const cleared=store.clear({confirmed:true});
  lastSavedState=null;
  revision=0;
  persistence={durability:cleared.cleared?'none':'unverified',
   persistedOnDevice:false,warning:cleared.warning??null};
  return cleared;
 }
 async function dispose(){
  if(disposed)return;
  if(touched)attemptSave();
  disposed=true;
  await controller.dispose();
 }
 return Object.freeze({
  snapshot,getSession,getPersistence,getRecoveryProposal,recover,
  playNext,answer,confirmContradiction,interrupt,confirmRoute,resume,finish,
  exportBackup,clearCheckpoint,dispose,
 });
}
