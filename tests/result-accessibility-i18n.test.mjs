import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
