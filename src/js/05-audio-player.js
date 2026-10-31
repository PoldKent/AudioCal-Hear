
async function setupPlayer(){if(!current||!playerAudio)return;const ctx=await ensureAudio();if(!playerSource)playerSource=ctx.createMediaElementSource(playerAudio);try{playerSource.disconnect()}catch(e){}filters.forEach(f=>{try{f.disconnect()}catch(e){}});try{playerPreamp?.disconnect()}catch(e){}try{playerOutput?.disconnect()}catch(e){}filters=[];playerPreamp=ctx.createGain();playerOutput=ctx.createGain();const r=recommend(current);for(const b of r){if(b.f>=ctx.sampleRate/2)continue;const f=ctx.createBiquadFilter();f.type='peaking';f.frequency.value=b.f;let ratio=current.bands.length>1?Math.pow(current.bands[current.bands.length-1]/current.bands[0],1/(current.bands.length-1)):2;f.Q.value=clamp(Math.sqrt(ratio)/(ratio-1),.65,5.5);f.gain.value=eqBypass?0:b.gain;filters.push(f)}
let chain=playerSource;chain.connect(playerPreamp);chain=playerPreamp;filters.forEach(f=>{chain.connect(f);chain=f});chain.connect(playerOutput);playerOutput.connect(ctx.destination);updatePlayerFilters(preferencePreview?previewTaste():null)}
// Conservative chain-wide peak estimate (RBJ peaking filters) for preamp headroom.
// Includes +2 dB per band for A/B preview, so toggling A/B does not change volume budget.
function chainPeakDb(settings,sampleRate){
 const highest=Math.min(20000,sampleRate*.48),lowest=20;
 // Precompute filter coefficients once, rather than once per sample point.
 const coeff=settings.map(item=>{
  const A=Math.pow(10,item.g/40),w0=2*Math.PI*item.f/sampleRate,alpha=Math.sin(w0)/(2*item.q),cos=Math.cos(w0);
  return {b0:1+alpha*A,b1:-2*cos,b2:1-alpha*A,a0:1+alpha/A,a1:-2*cos,a2:1-alpha/A};
 });
 let peak=0;
 for(let n=0;n<128;n++){
  const hz=lowest*Math.pow(highest/lowest,n/127),w=2*Math.PI*hz/sampleRate;
  const cs=Math.cos(w),sn=Math.sin(w),c2=Math.cos(2*w),s2=Math.sin(2*w);
  let summed=0;
  for(const {b0,b1,b2,a0,a1,a2} of coeff){
   const br=b0+b1*cs+b2*c2,bi=-b1*sn-b2*s2,ar=a0+a1*cs+a2*c2,ai=-a1*sn-a2*s2;
   summed+=10*Math.log10(Math.max(1e-24,(br*br+bi*bi)/Math.max(1e-24,ar*ar+ai*ai)));
  }
  peak=Math.max(peak,summed);
 }
 return Math.max(0,peak);
}
let cachedHeadroomKey='',cachedHeadroomDb=0;
function updatePlayerFilters(preview=null){
 if(!audioCtx||!current||!filters.length)return;
 const r=new Map(recommend(current).map(x=>[x.f,x.gain])),now=audioCtx.currentTime;
 const origTaste=cleanTaste(current),settings=[];
 filters.forEach(f=>{
  let gain=r.get(f.frequency.value)||0;
  if(preview)gain=clamp(gain+tasteGain(f.frequency.value,preview)-tasteGain(f.frequency.value,origTaste),current.min,current.max);
  if(balancePreview&&f.frequency.value===balanceFreq)gain=clamp(gain+balanceDelta(),current.min,current.max);
  if(eqBypass)gain=0;
  f.gain.setTargetAtTime(gain,now,.05);
  // Keep preamp gain fixed across A/B previews and EQ bypass. Budget +2 dB
  // per band above the saved EQ curve; the summed cascade, not one slider,
  // determines the headroom needed to avoid digital saturation.
  const baseline=r.get(f.frequency.value)||0;
  settings.push({f:f.frequency.value,g:clamp(baseline+2,current.min,current.max),q:f.Q.value});
 });
 const headroomKey=audioCtx.sampleRate+'|'+settings.map(s=>s.f+':'+s.g+':'+s.q).join('|');
  if(headroomKey!==cachedHeadroomKey){cachedHeadroomDb=chainPeakDb(settings,audioCtx.sampleRate);cachedHeadroomKey=headroomKey}
  const totalPeak=cachedHeadroomDb;
 playerPreamp?.gain.setTargetAtTime(Math.pow(10,(-totalPeak-2)/20),now,.06);
}
function attachPlayerEvents(player){if(!player)return;player.onplay=async()=>{try{await setupPlayer()}catch(e){player.pause();uiAlert('No se pudo iniciar la escucha A/B: '+e.message)}}}
function handleResultsEvents(t){if(t.id==='musicFile'){const file=t.files?.[0];if(!file)return;if(playerUrl)URL.revokeObjectURL(playerUrl);playerUrl=URL.createObjectURL(file);const view=$('#audioPlayer');if(playerAudio){try{playerAudio.pause()}catch(e){}}playerAudio=view;playerAudio.src=playerUrl;attachPlayerEvents(playerAudio);return}}