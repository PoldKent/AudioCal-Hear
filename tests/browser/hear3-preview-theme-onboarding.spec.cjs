const {test,expect}=require('@playwright/test');
const HOME='/';
async function technicalOptions(page){
 await page.locator('#ajustes').evaluate(el=>el.open=true);
 await page.locator('#foot-tech').evaluate(el=>el.open=true);
}
test('appearance follows the system unless explicitly overridden in secondary settings',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto(HOME);
 await technicalOptions(page);
 await expect(page.getByTestId('hear3-theme-choice')).toHaveValue('system');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','dark');
 await page.getByTestId('hear3-theme-choice').selectOption('light');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-theme:v1'))).toBe('light');
 await page.goto('/hear3-exam/');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 await page.goto('/hear3-eq-editor/');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 await page.goto(HOME);
 await technicalOptions(page);
 await expect(page.getByTestId('hear3-theme-choice')).toHaveValue('light');
 await page.getByTestId('hear3-theme-choice').selectOption('system');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','dark');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-theme:v1'))).toBe(null);
});
test('home offers one safe start, no forced profile or automatic audio',async({page})=>{
 await page.goto(HOME);
 await expect(page.getByTestId('focus-begin')).toBeVisible();
 await expect(page.locator('#ajustes')).not.toHaveAttribute('open');
 await expect(page.getByTestId('focus-ready')).toBeHidden();
 await expect(page.locator('audio,#profile-count,#eq-count,#recent-profile')).toHaveCount(0);
 await page.getByTestId('focus-begin').click();
 await expect(page.getByTestId('focus-ready')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 expect(await page.evaluate(()=>
  document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBe(true);
});
test('changing appearance cannot alter older saved profiles',async({page})=>{
 await page.goto(HOME);
 await technicalOptions(page);
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','OLDER_RECORDS_STAY'));
 await page.getByTestId('hear3-theme-choice').selectOption('dark');
 await page.getByRole('link',{name:'Resultados guardados'}).click();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('OLDER_RECORDS_STAY');
});
