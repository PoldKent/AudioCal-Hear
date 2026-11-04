/**
 * Hear 3.0 P0 — local-only exam checkpoint prototype (D-051, D-054, D-059, D-060).
 *
 * Save states are explicitly device-local, tab-session or VOLATILE. No remote
 * transmission, accounts, photographs or automatic audio resumption.
 * The checksum detects accidental corruption; it is NOT encryption or a MAC.
 */
import { SESSION_SCHEMA_VERSION } from './session-contract.mjs';

export const CHECKPOINT_FORMAT = 'hear3-exam-checkpoint-v1';

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}
function defaultStorage(name) {
  try { return typeof window !== 'undefined' ? window[name] ?? null : null; }
  catch { return null; } // blocked storage or privacy mode
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }

function fingerprint(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
function sessionCopy(session, profileId) {
  ensure(session?.schemaVersion === SESSION_SCHEMA_VERSION && session.profileId === profileId,
    'Unknown checkpoint schema or mismatched profile');
  ensure(['ready', 'playing', 'paused', 'completed'].includes(session.status),
    'Invalid checkpoint status');
  const bounds = session.authorizedDigitalRangeDbfs;
  ensure(bounds && Number.isFinite(bounds.minDbfs) && Number.isFinite(bounds.maxDbfs)
    && bounds.minDbfs <= bounds.maxDbfs && bounds.maxDbfs <= 0,
    'Invalid stored digital range');
  ensure(session.routeId == null || typeof session.routeId === 'string', 'Invalid route id');
  const observations = session.observations;
  ensure(Array.isArray(observations) && observations.length <= 10000, 'Invalid observations');
  const verified = observations.map(observation => {
    ensure(observation && typeof observation.toneId === 'string' && observation.toneId
      && Number.isFinite(observation.frequencyHz) && observation.frequencyHz > 0
      && Number.isFinite(observation.digitalLevelDbfs)
      && observation.digitalLevelDbfs >= bounds.minDbfs && observation.digitalLevelDbfs <= bounds.maxDbfs
      && ['left', 'right', 'joint'].includes(observation.channel)
      && ['heard', 'not-heard'].includes(observation.response)
      && observation.provenance === 'user-response',
      'Invalid or unverified tone observation');
    return {
      toneId: observation.toneId, frequencyHz: observation.frequencyHz,
      digitalLevelDbfs: observation.digitalLevelDbfs, channel: observation.channel,
      response: observation.response, provenance: 'user-response',
    };
  });
  ensure(Array.isArray(session.invalidatedToneIds), 'Invalid interrupted-tone list');
  const invalidated = [];
  for (const id of session.invalidatedToneIds) {
    ensure(typeof id === 'string' && id.length > 0, 'Invalid interrupted tone id');
    if (!invalidated.includes(id)) invalidated.push(id);
  }
  if (session.currentTone != null) {
    ensure(typeof session.currentTone.toneId === 'string' && session.currentTone.toneId,
      'Invalid active tone id');
    if (!invalidated.includes(session.currentTone.toneId)) invalidated.push(session.currentTone.toneId);
  }

  // A restored browser has NOT verified its route or physical volume. Playing
  // and ready sessions become paused, never actively sounding after restore.
  const completed = session.status === 'completed';
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    profileId,
    routeId: session.routeId ?? null,
    authorizedDigitalRangeDbfs: { minDbfs: bounds.minDbfs, maxDbfs: bounds.maxDbfs },
    status: completed ? 'completed' : 'paused',
    currentTone: null,
    observations: verified,
    invalidatedToneIds: invalidated,
    routeCheckRequired: !completed,
    interruption: completed ? null : 'checkpoint-recovery',
  };
}

/**
 * Rehydrate a verified checkpoint only into the exact digital bounds of the
 * current exam. This step never asserts acoustic output compatibility.
 * The caller must perform a manual route check before using RESUME.
 */
export function normalizeRecoveredSession(checkpoint, { profileId, minDbfs, maxDbfs } = {}) {
  const normalized = sessionCopy(checkpoint, profileId);
  ensure(Number.isFinite(minDbfs) && Number.isFinite(maxDbfs)
    && normalized.authorizedDigitalRangeDbfs.minDbfs === minDbfs
    && normalized.authorizedDigitalRangeDbfs.maxDbfs === maxDbfs,
    'Recovered checkpoint digital bounds differ from this session');
  return normalized;
}

function encoded(revision, checkpoint) {
  const signed = { format: CHECKPOINT_FORMAT, revision, checkpoint };
  const bytes = JSON.stringify(signed);
  return JSON.stringify({ ...signed, checksum: fingerprint(bytes) });
}
function decoded(raw, profileId) {
  const obj = JSON.parse(raw);
  ensure(obj?.format === CHECKPOINT_FORMAT && Number.isSafeInteger(obj.revision)
    && obj.revision >= 1, 'Unknown checkpoint envelope');
  const checkpoint = sessionCopy(obj.checkpoint, profileId);
  ensure(obj.checksum === fingerprint(JSON.stringify({
    format: obj.format, revision: obj.revision, checkpoint: obj.checkpoint,
  })), 'Checkpoint integrity mismatch');
  return { revision: obj.revision, checkpoint };
}

export function createLocalCheckpointStore({
  profileId,
  deviceStorage = defaultStorage('localStorage'),
  tabStorage = defaultStorage('sessionStorage'),
} = {}) {
  ensure(typeof profileId === 'string' && /^[a-zA-Z0-9._-]{1,96}$/.test(profileId),
    'Checkpoint requires a stable profile id');
  const prefix = 'hear3:exam-checkpoint:' + profileId + ':';
  let volatileRecord = null;

  function inspect(storage, durability) {
    const records = [];
    let corrupt = false;
    let unavailable = !storage;
    if (!storage) return { records, corrupt, unavailable };
    for (const slot of [0, 1]) {
      let raw;
      try { raw = storage.getItem(prefix + slot); }
      catch { unavailable = true; break; }
      if (raw == null) continue;
      try {
        const record = decoded(raw, profileId);
        records.push({ ...record, durability });
      } catch { corrupt = true; }
    }
    return { records, corrupt, unavailable };
  }
  function current() {
    const device = inspect(deviceStorage, 'device-local');
    const tab = inspect(tabStorage, 'tab-session');
    const persisted = [...device.records, ...tab.records];
    const candidates = [...persisted, ...(volatileRecord ? [{ ...volatileRecord, durability: 'volatile' }] : [])];
    const best = candidates.sort((a, b) => b.revision - a.revision)[0] ?? null;
    return { device, tab, persisted, best };
  }
  function load() {
    const data = current();
    const warnings = [];
    if (data.device.corrupt || data.tab.corrupt) warnings.push('Some stored copies are damaged; recovered only verified data.');
    if (!data.best && (data.device.corrupt || data.tab.corrupt)) {
      warnings.push('No verified checkpoint could be recovered; existing damaged copies remain untouched.');
    }
    return {
      checkpoint: data.best ? copy(data.best.checkpoint) : null,
      durability: data.best?.durability ?? 'none',
      persistedOnDevice: data.best?.durability === 'device-local',
      warnings,
    };
  }
  function save(session) {
    const checkpoint = sessionCopy(session, profileId);
    const data = current();
    const revision = (data.best?.revision ?? 0) + 1;
    const raw = encoded(revision, checkpoint);
    volatileRecord = { revision, checkpoint: copy(checkpoint) };
    // Do not drop the latest progress merely because the durable snapshot
    // exceeds the per-slot size budget. Keep a temporary, exportable copy.
    if (raw.length > 131072) {
      return {
        durability: 'volatile', persistedOnDevice: false, exportAvailable: true,
        warning: 'Checkpoint is too large for local persistence. This session is temporary; export a backup before closing.',
      };
    }

    // If *no* valid device/tab copy survives but corrupt data exists, do not
    // erase possible recovery evidence. Keep only a volatile/exportable copy.
    if (data.persisted.length === 0 && (data.device.corrupt || data.tab.corrupt)) {
      return {
        durability: 'volatile', persistedOnDevice: false, exportAvailable: true,
        warning: 'Corrupt local copies were preserved. This session is temporary; export it before closing.',
      };
    }
    for (const [storage, durability] of [[deviceStorage, 'device-local'], [tabStorage, 'tab-session']]) {
      if (!storage) continue;
      const key = prefix + (revision % 2);
      try {
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) throw new Error('Read-back mismatch');
        decoded(raw, profileId); // ensure the committed envelope is valid
        return {
          durability,
          persistedOnDevice: durability === 'device-local',
          exportAvailable: true,
          warning: durability === 'device-local'
            ? 'Stored in this browser, subject to browser clearing and device loss.'
            : 'Only tab-session storage succeeded: do not assume it survives closing the browser; export a backup.',
        };
      } catch { /* next compatible local storage; never a remote fallback */ }
    }
    return {
      durability: 'volatile', persistedOnDevice: false, exportAvailable: true,
      warning: 'No compatible storage confirmed the write. This session may be lost on close; export it.',
    };
  }
  function exportCheckpoint() {
    const state = load();
    ensure(state.checkpoint, 'No checkpoint to export');
    return JSON.stringify({
      format: CHECKPOINT_FORMAT, exportedAt: new Date().toISOString(),
      checkpoint: state.checkpoint,
    }, null, 2);
  }
  function clear({ confirmed = false } = {}) {
    ensure(confirmed === true, 'Explicit deletion confirmation required');
    const errors = [];
    for (const [storage, name] of [[deviceStorage, 'device-local'], [tabStorage, 'tab-session']]) {
      if (!storage) continue;
      for (const slot of [0, 1]) {
        try {
          storage.removeItem(prefix + slot);
          if (storage.getItem(prefix + slot) !== null) throw new Error('Deletion could not be verified');
        } catch { errors.push(name + ':' + slot); }
      }
    }
    volatileRecord = null;
    return {
      cleared: errors.length === 0,
      warning: errors.length ? 'Some checkpoint copies could not be deleted; retry or clear browser storage.' : null,
      failedSlots: errors,
    };
  }
  return Object.freeze({ load, save, exportCheckpoint, clear });
}
