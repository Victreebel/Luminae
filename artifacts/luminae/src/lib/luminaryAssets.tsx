import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LuminaryVisuals {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  EntityArt: React.FC<{ size?: number; className?: string }>;
}

// ─── Illustrated Asset Discovery ──────────────────────────────────────────────
// Vite scans the luminaries asset folder at build time using import.meta.glob.
// Files that do not exist simply won't appear in the map — no crash, no error.
// Missing slots fall back to the procedural SVG art automatically.
//
// ─── HOW TO ADD REAL ILLUSTRATED ASSETS ──────────────────────────────────────
// Drop files into:
//
//   src/assets/luminaries/<luminary-id>/panel.webp
//     Sealed board panel art — shown in the objective tile and as the
//     shattering vessel in the summoning cutscene.
//     Aspect ratio: square (1:1) to portrait (3:4). object-fit: cover.
//
//   src/assets/luminaries/<luminary-id>/entity.webp
//     Freed entity cutout — MUST have a transparent background (PNG or WebP).
//     No card border, no portrait frame, no drop-shadow baked in.
//     The entity silhouette only. Recommended: 400×560 px.
//     Displayed during the cutscene reveal floating over the live game board.
//
//   src/assets/luminaries/<luminary-id>/aura.webp
//     Cosmic aura / light layer — transparent background PNG or WebP.
//     Sits behind the entity with screen blend mode. Soft radial glow or
//     particle field. Recommended: 512×512 px.
//
// Supported formats: .webp (preferred), .png, .jpg
//
// All 12 Luminary IDs:
//   lum_ember   lum_tide    lum_root    lum_void    lum_radiant lum_astral
//   lum_forge   lum_pale    lum_bloom   lum_compass lum_oracle  lum_null
//
// No code changes are needed after dropping files — the glob picks them up on
// the next build / Vite HMR reload automatically.
// ─────────────────────────────────────────────────────────────────────────────

const _luminaryImageModules = import.meta.glob<{ default: string }>(
  '../assets/luminaries/**/*.{webp,png,jpg}',
  { eager: true },
);

// Flat lookup: "lum_ember/panel" → resolved asset URL
const _luminaryImageMap: Record<string, string> = {};
for (const [path, mod] of Object.entries(_luminaryImageModules)) {
  // path shape: ../assets/luminaries/lum_ember/panel.webp
  const match = path.match(/luminaries\/([^/]+)\/([^/]+)\.[^.]+$/);
  if (match) {
    const [, id, slot] = match;
    _luminaryImageMap[`${id}/${slot}`] = mod.default;
  }
}

function _getLuminaryImage(id: string, slot: 'panel' | 'entity' | 'aura'): string | null {
  return _luminaryImageMap[`${id}/${slot}`] ?? null;
}

/** All three illustrated image slots for one Luminary. null = not yet available → fallback to procedural art. */
export interface LuminaryImageAssets {
  /** Sealed board panel art. Displayed in the objective tile and as the shattering vessel. */
  panelArt: string | null;
  /** Freed entity transparent cutout. No card border or square portrait edges. */
  entityCutout: string | null;
  /** Cosmic aura / light layer. Rendered behind the entity with screen blend during reveal. */
  auraLayer: string | null;
}

export function getLuminaryImageAssets(id: string): LuminaryImageAssets {
  return {
    panelArt:     _getLuminaryImage(id, 'panel'),
    entityCutout: _getLuminaryImage(id, 'entity'),
    auraLayer:    _getLuminaryImage(id, 'aura'),
  };
}

// ─── Procedural Entity SVG Components (Fallback Art) ─────────────────────────
// Used only when real illustrated assets are not yet available.
// viewBox="0 0 100 140" — transparent background, no rect fill.
// Design language: cosmic crystalline beings from the artifact card universe —
// geometric faceted bodies, luminous rune geometry, distinct silhouettes.
//
// NOTE: These are PLACEHOLDER art, not final illustrations. The pipeline above
// replaces them per-Luminary as soon as a real asset file is dropped in.

// ── Ember Sovereign ──────────────────────────────────────────────────────────
// Crowned flame sovereign: 5-spike crystal crown, angular gem-faceted robe.
function EmberEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="emb-g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
        <radialGradient id="emb-g2" cx="50%" cy="35%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="65" rx="40" ry="58" fill="url(#emb-g2)" />
      <polygon points="50,3 47,22 53,22" fill="#fbbf24" />
      <polygon points="39,7 35,22 43,22" fill="#fca5a5" opacity="0.9" />
      <polygon points="61,7 57,22 65,22" fill="#fca5a5" opacity="0.9" />
      <polygon points="29,14 25,26 34,26" fill="#ef4444" opacity="0.85" />
      <polygon points="71,14 66,26 75,26" fill="#ef4444" opacity="0.85" />
      <rect x="24" y="24" width="52" height="5" rx="1" fill="#7f1d1d" />
      <polygon points="50,29 63,36 63,46 50,52 37,46 37,36" fill="url(#emb-g1)" />
      <ellipse cx="50" cy="40" rx="6" ry="5" fill="#fca5a5" opacity="0.3" />
      <polygon points="39,53 61,53 67,68 33,68" fill="url(#emb-g1)" />
      <polygon points="50,56 55,62 50,68 45,62" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.7" />
      <polygon points="39,55 22,61 20,70 36,66" fill="url(#emb-g1)" />
      <polygon points="61,55 78,61 80,70 64,66" fill="url(#emb-g1)" />
      <polygon points="33,68 67,68 80,106 74,124 50,130 26,124 20,106" fill="url(#emb-g1)" />
      <line x1="50" y1="68" x2="50" y2="128" stroke="#ef4444" strokeWidth="0.7" opacity="0.4" />
      <line x1="33" y1="68" x2="24" y2="122" stroke="#ef4444" strokeWidth="0.5" opacity="0.25" />
      <line x1="67" y1="68" x2="76" y2="122" stroke="#ef4444" strokeWidth="0.5" opacity="0.25" />
      <polygon points="50,92 54,99 50,106 46,99" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

// ── Tide Architect ────────────────────────────────────────────────────────────
// Tidal architect: very tall crystal spire head (top 35%), column body, arc arms.
function TideEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="tid-g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" /><stop offset="50%" stopColor="#3d6bff" /><stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <radialGradient id="tid-g2" cx="50%" cy="20%">
          <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.55" /><stop offset="100%" stopColor="#3d6bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="55" rx="32" ry="55" fill="url(#tid-g2)" />
      <polygon points="50,2 58,36 50,42 42,36" fill="url(#tid-g1)" />
      <line x1="50" y1="2" x2="50" y2="36" stroke="#bfdbfe" strokeWidth="0.7" opacity="0.8" />
      <line x1="44" y1="16" x2="56" y2="16" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.6" />
      <line x1="42" y1="26" x2="58" y2="26" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />
      <ellipse cx="50" cy="42" rx="10" ry="6" fill="url(#tid-g1)" />
      <ellipse cx="50" cy="40" rx="4" ry="2.5" fill="#e2e8f0" opacity="0.45" />
      <rect x="43" y="48" width="14" height="36" rx="1.5" fill="url(#tid-g1)" />
      <line x1="47" y1="50" x2="47" y2="82" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />
      <line x1="53" y1="50" x2="53" y2="82" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />
      <path d="M 43,56 Q 20,56 16,72" stroke="url(#tid-g1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 57,56 Q 80,56 84,72" stroke="url(#tid-g1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="68" r="2.5" fill="#bfdbfe" opacity="0.75" />
      <circle cx="82" cy="68" r="2.5" fill="#bfdbfe" opacity="0.75" />
      <polygon points="43,84 57,84 62,112 56,126 44,126 38,112" fill="url(#tid-g1)" />
      <path d="M 28,132 Q 38,124 50,128 Q 62,132 72,124" stroke="#bfdbfe" strokeWidth="1.5" fill="none" opacity="0.7" />
    </svg>
  );
}

// ── Root Ancient ──────────────────────────────────────────────────────────────
// Root ancient: wide squat body, geological crystal dome head, massive root arms.
function RootEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="roo-g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#14532d" />
        </linearGradient>
        <radialGradient id="roo-g2" cx="50%" cy="55%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" /><stop offset="100%" stopColor="#2ecc71" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="75" rx="48" ry="55" fill="url(#roo-g2)" />
      <path d="M 34,52 Q 34,30 50,26 Q 66,30 66,52 Z" fill="url(#roo-g1)" />
      <polygon points="50,26 48,35 52,35" fill="#4ade80" opacity="0.95" />
      <polygon points="43,30 40,38 46,38" fill="#86efac" opacity="0.8" />
      <polygon points="57,30 54,38 60,38" fill="#86efac" opacity="0.8" />
      <ellipse cx="50" cy="48" rx="11" ry="4" fill="#14532d" opacity="0.8" />
      <ellipse cx="50" cy="47" rx="5" ry="2" fill="#ef4444" opacity="0.45" />
      <rect x="32" y="54" width="36" height="26" rx="3" fill="url(#roo-g1)" />
      <polygon points="50,58 55,65 50,72 45,65" fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.6" />
      <path d="M 32,62 Q 16,56 4,66 Q 1,78 8,84" stroke="url(#roo-g1)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M 68,62 Q 84,56 96,66 Q 99,78 92,84" stroke="url(#roo-g1)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M 4,66 Q 2,80 1,92" stroke="#4ade80" strokeWidth="2.5" fill="none" opacity="0.8" strokeLinecap="round" />
      <path d="M 96,66 Q 98,80 99,92" stroke="#4ade80" strokeWidth="2.5" fill="none" opacity="0.8" strokeLinecap="round" />
      <circle cx="2" cy="92" r="3" fill="#ef4444" opacity="0.7" />
      <circle cx="98" cy="92" r="3" fill="#ef4444" opacity="0.7" />
      <path d="M 37,80 L 63,80 L 59,110 Q 56,128 50,130 Q 44,128 41,110 Z" fill="url(#roo-g1)" />
    </svg>
  );
}

// ── Void Warden ───────────────────────────────────────────────────────────────
// Void warden: tall hooded cloak, absolute void face, orbital containment ring.
function VoidEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <radialGradient id="voi-g1" cx="50%" cy="42%">
          <stop offset="0%" stopColor="#312e81" /><stop offset="100%" stopColor="#020210" />
        </radialGradient>
        <linearGradient id="voi-g2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#312e81" stopOpacity="0" />
          <stop offset="50%" stopColor="#3d6bff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#312e81" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M 18,55 Q 18,130 50,135 Q 82,130 82,55 L 78,64 Q 65,58 50,57 Q 35,58 22,64 Z" fill="url(#voi-g1)" />
      <path d="M 20,54 Q 20,18 50,14 Q 80,18 80,54 L 76,62 Q 63,55 50,55 Q 37,55 24,62 Z" fill="url(#voi-g1)" />
      <ellipse cx="50" cy="42" rx="17" ry="14" fill="#000" opacity="0.96" />
      <ellipse cx="50" cy="40" rx="5" ry="3.5" fill="#3d6bff" opacity="0.55" />
      <circle cx="50" cy="40" r="2" fill="#bfdbfe" opacity="0.7" />
      <ellipse cx="50" cy="72" rx="44" ry="15" fill="none" stroke="url(#voi-g2)" strokeWidth="2" />
      <rect x="4" y="69" width="5" height="6" rx="0.5" fill="#3d6bff" opacity="0.85" />
      <rect x="91" y="69" width="5" height="6" rx="0.5" fill="#3d6bff" opacity="0.85" />
      <rect x="47" y="55" width="6" height="5" rx="0.5" fill="#3d6bff" opacity="0.8" />
      <rect x="47" y="82" width="6" height="5" rx="0.5" fill="#3d6bff" opacity="0.6" />
      <path d="M 20,54 Q 22,70 22,105" stroke="#312e81" strokeWidth="1.5" fill="none" opacity="0.7" />
      <path d="M 80,54 Q 78,70 78,105" stroke="#312e81" strokeWidth="1.5" fill="none" opacity="0.7" />
    </svg>
  );
}

// ── Radiant Keeper ────────────────────────────────────────────────────────────
// Radiant keeper: saint figure with massive 8-point starburst halo, glowing sphere.
function RadiantEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  const haloCenter = { x: 50, y: 44 };
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
    const r = (deg * Math.PI) / 180;
    const inner = 16, outer = i % 2 === 0 ? 46 : 32;
    return {
      x1: haloCenter.x + inner * Math.cos(r),
      y1: haloCenter.y + inner * Math.sin(r),
      x2: haloCenter.x + outer * Math.cos(r),
      y2: haloCenter.y + outer * Math.sin(r),
      cardinal: i % 2 === 0,
    };
  });
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <radialGradient id="rad-g1" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#166534" />
        </radialGradient>
        <radialGradient id="rad-g2" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#f0fdf4" stopOpacity="0.75" /><stop offset="100%" stopColor="#2ecc71" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="44" r="46" fill="url(#rad-g2)" />
      {rays.map((ray, i) => (
        <line key={i} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2}
          stroke={ray.cardinal ? '#f0fdf4' : '#86efac'}
          strokeWidth={ray.cardinal ? 1.6 : 0.9}
          opacity={ray.cardinal ? 0.9 : 0.65} />
      ))}
      <ellipse cx="50" cy="44" rx="13" ry="11" fill="url(#rad-g1)" />
      <ellipse cx="50" cy="42" rx="6" ry="4.5" fill="#e2e8f0" opacity="0.5" />
      <path d="M 39,55 L 61,55 L 58,86 L 42,86 Z" fill="url(#rad-g1)" />
      <path d="M 39,55 L 22,64 L 26,90 L 42,86" fill="url(#rad-g1)" opacity="0.88" />
      <path d="M 61,55 L 78,64 L 74,90 L 58,86" fill="url(#rad-g1)" opacity="0.88" />
      <circle cx="50" cy="98" r="11" fill="url(#rad-g2)" opacity="0.9" />
      <circle cx="50" cy="98" r="11" fill="none" stroke="#e2e8f0" strokeWidth="0.9" />
      <circle cx="50" cy="98" r="5" fill="#f0fdf4" opacity="0.85" />
      <path d="M 42,86 Q 38,93 40,98" stroke="url(#rad-g1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 58,86 Q 62,93 60,98" stroke="url(#rad-g1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 26,90 L 74,90 L 68,130 L 32,130 Z" fill="url(#rad-g1)" />
      <line x1="50" y1="90" x2="50" y2="130" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

// ── Astral Weaver ──────────────────────────────────────────────────────────────
// Astral weaver: six crystal arms in exact hexagonal star pattern, star-cluster head.
function AstralEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  const armAngles = [0, 60, 120, 180, 240, 300];
  const cx = 50, cy = 68;
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="ast-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <radialGradient id="ast-g2" cx="50%" cy="49%">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.45" /><stop offset="100%" stopColor="#3d6bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx="46" ry="56" fill="url(#ast-g2)" />
      {armAngles.map((deg) => {
        const r = (deg * Math.PI) / 180;
        const x1 = cx + 11 * Math.cos(r), y1 = cy + 11 * Math.sin(r);
        const x2 = cx + 43 * Math.cos(r), y2 = cy + 43 * Math.sin(r);
        const tipX = cx + 43 * Math.cos(r), tipY = cy + 43 * Math.sin(r);
        return (
          <g key={deg}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={deg < 180 ? '#ef4444' : '#3d6bff'} strokeWidth="4.5" opacity="0.9" strokeLinecap="round" />
            <polygon
              points={`${tipX},${tipY - 3.5} ${tipX + 2.5},${tipY} ${tipX},${tipY + 3.5} ${tipX - 2.5},${tipY}`}
              fill={deg < 180 ? '#fca5a5' : '#bfdbfe'} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="12" fill="url(#ast-g1)" />
      <polygon points={`${cx},${cy - 7} ${cx + 6},${cy - 3} ${cx + 6},${cy + 3} ${cx},${cy + 7} ${cx - 6},${cy + 3} ${cx - 6},${cy - 3}`}
        fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.8" />
      <circle cx={cx} cy="34" r="6.5" fill="#ef4444" opacity="0.92" />
      <circle cx={cx - 8} cy="29" r="4" fill="#fca5a5" opacity="0.85" />
      <circle cx={cx + 8} cy="29" r="4" fill="#fca5a5" opacity="0.85" />
      <circle cx={cx} cy="23" r="3" fill="#bfdbfe" opacity="0.9" />
      <circle cx={cx - 5} cy="20" r="1.8" fill="#bfdbfe" opacity="0.75" />
      <circle cx={cx + 5} cy="20" r="1.8" fill="#bfdbfe" opacity="0.75" />
      <line x1={cx} y1="40" x2={cx} y2="56" stroke="#ef4444" strokeWidth="1.5" opacity="0.55" strokeDasharray="2,2.5" />
    </svg>
  );
}

// ── Iron Harbinger ────────────────────────────────────────────────────────────
// Iron harbinger: armored stocky figure with wide mechanical crystal wings.
function ForgeEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="frg-g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#292524" /><stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="frg-g2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#166534" /><stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <polygon points="50,48 10,30 2,44 12,60 38,60" fill="url(#frg-g1)" />
      <polygon points="50,48 90,30 98,44 88,60 62,60" fill="url(#frg-g1)" />
      <line x1="12" y1="40" x2="38" y2="54" stroke="#4ade80" strokeWidth="0.9" opacity="0.7" />
      <line x1="18" y1="34" x2="28" y2="52" stroke="#4ade80" strokeWidth="0.6" opacity="0.5" />
      <line x1="88" y1="40" x2="62" y2="54" stroke="#4ade80" strokeWidth="0.9" opacity="0.7" />
      <line x1="82" y1="34" x2="72" y2="52" stroke="#4ade80" strokeWidth="0.6" opacity="0.5" />
      <polygon points="2,44 0,36 10,40" fill="#4ade80" opacity="0.85" />
      <polygon points="98,44 100,36 90,40" fill="#4ade80" opacity="0.85" />
      <polygon points="50,22 63,29 63,42 57,48 43,48 37,42 37,29" fill="url(#frg-g1)" />
      <rect x="39" y="36" width="22" height="6" rx="0.5" fill="#4ade80" opacity="0.55" />
      <rect x="46" y="30" width="8" height="4" rx="0.5" fill="#86efac" opacity="0.6" />
      <rect x="36" y="60" width="28" height="30" rx="2" fill="url(#frg-g1)" />
      <polygon points="50,65 57,72 50,79 43,72" fill="url(#frg-g2)" opacity="0.9" />
      <polygon points="50,68 54,72 50,76 46,72" fill="#86efac" opacity="0.75" />
      <rect x="36" y="90" width="12" height="38" rx="1.5" fill="url(#frg-g1)" />
      <rect x="52" y="90" width="12" height="38" rx="1.5" fill="url(#frg-g1)" />
      <rect x="34" y="122" width="14" height="7" rx="1" fill="#1c1917" />
      <rect x="52" y="122" width="14" height="7" rx="1" fill="#1c1917" />
    </svg>
  );
}

// ── Pale Merchant ──────────────────────────────────────────────────────────────
// Pale merchant: tall luminous hood, drooping cloak, balance scales to the right.
function PaleEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <radialGradient id="pal-g1" cx="50%" cy="28%">
          <stop offset="0%" stopColor="#e2e8f0" /><stop offset="65%" stopColor="#475569" /><stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <linearGradient id="pal-g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.9" /><stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="26" rx="19" ry="26" fill="#e2e8f0" opacity="0.12" />
      <path d="M 31,44 Q 31,4 50,2 Q 69,4 69,44 L 65,50 Q 58,46 50,46 Q 42,46 35,50 Z" fill="url(#pal-g1)" />
      <ellipse cx="50" cy="42" rx="15" ry="8" fill="#0a0a0a" opacity="0.85" />
      <ellipse cx="50" cy="40" rx="5" ry="3.5" fill="#3d6bff" opacity="0.4" />
      <path d="M 29,52 Q 27,82 29,112 L 33,132 L 67,132 L 71,112 Q 73,82 71,52" fill="url(#pal-g2)" opacity="0.88" />
      <line x1="40" y1="56" x2="38" y2="128" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.22" />
      <line x1="60" y1="56" x2="62" y2="128" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.22" />
      <line x1="63" y1="64" x2="88" y2="57" stroke="#e2e8f0" strokeWidth="2" opacity="0.85" />
      <line x1="80" y1="57" x2="96" y2="57" stroke="#e2e8f0" strokeWidth="1.2" opacity="0.85" />
      <path d="M 78,57 L 75,68 Q 79,71 83,68 L 80,57" fill="none" stroke="#e2e8f0" strokeWidth="0.9" opacity="0.85" />
      <path d="M 94,57 L 91,64 Q 95,67 99,64 L 96,57" fill="none" stroke="#e2e8f0" strokeWidth="0.9" opacity="0.75" />
      <circle cx="21" cy="80" r="5.5" fill="#3d6bff" opacity="0.55" />
      <circle cx="21" cy="80" r="2.5" fill="#e2e8f0" opacity="0.5" />
      <line x1="29" y1="74" x2="21" y2="80" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.6" />
      <polygon points="76,80 78,85 76,90 74,85" fill="none" stroke="#3d6bff" strokeWidth="0.75" opacity="0.7" />
      <circle cx="20" cy="100" r="2" fill="none" stroke="#e2e8f0" strokeWidth="0.65" opacity="0.5" />
    </svg>
  );
}

// ── Bloom Tyrant ──────────────────────────────────────────────────────────────
// Bloom tyrant: asymmetric — LEFT crystal petals blooming, RIGHT flame spikes.
function BloomEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="blo-g1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#166534" /><stop offset="50%" stopColor="#14532d" /><stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <radialGradient id="blo-g2" cx="35%" cy="50%">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="72" rx="46" ry="56" fill="url(#blo-g2)" />
      <path d="M 37,52 Q 10,39 7,54 Q 10,68 37,64" fill="#166534" opacity="0.88" />
      <path d="M 35,62 Q 5,62 7,78 Q 17,88 37,78" fill="#166534" opacity="0.78" />
      <path d="M 39,46 Q 17,26 25,14 Q 38,11 41,38" fill="#2ecc71" opacity="0.75" />
      <line x1="37" y1="52" x2="10" y2="54" stroke="#86efac" strokeWidth="0.65" opacity="0.65" />
      <line x1="35" y1="62" x2="9" y2="72" stroke="#86efac" strokeWidth="0.65" opacity="0.55" />
      <polygon points="63,40 76,17 74,40" fill="#fbbf24" opacity="0.92" />
      <polygon points="67,44 84,23 80,46" fill="#ef4444" opacity="0.85" />
      <polygon points="61,49 80,34 73,53" fill="#fca5a5" opacity="0.75" />
      <polygon points="63,57 82,49 73,64" fill="#ef4444" opacity="0.72" />
      <path d="M 50,24 Q 39,17 37,28 Q 39,37 50,35" fill="#4ade80" opacity="0.92" />
      <path d="M 50,24 Q 61,17 63,28 Q 61,37 50,35" fill="#fbbf24" opacity="0.92" />
      <ellipse cx="50" cy="41" rx="12" ry="10" fill="url(#blo-g1)" />
      <line x1="50" y1="30" x2="50" y2="51" stroke="#4ade80" strokeWidth="0.65" opacity="0.5" />
      <polygon points="38,52 62,52 68,74 32,74" fill="url(#blo-g1)" />
      <polygon points="31,74 69,74 74,110 66,130 50,136 34,130 26,110" fill="url(#blo-g1)" />
      <circle cx="19" cy="72" r="3.5" fill="#e2e8f0" opacity="0.6" />
      <circle cx="50" cy="112" r="4.5" fill="#e2e8f0" opacity="0.5" />
    </svg>
  );
}

// ── Stellar Guide ──────────────────────────────────────────────────────────────
// Stellar guide: 8-point compass rose crown, navigator with pointing arm.
function CompassEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <radialGradient id="cmp-g1" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#e2e8f0" /><stop offset="50%" stopColor="#3d6bff" /><stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="cmp-g2" cx="50%" cy="25%">
          <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.5" /><stop offset="100%" stopColor="#2ecc71" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="55" rx="48" ry="58" fill="url(#cmp-g2)" />
      <polygon points="50,2 47,22 53,22" fill="#e2e8f0" opacity="0.96" />
      <polygon points="50,50 47,30 53,30" fill="#e2e8f0" opacity="0.96" />
      <polygon points="14,26 30,23 30,29" fill="#e2e8f0" opacity="0.92" />
      <polygon points="86,26 70,23 70,29" fill="#e2e8f0" opacity="0.92" />
      <polygon points="74,7 66,21 72,23" fill="#2ecc71" opacity="0.82" />
      <polygon points="26,7 28,23 34,21" fill="#2ecc71" opacity="0.82" />
      <polygon points="74,45 72,29 66,31" fill="#2ecc71" opacity="0.75" />
      <polygon points="26,45 28,29 34,31" fill="#2ecc71" opacity="0.75" />
      <circle cx="50" cy="26" r="10" fill="url(#cmp-g1)" />
      <line x1="50" y1="18" x2="50" y2="34" stroke="#e2e8f0" strokeWidth="0.7" opacity="0.7" />
      <line x1="42" y1="26" x2="58" y2="26" stroke="#e2e8f0" strokeWidth="0.7" opacity="0.7" />
      <circle cx="50" cy="26" r="4" fill="#e2e8f0" opacity="0.75" />
      <circle cx="50" cy="26" r="1.5" fill="#3d6bff" />
      <ellipse cx="50" cy="60" rx="13" ry="10" fill="url(#cmp-g1)" />
      <rect x="40" y="70" width="20" height="28" rx="2" fill="url(#cmp-g1)" />
      <line x1="60" y1="70" x2="90" y2="86" stroke="url(#cmp-g1)" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="90" y1="86" x2="98" y2="79" stroke="#e2e8f0" strokeWidth="0.9" opacity="0.65" />
      <line x1="90" y1="86" x2="100" y2="88" stroke="#e2e8f0" strokeWidth="0.9" opacity="0.55" />
      <circle cx="98" cy="79" r="1.8" fill="#e2e8f0" opacity="0.75" />
      <circle cx="100" cy="90" r="1.2" fill="#2ecc71" opacity="0.7" />
      <line x1="40" y1="70" x2="22" y2="86" stroke="url(#cmp-g1)" strokeWidth="4" strokeLinecap="round" />
      <path d="M 40,98 L 60,98 L 65,130 L 35,130 Z" fill="url(#cmp-g1)" />
      <line x1="50" y1="98" x2="50" y2="130" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}

// ── Cosmic Oracle ─────────────────────────────────────────────────────────────
// Cosmic oracle: seated floating figure inside three orbital rings, three eyes.
function OracleEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <radialGradient id="ora-g1" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#fde68a" /><stop offset="60%" stopColor="#b45309" /><stop offset="100%" stopColor="#1c1917" />
        </radialGradient>
        <radialGradient id="ora-g2" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" /><stop offset="100%" stopColor="#1c1917" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="72" rx="46" ry="56" fill="url(#ora-g2)" />
      <ellipse cx="50" cy="70" rx="45" ry="10" fill="none" stroke="#ef4444" strokeWidth="1.9" opacity="0.82" />
      <ellipse cx="50" cy="70" rx="41" ry="16" fill="none" stroke="#3d6bff" strokeWidth="1.6" opacity="0.78" transform="rotate(-28 50 70)" />
      <ellipse cx="50" cy="70" rx="41" ry="16" fill="none" stroke="#2ecc71" strokeWidth="1.6" opacity="0.78" transform="rotate(28 50 70)" />
      <circle cx="5" cy="70" r="3.5" fill="#ef4444" opacity="0.85" />
      <circle cx="95" cy="70" r="3.5" fill="#ef4444" opacity="0.85" />
      <circle cx="15" cy="54" r="3" fill="#3d6bff" opacity="0.82" />
      <circle cx="84" cy="87" r="3" fill="#2ecc71" opacity="0.82" />
      <ellipse cx="50" cy="70" rx="19" ry="23" fill="url(#ora-g1)" />
      <ellipse cx="50" cy="47" rx="11" ry="9" fill="url(#ora-g1)" />
      <ellipse cx="50" cy="44" rx="4.5" ry="3" fill="#fde68a" opacity="0.95" />
      <circle cx="50" cy="44" r="1.8" fill="#1c1917" />
      <ellipse cx="41" cy="53" rx="3.5" ry="2.5" fill="#ef4444" opacity="0.9" />
      <circle cx="41" cy="53" r="1.5" fill="#1c1917" />
      <ellipse cx="59" cy="53" rx="3.5" ry="2.5" fill="#3d6bff" opacity="0.9" />
      <circle cx="59" cy="53" r="1.5" fill="#1c1917" />
      <polygon points="50,44 41,53 59,53" fill="none" stroke="#fde68a" strokeWidth="0.55" opacity="0.5" />
      <path d="M 31,80 Q 27,93 34,98 Q 42,98 50,92" fill="url(#ora-g1)" opacity="0.9" />
      <path d="M 69,80 Q 73,93 66,98 Q 58,98 50,92" fill="url(#ora-g1)" opacity="0.9" />
      <line x1="50" y1="92" x2="44" y2="114" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3" />
      <line x1="50" y1="92" x2="56" y2="114" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

// ── Null Sovereign ────────────────────────────────────────────────────────────
// Null sovereign: tall figure with crown of null-rune fragments, disintegrating body.
function NullEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <radialGradient id="nul-g1" cx="50%" cy="38%">
          <stop offset="0%" stopColor="#312e81" /><stop offset="65%" stopColor="#0a0a14" /><stop offset="100%" stopColor="#000" />
        </radialGradient>
        <radialGradient id="nul-g2" cx="50%" cy="38%">
          <stop offset="0%" stopColor="#3d6bff" stopOpacity="0.38" /><stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="68" rx="44" ry="58" fill="url(#nul-g2)" />
      <rect x="46" y="4" width="8" height="8" rx="0.5" fill="none" stroke="#3d6bff" strokeWidth="1.3" opacity="0.9" />
      <line x1="50" y1="4" x2="50" y2="12" stroke="#3d6bff" strokeWidth="0.9" opacity="0.9" />
      <line x1="46" y1="8" x2="54" y2="8" stroke="#3d6bff" strokeWidth="0.9" opacity="0.9" />
      <rect x="33" y="8" width="7" height="7" rx="0.5" fill="none" stroke="#bfdbfe" strokeWidth="0.95" opacity="0.72" />
      <rect x="60" y="8" width="7" height="7" rx="0.5" fill="none" stroke="#bfdbfe" strokeWidth="0.95" opacity="0.72" />
      <rect x="24" y="15" width="5" height="5" rx="0.5" fill="none" stroke="#3d6bff" strokeWidth="0.75" opacity="0.55" />
      <rect x="71" y="15" width="5" height="5" rx="0.5" fill="none" stroke="#3d6bff" strokeWidth="0.75" opacity="0.55" />
      <path d="M 36,26 L 64,26 L 70,44 L 70,84 L 62,104 L 50,110 L 38,104 L 30,84 L 30,44 Z" fill="url(#nul-g1)" />
      <ellipse cx="50" cy="46" rx="14" ry="10" fill="#000" opacity="0.96" />
      <ellipse cx="50" cy="44" rx="6" ry="4" fill="#3d6bff" opacity="0.28" />
      <circle cx="50" cy="44" r="2" fill="#e2e8f0" opacity="0.18" />
      <rect x="21" y="40" width="7" height="4" rx="0.5" fill="#312e81" opacity="0.72" />
      <rect x="13" y="55" width="6" height="3.5" rx="0.5" fill="#312e81" opacity="0.55" />
      <rect x="7" y="70" width="5" height="3" rx="0.5" fill="#3d6bff" opacity="0.38" />
      <rect x="2" y="85" width="4" height="3" rx="0.5" fill="#3d6bff" opacity="0.22" />
      <rect x="72" y="40" width="7" height="4" rx="0.5" fill="#312e81" opacity="0.72" />
      <rect x="81" y="55" width="6" height="3.5" rx="0.5" fill="#312e81" opacity="0.55" />
      <rect x="88" y="70" width="5" height="3" rx="0.5" fill="#3d6bff" opacity="0.38" />
      <rect x="94" y="85" width="4" height="3" rx="0.5" fill="#3d6bff" opacity="0.22" />
      <rect x="31" y="108" width="6" height="3.5" rx="0.5" fill="#312e81" opacity="0.62" />
      <rect x="63" y="108" width="6" height="3.5" rx="0.5" fill="#312e81" opacity="0.62" />
      <rect x="38" y="116" width="5" height="3" rx="0.5" fill="#3d6bff" opacity="0.42" />
      <rect x="57" y="116" width="5" height="3" rx="0.5" fill="#3d6bff" opacity="0.42" />
      <polygon points="18,46 22,42 22,50" fill="#e2e8f0" opacity="0.52" />
      <polygon points="82,46 78,42 78,50" fill="#e2e8f0" opacity="0.52" />
      <polygon points="14,68 16,64 18,68 16,72" fill="#e2e8f0" opacity="0.32" />
      <polygon points="86,68 84,64 82,68 84,72" fill="#e2e8f0" opacity="0.32" />
    </svg>
  );
}

// ─── Luminary Visuals Map ─────────────────────────────────────────────────────
// Colors derived from each Luminary's requirement gem palette.
// Synced with backend summonColor/summonSecondaryColor in gameEngine.ts.

export const LUMINARY_VISUALS: Record<string, LuminaryVisuals> = {
  lum_ember:   { id: 'lum_ember',   primaryColor: '#ef4444', secondaryColor: '#1c1917', glowColor: 'rgba(239,68,68,0.6)',    EntityArt: EmberEntity   },
  lum_tide:    { id: 'lum_tide',    primaryColor: '#3d6bff', secondaryColor: '#e2e8f0', glowColor: 'rgba(61,107,255,0.55)',  EntityArt: TideEntity    },
  lum_root:    { id: 'lum_root',    primaryColor: '#2ecc71', secondaryColor: '#ef4444', glowColor: 'rgba(46,204,113,0.55)',  EntityArt: RootEntity    },
  lum_void:    { id: 'lum_void',    primaryColor: '#3d6bff', secondaryColor: '#0a0a14', glowColor: 'rgba(49,46,129,0.55)',   EntityArt: VoidEntity    },
  lum_radiant: { id: 'lum_radiant', primaryColor: '#e2e8f0', secondaryColor: '#2ecc71', glowColor: 'rgba(226,232,240,0.5)',  EntityArt: RadiantEntity },
  lum_astral:  { id: 'lum_astral',  primaryColor: '#ef4444', secondaryColor: '#3d6bff', glowColor: 'rgba(239,68,68,0.55)',   EntityArt: AstralEntity  },
  lum_forge:   { id: 'lum_forge',   primaryColor: '#2ecc71', secondaryColor: '#1c1917', glowColor: 'rgba(46,204,113,0.5)',   EntityArt: ForgeEntity   },
  lum_pale:    { id: 'lum_pale',    primaryColor: '#94a3b8', secondaryColor: '#0a0a14', glowColor: 'rgba(148,163,184,0.5)',  EntityArt: PaleEntity    },
  lum_bloom:   { id: 'lum_bloom',   primaryColor: '#ef4444', secondaryColor: '#2ecc71', glowColor: 'rgba(239,68,68,0.5)',    EntityArt: BloomEntity   },
  lum_compass: { id: 'lum_compass', primaryColor: '#3d6bff', secondaryColor: '#2ecc71', glowColor: 'rgba(61,107,255,0.55)',  EntityArt: CompassEntity },
  lum_oracle:  { id: 'lum_oracle',  primaryColor: '#fbbf24', secondaryColor: '#ef4444', glowColor: 'rgba(251,191,36,0.65)',  EntityArt: OracleEntity  },
  lum_null:    { id: 'lum_null',    primaryColor: '#3d6bff', secondaryColor: '#e2e8f0', glowColor: 'rgba(49,46,129,0.5)',    EntityArt: NullEntity    },
};

const FALLBACK_VISUALS: LuminaryVisuals = {
  id: 'fallback',
  primaryColor: '#fbbf24',
  secondaryColor: '#f59e0b',
  glowColor: 'rgba(251,191,36,0.5)',
  EntityArt: ({ size = 140 }) => (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4}>
      <circle cx="50" cy="70" r="30" fill="#fbbf24" opacity="0.7" />
      <circle cx="50" cy="42" r="12" fill="#fef08a" />
    </svg>
  ),
};

export function getLuminaryVisuals(id: string): LuminaryVisuals {
  return LUMINARY_VISUALS[id] ?? FALLBACK_VISUALS;
}

// ─── Panel Art Component ──────────────────────────────────────────────────────
// Renders the Luminary entity "sealed" inside the board objective tile.
// Uses panelArt illustrated image when available; falls back to procedural SVG.

export function LuminaryPanelArt({
  luminaryId,
  size = 96,
  claimed = false,
}: {
  luminaryId: string;
  size?: number;
  claimed?: boolean;
}) {
  const vis = getLuminaryVisuals(luminaryId);
  const { primaryColor, secondaryColor, glowColor, EntityArt } = vis;
  const { panelArt } = getLuminaryImageAssets(luminaryId);

  return (
    <div className="absolute inset-0 overflow-hidden">

      {panelArt ? (
        // ── Real illustrated panel art ──────────────────────────────────────
        // Image covers the tile; tint and frame are applied on top.
        <img
          src={panelArt}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          draggable={false}
        />
      ) : (
        // ── Procedural fallback ─────────────────────────────────────────────
        // Tier-3 cosmic backdrop + entity SVG.
        <>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${cardTier3Bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 3px ${primaryColor}88)` }}
          >
            <EntityArt size={size * 0.88} />
          </div>
        </>
      )}

      {/* Luminary color identity tint — applied regardless of image/procedural */}
      <div
        className="absolute inset-0 mix-blend-screen opacity-40"
        style={{ background: `radial-gradient(ellipse at 50% 28%, ${primaryColor}77 0%, ${secondaryColor}33 50%, transparent 82%)` }}
      />

      {/* Inner noble-tile frame — double line */}
      <div
        className="absolute pointer-events-none"
        style={{ inset: 5, border: `1px solid ${primaryColor}45`, borderRadius: 7 }}
      />
      <div
        className="absolute pointer-events-none"
        style={{ inset: 8, border: `1px solid ${primaryColor}22`, borderRadius: 5 }}
      />

      {/* Claimed gold overlay */}
      {claimed && <div className="absolute inset-0 bg-amber-400/15 pointer-events-none" />}

      {/* Bottom vignette — keeps name/requirement row legible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.9) 0%, transparent 62%)' }}
      />
    </div>
  );
}

// ─── Summoning Cutscene ───────────────────────────────────────────────────────
// Phase sequence (total ≈ 9.7s):
//
//   establish   600ms  → board visible (overlay 0→0.44); spotlight pulses at card location
//   focusing    800ms  → overlay 0.44→0.82; spotlight tightens; card awakens at board scale
//   intro       350ms  → vessel locked at board position, opacity ramping
//   zooming     650ms  → camera/view glides toward the board card target
//   pressure    500ms  → vessel breathes with colored glow — no cracks yet
//   firstcrack  600ms  → primary vertical fault draws across the vessel face
//   leaking     550ms  → white-gold light bleeds through the crack; dwell/hold
//   cracking    900ms  → horizontal + diagonal branches; ray burst at intersection
//   shattering 1000ms  → four panel pieces fly outward, brightening to white, fading out;
//                         pure cosmic-light layer visible beneath — no card art, only light
//   flashing    500ms  → full white-gold bloom; entity begins emerging during this
//   revealed   2700ms  → freed entity over live board (overlay 0.60, board visible);
//                         entity larger than original frame, aura extends beyond card bounds
//   fading      550ms  → entity ascends and dissolves
//   done              → callback fires
//
// Board staging: cardRect carries the actual viewport coordinates of the Luminary card.
//   The board stays in view while the camera/view zooms toward that location.
//   If cardRect is absent (e.g. dev panel in lobby), falls back to graceful approximate.
//
// Entity: entityCutout (transparent bg, no frame) rendered at 1.65× card size.
//   Aura extends 600px — well beyond card bounds — so no rectangular cutoff is visible.
//   The entity starts rendering during 'flashing', fading in through the bloom light.
//   Overlay lightens to 0.60 during 'revealed' so the live board is the entity's background.

type CutscenePhase =
  | 'establish' | 'focusing' | 'intro' | 'zooming'
  | 'pressure' | 'firstcrack' | 'leaking' | 'cracking'
  | 'shattering' | 'flashing' | 'revealed' | 'fading' | 'done';

// Portrait card — 7:10, matching board LuminaryCard (w-28 h-40 = 112×160px)
const CARD_W = 210;
const CARD_H = 300;
// Cinematic entity size — 1.65× the original panel frame
const ENT_W  = Math.round(CARD_W * 1.65);
const ENT_H  = Math.round(CARD_H * 1.65);
// Board card size (Tailwind w-28 h-40)
const BOARD_W = 112;

// Fault-line junction point — shared by SVG paths AND panel-piece clip polygons
const FX = 105; // 50% of CARD_W
const FY = 117; // 39% of CARD_H

const PHASE_DURATIONS: Record<CutscenePhase, number> = {
  establish:  600,
  focusing:   800,
  intro:      350,
  zooming:    650,
  pressure:   500,
  firstcrack: 600,
  leaking:    550,
  cracking:   900,
  shattering: 1000,
  flashing:   500,
  revealed:   2700,
  fading:     550,
  done:       0,
};

const PHASES: CutscenePhase[] = [
  'establish', 'focusing', 'intro', 'zooming',
  'pressure', 'firstcrack', 'leaking', 'cracking',
  'shattering', 'flashing', 'revealed', 'fading', 'done',
];

// Panel pieces — four quadrant regions that tile the full card face exactly.
// Clip polygons reference the fault junction at (50%, 39%) = (FX, FY).
// Scatter: dx/dy in px from center; dr in degrees.
const PANEL_PIECES = [
  { clip: 'polygon(0% 0%, 50% 0%, 50% 39%, 0% 39%)',         dx: -148, dy: -108, dr:  44 },
  { clip: 'polygon(50% 0%, 100% 0%, 100% 41%, 50% 39%)',     dx:  142, dy: -122, dr: -40 },
  { clip: 'polygon(0% 39%, 50% 39%, 47% 100%, 0% 100%)',     dx: -152, dy:  128, dr:  54 },
  { clip: 'polygon(50% 39%, 100% 41%, 100% 100%, 47% 100%)', dx:  148, dy:  140, dr: -50 },
] as const;

export interface SummonQueueItem {
  id: string;
  name: string;
  domain: string;
  lumens: number;
  flavor: string;
  /** Viewport coordinates of the Luminary card's center + width at trigger time */
  cardRect?: { cx: number; cy: number; w: number };
}

export function LuminarySummonCutscene({
  luminaryId,
  luminaryName,
  domain,
  lumens,
  flavor,
  cardRect,
  onComplete,
}: {
  luminaryId: string;
  luminaryName: string;
  domain: string;
  lumens: number;
  flavor: string;
  cardRect?: { cx: number; cy: number; w: number };
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<CutscenePhase>('establish');
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor, secondaryColor, glowColor } = vis;
  const { panelArt, entityCutout, auraLayer } = getLuminaryImageAssets(luminaryId);

  useEffect(() => {
    let idx = 0;
    let cancelled = false;
    function advance() {
      if (cancelled) return;
      idx++;
      const next = PHASES[idx] ?? 'done';
      setPhase(next);
      if (next !== 'done') {
        setTimeout(advance, PHASE_DURATIONS[next]);
      } else {
        setTimeout(onComplete, 80);
      }
    }
    const t = setTimeout(advance, PHASE_DURATIONS['establish']);
    return () => { cancelled = true; clearTimeout(t); };
  }, [onComplete]);

  // ── Phase booleans ──────────────────────────────────────────────────────────
  const isEstablish  = phase === 'establish';
  const isFocusing   = phase === 'focusing';
  const isIntro      = phase === 'intro';
  const isZooming    = phase === 'zooming';
  const isPressure   = phase === 'pressure';
  const isFirstCrack = phase === 'firstcrack';
  const isLeaking    = phase === 'leaking';
  const isCracking   = phase === 'cracking';
  const isShattering = phase === 'shattering' || phase === 'flashing';
  const isFlashing   = phase === 'flashing';
  // Entity starts appearing during the flash so it fades in through the light
  const isRevealed   = phase === 'flashing' || phase === 'revealed' || phase === 'fading';
  const isRevealedActive = phase === 'revealed';
  const isFading     = phase === 'fading';
  const isVessel     = isIntro || isZooming || isPressure || isFirstCrack || isLeaking || isCracking;
  const hasCracks    = isFirstCrack || isLeaking || isCracking;

  // ── Overlay opacity ─────────────────────────────────────────────────────────
  // establish → board fully visible (0), focusing → darkens as camera zooms in,
  // crack phases → nearly opaque, reveal → lightened so board reads as backdrop.
  const overlayOpacity =
    isEstablish      ? 0    :
    isFocusing       ? 0.72 :
    isFlashing       ? 0.40 :
    isRevealedActive ? 0.55 :
    isFading         ? 0    :
    0.90;

  // ── Camera: zoom toward card position using transformOrigin ─────────────────
  // Setting transformOrigin to the card's viewport centre means a pure scale()
  // keeps the card stationary while the world zooms in — no translate needed.
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 375;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 667;
  // Card's viewport centre (transformOrigin point)
  const originX = cardRect ? cardRect.cx : vw / 2;
  const originY = cardRect ? cardRect.cy : vh / 2;
  // Cinematic card's absolute top-left inside the camera plane
  const cardX = cardRect ? cardRect.cx - CARD_W / 2 : vw / 2 - CARD_W / 2;
  const cardY = cardRect ? cardRect.cy - CARD_H / 2 : vh / 2 - CARD_H / 2;
  // Zoom level so the cinematic card fills ~70 % of the shorter viewport axis
  const targetScale = Math.min(vw / CARD_W * 0.70, vh / CARD_H * 0.70, 3.5);
  // Camera is zoomed in during all phases from focusing through cracking;
  // zooms back out for shattering/flash/reveal so the entity floats over the board.
  const cameraZoomedIn =
    !isEstablish && !isShattering && !isFlashing && !isRevealedActive && !isFading;
  const cameraScale = cameraZoomedIn ? targetScale : 1;

  // ── Vessel glow — ramps up through crack phases ─────────────────────────────
  const vesselGlow: [string, string, string] = isPressure
    ? [`0 0 20px ${primaryColor}60`, `0 0 42px ${primaryColor}99`, `0 0 20px ${primaryColor}60`]
    : isFirstCrack
      ? [`0 0 28px ${primaryColor}80`, `0 0 52px ${primaryColor}b0`, `0 0 28px ${primaryColor}80`]
      : isLeaking
        ? [`0 0 36px ${primaryColor}a0`, `0 0 64px ${primaryColor}d0, 0 0 22px #ffe8a050`, `0 0 36px ${primaryColor}a0`]
        : [`0 0 44px ${primaryColor}c0`, `0 0 78px ${primaryColor}f0, 0 0 30px #ffe8a080`, `0 0 44px ${primaryColor}c0`];

  return (
    <div className="fixed inset-0 z-[9000] cursor-pointer" onClick={onComplete}>

      {/* ── Dark overlay — fades board as camera zooms in ────────────────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: overlayOpacity }}
        transition={{ duration: 0.65, ease: 'easeInOut' }}
        style={{ background: 'rgba(4,2,16,1)' }}
      />

      {/* ── Camera plane ─────────────────────────────────────────────────────── */}
      {/* transformOrigin is pinned to the card's viewport centre so scale()     */}
      {/* alone creates a "zoom into the card" effect — no translate needed.      */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ transformOrigin: `${originX}px ${originY}px` }}
        animate={{ scale: cameraScale }}
        transition={{ duration: 0.80, ease: [0.16, 1, 0.3, 1] }}
      >

        {/* ── Board-card glow / tremble during establish + focusing ────────── */}
        {(isEstablish || isFocusing) && (
          <motion.div
            className="absolute pointer-events-none"
            animate={{
              opacity: [0.35, 0.95, 0.50, 0.90],
              x: [0, -1.5, 1.5, -1, 1, 0],
              y: [0, 1, -1.5, 1, -0.5, 0],
            }}
            transition={{ repeat: Infinity, duration: 0.48, ease: 'easeInOut' }}
            style={{
              left: cardX - 4,
              top:  cardY - 4,
              width:  CARD_W + 8,
              height: CARD_H + 8,
              borderRadius: 16,
              boxShadow: `0 0 0 2px ${primaryColor}88, 0 0 22px ${primaryColor}66, 0 0 55px ${primaryColor}33`,
              background: `radial-gradient(ellipse at center, ${primaryColor}18 0%, transparent 70%)`,
            }}
          />
        )}

        {/* ── Sealed vessel — cinematic proxy card at the board card's spot ─── */}
        <AnimatePresence>
          {isVessel && (
            <motion.div
              key="vessel"
              className="absolute overflow-hidden"
              style={{
                left: cardX,
                top:  cardY,
                width: CARD_W,
                height: CARD_H,
                borderRadius: 14,
                border: `2px solid ${primaryColor}70`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                scale:     (isPressure || hasCracks) ? ([1, 1.026, 1] as number[]) : 1,
                boxShadow: (isPressure || hasCracks)
                  ? (vesselGlow as unknown as string)
                  : `0 0 12px ${primaryColor}40`,
              }}
              exit={{ scale: 2.8, opacity: 0, transition: { duration: 0.42, ease: 'easeIn' } }}
              transition={{
                scale:     (isPressure || hasCracks)
                  ? { repeat: Infinity, duration: 1.15, ease: 'easeInOut' }
                  : { duration: 0.28 },
                opacity:   { duration: 0.30 },
                boxShadow: { repeat: Infinity, duration: 1.15, ease: 'easeInOut' },
              }}
            >
              {panelArt ? (
                <img
                  src={panelArt}
                  alt={luminaryName}
                  className="w-full h-full"
                  style={{ objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  draggable={false}
                />
              ) : (
                <LuminaryPanelArt luminaryId={luminaryId} size={CARD_W} />
              )}

              {/* Crack-light SVG overlay */}
              {hasCracks && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${CARD_W} ${CARD_H}`}
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <filter id="cg" x="-60%" y="-60%" width="220%" height="220%">
                      <feGaussianBlur stdDeviation="2.8" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  <motion.path
                    d={`M${FX},0 L${FX-9},${Math.round(FY*.67)} L${FX},${FY} L${FX+9},${Math.round(FY*1.64)} L${FX-5},${CARD_H}`}
                    stroke="white" strokeWidth="2.1" fill="none" filter="url(#cg)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.84, 0.94] }}
                    transition={{ duration: 0.60, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={`M${FX},0 L${FX-9},${Math.round(FY*.67)} L${FX},${FY} L${FX+9},${Math.round(FY*1.64)} L${FX-5},${CARD_H}`}
                    stroke="#ffe8a0" strokeWidth="7" fill="none" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.24, 0.42] }}
                    transition={{ duration: 0.60, delay: 0.07, ease: 'easeOut' }}
                  />

                  {(isLeaking || isCracking) && (
                    <>
                      <motion.circle cx={FX} cy={FY} r="10" fill="white"
                        initial={{ opacity: 0, scale: 0.2 }}
                        animate={{ opacity: [0, 0.75, 1.0, 0.65], scale: [0.2, 1.25, 1.0] }}
                        transition={{ duration: 0.48, ease: 'easeOut' }}
                      />
                      <motion.circle cx={FX} cy={FY} r="24" fill="none" stroke="#ffe8a0" strokeWidth="3"
                        initial={{ opacity: 0, scale: 0.1 }}
                        animate={{ opacity: [0, 0.55, 0.3, 0], scale: [0.1, 1.9, 2.6] }}
                        transition={{ duration: 0.88, ease: 'easeOut', delay: 0.1 }}
                      />
                    </>
                  )}

                  {isCracking && (
                    <>
                      <motion.path
                        d={`M0,${FY+1} L${FX-41},${FY-18} L${FX},${FY} L${FX+43},${FY+19} L${CARD_W},${FY+7}`}
                        stroke="white" strokeWidth="1.4" fill="none" filter="url(#cg)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.32, 0.58] }}
                        transition={{ duration: 0.88, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${CARD_W},50 L${FX+44},${FY-32} L${FX},${FY}`}
                        stroke="white" strokeWidth="0.95" fill="none" filter="url(#cg)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.20, 0.44] }}
                        transition={{ duration: 0.72, delay: 0.18, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M0,${CARD_H-58} L${FX-36},${FY+68} L${FX-5},${CARD_H}`}
                        stroke="white" strokeWidth="0.9" fill="none" filter="url(#cg)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.17, 0.38] }}
                        transition={{ duration: 0.68, delay: 0.30, ease: 'easeOut' }}
                      />
                      <motion.circle cx={FX} cy={FY} r="5" fill="white"
                        animate={{ opacity: [0.5, 1.0, 0.55, 1.0], scale: [1, 1.6, 1] }}
                        transition={{ repeat: Infinity, duration: 0.52 }}
                      />
                      <motion.circle cx={FX} cy={FY} r="16" fill="none" stroke="#ffe8a0" strokeWidth="2.5"
                        animate={{ opacity: [0, 0.62, 0], scale: [0.4, 1.9] }}
                        transition={{ repeat: Infinity, duration: 0.68, delay: 0.1 }}
                      />
                      <motion.circle cx={FX-9} cy={Math.round(FY*.67)} r="3.5" fill="white"
                        animate={{ opacity: [0, 0.52, 0.88, 0.4] }}
                        transition={{ repeat: Infinity, duration: 0.72, delay: 0.22 }}
                      />
                    </>
                  )}
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cosmic-light layer — centred on card ─────────────────────────── */}
        <AnimatePresence>
          {isShattering && (
            <motion.div key="cosmiclight" className="absolute pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: isFlashing ? 0 : [0, 0.75, 0.92] }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.44, ease: 'easeOut' }}
              style={{
                width: CARD_W * 2.4, height: CARD_H * 2.4,
                left: cardX + CARD_W / 2 - CARD_W * 1.2,
                top:  cardY + CARD_H / 2 - CARD_H * 1.2,
                background: 'radial-gradient(ellipse 40% 44% at 50% 39%, #ffffff 0%, #fff8e0 16%, #ffe566 38%, #ffa52088 60%, transparent 80%)',
                filter: 'blur(8px)',
                borderRadius: '50%',
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Panel pieces — artwork clipped to quadrant regions ───────────── */}
        <AnimatePresence>
          {isShattering && PANEL_PIECES.map((piece, i) => (
            <motion.div key={`piece-${i}`} className="absolute pointer-events-none"
              style={{
                width: CARD_W, height: CARD_H,
                left: cardX, top: cardY,
                clipPath: piece.clip, borderRadius: 14,
              }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1, filter: 'brightness(1)' }}
              animate={{
                x: piece.dx, y: piece.dy, rotate: piece.dr,
                opacity: [1, 1, 0.55, 0],
                filter: ['brightness(1)', 'brightness(2.6)', 'brightness(4.2)', 'brightness(6)'],
              }}
              transition={{
                duration: 1.0, ease: [0.18, 0.85, 0.32, 1], delay: i * 0.04,
                opacity: { duration: 1.0, times: [0, 0.22, 0.62, 1] },
                filter:  { duration: 1.0, times: [0, 0.28, 0.62, 1] },
              }}
            >
              {panelArt ? (
                <img src={panelArt} alt="" aria-hidden
                  style={{ width: CARD_W, height: CARD_H, objectFit: 'cover', objectPosition: 'center top', display: 'block', borderRadius: 14 }}
                  draggable={false} />
              ) : (
                <LuminaryPanelArt luminaryId={luminaryId} size={CARD_W} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── Freed entity — anchored at card's board position ─────────────── */}
        {/* Camera is back at scale 1 during reveal, so viewport coords match.  */}
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              key="entity"
              className="absolute pointer-events-none"
              style={{
                left: cardX + CARD_W / 2 - ENT_W / 2,
                top:  cardY + CARD_H / 2 - ENT_H / 2,
                overflow: 'visible',
              }}
              initial={{ scale: 0.52, opacity: 0, y: 22 }}
              animate={isFading
                ? { scale: 1.10, opacity: 0, y: -30 }
                : {
                    scale:   [0.52, 1.14, 1.05, 1.0],
                    opacity: isFlashing ? [0, 0, 0.15] : 1,
                    y:       [22, -4, 0],
                  }
              }
              transition={isFading
                ? { duration: 0.55, ease: 'easeIn' }
                : {
                    scale:   { duration: 1.85, times: [0, 0.52, 0.78, 1], ease: 'easeOut' },
                    opacity: { duration: 0.50, ease: 'easeOut' },
                    y:       { duration: 1.45, ease: [0.22, 1, 0.36, 1] },
                  }
              }
            >
              {/* Breathing hover */}
              <motion.div
                className="flex flex-col items-center gap-4"
                style={{ overflow: 'visible' }}
                animate={isFading ? {} : { y: [0, -10, 0], scale: [1, 1.020, 1] }}
                transition={isFading ? {} : {
                  y:     { repeat: Infinity, duration: 3.3, ease: 'easeInOut', delay: 1.9 },
                  scale: { repeat: Infinity, duration: 3.9, ease: 'easeInOut', delay: 1.9 },
                }}
              >
                {/* Oversized aura */}
                {auraLayer ? (
                  <motion.img src={auraLayer} alt="" aria-hidden
                    className="absolute pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isFading ? 0 : (isFlashing ? 0 : [0, 0.78, 0.50, 0.72]) }}
                    transition={{ duration: 2.8, ease: 'easeInOut', times: [0, 0.28, 0.60, 1] }}
                    style={{
                      width: 600, height: 600,
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -55%)',
                      objectFit: 'contain', mixBlendMode: 'screen',
                    }}
                    draggable={false}
                  />
                ) : (
                  <motion.div className="absolute pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isFading ? 0 : (isFlashing ? 0 : [0, 0.68, 0.36, 0.60]) }}
                    transition={{ duration: 2.8, ease: 'easeInOut', times: [0, 0.28, 0.60, 1] }}
                    style={{
                      width: 600, height: 600,
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -55%)',
                      borderRadius: '50%',
                      background: `radial-gradient(ellipse at center, ${primaryColor}50 0%, ${secondaryColor}26 38%, transparent 68%)`,
                      filter: 'blur(36px)',
                    }}
                  />
                )}

                {/* Inner glow ring */}
                <motion.div className="absolute pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isFading ? 0 : (isFlashing ? 0 : [0, 0.55, 0.30, 0.48]),
                    scale:   isFading ? 1.2 : [0.8, 1.0, 0.95],
                  }}
                  transition={{ duration: 2.2, ease: 'easeInOut' }}
                  style={{
                    width: 350, height: 420,
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -52%)',
                    borderRadius: '50%',
                    background: `radial-gradient(ellipse at center, ${glowColor}40 0%, ${primaryColor}20 50%, transparent 78%)`,
                    filter: 'blur(20px)',
                  }}
                />

                {/* Entity image */}
                <motion.div
                  animate={isFading ? {} : {
                    filter: isFlashing ? 'none' : [
                      `drop-shadow(0 0 12px ${glowColor}80) drop-shadow(0 0 4px ${primaryColor}60)`,
                      `drop-shadow(0 0 30px ${glowColor}c8) drop-shadow(0 0 10px ${primaryColor}a0)`,
                      `drop-shadow(0 0 12px ${glowColor}80) drop-shadow(0 0 4px ${primaryColor}60)`,
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 1.9 }}
                >
                  {entityCutout ? (
                    <img src={entityCutout} alt={luminaryName}
                      style={{
                        width: ENT_W, height: ENT_H,
                        objectFit: 'contain', objectPosition: 'center',
                        display: 'block', background: 'transparent',
                      }}
                      draggable={false}
                    />
                  ) : (
                    <EntityArt size={ENT_W} />
                  )}
                </motion.div>

                {/* Name / domain / eminence badge */}
                <motion.div
                  className="flex flex-col items-center gap-1 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isFlashing ? 0 : (isFading ? 0 : 1) }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  {domain && (
                    <div className="text-[10px] font-bold tracking-[0.22em] uppercase"
                      style={{ color: primaryColor }}>{domain}</div>
                  )}
                  <div className="text-xl font-serif font-bold text-white drop-shadow-lg">
                    {luminaryName}
                  </div>
                  <div className="text-base font-bold px-3 py-0.5 rounded-full"
                    style={{ background: `${primaryColor}28`, color: primaryColor, border: `1px solid ${primaryColor}55` }}>
                    +{lumens} Eminence
                  </div>
                  {flavor && (
                    <div className="text-[11px] text-white/50 italic max-w-[260px] mt-1 leading-snug">
                      &ldquo;{flavor}&rdquo;
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
      {/* ── end camera plane ─────────────────────────────────────────────────── */}

      {/* ── Full-stage bloom flash — outside camera plane so it fills viewport ── */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div key="flash" className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.50, ease: 'easeOut' }}
            style={{
              background: 'radial-gradient(ellipse at 50% 44%, #ffffff 0%, #fff8dc 20%, #ffe566 44%, #ffaa22 64%, transparent 84%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Skip hint ─────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-xs text-white/28 tracking-widest uppercase pointer-events-none select-none">
        tap to skip
      </div>

    </div>
  );
}
