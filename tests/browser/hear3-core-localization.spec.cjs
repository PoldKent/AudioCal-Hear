const {test,expect}=require('@playwright/test');

test.describe('Browser-language autodetection',()=>{
 test.use({locale:'en-US'});
 test('first visit uses the browser language without sending records or starting audio',async({page})=>{
  let errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByTestId('hear-language')).toHaveValue('en');
  await expect(page.getByTestId('begin-exam')).toHaveText('Start test');
  await expect(page.locator('[data-hear-language-note]')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-language:v1'))).toBe(null);
  await page.getByTestId('begin-exam').click();
  await expect(page).toHaveURL(/\/hear3-exam\/$/);
  await expect(page.getByTestId('hear-language')).toHaveValue('en');
  await expect(page.getByTestId('hear-console-action')).toHaveText('Start sweep');
  await expect(page.getByTestId('hear-console-prompt')).toContainText('Confirm your device bands');
  await expect(page.getByTestId('hear-console-heard')).toHaveText('I can hear it');
  expect(await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).toBe(null);
  expect(errors).toEqual([]);
 });
});

test('choosing any of eight languages keeps one app and does not change saved results',async({page})=>{
 await page.goto('/');
 const languages=[
  ['es','Escucha. Ajusta. Disfruta.','Comenzar examen'],
  ['en','Listen. Adjust. Enjoy.','Start test'],
  ['fr','Écoutez. Ajustez. Profitez.','Commencer le test'],
  ['pt','Ouça. Ajuste. Aproveite.','Iniciar teste'],
  ['it','Ascolta. Regola. Goditi.','Inizia il test'],
  ['de','Hören. Anpassen. Genießen.','Test starten'],
  ['zh','聆听。调整。享受。','开始测试'],
  ['ja','聴く。調整する。楽しむ。','テストを開始'],
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
 await expect(page.getByTestId('hear-console-action')).toHaveText('スイープ開始');
 await expect(page.getByTestId('hear-console-heard')).toHaveText('聞こえる');
 await page.getByRole('link',{name:'マイイコライザー',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-eq-editor\/$/);
 await expect(page.getByTestId('hear-language')).toHaveValue('ja');
 await expect(page.getByRole('heading',{name:'マイイコライザー'})).toBeVisible();
 await page.getByRole('link',{name:'履歴',exact:true}).click();
 await expect(page).toHaveURL(/\/hear3-library\/$/);
 await expect(page.getByRole('heading',{name:'結果と履歴'})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('KEEP_HISTORIC');
});

test('changing the language while viewing the exam re-renders the safe action only',async({page})=>{
 await page.goto('/hear3-exam/');
 await expect(page.getByTestId('hear-console-action')).toHaveText('Iniciar exploración');
 await page.getByTestId('hear-language').selectOption('de');
 await expect(page.getByTestId('hear-console-action')).toHaveText('Frequenzlauf starten');
 await expect(page.getByTestId('hear-console-heard')).toHaveText('Ich höre ihn');
 await expect(page.getByTestId('hear-console-not')).toHaveText('Ich höre ihn nicht');
 await expect(page.getByTestId('hear-console-prompt')).toContainText('Prüfe die Frequenzbänder');
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).toBe(null);
 await page.reload();
 await expect(page.getByTestId('hear-console-action')).toHaveText('Frequenzlauf starten');
});
