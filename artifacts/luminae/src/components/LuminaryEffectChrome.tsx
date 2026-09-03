import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';

const HOLD_TO_SKIP_MS = 350;
const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export interface LuminaryEffectAnnouncementProps {
  effectName: string;
  luminaryName?: string;
  resultLabel?: string;
  description?: string;
  triggeringPlayerName?: string;
  queueLabel?: string;
  primaryColor: string;
  secondaryColor?: string;
  compact?: boolean;
}

export function LuminaryEffectCaptionRail({
  effectName,
  luminaryName,
  resultLabel,
  description,
  triggeringPlayerName,
  queueLabel,
  primaryColor,
  secondaryColor,
}: LuminaryEffectAnnouncementProps) {
  const queueProgress = compactQueueLabel(queueLabel);
  const accessibleContext = [
    queueLabel,
    effectName,
    resultLabel,
    description,
    luminaryName,
    triggeringPlayerName,
  ].filter(Boolean).join('. ');

  return (
    <div
      className="lum-effect-caption-rail"
      data-testid="luminary-effect-caption-rail"
      aria-label={accessibleContext}
      style={{
        '--lum-effect-primary': primaryColor,
        '--lum-effect-secondary': secondaryColor ?? primaryColor,
      } as React.CSSProperties}
    >
      <div className="lum-effect-caption-rail__inner">
        <span className="lum-effect-caption-rail__signal" aria-hidden="true" />
        <span className="lum-effect-caption-rail__title">{effectName}</span>
        <span className="lum-effect-caption-rail__detail">
          {resultLabel && (
            <span className="lum-effect-caption-rail__result">{resultLabel}</span>
          )}
          {description && (
            <span className="lum-effect-caption-rail__description">{description}</span>
          )}
        </span>
        {queueProgress && (
          <span className="lum-effect-caption-rail__progress" aria-hidden="true">
            {queueProgress}
          </span>
        )}
      </div>
    </div>
  );
}

function compactQueueLabel(queueLabel?: string): string | undefined {
  if (!queueLabel) return undefined;
  const match = queueLabel.match(/(\d+)\s+OF\s+(\d+)/i);
  return match ? `${match[1]}/${match[2]}` : undefined;
}

export function LuminaryEffectAnnouncement({
  effectName,
  luminaryName,
  resultLabel,
  description,
  triggeringPlayerName,
  queueLabel,
  primaryColor,
  secondaryColor,
  compact = false,
}: LuminaryEffectAnnouncementProps) {
  const queueProgress = compactQueueLabel(queueLabel);
  const identityOnly = !description && !resultLabel;
  const accessibleContext = [
    queueLabel,
    effectName,
    resultLabel,
    description,
    luminaryName,
    triggeringPlayerName,
  ].filter(Boolean).join('. ');

  return (
    <div
      className={[
        'lum-effect-announcement-card',
        compact ? 'lum-effect-announcement-card--compact' : '',
        identityOnly ? 'lum-effect-announcement-card--identity' : '',
        resultLabel ? 'lum-effect-announcement-card--result' : '',
      ].filter(Boolean).join(' ')}
      aria-label={accessibleContext}
      style={{
        '--lum-effect-primary': primaryColor,
        '--lum-effect-secondary': secondaryColor ?? primaryColor,
      } as React.CSSProperties}
    >
      {queueProgress && (
        <div className="lum-effect-announcement-progress" aria-hidden="true">
          {queueProgress}
        </div>
      )}
      <div className="lum-effect-announcement-title">{effectName}</div>
      {resultLabel && (
        <div className="lum-effect-announcement-result">{resultLabel}</div>
      )}
      {identityOnly && luminaryName && (
        <div className="lum-effect-announcement-subtitle">{luminaryName}</div>
      )}
      {description && (
        <div className="lum-effect-announcement-description">{description}</div>
      )}
    </div>
  );
}

export interface LuminaryEffectReceiptData {
  eventId: string;
  effectName: string;
  luminaryName?: string;
  result: string;
  triggeringPlayerName?: string;
  primaryColor: string;
  secondaryColor?: string;
}

interface LuminaryEffectResultReceiptProps {
  receipts: LuminaryEffectReceiptData[];
  activeSequence?: boolean;
  onDismiss: () => void;
}

export function LuminaryEffectResultReceipt({
  receipts,
  activeSequence = false,
  onDismiss,
}: LuminaryEffectResultReceiptProps) {
  const [expanded, setExpanded] = useState(!activeSequence);
  const receiptKey = receipts.map(receipt => receipt.eventId).join(':');
  const latest = receipts[receipts.length - 1];

  useEffect(() => {
    if (!receiptKey) return;
    if (activeSequence) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    const readableHoldMs = Math.min(14_000, 6_500 + receipts.length * 1_500);
    const timer = window.setTimeout(() => setExpanded(false), readableHoldMs);
    return () => window.clearTimeout(timer);
  }, [activeSequence, receiptKey, receipts.length]);

  if (!latest) return null;

  const receiptCountLabel = receipts.length === 1
    ? 'Effect resolved'
    : `${receipts.length} effects resolved`;
  const collapsedLabel = `${latest.effectName}: ${latest.result}`;

  return (
    <div
      className={[
        'lum-effect-receipt',
        expanded ? 'lum-effect-receipt--expanded' : 'lum-effect-receipt--collapsed',
        activeSequence ? 'lum-effect-receipt--during-sequence' : '',
      ].join(' ')}
      data-testid="luminary-effect-result-receipt"
      role="status"
      aria-live="polite"
      style={{
        '--lum-effect-primary': latest.primaryColor,
        '--lum-effect-secondary': latest.secondaryColor ?? latest.primaryColor,
      } as React.CSSProperties}
    >
      <button
        type="button"
        className="lum-effect-receipt__body"
        aria-expanded={expanded}
        aria-label={activeSequence
          ? collapsedLabel
          : expanded
            ? 'Collapse resolved effects'
            : `Show details: ${collapsedLabel}`}
        onClick={() => {
          if (!activeSequence) setExpanded(value => !value);
        }}
      >
        <span className="lum-effect-receipt__status" aria-hidden="true">
          <Check size={16} strokeWidth={2.5} />
        </span>
        <span className="lum-effect-receipt__copy">
          <span className="lum-effect-receipt__kicker">{receiptCountLabel}</span>
          {expanded ? (
            <span className="lum-effect-receipt__results">
              {receipts.map(receipt => (
                <span className="lum-effect-receipt__result" key={receipt.eventId}>
                  <span className="lum-effect-receipt__title">{receipt.effectName}</span>
                  <span className="lum-effect-receipt__description">{receipt.result}</span>
                </span>
              ))}
            </span>
          ) : (
            <span className="lum-effect-receipt__collapsed-label">{collapsedLabel}</span>
          )}
        </span>
        <span className="lum-effect-receipt__toggle" aria-hidden="true">
          {expanded
            ? <ChevronUp size={18} strokeWidth={2} />
            : <ChevronDown size={18} strokeWidth={2} />}
        </span>
      </button>
      <button
        type="button"
        className="lum-effect-receipt__dismiss"
        aria-label="Dismiss resolved effects"
        title="Dismiss"
        onClick={onDismiss}
      >
        <X size={17} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

interface LuminaryEffectSkipControlProps {
  color: string;
  onAdvance?: () => void;
  onSkip: () => void;
  reducedMotion?: boolean;
  label?: string;
  docked?: boolean;
}

export function LuminaryEffectSkipControl({
  color,
  onAdvance,
  onSkip,
  label = 'Advance current beat; hold to skip this effect',
  docked = false,
}: LuminaryEffectSkipControlProps) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const onSkipRef = useRef(onSkip);
  const onAdvanceRef = useRef(onAdvance);
  onSkipRef.current = onSkip;
  onAdvanceRef.current = onAdvance;

  const reset = () => {
    startRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setProgress(0);
  };

  const finish = () => {
    reset();
    suppressClickRef.current = true;
    onSkipRef.current();
  };

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (startRef.current !== null) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = performance.now();

    const tick = () => {
      if (startRef.current === null) return;
      const nextProgress = Math.min(
        (performance.now() - startRef.current) / HOLD_TO_SKIP_MS,
        1,
      );
      setProgress(nextProgress);
      if (nextProgress >= 1) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const offset = RING_CIRCUMFERENCE * (1 - progress);
  return (
    <button
      type="button"
      data-testid="luminary-effect-skip"
      aria-label={label}
      className={`lum-effect-skip-control${docked ? ' lum-effect-skip-control--docked' : ''} fixed bottom-4 right-4 z-[9002] flex items-center gap-2 border-0 bg-transparent p-1 text-white/70`}
      style={{
        cursor: 'pointer',
        pointerEvents: 'auto',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onAdvanceRef.current?.();
      }}
      onPointerDown={start}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      <span
        className="text-[10px] uppercase"
        style={{ letterSpacing: '0.14em' }}
      >
        {onAdvance ? 'tap next · hold skip' : 'hold to skip'}
      </span>
      <svg
        width={40}
        height={40}
        viewBox="0 0 40 40"
        aria-hidden="true"
        style={{ display: 'block', transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={20}
          cy={20}
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2.5}
        />
        <circle
          cx={20}
          cy={20}
          r={RING_RADIUS}
          fill="none"
          stroke={progress > 0 ? color : 'rgba(255,255,255,0.35)'}
          strokeWidth={2.5}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 30ms linear, stroke 150ms ease',
          }}
        />
      </svg>
    </button>
  );
}
