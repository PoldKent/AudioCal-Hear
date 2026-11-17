/**
 * Optional, privacy-minimizing photo helper for graphic EQ frequency labels.
 *
 * A selected image is rendered to an in-memory canvas. If the current browser
 * exposes TextDetector, OCR can propose a frequency list; unsupported browsers
 * use the same photo as a visual reference for manual entry. Neither mode
 * saves the image, phones home, starts audio nor modifies the EQ without an
 * additional user action and the existing layout confirmation.
 */
import {resolveHear3GraphicBandLayout} from './eq-band-layouts.mjs';

const fail=(m)=>{throw Error(m);};
const supportedImageTypes=new Set(['image/jpeg','image/png','image/webp']);
const maxBytes=8*1024*1024;
export const HEAR3_PHOTO_MAX_BYTES=maxBytes;

export function proposeHear3PhotoBandFrequencies(rawText){
 if(typeof rawText!=='string'||rawText.length===0||rawText.length>12000)
  fail('No se reconocieron etiquetas de frecuencia suficientes.');
 // Never interpret arbitrary labels as frequencies without a Hz/kHz/k anchor.
 const token=/(?<![+\-\w\d])(\d{1,5}(?:[.,]\d{1,3})?)\s*(kHz|Hz|k)?(?![\w\d])/gi;
 const values=[];
 let match,hasUnit=false;
 while((match=token.exec(rawText))!==null){
  const original=Number(match[1].replace(',','.'));
  const unit=(match[2]??'').toLowerCase();
  if(!Number.isFinite(original))continue;
  if(unit)hasUnit=true;
  const hz=(unit==='k'||unit==='khz')?original*1000:original;
  // Other numbers (gain dB, volume, model number) must fail closed rather
  // than be silently sorted or clipped into a fictional EQ layout.
  if(!Number.isFinite(hz)||hz<20||hz>20000)
   fail('La fotografía incluye números que no son frecuencias claras. Comprueba las bandas manualmente.');
  values.push(hz);
  if(values.length>31)
   fail('Se reconocieron demasiados números; verifica las frecuencias manualmente.');
 }
 const knownReference=!hasUnit&&['car-reference-7','headphones-reference-10']
  .some(preset=>JSON.stringify(resolveHear3GraphicBandLayout({preset})
   .map(v=>v.frequencyHz))===JSON.stringify(values));
 if(!hasUnit&&!knownReference)
  fail('No hay etiquetas Hz/kHz ni una referencia conocida completa. Revisa la foto e introduce las bandas manualmente.');
 // Reuse the identical input contract that the exam requires; order and
 // uniqueness must already be supported by the evidence.
 const validated=resolveHear3GraphicBandLayout({
  preset:'custom',customFrequencies:values.join(', '),
 });
 return Object.freeze({
  frequencies:Object.freeze(validated.map(v=>v.frequencyHz)),
  previewText:validated.map(v=>v.frequencyHz).join(', '),
  requiresUserConfirmation:true,hardwareVerified:false,
  warning:'Lectura visual provisional. Comprueba uno por uno los valores frente a tu equipo antes de confirmar. No es identificación de hardware.',
 });
}
export function recommendedHear3DeviceLayout(category){
 const layouts={
  car:{preset:'car-reference-7',label:'Usar referencia de automóvil (7 bandas)'},
  headphones:{preset:'headphones-reference-10',label:'Usar referencia de auriculares (10 bandas)'},
 };
 return Object.freeze(layouts[category]??{
  preset:null,label:'Elige las frecuencias de tu equipo',
 });
}
export function mountHear3PhotoBandAssistant({
 root,categorySelect,layoutChoice,layoutCustom,layoutApply,env=globalThis,
}={}){
 if(!root||!categorySelect||!layoutChoice||!layoutCustom||!layoutApply)
  fail('No se encontró la preparación del equipo.');
 const $=name=>root.querySelector('[data-photo="'+name+'"]');
 const choose=$('input'),canvas=$('canvas'),suggest=$('suggest'),apply=$('apply');
 const status=$('status'),proposal=$('proposal'),clear=$('clear');
 if(!choose||!canvas||!suggest||!apply||!status||!proposal||!clear)
  fail('Faltan controles de la foto.');
 let frequencies=null,revision=0,disposed=false;
 function message(text){status.textContent=text;}
 function invalidate(){
  revision++;
  frequencies=null;
  apply.disabled=true;
  proposal.textContent='';
 }
 function refreshPreset(){
  const recommendation=recommendedHear3DeviceLayout(categorySelect.value);
  suggest.hidden=!recommendation.preset;
  suggest.disabled=!recommendation.preset||layoutChoice.disabled;
  suggest.textContent=recommendation.label;
 }
 function empty(){
  invalidate();
  canvas.width=1;canvas.height=1;
  canvas.hidden=true;
  choose.value='';
  message('No se conserva ninguna fotografía. Puedes introducir las frecuencias manualmente.');
 }
 suggest.addEventListener('click',()=>{
  const candidate=recommendedHear3DeviceLayout(categorySelect.value);
  if(!candidate.preset||layoutChoice.disabled)return;
  layoutChoice.value=candidate.preset;
  layoutChoice.dispatchEvent(new Event('change',{bubbles:true}));
  message('Referencia elegida, no detectada. Revisa las bandas y pulsa «Confirmar las bandas del EQ».');
  refreshPreset();
 });
 categorySelect.addEventListener('change',refreshPreset);
 const observer=new MutationObserver(refreshPreset);
 observer.observe(layoutChoice,{attributes:true,attributeFilter:['disabled']});
 async function handleFile(){
  invalidate();
  const id=revision;
  const file=choose.files?.[0];
  if(!file){empty();return;}
  if(!supportedImageTypes.has(file.type)||file.size<=0||file.size>maxBytes){
   empty();message('Selecciona JPG, PNG o WebP de hasta 8 MB. No se ha procesado la imagen.');
   return;
  }
  if(typeof env.createImageBitmap!=='function'){
   empty();message('Este navegador no permite abrir la imagen de forma compatible; usa las frecuencias manuales.');
   return;
  }
  choose.disabled=true;
  let bitmap=null;
  try{
   message('Abriendo la imagen localmente…');
   bitmap=await env.createImageBitmap(file);
   if(disposed||id!==revision)return;
   if(bitmap.width<64||bitmap.height<64||bitmap.width*bitmap.height>50000000)
    fail('La imagen debe tener entre 64 píxeles por lado y no superar 50 megapíxeles.');
   const scale=Math.min(1,720/bitmap.width,420/bitmap.height);
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));
   canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)fail('Este navegador no permite previsualizar la foto.');
   ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   canvas.hidden=false;
   // OCR is never mandatory. The image stays in memory until cleared.
   if(typeof env.TextDetector!=='function'){
    message('Foto visible solo en este navegador. El reconocimiento automático no está disponible aquí: lee las frecuencias de la foto e introdúcelas en el campo personalizado.');
    return;
   }
   message('Buscando posibles etiquetas en la foto, sin subirla desde Hear…');
   const detector=new env.TextDetector();
   const detected=await detector.detect(canvas);
   if(disposed||id!==revision)return;
   const text=Array.isArray(detected)?detected.map(x=>x.rawValue??'').join('\n'):'';
   try{
    const candidate=proposeHear3PhotoBandFrequencies(text);
    frequencies=candidate.previewText;
    proposal.textContent='Posibles frecuencias: '+candidate.previewText+
     ' Hz. '+candidate.warning;
    apply.disabled=false;
    message('Revisa la propuesta visual antes de usarla.');
   }catch(error){
    message('No se reconoció una lista fiable. Introduce las bandas de la foto manualmente. '+error.message);
   }
  }catch(error){
   if(!disposed&&id===revision)
    message('No se pudo analizar la fotografía: '+(error?.message??String(error))+
     '. Puedes escribir las bandas manualmente.');
  }finally{
   bitmap?.close?.();
   choose.disabled=false;
   // A browser-held original File reference is not retained after analysis.
   choose.value='';
  }
 }
 choose.addEventListener('change',handleFile);
 apply.addEventListener('click',()=>{
  if(!frequencies||layoutChoice.disabled)return;
  const selected=frequencies;
  // A user must click both "Usar" and the existing final confirmation.
  layoutChoice.value='custom';
  layoutChoice.dispatchEvent(new Event('change',{bubbles:true}));
  layoutCustom.value=selected;
  layoutCustom.dispatchEvent(new Event('input',{bubbles:true}));
  invalidate();
  message('Propuesta copiada al campo de frecuencias. Revisa cada valor y pulsa «Confirmar las bandas del EQ». La foto no se ha guardado.');
 });
 clear.addEventListener('click',empty);
 refreshPreset();
 return Object.freeze({clear:empty,dispose:()=>{disposed=true;empty();observer.disconnect();}});
}
