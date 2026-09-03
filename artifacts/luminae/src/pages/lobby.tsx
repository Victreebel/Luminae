import { useEffect, useState, useCallback } from "react";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { useLocation, useParams } from "wouter";
import {
  getSkipCinematics, setSkipCinematics,
  getAbridgedAnims, setAbridgedAnims,
  getHintsEnabled, setHintsEnabled,
  getMuted, setMuted,
  syncAccountPreferences,
} from "@/lib/cinematicPrefs";
import {
  useStartGame,
  useKickPlayer,
  useGetRoomByInviteCode,
  useAddAiPlayer,
  getGetRoomByInviteCodeQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSession, clearSession, saveSession } from "@/lib/session";
import { useGameWebsocket } from "@/hooks/use-game-websocket";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Crown, X, Wifi, WifiOff, Bot, Plus, ArrowLeft, Timer, CheckCircle, Users, UserPlus, Send, SlidersHorizontal, ChevronDown, ShieldCheck } from "lucide-react";
import { gameAudio } from "@/lib/audio";
import { FriendsPanel } from "@/components/FriendsPanel";
import { ChallengeInbox } from "@/components/ChallengeInbox";
import { useAccount } from "@/contexts/AccountContext";
import { apiListFriends, apiInviteFriendToRoom, getAccountToken, type Friend } from "@/lib/accountSession";
import { AccountLoadingScreen } from "@/components/AccountLoadingScreen";
import {
  LuminaeWordmark,
  OutOfMatchBackdrop,
  OutOfMatchHeader,
  OutOfMatchSectionHeading,
} from "@/components/out-of-match/OutOfMatchChrome";

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
  const { account, isLoading, prefs: accountPrefs } = useAccount();

  const session = getSession();
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("medium");
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitedUsernames, setInvitedUsernames] = useState<Set<string>>(new Set());
  const [invitingUsername, setInvitingUsername] = useState<string | null>(null);
  const [skipCinematics, setSkipCinematicsState] = useState(() => getSkipCinematics(account?.id));
  const [abridgedAnims, setAbridgedAnimsState] = useState(() => getAbridgedAnims());
  const [hintsEnabled, setHintsEnabledState] = useState(() => getHintsEnabled());
  const [muted, setMutedState] = useState(() => getMuted());
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);

  useEffect(() => {
    const token = getAccountToken();
    if (account?.id && token) {
      syncAccountPreferences(token, account.id)
        .then((prefs) => {
          setSkipCinematicsState(prefs.skipCinematics);
          setAbridgedAnimsState(prefs.abridgedAnims);
          setHintsEnabledState(prefs.hintsEnabled);
          setMutedState(prefs.muted);
        })
        .catch(() => {
          setSkipCinematicsState(getSkipCinematics(account.id));
          setAbridgedAnimsState(getAbridgedAnims());
          setHintsEnabledState(getHintsEnabled());
          setMutedState(getMuted());
        });
    } else {
      setSkipCinematicsState(getSkipCinematics(account?.id));
      setAbridgedAnimsState(getAbridgedAnims());
      setHintsEnabledState(getHintsEnabled());
      setMutedState(getMuted());
    }
  }, [account?.id]);

  // React to preference updates pushed from AccountContext polling (cross-device sync)
  useEffect(() => {
    if (!accountPrefs) return;
    setSkipCinematicsState(accountPrefs.skipCinematics);
    setAbridgedAnimsState(accountPrefs.abridgedAnims);
    setHintsEnabledState(accountPrefs.hintsEnabled);
    setMutedState(accountPrefs.muted);
    gameAudio.setMuted(accountPrefs.muted);
  }, [accountPrefs]);

  const handleToggleSkipCinematics = () => {
    const next = !skipCinematics;
    setSkipCinematicsState(next);
    setSkipCinematics(next, account?.id, getAccountToken() ?? undefined);
  };

  const handleToggleAbridgedAnims = () => {
    const next = !abridgedAnims;
    setAbridgedAnimsState(next);
    setAbridgedAnims(next, getAccountToken() ?? undefined);
  };

  const handleToggleHints = () => {
    const next = !hintsEnabled;
    setHintsEnabledState(next);
    setHintsEnabled(next, getAccountToken() ?? undefined);
  };

  const handleToggleMuted = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next, getAccountToken() ?? undefined);
    gameAudio.setMuted(next);
  };

  const handleChallengeCreated = (cRoomId: string, cInviteCode: string, cSessionToken: string, cPlayerId: string) => {
    saveSession({
      roomId: cRoomId,
      inviteCode: cInviteCode,
      playerId: cPlayerId,
      sessionToken: cSessionToken,
      playerName: account?.username ?? "Player",
      isHost: true,
    });
    setLocation(`/lobby/${cRoomId}`);
  };

  const lookupKey = session?.inviteCode ?? roomId ?? "";
  const { data: roomInfo, refetch: refetchRoomInfo } = useGetRoomByInviteCode(lookupKey, {
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
    onGameStarted: () => { setLocation(`/game/${roomId}`); },
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
    onRoomUpdated: () => { void refetchRoomInfo(); },
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

  useEscapeToClose([
    { isOpen: friendsOpen, onClose: () => setFriendsOpen(false) },
  ]);

  const fetchFriends = useCallback(async () => {
    const token = getAccountToken();
    if (!token || !account) return;
    try {
      const list = await apiListFriends(token);
      setFriends(list);
    } catch {
      // silently ignore — friends list is non-critical
    }
  }, [account]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  if (isLoading) return <AccountLoadingScreen />;

  const handleInviteFriend = async (username: string) => {
    const token = getAccountToken();
    if (!token || !session?.sessionToken || !roomId) return;
    setInvitingUsername(username);
    try {
      await apiInviteFriendToRoom(token, roomId, session.sessionToken, username);
      setInvitedUsernames((prev) => new Set(prev).add(username));
      toast({ title: "Invite sent", description: `${username} received your invite.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send invite";
      toast({ variant: "destructive", title: "Invite failed", description: msg });
    } finally {
      setInvitingUsername(null);
    }
  };

  const handleLeave = () => {
    if (!window.confirm("Leave the room? You can rejoin with the invite code.")) return;
    clearSession();
    setLocation("/?menu=1");
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
    <div className="oom-shell h-[100dvh] flex flex-col overflow-hidden">
      <OutOfMatchBackdrop audioMood="lobby" />

      <OutOfMatchHeader
        left={<LuminaeWordmark onClick={handleLeave} />}
        center={<span className="oom-kicker hidden sm:block">Match Lobby</span>}
        right={(
          <div className="flex items-center gap-1 sm:gap-2">
            <ChallengeInbox />
            {account && (
              <button
                type="button"
                onClick={() => setFriendsOpen(true)}
                className="oom-icon-button oom-icon-button--label"
                title="Friends"
                aria-haspopup="dialog"
                aria-expanded={friendsOpen}
              >
                <Users className="h-4 w-4" />
                <span className="hidden text-sm font-medium sm:inline">Friends</span>
              </button>
            )}
            <button type="button" onClick={handleLeave} className="oom-icon-button oom-icon-button--label" title="Leave room">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden text-sm font-medium sm:inline">Leave</span>
            </button>
          </div>
        )}
      />

      <main className="oom-frame relative z-10 flex-1 overflow-y-auto py-5 sm:py-7">
        <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
          <section className="oom-panel oom-panel--gold p-5 sm:p-6 lg:col-span-2">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="oom-kicker mb-2">Match Lobby</p>
                <h1 className="font-serif text-2xl font-bold sm:text-3xl">Assemble the Table</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Share the invite, fill the seats, and launch when your civilizations are assembled.
                </p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" />
                    {roomInfo?.turnTimerSeconds ? `${roomInfo.turnTimerSeconds}s turns` : "Untimed turns"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-300" />
                    Victory requirement: {roomInfo?.victoryRequirement ?? 20} Eminence
                  </span>
                  {roomInfo?.gameMode === "custom" && (
                    <span className="flex items-center gap-1.5 text-amber-200/80">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Blueprint Custom · cleared accounts
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0 border-t border-border/30 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <p className="oom-kicker mb-2">Invite Code</p>
                <div className="flex items-center gap-3">
                  <span className="min-w-0 select-all truncate font-mono text-2xl font-bold tracking-[0.16em] text-foreground sm:text-3xl">
                    {inviteCode || "------"}
                  </span>
                  <button
                    type="button"
                    onClick={copyInvite}
                    className={`oom-icon-button shrink-0 ${copied ? "border-green-500/40 bg-green-500/15 text-green-400" : ""}`}
                    title="Copy invite link"
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <AnimatePresence>
                  {copied && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-xs text-green-400">
                      Invite link copied
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          <div className={`min-w-0 space-y-4 ${isHost ? "order-2" : "order-1"} lg:order-1`}>
            <section className="oom-panel oom-panel--quiet overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/30 px-4 py-3.5">
                <OutOfMatchSectionHeading eyebrow="Roster" title="Players" />
                <span className="font-mono text-xs text-muted-foreground">{players.length} / {maxPlayers}</span>
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
                  className={`flex items-center gap-3 px-4 py-3.5 ${!p.isConnected && !p.isAi && p.id !== session?.playerId ? "opacity-40" : ""}`}
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
                        {(p.isConnected || p.id === session?.playerId)
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
            </section>

            {account && friends.length > 0 && canAddMore && (
          <section className="oom-panel oom-panel--quiet overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3.5">
              <UserPlus className="h-4 w-4 shrink-0 text-primary/70" />
              <span className="text-sm font-semibold">Invite Friends</span>
            </div>
            <div className="divide-y divide-border/30">
              {friends
                .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                .map((friend) => {
                  const alreadyIn = players.some(
                    (p) => !p.isAi && p.name.toLowerCase() === friend.username.toLowerCase(),
                  );
                  const invited = invitedUsernames.has(friend.username);
                  const sending = invitingUsername === friend.username;
                  const disabled = alreadyIn || invited || sending || !friend.isOnline;

                  return (
                    <div
                      key={friend.friendshipId}
                      className={`flex items-center gap-3 px-4 py-3 ${!friend.isOnline ? "opacity-40" : ""}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{friend.username}</p>
                        <p className={`text-[11px] ${friend.isOnline ? "text-green-400" : "text-muted-foreground"}`}>
                          {alreadyIn ? "Already in room" : friend.isOnline ? "Online" : "Offline"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && handleInviteFriend(friend.username)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                          invited || alreadyIn
                            ? "bg-green-500/15 text-green-400 cursor-default"
                            : disabled
                            ? "bg-secondary/40 text-muted-foreground cursor-not-allowed"
                            : "bg-primary/20 text-primary hover:bg-primary/30"
                        }`}
                      >
                        {alreadyIn ? (
                          <><CheckCircle className="h-3.5 w-3.5" /> Joined</>
                        ) : invited ? (
                          <><CheckCircle className="h-3.5 w-3.5" /> Invited</>
                        ) : sending ? (
                          <><Send className="h-3.5 w-3.5 animate-pulse" /> Sending…</>
                        ) : (
                          <><Send className="h-3.5 w-3.5" /> Invite</>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>
          </section>
            )}
          </div>

          <aside className={`min-w-0 space-y-4 ${isHost ? "order-1" : "order-2"} lg:order-2 lg:sticky lg:top-5 lg:self-start`}>
            <section className="oom-panel oom-panel--gold p-5">
              <p className="oom-kicker mb-2">Launch Control</p>
              <h2 className="font-serif text-xl font-bold">{isHost ? "Launch When Ready" : "Waiting for the Host"}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {isHost
                  ? canStart
                    ? `${connectedPlayers.length} civilizations are connected. Launching brings everyone into the match together.`
                    : "At least two connected civilizations are required to begin."
                  : "The match will begin as soon as the host launches it."}
              </p>
              <div className="mt-5">
                {isHost ? (
                  <Button
                    size="lg"
                    className="oom-action-primary h-12 w-full"
                    disabled={!canStart || startGame.isPending}
                    onClick={handleStart}
                  >
                    {startGame.isPending
                      ? "Starting..."
                      : canStart
                      ? "Launch Match"
                      : `Need ${2 - connectedPlayers.length} more player${2 - connectedPlayers.length !== 1 ? "s" : ""}`}
                  </Button>
                ) : (
                  <div className="rounded-md border border-border/35 bg-secondary/25 px-4 py-3 text-center text-sm text-muted-foreground">
                    Waiting for host to start
                  </div>
                )}
              </div>
            </section>

            {isHost && canAddMore && (
              <section className="oom-panel oom-panel--quiet p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Bot className="h-4 w-4 shrink-0 text-purple-300" />
                  <div>
                    <p className="text-sm font-semibold">Add an AI Civilization</p>
                    <p className="text-[11px] text-muted-foreground">Fill an open seat instantly</p>
                  </div>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <Select value={aiDifficulty} onValueChange={(v) => setAiDifficulty(v as AiDifficulty)}>
                    <SelectTrigger className="min-w-0">
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
                    className="gap-1.5 rounded-md"
                    data-testid="add-ai-btn"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </section>
            )}

        <section className="oom-panel oom-panel--quiet overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedSettingsOpen((open) => !open)}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            aria-expanded={advancedSettingsOpen}
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="h-8 w-8 rounded-md bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Advanced settings</span>
                <span className="block text-[11px] text-muted-foreground truncate">Animations, audio, and hints</span>
              </span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${advancedSettingsOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence initial={false}>
            {advancedSettingsOpen && (
              <motion.div
                key="advanced-settings"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden border-t border-border/35"
              >
                <div className="divide-y divide-border/35">
                  {(
                    [
                      { label: "Skip cinematics", desc: "Skip intro animations during play", value: skipCinematics, onToggle: handleToggleSkipCinematics },
                      { label: "Reduced animations", desc: "Compact Luminary effects and shorter Artifact animations", value: abridgedAnims, onToggle: handleToggleAbridgedAnims },
                      { label: "Mute audio", desc: "Silence all in-game sounds", value: muted, onToggle: handleToggleMuted },
                      { label: "Hints", desc: "Show gameplay hints and tooltips", value: hintsEnabled, onToggle: handleToggleHints },
                    ] as const
                  ).map(({ label, desc, value, onToggle }) => (
                    <div key={label} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={value}
                        onClick={onToggle}
                        className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring shrink-0 ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-5" : "translate-x-0"}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
          </aside>
        </div>
      </main>

      <FriendsPanel
        isOpen={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onChallengeCreated={handleChallengeCreated}
      />
    </div>
  );
}
