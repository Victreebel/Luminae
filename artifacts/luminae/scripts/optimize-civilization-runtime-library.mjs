import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const packageRoot = path.resolve(import.meta.dirname, '..');
const assetRoot = path.join(packageRoot, 'src/assets/civilization');
const sourceArchiveRoot = path.join(assetRoot, 'runtime-sources');
const registries = [
  path.join(packageRoot, 'src/lib/civilizationArtRegistry.ts'),
  path.join(packageRoot, 'src/lib/civilizationManifestationArtRegistry.ts'),
];

const environmentPattern = /^environments\/.+\.(?:avif|webp)$/;
const hostPattern = /^manifestations\/(?:neutral|vortex|flux|bloom|orbit|canopy|eclipse|lineage|echo|spore)\/(?:surface-settlement|surface-district|orbit-facility|stellar-cluster|galaxy-region)-atlas-v\d+\.(?:avif|webp)$/;
const tierThreeArtifactPattern = /^manifestations\/artifacts\/authored\/t3[rseop]-artifact-atlas-v2\.webp$/;
const importPattern = /@\/assets\/civilization\/([^']+\.(?:avif|webp))/g;

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function collectRuntimeAssets() {
  const referenced = new Set();
  for (const registry of registries) {
    const source = await fs.readFile(registry, 'utf8');
    for (const match of source.matchAll(importPattern)) referenced.add(match[1]);
  }

  return [...referenced]
    .filter((file) => (
      environmentPattern.test(file) ||
      hostPattern.test(file) ||
      tierThreeArtifactPattern.test(file)
    ))
    .sort();
}

async function sourceFor(relativeFile) {
  const runtimeFile = path.join(assetRoot, relativeFile);
  const extension = path.extname(runtimeFile);
  const withoutExtension = runtimeFile.slice(0, -extension.length);

  if (relativeFile.startsWith('environments/') && extension === '.avif') {
    const pngSource = `${withoutExtension}.png`;
    if (await exists(pngSource)) return pngSource;
  }

  if (relativeFile.startsWith('environments/') && extension === '.webp') {
    const namedSource = runtimeFile.replace(/-v(\d+)\.webp$/, '-source-v$1.png');
    if (namedSource !== runtimeFile && await exists(namedSource)) return namedSource;

    const substrateSource = runtimeFile.replace(/-substrate-atlas-v2\.webp$/, '-substrate-atlas-v1.avif');
    if (substrateSource !== runtimeFile && await exists(substrateSource)) return substrateSource;
  }

  if (relativeFile.startsWith('manifestations/') && extension === '.avif') {
    for (const sourceExtension of ['.png', '.webp']) {
      const authoredSource = `${withoutExtension}${sourceExtension}`;
      if (await exists(authoredSource)) return authoredSource;
    }
  }

  const archivedSource = path.join(sourceArchiveRoot, relativeFile);
  if (await exists(archivedSource)) return archivedSource;

  await fs.mkdir(path.dirname(archivedSource), { recursive: true });
  await fs.copyFile(runtimeFile, archivedSource);
  return archivedSource;
}

function encoderFor(relativeFile, image) {
  if (relativeFile.endsWith('.avif')) {
    return image.avif({
      quality: relativeFile.startsWith('environments/') ? 45 : 44,
      effort: 7,
      chromaSubsampling: '4:4:4',
    });
  }

  const quality = tierThreeArtifactPattern.test(relativeFile) ? 68 :
    relativeFile.includes('galaxy-region-atlas') ? 65 : 68;
  return image.webp({
    quality,
    alphaQuality: 88,
    effort: 6,
    smartSubsample: true,
  });
}

const assets = await collectRuntimeAssets();
if (assets.length < 80) {
  throw new Error(`Expected at least 80 active Civilization runtime assets, found ${assets.length}.`);
}

let beforeBytes = 0;
let afterBytes = 0;
let optimizedCount = 0;

for (const relativeFile of assets) {
  const output = path.join(assetRoot, relativeFile);
  const source = await sourceFor(relativeFile);
  const before = (await fs.stat(output)).size;
  const encoded = await encoderFor(relativeFile, sharp(source, { failOn: 'error' })).toBuffer();

  beforeBytes += before;
  if (encoded.length < before) {
    await fs.writeFile(output, encoded);
    afterBytes += encoded.length;
    optimizedCount += 1;
  } else {
    afterBytes += before;
  }
}

const savedBytes = beforeBytes - afterBytes;
console.log(
  `Optimized ${optimizedCount}/${assets.length} active Civilization runtime assets: ` +
  `${(beforeBytes / 1024 / 1024).toFixed(2)} MB -> ` +
  `${(afterBytes / 1024 / 1024).toFixed(2)} MB ` +
  `(${(savedBytes / 1024 / 1024).toFixed(2)} MB saved).`,
);
