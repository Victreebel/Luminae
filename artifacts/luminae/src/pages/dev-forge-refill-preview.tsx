import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ArtifactCard, GameState } from "@workspace/api-client-react";
import { ARTIFACT_CATALOG } from "@workspace/game-types";
import { useReducedMotion } from "framer-motion";
import { ForgeReplacementDealAnimation, REPLACEMENT_DEAL_DURATION_MS, REDUCED_REPLACEMENT_DEAL_DURATION_MS } from "@/components/ForgeReplacementDealAnimation";
import { AFFINITY_KEYS, type AffinityKey } from "@/lib/affinityMeta";
import { gameAudio, type ForgeRefillSound } from "@/lib/audio";
import { FORGE_REFILL_STAGGER_MS } from "@/lib/forgeRefillTiming";
import { CARD_NAME_FALLBACK } from "@/lib/cardNameFallback";
import { BoardForge } from "./game-board-forge";
import { CompactForgeCardReadout } from "./game-board-forge-card-slot";
import { ArtifactCardView } from "./game-card";
import { useBoardLayoutPolicy } from "./game-layout";
import type { CostMode } from "./game-types";
import { MOCK_PROCEDURE_STATES } from "./mockProcedureStates";
import "./dev-forge-refill-preview.css";

const PREVIEW_CHANNEL = "luminae-forge-mobile-preview";
const MOBILE_WIDTH = 390;
const MOBILE_HEIGHT = 844;
const EMPTY_IDS = new Set<string>();
const NOOP = () => {};
export const FORGE_PREVIEW_STAGGER_MS = FORGE_REFILL_STAGGER_MS;

type SlotRect = { x: number; y: number; w: number; h: number };

export interface ForgePreviewConfig {
  tier: 1 | 2 | 3;
  affinity: AffinityKey;
  frame: "full" | "compact";
  playbackRate: number;
  animKey: number;
  phase: "empty" | "filling" | "solid";
  refillMode: "single" | "all";
  soundEnabled: boolean;
}

function previewSlotKeys(tier: ForgePreviewConfig["tier"], refillMode: ForgePreviewConfig["refillMode"]): string[] {
  const selected = `${tier}-0`;
  return refillMode === "single" ? [selected] : [
    selected,
    ...[3, 2, 1].flatMap(tier => [0, 1, 2, 3].map(index => `${tier}-${index}`)).filter(key => key !== selected),
  ];
}

function readInitialConfig(): ForgePreviewConfig {
  const params = new URLSearchParams(window.location.search);
  const tier = Number(params.get("tier"));
  const affinity = AFFINITY_KEYS.find(key => key === params.get("affinity"));
  return {
    tier: tier === 2 || tier === 3 ? tier : 1,
    affinity: affinity ?? "flare",
    frame: params.get("frame") === "compact" ? "compact" : "full",
    playbackRate: Math.max(.1, Number(params.get("rate")) || 1),
    animKey: 0,
    phase: params.get("play") === "1" ? "filling" : "empty",
    refillMode: params.get("batch") === "1" ? "all" : "single",
    soundEnabled: params.get("sound") !== "0",
  };
}

function catalogCard(tier: number, affinity: AffinityKey): ArtifactCard {
  const definition = ARTIFACT_CATALOG.find(card => card.tier === tier && card.bonusAffinity === affinity)
    ?? ARTIFACT_CATALOG.find(card => card.tier === tier)!;
  return { ...definition, name: CARD_NAME_FALLBACK[definition.id] ?? definition.id, flavor: "" };
}

/** A real browsing context keeps vw units and mobile media queries identical to a phone. */
export function ForgeMobilePreviewFrame({ config, onComplete, onFrameChange, onReplay }: {
  config: ForgePreviewConfig;
  onComplete: () => void;
  onFrameChange: (frame: "full" | "compact") => void;
  onReplay: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const startFrameRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [slotSize, setSlotSize] = useState<string>("");
  const soundRef = useRef(new Map<string, ForgeRefillSound>());
  const startedKeyRef = useRef<number | null>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const currentRef = useRef({ config, onComplete, onFrameChange });
  currentRef.current = { config, onComplete, onFrameChange };
  const reducedMotionRef = useRef(reduceMotion);
  reducedMotionRef.current = reduceMotion;

  function sendConfig() {
    iframeRef.current?.contentWindow?.postMessage({ channel: PREVIEW_CHANNEL, type: "configure", config: currentRef.current.config }, window.location.origin);
  }

  useLayoutEffect(() => () => {
    if (startFrameRef.current !== null) cancelAnimationFrame(startFrameRef.current);
    soundRef.current.forEach(sound => sound.cancel());
    soundRef.current.clear();
    startedKeyRef.current = null;
  }, [config.animKey, config.phase, config.soundEnabled, config.frame, config.tier, config.affinity, config.playbackRate, config.refillMode]);

  useEffect(() => { sendConfig(); }, [config]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, viewport.clientWidth / MOBILE_WIDTH)));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow || event.data?.channel !== PREVIEW_CHANNEL) return;
      if (event.data.type === "ready") sendConfig();
      if (event.data.type === "prepared" && event.data.animKey === currentRef.current.config.animKey && currentRef.current.config.phase === "filling") {
        const iframe = iframeRef.current;
        const target = targetRef.current;
        if (!iframe || !target) return;
        const ratio = iframe.getBoundingClientRect().width / MOBILE_WIDTH;
        const { x, y, w, h } = event.data.rect;
        Object.assign(target.style, {
          left: `${x * ratio}px`, top: `${y * ratio}px`,
          width: `${w * ratio}px`, height: `${h * ratio}px`,
        });
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
        if (startFrameRef.current !== null) cancelAnimationFrame(startFrameRef.current);
        const animKey = event.data.animKey;
        startFrameRef.current = requestAnimationFrame(() => {
          if (currentRef.current.config.animKey !== animKey || currentRef.current.config.phase !== "filling") return;
          if (startedKeyRef.current === animKey) return;
          startedKeyRef.current = animKey;
          const current = currentRef.current.config;
          if (current.soundEnabled) {
            const durationMs = Math.round((reducedMotionRef.current ? REDUCED_REPLACEMENT_DEAL_DURATION_MS : REPLACEMENT_DEAL_DURATION_MS) / current.playbackRate);
            previewSlotKeys(current.tier, current.refillMode).forEach((slotKey, index) => {
              soundRef.current.set(slotKey, gameAudio.startForgeRefill({ durationMs, delayMs: index * FORGE_PREVIEW_STAGGER_MS / current.playbackRate }));
            });
          }
          iframe.contentWindow?.postMessage({ channel: PREVIEW_CHANNEL, type: "start", animKey }, window.location.origin);
        });
      }
      if (event.data.type === "slot-reveal" && event.data.animKey === currentRef.current.config.animKey) {
        soundRef.current.get(event.data.slotKey)?.reveal();
      }
      if (event.data.type === "slot-complete" && event.data.animKey === currentRef.current.config.animKey) {
        soundRef.current.get(event.data.slotKey)?.complete();
        soundRef.current.delete(event.data.slotKey);
      }
      if (event.data.type === "complete" && event.data.animKey === currentRef.current.config.animKey && currentRef.current.config.phase === "filling") currentRef.current.onComplete();
      if (event.data.type === "frame" && (event.data.frame === "full" || event.data.frame === "compact")) currentRef.current.onFrameChange(event.data.frame);
      if (event.data.type === "size") setSlotSize(`${Math.round(event.data.width)} × ${Math.round(event.data.height)} px slot`);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  return (
    <div className="forge-mobile-preview">
      <div className="forge-mobile-preview__caption">
        <div className="forge-mobile-preview__details">
          <span>Mobile {config.frame} · 390 × 844</span>
          <span>{slotSize || "Actual game layout"}</span>
        </div>
        <button type="button" className="forge-mobile-preview__replay" onClick={onReplay}>Replay refill</button>
      </div>
      <div className="forge-mobile-preview__viewport" ref={viewportRef} style={{ height: MOBILE_HEIGHT * scale }}>
        <iframe
          ref={iframeRef}
          title={`Actual mobile Forge in ${config.frame} view`}
          src={`${window.location.pathname}?forgeMobilePreview=1`}
          width={MOBILE_WIDTH}
          height={MOBILE_HEIGHT}
          allow="autoplay"
          onLoad={sendConfig}
          style={{ transform: `scale(${scale})` }}
        />
        <div ref={targetRef} className="forge-mobile-preview__target" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Dev-only child route; it renders the production Forge and its production slots. */
export function ForgeMobilePreviewPage() {
  const [config, setConfig] = useState(readInitialConfig);
  const [phase, setPhase] = useState<ForgePreviewConfig["phase"]>(config.phase === "filling" ? "empty" : config.phase);
  const configRef = useRef(config);
  const startedKeyRef = useRef<number | null>(null);
  configRef.current = config;
  const [costMode, setCostMode] = useState<CostMode>("printed");
  const [slotRects, setSlotRects] = useState<Record<string, SlotRect>>({});
  const [completedSlots, setCompletedSlots] = useState(EMPTY_IDS);
  const completedSlotsRef = useRef(new Set<string>());
  const [revealedSlots, setRevealedSlots] = useState(EMPTY_IDS);
  const revealedSlotsRef = useRef(new Set<string>());
  const shellRef = useRef<HTMLDivElement>(null);
  const ghostMarkerTypesRef = useRef(new Map<string, string>());
  const policy = useBoardLayoutPolicy();
  const compact = config.frame === "compact";
  const targetSlotKey = `${config.tier}-0`;
  const targetCard = useMemo(() => catalogCard(config.tier, config.affinity), [config.tier, config.affinity]);
  const state = useMemo<GameState>(() => {
    const cards = (tier: number) => {
      const first = tier === config.tier ? targetCard : catalogCard(tier, "flare");
      const neighbors = ["continuum", "verdance", "radiance", "abyss", "flare"] as AffinityKey[];
      return [first, ...neighbors.filter(affinity => affinity !== first.bonusAffinity).slice(0, 3).map(affinity => catalogCard(tier, affinity))];
    };
    return {
      ...MOCK_PROCEDURE_STATES.lum_moth.state,
      forgeTier1: cards(1), forgeTier2: cards(2), forgeTier3: cards(3),
      deckCounts: Object.fromEntries(([1, 2, 3] as const).map(tier => [
        `tier${tier}`,
        10 - (phase === "empty" ? 0 : config.refillMode === "all" ? 4 : config.tier === tier ? 1 : 0),
      ])) as GameState["deckCounts"],
      artifactMarkers: {}, avatarSeedMoldSlots: [], burnPile: [],
    };
  }, [config.tier, config.refillMode, phase, targetCard]);
  const slots = useMemo(() => previewSlotKeys(config.tier, config.refillMode).map(slotKey => {
    const [tier, index] = slotKey.split("-").map(Number);
    const cards = tier === 3 ? state.forgeTier3 : tier === 2 ? state.forgeTier2 : state.forgeTier1;
    return { slotKey, tier, card: cards[index]! };
  }), [config.refillMode, config.tier, state]);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.channel !== PREVIEW_CHANNEL) return;
      if (event.data.type === "start") {
        if (event.data.animKey === configRef.current.animKey && configRef.current.phase === "filling" && startedKeyRef.current !== event.data.animKey) {
          startedKeyRef.current = event.data.animKey;
          setPhase("filling");
        }
      }
      if (event.data.type === "configure") {
        const next = event.data.config as ForgePreviewConfig;
        const current = configRef.current;
        // onLoad and ready can both deliver the same request. Do not restart it.
        if (next.animKey === current.animKey && next.phase === current.phase && next.frame === current.frame && next.tier === current.tier && next.affinity === current.affinity && next.playbackRate === current.playbackRate && next.refillMode === current.refillMode && next.soundEnabled === current.soundEnabled) return;
        configRef.current = next;
        setConfig(next);
        startedKeyRef.current = null;
        setPhase(next.phase === "filling" ? "empty" : next.phase);
      }
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ channel: PREVIEW_CHANNEL, type: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  useLayoutEffect(() => {
    completedSlotsRef.current = new Set();
    setCompletedSlots(EMPTY_IDS);
    revealedSlotsRef.current = new Set();
    setRevealedSlots(EMPTY_IDS);
    if (config.phase !== "filling") return;
    const element = shellRef.current?.querySelector<HTMLElement>(`[data-slot-key="${targetSlotKey}"]`);
    if (!element) return;
    // Scroll only inside the phone. scrollIntoView can also scroll the parent
    // browsing context and race its attempt to center the animation.
    element.closest(".board-forge-card-row")?.scrollTo({ left: 0, behavior: "instant" });
    const before = element.getBoundingClientRect();
    if (before.top < 0 || before.bottom > window.innerHeight) {
      window.scrollBy({ top: before.top + before.height / 2 - window.innerHeight / 2, behavior: "instant" });
    }
    const rect = element.getBoundingClientRect();
    if (window.parent === window) {
      startedKeyRef.current = config.animKey;
      setPhase("filling");
    } else {
      window.parent.postMessage({
        channel: PREVIEW_CHANNEL, type: "prepared", animKey: config.animKey,
        rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      }, window.location.origin);
    }
  }, [config.animKey, config.phase, config.frame, config.affinity, config.playbackRate, config.refillMode, targetSlotKey]);

  useLayoutEffect(() => {
    const elements = slots.map(slot => ({ ...slot, element: shellRef.current?.querySelector<HTMLElement>(`[data-slot-key="${slot.slotKey}"]`) })).filter(slot => slot.element);
    const measure = () => {
      const rects: Record<string, SlotRect> = {};
      for (const { slotKey, element } of elements) {
        const rect = element!.getBoundingClientRect();
        rects[slotKey] = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      }
      setSlotRects(rects);
      const rect = rects[targetSlotKey];
      if (rect) window.parent.postMessage({ channel: PREVIEW_CHANNEL, type: "size", width: rect.w, height: rect.h }, window.location.origin);
    };
    measure();
    const observer = new ResizeObserver(measure);
    elements.forEach(({ element }) => observer.observe(element!));
    window.addEventListener("resize", measure);
    document.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("scroll", measure, true);
    };
  }, [slots, targetSlotKey, compact]);

  function revealSlot(slotKey: string) {
    if (revealedSlotsRef.current.has(slotKey)) return;
    revealedSlotsRef.current.add(slotKey);
    setRevealedSlots(new Set(revealedSlotsRef.current));
    window.parent.postMessage({ channel: PREVIEW_CHANNEL, type: "slot-reveal", animKey: config.animKey, slotKey }, window.location.origin);
  }

  function completeSlot(slotKey: string) {
    if (completedSlotsRef.current.has(slotKey)) return;
    revealSlot(slotKey);
    completedSlotsRef.current.add(slotKey);
    setCompletedSlots(new Set(completedSlotsRef.current));
    window.parent.postMessage({ channel: PREVIEW_CHANNEL, type: "slot-complete", animKey: config.animKey, slotKey }, window.location.origin);
    if (completedSlotsRef.current.size === slots.length) {
      setPhase("solid");
      window.parent.postMessage({ channel: PREVIEW_CHANNEL, type: "complete", animKey: config.animKey }, window.location.origin);
    }
  }

  const setCompact: React.Dispatch<React.SetStateAction<boolean>> = next => {
    const value = typeof next === "function" ? next(compact) : next;
    const frame = value ? "compact" : "full";
    setConfig(current => ({ ...current, frame, phase: "empty" }));
    setPhase("empty");
    window.parent.postMessage({ channel: PREVIEW_CHANNEL, type: "frame", frame }, window.location.origin);
  };
  const boardAttributes = {
    "data-board-presentation": "celestial",
    "data-board-layout": policy.layout,
    "data-board-density": policy.density,
    "data-board-viewport": policy.viewportClass,
    "data-forge-density": config.frame,
  };

  return (
    <div ref={shellRef} className="game-shell forge-mobile-scene bg-background text-foreground" {...boardAttributes}>
      <div className="forge-mobile-scene__status" aria-live="polite">
        <span>{phase === "empty" ? "Recessed mold · ready to fill" : phase === "filling" ? (config.refillMode === "all" ? `Casting ${slots.length - completedSlots.size} Artifacts…` : "Casting the Artifact…") : config.refillMode === "all" ? "All 12 Artifacts formed" : targetCard.name}</span>
        <span>{config.refillMode === "all" ? "All slots" : `Tier ${config.tier}`} · {config.frame}</span>
      </div>
      <main className="game-main forge-mobile-scene__main" data-active-tab="board" data-game-board="true" {...boardAttributes}>
        <BoardForge
          brandDelayMap={new Map()} burnChipAnim={{}} burnChipArrivalAnim={{}}
          burstGhostCards={{}} ironHarbingerGhostIds={{}} canPlan={false} cardDetailDiscovered
          computeCosts={card => card.cost} costMode={costMode} flippingCards={EMPTY_IDS}
          getCardFocusProps={() => ({})} ghostArtifactMarkerTypesRef={ghostMarkerTypesRef}
          handleCancelPlan={NOOP} handleCardTap={NOOP} handleDeckTap={NOOP}
          hiddenSlots={phase === "solid" ? EMPTY_IDS : new Set(slots.filter(slot => !completedSlots.has(slot.slotKey)).map(slot => slot.slotKey))}
          archiveRevealedSlotKeys={revealedSlots}
          isCameraControlled={false} isLandscapeCockpit={false} isMyTurn isTutorial={false}
          forgeCompact={compact} me={state.players[0]} newlyMarkedCardIds={EMPTY_IDS}
          plannedCardId={null} plannedCardLabel="Forge" plannedDeckTier={null}
          refillingSlots={EMPTY_IDS} revealBlueprintText selectedCard={null}
          setCostMode={setCostMode} setForgeCompact={setCompact} setShowBurnPileOverlay={NOOP}
          setTracedSourceLumId={NOOP} state={state} strikeAuraMap={new Map()}
          suppressedBrandTypesByCardId={new Map()} suppressedMarkerIds={EMPTY_IDS}
          tutorialAttention={null} tutorialStep={0} tutorialZone={null}
          viewOrchestrator={{ onManualToggle: NOOP }}
        />
      </main>
      {phase === "filling" && slots.map(({ slotKey, card, tier }, index) => {
        const slotRect = slotRects[slotKey];
        if (completedSlots.has(slotKey) || !slotRect?.w) return null;
        return (
          <ForgeReplacementDealAnimation
            key={`${config.animKey}:${slotKey}`} animKey={`${config.animKey}:${slotKey}`} cardId={card.id}
            tier={tier} bonusAffinity={card.bonusAffinity} cost={card.cost}
            compact={compact} playbackRate={config.playbackRate}
            targetSlotKey={slotKey} playSound={window.parent === window && config.soundEnabled}
            delayMs={index * FORGE_PREVIEW_STAGGER_MS / config.playbackRate}
            deckRect={slotRect} slotRect={slotRect} animX={[0, 0, 0]} animY={[0, 0, 0]}
            animRotateY={[0, 0, 0]} animScale={[1, 1, 1]} faceScale={1}
            cardFace={<ArtifactCardView card={card} tier={tier} artOnly={compact} />}
            cardOverlay={compact ? <CompactForgeCardReadout card={card} costs={card.cost} /> : undefined}
            onReveal={() => revealSlot(slotKey)}
            onComplete={() => completeSlot(slotKey)}
          />
        );
      })}
    </div>
  );
}
