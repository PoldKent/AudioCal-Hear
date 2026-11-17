const {test,expect}=require('@playwright/test');

async function fakeAudio(page){
 await page.addInitScript(()=>{
  class Param{
   setValueAtTime(){} linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){} cancelScheduledValues(){}
  }
  class FakeAudioContext{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){} removeEventListener(){}
   createOscillator(){
    const osc={type:'sine',frequency:new Param(),onended:null,
     connect(){},disconnect(){},start(){},
     stop(at){if(at>15)setTimeout(()=>osc.onended?.(),60);}};
    return osc;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=FakeAudioContext;window.webkitAudioContext=FakeAudioContext;
 });
}
test('nominal 31-band EQ layout uses the same confirmed adaptive exam without assuming device detection',async({page})=>{
 test.setTimeout(60000);
 await fakeAudio(page);
 await page.goto('/hear3-exam/');
 await page.getByTestId('layout-choice').selectOption('31');
 await expect(page.getByTestId('sweep-start')).toBeDisabled();
 await page.getByTestId('layout-apply').click();
 await expect(page.getByTestId('layout-status')).toContainText('31 bandas entre 20 y 20000 Hz');
 await expect(page.getByTestId('sweep-description')).toContainText('20–20000 Hz');
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 await expect.poll(()=>page.evaluate(()=>window.hear3IntegratedPilot.snapshot()?.totalBands)).toBe(31);
 await expect(page.getByTestId('layout-choice')).toBeDisabled();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
});
test('a custom user-declared 3-band EQ can be configured, but never auto-plays',async({page})=>{
 await fakeAudio(page);
 await page.goto('/hear3-exam/');
 await page.getByTestId('layout-choice').selectOption('custom');
 await expect(page.getByTestId('layout-custom')).toBeEnabled();
 await page.getByTestId('layout-custom').fill('100, 350, 2000');
 await expect(page.getByTestId('sweep-start')).toBeDisabled();
 await page.getByTestId('layout-apply').click();
 await expect(page.getByTestId('layout-status')).toContainText('3 bandas entre 100 y 2000 Hz');
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).toBeNull();
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 await expect.poll(()=>page.evaluate(()=>window.hear3IntegratedPilot.snapshot()?.totalBands)).toBe(3);
});
test('unsafe custom frequencies are rejected without mutating the default preset',async({page})=>{
 await page.goto('/hear3-exam/');
 await page.getByTestId('layout-choice').selectOption('custom');
 for(const bad of ['200, 100','100, 100','10, 400','100, 25000']){
  await page.getByTestId('layout-custom').fill(bad);
  await page.getByTestId('layout-apply').click();
  await expect(page.getByTestId('error')).not.toBeEmpty();
  await expect(page.getByTestId('layout-status')).toContainText('Cambios sin confirmar');
  await expect(page.getByTestId('sweep-start')).toBeDisabled();
  await expect(page.getByTestId('sweep-description')).toContainText('125–2.000 Hz');
 }
 await page.getByTestId('layout-choice').selectOption('5');
 await page.getByTestId('layout-apply').click();
 await expect(page.getByTestId('error')).toBeEmpty();
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
});
