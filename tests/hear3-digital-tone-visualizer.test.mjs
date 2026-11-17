import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHear3DigitalToneWavePath} from '../src/hear3/digital-tone-visualizer.mjs';
test('D-021 visual frequency responds to low and high programmed digital tones',()=>{
 const low=buildHear3DigitalToneWavePath(80);
 const high=buildHear3DigitalToneWavePath(8000);
 assert.ok(low.startsWith('M0.00 '));
 assert.ok(high.startsWith('M0.00 '));
 assert.notEqual(low,high);
 assert.equal(low.split(' L').length,193);
 assert.equal(high.split(' L').length,193);
});
test('D-021 does not invent a waveform for missing or invalid frequency',()=>{
 for(const v of [null,NaN,0,15,24000,'not a frequency',Infinity,-1]){
  assert.equal(buildHear3DigitalToneWavePath(v),'');
 }
 assert.throws(()=>buildHear3DigitalToneWavePath(1000,{width:-1}));
 assert.throws(()=>buildHear3DigitalToneWavePath(1000,{height:Infinity}));
});
