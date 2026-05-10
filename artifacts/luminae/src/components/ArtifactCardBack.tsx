
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

  // Regular pentagon, radius 10, centered on planet (PX, PY), first vertex pointing straight up
  const _pR = 10;
  const cityNodes: [number,number,string][] = [0,1,2,3,4].map((k) => {
    const ang = (Math.PI * (-0.5 + (2 * k) / 5));
    return [
      Math.round((PX + _pR * Math.cos(ang)) * 10) / 10,
      Math.round((PY + _pR * Math.sin(ang)) * 10) / 10,
      [F, R, V, C, A][k],
    ] as [number, number, string];
  });

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
        {/* Distant sun gradient */}
        <radialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"   />
          <stop offset="15%"  stopColor="#fff8d0" stopOpacity="0.92"/>
          <stop offset="38%"  stopColor="#ffe090" stopOpacity="0.55"/>
          <stop offset="65%"  stopColor="#ffa030" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#ff6000" stopOpacity="0"   />
        </radialGradient>
        <filter id={`${id}-sunglow`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        {/* Clip sun glow to card interior so bloom never bleeds past the border */}
        <clipPath id={`${id}-cardclip`}>
          <rect x="4" y="4" width="62" height="92" rx="1.5" />
        </clipPath>
      </defs>

      {/* ── Space background ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* ── Dense starfield — distant star field across the whole card ── */}
      {([
        [6,6,5],[63,9,4],[14,18,3],[58,22,6],[8,38,4],[65,43,5],
        [7,72,3],[66,68,6],[12,82,4],[59,85,5],[9,93,3],[64,92,4],
        [20,8,5],[47,11,3],[33,7,6],[52,5,4],[16,13,5],[60,7,3],
        [5,25,4],[67,28,5],[10,32,3],[63,34,4],[4,48,6],[68,52,3],
        [5,60,4],[66,64,5],[8,70,3],[64,75,4],[6,84,5],[65,80,3],
        [18,92,4],[50,95,6],[28,97,3],[44,93,5],[22,85,4],[56,90,3],
        [25,15,3],[42,9,5],[38,13,4],[15,22,6],[62,19,3],[48,17,5],
        [11,44,4],[66,40,3],[5,56,5],[68,60,4],[10,68,3],[64,56,5],
        [16,76,4],[62,78,3],[22,88,5],[54,87,4],[30,93,3],[46,91,6],
      ] as [number,number,number][]).map(([x,y,sz], i) => (
        <circle key={i} cx={x} cy={y}
          r={sz >= 6 ? 0.48 : sz >= 5 ? 0.32 : sz >= 4 ? 0.22 : 0.15}
          fill="#ffffff"
          opacity={0.10 + (sz * 0.038)} />
      ))}

      {/* ── Local star — clipped to card interior so bloom stays within border ── */}
      <g clipPath={`url(#${id}-cardclip)`}>
        {/* Broad outer corona bloom */}
        <circle cx="57" cy="19" r="20"
          fill={`url(#${id}-sun)`}
          filter={`url(#${id}-sunglow)`} opacity="0.38" />
        {/* Inner corona */}
        <circle cx="57" cy="19" r="11"
          fill={`url(#${id}-sun)`}
          filter={`url(#${id}-sunglow)`} opacity="0.65" />
        {/* Limb-lit disc */}
        <circle cx="57" cy="19" r="4.2" fill={`url(#${id}-sun)`} opacity="0.94" />
        {/* Bright point */}
        <circle cx="57" cy="19" r="1.5" fill="#ffffff" opacity="0.98" />
        {/* Cross-flare */}
        <line x1="45" y1="19" x2="69" y2="19"
          stroke="#fff8c0" strokeWidth="0.4" strokeOpacity="0.38" />
        <line x1="57" y1="7"  x2="57" y2="31"
          stroke="#fff8c0" strokeWidth="0.4" strokeOpacity="0.30" />
        <line x1="49" y1="11" x2="65" y2="27"
          stroke="#ffeeaa" strokeWidth="0.2" strokeOpacity="0.18" />
        <line x1="65" y1="11" x2="49" y2="27"
          stroke="#ffeeaa" strokeWidth="0.2" strokeOpacity="0.18" />
      </g>

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

      {/* Single mid-edge tick per side — bottom tick shortened to leave wordmark clear */}
      <line x1="35" y1="4"  x2="35" y2="7.5"  stroke={GOLD} strokeWidth="0.6" />
      <line x1="35" y1="96" x2="35" y2="93.5" stroke={GOLD} strokeWidth="0.6" />
      <line x1="4"  y1="50" x2="7.5"  y2="50" stroke={GOLD} strokeWidth="0.6" />
      <line x1="66" y1="50" x2="62.5" y2="50" stroke={GOLD} strokeWidth="0.6" />

      {/* ── Tier label — integrated into top margin ── */}
      <text x="35.5" y="14.5" textAnchor="middle" fontFamily="Georgia, serif"
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
      <text x="35" y="89.5" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.50" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TIER II — Type II Stellar Civilization                                 ║
// ║  A star's magnetosphere rendered as pure geometry: five dipole field    ║
// ║  A Dyson Swarm: thousands of solar collector satellites in varied        ║
// ║  orbital planes around a single star, harvesting its full output.       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export function CardBackTier2({ count: _count }: { count?: number }) {
  const id = 't2cb';
  const CX = 35, CY = 51;   // star / sphere center

  // ── Hex Dyson sphere shell generator ──────────────────────────────────────
  // Projects a flat-top hex grid onto the visible hemisphere of a sphere.
  // Each cell falls into one of 5 affinity sectors (72° each). Small gaps
  // at sector boundaries let star-light through. Two shell layers: outer at
  // R=23 (hex size 3.0) and inner at R=16 (hex size 2.4, 36° sector offset).
  type HexCell = { verts: [number, number][]; col: string; z: number; solid: boolean; cx: number; cy: number };

  const SECTOR_COLS = [R, C, V, F, A];
  const getSectorCol = (angle: number, phaseOff: number): string | null => {
    const a = ((angle + phaseOff) % 360 + 360) % 360;
    const frac = (a % 72) / 72;
    if (frac < 0.13 || frac > 0.87) return null;   // wider gap → clear fragmentation between sectors
    return SECTOR_COLS[Math.floor(a / 72)];
  };

  const genShell = (shellR: number, hr: number, phaseOff: number, solidMod = 3): HexCell[] => {
    const cells: HexCell[] = [];
    const DX = hr * 1.5;
    const DY = hr * Math.sqrt(3);
    const cols = Math.ceil(shellR / DX) + 2;
    const rows = Math.ceil(shellR / DY) + 2;
    for (let ci = -cols; ci <= cols; ci++) {
      for (let ri = -rows; ri <= rows; ri++) {
        const hx = DX * ci;
        const hy = DY * (ri + (ci % 2 !== 0 ? 0.5 : 0));
        const d2 = (hx * hx + hy * hy) / (shellR * shellR);
        if (d2 > 0.93) continue;
        if (hx === 0 && hy === 0) continue;   // skip the grid-origin cell — it sits on the star
        const angle = (Math.atan2(hy, hx) * 180) / Math.PI;
        const col = getSectorCol(angle, phaseOff);
        if (!col) continue;
        const z = Math.sqrt(1 - d2);              // 0=edge → 1=center
        const compress = 1 - d2 * 0.13;           // sphere-surface foreshortening
        // Depth: cells closer to the star (d2→0) are smaller — 65% at centre, ~98% at shell edge.
        const perspScale = 0.65 + d2 * 0.35;
        const verts = Array.from({ length: 6 }, (_, k) => {
          const ang = (Math.PI / 3) * k;
          const vx = hx + hr * perspScale * Math.cos(ang);
          const vy = hy + hr * perspScale * Math.sin(ang);
          const vd2 = Math.min((vx * vx + vy * vy) / (shellR * shellR), 1);
          const vc = 1 - vd2 * 0.13;
          return [CX + vx * vc, CY + vy * vc] as [number, number];
        });
        // Deterministic solid flag — ~every 3rd cell is a filled collector panel
        // (caller can override density via solidMod)
        const solid = ((Math.abs(ci) * 7 + Math.abs(ri) * 13 + ci * ri) % solidMod) === 0;
        const sx = CX + hx * compress;
        const sy = CY + hy * compress;
        cells.push({ verts, col, z, solid, cx: sx, cy: sy });
      }
    }
    return cells.sort((a, b) => a.z - b.z);       // back → front
  };

  // Dark absorber-surface base — rich dark, clearly different from card void-black
  const PANEL_BASE: Record<string, string> = {
    [F]: '#4a1212', [C]: '#10204a', [V]: '#0d2818', [A]: '#280d4a', [R]: '#1c2030',
  };
  // Mid-body colour — readable affinity tint so each sector is identifiable
  const PANEL_MID: Record<string, string> = {
    [F]: '#7a2020', [C]: '#1a3878', [V]: '#1a5028', [A]: '#4a1870', [R]: '#6a7890',
  };
  // 3D bevel shadow (dark affinity) and highlight (bright affinity) colours
  const BEVEL_DARK: Record<string, string> = {
    [F]: '#250606', [C]: '#050a1c', [V]: '#030b04', [A]: '#0f0320', [R]: '#090c14',
  };
  const BEVEL_LIGHT: Record<string, string> = {
    [F]: '#ff8888', [C]: '#88bbff', [V]: '#66ee98', [A]: '#cc8aff', [R]: '#ffffff',
  };
  // Per-edge lighting: dot(outward_normal, upper-left light direction)
  // Vertices are at angle k*PI/3 (flat-top hex); outward normal of edge k→k+1
  // points at angle k*PI/3 + PI/6. Light comes FROM upper-left (-0.707, -0.707).
  const edgeLightFactor = (k: number): number => {
    const mid = (Math.PI / 3) * k + Math.PI / 6;
    return Math.max(0, Math.cos(mid) * (-0.707) + Math.sin(mid) * (-0.707));
  };

  const shell3 = genShell(30, 3.6, 18, 2);         // outermost shell, ~50% solid
  const shell1 = genShell(23, 3.0,  0);            // mid shell
  const shell2 = genShell(16, 2.4, 36);            // inner shell,  36° sector shift

  // Render order: shell2 (inner, most transparent) → shell1 (mid) → shell3 (outer, most opaque).
  // Shell order is the primary key so the outer shell always sits on top of the inner ones.
  // Within each shell, cells are still z-sorted back-to-front.
  const SHELL_ORDER: Record<number, number> = { 2: 0, 1: 1, 3: 2 };
  const allCells = [
    ...shell2.map(c => ({ ...c, sn: 2 as const })),
    ...shell1.map(c => ({ ...c, sn: 1 as const })),
    ...shell3.map(c => ({ ...c, sn: 3 as const })),
  ].sort((a, b) => {
    const so = SHELL_ORDER[a.sn] - SHELL_ORDER[b.sn];
    return so !== 0 ? so : a.z - b.z;
  });

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        {/* Background: warm amber-tinted deep space — thermal re-radiation of the swarm */}
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="68%">
          <stop offset="0%"   stopColor="#1c0e06" />
          <stop offset="45%"  stopColor="#0d0704" />
          <stop offset="100%" stopColor={BG_DEEP} />
        </radialGradient>
        <radialGradient id={`${id}-star`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fffef8" stopOpacity="1"   />
          <stop offset="15%"  stopColor="#fff4b0" stopOpacity="0.96"/>
          <stop offset="38%"  stopColor="#ffaa30" stopOpacity="0.68"/>
          <stop offset="70%"  stopColor="#cc4010" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#400808" stopOpacity="0"   />
        </radialGradient>
        {/* Collective thermal haze — infrared signature of the entire swarm */}
        <radialGradient id={`${id}-haze`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ff8820" stopOpacity="0.38"/>
          <stop offset="38%"  stopColor="#c04010" stopOpacity="0.16"/>
          <stop offset="72%"  stopColor="#601808" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#200408" stopOpacity="0"   />
        </radialGradient>
        <radialGradient id={`${id}-corona`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fffae0" stopOpacity="0.55"/>
          <stop offset="32%"  stopColor="#ffa020" stopOpacity="0.20"/>
          <stop offset="100%" stopColor="#ff4000" stopOpacity="0"   />
        </radialGradient>
        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.88"/>
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"   />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5" />
        </linearGradient>
        <filter id={`${id}-starglow`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id={`${id}-hazeglow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6.0" />
        </filter>
        {/* Limb glow — warm star-light bleeding around the outer shell edge */}
        <radialGradient id={`${id}-limbglow`} cx="50%" cy="51%" r="50%">
          <stop offset="0%"   stopColor="#ff8020" stopOpacity="0"    />
          <stop offset="58%"  stopColor="#ff8020" stopOpacity="0"    />
          <stop offset="72%"  stopColor="#ffaa40" stopOpacity="0.08" />
          <stop offset="80%"  stopColor="#ffdd80" stopOpacity="0.40" />
          <stop offset="86%"  stopColor="#ff8820" stopOpacity="0.22" />
          <stop offset="94%"  stopColor="#cc4800" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#cc4800" stopOpacity="0"    />
        </radialGradient>
        <filter id={`${id}-limbblur`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.0" />
        </filter>
        {/* Affinity-coloured outer glow for opaque panels */}
        <filter id={`${id}-panelglow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="0.55" />
        </filter>
      </defs>

      {/* ── Background ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Starfield — sparser near center (swarm obscures background stars) */}
      {([
        [6,6,5],[63,10,4],[16,17,3],[54,21,6],[9,31,4],[66,36,5],
        [5,57,3],[67,62,6],[15,74,4],[59,77,5],[8,87,3],[64,91,4],
        [26,9,5],[46,7,3],[38,94,6],[22,92,4],[14,46,5],[58,44,3],
        [4,20,4],[68,25,5],[11,38,3],[62,42,4],[69,48,3],
        [5,68,4],[66,72,5],[13,80,3],[57,83,4],[10,92,5],[63,88,3],
        [20,14,4],[48,12,5],[32,6,3],[56,8,6],[17,26,4],[61,30,5],
        [65,46,4],[12,60,5],[66,56,3],[9,76,4],[63,80,5],
        [22,88,3],[54,90,4],[36,97,5],[18,96,3],[50,94,6],[28,4,4],
        [42,15,3],[30,22,5],[24,50,3],[58,64,5],[40,78,4],
      ] as [number,number,number][]).map(([x,y,sz], i) => (
        <circle key={i} cx={x} cy={y}
          r={sz >= 6 ? 0.44 : sz >= 5 ? 0.30 : sz >= 4 ? 0.21 : 0.14}
          fill="#fff" opacity={0.07 + sz * 0.030} />
      ))}

      {/* ── Collective thermal haze — warm sphere enveloping the entire swarm ── */}
      <circle cx={CX} cy={CY} r="36"
        fill={`url(#${id}-haze)`} filter={`url(#${id}-hazeglow)`} />


      {/* ── All Dyson hex shells — globally z-sorted so outer near-cells render on top ── */}
      {allCells.map(({ verts, col, z, solid, cx, cy, sn }, i) => {
        // Panels near the star are rendered here; the star bloom is drawn afterwards
        // so it naturally occludes them — panels appear to exist behind the sun.
        const ptStr = verts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
        const darkCol  = BEVEL_DARK[col]  ?? '#0a0a0a';
        const lightCol = BEVEL_LIGHT[col] ?? '#e0e0e0';
        // Darkened affinity surface for outer panels (use PANEL_MID not full-bright col)
        const surfCol  = PANEL_MID[col]   ?? '#303040';

        // ── Shell 2 (innermost) — panels near star are brightly lit ─────
        // z≈1 = near star (most illuminated), z≈0 = outer edge of this shell
        if (sn === 2) return (
          <g key={i}>
            {solid && <>
              {/* Base affinity fill */}
              <polygon points={ptStr} fill={col} fillOpacity={0.10 + z * 0.18} />
              {/* Stellar illumination overlay — brightest nearest the star */}
              <polygon points={ptStr} fill={lightCol} fillOpacity={z * 0.42} />
            </>}
            {/* Affinity outline — also brightens near star */}
            <polygon points={ptStr} fill="none" stroke={col}
              strokeWidth="0.09" strokeOpacity={0.10 + z * 0.22} />
            {/* Star-lit highlight stroke */}
            <polygon points={ptStr} fill="none" stroke={lightCol}
              strokeWidth="0.07" strokeOpacity={z * 0.38} />
          </g>
        );

        // ── Shell 1 (middle) — dimmer reflected illumination ──────────────
        if (sn === 1) return (
          <g key={i}>
            {solid && <>
              <polygon points={ptStr} fill={col} fillOpacity={0.18 + z * 0.22} />
              {/* Half the stellar boost of shell 2 */}
              <polygon points={ptStr} fill={lightCol} fillOpacity={z * 0.20} />
            </>}
            <polygon points={ptStr} fill="none" stroke={col}
              strokeWidth="0.10" strokeOpacity={0.15 + z * 0.25} />
            <polygon points={ptStr} fill="none" stroke={lightCol}
              strokeWidth="0.07" strokeOpacity={z * 0.18} />
          </g>
        );

        // ── Shell 3 (outermost) ────────────────────────────────────────────
        const dx = CX - cx, dy = CY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!solid) return (
          <g key={i}>
            <polygon points={ptStr} fill="none" stroke={col}
              strokeWidth="0.13" strokeOpacity={0.18 + z * 0.30} />
          </g>
        );

        // Flat opaque panel — 3D depth hinted only by shadow/brightness gradient
        const shadingId = `${id}-sh-${i}`;
        // Gradient: upper-left bright highlight → transparent mid → lower-right shadow
        const gx1 = (cx - 2.6).toFixed(2), gy1 = (cy - 2.6).toFixed(2);
        const gx2 = (cx + 2.6).toFixed(2), gy2 = (cy + 2.6).toFixed(2);
        return (
          <g key={i}>
            <defs>
              <linearGradient id={shadingId}
                x1={gx1} y1={gy1} x2={gx2} y2={gy2}
                gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={lightCol} stopOpacity="0.32" />
                <stop offset="28%"  stopColor={lightCol} stopOpacity="0"    />
                <stop offset="72%"  stopColor={darkCol}  stopOpacity="0"    />
                <stop offset="100%" stopColor={darkCol}  stopOpacity="0.40" />
              </linearGradient>
            </defs>
            {/* Affinity-coloured outer glow */}
            <polygon points={ptStr} fill="none"
              stroke={col} strokeWidth="1.0" strokeOpacity="0.48"
              filter={`url(#${id}-panelglow)`} />
            {/* Dark panel surface (PANEL_MID — not full-bright affinity) */}
            <polygon points={ptStr} fill={surfCol} fillOpacity="1.0" />
            {/* Directional shading overlay: upper-left bright, lower-right dark */}
            <polygon points={ptStr} fill={`url(#${shadingId})`} />
            {/* Bright hairline rim — sole geometric 3D cue */}
            <polygon points={ptStr} fill="none"
              stroke={lightCol} strokeWidth="0.10" strokeOpacity="0.65" />
          </g>
        );
      })}

      {/* ── Extended corona ── */}
      <circle cx={CX} cy={CY} r="17" fill={`url(#${id}-corona)`} />

      {/* ── Star bloom glow ── */}
      <circle cx={CX} cy={CY} r="9"
        fill={`url(#${id}-star)`}
        filter={`url(#${id}-starglow)`} opacity="0.60" />

      {/* ── Stellar core ── */}
      <circle cx={CX} cy={CY} r="5.5" fill={`url(#${id}-star)`} />


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

      {/* Bottom centre tick shortened to y=93 — prevents overlap with LUMINAE wordmark */}
      {[26,35,44].map(x => (
        <g key={x}>
          <line x1={x} y1="3.5"  x2={x} y2={x===35?8.5:7}   stroke={GOLD} strokeWidth={x===35?0.88:0.56} />
          <line x1={x} y1="96.5" x2={x} y2="93"              stroke={GOLD} strokeWidth={x===35?0.88:0.56} />
        </g>
      ))}
      {[40,50,60].map(y => (
        <g key={y}>
          <line x1="3.5"  y1={y} x2={y===50?8.5:7}   y2={y} stroke={GOLD} strokeWidth={y===50?0.88:0.56} />
          <line x1="66.5" y1={y} x2={y===50?61.5:63} y2={y} stroke={GOLD} strokeWidth={y===50?0.88:0.56} />
        </g>
      ))}

      {/* ── Tier label ── */}
      <text x="36" y="15" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="5" fill={GOLD2} opacity="0.75" letterSpacing="2">II</text>
      <line x1="30" y1="16.5" x2="40" y2="16.5"
        stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.52" />

      {/* ── Luminae wordmark ── */}
      <text x="35" y="89.5" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.48" letterSpacing="2.5">LUMINAE</text>
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

  // Five affinity star systems at exact regular-pentagon vertices.
  // Hub=(35,52), R=18, vertex 0 at top (−90°), every 72° clockwise.
  const systems: Array<{ cx: number; cy: number; col: string }> = [
    { cx: 35, cy: 34, col: R }, // Radiance  — top
    { cx: 52, cy: 46, col: C }, // Continuum — upper-right
    { cx: 46, cy: 67, col: V }, // Verdance  — lower-right
    { cx: 24, cy: 67, col: F }, // Flare     — lower-left
    { cx: 18, cy: 46, col: A }, // Abyss     — upper-left
  ];

  // Cycle edge connections (adjacent system index pairs)
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

  // Branch junction points at t≈0.30 along each pentagon arm bezier.
  const satellites: Array<{
    cx: number; cy: number; ax: number; ay: number;
    qx: number; qy: number; q2x: number; q2y: number;
    col: string; parentIdx: number;
  }> = [
    // R — junction (35,40) on arm 0 → top-right corner (58,14)
    { ax: 35, ay: 40, qx: 43, qy: 35, q2x: 52, q2y: 22, cx: 58, cy: 14, col: R, parentIdx: 0 },
    // C — junction (48,48) on arm 1 → right corner (59,64)
    { ax: 48, ay: 48, qx: 53, qy: 52, q2x: 57, q2y: 60, cx: 59, cy: 64, col: C, parentIdx: 1 },
    // V — junction (43,63) on arm 2 → bottom-right (52,88)
    { ax: 43, ay: 63, qx: 46, qy: 72, q2x: 50, q2y: 82, cx: 52, cy: 88, col: V, parentIdx: 2 },
    // F — junction (27,63) on arm 3 → bottom-left (14,86)
    { ax: 27, ay: 63, qx: 22, qy: 72, q2x: 16, q2y: 82, cx: 14, cy: 86, col: F, parentIdx: 3 },
    // A — junction (22,48) on arm 4 → upper-left (11,22)
    { ax: 22, ay: 48, qx: 18, qy: 40, q2x: 13, q2y: 30, cx: 11, cy: 22, col: A, parentIdx: 4 },
  ];

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

        {/* Singularity — black hole: neutral warm-to-white, no faction colors */}
        <radialGradient id={`${id}-accglow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffe8b0" stopOpacity="0.90" />
          <stop offset="40%"  stopColor="#ffb050" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#ff8020" stopOpacity="0"    />
        </radialGradient>
        {/* Accretion disk: transparent → deep gold → bright gold → warm-white gold → mirror */}
        <linearGradient id={`${id}-disk`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%"   stopColor="#7a5800" stopOpacity="0"    />
          <stop offset="12%"  stopColor="#b07800" stopOpacity="0.45" />
          <stop offset="28%"  stopColor="#d4a020" stopOpacity="0.70" />
          <stop offset="42%"  stopColor="#f0c040" stopOpacity="0.88" />
          <stop offset="50%"  stopColor="#fde080" stopOpacity="0.95" />
          <stop offset="58%"  stopColor="#f0c040" stopOpacity="0.88" />
          <stop offset="72%"  stopColor="#d4a020" stopOpacity="0.70" />
          <stop offset="88%"  stopColor="#b07800" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7a5800" stopOpacity="0"    />
        </linearGradient>
        {/* XZ-plane ring — vertical gradient: opaque at equatorial crossings, fades at poles */}
        <linearGradient id={`${id}-disk-v`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="#7a5800" stopOpacity="0"    />
          <stop offset="15%"  stopColor="#b07800" stopOpacity="0.40" />
          <stop offset="32%"  stopColor="#d4a020" stopOpacity="0.68" />
          <stop offset="46%"  stopColor="#f0c040" stopOpacity="0.88" />
          <stop offset="50%"  stopColor="#fde080" stopOpacity="0.95" />
          <stop offset="54%"  stopColor="#f0c040" stopOpacity="0.88" />
          <stop offset="68%"  stopColor="#d4a020" stopOpacity="0.68" />
          <stop offset="85%"  stopColor="#b07800" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#7a5800" stopOpacity="0"    />
        </linearGradient>
        {/* Inner disk: bright gold-white core closest to event horizon */}
        <linearGradient id={`${id}-disk-inner`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%"   stopColor="#c89020" stopOpacity="0"    />
          <stop offset="20%"  stopColor="#f0cc50" stopOpacity="0.60" />
          <stop offset="50%"  stopColor="#fff8d0" stopOpacity="0.92" />
          <stop offset="80%"  stopColor="#f0cc50" stopOpacity="0.60" />
          <stop offset="100%" stopColor="#c89020" stopOpacity="0"    />
        </linearGradient>
        {/* Lensed arc: golden glow for the gravitationally bent far-side image */}
        <linearGradient id={`${id}-disk-lens`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%"   stopColor="#8a6400" stopOpacity="0"    />
          <stop offset="30%"  stopColor="#d4a020" stopOpacity="0.80" />
          <stop offset="50%"  stopColor="#f8d860" stopOpacity="0.95" />
          <stop offset="70%"  stopColor="#d4a020" stopOpacity="0.80" />
          <stop offset="100%" stopColor="#8a6400" stopOpacity="0"    />
        </linearGradient>
        <filter id={`${id}-satbranchglow`} x="-400%" y="-400%" width="900%" height="900%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={`${id}-bhblur`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id={`${id}-diskblur`} x="-100%" y="-500%" width="300%" height="1100%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
        <filter id={`${id}-galblur`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        {/* 2D flat corona — golden ring glow at the event horizon edge */}
        <radialGradient id={`${id}-corona`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#f0c040" stopOpacity="0"    />
          <stop offset="48%"  stopColor="#f0c040" stopOpacity="0"    />
          <stop offset="62%"  stopColor="#f8d040" stopOpacity="0.85" />
          <stop offset="75%"  stopColor="#e0a820" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#b07800" stopOpacity="0"    />
        </radialGradient>
        {/* Saturn-ring disk — clips for front/back z-split */}
        <clipPath id={`${id}-disk-back`}>
          <rect x="0" y="0" width="70" height="52" />
        </clipPath>
        <clipPath id={`${id}-disk-front`}>
          <rect x="0" y="52" width="70" height="48" />
        </clipPath>
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

      {/* Distant galaxy smudges */}
      {([
        [8,  14, 5,  1.8,  15],
        [62, 29, 4,  1.5, -22],
        [9,  73, 6,  2.2,  30],
        [63, 83, 4,  1.5, -14],
        [40,  4, 3.5, 1.4,   5],
      ] as [number,number,number,number,number][]).map(([x,y,rx,ry,rot], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry}
          fill="#8090ff" opacity="0.055"
          transform={`rotate(${rot} ${x} ${y})`}
          filter={`url(#${id}-galblur)`} />
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
      <text x="36.5" y="15" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="4.5" fill={GOLD2} opacity="0.65" letterSpacing="3">III</text>
      <line x1="28" y1="16.5" x2="42" y2="16.5"
        stroke={GOLD3} strokeWidth="0.38" strokeOpacity="0.48" />

      {/* Pentagon edge connectors removed — avoided crossing through star systems */}

      {/* Branch spurs — cubic bezier forking from the exact arm start point.
           ax/ay IS the arm start, so the spur and the arm share the same origin.
           Two control points (q1, q2) give an S-curve that leaves the junction
           tangentially and approaches the satellite from a natural direction. */}
      {satellites.map(({ cx, cy, ax, ay, qx, qy, q2x, q2y, col }, i) => {
        const d = `M ${ax} ${ay} C ${qx} ${qy} ${q2x} ${q2y} ${cx} ${cy}`;
        return (
          <g key={i}>
            {/* Glow under-stroke */}
            <path d={d} fill="none"
              stroke={col} strokeWidth="1.8" strokeOpacity="0.11"
              strokeLinecap="round" filter={`url(#${id}-aglow)`} />
            {/* Bright core stroke */}
            <path d={d} fill="none"
              stroke={col} strokeWidth="0.52" strokeOpacity="0.40"
              strokeLinecap="round" />
            {/* Fork node — marks the bifurcation at the arm start */}
            <circle cx={ax} cy={ay} r="0.60"
              fill="#0a0818" stroke={col} strokeWidth="0.30" strokeOpacity="0.85" />
          </g>
        );
      })}

      {/* Secondary star systems — smaller Dyson swarms at branch tips */}
      {satellites.map(({ cx, cy, col }, i) => {
        const SAT_INNER = 2.8;
        const SAT_OUTER = 4.2;
        const tilt = 28 + i * 19;  // unique tilt per satellite
        return (
          <g key={i}>
            {/* Corona bloom */}
            <circle cx={cx} cy={cy} r="3.2"
              fill={col} opacity="0.06"
              filter={`url(#${id}-satbranchglow)`} />
            {/* Inclined outer ring — Dyson swarm at tilt */}
            <ellipse cx={cx} cy={cy} rx={SAT_OUTER} ry={SAT_OUTER * 0.38}
              fill="none" stroke={col}
              strokeWidth="0.22" strokeOpacity="0.28"
              strokeDasharray="1.4 1.8"
              transform={`rotate(${tilt} ${cx} ${cy})`} />
            {/* Inner ring */}
            <circle cx={cx} cy={cy} r={SAT_INNER}
              fill="none" stroke={col}
              strokeWidth="0.18" strokeOpacity="0.20"
              strokeDasharray="1.0 1.2" />
            {/* Satellite dots — 8 on outer ring */}
            {Array.from({ length: 8 }, (_, j) => {
              const ang = (j / 8) * 360 + i * 23;
              const [px, py] = pt(cx, cy, SAT_OUTER, ang);
              return (
                <circle key={j} cx={px} cy={py}
                  r={j % 3 === 0 ? 0.46 : 0.30}
                  fill={col} opacity={j % 3 === 0 ? 0.80 : 0.52} />
              );
            })}
            {/* Star bloom */}
            <circle cx={cx} cy={cy} r="2.2"
              fill={`url(#${id}-sg${satellites[i].parentIdx})`}
              filter={`url(#${id}-satbranchglow)`} opacity="0.44" />
            {/* Star core */}
            <circle cx={cx} cy={cy} r="1.1"
              fill={`url(#${id}-sg${satellites[i].parentIdx})`} />
            {/* Mini cross-flare */}
            <line x1={cx - 2} y1={cy} x2={cx + 2} y2={cy}
              stroke="#fff8e0" strokeWidth="0.24" strokeOpacity="0.42" />
            <line x1={cx} y1={cy - 2} x2={cx} y2={cy + 2}
              stroke="#fff8e0" strokeWidth="0.24" strokeOpacity="0.38" />
          </g>
        );
      })}

      {/* Clockwise spiral arms — each system spirals into the singularity.
           Arms tuned to the new free-form system positions to avoid crossing. */}
      {/* Arms curve inward directly from each system — no outward swing into neighbour territory */}
      {([
        `M 35 34 C 35 40 35 47 35 52`,   // R: straight down to hub
        `M 52 46 C 48 48 41 51 35 52`,   // C: gentle curve left-down
        `M 46 67 C 43 62 39 57 35 52`,   // V: curves up-left
        `M 24 67 C 27 62 31 57 35 52`,   // F: curves right-up
        `M 18 46 C 22 48 29 51 35 52`,   // A: gentle curve right-down
      ] as string[]).map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={systems[i].col}
            strokeWidth="2.2" strokeOpacity="0.10" strokeLinecap="round"
            filter={`url(#${id}-aglow)`} />
          <path d={d} fill="none" stroke={systems[i].col}
            strokeWidth="0.6" strokeOpacity="0.42" strokeLinecap="round" />
        </g>
      ))}

      {/* Singularity — outer accretion glow */}
      <circle cx={HUB_X} cy={HUB_Y} r="10"
        fill={`url(#${id}-accglow)`} opacity="0.55"
        filter={`url(#${id}-bhblur)`} />

      {/* ── Five affinity star systems ── */}
      {systems.map(({ cx, cy, col }, si) => {
        // Inner ring: 4 arcs, 62° span, 90° step, offset varies per system
        const pOff = -90 + si * 18;

        return (
          <g key={si}>
            {/* Corona bloom */}
            <circle cx={cx} cy={cy} r="5.5"
              fill={col} opacity="0.07"
              filter={`url(#${id}-sglow)`} />

            {/* Dashed guide rings */}
            <circle cx={cx} cy={cy} r={INNER_R}
              fill="none" stroke={col} strokeWidth="0.2"
              strokeOpacity="0.18" strokeDasharray="1 1.3" />
            {/* Outer ring — flat equatorial orbit */}
            <circle cx={cx} cy={cy} r={OUTER_R}
              fill="none" stroke={col} strokeWidth="0.18"
              strokeOpacity="0.18" strokeDasharray="1.5 2" />

            {/* Outer swarm — 16 independent satellite particles */}
            {Array.from({ length: 16 }, (_, i) => {
              const ang = (i / 16) * 360 + pOff + Math.sin(i * 1.9) * 11;
              const rad = OUTER_R + Math.sin(i * 2.4) * 0.55;
              const [px, py] = pt(cx, cy, rad, ang);
              return i % 4 === 0
                ? <circle key={i} cx={px} cy={py} r="0.58"
                    fill="#070510" stroke={GOLD3} strokeWidth="0.22" strokeOpacity="0.75" />
                : <circle key={i} cx={px} cy={py} r="0.42"
                    fill={col} opacity={0.55 + (i % 3) * 0.12} />;
            })}

            {/* Inner swarm — 12 independent satellite particles */}
            {Array.from({ length: 12 }, (_, i) => {
              const ang = (i / 12) * 360 + pOff + Math.sin(i * 2.1) * 12;
              const rad = INNER_R + Math.sin(i * 1.8) * 0.45;
              const [px, py] = pt(cx, cy, rad, ang);
              return (
                <circle key={i} cx={px} cy={py} r="0.36"
                  fill={col} opacity={0.62 + (i % 3) * 0.10} />
              );
            })}

            {/* Radial energy beams from star surface */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const [bx, by] = pt(cx, cy, 3.5, deg + pOff);
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

      {/* ── Singularity — five z-ordered layers ──────────────────────────
           1. Jets
           2. Far-side disk (behind BH)
           3. Black event horizon
           4. 2D flat corona (ring glow around BH edge, in front of BH)
           5. Near-side Saturn ring (crosses face of BH, bright centre → fades)
          ──────────────────────────────────────────────────────────────── */}

      {/* 1. Jets */}
      <line x1={HUB_X} y1={HUB_Y - 3.5} x2={HUB_X} y2={HUB_Y - 10}
        stroke="#a0e4ff" strokeWidth="1.0" strokeOpacity="0.18"
        strokeLinecap="round" filter={`url(#${id}-bhblur)`} />
      <line x1={HUB_X} y1={HUB_Y - 3.5} x2={HUB_X} y2={HUB_Y - 10}
        stroke="#d0f0ff" strokeWidth="0.35" strokeOpacity="0.28" strokeLinecap="round" />
      <line x1={HUB_X} y1={HUB_Y + 3.5} x2={HUB_X} y2={HUB_Y + 10}
        stroke="#a0e4ff" strokeWidth="0.8" strokeOpacity="0.12"
        strokeLinecap="round" filter={`url(#${id}-bhblur)`} />
      <line x1={HUB_X} y1={HUB_Y + 3.5} x2={HUB_X} y2={HUB_Y + 10}
        stroke="#d0f0ff" strokeWidth="0.30" strokeOpacity="0.18" strokeLinecap="round" />

      {/* 2. Far-side XY disk — goes behind BH (top half, dimmer) */}
      <ellipse cx={HUB_X} cy={HUB_Y} rx="9.5" ry="2.4"
        fill={`url(#${id}-disk)`} opacity="0.55"
        filter={`url(#${id}-diskblur)`}
        clipPath={`url(#${id}-disk-back)`} />
      <ellipse cx={HUB_X} cy={HUB_Y} rx="6.0" ry="1.4"
        fill={`url(#${id}-disk-inner)`} opacity="0.60"
        filter={`url(#${id}-diskblur)`}
        clipPath={`url(#${id}-disk-back)`} />

      {/* (XZ ring drawn after corona — see below) */}

      {/* 3. Event horizon — pure black circle */}
      <circle cx={HUB_X} cy={HUB_Y} r="3.3" fill="#000000" />

      {/* 4. 2D flat corona — golden ring that glows around the BH edge,
              completely surrounding it as a 2D halo */}
      {/* Soft outer halo */}
      <circle cx={HUB_X} cy={HUB_Y} r="7.5"
        fill={`url(#${id}-corona)`}
        filter={`url(#${id}-bhblur)`} opacity="0.70" />
      {/* Sharper inner corona ring */}
      <circle cx={HUB_X} cy={HUB_Y} r="5.8"
        fill={`url(#${id}-corona)`} opacity="0.90" />

      {/* 5. Saturn-ring near-side — stroked bottom arc only.
              SVG ellipses start at the rightmost point and draw clockwise,
              so the first half of the stroke IS the bottom (near-side) arc.
              strokeDasharray="20.5 100" draws ~half the circumference then
              skips the rest — no clipPath, no hard horizontal cutoff.
              strokeLinecap="round" gives naturally tapered endpoints.
              The linear gradient (transparent→gold→transparent) fades the
              arc from opaque at centre to transparent at the tips. */}
      {/* Outer soft glow halo */}
      <ellipse cx={HUB_X} cy={HUB_Y} rx="9.5" ry="2.4"
        fill="none" stroke={`url(#${id}-disk)`}
        strokeWidth="6.0" strokeOpacity="0.42"
        strokeDasharray="20.5 100" strokeLinecap="round"
        filter={`url(#${id}-bhblur)`} />
      {/* Main bright arc band */}
      <ellipse cx={HUB_X} cy={HUB_Y} rx="9.5" ry="2.4"
        fill="none" stroke={`url(#${id}-disk)`}
        strokeWidth="2.6" strokeOpacity="0.95"
        strokeDasharray="20.5 100" strokeLinecap="round"
        filter={`url(#${id}-diskblur)`} />
      {/* Bright white-gold inner core line */}
      <ellipse cx={HUB_X} cy={HUB_Y} rx="9.5" ry="2.4"
        fill="none" stroke={`url(#${id}-disk-inner)`}
        strokeWidth="0.9" strokeOpacity="1.0"
        strokeDasharray="20.5 100" strokeLinecap="round"
        filter={`url(#${id}-diskblur)`} />

      {/* 5b. XZ ring — full great circle, no dasharray needed.
               The ring's minimum distance to the BH centre (≈9.2) is far larger
               than the BH radius (3.3), so it never overlaps the black circle
               and needs no front/back split.
               disk-v gradient: opaque at y=52 (left/right equatorial flanks),
               transparent at poles (y≈42.8 top, y≈61.2 bottom).
               The full stroke is visible at the flanks and fades naturally
               at the top and bottom arcs. */}
      {/* Soft outer glow */}
      <ellipse cx={HUB_X} cy={HUB_Y} rx="9.5" ry="9.2"
        fill="none" stroke={`url(#${id}-disk-v)`}
        strokeWidth="5.5" strokeOpacity="0.30"
        filter={`url(#${id}-bhblur)`} />
      {/* Main ring line */}
      <ellipse cx={HUB_X} cy={HUB_Y} rx="9.5" ry="9.2"
        fill="none" stroke={`url(#${id}-disk-v)`}
        strokeWidth="1.8" strokeOpacity="0.80"
        filter={`url(#${id}-diskblur)`} />
      {/* Inner bright core */}
      <ellipse cx={HUB_X} cy={HUB_Y} rx="9.5" ry="9.2"
        fill="none" stroke={`url(#${id}-disk-v)`}
        strokeWidth="0.65" strokeOpacity="0.92"
        filter={`url(#${id}-diskblur)`} />

      {/* Luminae wordmark */}
      <text x="35" y="89.5" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="3.8" fill={GOLD} opacity="0.60" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}
