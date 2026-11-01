
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
async function playLoudnessSample(which){
 if(!current||page!=='results')return;
 const f=loudnessSelectedBand(current);if(f===null)return;
 const profileId=current.id;
 const frequency=which==='reference'?1000:f;
 const db=LOUDNESS_REFERENCE_DBFS+(which==='target'?loudnessOffsetDb:0);
 if(db>LOUDNESS_REFERENCE_DBFS+LOUDNESS_OFFSET_LIMIT)return;
 try{
  stopTone();
  if(playerAudio)playerAudio.pause();
  const ctx=await ensureAudio();
  if(!current||current.id!==profileId||page!=='results'||loudnessSelectedBand(current)!==f)return;
  if(frequency>=ctx.sampleRate/2){loudnessMessage='Frecuencia fuera del rango reproducible en este equipo.';refreshLoudnessUI();return}
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type='sine';oscillator.frequency.value=frequency;
  oscillator.connect(gain);gain.connect(ctx.destination);
  const t=ctx.currentTime+.03,amp=Math.pow(10,db/20);
  gain.gain.setValueAtTime(0.00000001,t);
  gain.gain.linearRampToValueAtTime(amp,t+.1);
  gain.gain.setValueAtTime(amp,t+.85);
  gain.gain.linearRampToValueAtTime(.00000001,t+.98);
  oscillator.start(t);oscillator.stop(t+1.03);
  oscillator.onended=()=>{try{oscillator.disconnect();gain.disconnect()}catch(e){}if(tone?.osc===oscillator)tone=null};
  tone={mode:'loudness',osc:oscillator,gain,start:t};
  loudnessListened.add(which);
  loudnessMessage='Señal '+(which==='reference'?'de referencia':'evaluada')+' reproducida a '+db+' dBFS digitales. Compara sin cambiar el volumen físico.';
  refreshLoudnessUI();
 }catch(e){loudnessMessage='No se pudo reproducir el tono: '+e.message;refreshLoudnessUI()}
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
