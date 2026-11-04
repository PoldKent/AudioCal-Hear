import test from 'node:test';
import assert from 'node:assert/strict';
import { createSweepPlan } from '../src/hear3/sweep-planner.mjs';
import { createWebAudioSweepSession, SWEEP_DIGITAL_CEILING_DBFS } from '../src/hear3/web-audio-sweep.mjs';

function fakeContext({ suspended = false, sampleRate = 48000, failGain = false } = {}) {
  const calls = [];
  const oscillators = [];
  const listeners = new Map();
  let resolveResume;
  const context = {
    state: suspended ? 'suspended' : 'running',
    sampleRate,
    currentTime: 10,
    destination: {},
    addEventListener: (kind, callback) => listeners.set(kind, callback),
    removeEventListener: (kind, callback) => { if (listeners.get(kind) === callback) listeners.delete(kind); },
    createOscillator() {
      const node = {
        onended: null,
        type: null,
        frequency: {
          setValueAtTime: (...args) => calls.push(['frequency.set', ...args]),
          exponentialRampToValueAtTime: (...args) => calls.push(['frequency.ramp', ...args]),
        },
        connect: () => calls.push(['osc.connect']),
        disconnect: () => calls.push(['osc.disconnect']),
        start: at => calls.push(['osc.start', at]),
        stop: at => calls.push(['osc.stop', at]),
      };
      oscillators.push(node);
      return node;
    },
    createGain() {
      if (failGain) throw new Error('gain factory failure');
      return {
        gain: {
          setValueAtTime: (...args) => calls.push(['gain.set', ...args]),
          linearRampToValueAtTime: (...args) => calls.push(['gain.ramp', ...args]),
          cancelScheduledValues: (...args) => calls.push(['gain.cancel', ...args]),
        },
        connect: () => calls.push(['gain.connect']),
        disconnect: () => calls.push(['gain.disconnect']),
      };
    },
    async resume() {
      if (!suspended) return;
      return new Promise(resolve => {
        resolveResume = () => { this.state = 'running'; resolve(); };
      });
    },
    async close() { this.state = 'closed'; calls.push(['close']); },
  };
  return { context, calls, oscillators, listeners, resume: () => resolveResume?.() };
}

const plan = () => createSweepPlan({ minHz: 100, maxHz: 6400, durationSeconds: 60 });
const request = (overrides = {}) => ({
  plan: plan(),
  digitalLevelDbfs: -55,
  authorizedDigitalRangeDbfs: { minDbfs: -85, maxDbfs: -45 },
  userInitiated: true,
  ...overrides,
});

test('P0 sweep starts only from a user action and schedules an exact bounded log ramp', async () => {
  const f = fakeContext();
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await assert.rejects(sweep.start(request({ userInitiated: false })), /explicit user action/);
  assert.equal(f.oscillators.length, 0);
  assert.deepEqual(await sweep.start(request()), { started: true, durationSeconds: 60 });
  const freq = f.calls.filter(c => c[0].startsWith('frequency.'));
  assert.deepEqual(freq, [['frequency.set', 100, 10.01], ['frequency.ramp', 6400, 70.01]]);
  const gain = f.calls.filter(c => c[0] === 'gain.ramp');
  assert.equal(gain.length, 2);
  assert.ok(Math.abs(gain[0][1] - 10 ** (-55 / 20)) < 1e-12);
  assert.equal(gain[1][1], 0);
  assert.equal(sweep.snapshot().thresholdsEstimated, 0);
  assert.equal(sweep.snapshot().eqGainsCalculated, 0);
  assert.equal(sweep.snapshot().acousticCalibration, 'none');
});

test('P0 software ceiling blocks higher sweep levels even within an authorized tone range', async () => {
  const f = fakeContext();
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  assert.equal(SWEEP_DIGITAL_CEILING_DBFS, -42);
  await assert.rejects(sweep.start(request({
    digitalLevelDbfs: -35,
    authorizedDigitalRangeDbfs: { minDbfs: -85, maxDbfs: -20 },
  })), /hard limits/);
  await assert.rejects(sweep.start(request({ digitalLevelDbfs: -40 })), /hard limits/);
  await assert.rejects(sweep.start(request({ digitalLevelDbfs: -90 })), /authorized/);
  assert.equal(f.oscillators.length, 0);
});

test('reports use browser audio clock, are explicit and not acoustic threshold measurements', async () => {
  const f = fakeContext();
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await sweep.start(request());
  f.context.currentTime = 20.01;
  const report = sweep.report(true);
  assert.equal(report.heard, true);
  assert.ok(Math.abs(report.elapsedSeconds - 10) < 1e-8);
  assert.ok(Math.abs(report.frequencyHz - 200) < 1e-6);
  assert.equal(report.source, 'user-report-during-sweep');
  assert.equal(sweep.snapshot().reports.length, 1);
  assert.throws(() => sweep.report(true), /timestamps must increase/);
  assert.equal(sweep.snapshot().reports.length, 1);
  f.context.currentTime = 40.01;
  const report2 = sweep.report(false);
  assert.equal(report2.heard, false);
  assert.equal(sweep.snapshot().reports.length, 2);
});

test('stop zeroes the output and does not misclassify a cancelled sweep as completed', async () => {
  const f = fakeContext();
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await sweep.start(request());
  const ended = f.oscillators[0].onended;
  assert.equal(sweep.stop('user-pause'), true);
  assert.equal(sweep.snapshot().status, 'interrupted');
  assert.equal(sweep.snapshot().reason, 'user-pause');
  assert.deepEqual(f.calls.filter(c => c[0] === 'gain.set').at(-1), ['gain.set', 0, 10]);
  assert.deepEqual(f.calls.filter(c => c[0] === 'osc.stop').at(-1), ['osc.stop', 10]);
  ended?.();
  assert.equal(sweep.snapshot().status, 'interrupted');
  assert.throws(() => sweep.report(true), /active visible audio/);
});

test('pending AudioContext resume cannot start after interruption', async () => {
  const f = fakeContext({ suspended: true });
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  const pending = sweep.start(request());
  assert.equal(sweep.snapshot().status, 'starting');
  sweep.stop('interruption');
  f.resume();
  assert.deepEqual(await pending, { started: false, reason: 'cancelled' });
  assert.equal(f.calls.filter(c => c[0] === 'osc.start').length, 0);
  assert.equal(sweep.snapshot().status, 'interrupted');
});

test('hidden page and browser pagehide require an explicit new start', async () => {
  const f = fakeContext();
  const handlers = new Map();
  const target = {
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name, fn) => { if (handlers.get(name) === fn) handlers.delete(name); },
  };
  let visible = true;
  const sweep = createWebAudioSweepSession({
    createContext: () => f.context, isVisible: () => visible,
    visibilityTarget: target, lifecycleTarget: target,
  });
  await sweep.start(request());
  visible = false;
  handlers.get('visibilitychange')();
  assert.equal(sweep.snapshot().status, 'interrupted');
  await assert.rejects(sweep.start(request()), /hidden page/);
  visible = true;
  await sweep.start(request());
  handlers.get('pagehide')();
  assert.equal(sweep.snapshot().status, 'interrupted');
  await sweep.dispose();
  assert.equal(handlers.size, 0);
});

test('context suspension interrupts a running sweep without auto-resume', async () => {
  const f = fakeContext();
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await sweep.start(request());
  f.context.state = 'suspended';
  f.listeners.get('statechange')();
  assert.equal(sweep.snapshot().status, 'interrupted');
  assert.equal(sweep.snapshot().reason, 'context-suspended');
  assert.throws(() => sweep.report(false), /active visible audio/);
});

test('Nyquist is rechecked against actual context sample rate before oscillator creation', async () => {
  const f = fakeContext({ sampleRate: 12000 });
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await assert.rejects(sweep.start(request()), /Nyquist/);
  assert.equal(f.oscillators.length, 0);
  assert.equal(sweep.snapshot().status, 'interrupted');
});

test('natural end preserves reports but never creates a hearing threshold', async () => {
  const f = fakeContext();
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await sweep.start(request());
  f.context.currentTime = 12;
  sweep.report(true);
  f.oscillators[0].onended?.();
  assert.equal(sweep.snapshot().status, 'completed');
  assert.equal(sweep.snapshot().reports.length, 1);
  assert.equal(sweep.snapshot().thresholdsEstimated, 0);
  assert.throws(() => sweep.report(false), /active visible audio/);
});

test('failure while constructing a partial audio graph cleans up without masking original error', async () => {
  const f = fakeContext({ failGain: true });
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await assert.rejects(sweep.start(request()), /gain factory failure/);
  assert.equal(sweep.snapshot().status, 'interrupted');
  assert.ok(f.calls.some(c => c[0] === 'osc.disconnect'));
});

test('dispose closes audio and disallows any later playback or reports', async () => {
  const f = fakeContext();
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await sweep.start(request());
  await sweep.dispose();
  assert.equal(f.context.state, 'closed');
  assert.equal(sweep.snapshot().status, 'disposed');
  await assert.rejects(sweep.start(request()), /disposed/);
  assert.throws(() => sweep.report(true), /disposed/);
});

test('invalid replacement sweep cannot leave a previous oscillator running', async () => {
  const f = fakeContext();
  const sweep = createWebAudioSweepSession({ createContext: () => f.context });
  await sweep.start(request());
  await assert.rejects(sweep.start(request({ digitalLevelDbfs: -20 })), /hard limits/);
  assert.equal(sweep.snapshot().status, 'interrupted');
  assert.ok(f.calls.some(c => c[0] === 'gain.cancel'));
  assert.deepEqual(f.calls.filter(c => c[0] === 'osc.stop').at(-1), ['osc.stop', 10]);
});
