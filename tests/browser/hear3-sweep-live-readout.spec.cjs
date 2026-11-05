const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';
async function injectClockedWebAudio(page){
 await page.addInitScript(()=>{
  window.__virtualAudioTime=0;
  window.__oscillatorStarts=0;
  class P{
   setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}
   cancelScheduledValues(){}
  }
  class Ctx{
   constructor(){
    this.sampleRate=48000;this.state='running';this.destination={};
   }
   get currentTime(){return window.__virtualAudioTime;}
   addEventListener(){}
   removeEventListener(){}
   createOscillator(){
    return {
     frequency:new P(),onended:null,
     connect(){},disconnect(){},
     start(){window.__oscillatorStarts++;},
     stop(){},
    };
   }
   createGain(){return {gain:new P(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=Ctx;
  window.webkitAudioContext=Ctx;
 });
}
test('D-021 sweep always displays programmed frequency/level and a time guide without pretending SPL',async({page})=>{
 await injectClockedWebAudio(page);
 await page.goto(PILOT);
 await expect(page.getByTestId('sweep-frequency')).toHaveText('—');
 await expect(page.getByTestId('sweep-level')).toHaveText('—');
 await expect(page.getByTestId('sweep-remaining')).toHaveText('—');
 expect(await page.evaluate(()=>window.__oscillatorStarts)).toBe(0);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('sweep-frequency')).toHaveText('125 Hz');
 await expect(page.getByTestId('sweep-level')).toHaveText('-60 dBFS');
 await expect(page.getByTestId('sweep-remaining')).toHaveText('20 s');
 await page.evaluate(()=>window.__virtualAudioTime=10.02);
 await expect(page.getByTestId('sweep-frequency')).toHaveText('500 Hz');
 await expect(page.getByTestId('sweep-remaining')).toHaveText('10 s');
 const timer=await page.locator('#sweep-progress').evaluate(el=>el.value);
 expect(timer).toBeGreaterThanOrEqual(9.9);
 expect(timer).toBeLessThanOrEqual(10.1);
 expect(await page.evaluate(()=>window.__oscillatorStarts)).toBe(1);
 await page.getByTestId('sweep-stop').click();
 await expect(page.getByTestId('sweep-frequency')).toHaveText('—');
 await expect(page.getByTestId('sweep-level')).toHaveText('—');
 await expect(page.getByTestId('sweep-remaining')).toHaveText('—');
 await expect(page.getByTestId('plan')).toBeDisabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
});
test('D-058 sweep visual frequency and digital level remain textual under reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await injectClockedWebAudio(page);
 await page.goto(PILOT);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('sweep-frequency')).toHaveText('125 Hz');
 await expect(page.getByTestId('sweep-level')).toHaveText('-60 dBFS');
 await expect(page.getByTestId('sweep-remaining')).toHaveText('20 s');
 await expect(page.getByTestId('sweep-status')).toContainText('Barrido en reproducción');
 const cue=await page.getByTestId('sweep-frequency').getAttribute('aria-live');
 expect(cue).toBe('off'); // no repeated screen-reader announcements at 120ms
 await page.getByTestId('sweep-stop').click();
});
