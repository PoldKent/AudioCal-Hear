
// Optional pre-test sweep. Observations never become hearing thresholds or EQ gains.
const SWEEP_DURATION_S=22;
const SWEEP_METHOD='fixed-digital-level-preflight-v1';
let sweepSide='both',sweepRange='standard',sweepMicEnabled=false,sweepStarting=false;
let sweepSession=null,sweepFrame=null,sweepNotice='';
function sweepBounds(wide=false){
 return wide?{min:40,max:16000}:{min:125,max:8000};
}
function sweepHz(min,max,t){return min*Math.pow(max/min,clamp(t,0,1))}
function sweepAssessment(record){
 const events=Array.isArray(record?.events)?record.events:[];
 if(!events.length)return {known:false,first:null,last:null,segments:[]};
 const segments=[];
 for(let i=0;i<events.length;i++){
  const event=events[i],end=i+1<events.length?events[i+1].hz:record.maxHz;
  if(event.heard&&Number.isFinite(event.hz)&&Number.isFinite(end)&&end>=event.hz){
   segments.push({from:event.hz,to:end});
  }
 }
 return {known:true,first:segments.length?Math.min(...segments.map(x=>x.from)):null,
  last:segments.length?Math.max(...segments.map(x=>x.to)):null,segments};
}
function sweepRecordSummary(record){
 const status=sweepAssessment(record);
 if(!status.known)return 'Sin respuestas: resultado inconcluso.';
 if(status.first===null)return 'No se indicaron zonas audibles al nivel utilizado. No implica pérdida de audición ni fallo del equipo.';
 const found=record.mic?.filter(x=>x.detected)||[];
 const microphone=record.micUsed?
   (found.length?' · Micrófono: '+found.length+' muestras con señal superior al ruido de referencia, no calibradas.':' · Micrófono: sin evidencia suficiente de captación; no demuestra ausencia de sonido.'):'';
 return 'Zona declarada audible aprox.: '+Math.round(status.first)+'–'+Math.round(status.last)+' Hz. '+status.segments.length+' tramo(s).'+microphone;
}

function sweepSummaryMarkup(p){
 const records=Object.entries(p.sweepRecords||{}).filter(([side,record])=>['both','left','right'].includes(side)&&record?.method===SWEEP_METHOD);
 if(!records.length)return '';
 return '<details class="unobtrusive" id="preSweepResults"><summary>Barrido previo · alcance observado del sistema</summary><div class="inner-detail">'+
  records.map(([side,record])=>'<p class="small"><strong>'+(side==='left'?'Oído izquierdo':side==='right'?'Oído derecho':'Ambos canales')+'</strong> · '+esc(sweepRecordSummary(record))+'</p>').join('')+
  '<p class="tiny muted">El rango indicado procede de respuestas subjetivas a un tono digital constante. La respuesta del micrófono, cuando existe, está afectada por su sensibilidad, la sala, ruido y procesamiento del dispositivo. Ninguno mide aisladamente la capacidad del equipo o del oído; no son umbrales clínicos ni se usan para modificar el EQ.</p></div></details>';
}

function sweepPanelMarkup(p){
 const selected=p.channels==='separate'?(sweepSide==='right'?'right':'left'):'both';
 const saved=Object.entries(p.sweepRecords||{}).filter(([side,v])=>['both','left','right'].includes(side)&&v&&Array.isArray(v.events));
 const bounds=sweepBounds(sweepRange==='wide');
 const isRunning=!!sweepSession&&sweepSession.profile===p;
 return `<section class="soft sweep-panel" id="preSweepPanel">
 <strong>Exploración previa de frecuencias · opcional</strong>
 <p class="compact-note">Barrido continuo con nivel digital constante y bajo. Identifica dónde dices escuchar el conjunto oído + equipo + ambiente, no la capacidad de cada uno por separado. La prueba de umbrales posterior sigue siendo necesaria.</p>
 ${p.channels==='separate'?'<div class="row wrap">'+['left','right'].map(side=>'<button type="button" class="btn '+(selected===side?'btn-alt':'btn-ghost')+' grow" data-sweep-side="'+side+'" '+(isRunning?'disabled':'')+'>'+(side==='left'?'Oído izquierdo':'Oído derecho')+'</button>').join('')+'</div>':''}
 <div class="row wrap sweep-choices">
  <button type="button" class="btn ${sweepRange==='standard'?'btn-alt':'btn-ghost'} grow" data-sweep-range="standard" ${isRunning?'disabled':''}>125–8.000 Hz</button>
  <button type="button" class="btn ${sweepRange==='wide'?'btn-alt':'btn-ghost'} grow" data-sweep-range="wide" ${isRunning?'disabled':''}>40–16.000 Hz · ampliado</button>
 </div>
 ${p.type==='headphones'?'':`<label class="sweep-mic-option"><input type="checkbox" id="sweepMicChoice" ${sweepMicEnabled?'checked':''} ${isRunning?'disabled':''}> Comparar también con micrófono (opcional; no calibrado)</label>`}
 <p class="tiny muted">Duración: 22 s · nivel: ${Math.min(-42,getStart(p))} dBFS · rango ${bounds.min}–${bounds.max} Hz. Comienza con volumen físico bajo, cómodo y constante. No uses máximo ni persigas frecuencias inaudibles. En auto, estacionado.</p>
 ${isRunning?`<div class="sweep-live"><p class="center"><strong id="sweepCurrentHz">${Math.round(sweepSession.frequency)} Hz</strong> · <span id="sweepElapsed">0 s</span></p><div class="progress"><div id="sweepProgress" style="width:0%"></div></div><p id="sweepResponse" class="compact-note">Indica cuándo lo escuchas y cuándo dejas de escucharlo.</p><div class="grid2"><button type="button" class="btn btn-alt" data-sweep-response="yes">✓ Lo escucho</button><button type="button" class="btn btn-ghost" data-sweep-response="no">✕ No lo escucho</button></div>${button('■ Detener y conservar observaciones','sweep-finish','btn-ghost full')}</div>`:
 button(sweepStarting?'Preparando…':'▶ Iniciar barrido previo','sweep-start','btn-alt full',sweepStarting?'disabled':'')}
 ${sweepNotice?'<p class="compact-note" id="sweepNotice" role="status">'+esc(sweepNotice)+'</p>':''}
 ${saved.length?'<div class="sweep-saved"><strong>Observaciones previas guardadas</strong>'+saved.map(([side,r])=>'<p class="small"><b>'+(side==='left'?'Izquierdo':side==='right'?'Derecho':'Ambos')+'</b> · '+esc(sweepRecordSummary(r))+'</p>').join('')+'<p class="tiny muted">Estos registros NO se utilizan para calcular el EQ automático ni sustituyen el test adaptativo.</p></div>':''}
 </section>`;
}
function sweepRelease(){
 if(sweepFrame!==null){cancelAnimationFrame(sweepFrame);sweepFrame=null}
 const session=sweepSession;sweepSession=null;
 if(session?.mic){
  try{session.mic.source.disconnect()}catch(e){}
  try{session.mic.analyser.disconnect()}catch(e){}
  try{session.mic.stream.getTracks().forEach(x=>x.stop())}catch(e){}
 }
}
function sweepLogResponse(heard){
 const run=sweepSession;
 if(!run||tone?.mode!=='sweep'||!Number.isFinite(run.frequency))return;
 if(run.events.at(-1)?.heard===heard)return;
 run.events.push({hz:Math.round(run.frequency),heard:!!heard});
 const el=$('#sweepResponse');if(el)el.textContent=heard?'Registrado: lo escucho. Marca cuando deje de oírse.':'Registrado: no lo escucho. Marca si vuelve a oírse.';
}
function sweepMicSample(run,freq){
 const mic=run.mic;if(!mic)return;
 const a=mic.analyser,d=mic.data;a.getFloatFrequencyData(d);
 const idx=Math.round(freq*a.fftSize/run.ctx.sampleRate);
 if(idx<2||idx>=d.length-2)return;
 const value=Math.max(d[idx-1],d[idx],d[idx+1]);
 const baseline=Math.max(mic.baseline[idx-1],mic.baseline[idx],mic.baseline[idx+1]);
 if(!Number.isFinite(value)||!Number.isFinite(baseline))return;
 const delta=clamp(value-baseline,-60,60);
 run.micSamples.push({hz:Math.round(freq),relativeDb:Math.round(delta),detected:value>-85&&delta>=8});
}
function sweepTick(){
 const run=sweepSession;if(!run||page!=='test'||tone?.mode!=='sweep'){sweepFrame=null;return}
 const elapsed=clamp(run.ctx.currentTime-run.start,0,SWEEP_DURATION_S);
 run.frequency=sweepHz(run.min,run.max,elapsed/SWEEP_DURATION_S);
 const h=$('#sweepCurrentHz'),e=$('#sweepElapsed'),bar=$('#sweepProgress');
 if(h)h.textContent=Math.round(run.frequency)+' Hz';
 if(e)e.textContent=elapsed.toFixed(1)+' s';
 if(bar)bar.style.width=Math.round(elapsed/SWEEP_DURATION_S*100)+'%';
 if(elapsed>=SWEEP_DURATION_S){finishSweep();return}
 if(run.mic&&elapsed-run.lastMicAt>=.24){run.lastMicAt=elapsed;sweepMicSample(run,run.frequency)}
 sweepFrame=requestAnimationFrame(sweepTick);
}
function finishSweep(){
 const run=sweepSession;if(!run)return;
 const elapsed=clamp(run.ctx.currentTime-run.start,0,SWEEP_DURATION_S);
 const record={
  method:SWEEP_METHOD,minHz:run.min,maxHz:Math.round(sweepHz(run.min,run.max,elapsed/SWEEP_DURATION_S)),
  levelDbfs:run.db,durationS:Number(elapsed.toFixed(1)),at:Date.now(),
  events:run.events.slice(0,60),micUsed:!!run.mic,mic:run.micSamples.slice(0,100)
 };
 if(tone?.mode==='sweep')stopTone();else sweepRelease();
 // A sweep has no minimum evidentiary value unless the user explicitly responds.
 if(current===run.profile&&page==='test'){
  current.sweepRecords=current.sweepRecords||{};
  current.sweepRecords[run.side]=record;touch();
  sweepNotice=record.events.length?'Barrido guardado: orientativo, no son umbrales.':'Barrido guardado sin respuestas, por lo que no permite concluir un rango.';
  render();
 }
}
async function startSweep(){
 if(!current||page!=='test'||introStep!==0||sweepStarting||sweepSession)return;
 const p=current,side=p.channels==='separate'?(sweepSide==='right'?'right':'left'):'both';
 if(p.channels==='separate'&&!channelsReady(p)){sweepNotice='Comprueba y confirma antes los canales izquierdo y derecho.';render();return}
 if(needsVolumePreview(p)&&!volumeReady){sweepNotice='Confirma primero las referencias de volumen avanzadas.';render();return}
 const limits=sweepBounds(sweepRange==='wide'),db=Math.min(-42,getStart(p));
 sweepStarting=true;sweepNotice='';render();
 let stream=null,mic=null;
 try{
  stopTone();if(playerAudio)playerAudio.pause();
  const ctx=await ensureAudio();
  if(current!==p||page!=='test'||introStep!==0)return;
  const nyquist=ctx.sampleRate/2;
  const high=Math.min(limits.max,Math.floor(nyquist*.84));
  if(high<=limits.min)throw Error('Frecuencia de muestreo insuficiente.');
  if(sweepMicEnabled&&p.type!=='headphones'){
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('No disponible');
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    if(current!==p||page!=='test'||introStep!==0)return;
    const source=ctx.createMediaStreamSource(stream),analyser=ctx.createAnalyser();
    analyser.fftSize=4096;source.connect(analyser);
    const data=new Float32Array(analyser.frequencyBinCount);
    const baseline=new Float32Array(data.length);
    let count=0;
    for(let i=0;i<4;i++){
     analyser.getFloatFrequencyData(data);
     for(let j=0;j<data.length;j++)baseline[j]+=Number.isFinite(data[j])?data[j]:-120;
     count++;
     await new Promise(ok=>setTimeout(ok,80));
    }
    for(let j=0;j<baseline.length;j++)baseline[j]/=count;
    mic={stream,source,analyser,data,baseline};
   }catch(e){
    stream?.getTracks().forEach(t=>t.stop());stream=null;mic=null;
    sweepNotice='Micrófono no disponible. El barrido continuará solo con tus respuestas.';
   }
  }
  if(current!==p||page!=='test'||introStep!==0)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
  if(side!=='both'&&!pan)throw Error('El navegador no permite separar los canales.');
  osc.type='sine';
  const now=ctx.currentTime+.08,amp=Math.pow(10,db/20);
  osc.frequency.setValueAtTime(limits.min,now);
  osc.frequency.exponentialRampToValueAtTime(high,now+SWEEP_DURATION_S);
  if(pan){pan.pan.value=side==='left'?-1:side==='right'?1:0;osc.connect(pan);pan.connect(gain)}else osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(.00000001,now-.01);
  gain.gain.linearRampToValueAtTime(amp,now+.15);
  gain.gain.setValueAtTime(amp,now+SWEEP_DURATION_S-.18);
  gain.gain.linearRampToValueAtTime(.00000001,now+SWEEP_DURATION_S);
  sweepSession={profile:p,side,min:limits.min,max:high,start:now,ctx,db,events:[],
    frequency:limits.min,mic,micSamples:[],lastMicAt:-1};
  tone={mode:'sweep',osc,gain,pan,start:now};
  osc.onended=()=>{try{osc.disconnect();pan?.disconnect();gain.disconnect()}catch(e){}if(sweepSession?.profile===p)finishSweep()};
  osc.start(now);osc.stop(now+SWEEP_DURATION_S+.03);
  render();sweepFrame=requestAnimationFrame(sweepTick);
  stream=null;
 }catch(e){sweepNotice='No se pudo realizar el barrido: '+e.message;render()}
 finally{
  if(stream)stream.getTracks().forEach(x=>x.stop());
  sweepStarting=false;
 }
}
