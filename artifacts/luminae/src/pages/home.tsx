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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveSession, getSession } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import logoLuminae from "@assets/generated_images/logo_luminae.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [turnTimer, setTurnTimer] = useState<string>("0"); // seconds; "0" = off
  const [playerName, setPlayerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const rejoinRoom = useRejoinRoom();
  const { refetch: fetchRoom } = useGetRoomByInviteCode(inviteCode, { query: { enabled: false, queryKey: getGetRoomByInviteCodeQueryKey(inviteCode) } });

  useEffect(() => {
    const session = getSession();
    if (session) {
      // Could check if room is still valid, for now just offer rejoin via toast or UI
      toast({
        title: "Session found",
        description: "You have an active session. Rejoining...",
      });
      setLocation(`/lobby/${session.roomId}`);
    }
  }, [setLocation, toast]);

  const handleCreate = async () => {
    if (!hostName.trim()) return;
    try {
      const turnTimerSeconds = parseInt(turnTimer) || null;
      const res = await createRoom.mutateAsync({
        data: { hostName, maxPlayers, turnTimerSeconds: turnTimerSeconds ?? null },
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

      // If the room is already playing, try to reclaim an existing seat by name
      // instead of creating a new player (which would fail).
      const isPlaying = roomInfo.status !== "lobby";
      const alreadyMember = roomInfo.players?.some(
        (p) => !p.isAi && p.name.toLowerCase() === playerName.trim().toLowerCase(),
      );

      const res =
        isPlaying || alreadyMember
          ? await rejoinRoom.mutateAsync({
              roomId: roomInfo.id,
              data: { playerName },
            })
          : await joinRoom.mutateAsync({
              roomId: roomInfo.id,
              data: { playerName },
            });

      saveSession({
        roomId: res.room.id,
        inviteCode: res.room.inviteCode,
        playerId: res.player.id,
        sessionToken: res.sessionToken,
        playerName: res.player.name,
        isHost: res.player.isHost,
      });
      // If the game has already started, jump straight to the game screen.
      if (res.room.status !== "lobby") {
        setLocation(`/game/${res.room.id}`);
      } else {
        setLocation(`/lobby/${res.room.id}`);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error joining room",
        description: err.message,
      });
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundCosmos})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-background/70 pointer-events-none" />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.4) 0%, transparent 60%)',
        }}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img
            src={logoLuminae}
            alt="Luminae"
            className="mx-auto w-72 h-auto drop-shadow-[0_0_25px_rgba(255,196,61,0.35)]"
            draggable={false}
          />
          <p className="text-muted-foreground text-lg mt-2 tracking-wide">
            Forge cosmic affinities. Claim prestige.
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-xl mb-4">
            <TabsTrigger value="create" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Create Room</TabsTrigger>
            <TabsTrigger value="join" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Join Room</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Create a New Game</CardTitle>
                <CardDescription>Host a new game for 2-4 players.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hostName">Your Name</Label>
                  <Input id="hostName" value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="e.g. Master Jeweler" className="bg-input/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPlayers">Players: {maxPlayers}</Label>
                  <input type="range" id="maxPlayers" min={2} max={4} value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))} className="w-full accent-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turnTimer">Turn timer</Label>
                  <Select value={turnTimer} onValueChange={setTurnTimer}>
                    <SelectTrigger id="turnTimer" className="bg-input/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No timer (relaxed)</SelectItem>
                      <SelectItem value="30">30 seconds per turn</SelectItem>
                      <SelectItem value="60">60 seconds per turn</SelectItem>
                      <SelectItem value="90">90 seconds per turn</SelectItem>
                      <SelectItem value="120">2 minutes per turn</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Auto-pass if a player runs out of time.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleCreate} disabled={!hostName.trim() || createRoom.isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg">
                  {createRoom.isPending ? "Creating..." : "Create Room"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="join">
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Join a Game</CardTitle>
                <CardDescription>Enter an invite code to join an existing game.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input id="inviteCode" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="8-char code" className="bg-input/50 uppercase tracking-widest font-mono text-center text-xl" maxLength={8} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerName">Your Name</Label>
                  <Input id="playerName" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="e.g. Gem Seeker" className="bg-input/50" />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleJoin} disabled={!playerName.trim() || inviteCode.length < 8 || joinRoom.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 text-lg">
                  {joinRoom.isPending ? "Joining..." : "Join Game"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
