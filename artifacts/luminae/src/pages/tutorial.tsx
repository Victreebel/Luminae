import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useCreateRoom,
  useStartGame,
  useAddAiPlayer,
} from "@workspace/api-client-react";
import { saveSession, getSession, clearSession } from "@/lib/session";
import { getSavedAvatarId } from "@/lib/avatars";
import { getAccountToken } from "@/lib/accountSession";
import { useAccount } from "@/contexts/AccountContext";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
const gemIcon = "/icon_gem.svg";

type Phase = "idle" | "creating" | "adding_ai" | "starting" | "error";

export default function Tutorial() {
  const [, setLocation] = useLocation();
  const { account } = useAccount();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const createRoom = useCreateRoom();
  const addAiPlayer = useAddAiPlayer();
  const startGame = useStartGame();

  useEffect(() => {
    let cancelled = false;

    const createFreshRoom = async () => {
      const avatarId = getSavedAvatarId();
      const accountToken = getAccountToken();
      const hostName = account?.username ?? "Traveler";

      setPhase("creating");
      let roomRes;
      try {
        roomRes = await createRoom.mutateAsync({
          data: { hostName, maxPlayers: 2, turnTimerSeconds: null, avatarId },
          ...(accountToken ? { headers: { Authorization: `Bearer ${accountToken}` } } : {}),
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Could not create room");
          setPhase("error");
        }
        return;
      }

      const { room, player, sessionToken } = roomRes;
      saveSession({
        roomId: room.id,
        inviteCode: room.inviteCode,
        playerId: player.id,
        sessionToken,
        playerName: player.name,
        isHost: true,
        avatarId,
        isTutorial: true,
      });

      setPhase("adding_ai");
      try {
        await addAiPlayer.mutateAsync({
          roomId: room.id,
          data: { sessionToken, difficulty: "easy" },
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Could not add AI player");
          setPhase("error");
        }
        return;
      }

      setPhase("starting");
      try {
        await startGame.mutateAsync({
          roomId: room.id,
          data: { sessionToken },
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Could not start game");
          setPhase("error");
        }
        return;
      }

      if (!localStorage.getItem("luminae_hints_enabled")) {
        localStorage.setItem("luminae_hints_enabled", "1");
      }

      if (!cancelled) {
        setLocation(`/game/${room.id}?tutorial=1`);
      }
    };

    const run = async () => {
      // If we already have a session for a tutorial game, verify the room is
      // still alive before redirecting. If it has expired, clear it and create
      // a fresh one transparently.
      const existing = getSession();
      if (existing?.roomId && existing.isTutorial) {
        try {
          const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
          const res = await fetch(
            `${base}/api/rooms/${existing.roomId}/state?sessionToken=${encodeURIComponent(existing.sessionToken)}`
          );
          if (res.ok) {
            if (!cancelled) setLocation(`/game/${existing.roomId}?tutorial=1`);
            return;
          }
        } catch {
          // Network error — fall through and create a fresh room
        }
        // Room is gone or session is invalid — discard and start fresh
        clearSession();
      }

      await createFreshRoom();
    };

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const PHASE_LABELS: Record<Phase, string> = {
    idle: "Preparing tutorial…",
    creating: "Creating your tutorial room…",
    adding_ai: "Summoning an AI opponent…",
    starting: "Starting the game…",
    error: "Something went wrong",
  };

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundCosmos})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-background/80 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-sm">
        <img
          src={gemIcon}
          alt=""
          className="w-14 h-14 drop-shadow-[0_0_28px_rgba(80,130,255,0.55)] animate-pulse"
          draggable={false}
        />
        <div>
          <h1 className="text-2xl font-serif font-bold mb-2">Tutorial</h1>
          <p className="text-muted-foreground text-sm">
            {phase === "error" ? errorMsg : PHASE_LABELS[phase]}
          </p>
        </div>

        {phase !== "error" && (
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}

        {phase === "error" && (
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Back to Home
          </button>
        )}
      </div>
    </div>
  );
}
