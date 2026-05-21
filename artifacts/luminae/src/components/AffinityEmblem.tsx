import type { CSSProperties } from "react";
import type { GemKey } from "@/lib/gemMeta";
import { GEM_META } from "@/lib/gemMeta";

export interface AffinityEmblemProps {
  color: GemKey;
  /** Explicit pixel size. If omitted the element fills its container — use className for sizing. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Unified affinity emblem renderer.
 * All six gems use a PNG asset with transparent background.
 * The default filter is a per-gem glowHex drop-shadow; callers override via `style`.
 */
export function AffinityEmblem({ color, size, className, style }: AffinityEmblemProps) {
  const meta = GEM_META[color];
  return (
    <img
      src={meta.image}
      alt={meta.name}
      title={meta.name}
      {...(size != null ? { width: size, height: size } : {})}
      className={["pointer-events-none select-none shrink-0", className ?? ""].join(" ").trim()}
      style={{
        filter: `drop-shadow(0 0 3px ${meta.glowHex}88)`,
        ...style,
      }}
      draggable={false}
    />
  );
}
