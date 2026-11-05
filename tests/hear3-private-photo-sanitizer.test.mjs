import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3PrivatePhotoSession} from '../src/hear3/private-photo-sanitizer.mjs';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3,4]);
const jpg=Uint8Array.from([255,216,255,219,1,2]);
const input=(bytes=png,type='image/png')=>new Blob([bytes],{type});
function fixture({decodeImage,makeCanvas}={}){
 const urls=new Map(),revoked=[];
 let created=0,draws=0,closed=0;
 const make=makeCanvas??(()=>({
  getContext:()=>({fillRect(){},drawImage(){draws++;},set fillStyle(v){}}),
  toBlob(cb){cb(new Blob([png],{type:'image/png'}));},
 }));
 const decode=decodeImage??(async()=>({width:1200,height:800,close(){closed++;}}));
 const c=createHear3PrivatePhotoSession({
  decodeImage:decode,makeCanvas:make,
  objectUrls:{
   createObjectURL(b){const id='blob:test-'+(++created);urls.set(id,b);return id;},
   revokeObjectURL(id){urls.delete(id);revoked.push(id);},
  },
 });
 return {c,urls,revoked,counts:()=>({created,draws,closed})};
}
test('explicit local image produces new raster summary and revocable only sanitized URL',async()=>{
 const f=fixture();
 await assert.rejects(f.c.inspect(input()),/explicit user action/);
 assert.equal(f.c.snapshot(),null);
 const p=await f.c.inspect(input(),{userInitiated:true});
 assert.equal(p.summary.format,'hear3-private-photo-raster-v1');
 assert.equal(p.summary.photoUploaded,false);
 assert.equal(p.summary.photoStored,false);
 assert.equal(p.summary.eqOrDeviceRecognized,false);
 assert.equal(p.summary.sourceMetadataCopied,false);
 assert.equal(p.summary.sourceWidth,1200);
 assert.equal(p.summary.outputWidth,1200);
 assert.equal(f.counts().draws,1);
 assert.equal(f.counts().closed,1);
 assert.equal(f.urls.size,1);
 assert.equal(f.c.getSanitizedBlob({userInitiated:true}).type,'image/png');
 assert.throws(()=>f.c.getSanitizedBlob(),/Explicit action/);
 f.c.clear();
 assert.equal(f.urls.size,0);
 assert.deepEqual(f.revoked,[p.previewUrl]);
 assert.equal(f.c.snapshot(),null);
});
test('oversized, incorrect signature and dangerous SVG/GIF fail before decoding',async()=>{
 let calls=0;
 const f=fixture({decodeImage:async()=>{calls++;return {width:1,height:1}}});
 for(const [blob,error] of [
  [input(png,'image/svg+xml'),/supported/],
  [input(jpg,'image/png'),/signature/],
  [input(png,'image/jpeg'),/signature/],
  [new Blob([new Uint8Array(8*1024*1024+1)],{type:'image/png'}),/8 MiB/],
 ]){
  await assert.rejects(f.c.inspect(blob,{userInitiated:true}),error);
 }
 assert.equal(calls,0);
 assert.equal(f.c.snapshot(),null);
});
test('very large decoded dimensions are refused with bitmap released',async()=>{
 let closed=0;
 const f=fixture({decodeImage:async()=>({width:10000,height:4000,close(){closed++;}})});
 await assert.rejects(f.c.inspect(input(),{userInitiated:true}),/dimensions/);
 assert.equal(closed,1);
 assert.equal(f.urls.size,0);
});
test('large but valid images downscale preserving aspect and close decoded bitmap',async()=>{
 let width,height;
 const f=fixture({
  decodeImage:async()=>({width:6000,height:1800,close(){}}),
  makeCanvas:()=>({set width(v){width=v;},set height(v){height=v;},
   getContext:()=>({fillRect(){},drawImage(){},set fillStyle(v){}}),
   toBlob(cb){cb(new Blob([png],{type:'image/png'}));}}),
 });
 const out=await f.c.inspect(input(),{userInitiated:true});
 assert.equal(width,1600);assert.equal(height,480);
 assert.equal(out.summary.outputWidth,1600);
 assert.equal(out.summary.outputHeight,480);
});
test('change/clear invalidates asynchronous in-flight decode, no stale URL',async()=>{
 let resolve,entered;
 const started=new Promise(r=>{entered=r;});
 const f=fixture({decodeImage:()=>{entered();return new Promise(r=>{resolve=r;});}});
 const pending=f.c.inspect(input(),{userInitiated:true});
 await started;
 f.c.clear();
 resolve({width:2,height:2,close(){}});
 await assert.rejects(pending,/changed/);
 assert.equal(f.urls.size,0);
 assert.equal(f.c.snapshot(),null);
});
test('dispose revokes URLs and refuses further photo processing',async()=>{
 const f=fixture();
 await f.c.inspect(input(),{userInitiated:true});
 f.c.dispose();
 assert.equal(f.urls.size,0);
 await assert.rejects(f.c.inspect(input(),{userInitiated:true}),/disposed/);
});
