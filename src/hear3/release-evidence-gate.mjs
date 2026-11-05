/**
 * Hear 3.0 D-063 — explicit release-evidence integrity guard.
 * It validates bookkeeping, NOT the truth of third-party test reports.
 * Real hardware evidence must be reviewed separately.
 */
export const HEAR3_RELEASE_GATE_FORMAT='hear3-release-evidence-gate-v1';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const TEST_AUDITS=[
 'physical-android','physical-ios','physical-desktop',
 'physical-bluetooth-route','physical-headphones-lr','physical-levels',
 'perceptual-comparison','eq-calibration','accessibility-wcag',
 'offline-storage','privacy-images','migration-legacy','rollback-production',
];
function validEvidence(value){
 return Array.isArray(value)&&value.length>0&&value.every(item=>
  item&&typeof item==='object'&&!Array.isArray(item)&&
  typeof item.url==='string'&&/^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\//.test(item.url)&&
  typeof item.reviewer==='string'&&item.reviewer.trim().length>=2&&
  typeof item.verifiedAt==='string'&&Number.isFinite(Date.parse(item.verifiedAt)));
}
export function assessHear3ReleaseEvidence(input){
 check(input&&input.format===HEAR3_RELEASE_GATE_FORMAT&&input.schemaVersion===1,
  'Unknown Hear 3.0 release gate schema');
 check(typeof input.stableReleaseClaim==='boolean','Stable release claim must be explicit');
 check(Array.isArray(input.decisions)&&input.decisions.length===63,
  'All 63 approved decisions must be represented');
 const counters={P0:0,P2:0,P3:0};
 const blockers=[],manualReview=[];
 for(let i=1;i<=63;i++){
  const id='D-'+String(i).padStart(3,'0');
  const row=input.decisions[i-1];
  const expected=i===11||i===13?'P2':i===12?'P3':'P0';
  check(row?.id===id&&row.priority===expected&&
   typeof row.title==='string'&&row.title.trim()&&
   Array.isArray(row.verifiedEvidence),
   'Release evidence decision or priority mismatch: '+id);
  check(['pending','prototype','verified','deferred'].includes(row.status),
   'Unknown requirement verification state: '+id);
  check(expected!=='P0'||row.status!=='deferred',
   'P0 requirements cannot be deferred: '+id);
  check(expected==='P0'||row.status==='deferred'||row.status==='verified',
   'Lower-priority requirement status must be explicit: '+id);
  if(row.status==='verified')check(validEvidence(row.verifiedEvidence),
   'Verified requirement has no reviewed evidence: '+id);
  counters[expected]++;
  if(expected==='P0'&&row.status!=='verified')blockers.push(id);
  else if(expected==='P0')manualReview.push(id);
 }
 check(counters.P0===60&&counters.P2===2&&counters.P3===1,
  'Priority distribution differs from issue #30');
 check(Array.isArray(input.audits)&&input.audits.length===TEST_AUDITS.length,
  'Real-world acceptance audit matrix is incomplete');
 const auditBlocks=[];
 for(let i=0;i<TEST_AUDITS.length;i++){
  const row=input.audits[i],id=TEST_AUDITS[i];
  check(row&&row.id===id&&typeof row.description==='string'&&row.description&&
   Array.isArray(row.verifiedEvidence)&&['pending','verified'].includes(row.status),
   'Unknown real-world audit category: '+id);
  if(row.status==='verified'){
   check(validEvidence(row.verifiedEvidence),
    'Real-world audit has no reviewed evidence: '+id);
  }else auditBlocks.push(id);
 }
 const canPublishStable=blockers.length===0&&auditBlocks.length===0;
 if(input.stableReleaseClaim&&!canPublishStable)
  throw Error('Stable Hear 3.0 release is blocked by pending P0 or physical audit evidence');
 return Object.freeze({
  format:HEAR3_RELEASE_GATE_FORMAT,
  p0Total:counters.P0,
  p0Verified:counters.P0-blockers.length,
  p0Pending:blockers.length,
  auditTotal:TEST_AUDITS.length,
  auditVerified:TEST_AUDITS.length-auditBlocks.length,
  canPublishStable,
  stableReleaseClaim:input.stableReleaseClaim,
  missingP0:blockers,
  missingAudits:auditBlocks,
  warning:'Metadata integrity only; real-world acoustic and accessibility evidence needs independent human verification.',
 });
}
