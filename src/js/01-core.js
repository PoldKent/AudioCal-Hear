(()=>{'use strict';

// v1.6: Offline localization. Spanish is the source locale; translations are embedded.
const TEXTS=JSON.parse(document.getElementById('audiocal-translations').textContent);
const LOCALES=['es','en','fr','pt','it','de','zh','ja'], LANGUAGE_KEY='audiocal-language-v1';
const FRAGMENTS=Object.fromEntries(Object.entries(TEXTS).map(([code,m])=>[code,Object.keys(m).filter(k=>k.length>=9&&k.length<350).sort((a,b)=>b.length-a.length)]));
let language='es';
try{const saved=localStorage.getItem(LANGUAGE_KEY),browser=(navigator.languages?.[0]||navigator.language||'es').toLowerCase().split('-')[0];language=LOCALES.includes(saved)?saved:LOCALES.includes(browser)?browser:'es'}catch(e){}
const nodeSources=new WeakMap(),attrSources=new WeakMap();
function trans(input){
 const s=String(input??'');if(language==='es')return s;
 const table=TEXTS[language];if(!table)return s;
 const trim=s.trim();if(!trim)return s;
 const exact=Object.hasOwn(table,trim)?table[trim]:undefined;if(exact!==undefined)return s.slice(0,s.indexOf(trim))+exact+s.slice(s.indexOf(trim)+trim.length);
 // Match moving numbers without translating or reordering the user's data.
 let result=s;
 // First translate complete known phrases (before individual words).
 const fragments=FRAGMENTS[language];
 const isLetter=c=>Boolean(c)&&/\p{L}/u.test(c);
 for(const fragment of fragments){
  if(!result.includes(fragment))continue;
  const leftIsLetter=/^\p{L}/u.test(fragment),rightIsLetter=/\p{L}$/u.test(fragment);
  result=result.replaceAll(fragment,(matched,pos,full)=>
   (leftIsLetter&&isLetter(full[pos-1]))||(rightIsLetter&&isLetter(full[pos+fragment.length]))
    ?matched:table[fragment]);
 }
 const tokens=['pruebas pendientes','prueba pendiente','frecuencias sin umbral','ambos canales juntos','según tus respuestas','seleccionado','pendientes','bandas','frecuencias','pruebas','prueba','pasadas','pasada','muestras','cambios','completado','frecuencia','Repetición','AMBOS CANALES','Mi equipo','Auto 7','Auriculares 10','Estándar 7','Opciones para'];
 for(const sp of tokens){const value=table[sp];if(!value)continue;
  const regex=new RegExp('(?<![\\p{L}])'+sp+'(?![\\p{L}])','giu');
  result=result.replace(regex,value);
 }
 // Render time ranges naturally, rather than retaining Spanish linking words.
 const link={en:'to',fr:'à',pt:'a',it:'a',de:'bis',zh:'至',ja:'～'}[language];
 result=result.replace(/(\d+\s*(?:min|s))\s+a\s+(?=\d)/g,(_,n)=>n+' '+link+' ');
 return result;
}
function localize(root=document.body){
 document.documentElement.lang=language==='zh'?'zh-CN':language;
 const title=document.querySelector('title');if(title)title.textContent='AudioCal Hear v1.9.1 · '+(language==='es'?'Calibrador auditivo':({en:'Hearing and EQ assistant',fr:'Assistant auditif et EQ',pt:'Assistente auditivo e EQ',it:'Assistente uditivo ed EQ',de:'Hör- und EQ-Assistent',zh:'听觉与均衡器助手',ja:'聴覚・EQアシスタント'}[language]));
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
 while((n=walker.nextNode())){
  if(n.parentElement?.closest('script,style,#audiocal-translations,.profile-title,.profile-row-body strong,#resultProfileSelect option,[data-profile-name]'))continue;
  if(!n.nodeValue.trim())continue;
  let state=nodeSources.get(n);
  if(!state||n.nodeValue!==state.rendered)state={source:n.nodeValue,rendered:n.nodeValue};
  const next=trans(state.source);if(n.nodeValue!==next)n.nodeValue=next;
  state.rendered=next;nodeSources.set(n,state);
 }
 for(const elem of root.querySelectorAll('[placeholder],[aria-label],[title]')){
  if(elem.closest('#resultProfileSelect,[data-profile-name]'))continue;
  let state=attrSources.get(elem)||{};
  for(const a of ['placeholder','aria-label','title']){
   const value=elem.getAttribute(a);if(value===null)continue;
   if(!state[a]||value!==state[a].rendered)state[a]={source:value,rendered:value};
   const next=trans(state[a].source);
   if(value!==next)elem.setAttribute(a,next);
   state[a].rendered=next;
  }
  attrSources.set(elem,state);
 }
 const select=document.getElementById('uiLanguage');if(select&&select.value!==language)select.value=language;
}
function uiAlert(s){return window.alert(trans(s))}
function uiConfirm(s){return window.confirm(trans(s))}
function uiPrompt(s,v){return window.prompt(trans(s),v)}

const presets={
 car7:{name:'Automóvil · 7 bandas (tus fotos)',short:'Auto 7',bands:[64,160,400,1000,2500,6250,15625],min:-6,max:6,controlMin:-6,controlMax:6,step:1,note:'Las frecuencias coinciden con tus fotos. El control tiene −6 a +6 posiciones. Para este equipo de referencia se declararon 3 dB por paso según manual; comprueba la equivalencia si usas otro modelo.'},
 photo10:{name:'Auriculares · 10 bandas (tu foto)',short:'Auriculares 10',bands:[30,60,120,250,500,1000,2000,4000,8000,16000],min:-20,max:20,step:1,note:'Frecuencias exactas de la primera imagen; escala visible de −20 a +20 niveles. Comprueba si el fabricante expresa esos niveles en dB.'},
 iso10:{name:'ISO · 10 bandas (octavas)',short:'ISO 10',bands:[31.5,63,125,250,500,1000,2000,4000,8000,16000],min:-12,max:12,step:1,note:'Frecuencias preferidas ISO/ANSI para intervalos de una octava.'},
 iso7:{name:'Habitual · 7 bandas',short:'Estándar 7',bands:[63,160,400,1000,2500,6300,16000],min:-12,max:12,step:1,note:'Distribución frecuente de siete bandas; no todos los aparatos de 7 bandas son iguales.'},
 five:{name:'Habitual · 5 bandas',short:'5 bandas',bands:[60,250,1000,4000,16000],min:-12,max:12,step:1,note:'Configuración común de cinco bandas. Comprueba las etiquetas de tu equipo.'},
 iso15:{name:'ISO · 15 bandas',short:'ISO 15',bands:[25,40,63,100,160,250,400,630,1000,1600,2500,4000,6300,10000,16000],min:-12,max:12,step:1,note:'15 bandas en tercios aproximados de octava alternos.'},
 iso31:{name:'ISO · 31 bandas (tercio de octava)',short:'ISO 31',bands:[20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000],min:-12,max:12,step:1,note:'31 bandas profesionales en tercios de octava. El examen completo es más largo.'},
 custom:{name:'Personalizado · frecuencias propias',short:'Personalizado',bands:[63,160,400,1000,2500,6300,16000],min:-12,max:12,step:1,note:'Escribe las frecuencias que aparecen en tu ecualizador.'}
};
const el=document.getElementById('root');const STORAGE='audiocal-hear-profiles-v1';const STATEKEY='audiocal-hear-active-v1';
const $=s=>document.querySelector(s);const fmt=f=>f>=1000?(Number((f/1000).toFixed(3))+' kHz'):(f+' Hz');
const short=f=>f>=1000?Number((f/1000).toFixed(3))+'k':String(f);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const roundTo=(x,s)=>Math.round(x/s)*s;
const median=a=>{const b=a.slice().sort((x,y)=>x-y);return b.length?b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2:null};
// Only read bounded, well-formed profile data. Backups can contain arbitrary JSON.

/* v2 model: listening conditions are metadata, never invented acoustic corrections. */
function defaultCalibrationContext(type){
 return {provenance:'captured',eqScale:'unknown',eqStepDb:'unknown',seat:'driver',windows:'closed',engine:'off',
  connection:'bluetooth',subtype:'overear',anc:'unknown',seal:'unknown',
  room:'living',position:'main',placement:'unknown'};
}
// Only this photographed car preset receives its documented, editable step scale.
function presetCalibrationContext(type,preset){
 const c=defaultCalibrationContext(type);
 if(type==='car'&&preset==='car7'){c.eqScale='steps';c.eqStepDb='3'}
 return c;
}
function normalizeCalibrationContext(raw,type){
 const data=defaultCalibrationContext(type);
 if(!raw||typeof raw!=='object'||Array.isArray(raw)){data.provenance='legacy';return data}
 const options={
  eqScale:['unknown','steps','db'],eqStepDb:['unknown','1','2','3'],seat:['driver','passenger','rear'],windows:['closed','open'],
  engine:['off','on'],connection:['bluetooth','cable','other'],subtype:['overear','inear','onear'],
  anc:['unknown','on','off','none'],seal:['unknown','good','poor'],
  room:['living','desk','studio','other'],position:['main','near','far'],
  placement:['unknown','nearwall','free']
 };
 for(const [field,valid] of Object.entries(options)){
  if(typeof raw[field]==='string'&&valid.includes(raw[field]))data[field]=raw[field];
 }
 data.provenance=raw.provenance==='legacy'?'legacy':'captured';
 return data;
}
function calibrationContextLabel(p){
 const c=normalizeCalibrationContext(p?.context,p?.type);
 if(c.provenance==='legacy')return 'Perfil antiguo: entorno no registrado';
 if(p.type==='car')return 'Auto · '+({driver:'conductor',passenger:'copiloto',rear:'asiento trasero'}[c.seat])+
  ' · ventanas '+(c.windows==='closed'?'cerradas':'abiertas')+
  ' · motor '+(c.engine==='off'?'apagado':'encendido')+
  ' · '+({bluetooth:'Bluetooth',cable:'cable',other:'otra fuente'}[c.connection]);
 if(p.type==='headphones')return ({inear:'In-ear',overear:'Over-ear',onear:'On-ear'}[c.subtype])+
  ' · ANC '+({on:'activo',off:'apagado',none:'no disponible',unknown:'sin verificar'}[c.anc])+
  ' · ajuste '+({good:'comprobado',poor:'deficiente',unknown:'sin verificar'}[c.seal])+
  ' · '+({bluetooth:'Bluetooth',cable:'cable',other:'otra fuente'}[c.connection]);
 return 'Parlantes · '+({living:'sala',desk:'escritorio',studio:'estudio',other:'otro lugar'}[c.room])+
  ' · escucha '+({main:'principal',near:'cercana',far:'lejana'}[c.position])+
  ' · colocación '+({nearwall:'cerca de pared',free:'despejada',unknown:'sin verificar'}[c.placement]);
}
// Listening conditions constrain interpretation; they are not acoustic measurements.
function contextAutoBlockReason(p,f,c=normalizeCalibrationContext(p?.context,p?.type)){
 if(p.type==='car'&&(c.windows==='open'||c.engine==='on'))
  return 'ruido variable del vehículo; no corregir automáticamente';
 if(p.type==='headphones'&&c.subtype==='inear'&&c.seal!=='good'&&f<250)
  return 'sellado in-ear no verificado; no compensar graves';
 return null;
}
function calibrationContextEqExplanation(p){
 const c=normalizeCalibrationContext(p?.context,p?.type);
 if(c.provenance==='legacy')return 'Entorno no registrado: no se aplican compensaciones ambientales.';
 const blocked=(p.bands||[]).filter(f=>contextAutoBlockReason(p,f,c));
 if(p.type==='car'&&blocked.length)
  return 'Efecto real: ventanas abiertas o motor encendido bloquean correcciones automáticas. No se asignan dB a resonancias de cabina.';
 if(p.type==='headphones'&&blocked.length)
  return 'Efecto real: sellado in-ear sin verificar bloquea correcciones automáticas bajo 250 Hz. ANC y conexión no añaden dB.';
 if(p.type==='speaker')
  return 'Efecto real: sala, distancia y paredes documentan dónde se probó. No añaden ni restan dB. El contraste del test sigue siendo experimental; para corregir la sala hace falta medición acústica.';
 return 'Efecto real: condiciones registradas para repetir y comparar. No añaden ni restan ganancias ambientales en dB.';
}
function calibrationContextCaution(p){
 const c=normalizeCalibrationContext(p?.context,p?.type);
 if(c.provenance==='legacy')return 'No hay condiciones históricas verificadas. Los resultados se conservan; conviene repetir la prueba si cambias de equipo o entorno.';
 if(p.type==='car'&&(c.windows==='open'||c.engine==='on'))return 'El ruido y la posición dentro del auto pueden afectar la detección de tonos; no se compensa automáticamente ninguna resonancia de cabina.';
 if(p.type==='headphones'&&c.subtype==='inear'&&c.seal!=='good')return 'En in-ear, un sellado no comprobado puede reducir mucho los graves; comprueba la colocación antes de confiar en una compensación.';
 if(p.type==='speaker')return 'La sala y las paredes alteran la respuesta en el punto de escucha. Este test perceptivo no sustituye una medición acústica con micrófono.';
 return 'Contexto registrado para comparar pruebas. No se aplican ganancias ambientales sin medición adicional.';
}


// Optional suprathreshold evidence. It is not an acoustic calibration nor
// an input to automatic EQ, which requires an independently validated mapping.
const LOUDNESS_REFERENCE_DBFS=-48, LOUDNESS_OFFSET_LIMIT=6;
function normalizeLoudness(raw,bands){
 const saved=Object.create(null);
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return saved;
 for(const f of bands){
  const list=raw[f];
  if(!Array.isArray(list))continue;
  const samples=list.slice(0,2).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&
   Number.isInteger(x.offsetDb)&&Math.abs(x.offsetDb)<=LOUDNESS_OFFSET_LIMIT&&
   x.referenceDbfs===LOUDNESS_REFERENCE_DBFS&&x.method==='relative-tone-match-v1')
   .map(x=>({offsetDb:x.offsetDb,referenceDbfs:LOUDNESS_REFERENCE_DBFS,
    method:'relative-tone-match-v1',at:Number.isFinite(x.at)?clamp(x.at,0,Date.now()+86400000):Date.now()}));
  if(samples.length)saved[f]=samples;
 }
 return saved;
}
function loudnessEvidenceStatus(samples){
 if(!Array.isArray(samples)||!samples.length)return 'Sin comparar';
 if(samples.length<2)return 'Una comparación; repetir';
 return Math.abs(samples[0].offsetDb-samples[1].offsetDb)<=2?
  'Repetible · descriptivo':'Inconsistente · no interpretar';
}

const QUICK_LIMIT=6;
function normalizedProfile(p,importing=false){
 if(!p||typeof p!=='object'||Array.isArray(p)||!Array.isArray(p.bands)||p.bands.length<2||p.bands.length>31)return null;
 const bands=p.bands.map(Number);
 if(bands.some(f=>!Number.isFinite(f)||f<20||f>20000)||new Set(bands).size!==bands.length||bands.some((f,i)=>i&&f<=bands[i-1]))return null;
 const safeNumber=(v,otherwise,min,max)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?clamp(Number(v),min,max):otherwise;
 const min=safeNumber(p.min,-12,-30,-1),max=safeNumber(p.max,12,1,30);
 // Separate physical positions from digital EQ correction bounds. Legacy presets keep their ranges.
 const controlMin=safeNumber(p.controlMin,p.preset==='car7'?-6:min,-30,-1);
 const controlMax=safeNumber(p.controlMax,p.preset==='car7'?6:max,1,30);
 const safeType=['car','speaker'].includes(p.type)?p.type:'headphones';
 // Normalization runs while profiles are loaded, before the playback constants initialize.
 const testStart=safeNumber(p.testStart,-36,-99,safeType==='headphones'?-24:0),
  testFloor=safeNumber(p.testFloor,-100,-100,Math.min(-36,testStart-1));
 const id=importing?'p'+Date.now()+Math.random().toString(36).slice(2,8):String(p.id||'').slice(0,100);
 if(!id)return null;
 const measures=Object.create(null),raw=p.measures&&typeof p.measures==='object'&&!Array.isArray(p.measures)?p.measures:{};
 let scanned=0;
 for(const [k,a] of Object.entries(raw)){
  if(++scanned>120)break;
  const bits=/^(\d+(?:\.\d+)?)\|(both|left|right)$/.exec(k);
  if(!bits||!Array.isArray(a)||a.length>3)continue;
  const freq=Number(bits[1]);if(!Number.isFinite(freq)||freq<20||freq>20000)continue;
  const checked=a.slice(0,2).map(v=>{
   if(!v||typeof v!=='object'||Array.isArray(v))return null;
   const validKind=['heard','unheard','stillheard','timeout','skipped','unconfirmed'].includes(v.kind)?v.kind:'timeout';
   const db=validKind==='heard'&&Number.isFinite(v.db)&&v.db>=-110&&v.db<=0?v.db:null;
   const history=Array.isArray(v.history)?v.history.slice(0,20).filter(x=>x&&Number.isFinite(x.db)&&x.db>=-110&&x.db<=0&&typeof x.heard==='boolean').map(x=>({db:x.db,heard:x.heard})):[];
   return {kind:validKind,db,elapsedS:safeNumber(v.elapsedS,0,0,180),lastAudibleDb:validKind==='stillheard'?safeNumber(v.lastAudibleDb,testFloor,-110,0):null,at:safeNumber(v.at,Date.now(),0,Date.now()+86400000),method:String(v.method||'imported').slice(0,40),history};
  });
  if(checked.some(Boolean))measures[k]=checked;
 }
 const finiteMap=(value,minValue,maxValue)=>{
  const output=Object.create(null);
  if(!value||typeof value!=='object'||Array.isArray(value))return output;
  for(const f of bands){const v=value[f];if(typeof v==='number'&&Number.isFinite(v))output[f]=clamp(v,minValue,maxValue)}
  return output;
 };
 const taste=p.taste&&typeof p.taste==='object'&&!Array.isArray(p.taste)?p.taste:{};
 return {
  id,name:String(p.name||'Mi equipo').slice(0,70),type:['car','headphones','speaker'].includes(p.type)?p.type:'headphones',
  preset:Object.hasOwn(presets,p.preset)?p.preset:'custom',bands,min,max,controlMin,controlMax,step:1,
  channels:p.channels==='separate'?'separate':'both',passes:p.passes===2?2:1,
  testMode:p.testMode==='quick'?'quick':'complete',testStart,testFloor,measures,
  // Freeze historical quick sampling so existing observations are never silently reassigned.
  testBandPlan:p.testMode==='quick'?(
   Array.isArray(p.testBandPlan)&&p.testBandPlan.length>0&&p.testBandPlan.length<=QUICK_LIMIT&&
   p.testBandPlan.every(f=>bands.includes(f))?
    p.testBandPlan.slice():legacyQuickBands(bands)
  ):null,
  loudness:normalizeLoudness(p.loudness,bands),
  manual:finiteMap(p.manual,-30,30),balance:finiteMap(p.balance,-6,3),balanceProof:Object.fromEntries(bands.map(f=>[f,(Array.isArray(p.balanceProof?.[f])?p.balanceProof[f]:[]).slice(-10).filter(x=>x&&Number.isFinite(x.change)&&Math.abs(x.change)<=3).map(x=>({at:safeNumber(x.at,Date.now(),0,Date.now()+86400000),choices:Array.isArray(x.choices)?x.choices.slice(0,2).filter(q=>[-1,0,1].includes(q)):[],change:x.change,method:'music-ab-two-rounds'}))])),
  taste:{bass:safeNumber(taste.bass,0,-3,3),voices:safeNumber(taste.voices,0,-3,3),air:safeNumber(taste.air,0,-3,3)},
  context:normalizeCalibrationContext(p.context,p.type),
  formatFrom:Object.hasOwn(presets,p.formatFrom)?p.formatFrom:null,
  createdAt:safeNumber(p.createdAt,Date.now(),0,Date.now()+86400000),updatedAt:safeNumber(p.updatedAt,Date.now(),0,Date.now()+86400000)
 };
}
function readProfiles(){try{const saved=JSON.parse(localStorage.getItem(STORAGE));return Array.isArray(saved)?saved.slice(0,200).map(p=>normalizedProfile(p)).filter(Boolean):[]}catch(e){return[]}}
let profiles=readProfiles(),currentId='';try{currentId=localStorage.getItem(STATEKEY)||''}catch(e){};
let current=profiles.find(p=>p.id===currentId)||null;
// Playback dBFS is not the acoustic sound-pressure level reaching the ear.
// 0 dBFS is digital full scale, not acoustic 0 dB SPL and not a target loudness.
// Speakers/cars can opt into extended digital range only with staged preflight.
// Headphones remain capped at -24 dBFS. Defaults remain conservative for all.
const DIGITAL_REFERENCE_DBFS=0, TEST_START_DB=-36, TEST_END_DB=-100, MAX_SAFE_DB=-24, SECONDS_PER_DB=3;
function maxTestStart(p){return p?.type==='car'||p?.type==='speaker'?DIGITAL_REFERENCE_DBFS:MAX_SAFE_DB;}
function needsVolumePreview(p){return !!p&&maxTestStart(p)===0&&getStart(p)>MAX_SAFE_DB;}
function volumePreviewSteps(p){
 if(!needsVolumePreview(p))return [];
 const target=getStart(p);
 return [...new Set([-36,-24,-12,-6,0,target].filter(x=>x<=target))].sort((a,b)=>a-b);
}
const MAX_FIRST=60, MAX_VERIFY=60, MAX_STEPS=20;
const getStart=p=>clamp(p?.testStart!=null&&Number.isFinite(Number(p.testStart))?Number(p.testStart):TEST_START_DB,TEST_END_DB+1,maxTestStart(p));
const getFloor=p=>clamp(p?.testFloor!=null&&Number.isFinite(Number(p.testFloor))?Number(p.testFloor):TEST_END_DB,TEST_END_DB,Math.min(-36,getStart(p)-1));
function legacyQuickBands(bands){
 const sorted=bands.slice().sort((a,b)=>a-b);
 if(sorted.length<=QUICK_LIMIT)return sorted;
 const result=[];
 for(let i=0;i<QUICK_LIMIT;i++){
  const f=sorted[Math.round(i*(sorted.length-1)/(QUICK_LIMIT-1))];
  if(!result.includes(f))result.push(f);
 }
 return result;
}
function testBands(p){
 const bands=p.bands.slice().sort((a,b)=>a-b);
 if(p.testMode!=='quick'||bands.length<=QUICK_LIMIT)return bands;
 if(Array.isArray(p.testBandPlan)&&p.testBandPlan.length<=QUICK_LIMIT&&p.testBandPlan.length>0&&p.testBandPlan.every(f=>bands.includes(f)))
  return p.testBandPlan.slice().sort((a,b)=>a-b);
 // Choose a contiguous group of nearby frequencies, rather than six widely
 // scattered tones that cannot ever pass the EQ algorithm's local-gap limits.
 let best=null,score=-Infinity;
 for(let i=0;i<=bands.length-QUICK_LIMIT;i++){
  const group=bands.slice(i,i+QUICK_LIMIT);
  const neighbors=group.slice(1,-1).filter((f,k)=>f/group[k]<=3.5&&group[k+2]/f<=3.5).length;
  const middle=Math.sqrt(group[2]*group[3]);
  const value=neighbors*100-Math.abs(Math.log2(middle/1000));
  if(value>score){score=value;best=group;}
 }
 return best;
}
function autoCoverageMinimum(p){return Math.max(4,Math.ceil(p.bands.length*.55));}
function quickAutoFeasibility(p){
 const selected=testBands(p),structural=selected.slice(1,-1).filter((f,i)=>f/selected[i]<=3.5&&selected[i+2]/f<=3.5).length;
 return {selected,structural,coverage: selected.length>=autoCoverageMinimum(p)};
}

/* Independent search provenance: historical second-pass confirmations remain
   preserved, but never count as independent threshold measurements. */
const INDEPENDENT_PASS_METHOD='adaptive-v20-independent';
function independentThresholdPair(p,f,side){
 const a=p?.measures?.[key(f,side)]||[];
 return p?.passes===2&&a.length>=2&&a[0]?.kind==='heard'&&
  Number.isFinite(a[0].db)&&a[1]?.kind==='heard'&&
  Number.isFinite(a[1].db)&&a[1].method===INDEPENDENT_PASS_METHOD;
}

let trial=null, introStep=0, ambientStatus='', ambientBusy=false;
let channelVerified={left:false,right:false},channelCheckPlayed={left:false,right:false};
let volumePreviewIndex=0,volumePreviewPlayed=false,volumeReady=false;
function resetVolumePreview(){volumePreviewIndex=0;volumePreviewPlayed=false;volumeReady=false}
function channelsReady(p){return p?.channels!=='separate'||(channelVerified.left&&channelVerified.right);}
function resetChannelCheck(){channelVerified={left:false,right:false};channelCheckPlayed={left:false,right:false};}
function newTrial(entry){
 // Both passes start without any threshold borrowed from earlier measurements.
 // The second run is a new adaptive search, not a confirmation of pass 1.
 return {id:key(entry.f,entry.side)+'-'+entry.pass,
  level:getStart(current),phase:'coarse',heard:null,missed:null,
  verifyIndex:0,done:0,awaiting:false,highConsent:false,listenedSeconds:0,
  history:[],lastTone:null};
}
// Estimate the most consistent perceptual boundary from EVERY recorded response.
// A measured digital detection threshold is not a calibrated acoustic threshold.
function trialEstimate(t){
 const history=(t.history||[]).filter(x=>x&&Number.isFinite(x.db)&&typeof x.heard==='boolean');
 const yes=history.filter(x=>x.heard).map(x=>x.db),no=history.filter(x=>!x.heard).map(x=>x.db);
 const audibleDb=yes.length?Math.min(...yes):Number.isFinite(t.heard)?t.heard:null;
 const inaudibleDb=no.length?Math.max(...no):Number.isFinite(t.missed)?t.missed:null;
 if(audibleDb===null||inaudibleDb===null)
  return {db:null,confidence:'bounded',audibleDb,inaudibleDb,uncertaintyDb:null,contradictions:0};
 // Evaluate each possible boundary. A yes above it, and no below it, is consistent.
 const low=Math.min(...yes,...no),high=Math.max(...yes,...no),middle=(audibleDb+inaudibleDb)/2;
 let best=middle,lowest=Infinity;
 for(let threshold=low-.5;threshold<=high+.5;threshold+=.5){
  const errors=history.reduce((n,x)=>n+((x.db>=threshold)!==x.heard?1:0),0);
  const penalty=errors+Math.abs(threshold-middle)*1e-5;
  if(penalty<lowest){lowest=penalty;best=threshold}
 }
 const contradictions=history.reduce((n,x)=>n+((x.db>=best)!==x.heard?1:0),0);
 const width=Math.abs(audibleDb-inaudibleDb);
 // Keep a stable midpoint for coherent brackets; use best-fit only for contradictions.
 const db=Number((contradictions?best:middle).toFixed(1));
 const confidence=contradictions||audibleDb<=inaudibleDb?'low':width<=2&&t.verifyIndex>=2?'high':'medium';
 return {db,confidence,audibleDb,inaudibleDb,uncertaintyDb:Math.max(.5,width/2),contradictions};
}
function boundaryVotes(t,level){
 let yes=0,no=0;
 for(const answer of t.history||[]){
  if(answer.db!==level)continue;
  if(answer.heard)yes++;else no++;
 }
 return {yes,no};
}
function boundaryConfirmed(t){
 const e=trialEstimate(t);
 return e.db!==null&&e.confidence==='high';
}
function nextTrialLevel(t,heard,p){
 const floor=getFloor(p);
 if(t.phase==='coarse'){
  if(heard){t.heard=t.level;if(t.level<=floor)return 'stillheard';t.level=Math.max(floor,t.level-12);return 'next';}
  t.missed=t.level;
  if(t.heard===null)return 'unheard';
  t.phase='refine';
 }else if(t.phase==='refine'){
  if(heard)t.heard=t.level;else t.missed=t.level;
 }else if(t.phase==='verify'){
  t.verifyIndex++;
  // Always finish after at most two extra listens, even with disagreement.
  if(t.verifyIndex>=2)return 'measured';
  t.level=t.missed;return 'next';
 }
 if(t.heard!==null&&t.missed!==null){
  if(t.heard-t.missed<=2){t.phase='verify';t.verifyIndex=0;t.level=t.heard;return 'next';}
  const midpoint=Math.round((t.heard+t.missed)/2);
  if(midpoint===t.level)return 'measured';
  t.level=midpoint;return 'next';
 }
 return 'unconfirmed';
}
let page='setup',audioCtx=null,tone=null,frame=null,playerAudio=null,playerSource=null,filters=[],playerPreamp=null,playerOutput=null,playerUrl=null,eqBypass=false,awaitNext=false,floorReached=false,notice='',sampleNote='';
let preferenceStage=0,preferencePreview=null,preferenceListened=new Set();
let selectedEqFreq=null;
let balanceFreq=null,balanceRound=0,balancePreview=null,balanceListened=new Set(),balanceChoices=[],balanceQueue=[],balanceQueueIndex=0,balanceStatus='';
const preferenceRounds=[{zone:'bass',title:'Graves y cuerpo',desc:'Bajos, batería y profundidad'},{zone:'voices',title:'Voces y claridad',desc:'Voces e instrumentos en primer plano'},{zone:'air',title:'Detalle y brillo',desc:'Platillos y matices agudos'}];
const cleanTaste=p=>({bass:clamp(Number(p?.taste?.bass)||0,-3,3),voices:clamp(Number(p?.taste?.voices)||0,-3,3),air:clamp(Number(p?.taste?.air)||0,-3,3)});
function tasteGain(f,t){const band=(center,width)=>Math.exp(-0.5*(Math.log2(f/center)/width)**2);return t.bass*band(105,1.35)+t.voices*band(2400,1.05)+t.air*band(7300,1.05)}
function balanceGain(p,f){return clamp(Math.round(Number(p?.balance?.[f])||0),-6,3)}
function resetBalanceRound(){balanceRound=0;balancePreview=null;balanceListened=new Set();balanceChoices=[];balanceStatus=''}
function balanceDelta(){if(!balancePreview||balanceRound>=2)return 0;return balanceRound===0?(balancePreview==='A'?-2:2):(balancePreview==='A'?1:-1)}
function suggestedBalanceBands(p){const result=recommend(p),n=p.bands.length;const priority=[Math.round((n-1)*.2),Math.round((n-1)*.52),Math.round((n-1)*.85)].map(i=>p.bands[i]);const deviations=result.slice().sort((a,b)=>(Math.abs(b.base||0)-Math.abs(a.base||0))).filter(x=>Math.abs(x.base||0)>=1.5).map(x=>x.f);return [...new Set([...deviations.slice(0,2),...priority,...p.bands])].slice(0,3)}
function resetBalanceSession(p){balanceQueue=suggestedBalanceBands(p);balanceQueueIndex=0;balanceFreq=balanceQueue[0]||p.bands[0]||null;resetBalanceRound()}
let temp={name:'',type:'car',preset:'car7',channels:'both',passes:1,testMode:'complete',testStart:TEST_START_DB,testFloor:TEST_END_DB,bands:presets.car7.bands.slice(),min:-6,max:6,controlMin:-6,controlMax:6,step:1,context:presetCalibrationContext('car','car7')};
const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(profiles));localStorage.setItem(STATEKEY,current?.id||'')}catch(e){notice='No se pudo guardar localmente. Puedes exportar tus valores.'}};
const touch=()=>{if(!current)return;current.updatedAt=Date.now();save()};
const nav=p=>{if(page==='results'&&p!=='results')resetLoudnessSession();if(tone)stopTone();floorReached=false;if(page==='results'&&playerAudio&&p!=='results')playerAudio.pause();page=p;render();window.scrollTo({top:0,behavior:'instant'})};
const button=(text,action,cls='btn-ghost',extra='')=>`<button type="button" data-act="${action}" class="btn ${cls}" ${extra}>${text}</button>`;
function setPreset(id){const preset=presets[id]||presets.custom;temp.preset=id;temp.bands=preset.bands.slice();temp.min=preset.min;temp.max=preset.max;temp.controlMin=preset.controlMin??preset.min;temp.controlMax=preset.controlMax??preset.max;temp.step=preset.step;const eq=presetCalibrationContext(temp.type,id);temp.context={...temp.context,eqScale:eq.eqScale,eqStepDb:eq.eqStepDb};render()}
function render(){if(page==='test'&&current&&firstMissing(current)<0)page='results';if(page==='results'&&playerAudio&&playerAudio!==$('#audioPlayer')){try{playerAudio.pause()}catch(e){}}document.querySelectorAll('[data-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.nav===page);b.setAttribute('aria-current',b.dataset.nav===page?'page':'false')});
 el.dataset.page=page;
 el.innerHTML=page==='setup'?renderSetup():page==='test'?renderTest():page==='results'?renderResults():renderProfiles();
 if(page==='test'&&tone?.mode==='test')startVisualizer();if(page==='results'&&current){const newPlayer=$('#audioPlayer');if(playerAudio!==newPlayer){try{playerAudio?.pause()}catch(e){}try{playerSource?.disconnect()}catch(e){}filters.forEach(f=>{try{f.disconnect()}catch(e){}});try{playerPreamp?.disconnect()}catch(e){}try{playerOutput?.disconnect()}catch(e){}playerPreamp=null;playerOutput=null;playerSource=null;filters=[];playerAudio=newPlayer;if(playerUrl)playerAudio.src=playerUrl;attachPlayerEvents(playerAudio)}updatePlayerFilters();refreshEqCard()}
 localize(document.body);
}
function approxTimeRange(d){return '~'+Math.max(1,Math.floor(d.exampleLow/60))+'–'+Math.max(1,Math.ceil(d.exampleHigh/60))+' min'}