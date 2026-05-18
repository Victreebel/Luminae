import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ─── Cipher Aperture Animation ────────────────────────────────────────────────
// Shared Encrypt/Reserve animation — used by both tutorial and main game.
//
// Visual sequence:
//  1. Card lifts forward from its market-slot position
//  2. Thin luminous cipher scan-lines trace across the card face
//  3. Card compresses inward to a rotating diamond at screen centre
//  4. Hexagonal aperture sigil materialises at centre (nested hex + diamond prism)
//  5. Sigil travels to the encrypted-hand destination area
//  6. Destination pulse ring; sigil fades → onComplete fires
//
// Communicates: the Artifact is preserved / sealed, not spent or destroyed.
// Does NOT reuse forge visuals — this is a distinct scan→seal→travel sequence.
//
// mode="tutorial"  slower/readable  ~1.9 s total
// mode="game"      faster/snappy    ~0.8 s total

export type CipherApertureMode = "tutorial" | "game";

export interface CipherApertureProps {
  /** Unique key — increment to restart the animation. */
  animKey: number;
  mode: CipherApertureMode;
  /** Screen rect of the source card (from getBoundingClientRect). */
  sourceRect: { x: number; y: number; w: number; h: number };
  /** Affinity glow hex — drives scan lines and aperture colour. */
  affinityHex: string;
  /** Card name shown in the "Encrypted" pill label. */
  cardName: string;
  /** Pre-rendered card face JSX shown during lift/scan phases. */
  cardFace: React.ReactNode;
  /** Centre of the destination hand/reserved area on screen. */
  destPos?: { x: number; y: number };
  /** Show +1 Singularity indicator when player earned a Flux crystal. */
  gotFlux?: boolean;
  /** Called once when the full sequence completes. */
  onComplete?: () => void;
}

type Phase = "lift" | "scan" | "compress" | "sigil" | "travel" | "arrive";

const PHASE_ORDER: Phase[] = ["lift", "scan", "compress", "sigil", "travel", "arrive"];

const PHASE_DUR: Record<CipherApertureMode, Record<Phase, number>> = {
  game:     { lift: 80,  scan: 165, compress: 205, sigil: 70,  travel: 190, arrive: 90  },
  tutorial: { lift: 220, scan: 490, compress: 375, sigil: 130, travel: 400, arrive: 255 },
};

export function CipherApertureAnimation({
  animKey, mode, sourceRect, affinityHex, cardName, cardFace,
  destPos, gotFlux, onComplete,
}: CipherApertureProps) {
  const [phase, setPhase] = useState<Phase>("lift");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dur = PHASE_DUR[mode];

  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const dest = destPos ?? { x: window.innerWidth * 0.13, y: window.innerHeight * 0.72 };

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase("lift");

    let acc = 0;
    const next: Phase[]  = ["scan", "compress", "sigil", "travel", "arrive"];
    const from: Phase[] = ["lift", "scan",    "compress", "sigil", "travel"];
    next.forEach((p, i) => {
      acc += dur[from[i]];
      const t = setTimeout(() => setPhase(p), acc);
      timersRef.current.push(t);
    });
    acc += dur.arrive;
    timersRef.current.push(setTimeout(() => onComplete?.(), acc));
    return () => { timersRef.current.forEach(clearTimeout); };
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pi  = PHASE_ORDER.indexOf(phase);
  const at  = (p: Phase) => phase === p;
  const past = (p: Phase) => pi > PHASE_ORDER.indexOf(p);

  // Transform targets for the card during compress
  const compressX = cx - sourceRect.x - sourceRect.w / 2;
  const compressY = cy - sourceRect.y - sourceRect.h / 2;

  const showCard  = pi <= PHASE_ORDER.indexOf("compress");
  const showSigil = pi >= PHASE_ORDER.indexOf("sigil");
  const showPulse = at("arrive");
  const showLabel = pi >= PHASE_ORDER.indexOf("sigil");

  const dimOpacity =
    at("lift")     ? 0.28 :
    at("scan")     ? 0.42 :
    at("compress") ? 0.55 :
    at("sigil")    ? 0.55 :
    at("travel")   ? 0.38 : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">

      {/* Board dim */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: dimOpacity }}
        transition={{ duration: 0.22 }}
      />

      {/* ── Card: lift → scan → compress ─────────────────────────────── */}
      {showCard && (
        <motion.div
          style={{
            position: "fixed",
            left: sourceRect.x,
            top:  sourceRect.y,
            width:  sourceRect.w,
            height: sourceRect.h,
          }}
          initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
          animate={{
            x:       at("compress") ? compressX : 0,
            y:       (at("lift") || at("scan")) ? -16 : at("compress") ? compressY : 0,
            scale:   at("lift") ? 1.10 : at("scan") ? 1.13 : 0.18,
            rotate:  at("compress") ? 45 : 0,
            opacity: at("compress") ? [1, 0.80, 0] : 1,
          }}
          transition={{
            x: {
              duration: at("compress") ? dur.compress / 1000 : dur.lift / 1000,
              ease: at("compress") ? [0.55, 0, 0.9, 0.6] : [0.22, 1, 0.36, 1],
            },
            y: {
              duration: at("compress") ? dur.compress / 1000 : at("lift") ? dur.lift / 1000 : 0.1,
              ease: at("compress") ? [0.55, 0, 0.9, 0.6] : [0.22, 1, 0.36, 1],
            },
            scale:   { duration: at("compress") ? dur.compress / 1000 : at("lift") ? dur.lift / 1000 : 0.1 },
            rotate:  { duration: at("compress") ? dur.compress / 1000 : 0.08 },
            opacity: at("compress")
              ? { duration: dur.compress / 1000, times: [0, 0.46, 1] }
              : { duration: 0.08 },
          }}
        >
          {/* Card face */}
          <motion.div
            className="w-full h-full rounded-xl overflow-hidden"
            animate={{
              boxShadow: at("scan")
                ? `0 0 30px 10px ${affinityHex}55, 0 8px 32px rgba(0,0,0,0.6)`
                : "0 8px 32px rgba(0,0,0,0.45)",
            }}
            transition={{ duration: dur.scan / 1000, ease: "easeIn" }}
          >
            {cardFace}
          </motion.div>

          {/* Cipher scan overlay — mounted once scan phase starts */}
          {(at("scan") || past("scan")) && (
            <svg
              className="absolute inset-0 pointer-events-none"
              viewBox={`0 0 ${sourceRect.w} ${sourceRect.h}`}
              style={{
                width: "100%", height: "100%",
                mixBlendMode: "screen",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Corner cipher brackets — authentication markers */}
              {([
                `M 7,20 L 7,6 L 20,6`,
                `M ${sourceRect.w - 20},6 L ${sourceRect.w - 6},6 L ${sourceRect.w - 6},20`,
                `M 7,${sourceRect.h - 20} L 7,${sourceRect.h - 6} L 20,${sourceRect.h - 6}`,
                `M ${sourceRect.w - 20},${sourceRect.h - 6} L ${sourceRect.w - 6},${sourceRect.h - 6} L ${sourceRect.w - 6},${sourceRect.h - 20}`,
              ] as string[]).map((d, i) => (
                <motion.path
                  key={`brk-${i}`}
                  d={d}
                  stroke={affinityHex}
                  strokeWidth="1.6"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.88 }}
                  transition={{
                    duration: dur.scan * 0.38 / 1000,
                    delay: i * 0.045,
                    ease: "easeOut",
                  }}
                />
              ))}

              {/* Diagonal scan lines — sweep across the card face */}
              {([
                { d: `M 0,${sourceRect.h * 0.27} L ${sourceRect.w},${sourceRect.h * 0.63}`, dl: 0 },
                { d: `M 0,${sourceRect.h * 0.63} L ${sourceRect.w},${sourceRect.h * 0.31}`, dl: dur.scan * 0.22 / 1000 },
                { d: `M ${sourceRect.w * 0.22},0 L ${sourceRect.w * 0.78},${sourceRect.h}`,  dl: dur.scan * 0.11 / 1000 },
              ] as { d: string; dl: number }[]).map((ln, i) => (
                <motion.path
                  key={`ln-${i}`}
                  d={ln.d}
                  stroke={affinityHex}
                  strokeWidth={mode === "tutorial" ? 1.4 : 1.1}
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 0.92, 0.60] }}
                  transition={{
                    pathLength: { duration: dur.scan * 0.54 / 1000, delay: ln.dl, ease: "easeInOut" },
                    opacity:    { duration: dur.scan * 0.82 / 1000, delay: ln.dl, times: [0, 0.28, 1] },
                  }}
                />
              ))}
            </svg>
          )}
        </motion.div>
      )}

      {/* ── Sigil: hexagonal aperture → travel → arrive ───────────────── */}
      {showSigil && (
        <motion.div
          style={{ position: "fixed", width: 80, height: 80 }}
          initial={{ x: cx - 40, y: cy - 40, scale: 0.24, opacity: 0, rotate: 0 }}
          animate={{
            x:       at("sigil") ? cx - 40   : dest.x - 40,
            y:       at("sigil") ? cy - 40   : dest.y - 40,
            scale:   at("sigil") ? 1         : at("travel") ? 0.46 : 0.16,
            opacity: at("sigil") ? 1         : at("travel") ? 0.88 : 0,
            rotate:  (at("travel") || at("arrive")) ? 90 : 0,
          }}
          transition={{
            duration: at("sigil") ? dur.sigil / 1000 : at("travel") ? dur.travel / 1000 : dur.arrive / 1000,
            ease: at("travel") ? [0.55, 0, 0.20, 1] : [0.22, 1, 0.36, 1],
          }}
        >
          <CipherSigil affinityHex={affinityHex} id={animKey} />
        </motion.div>
      )}

      {/* Destination pulse ring */}
      {showPulse && (
        <motion.div
          style={{
            position: "fixed",
            left: dest.x - 36, top: dest.y - 36,
            width: 72, height: 72,
            borderRadius: "50%",
            border: `1.5px solid ${affinityHex}`,
          }}
          initial={{ scale: 0.5, opacity: 0.88 }}
          animate={{ scale: 3.0, opacity: 0 }}
          transition={{ duration: dur.arrive / 1000, ease: "easeOut" }}
        />
      )}

      {/* "Encrypted" pill label */}
      {showLabel && (
        <motion.div
          className="fixed left-0 right-0 flex justify-center items-center gap-2.5"
          style={{ top: cy - 104 }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: at("arrive") ? 0 : 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <span
            className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{
              color: affinityHex,
              background: `${affinityHex}1a`,
              border: `1px solid ${affinityHex}44`,
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

// ─── Cipher Sigil ─────────────────────────────────────────────────────────────
// Nested hexagonal aperture with a central diamond / folded-card prism.
// Flat-top outer hex (r≈39) + pointy-top inner hex (r≈25) + diamond core.
// Affinity-coloured throughout; no padlock, no sparkle dust, no destruction feel.
function CipherSigil({ affinityHex, id }: { affinityHex: string; id: number }) {
  const glowId  = `ca-glow-${id}`;
  const bloomId = `ca-bloom-${id}`;

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
      </defs>

      {/* Soft bloom behind the hex */}
      <polygon
        points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
        fill={affinityHex}
        opacity="0.13"
        filter={`url(#${bloomId})`}
      />

      {/* Outer hexagon (flat-top) */}
      <polygon
        points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
        fill="none"
        stroke={affinityHex}
        strokeWidth="1.4"
        opacity="0.88"
        filter={`url(#${glowId})`}
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
      {/* Inner diamond highlight */}
      <rect
        x="41.5" y="41.5" width="13" height="13"
        transform="rotate(45 48 48)"
        fill="white"
        opacity="0.18"
      />

      {/* Vertex marks at outer hex corners */}
      {([[87,48],[67.5,81.5],[28.5,81.5],[9,48],[28.5,14.5],[67.5,14.5]] as [number,number][]).map(([vx,vy],i) => (
        <circle key={i} cx={vx} cy={vy} r="2.6" fill={affinityHex} opacity="0.90" />
      ))}

      {/* Cipher cross-traces — subtle dashed diagonals across the prism */}
      <line x1="20" y1="28" x2="76" y2="68" stroke={affinityHex} strokeWidth="0.6" opacity="0.36" strokeDasharray="2.8 4.2" />
      <line x1="20" y1="68" x2="76" y2="28" stroke={affinityHex} strokeWidth="0.6" opacity="0.36" strokeDasharray="2.8 4.2" />

      {/* Alternating outer-edge accents — 3 of 6 edges brightened */}
      <line x1="87" y1="48"   x2="67.5" y2="81.5" stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
      <line x1="28.5" y1="81.5" x2="9"  y2="48"   stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
      <line x1="28.5" y1="14.5" x2="67.5" y2="14.5" stroke={affinityHex} strokeWidth="1.9" opacity="0.32" strokeLinecap="round" />
    </svg>
  );
}
