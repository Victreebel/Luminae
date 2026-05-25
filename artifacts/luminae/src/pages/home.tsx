import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { loadTutorialProgress, clearTutorialProgress, hasTutorialBeenCompleted, getIntroSeenBeat, clearIntroSeen } from "@/lib/tutorialProgress";
import { TUTORIAL_BEATS } from "@/lib/tutorialData";
import { setPendingStartBeat } from "@/lib/tutorialStartBeat";
import { TutorialStartModal } from "@/components/tutorial/TutorialStartModal";
import { ThresholdCinematic } from "@/components/tutorial/ThresholdCinematic";
import {
  useCreateRoom,
  useGetRoomByInviteCode,
  useJoinRoom,
  useRejoinRoom,
  getGetRoomByInviteCodeQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveSession, getSession, clearSession } from "@/lib/session";
import { getAccountToken, type ActiveGame } from "@/lib/accountSession";
import { getGameState } from "@workspace/api-client-react";
import { getSavedAvatarId, saveAvatarId, getAvatarForPlayer } from "@/lib/avatars";
import { AvatarPicker } from "@/components/AvatarPicker";
import { LoginRegisterForm } from "@/components/LoginRegisterForm";
import { useAccount } from "@/contexts/AccountContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, ArrowRight, Clock, ChevronDown, ChevronUp, LogIn, UserPlus, LayoutDashboard, LogOut, X, BookOpen } from "lucide-react";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";

type Mode = "home" | "create" | "join" | "auth";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { account, token, isLoading: accountLoading, logout } = useAccount();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [tutorialSeen] = useState(() => !!localStorage.getItem("luminae_tutorial_seen"));
  const [tutorialCompleted] = useState(() => hasTutorialBeenCompleted());
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialHasProgress, setTutorialHasProgress] = useState(false);
  const [tutorialSavedBeat, setTutorialSavedBeat] = useState<number | null>(null);
  const [showCinematic, setShowCinematic] = useState(false);
  const handleLogout = async () => {
    await logout();
    setConfirmLogout(false);
    setMode("home");
  };
  const handleTutorialChoice = useCallback((choice: "begin" | "resume" | "start-over" | "cancel") => {
    if (choice === "cancel") {
      setShowTutorialModal(false);
      return;
    }
    setShowTutorialModal(false);
    if (choice === "start-over") {
      clearTutorialProgress();
      clearIntroSeen();
      setPendingStartBeat(0);
    } else if (choice === "begin") {
      clearTutorialProgress();
      const introSkipBeat = getIntroSeenBeat();
      setPendingStartBeat(introSkipBeat ?? 0);
    } else {
      const saved = loadTutorialProgress();
      setPendingStartBeat(saved ?? 0);
    }
    setShowCinematic(true);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setShowCinematic(false);
    setLocation("/tutorial");
  }, [setLocation]);

  const [activeSession, setActiveSession] = useState(() => getSession());
  const [mode, setMode] = useState<Mode>("home");
  const [avatarId, setAvatarId] = useState(() => getSavedAvatarId());
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [turnTimer, setTurnTimer] = useState<string>("0");
  const [playerName, setPlayerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // If account user has active games, redirect to dashboard; otherwise stay on home with name prefilled
  useEffect(() => {
    if (accountLoading) return;
    if (!account || !token) return;

    // Check URL params — ?newgame=1 always stays on home
    const params = new URLSearchParams(window.location.search);
    if (params.get("newgame") === "1") return;

    // Auto-navigate: single playing game → go directly to game; multiple/other → dashboard
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    fetch(`${base}/api/auth/me/games`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d: { games?: ActiveGame[] }) => {
        const games = d.games ?? [];
        if (games.length === 0) return;

        const playingGames = games.filter((g) => g.status === "playing");

        if (games.length === 1 && playingGames.length === 1) {
          // Exactly one in-progress game — restore the session token and go straight in
          const game = playingGames[0];
          saveSession({
            roomId: game.roomId,
            inviteCode: game.inviteCode,
            playerId: game.playerId,
            sessionToken: game.sessionToken,
            playerName: game.playerName,
            isHost: game.isHost,
            avatarId: game.avatarId ?? undefined,
          });
          setLocation(`/game/${game.roomId}`);
        } else {
          // Multiple games or a single lobby game — let the dashboard handle it
          setLocation("/dashboard");
        }
      })
      .catch(() => {
        // network error — stay on home
      });
  }, [account, token, accountLoading, setLocation]);

  // Pre-fill from URL ?invite= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) {
      setInviteCode(code.toUpperCase());
      setMode("join");
    }
  }, []);

  // Pre-fill name from account username
  useEffect(() => {
    if (account?.username) {
      setHostName(account.username);
      setPlayerName(account.username);
    }
  }, [account]);

  const handleAvatarSelect = (id: string) => {
    setAvatarId(id);
    saveAvatarId(id);
  };

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const rejoinRoom = useRejoinRoom();
  const { refetch: fetchRoom } = useGetRoomByInviteCode(inviteCode, {
    query: { enabled: false, queryKey: getGetRoomByInviteCodeQueryKey(inviteCode) },
  });

  // Validate the saved session — clear it if the game is finished or the room is gone
  useEffect(() => {
    const session = getSession();
    if (!session) return;
    getGameState(session.roomId, { sessionToken: session.sessionToken })
      .then((state) => {
        if (state.status === "finished") {
          clearSession();
          setActiveSession(null);
        }
      })
      .catch(() => {
        clearSession();
        setActiveSession(null);
      });
  }, []);

  const accountToken = getAccountToken();

  const handleCreate = async () => {
    const name = account?.username ?? hostName;
    if (!name.trim()) return;
    try {
      const res = await createRoom.mutateAsync({
        data: { hostName: name, maxPlayers, turnTimerSeconds: parseInt(turnTimer) || null, avatarId },
        ...(accountToken ? { headers: { Authorization: `Bearer ${accountToken}` } } : {}),
      });
      saveSession({
        roomId: res.room.id,
        inviteCode: res.room.inviteCode,
        playerId: res.player.id,
        sessionToken: res.sessionToken,
        playerName: res.player.name,
        isHost: true,
        avatarId,
      });
      setLocation(`/lobby/${res.room.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ variant: "destructive", title: "Error creating room", description: msg });
    }
  };

  const handleJoin = async () => {
    const name = account?.username ?? playerName;
    if (!name.trim() || !inviteCode.trim()) return;
    try {
      const { data: roomInfo } = await fetchRoom();
      if (!roomInfo) throw new Error("Room not found");
      const isPlaying = roomInfo.status !== "lobby";
      const alreadyMember = roomInfo.players?.some(
        (p) => !p.isAi && p.name.toLowerCase() === name.trim().toLowerCase(),
      );
      const res =
        isPlaying || alreadyMember
          ? await rejoinRoom.mutateAsync({ roomId: roomInfo.id, data: { playerName: name } })
          : await joinRoom.mutateAsync({ roomId: roomInfo.id, data: { playerName: name, avatarId } });
      saveSession({
        roomId: res.room.id,
        inviteCode: res.room.inviteCode,
        playerId: res.player.id,
        sessionToken: res.sessionToken,
        playerName: res.player.name,
        isHost: res.player.isHost,
        avatarId,
      });
      if (res.room.status !== "lobby") setLocation(`/game/${res.room.id}`);
      else setLocation(`/lobby/${res.room.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ variant: "destructive", title: "Error joining room", description: msg });
    }
  };

  const handleRejoin = async () => {
    const session = getSession();
    if (!session || !session.roomId || !session.sessionToken) {
      setMode("join");
      return;
    }
    try {
      const state = await getGameState(session.roomId, { sessionToken: session.sessionToken });
      if (state.status === "finished") {
        clearSession();
        setActiveSession(null);
        toast({ title: "Game already ended", description: "That session has been cleared." });
        return;
      }
      setLocation(state.status === "playing" ? `/game/${session.roomId}` : `/lobby/${session.roomId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ variant: "destructive", title: "Couldn't rejoin", description: msg });
    }
  };

  const hasSavedSession = !!activeSession?.roomId && !!activeSession?.sessionToken;

  // Show loading state while checking account
  if (accountLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Cosmic background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `url(${backgroundCosmos})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 bg-background/75 pointer-events-none" />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.5) 0%, transparent 55%)" }}
      />

      {/* Logo area */}
      <div className="relative z-10 flex-none pt-[116px] pb-4 flex flex-col items-center gap-3">
        <style>{`
          @keyframes home-shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .home-luminae-title {
            font-family: 'Cinzel Decorative', 'Cinzel', serif;
            font-weight: 900;
            letter-spacing: 0.15em;
            line-height: 1;
            margin: 0;
            color: transparent;
            background: linear-gradient(105deg,
              #06060f  0%, #06060f  6%,
              #ff9070 10%, #FF6B52 13%, #ff9070 16%,
              #06060f 20%, #06060f 27%,
              #ffe08a 31%, #FFC43D 34%, #ffe08a 37%,
              #06060f 41%, #06060f 48%,
              #50e890 52%, #2ECC71 55%, #50e890 58%,
              #06060f 62%, #06060f 69%,
              #8090ff 73%, #607AFF 76%, #8090ff 79%,
              #06060f 83%, #06060f 87%,
              #5c20b8 91%, #7028d0 93%, #5c20b8 95%,
              #06060f 99%, #06060f 100%
            );
            background-size: 400% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: home-shimmer 50s linear infinite;
            filter: drop-shadow(0 0 1px rgba(255,255,255,0.8))
                    drop-shadow(0 0 18px rgba(160,140,255,0.3))
                    drop-shadow(0 0 40px rgba(100,80,180,0.15));
          }
        `}</style>
        <motion.h1
          className="home-luminae-title text-5xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        >
          LUMINAE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="text-muted-foreground text-sm tracking-wide"
        >
          Harness affinities. Forge artifacts. Shape the cosmos.
        </motion.p>

        {/* Avatar selector — shown for guest modes */}
        {mode !== "auth" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="w-full max-w-sm px-5"
          >
            <button
              type="button"
              onClick={() => setShowAvatarPicker((v) => !v)}
              className="w-full flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 backdrop-blur px-3 py-2.5 hover:border-border transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2"
                style={{ borderColor: `${getAvatarForPlayer(avatarId).accent}88` }}
              >
                <img src={getAvatarForPlayer(avatarId).image} alt="" className="w-full h-full object-cover" draggable={false} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your avatar</div>
                <div className="text-sm font-semibold truncate">{getAvatarForPlayer(avatarId).name}</div>
              </div>
              {showAvatarPicker ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
            <AnimatePresence>
              {showAvatarPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <AvatarPicker selectedId={avatarId} onSelect={(id) => { handleAvatarSelect(id); setShowAvatarPicker(false); }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col px-5 pb-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {mode === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 max-w-sm mx-auto w-full"
            >
              {/* Resume session banner */}
              {activeSession && (
                <div className="rounded-2xl border border-primary/40 bg-primary/10 backdrop-blur p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-primary font-semibold uppercase tracking-wider mb-0.5">Active game</div>
                    <div className="font-bold text-sm">{activeSession.playerName}</div>
                  </div>
                  <Button size="sm" className="shrink-0" onClick={handleRejoin} disabled={!hasSavedSession}>
                    Resume <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              )}

              {/* Quick game actions */}
              <Button
                size="lg"
                className="w-full h-16 text-lg font-bold rounded-2xl gap-3"
                onClick={() => setMode("create")}
              >
                <Plus className="h-5 w-5" />
                Quick Game — Create
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full h-16 text-lg font-bold rounded-2xl gap-3"
                onClick={() => setMode("join")}
              >
                <Users className="h-5 w-5" />
                Join Game
              </Button>

              {/* Tutorial */}
              <button
                type="button"
                onClick={() => {
                  const saved = loadTutorialProgress();
                  setTutorialHasProgress(saved !== null);
                  setTutorialSavedBeat(saved);
                  setShowTutorialModal(true);
                }}
                className="w-full flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 backdrop-blur px-5 py-3.5 text-left hover:border-border/70 hover:bg-card/60 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {tutorialCompleted ? "Replay Tutorial" : tutorialSeen ? "Continue Tutorial" : "New? Try the Tutorial"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {tutorialCompleted
                      ? "You've already completed the tutorial — jump straight in?"
                      : tutorialSeen
                        ? "Pick up where you left off with Lumii"
                        : "Guide your civilization to legend — harvest, forge, summon, ascend"}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              {/* Account CTA — guest vs signed-in */}
              {account ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-0.5">Signed in</div>
                    <div className="font-bold text-sm truncate">{account.username}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-xl gap-1.5 text-xs border-primary/30 hover:bg-primary/20"
                      onClick={() => setLocation("/dashboard")}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Dashboard
                    </Button>
                    {confirmLogout ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-9 rounded-xl gap-1.5 text-xs"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign out
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl p-0 text-muted-foreground"
                          onClick={() => setConfirmLogout(false)}
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 rounded-xl gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
                        onClick={() => setConfirmLogout(true)}
                        title="Sign out"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Save progress & play with friends
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create a free account to resume games across sessions, track active games, and challenge friends directly.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm rounded-xl gap-1.5"
                      onClick={() => setMode("auth")}
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Sign In
                    </Button>
                    <Button
                      className="flex-1 h-10 text-sm rounded-xl gap-1.5 bg-primary/80 hover:bg-primary"
                      onClick={() => setMode("auth")}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Create Account
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {mode === "auth" && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-5 max-w-sm mx-auto w-full"
            >
              <button
                type="button"
                onClick={() => setMode("home")}
                className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors self-start"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-serif font-bold">Account</h2>
              <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur p-5">
                <LoginRegisterForm onSuccess={() => setMode("home")} />
              </div>
            </motion.div>
          )}

          {mode === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-5 max-w-sm mx-auto w-full"
            >
              <button
                type="button"
                onClick={() => setMode("home")}
                className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors self-start"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-serif font-bold">New Game</h2>

              {!account && (
                <div className="space-y-1.5">
                  <Label htmlFor="hostName" className="text-sm font-medium">Your name</Label>
                  <Input
                    id="hostName"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Stargazer"
                    className="h-13 text-base bg-input/60 rounded-xl"
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
              )}

              {account && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                  Playing as <span className="font-bold text-primary">{account.username}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Players: {maxPlayers}</Label>
                <div className="flex gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxPlayers(n)}
                      className={`flex-1 h-12 rounded-xl font-bold text-base border transition-colors ${maxPlayers === n ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/60 border-border text-muted-foreground"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="turnTimer" className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Turn timer
                </Label>
                <Select value={turnTimer} onValueChange={setTurnTimer}>
                  <SelectTrigger id="turnTimer" className="h-13 text-base bg-input/60 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No timer</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                    <SelectItem value="90">90 seconds</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full h-14 text-lg font-bold rounded-2xl mt-2"
                onClick={handleCreate}
                disabled={(!account && !hostName.trim()) || createRoom.isPending}
              >
                {createRoom.isPending ? "Creating..." : "Create Room"}
              </Button>
            </motion.div>
          )}

          {mode === "join" && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-5 max-w-sm mx-auto w-full"
            >
              <button
                type="button"
                onClick={() => setMode("home")}
                className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors self-start"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-serif font-bold">Join Game</h2>

              <div className="space-y-1.5">
                <Label htmlFor="inviteCode" className="text-sm font-medium">Invite code</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="8-character code"
                  className="h-13 text-center text-xl font-mono tracking-[0.3em] bg-input/60 rounded-xl uppercase"
                  maxLength={8}
                />
              </div>

              {!account && (
                <div className="space-y-1.5">
                  <Label htmlFor="playerName" className="text-sm font-medium">Your name</Label>
                  <Input
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Void Walker"
                    className="h-13 text-base bg-input/60 rounded-xl"
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  />
                </div>
              )}

              {account && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                  Joining as <span className="font-bold text-primary">{account.username}</span>
                </div>
              )}

              <Button
                className="w-full h-14 text-lg font-bold rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground mt-2"
                onClick={handleJoin}
                disabled={(!account && !playerName.trim()) || inviteCode.length < 8 || joinRoom.isPending}
              >
                {joinRoom.isPending ? "Joining..." : "Enter Game"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showTutorialModal && (
        <TutorialStartModal
          hasProgress={tutorialHasProgress}
          savedBeat={tutorialSavedBeat ?? undefined}
          totalBeats={TUTORIAL_BEATS.length}
          onChoice={handleTutorialChoice}
        />
      )}

      {showCinematic && (
        <ThresholdCinematic onComplete={handleCinematicComplete} />
      )}

      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => setLocation("/dev/card-browser")}
          className="absolute bottom-3 right-3 z-50 text-[10px] font-mono tracking-wider text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors px-2 py-1 rounded border border-transparent hover:border-border/30"
        >
          dev: card browser
        </button>
      )}
    </div>
  );
}
