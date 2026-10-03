import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../../..');
const cardArtDirectory = path.join(root, 'artifacts/luminae/src/assets/cards/runtime');
const profilesPath = path.join(root, 'lib/game-types/src/artifact-manifestations.ts');
const namesPath = path.join(root, 'artifacts/luminae/src/lib/cardNameFallback.ts');
const outputDirectory = process.argv[2] ?? '/tmp/luminae-artifact-manifestation-references';

const profileSource = await fs.readFile(profilesPath, 'utf8');
const nameSource = await fs.readFile(namesPath, 'utf8');
const names = Object.fromEntries(
  [...nameSource.matchAll(/(t[123][rseop]\d{2}):\s*["']([^"']+)["']/g)]
    .map((match) => [match[1], match[2]]),
);

const profiles = [...profileSource.matchAll(
  /(t[123][rseop]\d{2}):\s*P\('[^']+',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\[([^\]]+)\]/g,
)].map((match) => ({
  id: match[1],
  name: names[match[1]],
  cameraScale: match[2],
  family: match[3],
  representation: match[4],
  placements: [...match[5].matchAll(/'([^']+)'/g)].map((placement) => placement[1]),
}));

if (profiles.length !== 90 || profiles.some((profile) => !profile.name)) {
  throw new Error(`Expected 90 complete Artifact profiles, found ${profiles.length}.`);
}

await fs.mkdir(outputDirectory, { recursive: true });

const tierLayout = {
  '1': { columns: 4, rows: 2, cellWidth: 256, cellHeight: 384 },
  '2': { columns: 3, rows: 2, cellWidth: 300, cellHeight: 384 },
  '3': { columns: 2, rows: 2, cellWidth: 384, cellHeight: 384 },
};

for (const tier of ['1', '2', '3']) {
  for (const lineage of ['r', 's', 'e', 'o', 'p']) {
    const group = profiles.filter((profile) => profile.id.startsWith(`t${tier}${lineage}`));
    const layout = tierLayout[tier];
    const composites = [];

    for (const [index, profile] of group.entries()) {
      const input = path.join(cardArtDirectory, `${profile.id}.webp`);
      const art = await sharp(input)
        .resize({
          width: layout.cellWidth - 16,
          height: layout.cellHeight - 24,
          fit: 'contain',
          background: '#07090e',
        })
        .png()
        .toBuffer();
      composites.push({
        input: art,
        left: (index % layout.columns) * layout.cellWidth + 8,
        top: Math.floor(index / layout.columns) * layout.cellHeight + 8,
      });
    }

    await sharp({
      create: {
        width: layout.columns * layout.cellWidth,
        height: layout.rows * layout.cellHeight,
        channels: 3,
        background: '#151821',
      },
    })
      .composite(composites)
      .png()
      .toFile(path.join(outputDirectory, `t${tier}${lineage}-reference-sheet.png`));
  }
}

await fs.writeFile(
  path.join(outputDirectory, 'artifact-manifestation-specs.json'),
  `${JSON.stringify(profiles, null, 2)}\n`,
);

console.log(`Wrote ${profiles.length} Artifact references to ${outputDirectory}`);
