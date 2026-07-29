const F  = '#ef4444';
const C  = '#3b82f6';
const V  = '#22c55e';
const A  = '#a855f7';
const R  = '#e2e8f0';
const GOLD  = '#c4a85a';
const GOLD2 = '#ead68c';
const GOLD3 = '#7a6030';
const BG_DEEP = '#030509';
const BG_MID  = '#08091a';

const toRad = (d: number) => (d * Math.PI) / 180;
const arcPath = (cx: number, cy: number, r: number, s: number, e: number) => {
  const x1 = cx + r * Math.cos(toRad(s));
  const y1 = cy + r * Math.sin(toRad(s));
  const x2 = cx + r * Math.cos(toRad(e));
  const y2 = cy + r * Math.sin(toRad(e));
  const large = Math.abs(e - s) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};
const pt = (cx: number, cy: number, r: number, deg: number): [number, number] => [
  cx + r * Math.cos(toRad(deg)),
  cy + r * Math.sin(toRad(deg)),
];

function CardBackTier2({ count: _count }: { count?: number }) {
  const id = 't2cb';
  const CX = 35, CY = 54;
  const rings = [
    { r: 10,  segs: 8, span: 35, step: 45,  startOff: -90, colors: [F,C,V,A,R,F,C,V] as string[] },
    { r: 16,  segs: 6, span: 48, step: 60,  startOff: -75, colors: [V,A,R,F,C,V]     as string[] },
    { r: 22,  segs: 4, span: 68, step: 90,  startOff: -60, colors: [C,A,F,R]         as string[] },
  ];
  return (
    <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#100c28" />
          <stop offset="55%" stopColor={BG_MID} />
          <stop offset="100%" stopColor={BG_DEEP} />
        </radialGradient>
        <radialGradient id={`${id}-star`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffef0" stopOpacity="1" />
          <stop offset="18%" stopColor="#fff0a0" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#ffa030" stopOpacity="0.65" />
          <stop offset="70%" stopColor="#c04010" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#400808" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-corona`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8c0" stopOpacity="0.5" />
          <stop offset="35%" stopColor="#ff9020" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ff4000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD2} stopOpacity="0.88" />
          <stop offset="50%" stopColor={GOLD} stopOpacity="1" />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5" />
        </linearGradient>
        <filter id={`${id}-starglow`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id={`${id}-arcglow`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="1.0" />
        </filter>
      </defs>
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />
      {([[6,6],[63,10],[16,17],[54,21],[9,31],[66,36],[5,57],[67,62],[15,74],[59,77],[8,87],[64,91],[26,9],[46,7],[38,94],[22,92],[14,46],[58,44]] as [number,number][]).map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 0.42 : 0.24} fill="#fff" opacity={0.13 + (i % 5) * 0.05} />
      ))}
      <rect x="3.5" y="3.5" width="63" height="93" rx="1.5" fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.82" />
      <rect x="5.5" y="5.5" width="59" height="89" rx="1" fill="none" stroke={GOLD3} strokeWidth="0.3" strokeOpacity="0.5" />
      {([
        ["M3.5 17 L3.5 3.5 L17 3.5", "M7 14.5 L7 7 L14.5 7"],
        ["M53 3.5 L66.5 3.5 L66.5 17", "M55.5 7 L63 7 L63 14.5"],
        ["M3.5 83 L3.5 96.5 L17 96.5", "M7 85.5 L7 93 L14.5 93"],
        ["M53 96.5 L66.5 96.5 L66.5 83", "M55.5 93 L63 93 L63 85.5"],
      ] as [string,string][]).map(([o,n],i) => (
        <g key={i}>
          <path d={o} fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square" />
          <path d={n} fill="none" stroke={GOLD} strokeWidth="0.6" strokeLinecap="square" />
        </g>
      ))}
      {([[3.5,3.5],[66.5,3.5],[3.5,96.5],[66.5,96.5]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.35" fill={GOLD} opacity="0.9" />
      ))}
      {[26,35,44].map(x => (
        <g key={x}>
          <line x1={x} y1="3.5" x2={x} y2={x===35?8.5:7} stroke={GOLD} strokeWidth={x===35?0.88:0.56} />
          <line x1={x} y1="96.5" x2={x} y2={x===35?91.5:93} stroke={GOLD} strokeWidth={x===35?0.88:0.56} />
        </g>
      ))}
      {[40,50,60].map(y => (
        <g key={y}>
          <line x1="3.5" y1={y} x2={y===50?8.5:7} y2={y} stroke={GOLD} strokeWidth={y===50?0.88:0.56} />
          <line x1="66.5" y1={y} x2={y===50?61.5:63} y2={y} stroke={GOLD} strokeWidth={y===50?0.88:0.56} />
        </g>
      ))}
      <text x="35" y="15" textAnchor="middle" fontFamily="Georgia, serif" fontSize="5" fill={GOLD2} opacity="0.75" letterSpacing="2">II</text>
      <line x1="30" y1="16.5" x2="40" y2="16.5" stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.52" />
      <circle cx={CX} cy={CY} r="14" fill={`url(#${id}-corona)`} />
      {rings.map(({ r, segs, span, step, startOff, colors }, ri) => (
        <g key={ri}>
          <circle cx={CX} cy={CY} r={r} fill="none" stroke={ri === 0 ? "#3050a0" : GOLD3} strokeWidth={ri === 0 ? 0.3 : 0.28} strokeOpacity={ri === 0 ? 0.3 : 0.25} strokeDasharray="1.5 1.5" />
          {Array.from({ length: segs }).map((_, i) => {
            const s = startOff + i * step;
            const e = s + span;
            const col = colors[i % colors.length];
            const [mx, my] = pt(CX, CY, r, s + span/2);
            return (
              <g key={i}>
                <path d={arcPath(CX, CY, r, s, e)} fill="none" stroke={col} strokeWidth={ri===0?3.5:ri===1?3:2.5} strokeOpacity="0.1" strokeLinecap="round" filter={`url(#${id}-arcglow)`} />
                <path d={arcPath(CX, CY, r, s, e)} fill="none" stroke={col} strokeWidth={ri===0?1.5:ri===1?1.3:1.1} strokeOpacity={ri===0?0.75:ri===1?0.68:0.6} strokeLinecap="round" />
                <path d={arcPath(CX, CY, r, s, e)} fill="none" stroke="#ffffff" strokeWidth="0.35" strokeOpacity="0.18" strokeLinecap="round" />
                <circle cx={mx} cy={my} r={ri===0?0.9:0.75} fill="#080c28" stroke={GOLD3} strokeWidth="0.3" />
              </g>
            );
          })}
          {ri < 2 && Array.from({ length: 4 }).map((_, i) => {
            const deg = i * 90 + startOff + span/2;
            const [x1, y1] = pt(CX, CY, r, deg);
            const [x2, y2] = pt(CX, CY, rings[ri+1].r, deg);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.45" />;
          })}
        </g>
      ))}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const [x, y] = pt(CX, CY, 9, deg);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke={i % 2 === 0 ? "#ffe090" : "#ffb040"} strokeWidth="0.35" strokeOpacity="0.35" />;
      })}
      <circle cx={CX} cy={CY} r="7" fill={`url(#${id}-star)`} filter={`url(#${id}-starglow)`} opacity="0.55" />
      <circle cx={CX} cy={CY} r="5.5" fill={`url(#${id}-star)`} />
      <line x1={CX-9} y1={CY} x2={CX+9} y2={CY} stroke="#fff8c0" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1={CX} y1={CY-9} x2={CX} y2={CY+9} stroke="#fff8c0" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1={CX-6} y1={CY-6} x2={CX+6} y2={CY+6} stroke="#ffc060" strokeWidth="0.25" strokeOpacity="0.28" />
      <line x1={CX+6} y1={CY-6} x2={CX-6} y2={CY+6} stroke="#ffc060" strokeWidth="0.25" strokeOpacity="0.28" />
      <text x="35" y="91.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="3.8" fill={GOLD} opacity="0.32" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}

export function TierII() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#060810 0%,#0a0c1e 60%,#040608 100%)' }}>
      <div className="flex flex-col items-center gap-10">
        <div className="flex items-end gap-10">
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 210, height: 300 }}><CardBackTier2 /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>large (review)</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 112, height: 160 }}><CardBackTier2 /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>in-game Forge</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 36, height: 51 }}><CardBackTier2 count={10} /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>deck tile</span>
          </div>
        </div>
        <div style={{ color: '#c4a85a', fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: '0.2em', opacity: 0.8 }}>
          TIER II — STELLAR CIVILIZATION
        </div>
      </div>
    </div>
  );
}
