import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function logic(html){
 const marker='<script type="module">';
 assert.ok(html.includes(marker),'Missing the original module entry');
 return html.slice(html.indexOf(marker)+marker.length).split('</script>')[0];
}
test('exam keeps its tested audio and safety engine without changing source logic',()=>{
 const pilot=logic(file('tests/fixtures/hear3-integrated-exam-pilot.html'));
 const publicLogic=logic(file('hear3-exam/index.html')).replaceAll("from '../src/","from '../../src/");
 assert.equal(publicLogic,pilot);
 assert.match(file('hear3-exam/index.html'),/no es una audiometría clínica/i);
});
test('historial preserves the tested safe import/export/confirmation logic',()=>{
 const pilot=logic(file('tests/fixtures/hear3-catalog-pilot.html'));
 const publicLogic=logic(file('hear3-library/index.html')).replaceAll("from '../src/","from '../../src/");
 assert.equal(publicLogic,pilot);
 assert.match(file('hear3-library/index.html'),/No se envían a la nube/);
});
test('the official root is the application, not a preview or version chooser',()=>{
 const home=file('index.html'),exam=file('hear3-exam/index.html');
 const lib=file('hear3-library/index.html'),editor=file('hear3-eq-editor/index.html');
 const oldEntry=file('hear3-preview/index.html');
 assert.match(home,/data-testid="focus-begin"/);
 assert.match(home,/data-testid="focus-ready"/);
 assert.doesNotMatch(home,/data-testid="focus-sweep"/);
 assert.match(home,/data-testid="focus-tones"/);
 assert.match(home,/data-testid="focus-result"/);
 assert.ok(home.includes('src/hear3/focus-experience.mjs'));
 assert.match(home,/<details class="foot-more"/);
 assert.equal(home.includes('href="./hear3-exam/"'),false);
 assert.doesNotMatch(home,/href="\.\/hear2\/|vista previa experimental|url=\.\/hear3-preview\//i);
 assert.match(oldEntry,/url=\.\.\//);
 for(const page of [exam,lib,editor]){
  assert.match(page,/class="app-topbar"/);
  assert.match(page,/href="\.\.\/hear3-exam\/"/);
  assert.match(page,/href="\.\.\/hear3-library\/"/);
  assert.doesNotMatch(page,/<a[^>]+href="\.\.\/hear2\/"/);
 }
 assert.ok(file('hear2/index.html').length>450000,'Read-only internal recovery is preserved');
});
