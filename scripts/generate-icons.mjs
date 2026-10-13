import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createPngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function createPngBuffer(width, height, renderPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createPngChunk('IDAT', compressedData);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate DayPilot Brand Icon
// Indigo gradient background (#4F46E5 to #312E81)
// Crisp stylized Compass / Navigation / Task Checkmark in center
function renderDayPilotIcon(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background: Rounded rect for regular, full-bleed for maskable
  let insideBg = true;
  if (!isMaskable) {
    const radius = 0.22; // smooth squircle
    // Check distance to rounded rectangle corners
    const cx = Math.max(radius, Math.min(1 - radius, nx));
    const cy = Math.max(radius, Math.min(1 - radius, ny));
    const dx = nx - cx;
    const dy = ny - cy;
    if (Math.hypot(dx, dy) > radius) {
      insideBg = false;
    }
  }

  if (!insideBg) {
    return [0, 0, 0, 0]; // transparent outside
  }

  // Base background gradient: Deep Indigo (#4f46e5 to #1e1b4b)
  const grad = (nx + ny) * 0.5;
  let bgR = Math.round(79 * (1 - grad) + 30 * grad);
  let bgG = Math.round(70 * (1 - grad) + 27 * grad);
  let bgB = Math.round(229 * (1 - grad) + 75 * grad);

  // Center symbol coordinate (-1 to 1)
  // Maskable has 15% safe margin
  const scale = isMaskable ? 0.65 : 0.8;
  const cx = 0.5;
  const cy = 0.5;
  const sx = (nx - cx) / scale;
  const sy = (ny - cy) / scale;
  const dist = Math.hypot(sx, sy);

  // Outer ring (Compass ring)
  const ringDist = Math.abs(dist - 0.72);
  let isRing = ringDist < 0.055;

  // Inner stylized paper airplane / compass pointer:
  // Points: Top (0, -0.65), Bottom-Right (0.5, 0.45), Center notch (0, 0.2), Bottom-Left (-0.5, 0.45)
  // Let's create the 2 wings: left wing (brighter white/cyan) & right wing (semi-translucent white)
  let isPointer = false;
  let isPointerRight = false;
  let isPointerLeft = false;

  // Check if point (sx, sy) is inside pointer triangle
  if (sy >= -0.65 && sy <= 0.48) {
    // Left wing
    if (sx <= 0 && sx >= -0.45) {
      const leftEdge = -0.45 * (sy - (-0.65)) / (0.45 - (-0.65));
      const notchEdge = 0 * (1 - (sy - 0.2)/(0.45 - 0.2));
      if (sx >= leftEdge) {
        if (sy < 0.2 || (sy >= 0.2 && sx <= (sy - 0.2) * (-0.45 / 0.25))) {
          isPointerLeft = true;
        }
      }
    }
    // Right wing
    if (sx >= 0 && sx <= 0.45) {
      const rightEdge = 0.45 * (sy - (-0.65)) / (0.45 - (-0.65));
      if (sx <= rightEdge) {
        if (sy < 0.2 || (sy >= 0.2 && sx >= (sy - 0.2) * (0.45 / 0.25))) {
          isPointerRight = true;
        }
      }
    }
  }

  // Checkmark accent in the bottom center
  const checkX = sx;
  const checkY = sy - 0.1;
  const inCheckStem1 = (checkX >= -0.22 && checkX <= -0.05 && Math.abs(checkY - (-checkX * 0.9 + 0.1)) < 0.05);
  const inCheckStem2 = (checkX >= -0.05 && checkX <= 0.28 && Math.abs(checkY - (checkX * 0.9 + 0.1)) < 0.05);

  if (isPointerLeft) {
    return [255, 255, 255, 255]; // crisp white
  } else if (isPointerRight) {
    return [199, 210, 254, 255]; // soft indigo 200
  } else if (isRing) {
    return [165, 180, 252, 230]; // indigo ring accent
  }

  // subtle glow in center
  if (dist < 0.5) {
    const glow = (1 - dist / 0.5) * 0.25;
    bgR = Math.min(255, Math.round(bgR + 100 * glow));
    bgG = Math.min(255, Math.round(bgG + 100 * glow));
    bgB = Math.min(255, Math.round(bgB + 40 * glow));
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
    <linearGradient id="wingRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c7d2fe" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
  </defs>
  <!-- Background squircle -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)" />
  <!-- Outer Compass Ring -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#a5b4fc" stroke-width="12" stroke-dasharray="14 10" opacity="0.65" />
  <circle cx="256" cy="256" r="195" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.25" />
  <!-- Center stylized DayPilot Compass / Plane -->
  <g transform="translate(256, 256)">
    <!-- Left Wing -->
    <path d="M 0 -130 L -90 90 L 0 40 Z" fill="#ffffff" />
    <!-- Right Wing -->
    <path d="M 0 -130 L 0 40 L 90 90 Z" fill="url(#wingRight)" />
    <!-- Center Crease -->
    <line x1="0" y1="-130" x2="0" y2="40" stroke="#4338ca" stroke-width="3" opacity="0.4" />
    <!-- Pulse dot -->
    <circle cx="0" cy="40" r="10" fill="#fbbf24" />
  </g>
</svg>
`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// 2. Generate PNGs: 192x192, 512x512, 512x512 maskable, 180x180 (apple-touch-icon)
console.log('Generating pwa-192x192.png...');
const pwa192 = createPngBuffer(192, 192, (x, y, w, h) => renderDayPilotIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

console.log('Generating pwa-512x512.png...');
const pwa512 = createPngBuffer(512, 512, (x, y, w, h) => renderDayPilotIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

console.log('Generating pwa-maskable-512x512.png...');
const pwaMaskable = createPngBuffer(512, 512, (x, y, w, h) => renderDayPilotIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

console.log('Generating apple-touch-icon.png (180x180)...');
const appleIcon = createPngBuffer(180, 180, (x, y, w, h) => renderDayPilotIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// Favicon ico fallback (can be PNG buffer as modern browsers support PNG favicons)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), appleIcon);

console.log('Successfully generated all PWA icons in /public!');
