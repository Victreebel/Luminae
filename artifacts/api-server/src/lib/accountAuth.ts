import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { accountSessionsTable, accountsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { touchPresence } from "./presence";
import { hashAccountSessionToken } from "./accountSessionTokens";

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  const xToken = req.headers["x-account-token"];
  if (typeof xToken === "string" && xToken) return xToken;
  // HttpOnly cookie fallback
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.["accountToken"];
  if (cookieToken) return cookieToken;
  return undefined;
}

async function resolveSession(token: string) {
  const now = new Date();
  const tokenHash = hashAccountSessionToken(token);
  const [row] = await db
    .select({
      session: accountSessionsTable,
      account: accountsTable,
    })
    .from(accountSessionsTable)
    .innerJoin(accountsTable, eq(accountSessionsTable.accountId, accountsTable.id))
    .where(
      and(
        eq(accountSessionsTable.token, tokenHash),
        gt(accountSessionsTable.expiresAt, now),
      ),
    )
    .limit(1);
  if (row) return row;

  // Transparently upgrade sessions issued before tokens were hashed at rest.
  const [legacyRow] = await db
    .select({
      session: accountSessionsTable,
      account: accountsTable,
    })
    .from(accountSessionsTable)
    .innerJoin(accountsTable, eq(accountSessionsTable.accountId, accountsTable.id))
    .where(
      and(
        eq(accountSessionsTable.token, token),
        gt(accountSessionsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!legacyRow) return null;

  await db
    .update(accountSessionsTable)
    .set({ token: tokenHash })
    .where(
      and(
        eq(accountSessionsTable.id, legacyRow.session.id),
        eq(accountSessionsTable.token, token),
      ),
    );

  return {
    ...legacyRow,
    session: { ...legacyRow.session, token: tokenHash },
  };
}

export async function accountAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: "Account authentication required" });
    return;
  }

  const row = await resolveSession(token);

  if (!row) {
    res.status(401).json({ error: "Invalid or expired account session" });
    return;
  }

  req.account = row.account;
  req.accountSessionId = row.session.id;
  touchPresence(row.account.id);
  next();
}

export async function optionalAccountAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);

  if (token) {
    const row = await resolveSession(token);
    if (row) {
      req.account = row.account;
      req.accountSessionId = row.session.id;
    }
  }
  next();
}

// Keep for backward compat with route files that import this type
export type { Request as AuthedRequest };
