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

const CRYSTALS: Array<keyof CrystalCounts> = ['ruby', 'sapphire', 'emerald', 'onyx', 'pearl', 'flux'];

// --- Helper Components ---

function CrystalIcon({ color, count, onClick, selectable, selected }: { color: string, count?: number, onClick?: () => void, selectable?: boolean, selected?: boolean }) {
  const isFlux = color === 'flux';
  return (
    <motion.div 
      whileHover={selectable ? { scale: 1.1 } : {}}
      whileTap={selectable ? { scale: 0.95 } : {}}
      onClick={selectable ? onClick : undefined}
      className={`
        relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-lg
        ${selectable ? 'cursor-pointer' : ''}
        ${selected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : ''}
        ${isFlux ? 'gem-glow' : ''}
      `}
      style={{
        background: `radial-gradient(circle at 30% 30%, var(--color-gem-${color}) 0%, #000 100%)`,
        border: `1px solid var(--color-gem-${color})`
      }}
    >
      {count !== undefined && count > 0 && <span className="drop-shadow-md">{count}</span>}
      {count === 0 && <span className="opacity-50">0</span>}
    </motion.div>
  );
}

function ArtifactCardView({ card, onClick, selectable, reserved }: { card: ArtifactCard, onClick?: () => void, selectable?: boolean, reserved?: boolean }) {
  return (
    <motion.div
      whileHover={selectable ? { y: -5, rotateY: 5, rotateX: 5 } : {}}
      onClick={selectable ? onClick : undefined}
      className={`
        relative w-32 h-44 rounded-xl p-3 flex flex-col justify-between
        bg-card border-2 shadow-xl transition-colors
        ${selectable ? 'cursor-pointer hover:border-primary/50' : 'border-border'}
        ${reserved ? 'border-gem-flux shadow-[0_0_15px_rgba(255,215,0,0.2)]' : ''}
      `}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      <div className="flex justify-between items-start">
        <span className="text-xl font-serif font-bold text-white drop-shadow-md">
          {card.prestigePoints > 0 ? card.prestigePoints : ''}
        </span>
        <div className="w-6 h-6 rounded-full shadow-md" style={{ background: `var(--color-gem-${card.bonusColor})` }} />
      </div>
      <div className="space-y-1">
        {CRYSTALS.map(c => {
          const cost = card.cost[c as keyof CrystalCounts];
          if (cost > 0) {
            return (
              <div key={c} className="flex items-center justify-end gap-1">
                <span className="text-sm font-bold text-white drop-shadow-md">{cost}</span>
                <div className="w-4 h-4 rounded-full" style={{ background: `var(--color-gem-${c})` }} />
              </div>
            );
          }
          return null;
        })}
      </div>
    </motion.div>
  );
}

function LuminaryCard({ luminary }: { luminary: Luminary }) {
  return (
    <div className="w-24 h-24 rounded-lg bg-secondary/80 border-2 border-gem-flux/30 p-2 flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.1)]">
      <span className="text-2xl font-serif font-bold text-white drop-shadow-md">{luminary.prestigePoints}</span>
      <div className="flex flex-wrap justify-center gap-1">
        {CRYSTALS.map(c => {
          const req = luminary.requirements[c as keyof CrystalCounts];
          if (req > 0) {
            return (
              <div key={c} className="flex items-center gap-0.5 bg-background/50 px-1 rounded">
                <span className="text-xs font-bold">{req}</span>
                <div className="w-3 h-3 rounded-full" style={{ background: `var(--color-gem-${c})` }} />
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
      await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, ...payload }
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
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, var(--color-primary) 0%, transparent 70%)' }} />
      
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
                    {CRYSTALS.map(c => (
                      p.bonuses[c as keyof CrystalCounts] > 0 && 
                      <div key={`b-${c}`} className="w-4 h-4 rounded-sm border border-black/20" style={{ background: `var(--color-gem-${c})` }} title={`${p.bonuses[c as keyof CrystalCounts]} ${c} bonus`} />
                    ))}
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
          <div className="flex justify-center gap-6 p-6 rounded-2xl bg-secondary/30 border border-border/50">
            {CRYSTALS.map(c => (
              <CrystalIcon 
                key={c} 
                color={c} 
                count={state.crystalBank[c as keyof CrystalCounts]} 
                selectable={isMyTurn && (actionMode === 'take3' || actionMode === 'take2') && c !== 'flux'}
                selected={!!selectedCrystals[c as keyof CrystalCounts]}
                onClick={() => handleCrystalClick(c as keyof CrystalCounts)}
              />
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
                  {CRYSTALS.map(c => (
                    <div key={c} className="flex flex-col items-center gap-1 bg-secondary/50 p-2 rounded-lg">
                      <CrystalIcon color={c} count={me?.crystals[c as keyof CrystalCounts]} />
                      {me?.bonuses[c as keyof CrystalCounts] ? (
                        <div className="text-xs font-bold text-primary">+{me.bonuses[c as keyof CrystalCounts]}</div>
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
                        Take 3 Different Gems
                      </Button>
                      <Button variant="secondary" className="w-full justify-start" onClick={() => setActionMode('take2')}>
                        Take 2 Same Gems
                      </Button>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                        <AlertCircle className="h-3 w-3" /> Click market card to purchase or reserve
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3 bg-secondary/50 p-3 rounded-lg border border-primary/30">
                      <p className="text-sm">Select gems from the bank...</p>
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
                    {me.reservedCards.map(c => (
                      <div key={c.id} className="scale-75 origin-top-left -mr-8 last:mr-0">
                        <ArtifactCardView card={c} reserved selectable={isMyTurn && actionMode === 'none'} onClick={() => handleCardClick(c, true)} />
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
                <div className="text-2xl font-bold text-gem-flux">Victory is yours!</div>
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
