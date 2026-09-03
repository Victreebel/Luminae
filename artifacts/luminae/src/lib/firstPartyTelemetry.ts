import { getAccountToken } from "@/lib/accountSession";

export type FirstPartyEventName =
  | "tutorial_started"
  | "tutorial_resumed"
  | "tutorial_restarted"
  | "tutorial_left"
  | "tutorial_chapter_started"
  | "tutorial_chapter_completed"
  | "tutorial_invalid_action"
  | "tutorial_completed"
  | "account_prompt_outcome"
  | "guided_practice_started"
  | "qualification_milestone"
  | "interlude_acknowledged"
  | "vault_completed"
  | "turn_order_balance_viewed"
  | "match_balance_result";

type TutorialChapterId = "arrival" | "board" | "actions" | "ascension";
type EventActionId =
  | "harness"
  | "forge"
  | "encrypt"
  | "forge_reserved"
  | "forge_final"
  | "help"
  | "register"
  | "sign_in"
  | "dismiss"
  | "match_2p_v15"
  | "match_2p_v20"
  | "match_2p_v25"
  | "match_3p_v15"
  | "match_3p_v20"
  | "match_3p_v25"
  | "match_4p_v15"
  | "match_4p_v20"
  | "match_4p_v25";
type EventOutcome = "allowed" | "blocked" | "success" | "failure" | "accepted" | "dismissed" | "resume" | "start_over";

interface FirstPartyEventDimensions {
  eventName: FirstPartyEventName;
  chapterId?: TutorialChapterId;
  beatId?: string;
  actionId?: EventActionId;
  outcome?: EventOutcome;
  ordinal?: number;
  durationMs?: number;
}

const SESSION_KEY = "luminae_anonymous_event_session";
const TUTORIAL_STARTED_AT_KEY = "luminae_tutorial_started_at";
const sentDedupeKeys = new Set<string>();

function anonymousSessionId(): string {
  try {
    const current = sessionStorage.getItem(SESSION_KEY);
    if (current) return current;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function beginTutorialTelemetry(): void {
  try {
    if (!localStorage.getItem(TUTORIAL_STARTED_AT_KEY)) {
      localStorage.setItem(TUTORIAL_STARTED_AT_KEY, String(Date.now()));
    }
  } catch {
  }
}

export function finishTutorialTelemetry(): number | undefined {
  try {
    const raw = localStorage.getItem(TUTORIAL_STARTED_AT_KEY);
    localStorage.removeItem(TUTORIAL_STARTED_AT_KEY);
    if (!raw) return undefined;
    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt)) return undefined;
    return Math.max(0, Math.min(86_400_000, Date.now() - startedAt));
  } catch {
    return undefined;
  }
}

export function trackFirstPartyEvent(
  dimensions: FirstPartyEventDimensions,
  dedupeKey?: string,
): void {
  if (dedupeKey && sentDedupeKeys.has(dedupeKey)) return;
  if (dedupeKey) sentDedupeKeys.add(dedupeKey);
  const token = getAccountToken();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  void fetch(`${base}/api/events/first-party`, {
    method: "POST",
    headers,
    keepalive: true,
    body: JSON.stringify({
      id: crypto.randomUUID(),
      anonymousSessionId: token ? undefined : anonymousSessionId(),
      ...dimensions,
      occurredAt: new Date().toISOString(),
    }),
  }).catch(() => undefined);
}
