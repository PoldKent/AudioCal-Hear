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
 for(const fragment of fragments){if(result.includes(fragment))result=result.split(fragment).join(table[fragment]);}
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
 const title=document.querySelector('title');if(title)title.textContent='AudioCal Hear v1.9.0 · '+(language==='es'?'Calibrador auditivo':({en:'Hearing and EQ assistant',fr:'Assistant auditif et EQ',pt:'Assistente auditivo e EQ',it:'Assistente uditivo ed EQ',de:'Hör- und EQ-Assistent',zh:'听觉与均衡器助手',ja:'聴覚・EQアシスタント'}[language]));
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
 car7:{name:'Automóvil · 7 bandas (tus fotos)',short:'Auto 7',bands:[64,160,400,1000,2500,6250,15625],min:-6,max:6,step:1,note:'Las frecuencias coinciden exactamente con tus fotos. El rango ±6 dB es provisional: ajústalo si tu radio admite otros límites.'},
 photo10:{name:'Auriculares · 10 bandas (tu foto)',short:'Auriculares 10',bands:[30,60,120,250,500,1000,2000,4000,8000,16000],min:-20,max:20,step:1,note:'Frecuencias exactas de la primera imagen; escala visible de −20 a +20 dB.'},
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
function normalizedProfile(p,importing=false){
 if(!p||typeof p!=='object'||Array.isArray(p)||!Array.isArray(p.bands)||p.bands.length<2||p.bands.length>31)return null;
 const bands=p.bands.map(Number);
 if(bands.some(f=>!Number.isFinite(f)||f<20||f>20000)||new Set(bands).size!==bands.length||bands.some((f,i)=>i&&f<=bands[i-1]))return null;
 const safeNumber=(v,otherwise,min,max)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?clamp(Number(v),min,max):otherwise;
 const min=safeNumber(p.min,-12,-30,-1),max=safeNumber(p.max,12,1,30);
 const testStart=safeNumber(p.testStart,-36,-84,-24),testFloor=safeNumber(p.testFloor,-84,-84,Math.min(-36,testStart-1));
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
  preset:Object.hasOwn(presets,p.preset)?p.preset:'custom',bands,min,max,step:1,
  channels:p.channels==='separate'?'separate':'both',passes:p.passes===2?2:1,
  testMode:p.testMode==='quick'?'quick':'complete',testStart,testFloor,measures,
  manual:finiteMap(p.manual,-30,30),balance:finiteMap(p.balance,-6,3),balanceProof:Object.fromEntries(bands.map(f=>[f,(Array.isArray(p.balanceProof?.[f])?p.balanceProof[f]:[]).slice(-10).filter(x=>x&&Number.isFinite(x.change)&&Math.abs(x.change)<=3).map(x=>({at:safeNumber(x.at,Date.now(),0,Date.now()+86400000),choices:Array.isArray(x.choices)?x.choices.slice(0,2).filter(q=>[-1,0,1].includes(q)):[],change:x.change,method:'music-ab-two-rounds'}))])),
  taste:{bass:safeNumber(taste.bass,0,-3,3),voices:safeNumber(taste.voices,0,-3,3),air:safeNumber(taste.air,0,-3,3)},
  formatFrom:Object.hasOwn(presets,p.formatFrom)?p.formatFrom:null,
  createdAt:safeNumber(p.createdAt,Date.now(),0,Date.now()+86400000),updatedAt:safeNumber(p.updatedAt,Date.now(),0,Date.now()+86400000)
 };
}
function readProfiles(){try{const saved=JSON.parse(localStorage.getItem(STORAGE));return Array.isArray(saved)?saved.slice(0,200).map(p=>normalizedProfile(p)).filter(Boolean):[]}catch(e){return[]}}
let profiles=readProfiles(),currentId='';try{currentId=localStorage.getItem(STATEKEY)||''}catch(e){};
let current=profiles.find(p=>p.id===currentId)||null;
// Playback dBFS is not the acoustic sound-pressure level reaching the ear.
const TEST_START_DB=-36, TEST_END_DB=-84, MAX_SAFE_DB=-24, SECONDS_PER_DB=3;
const MAX_FIRST=60, MAX_VERIFY=18, MAX_STEPS=20;
const getStart=p=>clamp(p?.testStart!=null&&Number.isFinite(Number(p.testStart))?Number(p.testStart):TEST_START_DB,TEST_END_DB,MAX_SAFE_DB);
const getFloor=p=>clamp(p?.testFloor!=null&&Number.isFinite(Number(p.testFloor))?Number(p.testFloor):TEST_END_DB,TEST_END_DB,Math.min(-36,getStart(p)-1));
const QUICK_LIMIT=6;
function testBands(p){
 const bands=p.bands.slice().sort((a,b)=>a-b);
 if(p.testMode!=='quick'||bands.length<=QUICK_LIMIT)return bands;
 const n=QUICK_LIMIT;
 const chosen=[];
 for(let i=0;i<n;i++){const idx=Math.round(i*(bands.length-1)/(n-1));if(!chosen.includes(bands[idx]))chosen.push(bands[idx]);}
 return chosen;
}
let trial=null, introStep=0, ambientStatus='', ambientBusy=false;
function newTrial(entry){
 const first=current?.measures?.[key(entry.f,entry.side)]?.[0]?.db;
 const prev=Number.isFinite(first)?clamp(first,getFloor(current)+1,getStart(current)):null;
 return {id:key(entry.f,entry.side)+'-'+entry.pass,
  level:entry.pass===1&&prev!==null?prev:getStart(current),
  phase:entry.pass===1?'verify':'coarse',heard:entry.pass===1?prev:null,
  missed:entry.pass===1&&prev!==null?prev-1:null,verifyIndex:0,done:0,
  awaiting:false,highConsent:false,history:[],lastTone:null};
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
 const high=boundaryVotes(t,t.heard),low=boundaryVotes(t,t.missed);
 return high.yes>=2&&low.no>=2&&high.yes>high.no&&low.no>low.yes;
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
   const expected=t.verifyIndex===0;
   if(heard!==expected){
     // One different perception near the boundary is normal. Recheck rather
     // than discarding the whole frequency or assigning an invented threshold.
     t.phase='recheck';t.recheckIndex=0;t.level=t.heard;return 'next';
   }
   t.verifyIndex++;
   if(t.verifyIndex>=2)return 'measured';
   t.level=t.missed;return 'next';
 }else if(t.phase==='recheck'){
   t.recheckIndex++;
   // Alternate the louder / quieter adjacent levels. Each must have a
   // reproducible majority, with at least two supporting responses.
   if(t.recheckIndex>=4&&boundaryConfirmed(t))return 'measured';
   if(t.recheckIndex>=6)return 'unconfirmed';
   t.level=t.recheckIndex%2===0?t.heard:t.missed;
   return 'next';
 }
 if(t.heard!==null&&t.missed!==null){
   if(t.heard-t.missed<=1){t.phase='verify';t.level=t.heard;t.verifyIndex=0;return 'next';}
   t.level=Math.round((t.heard+t.missed)/2);return 'next';
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
let temp={name:'',type:'car',preset:'car7',channels:'both',passes:1,testMode:'quick',testStart:TEST_START_DB,testFloor:TEST_END_DB,bands:presets.car7.bands.slice(),min:-6,max:6,step:1};
const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(profiles));localStorage.setItem(STATEKEY,current?.id||'')}catch(e){notice='No se pudo guardar localmente. Puedes exportar tus valores.'}};
const touch=()=>{if(!current)return;current.updatedAt=Date.now();save()};
const nav=p=>{if(tone)stopTone();floorReached=false;if(page==='results'&&playerAudio&&p!=='results')playerAudio.pause();page=p;render();window.scrollTo({top:0,behavior:'instant'})};
const button=(text,action,cls='btn-ghost',extra='')=>`<button type="button" data-act="${action}" class="btn ${cls}" ${extra}>${text}</button>`;
function setPreset(id){temp.preset=id;temp.bands=(presets[id]||presets.custom).bands.slice();temp.min=presets[id].min;temp.max=presets[id].max;temp.step=presets[id].step;render()}
function render(){if(page==='results'&&playerAudio&&playerAudio!==$('#audioPlayer')){try{playerAudio.pause()}catch(e){}}document.querySelectorAll('[data-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.nav===page);b.setAttribute('aria-current',b.dataset.nav===page?'page':'false')});
 el.dataset.page=page;
 el.innerHTML=page==='setup'?renderSetup():page==='test'?renderTest():page==='results'?renderResults():renderProfiles();
 if(page==='test'&&tone?.mode==='test')startVisualizer();if(page==='results'&&current){const newPlayer=$('#audioPlayer');if(playerAudio!==newPlayer){try{playerAudio?.pause()}catch(e){}try{playerSource?.disconnect()}catch(e){}filters.forEach(f=>{try{f.disconnect()}catch(e){}});try{playerPreamp?.disconnect()}catch(e){}try{playerOutput?.disconnect()}catch(e){}playerPreamp=null;playerOutput=null;playerSource=null;filters=[];playerAudio=newPlayer;if(playerUrl)playerAudio.src=playerUrl;attachPlayerEvents(playerAudio)}updatePlayerFilters()}
 localize(document.body);
}
function approxTimeRange(d){return '~'+Math.max(1,Math.floor(d.exampleLow/60))+'–'+Math.max(1,Math.ceil(d.exampleHigh/60))+' min'}