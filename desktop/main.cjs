const { app, BrowserWindow, dialog, shell } = require("electron");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const developerMode = process.env.LUMINAE_DESKTOP_DEV === "1";
const projectRoot = path.resolve(__dirname, "..");
const children = [];
const pnpm = process.env.PNPM_BIN || "pnpm";
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
  const logPath = path.join(app.getPath("logs"), "desktop-development.log");
  const log = fs.openSync(logPath, "a");
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    stdio: ["ignore", log, log],
  });
  child.on("error", (error) => fs.appendFileSync(logPath, `${error.stack}\n`));
  children.push(child);
}

async function waitForPort(port, label) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await portIsOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not start.`);
}

async function developmentUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when LUMINAE_DESKTOP_DEV=1.");
  }
  if (!(await portIsOpen(apiPort))) {
    start(pnpm, ["--filter", "@workspace/api-server", "run", "dev"], {
      PORT: String(apiPort),
      DATABASE_URL: databaseUrl,
    });
    await waitForPort(apiPort, "Luminae API");
  }
  if (!(await portIsOpen(frontendPort))) {
    start(pnpm, ["--filter", "@workspace/luminae", "run", "dev"], {
      PORT: String(frontendPort),
    });
    await waitForPort(frontendPort, "Luminae web client");
  }
  return new URL(`http://127.0.0.1:${frontendPort}/?desktop=1`);
}

function productionUrl() {
  const configured = process.env.LUMINAE_WEB_URL;
  if (!configured) {
    throw new Error("LUMINAE_WEB_URL must be configured for a production Mac build.");
  }
  const url = new URL(configured);
  if (url.protocol !== "https:") {
    throw new Error("LUMINAE_WEB_URL must use HTTPS.");
  }
  url.searchParams.set("desktop", "1");
  return url;
}

async function createWindow() {
  const gameUrl = developerMode ? await developmentUrl() : productionUrl();
  const allowedOrigin = gameUrl.origin;
  const window = new BrowserWindow({
    width: 940,
    height: 1440,
    minWidth: 720,
    minHeight: 800,
    title: "Luminae",
    backgroundColor: "#0a0c14",
    autoHideMenuBar: true,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url);
    if (target.protocol === "https:") void shell.openExternal(target.toString());
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== allowedOrigin) event.preventDefault();
  });
  await window.loadURL(gameUrl.toString());
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    dialog.showErrorBox("Luminae could not start", error instanceof Error ? error.message : String(error));
    app.quit();
  }
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => children.forEach((child) => child.kill()));
