const {test,expect}=require('@playwright/test');

// Browser Web Audio simulation verifies state and consent, not real hearing,
// device volume, acoustic safety or headphone channel routing.
async function fakeAudio(page){
 await page.addInitScript(()=>{
  window.__hearFocusStarts=0;
  class Param{
   setValueAtTime(){}exponentialRampToValueAtTime(){}
   linearRampToValueAtTime(){}cancelScheduledValues(){}
  }
  class Context{
   constructor(){this.state='running';this.currentTime=0;
    this.sampleRate=48000;this.destination={};}
   addEventListener(){}removeEventListener(){}
   createOscillator(){
    const osc={
     frequency:new Param(),type:'sine',onended:null,
     connect(){},disconnect(){},
     start(){window.__hearFocusStarts++},
     stop(at){if(at>15)setTimeout(()=>osc.onended?.(),75)},
    };
    return osc;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running'}
   async close(){this.state='closed'}
  }
  window.AudioContext=Context;
  window.webkitAudioContext=Context;
 });
}
test('new Hear has one principal action, no visible dashboard, no autoplay and hidden data tools',async({page})=>{
 await fakeAudio(page);
 await page.goto('/');
 await expect(page.getByTestId('focus-welcome')).toBeVisible();
 await expect(page.getByTestId('focus-begin')).toBeVisible();
 await expect(page.getByTestId('focus-ready')).toBeHidden();
 await expect(page.getByTestId('focus-tones')).toBeHidden();
 await expect(page.getByTestId('focus-result')).toBeHidden();
 await expect(page.getByRole('heading',{name:'Encuentra tu sonido.'})).toBeVisible();
 await expect(page.locator('.foot-more')).not.toHaveAttribute('open');
 await expect(page.locator('nav,.app-grid,#profile-count')).toHaveCount(0);
 await expect(page.getByTestId('offline-enable')).toBeHidden();
 expect(await page.evaluate(()=>window.__hearFocusStarts)).toBe(0);
 await page.getByTestId('focus-begin').click();
 await expect(page.getByTestId('focus-ready')).toBeVisible();
 await expect(page.getByTestId('focus-welcome')).toBeHidden();
 await page.getByTestId('focus-confirm').click();
 await expect(page.getByRole('status')).toContainText('Marca la confirmación');
 expect(await page.evaluate(()=>window.__hearFocusStarts)).toBe(0);
});

test('direct path starts sound after consent, receives tones, completes and shows a copyable EQ',async({page})=>{
 test.setTimeout(100000);
 await fakeAudio(page);
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await page.getByTestId('focus-volume').check();
 await page.getByTestId('focus-confirm').click();
 await expect(page.getByTestId('focus-tones')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__hearFocusStarts)).toBe(1);
 // A deliberately confirmed start directly plays the first tone. Each
 // subsequent tone requires a new click, with no automatic playback.
 for(let i=0;i<20;i++){
  if(i>0){
   await expect(page.getByTestId('focus-tone-play')).toBeVisible();
   await page.getByTestId('focus-tone-play').click();
  }
  await expect(page.getByTestId('focus-tone-no')).toBeVisible();
  await page.getByTestId('focus-tone-no').click();
 }
 await expect(page.getByTestId('focus-result')).toBeVisible();
 await expect(page.getByTestId('focus-eq-rows').locator('.eq-row')).toHaveCount(5);
 await expect(page.getByTestId('focus-copy')).toBeVisible();
 // EQ appears immediately, no profile creation or archival step required.
 await expect(page.getByTestId('focus-eq-rows').locator('.eq-row').first()).toContainText('125 Hz');
 await page.locator('#result .quiet-options > summary').click();
 const startedDownload=page.waitForEvent('download');
 await page.locator('#download-eq').click();
 const download=await startedDownload;
 const txt=require('node:fs').readFileSync(await download.path(),'utf8');
 expect(txt).toContain('125 Hz');
 expect(txt.toLowerCase()).toContain('no calibrado');
 // Saving is optional and requires a separate affirmative user choice.
 expect(await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  return createHear3CatalogStore().load().catalog.results.length;
 })).toBe(0);
 await page.locator('#save-consent').check();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#save-eq').click();
 await expect(page.locator('#save-status')).toContainText('Guardado en este navegador');
 expect(await page.evaluate(()=>window.__hearFocusStarts)).toBe(20);
 page.once('dialog',d=>d.accept());
 await page.getByTestId('focus-new-test').click();
 await expect(page.getByTestId('focus-ready')).toBeVisible();
 await expect(page.getByTestId('focus-result')).toBeHidden();
 expect(await page.evaluate(()=>window.__hearFocusStarts)).toBe(20);
 await page.goto('/hear3-library/');
 await expect(page.getByTestId('summary')).toContainText('1 dispositivos, 1 perfiles, 1 resultados');
 expect(await page.getByTestId('summary').textContent()).toContain('1 resultados');
});

test('an unfinished test continues from a silent verified checkpoint after reload',async({page})=>{
 await fakeAudio(page);
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','V2_MUST_REMAIN'));
 await page.getByTestId('focus-begin').click();
 await page.getByTestId('focus-volume').check();
 await page.getByTestId('focus-confirm').click();
 await expect(page.getByTestId('focus-tones')).toBeVisible();
 await expect(page.getByTestId('focus-tone-yes')).toBeVisible();
 await page.getByTestId('focus-tone-yes').click();
 await page.reload();
 await expect(page.getByTestId('focus-begin')).toContainText('Continuar');
 expect(await page.evaluate(()=>window.__hearFocusStarts)).toBe(0);
 await page.getByTestId('focus-begin').click();
 await page.getByTestId('focus-volume').check();
 await page.getByTestId('focus-confirm').click();
 await expect(page.getByTestId('focus-tones')).toBeVisible();
 await expect(page.getByTestId('focus-tone-play')).toBeVisible();
 expect(await page.evaluate(()=>window.__hearFocusStarts)).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('V2_MUST_REMAIN');
});

test('a returning user may export and discard an unfinished test without erasing historic profiles',async({page})=>{
 await fakeAudio(page);
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','V2_KEEP'));
 await page.getByTestId('focus-begin').click();
 await page.getByTestId('focus-volume').check();
 await page.getByTestId('focus-confirm').click();
 await expect(page.getByTestId('focus-tone-yes')).toBeVisible();
 await page.getByTestId('focus-tone-yes').click();
 await page.reload();
 await page.getByTestId('focus-begin').click();
 await expect(page.locator('#recovery-options')).not.toHaveAttribute('open');
 await page.locator('#recovery-options > summary').click();
 const pending=page.waitForEvent('download');
 await page.locator('#download-progress').click();
 const downloaded=await pending;
 const raw=require('node:fs').readFileSync(await downloaded.path(),'utf8');
 expect(JSON.parse(raw).format).toBe('hear3-adaptive-exam-bundle-v1');
 page.once('dialog',d=>d.accept());
 await page.getByTestId('focus-reset-progress').click();
 await expect(page.getByTestId('focus-ready')).toBeVisible();
 await expect(page.locator('#recovery-options')).toBeHidden();
 expect(await page.evaluate(async()=>{
  const {createHear3AdaptiveProgressStore}=await import('/src/hear3/adaptive-progress-store.mjs');
  return createHear3AdaptiveProgressStore({profileId:'hear3-integrated-pilot'}).load().checkpoint;
 })).toBeNull();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('V2_KEEP');
 expect(await page.evaluate(()=>window.__hearFocusStarts)).toBe(0);
});

test('user can select a real device EQ distribution without being forced into menus',async({page})=>{
 await fakeAudio(page);
 await page.goto('/');
 await expect(page.locator('#device-options')).toBeHidden();
 await page.getByTestId('focus-begin').click();
 await page.locator('#device-options > summary').click();
 await page.getByTestId('focus-bands').selectOption('7');
 await page.getByTestId('focus-volume').check();
 await page.getByTestId('focus-confirm').click();
 await expect(page.getByTestId('focus-tones')).toBeVisible();
 await expect(page.locator('#band-progress')).toHaveAttribute('max','7');
});

test('advanced data links remain accessible while opening new Hear never alters old V2 storage',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','OLD_DATA_UNMODIFIED'));
 await page.locator('.foot-more > summary').click();
 await expect(page.getByRole('link',{name:'Privacidad'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Restaurar copia'})).toBeVisible();
 await page.getByRole('link',{name:'Resultados guardados'}).click();
 await expect(page).toHaveURL(/\/hear3-library\/$/);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('OLD_DATA_UNMODIFIED');
});
