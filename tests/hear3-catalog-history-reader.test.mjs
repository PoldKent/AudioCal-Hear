import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyHear3Catalog } from '../src/hear3/catalog-contract.mjs';
import {
  selectHear3ProfileHistory, listHear3ProfileSummaries, createHear3CatalogHistoryReader,
} from '../src/hear3/catalog-history-reader.mjs';

function catalog() {
  return {
    catalogVersion: 1,
    devices: [
      { id: 'device-a', name: 'Equipo A', category: 'headphones' },
      { id: 'device-b', name: 'Equipo B', category: 'speaker' },
    ],
    profiles: [
      { id: 'profile-a', deviceId: 'device-a', name: 'Perfil A',
        graphicEq: { type: 'graphic', deviceId: 'device-a', bands: [
          { id: 'low', frequencyHz: 125, source: 'manual' },
          { id: 'high', frequencyHz: 8000, source: 'manual' },
        ] } },
      { id: 'profile-b', deviceId: 'device-b', name: 'Perfil B',
        graphicEq: { type: 'graphic', deviceId: 'device-b', bands: [
          { id: 'low', frequencyHz: 100, source: 'manual' },
          { id: 'high', frequencyHz: 6000, source: 'manual' },
        ] } },
    ],
    results: [
      { id: 'a-old', profileId: 'profile-a', capturedAt: 1000,
        status: 'provisional', provenance: 'experimental-tone-test',
        originalEq: [], currentEq: [], observations: [], editHistory: [] },
      { id: 'b-new', profileId: 'profile-b', capturedAt: 4000,
        status: 'inconclusive', provenance: 'manual',
        originalEq: [], currentEq: [], observations: [], editHistory: [] },
      { id: 'a-new', profileId: 'profile-a', capturedAt: 3000,
        status: 'inconclusive', provenance: 'manual',
        originalEq: [], currentEq: [], observations: [], editHistory: [] },
    ],
    activeProfileId: 'profile-a',
  };
}

test('active profile restores its latest result, not a newer result from another device', () => {
  const history = selectHear3ProfileHistory(catalog());
  assert.equal(history.profile.id, 'profile-a');
  assert.equal(history.device.id, 'device-a');
  assert.equal(history.latestResult.id, 'a-new');
  assert.deepEqual(history.results.map(x => x.id), ['a-new', 'a-old']);
  assert.equal(history.resultCount, 2);
  assert.equal(history.status, 'history-available');
});

test('explicit selection reads a different device without changing active profile', () => {
  const c = catalog();
  const history = selectHear3ProfileHistory(c, { profileId: 'profile-b' });
  assert.equal(history.latestResult.id, 'b-new');
  assert.equal(history.results.length, 1);
  assert.equal(c.activeProfileId, 'profile-a');
});

test('latest result tie is deterministic by ID, not array order', () => {
  const c = catalog();
  c.results.push({ ...c.results[0], id: 'a-alpha', capturedAt: 3000 });
  const first = selectHear3ProfileHistory(c).latestResult.id;
  c.results.reverse();
  const second = selectHear3ProfileHistory(c).latestResult.id;
  assert.equal(first, 'a-alpha');
  assert.equal(second, 'a-alpha');
});

test('inconclusive remains inconclusive; no audio or acoustic validation is inferred', () => {
  const history = selectHear3ProfileHistory(catalog());
  assert.equal(history.latestResult.status, 'inconclusive');
  assert.deepEqual(history.latestResult.originalEq, []);
  assert.equal(history.audioStarted, false);
  assert.equal(history.resultIsAcousticallyValidated, false);
});

test('empty catalog has no active profile and no invented result', () => {
  const history = selectHear3ProfileHistory(emptyHear3Catalog());
  assert.equal(history.status, 'no-active-profile');
  assert.equal(history.latestResult, null);
  assert.deepEqual(history.results, []);
});

test('no active profile never implicitly activates the profile with the newest result', () => {
  const c = catalog();
  c.activeProfileId = null;
  const history = selectHear3ProfileHistory(c);
  assert.equal(history.status, 'no-active-profile');
  assert.equal(history.profile, null);
  assert.equal(c.activeProfileId, null);
});

test('profile with no results is reported honestly', () => {
  const c = catalog();
  c.results = c.results.filter(x => x.profileId === 'profile-b');
  const history = selectHear3ProfileHistory(c);
  assert.equal(history.status, 'no-results');
  assert.equal(history.latestResult, null);
});

test('unknown or malformed profile ID is rejected', () => {
  assert.throws(() => selectHear3ProfileHistory(catalog(), { profileId: 'absent' }), /does not exist/);
  assert.throws(() => selectHear3ProfileHistory(catalog(), { profileId: 123 }), /valid profile id/);
});

test('selectors validate references and do not mask catalog corruption', () => {
  const c = catalog();
  c.results[0].profileId = 'deleted-profile';
  assert.throws(() => selectHear3ProfileHistory(c), /missing profile/);
  assert.throws(() => listHear3ProfileSummaries(c), /missing profile/);
});

test('summaries show history by profile and device without merging records', () => {
  const summaries = listHear3ProfileSummaries(catalog());
  assert.equal(summaries.length, 2);
  assert.deepEqual(summaries.map(x => x.resultCount), [2, 1]);
  assert.deepEqual(summaries.map(x => x.latestResultId), ['a-new', 'b-new']);
  assert.deepEqual(summaries.map(x => x.active), [true, false]);
  assert.equal(summaries[1].deviceCategory, 'speaker');
});

test('returned results are detached copies, not mutable references to stored history', () => {
  const c = catalog();
  const view = selectHear3ProfileHistory(c);
  view.results[0].status = 'provisional';
  view.latestResult.id = 'injected';
  view.profile.name = 'changed';
  assert.equal(c.results[2].status, 'inconclusive');
  assert.equal(c.profiles[0].name, 'Perfil A');
  assert.equal(selectHear3ProfileHistory(c).latestResult.id, 'a-new');
});

test('reader calls load only and surfaces durability warnings without writes or autoplay', () => {
  let loads = 0;
  const store = {
    load() {
      loads++;
      return { catalog: catalog(), revision: 7, durability: 'tab-session',
        persistedOnDevice: false, warnings: ['Export a backup'] };
    },
    save() { throw Error('Unexpected write'); },
  };
  const reader = createHear3CatalogHistoryReader({ store });
  const history = reader.read();
  const summary = reader.list();
  assert.equal(history.revision, 7);
  assert.equal(history.durability, 'tab-session');
  assert.equal(history.persistedOnDevice, false);
  assert.deepEqual(history.warnings, ['Export a backup']);
  assert.equal(history.audioStarted, false);
  assert.equal(summary.profiles[0].resultCount, 2);
  assert.equal(loads, 2);
  assert.throws(() => createHear3CatalogHistoryReader(), /store required/);
});
