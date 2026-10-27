/// <reference types="vitest/config" />
import { mkdirSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev server only: saves what's baked in the browser from the carrier models (`?bake-carriers`,
 * src/components/carrierBake.ts): card pictures to public/models/carriers/thumbs/NNN.webp, sticker
 * spots to src/data/carrierSlots.json.
 */
function carrierBakeWriter(): Plugin {
  return {
    name: 'carrier-bake-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/carrier-thumb', (req, res) => {
        const id = new URL(req.url ?? '', 'http://dev').searchParams.get('id') ?? '';
        if (req.method !== 'POST' || !/^\d{3}$/.test(id)) {
          res.statusCode = 400;
          res.end('POST ?id=NNN');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const dir = new URL('./public/models/carriers/thumbs/', import.meta.url);
          mkdirSync(dir, { recursive: true });
          writeFileSync(new URL(`${id}.webp`, dir), Buffer.concat(chunks));
          res.end('ok');
        });
      });
      server.middlewares.use('/__dev/carrier-slots', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 400;
          res.end('POST');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const slots = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown[]>;
          // One carrier per line: readable in a diff.
          const body = Object.entries(slots)
            .map(([id, s]) => `  ${JSON.stringify(id)}: ${JSON.stringify(s)}`)
            .join(',\n');
          writeFileSync(new URL('./src/data/carrierSlots.json', import.meta.url), `{\n${body}\n}\n`);
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), carrierBakeWriter()],
  test: {
    environment: 'node',
  },
});
