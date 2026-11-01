
function renderIntro(){
 const p=current,previewSteps=volumePreviewSteps(p),needsPreview=previewSteps.length>0,
  previewLevel=previewSteps[Math.min(volumePreviewIndex,previewSteps.length-1)];
 const titles=['Prepara tu equipo','Comprueba el ambiente','Ajusta un volumen seguro'];
 const desc=[p.type==='car'?'Conecta el sistema del automóvil y realiza toda la prueba con el vehículo estacionado.':p.type==='headphones'?'Colócate bien los auriculares y elige el canal de escucha adecuado.':'Conecta tus parlantes y siéntate en tu posición habitual de escucha.',
 'Busca un lugar silencioso. Opcionalmente puedes comprobar el ruido relativo mediante el micrófono; no se miden dB SPL calibrados.',
 'Mantén constante el volumen físico durante el examen. El inicio digital de este perfil es '+getStart(p)+' dBFS; una señal digital alta no certifica seguridad acústica. No uses el máximo volumen del amplificador.'];
 return `<section class="hero"><p class="eyebrow">PREPARACIÓN · PASO ${introStep+1} DE 3</p><h1>${titles[introStep]}</h1><p class="subtle">${desc[introStep]}</p></section><section class="card"><div class="wavebox center"><span class="frequency">${introStep===0?'🎧':introStep===1?'🌿':'🔉'}</span><p class="small muted">${introStep===0?'Equipo y colocación':introStep===1?'Ambiente de escucha':'Seguridad auditiva'}</p></div>
 ${introStep===0&&p.channels==='separate'?'<div class="soft info"><strong>Comprobar izquierda y derecha</strong><p class="small">Reproduce cada tono y confirma que solo se escucha en el lado indicado. La comprobación es subjetiva: el navegador no puede certificar el cableado físico.</p><div class="row wrap">'+button('▶ Probar izquierda','checkleft','btn-alt grow')+button('▶ Probar derecha','checkright','btn-alt grow')+'</div><div class="row wrap">'+button((channelVerified.left?'✓ ':'')+'Confirmar izquierda','confirmleft','btn-ghost grow',channelCheckPlayed.left?'':'disabled')+button((channelVerified.right?'✓ ':'')+'Confirmar derecha','confirmright','btn-ghost grow',channelCheckPlayed.right?'':'disabled')+'</div><p class="tiny muted">Es obligatorio confirmar ambos lados antes de la prueba separada. Si el sonido llega a ambos, cambia a canales juntos o revisa la conexión.</p></div>':''}
 ${introStep===1?`<div class="soft info"><strong>Micrófono opcional</strong><p class="small">${ambientStatus||'Sin datos; puedes continuar sin dar permisos.'}</p></div>${button(ambientBusy?'Analizando…':'Comprobar ruido relativo','ambient','btn-alt full',ambientBusy?'disabled':'')}<p class="tiny muted">No grabamos ni enviamos audio. Los indicadores del teléfono no sustituyen un sonómetro calibrado.</p>`:''}
 ${introStep===2?`<div class="soft warning small"><strong>Antes de comenzar:</strong> pon el volumen físico del equipo bajo, con el vehículo estacionado cuando corresponda. Mantén la misma posición y volumen durante el examen. Detén inmediatamente si el sonido es fuerte, molesto o distorsiona. 0 dBFS es amplitud digital máxima, no un valor acústico seguro.</div>
 ${needsPreview?`<div class="soft info"><strong>Comprobación progresiva del volumen del equipo</strong><p class="small">Nivel ${Math.min(volumePreviewIndex+1,previewSteps.length)} de ${previewSteps.length}. Cada referencia solo se reproduce al pulsar el botón. Empieza con el volumen físico muy bajo. Antes de avanzar confirma que el tono fue cómodo y sin distorsión. Puedes reducir el volumen físico y repetir un nivel, pero después no lo modifiques durante el examen.</p>
 <p class="small"><strong>${volumeReady?'Comprobación finalizada':previewLevel+' dBFS digitales'}</strong> ${volumeReady?'El volumen físico sigue sin estar calibrado en dB SPL.':''}</p>
 ${volumeReady?'':button('▶ Reproducir referencia '+previewLevel+' dBFS','previewlevel','btn-alt full bigbutton')}
 ${volumeReady?'':button('Confirmo que fue cómodo y sin distorsión →','confirmlevel','btn-ghost full',volumePreviewPlayed?'':'disabled')}</div>`:
 `<div class="row wrap">${button('▶ Probar tono breve de referencia','check','btn-alt grow')}</div>`}
 <div class="row wrap">${button('■ Detener sonido','stopaudio','btn-ghost grow')}</div>`:''}
 <div class="row wrap" style="margin-top:15px">${introStep>0?button('← Atrás','introBack','btn-ghost grow'):''}${button(introStep===2?'Comenzar examen →':'Siguiente →','introNext','btn-primary grow')}</div></section>`;
}
function renderTest(){if(!current)return `<section class="hero"><h1>Primero crea un perfil</h1><p>Elige tu ecualizador y el dispositivo que vas a calibrar.</p>${button('Ir a configurar','setup','btn-primary')}</section>`;
 if((introStep<3&&!awaitNext)||!channelsReady(current)||(needsVolumePreview(current)&&!volumeReady)){if(!channelsReady(current))introStep=0;else if(needsVolumePreview(current)&&!volumeReady&&introStep>=3)introStep=2;return renderIntro();}
 const p=current,items=plan(p),total=items.length,missing=firstMissing(p);
 if(missing<0)return `<div class="card center"><h2>✓ Búsquedas realizadas</h2><p>Se registraron ${total} búsquedas (no necesariamente ${total} umbrales confirmados) para <strong data-profile-name="true">${esc(p.name)}</strong>. Si no se encontró el umbral, no se inventa ninguna medida.</p>${button('Ver ajustes recomendados','results','btn-primary full')}${button('Repetir examen desde cero','resettest','btn-ghost full')}</div>`;
 if(awaitNext)return `<section class="hero"><p class="eyebrow">HEAR TEST</p><h1>Resultado guardado</h1></section><section class="card"><p>${esc(sampleNote)}</p><p class="small muted">Faltan ${total-doneCount(p)} pruebas por completar.</p>${lastResultKind==='unconfirmed'?button('Repetir esta frecuencia','retryrecord','btn-alt full'):''}${button('Siguiente frecuencia →','next','btn-primary full bigbutton')}</section>`;
 const item=items[missing],active=tone?.mode==='test',keyName=item.side==='left'?'OÍDO IZQUIERDO':item.side==='right'?'OÍDO DERECHO':'AMBOS CANALES';
 const id=key(item.f,item.side)+'-'+item.pass;
 if(!trial||trial.id!==id)trial=newTrial(item);
  const pct=Math.round(doneCount(p)/total*100),level=trial.level;
 const phase=trial.phase==='coarse'?'Búsqueda rápida · hasta 12 dB':trial.phase==='refine'?'Ajuste fino · hasta 1 dB':trial.phase==='recheck'?'Comprobación adicional':'Confirmación del umbral';
 return `<section class="hero"><p class="eyebrow">HEAR TEST · GUÍA ADAPTATIVA</p><h1>¿Lo escuchaste?</h1><p class="subtle">Cada nivel se reproduce por separado. Responde explícitamente para continuar. No cambies el volumen del teléfono.</p></section>
 <section class="card"><div class="row" style="justify-content:space-between"><strong data-profile-name="true">${esc(p.name)}</strong><span class="tag">${doneCount(p)+1} / ${total}</span></div>
 <div class="progress" style="margin:11px 0"><div style="width:${pct}%"></div></div><p class="center small muted">${keyName} · ${phase} · Búsqueda independiente ${item.pass+1}/${p.passes}</p>
 <div class="wavebox"><span class="muted small">FRECUENCIA ACTUAL</span><div class="frequency">${fmt(item.f)}</div><p class="small muted">Nivel de la prueba: <strong id="levelText">${level} dBFS</strong></p><div class="wave" aria-hidden="true" id="waves">${Array.from({length:32},(_,i)=>`<span style="height:${6+Math.round(Math.abs(Math.sin(i*.71)*30))}px"></span>`).join('')}</div></div>
 <div class="soft center"><strong>${active?'Escuchando · 3 segundos':trial.awaiting?'¿Escuchaste el sonido?':'Listo para esta frecuencia'}</strong><p class="small muted">${phase} · ${trial.done}/${MAX_STEPS} niveles examinados</p>${active?`<span class="hold-time" id="holdSeconds">3.0 s</span><div class="hold-meter"><div id="holdProgress"></div></div>`:''}</div>
 ${floorReached?'':trial.awaiting?`<div class="mini-options"><button class="choice" type="button" data-act="answerYes"><strong>✓ Sí lo escucho</strong><span>El tono era audible</span></button><button class="choice" type="button" data-act="answerNo"><strong>✕ Ya no lo escucho</strong><span>No fue audible</span></button></div>${trial.awaiting?`<p class="tiny center muted">Puedes volver a reproducir antes de contestar.</p>${button('▶ Repetir este nivel','play','btn-ghost full')}`:''}`:
 `${floorReached?'':active?'<p class="tiny center muted">Espera a que finalice el tono antes de responder.</p>':button('▶ Reproducir nivel · '+level+' dBFS','play','btn-primary full bigbutton')}`}
 ${floorReached?`<div class="soft info center"><strong>Se alcanzó ${getFloor(p)} dBFS</strong><p class="small">Si seguías escuchando el tono, regístralo. Eso NO implica reducir automáticamente el EQ.</p>${button('Lo seguía escuchando','endheard','btn-alt full')}${button('No estoy seguro','enduncertain','btn-ghost full')}</div>`:''}
 ${awaitNext?`<div class="soft info center"><strong>${esc(sampleNote)}</strong>${button('Siguiente prueba →','next','btn-primary full bigbutton')}</div>`:''}
 <div class="row wrap" style="margin-top:12px">${button('■ Detener','stopaudio','btn-ghost grow')}${button('Reiniciar frecuencia','retry','btn-ghost grow')}</div><p class="tiny muted center">${getStart(p)} a ${getFloor(p)} dBFS · no son niveles acústicos. No uses el volumen máximo ni lo aumentes para buscar tonos inaudibles.</p></section>`;
}
// Three seconds per tone, explicit yes/no answers. A skipped tap never becomes an audible response.
function getElapsed(){return tone?.mode==='test'&&audioCtx?Math.max(0,audioCtx.currentTime-tone.start):0}
function startVisualizer(){
 if(frame)cancelAnimationFrame(frame);
 const update=()=>{
  if(!tone||tone.mode!=='test'||page!=='test'){frame=null;return}
  const elapsed=getElapsed();
  if(elapsed>=SECONDS_PER_DB){stopTone();if(trial)trial.awaiting=true;render();return}
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
  stopTone();if(playerAudio)playerAudio.pause();const ctx=await ensureAudio();
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
   if(page!=='test'||introStep!==2||volumeReady||steps[volumePreviewIndex]!==previewDb){uiAlert('La referencia avanzada debe reproducirse en orden y de forma manual.');return}
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
   if(isPreview&&tone?.osc===osc){tone=null;volumePreviewPlayed=true;if(page==='test'&&introStep===2)render()}
  };
  tone={mode:isPreview?'preview':check?'check':'test',osc,gain,pan,start:now,levels:[db]};
  if(check){if(side==='left'||side==='right')channelCheckPlayed[side]=true;
   if(!isPreview)setTimeout(()=>{if(tone?.osc===osc)stopTone()},1200);
   render();return}
  trial.awaiting=false;
  render();
 }catch(e){uiAlert('No se pudo reproducir el tono: '+e.message)}
}
let lastResultKind=null,lastRecordedEntry=null;
function logMeasure(kind){
 if(!current)return;
 const e=plan(current)[firstMissing(current)];if(!e)return;
 const k=key(e.f,e.side),db=kind==='heard'&&trial&&Number.isFinite(trial.heard)&&Number.isFinite(trial.missed)?trial.heard:null;
 lastResultKind=kind;lastRecordedEntry={f:e.f,side:e.side,pass:e.pass};
 if(!current.measures[k])current.measures[k]=[];
 current.measures[k][e.pass]={kind,db,elapsedS:trial?.done*SECONDS_PER_DB||0,lastAudibleDb:kind==='stillheard'?getFloor(current):null,at:Date.now(),method:e.pass===1?INDEPENDENT_PASS_METHOD:'adaptive-v20-search',testStart:getStart(current),testFloor:getFloor(current),history:trial?.history?.slice(0,MAX_STEPS)||[]};

 sampleNote=kind==='heard'?'Umbral aproximado confirmado ✓':kind==='stillheard'?'Lo seguías escuchando al nivel mínimo; no implica bajar el EQ.':kind==='unheard'?'No era audible al nivel inicial. No aumentes el volumen.':kind==='unconfirmed'?'No se pudo confirmar el límite de esta frecuencia. Se guardaron tus respuestas; puedes repetirla sin rehacer todo el examen.':'Prueba terminada sin un umbral confirmado. No se inventa una medida.';
 trial=null;stopTone();floorReached=false;touch();awaitNext=true;render();
}
function answerTone(heard){
 if(!current||!trial||!trial.awaiting||tone?.mode==='test')return;
 stopTone();trial.awaiting=false;trial.done++;trial.history.push({db:trial.level,heard});
 const status=nextTrialLevel(trial,heard,current);
  if(status==='stillheard'){floorReached=true;render();return}
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
function createProfile(){const name=$('#deviceName')?.value.trim()||'Mi equipo '+new Date().toLocaleDateString('es');const min=Number($('#eqMin')?.value),max=Number($('#eqMax')?.value);if(!Number.isFinite(min)||!Number.isFinite(max)||min>=0||max<=0||min<-30||max>30){uiAlert('Introduce límites de dB válidos: mínimo negativo y máximo positivo (hasta 30 dB).');return}
 let bands=temp.preset==='custom'?parseBands($('#customFreqs')?.value||''):temp.bands.slice();if(!bands){uiAlert('Revisa las frecuencias personalizadas: entre 2 y 31 valores, orden ascendente, de 20 a 20.000 Hz.');return}
 if(temp.testStart<=temp.testFloor){uiAlert('El nivel inicial debe ser mayor que el mínimo en dBFS.');return}
 if(temp.testStart>maxTestStart(temp)){uiAlert('El nivel inicial supera el límite del tipo de dispositivo.');return}
 if(temp.testStart>MAX_SAFE_DB&&!uiConfirm('Rango digital avanzado: '+temp.testStart+' dBFS puede sonar muy fuerte o distorsionar. Empieza con el volumen físico muy bajo y completa la comprobación gradual. ¿Deseas habilitarlo para este equipo?'))return;
 if(temp.testStart>=-30&&temp.testStart<=MAX_SAFE_DB&&!uiConfirm('Nivel digital alto ('+temp.testStart+' dBFS). Puede ser excesivo. No uses el máximo volumen físico. ¿Continuar?'))return;temp.name=name;temp.min=min;temp.max=max;const p={id:'p'+Date.now()+Math.random().toString(36).slice(2,8),name,type:temp.type,preset:temp.preset,bands,min,max,step:1,channels:temp.channels,passes:temp.passes,testMode:temp.testMode,testBandPlan:temp.testMode==='quick'?testBands(temp):null,testStart:temp.testStart,testFloor:temp.testFloor,measures:{},loudness:{},context:normalizeCalibrationContext(temp.context,temp.type),manual:{},balance:{},balanceProof:{},taste:{bass:0,voices:0,air:0},createdAt:Date.now(),updatedAt:Date.now()};profiles.unshift(p);current=p;preferenceStage=0;preferencePreview=null;preferenceListened=new Set();currentId=p.id;awaitNext=false;floorReached=false;save();resetLoudnessSession();resetBalanceSession(p);resetChannelCheck();resetVolumePreview();introStep=0;trial=null;nav('test')}