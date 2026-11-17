const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

async function virtualAudio(page){
 await page.addInitScript(()=>{
  window.__hear3VirtualStarts=0;
  class Param {
   setValueAtTime(){} linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){} cancelScheduledValues(){}
  }
  class FakeAudioContext{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){} removeEventListener(){}
   createOscillator(){
    const osc={frequency:new Param(),type:'sine',onended:null,connect(){},disconnect(){},
     start(){window.__hear3VirtualStarts++;},
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

test('official beta is a navigable exam -> history -> editor journey, without autoplay or hidden V2 migration',async({page})=>{
 await page.goto('/hear2/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','V2_UNALTERED'));
 await page.goto('/');
 await page.getByRole('link',{name:'Comenzar examen'}).click();
 await expect(page).toHaveURL(/\/hear3-exam\/$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('Examen de tonos');
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 await expect(page.getByTestId('archive-commit')).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('V2_UNALTERED');
 await page.getByRole('link',{name:'Historial',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-library\/$/);
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
 await expect(page.getByTestId('delete-commit')).toBeDisabled();
 await page.getByRole('link',{name:'Mi ecualizador',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-eq-editor\/$/);
 await expect(page.getByTestId('review')).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('V2_UNALTERED');
});

test('public exam can complete, save opt-in provisional EQ, reopen history and edit workspace',async({page})=>{
 test.setTimeout(120000);
 await virtualAudio(page);
 await page.goto('/hear3-exam/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','PRESERVE_V2'));
 expect(await page.evaluate(()=>window.__hear3VirtualStarts)).toBe(0);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 for(let i=0;i<20;i++){
  await expect(page.getByTestId('tone-next')).toBeEnabled();
  await page.getByTestId('tone-next').click();
  await expect(page.getByTestId('tone-not')).toBeEnabled();
  await page.getByTestId('tone-not').click();
 }
 await expect(page.getByTestId('tone-finish')).toBeEnabled();
 await page.getByTestId('tone-finish').click();
 await expect(page.getByTestId('archive-preview')).toBeEnabled();
 // The same proposed curve is visible and exportable immediately, even
 // before creating any saved profile or asking for EQ archival consent.
 await expect(page.getByTestId('eq-immediate-chart').locator('.app-eq-band')).toHaveCount(5);
 await expect(page.getByTestId('eq-manual-guide')).toBeAttached();
 await page.getByTestId('eq-manual-guide').locator('summary').click();
 await expect(page.getByTestId('eq-guide-steps').locator('li')).toHaveCount(4);
 await expect(page.getByTestId('eq-guide-rows').locator('li')).toHaveCount(5);
 await expect(page.getByTestId('eq-guide-rows').locator('li').first()).toContainText('125 Hz · 0 dB');
 await expect(page.getByTestId('eq-immediate-txt')).toBeEnabled();
 await expect(page.getByTestId('eq-immediate-csv')).toBeEnabled();
 await expect(page.getByTestId('eq-immediate-png')).toBeEnabled();
 const txtDownload=page.waitForEvent('download');
 await page.getByTestId('eq-immediate-txt').click();
 const txt=await txtDownload;
 const txtBody=fs.readFileSync(await txt.path(),'utf8');
 expect(txtBody.toLowerCase()).toContain('no calibrado');
 expect(txtBody).toContain('125 Hz = 0 dB');
 expect(txtBody).toContain('2000 Hz = 0 dB');
 const csvDownload=page.waitForEvent('download');
 await page.getByTestId('eq-immediate-csv').click();
 const csv=await csvDownload;
 expect(fs.readFileSync(await csv.path(),'utf8')).toContain('125,0,');
 await page.getByTestId('eq-inline-gain-0').fill('1');
 await expect(page.getByTestId('eq-guide-rows').locator('li').first()).toContainText('125 Hz · +1 dB');
 await expect(page.getByTestId('eq-immediate-action')).toContainText('Cambios manuales');
 await expect(page.getByTestId('eq-immediate-save')).toBeDisabled();
 await page.getByTestId('archive-device').fill('Auriculares para la prueba');
 await page.getByTestId('archive-eq-optin').check();
 await page.getByTestId('archive-preview').click();
 await expect(page.getByTestId('archive-status')).toContainText('EQ PROVISIONAL: 5 bandas');
 let dialogs=0;page.on('dialog',d=>{dialogs++;return d.accept();});
 await page.getByTestId('archive-commit').click();
 await expect(page.getByTestId('archive-status')).toContainText('EQ matemático provisional guardados');
 expect(dialogs).toBe(2);
 await expect(page.getByTestId('eq-immediate-save')).toBeEnabled();
 await page.getByTestId('eq-immediate-save').click();
 await expect(page.getByTestId('eq-immediate-save-status')).toContainText('cambios están guardados');
 expect(dialogs).toBe(3);
 await page.getByRole('link',{name:'Ver mis resultados'}).click();
 await expect(page).toHaveURL(/\/hear3-library\/$/);
 await expect(page.getByTestId('summary')).toContainText('1 dispositivos, 1 perfiles, 1 resultados');
 await page.getByRole('link',{name:'Mi ecualizador',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-eq-editor\/$/);
 await expect(page.getByTestId('result-select').locator('option')).toHaveCount(2);
 await page.getByTestId('result-select').selectOption({index:1});
 await expect(page.getByTestId('chart').locator('.band')).toHaveCount(5);
 await expect(page.getByTestId('gain-0')).toHaveValue('1');
 await page.goto('/');
 await expect(page.getByTestId('recent-device')).toContainText('Auriculares para la prueba');
 await expect(page.getByTestId('recent-eq-link')).toContainText('Abrir mi último EQ');
 await page.getByTestId('recent-eq-link').click();
 await expect(page).toHaveURL(/\/hear3-eq-editor\/\?result=/);
 await expect(page.getByTestId('chart').locator('.band')).toHaveCount(5);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('PRESERVE_V2');
});
