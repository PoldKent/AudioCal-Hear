const {test,expect}=require('@playwright/test');
const HOME='/';

test('appearance follows the operating system unless explicitly overridden',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto(HOME);
 await expect(page.getByTestId('hear3-theme-choice')).toHaveValue('system');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','dark');
 await page.getByTestId('hear3-theme-choice').selectOption('light');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-theme:v1'))).toBe('light');
 await page.getByRole('link',{name:'Examen'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 await page.getByRole('link',{name:'Mi ecualizador'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','light');
 await page.getByRole('link',{name:'Inicio'}).click();
 await expect(page.getByTestId('hear3-theme-choice')).toHaveValue('light');
 await page.getByTestId('hear3-theme-choice').selectOption('system');
 await expect(page.locator('html')).toHaveAttribute('data-hear3-theme','dark');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-theme:v1'))).toBe(null);
});

test('the home has a safe start, data status and no automatic audio',async({page})=>{
 await page.goto(HOME);
 await expect(page.getByRole('heading',{name:/Cómo funciona/})).toBeVisible();
 await expect(page.getByTestId('resume-note')).toContainText('nunca se reproduce');
 await expect(page.getByRole('link',{name:'Comenzar examen'}))
  .toHaveAttribute('href','./hear3-exam/');
 await expect(page.getByRole('link',{name:'Ver mi ecualizador'}))
  .toHaveAttribute('href','./hear3-eq-editor/');
 await expect(page.locator('audio')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=
  document.documentElement.clientWidth+2)).toBe(true);
});
test('theme choice cannot alter previously saved profiles',async({page})=>{
 await page.goto(HOME);
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','OLDER_RECORDS_STAY'));
 await page.getByTestId('hear3-theme-choice').selectOption('dark');
 await page.getByRole('link',{name:'Historial',exact:true}).click();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('OLDER_RECORDS_STAY');
});
