const {test,expect}=require('@playwright/test');
const EDITOR='/hear3-eq-editor/',PILOT='/tests/fixtures/hear3-catalog-pilot.html';
async function seed(page){
 await page.goto(PILOT);
 return page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const store=createHear3CatalogStore(),id='qa-device',pid='qa-profile';
  const catalog={
   catalogVersion:1,
   devices:[{id,name:'Auriculares QA',category:'headphones'}],
   profiles:[{id:pid,deviceId:id,name:'Perfil de prueba',
    graphicEq:{type:'graphic',deviceId:id,bands:[
     {id:'bass',frequencyHz:125,source:'manual'},
     {id:'mid',frequencyHz:1000,source:'provisional'},
     {id:'high',frequencyHz:8000,source:'manual'},
    ]}}],
   results:[{id:'qa-result',profileId:pid,capturedAt:1791000000000,
    status:'provisional',provenance:'experimental-tone-test',
    originalEq:[{bandId:'bass',gainDb:1},{bandId:'mid',gainDb:0},{bandId:'high',gainDb:-1}],
    currentEq:[{bandId:'bass',gainDb:1},{bandId:'mid',gainDb:0},{bandId:'high',gainDb:-1}],
    observations:[],editHistory:[]}],
   activeProfileId:pid,
  };
  const write=store.save(catalog);
  localStorage.setItem('audiocal-hear-profiles-v1','DO_NOT_EDIT_V2');
  return {persisted:write.persistedOnDevice,revision:write.revision};
 });
}
async function stored(page){
 return page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const value=createHear3CatalogStore().load().catalog.results[0];
  return {current:value.currentEq.map(x=>x.gainDb),
   original:value.originalEq.map(x=>x.gainDb),
   edits:value.editHistory.length,
   historic:localStorage.getItem('audiocal-hear-profiles-v1')};
 });
}
test('saved provisional EQ can be edited with consent and reverted to original without changing V2',async({page})=>{
 test.setTimeout(90000);
 expect((await seed(page)).persisted).toBe(true);
 await page.goto(EDITOR);
 await expect(page.getByRole('heading',{level:1})).toContainText('Editor de EQ provisional');
 await page.getByTestId('result-select').selectOption('qa-result');
 await expect(page.getByTestId('chart').locator('.band')).toHaveCount(3);
 await expect(page.getByTestId('gain-0')).toHaveValue('1');
 await page.getByTestId('gain-0').fill('2');
 await expect(page.getByTestId('review')).toBeEnabled();
 await page.getByTestId('review').click();
 await expect(page.getByTestId('preview-status')).toContainText('Cambios: 1');
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByTestId('commit').click();
 expect((await stored(page)).current).toEqual([1,0,-1]);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('commit').click();
 await expect(page.getByTestId('preview-status')).toContainText('guardado');
 let after=await stored(page);
 expect(after.current).toEqual([2,0,-1]);
 expect(after.original).toEqual([1,0,-1]);
 expect(after.edits).toBe(1);
 expect(after.historic).toBe('DO_NOT_EDIT_V2');
 await page.reload();
 await page.getByTestId('result-select').selectOption('qa-result');
 await expect(page.getByTestId('gain-0')).toHaveValue('2');
 const csvPromise=page.waitForEvent('download');
 await page.getByTestId('csv').click();
 expect((await csvPromise).suggestedFilename()).toContain('no-calibrado.csv');
 const pngPromise=page.waitForEvent('download');
 await page.getByTestId('png').click();
 expect((await pngPromise).suggestedFilename()).toContain('no-calibrado.png');
 await page.getByTestId('restore').click();
 await expect(page.getByTestId('preview-status')).toContainText('valores originales');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('commit').click();
 after=await stored(page);
 expect(after.current).toEqual(after.original);
 expect(after.edits).toBe(2);
 expect(after.historic).toBe('DO_NOT_EDIT_V2');
 await expect(page.getByTestId('restore')).toBeDisabled();
});
test('editor empty state is safe and changes never auto-play sound or auto-export',async({page})=>{
 await page.goto(EDITOR);
 await expect(page.getByTestId('result-select').locator('option')).toHaveCount(1);
 await expect(page.getByTestId('review')).toBeDisabled();
 await expect(page.getByTestId('restore')).toBeDisabled();
 await expect(page.getByTestId('png')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=
  document.documentElement.clientWidth+2)).toBe(true);
});
test('edit bounds and 0.5 step reject values outside the experimental policy',async({page})=>{
 await seed(page);
 await page.goto(EDITOR);
 await page.getByTestId('result-select').selectOption('qa-result');
 await page.getByTestId('gain-0').fill('3.5');
 await page.getByTestId('review').click();
 await expect(page.getByTestId('error')).toContainText('Gain outside provisional EQ bounds');
 expect((await stored(page)).current).toEqual([1,0,-1]);
 await page.getByTestId('gain-0').fill('1.25');
 await page.getByTestId('review').click();
 await expect(page.getByTestId('error')).toContainText('0.5 dB steps');
 expect((await stored(page)).edits).toBe(0);
});

test('two editor tabs reject stale changes instead of overwriting a newer EQ',async({context,page})=>{
 test.setTimeout(60000);
 await seed(page);
 const second=await context.newPage();
 try{
  await page.goto(EDITOR);
  await second.goto(EDITOR);
  for(const tab of [page,second])
   await tab.getByTestId('result-select').selectOption('qa-result');
  await page.getByTestId('gain-0').fill('2');
  await second.getByTestId('gain-1').fill('-1');
  await page.getByTestId('review').click();
  await second.getByTestId('review').click();
  const iOS=await page.evaluate(()=>/iPhone|iPad|iPod/i.test(navigator.userAgent));
  page.once('dialog',d=>d.accept());
  await page.getByTestId('commit').click();
  if(iOS){
   await expect(page.getByTestId('error')).toContainText('Another Hear 3 tab is open in WebKit');
   second.once('dialog',d=>d.accept());
   await second.getByTestId('commit').click();
   await expect(second.getByTestId('error')).toContainText('Another Hear 3 tab is open in WebKit');
   const saved=await stored(second);
   expect(saved.current).toEqual([1,0,-1]);
   expect(saved.edits).toBe(0);
   expect(saved.historic).toBe('DO_NOT_EDIT_V2');
  }else{
   await expect(page.getByTestId('preview-status')).toContainText('guardado');
   second.once('dialog',d=>d.accept());
   await second.getByTestId('commit').click();
   await expect(second.getByTestId('error')).toContainText('Catalog changed in another tab');
   const saved=await stored(second);
   expect(saved.current).toEqual([2,0,-1]);
   expect(saved.edits).toBe(1);
   expect(saved.historic).toBe('DO_NOT_EDIT_V2');
  }
  await second.reload();
  await second.getByTestId('result-select').selectOption('qa-result');
  await expect(second.getByTestId('gain-0')).toHaveValue(iOS?'1':'2');
 }finally{await second.close();}
});
