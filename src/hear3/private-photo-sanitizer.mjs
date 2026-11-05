/**
 * Hear 3 D-044/D-059. Opt-in image-to-pixels sanitization without servers.
 * No EXIF, GPS or original encoded bytes are intentionally copied into the
 * fresh PNG canvas. Never identify hardware, infer EQ bands or store a photo.
 */
export const HEAR3_PRIVATE_PHOTO_FORMAT='hear3-private-photo-raster-v1';
export const HEAR3_PRIVATE_PHOTO_MAX_BYTES=8*1024*1024;
const check=(ok,message)=>{if(!ok)throw Error(message);};
const validType=new Set(['image/jpeg','image/png','image/webp']);
async function validateMagic(file){
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const jpg=bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes.length>=8&&[137,80,78,71,13,10,26,10]
  .every((b,i)=>bytes[i]===b);
 const webp=bytes.length>=12&&
  String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&
  String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 check(file.type==='image/jpeg'?jpg:file.type==='image/png'?png:webp,
  'Image format signature does not match the declared supported type');
}
export function createHear3PrivatePhotoSession({
 decodeImage=(file)=>globalThis.createImageBitmap(file),
 makeCanvas=()=>globalThis.document.createElement('canvas'),
 objectUrls=globalThis.URL,
 maxEdge=1600,
}={}){
 check(typeof decodeImage==='function'&&typeof makeCanvas==='function',
  'Image decoder and canvas are required');
 check(objectUrls&&typeof objectUrls.createObjectURL==='function'&&
  typeof objectUrls.revokeObjectURL==='function','Temporary URL controls required');
 check(Number.isSafeInteger(maxEdge)&&maxEdge>=64&&maxEdge<=2048,
  'Invalid maximum pixel edge');
 let previewUrl=null,cleanBlob=null,inspected=null,generation=0,disposed=false;
 function clear(){
  generation++;
  if(previewUrl!==null){objectUrls.revokeObjectURL(previewUrl);previewUrl=null;}
  cleanBlob=null;inspected=null;
 }
 async function inspect(file,{userInitiated=false}={}){
  check(!disposed,'Photo session disposed');
  check(userInitiated===true,'Image inspection requires explicit user action');
  clear();
  const request=generation;
  check(file&&typeof file.size==='number'&&validType.has(file.type),
   'Choose an explicitly supported JPEG, PNG or WebP image');
  check(file.size>0&&file.size<=HEAR3_PRIVATE_PHOTO_MAX_BYTES,
   'Image exceeds the 8 MiB private-preview limit');
  await validateMagic(file);
  check(request===generation&&!disposed,'Image selection changed before decoding');
  let bitmap;
  try{
   bitmap=await decodeImage(file);
   check(request===generation&&!disposed,'Image selection changed during decode');
   const width=bitmap?.width,height=bitmap?.height;
   check(Number.isSafeInteger(width)&&Number.isSafeInteger(height)&&
    width>=1&&height>=1&&width<=10000&&height<=10000&&
    width*height<=12000000,'Image dimensions exceed private-preview limit');
   const ratio=Math.min(1,maxEdge/Math.max(width,height));
   const outWidth=Math.max(1,Math.round(width*ratio));
   const outHeight=Math.max(1,Math.round(height*ratio));
   const canvas=makeCanvas();
   canvas.width=outWidth;canvas.height=outHeight;
   const context=canvas.getContext('2d',{alpha:false});
   check(context&&typeof context.drawImage==='function',
    'Private image rendering is unavailable');
   // Opaque pixel redraw; never persist the original JPEG/PNG/WebP bytes.
   context.fillStyle='#ffffff';
   context.fillRect(0,0,outWidth,outHeight);
   context.drawImage(bitmap,0,0,outWidth,outHeight);
   const blob=await new Promise((resolve,reject)=>{
    try{canvas.toBlob(value=>value?resolve(value):
     reject(Error('Private PNG encoding failed')),'image/png');}
    catch(e){reject(e);}
   });
   check(request===generation&&!disposed,'Image selection changed during encoding');
   check(blob?.type==='image/png'&&blob.size>0&&blob.size<=
    HEAR3_PRIVATE_PHOTO_MAX_BYTES,'Sanitized PNG exceeded output size limit');
   previewUrl=objectUrls.createObjectURL(blob);
   cleanBlob=blob;
   inspected=Object.freeze({
    format:HEAR3_PRIVATE_PHOTO_FORMAT,sourceMime:file.type,
    inputBytes:file.size,sourceWidth:width,sourceHeight:height,
    outputWidth:outWidth,outputHeight:outHeight,
    outputMime:'image/png',outputBytes:blob.size,
    sourceMetadataCopied:false,gpsLocationInferred:false,
    photoUploaded:false,photoStored:false,eqOrDeviceRecognized:false,
    processing:'local-decoded-pixel-raster-to-new-opaque-png',
    warning:'New PNG generated from decoded pixels; no face, device identity, original EXIF/GPS or EQ specification verified.',
   });
   return {previewUrl,summary:{...inspected}};
  }finally{
   try{bitmap?.close?.();}catch{/* release decoded memory best effort */}
  }
 }
 function snapshot(){
  return inspected?{...inspected}:null;
 }
 function getSanitizedBlob({userInitiated=false}={}){
  check(!disposed&&userInitiated===true,'Explicit action required for the sanitized image');
  check(cleanBlob!==null,'No sanitized image available');
  return cleanBlob;
 }
 function dispose(){clear();disposed=true;}
 return Object.freeze({inspect,clear,dispose,snapshot,getSanitizedBlob});
}
