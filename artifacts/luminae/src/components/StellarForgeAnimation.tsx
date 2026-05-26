import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ArtifactCard } from '@workspace/api-client-react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { getAvatarForPlayer } from '@/lib/avatars';
import { Sparkles } from 'lucide-react';

// ─── Stellar Forge Animation ───────────────────────────────────────────────────
// 6-phase cinematic forge animation for Tier 2 card purchases.
//
// Visual language: solar gold + white-hot forge light + antique brass geometry
// + affinity-colored energy streams. "Outward Manifestation."
//
// Phase sequence and timing (ms):
//  1. lift      (   0–  300)  card rises from slot; solar gold radial flare ignites
//  2. burns     ( 300–  800)  affinity cost streams flow from well to card
//  3. locks     ( 800– 1250)  card border flares gold-white; white-hot pulse
//  4. compress  (1250– 1700)  card compresses to ForgeSeal sigil
//  5. arc       (1700– 2300)  sigil arcs toward ownership destination
//  6. absorb    (2300– 2750)  destination absorbs seal; pulse rings; label
//  → onComplete fires at 2750ms
//
// Intentionally inert overlay — pointer-events-none on root means no keyboard
// or pointer events leak through. No focusable elements inside; focus trap
// not needed.

export type ForgePhase = 'lift' | 'burns' | 'locks' | 'compress' | 'arc' | 'absorb' | 'done';

const PHASE_DUR: Record<Exclude<ForgePhase, 'done'>, number> = {
  lift:     300,
  burns:    500,
  locks:    450,
  compress: 450,
  arc:      600,
  absorb:   450,
};

const T: Record<string, number> = {
  burns:    PHASE_DUR.lift,
  locks:    PHASE_DUR.lift + PHASE_DUR.burns,
  compress: PHASE_DUR.lift + PHASE_DUR.burns + PHASE_DUR.locks,
  arc:      PHASE_DUR.lift + PHASE_DUR.burns + PHASE_DUR.locks + PHASE_DUR.compress,
  absorb:   PHASE_DUR.lift + PHASE_DUR.burns + PHASE_DUR.locks + PHASE_DUR.compress + PHASE_DUR.arc,
  done:     PHASE_DUR.lift + PHASE_DUR.burns + PHASE_DUR.locks + PHASE_DUR.compress + PHASE_DUR.arc + PHASE_DUR.absorb,
};

export interface StellarForgeProps {
  animKey:    number;
  card:       ArtifactCard;
  startRect:  { x: number; y: number; w: number; h: number };
  destPos:    { x: number; y: number };
  lumens:     number;
  playerName: string;
  avatarId:   string | null;
  onComplete?: () => void;
}

// ─── ForgeSeal ────────────────────────────────────────────────────────────────
// Solar compass / 8-pointed star sigil in antique brass + solar gold.

function ForgeSeal({ affinityHex, id }: { affinityHex: string; id: number }) {
  const glowId  = `fs-glow-${id}`;
  const bloomId = `fs-bloom-${id}`;

  const starPoints = (() => {
    const pts: string[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8 - Math.PI / 2;
      const r = i % 2 === 0 ? 42 : 20;
      pts.push(`${48 + r * Math.cos(angle)},${48 + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  })();

  return (
    <svg viewBox="0 0 96 96" className="w-full h-full" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={bloomId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* Soft bloom halo */}
      <circle cx="48" cy="48" r="38"
        fill="#FBC23E" opacity="0.18"
        filter={`url(#${bloomId})`}
      />

      {/* Outer ring */}
      <circle cx="48" cy="48" r="44"
        fill="none" stroke="#C0A472" strokeWidth="0.8" opacity="0.50"
      />
      <circle cx="48" cy="48" r="38"
        fill="none" stroke="#FBC23E" strokeWidth="0.7" opacity="0.35"
      />

      {/* 8-pointed star */}
      <polygon
        points={starPoints}
        fill="#FBC23E" opacity="0.92"
        filter={`url(#${glowId})`}
      />
      {/* Star highlight overlay */}
      <polygon
        points={starPoints}
        fill="rgba(255,251,230,0.28)"
        opacity="1"
      />

      {/* Center affinity gem */}
      <circle cx="48" cy="48" r="9"
        fill={affinityHex} opacity="0.95"
        filter={`url(#${glowId})`}
      />
      <circle cx="48" cy="48" r="5"
        fill="rgba(255,255,255,0.55)" opacity="1"
      />

      {/* Cardinal tick marks */}
      {([0, 90, 180, 270] as const).map((deg, i) => {
        const a = (deg * Math.PI) / 180 - Math.PI / 2;
        return (
          <line key={i}
            x1={48 + 44 * Math.cos(a)} y1={48 + 44 * Math.sin(a)}
            x2={48 + 50 * Math.cos(a)} y2={48 + 50 * Math.sin(a)}
            stroke="#FBC23E" strokeWidth="1.6" opacity="0.70" strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// ─── EnergyStreams ─────────────────────────────────────────────────────────────
// SVG arcs flowing from the affinity well area (bottom of screen) toward the
// card centre. One stream per unique gem type in the card's cost.

function EnergyStreams({
  cardCx, cardCy, costGems, active, id,
}: {
  cardCx: number; cardCy: number;
  costGems: { key: GemKey; hex: string }[];
  active: boolean;
  id: number;
}) {
  const iw = window.innerWidth;
  const ih = window.innerHeight;

  // Well-area origins — spread below card center (where the Affinity Well sits)
  const wellOrigins: { x: number; y: number }[] = [
    { x: iw * 0.22, y: ih * 0.88 },
    { x: iw * 0.42, y: ih * 0.93 },
    { x: iw * 0.65, y: ih * 0.90 },
    { x: iw * 0.82, y: ih * 0.85 },
  ];

  const streams = costGems.slice(0, 4).map((gem, i) => {
    const origin = wellOrigins[i % wellOrigins.length];
    const mx = (origin.x + cardCx) / 2;
    const my = (origin.y + cardCy) / 2 - 90;
    const d = `M ${origin.x},${origin.y} Q ${mx},${my} ${cardCx},${cardCy}`;
    return { ...gem, d, delay: i * 70 };
  });

  return (
    <svg
      className="pointer-events-none fixed inset-0"
      style={{ width: '100vw', height: '100vh', zIndex: 0 }}
    >
      <defs>
        {streams.map((s) => (
          <filter key={`sf-${id}-${s.key}`} id={`sf-${id}-${s.key}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        ))}
      </defs>
      {streams.map((s) => (
        <g key={s.key}>
          {/* Glow layer */}
          <motion.path
            d={s.d}
            fill="none"
            stroke={s.hex}
            strokeWidth="5"
            opacity="0.28"
            filter={`url(#sf-${id}-${s.key})`}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={active
              ? { pathLength: 1, opacity: [0, 0.28, 0.18] }
              : { opacity: 0 }}
            transition={{ duration: 0.44, delay: s.delay / 1000, ease: 'easeOut' }}
          />
          {/* Sharp line */}
          <motion.path
            d={s.d}
            fill="none"
            stroke={s.hex}
            strokeWidth="1.8"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={active
              ? { pathLength: 1, opacity: [0, 0.90, 0.65] }
              : { opacity: 0 }}
            transition={{ duration: 0.42, delay: s.delay / 1000, ease: 'easeOut' }}
          />
          {/* Leading bead */}
          <motion.circle
            r="3.5"
            fill={s.hex}
            opacity="0.9"
            initial={{ offsetDistance: '0%', opacity: 0 }}
            animate={active ? { opacity: [0, 1, 0] } : { opacity: 0 }}
            transition={{ duration: 0.44, delay: s.delay / 1000 }}
          />
        </g>
      ))}
    </svg>
  );
}

// ─── FlareRings ───────────────────────────────────────────────────────────────
// Expanding solar gold rings that burst outward during the lift phase.

function FlareRings({ cx, cy, active }: { cx: number; cy: number; active: boolean }) {
  return (
    <div
      className="pointer-events-none fixed"
      style={{ left: cx, top: cy, transform: 'translate(-50%, -50%)', zIndex: 2 }}
    >
      {([0, 150, 300] as const).map((delay) => (
        <motion.div
          key={delay}
          className="absolute rounded-full border-2"
          style={{
            left: '50%', top: '50%',
            translateX: '-50%', translateY: '-50%',
            borderColor: '#FBC23E',
          }}
          initial={{ width: 20, height: 20, opacity: 0.7 }}
          animate={active
            ? { width: [20, 180], height: [20, 180], opacity: [0.7, 0] }
            : { opacity: 0 }}
          transition={{ duration: 0.80, delay: delay / 1000, ease: 'easeOut' }}
        />
      ))}
      {/* White-hot core burst */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: '50%', top: '50%',
          translateX: '-50%', translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,251,230,0.9) 0%, rgba(251,194,62,0.4) 45%, transparent 75%)',
        }}
        initial={{ width: 0, height: 0, opacity: 1 }}
        animate={active
          ? { width: [0, 100, 80], height: [0, 100, 80], opacity: [1, 0.6, 0] }
          : { opacity: 0 }}
        transition={{ duration: 0.60, ease: 'easeOut' }}
      />
    </div>
  );
}

// ─── AbsorbPulse ──────────────────────────────────────────────────────────────
// Expanding rings at the destination when the seal lands.

function AbsorbPulse({ x, y, affinityHex, active }: {
  x: number; y: number; affinityHex: string; active: boolean;
}) {
  return (
    <div
      className="pointer-events-none fixed"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: 3 }}
    >
      {/* Outer gold ring */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ left: '50%', top: '50%', translateX: '-50%', translateY: '-50%', borderColor: '#FBC23E' }}
        initial={{ width: 12, height: 12, opacity: 0 }}
        animate={active ? { width: [12, 120], height: [12, 120], opacity: [0.9, 0] } : {}}
        transition={{ duration: 1.10, ease: 'easeOut' }}
      />
      {/* Affinity color ring */}
      <motion.div
        className="absolute rounded-full border"
        style={{ left: '50%', top: '50%', translateX: '-50%', translateY: '-50%', borderColor: affinityHex }}
        initial={{ width: 8, height: 8, opacity: 0 }}
        animate={active ? { width: [8, 80], height: [8, 80], opacity: [0.8, 0] } : {}}
        transition={{ duration: 1.00, delay: 0.15, ease: 'easeOut' }}
      />
      {/* Core flash */}
      <motion.div
        className="absolute rounded-full"
        style={{ left: '50%', top: '50%', translateX: '-50%', translateY: '-50%', background: '#FBC23E' }}
        initial={{ width: 10, height: 10, opacity: 0.95 }}
        animate={active ? { width: 0, height: 0, opacity: 0 } : {}}
        transition={{ duration: 0.70, ease: 'easeIn' }}
      />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function StellarForgeAnimation({
  animKey, card, startRect, destPos, lumens, playerName, avatarId, onComplete,
}: StellarForgeProps) {
  const [phase, setPhase] = useState<ForgePhase>('lift');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Screen-centre position for the card during burns/locks phases
  const iw = window.innerWidth;
  const ih = window.innerHeight;
  const w  = startRect.w;
  const h  = startRect.h;
  const cardX  = iw / 2 - w / 2;
  const cardY  = ih / 2 - h / 2 - 20;
  const cardCx = cardX + w / 2;
  const cardCy = cardY + h / 2;

  const bonusKey    = card.bonusColor as GemKey;
  const affinityHex = GEM_META[bonusKey]?.glowHex ?? '#FBC23E';

  // Build cost gem list (unique gem types with count > 0)
  // CrystalCounts is a generated type without an index signature; accessing by
  // GemKey at runtime is safe — every valid GemKey is a required field.
  // eslint-disable-next-line no-restricted-syntax
  const costRaw = card.cost as unknown as Record<GemKey, number>;
  const costGems = GEM_KEYS
    .filter(k => (costRaw[k] ?? 0) > 0)
    .map(k => ({ key: k, hex: GEM_META[k].glowHex }));

  // Phase sequencer
  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('lift');

    const schedule: [number, ForgePhase][] = [
      [T.burns,    'burns'],
      [T.locks,    'locks'],
      [T.compress, 'compress'],
      [T.arc,      'arc'],
      [T.absorb,   'absorb'],
      [T.done,     'done'],
    ];
    schedule.forEach(([delay, next]) => {
      const t = setTimeout(() => {
        setPhase(next);
        if (next === 'done') onComplete?.();
      }, delay);
      timersRef.current.push(t);
    });

    return () => timersRef.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  if (phase === 'done') return null;

  const showCard   = phase === 'lift' || phase === 'burns' || phase === 'locks';
  const showSeal   = phase === 'compress' || phase === 'arc';
  const showAbsorb = phase === 'absorb';

  // Seal position: at card centre during compress, travels to destPos during arc
  const sealSize   = 64;
  const sealStartX = cardCx - sealSize / 2;
  const sealStartY = cardCy - sealSize / 2;
  const sealDestX  = destPos.x - sealSize / 2;
  const sealDestY  = destPos.y - sealSize / 2;

  // Arc control point — curves up and over midway
  const arcMidX = (cardCx + destPos.x) / 2;
  const arcMidY = Math.min(cardCy, destPos.y) - 90;

  return (
    <div className="pointer-events-none fixed inset-0 z-[55]">
      {/* ── Dim overlay ── */}
      <motion.div
        className="absolute inset-0 bg-black/38"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.30 }}
      />

      {/* ── Solar flare rings — burst during lift ── */}
      <FlareRings cx={cardCx} cy={cardCy} active={phase === 'lift'} />

      {/* ── Energy streams — affinity cost flows in during burns ── */}
      {costGems.length > 0 && (
        <EnergyStreams
          cardCx={cardCx}
          cardCy={cardCy}
          costGems={costGems}
          active={phase === 'burns'}
          id={animKey}
        />
      )}

      {/* ── Card face — visible during lift / burns / locks ── */}
      {showCard && (
        <motion.div
          className="fixed"
          style={{
            width: w, height: h,
            transformOrigin: 'center center',
            left: 0, top: 0,
          }}
          initial={{
            x: startRect.x,
            y: startRect.y,
            scale: 1,
            filter: 'brightness(1) drop-shadow(0 0 0px transparent)',
          }}
          animate={phase === 'lift' ? {
            x: cardX,
            y: cardY,
            scale: 1.08,
            filter: 'brightness(1.15) drop-shadow(0 0 18px rgba(251,194,62,0.70))',
          } : phase === 'burns' ? {
            x: cardX,
            y: cardY,
            scale: 1.08,
            filter: 'brightness(1.18) drop-shadow(0 0 22px rgba(251,194,62,0.75))',
          } : /* locks */ {
            x: cardX,
            y: cardY,
            scale: 1.08,
            filter: 'brightness(1.55) drop-shadow(0 0 36px rgba(255,255,230,0.90))',
          }}
          transition={{ duration: phase === 'lift' ? 0.28 : 0.44, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Gold border flash during locks */}
          {phase === 'locks' && (
            <motion.div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{ border: '2.5px solid #FBC23E', boxShadow: '0 0 0px 0px rgba(255,251,230,0)' }}
              initial={{ opacity: 0, boxShadow: '0 0 0px 0px rgba(255,251,230,0)' }}
              animate={{ opacity: [0, 1, 0.7], boxShadow: ['0 0 0px 0px rgba(255,251,230,0)', '0 0 24px 8px rgba(255,251,230,0.80)', '0 0 14px 4px rgba(251,194,62,0.55)'] }}
              transition={{ duration: 0.44 }}
            />
          )}
          {/* Cost pips row — visible during burns/locks, staggered fade-in */}
          {(phase === 'burns' || phase === 'locks') && costGems.length > 0 && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1.5">
              {costGems.map((g, i) => (
                <motion.div
                  key={g.key}
                  className="rounded-full border"
                  style={{
                    width: 10, height: 10,
                    background: g.hex,
                    borderColor: 'rgba(255,251,230,0.60)',
                    boxShadow: `0 0 6px ${g.hex}`,
                  }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: [0.3, 1.4, 1.0] }}
                  transition={{ duration: 0.32, delay: i * 0.10 }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── ForgeSeal sigil — appears during compress, travels during arc ── */}
      {showSeal && (
        <motion.div
          className="fixed"
          style={{ width: sealSize, height: sealSize, left: 0, top: 0 }}
          initial={phase === 'compress'
            ? { x: sealStartX, y: sealStartY, scale: 0, opacity: 0 }
            : { x: sealStartX, y: sealStartY, scale: 1, opacity: 1 }
          }
          animate={phase === 'compress'
            ? { x: sealStartX, y: sealStartY, scale: [0, 1.15, 1.0], opacity: 1 }
            : {
                x: [sealStartX, arcMidX - sealSize / 2, sealDestX],
                y: [sealStartY, arcMidY - sealSize / 2, sealDestY],
                scale: [1.0, 1.2, 0.3],
                opacity: [1, 1, 0],
              }
          }
          transition={phase === 'compress'
            ? { duration: 0.44, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.58, times: [0, 0.5, 1], ease: 'easeIn' }
          }
        >
          <ForgeSeal affinityHex={affinityHex} id={animKey} />
        </motion.div>
      )}

      {/* ── Destination absorb pulse + label ── */}
      {showAbsorb && (
        <>
          <AbsorbPulse
            x={destPos.x}
            y={destPos.y}
            affinityHex={affinityHex}
            active
          />

          {/* "Forged!" label + eminence near destination */}
          <motion.div
            className="fixed flex flex-col items-center gap-1"
            style={{
              left: destPos.x,
              top: destPos.y - 68,
              transform: 'translateX(-50%)',
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -6] }}
            transition={{ duration: 0.42, times: [0, 0.20, 0.75, 1] }}
          >
            <span className="text-xl font-serif font-black text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] whitespace-nowrap">
              Forged!
            </span>
            {lumens > 0 && (
              <span
                className="flex items-center gap-1 text-sm font-bold"
                style={{ color: GEM_META.flux.hex }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                +{lumens} eminence
              </span>
            )}
          </motion.div>

          {/* Player avatar + name — offset to not overlap label */}
          <motion.div
            className="fixed flex items-center gap-2"
            style={{
              left: destPos.x + 46,
              top: destPos.y - 24,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.42 }}
          >
            <div
              className="rounded-full overflow-hidden border-2 shadow-[0_0_12px_rgba(251,194,62,0.50)]"
              style={{ width: 28, height: 28, borderColor: '#FBC23E' }}
            >
              <img
                src={getAvatarForPlayer(avatarId ?? undefined).image}
                alt={playerName}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <span className="text-xs font-semibold text-white/80 bg-black/60 rounded-full px-2 py-0.5 backdrop-blur whitespace-nowrap">
              {playerName}
            </span>
          </motion.div>
        </>
      )}
    </div>
  );
}
