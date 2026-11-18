import test from 'node:test';
import assert from 'node:assert/strict';
import {
 HEAR3_LANGUAGE_CHOICES,HEAR3_LANGUAGE_KEY,
 resolveHear3Language,translateHear3Ui,
} from '../src/hear3/app-i18n.mjs';

test('eight declared languages have a complete dictionary for core user journeys',()=>{
 assert.deepEqual(HEAR3_LANGUAGE_CHOICES,
  ['es','en','fr','pt','it','de','zh','ja']);
 assert.equal(HEAR3_LANGUAGE_KEY,'hear3:ui-language:v1');
 const core=[
  'nav.home','nav.exam','nav.eq','nav.history','nav.settings',
  'home.headline','home.lead','home.start','home.view',
  'exam.header','exam.stage.prepare','exam.stage.sweep','exam.stage.tones',
  'exam.stage.result','console.heard','console.not','console.start',
  'console.plan','console.next','console.finish','console.view',
  'console.resume','console.recover','console.compare','console.pause',
  'prompt.setup','prompt.start','prompt.plan','prompt.next',
  'prompt.heard','prompt.sweep','prompt.running','prompt.finish',
  'prompt.result','prompt.resume','prompt.recover','prompt.compare',
  'prompt.contradiction','choice.first','choice.second',
  'choice.similar','choice.neither','choice.uncertain','route.confirm',
  'common.note','editor.title','library.title',
 ];
 for(const language of HEAR3_LANGUAGE_CHOICES)
  for(const key of core){
   const value=translateHear3Ui(key,language);
   assert.equal(typeof value,'string',language+' '+key);
   assert.ok(value.trim().length>=2,language+' '+key);
  }
});
test('language preference uses explicit value, then browser; unknown resolves to Spanish',()=>{
 assert.equal(resolveHear3Language({browser:'en-US'}),'en');
 assert.equal(resolveHear3Language({browser:'pt-BR'}),'pt');
 assert.equal(resolveHear3Language({browser:'zh-CN'}),'zh');
 assert.equal(resolveHear3Language({stored:'ja',browser:'en-US'}),'ja');
 assert.equal(resolveHear3Language({stored:'unsupported',browser:'de-DE'}),'de');
 assert.equal(resolveHear3Language({browser:'ko-KR'}),'es');
 assert.equal(resolveHear3Language({browser:null}),'es');
 assert.equal(translateHear3Ui('nav.home','zz'),'Inicio');
 assert.equal(translateHear3Ui('not-a-key','en'),null);
});
test('translations preserve heard and not-heard as distinct affirmative/negative answers',()=>{
 for(const language of HEAR3_LANGUAGE_CHOICES){
  assert.notEqual(translateHear3Ui('console.heard',language),
   translateHear3Ui('console.not',language));
  assert.notEqual(translateHear3Ui('choice.first',language),
   translateHear3Ui('choice.second',language));
 }
});
