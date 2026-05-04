import { execSync } from "child_process";

const port = process.argv[2];
if (!port) process.exit(0);

try {
  const out = execSync("ss -tlnp", { encoding: "utf8" });
  for (const line of out.split("\n")) {
    if (line.includes(":" + port + " ")) {
      const match = line.match(/pid=(\d+)/);
      if (match) {
        try {
          process.kill(Number(match[1]), 9);
        } catch {}
      }
    }
  }
} catch {}
