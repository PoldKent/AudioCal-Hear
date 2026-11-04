const { test, expect } = require('@playwright/test');

const PILOT = '/tests/fixtures/hear3-sweep-pilot.html';

async function fakeAudio(page) {
  await page.addInitScript(() => {
    const calls = [], nodes = [];
    window.__sweepFake = { calls, nodes, ctx: null };
    class FakeAudioContext {
      constructor() {
        this.state = 'running';
        this.currentTime = 10;
        this.sampleRate = 48000;
        this.destination = {};
        window.__sweepFake.ctx = this;
        this.listeners = new Map();
      }
      addEventListener(name, fn) { this.listeners.set(name, fn); }
      removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); }
      createOscillator() {
        const node = {
          frequency: {
            setValueAtTime: (...args) => calls.push(['freq-start', ...args]),
            exponentialRampToValueAtTime: (...args) => calls.push(['freq-end', ...args]),
          },
          connect: () => calls.push(['osc.connect']),
          disconnect: () => calls.push(['osc.disconnect']),
          start: at => calls.push(['osc.start', at]),
          stop: at => calls.push(['osc.stop', at]),
          type: 'sine',
          onended: null,
        };
        nodes.push(node);
        return node;
      }
      createGain() {
        return {
          gain: {
            cancelScheduledValues: at => calls.push(['cancel', at]),
            setValueAtTime: (...args) => calls.push(['gain', ...args]),
            linearRampToValueAtTime: (...args) => calls.push(['gain-ramp', ...args]),
          },
          connect: () => calls.push(['gain.connect']),
          disconnect: () => calls.push(['gain.disconnect']),
        };
      }
      async resume() { this.state = 'running'; }
      async close() { this.state = 'closed'; }
    }
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
  });
}

test('Hear 3 sweep pilot never starts automatically; time-sampled reports are informational only', async ({ page }) => {
  await fakeAudio(page);
  await page.goto(PILOT);
  await expect(page.getByTestId('status')).toHaveText('Listo para comenzar');
  expect(await page.evaluate(() => window.__sweepFake.nodes.length)).toBe(0);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo barrido');
  await expect(page.getByTestId('heard')).toBeEnabled();
  const before = await page.evaluate(() => window.__sweepFake.calls);
  expect(before.some(x => x[0] === 'freq-start' && x[1] === 125)).toBeTruthy();
  expect(before.some(x => x[0] === 'freq-end' && x[1] === 2000)).toBeTruthy();

  await page.evaluate(() => { window.__sweepFake.ctx.currentTime = 15.02; });
  await page.getByTestId('heard').click();
  await page.evaluate(() => { window.__sweepFake.ctx.currentTime = 18.02; });
  await page.getByTestId('not-heard').click();
  await expect(page.getByTestId('report-count')).toHaveText('Respuestas del barrido: 2');
  await page.getByTestId('stop').click();
  await expect(page.getByTestId('status')).toHaveText('Barrido interrumpido');
  const saved = await page.evaluate(() => window.hear3SweepPilot.lastResult());
  expect(saved.status).toBe('interrupted');
  expect(saved.reports).toHaveLength(2);
  expect(saved.thresholdInferences).toBe(0);
  expect(saved.reports[0].source).toBe('user-report-during-sweep');
  const calls = await page.evaluate(() => window.__sweepFake.calls);
  expect(calls.some(x => x[0] === 'gain' && x[1] === 0)).toBeTruthy();
});

test('browser visibility interruption preserves partial reports without resuming', async ({ page }) => {
  await fakeAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo barrido');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable:true, get:()=>true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('status')).toHaveText('Barrido interrumpido');
  expect((await page.evaluate(() => window.hear3SweepPilot.lastResult())).reason).toBe('hidden');
  expect((await page.evaluate(() => window.hear3SweepPilot.lastResult())).reports).toHaveLength(0);
});

test('sweep end is not a detection threshold and does not demand a second test', async ({ page }) => {
  await fakeAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo barrido');
  await page.evaluate(() => window.__sweepFake.nodes.at(-1).onended?.());
  await expect(page.getByTestId('status')).toHaveText('Barrido terminado');
  const data = await page.evaluate(() => window.hear3SweepPilot.lastResult());
  expect(data.status).toBe('completed');
  expect(data.thresholdInferences).toBe(0);
  await expect(page.getByTestId('heard')).toBeDisabled();
});

test('local-only pilot serves allowlisted modules without exposing package metadata', async ({ request }) => {
  const page = await request.get(PILOT);
  expect(page.status()).toBe(200);
  for(const route of ['/src/hear3/sweep-planner.mjs', '/src/hear3/sweep-audio-runner.mjs']) {
    const moduleResponse = await request.get(route);
    expect(moduleResponse.status()).toBe(200);
    expect(moduleResponse.headers()['content-type']).toContain('text/javascript');
  }
  expect((await request.get('/package.json')).status()).toBe(404);
});

test('real browser Web Audio can be started and stopped explicitly in Chromium', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Browser smoke test uses Chromium, mock tests also cover WebKit.');
  await page.goto(PILOT);
  await expect(page.getByTestId('status')).toHaveText('Listo para comenzar');
  const available = await page.evaluate(() => Boolean(window.AudioContext || window.webkitAudioContext));
  test.skip(!available, 'Browser does not provide AudioContext.');
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo barrido', {timeout:5000});
  await page.getByTestId('stop').click();
  await expect(page.getByTestId('status')).toHaveText('Barrido interrumpido');
  expect((await page.evaluate(() => window.hear3SweepPilot.lastResult())).thresholdInferences).toBe(0);
});


test('P0 browser suspension immediately interrupts and rejects further perception reports', async ({ page }) => {
  await fakeAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo barrido');
  await page.evaluate(() => {
    const ctx = window.__sweepFake.ctx;
    ctx.currentTime = 13.02;
    ctx.state = 'suspended';
    ctx.listeners.get('statechange')?.();
  });
  await expect(page.getByTestId('status')).toHaveText('Barrido interrumpido');
  await expect(page.getByTestId('heard')).toBeDisabled();
  const data = await page.evaluate(() => window.hear3SweepPilot.lastResult());
  expect(data.status).toBe('interrupted');
  expect(data.reason).toBe('context-suspended');
  expect(data.reports).toHaveLength(0);
  const calls = await page.evaluate(() => window.__sweepFake.calls);
  expect(calls.some(c => c[0] === 'osc.stop' && c[1] === 13.02)).toBeTruthy();
});
