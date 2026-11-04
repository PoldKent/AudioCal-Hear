/**
 * Hear 3.0 catalog contract — D-042–053, D-059–060, D-063.
 *
 * Pure data validation. It does NOT calculate EQ, verify acoustic behavior,
 * migrate the Hear 2.0 schema, or turn dBFS into dB SPL.
 */
import { validateGraphicEqProfile } from './device-profile-contract.mjs';

export const HEAR3_CATALOG_VERSION = 1;
export const HEAR3_CATALOG_FORMAT = 'hear3-catalog-v1';
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const CATEGORIES = new Set(['headphones', 'car', 'speaker', 'application', 'interface']);
const RESULTS = new Set(['provisional', 'inconclusive']);
const SOURCES = new Set(['experimental-tone-test', 'manual', 'legacy-unverified']);
const CHANNELS = new Set(['left', 'right', 'joint']);

function check(ok, message) { if (!ok) throw new Error(message); }
function object(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function allowedKeys(v, keys, kind) {
  check(object(v) && Object.keys(v).every(k => keys.includes(k)), 'Unknown ' + kind + ' fields');
}
function id(v, kind) { check(typeof v === 'string' && ID.test(v), 'Invalid ' + kind + ' id'); return v; }
function label(v, kind, max=120) {
  check(typeof v === 'string' && v.trim().length >= 1 && v.length <= max
    && !/[\u0000-\u001f\u007f]/.test(v), 'Invalid ' + kind + ' label');
  return v;
}
function integer(v, kind, min=0, max=Number.MAX_SAFE_INTEGER) {
  check(Number.isSafeInteger(v) && v>=min && v<=max, 'Invalid ' + kind);
  return v;
}
function gain(v) {
  // Input validation range only. This is NOT an approved acoustic or
  // hardware-safe boost; the EQ algorithm and device controls remain separate.
  check(typeof v === 'number' && Number.isFinite(v) && v >= -30 && v <= 30,
    'Invalid stored EQ gain');
  return v;
}
function uniqueById(items, kind) {
  const seen = new Set();
  for (const item of items) {
    check(!seen.has(item.id), 'Duplicate ' + kind + ' id');
    seen.add(item.id);
  }
}
export function emptyHear3Catalog() {
  return { catalogVersion: HEAR3_CATALOG_VERSION, devices: [], profiles: [], results: [], activeProfileId: null };
}

export function validateHear3Catalog(input) {
  allowedKeys(input, ['catalogVersion','devices','profiles','results','activeProfileId'], 'catalog');
  check(input.catalogVersion === HEAR3_CATALOG_VERSION, 'Unsupported Hear 3 catalog version');
  check(Array.isArray(input.devices) && input.devices.length <= 200, 'Invalid devices collection');
  check(Array.isArray(input.profiles) && input.profiles.length <= 800, 'Invalid profiles collection');
  check(Array.isArray(input.results) && input.results.length <= 5000, 'Invalid results collection');

  const devices = input.devices.map(raw => {
    allowedKeys(raw, ['id','name','category'], 'device');
    check(CATEGORIES.has(raw.category), 'Unknown device category');
    return { id: id(raw.id, 'device'), name: label(raw.name,'device'), category: raw.category };
  });
  uniqueById(devices, 'device');
  const deviceIds = new Set(devices.map(x=>x.id));

  const profiles = input.profiles.map(raw => {
    allowedKeys(raw, ['id','deviceId','name','graphicEq'], 'profile');
    const profileId=id(raw.id,'profile'), deviceId=id(raw.deviceId,'device');
    check(deviceIds.has(deviceId), 'Profile references missing device');
    allowedKeys(raw.graphicEq, ['type','deviceId','bands','schemaVersion','acousticValidation'], 'EQ');
    check(raw.graphicEq.deviceId === deviceId, 'Graphic EQ device reference mismatch');
    check(Array.isArray(raw.graphicEq.bands), 'Invalid EQ band list');
    raw.graphicEq.bands.forEach(b => {
      allowedKeys(b, ['id','frequencyHz','source','verification','control','order'], 'EQ band');
      if (b.control != null) allowedKeys(b.control, ['min','max','step','unit','dbPerStep','dbPerStepSource'], 'EQ control');
    });
    const eq = validateGraphicEqProfile(raw.graphicEq);
    // The existing contract carries frequency provenance but does NOT
    // establish that a control is acoustically calibrated.
    return {
      id: profileId, deviceId, name: label(raw.name,'profile'),
      graphicEq: { type: 'graphic', deviceId, bands: eq.bands },
    };
  });
  uniqueById(profiles, 'profile');
  const profilesById = new Map(profiles.map(x=>[x.id,x]));

  const results = input.results.map(raw => {
    allowedKeys(raw, ['id','profileId','capturedAt','status','provenance','originalEq','currentEq','observations','editHistory'], 'result');
    const resultId=id(raw.id,'result'), profileId=id(raw.profileId,'profile');
    const profile=profilesById.get(profileId);
    check(profile, 'Result references missing profile');
    check(RESULTS.has(raw.status), 'Invalid result status');
    check(SOURCES.has(raw.provenance), 'Invalid result provenance');
    const eqBands=profile.graphicEq.bands;
    function mappedGains(value, kind) {
      check(Array.isArray(value) && (value.length === 0 || value.length === eqBands.length),
        'Invalid ' + kind + ' EQ band coverage');
      return value.map((band,i)=>{
        allowedKeys(band,['bandId','gainDb'],kind+' EQ band');
        check(band.bandId === eqBands[i].id, 'EQ gain references missing or unordered band');
        return { bandId: band.bandId, gainDb: gain(band.gainDb) };
      });
    }
    const originalEq=mappedGains(raw.originalEq,'original');
    const currentEq=mappedGains(raw.currentEq,'current');
    check(originalEq.length === currentEq.length, 'EQ original/current mismatch');
    check(raw.status === 'provisional' || originalEq.length === 0,
      'Inconclusive results cannot invent a usable EQ');
    check(Array.isArray(raw.observations) && raw.observations.length <= 2000,
      'Invalid result observations');
    const observations=raw.observations.map(o=>{
      allowedKeys(o,['toneId','frequencyHz','digitalLevelDbfs','channel','response','provenance'], 'observation');
      id(o.toneId,'tone');
      check(typeof o.frequencyHz === 'number' && Number.isFinite(o.frequencyHz)
        && o.frequencyHz>=20 && o.frequencyHz<=20000, 'Invalid observation frequency');
      check(typeof o.digitalLevelDbfs === 'number' && Number.isFinite(o.digitalLevelDbfs)
        && o.digitalLevelDbfs>=-120 && o.digitalLevelDbfs<=0,
        'Invalid observation digital level');
      check(CHANNELS.has(o.channel) && ['heard','not-heard'].includes(o.response)
        && o.provenance === 'user-response', 'Invalid observation evidence');
      return { toneId:o.toneId, frequencyHz:o.frequencyHz,
        digitalLevelDbfs:o.digitalLevelDbfs, channel:o.channel, response:o.response,
        provenance:'user-response' };
    });
    check(Array.isArray(raw.editHistory) && raw.editHistory.length <= 1000,
      'Invalid edit history');
    const bandIds=new Set(eqBands.map(x=>x.id));
    const editHistory=raw.editHistory.map(e=>{
      allowedKeys(e,['bandId','fromGainDb','toGainDb','at'], 'edit');
      check(bandIds.has(e.bandId), 'Edit references missing EQ band');
      return {bandId:e.bandId,fromGainDb:gain(e.fromGainDb),
        toGainDb:gain(e.toGainDb),at:integer(e.at,'edit timestamp')};
    });
    return {
      id: resultId, profileId, capturedAt: integer(raw.capturedAt,'capture timestamp'),
      status:raw.status, provenance:raw.provenance,
      originalEq, currentEq, observations, editHistory,
    };
  });
  uniqueById(results, 'result');
  const activeProfileId=input.activeProfileId ?? null;
  check(activeProfileId === null || (typeof activeProfileId === 'string' && profilesById.has(activeProfileId)),
    'Active profile reference not found');
  return { catalogVersion:HEAR3_CATALOG_VERSION, devices, profiles, results, activeProfileId };
}
