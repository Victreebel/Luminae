import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";

function usage() {
  throw new Error(
    "Usage: node scripts/extract-codex-image-provenance.mjs " +
      "--output <manifest.json> --session <rollout.jsonl> [--session <rollout.jsonl> ...]",
  );
}

function parseArgs(argv) {
  const sessions = [];
  let output = "";

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--session") {
      const value = argv[index + 1];
      if (!value) usage();
      sessions.push(value);
      index += 1;
    } else if (argument === "--output") {
      output = argv[index + 1] ?? "";
      if (!output) usage();
      index += 1;
    } else {
      usage();
    }
  }

  if (!output || sessions.length === 0) usage();
  return { output, sessions };
}

function sessionIdFor(path) {
  const match = basename(path).match(/(019[0-9a-f-]{33})\.jsonl$/i);
  if (!match) throw new Error(`Could not derive session ID from ${path}`);
  return match[1];
}

function decodeQuoted(source, start) {
  const quote = source[start];
  let escaped = false;

  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === quote) {
      const raw = source.slice(start, index + 1);
      const value =
        quote === '"'
          ? JSON.parse(raw)
          : raw
              .slice(1, -1)
              .replaceAll(`\\${quote}`, quote)
              .replaceAll("\\\\", "\\");
      return { value, end: index + 1 };
    }
  }

  throw new Error("Unterminated quoted value in image-generation request");
}

function fieldStart(source, field) {
  const pattern = new RegExp(`(?:["']${field}["']|\\b${field}\\b)\\s*:\\s*`, "g");
  const match = pattern.exec(source);
  return match ? match.index + match[0].length : -1;
}

function stringField(source, field) {
  const start = fieldStart(source, field);
  if (start < 0) return null;
  const quote = source[start];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  return decodeQuoted(source, start).value;
}

function arrayField(source, field) {
  const start = fieldStart(source, field);
  if (start < 0 || source[start] !== "[") return [];

  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        const raw = source.slice(start, index + 1);
        try {
          return JSON.parse(raw);
        } catch {
          return [...raw.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
        }
      }
    }
  }
  return [];
}

function numberField(source, field) {
  const start = fieldStart(source, field);
  if (start < 0) return null;
  const match = source.slice(start).match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseImagegenRequest(input) {
  const marker = "tools.image_gen__imagegen(";
  const markerIndex = input.indexOf(marker);
  if (markerIndex < 0) return null;
  const source = input.slice(markerIndex + marker.length);
  const prompt = stringField(source, "prompt");

  return {
    prompt,
    referencedImagePaths: arrayField(source, "referenced_image_paths"),
    numLastImagesToInclude: numberField(source, "num_last_images_to_include"),
    requestSha256: createHash("sha256").update(input).digest("hex"),
    requestParseStatus: prompt ? "PARSED" : "UNPARSED_PROMPT",
  };
}

function parseDirectImagegenRequest(argumentsText) {
  const requestSha256 = createHash("sha256").update(argumentsText).digest("hex");
  try {
    const parsed = JSON.parse(argumentsText);
    return {
      prompt: typeof parsed.prompt === "string" ? parsed.prompt : null,
      referencedImagePaths: Array.isArray(parsed.referenced_image_paths)
        ? parsed.referenced_image_paths
        : [],
      numLastImagesToInclude:
        typeof parsed.num_last_images_to_include === "number"
          ? parsed.num_last_images_to_include
          : null,
      requestSha256,
      requestParseStatus: typeof parsed.prompt === "string" ? "PARSED" : "UNPARSED_PROMPT",
    };
  } catch {
    return {
      prompt: null,
      referencedImagePaths: [],
      numLastImagesToInclude: null,
      requestSha256,
      requestParseStatus: "UNPARSED_ARGUMENTS",
    };
  }
}

function fileEvidence(path) {
  if (!existsSync(path)) return { path, exists: false, sha256: null };
  return {
    path,
    exists: true,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  };
}

async function extractSession(path) {
  const sessionId = sessionIdFor(path);
  const pending = [];
  const generations = [];
  const completedImageByOuterCallId = new Map();
  const recentConversationImages = [];
  const sessionHash = createHash("sha256");
  const input = createReadStream(path);
  input.on("data", (chunk) => sessionHash.update(chunk));
  const lines = createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }

    const payload = record.payload;
    if (
      record.type === "response_item" &&
      ["custom_tool_call_output", "function_call_output"].includes(payload?.type) &&
      Array.isArray(payload.output) &&
      payload.output.some((item) => ["input_image", "image"].includes(item?.type))
    ) {
      const knownOutput = completedImageByOuterCallId.get(payload.call_id);
      recentConversationImages.push(
        knownOutput ?? {
          path: null,
          exists: false,
          sha256: null,
          evidenceStatus: "UNRESOLVED_CONVERSATION_IMAGE",
        },
      );
      recentConversationImages.splice(0, Math.max(0, recentConversationImages.length - 5));
      continue;
    }

    if (
      record.type === "response_item" &&
      payload?.type === "custom_tool_call" &&
      payload.name === "exec" &&
      String(payload.input).includes("tools.image_gen__imagegen")
    ) {
      const request = parseImagegenRequest(String(payload.input));
      pending.push({
        requestedAt: record.timestamp ?? null,
        outerCallId: payload.call_id ?? null,
        ...request,
        includedRecentImages:
          request.numLastImagesToInclude == null
            ? []
            : recentConversationImages.slice(-request.numLastImagesToInclude),
      });
      continue;
    }

    if (
      record.type === "response_item" &&
      payload?.type === "function_call" &&
      payload.name === "imagegen" &&
      payload.namespace === "image_gen"
    ) {
      const request = parseDirectImagegenRequest(String(payload.arguments ?? ""));
      pending.push({
        requestedAt: record.timestamp ?? null,
        outerCallId: payload.id ?? null,
        ...request,
        includedRecentImages:
          request.numLastImagesToInclude == null
            ? []
            : recentConversationImages.slice(-request.numLastImagesToInclude),
      });
      continue;
    }

    if (record.type === "event_msg" && payload?.type === "image_generation_end") {
      // Direct image calls can overlap older nested orchestration requests. The
      // generation event belongs to the nearest unmatched request in the log.
      const request = pending.pop();
      if (!request) continue;
      const outputPath = join(
        process.env.HOME ?? "",
        ".codex/generated_images",
        sessionId,
        `${payload.call_id}.png`,
      );
      const generation = {
        sessionId,
        requestedAt: request.requestedAt,
        completedAt: record.timestamp ?? null,
        outerCallId: request.outerCallId,
        outputCallId: payload.call_id ?? null,
        output: fileEvidence(outputPath),
        requestSha256: request.requestSha256,
        requestParseStatus: request.requestParseStatus,
        prompt: request.prompt,
        revisedPrompt: payload.revised_prompt ?? null,
        referencedImages: request.referencedImagePaths.map(fileEvidence),
        numLastImagesToInclude: request.numLastImagesToInclude,
        includedRecentImages: request.includedRecentImages,
        generationClass:
          request.requestParseStatus !== "PARSED"
            ? "UNPARSED"
            : request.referencedImagePaths.length === 0 && request.numLastImagesToInclude == null
              ? "TEXT_ONLY"
              : "REFERENCE_BASED",
      };
      generations.push(generation);
      if (request.outerCallId) {
        completedImageByOuterCallId.set(request.outerCallId, generation.output);
      }
    }
  }

  return {
    sessionId,
    sourcePath: path,
    sourceSha256: sessionHash.digest("hex"),
    unpairedRequests: pending.length,
    generations,
  };
}

const { output, sessions: sessionPaths } = parseArgs(process.argv.slice(2));
const sessions = [];
for (const path of sessionPaths) sessions.push(await extractSession(path));

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: "Compact first-party evidence extracted from local Codex image-generation session logs; image bytes and unrelated conversation content are omitted.",
  sessions: sessions.map(({ generations, ...session }) => ({
    ...session,
    generationCount: generations.length,
  })),
  generations: sessions.flatMap((session) => session.generations),
};

writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Wrote ${output}: ${manifest.generations.length} image generations across ${sessions.length} sessions.`,
);
