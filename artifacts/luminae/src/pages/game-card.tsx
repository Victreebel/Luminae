import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import type { ArtifactCard, AffinityCounts } from '@workspace/api-client-react';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { AffinityEmblem } from '@/components/AffinityEmblem';
import { CardBackTier1, CardBackTier2, CardBackTier3 } from '@/components/ArtifactCardBack';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { AFFINITIES, CARD_ART, CARD_RUNTIME_ART, AFFINITY_CARD_GRADIENTS, TIER_BACKDROPS } from './game-constants';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';

export function AffinityToken({
  color,
  size = 16,
  className,
}: {
  color: AffinityKey;
  size?: number;
  className?: string;
}) {
  return <AffinityEmblem color={color} size={size} className={className} />;
}

export function EminenceDiamond({ size = 10 }: { size?: number }) {
  return <EminenceSigil size={size} />;
}

const SEAL_STAGES = [0, 1, 2] as const;

export function EminenceSigil({
  size = 24,
  value = 0,
  target = 15,
}: {
  size?: number;
  value?: number;
  target?: number;
}) {
  const eminenceProgress = Math.max(0, Math.min(value, target));
  const stageValue = target / SEAL_STAGES.length;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="eminence-seal-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6D3" />
          <stop offset="0.42" stopColor="#E7BA58" />
          <stop offset="1" stopColor="#71440D" />
        </linearGradient>
        <linearGradient id="eminence-seal-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#FFF0A8" />
          <stop offset="1" stopColor="#CA7B20" />
        </linearGradient>
      </defs>
      <path d="M50 4 75 27 69 79 50 96 31 79 25 27 50 4Z" fill="#100B12" stroke="url(#eminence-seal-metal)" strokeWidth="2.5" />
      <path d="M50 12 64 30 59 77 50 86 41 77 36 30 50 12Z" fill="none" stroke="rgba(255,239,180,0.35)" strokeWidth="1" />
      <path d="M50 17 58 31 50 45 42 31 50 17Z" fill="#24170B" stroke="#DFA847" strokeWidth="1" />
      {SEAL_STAGES.map((stage) => {
        const stageProgress = Math.max(0, Math.min(1, (eminenceProgress - stage * stageValue) / stageValue));
        const y = 39 + stage * 15;
        return (
          <g key={stage} opacity={0.28 + stageProgress * 0.72}>
            <path d={`M50 ${y - 7} 60 ${y} 50 ${y + 7} 40 ${y} 50 ${y - 7}Z`} fill={stageProgress > 0 ? 'url(#eminence-seal-core)' : '#21170F'} stroke={stageProgress > 0 ? '#FFF0AE' : 'rgba(222,168,71,0.46)'} strokeWidth="1" />
            <path d={`M31 ${y}H40M60 ${y}H69`} stroke={stageProgress > 0 ? '#F9D77A' : 'rgba(222,168,71,0.36)'} strokeWidth="1.4" strokeLinecap="round" />
          </g>
        );
      })}
      <circle cx="50" cy="31" r="3.2" fill={eminenceProgress > 0 ? '#FFF7D1' : '#2A1B0D'} stroke="#E8B84F" strokeWidth="1.2" />
      <path d="M25 27 16 35M75 27 84 35M31 79 23 85M69 79 77 85" stroke="rgba(239,204,116,0.64)" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function EminenceBadge({
  value,
  compact = false,
  className = '',
  title,
}: {
  value: number;
  compact?: boolean;
  className?: string;
  title?: string;
}) {
  const isNegative = value < 0;
  const isZero = value === 0;
  const absValue = Math.abs(value);
  const displayValue = `${isNegative ? '-' : ''}${absValue}`;

  return (
    <span
      className={`eminence-card-badge ${compact ? 'eminence-card-badge--compact' : ''} ${isNegative ? 'eminence-card-badge--oblivion' : ''} ${isZero ? 'eminence-card-badge--zero' : ''} ${className}`.trim()}
      title={title ?? (isNegative ? `${displayValue} Eminence` : `+${displayValue} Eminence`)}
      aria-label={title ?? (isNegative ? `${displayValue} Eminence` : `${displayValue} Eminence`)}
    >
      <span className="eminence-card-badge__value">{displayValue}</span>
    </span>
  );
}

export function EminenceProgress({
  value,
  target = 15,
  variant = 'hud',
  sigilTarget,
  impactKey,
}: {
  value: number;
  target?: number;
  variant?: 'hud' | 'monument';
  sigilTarget?: string;
  impactKey?: number | string | null;
}) {
  const eminenceProgress = Math.max(0, Math.min(value, target));
  const isNearVictory = eminenceProgress >= target - 3;
  const isVictorious = eminenceProgress >= target;
  const isMonument = variant === 'monument';

  return (
    <div
      className={`eminence-progress flex items-center text-left ${isMonument ? 'eminence-progress--monument min-w-[170px] gap-3 px-3 py-2' : 'eminence-progress--hud gap-1 px-0.5 py-0.5'} ${isVictorious ? 'eminence-progress--victory' : isNearVictory ? 'eminence-progress--critical' : eminenceProgress >= target - 6 ? 'eminence-progress--near' : ''}`}
      style={{
        borderColor: isVictorious ? 'rgba(255,232,160,0.86)' : isNearVictory ? 'rgba(236,184,71,0.72)' : 'rgba(221,171,61,0.28)',
        background: isVictorious
          ? 'linear-gradient(135deg, rgba(124,82,18,0.76), rgba(38,26,9,0.92))'
          : isMonument
            ? 'linear-gradient(135deg, rgba(90,59,17,0.45), rgba(8,7,18,0.72))'
            : 'transparent',
        boxShadow: isVictorious
          ? '0 0 18px rgba(255,218,118,0.46), inset 0 1px 0 rgba(255,255,255,0.28)'
          : isNearVictory
            ? '0 0 13px rgba(231,175,52,0.26), inset 0 1px 0 rgba(255,255,255,0.14)'
            : isMonument ? 'inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
      }}
    >
      <motion.div
        key={eminenceProgress}
        initial={{ scale: 1.22, rotate: -14, opacity: 0.55 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 18 }}
      >
        <span
          key={`eminence-sigil-${eminenceProgress}-${impactKey ?? 'idle'}`}
          data-eminence-sigil={sigilTarget}
          className={`eminence-sigil-target ${impactKey ? 'eminence-sigil-target--impact' : ''}`}
        >
          <EminenceSigil size={isMonument ? 78 : 31} value={eminenceProgress} target={target} />
        </span>
      </motion.div>
      <div className="min-w-0">
        <div className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#f4cf78]/75">Eminence</div>
        <div className="flex items-baseline gap-0.5 leading-none">
          <motion.span
            key={`eminence-value-${eminenceProgress}`}
            initial={{ y: 5, opacity: 0, scale: 1.16 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
            className={`${isMonument ? 'text-3xl' : 'text-base'} font-serif font-black tabular-nums text-[#fff4c5]`}
            style={{ textShadow: '0 0 10px rgba(255,222,133,0.62)' }}
          >
            {value}
          </motion.span>
          <span className={`${isMonument ? 'text-xs' : 'text-[9px]'} font-bold text-[#f4cf78]/75`}>/{target}</span>
        </div>
        {isMonument && <div className="mt-1 text-[9px] font-medium text-[#f7d888]/65">Complete the seal to win.</div>}
      </div>
    </div>
  );
}

export type EminenceBreakdown = {
  artifacts: number;
  luminaries: number;
  oblivionRows: Array<{ name: string; amount: number }>;
  other: number;
};

export function BaseDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  // Escape is handled by the parent useEscapeToClose; only tab-cycle here.
  useFocusTrap(containerRef, open, onClose, { handleEscape: false });
  if (!open) return null;
  return (
    <div
      data-cinematic-obscurable="true"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
    >
      <div
        ref={(el) => { containerRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="base-dialog-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/60"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="base-dialog-title" className="text-base font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AffinityTokenButton({
  color, count, onClick, selectable, selected, size = 40,
}: {
  color: AffinityKey; count?: number; onClick?: () => void;
  selectable?: boolean; selected?: boolean; size?: number;
}) {
  const meta = AFFINITY_META[color];
  const Tag = selectable ? motion.button : motion.div;
  return (
    <Tag
      type={selectable ? 'button' : undefined}
      whileTap={selectable ? { scale: 0.92 } : {}}
      onClick={selectable ? onClick : undefined}
      title={meta.name}
      aria-label={`${meta.name} affinity${count !== undefined ? `, ${count} available` : ''}`}
      data-affinity={color}
      data-testid={`affinity-${color}`}
      className={`relative rounded-full flex items-center justify-center font-bold text-white ${selectable ? 'cursor-pointer' : ''} ${selected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : ''}`}
      style={{
        width: size, height: size,
        boxShadow: `0 0 ${size * 0.3}px ${meta.glowHex}55, inset 0 0 4px rgba(0,0,0,0.5)`,
      }}
    >
      <img
        src={meta.image} alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />
      {count !== undefined && (
        <span
          className={`relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] font-serif ${count === 0 ? 'opacity-40' : ''}`}
          style={{ fontSize: size * 0.4 }}
        >
          {count}
        </span>
      )}
    </Tag>
  );
}

export const ArtifactCardView = React.memo(function ArtifactCardView({
  card, onTap, tapped, tier, effectiveCosts, bonusCosts, artOnly, hideStrike, hideEminence,
}: {
  card: ArtifactCard;
  onTap?: () => void;
  tapped?: boolean;
  tier?: number;
  effectiveCosts?: Partial<Record<AffinityKey, number>>;
  /** Pure after-bonuses cost (no tokens subtracted). Used to gate the "free" ✓ chip so it only fires when bonuses alone cover the cost, not when tokens happen to cover it. */
  bonusCosts?: Partial<Record<AffinityKey, number>>;
  artOnly?: boolean;
  /** When true, suppresses the crossed-out original cost shown alongside a reduced cost (e.g. when costMode is 'needed_now'). */
  hideStrike?: boolean;
  /** Used only by forge animations after the Eminence seal has visibly separated from the card. */
  hideEminence?: boolean;
}) {
  const bonusMeta = AFFINITY_META[card.bonusAffinity as AffinityKey];
  const cardTier = tier ?? card.tier ?? 1;
  const specificArt = CARD_ART[card.id];
  const runtimeArt = CARD_RUNTIME_ART[card.id];
  const cardRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = cardRootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        node.dataset.runtimeVisible = entry?.isIntersecting ? 'true' : 'false';
      },
      { rootMargin: '120px 120px', threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleCounter = useRef(0);
  // Touch-scroll vs tap: record where the finger went down so we can ignore
  // touchend events that followed a scroll gesture in any direction.
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);

  const artLayerStyle: React.CSSProperties = {
    backgroundImage: cardTier === 2
        ? (AFFINITY_CARD_GRADIENTS[card.bonusAffinity] ?? AFFINITY_CARD_GRADIENTS.radiance)
        : `url(${TIER_BACKDROPS[cardTier] ?? cardTier1Bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onTap) return;
    // On touch devices the synthesised mouse click fires after touchend; the
    // touchend handler already called onTap (or suppressed it), so we only
    // want the mouse path when there was no preceding touch.
    if (touchOrigin.current !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = ++rippleCounter.current;
    setRipples(prev => [...prev, { id, x, y }]);
    onTap();
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    if (t) touchOrigin.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const origin = touchOrigin.current;
    touchOrigin.current = null;           // reset for next interaction
    if (!onTap) return;
    const touch = e.changedTouches[0];
    if (!touch || !origin) return;
    // Suppress if the finger travelled more than 8px in either axis — that's
    // a scroll gesture, not a tap (covers both vertical and horizontal scrolls).
    const dx = Math.abs(touch.clientX - origin.x);
    const dy = Math.abs(touch.clientY - origin.y);
    if (dx > 8 || dy > 8) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    const id = ++rippleCounter.current;
    setRipples(prev => [...prev, { id, x, y }]);
    onTap();
    // Prevent the browser synthesising a click event after touchend.
    e.preventDefault();
  }

  return (
    <motion.div
      ref={cardRootRef}
      // SCALE CONVENTION: scale: 1.02 is safe here because this element IS the
      // overflow-hidden root — it clips its own children, not a parent clipping it.
      // Do NOT add scale-up hover to buttons/elements whose *ancestor* has overflow-hidden;
      // that causes the scaled content to be clipped by the parent. Use brightness or
      // box-shadow for hover feedback on buttons inside constrained panels instead.
      whileHover={onTap && !tapped ? { y: -2, scale: 1.02, transition: { duration: 0.12, ease: 'easeOut' } } : {}}
      whileTap={onTap ? { scale: 0.96 } : {}}
      animate={tapped ? { y: -6, scale: 1.04 } : { y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`artifact-card-view relative w-[var(--card-w)] h-[var(--card-h)] rounded-xl overflow-hidden bg-black shrink-0 ${onTap ? 'cursor-pointer active:brightness-110' : ''}`}
      style={{
        boxShadow: tapped
          ? `inset 0 0 0 2px ${bonusMeta?.hex ?? '#6366f1'}, 0 0 20px 4px ${bonusMeta?.glowHex ?? '#818cf8'}66, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`
          : `inset 0 0 0 1px rgba(0,0,0,0.3), 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
        transition: 'box-shadow 150ms ease',
      }}
      title={card.flavor || card.name}
    >
      {specificArt ? (
        <picture className="absolute inset-0 pointer-events-none">
          {runtimeArt && <source media="(max-width: 1024px) and (pointer: coarse)" srcSet={runtimeArt} />}
          <img
            src={specificArt}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </picture>
      ) : (
        <div className="absolute inset-0 pointer-events-none" style={artLayerStyle} />
      )}
      {!specificArt && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 40%, ${bonusMeta?.glowHex ?? '#ffffff'}22 0%, transparent 70%)` }}
        />
      )}
      {!artOnly && <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 pointer-events-none" />}

      {!artOnly && <div className="artifact-card-content relative z-10 h-full">
        <div className="artifact-card-meta-row">
          {!hideEminence && (card.eminence ?? 0) > 0
            ? <EminenceBadge value={card.eminence ?? 0} className="artifact-card-eminence-badge" />
            : <span className="artifact-card-eminence-placeholder" />}
          {bonusMeta && (
            <div className="artifact-card-bonus-badge rounded-full shadow-md overflow-hidden" title={bonusMeta.name}>
              <img src={bonusMeta.image} alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
          )}
        </div>

        <div className="artifact-card-text-stack">
          <div className="artifact-card-name">
            {card.name}
          </div>
          <div className="artifact-card-cost-row">
            {AFFINITIES.map((c) => {
              const baseCost = card.cost[c as keyof AffinityCounts] ?? 0;
              if (baseCost <= 0) return null;
              const effCost = effectiveCosts !== undefined ? (effectiveCosts[c] ?? 0) : baseCost;
              const isReduced = effectiveCosts !== undefined && effCost < baseCost;
              // "free" only when permanent bonuses alone cover this affinity — not when tokens happen to cover it.
              // If bonusCosts is provided (needed_now mode), check the bonus-only cost; otherwise fall back to effCost.
              const bonusEffCost = bonusCosts !== undefined ? (bonusCosts[c as AffinityKey] ?? baseCost) : effCost;
              const isFree = isReduced && effCost === 0 && bonusEffCost === 0;
              // In needed_now mode, effCost=0 means the player has enough right now — show ✓ visually but do not set isFree (backend uses isFree for pricing).
              const isNeededCovered = hideStrike && effCost === 0 && !isFree;
              const isGreen = isFree || isNeededCovered;
              const chipKey = `${c}-${isFree ? 'free' : isNeededCovered ? 'covered' : effCost}`;
              return (
                <motion.div
                  key={chipKey}
                  initial={{ scale: isGreen ? 1.85 : isReduced ? 1.35 : 1, opacity: isGreen || isReduced ? 0 : 1 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={isGreen
                    ? { type: 'spring', stiffness: 480, damping: 13, mass: 0.55 }
                    : isReduced
                      ? { type: 'spring', stiffness: 340, damping: 24, mass: 0.65 }
                      : { duration: 0 }
                  }
                  className={`artifact-card-cost-chip rounded border border-white/10 ${isGreen ? 'bg-green-950/85' : isReduced ? 'bg-blue-950/85' : 'bg-black/78'}`}
                >
                  {isReduced && !isGreen && !hideStrike && (
                    <span className="artifact-card-cost-original text-white/40 line-through">{baseCost}</span>
                  )}
                  <span className={`artifact-card-cost-value ${isGreen ? 'text-green-300' : isReduced ? 'text-blue-200' : 'text-white'}`}>
                    {isGreen ? '✓' : effCost}
                  </span>
                  <AffinityToken color={c} size={10} className="artifact-card-cost-affinity" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>}

      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.55 }}
            animate={{ scale: 4.5, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            onAnimationComplete={() => setRipples(prev => prev.filter(p => p.id !== r.id))}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: 40,
              height: 40,
              marginLeft: -20,
              marginTop: -20,
              background: `radial-gradient(circle, ${bonusMeta?.glowHex ?? '#ffffff'}bb 0%, ${bonusMeta?.glowHex ?? '#ffffff'}00 70%)`,
              zIndex: 20,
            }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

export function ForgedCardWithTooltip({ card, tier, onOpenSheet }: { card: ArtifactCard; tier?: number; onOpenSheet: () => void }) {
  const [show, setShow] = useState(false);
  const bonuses = card.bonusesAtForge;
  const nonZero = bonuses
    ? AFFINITIES.filter(c => c !== 'singularity' && (bonuses[c as keyof AffinityCounts] ?? 0) > 0)
    : [];
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <ArtifactCardView card={card} tier={tier} onTap={onOpenSheet} />
      <AnimatePresence>
        {show && (
          <motion.div
            key="forge-tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none"
          >
            <div className="bg-black/92 rounded-lg px-2.5 py-2 text-[10px] min-w-max max-w-[160px] border border-white/10 shadow-2xl">
              <p className="text-white font-semibold leading-tight mb-0.5">{card.name}</p>
              {card.flavor && (
                <p className="text-muted-foreground italic text-[9px] leading-tight mb-1.5">{card.flavor}</p>
              )}
              <div className="border-t border-white/10 my-1.5" />
              <p className="text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[9px]">Forged with</p>
              {nonZero.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {nonZero.map(c => (
                    <div key={c} className="flex items-center gap-0.5 bg-white/5 rounded px-1 py-0.5">
                      <AffinityToken color={c as AffinityKey} size={10} />
                      <span className="text-white font-bold">×{bonuses![c as keyof AffinityCounts]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-[9px]">No bonus data</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PendingActionOverlay({
  label = 'Pending action',
  compact = false,
  onCancel,
}: {
  label?: string;
  compact?: boolean;
  onCancel?: () => void | Promise<void>;
}) {
  const actionLabel = label.replace(/\s+pending$/i, '').trim() || 'Action';
  const cancelLabel = `Cancel pending ${actionLabel}`;

  return (
    <span
      data-pending-action-overlay="true"
      data-compact={compact ? 'true' : undefined}
      className={`absolute inset-0 z-[45] block pointer-events-none ${compact ? 'rounded-lg' : 'rounded-xl'}`}
      style={{ boxShadow: '0 0 0 2px #fbbf24, 0 0 12px 3px #fbbf2466' }}
    >
      <span
        className={
          compact
            ? 'absolute inset-x-0.5 top-1/2 z-30 flex min-w-0 -translate-y-1/2 flex-col items-center gap-0.5 rounded border border-amber-200/85 bg-black/94 p-0.5 text-amber-100 shadow'
            : 'absolute left-1/2 top-1/2 z-30 flex max-w-[92%] -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded border border-amber-200/80 bg-black/90 py-0.5 pl-1.5 pr-0.5 text-center text-[8px] font-black uppercase leading-none tracking-wider text-amber-200 shadow'
        }
        style={{ textShadow: '0 0 6px rgba(251, 191, 36, 0.65)' }}
      >
        {compact ? (
          <span className="flex w-full min-w-0 flex-col items-center justify-center overflow-hidden uppercase leading-none">
            <span className="w-full truncate text-center text-[7px] font-black tracking-[0.04em]">{actionLabel}</span>
            <span className="mt-0.5 text-[5px] font-bold tracking-[0.1em] text-amber-200/72">pending</span>
          </span>
        ) : (
          <span className="truncate">{label}</span>
        )}
        {onCancel && (
          <button
            type="button"
            aria-label={cancelLabel}
            title={cancelLabel}
            className={`${compact ? 'h-[18px] w-full' : 'h-5 w-5'} pointer-events-auto inline-flex shrink-0 items-center justify-center rounded-sm border border-amber-100/25 bg-amber-300/12 text-amber-100 transition-colors hover:bg-amber-300/25 active:bg-amber-300/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-100`}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void onCancel();
            }}
          >
            <X className={compact ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden="true" />
          </button>
        )}
      </span>
    </span>
  );
}

export function TurnCountdown({ deadline, active }: { deadline: number | null; active: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const remainingMs = Math.max(0, deadline - now);
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = remainingMs < 10_000;
  const color = active ? (urgent ? 'text-red-400' : 'text-primary') : 'text-muted-foreground';
  return (
    <div className={`flex items-center gap-1 font-mono tabular-nums text-xs ${color} ${urgent && active ? 'animate-pulse' : ''}`}>
      <Clock className="h-3 w-3" />
      <span>{seconds}s</span>
    </div>
  );
}

export function CardBack({ size = 'md', count, tier }: { size?: 'sm' | 'md' | 'compact'; count?: number; tier?: 1 | 2 | 3 }) {
  const sz = size === 'sm' ? 'w-9 h-12' : size === 'compact' ? '' : 'w-[var(--card-w)] h-[var(--card-h)]';
  const compactStyle = size === 'compact'
    ? { width: 'var(--forge-chip-w, 56px)', height: 'var(--forge-chip-h, 78px)' }
    : undefined;
  const t = tier ?? 1;
  return (
    <div className={`${sz} relative rounded-xl overflow-hidden border border-[#c4a85a]/30 shadow-md bg-[#030509] shrink-0`} style={compactStyle}>
      {t === 1 && <CardBackTier1 count={count} />}
      {t === 2 && <CardBackTier2 count={count} />}
      {t === 3 && <CardBackTier3 count={count} />}
    </div>
  );
}
