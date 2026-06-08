import { useState, useEffect } from "react";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import { RequireAuth } from "@/components/RequireAuth";
import {
  apiGetMyGames,
  apiQuitRoom,
  apiGetMyStats,
  type ActiveGame,
  type PlayerStats,
  type GameHistoryEntry,
} from "@/lib/accountSession";
import { saveSession } from "@/lib/session";
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
  Sword,
  TrendingUp,
  ListOrdered,
  Settings,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import {
  apiGetPreferences,
  apiUpdatePreferences,
  getSkipCinematics,
  setSkipCinematics,
  getAbridgedAnims,
  getHintsEnabled,
  getMuted,
  clearHintsSeen,
} from "@/lib/cinematicPrefs";
import { useToast } from "@/hooks/use-toast";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import logoLuminae from "@assets/generated_images/logo_luminae.png";
import { getAvatarForPlayer } from "@/lib/avatars";

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function GameCard({
  game,
  index,
  resumingId,
  quittingId,
  onResume,
  onQuit,
}: {
  game: ActiveGame;
  index: number;
  resumingId: string | null;
  quittingId: string | null;
  onResume: (g: ActiveGame) => void;
  onQuit: (g: ActiveGame) => void;
}) {
  const [copied, setCopied] = useState(false);

  const otherPlayers = game.humanPlayers.filter((p) => p.name !== game.playerName);
  const allPlayers = game.humanPlayers;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 + 0.1 }}
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Status + role row */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                game.status === "playing"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-primary/20 text-primary"
              }`}
            >
              {game.status === "playing" ? "In Progress" : "Lobby"}
            </span>
            <span className="text-xs text-muted-foreground">
              {game.isHost ? "Host" : "Player"}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="ml-auto flex items-center gap-1 font-mono text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              title="Copy invite code"
            >
              {copied
                ? <Check className="h-3 w-3 text-green-400" />
                : <Copy className="h-3 w-3" />}
              {game.inviteCode}
            </button>
          </div>

          {/* Player roster */}
          {allPlayers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allPlayers.map((p) => {
                const av = getAvatarForPlayer(p.avatarId);
                const isMe = p.name === game.playerName;
                return (
                  <div
                    key={p.name}
                    className={`flex items-center gap-1.5 rounded-full pl-1 pr-2 py-0.5 text-xs ${
                      isMe
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted/40 text-muted-foreground border border-border/40"
                    }`}
                  >
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white/90 shrink-0"
                      style={{ background: av.accent }}
                    >
                      {p.name[0]?.toUpperCase()}
                    </span>
                    <span className="font-medium">{p.name}</span>
                    {isMe && <span className="opacity-60 text-[10px]">you</span>}
                  </div>
                );
              })}
              {otherPlayers.length === 0 && game.status === "lobby" && (
                <span className="text-xs text-muted-foreground/50 italic">
                  Waiting for others…
                </span>
              )}
            </div>
          ) : null}

          {/* Footer: slot count + time */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {game.currentPlayers}/{game.maxPlayers}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelative(game.updatedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <Button
            size="sm"
            className="h-8 px-3 text-xs rounded-xl gap-1 whitespace-nowrap"
            onClick={() => onResume(game)}
            disabled={resumingId === game.roomId}
          >
            {resumingId === game.roomId
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <ArrowRight className="h-3 w-3" />}
            Resume
          </Button>
          <button
            type="button"
            onClick={() => onQuit(game)}
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
  );
}

function ResultBadge({ result }: { result: GameHistoryEntry["result"] }) {
  const styles = {
    win: "bg-green-500/20 text-green-400 border-green-500/30",
    loss: "bg-red-500/20 text-red-400 border-red-500/30",
    tie: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  const labels = { win: "Win", loss: "Loss", tie: "Tie" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${styles[result]}`}>
      {labels[result]}
    </span>
  );
}

function StatsBar({ stats, isLoading }: { stats: PlayerStats | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4 flex flex-col items-center gap-1">
            <div className="h-6 w-10 bg-muted/40 rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted/30 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="grid grid-cols-3 gap-3 mb-6"
    >
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4 flex flex-col items-center gap-0.5">
        <span className="text-2xl font-bold font-serif text-primary">{stats.gamesPlayed}</span>
        <span className="text-xs text-muted-foreground">Games</span>
      </div>
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4 flex flex-col items-center gap-0.5">
        <span className="text-2xl font-bold font-serif text-green-400">{winRate}%</span>
        <span className="text-xs text-muted-foreground">Win Rate</span>
      </div>
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4 flex flex-col items-center gap-0.5">
        <span className="text-2xl font-bold font-serif text-yellow-300">{stats.avgEminence}</span>
        <span className="text-xs text-muted-foreground">Avg Eminence</span>
      </div>
    </motion.div>
  );
}

function HistoryTab({ stats, isLoading }: { stats: PlayerStats | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats || stats.recentGames.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-muted-foreground"
      >
        <ListOrdered className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No finished games yet</p>
        <p className="text-sm mt-1">Complete a game to see your history here.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {stats.recentGames.map((game, i) => (
        <motion.div
          key={game.roomId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 flex items-center gap-3"
        >
          <ResultBadge result={game.result} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{game.inviteCode}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {game.totalPlayers} player{game.totalPlayers !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(game.finishedAt)}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-yellow-300">{game.eminenceEarned}</span>
            <span className="text-xs text-muted-foreground">Eminence</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

type CostModePref = "printed" | "after_bonuses" | "needed_now" | "remember";

function SettingsTab({ accountId, token }: { accountId: string; token: string | null }) {
  const prefKey = `luminae_cost_mode_pref_${accountId}`;
  const [pref, setPref] = useState<CostModePref>(() => {
    const stored = localStorage.getItem(prefKey);
    if (stored === "printed" || stored === "after_bonuses" || stored === "needed_now") return stored;
    return "remember";
  });

  const handleSelect = (value: CostModePref) => {
    setPref(value);
    if (value === "remember") {
      localStorage.removeItem(prefKey);
    } else {
      localStorage.setItem(prefKey, value);
    }
  };

  const options: { value: CostModePref; label: string; desc: string }[] = [
    { value: "remember", label: "Remember last used", desc: "Restores whichever mode you last used in a game" },
    { value: "printed", label: "Full", desc: "Always show the card's base cost" },
    { value: "after_bonuses", label: "Discounted", desc: "Always show cost after your permanent bonuses" },
    { value: "needed_now", label: "Needed", desc: "Always show what you still need to pay right now" },
  ];

  const [muted, setMutedState] = useState<boolean>(() => getMuted());
  const toggleMuted = () => {
    const next = !muted;
    setMutedState(next);
    try { localStorage.setItem("luminae_muted", String(next)); } catch { /* ignore */ }
    if (token) void apiUpdatePreferences(token, { muted: next }).catch(() => undefined);
  };

  const [abridgedAnims, setAbridgedAnimsState] = useState<boolean>(() => getAbridgedAnims());
  const toggleAbridgedAnims = () => {
    const next = !abridgedAnims;
    setAbridgedAnimsState(next);
    try { localStorage.setItem("luminae_abridged_anims", next ? "1" : "0"); } catch { /* ignore */ }
    if (token) void apiUpdatePreferences(token, { abridgedAnims: next }).catch(() => undefined);
  };

  const [hintsEnabled, setHintsEnabledState] = useState<boolean>(() => getHintsEnabled());
  const toggleHintsEnabled = () => {
    const next = !hintsEnabled;
    setHintsEnabledState(next);
    try { localStorage.setItem("luminae_hints_enabled", next ? "1" : "0"); } catch { /* ignore */ }
    if (token) void apiUpdatePreferences(token, { hintsEnabled: next }).catch(() => undefined);
  };

  const [hintsJustReset, setHintsJustReset] = useState(false);
  const resetHints = () => {
    clearHintsSeen(token ?? undefined);
    setHintsJustReset(true);
    setTimeout(() => setHintsJustReset(false), 2000);
  };

  const [skipCinematics, setSkipCinematicsState] = useState<boolean>(() => getSkipCinematics(accountId));
  const toggleSkipCinematics = () => {
    const next = !skipCinematics;
    setSkipCinematicsState(next);
    setSkipCinematics(next, accountId, token ?? undefined);
  };

  const [loadingPrefs, setLoadingPrefs] = useState<boolean>(!!token);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingPrefs(true);
    apiGetPreferences(token)
      .then((prefs) => {
        if (cancelled) return;
        try {
          localStorage.setItem("luminae_muted", String(prefs.muted));
          localStorage.setItem("luminae_abridged_anims", prefs.abridgedAnims ? "1" : "0");
          localStorage.setItem("luminae_hints_enabled", prefs.hintsEnabled ? "1" : "0");
          const acctKey = `luminae_skip_cinematics_${accountId}`;
          localStorage.setItem(acctKey, prefs.skipCinematics ? "1" : "0");
          localStorage.setItem("luminae_skip_cinematics", prefs.skipCinematics ? "1" : "0");
        } catch { /* ignore storage errors */ }
        setMutedState(prefs.muted);
        setAbridgedAnimsState(prefs.abridgedAnims);
        setHintsEnabledState(prefs.hintsEnabled);
        setSkipCinematicsState(prefs.skipCinematics);
      })
      .catch(() => { /* silently fall back to localStorage values */ })
      .finally(() => { if (!cancelled) setLoadingPrefs(false); });
    return () => { cancelled = true; };
  }, [token, accountId]);

  const prefToggle = (
    on: boolean,
    onToggle: () => void,
    icon: React.ReactNode,
    label: string,
    desc: string,
  ) => (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
        on
          ? "border-primary/60 bg-primary/10 text-foreground"
          : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border/70 hover:text-foreground"
      }`}
    >
      <span className={`flex-shrink-0 ${on ? "text-primary" : "text-muted-foreground opacity-50"}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-none mb-1 ${on ? "text-foreground" : ""}`}>{label}</p>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
      <span
        className={`ml-auto h-5 w-9 rounded-full flex-shrink-0 relative transition-colors ${on ? "bg-primary" : "bg-muted/60"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );

  if (loadingPrefs) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-5">
          <div className="h-4 w-36 rounded bg-muted/50 animate-pulse mb-2" />
          <div className="h-3 w-56 rounded bg-muted/30 animate-pulse mb-5" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-5">
          <div className="h-4 w-32 rounded bg-muted/50 animate-pulse mb-2" />
          <div className="h-3 w-64 rounded bg-muted/30 animate-pulse mb-5" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-5">
        <h3 className="text-sm font-semibold mb-1">Audio &amp; animations</h3>
        <p className="text-xs text-muted-foreground mb-4">
          These settings sync across devices when you're signed in.
        </p>
        <div className="space-y-2">
          {prefToggle(
            !muted,
            toggleMuted,
            muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />,
            muted ? "Sound off" : "Sound on",
            "Toggle in-game audio and affinity sound effects",
          )}
          {prefToggle(
            abridgedAnims,
            toggleAbridgedAnims,
            <Zap className="h-4 w-4" />,
            "Abridged animations",
            "Shorten forge and harvest animations for a faster game feel",
          )}
          {prefToggle(
            !skipCinematics,
            toggleSkipCinematics,
            <Sparkles className="h-4 w-4" />,
            skipCinematics ? "Cinematics off" : "Cinematics on",
            "Show or skip victory and Luminary cinematic sequences",
          )}
          {prefToggle(
            hintsEnabled,
            toggleHintsEnabled,
            <Lightbulb className="h-4 w-4" />,
            "Gameplay hints",
            "Show contextual tips while learning the game",
          )}
          <button
            type="button"
            disabled={!hintsEnabled}
            onClick={resetHints}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all text-sm ${
              hintsEnabled
                ? "border-border/50 bg-secondary/20 text-muted-foreground hover:border-border/70 hover:text-foreground cursor-pointer"
                : "border-border/20 bg-secondary/10 text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            <RotateCcw className={`h-4 w-4 flex-shrink-0 ${hintsEnabled ? "text-muted-foreground" : "opacity-30"}`} />
            <span className="flex-1">
              {hintsJustReset
                ? "Hints reset — tips will reappear in-game"
                : "Reset hints"}
            </span>
            {hintsJustReset && <Check className="h-4 w-4 text-green-400 flex-shrink-0" />}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-5">
        <h3 className="text-sm font-semibold mb-1">Default cost view</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Choose which cost display mode opens when you enter a game.
        </p>
        <div className="space-y-2">
          {options.map((opt) => {
            const active = pref === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  active
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border/70 hover:text-foreground"
                }`}
              >
                <span
                  className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                    active ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}
                />
                <div>
                  <p className={`text-sm font-semibold leading-none mb-1 ${active ? "text-foreground" : ""}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

type DashboardTab = "games" | "history" | "settings";

function DashboardContent() {
  const [, setLocation] = useLocation();
  const { account, token, logout } = useAccount();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>("games");
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [quittingId, setQuittingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const fetchGames = async () => {
    if (!token) return;
    setIsLoadingGames(true);
    try {
      const result = await apiGetMyGames(token);
      setGames(result);
    } catch {
      toast({ variant: "destructive", title: "Could not load games" });
    } finally {
      setIsLoadingGames(false);
    }
  };

  const fetchStats = async () => {
    if (!token) return;
    setIsLoadingStats(true);
    try {
      const result = await apiGetMyStats(token);
      setStats(result);
    } catch {
      // Stats failing is non-critical — just swallow
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    void fetchGames();
    void fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResume = async (game: ActiveGame) => {
    setResumingId(game.roomId);
    try {
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

  useEscapeToClose([
    { isOpen: friendsOpen, onClose: () => setFriendsOpen(false) },
  ]);

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

  if (!account) return null;

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
            {isLoadingStats
              ? "Loading your profile..."
              : stats && stats.gamesPlayed > 0
                ? `${stats.wins}W · ${stats.losses}L${stats.ties > 0 ? ` · ${stats.ties}T` : ""} across ${stats.gamesPlayed} game${stats.gamesPlayed !== 1 ? "s" : ""}`
                : "No finished games yet — play your first!"}
          </p>
        </motion.div>

        {/* Stats bar */}
        <StatsBar stats={stats} isLoading={isLoadingStats} />

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

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary/40 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab("games")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "games"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sword className="h-3.5 w-3.5" />
            Active Games
            {!isLoadingGames && games.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-1.5 py-0.5 leading-none">
                {games.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "history"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            History
            {!isLoadingStats && stats && stats.gamesPlayed > 0 && (
              <span className="ml-1 text-xs bg-muted/60 text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
                {stats.gamesPlayed}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "settings"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "games" ? (
          <div className="space-y-3">
            {isLoadingGames ? (
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
                <GameCard
                  key={game.roomId}
                  game={game}
                  index={i}
                  resumingId={resumingId}
                  quittingId={quittingId}
                  onResume={handleResume}
                  onQuit={handleQuit}
                />
              ))
            )}
          </div>
        ) : activeTab === "history" ? (
          <HistoryTab stats={stats} isLoading={isLoadingStats} />
        ) : (
          <SettingsTab accountId={account.id} token={token} />
        )}
      </div>

      <FriendsPanel
        isOpen={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onChallengeCreated={handleChallengeCreated}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
