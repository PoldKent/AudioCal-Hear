import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHear3AudioCapabilities,HEAR3_AUDIO_PREFLIGHT_FORMAT}
 from '../src/hear3/audio-capability-preflight.mjs';

test('no audio context means playback blocked, but local records can remain accessible',()=>{
 const out=inspectHear3AudioCapabilities({});
 assert.equal(out.format,HEAR3_AUDIO_PREFLIGHT_FORMAT);
 assert.equal(out.canAttemptJointTone,false);
 assert.equal(out.canAttemptIndependentDigitalChannels,false);
 assert.deepEqual(out.missingEssential,['audio-context','oscillator','gain-control']);
 assert.equal(out.recommendedFallback,'results-and-backups-only-no-audio');
 assert.equal(out.physicalOutputVerified,false);
 assert.equal(out.acousticLevelVerified,false);
});
test('essential oscillator+gain allow only a user-triggered attempt, not an acoustic claim',()=>{
 let constructed=0;
 class AudioContext{
  constructor(){constructed++;}
  createOscillator(){}
  createGain(){}
  resume(){}
 }
 const result=inspectHear3AudioCapabilities({AudioContext});
 assert.equal(constructed,0);
 assert.equal(result.canAttemptJointTone,true);
 assert.equal(result.canAttemptIndependentDigitalChannels,false);
 assert.equal(result.requiresExplicitPlaybackAction,true);
 assert.equal(result.sampleRateVerified,false);
 assert.equal(result.oscillatorBehaviorVerified,false);
 assert.equal(result.physicalOutputVerified,false);
 assert.equal(result.acousticLevelVerified,false);
});
test('stereo panner is optional and never establishes physical L/R separation',()=>{
 class AC{
  createOscillator(){}
  createGain(){}
  createStereoPanner(){}
 }
 const p=inspectHear3AudioCapabilities({AudioContext:AC});
 assert.equal(p.canAttemptJointTone,true);
 assert.equal(p.canAttemptIndependentDigitalChannels,true);
 assert.equal(p.physicalOutputVerified,false);
 assert.equal(p.features.contextResume,false);
});
test('missing essential gain blocks both joint and independent channels',()=>{
 class AC{
  createOscillator(){}
  createStereoPanner(){}
 }
 const p=inspectHear3AudioCapabilities({AudioContext:AC});
 assert.equal(p.canAttemptJointTone,false);
 assert.equal(p.canAttemptIndependentDigitalChannels,false);
 assert.deepEqual(p.missingEssential,['gain-control']);
});
test('untrusted constructors/getters fail closed without propagating their private error text',()=>{
 const env={};
 Object.defineProperty(env,'AudioContext',{get(){throw Error('SECRET PHYSICAL DEVICE ID');}});
 const p=inspectHear3AudioCapabilities(env);
 assert.equal(p.canAttemptJointTone,false);
 assert.equal(JSON.stringify(p).includes('SECRET'),false);
 const secondary={webkitAudioContext:function(){}};
 Object.defineProperty(secondary.webkitAudioContext.prototype,'createOscillator',{
  get(){throw Error('SENSITIVE');},
 });
 const q=inspectHear3AudioCapabilities(secondary);
 assert.equal(q.canAttemptJointTone,false);
 assert.equal(JSON.stringify(q).includes('SENSITIVE'),false);
});
test('WebKit-compatible prefixed Web Audio availability does not require a browser name',()=>{
 class KitCtx{createOscillator(){}createGain(){}}
 const out=inspectHear3AudioCapabilities({webkitAudioContext:KitCtx});
 assert.equal(out.canAttemptJointTone,true);
 assert.equal(out.features.audioContext,true);
 assert.equal(out.features.stereoPanner,false);
});
