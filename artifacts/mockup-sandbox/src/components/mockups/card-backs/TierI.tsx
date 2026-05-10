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

function CardBackTier1({ count: _count }: { count?: number }) {
  const id = 't1cb';
  const PX = 35, PY = 56, PR = 16;
  const cityNodes: [number, number, string][] = [
    [35, 44.5, F], [46, 51.5, C], [42, 64.5, V], [28, 64.5, A], [24, 51.5, R],
  ];
  const ORB_R = PR + 4.5;
  return (
    <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="54%" r="62%">
          <stop offset="0%" stopColor="#0a0e22" />
          <stop offset="55%" stopColor={BG_MID} />
          <stop offset="100%" stopColor={BG_DEEP} />
        </radialGradient>
        <radialGradient id={`${id}-planet`} cx="40%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#2248a0" />
          <stop offset="30%" stopColor="#102260" />
          <stop offset="70%" stopColor="#081438" />
          <stop offset="100%" stopColor="#030a1c" />
        </radialGradient>
        <radialGradient id={`${id}-night`} cx="18%" cy="50%" r="72%">
          <stop offset="0%" stopColor="#000008" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#000008" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000008" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-atmo`} cx="50%" cy="50%" r="50%">
          <stop offset="72%" stopColor="#1a60e0" stopOpacity="0" />
          <stop offset="85%" stopColor="#4090ff" stopOpacity="0.55" />
          <stop offset="94%" stopColor="#80c0ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a0d8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-land`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2a5840" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1a3828" stopOpacity="0.5" />
        </radialGradient>
        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD2} stopOpacity="0.75" />
          <stop offset="50%" stopColor={GOLD} stopOpacity="1" />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5" />
        </linearGradient>
        <clipPath id={`${id}-clip`}><circle cx={PX} cy={PY} r={PR} /></clipPath>
      </defs>
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />
      {([[6,6],[63,9],[14,18],[58,22],[8,38],[65,43],[7,72],[66,68],[12,82],[59,85],[9,93],[64,92]] as [number,number][]).map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.4 : 0.22} fill="#fff" opacity={0.16 + (i % 4) * 0.055} />
      ))}
      <rect x="4" y="4" width="62" height="92" rx="1.5" fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.72" />
      <rect x="6.5" y="6.5" width="57" height="87" rx="0.8" fill="none" stroke={GOLD3} strokeWidth="0.28" strokeOpacity="0.42" />
      <path d="M4 16 L4 4 L16 4" fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M54 4 L66 4 L66 16" fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M4 84 L4 96 L16 96" fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M54 96 L66 96 L66 84" fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      {([[4,4],[66,4],[4,96],[66,96]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill={GOLD} opacity="0.82" />
      ))}
      <line x1="35" y1="4" x2="35" y2="7.5" stroke={GOLD} strokeWidth="0.6" />
      <line x1="35" y1="96" x2="35" y2="92.5" stroke={GOLD} strokeWidth="0.6" />
      <line x1="4" y1="50" x2="7.5" y2="50" stroke={GOLD} strokeWidth="0.6" />
      <line x1="66" y1="50" x2="62.5" y2="50" stroke={GOLD} strokeWidth="0.6" />
      <text x="35" y="14.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="5" fill={GOLD2} opacity="0.72" letterSpacing="1">I</text>
      <line x1="31.5" y1="16" x2="38.5" y2="16" stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.5" />
      <circle cx={PX} cy={PY} r={PR + 3.5} fill={`url(#${id}-atmo)`} />
      <circle cx={PX} cy={PY} r={PR} fill={`url(#${id}-planet)`} />
      <polygon points={`${PX+2},${PY-12} ${PX+9},${PY-9} ${PX+12},${PY-4} ${PX+9},${PY+1} ${PX+4},${PY+3} ${PX},${PY-1} ${PX+1},${PY-8}`} fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />
      <polygon points={`${PX-3},${PY+5} ${PX+4},${PY+4} ${PX+7},${PY+9} ${PX+4},${PY+13} ${PX-2},${PY+14} ${PX-7},${PY+10} ${PX-6},${PY+5}`} fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />
      <polygon points={`${PX-10},${PY-3} ${PX-7},${PY-5} ${PX-5},${PY-2} ${PX-8},${PY+2} ${PX-12},${PY+1}`} fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />
      <g clipPath={`url(#${id}-clip)`} fill="none" stroke="#3a70c0" strokeWidth="0.4" strokeOpacity="0.45">
        <line x1={PX-PR} y1={PY-9} x2={PX+PR} y2={PY-9} />
        <line x1={PX-PR} y1={PY-3} x2={PX+PR} y2={PY-3} />
        <line x1={PX-PR} y1={PY+3} x2={PX+PR} y2={PY+3} />
        <line x1={PX-PR} y1={PY+9} x2={PX+PR} y2={PY+9} />
        <line x1={PX-9} y1={PY-PR} x2={PX-9} y2={PY+PR} />
        <line x1={PX-3} y1={PY-PR} x2={PX-3} y2={PY+PR} />
        <line x1={PX+3} y1={PY-PR} x2={PX+3} y2={PY+PR} />
        <line x1={PX+9} y1={PY-PR} x2={PX+9} y2={PY+PR} />
        <line x1={PX-7} y1={PY-14} x2={PX+7} y2={PY-14} strokeOpacity="0.25" />
        <line x1={PX-7} y1={PY+14} x2={PX+7} y2={PY+14} strokeOpacity="0.25" />
      </g>
      <circle cx={PX} cy={PY} r={PR} fill={`url(#${id}-night)`} />
      <circle cx={PX} cy={PY} r={PR} fill="none" stroke="#5090e0" strokeWidth="0.5" strokeOpacity="0.5" />
      <path d={arcPath(PX, PY, ORB_R, -135, 55)} fill="none" stroke={GOLD3} strokeWidth="0.7" strokeOpacity="0.55" strokeDasharray="3 1.8" />
      {([-110, -45, 20, 45] as number[]).map((deg, i) => {
        const [ox, oy] = pt(PX, PY, ORB_R, deg);
        return <rect key={i} x={ox-1} y={oy-0.8} width="2" height="1.6" rx="0.3" fill="#0c1a40" stroke={GOLD3} strokeWidth="0.35" />;
      })}
      {cityNodes.map(([x1,y1], i) => {
        const [x2,y2] = cityNodes[(i + 1) % 5];
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4080d0" strokeWidth="0.45" strokeOpacity="0.6" clipPath={`url(#${id}-clip)`} />;
      })}
      {cityNodes.map(([x,y], i) => (
        <line key={`s${i}`} x1={PX} y1={PY} x2={x} y2={y} stroke="#2858b0" strokeWidth="0.3" strokeOpacity="0.45" clipPath={`url(#${id}-clip)`} />
      ))}
      {cityNodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3" fill={col as string} opacity="0.08" />
          <circle cx={x} cy={y} r="1.4" fill={col as string} opacity="0.52" />
          <circle cx={x} cy={y} r="0.55" fill="#ffffff" opacity="0.75" />
        </g>
      ))}
      <text x="35" y="91.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="3.8" fill={GOLD} opacity="0.32" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}

export function TierI() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#060810 0%,#0a0c1e 60%,#040608 100%)' }}>
      <div className="flex flex-col items-center gap-10">
        <div className="flex items-end gap-10">
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 210, height: 300 }}><CardBackTier1 /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>large (review)</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 112, height: 160 }}><CardBackTier1 /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>in-game market</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 36, height: 51 }}><CardBackTier1 count={15} /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>deck tile</span>
          </div>
        </div>
        <div style={{ color: '#c4a85a', fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: '0.2em', opacity: 0.8 }}>
          TIER I — PLANETARY CIVILIZATION
        </div>
      </div>
    </div>
  );
}
