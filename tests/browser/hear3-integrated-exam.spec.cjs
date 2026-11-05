const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';

// Virtual Web Audio is used for deterministic browser-state regression ONLY.
// It never produces acoustic output; no physical-device behavior is inferred.
async function mockAudio(page) {
 await page.addInitScript(()=>{
  window.__fakeAudioOscStarts=0;
  class Param {
   setValueAtTime(){}
   linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){}
   cancelScheduledValues(){}
  }
  class FakeAudioContext {
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){}
   removeEventListener(){}
   async resume(){this.state='running';}
   createOscillator(){
    const oscillator={
     frequency:new Param(),type:'sine',onended:null,
     connect(){},disconnect(){},
     start(){window.__fakeAudioOscStarts++;},
     stop(at){
      if(at>15)setTimeout(()=>oscillator.onended?.(),75);
     },
    };
    return oscillator;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async close(){this.state='closed';}
  }
  window.AudioContext=FakeAudioContext;
  window.webkitAudioContext=FakeAudioContext;
 });
}
test('P0 integrated pilot initially cannot start audio or bypass completed sweep',async({page})=>{
 await page.goto(PILOT);
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
 await expect(page.getByTestId('plan')).toBeDisabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 await expect(page.getByTestId('tone-heard')).toBeDisabled();
 await expect(page.getByTestId('tone-status')).toContainText('Esperando barrido');
 await expect(page.getByText('Los niveles dBFS no miden presión sonora')).toBeVisible();
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).toBeNull();
});

test('P0 virtual sweep completion enables only authorized verified discrete tones',async({page})=>{
 await mockAudio(page);
 await page.goto(PILOT);
 expect(await page.evaluate(()=>window.__fakeAudioOscStarts)).toBe(0);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 expect(await page.evaluate(()=>window.__fakeAudioOscStarts)).toBe(1);
 await page.getByTestId('plan').click();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
 await expect(page.getByTestId('frequency')).toContainText('125 Hz');
 await expect(page.getByTestId('dbfs')).toContainText('-60 dBFS');
 expect(await page.evaluate(()=>window.__fakeAudioOscStarts)).toBe(1);
 await page.getByTestId('tone-next').click();
 await expect(page.getByTestId('tone-heard')).toBeEnabled();
 await page.getByTestId('tone-heard').click();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
 await expect(page.getByTestId('dbfs')).toContainText('-66 dBFS');
 const snapshot=await page.evaluate(()=>window.hear3IntegratedPilot.snapshot());
 expect(snapshot.bands[0].observations).toHaveLength(1);
 expect(snapshot.bands[0].observations[0].provenance).toBe('user-response');
 expect(snapshot.thresholdsEstimated).toBe(0);
 expect(snapshot.eqGainsCalculated).toBe(0);
 expect(await page.evaluate(()=>window.__fakeAudioOscStarts)).toBe(2);
});

test('P0 interrupted sweep never advances to discrete exam',async({page})=>{
 await page.addInitScript(()=>{
  window.__fakeAudioOscStarts=0;
  class Param{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}cancelScheduledValues(){}}
  class FakeAudioContext{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){}
   removeEventListener(){}
   createOscillator(){return {frequency:new Param(),connect(){},disconnect(){},start(){window.__fakeAudioOscStarts++;},stop(){},onended:null};}
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
  }
  window.AudioContext=FakeAudioContext;
 });
 await page.goto(PILOT);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('sweep-stop')).toBeEnabled();
 await page.getByTestId('sweep-stop').click();
 await expect(page.getByTestId('sweep-status')).toContainText('Barrido interrumpido');
 await expect(page.getByTestId('plan')).toBeDisabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
});

test('pilot inspection and navigation do not clear old Hear 2.0 profiles',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','UNCHANGED_LEGACY'));
 await page.goto(PILOT);
 await expect(page.getByTestId('plan')).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('UNCHANGED_LEGACY');
 await page.goto('/hear3-preview/');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('UNCHANGED_LEGACY');
});
