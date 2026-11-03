
/* Optional loudness matching: raw relative comparisons only; never modifies recommend(). */
let loudnessFreq=null,loudnessOffsetDb=0,loudnessListened=new Set(),loudnessMessage='';
function resetLoudnessSession(){stopTone();loudnessFreq=null;loudnessOffsetDb=0;loudnessListened=new Set();loudnessMessage=''}
function loudnessEligibleBands(p){
 return p.bands.filter(f=>f>=100&&f<=10000&&Math.abs(Math.log2(f/1000))>.08);
}
function loudnessSelectedBand(p){
 const eligible=loudnessEligibleBands(p);
 if(!eligible.length)return null;
 if(!eligible.includes(loudnessFreq))loudnessFreq=eligible[0];
 return loudnessFreq;
}
function loudnessRowText(samples){
 if(!samples?.length)return 'Sin datos';
 const offsets=samples.map(x=>(x.offsetDb>=0?'+':'')+x.offsetDb+' dBFS').join(' / ');
 return offsets+' · '+loudnessEvidenceStatus(samples);
}
function loudnessMarkup(p){
 const bands=loudnessEligibleBands(p),selected=loudnessSelectedBand(p);
 const records=p.loudness||{};
 if(selected===null)return '<p class="compact-note">Este ecualizador no tiene bandas entre 100 Hz y 10 kHz distintas de la referencia de 1 kHz. Conserva el resultado original del test.</p>';
 const samples=records[selected]||[],count=samples.length;
 const rows=bands.map(f=>'<tr><th scope="row">'+fmt(f)+'</th><td>'+esc(loudnessRowText(records[f]))+'</td></tr>').join('');
 return `<p class="compact-note"><strong>Procedimiento exploratorio, independiente del EQ.</strong> Escucha dos tonos de 1 segundo: referencia 1 kHz a −48 dBFS y frecuencia evaluada entre −54 y −42 dBFS. Son niveles digitales, no niveles seguros de presión sonora garantizados. Mantén un volumen físico bajo, fijo y cómodo. No intentes compensar tonos inaudibles subiendo el volumen.</p>
 <p class="tiny muted">Compara su intensidad percibida, no su timbre. Se necesitan dos comparaciones por banda. No se utilizan estas diferencias para subir ni bajar automáticamente el ecualizador.</p>
 <label for="loudnessFrequency">Frecuencia a comparar contra 1 kHz</label>
 <select id="loudnessFrequency" class="field">${bands.map(f=>'<option value="'+f+'" '+(f===selected?'selected':'')+'>'+fmt(f)+'</option>').join('')}</select>
 <div class="loudness-work">
 <p class="small"><strong>${count>=2?'Dos respuestas guardadas':'Comparación '+(count+1)+' de 2'}</strong> · ajuste relativo de la frecuencia evaluada:</p>
 <div class="loudness-offset">
 <button type="button" data-loudness="minus" aria-label="Reducir señal comparada 1 dB">−</button>
 <strong>${loudnessOffsetDb>=0?'+':''}${loudnessOffsetDb} dBFS respecto a referencia</strong>
 <button type="button" data-loudness="plus" aria-label="Aumentar señal comparada 1 dB">+</button></div>
 <div class="row wrap"><button type="button" class="btn btn-alt grow" data-loudness="reference">▶ Referencia 1 kHz</button>
 <button type="button" class="btn btn-alt grow" data-loudness="target">▶ ${fmt(selected)}</button></div>
 <div class="row wrap"><button type="button" class="btn btn-primary grow" data-loudness="record">${count>=2?'Volver a medir esta banda':'Registrar comparación'}</button>
 <button type="button" class="btn btn-ghost grow" data-loudness="stop">■ Detener</button></div>
 <p class="small" role="status" id="loudnessStatus">${esc(loudnessMessage||'Escucha ambas señales por separado antes de registrar una comparación. Si no distingues los sonidos, omite esta banda.')}</p>
 <p class="tiny muted">Las bandas fuera de 100 Hz–10 kHz se excluyen de esta prueba exploratoria, pero siguen presentes en tu EQ y test principal.</p>
 </div>
 <div class="trace-table-scroll"><table class="trace-table"><thead><tr><th>Banda</th><th>Comparaciones relativas guardadas</th></tr></thead><tbody>${rows}</tbody></table></div>
 <p class="tiny muted">Un valor positivo significa que amplificaste digitalmente la señal comparada para percibirla semejante a la referencia. NO significa que el EQ deba aumentar ese valor: la sensibilidad de cada frecuencia y el entorno ya producen diferencias normales.</p>`;
}
function refreshLoudnessUI(){
 const panel=$('#loudnessInner');
 if(panel&&current)panel.innerHTML=loudnessMarkup(current);
 localize(document.body);
}

async function playLoudnessSample(which,integrated=false){
 if(!current||!(integrated?page==='test'&&introStep===3:page==='results'))return;
 const entry=integrated?inlineLoudnessEntry(current):null;
 if(integrated&&!entry)return;
 const f=integrated?entry.f:loudnessSelectedBand(current);if(f===null)return;
 const profile=current,comparisonKey=integrated?key(entry.f,entry.side):'';
 const frequency=which==='reference'?1000:f;
 const offset=integrated?inlineLoudnessOffsetDb:loudnessOffsetDb;
 const db=LOUDNESS_REFERENCE_DBFS+(which==='target'?offset:0);
 const update=(msg)=>{
  if(integrated){inlineLoudnessMessage=msg;inlineLoudnessRefresh()}
  else{loudnessMessage=msg;refreshLoudnessUI()}
 };
 if(db>LOUDNESS_REFERENCE_DBFS+LOUDNESS_OFFSET_LIMIT||db<LOUDNESS_REFERENCE_DBFS-LOUDNESS_OFFSET_LIMIT)return;
 try{
  if(integrated&&trial)trial.awaiting=false;
  stopTone();const startEpoch=audioStartEpoch;if(playerAudio)playerAudio.pause();
  const ctx=await ensureAudio();
  if(startEpoch!==audioStartEpoch||document.hidden||current!==profile||
   (integrated?(page!=='test'||introStep!==3||key(inlineLoudnessEntry(profile)?.f,inlineLoudnessEntry(profile)?.side)!==comparisonKey):
    (page!=='results'||loudnessSelectedBand(profile)!==f)))return;
  if(frequency>=ctx.sampleRate/2){update('Esta frecuencia supera la capacidad digital del dispositivo.');return}
  const side=integrated?entry.side:'both';
  const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
  if(side!=='both'&&!pan){update('El navegador no puede aislar este oído. Omite la comparación.');return}
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type='sine';osc.frequency.value=frequency;
  if(pan){pan.pan.value=side==='left'?-1:side==='right'?1:0;osc.connect(pan);pan.connect(gain)}
  else osc.connect(gain);
  gain.connect(ctx.destination);
  const t=ctx.currentTime+.03,amp=Math.pow(10,db/20);
  gain.gain.setValueAtTime(0.00000001,t);
  gain.gain.linearRampToValueAtTime(amp,t+.1);
  gain.gain.setValueAtTime(amp,t+.85);
  gain.gain.linearRampToValueAtTime(.00000001,t+.98);
  osc.start(t);osc.stop(t+1.03);
  osc.onended=()=>{try{osc.disconnect();pan?.disconnect();gain.disconnect()}catch(e){}if(tone?.osc===osc)tone=null};
  tone={mode:'loudness',osc,gain,pan,start:t};
  (integrated?inlineLoudnessListened:loudnessListened).add(which);
  update('Señal '+(which==='reference'?'de referencia':'evaluada')+' reproducida a '+db+' dBFS. Mantén el volumen físico constante.');
 }catch(e){update('No se pudo reproducir el tono: '+e.message)}
}
function recordLoudnessSample(p){
 const f=loudnessSelectedBand(p);
 if(f===null)return false;
 if(!loudnessListened.has('reference')||!loudnessListened.has('target')){
  loudnessMessage='Escucha primero ambas señales de esta comparación.';return false;
 }
 if(!p.loudness||typeof p.loudness!=='object')p.loudness={};
 let records=Array.isArray(p.loudness[f])?p.loudness[f]:[];
 if(records.length>=2)records=[];
 records=[...records,{offsetDb:loudnessOffsetDb,referenceDbfs:LOUDNESS_REFERENCE_DBFS,
  method:'relative-tone-match-v1',at:Date.now()}];
 p.loudness[f]=records;
 loudnessMessage=records.length===1?'Primera comparación registrada. Repite con los mismos niveles físicos de escucha.':
  'Dos comparaciones registradas: '+loudnessEvidenceStatus(records)+'. Estos datos no modifican el EQ.';
 loudnessOffsetDb=0;loudnessListened=new Set();
 touch();return true;
}
function loudnessAction(action){
 if(!current)return;
 if(action==='stop'){stopTone();loudnessMessage='Tono detenido.';refreshLoudnessUI();return}
 if(action==='reference'||action==='target'){void playLoudnessSample(action);return}
 if(action==='plus'||action==='minus'){
  stopTone();loudnessOffsetDb=clamp(loudnessOffsetDb+(action==='plus'?1:-1),-LOUDNESS_OFFSET_LIMIT,LOUDNESS_OFFSET_LIMIT);
  loudnessListened.delete('target');
  loudnessMessage='Ajuste '+(loudnessOffsetDb>0?'+':'')+loudnessOffsetDb+' dBFS. Vuelve a escuchar la señal evaluada.';
 }else if(action==='record'){stopTone();recordLoudnessSample(current)}
 refreshLoudnessUI();
}
