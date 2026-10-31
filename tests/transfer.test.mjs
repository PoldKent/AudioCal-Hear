import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync('src/js/05b-eq-transfer.js', 'utf8');
const boundary = script.indexOf('function transferMarkup()');
assert.ok(boundary > 1000, 'Expected pure transfer functions before the UI renderer');
const profile = {name:'QA EQ',type:'headphones',min:-20,max:20,bands:[100,400,1000,10000]};
const suggestions = [
 {f:100,gain:-4},{f:400,gain:0},{f:1000,gain:4},{f:10000,gain:12}
];
const presets = {car7:{bands:[64,160,400,1000,2500,6250,15625]},photo10:{bands:[30,60,120,250,500,1000,2000,4000,8000,16000]}};
const context = vm.createContext({
 Math,Number,presets,recommend:()=>suggestions,
 clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),
 parseBands:text=>{
   const arr=text.split(/[,;\s]+/).filter(Boolean).map(Number);
   return arr.length>=2&&arr.length<=31&&arr.every((f,i)=>Number.isFinite(f)&&f>=20&&f<=20000&&(!i||f>arr[i-1]))?arr:null;
 },
 fmt:f=>f+' Hz'
});
vm.runInContext(script.slice(0,boundary),context);

test('same physical equalizer preserves exact user gains',()=>{
 const rows=context.transferMapping(profile);
 assert.equal(rows.length,4);
 assert.deepEqual(rows.map(x=>x.gain),[-4,0,4,12]);
 assert.ok(rows.every(x=>x.kind==='exact'));
});

test('different band layout uses logarithmic interpolation and flags estimates',()=>{
 vm.runInContext('transferPreset="custom";transferCustom="100, 200, 400, 1000, 10000"',context);
 const rows=context.transferMapping(profile);
 assert.equal(rows.length,5);
 assert.equal(rows[1].kind,'estimated');
 assert.equal(rows[1].gain,-2);
 assert.equal(rows[4].kind,'exact');
});

test('out-of-range or widely separated bands are never extrapolated',()=>{
 vm.runInContext('transferPreset="custom";transferCustom="30, 100, 250, 400, 1000, 5000, 10000, 16000"',context);
 const rows=context.transferMapping(profile);
 assert.deepEqual(rows.map(x=>x.kind),['unavailable','exact','estimated','exact','exact','unavailable','exact','unavailable']);
 assert.equal(rows[0].gain,null);
 assert.equal(rows[7].gain,null);
});

test('target gain limit clamps large boosts and flags that it was limited',()=>{
 vm.runInContext('transferPreset="profile";transferRange="six"',context);
 const rows=context.transferMapping(profile);
 assert.equal(rows[3].gain,6);
 assert.equal(rows[3].limited,true);
 assert.equal(rows[0].limited,false);
});

test('invalid custom frequencies do not invent a guide',()=>{
 vm.runInContext('transferPreset="custom";transferCustom="1000, 200, 300"',context);
 assert.equal(context.transferMapping(profile),null);
});

test('Spotify paths and YouTube Music fallback do not promise automatic audio changes',()=>{
 vm.runInContext('transferTarget="spotify";transferOS="android"',context);
 assert.match(context.transferPath(profile).join(' '),/Spotify/);
 assert.match(context.transferNotice(profile),/Spotify Connect/);
 vm.runInContext('transferTarget="youtube";transferOS="ios"',context);
 assert.match(context.transferPath(profile).join(' '),/no ofrece un ecualizador manual universal/);
});
