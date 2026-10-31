
function renderIntro(){
 const p=current;
 const titles=['Prepara tu equipo','Comprueba el ambiente','Ajusta un volumen seguro'];
 const desc=[p.type==='car'?'Conecta el sistema del automóvil y realiza toda la prueba con el vehículo estacionado.':p.type==='headphones'?'Colócate bien los auriculares y elige el canal de escucha adecuado.':'Conecta tus parlantes y siéntate en tu posición habitual de escucha.',
 'Busca un lugar silencioso. Opcionalmente puedes comprobar el ruido relativo mediante el micrófono; no se miden dB SPL calibrados.',
 'Usa un volumen bajo, cómodo y constante. Nunca el máximo. El rango digital es −24 a −84 dBFS, pero el tono comienza al nivel configurado de forma segura.'];
 return `<section class="hero"><p class="eyebrow">PREPARACIÓN · PASO ${introStep+1} DE 3</p><h1>${titles[introStep]}</h1><p class="subtle">${desc[introStep]}</p></section><section class="card"><div class="wavebox center"><span class="frequency">${introStep===0?'🎧':introStep===1?'🌿':'🔉'}</span><p class="small muted">${introStep===0?'Equipo y colocación':introStep===1?'Ambiente de escucha':'Seguridad auditiva'}</p></div>
 ${introStep===1?`<div class="soft info"><strong>Micrófono opcional</strong><p class="small">${ambientStatus||'Sin datos; puedes continuar sin dar permisos.'}</p></div>${button(ambientBusy?'Analizando…':'Comprobar ruido relativo','ambient','btn-alt full',ambientBusy?'disabled':'')}<p class="tiny muted">No grabamos ni enviamos audio. Los indicadores del teléfono no sustituyen un sonómetro calibrado.</p>`:''}
 ${introStep===2?`<div class="soft warning small"><strong>Advertencia:</strong> −24 dBFS puede sonar demasiado fuerte; −84 dBFS puede ser inaudible por limitaciones del equipo. Detén la prueba si aparece dolor, zumbido o molestia.</div><div class="row wrap">${button('▶ Probar tono breve a volumen bajo','check','btn-alt grow')}${button('■ Detener','stopaudio','btn-ghost grow')}</div>`:''}
 <div class="row wrap" style="margin-top:15px">${introStep>0?button('← Atrás','introBack','btn-ghost grow'):''}${button(introStep===2?'Comenzar examen →':'Siguiente →','introNext','btn-primary grow')}</div></section>`;
}
function renderTest(){if(!current)return `<section class="hero"><h1>Primero crea un perfil</h1><p>Elige tu ecualizador y el dispositivo que vas a calibrar.</p>${button('Ir a configurar','setup','btn-primary')}</section>`;
 if(introStep<3&&!awaitNext)return renderIntro();
 const p=current,items=plan(p),total=items.length,missing=firstMissing(p);
 if(missing<0)return `<div class="card center"><h2>✓ Examen completado</h2><p>Se guardaron ${total} pruebas para <strong data-profile-name="true">${esc(p.name)}</strong>. Si no se encontró el umbral, no se inventa ninguna medida.</p>${button('Ver ajustes recomendados','results','btn-primary full')}${button('Repetir examen desde cero','resettest','btn-ghost full')}</div>`;
 if(awaitNext)return `<section class="hero"><p class="eyebrow">HEAR TEST</p><h1>Resultado guardado</h1></section><section class="card"><p>${esc(sampleNote)}</p><p class="small muted">Faltan ${total-doneCount(p)} pruebas por completar.</p>${button('Siguiente frecuencia →','next','btn-primary full bigbutton')}</section>`;
 const item=items[missing],active=tone?.mode==='test',keyName=item.side==='left'?'OÍDO IZQUIERDO':item.side==='right'?'OÍDO DERECHO':'AMBOS CANALES';
 const id=key(item.f,item.side)+'-'+item.pass;
 if(!trial||trial.id!==id)trial=newTrial(item);
 if(item.pass===1&&!Number.isFinite(trial.heard)){logMeasure('timeout');return renderTest()}
 const pct=Math.round(doneCount(p)/total*100),level=trial.level;
 const phase=trial.phase==='coarse'?'Búsqueda rápida · hasta 12 dB':trial.phase==='refine'?'Ajuste fino · hasta 1 dB':'Confirmación del umbral';
 return `<section class="hero"><p class="eyebrow">HEAR TEST · GUÍA ADAPTATIVA</p><h1>¿Lo escuchaste?</h1><p class="subtle">Cada nivel se reproduce por separado. Responde explícitamente para continuar. No cambies el volumen del teléfono.</p></section>
 <section class="card"><div class="row" style="justify-content:space-between"><strong data-profile-name="true">${esc(p.name)}</strong><span class="tag">${doneCount(p)+1} / ${total}</span></div>
 <div class="progress" style="margin:11px 0"><div style="width:${pct}%"></div></div><p class="center small muted">${keyName} · ${phase} · Repetición ${item.pass+1}/${p.passes}</p>
 <div class="wavebox"><span class="muted small">FRECUENCIA ACTUAL</span><div class="frequency">${fmt(item.f)}</div><p class="small muted">Nivel de la prueba: <strong id="levelText">${level} dBFS</strong></p><div class="wave" aria-hidden="true" id="waves">${Array.from({length:32},(_,i)=>`<span style="height:${6+Math.round(Math.abs(Math.sin(i*.71)*30))}px"></span>`).join('')}</div></div>
 <div class="soft center"><strong>${active?'Escuchando · 3 segundos':trial.awaiting?'¿Escuchaste el sonido?':'Listo para esta frecuencia'}</strong><p class="small muted">${phase} · ${trial.done}/${MAX_STEPS} niveles examinados</p>${active?`<span class="hold-time" id="holdSeconds">3.0 s</span><div class="hold-meter"><div id="holdProgress"></div></div>`:''}</div>
 ${floorReached?'':active||trial.awaiting?`<div class="mini-options"><button class="choice" type="button" data-act="answerYes"><strong>✓ Sí lo escucho</strong><span>El tono era audible</span></button><button class="choice" type="button" data-act="answerNo"><strong>✕ Ya no lo escucho</strong><span>No fue audible</span></button></div>${!active&&trial.awaiting?`<p class="tiny center muted">Puedes volver a reproducir antes de contestar.</p>${button('▶ Repetir este nivel','play','btn-ghost full')}`:''}`:
 `${floorReached?'':button('▶ Reproducir nivel · '+level+' dBFS','play','btn-primary full bigbutton')}`}
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
async function playTone(check=false){
 try{
  stopTone();if(playerAudio)playerAudio.pause();const ctx=await ensureAudio();
  const entry=check?null:plan(current)[firstMissing(current)];if(!check&&!entry)return;
  if(!check&&!trial)trial=newTrial(entry);
  const freq=check?1000:entry.f;
  if(freq>=ctx.sampleRate/2){uiAlert('Tu dispositivo no puede reproducir '+fmt(freq)+' con su frecuencia de muestreo actual.');return}
  const db=check?-42:trial.level;
  if(db>getStart(current||temp)&&!check)return;
  if(db>=-30&&!check&&!trial.highConsent){if(!uiConfirm('Nivel digital alto ('+db+' dBFS). Puede ser demasiado fuerte. Nunca uses el volumen máximo. ¿Quieres continuar a volumen bajo y cómodo?'))return;trial.highConsent=true;}
  const osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
  osc.type='sine';osc.frequency.value=freq;
  const side=entry?.side||'both';
  if(pan){pan.pan.value=side==='left'?-1:side==='right'?1:0;osc.connect(pan);pan.connect(gain)}else osc.connect(gain);
  gain.connect(ctx.destination);
  const now=ctx.currentTime+.025,amp=Math.pow(10,db/20),len=check?1.0:SECONDS_PER_DB;
  gain.gain.setValueAtTime(.00000001,now-.005);
  gain.gain.linearRampToValueAtTime(amp,now+.09);
  gain.gain.setValueAtTime(amp,now+len-.11);
  gain.gain.linearRampToValueAtTime(.00000001,now+len-.015);
  osc.start(now);osc.stop(now+len+.025);
  osc.onended=()=>{try{osc.disconnect();if(pan)pan.disconnect();gain.disconnect()}catch(e){}};
  tone={mode:check?'check':'test',osc,gain,pan,start:now,levels:[db]};
  if(check){setTimeout(()=>{if(tone?.osc===osc)stopTone()},1200);return}
  trial.awaiting=false;
  render();
 }catch(e){uiAlert('No se pudo reproducir el tono: '+e.message)}
}
function logMeasure(kind){
 if(!current)return;
 const e=plan(current)[firstMissing(current)];if(!e)return;
 const k=key(e.f,e.side),db=kind==='heard'&&trial&&Number.isFinite(trial.heard)&&Number.isFinite(trial.missed)?trial.heard:null;
 if(!current.measures[k])current.measures[k]=[];
 current.measures[k][e.pass]={kind,db,elapsedS:trial?.done*SECONDS_PER_DB||0,lastAudibleDb:kind==='stillheard'?getFloor(current):null,at:Date.now(),method:'adaptive-v18-explicit',testStart:getStart(current),testFloor:getFloor(current),history:trial?.history?.slice(0,MAX_STEPS)||[]};
 if(e.pass===0&&current.passes===2&&!Number.isFinite(db))current.measures[k][1]={kind:'skipped',db:null,elapsedS:0,at:Date.now(),method:'adaptive-v18-explicit'};
 sampleNote=kind==='heard'?'Umbral aproximado confirmado ✓':kind==='stillheard'?'Lo seguías escuchando al nivel mínimo; no implica bajar el EQ.':kind==='unheard'?'No era audible al nivel inicial. No aumentes el volumen.':'Resultado incierto: no se inventa un umbral.';
 trial=null;stopTone();floorReached=false;touch();awaitNext=true;render();
}
function answerTone(heard){
 if(!current||!trial||(!trial.awaiting&&tone?.mode!=='test'))return;
 stopTone();trial.awaiting=false;trial.done++;trial.history.push({db:trial.level,heard});
 if(trial.done>=(trial.phase==='verify'?2:MAX_STEPS)&&trial.phase!=='verify'){logMeasure('timeout');return}
 const status=nextTrialLevel(trial,heard,current);
 if(trial.done>=MAX_STEPS&&status==='next'){logMeasure('timeout');return}
 if(status==='stillheard'){floorReached=true;render();return}
 if(status==='unheard'){logMeasure('unheard');return}
 if(status==='uncertain'){logMeasure('timeout');return}
 if(status==='measured'){logMeasure('heard');return}
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
 if(temp.testStart<=temp.testFloor){uiAlert('El nivel inicial debe ser mayor que el mínimo en dBFS.');return}if(temp.testStart>-30&&!uiConfirm('Nivel inicial cercano a −24 dBFS. Puede ser demasiado intenso. Usa volumen bajo y cómodo, nunca máximo. ¿Confirmas esta configuración?'))return;temp.name=name;temp.min=min;temp.max=max;const p={id:'p'+Date.now()+Math.random().toString(36).slice(2,8),name,type:temp.type,preset:temp.preset,bands,min,max,step:1,channels:temp.channels,passes:temp.passes,testMode:temp.testMode,testStart:temp.testStart,testFloor:temp.testFloor,measures:{},manual:{},balance:{},balanceProof:{},taste:{bass:0,voices:0,air:0},createdAt:Date.now(),updatedAt:Date.now()};profiles.unshift(p);current=p;preferenceStage=0;preferencePreview=null;preferenceListened=new Set();currentId=p.id;awaitNext=false;floorReached=false;save();resetBalanceSession(p);introStep=0;trial=null;nav('test')}