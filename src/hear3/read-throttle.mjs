/**
 * Hear 3.0 D-062: reduce repeated synchronous storage reads during audio UI
 * updates. A minimum interval is a performance policy, NOT an audio timing
 * guarantee, storage transaction or persistence validation.
 */
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function createHear3ReadThrottle({
 read,now=()=>performance.now(),intervalMs=1000,
}={}){
 check(typeof read==='function'&&typeof now==='function','Invalid read throttle dependencies');
 check(Number.isFinite(intervalMs)&&intervalMs>=100&&intervalMs<=10000,
  'Invalid read throttle interval');
 let last=null,lastAt=null,invalidated=true,reads=0;
 function get({force=false}={}){
  check(force===true||force===false,'Invalid force option');
  const current=now();
  check(Number.isFinite(current),'Invalid monotonic clock');
  if(invalidated||lastAt===null||force||current<lastAt||
     current-lastAt>=intervalMs){
   // Do not update the cache or timestamp when reading throws.
   const result=read();
   last=result;lastAt=current;invalidated=false;reads++;
  }
  return last;
 }
 function invalidate(){invalidated=true;}
 function stats(){
  return {reads,cached:lastAt!==null,invalidated};
 }
 return Object.freeze({get,invalidate,stats});
}
