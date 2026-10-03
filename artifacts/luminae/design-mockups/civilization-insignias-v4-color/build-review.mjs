import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(await fs.readFile(path.join(root, 'prompts.json'), 'utf8'));
const palette = {
  Flare: '#FF5A3C', Radiance: '#DFC878', Continuum: '#3D6BFF',
  Verdance: '#2ECC71', Abyss: '#A832D4',
};
const colors = {
  background: '#0D1220', panel: '#161E2D', border: '#293449',
  text: '#F4F0E8', secondary: '#ABB6C9', muted: '#7F8DA4',
};
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const round = value => Number(value.toFixed(5));
const families = ['dyad', 'triad'];

if (!Array.isArray(spec.items) || spec.items.length !== 20) {
  throw new Error('Expected exactly 20 items in prompts.json.');
}
const ids = new Set();
for (const item of spec.items) {
  if (!/^[a-z][a-z0-9-]*$/.test(item.id) || ids.has(item.id)) {
    throw new Error(`Invalid or duplicate asset id: ${item.id}`);
  }
  ids.add(item.id);
  if (!families.includes(item.family) || !item.name || !item.meaning
      || !Array.isArray(item.affinities)
      || item.affinities.length !== (item.family === 'dyad' ? 2 : 3)
      || item.affinities.some(affinity => !palette[affinity])) {
    throw new Error(`Incomplete review metadata for ${item.id}.`);
  }
}
for (const family of families) {
  if (spec.items.filter(item => item.family === family).length !== 10) {
    throw new Error(`Expected 10 ${family}s.`);
  }
}
// Check every source before writing any review output.
const present = await Promise.all(spec.items.map(async item => {
  try { await fs.access(path.join(root, `${item.id}.png`)); return null; }
  catch { return `${item.id}.png`; }
}));
const missing = present.filter(Boolean);
if (missing.length) throw new Error(`Wait for all 20 source PNGs. Missing: ${missing.join(', ')}`);

function boundsResult(bounds) {
  return bounds.maxX < 0 ? null : {
    ...bounds, width: bounds.maxX - bounds.minX + 1, height: bounds.maxY - bounds.minY + 1,
  };
}
function include(bounds, x, y) {
  bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
}
const assets = [];
for (const item of spec.items) {
  const file = `${item.id}.png`;
  const buffer = await fs.readFile(path.join(root, file));
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== 'png') throw new Error(`${file} is not a PNG.`);
  const { data, info } = await sharp(buffer).toColourspace('srgb').ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = { minX: info.width, minY: info.height, maxX: -1, maxY: -1 };
  const visible = { ...bounds };
  let transparent = 0, translucent = 0, opaque = 0, edgeAlphaMax = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
      if (alpha === 0) transparent++;
      else {
        if (alpha === 255) opaque++; else translucent++;
        include(bounds, x, y);
        if (alpha > 128) include(visible, x, y);
      }
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
        edgeAlphaMax = Math.max(edgeAlphaMax, alpha);
      }
    }
  }
  if (bounds.maxX < 0) throw new Error(`${file} contains no visible artwork.`);
  const totalPixels = info.width * info.height;
  const previews = {};
  for (const size of [364, 64, 32]) {
    const preview = await sharp(buffer).resize(size, size, { fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    previews[size] = `data:image/png;base64,${preview.toString('base64')}`;
  }
  const warnings = [];
  if (!metadata.hasAlpha || transparent === 0) warnings.push('No fully transparent background pixels.');
  if (edgeAlphaMax > 128) warnings.push('Visible artwork reaches a canvas edge.');
  assets.push({
    ...item, file, width: metadata.width, height: metadata.height, bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    alpha: { hasAlpha: Boolean(metadata.hasAlpha), fullyTransparentPixels: transparent,
      translucentPixels: translucent, opaquePixels: opaque,
      transparentFraction: round(transparent / totalPixels),
      translucentFraction: round(translucent / totalPixels), edgeAlphaMax },
    bounds: { nontransparent: boundsResult(bounds), visible: boundsResult(visible),
      visibleThreshold: 'alpha > 128' },
    warnings, previews,
  });
}

// Conservative wrapping avoids reliance on platform-specific font metrics.
function wrap(value, maxCharacters = 40) {
  const lines = [];
  let line = '';
  for (const word of String(value).trim().split(/\s+/)) {
    if (line && line.length + word.length + 1 > maxCharacters) {
      lines.push(line); line = word;
    } else line += `${line ? ' ' : ''}${word}`;
  }
  if (line) lines.push(line);
  return lines;
}
function text(value, x, y, size = 18, fill = colors.text, anchor = 'start', weight = 400) {
  return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${escape(value)}</text>`;
}
function rect(x, y, width, height, fill, radius = 0, stroke = '') {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}/>`;
}
function image(asset, x, y, size) {
  return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="${asset.previews[size]}"/>`;
}
function start(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rect(0, 0, width, height, colors.background)}`;
}
function affinityChips(asset, centerX, baselineY) {
  const widths = asset.affinities.map(name => name.length * 7.1 + 22);
  const total = widths.reduce((sum, width) => sum + width, 0) + (widths.length - 1) * 12;
  let x = centerX - total / 2;
  return asset.affinities.map((name, index) => {
    const chip = rect(x, baselineY - 10, 9, 9, palette[name], 2)
      + text(name, x + 15, baselineY, 13, colors.secondary);
    x += widths[index] + 12;
    return chip;
  }).join('');
}

for (const family of families) {
  const group = assets.filter(asset => asset.family === family);
  const lines = group.map(asset => wrap(asset.meaning));
  const maxLines = Math.max(...lines.map(value => value.length));
  const sampleTop = 484 + (maxLines - 1) * 23 + 36;
  const cardHeight = sampleTop + 110;
  const width = 2280, cardWidth = 424, gap = 20, margin = 40, top = 146;
  const height = top + cardHeight * 2 + gap + 66;
  let svg = start(width, height);
  svg += text('LUMINAe  /  CIVILIZATION INSIGNIAS', margin, 43, 15, colors.secondary, 'start', 600);
  svg += text(family === 'dyad' ? 'Dyad civilizations' : 'Triad civilizations', margin, 102, 43, colors.text, 'start', 600);
  svg += text('Affinity-token color studies · Set 04', width - margin, 49, 19, colors.secondary, 'end');
  svg += text('Original color · Transparent PNG · 64 px / 32 px samples', width - margin, 91, 17, colors.secondary, 'end');
  for (let index = 0; index < group.length; index++) {
    const asset = group[index], x = margin + (index % 5) * (cardWidth + gap);
    const y = top + Math.floor(index / 5) * (cardHeight + gap), center = x + cardWidth / 2;
    svg += rect(x, y, cardWidth, cardHeight, colors.panel, 16, colors.border);
    svg += image(asset, x + 30, y + 20, 364);
    svg += text(asset.name, center, y + 421, 31, colors.text, 'middle', 600);
    svg += affinityChips(asset, center, y + 451);
    lines[index].forEach((line, lineIndex) => {
      svg += text(line, center, y + 484 + lineIndex * 23, 17, colors.secondary, 'middle');
    });
    svg += rect(x + 90, y + sampleTop - 10, 244, 94, '#101725', 9);
    svg += image(asset, x + 120, y + sampleTop, 64);
    svg += image(asset, x + 266, y + sampleTop + 16, 32);
    svg += text('64 px', x + 152, y + sampleTop + 80, 12, colors.muted, 'middle');
    svg += text('32 px', x + 282, y + sampleTop + 80, 12, colors.muted, 'middle');
  }
  svg += text('Name-led imagery · Parent affinity colors · Engraved token materials', margin, height - 24, 16, colors.secondary);
  svg += text('Concept review', width - margin, height - 24, 16, colors.secondary, 'end');
  await sharp(Buffer.from(`${svg}</svg>`)).png().toFile(path.join(root, `${family}s-sheet.png`));
}

const reviewWidth = 2080, reviewHeight = 1664, reviewCardWidth = 384, reviewCardHeight = 356;
let review = start(reviewWidth, reviewHeight);
review += text('Size and background review', 40, 65, 38, colors.text, 'start', 600);
review += text('All 20 tokens · 64 px and 32 px · Original colors preserved on both backgrounds', 40, 108, 20, colors.secondary);
for (let index = 0; index < assets.length; index++) {
  const asset = assets[index], x = 40 + (index % 5) * 404, y = 145 + Math.floor(index / 5) * 372;
  review += rect(x, y, reviewCardWidth, reviewCardHeight, colors.panel, 13, colors.border);
  review += text(asset.name, x + 192, y + 35, 25, colors.text, 'middle', 600);
  review += affinityChips(asset, x + 192, y + 61);
  for (const [offset, fill, label, labelColor] of [
    [78, '#080D18', 'DARK', '#A5B3C9'], [206, '#F2EFE7', 'LIGHT', '#4B5667'],
  ]) {
    review += rect(x + 14, y + offset, 356, 114, fill, 8);
    review += text(label, x + 28, y + offset + 23, 11, labelColor, 'start', 600);
    review += image(asset, x + 111, y + offset + 15, 64);
    review += image(asset, x + 275, y + offset + 31, 32);
    review += text('64 px', x + 143, y + offset + 99, 12, labelColor, 'middle');
    review += text('32 px', x + 291, y + offset + 99, 12, labelColor, 'middle');
  }
}
review += text('No tinting, recoloring, or monochrome conversion is applied to these samples.', 40, reviewHeight - 19, 15, colors.secondary);
await sharp(Buffer.from(`${review}</svg>`)).png().toFile(path.join(root, 'size-and-contrast-review.png'));

const manifest = {
  version: spec.version ?? 4, status: 'concept review', generator: spec.generator ?? 'built-in image_gen',
  direction: spec.direction, builtAt: new Date().toISOString(), sourceSpecification: 'prompts.json',
  sourceImagesModified: false, reviewColors: 'Original image colors; no monochrome filters.', palette,
  assets: assets.map(({ previews, ...asset }) => asset),
};
await fs.writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

function card(asset) {
  const chips = asset.affinities.map(name => `<span><i style="background:${palette[name]}"></i>${escape(name)}</span>`).join('');
  return `<article><a class="hero-link" href="${asset.file}" aria-label="Open ${escape(asset.name)} full size"><img class="hero" src="${asset.file}" width="364" height="364" alt="${escape(asset.name)} civilization token" loading="lazy"></a><h3>${escape(asset.name)}</h3><div class="affinities">${chips}</div><p class="meaning">${escape(asset.meaning)}</p><div class="samples"><figure><img src="${asset.file}" width="64" height="64" alt="${escape(asset.name)} at 64 pixels"><figcaption>64 px</figcaption></figure><figure><img src="${asset.file}" width="32" height="32" alt="${escape(asset.name)} at 32 pixels"><figcaption>32 px</figcaption></figure></div><a class="download" href="${asset.file}" download>Download PNG <span aria-hidden="true">↗</span></a></article>`;
}
const css = `
*{box-sizing:border-box}html{color-scheme:dark;scroll-behavior:smooth}body{--bg:#0d1220;--panel:#161e2d;--text:#f4f0e8;--muted:#abb6c9;--border:#293449;--sample:#080d18;margin:0;padding:38px clamp(18px,3vw,52px) 60px;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,sans-serif;transition:background .15s,color .15s}body.light{color-scheme:light;--bg:#f2efe7;--panel:#fffdf8;--text:#182238;--muted:#526078;--border:#d6d9de;--sample:#e8e4db}.page{max-width:2100px;margin:auto}header{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:26px}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:650;color:var(--muted);margin:0 0 8px}h1{font-size:clamp(30px,4vw,48px);line-height:1.1;letter-spacing:-.025em;margin:0 0 13px}header p{color:var(--muted);max-width:680px;margin:0}nav{display:flex;align-items:center;flex-wrap:wrap;gap:11px}a{color:inherit;text-underline-offset:4px}nav a,button{font:inherit;font-size:14px}button{border:1px solid var(--border);background:var(--panel);color:var(--text);border-radius:24px;padding:11px 18px;cursor:pointer;font-weight:600}a:focus-visible,button:focus-visible{outline:3px solid #7090ff;outline-offset:5px}.review-links{display:flex;gap:24px;flex-wrap:wrap;padding:20px 0;color:var(--muted);font-size:14px}section{margin:30px 0 48px}section>h2{font-size:27px;font-weight:600;letter-spacing:-.015em;margin:0 0 19px}.count{font-size:14px;color:var(--muted);font-weight:400;margin-left:12px}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px}article{display:flex;flex-direction:column;align-items:center;text-align:center;background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:18px 18px 21px;min-width:0}.hero-link{display:block;width:100%;border-radius:12px}.hero{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:contain}h3{font-size:clamp(21px,1.6vw,29px);margin:15px 0 8px;line-height:1.2}.affinities{display:flex;justify-content:center;flex-wrap:wrap;gap:5px 12px;font-size:12px;color:var(--muted);min-height:22px}.affinities span{display:inline-flex;gap:6px;align-items:center;white-space:nowrap}.affinities i{display:inline-block;width:9px;height:9px;border-radius:2px;flex-shrink:0}.meaning{font-size:14px;line-height:1.6;color:var(--muted);margin:16px 0 19px;max-width:34ch;flex-grow:1;overflow-wrap:anywhere}.samples{display:flex;align-items:flex-end;justify-content:center;gap:48px;width:100%;padding:11px 12px 8px;border-radius:10px;background:var(--sample)}figure{margin:0;min-width:64px;height:92px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}figure img{display:block;object-fit:contain;flex-shrink:0}figcaption{font-size:11px;color:var(--muted);margin-top:8px}.download{font-size:12px;color:var(--muted);margin-top:16px}.download span{padding-left:5px}footer{border-top:1px solid var(--border);padding-top:20px;color:var(--muted);font-size:13px}footer p{margin:0 0 8px}@media(max-width:1250px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:720px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}article{padding:12px 10px 16px}.samples{gap:10px}.affinities{font-size:11px;gap:4px 8px}h3{font-size:21px}.meaning{font-size:13px}header{align-items:flex-start}}@media(max-width:380px){.grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}body{transition:none}}@media print{body{padding:0}nav,.review-links,.download{display:none}.grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}section{break-after:page}article{break-inside:avoid;padding:8px}h3{font-size:18px}.samples{gap:8px}.affinities{font-size:10px}footer{display:none}}
`;
let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LUMINAe · Civilization insignias · Color review</title><style>${css}</style></head><body><div class="page"><header><div><p class="eyebrow">LUMINAe · Color studies · Set 04</p><h1>Civilization insignias</h1><p>Twenty name-led tokens in their parent Affinity colors. Switch the background to compare contrast; the artwork keeps its original colors.</p></div><nav aria-label="Review controls"><a href="#dyads">Dyads</a><a href="#triads">Triads</a><button id="theme" type="button" aria-pressed="false">Light background</button></nav></header><div class="review-links"><a href="dyads-sheet.png">Dyad contact sheet</a><a href="triads-sheet.png">Triad contact sheet</a><a href="size-and-contrast-review.png">Size &amp; contrast review</a><a href="manifest.json">Asset manifest</a></div>`;
for (const family of families) {
  html += `<section id="${family}s" aria-labelledby="${family}-heading"><h2 id="${family}-heading">${family === 'dyad' ? 'Dyads' : 'Triads'}<span class="count">10 civilizations</span></h2><div class="grid">${assets.filter(asset => asset.family === family).map(card).join('')}</div></section>`;
}
html += `<footer><p>Transparent PNG originals · Engraved token materials · Full-size assets open from each image.</p><p>The gallery changes the background only. Source images are preserved unchanged.</p></footer></div><script>document.getElementById('theme').addEventListener('click',function(){const light=document.body.classList.toggle('light');this.setAttribute('aria-pressed',String(light));this.textContent=light?'Dark background':'Light background';});</script></body></html>\n`;
await fs.writeFile(path.join(root, 'index.html'), html);
console.log(JSON.stringify({
  assets: assets.length, families: { dyads: 10, triads: 10 }, sourceImagesModified: false,
  warnings: assets.filter(asset => asset.warnings.length).map(({ id, warnings }) => ({ id, warnings })),
  outputs: ['dyads-sheet.png', 'triads-sheet.png', 'size-and-contrast-review.png', 'manifest.json', 'index.html'],
}, null, 2));
