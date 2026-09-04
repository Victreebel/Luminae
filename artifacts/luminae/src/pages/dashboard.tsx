import { useState, useEffect, useRef } from "react";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAccount } from "@/contexts/AccountContext";
import { useCosmetics } from "@/contexts/CosmeticsContext";
import { RequireAuth } from "@/components/RequireAuth";
import {
  apiGetMyGames,
  apiQuitRoom,
  apiGetMyStats,
  apiGetBlueprintVault,
  apiGetChronicleProgress,
  apiStartRecurrenceChronicle,
  apiStartTriangulationChronicle,
  apiStartTraceChronicle,
  apiUseBlueprintDecryptionKey,
  apiAcknowledgeBlueprintVaultReveal,
  apiStartBlueprintChallenge,
  apiUpdateBlueprintVaultThreshold,
  apiUpdateBlueprintLoadout,
  type ActiveGame,
  type BlueprintVaultState,
  type PlayerStats,
  type StoreItem,
} from "@/lib/accountSession";
import type {
  BlueprintId,
  BlueprintLoadout,
  LumiiThresholdApproach,
  LumiiThresholdDialogueChoiceId,
  CampaignProgressProjection,
  NativeLumePackOffer,
  NativeStoreProvider,
} from "@workspace/game-types";
import {
  hasNativeBilling,
  loadNativeLumeOffers,
} from "@/lib/nativeBilling";
import { saveSession } from "@/lib/session";
import { gameAudio } from "@/lib/audio";
import { FriendsPanel } from "@/components/FriendsPanel";
import { ChallengeInbox } from "@/components/ChallengeInbox";
import { getGameState } from "@workspace/api-client-react";
import {
  ArrowRight,
  Plus,
  LogOut,
  CircleUserRound,
  House,
  Users,
  Loader2,
  Clock,
  RotateCcw,
  Trophy,
  Sword,
  Archive as ArchiveIcon,
  Settings,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Lightbulb,
  ShoppingBag,
  Gem,
  Gift,
  ShieldCheck,
  Palette,
  Orbit,
  Eye,
  Layers3,
  KeyRound,
  LockKeyhole,
  Trash2,
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
  HINT_KEYS,
} from "@/lib/cinematicPrefs";
import { useToast } from "@/hooks/use-toast";
import { getAvatarForPlayer } from "@/lib/avatars";
import {
  getArchivePresentation,
  setArchivePresentation,
  type ArchivePresentation,
} from "@/lib/archivePresentation";
import { LuminaeWordmark, OutOfMatchBackdrop, OutOfMatchHeader, OutOfMatchSectionHeading } from "@/components/out-of-match/OutOfMatchChrome";
import { AccountArchive, type ArchiveSection } from "@/components/archive/AccountArchive";
import { outOfGameAudio } from "@/lib/outOfGameAudio";
import armoredDetonatorPreview from "@/assets/blueprints/antimatter/detonation/armored.webp";
import originalDetonatorPreview from "@/assets/blueprints/antimatter/detonation/original.webp";
import asymmetricDetonatorPreview from "@/assets/blueprints/antimatter/detonation/asymmetric.webp";
import latticeDetonatorPreview from "@/assets/blueprints/antimatter/detonation/lattice.webp";

const BLUEPRINT_STORE_PREVIEWS: Partial<Record<NonNullable<StoreItem["presentationVariant"]>, string>> = {
  armored: armoredDetonatorPreview,
  original: originalDetonatorPreview,
  asymmetric: asymmetricDetonatorPreview,
  lattice: latticeDetonatorPreview,
};

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
      className="oom-panel oom-panel--quiet p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
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
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-col">
          <Button
            size="sm"
            className="h-9 gap-1 rounded-md px-4 text-xs whitespace-nowrap sm:h-8 sm:px-3"
            data-oom-sound="primary"
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
            className="flex h-9 items-center justify-center gap-1 rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:h-8"
          >
            {quittingId === game.roomId
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <RotateCcw className="h-3 w-3" />}
            Leave
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatsBar({ stats, isLoading }: { stats: PlayerStats | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border/35 bg-card/35">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 border-r border-border/25 p-3 last:border-r-0">
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
      className="grid grid-cols-3 overflow-hidden rounded-lg border border-border/35 bg-card/35"
    >
      <div className="flex flex-col items-center gap-0.5 border-r border-border/25 p-3">
        <span className="text-xl font-bold font-serif text-primary">{stats.gamesPlayed}</span>
        <span className="text-xs text-muted-foreground">Games</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 border-r border-border/25 p-3">
        <span className="text-xl font-bold font-serif text-green-400">{winRate}%</span>
        <span className="text-xs text-muted-foreground">Win Rate</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 p-3">
        <span className="text-xl font-bold font-serif text-yellow-300">{stats.avgEminence}</span>
        <span className="text-xs text-muted-foreground">Avg Eminence</span>
      </div>
    </motion.div>
  );
}

function FirstResonancePreview() {
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    playingRef.current = false;
    setPlaying(false);
    gameAudio.stopArrivalCutscene();
  };

  const togglePreview = () => {
    if (playingRef.current) {
      stop();
      return;
    }
    gameAudio.stopArrivalCutscene();
    if (gameAudio.isMuted()) gameAudio.setMuted(false);
    gameAudio.playArrivalCutscene('radiant', 'first_resonance');
    playingRef.current = true;
    setPlaying(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      playingRef.current = false;
      setPlaying(false);
    }, 10_800);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (playingRef.current) gameAudio.stopArrivalCutscene();
  }, []);

  return (
    <>
      <div className="store-preview-first-resonance" data-playing={playing ? "true" : "false"} aria-hidden="true">
        <span className="store-preview-first-resonance__core" />
        <span className="store-preview-first-resonance__ring store-preview-first-resonance__ring--one" />
        <span className="store-preview-first-resonance__ring store-preview-first-resonance__ring--two" />
        <span className="store-preview-first-resonance__wave store-preview-first-resonance__wave--one" />
        <span className="store-preview-first-resonance__wave store-preview-first-resonance__wave--two" />
        <span className="store-preview-first-resonance__wave store-preview-first-resonance__wave--three" />
      </div>
      <button
        type="button"
        className="store-preview-audio-button"
        onClick={(event) => {
          event.stopPropagation();
          togglePreview();
        }}
        aria-label={playing ? "Stop First Resonance preview" : "Play First Resonance preview"}
        title={playing ? "Stop preview" : "Preview sound"}
      >
        {playing ? <VolumeX /> : <Volume2 />}
      </button>
    </>
  );
}

function StoreItemPreview({ item }: { item: StoreItem }) {
  const blueprintPreview = item.presentationVariant
    ? BLUEPRINT_STORE_PREVIEWS[item.presentationVariant]
    : undefined;
  return (
    <div className={`store-item-preview ${item.previewClass}`} aria-label={`${item.name} preview`}>
      <div className="store-preview-starfield" aria-hidden="true" />
      {item.previewKind === "luminary_arrival_sound" ? (
        <FirstResonancePreview />
      ) : blueprintPreview ? (
        <img
          className="store-preview-blueprint-device"
          src={blueprintPreview}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : item.previewKind === "consumable" ? (
        <div className="store-preview-decryption-key" aria-hidden="true">
          <span className="store-preview-decryption-key__halo" />
          <KeyRound />
          <span className="store-preview-decryption-key__cipher"><i /><i /><i /></span>
        </div>
      ) : item.previewKind === "card_back" ? (
        <div className="store-preview-card-back" aria-hidden="true">
          <span className="store-preview-card-frame" />
          <span className="store-preview-card-core" />
          <span className="store-preview-card-mark">L</span>
        </div>
      ) : item.previewKind === "vault_seal" ? (
        <div className="store-preview-vault-seal" aria-hidden="true">
          <span className="store-preview-vault-seal__ring" />
          <span className="store-preview-vault-seal__aperture"><i /><i /><i /></span>
          <LockKeyhole />
        </div>
      ) : (
        <div className="store-preview-observatory" aria-hidden="true">
          <span className="store-preview-orbit store-preview-orbit--outer" />
          <span className="store-preview-orbit store-preview-orbit--inner" />
          <span className="store-preview-observatory-core" />
          <span className="store-preview-observatory-deck" />
        </div>
      )}
      <span className="store-preview-rarity">{item.rarity}</span>
    </div>
  );
}

export function StoreTab() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const {
    store,
    isLoading,
    loadError,
    refreshStore,
    testPurchase,
    unlockWithLume,
    equipCosmetic,
    claimDailyReward,
    buyNativeLume,
    restoreNativeLume,
  } = useCosmetics();
  const [pendingOperation, setPendingOperation] = useState<{
    itemId: string;
    type: "purchase" | "unlock" | "equip";
  } | null>(null);
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<{
    item: StoreItem;
    method: "lume" | "checkout";
  } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [nativeOffers, setNativeOffers] = useState<NativeLumePackOffer[]>([]);
  const [nativeProvider, setNativeProvider] = useState<NativeStoreProvider | null>(null);
  const [pendingPack, setPendingPack] = useState<string | null>(null);
  const nativeRestoreStarted = useRef(false);

  useEffect(() => {
    void refreshStore();
  }, [refreshStore]);

  useEffect(() => {
    if (!store || !hasNativeBilling()) {
      setNativeOffers([]);
      setNativeProvider(null);
      return;
    }
    let active = true;
    void loadNativeLumeOffers(store.lumePacks).then((result) => {
      if (!active) return;
      setNativeProvider(result.provider);
      setNativeOffers(result.offers);
      if (!nativeRestoreStarted.current) {
        nativeRestoreStarted.current = true;
        void restoreNativeLume().catch(() => undefined);
      }
    }).catch(() => {
      if (!active) return;
      setNativeProvider(null);
      setNativeOffers([]);
    });
    return () => { active = false; };
  }, [restoreNativeLume, store?.lumePacks]);

  const handleNativePackPurchase = async (offer: NativeLumePackOffer) => {
    if (pendingPack) return;
    setPendingPack(offer.packId);
    try {
      const result = await buyNativeLume(offer);
      await refreshStore();
      toast({
        title: result.status === "pending" ? "Purchase pending" : `+${result.lumeAmount} Lume`,
        description: result.status === "pending"
          ? "Your storefront is still processing payment. Lume will appear after confirmation."
          : result.status === "settlement_pending"
            ? "Your Lume is available. Store confirmation will retry automatically."
            : `Your spendable balance is now ${result.lumeBalance} Lume.`,
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Could not complete Lume purchase",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPendingPack(null);
    }
  };

  const handlePurchase = async (item: StoreItem) => {
    if (pendingOperation) return;
    setPendingOperation({ itemId: item.id, type: "purchase" });
    try {
      const result = await testPurchase(item.id);
      setPurchaseConfirmation(null);
      toast({
        title: result.alreadyOwned
          ? "Already in your collection"
          : item.kind === "consumable"
            ? "Contraband acquired"
            : "Cosmetic unlocked",
        description: result.alreadyOwned
          ? `${item.name} remains bound to this account.`
          : item.kind === "consumable"
            ? `${item.name} is ready to spend at the Vault.`
            : `${item.name} is now permanently bound to this account.`,
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Could not complete purchase",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPendingOperation(null);
    }
  };

  const handleLumeUnlock = async (item: StoreItem) => {
    if (pendingOperation || item.lumePrice === null) return;
    setPendingOperation({ itemId: item.id, type: "unlock" });
    try {
      const result = await unlockWithLume(item.id);
      setPurchaseConfirmation(null);
      toast({
        title: result.alreadyOwned
          ? "Already in your collection"
          : item.kind === "consumable"
            ? "Contraband acquired"
            : "Unlocked with Lume",
        description: result.alreadyOwned
          ? `${item.name} remains bound to this account.`
          : item.kind === "consumable"
            ? `${item.name} is ready to spend. Your balance is now ${result.lumeBalance} Lume.`
            : `${item.name} is permanently yours. Your balance is now ${result.lumeBalance} Lume.`,
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Could not unlock cosmetic",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPendingOperation(null);
    }
  };

  const handleConfirmedPurchase = () => {
    if (!purchaseConfirmation || pendingOperation) return;
    if (purchaseConfirmation.method === "lume") {
      void handleLumeUnlock(purchaseConfirmation.item);
      return;
    }
    void handlePurchase(purchaseConfirmation.item);
  };

  const handleEquip = async (item: StoreItem, equipped: boolean) => {
    if (item.kind === "consumable") return;
    if (pendingOperation) return;
    setPendingOperation({ itemId: item.id, type: "equip" });
    try {
      await equipCosmetic(item.kind, equipped ? null : item.id, item.scopeKey);
      toast({
        title: equipped ? "Returned to default" : `${item.name} equipped`,
        description: equipped
          ? "Your standard Luminae presentation is active again."
          : item.visibility === "all_participants"
            ? "The cosmetic is active and visible to everyone in your matches."
            : "The cosmetic is active on your screen only; other participants are unaffected.",
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Could not update loadout",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPendingOperation(null);
    }
  };

  const handleDailyClaim = async () => {
    if (!store || isClaiming) return;
    setIsClaiming(true);
    try {
      const result = await claimDailyReward();
      toast({
        title: result.alreadyClaimed ? "Today's Lume is secured" : `+${result.rewardAmount} Lume`,
        description: result.alreadyClaimed
          ? "Return tomorrow for the next cosmetic reward."
          : `Daily streak: ${result.dailyClaimStreak} day${result.dailyClaimStreak === 1 ? "" : "s"}.`,
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Could not claim Lume",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-label="Loading store">
        <div className="h-28 rounded-lg bg-card/50 border border-border/40 animate-pulse" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map((item) => (
            <div key={item} className="h-80 rounded-lg bg-card/50 border border-border/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !store) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
        <ShoppingBag className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="font-medium">The atelier could not be reached</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Your collection is safe. Try loading it again.</p>
        <Button variant="secondary" onClick={() => void refreshStore()}>Retry</Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="rounded-lg border border-primary/25 bg-card/70 p-4">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-md border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0">
            <Gem className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase text-muted-foreground">Spendable Lume</p>
            <p className="text-xl font-serif font-bold">{store.engagement.lumeBalance} Lume</p>
            <p className="text-xs text-muted-foreground">
              {store.engagement.dailyClaimStreak > 0
                ? `Day ${store.engagement.dailyClaimStreak} of your current collection streak`
                : "Claim today's Lume to begin your collection streak"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={store.engagement.canClaimDaily ? "default" : "secondary"}
            className="rounded-md gap-1.5 shrink-0"
            data-oom-sound="primary"
            onClick={handleDailyClaim}
            disabled={!store.engagement.canClaimDaily || isClaiming}
          >
            {isClaiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
            {store.engagement.canClaimDaily ? "Claim" : "Claimed"}
          </Button>
        </div>
      </section>

      {nativeOffers.length > 0 && (
        <section className="rounded-lg border border-primary/20 bg-card/55 p-4" aria-label="Buy Lume">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-base font-bold">Lume Reserves</h2>
              <p className="text-xs text-muted-foreground">
                Prices are supplied by {nativeProvider === "samsung_iap" ? "Galaxy Store" : "Google Play"}.
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {nativeOffers.map((offer) => (
              <Button
                key={offer.packId}
                type="button"
                variant="secondary"
                className="h-auto min-h-16 flex-col rounded-md px-2 py-2"
                disabled={pendingPack !== null}
                onClick={() => void handleNativePackPurchase(offer)}
              >
                {pendingPack === offer.packId ? (
                  <Loader2 className="mb-1 h-4 w-4 animate-spin" />
                ) : (
                  <Gem className="mb-1 h-4 w-4 text-primary" />
                )}
                <span className="text-xs font-bold">{offer.lumeAmount} Lume</span>
                <span className="text-[10px] text-muted-foreground">{offer.localizedPrice}</span>
              </Button>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="font-serif text-lg font-bold">Lume Exchange</h2>
          <p className="text-xs text-muted-foreground">Cosmetics, recovered forms, and rare single-use goods.</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase text-muted-foreground border border-border/50 rounded-full px-2 py-1 shrink-0">
          <ShieldCheck className="h-3 w-3" />
          Inventory {store.ownedItemIds.length}/{store.items.length}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {store.items.map((item) => {
          const isOwned = store.ownedItemIds.includes(item.id);
          const isEquipped = store.equippedItems.some(
            (equipped) =>
              equipped.slot === item.kind &&
              equipped.scopeKey === item.scopeKey &&
              equipped.itemId === item.id,
          );
          const isPending = pendingOperation?.itemId === item.id;
          const canAfford = item.lumePrice !== null &&
            store.engagement.lumeBalance >= item.lumePrice;
          const isConsumable = item.kind === "consumable";
          const KindIcon = isConsumable
            ? KeyRound
            : item.kind === "luminary_arrival_sound"
              ? Volume2
            : item.kind === "card_back"
              ? Palette
              : item.kind === "vault_seal"
                ? LockKeyhole
                : Orbit;
          const VisibilityIcon = isConsumable ? KeyRound : item.visibility === "all_participants" ? Users : Eye;
          const visibilityLabel = isConsumable
            ? "Single use · account inventory"
            : item.visibility === "all_participants"
            ? "Visible to all participants"
            : "Player-only · only you see this";
          return (
            <article
              key={item.id}
              className={`rounded-lg border bg-card/75 overflow-hidden transition-colors ${
                isEquipped ? "border-primary/70" : "border-border/55"
              }`}
            >
              <StoreItemPreview item={item} />
              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <KindIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{item.name}</h3>
                      {isEquipped && (
                        <span className="text-[9px] uppercase text-primary border border-primary/35 rounded-full px-1.5 py-0.5 shrink-0">
                          Equipped
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.shortDescription}</p>
                  </div>
                </div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/45 bg-background/35 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                  <VisibilityIcon className="h-3 w-3" />
                  {visibilityLabel}
                </div>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed min-h-12">{item.description}</p>
                <div className="grid gap-2 mt-3">
                  {isOwned && isConsumable ? (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full rounded-md gap-1.5"
                      onClick={() => setLocation("/dashboard/archive/vault")}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Use in Vault
                    </Button>
                  ) : isOwned ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={isEquipped ? "secondary" : "default"}
                      className="w-full rounded-md gap-1.5"
                      onClick={() => void handleEquip(item, isEquipped)}
                      disabled={pendingOperation !== null}
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isEquipped ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {isEquipped ? "Unequip" : "Equip"}
                    </Button>
                  ) : (
                    <>
                      {item.lumePrice !== null && (
                        <Button
                          type="button"
                          size="sm"
                          variant={canAfford ? "default" : "secondary"}
                          className="w-full rounded-md gap-1.5"
                          data-oom-sound="primary"
                          onClick={() => setPurchaseConfirmation({ item, method: "lume" })}
                          disabled={!canAfford || pendingOperation !== null}
                          title={canAfford ? undefined : `Requires ${item.lumePrice} Lume`}
                        >
                          {isPending && pendingOperation?.type === "unlock" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Gem className="h-3.5 w-3.5" />
                          )}
                          {canAfford
                            ? `${isConsumable ? "Acquire" : "Unlock"} · ${item.lumePrice} Lume`
                            : `${item.lumePrice} Lume needed`}
                        </Button>
                      )}
                      {store.testCheckoutEnabled && (
                        <Button
                          type="button"
                          size="sm"
                          variant={item.lumePrice === null ? "default" : "secondary"}
                          className="w-full rounded-md gap-1.5"
                          data-oom-sound="primary"
                          onClick={() => setPurchaseConfirmation({ item, method: "checkout" })}
                          disabled={pendingOperation !== null}
                        >
                          {isPending && pendingOperation?.type === "purchase" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShoppingBag className="h-3.5 w-3.5" />
                          )}
                          {item.priceLabel}
                        </Button>
                      )}
                      {item.lumePrice === null && !store.testCheckoutEnabled && (
                        <div className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border/55 bg-background/35 px-3 text-xs font-semibold text-muted-foreground">
                          <Trophy className="h-3.5 w-3.5" />
                          {item.priceLabel}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[11px] text-center text-muted-foreground px-4">
        Cosmetics remain bound to your account. Consumables state their gameplay effect and are removed from inventory when spent.
      </p>

      <AlertDialog
        open={purchaseConfirmation !== null}
        onOpenChange={(open) => {
          if (!open && pendingOperation === null) setPurchaseConfirmation(null);
        }}
      >
        <AlertDialogContent className="max-w-md overflow-hidden border-primary/30 bg-background p-0">
          {purchaseConfirmation && (
            <>
              <StoreItemPreview item={purchaseConfirmation.item} />
              <div className="space-y-5 p-5 pt-1 sm:p-6 sm:pt-2">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif text-xl">
                    Confirm purchase
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Review the details before adding {purchaseConfirmation.item.name} to your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 rounded-md border border-border/55 bg-card/55 p-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{purchaseConfirmation.item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {purchaseConfirmation.item.shortDescription}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/50 px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                      {purchaseConfirmation.item.rarity}
                    </span>
                  </div>

                  <div className="border-t border-border/45 pt-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="font-semibold">
                        {purchaseConfirmation.method === "lume"
                          ? `${purchaseConfirmation.item.lumePrice} Lume`
                          : purchaseConfirmation.item.priceLabel}
                      </span>
                    </div>
                    {purchaseConfirmation.method === "lume" && purchaseConfirmation.item.lumePrice !== null && (
                      <div className="mt-2 flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Balance after purchase</span>
                        <span className="font-semibold">
                          {Math.max(0, store.engagement.lumeBalance - purchaseConfirmation.item.lumePrice)} Lume
                        </span>
                      </div>
                    )}
                    {purchaseConfirmation.method === "checkout" && store.testCheckoutEnabled && (
                      <p className="mt-2 text-xs text-muted-foreground">Test checkout only. No real payment will be charged.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t border-border/45 pt-3 text-xs text-muted-foreground">
                    {purchaseConfirmation.item.kind === "consumable" ? (
                      <KeyRound className="h-3.5 w-3.5 shrink-0" />
                    ) : purchaseConfirmation.item.visibility === "all_participants" ? (
                      <Users className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {purchaseConfirmation.item.kind === "consumable"
                      ? "Single-use account item · consumed when activated"
                      : purchaseConfirmation.item.visibility === "all_participants"
                      ? "Visible to all participants in your matches"
                      : "Player-only · only you see this cosmetic"}
                  </div>
                </div>

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {purchaseConfirmation.item.kind === "consumable"
                    ? "The key is consumed when it bypasses the Vault condition. It is not refunded after a non-victory exit."
                    : "Once unlocked, this cosmetic remains bound to your account across updates and reinstalls."}
                </p>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={pendingOperation !== null}>Cancel</AlertDialogCancel>
                  <Button
                    type="button"
                    onClick={handleConfirmedPurchase}
                    disabled={pendingOperation !== null}
                    className="gap-2"
                    data-oom-sound="primary"
                  >
                    {pendingOperation !== null ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : purchaseConfirmation.method === "lume" ? (
                      <Gem className="h-4 w-4" />
                    ) : (
                      <ShoppingBag className="h-4 w-4" />
                    )}
                    {purchaseConfirmation.method === "lume" && purchaseConfirmation.item.kind !== "consumable"
                      ? "Confirm unlock"
                      : "Confirm purchase"}
                  </Button>
                </AlertDialogFooter>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

type CostModePref = "printed" | "after_bonuses" | "needed_now" | "remember";

function SettingsTab({ accountId, token }: { accountId: string; token: string | null }) {
  const [archivePresentation, setArchivePresentationState] = useState<ArchivePresentation>(
    () => getArchivePresentation(),
  );
  const handleArchivePresentation = (presentation: ArchivePresentation) => {
    setArchivePresentationState(presentation);
    setArchivePresentation(presentation);
  };

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
    { value: "printed", label: "Full", desc: "Always show the Artifact's base cost" },
    { value: "after_bonuses", label: "Discounted", desc: "Always show cost after your permanent bonuses" },
    { value: "needed_now", label: "Needed", desc: "Always show what you still need to pay right now" },
  ];

  const [muted, setMutedState] = useState<boolean>(() => getMuted());
  const toggleMuted = () => {
    const next = !muted;
    setMutedState(next);
    outOfGameAudio.setMuted(next);
    if (!next) outOfGameAudio.play("control");
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

  const countDismissed = () => HINT_KEYS.filter((k) => localStorage.getItem(k) === "1").length;
  const [dismissedCount, setDismissedCount] = useState(() => countDismissed());

  useEffect(() => {
    const refresh = () => setDismissedCount(countDismissed());
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
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
        outOfGameAudio.setMuted(prefs.muted);
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
      className={`w-full flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-all ${
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
        <div className="oom-panel oom-panel--quiet p-5">
          <div className="h-4 w-36 rounded bg-muted/50 animate-pulse mb-2" />
          <div className="h-3 w-56 rounded bg-muted/30 animate-pulse mb-5" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-md bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="oom-panel oom-panel--quiet p-5">
          <div className="h-4 w-32 rounded bg-muted/50 animate-pulse mb-2" />
          <div className="h-3 w-64 rounded bg-muted/30 animate-pulse mb-5" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-md bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="oom-panel oom-panel--quiet p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold mb-1">Archive appearance</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose how the concealed Archives appear beside The Forge.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/45 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            <Eye className="h-3 w-3" />
            Only you
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            {
              value: "crystal" as const,
              label: "Archive crystal",
              desc: "The default depletion crystal shows how much remains.",
              icon: <Gem className="h-4 w-4" />,
              badge: "Default",
            },
            {
              value: "cards" as const,
              label: "Physical cards",
              desc: "Show each Archive as a stack with its tier card back.",
              icon: <Layers3 className="h-4 w-4" />,
              badge: null,
            },
          ]).map((option) => {
            const active = archivePresentation === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleArchivePresentation(option.value)}
                data-active={active ? "true" : "false"}
                className={`flex min-h-20 items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border/70 hover:text-foreground"
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${active ? "text-primary" : "opacity-55"}`}>
                  {option.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold leading-none">{option.label}</span>
                    {option.badge && (
                      <span className="rounded-full border border-primary/25 px-1.5 py-0.5 text-[9px] uppercase text-primary">
                        {option.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block text-xs leading-snug text-muted-foreground">
                    {option.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Player-only display preference. Other participants keep their own Archive appearance.
        </p>
      </div>

      <div className="oom-panel oom-panel--quiet p-5">
        <h3 className="text-sm font-semibold">Account and policies</h3>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <a href="/legal/privacy">Privacy</a><a href="/legal/terms">Terms</a><a href="/legal/conduct">Conduct</a><a href="/legal/refunds">Refunds</a>
        </div>
        <a href="/legal/delete-account" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" /> Delete account</a>
      </div>

      <div className="oom-panel oom-panel--quiet p-5">
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
            "Toggle interface, gameplay, and cinematic audio",
          )}
          {prefToggle(
            abridgedAnims,
            toggleAbridgedAnims,
            <Zap className="h-4 w-4" />,
            "Reduced animations",
            "Compact Luminary effects and shorter Forge and Harness animations",
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
            className={`w-full flex items-center gap-3 rounded-md border px-4 py-2.5 text-left text-sm transition-all ${
              hintsEnabled
                ? "border-border/50 bg-secondary/20 text-muted-foreground hover:border-border/70 hover:text-foreground cursor-pointer"
                : "border-border/20 bg-secondary/10 text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            <RotateCcw className={`h-4 w-4 flex-shrink-0 ${hintsEnabled ? "text-muted-foreground" : "opacity-30"}`} />
            <span className="flex-1">
              {hintsJustReset
                ? "Hints reset — tips will reappear in-game"
                : dismissedCount > 0
                  ? `Reset hints (${dismissedCount} dismissed)`
                  : "Reset hints"}
            </span>
            {hintsJustReset && <Check className="h-4 w-4 text-green-400 flex-shrink-0" />}
          </button>
        </div>
      </div>

      <div className="oom-panel oom-panel--quiet p-5">
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
                className={`w-full flex items-start gap-3 rounded-md border px-4 py-3 text-left transition-all ${
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

type DashboardTab = "games" | "archive" | "store" | "settings";

const ARCHIVE_ROUTE = "/dashboard/archive";
const ARCHIVE_SECTIONS = new Set<ArchiveSection>(["civilization", "artifacts", "luminaries", "matches", "chronicles", "vault"]);

function archiveSectionFromLocation(location: string): ArchiveSection | null {
  const path = location.split("?", 1)[0];
  if (!path.startsWith(`${ARCHIVE_ROUTE}/`)) return null;
  const section = path.slice(ARCHIVE_ROUTE.length + 1).split("/", 1)[0];
  return ARCHIVE_SECTIONS.has(section as ArchiveSection) ? section as ArchiveSection : null;
}

function isArchiveLocation(location: string): boolean {
  const path = location.split("?", 1)[0];
  return path === ARCHIVE_ROUTE || path.startsWith(`${ARCHIVE_ROUTE}/`);
}

function DashboardContent() {
  const [location, setLocation] = useLocation();
  const { account, token, logout, refreshAccount } = useAccount();
  const { refreshStore } = useCosmetics();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>(() => isArchiveLocation(location) ? "archive" : "games");
  const archiveSection = archiveSectionFromLocation(location);
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [blueprintVault, setBlueprintVault] = useState<BlueprintVaultState | null>(null);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgressProjection | null>(null);
  const [isChroniclePending, setIsChroniclePending] = useState(false);
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [isVaultPending, setIsVaultPending] = useState(false);
  const preparedBlueprintRoomIdRef = useRef<string | null>(null);
  const [quittingId, setQuittingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

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

  useEffect(() => {
    setActiveTab((current) => isArchiveLocation(location) ? "archive" : current === "archive" ? "games" : current);
  }, [location]);

  useEffect(() => {
    if (!token || activeTab !== "archive" || archiveSection !== "vault") return;
    let cancelled = false;
    setIsVaultLoading(true);
    void apiGetBlueprintVault(token)
      .then((vault) => {
        if (!cancelled) setBlueprintVault(vault);
      })
      .catch(() => {
        if (!cancelled) {
          toast({ variant: "destructive", title: "Vault record unavailable" });
        }
      })
      .finally(() => {
        if (!cancelled) setIsVaultLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, archiveSection, toast, token]);

  useEffect(() => {
    if (!token || activeTab !== "archive" || archiveSection !== "chronicles") return;
    let cancelled = false;
    void apiGetChronicleProgress(token)
      .then((progress) => {
        if (!cancelled) setCampaignProgress(progress);
      })
      .catch(() => {
        if (!cancelled) toast({ variant: "destructive", title: "Chronicle record unavailable" });
      });
    return () => { cancelled = true; };
  }, [activeTab, archiveSection, toast, token]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    if (tab === "archive") {
      if (!isArchiveLocation(location)) setLocation(ARCHIVE_ROUTE);
    } else if (isArchiveLocation(location)) {
      setLocation("/dashboard");
    }
  };

  const handleArchiveNavigate = (section: ArchiveSection | null) => {
    setLocation(section ? `${ARCHIVE_ROUTE}/${section}` : ARCHIVE_ROUTE);
  };

  const handleStartTraceChronicle = async () => {
    if (!token || !account || isChroniclePending) return;
    setIsChroniclePending(true);
    try {
      const chronicle = await apiStartTraceChronicle(token);
      saveSession({
        roomId: chronicle.roomId,
        inviteCode: chronicle.inviteCode,
        playerId: chronicle.playerId,
        sessionToken: chronicle.sessionToken,
        playerName: account.username,
        isHost: true,
        isGuidedMatch: true,
      });
      setLocation(`/game/${chronicle.roomId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "The Trace did not open",
        description: error instanceof Error ? error.message : "Chronicle start unavailable",
      });
    } finally {
      setIsChroniclePending(false);
    }
  };

  const handleStartRecurrenceChronicle = async () => {
    if (!token || !account || isChroniclePending) return;
    setIsChroniclePending(true);
    try {
      const chronicle = await apiStartRecurrenceChronicle(token);
      saveSession({
        roomId: chronicle.roomId,
        inviteCode: chronicle.inviteCode,
        playerId: chronicle.playerId,
        sessionToken: chronicle.sessionToken,
        playerName: account.username,
        isHost: true,
        isGuidedMatch: true,
      });
      setLocation(`/game/${chronicle.roomId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "The Recurrence did not open",
        description: error instanceof Error ? error.message : "Chronicle start unavailable",
      });
    } finally {
      setIsChroniclePending(false);
    }
  };

  const handleStartTriangulationChronicle = async () => {
    if (!token || !account || isChroniclePending) return;
    setIsChroniclePending(true);
    try {
      const chronicle = await apiStartTriangulationChronicle(token);
      saveSession({
        roomId: chronicle.roomId,
        inviteCode: chronicle.inviteCode,
        playerId: chronicle.playerId,
        sessionToken: chronicle.sessionToken,
        playerName: account.username,
        isHost: true,
        isGuidedMatch: true,
      });
      setLocation(`/game/${chronicle.roomId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "The Triangulation did not open",
        description: error instanceof Error ? error.message : "Chronicle start unavailable",
      });
    } finally {
      setIsChroniclePending(false);
    }
  };

  const prepareBlueprintChallenge = async () => {
    if (!token || !account) throw new Error("Sign in to confront Lumii.");
    if (preparedBlueprintRoomIdRef.current) return preparedBlueprintRoomIdRef.current;
    setIsVaultPending(true);
    try {
      const challenge = await apiStartBlueprintChallenge(token);
      saveSession({
        roomId: challenge.roomId,
        inviteCode: challenge.inviteCode,
        playerId: challenge.playerId,
        sessionToken: challenge.sessionToken,
        playerName: account.username,
        isHost: true,
      });
      preparedBlueprintRoomIdRef.current = challenge.roomId;
      setBlueprintVault((current) => current ? {
        ...current,
        clearance: {
          ...current.clearance,
          status: "challenge_active",
          challengeRoomId: challenge.roomId,
          cipherDeactivated: true,
          thresholdApproach: challenge.lumiiThresholdApproach,
          thresholdDialogueResolution: "continued",
          thresholdRuptured: true,
          covenantBroken: true,
        },
      } : current);
      await refreshAccount().catch(() => undefined);
      return challenge.roomId;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lumii remains beyond the seal",
        description: error instanceof Error ? error.message : "The challenge could not begin.",
      });
      throw error;
    } finally {
      setIsVaultPending(false);
    }
  };

  const handleResumeBlueprintChallenge = async () => {
    const roomId = await prepareBlueprintChallenge();
    setLocation(`/game/${roomId}`);
  };

  const handleEnterPreparedBlueprintChallenge = () => {
    const roomId = preparedBlueprintRoomIdRef.current ?? blueprintVault?.clearance.challengeRoomId;
    if (!roomId) return;
    setLocation(`/game/${roomId}`);
  };

  const updateBlueprintThreshold = async (
    action:
      | { action: "deactivate_cipher" }
      | { action: "choose_approach"; approach: LumiiThresholdApproach }
      | { action: "record_dialogue_path"; path: LumiiThresholdDialogueChoiceId[] }
      | { action: "resolve_dialogue"; resolution: "left" },
  ) => {
    if (!token) throw new Error("Sign in to approach the Vault.");
    setIsVaultPending(true);
    try {
      const result = await apiUpdateBlueprintVaultThreshold(token, action);
      setBlueprintVault((current) => current ? {
        ...current,
        clearance: {
          ...current.clearance,
          cipherDeactivated: result.cipherDeactivated,
          thresholdApproach: result.thresholdApproach,
          thresholdDialoguePath: result.thresholdDialoguePath,
          thresholdDialogueResolution: result.thresholdDialogueResolution,
          status: result.status,
          decryptionKeyBypassActive: result.decryptionKeyBypassActive,
        },
      } : current);
    } finally {
      setIsVaultPending(false);
    }
  };

  const handleUseBlueprintDecryptionKey = async () => {
    if (!token) throw new Error("Sign in to use the decryption key.");
    setIsVaultPending(true);
    try {
      await apiUseBlueprintDecryptionKey(token);
      const refreshedVault = await apiGetBlueprintVault(token);
      setBlueprintVault(refreshedVault);
      await refreshStore().catch(() => undefined);
      toast({
        title: "Decryption key consumed",
        description: "The threshold has reset for one fresh attempt. Defeat Lumii before leaving.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "The key was rejected",
        description: error instanceof Error ? error.message : "The Vault condition did not change.",
      });
      throw error;
    } finally {
      setIsVaultPending(false);
    }
  };

  const handleAcknowledgeVaultReveal = async () => {
    if (!token) throw new Error("Sign in to enter the Vault.");
    await apiAcknowledgeBlueprintVaultReveal(token);
    setBlueprintVault((current) => current ? {
      ...current,
      clearance: { ...current.clearance, revealPending: false },
    } : current);
    await refreshAccount().catch(() => undefined);
  };

  const handleUpdateBlueprintLoadout = async (
    mode: Extract<BlueprintLoadout["mode"], "campaign" | "custom">,
    slots: Array<BlueprintId | null>,
  ) => {
    if (!token) return;
    setIsVaultPending(true);
    try {
      const updated = await apiUpdateBlueprintLoadout(token, mode, slots);
      setBlueprintVault((current) => current ? {
        ...current,
        loadouts: current.loadouts.map((loadout) => loadout.mode === mode ? updated : loadout),
      } : current);
      toast({ title: `${mode === "campaign" ? "Campaign" : "Custom"} loadout updated` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Loadout unchanged",
        description: error instanceof Error ? error.message : "The Vault rejected the update.",
      });
    } finally {
      setIsVaultPending(false);
    }
  };

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
    { isOpen: accountMenuOpen, onClose: () => setAccountMenuOpen(false) },
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
    setAccountMenuOpen(false);
    await logout();
    setLocation("/");
  };

  if (!account) return null;

  const outOfMatchAudioMood =
    activeTab === "archive"
      ? archiveSection === "vault"
        ? "vault"
        : "archive"
      : activeTab === "store"
        ? "store"
        : activeTab === "settings"
          ? "settings"
          : "dashboard";

  return (
    <div className="oom-shell min-h-[100dvh] flex flex-col overflow-hidden">
      <OutOfMatchBackdrop audioMood={outOfMatchAudioMood} />

      <OutOfMatchHeader
        left={<LuminaeWordmark onClick={() => setLocation("/?menu=1")} />}
        center={<span className="oom-kicker hidden sm:block">Command Center</span>}
        right={(
          <div className="flex items-center gap-1 sm:gap-2 relative">
          <ChallengeInbox onWebSocketChallenge={() => void fetchGames()} />
          <button
            type="button"
            onClick={() => setFriendsOpen(true)}
            className="oom-icon-button oom-icon-button--label"
            title="Friends"
            aria-haspopup="dialog"
            aria-expanded={friendsOpen}
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="hidden text-sm font-medium sm:inline">Friends</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            className="oom-icon-button"
            title="Account menu"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
          >
            <CircleUserRound className="h-4 w-4" />
          </button>
          {accountMenuOpen && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="oom-panel absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden p-1.5 text-left shadow-2xl"
            >
              <div className="border-b border-border/35 px-3 py-2.5">
                <p className="oom-kicker">Signed in</p>
                <p className="truncate text-sm font-semibold">{account.username}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => setLocation("/?menu=1")}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-white/[0.05]"
              >
                <House className="h-4 w-4 text-muted-foreground" />
                Main Menu
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </motion.div>
          )}
          </div>
        )}
      />

      <main className="oom-frame relative z-10 flex-1 overflow-y-auto py-5 sm:py-7">
        <div className="mx-auto w-full max-w-4xl space-y-5">
          {activeTab === "games" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="oom-panel oom-panel--gold grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
            >
              <div className="min-w-0">
                <p className="oom-kicker mb-2">Player Command</p>
                <h1 className="font-serif text-xl font-bold sm:text-2xl">
                  {games.length > 0 ? "Continue your journey," : "Welcome to Luminae,"}{" "}
                  <span className="text-primary">{account.username}</span>
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {isLoadingStats
                    ? "Loading your profile..."
                    : games.length > 0
                      ? `${games.length} active match${games.length !== 1 ? "es" : ""} await${games.length === 1 ? "s" : ""} your return.`
                      : stats && stats.gamesPlayed > 0
                        ? `${stats.wins}W · ${stats.losses}L${stats.ties > 0 ? ` · ${stats.ties}T` : ""} across ${stats.gamesPlayed} game${stats.gamesPlayed !== 1 ? "s" : ""}. Begin your next civilization.`
                        : "Your first civilization is waiting. Start a match or bring a friend into the cosmos."}
                </p>
              </div>
              <div className="w-full sm:w-44">
                <Button
                  className={`${games.length > 0 ? "oom-action-secondary" : "oom-action-primary"} h-11 gap-2`}
                  onClick={() => setLocation("/?newgame=1")}
                >
                  <Plus className="h-4 w-4" />
                  New Match
                </Button>
              </div>
            </motion.div>
          )}

        <OutOfMatchSectionHeading
          eyebrow="Your Account"
          title={activeTab === "games" ? "Active Matches" : activeTab === "store" ? "Store" : activeTab === "archive" ? "Archive" : "Preferences"}
          detail={activeTab === "games" && games.length > 0 ? <span>{games.length} active</span> : undefined}
        />

        <div className="oom-segmented mb-4 grid grid-cols-4" aria-label="Account sections">
          <button
            type="button"
            onClick={() => handleTabChange("games")}
            aria-label="Games"
            data-active={activeTab === "games"}
            className="flex min-w-0 items-center justify-center gap-1.5"
          >
            <Sword className="h-3.5 w-3.5" />
            <span>Games</span>
            {!isLoadingGames && games.length > 0 && (
              <span className="hidden rounded-full bg-primary/20 px-1.5 py-0.5 text-xs leading-none text-primary sm:inline-flex">
                {games.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("archive")}
            aria-label="Archive"
            data-active={activeTab === "archive"}
            className="flex min-w-0 items-center justify-center gap-1.5"
          >
            <ArchiveIcon className="h-3.5 w-3.5" />
            <span>Archive</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("store")}
            aria-label="Store"
            data-active={activeTab === "store"}
            className="flex min-w-0 items-center justify-center gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Store</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("settings")}
            aria-label="Settings"
            data-active={activeTab === "settings"}
            className="flex min-w-0 items-center justify-center gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "games" ? (
          <div className="space-y-5">
            <div className="space-y-3">
              {isLoadingGames ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : games.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="oom-panel oom-panel--quiet border-dashed p-8 text-center text-muted-foreground"
                >
                  <Trophy className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  <p className="font-medium">No active matches</p>
                  <p className="mt-1 text-sm">Create a match or challenge a friend to begin.</p>
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

            <div className="space-y-3">
              <OutOfMatchSectionHeading eyebrow="Career" title="At a Glance" />
              <StatsBar stats={stats} isLoading={isLoadingStats} />
            </div>
          </div>
        ) : activeTab === "archive" ? (
          <AccountArchive
            stats={stats}
            isLoading={isLoadingStats}
            page={archiveSection}
            onNavigate={handleArchiveNavigate}
            blueprintVault={blueprintVault}
            campaignProgress={campaignProgress}
            isChroniclePending={isChroniclePending}
            onStartTraceChronicle={() => void handleStartTraceChronicle()}
            onStartRecurrenceChronicle={() => void handleStartRecurrenceChronicle()}
            onStartTriangulationChronicle={() => void handleStartTriangulationChronicle()}
            isVaultLoading={isVaultLoading}
            isVaultPending={isVaultPending}
            onResumeBlueprintChallenge={handleResumeBlueprintChallenge}
            onDeactivateBlueprintCipher={() => updateBlueprintThreshold({ action: "deactivate_cipher" })}
            onChooseBlueprintThresholdApproach={(approach) => updateBlueprintThreshold({ action: "choose_approach", approach })}
            onRecordBlueprintThresholdDialogue={(path) => updateBlueprintThreshold({ action: "record_dialogue_path", path })}
            onResolveBlueprintThresholdDialogue={() => updateBlueprintThreshold({ action: "resolve_dialogue", resolution: "left" })}
            onUseBlueprintDecryptionKey={handleUseBlueprintDecryptionKey}
            onPrepareBlueprintChallenge={async () => { await prepareBlueprintChallenge(); }}
            onEnterPreparedBlueprintChallenge={handleEnterPreparedBlueprintChallenge}
            onAcknowledgeVaultReveal={handleAcknowledgeVaultReveal}
            onUpdateBlueprintLoadout={(mode, slots) => void handleUpdateBlueprintLoadout(mode, slots)}
          />
        ) : activeTab === "store" ? (
          <StoreTab />
        ) : (
          <SettingsTab accountId={account.id} token={token} />
        )}
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

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
