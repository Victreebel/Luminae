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

// ── Corner nub — clipped diagonally = triangle accent at each chamfer ─────────
function CornerNub({ style, color }: { style: React.CSSProperties; color: string }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', width: 13, height: 13,
      transform: 'rotate(45deg)', background: color,
      pointerEvents: 'none', zIndex: 4, ...style,
    }} />
  );
}

// ── Centre-edge diamond — embedded in the frame band ─────────────────────────
function EdgeDiamond({ style, color }: { style: React.CSSProperties; color: string }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', left: '50%', width: 8, height: 8,
      transform: 'translateX(-50%) rotate(45deg)', background: color,
      pointerEvents: 'none', zIndex: 4, ...style,
    }} />
  );
}

// ── Forge constants ───────────────────────────────────────────────────────────
// 8 layers — must match count between IDLE / HOVER for framer-motion interpolation

const FORGE_BG = [
  'radial-gradient(ellipse at 30% 0%,   rgba(210,124,16,0.38) 0%, transparent 50%)',
  'radial-gradient(ellipse at 60% 58%,  rgba(155,88,5,0.20)   0%, transparent 45%)',
  'radial-gradient(ellipse at 88% 100%, rgba(80,46,3,0.22)    0%, transparent 46%)',
  'linear-gradient(158deg, #171410 0%, #222018 48%, #151210 100%)',
].join(', ');

const FORGE_INSET = [
  'inset 0 0 0 0.75px rgba(255,248,210,0.52)',   // inner bright catchlight
  'inset 0 0 0 2px    rgba(32,22,2,0.99)',         // dark gap
  'inset 0 0 0 4px    rgba(208,158,35,0.98)',      // main gold band
  'inset 0 0 0 5.5px  rgba(38,26,2,0.96)',         // dark separator
  'inset 0 0 0 6.5px  rgba(172,126,20,0.82)',      // outer gold line
  'inset 0 1px 0 0px  rgba(255,252,215,0.28)',     // top bevel catchlight
  'inset 0 -1px 0 0px rgba(0,0,0,0.82)',           // bottom bevel shadow
  'inset 0 0 30px 0px rgba(120,72,3,0.12)',        // ambient interior warmth
].join(', ');

const FORGE_INSET_HOVER = [
  'inset 0 0 0 0.75px rgba(255,252,225,0.88)',    // bright inner catchlight
  'inset 0 0 0 2px    rgba(28,18,1,0.99)',
  'inset 0 0 0 4px    rgba(245,192,50,0.99)',      // very bright gold
  'inset 0 0 0 5.5px  rgba(34,22,1,0.96)',
  'inset 0 0 0 6.5px  rgba(222,172,40,0.96)',      // bright outer gold
  'inset 0 1px 0 0px  rgba(255,255,238,0.50)',     // bright top catchlight
  'inset 0 -1px 0 0px rgba(0,0,0,0.82)',
  'inset 0 0 30px 0px rgba(190,118,8,0.32)',       // strong ambient warmth
].join(', ');

const FORGE_FILTER_IDLE  = 'drop-shadow(0 0 5px rgba(185,118,8,0.34)) drop-shadow(0 0 12px rgba(155,90,0,0.18)) drop-shadow(0 0 22px rgba(130,68,0,0.09))';
const FORGE_FILTER_HOVER = 'drop-shadow(0 0 18px rgba(248,182,22,0.82)) drop-shadow(0 0 36px rgba(228,142,0,0.52)) drop-shadow(0 0 65px rgba(200,100,0,0.26))';

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
  confirmHex = '#d97706', confirmGlow = '#f59e0b', darkText,
}: ForgeButtonProps) {
  const pendingInset = [
    `inset 0 0 0 0.75px ${confirmGlow}cc`,
    `inset 0 0 0 2px    rgba(28,18,1,0.99)`,
    `inset 0 0 0 4px    ${confirmGlow}ff`,
    `inset 0 0 0 5.5px  rgba(32,20,1,0.96)`,
    `inset 0 0 0 6.5px  ${confirmGlow}cc`,
    `inset 0 1px 0 0px  rgba(255,255,220,0.48)`,
    `inset 0 -1px 0 0px rgba(0,0,0,0.80)`,
    `inset 0 0 30px 0px rgba(200,130,10,0.28)`,
  ].join(', ');
  const pendingFilter = `drop-shadow(0 0 12px ${confirmGlow}bb) drop-shadow(0 0 26px ${confirmGlow}66) drop-shadow(0 0 50px ${confirmGlow}33)`;

  const activeInset  = isPending ? pendingInset        : FORGE_INSET;
  const hoverInset   = isPending ? pendingInset        : FORGE_INSET_HOVER;
  const activeFilter = isPending ? pendingFilter       : FORGE_FILTER_IDLE;
  const hoverFilter  = isPending ? pendingFilter       : FORGE_FILTER_HOVER;
  const nubColor     = isPending ? `${confirmGlow}ee`  : 'rgba(208,160,34,0.92)';
  const diaColor     = isPending ? `${confirmGlow}ff`  : 'rgba(228,180,42,0.97)';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center overflow-hidden btn-forge-idle"
      style={{
        height: 72,
        clipPath: CLIP,
        background: isPending ? confirmHex : FORGE_BG,
        opacity: disabled ? 0.38 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none', border: 'none', padding: 0,
        color: isPending ? (darkText ? '#1a1a1a' : '#fff') : '#F6ECD0',
        WebkitTapHighlightColor: 'transparent',
      }}
      animate={{ boxShadow: activeInset, filter: activeFilter }}
      whileHover={disabled ? {} : { boxShadow: hoverInset, filter: hoverFilter }}
      whileTap={disabled ? {} : { scale: 0.96, transition: { duration: 0.07 } }}
      transition={{ boxShadow: { duration: 0.20 }, filter: { duration: 0.20 } }}
    >
      {/* Ambient interior glow — pulses via CSS animation */}
      <div aria-hidden className="forge-ambient" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at 38% 52%, rgba(210,128,10,0.30) 0%, rgba(140,80,4,0.14) 42%, transparent 68%)',
      }} />

      {/* Corner nubs */}
      <CornerNub style={{ top: -5.5,  left: -5.5  }} color={nubColor} />
      <CornerNub style={{ top: -5.5,  right: -5.5 }} color={nubColor} />
      <CornerNub style={{ bottom: -5.5, left: -5.5  }} color={nubColor} />
      <CornerNub style={{ bottom: -5.5, right: -5.5 }} color={nubColor} />

      {/* Centre edge diamonds in the gold band */}
      <EdgeDiamond style={{ top: 2.5 }}    color={diaColor} />
      <EdgeDiamond style={{ bottom: 2.5 }} color={diaColor} />

      {/* Medallion section */}
      <div aria-hidden className="flex-shrink-0 flex items-center justify-center" style={{
        width: 66, height: '100%', position: 'relative', zIndex: 1,
        background: [
          'radial-gradient(circle at 54% 44%, rgba(175,108,12,0.56) 0%, rgba(80,48,4,0.36) 52%, transparent 78%)',
          'linear-gradient(180deg, rgba(110,68,6,0.24) 0%, rgba(44,26,2,0.18) 100%)',
        ].join(', '),
        borderRight: '1px solid rgba(165,125,28,0.22)',
      }}>
        {/* Separator — highlight */}
        <div aria-hidden style={{
          position: 'absolute', right: 0, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(255,228,120,0.40) 30%, rgba(255,208,75,0.28) 70%, transparent)',
        }} />
        {/* Separator — shadow */}
        <div aria-hidden style={{
          position: 'absolute', right: -1, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.44) 70%, transparent)',
        }} />
        {/* Medallion — pulsing via CSS class */}
        <div className="forge-medallion-glow flex items-center justify-center rounded-full" style={{
          width: 44, height: 44,
          background: 'radial-gradient(circle at 38% 34%, #d4941e 0%, #8a5c12 50%, #422e04 100%)',
          flexShrink: 0,
        }}>
          <Gavel className="h-[21px] w-[21px]" style={{
            color: '#FFE89A',
            filter: 'drop-shadow(0 0 6px rgba(255,208,60,0.82)) drop-shadow(0 1px 3px rgba(0,0,0,0.70))',
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
                  ? `0 0 16px ${confirmGlow}99, 0 1px 2px rgba(0,0,0,0.70)`
                  : '0 0 20px rgba(255,228,110,0.45), 0 0 8px rgba(255,200,60,0.28), 0 1px 3px rgba(0,0,0,0.80)',
              }}>
                {label}
              </span>
              <span className="leading-none" style={{
                fontSize: 10.5, marginTop: 5,
                opacity: isPending ? 0.70 : 0.52,
                letterSpacing: '0.09em',
                textShadow: '0 1px 2px rgba(0,0,0,0.65)',
              }}>
                — {subtitle} —
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ── Encrypt constants ─────────────────────────────────────────────────────────

const ENCRYPT_BG = [
  'radial-gradient(ellipse at 28% 0%,   rgba(92,70,152,0.42) 0%, transparent 52%)',
  'radial-gradient(ellipse at 62% 58%,  rgba(58,42,108,0.26) 0%, transparent 45%)',
  'radial-gradient(ellipse at 85% 100%, rgba(26,16,58,0.30)  0%, transparent 46%)',
  'linear-gradient(158deg, #08080e 0%, #0d0d18 48%, #070710 100%)',
].join(', ');

const ENCRYPT_INSET = [
  'inset 0 0 0 0.75px rgba(235,228,255,0.50)',    // inner bright
  'inset 0 0 0 2px    rgba(12,8,24,0.99)',          // dark gap
  'inset 0 0 0 4px    rgba(180,168,238,0.92)',      // violet band
  'inset 0 0 0 5.5px  rgba(9,6,20,0.97)',           // dark separator
  'inset 0 0 0 6.5px  rgba(142,130,200,0.76)',      // outer violet line
  'inset 0 1px 0 0px  rgba(238,232,255,0.24)',      // top catchlight
  'inset 0 -1px 0 0px rgba(0,0,0,0.86)',            // bottom shadow
  'inset 0 0 30px 0px rgba(68,52,120,0.14)',        // ambient violet
].join(', ');

const ENCRYPT_INSET_HOVER = [
  'inset 0 0 0 0.75px rgba(248,244,255,0.90)',     // bright inner
  'inset 0 0 0 2px    rgba(10,6,22,0.99)',
  'inset 0 0 0 4px    rgba(215,205,255,0.99)',      // bright white-violet
  'inset 0 0 0 5.5px  rgba(7,4,18,0.97)',
  'inset 0 0 0 6.5px  rgba(192,180,248,0.94)',      // bright outer
  'inset 0 1px 0 0px  rgba(255,252,255,0.52)',      // bright top
  'inset 0 -1px 0 0px rgba(0,0,0,0.86)',
  'inset 0 0 30px 0px rgba(105,88,172,0.30)',       // strong violet ambient
].join(', ');

const ENCRYPT_PENDING_INSET = [
  'inset 0 0 0 0.75px rgba(215,208,255,0.82)',
  'inset 0 0 0 2px    rgba(10,6,22,0.99)',
  'inset 0 0 0 4px    rgba(215,205,255,0.99)',
  'inset 0 0 0 5.5px  rgba(8,5,20,0.97)',
  'inset 0 0 0 6.5px  rgba(195,185,255,0.90)',
  'inset 0 1px 0 0px  rgba(250,248,255,0.48)',
  'inset 0 -1px 0 0px rgba(0,0,0,0.86)',
  'inset 0 0 30px 0px rgba(110,95,180,0.32)',
].join(', ');

const ENCRYPT_FILTER_IDLE  = 'drop-shadow(0 0 5px rgba(145,125,228,0.32)) drop-shadow(0 0 12px rgba(105,85,188,0.18)) drop-shadow(0 0 22px rgba(80,60,155,0.09))';
const ENCRYPT_FILTER_HOVER = 'drop-shadow(0 0 18px rgba(198,185,255,0.80)) drop-shadow(0 0 36px rgba(158,138,248,0.50)) drop-shadow(0 0 65px rgba(125,100,225,0.25))';
const ENCRYPT_FILTER_PEND  = 'drop-shadow(0 0 14px rgba(210,200,255,0.72)) drop-shadow(0 0 30px rgba(175,160,255,0.44)) drop-shadow(0 0 55px rgba(148,130,238,0.24))';

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
  const activeInset  = isPending ? ENCRYPT_PENDING_INSET : ENCRYPT_INSET;
  const hoverInset   = isPending ? ENCRYPT_PENDING_INSET : ENCRYPT_INSET_HOVER;
  const activeFilter = isPending ? ENCRYPT_FILTER_PEND  : ENCRYPT_FILTER_IDLE;
  const hoverFilter  = isPending ? ENCRYPT_FILTER_PEND  : ENCRYPT_FILTER_HOVER;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center overflow-hidden btn-encrypt-idle"
      style={{
        height: 72,
        clipPath: CLIP,
        background: isPending
          ? 'linear-gradient(158deg, #0e0e1c 0%, #161635 48%, #0c0c18 100%)'
          : ENCRYPT_BG,
        opacity: disabled ? 0.38 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none', border: 'none', padding: 0,
        color: '#DBD6FF',
        WebkitTapHighlightColor: 'transparent',
      }}
      animate={{ boxShadow: activeInset, filter: activeFilter }}
      whileHover={disabled ? {} : { boxShadow: hoverInset, filter: hoverFilter }}
      whileTap={disabled ? {} : { scale: 0.96, transition: { duration: 0.07 } }}
      transition={{ boxShadow: { duration: 0.20 }, filter: { duration: 0.20 } }}
    >
      {/* Ambient interior glow — pulses via CSS */}
      <div aria-hidden className="encrypt-ambient" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at 38% 52%, rgba(105,85,185,0.32) 0%, rgba(65,48,118,0.16) 40%, transparent 68%)',
      }} />

      {/* Corner nubs */}
      <CornerNub style={{ top: -5.5,  left: -5.5  }} color="rgba(205,198,252,0.76)" />
      <CornerNub style={{ top: -5.5,  right: -5.5 }} color="rgba(205,198,252,0.76)" />
      <CornerNub style={{ bottom: -5.5, left: -5.5  }} color="rgba(205,198,252,0.76)" />
      <CornerNub style={{ bottom: -5.5, right: -5.5 }} color="rgba(205,198,252,0.76)" />

      {/* Centre edge diamonds */}
      <EdgeDiamond style={{ top: 2.5 }}    color="rgba(228,222,255,0.97)" />
      <EdgeDiamond style={{ bottom: 2.5 }} color="rgba(228,222,255,0.97)" />

      {/* Prismatic side stripes — fire/ice */}
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
          'radial-gradient(circle at 54% 42%, rgba(88,68,148,0.56) 0%, rgba(28,20,62,0.36) 52%, transparent 78%)',
          'linear-gradient(180deg, rgba(55,42,100,0.26) 0%, rgba(16,11,35,0.20) 100%)',
        ].join(', '),
        borderRight: '1px solid rgba(162,150,228,0.18)',
      }}>
        {/* Separator — highlight */}
        <div aria-hidden style={{
          position: 'absolute', right: 0, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(205,195,255,0.38) 30%, rgba(185,172,240,0.28) 70%, transparent)',
        }} />
        {/* Separator — shadow */}
        <div aria-hidden style={{
          position: 'absolute', right: -1, top: 6, bottom: 6, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.60) 30%, rgba(0,0,0,0.48) 70%, transparent)',
        }} />
        {/* Medallion — pulsing via CSS class */}
        <div className="encrypt-medallion-glow flex items-center justify-center rounded-full" style={{
          width: 44, height: 44,
          background: 'radial-gradient(circle at 38% 34%, #342a5c 0%, #1c1540 52%, #0e0a22 100%)',
          flexShrink: 0,
        }}>
          <span className="flex items-center justify-center" style={{
            width: 24, height: 24,
            filter: 'drop-shadow(0 0 7px rgba(210,195,255,0.85)) drop-shadow(0 1px 3px rgba(0,0,0,0.75))',
          }}>
            <CipherSigil affinityHex="#d4cfff" id={sigilId} />
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
                  ? '0 0 16px rgba(210,200,255,0.55), 0 1px 2px rgba(0,0,0,0.80)'
                  : '0 0 20px rgba(195,182,255,0.42), 0 0 8px rgba(165,148,238,0.28), 0 1px 3px rgba(0,0,0,0.85)',
              }}>
                {label}
              </span>
              <span className="leading-none" style={{
                fontSize: 10.5, marginTop: 5,
                opacity: isPending ? 0.70 : 0.48,
                letterSpacing: '0.09em',
                textShadow: '0 1px 2px rgba(0,0,0,0.75)',
              }}>
                — {subtitle} —
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
