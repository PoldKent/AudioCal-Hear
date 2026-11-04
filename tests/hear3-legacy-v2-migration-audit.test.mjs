import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditLegacyV2Profiles,exportUnmodifiedLegacyV2Archive,verifyLegacyV2Archive,
  LEGACY_V2_PROFILE_KEY,
} from '../src/hear3/legacy-v2-migration-audit.mjs';

function profile(id='p1'){
  return {
    id,name:'Auriculares clásicos',type:'headphones',
    bands:[125,250,1000,4000,8000],preset:'photo10',
    channels:'separate',testMode:'quick',testStart:-36,testFloor:-100,
    createdAt:1730000000000,updatedAt:1790000000000,
    measures:{'1000|left':[{kind:'heard',db:-54,confidence:'medium',
      history:[{db:-55,heard:false},{db:-54,heard:true}]}]},
    sweepRecords:{left:{method:'fixed-digital-level-preflight-v1',events:[{hz:600,heard:false}]}},
    loudness:{1000:[{method:'relative-tone-match-v1',offsetDb:2}]},
    manual:{1000:3},balance:{1000:1},balanceProof:{1000:[{change:1}]},
    taste:{bass:1,voices:0,air:0},
    context:{subtype:'overear',connection:'bluetooth'},
  };
}

test('V2 audit preserves the source exactly without changing it or fabricating V3 results',()=>{
  const source=JSON.stringify([profile()]);
  const out=auditLegacyV2Profiles(source,{activeId:'p1'});
  assert.equal(out.preview.profileCount,1);
  assert.equal(out.preview.candidateDevices,1);
  assert.equal(out.preview.candidateProfiles,1);
  assert.equal(out.preview.migratedResults,0);
  assert.equal(out.preview.automaticCommitAllowed,false);
  assert.equal(out.preview.sourceArchiveRequired,true);
  assert.equal(out.preview.activeProfileMapped,true);
  assert.equal(out.candidateCatalog.results.length,0);
  assert.equal(out.candidateCatalog.profiles[0].graphicEq.bands.length,5);
  assert.equal(out.candidateCatalog.profiles[0].graphicEq.bands[2].frequencyHz,1000);
  assert.equal(out.candidateCatalog.profiles[0].graphicEq.bands[2].verification,'unverified');
  const restored=verifyLegacyV2Archive(out.originalArchive);
  assert.equal(restored.sourceText,source);
  assert.equal(restored.activeId,'p1');
  assert.deepEqual(JSON.parse(restored.sourceText),[profile()]);
});

test('V2 original acoustic/test/setting fields stay in full archival data, not V3 pseudo-evidence',()=>{
  const source=JSON.stringify([profile()]);
  const out=auditLegacyV2Profiles(source);
  const fields=out.preview.profiles[0].archivedOnlyFields;
  for(const field of ['measures','sweepRecords','loudness','manual','balance','balanceProof','taste','context'])
    assert.ok(fields.includes(field),field);
  assert.equal(out.candidateCatalog.results.length,0);
  assert.equal(out.candidateCatalog.profiles[0].graphicEq.bands[0].source,'provisional');
  assert.equal(out.candidateCatalog.devices[0].category,'headphones');
});

test('V2 archive checksum detects accidental source changes',()=>{
  const original=exportUnmodifiedLegacyV2Archive(JSON.stringify([profile()]),{activeId:'p1'});
  const damaged=JSON.parse(original);
  damaged.sourceText=damaged.sourceText.replace('Auriculares clásicos','Auriculares manipulados');
  assert.throws(()=>verifyLegacyV2Archive(JSON.stringify(damaged)),/Damaged/);
});

test('V2 candidate handles two independent devices and multiple band counts',()=>{
  const p1=profile('a'),p2=profile('b');
  p2.name='Auto';
  p2.type='car';
  p2.bands=[100,200,400,800,1600,3200,6400];
  const out=auditLegacyV2Profiles(JSON.stringify([p1,p2]),{activeId:'b'});
  assert.deepEqual(out.candidateCatalog.devices.map(x=>x.category),['headphones','car']);
  assert.equal(out.candidateCatalog.profiles[1].graphicEq.bands.length,7);
  assert.equal(out.candidateCatalog.activeProfileId,out.candidateCatalog.profiles[1].id);
});

test('V2 audit requires unique identifiers and does not silently merge duplicate profiles',()=>{
  assert.throws(()=>auditLegacyV2Profiles(JSON.stringify([profile('same'),profile('same')])),/Duplicate V2/);
});

test('V2 audit rejects malformed or unknown band layout rather than discarding records',()=>{
  const p=profile();
  p.bands=[1000,500];
  assert.throws(()=>auditLegacyV2Profiles(JSON.stringify([p])),/ordering or units/);
  p.bands=[100];
  assert.throws(()=>auditLegacyV2Profiles(JSON.stringify([p])),/bands require manual review/);
  p.bands=[125,250];
  p.type='unknown';
  assert.throws(()=>auditLegacyV2Profiles(JSON.stringify([p])),/device type/);
});

test('V2 audit rejects bad profile JSON and metadata, without storage side effects',()=>{
  assert.throws(()=>auditLegacyV2Profiles('{invalid'),/Invalid V2 profile JSON/);
  assert.throws(()=>auditLegacyV2Profiles(JSON.stringify({profiles:[]})),/list invalid/);
  const bad=profile();delete bad.id;
  assert.throws(()=>auditLegacyV2Profiles(JSON.stringify([bad])),/stable id/);
});

test('V2 audit reports unknown fields for future migration review, retaining them in archive',()=>{
  const p=profile();
  p.futureMetadata={unknown:'preserve this too'};
  const out=auditLegacyV2Profiles(JSON.stringify([p]));
  assert.deepEqual(out.preview.profiles[0].unknownFields,['futureMetadata']);
  const archive=JSON.parse(verifyLegacyV2Archive(out.originalArchive).sourceText);
  assert.deepEqual(archive[0].futureMetadata,{unknown:'preserve this too'});
});

test('empty legacy list yields an empty V3 candidate and no invented results',()=>{
  const out=auditLegacyV2Profiles('[]');
  assert.equal(out.preview.profileCount,0);
  assert.equal(out.candidateCatalog.results.length,0);
  assert.equal(out.candidateCatalog.activeProfileId,null);
  assert.equal(verifyLegacyV2Archive(out.originalArchive).sourceText,'[]');
});

test('archive declares exact historical storage source without overwriting legacy key',()=>{
  const out=auditLegacyV2Profiles(JSON.stringify([profile()]));
  const archive=JSON.parse(out.originalArchive);
  assert.equal(archive.originalStorageKey,LEGACY_V2_PROFILE_KEY);
  assert.equal(archive.integrity.algorithm,'fnv1a32');
  assert.ok(archive.sourceText.includes('"measures"'));
  assert.equal(out.candidateCatalog.results.length,0);
});
