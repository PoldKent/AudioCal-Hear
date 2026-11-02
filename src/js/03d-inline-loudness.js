
// An inline loudness comparison lives on the same adaptive-test screen.
// It is optional, one observation per frequency/ear, and never an EQ gain.
const INLINE_LOUDNESS_VERSION='inline-relative-match-v1';
let inlineLoudnessId='',inlineLoudnessOffsetDb=0,inlineLoudnessListened=new Set(),inlineLoudnessMessage='';
function inlineLoudnessEntry(p){
 if(!p||page!=='test'||introStep!==3)return null;
 const e=plan(p)[firstMissing(p)];
 if(!e||e.pass!==0||e.f<100||e.f>10000||Math.abs(Math.log2(e.f/1000))<=.08)return null;
 return e;
}
function inlineLoudnessEnsure(entry){
 const id=entry?key(entry.f,entry.side):'';
 if(id!==inlineLoudnessId){inlineLoudnessId=id;inlineLoudnessOffsetDb=0;inlineLoudnessListened=new Set();inlineLoudnessMessage=''}
}
function inlineLoudnessMarkup(p){
 const entry=inlineLoudnessEntry(p);if(!entry)return '';
 inlineLoudnessEnsure(entry);
 const id=key(entry.f,entry.side),saved=p.loudnessInline?.[id];
 const side=entry.side==='left'?'oído izquierdo':entry.side==='right'?'oído derecho':'ambos canales';
 return '<details class="unobtrusive inline-loudness" id="inlineLoudness">'+
  '<summary>Comparar sonoridad de '+fmt(entry.f)+' · opcional en esta misma pasada</summary>'+
  '<div class="inner-detail" id="inlineLoudnessInner">'+
  '<p class="small">Escucha 1 kHz y luego '+fmt(entry.f)+' en el '+side+'. Ajusta únicamente el nivel digital de la segunda señal hasta percibir intensidad semejante; mantén fijo el volumen físico. Puedes omitir esta comparación sin repetir el examen.</p>'+
  '<p class="small"><strong>Señal comparada: '+(inlineLoudnessOffsetDb>=0?'+':'')+inlineLoudnessOffsetDb+' dBFS</strong> respecto de la referencia a −48 dBFS. Límites: ±6 dBFS, sin buscar sonidos inaudibles.</p>'+
  '<div class="row wrap">'+
   '<button class="btn btn-ghost grow" type="button" data-inline-loudness="minus">−1 dBFS</button>'+
   '<button class="btn btn-ghost grow" type="button" data-inline-loudness="plus">+1 dBFS</button></div>'+
  '<div class="row wrap">'+
   '<button class="btn btn-alt grow" type="button" data-inline-loudness="reference">▶ 1 kHz</button>'+
   '<button class="btn btn-alt grow" type="button" data-inline-loudness="target">▶ '+fmt(entry.f)+'</button></div>'+
  '<div class="row wrap"><button class="btn btn-primary grow" type="button" data-inline-loudness="record">Guardar comparación</button>'+
   '<button class="btn btn-ghost grow" type="button" data-inline-loudness="stop">■ Detener</button></div>'+
  '<p class="tiny muted" id="inlineLoudnessStatus" role="status">'+esc(inlineLoudnessMessage||(saved?'Comparación anterior guardada: '+(saved.offsetDb>=0?'+':'')+saved.offsetDb+' dBFS; puedes continuar el test.':'Primero escucha ambas señales. Esta observación no modifica el EQ.'))+'</p>'+
  '</div></details>';
}
function inlineLoudnessRefresh(){
 const panel=$('#inlineLoudnessInner'),entry=inlineLoudnessEntry(current);
 if(!panel||!entry)return;
 const temporary=document.createElement('div');temporary.innerHTML=inlineLoudnessMarkup(current);
 const inner=temporary.querySelector('#inlineLoudnessInner');
 if(inner)panel.innerHTML=inner.innerHTML;
 localize(panel);
}
function recordInlineLoudness(){
 const p=current,entry=inlineLoudnessEntry(p);
 if(!p||!entry||!inlineLoudnessListened.has('reference')||!inlineLoudnessListened.has('target')){
  inlineLoudnessMessage='Escucha primero la referencia y la frecuencia evaluada. Si no puedes compararlas, omite esta parte.';
  return false;
 }
 const id=key(entry.f,entry.side);
 p.loudnessInline=p.loudnessInline&&typeof p.loudnessInline==='object'?p.loudnessInline:{};
 p.loudnessInline[id]={method:INLINE_LOUDNESS_VERSION,offsetDb:inlineLoudnessOffsetDb,
  referenceDbfs:LOUDNESS_REFERENCE_DBFS,at:Date.now()};
 inlineLoudnessMessage='Comparación guardada para '+fmt(entry.f)+' en '+(entry.side==='both'?'ambos canales':entry.side)+'. Sigue respondiendo al test auditivo; no se aplicó ninguna corrección.';
 inlineLoudnessListened=new Set();touch();return true;
}
function inlineLoudnessAction(action){
 if(!current||page!=='test'||introStep!==3)return;
 const entry=inlineLoudnessEntry(current);if(!entry)return;
 inlineLoudnessEnsure(entry);
 if(action==='stop'){stopTone();inlineLoudnessMessage='Tono detenido.';inlineLoudnessRefresh();return}
 if(action==='reference'||action==='target'){void playLoudnessSample(action,true);return}
 if(action==='plus'||action==='minus'){
  stopTone();inlineLoudnessOffsetDb=clamp(inlineLoudnessOffsetDb+(action==='plus'?1:-1),-LOUDNESS_OFFSET_LIMIT,LOUDNESS_OFFSET_LIMIT);
  inlineLoudnessListened.delete('target');
  inlineLoudnessMessage='Nuevo nivel relativo. Escucha otra vez la frecuencia evaluada.';
 }else if(action==='record'){stopTone();recordInlineLoudness()}
 inlineLoudnessRefresh();
}
