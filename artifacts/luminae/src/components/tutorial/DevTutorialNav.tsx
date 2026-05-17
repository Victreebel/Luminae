import type { Dispatch } from "react";
import { TUTORIAL_BEATS } from "@/lib/tutorialData";
import type { TAction } from "@/lib/tutorialReducer";

interface Props {
  beatIndex: number;
  dispatch: Dispatch<TAction>;
}

export function DevTutorialNav({ beatIndex, dispatch }: Props) {
  const total = TUTORIAL_BEATS.length;
  const beat = TUTORIAL_BEATS[beatIndex];

  function jump(toIndex: number) {
    dispatch({ type: "JUMP_BEAT", toIndex });
  }

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
        padding: "6px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 200,
        fontFamily: "monospace",
        fontSize: 11,
        color: "#e2c96a",
        pointerEvents: "all",
      }}
    >
      <div style={{ fontSize: 10, color: "#a0a0a0", letterSpacing: "0.04em", marginBottom: 2 }}>
        DEV · BEAT NAVIGATOR
      </div>
      <div style={{ color: "#fff", lineHeight: 1.4 }}>
        <span style={{ color: "#a0a0a0" }}>Beat </span>
        <strong>{beatIndex + 1}</strong>
        <span style={{ color: "#a0a0a0" }}> / {total} — </span>
        <span style={{ color: "#e2c96a" }}>{beat?.id ?? "?"}</span>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          onClick={() => jump(beatIndex - 1)}
          disabled={beatIndex <= 0}
          style={{
            background: beatIndex <= 0 ? "#333" : "#555",
            color: beatIndex <= 0 ? "#666" : "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: beatIndex <= 0 ? "not-allowed" : "pointer",
            fontSize: 13,
            lineHeight: 1,
          }}
          title="Previous beat"
        >
          ‹
        </button>
        <button
          onClick={() => jump(beatIndex + 1)}
          disabled={beatIndex >= total - 1}
          style={{
            background: beatIndex >= total - 1 ? "#333" : "#555",
            color: beatIndex >= total - 1 ? "#666" : "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: beatIndex >= total - 1 ? "not-allowed" : "pointer",
            fontSize: 13,
            lineHeight: 1,
          }}
          title="Next beat"
        >
          ›
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
          }}
        >
          {TUTORIAL_BEATS.map((b, i) => (
            <option key={b.id} value={i}>
              {i + 1}. {b.id}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
