import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { 
  useGetGameState, 
  useSubmitAction,
  getGetGameStateQueryKey
} from '@workspace/api-client-react';
import type { RematchVoteUpdate } from '@/hooks/use-game-websocket';
import type { 
  GameState, 
  CrystalCounts, 
  ArtifactCard, 
  Luminary,
  GamePlayerState,
  LuminaryActiveState,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/lib/session';
import { useGameWebsocket } from '@/hooks/use-game-websocket';
import { useToast } from '@/hooks/use-toast';
import { gameAudio } from '@/lib/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Volume2, VolumeX, AlertCircle, Sparkles, Clock, ScrollText,
  Bookmark, Gavel, Eye, EyeOff, Package, LayoutGrid, Hand, List,
  ChevronDown, ChevronUp, ChevronRight, Flag, X, HelpCircle, CalendarX, Undo2
} from 'lucide-react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { getAvatarForPlayer } from '@/lib/avatars';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import { LuminaryPanelArt, LuminarySummonCutscene, LuminaryIdleOverlay, LUMINARY_VISUALS } from '@/lib/luminaryAssets';
import { CardBackTier1, CardBackTier2, CardBackTier3 } from '@/components/ArtifactCardBack';
const gemIcon = "/icon_gem.svg";

const CARD_ART_MODULES = import.meta.glob(
  '../assets/cards/*.png',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;
const CARD_ART: Record<string, string> = {};
for (const [path, url] of Object.entries(CARD_ART_MODULES)) {
  const id = path.split('/').pop()!.replace('.png', '');
  CARD_ART[id] = url;
}

const CRYSTALS: GemKey[] = GEM_KEYS;

const TIER_BACKDROPS: Record<number, string> = {
  1: cardTier1Bg,
  3: cardTier3Bg,
};

const GEM_CARD_GRADIENTS: Record<string, string> = {
  ruby:     'linear-gradient(175deg, #1a0404 0%, #3d0808 35%, #220505 70%, #100202 100%)',
  sapphire: 'linear-gradient(175deg, #020510 0%, #071840 35%, #040a28 70%, #020510 100%)',
  emerald:  'linear-gradient(175deg, #021005 0%, #063020 35%, #041a10 70%, #020c04 100%)',
  onyx:     'linear-gradient(175deg, #060606 0%, #181818 35%, #0e0e0e 70%, #050505 100%)',
  pearl:    'linear-gradient(175deg, #06061a 0%, #10103a 35%, #0a0a28 70%, #050516 100%)',
  flux:     'linear-gradient(175deg, #0a0a02 0%, #282808 35%, #181804 70%, #0a0a02 100%)',
};

// --- Helper Components ---

function PlayerAvatar({ avatarId, name, size = 28 }: { avatarId?: string | null; name: string; size?: number }) {
  const avatar = getAvatarForPlayer(avatarId);
  return (
    <div
      className="rounded-full overflow-hidden shrink-0 border-2"
      style={{ width: size, height: size, borderColor: `${avatar.accent}88` }}
      title={name}
    >
      <img
        src={avatar.image}
        alt={name}
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />
    </div>
  );
}

function RematchCountdown({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, endsAt - Date.now());
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [endsAt]);
  const secs = Math.ceil(remaining / 1000);
  const pct = Math.min(100, (remaining / 5000) * 100);
  return (
    <div className="space-y-1">
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Starting in {secs}s…
      </p>
    </div>
  );
}

function MiniGem({ color, size = 16 }: { color: GemKey; size?: number }) {
  const meta = GEM_META[color];
  return (
    <img
      src={meta.image}
      alt={meta.name}
      title={meta.name}
      width={size}
      height={size}
      className="rounded-full pointer-events-none select-none shrink-0"
      style={{ filter: `drop-shadow(0 0 3px ${meta.glowHex}88)` }}
      draggable={false}
    />
  );
}

function BaseDialog({
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/60">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">{title}</h2>
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

type EminenceBreakdown = {
  artifacts: number;
  luminaries: number;
  oblivionRows: Array<{ name: string; amount: number }>;
  other: number;
};

function CrystalIcon({
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

function ArtifactCardView({
  card, onTap, tapped, tier, effectiveCosts,
}: {
  card: ArtifactCard;
  onTap?: () => void;
  tapped?: boolean;
  tier?: number;
  effectiveCosts?: Partial<Record<GemKey, number>>;
}) {
  const bonusMeta = GEM_META[card.bonusColor as GemKey];
  const cardTier = tier ?? card.tier ?? 1;
  const specificArt = CARD_ART[card.id];

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

  return (
    <motion.div
      whileTap={onTap ? { scale: 0.96 } : {}}
      onClick={onTap}
      className={`relative w-28 h-40 rounded-xl overflow-hidden shadow-xl bg-black shrink-0 ${onTap ? 'cursor-pointer active:brightness-110' : ''} ${tapped ? 'ring-2 ring-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]' : 'ring-1 ring-black/30'}`}
      title={card.flavor || card.name}
    >
      <div className="absolute inset-0 pointer-events-none" style={artLayerStyle} />
      {!specificArt && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 40%, ${bonusMeta?.glowHex ?? '#ffffff'}22 0%, transparent 70%)` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 pointer-events-none" />

      <div className="relative z-10 h-full p-2 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-lg font-serif font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            {card.lumens > 0 ? card.lumens : ''}
          </span>
          <div className="w-5 h-5 rounded-full shadow-md ring-2 ring-black/60 overflow-hidden" title={bonusMeta?.name}>
            <img src={bonusMeta?.image} alt="" className="w-full h-full object-contain" draggable={false} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[9px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] line-clamp-2">
            {card.name}
          </div>
          <div className="flex flex-wrap gap-0.5 justify-end">
            {CRYSTALS.map((c) => {
              const baseCost = card.cost[c as keyof CrystalCounts];
              if (baseCost <= 0) return null;
              const effCost = effectiveCosts !== undefined ? (effectiveCosts[c] ?? 0) : baseCost;
              const isReduced = effectiveCosts !== undefined && effCost < baseCost;
              const isFree = isReduced && effCost === 0;
              return (
                <div
                  key={c}
                  className={`flex items-center gap-0.5 backdrop-blur-sm rounded px-1 py-0.5 ${isFree ? 'bg-green-900/70' : isReduced ? 'bg-blue-900/70' : 'bg-black/55'}`}
                >
                  {isReduced && !isFree && (
                    <span className="text-[7px] font-bold text-white/40 line-through mr-0.5">{baseCost}</span>
                  )}
                  <span className={`text-[10px] font-bold ${isFree ? 'text-green-300' : isReduced ? 'text-blue-200' : 'text-white'}`}>
                    {isFree ? '✓' : effCost}
                  </span>
                  <MiniGem color={c} size={10} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TurnCountdown({ deadline, active }: { deadline: number | null; active: boolean }) {
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

function CardBack({ size = 'md', count, tier }: { size?: 'sm' | 'md'; count?: number; tier?: 1 | 2 | 3 }) {
  const sz = size === 'sm' ? 'w-9 h-12' : 'w-28 h-40';
  const t = tier ?? 1;
  return (
    <div className={`${sz} relative rounded-xl overflow-hidden border border-[#c4a85a]/30 shadow-md bg-[#030509] shrink-0`}>
      {t === 1 && <CardBackTier1 count={count} />}
      {t === 2 && <CardBackTier2 count={count} />}
      {t === 3 && <CardBackTier3 count={count} />}
    </div>
  );
}

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
function LuminaryClaimedPortal({
  luminary, claimedByPlayer, luminaryAffinity,
  isOwnedByMe, isLive, canToggle, onToggle, isNew = false,
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
  const colors = accentMeta.length > 0 ? accentMeta : [GEM_META.flux];
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <span
          className="text-lg font-serif font-black leading-none select-none"
          style={{
            color: '#030308',
            WebkitTextStroke: `1px ${g2}`,
            textShadow: `0 0 8px ${g1}cc, 0 0 16px ${g1}55`,
          }}
        >
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
        <div className="absolute z-20 pointer-events-none" style={{ top: 28, right: 6 }}>
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

function LuminaryCard({
  luminary, claimedByNames = [], isReleased = false,
  luminaryAffinity, claimedByPlayer, isOwnedByMe, isLive, canToggle, onToggle,
  costMode, playerBonuses,
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
}) {
  const isClaimed = claimedByNames.length > 0;
  const initialClaimedRef = useRef(isClaimed);
  const portalIsNew = !initialClaimedRef.current;
  const vis = LUMINARY_VISUALS[luminary.id];
  const accentColor = vis?.primaryColor ?? GEM_META.flux.hex;
  return (
    <motion.div
      whileHover={isClaimed || (isReleased && !isClaimed) ? {} : { scale: 1.02 }}
      data-luminary-id={luminary.id}
      className={`relative w-28 h-40 rounded-xl overflow-hidden shadow-xl bg-black shrink-0 ${
        isClaimed ? 'ring-1 ring-white/10' : 'ring-1 ring-black/30'
      }`}
      title={isClaimed
        ? `Released${claimedByPlayer ? ` — claimed by ${claimedByPlayer.playerName}` : ''}`
        : (luminary.flavor || luminary.name)}
      style={isReleased && !isClaimed ? { opacity: 0, pointerEvents: 'none' } : undefined}
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
            {/* Top row — lumens/oblivion (left) + accent dot (right), mirroring ArtifactCardView */}
            <div className="flex justify-between items-start">
              <span
                className="text-lg font-serif font-bold"
                style={{
                  color: accentColor,
                  textShadow: '-1px -1px 0 rgba(255,255,255,0.92), 1px -1px 0 rgba(255,255,255,0.92), -1px 1px 0 rgba(255,255,255,0.92), 1px 1px 0 rgba(255,255,255,0.92), 0 2px 5px rgba(0,0,0,1)',
                }}
              >
                {luminary.oblivion ? `-${luminary.oblivion}` : luminary.lumens}
              </span>
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

type ActiveTab = 'board' | 'hand' | 'log';

interface SelectedCard {
  card: ArtifactCard;
  fromReserve: boolean;
  canBuy: boolean;
  canReserve: boolean;
  effectiveCosts?: Partial<Record<GemKey, number>>;
}

// --- Main Page ---

export default function GameBoard() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = getSession();

  const [muted, setMuted] = useState(gameAudio.isMuted());
  const [selectedCrystals, setSelectedCrystals] = useState<Partial<CrystalCounts>>({});
  const [crystalHistory, setCrystalHistory] = useState<Array<keyof CrystalCounts>>([]);
  const [prePromotionHistory, setPrePromotionHistory] = useState<Array<keyof CrystalCounts> | null>(null);
  const [actionMode, setActionMode] = useState<'none' | 'take3' | 'take2'>('none');
  const [showUndoHint, setShowUndoHint] = useState(false);
  const [showReserveHint, setShowReserveHint] = useState(false);
  const [showForgeHint, setShowForgeHint] = useState(false);
  type CostMode = 'printed' | 'after_bonuses' | 'needed_now';
  const [costMode, setCostMode] = useState<CostMode>('after_bonuses');
  const [showPurchased, setShowPurchased] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [pendingSheetAction, setPendingSheetAction] = useState<'forge' | 'reserve' | 'plan_forge' | 'plan_reserve' | null>(null);
  const [selectedDeckTier, setSelectedDeckTier] = useState<1 | 2 | 3 | null>(null);
  const [pendingDeckConfirm, setPendingDeckConfirm] = useState(false);
  const [btnAnimKey, setBtnAnimKey] = useState(0);
  const [btnAnimTarget, setBtnAnimTarget] = useState<string | null>(null);
  const [btnAnimType, setBtnAnimType] = useState<'select' | 'confirm'>('select');
  const [harnessPulseKey, setHarnessPulseKey] = useState(0);
  const [purchaseBurst, setPurchaseBurst] = useState<{ key: number; lumens: number; name: string } | null>(null);
  const burstKeyRef = useRef(0);
  const [gemBurst, setGemBurst] = useState<{
    key: number;
    gems: GemKey[];
    playerName: string;
    avatarId: string | null;
  } | null>(null);
  const gemBurstKeyRef = useRef(0);
  const gemBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTakeBurstActionRef = useRef<string | null>(null);
  const [reserveBurst, setReserveBurst] = useState<{
    key: number;
    tier: 1 | 2 | 3;
    gotFlux: boolean;
    playerId: string;
    playerName: string;
    avatarId?: string | null;
  } | null>(null);
  const reserveBurstKeyRef = useRef(0);
  const reserveBurstActionRef = useRef<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showAllLog, setShowAllLog] = useState(false);
  const [showEminenceBreakdown, setShowEminenceBreakdown] = useState(false);
  const [showForgedOverlay, setShowForgedOverlay] = useState(false);
  const [forgedFilter, setForgedFilter] = useState<GemKey | null>(null);
  const [showReservedOverlay, setShowReservedOverlay] = useState(false);
  const [expandedOpponents, setExpandedOpponents] = useState<Set<string>>(new Set());
  const [summonQueue, setSummonQueue] = useState<Array<{
    id: string; name: string; domain: string; lumens: number; flavor: string;
    cardRect?: { cx: number; cy: number; w: number };
    eventId: string;    // stable server event ID (or 'dev-test-<id>' for dev panel)
    isDevTest: boolean; // dev tests skip the server resolve_summon call
  }>>([]);
  // Tracks which server summon eventIds have already been pushed into the queue
  // so that duplicate WebSocket / reconnect deliveries are safely deduped.
  const handledSummonEventIdsRef = useRef(new Set<string>());
  // True when the user pressed "Skip view" on the active cutscene.
  // The cutscene stays mounted (timer runs) but the overlay is hidden.
  const [localSummonSkipped, setLocalSummonSkipped] = useState(false);
  // Prevents the initial-state pending-summon check from running twice.
  const checkedInitialSummonRef = useRef(false);
  // Stable ref to enqueueSummon — populated after it is defined below (after
  // the early return) so the initial-load useEffect can call it safely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enqueueSummonRef = useRef<(...args: any[]) => void>(() => {});
  // Luminary IDs that have been detected as newly summoned in processUpdate but
  // whose summonQueue entry hasn't been added yet (RAF chain pending). Used to
  // suppress the vortex portal during those few frames so it never flashes
  // before the cutscene starts. Cleared when the entry lands in summonQueue.
  const pendingSuppressLumIdsRef = useRef(new Set<string>());
  // Tracks current summonQueue length for stale-closure-safe reads inside processUpdate.
  const summonQueueLenRef = useRef(0);
  // Counts summon events that have been dispatched to enqueueSummon but have not
  // yet landed in summonQueue (i.e. still mid-RAF-chain). The flush effect uses
  // this to avoid releasing pendingGameOver before the cutscenes actually start.
  const enqueuingCountRef = useRef(0);
  // True when status just became 'finished' but summons are still in flight.
  // The win overlay and win audio are held back until the summon queue drains.
  const [pendingGameOver, setPendingGameOver] = useState(false);
  // summonColor of the Luminary that sealed the game (set when pendingGameOver goes
  // true). Read by the flush effect to play the affinity fanfare before playWin().
  const pendingGameOverLumColorRef = useRef<string>('');
  // Guard that prevents the flush effect from firing the fanfare twice if the
  // summonQueue.length dep oscillates while pendingGameOver is still true.
  const fanfareFiredForGameOverRef = useRef(false);
  // IDs of luminaries claimed in this session — their entity overlay persists.
  const [claimedThisSession, setClaimedThisSession] = useState<string[]>([]);
  // True once the active cutscene's flash has fired; resets to false on each new cutscene.
  const [cutscenePostFlash, setCutscenePostFlash] = useState(false);
  // DEV-only: luminary IDs whose portal visual is toggled on for local preview.
  // Client-side only — never written to the server.
  const [previewedPortals, setPreviewedPortals] = useState<Set<string>>(new Set());
  // Dev-only: affinity index per luminary for portal preview testing (not sent to server)
  const [devPortalAffinityIdx, setDevPortalAffinityIdx] = useState<Record<string, number>>({});
  const [turnAnnouncement, setTurnAnnouncement] = useState<{
    key: number;
    playerName: string;
    avatarId: string | null;
    isYou: boolean;
  } | null>(null);
  const turnAnnounceKeyRef = useRef(0);
  const turnAnnounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncedTurnRef = useRef<string | null>(null);
  const initialTurnFiredRef = useRef(false);
  const animationEndTimeRef = useRef(0);
  const pendingTurnAnnounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateQueueRef = useRef<GameState[]>([]);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processUpdateRef = useRef<(s: GameState) => void>(() => {});
  const drainQueueFnRef = useRef<() => void>(() => {});

  const [cardActionBurst, setCardActionBurst] = useState<{
    key: number;
    card: ArtifactCard;
    tier: number;
    actionType: 'purchase' | 'reserve';
    playerName: string;
    avatarId: string | null;
    lumens: number;
    gotFlux: boolean;
    startRect: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const cardActionBurstKeyRef = useRef(0);
  const cardAnimTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [hiddenSlots, setHiddenSlots] = useState<Set<string>>(new Set());
  const [flippingCards, setFlippingCards] = useState<Set<string>>(new Set());
  const [dealingCard, setDealingCard] = useState<{
    card: ArtifactCard;
    tier: number;
    deckRect: { x: number; y: number; w: number; h: number };
    slotRect: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const playerPanelRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  // Tracks how many AI affinity-change log entries have already triggered the
  // switch sound, so that we only fire for genuinely new entries.
  const seenAiAffinityLogCountRef = useRef(0);
  // True after the first actionLog effect run — prevents spurious sounds from
  // replaying historical log entries that were already present on page load.
  const aiAffinityLogInitializedRef = useRef(false);

  const toggleMute = () => setMuted(gameAudio.toggleMute());

  // Start ambient music when the game board mounts (user has already
  // interacted via buttons to get here, so AudioContext is allowed).
  // Stop and clean up when they leave the game.
  useEffect(() => {
    gameAudio.startMusic();
    return () => { gameAudio.stopMusic(); };
  }, []);

  // Scroll-passthrough fix.
  // Problem: the player panel and the main board area are siblings, not
  // parent/child. When a swipe gesture *starts* on the panel and moves up
  // into the board area, iOS/Android never delivers that gesture to <main>
  // because the touch origin is outside <main>'s bounds.
  //
  // Fix: attach native touchstart + touchmove listeners to the panel.
  // Once the gesture exceeds a small threshold (8 px) we treat it as a
  // deliberate scroll and forward each incremental delta to <main>.scrollBy.
  // Passive listeners are used throughout so we never block the browser's
  // default scroll handling for gestures that originate inside <main>.
  useEffect(() => {
    const panel = playerPanelRef.current;
    const main  = mainScrollRef.current;
    if (!panel || !main) return;

    let startY    = 0;
    let lastY     = 0;
    let forwarding = false;

    const onTouchStart = (e: TouchEvent) => {
      startY     = e.touches[0].clientY;
      lastY      = startY;
      forwarding = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const currentY   = e.touches[0].clientY;
      const totalDelta = startY - currentY; // +ve = swipe up

      // Only commit to forwarding once the gesture is clearly intentional.
      if (!forwarding && Math.abs(totalDelta) > 8) forwarding = true;

      if (forwarding) {
        const step = lastY - currentY; // +ve = scroll content up
        main.scrollBy(0, step);
      }

      lastY = currentY;
    };

    // Also release any focused panel element the moment a touch begins
    // inside <main>, so a board-area swipe is never blocked by a prior tap.
    const onMainTouchStart = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && panel.contains(active)) active.blur();
    };

    panel.addEventListener('touchstart', onTouchStart, { passive: true });
    panel.addEventListener('touchmove',  onTouchMove,  { passive: true });
    main .addEventListener('touchstart', onMainTouchStart, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove',  onTouchMove);
      main .removeEventListener('touchstart', onMainTouchStart);
    };
  }, []);

  const TURN_ANNOUNCE_DURATION = 1800;

  const setAnimEndTime = (durationMs: number) => {
    const end = Date.now() + durationMs;
    if (end > animationEndTimeRef.current) animationEndTimeRef.current = end;
  };

  const fireTurnAnnouncement = (dedupeKey: string, playerName: string, avatarId: string | null, isYou: boolean) => {
    if (dedupeKey === lastAnnouncedTurnRef.current) return;
    lastAnnouncedTurnRef.current = dedupeKey;
    if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
    pendingTurnAnnounceRef.current = null;

    const doFire = () => {
      const stillRemaining = animationEndTimeRef.current - Date.now();
      if (stillRemaining > 50) {
        pendingTurnAnnounceRef.current = setTimeout(doFire, stillRemaining + 100);
        return;
      }
      if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
      turnAnnounceKeyRef.current += 1;
      const seq = turnAnnounceKeyRef.current;
      setTurnAnnouncement({ key: seq, playerName, avatarId, isYou });
      setAnimEndTime(TURN_ANNOUNCE_DURATION);
      if (isYou) gameAudio.playTurnStart();
      turnAnnounceTimerRef.current = setTimeout(() => {
        if (turnAnnounceKeyRef.current === seq) setTurnAnnouncement(null);
        turnAnnounceTimerRef.current = null;
      }, TURN_ANNOUNCE_DURATION);
      pendingTurnAnnounceRef.current = null;
    };

    const remaining = animationEndTimeRef.current - Date.now();
    if (remaining > 50) {
      pendingTurnAnnounceRef.current = setTimeout(doFire, remaining + 100);
    } else {
      doFire();
    }
  };

  const cancelTurnAnnouncement = () => {
    if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
    pendingTurnAnnounceRef.current = null;
    if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
    turnAnnounceTimerRef.current = null;
    setTurnAnnouncement(null);
  };

  useEffect(() => {
    return () => {
      for (const t of cardAnimTimersRef.current) clearTimeout(t);
      cardAnimTimersRef.current = [];
      if (gemBurstTimerRef.current) clearTimeout(gemBurstTimerRef.current);
      if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
      if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
      stateQueueRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!session || session.roomId !== roomId) setLocation('/');
  }, [session, roomId, setLocation]);

  const { data: state, error } = useGetGameState(
    roomId!,
    { sessionToken: session?.sessionToken || '' },
    { query: { enabled: !!roomId && !!session, queryKey: getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }) } }
  );

  useEffect(() => {
    if (!initialTurnFiredRef.current && state && state.status === 'playing' && session) {
      initialTurnFiredRef.current = true;
      setAnimEndTime(1200);
      const cp = state.players[state.currentPlayerIndex];
      if (!cp) return;
      const key = `init-${state.currentPlayerIndex}-${state.version}`;
      if (cp.playerId === session.playerId) {
        fireTurnAnnouncement(key, cp.playerName, cp.avatarId ?? null, true);
      }
    }
  }, [state?.status, state?.version]);

  // ── Initial-load summon check ─────────────────────────────────────────────
  // Picks up any pendingSummonEvents already in the REST-loaded state (page
  // load / reconnect) where no subsequent WebSocket delta will fire a diff.
  // Also seeds claimedThisSession with every already-resolved Luminary so
  // idle entity overlays are restored immediately after a page reload or
  // navigation away and back (without needing to replay the cutscene).
  // Placed after `state` is declared but before early returns so hook order
  // is always stable across renders.
  useEffect(() => {
    if (checkedInitialSummonRef.current) return;
    if (!state) return;
    checkedInitialSummonRef.current = true;
    const pending: Array<{ eventId: string; luminaryId: string }> =
      (state as any)?.pendingSummonEvents ?? [];
    for (const evt of pending) {
      const lum = (state as any).luminaries?.find((l: any) => l.id === evt.luminaryId);
      if (lum) {
        enqueueSummonRef.current(
          evt.luminaryId, lum.name, lum.domain ?? '',
          lum.oblivion ? -lum.oblivion : lum.lumens, lum.flavor ?? '', evt.eventId, false,
        );
      }
    }
    // Seed idle overlays for Luminaries already claimed before this page load.
    // Exclude any that still have a pending summon event — they will self-add
    // to claimedThisSession when their cutscene completes.
    const pendingIds = new Set(pending.map(e => e.luminaryId));
    const alreadyClaimed: string[] = [];
    for (const player of (state.players ?? [])) {
      for (const lumId of ((player as any).claimedLuminaryIds ?? [])) {
        if (!pendingIds.has(lumId) && !alreadyClaimed.includes(lumId)) {
          alreadyClaimed.push(lumId);
        }
      }
    }
    if (alreadyClaimed.length > 0) {
      setClaimedThisSession(alreadyClaimed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!state]);

  // ── Action-log affinity-switch sound ──────────────────────────────────────
  // Single canonical trigger for playAffinitySwitch().  Fires when a new
  // "attuned" entry appears in the action log for medium/hard AI players.
  // Human-player toggles are silent because they never match aiPlayerIds.
  useEffect(() => {
    if (!state?.actionLog || !state.players) return;
    const aiPlayerIds = new Set(
      state.players
        .filter((p) => p.aiDifficulty === 'medium' || p.aiDifficulty === 'hard')
        .map((p) => p.playerId),
    );
    const aiAffinityCount = state.actionLog.filter(
      (e) => e.summary.startsWith('switched ') && aiPlayerIds.has(e.playerId),
    ).length;
    if (!aiAffinityLogInitializedRef.current) {
      // First run: snapshot existing entries so we don't replay history as sound.
      aiAffinityLogInitializedRef.current = true;
    } else if (aiAffinityCount > seenAiAffinityLogCountRef.current) {
      gameAudio.playAffinitySwitch();
    }
    seenAiAffinityLogCountRef.current = aiAffinityCount;
  }, [state?.actionLog]);

  // ── Undo hint trigger ─────────────────────────────────────────────────────
  // Must live here — before the early returns — so hook order is stable across
  // renders when state/session are null on the first render cycle.
  const crystalQueueActive = Object.keys(selectedCrystals).length > 0;
  useEffect(() => {
    if (!crystalQueueActive) {
      setShowUndoHint(false);
      return;
    }
    if (!localStorage.getItem('luminae_undo_hint_seen')) {
      localStorage.setItem('luminae_undo_hint_seen', '1');
      setShowUndoHint(true);
      const timer = setTimeout(() => setShowUndoHint(false), 4000);
      return () => clearTimeout(timer);
    }
    return;
  }, [crystalQueueActive]);

  // ── Pre-early-return derived state ────────────────────────────────────────
  // actionsLocked / isMyTurn / me / effectiveCost / canAffordCard are all
  // computed here — before the early returns — so the hint useEffects below
  // have stable closure references on every render regardless of whether
  // state has loaded yet.  When state is null the null-safe forms produce
  // safe false / undefined values, and the early returns below still fire.
  const actionsLocked = !!turnAnnouncement;
  const summonGateActive = summonQueue.length > 0;
  summonQueueLenRef.current = summonQueue.length;
  const isActivePlayer = !!state && !!session && state.status === 'playing' &&
    state.players[state.currentPlayerIndex]?.playerId === session.playerId;
  const isMyTurn = isActivePlayer && !actionsLocked && !summonGateActive;
  const me = state?.players.find(p => p.playerId === session?.playerId);

  const effectiveCost = (card: ArtifactCard, p: GamePlayerState) => {
    const luminaryAffinities: LuminaryActiveState[] = (state as any)?.luminaryAffinities ?? [];
    const turnCount: number = (state as any)?.turnCount ?? 0;
    const out: Record<string, number> = {};
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
      let bonus = p.bonuses[c as keyof CrystalCounts] ?? 0;
      for (const la of luminaryAffinities) {
        if (la.ownerId === p.playerId && la.activeAffinity === c && turnCount > la.summonedAtTurnCount) {
          bonus++;
        }
      }
      out[c] = Math.max(0, (card.cost[c as keyof CrystalCounts] ?? 0) - bonus);
    }
    return out;
  };
  const canAffordCard = (card: ArtifactCard, p: GamePlayerState): boolean => {
    const cost = effectiveCost(card, p);
    let fluxNeeded = 0;
    for (const [c, need] of Object.entries(cost)) {
      const have = p.crystals[c as keyof CrystalCounts] ?? 0;
      if (have < need) fluxNeeded += need - have;
    }
    return fluxNeeded <= (p.crystals.flux ?? 0);
  };

  // ── Reserve hint ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (pendingSheetAction === 'reserve') {
      if (!localStorage.getItem('luminae_reserve_hint_seen')) {
        localStorage.setItem('luminae_reserve_hint_seen', '1');
        setShowReserveHint(true);
      }
    } else {
      setShowReserveHint(false);
    }
  }, [pendingSheetAction]);

  // ── Forge hint ────────────────────────────────────────────────────────────
  useEffect(() => {
    const affordable = isMyTurn && selectedCard && me && canAffordCard(selectedCard.card, me);
    if (affordable) {
      if (!localStorage.getItem('luminae_forge_hint_seen')) {
        localStorage.setItem('luminae_forge_hint_seen', '1');
        setShowForgeHint(true);
      }
    } else {
      setShowForgeHint(false);
    }
  }, [isMyTurn, selectedCard, me]);

  processUpdateRef.current = (newState: GameState) => {
    const prev = prevStateRef.current;
    const isRematch = prev?.status === 'finished' && newState.status === 'playing';
    if (prev && newState.version <= prev.version && !isRematch) return;
    if (isRematch) {
      initialTurnFiredRef.current = false;
      checkedInitialSummonRef.current = false;
      handledSummonEventIdsRef.current = new Set();
      pendingSuppressLumIdsRef.current = new Set();
      stateQueueRef.current = [];
      setClaimedThisSession([]);
    }
      const action = newState.lastAction;
      const isMarketAction = action && (
        action.type === 'purchase_card' ||
        (action.type === 'reserve_card' && action.cardId)
      );

      if (prev && isMarketAction && action.cardId) {
        const cardId = action.cardId as string;
        const marketsOld: Record<number, (ArtifactCard | null)[]> = {
          1: prev.marketTier1, 2: prev.marketTier2, 3: prev.marketTier3,
        };
        const marketsNew: Record<number, (ArtifactCard | null)[]> = {
          1: newState.marketTier1, 2: newState.marketTier2, 3: newState.marketTier3,
        };
        for (const tierStr of ['1', '2', '3'] as const) {
          const tier = Number(tierStr);
          const oldCards = marketsOld[tier];
          const idx = oldCards.findIndex((c: ArtifactCard | null) => c?.id === cardId);
          if (idx >= 0) {
            const exitCard = oldCards[idx]!;
            const el = document.querySelector(`[data-card-id="${cardId}"]`);
            const rect = el?.getBoundingClientRect();
            const player = (newState.players as GamePlayerState[]).find(
              (p) => p.playerId === (action.playerId as string),
            );
            const gotFlux = action.type === 'reserve_card' &&
              (newState.crystalBank.flux ?? 0) < (prev.crystalBank.flux ?? 0);

            cardActionBurstKeyRef.current += 1;
            setAnimEndTime(4300);
            setCardActionBurst({
              key: cardActionBurstKeyRef.current,
              card: exitCard,
              tier,
              actionType: action.type === 'purchase_card' ? 'purchase' : 'reserve',
              playerName: player?.playerName ?? 'Unknown',
              avatarId: player?.avatarId ?? null,
              lumens: exitCard.lumens ?? 0,
              gotFlux,
              startRect: rect
                ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
                : { x: window.innerWidth / 2 - 56, y: window.innerHeight / 2 - 80, w: 112, h: 160 },
            });

            if (gotFlux) gameAudio.playFluxCoin();
            if (action.type === 'purchase_card') {
              gameAudio.playCardPurchased();
            } else {
              gameAudio.playCardReserved();
            }

            for (const t of cardAnimTimersRef.current) clearTimeout(t);
            cardAnimTimersRef.current = [];
            setHiddenSlots(new Set());
            setFlippingCards(new Set());
            setDealingCard(null);

            if (action.type === 'purchase_card') {
              const bonusColor = exitCard.bonusColor as GemKey;
              if (bonusColor && bonusColor !== 'flux') {
                const tBonus = setTimeout(() => gameAudio.playBonusSound(bonusColor), 2500);
                cardAnimTimersRef.current.push(tBonus);
              }
            }

            const slotKey = `${tier}-${idx}`;
            setHiddenSlots(new Set([slotKey]));

            const seq = cardActionBurstKeyRef.current;
            const newCard = marketsNew[tier][idx];
            const t1 = setTimeout(() => {
              if (cardActionBurstKeyRef.current !== seq) return;
              setCardActionBurst(null);
              if (newCard) {
                const deckEl = document.querySelector(`[data-deck-tier="${tier}"]`);
                const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
                const deckR = deckEl?.getBoundingClientRect();
                const slotR = slotEl?.getBoundingClientRect();
                if (deckR && slotR) {
                  setDealingCard({
                    card: newCard,
                    tier,
                    deckRect: { x: deckR.left, y: deckR.top, w: deckR.width, h: deckR.height },
                    slotRect: { x: slotR.left, y: slotR.top, w: slotR.width, h: slotR.height },
                  });
                  gameAudio.playCardDraw();
                } else {
                  // Fallback: flip in place if DOM elements not found
                  setHiddenSlots(new Set());
                  setFlippingCards(new Set([newCard.id]));
                  gameAudio.playCardDraw();
                  const t2 = setTimeout(() => {
                    if (cardActionBurstKeyRef.current !== seq) return;
                    setFlippingCards(new Set());
                  }, 800);
                  cardAnimTimersRef.current.push(t2);
                }
              } else {
                setHiddenSlots(new Set());
              }
            }, 3500);
            cardAnimTimersRef.current.push(t1);
            break;
          }
        }
      }

      // Detect planned action cancellation for the local player and show a toast.
      const myNewPlayer = (newState.players as GamePlayerState[]).find(p => p.playerId === session?.playerId);
      const myOldPlayer = prev ? (prev.players as GamePlayerState[]).find(p => p.playerId === session?.playerId) : null;
      const newCancelReason = (myNewPlayer as any)?.plannedActionCancelReason;
      const oldCancelReason = (myOldPlayer as any)?.plannedActionCancelReason;
      if (newCancelReason && newCancelReason !== oldCancelReason) {
        setTimeout(() => toast({ variant: 'destructive', title: 'Planned move cancelled', description: newCancelReason }), 150);
      }

      queryClient.setQueryData(getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }), newState);
      prevStateRef.current = newState;

      if (newState.status === 'finished' && (prev?.status ?? state?.status) !== 'finished') {
        // Count summon events that will actually be dispatched to enqueueSummon
        // in the loop below (not yet in handledSummonEventIdsRef means not deduped).
        const incomingPending: Array<{ eventId: string }> = (newState as any).pendingSummonEvents ?? [];
        const toEnqueue = incomingPending.filter(
          evt => !handledSummonEventIdsRef.current.has(evt.eventId)
        ).length;
        const hasPendingSummons = toEnqueue > 0 || summonQueueLenRef.current > 0 || enqueuingCountRef.current > 0;
        if (hasPendingSummons) {
          // Register in-flight dispatches BEFORE the enqueue loop below runs,
          // so the flush effect cannot fire before the RAFs land in summonQueue.
          enqueuingCountRef.current += toEnqueue;
          // Capture the sealing Luminary's summonColor for the fanfare.
          // We grab the last *new* event's Luminary (same filter used for toEnqueue).
          const allPendingEvts: Array<{ eventId: string; luminaryId: string }> =
            (newState as any).pendingSummonEvents ?? [];
          const newPendingEvts = allPendingEvts.filter(
            e => !handledSummonEventIdsRef.current.has(e.eventId)
          );
          if (newPendingEvts.length > 0) {
            const lastEvt = newPendingEvts[newPendingEvts.length - 1];
            const sealingLum = newState.luminaries.find(l => l.id === lastEvt.luminaryId);
            pendingGameOverLumColorRef.current = (sealingLum as any)?.summonColor ?? '';
          }
          // Defer: the flush useEffect below will fire win audio and clear the
          // hold once enqueuingCount reaches zero AND the queue drains.
          setPendingGameOver(true);
        } else {
          cancelTurnAnnouncement();
          gameAudio.playWin();
        }
      }

      // Detect newly arrived pendingSummonEvents and start cutscenes for ALL players.
      // The dedup guard in enqueueSummon prevents re-enqueueing the same event.
      {
        const prevPending: Array<{ eventId: string; luminaryId: string }> =
          (prev as any)?.pendingSummonEvents ?? [];
        const newPending: Array<{ eventId: string; luminaryId: string; claimedByPlayerId: string }> =
          (newState as any)?.pendingSummonEvents ?? [];

        for (const evt of newPending) {
          // Only enqueue cutscenes for events that weren't in the previous state.
          // Dedup against replaying the same eventId is handled inside enqueueSummon
          // via handledSummonEventIdsRef — that is the correct dedup boundary.
          // NOTE: do NOT gate on claimedLuminaryIds here. The engine pushes the
          // luminary into both player.luminaries AND pendingSummonEvents in the same
          // atomic state update, so isAlreadyClaimed would always be true for a live
          // summon and would suppress every cutscene.
          const alreadyKnown = prevPending.some(e => e.eventId === evt.eventId);
          if (!alreadyKnown) {
            // Synchronously mark this luminary as suppressed BEFORE any RAF fires.
            // This ensures the portal doesn't flash during the frames between the
            // queryClient.setQueryData re-render and the setSummonQueue call.
            if (!handledSummonEventIdsRef.current.has(evt.eventId)) {
              pendingSuppressLumIdsRef.current.add(evt.luminaryId);
            }
            const lum = newState.luminaries.find(l => l.id === evt.luminaryId);
            if (lum) {
              enqueueSummon(
                evt.luminaryId,
                lum.name,
                (lum as any).domain ?? '',
                lum.oblivion ? -lum.oblivion : lum.lumens,
                (lum as any).flavor ?? '',
                evt.eventId,
                false,
              );
            }
          }
        }
      }

      if (action && (action.type === 'take_three_crystals' || action.type === 'take_two_crystals')) {
        const takeKey = `${action.type}-${action.playerId}-${newState.version}`;
        if (takeKey !== lastTakeBurstActionRef.current) {
          lastTakeBurstActionRef.current = takeKey;
          const actorId = action.playerId as string | undefined;
          // Only animate for opponents — local player's burst fires optimistically
          // from the button-click path. Planned harness actions are intentionally
          // silent: they execute at turn start and the board update speaks for itself.
          if (actorId && actorId !== session?.playerId) {
            const player = (newState.players as GamePlayerState[]).find((p) => p.playerId === actorId);
            if (player) {
              let crystals: Partial<CrystalCounts> = {};
              if (action.type === 'take_three_crystals') {
                crystals = (action.crystals as Partial<CrystalCounts>) ?? {};
              } else {
                const color = action.crystal as string;
                if (color) crystals = { [color]: 2 };
              }
              playGemBurst(crystals, player.playerName, player.avatarId ?? null);
            }
          }
        }
      }

      const lastActionKey = action ? JSON.stringify(action) : null;
      if (lastActionKey && lastActionKey !== reserveBurstActionRef.current) {
        reserveBurstActionRef.current = lastActionKey;
        if (action?.type === 'reserve_card' && !action.cardId) {
          const playerId = action.playerId as string | undefined;
          const player = (newState.players as GamePlayerState[]).find((p) => p.playerId === playerId);
          if (player) {
            const gotFlux = (newState.crystalBank.flux ?? 0) < ((prev ?? state)?.crystalBank.flux ?? 0);
            const tier = Number(action.tier ?? 1) as 1 | 2 | 3;
            reserveBurstKeyRef.current += 1;
            setAnimEndTime(3500);
            setReserveBurst({
              key: reserveBurstKeyRef.current,
              tier,
              gotFlux,
              playerId: player.playerId,
              playerName: player.playerName,
              avatarId: player.avatarId ?? null,
            });
            if (gotFlux) gameAudio.playFluxCoin();
            setTimeout(() => setReserveBurst(null), 3500);
          }
        }
      }

      if (newState.status === 'playing' && newState.lastAction && newState.currentPlayerIndex !== (prev?.currentPlayerIndex ?? state?.currentPlayerIndex)) {
        const nextPlayer = newState.players[newState.currentPlayerIndex];
        if (nextPlayer) {
          const isMe = nextPlayer.playerId === session?.playerId;
          const key = `ws-${newState.currentPlayerIndex}-${newState.version}`;
          if (isMe) {
            fireTurnAnnouncement(key, nextPlayer.playerName, nextPlayer.avatarId ?? null, true);
          }
        }
      }
  };

  drainQueueFnRef.current = () => {
    queueTimerRef.current = null;
    if (stateQueueRef.current.length === 0) return;
    const remaining = animationEndTimeRef.current - Date.now();
    // Also pause draining while a summon cutscene is actively playing.
    const summonActive = summonQueue.length > 0;
    if (remaining > 50 || pendingTurnAnnounceRef.current || summonActive) {
      const delay = remaining > 50 ? remaining + 100 : summonActive ? 500 : 200;
      queueTimerRef.current = setTimeout(() => drainQueueFnRef.current(), delay);
      return;
    }
    const next = stateQueueRef.current.shift()!;
    processUpdateRef.current(next);
    if (stateQueueRef.current.length > 0) {
      const nextRemaining = animationEndTimeRef.current - Date.now();
      queueTimerRef.current = setTimeout(
        () => drainQueueFnRef.current(),
        Math.max(nextRemaining + 100, 100)
      );
    }
  };

  // ── Rematch vote state ─────────────────────────────────────────────────────
  const [rematchVote, setRematchVote] = useState<RematchVoteUpdate | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votePending, setVotePending] = useState(false);

  useGameWebsocket({
    roomId: roomId!,
    sessionToken: session?.sessionToken || '',
    onStateUpdate: (newState) => {
      const remaining = animationEndTimeRef.current - Date.now();
      const queueBusy = stateQueueRef.current.length > 0 || !!queueTimerRef.current;
      if (remaining > 50 || queueBusy) {
        stateQueueRef.current.push(newState);
        // Pre-hide the market slot that is about to receive a newly dealt card.
        // Without this, queryClient.setQueryData (below) triggers a React render
        // that shows the new card in the slot before the deal animation has a
        // chance to run — causing a premature reveal.  By calling setHiddenSlots
        // here in the same synchronous block, React 18 batches both updates into
        // one render so the slot is hidden the moment the new card lands in state.
        const eagerAction = newState.lastAction;
        if (eagerAction && (
          eagerAction.type === 'purchase_card' ||
          (eagerAction.type === 'reserve_card' && eagerAction.cardId)
        )) {
          const eagerCardId = eagerAction.cardId as string;
          const prevMarkets: Record<number, (ArtifactCard | null)[]> = {
            1: prevStateRef.current?.marketTier1 ?? [],
            2: prevStateRef.current?.marketTier2 ?? [],
            3: prevStateRef.current?.marketTier3 ?? [],
          };
          for (const tierStr of ['1', '2', '3'] as const) {
            const tier = Number(tierStr);
            const idx = (prevMarkets[tier] as (ArtifactCard | null)[]).findIndex(
              (c: ArtifactCard | null) => c?.id === eagerCardId,
            );
            if (idx >= 0) {
              const eagerSlotKey = `${tier}-${idx}`;
              setHiddenSlots(prev => new Set([...prev, eagerSlotKey]));
              break;
            }
          }
        }
        // Eagerly apply the new state to the data cache so that affordability
        // calculations and the planning UI (canAffordCard / "Plan: Forge" button)
        // always reflect the latest server state even while an animation is still
        // playing.  Visual-only state (hiddenSlots, flippingCards, cardActionBurst,
        // summon cutscene) is derived exclusively from processUpdate, which is still
        // gated by the animation queue, so animations are completely unaffected.
        queryClient.setQueryData(
          getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }),
          newState,
        );
        if (!queueTimerRef.current) {
          const delay = remaining > 50 ? remaining + 100 : 100;
          queueTimerRef.current = setTimeout(() => drainQueueFnRef.current(), delay);
        }
      } else {
        processUpdateRef.current(newState);
      }
    },
    onPlayerKicked: (playerId) => {
      if (playerId === session?.playerId) {
        toast({ title: "Kicked", description: "You were kicked from the room." });
        setLocation('/');
      }
    },
    onRematchVoteUpdate: (data) => {
      setRematchVote(data);
    },
    onRematchStarted: (_state, _sessionStats) => {
      // State was already forwarded to onStateUpdate. Reset vote UI.
      setRematchVote(null);
      setHasVoted(false);
      setVotePending(false);
    },
    onRematchCancelled: () => {
      setRematchVote(null);
      setHasVoted(false);
      setVotePending(false);
      toast({ title: 'Rematch cancelled', description: 'Not enough players confirmed. The game has ended.' });
    },
    onRematchDeclined: (sessionStats) => {
      // This player was not included — send them home after a brief message
      toast({ title: 'Not included', description: 'The other players started a new game without you.' });
      setTimeout(() => setLocation('/'), 3000);
    },
  });

  const submitAction = useSubmitAction();

  // ── Summon cutscene duration used for the animation barrier ───────────────
  const SUMMON_CUTSCENE_DURATION_MS = 12_000;

  // ── enqueueSummon ─────────────────────────────────────────────────────────
  // Shared path for both real game events (detected via pendingSummonEvents)
  // and the dev Summon Test panel.
  //
  // Dedup guard: skips any eventId already in handledSummonEventIdsRef.
  // Animation barrier: if other animations are running, delays the DOM
  // measurement and queue push until they complete.
  //
  // Sequence:
  //   1. Dedup check + mark eventId handled
  //   2. Wait for any running animation barrier to expire
  //   3. setActiveTab('board')          — mount LuminaryCard elements
  //   4. double rAF                     — let React commit + browser layout
  //   5. el.scrollIntoView (instant)    — bring card into view on both axes
  //   6. one rAF                        — let scroll settle
  //   7. getBoundingClientRect()        — fresh measurement
  //   8. setSummonQueue + setAnimEndTime — start the cutscene; block state drains
  //
  // If the element is missing after switching tabs, falls back to viewport-centre.
  const enqueueSummon = (
    lumId: string,
    lumName: string,
    lumDomain: string,
    lumLumens: number,
    lumFlavor: string,
    eventId: string,
    isDevTest: boolean,
  ) => {
    // 1. Dedup guard (skip for dev tests which intentionally replay)
    if (!isDevTest) {
      if (handledSummonEventIdsRef.current.has(eventId)) {
        console.log(`[Luminae] enqueueSummon: duplicate eventId="${eventId}" — skipped`);
        return;
      }
      handledSummonEventIdsRef.current.add(eventId);
    }

    console.log(`[Luminae] enqueueSummon: queueing lumId="${lumId}" eventId="${eventId}" isDevTest=${isDevTest}`);

    const doEnqueue = () => {
      setActiveTab('board');                         // 3. ensure board tab mounts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {                // 4. React commit + layout
          const el = document.querySelector(
            `[data-luminary-id="${lumId}"]`
          ) as HTMLElement | null;

          if (!el) {
            console.warn(
              `[Luminae] enqueueSummon: no DOM element for luminary "${lumId}". ` +
              'Falling back to viewport centre.'
            );
            pendingSuppressLumIdsRef.current.delete(lumId);
            setSummonQueue(q => [
              ...q,
              { id: lumId, name: lumName, domain: lumDomain,
                lumens: lumLumens, flavor: lumFlavor, cardRect: undefined, eventId, isDevTest },
            ]);
            // Signal that this event has landed in the queue.
            enqueuingCountRef.current = Math.max(0, enqueuingCountRef.current - 1);
            setAnimEndTime(SUMMON_CUTSCENE_DURATION_MS); // 8. block state drains
            return;
          }

          // 5. Scroll into view — browser handles both scroll containers at once.
          el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });

          requestAnimationFrame(() => {             // 6. settle
            const rect = el.getBoundingClientRect();
            const cardRectVal = rect.width > 0
              ? { cx: rect.left + rect.width / 2,
                  cy: rect.top  + rect.height / 2,
                  w:  rect.width }
              : undefined;

            if (!cardRectVal) {
              console.warn(
                `[Luminae] enqueueSummon: element for "${lumId}" has zero width ` +
                'after scroll. Falling back to viewport centre.'
              );
            }

            pendingSuppressLumIdsRef.current.delete(lumId);
            setSummonQueue(q => [                   // 7. start the cutscene
              ...q,
              { id: lumId, name: lumName, domain: lumDomain,
                lumens: lumLumens, flavor: lumFlavor, cardRect: cardRectVal, eventId, isDevTest },
            ]);
            // Signal that this event has landed in the queue.
            enqueuingCountRef.current = Math.max(0, enqueuingCountRef.current - 1);
            setAnimEndTime(SUMMON_CUTSCENE_DURATION_MS); // 8. block state drains
          });
        });
      });
    };

    // 2. Respect animation barrier — delay if other animations are active.
    const animBarrier = animationEndTimeRef.current - Date.now();
    if (animBarrier > 50) {
      console.log(`[Luminae] enqueueSummon: delaying ${Math.round(animBarrier)}ms for animation barrier`);
      setTimeout(doEnqueue, animBarrier + 100);
    } else {
      doEnqueue();
    }
  };
  // Keep the ref in sync so the pre-early-return useEffect can call it.
  enqueueSummonRef.current = enqueueSummon;

  // ── Deferred game-over flush ───────────────────────────────────────────────
  // When a Luminary summon and the win condition arrive in the same state
  // update, `pendingGameOver` is set to hold back the win overlay and win
  // audio until the summon cutscene completes. This effect fires the deferred
  // actions as soon as the summon queue fully drains.
  useEffect(() => {
    // Only flush when the queue is fully drained AND no events are still mid-RAF
    // chain waiting to be pushed into the queue. enqueuingCountRef drops to zero
    // synchronously when each event lands in setSummonQueue (inside enqueueSummon).
    if (
      pendingGameOver &&
      summonQueue.length === 0 &&
      enqueuingCountRef.current === 0 &&
      !fanfareFiredForGameOverRef.current
    ) {
      fanfareFiredForGameOverRef.current = true;
      cancelTurnAnnouncement();
      // Play a short affinity fanfare for the sealing Luminary.
      // Delay releasing pendingGameOver (and hence the win overlay) until the
      // fanfare finishes (~1.3 s), so the overlay fades in after — not during —
      // the fanfare. playWin() fires in the same timeout, immediately after the
      // overlay is released. If no color was captured (edge case), the fanfare
      // gracefully falls back to the flux/default voice.
      gameAudio.playLuminaryFanfare(pendingGameOverLumColorRef.current);
      setTimeout(() => {
        pendingGameOverLumColorRef.current = '';
        fanfareFiredForGameOverRef.current = false;
        setPendingGameOver(false);
        gameAudio.playWin();
      }, 1400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summonQueue.length, pendingGameOver]);

  const playGemBurst = (crystals: Partial<CrystalCounts>, playerName: string, avatarId: string | null) => {
    const gems: GemKey[] = [];
    for (const [color, count] of Object.entries(crystals)) {
      if (color === 'flux') continue;
      const gem = color as GemKey;
      const total = count ?? 0;
      for (let i = 0; i < total; i += 1) gems.push(gem);
    }
    if (gems.length === 0) return;
    if (gemBurstTimerRef.current) clearTimeout(gemBurstTimerRef.current);
    gemBurstKeyRef.current += 1;
    const seq = gemBurstKeyRef.current;
    setGemBurst({ key: seq, gems, playerName, avatarId });
    gameAudio.playChipsCollected();
    const totalDuration = (gems.length - 1) * 780 + 1250 + 500 + 50;
    setAnimEndTime(totalDuration);
    gemBurstTimerRef.current = setTimeout(() => {
      if (gemBurstKeyRef.current === seq) setGemBurst(null);
      gemBurstTimerRef.current = null;
    }, totalDuration);
  };

  if (error) {
    return <div className="h-[100dvh] flex items-center justify-center text-destructive">Error loading game.</div>;
  }

  if (!state || !session) {
    return <div className="h-[100dvh] flex items-center justify-center text-muted-foreground animate-pulse">Loading board...</div>;
  }

  if (!prevStateRef.current) prevStateRef.current = state;

  const currentPlayerName = state.players[state.currentPlayerIndex]?.playerName ?? '';
  const oblivionRows: Array<{ name: string; amount: number }> = (state.luminaries ?? [])
    .filter(lum => (lum.oblivion ?? 0) > 0 &&
      state.players.some(p => (p.claimedLuminaryIds ?? []).includes(lum.id)))
    .map(lum => ({ name: lum.name, amount: lum.oblivion! }));
  const totalOblivion = oblivionRows.reduce((s, r) => s + r.amount, 0);
  const eminenceBreakdown: EminenceBreakdown = {
    artifacts: (me?.purchasedCards ?? []).reduce((sum, card) => sum + (card.lumens ?? 0), 0),
    luminaries: (me?.claimedLuminaryIds ?? []).reduce((sum, lumId) => {
      const lum = state.luminaries.find((l) => l.id === lumId);
      if (lum?.oblivion) return sum;
      return sum + (lum?.lumens ?? 0);
    }, 0),
    oblivionRows,
    other: 0,
  };
  eminenceBreakdown.other = Math.max(0, (me?.lumens ?? 0) - eminenceBreakdown.artifacts - eminenceBreakdown.luminaries + totalOblivion);

  const handleCrystalClick = (color: keyof CrystalCounts) => {
    if ((!isMyTurn && !canPlan) || color === 'flux' || !state) return;
    const inBank = state.crystalBank[color] ?? 0;

    if (actionMode === 'take2') {
      if (selectedCrystals[color] === 2) { setSelectedCrystals({}); setCrystalHistory([]); setPrePromotionHistory(null); setActionMode('none'); }
      else if (inBank >= 4) { setSelectedCrystals({ [color]: 2 }); setCrystalHistory([color, color]); gameAudio.playCrystalPicked(color as GemKey); }
      return;
    }

    const current = selectedCrystals[color] ?? 0;
    if (current > 0) {
      const next = { ...selectedCrystals };
      delete next[color];
      const empty = Object.keys(next).length === 0;
      setSelectedCrystals(next);
      setCrystalHistory(prev => prev.filter(c => c !== color));
      if (empty) setActionMode('none');
      return;
    }

    if (inBank <= 0) return;
    const distinctCount = Object.keys(selectedCrystals).length;
    if (distinctCount >= 3) return;
    setSelectedCrystals({ ...selectedCrystals, [color]: 1 });
    setCrystalHistory(prev => [...prev, color]);
    setActionMode(actionMode === 'none' ? 'take3' : actionMode);
    gameAudio.playCrystalPicked(color as GemKey);
  };

  const handleUndoCrystal = () => {
    if (crystalHistory.length === 0) return;
    // If undoing a take-2 that was created via promoteToTake2, restore the
    // pre-promotion snapshot (which may be empty) rather than removing just
    // one history entry and leaving a stale single-crystal selection.
    if (actionMode === 'take2' && prePromotionHistory !== null) {
      const restored = prePromotionHistory;
      setCrystalHistory(restored);
      setPrePromotionHistory(null);
      if (restored.length === 0) {
        setSelectedCrystals({});
        setActionMode('none');
      } else {
        const rebuilt: Partial<CrystalCounts> = {};
        for (const c of restored) rebuilt[c] = (rebuilt[c] ?? 0) + 1;
        setSelectedCrystals(rebuilt);
        const restoredIsTake2 = Object.keys(rebuilt).length === 1 && rebuilt[restored[0]] === 2;
        setActionMode(restoredIsTake2 ? 'take2' : 'take3');
      }
      return;
    }
    const newHistory = crystalHistory.slice(0, -1);
    setCrystalHistory(newHistory);
    if (newHistory.length === 0) {
      setSelectedCrystals({});
      setActionMode('none');
    } else {
      const rebuilt: Partial<CrystalCounts> = {};
      for (const c of newHistory) {
        rebuilt[c] = (rebuilt[c] ?? 0) + 1;
      }
      setSelectedCrystals(rebuilt);
      const isTake2 = Object.keys(rebuilt).length === 1 && rebuilt[newHistory[0]] === 2;
      setActionMode(isTake2 ? 'take2' : 'take3');
    }
  };

  const promoteToTake2 = (color: GemKey) => {
    if (!state || (state.crystalBank[color] ?? 0) < 4) return;
    setPrePromotionHistory(crystalHistory);
    setSelectedCrystals({ [color]: 2 });
    setCrystalHistory([color, color]);
    setActionMode('take2');
    gameAudio.playCrystalPicked(color);
  };

  const executeAction = async (payload: any) => {
    try {
      const normalized = { ...payload };
      delete normalized._tier;
      if (normalized.crystals) {
        normalized.crystals = { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0, ...normalized.crystals };
      }
      await submitAction.mutateAsync({ roomId: roomId!, data: { sessionToken: session.sessionToken, ...normalized } });
      setActionMode('none');
      setSelectedCrystals({});
      setCrystalHistory([]);
      setPrePromotionHistory(null);
      // resolve_summon fires from onComplete for every player who watched the
      // cutscene (including opponents who skipped the view and may be browsing
      // cards). Do not close their card sheet as a side-effect of that action.
      if (payload.type !== 'resolve_summon') setSelectedCard(null);
      if (payload.type === 'purchase_reserved') {
        gameAudio.playCardPurchased();
        const bonusColor = payload.cardRef?.bonusColor as GemKey | undefined;
        if (bonusColor && bonusColor !== 'flux') {
          const tBonus = setTimeout(() => gameAudio.playBonusSound(bonusColor), 800);
          cardAnimTimersRef.current.push(tBonus);
        }
        const lumens = payload.cardRef?.lumens ?? 0;
        const name = payload.cardRef?.name ?? 'Artifact';
        burstKeyRef.current += 1;
        setAnimEndTime(1400);
        setPurchaseBurst({ key: burstKeyRef.current, lumens, name });
        setTimeout(() => setPurchaseBurst(null), 1400);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message });
    }
  };

  const queueLegality: { ok: boolean; reason: string; actionType: null | 'take3' | 'take2' } = (() => {
    if (!me) return { ok: false, reason: '', actionType: null };
    const total = Object.values(selectedCrystals).reduce((a, b) => a + (b ?? 0), 0);
    if (total === 0) return { ok: false, reason: '', actionType: null };
    const distinct = Object.keys(selectedCrystals);
    const handTotal = Object.values(me.crystals).reduce((a, b) => a + b, 0);
    if (handTotal + total > 10) return { ok: false, reason: `Hand limit is 10 (you'd have ${handTotal + total})`, actionType: null };
    if (distinct.length === 1 && (selectedCrystals[distinct[0] as keyof CrystalCounts] ?? 0) === 2) {
      const c = distinct[0] as keyof CrystalCounts;
      if ((state.crystalBank[c] ?? 0) >= 4) return { ok: true, reason: `Harness 2 ${GEM_META[c as GemKey].name}`, actionType: 'take2' };
      return { ok: false, reason: `Need 4+ in well to harness 2`, actionType: null };
    }
    if (distinct.every(c => (selectedCrystals[c as keyof CrystalCounts] ?? 0) === 1) && distinct.length <= 3) {
      return { ok: true, reason: distinct.length === 3 ? 'Harness 3 different' : `Harness ${distinct.length}`, actionType: 'take3' };
    }
    return { ok: false, reason: 'Invalid combination', actionType: null };
  })();

  const confirmCrystals = () => {
    if (!queueLegality.ok || !me) return;
    if (queueLegality.actionType === 'take3') {
      playGemBurst(selectedCrystals, me.playerName, session.avatarId ?? null);
      executeAction({ type: 'take_three_crystals', crystals: selectedCrystals });
    } else if (queueLegality.actionType === 'take2') {
      playGemBurst(selectedCrystals, me.playerName, session.avatarId ?? null);
      executeAction({ type: 'take_two_crystals', crystal: Object.keys(selectedCrystals)[0] });
    }
  };

  const gemBurstView = gemBurst?.gems.map((gem, index) => {
    const count = gemBurst.gems.length;
    const spacing = 74;
    const offset = ((count - 1) / 2) * spacing;
    return {
      gem,
      index,
      x: index * spacing - offset,
      delay: index * 0.78 + 0.05,
    };
  }) ?? [];

  // ── computeCosts: returns display costs for the active costMode ──────────
  const computeCosts = (card: ArtifactCard, mode: CostMode): Partial<Record<GemKey, number>> | undefined => {
    if (!me) return undefined;
    if (mode === 'printed') return undefined;
    const afterBonus = effectiveCost(card, me) as Record<string, number>;
    if (mode === 'after_bonuses') return afterBonus as Partial<Record<GemKey, number>>;
    // 'needed_now': after bonuses, subtract held tokens + pre-harvest tally, clamp >= 0
    const out: Partial<Record<GemKey, number>> = {};
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
      const eff = afterBonus[c] ?? 0;
      const held = me.crystals[c as keyof CrystalCounts] ?? 0;
      const harvest = selectedCrystals[c as keyof CrystalCounts] ?? 0;
      out[c as GemKey] = Math.max(0, eff - held - harvest);
    }
    return out;
  };
  const canReserveMore = (p: GamePlayerState) => p.reservedCards.length < 3;

  const handleBuy = (card: ArtifactCard, fromReserve = false) => {
    if (!isMyTurn) return;
    executeAction({ type: fromReserve ? 'purchase_reserved' : 'purchase_card', cardId: card.id, cardRef: card });
  };
  const handleReserveCard = (card: ArtifactCard) => {
    if (!isMyTurn) return;
    executeAction({ type: 'reserve_card', cardId: card.id, _tier: card.tier, tier: card.tier });
  };
  const handleReserveDeck = (tier: number) => {
    if (!isMyTurn) return;
    executeAction({ type: 'reserve_card', tier, _tier: tier });
  };
  const openDeckSheet = (tier: 1 | 2 | 3) => {
    setPendingDeckConfirm(false);
    setSelectedDeckTier(tier);
  };
  const closeDeckSheet = () => {
    setSelectedDeckTier(null);
    setPendingDeckConfirm(false);
  };

  const openCardSheet = (card: ArtifactCard, fromReserve: boolean) => {
    if (!me) return;
    setPendingSheetAction(null);
    setSelectedCard({
      card, fromReserve,
      canBuy: isMyTurn && canAffordCard(card, me),
      canReserve: isMyTurn && !fromReserve && canReserveMore(me),
      effectiveCosts: computeCosts(card, costMode),
    });
  };

  const handleSurrender = () => {
    if (confirm("Surrender? This cannot be undone.")) executeAction({ type: 'surrender' });
  };

  const getPlannedActionSummary = (action: any): string => {
    if (!action) return '';
    const allCards: ArtifactCard[] = [
      ...(state?.marketTier1 ?? []),
      ...(state?.marketTier2 ?? []),
      ...(state?.marketTier3 ?? []),
      ...(me?.reservedCards ?? []),
    ];
    switch (action.type) {
      case 'purchase_card':
      case 'purchase_reserved': {
        const card = allCards.find((c) => c.id === action.cardId);
        return card ? `Forge "${card.name}"` : 'Forge Artifact';
      }
      case 'reserve_card': {
        if (action.cardId) {
          const card = allCards.find((c) => c.id === action.cardId);
          return card ? `Reserve "${card.name}"` : 'Reserve card';
        }
        return action.tier ? `Reserve Tier ${action.tier}` : 'Reserve card';
      }
      case 'take_three_crystals': {
        const crystals = action.crystals ?? {};
        const parts = (CRYSTALS as string[])
          .filter(c => c !== 'flux' && (crystals[c] ?? 0) > 0)
          .map(c => GEM_META[c as GemKey]?.shortName ?? c);
        return parts.length > 0 ? `Harness ${parts.join(', ')}` : 'Harness affinities';
      }
      case 'take_two_crystals':
        return action.crystal
          ? `Harness 2 ${GEM_META[action.crystal as GemKey]?.shortName ?? action.crystal}`
          : 'Harness 2 affinities';
      case 'toggle_luminary_affinity':
        return 'Toggle Luminary affinity';
      default:
        return 'Planned action';
    }
  };

  const handlePlanAction = async (plannedActionData: Record<string, unknown>) => {
    if (!me || !session) return;
    try {
      await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, type: 'plan_action', plannedActionData } as any,
      });
      toast({ title: 'Move planned', description: getPlannedActionSummary(plannedActionData) });
      setSelectedCard(null);
      setSelectedCrystals({});
      setCrystalHistory([]);
      setPrePromotionHistory(null);
      setActionMode('none');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Plan failed', description: err.message });
    }
  };

  const handleCancelPlan = async () => {
    if (!session) return;
    try {
      await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, type: 'cancel_plan' } as any,
      });
      // Optimistically clear the planned action immediately after the server
      // confirms the cancel (HTTP 200). Without this, the UI update is gated
      // behind the animation queue — if a card animation is running it can take
      // up to 4.3 s before the WebSocket state update is drained and rendered.
      queryClient.setQueryData(
        getGetGameStateQueryKey(roomId!, { sessionToken: session.sessionToken }),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            players: (old.players as any[]).map((p) =>
              p.playerId === session.playerId
                ? { ...p, plannedAction: null, plannedActionCancelReason: null }
                : p,
            ),
          };
        },
      );
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Cancel failed', description: err.message ?? 'Something went wrong' });
    }
  };

  const triggerBtnAnim = (target: string, type: 'select' | 'confirm') => {
    setBtnAnimKey(k => k + 1);
    setBtnAnimTarget(target);
    setBtnAnimType(type);
  };

  // canPlan is available to any player whenever the game is active and there is
  // no blocking Luminary summon cutscene. It is intentionally NOT tied to
  // !isActivePlayer or !isMyTurn — planning should be accessible at all times
  // (on your turn, off your turn, during animation locks). Only Luminary
  // cutscenes gate it, because those require player attention.
  const canPlan = state.status === 'playing' && !!me && (!summonGateActive || localSummonSkipped);
  const myPlannedAction = (me as any)?.plannedAction ?? null;

  // Forge / Plan:Forge confirmed-state color — solid affinity color of the card being acted on.
  const _forgeCardMeta = selectedCard
    ? (GEM_META[(selectedCard.card.bonusColor ?? 'pearl') as GemKey] ?? GEM_META.pearl)
    : null;
  const forgeConfirmHex   = _forgeCardMeta?.hex    ?? '#6366f1';
  const forgeConfirmGlow  = _forgeCardMeta?.glowHex ?? '#818cf8';
  const forgeDarkText = _forgeCardMeta
    ? (['pearl', 'emerald', 'flux'] as string[]).includes(_forgeCardMeta.key)
    : false;
  const safePlayers = state.players ?? [];
  const safeLuminaries = state.luminaries ?? [];

  const handleToggleLuminaryAffinity = async (luminaryId: string, affinity: string) => {
    try {
      await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, type: 'toggle_luminary_affinity', luminaryId, affinity: affinity as any },
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Toggle failed', description: err.message });
    }
  };

  const dismissUndoHint = () => {
    setShowUndoHint(false);
  };

  const dismissReserveHint = () => {
    setShowReserveHint(false);
  };

  const dismissForgeHint = () => {
    setShowForgeHint(false);
  };

  const myReservedCount = me?.reservedCards.length ?? 0;
  const myTotalGems = Object.values(me?.crystals ?? {}).reduce((a, b) => a + b, 0);
  const myCardCount = (me as any)?.purchasedCards?.length ?? (me as any)?.purchasedCardIds?.length ?? 0;

  // ---- TABS ----

  const BoardTab = () => {
    return (
    <div className="flex flex-col gap-5 p-3 pb-6">

      {/* Luminaries */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Luminaries</p>
          {(() => {
            const tc: number = (state as any)?.turnCount ?? 0;
            const lumAffinities: LuminaryActiveState[] = (state as any)?.luminaryAffinities ?? [];
            const hasTogglable = lumAffinities.some(la =>
              la.ownerId === session?.playerId && tc > la.summonedAtTurnCount && (la.eligibleAffinities?.length ?? 0) >= 2
            );
            return hasTogglable
              ? <span className="text-[9px] text-white/40 italic">tap card to change affinity ↻</span>
              : null;
          })()}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {safeLuminaries.map(l => {
            const claimedByPlayer = safePlayers.find(p => (p.claimedLuminaryIds ?? []).includes(l.id)) ?? null;
            const claimedByNames = claimedByPlayer ? [claimedByPlayer.playerName] : [];
            const turnCount: number = (state as any)?.turnCount ?? 0;

            // Real server affinity state
            const serverLumAffinity = ((state as any).luminaryAffinities as LuminaryActiveState[] ?? []).find(la => la.luminaryId === l.id) ?? null;
            const isOwnedByMe = claimedByPlayer?.playerId === session?.playerId;
            // isLive: bonus active starting the turn AFTER summoning
            const isLive = !!serverLumAffinity && turnCount > serverLumAffinity.summonedAtTurnCount;
            const canToggle = isOwnedByMe && isLive && (serverLumAffinity?.eligibleAffinities?.length ?? 0) >= 2;

            // Suppress the claimed vortex/portal while a summon cutscene is active
            // for this luminary. The server marks it claimed immediately (for rules /
            // persistence), but visually the portal must not appear until the shatter
            // animation has fully resolved. isSummonInProgress covers every entry in
            // the queue (not just the head) so queued-but-not-yet-playing cutscenes
            // are also suppressed. Dev-test entries (isDevTest=true) have no real
            // claimedByPlayer, so they are excluded to keep the dev preview working.
            const isSummonInProgress = summonQueue.some(e => e.id === l.id && !e.isDevTest)
              || pendingSuppressLumIdsRef.current.has(l.id);

            // Visible claimed state — cleared during active cutscene so the board
            // slot keeps rendering the sealed panel until onComplete fires.
            const visibleClaimedByPlayer = isSummonInProgress ? null : claimedByPlayer;
            const visibleClaimedByNames  = isSummonInProgress ? []   : claimedByNames;

            // Dev-only: synthesize affinity for portal preview without touching server
            const isDevPreviewed = import.meta.env.DEV && previewedPortals.has(l.id) && !visibleClaimedByPlayer;
            const devEligible = isDevPreviewed
              ? (GEM_KEYS.filter(k => k !== 'flux' && (l.requirements[k as GemKey] ?? 0) > 0) as GemKey[])
              : [];
            const devIdx = devPortalAffinityIdx[l.id] ?? 0;
            const devAffinity: LuminaryActiveState | null = (isDevPreviewed && devEligible.length > 0) ? {
              luminaryId: l.id,
              ownerId: 'dev-preview',
              activeAffinity: devEligible[devIdx % devEligible.length] as any,
              eligibleAffinities: devEligible as any,
              summonedAtTurnCount: 0,
            } : null;

            const effectiveLumAffinity     = isDevPreviewed ? devAffinity              : serverLumAffinity;
            const effectiveClaimedByNames  = isDevPreviewed ? ['[Preview]']            : visibleClaimedByNames;
            const effectiveIsOwnedByMe     = isDevPreviewed ? true                     : (isSummonInProgress ? false : isOwnedByMe);
            const effectiveIsLive          = isDevPreviewed ? true                     : (isSummonInProgress ? false : isLive);
            const effectiveCanToggle       = isDevPreviewed ? devEligible.length >= 2  : (isSummonInProgress ? false : canToggle);
            const effectiveClaimedByPlayer = isDevPreviewed ? (me ?? null)             : visibleClaimedByPlayer;

            return (
              <LuminaryCard
                key={l.id}
                luminary={l}
                claimedByNames={effectiveClaimedByNames}
                isReleased={claimedThisSession.includes(l.id)}
                luminaryAffinity={effectiveLumAffinity}
                claimedByPlayer={effectiveClaimedByPlayer}
                isOwnedByMe={effectiveIsOwnedByMe}
                isLive={effectiveIsLive}
                canToggle={effectiveCanToggle}
                costMode={costMode}
                playerBonuses={me?.bonuses}
                onToggle={isDevPreviewed
                  ? (affinity) => {
                      const nextIdx = devEligible.indexOf(affinity as GemKey);
                      if (nextIdx >= 0) setDevPortalAffinityIdx(prev => ({ ...prev, [l.id]: nextIdx }));
                    }
                  : (affinity) => handleToggleLuminaryAffinity(l.id, affinity)
                }
              />
            );
          })}
        </div>
      </div>

      {/* Market rows */}
      <div className="flex flex-col gap-4">
        {/* Cost toggle */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Artifacts · Forge using Affinities</p>
          <div className="flex items-center bg-secondary/60 rounded-full border border-border/40 p-0.5 gap-0.5">
            {([
              { mode: 'printed' as CostMode, label: 'Printed', title: 'Show original printed cost' },
              { mode: 'after_bonuses' as CostMode, label: 'Bonuses', title: 'Cost after your permanent bonuses' },
              { mode: 'needed_now' as CostMode, label: 'Needed', title: 'What you still need after bonuses, tokens, and pre-harness selection' },
            ]).map(({ mode, label, title }) => (
              <button
                key={mode}
                type="button"
                title={title}
                onClick={() => setCostMode(mode)}
                className={`text-[9px] font-semibold px-2 py-0.5 rounded-full transition-colors leading-none ${costMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan queued badge — shown on the card market when a reserve is waiting */}
        <AnimatePresence>
          {myPlannedAction && myPlannedAction.type === 'reserve_card' && (
            <motion.div
              key="reserve-plan-badge"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-950/50 border border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80 shrink-0">Queued</span>
                <span className="text-[10px] text-amber-300/80 truncate">
                  {getPlannedActionSummary(myPlannedAction)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {[
          { tier: 3, cards: state.marketTier3, deck: state.deckCounts.tier3, lore: 'Sovereigns & absolutes — apex relics that bend the cosmos to your will' },
          { tier: 2, cards: state.marketTier2, deck: state.deckCounts.tier2, lore: 'Forged instruments — crucibles and sigils of focused cosmic mastery' },
          { tier: 1, cards: state.marketTier1, deck: state.deckCounts.tier1, lore: 'Fragments & sparks — raw nascent shards that seed any engine' },
        ].map(row => (
          <div key={row.tier}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">Tier {row.tier}</span>
              <span className="text-[9px] text-muted-foreground/50 italic truncate">{row.lore}</span>
              <div className="shrink-0 w-4 h-px bg-border/40" />
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {/* Deck pile */}
              <button
                type="button"
                data-deck-tier={row.tier}
                onClick={() => {
                  if (row.deck === 0 || !me) return;
                  if (!isMyTurn && !canPlan) return;
                  openDeckSheet(row.tier as 1 | 2 | 3);
                }}
                disabled={row.deck === 0 || !me || (!isMyTurn && !canPlan)}
                className="relative shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={row.deck === 0 ? 'Deck empty' : 'View deck — reserve a hidden card'}
              >
                <CardBack count={row.deck} tier={row.tier as 1 | 2 | 3} />
                {(isMyTurn || canPlan) && row.deck > 0 && me && (
                  <div className="absolute inset-x-0 bottom-0 bg-primary/90 text-primary-foreground text-[9px] font-bold uppercase text-center py-1 rounded-b-xl">
                    {isMyTurn ? 'Reserve' : 'Plan'}
                  </div>
                )}
              </button>
              {row.cards.map((c, i) => {
                const slotKey = `${row.tier}-${i}`;
                const isHidden = hiddenSlots.has(slotKey);

                if (isHidden || !c) {
                  return <div key={c?.id ?? `empty-${i}`} data-slot-key={slotKey} className="w-28 h-40 rounded-xl border-2 border-dashed border-border/30 opacity-40 shrink-0" />;
                }

                const isFlipping = flippingCards.has(c.id);
                if (isFlipping) {
                  return (
                    <div key={c.id} data-card-id={c.id} style={{ perspective: '800px' }}>
                      <motion.div
                        initial={{ rotateY: 180, scale: 0.85 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <ArtifactCardView
                          card={c}
                          tier={row.tier}
                          onTap={() => openCardSheet(c, false)}
                          tapped={selectedCard?.card.id === c.id}
                          effectiveCosts={computeCosts(c, costMode)}
                        />
                      </motion.div>
                    </div>
                  );
                }

                return (
                  <div key={c.id} data-card-id={c.id}>
                    <ArtifactCardView
                      card={c}
                      tier={row.tier}
                      onTap={() => openCardSheet(c, false)}
                      tapped={selectedCard?.card.id === c.id}
                      effectiveCosts={computeCosts(c, costMode)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Crystal Bank */}
      <div className="rounded-2xl bg-secondary/40 border border-border/50 backdrop-blur overflow-hidden">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Affinities · Harness cosmic essence</p>
          {(() => {
            const fluxCount = state.crystalBank.flux ?? 0;
            return (
              <div className="flex items-center gap-1.5 opacity-80">
                <MiniGem color="flux" size={14} />
                <span className="text-[10px] font-mono font-bold text-amber-300/80">{fluxCount}</span>
                <span className="text-[9px] text-muted-foreground">Singularity</span>
              </div>
            );
          })()}
        </div>
        <div className="px-3 pb-3 grid grid-cols-5 gap-1">
          {CRYSTALS.filter(c => c !== 'flux').map((c) => {
            const meta = GEM_META[c];
            const count = state.crystalBank[c as keyof CrystalCounts] ?? 0;
            const queued = selectedCrystals[c as keyof CrystalCounts] ?? 0;
            const isPlanningMode = !isActivePlayer && canPlan;
            const selectable = isMyTurn || (!isActivePlayer && canPlan);
            const isEmpty = count === 0 && queued === 0;
            const canTake2 = selectable && count >= 4 && queued !== 2;
            return (
              <div key={c} className="flex flex-col items-center">
                <motion.button
                  type="button"
                  disabled={!selectable || isEmpty}
                  whileTap={selectable && !isEmpty ? { scale: 0.9 } : {}}
                  animate={queued > 0 ? { scale: [1, 1.1, 1], transition: { duration: 0.25 } } : {}}
                  onClick={() => handleCrystalClick(c as keyof CrystalCounts)}
                  className={`relative w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden ${
                    isEmpty ? 'opacity-40' : ''
                  }`}
                  style={
                    queued > 0 && isPlanningMode
                      ? {
                          background: `linear-gradient(160deg, #92400e55 0%, #b4530040 50%, #92400e50 100%)`,
                          border: `2px solid #fbbf24cc`,
                          boxShadow: `0 0 18px #fbbf2488, 0 0 36px #f59e0b33, inset 0 0 14px #92400e44`,
                        }
                      : queued > 0
                      ? {
                          background: `linear-gradient(160deg, ${meta.hex}70 0%, ${meta.hex}45 50%, ${meta.hex}60 100%)`,
                          border: `2px solid ${meta.glowHex}ee`,
                          boxShadow: `0 0 22px ${meta.glowHex}bb, 0 0 48px ${meta.glowHex}55, inset 0 0 18px ${meta.hex}55`,
                        }
                      : isEmpty
                        ? {
                            background: `linear-gradient(160deg, ${meta.hex}0a 0%, transparent 100%)`,
                            border: `1px solid ${meta.hex}18`,
                          }
                        : {
                            background: `linear-gradient(160deg, ${meta.hex}28 0%, ${meta.hex}0c 45%, ${meta.hex}1e 100%)`,
                            border: `1px solid ${meta.glowHex}55`,
                            boxShadow: `inset 0 0 22px ${meta.hex}14, inset 0 1px 0 ${meta.glowHex}30`,
                          }
                  }
                >
                  {/* Top-edge highlight streak */}
                  {!isEmpty && (
                    <div className="absolute inset-x-0 top-0 h-[1px] pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}99, transparent)` }} />
                  )}
                  <img
                    src={meta.image} alt={meta.name}
                    className="w-[58%] h-[58%] object-contain pointer-events-none select-none"
                    style={{
                      filter: isEmpty
                        ? 'grayscale(0.8) opacity(0.4)'
                        : queued > 0
                          ? `drop-shadow(0 0 10px ${meta.glowHex}) drop-shadow(0 0 4px ${meta.glowHex}) brightness(1.3)`
                          : `drop-shadow(0 0 7px ${meta.glowHex}80)`,
                    }}
                    draggable={false}
                  />
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {/* Shadow behind number for readability against colored background */}
                    <span
                      className={`text-sm font-black font-mono leading-none ${isEmpty ? 'text-white/30' : 'text-white'}`}
                      style={isEmpty ? {} : { textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.6)' }}
                    >{count - queued}</span>
                  </div>
                </motion.button>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5 leading-none" style={{ color: `${meta.glowHex}88` }}>
                  {meta.shortName}
                </span>
                {canTake2 && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={(e) => { e.stopPropagation(); promoteToTake2(c); }}
                    className={`mt-0.5 text-[9px] font-bold rounded-full px-2 py-0.5 transition-colors ${isPlanningMode ? 'text-amber-400/80 hover:text-amber-300 bg-amber-400/10 active:bg-amber-400/25' : 'text-primary/80 hover:text-primary bg-primary/10 active:bg-primary/25'}`}
                  >
                    harness 2
                  </motion.button>
                )}
              </div>
            );
          })}
        </div>
        <AnimatePresence>
          {crystalQueueActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-white/10">
                {!isMyTurn && canPlan && (
                  <p className="text-[9px] italic text-amber-400/60 mb-1.5 leading-snug">
                    Planning — plans may be cancelled if the bank changes before your turn.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 flex-1 items-center flex-wrap">
                    {Object.entries(selectedCrystals).map(([c, n]) => (
                      <div key={c} className="flex items-center gap-1 bg-black/50 rounded-full pl-1.5 pr-2 py-0.5 border border-white/10">
                        <MiniGem color={c as GemKey} size={12} />
                        <span className="text-xs font-bold text-white">×{n}</span>
                      </div>
                    ))}
                    <span className={`text-[10px] font-medium ${queueLegality.ok ? 'text-green-400' : 'text-amber-400'}`}>
                      {queueLegality.reason || 'Pick affinities'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0 relative">
                    <AnimatePresence>
                      {showUndoHint && !showForgeHint && !showReserveHint && (
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, y: 6, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          onClick={dismissUndoHint}
                          className="absolute bottom-full mb-1.5 left-0 whitespace-nowrap flex items-center gap-1 bg-black/80 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg backdrop-blur-sm z-10"
                          title="Dismiss hint"
                        >
                          <Undo2 className="h-2.5 w-2.5 text-white/60 shrink-0" />
                          <span>← Back removes the last crystal</span>
                          <span className="text-white/40 ml-0.5">✕</span>
                        </motion.button>
                      )}
                    </AnimatePresence>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg"
                      onClick={handleUndoCrystal}
                      title="Undo last crystal"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg"
                      onClick={() => { setActionMode('none'); setSelectedCrystals({}); setCrystalHistory([]); setPrePromotionHistory(null); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    {isMyTurn ? (
                      (() => {
                        const selKeys = Object.keys(selectedCrystals) as GemKey[];
                        const hasColors = selKeys.length > 0 && queueLegality.ok;
                        const borderColor = hasColors
                          ? `${GEM_META[selKeys[0]].hex}70`
                          : 'rgba(255,255,255,0.18)';
                        const conicGradient = selKeys.length === 1
                          ? `conic-gradient(${GEM_META[selKeys[0]].hex} 0deg, ${GEM_META[selKeys[0]].hex}44 180deg, ${GEM_META[selKeys[0]].hex} 360deg)`
                          : `conic-gradient(${selKeys.map((k, i) => {
                              const deg1 = Math.round((i / selKeys.length) * 360);
                              const deg2 = Math.round(((i + 1) / selKeys.length) * 360);
                              return `${GEM_META[k].hex} ${deg1}deg ${deg2}deg`;
                            }).join(', ')})`;
                        return (
                          <motion.div
                            whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                            className={`relative h-7 px-3 rounded-lg overflow-hidden flex items-center justify-center border transition-all duration-500 shrink-0 ${!queueLegality.ok ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              borderColor,
                              boxShadow: hasColors
                                ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 14px ${GEM_META[selKeys[0]].hex}44`
                                : 'inset 0 1px 0 rgba(255,255,255,0.08)',
                              backdropFilter: 'blur(6px)',
                              WebkitBackdropFilter: 'blur(6px)',
                            }}
                            onClick={queueLegality.ok ? () => {
                              setHarnessPulseKey(k => k + 1);
                              confirmCrystals();
                            } : undefined}
                          >
                            {/* Swirling affinity color fill — remount on press replays flash */}
                            {selKeys.length > 0 && (
                              <div
                                key={harnessPulseKey}
                                className={harnessPulseKey > 0 ? 'harness-press-flash' : ''}
                                style={{ position: 'absolute', width: '220%', height: '220%', top: '-60%', left: '-60%' }}
                              >
                                <div
                                  className="w-full h-full harness-swirl-ring"
                                  style={{
                                    background: conicGradient,
                                    opacity: 0.48,
                                    filter: 'blur(8px)',
                                  }}
                                />
                              </div>
                            )}
                            {/* Glass top-shine */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.13] to-transparent pointer-events-none" />
                            {/* Label */}
                            <span
                              className="relative z-10 text-xs font-bold transition-colors duration-300 select-none"
                              style={{
                                color: hasColors ? '#fff' : 'rgba(255,255,255,0.35)',
                                textShadow: hasColors ? '0 1px 5px rgba(0,0,0,0.85)' : 'none',
                              }}
                            >
                              Harness
                            </span>
                          </motion.div>
                        );
                      })()
                    ) : canPlan && queueLegality.ok ? (
                      <Button
                        size="sm"
                        className="h-7 px-3 rounded-lg text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 ring-1 ring-amber-200 ring-offset-1 ring-offset-black shadow-[0_0_10px_rgba(251,191,36,0.65)] animate-pulse"
                        onClick={() => {
                          if (queueLegality.actionType === 'take3') {
                            handlePlanAction({ type: 'take_three_crystals', crystals: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0, ...selectedCrystals } });
                          } else if (queueLegality.actionType === 'take2') {
                            handlePlanAction({ type: 'take_two_crystals', crystal: Object.keys(selectedCrystals)[0] });
                          }
                        }}
                      >
                        Plan Harness
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isMyTurn && !crystalQueueActive && (
          <div className="px-3 pb-2.5">
            <p className="text-[9px] text-muted-foreground text-center italic">
              Tap to harness affinities · up to 3 different or 2 of the same
            </p>
          </div>
        )}
        {/* Plan queued badge — shown on the affinity bank when a harvest is waiting */}
        <AnimatePresence>
          {myPlannedAction && !crystalQueueActive &&
           (myPlannedAction.type === 'take_three_crystals' || myPlannedAction.type === 'take_two_crystals') && (
            <motion.div
              key="harvest-plan-badge"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mx-3 mb-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-950/50 border border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80 shrink-0">Queued</span>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {myPlannedAction.type === 'take_three_crystals'
                    ? (CRYSTALS as string[])
                        .filter(c => c !== 'flux' && (myPlannedAction.crystals?.[c] ?? 0) > 0)
                        .map(c => <MiniGem key={c} color={c as GemKey} size={12} />)
                    : myPlannedAction.crystal
                      ? <MiniGem color={myPlannedAction.crystal as GemKey} size={12} />
                      : null
                  }
                  <span className="text-[10px] text-amber-300/80 truncate ml-0.5">
                    {getPlannedActionSummary(myPlannedAction)}
                  </span>
                </div>
                <button
                  onClick={handleCancelPlan}
                  className="shrink-0 ml-1 text-amber-400/70 hover:text-amber-300 transition-colors leading-none"
                  aria-label="Cancel harvest plan"
                  title="Cancel plan"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* ── Opponents (always visible on Board tab) ── */}
      {state.players.filter(p => p.playerId !== session?.playerId).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Opponents</p>
          <div className="flex flex-col gap-2">
            {state.players.map((p, i) => {
              if (p.playerId === session?.playerId) return null;
              const isCurrent = state.status === 'playing' && state.currentPlayerIndex === i;
              const totalAffinity = Object.values(p.crystals).reduce((a, b) => a + b, 0);
              const cardCount = (p as any).purchasedCards?.length ?? (p as any).purchasedCardIds?.length ?? 0;
              const reservedCount = p.reservedCards.length;
              const isExpanded = expandedOpponents.has(p.playerId);
              const toggleExpanded = () => {
                setExpandedOpponents((prev) => {
                  const next = new Set(prev);
                  if (next.has(p.playerId)) next.delete(p.playerId);
                  else next.add(p.playerId);
                  return next;
                });
              };
              return (
                <div
                  key={p.playerId}
                  className={`rounded-2xl border p-3 bg-card/70 backdrop-blur transition-all ${isCurrent ? 'border-primary/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-border/40'}`}
                >
                  {/* Header: identity + lumens */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <PlayerAvatar avatarId={p.avatarId ?? null} name={p.playerName} size={22} />
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                      <span className="text-xs font-semibold truncate">{p.playerName}</span>
                      {isCurrent && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">their turn</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-serif font-black text-lg text-primary leading-none">
                      <span>{p.lumens}</span>
                      <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                  </div>

                  {/* Compressed face: 3 stat boxes */}
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {([
                      { label: 'Affinity', value: totalAffinity, hex: '#7aa2ff', glow: '#a8c5ff' },
                      { label: 'Artifacts', value: cardCount,    hex: '#c084fc', glow: '#e0baff' },
                      { label: 'Reserved', value: reservedCount, hex: '#ffc43d', glow: '#ffe28a' },
                    ] as const).map(({ label, value, hex, glow }) => {
                      const has = value > 0;
                      return (
                        <div
                          key={label}
                          className="h-[72px] flex flex-col items-center justify-center gap-1 rounded-lg relative overflow-hidden"
                          style={{
                            background: has
                              ? `linear-gradient(180deg, #060611 0%, ${hex}33 100%)`
                              : 'linear-gradient(180deg, #07070b 0%, #0e0e14 100%)',
                            border: `1px solid ${has ? hex + 'AA' : hex + '22'}`,
                            boxShadow: has ? `inset 0 0 14px ${hex}22, 0 0 8px ${hex}33` : 'none',
                          }}
                        >
                          {has && (
                            <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${glow}AA, transparent)` }} />
                          )}
                          <span
                            className="text-2xl font-black leading-none tracking-tight"
                            style={{ color: has ? '#fff' : hex + '40', textShadow: has ? `0 0 10px ${glow}` : 'none' }}
                          >
                            {value}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider leading-none" style={{ color: has ? glow : hex + '55' }}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* View button */}
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-[11px] font-semibold text-primary"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="h-3 w-3" />Hide details</>
                    ) : (
                      <><Eye className="h-3 w-3" />View details</>
                    )}
                  </button>

                  {/* Expanded per-color detail */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2">
                          <div className="grid grid-cols-6 gap-1.5">
                            {CRYSTALS.map((c) => {
                              const n = p.crystals[c as keyof CrystalCounts] ?? 0;
                              const bonus = p.bonuses[c as keyof CrystalCounts] ?? 0;
                              const lumBonus = ((state as any)?.luminaryAffinities as LuminaryActiveState[] ?? [])
                                .filter((la: LuminaryActiveState) =>
                                  la.ownerId === p.playerId &&
                                  ((state as any)?.turnCount ?? 0) > la.summonedAtTurnCount &&
                                  la.activeAffinity === c
                                ).length;
                              const meta = GEM_META[c as GemKey];
                              const isFlux = c === 'flux';
                              const hasContent = isFlux ? (n > 0 || reservedCount > 0) : (n > 0 || bonus > 0 || lumBonus > 0);
                              return (
                                <div
                                  key={c}
                                  className="h-[72px] flex flex-col items-center gap-1 rounded-lg relative overflow-hidden pt-1.5 pb-1.5"
                                  style={{
                                    background: hasContent
                                      ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)`
                                      : 'linear-gradient(180deg, #07070b 0%, #0e0e14 100%)',
                                    border: `1px solid ${hasContent ? meta.hex + 'AA' : meta.hex + '22'}`,
                                    boxShadow: hasContent ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33` : 'none',
                                  }}
                                >
                                  {hasContent && (
                                    <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />
                                  )}
                                  {/* Affinity name + icon — top center */}
                                  <div className="flex items-center gap-0.5 w-full justify-center">
                                    <span className="text-[7px] font-semibold tracking-wide leading-none truncate" style={{ color: meta.glowHex }}>{meta.shortName}</span>
                                    <MiniGem color={c as GemKey} size={7} />
                                  </div>
                                  {/* Crystal count */}
                                  <span
                                    className="text-2xl font-black leading-none tracking-tight"
                                    style={{ color: hasContent ? '#fff' : meta.hex + '40', textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : 'none' }}
                                  >
                                    {n}
                                  </span>
                                  {/* Card bonus + Luminary alliance bonus */}
                                  {!isFlux && (bonus > 0 || lumBonus > 0) && (
                                    <div className="flex flex-col items-center gap-0" style={{ lineHeight: 1 }}>
                                      {bonus > 0 && (
                                        <span className="text-[9px] font-bold leading-none text-primary">+{bonus} bonus</span>
                                      )}
                                      {lumBonus > 0 && (
                                        <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{lumBonus}✦</span>
                                      )}
                                    </div>
                                  )}
                                  {isFlux && reservedCount > 0 && (
                                    <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reservedCount} reserved</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
  };

  const HandTab = () => (
    <div className="flex flex-col gap-5 p-4 pb-6">
      {/* Lumens + name */}
      <div className={`rounded-2xl border p-4 bg-card/80 backdrop-blur flex items-center justify-between ${isMyTurn ? 'border-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.2)]' : 'border-border'}`}>
        <div>
          <div className="text-lg font-bold">{me?.playerName}</div>
          <div className="text-xs text-muted-foreground">
            {Object.values(me?.crystals ?? {}).reduce((a, b) => a + b, 0)} affinities in hand
          </div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-serif font-bold text-primary">{me?.lumens}</div>
          <div className="text-xs text-primary flex items-center gap-0.5 justify-center">
            <Sparkles className="h-3 w-3" /> eminence
          </div>
        </div>
      </div>

      {/* My Gems */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">My Affinities</p>
        <div className="grid grid-cols-3 gap-2">
          {CRYSTALS.map((c) => {
            const cardBonus = me?.bonuses[c as keyof CrystalCounts] ?? 0;
            const lumBonus = ((state as any)?.luminaryAffinities as LuminaryActiveState[] ?? [])
              .filter((la: LuminaryActiveState) =>
                la.ownerId === session?.playerId &&
                ((state as any)?.turnCount ?? 0) > la.summonedAtTurnCount &&
                la.activeAffinity === c
              ).length;
            const meta = GEM_META[c as GemKey];
            return (
              <div
                key={c}
                className="flex flex-col items-center gap-1 rounded-xl px-1.5 pt-1.5 pb-1.5 relative overflow-hidden"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${meta.hex}18 0%, ${meta.hex}08 55%, rgba(255,255,255,0.02) 100%)`,
                  border: `1px solid ${meta.hex}28`,
                }}
              >
                {/* Affinity name + icon — centered at top */}
                <div className="flex items-center gap-0.5 z-10 w-full justify-center">
                  <span className="text-[8px] font-semibold tracking-wide leading-none truncate" style={{ color: meta.glowHex }}>{meta.shortName}</span>
                  <MiniGem color={c as GemKey} size={8} />
                </div>
                {/* Token count (primary) with bonus side-by-side */}
                <div className="flex items-center gap-1 z-10">
                  <CrystalIcon color={c} size={40} count={me?.crystals[c as keyof CrystalCounts]} />
                  {(cardBonus > 0 || lumBonus > 0) && (
                    <div className="flex flex-col gap-0.5">
                      {cardBonus > 0 && <span className="text-[10px] font-bold text-primary leading-none">+{cardBonus}</span>}
                      {lumBonus > 0 && <span className="text-[10px] font-bold leading-none" style={{ color: meta.glowHex }}>+{lumBonus}✦</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reserved Cards */}
      {myReservedCount > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
            Reserved ({myReservedCount}/3)
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {me?.reservedCards.map((c) => (
              <ArtifactCardView
                key={c.id}
                card={c}
                tier={c.tier}
                onTap={() => openCardSheet(c, true)}
                tapped={selectedCard?.card.id === c.id}
                effectiveCosts={computeCosts(c, costMode)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Forged Cards */}
      <div className="rounded-2xl border border-border/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPurchased(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-secondary/40 text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Forged Artifacts ({me?.purchasedCards?.length ?? 0})
          </span>
          {showPurchased ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showPurchased && (
          <div className="p-3">
            {/* Bonus summary — card bonuses + living luminary alliance bonuses */}
            {(() => {
              const lumAffinities: LuminaryActiveState[] = (state as any)?.luminaryAffinities ?? [];
              const tc: number = (state as any)?.turnCount ?? 0;
              const myLumBonus: Partial<Record<GemKey, number>> = {};
              for (const la of lumAffinities) {
                if (la.ownerId !== session?.playerId || tc <= la.summonedAtTurnCount) continue;
                const k = la.activeAffinity as GemKey;
                myLumBonus[k] = (myLumBonus[k] ?? 0) + 1;
              }
              const hasAnyLumBonus = Object.values(myLumBonus).some(v => (v ?? 0) > 0);
              const hasAnyBonus = hasAnyLumBonus || CRYSTALS.filter(c => c !== 'flux').some(c => (me?.bonuses[c as keyof CrystalCounts] ?? 0) > 0);
              return (
                <div className="flex gap-1.5 flex-wrap mb-3 items-center">
                  {CRYSTALS.filter(c => c !== 'flux').map((c) => {
                    const cardCount = me?.bonuses[c as keyof CrystalCounts] ?? 0;
                    const lumCount = myLumBonus[c as GemKey] ?? 0;
                    const total = cardCount + lumCount;
                    if (total === 0) return null;
                    return (
                      <div key={c} className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
                        <MiniGem color={c as GemKey} size={12} />
                        <span className="text-xs font-bold text-white">×{total}</span>
                        {lumCount > 0 && <span className="text-[9px] text-yellow-400/80">✦</span>}
                      </div>
                    );
                  })}
                  {!hasAnyBonus && (
                    <span className="text-xs text-muted-foreground italic">No bonuses yet</span>
                  )}
                  {hasAnyLumBonus && (
                    <span className="text-[9px] text-yellow-400/60 ml-auto">✦ alliance</span>
                  )}
                </div>
              );
            })()}
            {(me?.purchasedCards?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground italic">No cards forged yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(me?.purchasedCards ?? []).map((c) => (
                  <ArtifactCardView key={c.id} card={c} tier={c.tier} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const LogTab = () => (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Opponents */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Opponents</p>
        <div className="flex flex-col gap-3">
          {state.players.map((p, i) => {
            if (p.playerId === session?.playerId) return null;
            const isCurrent = state.status === 'playing' && state.currentPlayerIndex === i;
            const cardCount = (p as any).purchasedCards?.length ?? (p as any).purchasedCardIds?.length ?? 0;
            const reservedCount = p.reservedCards.length;
            return (
              <div
                key={p.playerId}
                className={`rounded-2xl border p-4 bg-card/70 backdrop-blur transition-all ${isCurrent ? 'border-primary/60 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-border/50'}`}
              >
                {/* Header: avatar + name + lumens */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar avatarId={p.avatarId ?? null} name={p.playerName} size={30} />
                    {isCurrent && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    <span className="font-bold text-sm">{p.playerName}</span>
                    {isCurrent && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">their turn</span>}
                  </div>
                  <div className="flex items-center gap-1 font-serif font-bold text-primary">
                    <span className="text-2xl">{p.lumens}</span>
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>

                {/* Per-color tall gem boxes */}
                <div className="grid grid-cols-6 gap-1.5 mb-3">
                  {CRYSTALS.map((c) => {
                    const n = p.crystals[c as keyof CrystalCounts] ?? 0;
                    const bonus = p.bonuses[c as keyof CrystalCounts] ?? 0;
                    const meta = GEM_META[c as GemKey];
                    const isFlux = c === 'flux';
                    const hasContent = isFlux ? (n > 0 || reservedCount > 0) : (n > 0 || bonus > 0);
                    return (
                      <div
                        key={c}
                        className="h-[72px] flex flex-col items-center justify-center gap-1 rounded-lg relative overflow-hidden"
                        style={{
                          background: hasContent
                            ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)`
                            : 'linear-gradient(180deg, #07070b 0%, #0e0e14 100%)',
                          border: `1px solid ${hasContent ? meta.hex + 'AA' : meta.hex + '22'}`,
                          boxShadow: hasContent ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33` : 'none',
                        }}
                      >
                        {hasContent && (
                          <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />
                        )}
                        <span
                          className="text-2xl font-black leading-none tracking-tight"
                          style={{ color: hasContent ? '#fff' : meta.hex + '40', textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : 'none' }}
                        >
                          {n}
                        </span>
                        {!isFlux && bonus > 0 && (
                          <span className="text-[10px] font-bold leading-none" style={{ color: meta.glowHex }}>+{bonus}</span>
                        )}
                        {isFlux && reservedCount > 0 && (
                          <span className="text-[10px] font-bold leading-none" style={{ color: meta.glowHex }}>{reservedCount} rsv</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer: reserved card backs */}
                {reservedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reserve:</span>
                    <div className="flex gap-1 items-center">
                      {p.reservedCards.map((card, idx) => (
                        <CardBack key={idx} size="sm" tier={card.tier as 1 | 2 | 3} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Log */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent Actions</p>
          {(state.actionLog ?? []).length > 12 && (
            <button
              onClick={() => setShowAllLog((v) => !v)}
              className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors"
            >
              {showAllLog ? 'Show less' : `Show all ${(state.actionLog ?? []).length}`}
            </button>
          )}
        </div>
        <div
          className={`rounded-2xl border border-border/50 bg-card/60 backdrop-blur divide-y divide-border/30 ${showAllLog ? 'max-h-[420px] overflow-y-auto' : ''}`}
        >
          {(state.actionLog ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground italic text-center">No actions yet.</div>
          ) : (
            (() => {
              const AFFINITY_DOT_COLOR: Record<string, string> = {
                Flare: '#FF5A3C',
                Continuum: '#3D6BFF',
                Verdance: '#2ECC71',
                Abyss: '#9C27B0',
                Radiance: '#C8D4F8',
              };
              return [...(state.actionLog ?? [])].reverse().slice(0, showAllLog ? undefined : 12).map((entry, i) => {
              const isMe = entry.playerId === session.playerId;
              const logPlayer = state.players.find((pl) => pl.playerId === entry.playerId);
              const isAffinityChange = entry.summary.startsWith('switched ');
              const affinityLabel = isAffinityChange ? (entry.summary.split(' to ').pop() ?? '') : '';
              const dotColor = AFFINITY_DOT_COLOR[affinityLabel] ?? '#888';
              return (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5"
                style={isAffinityChange ? { background: `${dotColor}0D` } : undefined}
              >
                <PlayerAvatar
                  avatarId={logPlayer?.avatarId ?? (isMe ? session.avatarId : null)}
                  name={entry.playerName}
                  size={22}
                />
                <div className="text-xs leading-relaxed flex-1">
                  <span className={`font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>{entry.playerName}</span>
                  {isAffinityChange ? (
                    <>
                      <span className="text-foreground/70 italic"> · {entry.summary}</span>
                      <span
                        className="inline-flex items-center gap-1 ml-1.5 align-middle"
                        title={affinityLabel}
                      >
                        <span
                          className="inline-block rounded-full border border-white/20"
                          style={{ width: 7, height: 7, background: dotColor, boxShadow: `0 0 4px ${dotColor}99` }}
                        />
                        <span style={{ color: dotColor, fontSize: 10, lineHeight: 1 }}>↻</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-foreground/80"> · {entry.summary}</span>
                  )}
                  <span className="ml-1 text-[10px] text-muted-foreground/40">R{entry.turn}</span>
                </div>
              </div>
              );
            });
            })()
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden relative">
      {/* ── Cosmic background layers ──────────────────────────────────────── */}
      {/* Star-field photo: opacity pulses slowly so stars appear to breathe   */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundCosmos})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'cosmic-breathe 12s ease-in-out infinite',
        }}
      />
      {/* Darkening veil — lighter than before so stars show through           */}
      <div className="absolute inset-0 bg-background/68 pointer-events-none" />
      {/* Nebula corner glows — affinity-palette tints, barely perceptible     */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 35% at 100% 0%,   #3D6BFF0F 0%, transparent 70%),' +
            'radial-gradient(ellipse 45% 30% at 0%   100%, #FF5A3C0C 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 28% at 0%   0%,   #7B1FA20C 0%, transparent 65%),' +
            'radial-gradient(ellipse 42% 30% at 100% 100%, #2ECC710B 0%, transparent 65%)',
        }}
      />

      {/* ── Header ── */}
      <header className="shrink-0 h-14 px-4 flex items-center justify-between bg-card/70 backdrop-blur border-b border-border z-20">
        <div className="flex items-center gap-2">
          <img src={gemIcon} alt="" className="h-7 w-7 drop-shadow-[0_0_10px_rgba(80,130,255,0.5)]" draggable={false} />
          <div className="flex flex-col leading-none">
            <h1 className="text-sm font-serif font-bold text-primary tracking-wide">Luminae</h1>
            <button
              onClick={() => {
                navigator.clipboard.writeText(session.inviteCode).then(() =>
                  toast({ title: 'Game code copied', description: `Share code: ${session.inviteCode}` })
                );
              }}
              className="text-[9px] font-mono text-white/35 hover:text-white/65 tracking-widest mt-0.5 transition-colors text-left"
              title="Tap to copy game code — share with friends to join"
            >
              {session.inviteCode}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {/* Turn pill */}
          <div className={`pl-1 pr-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 ${isMyTurn ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            <PlayerAvatar avatarId={session.avatarId} name={session.playerName} size={22} />
            {!isMyTurn && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
            <span className="truncate max-w-[80px]">{isMyTurn ? 'Your turn' : currentPlayerName}</span>
          </div>
          <TurnCountdown deadline={state.turnDeadline ?? null} active={isMyTurn} />
          <span className="text-xs text-muted-foreground font-mono shrink-0">R{state.roundNumber}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowRules(true)} title="Rules">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={handleSurrender} title="Surrender">
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Tab Content ── */}
      <main
        data-game-board="true"
        ref={mainScrollRef as React.RefObject<HTMLDivElement>}
        className="flex-1 overflow-y-auto overflow-x-hidden z-10"
        onPointerDown={() => {
          // Fallback for non-iOS (Android Chrome, desktop): blur any focused
          // panel element as soon as a pointer gesture starts in the board.
          const active = document.activeElement as HTMLElement | null;
          if (active && playerPanelRef.current?.contains(active)) {
            active.blur();
          }
        }}
      >
        {activeTab === 'board' && BoardTab()}
        {activeTab === 'hand' && HandTab()}
        {activeTab === 'log' && LogTab()}
      </main>

      {/* ── Player Info Panel (pinned above nav) ── */}
      {me && (
        <div
          ref={playerPanelRef}
          className={`shrink-0 z-20 border-t px-3 py-2 bg-card/90 backdrop-blur transition-all ${isMyTurn ? 'border-primary/50 shadow-[0_0_12px_rgba(99,102,241,0.25)]' : 'border-border/40'}`}
          onClickCapture={() => {
            // Proactively release focus after any panel tap so the NEXT gesture
            // in the board area starts clean without a defocus-first event.
            requestAnimationFrame(() => {
              const active = document.activeElement as HTMLElement | null;
              if (active && playerPanelRef.current?.contains(active)) {
                active.blur();
              }
            });
          }}
        >
          {/* Top row: identity + lumens */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <PlayerAvatar avatarId={session.avatarId} name={me.playerName} size={22} />
              {isMyTurn && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
              <span className="text-xs font-semibold truncate">{me.playerName}</span>
              {isMyTurn && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">your turn</span>}
            </div>
            <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
              <span><span className="font-semibold text-foreground/80">{myTotalGems}</span> Affinity</span>
              <button
                type="button"
                onClick={() => setShowEminenceBreakdown(true)}
                className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:text-foreground transition-colors"
                title="View eminence breakdown"
              >
                <span className="font-serif font-black text-lg text-primary leading-none">{me.lumens}</span>
                <Sparkles className="h-3 w-3 text-primary" />
              </button>
            </div>
          </div>
          {/* Planned move status row */}
          {myPlannedAction && (
            <div className="flex items-center gap-2 mb-2 px-0.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30">
              <span className="text-[10px] text-amber-300/90 flex-1 truncate pl-1.5">
                ⏳ Planned: {getPlannedActionSummary(myPlannedAction)}
              </span>
              <button
                type="button"
                onClick={handleCancelPlan}
                className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-900/60 hover:bg-amber-800/60 border border-amber-500/40 rounded-md px-2 py-0.5 shrink-0 animate-pulse"
              >
                <CalendarX className="h-3 w-3" />
                Cancel
              </button>
            </div>
          )}
          {/* ── Pinned Player Info Panel affinity boxes (6-col flex row) ── */}
          <div className="flex gap-1.5">
            {CRYSTALS.map((c) => {
              const gems = me.crystals[c as keyof CrystalCounts] ?? 0;
              const bonus = me.bonuses[c as keyof CrystalCounts] ?? 0;
              // Living Luminary alliance bonus — same logic as HandTab / effectiveBonuses()
              const lumBonus = ((state as any)?.luminaryAffinities as LuminaryActiveState[] ?? [])
                .filter((la: LuminaryActiveState) =>
                  la.ownerId === session?.playerId &&
                  ((state as any)?.turnCount ?? 0) > la.summonedAtTurnCount &&
                  la.activeAffinity === c
                ).length;
              const meta = GEM_META[c as GemKey];
              const isFlux = c === 'flux';
              const reservedCount = me.reservedCards.length;
              const pending = selectedCrystals[c as keyof CrystalCounts] ?? 0;
              const hasContent = isFlux ? (gems > 0 || reservedCount > 0) : (gems > 0 || bonus > 0 || lumBonus > 0);
              const clickable = isFlux ? reservedCount > 0 : bonus > 0;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (isFlux) setShowReservedOverlay(true);
                    else { setForgedFilter(c as GemKey); setShowForgedOverlay(true); }
                  }}
                  className="flex-1 min-h-[72px] flex flex-col items-center gap-1 rounded-lg relative overflow-hidden transition-all active:scale-95 disabled:cursor-default pt-1.5 pb-1.5"
                  style={{
                    background: hasContent
                      ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)`
                      : 'linear-gradient(180deg, #07070b 0%, #0e0e14 100%)',
                    border: `1px solid ${hasContent ? meta.hex + 'AA' : meta.hex + '22'}`,
                    boxShadow: hasContent
                      ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33`
                      : 'none',
                  }}
                >
                  {hasContent && (
                    <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />
                  )}
                  {/* Affinity name + icon — top center of Player Info box */}
                  <div className="flex items-center gap-0.5 w-full justify-center">
                    <span className="text-[7px] font-semibold tracking-wide leading-none truncate" style={{ color: meta.glowHex }}>{meta.shortName}</span>
                    <MiniGem color={c as GemKey} size={7} />
                  </div>
                  {/* Token count + pending additions inline to the right */}
                  <div className="flex items-center gap-0.5">
                    <span
                      className="text-2xl font-black leading-none tracking-tight"
                      style={{
                        color: hasContent ? '#fff' : meta.hex + '40',
                        textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : 'none',
                      }}
                    >
                      {gems}
                    </span>
                    {pending > 0 && (
                      <motion.span
                        key={pending}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-[10px] font-black leading-none text-primary"
                      >+{pending}</motion.span>
                    )}
                    {isFlux && reservedCount > 0 && (
                      <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reservedCount}r</span>
                    )}
                  </div>
                  {/* Card bonus + Luminary alliance bonus — stacked below token count */}
                  {!isFlux && (bonus > 0 || lumBonus > 0) && (
                    <div className="flex flex-col items-center gap-0" style={{ lineHeight: 1 }}>
                      {bonus > 0 && (
                        <span className="text-[9px] font-bold leading-none text-primary">+{bonus} bonus</span>
                      )}
                      {lumBonus > 0 && (
                        <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{lumBonus}✦</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ── */}
      <nav className="shrink-0 grid grid-cols-3 border-t border-border bg-card/90 backdrop-blur z-20 pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        {([
          { tab: 'board' as ActiveTab, label: 'Board', icon: LayoutGrid },
          { tab: 'hand' as ActiveTab, label: 'Hand', icon: Hand, badge: myReservedCount > 0 ? myReservedCount : undefined },
          { tab: 'log' as ActiveTab, label: 'Log', icon: List },
        ] as const).map(({ tab, label, icon: Icon, badge }: { tab: ActiveTab; label: string; icon: any; badge?: number }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center justify-center gap-1 relative transition-colors ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {badge !== undefined && (
                <span className="absolute -top-1 -right-1.5 h-4 w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">{label}</span>
            {activeTab === tab && (
              <div className="absolute -top-2 inset-x-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Card Action Sheet ── */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => { setSelectedCard(null); setPendingSheetAction(null); }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl p-5 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
            >
              {/* Card preview + info */}
              <div className="flex gap-4 mb-5">
                <ArtifactCardView
                  card={selectedCard.card}
                  tier={selectedCard.card.tier}
                  effectiveCosts={me ? computeCosts(selectedCard.card, costMode) : undefined}
                />
                <div className="flex-1 flex flex-col gap-2 justify-center">
                  <div className="font-bold text-base leading-tight">{selectedCard.card.name}</div>
                  {selectedCard.card.flavor && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed">"{selectedCard.card.flavor}"</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Bonus:</span>
                    <MiniGem color={selectedCard.card.bonusColor as GemKey} size={14} />
                    <span className="text-xs font-semibold">{GEM_META[selectedCard.card.bonusColor as GemKey]?.name ?? selectedCard.card.bonusColor}</span>
                  </div>
                  {(selectedCard.card.lumens ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">{selectedCard.card.lumens} eminence</span>
                    </div>
                  )}
                </div>
              </div>

              {/* My Cost breakdown — shortfall per gem */}
              {costMode !== 'printed' && me && (() => {
                // Live calculation — reacts to costMode and selectedCrystals changes in real time
                const liveCosts = computeCosts(selectedCard.card, costMode) as Record<string, number> | undefined;
                if (!liveCosts) return null;
                const rows: { gem: GemKey; need: number; have: number; short: number }[] = [];
                let totalShort = 0;
                for (const c of CRYSTALS) {
                  if (c === 'flux') continue;
                  const baseCost = selectedCard.card.cost[c as keyof CrystalCounts] ?? 0;
                  if (baseCost <= 0) continue;
                  const need = liveCosts[c] ?? 0;
                  // In after_bonuses mode show token coverage; in needed_now the shortfall IS the remaining
                  const have = costMode === 'after_bonuses'
                    ? Math.min(need, me.crystals[c as keyof CrystalCounts] ?? 0)
                    : 0;
                  const short = costMode === 'after_bonuses' ? Math.max(0, need - have) : need;
                  totalShort += short;
                  rows.push({ gem: c as GemKey, need, have, short });
                }
                const fluxHave = me.crystals.flux ?? 0;
                const fluxNeeded = Math.max(0, totalShort);
                const fluxCovers = fluxNeeded <= fluxHave;
                const canAfford = canAffordCard(selectedCard.card, me);
                if (rows.length === 0) return null;
                const modeLabel = costMode === 'after_bonuses' ? 'After bonuses — tokens needed' : 'What you still need right now';
                return (
                  <div className="mb-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{modeLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      {rows.map(({ gem, need, have, short }) => (
                        <div key={gem} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${short === 0 ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                          <MiniGem color={gem} size={12} />
                          {short === 0
                            ? <span className="text-green-400">✓ {have}/{need}</span>
                            : costMode === 'after_bonuses'
                              ? <span>−{short} <span className="text-white/40 font-normal">({have}/{need})</span></span>
                              : <span>−{need}</span>
                          }
                        </div>
                      ))}
                      {fluxNeeded > 0 && (
                        <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${fluxCovers ? 'bg-amber-900/40 text-amber-300' : 'bg-red-900/50 text-red-300'}`}>
                          <MiniGem color="flux" size={12} />
                          {fluxCovers
                            ? <span>{fluxNeeded} singularity covers gap</span>
                            : <span>need {fluxNeeded}, have {fluxHave}</span>
                          }
                        </div>
                      )}
                    </div>
                    {isMyTurn && canAfford && <p className="text-[10px] font-semibold text-green-400">You can forge this now</p>}
                    {isMyTurn && !canAfford && <p className="text-[10px] font-semibold text-red-400">Still short — keep harnessing</p>}
                    {!isMyTurn && canAfford && <p className="text-[10px] font-semibold text-amber-400">You can afford this — plan it below</p>}
                    {!isMyTurn && !canAfford && <p className="text-[10px] font-semibold text-muted-foreground">Plan it now — acquire tokens before your turn</p>}
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">

                {/* ── Immediate actions (your active turn only) ── */}
                {isMyTurn && (
                  <>
                    <motion.div
                      key={btnAnimTarget === 'forge' ? `forge-${btnAnimKey}` : 'forge'}
                      className={`relative w-full${btnAnimTarget === 'forge' ? ` btn-${btnAnimType}-flash` : ''}`}
                      whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                      style={{ borderRadius: '0.75rem' }}
                    >
                      <AnimatePresence>
                        {showForgeHint && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 6, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            onClick={dismissForgeHint}
                            className="absolute bottom-full mb-1.5 left-0 whitespace-nowrap flex items-center gap-1 bg-black/80 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg backdrop-blur-sm z-10"
                            title="Dismiss hint"
                          >
                            <Gavel className="h-2.5 w-2.5 text-white/60 shrink-0" />
                            <span>Tap to spend your crystals and claim this Artifact</span>
                            <span className="text-white/40 ml-0.5">✕</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <Button
                        className={`w-full h-12 text-base font-bold transition-all duration-150 border-0
                          ${pendingSheetAction === 'forge'
                            ? `${forgeDarkText ? 'text-zinc-900' : 'text-white'} ring-2 ring-offset-1 ring-offset-background scale-[1.02]`
                            : 'bg-zinc-700/70 hover:bg-zinc-600/80 text-zinc-200'
                          }`}
                        style={pendingSheetAction === 'forge'
                          ? { backgroundColor: forgeConfirmHex, boxShadow: `0 0 14px ${forgeConfirmGlow}99`, '--tw-ring-color': forgeConfirmGlow } as React.CSSProperties
                          : {}}
                        disabled={!me || !canAffordCard(selectedCard.card, me)}
                        onClick={() => {
                          if (pendingSheetAction === 'forge') {
                            gameAudio.playButtonConfirm(); triggerBtnAnim('forge', 'confirm');
                            handleBuy(selectedCard.card, selectedCard.fromReserve);
                            setSelectedCard(null); setPendingSheetAction(null);
                          } else {
                            gameAudio.playButtonSelect(); triggerBtnAnim('forge', 'select');
                            setPendingSheetAction('forge');
                          }
                        }}
                      >
                        <Gavel className="h-5 w-5 mr-2" />
                        {pendingSheetAction === 'forge' ? 'Confirm: Forge' : (me && canAffordCard(selectedCard.card, me) ? 'Forge Artifact' : 'Cannot afford yet')}
                      </Button>
                    </motion.div>
                    {!selectedCard.fromReserve && (
                      <motion.div
                        key={btnAnimTarget === 'reserve' ? `reserve-${btnAnimKey}` : 'reserve'}
                        className={`relative w-full${btnAnimTarget === 'reserve' ? ` btn-${btnAnimType}-flash` : ''}`}
                        whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                        style={{ borderRadius: '0.75rem' }}
                      >
                        <AnimatePresence>
                          {showReserveHint && !showForgeHint && (
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, y: 6, scale: 0.92 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.95 }}
                              transition={{ duration: 0.3 }}
                              onClick={dismissReserveHint}
                              className="absolute bottom-full mb-1.5 left-0 whitespace-nowrap flex items-center gap-1 bg-black/80 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg backdrop-blur-sm z-10"
                              title="Dismiss hint"
                            >
                              <Bookmark className="h-2.5 w-2.5 text-white/60 shrink-0" />
                              <span>Reserves hold this card — tap again to confirm</span>
                              <span className="text-white/40 ml-0.5">✕</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                        <Button
                          className={`w-full h-12 text-base font-bold transition-all duration-150 border-0 text-zinc-900
                            ${pendingSheetAction === 'reserve'
                              ? 'bg-[#FFC43D] ring-2 ring-[#FFE080] ring-offset-1 ring-offset-background scale-[1.02] shadow-[0_0_14px_rgba(255,196,61,0.7)]'
                              : 'bg-[#FFC43D]/70 hover:bg-[#FFC43D]/85'
                            }`}
                          disabled={!me || !canReserveMore(me)}
                          onClick={() => {
                            if (pendingSheetAction === 'reserve') {
                              gameAudio.playButtonConfirm(); triggerBtnAnim('reserve', 'confirm');
                              handleReserveCard(selectedCard.card);
                              setSelectedCard(null); setPendingSheetAction(null);
                            } else {
                              gameAudio.playButtonSelect(); triggerBtnAnim('reserve', 'select');
                              setPendingSheetAction('reserve');
                            }
                          }}
                        >
                          <Bookmark className="h-5 w-5 mr-2" />
                          {pendingSheetAction === 'reserve' ? 'Confirm: Reserve' : (me && canReserveMore(me) ? 'Reserve for later' : 'Reserve pile full (3 max)')}
                        </Button>
                      </motion.div>
                    )}
                  </>
                )}

                {/* ── Plan actions (any time game is active, no cutscene) ── */}
                {canPlan && !isMyTurn && (
                  <>
                    {me && canAffordCard(selectedCard.card, me) && (
                    <motion.div
                      key={btnAnimTarget === 'plan_forge' ? `plan_forge-${btnAnimKey}` : 'plan_forge'}
                      className={`w-full${btnAnimTarget === 'plan_forge' ? ` btn-${btnAnimType}-flash` : ''}`}
                      whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                      style={{ borderRadius: '0.75rem' }}
                    >
                      <Button
                        className={`w-full h-12 text-base font-bold transition-all duration-150 border-0
                          ${pendingSheetAction === 'plan_forge'
                            ? `${forgeDarkText ? 'text-zinc-900' : 'text-white'} ring-2 ring-offset-1 ring-offset-background scale-[1.02]`
                            : 'bg-zinc-700/70 hover:bg-zinc-600/80 text-zinc-200'
                          }`}
                        style={pendingSheetAction === 'plan_forge'
                          ? { backgroundColor: forgeConfirmHex, boxShadow: `0 0 14px ${forgeConfirmGlow}99`, '--tw-ring-color': forgeConfirmGlow } as React.CSSProperties
                          : {}}
                        onClick={() => {
                          if (pendingSheetAction === 'plan_forge') {
                            gameAudio.playButtonConfirm(); triggerBtnAnim('plan_forge', 'confirm');
                            handlePlanAction({ type: selectedCard.fromReserve ? 'purchase_reserved' : 'purchase_card', cardId: selectedCard.card.id });
                            setSelectedCard(null); setPendingSheetAction(null);
                          } else {
                            gameAudio.playButtonSelect(); triggerBtnAnim('plan_forge', 'select');
                            setPendingSheetAction('plan_forge');
                          }
                        }}
                      >
                        <Gavel className="h-5 w-5 mr-2" />
                        {pendingSheetAction === 'plan_forge' ? 'Confirm: Plan: Forge' : 'Plan: Forge this Artifact'}
                      </Button>
                    </motion.div>
                    )}
                    {!selectedCard.fromReserve && (
                      <motion.div
                        key={btnAnimTarget === 'plan_reserve' ? `plan_reserve-${btnAnimKey}` : 'plan_reserve'}
                        className={`w-full${btnAnimTarget === 'plan_reserve' ? ` btn-${btnAnimType}-flash` : ''}`}
                        whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                        style={{ borderRadius: '0.75rem' }}
                      >
                        <Button
                          className={`w-full h-12 text-base font-bold transition-all duration-150 border-0 text-zinc-900
                            ${pendingSheetAction === 'plan_reserve'
                              ? 'bg-[#FFC43D] ring-2 ring-[#FFE080] ring-offset-1 ring-offset-background scale-[1.02] shadow-[0_0_14px_rgba(255,196,61,0.7)]'
                              : 'bg-[#FFC43D]/70 hover:bg-[#FFC43D]/85'
                            }`}
                          disabled={!me || !canReserveMore(me)}
                          onClick={() => {
                            if (pendingSheetAction === 'plan_reserve') {
                              gameAudio.playButtonConfirm(); triggerBtnAnim('plan_reserve', 'confirm');
                              handlePlanAction({ type: 'reserve_card', cardId: selectedCard.card.id, tier: selectedCard.card.tier });
                              setSelectedCard(null); setPendingSheetAction(null);
                            } else {
                              gameAudio.playButtonSelect(); triggerBtnAnim('plan_reserve', 'select');
                              setPendingSheetAction('plan_reserve');
                            }
                          }}
                        >
                          <Bookmark className="h-5 w-5 mr-2" />
                          {pendingSheetAction === 'plan_reserve' ? 'Confirm: Plan: Reserve' : (me && canReserveMore(me) ? 'Plan: Reserve for later' : 'Reserve pile full (3 max)')}
                        </Button>
                      </motion.div>
                    )}
                    <p className="text-[10px] text-muted-foreground text-center">
                      {myPlannedAction ? 'Selecting a new plan replaces the current one' : 'Planned moves auto-execute when your turn starts'}
                    </p>
                  </>
                )}

                {/* ── Neither available — Luminary cutscene blocking ── */}
                {!isMyTurn && !canPlan && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    Waiting for Luminary summon…
                  </p>
                )}

                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setSelectedCard(null); setPendingSheetAction(null); }}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Deck Reserve Sheet ── */}
      {/* Shown when the player taps a face-down deck pile.                    */}
      {/* Gives a clear confirmation buffer before committing the blind draw.  */}
      <AnimatePresence>
        {selectedDeckTier !== null && (() => {
          const deckTier = selectedDeckTier;
          const deckCount = deckTier === 1 ? (state?.deckCounts.tier1 ?? 0)
            : deckTier === 2 ? (state?.deckCounts.tier2 ?? 0)
            : (state?.deckCounts.tier3 ?? 0);
          const tierLore = deckTier === 3
            ? 'Sovereigns & absolutes — apex relics that bend the cosmos to your will'
            : deckTier === 2
            ? 'Forged instruments — crucibles and sigils of focused cosmic mastery'
            : 'Fragments & sparks — raw nascent shards that seed any engine';
          const canReserve = isMyTurn && !!me && canReserveMore(me);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-end"
              onClick={closeDeckSheet}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl p-5 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
              >
                {/* Header row: large card back + tier info */}
                <div className="flex gap-4 mb-5">
                  {/* Larger preview — 3× the sm size, matching md width */}
                  <div className="w-28 h-40 relative rounded-xl overflow-hidden border border-[#c4a85a]/40 shadow-lg bg-[#030509] shrink-0">
                    {deckTier === 1 && <CardBackTier1 />}
                    {deckTier === 2 && <CardBackTier2 />}
                    {deckTier === 3 && <CardBackTier3 />}
                  </div>
                  <div className="flex-1 flex flex-col gap-2 justify-center">
                    <div className="font-bold text-base leading-tight">Tier {deckTier} Artifact</div>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      "{tierLore}"
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {deckCount} card{deckCount !== 1 ? 's' : ''} remaining in this deck.
                      You will receive one at random — the card is hidden until reserved.
                    </p>
                    {me && !canReserveMore(me) && (
                      <p className="text-xs font-semibold text-destructive">
                        Reserve pile full — forge or spend a reserved card first.
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2.5">

                  {/* ── Reserve now (active turn) ── */}
                  {isMyTurn && (
                    <motion.div
                      whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                      style={{ borderRadius: '0.75rem' }}
                    >
                      <Button
                        className={`w-full h-12 text-base font-bold transition-all duration-150 border-0 text-zinc-900
                          ${pendingDeckConfirm
                            ? 'bg-[#FFC43D] ring-2 ring-[#FFE080] ring-offset-1 ring-offset-background scale-[1.02] shadow-[0_0_14px_rgba(255,196,61,0.7)]'
                            : 'bg-[#FFC43D]/45 hover:bg-[#FFC43D]/65'
                          }`}
                        disabled={!canReserve}
                        onClick={() => {
                          if (pendingDeckConfirm) {
                            gameAudio.playButtonConfirm();
                            handleReserveDeck(deckTier);
                            closeDeckSheet();
                          } else {
                            gameAudio.playButtonSelect();
                            setPendingDeckConfirm(true);
                          }
                        }}
                      >
                        <Bookmark className="h-5 w-5 mr-2" />
                        {pendingDeckConfirm
                          ? 'Confirm: Reserve Hidden Card'
                          : canReserve
                          ? 'Reserve Hidden Card'
                          : 'Reserve pile full (3 max)'}
                      </Button>
                    </motion.div>
                  )}

                  {/* ── Plan: reserve from deck (off-turn) ── */}
                  {canPlan && !isMyTurn && me && canReserveMore(me) && (
                    <motion.div
                      whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                      style={{ borderRadius: '0.75rem' }}
                    >
                      <Button
                        className={`w-full h-12 text-base font-bold transition-all duration-150 border-0 text-zinc-900
                          ${pendingDeckConfirm
                            ? 'bg-[#FFC43D] ring-2 ring-[#FFE080] ring-offset-1 ring-offset-background scale-[1.02] shadow-[0_0_14px_rgba(255,196,61,0.7)]'
                            : 'bg-[#FFC43D]/45 hover:bg-[#FFC43D]/65'
                          }`}
                        onClick={() => {
                          if (pendingDeckConfirm) {
                            gameAudio.playButtonConfirm();
                            handlePlanAction({ type: 'reserve_card', tier: deckTier, _tier: deckTier });
                            closeDeckSheet();
                          } else {
                            gameAudio.playButtonSelect();
                            setPendingDeckConfirm(true);
                          }
                        }}
                      >
                        <Bookmark className="h-5 w-5 mr-2" />
                        {pendingDeckConfirm ? 'Confirm: Plan Reserve' : 'Plan: Reserve Hidden Card'}
                      </Button>
                    </motion.div>
                  )}

                  {/* ── Waiting — Luminary cutscene blocking ── */}
                  {!isMyTurn && !canPlan && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      <AlertCircle className="inline h-4 w-4 mr-1" />
                      Waiting for Luminary summon…
                    </p>
                  )}

                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={closeDeckSheet}>
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Card Action Burst (market purchase/reserve) ── */}
      <AnimatePresence>
        {cardActionBurst && (
          <motion.div
            key={cardActionBurst.key}
            className="pointer-events-none fixed inset-0 z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            {/* Avatar + action label — positioned above the card */}
            <motion.div
              className="fixed left-0 right-0 flex flex-col items-center gap-2"
              style={{ bottom: window.innerHeight / 2 + Math.round(cardActionBurst.startRect.h * 0.625) + 24 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: [0, 0, 1, 1, 0], y: [12, 12, 0, 0, -8] }}
              transition={{ duration: 3.5, times: [0, 0.17, 0.3, 0.82, 1] }}
            >
              <div
                className="rounded-full overflow-hidden border-4 shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                style={{
                  width: 72, height: 72,
                  borderColor: cardActionBurst.actionType === 'purchase'
                    ? 'rgba(99,102,241,0.55)'
                    : `${GEM_META.flux.glowHex}88`,
                }}
              >
                <img
                  src={getAvatarForPlayer(cardActionBurst.avatarId ?? session.avatarId).image}
                  alt={cardActionBurst.playerName}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              <div className="rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur">
                {cardActionBurst.playerName}
              </div>
              {cardActionBurst.actionType === 'purchase' && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-serif font-black text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
                    Forged!
                  </span>
                  {cardActionBurst.lumens > 0 && (
                    <span className="flex items-center gap-1.5 text-base font-bold" style={{ color: GEM_META.flux.hex }}>
                      <Sparkles className="h-4 w-4" /> +{cardActionBurst.lumens} eminence
                    </span>
                  )}
                </div>
              )}
              {cardActionBurst.actionType === 'reserve' && (
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: GEM_META.flux.hex }}
                >
                  Reserved
                </span>
              )}
            </motion.div>

            <div style={{ perspective: '900px' }}>
              <motion.div
                style={{ position: 'fixed', transformStyle: 'preserve-3d', left: 0, top: 0, width: cardActionBurst.startRect.w, height: cardActionBurst.startRect.h }}
                initial={{
                  x: cardActionBurst.startRect.x,
                  y: cardActionBurst.startRect.y,
                  scale: 1,
                  rotateY: 0,
                }}
                animate={{
                  x: window.innerWidth / 2 - cardActionBurst.startRect.w / 2,
                  y: window.innerHeight / 2 - cardActionBurst.startRect.h / 2 - 20,
                  scale: 1.25,
                  rotateY: 360,
                }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 1, 1, 0] }}
                  transition={{ duration: 3.5, times: [0, 0.2, 0.78, 1] }}
                >
                  <ArtifactCardView card={cardActionBurst.card} tier={cardActionBurst.tier} />
                </motion.div>
              </motion.div>
            </div>

            {cardActionBurst.gotFlux && (
              <motion.div
                className="fixed flex flex-col items-center gap-2"
                style={{
                  left: window.innerWidth / 2 + 90,
                  top: window.innerHeight / 2 - 40,
                  perspective: '900px',
                  transformStyle: 'preserve-3d',
                }}
                initial={{ opacity: 0, rotateY: 90, scale: 0.6 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  rotateY: [90, 0, 720, 720],
                  scale: [0.6, 1, 1, 0.8],
                }}
                transition={{ duration: 3.0, times: [0, 0.12, 0.72, 1] }}
              >
                <CrystalIcon color="flux" size={52} />
                <span
                  className="text-sm font-bold drop-shadow-[0_0_10px_rgba(255,196,61,0.9)]"
                  style={{ color: GEM_META.flux.hex }}
                >
                  +1 Singularity
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Deal-from-Deck overlay — card flies from deck tile to empty slot ── */}
      {dealingCard && (() => {
        const dx = dealingCard.slotRect.x - dealingCard.deckRect.x;
        const dy = dealingCard.slotRect.y - dealingCard.deckRect.y;
        const arcY = Math.min(dy - 60, -40); // arc upward before descending
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 55, pointerEvents: 'none', perspective: '1200px' }}>
            <motion.div
              key={dealingCard.card.id}
              style={{
                position: 'absolute',
                left: dealingCard.deckRect.x,
                top: dealingCard.deckRect.y,
                width: dealingCard.deckRect.w,
                height: dealingCard.deckRect.h,
                transformStyle: 'preserve-3d',
              }}
              initial={{ x: 0, y: 0, rotateY: 0, scale: 1 }}
              animate={{
                x: [0, dx * 0.5, dx],
                y: [0, arcY, dy],
                rotateY: [0, 90, 180],
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 1.5,
                x: { ease: 'easeInOut', times: [0, 0.4, 1] },
                y: { ease: 'easeInOut', times: [0, 0.35, 1] },
                rotateY: { ease: 'easeInOut', times: [0, 0.5, 1] },
                scale: { ease: 'easeInOut', times: [0, 0.35, 1] },
              }}
              onAnimationComplete={() => {
                setDealingCard(null);
                setHiddenSlots(new Set());
              }}
            >
              {/* Card back — visible during first half of flight */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}>
                <CardBack tier={dealingCard.tier as 1 | 2 | 3} />
              </div>
              {/* Card face — revealed after half-flip */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}>
                <ArtifactCardView
                  card={dealingCard.card}
                  tier={dealingCard.tier}
                  onTap={() => {}}
                  tapped={false}
                  effectiveCosts={computeCosts(dealingCard.card, costMode)}
                />
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* ── Purchase Celebration Burst (reserved card purchases only) ── */}
      <AnimatePresence>
        {purchaseBurst && (
          <motion.div
            key={purchaseBurst.key}
            className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
          >
            {/* Expanding ring */}
            <motion.div
              className="absolute rounded-full border-2 border-primary"
              initial={{ width: 60, height: 60, opacity: 0.9 }}
              animate={{ width: 340, height: 340, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute rounded-full border border-primary/50"
              initial={{ width: 40, height: 40, opacity: 0.7 }}
              animate={{ width: 240, height: 240, opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut', delay: 0.08 }}
            />
            {/* Floating label */}
            <motion.div
              className="flex flex-col items-center gap-1"
              initial={{ y: 0, opacity: 1, scale: 0.8 }}
              animate={{ y: -80, opacity: 0, scale: 1.1 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              <span className="text-3xl font-serif font-black text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
                Forged!
              </span>
              {purchaseBurst.lumens > 0 && (
                <span className="flex items-center gap-1.5 text-lg font-bold" style={{ color: GEM_META.flux.hex }}>
                  <Sparkles className="h-4 w-4" /> +{purchaseBurst.lumens} eminence
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Gem Pickup Burst ── */}
      <AnimatePresence>
        {gemBurst && (() => {
          const burstDuration = (gemBurst.gems.length - 1) * 0.78 + 1.25 + 0.5 + 0.05;
          const avatarFadeIn = 0.5 / burstDuration;
          const avatarVisible = 0.55 / burstDuration;
          return (
          <motion.div
            key={gemBurst.key}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            />
            <div className="relative h-72 w-[18rem]">
              {gemBurstView.map(({ gem, index, x, delay }) => {
                return (
                  <motion.div
                    key={`${gemBurst.key}-${gem}-${index}`}
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, rotateY: 0, scale: 0.4, x: 0, y: 64 }}
                    animate={{
                      opacity: [0, 0, 1, 1, 0],
                      rotateY: [0, 180, 360, 540, 720],
                      scale: [0.4, 0.68, 1.12, 1.02, 0.9],
                      x: [0, x * 0.35, x * 0.95, x, x],
                      y: [64, 18, 0, -6, -18],
                    }}
                    transition={{ duration: 1.25, delay, times: [0, 0.18, 0.46, 0.74, 1] }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-black/50 p-2 shadow-[0_0_24px_rgba(255,255,255,0.2)]">
                        <MiniGem color={gem} size={52} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GEM_META[gem].glowHex }}>
                        {GEM_META[gem].shortName}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              className="fixed left-0 right-0 flex flex-col items-center gap-2"
              style={{ bottom: '22%' }}
              initial={{ opacity: 0, scale: 0.5, y: 16 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.05, 1, 0.96], y: [16, 0, 0, -8] }}
              transition={{ duration: burstDuration, times: [0, avatarFadeIn, avatarVisible + (1 - avatarVisible) * 0.75, 1] }}
            >
              <div
                className="rounded-full overflow-hidden border-4 shadow-[0_0_24px_rgba(99,102,241,0.35)]"
                style={{ width: 64, height: 64, borderColor: 'rgba(99,102,241,0.45)' }}
              >
                <img
                  src={getAvatarForPlayer(gemBurst.avatarId ?? session.avatarId).image}
                  alt={gemBurst.playerName}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              <div className="rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur">
                {gemBurst.playerName}
              </div>
              <span className="text-lg font-serif font-bold text-emerald-300 drop-shadow-[0_0_12px_rgba(110,231,183,0.7)]">
                Harnessed
              </span>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Turn Announcement Overlay ── */}
      <AnimatePresence>
        {turnAnnouncement && (
          <motion.div
            key={turnAnnouncement.key}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: turnAnnouncement.isYou
                ? 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(99,102,241,0.25) 0%, rgba(0,0,0,0.55) 70%)'
                : 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.55) 70%)'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative flex flex-col items-center gap-3"
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: [0.5, 1.08, 1], opacity: [0, 1, 1], y: [20, -4, 0] }}
              exit={{ scale: 0.9, opacity: 0, y: -12 }}
              transition={{ duration: 0.5, times: [0, 0.6, 1], ease: 'easeOut' }}
            >
              <motion.div
                className="rounded-full overflow-hidden border-4 shadow-lg"
                style={{
                  width: 80, height: 80,
                  borderColor: turnAnnouncement.isYou ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.25)',
                  boxShadow: turnAnnouncement.isYou
                    ? '0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.15)'
                    : '0 0 30px rgba(255,255,255,0.1)',
                }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.2, repeat: 0 }}
              >
                <img
                  src={getAvatarForPlayer(turnAnnouncement.avatarId).image}
                  alt={turnAnnouncement.playerName}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </motion.div>
              <div className="rounded-full bg-black/70 px-4 py-1.5 backdrop-blur-sm">
                <span className="text-sm font-semibold text-white">{turnAnnouncement.playerName}</span>
              </div>
              <motion.span
                className={`text-2xl font-serif font-bold tracking-wide ${
                  turnAnnouncement.isYou
                    ? 'text-primary drop-shadow-[0_0_16px_rgba(99,102,241,0.7)]'
                    : 'text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                {turnAnnouncement.isYou ? 'Your Turn' : `${turnAnnouncement.playerName}'s Turn`}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BaseDialog
        open={showEminenceBreakdown}
        onClose={() => setShowEminenceBreakdown(false)}
        title="Eminence breakdown"
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-white/70">Artifacts</span>
            <span className="font-bold text-white">+{eminenceBreakdown.artifacts}</span>
          </div>
          {eminenceBreakdown.luminaries > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
              <span className="text-white/70">Luminaries</span>
              <span className="font-bold text-white">+{eminenceBreakdown.luminaries}</span>
            </div>
          )}
          {eminenceBreakdown.oblivionRows.map(row => (
            <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg bg-red-950/40 border border-red-900/40 px-3 py-2">
              <span className="text-red-300/80">{row.name}</span>
              <span className="font-bold text-red-400">\u2212{row.amount} to all</span>
            </div>
          ))}
          {eminenceBreakdown.other > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
              <span className="text-white/70">Other</span>
              <span className="font-bold text-white">+{eminenceBreakdown.other}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
            <span className="text-primary/80">Total</span>
            <span className="font-bold text-primary">{me?.lumens ?? 0}</span>
          </div>
        </div>
      </BaseDialog>

      {/* ── Rules Sheet ── */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => setShowRules(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold">How to Play</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowRules(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-5 overflow-y-auto max-h-[60vh] space-y-4 pb-4">
                {[
                  {
                    icon: '💎',
                    title: 'Goal',
                    body: 'Be the first to reach 15 eminence. The round completes so every player gets equal turns, then the highest score wins.',
                  },
                  {
                    icon: '🪙',
                    title: 'On your turn — pick one action',
                    body: 'Harness up to 3 affinities (1 of each type) · Harness 2 of the same (needs 4+ in the well) · Reserve a card (hold up to 3, gain 1 Singularity) · Forge a card you can afford',
                  },
                  {
                    icon: '🃏',
                    title: 'Cards & bonuses',
                    body: 'Each forged card gives a permanent affinity discount (bonus) of its type. Pay the cost in affinities, using bonuses first. Singularity acts as a wild card for any shortfall.',
                  },
                  {
                    icon: '✨',
                    title: 'Eminence',
                    body: 'Some cards award eminence when forged. Luminaries (the top row) grant bonus eminence to the first player whose bonuses meet their requirements — claimed automatically.',
                  },
                  {
                    icon: '✋',
                    title: 'Affinity limit',
                    body: 'You may hold at most 10 affinities at end of turn. You may hold at most 3 reserved cards at once.',
                  },
                ].map(({ icon, title, body }) => (
                  <div key={title} className="flex gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <div className="font-semibold text-sm mb-0.5">{title}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reserved Cards Overlay ── */}
      <AnimatePresence>
        {showReservedOverlay && me && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => setShowReservedOverlay(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-muted-foreground" />
                  Reserved Artifacts ({me.reservedCards.length}/3)
                </h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowReservedOverlay(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-5 overflow-y-auto max-h-[60vh] pb-4">
                {me.reservedCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No cards reserved.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {me.reservedCards.map((c) => {
                      const ec = computeCosts(c, costMode);
                      const canBuy = canAffordCard(c, me);
                      return (
                        <div key={c.id} className="flex gap-4 items-center bg-secondary/30 rounded-2xl p-3">
                          <ArtifactCardView
                            card={c}
                            tier={c.tier}
                            effectiveCosts={ec}
                            onTap={() => {
                              setShowReservedOverlay(false);
                              openCardSheet(c, true);
                            }}
                            tapped={false}
                          />
                          <div className="flex-1 flex flex-col gap-2 min-w-0">
                            <div className="font-bold text-sm leading-tight">{c.name}</div>
                            {c.flavor && (
                              <p className="text-[11px] text-muted-foreground italic leading-relaxed line-clamp-2">"{c.flavor}"</p>
                            )}
                            <div className="flex items-center gap-1.5">
                              <MiniGem color={c.bonusColor as GemKey} size={13} />
                              <span className="text-xs text-muted-foreground">{GEM_META[c.bonusColor as GemKey]?.name ?? c.bonusColor} bonus</span>
                            </div>
                            {(c.lumens ?? 0) > 0 && (
                              <div className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="text-xs font-bold text-primary">{c.lumens} eminence</span>
                              </div>
                            )}
                            {(isMyTurn || (canPlan && canBuy)) && (
                              <Button
                                size="sm"
                                className={`mt-1 w-full font-bold border-0 text-black
                                  ${isMyTurn
                                    ? canBuy
                                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                      : 'bg-secondary text-muted-foreground'
                                    : 'bg-amber-600 hover:bg-amber-500'
                                  }`}
                                disabled={isMyTurn && !canBuy}
                                onClick={() => {
                                  setShowReservedOverlay(false);
                                  openCardSheet(c, true);
                                }}
                              >
                                <Gavel className="h-3.5 w-3.5 mr-1.5" />
                                {isMyTurn ? (canBuy ? 'Forge…' : 'Cannot afford') : 'Plan: Forge…'}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Forged Cards Overlay ── */}
      <AnimatePresence>
        {showForgedOverlay && me && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => setShowForgedOverlay(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  {forgedFilter
                    ? <>{GEM_META[forgedFilter].name} Artifacts</>
                    : <>Forged Artifacts ({me.purchasedCards?.length ?? 0})</>
                  }
                </h2>
                <div className="flex items-center gap-1">
                  {forgedFilter && (
                    <button
                      type="button"
                      onClick={() => setForgedFilter(null)}
                      className="text-[10px] text-muted-foreground underline underline-offset-2 px-2 py-1"
                    >
                      show all
                    </button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowForgedOverlay(false); setForgedFilter(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Color filter pills */}
              <div className="px-5 pb-2 flex gap-1.5 flex-wrap">
                {CRYSTALS.filter(c => c !== 'flux').map((c) => {
                  const count = (me.purchasedCards ?? []).filter(card => card.bonusColor === c).length;
                  if (count === 0) return null;
                  const meta = GEM_META[c as GemKey];
                  const active = forgedFilter === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForgedFilter(active ? null : c as GemKey)}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 transition-all"
                      style={{
                        background: active ? `${meta.hex}CC` : 'rgba(0,0,0,0.35)',
                        border: `1.5px solid ${active ? meta.hex : meta.hex + '55'}`,
                      }}
                    >
                      <MiniGem color={c as GemKey} size={11} />
                      <span className="text-[11px] font-bold" style={{ color: active ? '#fff' : meta.glowHex }}>×{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="px-5 overflow-y-auto max-h-[55vh] pb-4">
                {(() => {
                  const cards = forgedFilter
                    ? (me.purchasedCards ?? []).filter(card => card.bonusColor === forgedFilter)
                    : (me.purchasedCards ?? []);
                  return cards.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {forgedFilter ? `No ${GEM_META[forgedFilter].name} artifacts forged yet.` : 'No cards forged yet.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {cards.map((c) => (
                        <ArtifactCardView key={c.id} card={c} tier={c.tier} />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reserve Burst Overlay ── */}
      <AnimatePresence>
        {reserveBurst && (
          <motion.div
            key={reserveBurst.key}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative flex items-center gap-8">
              {/* Card back flips to center face-down */}
              <div style={{ perspective: '900px' }}>
                <motion.div
                  style={{ transformStyle: 'preserve-3d' }}
                  initial={{ rotateY: 90, scale: 0.65 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="relative"
                >
                  {/* Fade-out wrapper */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 3.2, times: [0, 0.12, 0.72, 1] }}
                  >
                    <CardBack tier={reserveBurst.tier} size="md" />
                  </motion.div>

                  {/* Avatar swoops in over card */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.55, y: -32 }}
                    animate={{ opacity: [0, 0, 1, 1, 1, 0], scale: [0.55, 0.55, 1.05, 1, 1, 0.96], y: [-32, -32, 0, 0, 0, 0] }}
                    transition={{ duration: 3.5, times: [0, 0.14, 0.28, 0.42, 0.82, 1] }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="rounded-full overflow-hidden border-4 shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                        style={{
                          width: 72, height: 72,
                          borderColor: `${GEM_META.flux.glowHex}88`,
                        }}
                      >
                        <img
                          src={getAvatarForPlayer(reserveBurst.avatarId ?? session.avatarId).image}
                          alt={reserveBurst.playerName}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      </div>
                      <div className="rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur">
                        {reserveBurst.playerName}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* Singularity token coin-flips in to the right */}
              {reserveBurst.gotFlux && (
                <motion.div
                  className="flex flex-col items-center gap-2"
                  style={{ perspective: '900px', transformStyle: 'preserve-3d' }}
                  initial={{ opacity: 0, rotateY: 90, scale: 0.6 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    rotateY: [90, 0, 720, 720],
                    scale: [0.6, 1, 1, 0.8],
                  }}
                  transition={{ duration: 3.0, times: [0, 0.12, 0.72, 1] }}
                >
                  <CrystalIcon color="flux" size={64} />
                  <span
                    className="text-sm font-bold drop-shadow-[0_0_10px_rgba(255,196,61,0.9)]"
                    style={{ color: GEM_META.flux.hex }}
                  >
                    +1 Singularity
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Win Overlay ── */}
      <AnimatePresence>
        {state.status === 'finished' && !pendingGameOver && summonQueue.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/92 backdrop-blur-md p-6"
          >
            {/* Radial glow behind card */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.18) 0%, transparent 70%)' }} />

            <motion.div
              initial={{ scale: 0.75, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.15 }}
              className="w-full max-w-sm text-center space-y-5 p-8 rounded-3xl border border-primary/40 bg-card/95 shadow-[0_0_100px_rgba(99,102,241,0.25)]"
            >
              {state.winnerId === session.playerId ? (
                <>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}
                    className="text-6xl"
                  >✨</motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="text-4xl font-serif font-bold text-primary gem-glow"
                  >
                    Victory!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-lg font-semibold"
                    style={{ color: GEM_META.flux.hex }}
                  >
                    The cosmos bends to your will.
                  </motion.p>
                </>
              ) : (
                <>
                  <div className="text-5xl">🌌</div>
                  <h2 className="text-4xl font-serif font-bold text-primary">Game Over</h2>
                  <div className="text-base text-foreground">
                    Winner: <span className="font-bold text-primary">{safePlayers.find(p => p.playerId === state.winnerId)?.playerName}</span>
                  </div>
                </>
              )}

              {/* Final scores — staggered in */}
              <div className="flex flex-col gap-2 pt-1">
                {[...state.players].sort((a, b) => b.lumens - a.lumens).map((p, i) => {
                  const isMe = p.playerId === session.playerId;
                  const avatarIdForPlayer = p.avatarId ?? (isMe ? session.avatarId : null);
                  return (
                  <motion.div
                    key={p.playerId}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.1 }}
                    className={`flex justify-between items-center px-3 py-2 rounded-xl ${p.playerId === state.winnerId ? 'bg-primary/20 border border-primary/40' : 'bg-secondary/50'}`}
                  >
                    <span className="font-medium text-sm flex items-center gap-2">
                      {p.playerId === state.winnerId && <span className="text-xs">🏆</span>}
                      <PlayerAvatar avatarId={avatarIdForPlayer} name={p.playerName} size={24} />
                      {p.playerName}
                    </span>
                    <span className="font-bold text-primary flex items-center gap-1">
                      {p.lumens} <Sparkles className="h-3.5 w-3.5" />
                    </span>
                  </motion.div>
                  );
                })}
              </div>

              {/* ── Session Record (appears after first vote) ───────────────── */}
              {rematchVote && Object.keys(rematchVote.sessionStats).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-secondary/40 px-3 py-2 space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Session Record</div>
                    {state.players.map((p) => {
                      const rec = rematchVote.sessionStats[p.playerId];
                      if (!rec) return null;
                      const isMe = p.playerId === session.playerId;
                      return (
                        <div key={p.playerId} className={`flex justify-between text-xs ${isMe ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                          <span>{p.playerName}</span>
                          <span className="tabular-nums">
                            <span className="text-emerald-400">{rec.wins}W</span>
                            {' · '}
                            <span className="text-red-400">{rec.losses}L</span>
                            {rec.ties > 0 && <span className="text-yellow-400"> · {rec.ties}T</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Play Again voting section ───────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex flex-col gap-2"
              >
                {/* Who has voted */}
                {rematchVote && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {state.players.map((p) => {
                        const voted = rematchVote.voterIds.includes(p.playerId);
                        const isMe = p.playerId === session.playerId;
                        const avatarIdForPlayer = p.avatarId ?? (isMe ? session.avatarId : null);
                        return (
                          <div key={p.playerId} className={`flex flex-col items-center gap-0.5 transition-opacity ${voted ? 'opacity-100' : 'opacity-35'}`}>
                            <div className="relative">
                              <PlayerAvatar avatarId={avatarIdForPlayer} name={p.playerName} size={28} />
                              {voted && (
                                <span className="absolute -top-1 -right-1 text-[10px] bg-emerald-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">✓</span>
                              )}
                            </div>
                            <span className="text-[9px] text-muted-foreground truncate max-w-[36px]">{p.playerName.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Countdown */}
                    {rematchVote.countdownEndsAt !== null && (
                      <RematchCountdown endsAt={rematchVote.countdownEndsAt} />
                    )}
                    {rematchVote.countdownEndsAt === null && state.players.filter(p => !p.isAi).length === 2 && !hasVoted && (
                      <p className="text-xs text-center text-muted-foreground">Waiting for both players to confirm…</p>
                    )}
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  disabled={hasVoted || votePending}
                  onClick={async () => {
                    if (hasVoted || votePending) return;
                    setVotePending(true);
                    try {
                      const resp = await fetch(`/api/rooms/${roomId}/rematch`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionToken: session.sessionToken }),
                      });
                      if (!resp.ok) throw new Error(await resp.text());
                      setHasVoted(true);
                    } catch {
                      toast({ title: 'Vote failed', description: 'Could not register your vote.', variant: 'destructive' });
                    } finally {
                      setVotePending(false);
                    }
                  }}
                >
                  {votePending ? 'Sending…' : hasVoted ? 'Vote cast ✓' : 'Play Again'}
                </Button>
                <Button size="lg" variant="outline" className="w-full" onClick={() => setLocation('/')}>Back to Home</Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Luminary summoning cutscene queue — plays one cutscene at a time.
          When the user presses "Skip view", the cutscene overlay is hidden via
          CSS (visibility:hidden) but the component stays mounted so its internal
          timer chain still runs and fires onComplete at the correct moment.
          onComplete sends resolve_summon to the server (clearing the global gate)
          and advances the local queue, at which point the "waiting" chip clears. */}
      <AnimatePresence>
        {summonQueue.length > 0 && summonQueue[0] && (() => {
          const entry = summonQueue[0];
          return (
            <div
              key={entry.eventId}
              style={localSummonSkipped
                ? { visibility: 'hidden', pointerEvents: 'none' }
                : undefined}
            >
              <LuminarySummonCutscene
                luminaryId={entry.id}
                luminaryName={entry.name}
                domain={entry.domain}
                lumens={entry.lumens}
                flavor={entry.flavor}
                cardRect={entry.cardRect}
                onFlash={() => setCutscenePostFlash(true)}
                onSkip={() => {
                  console.log(`[Luminae] Summon view skipped locally for eventId="${entry.eventId}"`);
                  setLocalSummonSkipped(true);
                }}
                onComplete={(() => {
                  const capturedEntry = entry;
                  return () => {
                    console.log(`[Luminae] Summon onComplete: eventId="${capturedEntry.eventId}" isDevTest=${capturedEntry.isDevTest}`);
                    setCutscenePostFlash(false);
                    setLocalSummonSkipped(false);
                    setSummonQueue(q => q.slice(1));
                    setClaimedThisSession(prev =>
                      prev.includes(capturedEntry.id) ? prev : [...prev, capturedEntry.id]
                    );
                    // Resolve the global summon gate on the server so all clients
                    // can unblock their turn actions once the cutscene is done.
                    if (!capturedEntry.isDevTest) {
                      executeAction({ type: 'resolve_summon', eventId: capturedEntry.eventId });
                    }
                  };
                })()}
              />
            </div>
          );
        })()}
      </AnimatePresence>

      {/* "Waiting" chip shown when the user has skipped their local view but
          the summon is still globally resolving (cutscene timer still running). */}
      {localSummonSkipped && summonQueue.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9001] flex items-center gap-2 bg-black/75 text-white/75 text-xs px-4 py-2 rounded-full border border-white/15 backdrop-blur pointer-events-none select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          <span>Summoning in progress…</span>
        </div>
      )}

      {/* Persistent entity overlays — one per luminary claimed this session.
          Each overlay flies from the viewport centre back to its panel card
          and then idles there with breathing / floating animations. */}
      {claimedThisSession.map(lumId => (
        <LuminaryIdleOverlay
          key={lumId}
          luminaryId={lumId}
          frozen={summonQueue.length > 0}
          hidden={activeTab !== 'board' || (summonQueue.length > 0 && !cutscenePostFlash)}
        />
      ))}

      {/* Dev test panels — visible in development only, tree-shaken from production */}
      {import.meta.env.DEV && (
        <>
          {/* Summon Test — plays the cinematic without touching server state */}
          <details className="fixed bottom-16 right-2 z-[8000] text-[10px]" open>
            <summary className="cursor-pointer text-white/70 hover:text-white select-none px-1">⚗ Summon Test</summary>
            <div className="mt-1 flex flex-col gap-0.5 bg-black/80 rounded p-1.5 border border-white/10 max-h-60 overflow-y-auto min-w-36">
              {Object.values(LUMINARY_VISUALS).map(v => (
                <button
                  key={v.id}
                  className="text-left px-2 py-0.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
                  style={{ borderLeft: `3px solid ${v.primaryColor}` }}
                  onClick={() => {
                    const lumData = safeLuminaries.find(l => l.id === v.id);
                    enqueueSummon(
                      v.id,
                      lumData?.name ?? v.id.replace('lum_', '').replace(/^\w/, c => c.toUpperCase()),
                      (lumData as { domain?: string } | undefined)?.domain ?? '',
                      (lumData as { oblivion?: number } | undefined)?.oblivion
                        ? -((lumData as { oblivion?: number }).oblivion as number)
                        : (lumData?.lumens ?? 0),
                      (lumData as { flavor?: string } | undefined)?.flavor ?? '',
                      `dev-test-${v.id}-${Date.now()}`, // unique each click
                      true,                             // isDevTest — no server resolve
                    );
                  }}
                >
                  {v.id}
                </button>
              ))}
            </div>
          </details>

          {/* Portal Preview — toggles claimed-portal visual locally, no server write */}
          <details className="fixed bottom-16 right-40 z-[8000] text-[10px]">
            <summary className="cursor-pointer text-white/70 hover:text-white select-none px-1">🌀 Portal Preview</summary>
            <div className="mt-1 bg-black/80 rounded p-1.5 border border-white/10 min-w-48">
              <p className="text-white/40 leading-tight mb-1.5 px-1">
                Client-only · no server write
              </p>
              <p className="text-white/30 leading-tight mb-1.5 px-1">
                Toggle portal · click portal card to cycle affinity
              </p>
              <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
                {Object.values(LUMINARY_VISUALS).map(v => {
                  const isRealClaimed = state.players.some(p => (p.claimedLuminaryIds ?? []).includes(v.id));
                  const isPreviewed = previewedPortals.has(v.id);
                  const lumDef = safeLuminaries.find(l => l.id === v.id);
                  const eligibleForPreview = lumDef
                    ? GEM_KEYS.filter(k => k !== 'flux' && (lumDef.requirements[k as GemKey] ?? 0) > 0)
                    : [];
                  const currentDevIdx = devPortalAffinityIdx[v.id] ?? 0;
                  const currentDevAffinity = eligibleForPreview.length > 0
                    ? eligibleForPreview[currentDevIdx % eligibleForPreview.length]
                    : null;
                  return (
                    <button
                      key={v.id}
                      className={`text-left px-2 py-0.5 rounded text-white/70 hover:text-white flex items-center gap-1.5 ${isPreviewed ? 'bg-white/10' : 'hover:bg-white/10'}`}
                      style={{ borderLeft: `3px solid ${isPreviewed ? v.primaryColor : 'transparent'}` }}
                      disabled={isRealClaimed}
                      title={isRealClaimed ? 'Already claimed in game state' : (isPreviewed ? 'Click to hide portal' : 'Click to preview portal')}
                      onClick={() => setPreviewedPortals(prev => {
                        const next = new Set(prev);
                        if (next.has(v.id)) {
                          next.delete(v.id);
                          setDevPortalAffinityIdx(prev2 => { const n = { ...prev2 }; delete n[v.id]; return n; });
                        } else {
                          next.add(v.id);
                        }
                        return next;
                      })}
                    >
                      <span className={isPreviewed ? 'text-white' : ''}>{v.id}</span>
                      {isPreviewed && currentDevAffinity && (
                        <span className="ml-auto text-white/50" style={{ color: GEM_META[currentDevAffinity as GemKey]?.glowHex }}>
                          {GEM_META[currentDevAffinity as GemKey]?.shortName}
                        </span>
                      )}
                      {!isPreviewed && isRealClaimed && <span className="ml-auto text-amber-400/70">★</span>}
                    </button>
                  );
                })}
              </div>
              {previewedPortals.size > 0 && (
                <button
                  className="mt-1.5 w-full text-center text-white/40 hover:text-white/70 px-1 py-0.5 rounded hover:bg-white/10"
                  onClick={() => { setPreviewedPortals(new Set()); setDevPortalAffinityIdx({}); }}
                >
                  Clear all
                </button>
              )}
            </div>
          </details>
        </>
      )}

    </div>
  );
}
