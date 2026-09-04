import type { AccountSession } from "@/lib/accountSession";
import { saveAccountSession } from "@/lib/accountSession";
import { apiUrl } from "@/lib/network";

export const UX_REVIEW_ACTIVE_KEY = "luminae_ux_review_active";
export const UX_REVIEW_RUN_KEY = "luminae_ux_review_run";
export const UX_REVIEW_CONTEXT_KEY = "luminae_ux_review_context";
export const UX_REVIEW_EVENTS_KEY = "luminae_ux_review_events";
export const UX_REVIEW_COVERAGE_KEY = "luminae_ux_review_coverage";

export const UX_REVIEW_CHECKPOINT_IDS = [
  "fresh",
  "post_tutorial",
  "trace_ready",
  "recurrence_ready",
  "triangulation_ready",
  "vault_ready",
  "vault_reveal",
  "vault_hub",
] as const;

export type UxReviewCheckpointId = (typeof UX_REVIEW_CHECKPOINT_IDS)[number];

export interface UxReviewRun {
  runId: string;
  mode: "signed_out" | "fresh" | "checkpoint";
  checkpointId: UxReviewCheckpointId | "signed_out";
  accountId: string | null;
  username: string | null;
  syntheticState: boolean;
  startedAt: string;
}

export interface UxReviewContext {
  capturedAt: string;
  buildLabel: string;
  buildStamp: string;
  url: string;
  route: string;
  viewport: { width: number; height: number; devicePixelRatio: number };
  online: boolean;
  visibility: DocumentVisibilityState;
  preferences: {
    muted: boolean;
    reducedMotion: boolean;
    skipCinematics: boolean;
    swiftEffects: boolean;
    hints: boolean;
  };
  run: UxReviewRun | null;
  lastInteraction?: {
    tag: string;
    label: string | null;
    at: string;
  };
  performance?: {
    sampledFps: number;
    worstFrameMs: number;
    sampledAt: string;
  };
}

export interface UxReviewEvent {
  id: string;
  at: string;
  type: "navigation" | "mark" | "error" | "rejection" | "network" | "visibility";
  detail: Record<string, string | number | boolean | null>;
}

export interface UxReviewSessionResponse {
  checkpointId: UxReviewCheckpointId;
  seeded: boolean;
  syntheticState: boolean;
  credentials: { username: string; password: string };
  session: AccountSession;
}

function parseStored<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function getUxReviewRun(): UxReviewRun | null {
  return parseStored<UxReviewRun>(UX_REVIEW_RUN_KEY);
}

export function getUxReviewContext(): UxReviewContext | null {
  return parseStored<UxReviewContext>(UX_REVIEW_CONTEXT_KEY);
}

export function getUxReviewEvents(): UxReviewEvent[] {
  return parseStored<UxReviewEvent[]>(UX_REVIEW_EVENTS_KEY) ?? [];
}

export function isUxReviewActive(): boolean {
  try {
    return localStorage.getItem(UX_REVIEW_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeUxReviewContext(context: UxReviewContext): void {
  try {
    localStorage.setItem(UX_REVIEW_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Review capture is optional and must never interrupt the player experience.
  }
}

export function appendUxReviewEvent(
  type: UxReviewEvent["type"],
  detail: UxReviewEvent["detail"],
): UxReviewEvent {
  const event: UxReviewEvent = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    at: new Date().toISOString(),
    type,
    detail,
  };
  try {
    const events = getUxReviewEvents();
    localStorage.setItem(UX_REVIEW_EVENTS_KEY, JSON.stringify([...events, event].slice(-80)));
  } catch {
    // Review capture is optional and bounded.
  }
  return event;
}

export function clearUxReviewCapture(): void {
  try {
    localStorage.removeItem(UX_REVIEW_CONTEXT_KEY);
    localStorage.removeItem(UX_REVIEW_EVENTS_KEY);
  } catch {
    // Ignore storage failures in development tooling.
  }
}

export function markUxReviewCoverage(stageId: string): void {
  try {
    const current = parseStored<string[]>(UX_REVIEW_COVERAGE_KEY) ?? [];
    if (!current.includes(stageId)) {
      localStorage.setItem(UX_REVIEW_COVERAGE_KEY, JSON.stringify([...current, stageId]));
    }
  } catch {
    // Coverage is a convenience, never a progression dependency.
  }
}

export function getUxReviewCoverage(): string[] {
  return parseStored<string[]>(UX_REVIEW_COVERAGE_KEY) ?? [];
}

function removeLuminaeKeys(storage: Storage, preserve: ReadonlySet<string>): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith("luminae_")));
  for (const key of keys) {
    if (!preserve.has(key)) storage.removeItem(key);
  }
}

export async function resetUxReviewClientState(): Promise<void> {
  const preserve = new Set([UX_REVIEW_COVERAGE_KEY]);
  removeLuminaeKeys(localStorage, preserve);
  removeLuminaeKeys(sessionStorage, new Set());

  if ("caches" in window) {
    const names = await caches.keys().catch(() => []);
    await Promise.all(names
      .filter((name) => name.toLowerCase().includes("luminae") || name.toLowerCase().includes("vite"))
      .map((name) => caches.delete(name)));
  }
}

export async function createUxReviewSession(
  checkpointId: UxReviewCheckpointId,
): Promise<UxReviewSessionResponse> {
  const response = await fetch(apiUrl("/dev/ux-review/sessions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Luminae-UX-Review": "1",
    },
    body: JSON.stringify({ checkpointId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "UX review checkpoint unavailable" }));
    throw new Error(body.error ?? "UX review checkpoint unavailable");
  }
  return response.json() as Promise<UxReviewSessionResponse>;
}

export async function beginSignedOutUxReview(): Promise<UxReviewRun> {
  await resetUxReviewClientState();
  const run: UxReviewRun = {
    runId: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now()),
    mode: "signed_out",
    checkpointId: "signed_out",
    accountId: null,
    username: null,
    syntheticState: false,
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(UX_REVIEW_ACTIVE_KEY, "1");
  localStorage.setItem(UX_REVIEW_RUN_KEY, JSON.stringify(run));
  window.dispatchEvent(new Event("luminae:account-session-changed"));
  return run;
}

export async function beginCheckpointUxReview(
  response: UxReviewSessionResponse,
): Promise<UxReviewRun> {
  await resetUxReviewClientState();
  saveAccountSession(response.session);
  const run: UxReviewRun = {
    runId: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now()),
    mode: response.checkpointId === "fresh" ? "fresh" : "checkpoint",
    checkpointId: response.checkpointId,
    accountId: response.session.account.id,
    username: response.session.account.username,
    syntheticState: response.syntheticState,
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(UX_REVIEW_ACTIVE_KEY, "1");
  localStorage.setItem(UX_REVIEW_RUN_KEY, JSON.stringify(run));
  window.dispatchEvent(new Event("luminae:account-session-changed"));
  return run;
}

export function openUxReviewPlayer(path: string): Window | null {
  const target = new URL(path, window.location.origin).toString();
  return window.open(target, "luminae-ux-player");
}

export function formatUxReviewFeedbackContext(
  context: UxReviewContext | null,
  events: readonly UxReviewEvent[],
): string {
  if (!context) return "LUMINAe UX feedback context: no player-tab capture is available yet.";
  const recent = events.slice(-8).map((event) =>
    `- ${event.at} | ${event.type} | ${JSON.stringify(event.detail)}`,
  );
  return [
    "LUMINAe UX feedback context",
    `Build: ${context.buildLabel}`,
    `Run: ${context.run?.checkpointId ?? "unknown"} (${context.run?.runId ?? "no run"})`,
    `Player URL: ${context.url}`,
    `Viewport: ${context.viewport.width}x${context.viewport.height} @ ${context.viewport.devicePixelRatio}x`,
    `Preferences: ${JSON.stringify(context.preferences)}`,
    context.lastInteraction
      ? `Last interaction: ${context.lastInteraction.tag} / ${context.lastInteraction.label ?? "unlabeled"}`
      : "Last interaction: unavailable",
    context.performance
      ? `Performance sample: ${context.performance.sampledFps} fps, worst frame ${context.performance.worstFrameMs} ms`
      : "Performance sample: pending",
    "Recent review events:",
    ...(recent.length > 0 ? recent : ["- none"]),
  ].join("\n");
}
