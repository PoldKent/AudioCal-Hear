import test from 'node:test';
import assert from 'node:assert/strict';
import {
 proposeHear3PhotoBandFrequencies,recommendedHear3DeviceLayout,
 HEAR3_PHOTO_MAX_BYTES,
} from '../src/hear3/photo-band-assistant.mjs';

test('D-044: optical candidates preserve real car EQ bands, never infer other frequencies',()=>{
 const result=proposeHear3PhotoBandFrequencies(
  'EQ gráfico: 64 Hz · 160 Hz · 400 Hz · 1 kHz · 2.5 kHz · 6.25k · 15.625 kHz');
 assert.deepEqual(result.frequencies,[64,160,400,1000,2500,6250,15625]);
 assert.equal(result.requiresUserConfirmation,true);
 assert.equal(result.hardwareVerified,false);
 assert.match(result.warning,/no es identificación/i);
});
test('D-044: headphone labels accept Hz and kHz without confusing label strings',()=>{
 const result=proposeHear3PhotoBandFrequencies(
  '30Hz 60Hz 120Hz 250Hz 500Hz 1k 2k 4k 8k 16k');
 assert.deepEqual(result.frequencies,[30,60,120,250,500,1000,2000,4000,8000,16000]);
});
test('D-044: invalid or ambiguous photo candidates require manual verification',()=>{
 const invalid=[
  '', '55, 100, 200', '80Hz', '1000Hz 500Hz',
  '100Hz 100Hz', '100Hz 100000Hz', '0Hz 200Hz',
  '+4 dB -3 dB 2 dB', '20Hz 21Hz 100dB',
  'x'.repeat(12001),
 ];
 for(const text of invalid)assert.throws(()=>proposeHear3PhotoBandFrequencies(text),undefined,text.slice(0,60));
});
test('device recommendation is explicit choice rather than fake hardware detection',()=>{
 assert.deepEqual(recommendedHear3DeviceLayout('car'),{
  preset:'car-reference-7',label:'Usar referencia de automóvil (7 bandas)'});
 assert.deepEqual(recommendedHear3DeviceLayout('headphones'),{
  preset:'headphones-reference-10',label:'Usar referencia de auriculares (10 bandas)'});
 assert.equal(recommendedHear3DeviceLayout('speaker').preset,null);
 assert.equal(HEAR3_PHOTO_MAX_BYTES,8*1024*1024);
});
test('D-044: full previously declared EQ layouts may be recognized without unit labels',()=>{
 const car=proposeHear3PhotoBandFrequencies('64 160 400 1000 2500 6250 15625');
 const headphones=proposeHear3PhotoBandFrequencies(
  '30 60 120 250 500 1000 2000 4000 8000 16000');
 assert.deepEqual(car.frequencies,[64,160,400,1000,2500,6250,15625]);
 assert.equal(car.hardwareVerified,false);
 assert.equal(car.requiresUserConfirmation,true);
 assert.equal(headphones.frequencies.length,10);
});
