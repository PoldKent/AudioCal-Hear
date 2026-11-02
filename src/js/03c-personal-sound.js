
// The Personal Sound workflow shares one actual EQ result across previews and exports.
// An uncalibrated listening test is not an audiogram and never justifies aggressive boosts.
const PERSONAL_SOUND_VERSION='personal-sound-v1';
const PERSONAL_SOUND_MIN_LISTEN_MS=1800;
let personalSoundPreview={profile:'',heardWith:false,heardWithout:false,mode:null,since:0};
function personalSoundEqSignature(p,rows=recommend(p)){
 return p.id+'|'+p.bands.join(',')+'|'+rows.map(b=>b.f+':'+b.gain).join('|');
}
function personalSoundStatus(p,rows=recommend(p)){
 const data=gather(p),coverage=thresholdCoverage(p,data);
 const completed=doneCount(p)>=plan(p).length;
 const measured=coverage.complete.length;
 const good=data.filter(x=>x.quality==='good'&&!x.derived&&hasBothChannelThresholds(p,x.f)).length;
 const provisional=data.filter(x=>x.quality!=='good'&&Number.isFinite(x.db)&&!x.derived).length;
 const review=p.personalSoundReview;
 const sig=personalSoundEqSignature(p,rows);
 const verified=review?.signature===sig?review.choice:null;
 const tuned=rows.filter(x=>Math.abs(x.gain)>0).length;
 const grade=!completed?'incompleto':measured===0?'sin-umbrales':measured<p.bands.length?'parcial':
  provisional?'estimado':'medido';
 const tip=!completed?'Aún hay frecuencias pendientes. La curva será provisional.':
  measured===0?'No hay umbrales estimables. Conserva el EQ neutro hasta disponer de evidencia.':
  measured<p.bands.length?'Hay frecuencias sin datos de ambos oídos: no inferimos ganancias de esas bandas.':
  provisional?'Hay umbrales estimados con confianza limitada; limita las correcciones y comprueba el sonido.':
  'Umbrales digitales registrados. La curva sigue siendo experimental y requiere comprobación perceptiva.';
 return {grade,tip,measured,good,provisional,tuned,verified,signature:sig,completed,
  hasSweep:!!Object.keys(p.sweepRecords||{}).length,version:PERSONAL_SOUND_VERSION};
}
function personalSoundPreviewMark(mode,now=Date.now()){
 if(!current||!['with','without'].includes(mode))return;
 if(personalSoundPreview.profile!==current.id)
  personalSoundPreview={profile:current.id,heardWith:false,heardWithout:false,mode:null,since:0};
 const state=personalSoundPreview;
 if(state.mode===mode)return;
 if(state.mode&&now-state.since>=PERSONAL_SOUND_MIN_LISTEN_MS){
  if(state.mode==='with')state.heardWith=true;
  if(state.mode==='without')state.heardWithout=true;
 }
 state.mode=mode;state.since=now;
}
function personalSoundPreviewPause(now=Date.now()){
 const state=personalSoundPreview;
 if(!state.mode)return;
 if(now-state.since>=PERSONAL_SOUND_MIN_LISTEN_MS){
  if(state.mode==='with')state.heardWith=true;
  if(state.mode==='without')state.heardWithout=true;
 }
 state.mode=null;state.since=0;
}
function personalSoundReviewMarkup(p){
 const m=personalSoundStatus(p),review=p.personalSoundReview;
 const rating=m.verified==='better'?'Prefieres el sonido personalizado':
  m.verified==='same'?'No notaste una diferencia clara':
  m.verified==='worse'?'Prefieres el sonido original':null;
 const heard=personalSoundPreview.profile===p.id&&personalSoundPreview.heardWith&&personalSoundPreview.heardWithout;
 return '<div class="personal-sound-review" id="personalSoundReview">'+
  '<strong>¿Te gusta más el resultado?</strong>'+
  '<p class="tiny muted">Escucha tu música con el EQ encendido y apagado a volumen cómodo. La comparación es opcional; no cambia los umbrales. El ecualizador físico externo no se controla desde Hear.</p>'+
  (rating?'<p class="small"><strong>Última opinión guardada:</strong> '+rating+'</p>':'')+
  '<div class="row wrap">'+
  button('Mejor','sound-better','btn-alt grow',heard?'':'disabled')+
  button('Igual','sound-same','btn-ghost grow',heard?'':'disabled')+
  button('Peor','sound-worse','btn-ghost grow',heard?'':'disabled')+
  '</div><p class="tiny muted" role="status">'+(heard?
  'Comparaste los dos modos en esta sesión: puedes guardar tu opinión.':
  'Reproduce la canción, escucha ambos modos durante al menos 2 segundos y cambia de uno a otro para registrar tu opinión.')+
  '</p></div>';
}
function personalSoundSaveReview(choice){
 if(!current||!['better','same','worse'].includes(choice))return false;
 const id=current.id;
 if(personalSoundPreview.profile!==id||!personalSoundPreview.heardWith||!personalSoundPreview.heardWithout)return false;
 const status=personalSoundStatus(current);
 current.personalSoundReview={version:PERSONAL_SOUND_VERSION,choice,signature:status.signature,at:Date.now()};
 touch();render();
 return true;
}
