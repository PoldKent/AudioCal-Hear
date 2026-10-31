// Guided, read-only transfer of AudioCal EQ suggestions to external equalizers.
// External applications cannot be controlled from this static website.
let transferOpen=false,transferTarget='device',transferOS='android',transferPreset='profile',transferCustom='',transferRange='profile',transferStep=0,transferBandIndex=0,transferCompleted=new Set(),transferStatus='';
const TRANSFER_LIMITS={six:[-6,6],twelve:[-12,12],twenty:[-20,20]};
function transferBands(p){
 if(transferPreset==='profile')return p.bands.slice();
 if(transferPreset==='custom')return parseBands(transferCustom);
 return presets[transferPreset]?.bands?.slice()||null;
}
function transferBounds(p){
 return transferRange==='profile'?[p.min,p.max]:(TRANSFER_LIMITS[transferRange]||[p.min,p.max]);
}
function transferMapping(p){
 const bands=transferBands(p);if(!bands)return null;
 const measured=recommend(p).slice().sort((a,b)=>a.f-b.f),[min,max]=transferBounds(p);
 return bands.map(f=>{
  let match=measured.find(x=>Math.abs(x.f-f)<.00001);
  let raw=null,kind='exact';
  if(match)raw=match.gain;
  else {
   const lo=measured.filter(x=>x.f<f).pop(),hi=measured.find(x=>x.f>f);
   if(lo&&hi&&hi.f/lo.f<=5){
    const ratio=Math.log(f/lo.f)/Math.log(hi.f/lo.f);
    raw=lo.gain+(hi.gain-lo.gain)*ratio;kind='estimated';
   }else kind='unavailable';
  }
  const gain=raw===null?null:clamp(Math.round(raw),min,max);
  return {f,gain,kind,limited:raw!==null&&(raw<min||raw>max)};
 });
}
function transferPath(p){
 if(transferTarget==='spotify'){
  if(transferOS==='desktop')return ['Abre Spotify en tu computadora.','Haz clic en tu foto de perfil → Configuración.','Busca Reproducción y activa Ecualizador.','Usa el ecualizador manual. Los nombres y frecuencias pueden variar según la versión.'];
  return ['Abre Spotify en tu '+(transferOS==='ios'?'iPhone o iPad.':'teléfono Android.'),'Toca tu foto de perfil → Configuración y privacidad.','Entra en Reproducción → Ecualizador y actívalo si está disponible.','Arrastra las bandas del ecualizador. En Android puede abrirse el EQ del sistema.'];
 }
 if(transferTarget==='youtube'){
  if(transferOS==='android')return ['Abre YouTube Music y toca tu foto de perfil.','Abre Configuración y busca Ecualizador.','Si existe la opción, puede abrir el ecualizador de Android o del fabricante.','Si no aparece, utiliza el EQ de tus auriculares, equipo o sistema; no hay control universal desde AudioCal.'];
  return ['YouTube Music no ofrece un ecualizador manual universal en este entorno.','Abre la app de tus auriculares, del altavoz o el ecualizador compatible del dispositivo.','Busca un modo Personalizado o Manual y desactiva otros efectos que dupliquen la corrección.','Introduce los valores de AudioCal en ese ecualizador, no en YouTube Music.'];
 }
 if(p.type==='car')return ['Estaciona el automóvil antes de ajustar el audio.','Abre el menú Sonido o Audio de tu equipo.','Busca Ecualizador → Personalizado o Manual (los nombres varían según el modelo).','Comprueba las frecuencias y límites de la pantalla antes de mover cada banda.'];
 if(p.type==='speaker')return ['Abre la aplicación o controles de tus parlantes.','Busca Sonido → Ecualizador → Personalizado o Manual.','Identifica las frecuencias y el rango real de ganancia.','Aplica los valores sin activar simultáneamente varios ecualizadores.'];
 return ['Abre la aplicación de tus auriculares o la configuración de audio del dispositivo.','Busca Ecualizador → Personalizado o Manual.','Comprueba las frecuencias que realmente aparecen.','Introduce los valores de AudioCal una banda a la vez.'];
}
function transferNotice(p){
 if(transferTarget==='spotify')return 'Spotify Connect no permite modificar el sonido desde el EQ local del teléfono cuando reproduce en otro dispositivo. En Android el EQ del sistema puede afectar otras aplicaciones.';
 if(transferTarget==='youtube')return 'La disponibilidad del ecualizador de YouTube Music varía por plataforma y dispositivo. AudioCal no puede modificar directamente su reproducción.';
 return p.type==='car'?'Ajusta el sonido solamente con el automóvil estacionado.':'El ecualizador de cada fabricante puede tener bandas y límites distintos.';
}
function transferLabel(entry){
 if(entry.kind==='unavailable')return 'Sin equivalente fiable · no modificar';
 return (entry.gain>0?'+':'')+entry.gain+' dB'+(entry.kind==='estimated'?' · aproximado':'')+(entry.limited?' · limitado al EQ':'');
}
function transferCopy(p){
 const list=transferMapping(p);
 return 'AudioCal Hear · '+p.name+'\nDestino: '+(transferTarget==='spotify'?'Spotify':transferTarget==='youtube'?'YouTube Music / EQ del dispositivo':'Ecualizador del dispositivo')+'\n'+(list||[]).map(x=>fmt(x.f)+' → '+transferLabel(x)).join('\n')+'\n\nAplica manualmente; revisa las frecuencias y el rango de tu equipo. No actives dos ecualizadores simultáneos.\n';
}
function transferMarkup(){
 if(!current)return '';
 const p=current;
 if(!transferOpen)return '<div class="transfer-intro"><h2>🎚 Aplicar mis ajustes</h2><p class="compact-note">¿Quieres ayuda para llevar los valores a Spotify, YouTube Music o a tu equipo? Te mostraré qué bandas mover y cuánto.</p>'+button('Sí, ayúdame paso a paso','transfer-open','btn-primary full')+'</div>';
 const list=transferMapping(p),stepNames=['Dónde abrir el ecualizador','Confirmar sus bandas','Ajustar cada frecuencia','Comprobar el resultado'];
 const count=list?.length||0;
 if(transferBandIndex>=count)transferBandIndex=Math.max(0,count-1);
 let content='';
 if(transferStep===0){
  const paths=transferPath(p);
  content='<div class="transfer-steps">'+paths.map((x,i)=>'<div class="transfer-path"><strong>'+(i+1)+'.</strong><span>'+esc(x)+'</span></div>').join('')+'</div><p class="tiny muted">'+esc(transferNotice(p))+'</p>';
 }else if(transferStep===1){
  const formatOptions=[['profile','Las bandas de mi perfil'],['car7','Auto · 7 bandas'],['photo10','Auriculares · 10 bandas'],['iso7','Estándar · 7 bandas'],['iso10','Estándar · 10 bandas'],['five','Estándar · 5 bandas'],['iso15','15 bandas'],['iso31','31 bandas'],['custom','Escribir otras frecuencias']];
  content='<p class="compact-note">Mira el ecualizador de destino: ¿qué frecuencias muestra? No asumas que Spotify o YouTube Music tienen las mismas bandas que AudioCal.</p><label for="transferFormat">Frecuencias del ecualizador de destino</label><select class="field" id="transferFormat">'+formatOptions.map(([v,l])=>'<option value="'+v+'" '+(transferPreset===v?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select>'+
  (transferPreset==='custom'?'<label for="transferCustom">Frecuencias reales (Hz, en orden)</label><input id="transferCustom" class="field" value="'+esc(transferCustom)+'" placeholder="60, 150, 400, 1000, 2400, 15000">'+button('Comprobar estas bandas','transfer-applyfreq','btn-alt full'):'')+
  '<label for="transferRange">Límite de ganancia visible en ese ecualizador</label><select id="transferRange" class="field">'+[['profile','El del perfil ('+p.min+' a +'+p.max+' dB)'],['six','−6 a +6 dB'],['twelve','−12 a +12 dB'],['twenty','−20 a +20 dB']].map(([v,l])=>'<option value="'+v+'" '+(transferRange===v?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select>'+
  '<p class="tiny muted">Si el equipo no indica dB o usa otra escala, estos valores son solo una referencia visual, no una equivalencia exacta.</p>'+
  (list?'<p class="small muted">'+list.length+' bandas de destino · '+list.filter(x=>x.kind==='estimated').length+' aproximadas · '+list.filter(x=>x.kind==='unavailable').length+' sin equivalencia fiable</p>':'<p class="soft warning small">Introduce entre 2 y 31 frecuencias válidas, ascendentes, de 20 a 20.000 Hz.</p>');
 }else if(transferStep===2){
  if(!list)content='<p class="soft warning">Primero introduce frecuencias válidas.</p>';
  else{
   const item=list[transferBandIndex],inProgress=transferCompleted.has(item.f);
   const movement=item.gain===null?'No modificar esta banda':item.gain>0?'Súbela '+item.gain+' dB':item.gain<0?'Bájala '+Math.abs(item.gain)+' dB':'Déjala en 0 dB';
   content='<p class="small muted">Banda '+(transferBandIndex+1)+' de '+count+' · '+transferCompleted.size+' revisadas</p>'+
   '<div class="transfer-current"><div class="tiny muted">FRECUENCIA</div><div class="transfer-freq">'+esc(fmt(item.f))+'</div><div class="transfer-instruction">'+esc(movement)+'</div><p class="tiny muted">'+esc(transferLabel(item))+'</p></div>'+
   '<div class="row wrap">'+button(inProgress?'✓ Revisada':'✓ Ya ajusté esta banda','transfer-mark','btn-alt grow')+button('Siguiente banda →','transfer-nextband','btn-primary grow')+'</div>'+
   '<details class="unobtrusive"><summary>Ver la lista completa de ajustes</summary><div class="inner-detail">'+transferTable(list)+'</div></details>';
  }
 }else{
  content='<div class="soft info"><strong>Comprueba tu sonido</strong><p class="small">Reproduce una canción habitual en el mismo dispositivo. Compara el ecualizador activado y desactivado al mismo volumen cómodo. Si notas distorsión, reduce ganancia o desactiva la corrección.</p></div>'+
  '<p class="small">Tu canción local sigue disponible para las comparaciones A/B dentro de AudioCal. Spotify y YouTube Music se ajustan manualmente.</p>'+transferTable(list||[])+
  '<p class="tiny muted">No combines la misma corrección en Spotify y en el ecualizador del teléfono/auriculares; los efectos pueden acumularse.</p>';
 }
 return '<div class="transfer-guide"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">🎚 Aplicar mis ajustes</h2>'+button('Cerrar','transfer-close','btn-ghost')+'</div>'+
 '<p class="tiny muted">Asistencia manual, sin acceso a tus cuentas ni control remoto del equipo.</p>'+
 '<div class="mini-options transfer-targets">'+[['device','Mi equipo'],['spotify','Spotify'],['youtube','YouTube Music']].map(([v,l])=>'<button type="button" class="choice '+(transferTarget===v?'selected':'')+'" data-transfer-target="'+v+'"><strong>'+l+'</strong></button>').join('')+'</div>'+
 (transferTarget!=='device'?'<p class="small muted">¿En qué dispositivo reproduces la música?</p><div class="mini-options transfer-os">'+[['android','Android'],['ios','iPhone / iPad'],['desktop','Computadora']].map(([v,l])=>'<button type="button" class="choice '+(transferOS===v?'selected':'')+'" data-transfer-os="'+v+'"><strong>'+l+'</strong></button>').join('')+'</div>':'')+
 '<div class="transfer-step-head"><strong>Paso '+(transferStep+1)+' de 4 · '+esc(stepNames[transferStep])+'</strong><div class="progress"><div style="width:'+((transferStep+1)*25)+'%"></div></div></div>'+content+
 '<div class="row wrap transfer-nav">'+(transferStep>0?button('← Anterior','transfer-prev','btn-ghost grow'):'')+(transferStep!==2&&transferStep<3?button('Continuar →','transfer-next','btn-primary grow'):'')+
 (transferStep===3?button('Volver a las bandas','transfer-backbands','btn-alt grow'):'')+'</div>'+
 '<div class="row wrap">'+button('⎘ Copiar lista completa','transfer-copy','btn-ghost grow')+'</div>'+
 '<p id="transferStatus" role="status" class="tiny muted">'+esc(transferStatus)+'</p></div>';
}
function transferTable(list){
 return '<div class="transfer-table">'+list.map(x=>'<div class="transfer-line"><strong>'+esc(fmt(x.f))+'</strong><span>'+esc(transferLabel(x))+'</span></div>').join('')+'</div>';
}
function refreshTransfer(){const target=$('#transferPanel');if(!target)return;target.innerHTML=transferMarkup();localize(target)}
