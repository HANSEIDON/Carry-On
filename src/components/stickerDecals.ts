import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Euler,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Raycaster,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { STICKER_SIDES, STICKER_SIZE, type StickerSlot } from '../data/carriers';
import { hashString, seededRandom } from '../domain/random';
import type { StickerArt } from '../domain/stickerArt';

/**
 * Stickers on a 3D carrier: each one drawn as a little texture (a thermal-paper bag tag, a
 * priority label), then projected onto the carrier's surface as a decal, so it follows the
 * surface like a real sticker. Where they go is the carrier's own list of spots.
 */

// --- Drawing ---------------------------------------------------------------------------------

/** Paper yellows a little with each newer sticker on top of it (0 = newest). */
function aged(age: number) {
  return Math.min(1, age / 12);
}

function paperTone(ctx: CanvasRenderingContext2D, w: number, h: number, age: number, seed: number) {
  const rand = seededRandom(seed);
  ctx.fillStyle = `rgba(214, 186, 120, ${0.22 * aged(age)})`;
  ctx.fillRect(0, 0, w, h);
  // Grime and scuffs.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(90, 70, 40, ${0.04 + rand() * 0.06 * (0.4 + aged(age))})`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, 1 + rand() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  const rand = seededRandom(seed);
  let cx = x;
  ctx.fillStyle = '#141414';
  while (cx < x + w) {
    const bar = 1 + Math.floor(rand() * 3);
    if (rand() > 0.42) ctx.fillRect(cx, y, bar, h);
    cx += bar + 1;
  }
}

function drawBagTag(s: StickerArt, age: number): HTMLCanvasElement {
  const w = 512;
  const h = 224;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f6f2e8';
  ctx.fillRect(0, 0, w, h);
  // Airline band.
  ctx.fillStyle = s.airlineColor;
  ctx.fillRect(0, 0, 34, h);
  ctx.fillStyle = '#1b1b1b';
  ctx.font = '600 22px "IBM Plex Mono", monospace';
  ctx.fillText(s.airlineName.toUpperCase(), 52, 38);
  ctx.font = '500 20px "IBM Plex Mono", monospace';
  const day = new Date(s.appliedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');
  ctx.fillText(`${s.flightNumber} · ${day}`, 52, 66);
  // Destination, big.
  ctx.font = '600 104px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText(s.code, 50, 170);
  ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillText(s.city.toUpperCase(), 268, 118);
  ctx.fillText(`${s.fromCode} → ${s.code}`, 268, 150);
  barcode(ctx, 268, 166, 220, 34, hashString(s.id));
  paperTone(ctx, w, h, age, hashString(`${s.id}|paper`));
  return c;
}

function drawPriority(s: StickerArt, age: number): HTMLCanvasElement {
  const w = 384;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c8321f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#fbe9d2';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.fillStyle = '#fbe9d2';
  ctx.font = '600 76px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PRIORITY', w / 2, 100);
  ctx.font = '500 20px "IBM Plex Mono", monospace';
  ctx.fillText(s.airlineName.toUpperCase(), w / 2, 134);
  paperTone(ctx, w, h, age, hashString(`${s.id}|paper`));
  return c;
}

const textures = new Map<string, CanvasTexture>();

function stickerTexture(s: StickerArt, age: number): CanvasTexture {
  const key = `${s.id}|${Math.round(aged(age) * 6)}`;
  let t = textures.get(key);
  if (!t) {
    t = new CanvasTexture(s.kind === 'priority' ? drawPriority(s, age) : drawBagTag(s, age));
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    textures.set(key, t);
  }
  return t;
}

// --- Placing ---------------------------------------------------------------------------------

/** Only the triangles near the hit point, so projecting a decal stays cheap on 50k-triangle models. */
function nearby(mesh: Mesh, point: Vector3, radius: number): Mesh | null {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const normal = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const index = geo.index;
  const count = index ? index.count : pos.count;
  const local = mesh.worldToLocal(point.clone());
  const scale = mesh.getWorldScale(new Vector3()).x || 1;
  const r2 = (radius / scale) ** 2;
  const keep: number[] = [];
  const a = new Vector3();
  for (let i = 0; i < count; i += 3) {
    const i0 = index ? index.getX(i) : i;
    a.fromBufferAttribute(pos, i0);
    if (a.distanceToSquared(local) < r2) keep.push(i, i + 1, i + 2);
  }
  if (keep.length === 0) return null;
  const out = new BufferGeometry();
  const take = (attr: typeof pos | undefined, size: number) => {
    if (!attr) return;
    const arr = new Float32Array(keep.length * size);
    keep.forEach((k, j) => {
      const v = index ? index.getX(k) : k;
      for (let c = 0; c < size; c++) arr[j * size + c] = attr.getComponent(v, c);
    });
    return new BufferAttribute(arr, size);
  };
  out.setAttribute('position', take(pos, 3)!);
  if (normal) out.setAttribute('normal', take(normal, 3)!);
  if (uv) out.setAttribute('uv', take(uv, 2)!);
  const part = new Mesh(out);
  part.matrixWorld.copy(mesh.matrixWorld);
  return part;
}

/**
 * Decal meshes for the stickers on a carrier, in the same space as `model` (the fitted model,
 * world matrices up to date). The n-th sticker goes on the n-th spot (`slots`, baked from the
 * model: broad panels only, a cluster growing from the front), upright with a slight tilt of its
 * own. Newest last, so it's drawn on top where it overlaps.
 */
export function stickerDecals(model: Object3D, slots: StickerSlot[], stickers: StickerArt[]): Mesh[] {
  const meshes: Mesh[] = [];
  model.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh);
  });
  const ordered = [...stickers].sort((a, b) => a.appliedAt - b.appliedAt).slice(0, slots.length);
  const ray = new Raycaster();
  const out: Mesh[] = [];
  ordered.forEach((s, i) => {
    const [sideIndex, x, y, z, size] = slots[i];
    const side = STICKER_SIDES[sideIndex];
    const outward = new Vector3(...side.d);
    const across = new Vector3(...side.u);
    const up = new Vector3(...side.v);
    const rand = seededRandom(hashString(s.id));
    // A little off the spot and a little crooked, the way a hand sticks it on.
    const spot = new Vector3(x, y, z)
      .addScaledVector(across, (rand() - 0.5) * 0.012)
      .addScaledVector(up, (rand() - 0.5) * 0.008);
    ray.set(spot.clone().addScaledVector(outward, 0.25), outward.clone().negate());
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return;
    const wide = s.kind !== 'priority';
    const width = (wide ? STICKER_SIZE.w : STICKER_SIZE.w * 0.66) * size;
    const height = wide ? STICKER_SIZE.h * size : width * (160 / 384);
    const turn = new Matrix4().makeBasis(across, up, outward).multiply(new Matrix4().makeRotationZ((rand() - 0.5) * 0.28));
    const orientation = new Euler().setFromRotationMatrix(turn);
    const part = nearby(hit.object as Mesh, hit.point, width);
    if (!part) return;
    const geometry = new DecalGeometry(part, hit.point, orientation, new Vector3(width, height, 0.1));
    part.geometry.dispose();
    const age = ordered.length - 1 - i;
    const material = new MeshStandardMaterial({
      map: stickerTexture(s, age),
      transparent: true,
      roughness: wide ? 0.42 : 0.55,
      metalness: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4 - i * 0.05,
    });
    const decal = new Mesh(geometry, material);
    decal.renderOrder = i + 1;
    out.push(decal);
  });
  return out;
}
