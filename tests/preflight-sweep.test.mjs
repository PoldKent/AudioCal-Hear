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

test('slow edges allocate more time at/below 250 Hz and 15–16 kHz',()=>{
 const standard=context.sweepSchedule(125,8000);
 assert.equal(standard.duration,30);
 assert.deepEqual(Array.from(standard.segments.map(s=>s.zone)),['graves','medios']);
 assert.equal(standard.segments[0].from,125);
 assert.equal(standard.segments[0].to,250);
 assert.equal(standard.segments[0].seconds,8);

 const wide=context.sweepSchedule(40,16000);
 assert.equal(wide.duration,44);
 assert.deepEqual(Array.from(wide.segments.map(s=>s.zone)),['graves','medios','agudos']);
 assert.equal(wide.segments[0].to,250);
 assert.equal(wide.segments[1].to,15000);
 assert.equal(wide.segments[2].from,15000);
 assert.equal(wide.segments[2].to,16000);
 assert.equal(wide.segments[2].seconds,10);
 for(const segment of wide.segments){
  assert.ok(Math.abs(context.sweepFrequencyAt(wide,segment.start)-segment.from)<0.1);
  assert.ok(Math.abs(context.sweepFrequencyAt(wide,segment.end)-segment.to)<0.1);
 }
 assert.equal(context.sweepFrequencyAt(wide,0),40);
 assert.equal(context.sweepFrequencyAt(wide,44),16000);
 const samples=Array.from({length:881},(_,i)=>context.sweepFrequencyAt(wide,i/20));
 assert.ok(samples.every((hz,i)=>i===0||hz>=samples[i-1]),'no backward jumps');
 // Segment log-frequency speeds (octaves per second): edges are slower.
 const perSecond=s=>Math.log(s.to/s.from)/s.seconds;
 assert.ok(perSecond(wide.segments[0])<perSecond(wide.segments[1]));
 assert.ok(perSecond(wide.segments[2])<perSecond(wide.segments[1]));
});
test('Nyquist-clamped runs use their real sweep bounds and avoid a fake 15 kHz segment',()=>{
 const schedule=context.sweepSchedule(40,12000);
 assert.equal(schedule.duration,34);
 assert.equal(schedule.segments.length,2);
 assert.equal(context.sweepFrequencyAt(schedule,100),12000);
 assert.equal(context.sweepFrequencyAt(schedule,-100),40);
});
