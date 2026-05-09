
// ── ArtifactCardBack ─────────────────────────────────────────────────────────
// Three-tier SVG card backs — Kardashev civilization-scale motifs:
//
// Tier 1 — Type I Planetary:  world-energy grid over a single planet
// Tier 2 — Type II Stellar:   Dyson-swarm collector ring around a star
// Tier 3 — Type III Galactic: star-lane network across a spiral galaxy
//
// Shared: escalating border complexity, five affinity accent colors at low
// opacity (universal, not implying card affinity), premium dark-space aesthetic.
// No humanoids · no characters · no card data revealed.
// ─────────────────────────────────────────────────────────────────────────────

const F  = '#ef4444'; // Flare     (ruby)
const C  = '#3b82f6'; // Continuum (sapphire)
const V  = '#22c55e'; // Verdance  (emerald)
const A  = '#a855f7'; // Abyss     (onyx)
const R  = '#e2e8f0'; // Radiance  (pearl)
const AFFINITY_RING = [F, C, V, A, R] as const;

const GOLD  = '#c4a85a';
const GOLD2 = '#ead68c';
const GOLD3 = '#7a6030';
const BG_DEEP = '#030509';
const BG_MID  = '#08091a';

const toRad = (d: number) => (d * Math.PI) / 180;


// ── Tier 1: Type I Planetary Civilization ────────────────────────────────────
// A single planet with a world-energy grid — latitude/longitude lines forming
// a planetary infrastructure network. Five affinity nodes mark key grid
// intersections connected by surface energy conduits.
export function CardBackTier1({ count }: { count?: number }) {
  const id = 't1cb';

  // Planet center & radius
  const PX = 35, PY = 54, PR = 13;

  // Five affinity nodes — pentagon on the planet surface, all within radius
  // (distance from PX,PY shown for verification — all < PR=13)
  const nodes: [number, number, string][] = [
    [35, 43, F],  // top     — d=11  — Flare
    [44, 50, C],  // NE      — d≈9.8 — Continuum
    [41, 61, V],  // SE      — d≈8.5 — Verdance
    [29, 61, A],  // SW      — d≈8.5 — Abyss
    [26, 50, R],  // NW      — d≈9.8 — Radiance
  ];

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        {/* Deep space background */}
        <radialGradient id={`${id}-bg`} cx="50%" cy="52%" r="60%">
          <stop offset="0%"   stopColor="#0a0e20" />
          <stop offset="55%"  stopColor={BG_MID}  />
          <stop offset="100%" stopColor={BG_DEEP} />
        </radialGradient>

        {/* Planet fill — dark ocean-world */}
        <radialGradient id={`${id}-planet`} cx="38%" cy="35%" r="70%">
          <stop offset="0%"   stopColor="#1a3060" />
          <stop offset="40%"  stopColor="#0e2048" />
          <stop offset="80%"  stopColor="#081428" />
          <stop offset="100%" stopColor="#040c18" />
        </radialGradient>

        {/* Terminator shadow — left-side darkening */}
        <radialGradient id={`${id}-shadow`} cx="20%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="#000010" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#000010" stopOpacity="0"   />
        </radialGradient>

        {/* Atmospheric glow ring */}
        <radialGradient id={`${id}-atmo`} cx="50%" cy="50%" r="50%">
          <stop offset="75%"  stopColor="#2860c0" stopOpacity="0"   />
          <stop offset="88%"  stopColor="#4080e0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6090ff" stopOpacity="0"   />
        </radialGradient>

        {/* Grid line colour for planet surface */}
        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.7" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"   />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5" />
        </linearGradient>

        {/* Clip planet surface elements to the sphere */}
        <clipPath id={`${id}-clip`}>
          <circle cx={PX} cy={PY} r={PR} />
        </clipPath>
      </defs>

      {/* ── Background ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Sparse starfield */}
      {[
        [8,7],[60,11],[18,19],[56,24],[11,32],[64,38],
        [7,62],[66,57],[19,74],[57,79],[10,87],[63,91],
      ].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.38 : 0.22}
          fill="#fff" opacity={0.15 + (i % 4) * 0.06} />
      ))}

      {/* ── Border — T1: single L-corner ── */}
      <rect x="4" y="4" width="62" height="92" rx="1.5"
        fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.7" />
      <rect x="6.5" y="6.5" width="57" height="87" rx="0.8"
        fill="none" stroke={GOLD3} strokeWidth="0.28" strokeOpacity="0.45" />

      {/* Corner L-shapes */}
      <path d="M4 15 L4 4 L15 4"   fill="none" stroke={GOLD2} strokeWidth="1.2" strokeLinecap="square" />
      <path d="M55 4 L66 4 L66 15" fill="none" stroke={GOLD2} strokeWidth="1.2" strokeLinecap="square" />
      <path d="M4 85 L4 96 L15 96" fill="none" stroke={GOLD2} strokeWidth="1.2" strokeLinecap="square" />
      <path d="M55 96 L66 96 L66 85" fill="none" stroke={GOLD2} strokeWidth="1.2" strokeLinecap="square" />

      {/* Corner dots */}
      {([[4,4],[66,4],[4,96],[66,96]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill={GOLD} opacity="0.8" />
      ))}

      {/* Single mid-edge tick per side */}
      <line x1="35" y1="4"  x2="35" y2="7"  stroke={GOLD} strokeWidth="0.6" />
      <line x1="35" y1="96" x2="35" y2="93" stroke={GOLD} strokeWidth="0.6" />
      <line x1="4"  y1="50" x2="7"  y2="50" stroke={GOLD} strokeWidth="0.6" />
      <line x1="66" y1="50" x2="63" y2="50" stroke={GOLD} strokeWidth="0.6" />

      {/* ── Tier symbol "I" ── */}
      <text x="35" y="21" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="7.5" fill={GOLD2} opacity="0.88" letterSpacing="0.5">I</text>
      <line x1="31" y1="23" x2="39" y2="23"
        stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.6" />

      {/* ── Planet: atmosphere halo (drawn behind sphere) ── */}
      <circle cx={PX} cy={PY} r={PR + 2.5}
        fill={`url(#${id}-atmo)`} />

      {/* ── Planet sphere fill ── */}
      <circle cx={PX} cy={PY} r={PR}
        fill={`url(#${id}-planet)`} />

      {/* ── World-grid lines, clipped to planet ── */}
      <g clipPath={`url(#${id}-clip)`}
        fill="none" stroke="#3060a0" strokeWidth="0.45" strokeOpacity="0.5">
        {/* Latitude parallels — 4 horizontal */}
        <line x1={PX - PR} y1={PY - 7} x2={PX + PR} y2={PY - 7} />
        <line x1={PX - PR} y1={PY}     x2={PX + PR} y2={PY}     />
        <line x1={PX - PR} y1={PY + 7} x2={PX + PR} y2={PY + 7} />
        {/* Longitude meridians — 4 vertical */}
        <line x1={PX - 8} y1={PY - PR} x2={PX - 8} y2={PY + PR} />
        <line x1={PX}     y1={PY - PR} x2={PX}     y2={PY + PR} />
        <line x1={PX + 8} y1={PY - PR} x2={PX + 8} y2={PY + PR} />
        {/* Two diagonal grid braces (polar cap lines) */}
        <line x1={PX - 5} y1={PY - 11} x2={PX + 5} y2={PY - 11} strokeOpacity="0.3" />
        <line x1={PX - 5} y1={PY + 11} x2={PX + 5} y2={PY + 11} strokeOpacity="0.3" />
      </g>

      {/* ── Terminator shadow (night side) ── */}
      <circle cx={PX} cy={PY} r={PR}
        fill={`url(#${id}-shadow)`} />

      {/* ── Planet outline edge ── */}
      <circle cx={PX} cy={PY} r={PR}
        fill="none" stroke="#4070c0" strokeWidth="0.4" strokeOpacity="0.5" />

      {/* ── Surface energy network — lines between affinity nodes ── */}
      {/* Pentagon ring connections (adjacent nodes) */}
      {nodes.map(([x1,y1], i) => {
        const [x2,y2] = nodes[(i + 1) % 5];
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#5080c0" strokeWidth="0.4" strokeOpacity="0.55"
            clipPath={`url(#${id}-clip)`} />
        );
      })}
      {/* Hub spokes from equatorial center to each node */}
      {nodes.map(([x,y], i) => (
        <line key={`s${i}`} x1={PX} y1={PY} x2={x} y2={y}
          stroke="#3055a0" strokeWidth="0.3" strokeOpacity="0.4"
          clipPath={`url(#${id}-clip)`} />
      ))}

      {/* ── Five affinity surface nodes ── */}
      {nodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2.8" fill={col as string} opacity="0.07" />
          <circle cx={x} cy={y} r="1.2" fill={col as string} opacity="0.5"  />
          <circle cx={x} cy={y} r="0.5" fill="#fff"          opacity="0.7"  />
        </g>
      ))}

      {/* ── Luminae wordmark ── */}
      <text x="35" y="90" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="4" fill={GOLD} opacity="0.4" letterSpacing="2.5">LUMINAE</text>

      {count !== undefined && (
        <text x="62" y="93" textAnchor="end" fontFamily="monospace"
          fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>
      )}
    </svg>
  );
}


// ── Tier 2: Type II Stellar Civilization ─────────────────────────────────────
// A star-harvesting megastructure: five Dyson collector arcs orbit a stellar
// core, gathering radiant energy via five affinity-colored capture segments.
// Structural struts anchor the ring to an outer frame.
export function CardBackTier2({ count }: { count?: number }) {
  const id = 't2cb';
  const CX = 35, CY = 54; // star center
  const RING_R  = 18;     // Dyson collector ring radius
  const OUTER_R = 22;     // structural outer reference ring

  // 5 Dyson arc segments — 56° each, 16° gap
  const arcData = AFFINITY_RING.map((col, i) => {
    const startDeg = i * 72 - 90;
    const endDeg   = startDeg + 56;
    const midDeg   = startDeg + 28;
    const x1 = CX + RING_R * Math.cos(toRad(startDeg));
    const y1 = CY + RING_R * Math.sin(toRad(startDeg));
    const x2 = CX + RING_R * Math.cos(toRad(endDeg));
    const y2 = CY + RING_R * Math.sin(toRad(endDeg));
    const mx = CX + RING_R * Math.cos(toRad(midDeg));
    const my = CY + RING_R * Math.sin(toRad(midDeg));
    // Outer structural ring anchor (for struts)
    const ox = CX + OUTER_R * Math.cos(toRad(midDeg));
    const oy = CY + OUTER_R * Math.sin(toRad(midDeg));
    return { col, x1, y1, x2, y2, mx, my, ox, oy };
  });

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="65%">
          <stop offset="0%"   stopColor="#0c1028" />
          <stop offset="55%"  stopColor={BG_MID}  />
          <stop offset="100%" stopColor={BG_DEEP} />
        </radialGradient>

        {/* Stellar core — hot white-yellow to deep amber to void */}
        <radialGradient id={`${id}-star`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fffbe0" stopOpacity="1"   />
          <stop offset="20%"  stopColor="#ffe080" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="#c86020" stopOpacity="0.5" />
          <stop offset="80%"  stopColor="#601008" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#200400" stopOpacity="0"   />
        </radialGradient>

        {/* Star corona bloom */}
        <radialGradient id={`${id}-corona`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff8c0" stopOpacity="0.6" />
          <stop offset="40%"  stopColor="#ffa030" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#ff6010" stopOpacity="0"   />
        </radialGradient>

        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.85" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"    />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5"  />
        </linearGradient>

        <filter id={`${id}-starglow`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id={`${id}-nodeglow`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* ── Background ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Slightly denser starfield near a star system */}
      {[
        [7,7],[61,10],[17,17],[53,21],[11,31],[65,36],
        [6,56],[66,61],[16,73],[58,76],[9,85],[63,91],
        [28,9],[46,8],[38,93],[24,91],[15,45],[57,47],
      ].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 0.42 : 0.24}
          fill="#fff" opacity={0.13 + (i % 5) * 0.05} />
      ))}

      {/* ── Border — T2: double L-corner ── */}
      <rect x="3.5" y="3.5" width="63" height="93" rx="1.5"
        fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.8" />
      <rect x="5.5" y="5.5" width="59" height="89" rx="1"
        fill="none" stroke={GOLD3} strokeWidth="0.32" strokeOpacity="0.5" />

      {/* Double L-corners */}
      {[
        // TL outer, TL inner
        ["M3.5 16 L3.5 3.5 L16 3.5", "M7 14 L7 7 L14 7"],
        // TR outer, TR inner
        ["M54 3.5 L66.5 3.5 L66.5 16", "M56 7 L63 7 L63 14"],
        // BL outer, BL inner
        ["M3.5 84 L3.5 96.5 L16 96.5", "M7 86 L7 93 L14 93"],
        // BR outer, BR inner
        ["M54 96.5 L66.5 96.5 L66.5 84", "M56 93 L63 93 L63 86"],
      ].map(([outer, inner], i) => (
        <g key={i}>
          <path d={outer} fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square" />
          <path d={inner} fill="none" stroke={GOLD}  strokeWidth="0.58" strokeLinecap="square" />
        </g>
      ))}

      {/* Corner dots */}
      {([[3.5,3.5],[66.5,3.5],[3.5,96.5],[66.5,96.5]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.35" fill={GOLD} opacity="0.9" />
      ))}

      {/* Three mid-edge ticks per long side, two per short */}
      <line x1="26" y1="3.5" x2="26" y2="7"  stroke={GOLD} strokeWidth="0.55" />
      <line x1="35" y1="3.5" x2="35" y2="8"  stroke={GOLD} strokeWidth="0.85" />
      <line x1="44" y1="3.5" x2="44" y2="7"  stroke={GOLD} strokeWidth="0.55" />
      <line x1="26" y1="96.5" x2="26" y2="93" stroke={GOLD} strokeWidth="0.55" />
      <line x1="35" y1="96.5" x2="35" y2="92" stroke={GOLD} strokeWidth="0.85" />
      <line x1="44" y1="96.5" x2="44" y2="93" stroke={GOLD} strokeWidth="0.55" />
      <line x1="3.5" y1="40" x2="7"  y2="40" stroke={GOLD} strokeWidth="0.55" />
      <line x1="3.5" y1="50" x2="8"  y2="50" stroke={GOLD} strokeWidth="0.85" />
      <line x1="3.5" y1="60" x2="7"  y2="60" stroke={GOLD} strokeWidth="0.55" />
      <line x1="66.5" y1="40" x2="63" y2="40" stroke={GOLD} strokeWidth="0.55" />
      <line x1="66.5" y1="50" x2="62" y2="50" stroke={GOLD} strokeWidth="0.85" />
      <line x1="66.5" y1="60" x2="63" y2="60" stroke={GOLD} strokeWidth="0.55" />

      {/* ── Tier symbol "II" ── */}
      <text x="35" y="21" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="7.5" fill={GOLD2} opacity="0.9" letterSpacing="3">II</text>
      <line x1="29" y1="23" x2="41" y2="23"
        stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.65" />

      {/* ── Outer structural reference ring (faint) ── */}
      <circle cx={CX} cy={CY} r={OUTER_R}
        fill="none" stroke={GOLD3} strokeWidth="0.35" strokeOpacity="0.35"
        strokeDasharray="2 2" />

      {/* ── Structural struts from Dyson ring to outer reference ring ── */}
      {arcData.map(({ mx, my, ox, oy, col }, i) => (
        <line key={i} x1={mx} y1={my} x2={ox} y2={oy}
          stroke={GOLD3} strokeWidth="0.45" strokeOpacity="0.5" />
      ))}

      {/* ── Energy beams from stellar core to each collector midpoint ── */}
      {arcData.map(({ col, mx, my }, i) => (
        <line key={i} x1={CX} y1={CY} x2={mx} y2={my}
          stroke={col} strokeWidth="0.5" strokeOpacity="0.3" />
      ))}

      {/* ── Five Dyson collector arc segments ── */}
      {arcData.map(({ col, x1, y1, x2, y2 }, i) => (
        <g key={i}>
          {/* Glow pass */}
          <path d={`M ${x1} ${y1} A ${RING_R} ${RING_R} 0 0 1 ${x2} ${y2}`}
            fill="none" stroke={col} strokeWidth="3.5" strokeOpacity="0.12"
            strokeLinecap="round" filter={`url(#${id}-nodeglow)`} />
          {/* Main arc */}
          <path d={`M ${x1} ${y1} A ${RING_R} ${RING_R} 0 0 1 ${x2} ${y2}`}
            fill="none" stroke={col} strokeWidth="1.4" strokeOpacity="0.65"
            strokeLinecap="round" />
          {/* Inner highlight */}
          <path d={`M ${x1} ${y1} A ${RING_R} ${RING_R} 0 0 1 ${x2} ${y2}`}
            fill="none" stroke="#fff" strokeWidth="0.4" strokeOpacity="0.2"
            strokeLinecap="round" />
        </g>
      ))}

      {/* ── Collector node caps (small squares at arc endpoints) ── */}
      {arcData.map(({ col, x1, y1, x2, y2 }, i) => (
        <g key={i}>
          <circle cx={x1} cy={y1} r="1.0" fill="#0a1030" stroke={GOLD3} strokeWidth="0.35" />
          <circle cx={x2} cy={y2} r="1.0" fill="#0a1030" stroke={GOLD3} strokeWidth="0.35" />
        </g>
      ))}

      {/* ── Stellar core bloom (soft layer, rendered under core circle) ── */}
      <circle cx={CX} cy={CY} r="10"
        fill={`url(#${id}-corona)`} />

      {/* ── Star corona glow bloom ── */}
      <circle cx={CX} cy={CY} r="5"
        fill={`url(#${id}-star)`} filter={`url(#${id}-starglow)`} opacity="0.6" />

      {/* ── Star core fill ── */}
      <circle cx={CX} cy={CY} r="4.5" fill={`url(#${id}-star)`} />

      {/* ── Star surface flare cross ── */}
      <line x1={CX-7} y1={CY} x2={CX+7} y2={CY}
        stroke="#ffe0a0" strokeWidth="0.35" strokeOpacity="0.45" />
      <line x1={CX} y1={CY-7} x2={CX} y2={CY+7}
        stroke="#ffe0a0" strokeWidth="0.35" strokeOpacity="0.45" />
      <line x1={CX-4} y1={CY-4} x2={CX+4} y2={CY+4}
        stroke="#ffc060" strokeWidth="0.25" strokeOpacity="0.3" />
      <line x1={CX+4} y1={CY-4} x2={CX-4} y2={CY+4}
        stroke="#ffc060" strokeWidth="0.25" strokeOpacity="0.3" />

      {/* ── Luminae wordmark ── */}
      <text x="35" y="91" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="4" fill={GOLD} opacity="0.4" letterSpacing="2.5">LUMINAE</text>

      {count !== undefined && (
        <text x="62" y="94" textAnchor="end" fontFamily="monospace"
          fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>
      )}
    </svg>
  );
}


// ── Tier 3: Type III Galactic Civilization ────────────────────────────────────
// A galactic-scale star-lane network: four spiral arms emanate from a bright
// galactic core, with civilization nodes at key arm positions connected by
// hyperspace star-lanes. Five affinity colors mark the inhabited nodes.
export function CardBackTier3({ count }: { count?: number }) {
  const id = 't3cb';
  const CX = 35, CY = 54; // galactic core

  // Spiral arm tip positions (4 arms + center node)
  const armNodes: [number, number, string, string][] = [
    [54, 17, F, 'NE'], // NE arm tip — Flare
    [57, 82, C, 'SE'], // SE arm tip — Continuum
    [16, 89, V, 'SW'], // SW arm tip — Verdance
    [13, 27, A, 'NW'], // NW arm tip — Abyss
    [CX, CY, R, 'C' ], // Galactic center — Radiance
  ];

  // Star-lane connections (indices into armNodes)
  const lanes: [number,number][] = [
    [4,0],[4,1],[4,2],[4,3], // center to each arm tip (spokes)
    [0,3], // NE to NW — top arc
    [1,2], // SE to SW — bottom arc
  ];

  return (
    <svg
      viewBox="0 0 70 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    >
      <defs>
        {/* Deepest void — galactic scale */}
        <radialGradient id={`${id}-bg`} cx="50%" cy="52%" r="70%">
          <stop offset="0%"   stopColor="#0e0820" />
          <stop offset="45%"  stopColor="#080618" />
          <stop offset="100%" stopColor="#020308" />
        </radialGradient>

        {/* Galactic disk glow — faint nebular background */}
        <radialGradient id={`${id}-disk`} cx="50%" cy="52%" r="50%">
          <stop offset="0%"   stopColor="#1a1040" stopOpacity="0.9" />
          <stop offset="45%"  stopColor="#100828" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#060418" stopOpacity="0"   />
        </radialGradient>

        {/* Galactic core — bright nucleus */}
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="15%"  stopColor="#e0d0ff" stopOpacity="0.8"  />
          <stop offset="40%"  stopColor="#8060d0" stopOpacity="0.4"  />
          <stop offset="80%"  stopColor="#3020a0" stopOpacity="0.1"  />
          <stop offset="100%" stopColor="#100830" stopOpacity="0"    />
        </radialGradient>

        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={GOLD2} stopOpacity="0.92" />
          <stop offset="50%"  stopColor={GOLD}  stopOpacity="1"    />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.6"  />
        </linearGradient>

        <filter id={`${id}-coreglow`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id={`${id}-armglow`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <filter id={`${id}-nodeglow`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* ── Background void ── */}
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />

      {/* Dense background starfield — galactic scale */}
      {[
        [5,5],[63,8],[18,13],[53,17],[8,26],[66,30],[6,47],[68,52],
        [12,66],[60,69],[7,80],[65,83],[28,6],[46,5],[35,95],[22,91],
        [57,93],[14,48],[59,46],[35,15],[48,30],[20,32],[50,75],[18,72],
        [60,55],[10,57],[38,8],[30,94],[54,38],[16,38],[42,86],[25,75],
      ].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 6 === 0 ? 0.48 : 0.24}
          fill="#fff" opacity={0.1 + (i % 7) * 0.045} />
      ))}

      {/* ── Galactic nebula disk (very faint elliptical background) ── */}
      <ellipse cx={CX} cy={CY} rx="26" ry="30" fill={`url(#${id}-disk)`} />

      {/* ── Border — T3: triple L-corner, most complex ── */}
      <rect x="3"   y="3"   width="64" height="94" rx="2"
        fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.9" />
      <rect x="5"   y="5"   width="60" height="90" rx="1.5"
        fill="none" stroke={GOLD}  strokeWidth="0.32" strokeOpacity="0.48" />
      <rect x="7"   y="7"   width="56" height="86" rx="1"
        fill="none" stroke={GOLD3} strokeWidth="0.22" strokeOpacity="0.32" />

      {/* Triple L-corners (outer / mid / inner) */}
      {([
        // TL
        ["M3 18 L3 3 L18 3",   "M7 15 L7 7 L15 7",   "M9.5 13 L9.5 9.5 L13 9.5"],
        // TR
        ["M52 3 L67 3 L67 18", "M55 7 L63 7 L63 15", "M57 9.5 L60.5 9.5 L60.5 13"],
        // BL
        ["M3 82 L3 97 L18 97", "M7 85 L7 93 L15 93", "M9.5 87 L9.5 90.5 L13 90.5"],
        // BR
        ["M52 97 L67 97 L67 82","M55 93 L63 93 L63 85","M57 90.5 L60.5 90.5 L60.5 87"],
      ] as [string,string,string][]).map(([o,m,n], i) => (
        <g key={i}>
          <path d={o} fill="none" stroke={GOLD2} strokeWidth="1.4"  strokeLinecap="square" />
          <path d={m} fill="none" stroke={GOLD}  strokeWidth="0.62" strokeLinecap="square" />
          <path d={n} fill="none" stroke={GOLD3} strokeWidth="0.38" strokeLinecap="square" />
        </g>
      ))}

      {/* Corner gems */}
      {([[3,3],[67,3],[3,97],[67,97]] as [number,number][]).map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.6" fill={GOLD}  opacity="0.95" />
          <circle cx={x} cy={y} r="0.7" fill={GOLD2} opacity="0.9"  />
        </g>
      ))}

      {/* Dense edge ticks — 5 per long side, 3 per short */}
      {[18,26,35,44,52].map(x => (
        <g key={x}>
          <line x1={x} y1="3"  x2={x} y2={x === 35 ? 9 : 7.5} stroke={GOLD} strokeWidth={x === 35 ? 0.9 : 0.55} />
          <line x1={x} y1="97" x2={x} y2={x === 35 ? 91 : 92.5} stroke={GOLD} strokeWidth={x === 35 ? 0.9 : 0.55} />
        </g>
      ))}
      {[36,50,64].map(y => (
        <g key={y}>
          <line x1="3"  y1={y} x2={y === 50 ? 9 : 7.5} y2={y} stroke={GOLD} strokeWidth={y === 50 ? 0.9 : 0.55} />
          <line x1="67" y1={y} x2={y === 50 ? 61 : 62.5} y2={y} stroke={GOLD} strokeWidth={y === 50 ? 0.9 : 0.55} />
        </g>
      ))}

      {/* ── Tier symbol "III" ── */}
      <text x="35" y="21" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="7.5" fill={GOLD2} opacity="0.92" letterSpacing="4">III</text>
      <line x1="27" y1="23" x2="43" y2="23"
        stroke={GOLD} strokeWidth="0.52" strokeOpacity="0.7" />

      {/* ── Four spiral arms — glow pass then main stroke ── */}
      {/* Each arm: cubic bezier from near-center, curving to its quadrant */}
      {[
        // NE arm (Flare)
        { d: `M ${CX+4} ${CY-3} C 46 38, 56 26, 54 17`, col: F },
        // SE arm (Continuum)
        { d: `M ${CX+4} ${CY+3} C 48 65, 58 74, 57 82`, col: C },
        // SW arm (Verdance)
        { d: `M ${CX-4} ${CY+3} C 24 68, 14 80, 16 89`, col: V },
        // NW arm (Abyss)
        { d: `M ${CX-4} ${CY-3} C 22 40, 14 28, 13 27`, col: A },
      ].map(({ d, col }, i) => (
        <g key={i}>
          {/* Soft arm glow */}
          <path d={d} fill="none" stroke={col} strokeWidth="4"
            strokeOpacity="0.1" strokeLinecap="round"
            filter={`url(#${id}-armglow)`} />
          {/* Arm stellar-dust line */}
          <path d={d} fill="none" stroke={col} strokeWidth="1.2"
            strokeOpacity="0.28" strokeLinecap="round" />
          {/* Bright arm spine */}
          <path d={d} fill="none" stroke="#c0c8f0" strokeWidth="0.4"
            strokeOpacity="0.25" strokeLinecap="round" />
        </g>
      ))}

      {/* ── Star-lane lattice connections ── */}
      {lanes.map(([a, b], i) => {
        const [x1,y1] = armNodes[a];
        const [x2,y2] = armNodes[b];
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={GOLD3} strokeWidth="0.38" strokeOpacity="0.4"
            strokeDasharray="2 1.5" />
        );
      })}

      {/* ── Arm star clusters — small dot groups along each arm ── */}
      {[
        // NE arm clusters
        [44,31],[50,23],[38,42],
        // SE arm clusters
        [46,66],[54,75],[42,60],
        // SW arm clusters
        [26,72],[18,82],[30,64],
        // NW arm clusters
        [24,40],[16,32],[28,48],
      ].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r="0.6"
          fill="#c0c8ff" opacity={0.25 + (i % 3) * 0.08} />
      ))}

      {/* ── Civilization nodes (affinity-colored) ── */}
      {armNodes.map(([x,y,col,key], i) => (
        <g key={key}>
          {/* Halo */}
          <circle cx={x} cy={y} r={i === 4 ? 6 : 3.5}
            fill={col as string} opacity="0.07"
            filter={`url(#${id}-nodeglow)`} />
          {/* Node ring */}
          <circle cx={x} cy={y} r={i === 4 ? 2.2 : 1.5}
            fill="#060418" stroke={col as string} strokeWidth={i === 4 ? 0.6 : 0.5}
            strokeOpacity="0.8" />
          {/* Node fill */}
          <circle cx={x} cy={y} r={i === 4 ? 1.1 : 0.7}
            fill={col as string} opacity={i === 4 ? 0.7 : 0.65} />
          {/* Center highlight */}
          <circle cx={x} cy={y} r="0.3" fill="#ffffff" opacity="0.7" />
        </g>
      ))}

      {/* ── Galactic core bloom ── */}
      <circle cx={CX} cy={CY} r="8"
        fill={`url(#${id}-core)`} filter={`url(#${id}-coreglow)`} opacity="0.5" />
      <circle cx={CX} cy={CY} r="4" fill={`url(#${id}-core)`} />

      {/* Core stellar cross */}
      <line x1={CX-6} y1={CY} x2={CX+6} y2={CY}
        stroke="#e0d8ff" strokeWidth="0.3" strokeOpacity="0.4" />
      <line x1={CX} y1={CY-6} x2={CX} y2={CY+6}
        stroke="#e0d8ff" strokeWidth="0.3" strokeOpacity="0.4" />

      {/* ── Luminae wordmark ── */}
      <text x="35" y="92" textAnchor="middle" fontFamily="Georgia, serif"
        fontSize="4" fill={GOLD} opacity="0.45" letterSpacing="2.5">LUMINAE</text>

      {count !== undefined && (
        <text x="63" y="95" textAnchor="end" fontFamily="monospace"
          fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>
      )}
    </svg>
  );
}
