const {test,expect}=require('@playwright/test');

async function mockAudio(page){
 await page.addInitScript(()=>{
  window.__uxToneStarts=0;
  class Param{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}cancelScheduledValues(){}}
  class Audio{
   constructor(){this.state='running';this.currentTime=0;this.sampleRate=48000;this.destination={};}
   addEventListener(){}removeEventListener(){}
   createOscillator(){
    const osc={frequency:new Param(),type:'sine',onended:null,
     connect(){},disconnect(){},start(){window.__uxToneStarts++;},
     stop(at){if(at>15)setTimeout(()=>osc.onended?.(),60);}};
    return osc;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}async close(){this.state='closed';}
  }
  window.AudioContext=Audio;window.webkitAudioContext=Audio;
 });
}

test('Home prioritizes one safe action while secondary functions remain on demand',async({page})=>{
 await page.goto('/');
 await expect(page.getByTestId('focus-begin')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Encuentra tu sonido.'})).toBeVisible();
 await expect(page.locator('#ajustes')).not.toHaveAttribute('open');
 await expect(page.getByTestId('focus-ready')).toBeHidden();
 await expect(page.locator('nav,.app-grid,#profile-count,#eq-count')).toHaveCount(0);
 await page.locator('#ajustes > summary').click();
 await expect(page.getByRole('link',{name:'Resultados guardados'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Privacidad'})).toBeVisible();
 await page.getByTestId('focus-begin').click();
 await expect(page.getByTestId('focus-ready')).toBeVisible();
 await expect(page.getByTestId('focus-tones')).toBeHidden();
});

test('first test action is never silent and leads into real audio only after volume confirmation',async({page})=>{
 await mockAudio(page);
 await page.goto('/hear3-exam/');
 await expect(page.getByTestId('hear-advanced-tools')).not.toHaveAttribute('open');
 await expect(page.getByTestId('hear-secondary-extras')).not.toHaveAttribute('open');
 await expect(page.locator('#eq-panel')).toBeHidden();
 await expect(page.getByTestId('hear-console-setup')).toBeVisible();
 await expect(page.getByTestId('hear-console-action')).toContainText('Comenzar mi prueba');
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('hear-console-setup-feedback')).toContainText('confirma');
 expect(await page.evaluate(()=>window.__uxToneStarts)).toBe(0);
 await page.getByTestId('hear-console-device').selectOption('headphones');
 await page.getByTestId('hear-console-safety').check();
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await expect(page.getByTestId('hear-console-action')).toContainText('Continuar con los tonos');
 await expect(page.getByTestId('hear-console-setup')).toBeHidden();
 expect(await page.evaluate(()=>window.__uxToneStarts)).toBe(1);
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('hear-console-action')).toContainText('Reproducir el siguiente tono');
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('hear-console-not')).toBeVisible();
 await page.getByTestId('hear-console-not').click();
 await expect(page.getByTestId('hear-console-action')).toContainText('Reproducir el siguiente tono');
});

test('saved exam is offered as continuation, not an impossible new-start button',async({page})=>{
 await mockAudio(page);
 await page.goto('/hear3-exam/');
 await page.getByTestId('hear-console-safety').check();
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('hear-console-action').click();
 await page.getByTestId('hear-console-action').click();
 await page.getByTestId('hear-console-not').click();
 await page.reload();
 await expect(page.getByTestId('hear-console-action')).toContainText('Continuar mi examen');
 await expect(page.getByTestId('sweep-start')).toBeDisabled();
 await expect(page.getByTestId('hear-console-setup')).toBeHidden();
 const started=await page.evaluate(()=>window.__uxToneStarts);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('hear-console-action').click();
 await expect(page.getByTestId('hear-console-action')).toContainText('Reanudar mi examen');
 expect(await page.evaluate(()=>window.__uxToneStarts)).toBe(started);
});
