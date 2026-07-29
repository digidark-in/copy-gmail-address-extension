/**
 * Run with: node icons/generate-icons.js
 * Requires the 'canvas' npm package: npm install canvas
 * Or use the provided SVG source and export manually.
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 128];

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;
  const r = s * 0.18; // corner radius

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, '#1a73e8');
  grad.addColorStop(1, '#0d47a1');
  ctx.fillStyle = grad;
  _roundRect(ctx, 0, 0, s, s, r);
  ctx.fill();

  // White envelope shape
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = s * 0.07;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const pad = s * 0.15;
  const ew = s - pad * 2;
  const eh = ew * 0.65;
  const ex = pad;
  const ey = (s - eh) / 2;

  // Envelope body
  ctx.beginPath();
  _roundRect(ctx, ex, ey, ew, eh, s * 0.06);
  ctx.stroke();

  // Envelope flap (V)
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex + ew / 2, ey + eh * 0.5);
  ctx.lineTo(ex + ew, ey);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

SIZES.forEach(size => {
  const buf = drawIcon(size);
  const out = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`Generated ${out}`);
});
