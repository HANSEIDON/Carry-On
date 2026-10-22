import type { Tier } from '../domain/types';
import SLOTS from './carrierSlots.json';

/**
 * Every carrier the app will have, numbered as in docs/CARRIER_PROMPTS.md. Each has a 3D model
 * in public/models/carriers/NNN.glb once it's made (image-to-3D, slimmed by
 * scripts/models/optimize-carriers.mjs) and an `orient` to stand it up straight; the rest show
 * as a grey "?" in the collection and aren't on sale yet.
 *
 * Fan-made looks to swap for original designs before a store release: 017 (Minecraft chest),
 * 022 (a familiar little trash-compacting robot), 027 (a familiar astromech droid); 016 when made.
 */

export interface CarrierType {
  /** Three digits, the number in docs/CARRIER_PROMPTS.md. */
  id: string;
  name: string;
  /** Membership tier needed to buy it in Duty Free. */
  tier: Tier;
  /** Miles (0: given for free). */
  price: number;
  /** Stickers it takes before it's full: one per spot on its broad panels (`slots`). */
  capacity: number;
  /** Where its stickers go, in order (baked from the model, src/components/carrierBake.ts). */
  slots: StickerSlot[];
  /** One line for the shop window. */
  blurb: string;
  /** It has a 3D model (and can be bought). */
  model: boolean;
  /**
   * How to stand the model up straight, front toward +Z: [pitch, yaw, roll] in degrees (Euler
   * "YXZ"). Image-to-3D keeps the slanted angle of the source photo; these come from finding the
   * rotation that gives the tightest box (so it's level), then picking which side is the front.
   */
  orient?: [number, number, number];
}

/**
 * A sticker spot: the side it's on (index into STICKER_SIDES), the point on the carrier's surface
 * in the space of the fitted model (longest side 1, standing on y = 0, front toward +Z), and the
 * sticker's size there (1: STICKER_SIZE; smaller on carriers with little flat room).
 */
export type StickerSlot = [side: number, x: number, y: number, z: number, size: number];

/** The sides stickers go on, in the order they fill: d points out of the side, u across, v up. */
export const STICKER_SIDES = [
  { name: 'front', d: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { name: 'right', d: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { name: 'left', d: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { name: 'top', d: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { name: 'back', d: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
] as const;

/**
 * A sticker spot on a carrier whose longest side is 1: a travel label fills it (2:1); handling
 * stickers are a little smaller (stickerArtwork.ts).
 */
export const STICKER_SIZE = { w: 0.14, h: 0.07 };

/** Price by membership tier (draft balance: a two-hour flight earns about 750 miles). */
export const TIER_PRICE: Record<Tier, number> = {
  basic: 2_500,
  silver: 6_000,
  gold: 15_000,
  platinum: 30_000,
};

const carrier = (
  n: number,
  name: string,
  tier: Tier,
  blurb: string,
  orient?: [number, number, number],
): CarrierType => {
  const id = String(n).padStart(3, '0');
  const slots = (SLOTS as unknown as Record<string, StickerSlot[]>)[id] ?? [];
  return { id, name, tier, price: n === 1 ? 0 : TIER_PRICE[tier], capacity: slots.length, slots, blurb, model: !!orient, orient };
};

export const CARRIERS: readonly CarrierType[] = [
  carrier(1, 'Starter Shell', 'basic', 'Matte navy hard shell. Every journey starts here.', [-5.5, 32.5, 0]),
  carrier(2, 'Aluminum Ribbed', 'gold', 'Brushed aluminum, ribbed and riveted.', [0, 37.5, 1]),
  carrier(3, 'Vintage Leather', 'silver', 'Worn brown leather, brass latches, two straps.', [-11, 328.5, 0]),
  carrier(4, 'Steamer Trunk', 'gold', 'Wood slats and brass, from the age of ocean liners.'),
  carrier(5, 'Tweed Weekender', 'silver', 'Check tweed and tan leather, for long weekends.'),
  carrier(6, 'Pilot Flight Case', 'silver', 'The captain’s black leather case, combination locks.', [-13, 145, -0.5]),
  carrier(7, 'Cabin Trolley 70s', 'silver', 'Orange and cream, straight out of 1974.'),
  carrier(8, 'Taxidermy Fox', 'platinum', 'A Victorian trunk with a curled-up fox on the lid.'),
  carrier(9, 'Owl Curio', 'platinum', 'A cabinet of curiosities, watched over by an owl.', [-12, 53, 0]),
  carrier(10, 'Shell Turtle', 'gold', 'Slow and steady, in a hexagon shell.', [-1, 36.5, -3.5]),
  carrier(11, 'Fluffy Sheep', 'silver', 'Covered in wool, horns for handles.'),
  carrier(12, 'Croc Leather', 'gold', 'Green crocodile leather, gold hardware, and real teeth.', [-10, 320.5, -0.5]),
  carrier(13, 'Watermelon', 'silver', 'Striped rind outside, summer inside.'),
  carrier(14, 'Bread Loaf', 'silver', 'Golden crust, fresh every morning.'),
  carrier(15, 'Ride-on Scooter Case', 'platinum', 'Sit on it and ride to the gate.', [-15.5, 40, 2]),
  carrier(16, 'Shulker Box', 'gold', 'A purple box with someone peeking out.'),
  carrier(17, 'Minecraft Chest', 'basic', 'Oak planks and an iron latch, block by block.', [-13.5, 45, 0.5]),
  carrier(18, 'Pixel Treasure Chest', 'gold', 'Eight bits of gold trim.'),
  carrier(19, 'Dungeon Mimic', 'platinum', 'It looks like treasure. It has teeth.'),
  carrier(20, 'Cardboard Box', 'basic', 'Packing tape and wheels taped on. It works.'),
  carrier(21, 'Fruit Crate', 'basic', 'A tangerine crate with rope handles.'),
  carrier(22, 'Robo Buddy', 'platinum', 'A little cargo robot that follows you around.', [-25, 329, 6.5]),
  carrier(23, 'Military Footlocker', 'basic', 'Olive drab, stencils and steel corners.', [-14, 325.5, 0]),
  carrier(24, 'Air Cargo ULD', 'gold', 'A cargo hold container, shrunk to carry-on.'),
  carrier(25, 'Retro Rocket', 'platinum', 'Fins, a porthole, and a 1950s idea of the future.', [-12, 57.5, 1]),
  carrier(26, 'Astronaut Pod', 'platinum', 'A survival pod with orange stripes.'),
  carrier(27, 'Astro Droid', 'platinum', 'Beeps along behind you, dome turning.', [2, 25.5, 5.5]),
  carrier(28, 'Wizard Satchel', 'gold', 'Runes, buckles, and a star charm.'),
  carrier(29, 'Balloon Basket', 'gold', 'Rattan, sandbags, and a little balloon above.'),
  carrier(30, 'Paper Plane Case', 'gold', 'Folded like the plane you made in class.'),
];

/** The carrier everyone starts with. */
export const STARTER_CARRIER_ID = '001';

const BY_ID = new Map(CARRIERS.map((c) => [c.id, c]));

export function carrierType(id: string): CarrierType {
  return BY_ID.get(id) ?? BY_ID.get(STARTER_CARRIER_ID)!;
}

/** Where the model is, relative to the site root. */
export function carrierModelUrl(id: string): string {
  return `${import.meta.env.BASE_URL}models/carriers/${id}.glb`;
}

/** Bump after baking the card pictures again, so devices fetch the new ones. */
const THUMB_VERSION = 1;

/** The card picture baked from the model (src/components/carrierBake.ts). */
export function carrierThumbUrl(id: string): string {
  return `${import.meta.env.BASE_URL}models/carriers/thumbs/${id}.webp?v=${THUMB_VERSION}`;
}
