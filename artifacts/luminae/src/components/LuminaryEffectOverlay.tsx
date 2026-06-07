import React from 'react';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LuminaryEffectTone =
  | 'boon'
  | 'curse'
  | 'negation'
  | 'consumption'
  | 'global';

export type LuminaryEffectTarget =
  | 'player'
  | 'artifact'
  | 'affinityRow'
  | 'score'
  | 'board'
  | 'pendingAction';

export interface LuminaryEffectAnimation {
  luminaryId: string;
  affinities: string[];
  tone: LuminaryEffectTone;
  target: LuminaryEffectTarget;
  targetId?: string;
  isLingering: boolean;
}

// ─── Affinity color map ───────────────────────────────────────────────────────

const GEM_COLORS: Record<string, string> = {
  ruby:    '#ef4444',
  sapphire:'#3d6bff',
  emerald: '#22c55e',
  onyx:    '#8b5cf6',
  pearl:   '#e2e8f0',
  flux:    '#f59e0b',
};

// ─── Tone visual config ───────────────────────────────────────────────────────

export interface LuminaryToneConfig {
  snapGradient: string;
  snapColor: string;
  toneLabel: string;
}

export const TONE_CONFIG: Record<LuminaryEffectTone, LuminaryToneConfig> = {
  boon: {
    snapGradient: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(254,249,195,0.22) 0%, transparent 70%)',
    snapColor: '#fef9c3',
    toneLabel: 'GRANTED',
  },
  curse: {
    snapGradient: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(239,68,68,0.30) 0%, transparent 65%)',
    snapColor: '#ef4444',
    toneLabel: 'CONDEMNED',
  },
  negation: {
    snapGradient: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(148,163,184,0.22) 0%, transparent 60%)',
    snapColor: '#94a3b8',
    toneLabel: 'SEALED',
  },
  consumption: {
    snapGradient: 'radial-gradient(ellipse 80% 80% at 50% 60%, rgba(220,38,38,0.34) 0%, rgba(0,0,0,0.22) 44%, transparent 70%)',
    snapColor: '#dc2626',
    toneLabel: 'CONSUMED',
  },
  global: {
    snapGradient: 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(245,158,11,0.16) 0%, rgba(99,102,241,0.10) 40%, transparent 65%)',
    snapColor: '#f59e0b',
    toneLabel: 'WORLD SHIFT',
  },
};

// ─── Target labels ────────────────────────────────────────────────────────────

const TARGET_LABELS: Record<LuminaryEffectTarget, string> = {
  score:         'EMINENCE',
  artifact:      'MARKET ARTIFACTS',
  player:        'ALL PLAYERS',
  board:         'ENTIRE BOARD',
  affinityRow:   'AFFINITIES',
  pendingAction: 'LINGERING POWER',
};

// ─── Luminary effect map ──────────────────────────────────────────────────────
// Maps each luminaryId to its effect descriptor (tone, target, affinities).
// This is a UI-only annotation — mechanics live exclusively in gameEngine.ts.

export const LUMINARY_EFFECT_MAP: Record<string, Omit<LuminaryEffectAnimation, 'luminaryId'>> = {
  lum_ember:   { affinities: ['ruby', 'onyx', 'pearl'],     tone: 'global',      target: 'artifact',      isLingering: true  },
  lum_tide:    { affinities: ['sapphire'],                  tone: 'global',      target: 'artifact',      isLingering: false },
  lum_verdant: { affinities: ['emerald'],                   tone: 'boon',        target: 'affinityRow',   isLingering: false },
  lum_void:    { affinities: ['onyx'],                      tone: 'curse',       target: 'score',         isLingering: false },
  lum_radiant: { affinities: ['pearl'],                     tone: 'boon',        target: 'score',         isLingering: false },
  lum_astral:  { affinities: ['ruby', 'sapphire'],          tone: 'global',      target: 'artifact',      isLingering: false },
  lum_bloom:   { affinities: ['ruby', 'emerald'],           tone: 'boon',        target: 'score',         isLingering: false },
  lum_forge:   { affinities: ['ruby', 'onyx'],              tone: 'global',      target: 'artifact',      isLingering: false },
  lum_compass: { affinities: ['sapphire', 'onyx'],          tone: 'negation',    target: 'artifact',      isLingering: true  },
  lum_seed:    { affinities: ['sapphire', 'emerald'],       tone: 'boon',        target: 'board',         isLingering: true  },
  lum_orchard: { affinities: ['emerald', 'pearl'],          tone: 'boon',        target: 'artifact',      isLingering: false },
  lum_pale:    { affinities: ['onyx', 'pearl'],             tone: 'curse',       target: 'player',        isLingering: false },
  lum_null:    { affinities: ['sapphire', 'onyx', 'pearl'], tone: 'negation',    target: 'artifact',      isLingering: true  },
  lum_hunger:  { affinities: ['ruby', 'emerald', 'pearl'],  tone: 'consumption', target: 'pendingAction', isLingering: true  },
  lum_moth:    { affinities: ['ruby'],                      tone: 'global',      target: 'artifact',      isLingering: false },
  lum_scholar: { affinities: ['sapphire', 'pearl'],         tone: 'global',      target: 'artifact',      isLingering: false },
};

// ─── Beat 3: Aura expansion ───────────────────────────────────────────────────
// Replaces the old circle-ring approach.  Uses outward rays + borderless
// ambient glow — no geometric border/ring shapes that clash with irregular
// Luminary silhouettes.  Rendered BEFORE the entity in DOM order (paints behind).
//
// Entry: rays grow outward (scaleY 0→1) from entity center, glow expands.
// Exit:  rays continue extending past full length while fading (dissipate
//        outward) — never collapse inward.

const RAY_COUNT = 10;

export function AuraExpansion({
  affinities,
  primaryColor,
  visible,
}: {
  affinities: string[];
  primaryColor: string;
  visible: boolean;
}) {
  const colors = affinities.slice(0, 3).map(a => GEM_COLORS[a] ?? primaryColor);
  const c1 = colors[0] ?? primaryColor;
  const c2 = colors[1] ?? c1;

  const entryEase = [0.22, 1, 0.36, 1] as [number, number, number, number];

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ pointerEvents: 'none' }}
    >
      {/* Ambient aura glow — borderless radial light, no visible circle outline.
          Starts collapsed at entity center, expands outward on entry.
          Exit: continues expanding while fading (never pulls back). */}
      <motion.div
        style={{
          position: 'absolute',
          width: '110vmin',
          height: '110vmin',
          background: `radial-gradient(ellipse at center,
            ${c1}26 0%,
            ${c2}12 42%,
            transparent 68%)`,
        }}
        initial={{ scale: 0.22, opacity: 0 }}
        animate={{
          scale:   visible ? 1.0 : 1.75,
          opacity: visible ? 1   : 0,
        }}
        transition={{
          duration: visible ? 0.55 : 0.62,
          ease: visible ? entryEase : 'easeOut',
        }}
      />

      {/* Radial rays — thin gradient beams that shoot outward from entity center.
          transformOrigin: 'top center' means scaleY grows downward (away from center).
          framer-motion merges `rotate` in style with animated scaleY correctly. */}
      {Array.from({ length: RAY_COUNT }, (_, i) => {
        const angle = (i / RAY_COUNT) * 360;
        const color = colors[i % colors.length] ?? c1;
        // Alternate between two widths for organic variety
        const width = i % 2 === 0 ? 1.5 : 1;
        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width,
              height: '34vmin',
              marginLeft: -(width / 2),
              transformOrigin: 'top center',
              rotate: angle,          // framer-motion rotate (degrees) — combined with scaleY
              background: `linear-gradient(
                to bottom,
                ${color}cc 0%,
                ${color}66 45%,
                transparent 100%
              )`,
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{
              // Exit: scaleY > 1 so rays keep extending outward as they fade
              scaleY:  visible ? 1    : 1.55,
              opacity: visible ? 0.82 : 0,
            }}
            transition={{
              duration: visible ? 0.50 : 0.55,
              delay:    visible ? i * 0.022 : 0,
              ease:     visible ? entryEase : 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Beat 4: Target claim badge ───────────────────────────────────────────────
// Appears inside the text block (between the effect label and the Luminary name)
// to declare what the effect is targeting.

export function TargetBadge({
  tone,
  target,
  isLingering,
}: {
  tone: LuminaryEffectTone;
  target: LuminaryEffectTarget;
  isLingering: boolean;
}) {
  const conf = TONE_CONFIG[tone];
  return (
    <motion.div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full"
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        background: `${conf.snapColor}18`,
        border: `1px solid ${conf.snapColor}44`,
        color: conf.snapColor,
        backdropFilter: 'blur(4px)',
      }}
      // Drifts in from entity (above), expands outward toward board (below).
      // No scale-shrink on entry or exit — only directional flow.
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
    >
      <span style={{ opacity: 0.72 }}>{conf.toneLabel}</span>
      <span style={{ opacity: 0.32 }}>·</span>
      <span>{TARGET_LABELS[target]}</span>
      {isLingering && (
        <>
          <span style={{ opacity: 0.32 }}>·</span>
          <span style={{ opacity: 0.62, fontSize: 8 }}>LINGERING</span>
        </>
      )}
    </motion.div>
  );
}

// ─── Beat 5: Consequence snap ─────────────────────────────────────────────────
// A brief full-screen radial gradient flash whose color conveys the effect tone.
// Rendered last so it sits above the entity and sigil during the snap beat.

export function ConsequenceSnap({ tone }: { tone: LuminaryEffectTone }) {
  const conf = TONE_CONFIG[tone];
  // Consumption (First Hunger's initial grant) still expands outward — the
  // inward dissolve only applies to the artifact being consumed, not here.
  return (
    <motion.div
      className="absolute inset-0"
      style={{ background: conf.snapGradient, pointerEvents: 'none' }}
      // Scale expands outward during the flash (wave reaches the board edges)
      // then continues expanding while fading — never collapses inward.
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: [0, 1, 0],
        scale:   [0.85, 1.0, 1.10],
      }}
      transition={{ duration: 0.70, times: [0, 0.26, 1], ease: 'easeOut' }}
    />
  );
}
