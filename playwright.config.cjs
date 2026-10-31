const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.cjs',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4177',
    actionTimeout: 12000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    acceptDownloads: true
  },
  projects: [
    { name: 'android-9x21-chromium', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 840 } } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'desktop-4x3', use: { browserName: 'chromium', viewport: { width: 1024, height: 768 } } },
    { name: 'desktop-21x9', use: { browserName: 'chromium', viewport: { width: 2560, height: 1080 } } }
  ],
  webServer: {
    command: 'node tools/serve.mjs',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
