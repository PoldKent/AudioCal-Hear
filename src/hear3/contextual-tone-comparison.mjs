/**
 * Hear 3.0 D-036 / D-004 P0 — two consecutive, user-triggered,
 * contextual single-frequency tones. The second tone starts automatically
 * ONLY after the first ends verified, while output remains observable.
 * The response is subjective; NEVER a hearing threshold, SPL or EQ.
 */
import {createWebAudioToneAdapter} from './web-audio-adapter.mjs';

export const HEAR3_COMPARISON_FORMAT='hear3-contextual-tone-comparison-v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clone=x=>JSON.parse(JSON.stringify(x));

function normalizePair(pair) {
 check(pair&&typeof pair==='object'&&
  typeof pair.comparisonId==='string'&&/^[a-zA-Z0-9._-]{1,96}$/.test(pair.comparisonId),
  'A stable comparison ID is required');
 check(pair.reason==='contradictory-subjective-responses',
  'Only contextual conflicting-response comparison is authorized');
 check(finite(pair.frequencyHz)&&pair.frequencyHz>=20&&pair.frequencyHz<=20000,
  'Invalid comparison frequency');
 check(['joint','left','right'].includes(pair.channel),'Invalid comparison channel');
 const bounds=pair.authorizedDigitalRangeDbfs;
 check(bounds&&finite(bounds.minDbfs)&&finite(bounds.maxDbfs)&&
  bounds.minDbfs<=bounds.maxDbfs&&bounds.maxDbfs<=0,
  'Missing authorized digital limits');
 check(finite(pair.firstDbfs)&&finite(pair.secondDbfs)&&
  pair.firstDbfs>=bounds.minDbfs&&pair.firstDbfs<=bounds.maxDbfs&&
  pair.secondDbfs>=bounds.minDbfs&&pair.secondDbfs<=bounds.maxDbfs&&
  pair.firstDbfs!==pair.secondDbfs,
  'Both comparison tones must differ within the previously authorized digital range');
 check(finite(pair.durationSeconds)&&pair.durationSeconds>0&&pair.durationSeconds<=3,
  'Invalid comparison tone duration');
 check(Number.isInteger(pair.gapMilliseconds)&&
  pair.gapMilliseconds>=120&&pair.gapMilliseconds<=700,
  'Comparison separation must remain short and bounded');
 return clone(pair);
}

export function createHear3ContextualToneComparison({
 adapterFactory=createWebAudioToneAdapter,
 schedule=(fn,delay)=>setTimeout(fn,delay),
 cancel=handle=>clearTimeout(handle),
 onChange=()=>{},
}={}){
 check(typeof adapterFactory==='function'&&typeof schedule==='function'&&
  typeof cancel==='function'&&typeof onChange==='function',
  'Invalid comparison dependencies');
 let state='idle',pair=null,lastOutcome=null,epoch=0,disposed=false,pending=null;
 let heardFirstEnd=false,heardSecondEnd=false;
 const adapter=adapterFactory({
  onToneEnded:handleToneEnded,
  onInterrupted:()=>interrupt('audio-route-or-browser-interrupted'),
 });
 const emit=()=>{try{onChange(snapshot());}catch{/* observation callback never causes playback */}};
 function snapshot(){
  return clone({
   state,pair:pair?{
    comparisonId:pair.comparisonId,reason:pair.reason,
    frequencyHz:pair.frequencyHz,channel:pair.channel,
    firstDbfs:pair.firstDbfs,secondDbfs:pair.secondDbfs,
   }:null,
   results:lastOutcome,needsResponse:state==='awaiting-response',
   audioStarted:state==='first'||state==='second',
   completeSequence:heardFirstEnd&&heardSecondEnd,
   thresholdsEstimated:0,eqGainsCalculated:0,
   acousticCalibration:'not-established',
  });
 }
 function clearPending(){
  if(pending!==null){cancel(pending);pending=null;}
 }
 function interrupt(reason='manual'){
  epoch++;
  clearPending();
  adapter.stop();
  if(['first','gap','second'].includes(state)){
   state='interrupted';
   lastOutcome=null;
  }
  emit();
  return {interrupted:state==='interrupted',reason};
 }
 function verifyForSecond(){
  const status=adapter.getStatus?.();
  // Never auto-resume a suspended audio context. No substitute for a
  // physical device check, and not every browser exposes route changes.
  check(!status||(
   status.visible!==false&&
   status.disposed!==true&&
   status.contextState==='running'&&status.activeToneId===null),
   'Audio context/visibility changed; comparison aborted');
 }
 async function playSecond(request){
  if(disposed||request!==epoch||state!=='gap')return;
  try{
   verifyForSecond();
   state='second';emit();
   const result=await adapter.playTone({
    toneId:pair.comparisonId+'-second',
    frequencyHz:pair.frequencyHz,channel:pair.channel,
    digitalLevelDbfs:pair.secondDbfs,
    durationSeconds:pair.durationSeconds,
    authorizedDigitalRangeDbfs:pair.authorizedDigitalRangeDbfs,
   });
   if(request!==epoch||state!=='second')return;
   if(result?.started!==true)interrupt('second-tone-not-started');
  }catch{
   if(request===epoch)interrupt('second-tone-not-verified');
  }
 }
 function handleToneEnded({toneId}={}){
  if(disposed||!pair)return;
  const request=epoch;
  if(state==='first'&&toneId===pair.comparisonId+'-first'){
   heardFirstEnd=true;
   state='gap';emit();
   pending=schedule(()=>{
    pending=null;
    if(request!==epoch||disposed)return;
    void playSecond(request);
   },pair.gapMilliseconds);
   return;
  }
  if(state==='second'&&toneId===pair.comparisonId+'-second'){
   heardSecondEnd=true;
   state='awaiting-response';emit();
  }
 }
 async function start({userInitiated=false,comparison=null}={}){
  check(!disposed,'Comparison controller disposed');
  check(userInitiated===true,'A user action is required to start the comparison');
  check(['idle','interrupted','completed'].includes(state),
   'A previous comparison must finish or be stopped');
  const requested=normalizePair(comparison);
  interrupt('replaced');
  const request=epoch;
  pair=requested;lastOutcome=null;
  heardFirstEnd=false;heardSecondEnd=false;
  state='first';emit();
  try{
   const result=await adapter.playTone({
    toneId:pair.comparisonId+'-first',
    frequencyHz:pair.frequencyHz,channel:pair.channel,
    digitalLevelDbfs:pair.firstDbfs,
    durationSeconds:pair.durationSeconds,
    authorizedDigitalRangeDbfs:pair.authorizedDigitalRangeDbfs,
   });
   if(request!==epoch)return {started:false,reason:'obsolete'};
   if(result?.started!==true){
    interrupt('first-tone-not-verified');
    return {started:false,reason:'not-started'};
   }
   return {started:true,comparisonId:pair.comparisonId};
  }catch(error){
   if(request===epoch)interrupt('first-tone-error');
   throw error;
  }
 }
 function respond(choice){
  check(!disposed,'Comparison controller disposed');
  check(state==='awaiting-response'&&heardFirstEnd&&heardSecondEnd,
   'Both tones must end normally before recording a subjective response');
  check(['first-clearer','second-clearer','similar','neither','uncertain'].includes(choice),
   'Invalid contextual comparison response');
  const result={
   format:HEAR3_COMPARISON_FORMAT,comparisonId:pair.comparisonId,
   reason:pair.reason,frequencyHz:pair.frequencyHz,channel:pair.channel,
   firstDigitalLevelDbfs:pair.firstDbfs,
   secondDigitalLevelDbfs:pair.secondDbfs,
   response:choice,provenance:'user-response',
   calibratedThresholds:0,eqGainsCalculated:0,
   uncertaintyPreserved:choice==='neither'||choice==='uncertain',
  };
  lastOutcome=result;state='completed';emit();
  return clone(result);
 }
 async function dispose(){
  if(disposed)return;
  interrupt('dispose');
  disposed=true;
  await adapter.dispose?.();
 }
 return Object.freeze({start,respond,interrupt,snapshot,dispose});
}

export function planHear3ContradictionComparison({
 comparisonId,frequencyHz,channel='joint',currentDbfs,
 authorizedDigitalRangeDbfs,
 durationSeconds=1.4,gapMilliseconds=220,
}={}){
 const bounds=authorizedDigitalRangeDbfs;
 check(bounds&&finite(bounds.minDbfs)&&finite(bounds.maxDbfs)&&
  finite(currentDbfs),'Invalid comparison planning inputs');
 check(bounds.maxDbfs-bounds.minDbfs>=1,
  'Authorized range is too narrow for a two-level comparison');
 // One level below and one no more than 3 dB above the contradictory
 // report, clamped to existing limits. No physical volume is changed.
 const lower=Math.max(bounds.minDbfs,Math.min(currentDbfs-3,bounds.maxDbfs-1));
 const upper=Math.min(bounds.maxDbfs,Math.max(currentDbfs+3,lower+1));
 return normalizePair({
  comparisonId,reason:'contradictory-subjective-responses',
  frequencyHz,channel,firstDbfs:lower,secondDbfs:upper,
  durationSeconds,gapMilliseconds,authorizedDigitalRangeDbfs:bounds,
 });
}
