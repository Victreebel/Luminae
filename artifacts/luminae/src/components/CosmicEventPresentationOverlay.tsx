import React from 'react';
import { createPortal } from 'react-dom';
import { Check, Pause, Play, SkipForward, Wrench } from 'lucide-react';
import type { CivilizationEventInstance, GamePlayerState } from '@workspace/api-client-react';
import { CIVILIZATION_EVENT_CARD_DEFINITIONS } from '@workspace/game-types';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { CosmicEventCard } from '@/components/CosmicEventCard';
import { CosmicEventTargetEvidence } from '@/components/CosmicEventTargetEvidence';
import { CosmicEventWorlds } from '@/components/CosmicEventWorlds';
import { ForgeMoldCavity, ForgeTabletSurface } from '@/components/ForgeReplacementDealAnimation';
import { ForgeMoltenSurface } from '@/components/ForgeMoltenSurface';
import { getCosmicEventSourceAnchor, measureCosmicEventSource } from '@/lib/cosmicEventSource';
import { FORGE_REFILL_DURATION_MS, FORGE_REFILL_REDUCED_DURATION_MS } from '@/lib/forgeRefillTiming';
import {
  createCosmicEventAudio,
  type CosmicEventAudio,
  type CosmicEventEffectProfile,
} from '@/lib/cosmicEventAudio';
import './CosmicEventPresentationOverlay.css';

export const COSMIC_EVENT_PHASES = ['formation', 'tremble', 'lift', 'activation', 'effect', 'receipt', 'settle'] as const;

export const COSMIC_EVENT_TIMING = {
  normal: { formation: FORGE_REFILL_DURATION_MS, tremble: 1250, lift: 1250, activation: 1600, effect: 6500, receipt: 3000, settle: 400 },
  reduced: { formation: FORGE_REFILL_REDUCED_DURATION_MS, tremble: 600, lift: 400, activation: 650, effect: 6500, receipt: 3000, settle: 250 },
} as const;

/** Keep reading time in reduced motion, and allow longer multiplayer receipts. */
export function getCosmicEventEffectDuration(event: CivilizationEventInstance): number {
  const text = [
    event.rulesText ?? CIVILIZATION_EVENT_CARD_DEFINITIONS[event.definitionId].rulesText,
    ...event.affectedPlayerIds.flatMap((id) => [
      event.outcomesByPlayerId[id]?.summary ?? '',
      ...(event.outcomesByPlayerId[id]?.targetEvidence ?? []).map((evidence) => evidence.reason),
    ]),
  ].join(' ');
  const words = text.trim().split(/\s+/).length;
  return Math.min(11000, Math.max(6500, Math.ceil(words / 230 * 60000) + 1000 - COSMIC_EVENT_TIMING.normal.receipt));
}

const EVENT_PALETTES: Record<CosmicEventEffectProfile, { color: string; companion: string }> = {
  affinity_bloom: { color: '#91f8c0', companion: '#f5d89a' },
  forge_drift: { color: '#8cd9ff', companion: '#dcc8ff' },
  containment_cascade: { color: '#ffb57b', companion: '#83deff' },
  affinity_inversion: { color: '#c4a0ff', companion: '#ffd389' },
  entropy_storm: { color: '#ff8baf', companion: '#b59bff' },
  terminus_tide: { color: '#b8b1ff', companion: '#ecf8ff' },
  system_shock: { color: '#ffbc7d', companion: '#aff0ff' },
  fracture_wave: { color: '#f49db7', companion: '#c9adff' },
  signal_clarity: { color: '#96e9fa', companion: '#f3fcff' },
  synchronization_shear: { color: '#c2a0fb', companion: '#ffc78c' },
};

export interface CosmicEventSourceRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CosmicEventPresentationOverlayProps {
  event: CivilizationEventInstance;
  players: GamePlayerState[];
  reducedMotion?: boolean;
  sourceRect?: CosmicEventSourceRect | null;
  onComplete: () => void;
}

/** Event-specific geometry remains in the expanding animated effect field. */
export function CosmicEventSigil({ profile }: { profile: CosmicEventEffectProfile }) {
  const marks = Array.from({ length: 12 }, (_, index) => index);
  return (
    <svg className="cosmic-event-sigil" viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <circle className="cosmic-event-sigil__boundary" cx="120" cy="120" r="102" stroke="currentColor" strokeWidth="0.7" strokeDasharray="2 12" />
      {profile === 'affinity_bloom' && (
        <g className="cosmic-event-bloom">
          {marks.slice(0, 6).map((index) => (
            <ellipse key={index} className="cosmic-event-petal" cx="120" cy="85" rx="23" ry="53" stroke="currentColor" fill="currentColor" fillOpacity="0.07" transform={`rotate(${index * 60} 120 120)`} />
          ))}
          <circle cx="120" cy="120" r="23" fill="currentColor" fillOpacity="0.18" stroke="currentColor" />
          <circle cx="120" cy="120" r="7" fill="var(--event-companion)" />
        </g>
      )}
      {profile === 'forge_drift' && (
        <g className="cosmic-event-orbit">
          <ellipse cx="120" cy="120" rx="94" ry="46" stroke="currentColor" />
          <ellipse cx="120" cy="120" rx="94" ry="46" stroke="currentColor" opacity="0.4" transform="rotate(60 120 120)" />
          <ellipse cx="120" cy="120" rx="94" ry="46" stroke="currentColor" opacity="0.4" transform="rotate(120 120 120)" />
          {[0, 120, 240].map((angle) => <rect key={angle} x="102" y="25" width="36" height="49" rx="3" fill="#091526" stroke="var(--event-companion)" transform={`rotate(${angle} 120 120)`} />)}
          <path d="M120 94 143 120 120 146 97 120Z" stroke="currentColor" fill="currentColor" fillOpacity="0.12" />
        </g>
      )}
      {profile === 'containment_cascade' && (
        <g>
          {[65, 83, 99].map((radius, index) => <circle key={radius} className="cosmic-event-shell" cx="120" cy="120" r={radius} stroke="currentColor" opacity={0.8 - index * 0.22} style={{ animationDelay: `${index * 0.55}s` }} />)}
          <path className="cosmic-event-shield" d="M120 53 169 74 162 131Q155 164 120 187 85 164 78 131L71 74Z" stroke="var(--event-companion)" strokeWidth="2" fill="var(--event-companion)" fillOpacity="0.08" />
          <path d="m102 121 13 14 27-32" stroke="var(--event-companion)" strokeWidth="2" />
          <path d="m21 66 30 23-18 18 25 18m161-59-30 23 18 18-25 18" stroke="currentColor" strokeWidth="2" />
        </g>
      )}
      {profile === 'affinity_inversion' && (
        <g className="cosmic-event-inversion">
          <path d="M49 142C9 57 104 26 132 77S187 183 208 97" stroke="currentColor" strokeWidth="12" opacity="0.55" />
          <path d="M191 98C231 183 136 214 108 163S53 57 32 143" stroke="var(--event-companion)" strokeWidth="12" opacity="0.6" />
          <circle cx="66" cy="75" r="15" fill="currentColor" />
          <circle cx="174" cy="165" r="15" fill="var(--event-companion)" />
          <path d="m113 103 14 17-14 17m-9-17h32" stroke="white" strokeWidth="1.5" />
        </g>
      )}
      {profile === 'entropy_storm' && (
        <g className="cosmic-event-storm">
          {marks.map((index) => (
            <path key={index} className="cosmic-event-shard" d={`M120 ${25 + (index % 3) * 8} 130 64 117 87 112 61Z`} stroke="currentColor" fill="currentColor" fillOpacity="0.12" transform={`rotate(${index * 30} 120 120)`} />
          ))}
          <circle cx="120" cy="120" r="29" stroke="var(--event-companion)" strokeDasharray="19 7" />
          <path d="m112 99 19 9-13 11 15 14-20 12 5-19-15-9Z" fill="var(--event-companion)" />
        </g>
      )}
      {profile === 'terminus_tide' && (
        <g className="cosmic-event-tide">
          {[0, 1, 2, 3].map((index) => <ellipse key={index} className="cosmic-event-tide-ring" cx="120" cy="126" rx={91 - index * 17} ry={51 - index * 9} stroke="currentColor" opacity={0.4 + index * 0.16} style={{ animationDelay: `${index * 0.3}s` }} />)}
          <ellipse cx="120" cy="126" rx="33" ry="18" fill="#030211" stroke="var(--event-companion)" />
          <path className="cosmic-event-return" d="M105 108V55h30v53M112 67h16m-16 7h16" stroke="var(--event-companion)" strokeWidth="2" fill="#121329" />
          <path d="m111 44 9-11 9 11m-9-11v18" stroke="var(--event-companion)" />
        </g>
      )}
      {profile === 'system_shock' && (
        <g>
          {[70, 89].map((radius, index) => <circle key={radius} className="cosmic-event-shock-ring" cx="120" cy="120" r={radius} stroke="currentColor" strokeWidth="1.5" strokeDasharray="52 12 18 12" style={{ animationDelay: `${index * 0.4}s` }} />)}
          <g className="cosmic-event-shock-conduits" stroke="var(--event-companion)" strokeWidth="2">
            <path d="M120 25v45m0 100v45M25 120h45m100 0h45M54 54l31 31m70 70 31 31M186 54l-31 31m-70 70-31 31" />
            {[0, 90, 180, 270].map(angle => <circle key={angle} cx="120" cy="30" r="6" fill="#081323" transform={`rotate(${angle} 120 120)`} />)}
          </g>
          <path d="m120 75 39 22v46l-39 22-39-22V97Z" fill="var(--event-companion)" fillOpacity="0.08" stroke="var(--event-companion)" strokeWidth="2" />
          <path className="cosmic-event-shock-fault" d="m124 79-16 32 24 12-20 38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {profile === 'fracture_wave' && (
        <g>
          {[69, 88, 103].map((radius, index) => <circle key={radius} className="cosmic-event-fracture-wave" cx="120" cy="120" r={radius} stroke="currentColor" opacity={0.8 - index * 0.2} style={{ animationDelay: `${index * 0.45}s` }} />)}
          <g className="cosmic-event-fracture-left">
            <path d="M117 54 64 83v74l53 29-9-36 13-32-16-29Z" stroke="var(--event-companion)" strokeWidth="2" fill="var(--event-companion)" fillOpacity="0.1" />
            <path d="m80 93 20-11m-20 27 17-10m-17 49 19 10" stroke="var(--event-companion)" opacity="0.5" />
          </g>
          <g className="cosmic-event-fracture-right">
            <path d="m123 54 53 29v74l-53 29-9-36 13-32-16-29Z" stroke="var(--event-companion)" strokeWidth="2" fill="var(--event-companion)" fillOpacity="0.1" />
            <path d="m144 82 16 11m-17 6 17 10m-19 49 19-10" stroke="var(--event-companion)" opacity="0.5" />
          </g>
          <path className="cosmic-event-fracture-fault" d="m120 52-12 37 16 29-13 32 9 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      {profile === 'signal_clarity' && (
        <g>
          {[0, 1, 2, 3, 4].map((index) => (
            <g key={index} className="cosmic-event-signal-band" style={{ '--signal-offset': `${(index % 2 ? -1 : 1) * (20 + index * 4)}px`, '--signal-rotation': `${(index % 2 ? -1 : 1) * 14}deg`, animationDelay: `${index * 0.22}s` } as React.CSSProperties}>
              <path d={`M45 ${80 + index * 20}h150`} stroke="currentColor" strokeWidth="1.5" />
              <circle cx="120" cy={80 + index * 20} r="4" fill="var(--event-companion)" />
            </g>
          ))}
          <circle className="cosmic-event-signal-focus" cx="120" cy="120" r="73" stroke="var(--event-companion)" strokeWidth="1.5" />
        </g>
      )}
      {profile === 'synchronization_shear' && (
        <g>
          <path className="cosmic-event-sync-link" d="M68 71 166 78 174 166 72 165ZM68 71l106 95M166 78l-94 87" stroke="currentColor" strokeWidth="2" strokeDasharray="9 5" />
          {[[68, 71], [166, 78], [174, 166], [72, 165]].map(([x, y], index) => (
            <g key={index} className="cosmic-event-sync-node" style={{ '--sync-x': `${index < 2 ? -12 : 12}px`, '--sync-y': `${index % 2 ? 12 : -12}px`, animationDelay: `${index * 0.26}s` } as React.CSSProperties}>
              <circle cx={x} cy={y} r="18" stroke="var(--event-companion)" strokeWidth="1.5" fill="var(--event-companion)" fillOpacity="0.08" />
              <circle cx={x} cy={y} r="5" fill="var(--event-companion)" />
            </g>
          ))}
          <path className="cosmic-event-sync-fault" d="m120 83-12 28 25 17-14 34" stroke="var(--event-companion)" strokeWidth="2.5" />
        </g>
      )}
    </svg>
  );
}

function captureSource(event: CivilizationEventInstance, sourceRect?: CosmicEventSourceRect | null) {
  if (sourceRect && sourceRect.width > 0 && sourceRect.height > 0) return sourceRect;
  return measureCosmicEventSource(event.sourceCard);
}

/** Follow the real mold until lift-off, including compact/full layout switches. */
function useEventMold(event: CivilizationEventInstance, sourceRect: CosmicEventSourceRect | null | undefined, tracking: boolean) {
  const slotKey = event.sourceCard?.forgeSlotIndex != null
    ? `${event.sourceCard.tier}-${event.sourceCard.forgeSlotIndex}` : undefined;
  const [geometry, setGeometry] = React.useState(() => ({
    rect: captureSource(event, sourceRect),
    slot: slotKey ? getCosmicEventSourceAnchor(event.sourceCard) : null,
    width: 0,
    height: 0,
  }));
  React.useLayoutEffect(() => {
    if (!slotKey || !tracking) return;
    let observed: HTMLElement | null = null;
    const measure = () => {
      if (!observed) return;
      const rect = observed.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setGeometry(previous => previous.slot === observed
        && previous.rect?.left === rect.left && previous.rect?.top === rect.top
        && previous.rect?.width === rect.width && previous.rect?.height === rect.height
        && previous.width === observed!.clientWidth && previous.height === observed!.clientHeight
        ? previous : { rect, slot: observed, width: observed!.clientWidth, height: observed!.clientHeight });
    };
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    const attach = () => {
      const next = document.querySelector<HTMLElement>(`[data-slot-key="${slotKey}"]`);
      if (next !== observed) {
        if (observed) resizeObserver?.unobserve(observed);
        observed = next;
        if (next) resizeObserver?.observe(next);
        else setGeometry(previous => previous.slot ? { ...previous, slot: null } : previous);
      }
      measure();
    };
    attach();
    const mutationObserver = new MutationObserver(attach);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [slotKey, tracking]);
  return { ...geometry, slotKey };
}

function CosmicEventFormation({ event, mold, palette, durationMs, reducedMotion, paused, getElapsedMs }: {
  event: CivilizationEventInstance;
  mold: ReturnType<typeof useEventMold>;
  palette: { color: string; companion: string };
  durationMs: number;
  reducedMotion: boolean;
  paused: boolean;
  getElapsedMs: () => number;
}) {
  // A portal remounts its children when its host changes. Seed both renderers
  // with the same elapsed time so a responsive mold replacement cannot rewind.
  const materialMount = React.useMemo(() => ({ slot: mold.slot, elapsedMs: getElapsedMs() }), [mold.slot, getElapsedMs]);
  const initialElapsedMs = materialMount.elapsedMs;
  const rect = mold.rect;
  if (!rect) return null;
  const width = mold.width || rect.width;
  const height = mold.height || rect.height;
  const inset = mold.slot ? 3 : 4;
  const formation = <div
    className="forge-molten-refill cosmic-event-formation"
    data-testid="cosmic-event-formation"
    data-placement={mold.slot ? 'slot' : 'viewport'}
    data-target-slot-key={mold.slotKey}
    data-motion={reducedMotion ? 'reduced' : 'full'}
    data-compact={width / height > .85 || undefined}
    data-paused={paused || undefined}
    aria-hidden="true"
    style={{
      position: mold.slot ? 'absolute' : 'fixed',
      left: mold.slot ? 0 : rect.left,
      top: mold.slot ? 0 : rect.top,
      width: mold.slot ? '100%' : width,
      height: mold.slot ? '100%' : height,
      '--forge-cavity-inset': `${inset}px`,
      '--forge-refill-duration': `${durationMs}ms`,
      '--forge-refill-delay': `${-initialElapsedMs}ms`,
      '--forge-melt-primary': palette.color,
      '--forge-melt-secondary': palette.companion,
      '--forge-affinity': palette.color,
    } as React.CSSProperties}
  >
    <ForgeMoldCavity />
    <div className="forge-molten-refill__face">
      <CosmicEventCard definition={CIVILIZATION_EVENT_CARD_DEFINITIONS[event.definitionId]} testId="cosmic-event-forming-card" />
      <ForgeTabletSurface />
    </div>
    {!reducedMotion && <>
      <div className="forge-molten-refill__liquid">
        <ForgeMoltenSurface durationMs={durationMs} delayMs={0} primary={palette.color} secondary={palette.companion}
          width={Math.max(1, width - inset * 2)} height={Math.max(1, height - inset * 2)} seed={event.eventId} paused={paused} initialElapsedMs={initialElapsedMs} />
        <span className="forge-molten-refill__fallback" />
      </div>
      <span className="forge-molten-refill__heat" />
    </>}
  </div>;
  return mold.slot ? createPortal(formation, mold.slot) : formation;
}

function CosmicEventSequence({
  event,
  players,
  reducedMotion = false,
  sourceRect,
  onComplete,
}: CosmicEventPresentationOverlayProps) {
  const definition = CIVILIZATION_EVENT_CARD_DEFINITIONS[event.definitionId];
  const profile = definition.effectProfile;
  const palette = EVENT_PALETTES[profile];
  const timing = COSMIC_EVENT_TIMING[reducedMotion ? 'reduced' : 'normal'];
  const effectDuration = getCosmicEventEffectDuration(event);
  const [phaseIndex, setPhaseIndex] = React.useState(() => event.sourceCard?.forgeSlotIndex != null && captureSource(event, sourceRect)
    ? 0 : COSMIC_EVENT_PHASES.indexOf('tremble'));
  const [paused, setPaused] = React.useState(false);
  const [documentHidden, setDocumentHidden] = React.useState(document.hidden);
  const [moreOutcomesBelow, setMoreOutcomesBelow] = React.useState(false);
  const phase = COSMIC_EVENT_PHASES[phaseIndex];
  const mold = useEventMold(event, sourceRect, phase === 'formation' || phase === 'tremble');
  const origin = mold.rect;
  const explanationVisible = phaseIndex >= COSMIC_EVENT_PHASES.indexOf('effect');
  const hasDamagedArtifacts = event.affectedPlayerIds.some(id => (event.outcomesByPlayerId[id]?.damagedArtifactIds?.length ?? 0) > 0);
  const completedRef = React.useRef(false);
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const explanationRef = React.useRef<HTMLElement | null>(null);
  const soundRef = React.useRef<CosmicEventAudio | null>(null);
  const clockRef = React.useRef({ phaseIndex: -1, remaining: 0, startedAt: null as number | null });
  const getFormationElapsedMs = React.useCallback(() => {
    const clock = clockRef.current;
    if (clock.phaseIndex !== COSMIC_EVENT_PHASES.indexOf('formation')) return 0;
    const activeElapsed = clock.startedAt === null ? 0 : performance.now() - clock.startedAt;
    return Math.max(0, Math.min(timing.formation, timing.formation - clock.remaining + activeElapsed));
  }, [timing.formation]);
  const titleId = React.useId();
  const explanationId = React.useId();

  const finish = React.useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    soundRef.current?.stop();
    onCompleteRef.current();
  }, []);
  const skipToReceipt = React.useCallback(() => {
    setPaused(false);
    if (phaseIndex >= COSMIC_EVENT_PHASES.indexOf('receipt')) finish();
    else setPhaseIndex(COSMIC_EVENT_PHASES.indexOf('receipt'));
  }, [finish, phaseIndex]);
  useFocusTrap(containerRef, true, skipToReceipt);

  const updateScrollHint = React.useCallback(() => {
    const panel = explanationRef.current;
    setMoreOutcomesBelow(Boolean(panel && panel.scrollHeight - panel.clientHeight - panel.scrollTop > 8));
  }, []);
  React.useEffect(() => {
    if (!explanationVisible) return;
    updateScrollHint();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollHint);
    if (explanationRef.current) observer?.observe(explanationRef.current);
    window.addEventListener('resize', updateScrollHint);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateScrollHint); };
  }, [explanationVisible, updateScrollHint]);

  React.useEffect(() => {
    const sound = createCosmicEventAudio(profile);
    soundRef.current = sound;
    return () => { sound.dispose(); soundRef.current = null; };
  }, [profile]);

  React.useEffect(() => {
    if (paused || documentHidden || phase === 'settle' || phase === 'formation') {
      soundRef.current?.stop();
      return;
    }
    soundRef.current?.play(phase, phase === 'effect' ? effectDuration : undefined);
    return () => soundRef.current?.stop();
  }, [phase, paused, documentHidden, effectDuration]);

  React.useEffect(() => {
    const clock = clockRef.current;
    if (clock.phaseIndex !== phaseIndex) {
      clock.phaseIndex = phaseIndex;
      clock.remaining = phase === 'effect' ? effectDuration : timing[phase];
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const suspend = () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      clock.remaining = Math.max(0, clock.remaining - (performance.now() - (clock.startedAt ?? performance.now())));
      clock.startedAt = null;
    };
    const resume = () => {
      if (paused || document.hidden || completedRef.current || timer !== null) return;
      clock.startedAt = performance.now();
      timer = setTimeout(() => {
        timer = null;
        clock.remaining = 0;
        clock.startedAt = null;
        if (phase === 'settle') finish();
        else setPhaseIndex((current) => Math.min(current + 1, COSMIC_EVENT_PHASES.length - 1));
      }, clock.remaining);
    };
    const visibility = () => {
      setDocumentHidden(document.hidden);
      if (document.hidden) suspend();
      else resume();
    };
    document.addEventListener('visibilitychange', visibility);
    resume();
    return () => { suspend(); document.removeEventListener('visibilitychange', visibility); };
  }, [finish, paused, phase, phaseIndex, timing, effectDuration]);

  const tierLabel = definition.tier === 1 ? 'Planetary' : definition.tier === 2 ? 'Stellar' : 'Galactic';
  // Client coordinates include any board camera scale; the material portal
  // uses local dimensions. Carry the same inset into the lifted card.
  const sourceInsetX = mold.slot && origin
    ? (mold.slot.clientLeft + 3) * origin.width / (mold.slot.offsetWidth || origin.width) : 4;
  const sourceInsetY = mold.slot && origin
    ? (mold.slot.clientTop + 3) * origin.height / (mold.slot.offsetHeight || origin.height) : 4;
  const style = {
    '--event-accent': palette.color,
    '--event-companion': palette.companion,
    '--event-source-x': origin ? `${origin.left + origin.width / 2}px` : '50vw',
    '--event-source-y': origin ? `${origin.top + origin.height / 2}px` : '57vh',
    '--event-source-width': origin ? `${Math.max(1, origin.width - sourceInsetX * 2)}px` : '120px',
    '--event-source-height': origin ? `${Math.max(1, origin.height - sourceInsetY * 2)}px` : '171px',
    '--event-lift-duration': `${timing.lift}ms`,
    '--event-activation-duration': `${timing.activation}ms`,
    '--event-effect-duration': `${effectDuration}ms`,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className="cosmic-event-overlay"
      style={style}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={explanationVisible ? explanationId : undefined}
      data-testid="cosmic-event-presentation"
      data-event-id={event.eventId}
      data-phase={phase}
      data-profile={profile}
      data-reduced-motion={reducedMotion || undefined}
      data-source-compact={origin && origin.width / origin.height > .85 || undefined}
      data-paused={paused || documentHidden || undefined}
    >
      <div className="cosmic-event-backdrop" aria-hidden="true" />
      <div className="cosmic-event-starfield" aria-hidden="true" />
      {(phase === 'activation' || explanationVisible) && <div className="cosmic-event-universal-field" key={phase === 'activation' ? 'activation' : 'propagation'} aria-hidden="true">
        <div className="cosmic-event-nebula" />
        {[0, 1, 2].map(index => <div key={index} className="cosmic-event-universal-wave" style={{ '--wave-delay': `${index * 0.85}s` } as React.CSSProperties} />)}
      </div>}
      {explanationVisible && <CosmicEventWorlds event={event} players={players} profile={profile} />}
      <header className="cosmic-event-header">
        <span className="sr-only" id={titleId}>{definition.title}</span>
        <span className="cosmic-event-eyebrow">{tierLabel} Event</span>
        <span className="cosmic-event-phase-label" role="status" aria-live="polite">
          {phase === 'receipt' || phase === 'settle' ? 'Event resolved' : explanationVisible ? 'Affects all players' : 'Cosmic event activating'}
        </span>
      </header>

      <div className="cosmic-event-focus" aria-hidden="true">
        <div className="cosmic-event-halo cosmic-event-halo--outer" />
        <div className="cosmic-event-halo cosmic-event-halo--inner" />
        <div className="cosmic-event-activation-rays" />
        {explanationVisible && <div className="cosmic-event-effect-field"><CosmicEventSigil profile={profile} /></div>}
      </div>

      {phase === 'formation'
        ? <CosmicEventFormation event={event} mold={mold} palette={palette} durationMs={timing.formation} reducedMotion={reducedMotion} paused={paused || documentHidden} getElapsedMs={getFormationElapsedMs} />
        : <div className="cosmic-event-card-position">
          <CosmicEventCard definition={definition} testId="cosmic-event-card" />
        </div>}

      {explanationVisible && (
        <section ref={explanationRef} className="cosmic-event-explanation" id={explanationId} data-testid="cosmic-event-explanation" aria-label="Event effect and player results" aria-live="polite" tabIndex={0} onScroll={updateScrollHint}>
          <div className="cosmic-event-explanation__heading">
            <span>{phase === 'receipt' || phase === 'settle' ? <><Check size={14} /> Event resolved</> : 'Event effect'}</span>
            <span>All players</span>
          </div>
          <p className="cosmic-event-rules">{event.rulesText ?? definition.rulesText}</p>
          <div className="cosmic-event-outcomes">
            {event.affectedPlayerIds.map((playerId) => {
              const player = players.find((candidate) => candidate.playerId === playerId);
              const outcome = event.outcomesByPlayerId[playerId];
              const responses = outcome?.respondingManifestations.map(source => source.sourceType === 'artifact'
                ? player?.forgedArtifacts?.find(card => card.id === source.sourceId)?.name
                : player?.manifestedBlueprintDevices?.find(device => device.blueprintId === source.sourceId)?.definition?.name
              ).filter(Boolean) ?? [];
              const damagedArtifacts = outcome?.damagedArtifactIds?.map(id => ({
                id,
                name: player?.forgedArtifacts?.find(card => card.id === id)?.name ?? id,
              })) ?? [];
              return (
                <div className="cosmic-event-outcome" key={playerId} data-outcome={outcome?.outcomeId}>
                  <strong>{player?.playerName ?? playerId}</strong>
                  <p>{outcome?.summary ?? 'No change.'}</p>
                  {damagedArtifacts.length > 0 && (
                    <ul className="cosmic-event-damaged-artifacts" aria-label={`Damaged Artifacts for ${player?.playerName ?? playerId}`}>
                      {damagedArtifacts.map(card => <li key={card.id}><span>Damaged</span> {card.name}</li>)}
                    </ul>
                  )}
                  {!!outcome?.stabilityPressure && <p>Stability pressure: {outcome.stabilityPressure}.</p>}
                  {responses.length > 0 && <p>Responding: {responses.join(', ')}.</p>}
                  <CosmicEventTargetEvidence
                    evidence={outcome?.targetEvidence}
                    artifactNames={Object.fromEntries((player?.forgedArtifacts ?? []).map(card => [card.id, card.name]))}
                  />
                </div>
              );
            })}
          </div>
          {hasDamagedArtifacts && <p className="cosmic-event-repair-guidance"><Wrench size={14} aria-hidden="true" /><span>Select damaged Artifacts in Civilization and queue free repairs. Repairs complete at the end of each owner's turn.</span></p>}
        </section>
      )}

      {explanationVisible && moreOutcomesBelow && <div className="cosmic-event-scroll-hint">Scroll for all player results · Pause to read</div>}

      <footer className="cosmic-event-controls">
        <button type="button" onClick={() => setPaused((current) => !current)} aria-label={paused ? 'Resume Event' : 'Pause Event to read'} aria-pressed={paused}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" onClick={skipToReceipt}>
          {phaseIndex >= COSMIC_EVENT_PHASES.indexOf('receipt') ? <Check size={14} /> : <SkipForward size={14} />}
          {phaseIndex >= COSMIC_EVENT_PHASES.indexOf('receipt') ? 'Continue' : 'Skip animation'}
        </button>
      </footer>
    </div>
  );
}

/** Event identity remounts the clock; callback and game-state refreshes never do. */
export function CosmicEventPresentationOverlay(props: CosmicEventPresentationOverlayProps) {
  return <CosmicEventSequence key={props.event.eventId} {...props} />;
}
