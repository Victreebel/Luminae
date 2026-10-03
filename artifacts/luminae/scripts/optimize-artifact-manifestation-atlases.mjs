import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDirectory = path.resolve(
  import.meta.dirname,
  '../src/assets/civilization/manifestations/artifacts/authored',
);
const runtimeWidth = 704;
const maximumLibraryBytes = 2.5 * 1024 * 1024;

const entries = (await fs.readdir(sourceDirectory))
  .filter((file) => /^t[123][rseop]-artifact-atlas-v1\.avif$/.test(file))
  .sort();

if (entries.length !== 15) {
  throw new Error(`Expected 15 authored Artifact atlases, found ${entries.length}.`);
}

const outputs = await Promise.all(
  entries.map(async (entry) => {
    const input = path.join(sourceDirectory, entry);
    const output = path.join(sourceDirectory, entry.replace(/\.avif$/, '.webp'));

    await sharp(input)
      .resize(runtimeWidth, runtimeWidth, { fit: 'fill' })
      .webp({
        quality: 74,
        alphaQuality: 88,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(output);

    return { output, size: (await fs.stat(output)).size };
  }),
);

const totalBytes = outputs.reduce((total, output) => total + output.size, 0);
if (totalBytes > maximumLibraryBytes) {
  throw new Error(
    `Runtime Artifact atlases total ${(totalBytes / 1024).toFixed(1)} KB; ` +
      `limit is ${(maximumLibraryBytes / 1024).toFixed(1)} KB.`,
  );
}

console.log(
  `Optimized ${outputs.length} Artifact atlases at ${runtimeWidth}px ` +
    `(${(totalBytes / 1024).toFixed(1)} KB total).`,
);
