import { readFileSync, readdirSync, readlinkSync } from "fs";
import { createServer } from "net";

const port = Number(process.argv[2]);
if (!port || isNaN(port)) process.exit(0);

const hexPort = port.toString(16).toUpperCase().padStart(4, "0");
const myPid = process.pid;

function findPidsOnPort() {
  const pids = new Set();
  for (const tcpFile of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let content;
    try {
      content = readFileSync(tcpFile, "utf8");
    } catch {
      continue;
    }
    for (const line of content.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 10) continue;
      const localPort = cols[1]?.split(":")[1];
      if (localPort !== hexPort) continue;
      const inode = cols[9];
      if (!inode || inode === "0") continue;
      try {
        const entries = readdirSync("/proc").filter((e) => /^\d+$/.test(e));
        for (const pid of entries) {
          const pidNum = Number(pid);
          if (pidNum === myPid) continue;
          try {
            const fds = readdirSync(`/proc/${pid}/fd`);
            for (const fd of fds) {
              try {
                const link = readlinkSync(`/proc/${pid}/fd/${fd}`);
                if (link === `socket:[${inode}]`) {
                  pids.add(pidNum);
                }
              } catch {}
            }
          } catch {}
        }
      } catch {}
    }
  }
  return pids;
}

function isPortFree(p) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.listen(p, "0.0.0.0", () => {
      srv.close(() => resolve(true));
    });
  });
}

const pids = findPidsOnPort();
for (const pid of pids) {
  try {
    process.kill(pid, 9);
  } catch {}
}

const maxWait = 15000;
const interval = 500;
let waited = 0;
while (waited < maxWait) {
  if (await isPortFree(port)) {
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, interval));
  waited += interval;

  if (waited % 2000 === 0) {
    const morePids = findPidsOnPort();
    for (const pid of morePids) {
      try {
        process.kill(pid, 9);
      } catch {}
    }
  }
}

process.exit(0);
