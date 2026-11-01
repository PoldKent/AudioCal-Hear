
function gather(p){
 const collect=f=>{
  let samples=[];
  for(const side of p.channels==='separate'?['left','right']:['both']){
   const arr=p.measures?.[key(f,side)]||[];
   const valid=arr.filter(r=>r?.kind==='heard'&&Number.isFinite(r.db));
   if(valid.length){
    const values=valid.map(r=>r.db);
    const confidence=valid.some(r=>r.confidence==='low')?'uncertain':
     valid.length>=2&&!independentThresholdPair(p,f,side)?'legacy':
     valid.length>=2&&Math.max(...values)-Math.min(...values)<=6?'good':'low';
    samples.push({db:median(values),quality:confidence,side});
   }
  }
  if(!samples.length)return {f,db:null,quality:'unmeasurable'};
  const values=samples.map(s=>s.db),spread=Math.max(...values)-Math.min(...values);
  return {f,db:median(values),quality:spread>9?'mixed':
   samples.some(s=>s.quality==='uncertain')?'uncertain':
   samples.some(s=>s.quality==='legacy')?'legacy':
   p.channels==='separate'&&samples.length<2?'low':
   samples.every(s=>s.quality==='good')?'good':'low'};
 };
 const allMeasured=[...new Set(Object.keys(p.measures||{}).map(k=>Number(k.split('|')[0])).filter(Number.isFinite))].map(collect).filter(x=>x.db!==null).sort((a,b)=>a.f-b.f);
 return p.bands.map(f=>{
  const direct=collect(f);if(direct.db!==null||(p.testMode!=='quick'&&!p.formatFrom))return direct;
  const lo=allMeasured.filter(x=>x.f<f).pop(),hi=allMeasured.find(x=>x.f>f);
  if(!lo||!hi||hi.f/lo.f>5)return direct;
  const frac=Math.log(f/lo.f)/Math.log(hi.f/lo.f),db=lo.db+(hi.db-lo.db)*frac;
  return {f,db,quality:'interpolated',derived:true};
 });
}
// v2: Local threshold contrasts are an exploratory cue, NOT calibrated EQ.
// Digital detection levels are neither ear SPL nor normal equal-loudness targets.
// Never apply measured threshold differences directly as equalizer gains.
const EQ_ALGORITHM_VERSION='local-contrast-v2-experimental';
function hasBothChannelThresholds(p,f){
 if(p.channels!=='separate')return true;
 return ['left','right'].every(side=>(p.measures?.[key(f,side)]||[]).some(m=>m?.kind==='heard'&&Number.isFinite(m.db)));
}
// This function is shared by the algorithm and result labels.
function thresholdCoverage(p,data){
 const measured=data.filter(x=>Number.isFinite(x.db)&&!x.derived&&x.quality!=='mixed'&&x.quality!=='unmeasurable'&&x.quality!=='uncertain'&&hasBothChannelThresholds(p,x.f));
 const required=autoCoverageMinimum(p);
 const candidates=measured.slice(1,-1).filter((x,i)=>x.f/measured[i].f<=3.5&&measured[i+2].f/x.f<=3.5).length;
 return {measured,required,enough:measured.length>=required,candidates};
}
function estimateThresholdContrast(p,data){
 const {measured,enough}=thresholdCoverage(p,data);
 const context=normalizeCalibrationContext(p.context,p.type);
 return data.map((point,i)=>{
  const entry={f:point.f,base:0,contrastDb:null,autoReason:'sin datos suficientes',autoConfidence:'none'};
  if(!enough)return entry;
  if(!Number.isFinite(point.db)||point.derived)return {...entry,autoReason:'frecuencia no medida directamente'};
  if(!hasBothChannelThresholds(p,point.f))return {...entry,autoReason:'faltan umbrales de uno de los oídos: no corregir automáticamente'};
  if(point.quality==='mixed')return {...entry,autoReason:'respuesta diferente entre oídos'};
  if(point.quality==='uncertain')return {...entry,autoReason:'umbral estimado con confianza baja: no aplicar EQ automático'};
  if(point.quality==='unmeasurable')return {...entry,autoReason:'sin umbral confirmado'};
  const idx=measured.findIndex(x=>x.f===point.f);
  if(idx<=0||idx===measured.length-1)return {...entry,autoReason:'banda extrema: no extrapolar'};
  const lo=measured[idx-1],hi=measured[idx+1];
  if(point.f/lo.f>3.5||hi.f/point.f>3.5)return {...entry,autoReason:'bandas vecinas demasiado separadas'};
  const blockReason=contextAutoBlockReason(p,point.f,context);
  if(blockReason)return {...entry,autoReason:blockReason};
  // Predict the local digital threshold from adjacent measured frequencies, not
  // from a population audiogram, a global quadratic or an acoustic room model.
  const ratio=Math.log(point.f/lo.f)/Math.log(hi.f/lo.f);
  const expected=lo.db+(hi.db-lo.db)*ratio;
  const deviation=point.db-expected;
  const uncertainty=3; // exploratory dead-zone in digital dB (not a clinical tolerance)
  const evidence=Math.max(0,Math.abs(deviation)-uncertainty);
  // Limit one-pass results to +/-1 EQ dB, verified two-pass to +/-2 dB;
  // auto/speaker playback additionally limits boosts to +1 dB.
  const verified=point.quality==='good'&&lo.quality==='good'&&hi.quality==='good';
  const maxBoost=p.type==='car'||p.type==='speaker'?1:verified?2:1;
  const maxCut=verified?2:1;
  let base=deviation>=0?Math.min(maxBoost,evidence*.20): -Math.min(maxCut,evidence*.20);
  base=roundTo(base,p.step||1);
  return {f:point.f,base,contrastDb:Number(deviation.toFixed(2)),
   autoReason:Math.abs(deviation)<=uncertainty?'sin contraste local significativo':base===0?'contraste insuficiente para cambiar 1 paso':'desviación local; compensación limitada y experimental',
   autoConfidence:verified?'medium':'low'};
 });
}
function recommend(p){
 const data=gather(p), estimates=estimateThresholdContrast(p,data);
 return data.map((point,i)=>{
  const automatic=estimates[i],manual=Number(p.manual?.[point.f])||0,
   taste=tasteGain(point.f,cleanTaste(p)),balance=balanceGain(p,point.f);
  const gain=clamp(roundTo(automatic.base+manual+taste+balance,p.step||1),p.min,p.max);
  return {...point,...automatic,gain,algorithmVersion:EQ_ALGORITHM_VERSION};
 });
}
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
// Every editable recommendation is rendered from the same fresh recommend() result.
// The raw measurement graph and interpretation remain deliberately immutable.
let lastRenderedEqSignature=null;
function refreshResultsUI(){
 if(!current||page!=='results')return;
 const r=recommend(current);let count=0;
 const signature=current.id+'|'+r.map(b=>b.f+':'+b.gain).join('|');
 if(lastRenderedEqSignature!==null&&lastRenderedEqSignature!==signature){
  transferCompleted.clear();
  if(transferOpen)transferStatus='Los valores de EQ cambiaron. Revisa nuevamente las bandas antes de marcarlas como aplicadas.';
 }
 lastRenderedEqSignature=signature;
 for(const b of r){
  if(b.gain!==0)count++;
  const band=document.querySelector(`[data-eq-band="${b.f}"]`);
  if(band){band.setAttribute('aria-label',`Editar ${fmt(b.f)}, ${(b.gain>0?'+':'')+b.gain} decibelios`);const value=band.querySelector('.eqval'),fill=band.querySelector('.eqfill');if(value)value.textContent=(b.gain>0?'+':'')+b.gain;
   if(fill){const span=Math.max(1,current.max-current.min),center=100*current.max/span,y=100*(current.max-b.gain)/span;fill.style.top=Math.min(center,y)+'%';fill.style.height=Math.max(2,Math.abs(center-y))+'%'}}
  const val=document.querySelector(`[data-eq-value="${b.f}"]`);if(val)val.innerHTML=(b.gain>0?'+':'')+b.gain+' <small style="display:inline;color:var(--muted)">dB</small>';
  const traceFinal=document.querySelector(`[data-trace-final="${b.f}"]`);
  if(traceFinal)traceFinal.textContent=eqMark(b)+' dB';
 }
 updateSelectedEditor();
 const countEl=document.querySelector('.stat-grid .stat:nth-child(3) strong');if(countEl)countEl.textContent=count;
 const headerCount=$('#eqChangeCount');if(headerCount)headerCount.textContent=count+' cambios';
 const copyStatus=$('#copyStatus');if(copyStatus)copyStatus.textContent='';
 const pref=document.querySelector('#prefRound');if(pref)pref.innerHTML=preferenceMarkup();
 updatePlayerFilters(preferencePreview?previewTaste():null);refreshTransfer();refreshEqCard();localize(document.body);
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
function rawFrequencyThreshold(p,f,side){
 const a=p.measures?.[f+'|'+side]||[];
 const valid=a.filter(x=>x&&x.kind==='heard'&&Number.isFinite(x.db)).map(x=>x.db);
 return valid.length?median(valid):null;
}

function thresholdStatus(point){
 if(point.db===null)return 'Sin umbral confirmado';
 if(point.derived)return 'Interpolación; no medido aquí';
 if(point.quality==='good')return 'Repetible en dos búsquedas independientes';
 if(point.quality==='uncertain')return 'Umbral estimado · confianza baja; sin corrección automática';
 if(point.quality==='legacy')return 'Segunda pasada histórica: confirmación, no búsqueda independiente';
 if(point.quality==='mixed')return 'Diferencias entre oídos';
 return 'Medición limitada; revisar';
}

function thresholdEvidenceLabel(p,f){
 const sides=p.channels==='separate'?['left','right']:['both'];
 return sides.map(side=>{
  const records=(p.measures?.[key(f,side)]||[]).filter(Boolean);
  if(!records.length)return '';
  return records.map(m=>{
   const known=Number.isFinite(m.audibleDb)||Number.isFinite(m.inaudibleDb);
   if(!known)return '';
   const interval='Oído '+(side==='both'?'ambos':side==='left'?'izquierdo':'derecho')+
    ' · audible '+(Number.isFinite(m.audibleDb)?m.audibleDb+' dBFS':'sin límite')+
    ' / inaudible '+(Number.isFinite(m.inaudibleDb)?m.inaudibleDb+' dBFS':'sin límite');
   const confidenceLabel={high:'alta',medium:'media',low:'baja',bounded:'límite observado'}[m.confidence]||'no clasificada';
   return interval+' · confianza '+confidenceLabel+
    (m.contradictions?' · '+m.contradictions+' discrepancias':'');
  }).filter(Boolean).join(' | ');
 }).filter(Boolean).join(' | ');
}
function renderCalibrationTrace(p,r){
 const finished=firstMissing(p)<0;
 const sides=p.channels==='separate'?['left','right']:['both'];
 const colors={left:'#2671db',right:'#b06bdb',both:'#2671db'};
 const minHz=Math.min(...p.bands),maxHz=Math.max(...p.bands);
 const xpos=f=>56+548*(Math.log(f/minHz)/Math.max(1e-8,Math.log(maxHz/minHz)));
 const ypos=db=>18+(0-clamp(db,-100,0))*1.76;
 const axisLevels=[0,-20,-40,-60,-80,-100].map(n=>`<line x1="53" y1="${ypos(n)}" x2="615" y2="${ypos(n)}" stroke="#dfe5ed" stroke-dasharray="3 5"/><text x="47" y="${ypos(n)+3}" text-anchor="end" font-size="11" fill="#6e7d8e">${n}</text>`).join('');
 const series=sides.map(side=>{
  const points=p.bands.map(f=>{const db=rawFrequencyThreshold(p,f,side);return db===null?null:{f,db,x:xpos(f),y:ypos(db)}}),
   segments=points.slice(1).map((v,i)=>v&&points[i]?`<line x1="${points[i].x}" y1="${points[i].y}" x2="${v.x}" y2="${v.y}" stroke="${colors[side]}" stroke-width="2.5"/>`:'').join(''),
   dots=points.filter(Boolean).map(v=>`<circle cx="${v.x}" cy="${v.y}" r="4" fill="${colors[side]}"><title>${side==='both'?'Ambos':side==='left'?'Izquierdo':'Derecho'} · ${fmt(v.f)} · ${v.db} dBFS</title></circle>`).join('');
  return segments+dots;
 }).join('');
 const labels=p.bands.map((f,i)=>i%(p.bands.length>15?3:1)===0?`<text x="${xpos(f)}" y="207" text-anchor="middle" font-size="10" fill="#63738b">${short(f)}</text>`:'').join('');
 const legend=sides.map(side=>`<span style="color:${colors[side]};font-weight:700">${side==='both'?'● Ambos':side==='left'?'● Izquierdo':'● Derecho'}</span>`).join(' · ');
 const formatDb=db=>db===null?'—':db+' dBFS';
 const totalDirect=r.filter(x=>x.db!==null&&!x.derived).length;
 const absent=r.filter(x=>x.db===null).length;
 const tasks=plan(p),confirmed=tasks.filter(e=>p.measures?.[key(e.f,e.side)]?.[e.pass]?.kind==='heard'&&Number.isFinite(p.measures[key(e.f,e.side)][e.pass].db)).length;
 const incomplete=finished?'Búsquedas registradas: '+tasks.length+'/'+tasks.length+'. Umbrales confirmados: '+confirmed+'/'+tasks.length+'.':'Prueba en curso: '+confirmed+' umbrales confirmados de '+tasks.length+' búsquedas programadas.';
 const c=normalizeCalibrationContext(p.context,p.type);
 const unit=c.eqScale==='db'?'El equipo indica dB, aunque la forma y anchura de sus filtros pueden diferir.':
  c.eqScale==='steps'?(c.eqStepDb==='unknown'?'El equipo indica posiciones sin conversión dB/paso.':'La equivalencia dB/paso fue declarada según manual y no está verificada por Hear.'):'La unidad real del equipo no se ha confirmado: NO se presupone una equivalencia entre dB y niveles.';
 const rows=r.map(x=>{
  const raw=p.channels==='separate'?
   'I: '+formatDb(rawFrequencyThreshold(p,x.f,'left'))+'; D: '+formatDb(rawFrequencyThreshold(p,x.f,'right')):
   formatDb(rawFrequencyThreshold(p,x.f,'both'));
  const gain=(Number(x.gain)||0),automatic=(Number(x.base)||0);
  return `<tr><th scope="row">${fmt(x.f)}</th><td>${raw}<span class="tiny muted" style="display:block">${esc(thresholdEvidenceLabel(p,x.f))}</span></td><td>${thresholdStatus(x)}<span class="tiny muted" style="display:block">${esc(x.autoReason||'')}</span></td><td>${automatic>=0?'+':''}${Number(automatic.toFixed(2))} dB</td><td><strong data-trace-final="${x.f}">${gain>=0?'+':''}${gain} dB</strong></td></tr>`;
 }).join('');
 return `<section id="tracePanel" class="trace-panel" aria-label="Comparación transparente de la calibración">
 <header class="trace-heading"><h2>Resultados del test · antes y después</h2><p class="compact-note">${incomplete}</p></header>
 <div class="trace-part"><h3>1 · Medición original sin modificar</h3><p class="small muted">Umbrales digitales registrados al escuchar tonos con este equipo; un valor más negativo indica que el tono se detectó a menor amplitud digital. No son dB SPL ni ganancia EQ.</p>
 <div class="trace-plot"><div class="tiny muted">Umbral medido (dBFS) · eje horizontal en Hz</div><svg viewBox="0 0 630 225" width="100%" role="img" aria-label="Gráfica de umbrales digitales originales por frecuencia, sin interpolación">${axisLevels}${series}${labels}<text x="55" y="223" font-size="10" fill="#63738b">Hz · escala logarítmica</text></svg><div class="tiny">${legend}</div></div></div>
 <div class="trace-part"><h3>2 · Interpretación y fiabilidad</h3><p class="small">${totalDirect} de ${p.bands.length} bandas con umbral directo; ${absent} sin umbral. Las frecuencias estimadas están identificadas en la tabla y no aparecen como puntos medidos en la gráfica.</p>
 <p class="compact-note"><strong>Contexto:</strong> ${esc(calibrationContextLabel(p))}</p>
 <p class="compact-note">${esc(calibrationContextCaution(p))}</p><p class="compact-note"><strong>Efecto real sobre el algoritmo:</strong> ${esc(calibrationContextEqExplanation(p))}</p></div>
 <div class="trace-part"><h3>3 · Corrección automática frente al ajuste final</h3><p class="small muted">Automático: contrastes locales entre frecuencias realmente medidas, con margen de incertidumbre y límites conservadores. No equivale a audiometría ni corrige acústicamente un recinto. EQ final: incorpora ajustes manuales y preferencias si los realizaste; nunca cambia los datos medidos.</p>
 <div class="trace-table-scroll"><table class="trace-table"><thead><tr><th scope="col">Banda</th><th scope="col">Dato original</th><th scope="col">Interpretación</th><th scope="col">Automático</th><th scope="col">EQ final</th></tr></thead><tbody>${rows}</tbody></table></div>
 <p class="compact-note"><strong>Escala del ecualizador:</strong> ${esc(unit)} Límites de corrección Hear: ${p.min} a +${p.max} dB. Recorrido físico: ${p.controlMin??p.min} a +${p.controlMax??p.max} ${c.eqScale==='steps'?'posiciones':c.eqScale==='db'?'dB del control':'unidades sin verificar'}. Los números de EQ son ganancias estimadas de procesamiento, no posiciones físicas verificadas del control.</p>
 <p class="tiny muted">Método de corrección: contrastes locales v2, experimental; conserva las medidas originales. Las curvas normales de igual sonoridad no pueden aplicarse directamente a este test digital sin calibración acústica. Una corrección neutral puede ser el único resultado justificable.</p></div></section>`;
}


// Shared mapping for the export card and guided transfer; no invented dB/step.
// Round exact half-steps toward zero to avoid unintended extra boost/cut.
function physicalEqControl(gain,p,context=normalizeCalibrationContext(p.context,p.type)){
 const scale=context.eqScale;
 const ratio=scale==='db'?1:(scale==='steps'&&['1','2','3'].includes(context.eqStepDb)?Number(context.eqStepDb):null);
 if(!Number.isFinite(ratio))return {position:null,actualGain:null,delta:null,exact:false,ratio:null};
 const magnitude=Math.round(Math.abs(gain)/ratio-1e-9);
 const physicalMin=Number.isFinite(p.controlMin)?p.controlMin:p.min;
  const physicalMax=Number.isFinite(p.controlMax)?p.controlMax:p.max;
  const position=clamp(magnitude===0?0:Math.sign(gain)*magnitude,Math.ceil(physicalMin),Math.floor(physicalMax));
 const actualGain=Number((position*ratio).toFixed(2));
 const delta=Number((actualGain-gain).toFixed(2));
 return {position,actualGain,delta,exact:Math.abs(delta)<.001,ratio};
}
function eqResultModel(p){
 const context=normalizeCalibrationContext(p.context,p.type);
 const complete=firstMissing(p)<0,scale=context.eqScale;
 const rows=recommend(p).map(b=>{
  const projection=physicalEqControl(b.gain,p,context);
  const quality=b.db===null?'Sin umbral':b.derived?'Interpolado':b.quality==='mixed'?'Oídos distintos':b.quality==='good'?'Repetido':'Estimación';
  return {f:b.f,gain:b.gain,quality,auto:b.base,...projection};
 });
 const verified=rows.every(r=>r.ratio!==null);
 return {name:p.name,complete,scale,ratio:rows[0]?.ratio??null,context:calibrationContextLabel(p),
  device:p.type==='car'?'AUTO':p.type==='headphones'?'AURICULARES':'PARLANTES',
  label:scale==='db'?'dB de control':scale==='steps'?'posición':'sin verificar',
  rows,verified,
  warning:(!complete?'Prueba incompleta: ajustes provisionales. ':'')+
   (!verified?'Equivalencia del control desconocida: no calcular posiciones.':
   'Conversión de acuerdo con escala y dB/paso declarados por usuario (Hear no lo verifica). ')+
   'Los dB efectivos pueden ser diferentes de la sugerencia tras el redondeo. '+'Límites digitales '+p.min+' a +'+p.max+' dB; recorrido físico '+(p.controlMin??p.min)+' a +'+(p.controlMax??p.max)+' '+(scale==='steps'?'posiciones':scale==='db'?'dB del control':'unidades desconocidas')+'.'};
}
function eqResultMarkup(p){
 const m=eqResultModel(p);
 const ctx=normalizeCalibrationContext(p.context,p.type);
 const scaleOptions=[['unknown','Unidad sin verificar'],['db','Controles en dB'],['steps','Controles por posiciones']];
 const stepOptions=[['unknown','dB por paso sin verificar'],['1','1 dB por paso (según manual)'],['2','2 dB por paso (según manual)'],['3','3 dB por paso (según manual)']];
 const physicalMin=p.controlMin??p.min,physicalMax=p.controlMax??p.max;
 const physicalUnit=ctx.eqScale==='steps'?'posiciones':ctx.eqScale==='db'?'dB del control':'unidades sin verificar';
 const nominal=ctx.eqScale==='steps'&&m.verified?' · equivalencia nominal '+(physicalMin*m.ratio)+' a +'+(physicalMax*m.ratio)+' dB (según manual declarado)':'';
 return `<section id="eqCardSection" class="eq-card-section" aria-label="Imagen descargable del ecualizador">
 <h2>Mi ecualizador · resultado para aplicar</h2>
 <p class="compact-note">${esc(m.context)} · ${p.bands.length} bandas. ${m.complete?'Test completado':'Test pendiente de completar'}.</p>
 <div class="eq-card-config"><label for="resultEqScale">Unidad real del ecualizador</label>
 <select id="resultEqScale" class="field">${scaleOptions.map(([k,l])=>'<option value="'+k+'" '+(ctx.eqScale===k?'selected':'')+'>'+l+'</option>').join('')}</select>
 ${ctx.eqScale==='steps'?'<label for="resultEqStepDb">Equivalencia documentada del control</label><select id="resultEqStepDb" class="field">'+stepOptions.map(([k,l])=>'<option value="'+k+'" '+(ctx.eqStepDb===k?'selected':'')+'>'+l+'</option>').join('')+'</select>':''}
 <div class="grid2"><div><label for="resultControlMin">Mínimo físico (${physicalUnit})</label><input class="field" id="resultControlMin" type="number" min="-30" max="-1" step="1" value="${physicalMin}"></div><div><label for="resultControlMax">Máximo físico (${physicalUnit})</label><input class="field" id="resultControlMax" type="number" min="1" max="30" step="1" value="${physicalMax}"></div></div>
 <p class="tiny muted">Rango físico del equipo: ${physicalMin} a +${physicalMax} ${physicalUnit}${nominal}. Límites independientes de corrección recomendada: ${p.min} a +${p.max} dB. Los pasos y los dB no son la misma unidad; verifica el manual de tu modelo.</p></div>
 <p class="eq-card-alert ${m.verified?'':'eq-card-warning'}" id="eqCardNotice">${esc(m.warning)}</p>
 <canvas id="eqCardCanvas" class="eq-card-canvas" width="${eqPngLayout(p,m).width}" height="782" role="img" aria-label="Ecualizador horizontal, frecuencias de izquierda a derecha y barras verticales sobre cero"></canvas>
 <div class="row wrap eq-card-actions">${button('↓ Guardar imagen PNG','downloadpng','btn-primary grow')}${button('⎘ Copiar controles','copycontrols','btn-alt grow')}</div>
 <p class="tiny muted">El PNG se muestra como ecualizador horizontal: frecuencias de izquierda a derecha, aumentos arriba de cero y recortes abajo. Cada banda incluye valor del control y dB sugeridos; una conversión no confirmada aparece como «—».</p></section>`;
}

/* Landscape EQ image: one column per frequency. The primary value always
   comes from the same physicalEqControl projection as the transfer wizard. */
function eqPngLayout(p,m=eqResultModel(p)){
 const count=m.rows.length;
 const width=Math.max(1080,count*98+138);
 const height=782,left=82,right=width-52;
 const plotTop=265,zeroY=370,plotBottom=475;
 const gap=(right-left)/Math.max(1,count);
 const output=m.rows.map(r=>m.verified?r.position:r.gain);
 const absoluteMax=Math.max(3,...output.map(v=>Math.abs(v||0)),...(m.verified?[Math.abs(p.controlMin??p.min??0),Math.abs(p.controlMax??p.max??0)]:[]));
 const extent=Math.ceil(absoluteMax);
 const marks=[-extent,-Math.round(extent/2),0,Math.round(extent/2),extent];
 const x=i=>left+(i+.5)*gap;
 const y=v=>zeroY-v/extent*88;
 const columns=m.rows.map((r,i)=>({x:x(i),y:y(output[i]||0),value:output[i]||0,frequency:r.f,
  gain:r.gain,position:r.position,actualGain:r.actualGain,delta:r.delta}));
 return {width,height,left,right,plotTop,plotBottom,zeroY,gap,extent,marks,columns,
  unit:m.verified?(m.scale==='steps'?'posiciones':'dB del control'):'dB sugeridos, SIN posiciones',
  physical:m.verified};
}
function paintEqResult(canvas,p){
 if(!canvas||!p)return false;
 const m=eqResultModel(p),layout=eqPngLayout(p,m),rows=m.rows;
 const w=layout.width,h=layout.height;
 canvas.width=w;canvas.height=h;
 const c=canvas.getContext('2d');if(!c)return false;
 const round=(x,y,width,height,r)=>{c.beginPath();c.roundRect(x,y,width,height,r)};
 const signed=v=>(v>0?'+':'')+v;
 const centered=(txt,x,y,font,color,maxWidth=layout.gap-14)=>{
  c.font=font;c.fillStyle=color;c.textAlign='center';c.fillText(txt,x,y,Math.max(35,maxWidth));c.textAlign='left';
 };
 c.fillStyle='#ffffff';c.fillRect(0,0,w,h);
 c.fillStyle='#2565cc';round(38,30,w-76,9,4);c.fill();
 c.fillStyle='#192e4b';c.font='bold 35px system-ui,sans-serif';
 c.fillText('AudioCal Hear',45,88);
 c.fillStyle='#52677f';c.font='20px system-ui,sans-serif';
 c.fillText('MI ECUALIZADOR · '+m.device+' · '+rows.length+' BANDAS',45,126,w-90);
 c.fillStyle='#1c3658';c.font='bold 27px system-ui,sans-serif';
 c.fillText(String(m.name),45,171,w-90);
 c.fillStyle='#63768c';c.font='17px system-ui,sans-serif';
 c.fillText(String(m.context),45,205,w-90);
 c.fillStyle='#245bb0';c.font='bold 20px system-ui,sans-serif';
 c.fillText('RESULTADO FINAL · '+layout.unit.toUpperCase(),45,242,w-90);
 // A common zero line and visible horizontal frequency axis.
 const chartLeft=layout.left,chartRight=layout.right;
 const n=layout.columns.length;
 for(let i=0;i<n;i+=2){
  const x=layout.columns[i].x;
  c.fillStyle='#f7faff';
  round(x-layout.gap*.48,layout.plotTop,layout.gap*.96,248,8);c.fill();
 }
 for(const tick of layout.marks){
  if(layout.marks.indexOf(tick)!==layout.marks.lastIndexOf(tick))continue;
  const y=layout.zeroY-tick/layout.extent*88;
  c.strokeStyle=tick===0?'#637a99':'#dbe4f0';c.lineWidth=tick===0?3:1;
  c.setLineDash(tick===0?[]:[5,6]);
  c.beginPath();c.moveTo(chartLeft-13,y);c.lineTo(chartRight+14,y);c.stroke();
  c.setLineDash([]);
  c.fillStyle='#667a93';c.font='15px system-ui,sans-serif';c.textAlign='right';
  c.fillText(signed(tick),chartLeft-21,y+5);c.textAlign='left';
 }
 for(const [i,r] of rows.entries()){
  const point=layout.columns[i],x=point.x,y=point.y;
  const bw=Math.max(15,Math.min(50,layout.gap*.54));
  // Draw each vertical control from zero, so boosts rise and cuts descend.
  if(point.value!==0){
   c.fillStyle=point.value>0?'#2a70d6':'#dc8247';
   round(x-bw/2,Math.min(layout.zeroY,y),bw,Math.max(3,Math.abs(layout.zeroY-y)),7);c.fill();
  }else{
   c.fillStyle='#7b90a9';round(x-bw/2,layout.zeroY-3,bw,6,3);c.fill();
  }
  centered(signed(point.value),x,point.value>0?Math.max(layout.plotTop+16,y-11):
   point.value<0?Math.min(layout.plotBottom-6,y+23):layout.zeroY-13,
   'bold '+(n>17?16:21)+'px system-ui,sans-serif','#203c60');
  centered(fmt(r.f),x,505,'bold '+(n>17?15:20)+'px system-ui,sans-serif','#263e5d');
 }
 // Control values and digital-processing suggestions remain distinct units.
 c.fillStyle='#315478';c.font='bold 17px system-ui,sans-serif';
 c.fillText('CONTROLES PARA APLICAR',45,536);
 for(const [i,r] of rows.entries()){
  const x=layout.columns[i].x,cardWidth=layout.gap*.91;
  c.fillStyle=i%2===0?'#f2f6fc':'#f8faff';
  round(x-cardWidth/2,550,cardWidth,119,10);c.fill();
  centered(r.position===null?'—':signed(r.position),x,593,
   'bold '+(n>17?23:30)+'px system-ui,sans-serif',
   r.position===null?'#a45b27':'#205ca9',cardWidth-8);
  centered(r.position===null?'NO VERIFICADO':m.scale==='steps'?'posición':'dB control',x,616,
   (n>17?11:14)+'px system-ui,sans-serif','#5e7087',cardWidth-6);
  centered('EQ '+signed(r.gain)+' dB',x,645,
   'bold '+(n>17?12:16)+'px system-ui,sans-serif','#304964',cardWidth-6);
  if(r.actualGain!==null&&!r.exact){
   centered('dif. '+signed(r.delta)+' dB',x,661,
    (n>17?10:12)+'px system-ui,sans-serif','#9a6237',cardWidth-6);
  }
 }
 c.fillStyle=m.complete?'#245787':'#9a572c';c.font='bold 18px system-ui,sans-serif';
 c.fillText(m.complete?'TEST FINALIZADO':'TEST INCOMPLETO · AJUSTES PROVISIONALES',45,708,w-90);
 c.fillStyle=m.verified?'#5b718a':'#9a572c';c.font='16px system-ui,sans-serif';
 const warning=m.verified?
  'Equivalencia declarada por el usuario, NO verificada por Hear · Corrección experimental':
  'SIN CONVERSIÓN VALIDADA: barras en dB sugeridos, NO posiciones físicas';
 c.fillText(warning,45,737,w-90);
 c.fillStyle='#75859b';c.font='14px system-ui,sans-serif';
 c.fillText('Sin medición acústica calibrada. Los valores efectivos pueden diferir por redondeo o filtros del equipo.',45,765,w-90);
 return true;
}
function refreshEqCard(){if(page!=='results'||!current)return;
 const canvas=$('#eqCardCanvas');if(canvas)paintEqResult(canvas,current);
 const notice=$('#eqCardNotice');if(notice){const m=eqResultModel(current);
  notice.textContent=m.warning;notice.classList.toggle('eq-card-warning',!m.verified);
 }
}
function eqControlText(p){
 const m=eqResultModel(p);
 return 'AudioCal Hear · '+m.name+'\n'+m.context+'\n'+m.warning+'\n'+m.rows.map(r=>
  fmt(r.f)+' -> '+(r.position===null?'SIN POSICIÓN VERIFICADA':'control '+(r.position>=0?'+':'')+r.position+' '+m.label)+
  ' · sugerido '+(r.gain>=0?'+':'')+r.gain+' dB'+
  (r.actualGain===null?' · ganancia física desconocida':' · real según escala '+(r.actualGain>=0?'+':'')+r.actualGain+' dB · diferencia '+(r.delta>=0?'+':'')+r.delta+' dB')).join('\n');
}
function saveEqCardPng(p){
 const canvas=document.createElement('canvas');
 if(!paintEqResult(canvas,p))return false;
 const filename='AudioCal_EQ_'+cleanName(p.name)+'.png';
 const anchor=document.createElement('a');
 anchor.download=filename;
 anchor.href=canvas.toDataURL('image/png');
 document.body.appendChild(anchor);anchor.click();anchor.remove();
 return true;
}

// Optional, user-triggered starting hypothesis. Never rewrite the measured data
// or represent digital detection thresholds as calibrated frequency response.
function starterEqProposal(p){
 const raw=gather(p);
 const rows=p.bands.map(f=>({f,gain:0,reason:'Sin contraste local utilizable'}));
 const usable=f=>{
  const record=raw.find(x=>x.f===f);
  if(!record||!Number.isFinite(record.db)||record.derived||record.quality==='mixed'||record.quality==='unmeasurable')return false;
  const sides=p.channels==='separate'?['left','right']:['both'];
  const values=sides.map(side=>(p.measures?.[key(f,side)]||[]).filter(x=>x?.kind==='heard'&&Number.isFinite(x.db)).map(x=>x.db)).filter(x=>x.length);
  if(values.length!==sides.length)return false;
  if(values.length===2&&Math.abs(median(values[0])-median(values[1]))>8)return false;
  return true;
 };
 const suggestions=[];
 for(let i=1;i<raw.length-1;i++){
  const a=raw[i-1],b=raw[i],c=raw[i+1];
  if(b.f<100||b.f>10000||![a,b,c].every(x=>usable(x.f)))continue;
  if(b.f/a.f>3.5||c.f/b.f>3.5)continue;
  // Outlying end bands often reflect the transducer or room, not the listener.
  if(Math.abs(a.db-b.db)>24||Math.abs(c.db-b.db)>24)continue;
  const expected=a.db+(c.db-a.db)*Math.log(b.f/a.f)/Math.log(c.f/a.f);
  const contrast=b.db-expected;
  if(Math.abs(contrast)<4)continue;
  suggestions.push({i,contrast,gain:Math.sign(contrast),f:b.f});
 }
 suggestions.sort((a,b)=>Math.abs(b.contrast)-Math.abs(a.contrast));
 // At most three small changes, never an inferred high-frequency rescue boost.
 for(const x of suggestions.slice(0,3)){
  rows[x.i].gain=x.gain;
  rows[x.i].reason='Contraste digital local '+(x.contrast>0?'+':'')+x.contrast.toFixed(1)+' dBFS; prueba auditiva, no calibración acústica';
 }
 return {rows,changes:rows.filter(x=>x.gain!==0).length};
}
function starterEqCopy(p){
 const proposal=starterEqProposal(p);
 const c=normalizeCalibrationContext(p.context,p.type);
 return 'Hear · PROPUESTA EXPERIMENTAL (NO CALIBRADA) · '+p.name+'\n'+
  'Basada en contrastes de los umbrales digitales. Verifica escuchando música; no compensa una audiometría.\n'+
  proposal.rows.map(x=>{
   const ctrl=physicalEqControl(x.gain,p,c);
   return fmt(x.f)+' · '+(x.gain>=0?'+':'')+x.gain+' dB sugeridos'+
    (ctrl.position===null?' · sin conversión física documentada':
    ' · control '+(ctrl.position>=0?'+':'')+ctrl.position+' '+(c.eqScale==='steps'?'pasos':'dB del control'));
  }).join('\n');
}
function starterEqMarkup(p,r){
 const proposal=starterEqProposal(p),hasProposal=proposal.changes>0;
 const values=proposal.rows.map(x=>{
  const ctrl=physicalEqControl(x.gain,p);
  const physical=ctrl.position===null?'—':(ctrl.position>=0?'+':'')+ctrl.position;
  return '<div class="starter-band"><strong>'+short(x.f)+'</strong><span class="'+(x.gain?'starter-adjust':'')+'">'+(x.gain>=0?'+':'')+x.gain+' dB</span>'+
   '<small>'+(ctrl.position===null?'Unidad física sin verificar':physical+' '+(normalizeCalibrationContext(p.context,p.type).eqScale==='steps'?'pasos':'control'))+'</small></div>';
 }).join('');
 const applied=hasProposal&&proposal.rows.every((v,i)=>r[i]?.gain===v.gain);
 const completed=firstMissing(p)<0;
 return '<section class="card starter-card" id="starterGuide" aria-label="Recomendación práctica para el ecualizador">'+
  '<span class="tiny muted">TU RESULTADO · '+p.bands.length+' BANDAS</span>'+
  '<h2>Qué poner en tu ecualizador</h2>'+
  '<p class="small">'+(hasProposal?
   'Punto de partida <strong>experimental</strong>: '+proposal.changes+' ajustes pequeños sugeridos. No se aplican hasta que los elijas.':
   'Tus mediciones no permiten defender un cambio automático. Punto de partida seguro: controles a 0, y afina escuchando tu música.')+'</p>'+
  '<div class="starter-bands" aria-label="Valores propuestos por frecuencia">'+values+'</div>'+
  (hasProposal?
   '<p class="tiny muted">Estos valores de ±1 dB son una hipótesis basada en diferencias locales de detección digital; NO miden ni corrigen la respuesta acústica del auricular, oído o automóvil. Las bandas extremas y datos incompletos no generan refuerzos. Confirma con música a volumen cómodo.</p>'+
   '<p class="tiny muted">Los umbrales dBFS no pueden transformarse directamente en un ecualizador óptimo. No vamos a inventar refuerzos grandes en las frecuencias que no oyes.</p>')+
  '<div class="row wrap starter-actions">'+
  (hasProposal?button(applied?'✓ Propuesta aplicada':'Aplicar punto de partida','starter-apply','btn-primary grow',applied?'disabled':''):'')+
  button('Copiar valores sugeridos','starter-copy',hasProposal?'btn-alt grow':'btn-primary grow')+
  '</div><p class="tiny muted" id="starterStatus" role="status">'+(hasProposal&&!applied?'Tu EQ actual no cambia hasta pulsar «Aplicar».':'')+'</p>'+
  (completed?'<p class="tiny muted">Prueba completada. No necesitas volver a medir para usar o revisar estos valores.</p>':'<p class="tiny muted">Puedes continuar el test cuando quieras. Estas sugerencias son provisionales.</p>')+
  '</section>';
}

function renderResults(){if(!current)return `<section class="hero"><h1>Todavía no hay ajustes</h1><p>Primero realiza una prueba auditiva.</p>${button('Configurar prueba','setup','btn-primary')}</section>`;
 const p=current,progress=doneCount(p),total=plan(p).length,r=recommend(p),coverage=thresholdCoverage(p,gather(p)),usable=coverage.measured.length,derived=r.filter(x=>x.derived).length,required=coverage.required;
 if(!r.some(x=>x.f===selectedEqFreq))selectedEqFreq=r[0]?.f||null;
 lastRenderedEqSignature=p.id+'|'+r.map(b=>b.f+':'+b.gain).join('|');
 const reliable=coverage.enough&&coverage.candidates>0;
 const status=!coverage.enough?'Cobertura insuficiente para EQ automático; ajustes personales separados.':coverage.candidates===0?'Sin bandas vecinas elegibles para EQ automático: salida neutra, sin inventar corrección.':'Contrastes locales experimentales (v2) + ajustes personales.';
 return `<div class="results-compact"><section class="hero result-head"><p class="eyebrow">AUDIOCAL · AJUSTES PARA TU EQUIPO</p><h1>Tu ecualizador, <em>sin complicaciones.</em></h1><div class="result-profile-picker"><span class="tiny muted">Perfil</span><select class="field" id="resultProfileSelect" aria-label="Seleccionar perfil">${profiles.map(q=>`<option value="${esc(q.id)}" ${q.id===p.id?'selected':''}>${esc(q.name)}</option>`).join('')}</select></div></section>
 ${starterEqMarkup(p,r)}
 <div class="results-grid"><section class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Tu ecualizador actual · ${p.bands.length} bandas</h2><span class="tag" id="eqChangeCount">${r.filter(x=>x.gain!==0).length} cambios</span></div>
 <p class="small muted">Puedes mover cualquier banda manualmente. Estos controles reflejan los valores que llevas aplicados en Hear; los cambios se guardan en tu perfil.</p>
 <div class="eq-stage"><div class="tiny muted">TOCA UNA BARRA · DESLIZA PARA VER MÁS →</div><div class="equalizer"><div class="eqgrid">${r.map(x=>{const span=Math.max(1,p.max-p.min),center=100*p.max/span,y=100*(p.max-x.gain)/span;return `<button type="button" class="eqband ${x.f===selectedEqFreq?'selected':''}" data-eq-select="${x.f}" data-eq-band="${x.f}" aria-label="Editar ${fmt(x.f)}, ${eqMark(x)} decibelios" aria-pressed="${x.f===selectedEqFreq}"><span class="eqval">${eqMark(x)}</span><span class="eqbar"><span class="eqcenter" style="top:${center}%"></span><span class="eqfill" style="top:${Math.min(center,y)}%;height:${Math.max(2,Math.abs(center-y))}%"></span></span><span class="eqlabel">${short(x.f)}</span></button>`}).join('')}</div></div></div>
 ${selectedEqEditor(p,r)}
 <div class="eq-util">${button('⎘ Copiar todos','copy','btn-alt')}${button('↓ TXT','downloadtxt','btn-ghost')}${button('↺ Reiniciar cambios','clearmanual','btn-ghost')}</div>
 <details class="unobtrusive" id="technicalResults"><summary>Ver mediciones originales, precisión y exportar PNG · opcional</summary><div class="inner-detail">
 ${renderCalibrationTrace(p,r)}
 ${eqResultMarkup(p)}
 ${evidenceAuditMarkup(p)}
 <details class="unobtrusive loudness-panel" id="loudnessPanel"><summary>Igualación de sonoridad · experimento opcional</summary><div class="inner-detail" id="loudnessInner">${loudnessMarkup(p)}</div></details>
 ${usable<p.bands.length?`<p class="small muted">${p.bands.length-usable} bandas no tienen ambos umbrales. El test ya conservó los límites observados. Solo repite voluntariamente si quieres mejorar la evidencia. ${button('↺ Repetir bandas sin umbral','retrymissing','btn-ghost')}</p>`:''}
 </div></details>
 <details class="unobtrusive"><summary>Valores exactos y opciones avanzadas</summary><div class="inner-detail"><div class="result-list">${r.map(x=>`<div class="result-item"><div><strong>${fmt(x.f)}</strong><small>${selectedBandInfo(x)}</small></div><div class="itemcontrols"><button type="button" data-adjust="${x.f}" data-delta="-1" aria-label="Reducir ${fmt(x.f)}">−</button><button type="button" data-adjust="${x.f}" data-delta="1" aria-label="Aumentar ${fmt(x.f)}">+</button></div><strong class="value" data-eq-value="${x.f}">${eqMark(x)} <small style="display:inline;color:var(--muted)">dB</small></strong></div>`).join('')}</div><div style="margin-top:10px">${button('Cambiar formato de EQ','format','btn-ghost full')}</div><p class="tiny muted">Los valores se guardan por perfil. Debes introducirlos manualmente en tu equipo.</p></div></details>
 <details class="unobtrusive"><summary>Detalles de la calibración <span class="tiny muted">${progress}/${total} muestras</span></summary><div class="inner-detail"><div class="stat-grid"><div class="stat"><strong>${progress}/${total}</strong><small>MUESTRAS</small></div><div class="stat"><strong>${usable}</strong><small>UMBRALES</small></div><div class="stat"><strong>${r.filter(x=>x.gain!==0).length}</strong><small>CAMBIOS</small></div></div><p class="small">${reliable?'Compensación exploratoria calculable a partir de los umbrales válidos.':coverage.enough&&coverage.candidates===0?'Hay cobertura, pero las bandas medidas no tienen vecinos cercanos para una corrección automática segura.':`Solo ${usable} bandas elegibles de ${p.bands.length}. Necesitas al menos ${required} para evaluar una corrección automática.`} ${derived?`${derived} banda(s) interpolada(s).`:''} Esta no es una audiometría ni una calibración acústica.</p></div></details>
 <p id="copyStatus" class="status" role="status"></p></section>
 <div class="results-side"><details class="unobtrusive music-options" id="musicComparison"><summary>🎵 Comparar con música · opcional</summary><div class="inner-detail"><p class="compact-note">Escucha tu EQ frente al original con una canción propia. La comparación es opcional y solo afecta al sonido de esta página.</p><input type="file" accept="audio/*" id="musicFile" class="field" style="font-size:12px;margin-top:10px" aria-label="Elegir canción"><audio id="audioPlayer" controls preload="metadata" style="width:100%;margin:11px 0" aria-label="Reproductor de comparación"></audio><button type="button" class="btn btn-alt full" id="bypassBtn" data-act="bypass">${eqBypass?'EQ DESACTIVADO · activar':'EQ ACTIVADO · comparar sin EQ'}</button></div></details>
 <section class="card transfer-card"><div id="transferPanel">${transferMarkup()}</div></section>
 <details class="unobtrusive balance-card" id="toneBalance"><summary>🎛️ Afinar bandas escuchando música · opcional</summary><div class="inner-detail"><p class="compact-note">Puedes confirmar qué suena mejor con comparaciones de una canción. Estos cambios son opcionales y no alteran las mediciones auditivas.</p><div id="balanceTrainer">${balanceMarkup()}</div></div></details>
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
function setActive(p){if(current?.id!==p.id){transferCompleted.clear();transferBandIndex=0;transferStep=0;transferStatus='';lastRenderedEqSignature=null}
 resetChannelCheck();resetVolumePreview();introStep=p.channels==='separate'?0:needsVolumePreview(p)?2:3;trial=null;selectedEqFreq=null;preferenceStage=0;preferencePreview=null;preferenceListened=new Set();resetBalanceSession(p);stopTone();if(playerAudio)playerAudio.pause();current=p;currentId=p.id;awaitNext=false;floorReached=false;sampleNote='';resetLoudnessSession();save();eqBypass=false;nav(firstMissing(p)<0?'results':'test')}
function exportDownload(name,text,mime){const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
const cleanName=s=>s.replace(/[^a-z0-9-_]/gi,'_').slice(0,48);
function resultText(p){const r=recommend(p);return `AudioCal Hear · ${p.name}\n${trans('Frecuencias:')} ${p.bands.length} ${trans('bandas')}\n${trans('Resultado perceptivo estimado; revisar mediante escucha.')}\n\n`+r.map(x=>`${fmt(x.f).padEnd(11)} ${x.gain>=0?'+':''}${x.gain} dB${x.derived?' ('+trans('estimado')+')':x.db===null?' ('+trans('sin medición')+')':''}`).join('\n')+'\n\n'+trans('No constituye audiometría ni medición acústica.')+'\n'}
async function copyText(txt){try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(txt);return true}}catch(e){}try{const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.top='-1000px';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch(e){return false}}
function changeEqFormat(){if(!current)return;const ids=Object.keys(presets);const old=current.preset;const options=ids.map((id,i)=>`${i+1}. ${presets[id].name}`).join('\n');const response=uiPrompt('Elige un número de formato para ESTE perfil. Se conservarán los umbrales medidos y se interpolarán solo las frecuencias cercanas a las medidas.\n'+options,String(ids.indexOf(old)+1));if(response===null)return;const id=ids[Number(response)-1];if(!id){uiAlert('Opción inválida');return}if(id==='custom'){uiAlert('Para crear un formato personalizado usa Configurar → nueva calibración.');return}if(id!==old){current.preset=id;current.bands=presets[id].bands.slice();current.min=presets[id].min;current.max=presets[id].max; // Keep collected measurements; do not falsely mark new bands as measured.
 current.formatFrom=old;current.testBandPlan=current.testMode==='quick'?testBands({...current,testBandPlan:null}):null;transferCompleted.clear();transferBandIndex=0;
 if(transferOpen)transferStatus='Cambió el formato de EQ. Revisa todas las posiciones.';
 touch();render();uiAlert('Formato cambiado. Solo las frecuencias que ya probaste cuentan como medidas. Para una recomendación fiable en las nuevas bandas, completa el examen que aparece en Prueba. No reutilices el perfil con otro dispositivo Bluetooth.')}}