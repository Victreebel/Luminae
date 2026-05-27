import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Check } from 'lucide-react';
import { CipherSigil } from '@/components/CipherApertureAnimation';

// ── Shared geometry ───────────────────────────────────────────────────────────
const CHAMFER = 12;
const CLIP = `polygon(
  ${CHAMFER}px 0%, calc(100% - ${CHAMFER}px) 0%,
  100% ${CHAMFER}px, 100% calc(100% - ${CHAMFER}px),
  calc(100% - ${CHAMFER}px) 100%, ${CHAMFER}px 100%,
  0% calc(100% - ${CHAMFER}px), 0% ${CHAMFER}px
)`;

// ── Corner nub ────────────────────────────────────────────────────────────────
function CornerNub({ style, color, glow }: { style: React.CSSProperties; color: string; glow?: string }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', width: 13, height: 13,
      transform: 'rotate(45deg)', background: color,
      pointerEvents: 'none', zIndex: 4,
      boxShadow: glow ?? undefined,
      ...style,
    }} />
  );
}

// ── Centre-edge diamond ───────────────────────────────────────────────────────
function EdgeDiamond({ style, color, glow }: { style: React.CSSProperties; color: string; glow?: string }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', left: '50%', width: 8, height: 8,
      transform: 'translateX(-50%) rotate(45deg)', background: color,
      pointerEvents: 'none', zIndex: 4,
      boxShadow: glow ?? undefined,
      ...style,
    }} />
  );
}

// ── Top-cap interior highlight stripe ────────────────────────────────────────
// Creates the 3D convex "cap" illusion: overhead light hitting the interior top face
function TopCapStripe({ color }: { color: string }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', left: '11%', right: '11%',
      top: 7, height: 2, zIndex: 3, pointerEvents: 'none',
      background: `linear-gradient(90deg, transparent 0%, ${color} 20%, ${color} 80%, transparent 100%)`,
      borderRadius: 1,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGE — Solar Gold / Forged Metal
// ─────────────────────────────────────────────────────────────────────────────

const FORGE_BG_IDLE = [
  'radial-gradient(ellipse at 30% 0%,   rgba(210,124,16,0.38) 0%, transparent 50%)',
  'radial-gradient(ellipse at 60% 58%,  rgba(148,84,4,0.20)   0%, transparent 44%)',
  'radial-gradient(ellipse at 88% 100%, rgba(78,44,2,0.22)    0%, transparent 46%)',
  // vertical convex depth: darker top+bottom edge, lighter centre band
  'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(60,42,8,0.12) 20%, rgba(80,56,10,0.06) 50%, rgba(30,18,0,0.16) 80%, rgba(0,0,0,0.32) 100%)',
  'linear-gradient(158deg, #171410 0%, #222018 48%, #151210 100%)',
].join(', ');

const FORGE_BG_PENDING = [
  'radial-gradient(ellipse at 50% 50%, rgba(240,142,18,0.40) 0%, rgba(165,88,5,0.24) 38%, transparent 70%)',
  'radial-gradient(ellipse at 25% 85%, rgba(105,58,2,0.28)   0%, transparent 48%)',
  'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(80,50,5,0.10) 25%, rgba(90,60,5,0.08) 50%, rgba(25,12,0,0.20) 78%, rgba(0,0,0,0.45) 100%)',
  'linear-gradient(158deg, #111008 0%, #1c190c 48%, #100e07 100%)',
].join(', ');

// 8-layer shadow stack — IDLE state (normal bevel: top=bright, bottom=dark)
const FORGE_INSET_IDLE = [
  'inset 0 0 0 0.75px rgba(255,248,210,0.52)',
  'inset 0 0 0 2px    rgba(32,22,2,0.99)',
  'inset 0 0 0 4px    rgba(208,158,35,0.98)',
  'inset 0 0 0 5.5px  rgba(38,26,2,0.96)',
  'inset 0 0 0 6.5px  rgba(172,126,20,0.82)',
  'inset 0 1px 0 0px  rgba(255,252,215,0.28)',    // top bright (normal bevel)
  'inset 0 -1px 0 0px rgba(0,0,0,0.82)',           // bottom dark
  'inset 0 0 30px 0px rgba(120,72,3,0.12)',
].join(', ');

// HOVER — same structure, vivid gold
const FORGE_INSET_HOVER = [
  'inset 0 0 0 0.75px rgba(255,252,225,0.88)',
  'inset 0 0 0 2px    rgba(28,18,1,0.99)',
  'inset 0 0 0 4px    rgba(245,192,50,0.99)',
  'inset 0 0 0 5.5px  rgba(34,22,1,0.96)',
  'inset 0 0 0 6.5px  rgba(222,172,40,0.96)',
  'inset 0 1px 0 0px  rgba(255,255,238,0.50)',
  'inset 0 -1px 0 0px rgba(0,0,0,0.82)',
  'inset 0 0 30px 0px rgba(190,118,8,0.32)',
].join(', ');

// PENDING DIM — inverted bevel (top=dark, bottom=bright = "pressed in") + amber bloom
const FORGE_PENDING_DIM = [
  'inset 0 0 0 0.75px rgba(255,240,178,0.65)',
  'inset 0 0 0 2px    rgba(28,18,1,0.99)',
  'inset 0 0 0 4px    rgba(215,162,28,0.94)',
  'inset 0 0 0 5.5px  rgba(34,22,1,0.96)',
  'inset 0 0 0 6.5px  rgba(188,140,22,0.88)',
  'inset 0 1px 0 0px  rgba(0,0,0,0.62)',           // top DARK (pressed-in bevel)
  'inset 0 -1px 0 0px rgba(255,248,205,0.28)',     // bottom BRIGHT (pressed-in)
  'inset 0 0 30px 0px rgba(175,102,5,0.28)',
].join(', ');

// PENDING BRIGHT — pulse peak: vivid frame, strong bloom, bevel stays inverted
const FORGE_PENDING_BRIGHT = [
  'inset 0 0 0 0.75px rgba(255,255,235,0.95)',
  'inset 0 0 0 2px    rgba(24,14,0,0.99)',
  'inset 0 0 0 4px    rgba(255,200,55,1.00)',
  'inset 0 0 0 5.5px  rgba(30,18,0,0.96)',
  'inset 0 0 0 6.5px  rgba(235,180,42,0.99)',
  'inset 0 1px 0 0px  rgba(0,0,0,0.70)',           // top dark (stays pressed)
  'inset 0 -1px 0 0px rgba(255,255,215,0.50)',     // bottom bright (stays pressed)
  'inset 0 0 30px 0px rgba(228,135,10,0.58)',      // strong interior bloom at peak
].join(', ');

const FORGE_FILTER_IDLE  = 'drop-shadow(0 0 5px rgba(185,118,8,0.34)) drop-shadow(0 0 12px rgba(155,90,0,0.18)) drop-shadow(0 0 22px rgba(130,68,0,0.09))';
const FORGE_FILTER_HOVER = 'drop-shadow(0 0 18px rgba(248,182,22,0.82)) drop-shadow(0 0 36px rgba(228,142,0,0.52)) drop-shadow(0 0 65px rgba(200,100,0,0.26))';
const FORGE_FILTER_PEND_DIM    = 'drop-shadow(0 0 8px  rgba(220,158,14,0.55)) drop-shadow(0 0 18px rgba(182,110,0,0.28)) drop-shadow(0 0 38px rgba(148,82,0,0.14))';
const FORGE_FILTER_PEND_BRIGHT = 'drop-shadow(0 0 16px rgba(255,195,22,0.88)) drop-shadow(0 0 32px rgba(235,152,0,0.58)) drop-shadow(0 0 60px rgba(205,115,0,0.28))';

// ── Forge Button ──────────────────────────────────────────────────────────────
export interface ForgeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isPending?: boolean;
  isSent?: boolean;
  label: string;
  subtitle?: string;
  confirmHex?: string;
  confirmGlow?: string;
  darkText?: boolean;
}

export function ForgeButton({
  onClick, disabled, isPending, isSent,
  label, subtitle = 'Manifest Artifact',
  confirmGlow = '#f59e0b', darkText,
}: ForgeButtonProps) {
  const nubColor  = isPending ? `${confirmGlow}ee` : 'rgba(208,160,34,0.92)';
  const diaColor  = isPending ? `${confirmGlow}ff` : 'rgba(228,180,42,0.97)';
  const nubGlow   = isPending
    ? `0 0 8px ${confirmGlow}aa`
    : '0 0 5px rgba(255,210,60,0.45)';
  const diaGlow   = isPending
    ? `0 0 10px ${confirmGlow}cc, 0 0 20px ${confirmGlow}66`
    : '0 0 6px rgba(255,218,75,0.55)';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center overflow-hidden btn-forge-idle"
      style={{
        height: 72,
        clipPath: CLIP,
        background: isPending ? FORGE_BG_PENDING : FORGE_BG_IDLE,
        opacity: disabled ? 0.38 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none', border: 'none', padding: 0,
        color: isPending ? (darkText ? '#1a1a1a' : '#fff') : '#F6ECD0',
        WebkitTapHighlightColor: 'transparent',
      }}
      animate={isPending ? {
        boxShadow: [FORGE_PENDING_DIM, FORGE_PENDING_BRIGHT],
        filter: [FORGE_FILTER_PEND_DIM, FORGE_FILTER_PEND_BRIGHT],
        y: 1,
      } : {
        boxShadow: FORGE_INSET_IDLE,
        filter: FORGE_FILTER_IDLE,
        y: 0,
      }}
      whileHover={disabled || isPending ? {} : {
        boxShadow: FORGE_INSET_HOVER,
        filter: FORGE_FILTER_HOVER,
      }}
      whileTap={disabled ? {} : {
        scale: 0.96,
        y: isPending ? 3 : 1,
        transition: { duration: 0.07 },
      }}
      transition={isPending ? {
        boxShadow: { duration: 1.15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
        filter:    { duration: 1.15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
        y:         { duration: 0.12 },
      } : {
        boxShadow: { duration: 0.20 },
        filter:    { duration: 0.20 },
        y:         { duration: 0.15 },
      }}
    >
      {/* Interior top cap highlight — 3D convex illusion */}
      <TopCapStripe color={isPending ? `rgba(255,248,200,0.18)` : `rgba(255,248,200,0.16)`} />

      {/* Ambient interior glow — pulses via CSS animation */}
      <div aria-hidden className={isPending ? 'forge-ambient-pending' : 'forge-ambient'} style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: isPending
          ? 'radial-gradient(ellipse at 50% 55%, rgba(228,135,10,0.42) 0%, rgba(160,85,3,0.20) 40%, transparent 68%)'
          : 'radial-gradient(ellipse at 38% 52%, rgba(210,128,10,0.30) 0%, rgba(140,80,4,0.14) 42%, transparent 68%)',
      }} />

      {/* Corner nubs — glow on hover/pending */}
      <CornerNub style={{ top: -5.5,    left: -5.5   }} color={nubColor} glow={nubGlow} />
      <CornerNub style={{ top: -5.5,    right: -5.5  }} color={nubColor} glow={nubGlow} />
      <CornerNub style={{ bottom: -5.5, left: -5.5   }} color={nubColor} glow={nubGlow} />
      <CornerNub style={{ bottom: -5.5, right: -5.5  }} color={nubColor} glow={nubGlow} />

      {/* Centre edge diamonds */}
      <EdgeDiamond style={{ top: 2.5 }}    color={diaColor} glow={diaGlow} />
      <EdgeDiamond style={{ bottom: 2.5 }} color={diaColor} glow={diaGlow} />

      {/* Medallion section */}
      <div aria-hidden className="flex-shrink-0 flex items-center justify-center" style={{
        width: 66, height: '100%', position: 'relative', zIndex: 1,
        background: [
          'radial-gradient(circle at 54% 44%, rgba(185,112,14,0.58) 0%, rgba(85,50,4,0.38) 52%, transparent 78%)',
          'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(110,68,6,0.20) 30%, rgba(44,26,2,0.18) 70%, rgba(0,0,0,0.28) 100%)',
        ].join(', '),
        borderRight: '1px solid rgba(165,125,28,0.22)',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: 0, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(255,228,120,0.42) 30%, rgba(255,208,75,0.30) 70%, transparent)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', right: -1, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.58) 30%, rgba(0,0,0,0.46) 70%, transparent)',
        }} />
        <div
          className={`flex items-center justify-center rounded-full ${isPending ? 'forge-medallion-pending' : 'forge-medallion-glow'}`}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: isPending
              ? 'radial-gradient(circle at 38% 34%, #e89c1e 0%, #9a6414 50%, #4e3405 100%)'
              : 'radial-gradient(circle at 38% 34%, #d4941e 0%, #8a5c12 50%, #422e04 100%)',
          }}
        >
          <Gavel className="h-[21px] w-[21px]" style={{
            color: isPending ? '#FFF2AA' : '#FFE89A',
            filter: isPending
              ? 'drop-shadow(0 0 8px rgba(255,220,60,0.95)) drop-shadow(0 1px 3px rgba(0,0,0,0.70))'
              : 'drop-shadow(0 0 6px rgba(255,208,60,0.82)) drop-shadow(0 1px 3px rgba(0,0,0,0.70))',
          }} />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-start justify-center flex-1 px-4" style={{ position: 'relative', zIndex: 1, gap: 0 }}>
        <AnimatePresence mode="wait" initial={false}>
          {isSent ? (
            <motion.span key="sent" className="flex items-center gap-1.5 text-emerald-300 font-bold"
              style={{ fontSize: 14, letterSpacing: '0.06em' }}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.10 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}>
              <Check className="h-4 w-4" />Sent!
            </motion.span>
          ) : (
            <motion.span key="label" className="flex flex-col items-start"
              initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.10 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <span className="font-bold uppercase leading-none" style={{
                fontSize: 17, letterSpacing: '0.15em',
                textShadow: isPending
                  ? `0 0 24px ${confirmGlow}bb, 0 0 10px ${confirmGlow}77, 0 1px 3px rgba(0,0,0,0.80)`
                  : '0 0 20px rgba(255,228,110,0.45), 0 0 8px rgba(255,200,60,0.28), 0 1px 3px rgba(0,0,0,0.80)',
              }}>
                {label}
              </span>
              <span className="leading-none" style={{
                fontSize: 10.5, marginTop: 5,
                opacity: isPending ? 0.78 : 0.52,
                letterSpacing: '0.09em',
                textShadow: '0 1px 2px rgba(0,0,0,0.65)',
              }}>
                {isPending ? '— Confirming… —' : `— ${subtitle} —`}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENCRYPT — Obsidian Glass + Prismatic Edge
// ─────────────────────────────────────────────────────────────────────────────

const ENCRYPT_BG_IDLE = [
  'radial-gradient(ellipse at 28% 0%,   rgba(92,70,152,0.42) 0%, transparent 52%)',
  'radial-gradient(ellipse at 62% 58%,  rgba(55,40,105,0.25) 0%, transparent 45%)',
  'radial-gradient(ellipse at 85% 100%, rgba(25,14,55,0.28)  0%, transparent 46%)',
  'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(30,22,58,0.10) 20%, rgba(40,30,70,0.05) 50%, rgba(12,6,28,0.16) 80%, rgba(0,0,0,0.36) 100%)',
  'linear-gradient(158deg, #08080e 0%, #0d0d18 48%, #070710 100%)',
].join(', ');

const ENCRYPT_BG_PENDING = [
  'radial-gradient(ellipse at 50% 50%, rgba(115,95,198,0.44) 0%, rgba(65,48,125,0.26) 38%, transparent 70%)',
  'radial-gradient(ellipse at 25% 85%, rgba(30,18,68,0.32)   0%, transparent 48%)',
  'linear-gradient(180deg, rgba(0,0,0,0.46) 0%, rgba(40,28,80,0.12) 25%, rgba(50,35,90,0.08) 50%, rgba(15,8,34,0.22) 78%, rgba(0,0,0,0.48) 100%)',
  'linear-gradient(158deg, #060610 0%, #0e0e1e 48%, #050510 100%)',
].join(', ');

// 8-layer shadow stack — same structure as Forge for consistent interpolation

const ENCRYPT_INSET_IDLE = [
  'inset 0 0 0 0.75px rgba(235,228,255,0.50)',
  'inset 0 0 0 2px    rgba(12,8,24,0.99)',
  'inset 0 0 0 4px    rgba(180,168,238,0.92)',
  'inset 0 0 0 5.5px  rgba(9,6,20,0.97)',
  'inset 0 0 0 6.5px  rgba(142,130,200,0.76)',
  'inset 0 1px 0 0px  rgba(238,232,255,0.24)',    // top bright (normal bevel)
  'inset 0 -1px 0 0px rgba(0,0,0,0.86)',
  'inset 0 0 30px 0px rgba(68,52,120,0.14)',
].join(', ');

const ENCRYPT_INSET_HOVER = [
  'inset 0 0 0 0.75px rgba(248,244,255,0.90)',
  'inset 0 0 0 2px    rgba(10,6,22,0.99)',
  'inset 0 0 0 4px    rgba(215,205,255,0.99)',
  'inset 0 0 0 5.5px  rgba(7,4,18,0.97)',
  'inset 0 0 0 6.5px  rgba(192,180,248,0.94)',
  'inset 0 1px 0 0px  rgba(255,252,255,0.52)',
  'inset 0 -1px 0 0px rgba(0,0,0,0.86)',
  'inset 0 0 30px 0px rgba(105,88,172,0.30)',
].join(', ');

// PENDING — inverted bevel + violet bloom
const ENCRYPT_PENDING_DIM = [
  'inset 0 0 0 0.75px rgba(228,222,255,0.68)',
  'inset 0 0 0 2px    rgba(10,6,22,0.99)',
  'inset 0 0 0 4px    rgba(185,172,240,0.96)',
  'inset 0 0 0 5.5px  rgba(8,4,20,0.97)',
  'inset 0 0 0 6.5px  rgba(152,140,212,0.88)',
  'inset 0 1px 0 0px  rgba(0,0,0,0.68)',           // top dark (pressed-in)
  'inset 0 -1px 0 0px rgba(225,218,255,0.30)',     // bottom bright (pressed-in)
  'inset 0 0 30px 0px rgba(90,72,158,0.32)',
].join(', ');

const ENCRYPT_PENDING_BRIGHT = [
  'inset 0 0 0 0.75px rgba(252,248,255,0.96)',
  'inset 0 0 0 2px    rgba(8,4,20,0.99)',
  'inset 0 0 0 4px    rgba(225,218,255,1.00)',
  'inset 0 0 0 5.5px  rgba(6,3,16,0.97)',
  'inset 0 0 0 6.5px  rgba(205,195,255,0.99)',
  'inset 0 1px 0 0px  rgba(0,0,0,0.74)',           // top dark (stays pressed)
  'inset 0 -1px 0 0px rgba(238,232,255,0.52)',     // bottom bright (stays pressed)
  'inset 0 0 30px 0px rgba(115,95,195,0.62)',      // strong violet bloom at peak
].join(', ');

const ENCRYPT_FILTER_IDLE  = 'drop-shadow(0 0 5px rgba(145,125,228,0.32)) drop-shadow(0 0 12px rgba(105,85,188,0.18)) drop-shadow(0 0 22px rgba(80,60,155,0.09))';
const ENCRYPT_FILTER_HOVER = 'drop-shadow(0 0 18px rgba(198,185,255,0.80)) drop-shadow(0 0 36px rgba(158,138,248,0.50)) drop-shadow(0 0 65px rgba(125,100,225,0.25))';
const ENCRYPT_FILTER_PEND_DIM    = 'drop-shadow(0 0 8px  rgba(175,160,248,0.58)) drop-shadow(0 0 18px rgba(135,115,215,0.30)) drop-shadow(0 0 38px rgba(105,85,185,0.15))';
const ENCRYPT_FILTER_PEND_BRIGHT = 'drop-shadow(0 0 16px rgba(215,205,255,0.88)) drop-shadow(0 0 32px rgba(178,162,252,0.58)) drop-shadow(0 0 62px rgba(148,128,235,0.28))';

// ── Encrypt Button ────────────────────────────────────────────────────────────
export interface EncryptButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isPending?: boolean;
  isSent?: boolean;
  label: string;
  subtitle?: string;
  sigilId?: number;
}

export function EncryptButton({
  onClick, disabled, isPending, isSent,
  label, subtitle = 'Reserve Pattern', sigilId = 9001,
}: EncryptButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center overflow-hidden btn-encrypt-idle"
      style={{
        height: 72,
        clipPath: CLIP,
        background: isPending ? ENCRYPT_BG_PENDING : ENCRYPT_BG_IDLE,
        opacity: disabled ? 0.38 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none', border: 'none', padding: 0,
        color: '#DBD6FF',
        WebkitTapHighlightColor: 'transparent',
      }}
      animate={isPending ? {
        boxShadow: [ENCRYPT_PENDING_DIM, ENCRYPT_PENDING_BRIGHT],
        filter: [ENCRYPT_FILTER_PEND_DIM, ENCRYPT_FILTER_PEND_BRIGHT],
        y: 1,
      } : {
        boxShadow: ENCRYPT_INSET_IDLE,
        filter: ENCRYPT_FILTER_IDLE,
        y: 0,
      }}
      whileHover={disabled || isPending ? {} : {
        boxShadow: ENCRYPT_INSET_HOVER,
        filter: ENCRYPT_FILTER_HOVER,
      }}
      whileTap={disabled ? {} : {
        scale: 0.96,
        y: isPending ? 3 : 1,
        transition: { duration: 0.07 },
      }}
      transition={isPending ? {
        boxShadow: { duration: 1.30, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
        filter:    { duration: 1.30, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
        y:         { duration: 0.12 },
      } : {
        boxShadow: { duration: 0.20 },
        filter:    { duration: 0.20 },
        y:         { duration: 0.15 },
      }}
    >
      {/* Interior top cap highlight */}
      <TopCapStripe color={isPending ? 'rgba(215,208,255,0.16)' : 'rgba(218,212,255,0.14)'} />

      {/* Ambient glow */}
      <div aria-hidden className={isPending ? 'encrypt-ambient-pending' : 'encrypt-ambient'} style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: isPending
          ? 'radial-gradient(ellipse at 50% 55%, rgba(115,95,200,0.42) 0%, rgba(68,50,128,0.22) 40%, transparent 68%)'
          : 'radial-gradient(ellipse at 38% 52%, rgba(105,85,185,0.32) 0%, rgba(65,48,118,0.16) 40%, transparent 68%)',
      }} />

      {/* Corner nubs */}
      <CornerNub style={{ top: -5.5,    left: -5.5   }} color={isPending ? 'rgba(225,218,255,0.90)' : 'rgba(205,198,252,0.76)'} glow={isPending ? '0 0 8px rgba(200,190,255,0.80)' : '0 0 5px rgba(185,175,245,0.45)'} />
      <CornerNub style={{ top: -5.5,    right: -5.5  }} color={isPending ? 'rgba(225,218,255,0.90)' : 'rgba(205,198,252,0.76)'} glow={isPending ? '0 0 8px rgba(200,190,255,0.80)' : '0 0 5px rgba(185,175,245,0.45)'} />
      <CornerNub style={{ bottom: -5.5, left: -5.5   }} color={isPending ? 'rgba(225,218,255,0.90)' : 'rgba(205,198,252,0.76)'} glow={isPending ? '0 0 8px rgba(200,190,255,0.80)' : '0 0 5px rgba(185,175,245,0.45)'} />
      <CornerNub style={{ bottom: -5.5, right: -5.5  }} color={isPending ? 'rgba(225,218,255,0.90)' : 'rgba(205,198,252,0.76)'} glow={isPending ? '0 0 8px rgba(200,190,255,0.80)' : '0 0 5px rgba(185,175,245,0.45)'} />

      {/* Centre edge diamonds */}
      <EdgeDiamond style={{ top: 2.5 }}    color={isPending ? 'rgba(242,238,255,0.99)' : 'rgba(228,222,255,0.97)'} glow={isPending ? '0 0 10px rgba(210,200,255,0.90), 0 0 20px rgba(190,180,255,0.55)' : '0 0 6px rgba(210,205,255,0.55)'} />
      <EdgeDiamond style={{ bottom: 2.5 }} color={isPending ? 'rgba(242,238,255,0.99)' : 'rgba(228,222,255,0.97)'} glow={isPending ? '0 0 10px rgba(210,200,255,0.90), 0 0 20px rgba(190,180,255,0.55)' : '0 0 6px rgba(210,205,255,0.55)'} />

      {/* Prismatic side stripes */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(255,115,55,0.62) 0%, rgba(210,175,255,0.32) 50%, rgba(55,115,255,0.62) 100%)',
      }} />
      <div aria-hidden style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(55,115,255,0.62) 0%, rgba(210,175,255,0.32) 50%, rgba(255,115,55,0.62) 100%)',
      }} />

      {/* Medallion section */}
      <div aria-hidden className="flex-shrink-0 flex items-center justify-center" style={{
        width: 66, height: '100%', position: 'relative', zIndex: 1,
        background: [
          'radial-gradient(circle at 54% 42%, rgba(95,72,158,0.58) 0%, rgba(30,22,65,0.38) 52%, transparent 78%)',
          'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(55,42,100,0.22) 30%, rgba(16,11,35,0.20) 70%, rgba(0,0,0,0.30) 100%)',
        ].join(', '),
        borderRight: '1px solid rgba(162,150,228,0.18)',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: 0, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(205,195,255,0.40) 30%, rgba(185,172,240,0.30) 70%, transparent)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', right: -1, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.62) 30%, rgba(0,0,0,0.50) 70%, transparent)',
        }} />
        <div
          className={`flex items-center justify-center rounded-full ${isPending ? 'encrypt-medallion-pending' : 'encrypt-medallion-glow'}`}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: isPending
              ? 'radial-gradient(circle at 38% 34%, #3e3468 0%, #221a50 52%, #100d28 100%)'
              : 'radial-gradient(circle at 38% 34%, #342a5c 0%, #1c1540 52%, #0e0a22 100%)',
          }}
        >
          <span className="flex items-center justify-center" style={{
            width: 24, height: 24,
            filter: isPending
              ? 'drop-shadow(0 0 9px rgba(225,215,255,0.95)) drop-shadow(0 1px 3px rgba(0,0,0,0.75))'
              : 'drop-shadow(0 0 7px rgba(210,195,255,0.85)) drop-shadow(0 1px 3px rgba(0,0,0,0.75))',
          }}>
            <CipherSigil affinityHex={isPending ? '#e8e4ff' : '#d4cfff'} id={sigilId} />
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-start justify-center flex-1 px-4" style={{ position: 'relative', zIndex: 1, gap: 0 }}>
        <AnimatePresence mode="wait" initial={false}>
          {isSent ? (
            <motion.span key="sent" className="flex items-center gap-1.5 text-emerald-300 font-bold"
              style={{ fontSize: 14, letterSpacing: '0.06em' }}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.10 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}>
              <Check className="h-4 w-4" />Sent!
            </motion.span>
          ) : (
            <motion.span key="label" className="flex flex-col items-start"
              initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.10 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <span className="font-bold uppercase leading-none" style={{
                fontSize: 17, letterSpacing: '0.15em',
                textShadow: isPending
                  ? '0 0 24px rgba(215,205,255,0.70), 0 0 10px rgba(185,172,252,0.45), 0 1px 3px rgba(0,0,0,0.85)'
                  : '0 0 20px rgba(195,182,255,0.42), 0 0 8px rgba(165,148,238,0.28), 0 1px 3px rgba(0,0,0,0.85)',
              }}>
                {label}
              </span>
              <span className="leading-none" style={{
                fontSize: 10.5, marginTop: 5,
                opacity: isPending ? 0.78 : 0.48,
                letterSpacing: '0.09em',
                textShadow: '0 1px 2px rgba(0,0,0,0.75)',
              }}>
                {isPending ? '— Encoding… —' : `— ${subtitle} —`}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
