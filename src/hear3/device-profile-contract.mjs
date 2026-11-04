/**
 * Hear 3.0 device/EQ metadata contract (D-042–046, D-052–053).
 * An EQ photograph or profile match does not prove acoustic behavior.
 */
export const PROFILE_SCHEMA_VERSION = 1;
const SOURCES = new Set(['official-document', 'photo', 'manual', 'provisional']);
const EVIDENCE = new Set(['unverified', 'documented', 'user-confirmed']);
function check(ok, message) { if (!ok) throw new Error(message); }

export function validateGraphicEqProfile(profile) {
  check(profile && typeof profile === 'object', 'Profile must be an object');
  check(typeof profile.deviceId === 'string' && profile.deviceId.trim(), 'Device id required');
  check(Array.isArray(profile.bands) && profile.bands.length >= 2 && profile.bands.length <= 31, 'Graphic EQ requires 2–31 bands');
  check(profile.type === 'graphic', 'Only graphic EQ is generated automatically');
  const ids = new Set();
  const bands = profile.bands.map((band, index) => {
    check(band && typeof band === 'object', 'Invalid band');
    check(typeof band.id === 'string' && band.id.length > 0 && !ids.has(band.id), 'Band ids must be unique');
    ids.add(band.id);
    check(Number.isFinite(band.frequencyHz) && band.frequencyHz > 0, 'Invalid center frequency');
    check(SOURCES.has(band.source), 'Unknown frequency source');
    const verification = band.verification ?? 'unverified';
    check(EVIDENCE.has(verification), 'Unknown verification state');
    if (band.source === 'photo' && verification === 'documented') {
      throw new Error('Photo recognition alone is not official documentation');
    }
    const control = band.control == null ? null : band.control;
    if (control !== null) {
      check(typeof control === 'object', 'Invalid control description');
      check(Number.isFinite(control.min) && Number.isFinite(control.max) && control.min <= control.max, 'Invalid control bounds');
      check(Number.isFinite(control.step) && control.step > 0, 'Invalid control step');
      check(control.unit === 'dB' || control.unit === 'physical-step', 'Control must declare actual units');
      if (control.unit === 'physical-step') check(control.dbPerStep == null || (Number.isFinite(control.dbPerStep) && control.dbPerStep > 0 && control.dbPerStepSource === 'documented'), 'dB/step requires documented equivalence');
    }
    return {
      id: band.id,
      frequencyHz: band.frequencyHz,
      source: band.source,
      verification,
      control: control === null ? null : { ...control },
      order: index,
    };
  });
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    type: 'graphic',
    deviceId: profile.deviceId,
    acousticValidation: 'not-established',
    bands,
  };
}
