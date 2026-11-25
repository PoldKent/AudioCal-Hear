const {test,expect}=require('@playwright/test');
test.use({locale:'en-US'});

test('localized equipment and safe volume warning do not start audio',async({page})=>{
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('#category option[value="headphones"]')).toHaveText('Headphones');
 await expect(page.locator('#bands option[value="custom"]')).toHaveText('My frequencies');
 await expect(page.locator('#sweep-progress')).toHaveAttribute('aria-label','Sweep progress');
 await expect(page.locator('#band-progress')).toHaveAttribute('aria-label','Completed frequencies');
 await page.getByTestId('focus-begin').click();
 await page.getByTestId('focus-confirm').click();
 await expect(page.locator('#ready-hint')).toHaveText('Confirm low device volume to continue.');
 await expect(page.getByTestId('focus-volume')).toBeFocused();
 await expect(page.getByTestId('focus-sweep')).toBeHidden();
 await page.locator('#ajustes > summary').click();
 await page.getByTestId('hear-language').selectOption('fr');
 await expect(page.locator('#category option[value="headphones"]')).toHaveText('Casque');
 await expect(page.locator('#band-progress')).toHaveAttribute('aria-label','Fréquences terminées');
 await page.locator('#ajustes > summary').click();
 await page.getByTestId('focus-confirm').click();
 await expect(page.locator('#ready-hint')).toContainText('Confirmez');
 await expect(page.getByTestId('focus-sweep')).toBeHidden();
 expect(errors).toEqual([]);
});
