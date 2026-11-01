import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('src/js/01-core.js', 'utf8');
const audio = fs.readFileSync('src/js/05-audio-player.js', 'utf8');
const translations = JSON.parse(fs.readFileSync('src/translations.json', 'utf8'));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Execute the actual production threshold-search function in isolation.
// This tests its behavior rather than reproducing a second copy of the algorithm.
const begin = source.indexOf('function boundaryVotes(');
const end = source.indexOf('\nlet page=', begin);
assert(begin >= 0 && end > begin, 'Hearing algorithm extraction boundary changed');
const sandbox = {clamp, getStart: p => p.testStart, getFloor: p => p.testFloor, Math, Number};
vm.runInNewContext(source.slice(begin, end), sandbox);
const next = sandbox.nextTrialLevel;

const trial = () => ({phase:'coarse', level:-36, heard:null, missed:null, verifyIndex:0, done:0});
const profile = {testStart:-36, testFloor:-100};

test('adaptive search confirms a 1 dB threshold without guessing', () => {
  const t = trial();
  const expectedThreshold = -50;
  let status = 'next', checks = 0;
  while (status === 'next' && checks++ < 25) {
    status = next(t, t.level >= expectedThreshold, profile);
  }
  assert.equal(status, 'measured');
  assert.equal(t.heard, -50);
  assert.equal(t.missed, -51);
  assert.equal(t.verifyIndex, 2);
  assert.ok(checks <= 20, 'Test should respect the bounded audio-level schedule');
});

test('a tone heard all the way down to the digital floor stays an observation', () => {
  const t = trial();
  let result = '';
  for (let k = 0; k < 8; k++) {
    result = next(t, true, profile);
    if (result !== 'next') break;
  }
  assert.equal(result, 'stillheard');
  assert.equal(t.level, -100);
});

test('inaudible first tone has no measured threshold', () => {
  const t = trial();
  assert.equal(next(t, false, profile), 'unheard');
});

test('one contradictory answer leads to additional checks and a confirmed threshold when repeatable', () => {
  const t = {phase:'verify',level:-50,heard:-50,missed:-51,verifyIndex:0,
    history:[{db:-50,heard:true},{db:-51,heard:false},{db:-50,heard:false}]};
  assert.equal(next(t,false,profile),'next');
  assert.equal(t.phase,'recheck');
  for(const [db,heard] of [[-50,true],[-51,false],[-50,true],[-51,false]]){
    assert.equal(t.level,db);
    t.history.push({db,heard});
    const result=next(t,heard,profile);
    if(db===-51&&t.recheckIndex===4)assert.equal(result,'measured');
    else assert.equal(result,'next');
  }
  assert.equal(t.heard,-50);
  assert.equal(t.missed,-51);
});

test('repeatedly conflicting replies preserve observations without inventing a threshold', () => {
  const t = {phase:'verify',level:-50,heard:-50,missed:-51,verifyIndex:0,
    history:[{db:-50,heard:true},{db:-51,heard:false},{db:-50,heard:false}]};
  assert.equal(next(t,false,profile),'next');
  let result='next';
  for(let i=0;i<6&&result==='next';i++){
    const level=t.level,heard=level===-51;
    t.history.push({db:level,heard});
    result=next(t,heard,profile);
  }
  assert.equal(result,'unconfirmed');
  assert.equal(t.history.length,9);
});


test('custom digital floor is respected in coarse descent', () => {
  const t = trial(), p = {testStart:-36, testFloor:-60};
  assert.equal(next(t, true, p), 'next');
  assert.equal(t.level, -48);
  assert.equal(next(t, true, p), 'next');
  assert.equal(t.level, -60);
  assert.equal(next(t, true, p), 'stillheard');
});

test('eight localization options, without remote runtime scripts', () => {
  assert.equal(Object.keys(translations).length >= 7, true);
  for (const lang of ['en','fr','pt','it','de','zh','ja']) assert.ok(Object.keys(translations[lang]).length > 30, lang);
  assert.match(html, /const LOCALES=\['es','en','fr','pt','it','de','zh','ja'\]/);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/);
});

test('critical protections and original hardware presets remain present', () => {
  for (const text of ["const STORAGE='audiocal-hear-profiles-v1'",'TEST_END_DB=-100','MAX_SAFE_DB=-24',"case 'endheard'","case 'enduncertain'",'function normalizedProfile(']) assert.ok(html.includes(text),text);
  assert.ok(html.includes("pan.pan.value=side==='left'?-1:side==='right'?1:0"));
});

test('music playback applies headroom for boosted filters and caches identical settings', () => {
  const start=audio.indexOf('function chainPeakDb(');
  const finish=audio.indexOf('\nlet cachedHeadroomKey=',start);
  assert.ok(start>=0 && finish>start, 'EQ headroom routine missing');
  const ctx={Math};
  vm.runInNewContext(audio.slice(start,finish),ctx);
  assert.equal(ctx.chainPeakDb([],48000),0);
  const boosted=ctx.chainPeakDb([{f:1000,g:8,q:1}],48000);
  assert.ok(boosted>3 && boosted<12, 'Unexpected peak estimate '+boosted);
});

test('second pass is a completely new search without using the first threshold',()=>{
 const begin=source.indexOf('function newTrial('),end=source.indexOf('\nfunction boundaryVotes(',begin);
 assert.ok(begin>=0&&end>begin);
 const c={getStart:()=>-36,current:{measures:{'400|both':[{kind:'heard',db:-50}]}},key:(f,s)=>f+'|'+s,Math,Number};
 vm.runInNewContext(source.slice(begin,end),c);
 const second=c.newTrial({f:400,side:'both',pass:1});
 assert.equal(second.level,-36);
 assert.equal(second.phase,'coarse');
 assert.equal(second.heard,null);
 assert.equal(second.missed,null);
 assert.equal(second.history.length,0);
 let status='next',loops=0;
 const p={testStart:-36,testFloor:-100};
 while(status==='next'&&loops++<25)status=next(second,second.level>=-52,p);
 assert.equal(status,'measured');
 assert.equal(second.heard,-52,'second pass must not copy -50 from the first');
});
test('independent evidence requires explicit new method, legacy records are not upgraded',()=>{
 const from=source.indexOf('const INDEPENDENT_PASS_METHOD=');
 const to=source.indexOf('\nlet trial=null',from);
 assert.ok(from>=0&&to>from);
 const c={Number,key:(f,s)=>f+'|'+s};
 vm.runInNewContext(source.slice(from,to),c);
 const p={passes:2,measures:{'400|both':[
  {kind:'heard',db:-50,method:'adaptive-v18-explicit'},
  {kind:'heard',db:-50,method:'adaptive-v18-explicit'}]}};
 assert.equal(c.independentThresholdPair(p,400,'both'),false);
 p.measures['400|both'][1]={kind:'heard',db:-52,method:'adaptive-v20-independent'};
 assert.equal(c.independentThresholdPair(p,400,'both'),true);
 assert.equal(c.independentThresholdPair(p,600,'both'),false);
});

test('translation cannot replace a shorter word inside another word',()=>{
 const start=source.indexOf('function trans('),end=source.indexOf('function localize(',start);
 const context={language:'en',TEXTS:{en:{pendientes:'remaining'}},FRAGMENTS:{en:['pendientes']},String,Object,RegExp};
 vm.runInNewContext(source.slice(start,end),context);
 assert.equal(context.trans('Registros históricos no independientes'),'Registros históricos no independientes');
 assert.equal(context.trans('3 pendientes'),'3 remaining');
});

test('test scale is 0 to −100 dBFS but never starts at digital full scale',()=>{
 assert.match(source,/DIGITAL_REFERENCE_DBFS=0, TEST_START_DB=-36, TEST_END_DB=-100, MAX_SAFE_DB=-24/);
 const head=source.indexOf('const getStart='),tail=source.indexOf('const INDEPENDENT_PASS_METHOD=',head);
 const c={clamp,Math,Number};
 vm.runInNewContext(source.slice(head,tail).replace('function legacyQuickBands','function legacyQuickBands'),{
  ...c,QUICK_LIMIT:6,TEST_START_DB:-36,TEST_END_DB:-100,MAX_SAFE_DB:-24
 });
 assert.match(html,/Rango disponible|Escala digital de referencia/);
 assert.doesNotMatch(html,/const TEST_START_DB=0/);
});
test('quick mode groups adjacent frequency bands; historical schedules stay stable',()=>{
 const begin=source.indexOf('function legacyQuickBands(');
 const end=source.indexOf('const INDEPENDENT_PASS_METHOD=',begin);
 const c={QUICK_LIMIT:6,Math,Number};
 vm.runInNewContext(source.slice(begin,end),c);
 const car={bands:[64,160,400,1000,2500,6250,15625],testMode:'quick'};
 const selected=Array.from(c.testBands(car));
 assert.deepEqual(selected,[64,160,400,1000,2500,6250]);
 const headphone={bands:[30,60,120,250,500,1000,2000,4000,8000,16000],testMode:'quick'};
 const h=Array.from(c.testBands(headphone));
 assert.ok(h.slice(1,-1).every((f,i)=>f/h[i]<=3.5&&h[i+2]/f<=3.5));
 const legacy=Array.from(c.legacyQuickBands(car.bands));
 assert.deepEqual(Array.from(c.testBands({...car,testBandPlan:legacy})),legacy);
 const fifteen={bands:[25,40,63,100,160,250,400,630,1000,1600,2500,4000,6300,10000,16000],testMode:'quick'};
 assert.equal(c.quickAutoFeasibility(fifteen).coverage,false);
 const five={bands:[60,250,1000,4000,16000],testMode:'complete'};
 assert.equal(c.quickAutoFeasibility(five).structural,0);
});
test('channel answers are blocked before full tone playback',()=>{
 const code=fs.readFileSync('src/js/03-hearing-test.js','utf8');
 assert.match(code,/!trial\.awaiting\|\|tone\?\.mode==='test'/);
 assert.match(code,/if\(side!=='both'&&!ctx\.createStereoPanner\)/);
 assert.match(code,/!channelsReady\(current\)/);
});

test('device-aware digital ceilings and staged preview never start at 0 by default',()=>{
 const begin=source.indexOf('function maxTestStart('),end=source.indexOf('function legacyQuickBands(',begin);
 assert.ok(begin>=0&&end>begin);
 const ctx={Math,Number,clamp,DIGITAL_REFERENCE_DBFS:0,MAX_SAFE_DB:-24,TEST_START_DB:-36,TEST_END_DB:-100};
 vm.runInNewContext(source.slice(begin,end),ctx);
 for(const type of ['car','speaker']){
  assert.equal(ctx.maxTestStart({type}),0);
  assert.equal(ctx.getStart({type}),-36);
  const advanced={type,testStart:0,testFloor:-100};
  assert.equal(ctx.getStart(advanced),0);
  assert.equal(ctx.getFloor(advanced),-100);
  assert.equal(ctx.needsVolumePreview(advanced),true);
  assert.deepEqual(Array.from(ctx.volumePreviewSteps(advanced)),[-36,-24,-12,-6,0]);
  assert.deepEqual(Array.from(ctx.volumePreviewSteps({type,testStart:-18})),[-36,-24,-18]);
 }
 const phones={type:'headphones',testStart:0,testFloor:-100};
 assert.equal(ctx.maxTestStart(phones),-24);
 assert.equal(ctx.getStart(phones),-24);
 assert.equal(ctx.needsVolumePreview(phones),false);
 assert.deepEqual(Array.from(ctx.volumePreviewSteps(phones)),[]);
 assert.match(source,/volumePreviewPlayed=false,volumeReady=false/);
});
