import React, { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getLuminaryVisuals } from '@/lib/luminaryAssets';
import { gameAudio } from '@/lib/audio';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LuminaryActivationCinematicProps {
  luminaryId: string;
  effectType: 'summon' | 'end_of_turn' | 'start_of_turn';
  luminaryName: string;
  triggeringPlayerName?: string;
  onComplete: () => void;
}

// ─── Timing constants ─────────────────────────────────────────────────────────

const SCRIM_IN_MS   = 400;
const ENTITY_IN_MS  = 600;
const HOLD_MS       = 2600;
const SCRIM_OUT_MS  = 700;
const TOTAL_MS      = SCRIM_IN_MS + HOLD_MS + SCRIM_OUT_MS; // ≈ 3700 ms
const PARTICLE_FIRE_MS = 1000;

// ─── Effect-type display ─────────────────────────────────────────────────────

const EFFECT_TYPE_LABELS: Record<string, string> = {
  summon:        'ARRIVAL EFFECT',
  end_of_turn:   'END OF TURN EFFECT',
  start_of_turn: 'START OF TURN EFFECT',
};

// ─── Particle helpers ─────────────────────────────────────────────────────────

interface Particle {
  id: number;
  angle: number;
  radius: number;
  size: number;
  delay: number;
  duration: number;
}

function useParticles(count = 24): Particle[] {
  return useMemo(() => {
    const golden = 137.508;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: i * golden,
      radius: 90 + (i % 5) * 30,
      size: 3 + (i % 4),
      delay: (i / count) * 1.0,
      duration: 0.9 + (i % 3) * 0.2,
    }));
  }, [count]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LuminaryActivationCinematic({
  luminaryId,
  effectType,
  luminaryName,
  triggeringPlayerName,
  onComplete,
}: LuminaryActivationCinematicProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const vis = getLuminaryVisuals(luminaryId);
  const particles = useParticles(24);
  const label = EFFECT_TYPE_LABELS[effectType] ?? 'EFFECT';

  const primaryColor   = vis?.primaryColor  ?? '#7c3aed';
  const secondaryColor = vis?.secondaryColor ?? '#4f46e5';
  const EntityArt      = vis?.EntityArt;

  useEffect(() => {
    gameAudio.playActivationSting(effectType, primaryColor);
    const t = setTimeout(() => onCompleteRef.current(), TOTAL_MS);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fadeOutDelay = (SCRIM_IN_MS + HOLD_MS) / 1000;

  const content = (
    <motion.div
      key="activation-scrim"
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 9000,
        background: `radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.96) 100%)`,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: SCRIM_IN_MS / 1000, ease: 'easeOut' as const } }}
      exit={{ opacity: 0, transition: { duration: SCRIM_OUT_MS / 1000, ease: 'easeIn' as const, delay: fadeOutDelay } }}
    >
      {/* ── Glow rings ── */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width:  240 + i * 90,
            height: 240 + i * 90,
            border: `1.5px solid ${primaryColor}`,
            opacity: 0,
          }}
          animate={{
            opacity: [0, 0.35, 0],
            scale:   [0.7, 1.25, 1.6],
          }}
          transition={{
            duration:    2.2,
            delay:       SCRIM_IN_MS / 1000 + i * 0.28,
            ease:        'easeOut' as const,
            repeat:      Infinity,
            repeatDelay: 0.8,
          }}
        />
      ))}

      {/* ── Entity art ── */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: 280, height: 280 }}
        initial={{ opacity: 0, scale: 0.72, y: 24 }}
        animate={{
          opacity: 1, scale: 1, y: 0,
          transition: {
            duration: ENTITY_IN_MS / 1000,
            delay: SCRIM_IN_MS / 1000,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          },
        }}
        exit={{
          opacity: 0, scale: 0.88, y: -16,
          transition: { duration: 0.45, ease: 'easeIn' as const, delay: fadeOutDelay - 0.2 },
        }}
      >
        {/* Glow backdrop */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${primaryColor}30 0%, transparent 72%)`,
            filter: 'blur(24px)',
          }}
        />

        {EntityArt ? (
          <EntityArt size={260} />
        ) : (
          <div
            className="rounded-full"
            style={{
              width: 220, height: 220,
              background: `radial-gradient(circle, ${primaryColor}60, ${secondaryColor}30)`,
              boxShadow: `0 0 60px ${primaryColor}80`,
            }}
          />
        )}

        {/* Particles — fire at PARTICLE_FIRE_MS */}
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * p.radius;
          const ty = Math.sin(rad) * p.radius;
          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: p.size,
                height: p.size,
                background: primaryColor,
                left: '50%',
                top: '50%',
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
                boxShadow: `0 0 ${p.size * 2}px ${primaryColor}`,
              }}
              initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
              animate={{
                opacity: [0, 0.9, 0],
                x: [0, tx],
                y: [0, ty],
                scale: [1, 0.4],
              }}
              transition={{
                duration: p.duration,
                delay:    PARTICLE_FIRE_MS / 1000 + p.delay,
                ease:     'easeOut' as const,
              }}
            />
          );
        })}
      </motion.div>

      {/* ── Text block ── */}
      <motion.div
        className="flex flex-col items-center gap-2 mt-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: 1, y: 0,
          transition: { duration: 0.5, delay: (SCRIM_IN_MS + 200) / 1000, ease: 'easeOut' as const },
        }}
        exit={{
          opacity: 0,
          transition: { duration: 0.3, delay: fadeOutDelay - 0.35 },
        }}
      >
        {/* Effect type badge */}
        <div
          className="px-3 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase"
          style={{
            background: `${primaryColor}22`,
            border: `1px solid ${primaryColor}55`,
            color: primaryColor,
          }}
        >
          {label}
        </div>

        {/* Luminary name */}
        <div
          className="text-2xl font-bold tracking-wide text-center"
          style={{
            color: '#ffffff',
            textShadow: `0 0 24px ${primaryColor}cc, 0 2px 8px rgba(0,0,0,0.8)`,
            maxWidth: 320,
          }}
        >
          {luminaryName}
        </div>

        {/* Triggering player name */}
        {triggeringPlayerName && (
          <div
            className="text-xs tracking-wider"
            style={{ color: `${primaryColor}cc` }}
          >
            {triggeringPlayerName}
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
