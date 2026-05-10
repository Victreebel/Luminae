import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import { apiGetMyGames, apiQuitRoom, type ActiveGame } from "@/lib/accountSession";
import { saveSession, getSession } from "@/lib/session";
import { FriendsPanel } from "@/components/FriendsPanel";
import { ChallengeInbox } from "@/components/ChallengeInbox";
import { getGameState } from "@workspace/api-client-react";
import {
  ArrowRight,
  Plus,
  LogOut,
  Users,
  Loader2,
  Clock,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import logoLuminae from "@assets/generated_images/logo_luminae.png";

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { account, token, logout } = useAccount();
  const { toast } = useToast();

  const [games, setGames] = useState<ActiveGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quittingId, setQuittingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const fetchGames = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await apiGetMyGames(token);
      setGames(result);
    } catch {
      toast({ variant: "destructive", title: "Could not load games" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchGames();
  }, [token]);

  const handleResume = async (game: ActiveGame) => {
    setResumingId(game.roomId);
    try {
      // Verify the game is still active
      const state = await getGameState(game.roomId, { sessionToken: game.sessionToken });
      saveSession({
        roomId: game.roomId,
        inviteCode: game.inviteCode,
        playerId: game.playerId,
        sessionToken: game.sessionToken,
        playerName: game.playerName,
        isHost: game.isHost,
        avatarId: game.avatarId ?? undefined,
      });
      if (state.status === "playing") {
        setLocation(`/game/${game.roomId}`);
      } else {
        setLocation(`/lobby/${game.roomId}`);
      }
    } catch {
      toast({ variant: "destructive", title: "Could not rejoin", description: "Game may no longer be available" });
      void fetchGames();
    } finally {
      setResumingId(null);
    }
  };

  const handleQuit = async (game: ActiveGame) => {
    if (!token) return;
    setQuittingId(game.roomId);
    try {
      await apiQuitRoom(token, game.roomId, game.sessionToken);
      setGames((prev) => prev.filter((g) => g.roomId !== game.roomId));
      toast({ title: "Left game", description: `You quit room ${game.inviteCode}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ variant: "destructive", title: "Could not quit", description: msg });
    } finally {
      setQuittingId(null);
    }
  };

  const handleChallengeCreated = (roomId: string, inviteCode: string, sessionToken: string, playerId: string) => {
    saveSession({
      roomId,
      inviteCode,
      playerId,
      sessionToken,
      playerName: account?.username ?? "Player",
      isHost: true,
    });
    setLocation(`/lobby/${roomId}`);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (!account) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `url(${backgroundCosmos})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 bg-background/80 pointer-events-none" />

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-border/40 bg-card/30 backdrop-blur">
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="hover:opacity-80 transition-opacity"
        >
          <img src={logoLuminae} alt="Luminae" className="h-7 w-auto" />
        </button>
        <div className="flex items-center gap-2 relative">
          <ChallengeInbox onWebSocketChallenge={() => void fetchGames()} />
          <button
            type="button"
            onClick={() => setFriendsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Friends</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col px-5 py-6 max-w-xl mx-auto w-full">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-serif font-bold">
            Welcome back, <span className="text-primary">{account.username}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "Loading your games..." : `${games.length} active game${games.length !== 1 ? "s" : ""}`}
          </p>
        </motion.div>

        {/* Start New Game CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex gap-3"
        >
          <Button
            className="flex-1 h-12 font-bold rounded-2xl gap-2"
            onClick={() => setLocation("/?newgame=1")}
          >
            <Plus className="h-4 w-4" />
            New Game
          </Button>
          <Button
            variant="secondary"
            className="flex-1 h-12 font-bold rounded-2xl gap-2"
            onClick={() => setFriendsOpen(true)}
          >
            <Users className="h-4 w-4" />
            Friends
          </Button>
        </motion.div>

        {/* Active games */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : games.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-muted-foreground"
            >
              <Trophy className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No active games</p>
              <p className="text-sm mt-1">Create a game or challenge a friend to get started.</p>
            </motion.div>
          ) : (
            games.map((game, i) => (
              <motion.div
                key={game.roomId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 + 0.1 }}
                className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          game.status === "playing"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-primary/20 text-primary"
                        }`}
                      >
                        {game.status === "playing" ? "In Progress" : "Lobby"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{game.inviteCode}</span>
                    </div>
                    <div className="text-sm font-semibold">
                      {game.isHost ? "Host" : "Player"} · Up to {game.maxPlayers} players
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatRelative(game.updatedAt)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs rounded-xl gap-1 whitespace-nowrap"
                      onClick={() => handleResume(game)}
                      disabled={resumingId === game.roomId}
                    >
                      {resumingId === game.roomId
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <ArrowRight className="h-3 w-3" />}
                      Resume
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleQuit(game)}
                      disabled={quittingId === game.roomId}
                      className="h-8 px-3 text-xs rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center gap-1 justify-center transition-colors"
                    >
                      {quittingId === game.roomId
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RotateCcw className="h-3 w-3" />}
                      Quit
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <FriendsPanel
        isOpen={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onChallengeCreated={handleChallengeCreated}
      />
    </div>
  );
}
