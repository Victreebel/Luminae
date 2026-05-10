
// Tier II Redesign — Stellar Civilization
// The star is the engine. Four concentric Dyson collector rings harvest its full output.
// The planet is gone — this civilization has left planetary scale behind entirely.
// Redesign: dramatic stellar corona · layered Dyson rings with affinity arcs · double L-brackets · starburst cross-hairs

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
const arcPath = (cx: number, cy: number, r: number, s: number, e: number) => {
  const x1 = cx + r * Math.cos(toRad(s));
  const y1 = cy + r * Math.sin(toRad(s));
  const x2 = cx + r * Math.cos(toRad(e));
  const y2 = cy + r * Math.sin(toRad(e));
  const large = Math.abs(e - s) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

const CX = 35, CY = 54;

const rings = [
  { r: 9,  segs: 5, span: 52, step: 72,  startOff: -90, colors: [F,C,V,A,R] as string[] },
  { r: 15, segs: 5, span: 52, step: 72,  startOff: -54, colors: [V,A,R,F,C] as string[] },
  { r: 21, segs: 5, span: 52, step: 72,  startOff: -18, colors: [C,V,F,R,A] as string[] },
  { r: 27, segs: 4, span: 65, step: 90,  startOff: -60, colors: [A,R,C,F]   as string[] },
];

const stars: [number,number,number][] = [
  [6,6,0.32],[64,9,0.25],[15,16,0.2],[58,20,0.28],[8,32,0.18],[67,37,0.24],
  [5,57,0.2],[68,62,0.28],[14,76,0.22],[60,79,0.3],[7,89,0.18],[65,92,0.24],
  [24,8,0.17],[48,7,0.2],[38,95,0.22],[20,93,0.18],[12,47,0.15],[59,45,0.18],
];

export function Tier2Redesign() {
  return (
    <div className="min-h-screen bg-[#060810] flex items-center justify-center">
      <div style={{ width: 210, height: 300 }}>
        <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
          <defs>
            <radialGradient id="t2r-bg" cx="50%" cy="52%" r="65%">
              <stop offset="0%" stopColor="#160e30" />
              <stop offset="55%" stopColor="#0a091c" />
              <stop offset="100%" stopColor="#030509" />
            </radialGradient>
            <radialGradient id="t2r-star" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffff8" />
              <stop offset="15%" stopColor="#fff4b0" />
              <stop offset="35%" stopColor="#ffb040" />
              <stop offset="65%" stopColor="#c04010" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#500a00" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="t2r-corona" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff8d0" stopOpacity="0.55" />
              <stop offset="25%" stopColor="#ff9020" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#ff4000" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ff2000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="t2r-outer-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff8020" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ff2000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="t2r-bord" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={GOLD2} stopOpacity="0.9" />
              <stop offset="50%" stopColor={GOLD}  stopOpacity="1" />
              <stop offset="100%" stopColor={GOLD3} stopOpacity="0.55" />
            </linearGradient>
            <filter id="t2r-starglow" x="-250%" y="-250%" width="600%" height="600%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <filter id="t2r-arcglow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="0.9" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="70" height="100" fill="url(#t2r-bg)" />

          {/* Stars */}
          {stars.map(([x,y,r],i) => (
            <circle key={i} cx={x} cy={y} r={r}
              fill="#fff" opacity={0.12 + (i%5)*0.055} />
          ))}

          {/* ── BORDER — double L-bracket (stellar tier) ── */}
          <rect x="3" y="3" width="64" height="94" rx="1.5"
            fill="none" stroke="url(#t2r-bord)" strokeWidth="0.82" />
          <rect x="5" y="5" width="60" height="90" rx="0.8"
            fill="none" stroke={GOLD3} strokeWidth="0.3" strokeOpacity="0.45" />

          {/* Outer brackets */}
          <path d="M3 17 L3 3 L17 3"      fill="none" stroke={GOLD2} strokeWidth="1.35" strokeLinecap="square" />
          <path d="M53 3 L67 3 L67 17"    fill="none" stroke={GOLD2} strokeWidth="1.35" strokeLinecap="square" />
          <path d="M3 83 L3 97 L17 97"    fill="none" stroke={GOLD2} strokeWidth="1.35" strokeLinecap="square" />
          <path d="M53 97 L67 97 L67 83"  fill="none" stroke={GOLD2} strokeWidth="1.35" strokeLinecap="square" />
          {/* Inner brackets */}
          <path d="M6.5 14.5 L6.5 6.5 L14.5 6.5"     fill="none" stroke={GOLD}  strokeWidth="0.62" strokeLinecap="square" />
          <path d="M55.5 6.5 L63.5 6.5 L63.5 14.5"    fill="none" stroke={GOLD}  strokeWidth="0.62" strokeLinecap="square" />
          <path d="M6.5 85.5 L6.5 93.5 L14.5 93.5"    fill="none" stroke={GOLD}  strokeWidth="0.62" strokeLinecap="square" />
          <path d="M55.5 93.5 L63.5 93.5 L63.5 85.5"  fill="none" stroke={GOLD}  strokeWidth="0.62" strokeLinecap="square" />

          {/* Corner dots */}
          {([[3,3],[67,3],[3,97],[67,97]] as [number,number][]).map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="1.3" fill={GOLD} opacity="0.88" />
          ))}

          {/* 3-tick mid-edge */}
          {[26,35,44].map(x => (
            <g key={x}>
              <line x1={x} y1="3"  x2={x} y2={x===35?8:7}   stroke={GOLD} strokeWidth={x===35?0.9:0.55} />
              <line x1={x} y1="97" x2={x} y2={x===35?92:93} stroke={GOLD} strokeWidth={x===35?0.9:0.55} />
            </g>
          ))}
          {[40,50,60].map(y => (
            <g key={y}>
              <line x1="3"  y1={y} x2={y===50?8:7}   y2={y} stroke={GOLD} strokeWidth={y===50?0.9:0.55} />
              <line x1="67" y1={y} x2={y===50?62:63} y2={y} stroke={GOLD} strokeWidth={y===50?0.9:0.55} />
            </g>
          ))}

          {/* Tier II label */}
          <text x="35" y="15" textAnchor="middle" fontFamily="Georgia, serif"
            fontSize="5.5" fill={GOLD2} opacity="0.8" letterSpacing="2">II</text>
          <line x1="28.5" y1="16.8" x2="41.5" y2="16.8" stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.5" />

          {/* Extended outer glow */}
          <circle cx={CX} cy={CY} r="32" fill="url(#t2r-outer-glow)" />

          {/* Dyson rings — outermost to innermost (paint order) */}
          {[...rings].reverse().map(({ r, segs, span, step, startOff, colors }, ri) => {
            const origRi = rings.length - 1 - ri;
            return (
              <g key={origRi}>
                {/* Base track */}
                <circle cx={CX} cy={CY} r={r}
                  fill="none" stroke={GOLD3}
                  strokeWidth="0.3" strokeOpacity="0.22" strokeDasharray="1.5 1.8" />

                {Array.from({ length: segs }).map((_, i) => {
                  const s = startOff + i * step;
                  const e = s + span;
                  const col = colors[i % colors.length];
                  const [mx, my] = pt(CX, CY, r, s + span/2);
                  return (
                    <g key={i}>
                      {/* Glow pass */}
                      <path d={arcPath(CX, CY, r, s, e)}
                        fill="none" stroke={col}
                        strokeWidth={origRi <= 1 ? 4 : 3.2}
                        strokeOpacity="0.1" strokeLinecap="round"
                        filter="url(#t2r-arcglow)" />
                      {/* Core arc */}
                      <path d={arcPath(CX, CY, r, s, e)}
                        fill="none" stroke={col}
                        strokeWidth={origRi === 0 ? 1.6 : origRi === 1 ? 1.4 : origRi === 2 ? 1.2 : 1.0}
                        strokeOpacity={origRi === 0 ? 0.82 : origRi === 1 ? 0.75 : origRi === 2 ? 0.68 : 0.6}
                        strokeLinecap="round" />
                      {/* Specular highlight */}
                      <path d={arcPath(CX, CY, r, s, e)}
                        fill="none" stroke="#ffffff"
                        strokeWidth="0.3" strokeOpacity="0.18" strokeLinecap="round" />
                      {/* Collector node */}
                      <circle cx={mx} cy={my} r={origRi <= 1 ? 0.9 : 0.72}
                        fill="#080c28" stroke={GOLD2} strokeWidth="0.32" />
                    </g>
                  );
                })}

                {/* Radial spars connecting to next ring */}
                {origRi < rings.length - 1 && Array.from({ length: 5 }).map((_, i) => {
                  const deg = i * 72 + startOff + span/2;
                  const [x1,y1] = pt(CX, CY, r, deg);
                  const [x2,y2] = pt(CX, CY, rings[origRi+1].r, deg);
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={GOLD3} strokeWidth="0.35" strokeOpacity="0.4" />
                  );
                })}
              </g>
            );
          })}

          {/* Extended corona bloom */}
          <circle cx={CX} cy={CY} r="16" fill="url(#t2r-corona)" />

          {/* Starburst cross-hairs */}
          {[0,45,90,135,180,225,270,315].map((deg,i) => {
            const inner = i%2===0 ? 6 : 7;
            const outer = i%2===0 ? 11 : 9;
            const [x1,y1] = pt(CX,CY,inner,deg);
            const [x2,y2] = pt(CX,CY,outer,deg);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={i%2===0 ? "#fff8c0" : "#ffaa30"}
                strokeWidth={i%2===0 ? 0.45 : 0.28}
                strokeOpacity={i%2===0 ? 0.45 : 0.28} />
            );
          })}

          {/* Star bloom glow */}
          <circle cx={CX} cy={CY} r="9"
            fill="url(#t2r-star)"
            filter="url(#t2r-starglow)" opacity="0.6" />

          {/* Stellar core */}
          <circle cx={CX} cy={CY} r="6" fill="url(#t2r-star)" />
          <circle cx={CX} cy={CY} r="2.5" fill="#fffff8" opacity="0.9" />

          {/* LUMINAE wordmark */}
          <text x="35" y="91.5" textAnchor="middle" fontFamily="Georgia, serif"
            fontSize="3.8" fill={GOLD} opacity="0.3" letterSpacing="2.5">LUMINAE</text>
        </svg>
      </div>
    </div>
  );
}
