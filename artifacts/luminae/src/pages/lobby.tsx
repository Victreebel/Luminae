import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useStartGame, useKickPlayer } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { useGameWebsocket } from "@/hooks/use-game-websocket";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Copy, Users, Crown, X } from "lucide-react";
import { gameAudio } from "@/lib/audio";

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const session = getSession();
  const [players, setPlayers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const startGame = useStartGame();
  const kickPlayer = useKickPlayer();

  useEffect(() => {
    if (!session || session.roomId !== roomId) {
      setLocation("/");
    }
  }, [session, roomId, setLocation]);

  useGameWebsocket({
    roomId: roomId!,
    sessionToken: session?.sessionToken || "",
    onGameStarted: () => {
      gameAudio.playTurnStart();
      setLocation(`/game/${roomId}`);
    },
    onPlayerJoined: (player) => {
      setPlayers(prev => {
        if (!prev.find(p => p.id === player.id)) {
          return [...prev, player];
        }
        return prev.map(p => p.id === player.id ? { ...p, isConnected: true } : p);
      });
    },
    onPlayerLeft: (playerId) => {
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isConnected: false } : p));
    },
    onStateUpdate: (state) => {
      if (state.status === 'lobby') {
        setPlayers(state.players.map((p: any) => ({
          id: p.playerId,
          name: p.playerName,
          isConnected: p.isConnected,
          isHost: p.playerId === state.players[0].playerId
        })));
      } else if (state.status === 'playing') {
        setLocation(`/game/${roomId}`);
      }
    }
  });

  const handleStart = async () => {
    if (!session) return;
    try {
      await startGame.mutateAsync({ roomId: roomId!, data: { sessionToken: session.sessionToken } });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error starting game", description: err.message });
    }
  };

  const handleKick = async (playerId: string) => {
    if (!session) return;
    try {
      await kickPlayer.mutateAsync({ roomId: roomId!, playerId, data: { sessionToken: session.sessionToken } });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error kicking player", description: err.message });
    }
  };

  const copyInvite = () => {
    // Assuming roomId is the inviteCode for simplicity if API returns it, or we fetch it.
    // The instructions say "Shows room invite code prominently" - we'll just show the roomId since that's what we have in the URL.
    navigator.clipboard.writeText(roomId!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connectedPlayers = players.filter(p => p.isConnected);
  const isHost = players.length > 0 && players[0].id === session?.playerId;
  const canStart = isHost && connectedPlayers.length >= 2;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center py-16 px-4 bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, var(--color-primary) 0%, transparent 60%)' }} />
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl relative z-10 space-y-8">
        
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold text-primary gem-glow mb-2">Lobby</h1>
          <p className="text-muted-foreground text-lg">Waiting for players...</p>
        </div>

        <Card className="border-border bg-card/80 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Invite Code</CardTitle>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="text-4xl font-mono tracking-[0.2em]">{roomId}</span>
              <Button variant="outline" size="icon" onClick={copyInvite} className="h-10 w-10 shrink-0">
                <Copy className={`h-5 w-5 ${copied ? 'text-green-500' : ''}`} />
              </Button>
            </div>
            {copied && <p className="text-sm text-green-500 mt-2">Copied to clipboard!</p>}
          </CardHeader>
        </Card>

        <Card className="border-border bg-card/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Players ({connectedPlayers.length}/4)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {players.map((p, i) => (
                <li key={p.id} className={`flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 ${!p.isConnected ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{p.name}</span>
                        {i === 0 && <Crown className="h-4 w-4 text-gem-flux gem-glow" />}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {p.isConnected ? 'Connected' : 'Disconnected'}
                        {p.id === session?.playerId ? ' (You)' : ''}
                      </span>
                    </div>
                  </div>
                  {isHost && p.id !== session?.playerId && (
                    <Button variant="ghost" size="sm" onClick={() => handleKick(p.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
              {players.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Loading players...
                </div>
              )}
            </ul>
          </CardContent>
        </Card>

        {isHost ? (
          <Button 
            size="lg" 
            className="w-full py-8 text-xl font-bold bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all"
            disabled={!canStart || startGame.isPending}
            onClick={handleStart}
          >
            {startGame.isPending ? "Starting..." : "Start Game"}
          </Button>
        ) : (
          <div className="text-center p-6 bg-secondary/30 rounded-xl border border-border/50 animate-pulse">
            <p className="text-lg text-muted-foreground">Waiting for host to start...</p>
          </div>
        )}

      </motion.div>
    </div>
  );
}
