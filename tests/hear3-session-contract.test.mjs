import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, transitionSession } from '../src/hear3/session-contract.mjs';

const begin = () => createSession({ profileId: 'headphones', routeId: 'browser-default', minDbfs: -80, maxDbfs: -35 });
const tone = { type: 'START_TONE', toneId: 't1', frequencyHz: 1000, digitalLevelDbfs: -48, channel: 'left' };

test('answers stop the active tone in state and preserve exact digital evidence', () => {
  const playing = transitionSession(begin(), tone);
  const answered = transitionSession(playing, { type: 'ANSWER', response: 'not-heard' });
  assert.equal(answered.status, 'ready');
  assert.equal(answered.currentTone, null);
  assert.deepEqual(answered.observations, [{ toneId: 't1', frequencyHz: 1000, digitalLevelDbfs: -48, channel: 'left', response: 'not-heard', provenance: 'user-response' }]);
});

test('rejects exceeding or expanding the authorized digital range', () => {
  const base = begin();
  assert.throws(() => transitionSession(base, { ...tone, digitalLevelDbfs: -34 }), /authorized/);
  assert.throws(() => transitionSession(base, { ...tone, digitalLevelDbfs: -81 }), /authorized/);
  assert.throws(() => transitionSession(base, { type: 'EXPAND_LIMIT', maxDbfs: 0 }), /Unsupported/);
  assert.deepEqual(base.authorizedDigitalRangeDbfs, { minDbfs: -80, maxDbfs: -35 });
});

test('interruption invalidates unfinished tone but preserves confirmed observations', () => {
  const first = transitionSession(transitionSession(begin(), tone), { type: 'ANSWER', response: 'heard' });
  const second = transitionSession(first, { ...tone, toneId: 't2' });
  const paused = transitionSession(second, { type: 'INTERRUPT', routeMayHaveChanged: false });
  assert.equal(paused.status, 'paused');
  assert.deepEqual(paused.invalidatedToneIds, ['t2']);
  assert.equal(paused.observations.length, 1);
  assert.throws(() => transitionSession(paused, tone), /cannot play/);
  assert.throws(() => transitionSession(paused, { type: 'RESUME' }), /Explicit user/);
  assert.equal(transitionSession(paused, { type: 'RESUME', userInitiated: true }).status, 'ready');
});

test('route change forces manual confirmation and does not autoplay on restore', () => {
  const paused = transitionSession(transitionSession(begin(), tone), { type: 'ROUTE_CHANGED', routeId: 'bluetooth' });
  assert.equal(paused.routeCheckRequired, true);
  assert.equal(paused.currentTone, null);
  assert.throws(() => transitionSession(paused, { type: 'RESUME', userInitiated: true }), /Route check/);
  assert.throws(() => transitionSession(paused, { type: 'CONFIRM_ROUTE' }), /Explicit/);
  const confirmed = transitionSession(paused, { type: 'CONFIRM_ROUTE', confirmed: true });
  const resumed = transitionSession(confirmed, { type: 'RESUME', userInitiated: true });
  assert.equal(resumed.status, 'ready');
  assert.equal(resumed.currentTone, null);
  assert.deepEqual(resumed.invalidatedToneIds, ['t1']);
});

test('completed session cannot restart and input values are checked', () => {
  const completed = transitionSession(begin(), { type: 'FINISH' });
  assert.throws(() => transitionSession(completed, tone), /cannot play/);
  assert.throws(() => createSession({ profileId: 'a', minDbfs: -35, maxDbfs: -80 }), /Invalid authorized/);
  assert.throws(() => transitionSession(begin(), { ...tone, frequencyHz: NaN }), /Invalid frequency/);
});
