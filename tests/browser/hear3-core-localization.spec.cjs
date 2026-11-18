const {test,expect}=require('@playwright/test');

test.describe('Browser-language autodetection',()=>{
 test.use({locale:'en-US'});
 test('first visit uses the browser language without sending records or starting audio',async({page})=>{
  let errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByTestId('hear-language')).toHaveValue('en');
  await expect(page.getByTestId('begin-exam')).toHaveText('Start my test');
  await expect(page.locator('[data-hear-language-note]')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-language:v1'))).toBe(null);
  await page.getByTestId('begin-exam').click();
  await expect(page).toHaveURL(/\/hear3-exam\/$/);
  await expect(page.getByTestId('hear-language')).toHaveValue('en');
  await expect(page.getByTestId('hear-console-action')).toHaveText('Start my test');
  await expect(page.getByTestId('hear-console-prompt')).toContainText('Choose your device');
  await expect(page.getByTestId('hear-console-heard')).toHaveText('I can hear it');
  expect(await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).toBe(null);
  expect(errors).toEqual([]);
 });
});

test('choosing any of eight languages keeps one app and does not change saved results',async({page})=>{
 await page.goto('/');
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
  await expect(page.locator('#inicio-titulo')).toHaveText(title);
  await expect(page.getByTestId('begin-exam')).toHaveText(cta);
  expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-language:v1'))).toBe(language);
 }
 await page.getByTestId('begin-exam').click();
 await expect(page).toHaveURL(/\/hear3-exam\/$/);
 await expect(page.getByTestId('hear-language')).toHaveValue('ja');
 await expect(page.getByTestId('hear-console-action')).toHaveText('テストを始める');
 await expect(page.getByTestId('hear-console-heard')).toHaveText('聞こえる');
 await page.getByRole('link',{name:'マイイコライザー',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-eq-editor\/$/);
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
