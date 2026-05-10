import type { Account } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      account?: Account;
      accountSessionId?: string;
    }
  }
}
