
/* Audits repeatability only. No equal-loudness-to-EQ conversion. */
const EVIDENCE_AUDIT_VERSION='evidence-audit-v1';
function evidenceReport(p){
 const eligible=loudnessEligibleBands(p),auto=recommend(p);
 const half=pass=>{
  const measures=Object.create(null);
  for(const [k,a] of Object.entries(p.measures||{}))
   if(Array.isArray(a)&&a[pass])measures[k]=[a[pass]];
  return recommend({...p,measures,passes:1});
 };
 const split=p.passes===2?[half(0),half(1)]:null;
 const rows=p.bands.map((f,i)=>{
  const sides=p.channels==='separate'?['left','right']:['both'];
  const trials=sides.map(s=>{
   const a=p.measures?.[key(f,s)]||[];
   return [0,1].map(n=>a[n]?.kind==='heard'&&Number.isFinite(a[n].db)?a[n].db:null);
  });
  const first=trials.map(x=>x[0]).filter(Number.isFinite),second=trials.map(x=>x[1]).filter(Number.isFinite);
  const hasTwoValues=p.passes===2&&trials.every(x=>x.every(Number.isFinite));
  const paired=hasTwoValues&&sides.every(side=>independentThresholdPair(p,f,side));
  const historical=hasTwoValues&&!paired;
  const earsDiffer=first.length===2&&Math.abs(first[0]-first[1])>9;
  const repeated=paired&&!earsDiffer&&trials.every(x=>Math.abs(x[0]-x[1])<=6)&&
   (second.length<2||Math.abs(second[0]-second[1])<=9);
  const raw=Array.isArray(p.loudness?.[f])?p.loudness[f]:[];
  const offsets=raw.slice(0,2).filter(x=>Number.isInteger(x?.offsetDb)&&Math.abs(x.offsetDb)<=6).map(x=>x.offsetDb);
  const ceiling=offsets.some(x=>Math.abs(x)===6);
  const matchStable=offsets.length===2&&!ceiling&&Math.abs(offsets[0]-offsets[1])<=2;
  const thresholdStatus=historical?'Confirmación histórica; no son dos búsquedas independientes':
   earsDiffer?'Oídos distintos':repeated?'Repetible en búsquedas independientes':
   paired?'Revisar variación':first.length?'Sin segunda búsqueda independiente':'Sin umbral';
  const matchStatus=offsets.length<2?offsets.length?'Repetir':'Sin comparación':
   ceiling?'Límite del test':matchStable?'Repetible':'Inconsistente';
  const a=paired?split[0][i].base:null,b=paired?split[1][i].base:null;
  const autoStable=Boolean(repeated&&a!==null&&a*b>0);
  const autoStatus=a===null?(historical?'Confirmación histórica; no se valida estabilidad':'Sin dos búsquedas independientes'):!repeated?'No reproducible':
   a===0&&b===0?'Ambos neutros':autoStable?'Dirección repetida':'Cálculos distintos';
  return {f,threshold:{first:first.length?median(first):null,second:second.length?median(second):null,
    paired,repeated,historical,status:thresholdStatus},
   loudness:{offsets,eligible:eligible.includes(f),stable:matchStable,status:matchStatus},
   auto:{gain:auto[i].base,stable:autoStable,status:autoStatus}};
 });
 const count={threshold:rows.filter(x=>x.threshold.repeated).length,
  thresholdPairs:rows.filter(x=>x.threshold.paired).length,
  historical:rows.filter(x=>x.threshold.historical).length,
  matching:rows.filter(x=>x.loudness.stable).length,
  matchingPairs:rows.filter(x=>x.loudness.offsets.length===2).length,
  automatic:rows.filter(x=>x.auto.stable).length,
  active:rows.filter(x=>x.auto.gain!==0).length};
 return {version:EVIDENCE_AUDIT_VERSION,algorithm:EQ_ALGORITHM_VERSION,context:calibrationContextLabel(p),rows,count};
}
function evidenceAuditMarkup(p){
 const report=evidenceReport(p),n=report.count;
 const shown=v=>v===null?'—':v+' dBFS';
 const rows=report.rows.map(x=>{
  const t=x.threshold,l=x.loudness,a=x.auto;
  const offsets=l.offsets.length?l.offsets.map(v=>(v>0?'+':'')+v).join(' / ')+' dBFS':'—';
  return '<tr><th scope="row">'+fmt(x.f)+'</th><td>'+shown(t.first)+' / '+shown(t.second)+
   '<small style="display:block">'+esc(t.status)+'</small></td><td>'+offsets+
   '<small style="display:block">'+esc(l.status)+'</small></td><td>'+
   (a.gain>0?'+':'')+a.gain+' dB<small style="display:block">'+esc(a.status)+'</small></td></tr>';
 }).join('');
 return '<section id="evidenceAudit" class="evidence-audit">'+
 '<h2>Validar la estabilidad de los resultados</h2>'+
 '<p class="small muted">Comparación independiente. No modifica la medición ni la corrección automática.</p>'+
 '<div class="evidence-metrics"><div><strong>'+n.threshold+'/'+p.bands.length+'</strong><span>Umbrales repetibles</span></div>'+
 '<div><strong>'+n.matching+'/'+loudnessEligibleBands(p).length+'</strong><span>Sonoridad repetible</span></div>'+
 '<div><strong>'+n.automatic+'/'+n.active+'</strong><span>Dirección del EQ repetida</span></div></div>'+
 '<p class="compact-note">'+(p.passes===2?'Umbrales con dos pasadas: '+n.thresholdPairs+'.':
 'Para evaluar repetibilidad del test original, realiza dos búsquedas independientes.')+
 ' Registros históricos no independientes: '+n.historical+'. Comparaciones dobles de sonoridad: '+n.matchingPairs+'.</p>'+
 '<div class="trace-table-scroll"><table class="trace-table"><thead><tr><th>Frecuencia</th>'+
 '<th>Umbral pasada 1 / 2</th><th>Sonoridad comparación 1 / 2</th>'+
 '<th>EQ automático · estabilidad</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
 '<p class="tiny muted">Repetibilidad no demuestra precisión acústica ni preferencia musical. Los dBFS no son dB SPL ni ganancias del EQ. Los límites ±6 dBFS de la comparación se marcan como no concluyentes.</p>'+
 button('↓ Exportar evidencia CSV','download-audit','btn-alt full')+'</section>';
}
function evidenceCsv(p){
 const r=evidenceReport(p),q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
 const lines=[['AudioCal Hear','Evidencia experimental, no calibración acústica'],
  ['Algoritmo',r.algorithm],['Informe',r.version],['Perfil',p.name],['Contexto',r.context],['Aclaración histórica','Las confirmaciones antiguas no cuentan como búsquedas independientes'],
  ['Frecuencia Hz','Umbral pasada 1 dBFS','Umbral pasada 2 dBFS','Estado umbral',
   'Sonoridad comparación 1 dBFS relativo','Sonoridad comparación 2 dBFS relativo',
   'Estado sonoridad','EQ automático dB','Estado EQ']];
 for(const x of r.rows)lines.push([x.f,x.threshold.first,x.threshold.second,x.threshold.status,
  x.loudness.offsets[0]??'',x.loudness.offsets[1]??'',x.loudness.status,x.auto.gain,x.auto.status]);
 return '\uFEFF'+lines.map(row=>row.map(q).join(',')).join('\r\n')+'\r\n';
}
