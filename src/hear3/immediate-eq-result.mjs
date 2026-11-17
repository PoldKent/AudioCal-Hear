/**
 * AudioCal Hear — one immediate, copyable EQ after the last tone.
 * Read-only view of the verified bounded mathematical draft. Does not start
 * audio, modify hearing evidence, write browser storage, or apply hardware EQ.
 * Saved profiles are edited through the catalog's transactional EQ editor.
 */
import {HEAR3_EQ_ENGINE_FORMAT} from './bounded-eq-engine.mjs';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const signed=n=>(n>0?'+':'')+n;
const caution='Orientativo: no calibrado acústicamente, sin medición SPL ni certificación de headroom; no se aplica automáticamente.';
export function inspectHear3ImmediateEq(draft){
 check(draft?.format===HEAR3_EQ_ENGINE_FORMAT&&draft.channel==='joint'&&
  draft.autoApplyAllowed===false&&draft.validatedForProduction===false&&
  draft.headroomVerified===false&&draft.acousticCalibration==='not-established',
  'El EQ no corresponde a un resultado matemático verificable para consulta.');
 check(Number.isInteger(draft.bandCount)&&draft.bandCount>=2&&draft.bandCount<=31&&
  Array.isArray(draft.rows)&&draft.rows.length===draft.bandCount&&
  Number.isFinite(draft.capDb)&&draft.capDb>0&&draft.capDb<=3&&
  Array.isArray(draft.currentEq)&&draft.currentEq.length===draft.rows.length,
  'Distribución EQ inválida.');
 let last=0;
 const rows=draft.rows.map((r,i)=>{
  check(typeof r.bandId==='string'&&r.bandId&&
   finite(r.frequencyHz)&&r.frequencyHz>last&&r.frequencyHz<=20000&&
   finite(r.gainDb)&&Math.abs(r.gainDb)<=draft.capDb&&
   Number.isInteger(r.gainDb*2)&&
   draft.currentEq[i].bandId===r.bandId&&draft.currentEq[i].gainDb===r.gainDb,
   'Las frecuencias o ganancias del EQ no son coherentes.');
  last=r.frequencyHz;
  return Object.freeze({bandId:r.bandId,frequencyHz:r.frequencyHz,
   gainDb:r.gainDb,source:r.source,confidence:r.confidence});
 });
 return Object.freeze({rows:Object.freeze(rows),capDb:draft.capDb,
  resultStatus:draft.correctionCoverage==='neutral-only-no-valid-contrast'
   ?'No hay contraste suficiente; curva neutra.':'Valores orientativos basados en los tonos.',
  warning:caution});
}
export function formatHear3ImmediateEq(review,{format='txt'}={}){
 check(review&&Array.isArray(review.rows)&&review.rows.length>=2&&review.rows.length<=31,
  'No existe todavía una curva que copiar.');
 check(['txt','csv'].includes(format),'Formato de salida no permitido.');
 if(format==='txt')return [
  'AudioCal Hear · Mi ecualizador (no calibrado)',
  review.warning,
  ...review.rows.map(r=>r.frequencyHz+' Hz = '+signed(r.gainDb)+' dB'),
 ].join('\n')+'\n';
 return [
  'frecuencia_Hz,ganancia_dB,origen',
  ...review.rows.map(r=>[r.frequencyHz,r.gainDb,
   '"'+String(r.source??'provisional').replaceAll('"','""')+'"'].join(',')),
  '"'+review.warning.replaceAll('"','""')+'"',
 ].join('\r\n')+'\r\n';
}
export function paintHear3ImmediateEqPng(canvas,review){
 check(canvas&&typeof canvas.getContext==='function','Canvas no disponible.');
 const rows=review.rows;
 check(rows?.length>=2&&rows.length<=31,'Curva EQ inválida.');
 canvas.width=Math.max(1000,rows.length*68+160);
 canvas.height=480;
 const g=canvas.getContext('2d');
 check(g,'Canvas 2D no disponible.');
 g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);
 g.fillStyle='#122e42';g.font='bold 28px system-ui';
 g.fillText('AudioCal Hear · Mi ecualizador',30,47);
 g.font='15px system-ui';
 g.fillText('Ajustes orientativos · NO calibrados · NO aplicar automáticamente',30,78);
 const baseline=265,spacing=(canvas.width-110)/rows.length;
 g.strokeStyle='#9eb5c3';g.lineWidth=2;g.beginPath();
 g.moveTo(26,baseline);g.lineTo(canvas.width-28,baseline);g.stroke();
 for(const [i,r] of rows.entries()){
  const x=38+i*spacing,w=Math.min(spacing-9,42);
  const h=(Math.abs(r.gainDb)/review.capDb)*125;
  g.fillStyle=r.gainDb>=0?'#1888ae':'#ca8b27';
  g.fillRect(x,r.gainDb>=0?baseline-h:baseline,w,Math.max(2,h));
  g.font='12px system-ui';g.fillStyle='#122e42';
  g.fillText(String(r.frequencyHz)+' Hz',x,baseline+30);
  g.fillText(signed(r.gainDb)+' dB',x,r.gainDb>0?baseline-h-8:baseline+49);
 }
 g.font='14px system-ui';
 g.fillText('dB de ganancia de EQ, NO nivel digital dBFS ni presión sonora dB SPL.',30,420);
 g.fillText('Sin verificación de respuesta física, recorte, SPL ni headroom de dispositivo.',30,448);
 return canvas;
}
export function mountHear3ImmediateEq({root,source,getDraft,env=globalThis}){
 check(root&&source&&typeof getDraft==='function','Faltan elementos del resultado.');
 const $=id=>root.querySelector('[data-immediate-eq="'+id+'"]');
 let review=null,fingerprint=null;
 function download(content,name,mime){
  const blob=content instanceof Blob?content:new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 function render(){
  const draft=getDraft();
  const next=draft?JSON.stringify(draft.rows.map(r=>[r.frequencyHz,r.gainDb])):'';
  if(next===fingerprint)return;
  fingerprint=next;
  review=null;
  const stage=$('chart');stage.replaceChildren();
  if(!draft){
   $('status').textContent='Al finalizar el examen, aquí aparecerán los valores para cada banda.';
   for(const id of ['copy','txt','csv','png'])$(id).disabled=true;
   return;
  }
  try{review=inspectHear3ImmediateEq(draft);}
  catch(error){
   $('status').textContent=error.message;
   for(const id of ['copy','txt','csv','png'])$(id).disabled=true;
   return;
  }
  $('status').textContent=review.resultStatus+' '+review.warning;
  for(const id of ['copy','txt','csv','png'])$(id).disabled=false;
  stage.setAttribute('role','group');
  stage.setAttribute('aria-label','Ganancias por frecuencia del EQ actual');
  for(const r of review.rows){
   const cell=document.createElement('div');cell.className='app-eq-band';
   const graph=document.createElement('div');graph.className='app-eq-bar-area';
   graph.setAttribute('aria-hidden','true');
   const zero=document.createElement('div');zero.className='app-eq-zero';
   const bar=document.createElement('div');bar.className='app-eq-bar';
   const height=Math.abs(r.gainDb)/review.capDb*47;
   bar.style.height=Math.max(2,height)+'%';
   bar.style.top=(r.gainDb>=0?50-height:50)+'%';
   if(r.gainDb<0)bar.classList.add('negative');
   graph.append(zero,bar);
   const gain=document.createElement('strong');
   gain.textContent=signed(r.gainDb)+' dB';
   const freq=document.createElement('span');freq.textContent=r.frequencyHz+' Hz';
   const detail=document.createElement('small');detail.textContent=r.source==='direct-subjective-contrast'
    ?'Tono confirmado':r.estimated?'Estimado':'Sin evidencia suficiente';
   cell.append(graph,gain,freq,detail);
   stage.append(cell);
  }
 }
 const error=message=>{$('action-status').textContent=message;};
 $('copy').addEventListener('click',async()=>{
  try{
   check(review,'No hay EQ para copiar.');
   check(env.navigator?.clipboard?.writeText,'Este navegador no permite copiar. Usa TXT.');
   await env.navigator.clipboard.writeText(formatHear3ImmediateEq(review));
   error('Valores copiados. No se cambió ningún dispositivo.');
  }catch(e){error(e?.message??String(e));}
 });
 for(const format of ['txt','csv']){
  $(format).addEventListener('click',()=>{
   try{
    check(review,'Primero finaliza el examen.');
    download(formatHear3ImmediateEq(review,{format}),
     'audiocal-hear-mi-eq-orientativo.'+format,
     format==='txt'?'text/plain;charset=utf-8':'text/csv;charset=utf-8');
    error('Descarga '+format.toUpperCase()+' solicitada, sin aplicar ajustes.');
   }catch(e){error(e?.message??String(e));}
  });
 }
 $('png').addEventListener('click',()=>{
  try{
   check(review,'Primero finaliza el examen.');
   const canvas=paintHear3ImmediateEqPng(document.createElement('canvas'),review);
   canvas.toBlob(blob=>{
    if(!blob){error('No se pudo generar la imagen PNG.');return;}
    download(blob,'audiocal-hear-mi-eq-orientativo.png','image/png');
    error('Imagen PNG generada a partir de la misma curva visible.');
   },'image/png');
  }catch(e){error(e?.message??String(e));}
 });
 const observer=new MutationObserver(render);
 observer.observe(source,{childList:true});
 render();
 return Object.freeze({render,dispose:()=>observer.disconnect()});
}
