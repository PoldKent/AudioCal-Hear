const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-catalog-pilot.html';
async function makeCatalog(page,suffix){
 return page.evaluate(async suffix=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const store=createHear3CatalogStore();
  const dev='dev-'+suffix,profile='profile-'+suffix;
  const catalog={
   catalogVersion:1,
   devices:[{id:dev,name:'Equipo '+suffix,category:'headphones'}],
   profiles:[{id:profile,deviceId:dev,name:'Perfil '+suffix,
    graphicEq:{type:'graphic',deviceId:dev,bands:[
     {id:'b125',frequencyHz:125,source:'manual'},
     {id:'b1000',frequencyHz:1000,source:'manual'},
    ]}}],
   results:[{id:'result-'+suffix,profileId:profile,
    capturedAt:1790000000000,status:'provisional',provenance:'manual',
    originalEq:[{bandId:'b125',gainDb:0},{bandId:'b1000',gainDb:0}],
    currentEq:[{bandId:'b125',gainDb:0},{bandId:'b1000',gainDb:0}],
    observations:[],editHistory:[]}],
   activeProfileId:profile,
  };
  const saved=store.save(catalog);
  return {original:store.load().catalog,backup:store.exportBackup(),
   revision:saved.revision,persistedOnDevice:saved.persistedOnDevice};
 },suffix);
}
async function importReplace(page,backup){
 await page.getByTestId('mode').selectOption('replace');
 await page.getByTestId('file').setInputFiles({
  name:'hear3-verified-catalog-snapshot.json',mimeType:'application/json',
  buffer:Buffer.from(backup),
 });
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('description')).toContainText('Requiere confirmar el reemplazo completo');
 page.once('dialog',d=>d.accept());
 await page.getByTestId('commit').click();
}
test('D-060 reversible full V3 backup across independent browser contexts without autoplay',async({browser})=>{
 test.setTimeout(120000);
 const first=await browser.newContext({acceptDownloads:true});
 const origin=await first.newPage();
 await origin.goto(PILOT);
 const source=await makeCatalog(origin,'source');
 expect(source.persistedOnDevice).toBe(true);
 const second=await browser.newContext({acceptDownloads:true});
 const target=await second.newPage();
 await target.goto(PILOT);
 const baseline=await makeCatalog(target,'before');
 expect(baseline.persistedOnDevice).toBe(true);
 await target.reload();
 await importReplace(target,source.backup);
 await expect.poll(()=>target.evaluate(()=>window.hear3CatalogPilot.snapshot().catalog.devices[0].id))
  .toBe('dev-source');
 const afterImport=await target.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(afterImport.persistedOnDevice).toBe(true);
 expect(afterImport.catalog).toEqual(source.original);
 await target.reload();
 expect((await target.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog)
  .toEqual(source.original);
 // User-authorized rollback from a verified earlier exported snapshot,
 // not an automatic destructive recovery process.
 await importReplace(target,baseline.backup);
 await expect.poll(()=>target.evaluate(()=>window.hear3CatalogPilot.snapshot().catalog.devices[0].id))
  .toBe('dev-before');
 await target.reload();
 const afterRollback=await target.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(afterRollback.catalog).toEqual(baseline.original);
 expect(afterRollback.persistedOnDevice).toBe(true);
 const originStill=await origin.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(originStill.catalog).toEqual(source.original);
 expect(originStill.persistedOnDevice).toBe(true);
  // No sound requested: opening or importing the catalog has no audio actions.
 expect(await target.getByTestId('summary').textContent()).toContain('1 resultados');
 await second.close();await first.close();
});
test('D-060 rejected rollback keeps existing data until replacement consent',async({page})=>{
 await page.goto(PILOT);
 const original=await makeCatalog(page,'safe');
 const stale=await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const store=createHear3CatalogStore({deviceStorage:null,tabStorage:null});
  store.save({catalogVersion:1,devices:[],profiles:[],results:[],activeProfileId:null});
  return store.exportBackup();
 });
 await page.reload();
 await page.getByTestId('mode').selectOption('replace');
 await page.getByTestId('file').setInputFiles({
  name:'empty.json',mimeType:'application/json',buffer:Buffer.from(stale),
 });
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('description')).toContainText('Requiere confirmar el reemplazo completo');
 page.once('dialog',d=>d.dismiss());
 await page.getByTestId('commit').click();
 expect((await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog)
  .toEqual(original.original);
 await page.reload();
 expect((await page.evaluate(()=>window.hear3CatalogPilot.snapshot())).catalog)
  .toEqual(original.original);
});
test('D-060 corrupted restore source is refused with no partial catalog deletion',async({page})=>{
 await page.goto(PILOT);
 const data=await makeCatalog(page,'safe');
 const damaged=JSON.parse(data.backup);
 damaged.catalog.results[0].currentEq[0].gainDb=20;
 await page.reload();
 await page.getByTestId('mode').selectOption('replace');
 await page.getByTestId('file').setInputFiles({
  name:'damaged.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(damaged)),
 });
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('error')).toContainText('checksum mismatch');
 await expect(page.getByTestId('commit')).toBeDisabled();
 const dataAfter=await page.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(dataAfter.catalog).toEqual(data.original);
 expect(dataAfter.persistedOnDevice).toBe(true);
});
test('D-060 browser quota error warns that a staged save is not durable',async({page})=>{
 await page.addInitScript(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(String(key).startsWith('hear3:catalog:v1:'))
    throw new DOMException('blocked','QuotaExceededError');
   return original.call(this,key,value);
  };
 });
 await page.goto(PILOT);
 const current=await makeCatalog(page,'temporary');
 expect(current.persistedOnDevice).toBe(false);
 await expect(page.getByTestId('durability')).toContainText('sin persistencia de dispositivo confirmada');
 // A transient/volatile result does not pass as a recoverable on-disk backup.
});
