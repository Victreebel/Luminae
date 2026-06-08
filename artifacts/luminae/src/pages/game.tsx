import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useParams, useLocation } from 'wouter';
import { 
  useGetGameState, 
  useSubmitAction,
  getGetGameStateQueryKey,
  useGetCardLoreCatalog,
} from '@workspace/api-client-react';
import type { RematchVoteUpdate, ChatMessage } from '@/hooks/use-game-websocket';
import type { 
  GameState, 
  CrystalCounts, 
  ArtifactCard, 
  Luminary,
  GamePlayerState,
  LuminaryActiveState,
  ActionRequest,
  PendingLuminaryActivationEvent,
  BurnEvent,
} from '@workspace/api-client-react';
import { LuminaryActivationCinematic } from '@/components/LuminaryActivationCinematic';
import { SeedBeyondSeasonsEffect } from '@/components/SeedBeyondSeasonsEffect';
import { useQueryClient } from '@tanstack/react-query';
import { getSession, clearSession } from '@/lib/session';
import { getSkipCinematics, setSkipCinematics, syncAccountPreferences, apiUpdatePreferences, markHintSeen } from '@/lib/cinematicPrefs';
import { useAccount } from '@/contexts/AccountContext';
import { AccountLoadingScreen } from '@/components/AccountLoadingScreen';
import { getAccountSession } from '@/lib/accountSession';
import { useGameWebsocket } from '@/hooks/use-game-websocket';
import { useToast } from '@/hooks/use-toast';
import { gameAudio } from '@/lib/audio';
import { CipherApertureAnimation, CipherSigil } from '@/components/CipherApertureAnimation';
import { ForgeButton, EncryptButton, AssimilateButton } from '@/components/ForgeEncryptButton';

import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Volume2, VolumeX, AlertCircle, Sparkles, Clock,
  Gavel, Eye, Package, LayoutGrid, Hand, Landmark, List,
  ChevronDown, ChevronUp, ChevronRight, Flag, X, HelpCircle, CalendarX, Undo2, Check, SendHorizontal, DoorOpen, Pencil,
  Hammer, Droplets, MoreVertical, Zap, RefreshCw, Lightbulb
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { getAvatarForPlayer, getSavedAvatarId, getDefaultCivName } from '@/lib/avatars';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import { LuminaryPanelArt, LuminarySummonCutscene, LuminaryIdleOverlay, AuraPreviewModal, getLuminaryVisuals, AURA_VARIANTS } from '@/lib/luminaryAssets';
import { BOARD_CARD_W, BOARD_CARD_H } from '@/lib/constants';
import { CardBackTier1, CardBackTier2, CardBackTier3 } from '@/components/ArtifactCardBack';
import { LumiiTutorial, LUMII_BEAT_COUNT, LUMII_BEAT_GATES, LUMII_ZONE_HIGHLIGHTS, LUMII_ATTENTION, type LumiiAttentionState } from '@/components/LumiiTutorial';
import { SwipeHintBar } from '@/components/SwipeHintBar';
import { AffinityWellCells } from '@/components/AffinityWell';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useEscapeToClose } from '@/hooks/use-escape-to-close';
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss';
import { useGameKeyboardShortcuts } from '@/hooks/use-game-keyboard-shortcuts';
import { useMarketKeyboardNav } from '@/hooks/use-market-keyboard-nav';
import { KardashevScene } from '@/components/KardashevScene';
import { getKardashevTier, getDominantAffinityPalette, getCivilizationName, type AffinityPalette } from '@/lib/kardashev';
import { hexRgba, CRYSTALS, TIER_CIVILIZATION, GEM_KEY_TO_HEX, localTurnVariants, DEAL_ANIM_MS, INITIAL_TURN_GUARD_MS, ABRIDGED_SHRINK_MS, ANIM_LOCK_BUFFER_MS, ABRIDGED_ACTION_MS, FORGE_FULL_MS, RESERVED_FORGE_FULL_MS, FALLBACK_FLIP_ANIM_MS, FALLBACK_FLIP_CLEANUP_MS, CIPHER_TAIL_BUFFER_MS, GEM_BURST_STAGGER_MS, GEM_BURST_BASE_MS, GEM_BURST_SETTLE_MS, ABRIDGED_FORGE_LOCK_MS, CIPHER_GAME_TOTAL_MS, CIPHER_DEAL_FIRE_DELAY_MS, ARRIVAL_LABEL_LINGER_MS } from './game-constants';
import { PlayerAvatar, OpponentChip, RematchCountdown } from './game-player';
import { MiniGem, BaseDialog, type EminenceBreakdown, ArtifactCardView, ForgedCardWithTooltip, QueuedOverlay, TurnCountdown, CardBack, EminenceDiamond } from './game-card';
import { LuminaryCard } from './game-luminary';
import { LuminaryOrderPicker } from './game-luminary-order-picker';
import { CompactCardGhost } from './game-animation';
import { CardMarkerBadge, CardKeywordOverlay, BurnBadgeOverlay, BurnFlash, DelayedEffectFloat, BoardDimOverlay, BloomSeedParticle, OrchardCopyPulse, SummonMarketOverlay } from './game-luminary-effects';
import { ForgeAnimation, OpponentForgeAnimation, AbridgedForgeAnimation } from './game-forge-animation';
import { VictoryCinematic } from '@/components/VictoryCinematic';
import { deriveAccolades } from '@/lib/accolades';

// Reverse of the server-side COLOR_LABEL table — maps affinity display name → GemKey.
// Used to parse the trailing affinity label out of action-log "switched …" summaries
// so the affinity-switch chime can be pitched to the correct gem frequency.
const AFFINITY_LABEL_TO_GEM_KEY: Record<string, GemKey> = {
  Flare:     'ruby',
  Continuum: 'sapphire',
  Verdance:  'emerald',
  Abyss:     'onyx',
  Radiance:  'pearl',
};

type ActiveTab = 'board' | 'hand' | 'log';

interface SelectedCard {
  card: ArtifactCard;
  fromReserve: boolean;
  canBuy: boolean;
  canReserve: boolean;
  effectiveCosts?: Partial<Record<GemKey, number>>;
  readOnly?: boolean;
}

// --- Centralized body scroll lock ---
// Pass ALL overlay open-states as a single array.  The body is pinned when
// any entry is true and restored when all entries are false.  Adding a new
// overlay is a one-line change in that array — no separately wired effect,
// no manually shared refs, no ref-counting boilerplate.
//
// Implementation note: a single useEffect that watches the derived
// `isAnyOpen` boolean is semantically equivalent to the old per-slot
// ref-counting approach.  React's effect lifecycle handles the
// lock/unlock transitions:
//   false → true  : effect body runs  → lock fires
//   true  → false : cleanup runs      → unlock fires
//   true  → true  : no re-run         → no spurious re-lock or restore
function useScrollLock(
  overlays: readonly boolean[],
  mainScrollRef: React.RefObject<HTMLElement | null>,
) {
  const lockedScrollYRef = useRef(0);
  const isAnyOpen = overlays.some(Boolean);

  useEffect(() => {
    if (!isAnyOpen) return;

    // First (or only) overlay open: capture scroll position and pin the body.
    lockedScrollYRef.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollYRef.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    return () => {
      // All overlays closed: restore the body and scroll position.
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo({ top: lockedScrollYRef.current, behavior: 'auto' });
      // Restore scroll focus to <main> so the next swipe immediately
      // scrolls the board — but only if the focus trap hasn't already
      // placed focus on a specific trigger element.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const main = mainScrollRef.current;
      if (main) {
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (!active || active === document.body || active === main) {
            main.focus({ preventScroll: true });
          }
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnyOpen]);
}


function ConnectionLostBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-between gap-3 px-4 py-2.5"
      style={{
        background: 'rgba(15, 6, 30, 0.97)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.35)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
        paddingTop: 'calc(0.625rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-violet-400" aria-hidden="true" />
        <span className="text-xs font-semibold text-violet-200 truncate">
          Connection lost — reconnecting…
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss connection warning"
        className="shrink-0 text-violet-400/70 hover:text-violet-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 rounded"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

function ReturnResultsBanner({
  bannerRef,
  onReturn,
}: {
  bannerRef: React.RefObject<HTMLButtonElement | null>;
  onReturn: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onReturn();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onReturn]);

  return (
    <motion.button
      ref={bannerRef}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      onClick={onReturn}
      role="button"
      aria-label="Return to results"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-foreground/80 border border-white/15 bg-black/70 backdrop-blur-sm hover:bg-black/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 shadow-lg"
    >
      <span>←</span>
      Results
    </motion.button>
  );
}

export default function GameBoard() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { account, isLoading: accountLoading, prefs: accountPrefs } = useAccount();
  const session = getSession();

  const isTutorial = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tutorial') === '1';
  }, []);
  const [tutorialStep, setTutorialStep] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tutorial') === '1' ? 0 : -1;
  });
  const [tutorialNudgeTick, setTutorialNudgeTick] = useState(0);
  const tutorialZone = (isTutorial && tutorialStep >= 0) ? (LUMII_ZONE_HIGHLIGHTS[tutorialStep] ?? null) : null;
  const tutorialAttention: LumiiAttentionState | null = (isTutorial && tutorialStep >= 0) ? (LUMII_ATTENTION[tutorialStep] ?? null) : null;
  const [hintsEnabled, setHintsEnabled] = useState<boolean>(
    () => localStorage.getItem('luminae_hints_enabled') !== '0'
  );
  const toggleHints = () => {
    const next = !hintsEnabled;
    setHintsEnabled(next);
    localStorage.setItem('luminae_hints_enabled', next ? '1' : '0');
    const session = getAccountSession();
    if (session?.token) {
      void apiUpdatePreferences(session.token, { hintsEnabled: next }).catch(() => undefined);
    }
  };

  const [abridgedAnims, setAbridgedAnims] = useState<boolean>(
    () => localStorage.getItem('luminae_abridged_anims') === '1'
  );
  const toggleAbridgedAnims = () => {
    const next = !abridgedAnims;
    setAbridgedAnims(next);
    localStorage.setItem('luminae_abridged_anims', next ? '1' : '0');
    const session = getAccountSession();
    if (session?.token) {
      void apiUpdatePreferences(session.token, { abridgedAnims: next }).catch(() => undefined);
    }
  };

  const [skipCinematics, setSkipCinematicsState] = useState<boolean>(() => getSkipCinematics());
  const toggleSkipCinematics = () => {
    const next = !skipCinematics;
    setSkipCinematicsState(next);
    const acctSession = getAccountSession();
    setSkipCinematics(next, acctSession?.account.id, acctSession?.token ?? undefined);
  };

  const [muted, setMuted] = useState(gameAudio.isMuted());
  const [selectedCrystals, setSelectedCrystals] = useState<Partial<CrystalCounts>>({});
  const [harvestBurstKeys, setHarvestBurstKeys] = useState<Partial<Record<GemKey, number>>>({});
  const [harvestBlockedKeys, setHarvestBlockedKeys] = useState<Partial<Record<GemKey, number>>>({});
  const pendingHarvestCheckRef = useRef<{ gems: GemKey[]; preCrystals: Partial<CrystalCounts>; tally: Partial<CrystalCounts>; submittedVersion: number } | null>(null);
  const [crystalHistory, setCrystalHistory] = useState<Array<keyof CrystalCounts>>([]);
  const [prePromotionHistory, setPrePromotionHistory] = useState<Array<keyof CrystalCounts> | null>(null);
  const [actionMode, setActionMode] = useState<'none' | 'take3' | 'take2'>('none');
  const [returnPhase, setReturnPhase] = useState<{
    pendingTake: Partial<CrystalCounts>;
    actionType: 'take3' | 'take2';
    excessCount: number;
  } | null>(null);
  const [returnSelections, setReturnSelections] = useState<Partial<CrystalCounts>>({});
  const [showUndoHint, setShowUndoHint] = useState(false);
  const [showReserveHint, setShowReserveHint] = useState(false);
  const [showForgeHint, setShowForgeHint] = useState(false);
  const [showDeckReserveHint, setShowDeckReserveHint] = useState(false);
  type CostMode = 'printed' | 'after_bonuses' | 'needed_now';
  const [costMode, setCostMode] = useState<CostMode>(() => {
    const stored = getAccountSession();
    if (!stored) return 'needed_now';
    const accountId = stored.account.id;
    const pref = localStorage.getItem(`luminae_cost_mode_pref_${accountId}`);
    if (pref === 'printed' || pref === 'after_bonuses' || pref === 'needed_now') return pref;
    return 'needed_now';
  });
  const [showPurchased, setShowPurchased] = useState(false);
  const [showActiveLuminaries, setShowActiveLuminaries] = useState(true);
  const [forgedView, setForgedView] = useState<'cards' | 'timeline'>('cards');
  const [marketCompact, setMarketCompact] = useState(false);
  const [deckPosition, setDeckPosition] = useState<'left' | 'right'>(() => {
    const stored = getAccountSession();
    const key = stored ? `luminae_deck_pos_${stored.account.id}` : 'luminae_deck_pos';
    const pref = localStorage.getItem(key);
    return pref === 'right' ? 'right' : 'left';
  });
  const toggleDeckPosition = () => {
    const next = deckPosition === 'left' ? 'right' : 'left';
    setDeckPosition(next);
    const stored = getAccountSession();
    const key = stored ? `luminae_deck_pos_${stored.account.id}` : 'luminae_deck_pos';
    localStorage.setItem(key, next);
  };
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');



  const [civLabel, setCivLabel] = useState<string>(() => {
    const stored = getAccountSession();
    if (!stored) return getDefaultCivName(getSavedAvatarId(), undefined);
    const saved = localStorage.getItem(`luminae_civ_name_${stored.account.id}`);
    if (saved && saved.trim()) return saved;
    return getDefaultCivName(getSavedAvatarId(), stored.account.username ?? stored.account.id);
  });
  const [isEditingCivName, setIsEditingCivName] = useState(false);
  const [civEditValue, setCivEditValue] = useState('');

  useEffect(() => {
    if (!account) return;
    localStorage.setItem(`luminae_civ_name_${account.id}`, civLabel);
  }, [civLabel, account]);

  // Sync all account preferences from the server on mount
  useEffect(() => {
    const session = getAccountSession();
    if (!session?.token || !session?.account?.id) return;
    syncAccountPreferences(session.token, session.account.id)
      .then((prefs) => {
        setHintsEnabled(prefs.hintsEnabled);
        setAbridgedAnims(prefs.abridgedAnims);
        setSkipCinematicsState(prefs.skipCinematics);
        gameAudio.setMuted(prefs.muted);
        setMuted(prefs.muted);
      })
      .catch(() => undefined);
  }, []);

  // React to preference updates pushed from AccountContext polling (cross-device sync)
  useEffect(() => {
    if (!accountPrefs) return;
    setHintsEnabled(accountPrefs.hintsEnabled);
    setAbridgedAnims(accountPrefs.abridgedAnims);
    setSkipCinematicsState(accountPrefs.skipCinematics);
    gameAudio.setMuted(accountPrefs.muted);
    setMuted(accountPrefs.muted);
  }, [accountPrefs]);

  // Scroll the highlighted tutorial zone into view whenever it changes
  useEffect(() => {
    if (!isTutorial || !tutorialZone) return;
    const el = document.querySelector(`[data-tutorial-zone="${tutorialZone}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isTutorial, tutorialZone]);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [cardDetailDiscovered, setCardDetailDiscovered] = useState<boolean>(
    () => localStorage.getItem('luminae_card_detail_discovered') === 'true'
  );
  const [cardFlipped, setCardFlipped] = useState(false);
  const [pendingSheetAction, setPendingSheetAction] = useState<'forge' | 'reserve' | 'plan_forge' | 'plan_reserve' | 'assimilate' | null>(null);
  const [selectedDeckTier, setSelectedDeckTier] = useState<1 | 2 | 3 | null>(null);
  const [pendingDeckConfirm, setPendingDeckConfirm] = useState(false);
  const [btnAnimKey, setBtnAnimKey] = useState(0);
  const [btnAnimTarget, setBtnAnimTarget] = useState<string | null>(null);
  const [btnAnimType, setBtnAnimType] = useState<'select' | 'confirm'>('select');
  const [harnessPulseKey, setHarnessPulseKey] = useState(0);
  const [sentFlashBtn, setSentFlashBtn] = useState<string | null>(null);
  const sentFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (sentFlashRef.current) clearTimeout(sentFlashRef.current); }, []);
  const [coreActionSubmitted, setCoreActionSubmitted] = useState(false);
  const [purchaseBurst, setPurchaseBurst] = useState<{ key: number; lumens: number; name: string } | null>(null);
  const burstKeyRef = useRef(0);
  /** Pulse rings that appear on the Hand tab when a forged card is absorbed. */
  /** Opponent forge fly-to-chip animation — card shrinks and flies into the opponent's chip. */
  const [opponentForgeAbsorb, setOpponentForgeAbsorb] = useState<{
    key: number;
    card: ArtifactCard;
    tier: number;
    startRect: { x: number; y: number; w: number; h: number };
    chipCenter: { x: number; y: number };
    ownerName?: string;
    spentColors?: GemKey[];
  } | null>(null);
  const opponentForgeAbsorbKeyRef = useRef(0);
  /** Hand-tab absorb flash — fires when an abridged-mode local forge card arrives at the Civilization tab. */
  const [handTabAbsorbFlash, setHandTabAbsorbFlash] = useState<{
    key: number; pos: { x: number; y: number }; color: string;
  } | null>(null);
  const planSubmitInFlight = useRef(false);
  const [gemBurst, setGemBurst] = useState<{
    key: number;
    gems: GemKey[];
    playerName: string;
    avatarId: string | null;
  } | null>(null);
  const gemBurstKeyRef = useRef(0);
  const gemBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTakeBurstActionRef = useRef<string | null>(null);
  // True when the optimistic token-flip already fired from a click-path harvest.
  // Lets the WS handler skip re-firing for normal harvests while still firing
  // for planned harvests (which skip the click path entirely).
  const optimisticHarvestFiredRef = useRef(false);
  const reserveBurstActionRef = useRef<string | null>(null);
  const lastMarketBurstActionRef = useRef<string | null>(null);
  const cardSheetContainerRef = useRef<HTMLElement | null>(null);
  const reservedOverlayContainerRef = useRef<HTMLElement | null>(null);
  const deckSheetContainerRef = useRef<HTMLElement | null>(null);
  const rulesSheetContainerRef = useRef<HTMLElement | null>(null);
  const forgedOverlayContainerRef = useRef<HTMLElement | null>(null);
  const burnPileOverlayContainerRef = useRef<HTMLElement | null>(null);
  const luminarySheetContainerRef = useRef<HTMLElement | null>(null);
  const winOverlayContainerRef = useRef<HTMLElement | null>(null);
  const [selectedLuminary, setSelectedLuminary] = useState<Luminary | null>(null);
  const [auraPreviewLuminaryId, setAuraPreviewLuminaryId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showAllLog, setShowAllLog] = useState(false);
  const [showBoardViewLog, setShowBoardViewLog] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showEminenceBreakdown, setShowEminenceBreakdown] = useState(false);
  const [showForgedOverlay, setShowForgedOverlay] = useState(false);
  const [forgedFilter, setForgedFilter] = useState<GemKey | null>(null);
  const [showBurnPileOverlay, setShowBurnPileOverlay] = useState(false);
  const [showReservedOverlay, setShowReservedOverlay] = useState(false);
  const [expandedOpponents, setExpandedOpponents] = useState<Set<string>>(new Set());
  const [testPanelCollapsed, setTestPanelCollapsed] = useState(false);
  const [expandedLumEffects, setExpandedLumEffects] = useState<Set<string>>(new Set());
  const [summonQueue, setSummonQueue] = useState<Array<{
    id: string; name: string; domain: string; lumens: number; flavor: string;
    claimedBy?: string; // player name who claimed this Luminary
    cardRect?: { cx: number; cy: number; w: number };
    eventId: string;    // stable server event ID (or 'dev-test-<id>' for dev panel)
    isDevTest: boolean; // dev tests skip the server resolve_summon call
    winSealingColor?: string; // summonColor of the Luminary when this event seals a win
  }>>([]);
  // Tracks which server summon eventIds have already been pushed into the queue
  // so that duplicate WebSocket / reconnect deliveries are safely deduped.
  const handledSummonEventIdsRef = useRef(new Set<string>());
  // True when the user pressed "Skip view" on the active cutscene.
  // The cutscene stays mounted (timer runs) but the overlay is hidden.
  const [localSummonSkipped, setLocalSummonSkipped] = useState(false);
  // Prevents the initial-state pending-summon check from running twice.
  const checkedInitialSummonRef = useRef(false);
  // Stable ref to enqueueSummon — populated after it is defined below (after
  // the early return) so the initial-load useEffect can call it safely.
  const enqueueSummonRef = useRef<(
    lumId: string,
    lumName: string,
    lumDomain: string,
    lumLumens: number,
    lumFlavor: string,
    eventId: string,
    isDevTest: boolean,
    winSealingColor?: string,
    claimedBy?: string,
  ) => void>(() => {});
  // Luminary IDs that have been detected as newly summoned in processUpdate but
  // whose summonQueue entry hasn't been added yet (RAF chain pending). Used to
  // suppress the vortex portal during those few frames so it never flashes
  // before the cutscene starts. Cleared when the entry lands in summonQueue.
  const pendingSuppressLumIdsRef = useRef(new Set<string>());
  // Tracks current summonQueue length for stale-closure-safe reads inside processUpdate.
  const summonQueueLenRef = useRef(0);
  // Counts summon events that have been dispatched to enqueueSummon but have not
  // yet landed in summonQueue (i.e. still mid-RAF-chain). The flush effect uses
  // this to avoid releasing pendingGameOver before the cutscenes actually start.
  const enqueuingCountRef = useRef(0);
  // True when status just became 'finished' but summons are still in flight.
  // The win overlay and win audio are held back until the summon queue drains.
  const [pendingGameOver, setPendingGameOver] = useState(false);
  const [showCinematic, setShowCinematic] = useState(() => !getSkipCinematics());
  const [showWinOverlay, setShowWinOverlay] = useState(true);
  const returnBannerRef = useRef<HTMLButtonElement | null>(null);
  // summonColor of the Luminary that sealed the game (set when pendingGameOver goes
  // true). Read by the flush effect to play the affinity fanfare before playWin().
  const pendingGameOverLumColorRef = useRef<string>('');
  // Guard that prevents the flush effect from firing the fanfare twice if the
  // summonQueue.length dep oscillates while pendingGameOver is still true.
  const fanfareFiredForGameOverRef = useRef(false);
  // Guard that prevents the initial-load win fanfare from firing more than once
  // per component lifetime (covers page reloads, spectators, latecomers).
  const winFanfareOnLoadFiredRef = useRef(false);
  // True once status transitions to 'finished' — prevents doEnqueue from pushing
  // new summons after the game ends (only the already-active cutscene is allowed to finish).
  const gameFinishedRef = useRef(false);
  // ── Activation cinematic queue ─────────────────────────────────────────────
  // Unlike summon events, activation events do NOT gate game progression.
  // They just enqueue a ~4s full-screen cinematic and auto-dismiss.
  const [activationQueue, setActivationQueue] = useState<PendingLuminaryActivationEvent[]>([]);
  const handledActivationEventIdsRef = useRef(new Set<string>());
  // IDs of luminaries claimed in this session — their entity overlay persists.
  const [claimedThisSession, setClaimedThisSession] = useState<string[]>([]);
  // DEV-only: luminary IDs whose portal visual is toggled on for local preview.
  // Client-side only — never written to the server.
  const [turnAnnouncement, setTurnAnnouncement] = useState<{
    key: number;
    playerName: string;
    avatarId: string | null;
    isYou: boolean;
    accentColor: string;
    eminence: number;
    turnStartedAt: number;
    timerSeconds: number | null;
  } | null>(null);
  const turnAnnounceKeyRef = useRef(0);
  const turnAnnounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncedTurnRef = useRef<string | null>(null);
  const initialTurnFiredRef = useRef(false);
  const animationEndTimeRef = useRef(0);
  // Timer handle for the animation-barrier delay before the victory cinematic starts.
  // Cleared on unmount to prevent a stale callback firing after navigation.
  const winBarrierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stores remaining barrier ms captured in the summon path so the pendingGameOver
  // flush effect can still respect it (summon cutscene always outlasts typical anims,
  // so this resolves to 0 in practice but keeps the logic consistent).
  const animBarrierMsRef = useRef(0);
  const pendingTurnAnnounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateQueueRef = useRef<GameState[]>([]);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processUpdateRef = useRef<(s: GameState) => void>(() => {});
  const drainQueueFnRef = useRef<() => void>(() => {});
  // Tracks WS health so the REST poll can back off to 30 s when the socket is
  // live. Updated inline on each render (safe — refs are always current inside
  // the refetchInterval callback which runs outside the render cycle).
  const wsConnectedRef = useRef(false);

  const [cardActionBurst, setCardActionBurst] = useState<{
    key: number;
    card: ArtifactCard;
    tier: number;
    actionType: 'purchase' | 'reserve';
    playerName: string;
    avatarId: string | null;
    lumens: number;
    gotFlux: boolean;
    startRect: { x: number; y: number; w: number; h: number };
    /** Center of the nav tab the card should fly into at the end of the burst.
     *  Undefined for remote-player purchases — card shrinks in place. */
    destPos?: { x: number; y: number };
    /** Which affinity colors the player spent (for energy-stream animation). */
    spentColors: GemKey[];
  } | null>(null);
  const cardActionBurstKeyRef = useRef(0);
  const cardAnimTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [cipherBurst, setCipherBurst] = useState<{
    key: number;
    sourceRect: { x: number; y: number; w: number; h: number };
    affinityHex: string;
    cardName: string;
    gotFlux: boolean;
    card: ArtifactCard;
    tier: number;
    destPos?: { x: number; y: number };
    ownerName?: string;
  } | null>(null);
  const cipherBurstKeyRef = useRef(0);
  const cipherBurstIsDeckRef = useRef(false);
  const [singularityAbsorbKey, setSingularityAbsorbKey] = useState(0);
  const [hiddenSlots, setHiddenSlots] = useState<Set<string>>(new Set());
  // Ghost cards: keeps OLD market cards visible in their slots while waiting for
  // burst animations to start (during queue-drain delay).  Keyed by slotKey so
  // multiple simultaneous queued purchases each keep their own ghost.  A slot's
  // ghost is cleared atomically with setCardActionBurst / setCipherBurst so the
  // card transitions directly from "in slot" to "flying in overlay" with no flash.
  const [burstGhostCards, setBurstGhostCards] = useState<Record<string, ArtifactCard>>({});
  const [flippingCards, setFlippingCards] = useState<Set<string>>(new Set());
  // Fire-and-forget ghost independent of flippingCards so pre-cleanup can't kill it mid-flight.
  const [compactGhost, setCompactGhost] = useState<{
    id: string;
    cardViewProps: React.ComponentProps<typeof ArtifactCardView>;
    chipRect: DOMRect;
  } | null>(null);
  // v0.8 Luminary animation state
  const burnChipAnim = useAnimation();
  const [burnFlashes, setBurnFlashes] = useState<Array<{ id: string; slotRect: DOMRect; sourceLuminaryId?: string }>>([]);
  const [burnBadgeOverlays, setBurnBadgeOverlays] = useState<Array<{ id: string; slotRect: DOMRect }>>([]);
  const [delayedEffectFloats, setDelayedEffectFloats] = useState<Array<{ id: string; amount: number; color: string; originRect: DOMRect }>>([]);
  const [boardDimKey, setBoardDimKey] = useState(0);
  const [bloomSeedParticles, setBloomSeedParticles] = useState<Array<{ id: string; from: DOMRect; to: DOMRect }>>([]);
  const [orchardCopyPulseKey, setOrchardCopyPulseKey] = useState(0);
  const [showSeedBoardEffect, setShowSeedBoardEffect] = useState(false);
  const orchardPortalRectRef = useRef<DOMRect | null>(null);
  const [summonOverlays, setSummonOverlays] = useState<Array<{ id: string; lumId: string }>>([]);
  // Luminary currently undergoing a summon-flash animation (zoom + flash effect)
  const [flashLumId, setFlashLumId] = useState<string | null>(null);
  const prevStateForAnimRef = useRef<typeof state>(null);
  const [dealingCard, setDealingCard] = useState<{
    card: ArtifactCard;
    tier: number;
    deckRect: { x: number; y: number; w: number; h: number };
    slotRect: { x: number; y: number; w: number; h: number };
    // Precomputed stable animate targets — created once at deal-start so the
    // motion.div receives the same array references across re-renders.  If
    // these were computed inline, every React re-render (e.g. the
    // setHandAbsorbBurst(null) call at t≈4100ms) would pass new array
    // instances to Framer Motion, which compares by reference and can
    // short-circuit the in-flight animation, firing onAnimationComplete early
    // and revealing the card before the deal completes.
    animX: number[];
    animY: number[];
    animRotateY: [number, number, number];
    animScale: [number, number, number];
    faceScale: number;
  } | null>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const playerPanelRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const overlayOpenRef = useRef(false);
  // Tracks how many AI affinity-change log entries have already triggered the
  // switch sound, so that we only fire for genuinely new entries.
  const seenAiAffinityLogCountRef = useRef(0);
  // True after the first actionLog effect run — prevents spurious sounds from
  // replaying historical log entries that were already present on page load.
  const aiAffinityLogInitializedRef = useRef(false);

  const toggleMute = () => {
    const next = gameAudio.toggleMute();
    setMuted(next);
    const session = getAccountSession();
    if (session?.token) {
      void apiUpdatePreferences(session.token, { muted: next }).catch(() => undefined);
    }
  };


  // Start ambient music when the game board mounts (user has already
  // interacted via buttons to get here, so AudioContext is allowed).
  // Stop and clean up when they leave the game.
  useEffect(() => {
    gameAudio.startMusic();
    return () => { gameAudio.stopMusic(); };
  }, []);

  // Scroll-passthrough fix.
  // Problem: the player panel and the main board area are siblings, not
  // parent/child. When a swipe gesture *starts* on the panel and moves up
  // into the board area, iOS/Android never delivers that gesture to <main>
  // because the touch origin is outside <main>'s bounds.
  //
  // Fix: attach native touchstart + touchmove listeners to the panel.
  // Once the gesture exceeds a small threshold (8 px) we treat it as a
  // deliberate scroll and forward each incremental delta to <main>.scrollBy.
  // Passive listeners are used throughout so we never block the browser's
  // default scroll handling for gestures that originate inside <main>.
  useEffect(() => {
    const panel = playerPanelRef.current;
    const main  = mainScrollRef.current;
    if (!panel || !main) return;

    let startY    = 0;
    let lastY     = 0;
    let forwarding = false;
    let touchOnCarousel = false;

    const onTouchStart = (e: TouchEvent) => {
      // If the touch began inside the horizontal affinity-well carousel, don't
      // set up vertical forwarding — the carousel owns that gesture context.
      touchOnCarousel = !!(e.target as Element | null)?.closest('[data-well-carousel]');
      startY     = e.touches[0].clientY;
      lastY      = startY;
      forwarding = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Do not forward touch events while any overlay is open — doing so
      // corrupts the main scroll position and leaves it stuck after dismiss.
      if (overlayOpenRef.current) return;
      // Do not forward gestures that originated in the horizontal carousel.
      if (touchOnCarousel) return;

      const currentY   = e.touches[0].clientY;
      const totalDelta = startY - currentY; // +ve = swipe up

      // Only commit to forwarding once the gesture is clearly intentional.
      if (!forwarding && Math.abs(totalDelta) > 8) forwarding = true;

      if (forwarding) {
        const step = lastY - currentY; // +ve = scroll content up
        main.scrollBy(0, step);
      }

      lastY = currentY;
    };

    // Also release any focused panel element the moment a touch begins
    // inside <main>, so a board-area swipe is never blocked by a prior tap.
    const onMainTouchStart = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && panel.contains(active)) active.blur();
    };

    panel.addEventListener('touchstart', onTouchStart, { passive: true });
    panel.addEventListener('touchmove',  onTouchMove,  { passive: true });
    main .addEventListener('touchstart', onMainTouchStart, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove',  onTouchMove);
      main .removeEventListener('touchstart', onMainTouchStart);
    };
  }, []);

  // All overlay open-states in one place.
  // IMPORTANT — when adding a new overlay, add its boolean here.
  // useScrollLock below reads this same array, so you only need to update
  // this one list; no separately wired scroll-lock effect is required.
  const overlayStates = [!!selectedCard, showReservedOverlay, showForgedOverlay, showBurnPileOverlay, !!selectedLuminary, !!auraPreviewLuminaryId] as const;
  const isAnyOverlayOpen = overlayStates.some(Boolean);

  // Keep overlayOpenRef in sync so the touch-forwarding handler above can
  // read it without being re-registered on every state change.
  useEffect(() => {
    overlayOpenRef.current = isAnyOverlayOpen;
  }, [isAnyOverlayOpen]);

  // Body scroll lock — a single call covering all overlays at once.
  // To add a new overlay, append its boolean to the overlayStates array above.
  useScrollLock(overlayStates, mainScrollRef);

  // Focus-trap: card action sheet
  // handleEscape: false — useEscapeToClose owns Escape for all game sheets.
  useFocusTrap(
    cardSheetContainerRef,
    !!selectedCard,
    () => { setSelectedCard(null); setPendingSheetAction(null); },
    { handleEscape: false },
  );

  // Focus-trap: reserved cards overlay
  useFocusTrap(
    reservedOverlayContainerRef,
    showReservedOverlay,
    () => setShowReservedOverlay(false),
    { handleEscape: false },
  );

  // Focus-trap: deck reserve sheet
  useFocusTrap(
    deckSheetContainerRef,
    selectedDeckTier !== null,
    () => { setSelectedDeckTier(null); setPendingDeckConfirm(false); },
    { handleEscape: false },
  );

  // Focus-trap: rules sheet
  useFocusTrap(
    rulesSheetContainerRef,
    showRules,
    () => setShowRules(false),
    { handleEscape: false },
  );

  // Focus-trap: luminary detail sheet
  useFocusTrap(
    luminarySheetContainerRef,
    !!selectedLuminary,
    () => setSelectedLuminary(null),
    { handleEscape: false },
  );

  // Focus-trap: forged cards overlay
  useFocusTrap(
    forgedOverlayContainerRef,
    showForgedOverlay,
    () => { setShowForgedOverlay(false); setForgedFilter(null); },
    { handleEscape: false },
  );

  // Focus-trap: burn pile overlay
  useFocusTrap(
    burnPileOverlayContainerRef,
    showBurnPileOverlay,
    () => setShowBurnPileOverlay(false),
    { handleEscape: false },
  );

  // Escape-to-close: closes whichever sheet is open when Esc is pressed.
  // Priority order — most contextual/recently-opened first so that nested
  // sheets close inner-to-outer (e.g. card sheet before reserved overlay).
  useEscapeToClose([
    { isOpen: !!auraPreviewLuminaryId,  onClose: () => setAuraPreviewLuminaryId(null) },
    { isOpen: !!selectedCard,           onClose: () => { setSelectedCard(null); setPendingSheetAction(null); } },
    { isOpen: !!selectedLuminary,       onClose: () => setSelectedLuminary(null) },
    { isOpen: selectedDeckTier !== null, onClose: () => { setSelectedDeckTier(null); setPendingDeckConfirm(false); } },
    { isOpen: showForgedOverlay,        onClose: () => { setShowForgedOverlay(false); setForgedFilter(null); } },
    { isOpen: showBurnPileOverlay,      onClose: () => setShowBurnPileOverlay(false) },
    { isOpen: showReservedOverlay,      onClose: () => setShowReservedOverlay(false) },
    { isOpen: showRules,                onClose: () => setShowRules(false) },
    { isOpen: showEminenceBreakdown,    onClose: () => setShowEminenceBreakdown(false) },
  ]);

  // Keyboard shortcuts — suppressed while any modal/sheet is open or a text input is focused.
  // Covers panels not in overlayStates (rules, eminence breakdown, deck sheet) so that
  // focus-trapped dialogs are never interrupted by a shortcut.
  const isAnyPanelOpen =
    isAnyOverlayOpen ||
    showRules ||
    showEminenceBreakdown ||
    selectedDeckTier !== null;

  useGameKeyboardShortcuts({
    isAnyOverlayOpen: isAnyPanelOpen,
    onBoard: () => setActiveTab('board'),
    onHand: () => setActiveTab('hand'),
    onLog: () => setActiveTab('log'),
    onToggleReserved: () => setShowReservedOverlay((v) => !v),
    onToggleForged: () => {
      if (showForgedOverlay) {
        setShowForgedOverlay(false);
        setForgedFilter(null);
      } else {
        setShowForgedOverlay(true);
      }
    },
    onToggleRules: () => setShowRules((v) => !v),
  });

  // Swipe-to-dismiss: drag handle → swipe down ≥30% height dismisses the sheet.
  // scrollableAreaProps can be spread on any overflow-y-auto child so that a
  // downward swipe from scrollTop=0 also activates the drag, while normal
  // scroll is never interrupted when the content is not at the top.
  // backdropOpacity / sheetScale are live motion values for visual drag feedback.
  // isOpen is passed so the hook can reset internal peek state whenever the
  // sheet re-opens via a non-drag path (backdrop tap, close button, etc.).
  // peekHeight is set on the card-detail sheet: a partial drag snaps to 40 %
  // visible so players can glance at the board mid-review; each sheet can opt
  // in independently by adding peekHeight to its own options object.
  const { dragProps: cardSheetDragProps, handleBarProps: cardSheetHandleBarProps, scrollableAreaProps: cardSheetScrollableProps, backdropOpacity: cardSheetBackdropOpacity, sheetScale: cardSheetScale, peekProgress: cardSheetPeekProgress } =
    useSwipeToDismiss(cardSheetContainerRef, () => { setSelectedCard(null); setPendingSheetAction(null); }, { isOpen: selectedCard !== null, peekHeight: 0.4 });
  const { dragProps: deckSheetDragProps, handleBarProps: deckSheetHandleBarProps, scrollableAreaProps: deckSheetScrollableProps, backdropOpacity: deckSheetBackdropOpacity, sheetScale: deckSheetScale, peekProgress: deckSheetPeekProgress } =
    useSwipeToDismiss(deckSheetContainerRef, () => { setSelectedDeckTier(null); setPendingDeckConfirm(false); }, { isOpen: selectedDeckTier !== null, peekHeight: 0.4 });
  const { dragProps: rulesSheetDragProps, handleBarProps: rulesSheetHandleBarProps, scrollableAreaProps: rulesSheetScrollableProps, backdropOpacity: rulesSheetBackdropOpacity, sheetScale: rulesSheetScale } =
    useSwipeToDismiss(rulesSheetContainerRef, () => setShowRules(false), { isOpen: showRules });
  const { dragProps: luminarySheetDragProps, handleBarProps: luminarySheetHandleBarProps, scrollableAreaProps: luminarySheetScrollableProps, backdropOpacity: luminarySheetBackdropOpacity, sheetScale: luminarySheetScale } =
    useSwipeToDismiss(luminarySheetContainerRef, () => setSelectedLuminary(null), { isOpen: !!selectedLuminary });
  const { dragProps: reservedSheetDragProps, handleBarProps: reservedSheetHandleBarProps, scrollableAreaProps: reservedSheetScrollableProps, backdropOpacity: reservedSheetBackdropOpacity, sheetScale: reservedSheetScale, peekProgress: reservedSheetPeekProgress } =
    useSwipeToDismiss(reservedOverlayContainerRef, () => setShowReservedOverlay(false), { isOpen: showReservedOverlay, peekHeight: 0.4 });
  const { dragProps: forgedSheetDragProps, handleBarProps: forgedSheetHandleBarProps, makeScrollableAreaProps: forgedSheetMakeScrollableAreaProps, backdropOpacity: forgedSheetBackdropOpacity, sheetScale: forgedSheetScale, peekProgress: forgedSheetPeekProgress } =
    useSwipeToDismiss(forgedOverlayContainerRef, () => { setShowForgedOverlay(false); setForgedFilter(null); }, { isOpen: showForgedOverlay, peekHeight: 0.4 });
  const { dragProps: burnPileSheetDragProps, handleBarProps: burnPileSheetHandleBarProps, scrollableAreaProps: burnPileSheetScrollableProps, backdropOpacity: burnPileSheetBackdropOpacity, sheetScale: burnPileSheetScale } =
    useSwipeToDismiss(burnPileOverlayContainerRef, () => setShowBurnPileOverlay(false), { isOpen: showBurnPileOverlay });
  // Two separate scrollable areas in the forged sheet: the filter-pill header row
  // (overflow-x-auto, single line) and the card grid body (overflow-y-auto).
  // Each area gets its own makeScrollableAreaProps() instance so both scroll positions
  // are independently preserved across peek↔open transitions.
  const forgedPillsScrollableProps = forgedSheetMakeScrollableAreaProps({ axis: 'horizontal' });
  const forgedBodyScrollableProps = forgedSheetMakeScrollableAreaProps();

  const TURN_ANNOUNCE_DURATION = 1800;
  const OPPONENT_ANNOUNCE_DURATION = 1100;

  const setAnimEndTime = (durationMs: number) => {
    const end = Date.now() + durationMs;
    if (end > animationEndTimeRef.current) animationEndTimeRef.current = end;
  };

  const fireTurnAnnouncement = (
    dedupeKey: string,
    playerName: string,
    avatarId: string | null,
    isYou: boolean,
    accentColor: string,
    eminence: number,
    timerSeconds: number | null,
  ) => {
    if (dedupeKey === lastAnnouncedTurnRef.current) return;
    lastAnnouncedTurnRef.current = dedupeKey;
    if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
    pendingTurnAnnounceRef.current = null;

    const duration = isYou ? TURN_ANNOUNCE_DURATION : OPPONENT_ANNOUNCE_DURATION;

    const doFire = () => {
      const stillRemaining = animationEndTimeRef.current - Date.now();
      if (stillRemaining > 50) {
        pendingTurnAnnounceRef.current = setTimeout(doFire, stillRemaining + 100);
        return;
      }
      if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
      turnAnnounceKeyRef.current += 1;
      const seq = turnAnnounceKeyRef.current;
      setTurnAnnouncement({ key: seq, playerName, avatarId, isYou, accentColor, eminence, turnStartedAt: Date.now(), timerSeconds });
      setAnimEndTime(duration);
      if (isYou) gameAudio.playTurnStart();
      else gameAudio.playOpponentTurnStart();
      turnAnnounceTimerRef.current = setTimeout(() => {
        if (turnAnnounceKeyRef.current === seq) setTurnAnnouncement(null);
        turnAnnounceTimerRef.current = null;
      }, duration);
      pendingTurnAnnounceRef.current = null;
    };

    const remaining = animationEndTimeRef.current - Date.now();
    if (remaining > 50) {
      pendingTurnAnnounceRef.current = setTimeout(doFire, remaining + 100);
    } else {
      doFire();
    }
  };

  const cancelTurnAnnouncement = () => {
    if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
    pendingTurnAnnounceRef.current = null;
    if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
    turnAnnounceTimerRef.current = null;
    setTurnAnnouncement(null);
  };

  // Immediately cancel all pending pre-win visual animations so the win overlay
  // can appear without waiting for queued card/summon animations to drain.
  // Does NOT affect audio — win fanfare and playWin() still fire normally.
  // Should be called at the moment game-over is detected.
  const cancelPendingAnimations = () => {
    // Reset the animation barrier so drainQueue stops waiting.
    animationEndTimeRef.current = 0;
    // Cancel every tracked card-animation timer (burst, deal, flip watchdogs, etc.).
    for (const t of cardAnimTimersRef.current) clearTimeout(t);
    cardAnimTimersRef.current = [];
    // Cancel the pending queue-drain timer and discard all queued state updates.
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current);
      queueTimerRef.current = null;
    }
    stateQueueRef.current = [];
    // Clear ghost cards that were waiting for burst animations to start.
    setBurstGhostCards({});
  };


  useEffect(() => {
    return () => {
      for (const t of cardAnimTimersRef.current) clearTimeout(t);
      cardAnimTimersRef.current = [];
      if (gemBurstTimerRef.current) clearTimeout(gemBurstTimerRef.current);
      if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
      if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
      if (winBarrierTimerRef.current) clearTimeout(winBarrierTimerRef.current);
      stateQueueRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!session || session.roomId !== roomId) setLocation('/');
  }, [session, roomId, setLocation]);

  const { data: state, error } = useGetGameState(
    roomId!,
    { sessionToken: session?.sessionToken || '' },
    {
      query: {
        enabled: !!roomId && !!session,
        queryKey: getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }),
        // Poll every 4 s as a fallback for when the WebSocket drops mid-game.
        // When WebSocket is healthy the WS state_update messages keep the cache
        // current and these fetches mostly return 304s. When WebSocket is down
        // (proxy killed idle connection, brief network hiccup, etc.) this
        // ensures AI turns and opponent moves are never missed.
        refetchInterval: (query) => {
          const data = query.state.data as { status?: string } | undefined;
          if (data?.status === 'finished') return false;
          // Back off to 30 s when WebSocket is healthy — WS state_update
          // messages keep the cache current, so polling is just a safety net.
          // Drop to 4 s when WS is down to catch missed AI turns quickly.
          return wsConnectedRef.current ? 30_000 : 4_000;
        },
        refetchIntervalInBackground: false,
      },
    }
  );

  const { data: loreCatalog } = useGetCardLoreCatalog();

  // When a tutorial game fails to load due to a stale/missing room (401, 403,
  // or 404), silently clear the session and restart the tutorial instead of
  // leaving the player on a dead error screen. Transient network errors are
  // intentionally excluded so a brief outage does not force a full re-enroll.
  useEffect(() => {
    if (error && isTutorial) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403 || status === 404) {
        clearSession();
        setLocation('/tutorial');
      }
    }
  }, [error, isTutorial, setLocation]);

  useEffect(() => {
    setCoreActionSubmitted(false);
  }, [state?.currentPlayerIndex]);

  // v0.8 — which Luminaries currently have a pending delayed effect.
  // Drives the ArmedSigil on the Luminary portal.
  const armedLumIds = useMemo(() => {
    if (!state) return new Set<string>();
    const claimedIds = new Set(state.players.flatMap(p => p.claimedLuminaryIds ?? []));
    const armed = new Set<string>();
    if (claimedIds.has('lum_radiant') && !state.concordanceMandalaTriggered) armed.add('lum_radiant');
    if (claimedIds.has('lum_bloom'))                                          armed.add('lum_bloom');
    if (claimedIds.has('lum_orchard') && !state.glassOrchardTriggered)       armed.add('lum_orchard');
    if (claimedIds.has('lum_seed') && !!state.avatarSeedOwnerId)             armed.add('lum_seed');
    return armed;
  }, [state]);

  // Market keyboard navigation — roving tabindex for the 3×N card Forge grid.
  // Counts how many keyboard-navigable (non-ghost, non-hidden, non-null) cards
  // exist per tier row so the hook knows when to wrap focus.
  const marketTierCardCounts = useMemo(() => {
    if (!state) return [0, 0, 0];
    return [
      { tierNum: 3, cards: state.marketTier3 },
      { tierNum: 2, cards: state.marketTier2 },
      { tierNum: 1, cards: state.marketTier1 },
    ].map(({ tierNum, cards }) =>
      cards.filter((c, i) => {
        const sk = `${tierNum}-${i}`;
        return !burstGhostCards[sk] && !hiddenSlots.has(sk) && c !== null;
      }).length,
    );
  }, [state, burstGhostCards, hiddenSlots]);

  const { getCardFocusProps } = useMarketKeyboardNav(marketTierCardCounts);

  useEffect(() => {
    if (!initialTurnFiredRef.current && state && state.status === 'playing' && session) {
      initialTurnFiredRef.current = true;
      setAnimEndTime(INITIAL_TURN_GUARD_MS);
      const cp = state.players[state.currentPlayerIndex];
      if (!cp) return;
      const key = `init-${state.currentPlayerIndex}-${state.version}`;
      const isMe = cp.playerId === session.playerId;
      if (isMe && !isTutorial) {
        const firstLumId = cp.claimedLuminaryIds?.[0];
        const lum = firstLumId ? state.luminaries.find(l => l.id === firstLumId) : undefined;
        const accentColor = lum?.summonColor ?? '#6366f1';
        fireTurnAnnouncement(key, cp.playerName, cp.avatarId ?? null, true, accentColor, cp.lumens, state.turnTimerSeconds ?? null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status, state?.version]);

  // ── Initial-load summon check ─────────────────────────────────────────────
  // Picks up any pendingSummonEvents already in the REST-loaded state (page
  // load / reconnect) where no subsequent WebSocket delta will fire a diff.
  // Also seeds claimedThisSession with every already-resolved Luminary so
  // idle entity overlays are restored immediately after a page reload or
  // navigation away and back (without needing to replay the cutscene).
  // Placed after `state` is declared but before early returns so hook order
  // is always stable across renders.
  useEffect(() => {
    if (checkedInitialSummonRef.current) return;
    if (!state) return;
    checkedInitialSummonRef.current = true;
    const pending = state?.pendingSummonEvents ?? [];
    // If the game was already finished when we loaded, identify the sealing
    // Luminary so its cutscene burst visuals can use the correct summonColor.
    const initialWinTrigId = state.winTriggerLuminaryId ?? undefined;
    for (const evt of pending) {
      const lum = state?.luminaries?.find((l: Luminary) => l.id === evt.luminaryId);
      if (lum) {
        const isSealing = initialWinTrigId && evt.luminaryId === initialWinTrigId;
        // summonColor is read from the server-side Luminary object here (rather
        // than getLuminaryVisuals) because `lum` is already in hand from the
        // state query and both sources hold the same value. The frontend asset
        // map (LUMINARY_VISUALS) is the canonical reference for any new code
        // that doesn't have a Luminary object readily available.
        const wsc: string | undefined = isSealing ? (lum.summonColor ?? '') || undefined : undefined;
        const claimer = (state?.players ?? []).find((p: { claimedLuminaryIds?: string[] }) =>
          (p.claimedLuminaryIds ?? []).includes(evt.luminaryId));
        enqueueSummonRef.current(
          evt.luminaryId, lum.name, lum.domain ?? '',
          lum.oblivion ? -lum.oblivion : lum.lumens, lum.flavor ?? '', evt.eventId, false, wsc,
          (claimer as { playerName?: string })?.playerName,
        );
      }
    }
    // Seed idle overlays for Luminaries already claimed before this page load.
    // Exclude any that still have a pending summon event — they will self-add
    // to claimedThisSession when their cutscene completes.
    const pendingIds = new Set(pending.map(e => e.luminaryId));
    const alreadyClaimed: string[] = [];
    for (const player of (state.players ?? [])) {
      for (const lumId of (player.claimedLuminaryIds ?? [])) {
        if (!pendingIds.has(lumId) && !alreadyClaimed.includes(lumId)) {
          alreadyClaimed.push(lumId);
        }
      }
    }
    if (alreadyClaimed.length > 0) {
      setClaimedThisSession(alreadyClaimed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!state]);

  // ── Initial-load win fanfare ───────────────────────────────────────────────
  // If the page loads (or reloads) when state.status is already 'finished',
  // play the affinity fanfare + win audio once.  This covers spectators,
  // latecomers, and players who refresh after the game ends — none of whom
  // experience the live status transition handled by processUpdate.
  useEffect(() => {
    if (winFanfareOnLoadFiredRef.current) return;
    if (!state) return;
    if (state.status !== 'finished') return;
    winFanfareOnLoadFiredRef.current = true;
    const winnerPlayer = (state.players as GamePlayerState[]).find(
      p => p.playerId === state.winnerId
    );
    let fanfareColor = '#fbbf24';
    // If the win was sealed by a Luminary summon, use that Luminary's
    // summonColor — it is the most thematically appropriate hue for the
    // fanfare and matches what the live flush path captures via
    // pendingGameOverLumColorRef.
    const winTriggerLumId = state.winTriggerLuminaryId;
    const sealingLuminary = winTriggerLumId
      ? state.luminaries.find((l) => l.id === winTriggerLumId)
      : null;
    if (sealingLuminary?.summonColor) {
      fanfareColor = sealingLuminary.summonColor;
    } else if (winnerPlayer) {
      // Prefer the bonusColor of the winner's last purchased card — the best
      // proxy for the card that sealed the win, matching the flush-path logic.
      const winnerCards = winnerPlayer.purchasedCards as ArtifactCard[] | undefined;
      const lastWinnerCard = winnerCards && winnerCards.length > 0
        ? winnerCards[winnerCards.length - 1]
        : null;
      const lastCardBonusKey = lastWinnerCard?.bonusColor;
      if (lastCardBonusKey && GEM_KEY_TO_HEX[lastCardBonusKey]) {
        fanfareColor = GEM_KEY_TO_HEX[lastCardBonusKey];
      } else {
        // Fall back to the winner's dominant bonus affinity count.
        const bonuses = winnerPlayer.bonuses;
        const gemEntries: Array<[string, number]> = [
          ['ruby',     bonuses.ruby],
          ['sapphire', bonuses.sapphire],
          ['emerald',  bonuses.emerald],
          ['onyx',     bonuses.onyx],
          ['pearl',    bonuses.pearl],
          ['flux',     bonuses.flux],
        ];
        let maxBonus = 0;
        let dominantKey = 'flux';
        for (const [key, val] of gemEntries) {
          if (val > maxBonus) { maxBonus = val; dominantKey = key; }
        }
        fanfareColor = GEM_KEY_TO_HEX[dominantKey] ?? '#fbbf24';
      }
    }
    gameAudio.playLuminaryFanfare(fanfareColor);
    setTimeout(() => gameAudio.playWin(), 1400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!state]);

  // ── Action-log affinity-switch sound ──────────────────────────────────────
  // Single canonical trigger for playAffinitySwitch().  Fires when a new
  // "attuned" entry appears in the action log for medium/hard AI players.
  // Human-player toggles are silent because they never match aiPlayerIds.
  useEffect(() => {
    if (!state?.actionLog || !state.players) return;
    const aiPlayerIds = new Set(
      state.players
        .filter((p) => p.aiDifficulty === 'medium' || p.aiDifficulty === 'hard')
        .map((p) => p.playerId),
    );
    const aiAffinityEntries = state.actionLog.filter(
      (e) => e.summary.startsWith('switched ') && aiPlayerIds.has(e.playerId),
    );
    const aiAffinityCount = aiAffinityEntries.length;
    if (!aiAffinityLogInitializedRef.current) {
      // First run: snapshot existing entries so we don't replay history as sound.
      aiAffinityLogInitializedRef.current = true;
    } else if (aiAffinityCount > seenAiAffinityLogCountRef.current) {
      // Parse the target affinity from the newest "switched … to … <Label>" entry.
      // The summary always ends with the target affinity's display name (single word).
      const newestEntry = aiAffinityEntries[aiAffinityCount - 1];
      const lastWord = newestEntry?.summary.split(' ').pop() ?? '';
      const toggledKey: GemKey | undefined = AFFINITY_LABEL_TO_GEM_KEY[lastWord];
      gameAudio.playAffinitySwitch(toggledKey);
    }
    seenAiAffinityLogCountRef.current = aiAffinityCount;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.actionLog]);

  // ── v0.8 Luminary animation detection ────────────────────────────────────
  // Fires on every state change to detect burn replacements, delayed-effect
  // payouts, and Void Warden Oblivion — then triggers the matching animations.
  // Pure visual; never mutates game state.
  useEffect(() => {
    if (!state) return;
    const prev = prevStateForAnimRef.current;
    prevStateForAnimRef.current = state;
    if (!prev) return;

    // ── Card burn replacements ──────────────────────────────────────────────
    // A slot is a "burn" when its card ID changes on a non-purchase/non-reserve
    // action (i.e. the engine replaced the card as a side-effect).
    // burnEvents carries { cardId, tier, turn, sourceLuminaryId } for each burn
    // so we can attribute each flash to the correct Luminary for future theming.
    const lastAction = state.lastAction;
    const isPurchaseOrReserve =
      lastAction?.type === 'purchase_card' ||
      lastAction?.type === 'purchase_reserved' ||
      lastAction?.type === 'reserve_card';

    // ── BurnPile diff → slot flash + chip pulse ────────────────────────────
    // Detect cards that newly appeared in burnPile since the last state update.
    // For each newly burned card, find the market slot it occupied in prev and
    // trigger a BurnFlash there. This handles both "burn+replace" (card swapped
    // in same slot) and "burn+empty" (slot left vacant) without double-firing.
    // sourceLuminaryId is resolved from burnEvents for richer flash metadata.
    {
      const prevBurned = new Set<string>(prev.burnPile ?? []);
      const newBurnedIds = (state.burnPile ?? []).filter(id => !prevBurned.has(id));
      if (newBurnedIds.length > 0) {
        // Build sourceLuminaryId lookup from newly arrived burnEvents
        const prevBurnEvents = prev.burnEvents ?? [];
        const nextBurnEvents = state.burnEvents ?? [];
        const sourceLuminaryByCardId = new Map<string, string>(
          nextBurnEvents
            .filter(e => !prevBurnEvents.some(p => p.cardId === e.cardId))
            .map(e => [e.cardId, e.sourceLuminaryId]),
        );

        const prevTiers = [
          { tier: 1 as const, cards: prev.marketTier1 },
          { tier: 2 as const, cards: prev.marketTier2 },
          { tier: 3 as const, cards: prev.marketTier3 },
        ] as const;
        // Collect (cardId, slot element, sourceLuminaryId) for every newly burned card
        // so we can show the "Burned" badge first, then fire the flash 300 ms later.
        type BurnEntry = { burnedId: string; tier: number; slotIndex: number; sourceLuminaryId?: string };
        const burnEntries: BurnEntry[] = [];
        for (const burnedId of newBurnedIds) {
          let found = false;
          for (const { tier, cards } of prevTiers) {
            if (found) break;
            for (let i = 0; i < cards.length; i++) {
              if (cards[i]?.id === burnedId) {
                const sourceLuminaryId = sourceLuminaryByCardId.get(burnedId);
                burnEntries.push({ burnedId, tier, slotIndex: i, sourceLuminaryId });
                found = true;
                break;
              }
            }
          }
        }

        if (burnEntries.length > 0) {
          // Phase 1: capture slot rects NOW (slot DOM element persists even after
          // card replacement) and show a fixed-position "Burned" badge portal at
          // each slot's top-left corner.  The badge is visible regardless of
          // whether the burned card is still in the render tree.
          const resolvedEntries = burnEntries.flatMap(({ tier, slotIndex, sourceLuminaryId }) => {
            const slotEl = document.querySelector(`[data-slot-key="${tier}-${slotIndex}"]`);
            if (!slotEl) return [];
            const rect = slotEl.getBoundingClientRect();
            return [{ id: `burn-badge-${tier}-${slotIndex}-${Date.now()}`, rect, tier, slotIndex, sourceLuminaryId }];
          });

          if (resolvedEntries.length > 0) {
            setBurnBadgeOverlays(pf => [
              ...pf,
              ...resolvedEntries.map(e => ({ id: e.id, slotRect: e.rect })),
            ]);

            // Phase 2: after 320 ms (badge animation completes), trigger BurnFlash.
            // The badge calls onDone to remove itself; the flash runs independently.
            setTimeout(() => {
              for (const { tier, slotIndex, sourceLuminaryId } of resolvedEntries) {
                const slotEl2 = document.querySelector(`[data-slot-key="${tier}-${slotIndex}"]`);
                const rect2 = slotEl2?.getBoundingClientRect();
                if (rect2) {
                  setBurnFlashes(pf => [
                    ...pf,
                    { id: `burn-${tier}-${slotIndex}-${Date.now()}`, slotRect: rect2, sourceLuminaryId },
                  ]);
                }
              }
            }, 320);
          }
        }
        // Pulse the 🔥 chip to signal the burn pile count changed
        void burnChipAnim.start({
          filter: ['brightness(1)', 'brightness(3)', 'brightness(1.5)', 'brightness(1)'],
          transition: { duration: 0.65, times: [0, 0.15, 0.45, 1], ease: 'easeOut' },
        });
      }
    }

    // ── Concordance Mandala (+2 eminence) ──────────────────────────────────
    if (!prev.concordanceMandalaTriggered && state.concordanceMandalaTriggered) {
      const lumEl = document.querySelector('[data-luminary-id="lum_radiant"]');
      const rect = lumEl?.getBoundingClientRect();
      if (rect) {
        setDelayedEffectFloats(pf => [
          ...pf, { id: `mandala-${Date.now()}`, amount: 2, color: '#d4af37', originRect: rect },
        ]);
      }
    }

    // ── Catalyst Bloom (N burns → N eminence payout) ───────────────────────
    const prevBloom  = prev.catalystBloomBurnCount  ?? 0;
    const newBloom   = state.catalystBloomBurnCount ?? 0;
    if (prevBloom > 0 && newBloom === 0) {
      const lumEl = document.querySelector('[data-luminary-id="lum_bloom"]');
      const rect = lumEl?.getBoundingClientRect();
      if (rect) {
        setDelayedEffectFloats(pf => [
          ...pf, { id: `bloom-${Date.now()}`, amount: prevBloom, color: '#4ade80', originRect: rect },
        ]);
      }
    }

    // ── The Glass Orchard (+1 bonus copy) ─────────────────────────────────
    if (!prev.glassOrchardTriggered && state.glassOrchardTriggered) {
      const lumEl = document.querySelector('[data-luminary-id="lum_orchard"]');
      const rect = lumEl?.getBoundingClientRect();
      if (rect) {
        setDelayedEffectFloats(pf => [
          ...pf, { id: `orchard-${Date.now()}`, amount: 1, color: '#86efac', originRect: rect },
        ]);
      }
    }

    // ── Seed Beyond Seasons (payout from actionLog) ───────────────────────
    const prevLog = prev.actionLog ?? [];
    const newLog  = state.actionLog ?? [];
    if (newLog.length >= prevLog.length) {
      const newEntries = newLog.slice(newLog.length - (newLog.length - prevLog.length));
      for (const entry of newEntries) {
        const m = /Seed Beyond Seasons.*?\+(\d+) pending Eminence/.exec(entry.summary ?? '');
        if (m) {
          const amount = parseInt(m[1], 10);
          const lumEl = document.querySelector('[data-luminary-id="lum_seed"]');
          const rect = lumEl?.getBoundingClientRect();
          if (rect && amount > 0) {
            setDelayedEffectFloats(pf => [
              ...pf, { id: `seed-${Date.now()}`, amount, color: '#4cc88a', originRect: rect },
            ]);
          }
        }
      }
    }

    // ── Void Warden Oblivion (board dim) ──────────────────────────────────
    const prevVoid = prev.pendingSummonEvents?.some(e => e.luminaryId === 'lum_void') ?? false;
    const newVoid  = state.pendingSummonEvents?.some(e => e.luminaryId === 'lum_void') ?? false;
    if (!prevVoid && newVoid) {
      setBoardDimKey(k => k + 1);
    }

    // ── Per-summon market overlays (Red Moth, Iron Harbinger, Null, Ember, etc.) ──
    // Fires concurrently with the summon cutscene for each Luminary that has
    // a specific board-state visual treatment.
    const SUMMON_OVERLAY_IDS = [
      'lum_moth', 'lum_forge', 'lum_null', 'lum_ember',
      'lum_compass', 'lum_verdant', 'lum_pale',
    ] as const;
    for (const lumId of SUMMON_OVERLAY_IDS) {
      const prevHas = prev.pendingSummonEvents?.some(e => e.luminaryId === lumId) ?? false;
      const newHas  = state.pendingSummonEvents?.some(e => e.luminaryId === lumId) ?? false;
      if (!prevHas && newHas) {
        setSummonOverlays(pf => [...pf, { id: `${lumId}-${Date.now()}`, lumId }]);
      }
    }

    // ── Catalyst Bloom seed particles (per burn while Bloom is claimed) ────
    const bloomClaimed = state.players.some(p => p.claimedLuminaryIds?.includes('lum_bloom'));
    if (bloomClaimed && !isPurchaseOrReserve) {
      const bloomEl  = document.querySelector('[data-luminary-id="lum_bloom"]');
      const bloomRect = bloomEl?.getBoundingClientRect() ?? null;
      if (bloomRect) {
        const tiers2 = [
          { tier: 1 as const, oldCards: prev.marketTier1, newCards: state.marketTier1 },
          { tier: 2 as const, oldCards: prev.marketTier2, newCards: state.marketTier2 },
          { tier: 3 as const, oldCards: prev.marketTier3, newCards: state.marketTier3 },
        ] as const;
        for (const { tier, oldCards, newCards } of tiers2) {
          const len2 = Math.min(oldCards.length, newCards.length);
          for (let i = 0; i < len2; i++) {
            const o = oldCards[i], n = newCards[i];
            if (o && n && o.id !== n.id) {
              const slotEl = document.querySelector(`[data-slot-key="${tier}-${i}"]`);
              if (slotEl) {
                const fromR = slotEl.getBoundingClientRect();
                setBloomSeedParticles(pf => [
                  ...pf, { id: `bseed-${tier}-${i}-${Date.now()}`, from: fromR, to: bloomRect },
                ]);
              }
            }
          }
        }
      }
    }

    // ── The Glass Orchard copy pulse (on trigger) ──────────────────────────
    if (!prev.glassOrchardTriggered && state.glassOrchardTriggered) {
      const orchardEl = document.querySelector('[data-luminary-id="lum_orchard"]');
      orchardPortalRectRef.current = orchardEl?.getBoundingClientRect() ?? null;
      setOrchardCopyPulseKey(k => k + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // ── Undo hint trigger ─────────────────────────────────────────────────────
  // Must live here — before the early returns — so hook order is stable across
  // renders when state/session are null on the first render cycle.
  const crystalQueueActive = Object.keys(selectedCrystals).length > 0 && !coreActionSubmitted;
  useEffect(() => {
    if (!crystalQueueActive) {
      setShowUndoHint(false);
      return;
    }
    if (hintsEnabled && !localStorage.getItem('luminae_undo_hint_seen')) {
      markHintSeen('luminae_undo_hint_seen');
      setShowUndoHint(true);
      const timer = setTimeout(() => setShowUndoHint(false), 4000);
      return () => clearTimeout(timer);
    }
    return;
  }, [crystalQueueActive, hintsEnabled]);

  // ── Chat effects (must be before early returns to satisfy Rules of Hooks) ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (activeTab === 'log') setUnreadChat(0);
  }, [activeTab]);

  // ── Pre-early-return derived state ────────────────────────────────────────
  // isMyTurn / me / effectiveCost / canAffordCard are all computed here —
  // before the early returns — so the hint useEffects below
  // have stable closure references on every render regardless of whether
  // state has loaded yet.  When state is null the null-safe forms produce
  // safe false / undefined values, and the early returns below still fire.
  const summonGateActive = summonQueue.length > 0;
  summonQueueLenRef.current = summonQueue.length;
  const isActivePlayer = !!state && !!session && state.status === 'playing' &&
    state.players[state.currentPlayerIndex]?.playerId === session.playerId;

  // pendingLuminaryChoice: set when the current player must order a simultaneous
  // multi-Luminary claim before taking any other action.
  const pendingLuminaryChoice = state?.pendingLuminaryChoice ?? null;
  const luminaryChoiceIsOurs = !!pendingLuminaryChoice && pendingLuminaryChoice.playerId === session?.playerId;
  const luminaryChoiceActive = !!pendingLuminaryChoice;

  // isMyTurn is false while we're waiting to choose luminary order — the picker
  // overlay is the only interactive surface during that phase.
  const isMyTurn = isActivePlayer && !summonGateActive && !luminaryChoiceIsOurs;
  const isMyTurnForCoreAction = isMyTurn && !coreActionSubmitted;
  const me = state?.players.find(p => p.playerId === session?.playerId);

  // Focus-trap: win overlay (game over screen — Escape is a no-op since there is nothing to dismiss)
  // Only active after the victory cinematic has been dismissed.
  useFocusTrap(
    winOverlayContainerRef,
    state?.status === 'finished' && !pendingGameOver && summonQueue.length === 0 && !showCinematic && showWinOverlay,
    () => { /* terminal state — no dismiss action */ },
  );

  const myPurchasedCards = useMemo(() => me?.purchasedCards ?? [], [me]);
  const myDiscountedForgeIds = useMemo(() => me?.discountedForgeIds ?? [], [me]);
  const kardashevTier = useMemo(
    () => getKardashevTier(myPurchasedCards, myDiscountedForgeIds),
    [myPurchasedCards, myDiscountedForgeIds],
  );
  const kardashevPalette = useMemo(() => getDominantAffinityPalette(myPurchasedCards), [myPurchasedCards]);

  // At Tier 1, grow city-light count as Eminence climbs (0 → ~80 lights).
  // At Tier 2, grow the Dyson swarm density as Eminence climbs.
  // Win threshold is 15 lumens; fraction is clamped to [0, 1].
  // Tiers 0 and 3 leave progressFraction undefined (KardashevScene defaults to 1).
  const kardashevProgressFraction = useMemo(() => {
    if (kardashevTier !== 1 && kardashevTier !== 2) return undefined;
    const WIN_THRESHOLD = 15;
    const lumens = me?.lumens ?? 0;
    return Math.min(1, Math.max(0, lumens / WIN_THRESHOLD));
  }, [kardashevTier, me?.lumens]);

  const opponentData = useMemo(() => {
    const players = state?.players;
    if (!players) return {} as Record<string, { totalAffinity: number; cardCount: number; reservedCount: number; civPalette: AffinityPalette; civName: string }>;
    return Object.fromEntries(
      players.map(p => {
        const civPalette = getDominantAffinityPalette(p.purchasedCards);
        return [p.playerId, {
          totalAffinity: Object.values(p.crystals).reduce<number>((a, b) => a + b, 0),
          cardCount: p.purchasedCards.length,
          reservedCount: p.reservedCards.length,
          civPalette,
          civName: p.civName || getCivilizationName(civPalette, getKardashevTier(p.purchasedCards, p.discountedForgeIds)),
        }];
      })
    );
  }, [state?.players]);

  const effectiveCost = useCallback((card: ArtifactCard, p: GamePlayerState) => {
    const luminaryAffinities: LuminaryActiveState[] = state?.luminaryAffinities ?? [];
    const turnCount: number = state?.turnCount ?? 0;
    const out: Record<string, number> = {};
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
      let bonus = p.bonuses[c as keyof CrystalCounts] ?? 0;
      for (const la of luminaryAffinities) {
        if (la.ownerId === p.playerId && la.activeAffinity === c && turnCount > la.summonedAtTurnCount) {
          bonus++;
        }
      }
      out[c] = Math.max(0, (card.cost[c as keyof CrystalCounts] ?? 0) - bonus);
    }
    return out;
  }, [state?.luminaryAffinities, state?.turnCount]);
  const canAffordCard = useCallback((card: ArtifactCard, p: GamePlayerState): boolean => {
    const cost = effectiveCost(card, p);
    let fluxNeeded = 0;
    for (const [c, need] of Object.entries(cost)) {
      const have = p.crystals[c as keyof CrystalCounts] ?? 0;
      if (have < need) fluxNeeded += need - have;
    }
    return fluxNeeded <= (p.crystals.flux ?? 0);
  }, [effectiveCost]);

  // Derived forge-deduction map — how many of each affinity the selected card
  // would spend from the player's current inventory. Placed here (after
  // ── First Hunger: Assimilation state ──────────────────────────────────────
  const assimilateAvailable = !!(state?.firstHungerAvailable && session && state.firstHungerAvailable === session.playerId);

  const assimCost = useMemo<CrystalCounts | null>(() => {
    if (!selectedCard || !me || !assimilateAvailable) return null;
    const c = selectedCard.card.cost;
    return {
      ruby:     Math.max(0, (c.ruby     ?? 0) - (me.bonuses.ruby     ?? 0)),
      sapphire: c.sapphire ?? 0,
      emerald:  Math.max(0, (c.emerald  ?? 0) - (me.bonuses.emerald  ?? 0)),
      onyx:     c.onyx     ?? 0,
      pearl:    Math.max(0, (c.pearl    ?? 0) - (me.bonuses.pearl    ?? 0)),
      flux:     c.flux     ?? 0,
    };
  }, [selectedCard, me, assimilateAvailable]);

  const canAffordAssim = useMemo<boolean>(() => {
    if (!assimCost || !me) return false;
    let shortfall = 0;
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
      const need = assimCost[c as keyof CrystalCounts] ?? 0;
      const have = me.crystals[c as keyof CrystalCounts] ?? 0;
      shortfall += Math.max(0, need - have);
    }
    return shortfall <= (me.crystals.flux ?? 0);
  }, [assimCost, me]);

  const assimEligible = useMemo<boolean>(() => {
    if (!selectedCard) return false;
    const c = selectedCard.card.cost;
    return (c.ruby ?? 0) > 0 || (c.emerald ?? 0) > 0 || (c.pearl ?? 0) > 0;
  }, [selectedCard]);

  // effectiveCost is declared, before any early returns) so both the TDZ and
  // react-hooks/rules-of-hooks constraints are satisfied. canPlan is inlined
  // via optional chaining because state may still be null at this point.
  const forgeDeductions = useMemo<Partial<Record<GemKey, number>> | undefined>(() => {
    if (!selectedCard || !me) return undefined;
    const myCanPlan = state?.status === 'playing' && (!summonGateActive || localSummonSkipped);
    if (!isMyTurn && !myCanPlan) return undefined;
    const effCost = effectiveCost(selectedCard.card, me) as Record<string, number>;
    const result: Partial<Record<GemKey, number>> = {};
    let fluxNeeded = 0;
    for (const k of GEM_KEYS) {
      if (k === 'flux') continue;
      const need = effCost[k] ?? 0;
      const have = me.crystals[k as keyof CrystalCounts] ?? 0;
      const spend = Math.min(have, need);
      if (spend > 0) result[k as GemKey] = spend;
      fluxNeeded += Math.max(0, need - have);
    }
    if (fluxNeeded > 0) result.flux = fluxNeeded;
    return Object.keys(result).length > 0 ? result : undefined;
  }, [selectedCard, me, isMyTurn, state?.status, summonGateActive, localSummonSkipped]);

  // ── Reserve hint ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (pendingSheetAction === 'reserve') {
      if (hintsEnabled && !localStorage.getItem('luminae_reserve_hint_seen')) {
        markHintSeen('luminae_reserve_hint_seen');
        setShowReserveHint(true);
      }
    } else {
      setShowReserveHint(false);
    }
  }, [pendingSheetAction, hintsEnabled]);

  // ── Deck-reserve hint ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedDeckTier) {
      setShowDeckReserveHint(false);
      return;
    }
    if (hintsEnabled && !localStorage.getItem('luminae_deck_reserve_hint_seen')) {
      markHintSeen('luminae_deck_reserve_hint_seen');
      setShowDeckReserveHint(true);
    }
  }, [selectedDeckTier, hintsEnabled]);

  // ── Forge hint ────────────────────────────────────────────────────────────
  useEffect(() => {
    const affordable = isMyTurn && selectedCard && me && canAffordCard(selectedCard.card, me);
    if (affordable) {
      if (hintsEnabled && !localStorage.getItem('luminae_forge_hint_seen')) {
        markHintSeen('luminae_forge_hint_seen');
        setShowForgeHint(true);
      }
    } else {
      setShowForgeHint(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, selectedCard, me, hintsEnabled]);

  processUpdateRef.current = (newState: GameState) => {
    const prev = prevStateRef.current;
    const isRematch = prev?.status === 'finished' && newState.status === 'playing';
    if (prev && newState.version <= prev.version && !isRematch) return;
    if (isRematch) {
      initialTurnFiredRef.current = false;
      checkedInitialSummonRef.current = false;
      handledSummonEventIdsRef.current = new Set();
      handledActivationEventIdsRef.current = new Set();
      setActivationQueue([]);
      pendingSuppressLumIdsRef.current = new Set();
      stateQueueRef.current = [];
      gameFinishedRef.current = false;
      setClaimedThisSession([]);
      setShowCinematic(true);
    }
      const action = newState.lastAction;

      // ── Planned-action cancellation ────────────────────────────────────────
      // The engine stamps lastAction = { type: "planned_action_cancelled", playerId, reason }
      // on the second version bump inside the deferred-failure branch of resolve_summon.
      // This lets us distinguish a clean summon resolution from one that also voided
      // the waiting player's planned move.  Only show the notice to the affected player;
      // no affinity or purchase animation should be triggered for this update.
      if (action?.type === 'planned_action_cancelled') {
        const cancelledForMe = (action.playerId as string | undefined) === session?.playerId;
        if (cancelledForMe) {
          const reason = (action.reason as string | undefined) ?? 'Your planned move is no longer legal.';
          setTimeout(() => toast({ variant: 'destructive', title: 'Planned move cancelled', description: reason }), 150);
        }
        queryClient.setQueryData(getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }), newState);
        prevStateRef.current = newState;
        return;
      }

      const isMarketAction = action && (
        action.type === 'purchase_card' ||
        (action.type === 'reserve_card' && action.cardId)
      );

      const marketActionKey = isMarketAction ? JSON.stringify(action) : null;
      if (prev && isMarketAction && action.cardId && marketActionKey !== lastMarketBurstActionRef.current) {
        lastMarketBurstActionRef.current = marketActionKey;
        const cardId = action.cardId as string;
        const marketsOld: Record<number, (ArtifactCard | null)[]> = {
          1: prev.marketTier1, 2: prev.marketTier2, 3: prev.marketTier3,
        };
        const marketsNew: Record<number, (ArtifactCard | null)[]> = {
          1: newState.marketTier1, 2: newState.marketTier2, 3: newState.marketTier3,
        };
        for (const tierStr of ['1', '2', '3'] as const) {
          const tier = Number(tierStr);
          const oldCards = marketsOld[tier];
          const idx = oldCards.findIndex((c: ArtifactCard | null) => c?.id === cardId);
          if (idx >= 0) {
            const exitCard = oldCards[idx]!;
            const el = document.querySelector(`[data-card-id="${cardId}"]`);
            const rect = el?.getBoundingClientRect();
            const player = (newState.players as GamePlayerState[]).find(
              (p) => p.playerId === (action.playerId as string),
            );
            const gotFlux = action.type === 'reserve_card' &&
              (newState.crystalBank.flux ?? 0) < (prev.crystalBank.flux ?? 0);

            // Common pre-cleanup: cancel any in-flight card animations before starting new ones.
            for (const t of cardAnimTimersRef.current) clearTimeout(t);
            cardAnimTimersRef.current = [];
            setHiddenSlots(new Set());
            setFlippingCards(new Set());
            setDealingCard(null);

            const slotKey = `${tier}-${idx}`;

            if (action.type === 'purchase_card') {
              const isLocalPurch =
                (action.playerId as string | undefined) === session?.playerId;

              if (!isLocalPurch) {
                // ── Opponent forge: card shrinks and flies into their chip ──────
                const actingPlayerId = action.playerId as string;
                const chipEl = document.querySelector(`[data-opponent-chip="${actingPlayerId}"]`);
                const chipR = chipEl?.getBoundingClientRect();
                const chipCenter = chipR
                  ? { x: chipR.left + chipR.width / 2, y: chipR.top + chipR.height / 2 }
                  : { x: window.innerWidth / 2, y: 28 };

                opponentForgeAbsorbKeyRef.current += 1;
                const absorbSeq = opponentForgeAbsorbKeyRef.current;
                const purchaseActorName = player?.playerName;
                setAnimEndTime(abridgedAnims ? ABRIDGED_FORGE_LOCK_MS : FORGE_FULL_MS);
                setBurstGhostCards(prev => { const n = { ...prev }; delete n[slotKey]; return n; });
                setOpponentForgeAbsorb({
                  key: absorbSeq,
                  card: exitCard,
                  tier,
                  startRect: rect
                    ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
                    : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
                  chipCenter,
                  ownerName: purchaseActorName,
                  // Use the card's bonus color as a single affinity stream hint.
                  spentColors: exitCard.bonusColor
                    ? [exitCard.bonusColor as GemKey]
                    : [],
                });
                setHiddenSlots(new Set([slotKey]));
                // Abridged: no internal audio in AbridgedForgeAnimation, so fire here.
                // Full-view: OpponentForgeAnimation calls playForgeAnimation() internally.
                if (abridgedAnims) gameAudio.playCardPurchased();
                const bonusColor = exitCard.bonusColor as GemKey;
                if (bonusColor && bonusColor !== 'flux') {
                  const tBonus = setTimeout(() => gameAudio.playBonusSound(bonusColor), abridgedAnims ? 380 : 750);
                  cardAnimTimersRef.current.push(tBonus);
                }
                const newCard = marketsNew[tier][idx];
                const tOpponent = setTimeout(() => {
                  if (opponentForgeAbsorbKeyRef.current !== absorbSeq) return;
                  setOpponentForgeAbsorb(null);

                  if (newCard) {
                    const deckEl = document.querySelector(`[data-deck-tier="${tier}"]`);
                    const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
                    const deckR = deckEl?.getBoundingClientRect();
                    const slotR = slotEl?.getBoundingClientRect();
                    if (deckR && slotR) {
                      setAnimEndTime(DEAL_ANIM_MS); // extend lock for deal animation
                      const _rawCardW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) || 112;
                      const _faceScale = slotR.width / _rawCardW;
                      const _startX = deckR.left + (deckR.width  - slotR.width)  / 2;
                      const _startY = deckR.top  + (deckR.height - slotR.height) / 2;
                      const _dx = slotR.left - _startX;
                      const _dy = slotR.top  - _startY;
                      const _arcY = Math.min(_dy - 60, -40);
                      setDealingCard({
                        card: newCard,
                        tier,
                        deckRect: { x: _startX, y: _startY, w: slotR.width, h: slotR.height },
                        slotRect: { x: slotR.left, y: slotR.top, w: slotR.width, h: slotR.height },
                        animX: [0, _dx * 0.5, _dx],
                        animY: [0, _arcY, _dy],
                        animRotateY: [0, 90, 180],
                        animScale: [1, 1, 1],
                        faceScale: _faceScale,
                      });
                      gameAudio.playCardDraw();
                    } else {
                      setAnimEndTime(FALLBACK_FLIP_ANIM_MS);
                      setFlippingCards(new Set([newCard.id]));
                      gameAudio.playCardDraw();
                      if (marketCompact) {
                        const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
                        const slotR = slotEl?.getBoundingClientRect();
                        if (slotR) {
                          setCompactGhost({ id: `${newCard.id}-${Date.now()}`, cardViewProps: { card: newCard, tier }, chipRect: slotR });
                        }
                      }
                      const t2 = setTimeout(() => {
                        if (opponentForgeAbsorbKeyRef.current !== absorbSeq) return;
                        setFlippingCards(new Set());
                        setHiddenSlots(new Set());
                      }, FALLBACK_FLIP_CLEANUP_MS);
                      cardAnimTimersRef.current.push(t2);
                    }
                  } else {
                    setHiddenSlots(new Set());
                  }
                }, abridgedAnims ? 450 : 1250);
                cardAnimTimersRef.current.push(tOpponent);
              } else {
                // ── Local player forge: full celebration burst ──────────────────
                cardActionBurstKeyRef.current += 1;
                setAnimEndTime(abridgedAnims ? ABRIDGED_FORGE_LOCK_MS : FORGE_FULL_MS);
                const handTabEl = document.querySelector('[data-nav-hand]');
                const handTabR = handTabEl?.getBoundingClientRect();
                const burstDestPos: { x: number; y: number } | undefined = handTabR
                  ? { x: handTabR.left + handTabR.width / 2, y: handTabR.top + handTabR.height / 2 }
                  : undefined;
                // Compute which affinity colors were spent for the energy-stream animation.
                const _spentCost = player ? effectiveCost(exitCard, player) as Record<string, number> : {};
                const _spentColors = (Object.entries(_spentCost)
                  .filter(([, v]) => v > 0)
                  .map(([c]) => c as GemKey));
                setBurstGhostCards(prev => { const n = { ...prev }; delete n[slotKey]; return n; });
                setCardActionBurst({
                  key: cardActionBurstKeyRef.current,
                  card: exitCard,
                  tier,
                  actionType: 'purchase',
                  playerName: player?.playerName ?? 'Unknown',
                  avatarId: player?.avatarId ?? null,
                  lumens: exitCard.lumens ?? 0,
                  gotFlux: false,
                  startRect: rect
                    ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
                    : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
                  destPos: burstDestPos,
                  spentColors: _spentColors,
                });
                gameAudio.playCardPurchased();
                const bonusColor = exitCard.bonusColor as GemKey;
                if (bonusColor && bonusColor !== 'flux') {
                  const tBonus = setTimeout(() => gameAudio.playBonusSound(bonusColor), abridgedAnims ? 380 : 1000);
                  cardAnimTimersRef.current.push(tBonus);
                }
                setHiddenSlots(new Set([slotKey]));
                const seq = cardActionBurstKeyRef.current;
                const newCard = marketsNew[tier][idx];
                const t1 = setTimeout(() => {
                  if (cardActionBurstKeyRef.current !== seq) return;
                  setCardActionBurst(null);
                  if (newCard) {
                    const deckEl = document.querySelector(`[data-deck-tier="${tier}"]`);
                    const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
                    const deckR = deckEl?.getBoundingClientRect();
                    const slotR = slotEl?.getBoundingClientRect();
                    if (deckR && slotR) {
                      setAnimEndTime(DEAL_ANIM_MS); // extend lock for deal animation
                      const _rawCardW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) || 112;
                      const _faceScale = slotR.width / _rawCardW;
                      const _startX = deckR.left + (deckR.width  - slotR.width)  / 2;
                      const _startY = deckR.top  + (deckR.height - slotR.height) / 2;
                      const _dx = slotR.left - _startX;
                      const _dy = slotR.top  - _startY;
                      const _arcY = Math.min(_dy - 60, -40);
                      setDealingCard({
                        card: newCard,
                        tier,
                        deckRect: { x: _startX, y: _startY, w: slotR.width, h: slotR.height },
                        slotRect: { x: slotR.left, y: slotR.top, w: slotR.width, h: slotR.height },
                        // Stable animate arrays — computed once so re-renders don't
                        // create new references and accidentally restart the animation.
                        animX: [0, _dx * 0.5, _dx],
                        animY: [0, _arcY, _dy],
                        animRotateY: [0, 90, 180],
                        animScale: [1, 1, 1],
                        faceScale: _faceScale,
                      });
                      gameAudio.playCardDraw();
                    } else {
                      // Fallback: flip in place if DOM elements not found.
                      // Keep the slot hidden until the flip completes — do NOT clear
                      // hiddenSlots immediately or the new card pops in before the flip.
                      setAnimEndTime(FALLBACK_FLIP_ANIM_MS);
                      setFlippingCards(new Set([newCard.id]));
                      gameAudio.playCardDraw();
                      if (marketCompact) {
                        const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
                        const slotR = slotEl?.getBoundingClientRect();
                        if (slotR) {
                          setCompactGhost({ id: `${newCard.id}-${Date.now()}`, cardViewProps: { card: newCard, tier }, chipRect: slotR });
                        }
                      }
                      const t2 = setTimeout(() => {
                        if (cardActionBurstKeyRef.current !== seq) return;
                        setFlippingCards(new Set());
                        setHiddenSlots(new Set());
                      }, FALLBACK_FLIP_CLEANUP_MS);
                      cardAnimTimersRef.current.push(t2);
                    }
                  } else {
                    setHiddenSlots(new Set());
                  }
                }, abridgedAnims ? 450 : 1300); // abridged: direct shrink | full: 1150ms forge + 150ms buffer
                cardAnimTimersRef.current.push(t1);
                // Hand-panel absorption pulse — fires as the card reaches the tab.
                // Timed 300ms before the burst clears so the rings are visually
                // centred on the moment of arrival.
                // Absorption rings at the hand tab are handled by ForgeAnimation (Step 6).
              }
            } else {
              // reserve_card with cardId → Cipher Aperture animation; flies to Singularity panel
              cipherBurstKeyRef.current += 1;
              const isLocalReserve = (action.playerId as string | undefined) === session?.playerId;
              cipherBurstIsDeckRef.current = isLocalReserve;
              const reserveActorId = action.playerId as string;
              const destEl = isLocalReserve
                ? document.querySelector('[data-singularity-well]')
                : document.querySelector(`[data-opponent-chip="${reserveActorId}"]`);
              const destElRect = destEl?.getBoundingClientRect();
              const reserveOwnerName = isLocalReserve
                ? undefined
                : ((newState.players as GamePlayerState[]).find(p => p.playerId === reserveActorId))?.playerName;
              setCipherBurst({
                key: cipherBurstKeyRef.current,
                sourceRect: rect
                  ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
                  : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
                affinityHex: exitCard.bonusColor
                  ? (GEM_META[exitCard.bonusColor as GemKey]?.glowHex ?? '#7090FF')
                  : '#7090FF',
                cardName: exitCard.name,
                gotFlux,
                card: exitCard,
                tier,
                destPos: destElRect
                  ? { x: destElRect.left + destElRect.width / 2, y: destElRect.top + destElRect.height / 2 }
                  : undefined,
                ownerName: reserveOwnerName,
              });
              setBurstGhostCards(prev => { const n = { ...prev }; delete n[slotKey]; return n; }); // cipher burst now owns the card
              if (gotFlux) gameAudio.playFluxCoin();
              gameAudio.playCipherSeal();
              setAnimEndTime(abridgedAnims ? ABRIDGED_FORGE_LOCK_MS : CIPHER_GAME_TOTAL_MS + DEAL_ANIM_MS + ANIM_LOCK_BUFFER_MS); // full: cipher + deal-from-deck + buffer
              setHiddenSlots(new Set([slotKey]));
              // Deal replacement card from deck after the cipher aperture animation clears.
              const cipherSeq = cipherBurstKeyRef.current;
              const cipherNewCard = marketsNew[tier][idx];
              const tCipherDeal = setTimeout(() => {
                if (cipherBurstKeyRef.current !== cipherSeq) return;
                if (cipherNewCard) {
                  const deckEl = document.querySelector(`[data-deck-tier="${tier}"]`);
                  const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
                  const deckR = deckEl?.getBoundingClientRect();
                  const slotR = slotEl?.getBoundingClientRect();
                  if (deckR && slotR) {
                    setAnimEndTime(DEAL_ANIM_MS);
                    const _rawCardW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) || 112;
                    const _faceScale = slotR.width / _rawCardW;
                    const _startX = deckR.left + (deckR.width  - slotR.width)  / 2;
                    const _startY = deckR.top  + (deckR.height - slotR.height) / 2;
                    const _dx = slotR.left - _startX;
                    const _dy = slotR.top  - _startY;
                    const _arcY = Math.min(_dy - 60, -40);
                    setDealingCard({
                      card: cipherNewCard,
                      tier,
                      deckRect: { x: _startX, y: _startY, w: slotR.width, h: slotR.height },
                      slotRect: { x: slotR.left, y: slotR.top, w: slotR.width, h: slotR.height },
                      animX: [0, _dx * 0.5, _dx],
                      animY: [0, _arcY, _dy],
                      animRotateY: [0, 90, 180],
                      animScale: [1, 1, 1],
                      faceScale: _faceScale,
                    });
                    gameAudio.playCardDraw();
                  } else {
                    setAnimEndTime(FALLBACK_FLIP_ANIM_MS);
                    setFlippingCards(new Set([cipherNewCard.id]));
                    gameAudio.playCardDraw();
                    if (marketCompact) {
                      const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
                      const slotR = slotEl?.getBoundingClientRect();
                      if (slotR) {
                        setCompactGhost({ id: `${cipherNewCard.id}-${Date.now()}`, cardViewProps: { card: cipherNewCard, tier }, chipRect: slotR });
                      }
                    }
                    const t2 = setTimeout(() => {
                      if (cipherBurstKeyRef.current !== cipherSeq) return;
                      setFlippingCards(new Set());
                      setHiddenSlots(new Set());
                    }, FALLBACK_FLIP_CLEANUP_MS);
                    cardAnimTimersRef.current.push(t2);
                  }
                } else {
                  setHiddenSlots(new Set());
                }
              }, abridgedAnims ? ABRIDGED_SHRINK_MS : CIPHER_DEAL_FIRE_DELAY_MS);
              cardAnimTimersRef.current.push(tCipherDeal);
            }
            break;
          }
        }
      }

      // Dedup-safe ghost sweep: if the animation block above was skipped (duplicate action key
      // or card not found in old markets), any eagerly-set burst ghost for this card will be
      // stranded forever. Clear it unconditionally — the bail-early guard makes it a no-op
      // when the ghost was already removed inside the animation block.
      if (isMarketAction && action.cardId) {
        const _cardId = action.cardId as string;
        setBurstGhostCards(prev => {
          if (!Object.values(prev).some((c: ArtifactCard) => c.id === _cardId)) return prev;
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            if ((next[key] as ArtifactCard)?.id === _cardId) delete next[key];
          }
          return next;
        });
      }

      // Detect opponent purchase_reserved (buy from own reserve) — fly the card to their chip.
      if (
        action?.type === 'purchase_reserved' &&
        prev &&
        (action.playerId as string | undefined) !== session?.playerId
      ) {
        const actingPlayerId = action.playerId as string;
        const cardId = action.cardId as string | undefined;
        const prevActingPlayer = (prev.players as GamePlayerState[]).find(
          (p) => p.playerId === actingPlayerId,
        );
        const reservedCard = cardId
          ? prevActingPlayer?.reservedCards?.find((c: ArtifactCard) => c.id === cardId)
          : undefined;
        if (reservedCard) {
          const chipEl = document.querySelector(`[data-opponent-chip="${actingPlayerId}"]`);
          const chipR = chipEl?.getBoundingClientRect();
          const chipCenter = chipR
            ? { x: chipR.left + chipR.width / 2, y: chipR.top + chipR.height / 2 }
            : { x: window.innerWidth / 2, y: 28 };
          const cardEl = document.querySelector(`[data-reserved-card-id="${cardId}"]`);
          const cardRect = cardEl?.getBoundingClientRect();
          opponentForgeAbsorbKeyRef.current += 1;
          const absorbSeq = opponentForgeAbsorbKeyRef.current;
          const reservedForgeActorName = prevActingPlayer?.playerName;
          for (const t of cardAnimTimersRef.current) clearTimeout(t);
          cardAnimTimersRef.current = [];
          setAnimEndTime(abridgedAnims ? ABRIDGED_ACTION_MS : RESERVED_FORGE_FULL_MS);
          setOpponentForgeAbsorb({
            key: absorbSeq,
            card: reservedCard,
            tier: reservedCard.tier,
            startRect: cardRect
              ? { x: cardRect.left, y: cardRect.top, w: cardRect.width, h: cardRect.height }
              : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
            chipCenter,
            ownerName: reservedForgeActorName,
          });
          gameAudio.playCardPurchased();
          const tAbsorb = setTimeout(() => {
            if (opponentForgeAbsorbKeyRef.current !== absorbSeq) return;
            setOpponentForgeAbsorb(null);
          }, abridgedAnims ? 450 : 1250);
          cardAnimTimersRef.current.push(tAbsorb);
        }
      }

      // Detect planned action cancellation for the local player and show a toast.
      const myNewPlayer = (newState.players as GamePlayerState[]).find(p => p.playerId === session?.playerId);
      const myOldPlayer = prev ? (prev.players as GamePlayerState[]).find(p => p.playerId === session?.playerId) : null;
      const newCancelReason = myNewPlayer?.plannedActionCancelReason;
      const oldCancelReason = myOldPlayer?.plannedActionCancelReason;
      if (newCancelReason && newCancelReason !== oldCancelReason) {
        setTimeout(() => toast({ variant: 'destructive', title: 'Planned move cancelled', description: newCancelReason }), 150);
      }

      queryClient.setQueryData(getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }), newState);
      prevStateRef.current = newState;

      // Track the event ID and raw summonColor of the win-sealing Luminary so the
      // enqueue loop below can color that specific cutscene's particles to match.
      let sealingEventId = '';
      let sealingLumSummonColor = '';

      if (newState.status === 'finished' && (prev?.status ?? state?.status) !== 'finished') {
        // Count summon events that will actually be dispatched to enqueueSummon
        // in the loop below (not yet in handledSummonEventIdsRef means not deduped).
        const incomingPending = newState.pendingSummonEvents ?? [];
        const toEnqueue = incomingPending.filter(
          evt => !handledSummonEventIdsRef.current.has(evt.eventId)
        ).length;
        const hasPendingSummons = toEnqueue > 0 || summonQueueLenRef.current > 0 || enqueuingCountRef.current > 0;
        if (hasPendingSummons) {
          // Register in-flight dispatches BEFORE the enqueue loop below runs,
          // so the flush effect cannot fire before the RAFs land in summonQueue.
          enqueuingCountRef.current += toEnqueue;
          // Capture the sealing Luminary's summonColor for the fanfare.
          // We grab the last *new* event's Luminary (same filter used for toEnqueue).
          const allPendingEvts = newState.pendingSummonEvents ?? [];
          const newPendingEvts = allPendingEvts.filter(
            e => !handledSummonEventIdsRef.current.has(e.eventId)
          );
          if (newPendingEvts.length > 0) {
            const lastEvt = newPendingEvts[newPendingEvts.length - 1];
            const sealingLum = newState.luminaries.find(l => l.id === lastEvt.luminaryId);
            const lumSummonColor: string = sealingLum?.summonColor ?? '';

            // Store the raw summonColor for the cutscene visual burst override.
            // This is the Luminary's canonical color and is what the task requires.
            sealingEventId = lastEvt.eventId;
            sealingLumSummonColor = lumSummonColor;

            // Always use the sealing Luminary's summonColor for Luminary-triggered wins.
            // Card bonusColor is intentionally not used here so both the live flush path
            // and the on-load fanfare path agree on color priority.
            pendingGameOverLumColorRef.current = lumSummonColor;
          }
          // Defer: the flush useEffect below will fire win audio and clear the
          // hold once enqueuingCount reaches zero AND the queue drains.
          setPendingGameOver(true);
          // Capture the animation barrier before we clear the queue — the flush
          // effect will use animBarrierMsRef to defer cancelPendingAnimations()
          // so any in-flight card/gem animations can complete. The summon
          // cutscene (~12 s) always outlasts the barrier cap (≤ 3 s), so this
          // is a minor polish pass that keeps the logic symmetric with the
          // non-summon path. enqueuingCountRef is reset to 0 so that RAF-chain
          // items that have not yet landed in summonQueue are silently dropped
          // by doEnqueue (which checks gameFinishedRef before pushing).
          // The slice(0,1) keeps only the currently-active cutscene; all
          // queued-but-not-started summons are discarded.
          gameFinishedRef.current = true;
          enqueuingCountRef.current = 0;
          // Cancel the turn announcement immediately — it would be confusing to
          // show "Your Turn" while the summon cutscene is playing.
          cancelTurnAnnouncement();
          const summonPathBarrierMs = Math.min(3000, Math.max(0, animationEndTimeRef.current - Date.now()));
          // Store as an absolute deadline so the flush effect can compute remaining time
          // even if it fires slightly later than expected.
          animBarrierMsRef.current = summonPathBarrierMs > 0 ? Date.now() + summonPathBarrierMs : 0;
          // Clear the state queue immediately so no further game states are
          // processed, but defer full cancelPendingAnimations() to the flush
          // effect so card/gem animations running underneath the cutscene finish.
          if (queueTimerRef.current) { clearTimeout(queueTimerRef.current); queueTimerRef.current = null; }
          stateQueueRef.current = [];
          setSummonQueue(q => q.slice(0, 1));
        } else {
          gameFinishedRef.current = true;
          // Cancel the turn announcement immediately — showing "Your Turn" while
          // entering win state would be confusing regardless of any animation delay.
          cancelTurnAnnouncement();

          // Compute how long to wait for in-flight animations to complete.
          // Hard-capped at 3 s so a runaway or stale barrier cannot delay indefinitely.
          const elseBarrierMs = Math.min(3000, Math.max(0, animationEndTimeRef.current - Date.now()));

          // Compute the dominant color now (all data is available in newState).
          const winnerPlayer = (newState.players as GamePlayerState[]).find(
            p => p.playerId === newState.winnerId
          );
          let dominantColor = '#fbbf24'; // flux fallback

          // Prefer the bonusColor of the card that pushed the winner over 15 Eminence.
          // The game transitions to 'finished' via advanceTurn at end-of-last-round, so
          // lastAction may belong to any player's final turn action — not necessarily the
          // winner's purchase. Instead we use the winner's last purchased card: cards are
          // appended in chronological order, so the last entry is their most recent forge
          // and the best proxy for the threshold-crossing card.
          const winnerCards = winnerPlayer?.purchasedCards as ArtifactCard[] | undefined;
          const lastWinnerCard = winnerCards && winnerCards.length > 0
            ? winnerCards[winnerCards.length - 1]
            : null;
          const triggeringBonusKey = lastWinnerCard?.bonusColor;

          if (triggeringBonusKey && GEM_KEY_TO_HEX[triggeringBonusKey]) {
            // Use the winning card's affinity — it's the "color of the moment".
            dominantColor = GEM_KEY_TO_HEX[triggeringBonusKey];
          } else if (winnerPlayer) {
            // Fall back to the winner's dominant bonus affinity count.
            const bonuses = winnerPlayer.bonuses;
            const gemEntries: Array<[string, number]> = [
              ['ruby',     bonuses.ruby],
              ['sapphire', bonuses.sapphire],
              ['emerald',  bonuses.emerald],
              ['onyx',     bonuses.onyx],
              ['pearl',    bonuses.pearl],
              ['flux',     bonuses.flux],
            ];
            let maxBonus = 0;
            let dominantKey = 'flux';
            for (const [key, val] of gemEntries) {
              if (val > maxBonus) { maxBonus = val; dominantKey = key; }
            }
            dominantColor = GEM_KEY_TO_HEX[dominantKey] ?? '#fbbf24';
          }

          if (elseBarrierMs === 0) {
            // No in-flight animations — fire immediately (identical to previous behavior).
            cancelPendingAnimations();
            gameAudio.playLuminaryFanfare(dominantColor);
            setTimeout(() => gameAudio.playWin(), 1400);
          } else {
            // In-flight animations are still running. Hold back the victory cinematic
            // (via pendingGameOver) and the state queue (immediately) until the barrier
            // elapses, then cancel animations and release the overlay.
            // Clear the state queue immediately so no further game states are processed.
            if (queueTimerRef.current) { clearTimeout(queueTimerRef.current); queueTimerRef.current = null; }
            stateQueueRef.current = [];
            // Prevent the flush useEffect from firing this non-summon hold — we will
            // release pendingGameOver ourselves inside the barrier timeout below.
            fanfareFiredForGameOverRef.current = true;
            setPendingGameOver(true);
            winBarrierTimerRef.current = setTimeout(() => {
              winBarrierTimerRef.current = null;
              cancelPendingAnimations();
              fanfareFiredForGameOverRef.current = false;
              setPendingGameOver(false);
              gameAudio.playLuminaryFanfare(dominantColor);
              setTimeout(() => gameAudio.playWin(), 1400);
            }, elseBarrierMs);
          }
        }
      }

      // AUDIT: summon-cutscene branch — plan-registration state updates leave
      // pendingSummonEvents unchanged, so every event in newPending will be found in
      // prevPending (alreadyKnown = true) and the enqueueSummon call is skipped.  The
      // secondary guard inside enqueueSummon (handledSummonEventIdsRef) provides an
      // additional layer.  No separate action-key dedup ref is needed here.
      // Detect newly arrived pendingSummonEvents and start cutscenes for ALL players.
      // The dedup guard in enqueueSummon prevents re-enqueueing the same event.
      {
        const prevPending = prev?.pendingSummonEvents ?? [];
        const newPending = newState?.pendingSummonEvents ?? [];

        for (const evt of newPending) {
          // Only enqueue cutscenes for events that weren't in the previous state.
          // Dedup against replaying the same eventId is handled inside enqueueSummon
          // via handledSummonEventIdsRef — that is the correct dedup boundary.
          // NOTE: do NOT gate on claimedLuminaryIds here. The engine pushes the
          // luminary into both player.luminaries AND pendingSummonEvents in the same
          // atomic state update, so isAlreadyClaimed would always be true for a live
          // summon and would suppress every cutscene.
          const alreadyKnown = prevPending.some(e => e.eventId === evt.eventId);
          if (!alreadyKnown) {
            // Synchronously mark this luminary as suppressed BEFORE any RAF fires.
            // This ensures the portal doesn't flash during the frames between the
            // queryClient.setQueryData re-render and the setSummonQueue call.
            if (!handledSummonEventIdsRef.current.has(evt.eventId)) {
              pendingSuppressLumIdsRef.current.add(evt.luminaryId);
            }
            const lum = newState.luminaries.find(l => l.id === evt.luminaryId);
            if (lum) {
              // Pass winSealingColor for the event that sealed the win so its
              // cutscene burst visuals match the Luminary's summonColor.
              const wsc = (sealingEventId && evt.eventId === sealingEventId)
                ? sealingLumSummonColor : undefined;
              const claimedByPlayer = (newState.players ?? []).find(
                (p: { claimedLuminaryIds?: string[] }) =>
                  (p.claimedLuminaryIds ?? []).includes(evt.luminaryId)
              ) as { playerName?: string } | undefined;
              enqueueSummon(
                evt.luminaryId,
                lum.name,
                lum.domain,
                lum.oblivion ? -lum.oblivion : lum.lumens,
                lum.flavor,
                evt.eventId,
                false,
                wsc,
                claimedByPlayer?.playerName,
              );
            }
          }
        }
      }

      // Detect newly arrived pendingLuminaryActivationEvents and enqueue ~4s activation cinematics.
      // Unlike summon events these do NOT gate game progression — no drain-queue barrier needed.
      {
        const prevPending = prev?.pendingLuminaryActivationEvents ?? [];
        const newPending = newState?.pendingLuminaryActivationEvents ?? [];
        for (const evt of newPending) {
          // Summon-type events are shown via the summon cutscene — skip them here.
          // (lum_seed no longer pushes a summon activation event from the engine,
          // but this guard handles any in-flight game states from before that change.)
          if (evt.effectType === 'summon') continue;
          const alreadyKnown = prevPending.some(e => e.eventId === evt.eventId);
          if (!alreadyKnown && !handledActivationEventIdsRef.current.has(evt.eventId)) {
            handledActivationEventIdsRef.current.add(evt.eventId);
            setActivationQueue(q => [...q, evt]);
          }
        }
      }

      // AUDIT: take-crystals branch — dedup guard uses JSON.stringify(action) + turnCount
      // so that:
      //   • plan-registration re-fires (version bumps, same action, same turnCount) are blocked
      //   • identical consecutive harvests across different turns each fire their burst
      //     (turnCount increments on advanceTurn so the key differs even when the action JSON is identical)
      if (action && (action.type === 'take_three_crystals' || action.type === 'take_two_crystals')) {
        const takeKey = `${(newState as { turnCount?: number }).turnCount ?? 0}:${JSON.stringify(action)}`;
        if (takeKey !== lastTakeBurstActionRef.current) {
          lastTakeBurstActionRef.current = takeKey;
          const actorId = action.playerId as string | undefined;
          if (actorId && actorId !== session?.playerId) {
            // Opponent harvest — always animate
            const player = (newState.players as GamePlayerState[]).find((p) => p.playerId === actorId);
            if (player) {
              let crystals: Partial<CrystalCounts> = {};
              if (action.type === 'take_three_crystals') {
                crystals = (action.crystals as Partial<CrystalCounts>) ?? {};
              } else {
                const color = action.crystal as string;
                if (color) crystals = { [color]: 2 };
              }
              playGemBurst(crystals, player.playerName, player.avatarId ?? null);
            }
          } else if (actorId && actorId === session?.playerId) {
            // Local player harvest — fire token flip only if the optimistic burst
            // did NOT already fire (planned harvests skip the click path entirely).
            if (!optimisticHarvestFiredRef.current) {
              let crystals: Partial<CrystalCounts> = {};
              if (action.type === 'take_three_crystals') {
                crystals = (action.crystals as Partial<CrystalCounts>) ?? {};
              } else {
                const color = action.crystal as string;
                if (color) crystals = { [color]: 2 };
              }
              setHarvestBurstKeys((prev) => {
                const next = { ...prev };
                for (const key of Object.keys(crystals) as GemKey[]) {
                  if ((crystals[key as keyof CrystalCounts] ?? 0) > 0) {
                    next[key] = (next[key] ?? 0) + 1;
                  }
                }
                return next;
              });
            }
            // Reset for next harvest regardless
            optimisticHarvestFiredRef.current = false;
          }
        }
      }

      const lastActionKey = action ? JSON.stringify(action) : null;
      if (lastActionKey && lastActionKey !== reserveBurstActionRef.current) {
        reserveBurstActionRef.current = lastActionKey;
        if (action?.type === 'reserve_card' && !action.cardId) {
          const playerId = action.playerId as string | undefined;
          const player = (newState.players as GamePlayerState[]).find((p) => p.playerId === playerId);
          if (player) {
            const gotFlux = (newState.crystalBank.flux ?? 0) < ((prev ?? state)?.crystalBank.flux ?? 0);
            const tier = Number(action.tier ?? 1) as 1 | 2 | 3;
            // Diff prev → new to find the newly drawn card
            const prevPlayer = ((prev ?? state)?.players as GamePlayerState[] | undefined)?.find(p => p.playerId === playerId);
            const prevReservedIds = new Set(prevPlayer?.reservedCards.map(c => c.id) ?? []);
            const newCard = player.reservedCards.find(c => !prevReservedIds.has(c.id));
            const deckEl = document.querySelector(`[data-deck-tier="${tier}"]`);
            const deckRect = deckEl?.getBoundingClientRect();
            const isLocalReserve = playerId === session?.playerId;
            // Local player: fly to Singularity panel; opponent: fly to action log
            const destEl = isLocalReserve
              ? document.querySelector('[data-singularity-well]')
              : document.querySelector('[data-nav-log]');
            const destRect = destEl?.getBoundingClientRect();
            cipherBurstKeyRef.current += 1;
            cipherBurstIsDeckRef.current = isLocalReserve;
            setAnimEndTime(abridgedAnims ? ABRIDGED_ACTION_MS : CIPHER_GAME_TOTAL_MS + CIPHER_TAIL_BUFFER_MS);
            setCipherBurst({
              key: cipherBurstKeyRef.current,
              sourceRect: deckRect
                ? { x: deckRect.left, y: deckRect.top, w: deckRect.width, h: deckRect.height }
                : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
              affinityHex: newCard?.bonusColor
                ? (GEM_META[newCard.bonusColor as GemKey]?.glowHex ?? '#7090FF')
                : '#7090FF',
              cardName: newCard?.name ?? '',
              gotFlux,
              // eslint-disable-next-line no-restricted-syntax -- ArtifactCard has many optional fields; this sentinel fallback intentionally omits them so the animation overlay can render without a real card object. Not an API type cast.
              card: newCard ?? ({ id: '', name: '', tier, cost: {}, lumens: 0, bonusColor: null } as unknown as ArtifactCard),
              tier,
              destPos: destRect
                ? { x: destRect.left + destRect.width / 2, y: destRect.top + destRect.height / 2 }
                : undefined,
              ownerName: isLocalReserve ? undefined : player.playerName,
            });
            if (gotFlux) gameAudio.playFluxCoin();
            gameAudio.playCipherSeal();
          }
        }
      }

      // AUDIT: turn-announcement branch — plan-registration state updates do not change
      // currentPlayerIndex, so the semantic guard below (playerIndex !== prev playerIndex)
      // correctly blocks re-fires without needing an additional action-key dedup ref.
      // fireTurnAnnouncement also has its own lastAnnouncedTurnRef guard as a second layer.
      // Skip re-announcing if this update is a planned_action_cancelled — the preceding
      // resolve_summon update already triggered the correct announcement and firing again
      // would produce a duplicate or out-of-order "your turn" banner.
      if (newState.status === 'playing' && newState.lastAction && newState.lastAction.type !== 'planned_action_cancelled' && newState.currentPlayerIndex !== (prev?.currentPlayerIndex ?? state?.currentPlayerIndex)) {
        const nextPlayer = newState.players[newState.currentPlayerIndex];
        if (nextPlayer && !isTutorial) {
          const isMe = nextPlayer.playerId === session?.playerId;
          if (!isMe) return;
          const key = `ws-${newState.currentPlayerIndex}-${newState.version}`;
          const firstLumId = nextPlayer.claimedLuminaryIds?.[0];
          const lum = firstLumId ? newState.luminaries.find(l => l.id === firstLumId) : undefined;
          const accentColor = lum?.summonColor ?? '#6366f1';
          fireTurnAnnouncement(key, nextPlayer.playerName, nextPlayer.avatarId ?? null, isMe, accentColor, nextPlayer.lumens, newState.turnTimerSeconds ?? null);
        }
      }
  };

  drainQueueFnRef.current = () => {
    queueTimerRef.current = null;
    if (stateQueueRef.current.length === 0) return;
    const remaining = animationEndTimeRef.current - Date.now();
    // Also pause draining while a summon cutscene is actively playing.
    const summonActive = summonQueue.length > 0;
    if (remaining > 50 || pendingTurnAnnounceRef.current || summonActive) {
      const delay = remaining > 50 ? remaining + 100 : summonActive ? 500 : 200;
      queueTimerRef.current = setTimeout(() => drainQueueFnRef.current(), delay);
      return;
    }
    const next = stateQueueRef.current.shift()!;
    processUpdateRef.current(next);
    if (stateQueueRef.current.length > 0) {
      const nextRemaining = animationEndTimeRef.current - Date.now();
      queueTimerRef.current = setTimeout(
        () => drainQueueFnRef.current(),
        Math.max(nextRemaining + 100, 100)
      );
    }
  };

  // ── Rematch vote state ─────────────────────────────────────────────────────
  const [rematchVote, setRematchVote] = useState<RematchVoteUpdate | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votePending, setVotePending] = useState(false);

  const [reconnectBannerDismissed, setReconnectBannerDismissed] = useState(false);
  const { sendChatMessage, isConnected, isReconnecting } = useGameWebsocket({
    roomId: roomId!,
    sessionToken: session?.sessionToken || '',
    onStateUpdate: (newState) => {
      const remaining = animationEndTimeRef.current - Date.now();
      const queueBusy = stateQueueRef.current.length > 0 || !!queueTimerRef.current;
      if (remaining > 50 || queueBusy) {
        stateQueueRef.current.push(newState);
        // Pre-hide the market slot that is about to receive a newly dealt card.
        // Without this, queryClient.setQueryData (below) triggers a React render
        // that shows the new card in the slot before the deal animation has a
        // chance to run — causing a premature reveal.  By calling setHiddenSlots
        // here in the same synchronous block, React 18 batches both updates into
        // one render so the slot is hidden the moment the new card lands in state.
        const eagerAction = newState.lastAction;
        if (eagerAction && (
          eagerAction.type === 'purchase_card' ||
          (eagerAction.type === 'reserve_card' && eagerAction.cardId)
        )) {
          const eagerCardId = eagerAction.cardId as string;
          const prevMarkets: Record<number, (ArtifactCard | null)[]> = {
            1: prevStateRef.current?.marketTier1 ?? [],
            2: prevStateRef.current?.marketTier2 ?? [],
            3: prevStateRef.current?.marketTier3 ?? [],
          };
          for (const tierStr of ['1', '2', '3'] as const) {
            const tier = Number(tierStr);
            const idx = (prevMarkets[tier] as (ArtifactCard | null)[]).findIndex(
              (c: ArtifactCard | null) => c?.id === eagerCardId,
            );
            if (idx >= 0) {
              const eagerSlotKey = `${tier}-${idx}`;
              // Keep the old card visible as a ghost until the burst animation
              // starts.  We intentionally do NOT call setHiddenSlots here:
              // the ghost check in the market render fires before the
              // isHidden/!c branch, so the ghost alone is sufficient to block
              // the replacement card from showing.  Calling setHiddenSlots
              // eagerly would also produce a dashed-placeholder flash in the
              // single-frame gap before the ghost state commits.
              const oldCard = (prevMarkets[tier] as (ArtifactCard | null)[])[idx];
              if (oldCard) {
                setBurstGhostCards(prev => ({ ...prev, [eagerSlotKey]: oldCard }));
              }
              break;
            }
          }
        }
        // Eagerly apply the new state to the data cache so that affordability
        // calculations and the planning UI (canAffordCard / "Plan: Forge" button)
        // always reflect the latest server state even while an animation is still
        // playing.  Visual-only state (hiddenSlots, flippingCards, cardActionBurst,
        // summon cutscene) is derived exclusively from processUpdate, which is still
        // gated by the animation queue, so animations are completely unaffected.
        queryClient.setQueryData(
          getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }),
          newState,
        );
        if (!queueTimerRef.current) {
          const delay = remaining > 50 ? remaining + 100 : 100;
          queueTimerRef.current = setTimeout(() => drainQueueFnRef.current(), delay);
        }
      } else {
        processUpdateRef.current(newState);
      }
    },
    onPlayerKicked: (playerId) => {
      if (playerId === session?.playerId) {
        toast({ title: "Kicked", description: "You were kicked from the room." });
        setLocation('/');
      }
    },
    onRematchVoteUpdate: (data) => {
      setRematchVote(data);
    },
    onRematchStarted: (_state, _sessionStats) => {
      // State was already forwarded to onStateUpdate. Reset vote UI.
      setRematchVote(null);
      setHasVoted(false);
      setVotePending(false);
    },
    onRematchCancelled: () => {
      setRematchVote(null);
      setHasVoted(false);
      setVotePending(false);
      toast({ title: 'Rematch cancelled', description: 'Not enough players confirmed. The game has ended.' });
    },
    onRematchDeclined: (_sessionStats) => {
      // This player was not included — send them home after a brief message
      toast({ title: 'Not included', description: 'The other players started a new game without you.' });
      setTimeout(() => setLocation('/'), 3000);
    },
    onChatMessage: (msg) => {
      setChatMessages(prev => [...prev, msg]);
      if (activeTab !== 'log') setUnreadChat(prev => prev + 1);
    },
  });
  // Inline sync — runs on every render, keeps the ref current so the
  // refetchInterval callback always sees the latest WS health without
  // needing to be inside this render's closure.
  wsConnectedRef.current = isConnected;

  // Reset the manual dismiss whenever a new disconnect cycle begins so the
  // banner reappears for each fresh drop (not just the first one).
  useEffect(() => {
    if (isReconnecting) setReconnectBannerDismissed(false);
  }, [isReconnecting]);

  const submitAction = useSubmitAction();

  // Broadcast civLabel to the server so all players can see it in the scoreboard.
  // Runs on mount, whenever the player renames their civilization, and whenever the
  // WebSocket reconnects (isConnected flips true) so a mid-game rejoin always
  // re-syncs the stored civName even when state.status is already 'playing'.
  useEffect(() => {
    if (!session || !roomId || !state || state.status === 'lobby') return;
    if (!isConnected) return;
    submitAction.mutate({
      roomId,
      data: { sessionToken: session.sessionToken, type: 'set_civ_name', civName: civLabel },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [civLabel, session?.sessionToken, roomId, state?.status, isConnected]);

  // ── Polling-based animation fallback ─────────────────────────────────────
  // TanStack Query polls the server on a refetch interval. If a WS state_update
  // is missed (transient disconnect), the poll delivers the new state but
  // animations are silently skipped — only onStateUpdate (WS) fires them.
  //
  // This effect watches `state` (the TQ-cached value) and feeds any version
  // that prevStateRef hasn't processed into the same queue path. Covers:
  //   • Local player's own actions when the REST fallback misses edge cases
  //   • Opponent actions during WS disconnects (no REST path available there)
  //
  // Safety: processUpdateRef's version guard (newState.version <= prev.version
  // → return) prevents double-animation when WS already processed the state.
  // The summon dedup guard (handledSummonEventIdsRef) adds a second layer for
  // cutscenes. The effect is intentionally not dep-array-exhaustive — it only
  // needs to react to `state` changing (the polling result).
  useEffect(() => {
    if (!state || !prevStateRef.current) return;
    const polledVersion = state.version;
    const prevVersion = prevStateRef.current.version;
    if (typeof polledVersion !== 'number' || polledVersion <= prevVersion) return;
    // Guard: the WS onStateUpdate handler eagerly calls queryClient.setQueryData,
    // which flips `state` and triggers this effect BEFORE prevStateRef has been
    // advanced by processUpdate. Without this check the same state version gets
    // pushed into stateQueueRef twice — once from the WS path and once here.
    // Both calls would eventually process the same pendingSummonEvent, and while
    // the inner dedup guards (version guard + handledSummonEventIdsRef) catch the
    // duplicate, the double-queued entry still creates unnecessary work during the
    // 12-second summon cutscene gate and can cause queue confusion under load.
    if (stateQueueRef.current.some(s => s.version === polledVersion)) return;
    // WS missed this version — feed it through the animation queue.
    const remaining = animationEndTimeRef.current - Date.now();
    const queueBusy = stateQueueRef.current.length > 0 || !!queueTimerRef.current;
    if (remaining > 50 || queueBusy) {
      // eslint-disable-next-line no-restricted-syntax -- `state` comes from TanStack Query's inferred return type which may be slightly wider than GameState; the cast is safe because the server always returns a conforming GameState object validated by Zod.
      stateQueueRef.current.push(state as unknown as GameState);
      if (!queueTimerRef.current) {
        queueTimerRef.current = setTimeout(
          () => drainQueueFnRef.current(),
          Math.max(remaining + 100, 100),
        );
      }
    } else {
      // eslint-disable-next-line no-restricted-syntax -- same TanStack Query width mismatch as above; server response is Zod-validated so the cast is safe.
      processUpdateRef.current(state as unknown as GameState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // ── Burst-ghost safety valve ───────────────────────────────────────────────
  // Ghost cards should be cleared within ~1–3 s (queue drain + animation start).
  // If the queue is blocked (e.g., 12 s Luminary cutscene) or a clearing path
  // is missed, ghosts persist and the slot appears frozen.  This effect sets a
  // 7 s deadline: any ghost still alive after that is force-cleared.  7 s is
  // longer than the longest regular animation (cipher burst ~6.5 s) but shorter
  // than the summon cutscene (12 s), so it catches genuinely stuck ghosts
  // without interfering with in-flight animations.
  useEffect(() => {
    if (Object.keys(burstGhostCards).length === 0) return;
    const t = setTimeout(() => {
      setBurstGhostCards(prev => {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      });
    }, 7000);
    return () => clearTimeout(t);
  }, [burstGhostCards]);

  // ── Summon cutscene duration used for the animation barrier ───────────────
  const SUMMON_CUTSCENE_DURATION_MS = 12_000;

  // ── enqueueSummon ─────────────────────────────────────────────────────────
  // Triggered by real game events detected via pendingSummonEvents.
  //
  // Dedup guard: skips any eventId already in handledSummonEventIdsRef.
  // Animation barrier: if other animations are running, delays the DOM
  // measurement and queue push until they complete.
  //
  // Sequence:
  //   1. Dedup check + mark eventId handled
  //   2. Wait for any running animation barrier to expire
  //   3. setActiveTab('board')          — mount LuminaryCard elements
  //   4. double rAF                     — let React commit + browser layout
  //   5. el.scrollIntoView (instant)    — bring card into view on both axes
  //   6. one rAF                        — let scroll settle
  //   7. getBoundingClientRect()        — fresh measurement
  //   8. setSummonQueue + setAnimEndTime — start the cutscene; block state drains
  //
  // If the element is missing after switching tabs, falls back to viewport-centre.
  const enqueueSummon = (
    lumId: string,
    lumName: string,
    lumDomain: string,
    lumLumens: number,
    lumFlavor: string,
    eventId: string,
    isDevTest: boolean,
    winSealingColor?: string,
    claimedBy?: string,
  ) => {
    // 1. Dedup guard (skip for dev tests which intentionally replay)
    if (!isDevTest) {
      if (handledSummonEventIdsRef.current.has(eventId)) {
        console.log(`[Luminae] enqueueSummon: duplicate eventId="${eventId}" — skipped`);
        return;
      }
      handledSummonEventIdsRef.current.add(eventId);
    }

    console.log(`[Luminae] enqueueSummon: queueing lumId="${lumId}" eventId="${eventId}" isDevTest=${isDevTest}`);

    const doEnqueue = () => {
      // If the game has already ended, do not push this summon into the queue.
      // The currently-active cutscene (summonQueue[0]) is allowed to finish via
      // the pendingGameOver mechanism; everything else is silently discarded.
      if (gameFinishedRef.current) {
        pendingSuppressLumIdsRef.current.delete(lumId);
        return;
      }
      setActiveTab('board');                         // 3. ensure board tab mounts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {                // 4. React commit + layout
          const el = document.querySelector(
            `[data-luminary-id="${lumId}"]`
          ) as HTMLElement | null;

          if (!el) {
            console.warn(
              `[Luminae] enqueueSummon: no DOM element for luminary "${lumId}". ` +
              'Falling back to viewport centre.'
            );
            pendingSuppressLumIdsRef.current.delete(lumId);
            setSummonQueue(q => [
              ...q,
              { id: lumId, name: lumName, domain: lumDomain,
                lumens: lumLumens, flavor: lumFlavor, claimedBy, cardRect: undefined, eventId, isDevTest, winSealingColor },
            ]);
            // Signal that this event has landed in the queue.
            enqueuingCountRef.current = Math.max(0, enqueuingCountRef.current - 1);
            setAnimEndTime(SUMMON_CUTSCENE_DURATION_MS); // 8. block state drains
            return;
          }

          // 5. Scroll into view — browser handles both scroll containers at once.
          el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });

          requestAnimationFrame(() => {             // 6. settle
            const rect = el.getBoundingClientRect();
            const cardRectVal = rect.width > 0
              ? { cx: rect.left + rect.width / 2,
                  cy: rect.top  + rect.height / 2,
                  w:  rect.width }
              : undefined;

            if (!cardRectVal) {
              console.warn(
                `[Luminae] enqueueSummon: element for "${lumId}" has zero width ` +
                'after scroll. Falling back to viewport centre.'
              );
            }

            pendingSuppressLumIdsRef.current.delete(lumId);
            setSummonQueue(q => [                   // 7. start the cutscene
              ...q,
              { id: lumId, name: lumName, domain: lumDomain,
                lumens: lumLumens, flavor: lumFlavor, claimedBy, cardRect: cardRectVal, eventId, isDevTest, winSealingColor },
            ]);
            // Signal that this event has landed in the queue.
            enqueuingCountRef.current = Math.max(0, enqueuingCountRef.current - 1);
            setAnimEndTime(SUMMON_CUTSCENE_DURATION_MS); // 8. block state drains
          });
        });
      });
    };

    // 2. Respect animation barrier — delay if other animations are active.
    const animBarrier = animationEndTimeRef.current - Date.now();
    if (animBarrier > 50) {
      console.log(`[Luminae] enqueueSummon: delaying ${Math.round(animBarrier)}ms for animation barrier`);
      setTimeout(doEnqueue, animBarrier + 100);
    } else {
      doEnqueue();
    }
  };
  // Keep the ref in sync so the pre-early-return useEffect can call it.
  enqueueSummonRef.current = enqueueSummon;

  // ── Deferred game-over flush ───────────────────────────────────────────────
  // When a Luminary summon and the win condition arrive in the same state
  // update, `pendingGameOver` is set to hold back the win overlay and win
  // audio until the summon cutscene completes. This effect fires the deferred
  // actions as soon as the summon queue fully drains.

  // Delay (ms) between the fanfare starting and the win overlay appearing /
  // playWin() firing. Should roughly match the fanfare duration (~1.3 s).
  // Increase to let the fanfare finish before the overlay fades in; decrease
  // to shorten the gap. Tune without rebuilding by changing this one value.
  const WIN_FANFARE_DELAY_MS = 1400;

  useEffect(() => {
    // Only flush when the queue is fully drained AND no events are still mid-RAF
    // chain waiting to be pushed into the queue. enqueuingCountRef drops to zero
    // synchronously when each event lands in setSummonQueue (inside enqueueSummon).
    if (
      pendingGameOver &&
      summonQueue.length === 0 &&
      enqueuingCountRef.current === 0 &&
      !fanfareFiredForGameOverRef.current
    ) {
      fanfareFiredForGameOverRef.current = true;
      cancelTurnAnnouncement();
      // Play a short affinity fanfare for the sealing Luminary.
      // Delay releasing pendingGameOver (and hence the win overlay) until the
      // fanfare finishes (~1.3 s), so the overlay fades in after — not during —
      // the fanfare. playWin() fires in the same timeout, immediately after the
      // overlay is released. If no color was captured (edge case), the fanfare
      // gracefully falls back to the flux/default voice.
      //
      // Also check animBarrierMsRef: the summon path stored any remaining
      // animation-barrier time there. The summon cutscene (~12 s) always
      // outlasts the barrier cap (≤ 3 s), so this is zero in practice, but
      // keeping the check here ensures cancelPendingAnimations() is not called
      // while a card/gem animation burst is still mid-sequence.
      const summonFlushBarrierMs = Math.max(0, animBarrierMsRef.current - Date.now());
      animBarrierMsRef.current = 0;
      gameAudio.playLuminaryFanfare(pendingGameOverLumColorRef.current);
      winBarrierTimerRef.current = setTimeout(() => {
        winBarrierTimerRef.current = null;
        cancelPendingAnimations();
        pendingGameOverLumColorRef.current = '';
        fanfareFiredForGameOverRef.current = false;
        setPendingGameOver(false);
        gameAudio.playWin();
      }, WIN_FANFARE_DELAY_MS + summonFlushBarrierMs);
    }
  }, [summonQueue.length, pendingGameOver]);

  // In tutorial mode, suppress the summon cutscene entirely — immediately drain
  // any queued summon entries by running the onComplete logic synchronously.
  // This prevents the near-opaque cinematic overlay from blacking out the tutorial
  // UI for the ~9.5 s cutscene duration. resolve_summon is still dispatched
  // (now allowed through the tutorial gate above) so the server gate clears correctly.
  useEffect(() => {
    if (!isTutorial) return;
    if (summonQueue.length === 0) return;
    const entry = summonQueue[0];
    if (!entry) return;
    setSummonQueue(q => q.slice(1));
    setClaimedThisSession(prev =>
      prev.includes(entry.id) ? prev : [...prev, entry.id]
    );
    if (!entry.isDevTest) {
      executeAction({ type: 'resolve_summon', eventId: entry.eventId });
    }
  // summonQueue is the reactive dep that re-runs this effect whenever a new
  // entry is pushed. executeAction is omitted from the dep array intentionally:
  // it is re-created each render but the latest version is always captured
  // through the closure when this effect fires due to summonQueue changing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTutorial, summonQueue]);

  const playGemBurst = (crystals: Partial<CrystalCounts>, playerName: string, avatarId: string | null) => {
    const gems: GemKey[] = [];
    for (const [color, count] of Object.entries(crystals)) {
      if (color === 'flux') continue;
      const gem = color as GemKey;
      const total = count ?? 0;
      for (let i = 0; i < total; i += 1) gems.push(gem);
    }
    if (gems.length === 0) return;
    if (gemBurstTimerRef.current) clearTimeout(gemBurstTimerRef.current);
    gemBurstKeyRef.current += 1;
    const seq = gemBurstKeyRef.current;
    setGemBurst({ key: seq, gems, playerName, avatarId });
    gameAudio.playChipsCollected();
    const totalDuration = (gems.length - 1) * GEM_BURST_STAGGER_MS + GEM_BURST_BASE_MS + GEM_BURST_SETTLE_MS;
    setAnimEndTime(totalDuration);
    gemBurstTimerRef.current = setTimeout(() => {
      if (gemBurstKeyRef.current === seq) setGemBurst(null);
      gemBurstTimerRef.current = null;
    }, totalDuration);
  };

  // Auto-dismiss returnPhase if the server state changes and the condition
  // is no longer true (e.g. player purchased a card and crystals dropped).
  // Must be BEFORE the early returns below so this hook fires on every render.
  useEffect(() => {
    if (!returnPhase || !me) return;
    const handTotal = Object.values(me.crystals).reduce((a, b) => a + b, 0);
    const pendingTotal = Object.values(returnPhase.pendingTake).reduce((a, b) => a + (b ?? 0), 0);
    if (handTotal + pendingTotal <= 10) {
      setReturnPhase(null);
      setReturnSelections({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.crystals, returnPhase]);

  // Detect zero-yield harvest: play a blocked cue when a harvest action was
  // submitted but the player's actual crystal counts didn't increase for any
  // targeted gem. Must be BEFORE the early returns so the hook always runs.
  useEffect(() => {
    const check = pendingHarvestCheckRef.current;
    if (!check || !me) return;
    // Guard: only process when the state that contains OUR action has arrived.
    // me?.crystals is a new reference on EVERY WS update (opponent actions,
    // turn advances, etc.), so without this guard an unrelated update fires the
    // effect while preCrystals equals me.crystals — falsely marking all gems as
    // blocked and triggering the amber border flash.
    //
    // Two ways to know our harvest has landed:
    //   1. Any targeted crystal count changed by value  →  normal / partial-block
    //   2. state.lastAction is our own harvest type     →  zero-yield edge case
    //      (bank drained by another player between our selection and submission)
    //
    // NOTE: we cannot use versionAdvanced alone — opponent actions also increment
    // state.version, so that check would still trigger false positives.
    const crystalsChanged = check.gems.some(
      g => g !== 'flux' && (me.crystals[g as keyof CrystalCounts] ?? 0) !== (check.preCrystals[g as keyof CrystalCounts] ?? 0),
    );
    const la = state?.lastAction as { type?: string; playerId?: string } | null;
    const ourHarvestLanded =
      (la?.type === 'take_three_crystals' || la?.type === 'take_two_crystals') &&
      la?.playerId === session?.playerId;
    if (!crystalsChanged && !ourHarvestLanded) return;
    pendingHarvestCheckRef.current = null;
    const blockedGems = check.gems.filter(
      (g) => g !== 'flux' && (me.crystals[g as keyof CrystalCounts] ?? 0) <= (check.preCrystals[g as keyof CrystalCounts] ?? 0),
    );
    if (blockedGems.length > 0) {
      // Play a per-affinity blocked thud for each blocked gem only,
      // staggered by 80 ms so overlapping colors remain distinguishable.
      blockedGems.forEach((g, i) => {
        setTimeout(() => gameAudio.playHarvestBlocked(g), i * 80);
      });
      setHarvestBlockedKeys(prev => {
        const next = { ...prev };
        for (const g of blockedGems) {
          next[g as GemKey] = (next[g as GemKey] ?? 0) + 1;
        }
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.crystals]);

  // ── Callback hooks for card interaction ────────────────────────────
  // These must be declared before any early return so they satisfy
  // react-hooks/rules-of-hooks. They are safe because effectiveCost
  // and me are already declared (may be undefined/null before the
  // state is loaded, but the hooks themselves handle that).
  const computeCosts = useCallback((card: ArtifactCard, mode: CostMode): Partial<Record<GemKey, number>> | undefined => {
    if (!me) return undefined;
    if (mode === 'printed') return undefined;
    const afterBonus = effectiveCost(card, me) as Record<string, number>;
    if (mode === 'after_bonuses') return afterBonus as Partial<Record<GemKey, number>>;
    // 'needed_now': after bonuses, subtract held tokens + pre-harvest tally, clamp >= 0.
    const check = pendingHarvestCheckRef.current;
    let activeTally: Partial<CrystalCounts> = selectedCrystals;
    if (check?.tally && check?.preCrystals) {
      const alreadyLanded = Object.keys(check.tally).some(
        g => (me.crystals[g as keyof CrystalCounts] ?? 0) > (check.preCrystals![g as keyof CrystalCounts] ?? 0),
      );
      activeTally = alreadyLanded ? {} : check.tally;
    }
    const out: Partial<Record<GemKey, number>> = {};
    for (const c of CRYSTALS) {
      if (c === 'flux') continue;
      const eff = afterBonus[c] ?? 0;
      const held = me.crystals[c as keyof CrystalCounts] ?? 0;
      const harvest = activeTally[c as keyof CrystalCounts] ?? 0;
      out[c as GemKey] = Math.max(0, eff - held - harvest);
    }
    return out;
  }, [me, effectiveCost, selectedCrystals]);

  const canReserveMore = useCallback((p: GamePlayerState) => p.reservedCards.length < 3, []);

  const handleBuy = (card: ArtifactCard, fromReserve = false) => {
    if (!isMyTurnForCoreAction) return;
    executeAction({ type: fromReserve ? 'purchase_reserved' : 'purchase_card', cardId: card.id, cardRef: card });
  };

  const handleReserveCard = (card: ArtifactCard) => {
    if (!isMyTurnForCoreAction) return;
    executeAction({ type: 'reserve_card', cardId: card.id, _tier: card.tier, tier: card.tier });
  };

  const handleReserveDeck = (tier: number) => {
    if (!isMyTurnForCoreAction) return;
    executeAction({ type: 'reserve_card', tier, _tier: tier });
  };

  const openDeckSheet = useCallback((tier: 1 | 2 | 3) => {
    setPendingDeckConfirm(false);
    setSelectedDeckTier(tier);
  }, []);

  const closeDeckSheet = useCallback(() => {
    setSelectedDeckTier(null);
    setPendingDeckConfirm(false);
  }, []);

  const openCardSheet = useCallback((card: ArtifactCard, fromReserve: boolean) => {
    if (!me) return;
    if (!cardDetailDiscovered) {
      setCardDetailDiscovered(true);
      localStorage.setItem('luminae_card_detail_discovered', 'true');
    }
    setCardFlipped(false);
    setPendingSheetAction(null);
    setSelectedCard({
      card, fromReserve,
      canBuy: isMyTurnForCoreAction && canAffordCard(card, me),
      canReserve: isMyTurnForCoreAction && !fromReserve && canReserveMore(me),
      effectiveCosts: computeCosts(card, costMode),
    });
  }, [me, cardDetailDiscovered, isMyTurnForCoreAction, costMode, computeCosts, canAffordCard, canReserveMore]);

  const openForgedCardSheet = useCallback((card: ArtifactCard) => {
    setCardFlipped(false);
    setPendingSheetAction(null);
    setSelectedCard({ card, fromReserve: false, canBuy: false, canReserve: false, readOnly: true });
  }, []);

  if (accountLoading) return <AccountLoadingScreen />;

  if (error) {
    return <div className="h-[100dvh] flex items-center justify-center text-destructive">Error loading game.</div>;
  }

  if (!state || !session) {
    return <div className="h-[100dvh] flex items-center justify-center text-muted-foreground animate-pulse">Loading board...</div>;
  }

  if (!prevStateRef.current) prevStateRef.current = state;

  const oblivionRows: Array<{ name: string; amount: number }> = (state.luminaries ?? [])
    .filter(lum => (lum.oblivion ?? 0) > 0 &&
      state.players.some(p => (p.claimedLuminaryIds ?? []).includes(lum.id)))
    .map(lum => ({ name: lum.name, amount: lum.oblivion! }));
  const totalOblivion = oblivionRows.reduce((s, r) => s + r.amount, 0);
  const eminenceBreakdown: EminenceBreakdown = {
    artifacts: (me?.purchasedCards ?? []).reduce((sum, card) => sum + (card.lumens ?? 0), 0),
    luminaries: (me?.claimedLuminaryIds ?? []).reduce((sum, lumId) => {
      const lum = state.luminaries.find((l) => l.id === lumId);
      if (lum?.oblivion) return sum;
      return sum + (lum?.lumens ?? 0);
    }, 0),
    oblivionRows,
    other: 0,
  };
  eminenceBreakdown.other = Math.max(0, (me?.lumens ?? 0) - eminenceBreakdown.artifacts - eminenceBreakdown.luminaries + totalOblivion);

  const handleCrystalClick = (color: keyof CrystalCounts) => {
    if ((!isMyTurn && !canPlan) || color === 'flux' || !state) return;
    const inBank = state.crystalBank[color] ?? 0;

    if (actionMode === 'take2') {
      if (selectedCrystals[color] === 2) { setSelectedCrystals({}); setCrystalHistory([]); setPrePromotionHistory(null); setActionMode('none'); }
      else if (inBank >= 4) { setSelectedCrystals({ [color]: 2 }); setCrystalHistory([color, color]); gameAudio.playCrystalPicked(color as GemKey); }
      return;
    }

    const current = selectedCrystals[color] ?? 0;
    if (current > 0) {
      const next = { ...selectedCrystals };
      delete next[color];
      const empty = Object.keys(next).length === 0;
      setSelectedCrystals(next);
      setCrystalHistory(prev => prev.filter(c => c !== color));
      if (empty) setActionMode('none');
      return;
    }

    if (inBank <= 0) return;
    const distinctCount = Object.keys(selectedCrystals).length;
    if (distinctCount >= 3) return;
    setSelectedCrystals({ ...selectedCrystals, [color]: 1 });
    setCrystalHistory(prev => [...prev, color]);
    setActionMode(actionMode === 'none' ? 'take3' : actionMode);
    gameAudio.playCrystalPicked(color as GemKey);
  };

  const handleUndoCrystal = () => {
    if (crystalHistory.length === 0) return;
    // If undoing a take-2 that was created via promoteToTake2, restore the
    // pre-promotion snapshot (which may be empty) rather than removing just
    // one history entry and leaving a stale single-crystal selection.
    if (actionMode === 'take2' && prePromotionHistory !== null) {
      const restored = prePromotionHistory;
      setCrystalHistory(restored);
      setPrePromotionHistory(null);
      if (restored.length === 0) {
        setSelectedCrystals({});
        setActionMode('none');
      } else {
        const rebuilt: Partial<CrystalCounts> = {};
        for (const c of restored) rebuilt[c] = (rebuilt[c] ?? 0) + 1;
        setSelectedCrystals(rebuilt);
        const restoredIsTake2 = Object.keys(rebuilt).length === 1 && rebuilt[restored[0]] === 2;
        setActionMode(restoredIsTake2 ? 'take2' : 'take3');
      }
      return;
    }
    const newHistory = crystalHistory.slice(0, -1);
    setCrystalHistory(newHistory);
    if (newHistory.length === 0) {
      setSelectedCrystals({});
      setActionMode('none');
    } else {
      const rebuilt: Partial<CrystalCounts> = {};
      for (const c of newHistory) {
        rebuilt[c] = (rebuilt[c] ?? 0) + 1;
      }
      setSelectedCrystals(rebuilt);
      const isTake2 = Object.keys(rebuilt).length === 1 && rebuilt[newHistory[0]] === 2;
      setActionMode(isTake2 ? 'take2' : 'take3');
    }
  };

  const promoteToTake2 = (color: GemKey) => {
    if (!state || (state.crystalBank[color] ?? 0) < 4) return;
    setPrePromotionHistory(crystalHistory);
    setSelectedCrystals({ [color]: 2 });
    setCrystalHistory([color, color]);
    setActionMode('take2');
    gameAudio.playCrystalPicked(color);
  };

  type ExecuteActionPayload = Omit<ActionRequest, 'sessionToken' | 'crystals' | 'crystal'> & {
    _tier?: number;
    cardRef?: ArtifactCard;
    playerId?: string;
    crystals?: Partial<CrystalCounts>;
    crystal?: string;
  };

  const executeAction = async (payload: ExecuteActionPayload) => {
    // Tutorial gate — only permit the action type for the current step.
    // Steps 0–3 each have specific permitted types; step 4 (Luminaries intro,
    // requiresConfirm) has an empty list, so ALL actions are blocked until the
    // player taps "Got it" and the overlay dismisses (tutorialStep goes to -1).
    // resolve_summon must always reach the server to clear the summon gate,
    // even during tutorial steps where all other action types are gated.
    if (payload.type !== 'resolve_summon' && isTutorial && tutorialStep >= 0 && tutorialStep < LUMII_BEAT_COUNT) {
      const permitted = LUMII_BEAT_GATES[tutorialStep] ?? [];
      if (!permitted.includes(payload.type as string)) {
        setTutorialNudgeTick(t => t + 1);
        return;
      }
    }
    const CORE_ACTION_TYPES = ['take_three_crystals', 'take_two_crystals', 'purchase_card', 'purchase_reserved', 'reserve_card'];
    if (CORE_ACTION_TYPES.includes(payload.type)) {
      setCoreActionSubmitted(true);
    }
    try {
      const normalized = { ...payload };
      delete normalized._tier;
      if (normalized.crystals) {
        normalized.crystals = Object.assign({ ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 }, normalized.crystals) as CrystalCounts;
      }
      const restState = await submitAction.mutateAsync({ roomId: roomId!, data: { sessionToken: session.sessionToken, ...normalized } as ActionRequest });
      // Fallback: if the WebSocket state_update is missed (e.g. transient disconnect at the
      // moment of submission), the WS-driven animation never fires. The REST response contains
      // the same post-action state (including lastAction) as the WS broadcast. After a short
      // delay to give the WS time to arrive first, check whether prevStateRef has already
      // advanced to this version. If not, push the REST state through the same queue path.
      if (restState && typeof restState.version === 'number') {
        const restStateTyped = restState;
        setTimeout(() => {
          if (!prevStateRef.current || prevStateRef.current.version < restStateTyped.version) {
            if (import.meta.env.DEV) console.log('[forge-trace] WS missed — using REST fallback for v:', restStateTyped.version, 'action:', restStateTyped.lastAction?.type);
            const remaining = animationEndTimeRef.current - Date.now();
            const queueBusy = stateQueueRef.current.length > 0 || !!queueTimerRef.current;
            if (remaining > 50 || queueBusy) {
              stateQueueRef.current.push(restStateTyped);
              if (!queueTimerRef.current) {
                queueTimerRef.current = setTimeout(() => drainQueueFnRef.current(), Math.max(remaining + 100, 100));
              }
            } else {
              processUpdateRef.current(restStateTyped);
            }
          }
        }, 200);
      }
      setActionMode('none');
      setSelectedCrystals({});
      setCrystalHistory([]);
      setPrePromotionHistory(null);
      // resolve_summon fires from onComplete for every player who watched the
      // cutscene (including opponents who skipped the view and may be browsing
      // cards). Do not close their card sheet as a side-effect of that action.
      if (payload.type !== 'resolve_summon') setSelectedCard(null);
      if (payload.type === 'purchase_reserved') {
        gameAudio.playCardPurchased();
        const bonusColor = payload.cardRef?.bonusColor as GemKey | undefined;
        if (bonusColor && bonusColor !== 'flux') {
          const tBonus = setTimeout(() => gameAudio.playBonusSound(bonusColor), abridgedAnims ? 380 : 1000);
          cardAnimTimersRef.current.push(tBonus);
        }
        const lumens = payload.cardRef?.lumens ?? 0;
        const name = payload.cardRef?.name ?? 'Artifact';
        burstKeyRef.current += 1;
        setPurchaseBurst({ key: burstKeyRef.current, lumens, name });
        const tPurchase = setTimeout(() => setPurchaseBurst(null), 1400);
        cardAnimTimersRef.current.push(tPurchase);
        // Forge animation — same path as market forge, card flies from reserved slot to hand tab
        if (payload.cardRef) {
          const cardEl = document.querySelector(`[data-reserved-card-id="${payload.cardId}"]`);
          const cardRect = cardEl?.getBoundingClientRect();
          const handTabEl = document.querySelector('[data-nav-hand]');
          const handTabR = handTabEl?.getBoundingClientRect();
          const burstDestPos = handTabR
            ? { x: handTabR.left + handTabR.width / 2, y: handTabR.top + handTabR.height / 2 }
            : undefined;
          const _spentCost = me ? effectiveCost(payload.cardRef as ArtifactCard, me as GamePlayerState) as Record<string, number> : {};
          const _spentColors = Object.entries(_spentCost)
            .filter(([, v]) => v > 0)
            .map(([c]) => c as GemKey);
          cardActionBurstKeyRef.current += 1;
          setAnimEndTime(abridgedAnims ? ABRIDGED_ACTION_MS : FORGE_FULL_MS);
          setCardActionBurst({
            key: cardActionBurstKeyRef.current,
            card: payload.cardRef as ArtifactCard,
            tier: (payload.cardRef as ArtifactCard).tier,
            actionType: 'purchase',
            playerName: me?.playerName ?? 'You',
            avatarId: (me as GamePlayerState | undefined)?.avatarId ?? null,
            lumens,
            gotFlux: false,
            startRect: cardRect
              ? { x: cardRect.left, y: cardRect.top, w: cardRect.width, h: cardRect.height }
              : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
            destPos: burstDestPos,
            spentColors: _spentColors,
          });
          const seq = cardActionBurstKeyRef.current;
          const tClear = setTimeout(() => {
            if (cardActionBurstKeyRef.current !== seq) return;
            setCardActionBurst(null);
          }, abridgedAnims ? 500 : 3100);
          cardAnimTimersRef.current.push(tClear);
        }
      }
    } catch (err: unknown) {
      if (CORE_ACTION_TYPES.includes(payload.type)) {
        setCoreActionSubmitted(false);
      }
      toast({ variant: 'destructive', title: 'Action failed', description: err instanceof Error ? err.message : String(err) });
    }
  };

  const queueLegality: { ok: boolean; reason: string; actionType: null | 'take3' | 'take2' } = (() => {
    if (!me) return { ok: false, reason: '', actionType: null };
    const total = Object.values(selectedCrystals).reduce((a, b) => a + (b ?? 0), 0);
    if (total === 0) return { ok: false, reason: '', actionType: null };
    const distinct = Object.keys(selectedCrystals);
    const handTotal = Object.values(me.crystals).reduce((a, b) => a + b, 0);
    const overLimit = handTotal + total > 10;
    const excess = handTotal + total - 10;
    if (distinct.length === 1 && (selectedCrystals[distinct[0] as keyof CrystalCounts] ?? 0) === 2) {
      const c = distinct[0] as keyof CrystalCounts;
      if ((state.crystalBank[c] ?? 0) >= 4) {
        const reason = overLimit
          ? `Harness 2 ${GEM_META[c as GemKey].name} (return ${excess})`
          : `Harness 2 ${GEM_META[c as GemKey].name}`;
        return { ok: true, reason, actionType: 'take2' };
      }
      return { ok: false, reason: `Need 4+ in well to harness 2`, actionType: null };
    }
    if (distinct.every(c => (selectedCrystals[c as keyof CrystalCounts] ?? 0) === 1) && distinct.length <= 3) {
      const base = distinct.length === 3 ? 'Harness 3 different' : `Harness ${distinct.length}`;
      const reason = overLimit ? `${base} (return ${excess})` : base;
      return { ok: true, reason, actionType: 'take3' };
    }
    return { ok: false, reason: 'Invalid combination', actionType: null };
  })();

  const triggerHarvestBurst = (crystals: Partial<CrystalCounts>) => {
    setHarvestBurstKeys((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(crystals) as GemKey[]) {
        if ((crystals[key as keyof CrystalCounts] ?? 0) > 0) {
          next[key] = (next[key] ?? 0) + 1;
        }
      }
      return next;
    });
  };


  const confirmCrystals = () => {
    if (!isMyTurnForCoreAction || !queueLegality.ok || !me) return;
    const total = Object.values(selectedCrystals).reduce((a, b) => a + (b ?? 0), 0);
    const handTotal = Object.values(me.crystals).reduce((a, b) => a + b, 0);
    if (handTotal + total > 10) {
      setReturnPhase({
        pendingTake: { ...selectedCrystals },
        actionType: queueLegality.actionType!,
        excessCount: handTotal + total - 10,
      });
      setReturnSelections({});
      return;
    }
    if (queueLegality.actionType === 'take3') {
      optimisticHarvestFiredRef.current = true;
      triggerHarvestBurst(selectedCrystals);
      pendingHarvestCheckRef.current = {
        gems: Object.keys(selectedCrystals) as GemKey[],
        preCrystals: { ...me.crystals },
        tally: { ...selectedCrystals },
        submittedVersion: state!.version,
      };
      // Clear selection immediately so AffinityWell drops the colored gem-slot
      // borders right away. selectedCrystals closure value is still correct for
      // the executeAction call below (setState is batched, not synchronous).
      setSelectedCrystals({});
      setCrystalHistory([]);
      setPrePromotionHistory(null);
      setActionMode('none');
      executeAction({ type: 'take_three_crystals', crystals: selectedCrystals });
      flashSent('harness');
    } else if (queueLegality.actionType === 'take2') {
      optimisticHarvestFiredRef.current = true;
      triggerHarvestBurst(selectedCrystals);
      pendingHarvestCheckRef.current = {
        gems: Object.keys(selectedCrystals) as GemKey[],
        preCrystals: { ...me.crystals },
        tally: { ...selectedCrystals },
        submittedVersion: state!.version,
      };
      setSelectedCrystals({});
      setCrystalHistory([]);
      setPrePromotionHistory(null);
      setActionMode('none');
      executeAction({ type: 'take_two_crystals', crystal: Object.keys(selectedCrystals)[0] });
      flashSent('harness');
    }
  };

  const cancelReturnPhase = () => {
    setReturnPhase(null);
    setReturnSelections({});
    setActionMode('none');
    setSelectedCrystals({});
    setCrystalHistory([]);
    setPrePromotionHistory(null);
  };

  const confirmReturnPhase = () => {
    if (!isMyTurnForCoreAction || !returnPhase || !me) return;
    const totalSelected = Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0);
    if (totalSelected < returnPhase.excessCount) return;
    optimisticHarvestFiredRef.current = true;
    triggerHarvestBurst(returnPhase.pendingTake);
    pendingHarvestCheckRef.current = {
      gems: Object.keys(returnPhase.pendingTake) as GemKey[],
      preCrystals: { ...me.crystals },
      tally: { ...returnPhase.pendingTake },
      submittedVersion: state!.version,
    };
    if (returnPhase.actionType === 'take3') {
      executeAction({ type: 'take_three_crystals', crystals: returnPhase.pendingTake, returnCrystals: returnSelections });
    } else {
      executeAction({ type: 'take_two_crystals', crystal: Object.keys(returnPhase.pendingTake)[0], returnCrystals: returnSelections });
    }
    setReturnPhase(null);
    setReturnSelections({});
  };

  const gemBurstView = gemBurst?.gems.map((gem, index) => {
    const count = gemBurst.gems.length;
    const spacing = 74;
    const offset = ((count - 1) / 2) * spacing;
    return {
      gem,
      index,
      x: index * spacing - offset,
      delay: index * 0.78 + 0.05,
    };
  }) ?? [];


  const handleSurrender = () => {
    if (confirm("Surrender? This cannot be undone.")) executeAction({ type: 'surrender' });
  };

  // Navigate back to the main menu without forfeiting.  The server keeps the
  // game alive; the session token stays in localStorage so the home page shows
  // the "Active game — Resume" banner.  ?newgame=1 prevents the home page
  // auto-navigate that would otherwise immediately bounce a logged-in player
  // back here, giving them the choice between resuming or starting fresh.
  const handleReturnToMenu = () => setLocation('/?newgame=1');

  const getPlannedActionSummary = (action: Record<string, unknown>): string => {
    if (!action) return '';
    const allCards: ArtifactCard[] = [
      ...(state?.marketTier1 ?? []),
      ...(state?.marketTier2 ?? []),
      ...(state?.marketTier3 ?? []),
      ...(me?.reservedCards ?? []),
    ];
    switch (action.type) {
      case 'purchase_card':
      case 'purchase_reserved': {
        const card = allCards.find((c) => c.id === action.cardId);
        return card ? `Forge "${card.name}"` : 'Forge Artifact';
      }
      case 'reserve_card': {
        if (action.cardId) {
          const card = allCards.find((c) => c.id === action.cardId);
          return card ? `Encrypt "${card.name}"` : 'Encrypt card';
        }
        return action.tier ? `Encrypt Tier ${action.tier}` : 'Encrypt card';
      }
      case 'take_three_crystals': {
        const crystals = (action.crystals ?? {}) as Record<string, number>;
        const parts = (CRYSTALS as string[])
          .filter(c => c !== 'flux' && (crystals[c] ?? 0) > 0)
          .map(c => GEM_META[c as GemKey]?.shortName ?? c);
        return parts.length > 0 ? `Harness ${parts.join(', ')}` : 'Harness affinities';
      }
      case 'take_two_crystals':
        return action.crystal
          ? `Harness 2 ${GEM_META[action.crystal as GemKey]?.shortName ?? action.crystal}`
          : 'Harness 2 affinities';
      case 'toggle_luminary_affinity':
        return 'Toggle Luminary affinity';
      default:
        return 'Planned action';
    }
  };

  const handlePlanAction = async (plannedActionData: Record<string, unknown>) => {
    if (!me || !session) return;
    if (planSubmitInFlight.current) return;
    planSubmitInFlight.current = true;
    try {
      const restState = await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, type: 'plan_action', plannedActionData } as ActionRequest,
      });
      // If the server auto-executed the plan (race: turn switched to this player
      // just before the plan arrived), restState.lastAction.type will be the inner
      // action type (e.g. 'purchase_card'), not 'plan_action'.  In that case push
      // the state through the same REST-fallback path as executeAction so the
      // correct purchase/reserve animation fires.  Don't show a "Move planned"
      // toast — the animation conveys what happened.
      const restStateTyped = restState;
      const autoExecuted =
        restStateTyped && (restStateTyped.lastAction as { type?: string } | null)?.type !== 'plan_action';
      if (autoExecuted) {
        setTimeout(() => {
          if (
            !prevStateRef.current ||
            prevStateRef.current.version < restStateTyped.version
          ) {
            const remaining = animationEndTimeRef.current - Date.now();
            const queueBusy =
              stateQueueRef.current.length > 0 || !!queueTimerRef.current;
            if (remaining > 50 || queueBusy) {
              stateQueueRef.current.push(restStateTyped);
              if (!queueTimerRef.current) {
                queueTimerRef.current = setTimeout(
                  () => drainQueueFnRef.current(),
                  Math.max(remaining + 100, 100),
                );
              }
            } else {
              processUpdateRef.current(restStateTyped);
            }
          }
        }, 200);
      } else {
        toast({ title: 'Move planned', description: getPlannedActionSummary(plannedActionData) });
      }
      setSelectedCard(null);
      setSelectedCrystals({});
      setCrystalHistory([]);
      setPrePromotionHistory(null);
      setActionMode('none');
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Plan failed', description: err instanceof Error ? err.message : String(err) });
    } finally {
      planSubmitInFlight.current = false;
    }
  };

  const handleCancelPlan = async () => {
    if (!session) return;
    try {
      await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, type: 'cancel_plan' } as ActionRequest,
      });
      // Optimistically clear the planned action immediately after the server
      // confirms the cancel (HTTP 200). Without this, the UI update is gated
      // behind the animation queue — if a card animation is running it can take
      // up to 4.3 s before the WebSocket state update is drained and rendered.
      queryClient.setQueryData(
        getGetGameStateQueryKey(roomId!, { sessionToken: session.sessionToken }),
        (old: GameState | undefined) => {
          if (!old) return old;
          return {
            ...old,
            players: old.players.map((p) =>
              p.playerId === session.playerId
                ? { ...p, plannedAction: null, plannedActionCancelReason: null }
                : p,
            ),
          };
        },
      );
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Cancel failed', description: err instanceof Error ? err.message : 'Something went wrong' });
    }
  };

  const triggerBtnAnim = (target: string, type: 'select' | 'confirm') => {
    setBtnAnimKey(k => k + 1);
    setBtnAnimTarget(target);
    setBtnAnimType(type);
  };

  const flashSent = (id: string) => {
    if (sentFlashRef.current) clearTimeout(sentFlashRef.current);
    setSentFlashBtn(id);
    sentFlashRef.current = setTimeout(() => setSentFlashBtn(null), 900);
  };

  // canPlan is available to any player whenever the game is active and there is
  // no blocking Luminary summon cutscene. It is intentionally NOT tied to
  // !isActivePlayer or !isMyTurn — planning should be accessible at all times
  // (on your turn, off your turn, during animation locks). Only Luminary
  // cutscenes gate it, because those require player attention.
  const canPlan = state.status === 'playing' && !!me && (!summonGateActive || localSummonSkipped);
  const myPlannedAction = me?.plannedAction ?? null;
  const plannedCardId: string | null = (myPlannedAction?.cardId as string | undefined) ?? null;

  // Forge / Plan:Forge confirmed-state color — solid affinity color of the card being acted on.
  const _forgeCardMeta = selectedCard
    ? (GEM_META[(selectedCard.card.bonusColor ?? 'pearl') as GemKey] ?? GEM_META.pearl)
    : null;
  const forgeConfirmHex   = _forgeCardMeta?.hex    ?? '#6366f1';
  const forgeConfirmGlow  = _forgeCardMeta?.glowHex ?? '#818cf8';
  const forgeDarkText = _forgeCardMeta
    ? (['pearl', 'emerald', 'flux'] as string[]).includes(_forgeCardMeta.key)
    : false;
  const safePlayers = state.players ?? [];
  const safeLuminaries = state.luminaries ?? [];


  const dismissUndoHint = () => {
    setShowUndoHint(false);
  };

  const dismissReserveHint = () => {
    setShowReserveHint(false);
  };

  const dismissForgeHint = () => {
    setShowForgeHint(false);
  };

  const dismissDeckReserveHint = () => {
    setShowDeckReserveHint(false);
  };

  const myReservedCount = me?.reservedCards.length ?? 0;

  // ---- TABS ----

  const BoardTabMain = () => {
    return (
    <div
      className="flex flex-col gap-0 pb-6"
      style={isTutorial && tutorialStep >= 0 && tutorialStep < LUMII_BEAT_COUNT
        ? { paddingBottom: 'var(--tutorial-panel-height, 0px)' }
        : undefined}
    >

      {/* ── Planned action banner — slides down from the header ── */}
      <AnimatePresence>
        {myPlannedAction && (
          <motion.div
            key="planned-action-box"
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-0 right-0 z-[19] pointer-events-auto"
            style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
          >
            <div
              className="flex items-center gap-3 px-4 py-2.5 border-b"
              style={{
                background: 'rgba(45, 24, 4, 0.93)',
                borderColor: 'rgba(251, 191, 36, 0.28)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(251, 191, 36, 0.6)' }}>Planned</span>
                <span className="text-xs font-medium text-amber-100/90 truncate leading-snug">
                  {getPlannedActionSummary(myPlannedAction)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelPlan}
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                <CalendarX className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          THE PARTICLE HORIZON
          ═══════════════════════════════════════════════════════ */}
      <div
        data-tutorial-zone="luminaries"
        className="relative"
        style={tutorialZone === 'luminaries' ? {
          boxShadow: tutorialAttention === 'action'
            ? '0 0 0 2px rgba(168,85,247,0.78), 0 0 38px 12px rgba(168,85,247,0.22)'
            : '0 0 0 2px rgba(168,85,247,0.5), 0 0 24px 6px rgba(168,85,247,0.12)',
          transition: 'box-shadow 0.3s',
        } : undefined}
      >
        {/* Zone background — deep cosmic gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, rgba(15,8,40,0.55) 0%, rgba(8,5,28,0.40) 100%)',
          borderBottom: '1px solid rgba(120,80,220,0.22)',
        }} />
        {/* Starfield overlay dots */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.35 }}>
          {[...Array(18)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{
                width: i % 3 === 0 ? 2 : 1,
                height: i % 3 === 0 ? 2 : 1,
                left: `${(i * 37 + 11) % 97}%`,
                top: `${(i * 53 + 7) % 88}%`,
                opacity: 0.3 + (i % 5) * 0.14,
              }}
            />
          ))}
        </div>
        {/* Zone header */}
        <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none" className="shrink-0" style={{ color: '#C4AAFF', opacity: 0.85 }}>
              <polygon points="5,0 1.5,4.5 8.5,4.5" fill="currentColor" />
              <polygon points="1.5,4.5 2.2,15.5 7.8,15.5 8.5,4.5" fill="currentColor" />
              <rect x="0.5" y="15.5" width="9" height="2" rx="0.5" fill="currentColor" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(160,130,255,0.55)' }}>The</span>
              <span className="text-[15px] font-black uppercase tracking-[0.08em] leading-none" style={{
                color: '#C4AAFF',
                textShadow: '0 0 24px rgba(180,140,255,0.5), 0 1px 0 rgba(0,0,0,0.8)',
                letterSpacing: '0.06em',
              }}>Terminus</span>
            </div>
            <div className="flex-1 h-[1px] w-8" style={{ background: 'linear-gradient(90deg, rgba(160,120,255,0.5), transparent)' }} />
          </div>
        </div>
        <div data-luminary-scroll className="relative flex gap-3 overflow-x-auto pb-3 px-4 no-scrollbar">
          {safeLuminaries.map(l => {
            const claimedByPlayer = safePlayers.find(p => (p.claimedLuminaryIds ?? []).includes(l.id)) ?? null;
            const claimedByNames = claimedByPlayer ? [claimedByPlayer.playerName] : [];
            const turnCount: number = state.turnCount;

            // Real server affinity state
            const serverLumAffinity = state.luminaryAffinities.find(la => la.luminaryId === l.id) ?? null;
            const isOwnedByMe = claimedByPlayer?.playerId === session?.playerId;
            // isLive: bonus active starting the turn AFTER summoning
            const isLive = !!serverLumAffinity && turnCount > serverLumAffinity.summonedAtTurnCount;

            // Suppress the claimed vortex/portal while a summon cutscene is active
            // for this luminary. The server marks it claimed immediately (for rules /
            // persistence), but visually the portal must not appear until the shatter
            // animation has fully resolved. isSummonInProgress covers every entry in
            // the queue (not just the head) so queued-but-not-yet-playing cutscenes
            // are also suppressed. Dev-test entries (isDevTest=true) have no real
            // claimedByPlayer, so they are excluded to keep the dev preview working.
            const isSummonInProgress = summonQueue.some(e => e.id === l.id && !e.isDevTest)
              || pendingSuppressLumIdsRef.current.has(l.id);

            // Visible claimed state — cleared during active cutscene so the board
            // slot keeps rendering the sealed panel until onComplete fires.
            const visibleClaimedByPlayer = isSummonInProgress ? null : claimedByPlayer;
            const visibleClaimedByNames  = isSummonInProgress ? []   : claimedByNames;

            return (
              <LuminaryCard
                key={l.id}
                luminary={l}
                claimedByNames={visibleClaimedByNames}
                isReleased={claimedThisSession.includes(l.id)}
                luminaryAffinity={serverLumAffinity}
                claimedByPlayer={visibleClaimedByPlayer}
                isOwnedByMe={isSummonInProgress ? false : isOwnedByMe}
                isLive={isSummonInProgress ? false : isLive}
                canToggle={false}
                costMode={costMode}
                playerBonuses={me?.bonuses}
                isMyTurn={isMyTurn}
                onOpenSheet={() => setSelectedLuminary(l)}
                isArmed={armedLumIds.has(l.id)}
                isFlashing={flashLumId === l.id}
              />
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          THE FORGE
          ═══════════════════════════════════════════════════════ */}
      <div
        data-tutorial-zone="market"
        className="relative"
        style={(tutorialZone === 'market' || tutorialZone === 'filters') ? {
          boxShadow: tutorialAttention === 'action'
            ? '0 0 0 2px rgba(168,85,247,0.78), 0 0 38px 12px rgba(168,85,247,0.22)'
            : '0 0 0 2px rgba(168,85,247,0.35), 0 0 20px 5px rgba(168,85,247,0.08)',
          transition: 'box-shadow 0.3s',
        } : undefined}
      >
        {/* Zone background — warm dark ore/ember gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, rgba(28,14,6,0.50) 0%, rgba(20,10,4,0.38) 100%)',
          borderTop: '1px solid rgba(160,100,30,0.18)',
          borderBottom: '1px solid rgba(160,100,30,0.18)',
        }} />
        {/* Ember particle specks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.25 }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: 2, height: 2,
                background: i % 2 === 0 ? '#FFB340' : '#FF6A1A',
                left: `${(i * 43 + 9) % 95}%`,
                top: `${(i * 67 + 13) % 90}%`,
                opacity: 0.2 + (i % 4) * 0.15,
              }}
            />
          ))}
        </div>
        {/* Zone header */}
        <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <Hammer className="h-4 w-4 shrink-0" style={{ color: '#D4A84B', opacity: 0.85 }} />
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(192,140,60,0.55)' }}>The</span>
              <span className="text-[15px] font-black uppercase tracking-[0.08em] leading-none" style={{
                color: '#D4A84B',
                textShadow: '0 0 24px rgba(212,168,75,0.45), 0 1px 0 rgba(0,0,0,0.8)',
                letterSpacing: '0.06em',
              }}>Forge</span>
            </div>
            <div className="flex-1 h-[1px] w-8" style={{ background: 'linear-gradient(90deg, rgba(192,140,60,0.5), transparent)' }} />
          </div>
          <div className="flex items-center gap-1.5">
            {(state.burnPile ?? []).length > 0 && (
              <motion.div animate={burnChipAnim} style={{ display: 'inline-flex' }}>
                <button
                  type="button"
                  onClick={() => setShowBurnPileOverlay(true)}
                  className="flex items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:text-orange-400/80 transition-colors"
                  title="View burned Artifacts"
                  aria-label={`View ${(state.burnPile ?? []).length} burned Artifact${(state.burnPile ?? []).length === 1 ? '' : 's'}`}
                >
                  <span className="text-[11px] leading-none">🔥</span>
                  <span className="text-[9px] font-bold tabular-nums leading-none">{(state.burnPile ?? []).length}</span>
                </button>
              </motion.div>
            )}
            <button
              type="button"
              onClick={() => setMarketCompact(v => !v)}
              className={`flex items-center gap-1 rounded px-1.5 py-1 transition-colors ${marketCompact ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400/60'}`}
              title={marketCompact ? 'Switch to full card view' : 'Switch to compact view'}
              aria-pressed={marketCompact}
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wide leading-none">
                {marketCompact ? 'Compact' : 'Full'}
              </span>
            </button>
          </div>
        </div>

        {/* ── COST filter strip — above Tier 3 ── */}
        <div
          data-tutorial-zone="filters"
          className="relative flex items-center gap-2 px-3 pb-2"
          style={tutorialZone === 'filters' ? {
            boxShadow: '0 0 0 2px rgba(168,85,247,0.65), 0 0 14px 4px rgba(168,85,247,0.22)',
            transition: 'box-shadow 0.3s',
          } : undefined}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>Cost View</span>
          <div className="flex items-center bg-secondary/50 rounded-full border border-border/30 p-0.5 gap-0.5">
            {([
              { mode: 'printed' as CostMode, label: 'Full', title: 'Show original printed cost' },
              { mode: 'after_bonuses' as CostMode, label: 'Discounted', title: 'Cost after your permanent bonuses' },
              { mode: 'needed_now' as CostMode, label: 'Needed', title: 'What you still need after bonuses, tokens, and pre-harness selection' },
            ]).map(({ mode, label, title }) => {
              const isTutorialFilterHighlight = isTutorial && tutorialStep === 5 && (mode === 'after_bonuses' || mode === 'needed_now');
              return (
                <button
                  key={mode}
                  type="button"
                  title={title}
                  onClick={() => setCostMode(mode)}
                  className={`text-[9px] font-semibold px-2 py-0.5 rounded-full transition-all leading-none ${costMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  style={isTutorialFilterHighlight ? {
                    boxShadow: '0 0 0 1.5px rgba(168,85,247,0.8), 0 0 8px 2px rgba(168,85,247,0.4)',
                    color: costMode === mode ? undefined : 'rgba(200,170,255,0.9)',
                    transition: 'box-shadow 0.3s, color 0.3s',
                  } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative flex flex-col gap-3 px-3 pb-3">
        {[
          { tier: 3, cards: state.marketTier3, deck: state.deckCounts.tier3, tierIdx: 0 },
          { tier: 2, cards: state.marketTier2, deck: state.deckCounts.tier2, tierIdx: 1 },
          { tier: 1, cards: state.marketTier1, deck: state.deckCounts.tier1, tierIdx: 2 },
        ].map(row => {
          // Pre-compute the keyboard-nav column index for each slot.
          // Ghost / hidden / null slots get -1 (not keyboard-navigable).
          // Valid cards get a sequential 0-based index within this tier row.
          let _col = 0;
          const colIndices = row.cards.map((c, i) => {
            const sk = `${row.tier}-${i}`;
            if (burstGhostCards[sk] || hiddenSlots.has(sk) || !c) return -1;
            return _col++;
          });
          return (
          <div key={row.tier} className="relative rounded-xl" style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(160,140,104,0.18)', padding: '8px 8px 4px 8px' }}>
            <div className="flex items-center gap-2 mb-2 px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#C0A472', letterSpacing: '0.12em', textShadow: '0 1px 6px rgba(192,164,114,0.35)' }}>Tier {row.tier}, {TIER_CIVILIZATION[row.tier]}</span>
              <div className="shrink-0 flex-1 h-[1.5px] divider-brass" />
            </div>
            <div className={`flex pb-1 no-scrollbar ${marketCompact ? 'flex-wrap gap-2' : 'gap-2.5 overflow-x-auto'}`}>
              {/* Deck — left position */}
              {deckPosition === 'left' && (marketCompact ? (
                <button
                  type="button"
                  data-deck-tier={row.tier}
                  onClick={() => {
                    if (row.deck === 0 || !me) return;
                    if (!isMyTurn && !canPlan) return;
                    openDeckSheet(row.tier as 1 | 2 | 3);
                  }}
                  disabled={row.deck === 0 || !me || (!isMyTurn && !canPlan)}
                  className="relative shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={row.deck === 0 ? 'Deck empty' : 'View deck — encrypt a hidden card'}
                >
                  <CardBack size="compact" tier={row.tier as 1 | 2 | 3} />
                  <div
                    className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[8px] font-bold tabular-nums px-0.5"
                    style={row.deck > 0
                      ? { background: 'rgba(10,10,20,0.78)', border: '1px solid rgba(192,164,114,0.38)', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.9)' }
                      : { background: 'rgba(40,10,10,0.85)', border: '1px solid rgba(160,60,60,0.5)', color: 'rgba(255,120,120,0.9)' }
                    }
                  >
                    {row.deck > 0 ? row.deck : '∅'}
                  </div>
                  {state?.avatarSeedDeckSeeds && state.avatarSeedDeckSeeds.length > 0 && (
                    <div
                      className="pointer-events-none absolute bottom-1 left-1 w-[14px] h-[14px] flex items-center justify-center rounded-full"
                      style={{ background: 'rgba(4,12,8,0.90)', border: '1px solid #4ade80', boxShadow: '0 0 6px #4ade8066' }}
                      title="Avatar Seeds seeded in this deck"
                    >
                      <span style={{ fontSize: 8, lineHeight: 1 }}>🌿</span>
                    </div>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  data-deck-tier={row.tier}
                  onClick={() => {
                    if (row.deck === 0 || !me) return;
                    if (!isMyTurn && !canPlan) return;
                    openDeckSheet(row.tier as 1 | 2 | 3);
                  }}
                  disabled={row.deck === 0 || !me || (!isMyTurn && !canPlan)}
                  className="relative shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={row.deck === 0 ? 'Deck empty' : 'View deck — encrypt a hidden card'}
                >
                  <CardBack tier={row.tier as 1 | 2 | 3} />
                  <div
                    className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold tabular-nums px-1"
                    style={row.deck > 0
                      ? { background: 'rgba(10,10,20,0.78)', border: '1px solid rgba(192,164,114,0.38)', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.9)' }
                      : { background: 'rgba(40,10,10,0.85)', border: '1px solid rgba(160,60,60,0.5)', color: 'rgba(255,120,120,0.9)' }
                    }
                  >
                    {row.deck > 0 ? row.deck : 'Empty'}
                  </div>
                  {state?.avatarSeedDeckSeeds && state.avatarSeedDeckSeeds.length > 0 && (
                    <div
                      className="pointer-events-none absolute bottom-1.5 left-1.5 w-[16px] h-[16px] flex items-center justify-center rounded-full"
                      style={{ background: 'rgba(4,12,8,0.90)', border: '1px solid #4ade80', boxShadow: '0 0 8px #4ade8066' }}
                      title="Avatar Seeds seeded in this deck"
                    >
                      <span style={{ fontSize: 9, lineHeight: 1 }}>🌿</span>
                    </div>
                  )}
                </button>
              ))}
              {row.cards.map((c, i) => {
                const colIdx = colIndices[i];
                const slotKey = `${row.tier}-${i}`;
                const isHidden = hiddenSlots.has(slotKey);

                // Ghost card: the old card stays visible here while waiting for the
                // burst animation to start (queue-drain delay).  It carries
                // data-card-id so processUpdateRef can still measure its rect.
                // Cleared atomically when setCardActionBurst / setCipherBurst fires.
                const ghostCard = burstGhostCards[slotKey] ?? null;
                if (ghostCard) {
                  // In compact mode clamp to chip dimensions so the slot never causes reflow.
                  return marketCompact ? (
                    <div
                      key={ghostCard.id}
                      data-card-id={ghostCard.id}
                      data-slot-key={slotKey}
                      className="relative shrink-0 overflow-hidden rounded-lg"
                      style={{ width: 56, height: 78 }}
                    >
                      <div className="absolute inset-0 scale-[0.47] origin-top-left pointer-events-none" style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}>
                        <ArtifactCardView card={ghostCard} tier={row.tier} />
                      </div>
                    </div>
                  ) : (
                    <div key={ghostCard.id} data-card-id={ghostCard.id} data-slot-key={slotKey} className="relative shrink-0">
                      <ArtifactCardView card={ghostCard} tier={row.tier} />
                    </div>
                  );
                }

                if (isHidden || !c) {
                  return <div key={c?.id ?? `empty-${i}`} data-slot-key={slotKey} className={`rounded-xl border-2 border-dashed border-border/30 opacity-40 shrink-0 ${marketCompact ? 'w-[56px] h-[78px]' : 'w-[var(--card-w)] h-[var(--card-h)]'}`} />;
                }

                // Keyboard-nav focus props for this card slot (roving tabindex).
                const cardFocusProps = colIdx >= 0
                  ? getCardFocusProps(row.tierIdx, colIdx, c.name, c.lumens, row.tier, () => openCardSheet(c, false))
                  : null;

                const isFlipping = flippingCards.has(c.id);
                const isQueued = plannedCardId === c.id;
                if (isFlipping) {
                  // In compact mode keep the slot at chip dimensions to prevent reflow.
                  // Use a scale-shrink-in instead of a 3D flip — the chip starts slightly
                  // zoomed and drifts down into its slot position, avoiding the clip/pop
                  // that a rotateY flip produces inside overflow-hidden at this small size.
                  if (marketCompact) {
                    // Ghost-card-to-chip animation:
                    // A full-size ghost card hovers above the slot, holds briefly so the
                    // player can see it, then descends + shrinks to chip scale + fades out.
                    // The chip itself is always rendered underneath so it's revealed as the
                    // ghost dissolves — "the card shrinks and fades into the pill."
                    const cardViewProps = {
                      card: c,
                      tier: row.tier,
                      onTap: () => openCardSheet(c, false),
                      tapped: selectedCard?.card.id === c.id,
                      effectiveCosts: computeCosts(c, costMode),
                      bonusCosts: computeCosts(c, 'after_bonuses') ?? undefined,
                    } as const;
                    return (
                      <div
                        key={c.id}
                        data-card-id={c.id}
                        className="relative shrink-0"
                        style={{ width: 56, height: 78 }}
                        {...(cardFocusProps ?? {})}
                      >
                        {/* Chip — always present underneath the ghost */}
                        <div className="absolute inset-0 overflow-hidden rounded-lg">
                          <div
                            className="absolute inset-0 scale-[0.47] origin-top-left"
                            style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}
                          >
                            <ArtifactCardView {...cardViewProps} />
                          </div>
                        </div>

                        {/* Ghost is rendered at top-level via compactGhost state — see bottom of JSX */}

                        {isQueued && <QueuedOverlay />}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={c.id}
                      data-card-id={c.id}
                      className="relative shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                      style={{ perspective: '800px' }}
                      {...(cardFocusProps ?? {})}
                    >
                      <motion.div
                        initial={{ rotateY: 180, scale: 0.85 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <ArtifactCardView
                          card={c}
                          tier={row.tier}
                          onTap={() => openCardSheet(c, false)}
                          tapped={selectedCard?.card.id === c.id}
                          effectiveCosts={computeCosts(c, costMode)}
                          bonusCosts={computeCosts(c, 'after_bonuses') ?? undefined}
                          hideStrike={costMode === 'needed_now'}
                        />
                      </motion.div>
                      {isQueued && <QueuedOverlay />}
                      {state?.marketMarkers?.[c.id] && (
                        <>
                          <CardKeywordOverlay type={state.marketMarkers[c.id].type as 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed'} />
                          <CardMarkerBadge type={state.marketMarkers[c.id].type as 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed'} />
                        </>
                      )}
                    </div>
                  );
                }

                const showTutorialGlow = isTutorial && (tutorialStep === 6 || tutorialStep === 8) && !selectedCard;

                // ── Compact chip ───────────────────────────────────────────
                if (marketCompact) {
                  const effCosts = computeCosts(c, costMode) ?? c.cost;
                  const costEntries = CRYSTALS.filter(k => (effCosts[k as keyof CrystalCounts] ?? 0) > 0);
                  const bonusMeta = GEM_META[c.bonusColor as GemKey];
                  const isTapped = selectedCard?.card.id === c.id;
                  return (
                    <div
                      key={c.id}
                      data-card-id={c.id}
                      className="relative shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 rounded-xl overflow-hidden"
                      style={{
                        width: 56, height: 80,
                        boxShadow: isTapped
                          ? `inset 0 0 0 2px ${bonusMeta?.hex ?? '#6366f1'}, 0 0 12px 2px ${bonusMeta?.glowHex ?? '#818cf8'}66`
                          : 'inset 0 0 0 1px rgba(0,0,0,0.25)',
                        transition: 'box-shadow 150ms ease',
                      }}
                      onClick={() => openCardSheet(c, false)}
                      {...(cardFocusProps ?? {})}
                      title={c.name}
                    >
                      {/* Full card art at 0.5× — artOnly strips the text/gradient overlay */}
                      <div
                        className="pointer-events-none origin-top-left"
                        style={{ transform: 'scale(0.5)', width: 'var(--card-w)', height: 'var(--card-h)' }}
                      >
                        <ArtifactCardView card={c} tier={row.tier} tapped={false} artOnly />
                      </div>
                      {/* Subtle dark scrim to ease card art brightness in compact view */}
                      <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }} />
                      {/* Marker badge + overlay (v0.8) — rendered above all chip art layers */}
                      {state?.marketMarkers?.[c.id] && (
                        <>
                          <CardKeywordOverlay type={state.marketMarkers[c.id].type as 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed'} />
                          <CardMarkerBadge type={state.marketMarkers[c.id].type as 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed'} />
                        </>
                      )}
                      {/* Native-resolution info overlay — sized for the 56×80 chip */}
                      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1">
                        {/* Top row: lumen badge (left) + bonus gem badge (right) */}
                        <div className="flex items-start justify-between">
                          {(c.lumens ?? 0) > 0 ? (
                            <span
                              className="flex items-center gap-0.5 text-[11px] font-bold font-serif text-amber-100 leading-none px-1 py-0.5 rounded"
                              style={{ background: 'rgba(0,0,0,0.82)' }}
                            >
                              {c.lumens}<EminenceDiamond size={8} />
                            </span>
                          ) : <span />}
                          {c.bonusColor && (
                            <span className="rounded p-0.5" style={{ background: 'rgba(0,0,0,0.82)' }}>
                              <MiniGem color={c.bonusColor as GemKey} size={13} />
                            </span>
                          )}
                        </div>
                        {/* Bottom row: cost pips in a dark pill, or ✓ when fully covered */}
                        <div className="flex justify-center">
                          {costEntries.length > 0 ? (
                            <div className="flex flex-wrap items-center justify-center gap-0.5">
                              {costEntries.map(k => (
                                <div
                                  key={k}
                                  className="flex items-center gap-px px-1 py-0.5 rounded"
                                  style={{ background: 'rgba(0,0,0,0.82)' }}
                                >
                                  <MiniGem color={k as GemKey} size={10} />
                                  <span className="text-[8px] font-bold text-white/90 leading-none">{effCosts[k as keyof CrystalCounts]}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span
                              className="text-[10px] font-bold text-green-400 leading-none px-1 py-0.5 rounded"
                              style={{ background: 'rgba(0,0,0,0.82)' }}
                            >✓</span>
                          )}
                        </div>
                      </div>
                      {isQueued && <QueuedOverlay />}
                      {showTutorialGlow && (
                        <div className="pointer-events-none absolute inset-0 rounded-lg animate-pulse"
                          style={{ boxShadow: '0 0 0 2px rgba(250,204,21,0.7), 0 0 14px 4px rgba(250,204,21,0.35)' }}
                        />
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={c.id}
                    data-card-id={c.id}
                    className="relative shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                    {...(cardFocusProps ?? {})}
                  >
                    <ArtifactCardView
                      card={c}
                      tier={row.tier}
                      onTap={() => openCardSheet(c, false)}
                      tapped={selectedCard?.card.id === c.id}
                      effectiveCosts={computeCosts(c, costMode)}
                      bonusCosts={computeCosts(c, 'after_bonuses') ?? undefined}
                      hideStrike={costMode === 'needed_now'}
                    />
                    {showTutorialGlow && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl animate-pulse"
                        style={{
                          boxShadow: '0 0 0 2px rgba(250,204,21,0.7), 0 0 14px 4px rgba(250,204,21,0.35)',
                        }}
                      />
                    )}
                    {isQueued && <QueuedOverlay />}
                    <div
                      className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/55 backdrop-blur-sm px-1 py-0.5 transition-opacity duration-500"
                      style={{ opacity: cardDetailDiscovered ? 0 : 1 }}
                    >
                      <Eye className="h-2.5 w-2.5 text-white/70" />
                      <span className="text-[7px] font-medium text-white/65 leading-none">details</span>
                    </div>
                  </div>
                );
              })}
              {/* Deck pile — position controlled by deckPosition setting */}
              {deckPosition === 'right' && (marketCompact ? (
                <button
                  type="button"
                  data-deck-tier={row.tier}
                  onClick={() => {
                    if (row.deck === 0 || !me) return;
                    if (!isMyTurn && !canPlan) return;
                    openDeckSheet(row.tier as 1 | 2 | 3);
                  }}
                  disabled={row.deck === 0 || !me || (!isMyTurn && !canPlan)}
                  className="relative shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={row.deck === 0 ? 'Deck empty' : 'View deck — encrypt a hidden card'}
                >
                  <CardBack size="compact" tier={row.tier as 1 | 2 | 3} />
                  {state?.avatarSeedDeckSeeds && state.avatarSeedDeckSeeds.length > 0 && (
                    <div
                      className="pointer-events-none absolute bottom-1 left-1 w-[14px] h-[14px] flex items-center justify-center rounded-full"
                      style={{ background: 'rgba(4,12,8,0.90)', border: '1px solid #4ade80', boxShadow: '0 0 6px #4ade8066' }}
                      title="Avatar Seeds seeded in this deck"
                    >
                      <span style={{ fontSize: 8, lineHeight: 1 }}>🌿</span>
                    </div>
                  )}
                  <div
                    className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[8px] font-bold tabular-nums px-0.5"
                    style={row.deck > 0
                      ? { background: 'rgba(10,10,20,0.78)', border: '1px solid rgba(192,164,114,0.38)', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.9)' }
                      : { background: 'rgba(40,10,10,0.85)', border: '1px solid rgba(160,60,60,0.5)', color: 'rgba(255,120,120,0.9)' }
                    }
                  >
                    {row.deck > 0 ? row.deck : '∅'}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  data-deck-tier={row.tier}
                  onClick={() => {
                    if (row.deck === 0 || !me) return;
                    if (!isMyTurn && !canPlan) return;
                    openDeckSheet(row.tier as 1 | 2 | 3);
                  }}
                  disabled={row.deck === 0 || !me || (!isMyTurn && !canPlan)}
                  className="relative shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={row.deck === 0 ? 'Deck empty' : 'View deck — encrypt a hidden card'}
                >
                  <CardBack tier={row.tier as 1 | 2 | 3} />
                  <div
                    className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold tabular-nums px-1"
                    style={row.deck > 0
                      ? { background: 'rgba(10,10,20,0.78)', border: '1px solid rgba(192,164,114,0.38)', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.9)' }
                      : { background: 'rgba(40,10,10,0.85)', border: '1px solid rgba(160,60,60,0.5)', color: 'rgba(255,120,120,0.9)' }
                    }
                  >
                    {row.deck > 0 ? row.deck : 'Empty'}
                  </div>
                  {state?.avatarSeedDeckSeeds && state.avatarSeedDeckSeeds.length > 0 && (
                    <div
                      className="pointer-events-none absolute bottom-1.5 left-1.5 w-[16px] h-[16px] flex items-center justify-center rounded-full"
                      style={{ background: 'rgba(4,12,8,0.90)', border: '1px solid #4ade80', boxShadow: '0 0 8px #4ade8066' }}
                      title="Avatar Seeds seeded in this deck"
                    >
                      <span style={{ fontSize: 9, lineHeight: 1 }}>🌿</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          );
        })}
        </div>
      </div>

      {/* Tutorial harvest zone anchor — zero-height, keeps tutorial wiring intact */}
      <div
        data-tutorial-zone="harvest"
        className="h-0 overflow-hidden pointer-events-none"
        style={{
          boxShadow: tutorialZone === 'harvest'
            ? tutorialAttention === 'action'
              ? '0 0 0 2px rgba(168,85,247,0.78), 0 0 38px 12px rgba(168,85,247,0.22)'
              : '0 0 0 2px rgba(168,85,247,0.5), 0 0 24px 6px rgba(168,85,247,0.12)'
            : 'none',
          transition: 'box-shadow 0.3s',
        }}
      />
    </div>
  );
  };

  const BoardTabOpponents = () => {
    if (state.players.filter(p => p.playerId !== session?.playerId).length === 0) return null;
    return (
      <div className="px-0 pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Opponents</p>
        <div className="flex flex-col gap-2">
            {state.players.map((p, i) => {
              if (p.playerId === session?.playerId) return null;
              const isCurrent = state.status === 'playing' && state.currentPlayerIndex === i;
              const oppD = opponentData[p.playerId];
              const totalAffinity = oppD?.totalAffinity ?? 0;
              const cardCount = oppD?.cardCount ?? 0;
              const reservedCount = oppD?.reservedCount ?? 0;
              const isExpanded = expandedOpponents.has(p.playerId);
              const oppCivPalette = oppD?.civPalette ?? getDominantAffinityPalette(p.purchasedCards);
              const oppCivName = oppD?.civName ?? p.civName ?? p.playerName;
              const toggleExpanded = () => {
                setExpandedOpponents((prev) => {
                  const next = new Set(prev);
                  if (next.has(p.playerId)) next.delete(p.playerId);
                  else next.add(p.playerId);
                  return next;
                });
              };
              return (
                <div
                  key={p.playerId}
                  className={`rounded-2xl border p-3 bg-card/70 backdrop-blur transition-[border-color,box-shadow] ${isCurrent ? 'border-primary/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-border/40'}`}
                >
                  {/* Header: identity + inline stats + lumens */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <PlayerAvatar avatarId={p.avatarId ?? null} name={p.playerName} size={22} />
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                      <span className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{p.playerName}</span>
                        <span className="text-[10px] font-normal tracking-wide truncate" style={{ color: oppCivPalette.primary, opacity: 0.8 }}>{oppCivName}</span>
                      </span>
                      {isCurrent && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">their turn</span>}
                    </div>
                    {/* Inline stat chips */}
                    <div className="flex items-center gap-2 shrink-0">
                      {([
                        { label: 'Affinity',  value: totalAffinity, hex: '#7aa2ff', glow: '#a8c5ff' },
                        { label: 'Artifact',  value: cardCount,     hex: '#ffc43d', glow: '#ffe28a' },
                        { label: 'Encrypted', value: reservedCount, hex: '#E8E4FF', glow: '#C8C0FF' },
                      ] as const).map(({ label, value, hex, glow }) => {
                        const has = value > 0;
                        return (
                          <div key={label} className="flex items-baseline gap-0.5 shrink-0">
                            <span
                              className="text-sm font-black leading-none"
                              style={{ color: has ? hex : hex + '55', textShadow: has ? `0 0 8px ${glow}` : 'none' }}
                            >
                              {value}
                            </span>
                            <span
                              className="text-[9px] font-semibold uppercase tracking-wide leading-none"
                              style={{ color: has ? glow + 'cc' : hex + '44' }}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* View/Hide details — inline between chips and Eminence */}
                    <button
                      type="button"
                      onClick={toggleExpanded}
                      className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-[10px] font-semibold text-primary"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="h-2.5 w-2.5" />Hide</>
                      ) : (
                        <><Eye className="h-2.5 w-2.5" />View</>
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0 font-serif font-black text-lg text-white leading-none">
                      <span>{p.lumens}</span>
                      <EminenceDiamond size={12} />
                    </div>
                  </div>

                  {/* Expanded per-color detail */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2">
                          <div className="grid grid-cols-6 gap-1.5">
                            {CRYSTALS.map((c) => {
                              const n = p.crystals[c as keyof CrystalCounts] ?? 0;
                              const bonus = p.bonuses[c as keyof CrystalCounts] ?? 0;
                              const lumBonus = state.luminaryAffinities
                                .filter((la: LuminaryActiveState) =>
                                  la.ownerId === p.playerId &&
                                  state.turnCount > la.summonedAtTurnCount &&
                                  la.activeAffinity === c
                                ).length;
                              const meta = GEM_META[c as GemKey];
                              const isFlux = c === 'flux';
                              const hasContent = isFlux ? (n > 0 || reservedCount > 0) : (n > 0 || bonus > 0 || lumBonus > 0);
                              return (
                                <div
                                  key={c}
                                  className="h-[72px] flex flex-col items-center gap-1 rounded-lg relative overflow-hidden pt-1.5 pb-1.5"
                                  style={{
                                    background: hasContent
                                      ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)`
                                      : 'linear-gradient(180deg, #07070b 0%, #0e0e14 100%)',
                                    border: `1px solid ${hasContent ? meta.hex + 'AA' : meta.hex + '22'}`,
                                    boxShadow: hasContent ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33` : 'none',
                                  }}
                                >
                                  {hasContent && (
                                    <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />
                                  )}
                                  {/* Affinity name + icon — top center */}
                                  <div className="flex items-center gap-0.5 w-full justify-center">
                                    <span className="text-[7px] font-semibold tracking-wide leading-none truncate" style={{ color: meta.glowHex }}>{meta.shortName}</span>
                                    <MiniGem color={c as GemKey} size={7} />
                                  </div>
                                  {/* Crystal count */}
                                  <span
                                    className="text-2xl font-black leading-none tracking-tight"
                                    style={{ color: hasContent ? '#fff' : meta.hex + '40', textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : 'none' }}
                                  >
                                    {n}
                                  </span>
                                  {/* Card bonus + Luminary alliance bonus */}
                                  {!isFlux && (bonus > 0 || lumBonus > 0) && (
                                    <div className="flex flex-col items-center gap-0" style={{ lineHeight: 1 }}>
                                      {bonus > 0 && (
                                        <span className="text-[9px] font-bold leading-none text-primary">+{bonus} bonus</span>
                                      )}
                                      {lumBonus > 0 && (
                                        <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{lumBonus}✦</span>
                                      )}
                                    </div>
                                  )}
                                  {isFlux && reservedCount > 0 && (
                                    <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reservedCount} encrypted</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
    );
  };

  const HandTab = () => (
    <div className="flex flex-col gap-5 p-4 pb-6">
      {/* Kardashev Observatory Scene */}
      <KardashevScene tier={kardashevTier} palette={kardashevPalette} progressFraction={kardashevProgressFraction} />

      {/* Lumens + name */}
      <div className={`rounded-2xl border p-4 bg-card/80 backdrop-blur flex items-center justify-between ${isMyTurn ? 'border-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.2)]' : 'border-border'}`}>
        <div className="flex-1 min-w-0 mr-3">
          {isEditingCivName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                className="bg-transparent border-b border-primary/60 text-base font-bold text-white focus:outline-none w-full min-w-0 placeholder:text-white/30"
                value={civEditValue}
                onChange={(e) => setCivEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = civEditValue.trim();
                    setCivLabel(trimmed || getDefaultCivName(getSavedAvatarId(), me?.playerName));
                    setIsEditingCivName(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingCivName(false);
                  }
                }}
                onBlur={() => {
                  const trimmed = civEditValue.trim();
                  setCivLabel(trimmed || getDefaultCivName(getSavedAvatarId(), me?.playerName));
                  setIsEditingCivName(false);
                }}
                maxLength={48}
              />
              <button
                className="shrink-0 text-primary/80 hover:text-primary transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const trimmed = civEditValue.trim();
                  setCivLabel(trimmed || getDefaultCivName(getSavedAvatarId(), me?.playerName));
                  setIsEditingCivName(false);
                }}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsEditingCivName(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              className="group flex items-center gap-1.5 text-left w-full min-w-0"
              onClick={() => {
                setCivEditValue(civLabel);
                setIsEditingCivName(true);
              }}
              title="Rename your civilization"
            >
              <span className="text-base font-bold text-white truncate border-b border-transparent group-hover:border-white/30 transition-colors">
                {civLabel}
              </span>
              <Pencil className="h-3 w-3 shrink-0 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
          )}
        </div>
        <div className="text-center">
          <div
            className="relative flex items-center justify-center gap-1.5"
          >
            <div className="text-4xl font-serif font-bold text-white">{me?.lumens}</div>
            <EminenceDiamond size={22} />
          </div>
          <div className="text-xs text-white/50 mt-0.5">eminence</div>
        </div>
      </div>

      {/* Reserved Cards */}
      {myReservedCount > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
            Encrypted ({myReservedCount}/3)
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {me?.reservedCards.map((c) => {
              const isQueued = plannedCardId === c.id;
              const lore = loreCatalog?.[c.id];
              const loreTag = lore?.artifactForm?.split('/')?.[0]?.trim() ?? lore?.civLane?.split('/')?.[0]?.trim();
              return (
                <div key={c.id} data-reserved-card-id={c.id} className="relative shrink-0 flex flex-col items-center gap-1" style={{ maxWidth: 90 }}>
                  <div className="relative">
                    <ArtifactCardView
                      card={c}
                      tier={c.tier}
                      onTap={() => openCardSheet(c, true)}
                      tapped={selectedCard?.card.id === c.id}
                      effectiveCosts={computeCosts(c, costMode)}
                      hideStrike={costMode === 'needed_now'}
                    />
                    {isQueued && <QueuedOverlay />}
                    {state?.marketMarkers?.[c.id] && (
                      <>
                        <CardKeywordOverlay type={state.marketMarkers[c.id].type as 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed'} />
                        <CardMarkerBadge type={state.marketMarkers[c.id].type as 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed'} />
                      </>
                    )}
                    <div
                      className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/55 backdrop-blur-sm px-1 py-0.5 transition-opacity duration-500"
                      style={{ opacity: cardDetailDiscovered ? 0 : 1 }}
                    >
                      <Eye className="h-2.5 w-2.5 text-white/70" />
                      <span className="text-[7px] font-medium text-white/65 leading-none">details</span>
                    </div>
                  </div>
                  <div className="w-full px-0.5">
                    {c.flavor && (
                      <p className="text-[9px] text-muted-foreground italic leading-snug line-clamp-2 text-center">
                        &ldquo;{c.flavor}&rdquo;
                      </p>
                    )}
                    {loreTag && (
                      <p className="text-[8px] font-semibold uppercase tracking-wider text-primary/50 text-center mt-0.5 truncate">
                        {loreTag}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Forged Cards */}
      <div className="rounded-2xl border border-border/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPurchased(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-secondary/40 text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Forged Artifacts ({me?.purchasedCards?.length ?? 0})
          </span>
          {showPurchased ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showPurchased && (
          <div className="p-3">
            {/* Bonus summary — card bonuses + living luminary alliance bonuses */}
            {(() => {
              const lumAffinities: LuminaryActiveState[] = state.luminaryAffinities;
              const tc: number = state.turnCount;
              const myLumBonus: Partial<Record<GemKey, number>> = {};
              for (const la of lumAffinities) {
                if (la.ownerId !== session?.playerId || tc <= la.summonedAtTurnCount) continue;
                const k = la.activeAffinity as GemKey;
                myLumBonus[k] = (myLumBonus[k] ?? 0) + 1;
              }
              const hasAnyLumBonus = Object.values(myLumBonus).some(v => (v ?? 0) > 0);
              const hasAnyBonus = hasAnyLumBonus || CRYSTALS.filter(c => c !== 'flux').some(c => (me?.bonuses[c as keyof CrystalCounts] ?? 0) > 0);
              return (
                <div className="flex gap-1.5 flex-wrap mb-3 items-center">
                  {CRYSTALS.filter(c => c !== 'flux').map((c) => {
                    const cardCount = me?.bonuses[c as keyof CrystalCounts] ?? 0;
                    const lumCount = myLumBonus[c as GemKey] ?? 0;
                    const total = cardCount + lumCount;
                    if (total === 0) return null;
                    return (
                      <div key={c} className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
                        <MiniGem color={c as GemKey} size={12} />
                        <span className="text-xs font-bold text-white">×{total}</span>
                        {lumCount > 0 && <span className="text-[9px] text-yellow-400/80">✦</span>}
                      </div>
                    );
                  })}
                  {!hasAnyBonus && (
                    <span className="text-xs text-muted-foreground italic">No bonuses yet</span>
                  )}
                  {hasAnyLumBonus && (
                    <span className="text-[9px] text-yellow-400/60 ml-auto">✦ alliance</span>
                  )}
                </div>
              );
            })()}
            {/* Claimed Luminary alliances — name + effect name, tap to reveal description */}
            {(me?.claimedLuminaryIds ?? []).length > 0 && (
              <div className="flex flex-col gap-1 mb-3">
                {(me?.claimedLuminaryIds ?? []).map(lumId => {
                  const lum = (state.luminaries as Luminary[]).find(l => l.id === lumId);
                  if (!lum) return null;
                  const visuals = getLuminaryVisuals(lumId);
                  const primaryColor = visuals.primaryColor;
                  const isExpanded = expandedLumEffects.has(lumId);
                  const hasEffect = !!(lum.effectName || lum.effectDescription);
                  return (
                    <div key={lumId}>
                      <div
                        role={hasEffect ? 'button' : undefined}
                        tabIndex={hasEffect ? 0 : undefined}
                        aria-expanded={hasEffect ? isExpanded : undefined}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors${hasEffect ? ' cursor-pointer select-none' : ''}`}
                        style={{ background: `${primaryColor}11`, border: `1px solid ${primaryColor}33` }}
                        onClick={() => {
                          if (!hasEffect) return;
                          setExpandedLumEffects(prev => {
                            const next = new Set(prev);
                            if (next.has(lumId)) next.delete(lumId); else next.add(lumId);
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (!hasEffect) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedLumEffects(prev => {
                              const next = new Set(prev);
                              if (next.has(lumId)) next.delete(lumId); else next.add(lumId);
                              return next;
                            });
                          }
                        }}
                      >
                        <div className="shrink-0 rounded-md overflow-hidden">
                          <LuminaryPanelArt luminaryId={lumId} width={24} height={24} claimed />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-white leading-tight truncate">{lum.name}</p>
                          {lum.effectName && (
                            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] leading-none mt-0.5" style={{ color: primaryColor }}>{lum.effectName}</p>
                          )}
                        </div>
                        {hasEffect && (
                          <span className="text-[10px] text-muted-foreground shrink-0 leading-none">{isExpanded ? '▲' : '▼'}</span>
                        )}
                      </div>
                      {isExpanded && lum.effectDescription && (
                        <div className="mt-0.5 mx-0.5 rounded-lg px-3 py-2" style={{ background: `${primaryColor}0A`, border: `1px solid ${primaryColor}22` }}>
                          <p className="text-[10px] text-white/70 leading-relaxed">{lum.effectDescription}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Cards / Timeline toggle */}
            {(me?.purchasedCards?.length ?? 0) > 0 && (
              <div className="flex gap-1 mb-3">
                <button
                  type="button"
                  onClick={() => setForgedView('cards')}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${forgedView === 'cards' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setForgedView('timeline')}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${forgedView === 'timeline' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Timeline
                </button>
              </div>
            )}
            {(me?.purchasedCards?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground italic">No cards forged yet.</p>
            ) : forgedView === 'cards' ? (
              <div className="flex flex-wrap gap-2">
                {(me?.purchasedCards ?? []).map((c) => (
                  <ForgedCardWithTooltip key={c.id} card={c} tier={c.tier} onOpenSheet={() => openForgedCardSheet(c)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/30">
                {(me?.purchasedCards ?? []).map((c, idx) => {
                  const snap = c.bonusesAtForge;
                  const snapKeys = snap
                    ? CRYSTALS.filter(k => k !== 'flux' && (snap[k as keyof CrystalCounts] ?? 0) > 0)
                    : [];
                  const bonusMeta = GEM_META[c.bonusColor as GemKey];
                  return (
                    <div key={c.id} className="flex items-center gap-2.5 py-2 cursor-pointer rounded hover:bg-white/5 px-1 -mx-1 transition-colors" onClick={() => openForgedCardSheet(c)}>
                      <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0 tabular-nums">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{c.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {snapKeys.length > 0 ? snapKeys.map(k => (
                            <div key={k} className="flex items-center gap-0.5 bg-black/40 rounded px-1 py-0.5">
                              <MiniGem color={k as GemKey} size={9} />
                              <span className="text-[9px] font-bold text-white">×{snap![k as keyof CrystalCounts]}</span>
                            </div>
                          )) : (
                            <span className="text-[9px] text-muted-foreground italic">no snapshot</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-0.5 rounded-full px-1.5 py-0.5" style={{ background: (bonusMeta?.hex ?? '#888') + '22', border: `1px solid ${(bonusMeta?.hex ?? '#888')}44` }}>
                        <MiniGem color={c.bonusColor as GemKey} size={9} />
                        <span className="text-[9px] font-semibold" style={{ color: bonusMeta?.glowHex ?? '#fff' }}>+1</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Luminaries in Play */}
      {(state.luminaries?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowActiveLuminaries(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-secondary/40 text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">✦</span>
              Luminaries in Play ({state.luminaries.length})
            </span>
            {showActiveLuminaries ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showActiveLuminaries && (
            <div className="p-3 flex flex-col gap-2">
              {state.luminaries.map((lum) => {
                const claimedByPlayer = safePlayers.find(p => (p.claimedLuminaryIds ?? []).includes(lum.id)) ?? null;
                const claimedByMe = claimedByPlayer?.playerId === session?.playerId;
                const vis = getLuminaryVisuals(lum.id);
                const accentColor = lum.summonColor ?? vis.primaryColor;
                const reqEntries = CRYSTALS.filter(c => (lum.requirements[c as keyof CrystalCounts] ?? 0) > 0);
                return (
                  <div
                    key={lum.id}
                    className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl"
                    style={{
                      background: claimedByMe
                        ? `${accentColor}18`
                        : claimedByPlayer
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.25)',
                      border: `1px solid ${claimedByMe ? accentColor + '44' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    {/* Tiny panel art */}
                    <div className="shrink-0 rounded-md overflow-hidden">
                      <LuminaryPanelArt luminaryId={lum.id} width={32} height={32} claimed={!!claimedByPlayer} />
                    </div>
                    {/* Name + domain */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: claimedByMe ? accentColor : 'rgba(255,255,255,0.85)' }}>
                        {lum.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground leading-none truncate mt-0.5">{lum.domain}</p>
                    </div>
                    {/* Right: claimed badge OR progress chips */}
                    <div className="shrink-0 flex items-center gap-1">
                      {claimedByMe ? (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: accentColor + '33', color: accentColor, border: `1px solid ${accentColor}66` }}
                        >
                          ✓ Claimed
                        </span>
                      ) : claimedByPlayer ? (
                        <span className="text-[9px] text-muted-foreground truncate max-w-[72px]">
                          {claimedByPlayer.playerName}
                        </span>
                      ) : (
                        <div className="flex items-center gap-0.5 flex-wrap justify-end max-w-[120px]">
                          {reqEntries.map((c) => {
                            const needed = lum.requirements[c as keyof CrystalCounts] ?? 0;
                            const have = me?.bonuses?.[c as keyof CrystalCounts] ?? 0;
                            const met = have >= needed;
                            const meta = GEM_META[c as GemKey];
                            return (
                              <div
                                key={c}
                                className="flex items-center gap-0.5 rounded px-1 py-0.5"
                                style={{
                                  background: met ? `${meta.glowHex}22` : 'rgba(0,0,0,0.35)',
                                  border: `1px solid ${met ? meta.glowHex + '66' : 'rgba(255,255,255,0.12)'}`,
                                  opacity: met ? 0.7 : 1,
                                }}
                                title={met ? `${meta.name} requirement met (${have}/${needed})` : `Need ${needed - have} more ${meta.name} (${have}/${needed})`}
                              >
                                <MiniGem color={c as GemKey} size={8} />
                                <span
                                  className="text-[8px] font-bold leading-none tabular-nums"
                                  style={{ color: met ? meta.glowHex : 'rgba(255,255,255,0.75)' }}
                                >
                                  {met ? '✓' : `${have}/${needed}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Eminence value badge */}
                      {!claimedByPlayer && (
                        <div
                          className="flex items-center gap-0.5 ml-1 shrink-0"
                          title={lum.oblivion ? `−${lum.oblivion} Eminence (Oblivion)` : `+${lum.lumens} Eminence`}
                        >
                          <span
                            className="text-[9px] font-black leading-none"
                            style={{ color: lum.oblivion ? '#f87171' : accentColor }}
                          >
                            {lum.oblivion ? `−${lum.oblivion}` : `+${lum.lumens}`}
                          </span>
                          <EminenceDiamond size={8} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Chat helpers ─────────────────────────────────────────────────────────
  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    sendChatMessage(text);
  };

  const LogTab = () => (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Opponents */}
      {state.players.filter(p => p.playerId !== session?.playerId).length > 0 && (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Opponents</p>
        <div className="flex flex-col gap-2">
          {state.players.map((p, i) => {
            if (p.playerId === session?.playerId) return null;
            const isCurrent = state.status === 'playing' && state.currentPlayerIndex === i;
            const oppD = opponentData[p.playerId];
            const totalAffinity = oppD?.totalAffinity ?? 0;
            const cardCount = oppD?.cardCount ?? 0;
            const reservedCount = oppD?.reservedCount ?? 0;
            const isExpanded = expandedOpponents.has(p.playerId);
            const logOppCivPalette = oppD?.civPalette ?? getDominantAffinityPalette(p.purchasedCards);
            const logOppCivName = oppD?.civName ?? p.civName ?? p.playerName;
            const toggleExpanded = () => {
              setExpandedOpponents((prev) => {
                const next = new Set(prev);
                if (next.has(p.playerId)) next.delete(p.playerId);
                else next.add(p.playerId);
                return next;
              });
            };
            return (
              <div
                key={p.playerId}
                className={`rounded-2xl border p-3 bg-card/70 backdrop-blur transition-[border-color,box-shadow] ${isCurrent ? 'border-primary/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-border/40'}`}
              >
                {/* Header: identity + inline stats + lumens */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <PlayerAvatar avatarId={p.avatarId ?? null} name={p.playerName} size={22} />
                    {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                    <span className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">{p.playerName}</span>
                      <span className="text-[10px] font-normal tracking-wide truncate" style={{ color: logOppCivPalette.primary, opacity: 0.8 }}>{logOppCivName}</span>
                    </span>
                    {isCurrent && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">their turn</span>}
                  </div>
                  {/* Inline stat chips */}
                  <div className="flex items-center gap-2 shrink-0">
                    {([
                      { label: 'Affinity',  value: totalAffinity, hex: '#7aa2ff', glow: '#a8c5ff' },
                      { label: 'Artifact',  value: cardCount,     hex: '#ffc43d', glow: '#ffe28a' },
                      { label: 'Encrypted', value: reservedCount, hex: '#E8E4FF', glow: '#C8C0FF' },
                    ] as const).map(({ label, value, hex, glow }) => {
                      const has = value > 0;
                      return (
                        <div key={label} className="flex items-baseline gap-0.5 shrink-0">
                          <span
                            className="text-sm font-black leading-none"
                            style={{ color: has ? hex : hex + '55', textShadow: has ? `0 0 8px ${glow}` : 'none' }}
                          >
                            {value}
                          </span>
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wide leading-none"
                            style={{ color: has ? glow + 'cc' : hex + '44' }}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* View/Hide toggle */}
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-[10px] font-semibold text-primary"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="h-2.5 w-2.5" />Hide</>
                    ) : (
                      <><Eye className="h-2.5 w-2.5" />View</>
                    )}
                  </button>
                  <div className="flex items-center gap-1 shrink-0 font-serif font-black text-lg text-white leading-none">
                    <span>{p.lumens}</span>
                    <EminenceDiamond size={12} />
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 flex flex-col gap-3">
                        {/* Per-color gem grid */}
                        <div className="grid grid-cols-6 gap-1.5">
                          {CRYSTALS.map((c) => {
                            const n = p.crystals[c as keyof CrystalCounts] ?? 0;
                            const bonus = p.bonuses[c as keyof CrystalCounts] ?? 0;
                            const lumBonus = state.luminaryAffinities
                              .filter((la: LuminaryActiveState) =>
                                la.ownerId === p.playerId &&
                                state.turnCount > la.summonedAtTurnCount &&
                                la.activeAffinity === c
                              ).length;
                            const meta = GEM_META[c as GemKey];
                            const isFlux = c === 'flux';
                            const hasContent = isFlux ? (n > 0 || reservedCount > 0) : (n > 0 || bonus > 0 || lumBonus > 0);
                            return (
                              <div
                                key={c}
                                className="h-[72px] flex flex-col items-center gap-1 rounded-lg relative overflow-hidden pt-1.5 pb-1.5"
                                style={{
                                  background: hasContent
                                    ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)`
                                    : 'linear-gradient(180deg, #07070b 0%, #0e0e14 100%)',
                                  border: `1px solid ${hasContent ? meta.hex + 'AA' : meta.hex + '22'}`,
                                  boxShadow: hasContent ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33` : 'none',
                                }}
                              >
                                {hasContent && (
                                  <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />
                                )}
                                <div className="flex items-center gap-0.5 w-full justify-center">
                                  <span className="text-[7px] font-semibold tracking-wide leading-none truncate" style={{ color: meta.glowHex }}>{meta.shortName}</span>
                                  <MiniGem color={c as GemKey} size={7} />
                                </div>
                                <span
                                  className="text-2xl font-black leading-none tracking-tight"
                                  style={{ color: hasContent ? '#fff' : meta.hex + '40', textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : 'none' }}
                                >
                                  {n}
                                </span>
                                {!isFlux && (bonus > 0 || lumBonus > 0) && (
                                  <div className="flex flex-col items-center gap-0" style={{ lineHeight: 1 }}>
                                    {bonus > 0 && (
                                      <span className="text-[9px] font-bold leading-none text-primary">+{bonus} bonus</span>
                                    )}
                                    {lumBonus > 0 && (
                                      <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{lumBonus}✦</span>
                                    )}
                                  </div>
                                )}
                                {isFlux && reservedCount > 0 && (
                                  <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reservedCount} encrypted</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Reserved card backs — section always mounted when expanded so
                            AnimatePresence can complete child exit animations even when
                            the last reserved card is forged (count drops to 0). */}
                        <div className="flex items-center gap-2">
                          {reservedCount > 0 && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Encrypted:</span>
                          )}
                          <div className="flex gap-1 items-center">
                            <AnimatePresence initial={false}>
                              {p.reservedCards.map((card) => (
                                <motion.div
                                  key={card.id}
                                  data-reserved-card-id={card.id}
                                  initial={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.55, transition: { duration: 0.26, ease: 'easeIn' } }}
                                  style={{ transformOrigin: 'center center' }}
                                >
                                  <CardBack size="sm" tier={card.tier as 1 | 2 | 3} />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Forged artifacts */}
                        {p.purchasedCards.length > 0 ? (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Forged ({p.purchasedCards.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {p.purchasedCards.map((c) => (
                                <ForgedCardWithTooltip key={c.id} card={c} tier={c.tier} onOpenSheet={() => openForgedCardSheet(c)} />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Action Log */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent Actions</p>
          {(state.actionLog ?? []).length > 12 && (
            <button
              onClick={() => setShowAllLog((v) => !v)}
              className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors"
            >
              {showAllLog ? 'Show less' : `Show all ${(state.actionLog ?? []).length}`}
            </button>
          )}
        </div>
        <div
          className={`rounded-2xl border border-border/50 bg-card/60 backdrop-blur divide-y divide-border/30 ${showAllLog ? 'max-h-[420px] overflow-y-auto' : ''}`}
        >
          {(state.actionLog ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground italic text-center">No actions yet.</div>
          ) : (
            (() => {
              const AFFINITY_DOT_COLOR: Record<string, string> = {
                Flare: '#FF5A3C',
                Continuum: '#3D6BFF',
                Verdance: '#2ECC71',
                Abyss: '#9C27B0',
                Radiance: '#DFC878',
              };
              return [...(state.actionLog ?? [])].reverse().slice(0, showAllLog ? undefined : 12).map((entry, i) => {
              const isMe = entry.playerId === session.playerId;
              const logPlayer = state.players.find((pl) => pl.playerId === entry.playerId);
              const isAffinityChange = entry.summary.startsWith('switched ');
              const isCancelled = entry.summary.startsWith('planned move voided');
              const affinityLabel = isAffinityChange ? (entry.summary.split(' to ').pop() ?? '') : '';
              const dotColor = AFFINITY_DOT_COLOR[affinityLabel] ?? '#888';
              return (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5"
                style={
                  isCancelled
                    ? { background: 'rgba(234,179,8,0.07)' }
                    : isAffinityChange
                    ? { background: `${dotColor}0D` }
                    : undefined
                }
              >
                <PlayerAvatar
                  avatarId={logPlayer?.avatarId ?? (isMe ? session.avatarId : null)}
                  name={entry.playerName}
                  size={22}
                />
                <div className="text-xs leading-relaxed flex-1">
                  <span className={`font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>{entry.playerName}</span>
                  {isCancelled ? (
                    <>
                      <span className="text-yellow-400/80 italic"> · Planned move voided</span>
                      <span
                        className="inline-flex items-center justify-center ml-1.5 align-middle"
                        title={entry.summary.replace('planned move voided — ', '')}
                        style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.4)', flexShrink: 0 }}
                      >
                        <span style={{ fontSize: 9, lineHeight: 1, color: '#EAB308' }}>!</span>
                      </span>
                    </>
                  ) : isAffinityChange ? (
                    <>
                      <span className="text-foreground/70 italic"> · {entry.summary}</span>
                      <span
                        className="inline-flex items-center gap-1 ml-1.5 align-middle"
                        title={affinityLabel}
                      >
                        <span
                          className="inline-block rounded-full border border-white/20"
                          style={{ width: 7, height: 7, background: dotColor, boxShadow: `0 0 4px ${dotColor}99` }}
                        />
                        <span style={{ color: dotColor, fontSize: 10, lineHeight: 1 }}>↻</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-foreground/80"> · {entry.summary}</span>
                  )}
                  <span className="ml-1 text-[10px] text-muted-foreground/40">R{entry.turn}</span>
                </div>
              </div>
              );
            });
            })()
          )}
        </div>
      </div>

      {/* ── Chat ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Chat</p>
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur overflow-hidden mb-2">
          <div className="max-h-[180px] overflow-y-auto flex flex-col divide-y divide-border/20">
            {chatMessages.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground/60 italic text-center">No messages yet.</div>
            ) : (
              chatMessages.map((msg, i) => {
                const isMe = msg.playerId === session.playerId;
                const logPlayer = state.players.find((pl) => pl.playerId === msg.playerId);
                return (
                  <div key={i} className="flex items-start gap-2 px-3 py-2">
                    <PlayerAvatar
                      avatarId={logPlayer?.avatarId ?? (isMe ? session.avatarId : null)}
                      name={msg.playerName}
                      size={22}
                    />
                    <div className="text-xs leading-relaxed flex-1 min-w-0">
                      <span className={`font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>{msg.playerName}</span>
                      <span className="text-foreground/80 ml-1 break-words">{msg.text}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 bg-card/80 border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 min-w-0"
            placeholder="Send a message…"
            value={chatInput}
            maxLength={200}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSendChat}
            disabled={!chatInput.trim()}
            className="shrink-0 w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary disabled:opacity-30 transition-opacity"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden relative">
      {/* ── Cosmic background layers ──────────────────────────────────────── */}
      {/* Star-field photo: opacity pulses slowly so stars appear to breathe   */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundCosmos})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'cosmic-breathe 12s ease-in-out infinite',
        }}
      />
      {/* Darkening veil — lighter than before so stars show through           */}
      <div className="absolute inset-0 bg-background/68 pointer-events-none" />
      {/* Nebula corner glows — affinity-palette tints, barely perceptible     */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 35% at 100% 0%,   #3D6BFF0F 0%, transparent 70%),' +
            'radial-gradient(ellipse 45% 30% at 0%   100%, #FF5A3C0C 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 28% at 0%   0%,   #7B1FA20C 0%, transparent 65%),' +
            'radial-gradient(ellipse 42% 30% at 100% 100%, #2ECC710B 0%, transparent 65%)',
        }}
      />

      {/* ── Connection lost banner ── */}
      <AnimatePresence>
        {isReconnecting && !reconnectBannerDismissed && (
          <ConnectionLostBanner
            key="connection-lost-banner"
            onDismiss={() => setReconnectBannerDismissed(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="shrink-0 min-h-14 px-4 pt-[env(safe-area-inset-top)] flex items-center bg-card/95 border-b border-border z-20">
        {/* Balancing spacer — same width as the menu button so chips stay centred */}
        <div className="w-8 shrink-0" />

        {/* Opponent chips — centred in the remaining space */}
        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
          {state.players
            .filter(p => p.playerId !== session.playerId)
            .map(opponent => {
              const crystalTotals: Partial<Record<GemKey, number>> = {};
              const artifactTotals: Partial<Record<GemKey, number>> = {};
              for (const k of CRYSTALS) {
                if (k === 'flux') continue;
                const raw = opponent.crystals[k as keyof CrystalCounts] ?? 0;
                const cardBonus = opponent.purchasedCards.filter(c => c.bonusColor === k).length;
                crystalTotals[k] = raw;
                artifactTotals[k] = cardBonus;
              }
              const isExpanded = expandedOpponents.has(opponent.playerId);
              const onToggle = () => {
                setExpandedOpponents(prev => {
                  const next = new Set(prev);
                  if (next.has(opponent.playerId)) next.delete(opponent.playerId);
                  else next.add(opponent.playerId);
                  return next;
                });
              };
              return (
                <OpponentChip
                  key={opponent.playerId}
                  player={opponent}
                  isActive={
                    state.players[state.currentPlayerIndex]?.playerId === opponent.playerId
                  }
                  isLocalTurn={isMyTurn}
                  affinityTotals={crystalTotals}
                  artifactTotals={artifactTotals}
                  isExpanded={isExpanded}
                  onToggle={onToggle}
                />
              );
            })}
          <TurnCountdown deadline={state.turnDeadline ?? null} active={isMyTurn} />
          <span className="text-xs text-muted-foreground font-mono shrink-0">R{state.roundNumber}</span>
        </div>

        <DropdownMenu open={headerMenuOpen} onOpenChange={setHeaderMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(session.inviteCode).then(() =>
                  toast({ title: 'Game code copied', description: `Share code: ${session.inviteCode}` })
                );
              }}
              title="Tap to copy game code"
            >
              <Package className="h-3.5 w-3.5 shrink-0" />
              {session.inviteCode}
            </button>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setHeaderMenuOpen(false); setTimeout(() => setShowRules(true), 0); }}>
              <HelpCircle className="h-4 w-4" />
              Rules
            </DropdownMenuItem>
            {/*
              Toggle convention — icon-only state, no DropdownMenuCheckboxItem:
              All boolean settings in this menu communicate their on/off state exclusively
              through the icon (swap icons for binary toggles, or change icon color/opacity
              for non-binary toggles). Do NOT use DropdownMenuCheckboxItem — it adds a
              redundant checkbox indicator alongside the icon, creating a double-indicator.
              Pattern A (swap): muted → VolumeX/Volume2, label changes too.
              Pattern B (color): abridgedAnims → Zap always shown, yellow = on, muted = off.
            */}
            <DropdownMenuItem onClick={toggleMute}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'Unmute' : 'Mute'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleAbridgedAnims}>
              <Zap className={`h-4 w-4 ${abridgedAnims ? 'text-yellow-400' : 'text-muted-foreground opacity-50'}`} />
              Abridged animations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleSkipCinematics}>
              <Sparkles className={`h-4 w-4 ${skipCinematics ? 'text-muted-foreground opacity-50' : 'text-yellow-400'}`} />
              {skipCinematics ? 'Cinematics off' : 'Cinematics on'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleHints}>
              <Lightbulb className={`h-4 w-4 ${hintsEnabled ? 'text-yellow-400' : 'text-muted-foreground opacity-50'}`} />
              {hintsEnabled ? 'Hints on' : 'Hints off'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setHeaderMenuOpen(false); setTimeout(handleReturnToMenu, 0); }}>
              <DoorOpen className="h-4 w-4" />
              Return to Menu
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Refresh page
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setHeaderMenuOpen(false); setTimeout(handleSurrender, 0); }} className="text-red-500 focus:text-red-500">
              <Flag className="h-4 w-4" />
              Surrender
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── Tab Content ── */}
      <main
        data-game-board="true"
        ref={mainScrollRef as React.RefObject<HTMLDivElement>}
        tabIndex={-1}
        className="flex-1 overflow-y-auto overflow-x-hidden z-10 outline-none relative"
        onPointerDown={() => {
          // Fallback for non-iOS (Android Chrome, desktop): blur any focused
          // panel element as soon as a pointer gesture starts in the board.
          const active = document.activeElement as HTMLElement | null;
          if (active && playerPanelRef.current?.contains(active)) {
            active.blur();
          }
        }}
      >
        {activeTab === 'board' && (
          <>
            {BoardTabMain()}
            {BoardTabOpponents()}
          </>
        )}
        {activeTab === 'hand' && HandTab()}
        {activeTab === 'log' && LogTab()}
      </main>

      {/* ══════════════════════════════════════════════════════════════
          THE AFFINITY WELL — pinned player panel
          Shows the player's holdings + the shared bank availability.
          Tapping an affinity cell (on your turn) harvests from the Well.
          ══════════════════════════════════════════════════════════════ */}
      {me && (
        <div
          ref={playerPanelRef}
          className="shrink-0 z-20 transition-all"
          style={{
            background: 'linear-gradient(180deg, rgba(6,4,20,0.97) 0%, rgba(4,2,14,0.99) 100%)',
            borderTop: isMyTurn
              ? '1px solid rgba(168,197,255,0.5)'
              : '1px solid rgba(168,197,255,0.2)',
            boxShadow: isMyTurn
              ? '0 -4px 28px rgba(168,197,255,0.12)'
              : '0 -2px 12px rgba(0,0,0,0.4)',
          }}
          onClickCapture={() => {
            requestAnimationFrame(() => {
              const active = document.activeElement as HTMLElement | null;
              if (active && playerPanelRef.current?.contains(active)) active.blur();
            });
          }}
        >
          {/* ── Zone header row ── */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            {/* Left: zone name */}
            <div className="flex items-center gap-2">
              <Droplets className="h-3.5 w-3.5 shrink-0" style={{ color: '#a8c5ff', opacity: 0.85 }} />
              <div className="flex flex-col leading-none">
                <span className="text-[7px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(168,197,255,0.5)' }}>The</span>
                <span className="text-[12px] font-black uppercase tracking-[0.06em] leading-none" style={{
                  color: '#a8c5ff',
                  textShadow: '0 0 18px rgba(168,197,255,0.35)',
                }}>Affinity Well</span>
              </div>
            </div>
            {/* Center: identity */}
            <motion.div
              initial={false}
              animate={isMyTurn ? 'active' : 'idle'}
              variants={localTurnVariants}
              className="flex items-center gap-1.5 min-w-0"
            >
              <PlayerAvatar avatarId={session.avatarId} name={me.playerName} size={18} />
              {isMyTurn && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
              <span className="text-[11px] font-semibold truncate max-w-[80px]">{me.playerName}</span>
              {isMyTurn && (
                <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">your turn</span>
              )}
            </motion.div>
            {/* Right: stats */}
            <div className="flex items-center gap-2.5 shrink-0">
              {(() => {
                const heldTotal = Object.values(me.crystals).reduce((a, b) => a + b, 0);
                const pendingTotal = Object.values(selectedCrystals).reduce((a, b) => a + (b ?? 0), 0);
                const projected = heldTotal + pendingTotal;
                const isRed = projected >= 10;
                const isAmber = !isRed && projected >= 8;
                const numColor = isRed ? '#f87171' : isAmber ? '#fbbf24' : 'rgba(255,255,255,0.85)';
                return (
                  <div className="flex items-center gap-1" title={`${projected} / 10 tokens held`}>
                    <Hand className="h-3.5 w-3.5" style={{ color: numColor }} />
                    <span className="text-sm font-black font-mono tabular-nums leading-none" style={{ color: numColor }}>{projected}<span className="text-[10px] font-semibold" style={{ opacity: 0.5 }}>/10</span></span>
                  </div>
                );
              })()}
              <button
                type="button"
                onClick={() => setShowEminenceBreakdown(true)}
                className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:text-foreground transition-colors"
                title="View eminence breakdown"
                style={isTutorial && (tutorialStep === 9 || tutorialStep === 11) ? {
                  boxShadow: '0 0 0 2px rgba(168,85,247,0.6), 0 0 12px 3px rgba(168,85,247,0.22)',
                  borderRadius: 8,
                  transition: 'box-shadow 0.3s',
                } : undefined}
              >
                <span className="font-serif font-black text-lg text-white leading-none">{me.lumens}</span>
                <EminenceDiamond size={12} />
              </button>
            </div>
          </div>

          {/* ── Affinity cells ── */}
          <AffinityWellCells
            me={me}
            state={state}
            selectedCrystals={selectedCrystals}
            isMyTurn={isMyTurn}
            canPlan={canPlan}
            isActivePlayer={isActivePlayer}
            isTutorial={isTutorial}
            tutorialZone={tutorialZone}
            tutorialAttention={tutorialAttention}
            sessionPlayerId={session?.playerId}
            harvestBurstKeys={harvestBurstKeys}
            harvestBlockedKeys={harvestBlockedKeys}
            forgeDeductions={forgeDeductions}
            singularityAbsorbKey={singularityAbsorbKey}
            onCrystalClick={handleCrystalClick}
            onPromoteToTake2={promoteToTake2}
            onOpenReserved={() => setShowReservedOverlay(true)}
            onOpenForged={(c) => { setForgedFilter(c); setShowForgedOverlay(true); }}
          />

          {/* ── Fixed action zone — harness bar and hint crossfade in-place, no layout shift ── */}
          <div className="relative" style={{ height: 44, overflow: 'hidden' }}>
            <motion.div
              animate={{ opacity: crystalQueueActive ? 1 : 0 }}
              transition={{ duration: 0.15 }}
              style={{
                pointerEvents: crystalQueueActive ? 'auto' : 'none',
                position: 'absolute',
                inset: 0,
                ...(tutorialZone === 'harvest' && tutorialAttention === 'action' && crystalQueueActive ? {
                  boxShadow: '0 0 0 2px rgba(168,85,247,0.55), 0 0 18px 5px rgba(168,85,247,0.16)',
                } : {}),
              }}
            >
                <div className="px-2 pb-2 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 flex-1 items-center flex-wrap">
                      {Object.entries(selectedCrystals).map(([c, n]) => (
                        <div key={c} className="flex items-center gap-1 bg-black/50 rounded-full pl-1.5 pr-2 py-0.5 border border-white/10">
                          <MiniGem color={c as GemKey} size={12} />
                          <span className="text-xs font-bold text-white">×{n}</span>
                        </div>
                      ))}
                      <span className={`text-[10px] font-medium ${queueLegality.ok ? (!isMyTurn && canPlan ? 'text-amber-400' : 'text-green-400') : queueLegality.reason ? 'text-amber-400' : 'text-white/40'}`}>
                        {(!isMyTurn && canPlan && queueLegality.reason
                          ? `Plan: ${queueLegality.reason}`
                          : queueLegality.reason) || 'Pick affinities'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0 relative">
                      <AnimatePresence>
                        {showUndoHint && !showForgeHint && !showReserveHint && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 6, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            onClick={dismissUndoHint}
                            className="absolute bottom-full mb-1.5 left-0 whitespace-nowrap flex items-center gap-1 bg-black/80 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg backdrop-blur-sm z-10"
                            title="Dismiss hint"
                          >
                            <Undo2 className="h-2.5 w-2.5 text-white/60 shrink-0" />
                            <span>← Back removes the last affinity</span>
                            <span className="text-white/40 ml-0.5">✕</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={handleUndoCrystal} title="Undo last affinity">
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg"
                        onClick={() => { setActionMode('none'); setSelectedCrystals({}); setCrystalHistory([]); setPrePromotionHistory(null); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      {isMyTurnForCoreAction ? (
                        (() => {
                          const selKeys = Object.keys(selectedCrystals) as GemKey[];
                          const hasColors = selKeys.length > 0 && queueLegality.ok;
                          const borderColor = hasColors ? `${GEM_META[selKeys[0]].hex}70` : 'rgba(255,255,255,0.18)';
                          const conicGradient = selKeys.length === 1
                            ? `conic-gradient(${GEM_META[selKeys[0]].hex} 0deg, ${GEM_META[selKeys[0]].hex}44 180deg, ${GEM_META[selKeys[0]].hex} 360deg)`
                            : `conic-gradient(${selKeys.map((k, i) => {
                                const deg1 = Math.round((i / selKeys.length) * 360);
                                const deg2 = Math.round(((i + 1) / selKeys.length) * 360);
                                return `${GEM_META[k].hex} ${deg1}deg ${deg2}deg`;
                              }).join(', ')})`;
                          return (
                            <motion.div
                              role="button"
                              whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                              className={`relative h-7 px-3 rounded-lg overflow-hidden flex items-center justify-center border transition-all duration-500 shrink-0 ${!queueLegality.ok ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                              style={{ background: 'rgba(255,255,255,0.03)', borderColor, boxShadow: hasColors ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 14px ${GEM_META[selKeys[0]].hex}44` : 'inset 0 1px 0 rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', touchAction: 'manipulation' }}
                              onClick={queueLegality.ok ? () => { setHarnessPulseKey(k => k + 1); confirmCrystals(); } : undefined}
                            >
                              {selKeys.length > 0 && (
                                <div key={harnessPulseKey} className={harnessPulseKey > 0 ? 'harness-press-flash' : ''} style={{ position: 'absolute', width: '220%', height: '220%', top: '-60%', left: '-60%' }}>
                                  <div className="w-full h-full harness-swirl-ring" style={{ background: conicGradient, opacity: 0.48, filter: 'blur(8px)' }} />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.13] to-transparent pointer-events-none" />
                              <span className="relative z-10 text-xs font-bold transition-colors duration-300 select-none" style={{ color: hasColors ? '#fff' : 'rgba(255,255,255,0.35)', textShadow: hasColors ? '0 1px 5px rgba(0,0,0,0.85)' : 'none' }}>
                                <AnimatePresence mode="wait" initial={false}>
                                  {sentFlashBtn === 'harness' ? (
                                    <motion.span key="sent" className="flex items-center gap-1 text-emerald-300" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }} exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}>
                                      <Check className="h-3 w-3" />Sent
                                    </motion.span>
                                  ) : (
                                    <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.1 } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                                      Harness
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </span>
                            </motion.div>
                          );
                        })()
                      ) : canPlan && !coreActionSubmitted && queueLegality.ok ? (
                        (() => {
                          const planSelKeys = Object.keys(selectedCrystals) as GemKey[];
                          const planHasColors = planSelKeys.length > 0;
                          return (
                            <motion.div
                              role="button"
                              whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                              className="relative h-7 px-2.5 rounded-lg overflow-hidden flex items-center justify-center border transition-all duration-500 shrink-0 cursor-pointer"
                              style={{ background: planHasColors ? 'rgba(120,70,0,0.18)' : 'rgba(120,70,0,0.08)', borderColor: planHasColors ? 'rgba(251,191,36,0.55)' : 'rgba(251,191,36,0.28)', boxShadow: planHasColors ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 10px rgba(251,191,36,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', touchAction: 'manipulation' }}
                              onClick={() => {
                                if (queueLegality.actionType === 'take3') {
                                  handlePlanAction({ type: 'take_three_crystals', crystals: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0, ...selectedCrystals } });
                                } else if (queueLegality.actionType === 'take2') {
                                  handlePlanAction({ type: 'take_two_crystals', crystal: Object.keys(selectedCrystals)[0] });
                                }
                                flashSent('plan_harness');
                              }}
                            >
                              {planHasColors && (
                                <div style={{ position: 'absolute', width: '220%', height: '220%', top: '-60%', left: '-60%' }}>
                                  <div className="w-full h-full harness-swirl-ring" style={{ background: `conic-gradient(rgba(251,191,36,0.7) 0deg, rgba(251,191,36,0.2) 180deg, rgba(251,191,36,0.7) 360deg)`, opacity: 0.30, filter: 'blur(8px)' }} />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.10] to-transparent pointer-events-none" />
                              <span className="relative z-10 text-xs font-bold select-none flex items-center gap-1.5">
                                <AnimatePresence mode="wait" initial={false}>
                                  {sentFlashBtn === 'plan_harness' ? (
                                    <motion.span key="sent" className="flex items-center gap-1 text-emerald-300" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }} exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}>
                                      <Check className="h-3 w-3" />Sent
                                    </motion.span>
                                  ) : (
                                    <motion.span key="label" className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.1 } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                                      <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/70 border border-amber-500/50 rounded px-[5px] py-[1px] leading-none">PLAN</span>
                                      <span style={{ color: planHasColors ? '#fde68a' : 'rgba(255,255,255,0.35)' }}>Harness</span>
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </span>
                            </motion.div>
                          );
                        })()
                      ) : null}
                    </div>
                  </div>
                </div>
            </motion.div>
            {/* Hint text — crossfades in the same fixed slot, no layout shift */}
            <motion.div
              animate={{ opacity: crystalQueueActive ? 0 : 1 }}
              transition={{ duration: 0.15 }}
              style={{ pointerEvents: crystalQueueActive ? 'none' : 'auto', position: 'absolute', inset: 0 }}
              className="flex items-center justify-center"
            >
              <span className="text-[8.5px] text-white/30 leading-none">
                Select <span className="text-white/50 font-semibold">3 different</span> or <span className="text-white/50 font-semibold">2 of the same</span> affinities. <span className="text-white/50 font-semibold">Limit 10</span>.
              </span>
            </motion.div>
          </div>

          {/* ── Return-crystals phase (hand limit exceeded) ── */}
          <AnimatePresence>
            {returnPhase && isMyTurn && me && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-2 pt-2 border-t border-amber-500/40 bg-amber-950/25">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[11px] font-bold text-amber-300">
                        Return {returnPhase.excessCount} affinity token{returnPhase.excessCount > 1 ? 's' : ''} — hand limit is 10
                      </p>
                      {(() => {
                        const sel = Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0);
                        const remaining = returnPhase.excessCount - sel;
                        return (
                          <p className="text-[10px] text-white/50 mt-0.5">
                            {remaining > 0 ? `Select ${remaining} more to return` : 'Ready — confirm to harness'}
                          </p>
                        );
                      })()}
                    </div>
                    <button type="button" onClick={cancelReturnPhase}
                      className="h-7 w-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 mb-3">
                    {(CRYSTALS as GemKey[]).map((c) => {
                      const held = me.crystals[c as keyof CrystalCounts] ?? 0;
                      const taking = returnPhase.pendingTake[c as keyof CrystalCounts] ?? 0;
                      const have = held + taking;
                      const returning = returnSelections[c as keyof CrystalCounts] ?? 0;
                      const available = have - returning;
                      if (have === 0) return null;
                      const meta = GEM_META[c as GemKey];
                      const isMarkedReturn = returning > 0;
                      const totalSel = Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0);
                      const canAdd = available > 0 && totalSel < returnPhase.excessCount + 5;
                      return (
                        <div key={c} className="flex flex-col items-center gap-0.5">
                          <motion.button type="button" whileTap={canAdd ? { scale: 0.88 } : {}}
                            onClick={() => { if (!canAdd) return; setReturnSelections(prev => ({ ...prev, [c]: (prev[c as keyof CrystalCounts] ?? 0) + 1 })); }}
                            className="relative w-full aspect-square rounded-xl flex flex-col items-center justify-center overflow-hidden transition-all"
                            style={isMarkedReturn ? {
                              background: `linear-gradient(160deg, #7f1d1d99 0%, #991b1b70 100%)`,
                              border: `2px solid #f87171cc`, boxShadow: `0 0 16px #f8717166`, opacity: canAdd ? 1 : 0.85,
                            } : { background: `linear-gradient(160deg, ${meta.hex}30 0%, ${meta.hex}12 100%)`, border: `1px solid ${meta.glowHex}55`, opacity: canAdd ? 1 : 0.4 }}
                          >
                            <img src={meta.image} alt={meta.name} className="w-[55%] h-[55%] object-contain pointer-events-none select-none" style={{ filter: `drop-shadow(0 0 6px ${meta.glowHex}80)` }} draggable={false} />
                            <span className="text-xs font-black font-mono leading-none text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{available}</span>
                            {isMarkedReturn && (
                              <div className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-black text-white leading-none shadow">-{returning}</div>
                            )}
                          </motion.button>
                          <span className="text-[8px] font-semibold uppercase tracking-wider leading-none" style={{ color: `${meta.glowHex}88` }}>{meta.shortName}</span>
                          {returning > 0 && (
                            <button type="button"
                              onClick={() => setReturnSelections(prev => {
                                const curr = prev[c as keyof CrystalCounts] ?? 0;
                                if (curr <= 1) { const next = { ...prev }; delete next[c as keyof CrystalCounts]; return next; }
                                return { ...prev, [c]: curr - 1 };
                              })}
                              className="text-[8px] text-red-400/70 hover:text-red-400 font-bold leading-none"
                            >undo</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const sel = Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0);
                    const ready = sel >= returnPhase.excessCount;
                    return (
                      <motion.button type="button" whileTap={ready ? { scale: 0.96 } : {}} disabled={!ready} onClick={confirmReturnPhase}
                        className="w-full h-9 rounded-xl text-sm font-bold transition-all"
                        style={ready ? {
                          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#fff',
                          boxShadow: '0 0 18px rgba(124,58,237,0.55)', border: '1px solid rgba(167,139,250,0.5)',
                        } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'not-allowed' }}
                      >
                        {ready ? 'Confirm Return & Harness' : `Select ${returnPhase.excessCount - Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0)} more to return`}
                      </motion.button>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* ── Bottom Navigation ── */}
      <nav className="shrink-0 grid grid-cols-3 border-t border-border bg-card z-20 pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        {([
          { tab: 'board' as ActiveTab, label: 'Board', icon: LayoutGrid },
          { tab: 'hand' as ActiveTab, label: 'Civilization', icon: Landmark },
          { tab: 'log' as ActiveTab, label: 'Log', icon: List, badge: unreadChat > 0 ? unreadChat : undefined },
        ] as const).map(({ tab, label, icon: Icon, badge }: { tab: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            {...(tab === 'hand' ? { 'data-nav-hand': '' } : tab === 'log' ? { 'data-nav-log': '' } : {})}
            className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {badge !== undefined && (
                <span className="absolute -top-1 -right-1.5 h-4 w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">{label}</span>
            {activeTab === tab && (
              <div className="absolute -top-2 inset-x-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Card Action Sheet ── */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => { setSelectedCard(null); setPendingSheetAction(null); }}
          >
            <motion.div style={{ opacity: cardSheetBackdropOpacity }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              ref={(el) => { cardSheetContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label="Card actions"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ scale: cardSheetScale }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl px-5 pt-0 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
              {...cardSheetDragProps}
            >
              {/* Drag handle */}
              <div {...cardSheetHandleBarProps} className="flex flex-col items-center pt-3 pb-1 gap-1">
                <div className="w-10 h-1 rounded-full bg-border" />
                <SwipeHintBar peekProgress={cardSheetPeekProgress} />
              </div>
              {/* Sticky peek header — always visible even when the sheet is in the 40 % peek position.
                  Contains the card name + affinity gem so players can identify the card at a glance
                  without needing to expand the sheet.  The close button lives here too so it remains
                  reachable when peeked.  Hidden visually when the scrollable body covers it naturally,
                  but the element is always in the DOM so focus-trap / keyboard close still works. */}
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-3">
                <MiniGem color={selectedCard.card.bonusColor as GemKey} size={14} />
                <span className="font-semibold text-sm leading-tight flex-1 truncate">{selectedCard.card.name}</span>
                {selectedCard.readOnly && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                    Forged
                  </span>
                )}
                {(selectedCard.card.lumens ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-bold text-primary shrink-0">
                    <Sparkles className="h-3 w-3" />{selectedCard.card.lumens}
                  </span>
                )}
                <kbd className="hidden [@media(pointer:fine)]:inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground/40 border border-border/30 bg-muted/10 leading-none select-none">Esc</kbd>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 focus-visible:outline-none focus-visible:ring-0"
                  aria-label="Close card actions"
                  onClick={() => { setSelectedCard(null); setPendingSheetAction(null); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* Scrollable body: enables dismiss-from-content when at scrollTop=0 */}
              <div
                {...cardSheetScrollableProps}
                className="overflow-y-auto max-h-[70vh]"
                style={isTutorial && (tutorialStep === 6 || tutorialStep === 8)
                  ? { paddingBottom: 'var(--tutorial-panel-height, 0px)' }
                  : undefined}
              >
              {/* Card preview + info */}
              <div className="flex gap-4 mb-5">
                {/* Flippable thumbnail column */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    style={{ perspective: '600px', width: 'var(--card-w)', height: 'var(--card-h)' }}
                    className="cursor-pointer"
                    onClick={() => setCardFlipped(f => !f)}
                    title={cardFlipped ? 'Tap to see art' : 'Tap to see card back'}
                  >
                    <motion.div
                      animate={{ rotateY: cardFlipped ? 180 : 0 }}
                      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                      style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
                    >
                      <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
                        <ArtifactCardView card={selectedCard.card} tier={selectedCard.card.tier} artOnly />
                      </div>
                      <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}>
                        <CardBack tier={selectedCard.card.tier as 1 | 2 | 3} />
                      </div>
                    </motion.div>
                  </div>
                  {/* Tier civilization label */}
                  <span className="font-serif tracking-[0.16em] uppercase text-[8px] mt-0.5" style={{ color: '#C0A472', textShadow: '0 1px 8px rgba(192,164,114,0.5)' }}>
                    Tier {selectedCard.card.tier}, {TIER_CIVILIZATION[selectedCard.card.tier]}
                  </span>
                  <span className="text-[7px] text-white/20">tap to flip</span>
                </div>
                {/* Right: cost → flavor → lore metadata → bonus */}
                <div className="flex-1 flex flex-col gap-2.5 justify-center">
                  {/* Cost — always shown first */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Cost</span>
                    <div className="flex flex-wrap gap-0.5">
                      {CRYSTALS.map((c) => {
                        const baseCost = selectedCard.card.cost[c as keyof CrystalCounts] ?? 0;
                        if (baseCost <= 0) return null;
                        const effCosts = me ? computeCosts(selectedCard.card, costMode) as Record<string, number> : undefined;
                        const effCost = effCosts ? (effCosts[c] ?? 0) : baseCost;
                        const isReduced = effCosts !== undefined && effCost < baseCost;
                        const bonusOnlyForSheet = me ? computeCosts(selectedCard.card, 'after_bonuses') as Record<string, number> | undefined : undefined;
                        const bonusEffCostSheet = bonusOnlyForSheet ? (bonusOnlyForSheet[c] ?? baseCost) : effCost;
                        const isFree = isReduced && effCost === 0 && bonusEffCostSheet === 0;
                        // In needed_now mode, effCost=0 means player has enough right now — show ✓ visually only.
                        const isNeededCovered = costMode === 'needed_now' && effCost === 0 && !isFree;
                        const isGreen = isFree || isNeededCovered;
                        return (
                          <div key={c} className={`flex items-center gap-0.5 rounded px-1 py-0.5 ${isGreen ? 'bg-green-900/70' : isReduced ? 'bg-blue-900/70' : 'bg-black/55'}`}>
                            {isReduced && !isGreen && costMode !== 'needed_now' && <span className="text-[7px] font-bold text-white/40 line-through mr-0.5">{baseCost}</span>}
                            <span className={`text-[10px] font-bold ${isGreen ? 'text-green-300' : isReduced ? 'text-blue-200' : 'text-white'}`}>{isGreen ? '✓' : effCost}</span>
                            <MiniGem color={c} size={10} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Forged with — cost paid snapshot, shown only for already-forged (readOnly) cards */}
                  {selectedCard.readOnly && (() => {
                    const snap = selectedCard.card.bonusesAtForge;
                    const snapKeys = snap
                      ? CRYSTALS.filter(k => k !== 'flux' && (snap[k as keyof CrystalCounts] ?? 0) > 0)
                      : [];
                    return (
                      <div className="flex flex-col gap-1 border-t border-border/30 pt-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Forged with</span>
                        {snapKeys.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5">
                            {snapKeys.map(k => (
                              <div key={k} className="flex items-center gap-0.5 bg-black/55 rounded px-1 py-0.5">
                                <MiniGem color={k as GemKey} size={10} />
                                <span className="text-[10px] font-bold text-white">×{snap![k as keyof CrystalCounts]}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">No snapshot available</span>
                        )}
                      </div>
                    );
                  })()}
                  {/* Flavor text — from lore catalog, fallback to card field */}
                  {(() => {
                    const flavorText = loreCatalog?.[selectedCard.card.id]?.flavor ?? (selectedCard.card as { flavor?: string }).flavor;
                    if (!flavorText) return null;
                    return (
                      <p className="text-[11px] text-muted-foreground italic leading-relaxed border-t border-border/30 pt-2">"{flavorText}"</p>
                    );
                  })()}
                  {/* Lore metadata */}
                  {loreCatalog && (() => {
                    const lore = loreCatalog[selectedCard.card.id];
                    if (!lore) return null;
                    const fields: { label: string; value: string | undefined }[] = [
                      { label: 'Form',     value: lore.artifactForm },
                      { label: 'Role',     value: lore.blueprintRole },
                      { label: 'Culture',  value: lore.civLane },
                    ];
                    const visible = fields.filter(f => f.value);
                    if (visible.length === 0) return null;
                    return (
                      <div className="flex flex-col gap-1">
                        {visible.map(({ label, value }) => (
                          <div key={label} className="flex gap-1.5 items-baseline">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 shrink-0 w-[46px]">{label}</span>
                            <span className="text-[10px] text-muted-foreground/75 leading-snug">{value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {/* Bonus gem */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Bonus:</span>
                    <MiniGem color={selectedCard.card.bonusColor as GemKey} size={14} />
                    <span className="text-xs font-semibold">{GEM_META[selectedCard.card.bonusColor as GemKey]?.name ?? selectedCard.card.bonusColor}</span>
                  </div>
                </div>
              </div>

              {/* My Cost breakdown — shortfall per gem */}
              {costMode !== 'printed' && me && (() => {
                // Live calculation — reacts to costMode and selectedCrystals changes in real time
                const liveCosts = computeCosts(selectedCard.card, costMode) as Record<string, number> | undefined;
                if (!liveCosts) return null;
                const rows: { gem: GemKey; need: number; have: number; short: number }[] = [];
                let totalShort = 0;
                for (const c of CRYSTALS) {
                  if (c === 'flux') continue;
                  const baseCost = selectedCard.card.cost[c as keyof CrystalCounts] ?? 0;
                  if (baseCost <= 0) continue;
                  const need = liveCosts[c] ?? 0;
                  // In after_bonuses mode show token coverage; in needed_now the shortfall IS the remaining
                  const have = costMode === 'after_bonuses'
                    ? Math.min(need, me.crystals[c as keyof CrystalCounts] ?? 0)
                    : 0;
                  const short = costMode === 'after_bonuses' ? Math.max(0, need - have) : need;
                  totalShort += short;
                  rows.push({ gem: c as GemKey, need, have, short });
                }
                const fluxHave = me.crystals.flux ?? 0;
                const fluxNeeded = Math.max(0, totalShort);
                const fluxCovers = fluxNeeded <= fluxHave;
                const canAfford = canAffordCard(selectedCard.card, me);
                if (rows.length === 0) return null;
                const modeLabel = costMode === 'after_bonuses' ? 'After bonuses — tokens needed' : 'What you still need right now';
                return (
                  <div className="mb-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{modeLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      {rows.map(({ gem, need, have, short }) => (
                        <div key={gem} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${short === 0 ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                          <MiniGem color={gem} size={12} />
                          {short === 0
                            ? <span className="text-green-400">✓ {have}/{need}</span>
                            : costMode === 'after_bonuses'
                              ? <span>−{short} <span className="text-white/40 font-normal">({have}/{need})</span></span>
                              : <span>−{need}</span>
                          }
                        </div>
                      ))}
                      {fluxNeeded > 0 && (
                        <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${fluxCovers ? 'bg-amber-900/40 text-amber-300' : 'bg-red-900/50 text-red-300'}`}>
                          <MiniGem color="flux" size={12} />
                          {fluxCovers
                            ? <span>{fluxNeeded} singularity covers gap</span>
                            : <span>need {fluxNeeded}, have {fluxHave}</span>
                          }
                        </div>
                      )}
                    </div>
                    {isMyTurn && canAfford && <p className="text-[10px] font-semibold text-green-400">You can forge this now</p>}
                    {isMyTurn && !canAfford && <p className="text-[10px] font-semibold text-red-400">Still short — keep harnessing</p>}
                    {!isMyTurn && canAfford && <p className="text-[10px] font-semibold text-amber-400">You can afford this — plan it below</p>}
                    {!isMyTurn && !canAfford && <p className="text-[10px] font-semibold text-muted-foreground">Plan it now — acquire tokens before your turn</p>}
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div
                className="flex flex-col gap-2.5 rounded-xl overflow-visible"
                style={{ border: '1.5px solid transparent', overflow: 'visible' }}
              >

                {/* ── Immediate actions (your active turn only) ── */}
                {!selectedCard.readOnly && isMyTurnForCoreAction && (
                  <>
                    <div
                      key={btnAnimTarget === 'forge' ? `forge-${btnAnimKey}` : 'forge'}
                      className={`relative w-full${btnAnimTarget === 'forge' ? ` btn-${btnAnimType}-flash` : ''}`}
                    >
                      <AnimatePresence>
                        {showForgeHint && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 6, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            onClick={dismissForgeHint}
                            className="absolute bottom-full mb-1.5 left-0 max-w-[calc(100vw-3rem)] whitespace-normal flex items-center gap-1 bg-black/80 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg backdrop-blur-sm z-10"
                            title="Dismiss hint"
                          >
                            <Gavel className="h-2.5 w-2.5 text-white/60 shrink-0" />
                            <span>Tap to spend your affinities and claim this Artifact</span>
                            <span className="text-white/40 ml-0.5">✕</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <ForgeButton
                        disabled={!me || !canAffordCard(selectedCard.card, me)}
                        isPending={pendingSheetAction === 'forge'}
                        isSent={sentFlashBtn === 'forge'}
                        confirmHex={forgeConfirmHex}
                        confirmGlow={forgeConfirmGlow}
                        darkText={forgeDarkText}
                        label={pendingSheetAction === 'forge' ? 'CONFIRM' : 'FORGE'}
                        subtitle={pendingSheetAction === 'forge' ? 'Tap to manifest' : (me && canAffordCard(selectedCard.card, me) ? 'Manifest Artifact' : 'Cannot afford yet')}
                        onClick={() => {
                          if (pendingSheetAction === 'forge') {
                            gameAudio.playButtonConfirm(); triggerBtnAnim('forge', 'confirm');
                            handleBuy(selectedCard.card, selectedCard.fromReserve);
                            setSelectedCard(null); setPendingSheetAction(null);
                          } else {
                            gameAudio.playButtonSelect(); triggerBtnAnim('forge', 'select');
                            setPendingSheetAction('forge');
                          }
                        }}
                      />
                    </div>
                    {!selectedCard.fromReserve && (
                      <div
                        key={btnAnimTarget === 'reserve' ? `reserve-${btnAnimKey}` : 'reserve'}
                        className={`relative w-full${btnAnimTarget === 'reserve' ? ` btn-${btnAnimType}-flash` : ''}`}
                      >
                        <AnimatePresence>
                          {showReserveHint && !showForgeHint && (
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, y: 6, scale: 0.92 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.95 }}
                              transition={{ duration: 0.3 }}
                              onClick={dismissReserveHint}
                              className="absolute bottom-full mb-1.5 left-0 max-w-[calc(100vw-3rem)] whitespace-normal flex items-center gap-1 bg-black/80 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg backdrop-blur-sm z-10"
                              title="Dismiss hint"
                            >
                              <span className="h-2.5 w-2.5 inline-flex items-center justify-center shrink-0 opacity-60"><CipherSigil affinityHex="#e2e8f0" id={9003} /></span>
                              <span>Encrypting holds this card — tap again to confirm</span>
                              <span className="text-white/40 ml-0.5">✕</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                        <EncryptButton
                          disabled={!me || !canReserveMore(me)}
                          isPending={pendingSheetAction === 'reserve'}
                          isSent={sentFlashBtn === 'reserve'}
                          sigilId={9001}
                          label={pendingSheetAction === 'reserve' ? 'CONFIRM' : 'ENCRYPT'}
                          subtitle={pendingSheetAction === 'reserve' ? 'Tap to reserve' : (me && canReserveMore(me) ? 'Reserve Pattern' : 'Encrypted pile full')}
                          onClick={() => {
                            if (pendingSheetAction === 'reserve') {
                              gameAudio.playButtonConfirm(); triggerBtnAnim('reserve', 'confirm');
                              handleReserveCard(selectedCard.card);
                              setSelectedCard(null); setPendingSheetAction(null);
                            } else {
                              gameAudio.playButtonSelect(); triggerBtnAnim('reserve', 'select');
                              setPendingSheetAction('reserve');
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* ── Assimilate (First Hunger lingering ability) ── */}
                    {assimilateAvailable && assimEligible && !selectedCard.fromReserve && (
                      <div>
                        {/* Separator + label so the player knows this is a different kind of action */}
                        <div className="flex items-center gap-1.5 px-0.5 mb-2.5">
                          <div className="flex-1 h-px bg-red-900/40" />
                          <span className="text-[8.5px] font-black uppercase tracking-widest text-red-400/70">First Hunger</span>
                          <div className="flex-1 h-px bg-red-900/40" />
                        </div>
                        <div
                          key={btnAnimTarget === 'assimilate' ? `assimilate-${btnAnimKey}` : 'assimilate'}
                          className={`relative w-full${btnAnimTarget === 'assimilate' ? ` btn-${btnAnimType}-flash` : ''}`}
                        >
                          <AssimilateButton
                            disabled={!canAffordAssim}
                            isPending={pendingSheetAction === 'assimilate'}
                            isSent={sentFlashBtn === 'assimilate'}
                            eminenceReward={pendingSheetAction === 'assimilate' ? undefined : (selectedCard.card.lumens + 2)}
                            label={pendingSheetAction === 'assimilate' ? 'CONFIRM' : 'ASSIMILATE'}
                            subtitle={
                              pendingSheetAction === 'assimilate'
                                ? 'Tap to consume'
                                : canAffordAssim
                                  ? `+${selectedCard.card.lumens + 2} Eminence — one use`
                                  : 'Cannot afford'
                            }
                            onClick={() => {
                              if (pendingSheetAction === 'assimilate') {
                                gameAudio.playButtonConfirm();
                                triggerBtnAnim('assimilate', 'confirm');
                                executeAction({ type: 'assimilate', cardId: selectedCard.card.id });
                                setSelectedCard(null);
                                setPendingSheetAction(null);
                              } else {
                                gameAudio.playButtonSelect();
                                triggerBtnAnim('assimilate', 'select');
                                setPendingSheetAction('assimilate');
                              }
                            }}
                          />
                        </div>
                        {/* Tooltip: clarify the consume mechanic */}
                        {pendingSheetAction !== 'assimilate' && (
                          <p className="mt-1.5 text-[9.5px] text-red-300/50 text-center leading-snug px-1">
                            Burns artifact · grants Eminence · no card acquired · cannot undo
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ── Plan actions (any time game is active, no cutscene) ── */}
                {!selectedCard.readOnly && canPlan && !isMyTurnForCoreAction && !coreActionSubmitted && (
                  <>
                    {/* Queue header — makes it clear these fire on the next turn */}
                    <div className="flex items-center gap-1.5 px-0.5 mt-0.5">
                      <Clock className="h-3 w-3 text-amber-400/80 shrink-0" />
                      <span className="text-[9.5px] font-semibold uppercase tracking-widest text-amber-400/80">
                        Queue for your next turn
                      </span>
                      <div className="flex-1 h-px bg-amber-400/20" />
                    </div>
                    <div className="pl-2.5 border-l-2 border-amber-400/25 flex flex-col gap-2.5">
                    {me && canAffordCard(selectedCard.card, me) && (
                    <div
                      key={btnAnimTarget === 'plan_forge' ? `plan_forge-${btnAnimKey}` : 'plan_forge'}
                      className={`relative w-full${btnAnimTarget === 'plan_forge' ? ` btn-${btnAnimType}-flash` : ''}`}
                    >
                      <ForgeButton
                        isPending={pendingSheetAction === 'plan_forge'}
                        isSent={sentFlashBtn === 'plan_forge'}
                        confirmHex={forgeConfirmHex}
                        confirmGlow={forgeConfirmGlow}
                        darkText={forgeDarkText}
                        isPlan
                        label={pendingSheetAction === 'plan_forge' ? 'CONFIRM' : 'FORGE'}
                        subtitle={pendingSheetAction === 'plan_forge' ? 'Confirm to queue' : 'Plan to Manifest'}
                        onClick={() => {
                          if (pendingSheetAction === 'plan_forge') {
                            gameAudio.playButtonConfirm(); triggerBtnAnim('plan_forge', 'confirm');
                            handlePlanAction({ type: selectedCard.fromReserve ? 'purchase_reserved' : 'purchase_card', cardId: selectedCard.card.id });
                            flashSent('plan_forge');
                            setTimeout(() => { setSelectedCard(null); setPendingSheetAction(null); }, 750);
                          } else {
                            gameAudio.playButtonSelect(); triggerBtnAnim('plan_forge', 'select');
                            setPendingSheetAction('plan_forge');
                          }
                        }}
                      />
                    </div>
                    )}
                    {!selectedCard.fromReserve && (
                      <div
                        key={btnAnimTarget === 'plan_reserve' ? `plan_reserve-${btnAnimKey}` : 'plan_reserve'}
                        className={`w-full${btnAnimTarget === 'plan_reserve' ? ` btn-${btnAnimType}-flash` : ''}`}
                      >
                        <EncryptButton
                          disabled={!me || !canReserveMore(me)}
                          isPending={pendingSheetAction === 'plan_reserve'}
                          isSent={sentFlashBtn === 'plan_reserve'}
                          sigilId={9002}
                          isPlan
                          label={pendingSheetAction === 'plan_reserve' ? 'CONFIRM' : 'ENCRYPT'}
                          subtitle={pendingSheetAction === 'plan_reserve' ? 'Confirm to queue' : (me && canReserveMore(me) ? 'Plan to Reserve' : 'Encrypted pile full')}
                          onClick={() => {
                            if (pendingSheetAction === 'plan_reserve') {
                              gameAudio.playButtonConfirm(); triggerBtnAnim('plan_reserve', 'confirm');
                              handlePlanAction({ type: 'reserve_card', cardId: selectedCard.card.id, tier: selectedCard.card.tier });
                              flashSent('plan_reserve');
                              setTimeout(() => { setSelectedCard(null); setPendingSheetAction(null); }, 750);
                            } else {
                              gameAudio.playButtonSelect(); triggerBtnAnim('plan_reserve', 'select');
                              setPendingSheetAction('plan_reserve');
                            }
                          }}
                        />
                      </div>
                    )}
                    </div>{/* end border-l queue wrapper */}
                    <p className="text-[10px] text-muted-foreground text-center">
                      {myPlannedAction ? 'Selecting a new plan replaces the current one' : 'Planned moves auto-execute when your turn starts'}
                    </p>
                  </>
                )}

                {/* ── Neither available — Luminary cutscene blocking ── */}
                {!selectedCard.readOnly && !isMyTurn && !canPlan && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    Waiting for Luminary summon…
                  </p>
                )}

                <Button variant="ghost" className="w-full text-muted-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-0" onClick={() => { setSelectedCard(null); setPendingSheetAction(null); }}>
                  Close
                </Button>
              </div>
              </div>{/* end scrollable body */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Luminary Detail Sheet ── */}
      {/* Shown when the player taps an unclaimed Luminary portal card.        */}
      <AnimatePresence>
        {selectedLuminary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => setSelectedLuminary(null)}
          >
            <motion.div style={{ opacity: luminarySheetBackdropOpacity }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              ref={(el) => { luminarySheetContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label="Luminary details"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ scale: luminarySheetScale }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl px-5 pt-0 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
              {...luminarySheetDragProps}
            >
              {/* Drag handle */}
              <div {...luminarySheetHandleBarProps} className="flex flex-col items-center pt-3 pb-1 gap-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              {/* Header row: name + lumen reward + close */}
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-3">
                <EminenceDiamond size={14} />
                <span className="font-semibold text-sm leading-tight flex-1 truncate">{selectedLuminary.name}</span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-300 shrink-0">
                  +{selectedLuminary.lumens}<EminenceDiamond size={9} />
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 focus-visible:outline-none focus-visible:ring-0"
                  aria-label="Close luminary details"
                  onClick={() => setSelectedLuminary(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* Scrollable body */}
              <div {...luminarySheetScrollableProps} className="overflow-y-auto max-h-[70vh]">
                <div className="flex items-center justify-end pb-3">
                  <span className="text-xs text-muted-foreground select-none">Tap outside or press Esc to close</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                  {/* Panel art column */}
                  <div className="flex flex-col items-center gap-2 sm:shrink-0">
                    <div style={{ width: 'var(--card-w)', height: 'var(--card-h)' }} className="rounded-xl overflow-hidden shadow-xl">
                      <LuminaryPanelArt luminaryId={selectedLuminary.id} width={BOARD_CARD_W} height={BOARD_CARD_H} claimed={false} />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/40">{selectedLuminary.domain ?? 'Luminary'}</span>
                    {/* Live aura animation preview — click to expand full-screen */}
                    {(() => {
                      const previewVis = getLuminaryVisuals(selectedLuminary.id);
                      const previewVariant = AURA_VARIANTS[previewVis.auraStyle];
                      return (
                        <button
                          type="button"
                          title="Preview aura"
                          aria-label="Preview aura full screen"
                          onClick={() => setAuraPreviewLuminaryId(selectedLuminary.id)}
                          className="relative rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer group"
                          style={{ width: 76, height: 38, background: '#06060f', boxShadow: `inset 0 0 0 1px ${previewVis.primaryColor}22` }}
                        >
                          <div
                            className={previewVariant.idleClass}
                            style={{
                              position: 'absolute',
                              inset: -10,
                              borderRadius: 18,
                              background: `radial-gradient(${previewVariant.gradientShape}, ${previewVis.primaryColor}bb 0%, ${previewVis.primaryColor}55 44%, ${previewVis.primaryColor}1a 68%, transparent 86%)`,
                            }}
                          />
                          {/* Expand hint shown on hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                               style={{ background: 'rgba(0,0,0,0.45)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                              <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                          </div>
                        </button>
                      );
                    })()}
                    {(() => {
                      const claimer = safePlayers.find(p => (p.claimedLuminaryIds ?? []).includes(selectedLuminary.id));
                      return claimer ? (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                          Claimed · {claimer.playerName}
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400/70 border border-amber-500/15">
                          Unclaimed
                        </span>
                      );
                    })()}
                  </div>
                  {/* Right column: flavor + requirements */}
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Flavor text */}
                    {selectedLuminary.flavor && (
                      <p className="text-[11px] text-muted-foreground italic leading-relaxed">"{selectedLuminary.flavor}"</p>
                    )}
                    {/* Effect description */}
                    {(selectedLuminary.effectName || selectedLuminary.effectDescription) && (
                      <div className="rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                        {selectedLuminary.effectName && (
                          <span className="block text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: getLuminaryVisuals(selectedLuminary.id).primaryColor }}>
                            {selectedLuminary.effectName}
                          </span>
                        )}
                        {selectedLuminary.effectDescription && (
                          <p className="text-[11px] text-white/75 leading-relaxed">{selectedLuminary.effectDescription}</p>
                        )}
                      </div>
                    )}
                    {/* Artifact requirements */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Artifacts Required</span>
                      <div className="flex flex-wrap gap-1.5">
                        {CRYSTALS.map((c) => {
                          const req = selectedLuminary.requirements[c as keyof CrystalCounts];
                          if (!req || req <= 0) return null;
                          const meta = GEM_META[c];
                          const bonus = me?.bonuses?.[c as keyof CrystalCounts] ?? 0;
                          const have = Math.min(req, bonus);
                          const short = Math.max(0, req - bonus);
                          const isMet = short === 0;
                          return (
                            <div
                              key={c}
                              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${isMet ? 'bg-green-900/40 text-green-300' : 'bg-black/40 text-white/80'}`}
                              style={{ border: `1px solid ${isMet ? 'rgba(74,222,128,0.35)' : `${meta.glowHex}55`}`, boxShadow: isMet ? 'none' : `0 0 8px ${meta.glowHex}33` }}
                            >
                              <MiniGem color={c} size={13} />
                              <span style={{ color: isMet ? undefined : meta.glowHex, textShadow: isMet ? undefined : `0 0 6px ${meta.glowHex}88` }}>{req}</span>
                              <span className="text-[9px] font-medium text-white/50">{meta.name}</span>
                              {isMet && <span className="text-green-400 text-[9px] ml-0.5">✓</span>}
                              {!isMet && bonus > 0 && <span className="text-white/35 text-[8px]">({have}/{req})</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Eminence reward */}
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-amber-950/30 border border-amber-500/20">
                      <EminenceDiamond size={16} />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/60">Eminence Reward</span>
                        <span className="flex items-center gap-1 text-sm font-bold text-amber-200">+{selectedLuminary.lumens}<EminenceDiamond size={10} /></span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" className="w-full text-muted-foreground focus-visible:outline-none focus-visible:ring-0" onClick={() => setSelectedLuminary(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Deck Reserve Sheet ── */}
      {/* Shown when the player taps a face-down deck pile.                    */}
      {/* Gives a clear confirmation buffer before committing the blind draw.  */}
      <AnimatePresence>
        {selectedDeckTier !== null && (() => {
          const deckTier = selectedDeckTier;
          const deckCount = deckTier === 1 ? (state?.deckCounts.tier1 ?? 0)
            : deckTier === 2 ? (state?.deckCounts.tier2 ?? 0)
            : (state?.deckCounts.tier3 ?? 0);
          const tierLore = deckTier === 3
            ? 'Sovereigns & absolutes — apex relics that bend the cosmos to your will'
            : deckTier === 2
            ? 'Forged instruments — crucibles and sigils of focused cosmic mastery'
            : 'Fragments & sparks — raw nascent shards that seed any engine';
          const canReserve = isMyTurnForCoreAction && !!me && canReserveMore(me);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-end"
              onClick={closeDeckSheet}
            >
              <motion.div style={{ opacity: deckSheetBackdropOpacity }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                style={{ scale: deckSheetScale }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl p-5 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
                ref={(el) => { deckSheetContainerRef.current = el; }}
                role="dialog"
                aria-modal="true"
                aria-label="Reserve from deck"
                {...deckSheetDragProps}
              >
                {/* Drag handle */}
                <div {...deckSheetHandleBarProps} className="flex flex-col items-center -mt-2 mb-2 gap-1">
                  <div className="w-10 h-1 rounded-full bg-border" />
                  <SwipeHintBar peekProgress={deckSheetPeekProgress} />
                </div>
                {/* Compact peek header — always visible when the sheet is in the 40 % peek position.
                    Shows the tier title and close button so the sheet is identifiable at a glance. */}
                <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-3">
                  <span className="font-semibold text-sm leading-tight flex-1 truncate">
                    Tier {deckTier} Deck
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{deckCount} remaining</span>
                  <kbd className="hidden [@media(pointer:fine)]:inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground/40 border border-border/30 bg-muted/10 leading-none select-none">Esc</kbd>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 focus-visible:outline-none focus-visible:ring-0"
                    aria-label="Close deck sheet"
                    onClick={closeDeckSheet}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* Scrollable body: enables dismiss-from-content when at scrollTop=0 */}
                <div
                  {...deckSheetScrollableProps}
                  className="overflow-y-auto max-h-[75vh]"
                  style={isTutorial ? { paddingBottom: 'var(--tutorial-panel-height, 160px)' } : undefined}
                >
                {/* Header row: large card back + tier info */}
                <div className="flex gap-4 mb-5">
                  {/* Larger preview — 3× the sm size, matching md width */}
                  <div className="w-[var(--card-w)] h-[var(--card-h)] relative rounded-xl overflow-hidden border border-[#c4a85a]/40 shadow-lg bg-[#030509] shrink-0">
                    {deckTier === 1 && <CardBackTier1 />}
                    {deckTier === 2 && <CardBackTier2 />}
                    {deckTier === 3 && <CardBackTier3 />}
                  </div>
                  <div className="flex-1 flex flex-col gap-2 justify-center">
                    <div className="font-bold text-base leading-tight">Tier {deckTier} Artifact</div>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      "{tierLore}"
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {deckCount} card{deckCount !== 1 ? 's' : ''} remaining in this deck.
                      You will receive one at random — the card is hidden until encrypted.
                    </p>
                    {me && !canReserveMore(me) && (
                      <p className="text-xs font-semibold text-destructive">
                        Encrypted pile full — forge or spend an encrypted card first.
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div
                  className="flex flex-col gap-2.5 rounded-xl transition-all duration-300"
                  style={{
                    border: sentFlashBtn === 'deck_reserve'
                      ? '1.5px solid #6ee7b7'
                      : '1.5px solid transparent',
                    boxShadow: sentFlashBtn === 'deck_reserve'
                      ? '0 0 0 2px #6ee7b733, 0 0 14px 2px #34d39922'
                      : 'none',
                  }}
                >

                  {/* ── Reserve now (active turn) ── */}
                  {isMyTurnForCoreAction && (
                    <div className="relative">
                      <AnimatePresence>
                        {showDeckReserveHint && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 6, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            onClick={dismissDeckReserveHint}
                            className="absolute bottom-full mb-1.5 left-0 max-w-[calc(100vw-3rem)] whitespace-normal flex items-center gap-1 bg-black/80 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg backdrop-blur-sm z-10"
                            title="Dismiss hint"
                          >
                            <span className="h-2.5 w-2.5 inline-flex items-center justify-center shrink-0 opacity-60"><CipherSigil affinityHex="#e2e8f0" id={9004} /></span>
                            <span>Tap twice to confirm — you'll receive a random hidden card</span>
                            <span className="text-white/40 ml-0.5">✕</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <EncryptButton
                        disabled={!canReserve}
                        isPending={pendingDeckConfirm}
                        isSent={sentFlashBtn === 'deck_reserve'}
                        sigilId={9005}
                        label={pendingDeckConfirm ? 'CONFIRM' : 'ENCRYPT'}
                        subtitle={pendingDeckConfirm ? 'Tap to reserve hidden' : (canReserve ? 'Hidden Card' : 'Encrypted pile full')}
                        onClick={() => {
                          if (pendingDeckConfirm) {
                            gameAudio.playButtonConfirm();
                            handleReserveDeck(deckTier);
                            flashSent('deck_reserve');
                            setTimeout(() => closeDeckSheet(), 750);
                          } else {
                            gameAudio.playButtonSelect();
                            setPendingDeckConfirm(true);
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* ── Plan: reserve from deck (off-turn) ── */}
                  {canPlan && !isMyTurnForCoreAction && !coreActionSubmitted && me && canReserveMore(me) && (
                    <motion.div
                      whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                      style={{ borderRadius: '0.75rem' }}
                    >
                      <Button
                        className={`w-full h-12 text-base font-bold transition-all duration-150 border-0 text-[#D8D4FF]
                          ${pendingDeckConfirm
                            ? ''
                            : 'hover:brightness-110'
                          }`}
                        style={pendingDeckConfirm
                          ? { background: '#131322', boxShadow: '0 0 0 2px rgba(210,200,255,0.85), 0 0 18px rgba(200,180,255,0.50)' } as React.CSSProperties
                          : { background: 'linear-gradient(160deg, #0d0d12 0%, #121220 55%, #0a0a10 100%)', boxShadow: '0 0 0 1px rgba(200,190,255,0.22), 1px 0 0 0 rgba(255,100,60,0.18), -1px 0 0 0 rgba(60,100,255,0.18), inset 0 1px 0 rgba(220,210,255,0.08)' }}
                        onClick={() => {
                          if (pendingDeckConfirm) {
                            gameAudio.playButtonConfirm();
                            handlePlanAction({ type: 'reserve_card', tier: deckTier, _tier: deckTier });
                            closeDeckSheet();
                          } else {
                            gameAudio.playButtonSelect();
                            setPendingDeckConfirm(true);
                          }
                        }}
                      >
                        <span className="h-5 w-5 mr-2 inline-flex items-center justify-center shrink-0"><CipherSigil affinityHex="#e2e8f0" id={9006} /></span>
                        {pendingDeckConfirm ? 'Confirm: Plan Encrypt' : 'Plan: Encrypt Hidden Card'}
                      </Button>
                    </motion.div>
                  )}

                  {/* ── Waiting — Luminary cutscene blocking ── */}
                  {!isMyTurn && !canPlan && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      <AlertCircle className="inline h-4 w-4 mr-1" />
                      Waiting for Luminary summon…
                    </p>
                  )}

                  <Button variant="ghost" className="w-full text-muted-foreground focus-visible:outline-none focus-visible:ring-0" onClick={closeDeckSheet}>
                    Close
                  </Button>
                </div>
                </div>{/* end scrollable body */}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Card Action Burst — full or abridged Forge Animation ── */}
      <AnimatePresence>
        {cardActionBurst && (abridgedAnims ? (
          <AbridgedForgeAnimation
            key={cardActionBurst.key}
            animKey={cardActionBurst.key}
            card={cardActionBurst.card}
            tier={cardActionBurst.tier}
            startRect={cardActionBurst.startRect}
            destPos={cardActionBurst.destPos}
            ownerName={cardActionBurst.playerName}
            onComplete={() => {
              const el = document.querySelector('[data-nav-hand]');
              const r = el?.getBoundingClientRect();
              if (r) {
                const glowColor = GEM_META[cardActionBurst.card.bonusColor as GemKey]?.glowHex ?? '#C0A472';
                setHandTabAbsorbFlash({
                  key: Date.now(),
                  pos: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
                  color: glowColor,
                });
                setTimeout(() => setHandTabAbsorbFlash(null), 700);
              }
            }}
          />
        ) : (
          <ForgeAnimation
            key={cardActionBurst.key}
            animKey={cardActionBurst.key}
            card={cardActionBurst.card}
            tier={cardActionBurst.tier}
            startRect={cardActionBurst.startRect}
            destPos={cardActionBurst.destPos}
            spentColors={cardActionBurst.spentColors}
            lumens={cardActionBurst.lumens}
            gotFlux={cardActionBurst.gotFlux}
            playerName={cardActionBurst.playerName}
            isCompact={marketCompact}
          />
        ))}
      </AnimatePresence>


      {/* ── Opponent Forge — stamp+fly or abridged direct shrink ── */}
      <AnimatePresence>
        {opponentForgeAbsorb && (abridgedAnims ? (
          <AbridgedForgeAnimation
            key={opponentForgeAbsorb.key}
            animKey={opponentForgeAbsorb.key}
            card={opponentForgeAbsorb.card}
            tier={opponentForgeAbsorb.tier}
            startRect={opponentForgeAbsorb.startRect}
            destPos={opponentForgeAbsorb.chipCenter}
            ownerName={opponentForgeAbsorb.ownerName}
          />
        ) : (
          <OpponentForgeAnimation
            key={opponentForgeAbsorb.key}
            animKey={opponentForgeAbsorb.key}
            card={opponentForgeAbsorb.card}
            tier={opponentForgeAbsorb.tier}
            startRect={opponentForgeAbsorb.startRect}
            chipCenter={opponentForgeAbsorb.chipCenter}
            ownerName={opponentForgeAbsorb.ownerName}
            spentColors={opponentForgeAbsorb.spentColors}
            isCompact={marketCompact}
          />
        ))}
      </AnimatePresence>

      {/* ── Cipher Aperture Burst — Encrypt / Reserve from market ── */}
      {cipherBurst && (abridgedAnims ? (
        <AbridgedForgeAnimation
          key={cipherBurst.key}
          animKey={cipherBurst.key}
          card={cipherBurst.card}
          tier={cipherBurst.tier}
          startRect={cipherBurst.sourceRect}
          destPos={cipherBurst.destPos}
          ownerName={cipherBurst.ownerName}
          onComplete={() => {
            if (cipherBurstIsDeckRef.current) {
              setSingularityAbsorbKey(k => k + 1);
              cipherBurstIsDeckRef.current = false;
            }
            setCipherBurst(null);
          }}
        />
      ) : (
        <CipherApertureAnimation
          animKey={cipherBurst.key}
          mode="game"
          sourceRect={cipherBurst.sourceRect}
          affinityHex={cipherBurst.affinityHex}
          cardName={cipherBurst.cardName}
          cardFace={<ArtifactCardView card={cipherBurst.card} tier={cipherBurst.tier} />}
          gotFlux={cipherBurst.gotFlux}
          destPos={cipherBurst.destPos}
          ownerName={cipherBurst.ownerName}
          skipForefront={true}
          onComplete={() => {
            if (cipherBurstIsDeckRef.current) {
              setSingularityAbsorbKey(k => k + 1);
              cipherBurstIsDeckRef.current = false;
            }
            // Delay unmount so the arrival label can linger and fade after the
            // pulse ring completes (ARRIVAL_LABEL_LINGER_MS + 220ms fade).
            setTimeout(() => setCipherBurst(null), ARRIVAL_LABEL_LINGER_MS + 220);
          }}
        />
      ))}

      {/* ── Deal-from-Deck overlay — card flies from deck tile to empty slot ── */}
      {dealingCard && (() => {
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9050, pointerEvents: 'none', perspective: '1200px' }}>
            <motion.div
              key={dealingCard.card.id}
              style={{
                position: 'absolute',
                left: dealingCard.deckRect.x,
                top: dealingCard.deckRect.y,
                width: dealingCard.deckRect.w,
                height: dealingCard.deckRect.h,
                transformStyle: 'preserve-3d',
              }}
              initial={{ x: 0, y: 0, rotateY: 0, scale: 1 }}
              animate={{
                x: dealingCard.animX,
                y: dealingCard.animY,
                rotateY: dealingCard.animRotateY,
                scale: dealingCard.animScale,
              }}
              transition={{
                duration: 1.5,
                x: { ease: 'easeInOut', times: [0, 0.4, 1] },
                y: { ease: 'easeInOut', times: [0, 0.35, 1] },
                rotateY: { ease: 'easeInOut', times: [0, 0.5, 1] },
                scale: { ease: 'easeInOut', times: [0, 0.35, 1] },
              }}
              onAnimationComplete={() => {
                setDealingCard(null);
                setHiddenSlots(new Set());
              }}
            >
              {/* Card back — fills container via w-full/h-full */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                overflow: 'hidden',
                borderRadius: 12,
              }}>
                <div className="w-full h-full relative rounded-xl bg-[#030509] border border-[#c4a85a]/30">
                  {dealingCard.tier === 1 && <CardBackTier1 />}
                  {dealingCard.tier === 2 && <CardBackTier2 />}
                  {dealingCard.tier === 3 && <CardBackTier3 />}
                </div>
              </div>
              {/* Card face — revealed after half-flip, scaled to fit container */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                overflow: 'hidden',
                borderRadius: 12,
              }}>
                <div style={{ transformOrigin: 'top left', transform: `scale(${dealingCard.faceScale})` }}>
                  <ArtifactCardView
                    card={dealingCard.card}
                    tier={dealingCard.tier}
                    onTap={() => {}}
                    tapped={false}
                    effectiveCosts={computeCosts(dealingCard.card, costMode)}
                    hideStrike={costMode === 'needed_now'}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* ── Purchase Celebration Burst (reserved card purchases only) ── */}
      <AnimatePresence>
        {purchaseBurst && (
          <motion.div
            key={purchaseBurst.key}
            className="pointer-events-none fixed inset-0 z-[9050] flex items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
          >
            {/* Expanding ring */}
            <motion.div
              className="absolute rounded-full border-2 border-primary"
              initial={{ width: 60, height: 60, opacity: 0.9 }}
              animate={{ width: 340, height: 340, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute rounded-full border border-primary/50"
              initial={{ width: 40, height: 40, opacity: 0.7 }}
              animate={{ width: 240, height: 240, opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut', delay: 0.08 }}
            />
            {/* Floating label */}
            <motion.div
              className="flex flex-col items-center gap-1"
              initial={{ y: 0, opacity: 1, scale: 0.8 }}
              animate={{ y: -80, opacity: 0, scale: 1.1 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              <span className="text-3xl font-serif font-black text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
                Forged!
              </span>
              {purchaseBurst.lumens > 0 && (
                <span className="flex items-center gap-1.5 text-lg font-bold" style={{ color: GEM_META.flux.hex }}>
                  <EminenceDiamond size={16} /> +{purchaseBurst.lumens} eminence
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Gem Pickup Burst ── */}
      <AnimatePresence>
        {gemBurst && (() => {
          const burstDuration = (gemBurst.gems.length - 1) * 0.78 + 1.25 + 0.5 + 0.05;
          const avatarFadeIn = 0.5 / burstDuration;
          const avatarVisible = 0.55 / burstDuration;
          return (
          <motion.div
            key={gemBurst.key}
            className="pointer-events-none fixed inset-0 z-[9050] flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            />
            <div className="relative h-72 w-[18rem]">
              {gemBurstView.map(({ gem, index, x, delay }) => {
                return (
                  <motion.div
                    key={`${gemBurst.key}-${gem}-${index}`}
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, rotateY: 0, scale: 0.4, x: 0, y: 64 }}
                    animate={{
                      opacity: [0, 0, 1, 1, 0],
                      rotateY: [0, 180, 360, 540, 720],
                      scale: [0.4, 0.68, 1.12, 1.02, 0.9],
                      x: [0, x * 0.35, x * 0.95, x, x],
                      y: [64, 18, 0, -6, -18],
                    }}
                    transition={{ duration: 1.25, delay, times: [0, 0.18, 0.46, 0.74, 1] }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-black/50 p-2 shadow-[0_0_24px_rgba(255,255,255,0.2)]">
                        <MiniGem color={gem} size={52} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GEM_META[gem].glowHex }}>
                        {GEM_META[gem].shortName}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              className="fixed left-0 right-0 flex flex-col items-center gap-2"
              style={{ bottom: '22%' }}
              initial={{ opacity: 0, scale: 0.5, y: 16 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.05, 1, 0.96], y: [16, 0, 0, -8] }}
              transition={{ duration: burstDuration, times: [0, avatarFadeIn, avatarVisible + (1 - avatarVisible) * 0.75, 1] }}
            >
              <div
                className="rounded-full overflow-hidden border-4 shadow-[0_0_24px_rgba(99,102,241,0.35)]"
                style={{ width: 64, height: 64, borderColor: 'rgba(99,102,241,0.45)' }}
              >
                <img
                  src={getAvatarForPlayer(gemBurst.avatarId ?? session.avatarId).image}
                  alt={gemBurst.playerName}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              <div className="rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur">
                {gemBurst.playerName}
              </div>
              <span className="text-lg font-serif font-bold text-emerald-300 drop-shadow-[0_0_12px_rgba(110,231,183,0.7)]">
                Harnessed
              </span>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Turn Announcement Overlay ──
           Intentionally inert for keyboard purposes: this is a transient, timed
           notification with no focusable elements.  Users can click anywhere to
           dismiss early, but it auto-dismisses on a timer regardless.  A focus
           trap would steal focus from nothing and then fail to restore it cleanly
           when the overlay exits mid-animation. */}
      <AnimatePresence>
        {turnAnnouncement && (
          <motion.div
            key={turnAnnouncement.key}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ pointerEvents: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse 70% 55% at 50% 50%, ${hexRgba(turnAnnouncement.accentColor, turnAnnouncement.isYou ? 0.28 : 0.14)} 0%, rgba(0,0,0,0.55) 70%)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative flex flex-col items-center gap-3"
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: [0.5, 1.08, 1], opacity: [0, 1, 1], y: [20, -4, 0] }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.16 } }}
              transition={{ duration: 0.5, times: [0, 0.6, 1], ease: 'easeOut' }}
            >
              <motion.div
                className="rounded-full overflow-hidden border-4 shadow-lg"
                style={{
                  width: 80, height: 80,
                  borderColor: hexRgba(turnAnnouncement.accentColor, 0.7),
                  boxShadow: `0 0 40px ${hexRgba(turnAnnouncement.accentColor, 0.45)}, 0 0 80px ${hexRgba(turnAnnouncement.accentColor, 0.18)}`,
                }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.2, repeat: 0 }}
              >
                <img
                  src={getAvatarForPlayer(turnAnnouncement.avatarId).image}
                  alt={turnAnnouncement.playerName}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </motion.div>
              <div className="flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 shrink-0" style={{ color: turnAnnouncement.accentColor }} />
                <span className="text-sm font-semibold text-white">{turnAnnouncement.eminence} ✦</span>
              </div>
              <motion.span
                className="text-2xl font-serif font-bold tracking-wide"
                style={{
                  color: turnAnnouncement.isYou ? turnAnnouncement.accentColor : 'rgba(255,255,255,0.85)',
                  textShadow: `0 0 16px ${hexRgba(turnAnnouncement.accentColor, 0.7)}`,
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                {turnAnnouncement.isYou ? 'Your Turn' : `${turnAnnouncement.playerName}'s Turn`}
              </motion.span>
              {state?.turnDeadline != null && (
                <motion.div
                  className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white/70 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                >
                  <TurnCountdown deadline={state.turnDeadline} active={turnAnnouncement.isYou} />
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BaseDialog
        open={showEminenceBreakdown}
        onClose={() => setShowEminenceBreakdown(false)}
        title="Eminence breakdown"
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-white/70">Artifacts</span>
            <span className="font-bold text-white">+{eminenceBreakdown.artifacts}</span>
          </div>
          {eminenceBreakdown.luminaries > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
              <span className="text-white/70">Luminaries</span>
              <span className="font-bold text-white">+{eminenceBreakdown.luminaries}</span>
            </div>
          )}
          {eminenceBreakdown.oblivionRows.map(row => (
            <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg bg-red-950/40 border border-red-900/40 px-3 py-2">
              <span className="text-red-300/80">{row.name}</span>
              <span className="font-bold text-red-400">\u2212{row.amount} to all</span>
            </div>
          ))}
          {eminenceBreakdown.other > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
              <span className="text-white/70">Other</span>
              <span className="font-bold text-white">+{eminenceBreakdown.other}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
            <span className="text-primary/80">Total</span>
            <span className="flex items-center gap-1 font-bold text-primary">{me?.lumens ?? 0}<EminenceDiamond size={11} /></span>
          </div>
        </div>
      </BaseDialog>

      {/* ── Rules Sheet ── */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => setShowRules(false)}
          >
            <motion.div style={{ opacity: rulesSheetBackdropOpacity }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              ref={(el) => { rulesSheetContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label="How to play"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ scale: rulesSheetScale }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
              {...rulesSheetDragProps}
            >
              {/* Handle bar */}
              <div {...rulesSheetHandleBarProps} className="flex flex-col items-center pt-3 pb-1 gap-1">
                <div className="w-10 h-1 rounded-full bg-border" />
                <SwipeHintBar />
              </div>
              <div className="px-5 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold">How to Play</h2>
                <div className="flex items-center gap-1.5">
                  <kbd className="hidden [@media(pointer:fine)]:inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground/40 border border-border/30 bg-muted/10 leading-none select-none">Esc</kbd>
                  <Button variant="ghost" size="icon" className="h-8 w-8 focus-visible:outline-none focus-visible:ring-0" onClick={() => setShowRules(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div {...rulesSheetScrollableProps} className="px-5 overflow-y-auto max-h-[60vh] space-y-4 pb-4">
                {[
                  {
                    icon: '💎',
                    title: 'Goal',
                    body: 'Be the first to reach 15 eminence. The round completes so every player gets equal turns, then the highest score wins.',
                  },
                  {
                    icon: '🪙',
                    title: 'On your turn — pick one action',
                    body: 'Harness up to 3 affinities (1 of each type) · Harness 2 of the same (needs 4+ in the well) · Encrypt a card (hold up to 3, gain 1 Singularity) · Forge a card you can afford',
                  },
                  {
                    icon: '🃏',
                    title: 'Cards & bonuses',
                    body: 'Each forged card gives a permanent affinity discount (bonus) of its type. Pay the cost in affinities, using bonuses first. Singularity acts as a wild card for any shortfall.',
                  },
                  {
                    icon: '✨',
                    title: 'Eminence',
                    body: 'Some cards award eminence when forged. Luminaries (the top row) grant bonus eminence to the first player whose bonuses meet their requirements — claimed automatically.',
                  },
                  {
                    icon: '✋',
                    title: 'Affinity limit',
                    body: 'You may hold at most 10 affinities at end of turn. You may hold at most 3 encrypted cards at once.',
                  },
                ].map(({ icon, title, body }) => (
                  <div key={title} className="flex gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <div className="font-semibold text-sm mb-0.5">{title}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
                {/* Hints toggle */}
                <div className="mt-2 pt-4 border-t border-border/50 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">In-game hints</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Show tips for undo, encrypt, and forge the first time you use them.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleHints}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${hintsEnabled ? 'bg-primary' : 'bg-secondary'}`}
                    aria-label={hintsEnabled ? 'Hints on — tap to turn off' : 'Hints off — tap to turn on'}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${hintsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
                {/* Deck position toggle */}
                <div className="mt-2 pt-4 border-t border-border/50 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">Deck pile position</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Show the draw deck at the {deckPosition === 'left' ? 'left (current)' : 'right (current)'} of each tier row in The Forge.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-border/50 p-0.5 shrink-0">
                    {(['left', 'right'] as const).map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => { if (deckPosition !== pos) toggleDeckPosition(); }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors ${deckPosition === pos ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Keyboard shortcut legend */}
                <div className="mt-2 pt-4 border-t border-border/50">
                  <div className="font-semibold text-sm mb-2">Keyboard shortcuts</div>
                  <p className="text-xs text-muted-foreground mb-3">Active when no panel is open and focus is not in a text field.</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {([
                      ['B', 'Board view'],
                      ['H', 'Hand view'],
                      ['L', 'Log view'],
                      ['R', 'Encrypted cards'],
                      ['F', 'Forged cards'],
                      ['?', 'This rules sheet'],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono font-semibold text-foreground/80 leading-none shrink-0">
                          {key}
                        </kbd>
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reserved Cards Overlay ── */}
      <AnimatePresence>
        {showReservedOverlay && me && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => setShowReservedOverlay(false)}
          >
            <motion.div style={{ opacity: reservedSheetBackdropOpacity }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              ref={(el) => { reservedOverlayContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label="Encrypted cards"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ scale: reservedSheetScale }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
              {...reservedSheetDragProps}
            >
              <div {...reservedSheetHandleBarProps} className="flex flex-col items-center pt-3 pb-1 gap-1">
                <div className="w-10 h-1 rounded-full bg-border" />
                <SwipeHintBar peekProgress={reservedSheetPeekProgress} />
              </div>
              {/* Compact peek header — identifiable while sheet is in 40 % peek position */}
              <div className="px-5 pb-2 flex items-center justify-between border-b border-border/40 mb-1">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <span className="h-4 w-4 inline-flex items-center justify-center shrink-0 opacity-70"><CipherSigil affinityHex="#e2e8f0" id={9007} /></span>
                  Encrypted Artifacts ({me.reservedCards.length}/3)
                </h2>
                <div className="flex items-center gap-1.5">
                  <kbd className="hidden [@media(pointer:fine)]:inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground/40 border border-border/30 bg-muted/10 leading-none select-none">Esc</kbd>
                  <Button variant="ghost" size="icon" className="h-7 w-7 focus-visible:outline-none focus-visible:ring-0" onClick={() => setShowReservedOverlay(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div
                {...reservedSheetScrollableProps}
                className="px-5 overflow-y-auto max-h-[60vh] pb-4"
                style={isTutorial ? { paddingBottom: 'var(--tutorial-panel-height, 160px)' } : undefined}
              >
                {me.reservedCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No cards encrypted.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {me.reservedCards.map((c) => {
                      const ec = computeCosts(c, costMode);
                      const ecBonus = computeCosts(c, 'after_bonuses') ?? undefined;
                      const canBuy = canAffordCard(c, me);
                      return (
                        <button
                          key={c.id}
                          data-reserved-card-id={c.id}
                          type="button"
                          className="flex gap-3 items-center bg-secondary/30 hover:bg-secondary/50 active:bg-secondary/60 rounded-2xl p-3 w-full text-left transition-colors"
                          onClick={() => {
                            setShowReservedOverlay(false);
                            openCardSheet(c, true);
                          }}
                        >
                          <div className="relative shrink-0">
                            <ArtifactCardView
                              card={c}
                              tier={c.tier}
                              effectiveCosts={ec}
                              bonusCosts={ecBonus}
                              tapped={false}
                              hideStrike={costMode === 'needed_now'}
                            />
                            {state?.marketMarkers?.[c.id] && (
                              <>
                                <CardKeywordOverlay type={state.marketMarkers[c.id].type as 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed'} />
                                <CardMarkerBadge type={state.marketMarkers[c.id].type as 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed'} />
                              </>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                            <div className="font-bold text-sm leading-tight">{c.name}</div>
                            <div className="flex items-center gap-1.5">
                              <MiniGem color={c.bonusColor as GemKey} size={13} />
                              <span className="text-xs text-muted-foreground">{GEM_META[c.bonusColor as GemKey]?.name ?? c.bonusColor} bonus</span>
                              {(c.lumens ?? 0) > 0 && (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="flex items-center gap-0.5 text-xs font-bold text-white">{c.lumens}<EminenceDiamond size={9} /></span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {canBuy
                                ? <span className="text-[10px] font-semibold text-emerald-400">Can forge</span>
                                : <span className="text-[10px] text-muted-foreground/60">Tap to view</span>
                              }
                              <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Forged Cards Overlay ── */}
      <AnimatePresence>
        {showForgedOverlay && me && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => { setShowForgedOverlay(false); setForgedFilter(null); }}
          >
            <motion.div style={{ opacity: forgedSheetBackdropOpacity }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              ref={(el) => { forgedOverlayContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label="Forged artifacts"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ scale: forgedSheetScale }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]"
              {...forgedSheetDragProps}
            >
              <div {...forgedSheetHandleBarProps} className="flex flex-col items-center pt-3 pb-1 gap-1">
                <div className="w-10 h-1 rounded-full bg-border" />
                <SwipeHintBar peekProgress={forgedSheetPeekProgress} />
              </div>
              {/* Compact peek header — identifiable while sheet is in 40 % peek position */}
              <div className="px-5 pb-2 flex items-center justify-between border-b border-border/40 mb-1">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {forgedFilter
                    ? <>{GEM_META[forgedFilter].name} Artifacts</>
                    : <>Forged Artifacts ({me.purchasedCards?.length ?? 0})</>
                  }
                </h2>
                <div className="flex items-center gap-1">
                  {forgedFilter && (
                    <button
                      type="button"
                      onClick={() => setForgedFilter(null)}
                      className="text-[10px] text-muted-foreground underline underline-offset-2 px-2 py-1"
                    >
                      show all
                    </button>
                  )}
                  <kbd className="hidden [@media(pointer:fine)]:inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground/40 border border-border/30 bg-muted/10 leading-none select-none">Esc</kbd>
                  <Button variant="ghost" size="icon" className="h-7 w-7 focus-visible:outline-none focus-visible:ring-0" aria-label="Close forged artifacts" onClick={() => { setShowForgedOverlay(false); setForgedFilter(null); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {/* Color filter pills — single-line horizontally-scrollable row.
                  overflow-x-auto whitespace-nowrap keeps all pills on one line so the
                  header height is always fixed regardless of how many affinity types are
                  forged. axis:'horizontal' in forgedPillsScrollableProps sets pan-x touch
                  action (native swipe-to-scroll) and only intercepts downward drags for
                  the sheet; horizontal scroll position is preserved across peek↔open. */}
              <div {...forgedPillsScrollableProps} className="px-5 pb-2 overflow-x-auto whitespace-nowrap flex gap-1.5">
                {CRYSTALS.filter(c => c !== 'flux').map((c) => {
                  const count = (me.purchasedCards ?? []).filter(card => card.bonusColor === c).length;
                  if (count === 0) return null;
                  const meta = GEM_META[c as GemKey];
                  const active = forgedFilter === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForgedFilter(active ? null : c as GemKey)}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 transition-all"
                      style={{
                        background: active ? `${meta.hex}CC` : 'rgba(0,0,0,0.35)',
                        border: `1.5px solid ${active ? meta.hex : meta.hex + '55'}`,
                      }}
                    >
                      <MiniGem color={c as GemKey} size={11} />
                      <span className="text-[11px] font-bold" style={{ color: active ? '#fff' : meta.glowHex }}>×{count}</span>
                    </button>
                  );
                })}
              </div>
              {/* Cards / Timeline toggle */}
              <div className="px-5 pb-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setForgedView('cards')}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${forgedView === 'cards' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setForgedView('timeline')}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${forgedView === 'timeline' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Timeline
                </button>
              </div>
              <div {...forgedBodyScrollableProps} className="px-5 overflow-y-auto max-h-[55vh] pb-4">
                {forgedView === 'cards' ? (() => {
                  const cards = forgedFilter
                    ? (me.purchasedCards ?? []).filter(card => card.bonusColor === forgedFilter)
                    : (me.purchasedCards ?? []);
                  return cards.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {forgedFilter ? `No ${GEM_META[forgedFilter].name} artifacts forged yet.` : 'No cards forged yet.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {cards.map((c) => (
                        <ForgedCardWithTooltip key={c.id} card={c} tier={c.tier} onOpenSheet={() => openForgedCardSheet(c)} />
                      ))}
                    </div>
                  );
                })() : (
                  <div className="flex flex-col divide-y divide-border/30">
                    {(me.purchasedCards ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No cards forged yet.</p>
                    ) : (me.purchasedCards ?? []).map((c, idx) => {
                      const snap = c.bonusesAtForge;
                      const snapKeys = snap
                        ? CRYSTALS.filter(k => k !== 'flux' && (snap[k as keyof CrystalCounts] ?? 0) > 0)
                        : [];
                      const bonusMeta = GEM_META[c.bonusColor as GemKey];
                      return (
                        <div key={c.id} className="flex items-center gap-3 py-2.5">
                          <span className="text-[11px] text-muted-foreground w-5 text-right shrink-0 tabular-nums">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground leading-tight truncate">{c.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {snapKeys.length > 0 ? snapKeys.map(k => (
                                <div key={k} className="flex items-center gap-0.5 bg-black/40 rounded px-1 py-0.5">
                                  <MiniGem color={k as GemKey} size={10} />
                                  <span className="text-[10px] font-bold text-white">×{snap![k as keyof CrystalCounts]}</span>
                                </div>
                              )) : (
                                <span className="text-[10px] text-muted-foreground italic">no snapshot</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-0.5 rounded-full px-2 py-0.5" style={{ background: (bonusMeta?.hex ?? '#888') + '22', border: `1px solid ${(bonusMeta?.hex ?? '#888')}44` }}>
                            <MiniGem color={c.bonusColor as GemKey} size={10} />
                            <span className="text-[10px] font-semibold" style={{ color: bonusMeta?.glowHex ?? '#fff' }}>+1</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Burn Pile Overlay ── */}
      <AnimatePresence>
        {showBurnPileOverlay && (
          <motion.div
            key="burn-pile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ opacity: burnPileSheetBackdropOpacity }}
            className="fixed inset-0 z-[95] bg-black/60"
            onClick={() => setShowBurnPileOverlay(false)}
          />
        )}
        {showBurnPileOverlay && (() => {
          const burnedIds: string[] = state.burnPile ?? [];
          const burnEvents: BurnEvent[] = state.burnEvents ?? [];
          const useBurnEvents = burnEvents.length > 0;
          const displayCount = useBurnEvents ? burnEvents.length : burnedIds.length;
          const tierLabel = (tier: number) => `T${tier}`;
          const tierColors: Record<number, string> = {
            1: 'text-amber-700/90 border-amber-700/40 bg-amber-900/20',
            2: 'text-slate-300/80 border-slate-400/40 bg-slate-700/20',
            3: 'text-yellow-300/90 border-yellow-500/40 bg-yellow-900/20',
          };
          return (
            <motion.div
              key="burn-pile-sheet"
              ref={(el) => { burnPileOverlayContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label="Burn Pile"
              initial={{ y: '100%' }}
              animate={{ y: '0%' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340, mass: 0.9 }}
              className="fixed bottom-0 left-0 right-0 z-[96] rounded-t-2xl flex flex-col"
              style={{ background: 'rgba(10,8,20,0.97)', border: '1px solid rgba(255,100,0,0.25)', maxHeight: '70vh', scale: burnPileSheetScale }}
              {...burnPileSheetDragProps}
            >
              {/* drag handle */}
              <div {...burnPileSheetHandleBarProps} className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              {/* header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-orange-500/15">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">🔥</span>
                  <span className="text-sm font-bold text-orange-300/90">Burned Artifacts</span>
                  <span className="text-xs text-muted-foreground">({displayCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="hidden [@media(pointer:fine)]:inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground/40 border border-border/30 bg-muted/10 leading-none select-none">Esc</kbd>
                  <Button variant="ghost" size="icon" className="h-7 w-7 focus-visible:outline-none focus-visible:ring-0" aria-label="Close burn pile" onClick={() => setShowBurnPileOverlay(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {/* body */}
              <div {...burnPileSheetScrollableProps} className="overflow-y-auto px-5 py-3 flex flex-col gap-0 divide-y divide-border/20">
                {displayCount === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No cards have been burned yet.</p>
                ) : useBurnEvents ? [...burnEvents].reverse().map((evt, idx) => {
                  const name = loreCatalog?.[evt.cardId]?.name ?? evt.cardId;
                  const sourceLum = (state.luminaries as Luminary[]).find(l => l.id === evt.sourceLuminaryId);
                  const tc = tierColors[evt.tier] ?? tierColors[1];
                  return (
                    <div key={`${evt.cardId}-${idx}`} className="flex items-center gap-2.5 py-2.5 min-w-0">
                      <span className="text-[11px] text-muted-foreground w-5 text-right shrink-0 tabular-nums">{idx + 1}</span>
                      <span className={`shrink-0 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold border leading-none tabular-nums ${tc}`}>
                        {tierLabel(evt.tier)}
                      </span>
                      <span className="text-xs font-semibold text-orange-200/80 leading-tight truncate min-w-0 flex-1">{name}</span>
                      {evt.turn != null && (
                        <span className="shrink-0 text-[10px] text-muted-foreground/40 leading-none tabular-nums">T{evt.turn}</span>
                      )}
                      {sourceLum && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground/70 leading-none max-w-[36%] truncate">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: sourceLum.summonColor }}
                          />
                          <span className="truncate">{sourceLum.name}</span>
                        </span>
                      )}
                    </div>
                  );
                }) : burnedIds.map((cardId, idx) => {
                  const name = loreCatalog?.[cardId]?.name ?? cardId;
                  return (
                    <div key={`${cardId}-${idx}`} className="flex items-center gap-3 py-2.5">
                      <span className="text-[11px] text-muted-foreground w-5 text-right shrink-0 tabular-nums">{idx + 1}</span>
                      <span className="text-xs font-semibold text-orange-200/80 leading-tight">{name}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Luminary Claim Order Picker ── */}
      {/* Shown whenever a player qualifies for multiple Luminaries simultaneously.
          Darkens the board and prompts the current player to choose order.
          For other players, shows a waiting banner. */}
      <AnimatePresence>
        {luminaryChoiceActive && !!pendingLuminaryChoice && state.status === 'playing' && (() => {
          const allLums = state.luminaries as Luminary[];
          const candidateLums = allLums.filter(l => pendingLuminaryChoice.candidates.includes(l.id));
          const choosingPlayer = (state.players as GamePlayerState[])
            .find(p => p.playerId === pendingLuminaryChoice.playerId);
          return (
            <LuminaryOrderPicker
              key="luminary-order-picker"
              candidates={candidateLums}
              isMyChoice={luminaryChoiceIsOurs}
              choosingPlayerName={choosingPlayer?.playerName ?? 'Another player'}
              roomId={roomId!}
              sessionToken={session.sessionToken}
            />
          );
        })()}
      </AnimatePresence>

      {/* ── Victory Cinematic ── */}
      <AnimatePresence>
        {state.status === 'finished' && !pendingGameOver && summonQueue.length === 0 && showCinematic && (() => {
          const winnerId = state.winnerId;
          if (!winnerId) return null;
          const winnerPlayer = (state.players as GamePlayerState[]).find(p => p.playerId === winnerId);
          if (!winnerPlayer) return null;
          const winnerCards = (winnerPlayer.purchasedCards ?? []) as ArtifactCard[];
          const winnerDiscountedIds = (winnerPlayer.discountedForgeIds ?? []) as string[];
          const winnerTier = getKardashevTier(winnerCards, winnerDiscountedIds);
          const winnerPalette = getDominantAffinityPalette(winnerCards);
          const winnerCivName = getCivilizationName(winnerPalette, winnerTier);
          const isLocalWinner = winnerId === session.playerId;
          const isSpectator = !state.players.some(p => p.playerId === session.playerId);
          const accolades = deriveAccolades(state, winnerId);
          return (
            <VictoryCinematic
              key="victory-cinematic"
              winnerName={winnerPlayer.playerName}
              isLocalWinner={isLocalWinner}
              isSpectator={isSpectator}
              civName={isLocalWinner ? civLabel : winnerCivName}
              tier={winnerTier}
              palette={winnerPalette}
              lumens={winnerPlayer.lumens}
              cardsForged={winnerCards.length}
              accolades={accolades}
              onDismiss={() => setShowCinematic(false)}
            />
          );
        })()}
      </AnimatePresence>

      {/* ── Return-to-Results banner (shown when board is visible after game over) ── */}
      {state.status === 'finished' && !pendingGameOver && summonQueue.length === 0 && !showCinematic && !showWinOverlay && (() => {
        const onReturnToResults = () => setShowWinOverlay(true);
        return (
          <ReturnResultsBanner
            key="return-banner"
            bannerRef={returnBannerRef}
            onReturn={onReturnToResults}
          />
        );
      })()}

      {/* ── Board-view action log panel (shown when viewing board after game over) ── */}
      {state.status === 'finished' && !pendingGameOver && summonQueue.length === 0 && !showCinematic && !showWinOverlay && (() => {
        const AFFINITY_DOT_COLOR: Record<string, string> = {
          Flare: '#FF5A3C',
          Continuum: '#3D6BFF',
          Verdance: '#2ECC71',
          Abyss: '#9C27B0',
          Radiance: '#DFC878',
        };
        const entries = [...(state.actionLog ?? [])].reverse();
        return (
          <div className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col" style={{ maxHeight: '45vh' }}>
            {/* Toggle header */}
            <button
              type="button"
              onClick={() => setShowBoardViewLog(v => !v)}
              className="flex items-center justify-between px-4 py-2.5 bg-black/88 backdrop-blur-sm border-t border-white/10 text-sm font-semibold text-foreground/70 hover:text-foreground/90 transition-colors select-none"
              aria-expanded={showBoardViewLog}
              aria-label={showBoardViewLog ? 'Collapse action history' : 'Expand action history'}
            >
              <span className="flex items-center gap-2">
                <List className="h-3.5 w-3.5 shrink-0" />
                Action History
                <span className="text-[10px] font-normal text-muted-foreground/60">({entries.length})</span>
              </span>
              {showBoardViewLog
                ? <ChevronDown className="h-4 w-4 shrink-0" />
                : <ChevronUp className="h-4 w-4 shrink-0" />}
            </button>

            {/* Scrollable log entries */}
            {showBoardViewLog && (
              <div
                className="overflow-y-auto divide-y divide-border/30 border-t border-border/20"
                style={{ background: 'rgba(4,2,14,0.90)', backdropFilter: 'blur(8px)' }}
              >
                {entries.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground italic text-center">No actions recorded.</div>
                ) : (
                  entries.map((entry, i) => {
                    const isMe = entry.playerId === session.playerId;
                    const logPlayer = state.players.find((pl) => pl.playerId === entry.playerId);
                    const isAffinityChange = entry.summary.startsWith('switched ');
                    const isCancelled = entry.summary.startsWith('planned move voided');
                    const affinityLabel = isAffinityChange ? (entry.summary.split(' to ').pop() ?? '') : '';
                    const dotColor = AFFINITY_DOT_COLOR[affinityLabel] ?? '#888';
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 px-3 py-2.5"
                        style={
                          isCancelled
                            ? { background: 'rgba(234,179,8,0.07)' }
                            : isAffinityChange
                            ? { background: `${dotColor}0D` }
                            : undefined
                        }
                      >
                        <PlayerAvatar
                          avatarId={logPlayer?.avatarId ?? (isMe ? session.avatarId : null)}
                          name={entry.playerName}
                          size={22}
                        />
                        <div className="text-xs leading-relaxed flex-1">
                          <span className={`font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>{entry.playerName}</span>
                          {isCancelled ? (
                            <>
                              <span className="text-yellow-400/80 italic"> · Planned move voided</span>
                              <span
                                className="inline-flex items-center justify-center ml-1.5 align-middle"
                                title={entry.summary.replace('planned move voided — ', '')}
                                style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.4)', flexShrink: 0 }}
                              >
                                <span style={{ fontSize: 9, lineHeight: 1, color: '#EAB308' }}>!</span>
                              </span>
                            </>
                          ) : isAffinityChange ? (
                            <>
                              <span className="text-foreground/70 italic"> · {entry.summary}</span>
                              <span className="inline-flex items-center gap-1 ml-1.5 align-middle" title={affinityLabel}>
                                <span
                                  className="inline-block rounded-full border border-white/20"
                                  style={{ width: 7, height: 7, background: dotColor, boxShadow: `0 0 4px ${dotColor}99` }}
                                />
                                <span style={{ color: dotColor, fontSize: 10, lineHeight: 1 }}>↻</span>
                              </span>
                            </>
                          ) : (
                            <span className="text-foreground/80"> · {entry.summary}</span>
                          )}
                          <span className="ml-1 text-[10px] text-muted-foreground/40">R{entry.turn}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Win Overlay ── */}
      <AnimatePresence>
        {state.status === 'finished' && !pendingGameOver && summonQueue.length === 0 && !showCinematic && showWinOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/92 backdrop-blur-md p-6"
          >
            {/* Radial glow behind card */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.18) 0%, transparent 70%)' }} />

            <motion.div
              ref={(el) => { winOverlayContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label={state.winnerId === session.playerId ? 'Victory' : 'Game over'}
              initial={{ scale: 0.75, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.15 }}
              className="w-full max-w-sm text-center space-y-5 p-8 rounded-3xl border bg-card/95"
              style={(() => {
                const lumId = state.winTriggerLuminaryId;
                if (!lumId) return { borderColor: 'hsl(var(--primary) / 0.4)', boxShadow: '0 0 100px rgba(99,102,241,0.25)' };
                const lum = state.luminaries?.find(l => l.id === lumId);
                const accentColor = lum?.summonColor ?? getLuminaryVisuals(lumId).primaryColor;
                return { borderColor: accentColor + '66', boxShadow: `0 0 100px ${accentColor}55` };
              })()}
            >
              {state.winnerId === session.playerId ? (
                <>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}
                    className="text-6xl"
                  >✨</motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="text-4xl font-serif font-bold text-primary gem-glow"
                  >
                    Victory!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-lg font-semibold"
                    style={{ color: GEM_META.flux.hex }}
                  >
                    The cosmos bends to your will.
                  </motion.p>
                </>
              ) : (
                <>
                  <div className="text-5xl">🌌</div>
                  <h2 className="text-4xl font-serif font-bold text-primary">Game Over</h2>
                  <div className="text-base text-foreground">
                    Winner: <span className="font-bold text-primary">{safePlayers.find(p => p.playerId === state.winnerId)?.playerName}</span>
                  </div>
                </>
              )}

              {/* Luminary badge on win screen */}
              {(() => {
                let lumId: string | null = null;
                let label = "";
                if (state.winTriggerLuminaryId) {
                  lumId = state.winTriggerLuminaryId;
                  label = "Sealed by";
                } else if (state.winnerId) {
                  const winner = state.players.find(p => p.playerId === state.winnerId);
                  const winnerClaimedIds = winner?.claimedLuminaryIds ?? [];
                  const winnerClaimed = (state.luminaries ?? [])
                    .filter(l => winnerClaimedIds.includes(l.id))
                    .sort((a, b) => (b.lumens ?? 0) - (a.lumens ?? 0));
                  if (winnerClaimed.length > 0) {
                    lumId = winnerClaimed[0].id;
                    label = "Champion of";
                  }
                }
                if (!lumId) return null;
                const lum = state.luminaries?.find(l => l.id === lumId);
                const vis = getLuminaryVisuals(lumId);
                const accentColor = lum?.summonColor ?? vis.primaryColor;
                const glowColor = `${accentColor}88`;
                return (
                  <motion.div
                    key="sealing-luminary"
                    initial={{ opacity: 0, scale: 0.55, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: 0.65,
                      type: 'spring',
                      stiffness: 240,
                      damping: 16,
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="rounded-xl overflow-hidden border-2 shrink-0 seal-glow-pulse"
                      style={{
                        borderColor: accentColor,
                        '--seal-glow-dim': `${accentColor}44`,
                        '--seal-glow-bright': `${accentColor}cc`,
                      } as React.CSSProperties}
                    >
                      <LuminaryPanelArt luminaryId={lumId} width={80} height={80} claimed={false} />
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.0 }}
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: accentColor, textShadow: `0 0 10px ${glowColor}` }}
                    >
                      {label} {lum?.name ?? lumId}
                    </motion.p>
                  </motion.div>
                );
              })()}

              {/* Final scores — staggered in */}
              <div className="flex flex-col gap-2 pt-1">
                {(() => {
                  const sorted = [...state.players].sort((a, b) => {
                    const lumensDiff = b.lumens - a.lumens;
                    if (lumensDiff !== 0) return lumensDiff;
                    return (a.purchasedCards?.length ?? 0) - (b.purchasedCards?.length ?? 0);
                  });
                  const maxLumens = sorted[0]?.lumens ?? 0;
                  const tiedOnLumens = sorted.filter(p => p.lumens === maxLumens).length > 1;
                  return sorted.map((p, i) => {
                    const isMe = p.playerId === session.playerId;
                    const avatarIdForPlayer = p.avatarId ?? (isMe ? session.avatarId : null);
                    const playerCards = (p.purchasedCards ?? []) as Array<{ id: string; tier: number; bonusColor: string }>;
                    const playerDiscountedIds = (p.discountedForgeIds ?? []) as string[];
                    const civPalette = getDominantAffinityPalette(playerCards);
                    const civTier = getKardashevTier(playerCards, playerDiscountedIds);
                    const civName = getCivilizationName(civPalette, civTier);
                    const forgedCount = playerCards.length;
                    const claimedIds = (p.claimedLuminaryIds ?? []) as string[];
                    const claimedLums = (state.luminaries ?? []).filter(l => claimedIds.includes(l.id));
                    const isWinner = p.playerId === state.winnerId;
                    const showTieBreak = isWinner && tiedOnLumens;
                    return (
                      <motion.div
                        key={p.playerId}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55 + i * 0.1 }}
                        className={`flex flex-col px-3 py-2.5 rounded-xl gap-1 ${isWinner ? 'bg-primary/20 border border-primary/40' : 'bg-secondary/50'}`}
                      >
                        {/* Name row */}
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm flex items-center gap-2">
                            {isWinner && <span className="text-xs">🏆</span>}
                            <PlayerAvatar avatarId={avatarIdForPlayer} name={p.playerName} size={24} />
                            <span className="flex flex-col items-start">
                              <span>{p.playerName}</span>
                              <span className="text-[10px] font-normal tracking-wide" style={{ color: civPalette.primary, opacity: 0.85 }}>{isMe ? civLabel : civName}</span>
                            </span>
                          </span>
                          <span className="font-bold text-primary flex items-center gap-1">
                            {p.lumens}<EminenceDiamond size={13} />
                          </span>
                        </div>
                        {/* Breakdown row */}
                        <div className="flex items-center justify-between gap-2 pl-1 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span className="tabular-nums font-semibold text-foreground/70">{forgedCount}</span>
                              <span>forged</span>
                            </span>
                            {claimedLums.length > 0 && (
                              <>
                                <span className="text-[11px] text-muted-foreground/50">·</span>
                                <span className="flex items-center gap-1 flex-wrap min-w-0">
                                  {claimedLums.map(lum => (
                                    <span
                                      key={lum.id}
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full truncate max-w-[96px]"
                                      style={{
                                        background: (lum.summonColor ?? '#888') + '22',
                                        color: lum.summonColor ?? '#aaa',
                                        border: `1px solid ${(lum.summonColor ?? '#888')}44`,
                                      }}
                                    >
                                      {lum.name}
                                    </span>
                                  ))}
                                </span>
                              </>
                            )}
                          </div>
                          {showTieBreak && (
                            <span className="text-[10px] font-semibold text-amber-400 border border-amber-400/30 bg-amber-400/10 rounded-full px-2 py-0.5 shrink-0">
                              tie-break
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>

              {/* ── Session Record (appears after first vote) ───────────────── */}
              {rematchVote && Object.keys(rematchVote.sessionStats).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-secondary/40 px-3 py-2 space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Session Record</div>
                    {state.players.map((p) => {
                      const rec = rematchVote.sessionStats[p.playerId];
                      if (!rec) return null;
                      const isMe = p.playerId === session.playerId;
                      return (
                        <div key={p.playerId} className={`flex justify-between text-xs ${isMe ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                          <span>{p.playerName}</span>
                          <span className="tabular-nums">
                            <span className="text-emerald-400">{rec.wins}W</span>
                            {' · '}
                            <span className="text-red-400">{rec.losses}L</span>
                            {rec.ties > 0 && <span className="text-yellow-400"> · {rec.ties}T</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Play Again voting section ───────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex flex-col gap-2"
              >
                {/* Who has voted */}
                {rematchVote && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {state.players.map((p) => {
                        const voted = rematchVote.voterIds.includes(p.playerId);
                        const isMe = p.playerId === session.playerId;
                        const avatarIdForPlayer = p.avatarId ?? (isMe ? session.avatarId : null);
                        return (
                          <div key={p.playerId} className={`flex flex-col items-center gap-0.5 transition-opacity ${voted ? 'opacity-100' : 'opacity-35'}`}>
                            <div className="relative">
                              <PlayerAvatar avatarId={avatarIdForPlayer} name={p.playerName} size={28} />
                              {voted && (
                                <span className="absolute -top-1 -right-1 text-[10px] bg-emerald-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">✓</span>
                              )}
                            </div>
                            <span className="text-[9px] text-muted-foreground truncate max-w-[36px]">{p.playerName.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Countdown */}
                    {rematchVote.countdownEndsAt !== null && (
                      <RematchCountdown endsAt={rematchVote.countdownEndsAt} />
                    )}
                    {rematchVote.countdownEndsAt === null && state.players.filter(p => !p.isAi).length === 2 && !hasVoted && (
                      <p className="text-xs text-center text-muted-foreground">Waiting for both players to confirm…</p>
                    )}
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  disabled={hasVoted || votePending}
                  onClick={async () => {
                    if (hasVoted || votePending) return;
                    setVotePending(true);
                    try {
                      const resp = await fetch(`/api/rooms/${roomId}/rematch`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionToken: session.sessionToken }),
                      });
                      if (!resp.ok) throw new Error(await resp.text());
                      setHasVoted(true);
                    } catch {
                      toast({ title: 'Vote failed', description: 'Could not register your vote.', variant: 'destructive' });
                    } finally {
                      setVotePending(false);
                    }
                  }}
                >
                  {votePending ? 'Sending…' : hasVoted ? 'Vote cast ✓' : 'Play Again'}
                </Button>
                <Button size="lg" variant="outline" className="w-full" onClick={() => setLocation('/')}>Back to Home</Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setShowWinOverlay(false);
                    setShowCinematic(false);
                    requestAnimationFrame(() => returnBannerRef.current?.focus());
                  }}
                >
                  <span className="mr-2 opacity-60">⊞</span>View Board
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dev: Luminary Summon Test Panel ── */}
      {import.meta.env.DEV && summonQueue.length === 0 && state?.status === 'playing' && (
        <div className="fixed bottom-20 left-2 z-[150] flex flex-col gap-1 p-2 rounded-lg border border-amber-500/40 bg-black/80 shadow-lg shadow-black/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-300 font-mono uppercase tracking-wider font-semibold">Test Cutscene</span>
            <button
              type="button"
              onClick={() => setTestPanelCollapsed(c => !c)}
              className="text-[10px] text-amber-300/70 hover:text-amber-300 font-mono transition-colors px-1 rounded border border-amber-500/20 hover:border-amber-500/50"
              title={testPanelCollapsed ? 'Expand test panel' : 'Collapse test panel'}
            >
              {testPanelCollapsed ? '▶' : '▼'}
            </button>
          </div>
          {!testPanelCollapsed && (state.luminaries ?? []).map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => enqueueSummon(
                l.id, l.name, l.domain ?? '', l.lumens, l.flavor ?? '',
                `dev-test-${l.id}`, true,
              )}
              className="text-[10px] bg-black/60 text-amber-300/90 border border-amber-500/40 rounded px-2 py-1 hover:bg-amber-900/50 hover:border-amber-500/70 transition-colors text-left"
            >
              ✦ {l.name}
            </button>
          ))}
          {testPanelCollapsed && (
            <span className="text-[10px] text-amber-300/50 px-1 font-mono">{((state.luminaries ?? []).length)} Luminaries</span>
          )}
        </div>
      )}

      {/* Luminary summoning cutscene queue — plays one cutscene at a time.
          When the user presses "Skip view", the cutscene overlay is hidden via
          CSS (visibility:hidden) but the component stays mounted so its internal
          timer chain still runs and fires onComplete at the correct moment.
          onComplete sends resolve_summon to the server (clearing the global gate)
          and advances the local queue, at which point the "waiting" chip clears.
          In tutorial mode the queue is drained silently by a useEffect above —
          the component must never mount here so the full-screen dark overlay
          (z-9000, up to 88% opacity) never appears during the tutorial. */}
      <AnimatePresence>
        {!isTutorial && summonQueue.length > 0 && summonQueue[0] && (() => {
          const entry = summonQueue[0];
          // Completion logic shared by both onSkip and the cutscene's internal
          // onComplete timer. When the user taps Skip, the cutscene is unmounted
          // immediately so the queue advances and the server gate resolves.
          const resolveSummon = () => {
            console.log(`[Luminae] Summon resolved: eventId="${entry.eventId}" isDevTest=${entry.isDevTest}`);
            setLocalSummonSkipped(false);
            setSummonQueue(q => q.slice(1));
            setClaimedThisSession(prev =>
              prev.includes(entry.id) ? prev : [...prev, entry.id]
            );
            // After the Seed Beyond Seasons summon cutscene resolves, show the
            // deck-seeding flourish as a compact board-level effect (no fullscreen overlay).
            if (entry.id === 'lum_seed') {
              setShowSeedBoardEffect(true);
            }
            // Resolve the global summon gate on the server so all clients
            // can unblock their turn actions once the cutscene is done.
            if (!entry.isDevTest) {
              executeAction({ type: 'resolve_summon', eventId: entry.eventId });
            }
          };
          return (
            <div key={entry.eventId}>
              <LuminarySummonCutscene
                luminaryId={entry.id}
                luminaryName={entry.name}
                domain={entry.domain}
                lumens={entry.lumens}
                flavor={entry.flavor}
                claimedBy={entry.claimedBy}
                cardRect={entry.cardRect}
                overrideColor={entry.winSealingColor}
                onSkip={() => {
                  console.log(`[Luminae] Summon view skipped locally for eventId="${entry.eventId}"`);
                  gameAudio.stopSummonCutscene();
                  resolveSummon();
                }}
                onComplete={resolveSummon}
                onFlash={() => {
                  setFlashLumId(entry.id);
                  // Auto-clear after the flash animation finishes (~0.5 s)
                  setTimeout(() => setFlashLumId(prev => prev === entry.id ? null : prev), 500);
                }}
              />
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Luminary activation cinematic queue — plays one ~4s cinematic per effect.
          These are distinct from the 12-s summon cutscene and do NOT gate progression.
          Gated on summonQueue.length === 0 so the arrival effect never fires while
          the summon cutscene is still playing. */}
      {!isTutorial && activationQueue.length > 0 && summonQueue.length === 0 && (() => {
        const evt = activationQueue[0];
        const lum = (state?.luminaries ?? []).find((l: Luminary) => l.id === evt.luminaryId);
        const triggeringPlayer = (state?.players ?? []).find(
          (p: GamePlayerState) => p.playerId === evt.triggeringPlayerId
        );
        return (
          <LuminaryActivationCinematic
            key={evt.eventId}
            luminaryId={evt.luminaryId}
            effectType={evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn'}
            luminaryName={lum?.name ?? evt.luminaryId}
            triggeringPlayerName={triggeringPlayer?.playerName}
            onComplete={() => {
              setActivationQueue(q => q.slice(1));
              executeAction({ type: 'resolve_luminary_activation', eventId: evt.eventId });
            }}
          />
        );
      })()}

      {/* "Waiting" chip shown when the user has skipped their local view but
          the summon is still globally resolving (cutscene timer still running). */}
      {localSummonSkipped && summonQueue.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9001] flex items-center gap-2 bg-black/75 text-white/75 text-xs px-4 py-2 rounded-full border border-white/15 backdrop-blur pointer-events-none select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          <span>Summoning in progress…</span>
        </div>
      )}

      {/* Persistent entity overlays — one per luminary claimed this session.
          Each overlay flies from the viewport centre back to its panel card
          and then idles there with breathing / floating animations. */}
      {claimedThisSession.map(lumId => {
        const lumAff = state?.luminaryAffinities?.find(
          (la: LuminaryActiveState) => la.luminaryId === lumId
        );
        const isMultiEligible = (lumAff?.eligibleAffinities?.length ?? 0) >= 2;
        const activeAffinityColor = isMultiEligible && lumAff?.activeAffinity
          ? GEM_KEY_TO_HEX[lumAff.activeAffinity] ?? undefined
          : undefined;
        return (
          <LuminaryIdleOverlay
            key={lumId}
            luminaryId={lumId}
            frozen={summonQueue.length > 0}
            hidden={activeTab !== 'board' || summonQueue.length > 0}
            activeAffinityColor={activeAffinityColor}
          />
        );
      })}

      {/* Lumii tutorial — rendered when ?tutorial=1 is in the URL */}
      {isTutorial && (
        <LumiiTutorial
          state={state}
          sessionPlayerId={session?.playerId ?? ''}
          tutorialStep={tutorialStep}
          setTutorialStep={setTutorialStep}
          executeAction={executeAction}
          nudgeTick={tutorialNudgeTick}
        />
      )}

      {/* Compact market ghost — fire-and-forget, independent of flippingCards lifecycle */}
      {compactGhost && (
        <CompactCardGhost
          key={compactGhost.id}
          cardViewProps={compactGhost.cardViewProps}
          chipRect={compactGhost.chipRect}
          onDone={() => setCompactGhost(null)}
        />
      )}
      {/* ── Burn badge overlays — brief "Burned" label on departing card slot ── */}
      {burnBadgeOverlays.map(b => (
        <BurnBadgeOverlay
          key={b.id}
          slotRect={b.slotRect}
          onDone={() => setBurnBadgeOverlays(pf => pf.filter(x => x.id !== b.id))}
        />
      ))}
      {/* ── v0.8 Burn animations (reusable keyword event) ── */}
      {burnFlashes.map(f => (
        <BurnFlash
          key={f.id}
          slotRect={f.slotRect}
          sourceLuminaryId={f.sourceLuminaryId}
          onDone={() => setBurnFlashes(pf => pf.filter(x => x.id !== f.id))}
        />
      ))}
      {/* ── v0.8 Delayed-effect eminence floats ── */}
      {delayedEffectFloats.map(f => (
        <DelayedEffectFloat
          key={f.id}
          amount={f.amount}
          color={f.color}
          originRect={f.originRect}
          onDone={() => setDelayedEffectFloats(pf => pf.filter(x => x.id !== f.id))}
        />
      ))}
      {/* ── v0.8 Board dim (Void Warden Oblivion) ── */}
      <BoardDimOverlay dimKey={boardDimKey} />
      {/* ── v0.8 Bloom seed particles (per burn while Bloom is claimed) ── */}
      {bloomSeedParticles.map(p => (
        <BloomSeedParticle
          key={p.id}
          from={p.from}
          to={p.to}
          onDone={() => setBloomSeedParticles(pf => pf.filter(x => x.id !== p.id))}
        />
      ))}
      {/* ── v0.8 The Glass Orchard copy pulse ── */}
      <OrchardCopyPulse
        originRect={orchardPortalRectRef.current}
        pulseKey={orchardCopyPulseKey}
      />
      {/* ── Seed Beyond Seasons board-level seeding flourish ──
          Plays after the summon cutscene resolves for lum_seed.
          Renders at normal board scale (no dimming, no entity overlay). */}
      {showSeedBoardEffect && (
        <SeedBeyondSeasonsEffect onComplete={() => setShowSeedBoardEffect(false)} />
      )}
      {/* ── v0.8 Per-Luminary summon market overlays ── */}
      {summonOverlays.map(o => (
        <SummonMarketOverlay
          key={o.id}
          lumId={o.lumId}
          onDone={() => setSummonOverlays(pf => pf.filter(x => x.id !== o.id))}
        />
      ))}
      {/* Aura preview modal — full-screen entity + aura animation */}
      <AnimatePresence>
        {auraPreviewLuminaryId && selectedLuminary && (
          <AuraPreviewModal
            key={auraPreviewLuminaryId}
            luminaryId={auraPreviewLuminaryId}
            luminaryName={selectedLuminary.name}
            onClose={() => setAuraPreviewLuminaryId(null)}
          />
        )}
      </AnimatePresence>

      {/* Hand-tab absorb flash — abridged forge card absorbed by Civilization tab */}
      <AnimatePresence>
        {handTabAbsorbFlash && (
          <motion.div
            key={handTabAbsorbFlash.key}
            className="pointer-events-none fixed z-[9050]"
            style={{
              left: handTabAbsorbFlash.pos.x,
              top: handTabAbsorbFlash.pos.y,
              translateX: '-50%',
              translateY: '-50%',
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: `2px solid ${handTabAbsorbFlash.color}`,
            }}
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
