/**
 * Hear 3.0 phase-1 state contract (D-003, D-006, D-037, D-054–057, D-063).
 * PURE STATE ONLY: this module does NOT control physical audio output.
 * Audio adapter MUST silence playback on ANSWER/INTERRUPT/ROUTE_CHANGED.
 */
export const SESSION_SCHEMA_VERSION = 1;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function createSession({ profileId, routeId = null, minDbfs, maxDbfs }) {
  ensure(typeof profileId === 'string' && profileId.trim(), 'profileId is required');
  ensure(Number.isFinite(minDbfs) && Number.isFinite(maxDbfs) && minDbfs <= maxDbfs && maxDbfs <= 0, 'Invalid authorized digital range');
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    profileId,
    routeId,
    authorizedDigitalRangeDbfs: { minDbfs, maxDbfs },
    status: 'ready',
    currentTone: null,
    observations: [],
    invalidatedToneIds: [],
    routeCheckRequired: false,
    interruption: null,
  };
}

/**
 * Does NOT resume automatically or elevate authorized digital limits.
 * Route confirmation is only a user-perceived route check; it does not
 * establish physical device identity, SPL, or acoustic calibration.
 */
export function transitionSession(session, event) {
  ensure(session?.schemaVersion === SESSION_SCHEMA_VERSION, 'Unknown session schema');
  ensure(event && typeof event.type === 'string', 'Event type is required');
  switch (event.type) {
    case 'START_TONE': {
      ensure(session.status === 'ready' && !session.routeCheckRequired, 'Session cannot play a tone');
      const { toneId, frequencyHz, digitalLevelDbfs, channel = 'joint' } = event;
      ensure(typeof toneId === 'string' && toneId.length > 0, 'toneId is required');
      ensure(Number.isFinite(frequencyHz) && frequencyHz > 0, 'Invalid frequency');
      ensure(Number.isFinite(digitalLevelDbfs), 'Invalid digital level');
      ensure(['left', 'right', 'joint'].includes(channel), 'Invalid channel');
      ensure(digitalLevelDbfs >= session.authorizedDigitalRangeDbfs.minDbfs && digitalLevelDbfs <= session.authorizedDigitalRangeDbfs.maxDbfs, 'Digital level exceeds authorized limits');
      return { ...session, status: 'playing', currentTone: { toneId, frequencyHz, digitalLevelDbfs, channel } };
    }
    case 'ANSWER': {
      ensure(session.status === 'playing' && session.currentTone, 'No tone is playing');
      ensure(['heard', 'not-heard'].includes(event.response), 'Invalid response');
      return {
        ...session,
        status: 'ready',
        currentTone: null,
        observations: [...session.observations, { ...session.currentTone, response: event.response, provenance: 'user-response' }],
      };
    }
    case 'INTERRUPT':
    case 'ROUTE_CHANGED': {
      ensure(['playing', 'ready', 'paused'].includes(session.status), 'Cannot interrupt a completed session');
      const invalidated = session.currentTone
        ? [...new Set([...session.invalidatedToneIds, session.currentTone.toneId])]
        : session.invalidatedToneIds;
      return {
        ...session,
        status: 'paused',
        currentTone: null,
        invalidatedToneIds: invalidated,
        routeId: event.type === 'ROUTE_CHANGED' ? (event.routeId ?? null) : session.routeId,
        routeCheckRequired: session.routeCheckRequired || event.type === 'ROUTE_CHANGED' || event.routeMayHaveChanged === true,
        interruption: event.type,
      };
    }
    case 'CONFIRM_ROUTE': {
      ensure(session.status === 'paused' && session.routeCheckRequired, 'Route confirmation not required');
      ensure(event.confirmed === true, 'Explicit route confirmation required');
      return { ...session, routeCheckRequired: false };
    }
    case 'RESUME': {
      ensure(session.status === 'paused', 'Session is not paused');
      ensure(session.routeCheckRequired === false, 'Route check required before resume');
      ensure(event.userInitiated === true, 'Explicit user action required to resume');
      return { ...session, status: 'ready', interruption: null };
    }
    case 'FINISH': {
      ensure(session.status === 'ready', 'Finish only from ready state');
      return { ...session, status: 'completed' };
    }
    default:
      throw new Error('Unsupported event: ' + event.type);
  }
}
