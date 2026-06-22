import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { ArtifactCard, CrystalCounts } from '@workspace/api-client-react';
import { GEM_META, type GemKey } from '@/lib/gemMeta';
import { AffinityEmblem } from '@/components/AffinityEmblem';
import { CardBackTier1, CardBackTier2, CardBackTier3 } from '@/components/ArtifactCardBack';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { CRYSTALS, CARD_ART, GEM_CARD_GRADIENTS, TIER_BACKDROPS } from './game-constants';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';

export function MiniGem({ color, size = 16 }: { color: GemKey; size?: number }) {
  return <AffinityEmblem color={color} size={size} />;
}

export function EminenceDiamond({ size = 10 }: { size?: number }) {
  return <EminenceSigil size={size} />;
}

const ASCENSION_MARKS = Array.from({ length: 15 }, (_, index) => {
  const stage = Math.floor(index / 5);
  const mark = index % 5;
  const radius = [39, 29, 19][stage];
  const angle = ((-142 + mark * 71) * Math.PI) / 180;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 53 + Math.sin(angle) * radius,
    stage,
  };
});

export function EminenceSigil({
  size = 24,
  value = 0,
  target = 15,
}: {
  size?: number;
  value?: number;
  target?: number;
}) {
  const score = Math.max(0, Math.min(value, target));
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      <path d="M50 10 61 47 50 90 39 47 50 10Z" fill="#4D2D08" stroke="#D59C35" strokeWidth="2" />
      <path d="M50 20 56 47 50 78 44 47 50 20Z" fill="#FFF0B1" opacity="0.92" />
      <path d="M50 35 53 48 50 63 47 48 50 35Z" fill="#FFFFFF" />
      {[39, 29, 19].map((radius, index) => (
        <circle
          key={radius}
          cx="50"
          cy="53"
          r={radius}
          fill="none"
          stroke={index === 0 ? 'rgba(213,156,53,0.35)' : 'rgba(255,228,147,0.2)'}
          strokeWidth="1"
          strokeDasharray={index === 0 ? '2 4' : '1 4'}
        />
      ))}
      {ASCENSION_MARKS.map((mark, index) => {
        const filled = index < score;
        const isStageEnd = index % 5 === 4;
        return (
          <circle
            key={index}
            cx={mark.x}
            cy={mark.y}
            r={isStageEnd ? 3.6 : 2.65}
            fill={filled ? '#FFF1B3' : '#241A0C'}
            stroke={filled ? '#E9B94B' : 'rgba(232,192,104,0.34)'}
            strokeWidth={isStageEnd ? 1.15 : 0.9}
          />
        );
      })}
    </svg>
  );
}

export function EminenceProgress({
  value,
  target = 15,
  variant = 'hud',
}: {
  value: number;
  target?: number;
  variant?: 'hud' | 'monument';
}) {
  const score = Math.max(0, Math.min(value, target));
  const isNearVictory = score >= target - 3;
  const isVictorious = score >= target;
  const isMonument = variant === 'monument';

  return (
    <div
      className={`flex items-center gap-2 rounded-md border text-left ${isMonument ? 'min-w-[170px] px-3 py-2' : 'min-w-[106px] px-1.5 py-1'}`}
      style={{
        borderColor: isVictorious ? 'rgba(255,232,160,0.86)' : isNearVictory ? 'rgba(236,184,71,0.72)' : 'rgba(221,171,61,0.38)',
        background: isVictorious
          ? 'linear-gradient(135deg, rgba(124,82,18,0.76), rgba(38,26,9,0.92))'
          : 'linear-gradient(135deg, rgba(90,59,17,0.45), rgba(8,7,18,0.72))',
        boxShadow: isVictorious
          ? '0 0 18px rgba(255,218,118,0.46), inset 0 1px 0 rgba(255,255,255,0.28)'
          : isNearVictory
            ? '0 0 13px rgba(231,175,52,0.26), inset 0 1px 0 rgba(255,255,255,0.14)'
            : 'inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      <motion.div
        key={score}
        initial={{ scale: 1.22, rotate: -14, opacity: 0.55 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 18 }}
      >
        <EminenceSigil size={isMonument ? 78 : 28} value={score} target={target} />
      </motion.div>
      <div className="min-w-0">
        <div className="mb-0.5 text-[8px] font-bold uppercase text-[#f4cf78]/75">Ascension</div>
        <div className="flex items-baseline gap-0.5 leading-none">
          <motion.span
            key={`score-${score}`}
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
        <div className="mt-1.5 flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((stage) => {
            const stageStart = stage * 5;
            const filledInStage = Math.max(0, Math.min(5, score - stageStart));
            return (
              <div key={stage} className="flex gap-px">
                {Array.from({ length: 5 }, (_, offset) => {
                  const filled = offset < filledInStage;
                  return (
                    <span
                      key={offset}
                      className={`${isMonument ? 'h-1.5 w-2' : 'h-1 w-1.5'} rounded-full`}
                      style={{
                        background: filled ? '#F5C75F' : 'rgba(255,255,255,0.13)',
                        boxShadow: filled ? '0 0 4px rgba(255,214,112,0.72)' : 'none',
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4">
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

export function CrystalIcon({
  color, count, onClick, selectable, selected, size = 40,
}: {
  color: GemKey; count?: number; onClick?: () => void;
  selectable?: boolean; selected?: boolean; size?: number;
}) {
  const meta = GEM_META[color];
  const Tag = selectable ? motion.button : motion.div;
  return (
    <Tag
      type={selectable ? 'button' : undefined}
      whileTap={selectable ? { scale: 0.92 } : {}}
      onClick={selectable ? onClick : undefined}
      title={meta.name}
      aria-label={`${meta.name} affinity${count !== undefined ? `, ${count} available` : ''}`}
      data-testid={`gem-${color}`}
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
  card, onTap, tapped, tier, effectiveCosts, bonusCosts, artOnly, hideStrike,
}: {
  card: ArtifactCard;
  onTap?: () => void;
  tapped?: boolean;
  tier?: number;
  effectiveCosts?: Partial<Record<GemKey, number>>;
  /** Pure after-bonuses cost (no tokens subtracted). Used to gate the "free" ✓ chip so it only fires when bonuses alone cover the cost, not when tokens happen to cover it. */
  bonusCosts?: Partial<Record<GemKey, number>>;
  artOnly?: boolean;
  /** When true, suppresses the crossed-out original cost shown alongside a reduced cost (e.g. when costMode is 'needed_now'). */
  hideStrike?: boolean;
}) {
  const bonusMeta = GEM_META[card.bonusColor as GemKey];
  const cardTier = tier ?? card.tier ?? 1;
  const specificArt = CARD_ART[card.id];

  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleCounter = useRef(0);
  // Touch-scroll vs tap: record where the finger went down so we can ignore
  // touchend events that followed a scroll gesture in any direction.
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);

  const artLayerStyle: React.CSSProperties = {
    backgroundImage: specificArt
      ? `url(${specificArt})`
      : cardTier === 2
        ? (GEM_CARD_GRADIENTS[card.bonusColor] ?? GEM_CARD_GRADIENTS.pearl)
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
      className={`relative w-[var(--card-w)] h-[var(--card-h)] rounded-xl overflow-hidden bg-black shrink-0 ${onTap ? 'cursor-pointer active:brightness-110' : ''}`}
      style={{
        boxShadow: tapped
          ? `inset 0 0 0 2px ${bonusMeta?.hex ?? '#6366f1'}, 0 0 20px 4px ${bonusMeta?.glowHex ?? '#818cf8'}66, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`
          : `inset 0 0 0 1px rgba(0,0,0,0.3), 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
        transition: 'box-shadow 150ms ease',
      }}
      title={card.flavor || card.name}
    >
      <div className="absolute inset-0 pointer-events-none" style={artLayerStyle} />
      {!specificArt && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 40%, ${bonusMeta?.glowHex ?? '#ffffff'}22 0%, transparent 70%)` }}
        />
      )}
      {!artOnly && <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 pointer-events-none" />}

      {!artOnly && <div className="relative z-10 h-full p-2 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          {card.lumens > 0
            ? <span className="bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-sm font-serif font-bold text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">{card.lumens}</span>
            : <span />}
          {bonusMeta && (
            <div className="w-9 h-9 rounded-full shadow-md overflow-hidden" title={bonusMeta.name}>
              <img src={bonusMeta.image} alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-[9px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] line-clamp-2">
            {card.name}
          </div>
          <div className="flex flex-wrap gap-0.5 justify-end">
            {CRYSTALS.map((c) => {
              const baseCost = card.cost[c as keyof CrystalCounts] ?? 0;
              if (baseCost <= 0) return null;
              const effCost = effectiveCosts !== undefined ? (effectiveCosts[c] ?? 0) : baseCost;
              const isReduced = effectiveCosts !== undefined && effCost < baseCost;
              // "free" only when permanent bonuses alone cover this affinity — not when tokens happen to cover it.
              // If bonusCosts is provided (needed_now mode), check the bonus-only cost; otherwise fall back to effCost.
              const bonusEffCost = bonusCosts !== undefined ? (bonusCosts[c as GemKey] ?? baseCost) : effCost;
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
                  className={`flex items-center gap-0.5 backdrop-blur-sm rounded px-1 py-0.5 ${isGreen ? 'bg-green-900/70' : isReduced ? 'bg-blue-900/70' : 'bg-black/55'}`}
                >
                  {isReduced && !isGreen && !hideStrike && (
                    <span className="text-[7px] font-bold text-white/40 line-through mr-0.5">{baseCost}</span>
                  )}
                  <span className={`text-[10px] font-bold ${isGreen ? 'text-green-300' : isReduced ? 'text-blue-200' : 'text-white'}`}>
                    {isGreen ? '✓' : effCost}
                  </span>
                  <MiniGem color={c} size={10} />
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
    ? CRYSTALS.filter(c => c !== 'flux' && (bonuses[c as keyof CrystalCounts] ?? 0) > 0)
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
                      <MiniGem color={c as GemKey} size={10} />
                      <span className="text-white font-bold">×{bonuses![c as keyof CrystalCounts]}</span>
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

export function QueuedOverlay() {
  return (
    <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 0 2px #fbbf24, 0 0 12px 3px #fbbf2466' }}>
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider bg-amber-500/90 text-black rounded px-1 py-0.5 leading-none shadow">Queued</span>
    </div>
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
  const sz = size === 'sm' ? 'w-9 h-12' : size === 'compact' ? 'w-[56px] h-[78px]' : 'w-[var(--card-w)] h-[var(--card-h)]';
  const t = tier ?? 1;
  return (
    <div className={`${sz} relative rounded-xl overflow-hidden border border-[#c4a85a]/30 shadow-md bg-[#030509] shrink-0`}>
      {t === 1 && <CardBackTier1 count={count} />}
      {t === 2 && <CardBackTier2 count={count} />}
      {t === 3 && <CardBackTier3 count={count} />}
    </div>
  );
}
