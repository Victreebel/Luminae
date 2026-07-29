const { app, BrowserWindow, dialog, session } = require("electron");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");

const projectRoot = process.env.LUMINAE_PROJECT_ROOT || "/Users/chaoscalligraphy/Documents/Lumiane";
const children = [];
const pnpm = "/opt/homebrew/bin/pnpm";
const frontendPort = Number(process.env.LUMINAE_DESKTOP_FRONTEND_PORT || 5187);
const apiPort = Number(process.env.LUMINAE_DESKTOP_API_PORT || 8080);

app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

function portIsOpen(port) {
  return new Promise((resolve) => {
    const request = http.get({ host: "127.0.0.1", port, path: "/", timeout: 800 }, () => {
      request.destroy();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

function start(command, args, env) {
  const log = fs.openSync("/tmp/luminae-desktop.log", "a");
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
      ...env,
    },
    stdio: ["ignore", log, log],
  });
  child.on("error", (error) => fs.appendFileSync("/tmp/luminae-desktop.log", `${error.stack}\n`));
  children.push(child);
  return child;
}

function ensureFrontendBuild() {
  const indexPath = path.join(projectRoot, "artifacts", "luminae", "dist", "public", "index.html");
  if (fs.existsSync(indexPath) && process.env.LUMINAE_DESKTOP_SKIP_BUILD === "1") return;

  const log = fs.openSync("/tmp/luminae-desktop.log", "a");
  const result = spawnSync(pnpm, ["--filter", "@workspace/luminae", "run", "build"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    },
    stdio: ["ignore", log, log],
  });
  if (result.status !== 0) {
    throw new Error("Luminae game screen could not be built. See /tmp/luminae-desktop.log.");
  }
}

async function clearDesktopWebCache() {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      origin: `http://127.0.0.1:${frontendPort}`,
      storages: ["serviceworkers", "cachestorage"],
    });
  } catch (error) {
    fs.appendFileSync("/tmp/luminae-desktop.log", `cache cleanup failed: ${error.stack ?? error}\n`);
  }
}

async function waitForPort(port, label) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    if (await portIsOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not start.`);
}

async function ensureGameIsRunning() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql:///luminae";
  const frontendWasOpen = await portIsOpen(frontendPort);

  if (!(await portIsOpen(apiPort))) {
    start(pnpm, ["--filter", "@workspace/api-server", "run", "dev"], {
      PORT: String(apiPort),
      DATABASE_URL: databaseUrl,
    });
    await waitForPort(apiPort, "Luminae game server");
  }

  ensureFrontendBuild();
  if (!frontendWasOpen) {
    start(pnpm, ["--filter", "@workspace/luminae", "run", "serve"], {
      PORT: String(frontendPort),
      NODE_ENV: "production",
    });
    await waitForPort(frontendPort, "Luminae game screen");
  }
}

app.whenReady().then(async () => {
  try {
    await ensureGameIsRunning();
    await clearDesktopWebCache();
    const window = new BrowserWindow({
      width: 940,
      height: 1440,
      minWidth: 720,
      minHeight: 980,
      title: "Luminae",
      backgroundColor: "#0a0c14",
      autoHideMenuBar: true,
      webPreferences: {
        backgroundThrottling: false,
      },
    });
    // Use the numeric loopback host so an old localhost PWA cache cannot mask
    // the live game code inside the desktop shell.
    await window.loadURL(`http://127.0.0.1:${frontendPort}?desktop=1`);
  } catch (error) {
    dialog.showErrorBox("Luminae could not start", error.message);
    app.quit();
  }
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => children.forEach((child) => child.kill()));
