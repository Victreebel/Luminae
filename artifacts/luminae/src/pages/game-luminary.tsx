import React, { useRef, useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Luminary, GamePlayerState, LuminaryActiveState, AffinityCounts } from '@workspace/api-client-react';
import { AFFINITY_META, AFFINITY_KEYS, type AffinityKey } from '@/lib/affinityMeta';
import { LuminaryClaimedEntityArt, LuminaryPanelArt } from '@/lib/luminaryAssets';
import { AFFINITIES } from './game-constants';
import { EminenceBadge, AffinityToken } from './game-card';
import { PlayerAvatar } from './game-player';

export function getLuminaryEminenceTitle(value: number) {
  if (value > 0) return `+${value} Eminence`;
  if (value < 0) return `${value} Eminence`;
  return '0 Eminence';
}

export function LuminaryClaimedPresence({
  luminaryId,
  activeColor,
  className = '',
  showNativePortal = true,
  style,
}: {
  luminaryId: string;
  activeColor?: string;
  className?: string;
  showNativePortal?: boolean;
  style?: React.CSSProperties;
}) {
  const presenceStyle = {
    ...(activeColor ? { '--lum-claimed-active': activeColor } : {}),
    ...style,
  } as React.CSSProperties;

  return (
    <div className={`lum-claimed-presence-layer ${className}`} style={presenceStyle} aria-hidden="true">
      {showNativePortal && <div className="lum-claimed-native-portal" />}
      <LuminaryClaimedEntityArt
        luminaryId={luminaryId}
        activeColor={activeColor}
        className="absolute inset-0 opacity-95 lum-claimed-entity-art--emergent"
        showAura={false}
      />
    </div>
  );
}

type ReleasedLuminaryLayout = {
  entityLeft: string;
  entityRight: string;
  entityTop: string;
  entityHeight: string;
};

const DEFAULT_RELEASED_LUMINARY_LAYOUT: ReleasedLuminaryLayout = {
  entityLeft: '-11%',
  entityRight: '-11%',
  entityTop: '-3%',
  entityHeight: '88%',
};

// Optical calibration for silhouettes that do not share the default upright
// portrait proportions. Keep released-state geometry in one place.
const RELEASED_LUMINARY_LAYOUTS: Record<string, Partial<ReleasedLuminaryLayout>> = {
  lum_ember: {
    entityLeft: '-13%',
    entityRight: '-13%',
    entityTop: '-4%',
    entityHeight: '90%',
  },
  lum_tide: {
    entityLeft: '-9%',
    entityRight: '-9%',
    entityTop: '-2%',
    entityHeight: '87%',
  },
  lum_void: {
    entityTop: '-1%',
    entityHeight: '84%',
  },
  lum_radiant: {
    entityLeft: '4%',
    entityRight: '4%',
    entityTop: '2%',
    entityHeight: '82%',
  },
  lum_astral: {
    entityLeft: '-18%',
    entityRight: '-18%',
    entityTop: '1%',
    entityHeight: '82%',
  },
  lum_moth: {
    entityLeft: '-18%',
    entityRight: '-18%',
    entityTop: '0%',
    entityHeight: '84%',
  },
  lum_compass: {
    entityLeft: '-12%',
    entityRight: '-12%',
    entityTop: '5%',
    entityHeight: '76%',
  },
  lum_seed: {
    entityLeft: '-20%',
    entityRight: '-20%',
    entityTop: '4%',
    entityHeight: '79%',
  },
  lum_orchard: {
    entityLeft: '-19%',
    entityRight: '-19%',
    entityTop: '4%',
    entityHeight: '80%',
  },
  lum_bloom: {
    entityLeft: '-9%',
    entityRight: '-9%',
    entityTop: '4%',
    entityHeight: '80%',
  },
};

// ── LuminaryClaimedPortal ─────────────────────────────────────────────────────
// Replaces the Luminary panel card after it has been claimed by any player.
// Fits the same 112×160 footprint.
//
// isLive=true   → bonus is currently active (turnCount > summonedAtTurnCount)
// isNew=true    → 900ms entrance: collapses from center, spiral burst, spring-settle.
//
// Claimed design: the rupture has settled into a low-cost post-summon seal.
// The active affinity colours the scar while the entity keeps a subtle living
// motion. Keep this separate from the summon cutscene path.
export function LuminaryClaimedPortal({
  luminary, claimedByPlayer, luminaryAffinity,
  isOwnedByMe, isLive: _isLive, onOpenSheet, isNew = false,
  showClaimedIdentity = true, showActiveAffinity = true,
  idleMotionActive = true,
}: {
  luminary: Luminary;
  claimedByPlayer?: GamePlayerState | null;
  luminaryAffinity?: LuminaryActiveState | null;
  isOwnedByMe?: boolean;
  isLive?: boolean;
  onOpenSheet?: () => void;
  isNew?: boolean;
  isArmed?: boolean;
  burnCount?: number;
  showClaimedIdentity?: boolean;
  showActiveAffinity?: boolean;
  idleMotionActive?: boolean;
}) {
  const fresh = useRef(isNew).current;
  const prefersReducedMotion = useReducedMotion();
  const [detailActive, setDetailActive] = useState(false);
  const motionAllowed = idleMotionActive && !prefersReducedMotion;

  useEffect(() => {
    if (!motionAllowed) setDetailActive(false);
  }, [motionAllowed]);

  const activeKey = (luminaryAffinity?.activeAffinity ?? null) as AffinityKey | null;

  const activeAffinityMeta = activeKey ? AFFINITY_META[activeKey] : null;

  // All requirement colours form the tear. The active Affinity receives extra
  // angular weight so it dominates without erasing the other requirements.
  const requirementColors = useMemo(
    () => AFFINITY_KEYS
      .filter(k => k !== 'singularity' && (luminary.requirements[k as AffinityKey] ?? 0) > 0)
      .map(k => ({
        key: k as AffinityKey,
        amount: luminary.requirements[k as AffinityKey] ?? 0,
        meta: AFFINITY_META[k as AffinityKey],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [luminary.id],
  );
  const portalColors = requirementColors.length > 0
    ? requirementColors
    : [{ key: 'singularity' as AffinityKey, amount: 1, meta: AFFINITY_META.singularity }];
  const hexes = portalColors.map(entry => entry.meta.hex);

  // Active affinity drives dominant colour; fallback to first requirement colour.
  const g1 = activeAffinityMeta?.hex ?? hexes[0];
  const g2 = activeAffinityMeta?.glowHex ?? hexes[0];

  const portalSpectrum = useMemo(() => {
    const weighted = portalColors.map(entry => ({
      ...entry,
      weight: Math.max(1, entry.amount) * (entry.key === activeKey ? 2.35 : 1),
    }));
    const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = 0;
    const stops = weighted.flatMap((entry) => {
      const start = cursor;
      cursor += (entry.weight / totalWeight) * 360;
      return [`${entry.meta.hex} ${start.toFixed(1)}deg`, `${entry.meta.hex} ${cursor.toFixed(1)}deg`];
    });
    return `conic-gradient(from -24deg, ${stops.join(', ')})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, luminary.id]);

  const isInteractive = !!onOpenSheet;
  const ownerName = claimedByPlayer?.playerName ?? '';
  const isCompass = luminary.id === 'lum_compass';
  const releasedLayout = {
    ...DEFAULT_RELEASED_LUMINARY_LAYOUT,
    ...RELEASED_LUMINARY_LAYOUTS[luminary.id],
  };
  const hoverSeed = Array.from(luminary.id).reduce(
    (sum, character, index) => sum + character.charCodeAt(0) * (index + 1),
    0,
  );
  const hoverDuration = 4.6 + (hoverSeed % 13) * 0.16;

  return (
    <motion.button
      type="button"
      data-testid="summoned-luminary-card"
      data-luminary-id={luminary.id}
      data-idle-motion-active={motionAllowed ? 'true' : 'false'}
      className={`absolute inset-0 bg-[#030308] rounded-xl lum-portal-seal lum-portal-seal--freed ${isCompass ? 'lum-portal-seal--compass' : ''} ${fresh ? 'lum-portal-seal--fresh' : ''} ${motionAllowed ? '' : 'lum-portal-seal--idle-paused'} ${detailActive ? 'lum-portal-seal--detail-active' : ''}`}
      style={{
        transformOrigin: '50% 42%',
        cursor: isInteractive ? 'pointer' : 'default',
        '--lum-portal-life': g1,
        '--lum-portal-life-rim': `${g1}88`,
        '--lum-portal-life-soft': `${g1}30`,
        '--lum-portal-life-faint': `${g1}18`,
        '--lum-portal-life-glow': `${g2}99`,
        '--lum-portal-spectrum': portalSpectrum,
        '--lum-portal-active': g1,
        '--lum-portal-active-glow': g2,
        '--lum-claimed-active': g1,
        '--lum-claimed-primary': g1,
        '--lum-claimed-glow': g2,
        '--luminary-freed-left': releasedLayout.entityLeft,
        '--luminary-freed-right': releasedLayout.entityRight,
        '--luminary-freed-top': releasedLayout.entityTop,
        '--luminary-freed-height': releasedLayout.entityHeight,
      } as React.CSSProperties}
      initial={fresh ? { scale: 0.04, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={fresh ? { duration: 0.88, ease: [0.16, 1, 0.3, 1] } : {}}
      onClick={onOpenSheet}
      onPointerEnter={() => setDetailActive(true)}
      onPointerLeave={() => setDetailActive(false)}
      onFocus={() => setDetailActive(true)}
      onBlur={() => setDetailActive(false)}
      whileTap={isInteractive ? { scale: 0.97 } : {}}
      aria-label={`Released Luminary: ${luminary.name}${ownerName ? `, allied with ${ownerName}` : ''}`}
    >
      {/* ── Opening spiral burst ── */}
      {fresh && (
        <>
          {/* Soft portal bloom — the arrival cutscene owns the rupture. */}
          <motion.div
            className="absolute pointer-events-none"
            style={{
              inset: -18,
              background: `
                radial-gradient(ellipse 56% 42% at 50% 44%, rgba(255,255,255,0.22) 0%, ${g1}66 22%, transparent 64%),
                ${portalSpectrum}
              `,
            }}
            initial={{ opacity: 0, rotate: 0, scale: 0.48 }}
            animate={{ opacity: [0, 0.62, 0], rotate: 120, scale: [0.48, 1.08, 1.18] }}
            transition={{ duration: 0.84, ease: [0.16, 0.8, 0.3, 1] }}
          />
        </>
      )}

      {/* Broken remnants of the original containment mold. */}
      <div className="luminary-claimed-residual-frame pointer-events-none" aria-hidden="true" />

      {/* Keep the post-arrival backdrop continuous with the summoned reveal. */}
      <div
        className="lum-claimed-native-portal luminary-claimed-summoned-backdrop pointer-events-none"
        aria-hidden="true"
      />

      {/* Alliance and active affinity are embedded in the abandoned mount. */}
      <div className="luminary-claimed-mount pointer-events-none">
        <div className="luminary-claimed-mount-rail" />
        {showClaimedIdentity && claimedByPlayer && ownerName && (
          <div
            className="luminary-corner-orb luminary-claimed-panel-token luminary-claimed-panel-token--ally"
            title={`Alliance with ${ownerName}`}
            aria-hidden="true"
          >
            <PlayerAvatar avatarId={claimedByPlayer.avatarId ?? null} name={ownerName} size={17} />
          </div>
        )}
        {showActiveAffinity && activeKey && (
          <div
            className="luminary-corner-orb lum-portal-seal-affinity luminary-claimed-panel-token luminary-claimed-panel-token--affinity"
            style={{ '--lum-portal-affinity-glow': `${g2}aa` } as React.CSSProperties}
            title={activeAffinityMeta ? (isOwnedByMe ? `Active affinity: ${activeAffinityMeta.name}` : undefined) : undefined}
          >
            <AffinityToken color={activeKey} size={17} />
          </div>
        )}
      </div>

      {/* The liberated Luminary owns the absolute foreground. */}
      <div
        className={`luminary-claimed-free-entity ${isCompass ? 'luminary-claimed-free-entity--compass' : ''}`}
        style={{
          '--luminary-freed-hover-duration': `${hoverDuration}s`,
          '--luminary-freed-hover-delay': `${-(hoverSeed % 7) * 0.38}s`,
        } as React.CSSProperties}
        aria-hidden="true"
      >
        <LuminaryClaimedEntityArt
          luminaryId={luminary.id}
          activeColor={g1}
          className="absolute inset-0 opacity-95 luminary-claimed-contained-art"
          showAura={false}
          presentation="freed"
          animate={false}
          idleMotionActive={motionAllowed}
          detailMotionActive={motionAllowed && detailActive}
        />
      </div>

    </motion.button>
  );
}

export function LuminaryCard({
  luminary, claimedByNames = [], isReleased = false,
  luminaryAffinity, claimedByPlayer, isOwnedByMe, isLive,
  costMode, playerBonuses, isMyTurn, onOpenSheet,
  isArmed = false, isFlashing = false, burnCount, showClaimedPresence = true,
  showClaimedIdentity = true, showActiveAffinity = true, showClaimedSummary = false,
  idleMotionActive = true,
}: {
  luminary: Luminary;
  claimedByNames?: string[];
  isReleased?: boolean;
  luminaryAffinity?: LuminaryActiveState | null;
  claimedByPlayer?: GamePlayerState | null;
  isOwnedByMe?: boolean;
  isLive?: boolean;
  costMode?: 'printed' | 'after_bonuses' | 'needed_now';
  playerBonuses?: Partial<AffinityCounts>;
  isMyTurn?: boolean;
  onOpenSheet?: () => void;
  isArmed?: boolean;
  isFlashing?: boolean;
  burnCount?: number;
  showClaimedPresence?: boolean;
  showClaimedIdentity?: boolean;
  showActiveAffinity?: boolean;
  showClaimedSummary?: boolean;
  idleMotionActive?: boolean;
}) {
  const isClaimed = claimedByNames.length > 0;
  const isCompass = luminary.id === 'lum_compass';
  const initialClaimedRef = useRef(isClaimed);
  const portalIsNew = !initialClaimedRef.current;

  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isFlashing && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [isFlashing]);

  const glowKey = ((luminaryAffinity?.activeAffinity as AffinityKey | undefined)
    ?? (AFFINITY_KEYS.find(k => k !== 'singularity' && (luminary.requirements[k as AffinityKey] ?? 0) > 0) as AffinityKey | undefined)
    ?? 'singularity') as AffinityKey;
  const glowColor = AFFINITY_META[glowKey].hex;
  const glowHex = AFFINITY_META[glowKey].glowHex;

  const isHidden = isReleased && !isClaimed;
  const hoverAnim = (isHidden || !onOpenSheet)
    ? {}
    : isClaimed
      ? {}
      : { scale: 1.02, boxShadow: `0 0 18px 4px ${glowHex}55, 0 0 6px 1px ${glowHex}33` };

  const canAffordLuminary = !isClaimed && isMyTurn === true && (
    AFFINITIES.every(c => {
      const printed = luminary.requirements[c as keyof AffinityCounts] ?? 0;
      if (printed <= 0) return true;
      return (playerBonuses?.[c as keyof AffinityCounts] ?? 0) >= printed;
    })
  );
  const eminenceValue = luminary.eminence ?? 0;

  return (
    <motion.div
      ref={cardRef}
      data-testid="terminus-luminary-card"
      whileHover={hoverAnim}
      whileTap={!isHidden ? { scale: 0.97 } : {}}
      data-luminary-id={luminary.id}
      className={`luminary-card ${isClaimed ? 'luminary-card--claimed' : 'luminary-card--dormant'} relative w-[var(--card-w)] h-[var(--card-h)] rounded-xl ${isClaimed ? 'overflow-visible isolate' : 'overflow-hidden'} shadow-xl bg-black shrink-0 ${isClaimed && isCompass ? 'luminary-card--compass-claimed' : ''} ${
        isClaimed ? 'ring-1 ring-white/10' : canAffordLuminary ? 'ring-0 lum-card-afford-tremor' : 'ring-1 ring-black/30'
      }`}
      title={isClaimed
        ? `Released${claimedByPlayer ? ` — claimed by ${claimedByPlayer.playerName}` : ''}`
        : (luminary.flavor || luminary.name)}
      style={{
        ...(isHidden ? { opacity: 0, pointerEvents: 'none' as const } : {}),
        ...(canAffordLuminary ? {
          '--lum-afford-dim':    `0 0 0 1.5px ${glowHex}99, 0 0 10px 3px ${glowHex}44`,
          '--lum-afford-bright': `0 0 0 2.5px ${glowHex}ff, 0 0 22px 8px ${glowHex}77`,
        } as React.CSSProperties : {}),
      }}
      onClick={!isClaimed && !isHidden && onOpenSheet ? onOpenSheet : undefined}
    >
      {isClaimed ? (
        <>
          <div className="luminary-claimed-panel luminary-claimed-panel--freed relative z-10 h-full w-full rounded-xl bg-black">
            <LuminaryClaimedPortal
              luminary={luminary}
              claimedByPlayer={claimedByPlayer}
              luminaryAffinity={luminaryAffinity}
              isOwnedByMe={isOwnedByMe}
              isLive={isLive}
              onOpenSheet={onOpenSheet}
              isNew={portalIsNew}
              isArmed={isArmed}
              burnCount={burnCount}
              showClaimedIdentity={showClaimedSummary ? false : showClaimedIdentity}
              showActiveAffinity={showActiveAffinity}
              idleMotionActive={idleMotionActive}
            />
            {showClaimedSummary && (
              <div className="luminary-claimed-panel-status absolute inset-0 z-30 flex flex-col justify-between p-1.5 pointer-events-none">
                <div className="flex items-start justify-between">
                  {eminenceValue > 0 ? (
                    <EminenceBadge
                      value={eminenceValue}
                      compact
                      title={getLuminaryEminenceTitle(eminenceValue)}
                    />
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </div>
                <div className={`luminary-claimed-summary ${showClaimedIdentity && claimedByPlayer ? 'luminary-claimed-summary--with-owner' : ''}`}>
                  <div className="luminary-claimed-name">{luminary.name}</div>
                  <div
                    className="luminary-claimed-owner"
                    title={claimedByPlayer ? `Allied with ${claimedByPlayer.playerName}` : 'Manifested'}
                  >
                    {claimedByPlayer && showClaimedIdentity && (
                      <PlayerAvatar
                        avatarId={claimedByPlayer.avatarId ?? null}
                        name={claimedByPlayer.playerName}
                        size={14}
                      />
                    )}
                    <span>{claimedByPlayer ? claimedByPlayer.playerName : 'Manifested'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {showClaimedPresence && (
            <LuminaryClaimedPresence
              luminaryId={luminary.id}
              activeColor={glowColor}
              showNativePortal={false}
            />
          )}
        </>
      ) : (
        <>
          {/* Background art layer — procedural entity portrait fills the card */}
          <div className="luminary-card-art absolute inset-0 pointer-events-none">
            <LuminaryPanelArt luminaryId={luminary.id} width="100%" height="100%" claimed={false} runtime />
          </div>

          {/* Same dark gradient as artifact cards */}
          <div className="luminary-card-veil absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 pointer-events-none" />

          <div className="luminary-card-content relative z-10 h-full p-2 flex flex-col justify-between">
            {/* Top row — Eminence reward (left) + can-afford badge (right), mirroring ArtifactCardView */}
            <div className="flex justify-between items-start">
              {eminenceValue > 0 ? (
                <EminenceBadge
                  value={eminenceValue}
                  title={getLuminaryEminenceTitle(eminenceValue)}
                />
              ) : (
                <span aria-hidden="true" />
              )}
              <AnimatePresence>
                {canAffordLuminary && (
                  <motion.div
                    key="can-afford-badge"
                    initial={{ scale: 1.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 13, mass: 0.55 }}
                    className="flex items-center gap-0.5 rounded border border-white/10 px-1 py-0.5 bg-green-950/85"
                    title="You meet all requirements — claim this Luminary!"
                  >
                    <span className="text-[10px] font-bold text-green-300">✓</span>
                    <AffinityToken color={glowKey} size={10} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom: name and required Affinities. */}
            <div className="space-y-1">
              <div className="luminary-card-name text-[9px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] line-clamp-2">
                {luminary.name}
              </div>
              <div className="luminary-card-requirements-label text-[6px] uppercase tracking-[0.15em] font-bold text-white/70 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                Artifacts Required:
              </div>
              {/* Affinity requirement chips use compact card silhouettes. */}
              <div className="luminary-card-requirements flex flex-wrap gap-0.5 justify-end items-end">
                {AFFINITIES.map((c) => {
                  const printed = luminary.requirements[c as keyof AffinityCounts];
                  if (printed <= 0) return null;
                  const bonus = playerBonuses?.[c as keyof AffinityCounts] ?? 0;
                  const displayVal = costMode === 'needed_now'
                    ? Math.max(0, printed - bonus)
                    : printed;
                  const isMet = costMode === 'needed_now' && displayVal === 0;
                  const meta = AFFINITY_META[c];
                  const tooltipBase = costMode === 'needed_now'
                    ? (isMet
                        ? `${meta.name} requirement met (${bonus}/${printed})`
                        : `${displayVal} more ${meta.name} Artifact${displayVal === 1 ? '' : 's'} needed (have ${bonus}/${printed})`)
                    : `${printed} ${meta.name} Artifact${printed === 1 ? '' : 's'} required`;
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
