
// ── ArtifactCardBack ─────────────────────────────────────────────────────────
// Three-tier SVG card backs — Kardashev civilization-scale motifs.
//
// The visual escalation must be unmistakable without reading the tier symbol:
//   Tier I   → planetary civilization  / one world mastered
//   Tier II  → stellar civilization    / Dyson megastructure around a star
//   Tier III → galactic civilization   / galaxy-spanning network; the card IS the galaxy
//
// Shared rules: premium dark-space aesthetic · escalating border complexity ·
//   five affinity colors subtly present · no humanoids · no card data revealed.
//
// count prop: accepted for API compatibility, intentionally not rendered on the
//   card back (it is not part of the card-back visual language).
// ─────────────────────────────────────────────────────────────────────────────

const F  = '#ef4444'; // Flare     (ruby)
const C  = '#3b82f6'; // Continuum (sapphire)
const V  = '#22c55e'; // Verdance  (emerald)
const A  = '#a855f7'; // Abyss     (onyx)
const R  = '#e2e8f0'; // Radiance  (pearl)

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
const pt = (cx: number, cy: number, r: number, deg: number): [number,number] => [
  cx + r * Math.cos(toRad(deg)),
  cy + r * Math.sin(toRad(deg)),
];


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TIER I — Type I Planetary Civilization                                 ║
// ║  One world mastered: planetary-scale energy grid, continental nodes,    ║
// ║  atmospheric ring, first orbital arc. Technology is planet-bound.       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export function CardBackTier1({ count: _count }: { count?: number }) {
  const id = 't1cb';
  const PX = 35, PY = 56, PR = 16;

  const cityNodes: [number,number,string][] = [
    [35,  44.5, F],
    [46,  51.5, C],
    [42,  64.5, V],
    [28,  64.5, A],
    [24,  51.5, R],
  ];

  const ORB_R = PR + 4.5;

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="54%" r="62%">
          <stop offset="0%"   stopColor="#0a0e22" />
          <stop offset="55%"  stopColor={BG_MID}  />
          <stop offset="100%" stopColor={BG_DEEP} />
        </radialGradient>
        <radialGradient id={`${id}-planet`} cx="40%" cy="32%" r="72%">
          <stop offset="0%"   stopColor="#2248a0" />
          <stop offset="30%"  stopColor="#102260" />
          <stop offset="70%"  stopColor="#081438" />
          <stop offset="100%" stopColor="#030a1c" />
        </radialGradient>
        <radialGradient id={`${id}-night`} cx="18%" cy="50%" r="72%">
          <stop offset="0%"   stopColor="#000008" stopOpacity="0.75" />
          <stop offset="55%"  stopColor="#000008" stopOpacity="0.3"  />
          <stop offset="100%" stopColor="#000008" stopOpacity="0"    />
        </radialGradient>
        <radialGradient id={`${id}-atmo`} cx="50%" cy="50%" r="50%">
          <stop offset="72%"  stopColor="#1a60e0" stopOpacity="0"    />
          <stop offset="85%"  stopColor="#4090ff" stopOpacity="0.55" />
          <stop offset="94%"  stopColor="#80c0ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a0d8ff" stopOpacity="0"    />
        </radialGradient>
        <radialGradient id={`${id}-land`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#2a5840" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1a3828" stopOpacity="0.5" />
        </radialGradient>
        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.75" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"    />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5"  />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx={PX} cy={PY} r={PR} />
        </clipPath>
      </defs>

      {/* ── Space background ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Sparse starfield */}
      {([
        [6,6],[63,9],[14,18],[58,22],[8,38],[65,43],
        [7,72],[66,68],[12,82],[59,85],[9,93],[64,92],
      ] as [number,number][]).map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.4 : 0.22}
          fill="#fff" opacity={0.16 + (i % 4) * 0.055} />
      ))}

      {/* ── T1 Border — single L-corner ── */}
      <rect x="4" y="4" width="62" height="92" rx="1.5"
        fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.72" />
      <rect x="6.5" y="6.5" width="57" height="87" rx="0.8"
        fill="none" stroke={GOLD3} strokeWidth="0.28" strokeOpacity="0.42" />

      <path d="M4 16 L4 4 L16 4"    fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M54 4 L66 4 L66 16"  fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M4 84 L4 96 L16 96"  fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M54 96 L66 96 L66 84" fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />

      {([[4,4],[66,4],[4,96],[66,96]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill={GOLD} opacity="0.82" />
      ))}

      {/* Single mid-edge tick per side */}
      <line x1="35" y1="4"  x2="35" y2="7.5"  stroke={GOLD} strokeWidth="0.6" />
      <line x1="35" y1="96" x2="35" y2="92.5" stroke={GOLD} strokeWidth="0.6" />
      <line x1="4"  y1="50" x2="7.5"  y2="50" stroke={GOLD} strokeWidth="0.6" />
      <line x1="66" y1="50" x2="62.5" y2="50" stroke={GOLD} strokeWidth="0.6" />

      {/* ── Tier label — integrated into top margin ── */}
      <text x="35" y="14.5" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="5" fill={GOLD2} opacity="0.72" letterSpacing="1">I</text>
      <line x1="31.5" y1="16" x2="38.5" y2="16"
        stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.5" />

      {/* ── Atmospheric halo ── */}
      <circle cx={PX} cy={PY} r={PR + 3.5} fill={`url(#${id}-atmo)`} />

      {/* ── Planet sphere ── */}
      <circle cx={PX} cy={PY} r={PR} fill={`url(#${id}-planet)`} />

      {/* ── Continental landmasses ── */}
      <polygon
        points={`${PX+2},${PY-12} ${PX+9},${PY-9} ${PX+12},${PY-4} ${PX+9},${PY+1} ${PX+4},${PY+3} ${PX},${PY-1} ${PX+1},${PY-8}`}
        fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />
      <polygon
        points={`${PX-3},${PY+5} ${PX+4},${PY+4} ${PX+7},${PY+9} ${PX+4},${PY+13} ${PX-2},${PY+14} ${PX-7},${PY+10} ${PX-6},${PY+5}`}
        fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />
      <polygon
        points={`${PX-10},${PY-3} ${PX-7},${PY-5} ${PX-5},${PY-2} ${PX-8},${PY+2} ${PX-12},${PY+1}`}
        fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />

      {/* ── World-energy grid ── */}
      <g clipPath={`url(#${id}-clip)`} fill="none"
        stroke="#3a70c0" strokeWidth="0.4" strokeOpacity="0.45">
        <line x1={PX-PR} y1={PY-9}  x2={PX+PR} y2={PY-9}  />
        <line x1={PX-PR} y1={PY-3}  x2={PX+PR} y2={PY-3}  />
        <line x1={PX-PR} y1={PY+3}  x2={PX+PR} y2={PY+3}  />
        <line x1={PX-PR} y1={PY+9}  x2={PX+PR} y2={PY+9}  />
        <line x1={PX-9}  y1={PY-PR} x2={PX-9}  y2={PY+PR} />
        <line x1={PX-3}  y1={PY-PR} x2={PX-3}  y2={PY+PR} />
        <line x1={PX+3}  y1={PY-PR} x2={PX+3}  y2={PY+PR} />
        <line x1={PX+9}  y1={PY-PR} x2={PX+9}  y2={PY+PR} />
        <line x1={PX-7} y1={PY-14} x2={PX+7} y2={PY-14} strokeOpacity="0.25" />
        <line x1={PX-7} y1={PY+14} x2={PX+7} y2={PY+14} strokeOpacity="0.25" />
      </g>

      {/* ── Night-side terminator ── */}
      <circle cx={PX} cy={PY} r={PR} fill={`url(#${id}-night)`} />

      {/* ── Planet edge ring ── */}
      <circle cx={PX} cy={PY} r={PR}
        fill="none" stroke="#5090e0" strokeWidth="0.5" strokeOpacity="0.5" />

      {/* ── First orbital infrastructure ── */}
      <path d={arcPath(PX, PY, ORB_R, -135, 55)}
        fill="none" stroke={GOLD3} strokeWidth="0.7" strokeOpacity="0.55"
        strokeDasharray="3 1.8" />
      {([-110, -45, 20, 45] as number[]).map((deg, i) => {
        const [ox, oy] = pt(PX, PY, ORB_R, deg);
        return (
          <g key={i}>
            <rect x={ox-1} y={oy-0.8} width="2" height="1.6" rx="0.3"
              fill="#0c1a40" stroke={GOLD3} strokeWidth="0.35" />
          </g>
        );
      })}

      {/* ── Planetary energy network ── */}
      {cityNodes.map(([x1,y1], i) => {
        const [x2,y2] = cityNodes[(i + 1) % 5];
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#4080d0" strokeWidth="0.45" strokeOpacity="0.6"
            clipPath={`url(#${id}-clip)`} />
        );
      })}
      {cityNodes.map(([x,y], i) => (
        <line key={`s${i}`} x1={PX} y1={PY} x2={x} y2={y}
          stroke="#2858b0" strokeWidth="0.3" strokeOpacity="0.45"
          clipPath={`url(#${id}-clip)`} />
      ))}

      {/* ── Five world-city nodes ── */}
      {cityNodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3"    fill={col as string} opacity="0.08" />
          <circle cx={x} cy={y} r="1.4"  fill={col as string} opacity="0.52" />
          <circle cx={x} cy={y} r="0.55" fill="#ffffff"       opacity="0.75" />
        </g>
      ))}

      {/* ── Luminae wordmark ── */}
      <text x="35" y="91.5" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.32" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TIER II — Type II Stellar Civilization                                 ║
// ║  A star is the engine: three concentric Dyson collector rings           ║
// ║  (inner/middle/outer) harvest the star's full output. This              ║
// ║  civilization has left planetary scale entirely behind.                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export function CardBackTier2({ count: _count }: { count?: number }) {
  const id = 't2cb';
  const CX = 35, CY = 54;

  const rings = [
    { r: 10,  segs: 8, span: 35, step: 45,   startOff: -90, colors: [F,C,V,A,R,F,C,V] as string[] },
    { r: 16,  segs: 6, span: 48, step: 60,   startOff: -75, colors: [V,A,R,F,C,V]     as string[] },
    { r: 22,  segs: 4, span: 68, step: 90,   startOff: -60, colors: [C,A,F,R]         as string[] },
  ];

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="65%">
          <stop offset="0%"   stopColor="#100c28" />
          <stop offset="55%"  stopColor={BG_MID}  />
          <stop offset="100%" stopColor={BG_DEEP} />
        </radialGradient>
        <radialGradient id={`${id}-star`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fffef0" stopOpacity="1"   />
          <stop offset="18%"  stopColor="#fff0a0" stopOpacity="0.95"/>
          <stop offset="40%"  stopColor="#ffa030" stopOpacity="0.65"/>
          <stop offset="70%"  stopColor="#c04010" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#400808" stopOpacity="0"   />
        </radialGradient>
        <radialGradient id={`${id}-corona`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff8c0" stopOpacity="0.5" />
          <stop offset="35%"  stopColor="#ff9020" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ff4000" stopOpacity="0"   />
        </radialGradient>
        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.88" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"    />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5"  />
        </linearGradient>
        <filter id={`${id}-starglow`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id={`${id}-arcglow`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="1.0" />
        </filter>
      </defs>

      {/* ── Background ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Moderate starfield */}
      {([
        [6,6],[63,10],[16,17],[54,21],[9,31],[66,36],
        [5,57],[67,62],[15,74],[59,77],[8,87],[64,91],
        [26,9],[46,7],[38,94],[22,92],[14,46],[58,44],
      ] as [number,number][]).map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 0.42 : 0.24}
          fill="#fff" opacity={0.13 + (i % 5) * 0.05} />
      ))}

      {/* ── T2 Border — double L-corner ── */}
      <rect x="3.5" y="3.5" width="63" height="93" rx="1.5"
        fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.82" />
      <rect x="5.5" y="5.5" width="59" height="89" rx="1"
        fill="none" stroke={GOLD3} strokeWidth="0.3" strokeOpacity="0.5" />

      {([
        ["M3.5 17 L3.5 3.5 L17 3.5", "M7 14.5 L7 7 L14.5 7"],
        ["M53 3.5 L66.5 3.5 L66.5 17", "M55.5 7 L63 7 L63 14.5"],
        ["M3.5 83 L3.5 96.5 L17 96.5", "M7 85.5 L7 93 L14.5 93"],
        ["M53 96.5 L66.5 96.5 L66.5 83", "M55.5 93 L63 93 L63 85.5"],
      ] as [string,string][]).map(([o,n],i) => (
        <g key={i}>
          <path d={o} fill="none" stroke={GOLD2} strokeWidth="1.3"  strokeLinecap="square" />
          <path d={n} fill="none" stroke={GOLD}  strokeWidth="0.6"  strokeLinecap="square" />
        </g>
      ))}

      {([[3.5,3.5],[66.5,3.5],[3.5,96.5],[66.5,96.5]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.35" fill={GOLD} opacity="0.9" />
      ))}

      {/* Three mid-edge ticks per long side */}
      {[26,35,44].map(x => (
        <g key={x}>
          <line x1={x} y1="3.5"  x2={x} y2={x===35?8.5:7}   stroke={GOLD} strokeWidth={x===35?0.88:0.56} />
          <line x1={x} y1="96.5" x2={x} y2={x===35?91.5:93} stroke={GOLD} strokeWidth={x===35?0.88:0.56} />
        </g>
      ))}
      {[40,50,60].map(y => (
        <g key={y}>
          <line x1="3.5"  y1={y} x2={y===50?8.5:7}   y2={y} stroke={GOLD} strokeWidth={y===50?0.88:0.56} />
          <line x1="66.5" y1={y} x2={y===50?61.5:63} y2={y} stroke={GOLD} strokeWidth={y===50?0.88:0.56} />
        </g>
      ))}

      {/* ── Tier label — integrated into top margin ── */}
      <text x="35" y="15" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="5" fill={GOLD2} opacity="0.75" letterSpacing="2">II</text>
      <line x1="30" y1="16.5" x2="40" y2="16.5"
        stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.52" />

      {/* ── Extended corona ── */}
      <circle cx={CX} cy={CY} r="14" fill={`url(#${id}-corona)`} />

      {/* ── Three Dyson collector rings ── */}
      {rings.map(({ r, segs, span, step, startOff, colors }, ri) => (
        <g key={ri}>
          <circle cx={CX} cy={CY} r={r}
            fill="none" stroke={ri === 0 ? "#3050a0" : GOLD3}
            strokeWidth={ri === 0 ? 0.3 : 0.28}
            strokeOpacity={ri === 0 ? 0.3 : 0.25}
            strokeDasharray="1.5 1.5" />

          {Array.from({ length: segs }).map((_, i) => {
            const s = startOff + i * step;
            const e = s + span;
            const col = colors[i % colors.length];
            const [mx, my] = pt(CX, CY, r, s + span/2);
            return (
              <g key={i}>
                <path d={arcPath(CX, CY, r, s, e)}
                  fill="none" stroke={col} strokeWidth={ri===0?3.5:ri===1?3:2.5}
                  strokeOpacity="0.1" strokeLinecap="round"
                  filter={`url(#${id}-arcglow)`} />
                <path d={arcPath(CX, CY, r, s, e)}
                  fill="none" stroke={col}
                  strokeWidth={ri===0?1.5:ri===1?1.3:1.1}
                  strokeOpacity={ri===0?0.75:ri===1?0.68:0.6}
                  strokeLinecap="round" />
                <path d={arcPath(CX, CY, r, s, e)}
                  fill="none" stroke="#ffffff"
                  strokeWidth="0.35" strokeOpacity="0.18"
                  strokeLinecap="round" />
                <circle cx={mx} cy={my} r={ri===0?0.9:0.75}
                  fill="#080c28" stroke={GOLD3} strokeWidth="0.3" />
              </g>
            );
          })}

          {ri < 2 && Array.from({ length: 4 }).map((_, i) => {
            const deg = i * 90 + startOff + span/2;
            const [x1, y1] = pt(CX, CY, r, deg);
            const [x2, y2] = pt(CX, CY, rings[ri+1].r, deg);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.45" />
            );
          })}
        </g>
      ))}

      {/* ── Energy beams ── */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const [x, y] = pt(CX, CY, 9, deg);
        return (
          <line key={i} x1={CX} y1={CY} x2={x} y2={y}
            stroke={i % 2 === 0 ? "#ffe090" : "#ffb040"}
            strokeWidth="0.35" strokeOpacity="0.35" />
        );
      })}

      {/* ── Star bloom glow ── */}
      <circle cx={CX} cy={CY} r="7"
        fill={`url(#${id}-star)`}
        filter={`url(#${id}-starglow)`} opacity="0.55" />

      {/* ── Stellar core ── */}
      <circle cx={CX} cy={CY} r="5.5" fill={`url(#${id}-star)`} />

      <line x1={CX-9} y1={CY}   x2={CX+9} y2={CY}   stroke="#fff8c0" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1={CX}   y1={CY-9} x2={CX}   y2={CY+9} stroke="#fff8c0" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1={CX-6} y1={CY-6} x2={CX+6} y2={CY+6} stroke="#ffc060" strokeWidth="0.25" strokeOpacity="0.28" />
      <line x1={CX+6} y1={CY-6} x2={CX-6} y2={CY+6} stroke="#ffc060" strokeWidth="0.25" strokeOpacity="0.28" />

      {/* ── Luminae wordmark ── */}
      <text x="35" y="91.5" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.32" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TIER III — Type III Galactic Civilization                              ║
// ║                                                                          ║
// ║  The card IS the galaxy. Four primary spiral arms reach all four        ║
// ║  corners. Four sub-arms extend to the card edges. Twenty-two           ║
// ║  civilization nodes (arm tips, sub-tips, mid-arm, bar, core) are       ║
// ║  linked by 38 hyperspace lanes. A massive galactic bar spans the       ║
// ║  center. Three concentric halo shells surround the blinding core.      ║
// ║  Dense 70-star field fills the card. The structure overwhelms the      ║
// ║  eye — as a K-III civilization should.                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export function CardBackTier3({ count: _count }: { count?: number }) {
  const id = 't3cb';
  const CX = 35, CY = 52; // galactic core — upper-center for arm balance

  // ── ARM TIPS reach all four corners ──────────────────────────────────────
  const armTips: [number,number,string][] = [
    [62,  8,  F], // NE corner — Flare
    [63,  90, C], // SE corner — Continuum
    [7,   92, V], // SW corner — Verdance
    [6,   12, A], // NW corner — Abyss
  ];

  // ── SUB-ARM TIPS reach card edges (between corners) ──────────────────────
  const subTips: [number,number,string][] = [
    [66,  42, F], // E  edge — Flare sub
    [50,  97, C], // S  edge — Continuum sub
    [18,  97, V], // S  edge — Verdance sub
    [4,   58, A], // W  edge — Abyss sub
  ];

  // ── MID-ARM NODES (2 per main arm, along bezier path) ────────────────────
  const midNodes: [number,number,string][] = [
    [50,  28, F], [57,  17, F], // NE arm near/far
    [52,  71, C], [58,  82, C], // SE arm near/far
    [18,  73, V], [11,  83, V], // SW arm near/far
    [18,  31, A], [11,  20, A], // NW arm near/far
  ];

  // ── GALACTIC BAR endpoints (diagonal bar through core) ───────────────────
  const barNodes: [number,number,string][] = [
    [49,  40, R], // NE bar tip
    [21,  64, R], // SW bar tip
  ];

  // Core civilization node (Radiance — stabilized galactic order)
  const core: [number,number,string] = [CX, CY, R];

  // merged index: armTips[0-3] subTips[4-7] midNodes[8-15] barNodes[16-17] core[18]
  const merged: [number,number,string][] = [
    ...armTips,   // 0-3
    ...subTips,   // 4-7
    ...midNodes,  // 8-15
    ...barNodes,  // 16-17
    core,         // 18
  ];

  // ── HYPERSPACE LANE LATTICE ───────────────────────────────────────────────
  // 38 connections forming the galaxy-spanning civilization network
  const lanes: [number,number][] = [
    // Core → bar nodes
    [18,16],[18,17],
    // Core → near-mid nodes (4 spokes)
    [18, 8],[18,10],[18,12],[18,14],
    // Bar nodes → adjacent mid-near nodes
    [16, 8],[16, 9],[17,12],[17,13],
    // Each arm chain: near → far → tip
    [ 8, 9],[ 9, 0],  // NE
    [10,11],[11, 1],  // SE
    [12,13],[13, 2],  // SW
    [14,15],[15, 3],  // NW
    // Sub-arm: far-mid → sub-tip
    [ 9, 4],          // NE → E sub
    [11, 5],          // SE → S sub
    [13, 6],          // SW → S sub
    [15, 7],          // NW → W sub
    // Perimeter: adjacent arm tips connected
    [ 0, 1],[ 1, 2],[ 2, 3],[ 3, 0],
    // Long diagonals across the galaxy
    [ 0, 2],[ 1, 3],
    // Sub-tip to nearest arm tip
    [ 4, 0],[ 4, 1],  // E sub
    [ 5, 1],[ 6, 2],  // S subs
    [ 7, 3],[ 7, 0],  // W sub
    // Cross-galaxy mid-level connections
    [ 8,14],[10,12],
    // Additional weave
    [ 9,11],[13,15],
  ];

  // ── SPIRAL ARMS (bezier from near-core to corners) ────────────────────────
  const arms = [
    { d: `M ${CX+7} ${CY-6} C 51 38, 59 22, 62  8`,  col: F },
    { d: `M ${CX+7} ${CY+6} C 54 64, 61 78, 63  90`, col: C },
    { d: `M ${CX-7} ${CY+6} C 19 68, 11 80, 7   92`, col: V },
    { d: `M ${CX-7} ${CY-6} C 19 38, 11 24, 6   12`, col: A },
  ];

  // ── SUB-ARMS (branch off near the 2/3 point of each main arm) ────────────
  const subArms = [
    { d: `M 55 22 C 61 30, 65 36, 66 42`, col: F },
    { d: `M 58 80 C 57 87, 54 93, 50 97`, col: C },
    { d: `M 11 80 C 13 88, 15 93, 18 97`, col: V },
    { d: `M 13 35 C 8  44, 5  51, 4  58`, col: A },
  ];

  // ── STAR CLUSTERS along all arms (dense) ──────────────────────────────────
  const clusters: [number,number][] = [
    // NE arm
    [43,43],[47,36],[51,29],[55,22],[58,15],[61,10],
    [45,39],[50,31],[54,24],[59,17],
    // SE arm
    [43,61],[48,68],[52,74],[57,81],[60,87],[62,91],
    [46,57],[51,66],[55,75],[59,84],
    // SW arm
    [27,61],[22,68],[17,74],[12,81],[9,87],[8,91],
    [30,58],[24,65],[18,72],[12,80],
    // NW arm
    [27,43],[22,36],[17,30],[12,22],[9,16],[7,11],
    [30,47],[24,38],[19,30],[13,21],
    // Along galactic bar
    [43,44],[39,47],[35,52],[31,56],[27,59],
  ];

  // ── DENSE BACKGROUND STARFIELD ────────────────────────────────────────────
  const stars: [number,number,number,number][] = [
    // [x, y, size-variant(0-9), opacity-variant(0-9)]
    [4,4,0,3],[64,6,2,5],[20,10,1,4],[48,8,0,6],[33,11,3,2],
    [10,16,0,4],[60,14,2,7],[16,21,1,3],[54,19,0,5],[38,16,2,6],
    [7,27,1,4],[66,24,0,3],[25,25,2,5],[49,23,1,7],[63,31,0,4],
    [5,36,2,3],[67,38,1,6],[13,38,0,5],[57,35,2,4],[42,32,1,3],
    [4,46,0,6],[68,46,2,4],[10,48,1,5],[62,50,0,3],[35,44,2,7],
    [5,60,1,4],[67,58,0,5],[15,62,2,3],[59,63,1,6],[41,67,0,4],
    [7,70,2,5],[65,71,1,3],[21,75,0,6],[53,74,2,4],[34,77,1,5],
    [6,82,0,3],[64,80,2,6],[17,85,1,4],[57,84,0,5],[28,88,2,3],
    [5,92,1,5],[63,90,0,4],[25,94,2,3],[47,93,1,6],[35,97,0,4],
    [33,5,2,5],[52,12,0,3],[17,13,1,6],[43,30,2,4],[29,33,0,5],
    [61,42,1,3],[8,55,2,6],[63,65,0,4],[37,60,1,5],[22,52,2,3],
    [51,56,0,6],[14,69,2,4],[58,72,1,3],[42,82,0,5],[27,79,2,4],
  ];

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        {/* Deepest void — intergalactic scale, warm violet undertone */}
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="#120a28" />
          <stop offset="35%"  stopColor="#08051a" />
          <stop offset="100%" stopColor="#010108" />
        </radialGradient>

        {/* Galactic nebula wash — fills the whole card */}
        <radialGradient id={`${id}-nebula`} cx="50%" cy="52%" r="60%">
          <stop offset="0%"   stopColor="#1c1050" stopOpacity="0.9" />
          <stop offset="30%"  stopColor="#100830" stopOpacity="0.6" />
          <stop offset="65%"  stopColor="#060418" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#020210" stopOpacity="0"   />
        </radialGradient>

        {/* Outer halo — faint violet fringe reaching card edges */}
        <radialGradient id={`${id}-halo`} cx="50%" cy="52%" r="55%">
          <stop offset="40%"  stopColor="#2a1060" stopOpacity="0"   />
          <stop offset="75%"  stopColor="#3a1880" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#2008a0" stopOpacity="0.05"/>
        </radialGradient>

        {/* Galactic bar gradient (diagonal NE-SW) */}
        <linearGradient id={`${id}-bar`} x1="30%" y1="35%" x2="70%" y2="65%">
          <stop offset="0%"   stopColor="#5030b0" stopOpacity="0"   />
          <stop offset="20%"  stopColor="#9060e0" stopOpacity="0.45"/>
          <stop offset="50%"  stopColor="#d0b0ff" stopOpacity="0.8" />
          <stop offset="80%"  stopColor="#9060e0" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#5030b0" stopOpacity="0"   />
        </linearGradient>

        {/* Galactic core nucleus — blinding white-violet */}
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"   />
          <stop offset="10%"  stopColor="#e8d8ff" stopOpacity="0.95"/>
          <stop offset="28%"  stopColor="#a060e0" stopOpacity="0.6" />
          <stop offset="60%"  stopColor="#5020b0" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#200848" stopOpacity="0"   />
        </radialGradient>

        {/* Halo rings around core */}
        <radialGradient id={`${id}-halo1`} cx="50%" cy="50%" r="50%">
          <stop offset="72%"  stopColor="#6030c0" stopOpacity="0"   />
          <stop offset="86%"  stopColor="#8050d0" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#9060e0" stopOpacity="0"   />
        </radialGradient>
        <radialGradient id={`${id}-halo2`} cx="50%" cy="50%" r="50%">
          <stop offset="72%"  stopColor="#4020a0" stopOpacity="0"   />
          <stop offset="86%"  stopColor="#5030b0" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#6040c0" stopOpacity="0"   />
        </radialGradient>

        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.94" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"    />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.6"  />
        </linearGradient>

        <filter id={`${id}-coreglow`} x="-600%" y="-600%" width="1300%" height="1300%">
          <feGaussianBlur stdDeviation="5.5" />
        </filter>
        <filter id={`${id}-armglow`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>
        <filter id={`${id}-nodeglow`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={`${id}-hubglow`} x="-400%" y="-400%" width="900%" height="900%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* ── Intergalactic void ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* ── Outer violet halo fringe reaching card edges ── */}
      <rect width="70" height="100" fill={`url(#${id}-halo)`} />

      {/* ── Dense background starfield (60+ stars) ── */}
      {stars.map(([x,y,sv,ov], i) => (
        <circle key={i} cx={x} cy={y}
          r={sv >= 7 ? 0.55 : sv >= 4 ? 0.35 : 0.2}
          fill="#fff"
          opacity={0.08 + ov * 0.032} />
      ))}

      {/* ── Three distant "background galaxy" smudges ── */}
      <ellipse cx="11" cy="37" rx="2.5" ry="1.2" transform="rotate(-25 11 37)"
        fill="#c0b0ff" opacity="0.05" />
      <ellipse cx="61" cy="30" rx="2" ry="0.9" transform="rotate(20 61 30)"
        fill="#b0c0ff" opacity="0.04" />
      <ellipse cx="58" cy="88" rx="1.8" ry="0.8" transform="rotate(-15 58 88)"
        fill="#c0d0ff" opacity="0.04" />

      {/* ── Full-card galactic nebula wash ── */}
      <ellipse cx={CX} cy={CY} rx="34" ry="40" fill={`url(#${id}-nebula)`} />

      {/* ── T3 Border — triple L-corner, richest detail ── */}
      <rect x="3"   y="3"   width="64" height="94" rx="2"
        fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.9" />
      <rect x="5"   y="5"   width="60" height="90" rx="1.5"
        fill="none" stroke={GOLD}  strokeWidth="0.3"  strokeOpacity="0.45" />
      <rect x="7"   y="7"   width="56" height="86" rx="1"
        fill="none" stroke={GOLD3} strokeWidth="0.22" strokeOpacity="0.32" />

      {([
        ["M3 19 L3 3 L19 3",    "M7 16 L7 7 L16 7",    "M10 14 L10 10 L14 10"],
        ["M51 3 L67 3 L67 19",  "M54 7 L63 7 L63 16",  "M56 10 L60 10 L60 14"],
        ["M3 81 L3 97 L19 97",  "M7 84 L7 93 L16 93",  "M10 86 L10 90 L14 90"],
        ["M51 97 L67 97 L67 81","M54 93 L63 93 L63 84","M56 90 L60 90 L60 86"],
      ] as [string,string,string][]).map(([o,m,n], i) => (
        <g key={i}>
          <path d={o} fill="none" stroke={GOLD2} strokeWidth="1.45" strokeLinecap="square" />
          <path d={m} fill="none" stroke={GOLD}  strokeWidth="0.62" strokeLinecap="square" />
          <path d={n} fill="none" stroke={GOLD3} strokeWidth="0.38" strokeLinecap="square" />
        </g>
      ))}

      {([[3,3],[67,3],[3,97],[67,97]] as [number,number][]).map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.65" fill={GOLD}  opacity="0.95" />
          <circle cx={x} cy={y} r="0.7"  fill={GOLD2} opacity="0.9"  />
        </g>
      ))}

      {/* Five mid-edge ticks per long side, three per short */}
      {[19,27,35,43,51].map(x => (
        <g key={x}>
          <line x1={x} y1="3"  x2={x} y2={x===35?9.5:7.5}   stroke={GOLD} strokeWidth={x===35?0.9:0.55} />
          <line x1={x} y1="97" x2={x} y2={x===35?90.5:92.5} stroke={GOLD} strokeWidth={x===35?0.9:0.55} />
        </g>
      ))}
      {[37,55,73].map(y => (
        <g key={y}>
          <line x1="3"  y1={y} x2={y===55?9.5:7.5}   y2={y} stroke={GOLD} strokeWidth={y===55?0.9:0.55} />
          <line x1="67" y1={y} x2={y===55?60.5:62.5} y2={y} stroke={GOLD} strokeWidth={y===55?0.9:0.55} />
        </g>
      ))}

      {/* ── Tier label — small, top center, subtle ── */}
      <text x="35" y="15" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="4.5" fill={GOLD2} opacity="0.65" letterSpacing="3">III</text>
      <line x1="28" y1="16.5" x2="42" y2="16.5"
        stroke={GOLD3} strokeWidth="0.38" strokeOpacity="0.48" />

      {/* ── Galactic bar — bright angled structure through core ── */}
      <rect x={CX-17} y={CY-4} width="34" height="8" rx="4"
        transform={`rotate(-25 ${CX} ${CY})`}
        fill={`url(#${id}-bar)`} />

      {/* ── Outer halo shell rings (concentric) ── */}
      <circle cx={CX} cy={CY} r="30" fill={`url(#${id}-halo1)`} />
      <circle cx={CX} cy={CY} r="22" fill={`url(#${id}-halo2)`} />
      <circle cx={CX} cy={CY} r="18"
        fill="none" stroke="#6040c0" strokeWidth="0.35" strokeOpacity="0.18"
        strokeDasharray="2 3" />
      <circle cx={CX} cy={CY} r="25"
        fill="none" stroke="#5030a0" strokeWidth="0.28" strokeOpacity="0.12"
        strokeDasharray="3 4" />

      {/* ── Four primary spiral arms — glow halo, body, bright spine ── */}
      {arms.map(({ d, col }, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={col} strokeWidth="10"
            strokeOpacity="0.05" strokeLinecap="round"
            filter={`url(#${id}-armglow)`} />
          <path d={d} fill="none" stroke={col} strokeWidth="3.2"
            strokeOpacity="0.2" strokeLinecap="round" />
          <path d={d} fill="none" stroke={col} strokeWidth="1.4"
            strokeOpacity="0.42" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#d8e0ff" strokeWidth="0.45"
            strokeOpacity="0.28" strokeLinecap="round" />
        </g>
      ))}

      {/* ── Four sub-arms branching to card edges ── */}
      {subArms.map(({ d, col }, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={col} strokeWidth="5"
            strokeOpacity="0.04" strokeLinecap="round"
            filter={`url(#${id}-armglow)`} />
          <path d={d} fill="none" stroke={col} strokeWidth="1.8"
            strokeOpacity="0.18" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#d0d8ff" strokeWidth="0.3"
            strokeOpacity="0.2" strokeLinecap="round" />
        </g>
      ))}

      {/* ── Star clusters scattered along all arms ── */}
      {clusters.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y}
          r={i % 7 === 0 ? 0.72 : i % 3 === 0 ? 0.44 : 0.25}
          fill="#c8d4ff" opacity={0.18 + (i % 5) * 0.06} />
      ))}

      {/* ── Hyperspace lane lattice (38 lanes) ── */}
      {lanes.map(([a, b], i) => {
        const [x1,y1] = merged[a];
        const [x2,y2] = merged[b];
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={GOLD3} strokeWidth="0.28" strokeOpacity="0.32"
            strokeDasharray="2 2.2" />
        );
      })}

      {/* ── Galactic bar endpoint nodes ── */}
      {barNodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4.5" fill={col} opacity="0.06"
            filter={`url(#${id}-nodeglow)`} />
          <circle cx={x} cy={y} r="1.6" fill="#06021c" stroke={col} strokeWidth="0.5" strokeOpacity="0.85" />
          <circle cx={x} cy={y} r="0.7" fill={col} opacity="0.7" />
        </g>
      ))}

      {/* ── Sub-arm tip nodes (medium) ── */}
      {subTips.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill={col} opacity="0.07"
            filter={`url(#${id}-nodeglow)`} />
          <circle cx={x} cy={y} r="1.4" fill="#06021c" stroke={col} strokeWidth="0.45" strokeOpacity="0.8" />
          <circle cx={x} cy={y} r="0.55" fill={col} opacity="0.65" />
        </g>
      ))}

      {/* ── Mid-arm nodes (small) ── */}
      {midNodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2.5" fill={col} opacity="0.06"
            filter={`url(#${id}-nodeglow)`} />
          <circle cx={x} cy={y} r="1.0" fill="#04021a" stroke={col} strokeWidth="0.4" strokeOpacity="0.72" />
          <circle cx={x} cy={y} r="0.38" fill={col} opacity="0.6" />
        </g>
      ))}

      {/* ── Arm-tip corner hubs (large — civilization capitals) ── */}
      {armTips.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill={col} opacity="0.07"
            filter={`url(#${id}-hubglow)`} />
          <circle cx={x} cy={y} r="3"  fill="#04021a" stroke={col} strokeWidth="0.62" strokeOpacity="0.9" />
          <circle cx={x} cy={y} r="1.5" fill={col} opacity="0.65" />
          <circle cx={x} cy={y} r="0.55" fill="#ffffff" opacity="0.85" />
        </g>
      ))}

      {/* ── Massive galactic core bloom (behind the actual core node) ── */}
      <circle cx={CX} cy={CY} r="14"
        fill={`url(#${id}-core)`}
        filter={`url(#${id}-coreglow)`} opacity="0.45" />
      <circle cx={CX} cy={CY} r="7" fill={`url(#${id}-core)`} opacity="0.7" />
      <circle cx={CX} cy={CY} r="3.5" fill={`url(#${id}-core)`} />

      {/* Core cross-flare */}
      <line x1={CX-11} y1={CY}    x2={CX+11} y2={CY}
        stroke="#f0e8ff" strokeWidth="0.38" strokeOpacity="0.5" />
      <line x1={CX}    y1={CY-11} x2={CX}    y2={CY+11}
        stroke="#f0e8ff" strokeWidth="0.38" strokeOpacity="0.5" />
      <line x1={CX-7}  y1={CY-7}  x2={CX+7}  y2={CY+7}
        stroke="#d0c0ff" strokeWidth="0.22" strokeOpacity="0.32" />
      <line x1={CX+7}  y1={CY-7}  x2={CX-7}  y2={CY+7}
        stroke="#d0c0ff" strokeWidth="0.22" strokeOpacity="0.32" />

      {/* ── Central Radiance node (galactic core civilization) ── */}
      <circle cx={CX} cy={CY} r="10" fill={R} opacity="0.07"
        filter={`url(#${id}-nodeglow)`} />
      <circle cx={CX} cy={CY} r="3.2" fill="#04021a" stroke={R} strokeWidth="0.7" strokeOpacity="0.95" />
      <circle cx={CX} cy={CY} r="1.6" fill={R} opacity="0.8" />
      <circle cx={CX} cy={CY} r="0.6" fill="#fff" opacity="0.95" />

      {/* ── Luminae wordmark ── */}
      <text x="35" y="93.5" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.35" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}
