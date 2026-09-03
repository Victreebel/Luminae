const SEAL_STAGES = [0, 1, 2] as const;

export function EminenceSigil({
  size = 24,
  value = 0,
  target = 15,
}: {
  size?: number;
  value?: number;
  target?: number;
}) {
  const eminenceProgress = Math.max(0, Math.min(value, target));
  const stageValue = target / SEAL_STAGES.length;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="eminence-seal-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6D3" />
          <stop offset="0.42" stopColor="#E7BA58" />
          <stop offset="1" stopColor="#71440D" />
        </linearGradient>
        <linearGradient id="eminence-seal-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#FFF0A8" />
          <stop offset="1" stopColor="#CA7B20" />
        </linearGradient>
      </defs>
      <path d="M50 4 75 27 69 79 50 96 31 79 25 27 50 4Z" fill="#100B12" stroke="url(#eminence-seal-metal)" strokeWidth="2.5" />
      <path d="M50 12 64 30 59 77 50 86 41 77 36 30 50 12Z" fill="none" stroke="rgba(255,239,180,0.35)" strokeWidth="1" />
      <path d="M50 17 58 31 50 45 42 31 50 17Z" fill="#24170B" stroke="#DFA847" strokeWidth="1" />
      {SEAL_STAGES.map((stage) => {
        const stageProgress = Math.max(0, Math.min(1, (eminenceProgress - stage * stageValue) / stageValue));
        const y = 39 + stage * 15;
        return (
          <g key={stage} opacity={0.28 + stageProgress * 0.72}>
            <path d={`M50 ${y - 7} 60 ${y} 50 ${y + 7} 40 ${y} 50 ${y - 7}Z`} fill={stageProgress > 0 ? "url(#eminence-seal-core)" : "#21170F"} stroke={stageProgress > 0 ? "#FFF0AE" : "rgba(222,168,71,0.46)"} strokeWidth="1" />
            <path d={`M31 ${y}H40M60 ${y}H69`} stroke={stageProgress > 0 ? "#F9D77A" : "rgba(222,168,71,0.36)"} strokeWidth="1.4" strokeLinecap="round" />
          </g>
        );
      })}
      <circle cx="50" cy="31" r="3.2" fill={eminenceProgress > 0 ? "#FFF7D1" : "#2A1B0D"} stroke="#E8B84F" strokeWidth="1.2" />
      <path d="M25 27 16 35M75 27 84 35M31 79 23 85M69 79 77 85" stroke="rgba(239,204,116,0.64)" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}
