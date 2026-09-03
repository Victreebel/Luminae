import type { CSSProperties } from 'react';

export function AffinityReservoirSymbol({
  value,
  capacity = 10,
  compact = false,
  className = '',
  title,
  ariaLabel,
}: {
  value?: number;
  capacity?: number;
  compact?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  const hasValue = typeof value === 'number';
  const safeValue = hasValue ? Math.max(0, value) : 0;
  const progress = hasValue
    ? Math.min(capacity, safeValue) / Math.max(1, capacity)
    : 1;
  const capacityState = hasValue && safeValue >= capacity
    ? 'full'
    : hasValue && safeValue >= capacity - 2
      ? 'near'
      : 'open';
  const color = capacityState === 'full'
    ? '#f87171'
    : capacityState === 'near'
      ? '#fbbf24'
      : '#a8c5ff';

  return (
    <span
      className={`affinity-well-symbol ${compact ? 'affinity-well-symbol--compact' : ''} ${className}`.trim()}
      data-capacity-state={capacityState}
      data-has-progress={!hasValue || safeValue > 0 ? 'true' : 'false'}
      data-progress-complete={!hasValue || safeValue >= capacity ? 'true' : 'false'}
      title={title}
      {...(hasValue
        ? { role: 'img', 'aria-label': ariaLabel ?? `${safeValue} affinities held` }
        : { 'aria-hidden': true })}
      style={{
        '--affinity-held-color': color,
        '--affinity-held-progress': `${progress}turn`,
      } as CSSProperties}
    >
      <span className="affinity-well-symbol__rim" aria-hidden="true" />
      {hasValue && <span className="affinity-well-symbol__count">{safeValue}</span>}
      <span className="affinity-well-symbol__terminal affinity-well-symbol__terminal--start" aria-hidden="true" />
      <span className="affinity-well-symbol__terminal affinity-well-symbol__terminal--end" aria-hidden="true" />
      <span className="affinity-well-symbol__keystone" aria-hidden="true" />
    </span>
  );
}
