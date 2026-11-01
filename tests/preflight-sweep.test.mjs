import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/js/03b-frequency-sweep.js',import.meta.url),'utf8');
const section=source.slice(0,source.indexOf('async function startSweep('));
const context={Math,Number,Array,Object,Date,
 clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),
 esc:s=>String(s),button:()=>'<button/>',getStart:()=>-36};
vm.createContext(context);vm.runInContext(section,context);

test('logarithmic sweep is monotonic, stays within range and changes no stored thresholds',()=>{
 const a=Array.from({length:101},(_,i)=>context.sweepHz(125,8000,i/100));
 assert.equal(a[0],125);assert.equal(a.at(-1),8000);
 assert.ok(a.every((f,i)=>i===0||f>a[i-1]));
 assert.ok(Math.abs(context.sweepHz(125,8000,0.5)-1000)<.0001);
 const p={measures:{'1000|both':[{kind:'heard',db:-72}]},sweepRecords:{}};
 const initial=JSON.stringify(p.measures);
 p.sweepRecords.both={method:'fixed-digital-level-preflight-v1',minHz:125,maxHz:8000,
   events:[{hz:500,heard:true},{hz:2200,heard:false}],micUsed:false,mic:[]};
 assert.equal(JSON.stringify(p.measures),initial);
});
test('sweep conclusions need explicit observations and never diagnose person or device',()=>{
 const base={minHz:125,maxHz:8000,events:[],mic:[],micUsed:false};
 const empty=context.sweepAssessment(base);
 assert.equal(empty.known,false);
 assert.match(context.sweepRecordSummary(base),/inconcluso/);
 const record={...base,events:[{hz:300,heard:false},{hz:500,heard:true},{hz:2000,heard:false},{hz:3500,heard:true},{hz:6000,heard:false}]};
 const result=context.sweepAssessment(record);
 assert.equal(result.first,500);assert.equal(result.last,6000);
 assert.equal(result.segments.length,2);
 assert.match(context.sweepRecordSummary(record),/aprox/);
 assert.doesNotMatch(context.sweepRecordSummary(record),/capacidad auditiva confirmada|calibraci.n exacta/i);
});
test('microphone evidence is separate from subjective audibility',()=>{
 const record={minHz:125,maxHz:8000,
   events:[{hz:500,heard:true},{hz:6000,heard:false}],
   micUsed:true,mic:[{hz:1000,relativeDb:15,detected:true},{hz:4000,relativeDb:2,detected:false}]};
 const text=context.sweepRecordSummary(record);
 assert.match(text,/Micrófono/);
 assert.match(text,/no calibrad[ao]s?/);
 assert.match(context.sweepSummaryMarkup({sweepRecords:{both:{...record,method:'fixed-digital-level-preflight-v1'}}}),/no son umbrales clínicos/);
});
test('generated bundle ships sweep without touching automatic EQ calculation',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('fixed-digital-level-preflight-v1'));
 assert.ok(html.includes('Iniciar barrido previo'));
 assert.ok(html.includes('sweepPanelMarkup(p)'));
 const eq=fs.readFileSync(new URL('../src/js/04-equalization.js',import.meta.url),'utf8');
 const automatic=eq.slice(eq.indexOf('function estimateThresholdContrast('),eq.indexOf('function recommend(p)'));
 assert.doesNotMatch(automatic,/sweepRecords|sweepAssessment|micSamples/);
});
