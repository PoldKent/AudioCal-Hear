/**
 * Hear 3.0 — provisional sweep exploration planner.
 *
 * D-008, D-028–030, D-033–034, D-038, D-043.
 * ONLY organizes user-reported changes during a logarithmic frequency sweep.
 * It does NOT generate audio, infer a threshold, calibrate SPL, or calculate EQ.
 */
const requireValue = (valid, message) => { if (!valid) throw new Error(message); };
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function createSweepPlan({ minHz, maxHz, durationSeconds = 30, sampleRate = null } = {}) {
  requireValue(finite(minHz) && finite(maxHz) && minHz >= 20 && maxHz > minHz && maxHz <= 20000,
    'Invalid sweep frequency range');
  requireValue(finite(durationSeconds) && durationSeconds >= 10 && durationSeconds <= 180,
    'Invalid sweep duration');
  requireValue(sampleRate === null || (finite(sampleRate) && sampleRate > 0 && maxHz < sampleRate / 2),
    'Sweep exceeds the sample-rate Nyquist limit');
  return Object.freeze({
    method: 'log-frequency-user-report-v1',
    minHz, maxHz, durationSeconds,
    sampleRate,
    acousticCalibration: 'none',
    evidenceClass: 'subjective-sweep-reports-not-thresholds',
  });
}

export function frequencyAtSweepTime(plan, elapsedSeconds) {
  requireValue(plan?.method === 'log-frequency-user-report-v1', 'Invalid sweep plan');
  requireValue(finite(elapsedSeconds), 'Invalid elapsed time');
  const portion = Math.max(0, Math.min(1, elapsedSeconds / plan.durationSeconds));
  return plan.minHz * ((plan.maxHz / plan.minHz) ** portion);
}

function checkedReports(plan, events) {
  requireValue(Array.isArray(events), 'Sweep events must be an array');
  let last = -1;
  return events.map(e => {
    requireValue(e && finite(e.elapsedSeconds) && e.elapsedSeconds >= 0 &&
      e.elapsedSeconds <= plan.durationSeconds && e.elapsedSeconds > last,
      'Sweep event timestamps must increase within the plan');
    requireValue(typeof e.heard === 'boolean', 'Sweep response must be explicit');
    last = e.elapsedSeconds;
    // Derive frequency from the plan and event time; do not trust a claim
    // that a browser has measured acoustic hearing sensitivity.
    return {
      elapsedSeconds: e.elapsedSeconds,
      frequencyHz: frequencyAtSweepTime(plan, e.elapsedSeconds),
      heard: e.heard,
      source: 'user-report-during-sweep',
    };
  });
}

/**
 * Save a click without converting it to an audiometric threshold.
 * Event frequency is derived from elapsed audio-clock time.
 */
export function addSweepReport(plan, events, { elapsedSeconds, heard } = {}) {
  const base = checkedReports(plan, events);
  const combined = checkedReports(plan, [...base, { elapsedSeconds, heard }]);
  return combined;
}

function checkedBands(bands) {
  requireValue(Array.isArray(bands) && bands.length >= 2 && bands.length <= 31,
    'Expected 2–31 graphic EQ bands');
  const ids = new Set();
  return bands.map((band, i) => {
    requireValue(band && typeof band.id === 'string' && band.id.trim() &&
      !ids.has(band.id), 'Band ids must be unique');
    ids.add(band.id);
    requireValue(finite(band.frequencyHz) && band.frequencyHz >= 20 &&
      band.frequencyHz <= 20000, 'Invalid band frequency');
    return { id: band.id, frequencyHz: band.frequencyHz, inputOrder: i };
  });
}

/**
 * D-029: every real EQ band still needs an individual confirmation tone.
 * D-028: maintain initially ordered bands; supply only optional later
 * priority hints based on reported changes, never on invented thresholds.
 */
export function planSweepConfirmations(plan, events, bands) {
  const reports = checkedReports(plan, events);
  const graphicBands = checkedBands(bands);
  const transitions = [];
  for (let i = 1; i < reports.length; i++) {
    if (reports[i - 1].heard === reports[i].heard) continue;
    transitions.push({
      fromHz: reports[i - 1].frequencyHz,
      toHz: reports[i].frequencyHz,
      firstHeard: reports[i - 1].heard,
      nextHeard: reports[i].heard,
      kind: 'reported-change-interval-not-threshold',
    });
  }
  const initialOrder = graphicBands
    .map(b => ({
      id: b.id,
      frequencyHz: b.frequencyHz,
      mustConfirmWithDiscreteTone: true,
      outsideSweep: b.frequencyHz < plan.minHz || b.frequencyHz > plan.maxHz,
      matchedTransitionInterval: transitions.some(t =>
        b.frequencyHz >= t.fromHz && b.frequencyHz <= t.toHz),
    }))
    .sort((a, b) => a.frequencyHz - b.frequencyHz || a.id.localeCompare(b.id));
  const laterAdaptiveCandidates = initialOrder
    .filter(b => b.matchedTransitionInterval)
    .map(b => ({ id: b.id, frequencyHz: b.frequencyHz, reason: 'within-subjective-transition-interval' }));
  return {
    interpretation: 'preliminary-sweep-navigation-only',
    thresholdsEstimated: 0,
    eqGainsCalculated: 0,
    reportCount: reports.length,
    transitions,
    initialOrder,
    laterAdaptiveCandidates,
    evidenceLimit: 'User clicks during a moving tone cannot establish calibrated thresholds or frequency response.',
  };
}
