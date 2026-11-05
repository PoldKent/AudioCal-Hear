/**
 * Hear 3.0 P0 D-057 — conservative, side-effect-free Web Audio preflight.
 * Feature presence does NOT validate physical output, acoustic safety,
 * audibility, device identity or actual audio scheduling behavior.
 * No AudioContext is constructed and no sound is played here.
 */
export const HEAR3_AUDIO_PREFLIGHT_FORMAT='hear3-audio-capability-preflight-v1';
const feature=(fn)=>{try{return fn()===true;}catch{return false;}};

export function inspectHear3AudioCapabilities(env=globalThis){
 let Context=null,prototype=null;
 try{
  Context=env?.AudioContext??env?.webkitAudioContext??null;
  prototype=typeof Context==='function'?Context.prototype??null:null;
 }catch{
  Context=null;prototype=null;
 }
 const contextAvailable=typeof Context==='function';
 const oscillator=contextAvailable&&feature(()=>typeof prototype?.createOscillator==='function');
 const gain=contextAvailable&&feature(()=>typeof prototype?.createGain==='function');
 const resume=contextAvailable&&feature(()=>typeof prototype?.resume==='function');
 const stereoPanner=contextAvailable&&feature(()=>typeof prototype?.createStereoPanner==='function');
 // Do not require optional stereo panning for a joint-channel fallback.
 // Scheduled sound and immediate stop remain verified at playback time.
 const essential=contextAvailable&&oscillator&&gain;
 const missingEssential=[
  ...(!contextAvailable?['audio-context']:[]),
  ...(!oscillator?['oscillator']:[]),
  ...(!gain?['gain-control']:[]),
 ];
 return Object.freeze({
  format:HEAR3_AUDIO_PREFLIGHT_FORMAT,
  canAttemptJointTone:essential,
  canAttemptIndependentDigitalChannels:essential&&stereoPanner,
  features:Object.freeze({
   audioContext:contextAvailable,
   oscillator,gain,contextResume:resume,stereoPanner,
  }),
  missingEssential:Object.freeze(missingEssential),
  inspectionKind:'static-feature-detection-only',
  sampleRateVerified:false,
  oscillatorBehaviorVerified:false,
  physicalOutputVerified:false,
  acousticLevelVerified:false,
  requiresExplicitPlaybackAction:true,
  recommendedFallback:essential?'manual-route-confirmation':
   'results-and-backups-only-no-audio',
 });
}
