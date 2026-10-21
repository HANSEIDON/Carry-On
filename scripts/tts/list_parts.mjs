/**
 * Writes scripts/tts/parts.json: every phrase the announcements can say, per speaker, and the
 * voices the app uses. scripts/tts/generate_clips.py reads it. Re-run after changing the script
 * (src/domain/announcements.ts), cities or airlines.
 *
 * Run:  node scripts/tts/list_parts.mjs
 *
 * Node runs the app's TypeScript directly (type stripping); the hook below only fills in the
 * ".ts" the app's imports leave out.
 */
import { writeFileSync } from 'node:fs';
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith('.') && !/[.](ts|js|mjs|json)$/.test(specifier)) return next(specifier + '.ts', context);
    throw error;
  }
}`),
);

const { allParts, VOICES } = await import('../../src/domain/voiceClips.ts');
const parts = allParts().sort((a, b) => a.speaker.localeCompare(b.speaker) || a.key.localeCompare(b.key));
writeFileSync(new URL('./parts.json', import.meta.url), JSON.stringify({ voices: VOICES, parts }, null, 1) + '\n');
const count = (speaker) => parts.filter((p) => p.speaker === speaker).length;
console.log(`parts.json: ${count('captain')} captain + ${count('crew')} crew phrases`);
