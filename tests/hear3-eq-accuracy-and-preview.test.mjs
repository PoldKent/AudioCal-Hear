import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHear3BoundedJointEq,HEAR3_EQ_ENGINE_FORMAT} from '../src/hear3/bounded-eq-engine.mjs';
import {proposeHear3ExperimentalListeningEq,summarizeHear3DigitalRangeCoverage}
 from '../src/hear3/experimental-listening-eq.mjs';
import {resolveHear3GraphicBandLayout} from '../src/hear3/eq-band-layouts.mjs';
import {formatHear3ImmediateEq,inspectHear3ImmediateEq} from '../src/hear3/immediate-eq-result.mjs';
import {buildHearFocusLayout,HEAR_FOCUS_DEFAULT_BAND_PRESET} from '../src/hear3/focus-experience.mjs';
import {planHear3PreviewFilters,qForOctaves,createHear3EqPreviewPlayer,isHear3PreviewAudioFile}
 from '../src/hear3/eq-preview-player.mjs';

// Same fixture shape as the bounded engine tests: a narrow bracket per band.
function makeCase(freqs,levels){
 let n=0;
 const bands=freqs.map((frequencyHz,i)=>{
  const mid=levels[i];
  const obs=Array.from({length:4},(_,j)=>{
   const heard=j%2===0;
   return {toneId:'tone-'+(++n),frequencyHz,digitalLevelDbfs:mid+(heard?3:-3),channel:'joint',
    response:heard?'heard':'not-heard',provenance:'user-response'};
  });
  return {id:'band-'+frequencyHz,frequencyHz,status:'bounded-subjective-interval',
   intervalDbfs:{notHeardAtDbfs:mid-3,heardAtDbfs:mid+3},confidence:'medium',observations:obs};
 });
 const range={minDbfs:-80,maxDbfs:-42};
 return {examSnapshot:{status:'completed',profileId:'pilot',channel:'joint',completedBands:bands.length,
   totalBands:bands.length,activeToneId:null,thresholdsEstimated:0,eqGainsCalculated:0,
   authorizedDigitalRangeDbfs:range,bands},
  sessionSnapshot:{status:'completed',profileId:'pilot',currentTone:null,authorizedDigitalRangeDbfs:range,
   observations:bands.flatMap(b=>b.observations),invalidatedToneIds:[]},
  deviceCategory:'headphones'};
}
const F5=[125,250,500,1000,2000];

test('a single deviant band no longer pushes its ordinary neighbours the other way',()=>{
 const treble=calculateHear3BoundedJointEq(makeCase(F5,[-66,-66,-66,-66,-52]));
 assert.deepEqual(treble.rows.map(r=>r.gainDb),[0,0,0,0,3]);
 const bass=calculateHear3BoundedJointEq(makeCase(F5,[-50,-70,-70,-70,-70]));
 assert.deepEqual(bass.rows.map(r=>r.gainDb),[3,0,0,0,0]);
 const flat=calculateHear3BoundedJointEq(makeCase(F5,[-65,-65,-65,-65,-65]));
 assert.deepEqual(flat.rows.map(r=>r.gainDb),[0,0,0,0,0]);
});

test('a band that differs from two agreeing neighbours keeps its direction',()=>{
 const dip=calculateHear3BoundedJointEq(makeCase(F5,[-66,-66,-76,-66,-66]));
 assert.ok(dip.rows[2].gainDb<0,'more sensitive band is attenuated');
 assert.deepEqual([dip.rows[0],dip.rows[1],dip.rows[3],dip.rows[4]].map(r=>r.gainDb),[0,0,0,0]);
});

test('"too loud" keeps the deeper contrast cut and never weakens it',()=>{
 const c=makeCase(F5,[-66,-66,-66,-66,-76]);
 const base=calculateHear3BoundedJointEq(c);
 assert.ok(base.rows[4].gainDb<=-2);
 const heard=c.sessionSnapshot.observations.find(o=>o.frequencyHz===2000&&o.response==='heard');
 const out=proposeHear3ExperimentalListeningEq({baseEq:base,...c,
  loudToneReports:[{toneId:heard.toneId,frequencyHz:2000}]});
 assert.equal(out.rows[4].gainDb,base.rows[4].gainDb);
 assert.equal(out.rows[4].source,'explicit-too-loud-attenuate');
 // A band whose contrast suggested a boost still becomes a 1 dB cut.
 const boost=makeCase(F5,[-66,-66,-66,-66,-52]);
 const b2=calculateHear3BoundedJointEq(boost);
 const heard2=boost.sessionSnapshot.observations.find(o=>o.frequencyHz===2000&&o.response==='heard');
 const out2=proposeHear3ExperimentalListeningEq({baseEq:b2,...boost,
  loudToneReports:[{toneId:heard2.toneId,frequencyHz:2000}]});
 assert.equal(out2.rows[4].gainDb,-1);
});

function rangeCase(perBand){
 let n=0;
 const bands=perBand.map(([frequencyHz,list])=>({id:'band-'+frequencyHz,frequencyHz,
  observations:list.map(([dbfs,response])=>({toneId:'t'+(++n),frequencyHz,digitalLevelDbfs:dbfs,
   channel:'joint',response,provenance:'user-response'}))}));
 return {examSnapshot:{status:'completed',bands,authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42}},
  sessionSnapshot:{invalidatedToneIds:[],authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42}}};
}
test('coverage explains a flat result caused by too much physical volume',()=>{
 const everythingHeard=[-60,-66,-72,-78,-80].map(d=>[d,'heard']);
 const c=summarizeHear3DigitalRangeCoverage(rangeCase([
  [125,[[-60,'heard'],[-66,'heard'],[-72,'not-heard'],[-69,'heard']]],
  [250,everythingHeard],[500,everythingHeard],[1000,everythingHeard],[2000,everythingHeard]]));
 assert.equal(c.advice,'volume-too-high');
 assert.deepEqual(c.floorHeard,[250,500,1000,2000]);
 assert.equal(c.total,5);
});
test('coverage flags a pattern of silence at the ceiling but not one silent extreme band',()=>{
 const silent=[-60,-54,-48,-42].map(d=>[d,'not-heard']);
 const normal=[[-60,'heard'],[-66,'not-heard'],[-63,'heard']];
 assert.equal(summarizeHear3DigitalRangeCoverage(rangeCase([[60,normal],[230,normal],[14000,silent]])).advice,null);
 const two=summarizeHear3DigitalRangeCoverage(rangeCase([[60,silent],[230,normal],[14000,silent]]));
 assert.equal(two.advice,'not-heard-at-ceiling');
 assert.deepEqual(two.ceilingMissed,[60,14000]);
});

test('default layout covers bass and treble (Android 5-band) and legacy 5 stays available',()=>{
 assert.equal(HEAR_FOCUS_DEFAULT_BAND_PRESET,'android-5');
 assert.deepEqual(buildHearFocusLayout().map(b=>b.frequencyHz),[60,230,910,3600,14000]);
 assert.deepEqual(resolveHear3GraphicBandLayout({preset:'5'}).map(b=>b.frequencyHz),[125,250,500,1000,2000]);
});

test('copied text uses the translated title and keeps a safe fallback',()=>{
 const rows=[{bandId:'band-60',frequencyHz:60,gainDb:1},{bandId:'band-230',frequencyHz:230,gainDb:0}];
 const view={rows,warning:'Guidance only.'};
 assert.match(formatHear3ImmediateEq(view,{title:'AudioCal Hear · My equalizer (not calibrated)'}),/^AudioCal Hear · My equalizer/);
 assert.match(formatHear3ImmediateEq(view),/^AudioCal Hear · Mi ecualizador \(no calibrado\)/);
 assert.match(formatHear3ImmediateEq(view,{title:''}),/Mi ecualizador/);
});

test('preview filters: octave Q, constant pre-gain below the modelled peak, flat curve untouched',()=>{
 assert.ok(Math.abs(qForOctaves(1)-1.4142)<1e-3);
 const flat=planHear3PreviewFilters([{frequencyHz:60,gainDb:0},{frequencyHz:230,gainDb:0},{frequencyHz:910,gainDb:0}]);
 assert.equal(flat.preGainDb,0);
 const plan=planHear3PreviewFilters([60,230,910,3600,14000].map((f,i)=>({frequencyHz:f,gainDb:[3,3,0,-2,3][i]})));
 assert.ok(plan.modelledPeakDb>=3,'overlapping boosts are modelled');
 assert.ok(plan.preGainDb<=-(plan.modelledPeakDb+1)+1e-9,'pre-gain covers peak plus 1 dB guard');
 assert.ok(plan.bands.every(b=>b.q>=0.3&&b.q<=8));
 assert.throws(()=>planHear3PreviewFilters([{frequencyHz:500,gainDb:0},{frequencyHz:250,gainDb:0}]),/inválidas/);
 assert.throws(()=>planHear3PreviewFilters([{frequencyHz:60,gainDb:40},{frequencyHz:230,gainDb:0}]),/fuera de rango/);
});

function fakeEnv(){
 const calls={created:0,revoked:[]};
 class Param{constructor(){this.value=null;}setValueAtTime(v){this.value=v;}}
 class Node{constructor(){this.next=null;}connect(n){this.next=n;return n;}}
 class Context{
  constructor(){calls.created++;this.sampleRate=48000;this.currentTime=0;this.destination=new Node();this.closed=false;}
  createMediaElementSource(){return new Node();}
  createGain(){const n=new Node();n.gain=new Param();return n;}
  createBiquadFilter(){const n=new Node();n.frequency=new Param();n.Q=new Param();n.gain=new Param();return n;}
  async resume(){}async close(){this.closed=true;}
 }
 const env={AudioContext:Context,URL:{createObjectURL:()=>'blob:x',revokeObjectURL:u=>calls.revoked.push(u)}};
 const audio={played:0,paused:0,src:'',currentTime:5,async play(){this.played++;},pause(){this.paused++;},removeAttribute(){this.src='';}};
 return {env,audio,calls};
}
test('preview never plays without a click, keeps level constant for A/B and releases the file',async()=>{
 const {env,audio,calls}=fakeEnv();
 const player=createHear3EqPreviewPlayer({env,audio});
 assert.equal(isHear3PreviewAudioFile({name:'notes.txt',type:'text/plain',size:10}),false);
 assert.throws(()=>player.loadFile({name:'notes.txt',type:'text/plain',size:10}),/audio/);
 player.loadFile({name:'song.mp3',type:'audio/mpeg',size:1000});
 player.setEq([60,230,910,3600,14000].map((f,i)=>({frequencyHz:f,gainDb:[2,0,0,-1,2][i]})));
 assert.equal(calls.created,0,'no audio graph before an explicit play');
 await assert.rejects(player.play(),/Reproducir/);
 assert.equal(audio.played,0);
 await player.play({userInitiated:true});
 assert.equal(audio.played,1);
 const withEq=player.getState();
 assert.equal(withEq.state,'playing');
 assert.ok(withEq.preGainDb<0);
 player.setBypass(true);
 assert.equal(player.getState().preGainDb,withEq.preGainDb,'same pre-gain with and without EQ');
 player.stop();
 assert.equal(audio.currentTime,0);
 await player.dispose();
 assert.deepEqual(calls.revoked,['blob:x']);
});

test('immediate EQ inspection accepts the corrected loud cut',()=>{
 const c=makeCase(F5,[-66,-66,-66,-66,-76]);
 const base=calculateHear3BoundedJointEq(c);
 assert.equal(base.format,HEAR3_EQ_ENGINE_FORMAT);
 const heard=c.sessionSnapshot.observations.find(o=>o.frequencyHz===2000&&o.response==='heard');
 const out=proposeHear3ExperimentalListeningEq({baseEq:base,...c,loudToneReports:[{toneId:heard.toneId,frequencyHz:2000}]});
 assert.equal(inspectHear3ImmediateEq(out).rows[4].gainDb,out.rows[4].gainDb);
});
