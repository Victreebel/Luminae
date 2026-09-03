import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runSimulationMatrix } from "./simulation";

const argumentsList = process.argv.slice(2);
const valueAfter = (flag: string) => {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : undefined;
};
const seeds = Number(valueAfter("--seeds") ?? 100);
const output = valueAfter("--output");
const catalog = valueAfter("--catalog") === "micro" ? "micro" : "core";
const report = runSimulationMatrix({ seedsPerConfiguration: seeds, catalog });
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (output) writeFileSync(resolve(output), serialized, "utf8");
process.stdout.write(serialized);
