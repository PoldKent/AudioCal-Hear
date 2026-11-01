import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('src/js/01-core.js','utf8');
const start=source.indexOf('function defaultCalibrationContext(');
const end=source.indexOf('\nfunction normalizedProfile(',start);
assert.ok(start>=0&&end>start,'Context model should be standalone and before profile normalization');
const ctx={Object,Number};
vm.runInNewContext(source.slice(start,end),ctx);

test('legacy profile context stays explicitly unknown without inventing conditions',()=>{
 const p=ctx.normalizeCalibrationContext(undefined,'car');
 assert.equal(p.provenance,'legacy');
 assert.match(ctx.calibrationContextLabel({type:'car'}),/antiguo/);
 assert.match(ctx.calibrationContextCaution({type:'car'}),/históricas/);
});
test('car, headset and room context survive normalization',()=>{
 const samples=[
  {type:'car',context:{seat:'passenger',windows:'open',engine:'on',eqScale:'steps'}},
  {type:'headphones',context:{subtype:'inear',seal:'poor',anc:'on',eqScale:'db'}},
  {type:'speaker',context:{room:'desk',position:'near',placement:'nearwall'}}
 ];
 for(const p of samples){
  const norm=ctx.normalizeCalibrationContext(p.context,p.type);
  assert.equal(norm.provenance,'captured');
  assert.ok(ctx.calibrationContextLabel({...p,context:norm}).length>20);
 }
 assert.match(ctx.calibrationContextCaution(samples[1]),/sellado/);
});
test('invalid imported values are rejected and gain-unit mapping is never inferred',()=>{
 const norm=ctx.normalizeCalibrationContext({seat:'<script>',eqScale:'bogus',dbPerStep:100},'car');
 assert.equal(norm.seat,'driver');
 assert.equal(norm.eqScale,'unknown');
 assert.equal(Object.hasOwn(norm,'dbPerStep'),false);
});
test('generated app includes contextual setup and retains existing audio logic',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const str of ['data-context=','context:normalizeCalibrationContext(temp.context,temp.type)','function nextTrialLevel(','function transferMapping('])
  assert.ok(html.includes(str),str);
});

test('transparent result distinguishes raw measurements from calculated EQ',()=>{
 const script=fs.readFileSync('src/js/04-equalization.js','utf8');
 assert.match(script,/function rawFrequencyThreshold\(/);
 assert.match(script,/x\.kind==='heard'/);
 assert.match(script,/function renderCalibrationTrace\(/);
 assert.match(script,/Corrección automática frente al ajuste final/);
 assert.match(script,/NO se ha verificado la conversión dB\/paso/);
});
