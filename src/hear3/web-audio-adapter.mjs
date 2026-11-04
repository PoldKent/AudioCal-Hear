/**
 * Hear 3.0 - isolated Web Audio tone adapter (D-003, D-006, D-035,
 * D-037, D-054..057, D-062). Does not infer sound pressure (dB SPL).
 *
 * Caller must supply the already authorized digital range. This module
 * never raises that range, physical device volume, or sink selection.
 */
function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function defaultCreateContext() {
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  assert(typeof AC === 'function', 'Web Audio is unavailable');
  return new AC();
}

function defaultIsVisible() {
  return typeof document === 'undefined' || !document.hidden;
}

function disconnectQuietly(node) {
  try { node?.disconnect(); } catch { /* teardown is best effort */ }
}

export function createWebAudioToneAdapter({
  createContext = defaultCreateContext,
  isVisible = defaultIsVisible,
  onToneEnded = () => {},
  onInterrupted = () => {},
  visibilityTarget = typeof document === 'undefined' ? null : document,
  lifecycleTarget = typeof window === 'undefined' ? null : window,
} = {}) {
  assert(typeof createContext === 'function', 'Invalid context factory');
  assert(typeof isVisible === 'function', 'Invalid visibility callback');
  assert(typeof onToneEnded === 'function', 'Invalid onToneEnded callback');
  assert(typeof onInterrupted === 'function', 'Invalid onInterrupted callback');

  let context = null;
  let active = null;
  let generation = 0;
  let disposed = false;

  function removeActive(entry, silence = false) {
    if (!entry) return;
    if (silence) {
      // Zero amplitude at the next audio processing quantum; never claim
      // this guarantees instantaneous silence at the physical transducer.
      try {
        const now = entry.ctx.currentTime;
        entry.gain.gain.cancelScheduledValues(now);
        entry.gain.gain.setValueAtTime(0, now);
      } catch { /* stop oscillator and disconnect below */ }
      try { entry.osc.stop(entry.ctx.currentTime); } catch { /* may have ended */ }
    }
    if (entry.osc) entry.osc.onended = null;
    disconnectQuietly(entry.osc);
    disconnectQuietly(entry.pan);
    disconnectQuietly(entry.gain);
  }

  function stop() {
    // Invalidates an await of context.resume(), even when no node exists yet.
    generation++;
    const previous = active;
    active = null;
    removeActive(previous, true);
    return Boolean(previous);
  }

  async function playTone({
    toneId,
    frequencyHz,
    digitalLevelDbfs,
    channel = 'joint',
    authorizedDigitalRangeDbfs,
    durationSeconds = 5,
  } = {}) {
    assert(!disposed, 'Adapter is disposed');
    // A malformed replacement tone must not leave a previous tone sounding.
    stop();
    const request = generation;
    const limits = authorizedDigitalRangeDbfs;
    assert(limits && Number.isFinite(limits.minDbfs) && Number.isFinite(limits.maxDbfs)
      && limits.minDbfs <= limits.maxDbfs && limits.maxDbfs <= 0,
      'Invalid authorized digital range');
    assert(Number.isFinite(digitalLevelDbfs) && digitalLevelDbfs >= limits.minDbfs
      && digitalLevelDbfs <= limits.maxDbfs, 'Digital level exceeds authorized limits');
    assert(Number.isFinite(frequencyHz) && frequencyHz > 0, 'Invalid tone frequency');
    assert(Number.isFinite(durationSeconds) && durationSeconds > 0 && durationSeconds <= 30,
      'Invalid duration');
    assert(typeof toneId === 'string' && toneId.length > 0, 'Tone id required');
    assert(['left', 'right', 'joint'].includes(channel), 'Invalid channel');
    assert(isVisible(), 'Page is hidden');

    if (context === null) {
      context = createContext();
      assert(context && typeof context.createOscillator === 'function'
        && typeof context.createGain === 'function', 'Required Web Audio features unavailable');
      context.addEventListener?.('statechange', handleContextStateChange);
    }
    const ctx = context;
    if (ctx.state !== 'running') {
      assert(typeof ctx.resume === 'function', 'Audio context cannot resume');
      await ctx.resume();
    }
    if (disposed || request !== generation || !isVisible()) {
      return { started: false, reason: 'cancelled' };
    }
    assert(ctx.state === 'running', 'Audio context is not running');
    assert(Number.isFinite(ctx.sampleRate) && frequencyHz < ctx.sampleRate / 2,
      'Frequency exceeds the device Nyquist limit');
    if (channel !== 'joint') {
      assert(typeof ctx.createStereoPanner === 'function', 'Independent channels unavailable');
    }

    let osc;
    let gain;
    let pan;
    try {
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      if (channel !== 'joint') pan = ctx.createStereoPanner();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);
      if (pan) {
        pan.pan.setValueAtTime(channel === 'left' ? -1 : 1, ctx.currentTime);
        osc.connect(pan);
        pan.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(ctx.destination);
      // dBFS digital peak/amplitude estimate, not an acoustic SPL guarantee.
      const amplitude = 10 ** (digitalLevelDbfs / 20);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(amplitude, now + 0.004);
      const entry = { toneId, osc, gain, pan, ctx };
      osc.onended = () => {
        if (active !== entry) return;
        active = null;
        removeActive(entry, false);
        onToneEnded({ toneId });
      };
      // Audio processing is scheduled, never started at a level outside limits.
      active = entry;
      osc.start(now);
      osc.stop(now + durationSeconds);
      return { started: true, toneId };
    } catch (error) {
      if (active?.osc === osc) active = null;
      removeActive({ osc, gain, pan, ctx }, true);
      throw error;
    }
  }

  function getStatus() {
    return Object.freeze({
      disposed,
      activeToneId: active?.toneId ?? null,
      contextState: context?.state ?? 'uninitialized',
      visible: isVisible(),
    });
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    const old = context;
    context = null;
    old?.removeEventListener?.('statechange', handleContextStateChange);
    visibilityTarget?.removeEventListener?.('visibilitychange', handleVisibility);
    lifecycleTarget?.removeEventListener?.('pagehide', handlePageHide);
    if (old && typeof old.close === 'function' && old.state !== 'closed') {
      await old.close();
    }
  }

  const handleContextStateChange = () => {
    if (disposed || !active || context?.state === 'running') return;
    stop();
    try { onInterrupted({ reason: 'context-suspended' }); } catch { /* audio already stopped */ }
  };
  const handleVisibility = () => {
    if (!isVisible() && !disposed) { stop(); onInterrupted({ reason: 'hidden' }); }
  };
  const handlePageHide = () => {
    if (!disposed) { stop(); onInterrupted({ reason: 'pagehide' }); }
  };
  visibilityTarget?.addEventListener?.('visibilitychange', handleVisibility);
  lifecycleTarget?.addEventListener?.('pagehide', handlePageHide);

  return Object.freeze({ playTone, stop, dispose, getStatus });
}
