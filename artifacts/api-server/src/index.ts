import { createServer } from "http";
import app from "./app";
import { setupWebSocket } from "./lib/websocket";
import { logger } from "./lib/logger";
import { recoverStuckAiRooms } from "./lib/aiTurnRunner";
import { startFirstPartyEventRetention } from "./lib/firstPartyEventRetention";
import { assertDatabaseReady } from "./lib/databaseReadiness";
import type { WebSocketServer } from "ws";

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
const SHUTDOWN_GRACE_MS = 10_000;
let attempt = 0;
let startupRetryTimer: NodeJS.Timeout | null = null;
let websocketServer: WebSocketServer | null = null;
let stopFirstPartyEventRetention: (() => void) | null = null;
let shutdownStarted = false;

function finishProcess(exitCode: number): void {
  process.exit(exitCode);
}

function shutdown(reason: string, exitCode: number): void {
  if (shutdownStarted) {
    if (exitCode !== 0) process.exitCode = exitCode;
    return;
  }
  shutdownStarted = true;
  process.exitCode = exitCode;
  logger.info({ reason, exitCode }, "Server shutdown started");

  if (startupRetryTimer) {
    clearTimeout(startupRetryTimer);
    startupRetryTimer = null;
  }
  stopFirstPartyEventRetention?.();
  stopFirstPartyEventRetention = null;

  if (websocketServer) {
    for (const client of websocketServer.clients) {
      client.close(1001, "Server restarting");
    }
    websocketServer.close();
    websocketServer = null;
  }

  const forceTimer = setTimeout(() => {
    logger.fatal({ reason }, "Server shutdown exceeded grace period");
    finishProcess(exitCode || 1);
  }, SHUTDOWN_GRACE_MS);
  forceTimer.unref();

  if (!server.listening) {
    clearTimeout(forceTimer);
    finishProcess(exitCode);
    return;
  }

  server.close((error) => {
    clearTimeout(forceTimer);
    if (error) {
      logger.error({ error, reason }, "HTTP server shutdown failed");
      finishProcess(1);
      return;
    }
    logger.info({ reason }, "Server shutdown complete");
    finishProcess(exitCode);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM", 0));
process.on("SIGINT", () => shutdown("SIGINT", 0));
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  shutdown("uncaughtException", 1);
});

function tryListen() {
  if (shutdownStarted) return;
  attempt++;
  server.listen(port);
}

server.on("listening", () => {
  websocketServer = setupWebSocket(server);
  logger.info({ port }, "Server listening");
  stopFirstPartyEventRetention = startFirstPartyEventRetention();
  // Resume any AI turns that were in-flight when the server last restarted.
  void recoverStuckAiRooms();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE" && attempt < MAX_RETRIES) {
    logger.warn({ port, attempt, maxRetries: MAX_RETRIES }, "Port in use, retrying...");
    startupRetryTimer = setTimeout(() => {
      startupRetryTimer = null;
      tryListen();
    }, RETRY_DELAY);
  } else {
    logger.fatal({ err, port }, "Failed to start server");
    shutdown("listenError", 1);
  }
});

async function startServer() {
  try {
    await assertDatabaseReady();
  } catch (err) {
    logger.fatal({ err }, "Database schema check failed; run the database migrations before starting the API");
    process.exitCode = 1;
    return;
  }
  tryListen();
}

void startServer();
