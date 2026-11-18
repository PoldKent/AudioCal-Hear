const {test,expect}=require('@playwright/test');

async function seedTwoProfiles(page){
 await page.goto('/');
 await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const store=createHear3CatalogStore(),base=store.load();
  const makeProfile=(id,deviceId,name)=>({id,deviceId,name,graphicEq:{
   type:'graphic',deviceId,bands:[
    {id:'band-125',frequencyHz:125,source:'manual'},
    {id:'band-500',frequencyHz:500,source:'manual'},
   ],
  }});
  const catalog={
   catalogVersion:1,
   devices:[{id:'device-1',name:'Primer equipo',category:'headphones'},
    {id:'device-2',name:'Equipo más reciente',category:'car'}],
   profiles:[makeProfile('profile-1','device-1','Primer perfil'),
    makeProfile('profile-2','device-2','Perfil más reciente')],
   results:[
    {id:'result-old',profileId:'profile-1',capturedAt:1710000000000,
     status:'inconclusive',provenance:'manual',originalEq:[],currentEq:[],
     observations:[],editHistory:[]},
    {id:'result-new',profileId:'profile-2',capturedAt:1790000000000,
     status:'inconclusive',provenance:'manual',originalEq:[],currentEq:[],
     observations:[],editHistory:[]},
   ],
   activeProfileId:'profile-1',
  };
  store.save(catalog,{expectedRevision:base.revision});
 });
}
test('returning user sees most recent result across all devices without rewriting active profile',async({page})=>{
 await seedTwoProfiles(page);
 await page.reload();
 await expect(page.getByTestId('recent-device')).toContainText('Equipo más reciente');
 await expect(page.getByTestId('recent-device')).toContainText('Perfil más reciente');
 await expect(page.getByTestId('recent-eq-link')).toContainText('Ver mis perfiles');
 const actual=await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  return createHear3CatalogStore().load().catalog.activeProfileId;
 });
 expect(actual).toBe('profile-1');
});
test('user can target a saved device or profile while preparing an exam without creating duplicates',async({page})=>{
 await seedTwoProfiles(page);
 await page.goto('/hear3-exam/');
 await page.getByTestId('hear-secondary-extras').locator('summary').first().click();
 const target=page.getByTestId('archive-target');
 await expect(target.locator('option')).toHaveCount(5); // New, 2 devices, 2 profiles
 await target.selectOption('device:device-2');
 await expect(page.getByTestId('archive-device')).toBeDisabled();
 await expect(page.getByTestId('archive-profile')).toBeEnabled();
 await expect(page.getByTestId('archive-category')).toHaveValue('car');
 await expect(page.getByTestId('archive-target-help')).toContainText('creará un perfil nuevo');
 await target.selectOption('profile:profile-1');
 await expect(page.getByTestId('archive-device')).toBeDisabled();
 await expect(page.getByTestId('archive-profile')).toBeDisabled();
 await expect(page.getByTestId('archive-category')).toHaveValue('headphones');
 await expect(page.getByTestId('archive-target-help')).toContainText('sin modificar el perfil');
 await target.selectOption('');
 await expect(page.getByTestId('archive-device')).toBeEnabled();
 await expect(page.getByTestId('archive-profile')).toBeEnabled();
 const counts=await page.evaluate(async()=>{
  const {createHear3CatalogStore}=await import('/src/hear3/catalog-backup-store.mjs');
  const c=createHear3CatalogStore().load().catalog;
  return [c.devices.length,c.profiles.length,c.results.length];
 });
 expect(counts).toEqual([2,2,2]);
});
