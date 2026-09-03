import type { CSSProperties } from "react";
import type { AffinityKey } from "@/lib/affinityMeta";
import { AFFINITY_META } from "@/lib/affinityMeta";

export interface AffinityEmblemProps {
  color: AffinityKey;
  /** Explicit pixel size. If omitted the element fills its container — use className for sizing. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Unified affinity emblem renderer.
 * The five natural Affinities and Architect-created Singularity use PNG emblems.
 * radiance → luminae_radiance_emblem_v2.png   (solar-gold starburst medallion)
 * singularity  → luminae_singularity_emblem_v1.png (prismatic crystalline diamond)
 * other → existing affinity coin PNGs
 *
 * The default filter is the Affinity's glowHex drop shadow; callers may override it via `style`.
 */
export function AffinityEmblem({ color, size, className, style }: AffinityEmblemProps) {
  const meta = AFFINITY_META[color];
  return (
    <img
      src={meta.image}
      alt={meta.name}
      title={meta.name}
      {...(size != null ? { width: size, height: size } : {})}
      className={["rounded-full pointer-events-none select-none shrink-0", className ?? ""].join(" ").trim()}
      style={{
        filter: `${meta.imageFilter ? meta.imageFilter + " " : ""}drop-shadow(0 0 3px ${meta.glowHex}88)`,
        ...style,
      }}
      draggable={false}
    />
  );
}
