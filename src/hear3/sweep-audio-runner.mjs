/**
 * Experimental Hear 3.0 continuous sweep audio (D-008, D-029-030, D-037).
 * Not clinical, not calibrated and not linked to the public application.
 *
 * The dBFS ceiling and exposure time below are engineering restrictions,
 * NOT guarantees of physical sound pressure or acoustic safety.
 */
import { createSweepPlan, addSweepReport } from './sweep-planner.mjs';

export const PROTOTYPE_SWEEP_MAX_DBFS = -42;
export const PROTOTYPE_SWEEP_MAX_SECONDS = 45;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}
function defaultCreateContext() {
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  ensure(typeof AudioContextClass === 'function', 'Web Audio unavailable');
  return new AudioContextClass();
}
function defaultIsVisible() {
  return typeof document === 'undefined' || document.hidden !== true;
}
function disconnectQuietly(node) {
  try { node?.disconnect(); } catch { /* ignore disconnection errors */ }
}
function silenceAndDisconnect(entry, silence) {
  if (!entry) return;
  if (entry.osc) entry.osc.onended = null;
  if (silence) {
    try {
      const at = entry.ctx.currentTime;
      entry.gain?.gain.cancelScheduledValues(at);
      entry.gain?.gain.setValueAtTime(0, at);
    } catch { /* continue best-effort stop and disconnect */ }
    try { entry.osc?.stop(entry.ctx.currentTime); } catch { /* already ended */ }
  }
  disconnectQuietly(entry.osc);
  disconnectQuietly(entry.pan);
  disconnectQuietly(entry.gain);
}

export function createSweepAudioRunner({
  createContext = defaultCreateContext,
  isVisible = defaultIsVisible,
  onEnded = () => {},
  onInterrupted = () => {},
  visibilityTarget = typeof document === 'undefined' ? null : document,
  lifecycleTarget = typeof window === 'undefined' ? null : window,
} = {}) {
  ensure(typeof createContext === 'function', 'Invalid context factory');
  ensure(typeof isVisible === 'function', 'Invalid visibility callback');
  ensure(typeof onEnded === 'function' && typeof onInterrupted === 'function', 'Invalid callback');

  let context = null;
  let active = null;
  let pendingEpoch = 0;
  let disposed = false;
  let lastResult = null;

  function snapshot(result = active) {
    if (!result) return Object.freeze({ status: 'idle', reports: [], lastResult: lastResult ? { ...lastResult, reports: lastResult.reports.map(r => ({ ...r })) } : null });
    const elapsedSeconds = Math.max(0, Math.min(result.plan.durationSeconds,
      result.ctx.currentTime - result.startTime));
    return {
      status: 'playing',
      plan: result.plan,
      channel: result.channel,
      levelDbfs: result.levelDbfs,
      elapsedSeconds,
      reports: result.reports.map(r => ({ ...r })),
    };
  }

  function stop(reason = 'manual') {
    pendingEpoch++;
    const current = active;
    active = null;
    if (current) {
      const elapsed = Math.max(0, Math.min(current.plan.durationSeconds,
        current.ctx.currentTime - current.startTime));
      lastResult = {
        status: 'interrupted',
        reason,
        elapsedSeconds: elapsed,
        reports: current.reports.map(r => ({ ...r })),
        thresholdInferences: 0,
      };
      silenceAndDisconnect(current, true);
    }
    return Boolean(current);
  }

  async function start({ plan, digitalLevelDbfs, authorizedDigitalRangeDbfs, channel = 'joint' } = {}) {
    ensure(!disposed, 'Sweep runner is disposed');
    // An invalid new request must never leave the former oscillator playing.
    stop('replaced');
    const epoch = pendingEpoch;
    const range = authorizedDigitalRangeDbfs;
    ensure(range && Number.isFinite(range.minDbfs) && Number.isFinite(range.maxDbfs) &&
      range.minDbfs <= range.maxDbfs && range.maxDbfs <= 0,
      'Invalid authorized digital range');
    ensure(Number.isFinite(digitalLevelDbfs) &&
      digitalLevelDbfs >= range.minDbfs &&
      digitalLevelDbfs <= range.maxDbfs &&
      digitalLevelDbfs <= PROTOTYPE_SWEEP_MAX_DBFS,
      'Digital sweep level exceeds authorized or prototype limits');
    ensure(['joint', 'left', 'right'].includes(channel), 'Invalid channel');
    ensure(plan?.method === 'log-frequency-user-report-v1', 'Invalid sweep plan');
    ensure(Number.isFinite(plan.durationSeconds) &&
      plan.durationSeconds <= PROTOTYPE_SWEEP_MAX_SECONDS,
      'Sweep duration exceeds prototype limit');
    ensure(isVisible(), 'Page hidden');

    if (!context) {
      context = createContext();
      ensure(context?.createOscillator && context.createGain && context.destination,
        'Required Web Audio nodes unavailable');
    }
    const ctx = context;
    // Defend against forged plans and the real output sample rate, not merely
    // an earlier sampleRate passed by the caller.
    const normalized = createSweepPlan({
      minHz: plan.minHz,
      maxHz: plan.maxHz,
      durationSeconds: plan.durationSeconds,
      sampleRate: ctx.sampleRate,
    });
    ensure(normalized.method === plan.method, 'Invalid sweep method');

    if (ctx.state !== 'running') {
      ensure(typeof ctx.resume === 'function', 'Audio context cannot resume');
      await ctx.resume();
    }
    if (disposed || pendingEpoch !== epoch || !isVisible()) {
      return { started: false, reason: 'cancelled' };
    }
    ensure(ctx.state === 'running', 'Audio context is not running');
    if (channel !== 'joint') {
      ensure(typeof ctx.createStereoPanner === 'function', 'Independent channels unavailable');
    }

    let entry = null;
    let osc = null, gain = null, pan = null;
    try {
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      pan = channel === 'joint' ? null : ctx.createStereoPanner();
      entry = {
        ctx, osc, gain, pan, plan: normalized, channel,
        levelDbfs: digitalLevelDbfs, reports: [],
        startTime: ctx.currentTime + 0.02,
      };
      const end = entry.startTime + normalized.durationSeconds;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(normalized.minHz, entry.startTime);
      osc.frequency.exponentialRampToValueAtTime(normalized.maxHz, end);
      if (pan) {
        pan.pan.setValueAtTime(channel === 'left' ? -1 : 1, ctx.currentTime);
        osc.connect(pan);
        pan.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(ctx.destination);
      const amplitude = 10 ** (digitalLevelDbfs / 20);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setValueAtTime(0, entry.startTime);
      gain.gain.linearRampToValueAtTime(amplitude, entry.startTime + 0.01);
      gain.gain.setValueAtTime(amplitude, end - 0.02);
      gain.gain.linearRampToValueAtTime(0, end);
      osc.onended = () => {
        if (active !== entry) return;
        active = null;
        lastResult = {
          status: 'completed',
          reason: 'scheduled-end',
          elapsedSeconds: normalized.durationSeconds,
          reports: entry.reports.map(r => ({ ...r })),
          thresholdInferences: 0,
        };
        silenceAndDisconnect(entry, false);
        onEnded({ ...lastResult, reports: lastResult.reports.map(r => ({ ...r })) });
      };
      active = entry;
      osc.start(entry.startTime);
      osc.stop(end);
      lastResult = null;
      return { started: true, startTime: entry.startTime };
    } catch (error) {
      if (active === entry) active = null;
      silenceAndDisconnect(entry ?? { ctx, osc, gain, pan }, true);
      throw error;
    }
  }

  function recordResponse(heard) {
    ensure(!disposed && active, 'No active sweep');
    ensure(typeof heard === 'boolean', 'Sweep response must be explicit');
    const elapsedSeconds = Math.round((active.ctx.currentTime - active.startTime) * 1e6) / 1e6;
    ensure(elapsedSeconds >= 0 && elapsedSeconds <= active.plan.durationSeconds,
      'Sweep response outside the playback interval');
    const reports = addSweepReport(active.plan, active.reports, { elapsedSeconds, heard });
    active.reports = reports;
    return { ...reports.at(-1) };
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    stop('disposed');
    visibilityTarget?.removeEventListener?.('visibilitychange', onVisibility);
    lifecycleTarget?.removeEventListener?.('pagehide', onPageHide);
    const ctx = context;
    context = null;
    if (ctx?.close && ctx.state !== 'closed') await ctx.close();
  }

  function onVisibility() {
    if (disposed || isVisible()) return;
    stop('hidden');
    onInterrupted({ reason: 'hidden' });
  }
  function onPageHide() {
    if (disposed) return;
    stop('pagehide');
    onInterrupted({ reason: 'pagehide' });
  }

  visibilityTarget?.addEventListener?.('visibilitychange', onVisibility);
  lifecycleTarget?.addEventListener?.('pagehide', onPageHide);

  return Object.freeze({
    start, recordResponse, stop, dispose,
    snapshot: () => snapshot(),
    lastResult: () => lastResult ? {
      ...lastResult,
      reports: lastResult.reports.map(r => ({ ...r })),
    } : null,
  });
}
