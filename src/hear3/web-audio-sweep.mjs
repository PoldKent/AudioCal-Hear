/**
 * Hear 3.0 P0: isolated, bounded Web Audio frequency sweep.
 * D-006=A, D-028–030, D-037, D-054–057 and D-063.
 *
 * The sweep only captures subjective user reports. It does NOT calibrate
 * dB SPL, prove acoustic safety, identify a physical output device, measure
 * hearing thresholds, or calculate equalizer gains.
 */
import { createSweepPlan, addSweepReport, frequencyAtSweepTime } from './sweep-planner.mjs';

// Conservative provisional SOFTWARE cap for automatic exploration only.
// Never claim that -42 dBFS implies a safe physical listening level.
export const SWEEP_DIGITAL_CEILING_DBFS = -42;

function requireValue(ok, message) {
  if (!ok) throw new Error(message);
}

function defaultContext() {
  const Constructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  requireValue(typeof Constructor === 'function', 'Web Audio is unavailable');
  return new Constructor();
}

function defaultVisible() {
  return typeof document === 'undefined' || !document.hidden;
}

function cleanup(entry, silence) {
  if (!entry) return;
  const { oscillator, gain, context } = entry;
  if (silence) {
    try {
      const at = context.currentTime;
      gain?.gain?.cancelScheduledValues(at);
      gain?.gain?.setValueAtTime(0, at);
    } catch { /* still attempt to stop and disconnect */ }
    try { oscillator?.stop(context.currentTime); } catch { /* already stopped */ }
  }
  if (oscillator) oscillator.onended = null;
  try { oscillator?.disconnect(); } catch { /* best effort */ }
  try { gain?.disconnect(); } catch { /* best effort */ }
}

export function createWebAudioSweepSession({
  createContext = defaultContext,
  isVisible = defaultVisible,
  onStateChange = () => {},
  visibilityTarget = typeof document === 'undefined' ? null : document,
  lifecycleTarget = typeof window === 'undefined' ? null : window,
} = {}) {
  requireValue(typeof createContext === 'function', 'Invalid context factory');
  requireValue(typeof isVisible === 'function', 'Invalid visibility check');
  requireValue(typeof onStateChange === 'function', 'Invalid state callback');

  let context = null;
  let active = null;
  let state = 'idle';
  let reason = null;
  let currentPlan = null;
  let digitalLevelDbfs = null;
  let reports = [];
  let startedAt = null;
  let generation = 0;
  let disposed = false;

  function snapshot() {
    const elapsedSeconds = state === 'running' && active && startedAt !== null
      ? Math.max(0, Math.min(currentPlan.durationSeconds, context.currentTime - startedAt))
      : null;
    return {
      status: state,
      reason,
      plan: currentPlan ? { ...currentPlan } : null,
      digitalLevelDbfs,
      reports: reports.map(report => ({ ...report })),
      elapsedSeconds,
      frequencyHz: elapsedSeconds === null ? null : frequencyAtSweepTime(currentPlan, elapsedSeconds),
      thresholdsEstimated: 0,
      eqGainsCalculated: 0,
      acousticCalibration: 'none',
    };
  }

  function emit() {
    try { onStateChange(snapshot()); } catch { /* callbacks never defeat audio cleanup */ }
  }

  function stop(cause = 'manual') {
    generation++; // invalidates an unfinished AudioContext.resume()
    const wasPending = state === 'starting' || state === 'running';
    const previous = active;
    active = null;
    cleanup(previous, true);
    if (wasPending) {
      state = 'interrupted';
      reason = cause;
      emit();
    }
    return wasPending;
  }

  function handleStateChange() {
    if (!disposed && context?.state !== 'running' && state === 'running') stop('context-suspended');
  }

  function handleVisibility() {
    if (!disposed && !isVisible()) stop('page-hidden');
  }

  function handlePageHide() {
    if (!disposed) stop('pagehide');
  }

  visibilityTarget?.addEventListener?.('visibilitychange', handleVisibility);
  lifecycleTarget?.addEventListener?.('pagehide', handlePageHide);

  async function start({
    plan: requestedPlan,
    digitalLevelDbfs: requestedDbfs,
    authorizedDigitalRangeDbfs: authorizedRange,
    userInitiated = false,
  } = {}) {
    requireValue(!disposed, 'Sweep session is disposed');
    // Always silence a prior sweep, including for malformed replacements.
    stop('replaced');
    requireValue(userInitiated === true, 'An explicit user action is required');
    requireValue(requestedPlan?.method === 'log-frequency-user-report-v1', 'Invalid sweep plan');
    const plan = createSweepPlan({
      minHz: requestedPlan.minHz,
      maxHz: requestedPlan.maxHz,
      durationSeconds: requestedPlan.durationSeconds,
      sampleRate: requestedPlan.sampleRate,
    });
    requireValue(authorizedRange && Number.isFinite(authorizedRange.minDbfs)
      && Number.isFinite(authorizedRange.maxDbfs)
      && authorizedRange.minDbfs <= authorizedRange.maxDbfs
      && authorizedRange.maxDbfs <= 0,
      'Invalid authorized digital range');
    requireValue(Number.isFinite(requestedDbfs)
      && requestedDbfs >= authorizedRange.minDbfs
      && requestedDbfs <= authorizedRange.maxDbfs
      && requestedDbfs <= SWEEP_DIGITAL_CEILING_DBFS,
      'Sweep digital level is outside authorized or hard limits');
    requireValue(isVisible(), 'Cannot start a sweep on a hidden page');

    currentPlan = plan;
    digitalLevelDbfs = requestedDbfs;
    reports = [];
    startedAt = null;
    state = 'starting';
    reason = null;
    const request = ++generation;
    emit();

    let provisional = null;
    try {
      if (!context) {
        context = createContext();
        requireValue(context && typeof context.createOscillator === 'function'
          && typeof context.createGain === 'function'
          && typeof context.resume === 'function',
          'Required Web Audio features unavailable');
        context.addEventListener?.('statechange', handleStateChange);
      }
      const ctx = context;
      if (ctx.state !== 'running') await ctx.resume();
      if (disposed || request !== generation || !isVisible()) {
        if (!disposed && request === generation) stop('cancelled');
        return { started: false, reason: 'cancelled' };
      }
      requireValue(ctx.state === 'running', 'Audio context is not running');
      requireValue(Number.isFinite(ctx.currentTime), 'Invalid audio clock');
      // Revalidate against the *actual* browser sample rate, not a declared one.
      const validated = createSweepPlan({ ...plan, sampleRate: ctx.sampleRate });
      const osc = ctx.createOscillator();
      provisional = { oscillator: osc, gain: null, context: ctx, request };
      const gain = ctx.createGain();
      provisional.gain = gain;
      requireValue(osc?.frequency?.exponentialRampToValueAtTime
        && osc?.frequency?.setValueAtTime
        && gain?.gain?.linearRampToValueAtTime
        && gain?.gain?.setValueAtTime,
        'Required Web Audio automation is unavailable');

      osc.type = 'sine';
      const at = ctx.currentTime + 0.01;
      const end = at + validated.durationSeconds;
      const fadeSeconds = 0.01;
      const amplitude = 10 ** (requestedDbfs / 20);
      osc.frequency.setValueAtTime(validated.minHz, at);
      osc.frequency.exponentialRampToValueAtTime(validated.maxHz, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(amplitude, at + fadeSeconds);
      gain.gain.setValueAtTime(amplitude, end - fadeSeconds);
      gain.gain.linearRampToValueAtTime(0, end);

      osc.onended = () => {
        if (active !== provisional || request !== generation || disposed) return;
        active = null;
        cleanup(provisional, false);
        state = 'completed';
        reason = null;
        emit();
      };

      active = provisional;
      startedAt = at;
      currentPlan = validated;
      state = 'running';
      osc.start(at);
      osc.stop(end);
      emit();
      return { started: true, durationSeconds: validated.durationSeconds };
    } catch (error) {
      if (request === generation) {
        if (active === provisional) active = null;
        cleanup(provisional, true);
        stop('audio-error');
      } else {
        // A newer request may be playing: never stop or disconnect its nodes.
        cleanup(provisional, true);
      }
      throw error;
    }
  }

  function report(heard) {
    requireValue(!disposed, 'Sweep session is disposed');
    requireValue(typeof heard === 'boolean', 'Sweep report requires heard: boolean');
    requireValue(state === 'running' && active && context?.state === 'running' && isVisible(),
      'Cannot report without active visible audio');
    const elapsedSeconds = context.currentTime - startedAt;
    requireValue(elapsedSeconds >= 0 && elapsedSeconds <= currentPlan.durationSeconds,
      'Sweep event outside playback window');
    reports = addSweepReport(currentPlan, reports, { elapsedSeconds, heard });
    emit();
    return reports.at(-1) ? { ...reports.at(-1) } : null;
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    stop('disposed');
    visibilityTarget?.removeEventListener?.('visibilitychange', handleVisibility);
    lifecycleTarget?.removeEventListener?.('pagehide', handlePageHide);
    const old = context;
    context = null;
    old?.removeEventListener?.('statechange', handleStateChange);
    if (old?.state !== 'closed' && typeof old?.close === 'function') await old.close();
    state = 'disposed';
  }

  return Object.freeze({ start, report, stop, snapshot, dispose });
}
