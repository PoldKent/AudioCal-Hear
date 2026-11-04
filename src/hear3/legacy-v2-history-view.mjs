/**
 * Hear 3.0 D-051 — read-only V2 historical measurements browser projection.
 * Keeps historical V2 records visible WITHOUT treating any as a calibrated
 * threshold, a validated V3 audiogram, or an automatic graphic EQ result.
 * The source itself is NEVER altered and no data is sent remotely.
 */
import { auditLegacyV2Profiles } from './legacy-v2-migration-audit.mjs';

const CHANNELS = new Set(['both', 'left', 'right']);
const KINDS = new Set(['heard', 'unheard', 'stillheard', 'timeout', 'skipped', 'unconfirmed']);
function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function countMap(value) { return isObject(value) ? Object.keys(value).length : 0; }

/**
 * The number of entries is a count of V2 historical records, not reliable
 * hearing thresholds. Invalid records are counted as unclassified, never
 * turned into a "not heard" finding.
 */
export function summarizeLegacyV2History(rawProfilesText) {
  const audited = auditLegacyV2Profiles(rawProfilesText);
  const profiles = JSON.parse(rawProfilesText);
  const perProfile = profiles.map((p, index) => {
    const rawMeasures = isObject(p.measures) ? p.measures : {};
    const observations = [];
    let unclassified = 0;
    for (const [key, entries] of Object.entries(rawMeasures)) {
      const m = /^(\d+(?:\.\d+)?)\|(both|left|right)$/.exec(key);
      if (!m || !Array.isArray(entries)) {
        unclassified++;
        continue;
      }
      const hz = Number(m[1]);
      const channel = m[2];
      if (!Number.isFinite(hz) || hz < 20 || hz > 20000 || !CHANNELS.has(channel)) {
        unclassified++;
        continue;
      }
      for (const record of entries) {
        const kind = isObject(record) && KINDS.has(record.kind) ? record.kind : null;
        if (!kind) { unclassified++; continue; }
        observations.push({ frequencyHz: hz, channel, kind, source: 'legacy-v2-unverified' });
      }
    }
    observations.sort((a,b) => a.frequencyHz-b.frequencyHz ||
      a.channel.localeCompare(b.channel) || a.kind.localeCompare(b.kind));
    const legacyAdjustmentBandCounts = {
      manual: countMap(p.manual),
      balance: countMap(p.balance),
      loudnessInline: countMap(p.loudnessInline),
      loudness: countMap(p.loudness),
    };
    const sweepCount = countMap(p.sweepRecords);
    const projection = audited.preview.profiles[index];
    return {
      sourceProfileId: p.id,
      name: p.name,
      deviceType: p.type,
      frequencyBands: [...p.bands],
      historicalRecordCount: observations.length,
      unclassifiedRecordCount: unclassified,
      recordedKinds: [...new Set(observations.map(x=>x.kind))].sort(),
      channels: [...new Set(observations.map(x=>x.channel))].sort(),
      legacyAdjustmentBandCounts,
      sweepCount,
      archivedOnlyFields: projection.archivedOnlyFields,
      observations,
      validation: 'legacy-observations-are-not-v3-thresholds',
    };
  });
  return {
    source: 'audiocal-hear-profiles-v1',
    profileCount: perProfile.length,
    migratedV3Results: 0,
    acousticValidation: 'not-established',
    imported: false,
    readOnly: true,
    profiles: perProfile,
    warning: 'Historical V2 measurements are displayed as unverified records. No threshold or V3 EQ is inferred.',
  };
}
