import { useState, useEffect, useCallback } from "react";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { useLocation } from "wouter";
import { apiUrl } from "@/lib/network";
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
  ApiError,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveSession, getSession, clearSession } from "@/lib/session";
import { getAccountToken, type ActiveGame } from "@/lib/accountSession";
import { getGameState } from "@workspace/api-client-react";
import {
  DEFAULT_VICTORY_REQUIREMENT,
  VICTORY_REQUIREMENT_OPTIONS,
  type VictoryRequirementOption,
} from "@workspace/game-types";
import { getSavedAvatarId, saveAvatarId, getAvatarForPlayer } from "@/lib/avatars";
import { AvatarPicker } from "@/components/AvatarPicker";
import { LoginRegisterForm } from "@/components/LoginRegisterForm";
import { useAccount } from "@/contexts/AccountContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  Clock,
  ChevronDown,
  LogIn,
  UserPlus,
  LayoutDashboard,
  LogOut,
  X,
  BookOpen,
  Play,
  Hash,
  ShieldCheck,
} from "lucide-react";
import {
  LuminaeWordmark,
  OutOfMatchBackdrop,
  OutOfMatchHeader,
  OutOfMatchSectionHeading,
} from "@/components/out-of-match/OutOfMatchChrome";
import { EminenceSigil } from "@/components/EminenceSigil";
import flareAffinity from "@/assets/affinity/home/flare.png";
import radianceAffinity from "@/assets/affinity/home/radiance.png";
import verdanceAffinity from "@/assets/affinity/home/verdance.png";
import continuumAffinity from "@/assets/affinity/home/continuum.png";
import abyssAffinity from "@/assets/affinity/home/abyss.png";
import tierOneArtifact from "@/assets/cards/runtime/t1p01.webp";
import tierTwoArtifact from "@/assets/cards/runtime/t2p01.webp";
import tierThreeArtifact from "@/assets/cards/runtime/t3p01.webp";

type Mode = "home" | "create" | "join" | "auth";

const HOME_AFFINITIES = [
  { name: "Flare", image: flareAffinity, glow: "#FF8A6A" },
  { name: "Radiance", image: radianceAffinity, glow: "#F5E8B8" },
  { name: "Verdance", image: verdanceAffinity, glow: "#5BE197" },
  { name: "Continuum", image: continuumAffinity, glow: "#7090FF" },
  { name: "Abyss", image: abyssAffinity, glow: "#CC70F0" },
] as const;
const HOME_ARTIFACT_TIERS = [
  { tier: "I", image: tierOneArtifact, width: 20, height: 28, border: "#82A9B9" },
  { tier: "II", image: tierTwoArtifact, width: 23, height: 32, border: "#D8C079" },
  { tier: "III", image: tierThreeArtifact, width: 26, height: 36, border: "#B895EA" },
] as const;

function MatchIdentitySelector({
  avatarId,
  expanded,
  onToggle,
  onSelect,
}: {
  avatarId: string;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  const avatar = getAvatarForPlayer(avatarId);

  return (
    <div className="space-y-2">
      <Label>Player identity</Label>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`Change player identity. Current identity: ${avatar.name}`}
        className="flex w-full items-center gap-3 rounded-md border border-border/40 bg-input/40 px-3 py-2.5 text-left transition-colors hover:border-primary/35 hover:bg-input/60"
      >
        <span
          className="h-10 w-10 shrink-0 overflow-hidden rounded-md border"
          style={{ borderColor: `${avatar.accent}88` }}
        >
          <img src={avatar.image} alt="" className="h-full w-full object-cover" draggable={false} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{avatar.name}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">Your presence at this table</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <AvatarPicker selectedId={avatarId} onSelect={onSelect} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const [activeSession, setActiveSession] = useState(() => getSession());
  const [mode, setMode] = useState<Mode>("home");
  const [avatarId, setAvatarId] = useState(() => getSavedAvatarId());
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [matchMode, setMatchMode] = useState<"standard" | "custom">("standard");
  const [victoryRequirement, setVictoryRequirement] = useState<VictoryRequirementOption>(
    DEFAULT_VICTORY_REQUIREMENT,
  );
  const [turnTimer, setTurnTimer] = useState<string>("0");
  const [playerName, setPlayerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    setShowAvatarPicker(false);
  }, [mode]);

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

  useEscapeToClose([
    { isOpen: showCinematic, onClose: () => setShowCinematic(false) },
    { isOpen: showTutorialModal, onClose: () => setShowTutorialModal(false) },
    { isOpen: showAvatarPicker, onClose: () => setShowAvatarPicker(false) },
    { isOpen: confirmLogout, onClose: () => setConfirmLogout(false) },
  ]);

  useEffect(() => {
    if (accountLoading || !account || !token) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("newgame") === "1" || params.get("menu") === "1") return;

    fetch(apiUrl("/auth/me/games"), { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data: { games?: ActiveGame[] }) => {
        const games = data.games ?? [];
        if (games.length === 0) return;
        const playingGames = games.filter((game) => game.status === "playing");
        if (games.length === 1 && playingGames.length === 1) {
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
          setLocation("/dashboard");
        }
      })
      .catch(() => {
        // A dashboard redirect is optional; the menu remains usable offline.
      });
  }, [account, token, accountLoading, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) {
      setInviteCode(code.toUpperCase());
      setMode("join");
    }
  }, []);

  useEffect(() => {
    if (account?.username) {
      setHostName(account.username);
      setPlayerName(account.username);
    }
  }, [account]);

  const blueprintCleared = account?.clearance?.status === "cleared";

  useEffect(() => {
    if (!blueprintCleared) setMatchMode("standard");
  }, [blueprintCleared]);

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
      .catch((error: { status?: number }) => {
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          clearSession();
          setActiveSession(null);
        }
      });
  }, []);

  const accountToken = getAccountToken();

  const handleCreate = async () => {
    const name = account?.username ?? hostName;
    if (!name.trim()) return;
    try {
      const response = await createRoom.mutateAsync({
        data: {
          hostName: name,
          maxPlayers,
          victoryRequirement,
          cinematicMode: "standard",
          turnTimerSeconds: parseInt(turnTimer) || null,
          avatarId,
          gameMode: matchMode,
          blueprintPolicy: matchMode === "custom" ? "owned" : "none",
        },
        ...(accountToken ? { headers: { Authorization: `Bearer ${accountToken}` } } : {}),
      });
      saveSession({
        roomId: response.room.id,
        inviteCode: response.room.inviteCode,
        playerId: response.player.id,
        sessionToken: response.sessionToken,
        playerName: response.player.name,
        isHost: true,
        avatarId: response.player.avatarId ?? undefined,
      });
      setLocation(`/lobby/${response.room.id}`);
    } catch (error: unknown) {
      const message = error instanceof ApiError
        ? (error.data as { error?: string } | null)?.error ?? error.message
        : error instanceof Error ? error.message : "An error occurred";
      toast({ variant: "destructive", title: "Error creating room", description: message });
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
        (player) => !player.isAi && player.name.toLowerCase() === name.trim().toLowerCase(),
      );
      const response = isPlaying || alreadyMember
        ? await rejoinRoom.mutateAsync({ roomId: roomInfo.id, data: { playerName: name } })
        : await joinRoom.mutateAsync({ roomId: roomInfo.id, data: { playerName: name, avatarId } });
      saveSession({
        roomId: response.room.id,
        inviteCode: response.room.inviteCode,
        playerId: response.player.id,
        sessionToken: response.sessionToken,
        playerName: response.player.name,
        isHost: response.player.isHost,
        avatarId: response.player.avatarId ?? undefined,
      });
      setLocation(response.room.status !== "lobby" ? `/game/${response.room.id}` : `/lobby/${response.room.id}`);
    } catch (error: unknown) {
      const message = error instanceof ApiError
        ? (error.data as { error?: string } | null)?.error ?? error.message
        : error instanceof Error ? error.message : "An error occurred";
      toast({ variant: "destructive", title: "Error joining room", description: message });
    }
  };

  const handleRejoin = async () => {
    const session = getSession();
    if (!session?.roomId || !session.sessionToken) {
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
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Couldn't rejoin",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const hasSavedSession = !!activeSession?.roomId && !!activeSession?.sessionToken;

  if (accountLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openTutorial = () => {
    const saved = loadTutorialProgress();
    const hasMidProgress = saved !== null && saved > 0 && saved < TUTORIAL_BEATS.length - 1;
    setTutorialHasProgress(hasMidProgress);
    setTutorialSavedBeat(hasMidProgress ? saved : null);
    setShowTutorialModal(true);
  };

  return (
    <div className="oom-shell h-[100dvh] overflow-hidden flex flex-col">
      <OutOfMatchBackdrop />
      <OutOfMatchHeader
        center={<span className="hidden sm:block oom-kicker !mb-0">Main Menu</span>}
        right={account ? (
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            aria-label={`Open Command Center for ${account.username}`}
            title="Open Command Center"
            className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-foreground/85 hover:bg-white/[0.07]"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-primary" />
            <span className="hidden max-w-[160px] truncate sm:block">{account.username}</span>
          </button>
        ) : (
          <button type="button" onClick={() => setMode("auth")} className="oom-icon-button" aria-label="Sign in" title="Sign in">
            <LogIn className="h-4 w-4" />
          </button>
        )}
      />

      <main className="oom-frame oom-home-main flex min-h-0 flex-1 flex-col overflow-y-auto py-5 sm:py-8">
        <div className="oom-home-layout grid flex-1 items-center gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(400px,520px)] lg:gap-12">
          <section className="oom-home-hero min-w-0 w-full px-2 py-4 text-center lg:px-4 lg:text-left">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="oom-kicker">
              Cosmic civilization strategy
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="m-0 flex justify-center lg:justify-start"
            >
              <LuminaeWordmark className="oom-wordmark--hero" />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08 }}
              className="oom-hero-motto mt-4"
            >
              Harness | Forge | Ascend
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.28 }}
              className="oom-home-teaching mx-auto mt-3 flex max-w-lg flex-col items-center gap-1.5 text-sm text-foreground/75 lg:mx-0 lg:items-start lg:gap-2 lg:text-[15px]"
            >
              <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:justify-start">
                <span>Harness cosmic Affinities</span>
                <span className="inline-flex items-center gap-0.5 whitespace-nowrap" role="img" aria-label="Flare, Radiance, Verdance, Continuum, and Abyss affinity tokens">
                  {HOME_AFFINITIES.map((affinity) => (
                    <img key={affinity.name} src={affinity.image} alt="" aria-hidden="true" className="oom-home-affinity-icon h-[17px] w-[17px] object-contain lg:h-[19px] lg:w-[19px]" />
                  ))}
                </span>
              </p>
              <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:justify-start">
                <span>Forge more powerful artifacts</span>
                <span className="inline-flex h-[33px] items-end gap-1.5 whitespace-nowrap lg:h-[37px]" role="img" aria-label="Tier I, Tier II, and Tier III Artifact progression">
                  {HOME_ARTIFACT_TIERS.map((artifact) => (
                    <span
                      key={artifact.tier}
                      aria-hidden="true"
                      className="relative origin-bottom shrink-0 overflow-hidden rounded-[3px] bg-black/60 lg:scale-110"
                      style={{
                        width: artifact.width,
                        height: artifact.height,
                        border: `1px solid ${artifact.border}`,
                        boxShadow: `0 0 6px ${artifact.border}44, 0 2px 4px rgba(0,0,0,0.75)`,
                      }}
                    >
                      <img src={artifact.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
                      <span className="absolute inset-[1px] rounded-[2px] border border-white/15" />
                      <span className="absolute inset-x-0 bottom-[1px] text-center font-serif text-[7px] font-bold leading-none text-white drop-shadow-sm">{artifact.tier}</span>
                    </span>
                  ))}
                </span>
              </p>
              <p
                className="oom-eminence-teaching-line m-0 flex items-center justify-center gap-2 font-medium text-[#E4C982] lg:justify-start"
                role="img"
                aria-label={`Gain ${DEFAULT_VICTORY_REQUIREMENT} Eminence to Ascend to Legend`}
              >
                <span>Gain Eminence</span>
                <span className="origin-center drop-shadow-[0_0_7px_rgba(231,188,82,0.28)] lg:scale-110" aria-hidden="true">
                  <EminenceSigil
                    size={32}
                    value={DEFAULT_VICTORY_REQUIREMENT}
                    target={DEFAULT_VICTORY_REQUIREMENT}
                  />
                </span>
                <span>Ascend to Legend</span>
              </p>
            </motion.div>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="oom-panel oom-home-command-panel min-w-0 w-full p-4 sm:p-5"
            data-testid="home-command-panel"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mode === "home" && (
                <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="oom-home-command-content space-y-3">
                  <OutOfMatchSectionHeading eyebrow="Command" title="Play Luminae" detail={account ? "Signed in" : "Guest play"} />

                  {activeSession && (
                    <button
                      type="button"
                      onClick={handleRejoin}
                      disabled={!hasSavedSession}
                      className="w-full rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-left transition-colors hover:bg-primary/16 disabled:opacity-50"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Continue match</span>
                          <span className="mt-1 block truncate text-sm font-semibold text-foreground">{activeSession.playerName}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary">
                          Resume <ArrowRight className="h-4 w-4" />
                        </span>
                      </span>
                    </button>
                  )}

                  <div className="oom-home-primary-actions grid gap-3 sm:grid-cols-2">
                    <button type="button" className="oom-action-primary" onClick={() => setMode("create")}>
                      <Play className="h-4 w-4 fill-current" />
                      New Match
                    </button>
                    <button type="button" className="oom-action-secondary" onClick={() => setMode("join")}>
                      <Hash className="h-4 w-4" />
                      Join with Code
                    </button>
                  </div>

                  <div className="oom-divider" />

                  <button
                    type="button"
                    onClick={openTutorial}
                    className="oom-home-tutorial-action flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {tutorialCompleted ? "Replay Tutorial" : tutorialSeen ? "Continue Tutorial" : "Learn with Lumii"}
                      </span>
                      <span className="oom-home-action-detail mt-0.5 block text-xs text-muted-foreground">
                        {tutorialCompleted ? "Practice the four core actions again" : tutorialSeen ? "Pick up where you left off" : "Practice the four core actions with Lumii"}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>

                  <div className="oom-divider" />

                  {account ? (
                    <div className="oom-home-account-action flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2.5">
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Signed in</span>
                        <span className="block truncate text-sm font-semibold">{account.username}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="sm" variant="outline" className="h-9 rounded-md gap-1.5" onClick={() => setLocation("/dashboard")}>
                          <LayoutDashboard className="h-3.5 w-3.5" /> Command
                        </Button>
                        {confirmLogout ? (
                          <>
                            <Button size="sm" variant="destructive" className="h-9 rounded-md" onClick={handleLogout}>Sign out</Button>
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-md" onClick={() => setConfirmLogout(false)} title="Cancel">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-md text-muted-foreground" onClick={() => setConfirmLogout(true)} title="Sign out">
                            <LogOut className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setMode("auth")} className="oom-home-account-action flex w-full items-center justify-between rounded-lg bg-black/20 px-3 py-2.5 text-left hover:bg-black/30">
                      <span>
                        <span className="block text-sm font-semibold">Create a free account</span>
                        <span className="oom-home-action-detail block text-xs text-muted-foreground">Keep games, history, and cosmetics together</span>
                      </span>
                      <UserPlus className="h-4 w-4 text-primary" />
                    </button>
                  )}
                </motion.div>
              )}

              {mode === "create" && (
                <motion.div key="create" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                  <div className="flex items-center gap-3">
                    <button type="button" className="oom-icon-button" onClick={() => setMode("home")} title="Back">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <OutOfMatchSectionHeading eyebrow="Match setup" title="Create a Lobby" detail={`${maxPlayers} players · ${matchMode === "custom" ? "Blueprint Custom" : "Standard"}`} />
                    </div>
                  </div>

                  {!account ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="hostName">Your name</Label>
                      <Input id="hostName" value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="e.g. Stargazer" className="h-12 rounded-md bg-input/60" onKeyDown={(event) => event.key === "Enter" && handleCreate()} />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-primary/25 bg-primary/8 px-3 py-2.5 text-sm">
                      Playing as <span className="font-bold text-primary">{account.username}</span>
                    </div>
                  )}

                  <MatchIdentitySelector
                    avatarId={avatarId}
                    expanded={showAvatarPicker}
                    onToggle={() => setShowAvatarPicker((open) => !open)}
                    onSelect={(id) => {
                      handleAvatarSelect(id);
                      setShowAvatarPicker(false);
                    }}
                  />

                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <div className="oom-segmented" aria-label="Match mode">
                      <button
                        type="button"
                        data-active={matchMode === "standard"}
                        onClick={() => {
                          setMatchMode("standard");
                          setVictoryRequirement(DEFAULT_VICTORY_REQUIREMENT);
                        }}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Standard
                      </button>
                      {blueprintCleared && (
                        <button
                          type="button"
                          data-active={matchMode === "custom"}
                          onClick={() => setMatchMode("custom")}
                          title="Use your Custom Blueprint loadout"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Blueprint Custom
                        </button>
                      )}
                    </div>
                    {blueprintCleared && (
                      <p className="text-xs text-muted-foreground">Uses each player’s two-slot Custom loadout.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Players</Label>
                    <div className="oom-segmented">
                      {[2, 3, 4].map((count) => (
                        <button key={count} type="button" data-active={maxPlayers === count} onClick={() => setMaxPlayers(count)}>{count}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Eminence to win</Label>
                    {matchMode === "custom" ? (
                      <>
                        <div className="oom-segmented" aria-label="Custom Eminence target">
                          {VICTORY_REQUIREMENT_OPTIONS.map((target) => (
                            <button key={target} type="button" data-active={victoryRequirement === target} onClick={() => setVictoryRequirement(target)}>{target}</button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {victoryRequirement === 15 ? "Quick custom match" : victoryRequirement === 20 ? "Standard length" : "Epic custom match"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-foreground">
                        {DEFAULT_VICTORY_REQUIREMENT} Eminence <span className="font-normal text-muted-foreground">· Standard match</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="turnTimer" className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Turn timer</Label>
                    <Select value={turnTimer} onValueChange={setTurnTimer}>
                      <SelectTrigger id="turnTimer" className="h-12 rounded-md bg-input/60"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No timer</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                        <SelectItem value="90">90 seconds</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <button type="button" className="oom-action-primary" onClick={handleCreate} disabled={(!account && !hostName.trim()) || createRoom.isPending}>
                    <Plus className="h-4 w-4" />
                    {createRoom.isPending
                      ? "Creating Lobby..."
                      : matchMode === "custom"
                        ? "Create Blueprint Lobby"
                        : "Create Lobby"}
                  </button>
                </motion.div>
              )}

              {mode === "join" && (
                <motion.div key="join" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                  <div className="flex items-center gap-3">
                    <button type="button" className="oom-icon-button" onClick={() => setMode("home")} title="Back">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <OutOfMatchSectionHeading eyebrow="Invitation" title="Join a Match" detail="8-character code" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inviteCode">Invite code</Label>
                    <Input id="inviteCode" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="XXXXXXXX" className="h-14 rounded-md bg-input/60 text-center font-mono text-xl tracking-[0.26em] uppercase" maxLength={8} />
                  </div>

                  {!account ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="playerName">Your name</Label>
                      <Input id="playerName" value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="e.g. Void Walker" className="h-12 rounded-md bg-input/60" onKeyDown={(event) => event.key === "Enter" && handleJoin()} />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-primary/25 bg-primary/8 px-3 py-2.5 text-sm">
                      Joining as <span className="font-bold text-primary">{account.username}</span>
                    </div>
                  )}

                  <MatchIdentitySelector
                    avatarId={avatarId}
                    expanded={showAvatarPicker}
                    onToggle={() => setShowAvatarPicker((open) => !open)}
                    onSelect={(id) => {
                      handleAvatarSelect(id);
                      setShowAvatarPicker(false);
                    }}
                  />

                  <button type="button" className="oom-action-primary" onClick={handleJoin} disabled={(!account && !playerName.trim()) || inviteCode.length < 8 || joinRoom.isPending}>
                    <ArrowRight className="h-4 w-4" />
                    {joinRoom.isPending ? "Joining Match..." : "Enter Lobby"}
                  </button>
                </motion.div>
              )}

              {mode === "auth" && (
                <motion.div key="auth" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                  <div className="flex items-center gap-3">
                    <button type="button" className="oom-icon-button" onClick={() => setMode("home")} title="Back">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <OutOfMatchSectionHeading eyebrow="Luminae account" title="Keep Your Progress" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <LoginRegisterForm onSuccess={() => setMode("home")} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
        <nav className="oom-home-policies mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70" aria-label="Policies">
          <a href="/legal/privacy">Privacy</a>
          <a href="/legal/terms">Terms</a>
          <a href="/legal/conduct">Conduct</a>
          <a href="/legal/refunds">Refunds</a>
          <a href="/legal/delete-account">Account deletion</a>
        </nav>
      </main>

      {showTutorialModal && (
        <TutorialStartModal hasProgress={tutorialHasProgress} savedBeat={tutorialSavedBeat ?? undefined} totalBeats={TUTORIAL_BEATS.length} onChoice={handleTutorialChoice} />
      )}
      {showCinematic && <ThresholdCinematic onComplete={handleCinematicComplete} />}

      {import.meta.env.DEV && new URLSearchParams(window.location.search).get("dev") === "1" && (
        <div className="absolute bottom-3 right-3 z-50 hidden flex-col items-end gap-1 md:flex">
          <button type="button" onClick={() => setLocation("/dev/release-journey")} className="rounded border border-transparent px-2 py-1 font-mono text-[10px] tracking-wider text-muted-foreground/35 hover:border-border/30 hover:text-muted-foreground/70">dev: release journey</button>
          <button type="button" onClick={() => setLocation("/dev/anim-sandbox")} className="rounded border border-transparent px-2 py-1 font-mono text-[10px] tracking-wider text-muted-foreground/35 hover:border-border/30 hover:text-muted-foreground/70">dev: anim sandbox</button>
          <button type="button" onClick={() => setLocation("/dev/card-browser")} className="rounded border border-transparent px-2 py-1 font-mono text-[10px] tracking-wider text-muted-foreground/35 hover:border-border/30 hover:text-muted-foreground/70">dev: card browser</button>
        </div>
      )}
    </div>
  );
}
