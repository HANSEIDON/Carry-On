import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'CORPUS_MAP.md');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.claude'].includes(file)) continue;
      walk(full, fileList);
    } else {
      if (!file.endsWith('.d.ts')) {
        fileList.push({ rel, size: stat.size });
      }
    }
  }
  return fileList;
}

function verifyCorpusMap() {
  if (!fs.existsSync(MAP_PATH)) {
    console.error('❌ CORPUS_MAP.md not found at', MAP_PATH);
    process.exit(1);
  }

  const mapContent = fs.readFileSync(MAP_PATH, 'utf-8');
  const allFiles = walk(ROOT);
  const srcFiles = allFiles.filter(f => f.rel.startsWith('src/') || f.rel.startsWith('docs/'));

  console.log(`\n🔍 Verifying Corpus Map against ${srcFiles.length} tracked source/doc files...\n`);

  const missingInMap = [];
  for (const { rel } of srcFiles) {
    if (!mapContent.includes(rel)) {
      missingInMap.push(rel);
    }
  }

  if (missingInMap.length > 0) {
    console.warn(`⚠️  The following ${missingInMap.length} file(s) are NOT referenced in CORPUS_MAP.md:`);
    missingInMap.forEach(f => console.warn(`   - ${f}`));
    console.warn('\nPlease update CORPUS_MAP.md to maintain agent search accuracy.');
  } else {
    console.log('✅ All source and documentation files are correctly indexed in CORPUS_MAP.md!');
  }

  console.log(`\n📊 Corpus Overview:`);
  console.log(`   - Total Source/Doc Files: ${srcFiles.length}`);
  console.log(`   - Map Size: ${(Buffer.byteLength(mapContent, 'utf-8') / 1024).toFixed(1)} KB`);
  console.log(`   - Map Path: CORPUS_MAP.md\n`);
}

verifyCorpusMap();
