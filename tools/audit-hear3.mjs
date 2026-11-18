/**
 * Read-only repository integrity audit for the single Hear 3 application.
 * No network, Web Audio, browser storage or generated artifacts are touched.
 * This complements (but never replaces) the existing CI and real-device QA.
 */
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const HEAR3_PUBLIC_PAGES=Object.freeze([
 'index.html','hear3-exam/index.html','hear3-eq-editor/index.html',
 'hear3-library/index.html','hear3-dual-restore/index.html',
 'hear3-privacy/index.html','hear3-diagnostics/index.html',
 'hear3-photo-privacy/index.html',
]);
const DEFAULT_ROOT=fileURLToPath(new URL('../',import.meta.url));
const LANGUAGES=Object.freeze(['es','en','fr','pt','it','de','zh','ja']);
const text=(root,path)=>readFileSync(resolve(root,path),'utf8');
const safeRelative=(root,file)=>{
 const rel=relative(root,file);
 return rel!==''&&!rel.startsWith('..'+sep)&&rel!=='..'&&!rel.startsWith(sep);
};
function modulesUnder(root,dir='src/hear3'){
 const target=resolve(root,dir);
 if(!existsSync(target))return [];
 const modules=[];
 for(const entry of readdirSync(target,{withFileTypes:true})){
  const path=join(target,entry.name);
  if(entry.isDirectory())modules.push(...modulesUnder(root,relative(root,path)));
  else if(entry.isFile()&&entry.name.endsWith('.mjs'))modules.push(path);
 }
 return modules;
}
export function auditHear3Repository({root=DEFAULT_ROOT}={}){
 const failures=[],stats={publicPages:0,moduleFiles:0,moduleImports:0,
  internalLinks:0,staticAssets:0,translationKeys:0,offlineAssets:0};
 const fail=message=>failures.push(message);
 const found=path=>existsSync(resolve(root,path));
 const home='index.html',source='src/hear3-entry.html';
 for(const path of [...HEAR3_PUBLIC_PAGES,source,'src/hear3/app-i18n.mjs',
  'src/hear3/offline-optin.mjs','hear3-offline-sw.js',
  'hear3-offline-manifest.json','docs/hear3/release-evidence-gate.json']){
  if(!found(path))fail('Required Hear 3 asset missing: '+path);
 }
 if(failures.length)return {ok:false,stats,failures};
 if(text(root,home)!==text(root,source))
  fail('Public homepage differs from the build source (src/hear3-entry.html)');
 const i18n=text(root,'src/hear3/app-i18n.mjs');
 const languageKeys=new Set();
 const publicBase='https://hear.local.invalid/';
 for(const page of HEAR3_PUBLIC_PAGES){
  if(!found(page))continue;
  stats.publicPages++;
  const html=text(root,page);
  const base=new URL(page==='index.html'?'/':'/'+page.replace(/index\.html$/,''),publicBase);
  // Intentionally inspect only static DOM navigation/resources, not generated
  // script strings or external links, which are validated by browser tests.
  for(const match of html.matchAll(/\bhref\s*=\s*["']([^"'<>]+)["']/g)){
   const href=match[1];
   if(href.startsWith('#')||/^(https?:|mailto:|tel:|data:)/i.test(href))continue;
   let url;
   try{url=new URL(href,base);}catch{fail(page+': malformed href '+href);continue;}
   if(url.origin!==base.origin){fail(page+': unexpected link origin '+href);continue;}
   let target=decodeURIComponent(url.pathname).replace(/^\//,'');
   if(!target||target.endsWith('/'))target+='index.html';
   if(!found(target))fail(page+': broken internal link '+href+' -> '+target);
   stats.internalLinks++;
  }
  // Local scripts and shared CSS must resolve exactly, including when the
  // application is hosted under its GitHub Pages repository subdirectory.
  for(const match of html.matchAll(/<(script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"'<>]+)["'][^>]*>/g)){
   const resource=match[2];
   if(!/\.(?:mjs|js|css)(?:[?#]|$)/i.test(resource)||/^(https?:|data:)/i.test(resource))continue;
   const target=new URL(resource,base);
   let file=decodeURIComponent(target.pathname).replace(/^\//,'');
   if(!found(file))fail(page+': missing static asset '+resource+' -> '+file);
   stats.staticAssets++;
  }
  for(const [,key] of html.matchAll(/data-hear-i18n=["']([^"']+)["']/g))
   languageKeys.add(key);
  if(/\b(?:localStorage|sessionStorage)\s*\.\s*clear\s*\(/.test(html))
   fail(page+': dangerous blanket browser storage clear');
 }
 const modules=modulesUnder(root);
 if(!modules.length)fail('No Hear 3 source modules found');
 for(const module of modules){
  stats.moduleFiles++;
  const content=readFileSync(module,'utf8');
  const rel=relative(root,module);
  // This catches standard ESM imports, side-effect imports, and re-exports.
  for(const match of content.matchAll(/\bfrom\s*["'](\.[^"']+)["']|\bimport\s*["'](\.[^"']+)["']/g)){
   const sourcePath=match[1]??match[2];
   const file=resolve(dirname(module),sourcePath);
   if(!safeRelative(root,file)||!existsSync(file))
    fail(rel+': missing or out-of-repo ESM dependency '+sourcePath);
   stats.moduleImports++;
  }
  if(/\b(?:localStorage|sessionStorage)\s*\.\s*clear\s*\(/.test(content))
   fail(rel+': dangerous blanket browser storage clear');
 }
 for(const key of languageKeys){
  const needle=JSON.stringify(key)+':';
  const occurrences=i18n.split(needle).length-1;
  if(occurrences!==LANGUAGES.length)
   fail('Localized UI key '+key+' occurs '+occurrences+' times, expected '+LANGUAGES.length);
  stats.translationKeys++;
 }
 const manifest=JSON.parse(text(root,'hear3-offline-manifest.json'));
 if(manifest.format!=='hear3-offline-static-manifest-v1'||!Array.isArray(manifest.paths))
  fail('Offline static manifest format invalid');
 else{
  const visited=new Set();
  for(const resource of manifest.paths){
   if(typeof resource!=='string'||resource.startsWith('/')||
    resource.split('/').includes('..')||visited.has(resource)){
    fail('Unsafe/duplicated offline path '+resource);continue;
   }
   visited.add(resource);
   const asset=resource.endsWith('/')?resource+'index.html':resource;
   if(!found(asset))fail('Offline manifest asset missing: '+asset);
   stats.offlineAssets++;
  }
 }
 const client=text(root,'src/hear3/offline-optin.mjs');
 const worker=text(root,'hear3-offline-sw.js');
 const clientVersion=client.match(/audiocal-hear3-prototype-static-v(\d+)/)?.[1];
 const workerVersion=worker.match(/CACHE_NAME\s*=\s*CACHE_PREFIX\s*\+\s*'v(\d+)'/)?.[1];
 if(!clientVersion||clientVersion!==workerVersion)
  fail('Offline cache version mismatch: client '+clientVersion+', worker '+workerVersion);
 const gate=JSON.parse(text(root,'docs/hear3/release-evidence-gate.json'));
 if(gate.stableReleaseClaim!==false)
  fail('Stable acoustic release gate must remain false without physical evidence');
 return {ok:failures.length===0,stats,failures};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=auditHear3Repository();
 for(const [name,count] of Object.entries(result.stats))console.log(name+': '+count);
 if(!result.ok){
  for(const problem of result.failures)console.error('AUDIT FAIL: '+problem);
  process.exitCode=1;
 }else console.log('Hear 3 repository static health audit: PASS (not a physical acoustic validation).');
}
