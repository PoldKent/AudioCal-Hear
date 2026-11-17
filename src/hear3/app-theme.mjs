/**
 * Keep the user's appearance choice consistent while navigating the single
 * AudioCal Hear application. Preference never touches stored hearing records.
 */
const KEY='hear3:ui-theme:v1';
const allowed=new Set(['system','light','dark']);
const media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
function selected(){
 try{const saved=localStorage.getItem(KEY);return allowed.has(saved)?saved:'system';}
 catch{return 'system';}
}
function update(){
 const choice=selected();
 document.documentElement.dataset.hear3Theme=
  choice==='system'?(media?.matches?'dark':'light'):choice;
}
update();
if(media?.addEventListener)media.addEventListener('change',update);
else if(media?.addListener)media.addListener(update);
addEventListener('storage',event=>{if(event.key===KEY)update();});
