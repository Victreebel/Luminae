import React, { useEffect, useRef, useState } from 'react';

const HOLD_TO_SKIP_MS = 350;
const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface LuminaryEffectAnnouncementProps {
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
  return (
    <div
      className={`lum-effect-announcement-card${compact ? ' lum-effect-announcement-card--compact' : ''}`}
      style={{
        '--lum-effect-primary': primaryColor,
        '--lum-effect-secondary': secondaryColor ?? primaryColor,
      } as React.CSSProperties}
    >
      {queueLabel && (
        <div className="lum-effect-announcement-kicker">{queueLabel}</div>
      )}
      <div className="lum-effect-announcement-title">{effectName}</div>
      {resultLabel && (
        <div className="lum-effect-announcement-subtitle">{resultLabel}</div>
      )}
      {luminaryName && !resultLabel && (
        <div className="lum-effect-announcement-subtitle">{luminaryName}</div>
      )}
      {description && (
        <div className="lum-effect-announcement-description">{description}</div>
      )}
      {(triggeringPlayerName || (luminaryName && resultLabel)) && (
        <div className="lum-effect-announcement-kicker">
          {[luminaryName, triggeringPlayerName].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
}

interface LuminaryEffectSkipControlProps {
  color: string;
  onSkip: () => void;
  reducedMotion?: boolean;
  label?: string;
}

export function LuminaryEffectSkipControl({
  color,
  onSkip,
  reducedMotion = false,
  label = 'Skip current effect phase',
}: LuminaryEffectSkipControlProps) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

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
    onSkipRef.current();
  };

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (reducedMotion) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (startRef.current !== null) return;
    event.preventDefault();
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
      className="fixed bottom-4 right-4 z-[9002] flex items-center gap-2 border-0 bg-transparent p-1 text-white/70"
      style={{
        cursor: reducedMotion ? 'pointer' : 'default',
        pointerEvents: 'auto',
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (reducedMotion) finish();
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
        {reducedMotion ? 'tap to skip' : 'hold to skip'}
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
