import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditHear3Repository,HEAR3_PUBLIC_PAGES} from '../tools/audit-hear3.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
test('Hear 3 public routes, modules, language labels and offline manifest are connected',()=>{
 const report=auditHear3Repository({root});
 assert.equal(report.ok,true,report.failures.join('\n'));
 assert.equal(report.stats.publicPages,HEAR3_PUBLIC_PAGES.length);
 assert.ok(report.stats.moduleFiles>=35);
 assert.ok(report.stats.moduleImports>=15);
 assert.ok(report.stats.translationKeys>=20);
 assert.ok(report.stats.offlineAssets>=50);
});
test('health auditor is read-only and detects a broken public navigation route',()=>{
 const path='index.html';
 const value=readFileSync(join(root,path),'utf8');
 // Do not alter or copy actual user data or live source. Minimal disposable
 // fixture is enough to verify that the integrity check fails closed.
 const scratch=mkdtempSync(join(tmpdir(),'hear3-health-'));
 try{
  const targets=[...HEAR3_PUBLIC_PAGES,'src/hear3-entry.html','src/hear3/app-i18n.mjs',
   'src/hear3/offline-optin.mjs','hear3-offline-sw.js','hear3-offline-manifest.json',
   'docs/hear3/release-evidence-gate.json'];
  for(const target of targets){
   const dest=join(scratch,target);
   mkdirSync(dirname(dest),{recursive:true});
   writeFileSync(dest,target===path
     ?value.replace('href="./hear3-exam/"','href="./missing-screen/"')
     :readFileSync(join(root,target),'utf8'));
  }
  // An incomplete disposable source fixture is expected to produce failures.
  const output=auditHear3Repository({root:scratch});
  assert.equal(output.ok,false);
  assert.match(output.failures.join('\n'),/broken internal link.*missing-screen/);
 }finally{rmSync(scratch,{recursive:true,force:true});}
});
