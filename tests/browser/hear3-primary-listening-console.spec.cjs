const {test,expect}=require('@playwright/test');

async function virtualAudio(page){
 await page.addInitScript(()=>{
  window.__consoleStarts=0;
  class Param{
   setValueAtTime(){} linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){} cancelScheduledValues(){}
  }
  class FakeAudioContext{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){} removeEventListener(){}
   createOscillator(){
    const osc={frequency:new Param(),type:'sine',onended:null,
     connect(){},disconnect(){},
     start(){window.__consoleStarts++;},
     stop(at){if(at>15)setTimeout(()=>osc.onended?.(),60);}};
    return osc;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=FakeAudioContext;
  window.webkitAudioContext=FakeAudioContext;
 });
}
test('one listening console completes actual sweep and tones without changing the tested engine',async({page})=>{
 test.setTimeout(120000);
 await virtualAudio(page);
 await page.goto('/hear3-exam/');
 await expect(page.getByTestId('hear-listening-console')).toBeVisible();
 await expect(page.getByTestId('hear-console-action')).toContainText('Iniciar exploración');
 await expect(page.getByTestId('hear-console-heard')).toBeHidden();
 expect(await page.evaluate(()=>window.__consoleStarts)).toBe(0);

 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await expect(page.getByTestId('hear-console-action')).toContainText('Continuar con los tonos');
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
 await expect(page.getByTestId('hear-console-action')).toContainText('Reproducir el siguiente tono');

 for(let i=0;i<20;i++){
  await expect(page.getByTestId('hear-console-action')).toContainText('Reproducir el siguiente tono');
  await page.getByTestId('hear-console-action').click();
  await expect(page.getByTestId('hear-console-not')).toBeVisible();
  await expect(page.getByTestId('hear-console-not')).toBeEnabled();
  await page.getByTestId('hear-console-not').click();
 }
 await expect(page.getByTestId('tone-finish')).toBeEnabled();
 await expect(page.getByTestId('hear-console-action')).toContainText('Terminar y ver mi EQ');
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('eq-immediate-chart').locator('.app-eq-band')).toHaveCount(5);
 await expect(page.getByTestId('hear-console-action')).toContainText('Ver mi ecualizador');
 await expect(page.locator('[data-journey-stage="result"]')).toHaveAttribute('aria-current','step');
 expect(await page.evaluate(()=>window.__consoleStarts)).toBeGreaterThan(0);
 await page.getByTestId('hear-console-action').click();
 await expect(page.locator('#eq-heading')).toBeFocused();
});
test('mirrored action never creates tones or writes a profile without user initiation',async({page})=>{
 await virtualAudio(page);
 await page.goto('/hear3-exam/');
 expect(await page.evaluate(()=>window.__consoleStarts)).toBe(0);
 const records=await page.evaluate(()=>localStorage.getItem('hear3:catalog:v1:0'));
 await page.getByTestId('hear-console-heard').evaluate(el=>el.click());
 await page.getByTestId('hear-console-not').evaluate(el=>el.click());
 expect(await page.evaluate(()=>window.__consoleStarts)).toBe(0);
 await expect(page.getByTestId('hear-console-stop')).toBeHidden();
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 expect(await page.evaluate(()=>localStorage.getItem('hear3:catalog:v1:0'))).toBe(records);
});

test('paused exam shows verified low-volume route in same console before resume',async({page})=>{
 await virtualAudio(page);
 await page.goto('/hear3-exam/');
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('hear-console-action').click();
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('hear-console-heard')).toBeEnabled();
 await expect(page.getByTestId('hear-console-stop')).toBeVisible();
 await page.getByTestId('hear-console-stop').click();
 await expect(page.getByTestId('tone-resume')).toBeEnabled();
 await expect(page.getByTestId('hear-console-route')).toBeVisible();
 await expect(page.getByTestId('hear-console-route')).not.toBeChecked();
 await expect(page.getByTestId('hear-console-action')).toContainText('Reanudar mi examen');
 await expect(page.getByTestId('hear-console-action')).toBeDisabled();
 const starts=await page.evaluate(()=>window.__consoleStarts);
 await page.getByTestId('hear-console-route').check();
 await expect(page.getByTestId('route-verified')).toBeChecked();
 await expect(page.getByTestId('hear-console-action')).toBeEnabled();
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
 await expect(page.getByTestId('hear-console-route')).toBeHidden();
 // Only clicking "play next tone" may start audio after explicit recovery.
 expect(await page.evaluate(()=>window.__consoleStarts)).toBe(starts);
});
test('the route checkbox mirrors an original verified user selection without auto-play',async({page})=>{
 await virtualAudio(page);
 await page.goto('/hear3-exam/');
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('hear-console-action').click();
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('tone-stop')).toBeEnabled();
 await page.getByTestId('tone-stop').click();
 await expect(page.getByTestId('hear-console-route')).toBeVisible();
 await page.getByTestId('route-verified').check();
 await expect(page.getByTestId('hear-console-route')).toBeChecked();
 await expect(page.getByTestId('hear-console-action')).toBeEnabled();
});
