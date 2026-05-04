import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { saveSession, getSession } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, ArrowRight, Timer, Clock } from "lucide-react";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import logoLuminae from "@assets/generated_images/logo_luminae.png";

type Mode = "home" | "create" | "join";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeSession, setActiveSession] = useState(() => getSession());
  const [mode, setMode] = useState<Mode>("home");

  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [turnTimer, setTurnTimer] = useState<string>("0");
  const [playerName, setPlayerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const rejoinRoom = useRejoinRoom();
  const { refetch: fetchRoom } = useGetRoomByInviteCode(inviteCode, {
    query: { enabled: false, queryKey: getGetRoomByInviteCodeQueryKey(inviteCode) },
  });

  // Pre-fill invite code from URL ?invite= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) {
      setInviteCode(code.toUpperCase());
      setMode("join");
    }
  }, []);

  const handleCreate = async () => {
    if (!hostName.trim()) return;
    try {
      const res = await createRoom.mutateAsync({
        data: { hostName, maxPlayers, turnTimerSeconds: parseInt(turnTimer) || null },
      });
      saveSession({
        roomId: res.room.id,
        inviteCode: res.room.inviteCode,
        playerId: res.player.id,
        sessionToken: res.sessionToken,
        playerName: res.player.name,
        isHost: true,
      });
      setLocation(`/lobby/${res.room.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error creating room", description: err.message });
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim() || !inviteCode.trim()) return;
    try {
      const { data: roomInfo } = await fetchRoom();
      if (!roomInfo) throw new Error("Room not found");
      const isPlaying = roomInfo.status !== "lobby";
      const alreadyMember = roomInfo.players?.some(
        (p) => !p.isAi && p.name.toLowerCase() === playerName.trim().toLowerCase()
      );
      const res =
        isPlaying || alreadyMember
          ? await rejoinRoom.mutateAsync({ roomId: roomInfo.id, data: { playerName } })
          : await joinRoom.mutateAsync({ roomId: roomInfo.id, data: { playerName } });
      saveSession({
        roomId: res.room.id,
        inviteCode: res.room.inviteCode,
        playerId: res.player.id,
        sessionToken: res.sessionToken,
        playerName: res.player.name,
        isHost: res.player.isHost,
      });
      if (res.room.status !== "lobby") setLocation(`/game/${res.room.id}`);
      else setLocation(`/lobby/${res.room.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error joining room", description: err.message });
    }
  };

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
      <div className="relative z-10 flex-none pt-16 pb-8 flex flex-col items-center">
        <motion.img
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          src={logoLuminae}
          alt="Luminae"
          className="w-64 h-auto drop-shadow-[0_0_30px_rgba(255,196,61,0.35)]"
          draggable={false}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-sm mt-2 tracking-wide"
        >
          Forge cosmic affinities. Claim prestige.
        </motion.p>
      </div>

      {/* Main content — slides between modes */}
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
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() => setLocation(`/lobby/${activeSession.roomId}`)}
                  >
                    Resume <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              )}

              {/* Main actions */}
              <Button
                size="lg"
                className="w-full h-16 text-lg font-bold rounded-2xl gap-3"
                onClick={() => setMode("create")}
              >
                <Plus className="h-5 w-5" />
                Create Game
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
                disabled={!hostName.trim() || createRoom.isPending}
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

              <Button
                className="w-full h-14 text-lg font-bold rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground mt-2"
                onClick={handleJoin}
                disabled={!playerName.trim() || inviteCode.length < 8 || joinRoom.isPending}
              >
                {joinRoom.isPending ? "Joining..." : "Enter Game"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
