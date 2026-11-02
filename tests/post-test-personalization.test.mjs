import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const eqSource=fs.readFileSync('src/js/04-equalization.js','utf8');
const personalSound=fs.readFileSync('src/js/03c-personal-sound.js','utf8');
const stubProfile={id:'tested-headphones',bands:[125,250,500,1000,2000,4000,8000],
 measures:{'4000|left':[{kind:'heard',db:-56,confidence:'low',contradictions:1}],
 '4000|right':[{kind:'heard',db:-24,confidence:'low',contradictions:1}]},
 balanceProof:{},balance:{},manual:{},taste:{}};
const sandbox={
 Date,Math,Number,Object,Array,Set,
 current:stubProfile,
 page:'results',
 doneCount:()=>14,plan:p=>p.bands.flatMap(f=>['left','right'].map(side=>({f,side}))),
 suggestedBalanceBands:p=>[p.bands[1],p.bands[3],p.bands[5]],
 recommend:p=>p.bands.map(f=>({f,gain:Number(p.balance[f]||0)})),
 button:(title,action)=>'<button data-act="'+action+'">'+title+'</button>',
 playerAudio:{paused:false},playerUrl:'blob:example',
 balanceFreq:250,balanceRound:0,balanceListened:new Set(),balancePreview:null
};
vm.createContext(sandbox);
vm.runInContext(personalSound,sandbox);
const from=eqSource.indexOf('const BALANCE_MIN_LISTEN_MS=1800;');
const to=eqSource.indexOf('function balanceMarkup(){',from);
assert.ok(from>0&&to>from,'Timed A/B evidence functions must exist');
vm.runInContext(eqSource.slice(from,to),sandbox);

test('completed contradictory exam displays a useful next step instead of inventing EQ gains',()=>{
 const original=JSON.stringify(stubProfile.measures);
 const markup=vm.runInContext('personalSoundFinishMarkup(current)',sandbox);
 assert.match(markup,/Tu test está completo; falta personalizar el sonido/);
 assert.match(markup,/Terminar mi ecualizador con música/);
 assert.match(markup,/0\/3 bandas comparadas/);
 assert.match(markup,/no debe inventar ganancias/);
 assert.equal(JSON.stringify(stubProfile.measures),original);
});
test('after listening the panel reports saved reviewed bands without changing the raw exam',()=>{
 stubProfile.balance[250]=2;
 stubProfile.balanceProof[250]=[{method:'music-ab-two-rounds',choices:[1,1],change:2}];
 const markup=vm.runInContext('personalSoundFinishMarkup(current)',sandbox);
 assert.match(markup,/1\/3 bandas comparadas/);
 assert.match(markup,/1 banda\(s\) con ajustes/);
 assert.match(markup,/Termina de comprobar tu ecualizador/);
});
test('band A/B cannot be completed with quick taps instead of actual listening',()=>{
 const state=()=>vm.runInContext('balanceListened.size',sandbox);
 assert.equal(vm.runInContext("balanceStartListening('A',1000)",sandbox),true);
 assert.equal(vm.runInContext("balanceStartListening('B',1100)",sandbox),true);
 assert.equal(state(),0);
 assert.equal(vm.runInContext("balanceStartListening('A',3100)",sandbox),true);
 assert.equal(state(),1);
 assert.equal(vm.runInContext("balanceStartListening('B',5100)",sandbox),true);
 assert.equal(state(),2);
});
test('paused music cannot start a comparison and fast pause does not count',()=>{
 sandbox.balanceListened=new Set();
 sandbox.playerAudio.paused=true;
 assert.equal(vm.runInContext("balanceStartListening('A',10000)",sandbox),false);
 sandbox.playerAudio.paused=false;
 assert.equal(vm.runInContext("balanceStartListening('A',12000)",sandbox),true);
 vm.runInContext('balanceEndListening(12100)',sandbox);
 assert.equal(vm.runInContext('balanceListened.size',sandbox),0);
});
test('entry point is on the main results card and points to the existing A/B engine',()=>{
 const src=fs.readFileSync('src/js/06-interactions.js','utf8');
 assert.match(eqSource,/personalSoundFinishMarkup\(p,r\)/);
 assert.match(src,/case 'finish-sound':/);
 assert.match(src,/balanceStartListening\(btn.dataset.balancePreview\)/);
 assert.doesNotMatch(personalSound.slice(personalSound.indexOf('function personalSoundFinishMarkup('),personalSound.indexOf('function personalSoundPreviewMark(')),/measures\s*=/);
});
