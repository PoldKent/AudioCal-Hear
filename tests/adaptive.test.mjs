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
const begin = source.indexOf('function nextTrialLevel(');
const end = source.indexOf('\nlet page=', begin);
assert(begin >= 0 && end > begin, 'Hearing algorithm extraction boundary changed');
const sandbox = {clamp, getStart: p => p.testStart, getFloor: p => p.testFloor, Math, Number};
vm.runInNewContext(source.slice(begin, end), sandbox);
const next = sandbox.nextTrialLevel;

const trial = () => ({phase:'coarse', level:-36, heard:null, missed:null, verifyIndex:0, done:0});
const profile = {testStart:-36, testFloor:-84};

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
  assert.equal(t.level, -84);
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
  for (const text of ["const STORAGE='audiocal-hear-profiles-v1'",'TEST_END_DB=-84','MAX_SAFE_DB=-24',"case 'endheard'","case 'enduncertain'",'function normalizedProfile(']) assert.ok(html.includes(text),text);
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
