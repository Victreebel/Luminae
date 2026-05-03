import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useStartGame, useKickPlayer, useGetRoomByInviteCode, getGetRoomByInviteCodeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { useGameWebsocket } from "@/hooks/use-game-websocket";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Copy, Users, Crown, X, Wifi, WifiOff } from "lucide-react";
import { gameAudio } from "@/lib/audio";

interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  orderIndex: number;
}

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const session = getSession();
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [copied, setCopied] = useState(false);

  // Fetch initial room state using the invite code stored in session
  const { data: roomInfo } = useGetRoomByInviteCode(
    session?.inviteCode ?? "",
    {
      query: {
        enabled: !!session?.inviteCode,
        queryKey: getGetRoomByInviteCodeQueryKey(session?.inviteCode ?? ""),
      },
    }
  );

  // Seed players from API response on first load
  useEffect(() => {
    if (roomInfo?.players && players.length === 0) {
      setPlayers(
        roomInfo.players.map((p) => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost,
          isConnected: p.isConnected,
          orderIndex: p.orderIndex,
        }))
      );
    }
  }, [roomInfo, players.length]);

  useEffect(() => {
    if (!session || session.roomId !== roomId) {
      setLocation("/");
    }
  }, [session, roomId, setLocation]);

  const startGame = useStartGame();
  const kickPlayer = useKickPlayer();

  useGameWebsocket({
    roomId: roomId!,
    sessionToken: session?.sessionToken ?? "",
    onGameStarted: () => {
      gameAudio.playTurnStart();
      setLocation(`/game/${roomId}`);
    },
    onPlayerJoined: (player) => {
      if (!player?.id) return;
      setPlayers((prev) => {
        const exists = prev.find((p) => p.id === player.id);
        if (exists) {
          return prev.map((p) =>
            p.id === player.id ? { ...p, isConnected: player.isConnected ?? true } : p
          );
        }
        return [
          ...prev,
          {
            id: player.id,
            name: player.name ?? "Unknown",
            isHost: player.isHost ?? false,
            isConnected: player.isConnected ?? true,
            orderIndex: player.orderIndex ?? prev.length,
          },
        ];
      });
    },
    onPlayerLeft: (playerId) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, isConnected: false } : p))
      );
    },
    onPlayerKicked: (playerId) => {
      if (playerId === session?.playerId) {
        toast({ title: "Removed", description: "You were removed from the room." });
        setLocation("/");
      } else {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      }
    },
    onStateUpdate: (state) => {
      if (state.status === "playing") {
        setLocation(`/game/${roomId}`);
      }
    },
  });

  const handleStart = async () => {
    if (!session) return;
    try {
      await startGame.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken },
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: err.message,
      });
    }
  };

  const handleKick = async (playerId: string) => {
    if (!session) return;
    try {
      await kickPlayer.mutateAsync({
        roomId: roomId!,
        playerId,
        data: { sessionToken: session.sessionToken },
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error removing player",
        description: err.message,
      });
    }
  };

  const copyInvite = () => {
    const code = session?.inviteCode ?? roomId ?? "";
    const url = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(url).catch(() => {
      navigator.clipboard.writeText(code);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connectedPlayers = players.filter((p) => p.isConnected);
  const isHost = session?.isHost ?? false;
  const canStart = isHost && connectedPlayers.length >= 2;
  const inviteCode = session?.inviteCode ?? roomId ?? "";

  return (
    <div className="min-h-[100dvh] flex flex-col items-center py-16 px-4 bg-background text-foreground relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, hsl(var(--primary)) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl relative z-10 space-y-6"
      >
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold text-primary gem-glow mb-1">
            Lobby
          </h1>
          <p className="text-muted-foreground">Waiting for players to join...</p>
        </div>

        {/* Invite Code Card */}
        <Card className="border-border bg-card/80 backdrop-blur">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Invite Code
            </CardTitle>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="text-4xl font-mono tracking-[0.25em] text-foreground select-all">
                {inviteCode}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={copyInvite}
                className="h-10 w-10 shrink-0"
                title="Copy invite link"
              >
                <Copy className={`h-4 w-4 ${copied ? "text-green-400" : ""}`} />
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-400 mt-1">Invite link copied!</p>
            )}
          </CardHeader>
        </Card>

        {/* Players Card */}
        <Card className="border-border bg-card/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Players ({connectedPlayers.length} / {roomInfo?.maxPlayers ?? 4})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground animate-pulse">
                Loading players...
              </div>
            ) : (
              <ul className="space-y-3">
                {players.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 transition-opacity ${
                      !p.isConnected ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                        {p.name ? p.name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base">{p.name}</span>
                          {(p.isHost || i === 0) && (
                            <Crown className="h-4 w-4 text-yellow-400" />
                          )}
                          {p.id === session?.playerId && (
                            <span className="text-xs text-muted-foreground">(you)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          {p.isConnected ? (
                            <Wifi className="h-3 w-3 text-green-400" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-red-400" />
                          )}
                          <span>{p.isConnected ? "Connected" : "Disconnected"}</span>
                        </div>
                      </div>
                    </div>
                    {isHost && p.id !== session?.playerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleKick(p.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Start / Waiting */}
        {isHost ? (
          <Button
            size="lg"
            className="w-full py-7 text-xl font-bold transition-all"
            disabled={!canStart || startGame.isPending}
            onClick={handleStart}
          >
            {startGame.isPending
              ? "Starting..."
              : canStart
              ? "Start Game"
              : `Waiting for players (need ${2 - connectedPlayers.length} more)`}
          </Button>
        ) : (
          <div className="text-center p-6 bg-secondary/30 rounded-xl border border-border/50">
            <p className="text-lg text-muted-foreground animate-pulse">
              Waiting for host to start the game...
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
