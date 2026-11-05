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
        this.listeners = new Map();
        window.__hear3FakeAudio.ctx = this;
      }
      addEventListener(name, fn) { this.listeners.set(name, fn); }
      removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); }
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


test('P0 discrete tone cannot record a response after suspension before the browser notifies statechange', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo tono');
  await page.evaluate(() => { window.__hear3FakeAudio.ctx.state = 'suspended'; });
  await page.getByTestId('not-heard').click();
  await expect(page.getByTestId('status')).toContainText('Pausado');
  await expect(page.getByTestId('observations')).toHaveText('Respuestas registradas: 0');
  const data = await page.evaluate(() => window.hear3Pilot.snapshot());
  expect(data.invalidatedToneIds).toHaveLength(1);
  expect(data.routeCheckRequired).toBe(true);
});

test('P0 browser statechange interrupts a discrete tone and requires manual recovery', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo tono');
  await page.evaluate(() => {
    const ctx = window.__hear3FakeAudio.ctx;
    ctx.state = 'suspended';
    ctx.listeners.get('statechange')?.();
  });
  await expect(page.getByTestId('status')).toContainText('Pausado');
  await expect(page.getByTestId('start')).toBeDisabled();
  await expect(page.getByTestId('observations')).toHaveText('Respuestas registradas: 0');
});


test('P0 checkpoint recovery never autoplays after a browser reload', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('heard')).toBeEnabled();
  await page.getByTestId('heard').click();
  await expect(page.getByTestId('persistence')).toContainText('device-local');
  await page.reload();
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  await expect(page.getByTestId('recover')).toBeEnabled();
  await expect(page.getByTestId('recovery')).toContainText('1 respuestas');
  expect(await page.evaluate(() => window.__hear3FakeAudio.nodes.length)).toBe(0);
  await page.getByTestId('recover').click();
  await expect(page.getByTestId('status')).toContainText('Pausado');
  await expect(page.getByTestId('observations')).toHaveText('Respuestas registradas: 1');
  await expect(page.getByTestId('resume')).toBeDisabled();
  await page.getByTestId('confirm').click();
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  expect(await page.evaluate(() => window.__hear3FakeAudio.nodes.length)).toBe(0);
});

test('P0 unreplied active tone is invalidated on reload and cannot become a false answer', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('status')).toHaveText('Reproduciendo tono');
  await page.reload();
  await expect(page.getByTestId('recover')).toBeEnabled();
  await page.getByTestId('recover').click();
  await expect(page.getByTestId('status')).toContainText('Pausado');
  const snapshot = await page.evaluate(() => window.hear3Pilot.snapshot());
  expect(snapshot.observations).toHaveLength(0);
  expect(snapshot.invalidatedToneIds).toHaveLength(1);
  expect(snapshot.currentTone).toBeNull();
  expect(snapshot.routeCheckRequired).toBe(true);
  expect(await page.evaluate(() => window.__hear3FakeAudio.nodes.length)).toBe(0);
});

test('P0 blocked browser storage is honestly shown as volatile and remains exportable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value() { throw new DOMException('Storage blocked', 'QuotaExceededError'); },
    });
  });
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('heard')).toBeEnabled();
  await page.getByTestId('heard').click();
  await expect(page.getByTestId('persistence')).toContainText('volatile');
  await expect(page.getByTestId('persistence')).toContainText('sin persistencia');
  await expect(page.getByTestId('storage-warning')).toContainText('may be lost');
  await expect(page.getByTestId('export')).toBeEnabled();
  const exported = await page.evaluate(() => JSON.parse(window.hear3Pilot.exportedCheckpoint()));
  expect(exported.format).toBe('hear3-exam-checkpoint-v1');
  expect(exported.checkpoint.observations).toHaveLength(1);
  expect(exported.checkpoint.observations[0].response).toBe('heard');
});

test('P0 corrupted checkpoint is visible as damaged but never auto-restored', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.evaluate(() => window.localStorage.setItem(
    'hear3:exam-checkpoint:hear3-browser-pilot:0', 'intentionally corrupted checkpoint',
  ));
  await page.reload();
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  await expect(page.getByTestId('recover')).toBeDisabled();
  await expect(page.getByTestId('storage-warning')).toContainText('damaged');
  expect(await page.evaluate(() => window.__hear3FakeAudio.nodes.length)).toBe(0);
});


test('P0 backup file can be inspected and restored without audio autoplay', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await page.getByTestId('heard').click();
  const exported = await page.evaluate(() => window.hear3Pilot.exportedCheckpoint());
  expect(JSON.parse(exported).integrity.algorithm).toBe('fnv1a32');
  await page.reload();
  page.once('dialog', d => d.accept());
  await page.getByTestId('delete').click();
  await expect(page.getByTestId('recover')).toBeDisabled();
  const nodesBefore = await page.evaluate(() => window.__hear3FakeAudio.nodes.length);
  await page.getByTestId('backup-file').setInputFiles({
    name: 'checkpoint-hear3.json', mimeType: 'application/json', buffer: Buffer.from(exported),
  });
  await page.getByTestId('inspect').click();
  await expect(page.getByTestId('import-preview')).toContainText('Respaldo válido: 1 respuestas');
  await expect(page.getByTestId('import')).toBeEnabled();
  await page.getByTestId('import').click();
  await expect(page.getByTestId('status')).toContainText('Pausado');
  await expect(page.getByTestId('observations')).toHaveText('Respuestas registradas: 1');
  await expect(page.getByTestId('resume')).toBeDisabled();
  expect(await page.evaluate(() => window.__hear3FakeAudio.nodes.length)).toBe(nodesBefore);
});

test('P0 backup replacement requires confirmation and preserves existing until accepted', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await page.getByTestId('not-heard').click();
  const exported = await page.evaluate(() => window.hear3Pilot.exportedCheckpoint());
  await page.reload();
  await page.getByTestId('backup-file').setInputFiles({
    name: 'checkpoint-hear3.json', mimeType: 'application/json', buffer: Buffer.from(exported),
  });
  await page.getByTestId('inspect').click();
  await expect(page.getByTestId('import-preview')).toContainText('reemplazará el checkpoint existente');
  page.once('dialog', d => d.dismiss());
  await page.getByTestId('import').click();
  await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
  await expect(page.getByTestId('import')).toBeEnabled();
  page.once('dialog', d => d.accept());
  await page.getByTestId('import').click();
  await expect(page.getByTestId('status')).toContainText('Pausado');
  await expect(page.getByTestId('observations')).toHaveText('Respuestas registradas: 1');
});

test('P0 damaged backup is rejected before it can overwrite a local checkpoint', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await page.getByTestId('heard').click();
  const damaged = await page.evaluate(() => {
    const data = JSON.parse(window.hear3Pilot.exportedCheckpoint());
    data.checkpoint.observations[0].response = 'not-heard';
    return JSON.stringify(data);
  });
  await page.reload();
  await page.getByTestId('backup-file').setInputFiles({
    name: 'damaged.json', mimeType: 'application/json', buffer: Buffer.from(damaged),
  });
  await page.getByTestId('inspect').click();
  await expect(page.getByTestId('error')).toContainText('checksum mismatch');
  await expect(page.getByTestId('import')).toBeDisabled();
  await expect(page.getByTestId('recover')).toBeEnabled();
  expect((await page.evaluate(() => JSON.parse(window.hear3Pilot.exportedCheckpoint())))
    .checkpoint.observations[0].response).toBe('heard');
});

test('P0 backup import is disabled once an active exam has new activity', async ({ page }) => {
  await installDeterministicWebAudio(page);
  await page.goto(PILOT);
  await page.getByTestId('start').click();
  await page.getByTestId('heard').click();
  await expect(page.getByTestId('inspect')).toBeDisabled();
  await expect(page.getByTestId('import')).toBeDisabled();
  await expect(page.getByTestId('backup-file')).toBeDisabled();
});


test('D-055/D-056 devicechange silences the tone and refuses to resume until route is confirmed',async({page})=>{
 await page.addInitScript(()=>{
  const source=new EventTarget();
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,get:()=>source});
  window.__hear3DeviceEvents=source;
 });
 await installDeterministicWebAudio(page);
 await page.goto(PILOT);
 await page.getByTestId('start').click();
 await expect(page.getByTestId('status')).toHaveText('Reproduciendo tono');
 await page.evaluate(()=>window.__hear3DeviceEvents.dispatchEvent(new Event('devicechange')));
 await expect(page.getByTestId('status')).toContainText('Pausado');
 await expect(page.getByTestId('resume')).toBeDisabled();
 await expect(page.getByTestId('observations')).toHaveText('Respuestas registradas: 0');
 const s=await page.evaluate(()=>window.hear3Pilot.snapshot());
 expect(s.routeCheckRequired).toBe(true);
 expect(s.invalidatedToneIds).toContain('pilot-1');
 await page.getByTestId('confirm').click();
 await expect(page.getByTestId('resume')).toBeEnabled();
 await page.getByTestId('resume').click();
 await expect(page.getByTestId('status')).toHaveText('Listo para reproducir');
 expect(await page.evaluate(()=>window.__hear3FakeAudio.nodes.length)).toBe(1);
});