import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function logic(html){
 const marker='<script type="module">';
 assert.ok(html.includes(marker),'Missing the original module entry');
 return html.split(marker).at(-1).split('</script>')[0];
}
test('public exam reuses the exact tested experimental engine; only relative source imports change',()=>{
 const pilot=logic(file('tests/fixtures/hear3-integrated-exam-pilot.html'));
 const publicLogic=logic(file('hear3-exam/index.html')).replaceAll("from '../src/","from '../../src/");
 assert.equal(publicLogic,pilot);
 assert.match(file('hear3-exam/index.html'),/no es una audiometría clínica/);
});
test('public catalog uses the tested safe export, restore, consent and deletion logic unchanged',()=>{
 const pilot=logic(file('tests/fixtures/hear3-catalog-pilot.html'));
 const publicLogic=logic(file('hear3-library/index.html')).replaceAll("from '../src/","from '../../src/");
 assert.equal(publicLogic,pilot);
 assert.match(file('hear3-library/index.html'),/No borra ni modifica sus datos originales/);
});
test('public navigation is real rather than a developer fixture, preserving the Hear 2 fallback',()=>{
 const home=file('hear3-preview/index.html'),exam=file('hear3-exam/index.html');
 const lib=file('hear3-library/index.html'),editor=file('hear3-eq-editor/index.html');
 assert.match(home,/href="..\/hear3-exam\/"\>Comenzar examen experimental/);
 assert.match(home,/href="..\/hear3-library\/"\>Mi historial y respaldos/);
 assert.match(exam,/href="..\/hear3-library\/"\>Consultar catálogo e historial V3/);
 assert.match(editor,/href="..\/hear3-exam\/"\>Ir al examen integrado experimental/);
 assert.match(lib,/href="..\/hear2\/"\>Hear 2 anterior/);
 assert.match(file('index.html'),/url=\.\/hear3-preview\//);
 assert.ok(file('hear2/index.html').length>450000,'Hear 2 remains complete');
});
