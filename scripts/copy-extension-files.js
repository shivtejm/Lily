import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

// Ensure dist exists
if (!existsSync(dist)) {
  mkdirSync(dist, { recursive: true });
}

// Files to copy
const files = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'sidepanel.html',
  'sidepanel.js',
];

// Directories to copy
const dirs = [
  'icons',
];

// Copy individual files
files.forEach(file => {
  const src = resolve(root, file);
  const dest = resolve(dist, file);
  if (existsSync(src)) {
    cpSync(src, dest);
    console.log(`  ✓ ${file}`);
  } else {
    console.warn(`  ⚠ Missing: ${file}`);
  }
});

// Copy directories
dirs.forEach(dir => {
  const src = resolve(root, dir);
  const dest = resolve(dist, dir);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
    console.log(`  ✓ ${dir}/`);
  } else {
    console.warn(`  ⚠ Missing: ${dir}/`);
  }
});

console.log('\n✅ Extension files copied to dist/');
