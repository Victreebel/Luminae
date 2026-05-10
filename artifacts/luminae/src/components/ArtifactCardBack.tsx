
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
// ║  TIER III — Five-Affinity Stellar Council                               ║
// ║                                                                          ║
// ║  Five stellar civilizations — one per affinity — arranged at the       ║
// ║  vertices of a pentagon. Each is a full Dyson star system in its       ║
// ║  own affinity color. All five converge on a central gold hub,          ║
// ║  the point where all affinities unify at galactic scale.               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export function CardBackTier3({ count: _count }: { count?: number }) {
  const id = 't3cb';
  const HUB_X = 35, HUB_Y = 52; // central convergence hub

  // Five affinity star systems at pentagon vertices.
  // Pentagon radius 21, center (35, 52), starting at top (−90°), clockwise.
  // Each system: star + inner ring (r=4.8) + outer ring (r=7.5), monochrome in its affinity color.
  const systems: Array<{ cx: number; cy: number; col: string }> = [
    { cx: 35.00, cy: 31.00, col: R }, // Radiance  — top
    { cx: 54.97, cy: 45.51, col: C }, // Continuum — top-right
    { cx: 47.34, cy: 68.99, col: V }, // Verdance  — bottom-right
    { cx: 22.66, cy: 68.99, col: F }, // Flare     — bottom-left
    { cx: 15.03, cy: 45.51, col: A }, // Abyss     — top-left
  ];

  // Pentagon edge connections (adjacent system index pairs)
  const pentEdges: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,0]];

  // Background starfield
  const stars: [number, number, number][] = [
    [5,5,3],[65,8,5],[18,12,4],[47,10,6],[32,14,2],
    [8,20,4],[62,17,7],[14,24,3],[54,22,5],[40,18,6],
    [4,32,4],[67,35,3],[22,30,5],[50,28,4],[63,44,6],
    [6,48,3],[68,50,6],[11,50,5],[60,53,4],[37,45,3],
    [5,62,6],[66,60,4],[13,65,3],[58,67,5],[42,73,4],
    [7,78,3],[64,75,6],[19,80,5],[55,79,4],[30,85,3],
    [6,90,5],[63,88,4],[25,93,3],[48,92,6],[35,96,4],
    [33,7,5],[52,15,3],[26,35,6],[44,33,4],[16,40,5],
    [60,42,3],[9,58,6],[63,70,4],[40,62,5],[23,55,3],
  ];

  const INNER_R = 4.8;
  const OUTER_R = 7.5;

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="52%" r="70%">
          <stop offset="0%"   stopColor="#0a0818" />
          <stop offset="40%"  stopColor="#060410" />
          <stop offset="100%" stopColor="#020108" />
        </radialGradient>

        {/* Per-system star gradients: white-hot core → affinity color halo */}
        {systems.map(({ col }, i) => (
          <radialGradient key={i} id={`${id}-sg${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"   />
            <stop offset="18%"  stopColor="#fffce8" stopOpacity="0.95"/>
            <stop offset="45%"  stopColor={col}     stopOpacity="0.6" />
            <stop offset="100%" stopColor={col}     stopOpacity="0"   />
          </radialGradient>
        ))}

        {/* Central hub gradient — gold convergence point */}
        <radialGradient id={`${id}-hub`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"   />
          <stop offset="28%"  stopColor={GOLD2}   stopOpacity="0.9" />
          <stop offset="100%" stopColor={GOLD}    stopOpacity="0"   />
        </radialGradient>

        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.94" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"    />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.6"  />
        </linearGradient>

        <filter id={`${id}-sglow`} x="-400%" y="-400%" width="900%" height="900%">
          <feGaussianBlur stdDeviation="2.0" />
        </filter>
        <filter id={`${id}-aglow`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <filter id={`${id}-hubglow`} x="-500%" y="-500%" width="1100%" height="1100%">
          <feGaussianBlur stdDeviation="3.0" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Starfield */}
      {stars.map(([x, y, ov], i) => (
        <circle key={i} cx={x} cy={y}
          r={ov >= 6 ? 0.42 : ov >= 4 ? 0.27 : 0.18}
          fill="#ffffff"
          opacity={0.06 + ov * 0.03} />
      ))}

      {/* T3 Border — triple L-corner, richest detail */}
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

      {/* Tier label */}
      <text x="35" y="15" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="4.5" fill={GOLD2} opacity="0.65" letterSpacing="3">III</text>
      <line x1="28" y1="16.5" x2="42" y2="16.5"
        stroke={GOLD3} strokeWidth="0.38" strokeOpacity="0.48" />

      {/* Pentagon edge connectors — faint gold dashed links between adjacent systems */}
      {pentEdges.map(([a, b], i) => (
        <line key={i}
          x1={systems[a].cx} y1={systems[a].cy}
          x2={systems[b].cx} y2={systems[b].cy}
          stroke={GOLD3} strokeWidth="0.28" strokeOpacity="0.38"
          strokeDasharray="2.2 2" />
      ))}

      {/* Hub spokes — each system beams energy toward the central hub */}
      {systems.map(({ cx, cy, col }, i) => (
        <line key={i}
          x1={cx} y1={cy} x2={HUB_X} y2={HUB_Y}
          stroke={col} strokeWidth="0.25" strokeOpacity="0.20"
          strokeDasharray="1.6 1.8" />
      ))}

      {/* Central convergence hub bloom */}
      <circle cx={HUB_X} cy={HUB_Y} r="7"
        fill={`url(#${id}-hub)`}
        filter={`url(#${id}-hubglow)`} opacity="0.28" />

      {/* ── Five affinity star systems ── */}
      {systems.map(({ cx, cy, col }, si) => {
        // Inner ring: 4 arcs, 62° span, 90° step, offset varies per system
        const startOff = -90 + si * 18;
        const innerSegs = Array.from({ length: 4 }, (_, i) => ({
          s: startOff + i * 90,
          e: startOff + i * 90 + 62,
        }));
        // Outer ring: 3 arcs, 72° span, 120° step
        const outerSegs = Array.from({ length: 3 }, (_, i) => ({
          s: startOff + i * 120,
          e: startOff + i * 120 + 72,
        }));

        return (
          <g key={si}>
            {/* Corona bloom */}
            <circle cx={cx} cy={cy} r="5.5"
              fill={col} opacity="0.07"
              filter={`url(#${id}-sglow)`} />

            {/* Dashed guide rings */}
            <circle cx={cx} cy={cy} r={INNER_R}
              fill="none" stroke={col} strokeWidth="0.2"
              strokeOpacity="0.16" strokeDasharray="1 1.3" />
            <circle cx={cx} cy={cy} r={OUTER_R}
              fill="none" stroke={GOLD3} strokeWidth="0.18"
              strokeOpacity="0.22" strokeDasharray="1.5 2" />

            {/* Outer ring arc segments */}
            {outerSegs.map(({ s, e }, i) => (
              <g key={i}>
                <path d={arcPath(cx, cy, OUTER_R, s, e)}
                  fill="none" stroke={col} strokeWidth="2.5"
                  strokeOpacity="0.08" strokeLinecap="round"
                  filter={`url(#${id}-aglow)`} />
                <path d={arcPath(cx, cy, OUTER_R, s, e)}
                  fill="none" stroke={col} strokeWidth="1.05"
                  strokeOpacity="0.65" strokeLinecap="round" />
                <path d={arcPath(cx, cy, OUTER_R, s, e)}
                  fill="none" stroke="#ffffff"
                  strokeWidth="0.28" strokeOpacity="0.14"
                  strokeLinecap="round" />
                {/* Collector node at arc midpoint */}
                {(() => {
                  const [mx, my] = pt(cx, cy, OUTER_R, s + 36);
                  return <circle cx={mx} cy={my} r="0.62"
                    fill="#070510" stroke={GOLD3} strokeWidth="0.22" />;
                })()}
              </g>
            ))}

            {/* Inner ring arc segments */}
            {innerSegs.map(({ s, e }, i) => (
              <g key={i}>
                <path d={arcPath(cx, cy, INNER_R, s, e)}
                  fill="none" stroke={col} strokeWidth="1.8"
                  strokeOpacity="0.08" strokeLinecap="round"
                  filter={`url(#${id}-aglow)`} />
                <path d={arcPath(cx, cy, INNER_R, s, e)}
                  fill="none" stroke={col} strokeWidth="0.85"
                  strokeOpacity="0.72" strokeLinecap="round" />
              </g>
            ))}

            {/* Radial energy beams from star surface */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const [bx, by] = pt(cx, cy, 3.5, deg + startOff);
              return (
                <line key={i} x1={cx} y1={cy} x2={bx} y2={by}
                  stroke={i % 2 === 0 ? "#fffce0" : col}
                  strokeWidth="0.28" strokeOpacity="0.32" />
              );
            })}

            {/* Star bloom glow */}
            <circle cx={cx} cy={cy} r="4"
              fill={`url(#${id}-sg${si})`}
              filter={`url(#${id}-sglow)`} opacity="0.52" />

            {/* Star core */}
            <circle cx={cx} cy={cy} r="2.1" fill={`url(#${id}-sg${si})`} />

            {/* Cross-flare */}
            <line x1={cx-3.2} y1={cy} x2={cx+3.2} y2={cy}
              stroke="#fff8e0" strokeWidth="0.32" strokeOpacity="0.45" />
            <line x1={cx} y1={cy-3.2} x2={cx} y2={cy+3.2}
              stroke="#fff8e0" strokeWidth="0.32" strokeOpacity="0.45" />
            <line x1={cx-2} y1={cy-2} x2={cx+2} y2={cy+2}
              stroke={col} strokeWidth="0.18" strokeOpacity="0.3" />
            <line x1={cx+2} y1={cy-2} x2={cx-2} y2={cy+2}
              stroke={col} strokeWidth="0.18" strokeOpacity="0.3" />
          </g>
        );
      })}

      {/* Central convergence node */}
      <circle cx={HUB_X} cy={HUB_Y} r="1.2"
        fill="#070510" stroke={GOLD2} strokeWidth="0.42" strokeOpacity="0.88" />
      <circle cx={HUB_X} cy={HUB_Y} r="0.52" fill={GOLD2} opacity="0.92" />
      <circle cx={HUB_X} cy={HUB_Y} r="0.22" fill="#ffffff" opacity="0.95" />

      {/* Luminae wordmark */}
      <text x="35" y="93.5" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.35" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}
