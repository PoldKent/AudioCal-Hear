import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSweepPlan, frequencyAtSweepTime, addSweepReport, planSweepConfirmations,
} from '../src/hear3/sweep-planner.mjs';

const bands = [
  { id: 'hi', frequencyHz: 1000 },
  { id: 'lo', frequencyHz: 125 },
  { id: 'mid', frequencyHz: 500 },
  { id: 'mid2', frequencyHz: 250 },
];
const plan = () => createSweepPlan({ minHz: 100, maxHz: 6400, durationSeconds: 60, sampleRate: 48000 });

test('log sweep always starts/ends at requested frequencies and has no SPL calibration', () => {
  const p = plan();
  assert.equal(frequencyAtSweepTime(p, 0), 100);
  assert.equal(frequencyAtSweepTime(p, 30), 800);
  assert.equal(frequencyAtSweepTime(p, 60), 6400);
  assert.equal(frequencyAtSweepTime(p, -5), 100);
  assert.equal(frequencyAtSweepTime(p, 100), 6400);
  assert.equal(p.acousticCalibration, 'none');
});

test('invalid frequency, Nyquist, and duration configurations fail closed', () => {
  assert.throws(() => createSweepPlan({ minHz: 0, maxHz: 8000 }), /frequency/);
  assert.throws(() => createSweepPlan({ minHz: 1000, maxHz: 1000 }), /frequency/);
  assert.throws(() => createSweepPlan({ minHz: 100, maxHz: 16000, sampleRate: 32000 }), /Nyquist/);
  assert.throws(() => createSweepPlan({ minHz: 100, maxHz: 8000, durationSeconds: 1 }), /duration/);
});

test('reported changes are time-ordered and do not become thresholds', () => {
  const p = plan();
  let events = addSweepReport(p, [], { elapsedSeconds: 20, heard: true });
  events = addSweepReport(p, events, { elapsedSeconds: 30, heard: false });
  assert.equal(events[0].frequencyHz, 400);
  assert.equal(events[1].frequencyHz, 800);
  assert.equal(events[0].source, 'user-report-during-sweep');
  const outcome = planSweepConfirmations(p, events, bands);
  assert.equal(outcome.transitions.length, 1);
  assert.equal(outcome.transitions[0].kind, 'reported-change-interval-not-threshold');
  assert.equal(outcome.thresholdsEstimated, 0);
  assert.equal(outcome.eqGainsCalculated, 0);
  assert.deepEqual(outcome.laterAdaptiveCandidates.map(x => x.id), ['mid']);
  assert.deepEqual(outcome.initialOrder.map(x => x.frequencyHz), [125, 250, 500, 1000]);
  assert.ok(outcome.initialOrder.every(x => x.mustConfirmWithDiscreteTone));
});

test('without reports, preserve all bands as unconfirmed without false discoveries', () => {
  const result = planSweepConfirmations(plan(), [], bands);
  assert.equal(result.reportCount, 0);
  assert.deepEqual(result.transitions, []);
  assert.deepEqual(result.laterAdaptiveCandidates, []);
  assert.equal(result.initialOrder.length, 4);
  assert.equal(result.thresholdsEstimated, 0);
});

test('repeated equal reports are observations, not a perception transition', () => {
  const p = plan();
  const reports = addSweepReport(p, addSweepReport(p, [], { elapsedSeconds: 10, heard: false }), { elapsedSeconds: 30, heard: false });
  assert.equal(planSweepConfirmations(p, reports, bands).transitions.length, 0);
});

test('out of range band remains in the ordered list for discrete verification', () => {
  const b = [{ id: 'a', frequencyHz: 80 }, { id: 'b', frequencyHz: 8000 }];
  const result = planSweepConfirmations(plan(), [], b);
  assert.deepEqual(result.initialOrder.map(x => x.outsideSweep), [true, true]);
  assert.ok(result.initialOrder.every(x => x.mustConfirmWithDiscreteTone));
});

test('rejects false answers, invalid timing, duplicate ids and invalid band counts', () => {
  const p = plan();
  assert.throws(() => addSweepReport(p, [], { elapsedSeconds: 5, heard: 'yes' }), /explicit/);
  const first = addSweepReport(p, [], { elapsedSeconds: 20, heard: true });
  assert.throws(() => addSweepReport(p, first, { elapsedSeconds: 10, heard: false }), /increase/);
  assert.throws(() => addSweepReport(p, first, { elapsedSeconds: 65, heard: false }), /increase/);
  assert.throws(() => planSweepConfirmations(p, [], [{ id: 'a', frequencyHz: 500 }]), /2–31/);
  assert.throws(() => planSweepConfirmations(p, [], [{ id: 'a', frequencyHz: 500 }, { id: 'a', frequencyHz: 1000 }]), /unique/);
});

test('31 custom bands are preserved and initially frequency ordered', () => {
  const p = createSweepPlan({ minHz: 40, maxHz: 16000, sampleRate: 48000 });
  const custom = Array.from({ length: 31 }, (_, i) => ({ id: String(i), frequencyHz: 16000 - 400 * i }));
  const result = planSweepConfirmations(p, [], custom);
  assert.equal(result.initialOrder.length, 31);
  assert.equal(result.initialOrder[0].frequencyHz, 4000);
  assert.equal(result.initialOrder.at(-1).frequencyHz, 16000);
});
