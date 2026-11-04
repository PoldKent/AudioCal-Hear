const { test, expect } = require('@playwright/test');

const PILOT = '/tests/fixtures/hear3-audio-pilot.html';

async function installDeterministicWebAudio(page) {
  await page.addInitScript(() => {
    const calls = [];
    const nodes = [];
    window.__hear3FakeAudio = { calls, nodes };
    class FakeAudioContext {
      constructor() {
        this.state = 'running';
        this.sampleRate = 48000;
        this.currentTime = 10;
        this.destination = {};
      }
      createOscillator() {
        const node = {
          frequency: { setValueAtTime: (...args) => calls.push(['frequency', ...args]) },
          connect: () => calls.push(['osc.connect']),
          disconnect: () => calls.push(['osc.disconnect']),
          start: at => calls.push(['start', at]),
          stop: at => calls.push(['stop', at]),
          onended: null,
          type: 'sine',
        };
        nodes.push(node);
        return node;
      }
      createGain() {
        return {
          gain: {
            cancelScheduledValues: at => calls.push(['cancel', at]),
            setValueAtTime: (...args) => calls.push(['gain', ...args]),
            linearRampToValueAtTime: (...args) => calls.push(['ramp', ...args]),
          },
          connect: () => {},
          disconnect: () => {},
        };
      }
      createStereoPanner() {
        return {
          pan: { setValueAtTime: (...args) => calls.push(['pan', ...args]) },
          connect: () => {},
          disconnect: () => {},
        };
      }
      async resume() { this.state = 'running'; }
      async close() { this.state = 'closed'; }
    }
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
  });
}

test('Hear 3 pilot never autoplays and a response stops the active tone', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  expect(await page.evaluate(() => window.__hear3FakeAudio.nodes.length)).toBe(0);
  await expect(page.getByTestId('heard')).toBeDisabled();
  await page.getByTestId('start').click();
  await expect(page.getByTestId('heard')).toBeEnabled();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo tono');
  await page.getByTestId('heard').click();
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  await expect(page.getByTestId('observations')).toHaveText('Respuestas registradas: 1');
  const state = await page.evaluate(() => window.hear3Pilot.snapshot());
  expect(state.observations[0].response).toBe('heard');
  expect(state.currentTone).toBeNull();
  const calls = await page.evaluate(() => window.__hear3FakeAudio.calls);
  expect(calls.some(x => x[0] === 'stop' && x[1] === 10)).toBeTruthy();
  expect(calls.some(x => x[0] === 'gain' && x[1] === 0)).toBeTruthy();
});

test('route changes pause and require explicit confirmation and manual resume', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('pause')).toBeEnabled();
  await page.getByTestId('route').click();
  await expect(page.getByTestId('status')).toContainText('Pausado');
  await expect(page.getByTestId('resume')).toBeDisabled();
  await expect(page.getByTestId('start')).toBeDisabled();
  await page.getByTestId('confirm').click();
  await expect(page.getByTestId('resume')).toBeEnabled();
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  expect(await page.evaluate(() => window.__hear3FakeAudio.nodes.length)).toBe(1);
  expect((await page.evaluate(() => window.hear3Pilot.snapshot())).observations).toHaveLength(0);
});

test('a finished tone without a response remains inconclusive', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo tono');
  await page.evaluate(() => window.__hear3FakeAudio.nodes.at(-1).onended?.());
  await expect(page.getByTestId('status')).toContainText('Pausado');
  const state = await page.evaluate(() => window.hear3Pilot.snapshot());
  expect(state.observations).toHaveLength(0);
  expect(state.invalidatedToneIds).toHaveLength(1);
  await expect(page.getByTestId('heard')).toBeDisabled();
});

test('visibility loss silences and pauses, without auto-resuming', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo tono');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('status')).toContainText('Pausado');
  expect((await page.evaluate(() => window.hear3Pilot.snapshot())).observations).toHaveLength(0);
});

test('local server serves only pilot and approved Hear 3 modules', async ({ request }) => {
  const page = await request.get(PILOT);
  expect(page.status()).toBe(200);
  expect(page.headers()['content-type']).toContain('text/html');
  const moduleResponse = await request.get('/src/hear3/web-audio-adapter.mjs');
  expect(moduleResponse.status()).toBe(200);
  expect(moduleResponse.headers()['content-type']).toContain('text/javascript');
  const forbidden = await request.get('/package.json');
  expect(forbidden.status()).toBe(404);
  const traversal = await request.get('/src/hear3/../../package.json');
  expect(traversal.status()).toBe(404);
});

test('pilot can start actual Web Audio in Chromium after a user gesture', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Actual Web Audio browser smoke tested in Chromium; DOM mock tests cover WebKit.');
  await page.goto(PILOT);
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  const available = await page.evaluate(() => Boolean(window.AudioContext || window.webkitAudioContext));
  test.skip(!available, 'AudioContext not available in headless browser environment.');
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo tono', { timeout: 5000 });
  await page.getByTestId('not-heard').click();
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  expect((await page.evaluate(() => window.hear3Pilot.snapshot())).observations).toHaveLength(1);
});
