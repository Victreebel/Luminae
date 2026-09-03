import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AvatarSeedSymbol } from './AvatarSeedSymbol';
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';
import { gameAudio } from '@/lib/audio';

const SEED_GREEN = '#67e8a2';
const SEED_GOLD = '#d5b96c';
const SEED_TEAL = '#49bfa3';
const FLIGHT_STAGGER_MS = 430;
const FLIGHT_MS = 1_180;
const IMPACT_HOLD_MS = 760;

export const SEED_EFFECT_TOTAL_MS = FLIGHT_STAGGER_MS * 2 + FLIGHT_MS + IMPACT_HOLD_MS;

interface Point {
  x: number;
  y: number;
}

interface SeedFlight {
  slotKey: string;
  source: Point;
  target: Point;
  targetWidth: number;
  targetHeight: number;
}

function visibleRect(selector: string): DOMRect | null {
  const element = Array.from(document.querySelectorAll<HTMLElement>(selector)).find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  return element?.getBoundingClientRect() ?? null;
}

function center(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function MoldInscription({ flight, index }: { flight: SeedFlight; index: number }) {
  const delay = index * FLIGHT_STAGGER_MS / 1_000;
  const dx = flight.target.x - flight.source.x;
  const dy = flight.target.y - flight.source.y;
  const curve = Math.min(120, Math.max(54, Math.abs(dx) * 0.18));
  const sealSize = Math.max(38, Math.min(66, Math.min(flight.targetWidth, flight.targetHeight) * 0.64));

  return (
    <>
      <motion.div
        className="pointer-events-none fixed"
        style={{
          left: flight.source.x - 18,
          top: flight.source.y - 18,
          width: 36,
          height: 36,
          zIndex: 402,
          filter: `drop-shadow(0 0 9px ${SEED_GREEN})`,
        }}
        initial={{ opacity: 0, scale: 0.4, x: 0, y: 0, rotate: -18 }}
        animate={{
          opacity: [0, 1, 1, 1, 0],
          scale: [0.4, 1, 0.94, 0.7, 0.45],
          x: [0, dx * 0.22, dx * 0.62, dx],
          y: [0, dy * 0.18 - curve, dy * 0.58 - curve * 0.72, dy],
          rotate: [-18, 7, -5, 0],
        }}
        transition={{
          delay,
          duration: FLIGHT_MS / 1_000,
          times: [0, 0.16, 0.55, 0.9, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <AvatarSeedSymbol size={36} />
      </motion.div>

      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: flight.target.x - sealSize / 2,
          top: flight.target.y - sealSize / 2,
          width: sealSize,
          height: sealSize,
          zIndex: 401,
          border: `1px solid ${SEED_GREEN}`,
          boxShadow: `0 0 18px ${SEED_GREEN}99, inset 0 0 16px ${SEED_TEAL}66`,
        }}
        initial={{ opacity: 0, scale: 0.18, rotate: -24 }}
        animate={{ opacity: [0, 0, 1, 0.88, 0], scale: [0.18, 0.18, 1.18, 0.96, 1.28], rotate: [-24, -24, 5, 0, 0] }}
        transition={{
          delay: delay + (FLIGHT_MS * 0.76) / 1_000,
          duration: 0.88,
          times: [0, 0.08, 0.4, 0.68, 1],
          ease: 'easeOut',
        }}
      >
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" aria-hidden="true">
          <path d="M50 12v76M12 50h76M23 23l54 54M77 23 23 77" stroke={SEED_GOLD} strokeWidth="1.2" strokeDasharray="4 5" opacity=".72" />
          <path d="M50 18C37 25 30 36 30 50s7 25 20 32c13-7 20-18 20-32S63 25 50 18Z" stroke={SEED_GREEN} strokeWidth="2" />
          <path d="M50 50c-11 7-17 15-18 25m18-25c11 7 17 15 18 25" stroke={SEED_TEAL} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </motion.div>
    </>
  );
}

export function SeedBeyondSeasonsEffect({
  moldSlots,
  onComplete,
}: {
  moldSlots: string[];
  onComplete: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const flights = useMemo<SeedFlight[]>(() => {
    const sourceRect = visibleRect('[data-luminary-id="lum_seed"]');
    const source = sourceRect
      ? center(sourceRect)
      : { x: window.innerWidth / 2, y: Math.max(72, window.innerHeight * 0.18) };

    return moldSlots.slice(0, 3).flatMap((slotKey) => {
      const rect = visibleRect(`[data-slot-key="${CSS.escape(slotKey)}"]`);
      if (!rect) return [];
      return [{
        slotKey,
        source,
        target: center(rect),
        targetWidth: rect.width,
        targetHeight: rect.height,
      }];
    });
  }, [moldSlots]);

  useEffect(() => {
    const duration = reducedMotion ? 1_050 : SEED_EFFECT_TOTAL_MS;
    playLuminaryEffectPhaseSound('lum_seed', 'target', SEED_GREEN);

    const resolveAt = reducedMotion ? 260 : Math.round(FLIGHT_MS * 0.76);
    const aftermathAt = reducedMotion ? 760 : Math.max(resolveAt + 240, duration - 420);
    gameAudio.preloadSeedBeyondSeasonsCue();
    gameAudio.playSeedBeyondSeasonsCue(resolveAt);
    const timers = [
      window.setTimeout(
        () => playLuminaryEffectPhaseSound('lum_seed', 'resolve', SEED_GREEN),
        resolveAt,
      ),
      window.setTimeout(
        () => playLuminaryEffectPhaseSound('lum_seed', 'aftermath', SEED_GREEN),
        aftermathAt,
      ),
      window.setTimeout(() => onCompleteRef.current(), duration),
    ];
    flights.forEach((_, index) => {
      const launchAt = reducedMotion ? index * 70 : index * FLIGHT_STAGGER_MS;
      const plantAt = reducedMotion
        ? launchAt + 260
        : launchAt + Math.round(FLIGHT_MS * 0.76);
      timers.push(
        window.setTimeout(() => gameAudio.playAvatarSeedPlant(index), plantAt),
      );
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [flights, reducedMotion]);

  if (reducedMotion) {
    return (
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 400 }}>
        {flights.map((flight) => (
          <motion.div
            key={flight.slotKey}
            className="fixed"
            style={{ left: flight.target.x - 20, top: flight.target.y - 20, filter: `drop-shadow(0 0 8px ${SEED_GREEN})` }}
            initial={{ opacity: 0, scale: 0.65 }}
            animate={{ opacity: [0, 1, 0], scale: [0.65, 1.1, 1] }}
            transition={{ duration: 0.9 }}
          >
            <AvatarSeedSymbol size={40} />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 400 }}>
      {flights.map((flight, index) => (
        <MoldInscription key={flight.slotKey} flight={flight} index={index} />
      ))}
    </div>
  );
}
