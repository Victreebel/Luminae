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
  'radial-gradient(ellipse at 28% 0%,   rgba(195,210,240,0.22) 0%, transparent 52%)',
  'radial-gradient(ellipse at 62% 58%,  rgba(155,175,220,0.12) 0%, transparent 45%)',
  'radial-gradient(ellipse at 85% 100%, rgba(110,135,195,0.15) 0%, transparent 46%)',
  'linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(20,22,30,0.10) 20%, rgba(26,28,38,0.05) 50%, rgba(10,10,18,0.16) 80%, rgba(0,0,0,0.38) 100%)',
  'linear-gradient(158deg, #080810 0%, #0c0c16 48%, #07070e 100%)',
].join(', ');

const ENCRYPT_BG_PENDING = [
  'radial-gradient(ellipse at 50% 50%, rgba(230,238,255,0.36) 0%, rgba(185,200,245,0.18) 38%, transparent 70%)',
  'radial-gradient(ellipse at 25% 85%, rgba(18,20,35,0.30)    0%, transparent 48%)',
  'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(26,28,45,0.12) 25%, rgba(32,35,52,0.08) 50%, rgba(10,10,20,0.22) 78%, rgba(0,0,0,0.52) 100%)',
  'linear-gradient(158deg, #05050e 0%, #09091a 48%, #04040c 100%)',
].join(', ');

// 8-layer shadow stack — prismatic-white crystal frame

const ENCRYPT_INSET_IDLE = [
  'inset 0 0 0 0.75px rgba(255,255,255,0.62)',
  'inset 0 0 0 2px    rgba(8,8,14,0.99)',
  'inset 0 0 0 4px    rgba(232,236,252,0.94)',
  'inset 0 0 0 5.5px  rgba(6,6,12,0.98)',
  'inset 0 0 0 6.5px  rgba(195,202,228,0.78)',
  'inset 0 1px 0 0px  rgba(255,255,255,0.28)',     // top bright (normal bevel)
  'inset 0 -1px 0 0px rgba(0,0,0,0.90)',
  'inset 0 0 30px 0px rgba(165,188,255,0.08)',
].join(', ');

const ENCRYPT_INSET_HOVER = [
  'inset 0 0 0 0.75px rgba(255,255,255,0.96)',
  'inset 0 0 0 2px    rgba(6,6,12,0.99)',
  'inset 0 0 0 4px    rgba(255,255,255,0.99)',
  'inset 0 0 0 5.5px  rgba(5,5,10,0.98)',
  'inset 0 0 0 6.5px  rgba(228,232,252,0.96)',
  'inset 0 1px 0 0px  rgba(255,255,255,0.56)',
  'inset 0 -1px 0 0px rgba(0,0,0,0.90)',
  'inset 0 0 30px 0px rgba(185,205,255,0.28)',
].join(', ');

// PENDING — inverted bevel + ice-white bloom
const ENCRYPT_PENDING_DIM = [
  'inset 0 0 0 0.75px rgba(255,255,255,0.72)',
  'inset 0 0 0 2px    rgba(8,8,14,0.99)',
  'inset 0 0 0 4px    rgba(225,230,252,0.96)',
  'inset 0 0 0 5.5px  rgba(6,6,12,0.98)',
  'inset 0 0 0 6.5px  rgba(188,196,232,0.90)',
  'inset 0 1px 0 0px  rgba(0,0,0,0.65)',           // top dark (pressed-in)
  'inset 0 -1px 0 0px rgba(240,244,255,0.34)',     // bottom bright (pressed-in)
  'inset 0 0 30px 0px rgba(185,205,255,0.28)',
].join(', ');

const ENCRYPT_PENDING_BRIGHT = [
  'inset 0 0 0 0.75px rgba(255,255,255,0.99)',
  'inset 0 0 0 2px    rgba(6,6,12,0.99)',
  'inset 0 0 0 4px    rgba(255,255,255,1.00)',
  'inset 0 0 0 5.5px  rgba(4,4,8,0.98)',
  'inset 0 0 0 6.5px  rgba(245,248,255,0.99)',
  'inset 0 1px 0 0px  rgba(0,0,0,0.72)',           // top dark (stays pressed)
  'inset 0 -1px 0 0px rgba(248,250,255,0.58)',     // bottom bright (stays pressed)
  'inset 0 0 30px 0px rgba(205,220,255,0.62)',     // strong ice bloom at peak
].join(', ');

const ENCRYPT_FILTER_IDLE  = 'drop-shadow(0 0 5px rgba(195,212,255,0.36)) drop-shadow(0 0 12px rgba(165,190,255,0.20)) drop-shadow(0 0 22px rgba(138,165,245,0.10))';
const ENCRYPT_FILTER_HOVER = 'drop-shadow(0 0 18px rgba(240,246,255,0.90)) drop-shadow(0 0 36px rgba(210,228,255,0.58)) drop-shadow(0 0 65px rgba(185,208,255,0.28))';
const ENCRYPT_FILTER_PEND_DIM    = 'drop-shadow(0 0 8px  rgba(215,228,255,0.62)) drop-shadow(0 0 18px rgba(185,205,255,0.34)) drop-shadow(0 0 38px rgba(158,182,255,0.16))';
const ENCRYPT_FILTER_PEND_BRIGHT = 'drop-shadow(0 0 16px rgba(248,252,255,0.94)) drop-shadow(0 0 32px rgba(222,236,255,0.64)) drop-shadow(0 0 62px rgba(198,218,255,0.30))';

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
        color: '#FFFFFF',
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
      <TopCapStripe color={isPending ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.20)'} />

      {/* Ambient glow */}
      <div aria-hidden className={isPending ? 'encrypt-ambient-pending' : 'encrypt-ambient'} style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: isPending
          ? 'radial-gradient(ellipse at 50% 55%, rgba(215,228,255,0.30) 0%, rgba(175,198,255,0.14) 40%, transparent 68%)'
          : 'radial-gradient(ellipse at 38% 52%, rgba(190,210,255,0.18) 0%, rgba(155,182,255,0.09) 40%, transparent 68%)',
      }} />

      {/* Corner nubs */}
      <CornerNub style={{ top: -5.5,    left: -5.5   }} color={isPending ? 'rgba(255,255,255,0.95)' : 'rgba(220,228,248,0.82)'} glow={isPending ? '0 0 8px rgba(255,255,255,0.75)' : '0 0 5px rgba(210,224,255,0.50)'} />
      <CornerNub style={{ top: -5.5,    right: -5.5  }} color={isPending ? 'rgba(255,255,255,0.95)' : 'rgba(220,228,248,0.82)'} glow={isPending ? '0 0 8px rgba(255,255,255,0.75)' : '0 0 5px rgba(210,224,255,0.50)'} />
      <CornerNub style={{ bottom: -5.5, left: -5.5   }} color={isPending ? 'rgba(255,255,255,0.95)' : 'rgba(220,228,248,0.82)'} glow={isPending ? '0 0 8px rgba(255,255,255,0.75)' : '0 0 5px rgba(210,224,255,0.50)'} />
      <CornerNub style={{ bottom: -5.5, right: -5.5  }} color={isPending ? 'rgba(255,255,255,0.95)' : 'rgba(220,228,248,0.82)'} glow={isPending ? '0 0 8px rgba(255,255,255,0.75)' : '0 0 5px rgba(210,224,255,0.50)'} />

      {/* Centre edge diamonds */}
      <EdgeDiamond style={{ top: 2.5 }}    color={isPending ? 'rgba(255,255,255,1.00)' : 'rgba(238,242,255,0.97)'} glow={isPending ? '0 0 10px rgba(255,255,255,0.88), 0 0 20px rgba(210,225,255,0.55)' : '0 0 6px rgba(220,232,255,0.58)'} />
      <EdgeDiamond style={{ bottom: 2.5 }} color={isPending ? 'rgba(255,255,255,1.00)' : 'rgba(238,242,255,0.97)'} glow={isPending ? '0 0 10px rgba(255,255,255,0.88), 0 0 20px rgba(210,225,255,0.55)' : '0 0 6px rgba(220,232,255,0.58)'} />

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
          'radial-gradient(circle at 54% 42%, rgba(185,205,245,0.42) 0%, rgba(22,24,38,0.30) 52%, transparent 78%)',
          'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(22,24,40,0.22) 30%, rgba(10,10,20,0.20) 70%, rgba(0,0,0,0.30) 100%)',
        ].join(', '),
        borderRight: '1px solid rgba(210,220,248,0.18)',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: 0, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(230,238,255,0.42) 30%, rgba(210,222,255,0.30) 70%, transparent)',
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
              ? 'radial-gradient(circle at 38% 34%, #1e2035 0%, #0e1020 52%, #060810 100%)'
              : 'radial-gradient(circle at 38% 34%, #181a2e 0%, #0c0e1c 52%, #050610 100%)',
          }}
        >
          <span className="flex items-center justify-center" style={{
            width: 24, height: 24,
            filter: isPending
              ? 'drop-shadow(0 0 9px rgba(245,250,255,0.95)) drop-shadow(0 1px 3px rgba(0,0,0,0.75))'
              : 'drop-shadow(0 0 7px rgba(220,234,255,0.85)) drop-shadow(0 1px 3px rgba(0,0,0,0.75))',
          }}>
            <CipherSigil affinityHex={isPending ? '#ffffff' : '#e8f0ff'} id={sigilId} />
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
                  ? '0 0 24px rgba(255,255,255,0.72), 0 0 10px rgba(210,228,255,0.50), 0 1px 3px rgba(0,0,0,0.85)'
                  : '0 0 20px rgba(220,234,255,0.40), 0 0 8px rgba(190,212,255,0.25), 0 1px 3px rgba(0,0,0,0.85)',
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
