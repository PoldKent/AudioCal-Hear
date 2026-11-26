const {test,expect}=require('@playwright/test');
const HOME='/';
const CACHE='audiocal-hear3-prototype-static-v17';

async function supported(page){
 return page.evaluate(()=>Boolean(window.isSecureContext&&navigator.serviceWorker&&window.caches));
}
test('offline support does not register workers or start audio by entering the application',async({page})=>{
 await page.goto(HOME);
 await page.locator('#ajustes').evaluate(el=>{el.open=true;});
 await page.locator('#foot-tech').evaluate(el=>{el.open=true;});
 await expect(page.getByTestId('offline-status')).toBeVisible();
 const active=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker?.getRegistration?.();
  return Boolean(reg?.active);
 });
 expect(active).toBe(false);
 await expect(page.getByText('Uso sin conexión (opcional)')).toBeVisible();
 expect(await page.evaluate(()=>Boolean(window.hear3IntegratedPilot))).toBe(false);
});

async function installAndVerify(page){
 await page.goto(HOME);
 await page.locator('#ajustes').evaluate(el=>{el.open=true;});
 await page.locator('#foot-tech').evaluate(el=>{el.open=true;});
 if(!await supported(page))test.skip(true,'Service Worker or Cache Storage unavailable');
 await page.getByTestId('offline-enable').click();
 await expect(page.getByTestId('offline-status')).toContainText('Recursos estáticos verificados',{timeout:25000});
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:10000});
 const cached=await page.evaluate(async cacheName=>{
  const cache=await caches.open(cacheName);
  const required=['/index.html','/src/hear3/focus-experience.css','/src/hear3/focus-experience.mjs','/src/hear3/app-shell.css','/src/hear3/app-theme.mjs',
   '/hear3-exam/','/hear3-library/','/hear3-eq-editor/','/hear3-photo-privacy/',
   '/src/hear3/immediate-eq-result.mjs','/src/hear3/manual-eq-application-guide.mjs',
   '/src/hear3/eq-edit-history.mjs'];
  for(const path of required){
   if(!await cache.match(new URL(path,location.origin)))return false;
  }
  return true;
 },CACHE);
 expect(cached).toBe(true);
}
test('offline installation is opt-in and verifies the full user-facing application',async({page})=>{
 test.setTimeout(60000);
 await installAndVerify(page);
});
test('Chromium can reopen root, exam, results and editor without network after opt-in',async({page})=>{
 test.setTimeout(75000);
 if(test.info().project.name==='iphone-webkit')
  test.skip(true,'Offline WebKit simulator navigation is unstable; physical Safari remains unverified');
 await installAndVerify(page);
 await page.context().setOffline(true);
 try{
  await page.goto(HOME);
 await page.locator('#ajustes').evaluate(el=>{el.open=true;});
 await page.locator('#foot-tech').evaluate(el=>{el.open=true;});
  await expect(page.getByRole('heading',{level:1})).toContainText('Encuentra tu sonido.');
  await page.goto('/hear3-exam/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Tu prueba de sonido');
  await expect(page.getByTestId('sweep-start')).toBeEnabled();
  await expect(page.getByTestId('tone-next')).toBeDisabled();
  await page.goto('/hear3-library/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Mis resultados');
  await page.goto('/hear3-eq-editor/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Mi ecualizador');
  await page.goto('/hear3-privacy/');
  await expect(page.getByTestId('inspect')).toBeEnabled();
  await page.goto('/hear3-photo-privacy/');
  await expect(page.getByTestId('photo')).toBeVisible();
  await page.goto('/hear3-diagnostics/');
  await expect(page.getByTestId('preview')).toBeEnabled();
  await page.getByTestId('preview').click();
  await expect(page.getByTestId('report')).toHaveValue(/hear3-local-technical-report-v1/);
 }finally{
  await page.context().setOffline(false);
 }
});
test('removing app resources does not erase another cache or saved user data',async({page})=>{
 test.setTimeout(60000);
 await page.goto(HOME);
 await page.locator('#ajustes').evaluate(el=>{el.open=true;});
 await page.locator('#foot-tech').evaluate(el=>{el.open=true;});
 if(!await supported(page))test.skip(true,'Service Worker or Cache Storage unavailable');
 await page.evaluate(async()=>{
  const other=await caches.open('unrelated-existing-cache');
  await other.put('/other-resource',new Response('unrelated data'));
  localStorage.setItem('audiocal-hear-profiles-v1','PRESERVE_ORIGINAL');
 });
 await page.getByTestId('offline-enable').click();
 await expect(page.getByTestId('offline-status')).toContainText('Recursos estáticos verificados',{timeout:25000});
 await page.getByTestId('offline-disable').click();
 await expect(page.getByTestId('offline-status')).toContainText('Se solicitó retirar los recursos sin conexión',{timeout:15000});
 const keys=await page.evaluate(()=>caches.keys());
 expect(keys).toContain('unrelated-existing-cache');
 expect(keys).not.toContain(CACHE);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('PRESERVE_ORIGINAL');
});
