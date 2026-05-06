import React, { useEffect, useRef, useState } from 'react';
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
// Camera language: the board/camera layer travels to the card — the card never
// detaches from its board position. All FX ride inside the board-camera layer.
//
// Phase sequence (total ≈ 9.5 s):
//
//   establish   600ms  Board fully visible (overlay=0). Card glows/trembles at
//                       its real board position. Board layer pre-pans if the
//                       card is near or past a viewport edge.
//   focusing    800ms  Board camera scales toward the card's board position
//                       (transformOrigin pinned to card). Vessel fades in at
//                       the card's location. Board darkens (0→0.52). Card hidden.
//   intro       350ms  Camera at target scale; vessel lit and settling.
//   zooming     650ms  Camera holds; vessel locked and lit.
//   pressure    500ms  Vessel breathes with coloured glow — no cracks yet.
//   firstcrack  600ms  Primary vertical fault draws across the vessel.
//   leaking     550ms  White-gold energy bleeds through; junction glows.
//   cracking    900ms  Horizontal + diagonal branches. Energy rays burst
//                       through the crevices before the panels move.
//   shattering 1000ms  Camera returns to full-board view. Seven organic shards
//                       scatter. Pure cosmic light beneath — no card duplicate.
//   flashing    500ms  Full white-gold viewport bloom. Entity emerges.
//   revealed   2700ms  Freed entity centred in viewport over live board
//                       (overlay 0.52 so board reads as living backdrop).
//   fading      550ms  Entity ascends and dissolves.
//   done              → onComplete callback fires.
//
// Key invariants:
//   • The board camera layer uses transformOrigin='${boardCx}px ${boardCy}px'
//     (the card's exact viewport position) and animates ONLY scale — no x/y.
//     The card is therefore FIXED at (boardCx,boardCy) throughout the zoom;
//     the rest of the board scales away from it. No card-slides-to-centre.
//   • Glow lives INSIDE the camera layer so it scales with the card and stays
//     properly aligned as the camera pushes in.
//   • Vessel appears during focusing so the user sees the card growing in place
//     as the camera zooms — the board expands away from the card's position.
//   • Real [data-luminary-id] card is opacity=0 from focusing→fading (never
//     doubles with the vessel).
//   • During shattering the camera returns to scale=1; shards scatter from
//     the card's board position; entity appears centred in viewport.
//   • Entity is outside the camera layer, centred in viewport, larger than
//     the original card frame. Aura extends 560 px — no rectangular clipping.

type CutscenePhase =
  | 'establish' | 'panning' | 'focusing' | 'intro' | 'zooming'
  | 'pressure' | 'firstcrack' | 'leaking' | 'secondcrack' | 'cracking'
  | 'shattering' | 'flashing' | 'revealed' | 'fading' | 'done';

// Board-card dimensions: Tailwind w-28 h-40 = 112 × 160 px
const BOARD_CARD_W = 112;
const BOARD_CARD_H = 160;

// Freed entity display size (larger than original card frame)
const ENT_W = 320;
const ENT_H = Math.round(ENT_W * 1.43); // ≈ 458

// Fault-line junction pixel coords inside the vessel's SVG viewBox
// (viewBox matches BOARD_CARD_W × BOARD_CARD_H)
const FX = Math.round(BOARD_CARD_W * 0.50); // 56
const FY = Math.round(BOARD_CARD_H * 0.39); // 62

// Seven organic shard shapes using clip-path percentage coords.
// Together they tile the full card. Boundaries converge at the fault
// junction (50%, 39%) and four branch nodes:
//   top-split   (48%, 14%)   left-branch  (18%, 38%)
//   right-branch(72%, 41%)   lower-left   (36%, 74%)
//   lower-right (66%, 70%)
const PANEL_PIECES = [
  // Top-left main chunk
  { clip: 'polygon(0% 0%, 48% 0%, 48% 14%, 50% 39%, 18% 38%, 0% 35%)',   dx: -152, dy: -110, dr:  52 },
  // Top-right sliver
  { clip: 'polygon(48% 0%, 100% 0%, 100% 18%, 72% 41%, 50% 39%, 48% 14%)', dx:  145, dy: -126, dr: -44 },
  // Right column
  { clip: 'polygon(72% 41%, 100% 18%, 100% 58%, 66% 70%, 50% 39%)',        dx:  172, dy:   18, dr: -30 },
  // Left-mid wedge
  { clip: 'polygon(0% 35%, 18% 38%, 50% 39%, 66% 70%, 36% 74%, 0% 62%)',  dx: -162, dy:   24, dr:  36 },
  // Bottom-left
  { clip: 'polygon(0% 62%, 36% 74%, 40% 100%, 0% 100%)',                   dx: -110, dy:  145, dr:  62 },
  // Bottom-centre
  { clip: 'polygon(36% 74%, 66% 70%, 68% 100%, 40% 100%)',                 dx:    5, dy:  162, dr:  -9 },
  // Bottom-right
  { clip: 'polygon(66% 70%, 100% 58%, 100% 100%, 68% 100%)',               dx:  130, dy:  138, dr: -54 },
] as const;

const PHASE_DURATIONS: Record<CutscenePhase, number> = {
  establish:    600,
  panning:      750,  // board DOM pans as a unit toward the card (overlay=0)
  focusing:     600,  // camera layer zooms in on the now-centred card
  intro:        350,
  zooming:      650,
  pressure:     500,
  firstcrack:   750,  // primary fault + branch draw, then hold for suspense
  leaking:      850,  // energy bleeds through; sustained quiet-before-storm
  secondcrack:  650,  // second branch crack appears; faint rays start seeping
  cracking:    1100,  // multi-crack burst + full rays; accelerates into shatter
  shattering: 1000,
  flashing:    950,
  revealed:   4200,
  fading:      550,
  done:           0,
};

const PHASES: CutscenePhase[] = [
  'establish', 'panning', 'focusing', 'intro', 'zooming',
  'pressure', 'firstcrack', 'leaking', 'secondcrack', 'cracking',
  'shattering', 'flashing', 'revealed', 'fading', 'done',
];

export interface SummonQueueItem {
  id: string;
  name: string;
  domain: string;
  lumens: number;
  flavor: string;
  /** Viewport coords of the Luminary card's centre + width at trigger time */
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

  // Phase timer chain
  useEffect(() => {
    let idx = 0;
    let cancelled = false;
    function advance() {
      if (cancelled) return;
      idx++;
      const next = PHASES[idx] ?? 'done';
      setPhase(next);
      if (next !== 'done') setTimeout(advance, PHASE_DURATIONS[next]);
      else setTimeout(onComplete, 80);
    }
    const t = setTimeout(advance, PHASE_DURATIONS['establish']);
    return () => { cancelled = true; clearTimeout(t); };
  }, [onComplete]);

  // ── Phase booleans ────────────────────────────────────────────────────────
  const isEstablish  = phase === 'establish';
  const isPanning    = phase === 'panning';
  const isFocusing   = phase === 'focusing';
  const isIntro      = phase === 'intro';
  const isZooming    = phase === 'zooming';
  const isPressure   = phase === 'pressure';
  const isFirstCrack  = phase === 'firstcrack';
  const isLeaking     = phase === 'leaking';
  const isSecondCrack = phase === 'secondcrack';
  const isCracking    = phase === 'cracking';
  const isShattering  = phase === 'shattering' || phase === 'flashing';
  const isFlashing    = phase === 'flashing';
  const isRevealed    = phase === 'flashing' || phase === 'revealed' || phase === 'fading';
  const isRevealedActive = phase === 'revealed';
  const isFading      = phase === 'fading';
  // Vessel appears at intro — camera has fully arrived at the card by then.
  // Keeping it out of focusing prevents the proxy from overlapping the real card
  // during board-camera travel, which caused the "duplicate panning" artifact.
  const isVessel  = isIntro || isZooming || isPressure || isFirstCrack || isLeaking || isSecondCrack || isCracking;
  const hasCracks = isFirstCrack || isLeaking || isSecondCrack || isCracking;

  // Stores the board element's NATURAL top (before any pan transform is applied).
  // Needed to compute a correct transform-origin during the focusing scale phase,
  // since getBoundingClientRect() returns the panned position at that point.
  const mainTopNaturalRef = useRef<number>(0);

  // ── Viewport + board-card geometry ───────────────────────────────────────
  // Declared early so geometry values are available in the useEffects below.
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 375;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 667;
  const boardCx = cardRect ? cardRect.cx : vw / 2;
  const boardCy = cardRect ? cardRect.cy : vh / 2;

  // ── Suppress + tremble the real board Luminary card ─────────────────────
  // Visible during establish + panning + focusing (board is the star).
  // Hidden from intro onward when the vessel proxy takes over.
  // Tremble class (CSS individual translate/rotate) applies during those
  // visible phases so the card shakes from the very first frame.
  useEffect(() => {
    const el = document.querySelector(
      `[data-luminary-id="${luminaryId}"]`
    ) as HTMLElement | null;
    if (!el) return;
    const hide = phase !== 'establish' && phase !== 'panning' && phase !== 'focusing' && phase !== 'done';
    // Smooth cross-fade with vessel: a CSS transition prevents the hard blink
    // that occurs when the real card disappears and the vessel fades in at intro.
    el.style.transition = hide ? 'opacity 0.24s ease' : 'opacity 0s';
    el.style.opacity = hide ? '0' : '';
    // Tremble during board-visible phases; vessel's own shake takes over at intro
    const tremble = phase === 'establish' || phase === 'panning' || phase === 'focusing';
    el.classList.toggle('luminary-tremble', tremble);
    return () => {
      el.style.opacity = '';
      el.style.transition = '';
      el.classList.remove('luminary-tremble');
    };
  }, [phase, luminaryId]);

  // ── Board DOM pan — travels the real game board toward the Luminary ───────
  // Applies a CSS transform to [data-game-board] so the user sees the entire
  // board sliding as a unit during 'panning'. Overlay stays at 0 so the real
  // board is fully visible while the camera travels. Restored during shattering.
  useEffect(() => {
    const el = document.querySelector('[data-game-board]') as HTMLElement | null;
    if (!el) return;
    const panX = vw / 2 - boardCx;
    const panY = vh / 2 - boardCy;

    const ts = Math.min((vw * 0.65) / BOARD_CARD_W, (vh * 0.65) / BOARD_CARD_H, 3.8);
    const originX = boardCx; // element has no x offset

    if (phase === 'establish' || phase === 'done') {
      el.style.transition      = '';
      el.style.transform       = '';
      el.style.transformOrigin = '';
    } else if (phase === 'panning') {
      // No transform on element yet — getBoundingClientRect gives the natural top.
      mainTopNaturalRef.current = el.getBoundingClientRect().top;
      const originY = boardCy - mainTopNaturalRef.current;
      el.style.transition      = 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transformOrigin = `${originX}px ${originY}px`;
      el.style.transform       = `translate(${panX}px, ${panY}px)`;
    } else if (phase === 'focusing') {
      // At this point the panning translate is already on the element, so
      // getBoundingClientRect().top = mainTop_natural + panY.
      // Use the ref (measured during panning) for the correct natural top.
      const originY = boardCy - mainTopNaturalRef.current;
      el.style.transition      = 'transform 0.70s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transformOrigin = `${originX}px ${originY}px`;
      el.style.transform       = `translate(${panX}px, ${panY}px) scale(${ts})`;
    } else if (isShattering || isRevealed || isFading) {
      el.style.transition      = 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transform       = '';
      el.style.transformOrigin = '';
    } else {
      // intro through cracking: hold at panned+zoomed position
      const originY = boardCy - mainTopNaturalRef.current;
      el.style.transition      = '';
      el.style.transformOrigin = `${originX}px ${originY}px`;
      el.style.transform       = `translate(${panX}px, ${panY}px) scale(${ts})`;
    }

    return () => {
      el.style.transform       = '';
      el.style.transition      = '';
      el.style.transformOrigin = '';
    };
  }, [phase, boardCx, boardCy, vw, vh, isShattering, isRevealed, isFading]);

  // ── Overlay opacity ───────────────────────────────────────────────────────
  const overlayOpacity =
    isEstablish      ? 0    :
    isPanning        ? 0    :   // board fully visible while camera travels
    isFocusing       ? 0    :   // board still visible — whole scene zooms in
    isFlashing       ? 0.32 :
    isRevealedActive ? 0.52 :
    isFading         ? 0    :
    0.88;

  // Scale so board card fills ~65 % of shorter viewport axis
  const targetScale = Math.min(
    (vw * 0.65) / BOARD_CARD_W,
    (vh * 0.65) / BOARD_CARD_H,
    3.8,
  );

  // Camera: pure scale centred on viewport centre.
  // By the time the camera zooms in, the board has already panned so the card
  // is at (vw/2, vh/2). Scaling around the viewport centre therefore zooms
  // directly into the card without any additional translate.
  const camZoomed =
    isFocusing || isIntro || isZooming ||
    isPressure || isFirstCrack || isLeaking || isCracking;
  const camScale = camZoomed ? targetScale : 1;

  // ── Shake profile (internal-pressure trembling, replaces scale-pulse) ───────
  // Six intensity levels: intro/zooming → pressure → firstcrack → leaking → secondcrack → cracking.
  // Irregular keyframe arrays make the motion feel non-rhythmic / organic.
  const shakeDur = isCracking ? 0.08 : isSecondCrack ? 0.09 : isLeaking ? 0.10 : isFirstCrack ? 0.11 : isPressure ? 0.12 : 0.13;
  const glowDur  = isCracking ? 0.40 : isSecondCrack ? 0.48 : isLeaking ? 0.55 : isFirstCrack ? 0.65 : isPressure ? 0.75 : 0.80;
  const shakeX: number[] = isCracking
    ? [-4, 2.5, -1.8, 4.2, -2.2, 1.5, -3, 0]
    : isSecondCrack
      ? [-3.5, 2.2, -1.5, 3.8, -2, 1.3, -2.5, 0]
      : isLeaking
        ? [-3, 2, -1.5, 3.5, -1.8, 1.2, 0]
        : isFirstCrack
          ? [-2.5, 1.8, -1, 2.8, -1.5, 0.8, 0]
          : isPressure
            ? [-2, 1.5, -0.9, 2.2, -1.2, 0.7, 0]
            : [-1.5, 1, -0.8, 1.8, -1, 0.5, 0];
  const shakeY: number[] = isCracking
    ? [1.5, -2.5, 2, -1, 2.5, -1.5, 1, 0]
    : isSecondCrack
      ? [1.2, -2.2, 1.8, -0.9, 2.2, -1.4, 0.8, 0]
      : isLeaking
        ? [1, -2, 1.5, -0.8, 2, -1.2, 0]
        : isFirstCrack
          ? [0.8, -1.5, 1.2, -0.6, 1.5, -1, 0]
          : isPressure
            ? [0.6, -1.2, 1, -0.5, 1.3, -0.8, 0]
            : [0.5, -1, 0.8, -0.4, 1, -0.6, 0];
  const shakeR: number[] = isCracking
    ? [-0.8, 0.5, -1, 0.6, -0.5, 0.4, -0.7, 0]
    : isSecondCrack
      ? [-0.7, 0.45, -0.9, 0.55, -0.45, 0.35, -0.6, 0]
      : isLeaking
        ? [-0.6, 0.4, -0.8, 0.5, -0.4, 0.3, 0]
        : isFirstCrack
          ? [-0.5, 0.3, -0.6, 0.4, -0.3, 0.2, 0]
          : isPressure
            ? [-0.35, 0.25, -0.45, 0.3, -0.2, 0.15, 0]
            : [-0.25, 0.18, -0.3, 0.2, -0.15, 0.12, 0];

  // ── Vessel glow (ramps through crack phases) ─────────────────────────────
  const vesselGlow: [string, string, string] = isPressure
    ? [`0 0 10px ${primaryColor}60`, `0 0 24px ${primaryColor}90`, `0 0 10px ${primaryColor}60`]
    : isFirstCrack
      ? [`0 0 14px ${primaryColor}80`, `0 0 32px ${primaryColor}b0`, `0 0 14px ${primaryColor}80`]
      : isLeaking
        ? [`0 0 20px ${primaryColor}a0`, `0 0 42px ${primaryColor}d0, 0 0 12px #ffe8a050`, `0 0 20px ${primaryColor}a0`]
        : isSecondCrack
          ? [`0 0 22px ${primaryColor}b0`, `0 0 48px ${primaryColor}e0, 0 0 16px #ffe8a068`, `0 0 22px ${primaryColor}b0`]
          : [`0 0 26px ${primaryColor}c0`, `0 0 52px ${primaryColor}f0, 0 0 18px #ffe8a080`, `0 0 26px ${primaryColor}c0`];

  // Vessel is positioned at viewport centre — the board pan brings the card
  // there before the vessel appears, so they perfectly overlap.
  const vesselLeft = vw / 2 - BOARD_CARD_W / 2;
  const vesselTop  = vh / 2 - BOARD_CARD_H / 2;

  return (
    <div className="fixed inset-0 z-[9000] cursor-pointer" onClick={onComplete}>

      {/* ── Dark overlay ──────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: overlayOpacity }}
        transition={{ duration: 0.65, ease: 'easeInOut' }}
        style={{ background: 'rgba(4,2,16,1)' }}
      />

      {/* ── Glow on real board card — outside camera layer ────────────────── */}
      {/* Anchored at the card's original viewport position during establish.   */}
      {/* Exits before panning so it doesn't drift from the moving card.        */}
      <AnimatePresence>
        {isEstablish && (
          <motion.div
            key="boardglow"
            className="absolute pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.50, 0.85, 0.40, 0.92, 0.45, 0.88, 0.55],
              x: [0, -2.5, 1.5, -1.0, 2.8, -1.5,  0.8, 0],
              y: [0,  1.2, -1.8, 0.5, -1.5, 1.8, -0.8, 0],
              rotate: [0, -0.4, 0.3, -0.5, 0.2, -0.4, 0.3, 0],
            }}
            exit={{ opacity: 0, rotate: 0, transition: { duration: 0.18 } }}
            transition={{ repeat: Infinity, duration: 0.28, ease: 'linear' }}
            style={{
              left: (cardRect ? cardRect.cx : vw / 2) - BOARD_CARD_W / 2 - 8,
              top:  (cardRect ? cardRect.cy : vh / 2) - BOARD_CARD_H / 2 - 8,
              width:  BOARD_CARD_W + 16,
              height: BOARD_CARD_H + 16,
              borderRadius: 14,
              boxShadow: `0 0 18px ${primaryColor}70, 0 0 42px ${primaryColor}40, 0 0 8px #ffe8a022`,
              background: `radial-gradient(ellipse at center, ${primaryColor}20 0%, transparent 72%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Board camera layer ────────────────────────────────────────────── */}
      {/* transformOrigin is viewport centre — the board pan already brought   */}
      {/* the card there, so pure scale zooms directly into the card with no   */}
      {/* additional translate and no card-slides-to-centre behaviour.         */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ transformOrigin: `${vw / 2}px ${vh / 2}px` }}
        animate={{ scale: camScale }}
        transition={{ duration: 0.88, ease: [0.16, 1, 0.3, 1] }}
      >

        {/* ── Sealed vessel — board-card sized, anchored at its board spot ── */}
        {/* Styled to match LuminaryCard exactly so the switch is seamless:     */}
        {/*   rounded-xl (12px) · bg-black · LuminaryPanelArt interior ·        */}
        {/*   from-black/20 via-black/10 to-black/90 gradient · ring+shadow-xl  */}
        <AnimatePresence>
          {isVessel && (
            <motion.div
              key="vessel"
              className="absolute overflow-hidden bg-black"
              style={{
                left: vesselLeft,
                top:  vesselTop,
                width:  BOARD_CARD_W,
                height: BOARD_CARD_H,
                borderRadius: 12,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: shakeX,
                y: shakeY,
                rotate: shakeR,
                boxShadow: (isPressure || hasCracks)
                  ? (vesselGlow as unknown as string)
                  : '0 0 0 1px rgba(0,0,0,0.3), 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              }}
              exit={{ scale: 1.12, opacity: 0, x: 0, y: 0, rotate: 0, transition: { duration: 0.30, ease: 'easeIn' } }}
              transition={{
                scale:     { duration: 0.26 },
                opacity:   { duration: 0.28 },
                x:         { repeat: Infinity, duration: shakeDur, ease: 'linear' },
                y:         { repeat: Infinity, duration: shakeDur, ease: 'linear' },
                rotate:    { repeat: Infinity, duration: shakeDur, ease: 'linear' },
                boxShadow: { repeat: Infinity, duration: glowDur,  ease: 'easeInOut' },
              }}
            >
              {/* Identical interior to LuminaryCard — same component, same props */}
              <LuminaryPanelArt luminaryId={luminaryId} size={BOARD_CARD_W} />
              {/* Same dark gradient the board card overlays for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 pointer-events-none" />

              {/* ── Crack-light SVG overlay ────────────────────────────── */}
              {hasCracks && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${BOARD_CARD_W} ${BOARD_CARD_H}`}
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    {/* Tight bloom: on crisp crack lines */}
                    <filter id="cgb" x="-60%" y="-60%" width="220%" height="220%">
                      <feGaussianBlur stdDeviation="1.8" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    {/* Wide wound glow: seam ambience + diffuse blob — no crisp edge */}
                    <filter id="crackglow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="10" />
                    </filter>
                    {/* Ray gradients: defined once secondcrack starts and persist */}
                    {(isSecondCrack || isCracking) && (
                      <>
                        <linearGradient id="rayUp" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#ffe8a0" stopOpacity="0.92" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rayDown" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffe8a0" stopOpacity="0.92" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rayLeft" x1="1" y1="0" x2="0" y2="0">
                          <stop offset="0%" stopColor="#ffe8a0" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rayRight" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#ffe8a0" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                      </>
                    )}
                  </defs>

                  {/* ── Seam wound glow — wide diffuse warmth along the fault lines ── */}
                  {/* Painted first (below crack lines) so it reads as heat/pressure    */}
                  {/* escaping through the vessel wall, not an overlay placed on top.   */}
                  <motion.path
                    d={`M${FX},0 L${FX-7},${Math.round(FY*0.63)} L${FX},${FY} L${FX+7},${Math.round(FY*1.58)} L${FX-4},${BOARD_CARD_H}`}
                    stroke="#ffe8a0" strokeWidth="26" fill="none" strokeLinecap="round"
                    filter="url(#crackglow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.09, 0.14, 0.10] }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={`M${FX},${FY} L${Math.round(BOARD_CARD_W*0.72)},${Math.round(FY*0.44)} L${Math.round(BOARD_CARD_W*0.90)},${Math.round(FY*0.10)}`}
                    stroke="#ffe8a0" strokeWidth="18" fill="none" strokeLinecap="round"
                    filter="url(#crackglow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.07, 0.11] }}
                    transition={{ duration: 0.14, delay: 0.05, ease: 'easeOut' }}
                  />

                  {/* ── Primary vertical fault — thick, prominent (firstcrack+) ── */}
                  <motion.path
                    d={`M${FX},0 L${FX-7},${Math.round(FY*0.63)} L${FX},${FY} L${FX+7},${Math.round(FY*1.58)} L${FX-4},${BOARD_CARD_H}`}
                    stroke="white" strokeWidth="2.4" fill="none" filter="url(#cgb)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.92, 1.0] }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={`M${FX},0 L${FX-7},${Math.round(FY*0.63)} L${FX},${FY} L${FX+7},${Math.round(FY*1.58)} L${FX-4},${BOARD_CARD_H}`}
                    stroke="#ffe8a0" strokeWidth="9" fill="none" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.30, 0.52] }}
                    transition={{ duration: 0.14, delay: 0.02, ease: 'easeOut' }}
                  />

                  {/* ── Branch 1: upper-right diagonal from junction (firstcrack+) ── */}
                  <motion.path
                    d={`M${FX},${FY} L${Math.round(BOARD_CARD_W*0.72)},${Math.round(FY*0.44)} L${Math.round(BOARD_CARD_W*0.90)},${Math.round(FY*0.10)}`}
                    stroke="white" strokeWidth="1.6" fill="none" filter="url(#cgb)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.78, 0.92] }}
                    transition={{ duration: 0.13, delay: 0.05, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={`M${FX},${FY} L${Math.round(BOARD_CARD_W*0.72)},${Math.round(FY*0.44)} L${Math.round(BOARD_CARD_W*0.90)},${Math.round(FY*0.10)}`}
                    stroke="#ffe8a0" strokeWidth="6" fill="none" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.22, 0.42] }}
                    transition={{ duration: 0.13, delay: 0.06, ease: 'easeOut' }}
                  />

                  {/* ── Organic light leaking through crack crevices (leaking+) ── */}
                  {/* No crisp circles or radar rings. A diffuse, heavily blurred blob  */}
                  {/* at the junction reads as trapped radiance, not a UI indicator.     */}
                  {/* Ember motes (r≤1.5) at irregular positions with long staggered     */}
                  {/* flicker cycles (2.5–3.6 s) shimmer like embers, not a pulse.      */}
                  {(isLeaking || isSecondCrack || isCracking) && (
                    <>
                      {/* Diffuse light pool — r=22 + stdDeviation=10 ≈ 42 px soft edge */}
                      <motion.circle cx={FX} cy={FY} r="22" fill="#fff6e0"
                        filter="url(#crackglow)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.22, 0.14, 0.28, 0.16, 0.24] }}
                        transition={{ duration: 3.8, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror' }}
                      />
                      {/* Mote 1 — upper crack */}
                      <motion.circle cx={FX-3} cy={18} r="1.2" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.70, 0.10, 0.85, 0.20, 0.60, 0] }}
                        transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity, delay: 0.00 }}
                      />
                      {/* Mote 2 — upper-mid crack */}
                      <motion.circle cx={FX+2} cy={38} r="0.9" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.50, 0.80, 0.10, 0.70, 0.30, 0] }}
                        transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity, delay: 0.35 }}
                      />
                      {/* Mote 3 — junction */}
                      <motion.circle cx={FX} cy={FY} r="1.5" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.90, 0.30, 0.65, 0.10, 0.80, 0] }}
                        transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity, delay: 0.65 }}
                      />
                      {/* Mote 4 — lower-mid crack */}
                      <motion.circle cx={FX+4} cy={98} r="1.0" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.40, 0.90, 0.20, 0.70, 0.10, 0] }}
                        transition={{ duration: 3.6, ease: 'easeInOut', repeat: Infinity, delay: 0.18 }}
                      />
                      {/* Mote 5 — lower crack */}
                      <motion.circle cx={FX-2} cy={138} r="1.1" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.60, 0.10, 0.80, 0.30, 0.50, 0] }}
                        transition={{ duration: 2.9, ease: 'easeInOut', repeat: Infinity, delay: 0.80 }}
                      />
                    </>
                  )}

                  {/* ── Branch 2: lower-left diagonal from junction (secondcrack+) ── */}
                  {(isSecondCrack || isCracking) && (
                    <>
                      {/* Seam wound glow for branch 2 */}
                      <motion.path
                        d={`M${FX},${FY} L${Math.round(BOARD_CARD_W*0.28)},${Math.round(BOARD_CARD_H*0.62)} L${Math.round(BOARD_CARD_W*0.12)},${Math.round(BOARD_CARD_H*0.90)}`}
                        stroke="#ffe8a0" strokeWidth="18" fill="none" strokeLinecap="round"
                        filter="url(#crackglow)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.07, 0.11] }}
                        transition={{ duration: 0.60, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${FX},${FY} L${Math.round(BOARD_CARD_W*0.28)},${Math.round(BOARD_CARD_H*0.62)} L${Math.round(BOARD_CARD_W*0.12)},${Math.round(BOARD_CARD_H*0.90)}`}
                        stroke="white" strokeWidth="1.5" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.75, 0.90] }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${FX},${FY} L${Math.round(BOARD_CARD_W*0.28)},${Math.round(BOARD_CARD_H*0.62)} L${Math.round(BOARD_CARD_W*0.12)},${Math.round(BOARD_CARD_H*0.90)}`}
                        stroke="#ffe8a0" strokeWidth="6" fill="none" strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.20, 0.36] }}
                        transition={{ duration: 0.55, delay: 0.05, ease: 'easeOut' }}
                      />
                      {/* Ember motes along branch 2 */}
                      <motion.circle cx={Math.round(BOARD_CARD_W*0.44)} cy={Math.round(BOARD_CARD_H*0.52)} r="1.0" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.60, 0.10, 0.75, 0.20, 0] }}
                        transition={{ duration: 3.0, ease: 'easeInOut', repeat: Infinity, delay: 0.10 }}
                      />
                      <motion.circle cx={Math.round(BOARD_CARD_W*0.26)} cy={Math.round(BOARD_CARD_H*0.72)} r="0.8" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.40, 0.80, 0.15, 0.60, 0] }}
                        transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity, delay: 0.50 }}
                      />
                      {/* Faint rays seeping through at secondcrack */}
                      <motion.line x1={FX} y1={FY} x2={FX} y2={0}
                        stroke="url(#rayUp)" strokeWidth="1.8"
                        animate={{ opacity: [0, 0.38, 0.18, 0.44, 0.14] }}
                        transition={{ repeat: Infinity, duration: 0.58, ease: 'easeOut' }}
                        style={{ transformOrigin: `${FX}px ${FY}px` }}
                      />
                      <motion.line x1={FX} y1={FY} x2={FX} y2={BOARD_CARD_H}
                        stroke="url(#rayDown)" strokeWidth="1.8"
                        animate={{ opacity: [0, 0.30, 0.14, 0.38, 0.10] }}
                        transition={{ repeat: Infinity, duration: 0.66, ease: 'easeOut', delay: 0.14 }}
                        style={{ transformOrigin: `${FX}px ${FY}px` }}
                      />
                    </>
                  )}

                  {/* ── Multi-crack burst + full energy rays (cracking phase) ── */}
                  {isCracking && (
                    <>
                      {/* Horizontal branch across junction */}
                      <motion.path
                        d={`M0,${FY} L${Math.round(FX*0.44)},${FY-10} L${FX},${FY} L${FX+Math.round(FX*0.76)},${FY+11} L${BOARD_CARD_W},${FY+4}`}
                        stroke="white" strokeWidth="0.9" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.36, 0.58] }}
                        transition={{ duration: 0.60, ease: 'easeOut' }}
                      />
                      {/* Bottom-left diagonal */}
                      <motion.path
                        d={`M0,${Math.round(BOARD_CARD_H*0.80)} L${Math.round(FX*0.68)},${Math.round(FY*1.80)} L${FX-3},${BOARD_CARD_H}`}
                        stroke="white" strokeWidth="0.65" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.20, 0.40] }}
                        transition={{ duration: 0.55, delay: 0.18, ease: 'easeOut' }}
                      />
                      {/* Top-right minor crack */}
                      <motion.path
                        d={`M${BOARD_CARD_W},${Math.round(BOARD_CARD_H*0.17)} L${Math.round(FX*1.44)},${Math.round(FY*0.74)} L${FX},${FY}`}
                        stroke="white" strokeWidth="0.60" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.22, 0.44] }}
                        transition={{ duration: 0.55, delay: 0.30, ease: 'easeOut' }}
                      />
                      {/* Full energy rays */}
                      <motion.line x1={FX} y1={FY} x2={FX} y2={0}
                        stroke="url(#rayUp)" strokeWidth="2.8"
                        animate={{ opacity: [0, 0.72, 0.45, 0.78, 0.32], scaleY: [0, 1, 0.9, 1] }}
                        transition={{ repeat: Infinity, duration: 0.46, ease: 'easeOut' }}
                        style={{ transformOrigin: `${FX}px ${FY}px` }}
                      />
                      <motion.line x1={FX} y1={FY} x2={FX} y2={BOARD_CARD_H}
                        stroke="url(#rayDown)" strokeWidth="2.8"
                        animate={{ opacity: [0, 0.62, 0.40, 0.70, 0.28], scaleY: [0, 1, 0.9, 1] }}
                        transition={{ repeat: Infinity, duration: 0.52, ease: 'easeOut', delay: 0.11 }}
                        style={{ transformOrigin: `${FX}px ${FY}px` }}
                      />
                      <motion.line x1={FX} y1={FY} x2={0} y2={FY}
                        stroke="url(#rayLeft)" strokeWidth="1.8"
                        animate={{ opacity: [0, 0.44, 0.18, 0.52, 0.16] }}
                        transition={{ repeat: Infinity, duration: 0.58, ease: 'easeInOut', delay: 0.21 }}
                      />
                      <motion.line x1={FX} y1={FY} x2={BOARD_CARD_W} y2={FY+4}
                        stroke="url(#rayRight)" strokeWidth="1.8"
                        animate={{ opacity: [0, 0.36, 0.16, 0.48, 0.14] }}
                        transition={{ repeat: Infinity, duration: 0.54, ease: 'easeInOut', delay: 0.34 }}
                      />
                      {/* Non-repeating junction flare: fires once on cracking entry.   */}
                      {/* A burst of convergent light — organic, not a pulsing marker.  */}
                      <motion.circle cx={FX} cy={FY} r="16" fill="#fff6e0"
                        filter="url(#crackglow)"
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: [0, 0.50, 0.22], scale: [0.3, 1.6, 1.0] }}
                        transition={{ duration: 0.65, ease: 'easeOut' }}
                      />
                    </>
                  )}
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cosmic light beneath shattering panels ────────────────────── */}
        {/* Pure white-gold light only — no duplicate card or portrait.       */}
        <AnimatePresence>
          {isShattering && (
            <motion.div key="cosmiclight" className="absolute pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: isFlashing ? 0 : [0, 0.68, 0.85] }}
              exit={{ opacity: 0, transition: { duration: 0.10 } }}
              transition={{ duration: 0.40, ease: 'easeOut' }}
              style={{
                width: BOARD_CARD_W * 2.8, height: BOARD_CARD_H * 2.8,
                left: vesselLeft + BOARD_CARD_W / 2 - BOARD_CARD_W * 1.4,
                top:  vesselTop  + BOARD_CARD_H / 2 - BOARD_CARD_H * 1.4,
                background: 'radial-gradient(ellipse 36% 40% at 50% 38%, #ffffff 0%, #fff8e0 20%, #ffe566 42%, #ffa52088 64%, transparent 82%)',
                filter: 'blur(5px)',
                borderRadius: '50%',
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Seven organic shard pieces ────────────────────────────────── */}
        {/* Camera is returning to scale=1 during shattering, so dx/dy values */}
        {/* are real viewport pixels. No card art beneath — only cosmic light. */}
        <AnimatePresence>
          {isShattering && PANEL_PIECES.map((piece, i) => (
            <motion.div key={`shard-${i}`} className="absolute pointer-events-none"
              style={{
                width: BOARD_CARD_W, height: BOARD_CARD_H,
                left: vesselLeft, top: vesselTop,
                clipPath: piece.clip,
                borderRadius: 10,
              }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1, filter: 'brightness(1)' }}
              animate={{
                x: piece.dx, y: piece.dy, rotate: piece.dr,
                opacity: [1, 1, 0.52, 0],
                filter: ['brightness(1)', 'brightness(2.6)', 'brightness(4.2)', 'brightness(7)'],
              }}
              transition={{
                duration: 1.08, ease: [0.18, 0.85, 0.32, 1], delay: i * 0.036,
                opacity: { duration: 1.08, times: [0, 0.18, 0.58, 1] },
                filter:  { duration: 1.08, times: [0, 0.22, 0.58, 1] },
              }}
            >
              {panelArt ? (
                <img src={panelArt} alt="" aria-hidden
                  style={{
                    width: BOARD_CARD_W, height: BOARD_CARD_H,
                    objectFit: 'cover', objectPosition: 'center top',
                    display: 'block', borderRadius: 10,
                  }}
                  draggable={false}
                />
              ) : (
                <LuminaryPanelArt luminaryId={luminaryId} size={BOARD_CARD_W} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

      </motion.div>
      {/* ── end board camera layer ────────────────────────────────────────── */}

      {/* ── Full-viewport bloom flash — outside camera layer ────────────────── */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div key="flash" className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 1, 0] }}
            transition={{ duration: 0.88, ease: 'easeInOut', times: [0, 0.28, 1] }}
            style={{
              background: 'radial-gradient(ellipse at 50% 42%, #ffffff 0%, #fff8dc 22%, #ffe566 46%, #ffaa22 66%, transparent 86%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Board vignette dimmer — dims edges, keeps entity focal ─────────────── */}
      {/* Radial gradient: lighter at center (entity zone), darker at edges.      */}
      {/* Hides any residual semi-transparent tint from baked-in asset glow.      */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            key="boarddim"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isFading ? 0 : (isFlashing ? 0 : 1) }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{
              background: 'radial-gradient(ellipse 54% 58% at 50% 42%, rgba(0,0,10,0.22) 0%, rgba(0,0,10,0.70) 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Freed entity — centred in viewport over live board ───────────────── */}
      {/* The board is at scale=1 and visible through the partial overlay.       */}
      {/* Entity is larger than the original card frame; aura extends 560 px.   */}
      {/* No rectangular card border, no clip — pure transparent-background art. */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            key="entity"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ overflow: 'visible' }}
            initial={{ opacity: 0 }}
            animate={isFading ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: isFading ? 0.55 : 0.42, ease: isFading ? 'easeIn' : 'easeOut' }}
          >
            {/* Entrance scale + fly-in */}
            <motion.div
              className="relative flex flex-col items-center"
              style={{ overflow: 'visible' }}
              initial={{ scale: 0.52, y: 30 }}
              animate={isFading
                ? { scale: 1.14, y: -38 }
                : { scale: [0.52, 1.18, 1.06, 1.0], y: [30, -7, 0] }
              }
              transition={isFading
                ? { duration: 0.55, ease: 'easeIn' }
                : {
                    scale: { duration: 1.82, times: [0, 0.50, 0.78, 1], ease: 'easeOut' },
                    y:     { duration: 1.42, ease: [0.22, 1, 0.36, 1] },
                  }
              }
            >
              {/* Breathing hover (begins after entrance settles) */}
              <motion.div
                className="relative flex flex-col items-center gap-4"
                style={{ overflow: 'visible' }}
                animate={isFading ? {} : { y: [0, -10, 0], scale: [1, 1.018, 1] }}
                transition={isFading ? {} : {
                  y:     { repeat: Infinity, duration: 3.4, ease: 'easeInOut', delay: 1.9 },
                  scale: { repeat: Infinity, duration: 4.0, ease: 'easeInOut', delay: 1.9 },
                }}
              >
                {/* Wide aura — 560 px, well beyond card bounds, no clipping */}
                {auraLayer ? (
                  <motion.img src={auraLayer} alt="" aria-hidden
                    className="absolute pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isFading ? 0 : (isFlashing ? 0 : [0, 0.76, 0.46, 0.70]) }}
                    transition={{ duration: 2.8, ease: 'easeInOut', times: [0, 0.28, 0.60, 1] }}
                    style={{
                      width: 560, height: 560,
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -56%)',
                      objectFit: 'contain', mixBlendMode: 'screen',
                    }}
                    draggable={false}
                  />
                ) : (
                  <motion.div className="absolute pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isFading ? 0 : (isFlashing ? 0 : [0, 0.62, 0.32, 0.56]) }}
                    transition={{ duration: 2.8, ease: 'easeInOut', times: [0, 0.28, 0.60, 1] }}
                    style={{
                      width: 560, height: 560,
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -56%)',
                      borderRadius: '50%',
                      background: `radial-gradient(ellipse at center, ${primaryColor}58 0%, ${secondaryColor}2c 40%, transparent 70%)`,
                      filter: 'blur(40px)',
                    }}
                  />
                )}

                {/* Inner glow ring — radial only, no rectangular clip */}
                <motion.div className="absolute pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isFading ? 0 : (isFlashing ? 0 : [0, 0.50, 0.26, 0.44]),
                    scale:   isFading ? 1.28 : [0.82, 1.02, 0.96],
                  }}
                  transition={{ duration: 2.2, ease: 'easeInOut' }}
                  style={{
                    width: 320, height: 400,
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -53%)',
                    borderRadius: '50%',
                    background: `radial-gradient(ellipse at center, ${glowColor}48 0%, ${primaryColor}22 52%, transparent 80%)`,
                    filter: 'blur(22px)',
                  }}
                />

                {/* Entity image — must be a transparent-background cutout */}
                {/* If the asset contains a baked-in rectangular glow, regenerate */}
                {/* it as a true transparent silhouette PNG/WebP (see asset notes). */}
                <motion.div
                  animate={isFading ? {} : {
                    filter: isFlashing ? 'none' : [
                      `drop-shadow(0 0 10px ${glowColor}80) drop-shadow(0 0 4px ${primaryColor}55)`,
                      `drop-shadow(0 0 28px ${glowColor}cc) drop-shadow(0 0 10px ${primaryColor}a0)`,
                      `drop-shadow(0 0 10px ${glowColor}80) drop-shadow(0 0 4px ${primaryColor}55)`,
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut', delay: 1.9 }}
                >
                  {entityCutout ? (
                    <img src={entityCutout} alt={luminaryName}
                      style={{
                        width: ENT_W, height: ENT_H,
                        objectFit: 'contain', objectPosition: 'center',
                        display: 'block', background: 'transparent',
                        // Runtime edge-fade mask: entity.webp assets contain a baked-in
                        // rectangular semi-transparent glow that reaches all four edges
                        // (measured alpha ≈ 43–70% at corners/edges). This radial mask
                        // fades the outermost ~20% of the image to transparent so the
                        // entity reads as a floating form rather than a portrait inside
                        // a card-shaped rectangle.
                        // TODO: regenerate entity assets as true transparent-background
                        // cutouts (no baked-in glow rectangle, no background fill) to
                        // make this mask unnecessary and preserve edge detail fully.
                        maskImage: 'radial-gradient(ellipse 84% 90% at 50% 44%, black 55%, rgba(0,0,0,0.55) 73%, transparent 91%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 84% 90% at 50% 44%, black 55%, rgba(0,0,0,0.55) 73%, transparent 91%)',
                      }}
                      draggable={false}
                    />
                  ) : (
                    <EntityArt size={ENT_W} />
                  )}
                </motion.div>

                {/* Name / domain / Eminence badge */}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip hint ─────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-xs text-white/28 tracking-widest uppercase pointer-events-none select-none">
        tap to skip
      </div>

    </div>
  );
}
