import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Check } from 'lucide-react';
import { CipherSigil } from '@/components/CipherApertureAnimation';

// ── Shared geometry ───────────────────────────────────────────────────────────
const CHAMFER = 10; // px — diagonal corner cut size
const CLIP = `polygon(
  ${CHAMFER}px 0%, calc(100% - ${CHAMFER}px) 0%,
  100% ${CHAMFER}px, 100% calc(100% - ${CHAMFER}px),
  calc(100% - ${CHAMFER}px) 100%, ${CHAMFER}px 100%,
  0% calc(100% - ${CHAMFER}px), 0% ${CHAMFER}px
)`;

// ── Corner nub — sits at a clip corner; diagonal cut creates a triangle nub ──
function CornerNub({ style, color }: { style: React.CSSProperties; color: string }) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        width: 12,
        height: 12,
        transform: 'rotate(45deg)',
        background: color,
        pointerEvents: 'none',
        zIndex: 3,
        ...style,
      }}
    />
  );
}

// ── Centre-edge diamond — embedded in the frame band at top/bottom ───────────
function EdgeDiamond({ style, color }: { style: React.CSSProperties; color: string }) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        width: 7,
        height: 7,
        transform: 'translateX(-50%) rotate(45deg)',
        background: color,
        pointerEvents: 'none',
        zIndex: 3,
        ...style,
      }}
    />
  );
}

// ── Forge Button ─────────────────────────────────────────────────────────────
// Solar-gold / forged-metal — "Outward Manifestation"

const FORGE_BG = [
  'radial-gradient(ellipse at 28% 0%,   rgba(180,110,15,0.32) 0%, transparent 52%)',
  'radial-gradient(ellipse at 78% 100%, rgba(90,55,4,0.22)   0%, transparent 48%)',
  'linear-gradient(158deg, #1d1912 0%, #27231b 48%, #1b1710 100%)',
].join(', ');

// Inset rings: outer-dark → gold band → inner-dark, plus bevel edges + inner warmth
const FORGE_INSET = [
  'inset 0 0 0 1px   rgba(55,38,5,0.99)',       // 1 outermost dark edge
  'inset 0 0 0 2.5px rgba(190,142,28,0.97)',     // 2 gold band
  'inset 0 0 0 4px   rgba(36,24,3,0.98)',         // 3 inner dark separator
  'inset 0 1px 0     rgba(255,250,205,0.26)',     // 4 top bright catchlight
  'inset 0 -1px 0    rgba(0,0,0,0.72)',           // 5 bottom shadow
  'inset 0 3px 10px  rgba(255,238,150,0.07)',     // 6 inner top warmth
  'inset 0 -3px 10px rgba(0,0,0,0.30)',           // 7 inner bottom shadow
].join(', ');

const FORGE_FILTER_IDLE  = 'drop-shadow(0 0 4px rgba(170,110,8,0.28)) drop-shadow(0 0 8px rgba(150,85,0,0.14))';
const FORGE_FILTER_HOVER = 'drop-shadow(0 0 10px rgba(225,162,18,0.62)) drop-shadow(0 0 22px rgba(205,120,0,0.32))';

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
  onClick,
  disabled,
  isPending,
  isSent,
  label,
  subtitle = 'Manifest Artifact',
  confirmHex = '#d97706',
  confirmGlow = '#f59e0b',
  darkText,
}: ForgeButtonProps) {
  const pendingFilter = `drop-shadow(0 0 10px ${confirmGlow}99) drop-shadow(0 0 20px ${confirmGlow}55)`;
  const pendingInset = [
    `inset 0 0 0 1px   ${confirmGlow}bb`,
    `inset 0 0 0 2.5px ${confirmGlow}`,
    `inset 0 0 0 4px   rgba(30,20,2,0.92)`,
    'inset 0 1px 0     rgba(255,255,220,0.30)',
    'inset 0 -1px 0    rgba(0,0,0,0.65)',
    'inset 0 3px 10px  rgba(255,240,160,0.10)',
    'inset 0 -3px 10px rgba(0,0,0,0.28)',
  ].join(', ');

  const nubColor = isPending ? `${confirmGlow}dd` : 'rgba(200,152,32,0.90)';
  const edgeDiaColor = isPending ? `${confirmGlow}ff` : 'rgba(220,172,38,0.95)';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center overflow-hidden btn-forge-idle"
      style={{
        height: 64,
        clipPath: CLIP,
        background: isPending ? confirmHex : FORGE_BG,
        boxShadow: isPending ? pendingInset : FORGE_INSET,
        filter: isPending ? pendingFilter : FORGE_FILTER_IDLE,
        opacity: disabled ? 0.40 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        border: 'none',
        padding: 0,
        color: isPending ? (darkText ? '#1a1a1a' : '#fff') : '#F5E8C8',
        WebkitTapHighlightColor: 'transparent',
      }}
      whileHover={disabled ? {} : {
        filter: isPending ? pendingFilter : FORGE_FILTER_HOVER,
      }}
      whileTap={disabled ? {} : { scale: 0.96, transition: { duration: 0.07 } }}
      transition={{ filter: { duration: 0.22 } }}
    >
      {/* Corner nubs — clipped diagonally into triangle accent shapes */}
      <CornerNub style={{ top: -5, left: -5 }}  color={nubColor} />
      <CornerNub style={{ top: -5, right: -5 }} color={nubColor} />
      <CornerNub style={{ bottom: -5, left: -5 }}  color={nubColor} />
      <CornerNub style={{ bottom: -5, right: -5 }} color={nubColor} />

      {/* Top/bottom centre edge diamond — sits inside the gold frame band */}
      <EdgeDiamond style={{ top: 2 }}    color={edgeDiaColor} />
      <EdgeDiamond style={{ bottom: 2 }} color={edgeDiaColor} />

      {/* Left medallion section */}
      <div
        aria-hidden
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 62,
          height: '100%',
          background: [
            'radial-gradient(circle at 55% 45%, rgba(160,100,10,0.50) 0%, rgba(70,44,3,0.32) 55%, transparent 80%)',
            'linear-gradient(180deg, rgba(100,65,5,0.22) 0%, rgba(40,24,2,0.15) 100%)',
          ].join(', '),
          borderRight: '1px solid rgba(160,120,25,0.28)',
          position: 'relative',
        }}
      >
        {/* Separator highlight + shadow pair for depth */}
        <div aria-hidden style={{
          position: 'absolute', right: 0, top: 4, bottom: 4, width: 1,
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,230,130,0.35) 30%, rgba(255,210,80,0.25) 70%, transparent 100%)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', right: -1, top: 4, bottom: 4, width: 1,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.50) 30%, rgba(0,0,0,0.40) 70%, transparent 100%)',
        }} />

        {/* Medallion ring */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 40, height: 40,
            background: 'radial-gradient(circle at 40% 36%, #c4861e 0%, #7a5010 52%, #3e2804 100%)',
            boxShadow: [
              '0 0 0 1.5px rgba(40,24,2,0.95)',   // outer dark ring
              '0 0 0 3px rgba(160,114,22,0.80)',    // bronze ring
              '0 0 0 4px rgba(28,18,2,0.90)',       // gap
              '0 0 10px rgba(210,148,16,0.55)',      // glow
              'inset 0 1px 0 rgba(255,228,120,0.38)', // top shine
            ].join(', '),
          }}
        >
          <Gavel
            className="h-[19px] w-[19px]"
            style={{
              color: '#FFE498',
              filter: 'drop-shadow(0 0 4px rgba(255,200,60,0.70)) drop-shadow(0 1px 2px rgba(0,0,0,0.60))',
            }}
          />
        </div>
      </div>

      {/* Text column */}
      <div className="flex flex-col items-start justify-center flex-1 px-4 gap-0" style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait" initial={false}>
          {isSent ? (
            <motion.span
              key="sent"
              className="flex items-center gap-1.5 text-emerald-300 font-bold"
              style={{ fontSize: 14, letterSpacing: '0.06em' }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.10 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            >
              <Check className="h-4 w-4" />Sent!
            </motion.span>
          ) : (
            <motion.span
              key="label"
              className="flex flex-col items-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.10 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <span
                className="font-bold uppercase leading-none"
                style={{
                  fontSize: 15,
                  letterSpacing: '0.14em',
                  textShadow: isPending ? 'none' : '0 0 12px rgba(255,220,100,0.30), 0 1px 2px rgba(0,0,0,0.70)',
                }}
              >
                {label}
              </span>
              <span
                className="leading-none"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  opacity: isPending ? 0.65 : 0.50,
                  letterSpacing: '0.07em',
                  textShadow: '0 1px 2px rgba(0,0,0,0.60)',
                }}
              >
                {subtitle}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ── Encrypt Button ────────────────────────────────────────────────────────────
// Obsidian glass + prismatic edge — "Inward Preservation"

const ENCRYPT_BG = [
  'radial-gradient(ellipse at 28% 0%,   rgba(80,60,130,0.34) 0%, transparent 55%)',
  'radial-gradient(ellipse at 78% 100%, rgba(30,22,65,0.25)  0%, transparent 50%)',
  'linear-gradient(158deg, #0e0e15 0%, #131322 48%, #0b0b12 100%)',
].join(', ');

const ENCRYPT_INSET = [
  'inset 0 0 0 1px   rgba(20,15,38,0.99)',        // 1 outer dark edge
  'inset 0 0 0 2.5px rgba(175,162,228,0.88)',      // 2 violet-white band
  'inset 0 0 0 4px   rgba(10,8,22,0.98)',           // 3 inner dark
  'inset 0 1px 0     rgba(235,228,255,0.28)',       // 4 top bright edge
  'inset 0 -1px 0    rgba(0,0,0,0.78)',             // 5 bottom shadow
  'inset 0 3px 10px  rgba(200,188,255,0.06)',       // 6 inner top violet
  'inset 0 -3px 10px rgba(0,0,0,0.34)',             // 7 inner bottom shadow
].join(', ');

const ENCRYPT_PENDING_INSET = [
  'inset 0 0 0 1px   rgba(160,145,220,0.85)',
  'inset 0 0 0 2.5px rgba(210,200,255,0.96)',
  'inset 0 0 0 4px   rgba(10,8,22,0.96)',
  'inset 0 1px 0     rgba(245,240,255,0.32)',
  'inset 0 -1px 0    rgba(0,0,0,0.78)',
  'inset 0 3px 10px  rgba(210,200,255,0.10)',
  'inset 0 -3px 10px rgba(0,0,0,0.34)',
].join(', ');

const ENCRYPT_FILTER_IDLE  = 'drop-shadow(0 0 4px rgba(140,120,220,0.28)) drop-shadow(0 0 8px rgba(100,80,180,0.14))';
const ENCRYPT_FILTER_HOVER = 'drop-shadow(0 0 10px rgba(190,175,255,0.55)) drop-shadow(0 0 22px rgba(150,120,240,0.30))';
const ENCRYPT_FILTER_PEND  = 'drop-shadow(0 0 12px rgba(210,200,255,0.62)) drop-shadow(0 0 24px rgba(170,150,255,0.35))';

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
  onClick,
  disabled,
  isPending,
  isSent,
  label,
  subtitle = 'Reserve Pattern',
  sigilId = 9001,
}: EncryptButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center overflow-hidden btn-encrypt-idle"
      style={{
        height: 64,
        clipPath: CLIP,
        background: isPending
          ? 'linear-gradient(158deg, #111128 0%, #181838 48%, #0f0f22 100%)'
          : ENCRYPT_BG,
        boxShadow: isPending ? ENCRYPT_PENDING_INSET : ENCRYPT_INSET,
        filter: isPending ? ENCRYPT_FILTER_PEND : ENCRYPT_FILTER_IDLE,
        opacity: disabled ? 0.40 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        border: 'none',
        padding: 0,
        color: '#D8D4FF',
        WebkitTapHighlightColor: 'transparent',
      }}
      whileHover={disabled ? {} : {
        filter: isPending ? ENCRYPT_FILTER_PEND : ENCRYPT_FILTER_HOVER,
      }}
      whileTap={disabled ? {} : { scale: 0.96, transition: { duration: 0.07 } }}
      transition={{ filter: { duration: 0.22 } }}
    >
      {/* Corner nubs */}
      <CornerNub style={{ top: -5, left: -5 }}     color="rgba(200,192,248,0.72)" />
      <CornerNub style={{ top: -5, right: -5 }}    color="rgba(200,192,248,0.72)" />
      <CornerNub style={{ bottom: -5, left: -5 }}  color="rgba(200,192,248,0.72)" />
      <CornerNub style={{ bottom: -5, right: -5 }} color="rgba(200,192,248,0.72)" />

      {/* Top/bottom centre edge diamond */}
      <EdgeDiamond style={{ top: 2 }}    color="rgba(220,215,255,0.95)" />
      <EdgeDiamond style={{ bottom: 2 }} color="rgba(220,215,255,0.95)" />

      {/* Prismatic left edge stripe (fire side) */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, zIndex: 1,
        background: 'linear-gradient(180deg, rgba(255,110,55,0.55) 0%, rgba(210,170,255,0.30) 50%, rgba(55,110,255,0.55) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Prismatic right edge stripe (ice side) */}
      <div aria-hidden style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, zIndex: 1,
        background: 'linear-gradient(180deg, rgba(55,110,255,0.55) 0%, rgba(210,170,255,0.30) 50%, rgba(255,110,55,0.55) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Left medallion section */}
      <div
        aria-hidden
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 62,
          height: '100%',
          background: [
            'radial-gradient(circle at 55% 42%, rgba(80,60,130,0.48) 0%, rgba(25,18,55,0.32) 55%, transparent 80%)',
            'linear-gradient(180deg, rgba(50,38,90,0.22) 0%, rgba(15,10,32,0.18) 100%)',
          ].join(', '),
          borderRight: '1px solid rgba(160,148,220,0.20)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Separator pair */}
        <div aria-hidden style={{
          position: 'absolute', right: 0, top: 4, bottom: 4, width: 1,
          background: 'linear-gradient(180deg, transparent 0%, rgba(200,190,255,0.35) 30%, rgba(180,168,235,0.28) 70%, transparent 100%)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', right: -1, top: 4, bottom: 4, width: 1,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.45) 70%, transparent 100%)',
        }} />

        {/* Medallion ring */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 40, height: 40,
            background: 'radial-gradient(circle at 40% 36%, #302858 0%, #1a1438 52%, #0d0a20 100%)',
            boxShadow: [
              '0 0 0 1.5px rgba(10,8,22,0.95)',
              '0 0 0 3px rgba(140,128,210,0.72)',
              '0 0 0 4px rgba(10,8,22,0.90)',
              '0 0 10px rgba(170,155,240,0.45)',
              'inset 0 1px 0 rgba(210,204,255,0.32)',
            ].join(', '),
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: 22, height: 22,
              filter: 'drop-shadow(0 0 5px rgba(200,185,255,0.78)) drop-shadow(0 1px 2px rgba(0,0,0,0.70))',
            }}
          >
            <CipherSigil affinityHex="#cac4ff" id={sigilId} />
          </span>
        </div>
      </div>

      {/* Text column */}
      <div className="flex flex-col items-start justify-center flex-1 px-4 gap-0" style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait" initial={false}>
          {isSent ? (
            <motion.span
              key="sent"
              className="flex items-center gap-1.5 text-emerald-300 font-bold"
              style={{ fontSize: 14, letterSpacing: '0.06em' }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.10 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            >
              <Check className="h-4 w-4" />Sent!
            </motion.span>
          ) : (
            <motion.span
              key="label"
              className="flex flex-col items-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.10 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <span
                className="font-bold uppercase leading-none"
                style={{
                  fontSize: 15,
                  letterSpacing: '0.14em',
                  textShadow: '0 0 12px rgba(200,185,255,0.28), 0 1px 2px rgba(0,0,0,0.80)',
                }}
              >
                {label}
              </span>
              <span
                className="leading-none"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  opacity: isPending ? 0.65 : 0.46,
                  letterSpacing: '0.07em',
                  textShadow: '0 1px 2px rgba(0,0,0,0.70)',
                }}
              >
                {subtitle}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
