// ─── Icon Generator ────────────────────────────────────────────────────────────
// Converts SVG icons to PNG at 16, 48, and 128 pixel sizes.
// Run: node scripts/generate-icons.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ICONS_DIR = resolve(ROOT, 'public', 'icons');

// Since we can't use canvas in a basic Node env without dependencies,
// we'll create valid PNG files from SVG using a data URI approach.
// For production, use a tool like sharp or Inkscape CLI.

// For now, generate simple PNG placeholders with the correct dimensions
// that Chrome will accept. The SVGs are the source of truth.

function createMinimalPNG(width, height) {
  // Create a minimal valid PNG with a purple pixel
  // PNG signature + IHDR + IDAT + IEND
  
  // This is a minimal approach - for real icons, convert SVGs using:
  // npx svgexport public/icons/icon-128.svg public/icons/icon-128.png 128:128
  
  const svg = readFileSync(resolve(ICONS_DIR, `icon-${width}.svg`), 'utf8');
  
  // Create an HTML file that can be opened in browser to generate PNGs
  return svg;
}

// Create a helper HTML page to convert SVGs to PNGs
const converterHTML = `<!DOCTYPE html>
<html>
<head><title>Icon Converter</title></head>
<body>
<h2>Right-click each image and "Save image as..." with the correct filename</h2>
<div style="display: flex; gap: 20px; align-items: end; padding: 20px;">
  <div>
    <canvas id="c16" width="16" height="16"></canvas>
    <p>icon-16.png</p>
  </div>
  <div>
    <canvas id="c48" width="48" height="48"></canvas>
    <p>icon-48.png</p>
  </div>
  <div>
    <canvas id="c128" width="128" height="128"></canvas>
    <p>icon-128.png</p>
  </div>
</div>
<script>
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const canvas = document.getElementById('c' + size);
  const ctx = canvas.getContext('2d');
  
  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#6C5CE7');
  gradient.addColorStop(1, '#00CEC9');
  
  // Rounded rectangle
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Lightning bolt
  ctx.fillStyle = 'white';
  ctx.beginPath();
  const s = size / 128;
  ctx.moveTo(74*s, 18*s);
  ctx.lineTo(36*s, 68*s);
  ctx.lineTo(56*s, 68*s);
  ctx.lineTo(48*s, 110*s);
  ctx.lineTo(86*s, 60*s);
  ctx.lineTo(66*s, 60*s);
  ctx.lineTo(74*s, 18*s);
  ctx.closePath();
  ctx.fill();
  
  // Convert to downloadable link
  const link = document.createElement('a');
  link.download = 'icon-' + size + '.png';
  link.href = canvas.toDataURL('image/png');
  link.textContent = 'Download icon-' + size + '.png';
  link.style.display = 'block';
  canvas.parentElement.appendChild(link);
});
</script>
</body>
</html>`;

const outputPath = resolve(ICONS_DIR, 'convert-icons.html');
writeFileSync(outputPath, converterHTML);
console.log('✅ Icon converter page created at:', outputPath);
console.log('   Open it in a browser and click the download links.');
console.log('   Or use: npx svgexport to batch convert.');
