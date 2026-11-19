import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEAR3_LANGUAGE_CHOICES,translateHear3Ui} from '../src/hear3/app-i18n.mjs';
import {buildHearFocusLayout,formatHearFocusGain,HEAR_FOCUS_LIMITS}
 from '../src/hear3/focus-experience.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Hear home and build source are identical, without the old dashboard',()=>{
 const home=read('index.html');
 assert.equal(home,read('src/hear3-entry.html'));
 assert.match(home,/data-testid="focus-begin"/);
 assert.match(home,/data-testid="focus-ready"/);
 assert.match(home,/data-testid="focus-sweep"/);
 assert.match(home,/data-testid="focus-sweep-loud"/);
 assert.match(home,/data-testid="focus-tone-loud"/);
 assert.match(home,/data-testid="focus-tones"/);
 assert.match(home,/data-testid="focus-result"/);
 assert.doesNotMatch(home,/class="app-grid"|id="profile-count"|app-topbar|app-settings-grid/);
 assert.match(home,/<details class="foot-tech" id="foot-tech">/);
 assert.match(home,/id="offline-enable"/); // Technical option exists, but is hidden by default.
 assert.doesNotMatch(home,/href="\.\/hear3-exam\/"|href="\.\/hear2\/"|href="\.\/hear3-preview\//);
 for(const href of ['./hear3-library/','./hear3-privacy/','./hear3-dual-restore/','./hear3-diagnostics/']){
  assert.ok(home.includes('href="'+href+'"'));
 }
 assert.match(home,/<details class="foot-more"/);
});

test('first click responds with safety consent and never auto-starts audio',()=>{
 const app=read('src/hear3/focus-experience.mjs');
 for(const id of ['volume-ok','confirm','tone-play','tone-yes','tone-no','tone-stop']){
  assert.match(read('index.html'),new RegExp('id="'+id+'"'));
 }
 assert.match(app,/userInitiated:true/);
 assert.match(app,/HEAR_FOCUS_LIMITS/);
 assert.match(app,/playNext\(\{userInitiated:true\}\)/);
 assert.match(app,/session\.status==='paused'|status==='paused'/);
 assert.match(app,/getRecoveryProposal|readCheckpoint/);
 assert.match(app,/\.interrupt\(\{routeMayHaveChanged/);
 assert.match(app,/\bdispose\(\)/);
});

test('no legacy active exam, editor, privacy or recovery feature is removed',()=>{
 const exam=read('hear3-exam/index.html');
 const visible=exam.split('<details class="app-safety-disclosure">')[0];
 assert.match(visible,/No es una audiometría clínica/i);
 for(const id of ['hear-listening-console','hear-console-heard','hear-console-not','hear-console-stop','hear-console-route']){
  assert.ok(exam.includes('data-testid="'+id+'"'));
 }
 const editor=read('hear3-eq-editor/index.html');
 for(const id of ['copy','txt','csv','json','png','undo','redo','review','restore','commit']){
  assert.match(editor,new RegExp('id="'+id+'"'));
 }
});

test('new focus layout uses a strictly limited number of test choices',()=>{
 assert.equal(buildHearFocusLayout({preset:'5'}).length,5);
 assert.equal(buildHearFocusLayout({preset:'31'}).length,31);
 assert.throws(()=>buildHearFocusLayout({preset:'custom',custom:'125, 125'}),/únicas/);
 assert.equal(HEAR_FOCUS_LIMITS.minDbfs,-80);
 assert.equal(HEAR_FOCUS_LIMITS.maxDbfs,-42);
 assert.equal(formatHearFocusGain(1.5),'+1.5 dB');
 assert.equal(formatHearFocusGain(-1),'-1 dB');
});

test('new visual surface is responsive, keyboard reachable and respects reduced motion',()=>{
 const css=read('src/hear3/focus-experience.css');
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/\[hidden\]/);
 assert.match(css,/#?min-height:60px|min-height:60px/);
});

test('principal listening path is translated to eight languages without changing audio units',()=>{
 const html=read('index.html');
 for(const code of HEAR3_LANGUAGE_CHOICES){
  for(const key of [
   'focus.ready.title','focus.ready.lead','focus.ready.agree',
   'focus.sweep.title','focus.sweep.lead','focus.sweep.yes',
   'focus.sweep.no','focus.sweep.loud','focus.sweep.skip',
   'focus.tones.yes','focus.tones.no','focus.tones.loud',
   'focus.result.title','focus.result.lead','focus.result.warning',
   'focus.result.save','focus.result.copy',
   'focus.d.tonePlaying','focus.d.notePlaying','focus.d.digitalLevel',
   'focus.d.bandCount','focus.d.timeEstimate',
  ]){
   const text=translateHear3Ui(key,code);
   assert.equal(typeof text,'string',code+': '+key);
   assert.ok(text.length>0,code+': '+key);
   if(!key.startsWith('focus.d.'))assert.ok(html.includes('data-hear-i18n="'+key+'"'),key);
  }
  assert.match(translateHear3Ui('focus.d.digitalLevel',code),/dBFS/);
 }
 assert.match(html,/data-testid="focus-tone-level"/);
 assert.match(html,/data-testid="focus-tone-timer"/);
 assert.match(html,/id="eq-graph"/);
 assert.match(html,/id="eq-howto"/);
 for(const id of ['download-eq','download-eq-csv','download-eq-png','saved-eq-link'])
  assert.ok(html.includes('id="'+id+'"'),id);
});

test('core language options remain available in eight languages',()=>{
 for(const language of HEAR3_LANGUAGE_CHOICES)
  for(const key of ['home.headline','home.lead','console.heard','console.not']){
   assert.equal(typeof translateHear3Ui(key,language),'string');
  }
});
