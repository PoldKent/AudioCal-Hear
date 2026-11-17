import test from 'node:test';
import assert from 'node:assert/strict';
import {
 HEAR3_BAND_PRESET_SIZES,resolveHear3GraphicBandLayout,
 parseHear3CustomBandFrequencies,
} from '../src/hear3/eq-band-layouts.mjs';

test('D-043 nominal graphic layouts contain 4/5/7/10/15/31 unique sorted bands',()=>{
 assert.deepEqual(HEAR3_BAND_PRESET_SIZES,[4,5,7,10,15,31]);
 for(const count of HEAR3_BAND_PRESET_SIZES){
  const bands=resolveHear3GraphicBandLayout({preset:String(count)});
  assert.equal(bands.length,count);
  assert.ok(bands.every((x,i)=>x.frequencyHz>=20&&x.frequencyHz<=20000&&
   (i===0||x.frequencyHz>bands[i-1].frequencyHz)));
  assert.equal(new Set(bands.map(x=>x.id)).size,count);
  assert.ok(Object.isFrozen(bands));
 }
});
test('user entered 2–31 frequencies are preserved literally, never inferred from equipment',()=>{
 assert.deepEqual(parseHear3CustomBandFrequencies('31.5, 125, 1000, 8000'),[31.5,125,1000,8000]);
 assert.deepEqual(resolveHear3GraphicBandLayout({preset:'custom',customFrequencies:'100; 350; 2000'})
  .map(x=>x.frequencyHz),[100,350,2000]);
});
test('invalid layouts fail closed instead of sorting, clipping, deduplicating or guessing',()=>{
 for(const bad of ['','100','100, 100','500, 100','0, 100','20, 20001',
  '20, NaN','20, 1e3','20, 100foobar','20, -100','1, 10','31,5, 125',
  [...Array(32)].map((_,i)=>i*60+20).join(',')]){
  assert.throws(()=>resolveHear3GraphicBandLayout({
   preset:'custom',customFrequencies:bad,
  }));
 }
 assert.throws(()=>resolveHear3GraphicBandLayout({preset:'unknown'}));
 assert.deepEqual(resolveHear3GraphicBandLayout({preset:'5'}).map(x=>x.frequencyHz),
  [125,250,500,1000,2000]);
});

test('documented car and headphone references preserve the actual photographed EQ frequencies',()=>{
 const car=resolveHear3GraphicBandLayout({preset:'car-reference-7'}).map(r=>r.frequencyHz);
 const headphones=resolveHear3GraphicBandLayout({preset:'headphones-reference-10'})
  .map(r=>r.frequencyHz);
 assert.deepEqual(car,[64,160,400,1000,2500,6250,15625]);
 assert.deepEqual(headphones,[30,60,120,250,500,1000,2000,4000,8000,16000]);
 assert.deepEqual(HEAR3_BAND_PRESET_SIZES,[4,5,7,10,15,31]);
});
