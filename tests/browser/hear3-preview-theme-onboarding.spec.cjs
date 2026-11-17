const {test,expect}=require('@playwright/test');
const PAGE='/hear3-preview/';

test('Hear 3 beta appearance follows operating system unless explicitly overridden',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto(PAGE);
 await expect(page.getByTestId('hear3-theme-choice')).toHaveValue('system');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','dark');
 await page.getByTestId('hear3-theme-choice').selectOption('light');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-theme:v1'))).toBe('light');
 await page.reload();
 await expect(page.getByTestId('hear3-theme-choice')).toHaveValue('light');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 await page.getByTestId('hear3-theme-choice').selectOption('system');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','dark');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-theme:v1'))).toBe(null);
});
test('the new guide has a safe start, explicit recovery instruction and no autoplay',async({page})=>{
 await page.goto(PAGE);
 await expect(page.getByRole('heading',{name:/Primeros pasos/})).toBeVisible();
 await expect(page.getByTestId('resume-note')).toContainText('Ninguna prueba se reproduce');
 await expect(page.getByRole('link',{name:'Comenzar examen experimental'}))
  .toHaveAttribute('href','../hear3-exam/');
 await expect(page.getByRole('link',{name:'Revisar perfiles y EQ archivados'}))
  .toHaveAttribute('href','../hear3-eq-editor/');
 await expect(page.locator('#pilotos article')).toHaveCount(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=
  document.documentElement.clientWidth+2)).toBe(true);
});
test('theme preference belongs only to Hear 3 and does not alter legacy Hear 2 profiles',async({page})=>{
 await page.goto('/hear2/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','OLD_V2_STAYS'));
 await page.goto(PAGE);
 await page.getByTestId('hear3-theme-choice').selectOption('dark');
 await page.goto('/hear2/');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('OLD_V2_STAYS');
});
