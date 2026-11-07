const {test,expect}=require('@playwright/test');
const PAGE='/hear3-dual-restore/';
const CATALOG='/tests/fixtures/hear3-catalog-pilot.html';
function historic(id){
 return JSON.stringify({app:'AudioCal Hear',version:1,profiles:[{
  id:'old-'+id,name:'Equipo antiguo '+id,type:'headphones',bands:[125,500,1000],
  measures:{'500|left':[{kind:'heard',db:-60,history:[{db:-65,heard:false}]}]},
  manual:{500:1},balance:{125:-2},
  unknownHistory:{untouched:'original-'+id},
 }]},null,2);
}
async function seed(page,id){
 await page.goto(CATALOG);
 return page.evaluate(async({id,oldText})=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const {createHear3LosslessV2HistoryVault}=
   await import('/src/hear3/legacy-v2-history-vault.mjs');
  const store=createHear3CatalogStore(),vault=createHear3LosslessV2HistoryVault();
  const deviceId='dev-'+id,profileId='profile-'+id;
  const catalog={catalogVersion:1,
   devices:[{id:deviceId,name:'Equipo '+id,category:'headphones'}],
   profiles:[{id:profileId,deviceId,name:'Perfil '+id,
    graphicEq:{type:'graphic',deviceId,bands:[
     {id:'low',frequencyHz:125,source:'manual'},
     {id:'high',frequencyHz:1000,source:'manual'},
    ]}}],
   results:[{id:'result-'+id,profileId,capturedAt:1790000000000,
    status:'provisional',provenance:'manual',
    originalEq:[{bandId:'low',gainDb:0},{bandId:'high',gainDb:0}],
    currentEq:[{bandId:'low',gainDb:1},{bandId:'high',gainDb:-1}],
    observations:[],editHistory:[]}],
   activeProfileId:profileId};
  if(!store.save(catalog).persistedOnDevice)throw Error('V3 setup did not persist');
  vault.preview(oldText);vault.exportPending();
  if(!vault.commit({userInitiated:true,confirmed:true,
   confirmSourceBackupExported:true}).persistedOnDevice)throw Error('V2 setup did not persist');
  localStorage.setItem('audiocal-hear-profiles-v1','ORIGINAL-V2-'+id);
  return {catalog:store.load().catalog,history:oldText,
   catalogBackup:store.exportBackup(),historyBackup:vault.exportStored(),
   legacySource:localStorage.getItem('audiocal-hear-profiles-v1')};
 },{id,oldText:historic(id)});
}
async function prepare(page,source){
 await page.goto(PAGE);
 await expect(page.getByTestId('recovery-status')).toContainText('No hay marcador');
 await page.getByTestId('v3-file').setInputFiles({
  name:'v3.json',mimeType:'application/json',
  buffer:Buffer.from(source.catalogBackup),
 });
 await page.getByTestId('v2-file').setInputFiles({
  name:'v2.json',mimeType:'application/json',
  buffer:Buffer.from(source.historyBackup),
 });
 await page.getByTestId('review').click();
 await expect(page.getByTestId('review-status')).toContainText('Revisión solo lectura');
 await expect(page.getByTestId('restore')).toBeDisabled();
 const d3=page.waitForEvent('download');
 await page.getByTestId('previous-v3').click();
 const original3=await d3;
 expect(original3.suggestedFilename()).toContain('catalogo-v3');
 await expect(page.getByTestId('restore')).toBeDisabled();
 const d2=page.waitForEvent('download');
 await page.getByTestId('previous-v2').click();
 const original2=await d2;
 expect(original2.suggestedFilename()).toContain('historial-v2');
 await expect(page.getByTestId('restore')).toBeEnabled();
 return {v3:original3,v2:original2};
}
async function readData(page){
 return page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const {createHear3LosslessV2HistoryVault}=
   await import('/src/hear3/legacy-v2-history-vault.mjs');
  const store=createHear3CatalogStore(),vault=createHear3LosslessV2HistoryVault();
  return {catalog:store.load().catalog,history:vault.load().sourceText,
   catalogDurable:store.load().persistedOnDevice,
   historyDurable:vault.load().persistedOnDevice,
   oldHear2:localStorage.getItem('audiocal-hear-profiles-v1')};
 });
}
test('two independent files restore only after two rollback downloads and consent',async({browser})=>{
 test.setTimeout(120000);
 const first=await browser.newContext({acceptDownloads:true});
 const second=await browser.newContext({acceptDownloads:true});
 try{
  const aPage=await first.newPage(),bPage=await second.newPage();
  const source=await seed(aPage,'source');
  const baseline=await seed(bPage,'target');
  await prepare(bPage,source);
  const before=await readData(bPage);
  expect(before.catalog).toEqual(baseline.catalog);
  expect(before.history).toBe(baseline.history);
  bPage.on('dialog',d=>d.accept());
  await bPage.getByTestId('restore').click();
  await expect(bPage.getByTestId('operation-status'))
   .toContainText('Ambos archivos se restauraron');
  await bPage.reload();
  const after=await readData(bPage);
  expect(after.catalog).toEqual(source.catalog);
  expect(after.history).toBe(source.history);
  expect(after.oldHear2).toBe(baseline.legacySource);
  expect(after.catalogDurable&&after.historyDurable).toBe(true);
  await expect(bPage.getByTestId('recovery-status')).toContainText('No hay marcador');
  expect((await readData(aPage)).catalog).toEqual(source.catalog);
 }finally{await first.close();await second.close();}
});
test('interrupted V2 restore is flagged after reload, blocks second restore and needs manual paired rollback',async({page})=>{
 test.setTimeout(120000);
 const a=await seed(page,'before');
 const sourcePage=await page.context().newPage();
 const source=await seed(sourcePage,'incoming');
 await sourcePage.close();
 // Seed on the same context has already changed the shared origin; restore
 // the old baseline first to simulate an existing installation faithfully.
 await page.goto(CATALOG);
 await page.evaluate(async({catalogBackup,historyBackup})=>{
  const {createHear3CatalogStore,createHear3CatalogBackupTransfer}=
   await import('/src/hear3/catalog-backup-store.mjs');
  const {createHear3LosslessV2HistoryVault}=
   await import('/src/hear3/legacy-v2-history-vault.mjs');
  const store=createHear3CatalogStore(),vault=createHear3LosslessV2HistoryVault();
  const transfer=createHear3CatalogBackupTransfer({store});
  transfer.preview(catalogBackup,{mode:'replace'});
  transfer.commit({userInitiated:true,confirmReplace:true});
  vault.previewPackage(historyBackup);
  vault.commit({userInitiated:true,confirmed:true,
   confirmSourceBackupExported:true,confirmOverwrite:true});
  localStorage.setItem('audiocal-hear-profiles-v1','ORIGINAL-V2-before');
 },a);
 await prepare(page,source);
 await page.evaluate(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(String(key).startsWith('hear3:v2-history:v1:'))
    throw new DOMException('Simulated quota error','QuotaExceededError');
   return original.call(this,key,value);
  };
 });
 page.on('dialog',d=>d.accept());
 await page.getByTestId('restore').click();
 await expect(page.getByTestId('error'))
  .toContainText('V2 restore is not device-persistent');
 await expect(page.getByTestId('recovery-status')).toContainText('mixed-or-unverified');
 await page.reload();
 await expect(page.getByTestId('recovery-status')).toContainText('mixed-or-unverified');
 await expect(page.getByTestId('restore')).toBeDisabled();
 await expect(page.getByTestId('recovery-ack')).toBeDisabled();
 const partial=await readData(page);
 expect(partial.catalog).toEqual(source.catalog);
 expect(partial.history).toBe(a.history);
 // Simulate an authorized, independent two-file manual rollback using originals.
 await page.evaluate(async({catalogBackup,historyBackup})=>{
  const {createHear3CatalogStore,createHear3CatalogBackupTransfer}=
   await import('/src/hear3/catalog-backup-store.mjs');
  const {createHear3LosslessV2HistoryVault}=
   await import('/src/hear3/legacy-v2-history-vault.mjs');
  const store=createHear3CatalogStore(),vault=createHear3LosslessV2HistoryVault();
  const transfer=createHear3CatalogBackupTransfer({store});
  transfer.preview(catalogBackup,{mode:'replace'});
  if(!transfer.commit({userInitiated:true,confirmReplace:true}).persistedOnDevice)
   throw Error('Manual V3 rollback not persistent');
  vault.previewPackage(historyBackup);
  if(!vault.commit({userInitiated:true,confirmed:true,
   confirmSourceBackupExported:true,confirmOverwrite:true}).persistedOnDevice)
   throw Error('Manual V2 rollback not persistent');
 },{catalogBackup:a.catalogBackup,historyBackup:a.historyBackup});
 await page.getByTestId('recovery-review').click();
 await expect(page.getByTestId('recovery-status')).toContainText('previous-baseline');
 await page.getByTestId('recovery-ack').click();
 await expect(page.getByTestId('recovery-status')).toContainText('No hay marcador');
 await page.reload();
 const restored=await readData(page);
 expect(restored.catalog).toEqual(a.catalog);
 expect(restored.history).toBe(a.history);
 expect(restored.oldHear2).toBe(a.legacySource);
});
