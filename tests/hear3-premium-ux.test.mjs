import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the redesigned public home remains byte-identical to its build source',()=>{
 assert.equal(read('index.html'),read('src/hear3-entry.html'));
});

test('main navigation still exposes exam, EQ, library, settings and theme/offline',()=>{
 const home=read('index.html');
 for(const href of ['./hear3-exam/','./hear3-eq-editor/','./hear3-library/','#ajustes',
  './hear3-privacy/','./hear3-dual-restore/','./hear3-diagnostics/']){
  assert.ok(home.includes('href="'+href+'"'),'Missing access: '+href);
 }
 for(const id of ['hear3-theme-choice','offline-enable','offline-disable',
  'profile-count','eq-count','resume-link']){
  assert.ok(home.includes('id="'+id+'"'),'Missing existing control: '+id);
 }
 assert.match(home,/<details class="app-how-disclosure">/);
 assert.match(home,/<nav class="app-settings-links"/);
});

test('safety summary is always visible and extended guidance is selectable',()=>{
 const exam=read('hear3-exam/index.html');
 const visible=exam.split('<details class="app-safety-disclosure">')[0];
 assert.match(visible,/No es una audiometría clínica/i);
 assert.match(visible,/volumen físico bajo/i);
 assert.match(visible,/dB SPL/i);
 assert.match(exam,/Escape<\\/kbd>/);
 for(const id of ['hear-listening-console','hear-console-heard','hear-console-not',
  'hear-console-stop','hear-console-route']){
  assert.ok(exam.includes('data-testid="'+id+'"'),'Missing exam safety control: '+id);
 }
});

test('all editable EQ export actions remain operable in an expanded disclosure',()=>{
 const editor=read('hear3-eq-editor/index.html');
 assert.match(editor,/<details class="app-result-details app-export-menu" open>/);
 for(const id of ['copy','txt','csv','json','png','undo','redo','review','restore','commit']){
  assert.match(editor,new RegExp('id="'+id+'"'));
 }
});

test('shared styles protect responsive navigation and reduced-motion preferences',()=>{
 const css=read('src/hear3/app-shell.css');
 assert.match(css,/premium UX foundation/);
 assert.match(css,/\.app-nav\{grid-column:1\/-1;grid-row:2/);
 assert.match(css,/overflow-x:auto/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.app-settings-links/);
});
