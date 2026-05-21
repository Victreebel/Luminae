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
 * Renders as a colored circle (radial gradient from gem hex) with the PNG
 * overlaid as texture. overflow-hidden + border-radius clips to a perfect
 * circle so filter:drop-shadow traces the circle edge correctly.
 */
export function AffinityEmblem({ color, size, className, style }: AffinityEmblemProps) {
  const meta = GEM_META[color];
  const sizeStyle = size != null ? { width: size, height: size } : {};
  return (
    <div
      className={["rounded-full overflow-hidden pointer-events-none select-none shrink-0 relative", className ?? ""].join(" ").trim()}
      style={{
        background: `radial-gradient(circle at 35% 35%, ${meta.hex}cc 0%, ${meta.hex}66 55%, ${meta.hex}22 100%)`,
        filter: `drop-shadow(0 0 3px ${meta.glowHex}88)`,
        ...sizeStyle,
        ...style,
      }}
    >
      <img
        src={meta.image}
        alt={meta.name}
        title={meta.name}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}
