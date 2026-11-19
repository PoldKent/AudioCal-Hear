const {test,expect}=require('@playwright/test');
const APP='/',INTERNAL_RECOVERY='/hear2/';

test('official website opens the one AudioCal Hear app without any version choice',async({page})=>{
 await page.goto(APP);
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('Encuentra tu sonido.');
 await expect(page.getByTestId('focus-begin')).toBeVisible();
 await expect(page.locator('a[href*="/hear2/"]')).toHaveCount(0);
 await expect(page.locator('a[href*="hear3-preview"]')).toHaveCount(0);
 await expect(page.locator('audio')).toHaveCount(0);
});

test('previous browser profiles survive app upgrade and remain recoverable internally',async({page})=>{
 test.setTimeout(60000);
 await page.goto(INTERNAL_RECOVERY);
 await page.locator('[data-device="headphones"]').click();
 await page.locator('#deviceName').fill('Perfil original preservado');
 await page.locator('[data-act="create"]').click();
 await expect(page.locator('#root')).toHaveAttribute('data-page','test');
 const history=await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'));
 expect(JSON.parse(history).length).toBe(1);
 await page.goto(APP);
 await expect(page).toHaveURL(/\/$/);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe(history);
 // Recovery bundle is an emergency technical endpoint, not a public selection screen.
 await page.goto(INTERNAL_RECOVERY);
 await page.locator('[data-nav="profiles"]').click();
 await expect(page.locator('.profile-focus .profile-title'))
  .toContainText('Perfil original preservado');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe(history);
 await page.goto(APP);
 await expect(page.locator('a[href*="/hear2/"]')).toHaveCount(0);
});

test('opening the single app does not silently create or rewrite older records',async({page})=>{
 await page.goto(INTERNAL_RECOVERY);
 await page.evaluate(()=>localStorage.removeItem('audiocal-hear-profiles-v1'));
 await page.goto(APP);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe(null);
 await expect(page.locator('audio')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=
  document.documentElement.clientWidth+2)).toBe(true);
});
