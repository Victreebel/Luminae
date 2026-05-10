
// Tier III Redesign — Galactic Civilization
// The card IS the galaxy. Spiral arms reach every corner. 22 civilization nodes
// linked by hyperspace lanes. A blinding Singularity core. Triple L-brackets.
// Redesign: dramatic multi-arm spiral · dense civilization lattice · blinding core bloom · triple border

const F  = '#ef4444';
const C  = '#3b82f6';
const V  = '#22c55e';
const A  = '#a855f7';
const R  = '#e2e8f0';
const S  = '#f0c040'; // Singularity
const GOLD  = '#c4a85a';
const GOLD2 = '#ead68c';
const GOLD3 = '#7a6030';

const toRad = (d: number) => (d * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, deg: number): [number,number] => [
  cx + r * Math.cos(toRad(deg)),
  cy + r * Math.sin(toRad(deg)),
];

const CX = 35, CY = 50;

// Main arm tips — reach all 4 corners
const armTips: [number,number,string][] = [
  [63,  7,  C],  // NE — Continuum
  [64,  91, V],  // SE — Verdance
  [6,   93, F],  // SW — Flare
  [5,   11, R],  // NW — Radiance
];
// Sub-arm tips — reach card edges between corners
const subTips: [number,number,string][] = [
  [67,  42, C],  // E  — Continuum
  [50,  98, V],  // S  — Verdance
  [19,  98, F],  // S  — Flare
  [3,   57, R],  // W  — Radiance
];
// Bar (galactic bar endpoints) — Singularity
const barNodes: [number,number,string][] = [
  [50, 37, S],
  [20, 63, S],
];
// Mid-arm nodes along spiral paths
const midNodes: [number,number,string][] = [
  [52, 25, C],[58, 14, C],  // NE arm
  [54, 72, V],[60, 83, V],  // SE arm
  [17, 76, F],[10, 85, F],  // SW arm
  [17, 27, R],[10, 17, R],  // NW arm
];
const core: [number,number,string] = [CX, CY, S];

const merged: [number,number,string][] = [
  ...armTips,   // 0-3
  ...subTips,   // 4-7
  ...barNodes,  // 8-9
  ...midNodes,  // 10-17
  core,         // 18
];

const lanes: [number,number][] = [
  // Core → bar
  [18,8],[18,9],
  // Core → near-mid
  [18,10],[18,12],[18,14],[18,16],
  // Bar → adjacent near-mid
  [8,10],[8,11],[9,14],[9,15],
  // NE arm chain
  [10,11],[11,0],
  // SE arm chain
  [12,13],[13,1],
  // SW arm chain
  [14,15],[15,2],
  // NW arm chain
  [16,17],[17,3],
  // Sub-arm connections
  [10,4],[0,4],   // NE→E sub
  [12,5],[1,5],   // SE→S sub (V)
  [14,6],[2,6],   // SW→S sub (F)
  [16,7],[3,7],   // NW→W sub
  // Cross-galaxy connectors
  [0,1],[1,2],[2,3],[3,0],   // Corner ring
  [8,9],                      // Bar
  [4,5],[6,7],                // Edge cross
];

const stars70: [number,number,number][] = [
  [6,5,0.32],[63,8,0.28],[16,15,0.2],[57,19,0.28],[8,30,0.18],[67,35,0.25],
  [5,55,0.2],[69,60,0.28],[13,74,0.22],[61,78,0.3],[7,88,0.18],[65,91,0.25],
  [24,7,0.17],[48,6,0.2],[38,94,0.22],[21,92,0.18],[11,45,0.15],[60,44,0.18],
  [30,3,0.15],[42,97,0.2],[18,4,0.18],[53,95,0.15],[7,20,0.18],[64,24,0.2],
  [4,66,0.15],[68,72,0.22],[27,97,0.18],[46,2,0.15],[12,90,0.2],[58,87,0.18],
  [35,6,0.16],[23,13,0.14],[48,13,0.16],[14,35,0.15],[57,33,0.15],
  [9,52,0.15],[62,50,0.16],[20,70,0.14],[51,68,0.15],[33,91,0.14],
];

export function Tier3Redesign() {
  return (
    <div className="min-h-screen bg-[#060810] flex items-center justify-center">
      <div style={{ width: 210, height: 300 }}>
        <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
          <defs>
            <radialGradient id="t3r-bg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1a1030" />
              <stop offset="40%" stopColor="#0e0c22" />
              <stop offset="100%" stopColor="#030509" />
            </radialGradient>
            <radialGradient id="t3r-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffff0" />
              <stop offset="12%" stopColor="#fff8a0" />
              <stop offset="30%" stopColor="#f0c040" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#c08000" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#604000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="t3r-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0c040" stopOpacity="0.22" />
              <stop offset="35%" stopColor="#f08000" stopOpacity="0.1" />
              <stop offset="70%" stopColor="#8040a0" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="t3r-bord" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={GOLD2} stopOpacity="0.95" />
              <stop offset="50%" stopColor={GOLD}  stopOpacity="1" />
              <stop offset="100%" stopColor={GOLD3} stopOpacity="0.6" />
            </linearGradient>
            <filter id="t3r-coreglow" x="-400%" y="-400%" width="900%" height="900%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
            <filter id="t3r-nodeglow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
            <filter id="t3r-laneglow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="70" height="100" fill="url(#t3r-bg)" />

          {/* Dense starfield */}
          {stars70.map(([x,y,r],i)=>(
            <circle key={i} cx={x} cy={y} r={r}
              fill="#fff" opacity={0.1 + (i%6)*0.04} />
          ))}

          {/* ── BORDER — triple L-bracket (galactic tier) ── */}
          <rect x="2.5" y="2.5" width="65" height="95" rx="1.8"
            fill="none" stroke="url(#t3r-bord)" strokeWidth="0.88" />
          <rect x="4.5" y="4.5" width="61" height="91" rx="1.2"
            fill="none" stroke={GOLD} strokeWidth="0.35" strokeOpacity="0.55" />
          <rect x="6.5" y="6.5" width="57" height="87" rx="0.7"
            fill="none" stroke={GOLD3} strokeWidth="0.22" strokeOpacity="0.35" />

          {/* Outer bracket */}
          <path d="M2.5 18 L2.5 2.5 L18 2.5"      fill="none" stroke={GOLD2} strokeWidth="1.45" strokeLinecap="square" />
          <path d="M52 2.5 L67.5 2.5 L67.5 18"    fill="none" stroke={GOLD2} strokeWidth="1.45" strokeLinecap="square" />
          <path d="M2.5 82 L2.5 97.5 L18 97.5"    fill="none" stroke={GOLD2} strokeWidth="1.45" strokeLinecap="square" />
          <path d="M52 97.5 L67.5 97.5 L67.5 82"  fill="none" stroke={GOLD2} strokeWidth="1.45" strokeLinecap="square" />
          {/* Mid bracket */}
          <path d="M5.5 15 L5.5 5.5 L15 5.5"      fill="none" stroke={GOLD}  strokeWidth="0.7"  strokeLinecap="square" />
          <path d="M55 5.5 L64.5 5.5 L64.5 15"    fill="none" stroke={GOLD}  strokeWidth="0.7"  strokeLinecap="square" />
          <path d="M5.5 85 L5.5 94.5 L15 94.5"    fill="none" stroke={GOLD}  strokeWidth="0.7"  strokeLinecap="square" />
          <path d="M55 94.5 L64.5 94.5 L64.5 85"  fill="none" stroke={GOLD}  strokeWidth="0.7"  strokeLinecap="square" />
          {/* Inner bracket */}
          <path d="M8 12.5 L8 8 L12.5 8"          fill="none" stroke={GOLD3} strokeWidth="0.45" strokeLinecap="square" strokeOpacity="0.7" />
          <path d="M57.5 8 L62 8 L62 12.5"        fill="none" stroke={GOLD3} strokeWidth="0.45" strokeLinecap="square" strokeOpacity="0.7" />
          <path d="M8 87.5 L8 92 L12.5 92"        fill="none" stroke={GOLD3} strokeWidth="0.45" strokeLinecap="square" strokeOpacity="0.7" />
          <path d="M57.5 92 L62 92 L62 87.5"      fill="none" stroke={GOLD3} strokeWidth="0.45" strokeLinecap="square" strokeOpacity="0.7" />

          {/* Corner dots */}
          {([[2.5,2.5],[67.5,2.5],[2.5,97.5],[67.5,97.5]] as [number,number][]).map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="1.45" fill={GOLD} opacity="0.9" />
          ))}

          {/* 5-tick mid-edge */}
          {[20,27.5,35,42.5,50].map(x => (
            <g key={x}>
              <line x1={x} y1="2.5"  x2={x} y2={x===35?8.5:7}   stroke={GOLD} strokeWidth={x===35?0.9:0.5} />
              <line x1={x} y1="97.5" x2={x} y2={x===35?91.5:93} stroke={GOLD} strokeWidth={x===35?0.9:0.5} />
            </g>
          ))}
          {[35,45,55,65,75].map(y => (
            <g key={y}>
              <line x1="2.5"  y1={y} x2={y===50?8.5:7}   y2={y} stroke={GOLD} strokeWidth={y===50?0.9:0.5} />
              <line x1="67.5" y1={y} x2={y===50?61.5:63} y2={y} stroke={GOLD} strokeWidth={y===50?0.9:0.5} />
            </g>
          ))}

          {/* Tier III label */}
          <text x="35" y="14" textAnchor="middle" fontFamily="Georgia, serif"
            fontSize="5.5" fill={GOLD2} opacity="0.82" letterSpacing="1.5">III</text>
          <line x1="25" y1="15.8" x2="45" y2="15.8" stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.52" />

          {/* ── GALAXY HALO ── */}
          <circle cx={CX} cy={CY} r="38" fill="url(#t3r-halo)" />

          {/* ── HYPERSPACE LANES (glow pass) ── */}
          {lanes.map(([a,b],i) => {
            const [x1,y1] = merged[a];
            const [x2,y2] = merged[b];
            const col = merged[a][2] as string;
            return (
              <line key={`lg${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={col} strokeWidth="1.5" strokeOpacity="0.07"
                filter="url(#t3r-laneglow)" />
            );
          })}

          {/* ── HYPERSPACE LANES (solid) ── */}
          {lanes.map(([a,b],i) => {
            const [x1,y1] = merged[a];
            const [x2,y2] = merged[b];
            const col = merged[a][2] as string;
            const isMajor = (a===18||b===18||a===8||b===8||a===9||b===9);
            return (
              <line key={`ls${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={col}
                strokeWidth={isMajor ? 0.55 : 0.35}
                strokeOpacity={isMajor ? 0.62 : 0.42} />
            );
          })}

          {/* ── CIVILIZATION NODES ── */}
          {merged.map(([x,y,col],i) => {
            const isCore = i === 18;
            const isBar = i === 8 || i === 9;
            const isArm = i < 4;
            const r = isCore ? 2.8 : isBar ? 1.6 : isArm ? 1.8 : 1.3;
            const rOuter = isCore ? 5.5 : isBar ? 3 : isArm ? 3.5 : 2.5;
            return (
              <g key={i}>
                {/* Glow halo */}
                <circle cx={x} cy={y} r={rOuter} fill={col as string} opacity={isCore?0.18:0.1}
                  filter="url(#t3r-nodeglow)" />
                {/* Node body */}
                <circle cx={x} cy={y} r={r}
                  fill={isCore?"#100808":isBar?"#0a0820":"#060c20"}
                  stroke={col as string}
                  strokeWidth={isCore?0.55:isBar?0.45:0.35}
                  strokeOpacity={isCore?0.95:isBar?0.85:0.72} />
                {/* Inner dot */}
                <circle cx={x} cy={y} r={isCore?1.2:isBar?0.7:0.5}
                  fill={col as string}
                  opacity={isCore?0.9:0.75} />
              </g>
            );
          })}

          {/* ── GALACTIC CORE BLOOM ── */}
          <circle cx={CX} cy={CY} r="12"
            fill="url(#t3r-core)"
            filter="url(#t3r-coreglow)" opacity="0.65" />
          <circle cx={CX} cy={CY} r="5" fill="url(#t3r-core)" />
          <circle cx={CX} cy={CY} r="1.8" fill="#fffff8" opacity="0.95" />

          {/* Core cross-hairs */}
          {[0,45,90,135].map((deg,i)=>{
            const [x1,y1] = pt(CX,CY,3.5,deg);
            const [x2,y2] = pt(CX,CY,8,deg);
            const [x3,y3] = pt(CX,CY,3.5,deg+180);
            const [x4,y4] = pt(CX,CY,8,deg+180);
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#fff8c0" strokeWidth={i%2===0?0.5:0.3} strokeOpacity={i%2===0?0.5:0.3} />
                <line x1={x3} y1={y3} x2={x4} y2={y4}
                  stroke="#fff8c0" strokeWidth={i%2===0?0.5:0.3} strokeOpacity={i%2===0?0.5:0.3} />
              </g>
            );
          })}

          {/* LUMINAE wordmark */}
          <text x="35" y="92.5" textAnchor="middle" fontFamily="Georgia, serif"
            fontSize="3.8" fill={GOLD} opacity="0.32" letterSpacing="2.5">LUMINAE</text>
        </svg>
      </div>
    </div>
  );
}
