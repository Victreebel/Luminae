import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';
import { gameAudio } from './audio';

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
//   lum_ember   lum_tide    lum_verdant lum_void    lum_radiant lum_astral
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

// ── Verdant Oracle ────────────────────────────────────────────────────────────
// Verdant oracle: wide squat body, geological crystal dome head, massive root arms.
function VerdantEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
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
  lum_verdant: { id: 'lum_verdant', primaryColor: '#2ecc71', secondaryColor: '#166534', glowColor: 'rgba(46,204,113,0.55)',  EntityArt: VerdantEntity },
  lum_void:    { id: 'lum_void',    primaryColor: '#7c3aed', secondaryColor: '#0a0a14', glowColor: 'rgba(124,58,237,0.55)',  EntityArt: VoidEntity    },
  lum_radiant: { id: 'lum_radiant', primaryColor: '#e2e8f0', secondaryColor: '#2ecc71', glowColor: 'rgba(226,232,240,0.5)',  EntityArt: RadiantEntity },
  lum_astral:  { id: 'lum_astral',  primaryColor: '#ef4444', secondaryColor: '#3d6bff', glowColor: 'rgba(239,68,68,0.55)',   EntityArt: AstralEntity  },
  lum_forge:   { id: 'lum_forge',   primaryColor: '#166534', secondaryColor: '#1c1917', glowColor: 'rgba(22,101,52,0.6)',    EntityArt: ForgeEntity   },
  lum_pale:    { id: 'lum_pale',    primaryColor: '#94a3b8', secondaryColor: '#0a0a14', glowColor: 'rgba(148,163,184,0.5)',  EntityArt: PaleEntity    },
  lum_bloom:   { id: 'lum_bloom',   primaryColor: '#4ade80', secondaryColor: '#7f1d1d', glowColor: 'rgba(74,222,128,0.55)',  EntityArt: BloomEntity   },
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
//   shattering 1000ms  Camera returns to full-board view. Nine irregular crystal
//                       polygon chunks scatter. D/E/F dissolve toward viewer.
//   flashing    500ms  Full Luminary-themed viewport bloom. Entity emerges.
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

// Idle-state entity overlay: sits directly over the claimed Luminary panel card.
// Width matches the card; height is 1.1× the card so the full portrait figure
// is visible without cropping.  The overlay is centred on the card centre so
// the entity fills the card area; a mask gradient fades the lower portion so
// the card's name / requirements row remains legible underneath.
const IDLE_W = BOARD_CARD_W;                     // 112
const IDLE_H = Math.round(BOARD_CARD_H * 1.1);   // ≈ 176

// ── Six-Chunk Crystal Shatter Geometry ───────────────────────────────────────
// Card viewport: 112 × 160 px.  All coords are raw pixels.
//
// Design: two main cracks + branches divide the panel into 6 large readable
// shards.  Each chunk boundary is defined exactly by the crack network below.
//
// Interior junctions:
//   P(56,68)   — primary junction: where first crack meets second crack
//   Q(28,116)  — secondary junction: lower node of second crack
//
// Edge split points:
//   TA(40,0)    — top edge split
//   RA(112,56)  — right edge upper split
//   RB(112,116) — right edge lower split
//   BA(44,160)  — bottom edge split
//   LA2(0,64)   — left edge upper split (end of first-crack P→left branch)
//   LA(0,128)   — left edge lower split (end of Q→left branch)
//
// Crack network:
//   First crack:   TA→K1→P→K2→RA              [main: top → right edge]
//                  P→K3a→K3b→LA2              [branch: P → left edge]
//   Second crack:  P→K4→Q→K8→BA               [main: down to bottom]
//                  Q→K5→K6→RB                 [branch: right edge]
//                  Q→K7→LA                    [branch: left edge]
//   Fine details:  K1→(22,14)→(12,5)          [tiny branch near top]
//                  K4→(38,84)→(28,82)         [tiny branch mid-left]
//
// Six polygon chunks (no gaps, no overlaps — boundaries are exact crack lines):
//   TL (7pt) top-left          TR (6pt) top-right
//   LM (8pt) left-centre       RM (8pt) right-centre
//   BL (6pt) bottom-left       BR (7pt) bottom-right
//
// Shatter motion: pieces drift slowly outward from centre, rotate in 3-D,
// then pulse into the Luminary's primary affinity colour via a screen-blend
// overlay before fading out of existence.  No falling.

// Interior junctions
const PX = 56;  const PY = 68;
const QX = 28;  const QY = 116;

// Edge split points
const TAX = 40;                              // top edge (y = 0)
const RAY = 56;                              // right edge upper  (x = BOARD_CARD_W)
const RBY = 116;                             // right edge lower  (x = BOARD_CARD_W)
const BAX = 44;                              // bottom edge       (y = BOARD_CARD_H)
const LA2Y = 64;                             // left edge upper   (x = 0)
const LAY  = 128;                            // left edge lower   (x = 0)

// Kink points along crack lines
const K1X = 32;   const K1Y = 24;   // first crack main  TA→P
const K2X = 68;   const K2Y = 56;   // first crack branch P→RA
const K3aX = 44;  const K3aY = 64;  // first crack branch P→LA2, kink 1
const K3bX = 22;  const K3bY = 60;  // first crack branch P→LA2, kink 2
const K4X = 46;   const K4Y = 92;   // second crack main  P→Q
const K5X = 52;   const K5Y = 112;  // second crack right branch Q→RB, kink 1
const K6X = 80;   const K6Y = 112;  // second crack right branch Q→RB, kink 2
const K7X = 18;   const K7Y = 122;  // second crack left branch  Q→LA
const K8X = 38;   const K8Y = 136;  // second crack main  Q→BA

// Six large shard pieces — clip paths in percentage coords (W=112, H=160).
// Motion: slow outward drift, subtle 3-D tumble, affinity-colour pulse, fade.
const PANEL_PIECES = [
  // TL — top-left wedge (7 vertices)
  { clip: 'polygon(0% 0%, 35.7% 0%, 28.6% 15%, 50% 42.5%, 39.3% 40%, 19.6% 37.5%, 0% 40%)',
    dx:  -42, dy:  -36, rotateX: -12, rotateY:   9, rotateZ:  10 },
  // TR — top-right slab (6 vertices)
  { clip: 'polygon(35.7% 0%, 100% 0%, 100% 35%, 60.7% 35%, 50% 42.5%, 28.6% 15%)',
    dx:   40, dy:  -33, rotateX: -10, rotateY: -10, rotateZ:  -9 },
  // LM — left-centre strip (8 vertices)
  { clip: 'polygon(0% 40%, 19.6% 37.5%, 39.3% 40%, 50% 42.5%, 41.1% 57.5%, 25% 72.5%, 16.1% 76.25%, 0% 80%)',
    dx:  -44, dy:    4, rotateX:   4, rotateY:  11, rotateZ:   7 },
  // RM — right-centre slab (8 vertices)
  { clip: 'polygon(100% 35%, 100% 72.5%, 71.4% 70%, 46.4% 70%, 25% 72.5%, 41.1% 57.5%, 50% 42.5%, 60.7% 35%)',
    dx:   46, dy:    3, rotateX:  -3, rotateY: -12, rotateZ:  -6 },
  // BL — bottom-left wedge (6 vertices)
  { clip: 'polygon(25% 72.5%, 33.9% 85%, 39.3% 100%, 0% 100%, 0% 80%, 16.1% 76.25%)',
    dx:  -34, dy:   38, rotateX:  13, rotateY:   8, rotateZ:  12 },
  // BR — bottom-right slab (7 vertices)
  { clip: 'polygon(25% 72.5%, 46.4% 70%, 71.4% 70%, 100% 72.5%, 100% 100%, 39.3% 100%, 33.9% 85%)',
    dx:   32, dy:   37, rotateX:  11, rotateY:  -9, rotateZ: -10 },
] as const;

const PHASE_DURATIONS: Record<CutscenePhase, number> = {
  establish:    600,
  panning:      750,  // board DOM pans as a unit toward the card (overlay=0)
  focusing:     600,  // camera layer zooms in on the now-centred card
  intro:        50,
  zooming:      80,
  pressure:     90,
  firstcrack:   320,  // primary fault + branch draw, then hold for suspense
  leaking:      850,  // energy bleeds through; sustained quiet-before-storm
  secondcrack:  360,  // second branch crack appears; faint rays start seeping
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
  onFlash,
  onSkip,
}: {
  luminaryId: string;
  luminaryName: string;
  domain: string;
  lumens: number;
  flavor: string;
  cardRect?: { cx: number; cy: number; w: number };
  onComplete: () => void;
  onFlash?: () => void;
  onSkip?: () => void;
}) {
  const [phase, setPhase] = useState<CutscenePhase>('establish');
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor, secondaryColor, glowColor } = vis;
  // RGB components of primaryColor for rgba() drop-shadows on shatter chunks
  const pRgb = `${parseInt(primaryColor.slice(1,3),16)},${parseInt(primaryColor.slice(3,5),16)},${parseInt(primaryColor.slice(5,7),16)}`;
  const { panelArt, entityCutout, auraLayer } = getLuminaryImageAssets(luminaryId);

  // Keep refs so the phase-advance closure always sees the latest callbacks
  // without the effect needing to re-run (which would reset the timer chain).
  const onFlashRef = useRef(onFlash);
  useEffect(() => { onFlashRef.current = onFlash; }, [onFlash]);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Fire all cutscene sound effects pre-scheduled against AudioContext time.
  // Runs exactly once on mount; respects the user's mute setting internally.
  useEffect(() => {
    gameAudio.playSummonCutscene();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase timer chain — empty dep array: runs exactly once on mount.
  useEffect(() => {
    let idx = 0;
    let cancelled = false;
    function advance() {
      if (cancelled) return;
      idx++;
      const next = PHASES[idx] ?? 'done';
      setPhase(next);
      if (next === 'flashing') onFlashRef.current?.();
      if (next !== 'done') setTimeout(advance, PHASE_DURATIONS[next]);
      else setTimeout(() => onCompleteRef.current(), 80);
    }
    const t = setTimeout(advance, PHASE_DURATIONS['establish']);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

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
  // Shards stay mounted through the entity reveal so they drift apart while
  // the Luminary manifests — creating the "born from the shattered vessel" effect.
  const isShatterVisible = isShattering || isRevealedActive;

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
    isPressure || isFirstCrack || isLeaking || isSecondCrack || isCracking;
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
        ? [`0 0 20px ${primaryColor}a0`, `0 0 42px ${primaryColor}d0, 0 0 12px ${primaryColor}50`, `0 0 20px ${primaryColor}a0`]
        : isSecondCrack
          ? [`0 0 22px ${primaryColor}b0`, `0 0 48px ${primaryColor}e0, 0 0 16px ${primaryColor}68`, `0 0 22px ${primaryColor}b0`]
          : [`0 0 26px ${primaryColor}c0`, `0 0 52px ${primaryColor}f0, 0 0 18px ${primaryColor}80`, `0 0 26px ${primaryColor}c0`];

  // Vessel is positioned at viewport centre — the board pan brings the card
  // there before the vessel appears, so they perfectly overlap.
  const vesselLeft = vw / 2 - BOARD_CARD_W / 2;
  const vesselTop  = vh / 2 - BOARD_CARD_H / 2;

  return (
    <div className="fixed inset-0 z-[9000]">

      {/* ── Skip View button ───────────────────────────────────────────────── */}
      {onSkip && (
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          className="absolute top-4 right-4 z-[9100] flex items-center gap-1.5 text-white/55 hover:text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur transition-colors select-none"
          aria-label="Skip summoning view"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-70">
            <path d="M1 1l8 4-8 4V1z" />
            <rect x="8" y="1" width="1.5" height="8" rx="0.5" />
          </svg>
          Skip view
        </button>
      )}

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
              boxShadow: `0 0 18px ${primaryColor}70, 0 0 42px ${primaryColor}40, 0 0 8px ${primaryColor}22`,
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
              exit={{ opacity: 0, x: 0, y: 0, rotate: 0, transition: { duration: 0.06, ease: 'linear' } }}
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
              {/* Six-chunk crack network — boundaries match PANEL_PIECES exactly  */}
              {/* First crack : TA→K1→P→K2→RA + P→K3a→K3b→LA2                    */}
              {/* Second crack: P→K4→Q→K8→BA + Q→K5→K6→RB + Q→K7→LA              */}
              {/* Fine details: K1→(22,14)→(12,5) + K4→(38,84)→(28,82)            */}
              {/* 4-layer paint: white snap → chasing glow → residual → seam      */}
              {hasCracks && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${BOARD_CARD_W} ${BOARD_CARD_H}`}
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    {/* Tight bloom for crisp white fracture lines */}
                    <filter id="cgb" x="-60%" y="-60%" width="220%" height="220%">
                      <feGaussianBlur stdDeviation="1.5" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    {/* Wide gaussian for chasing glow and residual wound glow */}
                    <filter id="cgw" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="9" />
                    </filter>
                    {/* Energy ray gradients — themed to Luminary primaryColor */}
                    {(isSecondCrack || isCracking) && (
                      <>
                        <linearGradient id="rayUp"    x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%"   stopColor={primaryColor} stopOpacity="0.88" />
                          <stop offset="100%" stopColor="#ffffff"       stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rayDown"  x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={primaryColor} stopOpacity="0.88" />
                          <stop offset="100%" stopColor="#ffffff"       stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rayLeft"  x1="1" y1="0" x2="0" y2="0">
                          <stop offset="0%"   stopColor={primaryColor} stopOpacity="0.80" />
                          <stop offset="100%" stopColor="#ffffff"       stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rayRight" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%"   stopColor={primaryColor} stopOpacity="0.80" />
                          <stop offset="100%" stopColor="#ffffff"       stopOpacity="0" />
                        </linearGradient>
                      </>
                    )}
                  </defs>

                  {/* ════ FIRST CRACK ═══════════════════════════════════════════ */}
                  {/* TA(40,0)→K1(32,24)→P(56,68)   [main: top → primary junction] */}
                  {/* P→K2(68,56)→RA(112,56)          [branch: P → right edge]      */}
                  {/* P→K3a(44,64)→K3b(22,60)→LA2(0,64) [branch: P → left edge]    */}
                  {/* 4-layer paint: white snap → chasing glow → residual → seam    */}

                  {/* ── Main: TA→K1→P ──────────────────────────────────── */}
                  {/* L1 white fracture */}
                  <motion.path
                    d={`M${TAX},0 L${K1X},${K1Y} L${PX},${PY}`}
                    stroke="white" strokeWidth="1.5" fill="none" filter="url(#cgb)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1.0, 0.95] }}
                    transition={{ duration: 0.10, ease: 'easeOut' }}
                  />
                  {/* L2 chasing glow */}
                  <motion.path
                    d={`M${TAX},0 L${K1X},${K1Y} L${PX},${PY}`}
                    stroke={primaryColor} strokeWidth="22" fill="none" filter="url(#cgw)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.80, 0.20, 0] }}
                    transition={{
                      pathLength: { duration: 0.28, delay: 0.04, ease: 'easeOut' },
                      opacity:    { duration: 0.56, delay: 0.04, times: [0, 0.14, 0.55, 1.0] },
                    }}
                  />
                  {/* L3 residual wound glow */}
                  <motion.path
                    d={`M${TAX},0 L${K1X},${K1Y} L${PX},${PY}`}
                    stroke={primaryColor} strokeWidth="14" fill="none" filter="url(#cgw)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0, 0.46, 0.64, 0.56] }}
                    transition={{ duration: 0.62, delay: 0.14, ease: 'easeOut' }}
                  />
                  {/* L4 tinted seam */}
                  <motion.path
                    d={`M${TAX},0 L${K1X},${K1Y} L${PX},${PY}`}
                    stroke={primaryColor} strokeWidth="3.5" fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0, 0.32, 0.52, 0.45] }}
                    transition={{ duration: 0.58, delay: 0.16, ease: 'easeOut' }}
                  />

                  {/* ── Branch: P→K2→RA (right edge) ─────────────────────── */}
                  <motion.path
                    d={`M${PX},${PY} L${K2X},${K2Y} L${BOARD_CARD_W},${RAY}`}
                    stroke="white" strokeWidth="1.2" fill="none" filter="url(#cgb)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.90, 0.84] }}
                    transition={{ duration: 0.10, delay: 0.06, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={`M${PX},${PY} L${K2X},${K2Y} L${BOARD_CARD_W},${RAY}`}
                    stroke={primaryColor} strokeWidth="18" fill="none" filter="url(#cgw)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.68, 0.16, 0] }}
                    transition={{
                      pathLength: { duration: 0.22, delay: 0.08, ease: 'easeOut' },
                      opacity:    { duration: 0.48, delay: 0.08, times: [0, 0.16, 0.56, 1.0] },
                    }}
                  />
                  <motion.path
                    d={`M${PX},${PY} L${K2X},${K2Y} L${BOARD_CARD_W},${RAY}`}
                    stroke={primaryColor} strokeWidth="10" fill="none" filter="url(#cgw)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0, 0.38, 0.54, 0.46] }}
                    transition={{ duration: 0.52, delay: 0.16, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={`M${PX},${PY} L${K2X},${K2Y} L${BOARD_CARD_W},${RAY}`}
                    stroke={primaryColor} strokeWidth="2.8" fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0, 0.26, 0.44, 0.38] }}
                    transition={{ duration: 0.50, delay: 0.18, ease: 'easeOut' }}
                  />

                  {/* ── Branch: P→K3a→K3b→LA2 (left edge) ─────────────── */}
                  <motion.path
                    d={`M${PX},${PY} L${K3aX},${K3aY} L${K3bX},${K3bY} L0,${LA2Y}`}
                    stroke="white" strokeWidth="1.0" fill="none" filter="url(#cgb)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.85, 0.78] }}
                    transition={{ duration: 0.12, delay: 0.07, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={`M${PX},${PY} L${K3aX},${K3aY} L${K3bX},${K3bY} L0,${LA2Y}`}
                    stroke={primaryColor} strokeWidth="16" fill="none" filter="url(#cgw)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.62, 0.14, 0] }}
                    transition={{
                      pathLength: { duration: 0.24, delay: 0.09, ease: 'easeOut' },
                      opacity:    { duration: 0.46, delay: 0.09, times: [0, 0.16, 0.56, 1.0] },
                    }}
                  />
                  <motion.path
                    d={`M${PX},${PY} L${K3aX},${K3aY} L${K3bX},${K3bY} L0,${LA2Y}`}
                    stroke={primaryColor} strokeWidth="9" fill="none" filter="url(#cgw)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0, 0.34, 0.50, 0.42] }}
                    transition={{ duration: 0.50, delay: 0.17, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={`M${PX},${PY} L${K3aX},${K3aY} L${K3bX},${K3bY} L0,${LA2Y}`}
                    stroke={primaryColor} strokeWidth="2.5" fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0, 0.24, 0.40, 0.34] }}
                    transition={{ duration: 0.48, delay: 0.19, ease: 'easeOut' }}
                  />

                  {/* ── Fine detail: tiny branch off K1 toward top-left corner */}
                  <motion.path d={`M${K1X},${K1Y} L22,14 L12,5`}
                    stroke="white" strokeWidth="0.60" fill="none" filter="url(#cgb)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.70, 0.60] }}
                    transition={{ duration: 0.08, delay: 0.09, ease: 'easeOut' }}
                  />

                  {/* ── Light leaking through first crack (leaking+) ─────────── */}
                  {(isLeaking || isSecondCrack || isCracking) && (
                    <>
                      {/* Diffuse light pool at P — primary junction */}
                      <motion.circle cx={PX} cy={PY} r="20" fill={primaryColor}
                        filter="url(#cgw)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.24, 0.12, 0.30, 0.14, 0.26] }}
                        transition={{ duration: 3.8, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror' }}
                      />
                      {/* Mote 1 — near TA, along main crack */}
                      <motion.circle cx={TAX} cy={8} r="1.1" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.72, 0.14, 0.86, 0.20, 0.62, 0] }}
                        transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity, delay: 0.00 }}
                      />
                      {/* Mote 2 — at K1 kink */}
                      <motion.circle cx={K1X} cy={K1Y} r="0.9" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.50, 0.80, 0.12, 0.70, 0.28, 0] }}
                        transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity, delay: 0.38 }}
                      />
                      {/* Mote 3 — at P junction */}
                      <motion.circle cx={PX} cy={PY} r="1.5" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.90, 0.32, 0.66, 0.10, 0.82, 0] }}
                        transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity, delay: 0.65 }}
                      />
                      {/* Mote 4 — on P→RA branch near K2 */}
                      <motion.circle cx={K2X} cy={K2Y} r="0.9" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.44, 0.86, 0.16, 0.68, 0.10, 0] }}
                        transition={{ duration: 3.6, ease: 'easeInOut', repeat: Infinity, delay: 0.20 }}
                      />
                      {/* Mote 5 — on P→LA2 branch near K3b */}
                      <motion.circle cx={K3bX} cy={K3bY} r="0.9" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.60, 0.10, 0.80, 0.32, 0.50, 0] }}
                        transition={{ duration: 2.9, ease: 'easeInOut', repeat: Infinity, delay: 0.80 }}
                      />
                    </>
                  )}

                  {/* ════ SECOND CRACK ══════════════════════════════════════════ */}
                  {/* P→K4→Q→K8→BA  [main: down to bottom]                       */}
                  {/* Q→K5→K6→RB    [branch: right edge]                         */}
                  {/* Q→K7→LA       [branch: left edge]                           */}
                  {(isSecondCrack || isCracking) && (
                    <>
                      {/* ── Main: P→K4→Q→K8→BA ─────────────────────────── */}
                      <motion.path
                        d={`M${PX},${PY} L${K4X},${K4Y} L${QX},${QY} L${K8X},${K8Y} L${BAX},${BOARD_CARD_H}`}
                        stroke="white" strokeWidth="1.6" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 1.0, 0.94] }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${PX},${PY} L${K4X},${K4Y} L${QX},${QY} L${K8X},${K8Y} L${BAX},${BOARD_CARD_H}`}
                        stroke={primaryColor} strokeWidth="24" fill="none" filter="url(#cgw)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.76, 0.18, 0] }}
                        transition={{
                          pathLength: { duration: 0.36, delay: 0.05, ease: 'easeOut' },
                          opacity:    { duration: 0.62, delay: 0.05, times: [0, 0.14, 0.52, 1.0] },
                        }}
                      />
                      <motion.path
                        d={`M${PX},${PY} L${K4X},${K4Y} L${QX},${QY} L${K8X},${K8Y} L${BAX},${BOARD_CARD_H}`}
                        stroke={primaryColor} strokeWidth="16" fill="none" filter="url(#cgw)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0, 0.46, 0.64, 0.56] }}
                        transition={{ duration: 0.68, delay: 0.12, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${PX},${PY} L${K4X},${K4Y} L${QX},${QY} L${K8X},${K8Y} L${BAX},${BOARD_CARD_H}`}
                        stroke={primaryColor} strokeWidth="4.0" fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0, 0.30, 0.50, 0.44] }}
                        transition={{ duration: 0.64, delay: 0.14, ease: 'easeOut' }}
                      />

                      {/* ── Branch: Q→K5→K6→RB (right edge) ────────────── */}
                      <motion.path
                        d={`M${QX},${QY} L${K5X},${K5Y} L${K6X},${K6Y} L${BOARD_CARD_W},${RBY}`}
                        stroke="white" strokeWidth="1.0" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.80, 0.72] }}
                        transition={{ duration: 0.12, delay: 0.22, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${QX},${QY} L${K5X},${K5Y} L${K6X},${K6Y} L${BOARD_CARD_W},${RBY}`}
                        stroke={primaryColor} strokeWidth="14" fill="none" filter="url(#cgw)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.60, 0.14, 0] }}
                        transition={{
                          pathLength: { duration: 0.28, delay: 0.24, ease: 'easeOut' },
                          opacity:    { duration: 0.52, delay: 0.24, times: [0, 0.18, 0.58, 1.0] },
                        }}
                      />
                      <motion.path
                        d={`M${QX},${QY} L${K5X},${K5Y} L${K6X},${K6Y} L${BOARD_CARD_W},${RBY}`}
                        stroke={primaryColor} strokeWidth="8" fill="none" filter="url(#cgw)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0, 0.34, 0.50, 0.42] }}
                        transition={{ duration: 0.54, delay: 0.30, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${QX},${QY} L${K5X},${K5Y} L${K6X},${K6Y} L${BOARD_CARD_W},${RBY}`}
                        stroke={primaryColor} strokeWidth="2.6" fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0, 0.24, 0.42, 0.36] }}
                        transition={{ duration: 0.52, delay: 0.32, ease: 'easeOut' }}
                      />

                      {/* ── Branch: Q→K7→LA (left edge) ─────────────────── */}
                      <motion.path
                        d={`M${QX},${QY} L${K7X},${K7Y} L0,${LAY}`}
                        stroke="white" strokeWidth="0.85" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.76, 0.68] }}
                        transition={{ duration: 0.11, delay: 0.25, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${QX},${QY} L${K7X},${K7Y} L0,${LAY}`}
                        stroke={primaryColor} strokeWidth="11" fill="none" filter="url(#cgw)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.54, 0.12, 0] }}
                        transition={{
                          pathLength: { duration: 0.22, delay: 0.27, ease: 'easeOut' },
                          opacity:    { duration: 0.44, delay: 0.27, times: [0, 0.20, 0.60, 1.0] },
                        }}
                      />
                      <motion.path
                        d={`M${QX},${QY} L${K7X},${K7Y} L0,${LAY}`}
                        stroke={primaryColor} strokeWidth="6" fill="none" filter="url(#cgw)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0, 0.28, 0.44, 0.36] }}
                        transition={{ duration: 0.46, delay: 0.33, ease: 'easeOut' }}
                      />
                      <motion.path
                        d={`M${QX},${QY} L${K7X},${K7Y} L0,${LAY}`}
                        stroke={primaryColor} strokeWidth="2.0" fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0, 0.20, 0.36, 0.30] }}
                        transition={{ duration: 0.44, delay: 0.35, ease: 'easeOut' }}
                      />

                      {/* ── Fine detail: tiny branch off K4 toward upper-left */}
                      <motion.path d={`M${K4X},${K4Y} L38,84 L28,82`}
                        stroke="white" strokeWidth="0.55" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.62, 0.52] }}
                        transition={{ duration: 0.08, delay: 0.20, ease: 'easeOut' }}
                      />

                      {/* ── Light pools and motes along second crack ─────── */}
                      <motion.circle cx={QX} cy={QY} r="16" fill={primaryColor}
                        filter="url(#cgw)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.18, 0.09, 0.22, 0.10, 0.20] }}
                        transition={{ duration: 3.2, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror', delay: 0.4 }}
                      />
                      <motion.circle cx={K4X} cy={K4Y} r="1.0" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.56, 0.10, 0.76, 0.24, 0.48, 0] }}
                        transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity, delay: 0.25 }}
                      />
                      <motion.circle cx={K5X} cy={K5Y} r="0.9" fill="white" filter="url(#cgb)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.40, 0.82, 0.14, 0.64, 0.10, 0] }}
                        transition={{ duration: 3.0, ease: 'easeInOut', repeat: Infinity, delay: 0.55 }}
                      />

                      {/* Energy rays from P (primary junction) */}
                      <motion.line x1={PX} y1={PY} x2={PX} y2={0}
                        stroke="url(#rayUp)" strokeWidth="2.4"
                        animate={{ opacity: [0, 0.68, 0.36, 0.74, 0.22], scaleY: [0, 1, 0.88, 1] }}
                        transition={{ repeat: Infinity, duration: 0.52, ease: 'easeOut' }}
                        style={{ transformOrigin: `${PX}px ${PY}px` }}
                      />
                      <motion.line x1={PX} y1={PY} x2={PX} y2={BOARD_CARD_H}
                        stroke="url(#rayDown)" strokeWidth="2.4"
                        animate={{ opacity: [0, 0.56, 0.28, 0.64, 0.20], scaleY: [0, 1, 0.88, 1] }}
                        transition={{ repeat: Infinity, duration: 0.58, ease: 'easeOut', delay: 0.14 }}
                        style={{ transformOrigin: `${PX}px ${PY}px` }}
                      />
                      <motion.line x1={PX} y1={PY} x2={0} y2={PY}
                        stroke="url(#rayLeft)" strokeWidth="1.6"
                        animate={{ opacity: [0, 0.42, 0.14, 0.50, 0.12] }}
                        transition={{ repeat: Infinity, duration: 0.64, ease: 'easeInOut', delay: 0.24 }}
                      />
                      <motion.line x1={PX} y1={PY} x2={BOARD_CARD_W} y2={PY}
                        stroke="url(#rayRight)" strokeWidth="1.6"
                        animate={{ opacity: [0, 0.34, 0.12, 0.46, 0.10] }}
                        transition={{ repeat: Infinity, duration: 0.60, ease: 'easeInOut', delay: 0.38 }}
                      />
                      {/* Secondary light pool at K2 (right branch kink) */}
                      <motion.circle cx={K2X} cy={K2Y} r="10" fill={primaryColor}
                        filter="url(#cgw)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.16, 0.08, 0.22, 0.10] }}
                        transition={{ duration: 2.8, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror', delay: 0.5 }}
                      />
                    </>
                  )}

                  {/* ── Cracking phase: energy burst at P and Q ───────────────── */}
                  {isCracking && (
                    <>
                      <motion.circle cx={PX} cy={PY} r="18" fill={primaryColor}
                        filter="url(#cgw)"
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: [0, 0.55, 0.22], scale: [0.3, 1.8, 1.0] }}
                        transition={{ duration: 0.70, ease: 'easeOut' }}
                        style={{ transformOrigin: `${PX}px ${PY}px` }}
                      />
                      <motion.circle cx={QX} cy={QY} r="14" fill={primaryColor}
                        filter="url(#cgw)"
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: [0, 0.45, 0.18], scale: [0.4, 1.45, 0.92] }}
                        transition={{ duration: 0.58, delay: 0.12, ease: 'easeOut' }}
                        style={{ transformOrigin: `${QX}px ${QY}px` }}
                      />
                    </>
                  )}
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
      {/* ── end board camera layer ────────────────────────────────────────── */}

      {/* ── Cosmic light beneath shattering panels ────────────────────── */}
      {/* OUTSIDE camera layer — full screen scale, not shrunk by camera. */}
      {/* Starts tiny at the panel centre and grows outward as chunks peel */}
      {/* apart, creating the "expanding void / portal core" effect.       */}
      <AnimatePresence>
        {isShatterVisible && (
          <motion.div key="cosmiclight" className="absolute pointer-events-none"
            initial={{ opacity: 0, scale: 0.10 }}
            animate={{
              opacity: isFlashing ? 0 : [0, 1.0, 0.95, 0.65, 0],
              scale:   isFlashing ? 0.18 : [0.10, 0.72, 1.25, 1.34, 1.28],
            }}
            exit={{ opacity: 0, transition: { duration: 0.30 } }}
            transition={{
              opacity: { duration: 1.05, times: [0, 0.12, 0.34, 0.72, 1.0], ease: 'easeInOut' },
              scale:   { duration: 1.05, times: [0, 0.16, 0.42, 0.72, 1.0], ease: [0.16, 1, 0.3, 1] },
            }}
            style={{
              width: BOARD_CARD_W * 5.5, height: BOARD_CARD_H * 5,
              left: vesselLeft + BOARD_CARD_W / 2 - BOARD_CARD_W * 2.75,
              top:  vesselTop  + BOARD_CARD_H / 2 - BOARD_CARD_H * 2.5,
              background: `radial-gradient(ellipse 34% 38% at 50% 42%, #ffffff 0%, ${primaryColor}ff 14%, ${primaryColor}cc 32%, ${primaryColor}66 56%, transparent 80%)`,
              filter: 'blur(10px)',
              borderRadius: '50%',
              transformOrigin: '50% 50%',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Six large crystal polygon chunks ─────────────────────────── */}
      {/* OUTSIDE camera layer — rendered in fixed screen space so the   */}
      {/* camera scale-out does not interfere with chunk drift motion.   */}
      {/* Chunks drift slowly outward, rotate in 3-D, pulse into the     */}
      {/* Luminary's primary affinity colour via screen-blend overlay,   */}
      {/* and fade out while the entity manifests from the shattered vessel. */}
      <AnimatePresence>
        {isShatterVisible && PANEL_PIECES.map((piece, i) => (
          <motion.div key={`chunk-${i}`} className="absolute pointer-events-none"
            style={{
              width: BOARD_CARD_W * 1.28, height: BOARD_CARD_H * 1.28,
              left: vesselLeft, top: vesselTop,
              clipPath: piece.clip,
              transformPerspective: 1000,
            }}
            initial={{
              x: 0, y: 0,
              rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1,
              filter: `brightness(1.0) drop-shadow(2px -2px 2px rgba(${pRgb},0.60)) drop-shadow(-1px 1px 2px rgba(0,0,22,0.55))`,
            }}
            animate={{
              // Micro-jolt at crack moment (8% of travel in first ~0.3 s),
              // then the pieces peel slowly outward under magical suspension.
              // No projectile overshoot — the panel is being consumed, not shattered.
              x: [0, piece.dx * 0.11, piece.dx],
              y: [0, piece.dy * 0.11, piece.dy],
              rotateX: [0, piece.rotateX],
              rotateY: [0, piece.rotateY],
              rotateZ: [0, piece.rotateZ],
              // Stay fully opaque through the "beat" (55%), then dissolve bright.
              opacity: [1, 1, 1, 0.92, 0.40, 0],
              // Filter arc: normal → affinity glow builds → pulse peak → white-hot
              // burn-out. Chunks never go dark — they dissolve INTO affinity light.
              filter: [
                `brightness(1.0) drop-shadow(2px -2px 2px rgba(${pRgb},0.60)) drop-shadow(-1px 1px 2px rgba(0,0,22,0.52))`,
                `brightness(1.5) drop-shadow(3px -3px 5px rgba(${pRgb},0.78)) drop-shadow(-2px 2px 4px rgba(0,0,22,0.40))`,
                `brightness(2.2) drop-shadow(5px -4px 8px rgba(${pRgb},0.90)) drop-shadow(-3px 3px 6px rgba(${pRgb},0.36))`,
                `brightness(4.0) drop-shadow(0 0 12px rgba(${pRgb},0.98)) drop-shadow(0 0 22px rgba(${pRgb},0.62))`,
                `brightness(6.5) drop-shadow(0 0 18px rgba(${pRgb},1.0)) drop-shadow(0 0 34px rgba(255,255,255,0.72))`,
                `brightness(9.0) drop-shadow(0 0 24px rgba(${pRgb},1.0)) drop-shadow(0 0 44px rgba(255,255,255,0.90))`,
              ],
            }}
            transition={{
              duration: 5.00,
              delay: i * 0.04,
              // Crack jolt then slow float
              x:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
              y:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
              rotateX: { times: [0, 1.0], ease: 'easeOut', duration: 5.00 },
              rotateY: { times: [0, 1.0], ease: 'easeOut', duration: 5.00 },
              rotateZ: { times: [0, 1.0], ease: 'easeOut', duration: 5.00 },
              opacity: { times: [0, 0.14, 0.55, 0.70, 0.87, 1.0], ease: 'easeInOut' },
              filter:  { times: [0, 0.18, 0.45, 0.65, 0.80, 1.0], ease: 'easeInOut' },
            }}
          >
            {/* Panel artwork — the face of the vessel shard */}
            {panelArt ? (
              <img src={panelArt} alt="" aria-hidden
                style={{
                  width: BOARD_CARD_W, height: BOARD_CARD_H,
                  objectFit: 'cover', objectPosition: 'center top',
                  display: 'block',
                }}
                draggable={false}
              />
            ) : (
              <LuminaryPanelArt luminaryId={luminaryId} size={BOARD_CARD_W} />
            )}
            {/* Affinity-colour transmutation — the vessel material is consumed by the
                Luminary's energy. Ramps to full opacity (solid affinity colour) before
                the parent chunk fades, so the shard visibly "becomes" pure light before
                it dissolves. Screen blend means at opacity=1 the artwork is fully washed
                into the affinity hue and the parent brightness boosts push it to white. */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: primaryColor, mixBlendMode: 'screen' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.18, 0.70, 1.00, 1.00, 0.85] }}
              transition={{
                duration: 5.20,
                times: [0, 0.12, 0.38, 0.60, 0.78, 0.90, 1.0],
                ease: 'easeInOut',
                delay: i * 0.04,
              }}
            />
            {/* Physical slab edge — Luminary-tinted bevel, brightens with the chunk */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              boxShadow: `inset 0 0 0 1.5px rgba(${pRgb},0.80), inset 3px 3px 0 rgba(${pRgb},0.28), inset -3px -3px 0 rgba(0,0,20,0.55), inset 0 0 22px rgba(${pRgb},0.30)`,
            }} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Full-viewport bloom flash — outside camera layer ────────────────── */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div key="flash" className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 1, 0] }}
            transition={{ duration: 0.88, ease: 'easeInOut', times: [0, 0.28, 1] }}
            style={{
              background: `radial-gradient(ellipse at 50% 42%, #ffffff 0%, ${primaryColor}ee 20%, ${primaryColor}bb 44%, ${primaryColor}44 66%, transparent 86%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Board vignette dimmer — dims edges, keeps entity focal ─────────────── */}
      {/* Radial gradient: lighter at center (entity zone), darker at edges.      */}
      <AnimatePresence>
        {(isRevealedActive || isFading) && (
          <motion.div
            key="boarddim"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isFading ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isFading ? 0.55 : 1.20, delay: isFading ? 0 : 0.40, ease: 'easeOut' }}
            style={{
              background: 'radial-gradient(ellipse 54% 58% at 50% 42%, rgba(0,0,10,0.22) 0%, rgba(0,0,10,0.70) 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Portal-style entity reveal ──────────────────────────────────────────── */}
      {/* The Luminary manifests from the cosmic flash — it mounts during the     */}
      {/* 'flashing' phase. The outer wrapper resolves the flash haze; the inner  */}
      {/* entrance div drives the physical "swing in" from portal depth:          */}
      {/* entity starts small and angled (~32° rotateY, like a poster edge-on),  */}
      {/* snaps forward on the beat-drop boom to a +6° overshoot, then settles   */}
      {/* face-on. Haze blur is lighter (10px) so the silhouette is readable     */}
      {/* through it while swinging.                                              */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            key="entity"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ overflow: 'visible' }}
            initial={{ opacity: 0, filter: 'brightness(5) blur(10px)' }}
            animate={isFading
              ? { opacity: 0, filter: 'brightness(1) blur(0px)' }
              : { opacity: 1, filter: 'brightness(1) blur(0px)' }
            }
            transition={isFading
              ? { duration: 0.55, ease: 'easeIn' }
              : { duration: 2.60, delay: 0.05, ease: [0.12, 0, 0.88, 1] }
            }
          >
            {/* Swing-in entrance — poster-to-anterior sweep timed to beat drop.  */}
            {/* rotateY: −32° (edge-on) → +6° (overshoot) → 0° (face-on).       */}
            {/* transformPerspective gives the Y-rotation proper 3-D depth.       */}
            <motion.div
              className="relative flex flex-col items-center"
              style={{ overflow: 'visible', transformPerspective: 1100 }}
              initial={{ scale: 0.26, y: 20, rotateY: -32 }}
              animate={isFading
                ? { scale: 1.14, y: -38, rotateY: 0 }
                : { scale: [0.26, 1.14, 1.05, 1.0], y: [20, -5, 0], rotateY: [-32, 6, 0] }
              }
              transition={isFading
                ? { duration: 0.55, ease: 'easeIn' }
                : {
                    scale:   { duration: 1.30, times: [0, 0.52, 0.76, 1.0], ease: 'easeOut' },
                    y:       { duration: 1.10, ease: [0.22, 1, 0.36, 1] },
                    rotateY: { duration: 1.30, times: [0, 0.54, 1.0],
                               ease: ['easeIn', [0.16, 1, 0.3, 1]] },
                  }
              }
            >
              {/* Breathing hover — unchanged */}
              <motion.div
                className="relative flex flex-col items-center gap-4"
                style={{ overflow: 'visible' }}
                animate={isFading ? {} : { y: [0, -10, 0], scale: [1, 1.018, 1] }}
                transition={isFading ? {} : {
                  y:     { repeat: Infinity, duration: 3.4, ease: 'easeInOut', delay: 1.9 },
                  scale: { repeat: Infinity, duration: 4.0, ease: 'easeInOut', delay: 1.9 },
                }}
              >

                {/* ── Portal composition — relative anchor sized to entity frame ── */}
                {/* Portal layers extend beyond via overflow:visible on each parent. */}
                <div style={{ position: 'relative', width: ENT_W, height: ENT_H, overflow: 'visible', flexShrink: 0 }}>

                  {/* Outer portal bloom (680×740) — blooms from flash via spring */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.22 }}
                    animate={{
                      opacity: isFlashing ? 0 : isFading ? 0 : 0.78,
                      scale:   isFlashing ? 0.22 : isFading ? 1.18 : 1.0,
                    }}
                    transition={{
                      opacity: { duration: 1.8, ease: 'easeOut' },
                      scale:   { type: 'spring', stiffness: 90, damping: 13, mass: 0.9 },
                    }}
                    style={{
                      position: 'absolute',
                      width: 680, height: 740,
                      top: '50%', left: '50%',
                      x: '-50%', y: '-52%',
                      borderRadius: '50%',
                      background: `radial-gradient(ellipse at 50% 48%, ${primaryColor}ff 0%, ${primaryColor}cc 12%, ${primaryColor}77 34%, ${secondaryColor}33 58%, transparent 76%)`,
                      filter: 'blur(38px)',
                      zIndex: 0,
                    }}
                  />

                  {/* Inner portal halo (400×500) — tighter saturated core */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.28 }}
                    animate={{
                      opacity: isFlashing ? 0 : isFading ? 0 : 0.90,
                      scale:   isFlashing ? 0.28 : isFading ? 1.12 : 1.0,
                    }}
                    transition={{
                      opacity: { duration: 1.3, ease: 'easeOut' },
                      scale:   { type: 'spring', stiffness: 120, damping: 11, mass: 0.7 },
                    }}
                    style={{
                      position: 'absolute',
                      width: 400, height: 500,
                      top: '50%', left: '50%',
                      x: '-50%', y: '-52%',
                      borderRadius: '50%',
                      background: `radial-gradient(ellipse at 50% 46%, ${glowColor}ff 0%, ${glowColor}dd 14%, ${glowColor}88 32%, ${primaryColor}44 54%, transparent 72%)`,
                      filter: 'blur(18px)',
                      zIndex: 1,
                    }}
                  />

                  {/* Portal rim ring (480×560) — thin bright event-horizon edge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: isFlashing ? 0 : isFading ? 0 : 0.38,
                      scale:   isFlashing ? 0.5 : isFading ? 1.1 : 1.0,
                    }}
                    transition={{
                      opacity: { duration: 2.0, ease: 'easeOut' },
                      scale:   { type: 'spring', stiffness: 70, damping: 16, mass: 1.1 },
                    }}
                    style={{
                      position: 'absolute',
                      width: 480, height: 560,
                      top: '50%', left: '50%',
                      x: '-50%', y: '-52%',
                      borderRadius: '50%',
                      background: 'transparent',
                      boxShadow: `0 0 0 2px ${glowColor}55, inset 0 0 28px ${glowColor}33`,
                      filter: 'blur(4px)',
                      zIndex: 2,
                    }}
                  />

                  {/* Entity — aggressive elliptical mask dissolves edges into portal */}
                  {/* Any baked-in background or white fringe reads as rim-light.    */}
                  <motion.div
                    animate={isFading ? {} : {
                      filter: isFlashing ? 'none' : [
                        `drop-shadow(0 0 16px ${glowColor}99) drop-shadow(0 0 6px ${primaryColor}66)`,
                        `drop-shadow(0 0 38px ${glowColor}ff) drop-shadow(0 0 16px ${primaryColor}cc)`,
                        `drop-shadow(0 0 16px ${glowColor}99) drop-shadow(0 0 6px ${primaryColor}66)`,
                      ],
                    }}
                    transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut', delay: 1.9 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {entityCutout ? (
                      <img src={entityCutout} alt={luminaryName}
                        style={{
                          width: ENT_W, height: ENT_H,
                          objectFit: 'contain', objectPosition: 'center',
                          display: 'block',
                          // Aggressive radial mask: opaque centre, fading to transparent
                          // well before the image edges. Background pixels and rectangular
                          // glow/fringe are dissolved into the portal field behind, reading
                          // as designed rim-light rather than asset artifacts.
                          maskImage: 'radial-gradient(ellipse 66% 72% at 50% 44%, black 24%, rgba(0,0,0,0.88) 42%, rgba(0,0,0,0.40) 58%, transparent 76%)',
                          WebkitMaskImage: 'radial-gradient(ellipse 66% 72% at 50% 44%, black 24%, rgba(0,0,0,0.88) 42%, rgba(0,0,0,0.40) 58%, transparent 76%)',
                        }}
                        draggable={false}
                      />
                    ) : (
                      // Procedural SVG entity — transparent bg, no mask needed
                      <EntityArt size={ENT_W} />
                    )}
                  </motion.div>

                </div>
                {/* ── end portal composition ── */}

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

// ── LuminaryIdleOverlay ──────────────────────────────────────────────────────
// After the summon cutscene completes the entity flies back to its panel card
// and remains there as a living guardian for the rest of the game.
//
// Mount lifecycle:
//   1. Component mounts with cardPos=null → renders nothing.
//   2. useEffect measures [data-luminary-id] immediately; sets cardPos.
//   3. Component renders: outer <div> is fixed at the card's viewport position.
//      Inner <motion.div> starts at a large offset (viewport centre − card pos)
//      and at ENT_W/IDLE_W scale, then animates to (0,0) scale=1 — the return flight.
//   4. After 1.2 s the idle loop begins: gentle y-float and aura pulse.
//   5. Scroll/resize listeners keep the outer div tracking the card.
//
// The entity art uses objectFit:cover + a radial mask so the bottom ~28 %
// of the card (name, claim tag) stays legible underneath the transparent edge.
export function LuminaryIdleOverlay({ luminaryId, frozen = false, hidden = false }: { luminaryId: string; frozen?: boolean; hidden?: boolean }) {
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor, glowColor } = vis;
  const { entityCutout } = getLuminaryImageAssets(luminaryId);

  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  // False when the card has been scrolled outside the <main> scroller's visible
  // area (e.g. user scrolled down and the Luminary row is above the fold).
  // The overlay is hidden while out-of-bounds so it doesn't paint over the header.
  const [isWithinScroller, setIsWithinScroller] = useState(true);

  // Viewport centre captured the moment cardPos first becomes non-null.
  // This is where the cutscene entity was sitting, so it's the correct
  // start-point of the return-flight animation.
  const startViewRef = useRef<{ x: number; y: number } | null>(null);

  // One-shot idle timer — started when cardPos first arrives, not retriggered
  // by subsequent scroll-induced cardPos updates.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref so the scroll handler always sees the latest frozen value
  // without needing to re-register listeners on every render.
  const frozenRef = useRef(frozen);
  useEffect(() => { frozenRef.current = frozen; }, [frozen]);

  useEffect(() => {
    let animFrame = 0;
    const scrollTargets: Element[] = [];

    const measure = () => {
      // While a cutscene is playing for another luminary, do not re-measure.
      // A position update would recalculate initX/initY and re-trigger the
      // return-flight animation, causing this entity to fly away mid-idle.
      if (frozenRef.current) return;
      const el = document.querySelector(
        `[data-luminary-id="${luminaryId}"]`
      ) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      // Check whether the card overlaps the scroll container's visible bounds.
      // When scrolled above the header the overlay must be hidden so it doesn't
      // paint over fixed chrome.
      const mainEl = document.querySelector('[data-game-board]') as HTMLElement | null;
      const mainRect = mainEl?.getBoundingClientRect();
      const withinScroller = mainRect
        ? r.bottom > mainRect.top && r.top < mainRect.bottom
        : true;
      setIsWithinScroller(withinScroller);
      setCardPos(prev => {
        if (!prev && !startViewRef.current) {
          startViewRef.current = {
            x: window.innerWidth  / 2,
            y: window.innerHeight / 2,
          };
        }
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(measure);
    };

    measure();
    const t = setTimeout(measure, 60); // re-check after render flush
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    document.querySelectorAll('[data-game-board], main').forEach(el => {
      el.addEventListener('scroll', onScroll, { passive: true });
      scrollTargets.push(el);
    });

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(animFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      scrollTargets.forEach(el => el.removeEventListener('scroll', onScroll));
    };
  }, [luminaryId]);

  // Start the idle loop 1.2 s after cardPos first arrives (once only).
  useEffect(() => {
    if (!cardPos || idleTimerRef.current) return;
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 1200);
  }, [cardPos]);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  if (!cardPos || !startViewRef.current) return null;

  // Outer div is fixed, centred on the card so the entity sits directly over it.
  const destX = cardPos.x - IDLE_W / 2;
  const destY = cardPos.y - IDLE_H / 2;

  // Inner motion.div initial offset: visually centres the entity at the
  // viewport centre (where the cutscene entity was), relative to the outer div.
  const initX = startViewRef.current.x - destX - IDLE_W / 2;
  const initY = startViewRef.current.y - destY - IDLE_H / 2;
  const initScale = ENT_W / IDLE_W; // ≈ 2.86 — matches cutscene entity visual size

  return (
    <div
      className="fixed pointer-events-none"
      style={{ zIndex: 18, left: destX, top: destY, width: IDLE_W, height: IDLE_H,
               opacity: (hidden || !isWithinScroller) ? 0 : 1,
               transition: (hidden || !isWithinScroller) ? 'none' : 'opacity 0.4s ease-in' }}
    >
      {/* ── Return flight: centre of viewport → card position ── */}
      <motion.div
        style={{ position: 'relative', width: IDLE_W, height: IDLE_H }}
        initial={{ x: initX, y: initY, scale: initScale, opacity: 0 }}
        animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        transition={{
          x:       { duration: 1.15, ease: [0.16, 1, 0.3, 1] },
          y:       { duration: 1.15, ease: [0.16, 1, 0.3, 1] },
          scale:   { duration: 1.20, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.40, ease: 'easeOut' },
        }}
      >
        {/* Colored aura — pulses once idle */}
        <motion.div
          style={{
            position: 'absolute',
            inset: -10,
            borderRadius: 14,
            background: `radial-gradient(ellipse at 50% 38%, ${glowColor}55 0%, ${primaryColor}28 55%, transparent 80%)`,
            filter: 'blur(12px)',
          }}
          animate={isIdle
            ? { opacity: [0.55, 0.92, 0.55], scale: [1, 1.12, 1] }
            : { opacity: 0.75 }
          }
          transition={isIdle ? {
            opacity: { repeat: Infinity, duration: 3.8, ease: 'easeInOut' },
            scale:   { repeat: Infinity, duration: 4.6, ease: 'easeInOut' },
          } : {}}
        />

        {/* Entity art — floats and breathes once idle */}
        <motion.div
          style={{ position: 'relative', width: IDLE_W, height: IDLE_H }}
          animate={isIdle
            ? { y: [0, -5, 0], scale: [1, 1.022, 1] }
            : {}
          }
          transition={isIdle ? {
            y:     { repeat: Infinity, duration: 3.3, ease: 'easeInOut', delay: 0.3 },
            scale: { repeat: Infinity, duration: 3.9, ease: 'easeInOut', delay: 0.1 },
          } : {}}
        >
          {entityCutout ? (
            <img
              src={entityCutout}
              alt=""
              draggable={false}
              style={{
                width: IDLE_W,
                height: IDLE_H,
                objectFit: 'contain',
                objectPosition: 'center top',
                display: 'block',
                // Fade to transparent in the lower third so the card's name /
                // requirements row stays legible underneath the entity.
                maskImage: 'radial-gradient(ellipse 90% 96% at 50% 30%, black 16%, rgba(0,0,0,0.92) 44%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.12) 74%, transparent 84%)',
                WebkitMaskImage: 'radial-gradient(ellipse 90% 96% at 50% 30%, black 16%, rgba(0,0,0,0.92) 44%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.12) 74%, transparent 84%)',
              }}
            />
          ) : (
            <EntityArt size={IDLE_W} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
