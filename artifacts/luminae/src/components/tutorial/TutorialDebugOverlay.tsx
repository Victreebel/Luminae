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
import { TUTORIAL_BEATS, BEAT_INDEX, usesTutorialCinematicPhase } from "@/lib/tutorialData";
import { getTutorialCameraFocus } from "@/lib/tutorialCamera";
import type { TutState, TAction } from "@/lib/tutorialReducer";
import { clearTutorialProgress, clearIntroSeen } from "@/lib/tutorialProgress";

// ─── Section IDs ─────────────────────────────────────────────────────────────
type SectionId = "beat" | "dialogue" | "camera" | "anim" | "state" | "storage";

const DEFAULT_OPEN: Record<SectionId, boolean> = {
  beat:    true,
  dialogue:true,
  camera:  true,
  anim:    true,
  state:   false,
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
  const isCinematic = usesTutorialCinematicPhase(s.beat);
  const cameraFocus = isCinematic ? "cinematic" : getTutorialCameraFocus({
    beatId,
    isActionInstructionVisible: s.dlgLine >= beat.dialogue.length - 1,
    finalDeliveryComplete: s.finalDeliveryComplete,
  });

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
          <Section id="camera" title="CAMERA / LUMII">
            <Row label="cameraFocus"     value={cameraFocus} />
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
