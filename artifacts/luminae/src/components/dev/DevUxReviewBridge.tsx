import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  appendUxReviewEvent,
  getUxReviewContext,
  getUxReviewRun,
  isUxReviewActive,
  writeUxReviewContext,
  type UxReviewContext,
} from "@/lib/uxReview";

const REVIEW_CONSOLE_ROUTE = "/dev/release-journey";

function readBoolean(key: string, truthy: string): boolean {
  try {
    return localStorage.getItem(key) === truthy;
  } catch {
    return false;
  }
}

function baseContext(route: string): UxReviewContext {
  return {
    capturedAt: new Date().toISOString(),
    buildLabel: __LUMINAE_BUILD_LABEL__,
    buildStamp: __LUMINAE_BUILD_STAMP__,
    url: window.location.href,
    route,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    online: navigator.onLine,
    visibility: document.visibilityState,
    preferences: {
      muted: readBoolean("luminae_muted", "true"),
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      skipCinematics: readBoolean("luminae_skip_cinematics", "1"),
      swiftEffects: readBoolean("luminae_abridged_anims", "1"),
      hints: !readBoolean("luminae_hints_enabled", "0"),
    },
    run: getUxReviewRun(),
    lastInteraction: getUxReviewContext()?.lastInteraction,
    performance: getUxReviewContext()?.performance,
  };
}

export default function DevUxReviewBridge() {
  const [location] = useLocation();
  const routeRef = useRef(location);
  routeRef.current = location;

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        window.open(REVIEW_CONSOLE_ROUTE, "luminae-ux-console");
        return;
      }
      if (event.key.toLowerCase() === "m" && isUxReviewActive() && !location.startsWith(REVIEW_CONSOLE_ROUTE)) {
        event.preventDefault();
        appendUxReviewEvent("mark", {
          route: routeRef.current,
          label: "Manual feedback mark",
        });
        writeUxReviewContext(baseContext(routeRef.current));
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [location]);

  useEffect(() => {
    if (!isUxReviewActive() || location.startsWith(REVIEW_CONSOLE_ROUTE)) return;

    writeUxReviewContext(baseContext(location));
    appendUxReviewEvent("navigation", { route: location });

    const updateContext = () => writeUxReviewContext(baseContext(routeRef.current));
    const handleOnline = () => {
      appendUxReviewEvent("network", { online: true });
      updateContext();
    };
    const handleOffline = () => {
      appendUxReviewEvent("network", { online: false });
      updateContext();
    };
    const handleVisibility = () => {
      appendUxReviewEvent("visibility", { state: document.visibilityState });
      updateContext();
    };
    const handleError = (event: ErrorEvent) => {
      appendUxReviewEvent("error", {
        message: event.message || "Unknown window error",
        source: event.filename || null,
        line: event.lineno || null,
      });
      updateContext();
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      appendUxReviewEvent("rejection", {
        message: event.reason instanceof Error ? event.reason.message : String(event.reason),
      });
      updateContext();
    };
    const handleInteraction = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button,a,[role='button']") : null;
      if (!target) return;
      const label = target.getAttribute("aria-label") || target.getAttribute("title") ||
        target.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || null;
      const context = baseContext(routeRef.current);
      context.lastInteraction = {
        tag: target.tagName.toLowerCase(),
        label,
        at: new Date().toISOString(),
      };
      writeUxReviewContext(context);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("click", handleInteraction, true);
    window.addEventListener("resize", updateContext);

    let cancelled = false;
    const sampleFrames = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      const startedAt = performance.now();
      let previous = startedAt;
      let frames = 0;
      let worstFrameMs = 0;
      const sample = (now: number) => {
        if (cancelled) return;
        frames += 1;
        worstFrameMs = Math.max(worstFrameMs, now - previous);
        previous = now;
        if (now - startedAt < 1_000) {
          requestAnimationFrame(sample);
          return;
        }
        const context = baseContext(routeRef.current);
        context.performance = {
          sampledFps: Math.round((frames * 1_000) / (now - startedAt)),
          worstFrameMs: Math.round(worstFrameMs * 10) / 10,
          sampledAt: new Date().toISOString(),
        };
        writeUxReviewContext(context);
      };
      requestAnimationFrame(sample);
    };
    const performanceTimer = window.setInterval(sampleFrames, 10_000);
    const initialSample = window.setTimeout(sampleFrames, 1_500);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("click", handleInteraction, true);
      window.removeEventListener("resize", updateContext);
      window.clearInterval(performanceTimer);
      window.clearTimeout(initialSample);
    };
  }, [location]);

  return null;
}
