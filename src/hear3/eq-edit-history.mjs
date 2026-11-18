/** In-memory EQ edit history, deliberately separate from hearing evidence and
 * the opt-in persistent catalog. Keeps the immutable starting curve available.
 * No audio, storage, device application, or external requests. */
const ensure=(ok,message)=>{if(!ok)throw Error(message);};
const valid=(a,cap)=>Array.isArray(a)&&a.length>=2&&a.length<=31&&
 a.every(v=>typeof v==='number'&&Number.isFinite(v)&&
 Number.isInteger(v*2)&&Math.abs(v)<=cap);
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
export function createHear3EqEditHistory({initial,capDb,maxSteps=80}={}){
 ensure(typeof capDb==='number'&&Number.isFinite(capDb)&&capDb>0&&capDb<=3,
  'Invalid EQ gain cap');
 ensure(valid(initial,capDb),'Invalid initial EQ gains');
 ensure(Number.isInteger(maxSteps)&&maxSteps>=2&&maxSteps<=500,'Invalid undo capacity');
 const original=Object.freeze(initial.slice());
 let states=[original.slice()],index=0;
 const current=()=>Object.freeze(states[index].slice());
 const canUndo=()=>index>0,canRedo=()=>index<states.length-1;
 function record(next){
  ensure(valid(next,capDb)&&next.length===original.length,'Invalid edited EQ gains');
  if(equal(next,states[index]))return false;
  states=states.slice(0,index+1);
  states.push(next.slice());
  if(states.length>maxSteps+1)states.shift();
  index=states.length-1;
  return true;
 }
 function undo(){
  if(index>0)index--;
  return current();
 }
 function redo(){
  if(index<states.length-1)index++;
  return current();
 }
 function resetBand(bandIndex){
  ensure(Number.isInteger(bandIndex)&&bandIndex>=0&&bandIndex<original.length,
   'Unknown EQ band');
  const next=states[index].slice();next[bandIndex]=original[bandIndex];
  record(next);return current();
 }
 function restoreAll(){
  record(original);return current();
 }
 return Object.freeze({
  current,original:()=>original,canUndo,canRedo,record,undo,redo,
  resetBand,restoreAll,
 });
}
