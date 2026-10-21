import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  Sphere,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CARRIERS, carrierModelUrl, STICKER_SIDES, STICKER_SIZE, type StickerSlot } from '../data/carriers';
import { hashString, seededRandom } from '../domain/random';
import { fitModel, LIGHTS, PANELS, VIEW } from './Carrier3D';

/**
 * Dev-only: bakes what each carrier needs besides its model, from the model itself.
 *  - its card picture (public/models/carriers/thumbs/NNN.webp), drawn in the same studio and
 *    from the same angle as the 3D view, cropped to the carrier;
 *  - its sticker spots (src/data/carrierSlots.json): where on its broad, flat-ish panels a
 *    sticker can go, and so how many it takes before it's full.
 * Open the app with `?bake-carriers` while `npm run dev` runs; the dev server (vite.config.ts)
 * writes the files. Run it again after adding a model or changing its `orient`.
 */

const RENDER = 768;
const OUT = 384;
/** Space around the carrier in the cropped picture, as a share of its longest side. */
const MARGIN = 0.06;

let shared: { renderer: WebGLRenderer; studio: Scene } | null = null;

function stage() {
  if (shared) return shared;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(RENDER, RENDER, false);
  renderer.toneMappingExposure = LIGHTS.exposure;
  const studio = new Scene();
  const panels = new Scene();
  for (const p of PANELS) {
    const panel = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({ color: new Color(p.color ?? '#ffffff').multiplyScalar(p.intensity), side: DoubleSide, toneMapped: false }),
    );
    panel.position.set(...p.position);
    panel.scale.set(...p.scale, 1);
    panel.lookAt(0, 0, 0);
    panels.add(panel);
  }
  studio.environment = new PMREMGenerator(renderer).fromScene(panels, 0).texture;
  studio.environmentIntensity = LIGHTS.environment;
  studio.add(new AmbientLight(0xffffff, LIGHTS.ambient));
  const key = new DirectionalLight(0xffffff, LIGHTS.key.intensity);
  key.position.set(...LIGHTS.key.position);
  const fill = new DirectionalLight(LIGHTS.fill.color, LIGHTS.fill.intensity);
  fill.position.set(...LIGHTS.fill.position);
  studio.add(key, fill);
  shared = { renderer, studio };
  return shared;
}

async function load(id: string, orient?: [number, number, number]): Promise<Object3D> {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(carrierModelUrl(id));
  const model = fitModel(gltf.scene, orient ?? CARRIERS.find((c) => c.id === id)?.orient);
  model.updateMatrixWorld(true);
  return model;
}

function dispose(model: Object3D) {
  model.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      for (const m of [mesh.material].flat()) m.dispose();
    }
  });
}

// --- The card picture --------------------------------------------------------------------------

/** Crops the rendered picture to the carrier (by its opaque pixels), square, and scales it down. */
function crop(source: HTMLCanvasElement): HTMLCanvasElement {
  const read = document.createElement('canvas');
  read.width = source.width;
  read.height = source.height;
  const rctx = read.getContext('2d', { willReadFrequently: true })!;
  rctx.drawImage(source, 0, 0);
  const { data, width, height } = rctx.getImageData(0, 0, read.width, read.height);
  let x0 = width;
  let y0 = height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const side = Math.max(x1 - x0, y1 - y0) * (1 + MARGIN * 2);
  const out = document.createElement('canvas');
  out.width = OUT;
  out.height = OUT;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(read, (x0 + x1) / 2 - side / 2, (y0 + y1) / 2 - side / 2, side, side, 0, 0, OUT, OUT);
  return out;
}

function picture(model: Object3D): HTMLCanvasElement {
  const { renderer, studio } = stage();
  renderer.setSize(RENDER, RENDER, false);
  studio.add(model);
  // The 3D view's line of sight, pulled back until the whole carrier fits.
  const sphere = new Box3().setFromObject(model, true).getBoundingSphere(new Sphere());
  const camera = new PerspectiveCamera(VIEW.fov, 1, 0.05, 20);
  const direction = new Vector3(...VIEW.position).sub(new Vector3(0, VIEW.target, 0)).normalize();
  camera.position.copy(sphere.center).addScaledVector(direction, sphere.radius / Math.sin((VIEW.fov * Math.PI) / 360));
  camera.lookAt(sphere.center);
  renderer.render(studio, camera);
  studio.remove(model);
  return crop(renderer.domElement);
}

/** Dev helper: the card picture for a carrier as it would look with another `orient`. */
export async function previewCarrier(id: string, orient?: [number, number, number]): Promise<HTMLCanvasElement> {
  const model = await load(id, orient);
  const out = picture(model);
  dispose(model);
  return out;
}

// --- Sticker spots ------------------------------------------------------------------------------

/** Model units per cell when looking at a side (the model's longest side is 1). */
const CELL = 0.01;
/**
 * The surface is judged smoothed over this many cells around (models from images are bumpy):
 * its slope, and how far a cell stands out from it.
 */
const SMOOTH = 3;
/** A panel slopes away from the side by less than this (tan 35°): steeper is a curve or an edge. */
const SLOPE = 0.7;
/** A cell standing out of the smoothed surface more than this is hardware: a latch, a rivet, a corner. */
const ROUGH = 0.012;
/** Neighbouring cells further apart in depth than this are different parts (a handle over the body). */
const STEP = 0.015;
/** A sticker's patch may curve off a flat plane this much, no more. */
const BULGE = 0.025;
/** Neighbouring stickers may overlap by this share of a sticker, no more. */
const OVERLAP = 0.14;
/** Even the biggest trunk is full at this many. */
const MOST = 40;
/** Fewer spots than this, and the stickers get smaller (these sizes, in turn). */
const FEWEST = 6;
const SMALLER = [1, 0.8, 0.65];

/** Per pixel: the depth (16 bits) on an orthographic view. */
const probe = new ShaderMaterial({
  side: DoubleSide,
  uniforms: { near: { value: 0 }, far: { value: 1 } },
  vertexShader: /* glsl */ `
    varying float vDepth;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform float near;
    uniform float far;
    varying float vDepth;
    void main() {
      float d = clamp((vDepth - near) / (far - near), 0.0, 0.9999);
      gl_FragColor = vec4(0.0, floor(d * 255.0) / 255.0, fract(d * 255.0), 1.0);
    }`,
});

interface Grid {
  cols: number;
  rows: number;
  /** Panel cells: their component (≥ 0), or -1. */
  part: Int32Array;
  /** Smoothed depth, and as rendered. */
  depth: Float32Array;
  raw: Float32Array;
  /** Cell (i, j) → point in model space on the camera plane. */
  at: (i: number, j: number) => Vector3;
  dir: Vector3;
}

function look(model: Object3D, box: Box3, side: (typeof STICKER_SIDES)[number]): Grid {
  const { renderer } = stage();
  const dir = new Vector3(...side.d);
  const u = new Vector3(...side.u);
  const v = new Vector3(...side.v);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const span = (a: Vector3) => Math.abs(size.dot(a));
  const cols = Math.ceil(span(u) / CELL);
  const rows = Math.ceil(span(v) / CELL);
  const reach = span(dir) / 2 + 1;
  const camera = new OrthographicCamera((-cols * CELL) / 2, (cols * CELL) / 2, (rows * CELL) / 2, (-rows * CELL) / 2, 0.5, reach * 2 + 1);
  camera.position.copy(center).addScaledVector(dir, reach);
  camera.up.copy(v);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  probe.uniforms.near.value = camera.near;
  probe.uniforms.far.value = camera.far;

  const scene = new Scene();
  scene.overrideMaterial = probe;
  scene.add(model);
  const target = new WebGLRenderTarget(cols, rows);
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  const px = new Uint8Array(cols * rows * 4);
  renderer.readRenderTargetPixels(target, 0, 0, cols, rows, px);
  renderer.setRenderTarget(null);
  target.dispose();
  scene.remove(model);

  // The surface, and the same smoothed (bumps of leather and wood grain don't count).
  const n = cols * rows;
  const raw = new Float32Array(n);
  const covered = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    covered[k] = px[k * 4 + 3] > 0 ? 1 : 0;
    raw[k] = camera.near + ((px[k * 4 + 1] + px[k * 4 + 2] / 255) / 255) * (camera.far - camera.near);
  }
  const depth = new Float32Array(n);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let sum = 0;
      let count = 0;
      for (let y = Math.max(0, j - SMOOTH); y <= Math.min(rows - 1, j + SMOOTH); y++) {
        for (let x = Math.max(0, i - SMOOTH); x <= Math.min(cols - 1, i + SMOOTH); x++) {
          const k = y * cols + x;
          if (covered[k]) {
            sum += raw[k];
            count++;
          }
        }
      }
      depth[j * cols + i] = count ? sum / count : Infinity;
    }
  }
  // Panel cells: gently sloped, not standing out, away from the outline. Then split into parts
  // wherever the depth jumps (a handle, a wheel).
  const panel = new Uint8Array(n);
  const d = 2;
  for (let j = d; j < rows - d; j++) {
    for (let i = d; i < cols - d; i++) {
      const k = j * cols + i;
      const near = [k - d, k + d, k - d * cols, k + d * cols];
      if (!covered[k] || near.some((q) => !covered[q])) continue;
      const gx = (depth[k + d] - depth[k - d]) / (2 * d * CELL);
      const gy = (depth[k + d * cols] - depth[k - d * cols]) / (2 * d * CELL);
      if (gx * gx + gy * gy < SLOPE * SLOPE && Math.abs(raw[k] - depth[k]) < ROUGH) panel[k] = 1;
    }
  }
  const part = new Int32Array(n).fill(-1);
  let parts = 0;
  for (let k = 0; k < n; k++) {
    if (!panel[k] || part[k] >= 0) continue;
    const queue = [k];
    part[k] = parts;
    while (queue.length) {
      const c = queue.pop()!;
      const i = c % cols;
      const j = (c - i) / cols;
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
        const nk = nj * cols + ni;
        if (panel[nk] && part[nk] < 0 && Math.abs(depth[nk] - depth[c]) < STEP) {
          part[nk] = parts;
          queue.push(nk);
        }
      }
    }
    parts++;
  }
  const at = (i: number, j: number) =>
    camera.position
      .clone()
      .addScaledVector(u, (i + 0.5 - cols / 2) * CELL)
      .addScaledVector(v, (j + 0.5 - rows / 2) * CELL);
  return { cols, rows, part, depth, raw, at, dir };
}

/**
 * Where stickers go on a carrier: on each side in turn (front first), a cluster that grows out
 * from the middle of its biggest panel, each sticker overlapping its neighbours a little, never
 * over a handle, wheel or latch, never over an edge.
 */
function stickerSlots(id: string, model: Object3D): StickerSlot[] {
  // A small carrier (a robot, a rocket) with too little room for full-size stickers takes smaller ones.
  for (const scale of SMALLER) {
    const slots = spotsAt(id, model, scale);
    if (slots.length >= FEWEST || scale === SMALLER[SMALLER.length - 1]) return slots;
  }
  return [];
}

function spotsAt(id: string, model: Object3D, scale: number): StickerSlot[] {
  const box = new Box3().setFromObject(model, true);
  const w = Math.ceil((STICKER_SIZE.w * scale * 1.04) / CELL);
  const h = Math.ceil((STICKER_SIZE.h * scale * 1.15) / CELL);
  const slots: StickerSlot[] = [];
  STICKER_SIDES.forEach((side, s) => {
    if (slots.length >= MOST) return;
    const g = look(model, box, side);
    // Every spot a whole sticker fits: one part, no hole, not too curved.
    const fits: { i: number; j: number; p: number }[] = [];
    for (let j = Math.ceil(h / 2); j < g.rows - Math.ceil(h / 2); j++) {
      for (let i = Math.ceil(w / 2); i < g.cols - Math.ceil(w / 2); i++) {
        const c = j * g.cols + i;
        const p = g.part[c];
        if (p < 0) continue;
        const x0 = i - Math.floor(w / 2);
        const y0 = j - Math.floor(h / 2);
        // The plane through the patch's edges (a panel may lean a little); the patch may bulge off it only so much.
        const gx = (g.depth[j * g.cols + x0 + w - 1] - g.depth[j * g.cols + x0]) / (w - 1);
        const gy = (g.depth[(y0 + h - 1) * g.cols + i] - g.depth[y0 * g.cols + i]) / (h - 1);
        let ok = true;
        for (let y = y0; ok && y < y0 + h; y++) {
          for (let x = x0; x < x0 + w; x++) {
            const k = y * g.cols + x;
            if (g.part[k] !== p || Math.abs(g.depth[k] - (g.depth[c] + gx * (x - i) + gy * (y - j))) > BULGE) {
              ok = false;
              break;
            }
          }
        }
        if (ok) fits.push({ i, j, p });
      }
    }
    if (!fits.length) return;
    // Start in the middle of the biggest panel, a little above centre (where you'd stick the first one).
    const count = new Map<number, number>();
    for (const f of fits) count.set(f.p, (count.get(f.p) ?? 0) + 1);
    const main = [...count].sort((a, b) => b[1] - a[1])[0][0];
    const own = fits.filter((f) => f.p === main);
    const ci = own.reduce((a, f) => a + f.i, 0) / own.length;
    const cj = own.reduce((a, f) => a + f.j, 0) / own.length + h * 0.3;
    const rand = seededRandom(hashString(`${id}|${s}`));
    const noise = new Map(fits.map((f) => [f, rand()]));
    const placed: { i: number; j: number }[] = [];
    const overlap = (a: { i: number; j: number }, b: { i: number; j: number }) =>
      (Math.max(0, w - Math.abs(a.i - b.i)) * Math.max(0, h - Math.abs(a.j - b.j))) / (w * h);
    for (;;) {
      let best: (typeof fits)[number] | null = null;
      let bestScore = Infinity;
      for (const f of fits) {
        if (placed.some((q) => overlap(f, q) > OVERLAP)) continue;
        const near = placed.length
          ? Math.min(...placed.map((q) => Math.hypot((f.i - q.i) / w, (f.j - q.j) / h)))
          : Math.hypot((f.i - ci) / w, (f.j - cj) / h);
        const score = near + noise.get(f)! * 0.35;
        if (score < bestScore) {
          bestScore = score;
          best = f;
        }
      }
      if (!best || slots.length >= MOST) break;
      placed.push(best);
      const surface = g.at(best.i, best.j).addScaledVector(g.dir, -g.raw[best.j * g.cols + best.i]);
      slots.push([s, +surface.x.toFixed(3), +surface.y.toFixed(3), +surface.z.toFixed(3), scale]);
    }
  });
  return slots;
}

/** Dev helper: what one side looks like to the spot finder (grey: surface, coloured: panel parts). */
export async function previewPanels(id: string, side: number): Promise<HTMLCanvasElement> {
  const model = await load(id);
  const g = look(model, new Box3().setFromObject(model, true), STICKER_SIDES[side]);
  dispose(model);
  const c = document.createElement('canvas');
  c.width = g.cols;
  c.height = g.rows;
  const ctx = c.getContext('2d')!;
  for (let j = 0; j < g.rows; j++) {
    for (let i = 0; i < g.cols; i++) {
      const k = j * g.cols + i;
      const p = g.part[k];
      ctx.fillStyle = p >= 0 ? `hsl(${(p * 67) % 360} 70% 50%)` : Number.isFinite(g.raw[k]) && g.raw[k] < 50 ? '#999' : '#fff';
      ctx.fillRect(i, g.rows - 1 - j, 1, 1);
    }
  }
  return c;
}

/** Dev helper: the sticker spots a carrier would get (with another `orient`, say). */
export async function previewSlots(id: string, orient?: [number, number, number]): Promise<StickerSlot[]> {
  const model = await load(id, orient);
  const slots = stickerSlots(id, model);
  dispose(model);
  return slots;
}

// --- All of them ----------------------------------------------------------------------------------

/** Bakes every carrier that has a model and has the dev server save it all. Returns spots per carrier. */
export async function bakeCarriers(): Promise<Record<string, number>> {
  const all: Record<string, StickerSlot[]> = {};
  for (const c of CARRIERS.filter((t) => t.model)) {
    const model = await load(c.id);
    const blob = await new Promise<Blob>((resolve, reject) =>
      picture(model).toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/webp', 0.9),
    );
    all[c.id] = stickerSlots(c.id, model);
    dispose(model);
    const res = await fetch(`/__dev/carrier-thumb?id=${c.id}`, { method: 'POST', body: blob });
    if (!res.ok) throw new Error(`${c.id}: ${res.status} ${await res.text()}`);
  }
  const res = await fetch('/__dev/carrier-slots', { method: 'POST', body: JSON.stringify(all) });
  if (!res.ok) throw new Error(`slots: ${res.status} ${await res.text()}`);
  return Object.fromEntries(Object.entries(all).map(([id, s]) => [id, s.length]));
}
