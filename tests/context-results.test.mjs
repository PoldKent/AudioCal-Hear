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
 assert.match(script,/La equivalencia dB\/paso fue declarada/);
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
  contextAutoBlockReason:(p,f,c)=>p.type==='car'&&(c.windows==='open'||c.engine==='on')?'ruido variable del vehículo; no corregir automáticamente':null,
  cleanTaste:()=>({}),tasteGain:()=>0,balanceGain:()=>0,
  autoCoverageMinimum:p=>Math.max(4,Math.ceil(p.bands.length*.55))
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


test('EQ PNG positioning is only exact for verified control units',()=>{
 const source=fs.readFileSync('src/js/04-equalization.js','utf8');
 const start=source.indexOf('function physicalEqControl('),end=source.indexOf('function eqResultMarkup(',start);
 assert.ok(start>=0&&end>start);
 const context={normalizeCalibrationContext:(c)=>c,
  firstMissing:()=>-1,calibrationContextLabel:()=> 'Auto · conductor',
  recommend:()=>[{f:64,gain:4,db:-50,quality:'good',base:1},{f:160,gain:-2,db:-48,quality:'low',base:0}],
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),Number,Math};
 vm.runInNewContext(source.slice(start,end),context);
 const p={name:'Mi auto',type:'car',bands:[64,160],min:-6,max:6,context:{eqScale:'unknown',eqStepDb:'unknown'}};
 let m=context.eqResultModel(p);
 assert.equal(m.verified,false);assert.equal(m.rows[0].position,null);
 p.context={eqScale:'steps',eqStepDb:'unknown'};m=context.eqResultModel(p);
 assert.equal(m.verified,false);assert.equal(m.rows[1].position,null);
 p.context={eqScale:'steps',eqStepDb:'2'};m=context.eqResultModel(p);
 assert.equal(m.verified,true);assert.equal(m.rows[0].position,2);assert.equal(m.rows[1].position,-1);
 p.context={eqScale:'db',eqStepDb:'unknown'};m=context.eqResultModel(p);
 assert.equal(m.rows[0].position,4);assert.equal(m.rows[1].position,-2);
});
test('PNG export is integrated into source and monolithic app',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const word of ["function saveEqCardPng(","document.createElement('canvas')","case 'downloadpng'","eqStepDb:'unknown'"])assert.ok(html.includes(word),word);
 assert.doesNotMatch(html,/id="eqCardCanvas"/,'Only the live EQ may render; PNG is generated when requested');
 const src=fs.readFileSync('src/js/04-equalization.js','utf8');
 assert.match(src,/toDataURL\('image\/png'\)/);
 assert.match(src,/SIN CONVERSIÓN VALIDADA/);
});

test('suprathreshold records are sanitized, bounded, and independent of automatic EQ',()=>{
 const core=fs.readFileSync('src/js/01-core.js','utf8'),start=core.indexOf('const LOUDNESS_REFERENCE_DBFS='),end=core.indexOf('function normalizedProfile(',start);
 assert.ok(start>=0&&end>start);
 const ctx=vm.createContext({Number,Math,Object,Date,Array,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});
 vm.runInContext(core.slice(start,end),ctx);
 const valid={offsetDb:2,referenceDbfs:-48,method:'relative-tone-match-v1',at:100};
 const raw={160:[valid,{...valid,offsetDb:3}],400:[{...valid,offsetDb:200}],999:[valid]};
 const normalized=ctx.normalizeLoudness(raw,[160,400,1000]);
 assert.equal(normalized[160].length,2);
 assert.equal(normalized[400],undefined);
 assert.equal(normalized[999],undefined);
 assert.match(ctx.loudnessEvidenceStatus(normalized[160]),/Repetible/);
 assert.match(ctx.loudnessEvidenceStatus([{...valid,offsetDb:-6},{...valid,offsetDb:6}]),/Inconsistente/);
 assert.match(fs.readFileSync('src/js/05c-loudness.js','utf8'),/NO significa que el EQ deba aumentar/);
 const eq=fs.readFileSync('src/js/04-equalization.js','utf8');
 const recommend=eq.slice(eq.indexOf('function recommend(p)'),eq.indexOf('function balanceMarkup(){'));
 assert.doesNotMatch(recommend,/loudness/i,'Exploratory evidence must never modify EQ automatically');
});
test('loudness playback limits digital level and uses an explicit user interaction',()=>{
 const src=fs.readFileSync('src/js/05c-loudness.js','utf8');
 assert.match(src,/LOUDNESS_REFERENCE_DBFS\+LOUDNESS_OFFSET_LIMIT/);
 assert.match(src,/Math.pow\(10,db\/20\)/);
 assert.match(src,/if\(!loudnessListened.has\('reference'\)\|\|!loudnessListened.has\('target'\)\)/);
 const interaction=fs.readFileSync('src/js/06-interactions.js','utf8');
 assert.match(interaction,/if\(btn.dataset.loudness\)/);
});

test('cross-evidence marks truncated loudness as inconclusive and preserves data',()=>{
 const source=fs.readFileSync('src/js/05d-evidence.js','utf8'),start=source.indexOf('const EVIDENCE_AUDIT_VERSION='),end=source.indexOf('function evidenceAuditMarkup(',start);
 const c=vm.createContext({Math,Number,Object,Array,median:x=>x[0],key:(f,s)=>f+'|'+s,EQ_ALGORITHM_VERSION:'v2',calibrationContextLabel:()=> 'auto',
  loudnessEligibleBands:p=>p.bands.filter(x=>x>=100&&x<=10000&&x!==1000),
  independentThresholdPair:(p,f,s)=>p.measures[f+'|'+s]?.[1]?.method==='adaptive-v20-independent',
  recommend:p=>p.bands.map(f=>({f,base:f===400?1:0}))});
 vm.runInContext(source.slice(start,end),c);
 const p={name:'QA',bands:[64,160,400,1000,2500,6250,15625],channels:'both',passes:2,
  measures:Object.fromEntries([64,160,400,1000,2500,6250,15625].map(f=>[f+'|both',[{kind:'heard',db:-48},{kind:'heard',db:-47,method:'adaptive-v20-independent'}]])),
  loudness:{160:[{offsetDb:3},{offsetDb:4}],400:[{offsetDb:6},{offsetDb:6}],2500:[{offsetDb:-5},{offsetDb:4}]}};
 const before=JSON.stringify(p),a=c.evidenceReport(p);
 assert.equal(a.count.threshold,7);
 assert.equal(a.count.matching,1);
 assert.equal(a.count.matchingPairs,3);
 assert.equal(a.rows.find(x=>x.f===400).loudness.status,'Límite del test');
 assert.equal(JSON.stringify(p),before);
 p.passes=1;assert.equal(c.evidenceReport(p).count.thresholdPairs,0);
});
test('CSV export explicitly distinguishes dBFS from dB of EQ',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const s of ['evidenceAuditMarkup(p)','function evidenceCsv(', "case 'download-audit'",'Sonoridad comparación 1 dBFS relativo'])assert.ok(html.includes(s),s);
});

test('older confirmations do not count as independent evidence',()=>{
 const code=fs.readFileSync('src/js/05d-evidence.js','utf8'),a=code.indexOf('const EVIDENCE_AUDIT_VERSION='),b=code.indexOf('function evidenceAuditMarkup(',a);
 const c=vm.createContext({Math,Number,Object,Array,median:s=>s[0],key:(f,s)=>f+'|'+s,
  EQ_ALGORITHM_VERSION:'v2',calibrationContextLabel:()=> 'car',loudnessEligibleBands:p=>p.bands,
  recommend:p=>p.bands.map(f=>({f,base:0})),
  independentThresholdPair:(p,f,s)=>p.measures[f+'|'+s]?.[1]?.method==='adaptive-v20-independent'});
 vm.runInContext(code.slice(a,b),c);
 const p={name:'legacy',bands:[64,160],channels:'both',passes:2,loudness:{},
  measures:{'64|both':[{kind:'heard',db:-50,method:'adaptive-v18-explicit'},{kind:'heard',db:-50,method:'adaptive-v18-explicit'}],
    '160|both':[{kind:'heard',db:-54,method:'adaptive-v18-explicit'},{kind:'heard',db:-53,method:'adaptive-v20-independent'}]}};
 const audit=c.evidenceReport(p);
 assert.equal(audit.count.historical,1);
 assert.equal(audit.count.thresholdPairs,1);
 assert.equal(audit.count.threshold,1);
 assert.match(audit.rows[0].threshold.status,/histórica/);
 assert.match(audit.rows[0].auto.status,/histórica/);
});

test('incomplete L/R coverage cannot receive high confidence from a single ear',()=>{
 const js=fs.readFileSync('src/js/04-equalization.js','utf8');
 const end=js.indexOf('const EQ_ALGORITHM_VERSION=');
 const c=vm.createContext({Math,Number,Object,median:x=>x.slice().sort((a,b)=>a-b)[Math.floor((x.length-1)/2)],
  key:(f,s)=>f+'|'+s,independentThresholdPair:(p,f,s)=>p.measures[f+'|'+s]?.[1]?.method==='adaptive-v20-independent'});
 vm.runInContext(js.slice(0,end),c);
 const samples=[{kind:'heard',db:-49,method:'adaptive-v20-search'},{kind:'heard',db:-50,method:'adaptive-v20-independent'}];
 const p={bands:[400,1000],channels:'separate',testMode:'complete',measures:{'400|left':samples}};
 assert.equal(c.gather(p)[0].quality,'low','one ear cannot justify combined confidence');
 p.measures['400|right']=[{kind:'heard',db:-50,method:'adaptive-v20-search'},{kind:'heard',db:-51,method:'adaptive-v20-independent'}];
 assert.equal(c.gather(p)[0].quality,'good');
});

test('context conditions describe their real impact without inventing acoustic dB',()=>{
 const p={type:'speaker',bands:[64,160,400,1000],context:{room:'studio',position:'near',placement:'nearwall'}};
 assert.equal(ctx.contextAutoBlockReason(p,64),null);
 assert.match(ctx.calibrationContextEqExplanation(p),/No añaden ni restan dB/);
 const car={type:'car',bands:[64,160],context:{windows:'open',engine:'off'}};
 assert.match(ctx.contextAutoBlockReason(car,64),/ruido variable/);
 assert.match(ctx.calibrationContextEqExplanation(car),/bloquean/);
 const inear={type:'headphones',bands:[60,160,400],context:{subtype:'inear',seal:'poor'}};
 assert.match(ctx.contextAutoBlockReason(inear,60),/sellado/);
 assert.equal(ctx.contextAutoBlockReason(inear,400),null);
});
test('EQ positions preserve requested, actual and residual dB with conservative half-step rounding',()=>{
 const src=fs.readFileSync('src/js/04-equalization.js','utf8');
 const start=src.indexOf('function physicalEqControl('),end=src.indexOf('function eqResultModel(',start);
 const obj={Math,Number,clamp:(x,a,b)=>Math.max(a,Math.min(x,b)),normalizeCalibrationContext:c=>c};
 vm.runInNewContext(src.slice(start,end),obj);
 const p={min:-6,max:6,type:'car',context:{eqScale:'steps',eqStepDb:'2'}};
 assert.deepEqual([1,2,3,-1,-2,-3].map(g=>obj.physicalEqControl(g,p).position),[0,1,1,0,-1,-1]);
 assert.equal(obj.physicalEqControl(3,p).actualGain,2);
 assert.equal(obj.physicalEqControl(3,p).delta,-1);
 assert.equal(obj.physicalEqControl(-3,p).delta,1);
 assert.equal(obj.physicalEqControl(2,p).exact,true);
 assert.equal(obj.physicalEqControl(3,{...p,context:{eqScale:'steps',eqStepDb:'unknown'}}).position,null);
 assert.equal(obj.physicalEqControl(3,{...p,context:{eqScale:'db'}}).actualGain,3);
 const limited={...p,min:-1,max:1};
 assert.equal(obj.physicalEqControl(5,limited).position,1);
 assert.equal(obj.physicalEqControl(5,limited).delta,-3);
});

test('documented 3 dB steps persist and map gains to real positions',()=>{
 const normalized=ctx.normalizeCalibrationContext({eqScale:'steps',eqStepDb:'3'},'car');
 assert.equal(normalized.eqStepDb,'3');
 assert.equal(ctx.normalizeCalibrationContext({eqScale:'steps',eqStepDb:'4'},'car').eqStepDb,'unknown');
 const script=fs.readFileSync('src/js/04-equalization.js','utf8');
 const start=script.indexOf('function physicalEqControl('),end=script.indexOf('function eqResultModel(',start);
 const engine={Math,Number,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),normalizeCalibrationContext:c=>c};
 vm.runInNewContext(script.slice(start,end),engine);
 const p={min:-6,max:6,type:'car',context:normalized};
 const requested=[0,1,2,3,4,5,6,-1,-2,-3,-4,-5,-6];
 const positions=requested.map(g=>engine.physicalEqControl(g,p).position);
 assert.deepEqual(positions,[0,0,1,1,1,2,2,0,-1,-1,-1,-2,-2]);
 assert.equal(engine.physicalEqControl(4,p).actualGain,3);
 assert.equal(engine.physicalEqControl(4,p).delta,-1);
 assert.equal(engine.physicalEqControl(5,p).actualGain,6);
 assert.equal(engine.physicalEqControl(5,p).delta,1);
 assert.equal(engine.physicalEqControl(-3,p).exact,true);
 assert.equal(engine.physicalEqControl(3,{...p,context:{eqScale:'steps',eqStepDb:'unknown'}}).position,null);
});

test('AF-02 result refresh wires original trace, live EQ counts and export safety',()=>{
 const eq=fs.readFileSync('src/js/04-equalization.js','utf8');
 const start=eq.indexOf('function refreshResultsUI('),end=eq.indexOf('function eqMark(',start);
 const refresh=eq.slice(start,end);
 assert.match(eq,/data-trace-final="\$\{x.f\}"/);
 assert.match(eq,/id="eqChangeCount"/);
 assert.match(refresh,/traceFinal\.textContent=eqMark\(b\)\+' dB'/);
 assert.match(refresh,/headerCount\.textContent=count\+' cambios'/);
 assert.match(refresh,/transferCompleted\.clear\(\)/);
 assert.match(refresh,/refreshEqCard\(\)/);
 assert.doesNotMatch(refresh,/current\.measures\s*=/,'Refreshing EQ must never rewrite raw hearing measurements');
 assert.match(eq,/notice\.textContent=m\.warning/);
});

test('automatic EQ requires both ears for each contributing frequency',()=>{
 const script=fs.readFileSync('src/js/04-equalization.js','utf8');
 const begin=script.indexOf('function hasBothChannelThresholds('),end=script.indexOf('function recommend(',begin);
 assert.ok(begin>0&&end>begin);
 const frequencies=[64,160,400,1000,2500,6250,15625];
 const points=frequencies.map((f,i)=>({f,db:i===2?-30:-50,quality:'low'}));
 const profile={bands:frequencies,channels:'separate',type:'headphones',
  measures:Object.fromEntries(frequencies.flatMap(f=>{
   const pairs=[[f+'|left',[{kind:'heard',db:-50}]]];
   if(f!==400)pairs.push([f+'|right',[{kind:'heard',db:-50}]]);
   return pairs;
  }))};
 const model={Math,Number,roundTo:(v,n)=>Math.round(v/n)*n,
  normalizeCalibrationContext:()=>({}),contextAutoBlockReason:()=>null,
  key:(f,side)=>f+'|'+side,autoCoverageMinimum:p=>Math.max(4,Math.ceil(p.bands.length*.55))};
 vm.runInNewContext(script.slice(begin,end),model);
 assert.equal(model.hasBothChannelThresholds(profile,400),false);
 assert.equal(model.hasBothChannelThresholds(profile,160),true);
 const result=model.estimateThresholdContrast(profile,points);
 assert.equal(result[2].base,0);
 assert.match(result[2].autoReason,/faltan umbrales/);
 const coverage=model.thresholdCoverage(profile,points);
 assert.equal(coverage.measured.length,6);
});
test('landscape PNG layout orders bands left to right, with physical and estimated units kept separate',()=>{
 const src=fs.readFileSync('src/js/04-equalization.js','utf8');
 const a=src.indexOf('function eqPngLayout('),b=src.indexOf('function paintEqResult(',a);
 assert.ok(a>=0&&b>a);
 const ctx=vm.createContext({Math,Number,fmt:f=>f+' Hz',eqResultModel:()=>null});
 vm.runInContext(src.slice(a,b),ctx);
 for(const count of [7,10,31]){
  const rows=Array.from({length:count},(_,i)=>({f:64+i*100,gain:i===0?3:i===1?-2:0,
   position:i===0?1:i===1?-1:0,actualGain:0,delta:0}));
  const model={rows,verified:true,scale:'steps'};
  const layout=ctx.eqPngLayout({bands:rows.map(x=>x.f)},model);
  assert.equal(layout.columns.length,count);
  assert.ok(layout.width>=1080);
  assert.equal(layout.height,782,'export image should use a consistent landscape height');
  assert.ok(layout.width>layout.height);
  assert.ok(layout.columns.every((x,i)=>i===0||x.x>layout.columns[i-1].x));
  assert.ok(layout.columns.every(x=>x.x>=layout.left&&x.x<=layout.right));
  assert.ok(layout.columns[0].y<layout.zeroY,'positive gain should move the control upward');
  assert.ok(layout.columns[1].y>layout.zeroY,'negative gain should move the control downward');
  assert.equal(layout.columns[0].value,1,'verified controls use positions, not estimated gains');
  model.verified=false;
  const unknown=ctx.eqPngLayout({},model);
  assert.equal(unknown.columns[0].value,3,'unverified controls show only suggested EQ dB');
  assert.match(unknown.unit,/SIN posiciones/);
 }
});
test('PNG uses a common zero line and one column per band, not a vertical list',()=>{
 const source=fs.readFileSync('src/js/04-equalization.js','utf8');
 const plot=source.slice(source.indexOf('function paintEqResult('),source.indexOf('function refreshEqCard('));
 assert.match(plot,/layout\.columns\[i\]\.x/);
 assert.match(plot,/c\.moveTo\(chartLeft-13,y\)/);
 assert.match(plot,/Math\.min\(layout\.zeroY,y\)/);
 assert.match(plot,/CONTROLES PARA APLICAR/);
 assert.match(plot,/SIN CONVERSIÓN VALIDADA/);
 assert.doesNotMatch(plot,/const y=345\+i\*61/);
});

test('physical control bounds are separate from the conservative EQ gain budget',()=>{
 const script=fs.readFileSync('src/js/04-equalization.js','utf8');
 const start=script.indexOf('function physicalEqControl('),end=script.indexOf('function eqResultModel(',start);
 const engine={Math,Number,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),normalizeCalibrationContext:c=>c};
 vm.runInNewContext(script.slice(start,end),engine);
 const p={min:-2,max:2,controlMin:-6,controlMax:6,type:'car',context:{eqScale:'steps',eqStepDb:'3'}};
 assert.equal(engine.physicalEqControl(15,p).position,5);
 assert.equal(engine.physicalEqControl(-18,p).position,-6);
 assert.equal(engine.physicalEqControl(24,p).position,6);
 assert.equal(engine.physicalEqControl(24,p).actualGain,18);
 assert.equal(engine.physicalEqControl(15,{...p,controlMax:2}).position,2);
 assert.match(script,/roundTo\(automatic\.base\+manual\+taste\+balance,p\.step\|\|1\),p\.min,p\.max/);
});


test('an uncalibrated 10-band test can suggest small, optional starting adjustments without exaggerating outliers',()=>{
 const source=fs.readFileSync('src/js/04-equalization.js','utf8');
 const a=source.indexOf('function starterEqProposal('),b=source.indexOf('function starterEqCopy(',a);
 assert.ok(a>=0&&b>a);
 const freqs=[30,60,120,250,500,1000,2000,4000,8000,16000];
 const values=[-36.25,-60,-70,-72,-84,-96,-90,-96,-91.5,-26];
 const p={bands:freqs,channels:'separate',measures:{}};
 for(let i=0;i<freqs.length;i++){
  p.measures[freqs[i]+'|left']=[{kind:'heard',db:values[i],confidence:'low'}];
  p.measures[freqs[i]+'|right']=i===6?[]:[{kind:'heard',db:values[i],confidence:'low'}];
 }
 const ctx={gather:()=>freqs.map((f,i)=>({f,db:values[i],quality:'uncertain'})),
  key:(f,side)=>f+'|'+side,median:a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)],Math,Number};
 vm.runInNewContext(source.slice(a,b),ctx);
 const result=ctx.starterEqProposal(p);
 assert.equal(result.rows.length,10);
 assert.equal(result.rows.find(x=>x.f===120).gain,-1);
 assert.equal(result.rows.find(x=>x.f===250).gain,1);
 assert.equal(result.rows.find(x=>x.f===16000).gain,0);
 assert.equal(result.rows.find(x=>x.f===2000).gain,0,'missing other ear should not drive recommendation');
 assert.ok(result.changes<=3);
 const unavailable={...p,measures:{}};
 assert.equal(ctx.starterEqProposal(unavailable).changes,0);
});
test('results foreground actionable EQ and keep original evidence accessible but collapsed',()=>{
 const js=fs.readFileSync('src/js/04-equalization.js','utf8');
 assert.match(js,/id="starterGuide"/);
 assert.match(js,/Propuesta del test/);
 assert.match(js,/id="technicalResults"/);
 assert.match(js,/starter-apply/);
 assert.match(js,/starter-copy/);
 assert.match(js,/renderCalibrationTrace\(p,r\)/);
 assert.match(js,/eqResultMarkup\(p\)/);
 assert.match(js,/evidenceAuditMarkup\(p\)/);
});
