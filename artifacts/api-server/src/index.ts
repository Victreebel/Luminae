import { createServer } from "http";
import app from "./app";
import { setupWebSocket } from "./lib/websocket";
import { logger } from "./lib/logger";
import { recoverStuckAiRooms } from "./lib/aiTurnRunner";

// ── Global safety net ────────────────────────────────────────────────────────
// Catch any unhandled promise rejection or uncaught exception so a single
// rogue async path can't kill the whole process.
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — server kept alive");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server kept alive");
});
// ─────────────────────────────────────────────────────────────────────────────

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000;
let attempt = 0;

function tryListen() {
  attempt++;
  server.listen(port);
}

server.on("listening", () => {
  setupWebSocket(server);
  logger.info({ port }, "Server listening");
  // Resume any AI turns that were in-flight when the server last restarted.
  void recoverStuckAiRooms();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE" && attempt < MAX_RETRIES) {
    logger.warn({ port, attempt, maxRetries: MAX_RETRIES }, "Port in use, retrying...");
    server.close();
    setTimeout(tryListen, RETRY_DELAY);
  } else {
    logger.fatal({ err, port }, "Failed to start server");
    process.exit(1);
  }
});

tryListen();
