import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalCheckpointStore } from '../src/hear3/local-checkpoint-store.mjs';
import { createCheckpointedHear3AudioSession } from '../src/hear3/checkpointed-audio-session.mjs';

class Storage {
  constructor() { this.items = new Map(); this.fail = false; }
  getItem(k) { if (this.fail) throw Error('Denied'); return this.items.get(k) ?? null; }
  setItem(k,v) { if (this.fail) throw Error('Quota'); this.items.set(k,v); }
  removeItem(k) { if (this.fail) throw Error('Denied'); this.items.delete(k); }
}
const tone = (toneId = 't1') => ({ toneId, frequencyHz: 440, digitalLevelDbfs: -60, channel: 'joint', durationSeconds: 2 });
function fixture(storage, profileId = 'headphones', minDbfs = -85, maxDbfs = -45, alt = null) {
  const log = [];
  const store = createLocalCheckpointStore({ profileId, deviceStorage: storage, tabStorage: alt });
  const audio = createCheckpointedHear3AudioSession({
    profileId, minDbfs, maxDbfs, checkpointStore: store,
    adapterFactory: () => {
      let activeToneId = null;
      return {
        async playTone({toneId}) { activeToneId = toneId; log.push(['start',toneId]); return {started:true,toneId}; },
        getStatus() { return {activeToneId, contextState:'running', visible:true}; },
        stop() { log.push(['stop']); activeToneId = null; return true; },
        async dispose() { log.push(['dispose']); },
      };
    },
  });
  return { audio, store, log };
}

test('auto-checkpoints a valid answer and reports verified device persistence', async () => {
  const storage = new Storage();
  const f = fixture(storage);
  assert.equal(f.audio.getRecoveryProposal().available, false);
  assert.equal(storage.items.size, 0, 'No unsolicited write before starting');
  await f.audio.startTone(tone());
  assert.equal(f.audio.getPersistence().durability, 'device-local');
  f.audio.answer('heard');
  assert.equal(f.audio.getPersistence().persistedOnDevice, true);
  assert.equal(f.store.load().checkpoint.observations.length, 1);
  assert.deepEqual(f.store.load().checkpoint.observations.map(o => o.response), ['heard']);
  assert.equal(f.store.load().checkpoint.currentTone, null);
});

test('reloading offers recovery but only a user-triggered restore can install it', async () => {
  const storage = new Storage();
  const initial = fixture(storage);
  await initial.audio.startTone(tone());
  initial.audio.answer('heard');
  await initial.audio.dispose();
  const reopened = fixture(storage);
  assert.equal(reopened.audio.getSession().status, 'ready', 'Do not auto-restore an old session');
  const proposal = reopened.audio.getRecoveryProposal();
  assert.equal(proposal.available, true);
  assert.equal(proposal.observationCount, 1);
  assert.equal(proposal.requiresManualOutputCheck, true);
  assert.equal(reopened.log.length, 0, 'No audio created merely by looking up storage');
  await assert.rejects(reopened.audio.recover(), /explicit user action/);
  const restored = await reopened.audio.recover({ userInitiated: true });
  assert.equal(restored.state.status, 'paused');
  assert.equal(restored.state.routeCheckRequired, true);
  assert.deepEqual(restored.state.observations.map(o => o.response), ['heard']);
  assert.equal(reopened.log.filter(x => x[0] === 'start').length, 0);
  assert.throws(() => reopened.audio.resume({ userInitiated: true }), /Route check/);
  reopened.audio.confirmRoute({ userConfirmed: true });
  reopened.audio.resume({ userInitiated: true });
  assert.equal(reopened.audio.getSession().status, 'ready');
  assert.equal(reopened.log.filter(x => x[0] === 'start').length, 0);
  await reopened.audio.startTone(tone('t2'));
  reopened.audio.answer('not-heard');
  assert.deepEqual(reopened.audio.getSession().observations.map(o => o.response), ['heard','not-heard']);
});

test('forced reload during an active tone requires retest; never creates a false observation', async () => {
  const storage = new Storage();
  const initial = fixture(storage);
  await initial.audio.startTone(tone('unfinished'));
  const reopened = fixture(storage);
  await reopened.audio.recover({ userInitiated: true });
  const state = reopened.audio.getSession();
  assert.equal(state.status, 'paused');
  assert.deepEqual(state.invalidatedToneIds, ['unfinished']);
  assert.deepEqual(state.observations, []);
  assert.equal(reopened.log.some(x => x[0] === 'start'), false);
});

test('temporary storage falls back and warns without claiming durable persistence', async () => {
  const device = new Storage();
  const tab = new Storage();
  device.fail = true;
  const f = fixture(device, 'headphones', -85, -45, tab);
  await f.audio.startTone(tone());
  f.audio.answer('heard');
  assert.equal(f.audio.getPersistence().durability, 'tab-session');
  assert.equal(f.audio.getPersistence().persistedOnDevice, false);
  tab.fail = true;
  f.audio.interrupt();
  assert.equal(f.audio.getPersistence().durability, 'volatile');
  assert.equal(f.audio.getPersistence().persistedOnDevice, false);
  assert.match(f.audio.getPersistence().warning, /may be lost/);
  assert.equal(JSON.parse(f.audio.exportCheckpoint()).checkpoint.observations.length, 1);
});

test('a failed FINISH while tone is playing persists the safe paused state', async () => {
  const storage = new Storage();
  const f = fixture(storage);
  await f.audio.startTone(tone());
  assert.throws(() => f.audio.finish(), /Finish only from ready state/);
  assert.equal(f.audio.getSession().status, 'paused');
  const reopened = fixture(storage);
  await reopened.audio.recover({ userInitiated: true });
  assert.equal(reopened.audio.getSession().status, 'paused');
  assert.deepEqual(reopened.audio.getSession().invalidatedToneIds, ['t1']);
});

test('recovery rejects a changed digital authorization without altering the new controller', async () => {
  const storage = new Storage();
  const f = fixture(storage);
  await f.audio.startTone(tone());
  f.audio.answer('heard');
  const different = fixture(storage, 'headphones', -85, -50);
  await assert.rejects(different.audio.recover({ userInitiated: true }), /digital bounds differ/);
  assert.equal(different.audio.getSession().status, 'ready');
  assert.equal(different.log.filter(x => x[0] === 'start').length, 0);
});

test('profile namespaces remain separate and no recovery spills across profiles', async () => {
  const storage = new Storage();
  const a = fixture(storage, 'headphones');
  await a.audio.startTone(tone());
  a.audio.answer('heard');
  const b = fixture(storage, 'car');
  assert.equal(b.audio.getRecoveryProposal().available, false);
  assert.equal(b.audio.getSession().observations.length, 0);
  const fresh = fixture(storage, 'headphones');
  assert.equal(fresh.audio.getRecoveryProposal().observationCount, 1);
});

test('damaged saved data is not silently interpreted as a recoverable exam', async () => {
  const storage = new Storage();
  storage.setItem('hear3:exam-checkpoint:headphones:0','invalid data');
  const f = fixture(storage);
  assert.equal(f.audio.getRecoveryProposal().available, false);
  assert.ok(f.audio.getRecoveryProposal().warnings.some(w => /damaged/.test(w)));
  await assert.rejects(f.audio.recover({ userInitiated: true }), /No verified checkpoint/);
  assert.equal(f.audio.getSession().status, 'ready');
  assert.equal(storage.getItem('hear3:exam-checkpoint:headphones:0'),'invalid data');
});

test('deleting the chosen profile checkpoint never touches another profile', async () => {
  const storage = new Storage();
  const a = fixture(storage, 'headphones');
  const b = fixture(storage, 'car');
  await a.audio.startTone(tone());
  a.audio.answer('heard');
  await b.audio.startTone(tone());
  b.audio.answer('not-heard');
  assert.throws(() => a.audio.clearCheckpoint(), /Explicit deletion/);
  assert.equal(a.audio.clearCheckpoint({ confirmed:true }).cleared, true);
  assert.equal(fixture(storage, 'headphones').audio.getRecoveryProposal().available, false);
  assert.equal(fixture(storage, 'car').audio.getRecoveryProposal().observationCount, 1);
});

test('finished exams restore as completed, without autoplay', async () => {
  const storage = new Storage();
  const first = fixture(storage);
  await first.audio.startTone(tone());
  first.audio.answer('heard');
  first.audio.finish();
  const next = fixture(storage);
  const result = await next.audio.recover({ userInitiated:true });
  assert.equal(result.state.status, 'completed');
  assert.equal(result.state.currentTone, null);
  assert.equal(next.log.some(x => x[0] === 'start'), false);
});
