const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';

async function mockAudio(page){
 await page.addInitScript(()=>{
  window.__pilotOscillatorStarts=0;
  class Param {
   setValueAtTime(){}
   linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){}
   cancelScheduledValues(){}
  }
  class FakeAudioContext{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){}
   removeEventListener(){}
   createOscillator(){
    const oscillator={
     frequency:new Param(),type:'sine',onended:null,
     connect(){},disconnect(){},
     start(){window.__pilotOscillatorStarts++;},
     stop(at){if(at>15)setTimeout(()=>oscillator.onended?.(),70);},
    };
    return oscillator;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=FakeAudioContext;
  window.webkitAudioContext=FakeAudioContext;
 });
}
async function completedAndAnswered(page){
 await page.goto(PILOT);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 await page.getByTestId('tone-next').click();
 await expect(page.getByTestId('tone-heard')).toBeEnabled();
 await page.getByTestId('tone-heard').click();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
 await expect(page.getByTestId('recovery-status')).toContainText('Copia local disponible');
}

test('P0 saved adaptive evidence recovers only on explicit click and never starts sound',async({page})=>{
 await mockAudio(page);
 await completedAndAnswered(page);
 expect(await page.evaluate(()=>window.__pilotOscillatorStarts)).toBe(2);
 const before=await page.evaluate(()=>window.hear3IntegratedPilot.snapshot());
 expect(before.bands[0].observations).toHaveLength(1);
 await page.reload();
 expect(await page.evaluate(()=>window.__pilotOscillatorStarts)).toBe(0);
 await expect(page.getByTestId('recover-exam')).toBeEnabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 await expect(page.getByTestId('tone-heard')).toBeDisabled();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('recover-exam').click();
 await expect(page.getByTestId('tone-status')).toContainText('Pausado');
 expect(await page.evaluate(()=>window.__pilotOscillatorStarts)).toBe(0);
 const recovered=await page.evaluate(()=>window.hear3IntegratedPilot.snapshot());
 expect(recovered.bands[0].observations).toHaveLength(1);
 expect(recovered.nextDigitalLevelDbfs).toBe(null);
 await page.getByTestId('tone-resume').click();
 await expect(page.getByTestId('error')).toContainText('Comprueba la salida');
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 await page.getByTestId('route-verified').check();
 await page.getByTestId('tone-resume').click();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
 await expect(page.getByTestId('dbfs')).toContainText('-66 dBFS');
 expect(await page.evaluate(()=>window.__pilotOscillatorStarts)).toBe(0);
 await page.getByTestId('tone-next').click();
 await expect(page.getByTestId('tone-heard')).toBeEnabled();
 expect(await page.evaluate(()=>window.__pilotOscillatorStarts)).toBe(1);
});

test('P0 JSON backup contains verified adaptive state, not a clinical EQ',async({page})=>{
 await mockAudio(page);
 await completedAndAnswered(page);
 const downloaded=page.waitForEvent('download');
 await page.getByTestId('export-exam').click();
 const file=await downloaded;
 const data=JSON.parse(fs.readFileSync(await file.path(),'utf8'));
 expect(data.format).toBe('hear3-adaptive-exam-bundle-v1');
 expect(data.checkpoint.progress.bands[0].observations).toHaveLength(1);
 expect(data.checkpoint.audioSession.observations).toHaveLength(1);
 expect(data.checkpoint.progress.eqGainsCalculated).toBe(0);
 expect(data.checkpoint.progress.thresholdsEstimated).toBe(0);
 expect(data.integrity.algorithm).toBe('fnv1a32');
});

test('P0 confirmed deletion does not re-save on render and preserves existing V2 data',async({page})=>{
 await mockAudio(page);
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','DONT_ERASE_V2'));
 await completedAndAnswered(page);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('delete-exam').click();
 await expect(page.getByTestId('delete-exam')).toBeDisabled();
 await page.waitForTimeout(300);
 await page.reload();
 await expect(page.getByTestId('recover-exam')).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('DONT_ERASE_V2');
 expect(await page.evaluate(()=>window.__pilotOscillatorStarts)).toBe(0);
});

test('P0 denied recovery leaves fresh exam inert and shows safe warning',async({page})=>{
 await mockAudio(page);
 await completedAndAnswered(page);
 await page.reload();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByTestId('recover-exam').click();
 await expect(page.getByTestId('recover-exam')).toBeEnabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 expect(await page.evaluate(()=>window.__pilotOscillatorStarts)).toBe(0);
});
