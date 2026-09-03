import { createHash, randomBytes } from "node:crypto";

const ACCOUNT_SESSION_TOKEN_BYTES = 32;

export function generateAccountSessionToken(): string {
  return randomBytes(ACCOUNT_SESSION_TOKEN_BYTES).toString("hex");
}

export function hashAccountSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
