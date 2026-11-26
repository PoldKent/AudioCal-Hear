import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEAR3_LANGUAGE_CHOICES,translateHear3Ui} from '../src/hear3/app-i18n.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('technical pages bind every declared key and preserve native data identifiers',()=>{
 const source=read('src/hear3/app-i18n.mjs');
 const pages=['hear3-photo-privacy/index.html','hear3-privacy/index.html','hear3-diagnostics/index.html'];
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