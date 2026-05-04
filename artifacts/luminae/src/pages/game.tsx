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
  ChevronDown, ChevronUp, Flag, X
} from 'lucide-react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';
import luminaryStargazer from '@assets/generated_images/luminary_stargazer.png';
import luminaryForgemaster from '@assets/generated_images/luminary_forgemaster.png';
import luminaryArchivist from '@assets/generated_images/luminary_archivist.png';
import luminaryCultivator from '@assets/generated_images/luminary_cultivator.png';
import luminaryVoidcaller from '@assets/generated_images/luminary_voidcaller.png';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import cardBackLogo from '@assets/generated_images/luminae_card_back_logo.png';

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
  return (
    <motion.div
      whileTap={selectable ? { scale: 0.92 } : {}}
      onClick={selectable ? onClick : undefined}
      title={meta.name}
      className={`relative rounded-full flex items-center justify-center font-bold text-white ${selectable ? 'cursor-pointer' : ''} ${selected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : ''}`}
      style={{
        width: size, height: size,
        boxShadow: `0 0 ${size * 0.3}px ${meta.glowHex}55, inset 0 0 4px rgba(0,0,0,0.5)`,
      }}
    >
      <img
        src={meta.image} alt={meta.name}
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
            {card.prestigePoints > 0 ? card.prestigePoints : ''}
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
        {luminary.prestigePoints}
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

  const toggleMute = () => setMuted(gameAudio.toggleMute());

  useEffect(() => {
    if (!session || session.roomId !== roomId) setLocation('/');
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
    return <div className="h-[100dvh] flex items-center justify-center text-destructive">Error loading game.</div>;
  }

  if (!state || !session) {
    return <div className="h-[100dvh] flex items-center justify-center text-muted-foreground animate-pulse">Loading board...</div>;
  }

  const isMyTurn = state.status === 'playing' && state.players[state.currentPlayerIndex].playerId === session.playerId;
  const me = state.players.find(p => p.playerId === session.playerId);
  const currentPlayerName = state.players[state.currentPlayerIndex]?.playerName ?? '';

  const handleCrystalClick = (color: keyof CrystalCounts) => {
    if (!isMyTurn || color === 'flux' || !state) return;
    const inBank = state.crystalBank[color] ?? 0;

    if (actionMode === 'take2') {
      if (selectedCrystals[color] === 2) { setSelectedCrystals({}); setActionMode('none'); }
      else if (inBank >= 4) { setSelectedCrystals({ [color]: 2 }); gameAudio.playCrystalPicked(); }
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
    gameAudio.playCrystalPicked();
  };

  const promoteToTake2 = (color: GemKey) => {
    if (!state || (state.crystalBank[color] ?? 0) < 4) return;
    setSelectedCrystals({ [color]: 2 });
    setActionMode('take2');
    gameAudio.playCrystalPicked();
  };

  const executeAction = async (payload: any) => {
    try {
      const normalized = { ...payload };
      if (normalized.crystals) {
        normalized.crystals = { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0, ...normalized.crystals };
      }
      await submitAction.mutateAsync({ roomId: roomId!, data: { sessionToken: session.sessionToken, ...normalized } });
      setActionMode('none');
      setSelectedCrystals({});
      setSelectedCard(null);
      if (payload.type === 'purchase_card' || payload.type === 'purchase_reserved') {
        gameAudio.playCardPurchased();
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
      if ((state.crystalBank[c] ?? 0) >= 4) return { ok: true, reason: `Take 2 ${GEM_META[c as GemKey].name}`, actionType: 'take2' };
      return { ok: false, reason: `Need 4+ in bank to take 2`, actionType: null };
    }
    if (distinct.every(c => (selectedCrystals[c as keyof CrystalCounts] ?? 0) === 1) && distinct.length <= 3) {
      return { ok: true, reason: distinct.length === 3 ? 'Take 3 different' : `Take ${distinct.length}`, actionType: 'take3' };
    }
    return { ok: false, reason: 'Invalid combination', actionType: null };
  })();

  const confirmCrystals = () => {
    if (!queueLegality.ok) return;
    if (queueLegality.actionType === 'take3') executeAction({ type: 'take_three_crystals', crystals: selectedCrystals });
    else if (queueLegality.actionType === 'take2') executeAction({ type: 'take_two_crystals', crystal: Object.keys(selectedCrystals)[0] });
  };

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
    executeAction({ type: fromReserve ? 'purchase_reserved' : 'purchase_card', cardId: card.id });
  };
  const handleReserveCard = (card: ArtifactCard) => {
    if (!isMyTurn) return;
    executeAction({ type: 'reserve_card', cardId: card.id });
  };
  const handleReserveDeck = (tier: number) => {
    if (!isMyTurn) return;
    executeAction({ type: 'reserve_card', tier });
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

  const BoardTab = () => (
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
          { tier: 3, cards: state.marketTier3, deck: state.deckCounts.tier3 },
          { tier: 2, cards: state.marketTier2, deck: state.deckCounts.tier2 },
          { tier: 1, cards: state.marketTier1, deck: state.deckCounts.tier1 },
        ].map(row => (
          <div key={row.tier}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tier {row.tier}</span>
              <div className="flex-1 h-px bg-border/40" />
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
              {row.cards.map((c, i) => c ? (
                <ArtifactCardView
                  key={c.id}
                  card={c}
                  tier={row.tier}
                  onTap={() => openCardSheet(c, false)}
                  tapped={selectedCard?.card.id === c.id}
                  effectiveCosts={showEffectiveCost && me ? effectiveCost(c, me) as Partial<Record<GemKey, number>> : undefined}
                />
              ) : (
                <div key={`empty-${i}`} className="w-28 h-40 rounded-xl border-2 border-dashed border-border/30 opacity-40 shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Crystal Bank */}
      <div className="rounded-2xl bg-secondary/40 border border-border/50 p-4 backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 text-center">Gem Bank</p>
        <div className="flex justify-between gap-1">
          {CRYSTALS.map((c) => {
            const count = state.crystalBank[c as keyof CrystalCounts] ?? 0;
            const queued = selectedCrystals[c as keyof CrystalCounts] ?? 0;
            const selectable = isMyTurn && c !== 'flux';
            return (
              <div key={c} className="flex flex-col items-center gap-1.5">
                <CrystalIcon
                  color={c} size={50}
                  selectable={selectable}
                  selected={queued > 0}
                  onClick={() => handleCrystalClick(c as keyof CrystalCounts)}
                />
                <div
                  className="min-w-[40px] px-1.5 py-0.5 rounded-full bg-black/90 border border-white/20 text-center shadow-lg"
                  style={{ boxShadow: `0 0 8px ${GEM_META[c].glowHex}33` }}
                >
                  <span className="text-base font-black font-mono text-white">{count}</span>
                  {queued > 0 && <span className="ml-0.5 text-[10px] font-bold text-primary">+{queued}</span>}
                </div>
                {selectable && count >= 4 && queued !== 2 && (
                  <button
                    type="button"
                    onClick={() => promoteToTake2(c)}
                    className="text-[9px] font-bold text-primary/70 hover:text-primary"
                  >
                    ×2
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {isMyTurn && !crystalQueueActive && (
          <p className="text-[10px] text-muted-foreground text-center mt-3 italic">
            Tap gems to queue · tap ×2 to take a pair
          </p>
        )}
      </div>
    </div>
  );

  const HandTab = () => (
    <div className="flex flex-col gap-5 p-4 pb-6">
      {/* Prestige + name */}
      <div className={`rounded-2xl border p-4 bg-card/80 backdrop-blur flex items-center justify-between ${isMyTurn ? 'border-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.2)]' : 'border-border'}`}>
        <div>
          <div className="text-lg font-bold">{me?.playerName}</div>
          <div className="text-xs text-muted-foreground">
            {Object.values(me?.crystals ?? {}).reduce((a, b) => a + b, 0)} gems in hand
          </div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-serif font-bold text-primary">{me?.prestige}</div>
          <div className="text-xs text-primary flex items-center gap-0.5 justify-center">
            <Sparkles className="h-3 w-3" /> prestige
          </div>
        </div>
      </div>

      {/* My Gems */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">My Gems</p>
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
            return (
              <div
                key={p.playerId}
                className={`rounded-2xl border p-4 bg-card/70 backdrop-blur transition-all ${isCurrent ? 'border-primary/60 shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border/50 opacity-80'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {isCurrent && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    <span className="font-bold truncate text-sm">{p.playerName}</span>
                  </div>
                  <div className="flex items-center gap-1 font-serif font-bold text-primary">
                    <span className="text-xl">{p.prestige}</span>
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap mb-2">
                  {CRYSTALS.map((c) =>
                    p.bonuses[c as keyof CrystalCounts] > 0 ? (
                      <div key={`b-${c}`} className="flex items-center gap-0.5 bg-black/40 rounded px-1.5 py-0.5">
                        <MiniGem color={c} size={11} />
                        <span className="text-[10px] font-bold text-white">{p.bonuses[c as keyof CrystalCounts]}</span>
                      </div>
                    ) : null
                  )}
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{Object.values(p.crystals).reduce((a, b) => a + b, 0)} gems</span>
                  <div className="flex gap-1 items-center">
                    {p.reservedCards.map((card, idx) => (
                      <CardBack key={idx} size="sm" tier={card.tier as 1 | 2 | 3} />
                    ))}
                    {p.reservedCards.length === 0 && <span>No reserved</span>}
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
            [...(state.actionLog ?? [])].reverse().slice(0, 12).map((entry, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-primary">{entry.playerName}</span>
                  <span className="text-foreground/70"> · {entry.summary}</span>
                </div>
              </div>
            ))
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
        <h1 className="text-base font-serif font-bold text-primary tracking-wide">Luminae</h1>

        <div className="flex items-center gap-2">
          {/* Turn pill */}
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${isMyTurn ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            {isMyTurn && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />}
            <span className="truncate max-w-[90px]">{isMyTurn ? 'Your turn' : currentPlayerName}</span>
          </div>
          <TurnCountdown deadline={state.turnDeadline ?? null} active={isMyTurn} />
          <span className="text-xs text-muted-foreground font-mono">R{state.roundNumber}</span>
        </div>

        <div className="flex items-center gap-1">
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

      {/* ── Crystal Confirm Bar (floats above nav) ── */}
      <AnimatePresence>
        {crystalQueueActive && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="shrink-0 z-20 bg-card/95 border-t border-primary/40 backdrop-blur px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-2 flex-1 flex-wrap">
                {Object.entries(selectedCrystals).map(([c, n]) => (
                  <div key={c} className="flex items-center gap-1 bg-black/50 rounded-full px-2.5 py-1">
                    <MiniGem color={c as GemKey} size={14} />
                    <span className="text-sm font-bold text-white">×{n}</span>
                  </div>
                ))}
                <span className={`text-xs self-center ${queueLegality.ok ? 'text-green-400' : 'text-amber-400'}`}>
                  {queueLegality.reason || 'Pick gems'}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => { setActionMode('none'); setSelectedCrystals({}); }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-9 px-4"
                  onClick={confirmCrystals}
                  disabled={!queueLegality.ok}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Navigation ── */}
      <nav className="shrink-0 h-16 grid grid-cols-3 border-t border-border bg-card/90 backdrop-blur z-20">
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
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl p-5 pb-safe"
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
                    <span className="text-xs font-semibold capitalize">{selectedCard.card.bonusColor}</span>
                  </div>
                  {(selectedCard.card.prestigePoints ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">{selectedCard.card.prestigePoints} prestige</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                {isMyTurn ? (
                  <>
                    <Button
                      className="w-full h-13 text-base font-bold"
                      disabled={!selectedCard.canBuy}
                      onClick={() => handleBuy(selectedCard.card, selectedCard.fromReserve)}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {selectedCard.canBuy ? 'Forge Artifact' : 'Cannot afford yet'}
                    </Button>
                    {!selectedCard.fromReserve && (
                      <Button
                        variant="secondary"
                        className="w-full h-13 text-base"
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

      {/* ── Win Overlay ── */}
      <AnimatePresence>
        {state.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm text-center space-y-6 p-8 rounded-3xl border border-primary/30 bg-card shadow-[0_0_80px_rgba(var(--primary),0.2)]"
            >
              <h2 className="text-5xl font-serif font-bold text-primary gem-glow">Game Over</h2>
              {state.winnerId === session.playerId ? (
                <div className="text-2xl font-bold" style={{ color: GEM_META.flux.hex }}>Victory is yours!</div>
              ) : (
                <div className="text-xl text-foreground">
                  Winner: <span className="font-bold text-primary">{state.players.find(p => p.playerId === state.winnerId)?.playerName}</span>
                </div>
              )}
              {/* Final scores */}
              <div className="flex flex-col gap-2">
                {[...state.players].sort((a, b) => b.prestige - a.prestige).map(p => (
                  <div key={p.playerId} className={`flex justify-between items-center px-3 py-2 rounded-xl ${p.playerId === state.winnerId ? 'bg-primary/20 border border-primary/40' : 'bg-secondary/50'}`}>
                    <span className="font-medium text-sm">{p.playerName}</span>
                    <span className="font-bold text-primary flex items-center gap-1">{p.prestige} <Sparkles className="h-3.5 w-3.5" /></span>
                  </div>
                ))}
              </div>
              <Button size="lg" className="w-full" onClick={() => setLocation('/')}>Back to Home</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
