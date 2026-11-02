import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const core=fs.readFileSync('src/js/01-core.js','utf8');
const hearing=fs.readFileSync('src/js/03-hearing-test.js','utf8');
const eq=fs.readFileSync('src/js/04-equalization.js','utf8');
const interaction=fs.readFileSync('src/js/06-interactions.js','utf8');

const adaptive=core.slice(core.indexOf('function nextTrialLevel('),core.indexOf("\nlet page='setup'"));
const context={
 Math,Number,Object,Array,Date,
 MAX_STEPS:20,
 getFloor:p=>p.testFloor,
 getStart:p=>p.testStart,
};
vm.createContext(context);
vm.runInContext(adaptive,context);

test('the initial no at 16 kHz increases digital level by 3 dBFS, not a guessed threshold',()=>{
 const p={type:'headphones',testStart:-36,testFloor:-100};
 const t={level:-36,phase:'coarse',heard:null,missed:null,done:1};
 assert.equal(context.nextTrialLevel(t,false,p),'next');
 assert.equal(t.level,-33);
 assert.equal(t.initialBoosts,1);
 assert.equal(t.missed,-36);
 assert.equal(context.nextTrialLevel(t,false,p),'next');
 assert.equal(t.level,-30);
 assert.equal(context.nextTrialLevel(t,false,p),'next');
 assert.equal(t.level,-27);
 assert.equal(context.nextTrialLevel(t,false,p),'next');
 assert.equal(t.level,-24);
 assert.equal(context.nextTrialLevel(t,false,p),'unheard');
 assert.equal(t.level,-24);
 assert.equal(t.heard,null);
});
test('first audible response after increased level brackets threshold instead of pretending certainty',()=>{
 const p={type:'headphones',testStart:-36,testFloor:-100};
 const t={level:-36,phase:'coarse',heard:null,missed:null,done:1};
 assert.equal(context.nextTrialLevel(t,false,p),'next');
 assert.equal(context.nextTrialLevel(t,true,p),'next');
 assert.equal(t.heard,-33);
 assert.equal(t.level,-45);
 assert.equal(context.nextTrialLevel(t,false,p),'next');
 assert.equal(t.phase,'refine');
 assert.equal(t.level,-39);
});
test('higher output after first miss stays capped at configured safe presentation limit',()=>{
 const p={type:'speaker',testStart:-12,testFloor:-100};
 const t={level:-12,phase:'coarse',heard:null,missed:null,done:1};
 assert.equal(context.nextTrialLevel(t,false,p),'unheard');
 assert.equal(t.level,-12);
});
test('EQ recommendation remains independent from upload and A/B music',()=>{
 assert.match(eq,/function starterEqProposal\(p\)/);
 assert.match(eq,/\$\{starterEqMarkup\(p,r\)\}/);
 assert.match(eq,/id="musicComparison"/);
 assert.match(eq,/Opcional después del EQ/);
 assert.doesNotMatch(eq,/personalSoundFinishMarkup\(p,r\)/);
 assert.doesNotMatch(interaction,/case 'finish-sound'/);
 assert.match(interaction,/case 'previous-frequency':rewindPreviousFrequency\(\)/);
});
test('the preceding frequency can be repeated without resetting other bands',()=>{
 const start=hearing.indexOf('function previousFrequencyEntries(');
 const end=hearing.indexOf('function renderTest(){',start);
 assert.ok(start>=0&&end>start);
 const local={
  plan:()=>[{f:1000,side:'left',pass:0},{f:1000,side:'right',pass:0},
    {f:2000,side:'left',pass:0},{f:2000,side:'right',pass:0},
    {f:4000,side:'left',pass:0},{f:4000,side:'right',pass:0}],
  firstMissing:p=>local.plan().findIndex(e=>!Object.hasOwn(p.measures[e.f+'|'+e.side]||{},e.pass)),
  key:(f,side)=>f+'|'+side,
  recorded:(p,e)=>Object.hasOwn(p.measures[e.f+'|'+e.side]||{},e.pass),
  fmt:f=>f+' Hz',uiConfirm:()=>true,stopTone:()=>{},playerAudio:null,nav:()=>{},touch:()=>{},
  current:{
   measures:{
    '1000|left':[{db:-50}],'1000|right':[{db:-51}],
    '2000|left':[{db:-52}],'2000|right':[{db:-53}],
    '4000|left':[{db:-54}]
   }
  },
  trial:null,awaitNext:false,floorReached:false,sampleNote:'',lastResultKind:null,lastRecordedEntry:null,introStep:3
 };
 vm.createContext(local);
 vm.runInContext(hearing.slice(start,end),local);
 assert.equal(local.hasPreviousFrequency(local.current),true);
 assert.equal(local.rewindPreviousFrequency(),true);
 assert.equal(local.current.measures['2000|left'],undefined);
 assert.equal(local.current.measures['2000|right'],undefined);
 assert.ok(local.current.measures['1000|left']);
 assert.ok(local.current.measures['4000|left']);
});
