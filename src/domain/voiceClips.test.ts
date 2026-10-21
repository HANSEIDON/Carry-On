import { describe, expect, it } from 'vitest';
import { airlineFor } from '../data/airlines';
import { CITIES } from '../data/cities';
import { arrival, cruise, descent, welcome, type AnnouncementContext } from './announcements';
import { routeBetween } from './booking';
import { flightState, phaseBounds } from './flightProfile';
import { planRoute } from './flightPlan';
import { seededRandom } from './random';
import { allParts, clipKey, VOICES, voiceFor } from './voiceClips';

const parts = allParts();
const known = new Set(parts.map((p) => `${p.speaker}|${p.key}`));

describe('voice clips', () => {
  it('names clips after their phrase', () => {
    expect(clipKey("We'll have you in Tokyo,")).toBe('well-have-you-in-tokyo');
    expect(clipKey('to São Paulo.')).toBe('to-sao-paulo');
    expect(clipKey('The local time is two fifteen p.m.')).toBe('the-local-time-is-two-fifteen-p-m');
  });

  it('gives every phrase its own clip name', () => {
    for (const speaker of ['captain', 'crew'] as const) {
      const mine = parts.filter((p) => p.speaker === speaker);
      expect(new Set(mine.map((p) => p.key)).size).toBe(mine.length);
    }
  });

  it('has a clip for every phrase of every announcement on real routes', () => {
    const rand = seededRandom(474);
    for (let i = 0; i < 400; i++) {
      const from = CITIES[Math.floor(rand() * CITIES.length)];
      const to = CITIES[Math.floor(rand() * CITIES.length)];
      if (from === to) continue;
      const plan = planRoute(from, to);
      const route = routeBetween(from, to);
      const { climbEnd, descentStart } = phaseBounds(plan.minutes);
      const scenic = rand() < 0.2;
      const ctx: AnnouncementContext = {
        airline: (scenic ? { name: 'Carry On Airways' } : airlineFor(from.countryCode)).name,
        flightNumber: plan.flightNumber,
        fromCity: from.city,
        toCity: to.city,
        scenic,
        minutes: scenic ? 5 * (1 + Math.floor(rand() * 9)) : plan.minutes,
        altitudeFt: flightState((climbEnd + descentStart) / 2, plan.minutes, route.aircraft, scenic).altitudeFt,
        local: { hour: Math.floor(rand() * 24), minute: Math.floor(rand() * 60) },
      };
      const announcements = [
        welcome(ctx),
        cruise({ ...ctx, remainingMinutes: Math.round(plan.minutes * (1 - climbEnd)) }),
        descent({ ...ctx, remainingMinutes: Math.round(plan.minutes * (1 - descentStart)) }),
        arrival(ctx),
      ];
      for (const a of announcements) {
        for (const text of a.parts) expect(known.has(`${a.speaker}|${clipKey(text)}`), text).toBe(true);
      }
    }
  });

  it('keeps one captain per flight and spreads flights over the roster', () => {
    expect(voiceFor('captain', 'HL 474')).toBe(voiceFor('captain', 'HL 474'));
    expect(voiceFor('crew', 'HL 474')).toBe(VOICES.crew[0]);
    const used = new Set(Array.from({ length: 50 }, (_, n) => voiceFor('captain', `HL ${100 + n}`)));
    expect(used.size).toBe(VOICES.captain.length);
  });
});
