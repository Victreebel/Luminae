
// Tier I Redesign — Planetary Civilization
// One world mastered. The civilization has wrapped their planet in an energy grid,
// launched their first orbital ring, and lit five continental megacities.
// Redesign: cinematic terminator lighting · atmospheric limb glow · crisp L-brackets · affinity city-lights

const F  = '#ef4444';
const C  = '#3b82f6';
const V  = '#22c55e';
const A  = '#a855f7';
const R  = '#e2e8f0';
const GOLD  = '#c4a85a';
const GOLD2 = '#ead68c';
const GOLD3 = '#7a6030';

const toRad = (d: number) => (d * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, deg: number): [number, number] => [
  cx + r * Math.cos(toRad(deg)),
  cy + r * Math.sin(toRad(deg)),
];
const arcPath = (cx: number, cy: number, r: number, s: number, e: number, sweep = 1) => {
  const x1 = cx + r * Math.cos(toRad(s));
  const y1 = cy + r * Math.sin(toRad(s));
  const x2 = cx + r * Math.cos(toRad(e));
  const y2 = cy + r * Math.sin(toRad(e));
  const large = Math.abs(e - s) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

const PX = 35, PY = 53, PR = 18;
const stars: [number, number, number][] = [
  [7,7,0.35],[62,8,0.28],[14,15,0.22],[58,19,0.3],[9,29,0.18],[66,34,0.25],
  [5,47,0.2],[68,52,0.3],[8,65,0.22],[63,70,0.28],[11,80,0.18],[60,84,0.32],
  [7,91,0.2],[64,90,0.22],[20,5,0.18],[50,6,0.2],[38,95,0.25],[25,93,0.18],
  [44,12,0.15],[16,96,0.2],[52,97,0.18],[30,3,0.15],
];
const cityNodes: [number, number, string][] = [
  [35, 38, F],
  [48, 47, C],
  [45, 62, V],
  [25, 63, A],
  [22, 48, R],
];
const ORB_R = PR + 6;
const ORB2_R = PR + 11.5;

export function Tier1Redesign() {
  return (
    <div className="min-h-screen bg-[#060810] flex items-center justify-center">
      <div style={{ width: 210, height: 300 }}>
        <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
          <defs>
            {/* Space background */}
            <radialGradient id="t1r-bg" cx="50%" cy="52%" r="65%">
              <stop offset="0%" stopColor="#0d1230" />
              <stop offset="55%" stopColor="#08091a" />
              <stop offset="100%" stopColor="#030509" />
            </radialGradient>
            {/* Planet day side */}
            <radialGradient id="t1r-planet" cx="62%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#3060c0" />
              <stop offset="25%" stopColor="#1840a0" />
              <stop offset="60%" stopColor="#0c2268" />
              <stop offset="100%" stopColor="#040e30" />
            </radialGradient>
            {/* Night side overlay */}
            <radialGradient id="t1r-night" cx="12%" cy="55%" r="70%">
              <stop offset="0%" stopColor="#000010" stopOpacity="0.88" />
              <stop offset="45%" stopColor="#000010" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#000010" stopOpacity="0" />
            </radialGradient>
            {/* Atmosphere limb glow */}
            <radialGradient id="t1r-atmo" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#1a6ae0" stopOpacity="0" />
              <stop offset="82%" stopColor="#4090ff" stopOpacity="0.65" />
              <stop offset="92%" stopColor="#80c8ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a0daff" stopOpacity="0" />
            </radialGradient>
            {/* Land */}
            <radialGradient id="t1r-land" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e4830" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0d2818" stopOpacity="0.65" />
            </radialGradient>
            {/* Border gradient */}
            <linearGradient id="t1r-bord" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={GOLD2} stopOpacity="0.8" />
              <stop offset="50%" stopColor={GOLD} stopOpacity="1" />
              <stop offset="100%" stopColor={GOLD3} stopOpacity="0.55" />
            </linearGradient>
            {/* Orbital glow filter */}
            <filter id="t1r-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="0.8" />
            </filter>
            <clipPath id="t1r-clip"><circle cx={PX} cy={PY} r={PR} /></clipPath>
          </defs>

          {/* Background */}
          <rect width="70" height="100" fill="url(#t1r-bg)" />

          {/* Stars */}
          {stars.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r}
              fill="#fff" opacity={0.12 + (i % 5) * 0.06} />
          ))}

          {/* ── BORDER — single L-bracket, crisply spaced ── */}
          <rect x="3.5" y="3.5" width="63" height="93" rx="1.2"
            fill="none" stroke="url(#t1r-bord)" strokeWidth="0.7" />
          <rect x="5.8" y="5.8" width="58.4" height="88.4" rx="0.6"
            fill="none" stroke={GOLD3} strokeWidth="0.25" strokeOpacity="0.38" />

          {/* L-corner brackets */}
          <path d="M3.5 17 L3.5 3.5 L17 3.5"   fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square" />
          <path d="M53 3.5 L66.5 3.5 L66.5 17"  fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square" />
          <path d="M3.5 83 L3.5 96.5 L17 96.5"  fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square" />
          <path d="M53 96.5 L66.5 96.5 L66.5 83" fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square" />

          {/* Corner dots */}
          {([[3.5,3.5],[66.5,3.5],[3.5,96.5],[66.5,96.5]] as [number,number][]).map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="1.1" fill={GOLD} opacity="0.85" />
          ))}

          {/* Mid-edge ticks */}
          <line x1="35" y1="3.5"  x2="35" y2="7.5"  stroke={GOLD} strokeWidth="0.6" />
          <line x1="35" y1="96.5" x2="35" y2="92.5" stroke={GOLD} strokeWidth="0.6" />
          <line x1="3.5"  y1="50" x2="7.5"  y2="50" stroke={GOLD} strokeWidth="0.6" />
          <line x1="66.5" y1="50" x2="62.5" y2="50" stroke={GOLD} strokeWidth="0.6" />

          {/* Tier I label */}
          <text x="35" y="15" textAnchor="middle" fontFamily="Georgia, serif"
            fontSize="5.5" fill={GOLD2} opacity="0.78" letterSpacing="1.5">I</text>
          <line x1="31" y1="16.5" x2="39" y2="16.5" stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.5" />

          {/* ── OUTER debris/asteroid belt ── */}
          <path d={arcPath(PX, PY, ORB2_R, -105, 80)}
            fill="none" stroke={GOLD3} strokeWidth="0.45" strokeOpacity="0.28"
            strokeDasharray="1.2 2.8" />

          {/* ── ORBITAL RING — first infrastructure arc ── */}
          <path d={arcPath(PX, PY, ORB_R, -140, 60)}
            fill="none" stroke={GOLD} strokeWidth="0.65" strokeOpacity="0.5"
            strokeDasharray="2.8 1.5" />

          {/* Orbital station nodes */}
          {([-120, -60, 0, 40] as number[]).map((deg, i) => {
            const [ox, oy] = pt(PX, PY, ORB_R, deg);
            return (
              <g key={i}>
                <rect x={ox-1.2} y={oy-0.9} width="2.4" height="1.8" rx="0.4"
                  fill="#0a1540" stroke={GOLD2} strokeWidth="0.4" />
                <circle cx={ox} cy={oy} r="2" fill={GOLD2} opacity="0.06"
                  filter="url(#t1r-glow)" />
              </g>
            );
          })}

          {/* ── ATMOSPHERE halo ── */}
          <circle cx={PX} cy={PY} r={PR + 4} fill="url(#t1r-atmo)" />

          {/* ── PLANET sphere ── */}
          <circle cx={PX} cy={PY} r={PR} fill="url(#t1r-planet)" />

          {/* Landmasses */}
          <polygon
            points={`${PX+3},${PY-15} ${PX+10},${PY-11} ${PX+14},${PY-5} ${PX+10},${PY+2} ${PX+4},${PY+4} ${PX+1},${PY-3} ${PX+2},${PY-10}`}
            fill="url(#t1r-land)" clipPath="url(#t1r-clip)" />
          <polygon
            points={`${PX-2},${PY+6} ${PX+5},${PY+5} ${PX+8},${PY+11} ${PX+5},${PY+15} ${PX-1},${PY+16} ${PX-7},${PY+12} ${PX-6},${PY+6}`}
            fill="url(#t1r-land)" clipPath="url(#t1r-clip)" />
          <polygon
            points={`${PX-12},${PY-4} ${PX-8},${PY-7} ${PX-5},${PY-3} ${PX-9},${PY+3} ${PX-14},${PY+2}`}
            fill="url(#t1r-land)" clipPath="url(#t1r-clip)" />
          <polygon
            points={`${PX-4},${PY-16} ${PX+2},${PY-15} ${PX+3},${PY-12} ${PX-1},${PY-11} ${PX-5},${PY-13}`}
            fill="url(#t1r-land)" clipPath="url(#t1r-clip)" />

          {/* World energy grid */}
          <g clipPath="url(#t1r-clip)" fill="none" stroke="#2a5ad0" strokeWidth="0.38" strokeOpacity="0.38">
            {[-10,-4,2,8].map(dy => (
              <line key={dy} x1={PX-PR} y1={PY+dy} x2={PX+PR} y2={PY+dy} />
            ))}
            {[-10,-4,2,8].map(dx => (
              <line key={dx} x1={PX+dx} y1={PY-PR} x2={PX+dx} y2={PY+PR} />
            ))}
          </g>

          {/* Night terminator */}
          <circle cx={PX} cy={PY} r={PR} fill="url(#t1r-night)" />

          {/* Planet edge */}
          <circle cx={PX} cy={PY} r={PR} fill="none"
            stroke="#4888e8" strokeWidth="0.55" strokeOpacity="0.45" />

          {/* Energy network between city nodes */}
          {cityNodes.map(([x1,y1], i) => {
            const [x2,y2] = cityNodes[(i+1)%5];
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#3870d0" strokeWidth="0.4" strokeOpacity="0.55"
                clipPath="url(#t1r-clip)" />
            );
          })}
          {cityNodes.map(([x,y], i) => (
            <line key={`s${i}`} x1={PX} y1={PY} x2={x} y2={y}
              stroke="#204898" strokeWidth="0.28" strokeOpacity="0.42"
              clipPath="url(#t1r-clip)" />
          ))}

          {/* City light nodes — affinity colors */}
          {cityNodes.map(([x,y,col], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="3.5" fill={col as string} opacity="0.09"
                clipPath="url(#t1r-clip)" />
              <circle cx={x} cy={y} r="1.5" fill={col as string} opacity="0.6"
                clipPath="url(#t1r-clip)" />
              <circle cx={x} cy={y} r="0.6" fill="#ffffff" opacity="0.85"
                clipPath="url(#t1r-clip)" />
            </g>
          ))}

          {/* LUMINAE wordmark */}
          <text x="35" y="91" textAnchor="middle" fontFamily="Georgia, serif"
            fontSize="3.8" fill={GOLD} opacity="0.3" letterSpacing="2.5">LUMINAE</text>
        </svg>
      </div>
    </div>
  );
}
