import { useEffect } from "react";
import {
  outOfGameAudio,
  type OutOfGameAmbientMood,
  type OutOfGameSoundCue,
} from "@/lib/outOfGameAudio";

const INTERACTIVE_SELECTOR = [
  "[data-oom-sound]",
  "button",
  "a[href]",
  "[role='button']",
  "[role='menuitem']",
  "[role='tab']",
].join(",");

const OUT_OF_GAME_CUES = new Set<OutOfGameSoundCue>([
  "control",
  "navigate",
  "primary",
  "open",
  "close",
  "archive",
  "store",
  "settings",
  "confirm",
  "vault",
]);

function explicitCue(element: Element): OutOfGameSoundCue | null | undefined {
  const value = element.getAttribute("data-oom-sound");
  if (value === null) return undefined;
  if (value === "none") return null;
  return OUT_OF_GAME_CUES.has(value as OutOfGameSoundCue)
    ? value as OutOfGameSoundCue
    : undefined;
}

export function resolveOutOfMatchSound(target: EventTarget | null): OutOfGameSoundCue | null {
  if (!(target instanceof Element)) return null;

  const control = target.closest<HTMLElement>(INTERACTIVE_SELECTOR);
  if (!control) return null;
  if (control.matches(":disabled") || control.getAttribute("aria-disabled") === "true") return null;

  const selectedCue = explicitCue(control);
  if (selectedCue !== undefined) return selectedCue;

  if (control.matches(".account-archive__back")) return "close";
  if (control.matches(".account-archive__door--vault")) return "vault";
  if (control.matches(".account-archive__door")) return "archive";
  if (control.matches(".account-vault__slots button, .account-vault__decryption-key-button")) return "confirm";
  if (control.matches(".account-vault__mode-switch button")) return "settings";
  if (control.matches(".oom-action-primary")) return "primary";

  const label = [
    control.getAttribute("aria-label"),
    control.getAttribute("title"),
    control.textContent,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();

  if (/\b(close|back|cancel|leave|sign out|decline|dismiss)\b/.test(label)) return "close";
  if (/\b(store|shop|lume|purchase)\b/.test(label)) return "store";
  if (/\b(settings|preferences|sound|audio|animations|hints|appearance)\b/.test(label)) return "settings";
  if (/\b(archive|artifacts|luminaries|match record|recorded knowledge)\b/.test(label)) return "archive";
  if (control.hasAttribute("aria-haspopup")) {
    return control.getAttribute("aria-expanded") === "true" ? "close" : "open";
  }
  if (
    control.matches(
      ".account-archive__door, .oom-wordmark-button, .oom-segmented button, [role='menuitem'], [role='tab']",
    )
  ) {
    return "navigate";
  }
  if (control.matches("a[href], .oom-action-secondary")) return "navigate";

  return "control";
}

export function useOutOfMatchSounds() {
  useEffect(() => {
    const playResolvedCue = (event: MouseEvent) => {
      const cue = resolveOutOfMatchSound(event.target);
      if (cue) outOfGameAudio.play(cue);
    };

    // Capture before navigation can unmount the current out-of-match page.
    document.addEventListener("click", playResolvedCue, true);
    return () => document.removeEventListener("click", playResolvedCue, true);
  }, []);
}

export function useOutOfMatchAmbience(mood: OutOfGameAmbientMood | null = "menu") {
  useEffect(() => {
    return () => {
      outOfGameAudio.stopOutOfMatchAmbient(0.55);
    };
  }, []);

  useEffect(() => {
    if (mood) {
      outOfGameAudio.startOutOfMatchAmbient(mood);
    } else {
      outOfGameAudio.stopOutOfMatchAmbient(0.35);
    }
  }, [mood]);
}
