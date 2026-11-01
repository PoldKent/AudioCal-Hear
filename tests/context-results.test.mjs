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


test('local correction v2 does not invent EQ from isolated or unmeasured tones',()=>{
 const script=fs.readFileSync('src/js/04-equalization.js','utf8');
 const start=script.indexOf("const EQ_ALGORITHM_VERSION=");
 const end=script.indexOf('function balanceMarkup(){',start);
 assert.ok(start>=0&&end>start);
 const measured=[
  {f:64,db:-48,quality:'low'}, {f:160,db:-49,quality:'low'},
  {f:400,db:-28,quality:'low'}, {f:1000,db:-50,quality:'low'},
  {f:2500,db:-51,quality:'low'}, {f:6250,db:-52,quality:'low'},
  {f:15625,db:-53,quality:'low'}
 ];
 const ctx=vm.createContext({Math,Number,JSON,
  gather:()=>measured,roundTo:(x,s)=>Math.round(x/s)*s,
  clamp:(x,lo,hi)=>Math.max(lo,Math.min(x,hi)),
  normalizeCalibrationContext:()=>({windows:'closed',engine:'off',subtype:'overear',seal:'unknown'}),
  cleanTaste:()=>({}),tasteGain:()=>0,balanceGain:()=>0
 });
 vm.runInContext(script.slice(start,end),ctx);
 const p={bands:measured.map(x=>x.f),min:-6,max:6,step:1,type:'car'};
 const result=ctx.recommend(p);
 assert.equal(result.length,7);
 assert.equal(result[0].base,0,'extreme band cannot be extrapolated');
 assert.equal(result.at(-1).base,0,'high extreme cannot be extrapolated');
 assert.equal(result[2].base,1,'single-pass car gain capped at +1 dB');
 assert.equal(result[2].algorithmVersion,'local-contrast-v2-experimental');
 const gaps=measured.map(x=>({...x}));
 gaps[2]={f:400,db:null,quality:'unmeasurable'};
 const without=ctx.estimateThresholdContrast(p,gaps);
 assert.equal(without[2].base,0);
 const mixed=measured.map(x=>({...x}));
 mixed[2]={f:400,db:-28,quality:'mixed'};
 assert.equal(ctx.estimateThresholdContrast(p,mixed)[2].base,0);
 const linear=measured.map(x=>({...x,db:-48}));
 assert.ok(ctx.estimateThresholdContrast(p,linear).every(x=>x.base===0),'flat series cannot create corrections');
 const noisy={...p,context:{windows:'open',engine:'on'}};
 ctx.normalizeCalibrationContext=()=>({windows:'open',engine:'on'});
 assert.ok(ctx.estimateThresholdContrast(noisy,measured).every(x=>x.base===0),'noisy car context blocks unsupported automatic compensation');
});
test('original response table, automatic explanation, and 7/10-band formats remain',()=>{
 const script=fs.readFileSync('src/js/04-equalization.js','utf8');
 const html=fs.readFileSync('index.html','utf8');
 for(const token of ['function renderCalibrationTrace(', 'Medición original sin modificar',
  'desviación local; compensación limitada y experimental', 'const EQ_ALGORITHM_VERSION='])assert.ok(html.includes(token),token);
 assert.match(script,/autoReason/);
 assert.match(html,/id="tracePanel"/);
});
