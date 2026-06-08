import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';
import { gameAudio } from './audio';
import { KNOWN_AURA_STYLES } from '@workspace/game-types';
import type { AuraStyle, LuminaryId } from '@workspace/game-types';
import { BOARD_CARD_W, BOARD_CARD_H } from './constants';
export { BOARD_CARD_W, BOARD_CARD_H };

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * KNOWN_AURA_STYLES and AuraStyle are the single source of truth for valid
 * auraStyle values, defined in @workspace/game-types so both the frontend and
 * the backend share the same type.  When adding a new animation variant, add
 * its key there and implement the matching case in AURA_VARIANTS below.
 */
export { KNOWN_AURA_STYLES, type AuraStyle, type LuminaryId };

interface LuminaryVisuals {
  id: LuminaryId;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  EntityArt: React.FC<{ size?: number; className?: string }>;
  /** CSS mix-blend-mode applied to the entityCutout img. Use 'screen' for dark-bg entities where bg-removal is imperfect. */
  entityBlendMode?: string;
  /**
   * Flash burst tint used during the summoning cutscene. This is the single
   * source of truth for both the sandbox and the game board — do not duplicate
   * these values elsewhere. Mirrors gameEngine.ts LUMINARIES[].summonColor;
   * update both together if you change a Luminary's flash palette.
   */
  summonColor: string;
  /** Secondary burst tint (used for gradient / dual-hue flash). Mirrors gameEngine.ts summonSecondaryColor. */
  summonSecondaryColor: string;
  /**
   * Aura animation style key consumed by the aura animation system.
   * Must be a member of KNOWN_AURA_STYLES.  Mirrors gameEngine.ts LUMINARIES[].auraStyle;
   * update both together.  The lint:summon-colors script enforces this at CI time.
   */
  auraStyle: AuraStyle;
  /**
   * Claim-cost tier — drives ambient glow intensity in LuminaryIdleOverlay.
   *   1 = mono-color  (single affinity requirement, 2L reward)   → 1.0× base opacity
   *   2 = dual-color  (two affinity requirements, 3L reward)      → 1.2× base opacity
   *   3 = triple-color (three affinity requirements, 4L reward)   → 1.45× base opacity
   * Mirrors the groupings in gameEngine.ts LUMINARIES[].requirements.
   */
  tier: 1 | 2 | 3;
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

// ─── Illustrated Asset Allow-list ─────────────────────────────────────────────
// Only Luminaries in this set will use illustrated panel/entity/aura assets.
// IDs NOT in this set fall back to procedural SVG art automatically.
//
// Update this list when a new panel passes the panel hard-rules review and is
// accepted for publication. Panels pending regeneration must NOT be added here.
//
// Accepted panels (14):
//   lum_ember   — accepted (gold standard)
//   lum_forge   — accepted (gold standard)
//   lum_verdant — accepted (gold standard)
//   lum_void    — accepted
//   lum_radiant — accepted
//   lum_null    — accepted (panel; entity pending regeneration separately)
//   lum_compass — accepted
//   lum_oracle  — accepted
//   lum_bloom   — accepted
//   lum_tide    — accepted (recursive tidal spiral, dark oceanic void bg)
//   lum_pale    — accepted (panel, entity, aura — static illustrated assets; animated SVG retired)
//   lum_astral  — accepted (cosmic arachnid embedded in dark crystal facets, constellation
//                  line overlay, dual ruby/sapphire corner gems, fire medallion)
//   lum_hunger  — accepted
//   lum_moth    — accepted (Red Moth; panel + entity on disk; no aura, falls back gracefully)
// ─────────────────────────────────────────────────────────────────────────────
const ILLUSTRATED_IDS = new Set<string>([
  'lum_ember',
  'lum_forge',
  'lum_verdant',
  'lum_void',
  'lum_radiant',
  'lum_null',
  'lum_compass',
  'lum_oracle',
  'lum_bloom',
  'lum_tide',
  'lum_pale',
  'lum_astral',
  'lum_hunger',
  'lum_moth',
  'lum_seed',
  'lum_orchard',
  'lum_scholar',
]);

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

function _getLuminaryImage(id: string, slot: 'panel' | 'entity' | 'background'): string | null {
  if (!ILLUSTRATED_IDS.has(id)) return null;
  return _luminaryImageMap[`${id}/${slot}`] ?? null;
}

/** Illustrated image slots for one Luminary. null = not yet available → fallback to procedural art. */
export interface LuminaryImageAssets {
  /** Sealed board panel art. Displayed in the objective tile and as the shattering vessel. */
  panelArt: string | null;
  /** Freed entity transparent cutout. No card border or square portrait edges. */
  entityCutout: string | null;
}

export function getLuminaryImageAssets(id: string): LuminaryImageAssets {
  return {
    panelArt:     _getLuminaryImage(id, 'panel'),
    entityCutout: _getLuminaryImage(id, 'entity'),
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
// Illustrated entity — loads the transparent PNG from disk; falls back to the
// procedural SVG if the asset is unavailable at build time.
function TideEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  const src = _getLuminaryImage('lum_tide', 'entity');
  if (src) {
    const w = size;
    const h = Math.round(size * 1.5);
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        className={className}
        style={{ width: w, height: h, objectFit: 'contain', display: 'block', flexShrink: 0 }}
      />
    );
  }
  return <TideEntityFallback size={size} className={className} />;
}

// Procedural SVG fallback — used only when the illustrated PNG is unavailable.
function TideEntityFallback({ size = 140, className = '' }: { size?: number; className?: string }) {
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

// ── Tide Architect Eye Overlay ────────────────────────────────────────────────
// Single realistic Ophanim eye centred over the entity's central awareness core.
// Anatomy: white sclera, textured sapphire iris with 24 radial fiber lines,
// black pupil, pulsing iris glow halo, and random autonomous blinking.
// The full iris group drifts slowly within the sclera; the eyelid closes
// from the top edge on a random schedule (every 2.5–7.5 s).
function TideEyeOverlay({ width, height, cyFactor = 0.472 }: { width: number; height: number; cyFactor?: number }) {
  const cx      = 0.490 * width;
  const cy      = cyFactor * height;
  const irisR   = 0.052 * width;
  const scleraRX = irisR * 1.54;
  const scleraRY = irisR * 1.28;
  const pupilR   = irisR * 0.38;

  // Iris drift — bounded so iris edge never exits the sclera
  const maxDX = (scleraRX - irisR) * 0.76;
  const maxDY = (scleraRY - irisR) * 0.76;
  const xKeys = [0,  maxDX*0.7,  maxDX,  maxDX*0.4, -maxDX*0.6, -maxDX, -maxDX*0.5,  0];
  const yKeys = [0, -maxDY*0.5, maxDY*0.3, maxDY*0.9, maxDY*0.5, -maxDY*0.2, -maxDY*0.8, 0];

  // Random blink: isOpen=false → eyelid animates shut, then re-opens
  const [isOpen, setIsOpen] = useState(true);
  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      tid = setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => { setIsOpen(true); scheduleBlink(); }, 160);
      }, 2500 + Math.random() * 5000);
    };
    scheduleBlink();
    return () => clearTimeout(tid);
  }, []);

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, overflow: 'visible' }}
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        {/* Sapphire iris — deep navy core → vibrant sky blue → dark limbal ring */}
        <radialGradient id="te-iris" cx="42%" cy="38%" r="55%">
          <stop offset="0%"   stopColor="#091828" />
          <stop offset="14%"  stopColor="#0c3460" />
          <stop offset="40%"  stopColor="#1560a0" />
          <stop offset="66%"  stopColor="#2182c8" />
          <stop offset="84%"  stopColor="#2a96dc" />
          <stop offset="100%" stopColor="#082030" />
        </radialGradient>
        {/* Black pupil */}
        <radialGradient id="te-pupil" cx="50%" cy="44%" r="50%">
          <stop offset="0%"   stopColor="#000000" />
          <stop offset="82%"  stopColor="#020508" />
          <stop offset="100%" stopColor="#060c18" />
        </radialGradient>
        {/* Sclera — bright centre, warm edges */}
        <radialGradient id="te-sclera" cx="44%" cy="38%" r="62%">
          <stop offset="0%"   stopColor="#ffffff"  stopOpacity="0.97" />
          <stop offset="65%"  stopColor="#eef4f6"  stopOpacity="0.93" />
          <stop offset="100%" stopColor="#dde8ea"  stopOpacity="0.86" />
        </radialGradient>
        {/* Pupil depth bloom */}
        <filter id="te-pupil-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="0.8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Iris outer glow — wide soft ring */}
        <filter id="te-iris-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.6" />
        </filter>
      </defs>

      {/* Entire eye fades to transparent on blink */}
      <motion.g
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: isOpen ? 0.14 : 0.07, ease: isOpen ? 'easeOut' : 'easeIn' }}
      >
        {/* White sclera — fixed */}
        <ellipse cx={cx} cy={cy} rx={scleraRX} ry={scleraRY} fill="url(#te-sclera)" />

        {/* Iris glow halo — pulsing sapphire ring just outside the iris */}
        <motion.circle
          cx={cx} cy={cy} r={irisR * 1.14}
          fill="none" stroke="#1eb8f0" strokeWidth={irisR * 0.38}
          filter="url(#te-iris-glow)"
          animate={{ opacity: [0.50, 0.95, 0.50], scale: [0.96, 1.06, 0.96] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Drifting iris group — iris + texture + limbal ring + pupil + catch lights */}
        <motion.g
          animate={{ x: xKeys, y: yKeys }}
          transition={{ repeat: Infinity, duration: 7.4, ease: 'easeInOut', repeatType: 'loop' }}
        >
          {/* Iris base */}
          <circle cx={cx} cy={cy} r={irisR} fill="url(#te-iris)" />
          {/* 24 radial fiber lines */}
          {Array.from({ length: 24 }).map((_, j) => {
            const angle = (j / 24) * Math.PI * 2;
            const inner = irisR * 0.24;
            const outer = irisR * 0.97;
            const op = 0.13 + (j % 4) * 0.07;
            return (
              <line key={j}
                x1={cx + Math.cos(angle) * inner} y1={cy + Math.sin(angle) * inner}
                x2={cx + Math.cos(angle) * outer} y2={cy + Math.sin(angle) * outer}
                stroke="#6dcffc" strokeWidth={irisR * 0.030} opacity={op}
              />
            );
          })}
          {/* Limbal ring */}
          <circle cx={cx} cy={cy} r={irisR} fill="none"
            stroke="#061424" strokeWidth={irisR * 0.10} opacity={0.88} />
          {/* Black pupil */}
          <circle cx={cx} cy={cy} r={pupilR} fill="url(#te-pupil)" filter="url(#te-pupil-glow)" />
          {/* Primary catch light — top-right */}
          <circle cx={cx + irisR * 0.32} cy={cy - irisR * 0.36} r={irisR * 0.14} fill="white" opacity={0.94} />
          {/* Secondary catch light — bottom-left */}
          <circle cx={cx - irisR * 0.18} cy={cy + irisR * 0.44} r={irisR * 0.06} fill="white" opacity={0.58} />
        </motion.g>

        {/* Upper eyelid shadow — anatomical depth */}
        <ellipse
          cx={cx} cy={cy - scleraRY * 0.10}
          rx={scleraRX * 0.98} ry={scleraRY * 0.60}
          fill="#020810" opacity={0.32}
        />
      </motion.g>
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
// Minimal procedural fallback shown only when entity.png is unavailable.
function RadiantEntityFallback({ size = 140, className = '' }: { size?: number; className?: string }) {
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

// Illustrated static entity PNG (896×1280 RGBA, transparent background).
// Falls back to RadiantEntityFallback if the PNG is unavailable at build time.
function RadiantEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  const src = _getLuminaryImage('lum_radiant', 'entity');
  if (!src) return <RadiantEntityFallback size={size} className={className} />;

  // The entity PNG is 896×1280 — height is ~1.429 × width.
  const w = size;
  const h = Math.round(size * (1280 / 896));

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      style={{ width: w, height: h, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}

/**
 * Living three-layer animated composite for the Concordance Mandala — renders
 * the ring / body / core layers with their CSS spin + pulse + float animations,
 * suitable for embedding in the activation cinematic at full screen scale.
 *
 * `size` is a CSS length string applied to both width and height of the square
 * container (e.g. '75vmin').  Returns null if the layer images aren't loaded.
 */
export function RadiantLivingEntityComposite({ size = '75vmin' }: { size?: string }) {
  const ring = _luminaryImageMap['lum_radiant/Radiant 1'] ?? null;
  const body = _luminaryImageMap['lum_radiant/Radiant 2'] ?? null;
  const core = _luminaryImageMap['lum_radiant/Radiant 3'] ?? null;

  if (!ring || !body || !core) return null;

  const layerImg: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'contain', display: 'block', mixBlendMode: 'screen',
  };
  const absfill: React.CSSProperties = { position: 'absolute', inset: 0 };

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Single float wrapper so all layers bob in sync */}
      <div className="lum-idle-float" style={absfill}>
        {/* Ring — slow CCW spin, permanent glow */}
        <div
          className="lum-radiant-ring-pulse"
          style={{ ...absfill, transform: 'scale(1.25) translateY(-3px)', transformOrigin: 'center center' }}
        >
          <img src={ring} draggable={false} alt="" className="lum-radiant-ring" style={layerImg} />
        </div>
        {/* Body */}
        <div style={{ ...absfill, transform: 'scale(1.1)', transformOrigin: 'center center' }}>
          <img src={body} draggable={false} alt="" style={layerImg} />
        </div>
        {/* Core orb — slow CW spin, glow pulse */}
        <div
          className="lum-radiant-core-pulse"
          style={{ ...absfill, transform: 'translateY(-5px) scale(0.20)', transformOrigin: 'center center' }}
        >
          <img src={core} draggable={false} alt="" className="lum-radiant-core" style={layerImg} />
        </div>
      </div>
    </div>
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

// ── ??? ─────────────────────────────────────────────────────────────────────────
// 8-point compass rose crown, navigator with pointing arm.
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
function OracleEntityFallback({ size = 140, className = '' }: { size?: number; className?: string }) {
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
      <ellipse cx="50" cy="72" rx="40" ry="48" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.48" />
      <ellipse cx="50" cy="72" rx="34" ry="42" fill="none" stroke="#ef4444" strokeWidth="0.55" opacity="0.28" />
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
      <polygon points="50,28 53,35 50,42 47,35" fill="none" stroke="#fbbf24" strokeWidth="0.75" opacity="0.62" />
      <line x1="50" y1="47" x2="50" y2="89" stroke="#fbbf24" strokeWidth="0.45" opacity="0.28" />
      <line x1="36" y1="79" x2="24" y2="90" stroke="#ef4444" strokeWidth="0.45" opacity="0.2" />
      <line x1="64" y1="79" x2="76" y2="90" stroke="#3d6bff" strokeWidth="0.45" opacity="0.2" />
    </svg>
  );
}

// ── Cosmic Oracle Entity (illustrated) ────────────────────────────────────────
// Renders the illustrated entity.png (cosmic dragon/serpent form).
// Falls back to OracleEntityFallback if the PNG is unavailable at build time.
function OracleEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  const src = _getLuminaryImage('lum_oracle', 'entity');
  if (!src) return <OracleEntityFallback size={size} className={className} />;

  // The entity PNG is 2:3 portrait (1024×1536) — height is 3/2 × width.
  const w = size;
  const h = Math.round(size * (3 / 2));

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      style={{ width: w, height: h, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}

// ── Null Sovereign ────────────────────────────────────────────────────────────
// Procedural SVG fallback — only shown when entity.png is unavailable at build time.
function NullEntityFallback({ size = 140, className = '' }: { size?: number; className?: string }) {
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

// Falls back to NullEntityFallback if the PNG is unavailable at build time.
function NullEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  const src = _getLuminaryImage('lum_null', 'entity');
  if (!src) return <NullEntityFallback size={size} className={className} />;

  // The entity PNG is 1024×1461 — height is ~1.427 × width.
  const w = size;
  const h = Math.round(size * (1461 / 1024));

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      style={{ width: w, height: h, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}

// ── Pale Sovereign Fallback ────────────────────────────────────────────────────
// Minimal procedural fallback shown only when entity.png is unavailable.
// The illustrated static entity.png is the primary asset for lum_pale.
function PaleEntityFallback({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="palf-spine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#8faabf" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="palf-wl" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f0f8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a0b8cc" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="palf-wr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8f0f8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a0b8cc" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="palf-amb" cx="50%" cy="38%">
          <stop offset="0%" stopColor="#dce8f4" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7899b0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="46" ry="52" fill="url(#palf-amb)" />
      <polygon points="46,28 4,20 6,36 28,42 44,38" fill="url(#palf-wl)" stroke="#c8d8ea" strokeWidth="0.6" opacity="0.85" />
      <polygon points="54,28 96,20 94,36 72,42 56,38" fill="url(#palf-wr)" stroke="#c8d8ea" strokeWidth="0.6" opacity="0.85" />
      <polygon points="10,74 13,79 10,85 7,79" fill="#e8f0f8" stroke="#a8c0d4" strokeWidth="0.6" />
      <polygon points="90,74 93,79 90,85 87,79" fill="#e8f0f8" stroke="#a8c0d4" strokeWidth="0.6" />
      <rect x="48.2" y="8" width="3.6" height="116" rx="1.8" fill="url(#palf-spine)" />
      <polygon points="50,2 47.2,14 52.8,14" fill="#f4f8fc" />
      <line x1="22" y1="65" x2="78" y2="65" stroke="#c8d8e8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 13,74 Q 13,84 21,84 Q 29,84 29,74 Z" fill="#dce8f4" stroke="#a0bcd0" strokeWidth="0.6" opacity="0.88" />
      <path d="M 71,74 Q 71,84 79,84 Q 87,84 87,74 Z" fill="#dce8f4" stroke="#a0bcd0" strokeWidth="0.6" opacity="0.88" />
      <polygon points="50,128 47.2,114 52.8,114" fill="#eef4fa" stroke="#b0c8d8" strokeWidth="0.4" />
    </svg>
  );
}

// ── Pale Sovereign Entity (Animated) ──────────────────────────────────────────
// Renders the illustrated entity.png with a continuous balance-seesaw animation.
// The whole figure gently rocks left-right around the beam-center pivot so the
// scale pans tip as if perpetually weighing souls.
// Falls back to PaleEntityFallback if the PNG is unavailable at build time.
function PaleEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  const src = _getLuminaryImage('lum_pale', 'entity');
  if (!src) return <PaleEntityFallback size={size} className={className} />;

  // The entity PNG is 2:3 portrait — height is 3/2 × width.
  const w = size;
  const h = Math.round(size * (3 / 2));

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      style={{ width: w, height: h, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}

// ── The First Hunger (lum_hunger) ─────────────────────────────────────────────
// Nanite swarm intelligence — Abyss + Flare.
// Background crossfade layers (background1/2) were removed to reduce GPU load.
// Only the static entity PNG is rendered now — fast, no animation churn.
function HungerEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  const entity = _getLuminaryImage('lum_hunger', 'entity');
  const w = size;
  const h = Math.round(size * 1.5);
  return (
    <div className={className} style={{ position: 'relative', width: w, height: h, flexShrink: 0 }}>
      {entity && (
        <img src={entity} alt="" draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, display: 'block', WebkitMaskImage: 'radial-gradient(ellipse at center, black 70%, transparent 95%)', maskImage: 'radial-gradient(ellipse at center, black 70%, transparent 95%)' }} />
      )}
    </div>
  );
}

// ─── Luminary Visuals Map ─────────────────────────────────────────────────────
// Colors derived from each Luminary's requirement gem palette.
// summonColor / summonSecondaryColor are the single source of truth for flash
// tints — they mirror gameEngine.ts LUMINARIES[].summonColor but live here so
// the frontend never reads them from the server event. Update both files in
// sync whenever a Luminary's flash palette changes.

export const LUMINARY_VISUALS: Record<LuminaryId, LuminaryVisuals> = {
  lum_ember:   { id: 'lum_ember',   primaryColor: '#ef4444', secondaryColor: '#1c1917', glowColor: 'rgba(239,68,68,0.6)',    EntityArt: EmberEntity,   summonColor: '#ff5a3c', summonSecondaryColor: '#7b1fa2', auraStyle: 'fire',    tier: 3 },
  lum_tide:    { id: 'lum_tide',    primaryColor: '#3d6bff', secondaryColor: '#e2e8f0', glowColor: 'rgba(61,107,255,0.55)',  EntityArt: TideEntity,    summonColor: '#60a5fa', summonSecondaryColor: '#e2e8f0', auraStyle: 'tide',    tier: 1 },
  lum_verdant: { id: 'lum_verdant', primaryColor: '#2ecc71', secondaryColor: '#166534', glowColor: 'rgba(46,204,113,0.55)',  EntityArt: VerdantEntity, summonColor: '#4ade80', summonSecondaryColor: '#166534', auraStyle: 'verdant', tier: 1 },
  lum_void:    { id: 'lum_void',    primaryColor: '#7c3aed', secondaryColor: '#0a0a14', glowColor: 'rgba(124,58,237,0.55)',  EntityArt: VoidEntity,    summonColor: '#4c1d95', summonSecondaryColor: '#0a0a14', auraStyle: 'void',    tier: 1 },
  lum_radiant: { id: 'lum_radiant', primaryColor: '#fef9c3', secondaryColor: '#2ecc71', glowColor: 'rgba(254,249,195,0.5)', EntityArt: RadiantEntity, summonColor: '#fef9c3', summonSecondaryColor: '#2ecc71', auraStyle: 'radiant', tier: 1 },
  lum_astral:  { id: 'lum_astral',  primaryColor: '#ef4444', secondaryColor: '#3d6bff', glowColor: 'rgba(239,68,68,0.55)',   EntityArt: AstralEntity,  summonColor: '#f43f5e', summonSecondaryColor: '#3d6bff', auraStyle: 'astral',  tier: 2 },
  lum_forge:   { id: 'lum_forge',   primaryColor: '#f97316', secondaryColor: '#1c1917', glowColor: 'rgba(249,115,22,0.6)',   EntityArt: ForgeEntity,   summonColor: '#f97316', summonSecondaryColor: '#1c1917', auraStyle: 'storm',   tier: 2 },
  lum_pale:    { id: 'lum_pale',    primaryColor: '#94a3b8', secondaryColor: '#0a0a14', glowColor: 'rgba(148,163,184,0.5)',  EntityArt: PaleEntity,    summonColor: '#cbd5e1', summonSecondaryColor: '#0a0a14', auraStyle: 'pale',    tier: 2 },
  lum_bloom:   { id: 'lum_bloom',   primaryColor: '#4ade80', secondaryColor: '#7f1d1d', glowColor: 'rgba(74,222,128,0.55)',  EntityArt: BloomEntity,   summonColor: '#86efac', summonSecondaryColor: '#7f1d1d', auraStyle: 'bloom',   tier: 2 },
  lum_compass: { id: 'lum_compass', primaryColor: '#3d6bff', secondaryColor: '#2ecc71', glowColor: 'rgba(61,107,255,0.55)',  EntityArt: CompassEntity, summonColor: '#38bdf8', summonSecondaryColor: '#0a0a14', auraStyle: 'distorted', tier: 2, entityBlendMode: 'screen' },
  lum_oracle:  { id: 'lum_oracle',  primaryColor: '#f59e0b', secondaryColor: '#2dd4bf', glowColor: 'rgba(245,158,11,0.65)', EntityArt: OracleEntity,  summonColor: '#fbbf24', summonSecondaryColor: '#ef4444', auraStyle: 'oracle',  tier: 3 },
  lum_null:    { id: 'lum_null',    primaryColor: '#ffffff', secondaryColor: '#0a0a14', glowColor: 'rgba(255,255,255,0.45)', EntityArt: NullEntity,    summonColor: '#ffffff', summonSecondaryColor: '#0a0a14', auraStyle: 'null',    tier: 3 },
  lum_hunger:  { id: 'lum_hunger',  primaryColor: '#dc2626', secondaryColor: '#0a0a0a', glowColor: 'rgba(220,38,38,0.55)',   EntityArt: HungerEntity,  summonColor: '#fbbf24', summonSecondaryColor: '#4ade80', auraStyle: 'oracle',  tier: 3 },
  lum_moth:    { id: 'lum_moth',    primaryColor: '#ef4444', secondaryColor: '#1c1917', glowColor: 'rgba(239,68,68,0.55)',   EntityArt: BloomEntity,   summonColor: '#ef4444', summonSecondaryColor: '#7f1d1d', auraStyle: 'fire',    tier: 2, entityBlendMode: 'screen' },
  lum_seed:    { id: 'lum_seed',    primaryColor: '#38bdf8', secondaryColor: '#4ade80', glowColor: 'rgba(56,189,248,0.55)',  EntityArt: BloomEntity,   summonColor: '#38bdf8', summonSecondaryColor: '#4ade80', auraStyle: 'compass', tier: 2, entityBlendMode: 'screen' },
  lum_orchard: { id: 'lum_orchard', primaryColor: '#4ade80', secondaryColor: '#fef9c3', glowColor: 'rgba(74,222,128,0.55)',  EntityArt: BloomEntity,   summonColor: '#4ade80', summonSecondaryColor: '#fef9c3', auraStyle: 'verdant', tier: 2, entityBlendMode: 'screen' },
  lum_scholar: { id: 'lum_scholar', primaryColor: '#818cf8', secondaryColor: '#e0e7ff', glowColor: 'rgba(129,140,248,0.55)',  EntityArt: BloomEntity,   summonColor: '#818cf8', summonSecondaryColor: '#e0e7ff', auraStyle: 'distorted', tier: 2, entityBlendMode: 'screen' },
};

const FALLBACK_VISUALS: LuminaryVisuals = {
  id: 'fallback' as LuminaryId,
  primaryColor: '#fbbf24',
  secondaryColor: '#f59e0b',
  glowColor: 'rgba(251,191,36,0.5)',
  summonColor: '#fbbf24',
  summonSecondaryColor: '#f59e0b',
  auraStyle: 'fire',
  tier: 1,
  EntityArt: ({ size = 140 }) => (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4}>
      <circle cx="50" cy="70" r="30" fill="#fbbf24" opacity="0.7" />
      <circle cx="50" cy="42" r="12" fill="#fef08a" />
    </svg>
  ),
};

export function getLuminaryVisuals(id: string): LuminaryVisuals {
  return (LUMINARY_VISUALS as Record<string, LuminaryVisuals>)[id] ?? FALLBACK_VISUALS;
}

// ─── Aura Variant Lookup ──────────────────────────────────────────────────────
// Maps each AuraStyle key to the CSS class and visual parameters that drive
// the idle overlay aura div and the cutscene flash-haze animation.
//
// idleClass     — CSS class applied to the idle aura div when isIdle===true.
//                 Replaces the generic 'lum-idle-aura'.  The CSS keyframes
//                 are defined in index.css under "Aura style variants".
// gradientShape — ellipse/circle descriptor injected into the radial-gradient
//                 background of the aura div (colours are appended at render).
// flashOrigin   — transformOrigin for the cutscene flash-haze expansion so the
//                 bloom radiates from the Luminary's thematic focal point
//                 (fire rises upward, tide spreads sideways, void collapses in).
// flashScaleEnd — final scale keyframe of the flash-haze animation; controls
//                 how far the bloom expands before fading (void stays tight,
//                 bloom bursts wide).
//
// FALLBACK: any style missing from this map uses 'lum-idle-aura' and the
// default parameters — this is an explicit fallback, not a silent one.

interface AuraVariant {
  idleClass: string;
  ambientClass: string;
  gradientShape: string;
  flashOrigin: string;
  flashScaleEnd: number;
}

/**
 * Emergency fallback — kept for error-boundary / dynamic-string scenarios only.
 * Normal code must NOT use this: `AURA_VARIANTS` is typed as
 * `Record<AuraStyle, AuraVariant>` so every valid `AuraStyle` is guaranteed
 * a real entry at compile time.  Using the fallback at call sites that already
 * hold a typed `AuraStyle` silences the compile-time guarantee and allows an
 * unrecognised style to slip through silently.
 *
 * If you need to add a new aura style, add it to `KNOWN_AURA_STYLES` in
 * `@workspace/game-types` and implement the matching entry in `AURA_VARIANTS`.
 */
export const AURA_VARIANT_FALLBACK: AuraVariant = {
  idleClass: 'lum-idle-aura',
  ambientClass: 'lum-ambient-generic',
  gradientShape: 'ellipse at 50% 42%',
  flashOrigin: '50% 42%',
  flashScaleEnd: 1.72,
};

export const AURA_VARIANTS: Record<AuraStyle, AuraVariant> = {
  // fire — irregular upward flicker; bloom rises from below
  fire:    { idleClass: 'lum-aura-fire',  ambientClass: 'lum-ambient-fire',  gradientShape: 'ellipse 44% 72% at 50% 58%', flashOrigin: '50% 62%', flashScaleEnd: 1.80 },
  // storm — electric rapid flicker; tight sharp bloom
  storm:   { idleClass: 'lum-aura-storm', ambientClass: 'lum-ambient-storm', gradientShape: 'ellipse 42% 62% at 50% 48%', flashOrigin: '50% 42%', flashScaleEnd: 1.68 },
  // tide — slow rolling wave; bloom spreads wide horizontally
  tide:    { idleClass: 'lum-aura-tide',  ambientClass: 'lum-ambient-tide',  gradientShape: 'ellipse 82% 44% at 50% 46%', flashOrigin: '50% 50%', flashScaleEnd: 1.88 },
  // void — imploding dark pulse; bloom contracts rather than expands far
  void:    { idleClass: 'lum-aura-void',  ambientClass: 'lum-ambient-void',  gradientShape: 'circle at 50% 44%',          flashOrigin: '50% 44%', flashScaleEnd: 1.52 },
  // radiant — slow organic swell (lum_radiant has layered spinning FX on top)
  radiant: { idleClass: 'lum-aura-bloom', ambientClass: 'lum-ambient-bloom', gradientShape: 'ellipse 70% 68% at 50% 44%', flashOrigin: '50% 42%', flashScaleEnd: 1.82 },
  // astral — dual fire/ice electric flicker; crisp mid-range bloom
  astral:  { idleClass: 'lum-aura-storm', ambientClass: 'lum-ambient-storm', gradientShape: 'ellipse 60% 62% at 50% 44%', flashOrigin: '50% 42%', flashScaleEnd: 1.72 },
  // verdant — slow organic swell; bloom rises from roots upward
  verdant: { idleClass: 'lum-aura-bloom', ambientClass: 'lum-ambient-bloom', gradientShape: 'ellipse 68% 70% at 50% 46%', flashOrigin: '50% 48%', flashScaleEnd: 1.86 },
  // pale — double-peak silver shimmer; starburst-shaped glow
  pale:    { idleClass: 'lum-aura-pale',  ambientClass: 'lum-ambient-pale',  gradientShape: 'ellipse 66% 58% at 50% 44%', flashOrigin: '50% 44%', flashScaleEnd: 1.74 },
  // bloom — largest organic swell; widest bloom expansion
  bloom:   { idleClass: 'lum-aura-bloom', ambientClass: 'lum-ambient-bloom', gradientShape: 'ellipse 72% 72% at 50% 46%', flashOrigin: '50% 46%', flashScaleEnd: 1.90 },
  // compass — orbital wave; wide horizontal spread
  compass: { idleClass: 'lum-aura-tide',  ambientClass: 'lum-ambient-tide',  gradientShape: 'ellipse 76% 48% at 50% 44%', flashOrigin: '50% 44%', flashScaleEnd: 1.82 },
  // oracle — slow amber burn; upward-biased flicker like embers
  oracle:  { idleClass: 'lum-aura-fire',  ambientClass: 'lum-ambient-fire',  gradientShape: 'ellipse 52% 60% at 50% 48%', flashOrigin: '50% 46%', flashScaleEnd: 1.76 },
  // null — entropy; barely perceptible, bloom barely expands
  null:    { idleClass: 'lum-aura-null',  ambientClass: 'lum-ambient-null',  gradientShape: 'circle at 50% 50%',           flashOrigin: '50% 50%', flashScaleEnd: 1.44 },
  // distorted — double-pulse stutter; two gentle breaths per cycle
  distorted: { idleClass: 'lum-aura-distorted', ambientClass: 'lum-ambient-distorted', gradientShape: 'ellipse 72% 56% at 50% 46%', flashOrigin: '50% 46%', flashScaleEnd: 1.78 },
};

/**
 * Lore-appropriate display names for each aura animation style key.
 * Used to surface the style name in the Luminary detail panel alongside
 * the description, e.g. "Tide — Slow rolling wave…"
 */
export const AURA_STYLE_NAMES: Record<AuraStyle, string> = {
  fire:    'Flare',
  storm:   'Storm',
  tide:    'Tide',
  void:    'Void',
  radiant: 'Radiant',
  astral:  'Astral',
  verdant: 'Verdant',
  pale:    'Pale',
  bloom:   'Bloom',
  compass: 'Compass',
  oracle:  'Oracle',
  null:    'Null',
  distorted: 'Distorted',
};

/**
 * Human-readable lore descriptions for each aura animation style.
 * Surfaced in the Luminary detail panel so players understand the entity's
 * presence before committing to a claim.
 */
export const AURA_STYLE_DESCRIPTIONS: Record<AuraStyle, string> = {
  fire:    'Irregular upward flicker — ignition consciousness rising from below',
  storm:   'Electric rapid discharge — tight arc bloom, tense and violent',
  tide:    'Slow rolling wave — broad horizontal drift, patient and inevitable',
  void:    'Imploding dark pulse — presence collapses inward, resisting observation',
  radiant: 'Slow organic swell — layered resonant luminescence, ordered and serene',
  astral:  'Dual fire-ice flicker — twin-natured bloom caught between states',
  verdant: 'Slow organic swell — growth rising from deep roots, unhurried',
  pale:    'Double-peak silver shimmer — starburst radiance, between breath and silence',
  bloom:   'Widest organic swell — vast expansion bloom, generative and open',
  compass: 'Orbital wave — sweeping horizontal spread, tracing unseen paths',
  oracle:  'Slow amber burn — upward ember drift, deliberate and foretelling',
  null:    'Entropy field — presence reduced to near-absence, the silence beneath silence',
  distorted: 'Warped space ripple — gentle scale breathing, reality fraying at the edges',
};

// ─── Panel Art Component ──────────────────────────────────────────────────────
// Renders the Luminary entity "sealed" inside the board objective tile.
// Uses panelArt illustrated image when available; falls back to procedural SVG.

export function LuminaryPanelArt({
  luminaryId,
  width,
  height,
  claimed = false,
}: {
  luminaryId: string;
  /** Explicit pixel width applied to the component's own root div. Required so callers
   *  can never accidentally produce a 0×0 invisible tile by forgetting to size the parent. */
  width: number;
  /** Explicit pixel height applied to the component's own root div. Required for the same
   *  reason as `width`. */
  height: number;
  claimed?: boolean;
}) {
  const vis = getLuminaryVisuals(luminaryId);
  const { primaryColor, secondaryColor, glowColor, EntityArt } = vis;
  const { panelArt } = getLuminaryImageAssets(luminaryId);
  const entitySize = Math.min(width, height);

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>

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
            <EntityArt size={entitySize * 0.88} />
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

// Board-card dimensions: imported from '@/lib/constants' (BOARD_CARD_W / BOARD_CARD_H)

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
// Ambient board glow — larger fixed div that sits behind the idle overlay (z-index 17)
// and casts a diffuse tinted halo onto the surrounding board area.
const AMBIENT_W = Math.round(IDLE_W * 2.5);      // ≈ 280
const AMBIENT_H = Math.round(IDLE_H * 2.5);      // ≈ 440

// Per-entity idle-overlay display tweaks.
// Adjust here when a specific entity image is proportioned differently from the
// rest (e.g. extra negative space, unusual aspect ratio, seated vs standing).
// `scale`          — multiplier on the inner entity wrapper (transformOrigin: center top).
// `objectPosition` — CSS object-position for the entity <img>; overrides 'center top'.
// `objectFit`      — CSS object-fit for the entity <img>; overrides 'contain'.
// `idleCyFactor`   — TideEyeOverlay-only: vertical centre of the eye in the idle panel
//                    as a fraction of IDLE_H. Lower value → eye moves up.
const IDLE_ENTITY_OVERRIDES: Record<string, {
  scale?: number;
  objectPosition?: string;
  objectFit?: string;
  idleCyFactor?: number;
  noFloat?: boolean;
}> = {
  lum_void:   { scale: 1.22, objectPosition: 'center 25%' },
  lum_tide:   { idleCyFactor: 0.435 },
  // Cosmic arachnid spans radially — center it in the portrait card frame
  // rather than using the default portrait 'center top' position.
  lum_astral: { scale: 1.08, objectPosition: 'center 42%' },
  // Wide cosmic entity — crop to fill the portrait card so it doesn't shrink
  // to a tiny sliver with letterbox bars on top and bottom.
  lum_compass: { objectFit: 'cover', objectPosition: 'center center', noFloat: true },
  // Wide horizontal seed — shift down slightly so the body fills the tall
  // portrait panel without floating at the top.
  lum_seed: { objectPosition: 'center 55%' },
  // Wide horizontal Glass Orchard — scale up and center so it fills the panel.
  lum_orchard: { scale: 1.18, objectPosition: 'center 45%' },
};

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

type ShardPiece = {
  clip: string;
  dx: number;
  dy: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  z?: number;
};

// Six large shard pieces — clip paths in percentage coords (W=112, H=160).
// Motion: slow outward drift, subtle 3-D tumble, affinity-colour pulse, fade.
const PANEL_PIECES: readonly ShardPiece[] = [
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
];

const PHASE_DURATIONS: Record<CutscenePhase, number> = {
  establish:    500,
  panning:      650,  // board DOM pans as a unit toward the card (overlay=0)
  focusing:     550,  // camera layer zooms in on the now-centred card
  intro:         50,
  zooming:       50,
  pressure:      60,
  firstcrack:   320,
  leaking:      850,
  secondcrack:  360,
  cracking:    1100,
  shattering:   850,
  flashing:     800,
  revealed:   3600,
  fading:      550,
  done:           0,
};

const PHASES: CutscenePhase[] = [
  'establish', 'panning', 'focusing', 'intro', 'zooming',
  'pressure', 'firstcrack', 'leaking', 'secondcrack', 'cracking',
  'shattering', 'flashing', 'revealed', 'fading', 'done',
];


export function LuminarySummonCutscene({
  luminaryId,
  luminaryName,
  domain,
  lumens,
  flavor,
  claimedBy,
  cardRect,
  onComplete,
  onFlash,
  onSkip,
  overrideColor,
}: {
  luminaryId: string;
  luminaryName: string;
  domain: string;
  lumens: number;
  flavor: string;
  claimedBy?: string;
  cardRect?: { cx: number; cy: number; w: number };
  onComplete: () => void;
  onFlash?: () => void;
  onSkip?: () => void;
  overrideColor?: string;
}) {
  const [phase, setPhase] = useState<CutscenePhase>('establish');
  // True once the cutscene reaches the fully-revealed phase and lingers,
  // waiting for the player to tap/click to continue.
  const [awaitingDismiss, setAwaitingDismiss] = useState(false);
  // Ref to the dismiss function so the click handler and the Skip/Continue
  // button can both call it without capturing stale closures.
  const dismissRef = useRef<(() => void) | null>(null);
  const isMobile = useIsMobile();
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor: visPrimaryColor, secondaryColor, glowColor, entityBlendMode, auraStyle } = vis;
  // AURA_VARIANTS[auraStyle] intentionally not used — all flash elements now use
  // fixed duration/scale regardless of aura variant for a consistent snappy feel.
  // When overrideColor is provided (win-sealing summon), use it for all burst/particle
  // visuals so they match the sealing Luminary's summonColor rather than the generic
  // LUMINARY_VISUALS primaryColor.
  const primaryColor = (overrideColor && overrideColor.startsWith('#') && overrideColor.length >= 7)
    ? overrideColor
    : visPrimaryColor;
  // RGB components of primaryColor for rgba() drop-shadows on shatter chunks
  const pRgb = `${parseInt(primaryColor.slice(1,3),16)},${parseInt(primaryColor.slice(3,5),16)},${parseInt(primaryColor.slice(5,7),16)}`;
  // RGB components of secondaryColor for the flash haze tint blend
  const sRgb = `${parseInt(secondaryColor.slice(1,3),16)},${parseInt(secondaryColor.slice(3,5),16)},${parseInt(secondaryColor.slice(5,7),16)}`;
  const { panelArt, entityCutout } = getLuminaryImageAssets(luminaryId);

  // Trap keyboard focus inside the cutscene container for the duration of the
  // animation.  When onSkip is provided a "Skip view" button is the only
  // focusable element; without it the cutscene has no interactive elements and
  // the trap activates but immediately releases on Escape via the onSkip path.
  const containerRef = useRef<HTMLElement | null>(null);
  // When the cutscene is waiting at the reveal frame, route Escape to the same
  // dismiss handler as the tap-anywhere path so the summon can always resolve.
  // Before reveal, Escape keeps the existing local-skip behaviour (hides the
  // overlay but lets the internal timer complete so the server gate is not jumped).
  useFocusTrap(
    containerRef,
    true,
    awaitingDismiss
      ? () => { if (dismissRef.current) dismissRef.current(); }
      : (onSkip ?? (() => {})),
  );

  // Keep refs so the phase-advance closure always sees the latest callbacks
  // without the effect needing to re-run (which would reset the timer chain).
  const onFlashRef = useRef(onFlash);
  useEffect(() => { onFlashRef.current = onFlash; }, [onFlash]);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Fire all cutscene sound effects pre-scheduled against AudioContext time.
  // Runs exactly once on mount; respects the user's mute setting internally.
  // auraStyle is stable for the lifetime of this component (derived from luminaryId).
  useEffect(() => {
    gameAudio.playSummonCutscene(auraStyle);
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

      if (next === 'revealed') {
        // Pause here — do not auto-advance to fading. Instead arm the dismiss
        // ref so the player can tap/click anywhere to continue.
        setAwaitingDismiss(true);
        dismissRef.current = () => {
          if (cancelled || !dismissRef.current) return;
          dismissRef.current = null; // guard against double-fire
          setAwaitingDismiss(false);
          advance(); // advances idx → fading, then done
        };
        return;
      }

      if (next !== 'done') setTimeout(advance, PHASE_DURATIONS[next]);
      else setTimeout(() => onCompleteRef.current(), 80);
    }
    const t = setTimeout(advance, PHASE_DURATIONS['establish']);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
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
  const isRevealed    = phase === 'shattering' || phase === 'flashing' || phase === 'revealed' || phase === 'fading';
  const isRevealedActive = phase === 'revealed';
  const isFading      = phase === 'fading';
  // Vessel appears at intro — camera has fully arrived at the card by then.
  // Keeping it out of focusing prevents the proxy from overlapping the real card
  // during board-camera travel, which caused the "duplicate panning" artifact.
  const isVessel  = isIntro || isZooming || isPressure || isFirstCrack || isLeaking || isSecondCrack || isCracking;
  const hasCracks = isFirstCrack || isLeaking || isSecondCrack || isCracking || isShattering;
  // Shards stay mounted through the entity reveal so they drift apart while
  // the Luminary manifests — creating the "born from the shattered vessel" effect.
  const isShatterVisible = isShattering || isFlashing;

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
    isShattering     ? 0.98 :   // hide the real board so only shards are visible
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
  // Camera zooms OUT during shatter so the pieces are visible against the board.
  const camScale = isShattering ? 1 : (camZoomed ? targetScale : 1);

  // ── Vessel glow (ramps through crack phases) ─────────────────────────────
  // NOTE: shake/tremble animation is handled via CSS keyframes
  // (lum-vessel-shake-0 through lum-vessel-shake-5 in index.css).
  // NOTE: the glow pulse is also CSS now (lum-vessel-glow + CSS custom props)
  // to avoid JS frame budget burn from framer-motion repeat:Infinity loops.
  const glowDur = isCracking ? 0.40 : isSecondCrack ? 0.48 : isLeaking ? 0.55 : isFirstCrack ? 0.65 : isPressure ? 0.75 : 0.80;
  const glowDim = isPressure
    ? `0 0 10px ${primaryColor}60`
    : isFirstCrack
      ? `0 0 14px ${primaryColor}80`
      : isLeaking
        ? `0 0 20px ${primaryColor}a0`
        : isSecondCrack
          ? `0 0 22px ${primaryColor}b0`
          : `0 0 26px ${primaryColor}c0`;
  const glowBright = isPressure
    ? `0 0 24px ${primaryColor}90`
    : isFirstCrack
      ? `0 0 32px ${primaryColor}b0`
      : isLeaking
        ? `0 0 42px ${primaryColor}d0, 0 0 12px ${primaryColor}50`
        : isSecondCrack
          ? `0 0 48px ${primaryColor}e0, 0 0 16px ${primaryColor}68`
          : `0 0 52px ${primaryColor}f0, 0 0 18px ${primaryColor}80`;

  // Vessel is positioned at viewport centre — the board pan brings the card
  // there before the vessel appears, so they perfectly overlap.
  const vesselLeft = vw / 2 - BOARD_CARD_W / 2;
  const vesselTop  = vh / 2 - BOARD_CARD_H / 2;

  return (
    <div
      ref={(el) => { containerRef.current = el; }}
      className="fixed inset-0 z-[9000]"
      onClick={() => {
        if (awaitingDismiss && dismissRef.current) dismissRef.current();
      }}
    >

      {/* ── Skip View button — only visible before the cutscene is ready to dismiss ── */}
      {onSkip && !awaitingDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
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
          <div
            className="absolute pointer-events-none lum-board-glow-tremble"
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
              className={
                `absolute overflow-hidden bg-black ${
                  isCracking ? 'lum-vessel-shake-5'
                  : isSecondCrack ? 'lum-vessel-shake-4'
                  : isLeaking ? 'lum-vessel-shake-3'
                  : isFirstCrack ? 'lum-vessel-shake-2'
                  : isPressure ? 'lum-vessel-shake-1'
                  : 'lum-vessel-shake-0'
                }${(isPressure || hasCracks) ? ' lum-vessel-glow' : ''}`
              }
              style={{
                left: vesselLeft,
                top:  vesselTop,
                width:  BOARD_CARD_W,
                height: BOARD_CARD_H,
                borderRadius: 12,
                // Static shadow when not glowing; CSS animation takes over during crack phases.
                ...( !(isPressure || hasCracks) && {
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                }),
                // CSS custom props for lum-vessel-glow keyframe (see index.css).
                '--lum-glow-dim':    glowDim,
                '--lum-glow-bright': glowBright,
                '--lum-glow-dur':    `${glowDur}s`,
              } as React.CSSProperties}
              initial={{ opacity: 0 }}
              animate={{
                opacity: isShattering ? 0 : 1,
                scale: 1,
              }}
              exit={{ opacity: 0, transition: { duration: 0.06, ease: 'linear' } }}
              transition={{
                scale:   { duration: 0.26 },
                opacity: { duration: 0.28 },
              }}
            >
              {/* Identical interior to LuminaryCard — same component, same props */}
              <LuminaryPanelArt luminaryId={luminaryId} width={BOARD_CARD_W} height={BOARD_CARD_H} />
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
                    stroke="white" strokeWidth="1.5" fill="none"
                    filter={isMobile ? undefined : "url(#cgb)"}
                    initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                    animate={isMobile ? { opacity: [0, 1.0, 0.95] } : { pathLength: 1, opacity: [0, 1.0, 0.95] }}
                    transition={{ duration: 0.10, ease: 'easeOut' }}
                  />
                  {/* L2 chasing glow + L3 residual wound glow — skipped on mobile
                      (each requires pathLength+getTotalLength+blur filter; 12 paths
                       total across both cracks, too expensive for mobile main thread) */}
                  {!isMobile && (<>
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
                  <motion.path
                    d={`M${TAX},0 L${K1X},${K1Y} L${PX},${PY}`}
                    stroke={primaryColor} strokeWidth="14" fill="none" filter="url(#cgw)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0, 0.46, 0.64, 0.56] }}
                    transition={{ duration: 0.62, delay: 0.14, ease: 'easeOut' }}
                  />
                  </>)}
                  {/* L4 tinted seam */}
                  <motion.path
                    d={`M${TAX},0 L${K1X},${K1Y} L${PX},${PY}`}
                    stroke={primaryColor} strokeWidth="3.5" fill="none"
                    initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                    animate={isMobile ? { opacity: 0.45 } : { pathLength: 1, opacity: [0, 0, 0.32, 0.52, 0.45] }}
                    transition={{ duration: isMobile ? 0.18 : 0.58, delay: 0.16, ease: 'easeOut' }}
                  />

                  {/* ── Branch: P→K2→RA (right edge) ─────────────────────── */}
                  <motion.path
                    d={`M${PX},${PY} L${K2X},${K2Y} L${BOARD_CARD_W},${RAY}`}
                    stroke="white" strokeWidth="1.2" fill="none"
                    filter={isMobile ? undefined : "url(#cgb)"}
                    initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                    animate={isMobile ? { opacity: [0, 0.90, 0.84] } : { pathLength: 1, opacity: [0, 0.90, 0.84] }}
                    transition={{ duration: 0.10, delay: 0.06, ease: 'easeOut' }}
                  />
                  {!isMobile && (<>
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
                  </>)}
                  <motion.path
                    d={`M${PX},${PY} L${K2X},${K2Y} L${BOARD_CARD_W},${RAY}`}
                    stroke={primaryColor} strokeWidth="2.8" fill="none"
                    initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                    animate={isMobile ? { opacity: 0.38 } : { pathLength: 1, opacity: [0, 0, 0.26, 0.44, 0.38] }}
                    transition={{ duration: isMobile ? 0.18 : 0.50, delay: 0.18, ease: 'easeOut' }}
                  />

                  {/* ── Branch: P→K3a→K3b→LA2 (left edge) ─────────────── */}
                  <motion.path
                    d={`M${PX},${PY} L${K3aX},${K3aY} L${K3bX},${K3bY} L0,${LA2Y}`}
                    stroke="white" strokeWidth="1.0" fill="none"
                    filter={isMobile ? undefined : "url(#cgb)"}
                    initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                    animate={isMobile ? { opacity: [0, 0.85, 0.78] } : { pathLength: 1, opacity: [0, 0.85, 0.78] }}
                    transition={{ duration: 0.12, delay: 0.07, ease: 'easeOut' }}
                  />
                  {!isMobile && (<>
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
                  </>)}
                  <motion.path
                    d={`M${PX},${PY} L${K3aX},${K3aY} L${K3bX},${K3bY} L0,${LA2Y}`}
                    stroke={primaryColor} strokeWidth="2.5" fill="none"
                    initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                    animate={isMobile ? { opacity: 0.34 } : { pathLength: 1, opacity: [0, 0, 0.24, 0.40, 0.34] }}
                    transition={{ duration: isMobile ? 0.18 : 0.48, delay: 0.19, ease: 'easeOut' }}
                  />

                  {/* ── Fine detail: tiny branch off K1 toward top-left corner */}
                  {!isMobile && (
                  <motion.path d={`M${K1X},${K1Y} L22,14 L12,5`}
                    stroke="white" strokeWidth="0.60" fill="none" filter="url(#cgb)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.70, 0.60] }}
                    transition={{ duration: 0.08, delay: 0.09, ease: 'easeOut' }}
                  />
                  )}

                  {/* ── Light leaking through first crack (leaking+) ─────────── */}
                  {(isLeaking || isSecondCrack || isCracking) && (
                    <>
                      {/* Diffuse light pool at P — primary junction */}
                      <circle cx={PX} cy={PY} r="20" fill={primaryColor}
                        filter="url(#cgw)"
                        className="lum-cs-pool"
                        style={{ animationDuration: '3.8s' }}
                      />
                      {/* Mote 1 — near TA, along main crack */}
                      <circle cx={TAX} cy={8} r="1.1" fill="white" filter="url(#cgb)"
                        className="lum-cs-mote"
                      />
                      {/* Mote 2 — at K1 kink */}
                      <circle cx={K1X} cy={K1Y} r="0.9" fill="white" filter="url(#cgb)"
                        className="lum-cs-mote"
                        style={{ animationDuration: '3.2s', animationDelay: '0.38s' }}
                      />
                      {/* Mote 3 — at P junction */}
                      <circle cx={PX} cy={PY} r="1.5" fill="white" filter="url(#cgb)"
                        className="lum-cs-mote"
                        style={{ animationDuration: '2.6s', animationDelay: '0.65s' }}
                      />
                      {/* Mote 4 — on P→RA branch near K2 */}
                      <circle cx={K2X} cy={K2Y} r="0.9" fill="white" filter="url(#cgb)"
                        className="lum-cs-mote"
                        style={{ animationDuration: '3.6s', animationDelay: '0.20s' }}
                      />
                      {/* Mote 5 — on P→LA2 branch near K3b */}
                      <circle cx={K3bX} cy={K3bY} r="0.9" fill="white" filter="url(#cgb)"
                        className="lum-cs-mote"
                        style={{ animationDuration: '2.9s', animationDelay: '0.80s' }}
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
                        stroke="white" strokeWidth="1.6" fill="none"
                        filter={isMobile ? undefined : "url(#cgb)"}
                        initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                        animate={isMobile ? { opacity: [0, 1.0, 0.94] } : { pathLength: 1, opacity: [0, 1.0, 0.94] }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                      />
                      {!isMobile && (<>
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
                      </>)}
                      <motion.path
                        d={`M${PX},${PY} L${K4X},${K4Y} L${QX},${QY} L${K8X},${K8Y} L${BAX},${BOARD_CARD_H}`}
                        stroke={primaryColor} strokeWidth="4.0" fill="none"
                        initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                        animate={isMobile ? { opacity: 0.44 } : { pathLength: 1, opacity: [0, 0, 0.30, 0.50, 0.44] }}
                        transition={{ duration: isMobile ? 0.18 : 0.64, delay: 0.14, ease: 'easeOut' }}
                      />

                      {/* ── Branch: Q→K5→K6→RB (right edge) ────────────── */}
                      <motion.path
                        d={`M${QX},${QY} L${K5X},${K5Y} L${K6X},${K6Y} L${BOARD_CARD_W},${RBY}`}
                        stroke="white" strokeWidth="1.0" fill="none"
                        filter={isMobile ? undefined : "url(#cgb)"}
                        initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                        animate={isMobile ? { opacity: [0, 0.80, 0.72] } : { pathLength: 1, opacity: [0, 0.80, 0.72] }}
                        transition={{ duration: 0.12, delay: 0.22, ease: 'easeOut' }}
                      />
                      {!isMobile && (<>
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
                      </>)}
                      <motion.path
                        d={`M${QX},${QY} L${K5X},${K5Y} L${K6X},${K6Y} L${BOARD_CARD_W},${RBY}`}
                        stroke={primaryColor} strokeWidth="2.6" fill="none"
                        initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                        animate={isMobile ? { opacity: 0.36 } : { pathLength: 1, opacity: [0, 0, 0.24, 0.42, 0.36] }}
                        transition={{ duration: isMobile ? 0.18 : 0.52, delay: 0.32, ease: 'easeOut' }}
                      />

                      {/* ── Branch: Q→K7→LA (left edge) ─────────────────── */}
                      <motion.path
                        d={`M${QX},${QY} L${K7X},${K7Y} L0,${LAY}`}
                        stroke="white" strokeWidth="0.85" fill="none"
                        filter={isMobile ? undefined : "url(#cgb)"}
                        initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                        animate={isMobile ? { opacity: [0, 0.76, 0.68] } : { pathLength: 1, opacity: [0, 0.76, 0.68] }}
                        transition={{ duration: 0.11, delay: 0.25, ease: 'easeOut' }}
                      />
                      {!isMobile && (<>
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
                      </>)}
                      <motion.path
                        d={`M${QX},${QY} L${K7X},${K7Y} L0,${LAY}`}
                        stroke={primaryColor} strokeWidth="2.0" fill="none"
                        initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                        animate={isMobile ? { opacity: 0.30 } : { pathLength: 1, opacity: [0, 0, 0.20, 0.36, 0.30] }}
                        transition={{ duration: isMobile ? 0.18 : 0.44, delay: 0.35, ease: 'easeOut' }}
                      />

                      {/* ── Fine detail: tiny branch off K4 toward upper-left */}
                      {!isMobile && (
                      <motion.path d={`M${K4X},${K4Y} L38,84 L28,82`}
                        stroke="white" strokeWidth="0.55" fill="none" filter="url(#cgb)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.62, 0.52] }}
                        transition={{ duration: 0.08, delay: 0.20, ease: 'easeOut' }}
                      />
                      )}

                      {/* ── Light pools and motes along second crack ─────── */}
                      <circle cx={QX} cy={QY} r="16" fill={primaryColor}
                        filter="url(#cgw)"
                        className="lum-cs-pool"
                        style={{ animationDelay: '0.4s' }}
                      />
                      <circle cx={K4X} cy={K4Y} r="1.0" fill="white" filter="url(#cgb)"
                        className="lum-cs-mote"
                        style={{ animationDelay: '0.25s' }}
                      />
                      <circle cx={K5X} cy={K5Y} r="0.9" fill="white" filter="url(#cgb)"
                        className="lum-cs-mote"
                        style={{ animationDuration: '3.0s', animationDelay: '0.55s' }}
                      />

                      {/* Energy rays from P (primary junction) — opacity-only CSS, scaleY dropped */}
                      <line x1={PX} y1={PY} x2={PX} y2={0}
                        stroke="url(#rayUp)" strokeWidth="2.4"
                        className="lum-cs-ray"
                        style={{ animationDuration: '0.52s' }}
                      />
                      <line x1={PX} y1={PY} x2={PX} y2={BOARD_CARD_H}
                        stroke="url(#rayDown)" strokeWidth="2.4"
                        className="lum-cs-ray"
                        style={{ animationDuration: '0.58s', animationDelay: '0.14s' }}
                      />
                      <line x1={PX} y1={PY} x2={0} y2={PY}
                        stroke="url(#rayLeft)" strokeWidth="1.6"
                        className="lum-cs-ray"
                        style={{ animationDuration: '0.64s', animationDelay: '0.24s' }}
                      />
                      <line x1={PX} y1={PY} x2={BOARD_CARD_W} y2={PY}
                        stroke="url(#rayRight)" strokeWidth="1.6"
                        className="lum-cs-ray"
                        style={{ animationDuration: '0.60s', animationDelay: '0.38s' }}
                      />
                      {/* Secondary light pool at K2 (right branch kink) */}
                      <circle cx={K2X} cy={K2Y} r="10" fill={primaryColor}
                        filter="url(#cgw)"
                        className="lum-cs-pool"
                        style={{ animationDelay: '0.5s' }}
                      />
                    </>
                  )}

                  {/* ── Cracking phase: energy burst at P and Q ───────────────── */}
                  {isCracking && !isMobile && (
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
            initial={{ opacity: 0, scale: 0.08 }}
            animate={{
              opacity: isFlashing ? 0 : [0, 0.84, 0.98, 0.96, 0.82, 0.46, 0],
              // Breath-hold at peak scale (1.30) for 120 ms before settling,
              // so the flash feels like a camera charging — more impact.
              scale:   isFlashing ? 0.16 : [0.08, 0.40, 0.78, 1.02, 1.20, 1.30, 1.30, 1.26],
            }}
            exit={{ opacity: 0, transition: { duration: 0.85, ease: 'easeOut' } }}
            transition={{
              opacity: { duration: 1.08, times: [0, 0.10, 0.24, 0.42, 0.64, 0.84, 1.0], ease: 'easeInOut' },
              scale:   { duration: 1.08, times: [0, 0.10, 0.26, 0.44, 0.64, 0.76, 0.88, 1.0], ease: [0.16, 1, 0.3, 1] },
            }}
            style={{
              width: BOARD_CARD_W * 5.5, height: BOARD_CARD_H * 5,
              left: vesselLeft + BOARD_CARD_W / 2 - BOARD_CARD_W * 2.75,
              top:  vesselTop  + BOARD_CARD_H / 2 - BOARD_CARD_H * 2.5,
              background: `radial-gradient(ellipse 42% 46% at 50% 44%, #ffffff 0%, #ffffffff 10%, #ffffffdd 24%, #ffffff88 50%, transparent 84%)`,
              filter: 'blur(6px)',
              borderRadius: '50%',
              transformOrigin: '50% 50%',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Six large crystal polygon chunks ─────────────────────────── */}
      {/* Rendered at the SAME zoom scale as the vessel (targetScale) so the   */}
      {/* shards are the same apparent size as the card they split from. They   */}
      {/* drift apart in a large arc, rotate in 3-D, and dissolve into the    */}
      {/* Luminary's primary affinity colour via screen-blend overlay.          */}
      <AnimatePresence>
        {isShatterVisible && PANEL_PIECES.map((piece, i) => {
          const z0 = piece.z ?? (i % 2 === 0 ? 80 : -80);
          const z1 = piece.z ? piece.z * 2.2 : (i % 2 === 0 ? 180 : -180);
          return (
          <motion.div key={`chunk-${i}`} className="absolute pointer-events-none"
            style={{
              width: BOARD_CARD_W * 1.28, height: BOARD_CARD_H * 1.28,
              left: vesselLeft, top: vesselTop,
              clipPath: piece.clip,
              willChange: 'transform, opacity',
              ...(isMobile ? {} : {
                transformPerspective: 1000,
                transformStyle: 'preserve-3d',
              }),
            }}
            initial={{
              x: 0, y: 0,
              z: 0,
              rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1,
              filter: `brightness(1.0) drop-shadow(2px -2px 2px rgba(${pRgb},0.60)) drop-shadow(-1px 1px 2px rgba(0,0,22,0.55))`,
            }}
            animate={{
              x: [0, piece.dx * 0.11, piece.dx],
              y: [0, piece.dy * 0.11, piece.dy],
              ...(isMobile ? {} : {
                z: [0, z0, z1],
              }),
              rotateX: [0, piece.rotateX],
              rotateY: [0, piece.rotateY],
              rotateZ: [0, piece.rotateZ],
              opacity: [1, 1, 1, 0.96, 0.66, 0],
              filter: isMobile
                ? [
                    `brightness(1.0) drop-shadow(2px -2px 2px rgba(${pRgb},0.56))`,
                    `brightness(2.0) drop-shadow(0 0 8px rgba(${pRgb},0.88))`,
                  ]
                : [
                    `brightness(1.0) drop-shadow(2px -2px 2px rgba(${pRgb},0.56)) drop-shadow(-1px 1px 2px rgba(0,0,22,0.52))`,
                    `brightness(1.3) drop-shadow(3px -3px 4px rgba(${pRgb},0.72)) drop-shadow(-2px 2px 4px rgba(0,0,22,0.40))`,
                    `brightness(2.0) drop-shadow(5px -4px 7px rgba(${pRgb},0.88)) drop-shadow(-3px 3px 6px rgba(${pRgb},0.30))`,
                    `brightness(3.6) drop-shadow(0 0 14px rgba(${pRgb},0.96)) drop-shadow(0 0 26px rgba(${pRgb},0.58))`,
                    `brightness(5.6) drop-shadow(0 0 20px rgba(${pRgb},1.0)) drop-shadow(0 0 38px rgba(255,255,255,0.68))`,
                    `brightness(8.0) drop-shadow(0 0 26px rgba(${pRgb},1.0)) drop-shadow(0 0 48px rgba(255,255,255,0.86))`,
                  ],
            }}
            transition={{
              duration: isMobile ? 3.2 : 5.00,
              delay: i * 0.04,
              x:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
              y:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
              ...(isMobile ? {} : {
                z:       { times: [0, 0.18, 1.0], ease: ['easeOut', 'easeInOut'] },
              }),
              rotateX: { times: [0, 1.0], ease: 'easeOut', duration: isMobile ? 3.2 : 5.00 },
              rotateY: { times: [0, 1.0], ease: 'easeOut', duration: isMobile ? 3.2 : 5.00 },
              rotateZ: { times: [0, 1.0], ease: 'easeOut', duration: isMobile ? 3.2 : 5.00 },
              opacity: { times: [0, 0.08, 0.26, 0.46, 0.66, 0.84, 1.0], ease: 'easeInOut' },
              filter:  isMobile
                ? { times: [0, 1.0], ease: 'easeInOut' }
                : { times: [0, 0.10, 0.24, 0.44, 0.64, 0.82, 1.0], ease: 'easeInOut' },
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
              <LuminaryPanelArt luminaryId={luminaryId} width={BOARD_CARD_W} height={BOARD_CARD_H} />
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
        )})}
      </AnimatePresence>

      {/* ── Crystal dust particles ── scattering from vessel center ───────────
          Tiny primaryColor dots burst outward during the shattering phase, like
          pulverized crystal fragments.  CSS-driven (compositor thread) with
          per-particle --dust-dx/dy/dur for organic irregularity.                  */}
      {isShattering && (() => {
        const dustCount = 48;
        const maxRadius = 280;
        const particles = Array.from({ length: dustCount }, (_, i) => {
          const angle = (Math.PI * 2 * i) / dustCount + (Math.random() - 0.5) * 0.6;
          const radius = maxRadius * (0.3 + Math.random() * 0.7);
          const size = 1.5 + Math.random() * 2.5;
          const dur = 1.2 + Math.random() * 1.4;
          const delay = Math.random() * 0.35;
          return {
            key: `dust-${i}`,
            dx: Math.cos(angle) * radius,
            dy: Math.sin(angle) * radius,
            size,
            dur,
            delay,
          };
        });
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <div
                key={p.key}
                className="lum-cs-dust"
                style={{
                  left: `calc(50% + ${p.dx * 0.06}px)`,
                  top: `calc(50% + ${p.dy * 0.06}px)`,
                  width: p.size,
                  height: p.size,
                  background: `rgba(${pRgb},0.92)`,
                  ['--dust-dx' as string]: `${p.dx}px`,
                  ['--dust-dy' as string]: `${p.dy}px`,
                  ['--dust-dur' as string]: `${p.dur}s`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>
        );
      })()}

      {/* ── Full-viewport bloom flash — outside camera layer ────────────────── */}
      {/* Two-layer structure simulates eyes recovering from a blinding flash:  */}
      {/*   Layer 1 (white core): acute overexposure — clears fast (~1.1 s)    */}
      {/*   Layer 2 (warm haze): lingering afterglow — expands & fades slowly  */}
      {/*   over 5+ s, well into the cosmic reveal, like photoreceptors reset.  */}
      <AnimatePresence>
        {isFlashing && (
          <>
            {/* White core — immediate bright flash, then fades fast */}
            <motion.div key="flash-core" className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: [1, 1, 0.6, 0.1, 0], scale: [0.5, 1.2, 1.8, 2.2, 2.6] }}
              transition={{ duration: 0.55, times: [0, 0.15, 0.45, 0.75, 1], ease: 'easeOut' }}
              exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
              style={{
                background: `radial-gradient(ellipse 55% 55% at 50% 42%, #ffffff 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.2) 70%, transparent 100%)`,
                filter: isMobile ? 'blur(2px)' : 'blur(4px)',
              }}
            />
            {/* Affinity haze — quick burst of the luminary's color */}
            <motion.div key="flash-haze" className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.7, 0.35, 0.1, 0], scale: [0.4, 1.0, 1.4, 1.8, 2.2] }}
              transition={{ duration: 0.8, times: [0, 0.15, 0.40, 0.70, 1], ease: 'easeOut' }}
              exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
              style={{
                background: `radial-gradient(ellipse at 50% 42%, rgba(${pRgb},0.9) 0%, rgba(${pRgb},0.5) 35%, rgba(${sRgb},0.2) 60%, transparent 85%)`,
                filter: isMobile ? 'blur(4px)' : 'blur(8px)',
              }}
            />
            {/* Shock ring — expanding ring burst */}
            <motion.div key="flash-ring" className="absolute pointer-events-none"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0.8, 0.4, 0], scale: [0.3, 1.0, 1.6, 2.2] }}
              transition={{ duration: 0.6, times: [0, 0.2, 0.55, 1], ease: 'easeOut' }}
              exit={{ opacity: 0 }}
              style={{
                width: isMobile ? BOARD_CARD_W * 2.0 : BOARD_CARD_W * 3.2,
                height: isMobile ? BOARD_CARD_H * 2.0 : BOARD_CARD_H * 3.2,
                left: vesselLeft + BOARD_CARD_W / 2 - (isMobile ? BOARD_CARD_W * 1.0 : BOARD_CARD_W * 1.6),
                top:  vesselTop  + BOARD_CARD_H / 2 - (isMobile ? BOARD_CARD_H * 1.0 : BOARD_CARD_H * 1.6),
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.55)',
                transformOrigin: '50% 50%',
              }}
            />
          </>
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
              background: `radial-gradient(ellipse 54% 58% at 50% 42%, rgba(${pRgb},0.18) 0%, rgba(0,0,0,0.62) 100%)`,
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
      {/* face-on. Haze blur is lighter (6px) so the silhouette is readable     */}
      {/* through it while swinging.                                              */}
      {/* Slow, even reveal: entity mounts at 4800ms (shattering), starts at 5000ms, */}
      {/* and reaches full size/opacity by 7000ms. No keyframe jumps — one smooth    */}
      {/* easeOut curve from hidden to fully present.                               */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            key="entity"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ overflow: 'visible' }}
            initial={{ opacity: 0, filter: 'blur(26px) brightness(0.10)' }}
            animate={isFading
              ? { opacity: 0, filter: 'blur(0px) brightness(1.0)' }
              : {
                  opacity: [0, 0.88, 0.90, 0.94, 1.0],
                  filter: [
                    'blur(26px) brightness(0.10)',
                    'blur(24px) brightness(0.16)',
                    'blur(22px) brightness(0.20)',
                    'blur(6px)  brightness(0.68)',
                    'blur(0px)  brightness(1.0)',
                  ],
                }
            }
            transition={isFading
              ? { duration: 0.55, ease: 'easeIn' }
              : {
                  opacity: { duration: 3.6, delay: 0.15, times: [0, 0.10, 0.30, 0.55, 1.0], ease: 'easeOut' },
                  filter:  { duration: 3.6, delay: 0.15, times: [0, 0.10, 0.30, 0.55, 1.0], ease: 'easeOut' },
                }
            }
          >
            {/* 3D portal break-through — entity starts deep behind the portal     */}
            {/* (rotateY=32°, z=-200), then swings face-on toward the viewer.        */}
            {/* perspective=800px gives the depth illusion; easeOut keeps it slow.    */}
            <motion.div
              className="relative flex flex-col items-center"
              style={{ overflow: 'visible', perspective: '800px' }}
              initial={{ scale: 0.02, y: -90, opacity: 0, rotateY: 18, z: -480 }}
              animate={isFading
                ? { scale: 1.14, y: -38, opacity: 0, rotateY: 0, z: 0 }
                : {
                    scale:   [0.02, 0.86, 1.0],
                    y:       [-90, 54, 0],
                    opacity: 1,
                    rotateY: [18, 3, 0],
                    z:       [-480, -28, 0],
                  }
              }
              transition={isFading
                ? { duration: 0.55, ease: 'easeIn' }
                : {
                    scale:   { duration: 1.7, delay: 0.08, times: [0, 0.36, 1.0], ease: ['easeIn', 'easeOut'] },
                    y:       { duration: 1.7, delay: 0.08, times: [0, 0.36, 1.0], ease: ['easeIn', 'easeOut'] },
                    rotateY: { duration: 1.7, delay: 0.08, times: [0, 0.36, 1.0], ease: ['easeIn', 'easeOut'] },
                    z:       { duration: 1.7, delay: 0.08, times: [0, 0.36, 1.0], ease: ['easeIn', 'easeOut'] },
                    opacity: { duration: 0.55, delay: 0.08, ease: 'easeOut' },
                  }
              }
            >
              {/* Breathing hover — CSS animation replaces framer-motion repeat:Infinity y+scale */}
              <div
                className={`relative flex flex-col items-center gap-4${isFading ? '' : ' lum-cs-hover'}`}
                style={{ overflow: 'visible' }}
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
                      filter: 'blur(12px)',
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
                      background: `radial-gradient(ellipse at 50% 46%, ${glowColor}88 0%, ${glowColor}55 18%, ${glowColor}22 36%, ${primaryColor}11 56%, transparent 76%)`,
                      filter: 'blur(8px)',
                      zIndex: 2,
                      mixBlendMode: 'screen',
                    }}
                  />

                  {/* Portal rim ring (480×560) — thin bright event-horizon edge */}
                  {/* Entity — aggressive elliptical mask dissolves edges into portal */}
                  {/* Any baked-in background or white fringe reads as rim-light.    */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: isFlashing ? 0 : isFading ? 0 : 0.38,
                    scale: isFlashing ? 0.5 : isFading ? 1.1 : 1.0,
                  }}
                  transition={{
                    opacity: { duration: 2.0, ease: 'easeOut' },
                    scale: { type: 'spring', stiffness: 70, damping: 16, mass: 1.1 },
                  }}
                  style={{
                    position: 'absolute',
                    width: 480,
                    height: 560,
                    top: '50%',
                    left: '50%',
                    x: '-50%',
                    y: '-52%',
                    borderRadius: '50%',
                    background: 'transparent',
                    boxShadow: `0 0 0 2px ${glowColor}55, inset 0 0 28px ${glowColor}33`,
                    zIndex: 5,
                    pointerEvents: 'none',
                  }}
                />
                  {/* Entity glow — static midpoint filter; portal bloom provides ambient pulse */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      // lum_radiant: skip the filter — a CSS filter creates an isolated
                      // compositing group, which prevents mix-blend-mode:screen on the
                      // inner layers from blending against the dark portal behind them.
                      // The radiant composite supplies its own glow via lum-radiant-*
                      // CSS animation classes instead.
                      filter: (luminaryId === 'lum_radiant' || isFading || isFlashing)
                        ? 'none'
                        : `drop-shadow(0 0 22px ${glowColor}cc) drop-shadow(0 0 10px ${primaryColor}88)`,
                    }}
                  >
                    <div style={{ position: 'relative', width: ENT_W, height: ENT_H, zIndex: 1 }}>
                      {luminaryId === 'lum_radiant' ? (() => {
                        // Three-layer animated composite — same form as the idle overlay,
                        // scaled to the larger ENT_W container.
                        const r1 = _luminaryImageMap['lum_radiant/Radiant 1'] ?? null;
                        const r2 = _luminaryImageMap['lum_radiant/Radiant 2'] ?? null;
                        const r3 = _luminaryImageMap['lum_radiant/Radiant 3'] ?? null;
                        const lyr: React.CSSProperties = {
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: 'contain', display: 'block', mixBlendMode: 'screen',
                        };
                        const af: React.CSSProperties = { position: 'absolute', inset: 0 };
                        return (
                          <>
                            {r1 && (
                              <div className="lum-radiant-ring-pulse"
                                style={{ ...af, transform: 'scale(1.25) translateY(-3px)', transformOrigin: 'center center' }}>
                                <img src={r1} draggable={false} alt=""
                                  className="lum-radiant-ring" style={lyr} />
                              </div>
                            )}
                            {r2 && (
                              <div style={{ ...af, transform: 'scale(1.1)', transformOrigin: 'center center' }}>
                                <img src={r2} draggable={false} alt="" style={lyr} />
                              </div>
                            )}
                            {r3 && (
                              <div className="lum-radiant-core-pulse"
                                style={{ ...af, transform: 'translateY(-8px) scale(0.20)', transformOrigin: 'center center' }}>
                                <img src={r3} draggable={false} alt=""
                                  className="lum-radiant-core" style={lyr} />
                              </div>
                            )}
                          </>
                        );
                      })() : luminaryId === 'lum_hunger' ? (() => {
                        const hEnt = _getLuminaryImage('lum_hunger', 'entity');
                        return (
                          <div style={{ position: 'relative', width: ENT_W, height: ENT_H }}>
                            {hEnt && (
                              <img src={hEnt} alt={luminaryName} draggable={false}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, display: 'block', border: 'none', WebkitMaskImage: 'radial-gradient(ellipse at center, black 70%, transparent 95%)', maskImage: 'radial-gradient(ellipse at center, black 70%, transparent 95%)' }} />
                            )}
                          </div>
                        );
                      })() : luminaryId === 'lum_compass' ? (() => {
                        const bg = _getLuminaryImage('lum_compass', 'background');
                        const fill: React.CSSProperties = {
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          display: 'block',
                        };
                        return (
                          <div
                            style={{ position: 'relative', width: ENT_W, height: ENT_H }}
                          >
                            {/* Illustrated cosmic background — actual star-field image that fades radially into the portal */}
                            {bg && (
                              <img
                                src={bg}
                                alt=""
                                draggable={false}
                                className="lum-compass-bg-fade"
                                style={{ ...fill, objectFit: 'cover' }}
                              />
                            )}
                            {/* Entity with heat-haze shimmer — living motion while background stays fixed */}
                            {entityCutout && (
                              <div
                                className="lum-compass-heat-haze"
                                style={{ position: 'absolute', inset: 0, zIndex: 1 }}
                              >
                                <img
                                  src={entityCutout}
                                  alt={luminaryName}
                                  draggable={false}
                                  style={{
                                    ...fill,
                                    objectFit: 'cover',
                                    objectPosition: 'center center',
                                    transform: 'scale(1.35)',
                                    transformOrigin: 'center center',
                                    ...(entityBlendMode ? { mixBlendMode: entityBlendMode as React.CSSProperties['mixBlendMode'] } : {}),
                                    maskImage: 'radial-gradient(ellipse 66% 72% at 50% 44%, black 24%, rgba(0,0,0,0.88) 42%, rgba(0,0,0,0.40) 58%, transparent 76%)',
                                    WebkitMaskImage: 'radial-gradient(ellipse 66% 72% at 50% 44%, black 24%, rgba(0,0,0,0.88) 42%, rgba(0,0,0,0.40) 58%, transparent 76%)',
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })() : entityCutout ? (
                        <img src={entityCutout} alt={luminaryName}
                          style={{
                            width: ENT_W, height: ENT_H,
                            objectFit: 'contain',
                            // Shift the wide horizontal seed down slightly so its body
                            // sits at the center of the tall vortex panel.
                            objectPosition: luminaryId === 'lum_seed' ? 'center 55%' : 'center',
                            display: 'block',
                            // Stretch wide landscape entities (seed, orchard) vertically
                            // so they fill the tall portrait panel without letterboxing.
                            transform: luminaryId === 'lum_seed' ? 'scale(1.15, 1.68)' : luminaryId === 'lum_oracle' ? 'scale(1.30)' : luminaryId === 'lum_orchard' ? 'scale(1.25, 1.45)' : undefined,
                            transformOrigin: luminaryId === 'lum_seed' || luminaryId === 'lum_orchard' ? 'center center' : luminaryId === 'lum_oracle' ? 'center center' : undefined,
                            ...(entityBlendMode ? { mixBlendMode: entityBlendMode as React.CSSProperties['mixBlendMode'] } : {}),
                            maskImage: 'radial-gradient(ellipse 66% 72% at 50% 44%, black 24%, rgba(0,0,0,0.88) 42%, rgba(0,0,0,0.40) 58%, transparent 76%)',
                            WebkitMaskImage: 'radial-gradient(ellipse 66% 72% at 50% 44%, black 24%, rgba(0,0,0,0.88) 42%, rgba(0,0,0,0.40) 58%, transparent 76%)',
                          }}
                          draggable={false}
                        />
                      ) : (
                        // Procedural SVG entity — transparent bg, no mask needed
                        <EntityArt size={ENT_W} />
                      )}
                      {luminaryId === 'lum_tide' && <TideEyeOverlay width={ENT_W} height={ENT_H} />}
                    </div>
                  </div>

                </div>
                {/* ── end portal composition ── */}

                {/* Name / domain / Eminence badge */}
                <motion.div
                  className="flex flex-col items-center gap-1 text-center"
                  initial={{ opacity: 0, filter: 'brightness(4) blur(4px)' }}
                  animate={{
                    opacity: isFlashing ? 0 : (isFading ? 0 : 1),
                    filter: isFlashing ? 'brightness(4) blur(4px)' : (isFading ? 'brightness(1) blur(0px)' : 'brightness(1) blur(0px)'),
                  }}
                  transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {domain && (
                    <div className="text-[10px] font-bold tracking-[0.22em] uppercase"
                      style={{ color: primaryColor }}>{domain}</div>
                  )}
                  <div className="text-xl font-serif font-bold text-white drop-shadow-lg">
                    {luminaryName}
                  </div>
                  {claimedBy && (
                    <div className="text-[11px] font-semibold px-3 py-0.5 rounded-full mt-0.5"
                      style={{ background: `${primaryColor}22`, color: primaryColor, border: `1px solid ${primaryColor}44` }}>
                      Allied with {claimedBy}
                    </div>
                  )}
                  <div className="text-base font-bold px-3 py-0.5 rounded-full"
                    style={{ background: `${primaryColor}28`, color: primaryColor, border: `1px solid ${primaryColor}55` }}>
                    {lumens < 0 ? `\u2212${Math.abs(lumens)} Eminence \u2014 all players` : `+${lumens} Eminence`}
                  </div>
                  {flavor && (
                    <div className="text-[11px] text-white/50 italic max-w-[260px] mt-1 leading-snug">
                      &ldquo;{flavor}&rdquo;
                    </div>
                  )}
                  {/* Footer ends here — no aura label/description */}
                </motion.div>

              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ── AuraPreviewModal ─────────────────────────────────────────────────────────
// Full-screen overlay triggered by clicking the small aura preview widget in
// the Luminary detail sheet. Shows entity art + full-size aura animation.
// Keyboard: Escape closes via the parent's useEscapeToClose handler
//           (useFocusTrap uses handleEscape:false to avoid double-close).
// Tap/click backdrop to close.

const MODAL_ENTITY_W = 260;
const MODAL_ENTITY_H = Math.round(MODAL_ENTITY_W * 1.43); // ≈ 372

export function AuraPreviewModal({
  luminaryId,
  luminaryName,
  onClose,
}: {
  luminaryId: string;
  luminaryName: string;
  onClose: () => void;
}) {
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor, glowColor, entityBlendMode, auraStyle } = vis;
  const auraVariant = AURA_VARIANTS[auraStyle] ?? AURA_VARIANT_FALLBACK;
  const { entityCutout } = getLuminaryImageAssets(luminaryId);
  const containerRef = useRef<HTMLElement | null>(null);

  useFocusTrap(containerRef, true, onClose, { handleEscape: false });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop — dark with a soft centered halo in the Luminary's color.
          Intentionally avoids backdrop-filter:blur (very expensive on mobile).
          The gradient alone is sufficient and runs at native GPU fill-rate. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 70% at 50% 42%, ${primaryColor}22 0%, #00000099 55%, #000000dd 100%)`,
        }}
      />
      {/* Dialog container */}
      <motion.div
        ref={(el) => { containerRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-label={`${luminaryName} aura preview`}
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 290 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center gap-5"
      >
        {/* Entity + aura layer */}
        <div style={{ position: 'relative', width: MODAL_ENTITY_W, height: MODAL_ENTITY_H }}>
          {/* Aura glow — same CSS animation as the board idle overlay, but larger */}
          <div
            className={auraVariant.idleClass}
            style={{
              position: 'absolute',
              inset: -52,
              borderRadius: 28,
              background: `radial-gradient(${auraVariant.gradientShape}, ${glowColor}55 0%, ${primaryColor}33 40%, ${glowColor}18 64%, transparent 84%)`,
            }}
          />
          {/* Entity art — full portrait, no fade mask (not overlaying card content) */}
          {entityCutout ? (
            <img
              src={entityCutout}
              alt=""
              draggable={false}
              style={{
                position: 'relative',
                zIndex: 1,
                width: MODAL_ENTITY_W,
                height: MODAL_ENTITY_H,
                objectFit: 'contain',
                objectPosition: 'center top',
                display: 'block',
                ...(entityBlendMode
                  ? { mixBlendMode: entityBlendMode as React.CSSProperties['mixBlendMode'] }
                  : {}),
              }}
            />
          ) : (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <EntityArt size={MODAL_ENTITY_W} />
            </div>
          )}
        </div>
        {/* Dismiss hint — also acts as the primary keyboard focus target */}
        <button
          onClick={onClose}
          className="text-[11px] font-semibold tracking-widest uppercase text-white/35 hover:text-white/65 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 rounded px-3 py-1"
          aria-label="Close aura preview"
        >
          Tap anywhere to dismiss
        </button>
      </motion.div>
    </motion.div>
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
export const LuminaryIdleOverlay = React.memo(function LuminaryIdleOverlay({ luminaryId, frozen = false, hidden = false, activeAffinityColor }: { luminaryId: string; frozen?: boolean; hidden?: boolean; activeAffinityColor?: string }) {
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor, glowColor, entityBlendMode, auraStyle } = vis;
  const auraVariant = AURA_VARIANTS[auraStyle] ?? AURA_VARIANT_FALLBACK;
  // Tier-aware ambient class — tier-2 gets a wider opacity swing; tier-3 gets
  // a dramatically wider swing + scale swell at a slower breathing cadence.
  const tierSuffix = vis.tier === 3 ? '-t3' : vis.tier === 2 ? '-t2' : '';
  const tieredAmbientClass = `${auraVariant.ambientClass}${tierSuffix}`;
  const { entityCutout } = getLuminaryImageAssets(luminaryId);

  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  // False when the card has been scrolled outside the <main> scroller's visible
  // area (e.g. user scrolled down and the Luminary row is above the fold).
  // The overlay is hidden while out-of-bounds so it doesn't paint over the header.
  const [isWithinScroller, setIsWithinScroller] = useState(true);
  // Container-relative position for the idle portal path. Updated by measureCore
  // alongside cardPos, but only meaningfully consumed once isIdle is true.
  const [absCardPos, setAbsCardPos] = useState<{ x: number; y: number } | null>(null);

  // Tracks isIdle without stale closures — read inside the scroll handler.
  const isIdleRef = useRef(false);
  useEffect(() => { isIdleRef.current = isIdle; }, [isIdle]);

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
  const hiddenRef = useRef(hidden);
  useEffect(() => { hiddenRef.current = hidden; }, [hidden]);

  // Exposed so the unhide effect below can force a single measurement that
  // bypasses the hiddenRef early-return guard (before hiddenRef updates).
  const forceMeasureRef = useRef<() => void>(() => {});

  // Latest [data-game-board] bounding rect — updated on every measure() call.
  // Stored as a ref (not state) so scroll events don't trigger extra re-renders;
  // the clip-path is recomputed inline whenever cardPos causes a re-render.
  const boardRectRef = useRef<DOMRect | null>(null);
  // Cached element refs so querySelector only runs once per element.
  const luminaryCardRef = useRef<HTMLElement | null>(null);
  const mainElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const scrollTargets: Element[] = [];
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    // RAF handle used by the Luminary-row horizontal scroll handler.
    // RAF cancellation ensures at most one pending frame per scroll event.
    let rowScrollRaf: ReturnType<typeof requestAnimationFrame> | null = null;

    // Track last measured values so we can skip setState when nothing moved.
    // Even a 1px threshold prevents cascading React renders on every scroll tick
    // when multiple overlay instances are all listening to the same scroll events.
    const lastMeasuredRef = { x: -9999, y: -9999, within: true };

    // measureCore: raw measurement without any guards. Extracted so both the
    // normal (gated) path and the forced unhide path share the same logic.
    const measureCore = () => {
      const el = luminaryCardRef.current ?? document.querySelector(
        `[data-luminary-id="${luminaryId}"]`
      ) as HTMLElement | null;
      if (el) luminaryCardRef.current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      // Check whether the card overlaps the scroll container's visible bounds.
      // When scrolled above the header the overlay must be hidden so it doesn't
      // paint over fixed chrome.
      const mainEl = mainElRef.current ?? document.querySelector('[data-game-board]') as HTMLElement | null;
      if (mainEl) mainElRef.current = mainEl;
      const mainRect = mainEl?.getBoundingClientRect() ?? null;
      boardRectRef.current = mainRect;
      const withinScroller = mainRect
        ? r.bottom > mainRect.top && r.top < mainRect.bottom
        : true;
      const newX = r.left + r.width / 2;
      const newY = r.top  + r.height / 2;
      // Skip setState entirely if position and visibility haven't changed by
      // more than 1px. This eliminates most re-renders on mobile scroll events
      // where all active idle overlays would otherwise each trigger a render.
      const moved = Math.abs(newX - lastMeasuredRef.x) > 1 || Math.abs(newY - lastMeasuredRef.y) > 1;
      const visChanged = withinScroller !== lastMeasuredRef.within;
      if (!moved && !visChanged) return;
      lastMeasuredRef.x = newX;
      lastMeasuredRef.y = newY;
      lastMeasuredRef.within = withinScroller;
      if (visChanged) setIsWithinScroller(withinScroller);
      // Compute container-relative position for the portal/absolute idle rendering.
      // This coordinate is stable during scroll (the card moves with the container),
      // so it only needs updating on layout reflows — not on user scroll events.
      if (mainEl && mainRect) {
        const absX = r.left - mainRect.left + mainEl.scrollLeft + r.width  / 2;
        const absY = r.top  - mainRect.top  + mainEl.scrollTop  + r.height / 2;
        setAbsCardPos({ x: absX, y: absY });
      }
      setCardPos(prev => {
        if (!prev && !startViewRef.current) {
          startViewRef.current = {
            x: window.innerWidth  / 2,
            y: window.innerHeight / 2,
          };
        }
        return { x: newX, y: newY };
      });
    };

    const measure = () => {
      // While a cutscene is playing for another luminary, do not re-measure.
      // A position update would recalculate initX/initY and re-trigger the
      // return-flight animation, causing this entity to fly away mid-idle.
      if (frozenRef.current) return;
      // Skip measurement when the overlay is hidden (off-tab or during summon).
      // The scroll listener is still attached but the callback returns early,
      // reducing DOM API load during the most common high-lag scenarios.
      if (hiddenRef.current) return;
      measureCore();
    };

    // forceMeasure: skips hiddenRef so the unhide effect can snap the entity to
    // the correct position before hiddenRef's own effect has had a chance to run.
    const forceMeasure = () => {
      if (frozenRef.current) return;
      measureCore();
    };
    forceMeasureRef.current = forceMeasure;

    // Throttle scroll measurements to 200ms max per overlay.
    // The old requestAnimationFrame pattern caused a storm: every scroll event
    // on every overlay scheduled a new RAF, each forcing getBoundingClientRect
    // (layout recalc). With 5+ overlays this produced 300+ forced layouts/sec.
    const onScroll = () => {
      // [data-game-board] vertical scroll: idle entities are portal-rendered as
      // position: absolute inside the scroll container and track the card natively.
      // No measurement needed for vertical board scroll.
      if (isIdleRef.current) return;
      if (frozenRef.current || hiddenRef.current) return;
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        measure();
      }, 200);
    };

    // [data-luminary-scroll] horizontal scroll: the Luminary row scrolls inside
    // [data-game-board], so the card's position within the board content area
    // changes. absCardPos must be refreshed even in idle/portal mode so the
    // absolutely-positioned entity tracks the card horizontally.
    // RAF-based (no 200ms throttle) so the overlay follows every scroll frame
    // with no visible lag — the 200ms throttle on onScroll was the original
    // drift cause, so we must not repeat it here.
    const onLuminaryRowScroll = () => {
      if (frozenRef.current || hiddenRef.current) return;
      if (rowScrollRaf !== null) cancelAnimationFrame(rowScrollRaf);
      rowScrollRaf = requestAnimationFrame(() => {
        rowScrollRaf = null;
        measureCore();
      });
    };

    // Shared throttled handler for ResizeObserver — same 200ms budget as scroll.
    const onResize = () => {
      if (frozenRef.current || hiddenRef.current) return;
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        measure();
      }, 200);
    };

    measure();
    const t = setTimeout(measure, 60); // re-check after render flush
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Watch [data-game-board] and main for vertical scroll.
    // [data-luminary-scroll] gets its own handler (onLuminaryRowScroll) that
    // runs measureCore even in idle mode — horizontal card movement requires it.
    let luminaryScrollEl: Element | null = null;
    document.querySelectorAll('[data-game-board], main').forEach(el => {
      el.addEventListener('scroll', onScroll, { passive: true });
      scrollTargets.push(el);
    });
    const existingLumScrollEl = document.querySelector('[data-luminary-scroll]');
    if (existingLumScrollEl) {
      existingLumScrollEl.addEventListener('scroll', onLuminaryRowScroll, { passive: true });
      luminaryScrollEl = existingLumScrollEl;
    }

    // ResizeObserver on [data-game-board]: catches layout reflows that produce
    // no scroll event — opponent panel resize, action-log expansion, window
    // chrome changes. Throttled to the same 200ms budget as scroll listeners.
    // No framer-motion loops involved; this runs entirely outside React render.
    let resizeObserver: ResizeObserver | null = null;
    const boardEl = mainElRef.current ?? document.querySelector('[data-game-board]') as HTMLElement | null;
    if (boardEl) {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(boardEl);
    }

    // MutationObserver: if [data-luminary-scroll] wasn't in the DOM at mount
    // time (conditionally rendered), watch for it to appear, attach the scroll
    // listener once, then disconnect — the element never re-mounts so one-shot
    // is sufficient. Call measureCore() synchronously after attachment so the
    // initial absCardPos is correct even before the first scroll event fires.
    let mutationObserver: MutationObserver | null = null;
    if (!luminaryScrollEl) {
      mutationObserver = new MutationObserver(() => {
        const el = document.querySelector('[data-luminary-scroll]');
        if (el) {
          el.addEventListener('scroll', onLuminaryRowScroll, { passive: true });
          luminaryScrollEl = el;
          measureCore(); // snap initial position immediately on discovery
          mutationObserver?.disconnect();
          mutationObserver = null;
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(t);
      if (throttleTimer) clearTimeout(throttleTimer);
      if (rowScrollRaf !== null) cancelAnimationFrame(rowScrollRaf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      scrollTargets.forEach(el => el.removeEventListener('scroll', onScroll));
      luminaryScrollEl?.removeEventListener('scroll', onLuminaryRowScroll);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
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

  // Remeasure immediately whenever the overlay transitions from hidden → visible.
  // The hiddenRef guard in the scroll listener skips all measurements while we
  // are away (Bonuses / Cards tab), so any layout shift that happened off-tab
  // would leave the entity offset until the next scroll. Calling forceMeasure
  // in useLayoutEffect (not useEffect) snaps the entity to the correct position
  // synchronously before the browser paints the first visible frame, eliminating
  // the single-frame stale-position flash that useEffect could produce.
  useLayoutEffect(() => {
    if (!hidden) {
      forceMeasureRef.current();
    }
  }, [hidden]);

  if (!cardPos || !startViewRef.current) return null;

  // Glow intensity scales with the Luminary's claim-cost tier so triple-color
  // (4L) Luminaries cast a visibly more imposing halo than mono-color (2L) ones.
  //   tier 1 (mono)  → 1.00× base opacity  (stops: 0x14, 0x0b, 0x07)
  //   tier 2 (dual)  → 1.20× base opacity  (stops: 0x18, 0x0d, 0x08)
  //   tier 3 (triple)→ 1.45× base opacity  (stops: 0x1d, 0x10, 0x0a)
  const tierMult = vis.tier === 3 ? 1.45 : vis.tier === 2 ? 1.2 : 1.0;
  const scaledHex = (base: number) =>
    Math.min(255, Math.round(base * tierMult)).toString(16).padStart(2, '0');
  const ambientStop1 = scaledHex(0x14);
  const ambientStop2 = scaledHex(0x0b);
  const ambientStop3 = scaledHex(0x07);

  // Aura inner element — shared between return-flight and idle portal paths so
  // CSS animation classes are applied consistently regardless of render mode.
  const auraEl = (
    <motion.div
      style={{
        position: 'absolute',
        inset: -20,
        borderRadius: 22,
        background: activeAffinityColor
          ? `radial-gradient(${auraVariant.gradientShape}, ${activeAffinityColor}3a 0%, ${activeAffinityColor}1c 42%, ${activeAffinityColor}0d 66%, transparent 84%)`
          : `radial-gradient(${auraVariant.gradientShape}, ${glowColor}3a 0%, ${primaryColor}1c 42%, ${glowColor}0d 66%, transparent 84%)`,
        transition: 'background 0.8s ease',
      }}
      className={isIdle ? auraVariant.idleClass : undefined}
      animate={!isIdle ? { opacity: 0.75 } : {}}
      transition={!isIdle ? { duration: 0.4 } : {}}
    />
  );

  // Entity art — computed once, referenced in both the idle portal and the
  // return-flight paths.  Aura animation classes and float classes all read
  // isIdle from closure so they self-select correctly in either context.
  //
  // Aura class table (CSS animation, compositor thread):
  //   fire/oracle  → lum-aura-fire  (irregular upward flicker, 2.6 s)
  //   storm/astral → lum-aura-storm (electric rapid flicker, 1.8 s)
  //   tide/compass → lum-aura-tide  (slow rolling wave, 5.4 s)
  //   void         → lum-aura-void  (imploding dark pulse, 4.2 s)
  //   bloom/verdant/radiant → lum-aura-bloom (organic swell, 6.0 s)
  //   null         → lum-aura-null  (entropy stillness, 7.2 s)
  //   pale         → lum-aura-pale  (silver starburst shimmer, 4.8 s)
  //   fallback     → lum-idle-aura  (generic pulse)
  const entityArt = (() => {
    const ov = IDLE_ENTITY_OVERRIDES[luminaryId] ?? {};
    const entScale = ov.scale ?? 1;
    const objPos   = ov.objectPosition ?? 'center top';
    const objFit   = ov.objectFit ?? 'contain';
    const cyFactor = ov.idleCyFactor;
    // When entScale !== 1 we use the scaled variant keyframe (embeds the scale
    // factor via CSS custom property) so CSS transform and scale never conflict.
    const idleClass = isIdle && !ov.noFloat
      ? (entScale !== 1 ? 'lum-idle-float-scaled' : 'lum-idle-float')
      : undefined;

    // ── lum_radiant: three-layer ring / body / core animation ──────────
    if (luminaryId === 'lum_radiant') {
      const ring = _luminaryImageMap['lum_radiant/Radiant 1'] ?? null;
      const body = _luminaryImageMap['lum_radiant/Radiant 2'] ?? null;
      const core = _luminaryImageMap['lum_radiant/Radiant 3'] ?? null;
      if (ring && body && core) {
        const layerImg: React.CSSProperties = {
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'contain', display: 'block',
          mixBlendMode: 'screen',
        };
        const absfill: React.CSSProperties = { position: 'absolute', inset: 0 };
        return (
          <div style={{ position: 'relative', width: IDLE_W, height: IDLE_H }}>
            <div className={isIdle ? 'lum-idle-float' : undefined} style={absfill}>
              <div className="lum-radiant-ring-pulse" style={{ ...absfill, transform: 'scale(1.25) translateY(-3px)', transformOrigin: 'center center' }}>
                <img src={ring} draggable={false} alt="" className="lum-radiant-ring" style={layerImg} />
              </div>
            </div>
            <div className={isIdle ? 'lum-idle-float' : undefined} style={absfill}>
              <div style={{ ...absfill, transform: 'scale(1.1)', transformOrigin: 'center center' }}>
                <img src={body} draggable={false} alt="" style={layerImg} />
              </div>
              <div className="lum-radiant-core-pulse" style={{ ...absfill, transform: 'translateY(-5px) scale(0.20)', transformOrigin: 'center center' }}>
                <img src={core} draggable={false} alt="" className="lum-radiant-core" style={layerImg} />
              </div>
            </div>
          </div>
        );
      }
    }

    // ── lum_compass: illustrated cosmic background + heat-haze shimmer ──
    if (luminaryId === 'lum_compass') {
      const bg = _getLuminaryImage('lum_compass', 'background');
      const fill: React.CSSProperties = {
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        display: 'block',
      };
      return (
        <div style={{ position: 'relative', width: IDLE_W, height: IDLE_H }}>
          {bg && (
            <img src={bg} alt="" draggable={false} className="lum-compass-bg-fade" style={{ ...fill, objectFit: 'cover' }} />
          )}
          {entityCutout && (
            <div className={isIdle ? 'lum-compass-heat-haze' : undefined} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              <img
                src={entityCutout} alt="" draggable={false}
                style={{
                  ...fill,
                  objectFit: 'cover', objectPosition: 'center center',
                  mixBlendMode: 'screen',
                  maskImage: 'radial-gradient(ellipse 90% 96% at 50% 30%, black 16%, rgba(0,0,0,0.92) 44%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.12) 74%, transparent 84%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 90% 96% at 50% 30%, black 16%, rgba(0,0,0,0.92) 44%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.12) 74%, transparent 84%)',
                }}
              />
            </div>
          )}
        </div>
      );
    }

    // ── lum_hunger: entity only — backgrounds removed for performance ──
    if (luminaryId === 'lum_hunger') {
      const hEnt = _getLuminaryImage('lum_hunger', 'entity');
      return (
        <div className={isIdle ? 'lum-idle-float' : undefined} style={{ position: 'relative', width: IDLE_W, height: IDLE_H }}>
          {hEnt && (
            <img src={hEnt} alt="" draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, display: 'block', border: 'none', WebkitMaskImage: 'radial-gradient(ellipse at center, black 70%, transparent 95%)', maskImage: 'radial-gradient(ellipse at center, black 70%, transparent 95%)' }} />
          )}
        </div>
      );
    }

    return (
      <motion.div
        style={{
          position: 'relative', width: IDLE_W, height: IDLE_H,
          // Base static scale for non-1 entities — CSS animation keyframes also
          // include scale so there's no fight between framer-motion and CSS.
          ...(entScale !== 1 && !isIdle
            ? { transform: `scale(${entScale})`, transformOrigin: 'center top' }
            : entScale !== 1 && isIdle
            ? { transformOrigin: 'center top', ['--lum-ent-scale' as string]: entScale }
            : {}),
        }}
        className={idleClass}
        animate={!isIdle && entScale !== 1 ? { scale: entScale } : {}}
        transition={!isIdle ? { duration: 0 } : {}}
      >
        {entityCutout ? (
          <>
            <img
              src={entityCutout} alt="" draggable={false}
              style={{
                width: IDLE_W,
                height: IDLE_H,
                objectFit: objFit as React.CSSProperties['objectFit'],
                objectPosition: objPos,
                display: 'block',
                transform: luminaryId === 'lum_seed' ? 'scale(1.15, 1.68)' : luminaryId === 'lum_oracle' ? 'scale(1.30)' : luminaryId === 'lum_orchard' ? 'scale(1.25, 1.45)' : undefined,
                ...(entityBlendMode ? { mixBlendMode: entityBlendMode as React.CSSProperties['mixBlendMode'] } : {}),
                maskImage: 'radial-gradient(ellipse 90% 96% at 50% 30%, black 16%, rgba(0,0,0,0.92) 44%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.12) 74%, transparent 84%)',
                WebkitMaskImage: 'radial-gradient(ellipse 90% 96% at 50% 30%, black 16%, rgba(0,0,0,0.92) 44%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.12) 74%, transparent 84%)',
              }}
            />
            {luminaryId === 'lum_tide' && (
              <TideEyeOverlay width={IDLE_W} height={IDLE_H} {...(cyFactor !== undefined ? { cyFactor } : {})} />
            )}
          </>
        ) : (
          <EntityArt size={IDLE_W} />
        )}
      </motion.div>
    );
  })();

  // ── Idle phase: portal into [data-game-board] (position: absolute) ──────────
  // Once the return-flight animation completes, we move the entity into a React
  // portal that is a child of the scrollable board container. position: absolute
  // inside overflow: auto tracks the card natively — zero scroll drift and no
  // measurement needed on scroll events. absCardPos is container-relative and
  // only changes on layout reflows (ResizeObserver), not on scroll events.
  if (isIdle) {
    const portalTarget = mainElRef.current
      ?? (document.querySelector('[data-game-board]') as HTMLElement | null);
    if (portalTarget && absCardPos) {
      const absEntityLeft = absCardPos.x - IDLE_W  / 2;
      const absEntityTop  = absCardPos.y - IDLE_H  / 2;
      const absAmbLeft    = absCardPos.x - AMBIENT_W / 2;
      const absAmbTop     = absCardPos.y - AMBIENT_H / 2;
      const idleAmbientBg = activeAffinityColor
        ? `radial-gradient(ellipse at 50% 50%, ${activeAffinityColor}${scaledHex(0x18)} 0%, ${activeAffinityColor}${scaledHex(0x0e)} 38%, ${activeAffinityColor}${ambientStop3} 62%, transparent 78%)`
        : `radial-gradient(ellipse at 50% 50%, ${glowColor}${ambientStop1} 0%, ${primaryColor}${ambientStop2} 38%, ${glowColor}${ambientStop3} 62%, transparent 78%)`;
      return createPortal(
        <>
          {/* ── Ambient board glow — 2.5× card-size, behind the idle overlay (z 17) ──
              Absolutely positioned inside the scroll container so it scrolls
              naturally with the board. No clip-path needed — the container's
              overflow: auto clips content that scrolls out of view. */}
          {!hidden && (
            <div
              className={`absolute pointer-events-none ${tieredAmbientClass}`}
              style={{
                zIndex: 17,
                left: absAmbLeft,
                top: absAmbTop,
                width: AMBIENT_W,
                height: AMBIENT_H,
                background: idleAmbientBg,
                transition: 'background 0.8s ease',
              }}
            />
          )}
          {/* ── Entity idle overlay — absolutely positioned, scrolls with board ── */}
          <div
            className="absolute pointer-events-none"
            style={{
              zIndex: 18,
              left: absEntityLeft,
              top: absEntityTop,
              width: IDLE_W,
              height: IDLE_H,
              opacity: hidden ? 0 : 1,
              transition: hidden ? 'none' : 'opacity 0.4s ease-in',
            }}
          >
            <div style={{ position: 'relative', width: IDLE_W, height: IDLE_H }}>
              {auraEl}
              {entityArt}
            </div>
          </div>
        </>,
        portalTarget
      );
    }
  }

  // ── Return-flight phase: position: fixed + entrance animation ─────────────
  // Used during the 1.2 s window before isIdle is true (entity flies from the
  // viewport centre to the card). Also serves as the idle fallback when
  // absCardPos or portalTarget are not yet available (e.g. first render).
  const destX = cardPos.x - IDLE_W / 2;
  const destY = cardPos.y - IDLE_H / 2;
  // Inner motion.div initial offset: visually centres the entity at the
  // viewport centre (where the cutscene entity was), relative to the outer div.
  const initX = startViewRef.current.x - destX - IDLE_W / 2;
  const initY = startViewRef.current.y - destY - IDLE_H / 2;
  const initScale = ENT_W / IDLE_W; // ≈ 2.86 — matches cutscene entity visual size

  // Ambient glow is only relevant in the idle phase (already handled above),
  // but keep a fixed fallback for when isIdle is true yet the portal isn't ready.
  const ambientVisible = isIdle && !hidden && isWithinScroller;
  const ambientLeft = cardPos.x - AMBIENT_W / 2;
  const ambientTop  = cardPos.y - AMBIENT_H / 2;
  const br = boardRectRef.current;
  const ambientClipPath = br
    ? `inset(${Math.max(0, br.top    - ambientTop )}px ${
               Math.max(0, ambientLeft + AMBIENT_W - br.right  )}px ${
               Math.max(0, ambientTop  + AMBIENT_H - br.bottom )}px ${
               Math.max(0, br.left    - ambientLeft)}px)`
    : undefined;

  return (
    <>
      {ambientVisible && (
        <div
          className={`fixed pointer-events-none ${tieredAmbientClass}`}
          style={{
            zIndex: 17,
            left: ambientLeft,
            top: ambientTop,
            width: AMBIENT_W,
            height: AMBIENT_H,
            background: activeAffinityColor
              ? `radial-gradient(ellipse at 50% 50%, ${activeAffinityColor}${scaledHex(0x18)} 0%, ${activeAffinityColor}${scaledHex(0x0e)} 38%, ${activeAffinityColor}${ambientStop3} 62%, transparent 78%)`
              : `radial-gradient(ellipse at 50% 50%, ${glowColor}${ambientStop1} 0%, ${primaryColor}${ambientStop2} 38%, ${glowColor}${ambientStop3} 62%, transparent 78%)`,
            clipPath: ambientClipPath,
            transition: 'background 0.8s ease',
          }}
        />
      )}
      <div
        className="fixed pointer-events-none"
        style={{ zIndex: 18, left: destX, top: destY, width: IDLE_W, height: IDLE_H,
                 opacity: (hidden || !isWithinScroller) ? 0 : 1,
                 transition: (hidden || !isWithinScroller) ? 'none' : 'opacity 0.4s ease-in',
                 display: (hidden || !isWithinScroller) ? 'none' : undefined }}
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
          {auraEl}
          {entityArt}
        </motion.div>
      </div>
    </>
  );
});
