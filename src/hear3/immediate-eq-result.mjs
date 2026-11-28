/**
 * AudioCal Hear — one immediate, copyable EQ after the last tone.
 * Read-only view of the verified bounded mathematical draft. Does not start
 * audio, modify hearing evidence, write browser storage, or apply hardware EQ.
 * Saved profiles are edited through the catalog's transactional EQ editor.
 */
import {HEAR3_EQ_ENGINE_FORMAT} from './bounded-eq-engine.mjs';
import {createHear3CatalogStore} from './catalog-backup-store.mjs';
import {createHear3CatalogWriteCoordinator} from './coordinated-catalog-writer.mjs';
import {createHear3ProvisionalEqEditor} from './provisional-eq-editor.mjs';
import {planHear3ManualEqApplication} from './manual-eq-application-guide.mjs';
import {createHear3EqEditHistory} from './eq-edit-history.mjs';

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
const label=(value,fallback)=>typeof value==='string'&&value.trim()&&value.length<=300?value:fallback;
export function formatHear3ImmediateEq(review,{format='txt',title}={}){
 check(review&&Array.isArray(review.rows)&&review.rows.length>=2&&review.rows.length<=31,
  'No existe todavía una curva que copiar.');
 check(['txt','csv'].includes(format),'Formato de salida no permitido.');
 if(format==='txt')return [
  label(title,'AudioCal Hear · Mi ecualizador (no calibrado)'),
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
export function paintHear3ImmediateEqPng(canvas,review,labels={}){
 check(canvas&&typeof canvas.getContext==='function','Canvas no disponible.');
 const rows=review.rows;
 check(rows?.length>=2&&rows.length<=31,'Curva EQ inválida.');
 canvas.width=Math.max(1000,rows.length*68+160);
 canvas.height=480;
 const g=canvas.getContext('2d');
 check(g,'Canvas 2D no disponible.');
 g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);
 g.fillStyle='#122e42';g.font='bold 28px system-ui';
 g.fillText(label(labels.title,'AudioCal Hear · Mi ecualizador'),30,47);
 g.font='15px system-ui';
 g.fillText(label(labels.subtitle,'Ajustes orientativos · NO calibrados · NO aplicar automáticamente'),30,78);
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
 g.fillText(label(labels.units,'dB de ganancia de EQ, NO nivel digital dBFS ni presión sonora dB SPL.'),30,420);
 g.fillText(label(labels.verify,'Sin verificación de respuesta física, recorte, SPL ni headroom de dispositivo.'),30,448);
 return canvas;
}
export function mountHear3ImmediateEq({root,source,getDraft,categorySelector=null,env=globalThis}){
 check(root&&source&&typeof getDraft==='function','Faltan elementos del resultado.');
 const $=id=>root.querySelector('[data-immediate-eq="'+id+'"]');
 const store=createHear3CatalogStore();
 const writer=createHear3CatalogWriteCoordinator({store});
 let original=null,review=null,values=[],savedValues=[],fingerprint=null,resultId=null,busy=false;
 let history=null;
 const setText=(id,message)=>{$(id).textContent=message;};
 function download(content,name,mime){
  const blob=content instanceof Blob?content:new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 const altered=()=>values.some((v,i)=>v!==original?.rows[i]?.gainDb);
 const unsaved=()=>values.some((v,i)=>v!==savedValues[i]);
 function valid(){
  return original!==null&&values.length===original.rows.length&&values.every(v=>
   finite(v)&&Number.isInteger(v*2)&&Math.abs(v)<=original.capDb);
 }
 function updateGuide(){
  const guideNode=$('guide');
  if(!guideNode)return;
  if(!review){
   guideNode.hidden=true;
   return;
  }
  try{
   const category=categorySelector?.value??'headphones';
   const guide=planHear3ManualEqApplication({review,category});
   guideNode.hidden=false;
   setText('guide-title','Guía para '+guide.title.toLowerCase());
   const steps=$('guide-steps');
   steps.replaceChildren(...guide.steps.map(step=>{
    const li=document.createElement('li');li.textContent=step;return li;
   }));
   const values=$('guide-rows');
   values.replaceChildren(...guide.rows.map(row=>{
    const li=document.createElement('li');li.textContent=row.text;return li;
   }));
   setText('guide-warning',guide.warning);
  }catch(e){
   guideNode.hidden=true;
   setText('action-status',e?.message??String(e));
  }
 }
 function sync(){
  review=valid()?Object.freeze({...original,rows:Object.freeze(
   original.rows.map((r,i)=>Object.freeze({...r,gainDb:values[i]}))
  )}):null;
  const canExport=Boolean(review);
  for(const id of ['copy','txt','csv','png'])$(id).disabled=!canExport;
  $('restore').disabled=busy||!original||(!altered()&&valid());
  const dirtyDraft=history&&values.some((v,i)=>v!==history.current()[i]);
  $('undo').disabled=busy||!history||!(dirtyDraft||history.canUndo());
  $('redo').disabled=busy||!history||!!dirtyDraft||!history.canRedo();
  $('save').disabled=busy||!review||!resultId||!unsaved();
  updateGuide();
  if(!valid()&&original)setText('action-status',
   'Hay una ganancia inválida. Utiliza pasos de 0,5 dB dentro del límite.');
  else if(review)setText('action-status',
   altered()?'Cambios manuales en esta curva. Puedes copiar o descargar los valores visibles.':
    'Curva original lista para copiar o descargar. No modifica automáticamente tu equipo.');
 }
 function setBar(fill,v){
  const height=Math.abs(v)/original.capDb*47;
  fill.style.height=Math.max(2,height)+'%';
  fill.style.top=(v>=0?50-height:50)+'%';
  fill.classList.toggle('negative',v<0);
 }
 function showRows(){
  const stage=$('chart');stage.replaceChildren();
  if(!original){stage.removeAttribute('role');return;}
  stage.setAttribute('role','group');
  stage.setAttribute('aria-label','Ganancias editables por frecuencia del EQ actual');
  for(const [i,r] of original.rows.entries()){
   const cell=document.createElement('div');cell.className='app-eq-band';
   const graph=document.createElement('div');graph.className='app-eq-bar-area';
   graph.setAttribute('aria-hidden','true');
   const zero=document.createElement('div');zero.className='app-eq-zero';
   const bar=document.createElement('div');bar.className='app-eq-bar';
   setBar(bar,values[i]);graph.append(zero,bar);
   const freq=document.createElement('strong');freq.textContent=r.frequencyHz+' Hz';
   const field=document.createElement('input');field.type='number';
   field.id='eq-inline-'+i;
   field.dataset.testid='eq-inline-gain-'+i;
   field.step='0.5';field.min=String(-original.capDb);
   field.max=String(original.capDb);field.value=String(values[i]);
   field.setAttribute('aria-label','Ganancia de '+r.frequencyHz+' Hz, en dB');
   field.className='app-eq-input';
   const detail=document.createElement('small');detail.textContent=r.source==='direct-subjective-contrast'
    ?'Tono confirmado':r.source==='estimated-from-neighbor-subjective-brackets'
     ?'Estimado':'Sin evidencia suficiente';
   const number=document.createElement('span');number.textContent=signed(values[i])+' dB';
   field.addEventListener('input',()=>{
    if(busy)return;
    const n=field.value===''?NaN:Number(field.value);
    values[i]=n;
    if(Number.isFinite(n)){setBar(bar,n);number.textContent=signed(n)+' dB';}
    else number.textContent='—';
    bandReset.disabled=busy||n===r.gainDb;
    sync();
    if(review)setText('save-status',resultId
     ?unsaved()?'Tienes ediciones nuevas. Confirma «Guardar mis cambios al EQ».':
      'Esta curva coincide con el último resultado guardado.'
     :'Las ediciones están solo en esta vista. Para guardarlas, archiva el resultado incluyendo EQ.');
   });
   const bandReset=document.createElement('button');
   bandReset.type='button';bandReset.className='app-eq-band-reset';
   bandReset.dataset.testid='eq-inline-restore-'+i;
   bandReset.textContent='Restaurar banda';
   bandReset.setAttribute('aria-label','Restaurar ganancia original de '+r.frequencyHz+' Hz');
   bandReset.disabled=busy||values[i]===r.gainDb;
   bandReset.addEventListener('click',()=>{
    if(!history||busy)return;
    if(!valid()){setText('action-status','Corrige los valores inválidos antes de restaurar una banda.');return;}
    history.record(values);
    values=history.resetBand(i).slice();
    showRows();sync();
    setText('save-status','Se restauró únicamente la banda de '+r.frequencyHz+
     ' Hz. Guarda si deseas conservar la modificación.');
   });
   field.addEventListener('change',()=>{
    if(!busy&&history&&valid()){history.record(values);sync();}
   });
   cell.append(graph,freq,field,number,detail,bandReset);stage.append(cell);
  }
 }
 function render(){
  const draft=getDraft();
  const fingerprintNew=draft?JSON.stringify([draft.deviceCategory,draft.capDb,
   draft.rows.map(r=>[r.frequencyHz,r.gainDb,r.source])]):'';
  if(fingerprintNew===fingerprint)return;
  fingerprint=fingerprintNew;original=null;review=null;resultId=null;history=null;
  values=[];savedValues=[];
  if(!draft){
   $('chart').replaceChildren();
   setText('status','Al finalizar el examen, aquí aparecerán los valores para cada banda.');
   setText('save-status','Primero completa el examen para obtener una curva.');
   sync();return;
  }
  try{original=inspectHear3ImmediateEq(draft);}
  catch(error){
   $('chart').replaceChildren();
   setText('status',error.message);
   setText('save-status','El EQ no está disponible.');
   sync();return;
  }
  values=original.rows.map(r=>r.gainDb);
  history=createHear3EqEditHistory({initial:values,capDb:original.capDb});
  savedValues=values.slice();
  setText('status',original.resultStatus+' '+original.warning);
  setText('save-status','Puedes editar y exportar ahora. Para conservar las ediciones, guarda el resultado incluyendo el EQ.');
  showRows();sync();
 }
 const error=message=>setText('action-status',message);
 $('copy').addEventListener('click',async()=>{
  try{
   check(review,'No hay EQ válido para copiar.');
   check(env.navigator?.clipboard?.writeText,'Este navegador no permite copiar. Usa TXT.');
   await env.navigator.clipboard.writeText(formatHear3ImmediateEq(review));
   error('Valores visibles copiados. No se cambió ningún dispositivo.');
  }catch(e){error(e?.message??String(e));}
 });
 for(const format of ['txt','csv']){
  $(format).addEventListener('click',()=>{
   try{
    check(review,'Primero finaliza el examen y revisa las ganancias.');
    download(formatHear3ImmediateEq(review,{format}),
     'audiocal-hear-mi-eq-orientativo.'+format,
     format==='txt'?'text/plain;charset=utf-8':'text/csv;charset=utf-8');
    error('Descarga '+format.toUpperCase()+' solicitada, sin aplicar ajustes.');
   }catch(e){error(e?.message??String(e));}
  });
 }
 $('png').addEventListener('click',()=>{
  try{
   check(review,'Primero finaliza el examen y revisa las ganancias.');
   const canvas=paintHear3ImmediateEqPng(document.createElement('canvas'),review);
   canvas.toBlob(blob=>{
    if(!blob){error('No se pudo generar la imagen PNG.');return;}
    download(blob,'audiocal-hear-mi-eq-orientativo.png','image/png');
    error('Imagen PNG generada a partir de la misma curva visible.');
   },'image/png');
  }catch(e){error(e?.message??String(e));}
 });
 $('undo').addEventListener('click',()=>{
  if(!history||busy)return;
  const current=history.current();
  values=values.some((v,i)=>v!==current[i])?current.slice():history.undo().slice();
  showRows();sync();
  setText('save-status','Edición deshecha en pantalla. El historial guardado permanece intacto.');
 });
 $('redo').addEventListener('click',()=>{
  if(!history||busy||values.some((v,i)=>v!==history.current()[i]))return;
  values=history.redo().slice();
  showRows();sync();
  setText('save-status','Edición rehecha en pantalla. Guarda para conservarla.');
 });
 $('restore').addEventListener('click',()=>{
  if(!original||busy)return;
  if(history&&valid())history.record(values);
  values=history?history.restoreAll().slice():original.rows.map(r=>r.gainDb);
  showRows();sync();
  setText('save-status',resultId
   ?'Valores originales recuperados en pantalla; guarda si deseas sustituir tus ediciones anteriores.'
   :'Se recuperó la propuesta original; no se alteraron datos del examen.');
 });
 document.addEventListener('hear3:eq-archive-saved',event=>{
  if(!original||!event.detail?.resultId)return;
  try{
   const target=event.detail.resultId;
   const snapshot=createHear3ProvisionalEqEditor({store,resultId:target}).snapshot();
   check(snapshot.rows.length===original.rows.length&&snapshot.rows.every((r,i)=>
    r.bandId===original.rows[i].bandId&&
    r.frequencyHz===original.rows[i].frequencyHz&&
    r.originalGainDb===original.rows[i].gainDb),
    'El resultado guardado no corresponde a las bandas actuales.');
   resultId=target;savedValues=snapshot.rows.map(r=>r.currentGainDb);
   setText('save-status',event.detail.persistedOnDevice
    ?'Resultado archivado. Si editaste ganancias, confirma «Guardar mis cambios al EQ».':
     'La persistencia de los datos del dispositivo no está verificada; exporta un respaldo.');
   sync();
  }catch(e){
   resultId=null;setText('save-status','No se puede vincular el EQ guardado: '+e.message);sync();
  }
 });
 $('save').addEventListener('click',async()=>{
  if(!original||!resultId||!review||busy||!unsaved())return;
  const target=resultId;
  if(!env.confirm('¿Guardar estas ganancias manuales en tu perfil local? No se reproducirá audio ni se modificará ningún dispositivo.'))return;
  busy=true;sync();
  try{
   const editor=createHear3ProvisionalEqEditor({store,resultId:target});
   const snapshot=editor.snapshot();
   check(snapshot.rows.length===original.rows.length&&snapshot.rows.every((r,i)=>
    r.bandId===original.rows[i].bandId&&r.frequencyHz===original.rows[i].frequencyHz&&
    r.originalGainDb===original.rows[i].gainDb),
    'El resultado guardado cambió; no se modificarán bandas equivocadas.');
   const valuesPatch=snapshot.rows.flatMap((r,i)=>r.currentGainDb===values[i]
    ?[]:[{bandId:r.bandId,gainDb:values[i]}]);
   if(valuesPatch.length){
    editor.preview({values:valuesPatch});
    const {response}=await writer.run(()=>editor.commit({
     userInitiated:true,confirmed:true,
    }),{expectedRevision:snapshot.revision});
    savedValues=values.slice();
    setText('save-status',response.persistedOnDevice
     ?'Tus cambios están guardados en el perfil, con historial y propuesta original intactos.':
      'Cambios registrados, pero sin persistencia verificada en dispositivo. Exporta un respaldo.');
   }else{
    savedValues=values.slice();
    setText('save-status','La curva ya coincide con los valores guardados.');
   }
  }catch(e){setText('save-status','No se guardaron los cambios: '+(e?.message??String(e)));}
  finally{busy=false;sync();}
 });
 if(categorySelector)categorySelector.addEventListener('change',()=>{if(review)updateGuide();});
 const observer=new MutationObserver(render);
 observer.observe(source,{childList:true});
 render();
 return Object.freeze({render,dispose:()=>observer.disconnect()});
}
