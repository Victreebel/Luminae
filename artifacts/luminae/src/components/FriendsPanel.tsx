import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/contexts/AccountContext";
import {
  apiListFriends,
  apiListFriendRequests,
  apiSendFriendRequest,
  apiRespondFriendRequest,
  apiRemoveFriend,
  apiCreateChallenge,
  type Friend,
  type FriendRequest,
} from "@/lib/accountSession";
import { Users, Bell, Search, X, Check, UserMinus, Swords, Loader2, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Tab = "friends" | "requests" | "search";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChallengeCreated?: (roomId: string, inviteCode: string, sessionToken: string, playerId: string) => void;
}

export function FriendsPanel({ isOpen, onClose, onChallengeCreated }: Props) {
  const { token } = useAccount();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [challengingId, setChallengingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [f, r] = await Promise.all([
        apiListFriends(token),
        apiListFriendRequests(token),
      ]);
      setFriends(f);
      setRequests(r);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen && token) {
      void refresh();
    }
  }, [isOpen, token, refresh]);

  const handleSendRequest = async () => {
    if (!token || !searchUsername.trim()) return;
    setSendingTo(searchUsername.trim());
    try {
      await apiSendFriendRequest(token, searchUsername.trim());
      toast({ title: "Friend request sent!", description: `Request sent to ${searchUsername}` });
      setSearchUsername("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not send request";
      toast({ variant: "destructive", title: "Could not send request", description: msg });
    } finally {
      setSendingTo(null);
    }
  };

  const handleRespond = async (id: string, action: "accept" | "decline") => {
    if (!token) return;
    try {
      await apiRespondFriendRequest(token, id, action);
      await refresh();
      toast({ title: action === "accept" ? "Friend request accepted!" : "Request declined" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const handleRemoveFriend = async (friendshipId: string, username: string) => {
    if (!token) return;
    try {
      await apiRemoveFriend(token, friendshipId);
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      toast({ title: `Removed ${username}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const handleChallenge = async (friend: Friend) => {
    if (!token) return;
    setChallengingId(friend.accountId);
    try {
      const result = await apiCreateChallenge(token, { challengedUsername: friend.username });
      toast({ title: "Challenge sent!", description: `Waiting for ${friend.username} to accept...` });
      onChallengeCreated?.(result.roomId, result.inviteCode, result.sessionToken, result.playerId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not send challenge";
      toast({ variant: "destructive", title: "Could not send challenge", description: msg });
    } finally {
      setChallengingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-card border-l border-border/60 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/60">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Friends
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/60">
              {([
                { key: "friends", label: "Friends", icon: Users, badge: 0 },
                { key: "requests", label: "Requests", icon: Bell, badge: requests.length },
                { key: "search", label: "Add", icon: Search, badge: 0 },
              ] as const).map(({ key, label, icon: Icon, badge }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    tab === key
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {badge ? (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                      {badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Friends tab */}
              {!isLoading && tab === "friends" && (
                <>
                  {friends.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No friends yet — search for players to add them.
                    </div>
                  ) : (
                    friends.map((f) => (
                      <div
                        key={f.friendshipId}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40"
                      >
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                            {f.username[0]?.toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                              f.isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{f.username}</div>
                          <div className={`text-xs flex items-center gap-1 ${f.isOnline ? "text-green-500" : "text-muted-foreground"}`}>
                            {f.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            {f.isOnline ? "Online" : "Offline"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleChallenge(f)}
                            disabled={!f.isOnline || challengingId === f.accountId}
                            className="p-2 rounded-lg hover:bg-primary/20 text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Challenge"
                          >
                            {challengingId === f.accountId
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Swords className="h-3.5 w-3.5" />}
                          </button>
                          <div className="w-px h-5 bg-border/60 shrink-0" />
                          {confirmRemoveId === f.friendshipId ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmRemoveId(null);
                                  void handleRemoveFriend(f.friendshipId, f.username);
                                }}
                                className="px-2 py-1 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive text-[11px] font-semibold transition-colors"
                                title="Confirm remove"
                              >
                                Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(null)}
                                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(f.friendshipId)}
                              className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove friend"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Requests tab */}
              {!isLoading && tab === "requests" && (
                <>
                  {requests.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No pending friend requests.
                    </div>
                  ) : (
                    requests.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold shrink-0">
                          {r.from.username[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{r.from.username}</div>
                          <div className="text-xs text-muted-foreground">Wants to be friends</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleRespond(r.id, "accept")}
                            className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                            title="Accept"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(r.id, "decline")}
                            className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            title="Decline"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Search tab */}
              {tab === "search" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground">
                    Search for a player by their exact username to send a friend request.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Username"
                      className="h-10 bg-input/60 rounded-xl flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
                    />
                    <Button
                      size="sm"
                      className="h-10 px-3 rounded-xl shrink-0"
                      onClick={handleSendRequest}
                      disabled={!searchUsername.trim() || !!sendingTo}
                    >
                      {sendingTo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => void refresh()}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Refresh
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
