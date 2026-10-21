import { airlineByCode } from '../data/airlines';
import { cityByCode } from '../data/cities';
import type { Flight, Sticker } from '../db/db';
import type { StickerKind } from './landing';

/** What a sticker shows: everything printed on the tag, from the sticker and its flight. */
export interface StickerArt {
  id: string;
  kind: StickerKind;
  /** Destination airport. */
  code: string;
  fromCode: string;
  city: string;
  flightNumber: string;
  airlineName: string;
  airlineColor: string;
  appliedAt: number;
}

export function stickerArt(sticker: Sticker, flight: Flight | undefined): StickerArt {
  const airline = airlineByCode(flight?.airlineCode ?? '');
  return {
    id: sticker.id,
    kind: sticker.kind,
    code: sticker.code,
    fromCode: flight?.fromCode ?? sticker.code,
    city: cityByCode(sticker.code)?.city ?? sticker.code,
    flightNumber: flight?.flightNumber ?? '',
    airlineName: airline.name,
    airlineColor: airline.color,
    appliedAt: sticker.appliedAt,
  };
}
