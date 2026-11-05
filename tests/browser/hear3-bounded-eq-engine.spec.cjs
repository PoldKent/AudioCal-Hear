const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';
async function virtualAudio(page){
 await page.addInitScript(()=>{
  window.__eqAudioStarts=0;
  class Param {
   setValueAtTime(){}
   linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){}
   cancelScheduledValues(){}
  }
  class AudioCtx{
   constructor(){this.state='running';this.currentTime=0;this.sampleRate=48000;this.destination={};}
   createOscillator(){
    return {
     frequency:new Param(),type:'sine',onended:null,
     connect(){},disconnect(){},
     start(){window.__eqAudioStarts++;},
     stop(at){if(at>=15)setTimeout(()=>this.onended?.(),35);},
    };
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   addEventListener(){}removeEventListener(){}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=AudioCtx;window.webkitAudioContext=AudioCtx;
 });
}
test('D-039/041 UI keeps EQ disabled until explicit finish, then provides one neutral review-only result',async({page})=>{
 test.setTimeout(100000);
 await virtualAudio(page);
 await page.goto(PILOT);
 await expect(page.getByTestId('eq-export')).toBeDisabled();
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.eqDraft())).toBeNull();
 expect(await page.evaluate(()=>window.__eqAudioStarts)).toBe(0);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 for(let band=0;band<5;band++){
  for(let trial=0;trial<4;trial++){
   await expect(page.getByTestId('tone-next')).toBeEnabled();
   await page.getByTestId('tone-next').click();
   await expect(page.getByTestId('tone-not')).toBeEnabled();
   await page.getByTestId('tone-not').click();
  }
 }
 await expect(page.getByTestId('tone-finish')).toBeEnabled();
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.eqDraft())).toBeNull();
 await page.getByTestId('tone-finish').click();
 await expect(page.getByTestId('eq-export')).toBeEnabled();
 await expect(page.getByTestId('eq-status')).toContainText('Evidencia insuficiente');
 await expect(page.getByTestId('eq-rows').locator('li')).toHaveCount(5);
 await expect(page.getByTestId('eq-headroom')).toContainText('Referencia DSP NO calibrada');
 await expect(page.getByTestId('eq-headroom')).toContainText('Atenuación sugerida SOLO para el modelo digital: 0 dB');
 await expect(page.getByTestId('eq-headroom')).toContainText('NO certifica picos entre muestras');
 const model=await page.evaluate(()=>window.hear3IntegratedPilot.eqDigitalModel());
 expect(model.suggestedReferencePreampDb).toBe(0);
 expect(model.physicalClippingVerified).toBe(false);
 expect(model.autoApplyAllowed).toBe(false);
 expect(model.finiteHorizonSampleBoundEstablished).toBe(true);
 const eq=await page.evaluate(()=>window.hear3IntegratedPilot.eqDraft());
 expect(eq.rows.map(x=>x.gainDb)).toEqual([0,0,0,0,0]);
 expect(eq.validatedForProduction).toBe(false);
 expect(eq.autoApplyAllowed).toBe(false);
 const download=page.waitForEvent('download');
 await page.getByTestId('eq-export').click();
 const file=await download;
 expect(file.suggestedFilename()).toBe('hear3-eq-matematico-no-validado.json');
 expect(await page.evaluate(()=>window.__eqAudioStarts)).toBe(21);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBeNull();
});
test('D-040 browser policy returns bounded observable correction for synthetic valid brackets',async({page})=>{
 await page.goto(PILOT);
 const eq=await page.evaluate(async()=>{
  const {calculateHear3BoundedJointEq}=await import('/src/hear3/bounded-eq-engine.mjs');
  const levels=[-63,-63,-63,-51,-63],hz=[125,250,500,1000,2000];
  const bands=hz.map((frequencyHz,i)=>{
   const mid=levels[i];
   return {id:'b'+i,frequencyHz,status:'bounded-subjective-interval',
    confidence:'medium',
    intervalDbfs:{notHeardAtDbfs:mid-3,heardAtDbfs:mid+3},
    observations:Array.from({length:4},(_,k)=>{
     const heard=k%2===0;
     return {toneId:'t'+i+'x'+k,frequencyHz,channel:'joint',
      digitalLevelDbfs:mid+(heard?3:-3),
      response:heard?'heard':'not-heard',provenance:'user-response'};
    }),
   };
  });
  return calculateHear3BoundedJointEq({
   examSnapshot:{status:'completed',profileId:'synthetic',channel:'joint',
    bands,completedBands:5,totalBands:5,activeToneId:null,
    thresholdsEstimated:0,eqGainsCalculated:0,
    authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42}},
   sessionSnapshot:{status:'completed',profileId:'synthetic',currentTone:null,
    observations:bands.flatMap(b=>b.observations),
    authorizedDigitalRangeDbfs:{minDbfs:-80,maxDbfs:-42}},
   deviceCategory:'headphones',
  });
 });
 expect(eq.rows[3].gainDb).toBeGreaterThan(0);
 expect(eq.rows.every(x=>Math.abs(x.gainDb)<=3)).toBe(true);
 expect(eq.rows.every(x=>Number.isInteger(x.gainDb*2))).toBe(true);
 expect(eq.modelStatus).toContain('not-acoustically-validated');
 expect(eq.autoApplyAllowed).toBe(false);
 expect(eq.preamplificationDb).toBe(null);
});
test('D-041 no completed exam, no arbitrary EQ, no browser-side personal data writes',async({page})=>{
 await page.goto(PILOT);
 await expect(page.getByTestId('eq-export')).toBeDisabled();
 await expect(page.getByTestId('eq-status')).toContainText('Finaliza el examen');
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.eqDraft())).toBeNull();
 const output=await page.evaluate(()=>({
  local:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)),
  session:Array.from({length:sessionStorage.length},(_,i)=>sessionStorage.key(i)),
 }));
 expect(output.local.filter(x=>x.startsWith('hear3:catalog:'))).toHaveLength(0);
 expect(output.session.filter(x=>x.startsWith('hear3:catalog:'))).toHaveLength(0);
});
