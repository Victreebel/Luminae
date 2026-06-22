const { app, BrowserWindow, dialog } = require("electron");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const projectRoot = process.env.LUMINAE_PROJECT_ROOT || "/Users/chaoscalligraphy/Documents/Lumiane";
const children = [];
const pnpm = "/opt/homebrew/bin/pnpm";

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

async function waitForPort(port, label) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    if (await portIsOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not start.`);
}

async function ensureGameIsRunning() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql:///luminae";

  if (!(await portIsOpen(8080))) {
    start(pnpm, ["--filter", "@workspace/api-server", "run", "dev"], {
      PORT: "8080",
      DATABASE_URL: databaseUrl,
    });
    await waitForPort(8080, "Luminae game server");
  }

  if (!(await portIsOpen(5173))) {
    start(pnpm, ["--filter", "@workspace/luminae", "run", "dev"], { PORT: "5173" });
    await waitForPort(5173, "Luminae game screen");
  }
}

app.whenReady().then(async () => {
  try {
    await ensureGameIsRunning();
    const window = new BrowserWindow({
      width: 1440,
      height: 940,
      minWidth: 980,
      minHeight: 720,
      title: "Luminae",
      backgroundColor: "#0a0c14",
      autoHideMenuBar: true,
    });
    // Use the numeric loopback host so an old localhost PWA cache cannot mask
    // the live game code inside the desktop shell.
    await window.loadURL("http://127.0.0.1:5173");
  } catch (error) {
    dialog.showErrorBox("Luminae could not start", error.message);
    app.quit();
  }
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => children.forEach((child) => child.kill()));
