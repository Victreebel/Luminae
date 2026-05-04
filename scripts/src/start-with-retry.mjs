import { spawn } from "child_process";
import { createServer } from "net";
import { readFileSync, readdirSync, readlinkSync } from "fs";

const port = Number(process.argv[2]);
const fullCmd = process.argv.slice(3).join(" ");

if (!port || !fullCmd) {
  console.error("Usage: start-with-retry.mjs <port> <command...>");
  process.exit(1);
}

const MAX_RETRIES = 15;
const RETRY_DELAY = 2000;
const hexPort = port.toString(16).toUpperCase().padStart(4, "0");

function killProcessesOnPort() {
  const myPid = process.pid;
  const inodes = new Set();

  for (const tcpFile of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    try {
      const content = readFileSync(tcpFile, "utf8");
      for (const line of content.split("\n").slice(1)) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 10) continue;
        if (cols[1]?.split(":").pop() === hexPort) {
          const inode = cols[9];
          if (inode && inode !== "0") inodes.add(inode);
        }
      }
    } catch {}
  }

  if (inodes.size === 0) return;

  try {
    const entries = readdirSync("/proc").filter((e) => /^\d+$/.test(e));
    for (const pid of entries) {
      const pidNum = Number(pid);
      if (pidNum === myPid || pidNum <= 10) continue;
      try {
        const fds = readdirSync(`/proc/${pid}/fd`);
        for (const fd of fds) {
          try {
            const link = readlinkSync(`/proc/${pid}/fd/${fd}`);
            for (const inode of inodes) {
              if (link === `socket:[${inode}]`) {
                try { process.kill(pidNum, 9); } catch {}
              }
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}
}

function isPortFree(p) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => { try { srv.close(); } catch {} resolve(false); });
    srv.listen({ port: p, host: "::", ipv6Only: false }, () => {
      srv.close(() => resolve(true));
    });
  });
}

async function waitForPort() {
  for (let i = 0; i < 30; i++) {
    killProcessesOnPort();
    if (await isPortFree(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return await isPortFree(port);
}

async function tryStart() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await waitForPort();

    const exitCode = await new Promise((resolve) => {
      const child = spawn(fullCmd, {
        stdio: "inherit",
        env: process.env,
        shell: true,
      });
      child.on("close", (code) => resolve(code));
      child.on("error", () => resolve(1));
    });

    if (exitCode === 0) return;

    console.log(`[start-with-retry] Attempt ${attempt}/${MAX_RETRIES} failed (exit ${exitCode}), retrying in ${RETRY_DELAY}ms...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY));
  }

  console.error("[start-with-retry] All retries exhausted");
  process.exit(1);
}

await tryStart();
