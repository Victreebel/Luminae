import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'artifacts/luminae/src/assets/cards');
const outputDir = path.join(sourceDir, 'runtime');

await fs.mkdir(outputDir, { recursive: true });
const files = (await fs.readdir(sourceDir)).filter(file => file.endsWith('.png'));

await Promise.all(files.map(async (file) => {
  const input = path.join(sourceDir, file);
  const output = path.join(outputDir, file.replace(/\.png$/i, '.webp'));
  await sharp(input)
    .resize({ width: 384, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toFile(output);
}));

console.log(`Generated ${files.length} mobile card textures in ${outputDir}`);
