import test from 'node:test';
import assert from 'node:assert/strict';
import { createHear3AudioSession } from '../src/hear3/audio-session-controller.mjs';

function fixture({ defer = false } = {}) {
  const calls = [];
  let pending;
  let lifecycle;
  const controller = createHear3AudioSession({
    profileId: 'headphones', minDbfs: -80, maxDbfs: -35,
    adapterFactory: (callbacks) => {
      lifecycle = callbacks;
      return {
        playTone: (event) => {
          calls.push(['play', event]);
          if (defer) return new Promise(resolve => { pending = resolve; });
          return Promise.resolve({ started: true, toneId: event.toneId });
        },
        stop: () => { calls.push(['stop']); return true; },
        dispose: async () => { calls.push(['dispose']); },
      };
    },
  });
  const tone = { toneId: 't1', frequencyHz: 440, digitalLevelDbfs: -50, channel: 'left', durationSeconds: 2 };
  return { controller, calls, tone, lifecycle, resolvePending: (value) => pending?.(value) };
}

test('answers only after playback starts, with silent output first', async () => {
  const f = fixture();
  const result = await f.controller.startTone(f.tone);
  assert.deepEqual(result, { started: true, toneId: 't1' });
  const s = f.controller.answer('heard');
  assert.equal(s.status, 'ready');
  assert.equal(s.observations.length, 1);
  assert.equal(s.observations[0].response, 'heard');
  assert.deepEqual(f.calls.map(c => c[0]), ['play', 'stop']);
});

test('pending audio cannot be answered or replayed after interruption', async () => {
  const f = fixture({ defer: true });
  const start = f.controller.startTone(f.tone);
  assert.throws(() => f.controller.answer('heard'), /before the tone/);
  const paused = f.controller.interrupt();
  assert.deepEqual(paused.invalidatedToneIds, ['t1']);
  f.resolvePending({ started: false, reason: 'cancelled' });
  assert.equal((await start).reason, 'obsolete');
  assert.equal(f.controller.getSession().status, 'paused');
  f.controller.resume({ userInitiated: true });
  assert.equal(f.controller.getSession().status, 'ready');
  assert.equal(f.controller.getSession().observations.length, 0);
});

test('route change needs confirmation and never automatically plays', async () => {
  const f = fixture();
  await f.controller.startTone(f.tone);
  f.controller.routeChanged('new-device');
  assert.equal(f.controller.getSession().routeCheckRequired, true);
  assert.throws(() => f.controller.resume({ userInitiated: true }), /Route check/);
  assert.throws(() => f.controller.confirmRoute(), /Explicit route confirmation/);
  f.controller.confirmRoute({ userConfirmed: true });
  assert.throws(() => f.controller.resume(), /Explicit user action/);
  f.controller.resume({ userInitiated: true });
  assert.equal(f.controller.getSession().status, 'ready');
  assert.equal(f.calls.filter(c => c[0] === 'play').length, 1);
});

test('timeout is recorded as interrupted, not a false negative result', async () => {
  const f = fixture();
  await f.controller.startTone(f.tone);
  f.lifecycle.onToneEnded({ toneId: 't1' });
  const s = f.controller.getSession();
  assert.equal(s.status, 'paused');
  assert.deepEqual(s.invalidatedToneIds, ['t1']);
  assert.equal(s.observations.length, 0);
});

test('invalid answer pauses without recording a false observation', async () => {
  const f = fixture();
  await f.controller.startTone(f.tone);
  assert.throws(() => f.controller.answer('maybe'), /Invalid response/);
  assert.equal(f.controller.getSession().status, 'paused');
  assert.equal(f.controller.getSession().observations.length, 0);
});

test('exposed session state cannot mutate authorized limits', async () => {
  const f = fixture();
  const out = f.controller.getSession();
  out.authorizedDigitalRangeDbfs.maxDbfs = 0;
  assert.equal(f.controller.getSession().authorizedDigitalRangeDbfs.maxDbfs, -35);
  await assert.rejects(f.controller.startTone({ ...f.tone, digitalLevelDbfs: -10 }), /authorized/);
});

test('lifecycle interruption stops and requires manual continuation', async () => {
  const f = fixture();
  await f.controller.startTone(f.tone);
  f.lifecycle.onInterrupted({ reason: 'pagehide' });
  assert.equal(f.controller.getSession().status, 'paused');
  assert.equal(f.controller.getSession().routeCheckRequired, true);
});

test('obsolete async start never stops a newer resumed tone', async () => {
  const resolvers = [];
  let stops = 0;
  const c = createHear3AudioSession({
    profileId: 'device', minDbfs: -80, maxDbfs: -35,
    adapterFactory: () => ({
      playTone: () => new Promise(resolve => resolvers.push(resolve)),
      stop: () => { stops++; },
      dispose: async () => {},
    }),
  });
  const old = c.startTone({ toneId: 'old', frequencyHz: 500, digitalLevelDbfs: -50 });
  c.interrupt();
  c.resume({ userInitiated: true });
  const newest = c.startTone({ toneId: 'new', frequencyHz: 700, digitalLevelDbfs: -60 });
  resolvers[1]({ started: true, toneId: 'new' });
  assert.equal((await newest).started, true);
  const stopsBefore = stops;
  resolvers[0]({ started: false, reason: 'cancelled' });
  assert.equal((await old).reason, 'obsolete');
  assert.equal(stops, stopsBefore, 'old completion cannot silence the newest playback');
  assert.equal(c.answer('heard').observations[0].toneId, 'new');
});

test('finish while playing interrupts instead of leaving a false answer possible', async () => {
  const f = fixture();
  await f.controller.startTone(f.tone);
  assert.throws(() => f.controller.finish(), /Finish only from ready/);
  assert.equal(f.controller.getSession().status, 'paused');
  assert.deepEqual(f.controller.getSession().invalidatedToneIds, ['t1']);
  assert.throws(() => f.controller.answer('heard'), /before the tone/);
  f.controller.resume({ userInitiated: true });
  assert.equal(f.controller.finish().status, 'completed');
});


test('P0 unreported context suspension invalidates the tone rather than accepting a false response', async () => {
  let contextState = 'running';
  let stopped = 0;
  const c = createHear3AudioSession({
    profileId: 'device', minDbfs: -80, maxDbfs: -35,
    adapterFactory: () => ({
      playTone: async ({ toneId }) => ({ started: true, toneId }),
      stop: () => { stopped++; },
      getStatus: () => ({ activeToneId: 't1', contextState, visible: true }),
      dispose: async () => {},
    }),
  });
  await c.startTone({ toneId: 't1', frequencyHz: 700, digitalLevelDbfs: -55 });
  contextState = 'suspended';
  assert.throws(() => c.answer('not-heard'), /no longer verified/);
  const state = c.getSession();
  assert.equal(state.status, 'paused');
  assert.equal(state.routeCheckRequired, true);
  assert.deepEqual(state.invalidatedToneIds, ['t1']);
  assert.deepEqual(state.observations, []);
  assert.ok(stopped > 0);
});
