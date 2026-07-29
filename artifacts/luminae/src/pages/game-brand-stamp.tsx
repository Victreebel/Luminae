import { useId } from 'react';

export const STAMP_VIEWBOX_WIDTH = 220;
export const STAMP_VIEWBOX_HEIGHT = 100;

export function BrandStampSVG({
  width,
  height,
  accent,
  accentGlow,
  accentDark,
  label = 'FORGED',
  showForgeCrest = true,
}: {
  width: number | string;
  height: number | string;
  accent: string;
  accentGlow: string;
  accentDark: string;
  label?: string;
  showForgeCrest?: boolean;
}) {
  const filterId = useId().replace(/:/g, '');
  const glowId = `stamp-glow-${filterId}`;
  const textGlowId = `stamp-text-glow-${filterId}`;
  const cx = STAMP_VIEWBOX_WIDTH / 2;
  const hammerY = 32;
  const textY = showForgeCrest ? 83 : 61;
  const fontSize = showForgeCrest ? 30 : label.length > 8 ? 25 : 30;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${STAMP_VIEWBOX_WIDTH} ${STAMP_VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={textGlowId} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x="4"
        y="4"
        width={STAMP_VIEWBOX_WIDTH - 8}
        height={STAMP_VIEWBOX_HEIGHT - 8}
        rx="4"
        fill="rgba(0,0,0,0.62)"
      />
      <rect
        x="4"
        y="4"
        width={STAMP_VIEWBOX_WIDTH - 8}
        height={STAMP_VIEWBOX_HEIGHT - 8}
        rx="4"
        fill="none"
        stroke={accent}
        strokeWidth="4.5"
        filter={`url(#${glowId})`}
      />
      <rect
        x="9"
        y="9"
        width={STAMP_VIEWBOX_WIDTH - 18}
        height={STAMP_VIEWBOX_HEIGHT - 18}
        rx="2.5"
        fill="none"
        stroke={accent}
        strokeWidth="1.2"
        opacity="0.45"
      />
      <line
        x1="20"
        y1="50"
        x2={STAMP_VIEWBOX_WIDTH - 20}
        y2="50"
        stroke={accent}
        strokeWidth="1.5"
        opacity={showForgeCrest ? 0.5 : 0.3}
      />

      {showForgeCrest && (
        <g filter={`url(#${glowId})`}>
          {[-45, 45].map((rotation) => (
            <g key={rotation} transform={`translate(${cx},${hammerY}) rotate(${rotation})`}>
              <rect x="-14" y="-26" width="28" height="15" rx="3" fill={accent} />
              <rect x="-11" y="-22" width="10" height="7" rx="1.5" fill={accentGlow} opacity="0.38" />
              <rect x="-4.5" y="-11" width="9" height="29" rx="2.5" fill={accentDark} />
              <rect x="-2" y="-9" width="3" height="18" rx="1" fill={accentGlow} opacity="0.28" />
            </g>
          ))}
        </g>
      )}

      <text
        x={cx}
        y={textY}
        fontFamily='"Cinzel Decorative", "Cinzel", Georgia, serif'
        fontWeight="900"
        fontSize={fontSize}
        fill={accent}
        textAnchor="middle"
        letterSpacing="0"
        filter={`url(#${textGlowId})`}
      >
        {label.toUpperCase()}
      </text>
      <text
        x={cx}
        y={textY}
        fontFamily='"Cinzel Decorative", "Cinzel", Georgia, serif'
        fontWeight="900"
        fontSize={fontSize}
        fill={accentGlow}
        fillOpacity="0.40"
        textAnchor="middle"
        letterSpacing="0"
      >
        {label.toUpperCase()}
      </text>
    </svg>
  );
}
