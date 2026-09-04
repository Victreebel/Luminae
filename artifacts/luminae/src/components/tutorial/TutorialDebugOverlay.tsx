/**
 * TutorialDebugOverlay — DEV ONLY
 *
 * This file must ONLY be imported inside an `import.meta.env.DEV` guard.
 * TutorialDirector.tsx enforces this — do not add a top-level static import elsewhere.
 *
 * Shows live beat state, camera focus, Lumii positioning, animation state,
 * known bugs at the current beat, and localStorage controls for QA/debugging.
 * Each section is independently collapsible.
 */
import { useState, type Dispatch, type CSSProperties } from "react";
import { TUTORIAL_BEATS, BEAT_INDEX } from "@/lib/tutorialData";
import type { TutState, TAction } from "@/lib/tutorialReducer";
import { clearTutorialProgress, clearIntroSeen } from "@/lib/tutorialProgress";

// ─── cameraFocus mirror (must stay in sync with GameplayPhase) ────────────────
function deriveCameraFocus(
  beatId: string,
  subStep: number,
): "overview" | "well" | "storage" | "forge" | "tier1" | "cinematic" {
  if (beatId === "b6b_root_lattice" || beatId === "b7_artifact_cost" || beatId === "b7b_cost_bridge")
    return "tier1";
  if (beatId === "b8_first_harness") return "well";
  if (beatId === "b11_forge_reserved" && subStep === 0) return "tier1";
  if (beatId === "b12_tier2" && subStep === 1) return "well";
  if (beatId === "b16_final_forge" && subStep === 0) return "well";
  if (beatId === "b9b_forge_complete" || beatId === "b9c_transition" || beatId === "b14_win_condition")
    return "storage";
  if (beatId === "b10_reserve" || beatId === "b10b_reserve_granted") return "forge";
  return "overview";
}

// ─── Known bug annotations keyed by beat id ──────────────────────────────────
const BEAT_BUGS: Record<string, string[]> = {
  "b9b_forge_complete":   ["BUG-01: camera='storage' has no scroll handler → scrolls to board top", "BUG-11: isForgeHighlighted persists after forge"],
  "b9c_transition":       ["BUG-01: camera='storage' has no scroll handler → scrolls to board top"],
  "b10_reserve":          ["BUG-08: no Artifact highlighted at subStep=0 — 'reserve this one' has no visual referent"],
  "b10b_reserve_granted": ["BUG-05: PlayerHand highlighted but off-screen (camera=forge shows board top)"],
  "b11_forge_reserved":   ["BUG-06: camera=tier1 shows two ghost slots at subStep=0; PlayerHand off-screen"],
  "b12_tier2":            ["BUG-03 P1 SOFT-LOCK: view='needed' arrives from b11; subStep=0 requires re-clicking already-active Needed tab"],
  "b14_win_condition":    ["BUG-01: camera='storage' scrolls to top (Eminence ok — pinned panel — but storage section missed)"],
};

// ─── Soft-lock runtime detection ─────────────────────────────────────────────
function detectRuntimeWarnings(s: TutState, beatId: string): string[] {
  const warns: string[] = [];
  if (beatId === "b12_tier2" && s.subStep === 0 && s.view === "needed")
    warns.push("LIVE SOFT-LOCK: view is already 'needed' — player cannot advance without re-clicking active tab");
  if ((beatId === "b9b_forge_complete" || beatId === "b9c_transition") && s.forged.length === 0)
    warns.push("No forged Artifacts: PlayerStorage not rendered (hidden by conditional)");
  return warns;
}

// ─── Section IDs ─────────────────────────────────────────────────────────────
type SectionId = "beat" | "dialogue" | "camera" | "anim" | "state" | "bugs" | "storage";

const DEFAULT_OPEN: Record<SectionId, boolean> = {
  beat:    true,
  dialogue:true,
  camera:  true,
  anim:    true,
  state:   false,
  bugs:    true,
  storage: true,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const C = {
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
    overflow: "hidden",
  } satisfies CSSProperties,

  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 9px",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: "1px solid rgba(100,160,255,0.18)",
  } satisfies CSSProperties,

  body: {
    padding: "0 0 6px",
    display: "flex",
    flexDirection: "column",
  } satisfies CSSProperties,

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 10px 3px",
    cursor: "pointer",
    userSelect: "none",
    background: "rgba(20,30,55,0.60)",
    borderBottom: "1px solid rgba(100,160,255,0.10)",
    marginTop: 2,
  } satisfies CSSProperties,

  sectionLabel: {
    fontSize: 9,
    letterSpacing: "0.1em",
    color: "#4a6a9a",
    textTransform: "uppercase" as const,
  } satisfies CSSProperties,

  sectionChevron: {
    fontSize: 10,
    color: "#2a4a7a",
    lineHeight: 1,
  } satisfies CSSProperties,

  sectionBody: {
    padding: "5px 10px 4px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
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

  val:  { color: "#dde8f8", wordBreak: "break-all" } satisfies CSSProperties,
  warn: { color: "#f87171", wordBreak: "break-all", lineHeight: 1.45 } satisfies CSSProperties,
  dim:  { color: "#3a5878", wordBreak: "break-all" } satisfies CSSProperties,

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [sections, setSections] = useState<Record<SectionId, boolean>>(DEFAULT_OPEN);
  const [storageSnap, setStorageSnap] = useState<Record<string, string | null> | null>(null);

  const beat = TUTORIAL_BEATS[s.beat];
  if (!beat) return null;

  const beatId = beat.id;
  const subStep = s.subStep;
  const isCinematic = s.beat <= 9;

  const cameraFocus = isCinematic ? "cinematic" : deriveCameraFocus(beatId, subStep);
  const cameraWarn = cameraFocus === "storage";

  const completionStr =
    beat.completion.type === "action"   ? `action → ${beat.completion.action}` :
    beat.completion.type === "auto"     ? `auto (${beat.completion.ms} ms)` :
    beat.completion.type;

  const expectedAction = (() => {
    if (beat.mode === "look" || beat.mode === "listen") return `none — ${beat.mode} mode`;
    if (beat.mode === "cinematic") return "wait for animation";
    if (beat.completion.type === "dialogue") return "tap dialogue to advance";
    if (beat.completion.type === "action") return beat.completion.action;
    if (beat.completion.type === "animation") return "wait for animation";
    if (beat.completion.type === "auto") return `auto-advance (${beat.completion.ms} ms)`;
    return "—";
  })();

  const primaryHighlight =
    beat.foregroundCardId && beat.highlightZone ? `${beat.foregroundCardId} + zone:${beat.highlightZone}` :
    beat.foregroundCardId                        ? `foregroundCard: ${beat.foregroundCardId}` :
    beat.highlightZone                           ? `zone: ${beat.highlightZone}` :
    "none";

  const animStr = s.animTrigger
    ? s.animTrigger.type === "forge"
      ? `forge: ${s.animTrigger.cardId} (+${s.animTrigger.eminence} eminence)`
      : `harness: [${(s.animTrigger as Extract<typeof s.animTrigger, { type: "harness" }>).affinities.join(", ")}]`
    : "none";

  const cardFlipStr = (() => {
    const b6Idx  = BEAT_INDEX["b6_forge_appears"]  ?? 10;
    const b6bIdx = BEAT_INDEX["b6b_root_lattice"]  ?? 11;
    if (s.beat < b6Idx)  return "pre-mount (Forge not yet shown)";
    if (s.beat === b6Idx)  return "back face shown — awaiting flip at next beat";
    if (s.beat === b6bIdx) return "flipping now (CardFlipReveal fresh-mount, shouldAnimate=true)";
    return "post-flip (irrelevant)";
  })();
  const cardFlipWarn = false;

  const heldAffinityStr = Object.entries(s.affinities).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(" ") || "none";
  const bonusStr   = Object.entries(s.bonuses).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(" ") || "none";
  const wellSelStr = Object.entries(s.wellSel).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => `${k}:${v}`).join(" ") || "none";

  const knownBugs   = BEAT_BUGS[beatId] ?? [];
  const runtimeWarns = detectRuntimeWarnings(s, beatId);
  const hasBugs = knownBugs.length > 0 || runtimeWarns.length > 0;

  function toggleSection(id: SectionId) {
    setSections(prev => ({ ...prev, [id]: !prev[id] }));
  }

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

  // ── Sub-components ──────────────────────────────────────────────────────────
  function Row({ label, value, warn = false, dim = false }: { label: string; value: string; warn?: boolean; dim?: boolean }) {
    return (
      <div style={C.row}>
        <span style={C.label}>{label}</span>
        <span style={warn ? C.warn : dim ? C.dim : C.val}>{value}</span>
      </div>
    );
  }

  function Section({
    id,
    title,
    badge,
    warnBadge = false,
    children,
  }: {
    id: SectionId;
    title: string;
    badge?: string;
    warnBadge?: boolean;
    children: React.ReactNode;
  }) {
    const isOpen = sections[id];
    return (
      <div>
        <div style={C.sectionHeader} onClick={() => toggleSection(id)}>
          <span style={C.sectionLabel}>
            {title}
            {badge && (
              <span style={{ marginLeft: 5, color: warnBadge ? "#f87171" : "#3a6a9a" }}>
                {badge}
              </span>
            )}
          </span>
          <span style={C.sectionChevron}>{isOpen ? "▾" : "▸"}</span>
        </div>
        {isOpen && <div style={C.sectionBody}>{children}</div>}
      </div>
    );
  }

  return (
    <div style={C.panel}>
      {/* ── Panel header — collapses everything ─────────────────────────── */}
      <div style={C.panelHeader} onClick={() => setPanelOpen(o => !o)}>
        <span style={{ color: "#4488cc", fontSize: 10, letterSpacing: "0.08em" }}>
          ◈ TUT DEBUG &nbsp;
          <span style={{ color: "#2a4a7a" }}>{beatId}</span>
        </span>
        <span style={{ color: "#2a4a7a", fontSize: 13, lineHeight: 1 }}>{panelOpen ? "▾" : "▸"}</span>
      </div>

      {panelOpen && (
        <div style={C.body}>

          {/* ── BEAT ──────────────────────────────────────────────────────── */}
          <Section id="beat" title={`BEAT · ${isCinematic ? "CINEMATIC" : "GAMEPLAY"}`}>
            <Row label="beat id"  value={beatId} />
            <Row label="index"    value={`${s.beat + 1} / ${TUTORIAL_BEATS.length}  (raw: ${s.beat})`} />
            <Row label="mode"     value={beat.mode} />
            <Row label="subStep"  value={String(subStep)} dim={subStep === 0} />
            <Row label="view"     value={s.view} />
          </Section>

          {/* ── DIALOGUE ──────────────────────────────────────────────────── */}
          <Section id="dialogue" title="DIALOGUE">
            <Row label="dlg line"       value={`${s.dlgLine + 1} / ${beat.dialogue.length}`} />
            <Row label="completion"     value={completionStr} />
            <Row label="expectedAction" value={expectedAction} />
            {beat.wrongClickNudge && (
              <Row label="wrongClickNudge" value={beat.wrongClickNudge} dim />
            )}
          </Section>

          {/* ── CAMERA / LUMII ────────────────────────────────────────────── */}
          <Section
            id="camera"
            title="CAMERA / LUMII"
            badge={cameraWarn ? "⚠ storage bug" : undefined}
            warnBadge
          >
            <Row label="cameraFocus"     value={cameraFocus} warn={cameraWarn} />
            {cameraWarn && (
              <div style={{ ...C.warn, fontSize: 10, paddingLeft: 4 }}>
                BUG-01: no scroll handler for 'storage' — scrolls to board top
              </div>
            )}
            <Row label="lumiiZone"       value={beat.lumiiZone} />
            <Row label="highlightZone"   value={beat.highlightZone ?? "none"} dim={!beat.highlightZone} />
            <Row label="foregroundCard"  value={beat.foregroundCardId ?? "none"} dim={!beat.foregroundCardId} />
            <Row label="primaryHighlight" value={primaryHighlight} dim={primaryHighlight === "none"} />
            <Row label="lockout"         value={beat.mode === "look" || beat.mode === "listen" ? `locked (${beat.mode})` : "interactive"} />
          </Section>

          {/* ── ANIMATION STATE ───────────────────────────────────────────── */}
          <Section id="anim" title="ANIMATION STATE">
            <Row label="animTrigger"   value={animStr} dim={animStr === "none"} />
            <Row label="cardFlipReveal" value={cardFlipStr} warn={cardFlipWarn} />
          </Section>

          {/* ── GAME STATE ────────────────────────────────────────────────── */}
          <Section id="state" title="GAME STATE">
            <Row label="heldAffinities" value={heldAffinityStr} dim={heldAffinityStr === "none"} />
            <Row label="bonuses"  value={bonusStr}   dim={bonusStr === "none"} />
            <Row label="forged"   value={s.forged.length   ? s.forged.join(", ")   : "none"} dim={!s.forged.length} />
            <Row label="reserved" value={s.reserved.length ? s.reserved.join(", ") : "none"} dim={!s.reserved.length} />
            <Row label="eminence" value={String(s.eminence)} dim={s.eminence === 0} />
            <Row label="wellSel"  value={wellSelStr} dim />
          </Section>

          {/* ── KNOWN BUGS ────────────────────────────────────────────────── */}
          {hasBugs && (
            <Section
              id="bugs"
              title="KNOWN BUGS"
              badge={`${knownBugs.length + runtimeWarns.length}`}
              warnBadge
            >
              {knownBugs.map(bug => (
                <div key={bug} style={{ ...C.warn, fontSize: 10, lineHeight: 1.5 }}>⚠ {bug}</div>
              ))}
              {runtimeWarns.map(w => (
                <div key={w} style={{ color: "#fbbf24", fontSize: 10, lineHeight: 1.5, wordBreak: "break-all" }}>🔴 {w}</div>
              ))}
            </Section>
          )}

          {/* ── LOCALSTORAGE ──────────────────────────────────────────────── */}
          <Section id="storage" title="LOCALSTORAGE">
            <div style={{ display: "flex", gap: 5 }}>
              <button style={C.btn} onClick={readStorage}>Read Storage</button>
              <button style={C.btnReset} onClick={clearAll} title="Clears progress, seen, completed, intro_seen">
                Reset All Progress
              </button>
            </div>
            {storageSnap !== null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>
                {Object.entries(storageSnap).map(([k, v]) => (
                  <div key={k} style={{ ...C.row, fontSize: 10 }}>
                    <span style={{ ...C.label, minWidth: 78, fontSize: 10, color: "#3a5878" }}>
                      {k.replace("luminae_tutorial_", "t:").replace("luminae_", "")}
                    </span>
                    <span style={{ fontSize: 10, color: v === null ? "#2a4060" : "#90c0f0", wordBreak: "break-all" }}>
                      {v === null ? "(null)" : v}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

        </div>
      )}
    </div>
  );
}
