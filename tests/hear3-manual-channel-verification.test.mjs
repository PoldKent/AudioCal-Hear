import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3ManualChannelCheck,HEAR3_CHANNEL_CHECK_FORMAT}
 from '../src/hear3/manual-channel-verification.mjs';

function fixture(){
 const played=[];const callbacks={};
 let stopped=0,disposed=0;
 const controller=createHear3ManualChannelCheck({
  adapterFactory:hooks=>{
   Object.assign(callbacks,hooks);
   return {
    async playTone(params){
     played.push(structuredClone(params));
     return {started:true,toneId:params.toneId};
    },
    stop(){stopped++;},
    async dispose(){disposed++;},
   };
  },
 });
 return {controller,played,callbacks,
  completeLast(){
   callbacks.onToneEnded({toneId:played.at(-1).toneId});
  },
  interrupted(){callbacks.onInterrupted({reason:'context-suspended'});},
  counts:()=>({stopped,disposed}),
 };
}
const consent={userInitiated:true,lowPhysicalVolumeConfirmed:true,outputChecked:true};
test('manual L/R check is silent by default, user-initiated and constrained to digital bounds',async()=>{
 const f=fixture();
 const before=f.controller.snapshot();
 assert.equal(before.format,HEAR3_CHANNEL_CHECK_FORMAT);
 assert.equal(before.jointOnly,true);
 assert.equal(before.physicalRouteValidated,false);
 assert.equal(before.perEarExamEnabled,false);
 assert.equal(f.played.length,0);
 await assert.rejects(f.controller.playNext(),/User must confirm/);
 assert.equal(f.played.length,0);
 const a=await f.controller.playNext(consent);
 assert.equal(a.started,true);
 assert.equal(a.channel,'left');
 assert.deepEqual(f.played[0].authorizedDigitalRangeDbfs,{minDbfs:-80,maxDbfs:-42});
 assert.equal(f.played[0].frequencyHz,500);
 assert.equal(f.played[0].digitalLevelDbfs,-60);
 assert.equal(f.played[0].durationSeconds,1.25);
 assert.equal(f.played[0].channel,'left');
});
test('first response can be given only after tone ends; next side never autoplays',async()=>{
 const f=fixture();
 await f.controller.playNext(consent);
 assert.throws(()=>f.controller.answer('left'),/Wait for the tone to finish/);
 f.completeLast();
 assert.equal(f.controller.snapshot().state,'awaiting-response');
 const left=f.controller.answer('left');
 assert.equal(left.state,'ready-next');
 assert.equal(left.observations[0].provenance,'subjective-user-report-not-physical-verification');
 assert.equal(f.played.length,1);
 assert.equal(left.nextExpectedChannel,'right');
 await assert.rejects(f.controller.playNext(),/User must confirm/);
 await f.controller.playNext(consent);
 assert.equal(f.played.length,2);
 assert.equal(f.played[1].channel,'right');
 f.completeLast();
 const done=f.controller.answer('right');
 assert.equal(done.perEarReviewCandidate,true);
 assert.equal(done.physicalRouteValidated,false);
 assert.equal(done.perEarExamEnabled,false);
 assert.equal(done.acousticCalibration,'not-established');
 assert.equal(done.thresholdsEstimated,0);
 assert.equal(done.jointOnly,false); // subjective candidate, never activated in the exam
});
test('mismatch or uncertain result retains joint mode without attribution to an ear',async()=>{
 for(const side of ['right','both','none','uncertain']){
  const f=fixture();
  await f.controller.playNext(consent);
  f.completeLast();
  const status=f.controller.answer(side);
  assert.equal(status.state,'completed');
  assert.equal(status.jointOnly,true);
  assert.equal(status.perEarReviewCandidate,false);
  assert.equal(status.perEarExamEnabled,false);
  await assert.rejects(f.controller.playNext(consent),/Finish or restart/);
 }
});
test('speaker and car configurations never trigger single-ear tones',async()=>{
 for(const category of ['speaker','car']){
  const f=fixture();
  const s=f.controller.setDeviceType(category);
  assert.equal(s.jointOnly,true);
  assert.equal(s.state,'joint-only');
  await assert.rejects(f.controller.playNext(consent),/Only headphones/);
  assert.equal(f.played.length,0);
 }
});
test('stop or browser audio interruption invalidates a partial route verification',async()=>{
 const f=fixture();
 await f.controller.playNext(consent);
 f.completeLast();
 f.controller.answer('left');
 await f.controller.playNext(consent);
 const tone=f.played.at(-1).toneId;
 const stopped=f.controller.interrupt('route-changed');
 assert.equal(stopped.interrupted,true);
 f.callbacks.onToneEnded({toneId:tone});
 const s=f.controller.snapshot();
 assert.equal(s.state,'interrupted');
 assert.deepEqual(s.observations,[]);
 assert.equal(s.nextExpectedChannel,'left');
 assert.equal(s.jointOnly,true);
 assert.throws(()=>f.controller.answer('right'),/Wait for the tone to finish/);
 f.controller.restart({userInitiated:true});
 await f.controller.playNext(consent);
 f.interrupted();
 assert.equal(f.controller.snapshot().state,'interrupted');
 assert.equal(f.controller.snapshot().observations.length,0);
});
test('changing equipment and explicitly restarting clear old user observations',async()=>{
 const f=fixture();
 await f.controller.playNext(consent);f.completeLast();f.controller.answer('left');
 f.controller.setDeviceType('speaker');
 assert.equal(f.controller.snapshot().observations.length,0);
 f.controller.setDeviceType('headphones');
 assert.equal(f.controller.snapshot().nextExpectedChannel,'left');
 assert.throws(()=>f.controller.restart(),/explicit user action/);
 f.controller.restart({userInitiated:true});
 assert.equal(f.controller.snapshot().state,'idle');
 assert.equal(f.controller.snapshot().physicalRouteValidated,false);
});
test('unknown answers and device categories are rejected without fake evidence',async()=>{
 const f=fixture();
 assert.throws(()=>f.controller.setDeviceType('headset-magic'),/Unknown device/);
 await f.controller.playNext(consent);
 f.completeLast();
 assert.throws(()=>f.controller.answer('yes'),/Unknown perceived channel/);
 assert.equal(f.controller.snapshot().observations.length,0);
});
test('disposing while sounding silences and prevents further tests',async()=>{
 const f=fixture();
 await f.controller.playNext(consent);
 await f.controller.dispose();
 assert.ok(f.counts().stopped>=1);
 assert.equal(f.counts().disposed,1);
 await assert.rejects(f.controller.playNext(consent),/disposed/);
});
