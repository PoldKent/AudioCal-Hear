import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, transitionSession } from '../src/hear3/session-contract.mjs';
import { createLocalCheckpointStore, CHECKPOINT_FORMAT } from '../src/hear3/local-checkpoint-store.mjs';

class MemoryStorage {
  constructor() { this.data = new Map(); this.failSet = false; this.failRead = false; this.failRemove = false; }
  getItem(key) { if (this.failRead) throw new Error('Storage denied'); return this.data.get(key) ?? null; }
  setItem(key, value) { if (this.failSet) throw new Error('QuotaExceededError'); this.data.set(key, value); }
  removeItem(key) { if (this.failRemove) throw new Error('Deletion blocked'); this.data.delete(key); }
}
const session = (profileId = 'headphones') =>
  createSession({ profileId, routeId: 'browser-default', minDbfs: -85, maxDbfs: -40 });
const answered = (profileId = 'headphones') => {
  const started = transitionSession(session(profileId), {
    type: 'START_TONE', toneId: 't1', frequencyHz: 1000, digitalLevelDbfs: -55, channel: 'joint',
  });
  return transitionSession(started, { type: 'ANSWER', response: 'heard' });
};

test('P0 local checkpoint validates write/read and never resumes audio automatically', () => {
  const device = new MemoryStorage();
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  const saved = store.save(answered());
  assert.equal(saved.durability, 'device-local');
  assert.equal(saved.persistedOnDevice, true);
  const restored = store.load();
  assert.equal(restored.durability, 'device-local');
  assert.equal(restored.checkpoint.status, 'paused');
  assert.equal(restored.checkpoint.routeCheckRequired, true);
  assert.equal(restored.checkpoint.currentTone, null);
  assert.deepEqual(restored.checkpoint.observations.map(x => x.response), ['heard']);
});

test('P0 interrupted active tone is invalidated but past observations survive', () => {
  const device = new MemoryStorage();
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  const playing = transitionSession(answered(), {
    type: 'START_TONE', toneId: 't2', frequencyHz: 1800, digitalLevelDbfs: -60, channel: 'joint',
  });
  store.save(playing);
  const recovered = store.load().checkpoint;
  assert.equal(recovered.status, 'paused');
  assert.deepEqual(recovered.invalidatedToneIds, ['t2']);
  assert.equal(recovered.currentTone, null);
  assert.equal(recovered.observations.length, 1);
});

test('two copy slots recover last good version after later accidental corruption', () => {
  const device = new MemoryStorage();
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  store.save(session());
  store.save(answered());
  const key = 'hear3:exam-checkpoint:headphones:0';
  const corrupted = JSON.parse(device.getItem(key));
  corrupted.checkpoint.observations[0].response = 'not-heard';
  device.setItem(key, JSON.stringify(corrupted));
  // A fresh browser session has no in-memory copy of the damaged latest write.
  const reloaded = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  const recovered = reloaded.load();
  assert.equal(recovered.checkpoint.observations.length, 0);
  assert.ok(recovered.warnings.some(w => w.includes('damaged')));
});

test('quota failure falls back to tab storage without claiming device persistence', () => {
  const device = new MemoryStorage();
  const tab = new MemoryStorage();
  device.failSet = true;
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: tab });
  const result = store.save(answered());
  assert.equal(result.durability, 'tab-session');
  assert.equal(result.persistedOnDevice, false);
  assert.match(result.warning, /export a backup/);
  assert.equal(store.load().checkpoint.observations.length, 1);
});

test('when both local stores fail, the result is volatile and exportable, never marked saved', () => {
  const device = new MemoryStorage();
  const tab = new MemoryStorage();
  device.failSet = tab.failSet = true;
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: tab });
  const result = store.save(answered());
  assert.equal(result.durability, 'volatile');
  assert.equal(result.persistedOnDevice, false);
  assert.match(result.warning, /may be lost/);
  const exported = JSON.parse(store.exportCheckpoint());
  assert.equal(exported.format, CHECKPOINT_FORMAT);
  assert.equal(exported.checkpoint.observations[0].response, 'heard');
});

test('no valid copy plus corrupt data prevents silent overwrite of the damaged record', () => {
  const device = new MemoryStorage();
  const key = 'hear3:exam-checkpoint:headphones:0';
  device.setItem(key, 'not valid json');
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  const state = store.load();
  assert.equal(state.checkpoint, null);
  assert.ok(state.warnings.some(w => w.includes('No verified checkpoint')));
  const result = store.save(answered());
  assert.equal(result.durability, 'volatile');
  assert.equal(device.getItem(key), 'not valid json');
  assert.equal(store.load().checkpoint.observations[0].response, 'heard');
});

test('only explicit, scoped deletion clears this profile, not unrelated profiles', () => {
  const device = new MemoryStorage();
  const a = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  const b = createLocalCheckpointStore({ profileId: 'car', deviceStorage: device, tabStorage: null });
  a.save(answered('headphones'));
  b.save(answered('car'));
  assert.throws(() => a.clear(), /Explicit deletion/);
  assert.equal(a.clear({ confirmed: true }).cleared, true);
  assert.equal(a.load().checkpoint, null);
  assert.equal(b.load().checkpoint.profileId, 'car');
});

test('failed deletion cannot be reported as a successful clear', () => {
  const device = new MemoryStorage();
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  store.save(answered());
  device.failRemove = true;
  const result = store.clear({ confirmed: true });
  assert.equal(result.cleared, false);
  assert.ok(result.failedSlots.length > 0);
  assert.equal(store.load().checkpoint.profileId, 'headphones');
});

test('rejects invented/unauthorized tone evidence and mismatched profile ids', () => {
  const device = new MemoryStorage();
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  assert.throws(() => store.save(session('car')), /mismatched profile/);
  const bad = session();
  bad.observations.push({
    toneId: 'fake', frequencyHz: 1000, digitalLevelDbfs: -10,
    channel: 'joint', response: 'heard', provenance: 'user-response',
  });
  assert.throws(() => store.save(bad), /Invalid or unverified/);
  assert.equal(device.data.size, 0);
});

test('results returned for preview cannot mutate persisted evidence', () => {
  const store = createLocalCheckpointStore({
    profileId: 'headphones', deviceStorage: new MemoryStorage(), tabStorage: null,
  });
  store.save(answered());
  const first = store.load().checkpoint;
  first.observations[0].response = 'not-heard';
  assert.equal(store.load().checkpoint.observations[0].response, 'heard');
});

test('photos, unknown metadata and raw scan objects are not serialized into checkpoints', () => {
  const device = new MemoryStorage();
  const store = createLocalCheckpointStore({ profileId: 'headphones', deviceStorage: device, tabStorage: null });
  const withImage = answered();
  withImage.photo = 'PRIVATE_IMAGE_DATA';
  withImage.scan = { raw: 'PRIVATE_IMAGE_DATA' };
  store.save(withImage);
  const fullStorage = Array.from(device.data.values()).join('');
  assert.equal(fullStorage.includes('PRIVATE_IMAGE_DATA'), false);
  assert.equal(store.load().checkpoint.photo, undefined);
});
