import { readFileSync, readdirSync, readlinkSync } from "fs";

const port = Number(process.argv[2]);
if (!port || isNaN(port)) process.exit(0);

const hexPort = port.toString(16).toUpperCase().padStart(4, "0");
const myPid = process.pid;
const pids = new Set();

try {
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
      const localAddr = cols[1];
      const localPort = localAddr.split(":")[1];
      if (localPort === hexPort) {
        const inode = cols[9];
        if (inode && inode !== "0") {
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
    }
  }

  for (const pid of pids) {
    try {
      process.kill(pid, 9);
    } catch {}
  }

  if (pids.size > 0) {
    await new Promise((r) => setTimeout(r, 1000));
  }
} catch {}
