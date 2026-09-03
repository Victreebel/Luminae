import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const publicDirectory = join(process.cwd(), "artifacts/luminae/public");
const width = 1280;
const height = 720;
const stars = Array.from({ length: 54 }, (_, index) => {
  const x = (index * 197 + 73) % width;
  const y = (index * 113 + 41) % height;
  const radius = index % 9 === 0 ? 2.2 : index % 4 === 0 ? 1.4 : 0.8;
  const opacity = 0.22 + (index % 5) * 0.1;
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#d8edff" opacity="${opacity}"/>`;
}).join("");

const background = Buffer.from(`
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#03060d"/>
        <stop offset="0.55" stop-color="#081322"/>
        <stop offset="1" stop-color="#04070e"/>
      </linearGradient>
      <radialGradient id="halo">
        <stop offset="0" stop-color="#4f8fd5" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#4f8fd5" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#field)"/>
    <ellipse cx="338" cy="360" rx="410" ry="360" fill="url(#halo)"/>
    ${stars}
    <g fill="none" stroke="#5f83a6" stroke-opacity="0.24" stroke-width="1">
      <path d="M0 112H278L342 176H702L760 118H1280"/>
      <path d="M0 606H224L302 528H714L790 602H1280"/>
      <path d="M744 216H1192M744 504H1192"/>
      <path d="M836 216V504M1088 216V504"/>
    </g>
    <g fill="none" stroke="#9fc7e8" stroke-opacity="0.55" stroke-width="2">
      <path d="M60 72H468"/>
      <path d="M812 648H1220"/>
    </g>
  </svg>
`);

const typography = Buffer.from(`
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="680" y="330" fill="#f4f8fc" font-family="Georgia, serif" font-size="98" letter-spacing="4">LUMINAe</text>
    <text x="686" y="384" fill="#9fc7e8" font-family="Arial, sans-serif" font-size="20" letter-spacing="3">COSMIC STRATEGY | LIVING WORLDS</text>
    <rect x="686" y="418" width="380" height="3" fill="#e7b84d" opacity="0.8"/>
    <rect x="1068" y="418" width="54" height="3" fill="#57b877" opacity="0.8"/>
    <rect x="1124" y="418" width="54" height="3" fill="#7656c8" opacity="0.8"/>
  </svg>
`);

const icon = await sharp(readFileSync(join(publicDirectory, "icon_affinity.svg")))
  .resize(390, 390)
  .png()
  .toBuffer();

await sharp(background)
  .composite([
    { input: icon, left: 136, top: 165 },
    { input: typography, left: 0, top: 0 },
  ])
  .jpeg({ quality: 92, chromaSubsampling: "4:4:4", progressive: true })
  .toFile(join(publicDirectory, "opengraph.jpg"));

console.log("Generated artifacts/luminae/public/opengraph.jpg from first-party code-native sources.");
