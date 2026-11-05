/**
 * Hear 3.0 D-035/D-055 P0: subjective headphone L/R routing check.
 *
 * It NEVER proves physical output separation or calibrates SPL. A favorable
 * answer is user-reported only; it cannot switch the main exam into per-ear
 * mode, which needs an independently validated route protocol.
 */
import {createWebAudioToneAdapter} from './web-audio-adapter.mjs';

export const HEAR3_CHANNEL_CHECK_FORMAT='hear3-manual-stereo-check-v1';
const check=(condition,message)=>{if(!condition)throw Error(message);};
const clone=value=>JSON.parse(JSON.stringify(value));
const LEVEL_DBFS=-60;
const DIGITAL_RANGE=Object.freeze({minDbfs:-80,maxDbfs:-42});
const FREQUENCY_HZ=500;
const SECONDS=1.25;
const RESPONSES=new Set(['left','right','both','none','uncertain']);
const DEVICE_TYPES=new Set(['headphones','speaker','car']);

export function createHear3ManualChannelCheck({
 adapterFactory=createWebAudioToneAdapter,
 onChange=()=>{},
}={}){
 check(typeof adapterFactory==='function'&&typeof onChange==='function',
  'Invalid channel-check dependencies');
 let device='headphones',phase='left',state='idle',
  observations=[],epoch=0,disposed=false,activeToneId=null;
 let adapter;
 const emit=()=>{try{onChange(snapshot());}catch{/* diagnostic callback never starts audio */}};
 function snapshot(){
  return clone({
   format:HEAR3_CHANNEL_CHECK_FORMAT,deviceType:device,state,
   nextExpectedChannel:phase==='done'?null:phase,
   observations,
   allManualResponsesMatch:device==='headphones'&&observations.length===2&&
    observations[0].heardAt==='left'&&observations[1].heardAt==='right',
   perEarReviewCandidate:device==='headphones'&&observations.length===2&&
    observations[0].heardAt==='left'&&observations[1].heardAt==='right'&&state==='completed',
   jointOnly:!(
    device==='headphones'&&observations.length===2&&
    observations[0].heardAt==='left'&&observations[1].heardAt==='right'&&state==='completed'),
   physicalRouteValidated:false,acousticCalibration:'not-established',
   perEarExamEnabled:false,thresholdsEstimated:0,
   audioPlaying:state==='playing',
  });
 }
 function interrupt(reason='manual'){
  epoch++;
  activeToneId=null;
  adapter?.stop();
  if(state==='playing'||state==='awaiting-response'){
   state='interrupted';
   // A potentially changed route invalidates the whole left/right sequence.
   observations=[];phase='left';
  }
  emit();
  return {interrupted:state==='interrupted',reason};
 }
 function handleToneEnded({toneId}={}){
  if(disposed||state!=='playing'||toneId!==activeToneId)return;
  activeToneId=null;
  state='awaiting-response';emit();
 }
 adapter=adapterFactory({
  onToneEnded:handleToneEnded,
  onInterrupted:()=>interrupt('browser-or-audio-interrupted'),
 });
 function setDeviceType(type){
  check(!disposed,'Channel check disposed');
  check(DEVICE_TYPES.has(type),'Unknown device category');
  interrupt('device-changed');
  device=type;phase='left';observations=[];
  state=type==='headphones'?'idle':'joint-only';
  emit();return snapshot();
 }
 async function playNext({
  userInitiated=false,lowPhysicalVolumeConfirmed=false,
  outputChecked=false,
 }={}){
  check(!disposed,'Channel check disposed');
  check(device==='headphones','Only headphones require L/R side confirmation');
  check(userInitiated===true&&lowPhysicalVolumeConfirmed===true&&outputChecked===true,
   'User must confirm the output and low physical volume for each tone');
  check(['idle','ready-next'].includes(state),'Finish or restart the existing check');
  const side=phase;
  check(side==='left'||side==='right','The two channel checks are already completed');
  const toneId='manual-check-'+side+'-'+(++epoch);
  const request=epoch;
  state='playing';activeToneId=toneId;emit();
  try{
   const result=await adapter.playTone({
    toneId,frequencyHz:FREQUENCY_HZ,digitalLevelDbfs:LEVEL_DBFS,
    durationSeconds:SECONDS,channel:side,
    authorizedDigitalRangeDbfs:DIGITAL_RANGE,
   });
   if(request!==epoch||disposed)return {started:false,reason:'obsolete'};
   if(result?.started!==true){
    interrupt('audio-not-started');
    return {started:false,reason:'audio-not-started'};
   }
   return {started:true,channel:side};
  }catch(error){
   if(request===epoch)interrupt('audio-unavailable');
   throw error;
  }
 }
 function answer(perceived){
  check(!disposed,'Channel check disposed');
  check(state==='awaiting-response','Wait for the tone to finish before answering');
  check(RESPONSES.has(perceived),'Unknown perceived channel');
  const prompted=phase;
  observations.push({
   requestedChannel:prompted,heardAt:perceived,
   provenance:'subjective-user-report-not-physical-verification',
  });
  if(perceived!==prompted){
   phase='done';state='completed';
  }else if(prompted==='left'){
   phase='right';state='ready-next';
  }else{
   phase='done';state='completed';
  }
  emit();return snapshot();
 }
 function restart({userInitiated=false}={}){
  check(!disposed,'Channel check disposed');
  check(userInitiated===true,'Restart requires explicit user action');
  interrupt('restart');
  observations=[];phase='left';
  state=device==='headphones'?'idle':'joint-only';
  emit();return snapshot();
 }
 async function dispose(){
  if(disposed)return;
  interrupt('dispose');
  disposed=true;
  await adapter.dispose?.();
 }
 return Object.freeze({setDeviceType,playNext,answer,restart,interrupt,snapshot,dispose});
}
