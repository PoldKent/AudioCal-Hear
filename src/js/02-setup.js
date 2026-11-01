

function contextSelect(field,label,options,value){
 return '<div><label for="context-'+field+'">'+label+'</label><select class="field" id="context-'+field+'" data-context="'+field+'">'+
  options.map(([v,t])=>'<option value="'+v+'" '+(value===v?'selected':'')+'>'+t+'</option>').join('')+'</select></div>';
}
function renderContextFields(){
 const c=temp.context||defaultCalibrationContext(temp.type);
 const scale=contextSelect('eqScale','¿Qué unidad muestran los controles del EQ?',
  [['unknown','No estoy seguro'],['steps','Posiciones / niveles (sin dB)'],['db','Decibelios (dB)']],c.eqScale)+
  (c.eqScale==='steps'?contextSelect('eqStepDb','Equivalencia por paso según manual del equipo',
  [['unknown','Desconocida: no convertir'],['1','1 dB / paso confirmado'],['2','2 dB / paso confirmado']],c.eqStepDb):'');
 let specific='';
 if(temp.type==='car'){
  specific=contextSelect('seat','Asiento de escucha',[['driver','Conductor'],['passenger','Copiloto'],['rear','Fila trasera']],c.seat)+
   contextSelect('windows','Ventanas',[['closed','Cerradas'],['open','Abiertas']],c.windows)+
   contextSelect('engine','Motor',[['off','Apagado'],['on','Encendido']],c.engine)+
   contextSelect('connection','Fuente de audio',[['bluetooth','Bluetooth'],['cable','Cable'],['other','Otra']],c.connection);
 }else if(temp.type==='headphones'){
  specific=contextSelect('subtype','Tipo de auricular',[['overear','Headset / over-ear'],['inear','In-ear'],['onear','On-ear']],c.subtype)+
   contextSelect('anc','Cancelación activa de ruido',[['unknown','No sé'],['on','Activada'],['off','Desactivada'],['none','No tiene']],c.anc)+
   contextSelect('seal','Colocación / sellado',[['unknown','Sin comprobar'],['good','Comprobado / correcto'],['poor','No ajusta bien']],c.seal)+
   contextSelect('connection','Conexión',[['bluetooth','Bluetooth'],['cable','Cable'],['other','Otra']],c.connection);
 }else{
  specific=contextSelect('room','Dónde están los parlantes',[['living','Sala'],['desk','Escritorio'],['studio','Estudio'],['other','Otro']],c.room)+
   contextSelect('position','Posición de escucha',[['main','Punto principal'],['near','Cerca de los parlantes'],['far','Lejos de los parlantes']],c.position)+
   contextSelect('placement','Ubicación',[['unknown','Sin comprobar'],['nearwall','Cerca de pared'],['free','Alejados de paredes']],c.placement);
 }
 return '<section class="context-config"><div class="setup-title"><h2>01B · Tu entorno de escucha</h2><span class="tiny muted">Guarda las condiciones</span></div>'+
  '<div class="grid2">'+specific+scale+'</div><p class="compact-note">Estos datos identifican cuándo es válida la prueba; no añaden correcciones acústicas inventadas. Si la escala de EQ no está confirmada, no asumiremos cuántos dB equivale un nivel.</p></section>';
}

function renderSetup(){const showCustom=temp.preset==='custom',p=current;const duration=timeRange({...temp,measures:{}},0);
return `<section class="hero"><p class="eyebrow">CONFIGURAR · NUEVA CALIBRACIÓN</p><h1>Tu sonido,<br><em>a tu manera.</em></h1><p class="subtle">Elige tu equipo, cómo quieres escucharlo y comienza. Nada de formularios interminables.</p></section>
${p?`<div class="inline-hero"><div class="row" style="justify-content:space-between"><div><span class="tag">PERFIL ACTUAL</span><strong data-profile-name="true" style="display:block;margin-top:7px">${esc(p.name)}</strong><span class="tiny muted">${doneCount(p)}/${plan(p).length} pruebas · ${esc(presets[p.preset]?.short||'Personalizado')}</span></div>${button('Ver ajustes ↗','results','btn-alt')}</div></div>`:''}
<section class="card"><div class="setup-title"><h2>01 · ¿Dónde escucharás?</h2><span class="tiny muted">Selecciona uno</span></div>
<div class="selection-grid">
<button type="button" data-device="car" class="device-tile ${temp.type==='car'?'selected':''}"><span class="tile-icon">🚗</span><strong>Mi auto</strong></button>
<button type="button" data-device="headphones" class="device-tile ${temp.type==='headphones'?'selected':''}"><span class="tile-icon">🎧</span><strong>Auriculares</strong></button>
<button type="button" data-device="speaker" class="device-tile ${temp.type==='speaker'?'selected':''}"><span class="tile-icon">🔊</span><strong>Parlantes</strong></button></div>
${renderContextFields()}
<div class="setup-title"><h2>02 · Elige tu ecualizador</h2><span class="tiny muted">${esc(presets[temp.preset]?.short||'')} seleccionado</span></div>
<div class="preset-grid"><button type="button" data-preset="car7" class="preset-tile ${temp.preset==='car7'?'selected':''}"><strong>🚗 7 bandas</strong><small>64 · 160 · 400 · 1K · 2.5K · 6.25K · 15.625K</small></button><button type="button" data-preset="photo10" class="preset-tile ${temp.preset==='photo10'?'selected':''}"><strong>🎧 10 bandas</strong><small>30 · 60 · 120 · 250 · 500 · 1K · 2K · 4K · 8K · 16K</small></button></div>
<details class="unobtrusive" id="moreFormats" ${!['car7','photo10'].includes(temp.preset)?'open':''}><summary>Más ecualizadores y frecuencias <span class="tiny muted">Opcional</span></summary><div class="inner-detail"><label for="extraPreset">Otros formatos estándar</label><select id="extraPreset" class="field"><option value="">Seleccionar formato…</option>${['iso7','iso10','five','iso15','iso31','custom'].map(id=>`<option value="${id}" ${temp.preset===id?'selected':''}>${esc(presets[id].name)}</option>`).join('')}</select>
<div class="soft"><div class="small muted">Frecuencias del formato elegido</div><div id="freqSummary" class="small" style="margin-top:5px">${esc(temp.bands.map(short).join(' · '))}</div><p class="tiny">${esc(presets[temp.preset]?.note||'')}</p></div>
<div id="customSettings" class="${showCustom?'':'hide'}"><label for="customFreqs">Tus frecuencias (Hz, separadas por comas)</label><input id="customFreqs" class="field" value="${esc(temp.bands.join(', '))}" placeholder="63, 160, 400, 1000, 2500"><p class="tiny muted">De 2 a 31 bandas, entre 20 y 20.000 Hz.</p></div></div></details>
<div class="setup-title"><h2>03 · Elige la experiencia</h2></div>
<p class="tiny muted">Canales de escucha</p><div class="mini-options"><button type="button" data-channels="both" class="choice ${temp.channels==='both'?'selected':''}"><strong>🔊 Juntos</strong><span>Más rápido · ambos canales</span></button><button type="button" data-channels="separate" class="choice ${temp.channels==='separate'?'selected':''}"><strong>🎧 Por oído</strong><span>Izquierdo y derecho</span></button></div>
<p class="tiny muted" style="margin-top:13px">Cobertura de frecuencias</p><div class="mini-options"><button type="button" data-testmode="quick" class="choice ${temp.testMode==='quick'?'selected':''}"><strong>⚡ Rápida</strong><span>Hasta 6 frecuencias representativas; otras se estiman</span></button><button type="button" data-testmode="complete" class="choice ${temp.testMode!=='quick'?'selected':''}"><strong>🎯 Completa</strong><span>Probar cada banda del ecualizador</span></button></div>
${temp.testMode==='quick'&&temp.bands.length>10?'<p class="soft warning small">En este ecualizador, seis frecuencias no alcanzan la cobertura mínima para calcular compensación auditiva automática. Las bandas no medidas se mostrarán como estimadas; elige Completa para obtener más información.</p>':''}<p class="tiny muted" style="margin-top:13px">Precisión de la prueba</p><div class="mini-options"><button type="button" data-passes="1" class="choice ${temp.passes===1?'selected':''}"><strong>⚡ Rápida</strong><span>Una pasada · hasta 60 s por frecuencia</span></button><button type="button" data-passes="2" class="choice ${temp.passes===2?'selected':''}"><strong>🎯 Verificar</strong><span>Dos búsquedas independientes · más tiempo</span></button></div>
<div class="setup-summary" role="status" aria-live="polite"><div class="summary-line"><div><span class="tiny muted">TIEMPO ORIENTATIVO</span><span class="summary-time" id="setupTime">${approxTimeRange(duration)}</span></div><span class="tag" id="setupTrials">${duration.trials} pruebas</span></div><div class="tiny muted" id="setupMaximum">Máximo de tonos: ${timeLabel(duration.max)}</div><details><summary class="tiny" style="cursor:pointer;color:#9de5f5">Cómo se calcula el tiempo</summary><div id="durationEstimate">${durationNotice({...temp,measures:{}},0,false)}</div></details></div>
<label for="deviceName">¿Cómo llamarás a este perfil?</label><input class="field" id="deviceName" maxlength="70" placeholder="Ej.: Mis Soundcore, Auto, Parlantes de sala" value="${esc(temp.name)}">
<details class="unobtrusive"><summary>Rango de prueba y opciones avanzadas <span class="tiny muted">Opcional</span></summary><div class="inner-detail"><p class="small muted">Los niveles de prueba son dBFS digitales, no dB SPL ni ganancias del ecualizador. Rango disponible: −24 a −84 dBFS. Por seguridad empezamos en −36 dBFS; el nivel −24 requiere confirmación.</p><div class="grid2"><div><label for="testStart">Nivel inicial (dBFS)</label><input class="field" id="testStart" type="number" min="-84" max="-24" step="1" value="${temp.testStart}"></div><div><label for="testFloor">Nivel mínimo (dBFS)</label><input class="field" id="testFloor" type="number" min="-84" max="-36" step="1" value="${temp.testFloor}"></div></div><p class="small muted">Cerca de −24 dBFS el tono puede ser demasiado intenso para ciertos auriculares; cerca de −84 dBFS el ruido electrónico puede ocultarlo. No subas el volumen del teléfono para perseguir sonidos.</p></div></details>
<details class="unobtrusive"><summary>Rango de ganancia y opciones avanzadas <span class="tiny muted">Opcional</span></summary><div class="inner-detail"><div class="grid2"><div><label for="eqMin">Mínimo (dB)</label><input class="field" id="eqMin" type="number" min="-30" max="-1" step="1" value="${temp.min}"></div><div><label for="eqMax">Máximo (dB)</label><input class="field" id="eqMax" type="number" min="1" max="30" step="1" value="${temp.max}"></div></div>${temp.preset==='car7'?'<p class="small muted">Para tu auto de 7 bandas: controles de −6 a +6. La equivalencia en dB/paso no se presupone.</p>':''}</div></details>
<details class="unobtrusive"><summary>Comprobar sonido y recomendaciones de seguridad</summary><div class="inner-detail"><p class="compact-note">Conecta el Bluetooth desde el teléfono. Elige un volumen bajo y cómodo, sin subirlo durante las pruebas. Haz la prueba en silencio; en el vehículo, siempre estacionado. <strong>Nunca uses el volumen máximo.</strong></p><div class="row wrap">${button('▶ Probar tono','check','btn-alt grow')}${button('■ Detener','stopaudio','btn-ghost grow')}</div></div></details>
${button('Comenzar mi calibración →','create','btn-primary full bigbutton')}
<p class="tiny center muted">Los perfiles se guardan localmente. Se distinguen bandas medidas y estimadas.</p></section>`}
function plan(p){let bands=testBands(p).sort((a,b)=>Math.abs(Math.log2(a/1000))-Math.abs(Math.log2(b/1000)));let sides=p.channels==='separate'?['left','right']:['both'];return Array.from({length:p.passes},(_,pass)=>bands.flatMap(f=>sides.map(side=>({f,side,pass})))).flat();}

// Estimates are bounded by the new adaptive scheduler; no fixed threshold is promised.
function timeLabel(s){s=Math.max(0,Math.ceil(s));const m=Math.floor(s/60),r=s%60;return m?`${m} min${r?' '+r+' s':''}`:`${r} s`}
function timeRange(p,done=0){
 const trials=plan(p),left=Math.max(0,trials.length-done);
 const completed=trials.filter(x=>recorded(p,x)).length;
 const remaining=Math.max(0,trials.length-completed);
 const pending=trials.filter(x=>!recorded(p,x));
 const max=pending.reduce((n,x)=>n+(x.pass===1?MAX_VERIFY:MAX_FIRST),0);
 const totalMax=trials.reduce((n,x)=>n+(x.pass===1?MAX_VERIFY:MAX_FIRST),0);
 const exampleLow=pending.reduce((n,x)=>n+20,0);
 const exampleHigh=pending.reduce((n,x)=>n+38,0);
 return {trials:trials.length,left:remaining,groupsPending:remaining,max,exampleLow,exampleHigh,maxTotal:totalMax};
}
function durationNotice(p,done=0,inTest=false){const d=timeRange(p,done);
 return `<div class="soft info duration-notice" id="durationEstimate" role="status"><strong>⏱ ${inTest?'Tiempo restante':'Duración aproximada de la calibración'}</strong>
 <p class="small"><strong>${d.left} pruebas pendientes</strong> · ${testBands(p).length} frecuencias medidas de ${p.bands.length} bandas · ${p.channels==='separate'?'oídos por separado':'ambos canales juntos'}.</p>
 <p class="small"><strong>Orientativo: ${timeLabel(d.exampleLow)} a ${timeLabel(d.exampleHigh)}</strong> · depende de tus respuestas.</p>
 <p class="tiny muted">Hasta ${MAX_FIRST} s de tono por prueba; máximo de reproducción pendiente: ${timeLabel(d.max)}. Las pausas y decisiones manuales se excluyen. Pruebas de 3 s, búsqueda de 12 dB y precisión de 1 dB cerca del umbral.</p></div>`;
}
function refreshSetupDuration(){const box=$('#durationEstimate');if(!box||page!=='setup')return;
 const match=($('#customFreqs')&&temp.preset==='custom')?parseBands($('#customFreqs').value):temp.bands;
 if(!match){box.innerHTML='<strong>⏱ Duración</strong><p class="small">Introduce una lista válida de frecuencias para calcularla.</p>';return}
 const wrapper=document.createElement('div');wrapper.innerHTML=durationNotice({...temp,bands:match,measures:{}},0,false);
 box.innerHTML=wrapper.firstElementChild.innerHTML;
 const d=timeRange({...temp,bands:match,measures:{}},0);const time=$('#setupTime'),trials=$('#setupTrials'),max=$('#setupMaximum');if(time)time.textContent=approxTimeRange(d);if(trials)trials.textContent=d.trials+' pruebas';if(max)max.textContent='Máximo de tonos: '+timeLabel(d.max);localize(document.body);
}

const key=(f,s)=>f+'|'+s;
function recorded(p,entry){return Array.isArray(p.measures?.[key(entry.f,entry.side)])&&p.measures[key(entry.f,entry.side)][entry.pass]!==undefined}
function doneCount(p){return plan(p).filter(x=>recorded(p,x)).length}
function firstMissing(p){return plan(p).findIndex(x=>!recorded(p,x))}