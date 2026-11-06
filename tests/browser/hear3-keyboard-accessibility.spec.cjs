const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';
async function fakeAudio(page){
 await page.addInitScript(()=>{
  window.__accessibilityStarts=0;
  class Param{
   setValueAtTime(){}linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){}cancelScheduledValues(){}
  }
  class AudioCtx{
   constructor(){this.state='running';this.currentTime=0;
    this.sampleRate=48000;this.destination={};}
   createOscillator(){
    const osc={frequency:new Param(),onended:null,
     connect(){},disconnect(){},
     start(){window.__accessibilityStarts++;},
     stop(at){if(at>=15)setTimeout(()=>osc.onended?.(),45);}
    };
    return osc;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   addEventListener(){}removeEventListener(){}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=AudioCtx;window.webkitAudioContext=AudioCtx;
 });
}
test('D-058 keyboard skip link goes to main content; all essential status live regions are labeled',async({page})=>{
 await page.goto(PILOT);
 await page.keyboard.press('Tab');
 await expect(page.getByTestId('skip-link')).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#main-content')).toBeFocused();
 await expect(page.getByTestId('tone-status')).toHaveAttribute('aria-live','polite');
 await expect(page.getByTestId('keyboard-stop-status')).toHaveAttribute('aria-live','polite');
 await expect(page.getByTestId('error')).toHaveAttribute('role','alert');
 await expect(page.getByTestId('sweep-frequency')).toHaveAttribute('aria-live','off');
 await expect(page.getByTestId('sweep-level')).toHaveAttribute('aria-live','off');
 await expect(page.getByTestId('skip-link')).toHaveAttribute('href','#main-content');
});
test('D-058 Escape stops an active sweep without producing a heard/not-heard observation',async({page})=>{
 await fakeAudio(page);await page.goto(PILOT);
 await page.getByTestId('sweep-start').focus();
 await page.keyboard.press('Enter');
 await expect(page.getByTestId('sweep-status')).toContainText('Barrido en reproducción');
 await page.keyboard.press('Escape');
 await expect(page.getByTestId('keyboard-stop-status')).toContainText('detenido con Escape');
 await expect(page.getByTestId('sweep-status')).toContainText('interrumpido');
 await expect(page.getByTestId('sweep-heard')).toBeDisabled();
 await expect(page.getByTestId('sweep-not')).toBeDisabled();
 expect((await page.evaluate(()=>window.hear3IntegratedPilot.sweepResult()))?.reports?.length??0)
  .toBe(0);
 await page.keyboard.press('Escape');
 await expect(page.getByTestId('plan')).toBeDisabled();
});
test('D-058 Escape stops an individual tone and keeps it inconclusive, never autoplays',async({page})=>{
 await fakeAudio(page);await page.goto(PILOT);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 await page.getByTestId('tone-next').click();
 await expect(page.getByTestId('tone-status')).toContainText('Tono en reproducción');
 await page.keyboard.press('Escape');
 await expect(page.getByTestId('keyboard-stop-status')).toContainText('detenido con Escape');
 await expect(page.getByTestId('tone-status')).toContainText('Pausado');
 const state=await page.evaluate(()=>window.hear3IntegratedPilot.snapshot());
 expect(state.bands.flatMap(b=>b.observations)).toHaveLength(0);
 await expect(page.getByTestId('tone-heard')).toBeDisabled();
 await expect(page.getByTestId('tone-not')).toBeDisabled();
 await page.keyboard.press('Escape');
 await expect(page.getByTestId('tone-resume')).toBeEnabled();
});
test('D-058 stable status is not reannounced every 120-ms visual tick',async({page})=>{
 await page.goto(PILOT);
 await expect(page.getByTestId('sweep-status')).toHaveText('Listo para comenzar');
 const changes=await page.evaluate(async()=>{
  let count=0;
  const node=document.querySelector('#sweep-status');
  const observer=new MutationObserver(()=>count++);
  observer.observe(node,{childList:true,characterData:true,subtree:true});
  await new Promise(resolve=>setTimeout(resolve,540));
  observer.disconnect();
  return count;
 });
 expect(changes).toBe(0);
});
