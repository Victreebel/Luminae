import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import fs from "node:fs";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";
import { API_BUILD_LABEL } from "./lib/buildIdentity";
import { corsOptions, securityHeaders } from "./lib/httpSecurity";

const app: Express = express();

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
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use((_req, res, next) => {
  res.setHeader("X-Luminae-Api-Build", API_BUILD_LABEL);
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

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
