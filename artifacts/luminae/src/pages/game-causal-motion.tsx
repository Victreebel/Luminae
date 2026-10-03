import React from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';

type Point = { x: number; y: number };
type ViewportGeometry = { width: number; height: number };

function getVisibleElementRect(selector: string): { element: HTMLElement; rect: DOMRect } | null {
  if (typeof document === 'undefined') return null;
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (
      rect.width > 4 &&
      rect.height > 4 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0
    ) {
      return { element, rect };
    }
  }
  return null;
}

function getVisibleRect(selector: string): DOMRect | null {
  return getVisibleElementRect(selector)?.rect ?? null;
}

function centerOf(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>): Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function curvedPath(from: Point, to: Point, lift = 0): string {
  const control = {
    x: from.x + (to.x - from.x) * 0.5,
    y: Math.min(from.y, to.y) - Math.max(24, Math.abs(to.y - from.y) * 0.18) + lift,
  };
  return `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
}

function curveMidpoint(from: Point, to: Point, lift = 0): Point {
  const control = {
    x: from.x + (to.x - from.x) * 0.5,
    y: Math.min(from.y, to.y) - Math.max(24, Math.abs(to.y - from.y) * 0.18) + lift,
  };
  return {
    x: 0.25 * from.x + 0.5 * control.x + 0.25 * to.x,
    y: 0.25 * from.y + 0.5 * control.y + 0.25 * to.y,
  };
}

type HarnessGeometry = ViewportGeometry & {
  harness: Point;
  held: Point;
  sources: Partial<Record<AffinityKey, Point>>;
};

export function HarnessConvergenceLayer({
  selectedAffinities,
  harnessBurstKeys,
}: {
  selectedAffinities: Partial<Record<AffinityKey, number>>;
  harnessBurstKeys?: Partial<Record<AffinityKey, number>>;
}) {
  const reduceMotion = useReducedMotion();
  const selectedKeys = React.useMemo(
    () => (Object.keys(selectedAffinities) as AffinityKey[])
      .filter((key) => (selectedAffinities[key] ?? 0) > 0 && key !== 'singularity'),
    [selectedAffinities],
  );
  const lastSelectionRef = React.useRef<AffinityKey[]>(selectedKeys);
  const previousBurstRef = React.useRef<Partial<Record<AffinityKey, number>>>({
    ...harnessBurstKeys,
  });
  const transferTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHarnessPointRef = React.useRef<Point | null>(null);
  const [geometry, setGeometry] = React.useState<HarnessGeometry | null>(null);
  const [transfer, setTransfer] = React.useState<{ key: number; affinities: AffinityKey[] } | null>(null);
  const motionActive = selectedKeys.length > 0 || Boolean(transfer);

  React.useEffect(() => {
    if (selectedKeys.length > 0) lastSelectionRef.current = selectedKeys;
  }, [selectedKeys]);

  const measure = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    const harnessRect = getVisibleRect('[data-testid="harness-button"]');
    const heldRect = getVisibleRect('[data-affinity-held-target]');
    if (harnessRect) lastHarnessPointRef.current = centerOf(harnessRect);
    // Compact controls retract on submission; keep the launch point while the
    // transfer travels to the holdings counter in its new visible position.
    const harnessPoint = harnessRect ? centerOf(harnessRect) : transfer ? lastHarnessPointRef.current : null;
    if (!harnessPoint || !heldRect) {
      setGeometry(null);
      return;
    }
    const sourceKeys = new Set([...selectedKeys, ...(transfer?.affinities ?? [])]);
    const sources: Partial<Record<AffinityKey, Point>> = {};
    for (const affinity of sourceKeys) {
      const rect =
        getVisibleRect(`[data-affinity-symbol="${affinity}"]`) ??
        getVisibleRect(`[data-affinity-well="${affinity}"]`);
      if (rect) sources[affinity] = centerOf(rect);
    }
    setGeometry({
      width: window.innerWidth,
      height: window.innerHeight,
      harness: harnessPoint,
      held: centerOf(heldRect),
      sources,
    });
  }, [selectedKeys, transfer]);

  React.useLayoutEffect(() => {
    if (!motionActive || typeof window === 'undefined') {
      setGeometry((current) => (current === null ? current : null));
      return;
    }

    let animationFrame = 0;
    const scheduleMeasure = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        measure();
      });
    };

    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [measure, motionActive]);

  React.useEffect(() => {
    const current = harnessBurstKeys ?? {};
    const changed = (Object.keys(AFFINITY_META) as AffinityKey[]).filter(
      (affinity) =>
        affinity !== 'singularity' &&
        (current[affinity] ?? 0) > (previousBurstRef.current[affinity] ?? 0),
    );
    previousBurstRef.current = { ...current };
    if (changed.length === 0) return;

    const affinities = changed.length > 0 ? changed : lastSelectionRef.current;
    setTransfer({ key: Date.now(), affinities });
    if (transferTimerRef.current) clearTimeout(transferTimerRef.current);
    transferTimerRef.current = setTimeout(() => setTransfer(null), reduceMotion ? 320 : 920);
  }, [harnessBurstKeys, reduceMotion]);

  React.useEffect(() => () => {
    if (transferTimerRef.current) clearTimeout(transferTimerRef.current);
  }, []);

  if (typeof document === 'undefined' || !geometry || (selectedKeys.length === 0 && !transfer)) {
    return null;
  }

  return createPortal(
    <div className="causal-motion-layer" aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        preserveAspectRatio="none"
      >
        {selectedKeys.map((affinity, index) => {
          const from = geometry.sources[affinity];
          if (!from) return null;
          const meta = AFFINITY_META[affinity];
          return (
            <motion.path
              key={`selected-${affinity}`}
              d={curvedPath(from, geometry.harness, index * 5)}
              fill="none"
              stroke={meta.glowHex}
              strokeWidth="1.25"
              strokeLinecap="round"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={reduceMotion
                ? { opacity: 0.32, pathLength: 1 }
                : { opacity: [0.18, 0.62, 0.24], pathLength: 1 }}
              transition={reduceMotion
                ? { duration: 0.12 }
                : { opacity: { duration: 1.5, repeat: Infinity, delay: index * 0.14 }, pathLength: { duration: 0.35 } }}
              style={{ filter: `drop-shadow(0 0 4px ${meta.glowHex})` }}
            />
          );
        })}

        {transfer?.affinities.map((affinity, index) => {
          const meta = AFFINITY_META[affinity];
          const midpoint = curveMidpoint(geometry.harness, geometry.held, index * 6);
          return (
            <React.Fragment key={`${transfer.key}-${affinity}-${index}`}>
              <motion.path
                d={curvedPath(geometry.harness, geometry.held, index * 6)}
                fill="none"
                stroke={meta.glowHex}
                strokeWidth="1.8"
                strokeLinecap="round"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: reduceMotion ? [0, 0.7, 0] : [0, 0.9, 0], pathLength: [0, 1, 1] }}
                transition={{ duration: reduceMotion ? 0.28 : 0.78, delay: index * 0.06, times: [0, 0.72, 1] }}
                style={{ filter: `drop-shadow(0 0 6px ${meta.glowHex})` }}
              />
              {!reduceMotion && (
                <motion.circle
                  r="3.4"
                  fill={meta.glowHex}
                  initial={{ cx: geometry.harness.x, cy: geometry.harness.y, opacity: 0 }}
                  animate={{
                    cx: [geometry.harness.x, midpoint.x, geometry.held.x],
                    cy: [geometry.harness.y, midpoint.y, geometry.held.y],
                    opacity: [0, 1, 0.9, 0],
                  }}
                  transition={{ duration: 0.72, delay: index * 0.06, times: [0, 0.16, 0.84, 1], ease: 'easeInOut' }}
                  style={{ filter: `drop-shadow(0 0 7px ${meta.glowHex})` }}
                />
              )}
            </React.Fragment>
          );
        })}
      </svg>

      {transfer && (
        <motion.span
          className="causal-motion-impact"
          style={{ left: geometry.held.x, top: geometry.held.y }}
          initial={{ opacity: 0, scale: 0.35 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.35, 1.25, 1.8] }}
          transition={{ duration: reduceMotion ? 0.3 : 0.72, delay: reduceMotion ? 0 : 0.48 }}
        />
      )}
    </div>,
    document.body,
  );
}

export interface ArchiveManifestationGeometry {
  cardId: string;
  tier: number;
  deckRect: { x: number; y: number; w: number; h: number };
  slotRect: { x: number; y: number; w: number; h: number };
}

export function ArchiveManifestationTrace({
  manifestation,
}: {
  manifestation: ArchiveManifestationGeometry;
}) {
  const reduceMotion = useReducedMotion();
  const from = {
    x: manifestation.deckRect.x + manifestation.deckRect.w / 2,
    y: manifestation.deckRect.y + manifestation.deckRect.h / 2,
  };
  const to = {
    x: manifestation.slotRect.x + manifestation.slotRect.w / 2,
    y: manifestation.slotRect.y + manifestation.slotRect.h / 2,
  };
  const color = manifestation.tier === 3
    ? '#d6afff'
    : manifestation.tier === 2
      ? '#ffe0a0'
      : '#a8e6ff';
  const width = typeof window === 'undefined' ? 1 : window.innerWidth;
  const height = typeof window === 'undefined' ? 1 : window.innerHeight;

  return (
    <div className="causal-motion-layer causal-motion-layer--archive" aria-hidden="true">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <motion.path
          d={curvedPath(from, to)}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: [0, 0.78, 0.52, 0], pathLength: [0, 1, 1, 1] }}
          transition={{
            duration: reduceMotion ? 0.34 : 1.42,
            times: reduceMotion ? [0, 0.25, 0.7, 1] : [0, 0.3, 0.82, 1],
            ease: 'easeInOut',
          }}
          style={{ filter: `drop-shadow(0 0 7px ${color})` }}
        />
      </svg>
      <motion.span
        className="archive-manifestation-source"
        style={{ left: from.x, top: from.y, borderColor: color, boxShadow: `0 0 14px ${color}` }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.2, 0.72] }}
        transition={{ duration: reduceMotion ? 0.32 : 0.7 }}
      />
      <motion.span
        className="archive-manifestation-target"
        style={{
          left: manifestation.slotRect.x,
          top: manifestation.slotRect.y,
          width: manifestation.slotRect.w,
          height: manifestation.slotRect.h,
          borderColor: color,
          boxShadow: `inset 0 0 12px ${color}55, 0 0 10px ${color}66`,
        }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: [0, 0, 0.82, 0], scale: [0.94, 0.94, 1.02, 1] }}
        transition={{
          duration: reduceMotion ? 0.36 : 1.5,
          times: reduceMotion ? [0, 0.2, 0.55, 1] : [0, 0.68, 0.84, 1],
        }}
      />
    </div>
  );
}

export interface OpponentHarnessTraceState {
  key: number;
  affinities: AffinityKey[];
  playerId: string;
  playerName: string;
}

export function OpponentHarnessTrace({
  trace,
}: {
  trace: OpponentHarnessTraceState;
}) {
  const reduceMotion = useReducedMotion();
  const [geometry, setGeometry] = React.useState<(ViewportGeometry & {
    destination: Point;
    recipientRect: { left: number; top: number; width: number; height: number };
    sources: Point[];
  }) | null>(null);

  React.useLayoutEffect(() => {
    const chipHit = getVisibleElementRect(`[data-opponent-chip="${trace.playerId}"]`);
    if (!chipHit) return;
    const avatarHit = getVisibleElementRect(`[data-opponent-avatar="${trace.playerId}"]`);
    const destinationRect = avatarHit?.rect ?? chipHit.rect;
    const destination = centerOf(destinationRect);
    const recipientAccent =
      AFFINITY_META[trace.affinities[0]]?.glowHex ?? '#a8c5ff';
    const symbolSources = new Map<
      AffinityKey,
      { element: HTMLElement; rect: DOMRect } | null
    >();
    const sources = trace.affinities.map((affinity) => {
      let symbolSource = symbolSources.get(affinity);
      if (symbolSource === undefined) {
        symbolSource =
          getVisibleElementRect(`[data-affinity-symbol="${affinity}"]`) ??
          getVisibleElementRect(`[data-affinity-well="${affinity}"]`);
        symbolSources.set(affinity, symbolSource);
      }
      return symbolSource
        ? centerOf(symbolSource.rect)
        : { x: window.innerWidth / 2, y: window.innerHeight * 0.78 };
    });

    for (const [affinity, symbolSource] of symbolSources) {
      if (!symbolSource) continue;
      const meta = AFFINITY_META[affinity];
      const firstIndex = trace.affinities.indexOf(affinity);
      symbolSource.element.animate(
        [
          { transform: 'scale(1)', filter: 'brightness(1)' },
          {
            transform: 'scale(1.16)',
            filter: `brightness(1.55) drop-shadow(0 0 8px ${meta.glowHex})`,
          },
          { transform: 'scale(1)', filter: 'brightness(1)' },
        ],
        {
          duration: reduceMotion ? 180 : 430,
          delay: reduceMotion ? 0 : 70 + Math.max(0, firstIndex) * 80,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
      );
    }

    setGeometry({
      width: window.innerWidth,
      height: window.innerHeight,
      destination,
      recipientRect: {
        left: chipHit.rect.left,
        top: chipHit.rect.top,
        width: chipHit.rect.width,
        height: chipHit.rect.height,
      },
      sources,
    });

    chipHit.element.animate(
      [
        {
          filter: 'brightness(1) saturate(1)',
          boxShadow: '0 0 0 0 rgba(0,0,0,0)',
        },
        {
          filter: 'brightness(1.65) saturate(1.3)',
          boxShadow: `0 0 0 1px ${recipientAccent}, 0 0 22px 5px ${recipientAccent}88`,
        },
        {
          filter: 'brightness(1.22) saturate(1.12)',
          boxShadow: `0 0 0 1px ${recipientAccent}aa, 0 0 10px 2px ${recipientAccent}55`,
        },
        {
          filter: 'brightness(1) saturate(1)',
          boxShadow: '0 0 0 0 rgba(0,0,0,0)',
        },
      ],
      {
        duration: reduceMotion ? 420 : 980,
        delay: reduceMotion ? 0 : 360 + Math.max(0, trace.affinities.length - 1) * 80,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    );
    avatarHit?.element.animate(
      [
        {
          transform: 'translateZ(0) scale(1)',
          filter: 'brightness(1)',
          outline: '0 solid transparent',
        },
        {
          transform: 'translateZ(0) scale(1.28)',
          filter: 'brightness(1.8)',
          outline: `2px solid ${recipientAccent}`,
        },
        {
          transform: 'translateZ(0) scale(1.08)',
          filter: 'brightness(1.2)',
          outline: `1px solid ${recipientAccent}88`,
        },
        {
          transform: 'translateZ(0) scale(1)',
          filter: 'brightness(1)',
          outline: '0 solid transparent',
        },
      ],
      {
        duration: reduceMotion ? 420 : 820,
        delay: reduceMotion ? 0 : 410 + Math.max(0, trace.affinities.length - 1) * 80,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    );
  }, [reduceMotion, trace]);

  if (!geometry) return null;

  const total = trace.affinities.length;
  return (
    <div className="causal-motion-layer causal-motion-layer--opponent" aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        preserveAspectRatio="none"
      >
        {trace.affinities.map((affinity, index) => {
          const from = geometry.sources[index];
          const meta = AFFINITY_META[affinity];
          return (
            <motion.path
              key={`path-${trace.key}-${index}`}
              d={curvedPath(from, geometry.destination, index * 3)}
              fill="none"
              stroke={meta.glowHex}
              strokeWidth="1.35"
              strokeLinecap="round"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: [0, 0.72, 0], pathLength: [0, 1, 1] }}
              transition={{
                duration: reduceMotion ? 0.3 : 0.72,
                delay: reduceMotion ? 0 : 0.09 + index * 0.08,
                times: [0, 0.74, 1],
              }}
              style={{ filter: `drop-shadow(0 0 5px ${meta.glowHex})` }}
            />
          );
        })}
      </svg>

      {!reduceMotion && trace.affinities.map((affinity, index) => {
        const from = geometry.sources[index];
        const meta = AFFINITY_META[affinity];
        return (
          <motion.span
            key={`source-${trace.key}-${index}`}
            className="opponent-harness-source"
            style={{
              left: from.x,
              top: from.y,
              borderColor: meta.glowHex,
              background: meta.hex,
              boxShadow: `0 0 8px ${meta.glowHex}, 0 0 18px ${meta.glowHex}88`,
            }}
            initial={{ opacity: 0.15, scale: 0.35 }}
            animate={{ opacity: [0.15, 1, 0], scale: [0.35, 1.8, 3.1] }}
            transition={{
              duration: 0.34,
              delay: 0.07 + index * 0.08,
              times: [0, 0.32, 1],
              ease: 'easeOut',
            }}
          />
        );
      })}

      {!reduceMotion && trace.affinities.map((affinity, index) => {
        const from = geometry.sources[index];
        const midpoint = curveMidpoint(from, geometry.destination, index * 3);
        const meta = AFFINITY_META[affinity];
        return (
          <motion.span
            key={`token-${trace.key}-${index}`}
            className="opponent-action-token"
            style={{
              left: from.x,
              top: from.y,
              borderColor: `${meta.glowHex}99`,
              boxShadow: `0 0 12px ${meta.glowHex}88`,
            }}
            initial={{ x: '-50%', y: '-50%', opacity: 0.15, scale: 0.12 }}
            animate={{
              left: [from.x, from.x, midpoint.x, geometry.destination.x, geometry.destination.x],
              top: [from.y, from.y, midpoint.y, geometry.destination.y, geometry.destination.y],
              opacity: [0.15, 1, 1, 1, 0],
              scale: [0.12, 0.52, 1, 0.72, 0.38],
            }}
            transition={{
              duration: 0.72,
              delay: 0.09 + index * 0.08,
              times: [0, 0.1, 0.28, 0.78, 1],
              ease: 'easeInOut',
            }}
          >
            <img src={meta.image} alt="" draggable={false} />
          </motion.span>
        );
      })}

      <motion.span
        data-testid="opponent-harness-recipient"
        className="opponent-harness-recipient"
        style={{
          left: geometry.recipientRect.left,
          top: geometry.recipientRect.top,
          width: geometry.recipientRect.width,
          height: geometry.recipientRect.height,
          color: AFFINITY_META[trace.affinities[0]]?.glowHex ?? '#a8c5ff',
          borderColor: AFFINITY_META[trace.affinities[0]]?.glowHex ?? '#a8c5ff',
          boxShadow: `0 0 18px ${
            AFFINITY_META[trace.affinities[0]]?.glowHex ?? '#a8c5ff'
          }88`,
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: [0, 0, 1, 0.72, 0], scale: [0.9, 0.9, 1.08, 1.03, 1.16] }}
        transition={{
          duration: reduceMotion ? 0.48 : 1.02,
          delay: reduceMotion ? 0 : 0.32 + Math.max(0, trace.affinities.length - 1) * 0.08,
          times: [0, 0.28, 0.46, 0.7, 1],
          ease: 'easeOut',
        }}
      />

      <motion.span
        className="opponent-harness-avatar-impact"
        style={{
          left: geometry.destination.x,
          top: geometry.destination.y,
          color: AFFINITY_META[trace.affinities[0]]?.glowHex ?? '#a8c5ff',
          borderColor: AFFINITY_META[trace.affinities[0]]?.glowHex ?? '#a8c5ff',
        }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: [0, 1, 0], scale: [0.3, 1.15, 2.4] }}
        transition={{
          duration: reduceMotion ? 0.42 : 0.76,
          delay: reduceMotion ? 0 : 0.47 + Math.max(0, trace.affinities.length - 1) * 0.08,
          ease: 'easeOut',
        }}
      />

      <motion.div
        className="opponent-action-label"
        style={{
          left: Math.min(Math.max(geometry.destination.x, 74), geometry.width - 74),
          top: Math.min(geometry.destination.y + 28, geometry.height - 24),
        }}
        initial={{ opacity: 0, y: 5, scale: 0.94 }}
        animate={{ opacity: [0, 1, 1, 0], y: [5, 0, 0, -3], scale: [0.94, 1, 1, 0.98] }}
        transition={{ duration: reduceMotion ? 0.55 : 1.05, times: [0, 0.24, 0.72, 1] }}
      >
        <span>{trace.playerName}</span>
        <strong>Received +{total} {total === 1 ? 'Affinity' : 'Affinities'}</strong>
      </motion.div>
    </div>
  );
}
