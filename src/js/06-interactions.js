
async function handleClick(e){const btn=e.target.closest('button');if(!btn)return;
if(btn.dataset.nav){nav(btn.dataset.nav);return}
if(btn.dataset.sweepSide){if(!sweepSession){sweepSide=btn.dataset.sweepSide;render()}return}
if(btn.dataset.sweepRange){if(!sweepSession){sweepRange=btn.dataset.sweepRange;render()}return}
if(btn.dataset.sweepResponse){sweepLogResponse(btn.dataset.sweepResponse==='yes');return}
if(btn.dataset.loudness){loudnessAction(btn.dataset.loudness);return}
if(btn.dataset.device){const type=btn.dataset.device;temp.name=$('#deviceName')?.value||temp.name;temp.type=type;temp.context=defaultCalibrationContext(type);temp.channels=type==='headphones'?'separate':'both';if(type==='car')setPreset('car7');else if(type==='headphones')setPreset('photo10');else setPreset('iso7');temp.type=type;temp.testStart=Math.min(temp.testStart,maxTestStart(temp));render();return}
if(btn.dataset.transferTarget&&current){transferTarget=btn.dataset.transferTarget;transferStep=0;transferBandIndex=0;transferCompleted=new Set();transferStatus='';refreshTransfer();return}
if(btn.dataset.transferOs&&current){transferOS=btn.dataset.transferOs;transferStep=0;transferBandIndex=0;transferStatus='';refreshTransfer();return}
if(btn.dataset.eqSelect&&current){selectedEqFreq=Number(btn.dataset.eqSelect);updateSelectedEditor();return}
if(btn.dataset.preset){temp.name=$('#deviceName')?.value||temp.name;temp.min=Number($('#eqMin')?.value)||temp.min;temp.max=Number($('#eqMax')?.value)||temp.max;setPreset(btn.dataset.preset);return}
if(btn.dataset.channels){temp.name=$('#deviceName')?.value||temp.name;temp.channels=btn.dataset.channels;render();return}
if(btn.dataset.testmode){temp.name=$('#deviceName')?.value||temp.name;temp.testMode=btn.dataset.testmode;render();return}
if(btn.dataset.passes){temp.name=$('#deviceName')?.value||temp.name;temp.passes=Number(btn.dataset.passes);render();return}
if(btn.dataset.adjust&&current){const f=Number(btn.dataset.adjust),r=recommend(current).find(x=>x.f===f);if(!r)return;const delta=Number(btn.dataset.delta),next=clamp(roundTo(r.gain+delta,current.step),current.min,current.max);current.manual[f]=(Number(current.manual[f])||0)+(next-r.gain);touch();refreshResultsUI();return}
if(btn.dataset.balancePreview&&current){
 if(!playerAudio||!playerUrl||playerAudio.paused){balanceStatus='Primero selecciona una canción y pulsa reproducir.';refreshBalanceUI();return}
 if(!filters.some(f=>Math.abs(f.frequency.value-balanceFreq)<.01)){balanceStatus='Esta frecuencia no está disponible en la salida de audio actual.';refreshBalanceUI();return}
 preferencePreview=null;balancePreview=btn.dataset.balancePreview;balanceListened.add(balancePreview);balanceStatus='Escucha varios segundos antes de cambiar entre A y B.';refreshBalanceUI();return;
}
if(btn.dataset.balanceChoose&&current){balanceChoose(btn.dataset.balanceChoose);return}
if(btn.dataset.prefPreview&&current){
 if(!playerAudio||!playerUrl||playerAudio.paused){const status=$('#prefStatus');if(status)status.textContent='Primero selecciona una canción en el reproductor inferior y pulsa reproducir.';localize(document.body);return}
 balancePreview=null;preferencePreview=btn.dataset.prefPreview;preferenceListened.add(preferencePreview);refreshResultsUI();return;
}
if(btn.dataset.prefChoose&&current){
 if(preferenceStage>=preferenceRounds.length)return;
 if(!playerUrl){const status=$('#prefStatus');if(status)status.textContent='Primero elige un archivo de música y escucha A/B.';localize(document.body);return}
 const choice=btn.dataset.prefChoose;const zone=preferenceRounds[preferenceStage].zone;
 if(preferenceListened.size<2){const status=$('#prefStatus');if(status)status.textContent='Escucha A y B mientras se reproduce la misma canción antes de elegir.';localize(document.body);return}
 const taste=cleanTaste(current);taste[zone]=clamp(taste[zone]+(choice==='A'?-2:choice==='B'?2:0),-3,3);current.taste=taste;
 preferenceStage++;preferencePreview=null;preferenceListened=new Set();touch();refreshResultsUI();return;
}
if(btn.dataset.load){let p=profiles.find(p=>p.id===btn.dataset.load);if(p){introStep=3;trial=null;setActive(p)}return}
if(btn.dataset.export){let p=profiles.find(p=>p.id===btn.dataset.export);if(p)exportDownload('AudioCal_'+cleanName(p.name)+'.json',JSON.stringify({app:'AudioCal Hear',version:1,profiles:[p]},null,2),'application/json');return}
if(btn.dataset.delete){const p=profiles.find(p=>p.id===btn.dataset.delete);if(p&&uiConfirm('¿Borrar el perfil «'+p.name+'»?')){profiles=profiles.filter(x=>x.id!==p.id);if(current?.id===p.id){current=profiles[0]||null;currentId=current?.id||''}save();render()}return}
const a=btn.dataset.act;if(!a)return;
switch(a){
case 'setup':case 'test':case 'results':case 'profiles':nav(a);break;
case 'create':createProfile();break;
case 'check':await playTone(true);break;
case 'checkleft':if(current?.channels==='separate')await playTone(true,'left');break;
case 'checkright':if(current?.channels==='separate')await playTone(true,'right');break;
case 'confirmleft':if(channelCheckPlayed.left){channelVerified.left=true;render()}break;
case 'confirmright':if(channelCheckPlayed.right){channelVerified.right=true;render()}break;
case 'stopaudio':stopTone();if(trial)trial.awaiting=false;floorReached=false;if(playerAudio)playerAudio.pause();render();break;
case 'resume':nav(firstMissing(current)<0?'results':'test');break;
case 'play':await playTone(false);break;
case 'answerYes':answerTone(true);break;
case 'answerNo':answerTone(false);break;
case 'introBack':stopTone();introStep=0;render();break;
case 'introNext':
 if(current?.channels==='separate'&&!channelsReady(current)){uiAlert('Comprueba y confirma los dos canales antes de comenzar.');break}
 if(needsVolumePreview(current)&&!volumeReady){uiAlert('Completa las referencias graduales antes de comenzar.');break}
 stopTone();introStep=3;render();break;
case 'previewlevel':if(current&&introStep===0&&needsVolumePreview(current)){
 volumePreviewPlayed=false;const level=volumePreviewSteps(current)[volumePreviewIndex];
 if(Number.isFinite(level))await playTone(true,'both',level);
}break;
case 'confirmlevel':if(current&&introStep===0&&volumePreviewPlayed&&tone?.mode!=='preview'){
 const steps=volumePreviewSteps(current);volumePreviewPlayed=false;
 if(volumePreviewIndex+1>=steps.length)volumeReady=true;else volumePreviewIndex++;
 render();
}break;
case 'ambient':await checkAmbient();break;
case 'sweep-start':await startSweep();break;
case 'sweep-finish':finishSweep();break;
case 'endheard':if(current&&floorReached){logMeasure('stillheard')}break;
case 'enduncertain':if(current&&floorReached)logMeasure('unconfirmed');break;
case 'retryrecord':if(current&&lastRecordedEntry&&lastResultKind==='unconfirmed'){
  const k=key(lastRecordedEntry.f,lastRecordedEntry.side);
  if(lastRecordedEntry.pass===0){delete current.measures[k]}
  else if(Array.isArray(current.measures[k]))current.measures[k].length=1;
  awaitNext=false;floorReached=false;trial=null;sampleNote='';lastResultKind=null;lastRecordedEntry=null;stopTone();touch();render();
 }break;
 case 'next':awaitNext=false;floorReached=false;trial=null;sampleNote='';render();break;
case 'retry':awaitNext=false;floorReached=false;trial=null;sampleNote='';stopTone();render();break;
case 'resettest':if(current&&uiConfirm('Se borrarán las mediciones de este perfil, pero no los demás perfiles.')){current.measures={};current.loudness={};current.manual={};awaitNext=false;floorReached=false;trial=null;resetChannelCheck();resetVolumePreview();introStep=0;sampleNote='';touch();render()}break;
case 'transfer-open':transferOpen=true;transferStep=0;transferBandIndex=0;transferStatus='';refreshTransfer();break;
case 'transfer-close':transferOpen=false;refreshTransfer();break;
case 'transfer-next':if(!current)return;if(transferStep===1&&!transferMapping(current)){transferStatus='Revisa las frecuencias reales del ecualizador.';refreshTransfer();break}
 transferStep=Math.min(3,transferStep+1);transferBandIndex=0;transferStatus='';refreshTransfer();break;
case 'transfer-prev':transferStep=Math.max(0,transferStep-1);transferStatus='';refreshTransfer();break;
case 'transfer-backbands':transferStep=2;transferStatus='';refreshTransfer();break;
case 'transfer-nextband':if(current){const bands=transferMapping(current)||[];if(transferBandIndex+1<bands.length)transferBandIndex++;else transferStep=3;transferStatus='';refreshTransfer()}break;
case 'transfer-mark':if(current){const bands=transferMapping(current)||[];const f=bands[transferBandIndex]?.f;if(f!==undefined){if(transferCompleted.has(f))transferCompleted.delete(f);else transferCompleted.add(f);refreshTransfer()}}break;
case 'transfer-applyfreq':if(current){transferCustom=$('#transferCustom')?.value||transferCustom;transferStatus=transferMapping(current)?'Bandas registradas. Los valores aproximados se identificarán.':'Revisa las frecuencias: de 2 a 31 valores únicos en orden ascendente.';transferBandIndex=0;transferCompleted=new Set();refreshTransfer()}break;
case 'transfer-copy':if(current){const ok=await copyText(transferCopy(current));transferStatus=ok?'Lista copiada. Debes introducirla manualmente.':'No se pudo copiar la lista.';refreshTransfer()}break;
case 'starter-apply':if(current){
 const proposal=starterEqProposal(current),actual=recommend(current);
 if(proposal.changes){
  const hasPrevious=Object.values(current.manual||{}).some(x=>Number(x)!==0)||Object.values(current.balance||{}).some(x=>Number(x)!==0)||Object.values(current.taste||{}).some(x=>Number(x)!==0);
  if(hasPrevious&&!uiConfirm('Usar esta propuesta reemplazará los valores actuales del EQ. Las respuestas del examen se conservarán. ¿Continuar?'))break;
  for(const [i,item] of proposal.rows.entries()){
   const target=clamp(item.gain,current.min,current.max);
   current.manual[item.f]=(Number(current.manual[item.f])||0)+target-actual[i].gain;
  }
  transferCompleted.clear();lastRenderedEqSignature=null;
  if(transferOpen)transferStatus='Cambió el EQ; revisa los controles físicos antes de aplicarlos.';
  touch();render();
 }break;
}
case 'starter-copy':if(current){
 const ok=await copyText(starterEqCopy(current));
 const el=$('#starterStatus');if(el)el.textContent=ok?'Valores sugeridos copiados. Verifica los controles físicos antes de aplicarlos.':'No se pudo copiar; puedes consultar la tabla superior.';
 break;
}
case 'copy':{let ok=await copyText(resultText(current));$('#copyStatus').textContent=ok?'Valores copiados al portapapeles.':'No se pudo copiar. Usa Descargar TXT.';break}
case 'downloadpng':if(current&&!saveEqCardPng(current))uiAlert('No se pudo generar el PNG.');break;
case 'copycontrols':if(current){const ok=await copyText(eqControlText(current));const el=$('#eqCardNotice');if(el)el.textContent=ok?'Instrucciones copiadas al portapapeles.':'No se pudieron copiar los valores.'}break;
case 'download-audit':if(current)exportDownload('AudioCal_Auditoria_'+cleanName(current.name)+'.csv',evidenceCsv(current),'text/csv;charset=utf-8');break;
case 'downloadtxt':exportDownload('AudioCal_'+cleanName(current.name)+'.txt',resultText(current),'text/plain;charset=utf-8');break;
case 'clearmanual':if(current){current.manual={};touch();refreshResultsUI()}break;
case 'balance-next':if(current){balanceQueueIndex=(balanceQueueIndex+1)%balanceQueue.length;balanceFreq=balanceQueue[balanceQueueIndex];resetBalanceRound();refreshBalanceUI()}break;
case 'balance-repeat':if(current){resetBalanceRound();refreshBalanceUI()}break;
case 'restartprefs':preferenceStage=0;preferencePreview=null;preferenceListened=new Set();refreshResultsUI();break;
case 'retrymissing':if(current){
 const incomplete=plan(current).filter(e=>{
  const sample=current.measures?.[key(e.f,e.side)]?.[e.pass];
  return !sample||sample.kind!=='heard'||!Number.isFinite(sample.db);
 });
 // Preserve other confirmed frequency/side pairs; reset all passes only for a failing pair.
 const failedPairs=[...new Set(incomplete.map(e=>key(e.f,e.side)))];
 for(const pair of failedPairs)delete current.measures[pair];
 if(failedPairs.length){
  stopTone();trial=null;awaitNext=false;floorReached=false;introStep=current.channels==='separate'&&!channelsReady(current)?0:3;touch();nav('test');
 }else uiAlert('Todos los umbrales programados ya están confirmados.');
}break;
case 'format':changeEqFormat();break;
case 'bypass':eqBypass=!eqBypass;balancePreview=null;updatePlayerFilters(preferencePreview?previewTaste():null);btn.textContent=eqBypass?'EQ DESACTIVADO · activar':'EQ ACTIVADO · comparar sin EQ';break;
case 'exportall':exportDownload('AudioCal_Hear_perfiles.json',JSON.stringify({app:'AudioCal Hear',version:1,profiles},null,2),'application/json');break;
case 'import':$('#importInput')?.click();break;
}}
function handleChange(e){const t=e.target;
if(t.id==='sweepMicChoice'){sweepMicEnabled=!!t.checked;return}
if(t.id==='loudnessFrequency'&&current){stopTone();loudnessFreq=Number(t.value);loudnessOffsetDb=0;loudnessListened=new Set();loudnessMessage='Nueva frecuencia seleccionada. Compara las dos señales.';refreshLoudnessUI();return}
if(current&&(t.id==='resultControlMin'||t.id==='resultControlMax')){
  const value=Number(t.value),field=t.id==='resultControlMin'?'controlMin':'controlMax';
  if(!Number.isInteger(value)||(field==='controlMin'&&(value>=0||value<-30))||(field==='controlMax'&&(value<=0||value>30))){
   uiAlert('Introduce un límite físico válido para el control.');render();return;
  }
  current[field]=value;transferCompleted.clear();transferBandIndex=0;
  if(transferOpen)transferStatus='Cambió el rango físico. Revisa nuevamente las posiciones.';
  touch();render();return;
 }
 if(current&&(t.id==='resultEqScale'||t.id==='resultEqStepDb')){
 const f=t.id==='resultEqScale'?'eqScale':'eqStepDb';
 const next={...normalizeCalibrationContext(current.context,current.type),provenance:'captured',[f]:t.value};
 current.context=normalizeCalibrationContext(next,current.type);
 transferCompleted.clear();transferBandIndex=0;
 if(transferOpen)transferStatus='Cambió la escala del equipo. Revisa nuevamente las posiciones de los controles.';
 touch();render();return;
}
if(t.dataset.context&&temp.context){const f=t.dataset.context;const next={...temp.context,[f]:t.value};temp.context=normalizeCalibrationContext(next,temp.type);if(f==='subtype'||f==='eqScale'){temp.name=$('#deviceName')?.value||temp.name;render()}return}
if(current&&t.id==='transferFormat'){transferPreset=t.value;transferBandIndex=0;transferCompleted=new Set();transferStatus='';if(transferPreset==='custom'&&!transferCustom)transferCustom=current.bands.join(', ');refreshTransfer();return}
if(current&&t.id==='transferRange'){transferRange=t.value;transferBandIndex=0;transferCompleted=new Set();transferStatus='';refreshTransfer();return}
if(current&&t.id==='transferCustom'){transferCustom=t.value;return}
if(t.id==='uiLanguage'){if(LOCALES.includes(t.value)){language=t.value;try{localStorage.setItem(LANGUAGE_KEY,language)}catch(e){}localize(document.body)}return}if(t.id==='balanceFrequency'&&current){balanceFreq=Number(t.value);resetBalanceRound();refreshBalanceUI();return}if(t.id==='extraPreset'&&t.value){temp.name=$('#deviceName')?.value||temp.name;setPreset(t.value);return}if(t.id==='resultProfileSelect'){const p=profiles.find(x=>x.id===t.value);if(p){selectedEqFreq=null;setActive(p);nav('results')}return}if(t.id==='eqSlider')return;if(t.id==='deviceName')temp.name=t.value;if(t.id==='eqMin')temp.min=Number(t.value);if(t.id==='eqMax')temp.max=Number(t.value);if(t.id==='controlMin')temp.controlMin=Number(t.value);if(t.id==='controlMax')temp.controlMax=Number(t.value);if(t.id==='customFreqs'){const f=parseBands(t.value);if(f){temp.bands=f;$('#freqSummary').textContent=f.map(short).join(' · ')}}if(t.id==='musicFile')handleResultsEvents(t);
if(t.id==='importInput'&&t.files?.length){
 const file=t.files[0];
 if(file.size>2*1024*1024){uiAlert('El respaldo supera el límite de seguridad de 2 MB.');t.value='';return}
 file.text().then(s=>{
  let data;try{data=JSON.parse(s)}catch(e){uiAlert('Archivo JSON no válido.');return}
  if(!data||typeof data!=='object'||data.app!=='AudioCal Hear'||!Array.isArray(data.profiles)){uiAlert('Formato de perfiles no reconocido.');return}
  let imported=0;
  for(const raw of data.profiles.slice(0,100)){
   if(profiles.length>=200)break;
   const p=normalizedProfile(raw,true);
   if(!p)continue;
   profiles.push(p);imported++;
  }
  save();uiAlert('Se importaron '+imported+' perfil(es).');render();
 }).catch(()=>uiAlert('No se pudo leer el archivo.')).finally(()=>{t.value=''})
}
}
// Ensure user can change tabs without generating sound; pause on backgrounding.
document.addEventListener('click',handleClick);document.addEventListener('change',handleChange);document.addEventListener('input',e=>{const t=e.target;if(t.id==='eqSlider'&&current){const x=recommend(current).find(q=>q.f===selectedEqFreq);if(x){const desired=clamp(roundTo(Number(t.value),current.step),current.min,current.max);current.manual[x.f]=(Number(current.manual[x.f])||0)+(desired-x.gain);touch();refreshResultsUI()}return}if(t.id==='deviceName')temp.name=t.value;if(t.id==='eqMin'&&Number.isFinite(Number(t.value)))temp.min=Number(t.value);if(t.id==='eqMax'&&Number.isFinite(Number(t.value)))temp.max=Number(t.value);if(t.id==='controlMin'&&Number.isFinite(Number(t.value)))temp.controlMin=Number(t.value);if(t.id==='controlMax'&&Number.isFinite(Number(t.value)))temp.controlMax=Number(t.value);if(t.id==='customFreqs'){const f=parseBands(t.value);if(f){temp.bands=f;if($('#freqSummary'))$('#freqSummary').textContent=f.map(short).join(' · ')}}if(t.id==='testStart'){const n=Number(t.value);if(Number.isFinite(n))temp.testStart=clamp(n,-99,maxTestStart(temp))}if(t.id==='testFloor'){const n=Number(t.value);if(Number.isFinite(n))temp.testFloor=clamp(n,-100,-36)}if(['customFreqs','eqMin','eqMax','controlMin','controlMax','testStart','testFloor'].includes(t.id))refreshSetupDuration();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTone();floorReached=false;if(playerAudio)playerAudio.pause();if(page==='test')render()}});window.addEventListener('pagehide',()=>{stopTone();if(playerAudio)playerAudio.pause();try{playerSource?.disconnect()}catch(e){}try{playerPreamp?.disconnect()}catch(e){}try{playerOutput?.disconnect()}catch(e){}if(playerUrl)URL.revokeObjectURL(playerUrl)});
if(current)resetBalanceSession(current);
render();
})();
