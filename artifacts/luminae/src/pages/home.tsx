import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateRoom, useGetRoomByInviteCode, useJoinRoom, getGetRoomByInviteCodeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveSession, getSession } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [playerName, setPlayerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
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
      const res = await createRoom.mutateAsync({ data: { hostName, maxPlayers } });
      saveSession({
        roomId: res.room.id,
        playerId: res.player.id,
        sessionToken: res.sessionToken,
        playerName: res.player.name
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
      
      const res = await joinRoom.mutateAsync({ roomId: roomInfo.id, data: { playerName } });
      saveSession({
        roomId: res.room.id,
        playerId: res.player.id,
        sessionToken: res.sessionToken,
        playerName: res.player.name
      });
      setLocation(`/lobby/${res.room.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error joining room", description: err.message });
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, var(--color-primary) 0%, transparent 50%)' }} />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-serif font-bold tracking-tight mb-2 gem-glow text-primary">Luminae</h1>
          <p className="text-muted-foreground text-lg">A game of gems and prestige</p>
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
