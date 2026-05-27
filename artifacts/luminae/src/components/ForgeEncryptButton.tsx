import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Check } from 'lucide-react';
import { CipherSigil } from '@/components/CipherApertureAnimation';

// ── Diamond corner ornament ──────────────────────────────────────────────────
function DiamondCorner({ style }: { style: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        width: 7,
        height: 7,
        transform: 'rotate(45deg)',
        pointerEvents: 'none',
        zIndex: 2,
        ...style,
      }}
    />
  );
}

// ── Forge Button ─────────────────────────────────────────────────────────────
// Warm gold / solar aesthetic — "Outward Manifestation"

const FORGE_IDLE_SHADOW =
  '0 0 0 1px #5c4e38, 0 0 0px rgba(255,190,60,0), 0 0 0px rgba(255,140,0,0), inset 0 1px 0 rgba(255,240,180,0.10), inset 0 -1px 0 rgba(0,0,0,0.50)';
const FORGE_HOVER_SHADOW =
  '0 0 0 1px #8a6e3a, 0 0 18px rgba(255,190,60,0.42), 0 0 36px rgba(255,140,0,0.18), inset 0 1px 0 rgba(255,240,180,0.16), inset 0 -1px 0 rgba(0,0,0,0.50)';

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
  const pendingShadow = `0 0 0 1.5px ${confirmGlow}cc, 0 0 18px ${confirmGlow}66, 0 0 0px rgba(255,190,60,0), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.40)`;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center overflow-hidden btn-forge-idle"
      style={{
        height: 64,
        borderRadius: 12,
        background: isPending
          ? confirmHex
          : 'linear-gradient(160deg, #1c1810 0%, #26221a 50%, #1a1610 100%)',
        boxShadow: isPending ? pendingShadow : FORGE_IDLE_SHADOW,
        opacity: disabled ? 0.42 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        border: 'none',
        padding: 0,
        color: isPending ? (darkText ? '#1a1a1a' : '#fff') : '#F5E8C8',
        WebkitTapHighlightColor: 'transparent',
      }}
      whileHover={disabled ? {} : {
        boxShadow: isPending ? pendingShadow : FORGE_HOVER_SHADOW,
      }}
      whileTap={disabled ? {} : { scale: 0.96, transition: { duration: 0.07 } }}
      transition={{ boxShadow: { duration: 0.22 } }}
    >
      {/* Corner diamonds — warm gold */}
      <DiamondCorner style={{ top: 3, left: 3, background: 'rgba(255,195,60,0.72)' }} />
      <DiamondCorner style={{ top: 3, right: 3, background: 'rgba(255,195,60,0.72)' }} />
      <DiamondCorner style={{ bottom: 3, left: 3, background: 'rgba(255,195,60,0.72)' }} />
      <DiamondCorner style={{ bottom: 3, right: 3, background: 'rgba(255,195,60,0.72)' }} />

      {/* Left medallion */}
      <div
        aria-hidden
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 60,
          height: '100%',
          background:
            'radial-gradient(circle, rgba(120,80,10,0.55) 0%, rgba(60,40,5,0.35) 60%, transparent 100%)',
          borderRight: '1px solid rgba(180,140,40,0.22)',
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 38,
            height: 38,
            background:
              'radial-gradient(circle, #b07d20 0%, #6b4c0e 55%, #3a2a04 100%)',
            boxShadow:
              '0 0 10px rgba(200,140,20,0.55), inset 0 1px 0 rgba(255,220,100,0.28)',
          }}
        >
          <Gavel
            className="h-[19px] w-[19px]"
            style={{
              color: '#FFE090',
              filter: 'drop-shadow(0 0 5px rgba(255,200,60,0.65))',
            }}
          />
        </div>
      </div>

      {/* Text column */}
      <div className="flex flex-col items-start justify-center flex-1 px-4 gap-0">
        <AnimatePresence mode="wait" initial={false}>
          {isSent ? (
            <motion.span
              key="sent"
              className="flex items-center gap-1.5 text-emerald-300 font-bold"
              style={{ fontSize: 14, letterSpacing: '0.06em' }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            >
              <Check className="h-4 w-4" />Sent!
            </motion.span>
          ) : (
            <motion.span
              key="label"
              className="flex flex-col items-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <span
                className="font-bold uppercase tracking-widest leading-none"
                style={{ fontSize: 15, letterSpacing: '0.14em' }}
              >
                {label}
              </span>
              <span
                className="leading-none"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  opacity: isPending ? 0.65 : 0.48,
                  letterSpacing: '0.07em',
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

const ENCRYPT_IDLE_SHADOW =
  '0 0 0 1px rgba(200,190,255,0.22), 1px 0 0 0 rgba(255,100,60,0.18), -1px 0 0 0 rgba(60,100,255,0.18), inset 0 1px 0 rgba(220,210,255,0.08), 0 0 0px rgba(200,180,255,0)';
const ENCRYPT_HOVER_SHADOW =
  '0 0 0 1px rgba(210,200,255,0.55), 1px 0 0 0 rgba(255,100,60,0.30), -1px 0 0 0 rgba(60,100,255,0.30), inset 0 1px 0 rgba(220,210,255,0.16), 0 0 22px rgba(200,180,255,0.32)';
const ENCRYPT_PENDING_SHADOW =
  '0 0 0 2px rgba(210,200,255,0.85), 1px 0 0 0 rgba(255,100,60,0.12), -1px 0 0 0 rgba(60,100,255,0.12), inset 0 1px 0 rgba(220,210,255,0.14), 0 0 22px rgba(200,180,255,0.52)';

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
  const currentShadow = isPending ? ENCRYPT_PENDING_SHADOW : ENCRYPT_IDLE_SHADOW;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center overflow-hidden btn-encrypt-idle"
      style={{
        height: 64,
        borderRadius: 12,
        background: isPending
          ? '#131322'
          : 'linear-gradient(160deg, #0d0d12 0%, #121220 55%, #0a0a10 100%)',
        boxShadow: currentShadow,
        opacity: disabled ? 0.42 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        border: 'none',
        padding: 0,
        color: '#D8D4FF',
        WebkitTapHighlightColor: 'transparent',
      }}
      whileHover={disabled ? {} : {
        boxShadow: isPending ? ENCRYPT_PENDING_SHADOW : ENCRYPT_HOVER_SHADOW,
      }}
      whileTap={disabled ? {} : { scale: 0.96, transition: { duration: 0.07 } }}
      transition={{ boxShadow: { duration: 0.22 } }}
    >
      {/* Corner diamonds — prismatic white */}
      <DiamondCorner style={{ top: 3, left: 3, background: 'rgba(220,210,255,0.58)' }} />
      <DiamondCorner style={{ top: 3, right: 3, background: 'rgba(220,210,255,0.58)' }} />
      <DiamondCorner style={{ bottom: 3, left: 3, background: 'rgba(220,210,255,0.58)' }} />
      <DiamondCorner style={{ bottom: 3, right: 3, background: 'rgba(220,210,255,0.58)' }} />

      {/* Prismatic left edge stripe */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background:
            'linear-gradient(180deg, rgba(255,100,60,0.52) 0%, rgba(200,160,255,0.28) 50%, rgba(60,100,255,0.52) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {/* Prismatic right edge stripe */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background:
            'linear-gradient(180deg, rgba(60,100,255,0.52) 0%, rgba(200,160,255,0.28) 50%, rgba(255,100,60,0.52) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Left medallion */}
      <div
        aria-hidden
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 60,
          height: '100%',
          background:
            'radial-gradient(circle, rgba(60,50,100,0.48) 0%, rgba(20,18,40,0.38) 60%, transparent 100%)',
          borderRight: '1px solid rgba(180,170,255,0.13)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 38,
            height: 38,
            background:
              'radial-gradient(circle, #2a2445 0%, #141228 55%, #0a0914 100%)',
            boxShadow:
              '0 0 10px rgba(180,160,255,0.42), inset 0 1px 0 rgba(220,210,255,0.16)',
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: 20,
              height: 20,
              filter: 'drop-shadow(0 0 5px rgba(200,180,255,0.72))',
            }}
          >
            <CipherSigil affinityHex="#c8c0ff" id={sigilId} />
          </span>
        </div>
      </div>

      {/* Text column */}
      <div
        className="flex flex-col items-start justify-center flex-1 px-4 gap-0"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSent ? (
            <motion.span
              key="sent"
              className="flex items-center gap-1.5 text-emerald-300 font-bold"
              style={{ fontSize: 14, letterSpacing: '0.06em' }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            >
              <Check className="h-4 w-4" />Sent!
            </motion.span>
          ) : (
            <motion.span
              key="label"
              className="flex flex-col items-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <span
                className="font-bold uppercase tracking-widest leading-none"
                style={{ fontSize: 15, letterSpacing: '0.14em' }}
              >
                {label}
              </span>
              <span
                className="leading-none"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  opacity: isPending ? 0.65 : 0.44,
                  letterSpacing: '0.07em',
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
