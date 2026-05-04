import React, { useEffect, useState } from 'react';
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
  ActionRequestCrystal
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/lib/session';
import { useGameWebsocket } from '@/hooks/use-game-websocket';
import { useToast } from '@/hooks/use-toast';
import { gameAudio } from '@/lib/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2, VolumeX, AlertCircle, Sparkles, Clock, ScrollText, Bookmark, ShoppingCart } from 'lucide-react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier2Bg from '@assets/generated_images/card_tier2.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';
import luminaryStargazer from '@assets/generated_images/luminary_stargazer.png';
import luminaryForgemaster from '@assets/generated_images/luminary_forgemaster.png';
import luminaryArchivist from '@assets/generated_images/luminary_archivist.png';
import luminaryCultivator from '@assets/generated_images/luminary_cultivator.png';
import luminaryVoidcaller from '@assets/generated_images/luminary_voidcaller.png';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import cardBackLogo from '@assets/generated_images/luminae_card_back_logo.png';

// Vite glob: bundle every per-card art image and key by id (filename w/o ext).
const CARD_ART_MODULES = import.meta.glob(
  '@assets/generated_images/cards/*.png',
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
  2: cardTier2Bg,
  3: cardTier3Bg,
};

const LUMINARY_PORTRAITS = [
  luminaryStargazer,
  luminaryForgemaster,
  luminaryArchivist,
  luminaryCultivator,
  luminaryVoidcaller,
];

// Pick a deterministic luminary portrait based on the dominant required gem
function pickLuminaryPortrait(luminary: Luminary): string {
  const dominant = (Object.entries(luminary.requirements) as [GemKey, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const idx: Record<GemKey, number> = {
    pearl: 0, ruby: 1, sapphire: 2, emerald: 3, onyx: 4, flux: 0,
  };
  return LUMINARY_PORTRAITS[idx[dominant ?? "pearl"] % LUMINARY_PORTRAITS.length];
}

// --- Helper Components ---

function CrystalIcon({
  color,
  count,
  onClick,
  selectable,
  selected,
  size = 40,
}: {
  color: GemKey;
  count?: number;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  size?: number;
}) {
  const meta = GEM_META[color];
  return (
    <motion.div
      whileHover={selectable ? { scale: 1.1 } : {}}
      whileTap={selectable ? { scale: 0.95 } : {}}
      onClick={selectable ? onClick : undefined}
      title={meta.name}
      className={`
        relative rounded-full flex items-center justify-center font-bold text-white
        ${selectable ? 'cursor-pointer' : ''}
        ${selected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : ''}
      `}
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 ${size * 0.3}px ${meta.glowHex}55, inset 0 0 4px rgba(0,0,0,0.5)`,
      }}
    >
      <img
        src={meta.image}
        alt={meta.name}
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
    </motion.div>
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
      className="rounded-full pointer-events-none select-none"
      style={{
        filter: `drop-shadow(0 0 3px ${meta.glowHex}88)`,
      }}
      draggable={false}
    />
  );
}

function ArtifactCardView({
  card,
  onBuy,
  onReserve,
  canBuy,
  canReserve,
  reserved,
  tier,
}: {
  card: ArtifactCard;
  onBuy?: () => void;
  onReserve?: () => void;
  canBuy?: boolean;
  canReserve?: boolean;
  reserved?: boolean;
  tier?: number;
}) {
  const bonusMeta = GEM_META[card.bonusColor as GemKey];
  const backdrop = TIER_BACKDROPS[tier ?? card.tier ?? 1] ?? cardTier1Bg;
  const art = CARD_ART[card.id];
  const showActions = !!(onBuy || onReserve);

  return (
    <motion.div
      whileHover={showActions ? { y: -3 } : {}}
      className={`
        group relative w-32 h-44 rounded-xl overflow-hidden border-2 shadow-xl
        ${reserved ? 'shadow-[0_0_15px_rgba(255,196,61,0.35)]' : 'border-black/20'}
      `}
      style={{
        transformStyle: 'preserve-3d',
        borderColor: reserved ? GEM_META.flux.hex : undefined,
      }}
      title={card.flavor || card.name}
    >
      {/* Tier backdrop */}
      <img src={backdrop} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" draggable={false} />
      {/* Card art (full background, dimmed behind info) */}
      {art && (
        <img
          src={art}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          style={{ objectFit: 'cover' }}
          draggable={false}
        />
      )}
      {/* Dark overlay so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/90 pointer-events-none" />

      <div className="relative z-10 h-full p-2 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-xl font-serif font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            {card.prestigePoints > 0 ? card.prestigePoints : ''}
          </span>
          <div className="w-6 h-6 rounded-full shadow-md ring-2 ring-black/60 overflow-hidden" title={bonusMeta?.name}>
            <img src={bonusMeta?.image} alt="" className="w-full h-full object-contain" draggable={false} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] line-clamp-2">
            {card.name}
          </div>
          <div className="flex flex-wrap gap-0.5 justify-end">
            {CRYSTALS.map((c) => {
              const cost = card.cost[c as keyof CrystalCounts];
              if (cost > 0) {
                return (
                  <div key={c} className="flex items-center gap-0.5 bg-black/55 backdrop-blur-sm rounded px-1 py-0.5">
                    <span className="text-xs font-bold text-white">{cost}</span>
                    <MiniGem color={c} size={11} />
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* Action overlay (Buy / Reserve) */}
      {showActions && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex gap-1 p-1.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {onBuy && (
            <button
              type="button"
              disabled={!canBuy}
              onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
              className="flex-1 text-[10px] font-bold uppercase tracking-wide rounded-md py-1.5 bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              title={canBuy ? 'Forge this artifact' : 'Cannot afford yet'}
            >
              <ShoppingCart className="h-3 w-3" />
              Buy
            </button>
          )}
          {onReserve && (
            <button
              type="button"
              disabled={!canReserve}
              onClick={(e) => { e.stopPropagation(); onReserve?.(); }}
              className="flex-1 text-[10px] font-bold uppercase tracking-wide rounded-md py-1.5 bg-secondary text-secondary-foreground hover:brightness-125 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              title={canReserve ? 'Reserve for later' : 'Reserve pile is full (3 max)'}
            >
              <Bookmark className="h-3 w-3" />
              Hold
            </button>
          )}
        </div>
      )}
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
    <div
      className={`flex items-center gap-1.5 font-mono tabular-nums text-sm ${color} ${urgent && active ? 'animate-pulse' : ''}`}
      title="Turn time remaining"
    >
      <Clock className="h-4 w-4" />
      <span>{seconds}s</span>
    </div>
  );
}

function CardBack({ size = 'md', count, tier }: { size?: 'sm' | 'md'; count?: number; tier?: 1 | 2 | 3 }) {
  const sz = size === 'sm' ? 'w-10 h-14' : 'w-32 h-44';
  const tintMap: Record<1 | 2 | 3, string> = {
    1: 'brightness-105 saturate-125 hue-rotate-0',
    2: 'brightness-105 saturate-125 hue-rotate-90',
    3: 'brightness-105 saturate-125 hue-rotate-180',
  };
  const tint = tier ? tintMap[tier] : 'brightness-105 saturate-125';
  return (
    <div className={`${sz} relative rounded-xl overflow-hidden border-2 border-border/60 shadow-md bg-secondary`}>
      <img
        src={cardBackLogo}
        alt="Card back"
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
      className="relative w-28 h-28 rounded-xl overflow-hidden border-2 p-2 flex flex-col items-center justify-end gap-1 shadow-[0_0_18px_rgba(255,196,61,0.18)]"
      style={{ borderColor: `${GEM_META.flux.hex}55` }}
    >
      <img
        src={portrait}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 pointer-events-none" />
      <span
        className="absolute top-1 right-2 text-2xl font-serif font-bold drop-shadow-[0_2px_3px_rgba(0,0,0,1)]"
        style={{ color: GEM_META.flux.hex }}
      >
        {luminary.prestigePoints}
      </span>
      <div className="relative z-10 flex flex-wrap justify-center gap-0.5 max-w-full">
        {CRYSTALS.map((c) => {
          const req = luminary.requirements[c as keyof CrystalCounts];
          if (req > 0) {
            return (
              <div
                key={c}
                className="flex items-center gap-0.5 bg-black/70 px-1 py-0.5 rounded"
              >
                <span className="text-[11px] font-bold text-white">{req}</span>
                <MiniGem color={c} size={10} />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
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

  const toggleMute = () => setMuted(gameAudio.toggleMute());

  useEffect(() => {
    if (!session || session.roomId !== roomId) {
      setLocation('/');
    }
  }, [session, roomId, setLocation]);

  const { data: state, error } = useGetGameState(
    roomId!, 
    { sessionToken: session?.sessionToken || '' },
    { query: { enabled: !!roomId && !!session, queryKey: getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }) } }
  );

  useGameWebsocket({
    roomId: roomId!,
    sessionToken: session?.sessionToken || '',
    onStateUpdate: (newState) => {
      queryClient.setQueryData(getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }), newState);
      if (newState.lastAction && newState.currentPlayerIndex !== state?.currentPlayerIndex) {
        if (newState.players[newState.currentPlayerIndex].playerId === session?.playerId) {
          gameAudio.playTurnStart();
        }
      }
      if (newState.status === 'finished' && state?.status !== 'finished') {
        gameAudio.playWin();
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

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-destructive">Error loading game.</div>;
  }

  if (!state || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">Loading board...</div>;
  }

  const isMyTurn = state.status === 'playing' && state.players[state.currentPlayerIndex].playerId === session.playerId;
  const me = state.players.find(p => p.playerId === session.playerId);

  // Tap-to-queue: clicking a bank gem auto-enters a queueing mode and toggles
  // selection. Mode auto-flips to take2 if the same gem is tapped twice and the
  // bank had ≥4 of that color.
  const handleCrystalClick = (color: keyof CrystalCounts) => {
    if (!isMyTurn || color === 'flux' || !state) return;
    const inBank = state.crystalBank[color] ?? 0;

    // Take-2 mode: only one color allowed at count 2.
    if (actionMode === 'take2') {
      if (selectedCrystals[color] === 2) {
        setSelectedCrystals({});
        setActionMode('none');
      } else if (inBank >= 4) {
        setSelectedCrystals({ [color]: 2 });
        gameAudio.playCrystalPicked();
      }
      return;
    }

    // Take-3 / queueing mode (also entered from 'none' on first tap).
    const current = selectedCrystals[color] ?? 0;
    if (current > 0) {
      // Toggle off
      const next = { ...selectedCrystals };
      delete next[color];
      const empty = Object.keys(next).length === 0;
      setSelectedCrystals(next);
      if (empty) setActionMode('none');
      return;
    }

    // Trying to add this color
    const distinctCount = Object.keys(selectedCrystals).length;

    // Special case: tap same color twice in a row (count=1, only color) → take2
    if (distinctCount === 1 && (selectedCrystals[color] ?? 0) === 0 && inBank >= 4) {
      // not the path because we already returned if current>0; ignore
    }

    if (inBank <= 0) return;
    if (distinctCount >= 3) return;
    setSelectedCrystals({ ...selectedCrystals, [color]: 1 });
    setActionMode(actionMode === 'none' ? 'take3' : actionMode);
    gameAudio.playCrystalPicked();
  };

  // Promote queueing → take2 by clicking same color twice (UX shortcut)
  const promoteToTake2 = (color: GemKey) => {
    if (!state) return;
    if ((state.crystalBank[color] ?? 0) < 4) return;
    setSelectedCrystals({ [color]: 2 });
    setActionMode('take2');
    gameAudio.playCrystalPicked();
  };

  const executeAction = async (payload: any) => {
    try {
      // Normalize crystals to always include all 6 keys (API requires complete shape)
      const normalized = { ...payload };
      if (normalized.crystals) {
        normalized.crystals = {
          ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0,
          ...normalized.crystals,
        };
      }
      await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, ...normalized }
      });
      setActionMode('none');
      setSelectedCrystals({});
      if (payload.type === 'purchase_card' || payload.type === 'purchase_reserved') {
        gameAudio.playCardPurchased();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message });
    }
  };

  // Determine whether the queued tokens form a legal action.
  // NOTE: not a hook — the early `return` for !state above means hook order
  // would be inconsistent across renders if we used useMemo here.
  const queueLegality: { ok: boolean; reason: string; actionType: null | 'take3' | 'take2' } = (() => {
    if (!me) return { ok: false, reason: '', actionType: null };
    const total = Object.values(selectedCrystals).reduce((a, b) => a + (b ?? 0), 0);
    if (total === 0) return { ok: false, reason: '', actionType: null };
    const distinct = Object.keys(selectedCrystals);
    const handTotal = Object.values(me.crystals).reduce((a, b) => a + b, 0);
    if (handTotal + total > 10) {
      return { ok: false, reason: `Hand limit is 10 (you'd have ${handTotal + total})`, actionType: null };
    }
    if (distinct.length === 1 && (selectedCrystals[distinct[0] as keyof CrystalCounts] ?? 0) === 2) {
      const c = distinct[0] as keyof CrystalCounts;
      if ((state.crystalBank[c] ?? 0) >= 4) {
        return { ok: true, reason: `Take 2 ${GEM_META[c as GemKey].name}`, actionType: 'take2' };
      }
      return { ok: false, reason: `Need 4+ in bank to take 2 of one color`, actionType: null };
    }
    if (distinct.every(c => (selectedCrystals[c as keyof CrystalCounts] ?? 0) === 1) && distinct.length <= 3) {
      return { ok: true, reason: distinct.length === 3 ? 'Take 3 different' : `Take ${distinct.length}`, actionType: 'take3' };
    }
    return { ok: false, reason: 'Invalid combination', actionType: null };
  })();

  const confirmCrystals = () => {
    if (!queueLegality.ok) return;
    if (queueLegality.actionType === 'take3') {
      executeAction({ type: 'take_three_crystals', crystals: selectedCrystals });
    } else if (queueLegality.actionType === 'take2') {
      const color = Object.keys(selectedCrystals)[0];
      executeAction({ type: 'take_two_crystals', crystal: color });
    }
  };

  // Affordability + reservation checks
  const effectiveCost = (card: ArtifactCard, p: GamePlayerState) => {
    const out: Record<string, number> = {};
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
      const ck = c as keyof CrystalCounts;
      out[c] = Math.max(0, (card.cost[ck] ?? 0) - (p.bonuses[ck] ?? 0));
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
    executeAction({
      type: fromReserve ? 'purchase_reserved' : 'purchase_card',
      cardId: card.id,
    });
  };
  const handleReserveCard = (card: ArtifactCard) => {
    if (!isMyTurn) return;
    executeAction({ type: 'reserve_card', cardId: card.id });
  };
  const handleReserveDeck = (tier: number) => {
    if (!isMyTurn) return;
    executeAction({ type: 'reserve_card', tier });
  };

  const handleSurrender = () => {
    if (
      confirm(
        "Are you sure you want to surrender? You will lose the game and cannot undo this."
      )
    ) {
      executeAction({ type: 'surrender' });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `url(${backgroundCosmos})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-background/80 pointer-events-none" />
      
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-card/50 backdrop-blur border-b border-border z-10">
        <h1 className="text-2xl font-serif font-bold text-primary gem-glow">Luminae</h1>
        <div className="flex items-center gap-4">
          <TurnCountdown deadline={state.turnDeadline ?? null} active={isMyTurn} />
          <span className="text-sm text-muted-foreground font-mono">Round {state.roundNumber}</span>
          <Button variant="ghost" size="icon" onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSurrender}
            className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
          >
            Surrender
          </Button>
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-8 z-10 overflow-auto">
        
        {/* Left Col: Opponents */}
        <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 lg:w-64 shrink-0">
          {state.players.map((p, i) => {
            if (p.playerId === session?.playerId) return null;
            const isCurrent = state.status === 'playing' && state.currentPlayerIndex === i;
            return (
              <Card key={p.playerId} className={`min-w-[200px] border-border bg-card/80 backdrop-blur transition-all ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(var(--primary),0.3)]' : 'opacity-80'}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold truncate" title={p.playerName}>{p.playerName}</span>
                    <span className="font-serif text-xl text-primary font-bold">{p.prestige} <Sparkles className="inline h-4 w-4" /></span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {CRYSTALS.map((c) =>
                      p.bonuses[c as keyof CrystalCounts] > 0 ? (
                        <div
                          key={`b-${c}`}
                          className="flex items-center gap-0.5 bg-black/40 rounded px-1 py-0.5"
                          title={`${p.bonuses[c as keyof CrystalCounts]} ${GEM_META[c].name} bonus`}
                        >
                          <MiniGem color={c} size={12} />
                          <span className="text-[10px] font-bold text-white">
                            {p.bonuses[c as keyof CrystalCounts]}
                          </span>
                        </div>
                      ) : null,
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{Object.values(p.crystals).reduce((a,b)=>a+b,0)} gems</span>
                    <span>{p.reservedCards.length} reserved</span>
                  </div>
                  {p.reservedCards.length > 0 && (
                    <div className="flex gap-1 pt-1">
                      {p.reservedCards.map((card, idx) => (
                        <CardBack key={idx} size="sm" tier={card.tier as 1 | 2 | 3} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Action Log */}
          <Card className="border-border bg-card/80 backdrop-blur">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <ScrollText className="h-3.5 w-3.5" /> Recent Actions
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                {(state.actionLog ?? []).length === 0 ? (
                  <p className="text-muted-foreground italic">No actions yet.</p>
                ) : (
                  [...(state.actionLog ?? [])].reverse().slice(0, 12).map((entry, i) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-2">
                      <span className="font-semibold text-primary">{entry.playerName}</span>
                      <span className="text-foreground/80"> · {entry.summary}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Col: Market & Bank */}
        <div className="flex-1 flex flex-col gap-8 min-w-[600px]">
          
          {/* Luminaries */}
          <div className="flex justify-center gap-4">
            {state.luminaries.map(l => (
              <LuminaryCard key={l.id} luminary={l} />
            ))}
          </div>

          {/* Market */}
          <div className="flex flex-col gap-4 items-center">
            {[
              { tier: 3, cards: state.marketTier3, deck: state.deckCounts.tier3 },
              { tier: 2, cards: state.marketTier2, deck: state.deckCounts.tier2 },
              { tier: 1, cards: state.marketTier1, deck: state.deckCounts.tier1 },
            ].map(row => (
              <div key={row.tier} className="flex gap-4 items-start">
                {/* Deck pile (face-down) — click to reserve from deck */}
                <button
                  type="button"
                  onClick={() => row.deck > 0 && me && canReserveMore(me) && handleReserveDeck(row.tier)}
                  disabled={!isMyTurn || row.deck === 0 || !me || !canReserveMore(me)}
                  title={
                    row.deck === 0
                      ? 'Deck empty'
                      : !isMyTurn
                      ? 'Not your turn'
                      : !me || !canReserveMore(me)
                      ? 'Reserve pile full (3 max)'
                      : `Reserve a hidden Tier ${row.tier} card`
                  }
                  className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CardBack count={row.deck} tier={row.tier as 1 | 2 | 3} />
                  <span className="absolute top-1 left-1.5 text-[10px] font-bold text-white bg-black/70 rounded px-1.5 py-0.5">
                    T{row.tier}
                  </span>
                  {isMyTurn && row.deck > 0 && me && canReserveMore(me) && (
                    <span className="absolute inset-x-0 bottom-1 mx-1.5 text-[10px] font-bold uppercase tracking-wide bg-primary/90 text-primary-foreground rounded py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Hold
                    </span>
                  )}
                </button>
                {row.cards.map((c, i) => c ? (
                  <ArtifactCardView
                    key={c.id}
                    card={c}
                    tier={row.tier}
                    onBuy={() => handleBuy(c)}
                    onReserve={() => handleReserveCard(c)}
                    canBuy={isMyTurn && !!me && canAffordCard(c, me)}
                    canReserve={isMyTurn && !!me && canReserveMore(me)}
                  />
                ) : (
                  <div key={`empty-${i}`} className="w-32 h-44 rounded-xl border-2 border-dashed border-border/30 opacity-50" />
                ))}
              </div>
            ))}
          </div>

          {/* Bank */}
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur">
            <div className="flex items-center gap-4">
              {CRYSTALS.map((c) => {
                const count = state.crystalBank[c as keyof CrystalCounts] ?? 0;
                const queued = selectedCrystals[c as keyof CrystalCounts] ?? 0;
                const selectable = isMyTurn && c !== 'flux';
                return (
                  <div key={c} className="flex flex-col items-center gap-1.5">
                    <CrystalIcon
                      color={c}
                      size={56}
                      selectable={selectable}
                      selected={queued > 0}
                      onClick={() => handleCrystalClick(c as keyof CrystalCounts)}
                    />
                    {/* Big readable count pill */}
                    <div
                      className="min-w-[44px] px-2 py-0.5 rounded-full bg-black/70 border text-center"
                      style={{ borderColor: `${GEM_META[c].glowHex}55` }}
                    >
                      <span className="text-base font-bold font-mono text-white">{count}</span>
                      {queued > 0 && (
                        <span className="ml-1 text-xs font-semibold text-primary">+{queued}</span>
                      )}
                    </div>
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: GEM_META[c].glowHex }}
                    >
                      {GEM_META[c].shortName}
                    </span>
                    {/* Take-2 shortcut button (only when this color has ≥4 in bank and queue empty/single) */}
                    {selectable && count >= 4 && queued !== 2 && (
                      <button
                        type="button"
                        onClick={() => promoteToTake2(c)}
                        className="text-[9px] uppercase tracking-wide text-muted-foreground hover:text-primary"
                        title="Take 2 of this color"
                      >
                        ×2
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {isMyTurn && (
              <p className="text-xs text-muted-foreground italic">
                Tap a gem to queue it · same color twice or "×2" for double
              </p>
            )}
          </div>

        </div>

        {/* Right Col: Active Player (Me) */}
        <div className="lg:w-80 shrink-0 flex flex-col gap-4">
          <Card className={`border-border bg-card shadow-2xl ${isMyTurn ? 'ring-2 ring-primary shadow-[0_0_30px_rgba(var(--primary),0.2)]' : ''}`}>
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-bold">{me?.playerName}</h2>
                  <p className="text-sm text-muted-foreground">You</p>
                </div>
                <div className="text-center">
                  <span className="text-3xl font-serif text-primary font-bold">{me?.prestige}</span>
                  <span className="text-xs text-primary block"><Sparkles className="inline h-3 w-3" /> Prestige</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Your Gems</h3>
                <div className="grid grid-cols-3 gap-3">
                  {CRYSTALS.map((c) => (
                    <div
                      key={c}
                      className="flex flex-col items-center gap-1 bg-secondary/50 p-2 rounded-lg"
                    >
                      <CrystalIcon
                        color={c}
                        size={42}
                        count={me?.crystals[c as keyof CrystalCounts]}
                      />
                      <div
                        className="text-[10px] uppercase tracking-wider font-semibold"
                        style={{ color: GEM_META[c].glowHex }}
                      >
                        {GEM_META[c].shortName}
                      </div>
                      {me?.bonuses[c as keyof CrystalCounts] ? (
                        <div className="text-xs font-bold text-primary">
                          +{me.bonuses[c as keyof CrystalCounts]}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {isMyTurn && (
                <div className="pt-4 border-t border-border space-y-3">
                  <h3 className="text-sm font-bold text-primary animate-pulse">Your Turn</h3>

                  {actionMode === 'none' ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Tap gems below to queue them, or hover an artifact to Buy / Hold.
                    </p>
                  ) : (
                    <div className="space-y-2 bg-secondary/50 p-3 rounded-lg border border-primary/30">
                      <p className="text-xs text-muted-foreground">Queued tokens:</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.entries(selectedCrystals).map(([c, n]) => (
                          <div key={c} className="flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5">
                            <MiniGem color={c as GemKey} size={14} />
                            <span className="text-xs font-bold text-white">×{n}</span>
                          </div>
                        ))}
                      </div>
                      <p className={`text-xs ${queueLegality.ok ? 'text-green-400' : 'text-amber-400'}`}>
                        {queueLegality.reason || 'Pick gems to begin'}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-primary text-primary-foreground"
                          onClick={confirmCrystals}
                          disabled={!queueLegality.ok}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { setActionMode('none'); setSelectedCrystals({}); }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {me?.reservedCards && me.reservedCards.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Reserved ({me.reservedCards.length}/3)
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {me.reservedCards.map((c) => (
                      <div key={c.id} className="shrink-0">
                        <ArtifactCardView
                          card={c}
                          tier={c.tier}
                          reserved
                          onBuy={() => handleBuy(c, true)}
                          canBuy={isMyTurn && canAffordCard(c, me)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </main>

      {/* Win Overlay */}
      <AnimatePresence>
        {state.status === 'finished' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center space-y-6 max-w-md p-12 rounded-3xl border border-primary/30 bg-card shadow-[0_0_100px_rgba(var(--primary),0.2)]"
            >
              <h2 className="text-6xl font-serif font-bold text-primary gem-glow mb-4">Game Over</h2>
              {state.winnerId === session.playerId ? (
                <div
                  className="text-2xl font-bold"
                  style={{ color: GEM_META.flux.hex }}
                >
                  Victory is yours!
                </div>
              ) : (
                <div className="text-2xl text-foreground">
                  Winner: <span className="font-bold text-primary">{state.players.find(p => p.playerId === state.winnerId)?.playerName}</span>
                </div>
              )}
              <Button size="lg" className="w-full mt-8" onClick={() => setLocation('/')}>Back to Home</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
