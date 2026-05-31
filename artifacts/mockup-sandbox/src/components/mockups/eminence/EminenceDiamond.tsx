export function EminenceDiamond() {
  const scores = [0, 3, 7, 12, 15];

  return (
    <div className="min-h-screen flex items-center justify-center p-10"
      style={{ background: '#0f0c1a' }}>
      <div className="flex flex-col gap-12 items-center">

        {/* Section header */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#7c6f9a' }}>Eminence Display — Design Exploration</p>
          <p className="text-sm" style={{ color: '#a89ec0' }}>Current style vs. Diamond container</p>
        </div>

        {/* Comparison rows */}
        <div className="flex flex-col gap-10 w-full max-w-2xl">

          {/* ── Current style row ─────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: '#7c6f9a' }}>Current — number + icon</p>
            <div className="flex items-center gap-8 flex-wrap">
              {scores.map(n => (
                <div key={n} className="flex flex-col items-center gap-2">
                  {/* Large sidebar */}
                  <div className="flex items-center gap-1">
                    <span className="font-serif font-bold text-white" style={{ fontSize: 36 }}>{n}</span>
                    <CurrentDiamond size={22} />
                  </div>
                  {/* Compact inline */}
                  <div className="flex items-center gap-0.5">
                    <span className="font-serif font-black text-white" style={{ fontSize: 18 }}>{n}</span>
                    <CurrentDiamond size={12} />
                  </div>
                  {/* Tiny chip */}
                  <div className="flex items-center gap-0.5">
                    <span className="text-white" style={{ fontSize: 13 }}>{n}</span>
                    <CurrentDiamond size={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Diamond container row ─────────────────────────── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: '#7c6f9a' }}>Proposed — number inside diamond</p>
            <div className="flex items-center gap-8 flex-wrap">
              {scores.map(n => (
                <div key={n} className="flex flex-col items-center gap-2">
                  {/* Large sidebar */}
                  <DiamondBadge value={n} size="lg" />
                  {/* Compact inline */}
                  <DiamondBadge value={n} size="md" />
                  {/* Tiny chip */}
                  <DiamondBadge value={n} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* ── In-context player bar mockup ──────────────────── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: '#7c6f9a' }}>In-context — player bar comparison</p>
            <div className="flex flex-col gap-3">
              {/* Current */}
              <PlayerBar label="Current" lumens={7} useDiamond={false} />
              {/* Proposed */}
              <PlayerBar label="Proposed" lumens={7} useDiamond={true} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function CurrentDiamond({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10"
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
      aria-hidden="true">
      <polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="white" />
    </svg>
  );
}

function DiamondBadge({ value, size }: { value: number; size: 'sm' | 'md' | 'lg' }) {
  const dims = {
    sm: { outer: 26, fontSize: 11, fontWeight: 800 },
    md: { outer: 36, fontSize: 15, fontWeight: 800 },
    lg: { outer: 54, fontSize: 22, fontWeight: 700 },
  }[size];

  const isWin = value >= 15;

  return (
    <div style={{
      position: 'relative',
      width: dims.outer,
      height: dims.outer,
      flexShrink: 0,
    }}>
      <svg
        viewBox="0 0 100 100"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id={`grad-${size}-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={isWin ? '#fffbe6' : '#d4a843'} />
            <stop offset="50%"  stopColor={isWin ? '#ffd700' : '#b8892a'} />
            <stop offset="100%" stopColor={isWin ? '#c8a200' : '#8a6018'} />
          </linearGradient>
          {isWin && (
            <filter id={`glow-${size}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          )}
        </defs>
        {/* Shadow polygon */}
        <polygon
          points="50,4 96,50 50,96 4,50"
          fill="rgba(0,0,0,0.45)"
          transform="translate(2,3)"
        />
        {/* Main diamond */}
        <polygon
          points="50,4 96,50 50,96 4,50"
          fill={`url(#grad-${size}-${value})`}
          filter={isWin ? `url(#glow-${size})` : undefined}
        />
        {/* Inner highlight */}
        <polygon
          points="50,12 88,50 50,88 12,50"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />
      </svg>
      {/* Number centred over diamond */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia, serif',
        fontSize: dims.fontSize,
        fontWeight: dims.fontWeight,
        color: isWin ? '#1a1200' : '#fff8e8',
        lineHeight: 1,
        textShadow: isWin ? 'none' : '0 1px 2px rgba(0,0,0,0.6)',
        userSelect: 'none',
      }}>
        {value}
      </div>
    </div>
  );
}

function PlayerBar({ label, lumens, useDiamond }: { label: string; lumens: number; useDiamond: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs" style={{ color: '#7c6f9a' }}>{label}</p>
      <div className="flex items-center gap-3 rounded-lg px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', width: 'fit-content' }}>
        {/* Avatar placeholder */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: '#3d2a6e', color: '#c4a8ff' }}>A</div>
        {/* Name */}
        <span className="text-sm font-medium" style={{ color: '#e2d9f3' }}>Ariadne</span>
        {/* Eminence */}
        {useDiamond ? (
          <DiamondBadge value={lumens} size="sm" />
        ) : (
          <div className="flex items-center gap-0.5">
            <span className="font-serif font-black text-white" style={{ fontSize: 18 }}>{lumens}</span>
            <CurrentDiamond size={12} />
          </div>
        )}
      </div>
    </div>
  );
}
