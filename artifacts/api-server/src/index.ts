import { createServer } from "http";
import app from "./app";
import { setupWebSocket } from "./lib/websocket";
import { logger } from "./lib/logger";

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
setupWebSocket(server);

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000;
let attempt = 0;

function tryListen() {
  attempt++;
  server.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE" && attempt < MAX_RETRIES) {
    logger.warn({ port, attempt, maxRetries: MAX_RETRIES }, "Port in use, retrying...");
    setTimeout(tryListen, RETRY_DELAY);
  } else {
    logger.fatal({ err, port }, "Failed to start server");
    process.exit(1);
  }
});

tryListen();
