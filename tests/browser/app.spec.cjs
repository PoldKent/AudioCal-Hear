const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

async function fresh(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
async function newProfile(page, name = 'Auriculares QA') {
  await page.locator('[data-device="headphones"]').click();
  await page.locator('#deviceName').fill(name);
  await page.locator('[data-act="create"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'test');
}
async function passPreparation(page) {
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-act="introNext"]').click();
  }
  await expect(page.locator('#levelText')).toContainText('-36 dBFS');
}
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 2);
}

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test('device choices and duration stay responsive', async ({ page }) => {
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'setup');
  await expect(page.locator('[data-device="car"]')).toBeVisible();
  await page.locator('[data-device="headphones"]').click();
  await expect(page.locator('[data-preset="photo10"]')).toHaveClass(/selected/);
  await page.locator('[data-testmode="complete"]').click();
  await expect(page.locator('#setupTrials')).toContainText('20');
  await page.locator('[data-device="car"]').click();
  await expect(page.locator('[data-preset="car7"]')).toHaveClass(/selected/);
  await expect(page.locator('#setupTrials')).toContainText('7');
  await noOverflow(page);
});

test('all eight languages preserve navigation and small-screen layout', async ({ page }) => {
  const selector = page.locator('#uiLanguage');
  for (const locale of ['es','en','fr','pt','it','de','zh','ja']) {
    await selector.selectOption(locale);
    await expect(selector).toHaveValue(locale);
    await expect(page.locator('[data-device="headphones"]')).toBeVisible();
    await noOverflow(page);
  }
  await page.locator('[data-nav="profiles"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'profiles');
  await noOverflow(page);
  await page.locator('[data-nav="setup"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'setup');
});

test('profile creation and local persistence survive reload', async ({ page }) => {
  const profileName = 'Auriculares QA';
  await newProfile(page, profileName);
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'test');
  await page.reload();
  await page.locator('[data-nav="profiles"]').click();
  await expect(page.locator('.profile-focus .profile-title')).toHaveText(profileName);
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1')));
  expect(records).toHaveLength(1);
  expect(records[0].preset).toBe('photo10');
  expect(records[0].channels).toBe('separate');
  expect(records[0].testStart).toBe(-36);
  expect(records[0].testFloor).toBe(-84);
  await noOverflow(page);
});

test('guided test exposes explicit heard and not-heard responses', async ({ page }) => {
  await newProfile(page);
  await passPreparation(page);
  await page.locator('[data-act="play"]').click();
  await expect(page.locator('[data-act="answerYes"]')).toBeVisible();
  await expect(page.locator('[data-act="answerNo"]')).toBeVisible();
  await page.locator('[data-act="answerYes"]').click();
  await expect(page.locator('#levelText')).toContainText('-48 dBFS');
  await page.locator('[data-act="play"]').click();
  await page.locator('[data-act="answerNo"]').click();
  await expect(page.locator('#levelText')).toContainText('-42 dBFS');
  await page.locator('[data-act="stopaudio"]').click();
  await noOverflow(page);
});

test('EQ editor updates saved profile and JSON export is valid', async ({ page }) => {
  await newProfile(page);
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page','results');
  await expect(page.locator('#audioPlayer')).toBeVisible();
  await page.locator('[data-eq-select]').first().click();
  const slider = page.locator('#eqSlider');
  await expect(slider).toBeVisible();
  await page.locator('#eqEditor [data-delta="1"]').click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
  expect(Object.values(stored.manual || {}).some(x => x !== 0)).toBeTruthy();
  await page.locator('[data-nav="profiles"]').click();
  const downloadWait = page.waitForEvent('download');
  const backup = page.locator('details').filter({ has: page.locator('[data-act="exportall"]') });
  await backup.locator('summary').click();
  await page.locator('[data-act="exportall"]').click();
  const download = await downloadWait;
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(exported.app).toBe('AudioCal Hear');
  expect(exported.profiles).toHaveLength(1);
  await noOverflow(page);
});

test('optional microphone is not requested by default', async ({ page }) => {
  await page.addInitScript(() => {
    window.__micRequests = 0;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (...args) => {
        window.__micRequests++;
        return original(...args);
      };
    }
  });
  await page.reload();
  await newProfile(page);
  await passPreparation(page);
  expect(await page.evaluate(() => window.__micRequests)).toBe(0);
});
