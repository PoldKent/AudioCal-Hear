import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3CatalogStore} from '../src/hear3/catalog-backup-store.mjs';
import {validateHear3Catalog} from '../src/hear3/catalog-contract.mjs';
import {createHear3ProvisionalEqEditor,inspectHear3ProvisionalEq,
 exportHear3ProvisionalEq} from '../src/hear3/provisional-eq-editor.mjs';

class MemoryStorage {
 constructor(){this.data=new Map();this.writable=true;}
 getItem(k){return this.data.get(k)??null;}
 setItem(k,v){if(!this.writable)throw Error('Quota exceeded');this.data.set(k,v);}
 removeItem(k){this.data.delete(k);}
}
const SAMPLE={catalogVersion:1,
 devices:[{id:'dev-one',name:'EQ sin validar',category:'headphones'}],
 profiles:[{id:'prof-one',deviceId:'dev-one',name:'Ejemplo EQ',
  graphicEq:{type:'graphic',deviceId:'dev-one',bands:[
   {id:'low',frequencyHz:125,source:'manual'},
   {id:'mid',frequencyHz:1000,source:'provisional'},
   {id:'high',frequencyHz:8000,source:'manual'},
  ]}}],
 results:[{id:'result-one',profileId:'prof-one',capturedAt:1791000000000,
  provenance:'experimental-tone-test',status:'provisional',
  originalEq:[{bandId:'low',gainDb:1},{bandId:'mid',gainDb:0},{bandId:'high',gainDb:-1}],
  currentEq:[{bandId:'low',gainDb:1},{bandId:'mid',gainDb:0},{bandId:'high',gainDb:-1}],
  observations:[],editHistory:[]}],
 activeProfileId:'prof-one'};
function factory({resultId='result-one'}={}){
 const storage=new MemoryStorage(),store=createHear3CatalogStore({deviceStorage:storage,tabStorage:null});
 assert.equal(store.save(SAMPLE).persistedOnDevice,true);
 const editor=createHear3ProvisionalEqEditor({store,resultId,now:()=>1791000001000});
 return {storage,store,editor};
}
test('provisional editor is read-only until confirmed; edits remain bounded, persistent and audited',()=>{
 const f=factory(),base=f.store.load();
 assert.equal(f.editor.snapshot().rows.length,3);
 const preview=f.editor.preview({values:[
  {bandId:'low',gainDb:2},{bandId:'high',gainDb:-0.5},
 ]});
 assert.equal(preview.changeCount,2);
 assert.equal(preview.autoApplyAllowed,false);
 assert.equal(f.store.load().revision,base.revision);
 assert.throws(()=>f.editor.commit(),/Explicit user confirmation/);
 assert.equal(f.store.load().revision,base.revision);
 const result=f.editor.commit({userInitiated:true,confirmed:true});
 assert.equal(result.persistedOnDevice,true);
 assert.equal(result.audioStarted,false);
 assert.equal(result.legacyV2Modified,false);
 const persisted=createHear3ProvisionalEqEditor({store:f.store,resultId:'result-one'});
 const snap=persisted.snapshot();
 assert.deepEqual(snap.rows.map(x=>x.currentGainDb),[2,0,-0.5]);
 assert.deepEqual(snap.rows.map(x=>x.originalGainDb),[1,0,-1]);
 const updated=f.store.load().catalog.results[0];
 assert.deepEqual(updated.editHistory.map(e=>[e.bandId,e.fromGainDb,e.toGainDb]),
  [['low',1,2],['high',-1,-0.5]]);
 assert.ok(updated.editHistory.every(x=>x.at===1791000001000));
 assert.equal(updated.status,'provisional');
});
test('restoring original EQ is a separate confirmed, reversible journaled change',()=>{
 const f=factory();
 f.editor.preview({values:[{bandId:'mid',gainDb:1}]});
 f.editor.commit({userInitiated:true,confirmed:true});
 const preview=f.editor.preview({restoreOriginal:true});
 assert.equal(preview.restoresOriginal,true);
 assert.equal(preview.changeCount,1);
 assert.equal(f.editor.snapshot().rows[1].currentGainDb,1);
 f.editor.commit({userInitiated:true,confirmed:true});
 assert.deepEqual(f.editor.snapshot().rows.map(x=>x.currentGainDb),[1,0,-1]);
 assert.equal(f.store.load().catalog.results[0].editHistory.length,2);
 assert.throws(()=>f.editor.preview({restoreOriginal:true}),/No EQ changes/);
});
test('review TXT CSV JSON exports are deterministic and describe noncalibrated origin',()=>{
 const f=factory();
 const catalog=f.store.load().catalog;
 const json=JSON.parse(exportHear3ProvisionalEq(catalog,'result-one',{format:'json'}));
 assert.equal(json.format,'hear3-provisional-eq-review-v1');
 assert.equal(json.autoApplyAllowed,false);
 assert.equal(json.acousticallyValidated,false);
 assert.deepEqual(json.rows.map(r=>r.frequencyHz),[125,1000,8000]);
 const csv=exportHear3ProvisionalEq(catalog,'result-one',{format:'csv'});
 assert.match(csv,/frecuencia_Hz/);
 assert.match(csv,/"125","1","1"/);
 assert.match(csv,/NO CALIBRADO/);
 const txt=exportHear3ProvisionalEq(catalog,'result-one',{format:'txt'});
 assert.match(txt,/125 Hz: \+1 dB/);
 assert.match(txt,/No se verificaron presion sonora/);
 assert.throws(()=>exportHear3ProvisionalEq(catalog,'result-one',{format:'preset'}),/Unsupported/);
});
test('invalid edit values fail closed, no silent clamping or steps',()=>{
 const f=factory(),baseline=f.store.load().revision;
 for(const values of [
  [{bandId:'low',gainDb:3.5}],
  [{bandId:'low',gainDb:-3.5}],
  [{bandId:'low',gainDb:1.25}],
  [{bandId:'low',gainDb:NaN}],
  [{bandId:'low',gainDb:Infinity}],
  [{bandId:'invalid',gainDb:2}],
  [{bandId:'low',gainDb:1.5},{bandId:'low',gainDb:2}],
  [],
 ])assert.throws(()=>f.editor.preview({values}),/Invalid|Gain|Unknown/);
 assert.equal(f.store.load().revision,baseline);
 assert.throws(()=>f.editor.commit({userInitiated:true,confirmed:true}),/Preview/);
});
test('editor detects changed catalog revision and discards unsafe preview',()=>{
 const f=factory();
 f.editor.preview({values:[{bandId:'mid',gainDb:1}]});
 const original=f.store.load();
 f.store.save({...original.catalog,activeProfileId:null});
 assert.throws(()=>f.editor.commit({userInitiated:true,confirmed:true}),/Catalog changed/);
 assert.equal(f.store.load().catalog.results[0].currentEq[1].gainDb,0);
});
test('nonprovisional, legacy and nonexistent results cannot use this editor',()=>{
 const f=factory();
 const catalog=f.store.load().catalog;
 assert.throws(()=>inspectHear3ProvisionalEq(catalog,'absent'),/does not exist/);
 catalog.results[0].status='inconclusive';
 catalog.results[0].originalEq=[];catalog.results[0].currentEq=[];
 assert.throws(()=>inspectHear3ProvisionalEq(catalog,'result-one'),/Only an explicitly archived/);
 catalog.results[0].status='provisional';
 catalog.results[0].originalEq=[{bandId:'low',gainDb:1},
  {bandId:'mid',gainDb:0},{bandId:'high',gainDb:-1}];
 catalog.results[0].currentEq=structuredClone(catalog.results[0].originalEq);
 catalog.results[0].provenance='legacy-unverified';
 assert.throws(()=>inspectHear3ProvisionalEq(catalog,'result-one'),/Only an explicitly archived/);
 catalog.results[0].provenance='experimental-tone-test';
 catalog.results[0].originalEq[0].gainDb=30;
 assert.throws(()=>inspectHear3ProvisionalEq(catalog,'result-one'),/exceeds the bounded/);
});
test('volatile writes are not reported as persisted and never touch Hear 2 legacy',()=>{
 const f=factory();
 f.storage.setItem('audiocal-hear-profiles-v1','KEEP_HISTORIC');
 f.editor.preview({values:[{bandId:'mid',gainDb:1}]});
 f.storage.writable=false;
 const result=f.editor.commit({userInitiated:true,confirmed:true});
 assert.equal(result.saved,true);
 assert.equal(result.persistedOnDevice,false);
 assert.equal(result.durability,'volatile');
 assert.equal(f.storage.getItem('audiocal-hear-profiles-v1'),'KEEP_HISTORIC');
 const fresh=createHear3CatalogStore({deviceStorage:f.storage,tabStorage:null});
 assert.equal(fresh.load().catalog.results[0].currentEq[1].gainDb,0);
});
test('independent existing results and original catalog survive selective editing',()=>{
 const f=factory(),original=f.store.load().catalog;
 const another=structuredClone(original.results[0]);
 another.id='result-another';another.capturedAt=1791000000001;
 f.store.save({...original,results:[original.results[0],another]});
 const before=f.store.load().catalog;
 f.editor.preview({values:[{bandId:'low',gainDb:1.5}]});
 f.editor.commit({userInitiated:true,confirmed:true});
 const after=validateHear3Catalog(f.store.load().catalog);
 assert.deepEqual(after.results[1],before.results[1]);
 assert.deepEqual(after.results[0].originalEq,before.results[0].originalEq);
 assert.equal(after.results[0].currentEq[0].gainDb,1.5);
});

test('D-049/D-050 exported drafts must reflect visible gains while persisted EQ stays intact',()=>{
 const f=factory(),catalog=f.store.load().catalog;
 const current=catalog.results[0].currentEq.map(r=>r.gainDb);
 const draft=[-0.5,1,2.5];
 const txt=exportHear3ProvisionalEq(catalog,'result-one',{format:'txt',draftGains:draft});
 const csv=exportHear3ProvisionalEq(catalog,'result-one',{format:'csv',draftGains:draft});
 const json=JSON.parse(exportHear3ProvisionalEq(catalog,'result-one',{
  format:'json',draftGains:draft,
 }));
 assert.match(txt,/125 Hz: -0.5 dB/);
 assert.match(txt,/VALORES VISIBLES AUN NO GUARDADOS/);
 assert.match(csv,/"125","-0.5","1"/);
 assert.deepEqual(json.rows.map(r=>r.currentGainDb),draft);
 assert.equal(json.draftUnsaved,true);
 assert.deepEqual(f.store.load().catalog.results[0].currentEq.map(r=>r.gainDb),current);
 for(const invalid of [[1,0],[0,NaN,0],[0,3.5,0],[0,1.25,0]]){
  assert.throws(()=>exportHear3ProvisionalEq(catalog,'result-one',{
   format:'txt',draftGains:invalid,
  }),/Invalid visible EQ gains/);
 }
 const original=JSON.parse(exportHear3ProvisionalEq(catalog,'result-one',{format:'json'}));
 assert.equal(original.draftUnsaved,undefined);
});
