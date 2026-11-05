/**
 * Hear 3.0: couples the pure session state to the Web Audio adapter.
 * Deliberately not wired into the legacy Hear 2.0 UI until integration QA.
 */
import { createSession, transitionSession } from './session-contract.mjs';
import { createWebAudioToneAdapter } from './web-audio-adapter.mjs';
import { normalizeRecoveredSession } from './local-checkpoint-store.mjs';

export function createHear3AudioSession({
  profileId, routeId = null, minDbfs, maxDbfs,
  adapterFactory = createWebAudioToneAdapter,
  restoredSession = null,
} = {}) {
  const fresh = createSession({ profileId, routeId, minDbfs, maxDbfs });
  let session = restoredSession === null ? fresh : normalizeRecoveredSession(restoredSession, { profileId, minDbfs, maxDbfs });
  let disposed = false;
  let epoch = 0;
  let audibleToneId = null;

  const assertLive = () => { if (disposed) throw new Error('Session controller is disposed'); };

  const pause = (event) => {
    epoch++;
    audibleToneId = null;
    adapter.stop();
    if (['playing', 'ready', 'paused'].includes(session.status)) {
      session = transitionSession(session, event);
    }
    return getSession();
  };

  const onToneEnded = ({ toneId }) => {
    if (disposed || session.status !== 'playing' || session.currentTone?.toneId !== toneId) return;
    // Expiry without an explicit response is NOT evidence for 'not heard'.
    pause({ type: 'INTERRUPT', routeMayHaveChanged: false });
  };

  const adapter = adapterFactory({
    onToneEnded,
    onInterrupted: ({ reason,routeMayHaveChanged=false }) => {
      if (disposed) return;
      // A context suspension, output-list change, or pagehide invalidates
      // confidence in the physical route and volume. No automatic resume.
      pause({ type: 'INTERRUPT',
        routeMayHaveChanged:routeMayHaveChanged===true||
          ['pagehide','devicechange','context-suspended'].includes(reason) });
    },
  });

  function getSession() {
    // Prevent external mutation of the authorized digital range / evidence.
    return JSON.parse(JSON.stringify(session));
  }

  async function startTone({ toneId, frequencyHz, digitalLevelDbfs, channel = 'joint', durationSeconds = 5 }) {
    assertLive();
    const next = transitionSession(session, {
      type: 'START_TONE', toneId, frequencyHz, digitalLevelDbfs, channel,
    });
    session = next;
    audibleToneId = null;
    const request = ++epoch;
    try {
      const result = await adapter.playTone({
        toneId, frequencyHz, digitalLevelDbfs, channel, durationSeconds,
        authorizedDigitalRangeDbfs: session.authorizedDigitalRangeDbfs,
      });
      if (disposed || request !== epoch || session.status !== 'playing' || session.currentTone?.toneId !== toneId) {
        // Never stop here: a newer operation may already be playing.
        return { started: false, reason: 'obsolete' };
      }
      if (!result.started) {
        pause({ type: 'INTERRUPT', routeMayHaveChanged: false });
        return result;
      }
      audibleToneId = toneId;
      return result;
    } catch (error) {
      if (!disposed && request === epoch && session.status === 'playing' && session.currentTone?.toneId === toneId) {
        pause({ type: 'INTERRUPT', routeMayHaveChanged: true });
      }
      throw error;
    }
  }

  function answer(response) {
    assertLive();
    if (session.status !== 'playing' || !session.currentTone || audibleToneId !== session.currentTone.toneId) {
      throw new Error('Cannot record a response before the tone has started');
    }
    // The UI's last known playing state is insufficient if Web Audio has
    // just suspended (e.g. Bluetooth route/call) before a statechange event.
    // Reject the response rather than treating silence as hearing evidence.
    const playback = adapter.getStatus?.();
    if (playback && (playback.activeToneId !== session.currentTone.toneId
      || playback.contextState !== 'running' || playback.visible === false)) {
      pause({ type: 'INTERRUPT', routeMayHaveChanged: playback.contextState !== 'running' });
      throw new Error('Audio playback is no longer verified; response discarded');
    }
    // Silence before recording a response; invalid answers also fail closed.
    epoch++;
    audibleToneId = null;
    adapter.stop();
    try {
      session = transitionSession(session, { type: 'ANSWER', response });
    } catch (error) {
      session = transitionSession(session, { type: 'INTERRUPT' });
      throw error;
    }
    return getSession();
  }

  function interrupt({ routeMayHaveChanged = false } = {}) {
    assertLive();
    return pause({ type: 'INTERRUPT', routeMayHaveChanged });
  }

  function routeChanged(routeId = null) {
    assertLive();
    return pause({ type: 'ROUTE_CHANGED', routeId });
  }

  function confirmRoute({ userConfirmed = false } = {}) {
    assertLive();
    session = transitionSession(session, { type: 'CONFIRM_ROUTE', confirmed: userConfirmed === true });
    return getSession();
  }

  function resume({ userInitiated = false } = {}) {
    assertLive();
    session = transitionSession(session, { type: 'RESUME', userInitiated: userInitiated === true });
    // Never start an oscillator merely because a session resumed.
    return getSession();
  }

  function finish() {
    assertLive();
    if (session.status === 'playing') {
      pause({ type: 'INTERRUPT', routeMayHaveChanged: false });
      throw new Error('Finish only from ready state');
    }
    const completed = transitionSession(session, { type: 'FINISH' });
    epoch++;
    audibleToneId = null;
    adapter.stop();
    session = completed;
    return getSession();
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    epoch++;
    audibleToneId = null;
    await adapter.dispose();
  }

  return Object.freeze({ getSession, startTone, answer, interrupt, routeChanged, confirmRoute, resume, finish, dispose });
}
