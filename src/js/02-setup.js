

function contextSelect(field,label,options,value){
 return '<div><label for="context-'+field+'">'+label+'</label><select class="field" id="context-'+field+'" data-context="'+field+'">'+
  options.map(([v,t])=>'<option value="'+v+'" '+(value===v?'selected':'')+'>'+t+'</option>').join('')+'</select></div>';
}
function renderContextFields(){
 const c=temp.context||defaultCalibrationContext(temp.type);
 const scale=contextSelect('eqScale','¿Qué unidad muestran los controles del EQ?',
  [['unknown','No estoy seguro'],['steps','Posiciones / niveles (sin dB)'],['db','Decibelios (dB)']],c.eqScale)+
  (c.eqScale==='steps'?contextSelect('eqStepDb','Equivalencia por paso según manual del equipo',
  [['unknown','Sin comprobar: no convertir'],['1','1 dB / paso (según manual)'],['2','2 dB / paso (según manual)'],['3','3 dB / paso (según manual)']],c.eqStepDb):'');
 const unit=c.eqScale==='steps'?'posiciones':c.eqScale==='db'?'dB del control':'unidades por confirmar';
 const physical='<div class="grid2"><div><label for="controlMin">Mínimo del control ('+unit+')</label><input class="field" id="controlMin" type="number" min="-30" max="-1" step="1" value="'+temp.controlMin+'"></div>'+
  '<div><label for="controlMax">Máximo del control ('+unit+')</label><input class="field" id="controlMax" type="number" min="1" max="30" step="1" value="'+temp.controlMax+'"></div></div>'+
  '<p class="tiny muted">Recorrido físico de los controles, independiente del límite de corrección en dB. En el auto de referencia: −6 a +6 posiciones; 3 dB/paso declarados según manual, revisables para otros modelos.</p>';
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
  '<div class="grid2">'+specific+scale+'</div>'+physical+
  '<div class="soft info small"><strong>Cómo influye realmente en el EQ:</strong> '+esc(calibrationContextEqExplanation({type:temp.type,context:c,bands:temp.bands}))+'</div>'+
  '<p class="compact-note">El entorno no genera ganancias acústicas en dB. Los dB/paso deben provenir del manual; Hear no comprueba su exactitud. Sin equivalencia no se calculan posiciones físicas.</p></section>';
}

function renderSetup(){
 const p=current,mode=temp.context?.eqScale||'unknown',value=temp.context?.eqStepDb||'unknown';
 const quickFormats=['car7','photo10','five','iso10'];
 const options=Object.entries(presets).filter(([id])=>!quickFormats.includes(id));
 const duration=timeRange({...temp,measures:{}},0);
 const showCustom=temp.preset==='custom';
 return `<section class="hero"><p class="eyebrow">HEAR · NUEVA CALIBRACIÓN</p><h1>Escucha, mide<br><em>y ajusta.</em></h1><p class="subtle">Tu test de frecuencias y un ecualizador que puedas aplicar. Solo necesitamos conocer tu equipo.</p></section>
 ${p?`<div class="inline-hero"><div class="row" style="justify-content:space-between"><div><strong data-profile-name="true">${esc(p.name)}</strong><p class="small muted">${doneCount(p)}/${plan(p).length} frecuencias evaluadas</p></div>${button('Ver mi resultado','results','btn-alt')}</div></div>`:''}
 <section class="card" id="simpleSetup">
 <div class="setup-title"><h2>1 · ¿Dónde escucharás?</h2></div>
 <div class="selection-grid">
 <button type="button" data-device="car" class="device-tile ${temp.type==='car'?'selected':''}"><span class="tile-icon">🚗</span><strong>Auto</strong></button>
 <button type="button" data-device="headphones" class="device-tile ${temp.type==='headphones'?'selected':''}"><span class="tile-icon">🎧</span><strong>Auriculares</strong></button>
 <button type="button" data-device="speaker" class="device-tile ${temp.type==='speaker'?'selected':''}"><span class="tile-icon">🔊</span><strong>Parlantes</strong></button></div>
 <div class="setup-title"><h2>2 · ¿Qué ecualizador tiene?</h2><span class="tiny muted">Confirma sus frecuencias</span></div>
 <div class="preset-grid">${quickFormats.map(id=>`<button type="button" data-preset="${id}" class="preset-tile ${temp.preset===id?'selected':''}"><strong>${esc(presets[id].short)}</strong><small>${presets[id].bands.map(short).join(' · ')}</small></button>`).join('')}</div>
 <details class="unobtrusive" id="moreFormats" ${quickFormats.includes(temp.preset)?'':'open'}><summary>Más ecualizadores (2–31 bandas) y frecuencias propias</summary><div class="inner-detail"><label for="extraPreset">Elige el formato que ves en tu dispositivo</label><select class="field" id="extraPreset"><option value="">Elegir otro formato…</option>${options.map(([id,o])=>`<option value="${id}" ${id===temp.preset?'selected':''}>${esc(o.name)}</option>`).join('')}</select></div></details>
 <div id="customSettings" class="${showCustom?'':'hide'}"><label for="customFreqs">Frecuencias de tu ecualizador (Hz)</label><input id="customFreqs" class="field" value="${esc(temp.bands.join(', '))}" placeholder="63, 160, 400, 1000, 2500"><p class="small muted" id="freqSummary">${esc(temp.bands.map(short).join(' · '))}</p></div>
 <p class="small muted">Los formatos genéricos son ejemplos: verifica que sus frecuencias coincidan con las de tu dispositivo.</p>
 <div class="setup-title"><h2>3 · ¿Cómo se mueven sus controles?</h2></div>
 <div class="mini-options">
 <button type="button" data-eq-unit="db" class="choice ${mode==='db'?'selected':''}"><strong>dB</strong><span>Indican decibelios</span></button>
 <button type="button" data-eq-unit="steps" class="choice ${mode==='steps'?'selected':''}"><strong>Pasos</strong><span>Ej.: −6 a +6</span></button>
 <button type="button" data-eq-unit="unknown" class="choice ${mode==='unknown'?'selected':''}"><strong>No sé</strong><span>Conservar sin conversión</span></button></div>
 ${mode==='steps'?`<div class="soft"><p class="small"><strong>¿Cuántos dB representa cada paso?</strong> Si no lo indica tu equipo, deja «No sé».</p><div class="mini-options">${['unknown','1','2','3','4'].map(v=>`<button type="button" data-eq-step="${v}" class="choice ${value===v?'selected':''}"><strong>${v==='unknown'?'No sé':v+' dB'}</strong></button>`).join('')}</div><p class="tiny muted">La equivalencia se toma del manual del equipo; Hear no la adivina.</p></div>`:''}
 <label for="deviceName">Nombre del perfil (opcional)</label><input class="field" id="deviceName" maxlength="70" placeholder="Mi auto, mis auriculares…" value="${esc(temp.name)}">
 <div class="setup-summary" role="status"><div class="summary-line"><div><span class="tiny muted">TEST COMPLETO DE FRECUENCIAS</span><span class="summary-time" id="setupTime">${approxTimeRange(duration)}</span></div><span class="tag" id="setupTrials">${duration.trials} pruebas</span></div><div class="tiny muted" id="setupMaximum">Máximo de tonos: ${timeLabel(duration.max)}</div></div>
 <details class="unobtrusive" id="technicalSettings"><summary>Opciones técnicas y límites del ecualizador · opcional</summary><div class="inner-detail">
 <p class="small muted">El test completo cubre todas las bandas y conserva cada respuesta. Repeticiones y parámetros técnicos no son necesarios para empezar.</p>
 <div class="grid2"><div><label for="controlMin">Mínimo del control</label><input class="field" id="controlMin" type="number" min="-30" max="-1" value="${temp.controlMin}"></div><div><label for="controlMax">Máximo del control</label><input class="field" id="controlMax" type="number" min="1" max="30" value="${temp.controlMax}"></div></div>
 <div class="grid2"><div><label for="eqMin">Límite digital inferior (dB)</label><input class="field" id="eqMin" type="number" min="-30" max="-1" value="${temp.min}"></div><div><label for="eqMax">Límite digital superior (dB)</label><input class="field" id="eqMax" type="number" min="1" max="30" value="${temp.max}"></div></div>
 <div class="grid2"><div><label for="testStart">Nivel digital inicial (dBFS)</label><input class="field" id="testStart" type="number" min="-99" max="${maxTestStart(temp)}" value="${temp.testStart}"></div><div><label for="testFloor">Nivel digital final (dBFS)</label><input class="field" id="testFloor" type="number" min="-100" max="-36" value="${temp.testFloor}"></div></div>
 <p class="small muted">−36 dBFS es el inicio normal; auto y parlantes admiten hasta 0 dBFS solo con comprobación progresiva. dBFS no mide el volumen físico en tu oído.</p>
 <div class="mini-options"><button type="button" data-channels="both" class="choice ${temp.channels==='both'?'selected':''}">Ambos canales</button><button type="button" data-channels="separate" class="choice ${temp.channels==='separate'?'selected':''}">Izquierdo / derecho</button></div>
 <div class="mini-options"><button type="button" data-testmode="complete" class="choice ${temp.testMode==='complete'?'selected':''}">Todas las bandas</button><button type="button" data-testmode="quick" class="choice ${temp.testMode==='quick'?'selected':''}">Muestra abreviada</button></div>
 <div class="mini-options"><button type="button" data-passes="1" class="choice ${temp.passes===1?'selected':''}">Una pasada</button><button type="button" data-passes="2" class="choice ${temp.passes===2?'selected':''}">Dos pasadas</button></div>
 <p class="small muted">La conversión a posiciones no se mostrará como verificada si desconocemos los dB por paso. Se guardan las frecuencias y respuestas originales.</p>
 </div></details>
 ${button('Comenzar mi test de frecuencias →','create','btn-primary full bigbutton')}
 <p class="tiny center muted">Conservamos las mediciones por banda, su confianza y tu ecualizador original.</p>
 </section>`;
}
function plan(p){let bands=testBands(p).sort((a,b)=>Math.abs(Math.log2(a/1000))-Math.abs(Math.log2(b/1000)));let sides=p.channels==='separate'?['left','right']:['both'];return Array.from({length:p.passes},(_,pass)=>bands.flatMap(f=>sides.map(side=>({f,side,pass})))).flat();}

// Estimates are bounded by the new adaptive scheduler; no fixed threshold is promised.
function timeLabel(s){s=Math.max(0,Math.ceil(s));const m=Math.floor(s/60),r=s%60;return m?`${m} min${r?' '+r+' s':''}`:`${r} s`}
function timeRange(p,done=0){
 const trials=plan(p),left=Math.max(0,trials.length-done);
 const completed=trials.filter(x=>recorded(p,x)).length;
 const remaining=Math.max(0,trials.length-completed);
 const pending=trials.filter(x=>!recorded(p,x));
 const max=pending.reduce((n,x)=>n+MAX_STEPS*SECONDS_PER_DB,0);
 const totalMax=trials.reduce((n,x)=>n+(x.pass===1?MAX_VERIFY:MAX_FIRST),0);
 const exampleLow=pending.reduce((n,x)=>n+12,0);
 const exampleHigh=pending.reduce((n,x)=>n+30,0);
 return {trials:trials.length,left:remaining,groupsPending:remaining,max,exampleLow,exampleHigh,maxTotal:totalMax};
}
function durationNotice(p,done=0,inTest=false){const d=timeRange(p,done);
 return `<div class="soft info duration-notice" id="durationEstimate" role="status"><strong>⏱ ${inTest?'Tiempo restante':'Duración aproximada de la calibración'}</strong>
 <p class="small"><strong>${d.left} pruebas pendientes</strong> · ${testBands(p).length} frecuencias medidas de ${p.bands.length} bandas · ${p.channels==='separate'?'oídos por separado':'ambos canales juntos'}.</p>
 <p class="small"><strong>Orientativo: ${timeLabel(d.exampleLow)} a ${timeLabel(d.exampleHigh)}</strong> · depende de tus respuestas.</p>
 <p class="tiny muted">Hasta ${MAX_FIRST} s orientativos de tono por prueba; máximo de reproducción pendiente: ${timeLabel(d.max)}. Las pausas y decisiones manuales se excluyen. Hasta 3 s por tono; puedes responder antes. Búsqueda de 12 dB, ajuste a unos 2 dB y máximo dos comprobaciones finales.</p></div>`;
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