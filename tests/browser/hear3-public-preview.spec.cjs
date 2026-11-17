const {test,expect}=require('@playwright/test');

test('the official URL is one usable app, not a launcher for competing versions',async({page})=>{
 await page.goto('/');
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('Escucha. Ajusta.');
 await expect(page.getByRole('link',{name:'Comenzar examen'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Ver mi ecualizador'})).toBeVisible();
 await expect(page.getByTestId('profile-count')).toHaveText('0');
 await expect(page.getByTestId('eq-count')).toHaveText('0');
 await expect(page.getByTestId('resume-note')).toContainText('nunca se reproduce automáticamente');
 await expect(page.locator('a[href*="hear2"]')).toHaveCount(0);
 await expect(page.locator('a[href*="tests/fixtures"]')).toHaveCount(0);
 await expect(page.getByText(/vista previa|pilotos|versión anterior/i)).toHaveCount(0);
 expect(await page.evaluate(()=>
  document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBe(true);
});

test('old preview bookmark redirects to the same app, with no version chooser',async({page})=>{
 await page.goto('/hear3-preview/');
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('Escucha. Ajusta.');
 await expect(page.locator('a[href*="hear2"]')).toHaveCount(0);
});

test('navigation reaches the full exam, editor and local records without autoplay',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:'Comenzar examen'}).click();
 await expect(page).toHaveURL(/\/hear3-exam\/$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('Examen de tonos');
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 await page.getByRole('link',{name:'Mi ecualizador',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-eq-editor\/$/);
 await expect(page.getByTestId('review')).toBeDisabled();
 await page.getByRole('link',{name:'Historial',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-library\/$/);
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
 await page.getByRole('link',{name:'Inicio'}).click();
 await expect(page).toHaveURL(/\/$/);
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
