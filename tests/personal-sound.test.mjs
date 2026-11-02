import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('src/js/03c-personal-sound.js','utf8');
const sandbox={
 Date,Number,Object,Array,Math,
 gather:p=>p.bands.map((f,i)=>({f,db:p.data&&Object.hasOwn(p.data,i)?p.data[i]:-70,quality:p.lowConfidence?'uncertain':'good'})),
 thresholdCoverage:(p,d)=>({complete:d.filter(x=>Number.isFinite(x.db))}),
 doneCount:p=>p.done??p.bands.length,
 plan:p=>p.bands,
 hasBothChannelThresholds:()=>true,
 recommend:p=>p.bands.map((f,i)=>({f,gain:p.gains?.[i]??0})),
 button:(v,a)=>'<button data-act="'+a+'">'+v+'</button>',
 touch:()=>{},render:()=>{}
};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const make=()=>({id:'qa',bands:[60,250,1000,4000,16000],lowConfidence:true,measures:{'1000|left':[{db:-72,kind:'heard'}]},
 data:[-67,-65,-70,-74,-76],gains:[0,1,0,-1,0],personalSoundReview:null});
test('Personal Sound reflects actual gains while distinguishing low-confidence thresholds',()=>{
 const p=make(),copy=JSON.stringify(p.measures);
 const s=sandbox.personalSoundStatus(p);
 assert.equal(s.grade,'estimado');assert.equal(s.measured,5);
 assert.equal(s.provisional,5);assert.equal(s.tuned,2);
 assert.equal(s.verified,null);assert.equal(JSON.stringify(p.measures),copy);
});
test('unfinished or incomplete profiles do not claim a complete calibration',()=>{
 const p=make();p.done=2;
 assert.equal(sandbox.personalSoundStatus(p).grade,'incompleto');
 p.done=5;p.data[3]=null;
 assert.equal(sandbox.personalSoundStatus(p).grade,'parcial');
});
test('review requires comparison modes and becomes stale when EQ changes',()=>{
 const p=make(),saved=JSON.stringify(p.measures);
 sandbox.current=p;
 assert.equal(sandbox.personalSoundSaveReview('better'),false);
 sandbox.personalSoundPreviewMark('with');
 assert.equal(sandbox.personalSoundSaveReview('better'),false);
 sandbox.personalSoundPreviewMark('without');
 assert.equal(sandbox.personalSoundSaveReview('better'),true);
 assert.equal(sandbox.personalSoundStatus(p).verified,'better');
 p.gains[1]=2;
 assert.equal(sandbox.personalSoundStatus(p).verified,null);
 assert.equal(JSON.stringify(p.measures),saved);
});
test('malformed review values cannot be applied as hearing evidence',()=>{
 const p=make();sandbox.current=p;
 assert.equal(sandbox.personalSoundSaveReview('boost-40db'),false);
 assert.match(sandbox.personalSoundReviewMarkup(p),/Escucha tu música|Reproduce una canción|Comparaste los dos modos/);
 assert.ok(!source.includes('p.measures='));
});
