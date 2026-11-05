/**
 * Hear 3.0 P0 — read-only, profile-scoped result history and last-result recovery.
 * D-019, D-023, D-050, D-051, D-059, D-063.
 *
 * This is a selector, NOT an audio resume controller or an EQ calculator.
 * No writes, network requests, automatic playback or V2 migrations.
 */
import { validateHear3Catalog } from './catalog-contract.mjs';

function copy(value) { return value === null ? null : JSON.parse(JSON.stringify(value)); }

function orderedResults(catalog, profileId) {
  // Equal timestamps are ordered by stable result ID: never rely on array order.
  return catalog.results.filter(item => item.profileId === profileId)
    .sort((a, b) => b.capturedAt - a.capturedAt || a.id.localeCompare(b.id));
}

export function selectHear3ProfileHistory(catalog, { profileId } = {}) {
  const valid = validateHear3Catalog(catalog);
  // When no profile is active, do not silently activate an unrelated profile.
  const selectedId = profileId === undefined ? valid.activeProfileId : profileId;
  if (selectedId === null) {
    return {
      status: 'no-active-profile', profile: null, device: null,
      latestResult: null, results: [], resultCount: 0,
      audioStarted: false, resultIsAcousticallyValidated: false,
    };
  }
  if (typeof selectedId !== 'string' || !selectedId) {
    throw new Error('Choose a valid profile id');
  }
  const profile = valid.profiles.find(item => item.id === selectedId);
  if (!profile) throw new Error('Selected profile does not exist');
  const device = valid.devices.find(item => item.id === profile.deviceId);
  const results = orderedResults(valid, selectedId);
  return {
    status: results.length ? 'history-available' : 'no-results',
    profile: copy(profile), device: copy(device),
    latestResult: results.length ? copy(results[0]) : null,
    results: copy(results), resultCount: results.length,
    // A saved result is provisional/inconclusive, never a calibrated hearing diagnosis.
    audioStarted: false, resultIsAcousticallyValidated: false,
  };
}

export function listHear3ProfileSummaries(catalog) {
  const valid = validateHear3Catalog(catalog);
  return valid.profiles.map(profile => {
    const device = valid.devices.find(item => item.id === profile.deviceId);
    const latest = orderedResults(valid, profile.id)[0] ?? null;
    return {
      profileId: profile.id, profileName: profile.name,
      deviceId: device.id, deviceName: device.name, deviceCategory: device.category,
      active: profile.id === valid.activeProfileId,
      resultCount: valid.results.filter(item => item.profileId === profile.id).length,
      latestResultId: latest?.id ?? null,
      latestCapturedAt: latest?.capturedAt ?? null,
      latestStatus: latest?.status ?? null,
    };
  });
}

export function createHear3CatalogHistoryReader({ store } = {}) {
  if (!store || typeof store.load !== 'function') throw new Error('Catalog store required');
  function read(options) {
    const loaded = store.load();
    return {
      ...selectHear3ProfileHistory(loaded.catalog, options),
      revision: loaded.revision,
      durability: loaded.durability,
      persistedOnDevice: loaded.persistedOnDevice,
      warnings: [...(loaded.warnings ?? [])],
    };
  }
  function list() {
    const loaded = store.load();
    return {
      profiles: listHear3ProfileSummaries(loaded.catalog),
      revision: loaded.revision,
      durability: loaded.durability,
      warnings: [...(loaded.warnings ?? [])],
    };
  }
  return Object.freeze({ read, list });
}
