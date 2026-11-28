/**
 * AudioCal Hear — listen to the visible EQ with the user's OWN audio file.
 *
 * The file stays on the device (object URL, never uploaded or stored).
 * Playback starts only after an explicit click. A fixed digital pre-gain
 * keeps the filtered peak below 0 dBFS in this ideal model and is the SAME
 * with and without EQ, so the A/B comparison is not "louder = better".
 * This is a preview in the browser: it does not change any device EQ and
 * is not a calibrated or SPL-safe measurement.
 */
const check=(ok,message)=>{if(!ok)throw Error(message);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const HEAR3_PREVIEW_MAX_FILE_BYTES=200*1024*1024;
export const HEAR3_PREVIEW_GUARD_DB=1;
export const HEAR3_PREVIEW_REFERENCE_RATE=48000;
const AUDIO_NAME=/\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|webm)$/i;

/** RBJ peaking-filter Q for a bandwidth of N octaves. */
export function qForOctaves(octaves){
 check(finite(octaves)&&octaves>0,'Invalid band spacing');
 const p=2**octaves;
 return Math.min(8,Math.max(0.3,Math.sqrt(p)/(p-1)));
}
function peakingCoefficients(frequencyHz,gainDb,q,rate){
 const w=2*Math.PI*frequencyHz/rate,alpha=Math.sin(w)/(2*q),A=10**(gainDb/40);
 const a0=1+alpha/A;
 return {b0:(1+alpha*A)/a0,b1:-2*Math.cos(w)/a0,b2:(1-alpha*A)/a0,
  a1:-2*Math.cos(w)/a0,a2:(1-alpha/A)/a0};
}
function cascadeDbAt(filters,hz,rate){
 const w=2*Math.PI*hz/rate,c=Math.cos(w),s=Math.sin(w),c2=Math.cos(2*w),s2=Math.sin(2*w);
 let db=0;
 for(const {b0,b1,b2,a1,a2} of filters){
  const nr=b0+b1*c+b2*c2,ni=-b1*s-b2*s2,dr=1+a1*c+a2*c2,di=-a1*s-a2*s2;
  db+=10*Math.log10((nr*nr+ni*ni)/(dr*dr+di*di));
 }
 return db;
}
/**
 * Plans one peaking filter per declared band (Q from the spacing between
 * neighbouring bands) and a constant pre-gain from the modelled peak.
 */
export function planHear3PreviewFilters(rows,{sampleRateHz=HEAR3_PREVIEW_REFERENCE_RATE}={}){
 check(Array.isArray(rows)&&rows.length>=2&&rows.length<=31,'La curva debe tener de 2 a 31 bandas.');
 check(finite(sampleRateHz)&&sampleRateHz>=8000&&sampleRateHz<=384000,'Frecuencia de muestreo inválida.');
 let last=0;
 for(const r of rows){
  check(r&&finite(r.frequencyHz)&&r.frequencyHz>last&&r.frequencyHz>=20&&r.frequencyHz<=20000,
   'Frecuencias de la curva inválidas.');
  check(finite(r.gainDb)&&Math.abs(r.gainDb)<=12,'Ganancia fuera de rango.');
  last=r.frequencyHz;
 }
 const nyquistSafe=sampleRateHz*0.45;
 const bands=rows.map((r,i)=>{
  const left=rows[i-1],right=rows[i+1];
  const spans=[left&&Math.log2(r.frequencyHz/left.frequencyHz),
   right&&Math.log2(right.frequencyHz/r.frequencyHz)].filter(Boolean);
  const octaves=spans.reduce((a,b)=>a+b,0)/spans.length;
  return Object.freeze({frequencyHz:r.frequencyHz,gainDb:r.gainDb,q:Number(qForOctaves(octaves).toFixed(4)),
   active:r.frequencyHz<nyquistSafe});
 });
 const modelled=bands.filter(b=>b.active&&b.gainDb!==0)
  .map(b=>peakingCoefficients(b.frequencyHz,b.gainDb,b.q,sampleRateHz));
 let peakDb=0;
 if(modelled.length){
  const points=[...bands.map(b=>b.frequencyHz)];
  for(let i=0;i<=480;i++)points.push(20*(1000**(i/480))); // 20 Hz – 20 kHz, log grid
  for(const hz of points)if(hz<sampleRateHz/2)peakDb=Math.max(peakDb,cascadeDbAt(modelled,hz,sampleRateHz));
 }
 const need=modelled.length?Math.max(0,peakDb)+HEAR3_PREVIEW_GUARD_DB:0;
 const preGainDb=need?-Math.ceil(need*4-1e-9)/4:0;
 return Object.freeze({bands:Object.freeze(bands),modelledPeakDb:Number(peakDb.toFixed(3)),
  preGainDb,sampleRateHz});
}
export function isHear3PreviewAudioFile(file){
 return Boolean(file)&&finite(file.size)&&file.size>0&&file.size<=HEAR3_PREVIEW_MAX_FILE_BYTES&&
  ((typeof file.type==='string'&&file.type.startsWith('audio/'))||AUDIO_NAME.test(String(file.name||'')));
}
/**
 * Creates a lazily wired Web Audio preview around an <audio> element.
 * Nothing is played, decoded or connected until play({userInitiated:true}).
 */
export function createHear3EqPreviewPlayer({env=globalThis,audio}={}){
 check(audio&&typeof audio.play==='function','Falta el reproductor de audio.');
 let url=null,ctx=null,pre=null,filters=[],plan=null,rows=null,bypass=false,state='empty',disposed=false;
 const dbToGain=db=>10**(db/20);
 function applyGains(){
  if(!ctx||!plan)return;
  const now=ctx.currentTime;
  pre.gain.setValueAtTime(dbToGain(plan.preGainDb),now);
  plan.bands.forEach((b,i)=>{
   const f=filters[i];
   f.frequency.setValueAtTime(b.frequencyHz,now);
   f.Q.setValueAtTime(b.q,now);
   f.gain.setValueAtTime(bypass||!b.active?0:b.gainDb,now);
  });
 }
 function wire(){
  const Context=env.AudioContext||env.webkitAudioContext;
  check(typeof Context==='function','Este navegador no permite escuchar la vista previa.');
  const next=new Context();
  check(typeof next.createMediaElementSource==='function'&&typeof next.createBiquadFilter==='function',
   'Este navegador no permite escuchar la vista previa.');
  ctx=next;
  plan=planHear3PreviewFilters(rows,{sampleRateHz:finite(ctx.sampleRate)?ctx.sampleRate:HEAR3_PREVIEW_REFERENCE_RATE});
  const source=ctx.createMediaElementSource(audio);
  pre=ctx.createGain();
  filters=plan.bands.map(()=>{const f=ctx.createBiquadFilter();f.type='peaking';return f;});
  source.connect(pre);
  let node=pre;
  for(const f of filters){node.connect(f);node=f;}
  node.connect(ctx.destination);
  applyGains();
 }
 return Object.freeze({
  loadFile(file){
   check(!disposed,'Vista previa cerrada.');
   check(isHear3PreviewAudioFile(file),'Elige un archivo de audio de hasta 200 MB.');
   audio.pause();
   if(url)env.URL.revokeObjectURL(url);
   url=env.URL.createObjectURL(file);
   audio.src=url;audio.preload='metadata';
   state='ready';
  },
  setEq(nextRows){
   check(Array.isArray(nextRows),'Curva inválida.');
   const candidate=nextRows.map(r=>({frequencyHz:r.frequencyHz,gainDb:r.gainDb}));
   const nextPlan=planHear3PreviewFilters(candidate,{sampleRateHz:ctx&&finite(ctx.sampleRate)?ctx.sampleRate:HEAR3_PREVIEW_REFERENCE_RATE});
   if(ctx&&nextPlan.bands.length!==filters.length){
    // Different band layout: rebuild on the next explicit play.
    audio.pause();state=url?'ready':'empty';
    void ctx.close?.();ctx=null;filters=[];pre=null;
   }
   rows=candidate;plan=nextPlan;
   applyGains();
   return plan;
  },
  setBypass(value){bypass=value===true;applyGains();return bypass;},
  async play({userInitiated=false}={}){
   check(userInitiated===true,'La vista previa solo suena después de pulsar Reproducir.');
   check(!disposed&&url&&rows,'Primero elige una canción.');
   if(!ctx)wire();
   await ctx.resume?.();
   await audio.play();
   state='playing';
  },
  pause(){audio.pause();if(state==='playing')state='paused';},
  stop(){
   audio.pause();
   try{audio.currentTime=0;}catch{}
   if(state==='playing'||state==='paused')state='ready';
  },
  getState:()=>Object.freeze({state,bypass,preGainDb:plan?.preGainDb??null,
   modelledPeakDb:plan?.modelledPeakDb??null}),
  async dispose(){
   if(disposed)return;
   disposed=true;audio.pause();
   if(url)env.URL.revokeObjectURL(url);
   url=null;audio.removeAttribute?.('src');state='empty';
   await ctx?.close?.();ctx=null;
  },
 });
}
