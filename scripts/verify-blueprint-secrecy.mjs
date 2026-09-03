import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const distRoot = resolve("artifacts/luminae/dist/public");
const assetsRoot = join(distRoot, "assets");

const blueprintNames = [
  "Antimatter Detonator",
  "Mantle-to-Orbit Foundry",
  "Worldshield Covenant",
  "Ascension Registry",
];

const eagerBundlePrefixes = ["index-", "game-", "dashboard-", "LumiiVaultEncounter-"];
const sensitiveFileNamePattern =
  /antimatter|mantle|worldshield|ascension|foundry|covenant/i;

function isEagerBundle(fileName) {
  if (!fileName.endsWith(".js")) return false;
  if (fileName.startsWith("game-forge-animation-")) return false;
  return eagerBundlePrefixes.some((prefix) => fileName.startsWith(prefix));
}

function fail(message) {
  console.error(`Blueprint secrecy verification failed: ${message}`);
  process.exitCode = 1;
}

let assetFiles;
try {
  assetFiles = await readdir(assetsRoot);
} catch (error) {
  console.error(
    `Blueprint secrecy verification could not read ${assetsRoot}. Run the production web build first.`,
  );
  throw error;
}

for (const fileName of assetFiles.filter(isEagerBundle)) {
  const source = await readFile(join(assetsRoot, fileName), "utf8");
  for (const blueprintName of blueprintNames) {
    if (source.includes(blueprintName)) {
      fail(`${blueprintName} leaked into eager bundle ${fileName}`);
    }
  }
}

for (const fileName of assetFiles.filter((name) => name.endsWith(".js"))) {
  const source = await readFile(join(assetsRoot, fileName), "utf8");
  for (const blueprintName of blueprintNames) {
    if (source.includes(blueprintName) && !fileName.startsWith("sealed-")) {
      fail(`${blueprintName} is present outside a sealed reveal chunk in ${fileName}`);
    }
  }
}

for (const fileName of assetFiles) {
  if (sensitiveFileNamePattern.test(fileName)) {
    fail(`sealed Blueprint identity is exposed by emitted filename ${fileName}`);
  }
}

const serviceWorkerPath = join(distRoot, "sw.js");
const serviceWorker = await readFile(serviceWorkerPath, "utf8");
if (serviceWorker.includes("/assets/sealed-")) {
  fail("a sealed reveal chunk or asset is present in the service-worker precache");
}

if (process.exitCode) process.exit(process.exitCode);

console.log(
  `Blueprint secrecy verification passed (${assetFiles.filter(isEagerBundle).length} eager bundles checked).`,
);
