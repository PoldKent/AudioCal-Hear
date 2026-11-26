import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEAR3_LANGUAGE_CHOICES,translateHear3Ui} from '../src/hear3/app-i18n.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('technical pages bind every declared key and preserve native data identifiers',()=>{
 const source=read('src/hear3/app-i18n.mjs');
 const pages=['hear3-photo-privacy/index.html','hear3-privacy/index.html','hear3-diagnostics/index.html','hear3-dual-restore/index.html','hear3-eq-editor/index.html','hear3-library/index.html','hear3-exam/index.html'];
 const keys=new Set();
 for(const path of pages){
  const html=read(path);
  for(const match of html.matchAll(/data-hear-i18n(?:-aria-label|-alt|-placeholder)?="(tech\.[^"]+)"/g))keys.add(match[1]);
  assert.match(html,/data-hear-language/);
 }
 assert.ok(keys.size>=55);
 for(const key of keys){
  assert.equal(source.split(JSON.stringify(key)+':').length-1,8,key+' must exist directly in every locale');
  for(const lang of HEAR3_LANGUAGE_CHOICES)assert.ok(translateHear3Ui(key,lang)?.trim(),lang+' '+key);
 }
 const privacy=read(pages[1]),diag=read(pages[2]);
 assert.match(privacy,/value="v3-only"/);
 assert.match(privacy,/value="all-hear"/);
 assert.match(privacy,/target.includesHear2\?'confirmAll':'confirmV3'/);
 assert.match(privacy,/phrase:\$\('confirm-phrase'\).value/);
 assert.match(diag,/value="audio-interrupted"/);
 assert.match(diag,/\$\('issue-code'\).value/);
 for(const lang of HEAR3_LANGUAGE_CHOICES){
  assert.ok(translateHear3Ui('tech.privacy.confirmAll',lang).includes('V3'));
  assert.ok(translateHear3Ui('tech.privacy.confirmV3',lang).includes('V3'));
  assert.ok(translateHear3Ui('tech.photo.ready',lang).includes('{w}'));
  assert.ok(translateHear3Ui('tech.photo.ready',lang).includes('{h}'));
  assert.ok(translateHear3Ui('tech.privacy.deleted',lang).includes('{n}'));
 }
});
test('restore consent translations retain dynamic placeholders and all eight direct entries',()=>{
 const source=read('src/hear3/app-i18n.mjs');
 for(const key of ['confirmBackup','confirmReplace','confirmAck','reviewed','downloads','marker','acked']){
  const full='tech.restore.'+key;
  assert.equal(source.split(JSON.stringify(full)+':').length-1,8,full);
  for(const lang of HEAR3_LANGUAGE_CHOICES)assert.ok(translateHear3Ui(full,lang));
 }
 for(const lang of HEAR3_LANGUAGE_CHOICES)for(const placeholder of ['{devices}','{profiles}','{results}','{oldProfiles}','{records}'])assert.ok(translateHear3Ui('tech.restore.reviewed',lang).includes(placeholder));
});

test('editor, library and advanced exam consent translations preserve all placeholders and identifiers',()=>{
 const source=read('src/hear3/app-i18n.mjs');
 for(const [prefix,keys] of [
 ['tech.editor.',['confirm','reviewed','restoreReviewed','pending','selected']],
 ['tech.library.',['confirmReplace','confirmDelete','confirmCascade','confirmLegacy','confirmVault','confirmVaultReplace','summary','deleteScope']],
 ['tech.exam.',['confirmRecover','confirmDelete','confirmEq','confirmResponses','confirmExtra','confirmRetake']]
 ])for(const key of keys){
  const full=prefix+key;
  assert.equal(source.split(JSON.stringify(full)+':').length-1,8,full);
  const es=translateHear3Ui(full,'es');
  for(const lang of HEAR3_LANGUAGE_CHOICES){
   const value=translateHear3Ui(full,lang);
   assert.ok(value?.trim(),full+' '+lang);
   for(const token of es.match(/\{[a-z]+\}/g)??[])assert.ok(value.includes(token),full+' '+lang+' '+token);
  }
 }
 assert.match(read('hear3-library/index.html'),/generation!==reviewGeneration/);
 assert.match(read('hear3-eq-editor/index.html'),/window.addEventListener\('hear3:language-change'/);
});
