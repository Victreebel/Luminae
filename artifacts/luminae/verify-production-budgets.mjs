import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const buildRoot = join(packageRoot, "dist/public");
const limits = {
  total: 35 * 1024 * 1024,
  mainJavaScriptGzip: 200 * 1024,
  globalCssGzip: 110 * 1024,
};

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

console.log(`Production assets: ${format(totalBytes)} / ${format(limits.total)}`);
console.log(`Entry JavaScript: ${format(mainJavaScriptGzip)} gzip / ${format(limits.mainJavaScriptGzip)}`);
console.log(`Global CSS: ${format(globalCssGzip)} gzip / ${format(limits.globalCssGzip)}`);

if (errors.length > 0) {
  throw new Error(`Production budget verification failed:\n- ${errors.join("\n- ")}`);
}

console.log("Production budget verification passed.");
