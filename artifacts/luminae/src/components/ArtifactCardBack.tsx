
// ── ArtifactCardBack ─────────────────────────────────────────────────────────
// Three-tier SVG card backs — Kardashev civilization-scale motifs.
//
// The visual escalation must read at a glance: planet → star → galaxy.
// Infrastructure density, compositional scale, and complexity all escalate.
//
// Tier I  — Type I  Planetary: one world mastered — continental energy grid,
//           world-nodes, atmospheric/orbital infrastructure, single planet.
// Tier II — Type II Stellar:   star-harvesting megastructure — three concentric
//           Dyson collector rings, multi-shell orbital infrastructure, star dominant.
// Tier III— Type III Galactic: galactic-scale network — spiral galaxy with four
//           arms, dense star-lane lattice, many civilization nodes across light-years.
//
// Shared: premium dark-space aesthetic · escalating border complexity ·
//         five affinity accent colors at low opacity · no humanoids · no card data.
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

// Compute SVG arc-path string given center, radius, start/end degrees
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
export function CardBackTier1({ count }: { count?: number }) {
  const id = 't1cb';
  const PX = 35, PY = 56, PR = 16; // large planet, lower-center

  // Five world-node cities — evenly spaced pentagon ~12 units from center
  const cityNodes: [number,number,string][] = [
    [35,  44.5, F], // North pole region — Flare
    [46,  51.5, C], // NE                — Continuum
    [42,  64.5, V], // SE                — Verdance
    [28,  64.5, A], // SW                — Abyss
    [24,  51.5, R], // NW                — Radiance
  ];

  // Orbital arc: first step into space, partial ring just above atmosphere
  const ORB_R = PR + 4.5; // r=20.5

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        {/* Space bg */}
        <radialGradient id={`${id}-bg`} cx="50%" cy="54%" r="62%">
          <stop offset="0%"   stopColor="#0a0e22" />
          <stop offset="55%"  stopColor={BG_MID}  />
          <stop offset="100%" stopColor={BG_DEEP} />
        </radialGradient>

        {/* Planet fill — ocean-world, dark blue with subtle highlight */}
        <radialGradient id={`${id}-planet`} cx="40%" cy="32%" r="72%">
          <stop offset="0%"   stopColor="#2248a0" />
          <stop offset="30%"  stopColor="#102260" />
          <stop offset="70%"  stopColor="#081438" />
          <stop offset="100%" stopColor="#030a1c" />
        </radialGradient>

        {/* Terminator (night side shadow from left) */}
        <radialGradient id={`${id}-night`} cx="18%" cy="50%" r="72%">
          <stop offset="0%"   stopColor="#000008" stopOpacity="0.75" />
          <stop offset="55%"  stopColor="#000008" stopOpacity="0.3"  />
          <stop offset="100%" stopColor="#000008" stopOpacity="0"    />
        </radialGradient>

        {/* Atmospheric halo */}
        <radialGradient id={`${id}-atmo`} cx="50%" cy="50%" r="50%">
          <stop offset="72%"  stopColor="#1a60e0" stopOpacity="0"    />
          <stop offset="85%"  stopColor="#4090ff" stopOpacity="0.55" />
          <stop offset="94%"  stopColor="#80c0ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a0d8ff" stopOpacity="0"    />
        </radialGradient>

        {/* Continental landmass colour */}
        <radialGradient id={`${id}-land`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#2a5840" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1a3828" stopOpacity="0.5" />
        </radialGradient>

        {/* Gold border */}
        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.75" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"    />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5"  />
        </linearGradient>

        {/* Clip planet surface */}
        <clipPath id={`${id}-clip`}>
          <circle cx={PX} cy={PY} r={PR} />
        </clipPath>
      </defs>

      {/* ── Space background ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Sparse starfield — planet fills most of the view */}
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

      <path d="M4 16 L4 4 L16 4"   fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M54 4 L66 4 L66 16" fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M4 84 L4 96 L16 96" fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />
      <path d="M54 96 L66 96 L66 84" fill="none" stroke={GOLD2} strokeWidth="1.25" strokeLinecap="square" />

      {([[4,4],[66,4],[4,96],[66,96]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill={GOLD} opacity="0.82" />
      ))}

      {/* Single mid-edge tick per side */}
      <line x1="35" y1="4"  x2="35" y2="7.5" stroke={GOLD} strokeWidth="0.6" />
      <line x1="35" y1="96" x2="35" y2="92.5" stroke={GOLD} strokeWidth="0.6" />
      <line x1="4"  y1="50" x2="7.5"  y2="50" stroke={GOLD} strokeWidth="0.6" />
      <line x1="66" y1="50" x2="62.5" y2="50" stroke={GOLD} strokeWidth="0.6" />

      {/* ── Tier symbol "I" — top center ── */}
      <text x="35" y="20" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="7" fill={GOLD2} opacity="0.88" letterSpacing="0.5">I</text>
      <line x1="31" y1="22" x2="39" y2="22" stroke={GOLD} strokeWidth="0.45" strokeOpacity="0.6" />

      {/* ── Atmospheric halo — drawn behind sphere ── */}
      <circle cx={PX} cy={PY} r={PR + 3.5} fill={`url(#${id}-atmo)`} />

      {/* ── Planet sphere ── */}
      <circle cx={PX} cy={PY} r={PR} fill={`url(#${id}-planet)`} />

      {/* ── Continental landmasses — organic polygon shapes, clipped ── */}
      {/* Large northern continent */}
      <polygon
        points={`${PX+2},${PY-12} ${PX+9},${PY-9} ${PX+12},${PY-4} ${PX+9},${PY+1} ${PX+4},${PY+3} ${PX},${PY-1} ${PX+1},${PY-8}`}
        fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />
      {/* Southern continent */}
      <polygon
        points={`${PX-3},${PY+5} ${PX+4},${PY+4} ${PX+7},${PY+9} ${PX+4},${PY+13} ${PX-2},${PY+14} ${PX-7},${PY+10} ${PX-6},${PY+5}`}
        fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />
      {/* Small western island */}
      <polygon
        points={`${PX-10},${PY-3} ${PX-7},${PY-5} ${PX-5},${PY-2} ${PX-8},${PY+2} ${PX-12},${PY+1}`}
        fill={`url(#${id}-land)`} clipPath={`url(#${id}-clip)`} />

      {/* ── World-energy grid — lat/lon lines clipped to planet ── */}
      <g clipPath={`url(#${id}-clip)`} fill="none"
        stroke="#3a70c0" strokeWidth="0.4" strokeOpacity="0.45">
        {/* Five latitude parallels */}
        <line x1={PX-PR} y1={PY-9}  x2={PX+PR} y2={PY-9}  />
        <line x1={PX-PR} y1={PY-3}  x2={PX+PR} y2={PY-3}  />
        <line x1={PX-PR} y1={PY+3}  x2={PX+PR} y2={PY+3}  />
        <line x1={PX-PR} y1={PY+9}  x2={PX+PR} y2={PY+9}  />
        {/* Five longitude meridians */}
        <line x1={PX-9}  y1={PY-PR} x2={PX-9}  y2={PY+PR} />
        <line x1={PX-3}  y1={PY-PR} x2={PX-3}  y2={PY+PR} />
        <line x1={PX+3}  y1={PY-PR} x2={PX+3}  y2={PY+PR} />
        <line x1={PX+9}  y1={PY-PR} x2={PX+9}  y2={PY+PR} />
        {/* Polar caps */}
        <line x1={PX-7} y1={PY-14} x2={PX+7} y2={PY-14} strokeOpacity="0.25" />
        <line x1={PX-7} y1={PY+14} x2={PX+7} y2={PY+14} strokeOpacity="0.25" />
      </g>

      {/* ── Night-side terminator shadow ── */}
      <circle cx={PX} cy={PY} r={PR} fill={`url(#${id}-night)`} />

      {/* ── Planet edge ring ── */}
      <circle cx={PX} cy={PY} r={PR}
        fill="none" stroke="#5090e0" strokeWidth="0.5" strokeOpacity="0.5" />

      {/* ── First orbital infrastructure — partial arc above atmosphere ── */}
      {/* This represents the beginning of space civilisation: satellites/station ring */}
      <path d={arcPath(PX, PY, ORB_R, -135, 55)}
        fill="none" stroke={GOLD3} strokeWidth="0.7" strokeOpacity="0.55"
        strokeDasharray="3 1.8" />
      {/* Station nodes on orbital arc at 4 positions */}
      {([-110, -45, 20, 45] as number[]).map((deg, i) => {
        const [ox, oy] = pt(PX, PY, ORB_R, deg);
        return (
          <g key={i}>
            <rect x={ox-1} y={oy-0.8} width="2" height="1.6" rx="0.3"
              fill="#0c1a40" stroke={GOLD3} strokeWidth="0.35" />
          </g>
        );
      })}

      {/* ── Planetary energy network — city connections ── */}
      {/* Pentagon ring */}
      {cityNodes.map(([x1,y1], i) => {
        const [x2,y2] = cityNodes[(i + 1) % 5];
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#4080d0" strokeWidth="0.45" strokeOpacity="0.6"
            clipPath={`url(#${id}-clip)`} />
        );
      })}
      {/* Cross-spokes to center (power grid hub) */}
      {cityNodes.map(([x,y], i) => (
        <line key={`s${i}`} x1={PX} y1={PY} x2={x} y2={y}
          stroke="#2858b0" strokeWidth="0.3" strokeOpacity="0.45"
          clipPath={`url(#${id}-clip)`} />
      ))}

      {/* ── Five world-city nodes ── */}
      {cityNodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3"   fill={col as string} opacity="0.08" />
          <circle cx={x} cy={y} r="1.4" fill={col as string} opacity="0.52" />
          <circle cx={x} cy={y} r="0.55" fill="#ffffff"      opacity="0.75" />
        </g>
      ))}

      {/* ── Luminae wordmark ── */}
      <text x="35" y="91" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.38" letterSpacing="2.5">LUMINAE</text>

      {count !== undefined && (
        <text x="62" y="93" textAnchor="end" fontFamily="monospace"
          fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>
      )}
    </svg>
  );
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TIER II — Type II Stellar Civilization                                 ║
// ║  A star is the engine: three concentric Dyson collector rings           ║
// ║  (inner/middle/outer) harvest the star's full output. This              ║
// ║  civilization has left planetary scale entirely behind.                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export function CardBackTier2({ count }: { count?: number }) {
  const id = 't2cb';
  const CX = 35, CY = 54; // stellar core center

  // Three Dyson ring radii — inner-to-outer construction shells
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

        {/* Stellar core — white-hot centre to orange-amber corona */}
        <radialGradient id={`${id}-star`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fffef0" stopOpacity="1"   />
          <stop offset="18%"  stopColor="#fff0a0" stopOpacity="0.95"/>
          <stop offset="40%"  stopColor="#ffa030" stopOpacity="0.65"/>
          <stop offset="70%"  stopColor="#c04010" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#400808" stopOpacity="0"   />
        </radialGradient>

        {/* Extended corona bloom */}
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

      {/* ── Tier symbol "II" ── */}
      <text x="35" y="20" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="7" fill={GOLD2} opacity="0.9" letterSpacing="3">II</text>
      <line x1="29" y1="22" x2="41" y2="22" stroke={GOLD} strokeWidth="0.45" strokeOpacity="0.65" />

      {/* ── Extended corona (behind rings) ── */}
      <circle cx={CX} cy={CY} r="14" fill={`url(#${id}-corona)`} />

      {/* ── Three Dyson collector rings — inner to outer ── */}
      {rings.map(({ r, segs, span, step, startOff, colors }, ri) => (
        <g key={ri}>
          {/* Structural guide ring (faint) */}
          <circle cx={CX} cy={CY} r={r}
            fill="none" stroke={ri === 0 ? "#3050a0" : GOLD3}
            strokeWidth={ri === 0 ? 0.3 : 0.28}
            strokeOpacity={ri === 0 ? 0.3 : 0.25}
            strokeDasharray="1.5 1.5" />

          {/* Collector arc segments */}
          {Array.from({ length: segs }).map((_, i) => {
            const s = startOff + i * step;
            const e = s + span;
            const col = colors[i % colors.length];
            const [mx, my] = pt(CX, CY, r, s + span/2);
            // outer structural node pos
            const [ox, oy] = pt(CX, CY, r + (ri === 2 ? 3 : 2.5), s + span/2);
            return (
              <g key={i}>
                {/* Glow */}
                <path d={arcPath(CX, CY, r, s, e)}
                  fill="none" stroke={col} strokeWidth={ri===0?3.5:ri===1?3:2.5}
                  strokeOpacity="0.1" strokeLinecap="round"
                  filter={`url(#${id}-arcglow)`} />
                {/* Main arc */}
                <path d={arcPath(CX, CY, r, s, e)}
                  fill="none" stroke={col}
                  strokeWidth={ri===0?1.5:ri===1?1.3:1.1}
                  strokeOpacity={ri===0?0.75:ri===1?0.68:0.6}
                  strokeLinecap="round" />
                {/* Bright highlight */}
                <path d={arcPath(CX, CY, r, s, e)}
                  fill="none" stroke="#ffffff"
                  strokeWidth="0.35" strokeOpacity="0.18"
                  strokeLinecap="round" />
                {/* Collector node at arc midpoint */}
                <circle cx={mx} cy={my} r={ri===0?0.9:0.75}
                  fill="#080c28" stroke={GOLD3} strokeWidth="0.3" />
              </g>
            );
          })}

          {/* Structural struts between rings */}
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

      {/* ── Energy beams from stellar core to ring midpoints ── */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const [x, y] = pt(CX, CY, 9, deg);
        return (
          <line key={i} x1={CX} y1={CY} x2={x} y2={y}
            stroke={i % 2 === 0 ? "#ffe090" : "#ffb040"}
            strokeWidth="0.35" strokeOpacity="0.35" />
        );
      })}

      {/* ── Star bloom glow (behind core) ── */}
      <circle cx={CX} cy={CY} r="7"
        fill={`url(#${id}-star)`}
        filter={`url(#${id}-starglow)`} opacity="0.55" />

      {/* ── Stellar core ── */}
      <circle cx={CX} cy={CY} r="5.5" fill={`url(#${id}-star)`} />

      {/* Star surface cross-flare */}
      <line x1={CX-9} y1={CY}   x2={CX+9} y2={CY}   stroke="#fff8c0" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1={CX}   y1={CY-9} x2={CX}   y2={CY+9} stroke="#fff8c0" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1={CX-6} y1={CY-6} x2={CX+6} y2={CY+6} stroke="#ffc060" strokeWidth="0.25" strokeOpacity="0.28" />
      <line x1={CX+6} y1={CY-6} x2={CX-6} y2={CY+6} stroke="#ffc060" strokeWidth="0.25" strokeOpacity="0.28" />

      {/* ── Luminae wordmark ── */}
      <text x="35" y="91" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.38" letterSpacing="2.5">LUMINAE</text>

      {count !== undefined && (
        <text x="62" y="94" textAnchor="end" fontFamily="monospace"
          fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>
      )}
    </svg>
  );
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TIER III — Type III Galactic Civilization                              ║
// ║  A galaxy-spanning network: four spiral arms with star clusters,        ║
// ║  13 civilization nodes (4 arm-tip hubs + 8 midpoints + core),          ║
// ║  dense star-lane lattice of hyperspace routes, galactic bar.            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export function CardBackTier3({ count }: { count?: number }) {
  const id = 't3cb';
  const CX = 35, CY = 55; // galactic core

  // Four arm tip nodes (large hubs, affinity-colored)
  const armTips: [number,number,string][] = [
    [55, 16, F], // NE — Flare
    [58, 83, C], // SE — Continuum
    [15, 90, V], // SW — Verdance
    [12, 26, A], // NW — Abyss
  ];

  // Intermediate nodes along each arm (2 per arm = 8 secondary)
  // Computed as ~1/3 and 2/3 along each bezier arm path
  const midNodes: [number,number,string][] = [
    [44, 33, F], [50, 24, F], // NE arm thirds
    [48, 66, C], [53, 75, C], // SE arm thirds
    [26, 74, V], [20, 83, V], // SW arm thirds
    [22, 41, A], [17, 32, A], // NW arm thirds
  ];

  // All nodes for lattice drawing
  const allTips  = armTips;
  const core: [number,number,string] = [CX, CY, R];

  // Star-lane connections: [nodeA, nodeB] as indices into a merged array
  // merged = armTips[0..3] + midNodes[0..7] + [core]
  // armTips: 0=NE, 1=SE, 2=SW, 3=NW
  // midNodes: 4=NE-far,5=NE-near, 6=SE-far,7=SE-near, 8=SW-far,9=SW-near,10=NW-far,11=NW-near
  // core: 12
  const merged: [number,number,string][] = [...armTips, ...midNodes, core];
  const lanes: [number,number][] = [
    // Core spokes to near-midpoints
    [12,5],[12,7],[12,9],[12,11],
    // Each arm chain: mid-near → mid-far → tip
    [11,10],[10,3], // NW arm
    [5,4],[4,0],   // NE arm
    [7,6],[6,1],   // SE arm
    [9,8],[8,2],   // SW arm
    // Cross-connections between adjacent arm tips
    [0,3],[0,1],[1,2],[2,3],
    // Cross-connections between intermediate nodes (diagonals)
    [4,11],[6,9],
  ];

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        {/* Deepest void — intergalactic scale */}
        <radialGradient id={`${id}-bg`} cx="50%" cy="52%" r="72%">
          <stop offset="0%"   stopColor="#0e0820" />
          <stop offset="40%"  stopColor="#060514" />
          <stop offset="100%" stopColor="#010208" />
        </radialGradient>

        {/* Galactic disk nebula background */}
        <radialGradient id={`${id}-disk`} cx="50%" cy="54%" r="50%">
          <stop offset="0%"   stopColor="#1c1050" stopOpacity="0.85" />
          <stop offset="40%"  stopColor="#0e0830" stopOpacity="0.5"  />
          <stop offset="75%"  stopColor="#060418" stopOpacity="0.2"  />
          <stop offset="100%" stopColor="#020210" stopOpacity="0"    />
        </radialGradient>

        {/* Galactic bar — bright central structure */}
        <linearGradient id={`${id}-bar`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%"   stopColor="#4030a0" stopOpacity="0"   />
          <stop offset="25%"  stopColor="#8060e0" stopOpacity="0.4" />
          <stop offset="50%"  stopColor="#c0a0ff" stopOpacity="0.7" />
          <stop offset="75%"  stopColor="#8060e0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4030a0" stopOpacity="0"   />
        </linearGradient>

        {/* Galactic core nucleus */}
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="12%"  stopColor="#d0c0ff" stopOpacity="0.85" />
          <stop offset="35%"  stopColor="#8050d0" stopOpacity="0.45" />
          <stop offset="70%"  stopColor="#3018a0" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#100830" stopOpacity="0"    />
        </radialGradient>

        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.94" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"    />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.6"  />
        </linearGradient>

        <filter id={`${id}-coreglow`} x="-400%" y="-400%" width="900%" height="900%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={`${id}-armglow`}  x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={`${id}-nodeglow`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* ── Deep void ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Dense galactic starfield — many stars across the card */}
      {([
        [4,4],[64,7],[19,12],[53,16],[8,24],[66,28],[5,44],[68,49],
        [11,64],[61,67],[7,78],[65,81],[26,5],[46,4],[36,96],[21,93],
        [58,95],[13,47],[60,44],[33,13],[49,28],[18,30],[51,73],[16,70],
        [62,53],[9,55],[39,7],[29,96],[55,36],[15,36],[44,88],[24,77],
        [57,60],[11,20],[63,20],[33,84],[40,18],[29,18],[52,46],[18,53],
      ] as [number,number][]).map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 7 === 0 ? 0.5 : i % 3 === 0 ? 0.32 : 0.2}
          fill="#fff" opacity={0.1 + (i % 8) * 0.038} />
      ))}

      {/* ── Galactic disk ellipse ── */}
      <ellipse cx={CX} cy={CY} rx="28" ry="32" fill={`url(#${id}-disk)`} />

      {/* ── T3 Border — triple L-corner, richest detail ── */}
      <rect x="3"   y="3"   width="64" height="94" rx="2"
        fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.9" />
      <rect x="5"   y="5"   width="60" height="90" rx="1.5"
        fill="none" stroke={GOLD}  strokeWidth="0.3"  strokeOpacity="0.45" />
      <rect x="7"   y="7"   width="56" height="86" rx="1"
        fill="none" stroke={GOLD3} strokeWidth="0.22" strokeOpacity="0.32" />

      {([
        ["M3 19 L3 3 L19 3",   "M7 16 L7 7 L16 7",   "M10 14 L10 10 L14 10"],
        ["M51 3 L67 3 L67 19", "M54 7 L63 7 L63 16", "M56 10 L60 10 L60 14"],
        ["M3 81 L3 97 L19 97", "M7 84 L7 93 L16 93", "M10 86 L10 90 L14 90"],
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

      {/* ── Tier symbol "III" ── */}
      <text x="35" y="20" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="7" fill={GOLD2} opacity="0.93" letterSpacing="4">III</text>
      <line x1="27" y1="22" x2="43" y2="22"
        stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.72" />

      {/* ── Galactic bar — bright linear structure through core ── */}
      <rect x={CX-14} y={CY-2.2} width="28" height="4.4" rx="2.2"
        fill={`url(#${id}-bar)`} />

      {/* ── Four spiral arms — glow then fine spine ── */}
      {/* Each arm: cubic bezier from near-center outward, curving away */}
      {[
        { d: `M ${CX+5} ${CY-4} C 47 36, 58 24, 55 16`, col: F },  // NE
        { d: `M ${CX+5} ${CY+4} C 50 66, 60 76, 58 83`, col: C },  // SE
        { d: `M ${CX-5} ${CY+4} C 23 70, 13 82, 15 90`, col: V },  // SW
        { d: `M ${CX-5} ${CY-4} C 21 40, 13 28, 12 26`, col: A },  // NW
      ].map(({ d, col }, i) => (
        <g key={i}>
          {/* Wide glow halo */}
          <path d={d} fill="none" stroke={col} strokeWidth="7"
            strokeOpacity="0.07" strokeLinecap="round"
            filter={`url(#${id}-armglow)`} />
          {/* Arm body — stellar density band */}
          <path d={d} fill="none" stroke={col} strokeWidth="2.2"
            strokeOpacity="0.18" strokeLinecap="round" />
          {/* Bright arm spine */}
          <path d={d} fill="none" stroke="#d0d8ff" strokeWidth="0.55"
            strokeOpacity="0.3" strokeLinecap="round" />
        </g>
      ))}

      {/* ── Star clusters along arms ── */}
      {([
        // NE arm
        [40,42],[44,33],[48,27],[52,20],[43,36],
        // SE arm
        [42,63],[47,69],[52,76],[56,80],[44,58],
        // SW arm
        [30,66],[24,73],[19,80],[17,87],[29,60],
        // NW arm
        [30,46],[24,39],[18,33],[14,29],[28,50],
      ] as [number,number][]).map(([x,y], i) => (
        <circle key={i} cx={x} cy={y}
          r={i % 5 === 0 ? 0.7 : 0.4}
          fill="#c8d0ff" opacity={0.2 + (i % 4) * 0.07} />
      ))}

      {/* ── Star-lane lattice — hyperspace routes ── */}
      {lanes.map(([a, b], i) => {
        const [x1,y1] = merged[a];
        const [x2,y2] = merged[b];
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={GOLD3} strokeWidth="0.32" strokeOpacity="0.38"
            strokeDasharray="2.5 1.8" />
        );
      })}

      {/* ── Intermediate civilization nodes (secondary) ── */}
      {midNodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2.5" fill={col} opacity="0.06"
            filter={`url(#${id}-nodeglow)`} />
          <circle cx={x} cy={y} r="1.0" fill="#04021a" stroke={col} strokeWidth="0.42" strokeOpacity="0.7" />
          <circle cx={x} cy={y} r="0.42" fill={col} opacity="0.6" />
        </g>
      ))}

      {/* ── Arm-tip civilization hub nodes ── */}
      {armTips.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill={col} opacity="0.07"
            filter={`url(#${id}-nodeglow)`} />
          <circle cx={x} cy={y} r="2.5" fill="#04021a" stroke={col} strokeWidth="0.55" strokeOpacity="0.85" />
          <circle cx={x} cy={y} r="1.2" fill={col} opacity="0.62" />
          <circle cx={x} cy={y} r="0.45" fill="#fff" opacity="0.75" />
        </g>
      ))}

      {/* ── Galactic core bloom ── */}
      <circle cx={CX} cy={CY} r="10"
        fill={`url(#${id}-core)`}
        filter={`url(#${id}-coreglow)`} opacity="0.5" />
      <circle cx={CX} cy={CY} r="5" fill={`url(#${id}-core)`} />

      {/* Core cross-flare */}
      <line x1={CX-8} y1={CY} x2={CX+8} y2={CY}
        stroke="#e8d8ff" strokeWidth="0.32" strokeOpacity="0.45" />
      <line x1={CX} y1={CY-8} x2={CX} y2={CY+8}
        stroke="#e8d8ff" strokeWidth="0.32" strokeOpacity="0.45" />

      {/* ── Central Radiance node (galactic core civilization) ── */}
      <circle cx={CX} cy={CY} r="8" fill={R} opacity="0.06"
        filter={`url(#${id}-nodeglow)`} />
      <circle cx={CX} cy={CY} r="2.8" fill="#04021a" stroke={R} strokeWidth="0.6" strokeOpacity="0.9" />
      <circle cx={CX} cy={CY} r="1.4" fill={R} opacity="0.7" />
      <circle cx={CX} cy={CY} r="0.5" fill="#fff" opacity="0.85" />

      {/* ── Luminae wordmark ── */}
      <text x="35" y="93" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.42" letterSpacing="2.5">LUMINAE</text>

      {count !== undefined && (
        <text x="63" y="95.5" textAnchor="end" fontFamily="monospace"
          fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>
      )}
    </svg>
  );
}
