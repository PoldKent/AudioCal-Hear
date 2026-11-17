const {test,expect}=require('@playwright/test');
const V3='/hear3-preview/';
const V2='/hear2/';

test('official entry defaults to Hear 3 beta, without claiming acoustic certification',async({page})=>{
 await page.goto('/');
 await expect(page).toHaveURL(/\/hear3-preview\/$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('La próxima forma de');
 await expect(page.getByText('Es una vista previa experimental')).toBeVisible();
 await expect(page.getByRole('link',{name:'Comenzar examen experimental'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Abrir Hear 2.0 anterior'}).first())
  .toHaveAttribute('href','../hear2/');
 // Navigating to beta must never start audio or infer user consent.
 expect(await page.evaluate(()=>Boolean(window.hear3IntegratedPilot))).toBe(false);
 await page.goto('/hear2/');
 await expect(page.locator('#root')).toHaveAttribute('data-page','setup');
});

test('existing real Hear 2 browser profiles survive the primary Hear 3 switch and explicit rollback',async({page})=>{
 test.setTimeout(60000);
 await page.goto(V2);
 await page.locator('[data-device="headphones"]').click();
 await page.locator('#deviceName').fill('Perfil original preservado');
 await page.locator('[data-act="create"]').click();
 await expect(page.locator('#root')).toHaveAttribute('data-page','test');
 const history=await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'));
 expect(JSON.parse(history).length).toBe(1);
 await page.goto('/');
 await expect(page).toHaveURL(/\/hear3-preview\/$/);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe(history);
 await page.getByRole('link',{name:'Abrir Hear 2.0 anterior'}).first().click();
 await expect(page).toHaveURL(/\/hear2\/$/);
 await page.locator('[data-nav="profiles"]').click();
 await expect(page.locator('.profile-focus .profile-title'))
  .toContainText('Perfil original preservado');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe(history);
 // A return to beta remains available from the standalone Hear 2 bundle.
 await page.getByRole('link',{name:/Ver vista previa/}).click();
 await expect(page).toHaveURL(/\/hear3-preview\/$/);
});

test('Hear 3 does not silently create or replace legacy records during a fresh visit',async({page})=>{
 await page.goto(V2);
 await page.evaluate(()=>localStorage.removeItem('audiocal-hear-profiles-v1'));
 await page.goto('/');
 await expect(page).toHaveURL(/\/hear3-preview\/$/);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe(null);
 await expect(page.locator('audio')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=
  document.documentElement.clientWidth+2)).toBe(true);
});
