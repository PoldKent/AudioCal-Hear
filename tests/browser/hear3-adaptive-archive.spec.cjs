const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';

async function fakeAudio(page) {
 await page.addInitScript(()=>{
  window.__fakeStarts=0;
  class Param{
   setValueAtTime(){}linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){}cancelScheduledValues(){}
  }
  class FakeAudioContext{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){}removeEventListener(){}
   createOscillator(){
    const osc={frequency:new Param(),type:'sine',onended:null,
     connect(){},disconnect(){},start(){window.__fakeStarts++;},
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
async function finishSubjectivePilot(page) {
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
}
test('P0 archival preview is unavailable until verified discrete exam is finished',async({page})=>{
 await page.goto(PILOT);
 await expect(page.getByTestId('archive-preview')).toBeDisabled();
 await expect(page.getByTestId('archive-commit')).toBeDisabled();
 await expect(page.getByTestId('archive-status')).toContainText('Primero termina');
});
test('P0 opt-in archive saves completed tone responses without false EQ or deleting V2',async({page})=>{
 test.setTimeout(60000);
 await fakeAudio(page);
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','LEGACY_STAYS'));
 await page.goto(PILOT);
 await finishSubjectivePilot(page);
 const before=await page.evaluate(()=>window.__fakeStarts);
 await page.getByTestId('archive-device').fill('Equipo seguro QA');
 await page.getByTestId('archive-profile').fill('Perfil experimental QA');
 await page.getByTestId('archive-category').selectOption('car');
 await page.getByTestId('archive-preview').click();
 await expect(page.getByTestId('archive-status')).toContainText('20 respuestas');
 await expect(page.getByTestId('archive-status')).toContainText('Ganancias EQ: 0');
 await expect(page.getByTestId('archive-commit')).toBeEnabled();
 page.once('dialog',d=>d.dismiss());
 await page.getByTestId('archive-commit').click();
 await expect(page.getByTestId('archive-commit')).toBeEnabled();
 expect(await page.evaluate(()=>window.__fakeStarts)).toBe(before);
 const beforeCatalog=await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  return createHear3CatalogStore().load().catalog;
 });
 expect(beforeCatalog.results).toHaveLength(0);
 page.once('dialog',d=>d.accept());
 await page.getByTestId('archive-commit').click();
 await expect(page.getByTestId('archive-status')).toContainText('Historial V3 guardado localmente');
 await expect(page.getByTestId('archive-commit')).toBeDisabled();
 expect(await page.evaluate(()=>window.__fakeStarts)).toBe(before);
 const catalog=await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  return createHear3CatalogStore().load().catalog;
 });
 expect(catalog.devices).toHaveLength(1);
 expect(catalog.devices[0].category).toBe('car');
 expect(catalog.profiles).toHaveLength(1);
 expect(catalog.results).toHaveLength(1);
 expect(catalog.results[0].status).toBe('inconclusive');
 expect(catalog.results[0].provenance).toBe('experimental-tone-test');
 expect(catalog.results[0].observations).toHaveLength(20);
 expect(catalog.results[0].originalEq).toEqual([]);
 expect(catalog.results[0].currentEq).toEqual([]);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('LEGACY_STAYS');
 await page.reload();
 await page.getByRole('link',{name:'Consultar catálogo e historial V3'}).click();
 await expect(page.getByTestId('summary')).toContainText('1 dispositivos, 1 perfiles, 1 resultados');
});
