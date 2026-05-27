import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ARRIVAL_LABEL_LINGER_MS, CIPHER_GAME_TOTAL_MS, CIPHER_TUTORIAL_TOTAL_MS } from '../pages/game-constants';

// ─── Cipher Aperture Animation ────────────────────────────────────────────────
// Encrypt/Reserve animation for reserve_card-with-cardId actions.
//
// Visual sequence:
//  1. forefront (~180ms) — card lifts from market slot to viewport centre
//  2. circuit   (~950ms) — 8 feeder branches terminate at the 6 outer-hex corners;
//                           2 thin branches feed inner-hex / diamond at centre.
//                           Simultaneously a fixed SVG at screen centre draws the
//                           sigil in prismatic white — outer hex edges draw from
//                           BOTH endpoints and meet at midpoints; inner hex draws
//                           as two opposing half-loops; diamond draws as 4 arms
//                           from top+bottom meeting at left+right vertices.
//  3. compress  (~600ms) — card face fades; feeder branches fade with card; sigil
//                           geometry transitions from prismatic white → affinity
//                           colour as the card collapses — the sigil solidifies.
//  4. travel    (~620ms) — fully-formed affinity-coloured sigil arcs to destination
//  5. arrive    (~330ms) — prismatic pulse ring; sigil fades; onComplete fires
//
// mode="game"     ~2.68 s  |  mode="tutorial" ~2.61 s

export type CipherApertureMode = "tutorial" | "game";

export interface CipherApertureProps {
  animKey: number;
  mode: CipherApertureMode;
  sourceRect: { x: number; y: number; w: number; h: number };
  affinityHex: string;
  cardName: string;
  cardFace: React.ReactNode;
  destPos?: { x: number; y: number };
  gotFlux?: boolean;
  ownerName?: string;
  onComplete?: () => void;
  /** When true (compact market view) skip the forefront lift-to-centre step; circuit starts immediately at the card's current position. */
  skipForefront?: boolean;
}

type Phase = "forefront" | "circuit" | "compress" | "sigil" | "travel" | "arrive";

const PHASE_ORDER: Phase[] = ["forefront", "circuit", "compress", "travel", "arrive"];

const PHASE_DUR: Record<CipherApertureMode, Record<Phase, number>> = {
  game:     { forefront: 180, circuit: 950, compress: 600, sigil: 0, travel: 620, arrive: 330 },
  tutorial: { forefront: 180, circuit: 900, compress: 580, sigil: 0, travel: 600, arrive: 350 },
};

// Self-validating guards — throw at module load time if any PHASE_DUR mode drifts from its
// exported constant. Update the relevant constant in game-constants.ts whenever you change
// any phase duration above.
const _gamePhasesSum = Object.values(PHASE_DUR.game).reduce((a, b) => a + b, 0);
if (_gamePhasesSum !== CIPHER_GAME_TOTAL_MS) {
  throw new Error(
    `[CipherApertureAnimation] PHASE_DUR.game sum (${_gamePhasesSum} ms) does not match ` +
    `CIPHER_GAME_TOTAL_MS (${CIPHER_GAME_TOTAL_MS} ms) — update game-constants.ts.`
  );
}
const _tutorialPhasesSum = Object.values(PHASE_DUR.tutorial).reduce((a, b) => a + b, 0);
if (_tutorialPhasesSum !== CIPHER_TUTORIAL_TOTAL_MS) {
  throw new Error(
    `[CipherApertureAnimation] PHASE_DUR.tutorial sum (${_tutorialPhasesSum} ms) does not match ` +
    `CIPHER_TUTORIAL_TOTAL_MS (${CIPHER_TUTORIAL_TOTAL_MS} ms) — update game-constants.ts.`
  );
}


export function CipherApertureAnimation({
  animKey, mode, sourceRect, affinityHex, cardName, cardFace,
  destPos, gotFlux, ownerName, onComplete, skipForefront,
}: CipherApertureProps) {
  const [phase, setPhase] = useState<Phase>(skipForefront ? "circuit" : "forefront");
  const [arrivalLabelFading, setArrivalLabelFading] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dur = PHASE_DUR[mode];

  const cx   = window.innerWidth  / 2;
  const cy   = window.innerHeight / 2;
  const dest = destPos ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.90 };

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    // In compact view skip the forefront phase (no lift to centre).
    setPhase(skipForefront ? "circuit" : "forefront");
    setArrivalLabelFading(false);

    let acc = skipForefront ? 0 : 0;
    const transitions: Phase[] = ["circuit", "compress", "travel", "arrive"];
    const from: Phase[]        = ["forefront", "circuit", "compress", "travel"];
    transitions.forEach((p, i) => {
      // When skipForefront: first from="forefront" contributes 0ms (already skipped).
      const stepDur = (i === 0 && skipForefront) ? 0 : dur[from[i]];
      acc += stepDur;
      timersRef.current.push(setTimeout(() => setPhase(p), acc));
    });
    acc += dur.arrive;
    timersRef.current.push(setTimeout(() => onComplete?.(), acc));
    timersRef.current.push(setTimeout(() => setArrivalLabelFading(true), acc + ARRIVAL_LABEL_LINGER_MS));
    return () => { timersRef.current.forEach(clearTimeout); };
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pi = PHASE_ORDER.indexOf(phase);
  const at = (p: Phase) => phase === p;

  const showCard      = pi <= PHASE_ORDER.indexOf("compress");
  // feeder overlay fades with the card during compress
  const showCircuit   = pi >= PHASE_ORDER.indexOf("circuit") && pi <= PHASE_ORDER.indexOf("compress");
  // sigil-draw overlay stays fully visible during circuit AND compress (colour transition is the compress visual)
  const showSigilDraw = pi >= PHASE_ORDER.indexOf("circuit") && pi <= PHASE_ORDER.indexOf("compress");
  // static CipherSigil only needed for travel + arrive
  const showSigil     = pi >= PHASE_ORDER.indexOf("travel");
  const showPulse     = at("arrive");
  const showLabel     = pi >= PHASE_ORDER.indexOf("compress");
  const showArrivalLabel = !!ownerName && !!destPos && pi >= PHASE_ORDER.indexOf("travel");

  // When skipForefront: card stays in its slot (no translation to centre).
  const forefrontX = skipForefront ? 0 : (cx - sourceRect.x - sourceRect.w / 2);
  const forefrontY = skipForefront ? 0 : (cy - sourceRect.y - sourceRect.h / 2 - 24);

  const dimOpacity =
    at("forefront") ? 0.30 :
    at("circuit")   ? 0.55 :
    at("compress")  ? 0.65 :
    at("travel")    ? 0.48 : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">

      {/* Board dim */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: dimOpacity }}
        transition={{ duration: 0.2 }}
      />

      {/* Card: lift → circuit → compress */}
      {showCard && (
        <motion.div
          style={{ position: "fixed", left: sourceRect.x, top: sourceRect.y, width: sourceRect.w, height: sourceRect.h }}
          initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
          animate={{
            x:       (at("forefront") || at("circuit") || at("compress")) ? forefrontX : 0,
            y:       (at("forefront") || at("circuit") || at("compress")) ? forefrontY : 0,
            scale:   at("forefront") ? 1.08 : at("circuit") ? 1.12 : 0.10,
            rotate:  at("compress") ? 45 : 0,
            opacity: at("compress") ? [1, 0.55, 0] : 1,
          }}
          transition={{
            x:       { duration: at("forefront") ? dur.forefront / 1000 : 0.08, ease: [0.22, 1, 0.36, 1] },
            y:       { duration: at("forefront") ? dur.forefront / 1000 : 0.08, ease: [0.22, 1, 0.36, 1] },
            scale:   { duration: at("forefront") ? dur.forefront / 1000 : at("compress") ? dur.compress / 1000 : 0.08 },
            rotate:  { duration: at("compress") ? dur.compress / 1000 : 0.06 },
            opacity: at("compress") ? { duration: dur.compress / 1000, times: [0, 0.5, 1] } : { duration: 0.06 },
          }}
        >
          <div className="relative w-full h-full rounded-xl overflow-hidden">
            {cardFace}
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{ background: "rgba(2,6,18,0)" }}
              animate={{ background: showCircuit ? "rgba(2,6,18,0.22)" : "rgba(2,6,18,0)" }}
              transition={{ duration: 0.18 }}
            />
          </div>
          {showCircuit && (
            <CipherCircuit w={sourceRect.w} h={sourceRect.h} circuitDurMs={dur.circuit} id={animKey} />
          )}
        </motion.div>
      )}

      {/* Sigil-draw overlay — stays at full opacity through compress; colour transition is the compress visual */}
      {showSigilDraw && (
        <motion.div
          style={{ position: "fixed", width: 80, height: 80, left: cx - 40, top: cy - 64 }}
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: at("compress") ? 8 : 0 }}
          transition={{
            opacity: { duration: 0.12 },
            rotate:  { duration: at("compress") ? dur.compress / 1000 : 0.12, ease: "linear" },
          }}
        >
          <CipherSigilDrawing
            affinityHex={affinityHex}
            id={animKey}
            circuitDurMs={dur.circuit}
            compressDurMs={dur.compress}
            isCompressing={at("compress")}
          />
        </motion.div>
      )}

      {/* Static CipherSigil — travel + arrive only */}
      {showSigil && (
        <motion.div
          style={{ position: "fixed", width: 80, height: 80 }}
          initial={{ x: cx - 40, y: cy - 64, scale: 1, opacity: 1, rotate: 8 }}
          animate={{
            x:       dest.x - 40,
            y:       dest.y - 40,
            scale:   at("travel") ? 0.44 : 0.12,
            opacity: at("travel") ? 0.90 : 0,
            rotate:  90,
          }}
          transition={{
            duration: at("travel") ? dur.travel / 1000 : dur.arrive / 1000,
            ease: at("travel") ? [0.50, 0, 0.20, 1] : [0.22, 1, 0.36, 1],
          }}
        >
          <CipherSigil affinityHex={affinityHex} id={animKey} />
        </motion.div>
      )}

      {/* Destination pulse ring */}
      {showPulse && (
        <motion.div
          style={{
            position: "fixed", left: dest.x - 36, top: dest.y - 36,
            width: 72, height: 72, borderRadius: "50%",
            border: "1.5px solid rgba(190,235,255,0.80)",
            boxShadow: "0 0 14px 4px rgba(100,200,255,0.28)",
          }}
          initial={{ scale: 0.4, opacity: 0.92 }}
          animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: dur.arrive / 1000, ease: "easeOut" }}
        />
      )}

      {/* Arrival owner label */}
      {showArrivalLabel && destPos && (
        <motion.div
          style={{ position: "fixed", left: destPos.x, top: destPos.y - 46, transform: "translateX(-50%)", whiteSpace: "nowrap" }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: arrivalLabelFading ? 0 : 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <span
            className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide"
            style={{ color: "rgba(200,238,255,0.90)", background: "rgba(20,40,80,0.72)", border: "1px solid rgba(120,200,255,0.25)", backdropFilter: "blur(4px)" }}
          >
            {cardName && <span className="text-white/70">{cardName}</span>}
            {cardName && ownerName && <span style={{ color: "rgba(160,210,255,0.55)", margin: "0 4px" }}>·</span>}
            {ownerName && <span style={{ color: "rgba(180,230,255,0.85)" }}>{ownerName}</span>}
          </span>
        </motion.div>
      )}

      {/* "Encrypted" label */}
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
            style={{ color: "rgba(200,238,255,0.92)", background: "rgba(60,150,220,0.12)", border: "1px solid rgba(120,200,255,0.28)" }}
          >
            Encrypted
          </span>
          {cardName && <span className="text-white/50 text-[10px] font-medium max-w-[130px] truncate">{cardName}</span>}
          {gotFlux && <span className="text-[10px] font-semibold" style={{ color: "#fbbf24" }}>+1 Singularity</span>}
        </motion.div>
      )}
    </div>
  );
}

// ─── Circuit Overlay ───────────────────────────────────────────────────────────
// 8 feeder branches terminate at the 6 outer-hex corners of the sigil.
// 2 thin branches converge to card centre for inner-hex / diamond energy.

interface CipherCircuitProps { w: number; h: number; circuitDurMs: number; id: number; }

function CipherCircuit({ w, h, circuitDurMs, id }: CipherCircuitProps) {
  const cx = w / 2;
  const cy = h / 2;
  const ds = circuitDurMs / 1000;
  const s  = 5 / 6; // sigil 80px / viewBox 96px

  const OTL = { x: cx - 19.5 * s, y: cy - 33.5 * s };
  const OTR = { x: cx + 19.5 * s, y: cy - 33.5 * s };
  const OR  = { x: cx + 39    * s, y: cy             };
  const OBR = { x: cx + 19.5 * s, y: cy + 33.5 * s  };
  const OBL = { x: cx - 19.5 * s, y: cy + 33.5 * s  };
  const OL  = { x: cx - 39    * s, y: cy             };

  const traceDur = ds * 0.46;

  const branches = [
    { d: `M ${cx-12},0 L ${cx-12},${cy*0.38} L ${OTL.x},${OTL.y}`,            dl: 0.000, col: "rgba(222,243,255,0.92)", sw: 0.90, bs: 2.3 },
    { d: `M 0,${cy-18} L ${w*0.22},${cy-18} L ${OTL.x},${OTL.y}`,             dl: 0.008, col: "rgba(200,240,255,0.86)", sw: 0.85, bs: 1.8 },
    { d: `M ${cx+12},0 L ${cx+12},${cy*0.38} L ${OTR.x},${OTR.y}`,            dl: 0.042, col: "rgba(218,198,255,0.82)", sw: 0.90, bs: 2.1 },
    { d: `M ${w},${cy} L ${OR.x+14},${cy} L ${OR.x},${OR.y}`,                  dl: 0.019, col: "rgba(185,228,255,0.87)", sw: 1.00, bs: 2.0 },
    { d: `M ${w},${cy+18} L ${w*0.80},${cy+18} L ${OBR.x},${OBR.y}`,          dl: 0.058, col: "rgba(220,200,255,0.78)", sw: 0.85, bs: 1.8 },
    { d: `M ${cx+12},${h} L ${cx+12},${h-cy*0.38} L ${OBR.x},${OBR.y}`,       dl: 0.013, col: "rgba(222,243,255,0.90)", sw: 0.90, bs: 2.0 },
    { d: `M ${cx-12},${h} L ${cx-12},${h-cy*0.38} L ${OBL.x},${OBL.y}`,       dl: 0.033, col: "rgba(200,238,255,0.84)", sw: 0.90, bs: 2.0 },
    { d: `M 0,${cy} L ${OL.x-14},${cy} L ${OL.x},${OL.y}`,                     dl: 0.036, col: "rgba(212,196,255,0.82)", sw: 1.00, bs: 2.0 },
    // thin centre feeders
    { d: `M ${cx},0 L ${cx},${cy*0.60} L ${cx},${cy}`,                          dl: 0.068, col: "rgba(200,228,255,0.50)", sw: 0.65, bs: 1.5 },
    { d: `M ${cx},${h} L ${cx},${h-cy*0.60} L ${cx},${cy}`,                     dl: 0.024, col: "rgba(200,240,255,0.50)", sw: 0.65, bs: 1.5 },
  ];

  const glowId = `cc-glow-${id}`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "screen", overflow: "visible" }}
    >
      <defs>
        <filter id={glowId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {branches.map((b, i) => (
        <g key={i} filter={`url(#${glowId})`}>
          <motion.path
            d={b.d} stroke={b.col} strokeWidth={b.sw} fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 0.55] }}
            transition={{
              pathLength: { duration: traceDur, delay: b.dl, ease: "easeInOut" },
              opacity:    { duration: ds * 0.80, delay: b.dl, times: [0, 0.12, 1] },
            }}
          />
          <circle r={b.bs} fill="white" opacity="0">
            <animate attributeName="opacity" values="0;1;0.85;0" dur={`${traceDur * 0.88}s`} begin={`${b.dl + 0.03}s`} fill="freeze" />
            <animateMotion dur={`${traceDur * 0.88}s`} begin={`${b.dl + 0.03}s`} fill="freeze" path={b.d} />
          </circle>
        </g>
      ))}

      {/* Small centre flash when thin feeders arrive */}
      <motion.circle cx={cx} cy={cy} r={4} fill="white"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 0.80, 0] }}
        transition={{ duration: ds * 0.28, delay: ds * 0.56, ease: "easeOut" }}
      />
      <motion.circle cx={cx} cy={cy} r={10} fill="rgba(180,230,255,0.40)"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 0.45, 0] }}
        transition={{ duration: ds * 0.26, delay: ds * 0.58, ease: "easeOut" }}
      />
    </svg>
  );
}

// ─── Sigil Progressive Draw ────────────────────────────────────────────────────
// Draws the sigil geometry progressively in prismatic white, then transitions all
// strokes/fills to the affinity colour when isCompressing becomes true.
//
// Outer hex — 8 segments:
//   Top edge:    OTL→mid-top  AND  OTR→mid-top  (meet at (48,14.5))
//   Bottom edge: OBR→mid-bot  AND  OBL→mid-bot  (meet at (48,81.5))
//   Other 4 edges: single unidirectional paths from their corner
//
// Inner hex — 2 opposing half-loops from top(48,23) and bottom(48,73) vertices
//
// Diamond — 4 arms from top+bottom meeting at left+right vertices:
//   top→right, top→left, bottom→right, bottom→left

interface CipherSigilDrawingProps {
  affinityHex: string;
  id: number;
  circuitDurMs: number;
  compressDurMs: number;
  isCompressing: boolean;
}

// Prismatic white — matches the circuit branch colour palette
const SIGIL_WHITE = "rgba(218,238,255,0.90)";

function CipherSigilDrawing({ affinityHex, id, circuitDurMs, compressDurMs, isCompressing }: CipherSigilDrawingProps) {
  const ds  = circuitDurMs  / 1000;
  const dsc = compressDurMs / 1000;

  // Colour targets — white during circuit, affinity during compress
  const strokeCol = isCompressing ? affinityHex : SIGIL_WHITE;
  const colorTransition = { duration: dsc * 0.75, ease: "easeInOut" as const };

  // ── Outer hex timing ──────────────────────────────────────────────────────
  // outerStart: just before first feeder (OTL, dl=0.00) arrives at 0.46*ds
  const outerStart  = ds * 0.42;
  const edgeDur     = ds * 0.44; // each segment completes well before circuit ends

  // Per-corner start offsets matching feeder delays
  const fOTL = 0.000; // first feeder
  const fOTR = 0.042;
  const fOR  = 0.019;
  const fOBR = 0.013; // earliest of the two OBR feeders
  const fOBL = 0.033;
  const fOL  = 0.036;

  // ── Inner hex timing ─────────────────────────────────────────────────────
  const innerStart = ds * 0.56;
  const innerDur   = ds * 0.36;

  // ── Diamond timing ────────────────────────────────────────────────────────
  const diamStart  = ds * 0.70;
  const diamDur    = ds * 0.22;

  const glowId  = `csd-glow-${id}`;
  const bloomId = `csd-bloom-${id}`;

  // ── Outer hex corner positions (sigil viewBox 96×96) ─────────────────────
  // OTL(28.5,14.5) OTR(67.5,14.5) OR(87,48) OBR(67.5,81.5) OBL(28.5,81.5) OL(9,48)
  // Mid-top = (48,14.5)  Mid-bottom = (48,81.5)

  // 8 outer hex path segments with their corner-matched delays
  const outerSegs: { d: string; dl: number }[] = [
    // top edge: both ends meet at (48,14.5)
    { d: "M 28.5,14.5 L 48,14.5",    dl: fOTL },  // OTL → mid-top
    { d: "M 67.5,14.5 L 48,14.5",    dl: fOTR },  // OTR → mid-top
    // top-right edge: OTR → OR
    { d: "M 67.5,14.5 L 87,48",      dl: fOTR },
    // right edge: OR → OBR
    { d: "M 87,48 L 67.5,81.5",      dl: fOR  },
    // bottom edge: both ends meet at (48,81.5)
    { d: "M 67.5,81.5 L 48,81.5",    dl: fOBR },  // OBR → mid-bottom
    { d: "M 28.5,81.5 L 48,81.5",    dl: fOBL },  // OBL → mid-bottom
    // bottom-left edge: OBL → OL
    { d: "M 28.5,81.5 L 9,48",       dl: fOBL },
    // left edge: OL → OTL
    { d: "M 9,48 L 28.5,14.5",       dl: fOL  },
  ];

  // Corner dot timing (appears when the first seg from that corner begins)
  const cornerDots: { cx: number; cy: number; dl: number }[] = [
    { cx: 28.5, cy: 14.5, dl: fOTL },
    { cx: 67.5, cy: 14.5, dl: fOTR },
    { cx: 87,   cy: 48,   dl: fOR  },
    { cx: 67.5, cy: 81.5, dl: fOBR },
    { cx: 28.5, cy: 81.5, dl: fOBL },
    { cx: 9,    cy: 48,   dl: fOL  },
  ];

  return (
    <svg viewBox="0 0 96 96" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={bloomId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* ── Bloom — fades in early, colour-matches outer hex ─────────── */}
      <motion.path
        d="M 28.5,14.5 L 67.5,14.5 L 87,48 L 67.5,81.5 L 28.5,81.5 L 9,48 Z"
        filter={`url(#${bloomId})`}
        fill="none"
        stroke={strokeCol}
        strokeWidth="8"
        initial={{ opacity: 0 }}
        animate={{ opacity: isCompressing ? 0.15 : 0.07, stroke: strokeCol }}
        transition={isCompressing ? colorTransition : { delay: outerStart, duration: edgeDur * 0.4, ease: "easeIn" }}
      />

      {/* ── Outer hex — 8 meeting segments ───────────────────────────── */}
      {outerSegs.map((seg, i) => (
        <motion.path
          key={`oh-${i}`}
          d={seg.d}
          fill="none"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
          initial={{ pathLength: 0, stroke: SIGIL_WHITE, strokeWidth: 1.4, opacity: 0 }}
          animate={{
            pathLength: 1,
            stroke:     strokeCol,
            strokeWidth: 1.4,
            opacity:    isCompressing ? 0.88 : 0.88,
          }}
          transition={{
            pathLength:  { delay: outerStart + seg.dl * ds, duration: edgeDur, ease: "easeInOut" },
            stroke:      isCompressing ? colorTransition : { duration: 0 },
            opacity:     { delay: outerStart + seg.dl * ds, duration: 0.12 },
          }}
        />
      ))}

      {/* Prismatic-white echo ring just inside outer hex (stays white — creates depth) */}
      <motion.path
        d="M 31.5,18 L 64.5,18 L 82,48 L 64.5,78 L 31.5,78 L 14,48 Z"
        fill="none"
        stroke="rgba(210,240,255,0.25)"
        strokeWidth="0.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: outerStart + 0.08, duration: edgeDur * 1.1, ease: "easeInOut" }}
      />

      {/* Corner arrival flash — spark + soft bloom fires when the branch reaches the waypoint */}
      {cornerDots.map((dot, i) => (
        <React.Fragment key={`cf-${i}`}>
          {/* Spark: bright white circle that flares as the branch arrives */}
          <motion.circle
            cx={dot.cx} cy={dot.cy}
            fill="white"
            initial={{ r: 2.6, opacity: 0 }}
            animate={{ r: [2.6, 5.2, 5.2], opacity: [0, 1.0, 0] }}
            transition={{ delay: outerStart + dot.dl * ds, duration: 0.28, times: [0, 0.22, 1], ease: "easeOut" }}
          />
          {/* Bloom: soft prismatic halo that expands and fades */}
          <motion.circle
            cx={dot.cx} cy={dot.cy}
            fill="rgba(210,238,255,0.36)"
            filter={`url(#${glowId})`}
            initial={{ r: 3.5, opacity: 0 }}
            animate={{ r: [3.5, 10, 11], opacity: [0, 0.48, 0] }}
            transition={{ delay: outerStart + dot.dl * ds + 0.02, duration: 0.32, times: [0, 0.28, 1], ease: "easeOut" }}
          />
        </React.Fragment>
      ))}

      {/* Midpoint arrival flash — fires when the two opposing segments converge at the edge midpoints */}
      {/* Top midpoint (48,14.5): OTL and OTR meet; OTR (fOTR) is the later arrival */}
      {/* Bottom midpoint (48,81.5): OBR and OBL meet; OBL (fOBL) is the later arrival */}
      {([
        { cx: 48, cy: 14.5, meetDl: fOTR },
        { cx: 48, cy: 81.5, meetDl: fOBL },
      ] as { cx: number; cy: number; meetDl: number }[]).map((mp, i) => {
        const fireAt = outerStart + mp.meetDl * ds + edgeDur;
        return (
          <React.Fragment key={`mpf-${i}`}>
            {/* Spark */}
            <motion.circle
              cx={mp.cx} cy={mp.cy}
              fill="white"
              initial={{ r: 2.6, opacity: 0 }}
              animate={{ r: [2.6, 5.2, 5.2], opacity: [0, 1.0, 0] }}
              transition={{ delay: fireAt, duration: 0.28, times: [0, 0.22, 1], ease: "easeOut" }}
            />
            {/* Bloom */}
            <motion.circle
              cx={mp.cx} cy={mp.cy}
              fill="rgba(210,238,255,0.36)"
              filter={`url(#${glowId})`}
              initial={{ r: 3.5, opacity: 0 }}
              animate={{ r: [3.5, 10, 11], opacity: [0, 0.48, 0] }}
              transition={{ delay: fireAt + 0.02, duration: 0.32, times: [0, 0.28, 1], ease: "easeOut" }}
            />
          </React.Fragment>
        );
      })}

      {/* Corner dots — pop in when each feeder corner begins drawing */}
      {cornerDots.map((dot, i) => (
        <motion.circle
          key={`dot-${i}`}
          cx={dot.cx} cy={dot.cy} r="2.6"
          initial={{ opacity: 0, scale: 0, fill: SIGIL_WHITE }}
          animate={{ opacity: 0.90, scale: 1, fill: strokeCol }}
          transition={{
            opacity:  { delay: outerStart + dot.dl * ds, duration: 0.10 },
            scale:    { delay: outerStart + dot.dl * ds, duration: 0.10, type: "spring", stiffness: 400 },
            fill:     isCompressing ? colorTransition : { duration: 0 },
          }}
        />
      ))}

      {/* ── Inner hex — 2 opposing half-loops meeting at top and bottom ── */}
      {/* Loop A: top(48,23) → right(71,34.5) → right-bottom(71,61.5) → bottom(48,73) */}
      <motion.path
        d="M 48,23 L 71,34.5 L 71,61.5 L 48,73"
        fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, stroke: SIGIL_WHITE, strokeWidth: 0.85, opacity: 0 }}
        animate={{ pathLength: 1, stroke: strokeCol, strokeWidth: 0.85, opacity: 0.52 }}
        transition={{
          pathLength: { delay: innerStart, duration: innerDur, ease: "easeInOut" },
          stroke:     isCompressing ? colorTransition : { duration: 0 },
          opacity:    { delay: innerStart, duration: 0.12 },
        }}
      />
      {/* Loop B: bottom(48,73) → left-bottom(25,61.5) → left(25,34.5) → top(48,23) */}
      <motion.path
        d="M 48,73 L 25,61.5 L 25,34.5 L 48,23"
        fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, stroke: SIGIL_WHITE, strokeWidth: 0.85, opacity: 0 }}
        animate={{ pathLength: 1, stroke: strokeCol, strokeWidth: 0.85, opacity: 0.52 }}
        transition={{
          pathLength: { delay: innerStart + 0.04, duration: innerDur, ease: "easeInOut" },
          stroke:     isCompressing ? colorTransition : { duration: 0 },
          opacity:    { delay: innerStart + 0.04, duration: 0.12 },
        }}
      />

      {/* ── Diamond — 4 arms from top+bottom meeting at left+right ──── */}
      {/* Diamond vertices: top(48,32.44) right(63.56,48) bottom(48,63.56) left(32.44,48) */}
      {/* Arms from top vertex */}
      <motion.path d="M 48,32.44 L 63.56,48" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0, stroke: SIGIL_WHITE, strokeWidth: 1.0, opacity: 0 }}
        animate={{ pathLength: 1, stroke: strokeCol, strokeWidth: 1.0, opacity: 0.75 }}
        transition={{
          pathLength: { delay: diamStart,        duration: diamDur, ease: "easeInOut" },
          stroke:     isCompressing ? colorTransition : { duration: 0 },
          opacity:    { delay: diamStart,        duration: 0.10 },
        }}
      />
      <motion.path d="M 48,32.44 L 32.44,48" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0, stroke: SIGIL_WHITE, strokeWidth: 1.0, opacity: 0 }}
        animate={{ pathLength: 1, stroke: strokeCol, strokeWidth: 1.0, opacity: 0.75 }}
        transition={{
          pathLength: { delay: diamStart + 0.02,  duration: diamDur, ease: "easeInOut" },
          stroke:     isCompressing ? colorTransition : { duration: 0 },
          opacity:    { delay: diamStart + 0.02,  duration: 0.10 },
        }}
      />
      {/* Arms from bottom vertex */}
      <motion.path d="M 48,63.56 L 63.56,48" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0, stroke: SIGIL_WHITE, strokeWidth: 1.0, opacity: 0 }}
        animate={{ pathLength: 1, stroke: strokeCol, strokeWidth: 1.0, opacity: 0.75 }}
        transition={{
          pathLength: { delay: diamStart + 0.01,  duration: diamDur, ease: "easeInOut" },
          stroke:     isCompressing ? colorTransition : { duration: 0 },
          opacity:    { delay: diamStart + 0.01,  duration: 0.10 },
        }}
      />
      <motion.path d="M 48,63.56 L 32.44,48" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0, stroke: SIGIL_WHITE, strokeWidth: 1.0, opacity: 0 }}
        animate={{ pathLength: 1, stroke: strokeCol, strokeWidth: 1.0, opacity: 0.75 }}
        transition={{
          pathLength: { delay: diamStart + 0.03,  duration: diamDur, ease: "easeInOut" },
          stroke:     isCompressing ? colorTransition : { duration: 0 },
          opacity:    { delay: diamStart + 0.03,  duration: 0.10 },
        }}
      />
      {/* Diamond vertex dots at left and right — appear when arms meet */}
      <motion.circle cx={63.56} cy={48} r="2.2"
        initial={{ opacity: 0, scale: 0, fill: SIGIL_WHITE }}
        animate={{ opacity: 0.90, scale: 1, fill: strokeCol }}
        transition={{
          opacity: { delay: diamStart + diamDur, duration: 0.10 },
          scale:   { delay: diamStart + diamDur, duration: 0.10, type: "spring", stiffness: 500 },
          fill:    isCompressing ? colorTransition : { duration: 0 },
        }}
      />
      <motion.circle cx={32.44} cy={48} r="2.2"
        initial={{ opacity: 0, scale: 0, fill: SIGIL_WHITE }}
        animate={{ opacity: 0.90, scale: 1, fill: strokeCol }}
        transition={{
          opacity: { delay: diamStart + diamDur + 0.02, duration: 0.10 },
          scale:   { delay: diamStart + diamDur + 0.02, duration: 0.10, type: "spring", stiffness: 500 },
          fill:    isCompressing ? colorTransition : { duration: 0 },
        }}
      />

      {/* ── Diamond fill — floods in during compress (affinity glow) ─── */}
      <motion.path
        d="M 48,32.44 L 63.56,48 L 48,63.56 L 32.44,48 Z"
        filter={`url(#${glowId})`}
        initial={{ fill: "transparent", opacity: 0 }}
        animate={{
          fill:    isCompressing ? affinityHex : "transparent",
          opacity: isCompressing ? 0.58 : 0,
        }}
        transition={isCompressing ? colorTransition : { duration: 0 }}
      />

      {/* Cross-traces — draw with inner hex, stay white (contrast accent) */}
      <motion.line x1="20" y1="28" x2="76" y2="68"
        stroke="rgba(210,235,255,0.30)" strokeWidth="0.6" strokeDasharray="2.8 4.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ delay: innerStart + innerDur * 0.4, duration: innerDur * 0.6, ease: "easeInOut" }}
      />
      <motion.line x1="20" y1="68" x2="76" y2="28"
        stroke="rgba(210,235,255,0.30)" strokeWidth="0.6" strokeDasharray="2.8 4.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ delay: innerStart + innerDur * 0.5, duration: innerDur * 0.5, ease: "easeInOut" }}
      />
    </svg>
  );
}

// ─── Cipher Sigil (static) ────────────────────────────────────────────────────
// Fully-formed affinity-coloured sigil used only for the travel + arrive phases.

export function CipherSigil({ affinityHex, id }: { affinityHex: string; id: number }) {
  const glowId  = `ca-glow-${id}`;
  const bloomId = `ca-bloom-${id}`;
  const whiteId = `ca-white-${id}`;

  return (
    <svg viewBox="0 0 96 96" className="w-full h-full" style={{ overflow: "visible" }}>
      <defs>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={bloomId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={whiteId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <polygon points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
        fill={affinityHex} opacity="0.13" filter={`url(#${bloomId})`} />
      <polygon points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
        fill="none" stroke={affinityHex} strokeWidth="1.4" opacity="0.88" filter={`url(#${glowId})`} />
      <polygon points="82,48 64.5,78 31.5,78 14,48 31.5,18 64.5,18"
        fill="none" stroke="rgba(210,240,255,0.28)" strokeWidth="0.6" opacity="1" filter={`url(#${whiteId})`} />
      <polygon points="71,61.5 48,73 25,61.5 25,34.5 48,23 71,34.5"
        fill="none" stroke={affinityHex} strokeWidth="0.85" opacity="0.52" />
      <rect x="37" y="37" width="22" height="22" rx="1" transform="rotate(45 48 48)"
        fill={affinityHex} opacity="0.58" filter={`url(#${glowId})`} />
      <rect x="41.5" y="41.5" width="13" height="13" transform="rotate(45 48 48)"
        fill="rgba(220,245,255,0.28)" opacity="1" />
      <rect x="45" y="45" width="6" height="6" transform="rotate(45 48 48)"
        fill="white" opacity="0.22" filter={`url(#${whiteId})`} />
      {([[87,48],[67.5,81.5],[28.5,81.5],[9,48],[28.5,14.5],[67.5,14.5]] as [number,number][]).map(([vx,vy],i) => (
        <circle key={i} cx={vx} cy={vy} r="2.6" fill={affinityHex} opacity="0.90" />
      ))}
      <line x1="20" y1="28" x2="76" y2="68" stroke={affinityHex} strokeWidth="0.6" opacity="0.36" strokeDasharray="2.8 4.2" />
      <line x1="20" y1="68" x2="76" y2="28" stroke={affinityHex} strokeWidth="0.6" opacity="0.36" strokeDasharray="2.8 4.2" />
      <line x1="87" y1="48" x2="67.5" y2="81.5" stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
      <line x1="28.5" y1="81.5" x2="9" y2="48"  stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
      <line x1="28.5" y1="14.5" x2="67.5" y2="14.5" stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
    </svg>
  );
}
