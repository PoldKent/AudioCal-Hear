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
