/**
 * Slims image-to-3D carrier models for phones and puts them in the app.
 *
 *   node scripts/models/optimize-carriers.mjs [source folder] [numbers...]
 *
 * Takes every "<number>.glb" in the source folder (default: ~/Downloads), e.g. 1.glb, 22.glb,
 * 015.glb — the number is the carrier's number in docs/CARRIER_PROMPTS.md — and writes
 * public/models/carriers/NNN.glb: ~40–60k triangles, 1024 WebP textures, meshopt compression
 * (about 1 MB each, from 13–17 MB). Pass numbers to do only those.
 *
 * Then list the new numbers as `model: true` in src/data/carriers.ts.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const out = join(root, 'public', 'models', 'carriers');
const source = process.argv[2] ?? join(homedir(), 'Downloads');
const only = new Set(process.argv.slice(3).map((n) => Number(n)));

const SETTINGS = [
  '--compress', 'meshopt',
  '--texture-compress', 'webp',
  '--texture-size', '1024',
  '--simplify', 'true',
  '--simplify-ratio', '0.4',
  '--simplify-error', '0.0008',
];

mkdirSync(out, { recursive: true });
const files = readdirSync(source)
  .map((name) => ({ name, n: Number(/^(\d{1,3})\.glb$/i.exec(name)?.[1]) }))
  .filter(({ n }) => n >= 1 && n <= 99 && (only.size === 0 || only.has(n)))
  .sort((a, b) => a.n - b.n);

if (files.length === 0) {
  console.log(`No <number>.glb files in ${source}`);
  process.exit(1);
}

for (const { name, n } of files) {
  const target = join(out, `${String(n).padStart(3, '0')}.glb`);
  const result = spawnSync('npx', ['gltf-transform', 'optimize', join(source, name), target, ...SETTINGS], {
    cwd: root,
    shell: true,
    encoding: 'utf8',
  });
  if (result.status !== 0 || !existsSync(target)) {
    console.log(`✗ ${name}: ${(result.stderr || result.stdout).trim().split('\n').pop()}`);
    continue;
  }
  const before = statSync(join(source, name)).size / 1e6;
  const after = statSync(target).size / 1e6;
  console.log(`✓ ${name} → ${target.slice(root.length)} (${before.toFixed(1)} MB → ${after.toFixed(2)} MB)`);
}
