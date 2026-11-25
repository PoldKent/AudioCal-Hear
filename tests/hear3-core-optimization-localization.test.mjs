import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEAR3_LANGUAGE_CHOICES,translateHear3Ui} from '../src/hear3/app-i18n.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const keys='deviceHeadphones deviceSpeaker deviceCar deviceApplication deviceInterface bands5 bands7 bands10 bands31 bandsCustom themeLabel themeSystem themeLight themeDark sweepDigital levelExplainer downloadCsv downloadPng toneReview'.split(' ');
const aria='ariaHome ariaSweep ariaBands ariaTone ariaEqGraph ariaEqRows'.split(' ');
const messages='sweepInterrupted offlineUnsupported offlineAvailable offlineSaving offlineRemoving offlineReady offlineRemoved offlineRemovalPartial eqMaintain eqBoost eqCut eqCutExplore eqSummary sweepHeard sweepNotHeard sweepLoud sweepStopped resumeHint lowVolumeRequired routeChanged correctionNotice copied saved alreadySaved saveConsent saveNotVerified'.split(' ');
test('focused experience has native localized controls, accessible names, feedback and EQ summaries',()=>{
 const home=read('index.html');
 assert.equal(home,read('src/hear3-entry.html'));
 for(const key of keys)assert.ok(home.includes('data-hear-i18n="focus.ui.'+key+'"'),key);
 for(const key of aria)assert.ok(home.includes('data-hear-i18n-aria-label="focus.ui.'+key+'"'),key);
 for(const lang of HEAR3_LANGUAGE_CHOICES)
  for(const [prefix,list] of [['focus.ui.',keys],['focus.ui.',aria],['focus.m.',messages]])
   for(const key of list)assert.ok(translateHear3Ui(prefix+key,lang)?.trim(),lang+' '+key);
 for(const lang of HEAR3_LANGUAGE_CHOICES.filter(x=>x!=='es'))
  assert.notEqual(translateHear3Ui('focus.m.lowVolumeRequired',lang),
   translateHear3Ui('focus.m.lowVolumeRequired','es'));
});
test('idle repaint is throttled without slowing tone updates or changing audio limits',()=>{
 const source=read('src/hear3/focus-experience.mjs');
 assert.ok(source.includes('idleTicks>=5'));
 assert.ok(source.includes("view==='sweep'||view==='tones'"));
 assert.ok(source.includes('},250);'));
 assert.ok(source.includes('renderEqText();'));
 assert.ok(source.includes('onLanguageChange'));
 assert.ok(source.includes('revokeObjectURL(url),30000'));
 assert.ok(source.includes('minDbfs:-80,maxDbfs:-42'));
});
