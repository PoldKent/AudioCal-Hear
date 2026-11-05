const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';

async function spyStorage(page){
 await page.addInitScript(()=>{
  window.__progressReads=0;
  const original=Storage.prototype.getItem;
  Storage.prototype.getItem=function(key,...rest){
   if(typeof key==='string'&&key.startsWith('hear3:adaptive-progress:'))
    window.__progressReads++;
   return original.call(this,key,...rest);
  };
 });
}
async function mockAudio(page){
 await page.addInitScript(()=>{
  class Param{
   setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}
   cancelScheduledValues(){}
  }
  class Context{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){}removeEventListener(){}
   createOscillator(){
    const osc={
     frequency:new Param(),onended:null,connect(){},disconnect(){},
     start(){},stop(at){if(at>=15)setTimeout(()=>osc.onended?.(),50);},
    };
    return osc;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=Context;window.webkitAudioContext=Context;
 });
}
test('D-062 rapid UI rendering does not repeatedly re-read checkpoint journal',async({page})=>{
 await spyStorage(page);
 await page.goto(PILOT);
 await page.waitForTimeout(1080); // roughly 9 x 120ms render ticks
 const reads=await page.evaluate(()=>window.__progressReads);
 expect(reads).toBeGreaterThan(0);
 expect(reads).toBeLessThanOrEqual(12); // <= ~3 journal inventories, not ~9
 await expect(page.getByTestId('sweep-status')).toContainText('Listo para comenzar');
 await expect(page.getByTestId('recovery-status')).toContainText('Todavía no existe un checkpoint');
});
test('D-062 deliberate playback action immediately refreshes checkpoint export state',async({page})=>{
 await spyStorage(page);
 await mockAudio(page);
 await page.goto(PILOT);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
 await expect(page.getByTestId('export-exam')).toBeDisabled();
 await page.getByTestId('tone-next').click();
 await expect(page.getByTestId('export-exam')).toBeEnabled();
 await expect(page.getByTestId('recovery-status')).toContainText('Copia local disponible');
 const snap=await page.evaluate(()=>window.hear3IntegratedPilot.snapshot());
 expect(snap.thresholdsEstimated).toBe(0);
 expect(snap.eqGainsCalculated).toBe(0);
});
