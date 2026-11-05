const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-catalog-pilot.html';

async function seed(page) {
 await page.goto(PILOT);
 await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const store=createHear3CatalogStore();
  const makeProfile=(id,deviceId)=>({id,name:'Perfil '+id,deviceId,
   graphicEq:{type:'graphic',deviceId,bands:[
    {id:'bass',frequencyHz:125,source:'manual'},
    {id:'treble',frequencyHz:8000,source:'manual'},
   ]}});
  const makeResult=(id,profileId)=>({id,profileId,capturedAt:1790000000000,
   status:'inconclusive',provenance:'manual',originalEq:[],currentEq:[],
   observations:[],editHistory:[]});
  store.save({
   catalogVersion:1,
   devices:[{id:'device-one',name:'Equipo uno',category:'headphones'},
    {id:'device-two',name:'Equipo dos',category:'speaker'}],
   profiles:[makeProfile('profile-one','device-one'),makeProfile('profile-two','device-two')],
   results:[makeResult('result-one','profile-one'),makeResult('result-two','profile-two')],
   activeProfileId:'profile-one',
  });
  localStorage.setItem('audiocal-hear-profiles-v1','LEGACY_KEEP');
 });
 await page.reload();
 await expect(page.getByTestId('summary')).toContainText('2 dispositivos, 2 perfiles, 2 resultados');
}

test('P0 deleting a single V3 result requires preview/confirmation and keeps V2',async({page})=>{
 await seed(page);
 await page.getByTestId('delete-target').selectOption('result-one');
 await page.getByTestId('delete-preview').click();
 await expect(page.getByTestId('delete-summary')).toContainText('0 equipos, 0 perfiles y 1 resultados');
 page.once('dialog',d=>d.dismiss());
 await page.getByTestId('delete-commit').click();
 await expect(page.getByTestId('summary')).toContainText('2 dispositivos, 2 perfiles, 2 resultados');
 page.once('dialog',d=>d.accept());
 await page.getByTestId('delete-commit').click();
 await expect(page.getByTestId('summary')).toContainText('2 dispositivos, 2 perfiles, 1 resultados');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('LEGACY_KEEP');
 await page.reload();
 expect((await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog.results.map(x=>x.id)).toEqual(['result-two']);
});

test('P0 cannot delete a profile with results without explicit cascade and two confirmations',async({page})=>{
 await seed(page);
 await page.getByTestId('delete-kind').selectOption('profile');
 await page.getByTestId('delete-target').selectOption('profile-one');
 await page.getByTestId('delete-preview').click();
 await expect(page.getByTestId('error')).toContainText('separate cascade preview');
 await expect(page.getByTestId('delete-commit')).toBeDisabled();
 await page.getByTestId('delete-cascade').check();
 await page.getByTestId('delete-preview').click();
 await expect(page.getByTestId('delete-summary')).toContainText('1 perfiles y 1 resultados');
 const dialogs=[];
 const onDialog=async d=>{dialogs.push(d.message());await d.accept();};
 page.on('dialog',onDialog);
 await page.getByTestId('delete-commit').click();
 await expect(page.getByTestId('summary')).toContainText('2 dispositivos, 1 perfiles, 1 resultados');
 page.off('dialog',onDialog);
 expect(dialogs.length).toBe(2);
 const snap=await page.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(snap.catalog.activeProfileId).toBe(null);
 expect(snap.catalog.profiles.map(x=>x.id)).toEqual(['profile-two']);
 expect(snap.catalog.results.map(x=>x.id)).toEqual(['result-two']);
 expect(snap.catalog.devices).toHaveLength(2);
});

test('P0 device cascade cannot erase records of an unrelated device',async({page})=>{
 await seed(page);
 await page.getByTestId('delete-kind').selectOption('device');
 await page.getByTestId('delete-target').selectOption('device-one');
 await page.getByTestId('delete-cascade').check();
 await page.getByTestId('delete-preview').click();
 await expect(page.getByTestId('delete-summary')).toContainText('1 equipos, 1 perfiles y 1 resultados');
 const onDialog=d=>d.accept();page.on('dialog',onDialog);
 await page.getByTestId('delete-commit').click();
 page.off('dialog',onDialog);
 const c=(await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog;
 expect(c.devices.map(x=>x.id)).toEqual(['device-two']);
 expect(c.profiles.map(x=>x.id)).toEqual(['profile-two']);
 expect(c.results.map(x=>x.id)).toEqual(['result-two']);
});

test('P0 stale deletion proposal refuses to overwrite subsequent changes',async({page})=>{
 await seed(page);
 await page.getByTestId('delete-target').selectOption('result-one');
 await page.getByTestId('delete-preview').click();
 await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const other=createHear3CatalogStore(),c=other.load().catalog;
  c.results.pop();other.save(c);
 });
 page.once('dialog',d=>d.accept());
 await page.getByTestId('delete-commit').click();
 await expect(page.getByTestId('error')).toContainText('changed since deletion preview');
 const c=(await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog;
 expect(c.results.map(x=>x.id)).toEqual(['result-one']);
});

test('P0 injected names render safely as option text, not HTML',async({page})=>{
 await seed(page);
 await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const store=createHear3CatalogStore(),c=store.load().catalog;
  c.devices[0].name='<img src=x onerror=alert(1)>';store.save(c);
 });
 await page.reload();
 await page.getByTestId('delete-kind').selectOption('device');
 await expect(page.getByTestId('delete-target').locator('option').first()).toContainText('<img');
 await expect(page.locator('img')).toHaveCount(0);
});
