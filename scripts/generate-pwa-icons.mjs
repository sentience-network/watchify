import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/icons"
);

function svgFor(size, maskable = false) {
  const pad = Math.round(size * (maskable ? 0.18 : 0.08));
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2 - size * 0.02;
  const r = inner * 0.32;
  const playW = r * 0.9;
  const playH = r * 1.1;
  const px = cx - playW * 0.25;
  const py = cy - playH / 2;
  const font = Math.round(size * 0.095);
  const letterY = size - pad * 0.55;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#0a1210"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${Math.round(size * 0.16)}" fill="#0f1f1c"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#14b8a6"/>
  <path d="M${px} ${py} v${playH} l${playW * 1.15} -${playH / 2} z" fill="#0a1210"/>
  <text x="${cx}" y="${letterY}" text-anchor="middle" fill="#5eead4" font-family="system-ui,Segoe UI,sans-serif" font-size="${font}" font-weight="700">W</text>
</svg>`;
}

const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["apple-touch-icon.png", 180, false],
  ["icon-maskable-512.png", 512, true],
];

for (const [name, size, maskable] of targets) {
  const buf = await sharp(Buffer.from(svgFor(size, maskable))).png().toBuffer();
  fs.writeFileSync(path.join(dir, name), buf);
  console.log(name, buf.length);
}

fs.writeFileSync(path.join(dir, "icon-192.svg"), svgFor(192));
fs.writeFileSync(path.join(dir, "icon-512.svg"), svgFor(512));
console.log("PWA icons written to", dir);
