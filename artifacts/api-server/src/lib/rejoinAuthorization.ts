export type RejoinAuthorization =
  | { allowed: true }
  | { allowed: false; status: 401 | 403; error: string };

export function authorizePlayerRejoin(input: {
  targetAccountId: string | null;
  targetSessionToken: string;
  requesterAccountId: string | null;
  providedSessionToken: string | undefined;
}): RejoinAuthorization {
  if (input.targetAccountId) {
    if (!input.requesterAccountId) {
      return { allowed: false, status: 401, error: "Sign in to recover this player seat" };
    }
    if (input.targetAccountId !== input.requesterAccountId) {
      return { allowed: false, status: 403, error: "This player seat belongs to another account" };
    }
    return { allowed: true };
  }

  if (!input.providedSessionToken || input.providedSessionToken !== input.targetSessionToken) {
    return {
      allowed: false,
      status: 403,
      error: "The original guest session is required to recover this seat",
    };
  }
  return { allowed: true };
}
