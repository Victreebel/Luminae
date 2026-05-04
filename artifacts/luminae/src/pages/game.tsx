import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { 
  useGetGameState, 
  useSubmitAction, 
  getGetGameStateQueryKey
} from '@workspace/api-client-react';
import type { 
  GameState, 
  CrystalCounts, 
  ArtifactCard, 
  Luminary,
  GamePlayerState,
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
  Bookmark, ShoppingCart, Eye, EyeOff, Package, LayoutGrid, Hand, List,
  ChevronDown, ChevronUp, ChevronRight, Flag, X, HelpCircle
} from 'lucide-react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { getAvatarForPlayer } from '@/lib/avatars';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';
import luminaryStargazer from '@assets/generated_images/luminary_stargazer.png';
import luminaryForgemaster from '@assets/generated_images/luminary_forgemaster.png';
import luminaryArchivist from '@assets/generated_images/luminary_archivist.png';
import luminaryCultivator from '@assets/generated_images/luminary_cultivator.png';
import luminaryVoidcaller from '@assets/generated_images/luminary_voidcaller.png';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import cardBackLogo from '@assets/generated_images/luminae_card_back_logo.png';
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

const LUMINARY_PORTRAITS = [
  luminaryStargazer,
  luminaryForgemaster,
  luminaryArchivist,
  luminaryCultivator,
  luminaryVoidcaller,
];

function pickLuminaryPortrait(luminary: Luminary): string {
  const dominant = (Object.entries(luminary.requirements) as [GemKey, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const idx: Record<GemKey, number> = {
    pearl: 0, ruby: 1, sapphire: 2, emerald: 3, onyx: 4, flux: 0,
  };
  return LUMINARY_PORTRAITS[idx[dominant ?? "pearl"] % LUMINARY_PORTRAITS.length];
}

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
  const tintMap: Record<1 | 2 | 3, string> = {
    1: 'brightness-105 saturate-125 hue-rotate-0',
    2: 'brightness-105 saturate-125 hue-rotate-90',
    3: 'brightness-105 saturate-125 hue-rotate-180',
  };
  const tint = tier ? tintMap[tier] : 'brightness-105 saturate-125';
  return (
    <div className={`${sz} relative rounded-xl overflow-hidden border-2 border-border/60 shadow-md bg-secondary shrink-0`}>
      <img
        src={cardBackLogo} alt="Card back"
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none ${tint}`}
        draggable={false}
      />
      {count !== undefined && (
        <span className="absolute bottom-1 right-1.5 text-xs font-mono font-bold text-white bg-black/70 rounded px-1.5 py-0.5">
          {count}
        </span>
      )}
    </div>
  );
}

function LuminaryCard({ luminary }: { luminary: Luminary }) {
  const portrait = pickLuminaryPortrait(luminary);
  return (
    <div
      className="relative w-24 h-24 rounded-xl overflow-hidden border-2 p-2 flex flex-col items-center justify-end gap-1 shadow-[0_0_18px_rgba(255,196,61,0.18)] shrink-0"
      style={{ borderColor: `${GEM_META.flux.hex}55` }}
    >
      <img src={portrait} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 pointer-events-none" />
      <span
        className="absolute top-1 right-2 text-xl font-serif font-bold drop-shadow-[0_2px_3px_rgba(0,0,0,1)]"
        style={{ color: GEM_META.flux.hex }}
      >
        {luminary.lumens}
      </span>
      <div className="relative z-10 flex flex-wrap justify-center gap-0.5 max-w-full">
        {CRYSTALS.map((c) => {
          const req = luminary.requirements[c as keyof CrystalCounts];
          if (req > 0) {
            return (
              <div key={c} className="flex items-center gap-0.5 bg-black/70 px-1 py-0.5 rounded">
                <span className="text-[9px] font-bold text-white">{req}</span>
                <MiniGem color={c} size={9} />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
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

let DevAnimSandbox: React.FC<{
  session: { playerId: string; playerName: string; avatarId?: string | null };
  state: GameState;
  cardActionBurstKeyRef: React.MutableRefObject<number>;
  reserveBurstKeyRef: React.MutableRefObject<number>;
  burstKeyRef: React.MutableRefObject<number>;
  cardAnimTimersRef: React.MutableRefObject<ReturnType<typeof setTimeout>[]>;
  setCardActionBurst: (v: any) => void;
  setReserveBurst: (v: any) => void;
  setPurchaseBurst: (v: any) => void;
  setFlippingCards: (v: Set<string>) => void;
}> = () => null;

if (import.meta.env.DEV) {
  const DEV_MOCK_CARD: ArtifactCard = {
    id: 't2r03', tier: 2, bonusColor: 'ruby', lumens: 2,
    cost: { ruby: 3, sapphire: 0, emerald: 0, onyx: 0, pearl: 3, flux: 0 },
    name: "Pyrelord's Sigil", flavor: 'Brands the sky with a single command.',
  };

  DevAnimSandbox = function DevAnimSandboxImpl({
    session, state, cardActionBurstKeyRef, reserveBurstKeyRef, burstKeyRef,
    cardAnimTimersRef, setCardActionBurst, setReserveBurst, setPurchaseBurst, setFlippingCards,
  }) {
    const [open, setOpen] = useState(false);
    const mockRect = { x: 60, y: 200, w: 112, h: 160 };

    const firePurchase = () => {
      cardActionBurstKeyRef.current += 1;
      const seq = cardActionBurstKeyRef.current;
      setCardActionBurst({
        key: seq, card: DEV_MOCK_CARD, tier: 2, actionType: 'purchase',
        playerName: session.playerName, avatarId: session.avatarId ?? null,
        lumens: 2, gotFlux: false, startRect: mockRect,
      });
      const t = setTimeout(() => { if (cardActionBurstKeyRef.current === seq) setCardActionBurst(null); }, 3500);
      cardAnimTimersRef.current.push(t);
    };

    const fireReserve = () => {
      cardActionBurstKeyRef.current += 1;
      const seq = cardActionBurstKeyRef.current;
      setCardActionBurst({
        key: seq, card: DEV_MOCK_CARD, tier: 2, actionType: 'reserve',
        playerName: session.playerName, avatarId: session.avatarId ?? null,
        lumens: 0, gotFlux: true, startRect: mockRect,
      });
      const t = setTimeout(() => { if (cardActionBurstKeyRef.current === seq) setCardActionBurst(null); }, 3500);
      cardAnimTimersRef.current.push(t);
    };

    const fireDeckReserve = () => {
      reserveBurstKeyRef.current += 1;
      setReserveBurst({
        key: reserveBurstKeyRef.current, tier: 2, gotFlux: true,
        playerId: session.playerId, playerName: session.playerName,
        avatarId: session.avatarId ?? null,
      });
      const t = setTimeout(() => setReserveBurst(null), 3500);
      cardAnimTimersRef.current.push(t);
    };

    const fireCelebration = () => {
      burstKeyRef.current += 1;
      setPurchaseBurst({ key: burstKeyRef.current, lumens: 3, name: "Pyrelord's Sigil" });
      const t = setTimeout(() => setPurchaseBurst(null), 1400);
      cardAnimTimersRef.current.push(t);
    };

    const fireFlipIn = () => {
      const firstCard = state.marketTier1?.[0];
      if (firstCard) {
        setFlippingCards(new Set([firstCard.id]));
        const t = setTimeout(() => setFlippingCards(new Set()), 800);
        cardAnimTimersRef.current.push(t);
      }
    };

    const BTN = "w-full text-left text-xs font-semibold text-white rounded-lg px-3 py-2 transition-colors";

    return (
      <div className="fixed bottom-24 left-2 z-[60]">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="h-8 w-8 rounded-full bg-yellow-500/80 text-black text-xs font-black flex items-center justify-center shadow-lg border-2 border-yellow-300/60"
          title="Dev Animation Sandbox"
          aria-label="Dev Animation Sandbox"
        >
          {open ? '\u00d7' : '\u26a1'}
        </button>
        {open && (
          <div className="absolute bottom-10 left-0 w-52 bg-black/90 border border-yellow-500/50 rounded-xl p-3 shadow-2xl backdrop-blur space-y-2">
            <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-1">Anim Sandbox</div>
            <button type="button" className={`${BTN} bg-indigo-600/60 hover:bg-indigo-600/80`} onClick={firePurchase}>Purchase Burst</button>
            <button type="button" className={`${BTN} bg-amber-600/60 hover:bg-amber-600/80`} onClick={fireReserve}>Reserve Burst (+ Flux)</button>
            <button type="button" className={`${BTN} bg-purple-600/60 hover:bg-purple-600/80`} onClick={fireDeckReserve}>Deck Reserve Burst</button>
            <button type="button" className={`${BTN} bg-pink-600/60 hover:bg-pink-600/80`} onClick={fireCelebration}>Purchase Celebration</button>
            <button type="button" className={`${BTN} bg-teal-600/60 hover:bg-teal-600/80`} onClick={fireFlipIn}>Card Flip-in</button>
          </div>
        )}
      </div>
    );
  };
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
  const [actionMode, setActionMode] = useState<'none' | 'take3' | 'take2'>('none');
  const [showEffectiveCost, setShowEffectiveCost] = useState(true);
  const [showPurchased, setShowPurchased] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
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
  const [showForgedOverlay, setShowForgedOverlay] = useState(false);
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
  const prevStateRef = useRef<GameState | null>(null);

  const toggleMute = () => setMuted(gameAudio.toggleMute());

  // Start ambient music when the game board mounts (user has already
  // interacted via buttons to get here, so AudioContext is allowed).
  // Stop and clean up when they leave the game.
  useEffect(() => {
    gameAudio.startMusic();
    return () => { gameAudio.stopMusic(); };
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
      const key = `init-${state.currentPlayerIndex}-${state.version}`;
      fireTurnAnnouncement(key, cp.playerName, cp.avatarId ?? null, cp.playerId === session.playerId);
    }
  }, [state?.status, state?.version]);

  processUpdateRef.current = (newState: GameState) => {
    const prev = prevStateRef.current;
    if (prev && newState.version <= prev.version) return;
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
              setHiddenSlots(new Set());
              if (newCard) {
                setFlippingCards(new Set([newCard.id]));
                const t2 = setTimeout(() => {
                  if (cardActionBurstKeyRef.current !== seq) return;
                  setFlippingCards(new Set());
                }, 800);
                cardAnimTimersRef.current.push(t2);
              }
            }, 3500);
            cardAnimTimersRef.current.push(t1);
            break;
          }
        }
      }

      queryClient.setQueryData(getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }), newState);
      prevStateRef.current = newState;

      if (newState.status === 'finished' && (prev?.status ?? state?.status) !== 'finished') {
        cancelTurnAnnouncement();
        gameAudio.playWin();
      }

      if (action && (action.type === 'take_three_crystals' || action.type === 'take_two_crystals')) {
        const takeKey = `${action.type}-${action.playerId}-${newState.version}`;
        if (takeKey !== lastTakeBurstActionRef.current) {
          lastTakeBurstActionRef.current = takeKey;
          const actorId = action.playerId as string | undefined;
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
        const isMe = nextPlayer.playerId === session?.playerId;
        const key = `ws-${newState.currentPlayerIndex}-${newState.version}`;
        fireTurnAnnouncement(key, nextPlayer.playerName, nextPlayer.avatarId ?? null, isMe);
      }
  };

  drainQueueFnRef.current = () => {
    queueTimerRef.current = null;
    if (stateQueueRef.current.length === 0) return;
    const remaining = animationEndTimeRef.current - Date.now();
    if (remaining > 50 || pendingTurnAnnounceRef.current) {
      const delay = remaining > 50 ? remaining + 100 : 200;
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

  useGameWebsocket({
    roomId: roomId!,
    sessionToken: session?.sessionToken || '',
    onStateUpdate: (newState) => {
      const remaining = animationEndTimeRef.current - Date.now();
      const queueBusy = stateQueueRef.current.length > 0 || !!queueTimerRef.current;
      if (remaining > 50 || queueBusy) {
        stateQueueRef.current.push(newState);
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
    }
  });

  const submitAction = useSubmitAction();

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

  const actionsLocked = !!turnAnnouncement;
  const isMyTurn = !actionsLocked && state.status === 'playing' && state.players[state.currentPlayerIndex].playerId === session.playerId;
  const me = state.players.find(p => p.playerId === session.playerId);
  const currentPlayerName = state.players[state.currentPlayerIndex]?.playerName ?? '';

  const handleCrystalClick = (color: keyof CrystalCounts) => {
    if (!isMyTurn || color === 'flux' || !state) return;
    const inBank = state.crystalBank[color] ?? 0;

    if (actionMode === 'take2') {
      if (selectedCrystals[color] === 2) { setSelectedCrystals({}); setActionMode('none'); }
      else if (inBank >= 4) { setSelectedCrystals({ [color]: 2 }); gameAudio.playCrystalPicked(color as GemKey); }
      return;
    }

    const current = selectedCrystals[color] ?? 0;
    if (current > 0) {
      const next = { ...selectedCrystals };
      delete next[color];
      const empty = Object.keys(next).length === 0;
      setSelectedCrystals(next);
      if (empty) setActionMode('none');
      return;
    }

    if (inBank <= 0) return;
    const distinctCount = Object.keys(selectedCrystals).length;
    if (distinctCount >= 3) return;
    setSelectedCrystals({ ...selectedCrystals, [color]: 1 });
    setActionMode(actionMode === 'none' ? 'take3' : actionMode);
    gameAudio.playCrystalPicked(color as GemKey);
  };

  const promoteToTake2 = (color: GemKey) => {
    if (!state || (state.crystalBank[color] ?? 0) < 4) return;
    setSelectedCrystals({ [color]: 2 });
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
      setSelectedCard(null);
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
      if ((state.crystalBank[c] ?? 0) >= 4) return { ok: true, reason: `Harvest 2 ${GEM_META[c as GemKey].name}`, actionType: 'take2' };
      return { ok: false, reason: `Need 4+ in well to harvest 2`, actionType: null };
    }
    if (distinct.every(c => (selectedCrystals[c as keyof CrystalCounts] ?? 0) === 1) && distinct.length <= 3) {
      return { ok: true, reason: distinct.length === 3 ? 'Harvest 3 different' : `Harvest ${distinct.length}`, actionType: 'take3' };
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

  const effectiveCost = (card: ArtifactCard, p: GamePlayerState) => {
    const out: Record<string, number> = {};
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
      out[c] = Math.max(0, (card.cost[c as keyof CrystalCounts] ?? 0) - (p.bonuses[c as keyof CrystalCounts] ?? 0));
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

  const openCardSheet = (card: ArtifactCard, fromReserve: boolean) => {
    if (!me) return;
    const ec = showEffectiveCost ? effectiveCost(card, me) as Partial<Record<GemKey, number>> : undefined;
    setSelectedCard({
      card, fromReserve,
      canBuy: isMyTurn && canAffordCard(card, me),
      canReserve: isMyTurn && !fromReserve && canReserveMore(me),
      effectiveCosts: ec,
    });
  };

  const handleSurrender = () => {
    if (confirm("Surrender? This cannot be undone.")) executeAction({ type: 'surrender' });
  };

  const crystalQueueActive = Object.keys(selectedCrystals).length > 0;
  const myReservedCount = me?.reservedCards.length ?? 0;

  // ---- TABS ----

  const BoardTab = () => {
    const myTotalGems = Object.values(me?.crystals ?? {}).reduce((a, b) => a + b, 0);
    const myCardCount = (me as any)?.purchasedCards?.length ?? (me as any)?.purchasedCardIds?.length ?? 0;
    return (
    <div className="flex flex-col gap-5 p-3 pb-6">

      {/* Luminaries */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Luminaries</p>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {state.luminaries.map(l => <LuminaryCard key={l.id} luminary={l} />)}
        </div>
      </div>

      {/* Market rows */}
      <div className="flex flex-col gap-4">
        {/* Cost toggle */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Market</p>
          <button
            type="button"
            onClick={() => setShowEffectiveCost(v => !v)}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${showEffectiveCost ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-secondary/50 border-border/50 text-muted-foreground'}`}
          >
            {showEffectiveCost ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {showEffectiveCost ? 'My cost' : 'Base cost'}
          </button>
        </div>

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
                onClick={() => row.deck > 0 && me && canReserveMore(me) && handleReserveDeck(row.tier)}
                disabled={!isMyTurn || row.deck === 0 || !me || !canReserveMore(me)}
                className="relative shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={row.deck === 0 ? 'Deck empty' : 'Reserve hidden card'}
              >
                <CardBack count={row.deck} tier={row.tier as 1 | 2 | 3} />
                {isMyTurn && row.deck > 0 && me && canReserveMore(me) && (
                  <div className="absolute inset-x-0 bottom-0 bg-primary/90 text-primary-foreground text-[9px] font-bold uppercase text-center py-1 rounded-b-xl">
                    Hold
                  </div>
                )}
              </button>
              {row.cards.map((c, i) => {
                const slotKey = `${row.tier}-${i}`;
                const isHidden = hiddenSlots.has(slotKey);

                if (isHidden || !c) {
                  return <div key={c?.id ?? `empty-${i}`} className="w-28 h-40 rounded-xl border-2 border-dashed border-border/30 opacity-40 shrink-0" />;
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
                          effectiveCosts={showEffectiveCost && me ? effectiveCost(c, me) as Partial<Record<GemKey, number>> : undefined}
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
                      effectiveCosts={showEffectiveCost && me ? effectiveCost(c, me) as Partial<Record<GemKey, number>> : undefined}
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Essence Well</p>
          {(() => {
            const fluxCount = state.crystalBank.flux ?? 0;
            return (
              <div className="flex items-center gap-1.5 opacity-80">
                <MiniGem color="flux" size={14} />
                <span className="text-[10px] font-mono font-bold text-amber-300/80">{fluxCount}</span>
                <span className="text-[9px] text-muted-foreground">wild</span>
              </div>
            );
          })()}
        </div>
        <div className="px-3 pb-3 grid grid-cols-5 gap-1">
          {CRYSTALS.filter(c => c !== 'flux').map((c) => {
            const meta = GEM_META[c];
            const count = state.crystalBank[c as keyof CrystalCounts] ?? 0;
            const queued = selectedCrystals[c as keyof CrystalCounts] ?? 0;
            const selectable = isMyTurn;
            const isEmpty = count === 0 && queued === 0;
            const canTake2 = selectable && count >= 4 && queued !== 2;
            return (
              <div key={c} className="flex flex-col items-center">
                <motion.button
                  type="button"
                  disabled={!selectable || isEmpty}
                  whileTap={selectable && !isEmpty ? { scale: 0.9 } : {}}
                  animate={queued > 0 ? { scale: [1, 1.08, 1], transition: { duration: 0.3 } } : {}}
                  onClick={() => handleCrystalClick(c as keyof CrystalCounts)}
                  className={`relative w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                    queued > 0
                      ? 'bg-primary/20 ring-2 ring-primary shadow-lg'
                      : isEmpty
                        ? 'bg-white/[0.03] opacity-40'
                        : 'bg-white/[0.06] active:bg-white/[0.12]'
                  }`}
                  style={queued > 0 ? { boxShadow: `0 0 16px ${meta.glowHex}40` } : {}}
                >
                  <img
                    src={meta.image} alt={meta.name}
                    className="w-14 h-14 object-contain pointer-events-none select-none"
                    style={{ filter: isEmpty ? 'grayscale(0.8) opacity(0.4)' : `drop-shadow(0 0 6px ${meta.glowHex}66)` }}
                    draggable={false}
                  />
                  <div className="flex items-center gap-0.5 mt-1">
                    <span className={`text-base font-black font-mono leading-none ${isEmpty ? 'text-white/30' : 'text-white'}`}>{count}</span>
                    {queued > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs font-bold text-primary leading-none"
                      >+{queued}</motion.span>
                    )}
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
                    className="mt-0.5 text-[9px] font-bold text-primary/80 hover:text-primary bg-primary/10 rounded-full px-2 py-0.5 active:bg-primary/25 transition-colors"
                  >
                    harvest 2
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
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg"
                      onClick={() => { setActionMode('none'); setSelectedCrystals({}); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-3 rounded-lg text-xs font-bold"
                      onClick={confirmCrystals}
                      disabled={!queueLegality.ok}
                    >
                      Harvest
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isMyTurn && !crystalQueueActive && (
          <div className="px-3 pb-2.5">
            <p className="text-[9px] text-muted-foreground text-center italic">
              Tap to harvest affinities · up to 3 different or 2 of the same
            </p>
          </div>
        )}
      </div>

      {/* ── My Holdings strip ── */}
      {me && (
        <div className={`rounded-2xl border px-3 py-2.5 bg-card/70 backdrop-blur transition-all ${isMyTurn ? 'border-primary/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-border/40'}`}>
          {/* top row: avatar + name + lumens */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <PlayerAvatar avatarId={session.avatarId} name={me.playerName} size={26} />
              {isMyTurn && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
              <span className="text-xs font-semibold truncate">{me.playerName}</span>
              {isMyTurn && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">your turn</span>}
            </div>
            <div className="flex items-center gap-0.5 shrink-0 ml-2">
              <span className="font-serif font-black text-lg text-primary leading-none">{me.lumens}</span>
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[9px] text-primary/60 font-mono uppercase tracking-wide ml-0.5">eminence</span>
            </div>
          </div>
          {/* stats row */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
            <span><span className="font-semibold text-foreground/80">{myTotalGems}</span> affinities</span>
            <span>·</span>
            <button type="button" onClick={() => setShowForgedOverlay(true)} className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors active:bg-primary/20 hover:bg-primary/10">
              <span className="font-semibold text-foreground/80">{myCardCount}</span> forged
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            </button>
            {me.reservedCards.length > 0 && (
              <><span>·</span><span><span className="font-semibold text-foreground/80">{me.reservedCards.length}</span> held</span></>
            )}
          </div>
          {/* gem + bonus grid */}
          <div className="flex gap-1">
            {CRYSTALS.map((c) => {
              const gems = me.crystals[c as keyof CrystalCounts] ?? 0;
              const bonus = me.bonuses[c as keyof CrystalCounts] ?? 0;
              return (
                <div key={c} className="flex flex-col items-center gap-0.5 flex-1">
                  <MiniGem color={c as GemKey} size={12} />
                  <span className="text-[11px] font-bold text-white leading-none">{gems}</span>
                  {bonus > 0 && (
                    <span className="text-[9px] font-bold leading-none" style={{ color: GEM_META[c as GemKey].glowHex }}>+{bonus}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Opponents (always visible on Board tab) ── */}
      {state.players.filter(p => p.playerId !== session?.playerId).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Opponents</p>
          <div className="flex flex-col gap-2">
            {state.players.map((p, i) => {
              if (p.playerId === session?.playerId) return null;
              const isCurrent = state.status === 'playing' && state.currentPlayerIndex === i;
              const totalGems = Object.values(p.crystals).reduce((a, b) => a + b, 0);
              const cardCount = (p as any).purchasedCards?.length ?? (p as any).purchasedCardIds?.length ?? 0;
              return (
                <div
                  key={p.playerId}
                  className={`rounded-2xl border p-3 bg-card/70 backdrop-blur transition-all ${isCurrent ? 'border-primary/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-border/40'}`}
                >
                  {/* Row 1: avatar + name + lumens */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1.5">
                      <PlayerAvatar avatarId={p.avatarId ?? null} name={p.playerName} size={26} />
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                      <span className="font-semibold text-sm truncate max-w-[120px]">{p.playerName}</span>
                      {isCurrent && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">their turn</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-serif font-black text-xl text-primary">{p.lumens}</span>
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>

                  {/* Row 2: per-color gem counts */}
                  <div className="flex gap-1 mb-2">
                    {CRYSTALS.map((c) => {
                      const n = p.crystals[c as keyof CrystalCounts] ?? 0;
                      const bonus = p.bonuses[c as keyof CrystalCounts] ?? 0;
                      return (
                        <div key={c} className="flex flex-col items-center gap-0.5 flex-1">
                          <MiniGem color={c as GemKey} size={13} />
                          <span className="text-[11px] font-bold text-white leading-none">{n}</span>
                          {bonus > 0 && (
                            <span className="text-[9px] font-bold leading-none" style={{ color: GEM_META[c as GemKey].glowHex }}>+{bonus}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Row 3: totals + reserved */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <span className="font-semibold text-foreground/80">{totalGems}</span> affinities
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <span className="font-semibold text-foreground/80">{cardCount}</span> forged
                      </span>
                    </div>
                    <div className="flex gap-1 items-center">
                      {p.reservedCards.length > 0 ? (
                        <>
                          <span className="text-[11px] text-muted-foreground mr-0.5">reserved:</span>
                          {p.reservedCards.map((card, idx) => (
                            <CardBack key={idx} size="sm" tier={card.tier as 1 | 2 | 3} />
                          ))}
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">no reserve</span>
                      )}
                    </div>
                  </div>
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
        <div className="grid grid-cols-3 gap-2.5">
          {CRYSTALS.map((c) => (
            <div key={c} className="flex items-center gap-2.5 bg-secondary/50 rounded-xl p-2.5">
              <CrystalIcon color={c} size={44} count={me?.crystals[c as keyof CrystalCounts]} />
              <div className="flex flex-col">
                <span className="text-xs font-semibold" style={{ color: GEM_META[c].glowHex }}>{GEM_META[c].shortName}</span>
                {(me?.bonuses[c as keyof CrystalCounts] ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-primary">+{me?.bonuses[c as keyof CrystalCounts]} bonus</span>
                )}
              </div>
            </div>
          ))}
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
                effectiveCosts={showEffectiveCost && me ? effectiveCost(c, me) as Partial<Record<GemKey, number>> : undefined}
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
            {/* Bonus summary */}
            <div className="flex gap-1.5 flex-wrap mb-3">
              {CRYSTALS.filter(c => c !== 'flux').map((c) => {
                const count = me?.bonuses[c as keyof CrystalCounts] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={c} className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
                    <MiniGem color={c as GemKey} size={12} />
                    <span className="text-xs font-bold text-white">×{count}</span>
                  </div>
                );
              })}
              {Object.values(me?.bonuses ?? {}).every(v => v === 0) && (
                <span className="text-xs text-muted-foreground italic">No bonuses yet</span>
              )}
            </div>
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

                {/* Per-color gems + bonuses grid */}
                <div className="grid grid-cols-6 gap-1 mb-3">
                  {CRYSTALS.map((c) => {
                    const n = p.crystals[c as keyof CrystalCounts] ?? 0;
                    const bonus = p.bonuses[c as keyof CrystalCounts] ?? 0;
                    return (
                      <div key={c} className="flex flex-col items-center gap-0.5 bg-black/30 rounded-lg py-1.5">
                        <MiniGem color={c as GemKey} size={14} />
                        <span className="text-[12px] font-black text-white leading-none">{n}</span>
                        {bonus > 0 ? (
                          <span className="text-[9px] font-bold leading-none" style={{ color: GEM_META[c as GemKey].glowHex }}>+{bonus}</span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground/40 leading-none">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer: totals + reserved cards */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground/80">{Object.values(p.crystals).reduce((a, b) => a + b, 0)}</span> affinities
                    </span>
                    <span>
                      <span className="font-semibold text-foreground/80">{cardCount}</span> forged
                    </span>
                  </div>
                  <div className="flex gap-1 items-center">
                    {p.reservedCards.length > 0 ? (
                      p.reservedCards.map((card, idx) => (
                        <CardBack key={idx} size="sm" tier={card.tier as 1 | 2 | 3} />
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">no reserve</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Log */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Recent Actions</p>
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur divide-y divide-border/30">
          {(state.actionLog ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground italic text-center">No actions yet.</div>
          ) : (
            [...(state.actionLog ?? [])].reverse().slice(0, 12).map((entry, i) => {
              const isMe = entry.playerId === session.playerId;
              const logPlayer = state.players.find((pl) => pl.playerId === entry.playerId);
              return (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                <PlayerAvatar
                  avatarId={logPlayer?.avatarId ?? (isMe ? session.avatarId : null)}
                  name={entry.playerName}
                  size={22}
                />
                <div className="text-xs leading-relaxed">
                  <span className={`font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>{entry.playerName}</span>
                  <span className="text-foreground/80"> · {entry.summary}</span>
                  <span className="ml-1 text-[10px] text-muted-foreground/40">R{entry.turn}</span>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden relative">
      {/* Cosmic background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: `url(${backgroundCosmos})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-background/85 pointer-events-none" />

      {/* ── Header ── */}
      <header className="shrink-0 h-14 px-4 flex items-center justify-between bg-card/70 backdrop-blur border-b border-border z-20">
        <div className="flex items-center gap-2">
          <img src={gemIcon} alt="" className="h-7 w-7 drop-shadow-[0_0_10px_rgba(80,130,255,0.5)]" draggable={false} />
          <h1 className="text-base font-serif font-bold text-primary tracking-wide">Luminae</h1>
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden z-10">
        {activeTab === 'board' && <BoardTab />}
        {activeTab === 'hand' && <HandTab />}
        {activeTab === 'log' && <LogTab />}
      </main>

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
              <div className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-b-full" />
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
            onClick={() => setSelectedCard(null)}
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
                  effectiveCosts={selectedCard.effectiveCosts}
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
              {showEffectiveCost && selectedCard.effectiveCosts && me && (() => {
                const rows: { gem: GemKey; need: number; have: number; short: number }[] = [];
                let totalShort = 0;
                for (const c of CRYSTALS) {
                  if (c === 'flux') continue;
                  const need = selectedCard.effectiveCosts[c] ?? 0;
                  if (need <= 0) continue;
                  const have = Math.min(need, me.crystals[c as keyof CrystalCounts] ?? 0);
                  const short = Math.max(0, need - have);
                  totalShort += short;
                  rows.push({ gem: c as GemKey, need, have, short });
                }
                const fluxHave = me.crystals.flux ?? 0;
                const fluxNeeded = Math.max(0, totalShort);
                const fluxCovers = fluxNeeded <= fluxHave;
                const canAfford = fluxNeeded === 0 || fluxCovers;
                if (rows.length === 0) return null;
                return (
                  <div className="mb-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What you still need</p>
                    <div className="flex flex-wrap gap-2">
                      {rows.map(({ gem, need, have, short }) => (
                        <div key={gem} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${short === 0 ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                          <MiniGem color={gem} size={12} />
                          {short === 0
                            ? <span className="text-green-400">✓ {have}/{need}</span>
                            : <span>−{short} <span className="text-white/40 font-normal">({have}/{need})</span></span>
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
                    {canAfford && (
                      <p className="text-[10px] font-semibold text-green-400">You can forge this now</p>
                    )}
                    {!canAfford && (
                      <p className="text-[10px] font-semibold text-red-400">Still short — keep harvesting</p>
                    )}
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                {isMyTurn ? (
                  <>
                    <Button
                      className="w-full h-12 text-base font-bold"
                      disabled={!selectedCard.canBuy}
                      onClick={() => handleBuy(selectedCard.card, selectedCard.fromReserve)}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {selectedCard.canBuy ? 'Forge Artifact' : 'Cannot afford yet'}
                    </Button>
                    {!selectedCard.fromReserve && (
                      <Button
                        variant="secondary"
                        className="w-full h-12 text-base"
                        disabled={!selectedCard.canReserve}
                        onClick={() => handleReserveCard(selectedCard.card)}
                      >
                        <Bookmark className="h-5 w-5 mr-2" />
                        {selectedCard.canReserve ? 'Reserve for later' : 'Reserve pile full (3 max)'}
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    Not your turn
                  </p>
                )}
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setSelectedCard(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
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
                Harvested
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
                    body: 'Harvest up to 3 affinities (1 of each type) · Harvest 2 of the same (needs 4+ in the well) · Reserve a card (hold up to 3, gain 1 Singularity) · Forge a card you can afford',
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
                  Forged Artifacts ({me.purchasedCards?.length ?? 0})
                </h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowForgedOverlay(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-5 overflow-y-auto max-h-[60vh] pb-4">
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {CRYSTALS.filter(c => c !== 'flux').map((c) => {
                    const count = me.bonuses[c as keyof CrystalCounts] ?? 0;
                    if (count === 0) return null;
                    return (
                      <div key={c} className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
                        <MiniGem color={c as GemKey} size={12} />
                        <span className="text-xs font-bold text-white">×{count}</span>
                      </div>
                    );
                  })}
                  {Object.values(me.bonuses).every(v => v === 0) && (
                    <span className="text-xs text-muted-foreground italic">No bonuses yet</span>
                  )}
                </div>
                {(me.purchasedCards?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No cards forged yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(me.purchasedCards ?? []).map((c) => (
                      <ArtifactCardView key={c.id} card={c} tier={c.tier} />
                    ))}
                  </div>
                )}
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
        {state.status === 'finished' && (
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
                    Winner: <span className="font-bold text-primary">{state.players.find(p => p.playerId === state.winnerId)?.playerName}</span>
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

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Button size="lg" className="w-full" onClick={() => setLocation('/')}>Back to Home</Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {import.meta.env.DEV && (
        <DevAnimSandbox
          session={session}
          state={state}
          cardActionBurstKeyRef={cardActionBurstKeyRef}
          reserveBurstKeyRef={reserveBurstKeyRef}
          burstKeyRef={burstKeyRef}
          cardAnimTimersRef={cardAnimTimersRef}
          setCardActionBurst={setCardActionBurst}
          setReserveBurst={setReserveBurst}
          setPurchaseBurst={setPurchaseBurst}
          setFlippingCards={setFlippingCards}
        />
      )}
    </div>
  );
}
