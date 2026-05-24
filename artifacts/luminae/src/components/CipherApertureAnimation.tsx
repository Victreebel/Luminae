import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ─── Cipher Aperture Animation ────────────────────────────────────────────────
// Encrypt/Reserve animation for reserve_card-with-cardId actions.
//
// Visual sequence:
//  1. lift    (~120ms) — card rises from market slot; board dims (obsidian glass)
//  2. circuit (~450ms) — 10 prismatic-white circuit branches from all four card
//                         edges converge toward the card centre; white light beads
//                         travel each branch at staggered speeds
//  3. compress (~220ms) — card face fades + scales down to centre; circuit fades
//  4. sigil    (~110ms) — cipher sigil materialises at screen centre
//  5. travel   (~300ms) — sigil arcs toward the reserved-hand destination
//  6. arrive   (~160ms) — prismatic pulse ring; sigil fades; onComplete fires
//
// Aesthetic: obsidian glass + prismatic white + subtle cyan/violet edge glow.
// No padlocks, no binary rain, no fire, no dominant purple/blue/gold, no WebGL.
//
// mode="game"     faster / snappy  ~1.36 s total
// mode="tutorial" slower / readable ~1.87 s total

export type CipherApertureMode = "tutorial" | "game";

export interface CipherApertureProps {
  /** Increment to restart the animation. */
  animKey: number;
  mode: CipherApertureMode;
  /** Screen rect of the source card (getBoundingClientRect). */
  sourceRect: { x: number; y: number; w: number; h: number };
  /** Affinity glow hex — drives sigil colour. */
  affinityHex: string;
  /** Card name shown in the "Encrypted" label. */
  cardName: string;
  /** Pre-rendered card face JSX shown during lift/circuit phases. */
  cardFace: React.ReactNode;
  /** Centre of the reserved-hand / destination area on screen. */
  destPos?: { x: number; y: number };
  /** Show +1 Singularity indicator when player earned a Flux crystal. */
  gotFlux?: boolean;
  /** Called once the full sequence completes. */
  onComplete?: () => void;
}

type Phase = "lift" | "circuit" | "compress" | "sigil" | "travel" | "arrive";

const PHASE_ORDER: Phase[] = [
  "lift", "circuit", "compress", "sigil", "travel", "arrive",
];

const PHASE_DUR: Record<CipherApertureMode, Record<Phase, number>> = {
  game:     { lift: 200, circuit: 760, compress: 380, sigil: 185, travel: 510, arrive: 265 },
  tutorial: { lift: 300, circuit: 960, compress: 500, sigil: 250, travel: 680, arrive: 410 },
};

export function CipherApertureAnimation({
  animKey, mode, sourceRect, affinityHex, cardName, cardFace,
  destPos, gotFlux, onComplete,
}: CipherApertureProps) {
  const [phase, setPhase] = useState<Phase>("lift");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dur = PHASE_DUR[mode];

  const cx  = window.innerWidth  / 2;
  const cy  = window.innerHeight / 2;
  const dest = destPos ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.90 };

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase("lift");

    let acc = 0;
    const transitions: Phase[] = ["circuit", "compress", "sigil", "travel", "arrive"];
    const from: Phase[]        = ["lift",    "circuit",  "compress", "sigil", "travel"];
    transitions.forEach((p, i) => {
      acc += dur[from[i]];
      const t = setTimeout(() => setPhase(p), acc);
      timersRef.current.push(t);
    });
    acc += dur.arrive;
    timersRef.current.push(setTimeout(() => onComplete?.(), acc));
    return () => { timersRef.current.forEach(clearTimeout); };
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pi        = PHASE_ORDER.indexOf(phase);
  const at        = (p: Phase) => phase === p;

  const showCard    = pi <= PHASE_ORDER.indexOf("compress");
  const showCircuit = pi >= PHASE_ORDER.indexOf("circuit") && pi <= PHASE_ORDER.indexOf("compress");
  const showSigil   = pi >= PHASE_ORDER.indexOf("sigil");
  const showPulse   = at("arrive");
  const showLabel   = pi >= PHASE_ORDER.indexOf("sigil");

  // Vector from card's current fixed position to screen centre
  const compressX = cx - sourceRect.x - sourceRect.w / 2;
  const compressY = cy - sourceRect.y - sourceRect.h / 2;

  const dimOpacity =
    at("lift")     ? 0.30 :
    at("circuit")  ? 0.55 :
    at("compress") ? 0.65 :
    at("sigil")    ? 0.65 :
    at("travel")   ? 0.48 : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">

      {/* ── Board dim — obsidian glass ─────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: dimOpacity }}
        transition={{ duration: 0.2 }}
      />

      {/* ── Card: lift → circuit overlay → compress to centre ─────────── */}
      {showCard && (
        <motion.div
          style={{
            position: "fixed",
            left:   sourceRect.x,
            top:    sourceRect.y,
            width:  sourceRect.w,
            height: sourceRect.h,
          }}
          initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
          animate={{
            x:       at("compress") ? compressX : 0,
            y:       (at("lift") || at("circuit")) ? -14 : at("compress") ? compressY : 0,
            scale:   at("lift") ? 1.08 : at("circuit") ? 1.12 : 0.10,
            rotate:  at("compress") ? 45 : 0,
            opacity: at("compress") ? [1, 0.55, 0] : 1,
          }}
          transition={{
            x: {
              duration: at("compress") ? dur.compress / 1000 : dur.lift / 1000,
              ease: at("compress") ? [0.60, 0.0, 0.85, 0.5] : [0.22, 1, 0.36, 1],
            },
            y: {
              duration: at("compress") ? dur.compress / 1000 : dur.lift / 1000,
              ease: [0.22, 1, 0.36, 1],
            },
            scale:   { duration: at("compress") ? dur.compress / 1000 : dur.lift / 1000 },
            rotate:  { duration: at("compress") ? dur.compress / 1000 : 0.06 },
            opacity: at("compress")
              ? { duration: dur.compress / 1000, times: [0, 0.5, 1] }
              : { duration: 0.06 },
          }}
        >
          {/* Card face + subtle obsidian tint during circuit phase */}
          <div className="relative w-full h-full rounded-xl overflow-hidden">
            {cardFace}
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{ background: "rgba(2,6,18,0)" }}
              animate={{ background: showCircuit ? "rgba(2,6,18,0.22)" : "rgba(2,6,18,0)" }}
              transition={{ duration: 0.18 }}
            />
          </div>

          {/* Branching circuit overlay — mounted only during circuit phase */}
          {showCircuit && (
            <CipherCircuit
              w={sourceRect.w}
              h={sourceRect.h}
              circuitDurMs={dur.circuit}
              id={animKey}
            />
          )}
        </motion.div>
      )}

      {/* ── Sigil: materialise → travel → arrive ──────────────────────── */}
      {showSigil && (
        <motion.div
          style={{ position: "fixed", width: 80, height: 80 }}
          initial={{ x: cx - 40, y: cy - 40, scale: 0.18, opacity: 0, rotate: 0 }}
          animate={{
            x:       at("sigil") ? cx - 40  : dest.x - 40,
            y:       at("sigil") ? cy - 40  : dest.y - 40,
            scale:   at("sigil") ? 1        : at("travel") ? 0.44 : 0.12,
            opacity: at("sigil") ? 1        : at("travel") ? 0.90 : 0,
            rotate:  (at("travel") || at("arrive")) ? 90 : 0,
          }}
          transition={{
            duration: at("sigil")  ? dur.sigil  / 1000
                    : at("travel") ? dur.travel / 1000
                    : dur.arrive / 1000,
            ease: at("travel") ? [0.50, 0, 0.20, 1] : [0.22, 1, 0.36, 1],
          }}
        >
          <CipherSigil affinityHex={affinityHex} id={animKey} />
        </motion.div>
      )}

      {/* ── Destination pulse ring ─────────────────────────────────────── */}
      {showPulse && (
        <motion.div
          style={{
            position: "fixed",
            left: dest.x - 36,
            top:  dest.y - 36,
            width: 72, height: 72,
            borderRadius: "50%",
            border: "1.5px solid rgba(190,235,255,0.80)",
            boxShadow: "0 0 14px 4px rgba(100,200,255,0.28)",
          }}
          initial={{ scale: 0.4, opacity: 0.92 }}
          animate={{ scale: 3.2,  opacity: 0 }}
          transition={{ duration: dur.arrive / 1000, ease: "easeOut" }}
        />
      )}

      {/* ── "Encrypted" label ─────────────────────────────────────────── */}
      {showLabel && (
        <motion.div
          className="fixed left-0 right-0 flex justify-center items-center gap-2.5"
          style={{ top: cy - 110 }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: at("arrive") ? 0 : 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span
            className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{
              color:      "rgba(200,238,255,0.92)",
              background: "rgba(60,150,220,0.12)",
              border:     "1px solid rgba(120,200,255,0.28)",
            }}
          >
            Encrypted
          </span>
          {cardName && (
            <span className="text-white/50 text-[10px] font-medium max-w-[130px] truncate">
              {cardName}
            </span>
          )}
          {gotFlux && (
            <span className="text-[10px] font-semibold" style={{ color: "#fbbf24" }}>
              +1 Singularity
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Circuit Overlay ───────────────────────────────────────────────────────────
// 10 branching SVG paths from all 4 card edges → converge at centre.
// Prismatic-white lines with staggered delays; white light beads travel each branch.

interface CipherCircuitProps {
  w: number;
  h: number;
  circuitDurMs: number;
  id: number;
}

function CipherCircuit({ w, h, circuitDurMs, id }: CipherCircuitProps) {
  const cx = w / 2;
  const cy = h / 2;
  const ds = circuitDurMs / 1000; // total duration in seconds

  // Branch definitions — each starts at a card edge and converges to (cx, cy).
  // dl: delay offset in seconds (staggered, not uniform)
  // col: prismatic-white with slight cyan or violet tint per branch
  // sw: stroke width; bs: bead radius
  const branches: {
    d:   string;
    dl:  number;
    col: string;
    sw:  number;
    bs:  number;
  }[] = [
    // ── Top edge (3 branches) ────────────────────────────────────────────
    {
      d:   `M ${cx - 18},0 L ${cx - 18},${h * 0.23} L ${w * 0.27},${h * 0.43} L ${cx},${cy}`,
      dl:  0.000, col: "rgba(222,243,255,0.90)", sw: 0.90, bs: 2.3,
    },
    {
      d:   `M ${cx},0 L ${cx},${h * 0.30} L ${cx},${cy}`,
      dl:  0.032, col: "rgba(200,228,255,0.82)", sw: 1.15, bs: 2.5,
    },
    {
      d:   `M ${cx + 18},0 L ${cx + 18},${h * 0.23} L ${w * 0.73},${h * 0.43} L ${cx},${cy}`,
      dl:  0.058, col: "rgba(218,198,255,0.80)", sw: 0.90, bs: 2.1,
    },
    // ── Right edge (2 branches) ──────────────────────────────────────────
    {
      d:   `M ${w},${cy - 22} L ${w * 0.80},${cy - 22} L ${w * 0.68},${h * 0.43} L ${cx},${cy}`,
      dl:  0.018, col: "rgba(185,228,255,0.85)", sw: 1.00, bs: 2.0,
    },
    {
      d:   `M ${w},${cy + 22} L ${w * 0.80},${cy + 22} L ${w * 0.68},${h * 0.57} L ${cx},${cy}`,
      dl:  0.082, col: "rgba(220,200,255,0.75)", sw: 0.90, bs: 1.8,
    },
    // ── Bottom edge (3 branches) ─────────────────────────────────────────
    {
      d:   `M ${cx - 18},${h} L ${cx - 18},${h * 0.77} L ${w * 0.27},${h * 0.57} L ${cx},${cy}`,
      dl:  0.048, col: "rgba(200,238,255,0.82)", sw: 0.90, bs: 2.0,
    },
    {
      d:   `M ${cx},${h} L ${cx},${h * 0.70} L ${cx},${cy}`,
      dl:  0.074, col: "rgba(200,228,255,0.80)", sw: 1.15, bs: 2.5,
    },
    {
      d:   `M ${cx + 18},${h} L ${cx + 18},${h * 0.77} L ${w * 0.73},${h * 0.57} L ${cx},${cy}`,
      dl:  0.022, col: "rgba(222,243,255,0.88)", sw: 0.90, bs: 2.0,
    },
    // ── Left edge (2 branches) ───────────────────────────────────────────
    {
      d:   `M 0,${cy - 22} L ${w * 0.20},${cy - 22} L ${w * 0.32},${h * 0.43} L ${cx},${cy}`,
      dl:  0.040, col: "rgba(212,196,255,0.80)", sw: 1.00, bs: 2.0,
    },
    {
      d:   `M 0,${cy + 22} L ${w * 0.20},${cy + 22} L ${w * 0.32},${h * 0.57} L ${cx},${cy}`,
      dl:  0.010, col: "rgba(200,240,255,0.85)", sw: 0.90, bs: 1.8,
    },
  ];

  const glowId = `cc-glow-${id}`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${w} ${h}`}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        mixBlendMode: "screen",
        overflow: "visible",
      }}
    >
      <defs>
        {/* Soft prismatic glow shared by all branches */}
        <filter id={glowId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {branches.map((b, i) => {
        const traceDur  = ds * 0.72;
        const beadDur   = ds * 0.56;
        const beadBegin = `${b.dl + 0.04}s`;

        return (
          <g key={i} filter={`url(#${glowId})`}>
            {/* Circuit trace — travels from edge to centre */}
            <motion.path
              d={b.d}
              stroke={b.col}
              strokeWidth={b.sw}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0.60] }}
              transition={{
                pathLength: {
                  duration: traceDur,
                  delay:    b.dl,
                  ease:     "easeInOut",
                },
                opacity: {
                  duration: ds * 0.82,
                  delay:    b.dl,
                  times:    [0, 0.14, 1],
                },
              }}
            />

            {/* Light bead — white circle traveling the branch path */}
            <circle r={b.bs} fill="white" opacity="0">
              <animate
                attributeName="opacity"
                values="0;1;0.85;0"
                dur={`${beadDur}s`}
                begin={beadBegin}
                fill="freeze"
              />
              <animateMotion
                dur={`${beadDur}s`}
                begin={beadBegin}
                fill="freeze"
                path={b.d}
              />
            </circle>
          </g>
        );
      })}

      {/* Convergence flash — blooms at centre when lines arrive */}
      <motion.circle
        cx={cx} cy={cy} r={5}
        fill="white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.90, 0] }}
        transition={{ duration: ds * 0.32, delay: ds * 0.64, ease: "easeOut" }}
      />
      <motion.circle
        cx={cx} cy={cy} r={12}
        fill="rgba(180,230,255,0.50)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.50, 0] }}
        transition={{ duration: ds * 0.30, delay: ds * 0.66, ease: "easeOut" }}
      />
    </svg>
  );
}

// ─── Cipher Sigil ─────────────────────────────────────────────────────────────
// Nested hexagonal aperture with a central diamond prism.
// Flat-top outer hex + pointy-top inner hex + diamond core.
// Affinity-coloured with prismatic-white inner highlights.

function CipherSigil({ affinityHex, id }: { affinityHex: string; id: number }) {
  const glowId   = `ca-glow-${id}`;
  const bloomId  = `ca-bloom-${id}`;
  const whiteId  = `ca-white-${id}`;

  return (
    <svg
      viewBox="0 0 96 96"
      className="w-full h-full"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={bloomId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={whiteId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft affinity bloom behind the hex */}
      <polygon
        points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
        fill={affinityHex}
        opacity="0.13"
        filter={`url(#${bloomId})`}
      />

      {/* Outer hexagon (flat-top) — affinity colour */}
      <polygon
        points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
        fill="none"
        stroke={affinityHex}
        strokeWidth="1.4"
        opacity="0.88"
        filter={`url(#${glowId})`}
      />

      {/* Prismatic-white outer ring — sits just inside the hex edge */}
      <polygon
        points="82,48 64.5,78 31.5,78 14,48 31.5,18 64.5,18"
        fill="none"
        stroke="rgba(210,240,255,0.28)"
        strokeWidth="0.6"
        opacity="1"
        filter={`url(#${whiteId})`}
      />

      {/* Inner hexagon (pointy-top — rotated 30° from outer) */}
      <polygon
        points="71,61.5 48,73 25,61.5 25,34.5 48,23 71,34.5"
        fill="none"
        stroke={affinityHex}
        strokeWidth="0.85"
        opacity="0.52"
      />

      {/* Central diamond — folded-card prism core */}
      <rect
        x="37" y="37" width="22" height="22" rx="1"
        transform="rotate(45 48 48)"
        fill={affinityHex}
        opacity="0.58"
        filter={`url(#${glowId})`}
      />
      {/* Prismatic white highlight on diamond */}
      <rect
        x="41.5" y="41.5" width="13" height="13"
        transform="rotate(45 48 48)"
        fill="rgba(220,245,255,0.28)"
        opacity="1"
      />
      {/* Bright white core glint */}
      <rect
        x="45" y="45" width="6" height="6"
        transform="rotate(45 48 48)"
        fill="white"
        opacity="0.22"
        filter={`url(#${whiteId})`}
      />

      {/* Vertex marks at outer hex corners */}
      {(
        [[87,48],[67.5,81.5],[28.5,81.5],[9,48],[28.5,14.5],[67.5,14.5]] as
        [number,number][]
      ).map(([vx,vy], i) => (
        <circle key={i} cx={vx} cy={vy} r="2.6" fill={affinityHex} opacity="0.90" />
      ))}

      {/* Cipher cross-traces — subtle dashed diagonals */}
      <line
        x1="20" y1="28" x2="76" y2="68"
        stroke={affinityHex} strokeWidth="0.6" opacity="0.36"
        strokeDasharray="2.8 4.2"
      />
      <line
        x1="20" y1="68" x2="76" y2="28"
        stroke={affinityHex} strokeWidth="0.6" opacity="0.36"
        strokeDasharray="2.8 4.2"
      />

      {/* Alternating brightened outer-edge accents (3 of 6 edges) */}
      <line x1="87"  y1="48"   x2="67.5" y2="81.5" stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
      <line x1="28.5" y1="81.5" x2="9"   y2="48"   stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
      <line x1="28.5" y1="14.5" x2="67.5" y2="14.5" stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
    </svg>
  );
}
