const {test,expect}=require('@playwright/test');
const PRIVACY='/hear3-privacy/';

async function seed(page){
 await page.goto(PRIVACY);
 await page.evaluate(()=>{
  localStorage.setItem('audiocal-hear-profiles-v1','KEEP_V2_PROFILES');
  localStorage.setItem('audiocal-hear-active-v1','KEEP_V2_ACTIVE');
  localStorage.setItem('audiocal-language-v1','es');
  localStorage.setItem('hear3:catalog:v1:0','V3-CATALOG');
  localStorage.setItem('hear3:adaptive-progress:test-profile:1','V3-EXAM');
  localStorage.setItem('unrelated-origin-key','OTHER APP');
  sessionStorage.setItem('hear3:exam-checkpoint:test-profile:0','OLD SESSION');
  sessionStorage.setItem('unrelated-session-key','OTHER APP SESSION');
 });
}
test('P0 visiting privacy page never deletes storage and preview is read-only',async({page})=>{
 await seed(page);
 await expect(page.getByTestId('commit')).toBeDisabled();
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('local-count')).toHaveText('2');
 await expect(page.getByTestId('tab-count')).toHaveText('1');
 await expect(page.getByTestId('total-count')).toHaveText('3');
 await expect(page.getByTestId('required-phrase')).toHaveText('BORRAR V3');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('KEEP_V2_PROFILES');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:catalog:v1:0')))
  .toBe('V3-CATALOG');
});
test('P0 V3-only deletion needs an exact phrase and browser confirmation',async({page})=>{
 await seed(page);
 await page.getByTestId('inspect').click();
 await page.getByTestId('confirm-phrase').fill('incorrect');
 await expect(page.getByTestId('commit')).toBeDisabled();
 await page.getByTestId('confirm-phrase').fill('BORRAR V3');
 await expect(page.getByTestId('commit')).toBeEnabled();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByTestId('commit').click();
 expect(await page.evaluate(()=>localStorage.getItem('hear3:catalog:v1:0'))).toBe('V3-CATALOG');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('commit').click();
 await expect(page.getByTestId('action-status')).toContainText('Se verificó la eliminación de 3 claves');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:catalog:v1:0'))).toBe(null);
 expect(await page.evaluate(()=>localStorage.getItem('hear3:adaptive-progress:test-profile:1'))).toBe(null);
 expect(await page.evaluate(()=>sessionStorage.getItem('hear3:exam-checkpoint:test-profile:0'))).toBe(null);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('KEEP_V2_PROFILES');
 expect(await page.evaluate(()=>localStorage.getItem('unrelated-origin-key')))
  .toBe('OTHER APP');
});
test('P0 all-Hear cleanup includes V2 but keeps all unrelated keys',async({page})=>{
 await seed(page);
 await page.getByTestId('scope').selectOption('all-hear');
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('local-count')).toHaveText('5');
 await expect(page.getByTestId('tab-count')).toHaveText('1');
 await expect(page.getByTestId('required-phrase')).toHaveText('BORRAR DATOS HEAR');
 await page.getByTestId('confirm-phrase').fill('BORRAR DATOS HEAR');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('commit').click();
 await expect(page.getByTestId('action-status')).toContainText('Se verificó la eliminación de 6 claves');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe(null);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-active-v1'))).toBe(null);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-language-v1'))).toBe(null);
 expect(await page.evaluate(()=>localStorage.getItem('unrelated-origin-key'))).toBe('OTHER APP');
 expect(await page.evaluate(()=>sessionStorage.getItem('unrelated-session-key'))).toBe('OTHER APP SESSION');
});
test('P0 new V3 data after inspection stops stale deletion and preserves all data',async({page})=>{
 await seed(page);
 await page.getByTestId('inspect').click();
 await page.evaluate(()=>localStorage.setItem('hear3:adaptive-progress:new-profile:0','NEW'));
 await page.getByTestId('confirm-phrase').fill('BORRAR V3');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByTestId('commit').click();
 await expect(page.getByTestId('action-status')).toContainText('changed since preview');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:catalog:v1:0'))).toBe('V3-CATALOG');
 expect(await page.evaluate(()=>localStorage.getItem('hear3:adaptive-progress:new-profile:0'))).toBe('NEW');
});
test('P0 scope change invalidates the previous deletion confirmation',async({page})=>{
 await seed(page);
 await page.getByTestId('inspect').click();
 await page.getByTestId('confirm-phrase').fill('BORRAR V3');
 await expect(page.getByTestId('commit')).toBeEnabled();
 await page.getByTestId('scope').selectOption('all-hear');
 await expect(page.getByTestId('commit')).toBeDisabled();
 await expect(page.getByTestId('required-phrase')).toHaveText('—');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('KEEP_V2_PROFILES');
});
