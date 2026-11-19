const {test,expect}=require('@playwright/test');

test.describe('Browser-language autodetection',()=>{
 test.use({locale:'en-US'});
 test('first visit uses the browser language without sending records or starting audio',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.locator('#ajustes > summary').click();
  await expect(page.getByTestId('hear-language')).toHaveValue('en');
  await expect(page.getByTestId('focus-begin')).toContainText('Start my test');
  await expect(page.locator('[data-hear-language-note]')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-language:v1'))).toBe(null);
  await page.getByTestId('focus-begin').click();
  await expect(page.getByTestId('focus-ready')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe(null);
  expect(errors).toEqual([]);
 });
});

test('all eight supported languages remain selectable without rewriting historic data',async({page})=>{
 await page.goto('/');
 await page.locator('#ajustes > summary').click();
 const languages=[
  ['es','Encuentra tu sonido.','Comenzar mi prueba'],
  ['en','Find your sound.','Start my test'],
  ['fr','Trouvez votre son.','Commencer mon test'],
  ['pt','Encontre seu som.','Começar meu teste'],
  ['it','Trova il tuo suono.','Inizia il mio test'],
  ['de','Finde deinen Klang.','Meinen Test starten'],
  ['zh','找到适合你的声音。','开始我的测试'],
  ['ja','自分に合う音を見つけよう。','テストを始める'],
 ];
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','KEEP_HISTORIC'));
 for(const [language,title,cta] of languages){
  await page.getByTestId('hear-language').selectOption(language);
  await expect(page.locator('html')).toHaveAttribute('lang',language==='zh'?'zh-Hans':language);
  await expect(page.getByRole('heading',{level:1})).toHaveText(title);
  await expect(page.getByTestId('focus-begin')).toContainText(cta);
  expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-language:v1'))).toBe(language);
 }
 await page.goto('/hear3-eq-editor/');
 await expect(page.getByTestId('hear-language')).toHaveValue('ja');
 await expect(page.getByRole('heading',{name:'マイイコライザー'})).toBeVisible();
 await page.locator('.app-nav-more > summary').click();
 await page.getByRole('link',{name:'履歴',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-library\/$/);
 await expect(page.getByRole('heading',{name:'結果と履歴'})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('KEEP_HISTORIC');
});

test('changing the language while viewing the exam re-renders the safe action only',async({page})=>{
 await page.goto('/hear3-exam/');
 await expect(page.getByTestId('hear-console-action')).toHaveText('Comenzar mi prueba');
 await page.getByTestId('hear-language').selectOption('de');
 await expect(page.getByTestId('hear-console-action')).toHaveText('Meinen Test starten');
 await expect(page.getByTestId('hear-console-heard')).toHaveText('Ich höre ihn');
 await expect(page.getByTestId('hear-console-not')).toHaveText('Ich höre ihn nicht');
 await expect(page.getByTestId('hear-console-prompt')).toContainText('Wähle dein Gerät');
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).toBe(null);
 await page.reload();
 await expect(page.getByTestId('hear-console-action')).toHaveText('Meinen Test starten');
});
