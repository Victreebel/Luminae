import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import sharp from "sharp";

function usage() {
  throw new Error(
    "Usage: node scripts/map-codex-generated-assets.mjs --manifest <manifest.json> " +
      "--assets <directory> --session-id <id> --output <map.csv>",
  );
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) usage();
    values[key.slice(2)] = value;
  }
  if (!values.manifest || !values.assets || !values["session-id"] || !values.output) usage();
  return {
    manifestPath: values.manifest,
    assetsDirectory: values.assets,
    sessionId: values["session-id"],
    outputPath: values.output,
  };
}

function csv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function sample(path) {
  return sharp(path)
    .resize(96, 54, { fit: "fill" })
    .flatten({ background: "#000000" })
    .removeAlpha()
    .raw()
    .toBuffer();
}

function rmse(left, right) {
  let squaredError = 0;
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    squaredError += difference * difference;
  }
  return Math.sqrt(squaredError / left.length) / 255;
}

const { manifestPath, assetsDirectory, sessionId, outputPath } = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const generations = manifest.generations.filter(
  (generation) => generation.sessionId === sessionId && generation.output.exists,
);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const assets = readdirSync(assetsDirectory)
  .map((name) => join(assetsDirectory, name))
  .filter((path) => imageExtensions.has(extname(path).toLowerCase()));

const sourceSamples = new Map();
for (const generation of generations) {
  sourceSamples.set(generation.outputCallId, await sample(generation.output.path));
}

const matches = [];
for (const assetPath of assets) {
  const assetHash = sha256(assetPath);
  const assetSample = await sample(assetPath);
  const candidates = generations
    .map((generation) => ({
      generation,
      distance:
        generation.output.sha256 === assetHash
          ? 0
          : rmse(assetSample, sourceSamples.get(generation.outputCallId)),
    }))
    .sort((left, right) => left.distance - right.distance);
  const best = candidates[0];
  const second = candidates[1];
  const margin = (second?.distance ?? 1) - best.distance;
  const matchConfidence =
    best.distance === 0
      ? "EXACT_BINARY"
      : best.distance <= 0.03 && margin >= 0.02
        ? "HIGH_PIXEL_MATCH"
        : "REVIEW_REQUIRED";
  matches.push({
    assetPath,
    assetHash,
    generation: best.generation,
    distance: best.distance,
    margin,
    matchConfidence,
  });
}

const matchByBasename = new Map(matches.map((match) => [basename(match.assetPath), match]));
const generationByCallId = new Map(generations.map((generation) => [generation.outputCallId, generation]));
const generationByOutputHash = new Map(
  generations.map((generation) => [generation.output.sha256, generation]),
);
const chainMemo = new Map();

function generationForReference(reference) {
  if (reference.sha256 && generationByOutputHash.has(reference.sha256)) {
    return generationByOutputHash.get(reference.sha256);
  }
  const matchedAsset = matchByBasename.get(basename(reference.path));
  return matchedAsset?.generation ?? null;
}

function assessChain(generation, visiting = new Set()) {
  if (chainMemo.has(generation.outputCallId)) return chainMemo.get(generation.outputCallId);
  if (visiting.has(generation.outputCallId)) {
    return { status: "PARTIAL", unresolved: [`cycle:${generation.outputCallId}`] };
  }
  if (generation.generationClass === "TEXT_ONLY") {
    const result = { status: "FULLY_RECORDED", unresolved: [] };
    chainMemo.set(generation.outputCallId, result);
    return result;
  }
  if (generation.numLastImagesToInclude != null) {
    const recentImages = generation.includedRecentImages ?? [];
    const unresolved = [];
    if (recentImages.length !== generation.numLastImagesToInclude) {
      unresolved.push(
        `num_last_images_to_include:${generation.numLastImagesToInclude};recorded:${recentImages.length}`,
      );
    }
    const nextVisiting = new Set(visiting).add(generation.outputCallId);
    for (const reference of recentImages) {
      const dependency = generationForReference(reference);
      if (!dependency) {
        unresolved.push(reference.path ?? "unresolved-conversation-image");
        continue;
      }
      const dependencyResult = assessChain(dependency, nextVisiting);
      unresolved.push(...dependencyResult.unresolved);
    }
    const result = {
      status: unresolved.length === 0 ? "FULLY_RECORDED" : "PARTIAL",
      unresolved: [...new Set(unresolved)],
    };
    chainMemo.set(generation.outputCallId, result);
    return result;
  }
  if (generation.referencedImages.length === 0) {
    const result = { status: "PARTIAL", unresolved: ["reference-input-not-recorded"] };
    chainMemo.set(generation.outputCallId, result);
    return result;
  }

  const nextVisiting = new Set(visiting).add(generation.outputCallId);
  const unresolved = [];
  for (const reference of generation.referencedImages) {
    const dependency = generationForReference(reference);
    if (!dependency) {
      unresolved.push(reference.path);
      continue;
    }
    const dependencyResult = assessChain(dependency, nextVisiting);
    unresolved.push(...dependencyResult.unresolved);
  }
  const result = {
    status: unresolved.length === 0 ? "FULLY_RECORDED" : "PARTIAL",
    unresolved: [...new Set(unresolved)],
  };
  chainMemo.set(generation.outputCallId, result);
  return result;
}

const columns = [
  "asset_path",
  "asset_sha256",
  "source_session_id",
  "source_output_call_id",
  "source_output_sha256",
  "pixel_rmse",
  "nearest_match_margin",
  "match_confidence",
  "generation_class",
  "source_chain_status",
  "unresolved_references",
  "request_sha256",
];
const rows = matches.map((match) => {
  const chain = assessChain(match.generation);
  return {
    asset_path: relative(process.cwd(), match.assetPath),
    asset_sha256: match.assetHash,
    source_session_id: match.generation.sessionId,
    source_output_call_id: match.generation.outputCallId,
    source_output_sha256: match.generation.output.sha256,
    pixel_rmse: match.distance.toFixed(6),
    nearest_match_margin: match.margin.toFixed(6),
    match_confidence: match.matchConfidence,
    generation_class: match.generation.generationClass,
    source_chain_status: chain.status,
    unresolved_references: chain.unresolved.join(" | "),
    request_sha256: match.generation.requestSha256,
  };
});

writeFileSync(
  outputPath,
  `${columns.join(",")}\n${rows
    .map((row) => columns.map((column) => csv(row[column])).join(","))
    .join("\n")}\n`,
);

const reviewRequired = rows.filter(
  (row) => row.match_confidence === "REVIEW_REQUIRED" || row.source_chain_status !== "FULLY_RECORDED",
);
console.log(
  `Wrote ${outputPath}: ${rows.length} assets mapped; ${reviewRequired.length} require provenance review.`,
);
if (!existsSync(outputPath)) throw new Error(`Failed to write ${outputPath}`);
