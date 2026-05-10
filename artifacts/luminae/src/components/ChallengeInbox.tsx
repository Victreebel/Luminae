import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import {
  apiListChallenges,
  apiRespondChallenge,
  type Challenge,
  type ChallengeAccepted,
} from "@/lib/accountSession";
import { saveSession } from "@/lib/session";
import { Swords, X, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Props {
  onWebSocketChallenge?: (challenge: Challenge) => void;
}

export function ChallengeInbox({ onWebSocketChallenge: _ws }: Props) {
  const { token, account } = useAccount();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchChallenges = useCallback(async () => {
    if (!token) return;
    try {
      const c = await apiListChallenges(token);
      setChallenges(c);
    } catch {
      // silently fail
    }
  }, [token]);

  // Poll every 20 seconds for new challenges
  useEffect(() => {
    if (!token) return;
    void fetchChallenges();
    pollingRef.current = setInterval(() => void fetchChallenges(), 20000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, fetchChallenges]);

  const handleRespond = async (challenge: Challenge, action: "accept" | "decline") => {
    if (!token) return;
    setRespondingId(challenge.id);
    try {
      const result = await apiRespondChallenge(token, challenge.id, action);
      if (action === "accept" && "sessionToken" in result) {
        const accepted = result as ChallengeAccepted;
        // Save session and navigate into the lobby
        saveSession({
          roomId: accepted.room.id,
          inviteCode: accepted.room.inviteCode,
          playerId: accepted.player.id,
          sessionToken: accepted.sessionToken,
          playerName: account?.username ?? "Player",
          isHost: false,
        });
        toast({ title: "Challenge accepted!", description: `Joining room ${accepted.room.inviteCode}` });
        setIsOpen(false);
        setLocation(`/lobby/${accepted.room.id}`);
      } else {
        toast({ title: "Challenge declined" });
      }
      setChallenges((prev) => prev.filter((c) => c.id !== challenge.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setRespondingId(null);
    }
  };

  if (!token) return null;

  const count = challenges.length;

  return (
    <>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-secondary transition-colors"
        aria-label="Challenge inbox"
      >
        <Swords className="h-5 w-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-80 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <h3 className="font-bold flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  Challenges
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {challenges.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No pending challenges
                  </p>
                ) : (
                  challenges.map((c) => {
                    const expiresIn = Math.max(
                      0,
                      Math.round((new Date(c.expiresAt).getTime() - Date.now()) / 60000),
                    );
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-border/40 bg-secondary/30 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold shrink-0">
                            {c.challengerUsername[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{c.challengerUsername}</div>
                            <div className="text-xs text-muted-foreground">
                              Challenges you to a game
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Room: <span className="font-mono">{c.inviteCode}</span> · Expires in {expiresIn}m
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs rounded-lg gap-1"
                            onClick={() => handleRespond(c, "accept")}
                            disabled={!!respondingId}
                          >
                            {respondingId === c.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Accept
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 h-8 text-xs rounded-lg gap-1"
                            onClick={() => handleRespond(c, "decline")}
                            disabled={!!respondingId}
                          >
                            <X className="h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
