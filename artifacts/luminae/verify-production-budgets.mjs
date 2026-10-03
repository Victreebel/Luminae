import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const buildRoot = join(packageRoot, "dist/public");
const limits = {
  total: 48 * 1024 * 1024,
  coreTotal: 35 * 1024 * 1024,
  civilizationEnvironmentLibrary: 13 * 1024 * 1024,
  civilizationEnvironmentPlate: 480 * 1024,
  civilizationHostLibrary: 12 * 1024 * 1024,
  civilizationHostAtlas: 900 * 1024,
  // Fifteen atlases cover all 90 current unique Artifact IDs. Tier III uses
  // larger cells so its larger native manifestations remain crisp in Scan.
  civilizationArtifactManifestationLibrary: 5.5 * 1024 * 1024,
  civilizationBlueprintManifestationLibrary: 768 * 1024,
  civilizationBlueprintManifestation: 180 * 1024,
  mainJavaScriptGzip: 200 * 1024,
  globalCssGzip: 110 * 1024,
};

const retiredCivilizationPortraitPattern =
  /^assets\/civilization-(?:bloom|canopy|chrysalis|echo|eclipse|flux|lineage|orbit|spore|vortex)-.+\.avif$/;
const civilizationEnvironmentPattern =
  /^assets\/(?:aurora-basin|terminator-reach|oceanic-scar|obsidian-steppe)-(?:(?:substrate-atlas|surface(?:-mobile)?|orbit(?:-mobile)?|stellar(?:-mobile)?|galaxy(?:-mobile)?)-v\d+-.+\.webp|(?:surface-type[123]-city|orbit-type[123]|stellar-type[23]|galaxy-type[23])-v\d+-.+\.avif)$/;
const civilizationHostPattern =
  /^assets\/(?:(?:surface-settlement|surface-district|orbit-facility|stellar-cluster)-atlas-v1-.+\.avif|galaxy-region-atlas-v[23]-.+\.webp|(?:orbit-facility|stellar-cluster|galaxy-region)-atlas-v1-.+\.avif)$/;
const civilizationArtifactManifestationPattern =
  /^assets\/t[123][rseop]-artifact-atlas-v\d+-.+\.webp$/;
const civilizationTierThreeArtifactManifestationPattern =
  /^assets\/t3[rseop]-artifact-atlas-v[23]-.+\.webp$/;
const civilizationBlueprintManifestationPattern =
  /^assets\/(?:antimatter-detonator|mantle-to-orbit-foundry|ascension-registry|worldshield-covenant)-civilization-(?:runtime-)?v\d+-.+\.webp$/;

if (!existsSync(buildRoot)) {
  throw new Error("Production output is missing. Run the Luminae build first.");
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const files = walk(buildRoot);
const relativeFiles = files.map((file) => relative(buildRoot, file));
const totalBytes = files.reduce((total, file) => total + statSync(file).size, 0);
const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const filesMatching = (pattern) => files.filter((file) =>
  pattern.test(relative(buildRoot, file)),
);
const bytesOf = (matchedFiles) => matchedFiles.reduce(
  (total, file) => total + statSync(file).size,
  0,
);
const retiredCivilizationPortraitFiles = filesMatching(retiredCivilizationPortraitPattern);
const civilizationEnvironmentFiles = filesMatching(civilizationEnvironmentPattern);
const civilizationHostFiles = filesMatching(civilizationHostPattern);
const civilizationArtifactManifestationFiles = files.filter((file) => {
  const outputPath = relative(buildRoot, file);
  return civilizationArtifactManifestationPattern.test(outputPath) ||
    civilizationTierThreeArtifactManifestationPattern.test(outputPath);
});
const blueprintManifestationSources = [
  "src/assets/blueprints/antimatter/antimatter-detonator-civilization-v1.webp",
  "src/assets/blueprints/mantle-to-orbit/mantle-to-orbit-foundry-civilization-runtime-v2.webp",
  "src/assets/blueprints/ascension-registry/ascension-registry-civilization-runtime-v1.webp",
  "src/assets/blueprints/worldshield/worldshield-covenant-civilization-runtime-v3.webp",
].map((path) => join(packageRoot, path));
const blueprintManifestationDigests = new Set(
  blueprintManifestationSources.filter(existsSync).map(digest),
);
const civilizationBlueprintManifestationFiles = files.filter((file) => (
  civilizationBlueprintManifestationPattern.test(relative(buildRoot, file)) ||
  (file.endsWith(".webp") && blueprintManifestationDigests.has(digest(file)))
));
const civilizationEnvironmentBytes = bytesOf(civilizationEnvironmentFiles);
const civilizationHostBytes = bytesOf(civilizationHostFiles);
const civilizationArtifactManifestationBytes = bytesOf(civilizationArtifactManifestationFiles);
const civilizationBlueprintManifestationBytes = bytesOf(
  civilizationBlueprintManifestationFiles,
);
const coreBytes =
  totalBytes -
  civilizationEnvironmentBytes -
  civilizationHostBytes -
  civilizationArtifactManifestationBytes -
  civilizationBlueprintManifestationBytes;
const html = readFileSync(join(buildRoot, "index.html"), "utf8");
const mainScript = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
const globalCss = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/)?.[1];

if (!mainScript || !globalCss) {
  throw new Error("Could not identify the production entry JavaScript and CSS.");
}

const resolveAsset = (url) => join(buildRoot, url.replace(/^\//, ""));
const mainJavaScriptGzip = gzipSync(readFileSync(resolveAsset(mainScript))).byteLength;
const globalCssGzip = gzipSync(readFileSync(resolveAsset(globalCss))).byteLength;
const errors = [];

if (totalBytes > limits.total) {
  errors.push(`built assets are ${format(totalBytes)}; limit is ${format(limits.total)}`);
}
if (coreBytes > limits.coreTotal) {
  errors.push(`core assets are ${format(coreBytes)}; limit is ${format(limits.coreTotal)}`);
}
if (retiredCivilizationPortraitFiles.length > 0) {
  errors.push(
    `retired full-frame dyad portraits returned to production: ` +
    retiredCivilizationPortraitFiles.map((file) => relative(buildRoot, file)).join(", "),
  );
}
if (civilizationEnvironmentBytes > limits.civilizationEnvironmentLibrary) {
  errors.push(
    `on-demand Civilization environments are ${format(civilizationEnvironmentBytes)}; ` +
    `limit is ${format(limits.civilizationEnvironmentLibrary)}`,
  );
}
if (civilizationHostBytes > limits.civilizationHostLibrary) {
  errors.push(
    `on-demand dyad host architecture is ${format(civilizationHostBytes)}; ` +
    `limit is ${format(limits.civilizationHostLibrary)}`,
  );
}
if (
  civilizationArtifactManifestationBytes >
  limits.civilizationArtifactManifestationLibrary
) {
  errors.push(
    `on-demand Civilization Artifact manifestations are ` +
    `${format(civilizationArtifactManifestationBytes)}; limit is ` +
    `${format(limits.civilizationArtifactManifestationLibrary)}`,
  );
}
if (
  civilizationBlueprintManifestationBytes >
  limits.civilizationBlueprintManifestationLibrary
) {
  errors.push(
    `on-demand Blueprint manifestations are ` +
    `${format(civilizationBlueprintManifestationBytes)}; limit is ` +
    `${format(limits.civilizationBlueprintManifestationLibrary)}`,
  );
}
const oversizedCivilizationEnvironments = civilizationEnvironmentFiles.filter(
  (file) => statSync(file).size > limits.civilizationEnvironmentPlate,
);
if (oversizedCivilizationEnvironments.length > 0) {
  errors.push(
    `oversized Civilization environment plates: ${oversizedCivilizationEnvironments
      .map((file) => relative(buildRoot, file))
      .join(", ")}`,
  );
}
const oversizedCivilizationHosts = civilizationHostFiles.filter(
  (file) => statSync(file).size > limits.civilizationHostAtlas,
);
if (oversizedCivilizationHosts.length > 0) {
  errors.push(
    `oversized dyad host atlases: ${oversizedCivilizationHosts
      .map((file) => relative(buildRoot, file))
      .join(", ")}`,
  );
}
const oversizedBlueprintManifestations = civilizationBlueprintManifestationFiles.filter(
  (file) => statSync(file).size > limits.civilizationBlueprintManifestation,
);
if (oversizedBlueprintManifestations.length > 0) {
  errors.push(
    `oversized Blueprint manifestations: ${oversizedBlueprintManifestations
      .map((file) => relative(buildRoot, file))
      .join(", ")}`,
  );
}
if (mainJavaScriptGzip > limits.mainJavaScriptGzip) {
  errors.push(`entry JavaScript is ${format(mainJavaScriptGzip)} gzip; limit is ${format(limits.mainJavaScriptGzip)}`);
}
if (globalCssGzip > limits.globalCssGzip) {
  errors.push(`global CSS is ${format(globalCssGzip)} gzip; limit is ${format(limits.globalCssGzip)}`);
}

const forbiddenOutputs = relativeFiles.filter((file) =>
  /(?:^|\/)(?:dev-|font-preview|card-browser|anim-sandbox)/i.test(file) ||
  /assets\/t[123][a-z]\d{2}-[^/]+\.png$/i.test(file) ||
  /assets\/(?:panel|entity|Radiant[ _-]?[123])-[^/]+\.png$/i.test(file),
);
if (forbiddenOutputs.length > 0) {
  errors.push(`forbidden development or source-art output: ${forbiddenOutputs.join(", ")}`);
}

const releaseJavaScript = files
  .filter((file) => file.endsWith(".js"))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
if (/\/(?:dev\/|dev-)(?:card|anim|antimatter|blueprint|font)/i.test(releaseJavaScript)) {
  errors.push("a development route remains reachable from release JavaScript");
}
if (/release-journey|ux-review|DevUxReviewBridge/i.test(releaseJavaScript)) {
  errors.push("the UX review console or capture bridge remains in release JavaScript");
}

const serviceWorkerPath = join(buildRoot, "sw.js");
if (existsSync(serviceWorkerPath)) {
  const serviceWorker = readFileSync(serviceWorkerPath, "utf8");
  const precachedCivilizationEnvironments = civilizationEnvironmentFiles.filter((file) =>
    serviceWorker.includes(relative(buildRoot, file)),
  );
  if (precachedCivilizationEnvironments.length > 0) {
    errors.push("on-demand Civilization environments must not enter the startup precache");
  }
  const precachedCivilizationHosts = civilizationHostFiles.filter((file) =>
    serviceWorker.includes(relative(buildRoot, file)),
  );
  if (precachedCivilizationHosts.length > 0) {
    errors.push("on-demand dyad host atlases must not enter the startup precache");
  }
  const precachedArtifactManifestations = civilizationArtifactManifestationFiles.filter((file) =>
    serviceWorker.includes(relative(buildRoot, file)),
  );
  if (precachedArtifactManifestations.length > 0) {
    errors.push("on-demand Artifact manifestations must not enter the startup precache");
  }
  const precachedBlueprintManifestations = civilizationBlueprintManifestationFiles.filter((file) =>
    serviceWorker.includes(relative(buildRoot, file)),
  );
  if (precachedBlueprintManifestations.length > 0) {
    errors.push("on-demand Blueprint manifestations must not enter the startup precache");
  }
}

console.log(`Production assets: ${format(totalBytes)} / ${format(limits.total)}`);
console.log(`Core assets: ${format(coreBytes)} / ${format(limits.coreTotal)}`);
console.log(
  `On-demand Civilization environments: ${format(civilizationEnvironmentBytes)} / ` +
  `${format(limits.civilizationEnvironmentLibrary)} (${civilizationEnvironmentFiles.length} plates)`,
);
console.log(
  `On-demand dyad host architecture: ${format(civilizationHostBytes)} / ` +
  `${format(limits.civilizationHostLibrary)} (${civilizationHostFiles.length} atlases)`,
);
console.log(
  `On-demand Artifact manifestations: ${format(civilizationArtifactManifestationBytes)} / ` +
  `${format(limits.civilizationArtifactManifestationLibrary)} ` +
  `(${civilizationArtifactManifestationFiles.length} atlases)`,
);
console.log(
  `On-demand Blueprint manifestations: ${format(civilizationBlueprintManifestationBytes)} / ` +
  `${format(limits.civilizationBlueprintManifestationLibrary)} ` +
  `(${civilizationBlueprintManifestationFiles.length} assets)`,
);
console.log(`Entry JavaScript: ${format(mainJavaScriptGzip)} gzip / ${format(limits.mainJavaScriptGzip)}`);
console.log(`Global CSS: ${format(globalCssGzip)} gzip / ${format(limits.globalCssGzip)}`);

if (errors.length > 0) {
  throw new Error(`Production budget verification failed:\n- ${errors.join("\n- ")}`);
}

console.log("Production budget verification passed.");
