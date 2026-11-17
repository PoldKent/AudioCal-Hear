/**
 * Lightweight visual indication of digitally programmed frequency.
 * NOT a microphone waveform, acoustic spectrum, SPL or proof of audibility.
 * No audio APIs and no timers; responds to existing accessible text updates.
 */
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function buildHear3DigitalToneWavePath(frequencyHz,{width=480,height=84}={}){
 if(!finite(width)||width<=0||width>4096||!finite(height)||height<=0||height>4096)
  throw Error('Invalid display dimensions');
 const frequency=Number(frequencyHz);
 if(!finite(frequency)||frequency<20||frequency>20000)return '';
 // Log-scale illustrative cycles so low and high tones remain legible.
 const cycles=Math.max(2,Math.min(16,2+Math.log2(frequency/20)*1.05));
 const mid=height/2,amp=height*.32;
 const steps=192;
 const points=[];
 for(let i=0;i<=steps;i++){
  const x=i*width/steps;
  const y=mid-Math.sin(2*Math.PI*cycles*i/steps)*amp;
  points.push((i===0?'M':'L')+x.toFixed(2)+' '+y.toFixed(2));
 }
 return points.join(' ');
}
export function attachHear3DigitalToneVisualizer({
 sweepFrequency,sweepStatus,toneFrequency,toneStatus,sweepPath,tonePath,
}={}){
 if(!sweepFrequency||!sweepStatus||!toneFrequency||!toneStatus||!sweepPath||!tonePath)
  throw Error('Missing visualizer source or target');
 const status=()=>(sweepStatus.textContent||'').toLowerCase();
 const toneState=()=>(toneStatus.textContent||'').toLowerCase();
 function update(){
  const sweeping=status().includes('reproducción');
  const testing=toneState().includes('reproducción');
  const sweepHz=Number.parseFloat(sweepFrequency.textContent);
  const toneHz=Number.parseFloat(toneFrequency.textContent);
  sweepPath.setAttribute('d',buildHear3DigitalToneWavePath(sweepHz));
  tonePath.setAttribute('d',buildHear3DigitalToneWavePath(toneHz));
  sweepPath.parentElement?.classList.toggle('hear-wave-active',sweeping);
  tonePath.parentElement?.classList.toggle('hear-wave-active',testing);
 }
 const observer=new MutationObserver(update);
 for(const node of [sweepFrequency,sweepStatus,toneFrequency,toneStatus])
  observer.observe(node,{characterData:true,childList:true,subtree:true});
 update();
 return Object.freeze({update,dispose:()=>observer.disconnect()});
}
