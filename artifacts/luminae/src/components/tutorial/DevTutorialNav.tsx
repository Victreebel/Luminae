import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw } from "lucide-react";
import { TUTORIAL_BEATS } from "@/lib/tutorialData";

interface Props {
  beatIndex: number;
  onJump: (toIndex: number) => void;
}

export function DevTutorialNav({ beatIndex, onJump }: Props) {
  const [open, setOpen] = useState(true);
  const total = TUTORIAL_BEATS.length;
  const beat = TUTORIAL_BEATS[beatIndex];

  function jump(toIndex: number) {
    onJump(Math.max(0, Math.min(toIndex, total - 1)));
  }

  const navButtonStyle = (disabled = false) => ({
    width: 30,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.11)",
    color: disabled ? "rgba(255,255,255,0.22)" : "#fff",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    flexShrink: 0,
  } as const);

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 9999,
        background: "rgba(0,0,0,0.82)",
        border: "1px solid rgba(255,200,80,0.35)",
        borderRadius: 8,
        fontFamily: "monospace",
        fontSize: 11,
        color: "#e2c96a",
        pointerEvents: "all",
        overflow: "hidden",
        minWidth: open ? 248 : 0,
        boxShadow: "0 8px 28px rgba(0,0,0,0.48)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? "Collapse developer scene navigator" : "Expand developer scene navigator"}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "5px 8px",
          cursor: "pointer",
          userSelect: "none",
          borderBottom: open ? "1px solid rgba(255,200,80,0.18)" : "none",
          whiteSpace: "nowrap",
          background: "transparent",
          border: 0,
          color: "inherit",
        }}
      >
        <span style={{ fontSize: 10, color: "#a0a0a0", letterSpacing: "0.04em" }}>
          DEV · SCENES {beatIndex + 1}/{total}
        </span>
        {open
          ? <ChevronUp aria-hidden="true" size={14} color="#8d7a3d" />
          : <ChevronDown aria-hidden="true" size={14} color="#8d7a3d" />}
      </button>

      {open && (
        <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ color: "#fff", lineHeight: 1.4 }}>
            <span style={{ color: "#a0a0a0" }}>Beat </span>
            <strong>{beatIndex + 1}</strong>
            <span style={{ color: "#a0a0a0" }}> / {total} — </span>
            <span style={{ color: "#e2c96a" }}>{beat?.id ?? "?"}</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => jump(beatIndex - 1)}
              disabled={beatIndex <= 0}
              style={navButtonStyle(beatIndex <= 0)}
              title="Previous scene"
              aria-label="Previous scene"
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </button>
            <button
              type="button"
              onClick={() => jump(beatIndex)}
              style={navButtonStyle()}
              title="Restart scene"
              aria-label="Restart scene"
            >
              <RotateCcw aria-hidden="true" size={14} />
            </button>
            <button
              type="button"
              onClick={() => jump(beatIndex + 1)}
              disabled={beatIndex >= total - 1}
              style={navButtonStyle(beatIndex >= total - 1)}
              title="Next scene"
              aria-label="Next scene"
            >
              <ChevronRight aria-hidden="true" size={16} />
            </button>
            <select
              value={beatIndex}
              onChange={e => jump(Number(e.target.value))}
              style={{
                flex: 1,
                background: "#222",
                color: "#e2c96a",
                border: "1px solid #444",
                borderRadius: 4,
                padding: "2px 4px",
                fontSize: 10,
                cursor: "pointer",
                minWidth: 0,
              }}
              aria-label="Jump to tutorial scene"
            >
              {TUTORIAL_BEATS.map((b, i) => (
                <option key={b.id} value={i}>
                  {i + 1}. {b.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
