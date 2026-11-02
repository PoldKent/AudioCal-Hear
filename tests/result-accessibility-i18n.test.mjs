import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const d=JSON.parse(fs.readFileSync('src/translations.json','utf8'));
const critical=["Tu resultado auditivo","Propuesta del test:","Estado del resultado:","Mediciones del test y fiabilidad · opcional","Opciones avanzadas del EQ · formato y controles físicos","Refinar el sonido con música · opcional","Aplicar ajustes en otro equipo o app","Saltar al contenido","Frecuencias del EQ"];
test('result and screen reader labels are explicitly translated',()=>{
 for(const lang of ['en','fr','pt','it','de','zh','ja']){
  for(const key of critical){
   assert.ok(typeof d[lang][key]==='string'&&d[lang][key].trim(),lang+': '+key);
   assert.notEqual(d[lang][key],key,lang+': untranslated '+key);
  }
 }
});
test('optional results remain and root does not announce every EQ adjustment',()=>{
 const source=fs.readFileSync('src/js/04-equalization.js','utf8');
 const template=fs.readFileSync('src/index.template.html','utf8');
 for(const id of ['musicTools','toneBalance','eqCardSection','prefRound'])assert.ok(source.includes('id="'+id+'"'),id);
 assert.match(source,/downloadtxt/);
 assert.match(source,/aria-describedby="eqSelectedNote"/);
 assert.match(source,/aria-pressed/);
 assert.match(template,/<main id="root" tabindex="-1"><\/main>/);
 assert.doesNotMatch(template,/id="root" aria-live/);
 assert.match(template,/class="skip-link"/);
});

test('dynamic experimental EQ guidance is translated with embedded numbers preserved',()=>{
 const core=fs.readFileSync('src/js/01-core.js','utf8');
 const from=core.indexOf('function trans(input){'),to=core.indexOf('function localize(',from);
 assert.ok(from>=0&&to>from);
 const dictionary=JSON.parse(fs.readFileSync('src/translations.json','utf8'));
 for(const lang of ['en','fr','pt','it','de','zh','ja']){
  const context={language:lang,TEXTS:dictionary,
   FRAGMENTS:Object.fromEntries(Object.entries(dictionary).map(([code,table])=>[code,Object.keys(table).filter(k=>k.length>=9&&k.length<350).sort((a,b)=>b.length-a.length)]))};
  const translate=vm.runInNewContext(core.slice(from,to)+'; trans',context);
  const sample='Punto de partida experimental incluido en el EQ: 2k +1 dB · 3 bandas adicionales. 2 bandas con evidencia ausente, interpolada o discrepante no justifican un refuerzo por sí solas.';
  const result=translate(sample);
  assert.ok(result.includes('2k +1 dB'),lang+': numerical EQ settings changed');
  assert.ok(result.includes('3'),lang+': additional bands count lost');
  assert.ok(result.includes('2'),lang+': uncertainty count lost');
  assert.ok(!result.includes('Punto de partida experimental incluido'),lang+': Spanish recommendation remains');
  assert.ok(!result.includes('bandas con evidencia ausente'),lang+': caution remains Spanish');
  assert.ok(result.includes(dictionary[lang]['bandas adicionales']),lang+': translated count suffix missing');
 }
});

