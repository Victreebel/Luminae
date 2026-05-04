import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  useStartGame,
  useKickPlayer,
  useGetRoomByInviteCode,
  useAddAiPlayer,
  getGetRoomByInviteCodeQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSession, clearSession } from "@/lib/session";
import { useGameWebsocket } from "@/hooks/use-game-websocket";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Crown, X, Wifi, WifiOff, Bot, Plus, ArrowLeft, Timer, CheckCircle } from "lucide-react";
import { gameAudio } from "@/lib/audio";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import logoLuminae from "@assets/generated_images/logo_luminae.png";

type AiDifficulty = "easy" | "medium" | "hard";

interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  orderIndex: number;
  isAi: boolean;
  aiDifficulty?: AiDifficulty | null;
}

const DIFFICULTY_LABEL: Record<AiDifficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFFICULTY_DOT: Record<AiDifficulty, string> = {
  easy: "bg-green-400",
  medium: "bg-yellow-400",
  hard: "bg-red-400",
};

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const session = getSession();
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("medium");

  const lookupKey = session?.inviteCode ?? roomId ?? "";
  const { data: roomInfo } = useGetRoomByInviteCode(lookupKey, {
    query: { enabled: !!lookupKey, queryKey: getGetRoomByInviteCodeQueryKey(lookupKey) },
  });

  useEffect(() => {
    if (roomInfo && roomInfo.status !== "lobby") setLocation(`/game/${roomId}`);
  }, [roomInfo, roomId, setLocation]);

  useEffect(() => {
    if (!roomInfo?.players) return;
    setPlayers(
      roomInfo.players.map((p) => ({
        id: p.id, name: p.name, isHost: p.isHost, isConnected: p.isConnected,
        orderIndex: p.orderIndex, isAi: p.isAi,
        aiDifficulty: p.aiDifficulty as AiDifficulty | null | undefined,
      }))
    );
  }, [roomInfo]);

  useEffect(() => {
    if (!session || session.roomId !== roomId) setLocation("/");
  }, [session, roomId, setLocation]);

  const startGame = useStartGame();
  const kickPlayer = useKickPlayer();
  const addAiPlayer = useAddAiPlayer();

  useGameWebsocket({
    roomId: roomId!,
    sessionToken: session?.sessionToken ?? "",
    onGameStarted: () => { gameAudio.playTurnStart(); setLocation(`/game/${roomId}`); },
    onPlayerJoined: (player) => {
      if (!player?.id) return;
      setPlayers((prev) => {
        const exists = prev.find((p) => p.id === player.id);
        if (exists) return prev.map((p) => p.id === player.id ? { ...p, isConnected: player.isConnected ?? true, isAi: player.isAi ?? p.isAi, aiDifficulty: player.aiDifficulty ?? p.aiDifficulty } : p);
        return [...prev, { id: player.id, name: player.name ?? "Unknown", isHost: player.isHost ?? false, isConnected: player.isConnected ?? true, orderIndex: player.orderIndex ?? prev.length, isAi: player.isAi ?? false, aiDifficulty: player.aiDifficulty ?? null }];
      });
    },
    onPlayerLeft: (playerId) => setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, isConnected: false } : p)),
    onPlayerKicked: (playerId) => {
      if (playerId === session?.playerId) {
        toast({ title: "Removed", description: "You were removed from the room." });
        setLocation("/");
      } else {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      }
    },
    onStateUpdate: (state) => { if (state.status === "playing") setLocation(`/game/${roomId}`); },
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
      toast({ variant: "destructive", title: "Error removing player", description: err.message });
    }
  };

  const handleAddAi = async () => {
    if (!session) return;
    try {
      const newPlayer = await addAiPlayer.mutateAsync({ roomId: roomId!, data: { sessionToken: session.sessionToken, difficulty: aiDifficulty } });
      setPlayers((prev) => {
        if (prev.find((p) => p.id === newPlayer.id)) return prev;
        return [...prev, { id: newPlayer.id, name: newPlayer.name, isHost: newPlayer.isHost, isConnected: newPlayer.isConnected, orderIndex: newPlayer.orderIndex, isAi: newPlayer.isAi, aiDifficulty: newPlayer.aiDifficulty as AiDifficulty | null }];
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not add AI player", description: err.message });
    }
  };

  const handleLeave = () => {
    if (!window.confirm("Leave the room? You can rejoin with the invite code.")) return;
    clearSession();
    setLocation("/");
  };

  const copyInvite = () => {
    const code = session?.inviteCode ?? roomId ?? "";
    const url = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(url).catch(() => navigator.clipboard.writeText(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connectedPlayers = players.filter((p) => p.isConnected || p.isAi || p.id === session?.playerId);
  const me = players.find((p) => p.id === session?.playerId);
  const isHost = me?.isHost ?? session?.isHost ?? false;
  const maxPlayers = roomInfo?.maxPlayers ?? 4;
  const canStart = isHost && connectedPlayers.length >= 2;
  const canAddMore = players.length < maxPlayers;
  const inviteCode = roomInfo?.inviteCode ?? session?.inviteCode ?? "";

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Cosmic background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `url(${backgroundCosmos})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 bg-background/78 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.5) 0%, transparent 55%)" }}
      />

      {/* Header */}
      <header className="shrink-0 h-14 px-4 flex items-center justify-between bg-card/60 backdrop-blur border-b border-border z-10 relative">
        <button type="button" onClick={handleLeave} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Leave
        </button>
        <img src={logoLuminae} alt="Luminae" className="h-8 w-auto drop-shadow-[0_0_12px_rgba(255,196,61,0.3)]" draggable={false} />
        <div className="w-16" />
      </header>

      {/* Scrollable content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 max-w-sm mx-auto w-full">

        {/* Invite code card */}
        <div className="rounded-2xl bg-card/80 border border-border/60 backdrop-blur p-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Invite Code</p>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-4xl font-mono tracking-[0.25em] text-foreground font-bold select-all">
              {inviteCode || "------"}
            </span>
            <button
              type="button"
              onClick={copyInvite}
              className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-colors ${copied ? "bg-green-500/20 border-green-500/40 text-green-400" : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground"}`}
              title="Copy invite link"
            >
              {copied ? <CheckCircle className="h-4.5 w-4.5" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <AnimatePresence>
            {copied && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-green-400 mb-2">
                Invite link copied!
              </motion.p>
            )}
          </AnimatePresence>
          {roomInfo?.turnTimerSeconds ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              <span>{roomInfo.turnTimerSeconds}s per turn</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No turn timer</div>
          )}
        </div>

        {/* Players list */}
        <div className="rounded-2xl bg-card/70 border border-border/60 backdrop-blur overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <span className="text-sm font-semibold">Players</span>
            <span className="text-xs text-muted-foreground font-mono">{players.length} / {maxPlayers}</span>
          </div>
          {players.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm animate-pulse">Loading...</div>
          ) : (
            <div className="divide-y divide-border/30">
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-3 px-4 py-3.5 ${!p.isConnected && !p.isAi ? "opacity-40" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${p.isAi ? "bg-purple-500/20 text-purple-300" : "bg-primary/20 text-primary"}`}>
                    {p.isAi ? <Bot className="h-5 w-5" /> : (p.name?.charAt(0)?.toUpperCase() ?? "?")}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                      {p.isHost && !p.isAi && <Crown className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
                      {p.id === session?.playerId && <span className="text-[10px] text-muted-foreground">(you)</span>}
                      {p.isAi && p.aiDifficulty && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY_DOT[p.aiDifficulty]}`} />
                          AI · {DIFFICULTY_LABEL[p.aiDifficulty]}
                        </span>
                      )}
                    </div>
                    {!p.isAi && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        {p.isConnected
                          ? <><Wifi className="h-3 w-3 text-green-400" /><span className="text-green-400">Connected</span></>
                          : <><WifiOff className="h-3 w-3 text-red-400" /><span className="text-red-400">Disconnected</span></>
                        }
                      </div>
                    )}
                  </div>

                  {/* Kick button */}
                  {isHost && p.id !== session?.playerId && (
                    <button
                      type="button"
                      onClick={() => handleKick(p.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      title={p.isAi ? "Remove AI" : "Kick player"}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Add AI (host only) */}
        {isHost && canAddMore && (
          <div className="rounded-2xl bg-card/60 border border-border/50 backdrop-blur p-4 flex items-center gap-3">
            <Bot className="h-4 w-4 text-purple-300 shrink-0" />
            <Select value={aiDifficulty} onValueChange={(v) => setAiDifficulty(v as AiDifficulty)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy AI</SelectItem>
                <SelectItem value="medium">Medium AI</SelectItem>
                <SelectItem value="hard">Hard AI</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddAi}
              disabled={addAiPlayer.isPending}
              variant="secondary"
              className="shrink-0 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        )}
      </main>

      {/* Bottom action */}
      <div className="relative z-10 shrink-0 px-4 pb-8 pt-3 bg-gradient-to-t from-background/80 to-transparent">
        <div className="max-w-sm mx-auto w-full">
          {isHost ? (
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold rounded-2xl"
              disabled={!canStart || startGame.isPending}
              onClick={handleStart}
            >
              {startGame.isPending
                ? "Starting..."
                : canStart
                ? "Launch Game"
                : `Need ${2 - connectedPlayers.length} more player${2 - connectedPlayers.length !== 1 ? 's' : ''}`}
            </Button>
          ) : (
            <div className="text-center py-4 rounded-2xl bg-secondary/30 border border-border/40">
              <p className="text-sm text-muted-foreground animate-pulse">
                Waiting for host to start...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
