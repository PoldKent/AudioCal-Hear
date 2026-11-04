/**
 * Hear 3.0 P0 — explicit local checkpoint import (D-051, D-054, D-059, D-060).
 * Accepts only the single-profile checkpoint backup format, not a full
 * device/history archive. No network, automatic restore or audio playback.
 * FNV-1a is for accidental corruption, NOT integrity against hostile edits.
 */
import { CHECKPOINT_FORMAT, checkpointFingerprint, normalizeRecoveredSession }
  from './local-checkpoint-store.mjs';

export const MAX_CHECKPOINT_BACKUP_CHARS = 1_048_576;
const check = (ok, message) => { if (!ok) throw new Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));

function verifyBackup(text, options) {
  check(typeof text === 'string' && text.length > 0 &&
    text.length <= MAX_CHECKPOINT_BACKUP_CHARS, 'Backup text is missing or exceeds the size limit');
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Invalid backup JSON'); }
  check(data && typeof data === 'object' && !Array.isArray(data) &&
    data.format === CHECKPOINT_FORMAT &&
    data.checkpoint && typeof data.checkpoint === 'object' &&
    !Array.isArray(data.checkpoint), 'Unknown checkpoint backup format');
  // For this milestone imports must be exact single-profile exports. Unknown
  // root fields may indicate a different format or an unsafe archive.
  check(Object.keys(data).every(key => ['format', 'checkpoint', 'exportedAt', 'integrity'].includes(key)),
    'Unexpected backup fields');
  check(data.exportedAt === undefined || (typeof data.exportedAt === 'string' &&
    Number.isFinite(Date.parse(data.exportedAt))),
    'Invalid backup export timestamp');

  const rawCheckpoint = JSON.stringify(data.checkpoint);
  let integrity = 'legacy-unverified';
  if (data.integrity !== undefined) {
    check(data.integrity && typeof data.integrity === 'object' &&
      !Array.isArray(data.integrity) &&
      Object.keys(data.integrity).length === 2 &&
      data.integrity.algorithm === 'fnv1a32' &&
      typeof data.integrity.value === 'string',
      'Unsupported backup checksum');
    check(data.integrity.value === checkpointFingerprint(rawCheckpoint),
      'Backup checksum mismatch');
    integrity = 'accidental-corruption-check-passed';
  }
  // Re-use exactly the approved session validator. This rejects another
  // profile, altered digital authorization, impossible tone evidence, and
  // unrecognized schema versions. It ALWAYS rehydrates as paused/completed.
  const checkpoint = normalizeRecoveredSession(data.checkpoint, options);
  return { checkpoint, integrity, exportedAt: data.exportedAt ?? null };
}

function baseline(store) {
  const loaded = store.load();
  check(loaded && typeof loaded === 'object', 'Invalid checkpoint storage response');
  return {
    loaded,
    digest: checkpointFingerprint(JSON.stringify({
      checkpoint: loaded.checkpoint ?? null,
      revision: loaded.revision ?? null,
      durability: loaded.durability ?? 'none',
      persistedOnDevice: loaded.persistedOnDevice === true,
      warnings: loaded.warnings ?? [],
    })),
  };
}

export function createCheckpointBackupTransfer({ store, profileId, minDbfs, maxDbfs } = {}) {
  check(store && typeof store.load === 'function' && typeof store.save === 'function',
    'A local checkpoint store is required');
  check(typeof profileId === 'string' && profileId.length > 0
    && Number.isFinite(minDbfs) && Number.isFinite(maxDbfs) &&
    minDbfs <= maxDbfs && maxDbfs <= 0,
    'A target profile and its authorized digital bounds are required');

  let candidate = null;

  function discard() { candidate = null; }

  function preview(backupText) {
    candidate = null; // an invalid new file must not leave an older import armed
    const verified = verifyBackup(backupText, { profileId, minDbfs, maxDbfs });
    const existing = baseline(store);
    candidate = {
      checkpoint: clone(verified.checkpoint),
      integrity: verified.integrity,
      baselineDigest: existing.digest,
    };
    return Object.freeze({
      profileId,
      observations: verified.checkpoint.observations.length,
      invalidatedTones: verified.checkpoint.invalidatedToneIds.length,
      restoredStatus: verified.checkpoint.status,
      requiresManualOutputCheck: verified.checkpoint.status !== 'completed',
      replacesExisting: Boolean(existing.loaded.checkpoint),
      existingObservations: existing.loaded.checkpoint?.observations?.length ?? 0,
      backupIntegrity: verified.integrity,
      exportedAt: verified.exportedAt,
      warning: verified.integrity === 'legacy-unverified'
        ? 'Legacy backup has no checksum; schema is validated but accidental damage cannot be detected.'
        : 'Checksum checks accidental corruption only. It does not authenticate the backup.',
    });
  }

  function commit({ userInitiated = false, confirmReplace = false } = {}) {
    check(userInitiated === true, 'Backup import requires explicit user action');
    check(candidate !== null, 'Preview a valid backup before importing');
    const expected = candidate;
    // Reject if another session/tab has visibly changed local data since
    // preview. This is not an atomic cross-tab transaction.
    const existing = baseline(store);
    check(existing.digest === expected.baselineDigest,
      'Local checkpoint changed since preview; inspect again');
    check(!existing.loaded.checkpoint || confirmReplace === true,
      'Replacing an existing checkpoint requires explicit confirmation');
    // Never retry a stale import after a failed/successful commit.
    candidate = null;
    const saved = store.save(clone(expected.checkpoint));
    check(saved && typeof saved.durability === 'string', 'Invalid storage save result');
    return {
      imported: true,
      durability: saved.durability,
      persistedOnDevice: saved.persistedOnDevice === true,
      restoredStatus: expected.checkpoint.status,
      requiresManualOutputCheck: expected.checkpoint.status !== 'completed',
      warning: saved.warning || null,
      // This import changes the store only; the active audio controller is
      // deliberately NOT replaced or automatically resumed.
      requiresNewRecoveryAction: true,
    };
  }

  return Object.freeze({ preview, commit, discard });
}
