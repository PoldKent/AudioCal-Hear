/**
 * Hear 3.0 P0 — isolated audio-session/checkpoint integration.
 * Explicit user recovery; automatic persistence after completed actions.
 * Never automatically resumes a tone or claims an unverified write succeeded.
 */
import { createHear3AudioSession } from './audio-session-controller.mjs';
import { createLocalCheckpointStore, normalizeRecoveredSession } from './local-checkpoint-store.mjs';

function check(ok, message) { if (!ok) throw new Error(message); }
function copied(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }

export function createCheckpointedHear3AudioSession({
  profileId, routeId = null, minDbfs, maxDbfs,
  checkpointStore = null,
  adapterFactory,
} = {}) {
  const store = checkpointStore ?? createLocalCheckpointStore({ profileId });
  check(store && typeof store.load === 'function' && typeof store.save === 'function'
    && typeof store.exportCheckpoint === 'function', 'Invalid local checkpoint store');
  const options = { profileId, routeId, minDbfs, maxDbfs, adapterFactory };
  let controller = createHear3AudioSession(options);
  let touched = false;
  let disposed = false;
  let persistence = {
    durability: 'none',
    persistedOnDevice: false,
    warning: 'No checkpoint has been saved during this session.',
  };
  let pending = store.load();

  function ensureLive() { check(!disposed, 'Checkpointed controller is disposed'); }

  function attemptSave() {
    try {
      const result = store.save(controller.getSession());
      persistence = {
        durability: result.durability,
        persistedOnDevice: result.persistedOnDevice === true,
        warning: result.warning ?? null,
      };
    } catch (error) {
      // A storage failure must never be reported as persistence. The caller
      // must display the warning; no remote fallback is attempted.
      persistence = {
        durability: 'unverified',
        persistedOnDevice: false,
        warning: 'Checkpoint write could not be verified: ' + (error?.message ?? String(error)),
      };
    }
    return copied(persistence);
  }

  function update(action) {
    ensureLive();
    touched = true;
    pending = null;
    // Even a rejected transition may have safely interrupted an active tone
    // (e.g. FINISH while playing). Save that fail-closed pause as well.
    try { return action(); }
    finally { attemptSave(); }
  }

  function getSession() {
    ensureLive();
    return controller.getSession();
  }

  function getPersistence() {
    ensureLive();
    return copied(persistence);
  }

  function getRecoveryProposal() {
    ensureLive();
    if (touched) return { available: false, warning: 'This session already has new activity.' };
    const data = store.load();
    pending = data;
    return {
      available: Boolean(data.checkpoint),
      durability: data.durability,
      persistedOnDevice: data.persistedOnDevice,
      observationCount: data.checkpoint?.observations?.length ?? 0,
      warnings: [...(data.warnings ?? [])],
      requiresManualOutputCheck: Boolean(data.checkpoint && data.checkpoint.status !== 'completed'),
    };
  }

  async function recover({ userInitiated = false } = {}) {
    ensureLive();
    check(userInitiated === true, 'Recovery requires an explicit user action');
    check(!touched, 'Cannot overwrite a session after new activity');
    const saved = store.load();
    check(saved.checkpoint, 'No verified checkpoint is available');
    // Normalize and verify BEFORE destroying the current controller.
    const recovered = normalizeRecoveredSession(saved.checkpoint, options);
    await controller.dispose();
    controller = createHear3AudioSession({ ...options, restoredSession: recovered });
    touched = true;
    pending = null;
    persistence = {
      durability: saved.durability,
      persistedOnDevice: saved.persistedOnDevice,
      warning: saved.warnings?.join(' ') || (saved.durability === 'volatile'
        ? 'Recovered from memory only; export a backup.'
        : 'Recovered locally; check the audio output before resuming.'),
    };
    return { restored: true, state: controller.getSession(), persistence: copied(persistence) };
  }

  async function startTone(args) {
    ensureLive();
    touched = true;
    pending = null;
    // startTone enters 'playing' synchronously before its asynchronous Web
    // Audio operation; checkpoint that unfinished tone as needing retest.
    let operation;
    try { operation = controller.startTone(args); }
    catch (error) { attemptSave(); throw error; }
    attemptSave();
    try {
      const result = await operation;
      attemptSave();
      return result;
    } catch (error) {
      attemptSave();
      throw error;
    }
  }

  function answer(response) { return update(() => controller.answer(response)); }
  function interrupt(options) { return update(() => controller.interrupt(options)); }
  function routeChanged(routeId) { return update(() => controller.routeChanged(routeId)); }
  function confirmRoute(options) { return update(() => controller.confirmRoute(options)); }
  function resume(options) { return update(() => controller.resume(options)); }
  function finish() { return update(() => controller.finish()); }

  function exportCheckpoint() {
    ensureLive();
    return store.exportCheckpoint();
  }

  function clearCheckpoint({ confirmed = false } = {}) {
    ensureLive();
    check(typeof store.clear === 'function', 'Checkpoint deletion not available');
    const result = store.clear({ confirmed });
    persistence = { durability: result.cleared ? 'none' : 'unverified', persistedOnDevice: false, warning: result.warning ?? null };
    pending = null;
    return copied(result);
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    await controller.dispose();
  }

  return Object.freeze({
    getSession, getPersistence, getRecoveryProposal, recover, startTone,
    answer, interrupt, routeChanged, confirmRoute, resume, finish,
    exportCheckpoint, clearCheckpoint, dispose,
  });
}
