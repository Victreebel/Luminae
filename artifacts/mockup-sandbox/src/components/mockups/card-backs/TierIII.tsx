const F  = '#ef4444';
const C  = '#3b82f6';
const V  = '#22c55e';
const A  = '#a855f7';
const R  = '#e2e8f0';
const S  = '#f0c040';
const GOLD  = '#c4a85a';
const GOLD2 = '#ead68c';
const GOLD3 = '#7a6030';

function CardBackTier3({ count: _count }: { count?: number }) {
  const id = 't3cb';
  const CX = 35, CY = 52;
  const armTips: [number,number,string][] = [[62,8,C],[63,90,V],[7,92,F],[6,12,R]];
  const subTips: [number,number,string][] = [[66,42,C],[50,97,V],[18,97,F],[4,58,R]];
  const midNodes: [number,number,string][] = [
    [50,28,C],[57,17,C],[52,71,V],[58,82,V],[18,73,F],[11,83,F],[18,31,R],[11,20,R],
  ];
  const barNodes: [number,number,string][] = [[49,40,S],[21,64,S]];
  const core: [number,number,string] = [CX,CY,S];
  const merged: [number,number,string][] = [...armTips,...subTips,...midNodes,...barNodes,core];
  const lanes: [number,number][] = [
    [18,16],[18,17],[18,8],[18,10],[18,12],[18,14],
    [16,8],[16,9],[17,12],[17,13],
    [8,9],[9,0],[10,11],[11,1],[12,13],[13,2],[14,15],[15,3],
    [9,4],[11,5],[13,6],[15,7],
    [0,1],[1,2],[2,3],[3,0],[0,2],[1,3],
    [4,0],[4,1],[5,1],[6,2],[7,3],[7,0],
    [8,14],[10,12],[9,11],[13,15],
  ];
  const arms = [
    { d: `M ${CX+7} ${CY-6} C 51 38, 59 22, 62  8`,  col: C },
    { d: `M ${CX+7} ${CY+6} C 54 64, 61 78, 63  90`, col: V },
    { d: `M ${CX-7} ${CY+6} C 19 68, 11 80, 7   92`, col: F },
    { d: `M ${CX-7} ${CY-6} C 19 38, 11 24, 6   12`, col: R },
  ];
  const subArms = [
    { d: `M 55 22 C 61 30, 65 36, 66 42`, col: C },
    { d: `M 58 80 C 57 87, 54 93, 50 97`, col: V },
    { d: `M 11 80 C 13 88, 15 93, 18 97`, col: F },
    { d: `M 13 35 C 8  44, 5  51, 4  58`, col: R },
  ];
  const clusters: [number,number][] = [
    [43,43],[47,36],[51,29],[55,22],[58,15],[61,10],[45,39],[50,31],[54,24],[59,17],
    [43,61],[48,68],[52,74],[57,81],[60,87],[62,91],[46,57],[51,66],[55,75],[59,84],
    [27,61],[22,68],[17,74],[12,81],[9,87],[8,91],[30,58],[24,65],[18,72],[12,80],
    [27,43],[22,36],[17,30],[12,22],[9,16],[7,11],[30,47],[24,38],[19,30],[13,21],
    [43,44],[39,47],[35,52],[31,56],[27,59],
  ];
  const stars: [number,number,number,number][] = [
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
    <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0e0618" />
          <stop offset="35%" stopColor="#06040f" />
          <stop offset="100%" stopColor="#010106" />
        </radialGradient>
        <radialGradient id={`${id}-nebula`} cx="50%" cy="52%" r="60%">
          <stop offset="0%" stopColor="#2a0855" stopOpacity="0.88" />
          <stop offset="22%" stopColor="#1a0540" stopOpacity="0.65" />
          <stop offset="50%" stopColor="#0c0325" stopOpacity="0.32" />
          <stop offset="80%" stopColor="#080220" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#020108" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="52%" r="55%">
          <stop offset="40%" stopColor="#3b0080" stopOpacity="0" />
          <stop offset="72%" stopColor="#5010a0" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#3a0888" stopOpacity="0.07" />
        </radialGradient>
        <linearGradient id={`${id}-bar`} x1="30%" y1="35%" x2="70%" y2="65%">
          <stop offset="0%" stopColor={S} stopOpacity="0" />
          <stop offset="20%" stopColor={S} stopOpacity="0.40" />
          <stop offset="50%" stopColor="#fff8c0" stopOpacity="0.72" />
          <stop offset="80%" stopColor={S} stopOpacity="0.40" />
          <stop offset="100%" stopColor={S} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="8%" stopColor="#fff8d0" stopOpacity="0.97" />
          <stop offset="22%" stopColor={S} stopOpacity="0.80" />
          <stop offset="48%" stopColor="#c08010" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#402800" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo1`} cx="50%" cy="50%" r="50%">
          <stop offset="68%" stopColor="#4a0090" stopOpacity="0" />
          <stop offset="82%" stopColor="#6010b8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#7020c8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo2`} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#300068" stopOpacity="0" />
          <stop offset="86%" stopColor="#4a0888" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#580aa0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD2} stopOpacity="0.94" />
          <stop offset="50%" stopColor={GOLD} stopOpacity="1" />
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.6" />
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
      <rect width="70" height="100" fill={`url(#${id}-bg)`} />
      <rect width="70" height="100" fill={`url(#${id}-halo)`} />
      {stars.map(([x,y,sv,ov], i) => (
        <circle key={i} cx={x} cy={y} r={sv >= 7 ? 0.55 : sv >= 4 ? 0.35 : 0.2} fill="#fff" opacity={0.08 + ov * 0.032} />
      ))}
      <ellipse cx="11" cy="37" rx="2.5" ry="1.2" transform="rotate(-25 11 37)" fill="#c0b0ff" opacity="0.05" />
      <ellipse cx="61" cy="30" rx="2" ry="0.9" transform="rotate(20 61 30)" fill="#b0c0ff" opacity="0.04" />
      <ellipse cx="58" cy="88" rx="1.8" ry="0.8" transform="rotate(-15 58 88)" fill="#c0d0ff" opacity="0.04" />
      <ellipse cx={CX} cy={CY} rx="34" ry="40" fill={`url(#${id}-nebula)`} />
      <rect x="3" y="3" width="64" height="94" rx="2" fill="none" stroke={`url(#${id}-bord)`} strokeWidth="0.9" />
      <rect x="5" y="5" width="60" height="90" rx="1.5" fill="none" stroke={GOLD} strokeWidth="0.3" strokeOpacity="0.45" />
      <rect x="7" y="7" width="56" height="86" rx="1" fill="none" stroke={GOLD3} strokeWidth="0.22" strokeOpacity="0.32" />
      {([
        ["M3 19 L3 3 L19 3",    "M7 16 L7 7 L16 7",    "M10 14 L10 10 L14 10"],
        ["M51 3 L67 3 L67 19",  "M54 7 L63 7 L63 16",  "M56 10 L60 10 L60 14"],
        ["M3 81 L3 97 L19 97",  "M7 84 L7 93 L16 93",  "M10 86 L10 90 L14 90"],
        ["M51 97 L67 97 L67 81","M54 93 L63 93 L63 84","M56 90 L60 90 L60 86"],
      ] as [string,string,string][]).map(([o,m,n], i) => (
        <g key={i}>
          <path d={o} fill="none" stroke={GOLD2} strokeWidth="1.45" strokeLinecap="square" />
          <path d={m} fill="none" stroke={GOLD} strokeWidth="0.62" strokeLinecap="square" />
          <path d={n} fill="none" stroke={GOLD3} strokeWidth="0.38" strokeLinecap="square" />
        </g>
      ))}
      {([[3,3],[67,3],[3,97],[67,97]] as [number,number][]).map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.65" fill={GOLD} opacity="0.95" />
          <circle cx={x} cy={y} r="0.7" fill={GOLD2} opacity="0.9" />
        </g>
      ))}
      {[19,27,35,43,51].map(x => (
        <g key={x}>
          <line x1={x} y1="3" x2={x} y2={x===35?9.5:7.5} stroke={GOLD} strokeWidth={x===35?0.9:0.55} />
          <line x1={x} y1="97" x2={x} y2={x===35?90.5:92.5} stroke={GOLD} strokeWidth={x===35?0.9:0.55} />
        </g>
      ))}
      {[37,55,73].map(y => (
        <g key={y}>
          <line x1="3" y1={y} x2={y===55?9.5:7.5} y2={y} stroke={GOLD} strokeWidth={y===55?0.9:0.55} />
          <line x1="67" y1={y} x2={y===55?60.5:62.5} y2={y} stroke={GOLD} strokeWidth={y===55?0.9:0.55} />
        </g>
      ))}
      <text x="35" y="15" textAnchor="middle" fontFamily="Georgia, serif" fontSize="4.5" fill={GOLD2} opacity="0.65" letterSpacing="3">III</text>
      <line x1="28" y1="16.5" x2="42" y2="16.5" stroke={GOLD3} strokeWidth="0.38" strokeOpacity="0.48" />
      <rect x={CX-17} y={CY-4} width="34" height="8" rx="4" transform={`rotate(-25 ${CX} ${CY})`} fill={`url(#${id}-bar)`} />
      <circle cx={CX} cy={CY} r="30" fill={`url(#${id}-halo1)`} />
      <circle cx={CX} cy={CY} r="22" fill={`url(#${id}-halo2)`} />
      <circle cx={CX} cy={CY} r="18" fill="none" stroke={A} strokeWidth="0.35" strokeOpacity="0.20" strokeDasharray="2 3" />
      <circle cx={CX} cy={CY} r="25" fill="none" stroke={A} strokeWidth="0.28" strokeOpacity="0.13" strokeDasharray="3 4" />
      {arms.map(({ d, col }, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={col} strokeWidth="10" strokeOpacity="0.05" strokeLinecap="round" filter={`url(#${id}-armglow)`} />
          <path d={d} fill="none" stroke={col} strokeWidth="3.2" strokeOpacity="0.2" strokeLinecap="round" />
          <path d={d} fill="none" stroke={col} strokeWidth="1.4" strokeOpacity="0.42" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#d8e0ff" strokeWidth="0.45" strokeOpacity="0.28" strokeLinecap="round" />
        </g>
      ))}
      {subArms.map(({ d, col }, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={col} strokeWidth="5" strokeOpacity="0.04" strokeLinecap="round" filter={`url(#${id}-armglow)`} />
          <path d={d} fill="none" stroke={col} strokeWidth="1.8" strokeOpacity="0.18" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#d0d8ff" strokeWidth="0.3" strokeOpacity="0.2" strokeLinecap="round" />
        </g>
      ))}
      {clusters.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 7 === 0 ? 0.72 : i % 3 === 0 ? 0.44 : 0.25} fill="#c8d4ff" opacity={0.18 + (i % 5) * 0.06} />
      ))}
      {lanes.map(([a, b], i) => {
        const [x1,y1] = merged[a];
        const [x2,y2] = merged[b];
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD3} strokeWidth="0.28" strokeOpacity="0.32" strokeDasharray="2 2.2" />;
      })}
      {barNodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4.5" fill={col} opacity="0.06" filter={`url(#${id}-nodeglow)`} />
          <circle cx={x} cy={y} r="1.6" fill="#06021c" stroke={col} strokeWidth="0.5" strokeOpacity="0.85" />
          <circle cx={x} cy={y} r="0.7" fill={col} opacity="0.7" />
        </g>
      ))}
      {subTips.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill={col} opacity="0.07" filter={`url(#${id}-nodeglow)`} />
          <circle cx={x} cy={y} r="1.4" fill="#06021c" stroke={col} strokeWidth="0.45" strokeOpacity="0.8" />
          <circle cx={x} cy={y} r="0.55" fill={col} opacity="0.65" />
        </g>
      ))}
      {midNodes.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2.5" fill={col} opacity="0.06" filter={`url(#${id}-nodeglow)`} />
          <circle cx={x} cy={y} r="1.0" fill="#04021a" stroke={col} strokeWidth="0.4" strokeOpacity="0.72" />
          <circle cx={x} cy={y} r="0.38" fill={col} opacity="0.6" />
        </g>
      ))}
      {armTips.map(([x,y,col], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill={col} opacity="0.07" filter={`url(#${id}-hubglow)`} />
          <circle cx={x} cy={y} r="3" fill="#04021a" stroke={col} strokeWidth="0.62" strokeOpacity="0.9" />
          <circle cx={x} cy={y} r="1.5" fill={col} opacity="0.65" />
          <circle cx={x} cy={y} r="0.55" fill="#ffffff" opacity="0.85" />
        </g>
      ))}
      <circle cx={CX} cy={CY} r="14" fill={`url(#${id}-core)`} filter={`url(#${id}-coreglow)`} opacity="0.45" />
      <circle cx={CX} cy={CY} r="7" fill={`url(#${id}-core)`} opacity="0.7" />
      <circle cx={CX} cy={CY} r="3.5" fill={`url(#${id}-core)`} />
      <line x1={CX-11} y1={CY} x2={CX+11} y2={CY} stroke="#fff8c0" strokeWidth="0.38" strokeOpacity="0.55" />
      <line x1={CX} y1={CY-11} x2={CX} y2={CY+11} stroke="#fff8c0" strokeWidth="0.38" strokeOpacity="0.55" />
      <line x1={CX-7} y1={CY-7} x2={CX+7} y2={CY+7} stroke={S} strokeWidth="0.22" strokeOpacity="0.36" />
      <line x1={CX+7} y1={CY-7} x2={CX-7} y2={CY+7} stroke={S} strokeWidth="0.22" strokeOpacity="0.36" />
      <circle cx={CX} cy={CY} r="10" fill={S} opacity="0.09" filter={`url(#${id}-nodeglow)`} />
      <circle cx={CX} cy={CY} r="3.2" fill="#0a0600" stroke={S} strokeWidth="0.7" strokeOpacity="0.96" />
      <circle cx={CX} cy={CY} r="1.6" fill={S} opacity="0.85" />
      <circle cx={CX} cy={CY} r="0.6" fill="#fff" opacity="0.95" />
      <text x="35" y="93.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="3.8" fill={GOLD} opacity="0.35" letterSpacing="2.5">LUMINAE</text>
    </svg>
  );
}

export function TierIII() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#060810 0%,#0a0c1e 60%,#040608 100%)' }}>
      <div className="flex flex-col items-center gap-10">
        <div className="flex items-end gap-10">
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 210, height: 300 }}><CardBackTier3 /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>large (review)</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 112, height: 160 }}><CardBackTier3 /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>in-game Forge</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 36, height: 51 }}><CardBackTier3 count={8} /></div>
            <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.08em' }}>deck tile</span>
          </div>
        </div>
        <div style={{ color: '#c4a85a', fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: '0.2em', opacity: 0.8 }}>
          TIER III — GALACTIC CIVILIZATION
        </div>
      </div>
    </div>
  );
}
