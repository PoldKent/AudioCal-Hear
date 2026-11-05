/**
 * Hear 3.0 — D-051/D-059 P0: scoped, explicit local catalog deletion.
 *
 * This mutates ONLY a caller-supplied V3 catalog store. It never touches
 * Hear 2.0 storage keys, exported backups, session checkpoints or photos.
 * Revision checks detect stale previews but are NOT a cross-tab transaction.
 */
import { validateHear3Catalog } from './catalog-contract.mjs';
import { checkpointFingerprint } from './local-checkpoint-store.mjs';

function check(ok, message) { if (!ok) throw new Error(message); }
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function tokenOf(snapshot) {
  return checkpointFingerprint(JSON.stringify({
    revision:snapshot.revision, durability:snapshot.durability, catalog:snapshot.catalog,
  }));
}

function previewRemoval(catalog, {kind,id,cascade=false}) {
  check(['result','profile','device'].includes(kind), 'Unknown deletion category');
  check(typeof id==='string' && id.trim(), 'A specific entity id is required');
  check(typeof cascade==='boolean', 'Cascade choice must be explicit');
  const source=validateHear3Catalog(catalog);
  const items={result:source.results,profile:source.profiles,device:source.devices}[kind];
  check(items.some(entry=>entry.id===id), 'Selected item does not exist');
  const profileIds = kind==='device'
    ? source.profiles.filter(p=>p.deviceId===id).map(p=>p.id)
    : kind==='profile' ? [id] : [];
  const dependentResults=source.results.filter(r=>profileIds.includes(r.profileId));
  const dependentProfiles=kind==='device' ? profileIds.length : 0;
  const dependencyCount=dependentResults.length+dependentProfiles;
  check(cascade || dependencyCount===0, 'Related profiles or results require a separate cascade preview');
  const removedProfiles=new Set(profileIds);
  const resultIds=new Set(dependentResults.map(r=>r.id));
  if(kind==='result')resultIds.add(id);
  const next=validateHear3Catalog({
    ...source,
    devices:source.devices.filter(d=>!(kind==='device'&&d.id===id)),
    profiles:source.profiles.filter(p=>!removedProfiles.has(p.id)),
    results:source.results.filter(r=>!resultIds.has(r.id)),
    activeProfileId:removedProfiles.has(source.activeProfileId) ? null : source.activeProfileId,
  });
  return {
    catalog:next,
    preview:{
      kind,id,cascade,removedDevices:kind==='device'?1:0,
      removedProfiles:kind==='profile'?1:dependentProfiles,
      removedResults:resultIds.size,
      activeProfileCleared:source.activeProfileId!==null && next.activeProfileId===null,
      legacyV2Touched:false,
      willDeleteOtherProfiles:kind==='device'&&dependentProfiles>0,
      requiresSeparateCascadeConfirmation:cascade&&dependencyCount>0,
    },
  };
}

export function createHear3CatalogDeletion({store}={}) {
  check(store&&typeof store.load==='function'&&typeof store.save==='function',
    'A writable Hear 3 catalog store is required');
  let proposed=null;
  function discard() { proposed=null; }
  function preview({kind,id,cascade=false}={}) {
    proposed=null;
    const snapshot=store.load();
    const decision=previewRemoval(snapshot.catalog,{kind,id,cascade});
    proposed={token:tokenOf(snapshot),next:decision.catalog,scope:decision.preview};
    return Object.freeze(copy(decision.preview));
  }
  function commit({userInitiated=false,confirmed=false,confirmCascade=false}={}) {
    check(userInitiated===true && confirmed===true,
      'Deletion requires explicit user action and confirmation');
    check(proposed, 'Preview a deletion before confirming');
    const selected=proposed;
    check(!selected.scope.requiresSeparateCascadeConfirmation || confirmCascade===true,
      'Deleting related records requires separate cascade confirmation');
    const latest=store.load();
    check(tokenOf(latest)===selected.token,
      'Catalog changed since deletion preview; review again');
    // Consume the preview before calling storage; a failed write cannot
    // make it safe to reuse the stale, formerly approved proposal.
    proposed=null;
    const saved=store.save(copy(selected.next));
    return Object.freeze({
      deleted:true,...selected.scope,
      revision:saved.revision,durability:saved.durability,
      persistedOnDevice:saved.persistedOnDevice===true,
      warning:saved.warning??null,
      // A save that falls back to volatile memory might not survive reload.
      requiresVerifiedBackup:saved.persistedOnDevice!==true,
      audioStarted:false,
    });
  }
  return Object.freeze({preview,commit,discard});
}
