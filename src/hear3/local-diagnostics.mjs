/**
 * Hear 3.0 D-061 research pilot: local technical capability diagnosis.
 * Nothing is transmitted, stored, or uploaded automatically.
 * No hearing responses, profile names, device identifiers, raw exception
 * messages, URLs, user agent strings, IP addresses, or photographs.
 */
export const HEAR3_DIAGNOSTIC_FORMAT='hear3-local-technical-report-v1';
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const ISSUE_CODES=new Set([
 'audio-unavailable','audio-context-suspended','audio-interrupted',
 'route-unverified','offline-unavailable','offline-cache-unverified',
 'storage-blocked','storage-volatile','checkpoint-damaged',
 'unsupported-browser-capability','unknown-technical-error',
]);
const COPY=(value)=>JSON.parse(JSON.stringify(value));
function bool(value){return value===true;}
function readableFeature(fn){try{return bool(fn());}catch{return false;}}
function capabilities(env){
 const ac=env?.AudioContext??env?.webkitAudioContext;
 const proto=typeof ac==='function'?ac.prototype:null;
 return {
  secureContext:bool(env?.isSecureContext),
  audioContext:typeof ac==='function',
  audioGain:readableFeature(()=>typeof proto?.createGain==='function'),
  audioOscillator:readableFeature(()=>typeof proto?.createOscillator==='function'),
  stereoPanner:readableFeature(()=>typeof proto?.createStereoPanner==='function'),
  serviceWorker:readableFeature(()=>Boolean(env?.navigator?.serviceWorker)),
  cacheStorage:readableFeature(()=>Boolean(env?.caches)),
  localStorageApi:readableFeature(()=>Boolean(env?.localStorage)),
  sessionStorageApi:readableFeature(()=>Boolean(env?.sessionStorage)),
  clipboardWrite:readableFeature(()=>typeof env?.navigator?.clipboard?.writeText==='function'),
  fileDownload:readableFeature(()=>Boolean(env?.Blob&&env?.URL?.createObjectURL)),
 };
}
export function createHear3LocalDiagnostic({env=globalThis,now=()=>new Date().toISOString()}={}){
 check(typeof now==='function','Timestamp provider must be callable');
 const records=[];
 let lastPreview=null;
 function addIssue(code){
  check(ISSUE_CODES.has(code),'Unknown technical issue code');
  if(!records.includes(code))records.push(code);
  lastPreview=null;
 }
 function clearIssues(){
  records.length=0;lastPreview=null;
 }
 function preview({includeCapabilities=true,includeIssueCodes=true}={}){
  check(typeof includeCapabilities==='boolean'&&typeof includeIssueCodes==='boolean',
   'Diagnostic exclusions must be explicit');
  const createdAt=now();
  check(typeof createdAt==='string'&&Number.isFinite(Date.parse(createdAt)),
   'Invalid diagnostic date');
  const report={
   format:HEAR3_DIAGNOSTIC_FORMAT,
   generatedAt:createdAt,
   purpose:'User-reviewed technical troubleshooting only; no automatic transmission.',
   capabilities:includeCapabilities?capabilities(env):null,
   issueCodes:includeIssueCodes?[...records]:[],
   personalDataIncluded:false,
   soundLevelMeasured:false,
   physicalDeviceVerified:false,
   remoteTransmissionAttempted:false,
   limitations:'Feature detection is not a real audio output, SPL, safety or WCAG certification.',
  };
  lastPreview=COPY(report);
  return COPY(report);
 }
 function exportReviewed({confirmed=false}={}){
  check(confirmed===true,'Explicit approval of the current report is required');
  check(lastPreview,'Preview a report before exporting it');
  return JSON.stringify(COPY(lastPreview),null,2);
 }
 return Object.freeze({addIssue,clearIssues,preview,exportReviewed,
  supportedIssueCodes:()=>[...ISSUE_CODES]});
}
