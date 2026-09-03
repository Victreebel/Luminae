import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));

describe("prototype isolation boundary", () => {
  it("does not import production game logic, APIs, account code, or persistence", () => {
    const sources = readdirSync(sourceDirectory)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => readFileSync(join(sourceDirectory, name), "utf8"))
      .join("\n");
    const forbiddenImports = [
      /from\s+["'][^"']*artifacts\/luminae\/src\/(?!assets\/)/,
      /from\s+["'][^"']*api-server/,
      /from\s+["'][^"']*lib\/game-types/,
      /from\s+["'][^"']*lib\/db/,
      /from\s+["'][^"']*api-client/,
    ];
    for (const pattern of forbiddenImports) expect(sources).not.toMatch(pattern);
  });

  it("references production only through immutable visual assets", () => {
    const main = readFileSync(join(sourceDirectory, "main.ts"), "utf8");
    const references = [...main.matchAll(/\.\.\/\.\.\/luminae\/src\/([^"']+)/g)].map((match) => match[1]);
    expect(references.length).toBeGreaterThan(0);
    expect(references.every((reference) => reference.startsWith("assets/"))).toBe(true);
  });
});
