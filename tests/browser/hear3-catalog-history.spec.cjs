const { test, expect } = require('@playwright/test');
const PILOT='/tests/fixtures/hear3-catalog-pilot.html';

async function backupFor(page,suffix='one',withMarkup=false) {
 return page.evaluate(async({suffix,withMarkup})=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const store=createHear3CatalogStore({deviceStorage:null,tabStorage:null});
  const deviceId='d-'+suffix,profileId='p-'+suffix;
  const eq=[{id:'low',frequencyHz:125,source:'manual'},
    {id:'hi',frequencyHz:8000,source:'manual'}];
  const gains=[{bandId:'low',gainDb:0},{bandId:'hi',gainDb:1}];
  const value={
   catalogVersion:1,
   devices:[{id:deviceId,name:withMarkup?'<img src=x onerror=alert(1)>':'Equipo '+suffix,
    category:'headphones'}],
   profiles:[{id:profileId,deviceId,name:'Perfil '+suffix,
    graphicEq:{type:'graphic',deviceId,bands:eq}}],
   results:[{id:'r-'+suffix,profileId,capturedAt:suffix==='two'?1790000009000:1790000000000,
    status:'provisional',provenance:'experimental-tone-test',
    originalEq:gains,currentEq:gains,observations:[],editHistory:[]}],
   activeProfileId:profileId,
  };
  store.save(value);
  return store.exportBackup();
 },{suffix,withMarkup});
}
async function importBackup(page,text) {
 await page.getByTestId('file').setInputFiles({
  name:'hear3-catalog.json',mimeType:'application/json',buffer:Buffer.from(text),
 });
 await page.getByTestId('preview').click();
 await page.getByTestId('commit').click();
}

test('P0 history on first visit never invents a result or starts audio',async({page})=>{
 await page.goto(PILOT);
 await page.getByTestId('history-show').click();
 await expect(page.getByTestId('history-result')).toContainText('No hay perfil activo');
 expect(await page.evaluate(()=>typeof window.hear3Pilot)).toBe('undefined');
});

test('P0 last result is recovered after reload from active profile only',async({page})=>{
 await page.goto(PILOT);
 await importBackup(page,await backupFor(page,'one'));
 await importBackup(page,await backupFor(page,'two'));
 await page.reload();
 await page.getByTestId('history-show').click();
 const summary=page.getByTestId('history-result');
 await expect(summary).toContainText('Perfil one');
 await expect(summary).toContainText('r-one');
 await expect(summary).not.toContainText('r-two');
 await expect(summary).toContainText('EQ original: 2 bandas');
 await expect(summary).toContainText('EQ editado: 2 bandas');
 await expect(summary).toContainText('Datos experimentales no calibrados');
 await expect(summary).toContainText('reproducción automática: no');
});

test('P0 history renders untrusted device names as text, never as HTML',async({page})=>{
 await page.goto(PILOT);
 await importBackup(page,await backupFor(page,'markup',true));
 await page.getByTestId('history-show').click();
 await expect(page.getByTestId('history-result')).toContainText('<img src=x onerror=alert(1)>');
 await expect(page.locator('img')).toHaveCount(0);
});
