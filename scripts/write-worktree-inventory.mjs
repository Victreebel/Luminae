import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const root = process.cwd();
const snapshotDate = new Date().toISOString().slice(0, 10);
const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim() || "DETACHED";
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--short", "--untracked-files=all"], { cwd: root, encoding: "utf8" })
  .trimEnd()
  .split("\n")
  .filter(Boolean)
  .map((line) => ({ status: line.slice(0, 2), path: line.slice(3) }));
const csv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = [
  "# LUMINAe pre-publication worktree inventory v1.0",
  `# Branch: ${branch}`,
  `# Base commit: ${commit}`,
  `# Snapshot date: ${snapshotDate}`,
  "status,path",
  ...status.map((entry) => `${csv(entry.status)},${csv(entry.path)}`),
];
writeFileSync("docs/LUMINAe_PREPUBLICATION_WORKTREE_INVENTORY_v1.0.csv", rows.join("\n") + "\n");
console.log(`Recorded ${status.length} modified or untracked paths on ${branch} at ${commit}.`);
