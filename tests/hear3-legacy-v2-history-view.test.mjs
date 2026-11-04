import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLegacyV2History } from '../src/hear3/legacy-v2-history-view.mjs';

function data(id='old-1') {
  return { id, name:'Equipo clásico', type:'headphones', bands:[125,500,1000],
    measures: {
      '125|left':[{kind:'heard',db:-55,history:[{db:-60,heard:false}]}],
      '500|right':[{kind:'timeout',db:null},{kind:'unconfirmed',db:null}],
      '1000|both':[{kind:'unheard',db:null}],
    },
    manual:{125:2},balance:{500:1},loudnessInline:{'1000|both':{offsetDb:2}},
    sweepRecords:{both:{events:[{hz:500,heard:true}]}},
  };
}

test('read-only V2 view identifies frequencies, sides and original status without invented threshold',()=>{
  const p=data();
  const before=JSON.stringify([p]);
  const view=summarizeLegacyV2History(before);
  assert.equal(JSON.stringify([p]),before);
  assert.equal(view.readOnly,true);
  assert.equal(view.imported,false);
  assert.equal(view.migratedV3Results,0);
  assert.equal(view.acousticValidation,'not-established');
  const one=view.profiles[0];
  assert.equal(one.historicalRecordCount,4);
  assert.deepEqual(one.channels,['both','left','right']);
  assert.deepEqual(one.recordedKinds,['heard','timeout','unconfirmed','unheard']);
  assert.equal(one.validation,'legacy-observations-are-not-v3-thresholds');
  assert.equal(one.observations[0].frequencyHz,125);
  assert.equal(one.observations[0].source,'legacy-v2-unverified');
  assert.ok(!('thresholdDb' in one.observations[0]));
});

test('legacy adjustments and sweep counts are metadata only, never V3 EQ gains',()=>{
  const result=summarizeLegacyV2History(JSON.stringify([data()])).profiles[0];
  assert.equal(result.legacyAdjustmentBandCounts.manual,1);
  assert.equal(result.legacyAdjustmentBandCounts.balance,1);
  assert.equal(result.legacyAdjustmentBandCounts.loudnessInline,1);
  assert.equal(result.sweepCount,1);
  assert.equal(result.observations.every(o=>!('gainDb' in o)),true);
  assert.ok(result.archivedOnlyFields.includes('manual'));
});

test('invalid history is counted as unclassified, never misread as a negative response',()=>{
  const p=data();
  p.measures['600|left']=[{kind:'unexpected'},null];
  p.measures['broken-key']=[{kind:'heard'}];
  const result=summarizeLegacyV2History(JSON.stringify([p])).profiles[0];
  assert.equal(result.unclassifiedRecordCount,3);
  assert.equal(result.recordedKinds.includes('unheard'),true);
  assert.equal(result.historicalRecordCount,4);
});

test('multiple profiles retain separate historical counts and do not combine channels',()=>{
  const first=data('a'),second=data('b');second.name='Equipo B';second.measures={};
  const v=summarizeLegacyV2History(JSON.stringify([first,second]));
  assert.equal(v.profileCount,2);
  assert.equal(v.profiles[0].historicalRecordCount,4);
  assert.equal(v.profiles[1].historicalRecordCount,0);
  assert.deepEqual(v.profiles[1].channels,[]);
});

test('V2 schema problems block history viewing instead of silently dropping damaged profiles',()=>{
  const p=data();p.bands=[1000,200];
  assert.throws(()=>summarizeLegacyV2History(JSON.stringify([p])),/ordering or units/);
  assert.throws(()=>summarizeLegacyV2History('{bad'),/Invalid V2 profile JSON/);
});

test('empty source is a valid empty read-only view',()=>{
  const v=summarizeLegacyV2History('[]');
  assert.equal(v.profileCount,0);
  assert.deepEqual(v.profiles,[]);
  assert.equal(v.migratedV3Results,0);
});
