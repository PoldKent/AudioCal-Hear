import test from 'node:test';
import assert from 'node:assert/strict';
import { createSweepPlan } from '../src/hear3/sweep-planner.mjs';
import { createSweepAudioRunner, PROTOTYPE_SWEEP_MAX_DBFS } from '../src/hear3/sweep-audio-runner.mjs';

function fakeAudio({ suspended = false, stereo = true, sampleRate = 48000 } = {}) {
  const calls = [], nodes = [];
  let resolveResume;
  const ctx = {
    currentTime: 10, sampleRate, destination: {},
    state: suspended ? 'suspended' : 'running',
    createOscillator() {
      const node = {
        frequency: {
          setValueAtTime: (...args) => calls.push(['frequency-start', ...args]),
          exponentialRampToValueAtTime: (...args) => calls.push(['frequency-end', ...args]),
        },
        connect: () => calls.push(['osc.connect']),
        disconnect: () => calls.push(['osc.disconnect']),
        start: at => calls.push(['osc.start', at]),
        stop: at => calls.push(['osc.stop', at]),
        onended: null,
      };
      nodes.push(node);
      return node;
    },
    createGain() {
      return {
        gain: {
          cancelScheduledValues: at => calls.push(['cancel-gain', at]),
          setValueAtTime: (...args) => calls.push(['set-gain', ...args]),
          linearRampToValueAtTime: (...args) => calls.push(['ramp-gain', ...args]),
        },
        connect: () => calls.push(['gain.connect']),
        disconnect: () => calls.push(['gain.disconnect']),
      };
    },
    createStereoPanner: stereo ? () => ({
      pan: { setValueAtTime: (...args) => calls.push(['pan', ...args]) },
      connect: () => calls.push(['pan.connect']),
      disconnect: () => calls.push(['pan.disconnect']),
    }) : undefined,
    async resume() {
      if (!suspended) { this.state = 'running'; return; }
      await new Promise(resolve => {
        resolveResume = () => { this.state = 'running'; resolve(); };
      });
    },
    async close() { this.state = 'closed'; calls.push(['ctx.close']); },
  };
  return { ctx, calls, nodes, resumeNow: () => resolveResume?.() };
}
const range = { minDbfs: -85, maxDbfs: -35 };
const plan = () => createSweepPlan({ minHz: 100, maxHz: 6400, durationSeconds: 30 });

test('no autoplay: a sweep needs start and schedules a bounded logarithmic oscillator', async () => {
  const f = fakeAudio();
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  assert.equal(f.nodes.length, 0);
  assert.equal((await runner.start({ plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range, channel: 'left' })).started, true);
  assert.deepEqual(f.calls.filter(c => c[0] === 'frequency-start').map(c => c[1]), [100]);
  assert.deepEqual(f.calls.filter(c => c[0] === 'frequency-end').map(c => c[1]), [6400]);
  assert.equal(f.calls.find(c => c[0] === 'pan')[1], -1);
  assert.equal(f.calls.find(c => c[0] === 'osc.start')[1], 10.02);
  assert.ok(Math.abs(f.calls.find(c => c[0] === 'osc.stop')[1] - 40.02) < 1e-9);
  assert.ok(f.calls.some(c => c[0] === 'ramp-gain' && Math.abs(c[1] - 0.001) < 1e-12));
  runner.stop();
});

test('reports preserve user provenance and estimate frequency from audio elapsed time', async () => {
  const f = fakeAudio();
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  await runner.start({ plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range });
  f.ctx.currentTime = 15.02;
  const heard = runner.recordResponse(true);
  assert.equal(heard.heard, true);
  assert.equal(heard.source, 'user-report-during-sweep');
  assert.ok(Math.abs(heard.frequencyHz - 200) < 1e-8);
  f.ctx.currentTime = 20.02;
  const notHeard = runner.recordResponse(false);
  assert.ok(Math.abs(notHeard.frequencyHz - 400) < 1e-8);
  assert.equal(runner.snapshot().reports.length, 2);
  runner.stop();
  assert.equal(runner.lastResult().status, 'interrupted');
  assert.equal(runner.lastResult().reports.length, 2);
  assert.equal(runner.lastResult().thresholdInferences, 0);
});

test('exceeding preauthorized or prototype levels stops an active sweep without replacement', async () => {
  const f = fakeAudio();
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  await runner.start({ plan: plan(), digitalLevelDbfs: -65, authorizedDigitalRangeDbfs: range });
  await assert.rejects(runner.start({ plan: plan(), digitalLevelDbfs: -25, authorizedDigitalRangeDbfs: range }), /level exceeds/);
  assert.equal(runner.snapshot().status, 'idle');
  assert.equal(f.calls.filter(c => c[0] === 'osc.start').length, 1);
  assert.equal(f.calls.filter(c => c[0] === 'osc.stop').at(-1)[1], 10);
  assert.equal(PROTOTYPE_SWEEP_MAX_DBFS, -42);
});

test('duration and Nyquist restrictions are checked with the actual audio hardware sample rate', async () => {
  const f = fakeAudio({ sampleRate: 16000 });
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  await assert.rejects(runner.start({
    plan: createSweepPlan({ minHz: 100, maxHz: 8000, durationSeconds: 20 }),
    digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range,
  }), /Nyquist/);
  await assert.rejects(runner.start({
    plan: createSweepPlan({ minHz: 100, maxHz: 7000, durationSeconds: 60 }),
    digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range,
  }), /duration exceeds/);
  assert.equal(f.calls.some(c => c[0] === 'osc.start'), false);
});

test('suspended AudioContext is cancelled during asynchronous resume before audio starts', async () => {
  const f = fakeAudio({ suspended: true });
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  const result = runner.start({ plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range });
  runner.stop();
  f.resumeNow();
  assert.deepEqual(await result, { started: false, reason: 'cancelled' });
  assert.equal(f.nodes.length, 0);
});

test('end-of-sweep preserves subjective reports but never calculates thresholds', async () => {
  const f = fakeAudio();
  const ended = [];
  const runner = createSweepAudioRunner({ createContext: () => f.ctx, onEnded: e => ended.push(e) });
  await runner.start({ plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range });
  f.ctx.currentTime = 15.02;
  runner.recordResponse(true);
  f.nodes[0].onended();
  assert.equal(runner.snapshot().status, 'idle');
  assert.equal(ended.length, 1);
  assert.equal(ended[0].status, 'completed');
  assert.equal(ended[0].thresholdInferences, 0);
  assert.equal(ended[0].reports.length, 1);
  assert.throws(() => runner.recordResponse(false), /No active sweep/);
});

test('only actual playback may receive a response; rejects duplicate timestamps and unknown values', async () => {
  const f = fakeAudio();
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  assert.throws(() => runner.recordResponse(true), /No active sweep/);
  await runner.start({ plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range });
  assert.throws(() => runner.recordResponse(true), /outside the playback interval/);
  f.ctx.currentTime = 13.02;
  assert.throws(() => runner.recordResponse('yes'), /must be explicit/);
  runner.recordResponse(false);
  assert.throws(() => runner.recordResponse(true), /increase/);
});

test('route and visibility-like interruptions silence and preserve only partial reports', async () => {
  const f = fakeAudio();
  const listeners = new Map();
  const target = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      if (listeners.get(name) === fn) listeners.delete(name);
    },
  };
  let visible = true;
  const interrupted = [];
  const runner = createSweepAudioRunner({
    createContext: () => f.ctx,
    visibilityTarget: target, lifecycleTarget: target, isVisible: () => visible,
    onInterrupted: e => interrupted.push(e.reason),
  });
  await runner.start({ plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range });
  f.ctx.currentTime = 11.02;
  runner.recordResponse(true);
  visible = false;
  listeners.get('visibilitychange')();
  assert.deepEqual(interrupted, ['hidden']);
  assert.equal(runner.lastResult().reason, 'hidden');
  assert.equal(runner.lastResult().reports.length, 1);
  assert.equal(f.calls.filter(c => c[0] === 'osc.stop').at(-1)[1], 11.02);
  visible = true;
  await runner.start({ plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range });
  listeners.get('pagehide')();
  assert.deepEqual(interrupted, ['hidden', 'pagehide']);
  await runner.dispose();
  assert.equal(listeners.size, 0);
  assert.equal(f.ctx.state, 'closed');
});

test('separate left/right requires a panner and disposal prevents replay', async () => {
  const f = fakeAudio({ stereo: false });
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  await assert.rejects(runner.start({
    plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range, channel: 'left',
  }), /Independent channels/);
  assert.equal(f.nodes.length, 0);
  await runner.dispose();
  await assert.rejects(runner.start({
    plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range,
  }), /disposed/);
});

test('partial Web Audio construction failure cleans up and preserves root error', async () => {
  const f = fakeAudio();
  f.ctx.createGain = () => { throw new Error('Gain node unavailable'); };
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  await assert.rejects(runner.start({
    plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range,
  }), /Gain node unavailable/);
  assert.equal(runner.snapshot().status, 'idle');
  assert.ok(f.calls.some(c => c[0] === 'osc.disconnect'));
});

test('external edits to diagnostic snapshots cannot mutate recorded reports', async () => {
  const f = fakeAudio();
  const runner = createSweepAudioRunner({ createContext: () => f.ctx });
  await runner.start({ plan: plan(), digitalLevelDbfs: -60, authorizedDigitalRangeDbfs: range });
  f.ctx.currentTime = 12.02;
  runner.recordResponse(true);
  runner.stop();
  const mutableCopy = runner.snapshot().lastResult;
  mutableCopy.reports[0].heard = false;
  assert.equal(runner.lastResult().reports[0].heard, true);
});
