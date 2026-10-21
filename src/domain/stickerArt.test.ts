import { describe, expect, it } from 'vitest';
import type { Flight, Sticker } from '../db/db';
import { stickerArt } from './stickerArt';

const sticker: Sticker = { id: 's1', carrierId: 'c1', flightId: 'f1', kind: 'bag_tag', code: 'HND', appliedAt: 1_700_000_000_000 };

describe('stickerArt', () => {
  it('prints the flight on the tag: airline, number, from and to, city', () => {
    const flight = { id: 'f1', fromCode: 'ICN', toCode: 'HND', airlineCode: 'HL', flightNumber: 'HL 712' } as Flight;
    expect(stickerArt(sticker, flight)).toMatchObject({
      code: 'HND',
      fromCode: 'ICN',
      city: 'Tokyo',
      flightNumber: 'HL 712',
      airlineName: 'Hanul Air',
      airlineColor: '#1f5fa8',
    });
  });

  it('still draws a tag when the flight is gone', () => {
    const art = stickerArt({ ...sticker, code: 'XXX' }, undefined);
    expect(art).toMatchObject({ code: 'XXX', fromCode: 'XXX', city: 'XXX', flightNumber: '' });
    expect(art.airlineName).toBeTruthy();
  });
});
