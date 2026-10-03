import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = resolve(ROOT, 'artifacts/qa/civilization-contract');
const OUT = resolve(SOURCE, 'contact-sheets');
const DYADS = [
  'vortex', 'flux', 'bloom', 'chrysalis', 'orbit',
  'canopy', 'eclipse', 'lineage', 'echo', 'spore',
];
const SCENES = ['surface', 'orbit', 'stellar', 'galaxy'];
const VIEWPORTS = {
  desktop: { width: 360, height: 167, columns: 5 },
  mobile: { width: 195, height: 342, columns: 5 },
};

mkdirSync(OUT, { recursive: true });

for (const [viewport, cell] of Object.entries(VIEWPORTS)) {
  for (const scene of SCENES) {
    const rows = Math.ceil(DYADS.length / cell.columns);
    const labelHeight = 24;
    const composites = [];

    for (const [index, dyad] of DYADS.entries()) {
      const source = resolve(SOURCE, `${viewport}-${dyad}-${scene}.png`);
      if (!existsSync(source)) throw new Error(`Missing evidence capture: ${source}`);
      const image = await sharp(source)
        .resize(cell.width, cell.height, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
      const label = Buffer.from(`
        <svg width="${cell.width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#050711"/>
          <text x="10" y="16" fill="#f4ead0" font-family="Arial, sans-serif" font-size="12" font-weight="700">${dyad.toUpperCase()}</text>
        </svg>
      `);
      const x = (index % cell.columns) * cell.width;
      const y = Math.floor(index / cell.columns) * (cell.height + labelHeight);
      composites.push({ input: label, left: x, top: y });
      composites.push({ input: image, left: x, top: y + labelHeight });
    }

    await sharp({
      create: {
        width: cell.columns * cell.width,
        height: rows * (cell.height + labelHeight),
        channels: 4,
        background: '#03050b',
      },
    })
      .composite(composites)
      .png()
      .toFile(resolve(OUT, `${viewport}-${scene}.png`));
  }
}
