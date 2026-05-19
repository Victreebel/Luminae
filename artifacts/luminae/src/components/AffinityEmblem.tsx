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

// 8-point star: outer radius 44, inner radius 20, starting at top (-90°), steps of 22.5°
const RADIANCE_STAR =
  "50,6 57.6,31.5 81.1,18.9 68.5,42.4 94,50 68.5,57.6 81.1,81.1 57.6,68.5 50,94 42.4,68.5 18.9,81.1 31.5,57.6 6,50 31.5,42.4 18.9,18.9 42.4,31.5";

/**
 * Solar-gold 8-point starburst.
 * Layered circles simulate a warm radial gradient from deep gold → sacred white-gold center.
 * The default drop-shadow uses Radiance glowHex; callers can override via `style`.
 */
function RadianceEmblem({ size, className, style }: Omit<AffinityEmblemProps, "color">) {
  const { glowHex } = GEM_META.pearl;
  return (
    <svg
      viewBox="0 0 100 100"
      {...(size != null ? { width: size, height: size } : {})}
      className={["pointer-events-none select-none shrink-0", className ?? ""].join(" ").trim()}
      style={{ filter: `drop-shadow(0 0 3px ${glowHex}88)`, ...style }}
      role="img"
      aria-label="Radiance"
    >
      <title>Radiance</title>
      {/* Soft ambient outer ring */}
      <circle cx="50" cy="50" r="46" fill="#DFC878" fillOpacity="0.07" />
      {/* 8-point solar starburst */}
      <polygon points={RADIANCE_STAR} fill="#DFC878" />
      {/* Warm inner disk — transitions gold → white-gold */}
      <circle cx="50" cy="50" r="23" fill="#F5E8B8" fillOpacity="0.88" />
      {/* Luminous core */}
      <circle cx="50" cy="50" r="13" fill="#FFFEF2" fillOpacity="0.96" />
      {/* Central sacred spark */}
      <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Prismatic white crystalline diamond-lens.
 * Diamond body with 4 facet seam lines running corner-to-center, plus chromatic fringe
 * (warm NE, cool SW) to suggest refraction / prismatic lensing.
 * The default drop-shadow uses Singularity glowHex; callers can override via `style`.
 */
function SingularityEmblem({ size, className, style }: Omit<AffinityEmblemProps, "color">) {
  const { glowHex } = GEM_META.flux;
  return (
    <svg
      viewBox="0 0 100 100"
      {...(size != null ? { width: size, height: size } : {})}
      className={["pointer-events-none select-none shrink-0", className ?? ""].join(" ").trim()}
      style={{ filter: `drop-shadow(0 0 3px ${glowHex}aa)`, ...style }}
      role="img"
      aria-label="Singularity"
    >
      <title>Singularity</title>
      {/* Outer halo glow */}
      <polygon points="50,2 98,50 50,98 2,50" fill="#C8C0FF" fillOpacity="0.09" />
      {/* Main diamond body */}
      <polygon points="50,7 93,50 50,93 7,50" fill="#F4F2FF" fillOpacity="0.92" />
      {/* Inner facet plane — slightly brighter */}
      <polygon points="50,21 79,50 50,79 21,50" fill="#FAFAFF" fillOpacity="0.75" />
      {/* Facet seam lines: each corner → center (crystal cleavage planes) */}
      <line x1="50" y1="7"  x2="50" y2="50" stroke="#C8C0FF" strokeWidth="1.2" strokeOpacity="0.55" />
      <line x1="93" y1="50" x2="50" y2="50" stroke="#C8C0FF" strokeWidth="1.2" strokeOpacity="0.55" />
      <line x1="50" y1="93" x2="50" y2="50" stroke="#C8C0FF" strokeWidth="1.2" strokeOpacity="0.55" />
      <line x1="7"  y1="50" x2="50" y2="50" stroke="#C8C0FF" strokeWidth="1.2" strokeOpacity="0.55" />
      {/* Chromatic fringe — warm red-orange shift along NE edge */}
      <line x1="50" y1="7"  x2="93" y2="50" stroke="#FFB0A0" strokeWidth="1.5" strokeOpacity="0.30" />
      {/* Chromatic fringe — cool cyan-blue shift along SW edge */}
      <line x1="50" y1="93" x2="7"  y2="50" stroke="#90C4FF" strokeWidth="1.5" strokeOpacity="0.30" />
      {/* Central convergence lens */}
      <circle cx="50" cy="50" r="10" fill="#FFFFFF" fillOpacity="0.88" />
      <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Unified affinity emblem renderer.
 *   pearl → RadianceEmblem    (solar gold / sacred white-gold starburst)
 *   flux  → SingularityEmblem (prismatic white / crystalline diamond-lens)
 *   other → filtered <img>    (unchanged PNG with existing imageFilter chain)
 */
export function AffinityEmblem({ color, size, className, style }: AffinityEmblemProps) {
  if (color === "pearl") return <RadianceEmblem  size={size} className={className} style={style} />;
  if (color === "flux")  return <SingularityEmblem size={size} className={className} style={style} />;
  const meta = GEM_META[color];
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
