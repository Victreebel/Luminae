import type { NextFunction, Request, Response } from "express";
import type { CorsOptions } from "cors";

function configuredOrigins(): Set<string> {
  const raw = process.env.LUMINAE_ALLOWED_ORIGINS;
  if (raw) return new Set(raw.split(",").map((value) => value.trim()).filter(Boolean));
  if (process.env.NODE_ENV === "production") {
    throw new Error("LUMINAE_ALLOWED_ORIGINS is required in production");
  }
  return new Set([
    "http://localhost:5173",
    "http://localhost:5191",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5191",
    "https://localhost",
  ]);
}

const allowedOrigins = configuredOrigins();

export const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) callback(null, true);
    else callback(new Error("Origin is not permitted"));
  },
  methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Account-Token", "X-Request-ID"],
};

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
      "script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; " +
      "media-src 'self' blob:; connect-src 'self' https: wss:; worker-src 'self' blob:",
    );
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

interface RateEntry { count: number; resetAt: number }
const rateEntries = new Map<string, RateEntry>();

export function rateLimit(options: { windowMs: number; max: number; scope: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const identity = req.account?.id ?? req.ip ?? "unknown";
    const key = `${options.scope}:${identity}`;
    const current = rateEntries.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;
    entry.count += 1;
    rateEntries.set(key, entry);
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - entry.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count > options.max) {
      res.status(429).json({ error: "Too many requests. Try again shortly." });
      return;
    }
    next();
  };
}
