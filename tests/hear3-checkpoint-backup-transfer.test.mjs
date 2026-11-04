import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, transitionSession } from '../src/hear3/session-contract.mjs';
import { createLocalCheckpointStore, CHECKPOINT_FORMAT } from '../src/hear3/local-checkpoint-store.mjs';
import { createCheckpointBackupTransfer, MAX_CHECKPOINT_BACKUP_CHARS }
  from '../src/hear3/checkpoint-backup-transfer.mjs';

class MemoryStorage {
  constructor() { this.items = new Map(); this.failSet = false; }
  getItem(k) { return this.items.get(k) ?? null; }
  setItem(k,v) { if (this.failSet) throw Error('Quota exceeded'); this.items.set(k,v); }
  removeItem(k) { this.items.delete(k); }
}
const bounds = { minDbfs: -85, maxDbfs: -40 };
const active = (profileId='headphones') => createSession({ profileId, ...bounds });
function observed(profileId='headphones', response='heard') {
  const playing = transitionSession(active(profileId), {
    type: 'START_TONE', toneId: 't1', frequencyHz: 1000,
    digitalLevelDbfs: -55, channel: 'joint',
  });
  return transitionSession(playing, { type:'ANSWER', response });
}
function fixture(profileId='headphones', storage=new MemoryStorage()) {
  const store = createLocalCheckpointStore({ profileId, deviceStorage:storage, tabStorage:null });
  const transfer = createCheckpointBackupTransfer({ store, profileId, ...bounds });
  return { store, transfer, storage };
}
function backupFrom(session) {
  const a = fixture(session.profileId);
  a.store.save(session);
  return a.store.exportCheckpoint();
}

test('new JSON backup carries an accidental-corruption checksum with explicit limitations', () => {
  const backup=JSON.parse(backupFrom(observed()));
  assert.equal(backup.format,CHECKPOINT_FORMAT);
  assert.equal(backup.integrity.algorithm,'fnv1a32');
  assert.match(backup.integrity.value,/^[0-9a-f]{8}$/);
  assert.ok(typeof backup.exportedAt==='string');
});

test('preview never writes and import requires explicit approval even when destination is empty', () => {
  const f=fixture();
  const preview=f.transfer.preview(backupFrom(observed()));
  assert.equal(preview.profileId,'headphones');
  assert.equal(preview.observations,1);
  assert.equal(preview.restoredStatus,'paused');
  assert.equal(preview.requiresManualOutputCheck,true);
  assert.equal(preview.backupIntegrity,'accidental-corruption-check-passed');
  assert.equal(f.storage.items.size,0);
  assert.throws(()=>f.transfer.commit(),/explicit user action/);
  assert.equal(f.storage.items.size,0);
  const result=f.transfer.commit({userInitiated:true});
  assert.equal(result.imported,true);
  assert.equal(result.persistedOnDevice,true);
  assert.equal(result.requiresNewRecoveryAction,true);
  assert.equal(f.store.load().checkpoint.status,'paused');
  assert.deepEqual(f.store.load().checkpoint.observations.map(o=>o.response),['heard']);
});

test('a previous checkpoint cannot be replaced without an affirmative confirmation', () => {
  const f=fixture();
  f.store.save(observed('headphones','not-heard'));
  const preview=f.transfer.preview(backupFrom(observed('headphones','heard')));
  assert.equal(preview.replacesExisting,true);
  assert.equal(preview.existingObservations,1);
  assert.throws(()=>f.transfer.commit({userInitiated:true}),/explicit confirmation/);
  assert.equal(f.store.load().checkpoint.observations[0].response,'not-heard');
  const result=f.transfer.commit({userInitiated:true,confirmReplace:true});
  assert.equal(result.imported,true);
  assert.equal(f.store.load().checkpoint.observations[0].response,'heard');
});

test('stale preview cannot overwrite an intervening checkpoint write', () => {
  const f=fixture();
  f.store.save(observed());
  f.transfer.preview(backupFrom(observed('headphones','not-heard')));
  f.store.save(observed());
  assert.throws(()=>f.transfer.commit({userInitiated:true,confirmReplace:true}),/changed since preview/);
  assert.equal(f.store.load().checkpoint.observations[0].response,'heard');
});

test('bad JSON and unsupported formats never arm an earlier preview', () => {
  const f=fixture();
  f.transfer.preview(backupFrom(observed()));
  assert.throws(()=>f.transfer.preview('{not-json'),/Invalid backup JSON/);
  assert.throws(()=>f.transfer.commit({userInitiated:true}),/Preview a valid backup/);
  const wrong=JSON.stringify({format:'hear4-future',checkpoint:active()});
  assert.throws(()=>f.transfer.preview(wrong),/Unknown checkpoint backup format/);
  assert.equal(f.storage.items.size,0);
});

test('integrity mismatch on a modified exported response blocks import', () => {
  const f=fixture();
  const backup=JSON.parse(backupFrom(observed()));
  backup.checkpoint.observations[0].response='not-heard';
  assert.throws(()=>f.transfer.preview(JSON.stringify(backup)),/checksum mismatch/);
  assert.equal(f.storage.items.size,0);
});

test('legacy checksum-free export is schema-checked and warned about, never silently authenticated', () => {
  const f=fixture();
  const old=JSON.parse(backupFrom(observed()));
  delete old.integrity;
  const result=f.transfer.preview(JSON.stringify(old));
  assert.equal(result.backupIntegrity,'legacy-unverified');
  assert.match(result.warning,/no checksum/);
  f.transfer.discard();
  assert.throws(()=>f.transfer.commit({userInitiated:true}),/Preview a valid backup/);
});

test('a different profile and unauthorized digital range cannot be imported', () => {
  const f=fixture('headphones');
  assert.throws(()=>f.transfer.preview(backupFrom(observed('car'))),/mismatched profile/);
  const old=JSON.parse(backupFrom(observed()));
  delete old.integrity;
  old.checkpoint.authorizedDigitalRangeDbfs.maxDbfs=-30;
  assert.throws(()=>f.transfer.preview(JSON.stringify(old)),/digital bounds differ/);
  assert.equal(f.storage.items.size,0);
});

test('unverified observations and unsupported schema are rejected even without checksum', () => {
  const f=fixture();
  const backup=JSON.parse(backupFrom(observed()));
  delete backup.integrity;
  backup.checkpoint.observations[0].digitalLevelDbfs=0;
  assert.throws(()=>f.transfer.preview(JSON.stringify(backup)),/Invalid or unverified/);
  backup.checkpoint=active();
  backup.checkpoint.schemaVersion=999;
  assert.throws(()=>f.transfer.preview(JSON.stringify(backup)),/Unknown checkpoint schema/);
});

test('incomplete audio is always restored as paused, never playing', () => {
  const f=fixture();
  const playing=transitionSession(active(),{
    type:'START_TONE',toneId:'pending',frequencyHz:600,digitalLevelDbfs:-60,channel:'joint',
  });
  const backup=backupFrom(playing);
  const preview=f.transfer.preview(backup);
  assert.equal(preview.restoredStatus,'paused');
  assert.equal(preview.invalidatedTones,1);
  f.transfer.commit({userInitiated:true});
  const restored=f.store.load().checkpoint;
  assert.equal(restored.currentTone,null);
  assert.deepEqual(restored.invalidatedToneIds,['pending']);
  assert.equal(restored.routeCheckRequired,true);
});

test('completed exam imports as completed and cannot resume playback', () => {
  const f=fixture();
  const done=transitionSession(observed(),{type:'FINISH'});
  const preview=f.transfer.preview(backupFrom(done));
  assert.equal(preview.restoredStatus,'completed');
  assert.equal(preview.requiresManualOutputCheck,false);
  f.transfer.commit({userInitiated:true});
  assert.equal(f.store.load().checkpoint.status,'completed');
});

test('blocked storage imports only to temporary memory with accurate warning', () => {
  const storage=new MemoryStorage();
  storage.failSet=true;
  const f=fixture('headphones',storage);
  f.transfer.preview(backupFrom(observed()));
  const result=f.transfer.commit({userInitiated:true});
  assert.equal(result.imported,true);
  assert.equal(result.durability,'volatile');
  assert.equal(result.persistedOnDevice,false);
  assert.match(result.warning,/may be lost/);
  assert.equal(f.store.load().checkpoint.observations.length,1);
});

test('oversized backup is rejected before parsing or modifying any local checkpoint', () => {
  const f=fixture();
  assert.throws(()=>f.transfer.preview(' '.repeat(MAX_CHECKPOINT_BACKUP_CHARS+1)),/size limit/);
  assert.equal(f.storage.items.size,0);
});

test('unknown root fields cannot be smuggled into the single-profile import', () => {
  const f=fixture();
  const backup=JSON.parse(backupFrom(observed()));
  backup.userPicture='private-image';
  assert.throws(()=>f.transfer.preview(JSON.stringify(backup)),/Unexpected backup fields/);
});

test('exported backup import never changes another profile in shared browser storage', () => {
  const storage=new MemoryStorage();
  const other=fixture('car',storage);
  other.store.save(observed('car','not-heard'));
  const target=fixture('headphones',storage);
  target.transfer.preview(backupFrom(observed()));
  target.transfer.commit({userInitiated:true});
  assert.equal(other.store.load().checkpoint.observations[0].response,'not-heard');
  assert.equal(target.store.load().checkpoint.profileId,'headphones');
});
