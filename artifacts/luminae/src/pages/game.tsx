import React, { useEffect, useState, useMemo } from 'react';
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
import { Volume2, VolumeX, AlertCircle, Sparkles } from 'lucide-react';
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
  onClick,
  selectable,
  reserved,
  tier,
}: {
  card: ArtifactCard;
  onClick?: () => void;
  selectable?: boolean;
  reserved?: boolean;
  tier?: number;
}) {
  const bonusMeta = GEM_META[card.bonusColor as GemKey];
  const backdrop = TIER_BACKDROPS[tier ?? 1] ?? cardTier1Bg;
  return (
    <motion.div
      whileHover={selectable ? { y: -5, rotateY: 5, rotateX: 5 } : {}}
      onClick={selectable ? onClick : undefined}
      className={`
        relative w-32 h-44 rounded-xl overflow-hidden
        border-2 shadow-xl transition-colors
        ${selectable ? 'cursor-pointer hover:border-primary/50' : 'border-border/60'}
        ${reserved ? 'shadow-[0_0_15px_rgba(255,196,61,0.35)]' : ''}
      `}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        borderColor: reserved ? GEM_META.flux.hex : undefined,
      }}
    >
      <img
        src={backdrop}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/85 pointer-events-none" />

      <div className="relative z-10 h-full p-2.5 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span
            className="text-2xl font-serif font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
          >
            {card.prestigePoints > 0 ? card.prestigePoints : ''}
          </span>
          <div
            className="w-7 h-7 rounded-full shadow-md ring-2 ring-black/60 overflow-hidden"
            title={bonusMeta?.name}
          >
            <img
              src={bonusMeta?.image}
              alt=""
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        </div>
        <div className="space-y-1">
          {CRYSTALS.map((c) => {
            const cost = card.cost[c as keyof CrystalCounts];
            if (cost > 0) {
              return (
                <div
                  key={c}
                  className="flex items-center justify-end gap-1.5 bg-black/40 backdrop-blur-sm rounded px-1 py-0.5 w-fit ml-auto"
                >
                  <span className="text-sm font-bold text-white drop-shadow-md">
                    {cost}
                  </span>
                  <MiniGem color={c} size={14} />
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </motion.div>
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

  const handleCrystalClick = (color: keyof CrystalCounts) => {
    if (!isMyTurn || color === 'flux') return;

    if (actionMode === 'take3') {
      const currentCount = selectedCrystals[color] || 0;
      if (currentCount > 0) {
        const next = { ...selectedCrystals };
        delete next[color];
        setSelectedCrystals(next);
      } else {
        if (Object.keys(selectedCrystals).length < 3 && state.crystalBank[color] > 0) {
          setSelectedCrystals({ ...selectedCrystals, [color]: 1 });
          gameAudio.playCrystalPicked();
        }
      }
    } else if (actionMode === 'take2') {
      if (Object.keys(selectedCrystals).length === 1 && Object.keys(selectedCrystals)[0] !== color) return;
      if (selectedCrystals[color] === 2) {
        setSelectedCrystals({});
      } else if (state.crystalBank[color] >= 4 || selectedCrystals[color] === 1) {
        setSelectedCrystals({ [color]: 2 });
        gameAudio.playCrystalPicked();
      }
    }
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

  const confirmCrystals = () => {
    if (actionMode === 'take3' && Object.keys(selectedCrystals).length > 0) {
      executeAction({ type: 'take_three_crystals', crystals: selectedCrystals });
    } else if (actionMode === 'take2' && Object.values(selectedCrystals)[0] === 2) {
      executeAction({ type: 'take_two_crystals', crystal: Object.keys(selectedCrystals)[0] });
    }
  };

  const handleCardClick = (card: ArtifactCard, reserved = false) => {
    if (!isMyTurn) return;
    if (reserved) {
      executeAction({ type: 'purchase_reserved', cardId: card.id });
    } else {
      executeAction({ type: 'purchase_card', cardId: card.id });
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
          <span className="text-sm text-muted-foreground font-mono">Round {state.roundNumber}</span>
          <Button variant="ghost" size="icon" onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
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
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Object.values(p.crystals).reduce((a,b)=>a+b,0)} gems</span>
                    <span>{p.reservedCards.length} rsv</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
              <div key={row.tier} className="flex gap-4">
                <div 
                  className="w-32 h-44 rounded-xl bg-secondary border-2 border-border flex items-center justify-center cursor-pointer hover:border-primary/50 relative overflow-hidden"
                  onClick={() => isMyTurn && executeAction({ type: 'reserve_card', tier: row.tier })}
                >
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]" />
                  <span className="font-bold text-muted-foreground">T{row.tier}</span>
                  <span className="absolute bottom-2 right-2 text-xs text-muted-foreground font-mono">{row.deck}</span>
                </div>
                {row.cards.map((c, i) => c ? (
                  <ArtifactCardView
                    key={c.id}
                    card={c}
                    tier={row.tier}
                    selectable={isMyTurn && actionMode === 'none'}
                    onClick={() => handleCardClick(c)}
                  />
                ) : (
                  <div key={`empty-${i}`} className="w-32 h-44 rounded-xl border-2 border-dashed border-border/30 opacity-50" />
                ))}
              </div>
            ))}
          </div>

          {/* Bank */}
          <div className="flex justify-center gap-4 p-6 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur">
            {CRYSTALS.map((c) => (
              <div key={c} className="flex flex-col items-center gap-1.5">
                <CrystalIcon
                  color={c}
                  size={52}
                  count={state.crystalBank[c as keyof CrystalCounts]}
                  selectable={
                    isMyTurn &&
                    (actionMode === 'take3' || actionMode === 'take2') &&
                    c !== 'flux'
                  }
                  selected={!!selectedCrystals[c as keyof CrystalCounts]}
                  onClick={() => handleCrystalClick(c as keyof CrystalCounts)}
                />
                <span
                  className="text-[10px] uppercase tracking-wider font-semibold"
                  style={{ color: GEM_META[c].glowHex }}
                >
                  {GEM_META[c].shortName}
                </span>
              </div>
            ))}
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
                    <>
                      <Button variant="secondary" className="w-full justify-start" onClick={() => setActionMode('take3')}>
                        Take 3 Different Resources
                      </Button>
                      <Button variant="secondary" className="w-full justify-start" onClick={() => setActionMode('take2')}>
                        Take 2 Same Resources
                      </Button>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                        <AlertCircle className="h-3 w-3" /> Click an artifact in the market to purchase or reserve
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3 bg-secondary/50 p-3 rounded-lg border border-primary/30">
                      <p className="text-sm">Select resources from the bank...</p>
                      <div className="flex gap-2">
                        <Button className="flex-1 bg-primary text-primary-foreground" onClick={confirmCrystals} disabled={Object.keys(selectedCrystals).length === 0}>
                          Confirm
                        </Button>
                        <Button variant="outline" onClick={() => { setActionMode('none'); setSelectedCrystals({}); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {me?.reservedCards && me.reservedCards.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Reserved</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {me.reservedCards.map((c) => (
                      <div key={c.id} className="scale-75 origin-top-left -mr-8 last:mr-0">
                        <ArtifactCardView
                          card={c}
                          tier={c.tier}
                          reserved
                          selectable={isMyTurn && actionMode === 'none'}
                          onClick={() => handleCardClick(c, true)}
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
