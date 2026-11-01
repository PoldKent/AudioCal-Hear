import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the production logic without browser audio, localStorage or DOM.
const src=fs.readFileSync(new URL('../src/js/04-equalization.js',import.meta.url),'utf8');
const start=src.indexOf('function gather(p){');
const end=src.indexOf('function balanceMarkup(){');
assert.ok(start>=0&&end>start,'EQ calculation section must be extractable');
const sandbox={
 key:(f,side)=>f+'|'+side,
 median:values=>{const a=[...values].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2},
 independentThresholdPair:()=>false,
 autoCoverageMinimum:p=>Math.max(4,Math.ceil(p.bands.length*.55)),
 normalizeCalibrationContext:()=>({}),
 contextAutoBlockReason:()=>null,
 roundTo:(v,step)=>Math.round(v/step)*step,
 clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
 cleanTaste:()=>({}),
 tasteGain:()=>0,
 balanceGain:()=>0
};
vm.createContext(sandbox);
vm.runInContext(src.slice(start,end),sandbox);
const bands=[30,60,120,250,500,1000,2000,4000,8000,16000];
const levels=[-36,-60,-68,-72,-84,-96,-90,-96,-86,-25];
function makeProfile(){
 const p={bands,channels:'separate',passes:1,measures:{},testMode:'complete',
  type:'headphones',step:1,min:-20,max:20,manual:{}};
 bands.forEach((f,i)=>{
  for(const side of ['left','right'])
   p.measures[f+'|'+side]=[{kind:'heard',db:levels[i]+(side==='right'?1:0),confidence:'low',method:'adaptive-v21-short'}];
 });
 return p;
}
test('20 recorded single-pass low-confidence thresholds count as 10 measured EQ bands',()=>{
 const p=makeProfile(),before=JSON.stringify(p.measures);
 const data=sandbox.gather(p),coverage=sandbox.thresholdCoverage(p,data);
 assert.equal(coverage.measured.length,10);
 assert.equal(coverage.complete.length,10);
 assert.equal(coverage.eligible.length,10);
 assert.equal(coverage.lowConfidence,10);
 assert.equal(coverage.enough,true);
 const rec=sandbox.recommend(p);
 assert.equal(rec.length,10);
 assert.ok(rec.some(b=>b.base!==0),'Strong local contrasts allow a provisional small EQ adjustment');
 assert.ok(rec.every(b=>Math.abs(b.base)<=1),'Uncertain thresholds never trigger more than 1 dB automatically');
 assert.equal(JSON.stringify(p.measures),before,'Original measurements are not modified');
});
test('missing a channel removes automatic eligibility without erasing its measured threshold',()=>{
 const p=makeProfile();delete p.measures['2000|right'];
 const coverage=sandbox.thresholdCoverage(p,sandbox.gather(p));
 assert.equal(coverage.observed.length,10);
 assert.equal(coverage.measured.length,9);
 assert.equal(coverage.complete.length,9);
 assert.equal(coverage.eligible.length,9);
 const rec=sandbox.recommend(p),band=rec.find(b=>b.f===2000);
 assert.equal(band.base,0);
 assert.match(band.autoReason,/faltan umbrales/);
});
test('marked left/right disagreement remains measured but blocks its automatic EQ band',()=>{
 const p=makeProfile();
 p.measures['4000|right'][0].db=-72;
 const data=sandbox.gather(p),coverage=sandbox.thresholdCoverage(p,data);
 assert.equal(coverage.complete.length,10);
 assert.equal(coverage.eligible.length,9);
 const band=sandbox.recommend(p).find(x=>x.f===4000);
 assert.equal(band.quality,'mixed');
 assert.equal(band.base,0);
});
