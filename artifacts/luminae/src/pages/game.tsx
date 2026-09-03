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
  AffinityCounts,
  ArtifactCard,
  Luminary,
  GamePlayerState,
  LuminaryActiveState,
  ActionRequest,
  ActionRequestAffinity,
  PendingLuminaryActivationEvent,
  BurnEvent,
} from '@workspace/api-client-react';
import {
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  compareVictoryStandings,
  getArtifactTierCounts,
  OPENING_TURN_ORDER_PRESENTATION_MS,
  type NaturalAffinityKey,
} from '@workspace/game-types';
import {
  ActivationDirectorRouter,
  activationDirectorForcesCamera,
  activationDirectorManagesActivation,
} from '@/components/ActivationDirectorRouter';
import {
  LuminaryEffectResultReceipt,
  type LuminaryEffectReceiptData,
} from '@/components/LuminaryEffectChrome';
import type { DirectorBurnSlot } from '@/components/CinderMandateBurnDirector';
import type { IronHarbingerResetSlot } from '@/components/IronHarbingerResetDirector';
import type { AssimilationVisualSlot } from '@/components/FinalHungerAssimilationDirector';
import { resolveLuminaryProcedure } from '@/lib/luminaryAnimationProcedures';
import { getLuminaryEffectResultReceiptCopy } from '@/lib/luminaryEffectAnnouncements';
import { usesControlledEminenceBestowal } from '@/lib/delayedEminencePresentation';
import { createPerfectCoherenceBestowals } from '@/lib/perfectCoherencePresentation';
import { trackFirstPartyEvent } from '@/lib/firstPartyTelemetry';
import {
  canAcknowledgeLuminaryActivations,
  delayedResultBelongsToActivation,
  getLuminaryActivationGateDecision,
  isActivationAftermathBlockingHead,
  isActivationAftermathInFlight,
  isLuminaryActivationGateActive,
  isLuminaryArrivalSequenceActive,
  partitionDeferredBrandStrikesByActivation,
  reconcileDeferredLuminaryActivations,
  type LuminarySequenceGateSnapshot,
} from '@/lib/luminarySequenceGate';
import { useViewOrchestrator } from '@/hooks/use-view-orchestrator';
import { SeedBeyondSeasonsEffect, SEED_EFFECT_TOTAL_MS } from '@/components/SeedBeyondSeasonsEffect';
import { BalanceLabFinishedControls } from '@/components/BalanceLabFinishedControls';
import { useQueryClient } from '@tanstack/react-query';
import { getSession, clearSession, saveSession } from '@/lib/session';
import { getSkipCinematics, setSkipCinematics, syncAccountPreferences, apiUpdatePreferences, markHintSeen } from '@/lib/cinematicPrefs';
import {
  activeBalanceLabCandidate,
  balanceLabEncryptAwardsPortableSingularity,
  balanceLabFocusOptions,
  balanceLabRemovesLuminaryEminence,
  resolveBalanceLabForgeCost,
} from '@/lib/balanceLabClient';
import { useAccount } from '@/contexts/AccountContext';
import { AccountLoadingScreen } from '@/components/AccountLoadingScreen';
import {
  apiAcknowledgeBlueprintVaultReveal,
  apiGetBlueprintVault,
  apiStartBlueprintChallenge,
  apiWithdrawBlueprintChallenge,
  getAccountSession,
} from '@/lib/accountSession';
import { useGameWebsocket } from '@/hooks/use-game-websocket';
import {
  useLuminaryPresentationEngine,
  type LuminaryPresentationRuntimeSignals,
} from '@/hooks/use-luminary-presentation-engine';
import { useCameraInputLease } from '@/hooks/use-camera-input-lease';
import { useToast } from '@/hooks/use-toast';
import { gameAudio } from '@/lib/audio';
import { CipherApertureAnimation, CipherSigil } from '@/components/CipherApertureAnimation';
import { ForgeButton, EncryptButton, AssimilateButton } from '@/components/ForgeEncryptButton';

import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Volume2, VolumeX, AlertCircle, Sparkles, Clock,
  Gavel, Package, LayoutGrid, Landmark, List,
  ChevronDown, ChevronUp, ChevronRight, Flag, X, HelpCircle, Check, DoorOpen,
  MoreVertical, Zap, RefreshCw, Lightbulb, FlaskConical, Gauge, Eye, Loader2, Lock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { AFFINITY_META, AFFINITY_KEYS, type AffinityKey } from '@/lib/affinityMeta';
import { getAvatarForPlayer, getSavedAvatarId, getDefaultCivName } from '@/lib/avatars';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import { LuminaryPanelArt, LuminaryArrivalCutscene, LuminaryIdleOverlay, getLuminaryVisuals, type ArrivalBoardSnapshot } from '@/lib/luminaryAssets';
import { BOARD_CARD_W, BOARD_CARD_H } from '@/lib/constants';
import { CardBackTier1, CardBackTier2, CardBackTier3 } from '@/components/ArtifactCardBack';
import { LumiiGuidedMatch, LumiiTutorial, LUMII_BEAT_COUNT, LUMII_BEAT_GATES, LUMII_ZONE_HIGHLIGHTS, LUMII_ATTENTION, type LumiiAttentionState } from '@/components/LumiiTutorial';
import { SwipeHintBar } from '@/components/SwipeHintBar';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useEscapeToClose } from '@/hooks/use-escape-to-close';
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss';
import { useGameKeyboardShortcuts } from '@/hooks/use-game-keyboard-shortcuts';
import { useForgeKeyboardNav } from '@/hooks/use-forge-keyboard-nav';
import { KardashevScene } from '@/components/KardashevScene';
import { getKardashevTier, getDominantAffinityPalette, getCivilizationName, type AffinityPalette } from '@/lib/kardashev';
import { hexRgba, AFFINITIES, TIER_CIVILIZATION, AFFINITY_KEY_TO_HEX, INITIAL_TURN_GUARD_MS, ABRIDGED_SHRINK_MS, ANIM_LOCK_BUFFER_MS, ABRIDGED_ACTION_MS, FORGE_FULL_MS, RESERVED_FORGE_FULL_MS, FALLBACK_FLIP_ANIM_MS, FALLBACK_FLIP_CLEANUP_MS, CIPHER_TAIL_BUFFER_MS, AFFINITY_BURST_STAGGER_MS, AFFINITY_BURST_BASE_MS, AFFINITY_BURST_SETTLE_MS, ABRIDGED_FORGE_LOCK_MS, CIPHER_GAME_TOTAL_MS, CIPHER_DEAL_FIRE_DELAY_MS, ARRIVAL_LABEL_LINGER_MS, RETURN_FLIGHT_MS } from './game-constants';
import { PlayerAvatar, OpponentChip } from './game-player';
import { AffinityToken, BaseDialog, type EminenceBreakdown, ArtifactCardView, ForgedCardWithTooltip, TurnCountdown, CardBack, EminenceBadge, EminenceDiamond, EminenceSigil, PendingActionOverlay } from './game-card';
import { getLuminaryEminenceTitle } from './game-luminary';
import { LuminaryOrderPicker } from './game-luminary-order-picker';
import { CompactCardGhost } from './game-animation';
import { ArtifactBrandDetails, BurnBadgeOverlay, BurnFlash, DelayedEffectFloat, LuminaryEminenceBurst, BloomSeedParticle, BurnPileParticle, ArchiveReturnParticle, BurnChipLandingSpark, OrchardCopyPulse, ArrivalBrandStrike, ForgottenHourDescription, MARKER_SOURCE, SOURCE_PULSE_LEAD_MS, type BrandStrikeTarget, type MarkerType } from './game-luminary-effects';
import { ConnectionLostBanner, ReturnResultsBanner } from './game-banners';
import { civilizationStateKey } from './game-civilization-utils';
import { handledArrivalEventIds } from './game-arrival-dedup';
import { useBoardLayoutPolicy } from './game-layout';
import { useScrollLock } from './game-scroll-lock';
import type { ActiveTab, CostMode, ForgeDestination, ForgeDestinationKind, SelectedCard } from './game-types';
import { getPlannedActionSummary } from './game-action-summary';
import { BoardAuxModules } from './game-civilization-preview';
import { BoardTabMain } from './game-board-tab';
import { AffinityWellPanel } from './game-affinity-well-panel';
import { ArchiveManifestationTrace, OpponentHarnessTrace } from './game-causal-motion';
import { HandTab, LogTab, OpponentStatStrip, type HandTabScope, type LogTabScope } from './game-tabs';
import { getVisibleElementRect } from './game-dom-utils';
import {
  canCommitPlannedAction,
  canReserveMore,
  canUsePlanningEngine,
  getPlannedActionInfo,
  getTurnPresentationKey,
} from './game-planning';
import {
  MOLD_CAST_DURATION_MS,
  MOLD_CAST_STAGGER_MS,
  type MoldCastCause,
  type MoldCastCue,
} from './game-mold-casting';
import {
  buildOpeningTurnOrderPlayers,
  getBalanceTelemetryActionId,
  type OpeningTurnOrderPlayer,
} from './game-opening-turn-order';
import {
  artifactMarkerBlocksForgeEminence,
  artifactMarkerHasBrand,
  getArtifactBrandVisibilityKey,
  getArtifactBrands,
  getAddedArtifactBrandTypes,
  getArtifactBrandTypes,
  getPendingArtifactBrandTypes,
  isNullifiedFirstForgeExempt,
  isArtifactBrandType,
} from '@/lib/artifactBrands';
import { ForgeMarkerLayer } from './game-board-forge-markers';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';
import { ForgeAnimation, OpponentForgeAnimation, AbridgedForgeAnimation } from './game-forge-animation';
import { VictoryCinematic } from '@/components/VictoryCinematic';
import { deriveAccolades } from '@/lib/accolades';
import { buildCivilizationProfile } from '@/lib/civilizationProfile';
import {
  DevLuminarySequencePanel,
  type DevSequencePlaybackMode,
} from '@/components/DevLuminarySequencePanel';
import { DevBuildIdentity } from '@/components/DevBuildIdentity';
import {
  normalizeLuminaryPlaybackMode,
  type LuminaryPlaybackMode,
} from '@/lib/luminaryPresentationPacing';
import {
  LUMII_CLEARANCE_SCENARIO_ID,
  LumiiEncounterHud,
  LumiiVaultEncounter,
} from '@/components/vault/LumiiVaultEncounter';

const BlueprintPresentationOverlay = React.lazy(async () => {
  const module = await import('@/components/blueprints/BlueprintPresentationOverlay');
  return { default: module.BlueprintPresentationOverlay };
});

const ScenarioProtocolPresentationOverlay = React.lazy(async () => {
  const module = await import('@/components/blueprints/ScenarioProtocolPresentationOverlay');
  return { default: module.ScenarioProtocolPresentationOverlay };
});

function playMarkerStrikeSound(markerType?: string | null) {
  if (!markerType) return;
  if (markerType === 'forgotten') {
    // The shared branding strike establishes the mark; the Forgotten cue opens
    // underneath it. Both begin on the first beam impact by design.
    gameAudio.playBrandStrike();
    gameAudio.playForgottenHour();
    return;
  }
  gameAudio.playBrandStrike();
}

function captureArrivalBoardSnapshot(
  boardEl: HTMLElement,
  cardRect: { cx: number; cy: number; w: number },
): ArrivalBoardSnapshot | undefined {
  const rect = boardEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;

  const collectDataAttributes = (el: HTMLElement | null) => {
    const attributes: Record<string, string> = {};
    if (!el) return attributes;
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('data-')) attributes[attr.name] = attr.value;
    }
    return attributes;
  };

  try {
    const clone = boardEl.cloneNode(true) as HTMLElement;
    const shellEl = boardEl.closest('.game-shell') as HTMLElement | null;
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    return {
      html: clone.innerHTML,
      className: boardEl.className,
      attributes: collectDataAttributes(boardEl),
      shellClassName: shellEl?.className,
      shellAttributes: collectDataAttributes(shellEl),
      rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      cardRect,
      scroll: { x: boardEl.scrollLeft, y: boardEl.scrollTop },
      content: {
        w: Math.max(boardEl.scrollWidth, rect.width),
        h: Math.max(boardEl.scrollHeight, rect.height),
      },
      capturedAt: performance.now(),
    };
  } catch {
    return undefined;
  }
}

const TURN_ORDER_SELECTOR_ATTENTION_MS = 680;
const TURN_ORDER_BALANCE_LEAD_MS = 560;
const TURN_ORDER_BALANCE_STAGGER_MS = 220;
const TURN_ORDER_BALANCE_SETTLE_MS = 420;
const TURN_ORDER_INTRO_SEEN_PREFIX = 'luminae_turn_order_intro_seen';
const MATCH_BALANCE_RESULT_SEEN_PREFIX = 'luminae_match_balance_result_seen';
const LUMII_HUD_NAME_PILL_SELECTOR = '[data-lumii-hud-name-pill="true"]';
const LUMII_HUD_ENTITY_SELECTOR = '[data-lumii-hud-entity="true"]';
const LUMII_HUD_ABSORB_FULL_MS = 1_120;
const LUMII_HUD_ABSORB_ABRIDGED_MS = 560;

function readElementCenter(selector: string): { x: number; y: number } | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector<HTMLElement>(selector);
  const rect = el?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function isLumiiForecastPlayer(player?: GamePlayerState | null) {
  return Boolean(player?.isAi && player.playerName === 'Lumii');
}

function resolveLumiiHudAbsorbCenter() {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return (
    readElementCenter(LUMII_HUD_NAME_PILL_SELECTOR) ??
    readElementCenter(LUMII_HUD_ENTITY_SELECTOR) ??
    { x: window.innerWidth / 2, y: 32 }
  );
}

function resolveOpponentArtifactAbsorbCenter(
  playerId: string,
  useLumiiHud: boolean,
) {
  if (useLumiiHud) return resolveLumiiHudAbsorbCenter();
  const chipCenter = readElementCenter(`[data-opponent-chip="${playerId}"]`);
  if (chipCenter) return chipCenter;
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: 28 };
}

function getPlayerVictoryStanding(player: GamePlayerState) {
  return {
    eminence: player.eminence,
    reservedArtifactCount: player.reservedArtifacts?.length ?? 0,
    forgedArtifacts: player.forgedArtifacts ?? [],
  };
}

type TurnOrderIntroState = {
  key: number;
  introId: string;
  startedAt: number;
  firstPlayerName: string;
  firstPlayerAccentColor: string;
  isYou: boolean;
  players: OpeningTurnOrderPlayer[];
};

type LuminaryBurnVisualEntry = {
  burnedId: string;
  tier: 1 | 2 | 3;
  slotIndex: number;
  sourceLuminaryId?: string;
  destination: 'burn_pile' | 'archive';
  condemnedCard: ArtifactCard | null;
};

type DelayedLuminaryResultRequest = {
  id: string;
  luminaryId: string;
  activationEventId?: string;
  amount: number;
  color: string;
  label: string;
};

type ActiveDelayedLuminaryResult = DelayedLuminaryResultRequest & {
  originRect: DOMRect;
  targetRect?: DOMRect | null;
  playerId?: string;
  playerName?: string;
  eminenceAfter?: number;
  luminaryName?: string;
  secondaryColor?: string;
};

const NORMAL_BURN_VISUAL_MS = 2520;

function ConcealedArchiveArtifact({ tier }: { tier: number }) {
  return (
    <div
      className="h-full w-full overflow-hidden rounded-[8px] border border-[#c4a85a]/35 bg-[#030509]"
      aria-label={`Concealed Tier ${tier} Artifact`}
    >
      {tier === 3 ? <CardBackTier3 /> : tier === 2 ? <CardBackTier2 /> : <CardBackTier1 />}
    </div>
  );
}

function getTurnOrderIntroSeenKey(roomId: string | undefined, introId: number | string) {
  return `${TURN_ORDER_INTRO_SEEN_PREFIX}:${roomId ?? 'unknown-room'}:${introId}`;
}

function hasSeenTurnOrderIntro(roomId: string | undefined, introId: number | string | null | undefined) {
  if (!introId || typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(getTurnOrderIntroSeenKey(roomId, introId)) === '1';
  } catch {
    return true;
  }
}

function markTurnOrderIntroSeen(roomId: string | undefined, introId: number | string | null | undefined) {
  if (!introId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getTurnOrderIntroSeenKey(roomId, introId), '1');
  } catch {
    // Storage can be unavailable in private contexts; failing closed avoids replay loops.
  }
}

function getMatchBalanceResultSeenKey(introId: string, playerId: string) {
  return `${MATCH_BALANCE_RESULT_SEEN_PREFIX}:${introId}:${playerId}`;
}

function markMatchBalanceResultTracked(introId: string, playerId: string) {
  if (typeof window === 'undefined') return false;
  const key = getMatchBalanceResultSeenKey(introId, playerId);
  try {
    if (window.localStorage.getItem(key) === '1') return false;
    window.localStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

function TurnOrderIntroOverlay({
  intro,
  onAbridge,
  onBonusImpact,
}: {
  intro: TurnOrderIntroState;
  onAbridge: (event: React.PointerEvent<HTMLDivElement>) => void;
  onBonusImpact: (playerId: string, amount: number) => void;
}) {
  const firstIndex = Math.max(0, intro.players.findIndex((player) => player.isFirst));
  const balanceRecipients = useMemo(
    () => intro.players.filter((player) => player.eminenceBonus > 0),
    [intro.players],
  );
  const [selectorArmed, setSelectorArmed] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [activeGrantPlayerId, setActiveGrantPlayerId] = useState<string | null>(null);
  const [grantedPlayerIds, setGrantedPlayerIds] = useState<string[]>([]);
  const [balanceComplete, setBalanceComplete] = useState(false);

  useEffect(() => {
    const playerCount = intro.players.length;
    if (playerCount === 0) return;

    setRevealed(false);
    setSelectorArmed(false);
    setActiveIndex(null);
    setBalanceVisible(false);
    setActiveGrantPlayerId(null);
    setGrantedPlayerIds([]);
    setBalanceComplete(false);

    const minSteps = Math.max(9, playerCount * 4 + 2);
    let stepCount = minSteps;
    while ((stepCount - 1) % playerCount !== firstIndex) stepCount += 1;

    const timers: ReturnType<typeof setTimeout>[] = [];
    gameAudio.playBrandMnemonic();
    timers.push(setTimeout(() => {
      gameAudio.playButtonSelect();
      setSelectorArmed(true);
    }, TURN_ORDER_SELECTOR_ATTENTION_MS));

    let elapsed = TURN_ORDER_SELECTOR_ATTENTION_MS + 120;
    for (let i = 0; i < stepCount; i += 1) {
      const progress = i / Math.max(1, stepCount - 1);
      const gap = 58 + Math.pow(progress, 2.15) * 190;
      elapsed += gap;
      timers.push(setTimeout(() => {
        setActiveIndex(i % playerCount);
        if (i === stepCount - 1) {
          gameAudio.playTurnOrderResolved();
          setRevealed(true);
        } else {
          gameAudio.playTurnOrderTick(i);
        }
      }, elapsed));
    }

    if (balanceRecipients.length > 0) {
      const balanceStartAt = elapsed + TURN_ORDER_BALANCE_LEAD_MS;
      timers.push(setTimeout(() => {
        setBalanceVisible(true);
      }, balanceStartAt));

      balanceRecipients.forEach((player, index) => {
        timers.push(setTimeout(() => {
          setActiveGrantPlayerId(player.playerId);
          setGrantedPlayerIds((current) => current.includes(player.playerId)
            ? current
            : [...current, player.playerId]);
          gameAudio.playTurnOrderEminenceGrant(player.eminenceBonus, index);
          onBonusImpact(player.playerId, player.eminenceBonus);
        }, balanceStartAt + 120 + index * TURN_ORDER_BALANCE_STAGGER_MS));
      });

      const balanceCompleteAt = balanceStartAt
        + 120
        + Math.max(0, balanceRecipients.length - 1) * TURN_ORDER_BALANCE_STAGGER_MS
        + TURN_ORDER_BALANCE_SETTLE_MS;
      timers.push(setTimeout(() => {
        setActiveGrantPlayerId(null);
        setBalanceComplete(true);
      }, balanceCompleteAt));
    }

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [balanceRecipients, firstIndex, intro.key, intro.players.length, onBonusImpact]);

  const activeGrant = balanceRecipients.find((player) => player.playerId === activeGrantPlayerId) ?? null;

  return (
    <motion.div
      key={intro.key}
      className="fixed inset-0 z-[9300] flex items-center justify-center px-4"
      style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'manipulation' }}
      onPointerUp={onAbridge}
      aria-label="Click to skip turn order animation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 72% 58% at 50% 50%, ${hexRgba(intro.firstPlayerAccentColor, 0.18)} 0%, rgba(3,2,12,0.78) 72%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 62% 48% at 50% 52%, rgba(244,207,120,0.2) 0%, rgba(47,31,11,0.08) 48%, transparent 76%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: balanceVisible ? 1 : 0 }}
        transition={{ duration: 0.38 }}
      />
      <motion.div
        className="relative flex w-full max-w-lg flex-col items-center gap-5"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.98, transition: { duration: 0.18 } }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="animation-readable-pill animation-readable-pill--cool text-[10px] font-bold uppercase tracking-[0.22em] text-white/75"
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: selectorArmed || revealed ? 1 : [0.9, 1.08, 1],
          }}
          transition={{ duration: selectorArmed || revealed ? 0.22 : 0.58, ease: [0.16, 1, 0.3, 1] }}
        >
          {balanceVisible
            ? <EminenceSigil size={15} value={1} target={15} />
            : <Gavel className="h-3.5 w-3.5 text-amber-300" />}
          {balanceVisible
            ? 'Opening Balance'
            : revealed ? 'First Player' : selectorArmed ? 'Selecting First Player' : 'Turn Order'}
        </motion.div>

        <div className="relative flex items-end justify-center gap-3">
          <motion.div
            className="absolute -inset-x-6 -inset-y-5 rounded-[2rem] border border-amber-200/30"
            style={{
              background: `radial-gradient(ellipse 70% 58% at 50% 50%, ${hexRgba(intro.firstPlayerAccentColor, 0.18)} 0%, transparent 72%)`,
              boxShadow: `0 0 38px ${hexRgba(intro.firstPlayerAccentColor, 0.28)}, inset 0 0 24px ${hexRgba(intro.firstPlayerAccentColor, 0.14)}`,
            }}
            initial={{ opacity: 0, scale: 0.72 }}
            animate={selectorArmed || revealed
              ? { opacity: 0.24, scale: 1 }
              : { opacity: [0, 1, 0.62], scale: [0.72, 1.1, 1] }}
            transition={{ duration: selectorArmed || revealed ? 0.28 : 0.68, ease: [0.16, 1, 0.3, 1] }}
          />
          {intro.players.map((player, index) => {
            const delay = 0.16 + index * 0.09;
            const isScanning = !revealed && activeIndex === index;
            const isWinner = revealed && !balanceVisible && player.isFirst;
            const isReceiving = balanceVisible && activeGrantPlayerId === player.playerId;
            const hasReceived = grantedPlayerIds.includes(player.playerId);
            const isHighlighted = isScanning || isWinner || isReceiving;
            const avatarSize = isWinner ? 82 : isReceiving ? 66 : 58;
            return (
              <motion.div
                key={player.playerId}
                data-opening-balance-player={player.playerId}
                data-opening-balance-bonus={player.eminenceBonus}
                className="relative z-10 flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 16, scale: 0.86 }}
                animate={{
                  opacity: isHighlighted || hasReceived ? 1 : balanceVisible ? 0.58 : selectorArmed ? 0.5 : 0.78,
                  y: isWinner ? -10 : isReceiving ? -7 : isScanning ? -6 : 0,
                  scale: isWinner ? 1.12 : isReceiving ? 1.06 : isScanning ? 1.04 : balanceVisible ? 0.96 : selectorArmed ? 0.92 : 0.96,
                }}
                transition={{ duration: 0.24, delay: revealed ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  className="rounded-full overflow-hidden border-2 bg-black/70"
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderColor: isReceiving || hasReceived
                      ? 'rgba(255,231,154,0.88)'
                      : isHighlighted ? hexRgba(intro.firstPlayerAccentColor, 0.82) : 'rgba(255,255,255,0.18)',
                    boxShadow: isReceiving
                      ? '0 0 38px rgba(255,222,133,0.58), 0 0 76px rgba(244,207,120,0.22)'
                      : isHighlighted
                      ? `0 0 36px ${hexRgba(intro.firstPlayerAccentColor, 0.48)}, 0 0 74px ${hexRgba(intro.firstPlayerAccentColor, 0.18)}`
                      : '0 0 18px rgba(0,0,0,0.35)',
                  }}
                  animate={isReceiving
                    ? { rotate: [-1.5, 1.5, -1, 0], scale: [1, 1.07, 1] }
                    : isScanning ? { rotate: [-2, 2, -1, 0] } : { rotate: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <img
                    src={getAvatarForPlayer(player.avatarId).image}
                    alt={player.playerName}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </motion.div>
                <span className={`animation-readable-pill max-w-24 truncate px-2 py-0.5 text-xs font-semibold ${isHighlighted ? 'text-amber-100' : 'text-white/60'}`}>
                  {player.playerName}
                </span>
                <div className="relative flex h-6 min-w-16 items-center justify-center">
                  {!balanceVisible ? (
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                      {player.openingPosition === 0 ? 'Opener' : `Turn ${player.openingPosition + 1}`}
                    </span>
                  ) : player.eminenceBonus > 0 && hasReceived ? (
                    <motion.span
                      key={`${intro.key}-${player.playerId}-opening-eminence`}
                      className="animation-readable-pill flex items-center gap-1 border-amber-200/45 bg-[#171006]/95 px-2 py-1 font-serif text-xs font-black text-[#fff2bd]"
                      style={{ transformStyle: 'preserve-3d' }}
                      initial={{ opacity: 0, y: -48, scale: 0.45, rotateY: 0 }}
                      animate={{ opacity: 1, y: 0, scale: [0.45, 1.18, 1], rotateY: 360 }}
                      transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <EminenceSigil size={17} value={player.eminenceBonus} target={15} />
                      +{player.eminenceBonus}
                    </motion.span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-100/45">
                      {player.isFirst ? 'Opener' : 'Balancing'}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="relative flex flex-col items-center gap-1 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: revealed ? 1 : 0.58, y: revealed ? 0 : 6 }}
          transition={{ delay: revealed ? 0.05 : 0.4, duration: 0.28 }}
        >
          <span
            className="animation-readable-pill animation-readable-text rounded-xl px-4 py-2 text-2xl font-serif font-bold tracking-wide sm:text-3xl"
            style={{
              color: intro.isYou ? intro.firstPlayerAccentColor : 'rgba(255,255,255,0.92)',
              textShadow: `0 0 18px ${hexRgba(intro.firstPlayerAccentColor, 0.68)}`,
            }}
          >
            {balanceVisible
              ? activeGrant
                ? `${activeGrant.playerName} begins with +${activeGrant.eminenceBonus}`
                : balanceComplete ? 'Starting Eminence set' : 'Balancing turn order'
              : revealed
                ? intro.isYou ? 'You go first' : `${intro.firstPlayerName} goes first`
                : 'Finding the first signal'}
          </span>
          <span className="animation-readable-text text-xs font-medium text-white/75">
            {balanceVisible
              ? 'Players acting later begin with a small lead. Final-round turns stay equal.'
              : revealed ? 'Turn order proceeds from there' : 'Chosen at random'}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function GameBoard() {
  const { roomId } = useParams<{ roomId: string }>();
  const balanceLabCandidate = useMemo(activeBalanceLabCandidate, []);
  const balanceLabPortableSingularity = balanceLabEncryptAwardsPortableSingularity(
    balanceLabCandidate,
  );
  const balanceLabLuminaryEminence = balanceLabRemovesLuminaryEminence(
    balanceLabCandidate,
  ) ? 0 : null;
  const arrivalDedupKey = useCallback(
    (eventId: string) => `${roomId ?? 'unknown-room'}:${eventId}`,
    [roomId],
  );
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { account, isLoading: accountLoading, prefs: accountPrefs } = useAccount();
  const session = getSession();

  const isTutorial = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tutorial') === '1' || session?.isTutorial === true;
  }, [session?.isTutorial]);
  const isGuidedMatch = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('guided') === '1' || session?.isGuidedMatch === true;
  }, [session?.isGuidedMatch]);
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

  const [luminaryPlaybackMode, setLuminaryPlaybackMode] =
    useState<LuminaryPlaybackMode>(() => normalizeLuminaryPlaybackMode(
      localStorage.getItem('luminae_luminary_effect_pace'),
    ));
  const toggleLuminaryPlaybackMode = () => {
    const next = luminaryPlaybackMode === 'standard' ? 'swift' : 'standard';
    setLuminaryPlaybackMode(next);
    localStorage.setItem('luminae_luminary_effect_pace', next);
  };

  const [skipCinematics, setSkipCinematicsState] = useState<boolean>(() => getSkipCinematics());
  const toggleSkipCinematics = () => {
    const next = !skipCinematics;
    setSkipCinematicsState(next);
    const acctSession = getAccountSession();
    setSkipCinematics(next, acctSession?.account.id, acctSession?.token ?? undefined);
  };

  const [muted, setMuted] = useState(gameAudio.isMuted());
  const [selectedAffinities, setSelectedAffinities] = useState<Partial<AffinityCounts>>({});
  const [harnessBurstKeys, setHarnessBurstKeys] = useState<Partial<Record<AffinityKey, number>>>({});
  const [harnessBlockedKeys, setHarnessBlockedKeys] = useState<Partial<Record<AffinityKey, number>>>({});
  const pendingHarnessCheckRef = useRef<{
    affinities: AffinityKey[];
    heldBefore: Partial<AffinityCounts>;
    tally: Partial<AffinityCounts>;
    submittedVersion: number;
  } | null>(null);
  const [affinityHistory, setAffinityHistory] = useState<Array<keyof AffinityCounts>>([]);
  const [prePromotionHistory, setPrePromotionHistory] = useState<Array<keyof AffinityCounts> | null>(null);
  const [actionMode, setActionMode] = useState<'none' | 'take3' | 'take2'>('none');
  const [returnPhase, setReturnPhase] = useState<{
    pendingTake: Partial<AffinityCounts>;
    actionType: 'take3' | 'take2' | 'reserve';
    excessCount: number;
    pendingReserve?: { type: 'reserve_artifact'; cardId?: string; tier?: number; _tier?: number };
  } | null>(null);
  const [returnSelections, setReturnSelections] = useState<Partial<AffinityCounts>>({});
  const [showUndoHint, setShowUndoHint] = useState(false);
  const [showReserveHint, setShowReserveHint] = useState(false);
  const [showForgeHint, setShowForgeHint] = useState(false);
  const [showDeckReserveHint, setShowDeckReserveHint] = useState(false);
  const [costMode, setCostMode] = useState<CostMode>(() => {
    const stored = getAccountSession();
    if (!stored) return 'needed_now';
    const accountId = stored.account.id;
    const pref = localStorage.getItem(`luminae_cost_mode_pref_${accountId}`);
    if (pref === 'printed' || pref === 'after_bonuses' || pref === 'needed_now') return pref;
    return 'needed_now';
  });
  const [showForgedArtifacts, setShowForgedArtifacts] = useState(false);
  const [showActiveLuminaries, setShowActiveLuminaries] = useState(true);
  const [forgedView, setForgedView] = useState<'cards' | 'timeline'>('cards');
  const [forgeCompact, setForgeCompact] = useState(() => {
    const stored = getAccountSession();
    const key = stored ? `luminae_forge_view_reliquary_${stored.account.id}` : 'luminae_forge_view_reliquary';
    return localStorage.getItem(key) !== 'full';
  });
  const boardLayoutPolicy = useBoardLayoutPolicy();
  const boardLayoutMode = boardLayoutPolicy.layout;
  const boardDensityMode = boardLayoutPolicy.density;
  const boardViewportClass = boardLayoutPolicy.viewportClass;
  const forceCompactForge = boardLayoutPolicy.forceCompactForge;
  const isLandscapeCockpit = forceCompactForge;
  const isSideAffinityWellLayout = boardLayoutPolicy.sideAffinityWell;
  const effectiveForgeCompact = forceCompactForge || forgeCompact;
  useEffect(() => {
    const stored = getAccountSession();
    const key = stored ? `luminae_forge_view_reliquary_${stored.account.id}` : 'luminae_forge_view_reliquary';
    localStorage.setItem(key, forgeCompact ? 'compact' : 'full');
  }, [forgeCompact]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [civLabel, setCivLabel] = useState<string>(() => {
    const stored = getAccountSession();
    if (!stored) return getDefaultCivName(getSavedAvatarId(), undefined);
    const saved = localStorage.getItem(`luminae_civ_name_${stored.account.id}`);
    if (saved && saved.trim()) return saved;
    return getDefaultCivName(getSavedAvatarId(), stored.account.username ?? stored.account.id);
  });
  // Tracks the last civ name successfully sent to the server this session.
  // Prevents firing set_civ_name on every WS reconnect (proxy-forced ~15–25 s
  // drops) — that POST increments state.version and broadcasts a full state
  // update to all players, causing a visible game-board refresh.
  const lastSentCivLabelRef = useRef<string | null>(null);
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
    const el = document.querySelector(
      `[data-luminae-tutorial-zone="${tutorialZone}"], [data-tutorial-zone="${tutorialZone}"]`,
    );
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isTutorial, tutorialZone]);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [cardDetailDiscovered, setCardDetailDiscovered] = useState<boolean>(
    () => localStorage.getItem('luminae_card_detail_discovered') === 'true'
  );
  const [cardFlipped, setCardFlipped] = useState(false);
  const [pendingSheetAction, setPendingSheetAction] = useState<'forge' | 'foundry' | 'reserve' | 'plan_forge' | 'plan_foundry' | 'plan_reserve' | 'assimilate' | null>(null);
  const [pendingFocusAffinity, setPendingFocusAffinity] = useState<NaturalAffinityKey | null>(null);
  const [selectedDeckTier, setSelectedDeckTier] = useState<1 | 2 | 3 | null>(null);
  const [pendingDeckConfirm, setPendingDeckConfirm] = useState(false);
  const [btnAnimKey, setBtnAnimKey] = useState(0);
  const [btnAnimTarget, setBtnAnimTarget] = useState<string | null>(null);
  const [btnAnimType, setBtnAnimType] = useState<'select' | 'confirm'>('select');
  const [harnessPulseKey, setHarnessPulseKey] = useState(0);
  const [sentFlashBtn, setSentFlashBtn] = useState<string | null>(null);
  const sentFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (sentFlashRef.current) clearTimeout(sentFlashRef.current); }, []);
  useEffect(() => {
    setPendingFocusAffinity(null);
  }, [selectedCard?.card.id]);
  const [coreActionSubmitted, setCoreActionSubmitted] = useState(false);
  const [plannedActionCommitPending, setPlannedActionCommitPending] = useState(false);
  const [reservedForgeNotice, setReservedForgeNotice] = useState<{ key: number; eminence: number; name: string } | null>(null);
  const reservedForgeNoticeKeyRef = useRef(0);
  const [eminencePanelImpact, setEminencePanelImpact] = useState<{ key: number; amount: number } | null>(null);
  const eminencePanelImpactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerEminencePanelImpact = useCallback((amount: number) => {
    const key = Date.now();
    if (eminencePanelImpactTimerRef.current) clearTimeout(eminencePanelImpactTimerRef.current);
    setEminencePanelImpact({ key, amount });
    eminencePanelImpactTimerRef.current = setTimeout(() => {
      setEminencePanelImpact(prev => prev?.key === key ? null : prev);
      eminencePanelImpactTimerRef.current = null;
    }, 900);
  }, []);
  useEffect(() => () => {
    if (eminencePanelImpactTimerRef.current) clearTimeout(eminencePanelImpactTimerRef.current);
  }, []);
  /** Pulse rings that appear on the Hand tab when a forged card is absorbed. */
  /** Opponent forge fly-to-chip animation — card shrinks and flies into the opponent's chip. */
  const [opponentForgeAbsorb, setOpponentForgeAbsorb] = useState<{
    key: number;
    playerId: string;
    targetKind?: 'opponent' | 'lumii';
    card: ArtifactCard;
    tier: number;
    startRect: { x: number; y: number; w: number; h: number };
    chipCenter: { x: number; y: number };
    ownerName?: string;
    eminence: number;
    eminenceTotal?: number;
    spentColors?: AffinityKey[];
    isForgottenForge?: boolean;
  } | null>(null);
  const opponentForgeAbsorbKeyRef = useRef(0);
  const [opponentEminenceImpact, setOpponentEminenceImpact] = useState<{
    key: number;
    playerId: string;
    amount: number;
  } | null>(null);
  const opponentEminenceImpactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentEminenceImpactDelayTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const triggerOpponentEminenceImpact = useCallback((playerId: string, amount: number) => {
    if (amount <= 0) return;
    const key = Date.now();
    if (opponentEminenceImpactTimerRef.current) clearTimeout(opponentEminenceImpactTimerRef.current);
    setOpponentEminenceImpact({ key, playerId, amount });
    opponentEminenceImpactTimerRef.current = setTimeout(() => {
      setOpponentEminenceImpact(prev => prev?.key === key ? null : prev);
      opponentEminenceImpactTimerRef.current = null;
    }, 1050);
  }, []);
  useEffect(() => () => {
    if (opponentEminenceImpactTimerRef.current) clearTimeout(opponentEminenceImpactTimerRef.current);
    for (const timer of opponentEminenceImpactDelayTimersRef.current) clearTimeout(timer);
    opponentEminenceImpactDelayTimersRef.current = [];
  }, []);
  const scheduleOpponentEminenceImpact = useCallback((
    playerId: string,
    amount: number,
    eminenceAfter: number,
    victoryTarget: number,
  ) => {
    if (amount <= 0) return;
    gameAudio.playEminenceSeal(amount, eminenceAfter, victoryTarget);
    const timer = setTimeout(() => {
      triggerOpponentEminenceImpact(playerId, amount);
      opponentEminenceImpactDelayTimersRef.current =
        opponentEminenceImpactDelayTimersRef.current.filter((candidate) => candidate !== timer);
    }, 1450);
    opponentEminenceImpactDelayTimersRef.current.push(timer);
  }, [triggerOpponentEminenceImpact]);
  const triggerOpeningBalanceImpact = useCallback((playerId: string, amount: number) => {
    if (amount <= 0) return;
    if (playerId === session?.playerId) {
      triggerEminencePanelImpact(amount);
      return;
    }
    triggerOpponentEminenceImpact(playerId, amount);
  }, [session?.playerId, triggerEminencePanelImpact, triggerOpponentEminenceImpact]);
  const [luminaryEminenceBurst, setLuminaryEminenceBurst] = useState<{
    key: number;
    eventId: string;
    luminaryId: string;
    luminaryName: string;
    playerId: string;
    playerName: string;
    amount: number;
    eminenceAfter: number;
    color: string;
    secondaryColor?: string;
    originRect?: { left: number; top: number; width: number; height: number } | null;
    targetRect?: { left: number; top: number; width: number; height: number } | null;
  } | null>(null);
  const pendingLuminaryEminenceBurstsRef = useRef<Array<{
    eventId: string;
    luminaryId: string;
    luminaryName: string;
    playerId: string;
    playerName: string;
    amount: number;
    eminenceAfter: number;
    color: string;
    secondaryColor?: string;
  }>>([]);
  const luminaryEminenceBurstKeyRef = useRef(0);
  const luminaryEminenceBurstTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Hand-tab absorb flash — fires when an abridged-mode local forge card arrives at the Civilization tab. */
  const [handTabAbsorbFlash, setHandTabAbsorbFlash] = useState<{
    key: number; pos: { x: number; y: number }; color: string; size?: number; isCivilization?: boolean;
  } | null>(null);
  const resolveLocalForgeDestination = useCallback((): ForgeDestination | undefined => {
    const civTarget = getVisibleElementRect('[data-civilization-drop-target]');
    if (civTarget) {
      const { rect } = civTarget;
      return {
        kind: 'civilization',
        targetSelector: '[data-civilization-drop-target]',
        pos: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      };
    }

    const handTab = getVisibleElementRect('[data-nav-hand]');
    if (!handTab) return undefined;
    const { rect } = handTab;
    return {
      kind: 'tab',
      targetSelector: '[data-nav-hand]',
      pos: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    };
  }, []);
  const flashForgeDestination = useCallback((destination: ForgeDestination | undefined, card: ArtifactCard) => {
    const glowColor = AFFINITY_META[card.bonusAffinity as AffinityKey]?.glowHex ?? '#C0A472';
    const target = destination?.targetSelector ? getVisibleElementRect(destination.targetSelector) : null;
    const pos = target
      ? { x: target.rect.left + target.rect.width / 2, y: target.rect.top + target.rect.height / 2 }
      : destination?.pos;
    if (!pos) return;

    const isCivilization = destination?.kind === 'civilization';
    const size = isCivilization && target
      ? Math.min(180, Math.max(76, Math.min(target.rect.width, target.rect.height) * 0.55))
      : 52;

    setHandTabAbsorbFlash({
      key: Date.now(),
      pos,
      color: glowColor,
      size,
      isCivilization,
    });
    setTimeout(() => setHandTabAbsorbFlash(null), isCivilization ? 900 : 700);

    if (isCivilization && target) {
      target.el.animate([
        {
          transform: 'translateZ(0) scale(1)',
          boxShadow: '0 0 0 0 rgba(0,0,0,0), inset 0 0 0 0 rgba(0,0,0,0)',
        },
        {
          transform: 'translateZ(0) scale(1.012)',
          boxShadow: `0 0 0 1px ${glowColor}, 0 0 34px 6px ${glowColor}55, inset 0 0 42px 4px ${glowColor}26`,
        },
        {
          transform: 'translateZ(0) scale(1)',
          boxShadow: '0 0 0 0 rgba(0,0,0,0), inset 0 0 0 0 rgba(0,0,0,0)',
        },
      ], {
        duration: 920,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      });
    }
  }, []);

  // Start the response at tap-time, not at the later WebSocket/REST update.
  // The full card flight still waits for the server-confirmed move, but this
  // short ignition makes the selected Artifact feel immediately committed.
  const triggerForgeIgnition = useCallback((cardId: string) => {
    const source = document.querySelector<HTMLElement>(
      `[data-card-id="${cardId}"], [data-reserved-card-id="${cardId}"]`,
    );
    if (!source) return;
    source.animate([
      { transform: 'translateZ(0) scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 rgba(192,164,114,0)' },
      { transform: 'translateZ(0) translateY(-3px) scale(1.025)', filter: 'brightness(1.3)', boxShadow: '0 0 22px rgba(255,226,142,0.8)' },
      { transform: 'translateZ(0) scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 rgba(192,164,114,0)' },
    ], {
      duration: 360,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    });
  }, []);
  const traceOpponentActionOwner = useCallback((playerId: string, accent = '#a8c5ff') => {
    const chip = document.querySelector<HTMLElement>(`[data-opponent-chip="${playerId}"]`);
    if (!chip) return;
    chip.animate([
      {
        transform: 'translateZ(0) scale(1)',
        filter: 'brightness(1)',
        boxShadow: '0 0 0 rgba(0,0,0,0)',
      },
      {
        transform: 'translateZ(0) scale(1.035)',
        filter: 'brightness(1.28)',
        boxShadow: `0 0 0 1px ${accent}aa, 0 0 18px ${accent}55`,
      },
      {
        transform: 'translateZ(0) scale(1)',
        filter: 'brightness(1)',
        boxShadow: '0 0 0 rgba(0,0,0,0)',
      },
    ], {
      duration: 620,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    });
  }, []);
  const planSubmitInFlight = useRef(false);
  const lastPlannedCancelNoticeRef = useRef<string | null>(null);
  const [affinityBurst, setAffinityBurst] = useState<{
    key: number;
    affinities: AffinityKey[];
    playerId: string;
    playerName: string;
    avatarId: string | null;
    targetKind?: 'opponent' | 'lumii';
  } | null>(null);
  const affinityBurstKeyRef = useRef(0);
  const affinityBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTakeBurstActionRef = useRef<string | null>(null);
  // True when the optimistic token flip already fired from a direct Harness.
  // Lets the WS handler skip normal repeats while still animating planned
  // Harness actions, which skip the direct interaction path.
  const optimisticHarnessFiredRef = useRef(false);
  const reserveBurstActionRef = useRef<string | null>(null);
  const lastForgeBurstActionRef = useRef<string | null>(null);
  const optimisticLocalForgeRef = useRef<{
    cardId: string;
    slotKey: string;
    startedAt: number;
    burstKey: number;
  } | null>(null);
  const cardSheetContainerRef = useRef<HTMLElement | null>(null);
  const reservedOverlayContainerRef = useRef<HTMLElement | null>(null);
  const deckSheetContainerRef = useRef<HTMLElement | null>(null);
  const rulesSheetContainerRef = useRef<HTMLElement | null>(null);
  const forgedOverlayContainerRef = useRef<HTMLElement | null>(null);
  const burnPileOverlayContainerRef = useRef<HTMLElement | null>(null);
  const luminarySheetContainerRef = useRef<HTMLElement | null>(null);
  const winOverlayContainerRef = useRef<HTMLElement | null>(null);
  const [selectedLuminary, setSelectedLuminary] = useState<Luminary | null>(null);
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
  const [forgedFilter, setForgedFilter] = useState<AffinityKey | null>(null);
  const [showBurnPileOverlay, setShowBurnPileOverlay] = useState(false);
  const [showReservedOverlay, setShowReservedOverlay] = useState(false);
  const [expandedOpponents, setExpandedOpponents] = useState<Set<string>>(new Set());
  const [expandedHeaderOpponents, setExpandedHeaderOpponents] = useState<Set<string>>(new Set());
  const [boardOpponentsExpanded, setBoardOpponentsExpanded] = useState(false);
  const [boardExpandedOpponentId, setBoardExpandedOpponentId] = useState<string | null>(null);
  const [showDevSequenceLab, setShowDevSequenceLab] = useState(
    () => import.meta.env.DEV
      && new URLSearchParams(window.location.search).get('debugCutscene') === '1',
  );
  const [devSequencePlaybackMode, setDevSequencePlaybackMode] =
    useState<DevSequencePlaybackMode>('canonical');
  const [expandedLumEffects, setExpandedLumEffects] = useState<Set<string>>(new Set());
  const [arrivalQueue, setArrivalQueue] = useState<Array<{
    id: string; name: string; domain: string; eminence: number; flavor: string;
    claimedBy?: string; // player name who claimed this Luminary
    claimedByPlayerId?: string; // stable player id for the Eminence burst target
    cardRect?: { cx: number; cy: number; w: number };
    boardSnapshot?: ArrivalBoardSnapshot;
    eventId: string;    // stable server event ID (or 'dev-test-<id>' for dev panel)
    isDevTest: boolean; // dev tests skip the server resolve_arrival call
    winSealingColor?: string; // arrivalColor of the Luminary when this event seals a win
  }>>([]);
  // Tracks which server arrival eventIds have already been pushed into the queue
  // so that duplicate WebSocket / reconnect deliveries are safely deduped.
  // Uses the HMR-persistent Set so React Fast Refresh remounts cannot reset it.
  const handledArrivalEventIdsRef = useRef(handledArrivalEventIds);
  // True when the user pressed "Skip view" on the active cutscene.
  // The cutscene stays mounted (timer runs) but the overlay is hidden.
  const [localArrivalSkipped, setLocalArrivalSkipped] = useState(false);
  // Prevents the initial-state pending-arrival check from running twice.
  const checkedInitialArrivalRef = useRef(false);
  // Stable ref to enqueueArrival — populated after it is defined below (after
  // the early return) so the initial-load useEffect can call it safely.
  const enqueueArrivalRef = useRef<(
    lumId: string,
    lumName: string,
    lumDomain: string,
    lumEminence: number,
    lumFlavor: string,
    eventId: string,
    isDevTest: boolean,
    winSealingColor?: string,
    claimedBy?: string,
    claimedByPlayerId?: string,
  ) => void>(() => {});
  // Luminary IDs that have been detected as newly arrived in processUpdate but
  // whose arrivalQueue entry hasn't been added yet (RAF chain pending). Used to
  // suppress the vortex portal during those few frames so it never flashes
  // before the cutscene starts. Cleared when the entry lands in arrivalQueue.
  const pendingSuppressArrivalIdsRef = useRef(new Set<string>());
  // Tracks current arrivalQueue length for stale-closure-safe reads inside processUpdate.
  const arrivalQueueLenRef = useRef(0);
  // Counts arrival events that have been dispatched to enqueueArrival but have not
  // yet landed in arrivalQueue (i.e. still mid-RAF-chain). The flush effect uses
  // this to avoid releasing pendingGameOver before the cutscenes actually start.
  const enqueuingCountRef = useRef(0);
  // Prevents repeated render diagnostics from logging on every React render.
  const renderedArrivalEventIdRef = useRef<string | null>(null);
  // True when status just became 'finished' but arrivals are still in flight.
  // The win overlay and win audio are held back until the arrival queue drains.
  const [pendingGameOver, setPendingGameOver] = useState(false);
  const [showCinematic, setShowCinematic] = useState(() => !getSkipCinematics());
  const [showWinOverlay, setShowWinOverlay] = useState(true);
  const returnBannerRef = useRef<HTMLButtonElement | null>(null);
  // arrivalColor of the Luminary that sealed the game (set when pendingGameOver goes
  // true). Read by the flush effect to play the affinity fanfare before playWin().
  const pendingGameOverLumColorRef = useRef<string>('');
  // Guard that prevents the flush effect from firing the fanfare twice if the
  // arrivalQueue.length dep oscillates while pendingGameOver is still true.
  const fanfareFiredForGameOverRef = useRef(false);
  // Guard that prevents the initial-load win fanfare from firing more than once
  // per component lifetime (covers page reloads, spectators, latecomers).
  const winFanfareOnLoadFiredRef = useRef(false);
  // True once status transitions to 'finished' — prevents doEnqueueArrival from pushing
  // new arrivals after the game ends (only the already-active cutscene is allowed to finish).
  const gameFinishedRef = useRef(false);
  // ── Activation cinematic queue ─────────────────────────────────────────────
  // Every activation event owns the resolution lane until its board effect and
  // aftermath have resolved or been skipped.
  const [activationQueue, setActivationQueue] = useState<PendingLuminaryActivationEvent[]>([]);
  const [luminaryEffectReceipts, setLuminaryEffectReceipts] = useState<LuminaryEffectReceiptData[]>([]);
  const activationQueueWasPopulatedRef = useRef(false);
  const publishLuminaryEffectReceipt = useCallback((
    event: PendingLuminaryActivationEvent,
    luminary: Luminary | undefined,
    player: GamePlayerState | undefined,
  ) => {
    const effectName = luminary?.effectName ?? luminary?.name ?? 'Luminary effect';
    const receipt: LuminaryEffectReceiptData = {
      eventId: event.eventId,
      effectName,
      luminaryName: luminary?.name,
      triggeringPlayerName: player?.playerName,
      result: getLuminaryEffectResultReceiptCopy(event, {
        effectName,
        effectDescription: luminary?.effectDescription,
      }),
      primaryColor: luminary?.summonColor ?? '#d6a24f',
      secondaryColor: luminary?.summonSecondaryColor,
    };
    setLuminaryEffectReceipts(current => {
      if (current.some(item => item.eventId === event.eventId)) return current;
      return [...current, receipt].slice(-4);
    });
  }, []);
  useEffect(() => {
    const queueIsPopulated = activationQueue.length > 0;
    if (queueIsPopulated && !activationQueueWasPopulatedRef.current) {
      setLuminaryEffectReceipts([]);
    }
    activationQueueWasPopulatedRef.current = queueIsPopulated;
  }, [activationQueue.length]);
  const [preparedRectDirectorEventId, setPreparedRectDirectorEventId] = useState<string | null>(null);
  const activationSequenceProgressRef = useRef({
    headEventId: null as string | null,
    position: 0,
    total: 0,
  });
  // Animation locks created by an activation may overlap its own final frames,
  // but must block the next queue entry until that aftermath has resolved.
  const activationAftermathOwnerEventIdRef = useRef<string | null>(null);
  // Tracks current activationQueue length for stale-closure-safe reads inside the anim-detect
  // effect (mirrors arrivalQueueLenRef). Used to decide whether the brand-strike path may
  // orchestrate the camera — it must not while an activation cinematic owns the view.
  const activationQueueLenRef = useRef(0);
  const handledActivationEventIdsRef = useRef(new Set<string>());
  // Server acknowledgements are withheld until the complete local activation
  // queue and all of its aftermath are finished. This prevents a fast overlay
  // dismissal from releasing end/start-turn logic while board effects still run.
  const pendingActivationServerResolutionsRef = useRef(new Set<string>());
  const executeActionRef = useRef<(payload: ExecuteActionPayload) => Promise<void>>(
    async () => {},
  );
  const luminaryAcknowledgementChainRef = useRef<Promise<void>>(Promise.resolve());
  const acknowledgeLuminaryEventsInOrder = useCallback((payloads: ExecuteActionPayload[]) => {
    if (payloads.length === 0) return;
    luminaryAcknowledgementChainRef.current = luminaryAcknowledgementChainRef.current
      .catch(() => undefined)
      .then(async () => {
        for (const payload of payloads) {
          await executeActionRef.current(payload);
        }
      });
  }, []);
  const [activationResolutionRevision, setActivationResolutionRevision] = useState(0);
  const queueActivationServerResolution = (eventId: string) => {
    if (pendingActivationServerResolutionsRef.current.has(eventId)) return;
    pendingActivationServerResolutionsRef.current.add(eventId);
    setActivationResolutionRevision(revision => revision + 1);
  };
  // Brand strikes deferred while an arrival cutscene is in progress. Flushed
  // when the arrival resolves so that effect animations never fire while the
  // summoning is still playing. Each entry carries the full orchestration data
  // (source Luminary, instant flag) so the post-arrival flush can run the same
  // camera-orchestrated beam + badge sequence as the immediate path.
  const deferredBrandStrikesRef = useRef<Array<{
    ids: string[];
    markers: Record<string, { type: string }>;
    srcMeta: { lumId: string } | null;
    srcLum: Luminary | undefined;
    instant: boolean;
  }>>([]);
  // Activation events deferred while an arrival cutscene is in progress. Flushed
  // when the arrival resolves so that effect cinematics never start before the
  // summoning is fully dismissed.
  const deferredActivationEventsRef = useRef<PendingLuminaryActivationEvent[]>([]);
  // Non-Ember burn visuals that arrived in the same state update as a summon or
  // activation cinematic. The engine state is already correct, but the badge,
  // burn flash, chip pulse, and refill pulse wait for the visual effect phase.
  const deferredNormalBurnsRef = useRef<LuminaryBurnVisualEntry[]>([]);
  // Summon activation effects are locked by Luminary ID from the moment an
  // arrival event is detected until that Luminary's post-cutscene return flight
  // has settled. This covers the React gap where pendingSummonEvents may already
  // be known but arrivalQueue has not mounted yet.
  const summonActivationLocksRef = useRef(new Set<string>());
  // Slot rects for lum_ember end_of_turn burns — captured during state-diff
  // BurnFlash detection before the director mounts. The CinderMandateBurnDirector
  // receives this as a prop snapshot and fires BurnFlash at its own timeline point.
  // Written by processUpdate; cleared to [] at the start of each new lum_ember burn batch.
  const pendingDirectorBurnSlotsRef = useRef<DirectorBurnSlot[]>([]);
  // Slot keys that currently have condemned ghost cards set by the director.
  // Tracked separately so onBurnComplete can clear them even if onRefillPulse was skipped.
  const directorGhostSlotKeysRef = useRef<string[]>([]);
  const pendingIronHarbingerSlotsRef = useRef<IronHarbingerResetSlot[]>([]);
  const ironHarbingerGhostSlotKeysRef = useRef<string[]>([]);
  const pendingPhoenixRefillSlotsRef = useRef<string[]>([]);
  const pendingAssimilationSlotRef = useRef<AssimilationVisualSlot | null>(null);
  // IDs of luminaries claimed in this session — their entity overlay persists.
  const [claimedThisSession, setClaimedThisSession] = useState<string[]>([]);
  // IDs whose server-side claim has landed, but whose board portal/vortex should
  // stay visually sealed until the arrival cutscene and return flight finish.
  const [arrivalVisualHoldIds, setArrivalVisualHoldIds] = useState<string[]>([]);
  const arrivalVisualHoldIdsRef = useRef(new Set<string>());
  // IDs currently in the post-cutscene return flight. Effects and claimed
  // portal visuals are held until this settles.
  const [returningLuminaryIds, setReturningLuminaryIds] = useState<string[]>([]);
  const returningLuminaryIdsRef = useRef(new Set<string>());
  const pendingReturnLuminaryIdsRef = useRef<string[]>([]);
  const resolvedArrivalEventIdsRef = useRef(new Set<string>());
  const pendingArrivalServerResolutionsRef = useRef<Array<{
    eventId: string;
    luminaryId: string;
  }>>([]);
  const holdArrivalVisual = (lumId: string) => {
    arrivalVisualHoldIdsRef.current.add(lumId);
    setArrivalVisualHoldIds(prev => prev.includes(lumId) ? prev : [...prev, lumId]);
  };
  const releaseArrivalVisuals = (lumIds: string[]) => {
    if (lumIds.length === 0) return;
    const releaseSet = new Set(lumIds);
    releaseSet.forEach(id => arrivalVisualHoldIdsRef.current.delete(id));
    setArrivalVisualHoldIds(prev => prev.filter(id => !releaseSet.has(id)));
  };
  const startReturningLuminary = (lumId: string) => {
    returningLuminaryIdsRef.current.add(lumId);
    setReturningLuminaryIds(prev => prev.includes(lumId) ? prev : [...prev, lumId]);
    if (!pendingReturnLuminaryIdsRef.current.includes(lumId)) {
      pendingReturnLuminaryIdsRef.current.push(lumId);
    }
  };
  const finishReturningLuminaries = (lumIds: string[]) => {
    if (lumIds.length === 0) return;
    const releaseSet = new Set(lumIds);
    releaseSet.forEach(id => returningLuminaryIdsRef.current.delete(id));
    setReturningLuminaryIds(prev => prev.filter(id => !releaseSet.has(id)));
    setClaimedThisSession(prev => {
      const next = [...prev];
      for (const id of lumIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
    releaseArrivalVisuals(lumIds);
  };
  // DEV-only: luminary IDs whose portal visual is toggled on for local preview.
  // Client-side only — never written to the server.
  const [turnAnnouncement, setTurnAnnouncement] = useState<{
    key: number;
    turnIdentity: string;
    playerName: string;
    avatarId: string | null;
    isYou: boolean;
    accentColor: string;
    eminence: number;
    turnStartedAt: number;
    timerSeconds: number | null;
  } | null>(null);
  const [turnOrderIntro, setTurnOrderIntro] = useState<TurnOrderIntroState | null>(null);
  const turnOrderIntroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnOrderIntroKeyRef = useRef(0);
  const pendingTurnOrderIntroIdRef = useRef<string | null>(null);
  const turnAnnounceKeyRef = useRef(0);
  const turnAnnounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncedTurnRef = useRef<string | null>(null);
  const plannedActionCommitInFlightRef = useRef<string | null>(null);
  const initialTurnFiredRef = useRef(false);
  const [turnPresentationPending, setTurnPresentationPending] = useState(false);
  const [completedTurnPresentationKey, setCompletedTurnPresentationKey] = useState<string | null>(null);
  const animationEndTimeRef = useRef(0);
  // Timer handle for the animation-barrier delay before the victory cinematic starts.
  // Cleared on unmount to prevent a stale callback firing after navigation.
  const winBarrierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stores remaining barrier ms captured in the arrival path so the pendingGameOver
  // flush effect can still respect it (arrival cutscene always outlasts typical anims,
  // so this resolves to 0 in practice but keeps the logic consistent).
  const animBarrierMsRef = useRef(0);
  const pendingTurnAnnounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animationLockUntil, setAnimationLockUntil] = useState(0);
  const processUpdateRef = useRef<(s: GameState) => void>(() => {});
  // Tracks WS health so the REST poll can back off to 30 s when the socket is
  // live. Updated inline on each render (safe — refs are always current inside
  // the refetchInterval callback which runs outside the render cycle).
  const wsConnectedRef = useRef(false);

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
  const canReplaySameBoard = Boolean(
    (state as (GameState & { canReplaySameBoard?: boolean }) | undefined)?.canReplaySameBoard
  );
  const devLumiiEncounter = useMemo(
    () => import.meta.env.DEV && new URLSearchParams(window.location.search).get('devLumiiEncounter') === '1',
    [],
  );
  const isActualLumiiScenario = state?.scenarioId === LUMII_CLEARANCE_SCENARIO_ID;
  const isLumiiScenario = isActualLumiiScenario || devLumiiEncounter;
  const lumiiForecastActive = isLumiiScenario && state?.status === 'playing';
  const lumiiPresentationLocked = isLumiiScenario;
  const effectiveBlueprintPresentationReducedMotion = lumiiPresentationLocked
    ? abridgedAnims
    : abridgedAnims || skipCinematics;
  const effectiveLuminaryPlaybackMode: LuminaryPlaybackMode = lumiiPresentationLocked
    ? 'standard'
    : luminaryPlaybackMode;
  const [showLumiiWithdrawConfirm, setShowLumiiWithdrawConfirm] = useState(false);
  const [lumiiWithdrawPending, setLumiiWithdrawPending] = useState(false);
  const [lumiiChallengeAgainAvailable, setLumiiChallengeAgainAvailable] = useState(false);
  const [devLumiiCommentary, setDevLumiiCommentary] = useState<string | null>(null);

  const { data: loreCatalog } = useGetCardLoreCatalog();

  useEffect(() => {
    if (lumiiForecastActive && activeTab !== 'board') setActiveTab('board');
  }, [activeTab, lumiiForecastActive]);

  useEffect(() => {
    const defeated = isActualLumiiScenario && state?.status === 'finished' &&
      state.finishReason !== 'withdrawal' && state.winnerId !== session?.playerId;
    if (!defeated) {
      setLumiiChallengeAgainAvailable(false);
      return;
    }
    const accountSession = getAccountSession();
    if (!accountSession?.token) return;
    let cancelled = false;
    void apiGetBlueprintVault(accountSession.token)
      .then((vault) => {
        if (!cancelled) setLumiiChallengeAgainAvailable(vault.clearance.status === 'challenge_ready');
      })
      .catch(() => {
        if (!cancelled) setLumiiChallengeAgainAvailable(false);
      });
    return () => { cancelled = true; };
  }, [isActualLumiiScenario, session?.playerId, state?.finishReason, state?.status, state?.winnerId]);

  const [cardActionBurst, setCardActionBurst] = useState<{
    key: number;
    card: ArtifactCard;
    tier: number;
    playerName: string;
    avatarId: string | null;
    eminence: number;
    gotSingularity: boolean;
    startRect: { x: number; y: number; w: number; h: number };
    /** Center of the nav tab the card should fly into at the end of the burst.
     *  Undefined for remote-player Forges; the card shrinks in place. */
    destPos?: { x: number; y: number };
    destKind?: ForgeDestinationKind;
    destTargetSelector?: string;
    /** Which affinity colors the player spent (for energy-stream animation). */
    spentColors: AffinityKey[];
    isForgottenForge?: boolean;
  } | null>(null);
  const cardActionBurstKeyRef = useRef(0);
  const [forgeTrapHandoff, setForgeTrapHandoff] = useState<{
    kind: 'local' | 'opponent';
    key: number;
    stampedAt: number;
  } | null>(null);
  const trapForgeHandoffEventRef = useRef<string | null>(null);
  const markForgeTrapHandoff = useCallback((kind: 'local' | 'opponent', key: number) => {
    setForgeTrapHandoff((current) => {
      if (current?.kind === kind && current.key === key) return current;
      return { kind, key, stampedAt: Date.now() };
    });
  }, []);
  const cardAnimTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [lumiiHudAbsorbPulse, setLumiiHudAbsorbPulse] = useState<{ key: number } | null>(null);
  const lumiiHudAbsorbPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerLumiiHudAbsorbPulse = useCallback(() => {
    const key = Date.now();
    if (lumiiHudAbsorbPulseTimerRef.current) clearTimeout(lumiiHudAbsorbPulseTimerRef.current);
    setLumiiHudAbsorbPulse({ key });
    lumiiHudAbsorbPulseTimerRef.current = setTimeout(() => {
      setLumiiHudAbsorbPulse((current) => current?.key === key ? null : current);
      lumiiHudAbsorbPulseTimerRef.current = null;
    }, 900);
  }, []);
  useEffect(() => () => {
    if (lumiiHudAbsorbPulseTimerRef.current) clearTimeout(lumiiHudAbsorbPulseTimerRef.current);
  }, []);
  const scheduleLumiiHudAbsorbPulse = useCallback((delayMs: number) => {
    const timer = setTimeout(triggerLumiiHudAbsorbPulse, delayMs);
    cardAnimTimersRef.current.push(timer);
  }, [triggerLumiiHudAbsorbPulse]);
  const [cipherBurst, setCipherBurst] = useState<{
    key: number;
    sourceRect: { x: number; y: number; w: number; h: number };
    affinityHex: string;
    cardName: string;
    gotSingularity: boolean;
    card: ArtifactCard;
    tier: number;
    destPos?: { x: number; y: number };
    ownerName?: string;
    concealed?: boolean;
  } | null>(null);
  const cipherBurstKeyRef = useRef(0);
  const cipherBurstIsDeckRef = useRef(false);
  const [singularityAbsorbKey, setSingularityAbsorbKey] = useState(0);
  const [hiddenSlots, setHiddenSlots] = useState<Set<string>>(new Set());
  // Ghost Artifacts keep the previous Forge faces visible while waiting for
  // burst animations to start (during queue-drain delay).  Keyed by slotKey so
  // multiple simultaneous Forge actions can retain independent ghosts. A slot's
  // ghost is cleared atomically with setCardActionBurst / setCipherBurst so the
  // card transitions directly from "in slot" to "flying in overlay" with no flash.
  const [burstGhostCards, setBurstGhostCards] = useState<Record<string, ArtifactCard>>({});
  const [ironHarbingerGhostIds, setIronHarbingerGhostIds] = useState<Record<string, string>>({});
  // Persistent marker-type fallback for ghost cards (keyed by card ID).
  // Captured at ghost-creation time (before setQueryData wipes state.artifactMarkers).
  // Used so the condemned/forgotten badge stays visible on a ghost card even after
  // strikeAuraMap times out (~3.8–4.3 s) but before the drain gate opens (~5.7 s).
  const ghostArtifactMarkerTypesRef = useRef<Map<string, string>>(new Map());
  const [flippingCards, setFlippingCards] = useState<Set<string>>(new Set());
  const flippingCardsRef = useRef<Set<string>>(new Set());
  flippingCardsRef.current = flippingCards;
  // Fire-and-forget ghost independent of flippingCards so pre-cleanup can't kill it mid-flight.
  const [compactGhost, setCompactGhost] = useState<{
    id: string;
    cardViewProps: React.ComponentProps<typeof ArtifactCardView>;
    chipRect: DOMRect;
  } | null>(null);
  // v0.8 Luminary animation state
  const burnChipAnim = useAnimation();
  const burnChipArrivalAnim = useAnimation();
  const [burnFlashes, setBurnFlashes] = useState<Array<{ id: string; slotRect: DOMRect; sourceLuminaryId?: string }>>([]);
  const [burnBadgeOverlays, setBurnBadgeOverlays] = useState<Array<{ id: string; slotRect: DOMRect }>>([]);
  const [delayedEffectFloatQueue, setDelayedEffectFloatQueue] = useState<DelayedLuminaryResultRequest[]>([]);
  const [activeDelayedEffectFloat, setActiveDelayedEffectFloat] = useState<ActiveDelayedLuminaryResult | null>(null);
  const [bloomSeedParticles, setBloomSeedParticles] = useState<Array<{ id: string; from: DOMRect; to: DOMRect }>>([]);
  const [burnPileParticles, setBurnPileParticles] = useState<Array<{ id: string; from: DOMRect; to: DOMRect }>>([]);
  const [archiveReturnParticles, setArchiveReturnParticles] = useState<Array<{ id: string; cardId: string; from: DOMRect; to: DOMRect }>>([]);
  const [burnChipSparks, setBurnChipSparks] = useState<Array<{ id: string; chipRect: DOMRect; angleSeed: number }>>([]);
  const [orchardCopyPulseKey, setOrchardCopyPulseKey] = useState(0);
  const [showSeedBoardEffect, setShowSeedBoardEffect] = useState(false);
  const orchardPortalRectRef = useRef<DOMRect | null>(null);
  // Luminary currently undergoing an arrival-flash animation (zoom + flash effect)
  const [flashLumId, setFlashLumId] = useState<string | null>(null);
  // Forge redraws are manifested inside their persistent molds. Each cue owns
  // its delay/cause so single replacements and mass Luminary cascades share one
  // visual language without cloning cards across the viewport.
  const [refillingSlots, setRefillingSlots] = useState<Map<string, MoldCastCue>>(new Map());
  const moldCastSequenceRef = useRef(0);
  const moldCastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingBlueprintMoldCastsRef = useRef<Map<string, {
    card: ArtifactCard;
    tier: number;
    slotKey: string;
  }>>(new Map());
  const [archiveManifestationTraces, setArchiveManifestationTraces] = useState<Array<{
    id: string;
    cardId: string;
    tier: number;
    deckRect: { x: number; y: number; w: number; h: number };
    slotRect: { x: number; y: number; w: number; h: number };
    delayMs: number;
  }>>([]);
  // Artifact IDs whose Forge-marker badge was just applied (drives the isNew animation).
  const [newlyMarkedCardIds, setNewlyMarkedCardIds] = useState<Set<string>>(new Set());
  // Card IDs whose newly placed markers are visually suppressed until the brand-strike beam
  // lands on them. Added when markers arrive (during an arrival cutscene or camera hold) and
  // cleared when fireBrandStrikes runs. Stale entries from burned/forged Artifacts
  // are swept on every artifactMarkers change so the set never leaks.
  const [suppressedMarkerIds, setSuppressedMarkerIds] = useState<Set<string>>(new Set());
  // Brand-specific reveal receipts prevent authoritative state from exposing a
  // new persistent brand before its matching presentation strike.
  const [revealedBrandKeys, setRevealedBrandKeys] = useState<Set<string>>(new Set());

  // Pending ArrivalBrandStrike entries — beam + large brand animations for newly-placed markers.
  // `source` carries the originating Luminary portal rect + colors (camera-orchestrated path only);
  // `orchestrated`/`restoreImmediate` tell the render site to release the camera when the strike ends.
  const [brandStrikes, setBrandStrikes] = useState<Array<{
    id: string;
    strikes: BrandStrikeTarget[];
    source?: { rect: { x: number; y: number; w: number; h: number }; primary: string; secondary: string };
    orchestrated?: boolean;
    restoreImmediate?: boolean;
  }>>([]);
  // Per-card brand delay (ms) so each badge springs in after its own beam settles
  const [brandDelayMap, setBrandDelayMap] = useState<Map<string, number>>(new Map());
  // Per-card electric aura state — present while the lingering discharge is active
  // after a brand strike. Cleared ~3.4s after the last card is hit.
  const [strikeAuraMap, setStrikeAuraMap] = useState<Map<string, { type: MarkerType; delay: number }>>(new Map());
  // Luminary id whose portal is currently glowing because a persistent-marker badge is
  // hovered/focused (source trace-back). null when nothing is traced.
  const [tracedSourceLumId, setTracedSourceLumId] = useState<string | null>(null);
  const prevStateForAnimRef = useRef<typeof state>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const audibleLuminaryEligibilityIdsRef = useRef<Set<string>>(new Set());
  const playerPanelRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const cameraControlledRef = useRef(false);
  const overlayOpenRef = useRef(false);

  const viewOrchestrator = useViewOrchestrator({
    forgeCompact: effectiveForgeCompact,
    setForgeCompact,
    boardRef: mainScrollRef,
    abridgedAnims,
  });

  // Build + dispatch ArrivalBrandStrike beam(s) for a set of newly-marked cards.
  // Captures each card's live DOM rect, queues the strike entry, and schedules the
  // staggered badge-pop windows. `opts.lead` bakes the source-pulse lead time into
  // every delay so beams begin only after the source portal has fired; `opts.source`
  // carries the originating portal rect + Luminary colors; `opts.orchestrated` /
  // `opts.restoreImmediate` flag the entry so the render site releases the camera when
  // the strike finishes. Returns the strike id, or null if nothing was drawn.
  const fireBrandStrikes = useCallback((
    ids: string[],
    markers: Record<string, { type: string }>,
    opts?: {
      source?: { rect: { x: number; y: number; w: number; h: number }; primary: string; secondary: string };
      lead?: number;
      orchestrated?: boolean;
      restoreImmediate?: boolean;
      staggerMs?: number;
    },
  ): string | null => {
    if (ids.length === 0) return null;
    // fireBrandStrikes called
    const lead = opts?.lead ?? 0;
    const staggerMs = Math.max(0, opts?.staggerMs ?? 90);
    const staggerEnvelopeMs = Math.max(0, ids.length - 1) * staggerMs;
    setNewlyMarkedCardIds(new Set(ids));
    // Brand lands at 420ms + 1.35s duration + stagger + buffer
    setTimeout(
      () => setNewlyMarkedCardIds(new Set()),
      2_200 + lead + staggerEnvelopeMs,
    );

    // Capture card DOM rects and build the beam strike list.
    const strikes: BrandStrikeTarget[] = [];
    ids.forEach((cardId, i) => {
      const el = document.querySelector(`[data-card-id="${cardId}"]`);
      if (!el) {
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0) {
        return;
      }
      strikes.push({
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        type: markers[cardId].type as BrandStrikeTarget['type'],
        delay: lead + i * staggerMs,
      });
    });
    // fireBrandStrikes captured strikes
    if (strikes.length === 0) return null;

    setRevealedBrandKeys(previous => {
      const next = new Set(previous);
      for (const cardId of ids) {
        const type = markers[cardId]?.type;
        if (isArtifactBrandType(type)) {
          next.add(getArtifactBrandVisibilityKey(cardId, type));
        }
      }
      return next;
    });

    const strikeId = `brand-${Date.now()}`;
    setBrandStrikes(prev => [
      ...prev,
      {
        id: strikeId,
        strikes,
        source: opts?.source,
        orchestrated: opts?.orchestrated,
        restoreImmediate: opts?.restoreImmediate,
      },
    ]);
    // Per-card delay map: badge springs in 150ms after impact (420ms) = 570ms
    const delayMap = new Map<string, number>();
    ids.forEach((cardId, i) => delayMap.set(cardId, lead + i * staggerMs + 570));
    setBrandDelayMap(delayMap);
    setTimeout(
      () => setBrandDelayMap(new Map()),
      2_200 + lead + staggerEnvelopeMs,
    );
    // Electric aura — starts at beam impact per card, lingers 3.2s
    const auraMap = new Map<string, { type: MarkerType; delay: number }>();
    ids.forEach((cardId, i) => {
      auraMap.set(cardId, {
        type: markers[cardId].type as MarkerType,
        delay: lead + i * staggerMs + 420,
      });
    });
    setStrikeAuraMap(auraMap);
    setTimeout(
      () => setStrikeAuraMap(new Map()),
      lead + staggerEnvelopeMs + 420 + 1_000,
    );
    return strikeId;
  }, []);

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
    return () => {
      gameAudio.resetTransientAudio();
      gameAudio.setEndgameIntensity(0);
      gameAudio.stopMusic();
    };
  }, []);

  useEffect(() => {
    const target = Math.max(1, Number(state?.victoryRequirement ?? 15));
    const leaderEminence = Math.max(0, ...(state?.players ?? []).map((p) => p.eminence ?? 0));
    const progress = leaderEminence / target;
    const intensity = Math.max(0, Math.min(1, (progress - 0.68) / 0.28));
    gameAudio.setEndgameIntensity(intensity);
  }, [state?.players, state?.victoryRequirement]);

  useEffect(() => {
    gameAudio.setLumiiScenarioActive(isActualLumiiScenario && state?.status === 'playing');
    return () => gameAudio.setLumiiScenarioActive(false);
  }, [isActualLumiiScenario, state?.status]);

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
      if (cameraControlledRef.current) return;
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
  const overlayStates = [!!selectedCard, showReservedOverlay, showForgedOverlay, showBurnPileOverlay, !!selectedLuminary, arrivalQueue.length > 0] as const;
  const isAnyOverlayOpen = overlayStates.some(Boolean);
  const summonSequenceActive = isLuminaryArrivalSequenceActive({
    arrivalQueueLength: arrivalQueue.length,
    visualHoldCount: arrivalVisualHoldIds.length,
    returningCount: returningLuminaryIds.length,
  });
  const activationGateSnapshot: LuminarySequenceGateSnapshot = {
    arrivalQueueLength: arrivalQueue.length,
    enqueuingCount: enqueuingCountRef.current,
    pendingSuppressCount: pendingSuppressArrivalIdsRef.current.size,
    visualHoldCount: arrivalVisualHoldIds.length,
    returningCount: returningLuminaryIds.length,
    pendingArrivalLuminaryIds: new Set<string>(),
    summonActivationLockedLuminaryIds: summonActivationLocksRef.current,
  };
  const activationGateActive = isLuminaryActivationGateActive(activationGateSnapshot);
  const activationHead = activationQueue[0] ?? null;
  const currentActivationGateDecision = activationHead
    ? getLuminaryActivationGateDecision(activationHead, activationGateSnapshot)
    : null;
  const currentActivationBlocked = currentActivationGateDecision ? !currentActivationGateDecision.allowed : false;
  const activationSequenceProgress = activationSequenceProgressRef.current;
  const activationHeadEventId = activationHead?.eventId ?? null;
  const queuedDelayedResult = delayedEffectFloatQueue[0] ?? null;
  const delayedResultBelongsToHead = delayedResultBelongsToActivation(
    queuedDelayedResult,
    activationHead,
  );
  const delayedResultBlocksCurrentActivation = !!(
    queuedDelayedResult &&
    activationHead &&
    !delayedResultBelongsToHead
  );
  const delayedLuminaryResultActive =
    activeDelayedEffectFloat !== null ||
    delayedResultBlocksCurrentActivation;
  const activationAftermathActive = isActivationAftermathInFlight(
    activationAftermathOwnerEventIdRef.current,
    animationLockUntil,
  );
  const activationAftermathBlocked = isActivationAftermathBlockingHead(
    activationAftermathOwnerEventIdRef.current,
    activationHeadEventId,
    animationLockUntil,
  );
  const devSequenceActive =
    import.meta.env.DEV && state?.devLuminarySequenceActive === true;
  const pendingArtifactBrandTypesByCardId = useMemo(
    () => getPendingArtifactBrandTypes(state?.pendingLuminaryActivationEvents),
    [state?.pendingLuminaryActivationEvents],
  );
  const suppressedBrandTypesByCardId = useMemo(() => {
    const result = new Map<string, ReadonlySet<string>>();
    for (const [cardId, types] of pendingArtifactBrandTypesByCardId) {
      const unrevealed = types.filter(type => (
        !revealedBrandKeys.has(getArtifactBrandVisibilityKey(cardId, type))
      ));
      if (unrevealed.length > 0) result.set(cardId, new Set(unrevealed));
    }
    return result;
  }, [pendingArtifactBrandTypesByCardId, revealedBrandKeys]);
  const luminaryPresentationSignals: LuminaryPresentationRuntimeSignals = {
    visibleArrivalActive: summonSequenceActive,
    activationGateActive,
    activationQueueLength: activationQueue.length,
    activationAftermathActive,
    activeDelayedResult: activeDelayedEffectFloat !== null,
    delayedResultQueueLength: delayedEffectFloatQueue.length,
    seedBoardEffectActive: showSeedBoardEffect,
    brandStrikeCount: brandStrikes.length,
    pendingTurnTransition: !!state?.pendingTurnTransition,
    pendingSummonCount: state?.pendingSummonEvents?.length ?? 0,
    pendingActivationCount: state?.pendingLuminaryActivationEvents?.length ?? 0,
    devSequenceActive,
    cameraSequenceActive: viewOrchestrator.isSequenceActive,
    cameraMotionActive:
      viewOrchestrator.isOrchestrating ||
      viewOrchestrator.isRestoring,
  };
  const luminaryPresentationEngine = useLuminaryPresentationEngine<GameState>({
    signals: luminaryPresentationSignals,
    getProcessedVersion: () => prevStateRef.current?.version,
    processAuthoritativeState: nextState => processUpdateRef.current(nextState),
    beginCameraSequence: viewOrchestrator.beginSequence,
    endCameraSequence: viewOrchestrator.endSequence,
  });
  const luminarySequenceStatus = luminaryPresentationEngine.status;
  const luminaryPresentationActive = luminarySequenceStatus.presentationActive;
  const authoritativeLuminaryResolutionActive =
    luminarySequenceStatus.authoritativeSequenceActive;
  const luminaryCameraSequenceRequested = luminarySequenceStatus.cameraLeaseRequested;
  const isCameraControlled = luminarySequenceStatus.cameraControlled;
  cameraControlledRef.current = isCameraControlled;
  useCameraInputLease({
    active: isCameraControlled,
    boardRef: mainScrollRef,
    passthroughRef: playerPanelRef,
  });
  const authoritativeStateIngress = luminaryPresentationEngine.ingress;
  const queuedStateCount = luminaryPresentationEngine.queuedStateCount;
  const devSequencePlaybackActive =
    import.meta.env.DEV && luminaryPresentationEngine.run.status === 'running';
  const devSequenceTimelineRate = devSequencePlaybackActive
    ? devSequencePlaybackMode === 'instant'
      ? 12
      : devSequencePlaybackMode === 'fast'
        ? 4
        : 1
    : 1;
  const effectiveLuminaryTimelineRate = lumiiPresentationLocked ? 1 : devSequenceTimelineRate;

  useEffect(() => {
    if (!devSequencePlaybackActive || devSequencePlaybackMode === 'canonical') return;
    const playbackRate = devSequencePlaybackMode === 'instant' ? 12 : 4;
    const accelerate = () => {
      for (const animation of document.getAnimations()) {
        if (animation.playState === 'running') animation.playbackRate = playbackRate;
      }
    };
    accelerate();
    const timer = setInterval(accelerate, 80);
    return () => clearInterval(timer);
  }, [devSequencePlaybackActive, devSequencePlaybackMode]);

  if (!activationHeadEventId) {
    activationSequenceProgress.headEventId = null;
    activationSequenceProgress.position = 0;
    activationSequenceProgress.total = 0;
  } else if (!activationSequenceProgress.headEventId) {
    activationSequenceProgress.headEventId = activationHeadEventId;
    activationSequenceProgress.position = 1;
    activationSequenceProgress.total = activationQueue.length;
  } else {
    if (activationSequenceProgress.headEventId !== activationHeadEventId) {
      activationSequenceProgress.headEventId = activationHeadEventId;
      activationSequenceProgress.position += 1;
    }
    activationSequenceProgress.total = Math.max(
      activationSequenceProgress.total,
      activationSequenceProgress.position + activationQueue.length - 1,
    );
  }

  // Delayed Luminary payoffs are semantic requests, not pre-captured screen
  // coordinates. A payoff waits for its own activation to complete, then plays
  // before the next activation may claim the presentation lane.
  useEffect(() => {
    const next = delayedEffectFloatQueue[0];
    const belongsToCurrentHead = delayedResultBelongsToActivation(next, activationHead);
    if (
      activeDelayedEffectFloat ||
      !next ||
      activationGateActive ||
      belongsToCurrentHead ||
      animationLockUntil > Date.now()
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setDelayedEffectFloatQueue(queue => (
        queue[0]?.id === next.id
          ? queue.slice(1)
          : queue.filter(entry => entry.id !== next.id)
      ));
      const luminaryElement = document.querySelector(
        `[data-luminary-id="${next.luminaryId}"]`,
      );
      const originRect = luminaryElement?.getBoundingClientRect();
      if (originRect && originRect.width > 0 && originRect.height > 0) {
        if (next.luminaryId === 'lum_orchard') {
          orchardPortalRectRef.current = originRect;
          setOrchardCopyPulseKey(key => key + 1);
        }
        const owner = state?.players.find(player => (
          player.claimedLuminaryIds?.includes(next.luminaryId)
        ));
        const targetElement = owner?.playerId === session?.playerId
          ? document.querySelector<HTMLElement>('[data-eminence-panel="player"]')
          : owner
            ? document.querySelector<HTMLElement>(`[data-opponent-chip="${CSS.escape(owner.playerId)}"]`)
            : null;
        const targetRect = targetElement?.getBoundingClientRect() ?? null;
        const usesEminenceBestowal = usesControlledEminenceBestowal(next.luminaryId);
        const luminary = state?.luminaries.find(candidate => candidate.id === next.luminaryId);

        setActiveDelayedEffectFloat({
          ...next,
          originRect,
          targetRect,
          playerId: owner?.playerId,
          playerName: owner?.playerName,
          eminenceAfter: owner?.eminence,
          luminaryName: luminary?.name,
          secondaryColor: luminary?.summonSecondaryColor,
        });

        if (usesEminenceBestowal && owner) {
          gameAudio.playEminenceSeal(
            next.amount,
            owner.eminence,
            Math.max(15, Number(state?.victoryRequirement ?? 15)),
          );
          const impactDelay = abridgedAnims ? 430 : 1450;
          const impactTimer = setTimeout(() => {
            luminaryEminenceBurstTimersRef.current =
              luminaryEminenceBurstTimersRef.current.filter(candidate => candidate !== impactTimer);
            if (owner.playerId === session?.playerId) {
              triggerEminencePanelImpact(next.amount);
            } else {
              triggerOpponentEminenceImpact(owner.playerId, next.amount);
            }
          }, impactDelay);
          luminaryEminenceBurstTimersRef.current.push(impactTimer);
        }
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [
    activeDelayedEffectFloat,
    abridgedAnims,
    activationGateActive,
    activationHead,
    animationLockUntil,
    delayedEffectFloatQueue,
    session?.playerId,
    state,
    triggerEminencePanelImpact,
    triggerOpponentEminenceImpact,
  ]);

  // Keep overlayOpenRef in sync so the touch-forwarding handler above can
  // read it without being re-registered on every state change.
  const prepareLuminaryView = viewOrchestrator.prepare;
  useEffect(() => {
    overlayOpenRef.current = isAnyOverlayOpen;
  }, [isAnyOverlayOpen]);

  // View orchestration: settle the complete Forge before each Luminary activation cinematic.
  // Fires when a new activation event becomes the head of the queue and no arrival
  // cutscene is blocking.  prepare() snapshots the current view state and switches to
  // Compact View whenever Full cannot contain all molds and Archives. The generic
  // cinematic waits for onSettled, so its opening frame never races the reflow.
  //
  // Every director waits on this one settled boundary. Named directors receive
  // an already-settled prepare callback so they cannot move the camera again
  // after their source activation has appeared.
  useEffect(() => {
    if (
      !activationHead ||
      activationGateActive ||
      currentActivationBlocked ||
      activationAftermathBlocked ||
      delayedLuminaryResultActive ||
      isTutorial
    ) return;
    const evt = activationHead;
    if (!evt) return;
    const procedure = resolveLuminaryProcedure(
      evt.luminaryId,
      evt.effectType as 'summon' | 'action' | 'end_of_turn' | 'start_of_turn',
      state,
      evt.triggeringPlayerId,
      {
        targetCardIds: evt.targetCardIds,
        targetSlotIds: evt.targetSlotIds,
        affinityType: evt.affinityType,
        affinityAmount: evt.affinityAmount,
      },
    );
    setPreparedRectDirectorEventId(null);
    // Source-first effects hide camera preparation inside their activation
    // release. Directors that own their whole activation still need a settled
    // board before they mount.
    if (!activationDirectorManagesActivation(evt.luminaryId, evt.effectType)) {
      setPreparedRectDirectorEventId(evt.eventId);
      return;
    }
    prepareLuminaryView(
      procedure,
      () => setPreparedRectDirectorEventId(evt.eventId),
      activationDirectorForcesCamera(evt.luminaryId, evt.effectType)
        ? { forceOrchestrate: true }
        : undefined,
    );
  }, [
    activationHead,
    activationAftermathBlocked,
    activationGateActive,
    currentActivationBlocked,
    delayedLuminaryResultActive,
    isTutorial,
    prepareLuminaryView,
    state,
  ]);

  // Body scroll lock — a single call covering all overlays at once.
  // To add a new overlay, append its boolean to the overlayStates array above.
  useScrollLock(
    [
      ...overlayStates,
      isCameraControlled,
    ],
    mainScrollRef,
  );

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

  const clearQueuedStateUpdates = authoritativeStateIngress.clear;

  const setAnimEndTime = (durationMs: number) => {
    const end = Date.now() + durationMs;
    if (end > animationEndTimeRef.current) {
      animationEndTimeRef.current = end;
      setAnimationLockUntil(end);
    }
  };

  const clearAnimEndTime = () => {
    animationEndTimeRef.current = 0;
    setAnimationLockUntil(0);
    authoritativeStateIngress.nudge();
  };

  const beginMoldCasting = (
    entries: Array<{
      card: ArtifactCard;
      tier: number;
      slotKey: string;
    }>,
    cause: MoldCastCause,
    options: {
      staggerMs?: number;
      baseDelayMs?: number;
      traceArchives?: boolean;
      playSound?: boolean;
    } = {},
  ): boolean => {
    const visibleEntries = entries.flatMap((entry) => {
      const slotElement = document.querySelector<HTMLElement>(
        `[data-slot-key="${entry.slotKey}"]`,
      );
      const slotRect = slotElement?.getBoundingClientRect();
      if (!slotRect || slotRect.width <= 0 || slotRect.height <= 0) return [];
      const archiveElement = document.querySelector<HTMLElement>(
        `[data-deck-tier="${entry.tier}"]`,
      );
      const archiveRect = archiveElement?.getBoundingClientRect();
      return [{ ...entry, slotRect, archiveRect }];
    });
    if (visibleEntries.length === 0) return false;

    const sequence = ++moldCastSequenceRef.current;
    const staggerMs = options.staggerMs ?? MOLD_CAST_STAGGER_MS;
    const baseDelayMs = options.baseDelayMs ?? 90;
    const castDurationMs = abridgedAnims ? 240 : MOLD_CAST_DURATION_MS;
    const cueEntries = visibleEntries.map((entry, index) => ({
      ...entry,
      cue: {
        id: `${sequence}:${entry.slotKey}`,
        cause,
        delayMs: baseDelayMs + index * staggerMs,
        durationMs: castDurationMs,
      } satisfies MoldCastCue,
    }));

    setRefillingSlots(current => {
      const next = new Map(current);
      cueEntries.forEach(({ slotKey, cue }) => next.set(slotKey, cue));
      return next;
    });
    // Reveal the authoritative replacement and its casting mask atomically.
    setHiddenSlots(current => {
      if (!cueEntries.some(({ slotKey }) => current.has(slotKey))) return current;
      const next = new Set(current);
      cueEntries.forEach(({ slotKey }) => next.delete(slotKey));
      return next;
    });

    if (options.traceArchives !== false) {
      const tracedTiers = new Set<number>();
      const traces = cueEntries.flatMap(({ card, tier, slotKey, slotRect, archiveRect, cue }) => {
        if (!archiveRect || archiveRect.width <= 0 || archiveRect.height <= 0) return [];
        if (tracedTiers.has(tier)) return [];
        tracedTiers.add(tier);
        return [{
          id: `${sequence}:trace:${tier}`,
          cardId: card.id,
          tier,
          deckRect: {
            x: archiveRect.left,
            y: archiveRect.top,
            w: archiveRect.width,
            h: archiveRect.height,
          },
          slotRect: {
            x: slotRect.left,
            y: slotRect.top,
            w: slotRect.width,
            h: slotRect.height,
          },
          delayMs: Math.max(0, cue.delayMs - 90),
          slotKey,
        }];
      });
      if (traces.length > 0) {
        setArchiveManifestationTraces(current => [...current, ...traces]);
      }
    }

    const totalMs = baseDelayMs +
      Math.max(0, cueEntries.length - 1) * staggerMs +
      castDurationMs;
    setAnimEndTime(totalMs + 80);

    if (options.playSound !== false) {
      const soundTimer = setTimeout(
        () => gameAudio.playForgeRefill(),
        baseDelayMs + Math.round(castDurationMs * 0.42),
      );
      moldCastTimersRef.current.set(`sound:${sequence}`, soundTimer);
    }

    cueEntries.forEach(({ slotKey, cue }) => {
      const previousTimer = moldCastTimersRef.current.get(slotKey);
      if (previousTimer) clearTimeout(previousTimer);
      const timer = setTimeout(() => {
        setRefillingSlots(current => {
          if (current.get(slotKey)?.id !== cue.id) return current;
          const next = new Map(current);
          next.delete(slotKey);
          return next;
        });
        moldCastTimersRef.current.delete(slotKey);
      }, cue.delayMs + castDurationMs + 40);
      moldCastTimersRef.current.set(slotKey, timer);
    });

    const traceTimer = setTimeout(() => {
      setArchiveManifestationTraces(current => current.filter(
        trace => !trace.id.startsWith(`${sequence}:trace:`),
      ));
      moldCastTimersRef.current.delete(`trace:${sequence}`);
      moldCastTimersRef.current.delete(`sound:${sequence}`);
    }, totalMs + 80);
    moldCastTimersRef.current.set(`trace:${sequence}`, traceTimer);
    return true;
  };

  const dealReplacementIntoSlot = (
    card: ArtifactCard,
    tier: number,
    slotKey: string,
    cause: MoldCastCause = 'refill',
  ): boolean => beginMoldCasting([{ card, tier, slotKey }], cause);

  const playNormalBurnVisuals = (entries: LuminaryBurnVisualEntry[]) => {
    const normalEntries = entries;
    if (normalEntries.length === 0) return;

    const resolvedEntries = normalEntries.flatMap(({
      burnedId,
      tier,
      slotIndex,
      sourceLuminaryId,
      destination,
      condemnedCard,
    }) => {
      const slotEl = document.querySelector(`[data-slot-key="${tier}-${slotIndex}"]`);
      if (!slotEl) return [];
      const rect = slotEl.getBoundingClientRect();
      return [{
        id: `burn-badge-${tier}-${slotIndex}-${Date.now()}`,
        burnedId,
        rect,
        tier,
        slotIndex,
        sourceLuminaryId,
        destination,
        condemnedCard,
      }];
    });

    if (resolvedEntries.length === 0) return;

    const normalGhostEntries = resolvedEntries.flatMap(({ tier, slotIndex, condemnedCard }) => (
      condemnedCard
        ? [{ slotKey: `${tier}-${slotIndex}`, card: condemnedCard }]
        : []
    ));
    if (normalGhostEntries.length > 0) {
      setBurstGhostCards(previous => {
        const next = { ...previous };
        normalGhostEntries.forEach(({ slotKey, card }) => {
          next[slotKey] = card;
        });
        return next;
      });
    }

    setAnimEndTime(NORMAL_BURN_VISUAL_MS);
    setBurnBadgeOverlays(pf => [
      ...pf,
      ...resolvedEntries.map(e => ({ id: e.id, slotRect: e.rect })),
    ]);

    if (resolvedEntries.some((entry) => entry.destination === 'burn_pile')) {
      // Pulse the burn chip only when at least one card actually remains there.
      void burnChipAnim.start({
        filter: ['brightness(1)', 'brightness(3)', 'brightness(1.5)', 'brightness(1)'],
        transition: { duration: 0.65, times: [0, 0.15, 0.45, 1], ease: 'easeOut' },
      });
    }

    setTimeout(() => {
      const chipEl = document.querySelector('[data-burn-pile-chip]');
      const chipRect = chipEl?.getBoundingClientRect() ?? null;
      for (const [burnIdx, { burnedId, tier, slotIndex, sourceLuminaryId, destination }] of resolvedEntries.entries()) {
        const slotEl2 = document.querySelector(`[data-slot-key="${tier}-${slotIndex}"]`);
        const rect2 = slotEl2?.getBoundingClientRect();
        if (rect2) {
          gameAudio.playCardBurn(burnIdx, resolvedEntries.length);
          setBurnFlashes(pf => [
            ...pf,
            { id: `burn-${tier}-${slotIndex}-${Date.now()}`, slotRect: rect2, sourceLuminaryId },
          ]);
          if (destination === 'archive') {
            const archiveEl = document.querySelector(`[data-deck-tier="${tier}"]`);
            const archiveRect = archiveEl?.getBoundingClientRect();
            if (archiveRect) {
              const fromRect = rect2;
              setTimeout(() => {
                setArchiveReturnParticles(pf => [
                  ...pf,
                  {
                    id: `archive-return-${tier}-${slotIndex}-${Date.now()}`,
                    cardId: burnedId,
                    from: fromRect,
                    to: archiveRect,
                  },
                ]);
              }, 380);
            }
          } else if (chipRect) {
            const fromRect = rect2;
            const toRect = chipRect;
            setTimeout(() => {
              setBurnPileParticles(pf => [
                ...pf,
                { id: `bpart-${tier}-${slotIndex}-${Date.now()}`, from: fromRect, to: toRect },
              ]);
              setTimeout(() => {
                void burnChipArrivalAnim.start({
                  scale: [1.45, 1],
                  opacity: [0.9, 0],
                  transition: { duration: 0.18, ease: 'easeOut' },
                });
                setBurnChipSparks(pf => [
                  ...pf,
                  { id: `bspark-${tier}-${slotIndex}-${Date.now()}`, chipRect: toRect, angleSeed: Math.random() * Math.PI * 2 },
                ]);
              }, 780);
            }, 380);
          }
        }
      }
    }, 320);

    setTimeout(() => {
      if (normalGhostEntries.length > 0) {
        setBurstGhostCards(previous => {
          const next = { ...previous };
          normalGhostEntries.forEach(({ slotKey }) => {
            delete next[slotKey];
          });
          return next;
        });
      }
      const castEntries = resolvedEntries.flatMap(({ tier, slotIndex }) => {
        const row = tier === 1
          ? state?.forgeTier1
          : tier === 2
            ? state?.forgeTier2
            : state?.forgeTier3;
        const card = row?.[slotIndex] ?? null;
        return card
          ? [{ card, tier, slotKey: `${tier}-${slotIndex}` }]
          : [];
      });
      if (castEntries.length > 0) {
        beginMoldCasting(castEntries, 'burn');
      }
    }, 1520);
  };

  const flushDeferredNormalBurns = () => {
    const entries = [...deferredNormalBurnsRef.current];
    deferredNormalBurnsRef.current = [];
    if (entries.length === 0) return;
    logArrivalDebug('burn.flush-deferred', {
      count: entries.length,
      sourceLuminaryIds: Array.from(new Set(entries.map(e => e.sourceLuminaryId).filter(Boolean))),
    });
    playNormalBurnVisuals(entries);
  };

  const flushDeferredNormalBurnsForActivation = (
    activation: PendingLuminaryActivationEvent,
  ) => {
    const targetIds = new Set(activation.targetCardIds ?? []);
    const matching: LuminaryBurnVisualEntry[] = [];
    const remaining: LuminaryBurnVisualEntry[] = [];

    for (const entry of deferredNormalBurnsRef.current) {
      const matchesTarget = targetIds.size > 0 && targetIds.has(entry.burnedId);
      const matchesSource =
        targetIds.size === 0 &&
        entry.sourceLuminaryId === activation.luminaryId;
      if (matchesTarget || matchesSource) {
        matching.push(entry);
      } else {
        remaining.push(entry);
      }
    }

    deferredNormalBurnsRef.current = remaining;
    if (matching.length === 0) return;
    logArrivalDebug('burn.flush-for-activation', {
      activationEventId: activation.eventId,
      luminaryId: activation.luminaryId,
      count: matching.length,
    });
    activationAftermathOwnerEventIdRef.current = activation.eventId;
    playNormalBurnVisuals(matching);
  };

  useEffect(() => {
    if (!animationLockUntil) return;
    const remaining = animationLockUntil - Date.now();
    if (remaining <= 0) {
      setAnimationLockUntil(0);
      return;
    }
    const timer = setTimeout(() => {
      setAnimationLockUntil(current => current === animationLockUntil ? 0 : current);
    }, remaining + 50);
    return () => clearTimeout(timer);
  }, [animationLockUntil]);

  useEffect(() => {
    if (pendingActivationServerResolutionsRef.current.size === 0) return;
    if (!canAcknowledgeLuminaryActivations({
      activationQueueLength: activationQueue.length,
      activationGateActive,
      activationAftermathActive,
      activeDelayedResult: activeDelayedEffectFloat !== null,
      delayedResultQueueLength: delayedEffectFloatQueue.length,
      seedBoardEffectActive: showSeedBoardEffect,
      brandStrikeCount: brandStrikes.length,
      animationLockUntil,
    })) {
      return;
    }

    const completedEventIds = Array.from(
      pendingActivationServerResolutionsRef.current,
    );
    pendingActivationServerResolutionsRef.current.clear();
    acknowledgeLuminaryEventsInOrder(
      completedEventIds.map(eventId => ({
        type: 'resolve_luminary_activation',
        eventId,
      })),
    );
  }, [
    activationAftermathActive,
    acknowledgeLuminaryEventsInOrder,
    activationGateActive,
    activationQueue.length,
    activationResolutionRevision,
    activeDelayedEffectFloat,
    animationLockUntil,
    brandStrikes.length,
    delayedEffectFloatQueue.length,
    showSeedBoardEffect,
  ]);

  const fireTurnAnnouncement = (
    dedupeKey: string,
    turnIdentity: string,
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
    if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
    turnAnnounceKeyRef.current += 1;
    const seq = turnAnnounceKeyRef.current;
    if (isYou) setTurnPresentationPending(true);
    setTurnAnnouncement({ key: seq, turnIdentity, playerName, avatarId, isYou, accentColor, eminence, turnStartedAt: Date.now(), timerSeconds });
    if (isYou) gameAudio.playTurnStart();
    else gameAudio.playOpponentTurnStart();
    turnAnnounceTimerRef.current = setTimeout(() => {
      if (turnAnnounceKeyRef.current === seq) {
        setTurnAnnouncement(null);
        if (isYou) {
          setTurnPresentationPending(false);
          setCompletedTurnPresentationKey(turnIdentity);
        }
      }
      turnAnnounceTimerRef.current = null;
    }, duration);
  };

  const scheduleTurnAnnouncement = (
    dedupeKey: string,
    turnIdentity: string,
    playerName: string,
    avatarId: string | null,
    isYou: boolean,
    accentColor: string,
    eminence: number,
    timerSeconds: number | null,
  ) => {
    if (isYou) setTurnPresentationPending(true);
    if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
    const waitMs = Math.max(0, animationEndTimeRef.current - Date.now());
    if (waitMs <= 0) {
      fireTurnAnnouncement(dedupeKey, turnIdentity, playerName, avatarId, isYou, accentColor, eminence, timerSeconds);
      return;
    }
    pendingTurnAnnounceRef.current = setTimeout(() => {
      pendingTurnAnnounceRef.current = null;
      fireTurnAnnouncement(dedupeKey, turnIdentity, playerName, avatarId, isYou, accentColor, eminence, timerSeconds);
    }, waitMs);
  };

  const recordTurnOrderBalanceView = (
    intro: TurnOrderIntroState,
    outcome: 'success' | 'dismissed',
  ) => {
    if (!intro.players.some((player) => player.eminenceBonus > 0)) return;
    const localPlayer = intro.players.find((player) => player.playerId === session?.playerId);
    trackFirstPartyEvent({
      eventName: 'turn_order_balance_viewed',
      outcome,
      ordinal: localPlayer?.openingPosition,
      durationMs: Math.max(0, Date.now() - intro.startedAt),
    }, `turn-order-balance:${intro.introId}:${session?.playerId ?? 'spectator'}`);
  };

  const cancelTurnAnnouncement = () => {
    if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
    pendingTurnAnnounceRef.current = null;
    if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
    turnAnnounceTimerRef.current = null;
    if (turnOrderIntroTimerRef.current) clearTimeout(turnOrderIntroTimerRef.current);
    turnOrderIntroTimerRef.current = null;
    setTurnOrderIntro(null);
    setTurnAnnouncement(null);
    setTurnPresentationPending(false);
  };

  const abridgeTurnOrderIntro = () => {
    if (!turnOrderIntro) return;
    recordTurnOrderBalanceView(turnOrderIntro, 'dismissed');
    if (turnOrderIntroTimerRef.current) clearTimeout(turnOrderIntroTimerRef.current);
    turnOrderIntroTimerRef.current = null;
    setTurnOrderIntro(null);
    clearAnimEndTime();

    const cp = state?.players[state.currentPlayerIndex];
    if (!state || !cp || !session || isTutorial || cp.playerId !== session.playerId) return;

    const firstLumId = cp.claimedLuminaryIds?.[0];
    const lum = firstLumId ? state.luminaries.find((l: Luminary) => l.id === firstLumId) : undefined;
    const accentColor = lum?.summonColor ?? '#6366f1';
    fireTurnAnnouncement(
      `init-${state.currentPlayerIndex}-${state.version}`,
      getTurnPresentationKey(cp.playerId, state.turnCount),
      cp.playerName,
      cp.avatarId ?? null,
      true,
      accentColor,
      cp.eminence,
      state.turnTimerSeconds ?? null,
    );
  };

  const abridgeTurnAnnouncement = () => {
    if (!turnAnnouncement) return;
    if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
    turnAnnounceTimerRef.current = null;
    const completedIdentity = turnAnnouncement.turnIdentity;
    const wasMine = turnAnnouncement.isYou;
    setTurnAnnouncement(null);
    if (wasMine) {
      setTurnPresentationPending(false);
      setCompletedTurnPresentationKey(completedIdentity);
    }
    clearAnimEndTime();
  };

  const handleTurnCinematicPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (turnOrderIntro) {
      abridgeTurnOrderIntro();
      return;
    }

    abridgeTurnAnnouncement();
  };

  // Immediately cancel all pending pre-win visual animations so the win overlay
  // can appear without waiting for queued card/arrival animations to drain.
  // Does NOT affect audio — win fanfare and playWin() still fire normally.
  // Should be called at the moment game-over is detected.
  const cancelPendingAnimations = useCallback(() => {
    // Reset the animation barrier so drainQueue stops waiting.
    animationEndTimeRef.current = 0;
    // Cancel every tracked card-animation timer (burst, cast, flip watchdogs, etc.).
    for (const t of cardAnimTimersRef.current) clearTimeout(t);
    cardAnimTimersRef.current = [];
    // Discard all authoritative states waiting behind the visual timeline.
    clearQueuedStateUpdates();
    setAnimationLockUntil(0);
    // Clear ghost cards that were waiting for burst animations to start.
    setBurstGhostCards({});
    ghostArtifactMarkerTypesRef.current.clear();
    // Force-unmount any Forge or reserve animation still in flight so the win
    // cinematic begins from a clean board.
    setCardActionBurst(null);
    setOpponentForgeAbsorb(null);
    setLuminaryEminenceBurst(null);
    for (const t of luminaryEminenceBurstTimersRef.current) clearTimeout(t);
    luminaryEminenceBurstTimersRef.current = [];
    pendingLuminaryEminenceBurstsRef.current = [];
    setCipherBurst(null);
    moldCastTimersRef.current.forEach(timer => clearTimeout(timer));
    moldCastTimersRef.current.clear();
    setRefillingSlots(new Map());
    setArchiveManifestationTraces([]);
    // Reveal hidden Forge slots and finish flips so the board is clean.
    setHiddenSlots(new Set());
    setFlippingCards(new Set());
  }, [clearQueuedStateUpdates]);


  useEffect(() => {
    const moldCastTimers = moldCastTimersRef.current;
    return () => {
      for (const t of cardAnimTimersRef.current) clearTimeout(t);
      cardAnimTimersRef.current = [];
      if (affinityBurstTimerRef.current) clearTimeout(affinityBurstTimerRef.current);
      if (turnAnnounceTimerRef.current) clearTimeout(turnAnnounceTimerRef.current);
      if (pendingTurnAnnounceRef.current) clearTimeout(pendingTurnAnnounceRef.current);
      if (turnOrderIntroTimerRef.current) clearTimeout(turnOrderIntroTimerRef.current);
      if (winBarrierTimerRef.current) clearTimeout(winBarrierTimerRef.current);
      for (const t of luminaryEminenceBurstTimersRef.current) clearTimeout(t);
      luminaryEminenceBurstTimersRef.current = [];
      moldCastTimers.forEach(timer => clearTimeout(timer));
      moldCastTimers.clear();
    };
  }, []);

  useEffect(() => {
    if (!session || session.roomId !== roomId) setLocation('/');
  }, [session, roomId, setLocation]);

  const logArrivalDebug = useCallback((stage: string, detail: Record<string, unknown> = {}) => {
    if (typeof window === 'undefined') return;
    const debugParams = new URLSearchParams(window.location.search);
    if (debugParams.get('debugArrival') !== '1' && debugParams.get('debugCutscene') !== '1') return;
    const payload = {
      stage,
      ...detail,
      activeTab,
      arrivalQueueLen: arrivalQueueLenRef.current,
      enqueuingCount: enqueuingCountRef.current,
      pendingSuppressIds: Array.from(pendingSuppressArrivalIdsRef.current),
      visualHoldIds: Array.from(arrivalVisualHoldIdsRef.current),
      returningLuminaryIds: Array.from(returningLuminaryIdsRef.current),
      localArrivalSkipped,
      gameFinished: gameFinishedRef.current,
      stateStatus: state?.status,
      stateVersion: state?.version,
      turnCount: state?.turnCount,
    };
    console.info(`[Luminae arrival] ${JSON.stringify(payload)}`);
  }, [activeTab, localArrivalSkipped, state?.status, state?.turnCount, state?.version]);

  const lockSummonActivation = (lumId: string, eventId?: string) => {
    summonActivationLocksRef.current.add(lumId);
    logArrivalDebug('activation.lock-summon', { luminaryId: lumId, eventId });
  };

  const releaseSummonActivationLocks = (lumIds: string[]) => {
    if (lumIds.length === 0) return;
    for (const lumId of lumIds) summonActivationLocksRef.current.delete(lumId);
    logArrivalDebug('activation.release-summon-locks', { luminaryIds: lumIds });
  };

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
    // Reset only the per-turn submission flag. Affinity selections are local UI
    // state that belongs to the player — they persist until an action is submitted
    // or the player manually deselects.  If the bank can no longer honour the
    // selection, the Harness button is disabled and the server rejects the
    // action, both of which give clear feedback without silently wiping the intent.
    setCoreActionSubmitted(false);
    setPlannedActionCommitPending(false);
    plannedActionCommitInFlightRef.current = null;
  }, [state?.currentPlayerIndex]);

  // v0.8 — which Luminaries currently have a pending delayed effect.
  // Drives the ArmedSigil on the Luminary portal.
  const armedLumIds = useMemo(() => {
    if (!state) return new Set<string>();
    const claimedIds = new Set(state.players.flatMap(p => p.claimedLuminaryIds ?? []));
    const armed = new Set<string>();
    if (
      claimedIds.has('lum_radiant') &&
      (!state.concordanceMandalaTriggered || !state.concordanceMandalaFinalTriggered)
    ) armed.add('lum_radiant');
    if (claimedIds.has('lum_bloom'))                                          armed.add('lum_bloom');
    if (claimedIds.has('lum_orchard') && !state.glassOrchardTriggered)       armed.add('lum_orchard');
    if (claimedIds.has('lum_seed') && !!state.avatarSeedOwnerId)             armed.add('lum_seed');
    return armed;
  }, [state]);

  // Forge keyboard navigation: roving tabindex for the 3-by-N Artifact grid.
  // Counts how many keyboard-navigable (non-ghost, non-hidden, non-null) cards
  // exist per tier row so the hook knows when to wrap focus.
  const forgeRowCardCounts = useMemo(() => {
    if (!state) return [0, 0, 0];
    return [
      { tierNum: 3, cards: state.forgeTier3 },
      { tierNum: 2, cards: state.forgeTier2 },
      { tierNum: 1, cards: state.forgeTier1 },
    ].map(({ tierNum, cards }) =>
      cards.filter((c, i) => {
        const sk = `${tierNum}-${i}`;
        return !burstGhostCards[sk] && !hiddenSlots.has(sk) && c !== null;
      }).length,
    );
  }, [state, burstGhostCards, hiddenSlots]);

  const { getCardFocusProps } = useForgeKeyboardNav(forgeRowCardCounts);

  useEffect(() => {
    if (!initialTurnFiredRef.current && state && state.status === 'playing' && session) {
      initialTurnFiredRef.current = true;
      const cp = state.players[state.currentPlayerIndex];
      if (!cp) return;
      const key = `init-${state.currentPlayerIndex}-${state.version}`;
      const isMe = cp.playerId === session.playerId;
      const firstLumId = cp.claimedLuminaryIds?.[0];
      const lum = firstLumId ? state.luminaries.find((l: Luminary) => l.id === firstLumId) : undefined;
      const accentColor = lum?.summonColor ?? '#6366f1';
      const startedAt = Number((state as { startedAt?: number }).startedAt ?? 0);
      const openingTurnOrder = state.openingTurnOrder ?? null;
      const openingTurnOrderId = openingTurnOrder?.id ?? (startedAt > 0 ? String(startedAt) : null);
      const isLiveFreshGameTransition = !!openingTurnOrderId && pendingTurnOrderIntroIdRef.current === openingTurnOrderId;
      const isUnseenOpeningState =
        !!openingTurnOrderId &&
        !!openingTurnOrder &&
        !hasSeenTurnOrderIntro(roomId, openingTurnOrderId);
      const isFreshGameStart = isUnseenOpeningState || isLiveFreshGameTransition;
      if (isLiveFreshGameTransition) pendingTurnOrderIntroIdRef.current = null;
      const selectedFirstPlayer = openingTurnOrder
        ? (state.players as GamePlayerState[]).find((player) => player.playerId === openingTurnOrder.firstPlayerId) ?? cp
        : cp;

      const fireInitialTurn = () => {
        if (isMe && !isTutorial) {
          scheduleTurnAnnouncement(
            key,
            getTurnPresentationKey(cp.playerId, state.turnCount),
            cp.playerName,
            cp.avatarId ?? null,
            true,
            accentColor,
            cp.eminence,
            state.turnTimerSeconds ?? null,
          );
        }
      };

      if (!isTutorial && isFreshGameStart) {
        if (turnOrderIntroTimerRef.current) clearTimeout(turnOrderIntroTimerRef.current);
        markTurnOrderIntroSeen(roomId, openingTurnOrderId);
        turnOrderIntroKeyRef.current += 1;
        setAnimEndTime(OPENING_TURN_ORDER_PRESENTATION_MS + INITIAL_TURN_GUARD_MS);
        const introPlayers = buildOpeningTurnOrderPlayers(
          state.players as GamePlayerState[],
          selectedFirstPlayer.playerId,
          state.victoryRequirement ?? 15,
        );
        const introState: TurnOrderIntroState = {
          key: turnOrderIntroKeyRef.current,
          introId: String(openingTurnOrderId),
          startedAt: Date.now(),
          firstPlayerName: selectedFirstPlayer.playerName,
          firstPlayerAccentColor: accentColor,
          isYou: selectedFirstPlayer.playerId === session.playerId,
          players: introPlayers,
        };
        setTurnOrderIntro(introState);
        turnOrderIntroTimerRef.current = setTimeout(() => {
          recordTurnOrderBalanceView(introState, 'success');
          setTurnOrderIntro(null);
          turnOrderIntroTimerRef.current = null;
          fireInitialTurn();
        }, OPENING_TURN_ORDER_PRESENTATION_MS);
      } else {
        setAnimEndTime(INITIAL_TURN_GUARD_MS);
        fireInitialTurn();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status, state?.version, skipCinematics]);

  useEffect(() => {
    if (
      isTutorial
      || state?.status !== 'finished'
      || !state.winnerId
      || !state.openingTurnOrder
      || !session?.playerId
      || state.players.some((player) => player.isAi)
    ) return;

    const introId = state.openingTurnOrder.id;
    if (!markMatchBalanceResultTracked(introId, session.playerId)) return;
    const orderedPlayers = buildOpeningTurnOrderPlayers(
      state.players as GamePlayerState[],
      state.openingTurnOrder.firstPlayerId,
      state.victoryRequirement ?? 15,
    );
    const localOpeningPosition = orderedPlayers.find(
      (player) => player.playerId === session.playerId,
    )?.openingPosition;

    trackFirstPartyEvent({
      eventName: 'match_balance_result',
      actionId: getBalanceTelemetryActionId(
        state.players.length,
        state.victoryRequirement ?? 15,
      ),
      outcome: state.winnerId === session.playerId ? 'success' : 'failure',
      ordinal: localOpeningPosition,
      durationMs: state.startedAt
        ? Math.max(0, Math.min(86_400_000, Date.now() - state.startedAt))
        : undefined,
    }, `match-balance:${introId}:${session.playerId}`);
  }, [isTutorial, session?.playerId, state]);

  // ── Initial-load arrival check ─────────────────────────────────────────────
  // Picks up any pendingArrivalEvents already in the REST-loaded state (page
  // load / reconnect) where no subsequent WebSocket delta will fire a diff.
  // Also seeds claimedThisSession with every already-resolved Luminary so
  // idle entity overlays are restored immediately after a page reload or
  // navigation away and back (without needing to replay the cutscene).
  // Placed after `state` is declared but before early returns so hook order
  // is always stable across renders.
  useEffect(() => {
    if (checkedInitialArrivalRef.current) return;
    if (!state) return;
    checkedInitialArrivalRef.current = true;
    const pending = state?.pendingSummonEvents ?? [];
    logArrivalDebug('initial-check', {
      pendingCount: pending.length,
      pending: pending.map(evt => ({ eventId: evt.eventId, luminaryId: evt.luminaryId })),
    });
    // If the game was already finished when we loaded, identify the sealing
    // Luminary so its cutscene burst visuals can use the correct summonColor (API contract).
    const initialWinTrigId = state.winTriggerLuminaryId ?? undefined;
    for (const evt of pending) {
      const lum = state?.luminaries?.find((l: Luminary) => l.id === evt.luminaryId);
      if (lum) {
        logArrivalDebug('initial-check.enqueue', {
          eventId: evt.eventId,
          luminaryId: evt.luminaryId,
          luminaryName: lum.name,
        });
        const isSealing = initialWinTrigId && evt.luminaryId === initialWinTrigId;
        lockSummonActivation(evt.luminaryId, evt.eventId);
        // summonColor (API contract) is read from the server-side Luminary object here (rather
        // than getLuminaryVisuals) because `lum` is already in hand from the
        // state query and both sources hold the same value. The frontend asset
        // map (LUMINARY_VISUALS) is the canonical reference for any new code
        // that doesn't have a Luminary object readily available.
        const wsc: string | undefined = isSealing ? (lum.summonColor ?? '') || undefined : undefined;
        const claimer = (state?.players ?? []).find((p: { claimedLuminaryIds?: string[] }) =>
          (p.claimedLuminaryIds ?? []).includes(evt.luminaryId));
        enqueueArrivalRef.current(
          evt.luminaryId, lum.name, lum.domain ?? '',
          balanceLabLuminaryEminence ?? lum.eminence ?? 0,
          lum.flavor ?? '', evt.eventId, false, wsc,
          (claimer as { playerName?: string })?.playerName,
          evt.claimedByPlayerId,
        );
      } else {
        logArrivalDebug('initial-check.missing-luminary', {
          eventId: evt.eventId,
          luminaryId: evt.luminaryId,
        });
      }
    }
    // Seed idle overlays for Luminaries already claimed before this page load.
    // Exclude any that still have a pending arrival event — they will self-add
    // to claimedThisSession when their cutscene completes.
    const pendingIds = new Set<string>(pending.map(e => String(e.luminaryId)));
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

    const initialActivations = state.pendingLuminaryActivationEvents ?? [];
    if (initialActivations.length > 0) {
      const gateSnapshot: LuminarySequenceGateSnapshot = {
        arrivalQueueLength: arrivalQueueLenRef.current,
        enqueuingCount: enqueuingCountRef.current,
        pendingSuppressCount: pendingSuppressArrivalIdsRef.current.size,
        visualHoldCount: arrivalVisualHoldIdsRef.current.size,
        returningCount: returningLuminaryIdsRef.current.size,
        pendingArrivalLuminaryIds: pendingIds,
        summonActivationLockedLuminaryIds: summonActivationLocksRef.current,
      };
      for (const evt of initialActivations) {
        if (handledActivationEventIdsRef.current.has(evt.eventId)) continue;
        handledActivationEventIdsRef.current.add(evt.eventId);
        const gateDecision = getLuminaryActivationGateDecision(evt, gateSnapshot);
        if (gateDecision.allowed) {
          logArrivalDebug('initial-activation.queued', {
            eventId: evt.eventId,
            luminaryId: evt.luminaryId,
            effectType: evt.effectType,
          });
          setActivationQueue(q => [...q, evt]);
        } else {
          logArrivalDebug('initial-activation.deferred', {
            eventId: evt.eventId,
            luminaryId: evt.luminaryId,
            effectType: evt.effectType,
            reason: gateDecision.reason,
          });
          deferredActivationEventsRef.current.push(evt);
        }
      }
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
    if (state.scenarioId === LUMII_CLEARANCE_SCENARIO_ID) return;
    winFanfareOnLoadFiredRef.current = true;
    const winnerPlayer = (state.players as GamePlayerState[]).find(
      p => p.playerId === state.winnerId
    );
    let fanfareColor = '#fbbf24';
    // If the win was sealed by a Luminary arrival, use that Luminary's
    // summonColor (API contract) — it is the most thematically appropriate hue for the
    // fanfare and matches what the live flush path captures via
    // pendingGameOverLumColorRef.
    const winTriggerLumId = state.winTriggerLuminaryId;
    const sealingLuminary = winTriggerLumId
      ? state.luminaries.find((l) => l.id === winTriggerLumId)
      : null;
    if (sealingLuminary?.summonColor) {
      fanfareColor = sealingLuminary.summonColor;
    } else if (winnerPlayer) {
      // Prefer the bonusAffinity of the winner's last forged Artifact, the best
      // proxy for the card that sealed the win, matching the flush-path logic.
      const winnerCards = winnerPlayer.forgedArtifacts as ArtifactCard[] | undefined;
      const lastWinnerCard = winnerCards && winnerCards.length > 0
        ? winnerCards[winnerCards.length - 1]
        : null;
      const lastCardBonusKey = lastWinnerCard?.bonusAffinity;
      if (lastCardBonusKey && AFFINITY_KEY_TO_HEX[lastCardBonusKey]) {
        fanfareColor = AFFINITY_KEY_TO_HEX[lastCardBonusKey];
      } else {
        // Fall back to the winner's dominant bonus affinity count.
        const bonuses = winnerPlayer.bonuses;
        const affinityEntries: Array<[string, number]> = [
          ['flare',     bonuses.flare],
          ['continuum', bonuses.continuum],
          ['verdance',  bonuses.verdance],
          ['abyss',     bonuses.abyss],
          ['radiance',    bonuses.radiance],
          ['singularity',     bonuses.singularity],
        ];
        let maxBonus = 0;
        let dominantKey = 'singularity';
        for (const [key, val] of affinityEntries) {
          if (val > maxBonus) { maxBonus = val; dominantKey = key; }
        }
        fanfareColor = AFFINITY_KEY_TO_HEX[dominantKey] ?? '#fbbf24';
      }
    }
    gameAudio.playLuminaryFanfare(fanfareColor);
    setTimeout(() => gameAudio.playWin(), 1400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!state]);

  // ── v0.8 Luminary animation detection ────────────────────────────────────
  // Fires on every state change to detect burn replacements, delayed-effect
  // payouts, and Void Warden Oblivion — then triggers the matching animations.
  // Pure visual; never mutates game state.
  useEffect(() => {
    if (!state) return;
    const prev = prevStateForAnimRef.current;
    // Guard: when processUpdate drains older queue entries after TQ polling already
    // delivered a newer state, this effect fires with state going BACKWARDS (e.g.
    // v145 → v141). Without this guard the marker diff re-detects already-processed
    // markers as "newly marked" (condemned cards appear to be added again once the
    // burned-state v145 was prev and the older v141 is next), pushing duplicate entries
    // to deferredBrandStrikesRef and causing spellbound.wav to play twice.
    // Fix: skip animation processing for any backward version transition. Do NOT advance
    // prevStateForAnimRef — that way when processUpdate finally drains up to v145, the
    // diff from the already-seen v145 is correctly empty.
    if (prev) {
      // eslint-disable-next-line no-restricted-syntax -- TanStack Query widens GameState; GameState always has version:number (Zod-validated). The double-cast is the same pattern used for processUpdateRef calls elsewhere in this file.
      const stateVerRaw = (state as unknown as { version?: number }).version;
      // eslint-disable-next-line no-restricted-syntax -- same TQ-widened type reason as above line
      const prevVerRaw = (prev as unknown as { version?: number }).version;
      if (typeof stateVerRaw === 'number' && typeof prevVerRaw === 'number' && stateVerRaw < prevVerRaw) {
        return;
      }
    }
    prevStateForAnimRef.current = state;
    if (!prev) return;

    // ── Card burn replacements ──────────────────────────────────────────────
    // A slot is a Burn when its Artifact ID changes outside Forge/reserve actions,
    // meaning the engine replaced it as a side effect.
    // burnEvents carries { cardId, tier, turn, sourceLuminaryId } for each burn
    // so we can attribute each flash to the correct Luminary for future theming.
    const lastAction = state.lastAction;
    const isForgeOrReserve =
      lastAction?.type === 'forge_artifact' ||
      lastAction?.type === 'foundry_forge_artifact' ||
      lastAction?.type === 'forge_reserved_artifact' ||
      lastAction?.type === 'reserve_artifact';

    // ── BurnEvent diff → slot flash + destination flight ──────────────────
    // BurnEvents are authoritative because Eternal Recurrence redirects a
    // Burned Artifact straight to its Archive without adding it to burnPile.
    // Locate each new event's card in the previous Forge state so the flash
    // starts from the exact slot that was replaced or emptied.
    {
      const prevBurnEventIds = new Set((prev.burnEvents ?? []).map(event => event.eventId));
      const newBurnEvents = (state.burnEvents ?? []).filter(
        event => !prevBurnEventIds.has(event.eventId),
      );
      if (newBurnEvents.length > 0) {
        const prevTiers = [
          { tier: 1 as const, cards: prev.forgeTier1 },
          { tier: 2 as const, cards: prev.forgeTier2 },
          { tier: 3 as const, cards: prev.forgeTier3 },
        ] as const;
        // Collect every newly Burned card so the badge, flash, and destination
        // flight share one immutable event payload.
        const burnEntries: LuminaryBurnVisualEntry[] = [];
        for (const burnEvent of newBurnEvents) {
          const burnedId = burnEvent.cardId;
          let found = false;
          for (const { tier, cards } of prevTiers) {
            if (found) break;
            for (let i = 0; i < cards.length; i++) {
              if (cards[i]?.id === burnedId) {
                burnEntries.push({
                  burnedId,
                  tier,
                  slotIndex: i,
                  sourceLuminaryId: burnEvent.sourceLuminaryId,
                  destination: burnEvent.destination ?? 'burn_pile',
                  condemnedCard: cards[i] ?? null,
                });
                found = true;
                break;
              }
            }
          }
        }

        if (burnEntries.length > 0) {
          // ── Split: lum_ember burns → director-owned; all others → normal path ──
          // CinderMandateBurnDirector owns the full BurnFlash timeline for Ember
          // Sovereign burns. Save slot rects before the Forge refill so the
          // director has the correct pre-refill positions when it mounts.
          const directorEntries = burnEntries.filter(
            e => e.sourceLuminaryId === 'lum_ember' && e.destination === 'burn_pile',
          );
          const normalEntries = burnEntries.filter(
            e => e.sourceLuminaryId !== 'lum_ember' || e.destination === 'archive',
          );

          if (directorEntries.length > 0) {
            // Reset accumulator for this activation cycle
            pendingDirectorBurnSlotsRef.current = [];
            for (const { tier, slotIndex, sourceLuminaryId, condemnedCard } of directorEntries) {
              const slotKey = `${tier}-${slotIndex}`;
              const slotEl = document.querySelector(`[data-slot-key="${slotKey}"]`);
              if (slotEl) {
                pendingDirectorBurnSlotsRef.current.push({
                  slotRect: slotEl.getBoundingClientRect(),
                  slotKey,
                  sourceLuminaryId,
                  condemnedCard,
                });
              }
            }
            // Do NOT call setHiddenSlots here. Hiding slots in the same React
            // batch as setActivationQueue causes the director to mount with
            // empty placeholders already in the DOM — the camera frames empty
            // dashed boxes and the decree phase shows no cards. Instead, the
            // director calls onHideSlots at burnAt (Phase 4), hiding slots and
            // firing BurnFlash in the same setState batch so replacement cards
            // never flash through while the fire animation plays.
          }

          // Normal (non-director) burns: Phase 1 badge + Phase 2 BurnFlash.
          // If the burn arrived with a summon/activation event, defer it until
          // after the arrival and generic activation cinematic have resolved.
          if (normalEntries.length > 0) {
            const prevPendingSummons = prev.pendingSummonEvents ?? [];
            const nextPendingSummons = state.pendingSummonEvents ?? [];
            const hasIncomingArrival = nextPendingSummons.some(
              e => !prevPendingSummons.some(p => p.eventId === e.eventId),
            );
            const prevActivations = prev.pendingLuminaryActivationEvents ?? [];
            const nextActivations = state.pendingLuminaryActivationEvents ?? [];
            const hasIncomingActivation = nextActivations.some(
              e => !prevActivations.some(p => p.eventId === e.eventId),
            );
            const arrivalPending =
              hasIncomingArrival ||
              arrivalQueueLenRef.current > 0 ||
              pendingSuppressArrivalIdsRef.current.size > 0 ||
              arrivalVisualHoldIdsRef.current.size > 0 ||
              returningLuminaryIdsRef.current.size > 0 ||
              summonActivationLocksRef.current.size > 0;
            const activationPending =
              hasIncomingActivation ||
              activationQueueLenRef.current > 0 ||
              deferredActivationEventsRef.current.length > 0;

            if (arrivalPending || activationPending) {
              deferredNormalBurnsRef.current.push(...normalEntries);
              logArrivalDebug('burn.deferred', {
                count: normalEntries.length,
                sourceLuminaryIds: Array.from(new Set(normalEntries.map(e => e.sourceLuminaryId).filter(Boolean))),
                arrivalPending,
                activationPending,
              });
            } else {
              playNormalBurnVisuals(normalEntries);
            }
          }
        }
      }
    }

    // ── Newly applied Forge markers: badge pop + ArrivalBrandStrike beam ──
    {
      const prevMarkers = prev.artifactMarkers ?? {};
      const nextMarkers = state.artifactMarkers ?? {};
      const addedBrandEntries = Object.keys(nextMarkers).flatMap(cardId => (
        getAddedArtifactBrandTypes(prevMarkers[cardId], nextMarkers[cardId])
          .map(type => ({ cardId, type }))
      ));
      const firstType = addedBrandEntries[0]?.type;
      const newlyMarked = firstType
        ? addedBrandEntries
            .filter(entry => entry.type === firstType)
            .map(entry => entry.cardId)
        : [];
      // marker diff detected for animation triggering
      if (newlyMarked.length > 0) {
        // The brand strike may "orchestrate" the camera — reframe the board so the
        // originating Luminary portal AND the branded cards are visible — but ONLY when
        // no other cutscene owns the view. During an activation/arrival cinematic the
        // board is already framed, so we just fire the beams against the current layout.
        //
        // RACE GUARD: a Luminary arrival brands Forge Artifacts in the same atomic state
        // snapshot that triggers its arrival cutscene — so this marker block usually runs
        // alongside an incoming arrival. The arrival queue is populated asynchronously (via
        // rAF inside enqueueSummon), so arrivalQueueLenRef can still read 0 here even though
        // a cutscene is about to take the camera. We therefore also (a) detect a brand-new
        // pendingSummonEvent / activation event directly from the prev→state diff (the same
        // signal the drain uses to enqueue), and (b) consult pendingSuppressArrivalIdsRef,
        // which is set synchronously at arrival detection and cleared only once the arrival
        // lands in the queue. Either one means a cinematic owns the camera ⇒ don't orchestrate.
        const prevPending = prev.pendingSummonEvents ?? [];
        const nextPending = state.pendingSummonEvents ?? [];
        const hasIncomingArrival = nextPending.some(
          e => !prevPending.some(p => p.eventId === e.eventId),
        );
        const prevActivations = prev.pendingLuminaryActivationEvents ?? [];
        const nextActivations = state.pendingLuminaryActivationEvents ?? [];
        const hasIncomingActivation = nextActivations.some(
          e => !prevActivations.some(p => p.eventId === e.eventId),
        );
        const cameraFree =
          activationQueueLenRef.current === 0 &&
          arrivalQueueLenRef.current === 0 &&
          pendingSuppressArrivalIdsRef.current.size === 0 &&
          arrivalVisualHoldIdsRef.current.size === 0 &&
          returningLuminaryIdsRef.current.size === 0 &&
          !hasIncomingArrival &&
          !hasIncomingActivation;
        const prefersReduced =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const instant = abridgedAnims || prefersReduced;

        // Markers from one arrival share a type ⇒ a single source Luminary. Resolve it
        // from the first newly-marked card; unmapped types (e.g. burned) yield no source.
        const srcMeta = firstType ? MARKER_SOURCE[firstType] : null;
        const srcLum = srcMeta ? state.luminaries?.find(l => l.id === srcMeta.lumId) : undefined;
        const arrivalPresentationPending =
          hasIncomingArrival ||
          arrivalQueueLenRef.current > 0 ||
          pendingSuppressArrivalIdsRef.current.size > 0 ||
          arrivalVisualHoldIdsRef.current.size > 0 ||
          returningLuminaryIdsRef.current.size > 0;
        // Suppress newly-marked cards visually until their brand-strike beam fires.
        // Each card's overlay + badge are hidden while suppressedMarkerIds contains its ID.
        // The stale-suppression sweep removes entries when Artifacts leave the Forge.
        // Always hide the marker before the strike/reveal boundary. In abridged
        // and reduced-motion mode the strike may have zero lead or be visually
        // skipped, but the reveal still happens after fireBrandStrikes returns.
        // This prevents a persistent brand from appearing a frame early.
        setSuppressedMarkerIds(prev => new Set([...prev, ...newlyMarked]));

        if (cameraFree && srcMeta && srcLum && !isTutorial) {
          // Synthesize a minimal procedure so the orchestrator frames BOTH the source
          // portal and every branded card before the beams fire.
          const keyword: 'forgotten' | 'condemned' | 'nullified' | 'seeded' =
            firstType === 'avatar_seed'
              ? 'seeded'
              : (firstType as 'forgotten' | 'condemned' | 'nullified');
          // Include only branded Forge Artifacts in the bounding box; the Luminary
          // portal is the beam source and is always visible in the portal strip, so
          // there is no need to scroll it into view. Excluding luminaryPulse keeps the
          // centering tight on the affected cards.
          const procedure: AnimationProcedureStep[] = [
            { type: 'targetClaim', targetIds: newlyMarked, keyword },
          ];
          const lead = instant ? 0 : SOURCE_PULSE_LEAD_MS;
          // Extend the drain gate BEFORE prepare() so the turn announcement cannot
          // slip through during the camera-settle window (~800ms) or during the beam
          // and aura animation that follows.  Uses the conservative max lead
          // (SOURCE_PULSE_LEAD_MS) because we don't yet know whether a valid portal
          // rect will be found; the gate is refined inside onSettled once we know.
          const ARRIVAL_CAMERA_SETTLE_MS = 800;
          const estimatedTotalMs = lead + (newlyMarked.length - 1) * 90 + 1420 + 400;
          setAnimEndTime(ARRIVAL_CAMERA_SETTLE_MS + estimatedTotalMs);
          viewOrchestrator.prepare(procedure, () => {
            // Re-capture rects AFTER the centering scroll settles, so they reflect the
            // final (possibly compacted + scrolled) layout.
            const portalEl = document.querySelector(`[data-luminary-id="${srcMeta.lumId}"]`);
            let source:
              | { rect: { x: number; y: number; w: number; h: number }; primary: string; secondary: string }
              | undefined;
            if (portalEl && !instant) {
              const pr = portalEl.getBoundingClientRect();
              if (pr.width > 0) {
                source = {
                  rect: { x: pr.x, y: pr.y, w: pr.width, h: pr.height },
                  primary: srcLum.summonColor ?? '#a78bfa',
                  secondary: srcLum.summonSecondaryColor ?? srcLum.summonColor ?? '#f0abfc',
                };
              }
            }
            const usedLead = source ? lead : 0;
            const strikeId = fireBrandStrikes(newlyMarked, nextMarkers, {
              source,
              lead: usedLead,
              orchestrated: true,
              restoreImmediate: instant,
            });
            if (!strikeId) {
              // Nothing drawn (cards already gone) — unsuppress and release the camera immediately.
              setSuppressedMarkerIds(prev => {
                const next = new Set(prev);
                newlyMarked.forEach(id => next.delete(id));
                return next;
              });
              viewOrchestrator.restore({ immediate: instant });
              return;
            }
            // fireBrandStrikes is now playing — reveal each card's overlay+badge.
            // brandDelayMap drives the per-card badge pop-in timing (impact+150ms).
            setSuppressedMarkerIds(prev => {
              const next = new Set(prev);
              newlyMarked.forEach(id => next.delete(id));
              return next;
            });
            // Safety net: if ArrivalBrandStrike never reports done (unmount, manual scroll,
            // etc.), still release the camera. restore() is idempotent with the render-site
            // onDone, so a double call is a harmless no-op.
            // Matches onDone timing: maxDelay + 1420ms (aura-complete), plus 400ms buffer.
            const totalMs = usedLead + (newlyMarked.length - 1) * 90 + 1420 + 400;
            // Refine the drain gate now that we have the exact lead duration.
            setAnimEndTime(totalMs);
            setTimeout(() => viewOrchestrator.restore({ immediate: instant }), totalMs);
          }, { forceOrchestrate: true });
        } else {
          // Camera owned by another cutscene (arrival in progress, or no mapped source).
          // If an arrival is in progress, defer the brand strike so it fires AFTER the
          // summoning is dismissed — never overlap effect animations with summoning.
          // Use hasIncomingArrival (computed from the prev→state diff) rather than the
          // queue length ref, because the ref hasn't been updated yet for this cycle.
          // Defer whenever ANY arrival owns the board:
          //   • hasIncomingArrival — new summon in this same state snapshot (rAF not yet
          //     fired, so arrivalQueueLenRef may still read 0)
          //   • arrivalQueueLenRef > 0 — a cutscene is already running
          //   • pendingSuppressArrivalIdsRef.size > 0 — summon detected, rAF queued
          if (arrivalPresentationPending) {
            // Phase 1 (summon phase): markers are suppressed (added to suppressedMarkerIds above).
            // The brand-strike beam is the visual introduction for each branded card — the overlay
            // and badge stay hidden during the arrival cutscene.
            // Phase 2 fires after arrival dismissal: fireBrandStrikes → suppressedMarkerIds cleared
            // → overlay appears + badge springs in via brandDelayMap timing.
            // If cards burn before Phase 2 (Cinder Mandate burn): their artifactMarkers
            // entry is removed, the render check short-circuits naturally, and the stale-suppression
            // sweep removes the ID from suppressedMarkerIds — no ghost overlays.
            deferredBrandStrikesRef.current.push({
              ids: newlyMarked,
              markers: nextMarkers,
              srcMeta,
              srcLum,
              instant,
            });
          } else if (
            !hasIncomingActivation &&
            !(activationQueueLenRef.current > 0 && firstType === 'condemned')
          ) {
            // No arrival or active activation director blocking — fire immediately.
            //
            // Two guards protect against premature badge reveal:
            //   !hasIncomingActivation — covers the rare case where markers and
            //     activation event arrive in the same state diff (event not yet consumed).
            //   !(activationQueueLenRef > 0 && firstType === 'condemned') — covers the
            //     normal case: artifactMarkers are set in the SERVER'S RESPONSE to
            //     resolve_luminary_activation, so by the time processUpdate sees the newly
            //     condemned cards, the activation event is already gone from the state but
            //     the CinderMandateBrandingDirector is still mid-sequence (queue len > 0).
            //     Firing here would clear suppression before the beat overlay + beam fire.
            //     Leave suppression in place; the director calls unsuppressMarkers itself.
            fireBrandStrikes(newlyMarked, nextMarkers);
            // Reveal overlays+badges immediately; brandDelayMap handles per-card badge timing.
            setSuppressedMarkerIds(prev => {
              const next = new Set(prev);
              newlyMarked.forEach(id => next.delete(id));
              return next;
            });
          }
          // else: activation director owns this — suppression stays; director fires + unsuppresses.
        }
      }
    }

    const activationEventIdsFor = (luminaryId: string) => (
      (state.pendingLuminaryActivationEvents ?? [])
        .filter(event => event.luminaryId === luminaryId)
        .map(event => event.eventId)
    );
    const activationEventIdFor = (luminaryId: string) => (
      activationEventIdsFor(luminaryId).at(-1)
    );

    // ── Concordance Mandala (+2 at 8 Radiance, +2 at 10 Radiance) ───────────
    const concordanceBestowals = createPerfectCoherenceBestowals(
      prev,
      state,
      activationEventIdsFor('lum_radiant'),
    );
    if (concordanceBestowals.length > 0) {
      setDelayedEffectFloatQueue(queue => [
        ...queue,
        ...concordanceBestowals,
      ]);
    }

    // ── Catalyst Bloom (N burns → N eminence payout) ───────────────────────
    const prevBloom  = prev.catalystBloomBurnCount  ?? 0;
    const newBloom   = state.catalystBloomBurnCount ?? 0;
    if (prevBloom > 0 && newBloom === 0) {
      setDelayedEffectFloatQueue(queue => [
        ...queue,
        {
          id: `bloom-${Date.now()}`,
          luminaryId: 'lum_bloom',
          activationEventId: activationEventIdFor('lum_bloom'),
          amount: prevBloom,
          color: '#4ade80',
          label: 'Eminence',
        },
      ]);
    }

    // ── The Glass Orchard (+1 bonus copy) ─────────────────────────────────
    if (!prev.glassOrchardTriggered && state.glassOrchardTriggered) {
      setDelayedEffectFloatQueue(queue => [
        ...queue,
        {
          id: `orchard-${Date.now()}`,
          luminaryId: 'lum_orchard',
          activationEventId: activationEventIdFor('lum_orchard'),
          amount: 1,
          color: '#86efac',
          label: 'Affinity bonus',
        },
      ]);
    }

    // ── Catalyst Bloom seed particles (per burn while Bloom is claimed) ────
    const bloomClaimed = state.players.some(p => p.claimedLuminaryIds?.includes('lum_bloom'));
    if (bloomClaimed && !isForgeOrReserve) {
      const bloomEl  = document.querySelector('[data-luminary-id="lum_bloom"]');
      const bloomRect = bloomEl?.getBoundingClientRect() ?? null;
      if (bloomRect) {
        const tiers2 = [
          { tier: 1 as const, oldCards: prev.forgeTier1, newCards: state.forgeTier1 },
          { tier: 2 as const, oldCards: prev.forgeTier2, newCards: state.forgeTier2 },
          { tier: 3 as const, oldCards: prev.forgeTier3, newCards: state.forgeTier3 },
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // ── Undo hint trigger ─────────────────────────────────────────────────────
  // Must live here — before the early returns — so hook order is stable across
  // renders when state/session are null on the first render cycle.
  const affinityQueueActive = Object.keys(selectedAffinities).length > 0 && !coreActionSubmitted;
  useEffect(() => {
    if (!affinityQueueActive) {
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
  }, [affinityQueueActive, hintsEnabled]);

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
  const arrivalGateActive = activationGateActive;
  arrivalQueueLenRef.current = arrivalQueue.length;
  activationQueueLenRef.current = activationQueue.length;

  useEffect(() => {
    logArrivalDebug('arrivalQueue.changed', {
      entries: arrivalQueue.map(entry => ({
        eventId: entry.eventId,
        luminaryId: entry.id,
        isDevTest: entry.isDevTest,
        hasCardRect: !!entry.cardRect,
      })),
    });
    if (arrivalQueue.length === 0) renderedArrivalEventIdRef.current = null;
  }, [arrivalQueue, logArrivalDebug]);

  // Stale-suppression sweep: any card ID that's no longer in state.artifactMarkers
  // (burned, forged, reserved) is removed from suppressedMarkerIds so the set
  // never accumulates phantom entries. Uses functional update to avoid capturing
  // stale suppressedMarkerIds in the dep array while still reading the latest prev.
  useEffect(() => {
    setSuppressedMarkerIds(prev => {
      if (prev.size === 0) return prev;
      const activeIds = new Set(Object.keys(state?.artifactMarkers ?? {}));
      let changed = false;
      for (const id of prev) {
        if (!activeIds.has(id)) { changed = true; break; }
      }
      if (!changed) return prev;
      return new Set([...prev].filter(id => activeIds.has(id)));
    });
  }, [state?.artifactMarkers]);
  useEffect(() => {
    setRevealedBrandKeys(previous => {
      if (previous.size === 0) return previous;
      const activeKeys = new Set(
        Object.entries(state?.artifactMarkers ?? {}).flatMap(([cardId, marker]) => (
          getArtifactBrandTypes(marker).map(type => getArtifactBrandVisibilityKey(cardId, type))
        )),
      );
      const next = new Set([...previous].filter(key => activeKeys.has(key)));
      return next.size === previous.size ? previous : next;
    });
  }, [state?.artifactMarkers]);
  const isActivePlayer = !!state && !!session && state.status === 'playing' &&
    state.players[state.currentPlayerIndex]?.playerId === session.playerId;

  // pendingLuminaryChoice: set when the current player must order a simultaneous
  // multi-Luminary claim before taking any other action.
  const pendingLuminaryChoice = state?.pendingLuminaryChoice ?? null;
  const luminaryChoiceIsOurs = !!pendingLuminaryChoice && pendingLuminaryChoice.playerId === session?.playerId;
  const luminaryChoiceActive = !!pendingLuminaryChoice;
  const turnOrderIntroActive = !!turnOrderIntro;
  const blueprintPresentationQueued =
    (state?.pendingBlueprintManifestationEvents?.length ?? 0) > 0 ||
    (state?.pendingBlueprintDetonationEvents?.length ?? 0) > 0 ||
    (state?.pendingScenarioProtocolEvents?.length ?? 0) > 0;
  const nextBlueprintManifestationEvent = state?.pendingBlueprintManifestationEvents?.[0] ?? null;
  const nextBlueprintDetonationEvent = state?.pendingBlueprintDetonationEvents?.[0] ?? null;
  const nextScenarioProtocolEvent = state?.pendingScenarioProtocolEvents?.[0] ?? null;
  const pendingTrapPresentationEventId =
    nextBlueprintManifestationEvent
      ? null
      : nextBlueprintDetonationEvent?.eventId ??
        (nextScenarioProtocolEvent?.kind === 'effect' ? nextScenarioProtocolEvent.eventId : null);
  const activeForgeVisual = cardActionBurst
    ? { kind: 'local' as const, key: cardActionBurst.key }
    : opponentForgeAbsorb
      ? { kind: 'opponent' as const, key: opponentForgeAbsorb.key }
      : null;
  const activeForgeVisualStamped = Boolean(
    activeForgeVisual &&
    forgeTrapHandoff?.kind === activeForgeVisual.kind &&
    forgeTrapHandoff.key === activeForgeVisual.key,
  );
  const trapCanInterruptForgeVisual = Boolean(
    pendingTrapPresentationEventId &&
    (!activeForgeVisual || activeForgeVisualStamped),
  );
  const lastAction = state?.lastAction as { type?: string; cardId?: unknown } | null | undefined;
  const lastActionType = lastAction?.type;
  const lastActionUsesForgeVisual =
    lastActionType === 'forge_artifact' ||
    lastActionType === 'foundry_forge_artifact' ||
    (lastActionType === 'reserve_artifact' && Boolean(lastAction?.cardId));
  const forgeAnimationInFlight =
    !trapCanInterruptForgeVisual &&
    (
      Boolean(cardActionBurst || opponentForgeAbsorb) ||
      (
        lastActionUsesForgeVisual &&
        animationLockUntil > Date.now()
      )
    );
  const blueprintPresentationActive =
    blueprintPresentationQueued &&
    !forgeAnimationInFlight;
  useEffect(() => {
    if (!pendingTrapPresentationEventId) {
      trapForgeHandoffEventRef.current = null;
      return;
    }
    if (!blueprintPresentationActive || !trapCanInterruptForgeVisual) return;
    if (trapForgeHandoffEventRef.current === pendingTrapPresentationEventId) return;
    trapForgeHandoffEventRef.current = pendingTrapPresentationEventId;

    for (const timer of cardAnimTimersRef.current) clearTimeout(timer);
    cardAnimTimersRef.current = [];
    cardActionBurstKeyRef.current += 1;
    opponentForgeAbsorbKeyRef.current += 1;
    animationEndTimeRef.current = 0;
    setAnimationLockUntil(0);
    setCardActionBurst(null);
    setOpponentForgeAbsorb(null);
    setForgeTrapHandoff(null);
    setHiddenSlots(new Set());
    setFlippingCards(new Set());
    setCompactGhost(null);
  }, [blueprintPresentationActive, pendingTrapPresentationEventId, trapCanInterruptForgeVisual]);
  // isMyTurn is false while we're waiting through modal/intro phases — the active
  // overlay is the only interactive surface during that phase.
  // Camera movement and the broader presentation lease are separate signals.
  // The lease stays active through aftermath and delayed effects, even while the
  // camera itself is momentarily stationary between phases.
  const isMyTurn =
    isActivePlayer &&
    !authoritativeLuminaryResolutionActive &&
    !luminaryPresentationActive &&
    !blueprintPresentationQueued &&
    !luminaryChoiceIsOurs &&
    !turnOrderIntroActive;
  const visualTimelineLocked = queuedStateCount > 0 || blueprintPresentationQueued;
  const isMyTurnForCoreAction =
    isMyTurn &&
    !coreActionSubmitted &&
    !plannedActionCommitPending &&
    !turnPresentationPending &&
    !state?.coreActionUsed &&
    !isCameraControlled &&
    !visualTimelineLocked;
  const me = state?.players.find(p => p.playerId === session?.playerId);
  // Planning is future intent, not a present-turn mutation. It remains available
  // during opponent turns, queued state, turn presentation, and camera restoration.
  // Only an active exclusive Luminary presentation may temporarily own the surface.
  const canPlan = canUsePlanningEngine({
    gameStatus: state?.status,
    hasLocalPlayer: !!me,
    exclusivePresentationActive: luminaryCameraSequenceRequested || blueprintPresentationQueued,
    arrivalGateActive,
    localArrivalSkipped,
  });

  // Focus-trap: win overlay (game over screen — Escape is a no-op since there is nothing to dismiss)
  // Only active after the victory cinematic has been dismissed.
  useFocusTrap(
    winOverlayContainerRef,
    !isLumiiScenario && state?.status === 'finished' && !pendingGameOver && !summonSequenceActive && !showCinematic && showWinOverlay,
    () => { /* terminal state — no dismiss action */ },
  );

  const myCivilizationKey = useMemo(() => civilizationStateKey(me), [me]);
  const civilizationModel = useMemo(() => {
    const forgedArtifacts = me?.forgedArtifacts ?? [];
    const discountedForgeIds = me?.discountedForgeIds ?? [];
    const tier = getKardashevTier(forgedArtifacts, discountedForgeIds);
    const palette = getDominantAffinityPalette(forgedArtifacts);
    const profile = buildCivilizationProfile(forgedArtifacts);
    // Civilization structure is earned through forging, not temporary affinities.
    // Each tier's artifacts add lasting visual capacity to the civilization scene.
    const tierArtifacts = forgedArtifacts.filter((artifact) => artifact.tier === Math.max(1, tier));
    const milestones = tier === 3 ? 3 : tier === 2 ? 4 : 5;
    return {
      forgedArtifacts,
      discountedForgeIds,
      tier,
      palette,
      profile,
      progressFraction: Math.min(1, tierArtifacts.length / milestones),
      name: me?.civName || getCivilizationName(palette, tier),
      forgedCount: forgedArtifacts.length,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCivilizationKey]);
  const myForgedArtifacts = civilizationModel.forgedArtifacts;
  const revealBlueprintText = myForgedArtifacts.length > 0;
  const forgottenHourCycleState = state?.forgottenHourCycle;
  const forgottenHourEncryptBlocked = useMemo(() => {
    const activeOwnerIds = new Set<string>();
    for (const [ownerId, cycle] of Object.entries(forgottenHourCycleState ?? {})) {
      if (cycle?.cooldownOwnerTurnsRemaining === null) activeOwnerIds.add(ownerId);
    }
    for (const marker of Object.values(state?.artifactMarkers ?? {})) {
      for (const brand of getArtifactBrands(marker)) {
        if (brand.type === 'forgotten') activeOwnerIds.add(brand.ownerId);
      }
    }
    return activeOwnerIds.size > 0 && !activeOwnerIds.has(session?.playerId ?? '');
  }, [forgottenHourCycleState, session?.playerId, state?.artifactMarkers]);
  const kardashevTier = civilizationModel.tier;
  const kardashevPalette = civilizationModel.palette;
  const civilizationProfile = civilizationModel.profile;
  const kardashevProgressFraction = civilizationModel.progressFraction;

  const opponentData = useMemo(() => {
    const players = state?.players;
    if (!players) return {} as Record<string, { totalAffinity: number; cardCount: number; reservedCount: number; civPalette: AffinityPalette; civName: string }>;
    return Object.fromEntries(
      players.map(p => {
        const civPalette = getDominantAffinityPalette(p.forgedArtifacts);
        return [p.playerId, {
          totalAffinity: Object.values(p.affinities).reduce<number>((a, b) => a + b, 0),
          cardCount: p.forgedArtifacts.length,
          reservedCount: p.reservedArtifacts.length,
          civPalette,
          civName: p.civName || getCivilizationName(civPalette, getKardashevTier(p.forgedArtifacts, p.discountedForgeIds)),
        }];
      })
    );
  }, [state?.players]);

  const ordinaryEffectiveCost = useCallback((
    card: ArtifactCard,
    p: GamePlayerState,
  ) => {
    const luminaryAffinities: LuminaryActiveState[] = state?.luminaryAffinities ?? [];
    const turnCount: number = state?.turnCount ?? 0;
    const out: Record<string, number> = {};
    for (const c of AFFINITIES) {
      if (c === 'singularity') continue;
      let bonus = p.bonuses[c as keyof AffinityCounts] ?? 0;
      for (const la of luminaryAffinities) {
        if (la.ownerId === p.playerId && la.activeAffinity === c && turnCount > la.summonedAtTurnCount) {
          bonus++;
        }
      }
      out[c] = Math.max(0, (card.cost[c as keyof AffinityCounts] ?? 0) - bonus);
    }
    return out;
  }, [state?.luminaryAffinities, state?.turnCount]);
  const resolvePlayerForgeCost = useCallback((
    card: ArtifactCard,
    p: GamePlayerState,
    focusAffinity?: NaturalAffinityKey | null,
  ) => resolveBalanceLabForgeCost({
    candidate: balanceLabCandidate,
    card,
    player: p,
    ordinaryCost: ordinaryEffectiveCost(card, p),
    fromReserve: p.reservedArtifacts.some((reserved) => reserved.id === card.id),
    focusAffinity,
  }), [balanceLabCandidate, ordinaryEffectiveCost]);
  const effectiveCost = useCallback((
    card: ArtifactCard,
    p: GamePlayerState,
  ) => resolvePlayerForgeCost(card, p).cost, [resolvePlayerForgeCost]);
  const canPayForgeResolution = useCallback((
    resolution: ReturnType<typeof resolvePlayerForgeCost>,
    p: GamePlayerState,
  ): boolean => {
    if (!resolution.paymentFloorSatisfied) return false;
    let singularityNeeded = 0;
    for (const [c, need] of Object.entries(resolution.cost)) {
      const have = p.affinities[c as keyof AffinityCounts] ?? 0;
      if (have < need) singularityNeeded += need - have;
    }
    return singularityNeeded <= (p.affinities.singularity ?? 0);
  }, []);
  const canAffordCard = useCallback((
    card: ArtifactCard,
    p: GamePlayerState,
    focusAffinity?: NaturalAffinityKey | null,
  ): boolean => {
    const fromReserve = p.reservedArtifacts.some((reserved) => reserved.id === card.id);
    const options = balanceLabFocusOptions({
      candidate: balanceLabCandidate,
      ordinaryCost: ordinaryEffectiveCost(card, p),
      fromReserve,
    });
    if (focusAffinity || options.length <= 1) {
      return canPayForgeResolution(resolvePlayerForgeCost(card, p, focusAffinity), p);
    }
    return options.some((affinity) =>
      canPayForgeResolution(resolvePlayerForgeCost(card, p, affinity), p),
    );
  }, [balanceLabCandidate, canPayForgeResolution, ordinaryEffectiveCost, resolvePlayerForgeCost]);
  const selectedFocusOptions = selectedCard && me
    ? balanceLabFocusOptions({
        candidate: balanceLabCandidate,
        ordinaryCost: ordinaryEffectiveCost(selectedCard.card, me),
        fromReserve: selectedCard.fromReserve,
      })
    : [];
  const selectedFocusAffinity = pendingFocusAffinity && selectedFocusOptions.includes(pendingFocusAffinity)
    ? pendingFocusAffinity
    : selectedFocusOptions.length === 1
      ? selectedFocusOptions[0]
      : null;
  const focusSelectionRequired = selectedFocusOptions.length > 1 && !selectedFocusAffinity;
  const foundryProject = (
    me?.manifestedBlueprintProjects ?? me?.manifestedBlueprintDevices ?? []
  ).find((project) => project.blueprintId === 'bp_mantle_to_orbit_foundry');
  const foundryEffectiveCost = useCallback((
    card: ArtifactCard,
    p: GamePlayerState,
  ) => {
    const ordinary = ordinaryEffectiveCost(card, p);
    const out: Record<string, number> = {};
    for (const affinity of AFFINITIES) {
      if (affinity === 'singularity') continue;
      const printed = card.cost[affinity as keyof AffinityCounts] ?? 0;
      out[affinity] = printed > 0 ? Math.max(0, ordinary[affinity] - 1) : 0;
    }
    return out;
  }, [ordinaryEffectiveCost]);
  const canAffordFoundryCard = useCallback((card: ArtifactCard, p: GamePlayerState): boolean => {
    if (card.tier !== 2 || foundryProject?.state !== 'active') return false;
    const cost = foundryEffectiveCost(card, p);
    let singularityNeeded = 0;
    for (const [affinity, needed] of Object.entries(cost)) {
      singularityNeeded += Math.max(
        0,
        needed - (p.affinities[affinity as keyof AffinityCounts] ?? 0),
      );
    }
    return singularityNeeded <= (p.affinities.singularity ?? 0);
  }, [foundryEffectiveCost, foundryProject?.state]);

  // Derived forge-deduction map — how many of each affinity the selected card
  // would spend from the player's current inventory. Placed here (after
  // ── Final Hunger: Assimilation state ──────────────────────────────────────
  const assimilateAvailable = !!(state?.firstHungerAvailable && session && state.firstHungerAvailable === session.playerId);

  // ── Forge-vanish guard for the open Artifact-info panel ────────────────────
  // True when the panel is showing an Artifact in the Forge (not a reserve view
  // or read-only forged Artifact) whose slot has just changed because it was forged,
  // reserved, or burned by another player or a Luminary effect. Drives an
  // immediate visual lock (overlay over the action buttons) plus an auto-close,
  // with a rejection sound if a button is pressed before the panel closes.
  const selectedCardVanished = useMemo<boolean>(() => {
    if (!selectedCard || !state) return false;
    if (selectedCard.fromReserve || selectedCard.readOnly) return false;
    const id = selectedCard.card.id;
    if (selectedCard.fromArchiveTop) {
      const topCards = me?.tideArchiveTopCards;
      const currentTop = selectedCard.card.tier === 1
        ? topCards?.tier1
        : selectedCard.card.tier === 2
          ? topCards?.tier2
          : topCards?.tier3;
      return currentTop?.id !== id;
    }
    const inForge =
      (state.forgeTier1 ?? []).some((c) => c?.id === id) ||
      (state.forgeTier2 ?? []).some((c) => c?.id === id) ||
      (state.forgeTier3 ?? []).some((c) => c?.id === id);
    return !inForge;
  }, [me?.tideArchiveTopCards, selectedCard, state]);

  // When the open Artifact's Forge slot changes, auto-close the panel after a
  // short beat. The delay keeps the lock perceivable and gives the rejection
  // overlay a brief window to catch an in-flight press before unmount.
  useEffect(() => {
    if (!selectedCardVanished) return;
    const timer = setTimeout(() => {
      setSelectedCard(null);
      setPendingSheetAction(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCardVanished]);

  // effectiveCost is declared, before any early returns) so both the TDZ and
  // react-hooks/rules-of-hooks constraints are satisfied. canPlan is inlined
  // via optional chaining because state may still be null at this point.
  const forgeDeductions = useMemo<Partial<Record<AffinityKey, number>> | undefined>(() => {
    if (!selectedCard || !me) return undefined;
    const effCost = effectiveCost(selectedCard.card, me) as Record<string, number>;
    const result: Partial<Record<AffinityKey, number>> = {};
    let singularityNeeded = 0;
    for (const k of AFFINITY_KEYS) {
      if (k === 'singularity') continue;
      const need = effCost[k] ?? 0;
      const have = me.affinities[k as keyof AffinityCounts] ?? 0;
      const spend = Math.min(have, need);
      if (spend > 0) result[k as AffinityKey] = spend;
      singularityNeeded += Math.max(0, need - have);
    }
    if (balanceLabPortableSingularity && singularityNeeded > 0) {
      result.singularity = singularityNeeded;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }, [balanceLabPortableSingularity, effectiveCost, selectedCard, me]);

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

  const showPlannedCancelNotice = (
    playerId?: string,
    reason?: string,
    _version?: number,
  ) => {
    if (!playerId || playerId !== session?.playerId) return;
    const description =
      reason === 'Artifact is no longer in The Forge'
        ? 'The Forge changed before your turn, so your pending action was cleared.'
        : reason ?? 'Your pending action is no longer available.';
    const key = `${playerId}:${description}`;
    if (lastPlannedCancelNoticeRef.current === key) return;
    lastPlannedCancelNoticeRef.current = key;
    setTimeout(() => {
      toast({
        title: 'Pending action cleared',
        description,
      });
    }, 150);
  };

  processUpdateRef.current = (newState: GameState) => {
    const prev = prevStateRef.current;
    const isRematch = prev?.status === 'finished' && newState.status === 'playing';
    const isFreshLiveGameTransition = !!prev && prev.status !== 'playing' && newState.status === 'playing';
    if (prev && newState.version <= prev.version && !isRematch) return;
    if (isFreshLiveGameTransition) {
      const startedAt = Number((newState as { startedAt?: number }).startedAt ?? 0);
      const openingTurnOrderId = newState.openingTurnOrder?.id ?? (startedAt > 0 ? String(startedAt) : null);
      pendingTurnOrderIntroIdRef.current = openingTurnOrderId;
    }
    if (isRematch) {
      gameAudio.resetTransientAudio();
      gameAudio.setEndgameIntensity(0);
      moldCastTimersRef.current.forEach(timer => clearTimeout(timer));
      moldCastTimersRef.current.clear();
      setRefillingSlots(new Map());
      setArchiveManifestationTraces([]);
      viewOrchestrator.endSequence({ immediate: true });
      viewOrchestrator.restore({ immediate: true });
      initialTurnFiredRef.current = false;
      checkedInitialArrivalRef.current = false;
      handledArrivalEventIdsRef.current.clear();
      handledActivationEventIdsRef.current = new Set();
      summonActivationLocksRef.current = new Set();
      setActivationQueue([]);
      pendingSuppressArrivalIdsRef.current = new Set();
      arrivalVisualHoldIdsRef.current = new Set();
      returningLuminaryIdsRef.current = new Set();
      pendingReturnLuminaryIdsRef.current = [];
      resolvedArrivalEventIdsRef.current = new Set();
      pendingArrivalServerResolutionsRef.current = [];
      pendingActivationServerResolutionsRef.current = new Set();
      pendingIronHarbingerSlotsRef.current = [];
      ironHarbingerGhostSlotKeysRef.current = [];
      pendingPhoenixRefillSlotsRef.current = [];
      pendingBlueprintMoldCastsRef.current.clear();
      audibleLuminaryEligibilityIdsRef.current = new Set();
      lastPlannedCancelNoticeRef.current = null;
      for (const timer of opponentEminenceImpactDelayTimersRef.current) clearTimeout(timer);
      opponentEminenceImpactDelayTimersRef.current = [];
      clearQueuedStateUpdates();
      gameFinishedRef.current = false;
      setOpponentEminenceImpact(null);
      setClaimedThisSession([]);
      setArrivalVisualHoldIds([]);
      setReturningLuminaryIds([]);
      setIronHarbingerGhostIds({});
      setShowCinematic(true);
    }

      if (prev) {
        const newlyEligibleIds: string[] = [];
        const rememberEligible = (luminaryId: string) => {
          if (!luminaryId || audibleLuminaryEligibilityIdsRef.current.has(luminaryId)) return;
          audibleLuminaryEligibilityIdsRef.current.add(luminaryId);
          newlyEligibleIds.push(luminaryId);
        };

        for (const luminaryId of newState.pendingLuminaryChoice?.candidates ?? []) {
          rememberEligible(luminaryId);
        }

        const previousSummonEventIds = new Set(
          (prev.pendingSummonEvents ?? []).map((event) => event.eventId),
        );
        for (const event of newState.pendingSummonEvents ?? []) {
          if (!previousSummonEventIds.has(event.eventId)) rememberEligible(event.luminaryId);
        }

        if (newlyEligibleIds.length > 0) {
          gameAudio.playLuminaryEligibility(newlyEligibleIds.length);
        }

        const previousAffinityByLuminary = new Map(
          (prev.luminaryAffinities ?? []).map((entry) => [entry.luminaryId, entry.activeAffinity] as const),
        );
        const changedAffinities = (newState.luminaryAffinities ?? []).filter((entry) => {
          const previousAffinity = previousAffinityByLuminary.get(entry.luminaryId);
          return previousAffinity !== undefined && previousAffinity !== entry.activeAffinity;
        });
        changedAffinities.forEach((entry, index) => {
          setTimeout(
            () => gameAudio.playAffinitySwitch(entry.activeAffinity as AffinityKey),
            index * 80,
          );
        });
      }
      const action = newState.lastAction;

      // ── Planned-action cancellation ────────────────────────────────────────
      // The engine stamps lastAction = { type: "planned_action_cancelled", playerId, reason }
      // on the second version bump inside the deferred-failure branch of resolve_summon (arrival gate).
      // This lets us distinguish a clean arrival resolution from one that also voided
      // the waiting player's planned move.  Only show the notice to the affected player;
      // no Affinity or Forge animation should be triggered for this update.
      if (action?.type === 'planned_action_cancelled') {
        showPlannedCancelNotice(
          action.playerId as string | undefined,
          action.reason as string | undefined,
          newState.version,
        );
        queryClient.setQueryData(getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }), newState);
        prevStateRef.current = newState;
        return;
      }

      const isForgeAction = action && (
        action.type === 'forge_artifact' ||
        action.type === 'foundry_forge_artifact' ||
        (action.type === 'reserve_artifact' && action.cardId)
      );

      const forgeActionKey = isForgeAction ? JSON.stringify(action) : null;
      const isTideArchiveForgeAction =
        action?.type === 'forge_artifact' && action.luminaryId === 'lum_tide';
      const optimisticForge =
        (action?.type === 'forge_artifact' || action?.type === 'foundry_forge_artifact') &&
        action.playerId === session?.playerId &&
        optimisticLocalForgeRef.current?.cardId === action?.cardId
          ? optimisticLocalForgeRef.current
          : null;

      if (
        prev &&
        forgeActionKey &&
        isTideArchiveForgeAction &&
        action.cardId &&
        forgeActionKey !== lastForgeBurstActionRef.current
      ) {
        lastForgeBurstActionRef.current = forgeActionKey;
        const actingPlayerId = action.playerId as string;
        const previousPlayer = (prev.players as GamePlayerState[]).find(
          (candidate) => candidate.playerId === actingPlayerId,
        );
        const player = (newState.players as GamePlayerState[]).find(
          (candidate) => candidate.playerId === actingPlayerId,
        );
        const previousTops = previousPlayer?.tideArchiveTopCards;
        const exitCard = [previousTops?.tier1, previousTops?.tier2, previousTops?.tier3]
          .find((card) => card?.id === action.cardId) ??
          player?.forgedArtifacts.find((card) => card.id === action.cardId);

        if (exitCard) {
          const tier = exitCard.tier as 1 | 2 | 3;
          const source = document.querySelector<HTMLElement>(`[data-deck-tier="${tier}"]`);
          const sourceRect = source?.getBoundingClientRect();
          const startRect = sourceRect
            ? { x: sourceRect.left, y: sourceRect.top, w: sourceRect.width, h: sourceRect.height }
            : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H };
          const isLocalForge = actingPlayerId === session?.playerId;

          for (const timer of cardAnimTimersRef.current) clearTimeout(timer);
          cardAnimTimersRef.current = [];

          if (isLocalForge) {
            cardActionBurstKeyRef.current += 1;
            const sequence = cardActionBurstKeyRef.current;
            const forgeDestination = resolveLocalForgeDestination();
            const spentCost = player
              ? effectiveCost(exitCard, player) as Record<string, number>
              : {};
            const spentColors = Object.entries(spentCost)
              .filter(([, value]) => value > 0)
              .map(([affinity]) => affinity as AffinityKey);

            setAnimEndTime(abridgedAnims ? ABRIDGED_FORGE_LOCK_MS : FORGE_FULL_MS);
            setCardActionBurst({
              key: sequence,
              card: exitCard,
              tier,
              playerName: player?.playerName ?? 'Unknown',
              avatarId: player?.avatarId ?? null,
              eminence: exitCard.eminence ?? 0,
              gotSingularity: false,
              startRect,
              destPos: forgeDestination?.pos,
              destKind: forgeDestination?.kind,
              destTargetSelector: forgeDestination?.targetSelector,
              spentColors,
              isForgottenForge: false,
            });
            gameAudio.playArtifactForged();
            const bonusAffinity = exitCard.bonusAffinity as AffinityKey;
            if (bonusAffinity && bonusAffinity !== 'singularity') {
              const bonusTimer = setTimeout(
                () => gameAudio.playBonusSound(bonusAffinity),
                abridgedAnims ? 380 : 1000,
              );
              cardAnimTimersRef.current.push(bonusTimer);
            }
            const clearTimer = setTimeout(() => {
              if (cardActionBurstKeyRef.current !== sequence) return;
              if (!abridgedAnims) flashForgeDestination(forgeDestination, exitCard);
              setCardActionBurst(null);
            }, abridgedAnims ? 720 : 1300);
            cardAnimTimersRef.current.push(clearTimer);
          } else {
            const isLumiiForgeTarget = isLumiiScenario && isLumiiForecastPlayer(player);
            if (!isLumiiForgeTarget) {
              traceOpponentActionOwner(
                actingPlayerId,
                AFFINITY_META[exitCard.bonusAffinity as AffinityKey]?.glowHex ?? '#d8ad57',
              );
            }
            const chipCenter = resolveOpponentArtifactAbsorbCenter(
              actingPlayerId,
              isLumiiForgeTarget,
            );
            opponentForgeAbsorbKeyRef.current += 1;
            const sequence = opponentForgeAbsorbKeyRef.current;
            setAnimEndTime(abridgedAnims ? ABRIDGED_FORGE_LOCK_MS : FORGE_FULL_MS);
            setOpponentForgeAbsorb({
              key: sequence,
              playerId: actingPlayerId,
              targetKind: isLumiiForgeTarget ? 'lumii' : 'opponent',
              card: exitCard,
              tier,
              startRect,
              chipCenter,
              ownerName: player?.playerName,
              eminence: exitCard.eminence ?? 0,
              eminenceTotal: player?.eminence,
              spentColors: exitCard.bonusAffinity
                ? [exitCard.bonusAffinity as AffinityKey]
                : [],
              isForgottenForge: false,
            });
            if (isLumiiForgeTarget) {
              scheduleLumiiHudAbsorbPulse(
                abridgedAnims ? LUMII_HUD_ABSORB_ABRIDGED_MS : LUMII_HUD_ABSORB_FULL_MS,
              );
            }
            if (abridgedAnims) gameAudio.playArtifactForged();
            const clearTimer = setTimeout(() => {
              if (opponentForgeAbsorbKeyRef.current === sequence) setOpponentForgeAbsorb(null);
            }, abridgedAnims ? 720 : 1250);
            cardAnimTimersRef.current.push(clearTimer);
          }
        }
      }

      if (prev && forgeActionKey && optimisticForge) {
        // The forged card already departed on tap. The authoritative snapshot owns
        // the replacement identity, so hand directly from departure to Archive deal.
        lastForgeBurstActionRef.current = forgeActionKey;
        optimisticLocalForgeRef.current = null;
        const forgeRowsBefore: Record<number, (ArtifactCard | null)[]> = {
          1: prev.forgeTier1, 2: prev.forgeTier2, 3: prev.forgeTier3,
        };
        const forgeRowsAfter: Record<number, (ArtifactCard | null)[]> = {
          1: newState.forgeTier1, 2: newState.forgeTier2, 3: newState.forgeTier3,
        };
        for (const tier of [1, 2, 3]) {
          const slotIndex = forgeRowsBefore[tier].findIndex((card) => card?.id === action?.cardId);
          if (slotIndex < 0) continue;
          const slotKey = `${tier}-${slotIndex}`;
          const replacementCard = forgeRowsAfter[tier][slotIndex];
          setBurstGhostCards(prevGhosts => { const next = { ...prevGhosts }; delete next[slotKey]; return next; });
          const completeIn = Math.max(0, (abridgedAnims ? 720 : 1250) - (Date.now() - optimisticForge.startedAt));
          setAnimEndTime(completeIn + MOLD_CAST_DURATION_MS + ANIM_LOCK_BUFFER_MS);
          const completionTimer = setTimeout(() => {
            if (cardActionBurstKeyRef.current !== optimisticForge.burstKey) return;
            setCardActionBurst(null);
            if (replacementCard && dealReplacementIntoSlot(replacementCard, tier, slotKey, 'forge')) {
              return;
            }
            setHiddenSlots(new Set());
          }, completeIn);
          cardAnimTimersRef.current.push(completionTimer);
          break;
        }
      }

      if (prev && isForgeAction && !isTideArchiveForgeAction && action.cardId && forgeActionKey !== lastForgeBurstActionRef.current) {
        lastForgeBurstActionRef.current = forgeActionKey;
        const cardId = action.cardId as string;
        const forgeRowsBefore: Record<number, (ArtifactCard | null)[]> = {
          1: prev.forgeTier1, 2: prev.forgeTier2, 3: prev.forgeTier3,
        };
        const forgeRowsAfter: Record<number, (ArtifactCard | null)[]> = {
          1: newState.forgeTier1, 2: newState.forgeTier2, 3: newState.forgeTier3,
        };
        for (const tierStr of ['1', '2', '3'] as const) {
          const tier = Number(tierStr);
          const oldCards = forgeRowsBefore[tier];
          const idx = oldCards.findIndex((c: ArtifactCard | null) => c?.id === cardId);
          if (idx >= 0) {
            const exitCard = oldCards[idx]!;
            const exitMarker =
              prev.artifactMarkers?.[cardId] ??
              state?.artifactMarkers?.[cardId];
            const ghostMarkerType = ghostArtifactMarkerTypesRef.current.get(cardId) ?? null;
            const exitIsForgottenForge =
              artifactMarkerHasBrand(exitMarker, 'forgotten') ||
              ghostMarkerType === 'forgotten';
            const exitNullifiedExempt = isNullifiedFirstForgeExempt(
              exitMarker,
              action.playerId as string | undefined,
              prev.nullifiedFirstForge,
            );
            const exitEminence = (
              artifactMarkerBlocksForgeEminence(exitMarker, exitNullifiedExempt) ||
              ghostMarkerType === 'forgotten' ||
              ghostMarkerType === 'condemned' ||
              (ghostMarkerType === 'nullified' && !exitNullifiedExempt)
            )
              ? 0
              : (exitCard.eminence ?? 0);
            const el = document.querySelector(`[data-card-id="${cardId}"]`);
            const rect = el?.getBoundingClientRect();
            const player = (newState.players as GamePlayerState[]).find(
              (p) => p.playerId === (action.playerId as string),
            );
            const gotSingularity = action.type === 'reserve_artifact' &&
              (newState.affinityWell.singularity ?? 0) < (prev.affinityWell.singularity ?? 0);

            // Common pre-cleanup: cancel any in-flight card animations before starting new ones.
            for (const t of cardAnimTimersRef.current) clearTimeout(t);
            cardAnimTimersRef.current = [];
            setHiddenSlots(new Set());
            setFlippingCards(new Set());
            const slotKey = `${tier}-${idx}`;

            if (action.type === 'forge_artifact' || action.type === 'foundry_forge_artifact') {
              const isLocalForge =
                (action.playerId as string | undefined) === session?.playerId;

              if (!isLocalForge) {
                // ── Opponent forge: card shrinks and flies into their chip ──────
                const actingPlayerId = action.playerId as string;
                const isLumiiForgeTarget = isLumiiScenario && isLumiiForecastPlayer(player);
                if (!isLumiiForgeTarget) {
                  traceOpponentActionOwner(
                    actingPlayerId,
                    exitCard.bonusAffinity
                      ? (AFFINITY_META[exitCard.bonusAffinity as AffinityKey]?.glowHex ?? '#d8ad57')
                      : '#d8ad57',
                  );
                }
                const chipCenter = resolveOpponentArtifactAbsorbCenter(
                  actingPlayerId,
                  isLumiiForgeTarget,
                );

                opponentForgeAbsorbKeyRef.current += 1;
                const absorbSeq = opponentForgeAbsorbKeyRef.current;
                const forgeActorName = player?.playerName;
                setAnimEndTime(abridgedAnims ? ABRIDGED_FORGE_LOCK_MS : FORGE_FULL_MS);
                setBurstGhostCards(prev => { const n = { ...prev }; delete n[slotKey]; return n; });
                setOpponentForgeAbsorb({
                  key: absorbSeq,
                  playerId: actingPlayerId,
                  targetKind: isLumiiForgeTarget ? 'lumii' : 'opponent',
                  card: exitCard,
                  tier,
                  startRect: rect
                    ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
                    : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
                  chipCenter,
                  ownerName: forgeActorName,
                  eminence: exitEminence,
                  eminenceTotal: player?.eminence,
                  // Use the card's bonus color as a single affinity stream hint.
                  spentColors: exitCard.bonusAffinity
                    ? [exitCard.bonusAffinity as AffinityKey]
                    : [],
                  isForgottenForge: exitIsForgottenForge,
                });
                if (isLumiiForgeTarget) {
                  scheduleLumiiHudAbsorbPulse(
                    abridgedAnims ? LUMII_HUD_ABSORB_ABRIDGED_MS : LUMII_HUD_ABSORB_FULL_MS,
                  );
                }
                setHiddenSlots(new Set([slotKey]));
                // Abridged: no internal audio in AbridgedForgeAnimation, so fire here.
                // Full-view: OpponentForgeAnimation calls playForgeAnimation() internally.
                if (abridgedAnims) gameAudio.playArtifactForged();
                const bonusAffinity = exitCard.bonusAffinity as AffinityKey;
                if (bonusAffinity && bonusAffinity !== 'singularity') {
                  const tBonus = setTimeout(() => gameAudio.playBonusSound(bonusAffinity), abridgedAnims ? 380 : 750);
                  cardAnimTimersRef.current.push(tBonus);
                }
                const newCard = forgeRowsAfter[tier][idx];
                const tOpponent = setTimeout(() => {
                  if (opponentForgeAbsorbKeyRef.current !== absorbSeq) return;
                  setOpponentForgeAbsorb(null);

                  if (newCard) {
                    if (!dealReplacementIntoSlot(newCard, tier, slotKey, 'forge')) {
                      // Opponent forge fallback: deck or slot element not in DOM
                      // (player on a different tab, compact layout not rendered, etc.).
                      // Do NOT extend the animation lock with FALLBACK_FLIP_ANIM_MS (5800 ms) —
                      // the initial forge lock set above is sufficient sequencing.
                      // Just reveal the replacement card immediately; no in-place flip needed
                      // for an opponent's action the local player isn't watching.
                      gameAudio.playCardDraw();
                      setHiddenSlots(new Set());
                    }
                  } else {
                    setHiddenSlots(new Set());
                  }
                }, abridgedAnims ? 720 : 1250);
                cardAnimTimersRef.current.push(tOpponent);
              } else {
                // ── Local player forge: full celebration burst ──────────────────
                cardActionBurstKeyRef.current += 1;
                setAnimEndTime(abridgedAnims ? ABRIDGED_FORGE_LOCK_MS : FORGE_FULL_MS);
                const forgeDestination = resolveLocalForgeDestination();
                // Compute which affinity colors were spent for the energy-stream animation.
                  const _spentCost = player
                    ? effectiveCost(exitCard, player) as Record<string, number>
                    : {};
                const _spentColors = (Object.entries(_spentCost)
                  .filter(([, v]) => v > 0)
                  .map(([c]) => c as AffinityKey));
                setBurstGhostCards(prev => { const n = { ...prev }; delete n[slotKey]; return n; });
                setCardActionBurst({
                  key: cardActionBurstKeyRef.current,
                  card: exitCard,
                  tier,
                  playerName: player?.playerName ?? 'Unknown',
                  avatarId: player?.avatarId ?? null,
                  eminence: exitEminence,
                  gotSingularity: false,
                  startRect: rect
                    ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
                    : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
                  destPos: forgeDestination?.pos,
                  destKind: forgeDestination?.kind,
                  destTargetSelector: forgeDestination?.targetSelector,
                  spentColors: _spentColors,
                  isForgottenForge: exitIsForgottenForge,
                });
                gameAudio.playArtifactForged();
                const bonusAffinity = exitCard.bonusAffinity as AffinityKey;
                if (bonusAffinity && bonusAffinity !== 'singularity') {
                  const tBonus = setTimeout(() => gameAudio.playBonusSound(bonusAffinity), abridgedAnims ? 380 : 1000);
                  cardAnimTimersRef.current.push(tBonus);
                }
                setHiddenSlots(new Set([slotKey]));
                const seq = cardActionBurstKeyRef.current;
                const newCard = forgeRowsAfter[tier][idx];
                const t1 = setTimeout(() => {
                  if (cardActionBurstKeyRef.current !== seq) return;
                  if (!abridgedAnims) flashForgeDestination(forgeDestination, exitCard);
                  setCardActionBurst(null);
                  if (newCard) {
                    if (!dealReplacementIntoSlot(newCard, tier, slotKey, 'forge')) {
                      // Fallback: flip in place if DOM elements not found.
                      // Keep the slot hidden until the flip completes — do NOT clear
                      // hiddenSlots immediately or the new card pops in before the flip.
                      setAnimEndTime(FALLBACK_FLIP_ANIM_MS);
                      setFlippingCards(new Set([newCard.id]));
                      gameAudio.playCardDraw();
                      if (effectiveForgeCompact) {
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
                }, abridgedAnims ? 720 : 1300); // abridged: direct shrink | full: 1150ms forge + 150ms buffer
                cardAnimTimersRef.current.push(t1);
                // Hand-panel absorption pulse — fires as the card reaches the tab.
                // Timed 300ms before the burst clears so the rings are visually
                // centred on the moment of arrival.
                // Absorption rings at the hand tab are handled by ForgeAnimation (Step 6).
              }
            } else {
              // reserve_artifact with cardId → Cipher Aperture animation; flies to Singularity panel
              cipherBurstKeyRef.current += 1;
              const isLocalReserve = (action.playerId as string | undefined) === session?.playerId;
              cipherBurstIsDeckRef.current = isLocalReserve;
              const reserveActorId = action.playerId as string;
              const destEl = isLocalReserve
                ? document.querySelector('[data-singularity-reserve-target]')
                : document.querySelector(`[data-opponent-chip="${reserveActorId}"]`);
              const destElRect = destEl?.getBoundingClientRect();
              const reserveOwnerName = isLocalReserve
                ? undefined
                : ((newState.players as GamePlayerState[]).find(p => p.playerId === reserveActorId))?.playerName;
              if (!isLocalReserve) {
                traceOpponentActionOwner(
                  reserveActorId,
                  exitCard.bonusAffinity
                    ? (AFFINITY_META[exitCard.bonusAffinity as AffinityKey]?.glowHex ?? '#b89cff')
                    : '#b89cff',
                );
              }
              setCipherBurst({
                key: cipherBurstKeyRef.current,
                sourceRect: rect
                  ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
                  : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
                affinityHex: exitCard.bonusAffinity
                  ? (AFFINITY_META[exitCard.bonusAffinity as AffinityKey]?.glowHex ?? '#7090FF')
                  : '#7090FF',
                cardName: exitCard.name,
                gotSingularity,
                card: exitCard,
                tier,
                destPos: destElRect
                  ? { x: destElRect.left + destElRect.width / 2, y: destElRect.top + destElRect.height / 2 }
                  : undefined,
                ownerName: reserveOwnerName,
              });
              setBurstGhostCards(prev => { const n = { ...prev }; delete n[slotKey]; return n; }); // cipher burst now owns the card
              if (gotSingularity) gameAudio.playSingularityToken();
              gameAudio.playCipherSeal();
              setAnimEndTime(abridgedAnims ? ABRIDGED_FORGE_LOCK_MS : CIPHER_GAME_TOTAL_MS + MOLD_CAST_DURATION_MS + ANIM_LOCK_BUFFER_MS); // full: cipher + cast-in-mold + buffer
              setHiddenSlots(new Set([slotKey]));
              // Deal replacement card from deck after the cipher aperture animation clears.
              const cipherSeq = cipherBurstKeyRef.current;
              const cipherNewCard = forgeRowsAfter[tier][idx];
	              const tCipherDeal = setTimeout(() => {
	                if (cipherBurstKeyRef.current !== cipherSeq) return;
	                if (cipherNewCard) {
	                  if (!dealReplacementIntoSlot(cipherNewCard, tier, slotKey, 'encrypt')) {
	                    setAnimEndTime(FALLBACK_FLIP_ANIM_MS);
	                    setFlippingCards(new Set([cipherNewCard.id]));
	                    gameAudio.playCardDraw();
                    if (effectiveForgeCompact) {
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
      // or Artifact not found in the previous Forge rows), any eagerly-set burst ghost will be
      // stranded forever. Clear it unconditionally — the bail-early guard makes it a no-op
      // when the ghost was already removed inside the animation block.
      if (isForgeAction && action.cardId) {
        const _cardId = action.cardId as string;
        setBurstGhostCards(prev => {
          if (!Object.values(prev).some((c: ArtifactCard) => c.id === _cardId)) return prev;
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            if ((next[key] as ArtifactCard)?.id === _cardId) delete next[key];
          }
          return next;
        });
        ghostArtifactMarkerTypesRef.current.delete(_cardId);
      }

      // Detect the opponent's compatibility forge_reserved_artifact action (forge from reserve)
      // and fly the Artifact to their chip.
      if (
        action?.type === 'forge_reserved_artifact' &&
        prev &&
        (action.playerId as string | undefined) !== session?.playerId
      ) {
        const actingPlayerId = action.playerId as string;
        const cardId = action.cardId as string | undefined;
        const prevActingPlayer = (prev.players as GamePlayerState[]).find(
          (p) => p.playerId === actingPlayerId,
        );
        const newActingPlayer = (newState.players as GamePlayerState[]).find(
          (p) => p.playerId === actingPlayerId,
        );
        const directlyMatchedArtifact = cardId
          ? prevActingPlayer?.reservedArtifacts?.find((c: ArtifactCard) => c.id === cardId)
          : undefined;
        const newReservedIds = new Set(
          newActingPlayer?.reservedArtifacts.map((card) => card.id) ?? [],
        );
        const departedReservedArtifact = prevActingPlayer?.reservedArtifacts.find(
          (card) => !newReservedIds.has(card.id),
        );
        const newlyPublicArtifact = cardId
          ? newActingPlayer?.forgedArtifacts.find((card) => card.id === cardId)
          : undefined;
        const reservedArtifact =
          newlyPublicArtifact ?? directlyMatchedArtifact ?? departedReservedArtifact;
        if (reservedArtifact) {
          const reservedMarker = cardId ? prev.artifactMarkers?.[cardId] : undefined;
          const reservedIsForgottenForge = artifactMarkerHasBrand(reservedMarker, 'forgotten');
          const reservedNullifiedExempt = isNullifiedFirstForgeExempt(
            reservedMarker,
            actingPlayerId,
            prev.nullifiedFirstForge,
          );
          const reservedEminence = artifactMarkerBlocksForgeEminence(
            reservedMarker,
            reservedNullifiedExempt,
          )
            ? 0
            : (reservedArtifact.eminence ?? 0);
          const isLumiiForgeTarget = isLumiiScenario && isLumiiForecastPlayer(newActingPlayer);
          const chipCenter = resolveOpponentArtifactAbsorbCenter(
            actingPlayerId,
            isLumiiForgeTarget,
          );
          const previousCardDomId = directlyMatchedArtifact?.id ?? departedReservedArtifact?.id;
          const cardEl = previousCardDomId
            ? document.querySelector(`[data-reserved-card-id="${previousCardDomId}"]`)
            : null;
          const cardRect = cardEl?.getBoundingClientRect();
          opponentForgeAbsorbKeyRef.current += 1;
          const absorbSeq = opponentForgeAbsorbKeyRef.current;
          const reservedForgeActorName = prevActingPlayer?.playerName;
          for (const t of cardAnimTimersRef.current) clearTimeout(t);
          cardAnimTimersRef.current = [];
          setAnimEndTime(abridgedAnims ? ABRIDGED_ACTION_MS : RESERVED_FORGE_FULL_MS);
          setOpponentForgeAbsorb({
            key: absorbSeq,
            playerId: actingPlayerId,
            targetKind: isLumiiForgeTarget ? 'lumii' : 'opponent',
            card: reservedArtifact,
            tier: reservedArtifact.tier,
            startRect: cardRect
              ? { x: cardRect.left, y: cardRect.top, w: cardRect.width, h: cardRect.height }
              : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
            chipCenter,
            ownerName: reservedForgeActorName,
            eminence: reservedEminence,
            eminenceTotal: newActingPlayer?.eminence,
            isForgottenForge: reservedIsForgottenForge,
          });
          if (isLumiiForgeTarget) {
            scheduleLumiiHudAbsorbPulse(
              abridgedAnims ? LUMII_HUD_ABSORB_ABRIDGED_MS : LUMII_HUD_ABSORB_FULL_MS,
            );
          }
          gameAudio.playArtifactForged();
          const tAbsorb = setTimeout(() => {
            if (opponentForgeAbsorbKeyRef.current !== absorbSeq) return;
            setOpponentForgeAbsorb(null);
          }, abridgedAnims ? 720 : 1250);
          cardAnimTimersRef.current.push(tAbsorb);
        }
      }

      // Opponent Eminence can rise from more than a visible card-forge animation
      // path. Detect quiet Eminence increases here and give them a noticeable chip
      // tremor, while leaving forge and Luminary arrival cutscenes in charge of
      // their own timing so the same gain is not announced twice.
      if (prev && session?.playerId) {
        const actionPlayerId = action?.playerId as string | undefined;
        const actionType = action?.type as string | undefined;
        const opponentForgeOwnsImpact =
          actionPlayerId &&
          actionPlayerId !== session.playerId &&
          (actionType === 'forge_artifact' || actionType === 'foundry_forge_artifact' || actionType === 'forge_reserved_artifact');
        const prevPending = prev.pendingSummonEvents ?? [];
        const newPending = newState.pendingSummonEvents ?? [];
        const newlyArrivedClaimers = new Set(
          newPending
            .filter((evt) => !prevPending.some((oldEvt) => oldEvt.eventId === evt.eventId))
            .map((evt) => evt.claimedByPlayerId),
        );
        const victoryTarget = Math.max(15, Number(newState.victoryRequirement ?? 15));

        for (const nextPlayer of newState.players as GamePlayerState[]) {
          if (nextPlayer.playerId === session.playerId) continue;
          const oldPlayer = (prev.players as GamePlayerState[]).find(
            (candidate) => candidate.playerId === nextPlayer.playerId,
          );
          if (!oldPlayer) continue;
          const eminenceDelta = (nextPlayer.eminence ?? 0) - (oldPlayer.eminence ?? 0);
          if (eminenceDelta <= 0) continue;
          if (opponentForgeOwnsImpact && actionPlayerId === nextPlayer.playerId) continue;
          if (newlyArrivedClaimers.has(nextPlayer.playerId)) continue;
          scheduleOpponentEminenceImpact(
            nextPlayer.playerId,
            eminenceDelta,
            nextPlayer.eminence ?? 0,
            victoryTarget,
          );
        }
      }

      // Detect planned action cancellation for the local player and show a toast.
      const myNewPlayer = (newState.players as GamePlayerState[]).find(p => p.playerId === session?.playerId);
      const myOldPlayer = prev ? (prev.players as GamePlayerState[]).find(p => p.playerId === session?.playerId) : null;
      const newCancelReason = myNewPlayer?.plannedActionCancelReason;
      const oldCancelReason = myOldPlayer?.plannedActionCancelReason;
      if (!newCancelReason && oldCancelReason) {
        lastPlannedCancelNoticeRef.current = null;
      }
      if (newCancelReason && newCancelReason !== oldCancelReason) {
        showPlannedCancelNotice(session?.playerId, newCancelReason, newState.version);
      }

      queryClient.setQueryData(getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }), newState);
      prevStateRef.current = newState;

      // Track the event ID and raw summonColor (API contract) of the win-sealing Luminary so the
      // enqueue loop below can color that specific cutscene's particles to match.
      let sealingEventId = '';
      let sealingLumArrivalColor = '';

      if (newState.status === 'finished' && (prev?.status ?? state?.status) !== 'finished') {
        // Count arrival events that will actually be dispatched to enqueueArrival
        // in the loop below (not yet in handledArrivalEventIdsRef means not deduped).
        const incomingPending = newState.pendingSummonEvents ?? [];
        const toEnqueue = incomingPending.filter(
          evt => !handledArrivalEventIdsRef.current.has(arrivalDedupKey(evt.eventId))
        ).length;
        const hasPendingArrivals = toEnqueue > 0 || arrivalQueueLenRef.current > 0 || enqueuingCountRef.current > 0;
        if (hasPendingArrivals) {
          // Register in-flight dispatches BEFORE the enqueue loop below runs,
          // so the flush effect cannot fire before the RAFs land in arrivalQueue.
          enqueuingCountRef.current += toEnqueue;
          // Capture the sealing Luminary's arrivalColor for the fanfare.
          // We grab the last *new* event's Luminary (same filter used for toEnqueue).
          const allPendingEvts = newState.pendingSummonEvents ?? [];
          const newPendingEvts = allPendingEvts.filter(
            e => !handledArrivalEventIdsRef.current.has(arrivalDedupKey(e.eventId))
          );
          if (newPendingEvts.length > 0) {
            const lastEvt = newPendingEvts[newPendingEvts.length - 1];
            const sealingLum = newState.luminaries.find(l => l.id === lastEvt.luminaryId);
            const lumArrivalColor: string = sealingLum?.summonColor ?? '';

            // Store the raw arrivalColor for the cutscene visual burst override.
            // This is the Luminary's canonical color and is what the task requires.
            sealingEventId = lastEvt.eventId;
            sealingLumArrivalColor = lumArrivalColor;

            // Always use the sealing Luminary's arrivalColor for Luminary-triggered wins.
            // Card bonusAffinity is intentionally not used here so both the live flush path
            // and the on-load fanfare path agree on color priority.
            pendingGameOverLumColorRef.current = lumArrivalColor;
          }
          // Defer: the flush useEffect below will fire win audio and clear the
          // hold once enqueuingCount reaches zero AND the queue drains.
          setPendingGameOver(true);
          // Capture the animation barrier before we clear the queue — the flush
          // effect will use animBarrierMsRef to defer cancelPendingAnimations()
          // so any in-flight Artifact/Affinity animations can complete. The arrival
          // cutscene (~12 s) always outlasts the barrier cap (≤ 3 s), so this
          // is a minor polish pass that keeps the logic symmetric with the
          // non-arrival path. enqueuingCountRef is reset to 0 so that RAF-chain
          // items that have not yet landed in arrivalQueue are silently dropped
          // by doEnqueueArrival (which checks gameFinishedRef before pushing).
          // The slice(0,1) keeps only the currently-active cutscene; all
          // queued-but-not-started arrivals are discarded.
          gameFinishedRef.current = true;
          enqueuingCountRef.current = 0;
          // Cancel the turn announcement immediately — it would be confusing to
          // show "Your Turn" while the arrival cutscene is playing.
          cancelTurnAnnouncement();
          const arrivalPathBarrierMs = Math.min(3000, Math.max(0, animationEndTimeRef.current - Date.now()));
          // Store as an absolute deadline so the flush effect can compute remaining time
          // even if it fires slightly later than expected.
          animBarrierMsRef.current = arrivalPathBarrierMs > 0 ? Date.now() + arrivalPathBarrierMs : 0;
          // Clear the state queue immediately so no further game states are
          // processed, but defer full cancelPendingAnimations() to the flush
          // effect so Artifact/Affinity animations running underneath the cutscene finish.
          clearQueuedStateUpdates();
          setArrivalQueue(q => q.slice(0, 1));
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
          let dominantColor = '#fbbf24'; // singularity fallback

          // Prefer the bonusAffinity of the card that pushed the winner over 15 Eminence.
          // The game transitions to 'finished' via advanceTurn at end-of-last-round, so
          // lastAction may belong to any player's final turn action — not necessarily the
          // winner's Forge action. Use the winner's last forged Artifact; Artifacts are
          // appended in chronological order, so the last entry is their most recent forge
          // and the best proxy for the threshold-crossing card.
          const winnerCards = winnerPlayer?.forgedArtifacts as ArtifactCard[] | undefined;
          const lastWinnerCard = winnerCards && winnerCards.length > 0
            ? winnerCards[winnerCards.length - 1]
            : null;
          const triggeringBonusKey = lastWinnerCard?.bonusAffinity;

          if (triggeringBonusKey && AFFINITY_KEY_TO_HEX[triggeringBonusKey]) {
            // Use the winning card's affinity — it's the "color of the moment".
            dominantColor = AFFINITY_KEY_TO_HEX[triggeringBonusKey];
          } else if (winnerPlayer) {
            // Fall back to the winner's dominant bonus affinity count.
            const bonuses = winnerPlayer.bonuses;
            const affinityEntries: Array<[string, number]> = [
              ['flare',     bonuses.flare],
              ['continuum', bonuses.continuum],
              ['verdance',  bonuses.verdance],
              ['abyss',     bonuses.abyss],
              ['radiance',    bonuses.radiance],
              ['singularity',     bonuses.singularity],
            ];
            let maxBonus = 0;
            let dominantKey = 'singularity';
            for (const [key, val] of affinityEntries) {
              if (val > maxBonus) { maxBonus = val; dominantKey = key; }
            }
            dominantColor = AFFINITY_KEY_TO_HEX[dominantKey] ?? '#fbbf24';
          }

          if (elseBarrierMs === 0) {
            // No in-flight animations — fire immediately (identical to previous behavior).
            cancelPendingAnimations();
            if (newState.scenarioId !== LUMII_CLEARANCE_SCENARIO_ID) {
              gameAudio.playLuminaryFanfare(dominantColor);
              setTimeout(() => gameAudio.playWin(), 1400);
            }
          } else {
            // In-flight animations are still running. Hold back the victory cinematic
            // (via pendingGameOver) and the state queue (immediately) until the barrier
            // elapses, then cancel animations and release the overlay.
            // Clear the state queue immediately so no further game states are processed.
            clearQueuedStateUpdates();
            // Prevent the flush useEffect from firing this non-arrival hold — we will
            // release pendingGameOver ourselves inside the barrier timeout below.
            fanfareFiredForGameOverRef.current = true;
            setPendingGameOver(true);
            winBarrierTimerRef.current = setTimeout(() => {
              winBarrierTimerRef.current = null;
              cancelPendingAnimations();
              fanfareFiredForGameOverRef.current = false;
              setPendingGameOver(false);
              if (newState.scenarioId !== LUMII_CLEARANCE_SCENARIO_ID) {
                gameAudio.playLuminaryFanfare(dominantColor);
                setTimeout(() => gameAudio.playWin(), 1400);
              }
            }, elseBarrierMs);
          }
        }
      }

      // AUDIT: arrival-cutscene branch — plan-registration state updates leave
      // pendingSummonEvents unchanged, so every event in newPending will be found in
      // prevPending (alreadyKnown = true) and the enqueueSummon call is skipped.  The
      // secondary guard inside enqueueSummon (handledArrivalEventIdsRef) provides an
      // additional layer.  No separate action-key dedup ref is needed here.
      // Detect newly arrived pendingSummonEvents and start cutscenes for ALL players.
      // The dedup guard in enqueueSummon prevents re-enqueueing the same event.
      {
        const prevPending = prev?.pendingSummonEvents ?? [];
        const newPending = newState?.pendingSummonEvents ?? [];

        for (const evt of newPending) {
          // Only enqueue cutscenes for events that weren't in the previous state.
          // Dedup against replaying the same eventId is handled inside enqueueSummon
          // via handledArrivalEventIdsRef — that is the correct dedup boundary.
          // NOTE: do NOT gate on claimedLuminaryIds here. The engine pushes the
          // luminary into both player.luminaries AND pendingSummonEvents in the same
          // atomic state update, so isAlreadyClaimed would always be true for a live
          // arrival and would suppress every cutscene.
          const alreadyKnown = prevPending.some(e => e.eventId === evt.eventId);
          if (alreadyKnown) {
            logArrivalDebug('state-diff.known-pending-event', {
              eventId: evt.eventId,
              luminaryId: evt.luminaryId,
            });
          } else {
            logArrivalDebug('state-diff.new-pending-event', {
              eventId: evt.eventId,
              luminaryId: evt.luminaryId,
              alreadyHandled: handledArrivalEventIdsRef.current.has(arrivalDedupKey(evt.eventId)),
            });
            lockSummonActivation(evt.luminaryId, evt.eventId);
            // Synchronously mark this luminary as suppressed BEFORE any RAF fires.
            // This ensures the portal doesn't flash during the frames between the
            // queryClient.setQueryData re-render and the setArrivalQueue call.
            if (!handledArrivalEventIdsRef.current.has(arrivalDedupKey(evt.eventId))) {
              pendingSuppressArrivalIdsRef.current.add(evt.luminaryId);
              logArrivalDebug('state-diff.pending-suppressed', {
                eventId: evt.eventId,
                luminaryId: evt.luminaryId,
              });
            }
            const lum = newState.luminaries.find(l => l.id === evt.luminaryId);
            if (lum) {
              logArrivalDebug('state-diff.enqueue', {
                eventId: evt.eventId,
                luminaryId: evt.luminaryId,
                luminaryName: lum.name,
              });
              // Pass winSealingColor for the event that sealed the win so its
              // cutscene burst visuals match the Luminary's summonColor (API contract).
              const wsc = (sealingEventId && evt.eventId === sealingEventId)
                ? sealingLumArrivalColor : undefined;
              const claimedByPlayer = (newState.players ?? []).find(
                (p: { claimedLuminaryIds?: string[] }) =>
                  (p.claimedLuminaryIds ?? []).includes(evt.luminaryId)
              ) as { playerId?: string; playerName?: string } | undefined;
              enqueueSummon(
                evt.luminaryId,
                lum.name,
                lum.domain,
                balanceLabLuminaryEminence ?? lum.eminence ?? 0,
                lum.flavor,
                evt.eventId,
                false,
                wsc,
                claimedByPlayer?.playerName,
                evt.claimedByPlayerId ?? claimedByPlayer?.playerId,
              );
            } else {
              logArrivalDebug('state-diff.missing-luminary', {
                eventId: evt.eventId,
                luminaryId: evt.luminaryId,
              });
            }
          }
        }
      }

      // ── Pre-populate director burn slots (MUST run before setActivationQueue) ──────────
      // CinderMandateBurnDirector snapshots pendingDirectorBurnSlotsRef.current when it
      // mounts.  setActivationQueue (below) and queryClient.setQueryData both queue React
      // state updates in the same synchronous call, so React commits them together — the
      // director mounts in THAT commit, before the useEffect at ~line 1421 has fired.
      // Populating the ref here (while the DOM still shows the pre-burn state, condemned
      // cards still visible in their slots) guarantees the director receives correct rects.
      // The useEffect will run afterwards and may overwrite the ref, but by then the
      // director has already captured its snapshot via slotsRef.current = pendingBurnSlots.
      {
        const prevBurnEventIds2 = new Set(
          ((prev?.burnEvents ?? []) as BurnEvent[]).map(event => event.eventId),
        );
        const newBurnEvents2 = ((newState.burnEvents ?? []) as BurnEvent[]).filter(
          event => !prevBurnEventIds2.has(event.eventId),
        );
        if (newBurnEvents2.length > 0) {
          const prevTierCards2: { tier: 1 | 2 | 3; cards: (ArtifactCard | null)[] }[] = [
            { tier: 1, cards: (prev?.forgeTier1 ?? []) as (ArtifactCard | null)[] },
            { tier: 2, cards: (prev?.forgeTier2 ?? []) as (ArtifactCard | null)[] },
            { tier: 3, cards: (prev?.forgeTier3 ?? []) as (ArtifactCard | null)[] },
          ];
          const emberSlots2: DirectorBurnSlot[] = [];
          for (const burnEvent of newBurnEvents2) {
            if (
              burnEvent.sourceLuminaryId !== 'lum_ember' ||
              (burnEvent.destination ?? 'burn_pile') !== 'burn_pile'
            ) {
              continue;
            }
            const burnedId = burnEvent.cardId;
            let found2 = false;
            for (const { tier, cards } of prevTierCards2) {
              if (found2) break;
              for (let i = 0; i < cards.length; i++) {
                if (cards[i]?.id === burnedId) {
                  const slotKey2 = `${tier}-${i}`;
                  const slotEl2 = document.querySelector(`[data-slot-key="${slotKey2}"]`);
                  if (slotEl2) {
                    emberSlots2.push({ slotRect: slotEl2.getBoundingClientRect(), slotKey: slotKey2, sourceLuminaryId: 'lum_ember', condemnedCard: cards[i] ?? null });
                  }
                  found2 = true;
                  break;
                }
              }
            }
          }
          if (emberSlots2.length > 0) {
            pendingDirectorBurnSlotsRef.current = emberSlots2;
          }
        }
      }

      // Phoenix Paradox can repopulate previously empty Forge molds after its
      // tracked Burned Artifacts return. Keep those authoritative replacements
      // hidden until Eternal Recurrence reaches its reveal phase.
      {
        const previousActivationIds = new Set(
          (prev?.pendingLuminaryActivationEvents ?? []).map(event => event.eventId),
        );
        const recurrenceEvent = (newState.pendingLuminaryActivationEvents ?? []).find(
          event => (
            event.luminaryId === 'lum_astral' &&
            event.effectType === 'start_of_turn' &&
            !previousActivationIds.has(event.eventId)
          ),
        );
        if (recurrenceEvent) {
          const previousRows: Record<1 | 2 | 3, (ArtifactCard | null)[]> = {
            1: (prev?.forgeTier1 ?? []) as (ArtifactCard | null)[],
            2: (prev?.forgeTier2 ?? []) as (ArtifactCard | null)[],
            3: (prev?.forgeTier3 ?? []) as (ArtifactCard | null)[],
          };
          const nextRows: Record<1 | 2 | 3, (ArtifactCard | null)[]> = {
            1: newState.forgeTier1 as (ArtifactCard | null)[],
            2: newState.forgeTier2 as (ArtifactCard | null)[],
            3: newState.forgeTier3 as (ArtifactCard | null)[],
          };
          const refillKeys = [...(recurrenceEvent.targetSlotIds ?? [])];
          for (const tier of [3, 2, 1] as const) {
            for (let slotIndex = 0; slotIndex < nextRows[tier].length; slotIndex++) {
              const slotKey = `${tier}-${slotIndex}`;
              if (
                !refillKeys.includes(slotKey) &&
                !previousRows[tier][slotIndex] &&
                nextRows[tier][slotIndex]
              ) {
                refillKeys.push(slotKey);
              }
            }
          }
          pendingPhoenixRefillSlotsRef.current = refillKeys;
          if (refillKeys.length > 0) {
            setHiddenSlots(current => new Set([...current, ...refillKeys]));
          }
        }
      }

      // Antimatter owns the Artifact's departure, but its authoritative state
      // already contains the replacement. Hold that mold empty until the
      // detonation presentation completes, then let the Archive cast the new
      // Artifact through the same universal refill language as every other path.
      {
        const previousDetonationIds = new Set(
          (prev?.pendingBlueprintDetonationEvents ?? []).map(event => event.eventId),
        );
        const detonationEvent = (newState.pendingBlueprintDetonationEvents ?? []).find(
          event => (
            event.blueprintId === 'bp_antimatter_detonator' &&
            !event.interceptedByBlueprintId &&
            !previousDetonationIds.has(event.eventId)
          ),
        );
        const slotKey = detonationEvent?.targetSlotId;
        if (detonationEvent && slotKey) {
          const [tierText, slotText] = slotKey.split('-');
          const tier = Number(tierText);
          const slotIndex = Number(slotText);
          const row = tier === 1
            ? newState.forgeTier1
            : tier === 2
              ? newState.forgeTier2
              : tier === 3
                ? newState.forgeTier3
                : null;
          const replacement = row?.[slotIndex];
          if (replacement) {
            pendingBlueprintMoldCastsRef.current.set(detonationEvent.eventId, {
              card: replacement,
              tier,
              slotKey,
            });
            setHiddenSlots(current => new Set([...current, slotKey]));
          }
        }
      }

      // Preserve the pre-reset Forge for Iron Harbinger. The server has already
      // returned, randomized, and redealt every row in newState, but the player
      // must continue seeing the original twelve Artifacts until the dedicated
      // director lifts them from their molds.
      {
        const previousActivationIds = new Set(
          (prev?.pendingLuminaryActivationEvents ?? []).map(event => event.eventId),
        );
        const ironEvent = (newState.pendingLuminaryActivationEvents ?? []).find(
          event => (
            event.luminaryId === 'lum_forge' &&
            event.effectType === 'summon' &&
            !previousActivationIds.has(event.eventId)
          ),
        );
        if (ironEvent) {
          const targetIds = ironEvent.targetCardIds ?? [];
          const targetSet = new Set(targetIds);
          const previousRows: Array<{
            tier: 1 | 2 | 3;
            cards: (ArtifactCard | null)[];
          }> = [
            { tier: 3, cards: (prev?.forgeTier3 ?? []) as (ArtifactCard | null)[] },
            { tier: 2, cards: (prev?.forgeTier2 ?? []) as (ArtifactCard | null)[] },
            { tier: 1, cards: (prev?.forgeTier1 ?? []) as (ArtifactCard | null)[] },
          ];
          const capturedById = new Map<string, ArtifactCard>();
          previousRows.forEach(({ cards }) => {
            cards.forEach((card) => {
              if (card && targetSet.has(card.id)) capturedById.set(card.id, card);
            });
          });
          const nextIndex: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
          const capturedSlots = targetIds.map((cardId): IronHarbingerResetSlot => {
            const tier: 1 | 2 | 3 = cardId.startsWith('t3')
              ? 3
              : cardId.startsWith('t2')
                ? 2
                : 1;
            const slotIndex = nextIndex[tier]++;
            return {
              cardId,
              card: capturedById.get(cardId) ?? null,
              tier,
              slotIndex,
              slotKey: `${tier}-${slotIndex}`,
            };
          });
          const ghostIds = Object.fromEntries(
            capturedSlots.map(slot => [slot.slotKey, slot.cardId]),
          );
          const ghostEntries = capturedSlots.filter(
            (slot): slot is IronHarbingerResetSlot & { card: ArtifactCard } =>
              slot.card != null,
          );

          pendingIronHarbingerSlotsRef.current = capturedSlots;
          ironHarbingerGhostSlotKeysRef.current = capturedSlots.map(slot => slot.slotKey);
          setIronHarbingerGhostIds(ghostIds);
          if (ghostEntries.length > 0) {
            setBurstGhostCards(current => {
              const next = { ...current };
              ghostEntries.forEach((slot) => {
                next[slot.slotKey] = slot.card;
              });
              return next;
            });
          }
        }
      }

      // Preserve the selected Artifact across the authoritative Assimilation
      // update. The server has already refilled its Forge slot, but the old
      // Artifact must remain visible until FinalHungerAssimilationDirector
      // dissolves it and hands the empty mold to the replacement deal.
      {
        const previousActivationIds = new Set(
          (prev?.pendingLuminaryActivationEvents ?? []).map(event => event.eventId),
        );
        const assimilationEvent = (newState.pendingLuminaryActivationEvents ?? []).find(
          event => (
            event.luminaryId === 'lum_hunger' &&
            event.effectType === 'action' &&
            !previousActivationIds.has(event.eventId)
          ),
        );
        const assimilatedId = assimilationEvent?.targetCardIds?.[0];
        if (assimilationEvent && assimilatedId) {
          const previousRows: Array<{ tier: 1 | 2 | 3; cards: (ArtifactCard | null)[] }> = [
            { tier: 3, cards: (prev?.forgeTier3 ?? []) as (ArtifactCard | null)[] },
            { tier: 2, cards: (prev?.forgeTier2 ?? []) as (ArtifactCard | null)[] },
            { tier: 1, cards: (prev?.forgeTier1 ?? []) as (ArtifactCard | null)[] },
          ];
          for (const { tier, cards } of previousRows) {
            const slotIndex = cards.findIndex(card => card?.id === assimilatedId);
            if (slotIndex < 0) continue;
            const card = cards[slotIndex] ?? null;
            const slotKey = `${tier}-${slotIndex}`;
            const cardElement = document.querySelector<HTMLElement>(`[data-card-id="${assimilatedId}"]`);
            const rect = cardElement?.getBoundingClientRect();
            const isLocalOwner = assimilationEvent.triggeringPlayerId === session?.playerId;
            pendingAssimilationSlotRef.current = {
              cardId: assimilatedId,
              card,
              tier,
              slotKey,
              fallbackRect: rect ? {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              } : undefined,
              destinationSelector: isLocalOwner
                ? '[data-civilization-drop-target], [data-nav-hand]'
                : `[data-opponent-chip="${assimilationEvent.triggeringPlayerId}"]`,
            };
            if (card) {
              setBurstGhostCards(current => ({ ...current, [slotKey]: card }));
            }
            break;
          }
        }
      }

      // Detect newly arrived pendingLuminaryActivationEvents and enqueue effect cinematics.
      // These are authoritative resolution events: the server will not advance
      // the turn until each event's complete presentation is acknowledged.
      // If an arrival cutscene is in progress (or about to start), the activation
      // event is deferred and flushed only after the summoning is fully dismissed.
      {
        const pendingArrivalLuminaryIds = new Set<string>((newState?.pendingSummonEvents ?? []).map(evt => String(evt.luminaryId)));
        const prevPending = prev?.pendingLuminaryActivationEvents ?? [];
        const newPending = newState?.pendingLuminaryActivationEvents ?? [];
        const gateSnapshot: LuminarySequenceGateSnapshot = {
          arrivalQueueLength: arrivalQueueLenRef.current,
          enqueuingCount: enqueuingCountRef.current,
          pendingSuppressCount: pendingSuppressArrivalIdsRef.current.size,
          visualHoldCount: arrivalVisualHoldIdsRef.current.size,
          returningCount: returningLuminaryIdsRef.current.size,
          pendingArrivalLuminaryIds,
          summonActivationLockedLuminaryIds: summonActivationLocksRef.current,
        };
        for (const evt of newPending) {
          // NOTE: effectType === 'summon' events are NOT skipped here. The arrival
          // cutscene (LuminaryArrivalCutscene, ~12s) shows the Luminary's intro.
          // The activation cinematic (LuminaryActivationCinematic, ~4s) is a separate
          // procedural effect showing the Luminary's board impact (e.g. Cinder Mandate
          // marking cards condemned). Both must play — one after the other.
          // If this summon activation belongs to a Luminary that is still listed in
          // pendingSummonEvents, defer it even if React has not mounted the arrival
          // queue yet. This closes the frame where effect overlays could start before
          // the summoning animation.
          const alreadyKnown = prevPending.some(e => e.eventId === evt.eventId);
          if (!alreadyKnown && !handledActivationEventIdsRef.current.has(evt.eventId)) {
            handledActivationEventIdsRef.current.add(evt.eventId);
            const gateDecision = getLuminaryActivationGateDecision(evt, gateSnapshot);
            if (!gateDecision.allowed) {
              logArrivalDebug('activation.deferred', {
                eventId: evt.eventId,
                luminaryId: evt.luminaryId,
                effectType: evt.effectType,
                reason: gateDecision.reason,
              });
              deferredActivationEventsRef.current.push(evt);
            } else {
              logArrivalDebug('activation.queued', {
                eventId: evt.eventId,
                luminaryId: evt.luminaryId,
                effectType: evt.effectType,
              });
              setActivationQueue(q => [...q, evt]);
            }
          }
        }
      }

      // AUDIT: Harness branch; the dedup guard uses JSON.stringify(action) + turnCount.
      // so that:
      //   • plan-registration re-fires (version bumps, same action, same turnCount) are blocked
      //   • identical consecutive Harness actions on different turns each fire their burst
      //     (turnCount increments on advanceTurn so the key differs even when the action JSON is identical)
      if (action && (action.type === 'harness_three_affinities' || action.type === 'harness_two_affinities')) {
        const takeKey = `${(newState as { turnCount?: number }).turnCount ?? 0}:${JSON.stringify(action)}`;
        if (takeKey !== lastTakeBurstActionRef.current) {
          lastTakeBurstActionRef.current = takeKey;
          const actorId = action.playerId as string | undefined;
          if (actorId && actorId !== session?.playerId) {
            // Opponent Harness: always animate.
            const player = (newState.players as GamePlayerState[]).find((p) => p.playerId === actorId);
            if (player) {
              let affinities: Partial<AffinityCounts> = {};
              if (action.type === 'harness_three_affinities') {
                affinities = (action.affinities as Partial<AffinityCounts>) ?? {};
              } else {
                const color = action.affinity as string;
                if (color) affinities = { [color]: 2 };
              }
              const isLumiiHarnessTarget = isLumiiScenario && isLumiiForecastPlayer(player);
              playAffinityBurst(
                affinities,
                actorId,
                player.playerName,
                player.avatarId ?? null,
                isLumiiHarnessTarget ? 'lumii' : 'opponent',
              );
            }
          } else if (actorId && actorId === session?.playerId) {
            // Local Harness: fire the token flip only if its optimistic burst did
            // not already run. Planned actions skip the direct interaction path.
            if (!optimisticHarnessFiredRef.current) {
              let affinities: Partial<AffinityCounts> = {};
              if (action.type === 'harness_three_affinities') {
                affinities = (action.affinities as Partial<AffinityCounts>) ?? {};
              } else {
                const color = action.affinity as string;
                if (color) affinities = { [color]: 2 };
              }
              setHarnessBurstKeys((prev) => {
                const next = { ...prev };
                for (const key of Object.keys(affinities) as AffinityKey[]) {
                  if ((affinities[key as keyof AffinityCounts] ?? 0) > 0) {
                    next[key] = (next[key] ?? 0) + 1;
                  }
                }
                return next;
              });
            }
            // Reset for the next Harness action.
            optimisticHarnessFiredRef.current = false;
          }
        }
      }

      const lastActionKey = action ? JSON.stringify(action) : null;
      if (lastActionKey && lastActionKey !== reserveBurstActionRef.current) {
        reserveBurstActionRef.current = lastActionKey;
        if (action?.type === 'reserve_artifact' && !action.cardId) {
          const playerId = action.playerId as string | undefined;
          const player = (newState.players as GamePlayerState[]).find((p) => p.playerId === playerId);
          if (player) {
            const gotSingularity = (newState.affinityWell.singularity ?? 0) < ((prev ?? state)?.affinityWell.singularity ?? 0);
            const tier = Number(action.tier ?? 1) as 1 | 2 | 3;
            // Diff prev → new to find the newly drawn card
            const prevPlayer = ((prev ?? state)?.players as GamePlayerState[] | undefined)?.find(p => p.playerId === playerId);
            const prevReservedIds = new Set(prevPlayer?.reservedArtifacts.map(c => c.id) ?? []);
            const newCard = player.reservedArtifacts.find(c => !prevReservedIds.has(c.id));
            const deckEl = document.querySelector(`[data-deck-tier="${tier}"]`);
            const deckRect = deckEl?.getBoundingClientRect();
            const isLocalReserve = playerId === session?.playerId;
            const reserveActorId = playerId ?? player.playerId;
            // Local player: fly to Singularity panel; opponent: fly to their player chip.
            const destEl = isLocalReserve
              ? document.querySelector('[data-singularity-reserve-target]')
              : document.querySelector(`[data-opponent-chip="${reserveActorId}"]`);
            const destRect = destEl?.getBoundingClientRect();
            if (!isLocalReserve) {
              traceOpponentActionOwner(reserveActorId, '#aebbd4');
            }
            cipherBurstKeyRef.current += 1;
            cipherBurstIsDeckRef.current = isLocalReserve;
            setAnimEndTime(abridgedAnims ? ABRIDGED_ACTION_MS : CIPHER_GAME_TOTAL_MS + CIPHER_TAIL_BUFFER_MS);
            setCipherBurst({
              key: cipherBurstKeyRef.current,
              sourceRect: deckRect
                ? { x: deckRect.left, y: deckRect.top, w: deckRect.width, h: deckRect.height }
                : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
              affinityHex: '#aebbd4',
              cardName: '',
              gotSingularity,
              // eslint-disable-next-line no-restricted-syntax -- ArtifactCard has many optional fields; this sentinel fallback intentionally omits them so the animation overlay can render without a real card object. Not an API type cast.
              card: newCard ?? ({ id: '', name: '', tier, cost: {}, eminence: 0, bonusAffinity: null } as unknown as ArtifactCard),
              tier,
              destPos: destRect
                ? { x: destRect.left + destRect.width / 2, y: destRect.top + destRect.height / 2 }
                : undefined,
              ownerName: isLocalReserve ? undefined : player.playerName,
              concealed: true,
            });
            if (gotSingularity) gameAudio.playSingularityToken();
            gameAudio.playCipherSeal();
          }
        }
      }

      // AUDIT: turn-announcement branch — plan-registration state updates do not change
      // currentPlayerIndex, so the semantic guard below (playerIndex !== prev playerIndex)
      // correctly blocks re-fires without needing an additional action-key dedup ref.
      // fireTurnAnnouncement also has its own lastAnnouncedTurnRef guard as a second layer.
      // Skip re-announcing if this update is a planned_action_cancelled — the preceding
      // resolve_summon (arrival gate) update already triggered the correct announcement and firing again
      // would produce a duplicate or out-of-order "your turn" banner.
      if (newState.status === 'playing' && newState.lastAction && newState.lastAction.type !== 'planned_action_cancelled' && newState.currentPlayerIndex !== (prev?.currentPlayerIndex ?? state?.currentPlayerIndex)) {
        const nextPlayer = newState.players[newState.currentPlayerIndex];
        if (nextPlayer && !isTutorial) {
          const isMe = nextPlayer.playerId === session?.playerId;
          if (!isMe) return;
          const key = `ws-${newState.currentPlayerIndex}-${newState.version}`;
          const turnIdentity = getTurnPresentationKey(nextPlayer.playerId, newState.turnCount);
          const firstLumId = nextPlayer.claimedLuminaryIds?.[0];
          const lum = firstLumId ? newState.luminaries.find(l => l.id === firstLumId) : undefined;
          const accentColor = lum?.summonColor ?? '#6366f1';
          scheduleTurnAnnouncement(
            key,
            turnIdentity,
            nextPlayer.playerName,
            nextPlayer.avatarId ?? null,
            isMe,
            accentColor,
            nextPlayer.eminence,
            newState.turnTimerSeconds ?? null,
          );
        }
      }
  };

  // ── Rematch vote state ─────────────────────────────────────────────────────
  const [rematchVote, setRematchVote] = useState<RematchVoteUpdate | null>(null);
  const [votePending, setVotePending] = useState(false);
  const [rematchVoteMode, setRematchVoteMode] = useState<'fresh' | 'same-board' | null>(null);
  const hasVoted = Boolean(
    session?.playerId && rematchVote?.voterIds.includes(session.playerId),
  );
  const hasDeclinedRematch = Boolean(
    session?.playerId && rematchVote?.declinedIds.includes(session.playerId),
  );
  const allRematchHumansResponded = Boolean(
    rematchVote?.active &&
    state?.players
      .filter((player) => !player.isAi)
      .every(
        (player) =>
          rematchVote.voterIds.includes(player.playerId) ||
          rematchVote.declinedIds.includes(player.playerId),
      ),
  );
  const rematchHasEnoughPlayers = (rematchVote?.voterIds.length ?? 0) >= 2;

  const submitRematchResponse = useCallback(async (
    action: 'join' | 'decline' | 'withdraw',
    sameBoard = rematchVote?.sameBoard ?? false,
  ) => {
    if (votePending) return;
    if (action === 'join' && sameBoard && !canReplaySameBoard) {
      toast({
        title: 'Replay unavailable',
        description: 'This game was started before Luminae saved opening board snapshots. Start a new game once, then Replay Same Board will work from there.',
      });
      return;
    }
    if (!roomId || !session?.sessionToken) {
      toast({ title: 'Vote failed', description: 'Your room session is missing.', variant: 'destructive' });
      return;
    }
    const mode: 'fresh' | 'same-board' = sameBoard ? 'same-board' : 'fresh';
    setVotePending(true);
    if (action === 'join') setRematchVoteMode(mode);
    try {
      const resp = await fetch(`/api/rooms/${roomId}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: session.sessionToken, action, sameBoard }),
      });
      if (!resp.ok) {
        let message = 'Could not update the rematch invitation.';
        const text = await resp.text();
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: unknown };
            if (typeof parsed.error === 'string') message = parsed.error;
          } catch {
            message = text;
          }
        }
        throw new Error(message);
      }
      const update = await resp.json() as RematchVoteUpdate;
      setRematchVote(update);
      setRematchVoteMode(
        action === 'join'
          ? update.sameBoard
            ? 'same-board'
            : 'fresh'
          : null,
      );
    } catch (err) {
      if (action === 'join') setRematchVoteMode(null);
      toast({
        title: 'Rematch update failed',
        description: err instanceof Error ? err.message : 'Could not update the rematch invitation.',
        variant: 'destructive',
      });
    } finally {
      setVotePending(false);
    }
  }, [canReplaySameBoard, rematchVote?.sameBoard, roomId, session?.sessionToken, toast, votePending]);

  const loadRematchInfo = useCallback(async () => {
    if (balanceLabCandidate || isLumiiScenario || !roomId || !session?.sessionToken) return;
    try {
      const params = new URLSearchParams({ sessionToken: session.sessionToken });
      const resp = await fetch(`/api/rooms/${roomId}/rematch?${params.toString()}`);
      if (!resp.ok) return;
      setRematchVote(await resp.json() as RematchVoteUpdate);
    } catch {
      // WebSocket updates remain the primary path; reconnect polling retries.
    }
  }, [balanceLabCandidate, isLumiiScenario, roomId, session?.sessionToken]);

  useEffect(() => {
    if (balanceLabCandidate || isLumiiScenario || state?.status !== 'finished') return;
    void loadRematchInfo();
  }, [balanceLabCandidate, isLumiiScenario, loadRematchInfo, state?.status]);

  useEffect(() => {
    if (balanceLabCandidate || isLumiiScenario || state?.status !== 'finished' || !rematchVote?.active || !roomId || !session?.sessionToken) {
      return;
    }

    const refresh = () => {
      void loadRematchInfo();
      void queryClient.invalidateQueries({
        queryKey: getGetGameStateQueryKey(roomId, { sessionToken: session.sessionToken }),
      });
    };
    const interval = window.setInterval(refresh, 1_500);
    return () => window.clearInterval(interval);
  }, [
    loadRematchInfo,
    balanceLabCandidate,
    isLumiiScenario,
    queryClient,
    rematchVote?.active,
    roomId,
    session?.sessionToken,
    state?.status,
  ]);

  useEffect(() => {
    if (state?.status !== 'playing') return;
    setRematchVote(null);
    setVotePending(false);
    setRematchVoteMode(null);
  }, [state?.status]);

  const leaveFinishedRoom = useCallback(() => {
    if (!balanceLabCandidate && !isLumiiScenario && state?.status === 'finished' && roomId && session?.sessionToken) {
      void fetch(`/api/rooms/${roomId}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: session.sessionToken,
          action: 'decline',
        }),
        keepalive: true,
      }).catch(() => {
        // Leaving the result screen should never be held hostage by the request.
      });
    }
    setLocation('/?menu=1');
  }, [balanceLabCandidate, isLumiiScenario, roomId, session?.sessionToken, setLocation, state?.status]);

  const [reconnectBannerDismissed, setReconnectBannerDismissed] = useState(false);
  const { sendChatMessage, isConnected, isReconnecting } = useGameWebsocket({
    roomId: roomId!,
    sessionToken: session?.sessionToken || '',
    onStateUpdate: (newState) => {
      authoritativeStateIngress.accept(newState, 'websocket');
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
    onRematchStarted: (nextState, _sessionStats) => {
      // A rematch is a hard presentation boundary. Dispose delayed decodes,
      // one-shot sources, and cinematic buses before accepting the new epoch.
      gameAudio.resetTransientAudio();
      gameAudio.setEndgameIntensity(0);
      viewOrchestrator.endSequence({ immediate: true });
      viewOrchestrator.restore({ immediate: true });
      authoritativeStateIngress.replaceEpoch(nextState as GameState, 'websocket');
      setRematchVote(null);
      setVotePending(false);
      setRematchVoteMode(null);
    },
    onRematchCancelled: () => {
      setRematchVote(null);
      setVotePending(false);
      setRematchVoteMode(null);
      toast({ title: 'Rematch cancelled', description: 'Not enough players confirmed. The game has ended.' });
    },
    onRematchDeclined: (_sessionStats) => {
      // This player was not included — send them home after a brief message
      setRematchVoteMode(null);
      toast({ title: 'Rematch started', description: 'The other players have begun their next game.' });
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

  useEffect(() => {
    if (!isConnected || state?.status !== 'finished') return;
    void loadRematchInfo();
  }, [isConnected, loadRematchInfo, state?.status]);

  // Reset the manual dismiss whenever a new disconnect cycle begins so the
  // banner reappears for each fresh drop (not just the first one).
  useEffect(() => {
    if (isReconnecting) setReconnectBannerDismissed(false);
  }, [isReconnecting]);

  const submitAction = useSubmitAction();

  // Broadcast civLabel to the server so all players can see it in the scoreboard.
  // Only sends when civLabel actually changes (or on first send this session).
  // isConnected is NOT in the dep array — WS reconnects must not re-send an
  // unchanged name, because set_civ_name increments state.version and broadcasts
  // a full state update to all players, causing a visible game-board refresh.
  useEffect(() => {
    if (!session || !roomId || !state || state.status === 'lobby') return;
    if (!isConnected) return;
    if (lastSentCivLabelRef.current === civLabel) return;
    lastSentCivLabelRef.current = civLabel;
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
  // The arrival dedup guard (handledArrivalEventIdsRef) adds a second layer for
  // cutscenes. The effect is intentionally not dep-array-exhaustive — it only
  // needs to react to `state` changing (the polling result).
  useEffect(() => {
    if (!state || !prevStateRef.current) return;
    const polledVersion = state.version;
    const prevVersion = prevStateRef.current.version;
    const isRematchEpoch =
      prevStateRef.current.status === 'finished' && state.status === 'playing';
    if (typeof polledVersion !== 'number') return;
    if (isRematchEpoch) {
      // Rematches restart the server version counter. They must replace the
      // finished game directly instead of being rejected as stale.
      authoritativeStateIngress.replaceEpoch(state as GameState, 'polling');
      return;
    }
    if (polledVersion <= prevVersion) return;
    // eslint-disable-next-line no-restricted-syntax -- `state` comes from TanStack Query's inferred return type which may be slightly wider than GameState; the cast is safe because the server always returns a conforming GameState object validated by Zod.
    const ingressResult = authoritativeStateIngress.accept(state as unknown as GameState, 'polling');
    if (ingressResult === 'queued') {
      // Polling writes into TanStack Query before this effect runs. Keep the
      // visible board on the processed version until the presentation lane drains.
      if (prevStateRef.current) {
        queryClient.setQueryData(
          getGetGameStateQueryKey(roomId!, { sessionToken: session?.sessionToken || '' }),
          prevStateRef.current,
        );
      }
    }
  }, [
    authoritativeStateIngress,
    queryClient,
    roomId,
    session?.sessionToken,
    state,
  ]);

  // ── Burst-ghost safety valve ───────────────────────────────────────────────
  // Ghost cards should be cleared within ~1–3 s (queue drain + animation start).
  // If the queue is blocked (e.g., 12 s Luminary cutscene) or a clearing path
  // is missed, ghosts persist and the slot appears frozen.  This effect sets a
  // 7 s deadline: any ghost still alive after that is force-cleared.  7 s is
  // longer than the longest regular animation (cipher burst ~6.5 s) but shorter
  // than the arrival cutscene (12 s), so it catches genuinely stuck ghosts
  // without interfering with in-flight animations.
  useEffect(() => {
    if (Object.keys(burstGhostCards).length === 0) return;
    const t = setTimeout(() => {
      setBurstGhostCards(prev => {
        if (Object.keys(prev).length === 0) return prev;
        const protectedKeys = new Set(ironHarbingerGhostSlotKeysRef.current);
        if (protectedKeys.size === 0) return {};
        const next: Record<string, ArtifactCard> = {};
        protectedKeys.forEach((key) => {
          if (prev[key]) next[key] = prev[key];
        });
        return next;
      });
      if (ironHarbingerGhostSlotKeysRef.current.length === 0) {
        ghostArtifactMarkerTypesRef.current.clear();
      }
    }, 7000);
    return () => clearTimeout(t);
  }, [burstGhostCards]);

  // ── Summon cutscene duration used for the animation barrier ───────────────
  const SUMMON_CUTSCENE_DURATION_MS = 12_000;

  // ── enqueueSummon ─────────────────────────────────────────────────────────
  // Triggered by real game events detected via pendingSummonEvents.
  //
  // Dedup guard: skips any eventId already in handledArrivalEventIdsRef.
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
  //   8. setArrivalQueue + setAnimEndTime — start the cutscene; block state drains
  //
  // If the element is missing after switching tabs, falls back to viewport-centre.
  const enqueueSummon = (
    lumId: string,
    lumName: string,
    lumDomain: string,
    lumEminence: number,
    lumFlavor: string,
    eventId: string,
    isDevTest: boolean,
    winSealingColor?: string,
    claimedBy?: string,
    claimedByPlayerId?: string,
  ) => {
    // 1. Dedup guard (skip for dev tests which intentionally replay)
    if (!isDevTest) {
      const dedupKey = arrivalDedupKey(eventId);
      if (handledArrivalEventIdsRef.current.has(dedupKey)) {
        logArrivalDebug('enqueue.duplicate-skipped', { eventId, dedupKey, luminaryId: lumId, isDevTest });
        return;
      }
      handledArrivalEventIdsRef.current.add(dedupKey);
    }

    logArrivalDebug('enqueue.accepted', { eventId, luminaryId: lumId, luminaryName: lumName, isDevTest });
    if (!isDevTest) {
      lockSummonActivation(lumId, eventId);
      holdArrivalVisual(lumId);
    }

    const doEnqueueArrival = () => {
      // If the game has already ended, do not push this arrival into the queue.
      // The currently-active cutscene (arrivalQueue[0]) is allowed to finish via
      // the pendingGameOver mechanism; everything else is silently discarded.
      if (gameFinishedRef.current) {
        pendingSuppressArrivalIdsRef.current.delete(lumId);
        if (!isDevTest) {
          releaseArrivalVisuals([lumId]);
          releaseSummonActivationLocks([lumId]);
        }
        logArrivalDebug('enqueue.aborted-game-finished', { eventId, luminaryId: lumId, isDevTest });
        return;
      }
      logArrivalDebug('enqueue.begin-dom-work', { eventId, luminaryId: lumId, isDevTest });
      setActiveTab('board');                         // 3. ensure board tab mounts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {                // 4. React commit + layout
          const el = document.querySelector(
            `[data-luminary-id="${lumId}"]`
          ) as HTMLElement | null;

          if (!el) {
            logArrivalDebug('enqueue.no-dom-element', { eventId, luminaryId: lumId, isDevTest });
            pendingSuppressArrivalIdsRef.current.delete(lumId);
            const queueEntry = { id: lumId, name: lumName, domain: lumDomain,
              eminence: lumEminence, flavor: lumFlavor, claimedBy, claimedByPlayerId, cardRect: undefined, eventId, isDevTest, winSealingColor };
            setArrivalQueue(q => {
              const next = [...q, queueEntry];
              logArrivalDebug('arrivalQueue.push', {
                eventId,
                luminaryId: lumId,
                reason: 'no-dom-element',
                before: q.length,
                after: next.length,
              });
              return next;
            });
            // Signal that this event has landed in the queue.
            enqueuingCountRef.current = Math.max(0, enqueuingCountRef.current - 1);
            logArrivalDebug('enqueue.landed', { eventId, luminaryId: lumId, enqueuingCount: enqueuingCountRef.current });
            setAnimEndTime(SUMMON_CUTSCENE_DURATION_MS); // 8. block state drains
            return;
          }

          // 5. Scroll into view — browser handles both scroll containers at once.
          el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });

          requestAnimationFrame(async () => {       // 6. settle
            const rect = el.getBoundingClientRect();
            const cardRectVal = rect.width > 0
              ? { cx: rect.left + rect.width / 2,
                  cy: rect.top  + rect.height / 2,
                  w:  rect.width }
              : undefined;

            if (!cardRectVal) {
              logArrivalDebug('enqueue.zero-width-element', {
                eventId,
                luminaryId: lumId,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              });
            }

            const forceEpicArrival = new URLSearchParams(window.location.search).get('epicArrival') === '1';
            const forceBoardSnapshotArrival = new URLSearchParams(window.location.search).get('epicBoardSnapshot') === '1';
            const boardSnapshot = forceBoardSnapshotArrival && forceEpicArrival && cardRectVal && mainScrollRef.current
              ? captureArrivalBoardSnapshot(mainScrollRef.current, cardRectVal)
              : undefined;

            pendingSuppressArrivalIdsRef.current.delete(lumId);
            const queueEntry = { id: lumId, name: lumName, domain: lumDomain,
              eminence: lumEminence, flavor: lumFlavor, claimedBy, claimedByPlayerId, cardRect: cardRectVal, boardSnapshot, eventId, isDevTest, winSealingColor };
            setArrivalQueue(q => {                   // 7. start the cutscene
              const next = [...q, queueEntry];
              logArrivalDebug('arrivalQueue.push', {
                eventId,
                luminaryId: lumId,
                reason: cardRectVal ? 'measured-dom-element' : 'zero-width-element',
                before: q.length,
                after: next.length,
                cardRect: cardRectVal,
                hasBoardSnapshot: !!boardSnapshot,
              });
              return next;
            });
            // Signal that this event has landed in the queue.
            enqueuingCountRef.current = Math.max(0, enqueuingCountRef.current - 1);
            logArrivalDebug('enqueue.landed', { eventId, luminaryId: lumId, enqueuingCount: enqueuingCountRef.current });
            setAnimEndTime(SUMMON_CUTSCENE_DURATION_MS); // 8. block state drains
          });
        });
      });
    };

    // 2. Respect animation barrier — delay if other animations are active.
    // Cap at 500 ms: the Luminary portal lives in a separate DOM section from the
    // Forge, so Artifact Forge/deal animations do not affect its layout. A short
    // settle window is enough; waiting for the full forge lock (up to 3 s or 5.8 s
    // fallback) would block the cutscene for no visual benefit and could cause the
    // arrival to be skipped if the state queue moved on during the wait.
    const animBarrier = animationEndTimeRef.current - Date.now();
    if (animBarrier > 50) {
      const cappedBarrier = Math.min(animBarrier, 500);
      logArrivalDebug('enqueue.delayed-for-animation-barrier', {
        eventId,
        luminaryId: lumId,
        cappedBarrierMs: Math.round(cappedBarrier),
        rawBarrierMs: Math.round(animBarrier),
      });
      setTimeout(doEnqueueArrival, cappedBarrier + 100);
    } else {
      doEnqueueArrival();
    }
  };
  // Keep the ref in sync so the pre-early-return useEffect can call it.
  enqueueArrivalRef.current = enqueueSummon;

  // Reconcile the authoritative pending-event lists independently of the
  // transport that delivered them. WebSocket, polling, and the developer
  // sequence POST can race; a diff-only listener can therefore inherit an
  // event in `prevStateRef` without ever enqueueing its presentation. Event IDs
  // are the canonical dedup boundary, so every unseen server event is safe to
  // enqueue here even when the same Luminary was claimed by an earlier lab run.
  useEffect(() => {
    if (!state) return;

    const pendingArrivals = state.pendingSummonEvents ?? [];
    for (const evt of pendingArrivals) {
      if (handledArrivalEventIdsRef.current.has(arrivalDedupKey(evt.eventId))) {
        continue;
      }
      const lum = state.luminaries.find(candidate => candidate.id === evt.luminaryId);
      if (!lum) {
        logArrivalDebug('authoritative-reconcile.missing-luminary', {
          eventId: evt.eventId,
          luminaryId: evt.luminaryId,
        });
        continue;
      }

      pendingSuppressArrivalIdsRef.current.add(evt.luminaryId);
      const claimer = (state.players ?? []).find(
        player => player.playerId === evt.claimedByPlayerId ||
          (player.claimedLuminaryIds ?? []).includes(evt.luminaryId),
      );
      logArrivalDebug('authoritative-reconcile.enqueue-arrival', {
        eventId: evt.eventId,
        luminaryId: evt.luminaryId,
      });
      enqueueArrivalRef.current(
        evt.luminaryId,
        lum.name,
        lum.domain ?? '',
        balanceLabLuminaryEminence ?? lum.eminence ?? 0,
        lum.flavor ?? '',
        evt.eventId,
        false,
        undefined,
        claimer?.playerName,
        evt.claimedByPlayerId ?? claimer?.playerId,
      );
    }

    const pendingArrivalLuminaryIds = new Set(
      pendingArrivals.map(evt => String(evt.luminaryId)),
    );
    const gateSnapshot: LuminarySequenceGateSnapshot = {
      arrivalQueueLength: arrivalQueueLenRef.current,
      enqueuingCount: enqueuingCountRef.current,
      pendingSuppressCount: pendingSuppressArrivalIdsRef.current.size,
      visualHoldCount: arrivalVisualHoldIdsRef.current.size,
      returningCount: returningLuminaryIdsRef.current.size,
      pendingArrivalLuminaryIds,
      summonActivationLockedLuminaryIds: summonActivationLocksRef.current,
    };

    for (const evt of state.pendingLuminaryActivationEvents ?? []) {
      if (handledActivationEventIdsRef.current.has(evt.eventId)) continue;
      handledActivationEventIdsRef.current.add(evt.eventId);
      const gateDecision = getLuminaryActivationGateDecision(evt, gateSnapshot);
      if (gateDecision.allowed) {
        logArrivalDebug('authoritative-reconcile.queue-activation', {
          eventId: evt.eventId,
          luminaryId: evt.luminaryId,
          effectType: evt.effectType,
        });
        setActivationQueue(queue => [...queue, evt]);
      } else {
        logArrivalDebug('authoritative-reconcile.defer-activation', {
          eventId: evt.eventId,
          luminaryId: evt.luminaryId,
          effectType: evt.effectType,
          reason: gateDecision.reason,
        });
        deferredActivationEventsRef.current.push(evt);
      }
    }
  // Event IDs are immutable within a state version. Re-running for unrelated
  // local presentation state would only add noise; the dedup sets remain the
  // final authority if React replays this effect in development.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.version]);

  // ── Deferred game-over flush ───────────────────────────────────────────────
  // When a Luminary arrival and the win condition arrive in the same state
  // update, `pendingGameOver` is set to hold back the win overlay and win
  // audio until the arrival cutscene and return flight complete. This effect
  // fires the deferred actions as soon as the summon sequence fully drains.

  // Delay (ms) between the fanfare starting and the win overlay appearing /
  // playWin() firing. Should roughly match the fanfare duration (~1.3 s).
  // Increase to let the fanfare finish before the overlay fades in; decrease
  // to shorten the gap. Tune without rebuilding by changing this one value.
  const WIN_FANFARE_DELAY_MS = 1400;

  useEffect(() => {
    // Only flush when the queue is fully drained AND no events are still mid-RAF
    // chain waiting to be pushed into the queue. enqueuingCountRef drops to zero
    // synchronously when each event lands in setArrivalQueue (inside enqueueSummon).
    if (
      pendingGameOver &&
      !summonSequenceActive &&
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
      // gracefully falls back to the singularity/default voice.
      //
      // Also check animBarrierMsRef: the arrival path stored any remaining
      // animation-barrier time there. The arrival cutscene (~12 s) always
      // outlasts the barrier cap (≤ 3 s), so this is zero in practice, but
      // keeping the check here ensures cancelPendingAnimations() is not called
      // while an Artifact/Affinity animation burst is still mid-sequence.
      const arrivalFlushBarrierMs = Math.max(0, animBarrierMsRef.current - Date.now());
      animBarrierMsRef.current = 0;
      if (!isActualLumiiScenario) {
        gameAudio.playLuminaryFanfare(pendingGameOverLumColorRef.current);
      }
      winBarrierTimerRef.current = setTimeout(() => {
        winBarrierTimerRef.current = null;
        cancelPendingAnimations();
        pendingGameOverLumColorRef.current = '';
        fanfareFiredForGameOverRef.current = false;
        setPendingGameOver(false);
        if (!isActualLumiiScenario) gameAudio.playWin();
      }, WIN_FANFARE_DELAY_MS + arrivalFlushBarrierMs);
    }
  }, [cancelPendingAnimations, isActualLumiiScenario, summonSequenceActive, pendingGameOver]);

  // In tutorial mode, suppress the arrival cutscene entirely — immediately drain
  // any queued arrival entries by running the onComplete logic synchronously.
  // This prevents the near-opaque cinematic overlay from blacking out the tutorial
  // UI for the ~9.5 s cutscene duration. resolve_summon is still dispatched
  // (now allowed through the tutorial gate above) so the server gate clears correctly.
  useEffect(() => {
    if (!isTutorial) return;
    if (arrivalQueue.length === 0) return;
    const entry = arrivalQueue[0];
    if (!entry) return;
    setArrivalQueue(q => q.slice(1));
    setClaimedThisSession(prev =>
      prev.includes(entry.id) ? prev : [...prev, entry.id]
    );
    if (!entry.isDevTest) {
      releaseArrivalVisuals([entry.id]);
      releaseSummonActivationLocks([entry.id]);
      executeAction({ type: 'resolve_summon', eventId: entry.eventId });
    }
  // arrivalQueue is the reactive dep that re-runs this effect whenever a new
  // entry is pushed. executeAction is omitted from the dep array intentionally:
  // it is re-created each render but the latest version is always captured
  // through the closure when this effect fires due to arrivalQueue changing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTutorial, arrivalQueue]);

  const playAffinityBurst = (
    counts: Partial<AffinityCounts>,
    playerId: string,
    playerName: string,
    avatarId: string | null,
    targetKind: 'opponent' | 'lumii' = 'opponent',
  ) => {
    const affinities: AffinityKey[] = [];
    for (const [color, count] of Object.entries(counts)) {
      if (color === 'singularity') continue;
      const affinity = color as AffinityKey;
      const total = count ?? 0;
      for (let i = 0; i < total; i += 1) affinities.push(affinity);
    }
    if (affinities.length === 0) return;
    if (affinityBurstTimerRef.current) clearTimeout(affinityBurstTimerRef.current);
    affinityBurstKeyRef.current += 1;
    const seq = affinityBurstKeyRef.current;
    setAffinityBurst({ key: seq, affinities, playerId, playerName, avatarId, targetKind });
    gameAudio.playChipsCollected();
    const totalDuration = (affinities.length - 1) * AFFINITY_BURST_STAGGER_MS + AFFINITY_BURST_BASE_MS + AFFINITY_BURST_SETTLE_MS;
    setAnimEndTime(totalDuration);
    affinityBurstTimerRef.current = setTimeout(() => {
      if (affinityBurstKeyRef.current === seq) setAffinityBurst(null);
      affinityBurstTimerRef.current = null;
    }, totalDuration);
  };

  // Auto-dismiss returnPhase if the server state changes and the condition
  // is no longer true (e.g. the player forged an Artifact and spent Affinities).
  // Must be BEFORE the early returns below so this hook fires on every render.
  useEffect(() => {
    if (!returnPhase || !me) return;
    const handTotal = Object.values(me.affinities).reduce((a, b) => a + b, 0);
    const pendingTotal = Object.values(returnPhase.pendingTake).reduce((a, b) => a + (b ?? 0), 0);
    if (handTotal + pendingTotal <= 10) {
      setReturnPhase(null);
      setReturnSelections({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.affinities, returnPhase]);

  // Detect a zero-yield Harness and play a blocked cue when the action was
  // submitted but the player's held Affinity counts did not increase for any
  // target. Must be BEFORE the early returns so the hook always runs.
  useEffect(() => {
    const check = pendingHarnessCheckRef.current;
    if (!check || !me) return;
    // Guard: only process when the state that contains OUR action has arrived.
    // The compatibility `me.affinities` field is a new reference on every WS update (opponent actions,
    // turn advances, etc.), so without this guard an unrelated update fires the
    // effect while heldBefore equals me.affinities, falsely marking every Affinity as
    // blocked and triggering the amber border flash.
    //
    // Two ways to know our Harness has landed:
    //   1. Any targeted Affinity count changed by value -> normal / partial-block
    //   2. state.lastAction is our Harness wire type -> zero-yield edge case
    //      (bank drained by another player between our selection and submission)
    //
    // NOTE: we cannot use versionAdvanced alone — opponent actions also increment
    // state.version, so that check would still trigger false positives.
    const affinitiesChanged = check.affinities.some(
      affinity => affinity !== 'singularity' && (me.affinities[affinity] ?? 0) !== (check.heldBefore[affinity] ?? 0),
    );
    const la = state?.lastAction as { type?: string; playerId?: string } | null;
    const ourHarnessLanded =
      (la?.type === 'harness_three_affinities' || la?.type === 'harness_two_affinities') &&
      la?.playerId === session?.playerId;
    if (!affinitiesChanged && !ourHarnessLanded) return;
    pendingHarnessCheckRef.current = null;
    const blockedAffinities = check.affinities.filter(
      (affinity) => affinity !== 'singularity' && (me.affinities[affinity] ?? 0) <= (check.heldBefore[affinity] ?? 0),
    );
    if (blockedAffinities.length > 0) {
      // Play a per-Affinity blocked thud for each blocked target only,
      // staggered by 80 ms so overlapping colors remain distinguishable.
      blockedAffinities.forEach((affinity, index) => {
        setTimeout(() => gameAudio.playHarnessBlocked(affinity), index * 80);
      });
      setHarnessBlockedKeys(prev => {
        const next = { ...prev };
        for (const affinity of blockedAffinities) {
          next[affinity] = (next[affinity] ?? 0) + 1;
        }
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.affinities]);

  // ── Callback hooks for card interaction ────────────────────────────
  // These must be declared before any early return so they satisfy
  // react-hooks/rules-of-hooks. They are safe because effectiveCost
  // and me are already declared (may be undefined/null before the
  // state is loaded, but the hooks themselves handle that).
  const computeCosts = useCallback((
    card: ArtifactCard,
    mode: CostMode,
  ): Partial<Record<AffinityKey, number>> | undefined => {
    if (!me) return undefined;
    if (mode === 'printed') return undefined;
    const afterBonus = (
      selectedCard?.card.id === card.id && selectedCard.fromReserve
        ? resolvePlayerForgeCost(card, me, selectedFocusAffinity).cost
        : effectiveCost(card, me)
    ) as Record<string, number>;
    if (mode === 'after_bonuses') return afterBonus as Partial<Record<AffinityKey, number>>;
    // 'needed_now': after bonuses, subtract held tokens and pending Harness tally.
    const check = pendingHarnessCheckRef.current;
    let activeTally: Partial<AffinityCounts> = selectedAffinities;
    if (check?.tally && check?.heldBefore) {
      const alreadyLanded = Object.keys(check.tally).some(
        affinity => (me.affinities[affinity as AffinityKey] ?? 0) > (check.heldBefore![affinity as AffinityKey] ?? 0),
      );
      activeTally = alreadyLanded ? {} : check.tally;
    }
    const out: Partial<Record<AffinityKey, number>> = {};
    for (const c of AFFINITIES) {
      if (c === 'singularity') continue;
      const eff = afterBonus[c] ?? 0;
      const held = me.affinities[c as keyof AffinityCounts] ?? 0;
      const pendingHarnessCount = activeTally[c as keyof AffinityCounts] ?? 0;
      out[c as AffinityKey] = Math.max(0, eff - held - pendingHarnessCount);
    }
    return out;
  }, [me, effectiveCost, resolvePlayerForgeCost, selectedAffinities, selectedCard, selectedFocusAffinity]);

  const handleBuy = (
    card: ArtifactCard,
    fromReserve = false,
    fromArchiveTop = false,
    focusAffinity?: NaturalAffinityKey | null,
  ) => {
    if (!isMyTurnForCoreAction) return;
    triggerForgeIgnition(card.id);
    executeAction({
      type: fromReserve ? 'forge_reserved_artifact' : 'forge_artifact',
      cardId: card.id,
      cardRef: card,
      ...(fromReserve && focusAffinity ? { affinity: focusAffinity } : {}),
      ...(fromArchiveTop ? { luminaryId: 'lum_tide', tier: card.tier } : {}),
    });
  };

  const handleFoundryForge = (card: ArtifactCard) => {
    if (!isMyTurnForCoreAction || !foundryProject) return;
    triggerForgeIgnition(card.id);
    executeAction({
      type: 'foundry_forge_artifact',
      cardId: card.id,
      cardRef: card,
      confirmOverdrive: (foundryProject.foundryUses ?? 0) >= 2,
    });
  };

  const handleReserveCard = (card: ArtifactCard) => {
    if (!isMyTurnForCoreAction || !me) return;
    const handTotal = Object.values(me.affinities).reduce((a, b) => a + b, 0);
    if (
      balanceLabPortableSingularity &&
      handTotal >= 10 &&
      (state?.affinityWell?.singularity ?? 0) > 0
    ) {
      setReturnPhase({
        pendingTake: {},
        actionType: 'reserve',
        excessCount: 1,
        pendingReserve: { type: 'reserve_artifact', cardId: card.id, tier: card.tier, _tier: card.tier },
      });
      setReturnSelections({});
      return;
    }
    executeAction({ type: 'reserve_artifact', cardId: card.id, _tier: card.tier, tier: card.tier });
  };

  const handleReserveDeck = (tier: number) => {
    if (!isMyTurnForCoreAction || !me) return;
    const handTotal = Object.values(me.affinities).reduce((a, b) => a + b, 0);
    if (
      balanceLabPortableSingularity &&
      handTotal >= 10 &&
      (state?.affinityWell?.singularity ?? 0) > 0
    ) {
      setReturnPhase({
        pendingTake: {},
        actionType: 'reserve',
        excessCount: 1,
        pendingReserve: { type: 'reserve_artifact', tier, _tier: tier },
      });
      setReturnSelections({});
      return;
    }
    executeAction({ type: 'reserve_artifact', tier, _tier: tier });
  };

  const openDeckSheet = useCallback((tier: 1 | 2 | 3) => {
    setPendingDeckConfirm(false);
    setSelectedDeckTier(tier);
  }, []);

  const closeDeckSheet = useCallback(() => {
    setSelectedDeckTier(null);
    setPendingDeckConfirm(false);
  }, []);

  const openCardSheet = useCallback((card: ArtifactCard, fromReserve: boolean, fromArchiveTop = false) => {
    if (!me) return;
    // Lock: suppress sheet open while the card is still undergoing a flip-to-replace
    // animation (replace from deck after a forge or cipher). The animation must remain
    // the dominant visual event; the card is already in its end state server-side.
    if (flippingCardsRef.current.has(card.id)) return;
    if (!cardDetailDiscovered) {
      setCardDetailDiscovered(true);
      localStorage.setItem('luminae_card_detail_discovered', 'true');
    }
    setCardFlipped(false);
    setPendingSheetAction(null);
    setSelectedCard({
      card, fromReserve, fromArchiveTop,
      canBuy: isMyTurnForCoreAction && canAffordCard(card, me),
      canReserve: isMyTurnForCoreAction && !fromReserve && !fromArchiveTop && !forgottenHourEncryptBlocked && canReserveMore(me),
      effectiveCosts: computeCosts(card, costMode),
    });
  }, [me, cardDetailDiscovered, forgottenHourEncryptBlocked, isMyTurnForCoreAction, costMode, computeCosts, canAffordCard]);

  const openForgedCardSheet = useCallback((card: ArtifactCard) => {
    setCardFlipped(false);
    setPendingSheetAction(null);
    setSelectedCard({ card, fromReserve: false, canBuy: false, canReserve: false, readOnly: true });
  }, []);

  const myPlannedAction = me?.plannedAction ?? null;
  const {
    cardId: plannedCardId,
    deckTier: plannedDeckTier,
    label: plannedCardLabel,
  } = useMemo(() => getPlannedActionInfo(myPlannedAction), [myPlannedAction]);

  useEffect(() => {
    if (!state || !session || !myPlannedAction) return;
    const currentPlayer = state.players[state.currentPlayerIndex];
    const turnIdentity = currentPlayer
      ? getTurnPresentationKey(currentPlayer.playerId, state.turnCount)
      : null;
    if (!turnIdentity || !canCommitPlannedAction({
      currentPlayerId: currentPlayer?.playerId,
      sessionPlayerId: session.playerId,
      turnCount: state.turnCount,
      plannedAction: myPlannedAction,
      completedTurnPresentationKey,
      turnPresentationPending,
      turnAnnouncementActive: !!turnAnnouncement,
      turnOrderIntroActive: !!turnOrderIntro,
      activationGateActive,
      activationQueueLength: activationQueue.length,
      pendingSummonCount: state.pendingSummonEvents?.length ?? 0,
    })) return;
    if (plannedActionCommitInFlightRef.current === turnIdentity) return;

    plannedActionCommitInFlightRef.current = turnIdentity;
    setPlannedActionCommitPending(true);
    void executeAction({ type: 'execute_plan' }).finally(() => {
      if (plannedActionCommitInFlightRef.current === turnIdentity) {
        plannedActionCommitInFlightRef.current = null;
      }
      setPlannedActionCommitPending(false);
    });
  // executeAction intentionally stays outside the dependency list: this effect
  // is keyed to the authoritative turn and stored plan, not render identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activationGateActive,
    activationQueue.length,
    completedTurnPresentationKey,
    myPlannedAction,
    session?.playerId,
    state?.currentPlayerIndex,
    state?.pendingSummonEvents?.length,
    state?.turnCount,
    turnAnnouncement,
    turnOrderIntro,
    turnPresentationPending,
  ]);

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
  const eminenceBreakdown: EminenceBreakdown = {
    artifacts: (me?.forgedArtifacts ?? []).reduce((sum, card) => sum + (card.eminence ?? 0), 0),
    luminaries: balanceLabLuminaryEminence === 0
      ? 0
      : (me?.claimedLuminaryIds ?? []).reduce((sum, lumId) => {
          const lum = state.luminaries.find((l) => l.id === lumId);
          return sum + (lum?.eminence ?? 0);
        }, 0),
    oblivionRows,
    other: 0,
  };
  eminenceBreakdown.other = Math.max(0, (me?.eminence ?? 0) - eminenceBreakdown.artifacts - eminenceBreakdown.luminaries);
  const terminusDockRows = Math.min(3, Math.max(1, Math.ceil((state.luminaries?.length ?? 0) / 3)));

  const handleAffinityClick = (color: keyof AffinityCounts) => {
    if (isCameraControlled || (!isMyTurn && !canPlan) || color === 'singularity' || !state) return;
    const inBank = state.affinityWell[color] ?? 0;

    if (actionMode === 'take2') {
      if (selectedAffinities[color] === 2) { setSelectedAffinities({}); setAffinityHistory([]); setPrePromotionHistory(null); setActionMode('none'); }
      else if (inBank >= 4) { setSelectedAffinities({ [color]: 2 }); setAffinityHistory([color, color]); gameAudio.playAffinitySelected(color as AffinityKey); }
      return;
    }

    const current = selectedAffinities[color] ?? 0;
    if (current > 0) {
      const next = { ...selectedAffinities };
      delete next[color];
      const empty = Object.keys(next).length === 0;
      setSelectedAffinities(next);
      setAffinityHistory(prev => prev.filter(c => c !== color));
      if (empty) setActionMode('none');
      return;
    }

    if (inBank <= 0) return;
    const distinctCount = Object.keys(selectedAffinities).length;
    if (distinctCount >= 3) return;
    setSelectedAffinities({ ...selectedAffinities, [color]: 1 });
    setAffinityHistory(prev => [...prev, color]);
    setActionMode(actionMode === 'none' ? 'take3' : actionMode);
    gameAudio.playAffinitySelected(color as AffinityKey);
  };

  const handleUndoAffinity = () => {
    if (affinityHistory.length === 0) return;
    // If undoing a take-2 that was created via promoteToTake2, restore the
    // pre-promotion snapshot (which may be empty) rather than removing just
    // one history entry and leaving a stale single-Affinity selection.
    if (actionMode === 'take2' && prePromotionHistory !== null) {
      const restored = prePromotionHistory;
      setAffinityHistory(restored);
      setPrePromotionHistory(null);
      if (restored.length === 0) {
        setSelectedAffinities({});
        setActionMode('none');
      } else {
        const rebuilt: Partial<AffinityCounts> = {};
        for (const c of restored) rebuilt[c] = (rebuilt[c] ?? 0) + 1;
        setSelectedAffinities(rebuilt);
        const restoredIsTake2 = Object.keys(rebuilt).length === 1 && rebuilt[restored[0]] === 2;
        setActionMode(restoredIsTake2 ? 'take2' : 'take3');
      }
      return;
    }
    const newHistory = affinityHistory.slice(0, -1);
    setAffinityHistory(newHistory);
    if (newHistory.length === 0) {
      setSelectedAffinities({});
      setActionMode('none');
    } else {
      const rebuilt: Partial<AffinityCounts> = {};
      for (const c of newHistory) {
        rebuilt[c] = (rebuilt[c] ?? 0) + 1;
      }
      setSelectedAffinities(rebuilt);
      const isTake2 = Object.keys(rebuilt).length === 1 && rebuilt[newHistory[0]] === 2;
      setActionMode(isTake2 ? 'take2' : 'take3');
    }
  };

  const promoteToTake2 = (color: AffinityKey) => {
    if (!state || (state.affinityWell[color] ?? 0) < 4) return;
    setPrePromotionHistory(affinityHistory);
    setSelectedAffinities({ [color]: 2 });
    setAffinityHistory([color, color]);
    setActionMode('take2');
    gameAudio.playAffinitySelected(color);
  };

  type ExecuteActionPayload = Omit<ActionRequest, 'sessionToken' | 'affinities' | 'affinity'> & {
    _tier?: number;
    cardRef?: ArtifactCard;
    playerId?: string;
    affinities?: Partial<AffinityCounts>;
    affinity?: ActionRequestAffinity;
  };

  type ActionGateResult = { ok: true } | { ok: false; reason: string; staleSelection?: boolean };
  const cardEntryId = (entry: ArtifactCard | string | null | undefined): string | null =>
    typeof entry === 'string' ? entry : entry?.id ?? null;
  const findFaceUpForgeCard = (cardId?: string | null): ArtifactCard | null => {
    if (!cardId || !state) return null;
    const rows = [state.forgeTier1, state.forgeTier2, state.forgeTier3] as Array<Array<ArtifactCard | string | null>>;
    for (const row of rows) {
      const found = row.find((entry) => cardEntryId(entry) === cardId);
      if (found && typeof found !== 'string') return found;
      if (found) return null;
    }
    return null;
  };
  const isFaceUpForgeCard = (cardId?: string | null): boolean => {
    if (!cardId || !state) return false;
    const rows = [state.forgeTier1, state.forgeTier2, state.forgeTier3] as Array<Array<ArtifactCard | string | null>>;
    return rows.some((row) => row.some((entry) => cardEntryId(entry) === cardId));
  };
  const findTideArchiveTopCard = (cardId?: string | null): ArtifactCard | null => {
    if (!cardId || !me?.tideArchiveForgeAvailable) return null;
    const topCards = me.tideArchiveTopCards;
    return [topCards?.tier1, topCards?.tier2, topCards?.tier3]
      .find((card) => card?.id === cardId) ?? null;
  };
  const isReservedByMe = (cardId?: string | null): boolean => {
    if (!cardId || !me) return false;
    const reservedArtifacts = (me.reservedArtifacts ?? []) as Array<ArtifactCard | string | null>;
    const reservedIds = ((me as { reservedArtifactIds?: string[] }).reservedArtifactIds ?? []) as string[];
    return reservedIds.includes(cardId) || reservedArtifacts.some((entry) => cardEntryId(entry) === cardId);
  };
  const getDeckCountForTier = (tier?: number | null): number => {
    if (!state || !tier) return 0;
    if (tier === 1) return state.deckCounts.tier1 ?? 0;
    if (tier === 2) return state.deckCounts.tier2 ?? 0;
    if (tier === 3) return state.deckCounts.tier3 ?? 0;
    return 0;
  };
  const closeStaleActionSurface = () => {
    setSelectedCard(null);
    setSelectedDeckTier(null);
    setPendingSheetAction(null);
    setPendingDeckConfirm(false);
  };
  const handleBlockedAction = (gate: ActionGateResult) => {
    if (gate.ok) return;
    gameAudio.playActionRejected();
    if (gate.staleSelection) closeStaleActionSurface();
  };
  const validateCoreAction = (payload: ExecuteActionPayload): ActionGateResult => {
    if (!state || !me) return { ok: false, reason: 'Board is still loading.' };
    if (state.status !== 'playing') return { ok: false, reason: 'Game is not active.' };
    if (luminaryChoiceActive) return { ok: false, reason: 'Resolve the Luminary choice first.' };
    if (!isMyTurnForCoreAction) return { ok: false, reason: 'This action is not available right now.' };

    if (payload.type === 'forge_artifact') {
      const isArchiveForge = payload.luminaryId === 'lum_tide';
      const card = payload.cardRef ?? (isArchiveForge
        ? findTideArchiveTopCard(payload.cardId as string | undefined)
        : findFaceUpForgeCard(payload.cardId as string | undefined));
      const isAvailable = isArchiveForge
        ? !!findTideArchiveTopCard(payload.cardId as string | undefined)
        : isFaceUpForgeCard(payload.cardId as string | undefined);
      if (!payload.cardId || !isAvailable) {
        return { ok: false, reason: 'Artifact is no longer in The Forge.', staleSelection: true };
      }
      if (!card || !canAffordCard(card, me)) return { ok: false, reason: 'Cannot afford this Artifact.' };
    }

    if (payload.type === 'foundry_forge_artifact') {
      const card = payload.cardRef ?? findFaceUpForgeCard(payload.cardId as string | undefined);
      if (!payload.cardId || !isFaceUpForgeCard(payload.cardId as string)) {
        return { ok: false, reason: 'Artifact is no longer in The Forge.', staleSelection: true };
      }
      if (!card || !canAffordFoundryCard(card, me)) {
        return { ok: false, reason: 'Foundry Forge cannot claim this Artifact.' };
      }
    }

    if (payload.type === 'recover_foundry_component') {
      const recoveryIds = me.blueprintPrivateStates?.find(
        (blueprint) => blueprint.blueprintId === 'bp_mantle_to_orbit_foundry',
      )?.foundryRecoveryComponentIds ?? [];
      if (!payload.cardId || !recoveryIds.includes(payload.cardId as string)) {
        return { ok: false, reason: 'Foundry component is no longer awaiting recovery.' };
      }
    }

    if (payload.type === 'reserve_artifact') {
      if (forgottenHourEncryptBlocked) return { ok: false, reason: 'Cannot encrypt during The Forgotten Hour.' };
      if (!canReserveMore(me)) return { ok: false, reason: 'Encrypted pile is full.' };
      const cardId = payload.cardId as string | undefined;
      const tier = Number((payload.tier as number | string | undefined) ?? payload._tier ?? 0) || null;
      if (cardId && !isFaceUpForgeCard(cardId)) {
        return { ok: false, reason: 'Artifact is no longer in The Forge.', staleSelection: true };
      }
      if (cardId && artifactMarkerHasBrand(state.artifactMarkers?.[cardId], 'nullified')) {
        return { ok: false, reason: 'Nullified Artifacts cannot be Encrypted.' };
      }
      if (!cardId && getDeckCountForTier(tier) <= 0) {
        return { ok: false, reason: 'Archive is empty.', staleSelection: true };
      }
    }

    if (payload.type === 'forge_reserved_artifact') {
      if (!payload.cardId || !isReservedByMe(payload.cardId as string)) {
        return { ok: false, reason: 'Artifact is no longer encrypted.', staleSelection: true };
      }
      const card = payload.cardRef ?? (me.reservedArtifacts ?? []).find(
        (entry) => cardEntryId(entry as ArtifactCard | string | null) === payload.cardId,
      ) as ArtifactCard | undefined;
      if (card) {
        const focusOptions = balanceLabFocusOptions({
          candidate: balanceLabCandidate,
          ordinaryCost: ordinaryEffectiveCost(card, me),
          fromReserve: true,
        });
        const requestedFocus = payload.affinity as NaturalAffinityKey | undefined;
        if (focusOptions.length > 1 && !requestedFocus) {
          return { ok: false, reason: 'Choose which Affinity Focus satisfies.' };
        }
        if (requestedFocus && !focusOptions.includes(requestedFocus)) {
          return { ok: false, reason: 'That Focus choice is no longer available.' };
        }
        if (!canAffordCard(card, me, requestedFocus)) return { ok: false, reason: 'Cannot afford this Artifact.' };
      }
    }

    if (payload.type === 'assimilate') {
      if (!payload.cardId || !isFaceUpForgeCard(payload.cardId as string)) {
        return { ok: false, reason: 'Artifact is no longer in The Forge.', staleSelection: true };
      }
      if (!assimilateAvailable) return { ok: false, reason: 'Assimilation is not available.' };
    }

    if (payload.type === 'harness_two_affinities') {
      const affinity = payload.affinity as keyof AffinityCounts | undefined;
      if (!affinity || affinity === 'singularity' || (state.affinityWell[affinity] ?? 0) < 4) {
        return { ok: false, reason: 'Need at least 4 in the Affinity Well to Harness 2.' };
      }
    }

    if (payload.type === 'harness_three_affinities') {
      const affinities = payload.affinities ?? {};
      const picks = Object.entries(affinities)
        .filter(([key, value]) => key !== 'singularity' && (value ?? 0) > 0);
      if (picks.length !== 3 || picks.some(([, value]) => value !== 1)) {
        return { ok: false, reason: 'Harness exactly 3 different Affinities.' };
      }
      if (picks.some(([key]) => (state.affinityWell[key as keyof AffinityCounts] ?? 0) <= 0)) {
        return { ok: false, reason: 'That affinity is no longer available.' };
      }
    }

    return { ok: true };
  };
  const validatePlannedAction = (plannedActionData: Record<string, unknown>): ActionGateResult => {
    if (!state || !me) return { ok: false, reason: 'Board is still loading.' };
    if (!canPlan) return { ok: false, reason: 'Planning is not available right now.' };
    const type = plannedActionData.type as string | undefined;
    const cardId = plannedActionData.cardId as string | undefined;

    if (type === 'forge_artifact') {
      const isArchiveForge = plannedActionData.luminaryId === 'lum_tide';
      const card = isArchiveForge ? findTideArchiveTopCard(cardId) : findFaceUpForgeCard(cardId);
      const isAvailable = isArchiveForge
        ? !!findTideArchiveTopCard(cardId)
        : isFaceUpForgeCard(cardId);
      if (!cardId || !isAvailable) {
        return { ok: false, reason: 'Artifact is no longer in The Forge.', staleSelection: true };
      }
      if (!card || !canAffordCard(card, me)) return { ok: false, reason: 'Cannot afford this plan yet.' };
    }

    if (type === 'foundry_forge_artifact') {
      const card = findFaceUpForgeCard(cardId);
      if (!cardId || !isFaceUpForgeCard(cardId)) {
        return { ok: false, reason: 'Artifact is no longer in The Forge.', staleSelection: true };
      }
      if (!card || !canAffordFoundryCard(card, me)) {
        return { ok: false, reason: 'Foundry Forge cannot claim this Artifact.' };
      }
    }

    if (type === 'reserve_artifact') {
      if (forgottenHourEncryptBlocked) return { ok: false, reason: 'Cannot encrypt during The Forgotten Hour.' };
      if (!canReserveMore(me)) return { ok: false, reason: 'Encrypted pile is full.' };
      const tier = Number(
        (plannedActionData.tier as number | string | undefined) ??
        (plannedActionData._tier as number | string | undefined) ??
        0,
      ) || null;
      if (cardId && !isFaceUpForgeCard(cardId)) {
        return { ok: false, reason: 'Artifact is no longer in The Forge.', staleSelection: true };
      }
      if (cardId && artifactMarkerHasBrand(state.artifactMarkers?.[cardId], 'nullified')) {
        return { ok: false, reason: 'Nullified Artifacts cannot be Encrypted.' };
      }
      if (!cardId && getDeckCountForTier(tier) <= 0) {
        return { ok: false, reason: 'Archive is empty.', staleSelection: true };
      }
    }

    if (type === 'forge_reserved_artifact') {
      if (!cardId || !isReservedByMe(cardId)) {
        return { ok: false, reason: 'Artifact is no longer encrypted.', staleSelection: true };
      }
      const card = (me.reservedArtifacts ?? []).find((entry) => cardEntryId(entry as ArtifactCard | string | null) === cardId) as ArtifactCard | undefined;
      if (card) {
        const focusOptions = balanceLabFocusOptions({
          candidate: balanceLabCandidate,
          ordinaryCost: ordinaryEffectiveCost(card, me),
          fromReserve: true,
        });
        const requestedFocus = plannedActionData.affinity as NaturalAffinityKey | undefined;
        if (focusOptions.length > 1 && !requestedFocus) {
          return { ok: false, reason: 'Choose which Affinity Focus satisfies.' };
        }
        if (requestedFocus && !focusOptions.includes(requestedFocus)) {
          return { ok: false, reason: 'That Focus choice is no longer available.' };
        }
        if (!canAffordCard(card, me, requestedFocus)) return { ok: false, reason: 'Cannot afford this plan yet.' };
      }
    }

    if (type === 'harness_two_affinities') {
      const affinity = plannedActionData.affinity as keyof AffinityCounts | undefined;
      if (!affinity || affinity === 'singularity' || (state.affinityWell[affinity] ?? 0) < 4) {
        return { ok: false, reason: 'Need at least 4 in the Affinity Well to Harness 2.' };
      }
    }

    if (type === 'harness_three_affinities') {
      const affinities = plannedActionData.affinities ?? {};
      const picks = Object.entries(affinities)
        .filter(([key, value]) => key !== 'singularity' && (value ?? 0) > 0);
      if (picks.length !== 3 || picks.some(([, value]) => value !== 1)) {
        return { ok: false, reason: 'Harness exactly 3 different Affinities.' };
      }
      if (picks.some(([key]) => (state.affinityWell[key as keyof AffinityCounts] ?? 0) <= 0)) {
        return { ok: false, reason: 'That affinity is no longer available.' };
      }
    }

    if (!type || !['forge_artifact', 'foundry_forge_artifact', 'forge_reserved_artifact', 'reserve_artifact', 'harness_three_affinities', 'harness_two_affinities'].includes(type)) {
      return { ok: false, reason: 'That action cannot be planned.' };
    }

    return { ok: true };
  };
  const nonDestructiveActionFailure = (message: string): boolean =>
    message === 'Artifact is no longer in The Forge' ||
    message === 'Not your turn' ||
    message === 'You already used your core action this turn.';

  const executeAction = async (payload: ExecuteActionPayload) => {
    // Tutorial gate — only permit the action type for the current step.
    // Steps 0–3 each have specific permitted types; step 4 (Luminaries intro,
    // requiresConfirm) has an empty list, so ALL actions are blocked until the
    // player taps "Got it" and the overlay dismisses (tutorialStep goes to -1).
    // Resolution acknowledgements must always reach the server, even during
    // tutorial steps where normal action types are gated.
    if (
      payload.type !== 'resolve_summon' &&
      payload.type !== 'resolve_luminary_activation' &&
      payload.type !== 'resolve_blueprint_manifestation' &&
      payload.type !== 'resolve_blueprint_detonation' &&
      isTutorial &&
      tutorialStep >= 0 &&
      tutorialStep < LUMII_BEAT_COUNT
    ) {
      const permitted = LUMII_BEAT_GATES[tutorialStep] ?? [];
      if (!permitted.includes(payload.type as string)) {
        setTutorialNudgeTick(t => t + 1);
        return;
      }
    }
    const CORE_ACTION_TYPES = ['harness_three_affinities', 'harness_two_affinities', 'forge_artifact', 'foundry_forge_artifact', 'recover_foundry_component', 'forge_reserved_artifact', 'reserve_artifact', 'assimilate'];
    if (CORE_ACTION_TYPES.includes(payload.type)) {
      const gate = validateCoreAction(payload);
      if (!gate.ok) {
        handleBlockedAction(gate);
        return;
      }
      setCoreActionSubmitted(true);
    }
    try {
      const normalized = { ...payload };
      delete normalized._tier;
      if (normalized.affinities) {
        normalized.affinities = Object.assign({ flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 }, normalized.affinities) as AffinityCounts;
      }

      // Pre-set a ghost Artifact for a Forge, Encrypt, or Assimilate source slot.
      // This blocks the replacement card from flashing in during the gap between
      // submission and processUpdate (REST 200ms delay, or a polling useEffect
      // render firing before the queue drains).  burstGhostCards renders with
      // highest priority over the actual TQ state card, so the old card stays
      // visible until the forge / cipher animation fires.
      // The owning presentation removes the ghost only when it takes over the
      // source, preventing an authoritative replacement from flashing early.
      if (
        (
          payload.type === 'forge_artifact' ||
          payload.type === 'foundry_forge_artifact' ||
          payload.type === 'reserve_artifact' ||
          payload.type === 'assimilate'
        ) &&
        payload.cardId &&
        state
      ) {
        const targetId = payload.cardId as string;
        const tiers: [1 | 2 | 3, (ArtifactCard | null)[]][] = [
          [1, state.forgeTier1 as (ArtifactCard | null)[]],
          [2, state.forgeTier2 as (ArtifactCard | null)[]],
          [3, state.forgeTier3 as (ArtifactCard | null)[]],
        ];
        for (const [tierNum, tier] of tiers) {
          const idx = tier.findIndex((c) => c?.id === targetId);
          if (idx >= 0 && tier[idx]) {
            const preGhostKey = `${tierNum}-${idx}`;
            const sourceCard = tier[idx]!;
            const startsOptimisticForge =
              (payload.type === 'forge_artifact' || payload.type === 'foundry_forge_artifact') && !optimisticLocalForgeRef.current;
            // Reserve still needs a ghost while waiting for its confirmed cipher
            // sequence. An optimistic Forge owns the source immediately, so a
            // ghost here would render a duplicate underneath the flying card.
            if (!startsOptimisticForge) {
              setBurstGhostCards(prev => ({ ...prev, [preGhostKey]: sourceCard }));
            }
            if (payload.type === 'assimilate') {
              const sourceElement = document.querySelector<HTMLElement>(`[data-card-id="${targetId}"]`);
              const sourceRect = sourceElement?.getBoundingClientRect();
              pendingAssimilationSlotRef.current = {
                cardId: targetId,
                card: sourceCard,
                tier: tierNum,
                slotKey: preGhostKey,
                fallbackRect: sourceRect ? {
                  left: sourceRect.left,
                  top: sourceRect.top,
                  width: sourceRect.width,
                  height: sourceRect.height,
                } : undefined,
                destinationSelector: '[data-civilization-drop-target], [data-nav-hand]',
              };
            }
            const marker = state.artifactMarkers?.[targetId];
            const markerType = getArtifactBrandTypes(marker).at(-1);
            if (markerType) ghostArtifactMarkerTypesRef.current.set(targetId, markerType);
            else ghostArtifactMarkerTypesRef.current.delete(targetId);

            // The request may take a beat to return. Start the real forge flight
            // now, then let processUpdate attach the confirmed replacement phase.
            if (startsOptimisticForge) {
              const sourceEl = document.querySelector(`[data-card-id="${targetId}"]`);
              const sourceRect = sourceEl?.getBoundingClientRect();
              const forgeDestination = resolveLocalForgeDestination();
              const spentCost = me
                ? (payload.type === 'foundry_forge_artifact'
                    ? foundryEffectiveCost(sourceCard, me)
                    : effectiveCost(sourceCard, me)) as Record<string, number>
                : {};
              const spentColors = Object.entries(spentCost)
                .filter(([, value]) => value > 0)
                .map(([affinity]) => affinity as AffinityKey);
              const nullifiedExempt = isNullifiedFirstForgeExempt(
                marker,
                session?.playerId,
                state.nullifiedFirstForge,
              );
              const markerEminence = artifactMarkerBlocksForgeEminence(marker, nullifiedExempt)
                ? 0
                : (sourceCard.eminence ?? 0);
              cardActionBurstKeyRef.current += 1;
              const burstKey = cardActionBurstKeyRef.current;
              optimisticLocalForgeRef.current = {
                cardId: targetId,
                slotKey: preGhostKey,
                startedAt: Date.now(),
                burstKey,
              };
              setCardActionBurst({
                key: burstKey,
                card: sourceCard,
                tier: tierNum,
                playerName: me?.playerName ?? 'You',
                avatarId: me?.avatarId ?? null,
                eminence: markerEminence,
                gotSingularity: false,
                startRect: sourceRect
                  ? { x: sourceRect.left, y: sourceRect.top, w: sourceRect.width, h: sourceRect.height }
                  : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
                destPos: forgeDestination?.pos,
                destKind: forgeDestination?.kind,
                destTargetSelector: forgeDestination?.targetSelector,
                spentColors,
                isForgottenForge: markerType === 'forgotten',
              });
              setHiddenSlots(new Set([preGhostKey]));
              gameAudio.playArtifactForged();
            }
            break;
          }
        }
      }

      const restState = await submitAction.mutateAsync({ roomId: roomId!, data: { sessionToken: session.sessionToken, ...normalized } as ActionRequest });
      // The REST response is authoritative too. Apply whichever transport arrives
      // first; the version guard deduplicates the later delivery.
      if (restState && typeof restState.version === 'number') {
        const restStateTyped = restState;
        authoritativeStateIngress.accept(restStateTyped, 'rest');
      }
      setActionMode('none');
      setSelectedAffinities({});
      setAffinityHistory([]);
      setPrePromotionHistory(null);
      // Presentation acknowledgements can be sent by any watching client. Do
      // not close an unrelated card sheet as a side effect of housekeeping.
      if (
        payload.type !== 'resolve_summon' &&
        payload.type !== 'resolve_luminary_activation' &&
        payload.type !== 'resolve_blueprint_manifestation' &&
        payload.type !== 'resolve_blueprint_detonation'
      ) {
        setSelectedCard(null);
      }
      if (payload.type === 'forge_reserved_artifact') {
        gameAudio.playArtifactForged();
        const bonusAffinity = payload.cardRef?.bonusAffinity as AffinityKey | undefined;
        if (bonusAffinity && bonusAffinity !== 'singularity') {
          const tBonus = setTimeout(() => gameAudio.playBonusSound(bonusAffinity), abridgedAnims ? 380 : 1000);
          cardAnimTimersRef.current.push(tBonus);
        }
        const reservedMarker = payload.cardId
          ? state?.artifactMarkers?.[payload.cardId as string]
          : undefined;
        const reservedIsForgottenForge = artifactMarkerHasBrand(reservedMarker, 'forgotten');
        const nullifiedExempt = isNullifiedFirstForgeExempt(
          reservedMarker,
          session?.playerId,
          state?.nullifiedFirstForge,
        );
        const eminence = artifactMarkerBlocksForgeEminence(reservedMarker, nullifiedExempt)
          ? 0
          : (payload.cardRef?.eminence ?? 0);
        const name = payload.cardRef?.name ?? 'Artifact';
        if (eminence <= 0 || !payload.cardRef) {
          reservedForgeNoticeKeyRef.current += 1;
          setReservedForgeNotice({ key: reservedForgeNoticeKeyRef.current, eminence, name });
          const noticeTimer = setTimeout(() => setReservedForgeNotice(null), 1900);
          cardAnimTimersRef.current.push(noticeTimer);
        }
        // Use the normal Forge animation path from the reserved slot to the Hand tab.
        if (payload.cardRef) {
          const cardEl = document.querySelector(`[data-reserved-card-id="${payload.cardId}"]`);
          const cardRect = cardEl?.getBoundingClientRect();
          const forgeDestination = resolveLocalForgeDestination();
          const _spentCost = me
            ? resolvePlayerForgeCost(
                payload.cardRef as ArtifactCard,
                me as GamePlayerState,
                payload.affinity as NaturalAffinityKey | undefined,
              ).cost as Record<string, number>
            : {};
          const _spentColors = Object.entries(_spentCost)
            .filter(([, v]) => v > 0)
            .map(([c]) => c as AffinityKey);
          cardActionBurstKeyRef.current += 1;
          setAnimEndTime(abridgedAnims ? ABRIDGED_ACTION_MS : FORGE_FULL_MS);
          setCardActionBurst({
            key: cardActionBurstKeyRef.current,
            card: payload.cardRef as ArtifactCard,
            tier: (payload.cardRef as ArtifactCard).tier,
            playerName: me?.playerName ?? 'You',
            avatarId: (me as GamePlayerState | undefined)?.avatarId ?? null,
            eminence,
            gotSingularity: false,
            startRect: cardRect
              ? { x: cardRect.left, y: cardRect.top, w: cardRect.width, h: cardRect.height }
              : { x: window.innerWidth / 2 - BOARD_CARD_W / 2, y: window.innerHeight / 2 - BOARD_CARD_H / 2, w: BOARD_CARD_W, h: BOARD_CARD_H },
            destPos: forgeDestination?.pos,
            destKind: forgeDestination?.kind,
            destTargetSelector: forgeDestination?.targetSelector,
            spentColors: _spentColors,
            isForgottenForge: reservedIsForgottenForge,
          });
          const seq = cardActionBurstKeyRef.current;
          if (!abridgedAnims) {
            const tImpact = setTimeout(() => {
              if (cardActionBurstKeyRef.current !== seq) return;
              flashForgeDestination(forgeDestination, payload.cardRef as ArtifactCard);
            }, 1180);
            cardAnimTimersRef.current.push(tImpact);
          }
          const tClear = setTimeout(() => {
            if (cardActionBurstKeyRef.current !== seq) return;
            setCardActionBurst(null);
          }, abridgedAnims ? 780 : 3100);
          cardAnimTimersRef.current.push(tClear);
        }
      }
    } catch (err: unknown) {
      if (
        (payload.type === 'forge_artifact' || payload.type === 'foundry_forge_artifact') &&
        payload.cardId &&
        optimisticLocalForgeRef.current?.cardId === payload.cardId
      ) {
        const { slotKey } = optimisticLocalForgeRef.current;
        optimisticLocalForgeRef.current = null;
        cardActionBurstKeyRef.current += 1;
        setCardActionBurst(null);
        setHiddenSlots(new Set());
        setBurstGhostCards(prev => { const next = { ...prev }; delete next[slotKey]; return next; });
      }
      if (payload.type === 'assimilate' && pendingAssimilationSlotRef.current) {
        const { slotKey } = pendingAssimilationSlotRef.current;
        pendingAssimilationSlotRef.current = null;
        setBurstGhostCards(previous => {
          if (!previous[slotKey]) return previous;
          const next = { ...previous };
          delete next[slotKey];
          return next;
        });
        setHiddenSlots(previous => {
          if (!previous.has(slotKey)) return previous;
          const next = new Set(previous);
          next.delete(slotKey);
          return next;
        });
      }
      if (CORE_ACTION_TYPES.includes(payload.type)) {
        setCoreActionSubmitted(false);
      }
      const description = err instanceof Error ? err.message : String(err);
      if (nonDestructiveActionFailure(description)) {
        gameAudio.playActionRejected();
        if (description === 'Artifact is no longer in The Forge') closeStaleActionSurface();
        toast({ title: 'Action unavailable', description: description === 'Artifact is no longer in The Forge' ? 'The Forge changed before the action reached the server.' : 'The board changed before the action reached the server.' });
      } else {
        toast({ variant: 'destructive', title: 'Action failed', description });
      }
    }
  };
  executeActionRef.current = executeAction;

  const harnessLegality: { ok: boolean; reason: string; actionType: null | 'take3' | 'take2' } = (() => {
    if (!me) return { ok: false, reason: '', actionType: null };
    const total = Object.values(selectedAffinities).reduce((a, b) => a + (b ?? 0), 0);
    if (total === 0) return { ok: false, reason: '', actionType: null };
    const distinct = Object.keys(selectedAffinities);
    const handTotal = Object.values(me.affinities).reduce((a, b) => a + b, 0);
    const overLimit = handTotal + total > 10;
    const excess = handTotal + total - 10;
    if (distinct.length === 1 && (selectedAffinities[distinct[0] as keyof AffinityCounts] ?? 0) === 2) {
      const c = distinct[0] as keyof AffinityCounts;
      if ((state.affinityWell[c] ?? 0) >= 4) {
        const reason = overLimit
          ? `Harness 2 ${AFFINITY_META[c as AffinityKey].name} (return ${excess})`
          : `Harness 2 ${AFFINITY_META[c as AffinityKey].name}`;
        return { ok: true, reason, actionType: 'take2' };
      }
      return { ok: false, reason: `Need 4+ in well to harness 2`, actionType: null };
    }
    if (distinct.length === 3 && distinct.every(c => (selectedAffinities[c as keyof AffinityCounts] ?? 0) === 1)) {
      const base = 'Harness 3';
      const reason = overLimit ? `${base} (return ${excess})` : base;
      return { ok: true, reason, actionType: 'take3' };
    }
    if (total === 1 && distinct.length === 1) {
      return { ok: false, reason: 'Choose 2 other Affinities, or use ×2', actionType: null };
    }
    if (total === 2 && distinct.length === 2) {
      return { ok: false, reason: 'Choose 1 more different Affinity', actionType: null };
    }
    return { ok: false, reason: 'Invalid combination', actionType: null };
  })();

  const triggerHarnessBurst = (affinities: Partial<AffinityCounts>) => {
    setHarnessBurstKeys((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(affinities) as AffinityKey[]) {
        if ((affinities[key] ?? 0) > 0) {
          next[key] = (next[key] ?? 0) + 1;
        }
      }
      return next;
    });
  };


  const confirmAffinities = () => {
    if (!isMyTurnForCoreAction || !harnessLegality.ok || !me) return;
    const total = Object.values(selectedAffinities).reduce((a, b) => a + (b ?? 0), 0);
    const handTotal = Object.values(me.affinities).reduce((a, b) => a + b, 0);
    if (handTotal + total > 10) {
      setReturnPhase({
        pendingTake: { ...selectedAffinities },
        actionType: harnessLegality.actionType!,
        excessCount: handTotal + total - 10,
      });
      setReturnSelections({});
      return;
    }
    if (harnessLegality.actionType === 'take3') {
      optimisticHarnessFiredRef.current = true;
      triggerHarnessBurst(selectedAffinities);
      pendingHarnessCheckRef.current = {
        affinities: Object.keys(selectedAffinities) as AffinityKey[],
        heldBefore: { ...me.affinities },
        tally: { ...selectedAffinities },
        submittedVersion: state!.version,
      };
      // Clear selection immediately so AffinityWell drops the colored affinity-slot
      // borders right away. selectedAffinities closure value is still correct for
      // the executeAction call below (setState is batched, not synchronous).
      setSelectedAffinities({});
      setAffinityHistory([]);
      setPrePromotionHistory(null);
      setActionMode('none');
      executeAction({ type: 'harness_three_affinities', affinities: selectedAffinities });
      flashSent('harness');
    } else if (harnessLegality.actionType === 'take2') {
      optimisticHarnessFiredRef.current = true;
      triggerHarnessBurst(selectedAffinities);
      pendingHarnessCheckRef.current = {
        affinities: Object.keys(selectedAffinities) as AffinityKey[],
        heldBefore: { ...me.affinities },
        tally: { ...selectedAffinities },
        submittedVersion: state!.version,
      };
      setSelectedAffinities({});
      setAffinityHistory([]);
      setPrePromotionHistory(null);
      setActionMode('none');
      executeAction({ type: 'harness_two_affinities', affinity: Object.keys(selectedAffinities)[0] as ActionRequestAffinity });
      flashSent('harness');
    }
  };

  const cancelReturnPhase = () => {
    setReturnPhase(null);
    setReturnSelections({});
    setActionMode('none');
    setSelectedAffinities({});
    setAffinityHistory([]);
    setPrePromotionHistory(null);
  };

  const confirmReturnPhase = () => {
    if (!isMyTurnForCoreAction || !returnPhase || !me) return;
    const totalSelected = Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0);
    if (totalSelected !== returnPhase.excessCount) return;
    if (returnPhase.actionType === 'reserve') {
      if (!returnPhase.pendingReserve) return;
      executeAction({ ...returnPhase.pendingReserve, returnAffinities: returnSelections });
      setReturnPhase(null);
      setReturnSelections({});
      return;
    }
    optimisticHarnessFiredRef.current = true;
    triggerHarnessBurst(returnPhase.pendingTake);
    pendingHarnessCheckRef.current = {
      affinities: Object.keys(returnPhase.pendingTake) as AffinityKey[],
      heldBefore: { ...me.affinities },
      tally: { ...returnPhase.pendingTake },
      submittedVersion: state!.version,
    };
    if (returnPhase.actionType === 'take3') {
      executeAction({ type: 'harness_three_affinities', affinities: returnPhase.pendingTake, returnAffinities: returnSelections });
    } else {
      executeAction({ type: 'harness_two_affinities', affinity: Object.keys(returnPhase.pendingTake)[0] as ActionRequestAffinity, returnAffinities: returnSelections });
    }
    setReturnPhase(null);
    setReturnSelections({});
  };

  const handleSurrender = () => {
    if ((state?.players.length ?? 0) !== 2) return;
    if (confirm("Surrender? This cannot be undone.")) executeAction({ type: 'surrender' });
  };

  const returnToLumiiVault = () => {
    clearSession();
    setLocation('/dashboard/archive/vault');
  };

  const withdrawFromLumiiChallenge = async () => {
    if (!isActualLumiiScenario || !roomId || lumiiWithdrawPending) return;
    const accountSession = getAccountSession();
    if (!accountSession?.token) {
      toast({ title: 'Withdrawal unavailable', description: 'Your account session is missing.', variant: 'destructive' });
      return;
    }
    setLumiiWithdrawPending(true);
    try {
      await apiWithdrawBlueprintChallenge(accountSession.token, roomId);
      setShowLumiiWithdrawConfirm(false);
      if (session?.sessionToken) {
        await queryClient.invalidateQueries({
          queryKey: getGetGameStateQueryKey(roomId, { sessionToken: session.sessionToken }),
        });
      }
    } catch (caught) {
      toast({
        title: 'The threshold did not release',
        description: caught instanceof Error ? caught.message : 'Withdrawal could not be completed.',
        variant: 'destructive',
      });
    } finally {
      setLumiiWithdrawPending(false);
    }
  };

  const challengeLumiiAgain = async () => {
    const accountSession = getAccountSession();
    if (!accountSession?.token) throw new Error('Your account session is missing.');
    const challenge = await apiStartBlueprintChallenge(accountSession.token);
    saveSession({
      roomId: challenge.roomId,
      inviteCode: challenge.inviteCode,
      playerId: challenge.playerId,
      sessionToken: challenge.sessionToken,
      playerName: accountSession.account.username,
      isHost: true,
    });
    setLocation(`/game/${challenge.roomId}`);
  };

  const enterRevealedVault = async () => {
    const accountSession = getAccountSession();
    if (!accountSession?.token) throw new Error('Your account session is missing.');
    await apiAcknowledgeBlueprintVaultReveal(accountSession.token);
    returnToLumiiVault();
  };

  // Navigate back to the main menu without forfeiting.  The server keeps the
  // game alive; the session token stays in localStorage so the home page shows
  // the "Active game — Resume" banner.  ?newgame=1 prevents the home page
  // auto-navigate that would otherwise immediately bounce a logged-in player
  // back here, giving them the choice between resuming or starting fresh.
  const handleReturnToMenu = () => setLocation('/?newgame=1');

  const handlePlanAction = async (plannedActionData: Record<string, unknown>): Promise<boolean> => {
    if (!me || !session) return false;
    if (planSubmitInFlight.current) return false;
    const gate = validatePlannedAction(plannedActionData);
    if (!gate.ok) {
      handleBlockedAction(gate);
      return false;
    }
    planSubmitInFlight.current = true;
    try {
      const restState = await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, type: 'plan_action', plannedActionData } as ActionRequest,
      });
      // If the server auto-executed the plan (race: turn switched to this player
      // just before the plan arrived), restState.lastAction.type will be the inner
      // action type (e.g. 'forge_artifact'), not 'plan_action'.  In that case push
      // the state through the same REST-fallback path as executeAction so the
      // correct Forge/reserve animation runs. Do not show a "Pending action set"
      // toast — the animation conveys what happened.
      const restStateTyped = restState;
      const returnedActionType = (restStateTyped?.lastAction as { type?: string } | null)?.type;
      const autoExecuted =
        !!restStateTyped && !!returnedActionType && returnedActionType !== 'plan_action';
      if (autoExecuted) {
        authoritativeStateIngress.accept(restStateTyped, 'rest');
      } else {
        if (restStateTyped && typeof restStateTyped.version === 'number') {
          const visiblePlanState: GameState = {
            ...restStateTyped,
            players: restStateTyped.players.map((p) =>
              p.playerId === session.playerId
                ? {
                    ...p,
                    plannedAction: plannedActionData,
                    plannedActionCancelReason: null,
                  }
                : p,
            ),
          };
          queryClient.setQueryData(
            getGetGameStateQueryKey(roomId!, { sessionToken: session.sessionToken }),
            visiblePlanState,
          );
          prevStateRef.current = visiblePlanState;
        } else {
          queryClient.setQueryData(
            getGetGameStateQueryKey(roomId!, { sessionToken: session.sessionToken }),
            (old: GameState | undefined) => {
              if (!old) return old;
              return {
                ...old,
                players: old.players.map((p) =>
                  p.playerId === session.playerId
                    ? {
                      ...p,
                      plannedAction: plannedActionData,
                      plannedActionCancelReason: null,
                    }
                    : p,
                ),
                lastAction: {
                  ...(old.lastAction ?? {}),
                  type: 'plan_action',
                  playerId: session.playerId,
                },
              };
            },
          );
        }
        toast({ title: 'Pending action set', description: getPlannedActionSummary(plannedActionData, state, me) });
        lastPlannedCancelNoticeRef.current = null;
      }
      setSelectedCard(null);
      setSelectedAffinities({});
      setAffinityHistory([]);
      setPrePromotionHistory(null);
      setActionMode('none');
      return true;
    } catch (err: unknown) {
      const description = err instanceof Error ? err.message : String(err);
      if (nonDestructiveActionFailure(description)) {
        gameAudio.playActionRejected();
        if (description === 'Artifact is no longer in The Forge') closeStaleActionSurface();
        toast({ title: 'Plan unavailable', description: description === 'Artifact is no longer in The Forge' ? 'The Forge changed before the plan reached the server.' : 'The board changed before the plan reached the server.' });
      } else {
        toast({ variant: 'destructive', title: 'Plan failed', description });
      }
      return false;
    } finally {
      planSubmitInFlight.current = false;
    }
  };

  const handleCancelPlan = async () => {
    if (!session) return;
    try {
      const restState = await submitAction.mutateAsync({
        roomId: roomId!,
        data: { sessionToken: session.sessionToken, type: 'cancel_plan' } as ActionRequest,
      });
      if (restState && typeof restState.version === 'number') {
        queryClient.setQueryData(
          getGetGameStateQueryKey(roomId!, { sessionToken: session.sessionToken }),
          restState,
        );
        prevStateRef.current = restState;
        return;
      }
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

  const victoryRequirement = Math.max(15, Number((state as { victoryRequirement?: number }).victoryRequirement ?? 15));
  const cinematicMode = new URLSearchParams(window.location.search).get('epicArrival') === '1' ? 'epic' : 'standard';
  const handleCardTap = (card: ArtifactCard, fromReserve: boolean) => {
    if (plannedCardId === card.id) {
      void handleCancelPlan();
      return;
    }
    openCardSheet(card, fromReserve);
  };
  const handleDeckTap = (tier: 1 | 2 | 3) => {
    if (plannedDeckTier === tier) {
      void handleCancelPlan();
      return;
    }
    openDeckSheet(tier);
  };

  // Forge / Plan:Forge confirmed-state color — solid affinity color of the card being acted on.
  const _forgeCardMeta = selectedCard
    ? (AFFINITY_META[(selectedCard.card.bonusAffinity ?? 'radiance') as AffinityKey] ?? AFFINITY_META.radiance)
    : null;
  const forgeConfirmHex   = _forgeCardMeta?.hex    ?? '#6366f1';
  const forgeConfirmGlow  = _forgeCardMeta?.glowHex ?? '#818cf8';
  const forgeDarkText = _forgeCardMeta
    ? (['radiance', 'verdance', 'singularity'] as string[]).includes(_forgeCardMeta.key)
    : false;
  const safePlayers = (state.players ?? []) as GamePlayerState[];
  const safeLuminaries = (state.luminaries ?? []) as Luminary[];
  const plainBurstRect = (rect: DOMRect) => ({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
  const getPendingLuminaryEminenceBurstMs = () => {
    const count = pendingLuminaryEminenceBurstsRef.current.length;
    if (count <= 0) return 0;
    const stagger = abridgedAnims ? 220 : 520;
    const duration = abridgedAnims ? 980 : 2200;
    return (count - 1) * stagger + duration;
  };
  const queueLuminaryEminenceBurst = (entry: (typeof arrivalQueue)[number]) => {
    if ((entry.eminence ?? 0) <= 0) {
      logArrivalDebug('eminence-burst.queue-skipped', {
        eventId: entry.eventId,
        luminaryId: entry.id,
        reason: 'non-positive-eminence',
        eminence: entry.eminence,
      });
      return;
    }
    const claimedByPlayerId = entry.claimedByPlayerId ?? (entry.isDevTest ? (me?.playerId ?? session.playerId) : undefined);
    if (!claimedByPlayerId) {
      logArrivalDebug('eminence-burst.queue-skipped', {
        eventId: entry.eventId,
        luminaryId: entry.id,
        reason: 'missing-claimant',
      });
      return;
    }
    if (pendingLuminaryEminenceBurstsRef.current.some(burst => burst.eventId === entry.eventId)) {
      logArrivalDebug('eminence-burst.queue-skipped', {
        eventId: entry.eventId,
        luminaryId: entry.id,
        reason: 'duplicate-pending',
      });
      return;
    }
    const player = safePlayers.find(p => p.playerId === claimedByPlayerId);
    const luminary = safeLuminaries.find(l => l.id === entry.id);
    const visuals = getLuminaryVisuals(entry.id);
    logArrivalDebug('eminence-burst.queued', {
      eventId: entry.eventId,
      luminaryId: entry.id,
      playerId: claimedByPlayerId,
      playerName: player?.playerName ?? entry.claimedBy,
      amount: entry.eminence,
      pendingCountBefore: pendingLuminaryEminenceBurstsRef.current.length,
    });
    pendingLuminaryEminenceBurstsRef.current.push({
      eventId: entry.eventId,
      luminaryId: entry.id,
      luminaryName: entry.name,
      playerId: claimedByPlayerId,
      playerName: player?.playerName ?? entry.claimedBy ?? 'A player',
      amount: entry.eminence,
      eminenceAfter: player?.eminence ?? 0,
      color: luminary?.summonColor ?? visuals.primaryColor,
      secondaryColor: luminary?.summonSecondaryColor ?? visuals.secondaryColor,
    });
  };
  const flushPendingLuminaryEminenceBursts = () => {
    const bursts = [...pendingLuminaryEminenceBurstsRef.current];
    pendingLuminaryEminenceBurstsRef.current = [];
    if (bursts.length === 0) {
      logArrivalDebug('eminence-burst.flush-empty');
      return 0;
    }
    const stagger = abridgedAnims ? 220 : 520;
    const duration = abridgedAnims ? 980 : 2200;
    const impactDelay = abridgedAnims ? 430 : 1450;
    const totalMs = (bursts.length - 1) * stagger + duration;
    setAnimEndTime(totalMs);

    bursts.forEach((burst, index) => {
      const startTimer = setTimeout(() => {
        luminaryEminenceBurstTimersRef.current =
          luminaryEminenceBurstTimersRef.current.filter(timer => timer !== startTimer);
        const originHit = getVisibleElementRect(`[data-luminary-id="${burst.luminaryId}"]`);
        const isLocalClaim = burst.playerId === session.playerId;
        const targetHit = isLocalClaim
          ? getVisibleElementRect('[data-eminence-panel="player"]')
          : getVisibleElementRect(`[data-opponent-chip="${burst.playerId}"]`);
        logArrivalDebug('eminence-burst.start', {
          eventId: burst.eventId,
          luminaryId: burst.luminaryId,
          playerId: burst.playerId,
          amount: burst.amount,
          isLocalClaim,
          hasOrigin: !!originHit?.rect,
          hasTarget: !!targetHit?.rect,
        });
        luminaryEminenceBurstKeyRef.current += 1;
        setLuminaryEminenceBurst({
          key: luminaryEminenceBurstKeyRef.current,
          eventId: burst.eventId,
          luminaryId: burst.luminaryId,
          luminaryName: burst.luminaryName,
          playerId: burst.playerId,
          playerName: burst.playerName,
          amount: burst.amount,
          eminenceAfter: burst.eminenceAfter,
          color: burst.color,
          secondaryColor: burst.secondaryColor,
          originRect: originHit?.rect ? plainBurstRect(originHit.rect) : null,
          targetRect: targetHit?.rect ? plainBurstRect(targetHit.rect) : null,
        });
        gameAudio.playEminenceSeal(burst.amount, burst.eminenceAfter, victoryRequirement);
        const impactTimer = setTimeout(() => {
          luminaryEminenceBurstTimersRef.current =
            luminaryEminenceBurstTimersRef.current.filter(timer => timer !== impactTimer);
          if (isLocalClaim) {
            triggerEminencePanelImpact(burst.amount);
          } else {
            triggerOpponentEminenceImpact(burst.playerId, burst.amount);
          }
        }, impactDelay);
        luminaryEminenceBurstTimersRef.current.push(impactTimer);
      }, index * stagger);
      luminaryEminenceBurstTimersRef.current.push(startTimer);
    });

    return totalMs;
  };
  const resetDevLuminaryPresentation = () => {
    luminaryPresentationEngine.resetDevSequenceRun();
    handledArrivalEventIdsRef.current.clear();
    handledActivationEventIdsRef.current = new Set();
    deferredBrandStrikesRef.current = [];
    deferredActivationEventsRef.current = [];
    summonActivationLocksRef.current = new Set();
    pendingDirectorBurnSlotsRef.current = [];
    directorGhostSlotKeysRef.current = [];
    pendingIronHarbingerSlotsRef.current = [];
    ironHarbingerGhostSlotKeysRef.current = [];
    pendingPhoenixRefillSlotsRef.current = [];
    pendingBlueprintMoldCastsRef.current.clear();
    pendingAssimilationSlotRef.current = null;
    pendingSuppressArrivalIdsRef.current = new Set();
    arrivalVisualHoldIdsRef.current = new Set();
    returningLuminaryIdsRef.current = new Set();
    pendingReturnLuminaryIdsRef.current = [];
    resolvedArrivalEventIdsRef.current = new Set();
    pendingArrivalServerResolutionsRef.current = [];
    pendingActivationServerResolutionsRef.current = new Set();
    activationQueueWasPopulatedRef.current = false;
    setActivationQueue([]);
    setLuminaryEffectReceipts([]);
    setArrivalQueue([]);
    setArrivalVisualHoldIds([]);
    setReturningLuminaryIds([]);
    setClaimedThisSession([]);
    setBurstGhostCards({});
    setIronHarbingerGhostIds({});
    setHiddenSlots(new Set());
    setRefillingSlots(new Map());
    moldCastTimersRef.current.forEach(timer => clearTimeout(timer));
    moldCastTimersRef.current.clear();
    setArchiveManifestationTraces([]);
    setSuppressedMarkerIds(new Set());
    setRevealedBrandKeys(new Set());
    setBrandStrikes([]);
    setDelayedEffectFloatQueue([]);
    setActiveDelayedEffectFloat(null);
    setShowSeedBoardEffect(false);
  };

  const prepareDevLuminarySequence = (playbackMode: DevSequencePlaybackMode) => {
    // A repeated baseline can reintroduce events the browser has already
    // presented. Reset all local deduplication, acknowledgement, and ghost
    // state before the dev endpoint broadcasts the fresh sequence.
    resetDevLuminaryPresentation();
    setDevSequencePlaybackMode(playbackMode);
    setActiveTab('board');
    setSelectedCard(null);
    setSelectedDeckTier(null);
    setSelectedLuminary(null);
    setShowRules(false);
    setShowReservedOverlay(false);
    setShowForgedOverlay(false);
    setShowBurnPileOverlay(false);
    setShowEminenceBreakdown(false);
  };


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

  const myReservedCount = me?.reservedArtifacts.length ?? 0;

  // ---- TABS ----

  const boardTabMainScope = {
    armedLumIds,
    arrivalQueue,
    arrivalVisualHoldIds,
    brandDelayMap,
    burnChipAnim,
    burnChipArrivalAnim,
    burstGhostCards,
    ironHarbingerGhostIds,
    canPlan,
    cardDetailDiscovered,
    claimedThisSession,
    computeCosts,
    costMode,
    flashLumId,
    flippingCards,
    getCardFocusProps,
    ghostArtifactMarkerTypesRef,
    handleCancelPlan,
    handleCardTap,
    handleDeckTap,
    hiddenSlots,
    isCameraControlled,
    luminaryPresentationActive,
    isLandscapeCockpit,
    isMyTurn,
    isTutorial,
    forgeCompact: effectiveForgeCompact,
    me,
    myPlannedAction,
    newlyMarkedCardIds,
    pendingSuppressArrivalIdsRef,
    plannedCardId,
    plannedCardLabel,
    plannedDeckTier,
    refillingSlots,
    safeLuminaries,
    safePlayers,
    selectedCard,
    setCostMode,
    setForgeCompact,
    setSelectedLuminary,
    setShowBurnPileOverlay,
    setTracedSourceLumId,
    state,
    strikeAuraMap,
    suppressedBrandTypesByCardId,
    suppressedMarkerIds,
    tutorialAttention,
    tutorialStep,
    tutorialZone,
    viewOrchestrator,
  };

  const BoardTabOpponents = () => {
    const opponents = state.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.playerId !== session?.playerId);
    if (opponents.length === 0) return null;

    const currentOpponent = opponents.find(({ index }) =>
      state.status === 'playing' && state.currentPlayerIndex === index
    )?.player;

    return (
      <section
        className="board-opponents board-module board-module--opponents"
        data-board-opponents-expanded={boardOpponentsExpanded}
      >
        <button
          type="button"
          className="board-opponents-toggle"
          data-testid="board-opponents-toggle"
          aria-expanded={boardOpponentsExpanded}
          onClick={() => setBoardOpponentsExpanded((expanded) => !expanded)}
        >
          <span className="board-opponents-toggle__title">Opponents</span>
          <span className="board-opponents-toggle__summary">
            <span className="board-opponents-toggle__avatars" aria-hidden="true">
              {opponents.map(({ player, index }) => {
                const isCurrent = state.status === 'playing' && state.currentPlayerIndex === index;
                return (
                  <span
                    key={player.playerId}
                    className={`board-opponents-toggle__avatar ${isCurrent ? 'board-opponents-toggle__avatar--active' : ''}`}
                  >
                    <PlayerAvatar avatarId={player.avatarId ?? null} name={player.playerName} size={18} />
                  </span>
                );
              })}
            </span>
            <span className="board-opponents-toggle__status">
              {currentOpponent
                ? `${currentOpponent.playerName}'s turn`
                : `${opponents.length} opponent${opponents.length === 1 ? '' : 's'}`}
            </span>
          </span>
          <ChevronDown className="board-opponents-toggle__chevron" aria-hidden="true" />
        </button>

        <AnimatePresence initial={false}>
          {boardOpponentsExpanded && (
            <motion.div
              key="board-opponents-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="board-opponents-body overflow-hidden"
            >
              <div className="flex flex-col gap-2">
            {opponents.map(({ player: p, index: i }) => {
              const isCurrent = state.status === 'playing' && state.currentPlayerIndex === i;
              const oppD = opponentData[p.playerId];
              const totalAffinity = oppD?.totalAffinity ?? 0;
              const cardCount = oppD?.cardCount ?? 0;
              const reservedCount = oppD?.reservedCount ?? 0;
              const isExpanded = boardExpandedOpponentId === p.playerId;
              const oppCivPalette = oppD?.civPalette ?? getDominantAffinityPalette(p.forgedArtifacts);
              const oppCivName = oppD?.civName ?? p.civName ?? p.playerName;
              const toggleExpanded = () => {
                setBoardExpandedOpponentId((current) => current === p.playerId ? null : p.playerId);
              };
              return (
                <div
                  key={p.playerId}
                  className={`opponent-card-shell ${isExpanded ? 'opponent-card-shell--details-open' : ''} rounded-2xl border p-3 bg-card/85 transition-[border-color,box-shadow] ${isCurrent ? 'border-primary/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-border/40'}`}
                >
                  {/* One-row summary keeps identity and opponent counters visible together. */}
                  <div className="opponent-card-header">
                    <div className="opponent-card-identity">
                      <PlayerAvatar avatarId={p.avatarId ?? null} name={p.playerName} size={22} />
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                      <span className="opponent-card-identity__copy">
                        <span className="text-xs font-semibold truncate">{p.playerName}</span>
                        <span className="opponent-card-identity__civ truncate" style={{ color: oppCivPalette.primary, opacity: 0.8 }}>{oppCivName}</span>
                      </span>
                      {isCurrent && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">their turn</span>}
                    </div>
                    <div className="opponent-card-metrics">
                      <OpponentStatStrip
                        totalAffinity={totalAffinity}
                        cardCount={cardCount}
                        reservedCount={reservedCount}
                        sigilId={9500 + i}
                      />
                      <span className="opponent-card-eminence" title={`${p.eminence} Eminence`}>
                        <span>{p.eminence}</span>
                        <EminenceDiamond size={12} />
                      </span>
                      <button
                        type="button"
                        data-opponent-detail-toggle={p.playerId}
                        aria-expanded={isExpanded}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded();
                        }}
                        className={`opponent-card-details ${isExpanded ? 'opponent-card-details--open' : ''}`}
                        aria-label={`${isExpanded ? 'Hide' : 'Show'} ${p.playerName} affinity details`}
                        title={`${isExpanded ? 'Hide' : 'Show'} affinity details`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
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
                          <div className="opponent-affinity-grid grid grid-cols-6 gap-1.5">
                            {AFFINITIES.map((c) => {
                              const n = p.affinities[c as keyof AffinityCounts] ?? 0;
                              const bonus = p.bonuses[c as keyof AffinityCounts] ?? 0;
                              const lumBonus = state.luminaryAffinities
                                .filter((la: LuminaryActiveState) =>
                                  la.ownerId === p.playerId &&
                                  state.turnCount > la.summonedAtTurnCount &&
                                  la.activeAffinity === c
                                ).length;
                              const meta = AFFINITY_META[c as AffinityKey];
                              const isSingularity = c === 'singularity';
                              const hasContent = isSingularity ? (n > 0 || reservedCount > 0) : (n > 0 || bonus > 0 || lumBonus > 0);
                              return (
                                <div
                                  key={c}
                                  className="opponent-affinity-cell"
                                  data-has-content={hasContent}
                                  data-affinity={c}
                                  style={{
                                    '--opponent-affinity-color': meta.hex,
                                    '--opponent-affinity-glow': meta.glowHex,
                                  } as React.CSSProperties}
                                >
                                  {/* The shared Affinity symbol carries identity at phone widths. */}
                                  <div
                                    className="opponent-affinity-cell__header"
                                    title={meta.name}
                                    aria-label={meta.name}
                                  >
                                    <AffinityToken color={c as AffinityKey} size={14} />
                                  </div>
                                  <div className="opponent-affinity-cell__count-row">
                                    <span className="opponent-affinity-cell__count">
                                      {n}
                                    </span>
                                    {!isSingularity && (bonus + lumBonus > 0) && (
                                      <span className="opponent-affinity-cell__permanent">
                                        +{bonus + lumBonus}
                                      </span>
                                    )}
                                  </div>
                                  {!isSingularity && (bonus > 0 || lumBonus > 0) && (
                                    <div className="opponent-affinity-cell__modifiers">
                                      {lumBonus > 0 && (
                                        <span className="opponent-affinity-cell__luminary">+{lumBonus}✦</span>
                                      )}
                                    </div>
                                  )}
                                  {isSingularity && reservedCount > 0 && (
                                    <span className="opponent-affinity-cell__encrypted">{reservedCount} encrypted</span>
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
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  };

  const handleSendChat = (event?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    sendChatMessage(text);
  };

  const handTabScope = {
    activationGateActive,
    activationQueue,
    brandDelayMap,
    cardDetailDiscovered,
    civEditValue,
    civLabel,
    civilizationProfile,
    computeCosts,
    costMode,
    expandedLumEffects,
    forgedView,
    handleCancelPlan,
    handleCardTap,
    executeBlueprintAction: (payload: { type: 'recover_foundry_component'; cardId: string }) => {
      void executeAction(payload);
    },
    isEditingCivName,
    isMyTurn,
    isMyTurnForCoreAction,
    kardashevPalette,
    kardashevProgressFraction,
    kardashevTier,
    loreCatalog,
    me,
    myReservedCount,
    newlyMarkedCardIds,
    openForgedCardSheet,
    pendingGameOver,
    plannedCardId,
    plannedCardLabel,
    safePlayers,
    selectedCard,
    session,
    setCivEditValue,
    setCivLabel,
    setExpandedLumEffects,
    setForgedView,
    setIsEditingCivName,
    setShowActiveLuminaries,
    setShowForgedArtifacts,
    setTracedSourceLumId,
    showActiveLuminaries,
    showCinematic,
    showForgedArtifacts,
    showWinOverlay,
    state,
    strikeAuraMap,
    suppressedMarkerIds,
    victoryRequirement,
  } satisfies HandTabScope;

  const logTabScope = {
    chatEndRef,
    chatInput,
    chatMessages,
    expandedOpponents,
    handleSendChat,
    openForgedCardSheet,
    opponentData,
    session,
    setChatInput,
    setExpandedOpponents,
    setShowAllLog,
    showAllLog,
    state,
  } satisfies LogTabScope;

  const isSideAffinityWell = activeTab === 'board' && isSideAffinityWellLayout;

  const affinityWellPanelScope = {
    canPlan,
    cancelReturnPhase,
    confirmAffinities,
    confirmReturnPhase,
    coreActionSubmitted,
    affinityQueueActive,
    dismissUndoHint,
    eminencePanelImpact,
    flashSent,
    forgeDeductions,
    handleAffinityClick,
    handlePlanAction,
    handleUndoAffinity,
    harnessPulseKey,
    harnessBlockedKeys,
    harnessBurstKeys,
    isActivePlayer,
    isMyTurn,
    isMyTurnForCoreAction,
    isSideAffinityWell,
    isTutorial,
    me,
    playerPanelRef,
    promoteToTake2,
    harnessLegality,
    returnPhase,
    returnSelections,
    selectedAffinities,
    sentFlashBtn,
    session,
    setActionMode,
    setAffinityHistory,
    setForgedFilter,
    setHarnessPulseKey,
    setPrePromotionHistory,
    setReturnSelections,
    setSelectedAffinities,
    setShowEminenceBreakdown,
    setShowForgedOverlay,
    setShowReservedOverlay,
    showForgeHint,
    showReserveHint,
    showUndoHint,
    singularityAbsorbKey,
    state,
    tutorialAttention,
    tutorialStep,
    tutorialZone,
    victoryRequirement,
  };
  const boardPresentation =
    new URLSearchParams(window.location.search).get('marketPreview') === '1'
      ? 'reliquary'
      : 'celestial';
  const lumiiHudSuppressed =
    state.status !== 'playing' ||
    luminaryPresentationActive ||
    blueprintPresentationActive ||
    !!cardActionBurst ||
    !!cipherBurst ||
    !!affinityBurst ||
    refillingSlots.size > 0 ||
    archiveManifestationTraces.length > 0 ||
    brandStrikes.length > 0 ||
    showSeedBoardEffect ||
    turnOrderIntroActive ||
    !!turnAnnouncement ||
    luminaryChoiceActive ||
    isAnyOverlayOpen ||
    showLumiiWithdrawConfirm ||
    showEminenceBreakdown ||
    showRules ||
    !!returnPhase ||
    pendingGameOver;
  const renderGameOptionsMenu = () => (
    <DropdownMenu open={headerMenuOpen} onOpenChange={setHeaderMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-muted-foreground"
          aria-label="More game options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!lumiiForecastActive && (
          <>
            <div className="flex w-full items-center justify-between gap-4 px-2 py-1.5 text-xs text-muted-foreground font-mono">
              <button
                className="flex min-w-0 items-center gap-2 hover:text-foreground transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(session.inviteCode).then(() =>
                    toast({ title: 'Game code copied', description: `Share code: ${session.inviteCode}` })
                  );
                }}
                title="Tap to copy game code"
              >
                <Package className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{session.inviteCode}</span>
              </button>
              <span
                className="flex shrink-0 items-center gap-1"
                title={`Round ${state.roundNumber}`}
                aria-label={`Round ${state.roundNumber}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                R{state.roundNumber}
              </span>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => { setHeaderMenuOpen(false); setTimeout(() => setShowRules(true), 0); }}>
          <HelpCircle className="h-4 w-4" />
          Rules
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleMute}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? 'Unmute' : 'Mute'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleAbridgedAnims} aria-pressed={abridgedAnims}>
          <Zap className={`h-4 w-4 ${abridgedAnims ? 'text-yellow-400' : 'text-muted-foreground opacity-50'}`} />
          Reduced motion
        </DropdownMenuItem>
        {lumiiPresentationLocked ? (
          lumiiForecastActive ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <Lock className="h-4 w-4 text-rose-300" />
              Defense Forecast presentation locked
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Gauge className="h-4 w-4 text-muted-foreground opacity-60" />
              Effects: Standard
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Sparkles className="h-4 w-4 text-yellow-400" />
              Cinematics required
            </DropdownMenuItem>
          </>
          )
        ) : (
          <>
            <DropdownMenuItem onClick={toggleLuminaryPlaybackMode}>
              <Gauge className={`h-4 w-4 ${luminaryPlaybackMode === 'swift' ? 'text-cyan-300' : 'text-muted-foreground'}`} />
              Effects: {luminaryPlaybackMode === 'swift' ? 'Swift' : 'Standard'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleSkipCinematics}>
              <Sparkles className={`h-4 w-4 ${skipCinematics ? 'text-muted-foreground opacity-50' : 'text-yellow-400'}`} />
              {skipCinematics ? 'Cinematics off' : 'Cinematics on'}
            </DropdownMenuItem>
          </>
        )}
        {!lumiiForecastActive && (
          <DropdownMenuItem onClick={toggleHints}>
            <Lightbulb className={`h-4 w-4 ${hintsEnabled ? 'text-yellow-400' : 'text-muted-foreground opacity-50'}`} />
            {hintsEnabled ? 'Hints on' : 'Hints off'}
          </DropdownMenuItem>
        )}
        {import.meta.env.DEV && !lumiiForecastActive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setHeaderMenuOpen(false);
                setTimeout(() => setShowDevSequenceLab(true), 0);
              }}
            >
              <FlaskConical className="h-4 w-4 text-amber-300" />
              Luminary Sequence Lab
            </DropdownMenuItem>
            <DevBuildIdentity />
          </>
        )}
        {!lumiiForecastActive && (
          <DropdownMenuItem onClick={() => { setHeaderMenuOpen(false); setTimeout(handleReturnToMenu, 0); }}>
            <DoorOpen className="h-4 w-4" />
            Return to Menu
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          Refresh page
        </DropdownMenuItem>
        {(state?.players.length ?? 0) === 2 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setHeaderMenuOpen(false); setTimeout(handleSurrender, 0); }} className="text-red-500 focus:text-red-500">
              <Flag className="h-4 w-4" />
              Surrender
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className="game-shell h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden relative"
      data-camera-controlled={isCameraControlled ? 'true' : undefined}
      data-luminary-idle-suspended={luminaryPresentationActive ? 'true' : undefined}
      data-avatar-seed-placement-pending={
        showSeedBoardEffect ||
        activationQueue.some((event) => event.luminaryId === 'lum_seed' && event.effectType === 'summon') ||
        state?.pendingLuminaryActivationEvents?.some(
          (event) => event.luminaryId === 'lum_seed' && event.effectType === 'summon',
        )
          ? 'true'
          : undefined
      }
      data-board-presentation={activeTab === 'board' ? boardPresentation : undefined}
      data-board-layout={activeTab === 'board' ? boardLayoutMode : 'base'}
      data-board-density={activeTab === 'board' ? boardDensityMode : 'stacked'}
      data-board-viewport={boardViewportClass}
      data-side-affinity-well={isSideAffinityWell ? 'true' : undefined}
      data-forge-density={activeTab === 'board' ? (effectiveForgeCompact ? 'compact' : 'full') : undefined}
      data-lumii-forecast-active={lumiiForecastActive ? 'true' : undefined}
    >
      {/* ── Cosmic background layers ──────────────────────────────────────── */}
      {/* Star-field photo: opacity pulses slowly so stars appear to breathe   */}
      <div
        className="game-cosmic-background absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundCosmos})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'cosmic-breathe 12s ease-in-out infinite',
        }}
      />

      {devLumiiEncounter && state.status === 'playing' && (
        <div className="fixed bottom-3 right-3 z-[87] flex gap-1 rounded-md border border-white/15 bg-black/80 p-1">
          <button
            type="button"
            className="rounded-sm px-2 py-1 text-[10px] text-white/80 hover:bg-white/10"
            onClick={() => setDevLumiiCommentary(current => current ? null : 'You are nearing the threshold. You may still withdraw.')}
          >
            Commentary
          </button>
        </div>
      )}

      <BaseDialog
        open={showLumiiWithdrawConfirm}
        onClose={() => !lumiiWithdrawPending && setShowLumiiWithdrawConfirm(false)}
        title="Withdraw to Vault?"
      >
        <div className="space-y-4 text-sm text-white/75">
          <p>The Vault will reseal. Your clearance remains {BLUEPRINT_CLEARANCE_REQUIRED_WINS} / {BLUEPRINT_CLEARANCE_REQUIRED_WINS} and the Broken Covenant will be remembered, but this room will not count as a game, win, or loss.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setShowLumiiWithdrawConfirm(false)} disabled={lumiiWithdrawPending}>
              Continue challenge
            </Button>
            <Button variant="destructive" onClick={() => void withdrawFromLumiiChallenge()} disabled={lumiiWithdrawPending}>
              {lumiiWithdrawPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DoorOpen className="mr-2 h-4 w-4" />}
              Withdraw
            </Button>
          </div>
        </div>
      </BaseDialog>
      {/* Darkening veil — lighter than before so stars show through           */}
      <div className="absolute inset-0 bg-background/68 pointer-events-none" />
      {/* Nebula corner glows — affinity-palette tints, barely perceptible     */}
      <div
        className="game-cosmic-nebula absolute inset-0 pointer-events-none"
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

      {lumiiForecastActive && (
        <LumiiEncounterHud
          state={state}
          localPlayerId={session.playerId}
          suppressed={lumiiHudSuppressed}
          withdrawPending={lumiiWithdrawPending}
          previewMessage={devLumiiCommentary}
          absorbPulseKey={lumiiHudAbsorbPulse?.key ?? null}
          onWithdraw={isActualLumiiScenario ? () => setShowLumiiWithdrawConfirm(true) : undefined}
          menuAction={renderGameOptionsMenu()}
          placement="docked"
        />
      )}

      {!lumiiForecastActive && (
        <header className="game-header relative shrink-0 min-h-14 px-4 pt-[env(safe-area-inset-top)] flex items-center bg-card/95 border-b border-border z-20">
          <span
            className="pointer-events-none absolute left-4 font-serif text-base font-bold leading-none text-[#c5caff]"
            style={{ textShadow: '0 0 16px rgba(151, 161, 255, 0.42)' }}
          >
            LUMINAe
          </span>
          {/* Balancing spacer — same width as the menu button so chips stay centred */}
          <div className="game-header-balance w-8 shrink-0" />

          {/* Opponent chips — centred in the remaining space */}
          <div className="game-header-opponents flex-1 flex items-center justify-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
            {state.players
              .filter(p => p.playerId !== session.playerId)
              .map(opponent => {
                const heldAffinityTotals: Partial<Record<AffinityKey, number>> = {};
                const artifactTotals: Partial<Record<AffinityKey, number>> = {};
                for (const k of AFFINITIES) {
                  if (k === 'singularity') continue;
                  const raw = opponent.affinities[k as keyof AffinityCounts] ?? 0;
                  const cardBonus = opponent.forgedArtifacts.filter(c => c.bonusAffinity === k).length;
                  heldAffinityTotals[k] = raw;
                  artifactTotals[k] = cardBonus;
                }
                const isHeaderExpanded = expandedHeaderOpponents.has(opponent.playerId);
                const toggleHeaderDetails = () => {
                  setExpandedHeaderOpponents(prev => {
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
                    affinityTotals={heldAffinityTotals}
                    artifactTotals={artifactTotals}
                    isExpanded={isHeaderExpanded}
                    onToggle={toggleHeaderDetails}
                    eminenceImpact={opponentEminenceImpact?.playerId === opponent.playerId ? opponentEminenceImpact : null}
                  />
                );
              })}
            <TurnCountdown deadline={state.turnDeadline ?? null} active={isMyTurn} />
          </div>
          {renderGameOptionsMenu()}
        </header>
      )}

      {/* ── Tab Content ── */}
      <main
        data-game-board="true"
        data-testid="game-board"
        data-active-tab={activeTab}
        data-board-presentation={activeTab === 'board' ? boardPresentation : undefined}
        data-board-layout={activeTab === 'board' ? boardLayoutMode : 'base'}
        data-board-density={activeTab === 'board' ? boardDensityMode : 'stacked'}
        data-board-viewport={boardViewportClass}
        data-forge-density={activeTab === 'board' ? (effectiveForgeCompact ? 'compact' : 'full') : undefined}
        data-camera-controlled={isCameraControlled ? 'true' : undefined}
        data-terminus-rows={activeTab === 'board' ? terminusDockRows : undefined}
        ref={mainScrollRef as React.RefObject<HTMLDivElement>}
        tabIndex={-1}
        className="game-main flex-1 overflow-y-auto overflow-x-hidden z-10 outline-none relative"
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
            <BoardTabMain scope={boardTabMainScope} />
            {BoardTabOpponents()}
          </>
        )}
        {activeTab === 'hand' && <HandTab scope={handTabScope} />}
        {activeTab === 'log' && <LogTab scope={logTabScope} />}
      </main>

      {/* ══════════════════════════════════════════════════════════════
          THE AFFINITY WELL — pinned player panel
          Shows the player's holdings + the shared bank availability.
          Tapping an Affinity cell on your turn selects it for the Harness action.
          ══════════════════════════════════════════════════════════════ */}
      <AffinityWellPanel scope={affinityWellPanelScope} />

      {activeTab === 'board' && boardLayoutMode !== 'base' && me && (
        <BoardAuxModules
          placement={boardLayoutMode === 'left-civ' ? 'left' : 'rail'}
          playerEminence={me.eminence}
          civilizationModel={civilizationModel}
          progressFraction={kardashevProgressFraction}
        />
      )}

      {/* ── Bottom Navigation ── */}
      <nav className="game-bottom-nav shrink-0 grid grid-cols-3 border-t border-border bg-card z-20 pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        {([
          { tab: 'board' as ActiveTab, label: 'Board', shortLabel: 'Board', icon: LayoutGrid },
          { tab: 'hand' as ActiveTab, label: 'Civilization', shortLabel: 'Civ', icon: Landmark },
          { tab: 'log' as ActiveTab, label: 'Log', shortLabel: 'Log', icon: List, badge: unreadChat > 0 ? unreadChat : undefined },
        ] as const).map(({ tab, label, shortLabel, icon: Icon, badge }: { tab: ActiveTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }>; badge?: number }) => {
          const disabledForBoss = lumiiForecastActive && tab !== 'board';
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                if (!disabledForBoss) setActiveTab(tab);
              }}
              disabled={disabledForBoss}
              aria-label={disabledForBoss ? `${label} unavailable during Defense Forecast` : label}
              aria-current={activeTab === tab ? 'page' : undefined}
              aria-disabled={disabledForBoss ? 'true' : undefined}
              data-active={activeTab === tab ? 'true' : undefined}
              data-disabled={disabledForBoss ? 'true' : undefined}
              title={disabledForBoss ? 'Defense Forecast locks the battle to the board' : label}
              {...(tab === 'hand' ? { 'data-nav-hand': '' } : tab === 'log' ? { 'data-nav-log': '' } : {})}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                disabledForBoss
                  ? 'text-muted-foreground/35 cursor-not-allowed'
                  : activeTab === tab
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge !== undefined && (
                  <span className="absolute -top-1 -right-1.5 h-4 w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <span className="game-bottom-nav-label text-[10px] font-semibold" aria-hidden="true">
                <span className="game-bottom-nav-label-full">{label}</span>
                <span className="game-bottom-nav-label-short">{shortLabel}</span>
              </span>
              {activeTab === tab && !disabledForBoss && (
                <div className="absolute -top-2 inset-x-4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Card Action Sheet ── */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            data-cinematic-obscurable="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4"
            onClick={() => { setSelectedCard(null); setPendingSheetAction(null); }}
          >
            <motion.div style={{ opacity: cardSheetBackdropOpacity }} className="absolute inset-0 bg-black/75" />
            <motion.div
              ref={(el) => { cardSheetContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label="Artifact actions"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ scale: cardSheetScale }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl px-5 pt-0 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] sm:max-w-xl sm:rounded-2xl sm:border sm:pb-5"
              {...cardSheetDragProps}
            >
              {/* Drag handle */}
              <div {...cardSheetHandleBarProps} className="flex flex-col items-center pt-3 pb-1 gap-1">
                <div className="w-10 h-1 rounded-full bg-border" />
                <SwipeHintBar peekProgress={cardSheetPeekProgress} />
              </div>
              {/* Sticky peek header — always visible even when the sheet is in the 40 % peek position.
                  Contains the Artifact name and Affinity so players can identify it at a glance
                  without needing to expand the sheet.  The close button lives here too so it remains
                  reachable when peeked.  Hidden visually when the scrollable body covers it naturally,
                  but the element is always in the DOM so focus-trap / keyboard close still works. */}
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-3">
                <AffinityToken color={selectedCard.card.bonusAffinity as AffinityKey} size={14} />
                <span className="font-semibold text-sm leading-tight flex-1 truncate">{selectedCard.card.name}</span>
                {selectedCard.readOnly && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                    Forged
                  </span>
                )}
                {selectedCard.fromArchiveTop && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-sky-950/70 text-sky-200 border border-sky-400/35">
                    Archive Top
                  </span>
                )}
                {(selectedCard.card.eminence ?? 0) > 0 && (
                  <EminenceBadge value={selectedCard.card.eminence ?? 0} compact className="shrink-0" />
                )}
                <kbd className="hidden [@media(pointer:fine)]:inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground/40 border border-border/30 bg-muted/10 leading-none select-none">Esc</kbd>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
                  aria-label="Close Artifact actions"
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
                  <button
                    type="button"
                    style={{ perspective: '600px', width: 'var(--card-w)', height: 'var(--card-h)' }}
                    className="cursor-pointer rounded-xl border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
                    onClick={() => setCardFlipped(f => !f)}
                    aria-label={cardFlipped ? 'Show Artifact art' : 'Show Artifact card back'}
                    aria-pressed={cardFlipped}
                    title={cardFlipped ? 'Show Artifact art' : 'Show Artifact card back'}
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
                  </button>
                  {/* Tier civilization label */}
                  <span className="font-serif tracking-[0.16em] uppercase text-[8px] mt-0.5" style={{ color: '#C0A472', textShadow: '0 1px 8px rgba(192,164,114,0.5)' }}>
                    Tier {selectedCard.card.tier}, {TIER_CIVILIZATION[selectedCard.card.tier]}
                  </span>
                  <span className="text-[7px] text-white/20">tap to flip</span>
                  <div className="flex w-full flex-col items-center gap-1 pt-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Cost</span>
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {AFFINITIES.map((c) => {
                        const baseCost = selectedCard.card.cost[c as keyof AffinityCounts] ?? 0;
                        if (baseCost <= 0) return null;
                        return (
                          <div key={c} className="flex items-center gap-0.5 rounded bg-black/55 px-1 py-0.5">
                            <span className="text-[10px] font-bold text-white">{baseCost}</span>
                            <AffinityToken color={c} size={10} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {/* Right: flavor → lore metadata */}
                <div className="flex-1 flex flex-col gap-2.5 justify-center">
                  {/* Forged with — cost paid snapshot, shown only for already-forged (readOnly) cards */}
                  {selectedCard.readOnly && (() => {
                    const snap = selectedCard.card.bonusesAtForge;
                    const snapKeys = snap
                      ? AFFINITIES.filter(k => k !== 'singularity' && (snap[k as keyof AffinityCounts] ?? 0) > 0)
                      : [];
                    return (
                      <div className="flex flex-col gap-1 border-t border-border/30 pt-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Forged with</span>
                        {snapKeys.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5">
                            {snapKeys.map(k => (
                              <div key={k} className="flex items-center gap-0.5 bg-black/55 rounded px-1 py-0.5">
                                <AffinityToken color={k as AffinityKey} size={10} />
                                <span className="text-[10px] font-bold text-white">×{snap![k as keyof AffinityCounts]}</span>
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
                  {/* Optional world-building metadata stays available without competing with play data. */}
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
                      <details className="group border-t border-border/30 pt-2">
                        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/75 [&::-webkit-details-marker]:hidden">
                          Artifact details
                          <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-2 flex flex-col gap-1">
                          {visible.map(({ label, value }) => (
                            <div key={label} className="flex gap-1.5 items-baseline">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 shrink-0 w-[46px]">{label}</span>
                              <span className="text-[10px] text-muted-foreground/75 leading-snug">{value}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  })()}
                </div>
              </div>

              <ArtifactBrandDetails
                types={getArtifactBrandTypes(
                  state?.artifactMarkers?.[selectedCard.card.id],
                )}
                className="mb-3"
              />

              {/* My cost breakdown: shortfall per Affinity. */}
              {costMode !== 'printed' && me && (() => {
                // Live calculation — reacts to costMode and selectedAffinities changes in real time
                const liveCosts = computeCosts(selectedCard.card, costMode) as Record<string, number> | undefined;
                if (!liveCosts) return null;
                const rows: { affinity: AffinityKey; need: number; have: number; short: number }[] = [];
                let totalShort = 0;
                for (const c of AFFINITIES) {
                  if (c === 'singularity') continue;
                  const baseCost = selectedCard.card.cost[c as keyof AffinityCounts] ?? 0;
                  if (baseCost <= 0) continue;
                  const need = liveCosts[c] ?? 0;
                  // In after_bonuses mode show token coverage; in needed_now the shortfall IS the remaining
                  const have = costMode === 'after_bonuses'
                    ? Math.min(need, me.affinities[c as keyof AffinityCounts] ?? 0)
                    : 0;
                  const short = costMode === 'after_bonuses' ? Math.max(0, need - have) : need;
                  totalShort += short;
                  rows.push({ affinity: c as AffinityKey, need, have, short });
                }
                const singularityHave = me.affinities.singularity ?? 0;
                const singularityNeeded = Math.max(0, totalShort);
                const singularityCovers = singularityNeeded <= singularityHave;
                const canAfford = canAffordCard(selectedCard.card, me);
                if (rows.length === 0) return null;
                const modeLabel = costMode === 'after_bonuses' ? 'After bonuses — tokens needed' : 'What you still need right now';
                return (
                  <div className="mb-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{modeLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      {rows.map(({ affinity, need, have, short }) => (
                        <div key={affinity} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${short === 0 ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                          <AffinityToken color={affinity} size={12} />
                          {short === 0
                            ? <span className="text-green-400">✓ {have}/{need}</span>
                            : costMode === 'after_bonuses'
                              ? <span>−{short} <span className="text-white/40 font-normal">({have}/{need})</span></span>
                              : <span>−{need}</span>
                          }
                        </div>
                      ))}
                      {balanceLabPortableSingularity && singularityNeeded > 0 && (
                        <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${singularityCovers ? 'bg-amber-900/40 text-amber-300' : 'bg-red-900/50 text-red-300'}`}>
                          <AffinityToken color="singularity" size={12} />
                          {singularityCovers
                            ? <span>{singularityNeeded} Singularity covers gap</span>
                            : <span>need {singularityNeeded}, have {singularityHave}</span>
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
                className="relative flex flex-col gap-2.5 rounded-xl overflow-visible"
                style={{ border: '1.5px solid transparent', overflow: 'visible' }}
              >

                {/* Forge-vanish lock: the instant the Artifact leaves the Forge,
                    this overlay covers the action buttons, blocks presses, and
                    plays a rejection sound until the panel auto-closes. */}
                {selectedCardVanished && (
                  <div
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-card/88 cursor-not-allowed"
                    onClick={(e) => { e.stopPropagation(); gameAudio.playActionRejected(); }}
                    role="presentation"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5" />
                      No longer available
                    </span>
                  </div>
                )}

                {selectedCard.fromReserve && selectedFocusOptions.length > 0 && (
                  <div
                    data-balance-focus-selector
                    className="rounded-lg border border-cyan-300/25 bg-cyan-300/[.06] px-3 py-2.5"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-[.16em] text-cyan-200">
                      Focus · choose one requirement
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                      This encrypted Artifact satisfies one remaining printed Affinity when Forged.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedFocusOptions.map((affinity) => {
                        const meta = AFFINITY_META[affinity];
                        const selected = selectedFocusAffinity === affinity;
                        const affordable = !!me && canAffordCard(selectedCard.card, me, affinity);
                        return (
                          <button
                            key={affinity}
                            type="button"
                            aria-pressed={selected}
                            disabled={!affordable || selectedCardVanished}
                            onClick={() => {
                              gameAudio.playAffinitySelected(affinity);
                              setPendingFocusAffinity(affinity);
                            }}
                            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-semibold transition ${
                              selected
                                ? 'border-cyan-200 bg-cyan-200/20 text-cyan-50'
                                : 'border-white/15 bg-black/20 text-muted-foreground hover:border-cyan-200/50 hover:text-foreground'
                            } disabled:cursor-not-allowed disabled:opacity-35`}
                            title={affordable ? `Use Focus on ${meta.name}` : `${meta.name} would still be unaffordable`}
                          >
                            <AffinityToken color={affinity} size={13} />
                            {meta.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Immediate actions (your active turn only) ── */}
                {!selectedCard.readOnly && isMyTurnForCoreAction &&
                  (!selectedCard.fromArchiveTop || me?.tideArchiveForgeAvailable) && (
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
                            className="absolute bottom-full mb-1.5 left-0 max-w-[calc(100vw-3rem)] whitespace-normal flex items-center gap-1 bg-black/90 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg z-10"
                            title="Dismiss hint"
                          >
                            <Gavel className="h-2.5 w-2.5 text-white/60 shrink-0" />
                            <span>Tap to spend your affinities and claim this Artifact</span>
                            <span className="text-white/40 ml-0.5">✕</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <ForgeButton
                        disabled={!me || focusSelectionRequired || !canAffordCard(selectedCard.card, me, selectedFocusAffinity) || selectedCardVanished}
                        isPending={pendingSheetAction === 'forge'}
                        isSent={sentFlashBtn === 'forge'}
                        confirmHex={forgeConfirmHex}
                        confirmGlow={forgeConfirmGlow}
                        darkText={forgeDarkText}
                        label={pendingSheetAction === 'forge' ? 'CONFIRM' : 'FORGE'}
                        subtitle={pendingSheetAction === 'forge'
                          ? focusSelectionRequired ? 'Choose Focus above' : 'Tap to forge'
                          : me && canAffordCard(selectedCard.card, me)
                            ? selectedCard.fromArchiveTop ? 'Use Observer Effect' : 'Forge Artifact'
                            : 'Cannot afford yet'}
                        onClick={() => {
                          if (pendingSheetAction === 'forge') {
                            gameAudio.playButtonConfirm(); triggerBtnAnim('forge', 'confirm');
                            handleBuy(selectedCard.card, selectedCard.fromReserve, selectedCard.fromArchiveTop, selectedFocusAffinity);
                            setSelectedCard(null); setPendingSheetAction(null);
                          } else {
                            gameAudio.playButtonSelect(); triggerBtnAnim('forge', 'select');
                            setPendingSheetAction('forge');
                          }
                        }}
                      />
                    </div>
                    {foundryProject?.state === 'active' &&
                      selectedCard.card.tier === 2 &&
                      !selectedCard.fromReserve &&
                      !selectedCard.fromArchiveTop && (
                      <div className="border-t border-amber-500/20 pt-2.5">
                        <ForgeButton
                          disabled={!me || !canAffordFoundryCard(selectedCard.card, me) || selectedCardVanished}
                          isPending={pendingSheetAction === 'foundry'}
                          label={pendingSheetAction === 'foundry'
                            ? (foundryProject.foundryUses ?? 0) >= 2 ? 'CONFIRM OVERDRIVE' : 'CONFIRM'
                            : (foundryProject.foundryUses ?? 0) >= 2 ? 'OVERDRIVE' : 'FOUNDRY FORGE'}
                          subtitle={pendingSheetAction === 'foundry'
                            ? (foundryProject.foundryUses ?? 0) >= 2
                              ? 'Forge, then collapse the host world'
                              : 'Commit Foundry use'
                            : `Printed Affinity channels -1 // ${Math.min(foundryProject.foundryUses ?? 0, 2)}/2 used`}
                          onClick={() => {
                            if (pendingSheetAction === 'foundry') {
                              gameAudio.playButtonConfirm();
                              handleFoundryForge(selectedCard.card);
                              setSelectedCard(null);
                              setPendingSheetAction(null);
                            } else {
                              gameAudio.playButtonSelect();
                              setPendingSheetAction('foundry');
                            }
                          }}
                        />
                      </div>
                    )}
                    {!selectedCard.fromReserve && !selectedCard.fromArchiveTop && (
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
                              className="absolute bottom-full mb-1.5 left-0 max-w-[calc(100vw-3rem)] whitespace-normal flex items-center gap-1 bg-black/90 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg z-10"
                              title="Dismiss hint"
                            >
                              <span className="h-2.5 w-2.5 inline-flex items-center justify-center shrink-0 opacity-60"><CipherSigil affinityHex="#e2e8f0" id={9003} /></span>
                              <span>Encrypting holds this Artifact — tap again to confirm</span>
                              <span className="text-white/40 ml-0.5">✕</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                        <EncryptButton
                          disabled={!me || forgottenHourEncryptBlocked || !canReserveMore(me) || selectedCardVanished}
                          isPending={pendingSheetAction === 'reserve'}
                          isSent={sentFlashBtn === 'reserve'}
                          sigilId={9001}
                          label={pendingSheetAction === 'reserve' ? 'CONFIRM' : 'ENCRYPT'}
                          subtitle={forgottenHourEncryptBlocked
                              ? 'Forgotten Hour active'
                              : pendingSheetAction === 'reserve'
                                ? 'Tap to encrypt'
                              : (me && canReserveMore(me) ? 'Encrypt Artifact' : 'Encrypted pile full')}
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

                    {/* ── Assimilate (Final Hunger lingering ability) ── */}
                    {assimilateAvailable && !selectedCard.fromReserve && !selectedCard.fromArchiveTop && (
                      <div>
                        {/* Separator + label so the player knows this is a different kind of action */}
                        <div className="flex items-center gap-1.5 px-0.5 mb-2.5">
                          <div className="flex-1 h-px bg-red-900/40" />
                          <span className="text-[8.5px] font-black uppercase tracking-widest text-red-400/70">Final Hunger</span>
                          <div className="flex-1 h-px bg-red-900/40" />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              key={btnAnimTarget === 'assimilate' ? `assimilate-${btnAnimKey}` : 'assimilate'}
                              className={`relative w-full${btnAnimTarget === 'assimilate' ? ` btn-${btnAnimType}-flash` : ''}`}
                            >
                              <AssimilateButton
                                disabled={selectedCardVanished}
                                isPending={pendingSheetAction === 'assimilate'}
                                isSent={sentFlashBtn === 'assimilate'}
                                bonusAffinity={selectedCard.card.bonusAffinity}
                                label={pendingSheetAction === 'assimilate' ? 'CONFIRM' : 'Assimilate'}
                                subtitle={
                                  pendingSheetAction === 'assimilate'
                                    ? `Assimilate ${selectedCard.card.name}?`
                                    : `Free · +1 ${selectedCard.card.bonusAffinity} · 0 Eminence`
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
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            Once after Final Hunger arrives, replace your Forge action. Assimilate any face-up Artifact for free and gain its permanent bonus Affinity, but no Eminence. It counts as owned only for Blueprints.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </>
                )}

                {/* ── Plan actions (any time game is active, no cutscene) ── */}
                {!selectedCard.readOnly && canPlan && !isMyTurnForCoreAction && !coreActionSubmitted &&
                  (!selectedCard.fromArchiveTop || me?.tideArchiveForgeAvailable) && (
                  <>
                    {/* Pending-action header — makes it clear this is one action for the next turn */}
                    <div className="flex items-center gap-1.5 px-0.5 mt-0.5">
                      <Clock className="h-3 w-3 text-amber-400/80 shrink-0" />
                      <span className="text-[9.5px] font-semibold uppercase tracking-widest text-amber-400/80">
                        Pending for your next turn
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
                        disabled={selectedCardVanished || focusSelectionRequired || !canAffordCard(selectedCard.card, me, selectedFocusAffinity)}
                        isPending={pendingSheetAction === 'plan_forge'}
                        isSent={sentFlashBtn === 'plan_forge'}
                        confirmHex={forgeConfirmHex}
                        confirmGlow={forgeConfirmGlow}
                        darkText={forgeDarkText}
                        isPlan
                        label={pendingSheetAction === 'plan_forge' ? 'CONFIRM' : 'FORGE'}
                        subtitle={pendingSheetAction === 'plan_forge'
                          ? focusSelectionRequired ? 'Choose Focus above' : 'Confirm pending action'
                          : 'Plan to Forge'}
                        onClick={() => {
                          if (pendingSheetAction === 'plan_forge') {
                            gameAudio.playButtonConfirm(); triggerBtnAnim('plan_forge', 'confirm');
                            handlePlanAction({
                              type: selectedCard.fromReserve ? 'forge_reserved_artifact' : 'forge_artifact',
                              cardId: selectedCard.card.id,
                              ...(selectedCard.fromReserve && selectedFocusAffinity
                                ? { affinity: selectedFocusAffinity }
                                : {}),
                              ...(selectedCard.fromArchiveTop
                                ? { luminaryId: 'lum_tide', tier: selectedCard.card.tier }
                                : {}),
                            });
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
                    {me && foundryProject?.state === 'active' &&
                      selectedCard.card.tier === 2 &&
                      !selectedCard.fromReserve &&
                      !selectedCard.fromArchiveTop &&
                      canAffordFoundryCard(selectedCard.card, me) && (
                      <ForgeButton
                        isPending={pendingSheetAction === 'plan_foundry'}
                        isPlan
                        label={pendingSheetAction === 'plan_foundry' ? 'CONFIRM' : 'FOUNDRY FORGE'}
                        subtitle={(foundryProject.foundryUses ?? 0) >= 2
                          ? 'Plan confirmed Overdrive'
                          : 'Plan Foundry use'}
                        onClick={() => {
                          if (pendingSheetAction === 'plan_foundry') {
                            gameAudio.playButtonConfirm();
                            handlePlanAction({
                              type: 'foundry_forge_artifact',
                              cardId: selectedCard.card.id,
                              confirmOverdrive: (foundryProject.foundryUses ?? 0) >= 2,
                            });
                            flashSent('plan_foundry');
                            setTimeout(() => { setSelectedCard(null); setPendingSheetAction(null); }, 750);
                          } else {
                            gameAudio.playButtonSelect();
                            setPendingSheetAction('plan_foundry');
                          }
                        }}
                      />
                    )}
                    {!selectedCard.fromReserve && !selectedCard.fromArchiveTop && (
                      <div
                        key={btnAnimTarget === 'plan_reserve' ? `plan_reserve-${btnAnimKey}` : 'plan_reserve'}
                        className={`w-full${btnAnimTarget === 'plan_reserve' ? ` btn-${btnAnimType}-flash` : ''}`}
                      >
                        <EncryptButton
                          disabled={!me || forgottenHourEncryptBlocked || !canReserveMore(me) || selectedCardVanished}
                          isPending={pendingSheetAction === 'plan_reserve'}
                          isSent={sentFlashBtn === 'plan_reserve'}
                          sigilId={9002}
                          isPlan
                          label={pendingSheetAction === 'plan_reserve' ? 'CONFIRM' : 'ENCRYPT'}
                          subtitle={forgottenHourEncryptBlocked
                              ? 'Forgotten Hour active'
                              : pendingSheetAction === 'plan_reserve'
                                ? 'Confirm pending action'
                              : (me && canReserveMore(me) ? 'Plan to Encrypt' : 'Encrypted pile full')}
                          onClick={() => {
                            if (pendingSheetAction === 'plan_reserve') {
                              gameAudio.playButtonConfirm(); triggerBtnAnim('plan_reserve', 'confirm');
                              handlePlanAction({ type: 'reserve_artifact', cardId: selectedCard.card.id, tier: selectedCard.card.tier });
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
                    </div>{/* end border-l pending-action wrapper */}
                    <p className="text-[10px] text-muted-foreground text-center">
                      {myPlannedAction ? 'Selecting a new plan replaces the current pending action' : 'One pending action commits after your turn is announced'}
                    </p>
                  </>
                )}

                {/* ── Neither available — visual queue / cutscene blocking ── */}
                {!selectedCard.readOnly && visualTimelineLocked && !canPlan && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Resolving board state…
                  </p>
                )}
                {!selectedCard.readOnly && !visualTimelineLocked && !isMyTurn && !canPlan && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    Waiting for Luminary arrival…
                  </p>
                )}

                <Button variant="ghost" className="min-h-11 w-full text-muted-foreground focus-visible:ring-2 focus-visible:ring-amber-300/80" onClick={() => { setSelectedCard(null); setPendingSheetAction(null); }}>
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
            data-cinematic-obscurable="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4"
            onClick={() => setSelectedLuminary(null)}
          >
            <motion.div style={{ opacity: luminarySheetBackdropOpacity }} className="absolute inset-0 bg-black/75" />
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
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl px-5 pt-0 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] sm:max-w-xl sm:rounded-2xl sm:border sm:pb-5"
              {...luminarySheetDragProps}
            >
              {/* Drag handle */}
              <div {...luminarySheetHandleBarProps} className="flex flex-col items-center pt-3 pb-1 gap-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              {/* Header row: name + close */}
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-3">
                <span className="font-semibold text-sm leading-tight flex-1 truncate">{selectedLuminary.name}</span>
                {(balanceLabLuminaryEminence ?? selectedLuminary.eminence ?? 0) > 0 && (
                  <EminenceBadge
                    value={balanceLabLuminaryEminence ?? selectedLuminary.eminence ?? 0}
                    compact
                    className="shrink-0"
                    title={getLuminaryEminenceTitle(
                      balanceLabLuminaryEminence ?? selectedLuminary.eminence ?? 0,
                    )}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
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
                <div className="flex gap-4 mb-5">
                  {/* Panel art column */}
                  <div className="flex w-[92px] shrink-0 flex-col items-center gap-1.5">
                    <div className="h-[132px] w-[92px] overflow-hidden rounded-lg border border-white/15 shadow-xl">
                      <LuminaryPanelArt luminaryId={selectedLuminary.id} width={92} height={132} claimed={false} runtime />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/40">{selectedLuminary.domain ?? 'Luminary'}</span>
                    {(() => {
                      const claimer = safePlayers.find(p => (p.claimedLuminaryIds ?? []).includes(selectedLuminary.id));
                      return claimer ? (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                          Alliance with {claimer.playerName}
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
                          selectedLuminary.id === 'lum_compass' ? (
                            <ForgottenHourDescription
                              revealBlueprintText={revealBlueprintText}
                              className="text-[11px] text-white/75 leading-relaxed"
                            />
                          ) : (
                            <p className="text-[11px] text-white/75 leading-relaxed">{selectedLuminary.effectDescription}</p>
                          )
                        )}
                      </div>
                    )}
                    {/* Artifact requirements */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Artifacts Required</span>
                      <div className="flex flex-wrap gap-1.5">
                        {AFFINITIES.map((c) => {
                          const req = selectedLuminary.requirements[c as keyof AffinityCounts];
                          if (!req || req <= 0) return null;
                          const meta = AFFINITY_META[c];
                          return (
                            <div
                              key={c}
                              className="flex items-center gap-1.5 rounded-lg bg-black/40 px-2 py-1 text-xs font-semibold text-white/80"
                              style={{ border: `1px solid ${meta.glowHex}55`, boxShadow: `0 0 8px ${meta.glowHex}33` }}
                            >
                              <AffinityToken color={c} size={13} />
                              <span style={{ color: meta.glowHex, textShadow: `0 0 6px ${meta.glowHex}88` }}>{req}</span>
                              <span className="text-[9px] font-medium text-white/50">{meta.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Active Affinity — selected at arrival and normally immutable. */}
                    {(() => {
                      const sheetLumAffinity = state?.luminaryAffinities?.find(la => la.luminaryId === selectedLuminary.id) ?? null;
                      const isSheetOwnedByMe = (safePlayers.find(p => (p.claimedLuminaryIds ?? []).includes(selectedLuminary.id))?.playerId ?? '') === session?.playerId;
                      const eligible = sheetLumAffinity?.eligibleAffinities ?? [];
                      const activeKey = sheetLumAffinity?.activeAffinity as AffinityKey | undefined;
                      const activeMeta = activeKey ? AFFINITY_META[activeKey] : null;
                      const alliancePending = (state?.turnCount ?? 0) <= (sheetLumAffinity?.summonedAtTurnCount ?? 0);
                      if (!sheetLumAffinity || !activeKey || !activeMeta) return null;
                      return (
                        <div className="flex flex-col gap-1.5 rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Active Affinity</span>
                          <div className="flex items-center gap-2">
                            {/* Current active Affinity */}
                            <div className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{ border: `1px solid ${activeMeta.glowHex}55`, boxShadow: `0 0 8px ${activeMeta.glowHex}33` }}>
                              <AffinityToken color={activeKey} size={13} />
                              <span className="text-[11px] font-semibold" style={{ color: activeMeta.hex, textShadow: `0 0 6px ${activeMeta.glowHex}88` }}>{activeMeta.name}</span>
                            </div>
                          </div>
                          {isSheetOwnedByMe && alliancePending && (
                            <span className="text-[9px] text-amber-400/70">Alliance bonus activates on your next turn.</span>
                          )}
                          {/* Eligible dots for multi-eligible Luminaries */}
                          {eligible.length >= 2 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {eligible.map(ek => {
                                const k = ek as AffinityKey;
                                const isActive = k === activeKey;
                                return (
                                  <span
                                    key={k}
                                    className="inline-block rounded-full"
                                    style={{
                                      width: 6, height: 6,
                                      background: isActive ? AFFINITY_META[k].hex : `${AFFINITY_META[k].hex}44`,
                                      boxShadow: isActive ? `0 0 4px ${AFFINITY_META[k].glowHex}` : 'none',
                                      transition: 'all 0.2s ease',
                                    }}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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

      {/* Archive Encrypt Sheet: confirms a concealed Artifact selection. */}
      <AnimatePresence>
        {selectedDeckTier !== null && (() => {
          const deckTier = selectedDeckTier;
          const deckCount = deckTier === 1 ? (state?.deckCounts.tier1 ?? 0)
            : deckTier === 2 ? (state?.deckCounts.tier2 ?? 0)
            : (state?.deckCounts.tier3 ?? 0);
          const tideTopCard = deckTier === 1
            ? me?.tideArchiveTopCards?.tier1
            : deckTier === 2
              ? me?.tideArchiveTopCards?.tier2
              : me?.tideArchiveTopCards?.tier3;
          const tierLore = deckTier === 3
            ? 'Sovereigns & absolutes — apex relics that bend the cosmos to your will'
            : deckTier === 2
            ? 'Forged instruments — crucibles and sigils of focused cosmic mastery'
            : 'Fragments & sparks — raw nascent shards that seed any engine';
          const canReserve = isMyTurnForCoreAction && !!me && !forgottenHourEncryptBlocked && canReserveMore(me);
          return (
            <motion.div
              data-cinematic-obscurable="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4"
              onClick={closeDeckSheet}
            >
              <motion.div style={{ opacity: deckSheetBackdropOpacity }} className="absolute inset-0 bg-black/75" />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                style={{ scale: deckSheetScale }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl p-5 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] sm:max-w-xl sm:rounded-2xl sm:border sm:pb-5"
                ref={(el) => { deckSheetContainerRef.current = el; }}
                role="dialog"
                aria-modal="true"
                aria-label="Archive actions"
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
                    Tier {deckTier} Archive
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{deckCount} remaining</span>
                  <kbd className="hidden [@media(pointer:fine)]:inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground/40 border border-border/30 bg-muted/10 leading-none select-none">Esc</kbd>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 focus-visible:outline-none focus-visible:ring-0"
                    aria-label="Close Archive panel"
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
                {/* Tier card back and Archive information. */}
                <div className="flex gap-4 mb-5">
                  <div className="archive-sheet-card-back shrink-0">
                    {tideTopCard ? (
                      <button
                        type="button"
                        className="h-full w-full overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
                        aria-label={`Inspect ${tideTopCard.name}, revealed atop the Tier ${deckTier} Archive`}
                        onClick={() => {
                          closeDeckSheet();
                          openCardSheet(tideTopCard, false, true);
                        }}
                      >
                        <ArtifactCardView card={tideTopCard} tier={deckTier} artOnly />
                      </button>
                    ) : (
                      <div aria-hidden="true">
                        <CardBack size="compact" tier={deckTier} count={deckCount} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2 justify-center">
                    <div className="font-bold text-base leading-tight">
                      {tideTopCard ? tideTopCard.name : `Tier ${deckTier} Manifestations`}
                    </div>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      "{tierLore}"
                    </p>
                    {tideTopCard ? (
                      <p className="text-xs text-sky-100/75 leading-relaxed mt-1">
                        Tide Architect reveals this Artifact at the top of the Archive.
                        {me?.tideArchiveForgeAvailable
                          ? ' Its one-use Archive Forge remains available.'
                          : ' The Archive Forge has been used, but the top remains visible.'}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {deckCount} concealed Artifact{deckCount !== 1 ? 's' : ''} remain in this Archive.
                        One will manifest at random and be encrypted into your encrypted pile.
                      </p>
                    )}
                    {me && !canReserveMore(me) && (
                      <p className="text-xs font-semibold text-destructive">
                        Encrypted pile full — forge or spend an encrypted Artifact first.
                      </p>
                    )}
                    {forgottenHourEncryptBlocked && (
                      <p className="text-xs font-semibold text-indigo-200">
                        Forgotten Hour active — Encrypt is unavailable until the source player's next end of turn.
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

                  {tideTopCard && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full border-sky-400/35 bg-sky-950/35 text-sky-100 hover:bg-sky-900/45 hover:text-white"
                      onClick={() => {
                        closeDeckSheet();
                        openCardSheet(tideTopCard, false, true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Inspect revealed Artifact
                    </Button>
                  )}

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
                            className="absolute bottom-full mb-1.5 left-0 max-w-[calc(100vw-3rem)] whitespace-normal flex items-center gap-1 bg-black/90 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg z-10"
                            title="Dismiss hint"
                          >
                            <span className="h-2.5 w-2.5 inline-flex items-center justify-center shrink-0 opacity-60"><CipherSigil affinityHex="#e2e8f0" id={9004} /></span>
                            <span>Tap twice to confirm a random concealed Artifact</span>
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
                        subtitle={forgottenHourEncryptBlocked
                            ? 'Forgotten Hour active'
                            : pendingDeckConfirm
                              ? 'Tap to encrypt hidden'
                            : (canReserve ? 'Encrypt hidden Artifact' : 'Encrypted pile full')}
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
                  {canPlan && !isMyTurnForCoreAction && !coreActionSubmitted && me && !forgottenHourEncryptBlocked && canReserveMore(me) && (
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
                            handlePlanAction({ type: 'reserve_artifact', tier: deckTier, _tier: deckTier });
                            closeDeckSheet();
                          } else {
                            gameAudio.playButtonSelect();
                            setPendingDeckConfirm(true);
                          }
                        }}
                      >
                        <span className="h-5 w-5 mr-2 inline-flex items-center justify-center shrink-0"><CipherSigil affinityHex="#e2e8f0" id={9006} /></span>
                        {pendingDeckConfirm ? 'Confirm: Plan Encrypt' : 'Plan: Encrypt Concealed Artifact'}
                      </Button>
                    </motion.div>
                  )}

                  {/* ── Waiting — visual queue / cutscene blocking ── */}
                  {visualTimelineLocked && !canPlan && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Resolving board state…
                    </p>
                  )}
                  {!visualTimelineLocked && !isMyTurn && !canPlan && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      <AlertCircle className="inline h-4 w-4 mr-1" />
                      Waiting for Luminary arrival…
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
            destinationKind={cardActionBurst.destKind}
            ownerName={cardActionBurst.playerName}
            spentColors={cardActionBurst.spentColors}
            eminence={cardActionBurst.eminence}
            eminenceTotal={me?.eminence ?? 0}
            eminenceTarget={victoryRequirement}
            eminenceTargetSelector='[data-eminence-sigil="player"]'
            onEminenceImpact={triggerEminencePanelImpact}
            isForgottenForge={cardActionBurst.isForgottenForge}
            onForgeStamped={() => markForgeTrapHandoff('local', cardActionBurst.key)}
            onComplete={() => {
              flashForgeDestination(
                cardActionBurst.destPos && cardActionBurst.destTargetSelector && cardActionBurst.destKind
                  ? {
                      kind: cardActionBurst.destKind,
                      targetSelector: cardActionBurst.destTargetSelector,
                      pos: cardActionBurst.destPos,
                    }
                  : undefined,
                cardActionBurst.card,
              );
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
            destinationKind={cardActionBurst.destKind}
            spentColors={cardActionBurst.spentColors}
            eminence={cardActionBurst.eminence}
            eminenceTotal={me?.eminence ?? 0}
            eminenceTarget={victoryRequirement}
            eminenceTargetSelector='[data-eminence-sigil="player"]'
            onEminenceImpact={triggerEminencePanelImpact}
            gotSingularity={cardActionBurst.gotSingularity}
            playerName={cardActionBurst.playerName}
            isCompact={effectiveForgeCompact}
            isForgottenForge={cardActionBurst.isForgottenForge}
            onForgeStamped={() => markForgeTrapHandoff('local', cardActionBurst.key)}
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
            spentColors={opponentForgeAbsorb.spentColors}
            eminence={opponentForgeAbsorb.eminence}
            eminenceTotal={opponentForgeAbsorb.eminenceTotal}
            eminenceTarget={victoryRequirement}
            eminenceTargetSelector={
              opponentForgeAbsorb.targetKind === 'lumii'
                ? LUMII_HUD_NAME_PILL_SELECTOR
                : `[data-eminence-sigil="opponent-${opponentForgeAbsorb.playerId}"]`
            }
            onEminenceImpact={
              opponentForgeAbsorb.targetKind === 'lumii'
                ? undefined
                : (amount) => triggerOpponentEminenceImpact(opponentForgeAbsorb.playerId, amount)
            }
            isForgottenForge={opponentForgeAbsorb.isForgottenForge}
            onForgeStamped={() => markForgeTrapHandoff('opponent', opponentForgeAbsorb.key)}
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
            eminence={opponentForgeAbsorb.eminence}
            eminenceTotal={opponentForgeAbsorb.eminenceTotal}
            eminenceTarget={victoryRequirement}
            spentColors={opponentForgeAbsorb.spentColors}
            eminenceTargetSelector={
              opponentForgeAbsorb.targetKind === 'lumii'
                ? LUMII_HUD_NAME_PILL_SELECTOR
                : `[data-eminence-sigil="opponent-${opponentForgeAbsorb.playerId}"]`
            }
            isCompact={effectiveForgeCompact}
            onEminenceImpact={
              opponentForgeAbsorb.targetKind === 'lumii'
                ? undefined
                : (amount) => triggerOpponentEminenceImpact(opponentForgeAbsorb.playerId, amount)
            }
            isForgottenForge={opponentForgeAbsorb.isForgottenForge}
            onForgeStamped={() => markForgeTrapHandoff('opponent', opponentForgeAbsorb.key)}
          />
        ))}
      </AnimatePresence>

      {/* ── Cipher Aperture Burst: Encrypt / reserve from the Forge ── */}
      {cipherBurst && (abridgedAnims ? (
        <AbridgedForgeAnimation
          key={cipherBurst.key}
          animKey={cipherBurst.key}
          card={cipherBurst.card}
          cardFace={cipherBurst.concealed ? <ConcealedArchiveArtifact tier={cipherBurst.tier} /> : undefined}
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
          cardFace={
            cipherBurst.concealed
              ? <ConcealedArchiveArtifact tier={cipherBurst.tier} />
              : <ArtifactCardView card={cipherBurst.card} tier={cipherBurst.tier} />
          }
          gotSingularity={cipherBurst.gotSingularity}
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

      {/* Archives transmit a brief pattern trace; the authoritative Artifact
          is cast inside its fixed mold rather than dealt across the viewport. */}
      {archiveManifestationTraces.map(trace => (
        <ArchiveManifestationTrace
          key={trace.id}
          manifestation={trace}
        />
      ))}

      {/* ── Reserved Artifact Forge notice ── */}
      <AnimatePresence>
        {reservedForgeNotice && (
          <motion.div
            key={reservedForgeNotice.key}
            className="pointer-events-none fixed inset-0 z-[9050] flex items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 1, 0] }}
            transition={{ duration: 1.75, ease: 'easeOut', times: [0, 0.78, 1] }}
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
              className="animation-readable-pill flex flex-col items-center gap-1 rounded-xl px-5 py-3"
              initial={{ y: 0, opacity: 1, scale: 0.8 }}
              animate={{ y: -84, opacity: [1, 1, 0], scale: [0.86, 1.04, 1.1] }}
              transition={{ duration: 1.55, times: [0, 0.78, 1], ease: 'easeOut' }}
            >
              <span className="animation-readable-text text-3xl font-serif font-black text-amber-300">
                {reservedForgeNotice.eminence > 0 ? 'Eminence sealed' : 'Forged!'}
              </span>
              {reservedForgeNotice.eminence > 0 && (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0, y: 12 }}
                  animate={{ scale: [0.6, 1.28, 1], opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.52, ease: 'easeOut' }}
                  className="animation-readable-text flex items-center gap-2 text-xl font-black uppercase"
                  style={{ color: '#fff1bf' }}
                >
                  <EminenceBadge value={reservedForgeNotice.eminence} /> Eminence
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Affinity Harness Burst ── */}
      <AnimatePresence>
        {affinityBurst && (
          <OpponentHarnessTrace
            key={affinityBurst.key}
            trace={{
              key: affinityBurst.key,
              affinities: affinityBurst.affinities,
              playerId: affinityBurst.playerId,
              playerName: affinityBurst.playerName,
              targetKind: affinityBurst.targetKind,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Turn Order Intro Overlay ── */}
      <AnimatePresence>
        {turnOrderIntro && (
          <TurnOrderIntroOverlay
            intro={turnOrderIntro}
            onAbridge={handleTurnCinematicPointerUp}
            onBonusImpact={triggerOpeningBalanceImpact}
          />
        )}
      </AnimatePresence>

      {/* ── Turn Announcement Overlay ── */}
      <AnimatePresence>
        {turnAnnouncement && (
          <motion.div
            key={turnAnnouncement.key}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onPointerUp={handleTurnCinematicPointerUp}
            style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 70% 55% at 50% 50%, ${hexRgba(turnAnnouncement.accentColor, turnAnnouncement.isYou ? 0.28 : 0.14)} 0%, rgba(0,0,0,0.55) 70%)`,
              }}
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
                  width: 80,
                  height: 80,
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
              <motion.div
                className="turn-announcement-eminence"
                initial={{ opacity: 0, scale: 0.88, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.28, ease: 'easeOut' }}
                aria-label={`Eminence ${turnAnnouncement.eminence} of ${victoryRequirement}`}
              >
                <span className="turn-announcement-eminence__sigil" aria-hidden="true">
                  <EminenceSigil
                    size={52}
                    value={turnAnnouncement.eminence}
                    target={victoryRequirement}
                  />
                </span>
                <span className="turn-announcement-eminence__readout">
                  <span className="turn-announcement-eminence__label">Eminence</span>
                  <span className="turn-announcement-eminence__progress">
                    <strong>{turnAnnouncement.eminence}</strong>
                    <span>/{victoryRequirement}</span>
                  </span>
                </span>
              </motion.div>
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
            <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg bg-violet-950/35 border border-violet-500/25 px-3 py-2">
              <span className="text-violet-200/80">{row.name} Oblivion</span>
              <span className="font-bold text-violet-200">+{row.amount} requirement</span>
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
            <span className="flex items-center gap-1 font-bold text-primary">{me?.eminence ?? 0}<EminenceDiamond size={11} /></span>
          </div>
        </div>
      </BaseDialog>

      {/* ── Rules Sheet ── */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            data-cinematic-obscurable="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4"
            onClick={() => setShowRules(false)}
          >
            <motion.div style={{ opacity: rulesSheetBackdropOpacity }} className="absolute inset-0 bg-black/75" />
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
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] sm:max-w-2xl sm:rounded-2xl sm:border sm:pb-5"
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
                  <Button variant="ghost" size="icon" className="h-11 w-11 focus-visible:outline-none focus-visible:ring-0" onClick={() => setShowRules(false)} aria-label="Close rules">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div {...rulesSheetScrollableProps} className="px-5 overflow-y-auto max-h-[60vh] space-y-4 pb-4">
                {[
                  {
                    icon: Flag,
                    title: 'Goal',
                    body: balanceLabCandidate === 'reach_gate' || balanceLabCandidate === 'integrated'
                      ? `Reach ${victoryRequirement} Eminence and ${victoryRequirement >= 25 ? 'Forge at least two Tier III Artifacts' : victoryRequirement >= 20 ? 'Forge at least one Tier III Artifact' : 'complete the Quick-format race'}. The round then completes so every player gets equal turns.`
                      : `Be the first to reach ${victoryRequirement} Eminence. The round completes so every player gets equal turns, then the highest Eminence wins.`,
                  },
                  {
                    icon: Gavel,
                    title: 'Ending & ties',
                    body: 'If the Forge and every Archive empty, an equal-turn closing round begins. Encrypted Artifacts may still be Forged, but public rows no longer refill. Ties are resolved by fewest encrypted Artifacts; then most Tier III forged Artifacts, followed by Tier II and Tier I; then the same tier comparison within the strongest single affinity.',
                  },
                  {
                    icon: Zap,
                    title: 'On your turn — pick one action',
                    body: `Harness exactly 3 different affinities · Harness 2 of the same (needs 4+ in the well) · ${balanceLabCandidate === 'focus' || balanceLabCandidate === 'integrated' ? 'Encrypt an Artifact (hold up to 3; its bound Focus reduces one remaining requirement when you Forge it)' : balanceLabCandidate === 'encrypt_none' ? 'Encrypt an Artifact (hold up to 3; concealment grants no payment resource)' : 'Encrypt an Artifact (hold up to 3, create 1 Singularity)'} · Forge an Artifact you can afford`,
                  },
                  {
                    icon: Package,
                    title: 'Artifacts & bonuses',
                    body: 'Each forged Artifact permanently reduces future costs of its Affinity. Pay only the remaining cost from held Affinities; Singularity can cover any shortfall.',
                  },
                  {
                    icon: Sparkles,
                    title: 'Eminence',
                    body: balanceLabLuminaryEminence === 0
                      ? 'Artifacts award Eminence when forged. Luminaries establish relationships and grant their effects, but award no automatic arrival Eminence in this candidate.'
                      : 'Some Artifacts award Eminence when forged. Luminaries (the top row) grant bonus Eminence to the first player whose bonuses meet their requirements — claimed automatically.',
                  },
                  {
                    icon: Gauge,
                    title: 'Affinity limit',
                    body: 'You may hold at most 10 affinities at end of turn. You may hold at most 3 encrypted Artifacts at once.',
                  },
                ].map(({ icon: RuleIcon, title, body }) => (
                  <div key={title} className="flex gap-3">
                    <RuleIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" aria-hidden="true" />
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
                {/* Keyboard shortcut legend */}
                <div className="mt-2 pt-4 border-t border-border/50">
                  <div className="font-semibold text-sm mb-2">Keyboard shortcuts</div>
                  <p className="text-xs text-muted-foreground mb-3">Active when no panel is open and focus is not in a text field.</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {([
                      ['B', 'Board view'],
                      ['H', 'Civilization view'],
                      ['L', 'Log view'],
                      ['R', 'Encrypted Artifacts'],
                      ['F', 'Forged Artifacts'],
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
            data-cinematic-obscurable="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4"
            onClick={() => setShowReservedOverlay(false)}
          >
            <motion.div style={{ opacity: reservedSheetBackdropOpacity }} className="absolute inset-0 bg-black/75" />
            <motion.div
              ref={(el) => { reservedOverlayContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label="Encrypted Artifacts"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ scale: reservedSheetScale }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] sm:max-w-3xl sm:rounded-2xl sm:border sm:pb-5"
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
                  Encrypted Artifacts ({me.reservedArtifacts.length}/3)
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
                {me.reservedArtifacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No Artifacts encrypted.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {me.reservedArtifacts.map((c) => {
                      const ec = computeCosts(c, costMode);
                      const ecBonus = computeCosts(c, 'after_bonuses') ?? undefined;
                      const canBuy = canAffordCard(c, me);
                      const isPendingPlan = plannedCardId === c.id;
                      return (
                        <div
                          key={c.id}
                          data-reserved-card-id={c.id}
                          className="relative flex w-full items-center gap-3 rounded-2xl p-3 text-left"
                        >
                          <button
                            type="button"
                            title={isPendingPlan ? `Click to cancel ${plannedCardLabel.toLowerCase()}` : c.name}
                            aria-label={isPendingPlan ? `Cancel ${plannedCardLabel.toLowerCase()}` : `View ${c.name}`}
                            className="absolute inset-0 z-0 rounded-2xl bg-secondary/30 transition-colors hover:bg-secondary/50 active:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                            onClick={() => {
                              setShowReservedOverlay(false);
                              handleCardTap(c, true);
                            }}
                          />
                          <div className="pointer-events-none relative z-10 shrink-0">
                            <ArtifactCardView
                              card={c}
                              tier={c.tier}
                              effectiveCosts={ec}
                              bonusCosts={ecBonus}
                              tapped={false}
                              hideStrike={costMode === 'needed_now'}
                            />
                            <ForgeMarkerLayer
                              markerTypes={getArtifactBrandTypes(state?.artifactMarkers?.[c.id])}
                              brandDelay={brandDelayMap.get(c.id)}
                              strikeAura={strikeAuraMap.get(c.id)}
                              suppressed={suppressedMarkerIds.has(c.id)}
                            />
                            {isPendingPlan && (
                              <PendingActionOverlay
                                label={plannedCardLabel}
                                onCancel={handleCancelPlan}
                              />
                            )}
                          </div>
                          <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col gap-1.5">
                            <div className="font-bold text-sm leading-tight">{c.name}</div>
                            <div className="flex items-center gap-1.5">
                              <AffinityToken color={c.bonusAffinity as AffinityKey} size={13} />
                              <span className="text-xs text-muted-foreground">{AFFINITY_META[c.bonusAffinity as AffinityKey]?.name ?? c.bonusAffinity} bonus</span>
                              {(c.eminence ?? 0) > 0 && (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="flex items-center gap-0.5 text-xs font-bold text-white">{c.eminence}<EminenceDiamond size={9} /></span>
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

      {/* ── Forged Cards Overlay ── */}
      <AnimatePresence>
        {showForgedOverlay && me && (
          <motion.div
            data-cinematic-obscurable="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4"
            onClick={() => { setShowForgedOverlay(false); setForgedFilter(null); }}
          >
            <motion.div style={{ opacity: forgedSheetBackdropOpacity }} className="absolute inset-0 bg-black/75" />
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
              className="relative w-full bg-card rounded-t-3xl border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] sm:max-w-3xl sm:rounded-2xl sm:border sm:pb-5"
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
                    ? <>{AFFINITY_META[forgedFilter].name} Artifacts</>
                    : <>Forged Artifacts ({me.forgedArtifacts?.length ?? 0})</>
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
                {AFFINITIES.filter(c => c !== 'singularity').map((c) => {
                  const count = (me.forgedArtifacts ?? []).filter(card => card.bonusAffinity === c).length;
                  if (count === 0) return null;
                  const meta = AFFINITY_META[c as AffinityKey];
                  const active = forgedFilter === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForgedFilter(active ? null : c as AffinityKey)}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 transition-all"
                      style={{
                        background: active ? `${meta.hex}CC` : 'rgba(0,0,0,0.35)',
                        border: `1.5px solid ${active ? meta.hex : meta.hex + '55'}`,
                      }}
                    >
                      <AffinityToken color={c as AffinityKey} size={11} />
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
                    ? (me.forgedArtifacts ?? []).filter(card => card.bonusAffinity === forgedFilter)
                    : (me.forgedArtifacts ?? []);
                  return cards.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {forgedFilter ? `No ${AFFINITY_META[forgedFilter].name} Artifacts forged yet.` : 'No Artifacts forged yet.'}
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
                    {(me.forgedArtifacts ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No Artifacts forged yet.</p>
                    ) : (me.forgedArtifacts ?? []).map((c, idx) => {
                      const snap = c.bonusesAtForge;
                      const snapKeys = snap
                        ? AFFINITIES.filter(k => k !== 'singularity' && (snap[k as keyof AffinityCounts] ?? 0) > 0)
                        : [];
                      const bonusMeta = AFFINITY_META[c.bonusAffinity as AffinityKey];
                      return (
                        <div key={c.id} className="flex items-center gap-3 py-2.5">
                          <span className="text-[11px] text-muted-foreground w-5 text-right shrink-0 tabular-nums">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground leading-tight truncate">{c.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {snapKeys.length > 0 ? snapKeys.map(k => (
                                <div key={k} className="flex items-center gap-0.5 bg-black/40 rounded px-1 py-0.5">
                                  <AffinityToken color={k as AffinityKey} size={10} />
                                  <span className="text-[10px] font-bold text-white">×{snap![k as keyof AffinityCounts]}</span>
                                </div>
                              )) : (
                                <span className="text-[10px] text-muted-foreground italic">no snapshot</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-0.5 rounded-full px-2 py-0.5" style={{ background: (bonusMeta?.hex ?? '#888') + '22', border: `1px solid ${(bonusMeta?.hex ?? '#888')}44` }}>
                            <AffinityToken color={c.bonusAffinity as AffinityKey} size={10} />
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
            data-cinematic-obscurable="true"
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
              data-cinematic-obscurable="true"
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
                  <p className="text-xs text-muted-foreground italic py-2">No Artifacts have been burned yet.</p>
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
          const lumById = new Map(allLums.map(l => [l.id, l] as const));
          const candidateLums = pendingLuminaryChoice.candidates
            .map(id => lumById.get(id))
            .filter((lum): lum is Luminary => !!lum);
          const choosingPlayer = (state.players as GamePlayerState[])
            .find(p => p.playerId === pendingLuminaryChoice.playerId);
          return (
            <LuminaryOrderPicker
              key="luminary-order-picker"
              candidates={candidateLums}
              isMyChoice={luminaryChoiceIsOurs}
              choosingPlayerName={choosingPlayer?.playerName ?? 'Another player'}
              onConfirmOrder={async (orderedIds) => {
                await executeAction({ type: 'choose_luminary_order', orderedIds });
              }}
            />
          );
        })()}
      </AnimatePresence>

      {/* ── Victory Cinematic ── */}
      {isActualLumiiScenario && state.status === 'finished' && !pendingGameOver && !summonSequenceActive && (
        <LumiiVaultEncounter
          attempt="remembered"
          cipherDeactivated
          covenantBroken={state.brokenCovenantDeclared}
          thresholdApproach={state.lumiiThresholdApproach}
          outcome={state.finishReason === 'withdrawal'
            ? 'withdrawn'
            : state.winnerId === session.playerId
              ? 'victory'
              : 'defeat'}
          onLeave={returnToLumiiVault}
          onChallengeAgain={lumiiChallengeAgainAvailable ? challengeLumiiAgain : undefined}
          onEnterVault={enterRevealedVault}
        />
      )}
      <AnimatePresence>
        {!isLumiiScenario && state.status === 'finished' && !pendingGameOver && !summonSequenceActive && showCinematic && (() => {
          const winnerId = state.winnerId;
          if (!winnerId) return null;
          const winnerPlayer = (state.players as GamePlayerState[]).find(p => p.playerId === winnerId);
          if (!winnerPlayer) return null;
          const winnerCards = (winnerPlayer.forgedArtifacts ?? []) as ArtifactCard[];
          const winnerDiscountedIds = (winnerPlayer.discountedForgeIds ?? []) as string[];
          const winnerTier = getKardashevTier(winnerCards, winnerDiscountedIds);
          const winnerPalette = getDominantAffinityPalette(winnerCards);
          const winnerProfile = buildCivilizationProfile(winnerCards);
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
              civilizationProfile={winnerProfile}
              eminence={winnerPlayer.eminence}
              cardsForged={winnerCards.length}
              accolades={accolades}
              onDismiss={() => setShowCinematic(false)}
            />
          );
        })()}
      </AnimatePresence>

      {/* ── Return-to-Results banner (shown when board is visible after game over) ── */}
      {!isLumiiScenario && state.status === 'finished' && !pendingGameOver && !summonSequenceActive && !showCinematic && !showWinOverlay && (() => {
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
      {!isLumiiScenario && state.status === 'finished' && !pendingGameOver && !summonSequenceActive && !showCinematic && !showWinOverlay && (() => {
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
              className="flex items-center justify-between px-4 py-2.5 bg-black/92 border-t border-white/10 text-sm font-semibold text-foreground/70 hover:text-foreground/90 transition-colors select-none"
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
                style={{ background: 'rgba(4,2,14,0.96)' }}
              >
                {entries.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground italic text-center">No actions recorded.</div>
                ) : (
                  entries.map((entry, i) => {
                    const isMe = entry.playerId === session.playerId;
                    const logPlayer = state.players.find((pl) => pl.playerId === entry.playerId);
                    const isAffinityChange = entry.summary.startsWith('switched ');
                    const isCancelled =
                      entry.summary.startsWith('pending action cleared') ||
                      entry.summary.startsWith('planned move cleared') ||
                      entry.summary.startsWith('planned move voided');
                    const isBurned = /\bBurned\b/i.test(entry.summary);
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
                              <span className="text-yellow-400/80 italic"> · Pending action cleared</span>
                              <span
                                className="inline-flex items-center justify-center ml-1.5 align-middle"
                                title={entry.summary
                                  .replace('pending action cleared — ', '')
                                  .replace('planned move cleared — ', '')
                                  .replace('planned move voided — ', '')}
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
                            <>
                              <span className="text-foreground/80"> · {entry.summary}</span>
                              {isBurned && (
                                <span
                                  className="inline-flex items-center gap-0.5 ml-1.5 align-middle"
                                  title="Burned"
                                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 4, padding: '0 4px', fontSize: 9, lineHeight: '14px', color: '#F87171', verticalAlign: 'middle' }}
                                >
                                  🔥 Burned
                                </span>
                              )}
                            </>
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
        {!isLumiiScenario && state.status === 'finished' && !pendingGameOver && !summonSequenceActive && !showCinematic && showWinOverlay && (() => {
          const winnerPlayer = state.winnerId
            ? (state.players as GamePlayerState[]).find(p => p.playerId === state.winnerId)
            : null;
          const winnerCards = (winnerPlayer?.forgedArtifacts ?? []) as ArtifactCard[];
          const winnerDiscountedIds = (winnerPlayer?.discountedForgeIds ?? []) as string[];
          const victoryTier = getKardashevTier(winnerCards, winnerDiscountedIds);
          const victoryPalette = getDominantAffinityPalette(winnerCards);
          const victoryProfile = buildCivilizationProfile(winnerCards);
          return (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-[#050611] p-3 sm:p-6"
          >
            <KardashevScene
              tier={victoryTier}
              palette={victoryPalette}
              profile={victoryProfile}
              progressFraction={1}
              paused
              maxDpr={1}
              className="absolute inset-0 overflow-hidden bg-black opacity-35 pointer-events-none"
            />
            <div className="absolute inset-0 pointer-events-none bg-[#050611]/75" />
            {/* Radial glow behind card */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 54% 44% at 50% 48%, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.08) 42%, transparent 72%)' }} />

            <motion.div
              ref={(el) => { winOverlayContainerRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-label={state.winnerId === session.playerId ? 'Victory' : 'Game over'}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: 0.04 }}
              className="relative isolate pointer-events-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border-2 bg-[#080917] p-5 text-center text-foreground shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-7"
              style={(() => {
                const lumId = state.winTriggerLuminaryId;
                if (!lumId) return { borderColor: 'hsl(var(--primary) / 0.55)', boxShadow: '0 22px 90px rgba(0,0,0,0.72), 0 0 48px rgba(99,102,241,0.24), inset 0 1px 0 rgba(255,255,255,0.10)' };
                const lum = state.luminaries?.find(l => l.id === lumId);
                const accentColor = lum?.summonColor ?? getLuminaryVisuals(lumId).primaryColor;
                return { borderColor: accentColor + '99', boxShadow: `0 22px 90px rgba(0,0,0,0.72), 0 0 52px ${accentColor}44, inset 0 1px 0 rgba(255,255,255,0.10)` };
              })()}
            >
              {state.winnerId === session.playerId ? (
                <>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-primary/45 bg-primary/15 text-primary shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
                  >
                    <Sparkles className="h-8 w-8" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="text-4xl font-serif font-bold text-primary affinity-glow"
                  >
                    Victory!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-lg font-semibold"
                    style={{ color: AFFINITY_META.singularity.hex }}
                  >
                    The cosmos bends to your will.
                  </motion.p>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-primary/35 bg-primary/10 text-primary">
                    <Sparkles className="h-8 w-8" />
                  </div>
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
                    .sort((a, b) => (b.eminence ?? 0) - (a.eminence ?? 0));
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
                      <LuminaryPanelArt luminaryId={lumId} width={80} height={80} claimed={false} runtime />
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

              {/* Final Eminence standings, staggered in */}
              <div className="flex flex-col gap-2 pt-1">
                {(() => {
                  const sorted = [...state.players].sort((a, b) =>
                    compareVictoryStandings(
                      getPlayerVictoryStanding(a),
                      getPlayerVictoryStanding(b),
                    ),
                  );
                  const maxEminence = sorted[0]?.eminence ?? 0;
                  const tiedOnEminence = sorted.filter(p => p.eminence === maxEminence).length > 1;
                  return sorted.map((p, i) => {
                    const isMe = p.playerId === session.playerId;
                    const avatarIdForPlayer = p.avatarId ?? (isMe ? session.avatarId : null);
                    const playerCards = (p.forgedArtifacts ?? []) as Array<{ id: string; tier: number; bonusAffinity: string }>;
                    const playerDiscountedIds = (p.discountedForgeIds ?? []) as string[];
                    const civPalette = getDominantAffinityPalette(playerCards);
                    const civTier = getKardashevTier(playerCards, playerDiscountedIds);
                    const civName = getCivilizationName(civPalette, civTier);
                    const forgedCount = playerCards.length;
                    const encryptedCount = p.reservedArtifacts?.length ?? 0;
                    const [tier3Count, tier2Count, tier1Count] = getArtifactTierCounts(playerCards);
                    const claimedIds = (p.claimedLuminaryIds ?? []) as string[];
                    const claimedLums = (state.luminaries ?? []).filter(l => claimedIds.includes(l.id));
                    const isWinner = p.playerId === state.winnerId;
                    const showTieBreak = isWinner && tiedOnEminence;
                    return (
                      <motion.div
                        key={p.playerId}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55 + i * 0.1 }}
                      className={`flex flex-col gap-1 rounded-md border px-3 py-2.5 transition-colors ${isWinner ? 'border-primary/50 bg-primary/20' : 'border-white/10 bg-secondary/55'}`}
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
                            {p.eminence}<EminenceDiamond size={13} />
                          </span>
                        </div>
                        {/* Breakdown row */}
                        <div className="flex items-center justify-between gap-2 pl-1 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span className="tabular-nums font-semibold text-foreground/70">{forgedCount}</span>
                              <span>forged</span>
                            </span>
                            <span className="text-[11px] text-muted-foreground/50">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              <span className="tabular-nums font-semibold text-foreground/70">{encryptedCount}</span> encrypted
                            </span>
                            <span className="text-[11px] text-muted-foreground/50">·</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              III {tier3Count} · II {tier2Count} · I {tier1Count}
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

              {/* ── Session Record ───────────────────────────────────────────── */}
              {!balanceLabCandidate && rematchVote && Object.keys(rematchVote.sessionStats).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-md border border-white/10 bg-secondary/50 px-3 py-2 space-y-1">
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
                className="flex flex-col gap-3 border-t border-white/10 pt-4"
              >
                {balanceLabCandidate ? (
                  <BalanceLabFinishedControls
                    onReturnToLab={() => setLocation('/dev/balance-lab')}
                    onViewBoard={() => {
                      setShowWinOverlay(false);
                      setShowCinematic(false);
                      requestAnimationFrame(() => returnBannerRef.current?.focus());
                    }}
                  />
                ) : (
                  <>
                    {rematchVote?.active ? (
                  <div className="rounded-md border border-primary/30 bg-primary/[0.09] p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                          Rematch Invitation
                        </div>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">
                          {rematchVote.starting
                            ? 'Everyone has responded. Starting the next game...'
                            : allRematchHumansResponded && !rematchHasEnoughPlayers
                            ? 'At least two players must join before another game can begin.'
                            : `${state.players.find((p) => p.playerId === rematchVote.initiatorId)?.playerName ?? 'A player'} invited the table. The game starts when every human player responds.`}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md border border-white/15 bg-black/25 px-2 py-1 text-[10px] font-semibold text-foreground/85">
                        {rematchVote.sameBoard ? 'Same opening' : 'Fresh opening'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {state.players.map((p) => {
                        const joined = rematchVote.voterIds.includes(p.playerId);
                        const declined = rematchVote.declinedIds.includes(p.playerId);
                        const isMe = p.playerId === session.playerId;
                        const avatarIdForPlayer = p.avatarId ?? (isMe ? session.avatarId : null);
                        const status = p.isAi || joined
                          ? 'Ready'
                          : declined
                          ? 'Not joining'
                          : p.isConnected === false
                          ? 'Disconnected'
                          : 'Waiting';
                        return (
                          <div
                            key={p.playerId}
                            className="flex min-w-0 items-center gap-2 rounded-lg border border-white/8 bg-black/20 px-2 py-1.5"
                          >
                            <div className="relative shrink-0">
                              <PlayerAvatar avatarId={avatarIdForPlayer} name={p.playerName} size={26} />
                              {(p.isAi || joined) && (
                                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] leading-none text-white">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-semibold text-foreground">
                                {p.playerName}
                              </div>
                              <div className={`text-[9px] ${
                                p.isAi || joined
                                  ? 'text-emerald-400'
                                  : declined
                                  ? 'text-muted-foreground'
                                  : 'text-amber-300'
                              }`}>
                                {status}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {hasVoted ? (
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <div className="flex h-11 items-center justify-center rounded-md border border-emerald-300/35 bg-emerald-500/12 text-sm font-bold text-emerald-100">
                          <Check className="mr-2 h-4 w-4" />
                          Ready
                        </div>
                        <Button
                          size="lg"
                          variant="outline"
                          className="h-11 rounded-md border-white/25 bg-white/10 px-4 text-foreground hover:bg-white/15"
                          disabled={votePending || rematchVote.starting}
                          onClick={() => void submitRematchResponse('decline')}
                        >
                          Not This Time
                        </Button>
                      </div>
                    ) : (
                      <div className={`grid gap-2 ${hasDeclinedRematch ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <Button
                          size="lg"
                          className="h-11 rounded-md bg-primary font-bold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.28)] hover:bg-primary/90"
                          disabled={votePending || rematchVote.starting}
                          onClick={() => void submitRematchResponse('join', rematchVote.sameBoard)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {hasDeclinedRematch ? 'Join After All' : 'Join Rematch'}
                        </Button>
                        {!hasDeclinedRematch && (
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-11 rounded-md border-white/25 bg-white/10 text-foreground hover:bg-white/15"
                            disabled={votePending || rematchVote.starting}
                            onClick={() => void submitRematchResponse('decline')}
                          >
                            Not This Time
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Next</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        size="lg"
                        className="h-12 rounded-md bg-primary text-base font-bold text-primary-foreground shadow-[0_0_28px_hsl(var(--primary)/0.34)] transition-all hover:bg-primary/90 hover:shadow-[0_0_34px_hsl(var(--primary)/0.46)]"
                        disabled={votePending}
                        onClick={() => void submitRematchResponse('join', false)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {votePending && rematchVoteMode === 'fresh' ? 'Inviting...' : 'Play Again'}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-12 rounded-md border-white/30 bg-white/10 font-bold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/15 hover:text-foreground disabled:opacity-50"
                        disabled={votePending || !canReplaySameBoard}
                        onClick={() => void submitRematchResponse('join', true)}
                      >
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        {votePending && rematchVoteMode === 'same-board'
                          ? 'Inviting...'
                          : canReplaySameBoard
                          ? 'Replay Same Board'
                          : 'Replay Unavailable'}
                      </Button>
                    </div>
                    {!canReplaySameBoard && (
                      <p className="text-center text-[11px] leading-snug text-muted-foreground">
                        Same-board replay works for games started after this update.
                      </p>
                    )}
                  </>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 rounded-md border-white/30 bg-white/10 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/15 hover:text-foreground"
                    onClick={() => {
                      setShowWinOverlay(false);
                      setShowCinematic(false);
                      requestAnimationFrame(() => returnBannerRef.current?.focus());
                    }}
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    View Board
                  </Button>
                  <Button size="lg" variant="outline" className="h-11 rounded-md border-white/25 bg-white/10 text-foreground hover:bg-white/15" onClick={leaveFinishedRoom}>
                    <DoorOpen className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>

      {blueprintPresentationActive &&
        (state.pendingSummonEvents?.length ?? 0) === 0 &&
        (state.pendingLuminaryActivationEvents?.length ?? 0) === 0 &&
        arrivalQueue.length === 0 &&
        activationQueue.length === 0 && (() => {
          const manifestation = state.pendingBlueprintManifestationEvents?.[0] ?? null;
          const detonation = manifestation ? null : state.pendingBlueprintDetonationEvents?.[0] ?? null;
          const protocolEvent = manifestation || detonation ? null : state.pendingScenarioProtocolEvents?.[0] ?? null;
          const controller = state.players.find((player) => !player.isAi && player.isConnected)
            ?? state.players.find((player) => !player.isAi);
          return (
            <React.Suspense
              fallback={<div className="fixed inset-0 z-[12000] grid place-items-center bg-black" aria-label="Loading Blueprint presentation"><Loader2 className="h-6 w-6 animate-spin text-amber-200" /></div>}
            >
              {protocolEvent ? (
                <ScenarioProtocolPresentationOverlay
                  event={protocolEvent}
                  reducedMotion={effectiveBlueprintPresentationReducedMotion}
                  onComplete={() => {
                    if (!controller || controller.playerId !== session.playerId) return;
                    void executeAction({
                      type: protocolEvent.kind === 'manifestation'
                        ? 'resolve_blueprint_manifestation'
                        : 'resolve_blueprint_detonation',
                      eventId: protocolEvent.eventId,
                    });
                  }}
                />
              ) : (
                <BlueprintPresentationOverlay
                  manifestation={manifestation}
                  detonation={detonation}
                  players={state.players}
                  reducedMotion={effectiveBlueprintPresentationReducedMotion}
                  onComplete={() => {
                    if (detonation) {
                      const castEntry = pendingBlueprintMoldCastsRef.current.get(detonation.eventId);
                      pendingBlueprintMoldCastsRef.current.delete(detonation.eventId);
                      if (
                        castEntry &&
                        !beginMoldCasting([castEntry], 'annihilation')
                      ) {
                        setHiddenSlots(current => {
                          if (!current.has(castEntry.slotKey)) return current;
                          const next = new Set(current);
                          next.delete(castEntry.slotKey);
                          return next;
                        });
                      }
                    }
                    if (!controller || controller.playerId !== session.playerId) return;
                    if (manifestation) {
                      void executeAction({
                        type: 'resolve_blueprint_manifestation',
                        eventId: manifestation.eventId,
                      });
                    } else if (detonation) {
                      void executeAction({
                        type: 'resolve_blueprint_detonation',
                        eventId: detonation.eventId,
                      });
                    }
                  }}
                />
              )}
            </React.Suspense>
          );
        })()}

      {import.meta.env.DEV && showDevSequenceLab && state.status === 'playing' && roomId && (
        <DevLuminarySequencePanel
          roomId={roomId}
          sessionToken={session.sessionToken}
          presentationActive={
            luminaryPresentationActive
            || (state.pendingSummonEvents?.length ?? 0) > 0
            || (state.pendingLuminaryActivationEvents?.length ?? 0) > 0
            || devSequenceActive
          }
          onPrepareRun={prepareDevLuminarySequence}
          onRunQueued={(playbackMode) => {
            setDevSequencePlaybackMode(playbackMode);
            luminaryPresentationEngine.beginDevSequenceRun();
          }}
          onRestore={resetDevLuminaryPresentation}
          onClose={() => setShowDevSequenceLab(false)}
        />
      )}
      {/* Luminary arrival cutscene queue — plays one cutscene at a time.
          When the user presses "Skip view", the cutscene overlay is hidden via
          CSS (visibility:hidden) but the component stays mounted so its internal
          timer chain still runs and fires onComplete at the correct moment.
          onComplete sends resolve_summon to the server (clearing the global gate)
          and advances the local queue, at which point the "waiting" chip clears.
          In tutorial mode the queue is drained silently by a useEffect above —
          the component must never mount here so the full-screen dark overlay
          (z-9000, up to 88% opacity) never appears during the tutorial. */}
      <AnimatePresence>
        {!isTutorial && arrivalQueue.length > 0 && arrivalQueue[0] && (() => {
          const entry = arrivalQueue[0];
          if (renderedArrivalEventIdRef.current !== entry.eventId) {
            renderedArrivalEventIdRef.current = entry.eventId;
            logArrivalDebug('arrival.render-head', {
              eventId: entry.eventId,
              luminaryId: entry.id,
              luminaryName: entry.name,
              isDevTest: entry.isDevTest,
              hasCardRect: !!entry.cardRect,
              cardRect: entry.cardRect,
              claimedBy: entry.claimedBy,
            });
          }
          // Completion logic shared by both onSkip and the cutscene's internal
          // onComplete timer. When the user taps Skip, the cutscene is unmounted
          // immediately so the queue advances and the server gate resolves.
          const resolveArrival = () => {
            if (resolvedArrivalEventIdsRef.current.has(entry.eventId)) {
              logArrivalDebug('arrival.resolve-duplicate-skipped', {
                eventId: entry.eventId,
                luminaryId: entry.id,
              });
              return;
            }
            resolvedArrivalEventIdsRef.current.add(entry.eventId);
            logArrivalDebug('arrival.resolve', {
              eventId: entry.eventId,
              luminaryId: entry.id,
              isDevTest: entry.isDevTest,
              queueLenBefore: arrivalQueue.length,
            });
            setLocalArrivalSkipped(false);
            setArrivalQueue(q => (
              q[0]?.eventId === entry.eventId
                ? q.slice(1)
                : q.filter(e => e.eventId !== entry.eventId)
            ));
            const usesEpicArrival = cinematicMode === 'epic';
            if (usesEpicArrival) {
              setClaimedThisSession(prev =>
                prev.includes(entry.id) ? prev : [...prev, entry.id]
              );
              releaseArrivalVisuals([entry.id]);
              releaseSummonActivationLocks([entry.id]);
            } else {
              startReturningLuminary(entry.id);
            }
            queueLuminaryEminenceBurst(entry);
            // The server acknowledgement waits for the post-cutscene return
            // flight (or epic settle) below. A passive Luminary may have no
            // activation event, so acknowledging here would otherwise release
            // the next turn while the entity is still visibly in transit.
            if (!entry.isDevTest) {
              if (!pendingArrivalServerResolutionsRef.current.some(
                pending => pending.eventId === entry.eventId,
              )) {
                pendingArrivalServerResolutionsRef.current.push({
                  eventId: entry.eventId,
                  luminaryId: entry.id,
                });
              }
            }
            // ── Phase gate ──────────────────────────────────────────────────────────
            // Only begin Phase 2 when ALL Luminary arrivals in the queue are done.
            // While more arrivals remain, keep accumulating so that brand strikes and
            // activation cinematics never overlap summon cutscenes.
            if (arrivalQueue.length > 1) return;
            // ── Phase 2: effects phase — activation cinematic first, then brand strikes ──
            const deferredStrikes = [...deferredBrandStrikesRef.current];
            deferredBrandStrikesRef.current = [];
            // The arrival and its activation can be delivered by different
            // transport frames. Reconcile with the authoritative queue so an
            // effect cannot resolve mechanically while missing Phase 2.
            const deferredActivations = reconcileDeferredLuminaryActivations(
              deferredActivationEventsRef.current,
              state.pendingLuminaryActivationEvents ?? [],
              new Set(activationQueue.map(event => event.eventId)),
            );
            deferredActivationEventsRef.current = [];
            // Fire brand-strike sets sequentially via staggered timeouts. Each set
            // starts only after the previous camera cycle (prepare → beam → aura →
            // restore) is estimated to be fully complete, so they never share the view.
            const CAMERA_SETTLE_MS = 800; // conservative estimate for viewOrchestrator.prepare()
            const fireStrikeSet = (strikes: typeof deferredStrikes) => {
              if (strikes.length === 0) return;
              // Pre-compute total duration and extend the state-update gate so
              // the drain queue does not release new turn state while beams and
              // auras are still animating.
              let totalStrikesMs = 0;
              for (const s of strikes) {
                const lead = (s.srcMeta && s.srcLum && !s.instant) ? SOURCE_PULSE_LEAD_MS : 0;
                // Per-set: camera settle + lead + stagger + aura-complete (1420ms) + buffer (400ms)
                totalStrikesMs += CAMERA_SETTLE_MS + lead + (s.ids.length - 1) * 90 + 1420 + 400;
              }
              if (totalStrikesMs > 0) setAnimEndTime(totalStrikesMs);
              let nextAt = 0;
              for (const s of strikes) {
                const capturedOffset = nextAt;
                const capturedS = s;
                setTimeout(() => {
                  if (capturedS.srcMeta && capturedS.srcLum) {
                    const firstType = capturedS.markers[capturedS.ids[0]]?.type as BrandStrikeTarget['type'] | undefined;
                    const keyword: 'forgotten' | 'condemned' | 'nullified' | 'seeded' =
                      firstType === 'avatar_seed'
                        ? 'seeded'
                        : (firstType as 'forgotten' | 'condemned' | 'nullified');
                    // Center on branded cards only — portal is always visible in the strip.
                    const procedure: AnimationProcedureStep[] = [
                      { type: 'targetClaim', targetIds: capturedS.ids, keyword },
                    ];
                    const lead = capturedS.instant ? 0 : SOURCE_PULSE_LEAD_MS;
                    viewOrchestrator.prepare(procedure, () => {
                      const portalEl = document.querySelector(`[data-luminary-id="${capturedS.srcMeta!.lumId}"]`);
                      let source:
                        | { rect: { x: number; y: number; w: number; h: number }; primary: string; secondary: string }
                        | undefined;
                      if (portalEl && !capturedS.instant) {
                        const pr = portalEl.getBoundingClientRect();
                        if (pr.width > 0) {
                          source = {
                            rect: { x: pr.x, y: pr.y, w: pr.width, h: pr.height },
                            primary: capturedS.srcLum!.summonColor ?? '#a78bfa',
                            secondary: capturedS.srcLum!.summonSecondaryColor ?? capturedS.srcLum!.summonColor ?? '#f0abfc',
                          };
                        }
                      }
                      const usedLead = source ? lead : 0;
                      const strikeId = fireBrandStrikes(capturedS.ids, capturedS.markers, {
                        source,
                        lead: usedLead,
                        orchestrated: true,
                        restoreImmediate: capturedS.instant,
                      });
                      if (!strikeId) {
                        // No DOM targets — unsuppress immediately and release camera.
                        setSuppressedMarkerIds(prev => {
                          const next = new Set(prev);
                          capturedS.ids.forEach(id => next.delete(id));
                          return next;
                        });
                        viewOrchestrator.restore({ immediate: capturedS.instant });
                        return;
                      }
                      // fireBrandStrikes is playing — reveal overlays+badges for these cards.
                      setSuppressedMarkerIds(prev => {
                        const next = new Set(prev);
                        capturedS.ids.forEach(id => next.delete(id));
                        return next;
                      });
                      // Matches onDone timing: maxDelay + 1420ms (aura-complete), plus 400ms buffer.
                      const totalMs = usedLead + (capturedS.ids.length - 1) * 90 + 1420 + 400;
                      setTimeout(() => viewOrchestrator.restore({ immediate: capturedS.instant }), totalMs);
                    }, { forceOrchestrate: true });
                  } else {
                    fireBrandStrikes(capturedS.ids, capturedS.markers);
                    // No camera orchestration — reveal overlays+badges immediately.
                    setSuppressedMarkerIds(prev => {
                      const next = new Set(prev);
                      capturedS.ids.forEach(id => next.delete(id));
                      return next;
                    });
                  }
                }, capturedOffset);
                // Estimate full cycle: camera settle + lead + stagger + aura-complete (1420ms) + buffer (400ms)
                const lead = (s.srcMeta && s.srcLum && !s.instant) ? SOURCE_PULSE_LEAD_MS : 0;
                nextAt += CAMERA_SETTLE_MS + lead + (s.ids.length - 1) * 90 + 1420 + 400;
              }
            };
            // ── Return-flight gate ─────────────────────────────────────────────────
            // When resolveArrival fires, startReturningLuminary mounts
            // LuminaryIdleOverlay and begins the 1200ms return-flight animation:
            // the freed entity flies from viewport centre back to its portal card.
            // The claimed portal/vortex remains visually held until that flight
            // finishes, so the board cannot reveal the awakened state early. If we
            // start the activation cinematic now, both play simultaneously and the
            // vortex collapse is buried under the full-screen cinematic overlay.
            //
            // Fix: extend the drain gate by RETURN_FLIGHT_MS (keeps condemned cards
            // safe during the flight window) and delay Phase 2 dispatch so the
            // activation cinematic only mounts after the entity has settled at its
            // portal.
            //
            const pendingEminenceBurstMs = getPendingLuminaryEminenceBurstMs();
            const postArrivalSettleMs = usesEpicArrival ? 180 : RETURN_FLIGHT_MS;
            setAnimEndTime(postArrivalSettleMs + pendingEminenceBurstMs);
            setTimeout(() => {
              const returningIds = usesEpicArrival ? [] : [...pendingReturnLuminaryIdsRef.current];
              pendingReturnLuminaryIdsRef.current = [];
              finishReturningLuminaries(returningIds);
              releaseSummonActivationLocks(returningIds);
              const arrivalResolutions = pendingArrivalServerResolutionsRef.current.splice(0);
              for (const pending of arrivalResolutions) {
                logArrivalDebug('arrival.resolve-server', pending);
              }
              acknowledgeLuminaryEventsInOrder(
                arrivalResolutions.map(pending => ({
                  type: 'resolve_summon',
                  eventId: pending.eventId,
                })),
              );
              const hasSeedSummonActivation = deferredActivations.some(
                a => a.luminaryId === 'lum_seed' && a.effectType === 'summon',
              );
              // After the Seed Beyond Seasons arrival fully settles, show the
              // deck-seeding flourish only if no activation cue is pending. The
              // normal path runs it from onCinematicComplete so the announcement
              // always precedes the deck branding flourish.
              if (returningIds.includes('lum_seed') && !hasSeedSummonActivation) {
                setAnimEndTime(SEED_EFFECT_TOTAL_MS);
                setShowSeedBoardEffect(true);
              }
              const continueAfterEminenceBurst = () => {
                if (deferredActivations.length > 0) {
                  const { unowned: unownedStrikes } =
                    partitionDeferredBrandStrikesByActivation(
                      deferredStrikes,
                      deferredActivations,
                    );
                  // Matching branding activations own their strikes, marker reveal,
                  // and timing. Only legacy/unmatched marker updates use the fallback
                  // lane; an unrelated first activation must never release them.
                  if (unownedStrikes.length > 0) {
                    fireStrikeSet(unownedStrikes);
                  }
                  setActivationQueue(q => [...q, ...deferredActivations]);
                } else {
                  // No activations pending — fire strikes immediately. The sequence
                  // lease continues to own scroll and restoration through the strikes.
                  fireStrikeSet(deferredStrikes);
                  flushDeferredNormalBurns();
                }
              };
              const eminenceBurstMs = flushPendingLuminaryEminenceBursts();
              if (eminenceBurstMs > 0) {
                const followupTimer = setTimeout(() => {
                  luminaryEminenceBurstTimersRef.current =
                    luminaryEminenceBurstTimersRef.current.filter(timer => timer !== followupTimer);
                  continueAfterEminenceBurst();
                }, eminenceBurstMs);
                luminaryEminenceBurstTimersRef.current.push(followupTimer);
              } else {
                continueAfterEminenceBurst();
              }
            }, postArrivalSettleMs);
          };
          return (
            <div key={entry.eventId}>
              <LuminaryArrivalCutscene
                luminaryId={entry.id}
                luminaryName={entry.name}
                domain={entry.domain}
                eminence={entry.eminence}
                flavor={entry.flavor}
                effectName={state.luminaries.find(l => l.id === entry.id)?.effectName}
                claimedBy={entry.claimedBy}
                cardRect={entry.cardRect}
                boardSnapshot={entry.boardSnapshot}
                cinematicMode={cinematicMode}
                autoSkipAfterMs={
                  devSequencePlaybackActive
                    ? devSequencePlaybackMode === 'instant'
                      ? 160
                      : devSequencePlaybackMode === 'fast'
                        ? 2_400
                        : undefined
                    : undefined
                }
                overrideColor={entry.winSealingColor}
                onSkip={() => {
                  logArrivalDebug('arrival.skip-clicked', {
                    eventId: entry.eventId,
                    luminaryId: entry.id,
                  });
                  gameAudio.stopArrivalCutscene();
                  resolveArrival();
                }}
                onComplete={resolveArrival}
                onFlash={() => {
                  logArrivalDebug('arrival.flash', {
                    eventId: entry.eventId,
                    luminaryId: entry.id,
                  });
                  setFlashLumId(entry.id);
                  // Auto-clear after the flash animation finishes (~0.5 s)
                  setTimeout(() => setFlashLumId(prev => prev === entry.id ? null : prev), 500);
                }}
              />
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Luminary activation cinematic queue — plays one cinematic per effect event.
          These are distinct from the arrival cutscene and gate turn progression.
          Gated on activationGateActive so activation never fires while the
          arrival cutscene, pre-mount arrival work, or return-flight release is still playing.
          Routing:
            • branded effects         → source cinematic, then shared branding director
            • lum_ember + end_of_turn → CinderMandateBurnDirector
            • lum_astral + start      → PhoenixArchiveReturnDirector
            • all others              → shared generic phase cinematic */}
      {!isTutorial &&
        activationQueue.length > 0 &&
        !activationGateActive &&
        !currentActivationBlocked &&
        !activationAftermathBlocked &&
        !delayedLuminaryResultActive &&
        preparedRectDirectorEventId === activationQueue[0].eventId && (() => {
        const evt = activationQueue[0];
        const lum = (state?.luminaries ?? []).find((l: Luminary) => l.id === evt.luminaryId);
        const triggeringPlayer = (state?.players ?? []).find(
          (p: GamePlayerState) => p.playerId === evt.triggeringPlayerId
        );
        const prepareResolution = () => new Promise<void>((resolve) => {
          const procedure = resolveLuminaryProcedure(
            evt.luminaryId,
            evt.effectType as 'summon' | 'action' | 'end_of_turn' | 'start_of_turn',
            state,
            evt.triggeringPlayerId,
            {
              targetCardIds: evt.targetCardIds,
              targetSlotIds: evt.targetSlotIds,
              affinityType: evt.affinityType,
              affinityAmount: evt.affinityAmount,
            },
          );
          let settled = false;
          let fallback: number | undefined;
          const finish = () => {
            if (settled) return;
            settled = true;
            if (fallback !== undefined) window.clearTimeout(fallback);
            resolve();
          };
          fallback = window.setTimeout(finish, 1_400);
          viewOrchestrator.prepare(
            procedure,
            finish,
            activationDirectorForcesCamera(evt.luminaryId, evt.effectType)
              ? { forceOrchestrate: true }
              : undefined,
          );
        });
        return (
          <ActivationDirectorRouter
            key={evt.eventId}
            evt={evt}
            lum={lum}
            triggeringPlayer={triggeringPlayer}
            state={state}
            abridgedAnims={abridgedAnims}
            playbackMode={effectiveLuminaryPlaybackMode}
            activationTimelineRate={effectiveLuminaryTimelineRate}
            pendingBurnSlots={pendingDirectorBurnSlotsRef.current}
            ironHarbingerSlots={pendingIronHarbingerSlotsRef.current}
            phoenixRefillSlots={pendingPhoenixRefillSlotsRef.current}
            assimilationSlot={pendingAssimilationSlotRef.current}
            queuePosition={activationSequenceProgress.position}
            queueTotal={activationSequenceProgress.total}
            prepareResolution={prepareResolution}
            onResolutionStart={() => {
              flushDeferredNormalBurnsForActivation(evt);
            }}
            brandingActions={{
              prepare: (_procedure, onSettled) => onSettled?.(),
              // Compatibility callbacks remain for the director API, but global
              // scroll ownership belongs exclusively to the sequence lease.
              lockBoardScroll: () => undefined,
              unlockBoardScroll: () => undefined,
              setAnimEndTime: (durationMs) => {
                activationAftermathOwnerEventIdRef.current = evt.eventId;
                setAnimEndTime(durationMs);
              },
              unsuppressMarkers: (ids) => {
                setSuppressedMarkerIds(prev => {
                  if (prev.size === 0) return prev;
                  const next = new Set(prev);
                  ids.forEach(id => next.delete(id));
                  return next;
                });
              },
              fireBrandStrikes,
            }}
            onBrandingComplete={(skipped) => {
              const isFinalQueuedActivation = activationQueue.length <= 1;
              publishLuminaryEffectReceipt(evt, lum, triggeringPlayer);
              // Restore camera (un-compact if view was normal before the director ran)
              viewOrchestrator.restore({ immediate: skipped });
              setActivationQueue(q => q.slice(1));
              setPreparedRectDirectorEventId(null);
              queueActivationServerResolution(evt.eventId);
              // Safety: unsuppress any target IDs that may still be in the set
              const safetyIds = evt.targetCardIds;
              if (safetyIds && safetyIds.length > 0) {
                setSuppressedMarkerIds(prev => {
                  if (prev.size === 0) return prev;
                  const next = new Set(prev);
                  safetyIds.forEach(id => next.delete(id));
                  return next;
                });
              }
              if (isFinalQueuedActivation) {
                flushDeferredNormalBurns();
              }
            }}
            burnActions={{
              prepare: (_procedure, onSettled) => onSettled?.(),
              restore: viewOrchestrator.restore,
              lockBoardScroll: () => undefined,
              unlockBoardScroll: () => undefined,
              setAnimEndTime: (durationMs) => {
                activationAftermathOwnerEventIdRef.current = evt.eventId;
                setAnimEndTime(durationMs);
              },
              onSetCondemnedGhosts: (entries) => {
                // Add condemned cards as ghost cards so BurnFlash fires over the
                // correct card art instead of the replacement card or a placeholder.
                directorGhostSlotKeysRef.current = entries.map(e => e.slotKey);
                setBurstGhostCards(prev => {
                  const n = { ...prev };
                  entries.forEach(({ slotKey, card }) => { n[slotKey] = card; });
                  return n;
                });
              },
              onHideSlots: (slotKeys) => {
                setHiddenSlots(new Set(slotKeys));
              },
              onBurnFlash: (entry) => {
                setBurnFlashes(pf => [...pf, entry]);
              },
              onBurnChipPulse: () => {
                void burnChipAnim.start({
                  filter: ['brightness(1)', 'brightness(3)', 'brightness(1.5)', 'brightness(1)'],
                  transition: { duration: 0.65, times: [0, 0.15, 0.45, 1], ease: 'easeOut' },
                });
              },
              onBurnPileParticle: (fromRect, toRect) => {
                setBurnPileParticles(pf => [
                  ...pf,
                  { id: `bpart-director-${Date.now()}`, from: fromRect, to: toRect },
                ]);
                // Chip arrival flash + landing sparks fires when fragment reaches chip
                setTimeout(() => {
                  void burnChipArrivalAnim.start({
                    scale: [1.45, 1],
                    opacity: [0.9, 0],
                    transition: { duration: 0.18, ease: 'easeOut' },
                  });
                  setBurnChipSparks(pf => [
                    ...pf,
                    { id: `bspark-director-${Date.now()}`, chipRect: toRect, angleSeed: Math.random() * Math.PI * 2 },
                  ]);
                }, 780);
              },
              onRefillPulse: (slotKeys) => {
                // Clear condemned ghost cards before revealing replacements.
                const ghostKeys = directorGhostSlotKeysRef.current;
                if (ghostKeys.length > 0) {
                  setBurstGhostCards(prev => {
                    const n = { ...prev };
                    ghostKeys.forEach(k => delete n[k]);
                    return n;
                  });
                  directorGhostSlotKeysRef.current = [];
                }

                const castEntries = slotKeys.flatMap((slotKey) => {
                  const [tierStr, idxStr] = slotKey.split('-');
                  const tier = parseInt(tierStr, 10) as 1 | 2 | 3;
                  const idx = parseInt(idxStr, 10);
                  const forgeRow = tier === 1 ? state?.forgeTier1 : tier === 2 ? state?.forgeTier2 : state?.forgeTier3;
                  const newCard = forgeRow?.[idx] ?? null;
                  return newCard ? [{ card: newCard, tier, slotKey }] : [];
                });

                if (castEntries.length > 0) {
                  beginMoldCasting(castEntries, 'burn');
                }
              },
              playCardBurn: (index, total) => gameAudio.playCardBurn(index, total),
            }}
            ironHarbingerActions={{
              prepare: (_procedure, onSettled) => onSettled?.(),
              setAnimEndTime: (durationMs) => {
                activationAftermathOwnerEventIdRef.current = evt.eventId;
                setAnimEndTime(durationMs);
              },
              onLiftSlots: (slotKeys) => {
                const keySet = new Set(slotKeys);
                setIronHarbingerGhostIds(current => {
                  const next = { ...current };
                  slotKeys.forEach(key => delete next[key]);
                  return next;
                });
                setBurstGhostCards(current => {
                  const next = { ...current };
                  slotKeys.forEach(key => delete next[key]);
                  return next;
                });
                setHiddenSlots(current => new Set([...current, ...keySet]));
              },
              onCastSlots: (slotKeys, staggerMs) => {
                const castEntries = slotKeys.flatMap((slotKey) => {
                  const [tierText, indexText] = slotKey.split('-');
                  const tier = Number(tierText) as 1 | 2 | 3;
                  const slotIndex = Number(indexText);
                  const row = tier === 1
                    ? state?.forgeTier1
                    : tier === 2
                      ? state?.forgeTier2
                      : state?.forgeTier3;
                  const card = row?.[slotIndex] ?? null;
                  return card ? [{ card, tier, slotKey }] : [];
                });
                if (castEntries.length > 0) {
                  beginMoldCasting(castEntries, 'impact_extinction', {
                    staggerMs,
                  });
                }
              },
              onFinish: (slotKeys) => {
                const keySet = new Set(slotKeys);
                setIronHarbingerGhostIds(current => {
                  const next = { ...current };
                  slotKeys.forEach(key => delete next[key]);
                  return next;
                });
                setBurstGhostCards(current => {
                  const next = { ...current };
                  slotKeys.forEach(key => delete next[key]);
                  return next;
                });
                setHiddenSlots(current => {
                  if (![...keySet].some(key => current.has(key))) return current;
                  const next = new Set(current);
                  keySet.forEach(key => next.delete(key));
                  return next;
                });
                ironHarbingerGhostSlotKeysRef.current = [];
                pendingIronHarbingerSlotsRef.current = [];
              },
              playShuffle: () => gameAudio.playCardFlip(),
              playArchiveImpact: () => gameAudio.playImpactExtinctionArchive(),
            }}
            onRevealPhoenixRefills={(slotKeys, staggerMs, immediate) => {
              pendingPhoenixRefillSlotsRef.current = [];
              if (immediate) {
                setHiddenSlots(current => {
                  const next = new Set(current);
                  slotKeys.forEach(slotKey => next.delete(slotKey));
                  return next;
                });
                return;
              }
              const castEntries = slotKeys.flatMap((slotKey) => {
                const [tierText, indexText] = slotKey.split('-');
                const tier = Number(tierText) as 1 | 2 | 3;
                const slotIndex = Number(indexText);
                const row = tier === 1
                  ? state?.forgeTier1
                  : tier === 2
                    ? state?.forgeTier2
                    : state?.forgeTier3;
                const card = row?.[slotIndex] ?? null;
                return card ? [{ card, tier, slotKey }] : [];
              });
              const castSlotKeys = new Set(castEntries.map(({ slotKey }) => slotKey));
              const castingStarted = castEntries.length > 0
                && beginMoldCasting(castEntries, 'recurrence', { staggerMs });

              // A late or incomplete server update must never leave a mold hidden.
              if (!castingStarted || castEntries.length !== slotKeys.length) {
                setHiddenSlots(current => {
                  const next = new Set(current);
                  slotKeys.forEach(slotKey => {
                    if (!castingStarted || !castSlotKeys.has(slotKey)) next.delete(slotKey);
                  });
                  return next;
                });
              }
            }}
            assimilationActions={{
              takeOverSlot: (slotKey) => {
                setBurstGhostCards(current => {
                  if (!current[slotKey]) return current;
                  const next = { ...current };
                  delete next[slotKey];
                  return next;
                });
                setHiddenSlots(current => new Set([...current, slotKey]));
              },
              revealReplacement: (slotKey, tier, immediate) => {
                setBurstGhostCards(current => {
                  if (!current[slotKey]) return current;
                  const next = { ...current };
                  delete next[slotKey];
                  return next;
                });
                pendingAssimilationSlotRef.current = null;
                const slotIndex = Number(slotKey.split('-')[1]);
                const row = tier === 1
                  ? state?.forgeTier1
                  : tier === 2
                    ? state?.forgeTier2
                    : state?.forgeTier3;
                const replacement = row?.[slotIndex] ?? null;
                if (immediate || !replacement) {
                  setHiddenSlots(current => {
                    if (!current.has(slotKey)) return current;
                    const next = new Set(current);
                    next.delete(slotKey);
                    return next;
                  });
                  return;
                }
                setHiddenSlots(current => new Set([...current, slotKey]));
                if (!dealReplacementIntoSlot(replacement, tier, slotKey, 'assimilate')) {
                  setHiddenSlots(current => {
                    const next = new Set(current);
                    next.delete(slotKey);
                    return next;
                  });
                }
              },
              playAffinityAbsorb: (affinity) => {
                gameAudio.playAssimilationAbsorb(affinity);
              },
            }}
            onBurnComplete={() => {
              const isFinalQueuedActivation = activationQueue.length <= 1;
              publishLuminaryEffectReceipt(evt, lum, triggeringPlayer);
              // Director already called restore() internally at the end of its timeline.
              // Safety: clear ghost cards and hidden slots in case onRefillPulse was
              // skipped (reduced motion / empty slot path).
              // NOTE: do NOT clear pendingDirectorBurnSlotsRef here. If a second Cinder
              // Mandate state update arrived while this director was still running,
              // processUpdate has already reset and repopulated the ref for the next
              // batch. Wiping it here would erase those slots before the second director
              // mounts, causing it to fire BurnFlash on an empty list.
              // processUpdate owns the ref reset (pendingDirectorBurnSlotsRef.current = [])
              // at the start of every new lum_ember burn batch — no cleanup needed here.
              const ghostKeys = directorGhostSlotKeysRef.current;
              if (ghostKeys.length > 0) {
                setBurstGhostCards(prev => {
                  const n = { ...prev };
                  ghostKeys.forEach(k => delete n[k]);
                  return n;
                });
                directorGhostSlotKeysRef.current = [];
              }
              setHiddenSlots(new Set());
              setActivationQueue(q => q.slice(1));
              setPreparedRectDirectorEventId(null);
              queueActivationServerResolution(evt.eventId);
              if (isFinalQueuedActivation) {
                flushDeferredNormalBurns();
              }
            }}
            onCinematicComplete={(skipped) => {
              publishLuminaryEffectReceipt(evt, lum, triggeringPlayer);
              const isFinalQueuedActivation = activationQueue.length <= 1;
              viewOrchestrator.restore({ immediate: skipped });
              setActivationQueue(q => q.slice(1));
              setPreparedRectDirectorEventId(null);
              queueActivationServerResolution(evt.eventId);
              const safetyUnsuppressIds = evt.targetCardIds;
              if (safetyUnsuppressIds && safetyUnsuppressIds.length > 0) {
                setSuppressedMarkerIds(prev => {
                  const next = new Set(prev);
                  safetyUnsuppressIds.forEach(id => next.delete(id));
                  return next;
                });
              }
              if (isFinalQueuedActivation) {
                flushDeferredNormalBurns();
              }
            }}
          />
        );
      })()}

      {luminaryEffectReceipts.length > 0 && (
        <LuminaryEffectResultReceipt
          receipts={luminaryEffectReceipts}
          activeSequence={luminaryPresentationActive}
          onDismiss={() => setLuminaryEffectReceipts([])}
        />
      )}

      {/* "Waiting" chip shown when the user has skipped their local view but
          the arrival is still globally resolving (cutscene timer still running). */}
      {localArrivalSkipped && arrivalQueue.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9001] flex items-center gap-2 bg-black/88 text-white/75 text-xs px-4 py-2 rounded-full border border-white/15 pointer-events-none select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          <span>Arrival in progress…</span>
        </div>
      )}

      {/* Return-flight entity overlays. Settled claimed cards render their own
          embedded entity, so keeping the old persistent overlay mounted would
          double the Luminary over the same panel. */}
      {Array.from(new Set(returningLuminaryIds)).map(lumId => {
        const lumAff = state?.luminaryAffinities?.find(
          (la: LuminaryActiveState) => la.luminaryId === lumId
        );
        const isReturning = returningLuminaryIds.includes(lumId);
        const isMultiEligible = (lumAff?.eligibleAffinities?.length ?? 0) >= 2;
        const activeAffinityColor = isMultiEligible && lumAff?.activeAffinity
          ? AFFINITY_KEY_TO_HEX[lumAff.activeAffinity] ?? undefined
          : undefined;
        return (
          <LuminaryIdleOverlay
            key={lumId}
            luminaryId={lumId}
            frozen={arrivalQueue.length > 0}
            hidden={activeTab !== 'board' || arrivalQueue.length > 0}
            skipReturnFlight={!isReturning}
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
          nudgeTick={tutorialNudgeTick}
        />
      )}
      {isGuidedMatch && !isTutorial && (
        <LumiiGuidedMatch
          state={state}
          sessionPlayerId={session?.playerId ?? ''}
        />
      )}

      {/* Compact Forge ghost, independent of the flippingCards lifecycle. */}
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
      {activeDelayedEffectFloat && usesControlledEminenceBestowal(activeDelayedEffectFloat.luminaryId) ? (
        <LuminaryEminenceBurst
          key={activeDelayedEffectFloat.id}
          amount={activeDelayedEffectFloat.amount}
          color={activeDelayedEffectFloat.color}
          secondaryColor={activeDelayedEffectFloat.secondaryColor}
          luminaryName={activeDelayedEffectFloat.luminaryName ?? 'Luminary'}
          playerName={activeDelayedEffectFloat.playerName ?? 'Allied player'}
          originRect={activeDelayedEffectFloat.originRect}
          targetRect={activeDelayedEffectFloat.targetRect}
          reducedMotion={abridgedAnims}
          onDone={() => setActiveDelayedEffectFloat(null)}
        />
      ) : activeDelayedEffectFloat ? (
        <DelayedEffectFloat
          key={activeDelayedEffectFloat.id}
          amount={activeDelayedEffectFloat.amount}
          color={activeDelayedEffectFloat.color}
          label={activeDelayedEffectFloat.label}
          originRect={activeDelayedEffectFloat.originRect}
          onDone={() => setActiveDelayedEffectFloat(null)}
        />
      ) : null}
      {luminaryEminenceBurst && (
        <LuminaryEminenceBurst
          key={luminaryEminenceBurst.key}
          amount={luminaryEminenceBurst.amount}
          color={luminaryEminenceBurst.color}
          secondaryColor={luminaryEminenceBurst.secondaryColor}
          luminaryName={luminaryEminenceBurst.luminaryName}
          playerName={luminaryEminenceBurst.playerName}
          originRect={luminaryEminenceBurst.originRect}
          targetRect={luminaryEminenceBurst.targetRect}
          reducedMotion={abridgedAnims}
          onDone={() => {
            const burstKey = luminaryEminenceBurst.key;
            setLuminaryEminenceBurst(prev => prev?.key === burstKey ? null : prev);
          }}
        />
      )}
      {/* ── v0.8 Bloom seed particles (per burn while Bloom is claimed) ── */}
      {bloomSeedParticles.map(p => (
        <BloomSeedParticle
          key={p.id}
          from={p.from}
          to={p.to}
          onDone={() => setBloomSeedParticles(pf => pf.filter(x => x.id !== p.id))}
        />
      ))}
      {/* ── Burn pile particles — charred card fragment arcs to the 🔥 chip ── */}
      {burnPileParticles.map(p => (
        <BurnPileParticle
          key={p.id}
          from={p.from}
          to={p.to}
          onDone={() => setBurnPileParticles(pf => pf.filter(x => x.id !== p.id))}
        />
      ))}
      {/* ── Eternal Recurrence — identifiable Artifact returns to its Archive ── */}
      {archiveReturnParticles.map(p => (
        <ArchiveReturnParticle
          key={p.id}
          cardId={p.cardId}
          from={p.from}
          to={p.to}
          onDone={() => setArchiveReturnParticles(pf => pf.filter(x => x.id !== p.id))}
        />
      ))}
      {/* ── Landing sparks — tiny orange burst when fragment arrives at chip ── */}
      {burnChipSparks.map(s => (
        <BurnChipLandingSpark
          key={s.id}
          chipRect={s.chipRect}
          angleSeed={s.angleSeed}
          onDone={() => setBurnChipSparks(pf => pf.filter(x => x.id !== s.id))}
        />
      ))}
      {/* ── v0.8 The Glass Orchard copy pulse ── */}
      <OrchardCopyPulse
        originRect={orchardPortalRectRef.current}
        pulseKey={orchardCopyPulseKey}
      />
      {/* ── Seed Beyond Seasons board-level seeding flourish ──
          Plays after the arrival cutscene resolves for lum_seed.
          Renders at normal board scale (no dimming, no entity overlay). */}
      {showSeedBoardEffect && (
        <SeedBeyondSeasonsEffect
          moldSlots={state?.avatarSeedMoldSlots ?? []}
          onComplete={() => setShowSeedBoardEffect(false)}
        />
      )}
      {/* ── v0.8 Arrival brand beam strikes (lightning → large icon → persistent badge) ── */}
      {brandStrikes.map(b => (
        <ArrivalBrandStrike
          key={b.id}
          strikes={b.strikes}
          source={b.source}
          onFirstImpact={() => playMarkerStrikeSound(b.strikes[0]?.type)}
          onDone={() => {
            setBrandStrikes(prev => prev.filter(x => x.id !== b.id));
            // Release the camera if this strike orchestrated it. restore() is idempotent
            // with the safety timeout, so a second call is a harmless no-op.
            if (b.orchestrated) viewOrchestrator.restore({ immediate: b.restoreImmediate });
          }}
        />
      ))}
      {/* ── Source trace-back glow: highlights the originating Luminary portal while a
            persistent-marker badge is hovered/focused. boxShadow only — no blur, no scale. ── */}
      {tracedSourceLumId && (() => {
        const portalEl = document.querySelector(`[data-luminary-id="${tracedSourceLumId}"]`);
        if (!portalEl) return null;
        const r = portalEl.getBoundingClientRect();
        if (r.width === 0) return null;
        const lum = state?.luminaries?.find(l => l.id === tracedSourceLumId);
        const color = lum?.summonColor ?? '#a78bfa';
        return (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: r.x - 6,
              top: r.y - 6,
              width: r.width + 12,
              height: r.height + 12,
              borderRadius: 16,
              pointerEvents: 'none',
              zIndex: 60,
              boxShadow: `0 0 0 2px ${color}, 0 0 20px 5px ${color}aa, inset 0 0 16px 3px ${color}55`,
            }}
          />
        );
      })()}
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
              width: handTabAbsorbFlash.size ?? 52,
              height: handTabAbsorbFlash.isCivilization ? (handTabAbsorbFlash.size ?? 52) * 0.62 : (handTabAbsorbFlash.size ?? 52),
              borderRadius: handTabAbsorbFlash.isCivilization ? 24 : '50%',
              border: `2px solid ${handTabAbsorbFlash.color}`,
              boxShadow: handTabAbsorbFlash.isCivilization ? `0 0 24px 5px ${handTabAbsorbFlash.color}66` : undefined,
            }}
            initial={{ scale: handTabAbsorbFlash.isCivilization ? 0.45 : 0.3, opacity: 0.9 }}
            animate={{ scale: handTabAbsorbFlash.isCivilization ? 1.9 : 2.2, opacity: 0 }}
            exit={{}}
            transition={{ duration: handTabAbsorbFlash.isCivilization ? 0.82 : 0.55, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
