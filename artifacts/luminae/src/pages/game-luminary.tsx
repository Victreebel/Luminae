import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Luminary, GamePlayerState, LuminaryActiveState, CrystalCounts } from '@workspace/api-client-react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { LuminaryPanelArt } from '@/lib/luminaryAssets';
import { CRYSTALS } from './game-constants';
import { MiniGem } from './game-card';
import { PlayerAvatar } from './game-player';

// ── LuminaryClaimedPortal ─────────────────────────────────────────────────────
// Replaces the Luminary panel card after it has been claimed by any player.
// Fits the same 112×160 footprint.
//
// isLive=true   → bonus is currently active (turnCount > summonedAtTurnCount)
// isNew=true    → 900ms entrance: collapses from center, spiral burst, spring-settle.
// canToggle=true → entire card is a button cycling eligible affinities.
//
// Vortex design: outer ring uses conicActive (active ~55%, others ~45%).
// Inner counter-swirl uses conicAll (all colours equal) so every requirement
// colour remains visibly present. 4 of 7 motes are the active colour;
// remaining 3 cycle through the other requirement colours.
export function LuminaryClaimedPortal({
  luminary, claimedByPlayer, luminaryAffinity,
  isOwnedByMe, isLive: _isLive, canToggle, onToggle, isNew = false,
}: {
  luminary: Luminary;
  claimedByPlayer?: GamePlayerState | null;
  luminaryAffinity?: LuminaryActiveState | null;
  isOwnedByMe?: boolean;
  isLive?: boolean;
  canToggle?: boolean;
  onToggle?: (affinity: string) => void;
  isNew?: boolean;
}) {
  const fresh = useRef(isNew).current;

  const activeKey = (luminaryAffinity?.activeAffinity ?? null) as GemKey | null;
  const eligibleKeys = (luminaryAffinity?.eligibleAffinities ?? []) as GemKey[];

  // Detect affinity switches on AI-owned portals and trigger a flash animation
  const isAIPortal = claimedByPlayer?.aiDifficulty === 'medium' || claimedByPlayer?.aiDifficulty === 'hard';
  const prevActiveKeyRef = useRef<GemKey | null>(activeKey);
  const [affinityFlashKey, setAffinityFlashKey] = useState<number>(0);
  const [affinityFlashColor, setAffinityFlashColor] = useState<string | null>(null);

  useEffect(() => {
    if (isAIPortal && prevActiveKeyRef.current !== null && prevActiveKeyRef.current !== activeKey && activeKey) {
      const newColor = GEM_META[activeKey].hex;
      setAffinityFlashColor(newColor);
      setAffinityFlashKey(k => k + 1);
      // Sound is intentionally omitted here — the action-log useEffect is the
      // single canonical trigger for playAffinitySwitch().  This prevents
      // double-firing (portal + log) and ensures human-player toggles stay silent.
    }
    prevActiveKeyRef.current = activeKey;
  }, [activeKey, isAIPortal]);
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

  // Active affinity drives dominant colour; fallback to first requirement colour
  const g1 = activeAffinityMeta?.hex ?? hexes[0];
  const g2 = activeAffinityMeta?.glowHex ?? hexes[0];

  // conicAll: equal distribution of ALL requirement colours.
  // Used for inner swirl + burst so every requirement colour stays visible.
  const conicAll = useMemo(() => {
    if (hexes.length <= 1) return `conic-gradient(${hexes[0]}, ${hexes[0]}88, ${hexes[0]})`;
    const deg = 360 / hexes.length;
    return `conic-gradient(from 0deg, ${hexes.flatMap((h, i) => [`${h} ${i * deg}deg`, `${h} ${(i + 1) * deg}deg`]).join(', ')})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexes.join(',')]);

  // conicActive: active affinity ~55% (200°), others share ~45%.
  // Used for outer rotating ring — dominant but non-exclusive.
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

  // Particle positions — stable per luminary (seeded by id)
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

  // Particle colours — 4/7 bias toward active affinity, 3/7 secondary req colours
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

  const handleToggle = () => {
    if (!canToggle || !onToggle || eligibleKeys.length < 2 || !activeKey) return;
    const idx = eligibleKeys.indexOf(activeKey);
    const next = eligibleKeys[(idx + 1) % eligibleKeys.length];
    onToggle(next);
  };

  const ownerName = claimedByPlayer?.playerName ?? '';

  const Tag = (canToggle ? motion.button : motion.div) as typeof motion.div;

  return (
    <Tag
      className="absolute inset-0 bg-[#030308]"
      style={{ transformOrigin: '50% 42%', cursor: canToggle ? 'pointer' : 'default' }}
      initial={fresh ? { scale: 0.04, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={fresh ? { duration: 0.88, ease: [0.16, 1, 0.3, 1] } : {}}
      onClick={canToggle ? handleToggle : undefined}
      {...(canToggle ? { type: 'button', whileTap: { scale: 0.97 } } : {})}
    >
      {/* ── Opening spiral burst ── */}
      {fresh && (
        <>
          {/* Conic vortex bloom — conicAll so all req colours appear in burst */}
          <motion.div
            className="absolute pointer-events-none"
            style={{ inset: -24, background: conicAll, filter: 'blur(22px)' }}
            initial={{ opacity: 0, rotate: 0, scale: 0.1 }}
            animate={{ opacity: [0, 0.72, 0], rotate: 540, scale: [0.1, 1.5, 1.0] }}
            transition={{ duration: 0.96, ease: [0.16, 0.8, 0.3, 1] }}
          />

          {/* Reality crack lines */}
          <motion.div
            className="absolute inset-0 pointer-events-none z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.82, times: [0, 0.04, 0.38, 1], ease: 'easeOut' }}
          >
            <svg width="112" height="160" viewBox="0 0 112 160" className="w-full h-full overflow-visible">
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

          {/* Falling glass shards */}
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

      {/* Outer rotating ring — conicActive: active ~55%, others visible at ~45% */}
      <motion.div
        className="absolute"
        style={{ inset: -16, background: conicActive, filter: 'blur(16px)', opacity: 0.45 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
      {/* Inner counter-rotating swirl — conicAll: all req colours equal weight */}
      <motion.div
        className="absolute"
        style={{ inset: 18, borderRadius: '50%', background: conicAll, filter: 'blur(10px)', opacity: 0.3 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      />
      {/* Deep void centre */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 62% 62% at 50% 44%, #030308 0%, #030308 32%, transparent 68%)' }}
      />
      {/* Pulsing depth aura — active affinity colour */}
      <motion.div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 75% 65% at 50% 44%, transparent 28%, ${g1}1a 62%, ${g2}14 80%, transparent 90%)` }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.07, 1] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Centre singularity mote */}
      <motion.div
        className="absolute"
        style={{
          left: '50%', top: '42%', width: 5, height: 5, borderRadius: '50%',
          background: `radial-gradient(circle, #fff 0%, ${g1} 60%, transparent 100%)`,
          transform: 'translate(-50%, -50%)', filter: 'blur(0.5px)',
        }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.7, 1.5, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Drifting motes — 4/7 active colour, 3/7 secondary requirement colours */}
      {particlePositions.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.left, top: p.top,
            width: particleColors[i].size, height: particleColors[i].size,
            background: particleColors[i].color,
            boxShadow: `0 0 ${particleColors[i].size + 2}px ${particleColors[i].color}`,
          }}
          animate={{ y: [-5, 5, -5], opacity: [0.2, 0.85, 0.2] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: 'easeInOut', delay: p.delay + (fresh ? 0.46 : 0) }}
        />
      ))}

      {/* ── UI Overlay ── */}
      {/* Top row: eminence value (left) + floating active affinity gem (right) */}
      <div className="absolute top-2 left-0 right-0 z-10 pointer-events-none flex justify-between items-start px-2">
        <span className="text-lg font-serif font-black leading-none select-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
          {luminary.oblivion ? `-${luminary.oblivion}` : luminary.lumens}
        </span>
        {activeKey && (
          <motion.div
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: `drop-shadow(0 0 5px ${g2}cc)` }}
            title={activeAffinityMeta ? `${isOwnedByMe ? 'Active affinity' : 'Opponent boosting'}: ${activeAffinityMeta.name}` : undefined}
          >
            <MiniGem color={activeKey} size={16} />
          </motion.div>
        )}
      </div>

      {/* AI affinity indicator — shown for medium/hard AI players only */}
      {isAIPortal && activeKey && (
        <div className="absolute z-20 pointer-events-none" style={{ top: '22%', right: 6 }}>
          {/* Affinity-switch burst rings — key increment remounts so animation replays on every toggle */}
          {affinityFlashColor && (
            <>
              {/* Expanding ring 1 */}
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
              {/* Expanding ring 2 — slightly delayed */}
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
              {/* Centre flash */}
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
          {/* Badge pill */}
          <motion.div
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
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
          </motion.div>
        </div>
      )}

      {/* Bottom: full-width alliance bar — gradient overlay, anterior to art */}
      {claimedByPlayer && ownerName && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-2 py-1.5 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(3,3,8,0.90) 0%, rgba(3,3,8,0.45) 65%, transparent 100%)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-medium tracking-wide text-white/60 shrink-0">Alliance with</span>
            <PlayerAvatar avatarId={claimedByPlayer.avatarId ?? null} name={ownerName} size={14} />
            <span className="text-[9px] font-semibold leading-none text-white truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{ownerName}</span>
          </div>
          {!isOwnedByMe && activeKey && activeAffinityMeta && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[7px] font-medium tracking-wide text-white/40 shrink-0 uppercase">Opponent boosting</span>
              <MiniGem color={activeKey} size={10} />
              <span className="text-[8px] font-semibold leading-none" style={{ color: g1, textShadow: `0 0 4px ${g1}88` }}>{activeAffinityMeta.name}</span>
            </div>
          )}
        </div>
      )}

    </Tag>
  );
}

export function LuminaryCard({
  luminary, claimedByNames = [], isReleased = false,
  luminaryAffinity, claimedByPlayer, isOwnedByMe, isLive, canToggle, onToggle,
  costMode, playerBonuses, isMyTurn, onOpenSheet,
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
  costMode?: 'printed' | 'after_bonuses' | 'needed_now';
  playerBonuses?: Partial<CrystalCounts>;
  isMyTurn?: boolean;
  onOpenSheet?: () => void;
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

  const canAffordLuminary = !isClaimed && isMyTurn === true && (
    CRYSTALS.every(c => {
      const printed = luminary.requirements[c as keyof CrystalCounts] ?? 0;
      if (printed <= 0) return true;
      return (playerBonuses?.[c as keyof CrystalCounts] ?? 0) >= printed;
    })
  );

  return (
    <motion.div
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
      onClick={!isClaimed && !isHidden && onOpenSheet ? onOpenSheet : undefined}
    >
      {isClaimed ? (
        <LuminaryClaimedPortal
          luminary={luminary}
          claimedByPlayer={claimedByPlayer}
          luminaryAffinity={luminaryAffinity}
          isOwnedByMe={isOwnedByMe}
          isLive={isLive}
          canToggle={canToggle}
          onToggle={onToggle}
          isNew={portalIsNew}
        />
      ) : (
        <>
          {/* Background art layer — procedural entity portrait fills the card */}
          <div className="absolute inset-0 pointer-events-none">
            <LuminaryPanelArt luminaryId={luminary.id} size={112} claimed={false} />
          </div>

          {/* Same dark gradient as artifact cards */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 pointer-events-none" />

          <div className="relative z-10 h-full p-2 flex flex-col justify-between">
            {/* Top row — lumens/oblivion (left) + can-afford badge (right), mirroring ArtifactCardView */}
            <div className="flex justify-between items-start">
              <span className={`bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-sm font-serif font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,1)] ${luminary.oblivion ? 'text-red-300' : 'text-amber-100'}`}>
                {luminary.oblivion ? `-${luminary.oblivion}` : luminary.lumens}
              </span>
              <AnimatePresence>
                {canAffordLuminary && (
                  <motion.div
                    key="can-afford-badge"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="flex items-center justify-center rounded-full bg-black/70 backdrop-blur-sm"
                    style={{
                      width: 18, height: 18,
                      border: `1.5px solid ${glowHex}`,
                      boxShadow: `0 0 6px 1px ${glowHex}88`,
                    }}
                    title="You meet all requirements — claim this Luminary!"
                  >
                    <span className="text-[10px] font-bold leading-none" style={{ color: glowHex }}>✓</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom — name + requirement gems */}
            <div className="space-y-1">
              <div className="text-[9px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] line-clamp-2">
                {luminary.name}
              </div>
              <div className="text-[6px] uppercase tracking-[0.15em] font-bold text-white/70 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                Artifacts Required:
              </div>
              {/* Affinity requirement chips — mini card shapes, gem image as texture */}
              <div className="flex flex-wrap gap-0.5 justify-end items-end">
                {CRYSTALS.map((c) => {
                  const printed = luminary.requirements[c as keyof CrystalCounts];
                  if (printed <= 0) return null;
                  const bonus = playerBonuses?.[c as keyof CrystalCounts] ?? 0;
                  const displayVal = costMode === 'needed_now'
                    ? Math.max(0, printed - bonus)
                    : printed;
                  const isMet = costMode === 'needed_now' && displayVal === 0;
                  const meta = GEM_META[c];
                  const tooltipBase = costMode === 'needed_now'
                    ? (isMet
                        ? `${meta.name} requirement met (${bonus}/${printed})`
                        : `${displayVal} more ${meta.name} bonus card${displayVal === 1 ? '' : 's'} needed (have ${bonus}/${printed})`)
                    : `${printed} ${meta.name} bonus card${printed === 1 ? '' : 's'} required`;
                  return (
                    <div
                      key={c}
                      className="relative shrink-0 overflow-hidden"
                      style={{
                        width: 20, height: 28, borderRadius: 3,
                        opacity: isMet ? 0.45 : 1,
                        boxShadow: isMet ? 'none' : `0 0 8px ${meta.glowHex}99, 0 2px 4px rgba(0,0,0,0.85)`,
                        border: `1px solid ${isMet ? 'rgba(255,255,255,0.2)' : `${meta.glowHex}88`}`,
                      }}
                      title={tooltipBase}
                    >
                      <img src={meta.image} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.68) 100%)' }} />
                      <div className="absolute pointer-events-none" style={{ inset: 1.5, border: `1px solid ${meta.glowHex}44`, borderRadius: 2 }} />
                      {isMet ? (
                        <span className="absolute bottom-[3px] inset-x-0 text-center text-[9px] font-bold text-white leading-none">✓</span>
                      ) : (
                        <span className="absolute bottom-[3px] inset-x-0 text-center text-[9px] font-bold text-white leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                          {displayVal}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
