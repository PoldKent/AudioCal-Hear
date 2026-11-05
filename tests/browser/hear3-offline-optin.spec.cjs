const {test,expect}=require('@playwright/test');

async function supported(page){
 return page.evaluate(()=>Boolean(window.isSecureContext&&navigator.serviceWorker&&window.caches));
}
test('D-060 offline opt-in never registers a worker or plays audio merely on visiting preview',async({page})=>{
 await page.goto('/hear3-preview/');
 await expect(page.getByTestId('offline-status')).toBeVisible();
 const active=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker?.getRegistration?.();
  return Boolean(reg?.active);
 });
 expect(active).toBe(false);
 await expect(page.getByRole('heading',{name:'Acceso sin conexión · Opcional'})).toBeVisible();
 const hasAudio=await page.evaluate(()=>Boolean(window.hear3IntegratedPilot));
 expect(hasAudio).toBe(false);
});

test('D-060 explicit offline install verifies resources and reopens pilot without connectivity',async({page})=>{
 test.setTimeout(60000);
 await page.goto('/hear3-preview/');
 if(!await supported(page))test.skip(true,'Offline service workers unavailable in this environment');
 await page.getByTestId('offline-enable').click();
 await expect(page.getByTestId('offline-status')).toContainText('Recursos estáticos verificados',{timeout:25000});
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:10000});
 const cacheCheck=await page.evaluate(async()=>{
  const cache=await caches.open('audiocal-hear3-prototype-static-v1');
  return Boolean(await cache.match(new URL('/hear3-preview/',location.origin)))&&
    Boolean(await cache.match(new URL('/tests/fixtures/hear3-integrated-exam-pilot.html',location.origin)));
 });
 expect(cacheCheck).toBe(true);
 await page.context().setOffline(true);
 try{
  await page.goto('/hear3-preview/');
  await expect(page.getByRole('heading',{level:1})).toContainText('La próxima forma de');
  await expect(page.getByTestId('offline-enable')).toBeVisible();
  await page.goto('/tests/fixtures/hear3-integrated-exam-pilot.html');
  await expect(page.locator('main h1')).toContainText('barrido → tonos');
  await expect(page.getByTestId('tone-next')).toBeDisabled();
  expect(await page.evaluate(()=>window.hear3IntegratedPilot?.snapshot())).toBeNull();
  await page.goto('/hear3-privacy/');
  await expect(page.getByTestId('inspect')).toBeEnabled();
 }finally{
  await page.context().setOffline(false);
 }
});
test('D-060 explicit removal never deletes another cache or stored Hear profiles',async({page})=>{
 test.setTimeout(60000);
 await page.goto('/hear3-preview/');
 if(!await supported(page))test.skip(true,'Offline service workers unavailable in this environment');
 await page.evaluate(async()=>{
  const other=await caches.open('unrelated-existing-cache');
  await other.put('/other-resource',new Response('unrelated data'));
  localStorage.setItem('audiocal-hear-profiles-v1','DO_NOT_DELETE_V2');
 });
 await page.getByTestId('offline-enable').click();
 await expect(page.getByTestId('offline-status')).toContainText('Recursos estáticos verificados',{timeout:25000});
 await page.getByTestId('offline-disable').click();
 await expect(page.getByTestId('offline-status')).toContainText('Se solicitó retirar los recursos offline',{timeout:15000});
 const keys=await page.evaluate(()=>caches.keys());
 expect(keys).toContain('unrelated-existing-cache');
 expect(keys).not.toContain('audiocal-hear3-prototype-static-v1');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('DO_NOT_DELETE_V2');
});
