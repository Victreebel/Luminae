import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const assetRoots = [
  join(root, "artifacts/luminae/src/assets"),
  join(root, "artifacts/luminae/public"),
];
const sourceRoot = join(root, "artifacts/luminae/src");
const output = join(root, "docs/LUMINAe_ASSET_PROVENANCE_INVENTORY_v1.0.csv");
const evidencePath = join(root, "docs/LUMINAe_ASSET_PROVENANCE_EVIDENCE_v1.0.csv");
const mediaExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg", ".mp3", ".wav", ".ogg", ".m4a"]);
const sourceExtensions = new Set([".ts", ".tsx", ".css", ".html", ".json"]);
const provenanceStatuses = new Set(["VERIFIED", "PARTIAL_PROVENANCE", "MISSING_PROVENANCE"]);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function csv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      record.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      record.push(field);
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [header = [], ...rows] = records;
  return rows.map((values) => Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""])));
}

const evidenceRules = existsSync(evidencePath)
  ? parseCsv(readFileSync(evidencePath, "utf8")).map((rule, index) => {
      if (!['exact', 'prefix'].includes(rule.match_type)) {
        throw new Error(`Invalid evidence match_type on row ${index + 2}: ${rule.match_type}`);
      }
      if (!provenanceStatuses.has(rule.provenance_status)) {
        throw new Error(`Invalid evidence provenance_status on row ${index + 2}: ${rule.provenance_status}`);
      }
      return rule;
    })
  : [];

function evidenceFor(repoPath, sha256) {
  const rule = evidenceRules.find((candidate) =>
    candidate.match_type === "exact" ? repoPath === candidate.path : repoPath.startsWith(candidate.path),
  );
  if (rule?.expected_sha256 && rule.expected_sha256 !== sha256) {
    throw new Error(`Provenance evidence is stale for ${repoPath}: SHA-256 no longer matches.`);
  }
  if (rule?.provenance_status === "VERIFIED" && rule.match_type !== "exact") {
    throw new Error(`Verified provenance evidence must use an exact path match: ${repoPath}`);
  }
  if (rule?.provenance_status === "VERIFIED" && !rule.expected_sha256) {
    throw new Error(`Verified provenance evidence must pin expected_sha256: ${repoPath}`);
  }
  return rule;
}

const sourceCorpus = walk(sourceRoot)
  .filter((file) => sourceExtensions.has(extname(file).toLowerCase()))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const rows = assetRoots
  .flatMap(walk)
  .filter((file) => mediaExtensions.has(extname(file).toLowerCase()))
  .map((file) => {
    const repoPath = relative(root, file);
    const assetPath = repoPath.replace(/^artifacts\/luminae\/src\//, "");
    const publicAsset = repoPath.startsWith("artifacts/luminae/public/");
    const referenced = publicAsset || sourceCorpus.includes(assetPath) || sourceCorpus.includes(repoPath);
    const generatedDirectory = repoPath.includes("/generated_images/");
    const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
    const evidence = evidenceFor(repoPath, sha256);
    return {
      path: repoPath,
      media_type: extname(file).slice(1).toLowerCase(),
      bytes: statSync(file).size,
      sha256,
      release_reachability: referenced ? "REFERENCED_OR_PUBLIC" : "SOURCE_ONLY_OR_UNCONFIRMED",
      provenance_status: evidence?.provenance_status ?? (generatedDirectory ? "PARTIAL_PROVENANCE" : "MISSING_PROVENANCE"),
      evidence_confidence: evidence?.evidence_confidence ?? (generatedDirectory ? "folder-name evidence only" : "missing evidence"),
      asserted_origin: evidence?.asserted_origin ?? (generatedDirectory ? "project generated-image directory" : "not recorded beside asset"),
      evidence_reference: evidence?.evidence_reference ?? "not recorded",
      license_evidence: evidence?.license_evidence ?? "not recorded",
      release_action: evidence?.release_action ?? "confirm ownership/license and retain evidence before public distribution",
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const columns = Object.keys(rows[0] ?? {});
writeFileSync(output, [
  columns.join(","),
  ...rows.map((row) => columns.map((column) => csv(row[column])).join(",")),
].join("\n") + "\n");

const reachable = rows.filter((row) => row.release_reachability === "REFERENCED_OR_PUBLIC");
const unresolved = reachable.filter((row) => row.provenance_status !== "VERIFIED");
const counts = Object.fromEntries(
  [...provenanceStatuses].map((status) => [status, reachable.filter((row) => row.provenance_status === status).length]),
);
console.log(
  `Asset inventory: ${rows.length} media files; ${reachable.length} referenced/public; ` +
    `${counts.VERIFIED} verified; ${counts.PARTIAL_PROVENANCE} partial; ${counts.MISSING_PROVENANCE} missing; ` +
    `${unresolved.length} unresolved.`,
);
console.log(`Wrote ${relative(root, output)}`);

if (process.argv.includes("--strict") && unresolved.length > 0) {
  throw new Error(
    `Public release is blocked: ${unresolved.length} referenced/public media assets remain unresolved ` +
      `(${counts.PARTIAL_PROVENANCE} partial, ${counts.MISSING_PROVENANCE} missing).`,
  );
}
