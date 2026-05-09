
// Inline copies of the three card back SVGs — no cross-package import needed.

const F = '#ef4444', C = '#3b82f6', V = '#22c55e', A = '#a855f7', R = '#e2e8f0';
const AFFINITY_RING = [F, C, V, A, R] as const;
const GOLD = '#c4a85a', GOLD2 = '#ead68c', GOLD3 = '#7a6030';
const BG_MID = '#08091a', BG_GLOW = '#0d1030', BG_DEEP = '#030509';

function T1({ count }: { count?: number }) {
  const id = 'p1';
  return (
    <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block' }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="52%" r="62%">
          <stop offset="0%" stopColor={BG_GLOW}/>
          <stop offset="60%" stopColor={BG_MID}/>
          <stop offset="100%" stopColor={BG_DEEP}/>
        </radialGradient>
        <linearGradient id={`${id}-sh`} x1="30%" y1="10%" x2="70%" y2="90%">
          <stop offset="0%" stopColor="#2a3568"/>
          <stop offset="45%" stopColor="#1a2245"/>
          <stop offset="100%" stopColor="#0e1428"/>
        </linearGradient>
        <radialGradient id={`${id}-gl`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#4a6ccc" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#4a6ccc" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id={`${id}-bd`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD2} stopOpacity="0.7"/>
          <stop offset="50%" stopColor={GOLD} stopOpacity="1"/>
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      <rect width="70" height="100" fill={`url(#${id}-bg)`}/>
      {[[9,8],[60,12],[22,18],[54,22],[14,35],[62,40],[8,60],[65,58],[20,75],[56,78],[11,88],[62,92]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%3===0?.4:.25} fill="#fff" opacity={0.18+(i%4)*.06}/>
      ))}
      <rect x="4" y="4" width="62" height="92" rx="1.5" fill="none" stroke={`url(#${id}-bd)`} strokeWidth="0.7"/>
      <rect x="6.5" y="6.5" width="57" height="87" rx="0.8" fill="none" stroke={GOLD3} strokeWidth="0.3" strokeOpacity="0.5"/>
      <path d="M4 14 L4 4 L14 4" fill="none" stroke={GOLD2} strokeWidth="1.2" strokeLinecap="square"/>
      <path d="M56 4 L66 4 L66 14" fill="none" stroke={GOLD2} strokeWidth="1.2" strokeLinecap="square"/>
      <path d="M4 86 L4 96 L14 96" fill="none" stroke={GOLD2} strokeWidth="1.2" strokeLinecap="square"/>
      <path d="M56 96 L66 96 L66 86" fill="none" stroke={GOLD2} strokeWidth="1.2" strokeLinecap="square"/>
      {[[4,4],[66,4],[4,96],[66,96]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.2" fill={GOLD} opacity="0.8"/>
      ))}
      <line x1="35" y1="4" x2="35" y2="7" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="35" y1="96" x2="35" y2="93" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="4" y1="50" x2="7" y2="50" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="66" y1="50" x2="63" y2="50" stroke={GOLD} strokeWidth="0.6"/>
      <text x="35" y="20" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fill={GOLD2} opacity="0.85" letterSpacing="1">I</text>
      <line x1="31" y1="22" x2="39" y2="22" stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.6"/>
      <ellipse cx="35" cy="54" rx="14" ry="18" fill={`url(#${id}-gl)`}/>
      <polygon points="35,34 43,42 42,58 35,63 28,58 27,42" fill={`url(#${id}-sh)`} stroke="#3a4a80" strokeWidth="0.5"/>
      <polygon points="35,34 43,42 38,44 35,38" fill="#3a5090" opacity="0.7"/>
      <polygon points="35,34 27,42 32,44 35,38" fill="#2a3870" opacity="0.5"/>
      <polygon points="35,40 38,46 35,48 32,46" fill="#8aa0e0" opacity="0.4"/>
      <line x1="35" y1="34" x2="43" y2="42" stroke="#6080cc" strokeWidth="0.5" strokeOpacity="0.7"/>
      <line x1="35" y1="34" x2="27" y2="42" stroke="#8090cc" strokeWidth="0.5" strokeOpacity="0.5"/>
      <line x1="35" y1="34" x2="35" y2="28" stroke={GOLD2} strokeWidth="0.6" strokeOpacity="0.5"/>
      {([
        [46,41,F],[51,57,C],[44,69,V],[26,69,A],[19,57,R]
      ] as [number,number,string][]).map(([x,y,col],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="3" fill={col} opacity="0.08"/>
          <circle cx={x} cy={y} r="1.1" fill={col} opacity="0.55"/>
          <line x1={x-1.5} y1={y} x2={x+1.5} y2={y} stroke={col} strokeWidth="0.4" opacity="0.4"/>
          <line x1={x} y1={y-1.5} x2={x} y2={y+1.5} stroke={col} strokeWidth="0.4" opacity="0.4"/>
        </g>
      ))}
      <text x="35" y="90" textAnchor="middle" fontFamily="Georgia,serif" fontSize="4" fill={GOLD} opacity="0.45" letterSpacing="2.5">LUMINAE</text>
      {count!==undefined&&<text x="62" y="93" textAnchor="end" fontFamily="monospace" fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>}
    </svg>
  );
}

function T2({ count }: { count?: number }) {
  const id = 'p2';
  const toRad = (d:number) => d*Math.PI/180;
  return (
    <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block' }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#0e1230"/>
          <stop offset="55%" stopColor={BG_MID}/>
          <stop offset="100%" stopColor={BG_DEEP}/>
        </radialGradient>
        <linearGradient id={`${id}-sh`} x1="20%" y1="5%" x2="80%" y2="95%">
          <stop offset="0%" stopColor="#3040a0"/>
          <stop offset="50%" stopColor="#1e2860"/>
          <stop offset="100%" stopColor="#0e1430"/>
        </linearGradient>
        <radialGradient id={`${id}-co`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6080ff" stopOpacity="0.45"/>
          <stop offset="60%" stopColor="#2030a0" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#060820" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id={`${id}-bd`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD2} stopOpacity="0.8"/>
          <stop offset="40%" stopColor={GOLD} stopOpacity="1"/>
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      <rect width="70" height="100" fill={`url(#${id}-bg)`}/>
      {[[7,7],[62,10],[18,16],[52,20],[11,30],[64,35],[6,55],[66,60],[16,72],[58,75],[9,85],[63,90],[30,10],[48,8],[38,92],[25,90]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%4===0?.45:.28} fill="#fff" opacity={0.14+(i%5)*.05}/>
      ))}
      <rect x="3.5" y="3.5" width="63" height="93" rx="1.5" fill="none" stroke={`url(#${id}-bd)`} strokeWidth="0.8"/>
      <rect x="5.5" y="5.5" width="59" height="89" rx="1" fill="none" stroke={GOLD3} strokeWidth="0.35" strokeOpacity="0.55"/>
      <path d="M3.5 16 L3.5 3.5 L16 3.5" fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square"/>
      <path d="M7 14 L7 7 L14 7" fill="none" stroke={GOLD} strokeWidth="0.6" strokeLinecap="square"/>
      <path d="M54 3.5 L66.5 3.5 L66.5 16" fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square"/>
      <path d="M56 7 L63 7 L63 14" fill="none" stroke={GOLD} strokeWidth="0.6" strokeLinecap="square"/>
      <path d="M3.5 84 L3.5 96.5 L16 96.5" fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square"/>
      <path d="M7 86 L7 93 L14 93" fill="none" stroke={GOLD} strokeWidth="0.6" strokeLinecap="square"/>
      <path d="M54 96.5 L66.5 96.5 L66.5 84" fill="none" stroke={GOLD2} strokeWidth="1.3" strokeLinecap="square"/>
      <path d="M56 93 L63 93 L63 86" fill="none" stroke={GOLD} strokeWidth="0.6" strokeLinecap="square"/>
      {[[3.5,3.5],[66.5,3.5],[3.5,96.5],[66.5,96.5]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.4" fill={GOLD} opacity="0.9"/>
      ))}
      <line x1="26" y1="3.5" x2="26" y2="7.5" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="35" y1="3.5" x2="35" y2="8" stroke={GOLD} strokeWidth="0.9"/>
      <line x1="44" y1="3.5" x2="44" y2="7.5" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="26" y1="96.5" x2="26" y2="92.5" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="35" y1="96.5" x2="35" y2="92" stroke={GOLD} strokeWidth="0.9"/>
      <line x1="44" y1="96.5" x2="44" y2="92.5" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="3.5" y1="40" x2="7" y2="40" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="3.5" y1="50" x2="8" y2="50" stroke={GOLD} strokeWidth="0.9"/>
      <line x1="3.5" y1="60" x2="7" y2="60" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="66.5" y1="40" x2="63" y2="40" stroke={GOLD} strokeWidth="0.6"/>
      <line x1="66.5" y1="50" x2="62" y2="50" stroke={GOLD} strokeWidth="0.9"/>
      <line x1="66.5" y1="60" x2="63" y2="60" stroke={GOLD} strokeWidth="0.6"/>
      <text x="35" y="20" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fill={GOLD2} opacity="0.9" letterSpacing="2.5">II</text>
      <line x1="29" y1="22" x2="41" y2="22" stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.65"/>
      <circle cx="35" cy="54" r="20" fill={`url(#${id}-co)`}/>
      <circle cx="35" cy="54" r="20" fill="none" stroke="#3050b0" strokeWidth="0.5" strokeOpacity="0.35" strokeDasharray="3.14 1.57"/>
      <circle cx="35" cy="54" r="15" fill="none" stroke={GOLD3} strokeWidth="0.4" strokeOpacity="0.5" strokeDasharray="2.5 2.5"/>
      <line x1="35" y1="34" x2="35" y2="26" stroke="#3050a0" strokeWidth="1.2" strokeOpacity="0.7"/>
      <line x1="35" y1="34" x2="35" y2="26" stroke={F} strokeWidth="0.5" strokeOpacity="0.5"/>
      <line x1="35" y1="74" x2="35" y2="82" stroke="#3050a0" strokeWidth="1.2" strokeOpacity="0.7"/>
      <line x1="35" y1="74" x2="35" y2="82" stroke={C} strokeWidth="0.5" strokeOpacity="0.5"/>
      <line x1="55" y1="54" x2="62" y2="54" stroke="#3050a0" strokeWidth="1.2" strokeOpacity="0.7"/>
      <line x1="55" y1="54" x2="62" y2="54" stroke={V} strokeWidth="0.5" strokeOpacity="0.5"/>
      <line x1="15" y1="54" x2="8" y2="54" stroke="#3050a0" strokeWidth="1.2" strokeOpacity="0.7"/>
      <line x1="15" y1="54" x2="8" y2="54" stroke={A} strokeWidth="0.5" strokeOpacity="0.5"/>
      <rect x="32.5" y="24" width="5" height="3" rx="0.4" fill="#1a2868" stroke={GOLD} strokeWidth="0.4"/>
      <rect x="32.5" y="80" width="5" height="3" rx="0.4" fill="#1a2868" stroke={GOLD} strokeWidth="0.4"/>
      <rect x="60" y="52" width="3" height="4" rx="0.4" fill="#1a2868" stroke={GOLD} strokeWidth="0.4"/>
      <rect x="7" y="52" width="3" height="4" rx="0.4" fill="#1a2868" stroke={GOLD} strokeWidth="0.4"/>
      <line x1="49.1" y1="39.9" x2="55" y2="34" stroke="#3050a0" strokeWidth="0.7" strokeOpacity="0.5"/>
      <line x1="20.9" y1="39.9" x2="15" y2="34" stroke="#3050a0" strokeWidth="0.7" strokeOpacity="0.5"/>
      <line x1="49.1" y1="68.1" x2="55" y2="74" stroke="#3050a0" strokeWidth="0.7" strokeOpacity="0.5"/>
      <line x1="20.9" y1="68.1" x2="15" y2="74" stroke="#3050a0" strokeWidth="0.7" strokeOpacity="0.5"/>
      <polygon points="35,40 42,48 40,62 35,65 30,62 28,48" fill={`url(#${id}-sh)`} stroke="#4060c0" strokeWidth="0.5"/>
      <polygon points="35,40 42,48 37,50 35,43" fill="#4060c0" opacity="0.65"/>
      <polygon points="35,40 28,48 33,50 35,43" fill="#3050a0" opacity="0.45"/>
      <polygon points="35,47 38,52 35,54 32,52" fill="#90b0ff" opacity="0.35"/>
      <line x1="35" y1="40" x2="42" y2="48" stroke="#7090e0" strokeWidth="0.5" strokeOpacity="0.8"/>
      <line x1="35" y1="40" x2="28" y2="48" stroke="#8090d0" strokeWidth="0.5" strokeOpacity="0.6"/>
      {[0,90,180,270].map((deg,i)=>{
        const rad=deg*Math.PI/180;
        const cx=35+18*Math.cos(rad+0.4), cy=54+18*Math.sin(rad+0.4);
        return <polygon key={i} points={`${cx},${cy-2} ${cx+1.8},${cy+1} ${cx},${cy+2} ${cx-1.8},${cy+1}`} fill="#1a2a68" stroke={GOLD3} strokeWidth="0.35" opacity="0.8"/>;
      })}
      {AFFINITY_RING.map((col,i)=>{
        const s=i*72-90, e=s+52, r=20, cx=35, cy=54;
        const x1=cx+r*Math.cos(toRad(s)), y1=cy+r*Math.sin(toRad(s));
        const x2=cx+r*Math.cos(toRad(e)), y2=cy+r*Math.sin(toRad(e));
        return <path key={col} d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke={col} strokeWidth="1" strokeOpacity="0.45" strokeLinecap="round"/>;
      })}
      <text x="35" y="91" textAnchor="middle" fontFamily="Georgia,serif" fontSize="4" fill={GOLD} opacity="0.45" letterSpacing="2.5">LUMINAE</text>
      {count!==undefined&&<text x="62" y="94" textAnchor="end" fontFamily="monospace" fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>}
    </svg>
  );
}

function T3({ count }: { count?: number }) {
  const id = 'p3';
  const toRad = (d:number) => d*Math.PI/180;
  const colors4 = [F,C,V,A];
  return (
    <svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block' }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#100820"/>
          <stop offset="40%" stopColor="#080618"/>
          <stop offset="100%" stopColor="#020308"/>
        </radialGradient>
        <radialGradient id={`${id}-po`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#180d38" stopOpacity="0.95"/>
          <stop offset="35%" stopColor="#0c0820" stopOpacity="0.85"/>
          <stop offset="70%" stopColor="#060412" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#020208" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`${id}-gw`} cx="50%" cy="50%" r="50%">
          <stop offset="50%" stopColor="#2040c0" stopOpacity="0"/>
          <stop offset="85%" stopColor="#4060e0" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#6080ff" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id={`${id}-bd`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD2} stopOpacity="0.9"/>
          <stop offset="50%" stopColor={GOLD} stopOpacity="1"/>
          <stop offset="100%" stopColor={GOLD3} stopOpacity="0.6"/>
        </linearGradient>
        <filter id={`${id}-rg`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2"/>
        </filter>
      </defs>
      <rect width="70" height="100" fill={`url(#${id}-bg)`}/>
      {[[6,6],[63,9],[20,14],[52,18],[10,28],[65,32],[8,48],[67,52],[14,68],[59,71],[8,82],[64,86],[30,7],[47,6],[36,94],[22,92],[58,90],[15,50],[58,48],[35,18]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%5===0?.5:.28} fill="#fff" opacity={0.12+(i%6)*.055}/>
      ))}
      <rect x="3" y="3" width="64" height="94" rx="2" fill="none" stroke={`url(#${id}-bd)`} strokeWidth="0.9"/>
      <rect x="5" y="5" width="60" height="90" rx="1.5" fill="none" stroke={GOLD} strokeWidth="0.35" strokeOpacity="0.5"/>
      <rect x="7" y="7" width="56" height="86" rx="1" fill="none" stroke={GOLD3} strokeWidth="0.25" strokeOpacity="0.35"/>
      {/* Corner ornaments */}
      <path d="M3 18 L3 3 L18 3" fill="none" stroke={GOLD2} strokeWidth="1.4" strokeLinecap="square"/>
      <path d="M7 15 L7 7 L15 7" fill="none" stroke={GOLD} strokeWidth="0.65" strokeLinecap="square"/>
      <path d="M9 13 L9 9 L13 9" fill="none" stroke={GOLD3} strokeWidth="0.4" strokeLinecap="square"/>
      <path d="M52 3 L67 3 L67 18" fill="none" stroke={GOLD2} strokeWidth="1.4" strokeLinecap="square"/>
      <path d="M55 7 L63 7 L63 15" fill="none" stroke={GOLD} strokeWidth="0.65" strokeLinecap="square"/>
      <path d="M57 9 L61 9 L61 13" fill="none" stroke={GOLD3} strokeWidth="0.4" strokeLinecap="square"/>
      <path d="M3 82 L3 97 L18 97" fill="none" stroke={GOLD2} strokeWidth="1.4" strokeLinecap="square"/>
      <path d="M7 85 L7 93 L15 93" fill="none" stroke={GOLD} strokeWidth="0.65" strokeLinecap="square"/>
      <path d="M9 87 L9 91 L13 91" fill="none" stroke={GOLD3} strokeWidth="0.4" strokeLinecap="square"/>
      <path d="M52 97 L67 97 L67 82" fill="none" stroke={GOLD2} strokeWidth="1.4" strokeLinecap="square"/>
      <path d="M55 93 L63 93 L63 85" fill="none" stroke={GOLD} strokeWidth="0.65" strokeLinecap="square"/>
      <path d="M57 91 L61 91 L61 87" fill="none" stroke={GOLD3} strokeWidth="0.4" strokeLinecap="square"/>
      {[[3,3],[67,3],[3,97],[67,97]].map(([x,y],i)=>(
        <g key={i}><circle cx={x} cy={y} r="1.6" fill={GOLD} opacity="0.95"/><circle cx={x} cy={y} r="0.7" fill={GOLD2} opacity="0.9"/></g>
      ))}
      {[18,26,35,44,52].map(x=>(
        <g key={x}>
          <line x1={x} y1="3" x2={x} y2={x===35?9:7.5} stroke={GOLD} strokeWidth={x===35?1:.6}/>
          <line x1={x} y1="97" x2={x} y2={x===35?91:92.5} stroke={GOLD} strokeWidth={x===35?1:.6}/>
        </g>
      ))}
      {[36,50,64].map(y=>(
        <g key={y}>
          <line x1="3" y1={y} x2={y===50?9:7.5} y2={y} stroke={GOLD} strokeWidth={y===50?1:.6}/>
          <line x1="67" y1={y} x2={y===50?61:62.5} y2={y} stroke={GOLD} strokeWidth={y===50?1:.6}/>
        </g>
      ))}
      <text x="35" y="21" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fill={GOLD2} opacity="0.92" letterSpacing="3.5">III</text>
      <line x1="27" y1="23" x2="43" y2="23" stroke={GOLD} strokeWidth="0.55" strokeOpacity="0.7"/>
      {/* Aperture */}
      <circle cx="35" cy="55" r="22" fill={`url(#${id}-po)`}/>
      <circle cx="35" cy="55" r="22" fill={`url(#${id}-gw)`}/>
      <circle cx="35" cy="55" r="21.5" fill="none" stroke="#5070e0" strokeWidth="2.5" strokeOpacity="0.18" filter={`url(#${id}-rg)`}/>
      <circle cx="35" cy="55" r="21.5" fill="none" stroke={GOLD} strokeWidth="1.1" strokeOpacity="0.75"/>
      <circle cx="35" cy="55" r="17.5" fill="none" stroke="#3555b0" strokeWidth="0.6" strokeOpacity="0.5" strokeDasharray="4 2"/>
      <circle cx="35" cy="55" r="13" fill="none" stroke={GOLD3} strokeWidth="0.45" strokeOpacity="0.6" strokeDasharray="2.5 1.5"/>
      {/* 8 spokes */}
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const r=toRad(deg), ip=i%2===0;
        return <line key={deg} x1={35+13*Math.cos(r)} y1={55+13*Math.sin(r)} x2={35+21.5*Math.cos(r)} y2={55+21.5*Math.sin(r)} stroke={ip?GOLD:'#4060b0'} strokeWidth={ip?.8:.45} strokeOpacity={ip?.8:.55}/>;
      })}
      {/* 4 main arms */}
      {[0,90,180,270].map((deg,i)=>{
        const r=toRad(deg);
        const x1=35+21.5*Math.cos(r), y1=55+21.5*Math.sin(r);
        const x2=35+30*Math.cos(r),   y2=55+30*Math.sin(r);
        const mx=35+25.5*Math.cos(r), my=55+25.5*Math.sin(r);
        const pr=r+Math.PI/2, cl=2.5;
        return (
          <g key={deg}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="0.9" strokeOpacity="0.7"/>
            <line x1={mx+cl*Math.cos(pr)} y1={my+cl*Math.sin(pr)} x2={mx-cl*Math.cos(pr)} y2={my-cl*Math.sin(pr)} stroke={GOLD3} strokeWidth="0.55" strokeOpacity="0.6"/>
            <circle cx={x2} cy={y2} r="2" fill="#0e1428" stroke={GOLD} strokeWidth="0.5"/>
            <circle cx={x2} cy={y2} r="1" fill={colors4[i]} opacity="0.6"/>
          </g>
        );
      })}
      {/* 4 diagonal struts */}
      {[45,135,225,315].map(deg=>{
        const r=toRad(deg);
        return <line key={deg} x1={35+21.5*Math.cos(r)} y1={55+21.5*Math.sin(r)} x2={35+26*Math.cos(r)} y2={55+26*Math.sin(r)} stroke={GOLD3} strokeWidth="0.6" strokeOpacity="0.55"/>;
      })}
      {/* 5 affinity nodes on outer ring */}
      {AFFINITY_RING.map((col,i)=>{
        const deg=i*72-90, r=toRad(deg), cx=35+21.5*Math.cos(r), cy=55+21.5*Math.sin(r);
        return (
          <g key={col}>
            <circle cx={cx} cy={cy} r="3.5" fill={col} opacity="0.1"/>
            <circle cx={cx} cy={cy} r="1.6" fill="#0e1428" stroke={GOLD} strokeWidth="0.45"/>
            <circle cx={cx} cy={cy} r="0.85" fill={col} opacity="0.7"/>
          </g>
        );
      })}
      {/* 5 color arc segments on inner ring */}
      {AFFINITY_RING.map((col,i)=>{
        const s=i*72-90, e=s+58, r=17.5, cx=35, cy=55;
        const x1=cx+r*Math.cos(toRad(s)), y1=cy+r*Math.sin(toRad(s));
        const x2=cx+r*Math.cos(toRad(e)), y2=cy+r*Math.sin(toRad(e));
        return <path key={col} d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke={col} strokeWidth="1.4" strokeOpacity="0.4" strokeLinecap="round"/>;
      })}
      {/* Central core */}
      <circle cx="35" cy="55" r="5" fill="#080c28" stroke={GOLD3} strokeWidth="0.4"/>
      <circle cx="35" cy="55" r="3" fill="#0d1040" stroke="#4060c0" strokeWidth="0.35" strokeOpacity="0.8"/>
      <polygon points="35,51 37.5,53 37.5,57 35,59 32.5,57 32.5,53" fill="#1a2860" stroke="#6080e0" strokeWidth="0.35" strokeOpacity="0.8"/>
      <polygon points="35,52.5 36.5,54 35,55.5 33.5,54" fill="#8090ff" opacity="0.3"/>
      <ellipse cx="35" cy="55" rx="18" ry="14" fill="#180828" opacity="0.3"/>
      <text x="35" y="92" textAnchor="middle" fontFamily="Georgia,serif" fontSize="4" fill={GOLD} opacity="0.5" letterSpacing="2.5">LUMINAE</text>
      {count!==undefined&&<text x="63" y="95" textAnchor="end" fontFamily="monospace" fontSize="6" fill="white" opacity="0.85" fontWeight="700">{count}</text>}
    </svg>
  );
}

export function CardBacksPreview() {
  const tiers = [
    { Back: T1, label: 'Tier I', sub: 'Shard Relic' },
    { Back: T2, label: 'Tier II', sub: 'Relic Engine' },
    { Back: T3, label: 'Tier III', sub: 'Cosmic Aperture' },
  ];
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#060810 0%,#0a0c1e 60%,#040608 100%)' }}>
      <div className="flex gap-14 items-start">
        {tiers.map(({ Back, label, sub }) => (
          <div key={label} className="flex flex-col items-center gap-5">
            {/* md — 112×160 */}
            <div style={{ width:112, height:160 }}>
              <Back />
            </div>
            {/* sm — 36×48 with deck count */}
            <div style={{ width:36, height:48 }}>
              <Back count={8} />
            </div>
            <div className="text-center mt-1">
              <div style={{ color:'#c4a85a', fontSize:12, fontFamily:'Georgia,serif', letterSpacing:'0.1em' }}>{label}</div>
              <div style={{ color:'#505878', fontSize:10, marginTop:3 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
