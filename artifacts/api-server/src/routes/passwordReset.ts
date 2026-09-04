import { Router, type IRouter } from "express";
import { eq, and, gt, lt, isNull, or, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { accountsTable, accountSessionsTable, passwordResetTokensTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { sendPasswordResetEmail } from "../lib/email";
import { rateLimit } from "../lib/httpSecurity";

const router: IRouter = Router();

const SALT_ROUNDS = 10;
const RESET_TOKEN_HOURS = 1;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function resetTokenExpiry(): Date {
  const d = new Date();
  d.setHours(d.getHours() + RESET_TOKEN_HOURS);
  return d;
}

const ForgotPasswordBody = z.object({
  email: z.string().email(),
});

const ResetPasswordBody = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

// POST /api/auth/forgot-password
router.post("/auth/forgot-password", rateLimit({ scope: "forgot-password", max: 5, windowMs: 60 * 60_000 }), async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }

  const { email } = parsed.data;

  const [account] = await db
    .select({ id: accountsTable.id, email: accountsTable.email })
    .from(accountsTable)
    .where(eq(accountsTable.email, email))
    .limit(1);

  // Always respond with the same message to prevent email enumeration
  const okResponse = {
    ok: true,
    message: "If that email is registered, a reset link has been sent.",
  };

  // Delete tokens that expired or were used more than 24 hours ago.
  // Runs on every request (before the account check) so cleanup happens
  // regardless of whether the email is registered, maximising cadence.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db
    .delete(passwordResetTokensTable)
    .where(
      or(
        lt(passwordResetTokensTable.expiresAt, cutoff),
        and(
          isNotNull(passwordResetTokensTable.usedAt),
          lt(passwordResetTokensTable.usedAt, cutoff),
        ),
      ),
    );

  if (!account) {
    res.json(okResponse);
    return;
  }

  const token = generateToken();
  const expiresAt = resetTokenExpiry();

  await db.insert(passwordResetTokensTable).values({
    accountId: account.id,
    token,
    expiresAt,
  });

  // Build the reset URL using the public domain
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",").filter(Boolean);
  const domain = domains[0] ?? "localhost:80";
  const resetUrl = `https://${domain}/reset-password?token=${token}`;

  req.log.info({ accountId: account.id }, "Password reset token created");

  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (err) {
    req.log.error({ err }, "Failed to send password reset email");
  }

  res.json(okResponse);
});

// POST /api/auth/reset-password
router.post("/auth/reset-password", rateLimit({ scope: "reset-password", max: 8, windowMs: 60 * 60_000 }), async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { token, newPassword } = parsed.data;
  const now = new Date();
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Hash the password before entering the transaction to keep the critical section short.
  // Atomically claim the token with a conditional UPDATE that enforces "unused + not expired"
  // in a single round-trip — prevents two concurrent requests from both succeeding.
  let accountId: string | null = null;

  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(passwordResetTokensTable)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokensTable.token, token),
          gt(passwordResetTokensTable.expiresAt, now),
          isNull(passwordResetTokensTable.usedAt),
        ),
      )
      .returning({ accountId: passwordResetTokensTable.accountId });

    if (claimed.length === 0) {
      return; // token invalid, expired, or already used
    }

    accountId = claimed[0]!.accountId;

    await tx
      .update(accountsTable)
      .set({ passwordHash: newHash })
      .where(eq(accountsTable.id, accountId));

    await tx
      .delete(accountSessionsTable)
      .where(eq(accountSessionsTable.accountId, accountId));
  });

  if (!accountId) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    return;
  }

  req.log.info({ accountId }, "Password reset completed; sessions invalidated");

  res.json({ ok: true });
});

export default router;
