import { apiUrl } from "@/lib/network";

export type TelemetryEventName =
  | "app_started"
  | "client_error"
  | "long_frame"
  | "ws_disconnect"
  | "ws_reconnect"
  | "progression_step"
  | "chronicle_closed"
  | "lumii_outcome"
  | "purchase_started"
  | "purchase_pending"
  | "purchase_completed"
  | "purchase_failed"
  | "tutorial_discovery"
  | "tutorial_reward_claimed"
  | "transmission_fault_presented";

type Detail = Record<string, string | number | boolean | null>;
interface QueuedEvent {
  sessionId: string;
  eventName: TelemetryEventName;
  platform: "web" | "android_play" | "android_galaxy" | "mac";
  clientBuild: string;
  detail: Detail;
  occurredAt: string;
}

const enabled = import.meta.env.PROD && import.meta.env.VITE_LUMINAE_TELEMETRY !== "off";
const sessionId = (() => {
  const existing = sessionStorage.getItem("luminae_telemetry_session");
  if (existing) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem("luminae_telemetry_session", next);
  return next;
})();
let platform: QueuedEvent["platform"] = new URLSearchParams(location.search).has("desktop")
  ? "mac"
  : window.Capacitor
    ? "android_play"
    : "web";
const queue: QueuedEvent[] = [];
let flushTimer: number | null = null;

function scrub(value: string): string {
  return value
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[id]")
    .slice(0, 200);
}

function authToken(): string | null {
  try {
    const raw = localStorage.getItem("luminae_account_session");
    return raw ? (JSON.parse(raw) as { token?: string }).token ?? null : null;
  } catch {
    return null;
  }
}

async function flush(): Promise<void> {
  flushTimer = null;
  if (!enabled || queue.length === 0) return;
  const events = queue.splice(0, 20);
  const token = authToken();
  try {
    await fetch(apiUrl("/telemetry/events"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Operational telemetry must never interfere with play.
  }
}

export function recordTelemetry(eventName: TelemetryEventName, detail: Detail = {}): void {
  if (!enabled) return;
  queue.push({
    sessionId,
    eventName,
    platform,
    clientBuild: __LUMINAE_BUILD_LABEL__,
    detail: Object.fromEntries(Object.entries(detail).map(([key, value]) => [
      key.slice(0, 64),
      typeof value === "string" ? scrub(value) : value,
    ])),
    occurredAt: new Date().toISOString(),
  });
  if (queue.length >= 10) void flush();
  else if (flushTimer === null) flushTimer = window.setTimeout(() => void flush(), 10_000);
}

export function recordProgressionOnce(step: string, detail: Detail = {}): void {
  if (!enabled) return;
  const key = `luminae_telemetry_progress:${step}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Storage can be unavailable; emitting a duplicate is preferable to affecting play.
  }
  recordTelemetry("progression_step", { step, ...detail });
}

export function installOperationalTelemetry(): void {
  if (!enabled) return;
  const nativeBilling = window.Capacitor?.Plugins?.LuminaeBilling as { getProvider?: () => Promise<{ provider: string }> } | undefined;
  void nativeBilling?.getProvider?.().then(({ provider }) => {
    platform = provider === "samsung_iap" ? "android_galaxy" : "android_play";
  }).catch(() => undefined);
  recordTelemetry("app_started");
  window.addEventListener("error", (event) => {
    recordTelemetry("client_error", { message: event.message || "window_error" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    recordTelemetry("client_error", {
      message: event.reason instanceof Error ? event.reason.message : "unhandled_rejection",
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });

  let previous = performance.now();
  let lastReportedAt = 0;
  const frame = (now: number) => {
    const gap = now - previous;
    previous = now;
    if (document.visibilityState === "visible" && gap > 250 && now - lastReportedAt > 60_000) {
      lastReportedAt = now;
      recordTelemetry("long_frame", { durationMs: Math.round(gap) });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
