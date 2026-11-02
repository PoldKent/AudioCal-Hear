import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('src/js/03d-inline-loudness.js','utf8');
const sandbox={Number,Math,Object,Date,Array,
 page:'test',introStep:3,
 key:(f,side)=>f+'|'+side,
 plan:()=>[{f:1000,side:'left',pass:0},{f:2500,side:'left',pass:0},{f:2500,side:'right',pass:0}],
 firstMissing:()=>1,clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),
 fmt:f=>f>=1000?f/1000+' kHz':f+' Hz',esc:String,
 button:()=>'<button/>',LOUDNESS_REFERENCE_DBFS:-48,
 LOUDNESS_OFFSET_LIMIT:6,touch:()=>{},render:()=>{}
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const make=()=>({bands:[1000,2500],measures:{'2500|left':[{db:-64,kind:'heard'}]},loudnessInline:{}});
test('inline test chooses the current ear and excludes 1 kHz',()=>{
 const p=make();sandbox.current=p;
 const e=sandbox.inlineLoudnessEntry(p);
 assert.equal(e.f,2500);assert.equal(e.side,'left');
 sandbox.firstMissing=()=>0;
 assert.equal(sandbox.inlineLoudnessEntry(p),null);
 sandbox.firstMissing=()=>1;
});
test('loudness match requires both playback actions, never replaces original threshold',()=>{
 const p=make();sandbox.current=p;const before=JSON.stringify(p.measures);
 assert.equal(sandbox.recordInlineLoudness(),false);
 vm.runInContext("inlineLoudnessListened.add('reference')",sandbox);
 assert.equal(sandbox.recordInlineLoudness(),false);
 vm.runInContext("inlineLoudnessListened.add('target');inlineLoudnessOffsetDb=3",sandbox);
 assert.equal(sandbox.recordInlineLoudness(),true);
 assert.equal(p.loudnessInline['2500|left'].offsetDb,3);
 assert.equal(p.loudnessInline['2500|left'].referenceDbfs,-48);
 assert.equal(p.loudnessInline['2500|right'],undefined);
 assert.equal(JSON.stringify(p.measures),before);
});
test('relative match is present only as technical evidence, never direct EQ gain',()=>{
 const p=make();p.loudnessInline['2500|left']={method:'inline-relative-match-v1',offsetDb:2};
 const markup=sandbox.inlineLoudnessSummaryMarkup(p);
 assert.match(markup,/Sonoridad relativa/);
 assert.match(markup,/2 dBFS/);
 assert.match(markup,/No se traducen directamente/);
 const eq=fs.readFileSync('src/js/04-equalization.js','utf8');
 const automatic=eq.slice(eq.indexOf('function estimateThresholdContrast('),eq.indexOf('function recommend(p)'));
 assert.doesNotMatch(automatic,/loudnessInline|offsetDb/);
});
