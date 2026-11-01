import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(p,'utf8');
const core=read('src/js/01-core.js'),setup=read('src/js/02-setup.js');
const hearing=read('src/js/03-hearing-test.js'),eq=read('src/js/04-equalization.js');
const transfer=read('src/js/05b-eq-transfer.js');
test('Hear V2 begins with a minimal setup and an obligatory full-band hearing test',()=>{
 assert.match(setup,/id="simpleSetup"/);
 assert.match(setup,/¿Qué ecualizador tiene\?/);
 assert.match(setup,/data-act="create"|Comenzar mi test de frecuencias/);
 assert.match(core,/testMode:'complete',testStart:TEST_START_DB/);
 assert.match(hearing,/function renderTest\(/);
 assert.match(hearing,/answerYes/);
 assert.match(hearing,/answerNo/);
});
test('catalogue retains photographed equipment and adds common graphic EQ counts',()=>{
 const required=['two','three','four','five','six','car7','eight','nine','photo10','iso15','iso31','custom'];
 for(const id of required)assert.match(core,new RegExp('\\b'+id+':\\{name:'));
 assert.match(setup,/2–31 bandas/);
 assert.match(setup,/frecuencias propias/);
});
test('up to 4 dB per verified physical EQ step is supported throughout',()=>{
 assert.match(core,/eqStepDb:\['unknown','1','2','3','4'\]/);
 assert.match(eq,/\['1','2','3','4'\]\.includes\(context\.eqStepDb\)/);
 assert.match(transfer,/\['1','2','3','4'\]\.includes\(context\.eqStepDb\)/);
 const begin=eq.indexOf('function physicalEqControl('),end=eq.indexOf('function eqResultModel(',begin);
 const sandbox={Math,Number,clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),normalizeCalibrationContext:c=>c};
 vm.runInNewContext(eq.slice(begin,end),sandbox);
 const p={min:-12,max:12,controlMin:-6,controlMax:6,context:{eqScale:'steps',eqStepDb:'4'}};
 assert.equal(sandbox.physicalEqControl(8,p).position,2);
 assert.equal(sandbox.physicalEqControl(-4,p).position,-1);
 assert.equal(sandbox.physicalEqControl(8,{...p,context:{eqScale:'steps',eqStepDb:'unknown'}}).position,null);
});
test('microphone remains optional, keeps tone-presence separate from auditory thresholds and EQ',()=>{
 assert.match(hearing,/data-act="mic-assist"|mic-assist/);
 assert.match(hearing,/navigator\.mediaDevices\?\.getUserMedia/);
 assert.match(hearing,/mic-spectral-presence-unvalidated/);
 assert.match(hearing,/Never connect the microphone back to audio output/);
 assert.doesNotMatch(eq.slice(eq.indexOf('function recommend('),eq.indexOf('function balanceMarkup(')),/acoustic/);
 assert.match(core,/acoustic:Object\.fromEntries/);
});
test('result directly lists each hearing band and actionable or unverified EQ positions',()=>{
 assert.match(eq,/function renderFrequencySummary\(/);
 assert.match(eq,/Tu percepción por frecuencia y cómo ajustar el EQ/);
 assert.match(eq,/Sin conversión fiable/);
 assert.match(eq,/r\.db===null\?'No confirmado'/);
});

test('integrated relative loudness is part of each frequency trial, not a duplicate results form',()=>{
 assert.match(core,/function inlineLoudnessPending\(/);
 assert.match(core,/integratedLoudness:p\.integratedLoudness===true/);
 assert.match(hearing,/function playInlineMatch\(/);
 assert.match(hearing,/function answerInlineMatch\(/);
 assert.match(hearing,/function inlineRecord\(/);
 assert.match(hearing,/integratedLoudness:true,inlineLoudness:\{\}/);
 assert.match(eq,/parecida con/);
 assert.match(eq,/Sonoridad: /);
 assert.doesNotMatch(eq, /id="loudnessPanel"/);
});
test('one-pass loudness observations are bounded, preserve exact source and remain independent of EQ',()=>{
 const begin=core.indexOf('function normalizeInlineLoudness('),end=core.indexOf('const QUICK_LIMIT=',begin);
 const context={Object,Number,Math,Array,Date,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
 vm.runInNewContext(core.slice(begin,end),context);
 const raw={'160|both|0':{status:'matched',offsetDb:3,referenceDbfs:-42,trials:[{answer:'similar',offsetDb:3}],method:'arbitrary'},
  '160|wrong|0':{status:'matched',offsetDb:5},
  '400|both|0':{status:'matched',offsetDb:999},
  '2500|left|0':{status:'bounded',offsetDb:null,referenceDbfs:-48,trials:[{answer:'target',offsetDb:-3}]}};
 const normalized=context.normalizeInlineLoudness(raw,[160,400,2500]);
 assert.equal(normalized['160|both|0'].offsetDb,3);
 assert.equal(normalized['160|wrong|0'],undefined);
 assert.equal(normalized['400|both|0'],undefined);
 assert.equal(normalized['2500|left|0'].status,'bounded');
 assert.doesNotMatch(eq.slice(eq.indexOf('function recommend('),eq.indexOf('function balanceMarkup(')),/inlineLoudness/);
});

test('frequency matching has a bounded number of answers and keeps the separate result panel removed',()=>{
 assert.match(hearing,/state\.tries\.length>=3/);
 assert.match(hearing,/if\(state\.tries\.length>=3\)\{inlineRecord\('bounded'\)/);
 assert.match(hearing,/if\(answer==='similar'\)\{inlineRecord\('matched'\)/);
 assert.match(hearing,/if\(base===null\|\|base\+bounded>ceiling/);
 assert.match(hearing,/let inlineMatch=null;/);
 assert.match(eq,/const loudSides=p\.channels==='separate'/);
 assert.doesNotMatch(eq,/id="loudnessPanel"/);
});

test('real in-pass state machine records a match and advances without another sweep',()=>{
 const startCore=core.indexOf('function normalizeInlineLoudness('),endCore=core.indexOf('const QUICK_LIMIT=',startCore);
 const startHear=hearing.indexOf('let inlineMatch=null;'),endHear=hearing.indexOf('function renderTest(){',startHear);
 assert.ok(startCore>=0&&endCore>startCore&&startHear>=0&&endHear>startHear);
 const entries=[{f:160,side:'both',pass:0},{f:400,side:'both',pass:0}];
 const p={id:'integration-test',testStart:-36,integratedLoudness:true,entries,measures:{'160|both':[{kind:'heard',db:-55}]},inlineLoudness:{}};
 const source='let tone=null;\n'+core.slice(startCore,endCore)+hearing.slice(startHear,endHear)+`
  const e=inlineLoudnessPending(current);
  if(!e||e.f!==160)throw Error('Unexpected pending frequency');
  const html=renderInlineMatch(current,e,2);
  if(!html.includes('¿Cuál suena más fuerte?'))throw Error('Missing integrated stage');
  inlineMatch.listened=true;
  answerInlineMatch('reference');
  if(inlineMatch.offsetDb!==3||inlineMatch.tries.length!==1)throw Error('Not adaptively changing');
  inlineMatch.listened=true;
  answerInlineMatch('similar');
  if(current.inlineLoudness['160|both|0']?.offsetDb!==3)throw Error('Not persisted');
  if(inlineLoudnessPending(current)!==null)throw Error('Reprocessing old frequency');
  return current.inlineLoudness['160|both|0'];
 `;
 const f=new Function('current','page','clamp','plan','recorded','fmt','getStart','key','button','esc','stopTone','touch','render','doneCount',source);
 const result=f(p,'test',(v,a,b)=>Math.max(a,Math.min(b,v)),q=>q.entries,(q,e)=>Boolean(q.measures[e.f+'|'+e.side]?.[e.pass]),v=>v+' Hz',q=>q.testStart,
  (freq,side)=>freq+'|'+side,(txt,act)=>'<button data-act="'+act+'">'+txt+'</button>',x=>x,()=>{},()=>{},()=>{},()=>1);
 assert.equal(result.status,'matched');
 assert.equal(result.trials.length,2);
 assert.equal(p.measures['160|both'][0].db,-55);
});
