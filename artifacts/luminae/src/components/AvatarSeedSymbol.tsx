import React from 'react';

export function AvatarSeedSymbol({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <path
        d="M24 2.8 39.4 11.7 43 29.4 31.2 43H16.8L5 29.4l3.6-17.7L24 2.8Z"
        fill="rgba(3,12,12,.9)"
        stroke="#d5b96c"
        strokeWidth="1.5"
      />
      <path
        d="M24 8.8c6.1 5.5 8.5 10.2 7.1 14.2-1 2.9-3.4 5.1-7.1 6.7-3.7-1.6-6.1-3.8-7.1-6.7-1.4-4 1-8.7 7.1-14.2Z"
        fill="rgba(74,222,128,.24)"
        stroke="#67e8a2"
        strokeWidth="1.7"
      />
      <path d="m24 9.6-3.1 12.2L24 28.6l3.1-6.8L24 9.6Z" stroke="#b9f6d0" strokeWidth="1" />
      <circle cx="24" cy="22" r="2.4" fill="#e6cb79" />
      <path d="M24 29.2v8.6m0-3.1-6.2-4.4m6.2 4.4 6.2-4.4" stroke="#67e8a2" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.5 17.1c3.5-5 8-7.5 12.5-7.5m12.5 7.5c-3.5-5-8-7.5-12.5-7.5M12.2 33c3.7 4 7.6 5.9 11.8 5.9M35.8 33c-3.7 4-7.6 5.9-11.8 5.9" stroke="#49bfa3" strokeWidth="1" strokeLinecap="round" opacity=".8" />
      <circle cx="10.2" cy="19.8" r="1.5" fill="#d5b96c" />
      <circle cx="37.8" cy="19.8" r="1.5" fill="#d5b96c" />
    </svg>
  );
}

export function AvatarSeedMoldMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-label="Avatar Seed mold"
      className="avatar-seed-mold-mark pointer-events-none grid place-items-center"
      data-testid="avatar-seed-mold-mark"
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        transform: 'translateX(-50%)',
        width: compact ? 16 : 22,
        height: compact ? 16 : 22,
        zIndex: 36,
        filter: 'drop-shadow(0 0 4px rgba(74,222,128,.8)) drop-shadow(0 1px 2px rgba(0,0,0,.9))',
      }}
    >
      <AvatarSeedSymbol size={compact ? 16 : 22} />
    </span>
  );
}
