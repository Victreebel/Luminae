import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const publicDirectory = join(process.cwd(), "artifacts/luminae/public");
const source = readFileSync(join(publicDirectory, "favicon.svg"));
const outputs = [
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

for (const [name, size] of outputs) {
  await sharp(source, { density: 384 })
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(publicDirectory, name));
}

console.log(`Generated ${outputs.length} public icons from artifacts/luminae/public/favicon.svg.`);
