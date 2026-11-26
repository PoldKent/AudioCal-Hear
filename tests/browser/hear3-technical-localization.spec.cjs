const {test,expect}=require('@playwright/test');
test.use({locale:'en-US'});
test('localized privacy keeps deletion explicit and leaves unrelated storage intact',async({page})=>{
 await page.goto('/hear3-privacy/');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Privacy and data');
 await expect(page.locator('.warning')).toContainText('irreversible');
 await page.evaluate(()=>{
  localStorage.setItem('hear3:focus-equipment:v1','PRIVATE');
  sessionStorage.setItem('hear3:focus-loudness:v1','PRIVATE');
  localStorage.setItem('hear3:ui-theme:v1','dark');
  localStorage.setItem('other-app','KEEP');
 });
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('total-count')).toHaveText('2');
 await expect(page.getByTestId('required-phrase')).toHaveText('BORRAR V3');
 await page.getByTestId('hear-language').selectOption('fr');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Confidentialité et données');
 await expect(page.getByTestId('required-phrase')).toHaveText('BORRAR V3');
 await page.getByTestId('confirm-phrase').fill('BORRAR V3');
 const dismissed=page.waitForEvent('dialog').then(async d=>{
  expect(d.message()).toContain('Supprimer uniquement');
  await d.dismiss();
 });
 await page.getByTestId('commit').click();
 await dismissed;
 expect(await page.evaluate(()=>sessionStorage.getItem('hear3:focus-loudness:v1'))).toBe('PRIVATE');
 const accepted=page.waitForEvent('dialog').then(d=>d.accept());
 await page.getByTestId('commit').click();
 await accepted;
 await expect(page.getByTestId('action-status')).toContainText('Suppression de 2');
 expect(await page.evaluate(()=>sessionStorage.getItem('hear3:focus-loudness:v1'))).toBeNull();
 expect(await page.evaluate(()=>localStorage.getItem('hear3:focus-equipment:v1'))).toBeNull();
 expect(await page.evaluate(()=>localStorage.getItem('other-app'))).toBe('KEEP');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:ui-theme:v1'))).toBe('dark');
});
test('diagnostic localization does not mutate the preview or issue code',async({page})=>{
 await page.goto('/hear3-diagnostics/');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Technical diagnostics');
 await page.getByTestId('issue-code').selectOption('audio-interrupted');
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('status')).toContainText('Local preview ready');
 const before=await page.getByTestId('report').inputValue();
 await page.getByTestId('hear-language').selectOption('ja');
 await expect(page.getByTestId('status')).toContainText('ローカルプレビュー');
 await expect(page.getByTestId('report')).toHaveValue(before);
 await expect(page.getByTestId('issue-code')).toHaveValue('audio-interrupted');
 await expect(page.getByTestId('download')).toBeDisabled();
});
test('photo controls and alternate text are localized without opening a file',async({page})=>{
 await page.goto('/hear3-photo-privacy/');
 await expect(page.getByRole('heading',{level:1})).toContainText('Private equalizer image');
 await expect(page.getByTestId('preview')).toHaveAttribute('alt',/Locally re-encoded PNG/);
 await expect(page.getByTestId('download')).toBeDisabled();
 await page.locator('[data-hear-language]').selectOption('de');
 await expect(page.getByTestId('inspect')).toHaveText('Lokal ohne Upload verarbeiten');
 await expect(page.getByTestId('preview')).toBeHidden();
 expect(await page.evaluate(()=>window.hear3PhotoPilot.summary())).toBeNull();
});