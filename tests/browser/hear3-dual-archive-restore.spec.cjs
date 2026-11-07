const {test,expect}=require('@playwright/test');
const PAGE='/tests/fixtures/hear3-catalog-pilot.html';

// Keep the historic payload deliberately non-normalized: unknown fields,
// per-ear evidence and source formatting must survive byte for byte.
function historicV2(suffix){
 return JSON.stringify({app:'AudioCal Hear',version:1,profiles:[{
  id:'old-'+suffix,name:'Original '+suffix,type:'headphones',
  bands:[125,500,1000],
  measures:{
   '125|left':[{kind:'heard',db:-60,history:[{db:-70,heard:false}]}],
   '1000|right':[{kind:'timeout',db:null}],
  },
  manual:{500:2},balance:{500:-1},
  sweepRecords:{both:{events:[{hz:700,heard:true}]}},
  unknownPrivateHistory:{left:[1,2],untouched:'exact-'+suffix},
 }]},null,2);
}
async function seedBoth(page,suffix){
 await page.goto(PAGE);
 return page.evaluate(async({suffix,sourceText})=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const {createHear3LosslessV2HistoryVault}=
   await import('/src/hear3/legacy-v2-history-vault.mjs');
  const store=createHear3CatalogStore(),vault=createHear3LosslessV2HistoryVault();
  const deviceId='device-'+suffix,profileId='profile-'+suffix;
  const catalog={
   catalogVersion:1,
   devices:[{id:deviceId,name:'Equipo '+suffix,category:'headphones'}],
   profiles:[{id:profileId,deviceId,name:'Perfil '+suffix,graphicEq:{
    type:'graphic',deviceId,bands:[
     {id:'bass',frequencyHz:125,source:'manual'},
     {id:'treble',frequencyHz:1000,source:'manual'},
    ]}}],
   results:[{id:'result-'+suffix,profileId,capturedAt:1790000000000,
    status:'provisional',provenance:'manual',
    originalEq:[{bandId:'bass',gainDb:0},{bandId:'treble',gainDb:0}],
    currentEq:[{bandId:'bass',gainDb:1},{bandId:'treble',gainDb:-1}],
    observations:[],editHistory:[]}],
   activeProfileId:profileId,
  };
  const c=store.save(catalog);
  vault.preview(sourceText);
  // In this automated fixture, the complete portable backup is captured
  // before a local write. The real UI requires an explicit download.
  const priorPortable=vault.exportPending();
  const h=vault.commit({userInitiated:true,confirmed:true,
   confirmSourceBackupExported:true});
  localStorage.setItem('audiocal-hear-profiles-v1','original-key-'+suffix);
  return {
   catalog:store.load().catalog,sourceText,
   catalogBackup:store.exportBackup(),historyBackup:priorPortable,
   catalogDurable:c.persistedOnDevice,historyDurable:h.persistedOnDevice,
   legacyKey:localStorage.getItem('audiocal-hear-profiles-v1'),
  };
 },{suffix,sourceText:historicV2(suffix)});
}
async function restoreTwoFiles(page,source){
 return page.evaluate(async({catalogBackup,historyBackup})=>{
  const {createHear3CatalogStore,createHear3CatalogBackupTransfer}=
   await import('/src/hear3/catalog-backup-store.mjs');
  const {createHear3LosslessV2HistoryVault}=
   await import('/src/hear3/legacy-v2-history-vault.mjs');
  const {createHear3CatalogWriteCoordinator}=
   await import('/src/hear3/coordinated-catalog-writer.mjs');
  const store=createHear3CatalogStore(),vault=createHear3LosslessV2HistoryVault();
  const writer=createHear3CatalogWriteCoordinator({store});
  const transfer=createHear3CatalogBackupTransfer({store});
  // Both files are previewed and integrity-checked before either is written.
  const catalogPreview=transfer.preview(catalogBackup,{mode:'replace'});
  const historyPreview=vault.previewPackage(historyBackup);
  const portable=vault.exportPending();
  if(portable!==historyBackup)throw Error('Portable V2 source changed during preview');
  if(!catalogPreview.replacesExisting||!historyPreview.replacesExisting)
   throw Error('This test requires two existing snapshots for user-authorized replacement');
  const h=await writer.run(()=>vault.commit({userInitiated:true,confirmed:true,
   confirmSourceBackupExported:true,confirmOverwrite:true}));
  const c=await writer.run(()=>transfer.commit({
   userInitiated:true,confirmReplace:true,
  }),{expectedRevision:store.load().revision});
  return {historyPersisted:h.response.persistedOnDevice,
   catalogPersisted:c.response.persistedOnDevice,
   historyRevision:vault.load().revision,catalogRevision:store.load().revision};
 },{catalogBackup:source.catalogBackup,historyBackup:source.historyBackup});
}
async function snapshotBoth(page){
 return page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const {createHear3LosslessV2HistoryVault}=
   await import('/src/hear3/legacy-v2-history-vault.mjs');
  const store=createHear3CatalogStore(),vault=createHear3LosslessV2HistoryVault();
  return {catalog:store.load().catalog,catalogDurable:store.load().persistedOnDevice,
   history:vault.load().sourceText,historyDurable:vault.load().persistedOnDevice,
   legacyKey:localStorage.getItem('audiocal-hear-profiles-v1')};
 });
}
test('D-051/D-060 two independent V2+V3 files restore and roll back without data conflation',async({browser})=>{
 test.setTimeout(120000);
 const ctxA=await browser.newContext();
 const ctxB=await browser.newContext();
 try{
  const pageA=await ctxA.newPage(),pageB=await ctxB.newPage();
  const a=await seedBoth(pageA,'A'),b=await seedBoth(pageB,'B');
  expect([a.catalogDurable,a.historyDurable,b.catalogDurable,b.historyDurable])
   .toEqual([true,true,true,true]);
  // Neither source format is absorbed into the other snapshot.
  expect(a.catalogBackup).not.toContain('unknownPrivateHistory');
  expect(a.historyBackup).toContain('unknownPrivateHistory');
  const restored=await restoreTwoFiles(pageB,a);
  expect(restored.catalogPersisted).toBe(true);
  expect(restored.historyPersisted).toBe(true);
  await pageB.reload();
  const after=await snapshotBoth(pageB);
  expect(after.catalog).toEqual(a.catalog);
  expect(after.history).toBe(a.sourceText);
  expect(after.catalogDurable).toBe(true);
  expect(after.historyDurable).toBe(true);
  expect(after.legacyKey).toBe(b.legacyKey);
  // An explicit second two-file import reverses both local copies.
  const rollback=await restoreTwoFiles(pageB,b);
  expect([rollback.catalogPersisted,rollback.historyPersisted]).toEqual([true,true]);
  await pageB.reload();
  const reverted=await snapshotBoth(pageB);
  expect(reverted.catalog).toEqual(b.catalog);
  expect(reverted.history).toBe(b.sourceText);
  expect(reverted.legacyKey).toBe(b.legacyKey);
  expect(reverted.catalogDurable&&reverted.historyDurable).toBe(true);
  const sourceUnchanged=await snapshotBoth(pageA);
  expect(sourceUnchanged.catalog).toEqual(a.catalog);
  expect(sourceUnchanged.history).toBe(a.sourceText);
  expect(sourceUnchanged.legacyKey).toBe(a.legacyKey);
 }finally{await ctxA.close();await ctxB.close();}
});
test('D-051/D-060 V2 vault competing tabs: Web Locks + revision CAS refuse stale writer',async({context,page})=>{
 await page.goto(PAGE);
 const second=await context.newPage();await second.goto(PAGE);
 try{
  async function arm(tab,sourceText){
   return tab.evaluate(async source=>{
    const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
    const {createHear3LosslessV2HistoryVault}=
     await import('/src/hear3/legacy-v2-history-vault.mjs');
    const {createHear3CatalogWriteCoordinator}=
     await import('/src/hear3/coordinated-catalog-writer.mjs');
    const vault=createHear3LosslessV2HistoryVault();
    const writer=createHear3CatalogWriteCoordinator({store:createHear3CatalogStore()});
    vault.preview(source);
    const backedUp=vault.exportPending();
    if(!backedUp.includes('hear3-lossless-v2-history-vault-v1'))
     throw Error('No full source backup');
    window.submitLegacyVault=()=>writer.run(()=>vault.commit({
     userInitiated:true,confirmed:true,confirmSourceBackupExported:true,
    })).then(x=>({ok:true,persisted:x.response.persistedOnDevice}),
     e=>({ok:false,error:e.message}));
    return true;
   },sourceText);
  }
  await arm(page,historicV2('tab-1'));
  await arm(second,historicV2('tab-2'));
  const [first,other]=await Promise.all([
   page.evaluate(()=>window.submitLegacyVault()),
   second.evaluate(()=>window.submitLegacyVault()),
  ]);
  expect([first,other].filter(x=>x.ok)).toHaveLength(1);
  expect([first,other].filter(x=>!x.ok)).toHaveLength(1);
  expect([first,other].find(x=>!x.ok).error).toContain('changed since preview');
  const stored=await page.evaluate(async()=>{
   const {createHear3LosslessV2HistoryVault}=
    await import('/src/hear3/legacy-v2-history-vault.mjs');
   const result=createHear3LosslessV2HistoryVault().load();
   return {sourceText:result.sourceText,revision:result.revision,
    persistedOnDevice:result.persistedOnDevice};
  });
  expect(stored.revision).toBe(1);
  expect(stored.persistedOnDevice).toBe(true);
  expect([historicV2('tab-1'),historicV2('tab-2')]).toContain(stored.sourceText);
 }finally{await second.close();}
});
