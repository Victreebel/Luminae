/**
 * TutorialDebugOverlay — DEV ONLY
 *
 * This file must ONLY be imported inside an `import.meta.env.DEV` guard.
 * TutorialDirector.tsx enforces this — do not add a top-level static import elsewhere.
 *
 * Shows live beat state, camera focus, Lumii positioning, animation state,
 * known bugs at the current beat, and localStorage controls for QA/debugging.
 *
 * Collapsed by default — expands to full panel on click.
 * Collapsed/expanded state (panel + each section) is remembered for the current browser session.
 */
import { useState, type Dispatch, type CSSProperties } from "react";
import { TUTORIAL_BEATS, BEAT_INDEX } from "@/lib/tutorialData";
import type { TutState, TAction } from "@/lib/tutorialReducer";
import { clearTutorialProgress, clearIntroSeen } from "@/lib/tutorialProgress";

// ─── Session-persistent open state ────────────────────────────────────────────
const SESSION_KEY = "tut_debug_open";
function readSessionOpen(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === "true"; } catch { return false; }
}
function writeSessionOpen(v: boolean): void {
  try { sessionStorage.setItem(SESSION_KEY, v ? "true" : "false"); } catch { /* ignore */ }
}

// ─── Per-section collapse state ───────────────────────────────────────────────
type SectionId = "beat" | "dialogue" | "camera" | "anim" | "game" | "bugs" | "storage";
const ALL_SECTIONS: SectionId[] = ["beat", "dialogue", "camera", "anim", "game", "bugs", "storage"];
const SECTIONS_KEY = "tut_debug_sections";

function readSectionOpen(): Record<SectionId, boolean> {
  const defaults = Object.fromEntries(ALL_SECTIONS.map(id => [id, true])) as Record<SectionId, boolean>;
  try {
    const raw = sessionStorage.getItem(SECTIONS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<Record<SectionId, boolean>>) };
  } catch { return defaults; }
}
function writeSectionOpen(v: Record<SectionId, boolean>): void {
  try { sessionStorage.setItem(SECTIONS_KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

// ─── cameraFocus mirror (must stay in sync with GameplayPhase) ────────────────
function deriveCameraFocus(
  beatId: string,
  subStep: number,
): "market" | "well" | "storage" | "forge" | "tier1" | "cinematic" {
  // b6_forge_appears + b7 beats + b9_first_forge: tier1 so the card slot is front and centre
  // b9_first_forge: Root Lattice (T1) is at ~777px scroll-space — below the fold at scrollTop=0 (BUG-12 fix)
  if (beatId === "b6_forge_appears" || beatId === "b7_artifact_cost" || beatId === "b7b_cost_bridge" || beatId === "b9_first_forge") return "tier1";
  // b6b: Root Lattice just dealt — scroll to forge header; T3/T2 render as
  // headerOnly (collapsed labels) so T1 fits in the same viewport
  if (beatId === "b6b_root_lattice") return "forge";
  if (beatId === "b8_first_harness") return "well";
  // FIXED BUG-06: was "tier1" (ghost slots visible), now "well" (hand+well visible)
  if (beatId === "b11_forge_reserved" && subStep === 0) return "well";
  if (beatId === "b12_tier2" && subStep === 1) return "well";
  // FIXED BUG-15: subStep≥2 → Singularity card (T2) below fold at scrollTop=0; now "forge"
  if (beatId === "b12_tier2" && subStep >= 2) return "forge";
  if (beatId === "b16_final_forge" && subStep === 0) return "well";
  // FIXED BUG-13: subStep≥1 → Verdance Bloom (T2) below fold at scrollTop=0; now "forge"
  if (beatId === "b16_final_forge" && subStep >= 1) return "forge";
  // FIXED BUG-01: "storage" now scrolls to maxScroll (well + storage visible)
  if (beatId === "b9b_forge_complete" || beatId === "b9c_transition" || beatId === "b14_win_condition")
    return "storage";
  if (beatId === "b10_reserve") return "forge";
  // FIXED BUG-05: was "forge" (hand off-screen), now "well" (scrolls to bottom showing hand)
  if (beatId === "b10b_reserve_granted") return "well";
  return "market";
}

// ─── Known bug annotations keyed by beat id ──────────────────────────────────
const BEAT_BUGS: Record<string, string[]> = {
  "b6_forge_appears":      ["FIXED BUG-02: DeckDealReveal key now changes at b6b → remounts and replays deal animation correctly"],
  "b6b_root_lattice":      ["FIXED BUG-02: key='deal-active' forces DeckDealReveal remount; dialogue delayed 1.3s until deal+flip done"],
  "b9_first_forge":        ["FIXED BUG-12: camera now 'tier1' — Root Lattice (T1) was at ~777px scroll-space, below fold at scrollTop=0"],
  "b9b_forge_complete":    ["FIXED BUG-01: storage camera now scrolls to maxScroll", "FIXED BUG-11: removed from isForgeHighlighted"],
  "b9c_transition":        ["FIXED BUG-01: storage camera now scrolls to maxScroll"],
  "b10_reserve":           ["FIXED BUG-08: RESERVE_CARD_ID highlighted from subStep=0 (not gated on subStep≥1)"],
  "b10b_reserve_granted":  ["FIXED BUG-05: camera now 'well' (maxScroll) — PlayerHand visible"],
  "b11_forge_reserved":    ["FIXED BUG-06: camera now 'well' at subStep=0 — PlayerHand+AffinityWell visible"],
  "b12_tier2":             ["FIXED BUG-03: auto-dispatch SET_VIEW 'needed' when view already 'needed' at subStep=0", "FIXED BUG-15: camera at subStep≥2 now 'forge' — TutorialLuminarySection (~216px) + T3 ghost row (~200px) pushed Singularity card below fold at scrollTop=0"],
  "b14_win_condition":     ["FIXED BUG-01: storage camera now scrolls to maxScroll"],
  "b16_final_forge":       ["FIXED BUG-13: camera at subStep≥1 now 'forge' — TutorialLuminarySection (~216px) + T3 ghost row (~200px) pushed Verdance Bloom below fold at scrollTop=0"],
};

// ─── Runtime warnings ─────────────────────────────────────────────────────────
function detectRuntimeWarnings(s: TutState, beatId: string): string[] {
  const warns: string[] = [];
  if (beatId === "b12_tier2" && s.subStep === 0 && s.view === "needed") {
    warns.push("b12_tier2: view='needed' at subStep=0 — auto-dispatch should have fired (check if useEffect ran)");
  }
  if ((beatId === "b9b_forge_complete" || beatId === "b9c_transition") && s.forged.length === 0) {
    warns.push("No forged cards: PlayerStorage not rendered (hidden by conditional)");
  }
  return warns;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  pill: {
    position: "fixed",
    bottom: 8,
    left: 8,
    zIndex: 9999,
    background: "rgba(6,8,20,0.88)",
    border: "1px solid rgba(100,160,255,0.28)",
    borderRadius: 20,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#b8d0f0",
    pointerEvents: "all",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px 4px 8px",
    cursor: "pointer",
    userSelect: "none",
    boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,

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
    borderBottom: "1px solid rgba(100,160,255,0.15)",
  } satisfies CSSProperties,

  body: {
    padding: "4px 0 6px",
    display: "flex",
    flexDirection: "column",
  } satisfies CSSProperties,

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "3px 10px 3px 10px",
    cursor: "pointer",
    userSelect: "none",
    gap: 4,
  } satisfies CSSProperties,

  sectionLabel: {
    fontSize: 9,
    letterSpacing: "0.1em",
    color: "#3a5888",
    textTransform: "uppercase" as const,
  } satisfies CSSProperties,

  sectionBody: {
    padding: "3px 10px 6px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    borderBottom: "1px solid rgba(100,160,255,0.10)",
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
  const [open, setOpen] = useState<boolean>(readSessionOpen);
  const [sections, setSections] = useState<Record<SectionId, boolean>>(readSectionOpen);
  const [storageSnap, setStorageSnap] = useState<Record<string, string | null> | null>(null);

  const beat = TUTORIAL_BEATS[s.beat];
  if (!beat) return null;

  const beatId = beat.id;
  const subStep = s.subStep;
  const isCinematic = s.beat <= 9;

  const cameraFocus = isCinematic ? "cinematic" : deriveCameraFocus(beatId, subStep);
  const cameraWarn = cameraFocus === "storage";

  function toggle() {
    setOpen(prev => {
      const next = !prev;
      writeSessionOpen(next);
      return next;
    });
  }

  function toggleSection(id: SectionId) {
    setSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      writeSectionOpen(next);
      return next;
    });
  }

  // ── Collapsed pill ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <div style={S.pill} onClick={toggle} title="Expand debug overlay">
        <span style={{ color: "#4488cc", fontSize: 10 }}>◈ DEBUG</span>
        <span style={{ color: "#2a4a7a", fontSize: 10 }}>·</span>
        <span style={{ color: "#90b8e8", fontSize: 10, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
          {beatId}
        </span>
        <span style={{ color: "#2a4a7a", fontSize: 12, marginLeft: 2 }}>▸</span>
      </div>
    );
  }

  // ── Derived values for expanded panel ──────────────────────────────────────

  const completionStr =
    beat.completion.type === "action"
      ? `action → ${beat.completion.action}`
      : beat.completion.type === "auto"
        ? `auto (${beat.completion.ms} ms)`
        : beat.completion.type;

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
    beat.foregroundCardId && beat.highlightZone
      ? `${beat.foregroundCardId} + zone:${beat.highlightZone}`
      : beat.foregroundCardId
        ? `foregroundCard: ${beat.foregroundCardId}`
        : beat.highlightZone
          ? `zone: ${beat.highlightZone}`
          : "none";

  const animStr = s.animTrigger
    ? s.animTrigger.type === "forge"
      ? `forge: ${s.animTrigger.cardId} (+${s.animTrigger.lumens} eminence)`
      : `harvest: [${(s.animTrigger as Extract<typeof s.animTrigger, { type: "harvest" }>).gems.join(", ")}]`
    : "none";

  const cardFlipStr = (() => {
    const b6Idx = BEAT_INDEX["b6_forge_appears"] ?? 10;
    const b6bIdx = BEAT_INDEX["b6b_root_lattice"] ?? 11;
    if (s.beat < b6Idx) return "pre-mount";
    if (s.beat === b6Idx) return "ghost slot — DeckDealReveal unmounted (deals at b6b)";
    if (s.beat === b6bIdx) return "DeckDealReveal active — deal animation fires on mount";
    if (s.beat > b6bIdx) return "post-deal (irrelevant)";
    return "—";
  })();
  const cardFlipWarn = false;

  const crystalEntries = Object.entries(s.crystals).filter(([, v]) => v > 0);
  const bonusEntries = Object.entries(s.bonuses).filter(([, v]) => v > 0);
  const crystalStr = crystalEntries.length ? crystalEntries.map(([k, v]) => `${k}:${v}`).join(" ") : "none";
  const bonusStr = bonusEntries.length ? bonusEntries.map(([k, v]) => `${k}:${v}`).join(" ") : "none";

  const knownBugs = BEAT_BUGS[beatId] ?? [];
  const runtimeWarns = detectRuntimeWarnings(s, beatId);
  const hasBugs = knownBugs.length > 0 || runtimeWarns.length > 0;

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

  function Section({
    id,
    label,
    labelStyle,
    children,
  }: {
    id: SectionId;
    label: string;
    labelStyle?: CSSProperties;
    children: React.ReactNode;
  }) {
    const isOpen = sections[id];
    return (
      <>
        <div
          style={S.sectionHeader}
          onClick={(e) => { e.stopPropagation(); toggleSection(id); }}
          title={isOpen ? `Collapse ${label}` : `Expand ${label}`}
        >
          <span style={{ ...S.sectionLabel, ...labelStyle }}>{label}</span>
          <span style={{ color: "#2a4a6a", fontSize: 10, lineHeight: 1 }}>{isOpen ? "▾" : "▸"}</span>
        </div>
        {isOpen && <div style={S.sectionBody}>{children}</div>}
      </>
    );
  }

  const beatLabel = isCinematic ? "CINEMATIC" : "GAMEPLAY";

  // ── Expanded panel ──────────────────────────────────────────────────────────
  return (
    <div style={S.panel}>
      {/* Header — click to collapse whole panel */}
      <div style={S.header} onClick={toggle}>
        <span style={{ color: "#4488cc", fontSize: 10, letterSpacing: "0.08em" }}>
          ◈ TUT DEBUG &nbsp;
          <span style={{ color: "#2a4a7a" }}>{beatId}</span>
        </span>
        <span style={{ color: "#2a4a7a", fontSize: 13, lineHeight: 1 }}>▾</span>
      </div>

      <div style={S.body}>

        {/* ── BEAT ──────────────────────────────────────────────────── */}
        <Section id="beat" label={`BEAT · ${beatLabel}`}>
          <Row label="beat id" value={beatId} />
          <Row label="index" value={`${s.beat + 1} / ${TUTORIAL_BEATS.length}  (raw: ${s.beat})`} />
          <Row label="mode" value={beat.mode} />
          <Row label="subStep" value={String(subStep)} dim={subStep === 0} />
          <Row label="view" value={s.view} />
        </Section>

        {/* ── DIALOGUE ──────────────────────────────────────────────── */}
        <Section id="dialogue" label="DIALOGUE">
          <Row label="dlg line" value={`${s.dlgLine + 1} / ${beat.dialogue.length}`} />
          <Row label="completion" value={completionStr} />
          <Row label="expectedAction" value={expectedAction} />
          {beat.wrongClickNudge && (
            <Row label="wrongClickNudge" value={beat.wrongClickNudge} dim />
          )}
        </Section>

        {/* ── CAMERA / LUMII ──────────────────────────────────────── */}
        <Section id="camera" label="CAMERA / LUMII">
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
        </Section>

        {/* ── ANIMATION STATE ─────────────────────────────────────── */}
        <Section id="anim" label="ANIMATION STATE">
          <Row label="animTrigger" value={animStr} dim={animStr === "none"} />
          <Row label="cardFlipReveal" value={cardFlipStr} warn={cardFlipWarn} />
        </Section>

        {/* ── GAME STATE ──────────────────────────────────────────── */}
        <Section id="game" label="GAME STATE">
          <Row label="crystals" value={crystalStr} dim={crystalStr === "none"} />
          <Row label="bonuses" value={bonusStr} dim={bonusStr === "none"} />
          <Row label="forged" value={s.forged.length ? s.forged.join(", ") : "none"} dim={!s.forged.length} />
          <Row label="reserved" value={s.reserved.length ? s.reserved.join(", ") : "none"} dim={!s.reserved.length} />
          <Row label="eminence" value={String(s.eminence)} dim={s.eminence === 0} />
          <Row label="wellSel" value={(() => {
            const entries = Object.entries(s.wellSel).filter(([, v]) => (v ?? 0) > 0);
            return entries.length ? entries.map(([k, v]) => `${k}:${v}`).join(" ") : "none";
          })()} dim />
        </Section>

        {/* ── KNOWN BUGS ──────────────────────────────────────────── */}
        {hasBugs && (
          <Section id="bugs" label="KNOWN BUGS AT THIS BEAT" labelStyle={{ color: "#7a2a2a" }}>
            {knownBugs.map(bug => (
              <div key={bug} style={{ ...S.warn, fontSize: 10, lineHeight: 1.5 }}>⚠ {bug}</div>
            ))}
            {runtimeWarns.map(w => (
              <div key={w} style={{ color: "#fbbf24", fontSize: 10, lineHeight: 1.5, wordBreak: "break-all" }}>🔴 {w}</div>
            ))}
          </Section>
        )}

        {/* ── LOCALSTORAGE ──────────────────────────────────────────── */}
        <Section id="storage" label="LOCALSTORAGE">
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
        </Section>

      </div>
    </div>
  );
}
