const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-catalog-pilot.html';

async function backupFor(page,suffix='one') {
 return page.evaluate(async(suffix)=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const store=createHear3CatalogStore({deviceStorage:null,tabStorage:null});
  const deviceId='d-'+suffix,profileId='p-'+suffix;
  const catalog={
   catalogVersion:1,
   devices:[{id:deviceId,name:'Equipo '+suffix,category:'headphones'}],
   profiles:[{id:profileId,deviceId,name:'Perfil '+suffix,graphicEq:{
    type:'graphic',deviceId,bands:[
     {id:'low',frequencyHz:125,source:'manual'},
     {id:'hi',frequencyHz:8000,source:'manual'},
    ]}}],
   results:[{id:'r-'+suffix,profileId,capturedAt:1790000000000,
    status:'provisional',provenance:'experimental-tone-test',
    originalEq:[{bandId:'low',gainDb:0},{bandId:'hi',gainDb:0}],
    currentEq:[{bandId:'low',gainDb:1},{bandId:'hi',gainDb:0}],
    observations:[],editHistory:[]}],
   activeProfileId:profileId,
  };
  store.save(catalog);
  return store.exportBackup();
 },suffix);
}
async function upload(page,contents){
 await page.getByTestId('file').setInputFiles({
  name:'hear3-catalog.json',mimeType:'application/json',buffer:Buffer.from(contents),
 });
}

test('P0 V3 backup preview is read-only, then imports all linked records explicitly',async({page})=>{
 await page.goto(PILOT);
 const text=await backupFor(page);
 await upload(page,text);
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('description')).toContainText('Respaldo: 1 dispositivos, 1 perfiles, 1 resultados');
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
 await page.getByTestId('commit').click();
 await expect(page.getByTestId('summary')).toContainText('1 dispositivos, 1 perfiles, 1 resultados');
 const data=await page.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(data.catalog.results[0].originalEq[0].gainDb).toBe(0);
 expect(data.catalog.results[0].currentEq[0].gainDb).toBe(1);
 expect(data.catalog.results[0].profileId).toBe(data.catalog.profiles[0].id);
});

test('P0 add-only backups preserve both results and never overwrite identical IDs',async({page})=>{
 await page.goto(PILOT);
 await upload(page,await backupFor(page,'a'));
 await page.getByTestId('preview').click();
 await page.getByTestId('commit').click();
 await upload(page,await backupFor(page,'b'));
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('description')).toContainText('Al finalizar: 2 resultados');
 await page.getByTestId('commit').click();
 await expect(page.getByTestId('summary')).toContainText('2 dispositivos, 2 perfiles, 2 resultados');
 await upload(page,await backupFor(page,'a'));
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('error')).toContainText('Duplicate device');
 await expect(page.getByTestId('commit')).toBeDisabled();
 expect((await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog.results).toHaveLength(2);
});

test('P0 replacing a full catalog asks for separate affirmative confirmation',async({page})=>{
 await page.goto(PILOT);
 await upload(page,await backupFor(page,'one'));
 await page.getByTestId('preview').click();
 await page.getByTestId('commit').click();
 await page.getByTestId('mode').selectOption('replace');
 await upload(page,await backupFor(page,'two'));
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('description')).toContainText('Requiere confirmar el reemplazo completo');
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByTestId('commit').click();
 expect((await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog.devices[0].id).toBe('d-one');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('commit').click();
 expect((await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog.devices[0].id).toBe('d-two');
});

test('P0 damaged backup checksum rejects import before any local changes',async({page})=>{
 await page.goto(PILOT);
 const bad=JSON.parse(await backupFor(page,'one'));
 bad.catalog.results[0].currentEq[0].gainDb=20;
 await upload(page,JSON.stringify(bad));
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('error')).toContainText('checksum mismatch');
 await expect(page.getByTestId('commit')).toBeDisabled();
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
});

test('P0 stale preview cannot replace catalog written by another tab after inspection',async({page})=>{
 await page.goto(PILOT);
 await upload(page,await backupFor(page,'one'));
 await page.getByTestId('preview').click();
 await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const concurrent=createHear3CatalogStore();
  concurrent.save(concurrent.load().catalog);
 });
 await page.getByTestId('commit').click();
 await expect(page.getByTestId('error')).toContainText('changed since preview');
 expect((await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog.results).toHaveLength(0);
});

test('P0 catalog pilot does not create Web Audio or touch legacy Hear 2.0 profile keys',async({page})=>{
 await page.goto(PILOT);
 await page.evaluate(()=>window.localStorage.setItem('audiocal-hear-profiles-v1','TEST_LEGACY_PRESERVED'));
 await upload(page,await backupFor(page,'one'));
 await page.getByTestId('preview').click();
 await page.getByTestId('commit').click();
 expect(await page.evaluate(()=>window.localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('TEST_LEGACY_PRESERVED');
 expect(await page.evaluate(()=>typeof window.hear3Pilot)).toBe('undefined');
});
