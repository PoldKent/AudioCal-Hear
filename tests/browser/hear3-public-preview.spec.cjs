test('official root is one usable single-purpose test, not a version launcher',async({page})=>{
 await page.goto('/');
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('Encuentra tu sonido.');
 await expect(page.getByTestId('focus-begin')).toBeVisible();
 await expect(page.getByTestId('focus-ready')).toBeHidden();
 await expect(page.getByTestId('focus-result')).toBeHidden();
 await expect(page.locator('nav,#profile-count,#eq-count,#recent-profile')).toHaveCount(0);
 await expect(page.locator('#ajustes')).not.toHaveAttribute('open');
 await expect(page.locator('a[href*="hear2"],a[href*="tests/fixtures"]')).toHaveCount(0);
 expect(await page.evaluate(()=>
  document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBe(true);
});

test('old preview bookmark redirects to the same app, with no version chooser',async({page})=>{
 await page.goto('/hear3-preview/');
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('Encuentra tu sonido.');
 await expect(page.locator('a[href*="hear2"]')).toHaveCount(0);
});

test('the simple test is primary; EQ history and technical pages remain reachable only on demand',async({page})=>{
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByTestId('focus-ready')).toBeVisible();
 await page.locator('#ajustes > summary').click();
 await page.getByRole('link',{name:'Resultados guardados'}).click();
 await expect(page).toHaveURL(/\/hear3-library\/$/);
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
 await page.getByRole('link',{name:'Mi ecualizador',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-eq-editor\/$/);
 await expect(page.getByTestId('review')).toBeDisabled();
 await page.goto('/');
 await expect(page.getByTestId('focus-begin')).toBeVisible();
});

test('opening the new app never mutates or converts older saved browser records',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{
  localStorage.setItem('audiocal-hear-profiles-v1','ORIGINAL_DATA_PRESERVED');
 });
 await page.reload();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('ORIGINAL_DATA_PRESERVED');
 await page.goto('/hear3-library/');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('ORIGINAL_DATA_PRESERVED');
 await page.goto('/hear3-exam/');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('ORIGINAL_DATA_PRESERVED');
});
