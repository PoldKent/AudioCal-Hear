import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {assessHear3ReleaseEvidence} from '../src/hear3/release-evidence-gate.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(readFileSync(resolve(root,'docs/hear3/release-evidence-gate.json'),'utf8'));
const clone=()=>structuredClone(source);
const sampleEvidence=()=>[{
 url:'https://github.com/PoldKent/AudioCal-Hear/issues/30',
 reviewer:'reviewer-person',verifiedAt:'2026-11-05T15:00:00Z',
}];
test('release manifest lists 63 decisions and 60 mandatory P0, without claiming stable release',()=>{
 const result=assessHear3ReleaseEvidence(source);
 assert.equal(result.p0Total,60);
 assert.equal(result.p0Verified,0);
 assert.equal(result.p0Pending,60);
 assert.equal(result.auditTotal,13);
 assert.equal(result.auditVerified,0);
 assert.equal(result.canPublishStable,false);
 assert.equal(result.stableReleaseClaim,false);
 assert.ok(result.missingP0.includes('D-063'));
 assert.ok(result.missingAudits.includes('physical-levels'));
});
test('stable release claim is explicitly rejected while any P0 or physical validation remains',()=>{
 const m=clone();m.stableReleaseClaim=true;
 assert.throws(()=>assessHear3ReleaseEvidence(m),/Stable Hear 3.0 release is blocked/);
});
test('no P0 can be removed, reordered, or relabeled as a lower priority',()=>{
 const m=clone();m.decisions.splice(0,1);
 assert.throws(()=>assessHear3ReleaseEvidence(m),/63 approved decisions/);
 const x=clone();x.decisions[0].id='D-099';
 assert.throws(()=>assessHear3ReleaseEvidence(x),/mismatch/);
 const y=clone();y.decisions[35].priority='P3';
 assert.throws(()=>assessHear3ReleaseEvidence(y),/mismatch/);
});
test('lower-priority D-011/D-012/D-013 do not falsely block the mandatory P0 count',()=>{
 const data=clone();
 assert.equal(data.decisions[10].priority,'P2');
 assert.equal(data.decisions[11].priority,'P3');
 assert.equal(data.decisions[12].priority,'P2');
 assert.equal(data.decisions.slice(10,13).every(x=>x.status==='deferred'),true);
 assert.equal(assessHear3ReleaseEvidence(data).p0Total,60);
});
test('a verified status without reviewed traceable evidence is rejected',()=>{
 const m=clone();m.decisions[0].status='verified';
 assert.throws(()=>assessHear3ReleaseEvidence(m),/no reviewed evidence/);
 const n=clone();n.audits[0].status='verified';
 assert.throws(()=>assessHear3ReleaseEvidence(n),/no reviewed evidence/);
});
test('a partial set of successful CI or manual reports cannot authorize stable release',()=>{
 const m=clone();
 for(const d of m.decisions)if(d.priority==='P0'){
  d.status='verified';d.verifiedEvidence=sampleEvidence();
 }
 const result=assessHear3ReleaseEvidence(m);
 assert.equal(result.p0Verified,60);
 assert.equal(result.auditVerified,0);
 assert.equal(result.canPublishStable,false);
 assert.equal(result.missingAudits.length,13);
});
test('a complete metadata manifest only passes the gate with audit records and explicit claim',()=>{
 const m=clone();
 for(const row of [...m.decisions,...m.audits]){
  if(row.priority!=='P0'&&row.priority!==undefined)continue;
  row.status='verified';row.verifiedEvidence=sampleEvidence();
 }
 m.stableReleaseClaim=true;
 const result=assessHear3ReleaseEvidence(m);
 assert.equal(result.canPublishStable,true);
 assert.equal(result.auditVerified,13);
 // This proves only the manifest shape, not the truth of real measurements.
 assert.match(result.warning,/independent human verification/);
});
test('wrong audit type or missing rollback evidence cannot be hidden by metadata reorder',()=>{
 const m=clone();
 m.audits[12].id='fake-rollback';
 assert.throws(()=>assessHear3ReleaseEvidence(m),/Unknown real-world audit/);
});
