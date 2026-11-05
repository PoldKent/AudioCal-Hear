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
 await expect.poll(()=>page.evaluate(()=>
  window.hear3CatalogPilot.snapshot().catalog.devices[0].id)).toBe('d-two');
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

async function seedLegacyV2(page, profiles) {
 await page.evaluate(profiles => {
  localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify(profiles));
  localStorage.setItem('audiocal-hear-active-v1',profiles[0]?.id??'');
 },profiles);
}
const legacyFixture=()=>({
 id:'v2-first',name:'Headset legado',type:'headphones',bands:[125,250,500,1000],
 measures:{'125|left':[{kind:'heard',db:-55,confidence:'low'}]},
 balance:{125:-1},manual:{250:3},taste:{bass:2},
});

test('P0 legacy migration preview is read-only and discloses unconverted V2 observations',async({page})=>{
 await page.goto(PILOT);
 await seedLegacyV2(page,[legacyFixture()]);
 const before=await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'));
 await page.getByTestId('legacy-preview').click();
 await expect(page.getByTestId('legacy-description')).toContainText('Perfiles antiguos: 1');
 await expect(page.getByTestId('legacy-description')).toContainText('resultados históricos convertidos: 0');
 await expect(page.getByTestId('legacy-description')).toContainText('observaciones originales que permanecen en archivo V2: 1');
 await expect(page.getByTestId('legacy-import')).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe(before);
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
});

test('P0 migration requires archival export and explicit consent; original V2 stays unchanged',async({page})=>{
 await page.goto(PILOT);
 await seedLegacyV2(page,[legacyFixture()]);
 const before=await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'));
 await page.getByTestId('legacy-preview').click();
 await page.getByTestId('legacy-export').click();
 await expect(page.getByTestId('legacy-import')).toBeEnabled();
 page.once('dialog',d=>d.dismiss());
 await page.getByTestId('legacy-import').click();
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
 page.once('dialog',d=>d.accept());
 await page.getByTestId('legacy-import').click();
 await expect(page.getByTestId('summary')).toContainText('1 dispositivos, 1 perfiles, 0 resultados');
 const snap=await page.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(snap.catalog.results).toHaveLength(0);
 expect(snap.catalog.profiles[0].graphicEq.bands.map(x=>x.frequencyHz)).toEqual([125,250,500,1000]);
 expect(snap.catalog.profiles[0].graphicEq.bands.every(x=>x.verification==='unverified')).toBeTruthy();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe(before);
});

test('P0 invalid V2 bands are rejected, never silently truncated or reinterpreted',async({page})=>{
 await page.goto(PILOT);
 await seedLegacyV2(page,[{...legacyFixture(),bands:[1000,125]}]);
 await page.getByTestId('legacy-preview').click();
 await expect(page.getByTestId('error')).toContainText('invalid or unsorted EQ frequencies');
 await expect(page.getByTestId('legacy-export')).toBeDisabled();
 await expect(page.getByTestId('legacy-import')).toBeDisabled();
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
});

test('P0 V2 migration blocks stale preview when legacy data changes in another tab',async({page})=>{
 await page.goto(PILOT);
 await seedLegacyV2(page,[legacyFixture()]);
 await page.getByTestId('legacy-preview').click();
 await page.getByTestId('legacy-export').click();
 await page.evaluate(()=>{
  const next=JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'));
  next[0].name='Cambio fuera del piloto';
  localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify(next));
 });
 page.once('dialog',d=>d.accept());
 await page.getByTestId('legacy-import').click();
 await expect(page.getByTestId('error')).toContainText('changed since preview');
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
});
