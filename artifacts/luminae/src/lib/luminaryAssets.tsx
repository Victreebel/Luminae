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

// ─── Entity SVG Components ────────────────────────────────────────────────────
// viewBox="0 0 100 140" — transparent background, no rect fill.
// Design language: cosmic crystalline beings from the same artifact civilization
// shown on the cards — geometric faceted bodies, luminous rune geometry,
// distinct silhouettes readable at thumbnail scale.

// ── Ember Sovereign ──────────────────────────────────────────────────────────
// Crowned flame sovereign: 5-spike crystal crown, angular gem-faceted robe.
// Archetype: regal robed figure, unmistakeable crown silhouette.
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
      {/* Crown — 5 crystal spikes */}
      <polygon points="50,3 47,22 53,22" fill="#fbbf24" />
      <polygon points="39,7 35,22 43,22" fill="#fca5a5" opacity="0.9" />
      <polygon points="61,7 57,22 65,22" fill="#fca5a5" opacity="0.9" />
      <polygon points="29,14 25,26 34,26" fill="#ef4444" opacity="0.85" />
      <polygon points="71,14 66,26 75,26" fill="#ef4444" opacity="0.85" />
      {/* Crown base band */}
      <rect x="24" y="24" width="52" height="5" rx="1" fill="#7f1d1d" />
      {/* Head — faceted hexagonal crystal */}
      <polygon points="50,29 63,36 63,46 50,52 37,46 37,36" fill="url(#emb-g1)" />
      <ellipse cx="50" cy="40" rx="6" ry="5" fill="#fca5a5" opacity="0.3" />
      {/* Torso — angular gem-cut */}
      <polygon points="39,53 61,53 67,68 33,68" fill="url(#emb-g1)" />
      <polygon points="50,56 55,62 50,68 45,62" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.7" />
      {/* Arms — crystal bracers */}
      <polygon points="39,55 22,61 20,70 36,66" fill="url(#emb-g1)" />
      <polygon points="61,55 78,61 80,70 64,66" fill="url(#emb-g1)" />
      {/* Robe — wide angular hem */}
      <polygon points="33,68 67,68 80,106 74,124 50,130 26,124 20,106" fill="url(#emb-g1)" />
      {/* Robe geometric facet lines */}
      <line x1="50" y1="68" x2="50" y2="128" stroke="#ef4444" strokeWidth="0.7" opacity="0.4" />
      <line x1="33" y1="68" x2="24" y2="122" stroke="#ef4444" strokeWidth="0.5" opacity="0.25" />
      <line x1="67" y1="68" x2="76" y2="122" stroke="#ef4444" strokeWidth="0.5" opacity="0.25" />
      {/* Knee rune diamond */}
      <polygon points="50,92 54,99 50,106 46,99" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

// ── Tide Architect ────────────────────────────────────────────────────────────
// Tidal architect: very tall crystal spire head (top 35%), column body,
// arc blueprint arms. Archetype: elongated architectural spire figure.
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
      {/* Spire head — tall pointed crystal tower */}
      <polygon points="50,2 58,36 50,42 42,36" fill="url(#tid-g1)" />
      <line x1="50" y1="2" x2="50" y2="36" stroke="#bfdbfe" strokeWidth="0.7" opacity="0.8" />
      <line x1="44" y1="16" x2="56" y2="16" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.6" />
      <line x1="42" y1="26" x2="58" y2="26" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />
      {/* Head base ellipse */}
      <ellipse cx="50" cy="42" rx="10" ry="6" fill="url(#tid-g1)" />
      <ellipse cx="50" cy="40" rx="4" ry="2.5" fill="#e2e8f0" opacity="0.45" />
      {/* Body — double crystal column */}
      <rect x="43" y="48" width="14" height="36" rx="1.5" fill="url(#tid-g1)" />
      <line x1="47" y1="50" x2="47" y2="82" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />
      <line x1="53" y1="50" x2="53" y2="82" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />
      {/* Blueprint arc arms */}
      <path d="M 43,56 Q 20,56 16,72" stroke="url(#tid-g1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 57,56 Q 80,56 84,72" stroke="url(#tid-g1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="68" r="2.5" fill="#bfdbfe" opacity="0.75" />
      <circle cx="82" cy="68" r="2.5" fill="#bfdbfe" opacity="0.75" />
      {/* Lower body */}
      <polygon points="43,84 57,84 62,112 56,126 44,126 38,112" fill="url(#tid-g1)" />
      {/* Wave base */}
      <path d="M 28,132 Q 38,124 50,128 Q 62,132 72,124" stroke="#bfdbfe" strokeWidth="1.5" fill="none" opacity="0.7" />
    </svg>
  );
}

// ── Root Ancient ──────────────────────────────────────────────────────────────
// Root ancient: wide squat body, geological crystal dome head, massive root
// arms spreading to card edges. Archetype: wide horizontal figure, unmistakeable
// by arms reaching full card width.
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
      {/* Geological dome head with crystal formations */}
      <path d="M 34,52 Q 34,30 50,26 Q 66,30 66,52 Z" fill="url(#roo-g1)" />
      <polygon points="50,26 48,35 52,35" fill="#4ade80" opacity="0.95" />
      <polygon points="43,30 40,38 46,38" fill="#86efac" opacity="0.8" />
      <polygon points="57,30 54,38 60,38" fill="#86efac" opacity="0.8" />
      {/* Face slit */}
      <ellipse cx="50" cy="48" rx="11" ry="4" fill="#14532d" opacity="0.8" />
      <ellipse cx="50" cy="47" rx="5" ry="2" fill="#ef4444" opacity="0.45" />
      {/* Wide torso */}
      <rect x="32" y="54" width="36" height="26" rx="3" fill="url(#roo-g1)" />
      <polygon points="50,58 55,65 50,72 45,65" fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.6" />
      {/* Root arms — extend to card edges, curve downward */}
      <path d="M 32,62 Q 16,56 4,66 Q 1,78 8,84" stroke="url(#roo-g1)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M 68,62 Q 84,56 96,66 Q 99,78 92,84" stroke="url(#roo-g1)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      {/* Root sub-branches */}
      <path d="M 4,66 Q 2,80 1,92" stroke="#4ade80" strokeWidth="2.5" fill="none" opacity="0.8" strokeLinecap="round" />
      <path d="M 96,66 Q 98,80 99,92" stroke="#4ade80" strokeWidth="2.5" fill="none" opacity="0.8" strokeLinecap="round" />
      <circle cx="2" cy="92" r="3" fill="#ef4444" opacity="0.7" />
      <circle cx="98" cy="92" r="3" fill="#ef4444" opacity="0.7" />
      {/* Trunk / lower body */}
      <path d="M 37,80 L 63,80 L 59,110 Q 56,128 50,130 Q 44,128 41,110 Z" fill="url(#roo-g1)" />
    </svg>
  );
}

// ── Void Warden ───────────────────────────────────────────────────────────────
// Void warden: tall hooded cloak, absolute void face, orbital containment ring.
// Archetype: featureless hood oval — no face, no arms visible, just the ring.
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
      {/* Cloak body — large angular oval */}
      <path d="M 18,55 Q 18,130 50,135 Q 82,130 82,55 L 78,64 Q 65,58 50,57 Q 35,58 22,64 Z" fill="url(#voi-g1)" />
      {/* Hood — upper dome */}
      <path d="M 20,54 Q 20,18 50,14 Q 80,18 80,54 L 76,62 Q 63,55 50,55 Q 37,55 24,62 Z" fill="url(#voi-g1)" />
      {/* Void face — absolute dark circle */}
      <ellipse cx="50" cy="42" rx="17" ry="14" fill="#000" opacity="0.96" />
      {/* Single cold void eye */}
      <ellipse cx="50" cy="40" rx="5" ry="3.5" fill="#3d6bff" opacity="0.55" />
      <circle cx="50" cy="40" r="2" fill="#bfdbfe" opacity="0.7" />
      {/* Orbital containment ring */}
      <ellipse cx="50" cy="72" rx="44" ry="15" fill="none" stroke="url(#voi-g2)" strokeWidth="2" />
      {/* Ring rune markers */}
      <rect x="4" y="69" width="5" height="6" rx="0.5" fill="#3d6bff" opacity="0.85" />
      <rect x="91" y="69" width="5" height="6" rx="0.5" fill="#3d6bff" opacity="0.85" />
      <rect x="47" y="55" width="6" height="5" rx="0.5" fill="#3d6bff" opacity="0.8" />
      <rect x="47" y="82" width="6" height="5" rx="0.5" fill="#3d6bff" opacity="0.6" />
      {/* Cloak edge highlights */}
      <path d="M 20,54 Q 22,70 22,105" stroke="#312e81" strokeWidth="1.5" fill="none" opacity="0.7" />
      <path d="M 80,54 Q 78,70 78,105" stroke="#312e81" strokeWidth="1.5" fill="none" opacity="0.7" />
    </svg>
  );
}

// ── Radiant Keeper ────────────────────────────────────────────────────────────
// Radiant keeper: symmetric saint figure with massive 8-point starburst halo
// filling the full card width, holding a glowing sphere.
// Archetype: huge starburst takes full width — unmistakeable silhouette.
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
      {/* Halo aura glow */}
      <circle cx="50" cy="44" r="46" fill="url(#rad-g2)" />
      {/* 8 halo rays */}
      {rays.map((ray, i) => (
        <line key={i} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2}
          stroke={ray.cardinal ? '#f0fdf4' : '#86efac'}
          strokeWidth={ray.cardinal ? 1.6 : 0.9}
          opacity={ray.cardinal ? 0.9 : 0.65} />
      ))}
      {/* Head */}
      <ellipse cx="50" cy="44" rx="13" ry="11" fill="url(#rad-g1)" />
      <ellipse cx="50" cy="42" rx="6" ry="4.5" fill="#e2e8f0" opacity="0.5" />
      {/* Body */}
      <path d="M 39,55 L 61,55 L 58,86 L 42,86 Z" fill="url(#rad-g1)" />
      {/* Crystal panel wings */}
      <path d="M 39,55 L 22,64 L 26,90 L 42,86" fill="url(#rad-g1)" opacity="0.88" />
      <path d="M 61,55 L 78,64 L 74,90 L 58,86" fill="url(#rad-g1)" opacity="0.88" />
      {/* Glowing sphere held at chest */}
      <circle cx="50" cy="98" r="11" fill="url(#rad-g2)" opacity="0.9" />
      <circle cx="50" cy="98" r="11" fill="none" stroke="#e2e8f0" strokeWidth="0.9" />
      <circle cx="50" cy="98" r="5" fill="#f0fdf4" opacity="0.85" />
      {/* Arms cupping sphere */}
      <path d="M 42,86 Q 38,93 40,98" stroke="url(#rad-g1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 58,86 Q 62,93 60,98" stroke="url(#rad-g1)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Lower robe */}
      <path d="M 26,90 L 74,90 L 68,130 L 32,130 Z" fill="url(#rad-g1)" />
      <line x1="50" y1="90" x2="50" y2="130" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

// ── Astral Weaver ──────────────────────────────────────────────────────────────
// Astral weaver: six crystal arms in exact hexagonal star pattern, thin central
// body, star-cluster head. Archetype: six-armed hex-star — unique among all.
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
      {/* Six crystal arms */}
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
      {/* Central body disc */}
      <circle cx={cx} cy={cy} r="12" fill="url(#ast-g1)" />
      <polygon points={`${cx},${cy - 7} ${cx + 6},${cy - 3} ${cx + 6},${cy + 3} ${cx},${cy + 7} ${cx - 6},${cy + 3} ${cx - 6},${cy - 3}`}
        fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.8" />
      {/* Star-cluster head */}
      <circle cx={cx} cy="34" r="6.5" fill="#ef4444" opacity="0.92" />
      <circle cx={cx - 8} cy="29" r="4" fill="#fca5a5" opacity="0.85" />
      <circle cx={cx + 8} cy="29" r="4" fill="#fca5a5" opacity="0.85" />
      <circle cx={cx} cy="23" r="3" fill="#bfdbfe" opacity="0.9" />
      <circle cx={cx - 5} cy="20" r="1.8" fill="#bfdbfe" opacity="0.75" />
      <circle cx={cx + 5} cy="20" r="1.8" fill="#bfdbfe" opacity="0.75" />
      {/* Thread: head to body */}
      <line x1={cx} y1="40" x2={cx} y2="56" stroke="#ef4444" strokeWidth="1.5" opacity="0.55" strokeDasharray="2,2.5" />
    </svg>
  );
}

// ── Iron Harbinger ────────────────────────────────────────────────────────────
// Iron harbinger: armored stocky figure with wide mechanical crystal wings
// extending to card edges, visor head, gem in chest.
// Archetype: wide horizontal mechanical wings — clearly armored/industrial.
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
      {/* Mechanical wings — wide horizontal panels */}
      <polygon points="50,48 10,30 2,44 12,60 38,60" fill="url(#frg-g1)" />
      <polygon points="50,48 90,30 98,44 88,60 62,60" fill="url(#frg-g1)" />
      {/* Wing crystal detail lines */}
      <line x1="12" y1="40" x2="38" y2="54" stroke="#4ade80" strokeWidth="0.9" opacity="0.7" />
      <line x1="18" y1="34" x2="28" y2="52" stroke="#4ade80" strokeWidth="0.6" opacity="0.5" />
      <line x1="88" y1="40" x2="62" y2="54" stroke="#4ade80" strokeWidth="0.9" opacity="0.7" />
      <line x1="82" y1="34" x2="72" y2="52" stroke="#4ade80" strokeWidth="0.6" opacity="0.5" />
      <polygon points="2,44 0,36 10,40" fill="#4ade80" opacity="0.85" />
      <polygon points="98,44 100,36 90,40" fill="#4ade80" opacity="0.85" />
      {/* Armored head — angular visor */}
      <polygon points="50,22 63,29 63,42 57,48 43,48 37,42 37,29" fill="url(#frg-g1)" />
      <rect x="39" y="36" width="22" height="6" rx="0.5" fill="#4ade80" opacity="0.55" />
      <rect x="46" y="30" width="8" height="4" rx="0.5" fill="#86efac" opacity="0.6" />
      {/* Armored torso */}
      <rect x="36" y="60" width="28" height="30" rx="2" fill="url(#frg-g1)" />
      {/* Chest crystal gem */}
      <polygon points="50,65 57,72 50,79 43,72" fill="url(#frg-g2)" opacity="0.9" />
      <polygon points="50,68 54,72 50,76 46,72" fill="#86efac" opacity="0.75" />
      {/* Legs — heavy armored */}
      <rect x="36" y="90" width="12" height="38" rx="1.5" fill="url(#frg-g1)" />
      <rect x="52" y="90" width="12" height="38" rx="1.5" fill="url(#frg-g1)" />
      <rect x="34" y="122" width="14" height="7" rx="1" fill="#1c1917" />
      <rect x="52" y="122" width="14" height="7" rx="1" fill="#1c1917" />
    </svg>
  );
}

// ── Pale Merchant ──────────────────────────────────────────────────────────────
// Pale merchant: tall luminous hood, drooping cloak, balance scales extending
// to the right side. Archetype: asymmetric scales arm makes it instantly distinct.
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
      {/* Hood glow */}
      <ellipse cx="50" cy="26" rx="19" ry="26" fill="#e2e8f0" opacity="0.12" />
      {/* Hood — tall luminous crystal dome */}
      <path d="M 31,44 Q 31,4 50,2 Q 69,4 69,44 L 65,50 Q 58,46 50,46 Q 42,46 35,50 Z" fill="url(#pal-g1)" />
      {/* Void face shadow */}
      <ellipse cx="50" cy="42" rx="15" ry="8" fill="#0a0a0a" opacity="0.85" />
      <ellipse cx="50" cy="40" rx="5" ry="3.5" fill="#3d6bff" opacity="0.4" />
      {/* Cloak body */}
      <path d="M 29,52 Q 27,82 29,112 L 33,132 L 67,132 L 71,112 Q 73,82 71,52" fill="url(#pal-g2)" opacity="0.88" />
      <line x1="40" y1="56" x2="38" y2="128" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.22" />
      <line x1="60" y1="56" x2="62" y2="128" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.22" />
      {/* Extended arm holding scales — to the right */}
      <line x1="63" y1="64" x2="88" y2="57" stroke="#e2e8f0" strokeWidth="2" opacity="0.85" />
      {/* Scale beam */}
      <line x1="80" y1="57" x2="96" y2="57" stroke="#e2e8f0" strokeWidth="1.2" opacity="0.85" />
      {/* Left pan */}
      <path d="M 78,57 L 75,68 Q 79,71 83,68 L 80,57" fill="none" stroke="#e2e8f0" strokeWidth="0.9" opacity="0.85" />
      {/* Right pan */}
      <path d="M 94,57 L 91,64 Q 95,67 99,64 L 96,57" fill="none" stroke="#e2e8f0" strokeWidth="0.9" opacity="0.75" />
      {/* Left hand orb */}
      <circle cx="21" cy="80" r="5.5" fill="#3d6bff" opacity="0.55" />
      <circle cx="21" cy="80" r="2.5" fill="#e2e8f0" opacity="0.5" />
      <line x1="29" y1="74" x2="21" y2="80" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.6" />
      {/* Floating sigils */}
      <polygon points="76,80 78,85 76,90 74,85" fill="none" stroke="#3d6bff" strokeWidth="0.75" opacity="0.7" />
      <circle cx="20" cy="100" r="2" fill="none" stroke="#e2e8f0" strokeWidth="0.65" opacity="0.5" />
    </svg>
  );
}

// ── Bloom Tyrant ──────────────────────────────────────────────────────────────
// Bloom tyrant: strongly asymmetric — LEFT side has crystal petals blooming
// outward, RIGHT side has crystal flame spikes. Split crown. Unique among all.
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
      {/* LEFT: crystal petals blooming outward */}
      <path d="M 37,52 Q 10,39 7,54 Q 10,68 37,64" fill="#166534" opacity="0.88" />
      <path d="M 35,62 Q 5,62 7,78 Q 17,88 37,78" fill="#166534" opacity="0.78" />
      <path d="M 39,46 Q 17,26 25,14 Q 38,11 41,38" fill="#2ecc71" opacity="0.75" />
      <line x1="37" y1="52" x2="10" y2="54" stroke="#86efac" strokeWidth="0.65" opacity="0.65" />
      <line x1="35" y1="62" x2="9" y2="72" stroke="#86efac" strokeWidth="0.65" opacity="0.55" />
      {/* RIGHT: crystal flame spikes */}
      <polygon points="63,40 76,17 74,40" fill="#fbbf24" opacity="0.92" />
      <polygon points="67,44 84,23 80,46" fill="#ef4444" opacity="0.85" />
      <polygon points="61,49 80,34 73,53" fill="#fca5a5" opacity="0.75" />
      <polygon points="63,57 82,49 73,64" fill="#ef4444" opacity="0.72" />
      {/* Split crown: left half-bloom, right half-flame */}
      <path d="M 50,24 Q 39,17 37,28 Q 39,37 50,35" fill="#4ade80" opacity="0.92" />
      <path d="M 50,24 Q 61,17 63,28 Q 61,37 50,35" fill="#fbbf24" opacity="0.92" />
      {/* Head */}
      <ellipse cx="50" cy="41" rx="12" ry="10" fill="url(#blo-g1)" />
      <line x1="50" y1="30" x2="50" y2="51" stroke="#4ade80" strokeWidth="0.65" opacity="0.5" />
      {/* Body */}
      <polygon points="38,52 62,52 68,74 32,74" fill="url(#blo-g1)" />
      {/* Lower robe */}
      <polygon points="31,74 69,74 74,110 66,130 50,136 34,130 26,110" fill="url(#blo-g1)" />
      {/* Pearl accent highlights */}
      <circle cx="19" cy="72" r="3.5" fill="#e2e8f0" opacity="0.6" />
      <circle cx="50" cy="112" r="4.5" fill="#e2e8f0" opacity="0.5" />
    </svg>
  );
}

// ── Stellar Guide ──────────────────────────────────────────────────────────────
// Stellar guide: 8-point compass rose crown (distinct from Radiant's halo —
// has cardinal labels, different proportions), navigator figure with one arm
// extended pointing forward. Archetype: compass rose + pointing arm.
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
      {/* Compass rose — 4 cardinal (large, pearl) */}
      <polygon points="50,2 47,22 53,22" fill="#e2e8f0" opacity="0.96" />
      <polygon points="50,50 47,30 53,30" fill="#e2e8f0" opacity="0.96" />
      <polygon points="14,26 30,23 30,29" fill="#e2e8f0" opacity="0.92" />
      <polygon points="86,26 70,23 70,29" fill="#e2e8f0" opacity="0.92" />
      {/* 4 ordinal points (smaller, emerald) */}
      <polygon points="74,7 66,21 72,23" fill="#2ecc71" opacity="0.82" />
      <polygon points="26,7 28,23 34,21" fill="#2ecc71" opacity="0.82" />
      <polygon points="74,45 72,29 66,31" fill="#2ecc71" opacity="0.75" />
      <polygon points="26,45 28,29 34,31" fill="#2ecc71" opacity="0.75" />
      {/* Compass center circle — with cross tick marks (distinguishes from starburst) */}
      <circle cx="50" cy="26" r="10" fill="url(#cmp-g1)" />
      <line x1="50" y1="18" x2="50" y2="34" stroke="#e2e8f0" strokeWidth="0.7" opacity="0.7" />
      <line x1="42" y1="26" x2="58" y2="26" stroke="#e2e8f0" strokeWidth="0.7" opacity="0.7" />
      <circle cx="50" cy="26" r="4" fill="#e2e8f0" opacity="0.75" />
      <circle cx="50" cy="26" r="1.5" fill="#3d6bff" />
      {/* Navigator body */}
      <ellipse cx="50" cy="60" rx="13" ry="10" fill="url(#cmp-g1)" />
      <rect x="40" y="70" width="20" height="28" rx="2" fill="url(#cmp-g1)" />
      {/* Pointing arm — extended to the right and forward */}
      <line x1="60" y1="70" x2="90" y2="86" stroke="url(#cmp-g1)" strokeWidth="4.5" strokeLinecap="round" />
      {/* Star-chart projection from pointed hand */}
      <line x1="90" y1="86" x2="98" y2="79" stroke="#e2e8f0" strokeWidth="0.9" opacity="0.65" />
      <line x1="90" y1="86" x2="100" y2="88" stroke="#e2e8f0" strokeWidth="0.9" opacity="0.55" />
      <circle cx="98" cy="79" r="1.8" fill="#e2e8f0" opacity="0.75" />
      <circle cx="100" cy="90" r="1.2" fill="#2ecc71" opacity="0.7" />
      {/* Left arm down */}
      <line x1="40" y1="70" x2="22" y2="86" stroke="url(#cmp-g1)" strokeWidth="4" strokeLinecap="round" />
      {/* Lower robe */}
      <path d="M 40,98 L 60,98 L 65,130 L 35,130 Z" fill="url(#cmp-g1)" />
      <line x1="50" y1="98" x2="50" y2="130" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}

// ── Cosmic Oracle ─────────────────────────────────────────────────────────────
// Cosmic oracle: seated floating figure inside THREE orbital rings at different
// angles (ruby/sapphire/emerald). Three visible eyes in triangle.
// Archetype: three-ring structure — clearly mythic tier, like no other.
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
      {/* Orbital ring 1 — horizontal (ruby) */}
      <ellipse cx="50" cy="70" rx="45" ry="10" fill="none" stroke="#ef4444" strokeWidth="1.9" opacity="0.82" />
      {/* Orbital ring 2 — tilted 30° (sapphire) */}
      <ellipse cx="50" cy="70" rx="41" ry="16" fill="none" stroke="#3d6bff" strokeWidth="1.6" opacity="0.78" transform="rotate(-28 50 70)" />
      {/* Orbital ring 3 — tilted -30° (emerald) */}
      <ellipse cx="50" cy="70" rx="41" ry="16" fill="none" stroke="#2ecc71" strokeWidth="1.6" opacity="0.78" transform="rotate(28 50 70)" />
      {/* Orbital marker orbs */}
      <circle cx="5" cy="70" r="3.5" fill="#ef4444" opacity="0.85" />
      <circle cx="95" cy="70" r="3.5" fill="#ef4444" opacity="0.85" />
      <circle cx="15" cy="54" r="3" fill="#3d6bff" opacity="0.82" />
      <circle cx="84" cy="87" r="3" fill="#2ecc71" opacity="0.82" />
      {/* Central seated body mass */}
      <ellipse cx="50" cy="70" rx="19" ry="23" fill="url(#ora-g1)" />
      {/* Head above body */}
      <ellipse cx="50" cy="47" rx="11" ry="9" fill="url(#ora-g1)" />
      {/* Three eyes in triangle — red top, blue left, green right */}
      <ellipse cx="50" cy="44" rx="4.5" ry="3" fill="#fde68a" opacity="0.95" />
      <circle cx="50" cy="44" r="1.8" fill="#1c1917" />
      <ellipse cx="41" cy="53" rx="3.5" ry="2.5" fill="#ef4444" opacity="0.9" />
      <circle cx="41" cy="53" r="1.5" fill="#1c1917" />
      <ellipse cx="59" cy="53" rx="3.5" ry="2.5" fill="#3d6bff" opacity="0.9" />
      <circle cx="59" cy="53" r="1.5" fill="#1c1917" />
      {/* Triangle connecting eyes */}
      <polygon points="50,44 41,53 59,53" fill="none" stroke="#fde68a" strokeWidth="0.55" opacity="0.5" />
      {/* Cross-legged meditation form */}
      <path d="M 31,80 Q 27,93 34,98 Q 42,98 50,92" fill="url(#ora-g1)" opacity="0.9" />
      <path d="M 69,80 Q 73,93 66,98 Q 58,98 50,92" fill="url(#ora-g1)" opacity="0.9" />
      <line x1="50" y1="92" x2="44" y2="114" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3" />
      <line x1="50" y1="92" x2="56" y2="114" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

// ── Null Sovereign ────────────────────────────────────────────────────────────
// Null sovereign: tall figure with crown of floating null-rune fragments, body
// that appears to disintegrate at the edges — crystal shards fly outward.
// Archetype: fragmenting/dissolving figure, void-dark center, unique among all.
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
      {/* Floating null-rune crown fragments */}
      <rect x="46" y="4" width="8" height="8" rx="0.5" fill="none" stroke="#3d6bff" strokeWidth="1.3" opacity="0.9" />
      <line x1="50" y1="4" x2="50" y2="12" stroke="#3d6bff" strokeWidth="0.9" opacity="0.9" />
      <line x1="46" y1="8" x2="54" y2="8" stroke="#3d6bff" strokeWidth="0.9" opacity="0.9" />
      <rect x="33" y="8" width="7" height="7" rx="0.5" fill="none" stroke="#bfdbfe" strokeWidth="0.95" opacity="0.72" />
      <rect x="60" y="8" width="7" height="7" rx="0.5" fill="none" stroke="#bfdbfe" strokeWidth="0.95" opacity="0.72" />
      <rect x="24" y="15" width="5" height="5" rx="0.5" fill="none" stroke="#3d6bff" strokeWidth="0.75" opacity="0.55" />
      <rect x="71" y="15" width="5" height="5" rx="0.5" fill="none" stroke="#3d6bff" strokeWidth="0.75" opacity="0.55" />
      {/* Main body — tall void figure */}
      <path d="M 36,26 L 64,26 L 70,44 L 70,84 L 62,104 L 50,110 L 38,104 L 30,84 L 30,44 Z" fill="url(#nul-g1)" />
      {/* Void face */}
      <ellipse cx="50" cy="46" rx="14" ry="10" fill="#000" opacity="0.96" />
      <ellipse cx="50" cy="44" rx="6" ry="4" fill="#3d6bff" opacity="0.28" />
      <circle cx="50" cy="44" r="2" fill="#e2e8f0" opacity="0.18" />
      {/* Dissolving fragments — LEFT side */}
      <rect x="21" y="40" width="7" height="4" rx="0.5" fill="#312e81" opacity="0.72" />
      <rect x="13" y="55" width="6" height="3.5" rx="0.5" fill="#312e81" opacity="0.55" />
      <rect x="7" y="70" width="5" height="3" rx="0.5" fill="#3d6bff" opacity="0.38" />
      <rect x="2" y="85" width="4" height="3" rx="0.5" fill="#3d6bff" opacity="0.22" />
      {/* Dissolving fragments — RIGHT side */}
      <rect x="72" y="40" width="7" height="4" rx="0.5" fill="#312e81" opacity="0.72" />
      <rect x="81" y="55" width="6" height="3.5" rx="0.5" fill="#312e81" opacity="0.55" />
      <rect x="88" y="70" width="5" height="3" rx="0.5" fill="#3d6bff" opacity="0.38" />
      <rect x="94" y="85" width="4" height="3" rx="0.5" fill="#3d6bff" opacity="0.22" />
      {/* Dissolving bottom */}
      <rect x="31" y="108" width="6" height="3.5" rx="0.5" fill="#312e81" opacity="0.62" />
      <rect x="63" y="108" width="6" height="3.5" rx="0.5" fill="#312e81" opacity="0.62" />
      <rect x="38" y="116" width="5" height="3" rx="0.5" fill="#3d6bff" opacity="0.42" />
      <rect x="57" y="116" width="5" height="3" rx="0.5" fill="#3d6bff" opacity="0.42" />
      {/* Pearl gleam shards */}
      <polygon points="18,46 22,42 22,50" fill="#e2e8f0" opacity="0.52" />
      <polygon points="82,46 78,42 78,50" fill="#e2e8f0" opacity="0.52" />
      <polygon points="14,68 16,64 18,68 16,72" fill="#e2e8f0" opacity="0.32" />
      <polygon points="86,68 84,64 82,68 84,72" fill="#e2e8f0" opacity="0.32" />
    </svg>
  );
}

// ─── Luminary Visuals Map ─────────────────────────────────────────────────────
// Colors derived from each Luminary's requirement gem palette (authoritative
// source). Synced with backend summonColor/summonSecondaryColor.

export const LUMINARY_VISUALS: Record<string, LuminaryVisuals> = {
  lum_ember:   { id: 'lum_ember',   primaryColor: '#ef4444', secondaryColor: '#1c1917', glowColor: 'rgba(239,68,68,0.6)',   EntityArt: EmberEntity   },
  lum_tide:    { id: 'lum_tide',    primaryColor: '#3d6bff', secondaryColor: '#e2e8f0', glowColor: 'rgba(61,107,255,0.55)', EntityArt: TideEntity    },
  lum_root:    { id: 'lum_root',    primaryColor: '#2ecc71', secondaryColor: '#ef4444', glowColor: 'rgba(46,204,113,0.55)', EntityArt: RootEntity    },
  lum_void:    { id: 'lum_void',    primaryColor: '#3d6bff', secondaryColor: '#0a0a14', glowColor: 'rgba(49,46,129,0.55)',  EntityArt: VoidEntity    },
  lum_radiant: { id: 'lum_radiant', primaryColor: '#e2e8f0', secondaryColor: '#2ecc71', glowColor: 'rgba(226,232,240,0.5)', EntityArt: RadiantEntity },
  lum_astral:  { id: 'lum_astral',  primaryColor: '#ef4444', secondaryColor: '#3d6bff', glowColor: 'rgba(239,68,68,0.55)', EntityArt: AstralEntity  },
  lum_forge:   { id: 'lum_forge',   primaryColor: '#2ecc71', secondaryColor: '#1c1917', glowColor: 'rgba(46,204,113,0.5)', EntityArt: ForgeEntity   },
  lum_pale:    { id: 'lum_pale',    primaryColor: '#94a3b8', secondaryColor: '#0a0a14', glowColor: 'rgba(148,163,184,0.5)', EntityArt: PaleEntity    },
  lum_bloom:   { id: 'lum_bloom',   primaryColor: '#ef4444', secondaryColor: '#2ecc71', glowColor: 'rgba(239,68,68,0.5)',  EntityArt: BloomEntity   },
  lum_compass: { id: 'lum_compass', primaryColor: '#3d6bff', secondaryColor: '#2ecc71', glowColor: 'rgba(61,107,255,0.55)', EntityArt: CompassEntity },
  lum_oracle:  { id: 'lum_oracle',  primaryColor: '#fbbf24', secondaryColor: '#ef4444', glowColor: 'rgba(251,191,36,0.65)', EntityArt: OracleEntity  },
  lum_null:    { id: 'lum_null',    primaryColor: '#3d6bff', secondaryColor: '#e2e8f0', glowColor: 'rgba(49,46,129,0.5)',  EntityArt: NullEntity    },
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
// Uses the same tier-3 backdrop as artifact cards, then shows the entity
// at near-full opacity so it is clearly identifiable on the board.

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
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Tier-3 cosmic backdrop — same artwork as artifact cards */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `url(${cardTier3Bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      {/* Luminary color identity tint */}
      <div
        className="absolute inset-0 mix-blend-screen opacity-55"
        style={{ background: `radial-gradient(ellipse at 50% 28%, ${primaryColor}99 0%, ${secondaryColor}55 50%, transparent 82%)` }}
      />
      {/* Entity — clearly visible, sealed within the panel */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 3px ${primaryColor}88)` }}
      >
        <EntityArt size={size * 0.88} />
      </div>
      {/* Inner noble-tile frame — double line, matches ornamental card motif */}
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
// The sealed board panel shatters → pure light → freed entity rises.

type CutscenePhase = 'sealed' | 'glowing' | 'shattering' | 'flashing' | 'revealed' | 'fading' | 'done';

const PHASE_DURATIONS: Record<CutscenePhase, number> = {
  sealed:     400,
  glowing:    700,
  shattering: 500,
  flashing:   300,
  revealed:   1600,
  fading:     600,
  done:       0,
};

const PHASES: CutscenePhase[] = ['sealed', 'glowing', 'shattering', 'flashing', 'revealed', 'fading', 'done'];

const SHARD_OFFSETS = [
  { x: -110, y: -90,  r: 48  },
  { x:  90,  y: -130, r: -35 },
  { x: -90,  y: -45,  r: 65  },
  { x:  130, y: -70,  r: -50 },
  { x: -130, y: 45,   r: 32  },
  { x:  110, y: 90,   r: -65 },
  { x: -70,  y: 130,  r: 18  },
  { x:  70,  y: 110,  r: -88 },
  { x:  0,   y: -155, r: 22  },
  { x:  155, y: 0,    r: -22 },
  { x: -155, y: 20,   r: 78  },
  { x:  20,  y: 155,  r: -15 },
];

export function LuminarySummonCutscene({
  luminaryId,
  luminaryName,
  domain,
  lumens,
  flavor,
  onComplete,
}: {
  luminaryId: string;
  luminaryName: string;
  domain: string;
  lumens: number;
  flavor: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<CutscenePhase>('sealed');
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor, secondaryColor, glowColor } = vis;

  useEffect(() => {
    let idx = 0;
    function advance() {
      idx++;
      const next = PHASES[idx] ?? 'done';
      setPhase(next);
      if (next !== 'done') {
        setTimeout(advance, PHASE_DURATIONS[next]);
      } else {
        setTimeout(onComplete, 100);
      }
    }
    const t = setTimeout(advance, PHASE_DURATIONS['sealed']);
    return () => clearTimeout(t);
  }, [onComplete]);

  const isShattering = phase === 'shattering' || phase === 'flashing';
  const isFlashing   = phase === 'flashing';
  const isRevealed   = phase === 'revealed' || phase === 'fading';
  const isFading     = phase === 'fading';
  const isSealed     = phase === 'sealed' || phase === 'glowing';
  const isGlowing    = phase === 'glowing';

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onComplete}
    >
      <div className="absolute bottom-8 text-xs text-white/30 tracking-widest uppercase pointer-events-none">tap to skip</div>

      {/* Sealed panel — shows the entity within the board tile */}
      <AnimatePresence>
        {isSealed && (
          <motion.div
            key="panel"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{
              scale: isGlowing ? [1, 1.04, 1] : 1,
              opacity: 1,
              boxShadow: isGlowing
                ? [`0 0 30px ${primaryColor}99`, `0 0 60px ${primaryColor}cc`, `0 0 30px ${primaryColor}99`]
                : `0 0 20px ${primaryColor}66`,
            }}
            exit={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.4, boxShadow: { repeat: Infinity, duration: 0.7 } }}
            className="relative rounded-2xl overflow-hidden"
            style={{ width: 180, height: 180, border: `2px solid ${primaryColor}88` }}
          >
            <LuminaryPanelArt luminaryId={luminaryId} size={180} />
            {isGlowing && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 180 180">
                <motion.path d="M90,0 L82,60 L90,90 L100,120 L88,180"
                  stroke="white" strokeWidth="1.5" fill="none" opacity={0.6}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }} />
                <motion.path d="M0,90 L55,82 L90,90 L120,96 L180,88"
                  stroke="white" strokeWidth="1" fill="none" opacity={0.4}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }} />
                <motion.path d="M40,0 L70,70 L50,120 L60,180"
                  stroke="white" strokeWidth="0.8" fill="none" opacity={0.3}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }} />
              </svg>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shards flying outward */}
      <AnimatePresence>
        {isShattering && SHARD_OFFSETS.map((s, i) => (
          <motion.div
            key={`shard-${i}`}
            className="absolute rounded-sm"
            style={{
              width: 14 + (i % 4) * 6,
              height: 14 + (i % 3) * 6,
              background: i % 2 === 0 ? primaryColor : secondaryColor,
              boxShadow: `0 0 8px ${glowColor}`,
            }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ x: s.x, y: s.y, rotate: s.r, opacity: 0, scale: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Flash */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            key="flash"
            className="absolute inset-0"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: `radial-gradient(ellipse at center, #fff 0%, ${primaryColor} 40%, transparent 80%)` }}
          />
        )}
      </AnimatePresence>

      {/* Entity reveal — freed, no card border, transparent SVG floats */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            key="entity"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: isFading ? 0.8 : 1,
              opacity: isFading ? 0 : 1,
              y: isFading ? -30 : [0, -8, 0],
            }}
            transition={{
              scale:   { duration: 0.6, ease: 'easeOut' },
              opacity: { duration: isFading ? 0.6 : 0.5 },
              y:       { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
            }}
            className="relative flex flex-col items-center gap-4"
          >
            {/* Aura behind entity */}
            <div
              className="absolute"
              style={{
                width: 260, height: 260,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: `radial-gradient(ellipse at center, ${primaryColor}55 0%, ${secondaryColor}33 40%, transparent 75%)`,
                filter: 'blur(18px)',
                pointerEvents: 'none',
              }}
            />
            {/* Entity SVG — transparent background, no card border */}
            <div style={{ filter: `drop-shadow(0 0 20px ${glowColor}) drop-shadow(0 0 8px ${primaryColor}aa)` }}>
              <EntityArt size={200} />
            </div>
            {/* Name + info badge */}
            <div className="relative flex flex-col items-center gap-1 text-center">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: primaryColor }}>
                {domain}
              </div>
              <div className="text-xl font-serif font-bold text-white drop-shadow-lg">
                {luminaryName}
              </div>
              <div
                className="text-base font-bold px-3 py-0.5 rounded-full"
                style={{ background: `${primaryColor}33`, color: primaryColor, border: `1px solid ${primaryColor}66` }}
              >
                +{lumens} Eminence
              </div>
              <div className="text-[11px] text-white/55 italic max-w-[240px] mt-1 leading-snug">
                &ldquo;{flavor}&rdquo;
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
