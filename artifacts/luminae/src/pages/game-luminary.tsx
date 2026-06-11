import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Luminary, GamePlayerState, LuminaryActiveState, CrystalCounts } from '@workspace/api-client-react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { LuminaryPanelArt } from '@/lib/luminaryAssets';
import { BOARD_CARD_W, BOARD_CARD_H } from '@/lib/constants';
import { CRYSTALS } from './game-constants';
import { MiniGem, EminenceDiamond } from './game-card';
import { PlayerAvatar } from './game-player';
import { ArmedSigil } from './game-luminary-effects';
import { gameAudio } from '@/lib/audio';

// ── LuminaryClaimedPortal ─────────────────────────────────────────────────────
// Replaces the Luminary panel card after it has been claimed by any player.
// Fits the same BOARD_CARD_W × BOARD_CARD_H footprint.
//
// isLive=true   → bonus is currently active (turnCount > summonedAtTurnCount)
// isNew=true    → 900ms entrance: collapses from centre, spiral burst, spring-settle.
//
// Interaction:
//   Single tap → open info panel
//   Double tap → cycle active affinity (if multi-eligible)
export const LuminaryClaimedPortal = React.memo(function LuminaryClaimedPortal({
  luminary, claimedByPlayer, luminaryAffinity,
  isLive: _isLive, canToggle, onToggle, isNew = false, isArmed = false, onOpenSheet,
  burnCount,
}: {
  luminary: Luminary;
  claimedByPlayer?: GamePlayerState | null;
  luminaryAffinity?: LuminaryActiveState | null;
  isLive?: boolean;
  canToggle?: boolean;
  onToggle?: (affinity: string) => void;
  isNew?: boolean;
  isArmed?: boolean;
  onOpenSheet?: () => void;
  burnCount?: number;
}) {
  const fresh = useRef(isNew).current;

  const activeKey = (luminaryAffinity?.activeAffinity ?? null) as GemKey | null;
  const eligibleKeys = (luminaryAffinity?.eligibleAffinities ?? []) as GemKey[];

  // Detect affinity switches on any claimed portal and trigger a flash animation
  const isAIPortal = claimedByPlayer?.aiDifficulty === 'medium' || claimedByPlayer?.aiDifficulty === 'hard';
  const prevActiveKeyRef = useRef<GemKey | null>(activeKey);
  const [affinityFlashKey, setAffinityFlashKey] = useState<number>(0);
  const [affinityFlashColor, setAffinityFlashColor] = useState<string | null>(null);

  useEffect(() => {
    if (prevActiveKeyRef.current !== null && prevActiveKeyRef.current !== activeKey && activeKey) {
      const newColor = GEM_META[activeKey].hex;
      setAffinityFlashColor(newColor);
      setAffinityFlashKey(k => k + 1);
      if (!isAIPortal) {
        gameAudio.playAffinitySwitch(activeKey ?? undefined);
      }
    }
    prevActiveKeyRef.current = activeKey;
  }, [activeKey, isAIPortal]);

  useEffect(() => {
    if (affinityFlashKey === 0) return;
    const id = window.setTimeout(() => setAffinityFlashColor(null), 700);
    return () => window.clearTimeout(id);
  }, [affinityFlashKey]);
  const activeAffinityMeta = activeKey ? GEM_META[activeKey] : null;

  // All requirement colours — basis for the vortex mix (no flux)
  const accentMeta = useMemo(
    () => GEM_KEYS.filter(k => k !== 'flux' && (luminary.requirements[k as GemKey] ?? 0) > 0).map(k => GEM_META[k as GemKey]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [luminary.id],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = accentMeta.length > 0 ? accentMeta : [GEM_META.flux];
  const hexes = useMemo(() => colors.map(c => c.hex), [colors]);

  const g1 = activeAffinityMeta?.hex ?? hexes[0];
  const g2 = activeAffinityMeta?.glowHex ?? hexes[0];

  const conicAll = useMemo(() => {
    if (hexes.length <= 1) return `conic-gradient(${hexes[0]}, ${hexes[0]}88, ${hexes[0]})`;
    const deg = 360 / hexes.length;
    return `conic-gradient(from 0deg, ${hexes.flatMap((h, i) => [`${h} ${i * deg}deg`, `${h} ${(i + 1) * deg}deg`]).join(', ')})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexes.join(',')]);

  const conicActive = useMemo(() => {
    const otherHexes = hexes.filter(h => h !== g1);
    if (hexes.length <= 1 || otherHexes.length === 0) {
      return `conic-gradient(${g1}ee, ${g1}88, ${g1}ee)`;
    }
    const activeDeg = 200;
    const sliceDeg = (360 - activeDeg) / otherHexes.length;
    const parts: string[] = [`${g1} 0deg`, `${g1} ${activeDeg}deg`];
    otherHexes.forEach((h, i) => {
      parts.push(`${h} ${activeDeg + i * sliceDeg}deg`, `${h} ${activeDeg + (i + 1) * sliceDeg}deg`);
    });
    parts.push(`${g1} 360deg`);
    return `conic-gradient(from 0deg, ${parts.join(', ')})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexes.join(','), g1]);

  const particlePositions = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      left:  8  + (i * 19 % 90),
      top:   12 + (i * 31 % 120),
      dur:   2.4 + i * 0.38,
      delay: i  * 0.28,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [luminary.id],
  );

  const particleColors = useMemo(() => {
    const otherHexes = hexes.filter(h => h !== g1);
    return Array.from({ length: 7 }, (_, i) => {
      const useActive = i < 4;
      return {
        color: useActive ? g1 : (otherHexes.length > 0 ? otherHexes[(i - 4) % otherHexes.length] : g1),
        size:  useActive ? (2 + (i % 2) * 0.8) : (1.2 + (i % 2) * 0.5),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexes.join(','), g1]);

  const fireToggle = () => {
    if (!canToggle || !onToggle || eligibleKeys.length < 2 || !activeKey) return;
    const idx = eligibleKeys.indexOf(activeKey);
    const next = eligibleKeys[(idx + 1) % eligibleKeys.length];
    onToggle(next);
  };

  // Double-tap detection: single tap opens sheet, double tap cycles affinity
  const lastTapRef = useRef<number>(0);
  const handleTap = () => {
    const now = Date.now();
    const elapsed = now - lastTapRef.current;
    lastTapRef.current = now;
    if (elapsed < 300 && canToggle) {
      fireToggle();
    } else {
      onOpenSheet?.();
    }
  };

  const ownerName = claimedByPlayer?.playerName ?? '';

  const Tag = (onOpenSheet ? motion.button : motion.div) as typeof motion.div;

  return (
    <Tag
      className="absolute inset-0 bg-[#030308]"
      style={{ transformOrigin: '50% 42%', cursor: onOpenSheet ? 'pointer' : 'default' }}
      initial={fresh ? { scale: 0.04, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={fresh ? { duration: 0.88, ease: [0.16, 1, 0.3, 1] } : {}}
      onClick={onOpenSheet ? handleTap : undefined}
      {...(onOpenSheet ? { type: 'button', whileTap: { scale: 0.97 } } : {})}
    >
      {/* ── Opening spiral burst ── */}
      {fresh && (
        <>
          <motion.div
            className="absolute pointer-events-none"
            style={{ inset: -24, background: conicAll, filter: 'blur(22px)' }}
            initial={{ opacity: 0, rotate: 0, scale: 0.1 }}
            animate={{ opacity: [0, 0.72, 0], rotate: 540, scale: [0.1, 1.5, 1.0] }}
            transition={{ duration: 0.96, ease: [0.16, 0.8, 0.3, 1] }}
          />
          <motion.div
            className="absolute inset-0 pointer-events-none z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.82, times: [0, 0.04, 0.38, 1], ease: 'easeOut' }}
          >
            <svg width={BOARD_CARD_W} height={BOARD_CARD_H} viewBox={`0 0 ${BOARD_CARD_W} ${BOARD_CARD_H}`} className="w-full h-full overflow-visible">
              <polyline points="56,70 50,54 62,40 53,24 61,10 49,0" stroke={g2} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px white) drop-shadow(0 0 8px ${g1})` }} />
              <polyline points="62,40 74,32 82,18" stroke={g2} strokeWidth="0.9" fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 2px ${g1})` }} />
              <polyline points="53,24 44,20 36,12" stroke={g2} strokeWidth="0.7" fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 2px ${g1})` }} />
              <polyline points="56,70 70,64 82,70 98,62 112,66" stroke="white" strokeWidth="0.7" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75, filter: `drop-shadow(0 0 2px ${g1})` }} />
              <polyline points="56,70 42,76 28,70 12,75 0,72" stroke="white" strokeWidth="0.7" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, filter: `drop-shadow(0 0 2px ${g1})` }} />
              <polyline points="56,70 66,84 60,102 70,122 63,148 70,160" stroke="white" strokeWidth="0.65" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65, filter: `drop-shadow(0 0 2px ${g1})` }} />
              <polyline points="56,70 44,86 50,106 42,132 48,160" stroke="white" strokeWidth="0.6" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, filter: `drop-shadow(0 0 2px ${g1})` }} />
              <polyline points="56,70 66,56 74,44 70,28 80,14 88,0" stroke="white" strokeWidth="0.65" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, filter: `drop-shadow(0 0 2px ${g1})` }} />
              <polyline points="56,70 64,72 74,68 86,74 100,70" stroke="white" strokeWidth="0.35" fill="none" style={{ opacity: 0.45 }} />
              <polyline points="56,70 48,62 38,66 24,62 8,65" stroke="white" strokeWidth="0.35" fill="none" style={{ opacity: 0.45 }} />
              <polyline points="56,70 60,82 56,96 62,114 58,136" stroke="white" strokeWidth="0.35" fill="none" style={{ opacity: 0.4 }} />
              <polyline points="56,70 50,76 40,72 26,78 10,75" stroke="white" strokeWidth="0.3" fill="none" style={{ opacity: 0.35 }} />
              <polyline points="56,70 68,78 80,74 96,80" stroke="white" strokeWidth="0.3" fill="none" style={{ opacity: 0.35 }} />
              <polyline points="61,10 56,6 64,2" stroke="white" strokeWidth="0.4" fill="none" style={{ opacity: 0.5 }} />
              <polyline points="49,0 43,4 38,0" stroke="white" strokeWidth="0.4" fill="none" style={{ opacity: 0.4 }} />
            </svg>
          </motion.div>
          {([
            { x: 46, y: 52, dx: -20, dy: 58, rot: -50, w: 9,  h: 7,  clip: '0% 0%,100% 20%,80% 100%', delay: 0.06 },
            { x: 60, y: 46, dx:  25, dy: 72, rot:  65, w: 11, h: 8,  clip: '50% 0%,100% 90%,0% 100%', delay: 0.10 },
            { x: 50, y: 36, dx:  -6, dy: 88, rot: -28, w: 7,  h: 5,  clip: '20% 0%,100% 40%,0% 100%', delay: 0.05 },
            { x: 60, y: 57, dx:  32, dy: 56, rot:  82, w: 8,  h: 6,  clip: '0% 10%,100% 0%,90% 100%', delay: 0.14 },
            { x: 42, y: 62, dx: -28, dy: 50, rot: -72, w: 10, h: 7,  clip: '50% 0%,100% 80%,10% 100%', delay: 0.09 },
            { x: 66, y: 60, dx:  20, dy: 78, rot:  48, w: 7,  h: 6,  clip: '0% 0%,100% 30%,70% 100%', delay: 0.17 },
            { x: 48, y: 40, dx: -38, dy: 66, rot: -58, w: 6,  h: 5,  clip: '30% 0%,100% 60%,0% 100%', delay: 0.08 },
            { x: 62, y: 65, dx:  14, dy: 90, rot:  38, w: 9,  h: 7,  clip: '10% 0%,100% 20%,60% 100%', delay: 0.13 },
          ] as const).map((s, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none z-20"
              style={{
                left: s.x, top: s.y, width: s.w, height: s.h,
                clipPath: `polygon(${s.clip})`,
                background: `linear-gradient(135deg, #ffffffcc 0%, ${g1}cc 55%, ${g2}66 100%)`,
                boxShadow: `0 0 ${s.w + 2}px ${g1}88`,
              }}
              initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 1 }}
              animate={{ opacity: [0, 1, 0.8, 0], x: s.dx, y: s.dy, rotate: s.rot, scale: 0.2 }}
              transition={{ duration: 0.88, delay: s.delay, ease: 'easeIn',
                opacity: { duration: 0.88, delay: s.delay, times: [0, 0.08, 0.5, 1] } }}
            />
          ))}
        </>
      )}

      {/* Vortex layers */}
      <div
        className="absolute lum-portal-ring-cw"
        style={{ inset: -16, background: conicActive, filter: 'blur(16px)', opacity: 0.45 }}
      />
      <div
        className="absolute lum-portal-ring-ccw"
        style={{ inset: 18, borderRadius: '50%', background: conicAll, filter: 'blur(10px)', opacity: 0.3 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 62% 62% at 50% 44%, #030308 0%, #030308 32%, transparent 68%)' }}
      />
      <div
        className="absolute inset-0 lum-portal-aura-pulse"
        style={{ background: `radial-gradient(ellipse 75% 65% at 50% 44%, transparent 28%, ${g1}1a 62%, ${g2}14 80%, transparent 90%)` }}
      />
      <div
        className="absolute lum-portal-mote-center"
        style={{
          left: '50%', top: '42%', width: 5, height: 5, borderRadius: '50%',
          background: `radial-gradient(circle, #fff 0%, ${g1} 60%, transparent 100%)`,
          filter: 'blur(0.5px)',
        }}
      />
      {particlePositions.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full lum-portal-drift"
          style={{
            left: p.left, top: p.top,
            width: particleColors[i].size, height: particleColors[i].size,
            background: particleColors[i].color,
            boxShadow: `0 0 ${particleColors[i].size + 2}px ${particleColors[i].color}`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay + (fresh ? 0.46 : 0)}s`,
          }}
        />
      ))}

      {/* Affinity-switch burst */}
      {affinityFlashColor && (
        <>
          <motion.div
            key={`cardflash-${affinityFlashKey}`}
            className="absolute inset-0 pointer-events-none z-30 rounded-xl"
            style={{
              background: `radial-gradient(circle at 50% 42%, ${affinityFlashColor}88 0%, ${affinityFlashColor}33 45%, transparent 75%)`,
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.div
            key={`cardring1-${affinityFlashKey}`}
            className="absolute rounded-full pointer-events-none z-30"
            style={{
              width: 20, height: 20,
              left: '50%', top: '42%',
              marginLeft: -10, marginTop: -10,
              border: `2px solid ${affinityFlashColor}`,
              boxShadow: `0 0 8px ${affinityFlashColor}, 0 0 18px ${affinityFlashColor}88`,
            }}
            initial={{ scale: 1, opacity: 0.9 }}
            animate={{ scale: 7, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
          <motion.div
            key={`cardring2-${affinityFlashKey}`}
            className="absolute rounded-full pointer-events-none z-30"
            style={{
              width: 16, height: 16,
              left: '50%', top: '42%',
              marginLeft: -8, marginTop: -8,
              border: `1.5px solid ${affinityFlashColor}aa`,
            }}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 5.5, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
          />
        </>
      )}

      {/* ── UI Overlay ── */}
      {/* Active affinity gem — upper right, always visible */}
      {activeKey && (
        <div
          className="absolute top-2 right-2 z-10 pointer-events-none"
          style={{ filter: `drop-shadow(0 0 5px ${g2}cc)` }}
        >
          <MiniGem color={activeKey} size={16} />
        </div>
      )}

      {/* AI badge — shown for medium/hard AI players only */}
      {isAIPortal && activeKey && (
        <div className="absolute z-20 pointer-events-none" style={{ top: '22%', right: 6 }}>
          {affinityFlashColor && (
            <>
              <motion.div
                key={`ring1-${affinityFlashKey}`}
                className="absolute rounded-full"
                style={{
                  inset: -2,
                  border: `2px solid ${affinityFlashColor}`,
                  boxShadow: `0 0 8px ${affinityFlashColor}, 0 0 16px ${affinityFlashColor}88`,
                }}
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 2.8, opacity: 0 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
              />
              <motion.div
                key={`ring2-${affinityFlashKey}`}
                className="absolute rounded-full"
                style={{
                  inset: -1,
                  border: `1.5px solid ${affinityFlashColor}cc`,
                }}
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 2.1, opacity: 0 }}
                transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
              />
              <motion.div
                key={`flash-${affinityFlashKey}`}
                className="absolute inset-0 rounded-full"
                style={{ background: `radial-gradient(circle, ${affinityFlashColor}cc 0%, transparent 70%)` }}
                initial={{ opacity: 0.8, scale: 0.9 }}
                animate={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            </>
          )}
          <div className="lum-portal-badge-pulse">
            <div
              className="flex items-center gap-0.5 rounded-full px-1 py-0.5"
              style={{
                background: `linear-gradient(135deg, rgba(3,3,8,0.88) 0%, ${g1}28 100%)`,
                border: `1px solid ${g1}55`,
                boxShadow: `0 0 6px ${g1}44`,
              }}
            >
              <span className="text-[6px] font-bold tracking-wider uppercase" style={{ color: `${g1}cc` }}>
                AI
              </span>
              <MiniGem color={activeKey} size={7} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom: alliance bar — minimal, at the very bottom */}
      {claimedByPlayer && ownerName && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-2 py-1 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(3,3,8,0.85) 0%, rgba(3,3,8,0.35) 60%, transparent 100%)' }}
        >
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-medium tracking-wide text-white/50 shrink-0">Allied with</span>
            <PlayerAvatar avatarId={claimedByPlayer.avatarId ?? null} name={ownerName} size={12} />
            <span className="text-[8px] font-semibold leading-none text-white truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{ownerName}</span>
          </div>
        </div>
      )}

      {/* Bloom burn count — only for lum_bloom */}
      {luminary.id === 'lum_bloom' && typeof burnCount === 'number' && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{ bottom: claimedByPlayer ? 26 : 6, right: 6 }}
        >
          <div
            className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 select-none"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(239,68,68,0.18) 100%)',
              border: '1px solid rgba(34,197,94,0.45)',
              boxShadow: '0 0 6px rgba(34,197,94,0.25), 0 1px 3px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <span className="text-[9px] leading-none">🔥</span>
            <span
              className="text-[9px] font-bold tabular-nums leading-none"
              style={{ color: '#86efac', textShadow: '0 0 6px rgba(34,197,94,0.7)' }}
            >
              {burnCount}
            </span>
          </div>
        </div>
      )}

      {/* Armed sigil */}
      <ArmedSigil isVisible={isArmed} color={g1} />
    </Tag>
  );
});

export const LuminaryCard = React.memo(function LuminaryCard({
  luminary, claimedByNames = [], isReleased = false,
  luminaryAffinity, claimedByPlayer, isLive, canToggle, onToggle,
  playerBonuses, isMyTurn, onOpenSheet, isArmed = false,
  isFlashing = false, burnCount,
  costMode, heldCrystals,
}: {
  luminary: Luminary;
  claimedByNames?: string[];
  isReleased?: boolean;
  luminaryAffinity?: LuminaryActiveState | null;
  claimedByPlayer?: GamePlayerState | null;
  isOwnedByMe?: boolean;
  isLive?: boolean;
  canToggle?: boolean;
  onToggle?: (affinity: string) => void;
  playerBonuses?: Partial<CrystalCounts>;
  isMyTurn?: boolean;
  onOpenSheet?: () => void;
  isArmed?: boolean;
  isFlashing?: boolean;
  burnCount?: number;
  costMode?: 'printed' | 'after_bonuses' | 'needed_now';
  heldCrystals?: Partial<CrystalCounts>;
}) {
  const isClaimed = claimedByNames.length > 0;
  const initialClaimedRef = useRef(isClaimed);
  const portalIsNew = !initialClaimedRef.current;

  const glowKey = ((luminaryAffinity?.activeAffinity as GemKey | undefined)
    ?? (GEM_KEYS.find(k => k !== 'flux' && (luminary.requirements[k as GemKey] ?? 0) > 0) as GemKey | undefined)
    ?? 'flux') as GemKey;
  const glowHex = GEM_META[glowKey].glowHex;

  const isHidden = isReleased && !isClaimed;
  const hoverAnim = (isHidden || !onOpenSheet)
    ? {}
    : { scale: 1.02, boxShadow: `0 0 18px 4px ${glowHex}55, 0 0 6px 1px ${glowHex}33` };

  // Compute display costs based on costMode
  const mode = costMode ?? 'printed';
  const costAfterBonuses = useMemo(() => {
    const out: Partial<Record<GemKey, number>> = {};
    for (const k of GEM_KEYS) {
      if (k === 'flux') continue;
      const req = luminary.requirements[k as keyof CrystalCounts] ?? 0;
      if (req <= 0) continue;
      const bonus = playerBonuses?.[k as keyof CrystalCounts] ?? 0;
      out[k] = Math.max(0, req - bonus);
    }
    return out;
  }, [luminary.requirements, playerBonuses]);

  const neededCost = useMemo(() => {
    if (mode !== 'needed_now') return undefined;
    const out: Partial<Record<GemKey, number>> = {};
    for (const k of GEM_KEYS) {
      if (k === 'flux') continue;
      const after = costAfterBonuses[k as GemKey] ?? 0;
      if (after <= 0) continue;
      const have = heldCrystals?.[k as keyof CrystalCounts] ?? 0;
      const need = Math.max(0, after - have);
      if (need > 0) out[k as GemKey] = need;
    }
    // Always return an object (even empty) so the display layer knows
    // we are in needed_now mode and can render ✓ for covered costs.
    return out;
  }, [costAfterBonuses, heldCrystals, mode]);

  const displayCost = mode === 'printed' ? undefined : (mode === 'after_bonuses' ? costAfterBonuses : neededCost);

  const canAffordLuminary = !isClaimed && isMyTurn === true && (
    CRYSTALS.every(c => {
      const printed = luminary.requirements[c as keyof CrystalCounts] ?? 0;
      if (printed <= 0) return true;
      return (playerBonuses?.[c as keyof CrystalCounts] ?? 0) >= printed;
    })
  );

  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isFlashing && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [isFlashing]);

  const handleIdleClick = () => {
    onOpenSheet?.();
  };

  return (
    <motion.div
      ref={cardRef}
      whileHover={hoverAnim}
      whileTap={!isHidden ? { scale: 0.97 } : {}}
      data-luminary-id={luminary.id}
      animate={canAffordLuminary ? {
        boxShadow: [
          `0 0 0 1.5px ${glowHex}99, 0 0 10px 3px ${glowHex}44`,
          `0 0 0 2.5px ${glowHex}ff, 0 0 22px 8px ${glowHex}77`,
          `0 0 0 1.5px ${glowHex}99, 0 0 10px 3px ${glowHex}44`,
        ],
      } : undefined}
      transition={canAffordLuminary ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
      className={`relative w-[var(--card-w)] h-[var(--card-h)] rounded-xl overflow-hidden shadow-xl bg-black shrink-0 ${
        isClaimed ? 'ring-1 ring-white/10' : canAffordLuminary ? 'ring-0' : 'ring-1 ring-black/30'
      }`}
      title={isClaimed
        ? `Released${claimedByPlayer ? ` — claimed by ${claimedByPlayer.playerName}` : ''}`
        : (luminary.flavor || luminary.name)}
      style={isHidden ? { opacity: 0, pointerEvents: 'none' } : undefined}
      onClick={!isHidden && !isClaimed ? handleIdleClick : undefined}
    >
      {isClaimed ? (
        <LuminaryClaimedPortal
          luminary={luminary}
          claimedByPlayer={claimedByPlayer}
          luminaryAffinity={luminaryAffinity}
          isLive={isLive}
          canToggle={canToggle}
          onToggle={onToggle}
          isNew={portalIsNew}
          isArmed={isArmed}
          onOpenSheet={onOpenSheet}
          burnCount={burnCount}
        />
      ) : (
        <>
          <div className="absolute inset-0 pointer-events-none">
            <LuminaryPanelArt luminaryId={luminary.id} width={BOARD_CARD_W} height={BOARD_CARD_H} claimed={false} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 pointer-events-none" />
          <div className="relative z-10 h-full p-2 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className={`bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-sm font-serif font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,1)] flex items-center gap-0.5 ${luminary.oblivion ? 'text-red-300' : 'text-amber-100'}`}>
                {luminary.oblivion ? `-${luminary.oblivion}` : luminary.lumens}<EminenceDiamond size={9} />
              </span>
              <AnimatePresence>
                {canAffordLuminary && (
                  <motion.div
                    key="can-afford-badge"
                    className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/20"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <span className="text-[9px] font-bold text-white/90">Claim</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1 justify-center">
                {GEM_KEYS.filter(k => k !== 'flux' && (luminary.requirements[k as GemKey] ?? 0) > 0).map(k => {
                  const base = luminary.requirements[k as GemKey] ?? 0;
                  const eff = displayCost !== undefined ? (displayCost[k as GemKey] ?? 0) : base;
                  const isReduced = displayCost !== undefined && eff < base;
                  const isCovered = displayCost !== undefined && eff === 0;
                  return (
                    <div key={k} className={`flex items-center gap-0.5 rounded px-1 py-0.5 ${isCovered ? 'bg-green-900/60' : isReduced ? 'bg-blue-900/50' : 'bg-black/50'}`}>
                      <MiniGem color={k as GemKey} size={10} />
                      <span className={`text-[10px] font-bold ${isCovered ? 'text-green-300' : isReduced ? 'text-blue-200' : 'text-white/80'}`}>
                        {isCovered ? '✓' : eff}
                      </span>
                    </div>
                  );
                })}
              </div>
              <span className="text-center text-[10px] font-medium text-white/50 leading-tight px-1">
                {luminary.name}
              </span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
});
