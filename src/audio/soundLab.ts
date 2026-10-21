/**
 * Everything the sound lab (public/voice-samples/index.html, dev server only) uses, imported
 * through this one module so the lab shares a single instance of each with the announcer
 * (importing them one by one from the page can load the cabin engine twice after a hot update).
 */
export { announce, setAnnouncementFlight, silenceAnnouncements } from './announcer';
export { ANNOUNCEMENT_SHARE, cabinAudio } from './cabinAudio';
export { PA_PRESETS, keyLine, paChain } from './pa';
export { cityByCode } from '../data/cities';
export * as script from '../domain/announcements';
export { planRoute, planScenic } from '../domain/flightPlan';
export { flightState, phaseBounds } from '../domain/flightProfile';
export { VOICES, clipKey, voiceFor } from '../domain/voiceClips';
