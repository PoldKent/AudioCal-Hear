import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGraphicEqProfile } from '../src/hear3/device-profile-contract.mjs';

const makeBands = (n) => Array.from({ length: n }, (_, i) => ({ id: 'b' + i, frequencyHz: 125 * (i + 1), source: 'manual' }));
const profile = (n) => ({ deviceId: 'example-device', type: 'graphic', bands: makeBands(n) });

test('supports the full 2–31 range without inventing standard center frequencies', () => {
  for (const n of [2, 4, 5, 7, 10, 15, 31]) {
    const p = validateGraphicEqProfile(profile(n));
    assert.equal(p.bands.length, n);
    assert.deepEqual(p.bands.map(b => b.frequencyHz), makeBands(n).map(b => b.frequencyHz));
    assert.equal(p.acousticValidation, 'not-established');
  }
});

test('rejects invalid band counts, frequency, duplicates and PEQ automation', () => {
  assert.throws(() => validateGraphicEqProfile(profile(1)), /2–31/);
  assert.throws(() => validateGraphicEqProfile(profile(32)), /2–31/);
  assert.throws(() => validateGraphicEqProfile({ ...profile(2), type: 'parametric' }), /graphic/);
  assert.throws(() => validateGraphicEqProfile({ ...profile(2), bands: [{ id: 'a', frequencyHz: NaN, source: 'manual' }, makeBands(2)[1]] }), /frequency/);
  assert.throws(() => validateGraphicEqProfile({ ...profile(2), bands: [{ id: 'b', frequencyHz: 100, source: 'manual' }, { id: 'b', frequencyHz: 1000, source: 'manual' }] }), /unique/);
});

test('photo metadata does not certify documentation or hardware', () => {
  const p = profile(2);
  p.bands[0].source = 'photo';
  assert.equal(validateGraphicEqProfile(p).bands[0].verification, 'unverified');
  p.bands[0].verification = 'documented';
  assert.throws(() => validateGraphicEqProfile(p), /Photo recognition/);
});

test('physical-step controls are not silently equated to dB', () => {
  const p = profile(2);
  p.bands[0].control = { min: -5, max: 5, step: 1, unit: 'physical-step' };
  const b = validateGraphicEqProfile(p).bands[0];
  assert.equal(b.control.unit, 'physical-step');
  assert.equal(b.control.dbPerStep, undefined);
  p.bands[0].control.dbPerStep = 2;
  assert.throws(() => validateGraphicEqProfile(p), /documented equivalence/);
  p.bands[0].control.dbPerStepSource = 'documented';
  assert.equal(validateGraphicEqProfile(p).bands[0].control.dbPerStep, 2);
});
