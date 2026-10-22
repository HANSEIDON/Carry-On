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
  Triangle,
  Vector3,
} from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { STICKER_SIDES, STICKER_SIZE, type StickerSlot } from '../data/carriers';
import { hashString, seededRandom } from '../domain/random';
import { stickerArtwork } from './stickerArtwork';
import type { StickerArt } from '../domain/stickerArt';

/**
 * Stickers on a 3D carrier: each one's artwork (stickerArtwork.ts) as a texture, projected onto
 * the carrier's surface as a decal, so it follows the surface like a real sticker. Where they go
 * is the carrier's own list of spots.
 */

const textures = new Map<string, { texture: CanvasTexture; scale: number; aspect: number }>();

function stickerTexture(s: StickerArt, age: number): { texture: CanvasTexture; scale: number; aspect: number } {
  const key = `${s.id}|${Math.round(Math.min(1, age / 12) * 6)}`;
  let t = textures.get(key);
  if (!t) {
    const art = stickerArtwork(s, age);
    const texture = new CanvasTexture(art.canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    t = { texture, scale: art.scale, aspect: art.canvas.height / art.canvas.width };
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
  // A triangle is near if any part of it is (not just its first corner): long thin triangles down
  // a ribbed shell's grooves would otherwise be left out, and the sticker would have a hole there.
  const tri = new Triangle();
  const closest = new Vector3();
  const at = (k: number) => (index ? index.getX(k) : k);
  for (let i = 0; i < count; i += 3) {
    tri.a.fromBufferAttribute(pos, at(i));
    tri.b.fromBufferAttribute(pos, at(i + 1));
    tri.c.fromBufferAttribute(pos, at(i + 2));
    if (tri.closestPointToPoint(local, closest).distanceToSquared(local) < r2) keep.push(i, i + 1, i + 2);
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
    const age = ordered.length - 1 - i;
    const art = stickerTexture(s, age);
    const width = STICKER_SIZE.w * size * art.scale;
    const height = width * art.aspect;
    const turn = new Matrix4().makeBasis(across, up, outward).multiply(new Matrix4().makeRotationZ((rand() - 0.5) * 0.28));
    const orientation = new Euler().setFromRotationMatrix(turn);
    const part = nearby(hit.object as Mesh, hit.point, width);
    if (!part) return;
    const geometry = new DecalGeometry(part, hit.point, orientation, new Vector3(width, height, 0.1));
    part.geometry.dispose();
    const material = new MeshStandardMaterial({
      map: art.texture,
      transparent: true,
      roughness: 0.5,
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
