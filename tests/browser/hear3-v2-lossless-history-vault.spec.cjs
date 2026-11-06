const {test,expect}=require('@playwright/test');
const PAGE='/tests/fixtures/hear3-catalog-pilot.html';
const oldProfile=(id='original-v2')=>({
 id,name:'Auriculares originales',type:'headphones',
 bands:[125,500,1000,2000],
 measures:{
  '500|left':[{kind:'heard',db:-57,history:[{db:-63,heard:false}]}],
  '1000|right':[{kind:'unconfirmed',db:null}],
 },
 manual:{500:2},balance:{125:-1},
 sweepRecords:{both:{events:[{hz:750,heard:true}]}},
 privateHistoricData:{untouched:['record1','record2','unknown-subfields']},
});
const raw=()=>JSON.stringify({
 app:'AudioCal Hear',version:1,profiles:[oldProfile()],
},null,2);
async function selectLegacyFile(page,text=raw()){
 await page.getByTestId('legacy-source').selectOption('file');
 await page.getByTestId('legacy-file').setInputFiles({
  name:'AudioCal_Hear_perfiles.json',mimeType:'application/json',
  buffer:Buffer.from(text),
 });
}
test('P0 all original V2 history survives vault import/reload/export without generating V3 clinical results',async({page})=>{
 await page.goto(PAGE);
 const initial=raw();
 await page.evaluate(()=>{
  localStorage.setItem('audiocal-hear-profiles-v1','LEGACY_BROWSER_ORIGINAL_UNTOUCHED');
 });
 await selectLegacyFile(page,initial);
 await page.getByTestId('legacy-preview').click();
 await expect(page.getByTestId('legacy-vault-export')).toBeEnabled();
 await expect(page.getByTestId('legacy-vault-save')).toBeDisabled();
 const pending=page.waitForEvent('download');
 await page.getByTestId('legacy-vault-export').click();
 const artifact=await pending;
 const fs=require('node:fs');
 const portable=JSON.parse(fs.readFileSync(await artifact.path(),'utf8'));
 expect(portable.sourceText).toBe(initial);
 expect(JSON.parse(portable.sourceText).profiles[0].privateHistoricData.untouched)
  .toEqual(['record1','record2','unknown-subfields']);
 await expect(page.getByTestId('legacy-vault-save')).toBeEnabled();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('legacy-vault-save').click();
 await expect(page.getByTestId('legacy-vault-status')).toContainText('Persistencia de dispositivo: sí');
 await expect(page.getByTestId('legacy-vault-status')).toContainText('Resultados clínicos V3 convertidos: 0');
 const first=await page.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(first.catalog.results).toHaveLength(0);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('LEGACY_BROWSER_ORIGINAL_UNTOUCHED');
 await page.reload();
 await expect(page.getByTestId('legacy-vault-stored-export')).toBeEnabled();
 const back=page.waitForEvent('download');
 await page.getByTestId('legacy-vault-stored-export').click();
 const exportAgain=JSON.parse(fs.readFileSync(await (await back).path(),'utf8'));
 expect(exportAgain.sourceText).toBe(initial);
 expect(exportAgain.integrity.value).toBe(portable.integrity.value);
});
test('P0 portable vault imports read-only on a different browser without modifying its own Hear 2',async({browser})=>{
 const first=await browser.newContext({acceptDownloads:true});
 const page1=await first.newPage();
 await page1.goto(PAGE);
 await selectLegacyFile(page1);
 await page1.getByTestId('legacy-preview').click();
 const packageText=await page1.evaluate(async()=>{
  const {exportHear3LosslessV2History}=await import('/src/hear3/legacy-v2-history-vault.mjs');
  return exportHear3LosslessV2History(JSON.stringify({
   app:'AudioCal Hear',version:1,profiles:[{
    id:'original-v2',name:'Auriculares originales',type:'headphones',
    bands:[125,500,1000,2000],
    measures:{'500|left':[{kind:'heard',db:-57}]},
    unusualHistory:{nested:{unchanged:true}},
   }],
  }));
 });
 await first.close();
 const second=await browser.newContext({acceptDownloads:true});
 const page2=await second.newPage();
 await page2.goto(PAGE);
 await page2.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','LOCAL_V2_IN_BROWSER_TWO'));
 await selectLegacyFile(page2,packageText);
 await page2.getByTestId('legacy-preview').click();
 await expect(page2.getByTestId('legacy-description')).toContainText('hear2-official-export-v1');
 await expect(page2.getByTestId('legacy-vault-export')).toBeEnabled();
 await expect(page2.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
 expect(await page2.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('LOCAL_V2_IN_BROWSER_TWO');
 await second.close();
});
test('P0 damaged portable vault cannot arm a complete V2 migration',async({page})=>{
 await page.goto(PAGE);
 const original=raw();
 const {createRequire}=require('node:module');
 // A valid package can be obtained from the local public module, then
 // intentionally damaged without recalculating its accidental checksum.
 const portable=await page.evaluate(async text=>{
  const {exportHear3LosslessV2History}=await import('/src/hear3/legacy-v2-history-vault.mjs');
  return JSON.parse(exportHear3LosslessV2History(text));
 },original);
 portable.sourceText=portable.sourceText.replace('-57','-27');
 await selectLegacyFile(page,JSON.stringify(portable));
 await page.getByTestId('legacy-preview').click();
 await expect(page.getByTestId('error')).toContainText('Damaged V2 history archive');
 await expect(page.getByTestId('legacy-vault-export')).toBeDisabled();
 await expect(page.getByTestId('legacy-vault-save')).toBeDisabled();
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
});
test('P0 original V2 keys remain on scoped V3-only cleanup even when vault is stored',async({page})=>{
 await page.goto(PAGE);
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','OLD_V2_PRESERVE'));
 await selectLegacyFile(page);
 await page.getByTestId('legacy-preview').click();
 await page.getByTestId('legacy-vault-export').click();
 page.once('dialog',d=>d.accept());
 await page.getByTestId('legacy-vault-save').click();
 await expect(page.getByTestId('legacy-vault-status')).toContainText('Persistencia de dispositivo: sí');
 await page.goto('/hear3-privacy/');
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('total-count')).not.toHaveText('0');
 await expect(page.getByTestId('preview-status')).toContainText('copias históricas V2');
 await page.getByTestId('confirm-phrase').fill('BORRAR V3');
 page.once('dialog',d=>d.accept());
 await page.getByTestId('commit').click();
 await expect(page.getByTestId('action-status')).toContainText('Se verificó');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('OLD_V2_PRESERVE');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:v2-history:v1:1'))).toBe(null);
});
