import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import fs from "node:fs";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";
import { API_BUILD_LABEL } from "./lib/buildIdentity";
import { createFixedWindowRateLimit } from "./lib/rateLimit";
import { isRuntimeOriginAllowed } from "./lib/originPolicy";

const app: Express = express();
app.disable("x-powered-by");
app.disable("etag");
const trustProxyHops = Number(process.env["TRUST_PROXY_HOPS"] ?? (process.env["NODE_ENV"] === "production" ? "1" : "0"));
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  origin(origin, callback) {
    callback(null, isRuntimeOriginAllowed(origin));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
  maxAge: 600,
}));
app.use((_req, res, next) => {
  res.setHeader("X-Luminae-Api-Build", API_BUILD_LABEL);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  const connectSources = process.env["NODE_ENV"] === "production"
    ? "'self'"
    : "'self' ws://localhost:* ws://127.0.0.1:*";
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' blob:; connect-src ${connectSources}`,
  );
  if (process.env["NODE_ENV"] === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

const loginLimiter = createFixedWindowRateLimit({ limit: 12, windowMs: 15 * 60 * 1000 });
const accountCreationLimiter = createFixedWindowRateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });
const passwordRecoveryLimiter = createFixedWindowRateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });
const firstPartyEventLimiter = createFixedWindowRateLimit({ limit: 120, windowMs: 15 * 60 * 1000 });
const roomCreationLimiter = createFixedWindowRateLimit({ limit: 20, windowMs: 60 * 60 * 1000 });
const roomJoinLimiter = createFixedWindowRateLimit({ limit: 60, windowMs: 15 * 60 * 1000 });
const socialWriteLimiter = createFixedWindowRateLimit({ limit: 30, windowMs: 60 * 60 * 1000 });
app.post("/api/auth/login", loginLimiter);
app.post("/api/auth/register", accountCreationLimiter);
app.post("/api/auth/forgot-password", passwordRecoveryLimiter);
app.post("/api/auth/reset-password", passwordRecoveryLimiter);
app.post("/api/events/first-party", firstPartyEventLimiter);
app.post("/api/rooms", roomCreationLimiter);
app.post("/api/rooms/:roomId/join", roomJoinLimiter);
app.post("/api/rooms/:roomId/rejoin", roomJoinLimiter);
app.post("/api/challenges", socialWriteLimiter);
app.post("/api/friends/requests", socialWriteLimiter);

app.use("/api", router);

const webDistDir = path.resolve(
  process.env["LUMINAE_WEB_DIST"] ?? path.join(process.cwd(), "..", "luminae", "dist", "public"),
);
const webIndexPath = path.join(webDistDir, "index.html");

if (fs.existsSync(webIndexPath)) {
  app.use(
    express.static(webDistDir, {
      index: false,
      immutable: true,
      maxAge: "1y",
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html") || filePath.endsWith("manifest.webmanifest")) {
          res.setHeader("Cache-Control", "no-store");
        }
      },
    }),
  );

  app.get(/^(?!\/api(?:\/|$)|\/ws(?:\/|$)).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(webIndexPath);
  });
} else if (process.env["NODE_ENV"] === "production") {
  logger.warn({ webDistDir }, "Luminae web build not found; serving API only");
}

export default app;
