// Quick script to create smaller icon sizes from icon128.png
// Uses canvas - requires a simple approach with sharp or manual copy
import { cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'icons');

// For now, copy icon128 as icon48 and icon16 — they'll just be larger files
// Chrome will scale them down automatically
cpSync(resolve(iconsDir, 'icon128.png'), resolve(iconsDir, 'icon48.png'));
cpSync(resolve(iconsDir, 'icon128.png'), resolve(iconsDir, 'icon16.png'));

console.log('✅ Icon copies created (Chrome will auto-scale)');
