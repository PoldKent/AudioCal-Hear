const {test,expect}=require('@playwright/test');
const URL='/tests/fixtures/hear3-catalog-pilot.html';
async function emptyBackup(page){
 return page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  return createHear3CatalogStore().exportBackup();
 });
}
async function stage(page,text){
 await page.getByTestId('file').setInputFiles({name:'empty-catalog.json',
  mimeType:'application/json',buffer:Buffer.from(text)});
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('commit')).toBeEnabled();
}
test('two open tabs cannot both commit the same preview: one stale operation is refused',async({context,page})=>{
 await page.goto(URL);
 const second=await context.newPage();await second.goto(URL);
 const raw=await emptyBackup(page);
 await stage(page,raw);await stage(second,raw);
 const [first,other]=await Promise.all([
  page.getByTestId('commit').click(),second.getByTestId('commit').click(),
 ]);
 await expect(page.getByTestId('summary')).toContainText('Catálogo V3');
 await expect(second.getByTestId('summary')).toContainText('Catálogo V3');
 const state=await page.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(state.revision).toBe(1);
 const errors=await Promise.all([
  page.getByTestId('error').textContent(),second.getByTestId('error').textContent(),
 ]);
 expect(errors.filter(s=>s.includes('Catalog changed'))).toHaveLength(1);
 expect(await page.evaluate(()=>navigator.locks?.request instanceof Function)).toBe(true);
 await second.close();
});
test('cross-tab exclusive protocol holds until async callback finishes',async({page})=>{
 await page.goto(URL);
 const outcome=await page.evaluate(async()=>{
  const {createHear3CatalogWriteCoordinator}=await import('/src/hear3/coordinated-catalog-writer.mjs');
  const state={revision:0,catalog:{}};
  const store={load:()=>({...state})};
  const coord=createHear3CatalogWriteCoordinator({store});
  const order=[];
  const a=coord.run(async()=>{
   order.push('first-start');
   await new Promise(resolve=>setTimeout(resolve,30));
   state.revision=1;order.push('first-end');
  },{expectedRevision:0});
  const b=coord.run(()=>{order.push('second-start');},{expectedRevision:0})
   .then(()=>false,()=>true);
  await a;
  const blocked=await b;
  return {order,blocked,supported:coord.supported()};
 });
 expect(outcome.supported).toBe(true);
 expect(outcome.blocked).toBe(true);
 expect(outcome.order).toEqual(['first-start','first-end']);
});
test('when Web Locks is unavailable the coordinator rejects writes instead of falling back unsafely',async({page})=>{
 await page.goto(URL);
 const result=await page.evaluate(async()=>{
  const {createHear3CatalogWriteCoordinator}=await import('/src/hear3/coordinated-catalog-writer.mjs');
  const store={load:()=>({revision:0,catalog:{}})};
  const c=createHear3CatalogWriteCoordinator({store,getLockManager:()=>null});
  let mutated=false,denied='';
  try{await c.run(()=>{mutated=true;});}catch(e){denied=e.message;}
  return {mutated,denied};
 });
 expect(result.mutated).toBe(false);
 expect(result.denied).toContain('locks unavailable');
});
