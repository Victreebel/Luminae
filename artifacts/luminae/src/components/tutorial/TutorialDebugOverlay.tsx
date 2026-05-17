/**
 * TutorialDebugOverlay — DEV ONLY
 *
 * This file must ONLY be imported inside an `import.meta.env.DEV` guard.
 * TutorialDirector.tsx enforces this — do not add a top-level static import elsewhere.
 *
 * Shows live beat state, camera focus, Lumii positioning, animation state,
 * known bugs at the current beat, and localStorage controls for QA/debugging.
 */
import { useState, type Dispatch, type CSSProperties } from "react";
import { TUTORIAL_BEATS, BEAT_INDEX } from "@/lib/tutorialData";
import type { TutState, TAction } from "@/lib/tutorialReducer";
import { clearTutorialProgress, clearIntroSeen } from "@/lib/tutorialProgress";

// ─── cameraFocus mirror (must stay in sync with GameplayPhase) ────────────────
// This replicates the `cameraFocus` IIFE from GameplayPhase so the overlay can
// display the derived camera target without needing a prop drilled from inside
// the child component.
function deriveCameraFocus(
  beatId: string,
  subStep: number,
): "market" | "well" | "storage" | "forge" | "tier1" | "cinematic" {
  if (beatId === "b6b_root_lattice" || beatId === "b7_artifact_cost" || beatId === "b7b_cost_bridge")
    return "tier1";
  if (beatId === "b8_first_harness") return "well";
  if (beatId === "b11_forge_reserved" && subStep === 0) return "tier1";
  if (beatId === "b12_tier2" && subStep === 1) return "well";
  if (beatId === "b16_final_forge" && subStep === 0) return "well";
  if (beatId === "b9b_forge_complete" || beatId === "b9c_transition" || beatId === "b14_win_condition")
    return "storage";
  if (beatId === "b10_reserve" || beatId === "b10b_reserve_granted") return "forge";
  return "market";
}

// ─── Known bug annotations keyed by beat id ──────────────────────────────────
const BEAT_BUGS: Record<string, string[]> = {
  "b6_forge_appears":      ["BUG-02: CardFlipReveal mounts with shouldAnimate=false → phase=done (flip dead from this moment)"],
  "b6b_root_lattice":      ["BUG-02: shouldAnimate=true but useEffect([],…) already fired on b6 — flip still dead"],
  "b9b_forge_complete":    ["BUG-01: camera='storage' has no scroll handler → scrolls to market top", "BUG-11: isForgeHighlighted persists after forge"],
  "b9c_transition":        ["BUG-01: camera='storage' has no scroll handler → scrolls to market top"],
  "b10_reserve":           ["BUG-08: no card highlighted at subStep=0 — 'reserve this one' has no visual referent"],
  "b10b_reserve_granted":  ["BUG-05: PlayerHand highlighted but off-screen (camera=forge shows market top)"],
  "b11_forge_reserved":    ["BUG-06: camera=tier1 shows two ghost slots at subStep=0; PlayerHand off-screen"],
  "b12_tier2":             ["BUG-03 P1 SOFT-LOCK: view='needed' arrives from b11; subStep=0 requires re-clicking already-active Needed tab"],
  "b14_win_condition":     ["BUG-01: camera='storage' scrolls to top (Eminence ok — pinned panel — but storage section missed)"],
};

// ─── Soft-lock runtime detection ──────────────────────────────────────────────
function detectRuntimeWarnings(s: TutState, beatId: string): string[] {
  const warns: string[] = [];
  if (beatId === "b12_tier2" && s.subStep === 0 && s.view === "needed") {
    warns.push("LIVE SOFT-LOCK: view is already 'needed' — player cannot advance without re-clicking active tab");
  }
  if ((beatId === "b9b_forge_complete" || beatId === "b9c_transition") && s.forged.length === 0) {
    warns.push("No forged cards: PlayerStorage not rendered (hidden by conditional)");
  }
  return warns;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  panel: {
    position: "fixed",
    bottom: 8,
    left: 8,
    zIndex: 9999,
    background: "rgba(6,8,20,0.94)",
    border: "1px solid rgba(100,160,255,0.32)",
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#b8d0f0",
    pointerEvents: "all",
    maxWidth: 300,
    minWidth: 210,
    boxShadow: "0 4px 20px rgba(0,0,0,0.75)",
  } satisfies CSSProperties,

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 9px",
    cursor: "pointer",
    userSelect: "none",
    gap: 6,
  } satisfies CSSProperties,

  body: {
    padding: "6px 10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } satisfies CSSProperties,

  sep: {
    borderTop: "1px solid rgba(100,160,255,0.13)",
    margin: "3px 0",
  } satisfies CSSProperties,

  sectionLabel: {
    fontSize: 9,
    letterSpacing: "0.1em",
    color: "#3a5888",
    textTransform: "uppercase" as const,
    marginBottom: 1,
  } satisfies CSSProperties,

  row: {
    display: "flex",
    gap: 5,
    alignItems: "flex-start",
    lineHeight: 1.45,
  } satisfies CSSProperties,

  label: {
    color: "#4a6a9a",
    whiteSpace: "nowrap",
    flexShrink: 0,
    minWidth: 88,
  } satisfies CSSProperties,

  val: {
    color: "#dde8f8",
    wordBreak: "break-all",
  } satisfies CSSProperties,

  warn: {
    color: "#f87171",
    wordBreak: "break-all",
    lineHeight: 1.45,
  } satisfies CSSProperties,

  dim: {
    color: "#4a6a9a",
    wordBreak: "break-all",
  } satisfies CSSProperties,

  btn: {
    background: "#0e1a2a",
    border: "1px solid rgba(100,160,255,0.28)",
    borderRadius: 4,
    color: "#78a8e0",
    fontSize: 10,
    padding: "3px 8px",
    cursor: "pointer",
    fontFamily: "monospace",
    lineHeight: 1.4,
  } satisfies CSSProperties,

  btnReset: {
    background: "#1a0a0a",
    border: "1px solid rgba(248,113,113,0.32)",
    borderRadius: 4,
    color: "#f87171",
    fontSize: 10,
    padding: "3px 8px",
    cursor: "pointer",
    fontFamily: "monospace",
    lineHeight: 1.4,
  } satisfies CSSProperties,
};

// ─── Component ────────────────────────────────────────────────────────────────
export function TutorialDebugOverlay({ s }: { s: TutState; dispatch: Dispatch<TAction> }) {
  const [open, setOpen] = useState(true);
  const [storageSnap, setStorageSnap] = useState<Record<string, string | null> | null>(null);

  const beat = TUTORIAL_BEATS[s.beat];
  if (!beat) return null;

  const beatId = beat.id;
  const subStep = s.subStep;
  const isCinematic = s.beat <= 9;

  const cameraFocus = isCinematic ? "cinematic" : deriveCameraFocus(beatId, subStep);
  const cameraWarn = cameraFocus === "storage";

  // Completion string
  const completionStr =
    beat.completion.type === "action"
      ? `action → ${beat.completion.action}`
      : beat.completion.type === "auto"
        ? `auto (${beat.completion.ms} ms)`
        : beat.completion.type;

  // Expected player action
  const expectedAction = (() => {
    if (beat.mode === "look" || beat.mode === "listen") return `none — ${beat.mode} mode`;
    if (beat.mode === "cinematic") return "wait for animation";
    if (beat.completion.type === "dialogue") return "tap dialogue to advance";
    if (beat.completion.type === "action") return beat.completion.action;
    if (beat.completion.type === "animation") return "wait for animation";
    if (beat.completion.type === "auto") return `auto-advance (${beat.completion.ms} ms)`;
    return "—";
  })();

  // Primary highlight target
  const primaryHighlight =
    beat.foregroundCardId && beat.highlightZone
      ? `${beat.foregroundCardId} + zone:${beat.highlightZone}`
      : beat.foregroundCardId
        ? `foregroundCard: ${beat.foregroundCardId}`
        : beat.highlightZone
          ? `zone: ${beat.highlightZone}`
          : "none";

  // animTrigger summary
  const animStr = s.animTrigger
    ? s.animTrigger.type === "forge"
      ? `forge: ${s.animTrigger.cardId} (+${s.animTrigger.lumens} eminence)`
      : `harvest: [${(s.animTrigger as Extract<typeof s.animTrigger, { type: "harvest" }>).gems.join(", ")}]`
    : "none";

  // CardFlipReveal inferred phase
  const cardFlipStr = (() => {
    const b6Idx = BEAT_INDEX["b6_forge_appears"] ?? 10;
    const b6bIdx = BEAT_INDEX["b6b_root_lattice"] ?? 11;
    if (s.beat < b6Idx) return "pre-mount";
    if (s.beat === b6Idx) return "⚠ mounted with shouldAnimate=false → phase='done' (flip dead)";
    if (s.beat === b6bIdx) return "⚠ shouldAnimate=true but effect won't re-run (BUG-02) → still dead";
    if (s.beat > b6bIdx) return "post-flip range (irrelevant)";
    return "—";
  })();
  const cardFlipWarn = s.beat >= (BEAT_INDEX["b6_forge_appears"] ?? 10) && s.beat <= (BEAT_INDEX["b6b_root_lattice"] ?? 11);

  // Game state summary
  const crystalEntries = Object.entries(s.crystals).filter(([, v]) => v > 0);
  const bonusEntries = Object.entries(s.bonuses).filter(([, v]) => v > 0);
  const crystalStr = crystalEntries.length ? crystalEntries.map(([k, v]) => `${k}:${v}`).join(" ") : "none";
  const bonusStr = bonusEntries.length ? bonusEntries.map(([k, v]) => `${k}:${v}`).join(" ") : "none";

  // Known bugs + runtime warnings
  const knownBugs = BEAT_BUGS[beatId] ?? [];
  const runtimeWarns = detectRuntimeWarnings(s, beatId);

  function readStorage() {
    const keys = [
      "luminae_tutorial_progress",
      "luminae_tutorial_progress_id",
      "luminae_tutorial_seen",
      "luminae_tutorial_completed",
      "luminae_intro_seen_beat",
    ];
    const snap: Record<string, string | null> = {};
    for (const k of keys) {
      try { snap[k] = localStorage.getItem(k); } catch { snap[k] = "(error)"; }
    }
    setStorageSnap(snap);
  }

  function clearAll() {
    clearTutorialProgress();
    clearIntroSeen();
    try {
      localStorage.removeItem("luminae_tutorial_seen");
      localStorage.removeItem("luminae_tutorial_completed");
    } catch { /* ignore */ }
    readStorage();
  }

  function Row({ label, value, warn = false, dim = false }: { label: string; value: string; warn?: boolean; dim?: boolean }) {
    return (
      <div style={S.row}>
        <span style={S.label}>{label}</span>
        <span style={warn ? S.warn : dim ? S.dim : S.val}>{value}</span>
      </div>
    );
  }

  const beatLabel = isCinematic ? "CINEMATIC" : "GAMEPLAY";

  return (
    <div style={S.panel}>
      {/* Header — click to toggle */}
      <div style={{ ...S.header, borderBottom: open ? "1px solid rgba(100,160,255,0.15)" : "none" }} onClick={() => setOpen(o => !o)}>
        <span style={{ color: "#4488cc", fontSize: 10, letterSpacing: "0.08em" }}>
          ◈ TUT DEBUG &nbsp;
          <span style={{ color: "#2a4a7a" }}>{beatId}</span>
        </span>
        <span style={{ color: "#2a4a7a", fontSize: 13, lineHeight: 1 }}>{open ? "▾" : "▸"}</span>
      </div>

      {open && (
        <div style={S.body}>

          {/* ── BEAT ──────────────────────────────────────────────────── */}
          <div style={S.sectionLabel}>BEAT · {beatLabel}</div>
          <Row label="beat id" value={beatId} />
          <Row label="index" value={`${s.beat + 1} / ${TUTORIAL_BEATS.length}  (raw: ${s.beat})`} />
          <Row label="mode" value={beat.mode} />
          <Row label="subStep" value={String(subStep)} dim={subStep === 0} />
          <Row label="view" value={s.view} />

          <div style={S.sep} />

          {/* ── DIALOGUE ──────────────────────────────────────────────── */}
          <div style={S.sectionLabel}>DIALOGUE</div>
          <Row label="dlg line" value={`${s.dlgLine + 1} / ${beat.dialogue.length}`} />
          <Row label="completion" value={completionStr} />
          <Row label="expectedAction" value={expectedAction} />
          {beat.wrongClickNudge && (
            <Row label="wrongClickNudge" value={beat.wrongClickNudge} dim />
          )}

          <div style={S.sep} />

          {/* ── CAMERA / LUMII ──────────────────────────────────────── */}
          <div style={S.sectionLabel}>CAMERA / LUMII</div>
          <Row label="cameraFocus" value={cameraFocus} warn={cameraWarn} />
          {cameraWarn && (
            <div style={{ ...S.warn, fontSize: 10, paddingLeft: 8 }}>
              BUG-01: no scroll handler for 'storage' — scrolls to market top instead
            </div>
          )}
          <Row label="lumiiZone" value={beat.lumiiZone} />
          {beat.lumiiPointer && <Row label="lumiiPointer" value={beat.lumiiPointer} />}
          <Row label="highlightZone" value={beat.highlightZone ?? "none"} dim={!beat.highlightZone} />
          <Row label="foregroundCard" value={beat.foregroundCardId ?? "none"} dim={!beat.foregroundCardId} />
          <Row label="primaryHighlight" value={primaryHighlight} dim={primaryHighlight === "none"} />
          <Row label="lockout" value={beat.mode === "look" || beat.mode === "listen" ? `locked (${beat.mode})` : "interactive"} />

          <div style={S.sep} />

          {/* ── ANIMATION STATE ─────────────────────────────────────── */}
          <div style={S.sectionLabel}>ANIMATION STATE</div>
          <Row label="animTrigger" value={animStr} dim={animStr === "none"} />
          <Row label="cardFlipReveal" value={cardFlipStr} warn={cardFlipWarn} />

          <div style={S.sep} />

          {/* ── GAME STATE ──────────────────────────────────────────── */}
          <div style={S.sectionLabel}>GAME STATE</div>
          <Row label="crystals" value={crystalStr} dim={crystalStr === "none"} />
          <Row label="bonuses" value={bonusStr} dim={bonusStr === "none"} />
          <Row label="forged" value={s.forged.length ? s.forged.join(", ") : "none"} dim={!s.forged.length} />
          <Row label="reserved" value={s.reserved.length ? s.reserved.join(", ") : "none"} dim={!s.reserved.length} />
          <Row label="eminence" value={String(s.eminence)} dim={s.eminence === 0} />
          <Row label="wellSel" value={(() => {
            const entries = Object.entries(s.wellSel).filter(([, v]) => (v ?? 0) > 0);
            return entries.length ? entries.map(([k, v]) => `${k}:${v}`).join(" ") : "none";
          })()} dim />

          {/* ── KNOWN BUGS ──────────────────────────────────────────── */}
          {(knownBugs.length > 0 || runtimeWarns.length > 0) && (
            <>
              <div style={S.sep} />
              <div style={{ ...S.sectionLabel, color: "#7a2a2a" }}>KNOWN BUGS AT THIS BEAT</div>
              {knownBugs.map(bug => (
                <div key={bug} style={{ ...S.warn, fontSize: 10, lineHeight: 1.5 }}>⚠ {bug}</div>
              ))}
              {runtimeWarns.map(w => (
                <div key={w} style={{ color: "#fbbf24", fontSize: 10, lineHeight: 1.5, wordBreak: "break-all" }}>🔴 {w}</div>
              ))}
            </>
          )}

          <div style={S.sep} />

          {/* ── LOCALSTORAGE ──────────────────────────────────────────── */}
          <div style={S.sectionLabel}>LOCALSTORAGE</div>
          <div style={{ display: "flex", gap: 5 }}>
            <button style={S.btn} onClick={readStorage}>Read Storage</button>
            <button style={S.btnReset} onClick={clearAll} title="Clears progress, seen, completed, intro_seen">Reset All Progress</button>
          </div>
          {storageSnap !== null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
              {Object.entries(storageSnap).map(([k, v]) => {
                const shortKey = k.replace("luminae_tutorial_", "t:").replace("luminae_", "");
                return (
                  <div key={k} style={{ ...S.row, fontSize: 10 }}>
                    <span style={{ ...S.label, minWidth: 78, fontSize: 10, color: "#3a5878" }}>{shortKey}</span>
                    <span style={{ fontSize: 10, color: v === null ? "#2a4a6a" : "#90c0f0", wordBreak: "break-all" }}>
                      {v === null ? "(null)" : v}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
