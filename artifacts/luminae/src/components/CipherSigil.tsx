export function CipherSigil({
  affinityHex,
  id,
}: {
  affinityHex: string;
  id: number;
}) {
  const glowId = `ca-glow-${id}`;
  const bloomId = `ca-bloom-${id}`;
  const whiteId = `ca-white-${id}`;

  return (
    <svg
      viewBox="0 0 96 96"
      className="h-full w-full"
      data-cipher-sigil="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={bloomId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={whiteId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        data-cipher-part="aura"
        points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
        fill={affinityHex}
        opacity="0.13"
        filter={`url(#${bloomId})`}
      />
      <polygon
        data-cipher-line="outer"
        pathLength="1"
        points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
        fill="none"
        stroke={affinityHex}
        strokeWidth="1.4"
        opacity="0.88"
        filter={`url(#${glowId})`}
      />
      <polygon
        data-cipher-line="middle"
        pathLength="1"
        points="82,48 64.5,78 31.5,78 14,48 31.5,18 64.5,18"
        fill="none"
        stroke="rgba(210,240,255,0.28)"
        strokeWidth="0.6"
        filter={`url(#${whiteId})`}
      />
      <polygon
        data-cipher-line="inner"
        pathLength="1"
        points="71,61.5 48,73 25,61.5 25,34.5 48,23 71,34.5"
        fill="none"
        stroke={affinityHex}
        strokeWidth="0.85"
        opacity="0.52"
      />
      <rect
        data-cipher-part="core-outer"
        x="37"
        y="37"
        width="22"
        height="22"
        rx="1"
        transform="rotate(45 48 48)"
        fill={affinityHex}
        opacity="0.58"
        filter={`url(#${glowId})`}
      />
      <rect
        data-cipher-part="core-middle"
        x="41.5"
        y="41.5"
        width="13"
        height="13"
        transform="rotate(45 48 48)"
        fill="rgba(220,245,255,0.28)"
      />
      <rect
        data-cipher-part="core-inner"
        x="45"
        y="45"
        width="6"
        height="6"
        transform="rotate(45 48 48)"
        fill="white"
        opacity="0.22"
        filter={`url(#${whiteId})`}
      />
      {(
        [
          [87, 48],
          [67.5, 81.5],
          [28.5, 81.5],
          [9, 48],
          [28.5, 14.5],
          [67.5, 14.5],
        ] as [number, number][]
      ).map(([x, y], index) => (
        <circle
          key={index}
          data-cipher-node={index}
          cx={x}
          cy={y}
          r="2.6"
          fill={affinityHex}
          opacity="0.9"
        />
      ))}
      <line
        data-cipher-line="cross-a"
        pathLength="1"
        x1="20"
        y1="28"
        x2="76"
        y2="68"
        stroke={affinityHex}
        strokeWidth="0.6"
        opacity="0.36"
        strokeDasharray="2.8 4.2"
      />
      <line
        data-cipher-line="cross-b"
        pathLength="1"
        x1="20"
        y1="68"
        x2="76"
        y2="28"
        stroke={affinityHex}
        strokeWidth="0.6"
        opacity="0.36"
        strokeDasharray="2.8 4.2"
      />
    </svg>
  );
}
