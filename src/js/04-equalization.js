
function gather(p){
 const collect=f=>{let samples=[];for(const side of p.channels==='separate'?['left','right']:['both']){const arr=p.measures[key(f,side)]||[];const valid=arr.filter(r=>r&&r.db!==null&&Number.isFinite(r.db)).map(r=>r.db);if(valid.length){samples.push({db:median(valid),quality:Math.max(...valid)-Math.min(...valid)<=6&&valid.length>=2?'good':'low',side})}}if(!samples.length)return {f,db:null,quality:'unmeasurable'};const values=samples.map(s=>s.db),spread=Math.max(...values)-Math.min(...values);return {f,db:median(values),quality:spread>9?'mixed':samples.every(s=>s.quality==='good')?'good':'low'}};
 const allMeasured=[...new Set(Object.keys(p.measures).map(k=>Number(k.split('|')[0])).filter(Number.isFinite))].map(collect).filter(x=>x.db!==null).sort((a,b)=>a.f-b.f);
 return p.bands.map(f=>{let direct=collect(f);if(direct.db!==null||(p.testMode!=='quick'&&!p.formatFrom))return direct;
 const lo=allMeasured.filter(x=>x.f<f).pop(),hi=allMeasured.find(x=>x.f>f);
 // Interpolate only between observed points, never extrapolate outside tested range or over large gaps.
 if(!lo||!hi||hi.f/lo.f>5)return direct;
 const frac=Math.log(f/lo.f)/Math.log(hi.f/lo.f),db=lo.db+(hi.db-lo.db)*frac;
 return {f,db,quality:'interpolated',derived:true};
 });
}
function recommend(p){const data=gather(p),measured=data.filter(x=>x.db!==null&&!x.derived);if(measured.length<Math.max(3,Math.ceil(p.bands.length*.6)))return data.map(x=>({...x,base:0,gain:clamp(roundTo((Number(p.manual?.[x.f])||0)+tasteGain(x.f,cleanTaste(p))+balanceGain(p,x.f),p.step),p.min,p.max)}));
 const xs=measured.map(x=>Math.log2(x.f/1000)),ys=measured.map(x=>x.db);let minx=Math.min(...xs),maxx=Math.max(...xs);let z=xs.map(x=>2*(x-minx)/(maxx-minx||1)-1);
 // Low-order regression captures broad frequency-dependent perception instead of flattening normal hearing sensitivity.
 const deg=Math.min(2,measured.length-2);const N=deg+1;let a=Array.from({length:N},(_,i)=>Array.from({length:N+1},(_,j)=>j===N?ys.reduce((s,y,k)=>s+y*z[k]**i,0):z.reduce((s,v)=>s+v**(i+j),0)));
 for(let i=0;i<N;i++){let pi=i;for(let j=i+1;j<N;j++)if(Math.abs(a[j][i])>Math.abs(a[pi][i]))pi=j;[a[i],a[pi]]=[a[pi],a[i]];let pivot=a[i][i];if(Math.abs(pivot)<1e-7)continue;for(let k=i;k<=N;k++)a[i][k]/=pivot;for(let j=0;j<N;j++)if(j!==i){let c=a[j][i];for(let k=i;k<=N;k++)a[j][k]-=c*a[i][k]}}
 const coeff=a.map(row=>row[N]);const known=measured.map((x,i)=>({f:x.f,db:x.db,z:z[i]}));
 return data.map((point,i)=>{let base=0;if(point.db!==null){const zn=2*(Math.log2(point.f/1000)-minx)/(maxx-minx||1)-1;const trend=coeff.reduce((s,c,j)=>s+c*zn**j,0);const diff=point.db-trend;let boost=diff>0?diff*.35:diff*.46;const edge=(i===0||i===data.length-1);base=clamp(boost,edge?-1.5:-4,edge?1.5:3);if(point.quality==='low'||point.quality==='mixed')base*=.65; if(point.quality==='interpolated')base*=.5; if(point.quality==='unmeasurable')base=0;
 // A smooth shelf of broad perceived deficits is intentionally NOT boosted automatically.
 }else base=0;const manual=Number(p.manual?.[point.f])||0;const taste=tasteGain(point.f,cleanTaste(p));const gain=clamp(roundTo(base+manual+taste+balanceGain(p,point.f),p.step),p.min,p.max);
 return {...point,base,gain}})}
function balanceMarkup(){
 if(!current)return '';
 const p=current;
 if(!p.bands.includes(balanceFreq))resetBalanceSession(p);
 const gain=balanceGain(p,balanceFreq),proof=p.balanceProof?.[balanceFreq]||[];
 const completed=balanceRound>=2;
 const selector=`<label for="balanceFrequency">Frecuencia que quieres equilibrar</label><select id="balanceFrequency" class="field" aria-label="Frecuencia de equilibrio">${p.bands.map(f=>`<option value="${f}" ${f===balanceFreq?'selected':''}>${fmt(f)} · ${balanceGain(p,f)>0?'+':''}${balanceGain(p,f)} dB</option>`).join('')}</select>`;
 const old=p.measures?.[key(balanceFreq,p.channels==='separate'?'left':'both')]||[];
 const atFloor=old.some(x=>x?.kind==='stillheard');
 return `<div class="balance-panel"><p class="small muted">Primero escucha tu canción. A y B cambian solamente esta banda, con un volumen general fijo y margen para evitar saturación; la sonoridad percibida puede variar.</p>
 <div class="balance-progress"><span class="tag">${Math.min(balanceQueueIndex+1,balanceQueue.length)}/${balanceQueue.length} frecuencias sugeridas</span><span class="tag">${completed?'Comprobación finalizada':'Comparación '+(balanceRound+1)+' de 2'}</span></div>
 ${selector}<div class="soft balance-result"><strong>Ajuste confirmado en esta banda: ${gain>0?'+':''}${gain} dB</strong><p class="tiny muted">${atFloor?'El tono siguió audible al final: esto NO indica exceso de volumen.':'No se recorta ninguna frecuencia solo por ser audible.'} ${proof.length?'Comprobaciones guardadas: '+proof.length+'.':''}</p></div>
 ${completed?`<div class="soft info"><strong>${esc(balanceStatus||'Comparación terminada.')}</strong><p class="small">Puedes continuar con otra banda o volver a comprobar esta. Los ajustes de preferencia y los umbrales se guardan por separado.</p><div class="row wrap">${button('Siguiente frecuencia →','balance-next','btn-primary grow')}${button('↻ Repetir esta banda','balance-repeat','btn-alt grow')}</div></div>`:
 `<p class="small">Escucha ambas versiones durante varios segundos, sin tocar el volumen. El orden de A/B se invierte al verificar para reducir el sesgo.</p><div class="grid2"><button type="button" class="choice ${balancePreview==='A'?'selected':''}" data-balance-preview="A"><strong>▶ Escuchar A</strong><span>Versión A</span></button><button type="button" class="choice ${balancePreview==='B'?'selected':''}" data-balance-preview="B"><strong>▶ Escuchar B</strong><span>Versión B</span></button></div><div class="row wrap" style="margin-top:10px"><button type="button" class="btn btn-alt grow" data-balance-choose="A">Prefiero A</button><button type="button" class="btn btn-alt grow" data-balance-choose="B">Prefiero B</button><button type="button" class="btn btn-ghost grow" data-balance-choose="same">No hay diferencia</button></div><p id="balanceFeedback" role="status" class="tiny muted">${esc(balanceStatus||'Compara comodidad y naturalidad, no solamente cuál suena más fuerte.')}</p>`}
 <p class="tiny muted">Dos respuestas consistentes producen un paso de 2 dB; una sola preferencia, 1 dB. Los recortes están limitados a −6 dB y requieren sesiones repetidas. No es una medición clínica ni una igualación perfecta de sonoridad.</p></div>`;
}
function refreshBalanceUI(){const target=$('#balanceTrainer');if(target)target.innerHTML=balanceMarkup();updatePlayerFilters(preferencePreview?previewTaste():null);localize(document.body)}
function balanceChoose(choice){
 if(!current||balanceRound>=2)return;
 if(balanceListened.size<2){balanceStatus='Escucha ambas opciones A y B con la música reproduciéndose antes de elegir.';refreshBalanceUI();return}
 const direction=choice==='same'?0:Math.sign(balanceRound===0?(choice==='A'?-1:1):(choice==='B'?-1:1));
 balanceChoices.push(direction);balancePreview=null;balanceListened=new Set();balanceStatus='';balanceRound++;
 if(balanceRound===2){
  const dirs=balanceChoices.filter(Boolean);let delta=0;
  if(dirs.length&&(dirs.length===1||dirs.every(x=>x===dirs[0])))delta=dirs[0]*(dirs.length===2?2:1);
  const old=balanceGain(current,balanceFreq),next=clamp(old+delta,-6,3),actual=next-old;
  if(!current.balance||typeof current.balance!=='object')current.balance={};
  if(!current.balanceProof||typeof current.balanceProof!=='object')current.balanceProof={};
  current.balance[balanceFreq]=next;
  const history=Array.isArray(current.balanceProof[balanceFreq])?current.balanceProof[balanceFreq]:[];
  current.balanceProof[balanceFreq]=[...history.slice(-9),{at:Date.now(),choices:balanceChoices.slice(),change:actual,method:'music-ab-two-rounds'}];
  balanceStatus=actual===0?'Sin cambio: respuestas no concluyentes, iguales o límite alcanzado.':`Ajuste ${actual>0?'+':''}${actual} dB confirmado con tu música.`;
  touch();refreshResultsUI();
 }
 refreshBalanceUI();
}

function preferenceMarkup(){
 if(!current)return '';
 if(preferenceStage>=preferenceRounds.length)return `<div class="soft info"><strong>✓ Preferencias guardadas</strong><p class="small">Puedes comprobar el resultado con y sin EQ usando el reproductor. Si no prefieres ningún cambio, la curva original sigue siendo válida.</p>${button('Volver a comparar','restartprefs','btn-ghost full')}</div>`;
 const round=preferenceRounds[preferenceStage],v=cleanTaste(current)[round.zone];
 return `<div class="soft"><strong>Comparación ${preferenceStage+1} de ${preferenceRounds.length}: ${round.title}</strong><p class="small">${round.desc} · diferencia A/B de hasta 4 dB en esa zona. Ajuste guardado: ${v>0?'+':''}${v} dB.</p><div class="grid2"><button type="button" class="choice ${preferencePreview==='A'?'selected':''}" data-pref-preview="A"><strong>▶ Escuchar A</strong><span>Versión más suave en esta zona</span></button><button type="button" class="choice ${preferencePreview==='B'?'selected':''}" data-pref-preview="B"><strong>▶ Escuchar B</strong><span>Versión más destacada</span></button></div><label>¿Cuál te resulta mejor o más cómoda?</label><div class="row wrap"><button type="button" class="btn btn-alt grow" data-pref-choose="A">Prefiero A</button><button type="button" class="btn btn-alt grow" data-pref-choose="B">Prefiero B</button><button type="button" class="btn btn-ghost grow" data-pref-choose="same">Iguales</button></div><p class="tiny muted" id="prefStatus">Reproduce una canción y escucha A y B durante varios segundos cada una antes de elegir. Si no notas diferencia, elige Iguales. No aumentes el volumen.</p></div>`;
}
function previewTaste(){
 const t=cleanTaste(current);
 if(preferenceStage>=preferenceRounds.length||!preferencePreview)return t;
 const zone=preferenceRounds[preferenceStage].zone;
 t[zone]=clamp(t[zone]+(preferencePreview==='A'?-2:2),-3,3);
 return t;
}
function updateSelectedEditor(){if(!current||page!=='results')return;const r=recommend(current);const x=r.find(q=>q.f===selectedEqFreq)||r[0];if(!x)return;selectedEqFreq=x.f;
 document.querySelectorAll('[data-eq-select]').forEach(b=>{const is=Number(b.dataset.eqSelect)===x.f;b.classList.toggle('selected',is);b.setAttribute('aria-pressed',String(is))});
 const label=$('#eqSelectedLabel'),value=$('#eqSelectedValue'),slider=$('#eqSlider'),tip=$('#eqSelectedNote');if(label)label.textContent=fmt(x.f);if(value)value.textContent=eqMark(x)+' dB';if(tip)tip.textContent=selectedBandInfo(x);
 if(slider){slider.value=String(x.gain);slider.setAttribute('aria-label',`Ganancia de ${fmt(x.f)} en decibelios`)}
 $('#eqEditor')?.querySelectorAll('[data-adjust]').forEach(b=>b.dataset.adjust=String(x.f));localize(document.body);
}
function refreshResultsUI(){
 if(!current||page!=='results')return;
 const r=recommend(current);let count=0;
 for(const b of r){
  if(b.gain!==0)count++;
  const band=document.querySelector(`[data-eq-band="${b.f}"]`);
  if(band){band.setAttribute('aria-label',`Editar ${fmt(b.f)}, ${(b.gain>0?'+':'')+b.gain} decibelios`);const value=band.querySelector('.eqval'),fill=band.querySelector('.eqfill');if(value)value.textContent=(b.gain>0?'+':'')+b.gain;
   if(fill){const span=Math.max(1,current.max-current.min),center=100*current.max/span,y=100*(current.max-b.gain)/span;fill.style.top=Math.min(center,y)+'%';fill.style.height=Math.max(2,Math.abs(center-y))+'%'}}
  const val=document.querySelector(`[data-eq-value="${b.f}"]`);if(val)val.innerHTML=(b.gain>0?'+':'')+b.gain+' <small style="display:inline;color:var(--muted)">dB</small>';
 }
 updateSelectedEditor();
 const countEl=document.querySelector('.stat-grid .stat:nth-child(3) strong');if(countEl)countEl.textContent=count;
 const pref=document.querySelector('#prefRound');if(pref)pref.innerHTML=preferenceMarkup();
 updatePlayerFilters(preferencePreview?previewTaste():null);localize(document.body);
}
function eqMark(b){return (b.gain>0?'+':'')+b.gain}
function selectedBandInfo(b){return b.db===null?'Sin umbral medido · ajuste personal':b.derived?'Frecuencia estimada':b.quality==='good'?'Umbral consistente':'Umbral estimado · verifica si lo necesitas'}
function selectedEqEditor(p,r){let x=r.find(q=>q.f===selectedEqFreq)||r[0];if(!x)return '';selectedEqFreq=x.f;return `<div class="eq-editor" id="eqEditor"><div class="eq-editor-head"><div><div class="tiny muted">AJUSTAR BANDA</div><h3 id="eqSelectedLabel">${fmt(x.f)}</h3></div><strong id="eqSelectedValue">${eqMark(x)} dB</strong></div><input id="eqSlider" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${x.gain}" aria-label="Ganancia de ${fmt(x.f)} en decibelios"><div class="editor-commands"><button type="button" data-adjust="${x.f}" data-delta="-1" aria-label="Reducir banda">−</button><span class="tip" id="eqSelectedNote">${selectedBandInfo(x)}</span><button type="button" data-adjust="${x.f}" data-delta="1" aria-label="Aumentar banda">+</button></div></div>`}
function renderListeningGraph(p){
 if(p.channels!=='separate')return '';
 const pairs=['left','right'];
 const series=pairs.map(side=>p.bands.map((f,i)=>{
  const arr=p.measures?.[key(f,side)]||[];
  const values=arr.filter(r=>r&&Number.isFinite(r.db)).map(r=>r.db);
  if(!values.length)return null;
  const db=median(values);
  return {f,db,x:30+i*(480/Math.max(1,p.bands.length-1)),y:190-(db+84)*(150/60)};
 }));
 const colors=['#27bde4','#8c8dff'];
 const dots=series.map((points,j)=>points.filter(Boolean).map(x=>`<circle cx="${x.x}" cy="${clamp(x.y,20,200)}" r="4" fill="${colors[j]}"><title>${pairs[j]} · ${fmt(x.f)} · ${x.db} dBFS</title></circle>`).join('')).join('');
 // Do not draw lines over frequencies where no measurement exists.
 const segments=series.map((points,j)=>points.slice(1).map((x,i)=>x&&points[i]?`<line x1="${points[i].x}" y1="${clamp(points[i].y,20,200)}" x2="${x.x}" y2="${clamp(x.y,20,200)}" stroke="${colors[j]}" stroke-width="3"/>`:'').join('')).join('');
 const labels=p.bands.map((f,i)=>`<text x="${30+i*480/Math.max(1,p.bands.length-1)}" y="220" text-anchor="middle" fill="#8ba9b9" font-size="10">${short(f)}</text>`).join('');
 return `<details class="unobtrusive"><summary>Comparar oído izquierdo y derecho · umbrales digitales</summary><div class="inner-detail"><div class="row wrap small"><span style="color:${colors[0]}">● Izquierdo</span> <span style="color:${colors[1]}">● Derecho</span></div><svg viewBox="0 0 540 240" width="100%" role="img" aria-label="Umbrales medidos por oído, con espacios sin datos"><path d="M30 20 V190 H510" fill="none" stroke="#496477"/>${segments}${dots}${labels}</svg><p class="tiny muted">Se dibujan solo frecuencias realmente medidas. No son dB SPL, ni audiometría clínica, ni una curva de ganancia EQ.</p></div></details>`;
}
function renderResults(){if(!current)return `<section class="hero"><h1>Todavía no hay ajustes</h1><p>Primero realiza una prueba auditiva.</p>${button('Configurar prueba','setup','btn-primary')}</section>`;
 const p=current,progress=doneCount(p),total=plan(p).length,r=recommend(p),usable=r.filter(x=>x.db!==null&&!x.derived).length,derived=r.filter(x=>x.derived).length,required=Math.max(3,Math.ceil(p.bands.length*.6));
 if(!r.some(x=>x.f===selectedEqFreq))selectedEqFreq=r[0]?.f||null;
 const reliable=usable>=required;
 const status=reliable?'Compensación auditiva estimada + tus preferencias.':'Compensación automática en espera · sigue disponible el ajuste manual.';
 return `<div class="results-compact"><section class="hero result-head"><p class="eyebrow">SMART EQ · TU SONIDO</p><h1>Escucha tu <em>ajuste.</em></h1><div class="result-profile-picker"><span class="tiny muted">Perfil</span><select class="field" id="resultProfileSelect" aria-label="Seleccionar perfil">${profiles.map(q=>`<option value="${esc(q.id)}" ${q.id===p.id?'selected':''}>${esc(q.name)}</option>`).join('')}</select></div></section>
 <div class="results-grid"><section class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${p.bands.length} bandas · <span style="color:var(--cyan)">${esc(presets[p.preset]?.short||'Personalizado')}</span></h2><span class="tag">${r.filter(x=>x.gain!==0).length} cambios</span></div>
 <p class="result-feedback"><strong>${usable}/${p.bands.length}</strong> frecuencias con umbral · <span>${esc(status)}</span></p>
 ${usable<p.bands.length?`<div class="soft warning"><strong>⚠ ${p.bands.length-usable} frecuencias sin umbral</strong><p class="small">Puedes repetir solo las que faltan. No aumentes el volumen para escucharlas.</p>${button('↺ Repetir pendientes','retrymissing','btn-alt full')}</div>`:''}
 ${renderListeningGraph(p)}
 <div class="eq-stage"><div class="tiny muted">TOCA UNA BARRA · DESLIZA PARA VER MÁS →</div><div class="equalizer"><div class="eqgrid">${r.map(x=>{const span=Math.max(1,p.max-p.min),center=100*p.max/span,y=100*(p.max-x.gain)/span;return `<button type="button" class="eqband ${x.f===selectedEqFreq?'selected':''}" data-eq-select="${x.f}" data-eq-band="${x.f}" aria-label="Editar ${fmt(x.f)}, ${eqMark(x)} decibelios" aria-pressed="${x.f===selectedEqFreq}"><span class="eqval">${eqMark(x)}</span><span class="eqbar"><span class="eqcenter" style="top:${center}%"></span><span class="eqfill" style="top:${Math.min(center,y)}%;height:${Math.max(2,Math.abs(center-y))}%"></span></span><span class="eqlabel">${short(x.f)}</span></button>`}).join('')}</div></div></div>
 ${selectedEqEditor(p,r)}
 <div class="eq-util">${button('⎘ Copiar todos','copy','btn-alt')}${button('↓ TXT','downloadtxt','btn-ghost')}${button('↺ Reiniciar cambios','clearmanual','btn-ghost')}</div>
 <details class="unobtrusive"><summary>Valores exactos y opciones avanzadas</summary><div class="inner-detail"><div class="result-list">${r.map(x=>`<div class="result-item"><div><strong>${fmt(x.f)}</strong><small>${selectedBandInfo(x)}</small></div><div class="itemcontrols"><button type="button" data-adjust="${x.f}" data-delta="-1" aria-label="Reducir ${fmt(x.f)}">−</button><button type="button" data-adjust="${x.f}" data-delta="1" aria-label="Aumentar ${fmt(x.f)}">+</button></div><strong class="value" data-eq-value="${x.f}">${eqMark(x)} <small style="display:inline;color:var(--muted)">dB</small></strong></div>`).join('')}</div><div style="margin-top:10px">${button('Cambiar formato de EQ','format','btn-ghost full')}</div><p class="tiny muted">Los valores se guardan por perfil. Debes introducirlos manualmente en tu equipo.</p></div></details>
 <details class="unobtrusive"><summary>Detalles de la calibración <span class="tiny muted">${progress}/${total} muestras</span></summary><div class="inner-detail"><div class="stat-grid"><div class="stat"><strong>${progress}/${total}</strong><small>MUESTRAS</small></div><div class="stat"><strong>${usable}</strong><small>UMBRALES</small></div><div class="stat"><strong>${r.filter(x=>x.gain!==0).length}</strong><small>CAMBIOS</small></div></div><p class="small">${reliable?'Compensación aproximada a partir de los umbrales válidos.':`Solo ${usable} de ${p.bands.length} bandas válidas. Necesitas al menos ${required} para usar compensación automática.`} ${derived?`${derived} banda(s) interpolada(s).`:''} Esta no es una audiometría ni una calibración acústica.</p></div></details>
 <p id="copyStatus" class="status" role="status"></p></section>
 <div class="results-side"><section class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">🎵 Escuchar la diferencia</h2><span class="tag">A / B</span></div><p class="compact-note">Carga una canción y alterna entre tu EQ y el sonido original. Solo cambia lo que reproduce esta página.</p><input type="file" accept="audio/*" id="musicFile" class="field" style="font-size:12px;margin-top:10px" aria-label="Elegir canción"><audio id="audioPlayer" controls preload="metadata" style="width:100%;margin:11px 0" aria-label="Reproductor de comparación"></audio><button type="button" class="btn btn-alt full" id="bypassBtn" data-act="bypass">${eqBypass?'EQ DESACTIVADO · activar':'EQ ACTIVADO · comparar sin EQ'}</button></section>
 <section class="card balance-card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">🎛️ Equilibrio tonal inteligente</h2><span class="tag">NUEVO · v1.7</span></div><p class="compact-note">Una prueba opcional en dos comparaciones por frecuencia. Puede recomendar subir o bajar dB; seguir escuchando el pitido no provoca recortes automáticos.</p><div id="balanceTrainer">${balanceMarkup()}</div></section>
 <details class="unobtrusive"><summary>🎧 Personalizar graves, voces y brillo <span class="tiny muted">Opcional</span></summary><div class="inner-detail"><p class="compact-note">Con la canción reproduciéndose, escucha A y B durante varios segundos y elige qué suena mejor. Mantén el volumen fijo.</p><div id="prefRound">${preferenceMarkup()}</div></div></details>
 <details class="unobtrusive"><summary>Seguridad y límites de precisión</summary><div class="inner-detail"><p class="compact-note">Los niveles dBFS de la prueba no miden la presión sonora en el oído. Evita subir niveles para buscar tonos inaudibles y reduce los ajustes si aparece distorsión o molestia. Si ambos oídos comparten ecualización, no se corrigen por separado.</p></div></details></div></div></div>`}
function deviceIcon(p){return p.type==='car'?'🚗':p.type==='headphones'?'🎧':'🔊'}
function profileProgress(p){const total=plan(p).length;return total?Math.round(doneCount(p)/total*100):0}
function renderProfiles(){const ordered=profiles.slice().sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0));const featured=current;const remaining=ordered.filter(p=>p.id!==featured?.id);
return `<section class="hero"><p class="eyebrow">TU BIBLIOTECA</p><h1>Mis <em>perfiles.</em></h1><p class="subtle">Cada equipo con su propio sonido. Elige uno para seguir escuchando.</p></section>
${featured?`<section class="profile-focus"><div class="row"><div class="profile-icon">${deviceIcon(featured)}</div><div class="grow"><div class="row wrap"><span class="tag">● PERFIL ACTIVO</span><span class="profile-count">${profileProgress(featured)}% completado</span></div><span class="profile-title">${esc(featured.name)}</span><span class="tiny muted">${esc(presets[featured.preset]?.short||'Personalizado')} · ${featured.bands.length} bandas</span></div></div>
<div class="profile-progress" role="progressbar" aria-label="Calibración completada" aria-valuenow="${profileProgress(featured)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${profileProgress(featured)}%"></i></div>
<div class="row wrap">${button(firstMissing(featured)<0?'🎚 Ver mis ajustes':'▶ Continuar calibración',firstMissing(featured)<0?'results':'test','btn-primary grow')}${button('Cambiar equipo','setup','btn-alt')}</div><details class="unobtrusive" style="background:transparent"><summary>Más opciones del perfil</summary><div class="inner-detail row wrap"><button type="button" data-export="${esc(featured.id)}" class="btn btn-ghost grow">↓ Exportar</button><button type="button" data-delete="${esc(featured.id)}" class="btn btn-danger grow">Borrar</button></div></details></section>`:`<div class="profiles-empty"><div style="font-size:34px">🎧</div><h2>Tu primer sonido personalizado</h2><p>Guarda aquí calibraciones distintas para tus auriculares, automóvil y parlantes.</p>${button('Crear mi primer perfil','setup','btn-primary full')}</div>`}
${remaining.length?`<div class="setup-title"><h2>Otros perfiles</h2><span class="tiny muted">${remaining.length} guardado${remaining.length!==1?'s':''}</span></div>${remaining.map(p=>`<div class="profile-row"><div class="profile-icon">${deviceIcon(p)}</div><div class="profile-row-body"><strong data-profile-name="true">${esc(p.name)}</strong><span class="tiny muted">${esc(presets[p.preset]?.short||'Personalizado')} · ${profileProgress(p)}% completado</span></div><div class="profile-row-actions"><button type="button" data-load="${esc(p.id)}">Abrir</button></div><details class="unobtrusive" style="padding:0 5px;margin:0;background:transparent"><summary aria-label="Opciones para ${esc(p.name)}" style="padding:8px 0;min-width:20px">⋯</summary><div class="inner-detail" style="min-width:120px"><button type="button" class="btn btn-ghost full" style="margin-bottom:5px" data-export="${esc(p.id)}">Exportar</button><button type="button" class="btn btn-danger full" data-delete="${esc(p.id)}">Borrar</button></div></details></div>`).join('')}`:''}
<div style="margin:20px 0 9px">${button('＋ Nuevo perfil de audio','setup','btn-alt full')}</div>
<details class="unobtrusive"><summary>Respaldo de perfiles <span class="tiny muted">Importar / exportar</span></summary><div class="inner-detail"><p class="tiny muted">Se guardan en este navegador. Exporta una copia antes de borrar datos o cambiar de teléfono.</p><div class="row wrap">${button('↓ Exportar todo','exportall','btn-alt grow')}${button('↑ Importar JSON','import','btn-ghost grow')}</div><input id="importInput" class="hide" type="file" accept=".json,application/json"></div></details>
<details class="unobtrusive"><summary>Ecualizadores compatibles <span class="tiny muted">${Object.keys(presets).length} formatos</span></summary><div class="inner-detail"><p class="tiny muted">Los de tus fotos mantienen sus frecuencias originales.</p>${Object.entries(presets).filter(([id])=>id!=='custom').map(([id,p])=>`<div class="small" style="margin:7px 0"><strong>${esc(p.short)}</strong><div class="tiny muted">${esc(p.bands.map(short).join(' · '))}</div></div>`).join('')}</div></details>`}
function setActive(p){introStep=3;trial=null;selectedEqFreq=null;preferenceStage=0;preferencePreview=null;preferenceListened=new Set();resetBalanceSession(p);stopTone();if(playerAudio)playerAudio.pause();current=p;currentId=p.id;awaitNext=false;floorReached=false;sampleNote='';save();eqBypass=false;nav(firstMissing(p)<0?'results':'test')}
function exportDownload(name,text,mime){const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
const cleanName=s=>s.replace(/[^a-z0-9-_]/gi,'_').slice(0,48);
function resultText(p){const r=recommend(p);return `AudioCal Hear · ${p.name}\n${trans('Frecuencias:')} ${p.bands.length} ${trans('bandas')}\n${trans('Resultado perceptivo estimado; revisar mediante escucha.')}\n\n`+r.map(x=>`${fmt(x.f).padEnd(11)} ${x.gain>=0?'+':''}${x.gain} dB${x.derived?' ('+trans('estimado')+')':x.db===null?' ('+trans('sin medición')+')':''}`).join('\n')+'\n\n'+trans('No constituye audiometría ni medición acústica.')+'\n'}
async function copyText(txt){try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(txt);return true}}catch(e){}try{const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.top='-1000px';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch(e){return false}}
function changeEqFormat(){if(!current)return;const ids=Object.keys(presets);const old=current.preset;const options=ids.map((id,i)=>`${i+1}. ${presets[id].name}`).join('\n');const response=uiPrompt('Elige un número de formato para ESTE perfil. Se conservarán los umbrales medidos y se interpolarán solo las frecuencias cercanas a las medidas.\n'+options,String(ids.indexOf(old)+1));if(response===null)return;const id=ids[Number(response)-1];if(!id){uiAlert('Opción inválida');return}if(id==='custom'){uiAlert('Para crear un formato personalizado usa Configurar → nueva calibración.');return}if(id!==old){current.preset=id;current.bands=presets[id].bands.slice();current.min=presets[id].min;current.max=presets[id].max; // Keep collected measurements; do not falsely mark new bands as measured.
 current.formatFrom=old;touch();render();uiAlert('Formato cambiado. Solo las frecuencias que ya probaste cuentan como medidas. Para una recomendación fiable en las nuevas bandas, completa el examen que aparece en Prueba. No reutilices el perfil con otro dispositivo Bluetooth.')}}