import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEAR3_LANGUAGE_CHOICES,translateHear3Ui}
 from '../src/hear3/app-i18n.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const UI_KEYS=[
 'skip','pill','welcomeTag','begin','noAccount','readyTag','category','bands',
 'custom','categoryTip','restartTitle','restartTip','restartDownload','restartReset',
 'sweepTag','sweepWarning','tonesTag','toneUnit','uncertainWarning','uncertainRepeat',
 'guide1','guide2','guide3','guide4','guideNote','savedEq','footerSafety',
 'footerHelp','footerTech','offlineSave','offlineRemove','offlineTitle',
 'footResults','footRestore','footPrivacy','footPhoto','footDiagnostics',
];
test('focus UI translations exist natively in all eight locale dictionaries',()=>{
 for(const lang of HEAR3_LANGUAGE_CHOICES)
  for(const key of UI_KEYS){
   const value=translateHear3Ui('focus.ui.'+key,lang);
   assert.equal(typeof value,'string',lang+' '+key);
   assert.ok(Array.from(value.trim()).length>=1,lang+' '+key);
  }
 for(const lang of HEAR3_LANGUAGE_CHOICES.filter(x=>x!=='es'))
  for(const key of ['begin','category','footerHelp','footerSafety'])
   assert.notEqual(translateHear3Ui('focus.ui.'+key,lang),
    translateHear3Ui('focus.ui.'+key,'es'),lang+' '+key+' fell back to Spanish');
});
test('production and build-source entries share all translated focus labels',()=>{
 const home=read('index.html');
 assert.equal(home,read('src/hear3-entry.html'));
 for(const key of UI_KEYS)assert.ok(
  home.includes('data-hear-i18n="focus.ui.'+key+'"'),key);
 for(const key of [
  'common.language',
  'focus.d.confirm','choice.uncertain',
 ])assert.ok(home.includes('data-hear-i18n="'+key+'"'),key);
 assert.match(home,/<span data-hear-i18n="focus.ui.begin">Empezar prueba<\/span>/);
 assert.match(home,/<span data-hear-i18n="focus.d.confirm">Empezar a escuchar<\/span>/);
 for(const id of ['focus-begin','focus-confirm','focus-sweep-loud',
  'focus-tone-loud','focus-review-tone','focus-result'])
  assert.ok(home.includes('data-testid="'+id+'"'),id);
});
test('static offline cache keys stay in sync after releasing updated dictionaries',()=>{
 const optIn=read('src/hear3/offline-optin.mjs');
 const worker=read('hear3-offline-sw.js');
 assert.match(optIn,/audiocal-hear3-prototype-static-v20/);
 assert.match(worker,/CACHE_NAME=CACHE_PREFIX\+'v20'/);
});

test('support link is informational and translated in every locale',()=>{
 const home=read('index.html');
 assert.ok(home.includes('href="https://github.com/PoldKent/AudioCal-Hear/blob/main/SUPPORT.md" data-testid="hear-support-link"'));
 assert.ok(home.includes('data-hear-i18n="focus.ui.footSupport"'));
 assert.ok(read('SUPPORT.md').includes('Ethereum mainnet (ERC-20)'));
 assert.ok(read('.github/FUNDING.yml').includes('https://github.com/PoldKent/AudioCal-Hear/blob/main/SUPPORT.md'));
 for(const lang of ['es','en','fr','pt','it','de','zh','ja'])assert.ok(translateHear3Ui('focus.ui.footSupport',lang));
});
