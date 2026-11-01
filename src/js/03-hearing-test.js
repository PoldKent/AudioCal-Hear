
// Experimental microphone accompaniment: spectral presence only, not acoustic EQ.
let micAssist={stream:null,context:null,source:null,analyser:null,enabled:false,status:''};
function stopMicAssist(){
 if(micAssist.stream)for(const track of micAssist.stream.getTracks())track.stop();
 try{micAssist.source?.disconnect()}catch(e){}
 if(micAssist.context)void micAssist.context.close().catch(()=>{});
 micAssist.stream=null;micAssist.context=null;micAssist.source=null;micAssist.analyser=null;micAssist.enabled=false;
}
async function toggleMicAssist(){
 if(micAssist.enabled){stopMicAssist();micAssist.status='Micrófono desactivado.';render();return}
 if(!current||current.type==='headphones'){micAssist.status='El micrófono del celular no mide el sonido dentro de tus auriculares.';render();return}
 if(!navigator.mediaDevices?.getUserMedia){micAssist.status='Micrófono no disponible en este navegador. Puedes continuar por oído.';render();return}
 micAssist.status='Solicitando acceso al micrófono…';render();
 const profileId=current.id;
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  if(current?.id!==profileId||page!=='test'){stream.getTracks().forEach(t=>t.stop());return}
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){stream.getTracks().forEach(t=>t.stop());throw Error('Web Audio no disponible')}
  const ctx=new AC();
  await ctx.resume();
  const source=ctx.createMediaStreamSource(stream),analyser=ctx.createAnalyser();
  analyser.fftSize=8192;analyser.smoothingTimeConstant=0;
  source.connect(analyser); // Never connect the microphone back to audio output.
  micAssist={stream,context:ctx,source,analyser,enabled:true,status:'Micrófono activo. Se registra si aparece una señal compatible con cada tono; no mide dB SPL.'};
 }catch(e){stopMicAssist();micAssist.status='Sin lectura de micrófono. Puedes completar el mismo test únicamente con tus oídos.'}
 render();
}
function readMicToneContrast(frequency){
 if(!micAssist.enabled||!micAssist.analyser||!micAssist.context)return null;
 const analyser=micAssist.analyser,rate=micAssist.context.sampleRate;
 if(frequency<40||frequency>Math.min(16000,rate/2-150))return null;
 const bins=new Float32Array(analyser.frequencyBinCount);
 analyser.getFloatFrequencyData(bins);
 const center=Math.round(frequency*analyser.fftSize/rate);
 if(center<4||center>=bins.length-12)return null;
 const near=bins.slice(Math.max(2,center-1),center+2).filter(Number.isFinite);
 const background=[];
 for(let i=Math.max(2,center-12);i<=Math.min(bins.length-1,center+12);i++)
  if(Math.abs(i-center)>=4&&Number.isFinite(bins[i]))background.push(bins[i]);
 if(!near.length||background.length<6)return null;
 const signal=Math.max(...near),baseline=median(background);
 if(!Number.isFinite(signal)||!Number.isFinite(baseline))return null;
 return Number(clamp(signal-baseline,-30,60).toFixed(1));
}
function sampleMicAssist(f,expectedOsc,profileId){
 if(!micAssist.enabled||!current||current.id!==profileId)return;
 setTimeout(()=>{
  if(!micAssist.enabled||current?.id!==profileId||tone?.osc!==expectedOsc||page!=='test')return;
  const contrast=readMicToneContrast(f);
  if(contrast===null)return;
  // A spectral peak is not a calibrated sound-pressure or room-response measurement.
  // Keep it separate from subjective thresholds and automatic EQ decisions.
  if(!current.acoustic||typeof current.acoustic!=='object')current.acoustic={};
  current.acoustic[f]={contrastDb:contrast,detected:contrast>=7,at:Date.now(),method:'mic-spectral-presence-unvalidated'};
  save();
  const status=$('#micAssistLive');
  if(status)status.textContent=contrast>=7?'Micrófono: señal compatible detectada (sin calibración).':'Micrófono: señal no concluyente; confía en tu oído.';
 },1150);
}
function renderIntro(){
 const p=current,previewSteps=volumePreviewSteps(p),needsPreview=previewSteps.length>0;
 const previewLevel=previewSteps[Math.min(volumePreviewIndex,previewSteps.length-1)];
 const channelSection=p.channels==='separate'?'<div class="soft info"><strong>Comprobar izquierda y derecha</strong><p class="small">Comprueba ambos canales una vez antes del examen. Esta verificación subjetiva evita confundir los oídos.</p><div class="row wrap">'+button('▶ Probar izquierda','checkleft','btn-alt grow')+button('▶ Probar derecha','checkright','btn-alt grow')+'</div><div class="row wrap">'+button((channelVerified.left?'✓ ':'')+'Confirmar izquierda','confirmleft','btn-ghost grow',channelCheckPlayed.left?'':'disabled')+button((channelVerified.right?'✓ ':'')+'Confirmar derecha','confirmright','btn-ghost grow',channelCheckPlayed.right?'':'disabled')+'</div></div>':'';
 return `<section class="hero"><p class="eyebrow">PREPARACIÓN · UN SOLO PASO</p><h1>Prepara tu sonido</h1><p class="subtle">Busca silencio, mantén el volumen físico bajo y constante y responde mientras suena cada tono. ${p.type==='car'?'En el automóvil, realiza el examen estacionado.':''}</p></section>
 <section class="card">
 <div class="soft warning small"><strong>Volumen cómodo y constante.</strong> No uses el máximo, no subas el volumen para encontrar tonos que no oyes y detén el examen ante molestia, dolor, zumbido o distorsión. Los dBFS no son dB SPL medidos.</div>
 ${channelSection}
 ${needsPreview?`<div class="soft info"><strong>Comprobación gradual de nivel avanzado</strong><p class="small">Escucha cada referencia con el amplificador inicialmente bajo y confirma únicamente si fue cómoda y sin distorsión. Este control es necesario cuando solicitas niveles digitales altos para auto o parlantes.</p><p class="small">${volumeReady?'Referencias completadas':('Referencia '+(volumePreviewIndex+1)+' / '+previewSteps.length+': '+previewLevel+' dBFS')}</p>${volumeReady?'':button('▶ Reproducir referencia','previewlevel','btn-alt full')}${volumeReady?'':button('Confirmar nivel cómodo →','confirmlevel','btn-ghost full',volumePreviewPlayed?'':'disabled')}</div>`:
 `<div class="row wrap">${button('▶ Escuchar tono de referencia','check','btn-alt grow')}${button('■ Detener','stopaudio','btn-ghost grow')}</div>`}
 ${p.type!=='headphones'?`<div class="soft info"><strong>Micrófono de apoyo · opcional</strong><p class="small">Escucha con tus oídos como siempre. El micrófono puede comprobar la presencia de los tonos en tu auto o parlantes, pero no reemplaza el test ni calibra dB SPL.</p>${button(micAssist.enabled?'Desactivar micrófono':'Activar micrófono de apoyo','mic-assist','btn-alt full')}<p class="tiny muted">${esc(micAssist.status||'Si no funciona, la calibración auditiva continúa igual.')}</p></div>`:'<p class="small muted">En auriculares usamos tus oídos: el micrófono del teléfono no mide lo que llega dentro de ellos.</p>'}
 ${button('Comenzar examen completo →','introNext','btn-primary full bigbutton')}
 </section>`;
}

let inlineMatch=null;
function inlineMatchFor(entry){
 const id=inlineLoudnessKey(entry);
 if(!inlineMatch||inlineMatch.id!==id||inlineMatch.profileId!==current?.id)inlineMatch={id,profileId:current?.id,entry,offsetDb:0,tries:[],listened:false,message:''};
 return inlineMatch;
}
function inlineMatchBase(p,entry){
 const observation=p.measures?.[key(entry.f,entry.side)]?.[entry.pass];
 if(!observation||observation.kind==='unheard'||observation.kind==='unconfirmed'||observation.kind==='skipped'||observation.kind==='timeout')return null;
 const nearest=Number.isFinite(observation.db)?observation.db:Number.isFinite(observation.audibleDb)?observation.audibleDb:-55;
 const ceiling=Math.min(-36,getStart(p));
 const level=clamp(Math.round(nearest+12),-54,ceiling);
 return level>=nearest+4?level:null;
}
function renderInlineMatch(p,entry,total){
 const state=inlineMatchFor(entry),base=inlineMatchBase(p,entry),n=state.tries.length;
 const outcome=state.message||'Escucha dos tonos seguidos: primero la referencia y después esta frecuencia. Elige cuál te parece más fuerte.';
 return `<section class="hero"><p class="eyebrow">TEST AUDITIVO · MISMA PASADA</p><h1>¿Cuál suena más fuerte?</h1><p class="subtle">Ya medimos cuándo escuchas ${fmt(entry.f)}. Ahora comprobamos cómo percibes su intensidad. No cambies el volumen.</p></section>
 <section class="card"><div class="row" style="justify-content:space-between"><strong>${fmt(entry.f)} · ${entry.side==='both'?'ambos':entry.side==='left'?'izquierdo':'derecho'}</strong><span class="tag">2 / 2 · ${doneCount(p)} / ${total}</span></div>
 <div class="wavebox center"><div class="frequency">${fmt(entry.f)}</div><p class="small muted">Comparación ${Math.min(n+1,3)} de 3 como máximo</p></div>
 <p class="small">${esc(outcome)}</p>
 ${base===null?'<p class="small muted">No hay margen de audibilidad suficiente para una comparación fiable a volumen cómodo. Puedes guardar esta frecuencia como inconclusa.</p>':
 `<div class="soft info"><strong>Primero 1 kHz · después ${fmt(entry.f)}</strong><p class="small">Reproduce ambos tonos con una sola pulsación.</p>${button('▶ Escuchar los dos tonos','inline-play','btn-primary full bigbutton')}</div>`}
 ${state.listened&&base!==null?`<div class="mini-options"><button class="choice" type="button" data-inline-choice="reference"><strong>El primero</strong><span>La referencia</span></button><button class="choice" type="button" data-inline-choice="similar"><strong>Igual de fuertes</strong><span>Suena parecido</span></button><button class="choice" type="button" data-inline-choice="target"><strong>El segundo</strong><span>Esta frecuencia</span></button></div>`:
 '<p class="tiny muted">Escucha los dos tonos antes de responder.</p>'}
 ${button('No puedo compararlos · continuar','inline-skip','btn-ghost full')}
 <p class="tiny muted">Los resultados son relativos y exploratorios. No se convierten directamente en ganancias de ecualización.</p></section>`;
}
async function playInlineMatch(){
 const p=current,e=inlineLoudnessPending(p);
 if(!p||page!=='test'||!e)return;
 const state=inlineMatchFor(e),base=inlineMatchBase(p,e);
 if(base===null)return;
 const profile=p,matchId=state.id;
 try{
  stopTone();
  const ctx=await ensureAudio();
  if(current!==profile||page!=='test'||inlineLoudnessKey(inlineLoudnessPending(profile)||{})!==matchId)return;
  if(e.f>=ctx.sampleRate/2||1000>=ctx.sampleRate/2){inlineRecord('unavailable');return}
  if(e.side!=='both'&&!ctx.createStereoPanner){inlineRecord('unavailable');return}
  const osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
  osc.type='sine';
  const start=ctx.currentTime+.045,referenceDbfs=base,targetDbfs=clamp(base+state.offsetDb,-65,Math.min(-36,getStart(p)));
  const amp=x=>Math.pow(10,x/20);
  osc.frequency.setValueAtTime(1000,start);
  osc.frequency.setValueAtTime(e.f,start+1.3);
  if(pan){pan.pan.value=e.side==='left'?-1:e.side==='right'?1:0;osc.connect(pan);pan.connect(gain)}
  else osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(.00000001,start);
  gain.gain.linearRampToValueAtTime(amp(referenceDbfs),start+.10);
  gain.gain.setValueAtTime(amp(referenceDbfs),start+.85);
  gain.gain.linearRampToValueAtTime(.00000001,start+1.0);
  gain.gain.setValueAtTime(.00000001,start+1.3);
  gain.gain.linearRampToValueAtTime(amp(targetDbfs),start+1.4);
  gain.gain.setValueAtTime(amp(targetDbfs),start+2.15);
  gain.gain.linearRampToValueAtTime(.00000001,start+2.3);
  osc.start(start);osc.stop(start+2.34);
  state.listened=false;
  tone={mode:'inline-match',osc,gain,pan,start};
  osc.onended=()=>{
   try{osc.disconnect();gain.disconnect();pan?.disconnect()}catch(error){}
   if(tone?.osc!==osc)return;
   tone=null;
   if(current===profile&&page==='test'&&inlineLoudnessKey(inlineLoudnessPending(profile)||{})===matchId){
    state.listened=true;render();
   }
  };
  render();
 }catch(error){state.message='No se pudo reproducir esta comparación; puedes continuar sin inventar un resultado.';render()}
}
function inlineRecord(status){
 const p=current,e=inlineLoudnessPending(p);
 if(!p||!e)return;
 const state=inlineMatchFor(e),base=inlineMatchBase(p,e);
 if(!p.inlineLoudness||typeof p.inlineLoudness!=='object')p.inlineLoudness={};
 p.inlineLoudness[state.id]={status,offsetDb:status==='matched'?state.offsetDb:null,
  referenceDbfs:base,trials:state.tries.slice(),at:Date.now(),method:'in-pass-relative-loudness-v1'};
 inlineMatch=null;stopTone();touch();render();
}
function answerInlineMatch(answer){
 const e=inlineLoudnessPending(current),state=e?inlineMatchFor(e):null;
 if(!state||!state.listened||tone?.mode==='inline-match'||!['reference','target','similar'].includes(answer))return;
 state.tries.push({answer,offsetDb:state.offsetDb});
 state.listened=false;
 if(answer==='similar'){inlineRecord('matched');return}
 if(state.tries.length>=3){inlineRecord('bounded');return}
 const base=inlineMatchBase(current,e);
 const next=state.offsetDb+(answer==='reference'?3:-3);
 const bounded=clamp(next,-9,9),ceiling=Math.min(-36,getStart(current));
 if(base===null||base+bounded>ceiling||base+bounded< -65){inlineRecord('bounded');return}
 state.offsetDb=bounded;
 state.message='Escuchemos otra vez con una pequeña variación automática. No cambies el volumen del dispositivo.';
 render();
}

function renderTest(){if(!current)return `<section class="hero"><h1>Primero crea un perfil</h1><p>Elige tu ecualizador y el dispositivo que vas a calibrar.</p>${button('Ir a configurar','setup','btn-primary')}</section>`;
 if(introStep<3||!channelsReady(current)||(needsVolumePreview(current)&&!volumeReady)){introStep=0;return renderIntro();}
 const p=current,items=plan(p),total=items.length,missing=firstMissing(p);
 const pending=inlineLoudnessPending(p);
 if(pending){
  if(pending.f===1000){p.inlineLoudness[inlineLoudnessKey(pending)]={status:'reference',offsetDb:null,referenceDbfs:null,trials:[],method:'in-pass-relative-loudness-v1',at:Date.now()};touch();return renderTest()}
  return renderInlineMatch(p,pending,total);
 }
 if(missing<0)return `<div class="card center"><h2>✓ Búsquedas realizadas</h2><p>Se registraron ${total} búsquedas (no necesariamente ${total} umbrales confirmados) para <strong data-profile-name="true">${esc(p.name)}</strong>. Si no se encontró el umbral, no se inventa ninguna medida.</p>${button('Ver ajustes recomendados','results','btn-primary full')}${button('Repetir examen desde cero','resettest','btn-ghost full')}</div>`;
 const item=items[missing],active=tone?.mode==='test',keyName=item.side==='left'?'OÍDO IZQUIERDO':item.side==='right'?'OÍDO DERECHO':'AMBOS CANALES';
 const id=key(item.f,item.side)+'-'+item.pass;
 if(!trial||trial.id!==id)trial=newTrial(item);
  const pct=Math.round(doneCount(p)/total*100),level=trial.level;
 const phase=trial.phase==='coarse'?'Búsqueda rápida · hasta 12 dB':trial.phase==='refine'?'Ajuste fino · intervalo de 2 dB':'Confirmación breve · máximo 2';
 return `<section class="hero"><p class="eyebrow">HEAR TEST · GUÍA ADAPTATIVA</p><h1>¿Lo escuchaste?</h1><p class="subtle">Responde tan pronto como lo escuches o decidas que no lo escuchas: el tono se detiene al tocar tu respuesta. Mantén fijo el volumen físico.</p></section>
 <section class="card"><div class="row" style="justify-content:space-between"><strong data-profile-name="true">${esc(p.name)}</strong><span class="tag">${doneCount(p)+1} / ${total}</span></div>
 <div class="progress" style="margin:11px 0"><div style="width:${pct}%"></div></div><p class="center small muted">${keyName} · ${phase} · Búsqueda independiente ${item.pass+1}/${p.passes}</p>
 <div class="wavebox"><span class="muted small">FRECUENCIA ACTUAL</span><div class="frequency">${fmt(item.f)}</div><p class="small muted">Nivel de la prueba: <strong id="levelText">${level} dBFS</strong></p><div class="wave" aria-hidden="true" id="waves">${Array.from({length:32},(_,i)=>`<span style="height:${6+Math.round(Math.abs(Math.sin(i*.71)*30))}px"></span>`).join('')}</div></div>
 ${p.type!=='headphones'?`<p class="small muted" id="micAssistLive">${micAssist.enabled?'Micrófono de apoyo activo.':esc(p.acoustic?.[item.f]?.detected?'Micrófono: señal compatible observada.':'El test funciona sin micrófono.')}</p>`:''}
 <div class="soft center"><strong>${active?'Escuchando · 3 segundos':trial.awaiting?'¿Escuchaste el sonido?':'Listo para esta frecuencia'}</strong><p class="small muted">${phase} · ${trial.done}/${MAX_STEPS} niveles examinados</p>${active?`<span class="hold-time" id="holdSeconds">3.0 s</span><div class="hold-meter"><div id="holdProgress"></div></div>`:''}</div>
 ${floorReached?'':(trial.awaiting||active)?`<div class="mini-options"><button class="choice" type="button" data-act="answerYes"><strong>✓ Sí lo escucho</strong><span>Interrumpir y registrar</span></button><button class="choice" type="button" data-act="answerNo"><strong>✕ No lo escucho</strong><span>Interrumpir y registrar</span></button></div>${trial.awaiting&&!active?'<p class="tiny center muted">Puedes repetir el nivel antes de contestar.</p>'+button('▶ Reproducir este nivel','play','btn-ghost full'):''}`:
 button('▶ Reproducir nivel · '+level+' dBFS','play','btn-primary full bigbutton')}
 ${floorReached?`<div class="soft info center"><strong>Se alcanzó ${getFloor(p)} dBFS</strong><p class="small">Si seguías escuchando el tono, regístralo. Eso NO implica reducir automáticamente el EQ.</p>${button('Lo seguía escuchando','endheard','btn-alt full')}${button('No estoy seguro','enduncertain','btn-ghost full')}</div>`:''}
 <div class="row wrap" style="margin-top:12px">${button('■ Detener','stopaudio','btn-ghost grow')}${button('Reiniciar frecuencia','retry','btn-ghost grow')}</div><p class="tiny muted center">${getStart(p)} a ${getFloor(p)} dBFS · no son niveles acústicos. No uses el volumen máximo ni lo aumentes para buscar tonos inaudibles.</p></section>`;
}
// Three seconds per tone, explicit yes/no answers. A skipped tap never becomes an audible response.
function getElapsed(){return tone?.mode==='test'&&audioCtx?Math.max(0,audioCtx.currentTime-tone.start):0}
function startVisualizer(){
 if(frame)cancelAnimationFrame(frame);
 const update=()=>{
  if(!tone||tone.mode!=='test'||page!=='test'){frame=null;return}
  const elapsed=getElapsed();
  if(elapsed>=SECONDS_PER_DB){if(trial){trial.listenedSeconds=(trial.listenedSeconds||0)+SECONDS_PER_DB;trial.awaiting=true;}stopTone();render();return}
  const counter=$('#holdSeconds'),meter=$('#holdProgress');
  if(counter)counter.textContent=(SECONDS_PER_DB-elapsed).toFixed(1)+' s';
  if(meter)meter.style.width=clamp(elapsed/SECONDS_PER_DB*100,0,100)+'%';
  frame=requestAnimationFrame(update);
 };frame=requestAnimationFrame(update);
}
async function ensureAudio(){if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio no está disponible. Usa Chrome o Safari actualizado.');audioCtx=new AC()}if(audioCtx.state!=='running')await audioCtx.resume();return audioCtx}
function stopTone(){if(frame){cancelAnimationFrame(frame);frame=null}if(!tone)return;const t=tone;tone=null;try{if(audioCtx){t.gain.gain.cancelScheduledValues(audioCtx.currentTime);t.gain.gain.setTargetAtTime(.00000001,audioCtx.currentTime,.012)}t.osc.stop((audioCtx?.currentTime||0)+.05)}catch(e){try{t.osc.stop()}catch(e2){}}}
async function playTone(check=false,checkSide='both',previewDb=null){
 try{
  const originalProfile=current,originalPage=page,originalIntro=introStep;
  stopTone();if(playerAudio)playerAudio.pause();const ctx=await ensureAudio();
  // A suspended AudioContext can resume after a profile or screen changed.
  // Never let a high-level preview play on an unexpected device/page.
  if(current!==originalProfile||page!==originalPage||introStep!==originalIntro)return;
  const entry=check?null:plan(current)[firstMissing(current)];if(!check&&!entry)return;
  if(!check&&!trial)trial=newTrial(entry);
  const freq=check?1000:entry.f;
  if(freq>=ctx.sampleRate/2){uiAlert('Tu dispositivo no puede reproducir '+fmt(freq)+' con su frecuencia de muestreo actual.');return}
  if(!check&&!channelsReady(current)){uiAlert('Confirma antes los canales izquierdo y derecho.');return}
  const side=check?checkSide:entry.side;
  if(side!=='both'&&!ctx.createStereoPanner){uiAlert('Este navegador no permite separar los canales. Usa la prueba con ambos canales o un navegador compatible.');return}
  const isPreview=check&&Number.isFinite(previewDb);
  if(isPreview){
   const steps=volumePreviewSteps(current);
   if(page!=='test'||introStep!==0||volumeReady||steps[volumePreviewIndex]!==previewDb){uiAlert('La referencia avanzada debe reproducirse en orden y de forma manual.');return}
  }
  if(!check&&needsVolumePreview(current)&&!volumeReady){uiAlert('Completa primero la comprobación progresiva de volumen.');return}
  const db=isPreview?previewDb:check?-42:trial.level;
  if(db>maxTestStart(current||temp)||db>DIGITAL_REFERENCE_DBFS||db<TEST_END_DB){uiAlert('Nivel digital fuera del rango permitido para este equipo.');return}
  if(db>getStart(current||temp)&&!check)return;
  if(db>=-30&&!check&&!trial.highConsent&&!(needsVolumePreview(current)&&volumeReady)){if(!uiConfirm('Nivel digital alto ('+db+' dBFS). Puede ser demasiado fuerte. Nunca uses el volumen máximo. ¿Quieres continuar a volumen bajo y cómodo?'))return;trial.highConsent=true;}
  const osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
  osc.type='sine';osc.frequency.value=freq;
  if(pan){pan.pan.value=side==='left'?-1:side==='right'?1:0;osc.connect(pan);pan.connect(gain)}else osc.connect(gain);
  gain.connect(ctx.destination);
  const now=ctx.currentTime+.025,amp=Math.pow(10,db/20),len=isPreview?2:check?1.0:SECONDS_PER_DB;
  gain.gain.setValueAtTime(.00000001,now-.005);
  gain.gain.linearRampToValueAtTime(amp,now+(isPreview?.8:.09));
  gain.gain.setValueAtTime(amp,now+len-(isPreview?.3:.11));
  gain.gain.linearRampToValueAtTime(.00000001,now+len-.015);
  osc.start(now);osc.stop(now+len+.025);
  osc.onended=()=>{
   try{osc.disconnect();if(pan)pan.disconnect();gain.disconnect()}catch(e){}
   if(isPreview&&tone?.osc===osc){tone=null;volumePreviewPlayed=true;if(page==='test'&&introStep===0)render()}
  };
  tone={mode:isPreview?'preview':check?'check':'test',osc,gain,pan,start:now,levels:[db]};
  if(check){if(side==='left'||side==='right')channelCheckPlayed[side]=true;
   if(!isPreview)setTimeout(()=>{if(tone?.osc===osc)stopTone()},1200);
   render();return}
  trial.awaiting=true;
  if(micAssist.enabled&&current.type!=='headphones')sampleMicAssist(entry.f,osc,current.id);
  render();
 }catch(e){uiAlert('No se pudo reproducir el tono: '+e.message)}
}
let lastResultKind=null,lastRecordedEntry=null;
function logMeasure(kind){
 if(!current)return;
 const e=plan(current)[firstMissing(current)];if(!e)return;
 const k=key(e.f,e.side),estimate=trial?trialEstimate(trial):null;
 const usable=estimate&&Number.isFinite(estimate.db);
 const finalKind=(kind==='unconfirmed'&&usable)?'heard':kind;
 const db=finalKind==='heard'&&usable?estimate.db:null;
 lastResultKind=finalKind;lastRecordedEntry={f:e.f,side:e.side,pass:e.pass};
 if(!current.measures[k])current.measures[k]=[];
 current.measures[k][e.pass]={
  kind:finalKind,db,confidence:usable?estimate.confidence:'bounded',
  audibleDb:estimate?.audibleDb??null,inaudibleDb:estimate?.inaudibleDb??null,
  uncertaintyDb:estimate?.uncertaintyDb??null,contradictions:estimate?.contradictions??0,
  elapsedS:Number((trial?.listenedSeconds||0).toFixed(2)),
  lastAudibleDb:finalKind==='stillheard'?getFloor(current):null,
  at:Date.now(),method:e.pass===1?INDEPENDENT_PASS_METHOD:'adaptive-v21-short',
  testStart:getStart(current),testFloor:getFloor(current),history:trial?.history?.slice(0,MAX_STEPS)||[]
 };
 sampleNote=finalKind==='heard'?'Estimación guardada con confianza '+estimate.confidence:
  finalKind==='stillheard'?'Audible hasta el límite inferior; se guardó esta observación.':
  finalKind==='unheard'?'No audible al nivel inicial; se guardó este límite.':'Respuestas guardadas; sin dos extremos para estimar un umbral.';
 trial=null;stopTone();floorReached=false;awaitNext=false;
 if(current.integratedLoudness&&!current.inlineLoudness?.[inlineLoudnessKey(e)]){
  const observation=current.measures[k][e.pass];
  const status=e.f===1000?'reference':(observation.kind==='heard'||observation.kind==='stillheard')?null:'unavailable';
  if(status){if(!current.inlineLoudness)current.inlineLoudness={};current.inlineLoudness[inlineLoudnessKey(e)]={status,offsetDb:null,referenceDbfs:null,trials:[],method:'in-pass-relative-loudness-v1',at:Date.now()}}
 }
 touch();render();
}
function answerTone(heard){
 if(!current||!trial||!trial.awaiting)return;
 if(tone?.mode==='test')trial.listenedSeconds=(trial.listenedSeconds||0)+Math.max(0,Math.min(SECONDS_PER_DB,getElapsed()));
 stopTone();trial.awaiting=false;trial.done++;
 trial.history.push({db:trial.level,heard});
 const status=nextTrialLevel(trial,heard,current);
 if(status==='stillheard'){logMeasure('stillheard');return}
 if(status==='unheard'){logMeasure('unheard');return}
 if(status==='unconfirmed'){logMeasure('unconfirmed');return}
 if(status==='measured'){logMeasure('heard');return}
 if(trial.done>=MAX_STEPS&&status==='next'){logMeasure('unconfirmed');return}
 render();
}
async function checkAmbient(){
 if(ambientBusy)return;ambientBusy=true;ambientStatus='Comprobando el micrófono…';render();
 let stream=null,ctx=null;
 try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Micrófono no disponible.');
 stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
 ctx=new (window.AudioContext||window.webkitAudioContext)();const src=ctx.createMediaStreamSource(stream),an=ctx.createAnalyser();an.fftSize=2048;src.connect(an);
 const arr=new Float32Array(an.fftSize);let rmsSum=0,seen=0;
 for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,150));an.getFloatTimeDomainData(arr);let v=0;for(const x of arr)v+=x*x;rmsSum+=Math.sqrt(v/arr.length);seen++}
 const relative=20*Math.log10(Math.max(1e-8,rmsSum/Math.max(1,seen)));
 ambientStatus=relative>-38?'Se detectó actividad relativa en el micrófono: busca un lugar más silencioso si es posible.':'El micrófono detecta poca señal relativa. No garantiza un ambiente acústico calibrado.';
 }catch(e){ambientStatus='Comprobación no disponible o permiso denegado. Puedes continuar sin micrófono.'}
 finally{stream?.getTracks().forEach(t=>t.stop());if(ctx)await ctx.close().catch(()=>{});ambientBusy=false;render()}
}
function parseBands(s){const arr=s.split(/[,;\s]+/).filter(Boolean).map(v=>Number(v));if(arr.length<2||arr.length>31||arr.some(x=>!Number.isFinite(x)||x<20||x>20000)||new Set(arr).size!==arr.length||arr.some((x,i)=>i&&x<=arr[i-1]))return null;return arr}
function createProfile(){const name=$('#deviceName')?.value.trim()||'Mi equipo '+new Date().toLocaleDateString('es');const min=Number($('#eqMin')?.value),max=Number($('#eqMax')?.value),controlMin=Number($('#controlMin')?.value),controlMax=Number($('#controlMax')?.value);if(!Number.isFinite(min)||!Number.isFinite(max)||min>=0||max<=0||min<-30||max>30){uiAlert('Introduce límites de dB válidos: mínimo negativo y máximo positivo (hasta 30 dB).');return}
 if(!Number.isInteger(controlMin)||!Number.isInteger(controlMax)||controlMin>=0||controlMax<=0||controlMin<-30||controlMax>30){uiAlert('Revisa el recorrido del control: mínimo negativo y máximo positivo, en las unidades que muestra el equipo.');return}
 let bands=temp.preset==='custom'?parseBands($('#customFreqs')?.value||''):temp.bands.slice();if(!bands){uiAlert('Revisa las frecuencias personalizadas: entre 2 y 31 valores, orden ascendente, de 20 a 20.000 Hz.');return}
 if(temp.testStart<=temp.testFloor){uiAlert('El nivel inicial debe ser mayor que el mínimo en dBFS.');return}
 if(temp.testStart>maxTestStart(temp)){uiAlert('El nivel inicial supera el límite del tipo de dispositivo.');return}
 if(temp.testStart>MAX_SAFE_DB&&!uiConfirm('Rango digital avanzado: '+temp.testStart+' dBFS puede sonar muy fuerte o distorsionar. Empieza con el volumen físico muy bajo y completa la comprobación gradual. ¿Deseas habilitarlo para este equipo?'))return;
 if(temp.testStart>=-30&&temp.testStart<=MAX_SAFE_DB&&!uiConfirm('Nivel digital alto ('+temp.testStart+' dBFS). Puede ser excesivo. No uses el máximo volumen físico. ¿Continuar?'))return;temp.name=name;temp.min=min;temp.max=max;temp.controlMin=controlMin;temp.controlMax=controlMax;const p={id:'p'+Date.now()+Math.random().toString(36).slice(2,8),name,type:temp.type,preset:temp.preset,bands,min,max,controlMin,controlMax,step:1,channels:temp.channels,passes:temp.passes,testMode:temp.testMode,testBandPlan:temp.testMode==='quick'?testBands(temp):null,testStart:temp.testStart,testFloor:temp.testFloor,measures:{},loudness:{},integratedLoudness:true,inlineLoudness:{},acoustic:{},context:normalizeCalibrationContext(temp.context,temp.type),manual:{},balance:{},balanceProof:{},taste:{bass:0,voices:0,air:0},createdAt:Date.now(),updatedAt:Date.now()};profiles.unshift(p);current=p;preferenceStage=0;preferencePreview=null;preferenceListened=new Set();currentId=p.id;awaitNext=false;floorReached=false;save();resetLoudnessSession();resetBalanceSession(p);resetChannelCheck();resetVolumePreview();introStep=0;trial=null;nav('test')}