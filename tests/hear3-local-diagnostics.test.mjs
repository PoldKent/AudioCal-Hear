import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createHear3LocalDiagnostic,HEAR3_DIAGNOSTIC_FORMAT,
} from '../src/hear3/local-diagnostics.mjs';

function environment(){
 let openedContexts=0,storageReads=0;
 class AC{
  constructor(){openedContexts++;}
  createGain(){}
  createOscillator(){}
  createStereoPanner(){}
 }
 const env={
  AudioContext:AC,isSecureContext:true,
  navigator:{serviceWorker:{},clipboard:{writeText(){}}},
  caches:{},
  Blob:class{},
  URL:{createObjectURL(){}},
  fetch(){throw Error('Diagnostic must not use network');},
 };
 Object.defineProperty(env,'localStorage',{
  get(){storageReads++;return {getItem(){throw Error('Must never read profiles');}};},
 });
 Object.defineProperty(env,'sessionStorage',{
  get(){storageReads++;return {getItem(){throw Error('Must never read results');}};},
 });
 return {env,count:()=>({openedContexts,storageReads})};
}
test('technical report contains capability booleans but no personal data, URL or user agent',()=>{
 const f=environment();
 const tool=createHear3LocalDiagnostic({
  env:f.env,now:()=> '2026-11-05T20:00:00.000Z',
 });
 const out=tool.preview();
 assert.equal(out.format,HEAR3_DIAGNOSTIC_FORMAT);
 assert.equal(out.capabilities.audioContext,true);
 assert.equal(out.capabilities.audioGain,true);
 assert.equal(out.capabilities.audioOscillator,true);
 assert.equal(out.capabilities.stereoPanner,true);
 assert.equal(out.capabilities.serviceWorker,true);
 assert.equal(out.capabilities.localStorageApi,true);
 assert.equal(out.capabilities.clipboardWrite,true);
 assert.equal(out.issueCodes.length,0);
 assert.equal(out.personalDataIncluded,false);
 assert.equal(out.physicalDeviceVerified,false);
 assert.equal(out.remoteTransmissionAttempted,false);
 const serialized=JSON.stringify(out);
 for(const forbidden of ['userAgent','profileId','observations','hearing',
  'localStorageKey','ipAddress','deviceId','location','rawError']){
  assert.equal(serialized.includes('"'+forbidden+'"'),false,forbidden);
 }
 assert.equal(f.count().openedContexts,0);
 assert.equal(f.count().storageReads,2);
});
test('raw exception messages and arbitrary error codes are never emitted',()=>{
 const f=environment();
 const tool=createHear3LocalDiagnostic({env:f.env});
 assert.throws(()=>tool.addIssue('token=secret-user-data'),/Unknown technical issue/);
 tool.addIssue('audio-interrupted');
 tool.addIssue('audio-interrupted');
 tool.addIssue('storage-blocked');
 const output=tool.preview();
 assert.deepEqual(output.issueCodes,['audio-interrupted','storage-blocked']);
 assert.equal(JSON.stringify(output).includes('secret-user-data'),false);
});
test('exclusion of technical capabilities and codes is explicit and reliable',()=>{
 const f=environment();
 const tool=createHear3LocalDiagnostic({env:f.env});
 tool.addIssue('checkpoint-damaged');
 const output=tool.preview({includeCapabilities:false,includeIssueCodes:false});
 assert.equal(output.capabilities,null);
 assert.deepEqual(output.issueCodes,[]);
 assert.equal(output.physicalDeviceVerified,false);
});
test('report cannot be exported unless a preview exists and approval is explicit',()=>{
 const tool=createHear3LocalDiagnostic({env:environment().env});
 assert.throws(()=>tool.exportReviewed({confirmed:true}),/Preview/);
 tool.preview();
 assert.throws(()=>tool.exportReviewed(),/Explicit approval/);
 const output=JSON.parse(tool.exportReviewed({confirmed:true}));
 assert.equal(output.format,HEAR3_DIAGNOSTIC_FORMAT);
});
test('changing issue codes invalidates prior reviewed report',()=>{
 const tool=createHear3LocalDiagnostic({env:environment().env});
 tool.preview();
 tool.addIssue('offline-unavailable');
 assert.throws(()=>tool.exportReviewed({confirmed:true}),/Preview/);
 tool.preview();
 tool.clearIssues();
 assert.throws(()=>tool.exportReviewed({confirmed:true}),/Preview/);
});
test('storage and Web Audio feature getter failures are safely represented, not thrown',()=>{
 const env={isSecureContext:false, navigator:{},fetch(){}};
 Object.defineProperty(env,'AudioContext',{get(){throw Error('private device username secret');}});
 const tool=createHear3LocalDiagnostic({env});
 const blocked=tool.preview();
 assert.equal(blocked.capabilities.audioContext,false);
 assert.equal(JSON.stringify(blocked).includes('private device username secret'),false);
 // Unknown errors are not copied into a report.
 const plain={isSecureContext:false,navigator:{},caches:null,fetch(){}};
 const safe=createHear3LocalDiagnostic({env:plain});
 assert.equal(safe.preview().capabilities.audioContext,false);
});
test('technical issues are local-only and report preview does not transmit automatically',()=>{
 const f=environment();let networkCalls=0;
 f.env.fetch=()=>{networkCalls++;throw Error('network blocked');};
 const tool=createHear3LocalDiagnostic({env:f.env});
 tool.addIssue('route-unverified');
 const output=tool.preview();
 assert.equal(output.issueCodes[0],'route-unverified');
 assert.equal(networkCalls,0);
 assert.equal(JSON.parse(tool.exportReviewed({confirmed:true})).remoteTransmissionAttempted,false);
});
