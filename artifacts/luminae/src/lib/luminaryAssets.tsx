import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LuminaryVisuals {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  EntityArt: React.FC<{ size?: number; className?: string }>;
}

// ─── Entity SVG Components ────────────────────────────────────────────────────
// All use transparent backgrounds (no <rect> fill), viewBox="0 0 100 140".
// Gradient IDs are prefixed by entity slug to avoid SVG global ID conflicts.

function EmberEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="emb-g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id="emb-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="95" rx="30" ry="8" fill="url(#emb-glow)" />
      <path d="M50,128 C30,108 14,83 26,58 C32,44 42,38 50,18 C58,38 68,44 74,58 C86,83 70,108 50,128Z" fill="url(#emb-g)" />
      <path d="M50,108 C40,93 36,74 43,60 C46,53 50,46 50,28 C54,46 54,53 57,60 C64,74 60,93 50,108Z" fill="#fbbf24" opacity="0.85" />
      <path d="M32,96 C22,78 23,58 32,44 C37,37 42,34 44,58 C41,68 36,82 32,96Z" fill="#ef4444" opacity="0.65" />
      <path d="M68,96 C78,78 77,58 68,44 C63,37 58,34 56,58 C59,68 64,82 68,96Z" fill="#ef4444" opacity="0.65" />
      <circle cx="50" cy="16" r="4" fill="#fef9c3" />
      <circle cx="36" cy="26" r="2.5" fill="#fef08a" opacity="0.8" />
      <circle cx="64" cy="26" r="2.5" fill="#fef08a" opacity="0.8" />
    </svg>
  );
}

function TideEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="tide-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path d="M35,128 C34,108 24,92 20,72 C16,52 26,38 50,18 C74,38 84,52 80,72 C76,92 66,108 65,128Z" fill="url(#tide-g)" />
      <path d="M20,72 C10,67 4,57 10,47 C16,40 26,38 26,53 C21,60 16,66 20,72Z" fill="#60a5fa" opacity="0.8" />
      <path d="M80,72 C90,67 96,57 90,47 C84,40 74,38 74,53 C79,60 84,66 80,72Z" fill="#60a5fa" opacity="0.8" />
      <path d="M50,18 C45,13 40,8 45,3 C48,0 52,0 55,3 C60,8 55,13 50,18Z" fill="#bfdbfe" />
      <line x1="50" y1="58" x2="50" y2="105" stroke="#bfdbfe" strokeWidth="1.5" opacity="0.5" strokeDasharray="3,4" />
      <circle cx="35" cy="44" r="3" fill="#bfdbfe" opacity="0.7" />
      <circle cx="65" cy="44" r="3" fill="#bfdbfe" opacity="0.7" />
      <circle cx="28" cy="62" r="2" fill="#bfdbfe" opacity="0.5" />
      <circle cx="72" cy="62" r="2" fill="#bfdbfe" opacity="0.5" />
    </svg>
  );
}

function RootEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="root-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
      </defs>
      <path d="M43,128 C41,108 39,88 41,68 C43,53 46,43 50,32 C54,43 57,53 59,68 C61,88 59,108 57,128Z" fill="url(#root-g)" />
      <path d="M43,68 C36,63 26,58 14,48 C20,43 28,45 36,53 C30,46 29,36 34,28 C38,36 40,52 43,68Z" fill="#22c55e" />
      <path d="M57,68 C64,63 74,58 86,48 C80,43 72,45 64,53 C70,46 71,36 66,28 C62,36 60,52 57,68Z" fill="#22c55e" />
      <path d="M43,52 C38,47 29,42 20,35 C25,31 32,33 39,41 C35,35 36,27 41,22 C43,30 43,43 43,52Z" fill="#4ade80" opacity="0.8" />
      <path d="M57,52 C62,47 71,42 80,35 C75,31 68,33 61,41 C65,35 64,27 59,22 C57,30 57,43 57,52Z" fill="#4ade80" opacity="0.8" />
      <ellipse cx="50" cy="28" rx="7" ry="9" fill="#bbf7d0" />
      <circle cx="18" cy="46" r="3.5" fill="#bbf7d0" opacity="0.7" />
      <circle cx="82" cy="46" r="3.5" fill="#bbf7d0" opacity="0.7" />
      <circle cx="20" cy="33" r="2.5" fill="#bbf7d0" opacity="0.6" />
      <circle cx="80" cy="33" r="2.5" fill="#bbf7d0" opacity="0.6" />
    </svg>
  );
}

function VoidEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <radialGradient id="void-g" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="60%" stopColor="#111827" />
          <stop offset="100%" stopColor="#030712" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="62" r="34" fill="url(#void-g)" />
      <circle cx="40" cy="52" r="11" fill="#374151" opacity="0.4" />
      <path d="M28,92 C22,104 18,118 20,132" stroke="#6b7280" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M42,95 C40,108 39,122 41,132" stroke="#6b7280" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M58,95 C60,108 61,122 59,132" stroke="#6b7280" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M72,92 C78,104 82,118 80,132" stroke="#6b7280" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="52" r="4.5" fill="#6b7280" />
      <circle cx="82" cy="68" r="3.5" fill="#9ca3af" />
      <circle cx="22" cy="76" r="3" fill="#6b7280" />
      <circle cx="78" cy="42" r="4" fill="#9ca3af" />
      <polygon points="50,26 46,36 50,33 54,36" fill="#6b7280" />
      <polygon points="34,30 33,40 38,36 38,42" fill="#6b7280" />
      <polygon points="66,30 67,40 62,36 62,42" fill="#6b7280" />
      <circle cx="50" cy="58" r="7" fill="#1f2937" />
      <circle cx="50" cy="58" r="3.5" fill="#374151" />
    </svg>
  );
}

function RadiantEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="rad-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="50%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M50,68 C40,63 20,57 4,46 C8,37 19,35 30,43 C21,36 20,25 27,17 C33,28 40,50 50,68Z" fill="url(#rad-g)" opacity="0.88" />
      <path d="M50,68 C60,63 80,57 96,46 C92,37 81,35 70,43 C79,36 80,25 73,17 C67,28 60,50 50,68Z" fill="url(#rad-g)" opacity="0.88" />
      <path d="M43,63 C41,80 41,102 44,122 C47,127 53,127 56,122 C59,102 59,80 57,63Z" fill="#c084fc" />
      <circle cx="50" cy="48" r="13" fill="#f0abfc" />
      <line x1="50" y1="33" x2="50" y2="21" stroke="#fdf4ff" strokeWidth="2.5" />
      <line x1="42" y1="36" x2="36" y2="25" stroke="#fdf4ff" strokeWidth="2" />
      <line x1="58" y1="36" x2="64" y2="25" stroke="#fdf4ff" strokeWidth="2" />
      <line x1="37" y1="42" x2="29" y2="33" stroke="#fdf4ff" strokeWidth="1.5" opacity="0.7" />
      <line x1="63" y1="42" x2="71" y2="33" stroke="#fdf4ff" strokeWidth="1.5" opacity="0.7" />
      <circle cx="50" cy="48" r="5.5" fill="#fdf4ff" />
    </svg>
  );
}

function AstralEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="ast-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <polygon points="50,14 57,36 80,36 62,50 68,72 50,60 32,72 38,50 20,36 43,36" fill="url(#ast-g)" />
      <path d="M38,58 C36,76 35,97 38,118 C42,124 58,124 62,118 C65,97 64,76 62,58Z" fill="#8b5cf6" opacity="0.8" />
      <line x1="20" y1="36" x2="6" y2="30" stroke="#fce7f3" strokeWidth="1" opacity="0.6" />
      <line x1="80" y1="36" x2="94" y2="30" stroke="#ede9fe" strokeWidth="1" opacity="0.6" />
      <line x1="68" y1="72" x2="80" y2="86" stroke="#fce7f3" strokeWidth="1" opacity="0.6" />
      <line x1="32" y1="72" x2="20" y2="86" stroke="#ede9fe" strokeWidth="1" opacity="0.6" />
      <circle cx="50" cy="14" r="3.5" fill="#fce7f3" />
      <circle cx="20" cy="36" r="3" fill="#ede9fe" />
      <circle cx="80" cy="36" r="3" fill="#fce7f3" />
      <circle cx="32" cy="72" r="3" fill="#ede9fe" />
      <circle cx="68" cy="72" r="3" fill="#fce7f3" />
      <circle cx="6" cy="30" r="2" fill="#fce7f3" opacity="0.7" />
      <circle cx="94" cy="30" r="2" fill="#ede9fe" opacity="0.7" />
      <circle cx="50" cy="40" r="5.5" fill="#fef2f2" />
    </svg>
  );
}

function ForgeEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="frg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="60%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#052e16" />
        </linearGradient>
      </defs>
      <path d="M24,128 C24,103 19,88 22,68 C25,52 36,43 50,38 C64,43 75,52 78,68 C81,88 76,103 76,128Z" fill="url(#frg-g)" />
      <polygon points="24,68 10,52 17,40 30,56" fill="#22c55e" />
      <polygon points="76,68 90,52 83,40 70,56" fill="#22c55e" />
      <polygon points="42,38 35,22 48,28" fill="#4ade80" />
      <polygon points="58,38 65,22 52,28" fill="#4ade80" />
      <polygon points="50,36 47,16 53,16" fill="#86efac" />
      <polygon points="50,63 44,76 50,83 56,76" fill="#86efac" />
      <path d="M34,128 C29,123 27,116 31,110" stroke="#166534" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M50,128 C50,120 50,113 50,108" stroke="#166534" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M66,128 C71,123 73,116 69,110" stroke="#166534" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function PaleEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="pal-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="40%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M28,135 C24,112 19,90 22,66 C25,48 36,36 50,25 C64,36 75,48 78,66 C81,90 76,112 72,135Z" fill="url(#pal-g)" />
      <ellipse cx="50" cy="40" rx="13" ry="15" fill="#f1f5f9" opacity="0.92" />
      <path d="M37,28 C40,16 50,10 60,16 C50,12 41,18 37,28Z" fill="#e2e8f0" />
      <path d="M63,28 C60,16 50,10 40,16 C50,12 59,18 63,28Z" fill="#e2e8f0" />
      <path d="M41,23 A10,10 0 0,1 59,23 A8,8 0 0,0 41,23Z" fill="#c4b5fd" />
      <circle cx="43" cy="40" r="3" fill="#1e1b4b" />
      <circle cx="57" cy="40" r="3" fill="#1e1b4b" />
      <path d="M24,68 C13,63 6,55 11,44" stroke="#a855f7" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" />
      <path d="M76,68 C87,63 94,55 89,44" stroke="#a855f7" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" />
      <path d="M21,85 C10,81 3,72 7,60" stroke="#a855f7" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M79,85 C90,81 97,72 93,60" stroke="#a855f7" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

function BloomEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="blm-g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="45%" stopColor="#dc2626" />
          <stop offset="55%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
      </defs>
      <path d="M50,128 C30,108 14,88 26,66 C32,54 42,50 50,42 C58,50 68,54 74,66 C86,88 70,108 50,128Z" fill="url(#blm-g)" />
      <path d="M42,48 C37,38 28,30 16,22 C21,16 30,18 38,28 C32,20 33,10 40,4 C42,14 42,34 42,48Z" fill="#22c55e" />
      <path d="M58,48 C63,38 72,30 84,22 C79,16 70,18 62,28 C68,20 67,10 60,4 C58,14 58,34 58,48Z" fill="#22c55e" />
      <circle cx="14" cy="20" r="5" fill="#4ade80" />
      <circle cx="86" cy="20" r="5" fill="#4ade80" />
      <circle cx="40" cy="2" r="4" fill="#bbf7d0" />
      <circle cx="60" cy="2" r="4" fill="#bbf7d0" />
      <circle cx="50" cy="40" r="6.5" fill="#fbbf24" />
    </svg>
  );
}

function CompassEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="cmp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <polygon points="50,18 55,38 72,28 62,44 82,48 62,52 72,68 55,58 50,78 45,58 28,68 38,52 18,48 38,44 28,28 45,38" fill="url(#cmp-g)" />
      <circle cx="50" cy="48" r="24" fill="none" stroke="#e879f9" strokeWidth="1.5" opacity="0.55" />
      <circle cx="50" cy="48" r="16" fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.4" />
      <path d="M42,70 C40,88 40,108 43,126 C46,131 54,131 57,126 C60,108 60,88 58,70Z" fill="#818cf8" />
      <circle cx="50" cy="18" r="3.5" fill="#fdf4ff" />
      <circle cx="82" cy="48" r="3.5" fill="#fdf4ff" />
      <circle cx="18" cy="48" r="3.5" fill="#fdf4ff" />
      <circle cx="50" cy="48" r="9" fill="#1e1b4b" />
      <circle cx="50" cy="48" r="4.5" fill="#d946ef" />
    </svg>
  );
}

function OracleEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <radialGradient id="orc-g" cx="50%" cy="38%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#6366f1" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="22" fill="url(#orc-g)" />
      <path d="M50,30 C46,18 42,10 50,4 C58,10 54,18 50,30Z" fill="#f59e0b" />
      <path d="M30,62 C18,66 10,63 6,54 C13,48 22,52 30,62Z" fill="#6366f1" />
      <path d="M70,62 C82,66 90,63 94,54 C87,48 78,52 70,62Z" fill="#22c55e" />
      <circle cx="50" cy="16" r="9" fill="#fef9c3" />
      <circle cx="24" cy="64" r="8" fill="#e0e7ff" />
      <circle cx="76" cy="64" r="8" fill="#dcfce7" />
      <circle cx="47" cy="16" r="2.5" fill="#b45309" />
      <circle cx="53" cy="16" r="2.5" fill="#b45309" />
      <circle cx="21" cy="64" r="2" fill="#4338ca" />
      <circle cx="27" cy="64" r="2" fill="#4338ca" />
      <circle cx="73" cy="64" r="2" fill="#166534" />
      <circle cx="79" cy="64" r="2" fill="#166534" />
      <path d="M41,70 C39,90 40,110 43,126 C46,131 54,131 57,126 C60,110 61,90 59,70Z" fill="#f59e0b" opacity="0.75" />
      <circle cx="50" cy="52" r="30" fill="none" stroke="#fef08a" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

function NullEntity({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
      <defs>
        <linearGradient id="nul-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="30%" stopColor="#4338ca" />
          <stop offset="70%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M34,132 C31,110 27,88 30,66 C33,48 41,38 50,30 C59,38 67,48 70,66 C73,88 69,110 66,132Z" fill="url(#nul-g)" />
      <polygon points="50,8 54.5,22 63,16 56,27 68,24 58,33 72,33 60,39 72,47 58,43 64,55 50,47 36,55 42,43 28,47 40,39 28,33 42,33 32,24 44,27 37,16 45.5,22" fill="#4338ca" opacity="0.75" />
      <polygon points="50,18 53,27 58,24 54,30 60,28 55,33 62,33 55,36 60,41 53,39 56,46 50,42 44,46 47,39 40,41 45,36 38,33 45,33 40,28 46,30 42,24 47,27" fill="#818cf8" opacity="0.85" />
      <circle cx="50" cy="32" r="5.5" fill="#e0e7ff" />
      <circle cx="27" cy="68" r="2.5" fill="#4338ca" opacity="0.55" />
      <circle cx="73" cy="63" r="2" fill="#4338ca" opacity="0.45" />
      <circle cx="24" cy="88" r="2" fill="#4338ca" opacity="0.3" />
      <circle cx="76" cy="83" r="1.5" fill="#818cf8" opacity="0.4" />
      <circle cx="19" cy="108" r="2" fill="#818cf8" opacity="0.2" />
      <circle cx="81" cy="103" r="1.5" fill="#818cf8" opacity="0.2" />
      <path d="M29,66 C22,58 18,47 25,40" stroke="#818cf8" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M71,66 C78,58 82,47 75,40" stroke="#818cf8" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Luminary Visuals Map (ID-keyed) ─────────────────────────────────────────

export const LUMINARY_VISUALS: Record<string, LuminaryVisuals> = {
  lum_ember:   { id: 'lum_ember',   primaryColor: '#ef4444', secondaryColor: '#f97316', glowColor: 'rgba(239,68,68,0.6)',   EntityArt: EmberEntity   },
  lum_tide:    { id: 'lum_tide',    primaryColor: '#3b82f6', secondaryColor: '#06b6d4', glowColor: 'rgba(59,130,246,0.6)',  EntityArt: TideEntity    },
  lum_root:    { id: 'lum_root',    primaryColor: '#22c55e', secondaryColor: '#84cc16', glowColor: 'rgba(34,197,94,0.6)',   EntityArt: RootEntity    },
  lum_void:    { id: 'lum_void',    primaryColor: '#6b7280', secondaryColor: '#374151', glowColor: 'rgba(107,114,128,0.5)', EntityArt: VoidEntity    },
  lum_radiant: { id: 'lum_radiant', primaryColor: '#c084fc', secondaryColor: '#e879f9', glowColor: 'rgba(192,132,252,0.6)',EntityArt: RadiantEntity },
  lum_astral:  { id: 'lum_astral',  primaryColor: '#f43f5e', secondaryColor: '#8b5cf6', glowColor: 'rgba(244,63,94,0.55)', EntityArt: AstralEntity  },
  lum_forge:   { id: 'lum_forge',   primaryColor: '#16a34a', secondaryColor: '#292524', glowColor: 'rgba(22,163,74,0.55)', EntityArt: ForgeEntity   },
  lum_pale:    { id: 'lum_pale',    primaryColor: '#a855f7', secondaryColor: '#e2e8f0', glowColor: 'rgba(168,85,247,0.55)',EntityArt: PaleEntity    },
  lum_bloom:   { id: 'lum_bloom',   primaryColor: '#dc2626', secondaryColor: '#16a34a', glowColor: 'rgba(220,38,38,0.55)', EntityArt: BloomEntity   },
  lum_compass: { id: 'lum_compass', primaryColor: '#2563eb', secondaryColor: '#d946ef', glowColor: 'rgba(37,99,235,0.55)', EntityArt: CompassEntity },
  lum_oracle:  { id: 'lum_oracle',  primaryColor: '#f59e0b', secondaryColor: '#6366f1', glowColor: 'rgba(245,158,11,0.6)', EntityArt: OracleEntity  },
  lum_null:    { id: 'lum_null',    primaryColor: '#4338ca', secondaryColor: '#0f172a', glowColor: 'rgba(67,56,202,0.6)',  EntityArt: NullEntity    },
};

// Fallback visuals for unknown IDs (future-proof)
const FALLBACK_VISUALS: LuminaryVisuals = {
  id: 'fallback',
  primaryColor: '#fbbf24',
  secondaryColor: '#f59e0b',
  glowColor: 'rgba(251,191,36,0.5)',
  EntityArt: ({ size = 140 }) => (
    <svg viewBox="0 0 100 140" width={size} height={size * 1.4}>
      <circle cx="50" cy="70" r="30" fill="#fbbf24" opacity="0.7" />
      <circle cx="50" cy="40" r="12" fill="#fef08a" />
    </svg>
  ),
};

export function getLuminaryVisuals(id: string): LuminaryVisuals {
  return LUMINARY_VISUALS[id] ?? FALLBACK_VISUALS;
}

// ─── Panel Art Component ──────────────────────────────────────────────────────
// Rendered inside LuminaryCard (96×96). Replaces the old portrait PNG.

export function LuminaryPanelArt({
  luminaryId,
  size = 96,
  claimed = false,
}: {
  luminaryId: string;
  size?: number;
  claimed?: boolean;
}) {
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor, secondaryColor, glowColor } = vis;
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${primaryColor}33 0%, ${secondaryColor}22 50%, #030712 100%)`,
      }}
    >
      {/* Decorative corner lines */}
      <div className="absolute inset-1 pointer-events-none" style={{ border: `1px solid ${primaryColor}30`, borderRadius: 8 }} />
      {/* Entity silhouette (slightly cropped to fill card) */}
      <div className="relative flex items-center justify-center" style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}>
        <EntityArt size={size * 0.88} />
      </div>
      {/* Claimed gold tint */}
      {claimed && <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />}
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
    </div>
  );
}

// ─── Summoning Cutscene ───────────────────────────────────────────────────────

type CutscenePhase = 'sealed' | 'glowing' | 'shattering' | 'flashing' | 'revealed' | 'fading' | 'done';

const PHASE_DURATIONS: Record<CutscenePhase, number> = {
  sealed:     400,
  glowing:    700,
  shattering: 500,
  flashing:   300,
  revealed:   1600,
  fading:     600,
  done:       0,
};

const PHASES: CutscenePhase[] = ['sealed', 'glowing', 'shattering', 'flashing', 'revealed', 'fading', 'done'];

const SHARD_OFFSETS = [
  { x: -110, y: -90,  r: 48  },
  { x:  90,  y: -130, r: -35 },
  { x: -90,  y: -45,  r: 65  },
  { x:  130, y: -70,  r: -50 },
  { x: -130, y: 45,   r: 32  },
  { x:  110, y: 90,   r: -65 },
  { x: -70,  y: 130,  r: 18  },
  { x:  70,  y: 110,  r: -88 },
  { x:  0,   y: -155, r: 22  },
  { x:  155, y: 0,    r: -22 },
  { x: -155, y: 20,   r: 78  },
  { x:  20,  y: 155,  r: -15 },
];

export function LuminarySummonCutscene({
  luminaryId,
  luminaryName,
  domain,
  lumens,
  flavor,
  onComplete,
}: {
  luminaryId: string;
  luminaryName: string;
  domain: string;
  lumens: number;
  flavor: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<CutscenePhase>('sealed');
  const vis = getLuminaryVisuals(luminaryId);
  const { EntityArt, primaryColor, secondaryColor, glowColor } = vis;

  useEffect(() => {
    let idx = 0;
    function advance() {
      idx++;
      const next = PHASES[idx] ?? 'done';
      setPhase(next);
      if (next !== 'done') {
        setTimeout(advance, PHASE_DURATIONS[next]);
      } else {
        setTimeout(onComplete, 100);
      }
    }
    const t = setTimeout(advance, PHASE_DURATIONS['sealed']);
    return () => clearTimeout(t);
  }, [onComplete]);

  const isShattering = phase === 'shattering' || phase === 'flashing';
  const isFlashing   = phase === 'flashing';
  const isRevealed   = phase === 'revealed' || phase === 'fading';
  const isFading     = phase === 'fading';
  const isSealed     = phase === 'sealed' || phase === 'glowing';
  const isGlowing    = phase === 'glowing';

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onComplete}
    >
      {/* Skip hint */}
      <div className="absolute bottom-8 text-xs text-white/30 tracking-widest uppercase pointer-events-none">tap to skip</div>

      {/* Sealed panel / shattering phase */}
      <AnimatePresence>
        {isSealed && (
          <motion.div
            key="panel"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{
              scale: isGlowing ? [1, 1.04, 1] : 1,
              opacity: 1,
              boxShadow: isGlowing
                ? [`0 0 30px ${primaryColor}99`, `0 0 60px ${primaryColor}cc`, `0 0 30px ${primaryColor}99`]
                : `0 0 20px ${primaryColor}66`,
            }}
            exit={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.4, boxShadow: { repeat: Infinity, duration: 0.7 } }}
            className="relative rounded-2xl overflow-hidden"
            style={{
              width: 180,
              height: 180,
              border: `2px solid ${primaryColor}88`,
            }}
          >
            <LuminaryPanelArt luminaryId={luminaryId} size={180} />
            {/* Crack lines overlay during glowing */}
            {isGlowing && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 180 180">
                <motion.path
                  d="M90,0 L82,60 L90,90 L100,120 L88,180"
                  stroke="white" strokeWidth="1.5" fill="none" opacity={0.6}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
                <motion.path
                  d="M0,90 L55,82 L90,90 L120,96 L180,88"
                  stroke="white" strokeWidth="1" fill="none" opacity={0.4}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                />
                <motion.path
                  d="M40,0 L70,70 L50,120 L60,180"
                  stroke="white" strokeWidth="0.8" fill="none" opacity={0.3}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                />
              </svg>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shards flying outward */}
      <AnimatePresence>
        {isShattering && SHARD_OFFSETS.map((s, i) => (
          <motion.div
            key={`shard-${i}`}
            className="absolute rounded-sm"
            style={{
              width: 14 + (i % 4) * 6,
              height: 14 + (i % 3) * 6,
              background: i % 2 === 0 ? primaryColor : secondaryColor,
              boxShadow: `0 0 8px ${glowColor}`,
            }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ x: s.x, y: s.y, rotate: s.r, opacity: 0, scale: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Flash */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            key="flash"
            className="absolute inset-0"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: `radial-gradient(ellipse at center, #fff 0%, ${primaryColor} 40%, transparent 80%)` }}
          />
        )}
      </AnimatePresence>

      {/* Entity reveal */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            key="entity"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: isFading ? 0.8 : 1,
              opacity: isFading ? 0 : 1,
              y: isFading ? -30 : [0, -8, 0],
            }}
            transition={{
              scale:   { duration: 0.6, ease: 'easeOut' },
              opacity: { duration: isFading ? 0.6 : 0.5 },
              y:       { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
            }}
            className="relative flex flex-col items-center gap-4"
          >
            {/* Aura behind entity */}
            <div
              className="absolute"
              style={{
                width: 260,
                height: 260,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: `radial-gradient(ellipse at center, ${primaryColor}55 0%, ${secondaryColor}33 40%, transparent 75%)`,
                filter: 'blur(18px)',
                pointerEvents: 'none',
              }}
            />
            {/* Entity SVG — transparent background, no card border */}
            <div style={{ filter: `drop-shadow(0 0 20px ${glowColor}) drop-shadow(0 0 8px ${primaryColor}aa)` }}>
              <EntityArt size={200} />
            </div>
            {/* Name + info badge */}
            <div className="relative flex flex-col items-center gap-1 text-center">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: primaryColor }}>
                {domain}
              </div>
              <div className="text-xl font-serif font-bold text-white drop-shadow-lg">
                {luminaryName}
              </div>
              <div
                className="text-base font-bold px-3 py-0.5 rounded-full"
                style={{ background: `${primaryColor}33`, color: primaryColor, border: `1px solid ${primaryColor}66` }}
              >
                +{lumens} Eminence
              </div>
              <div className="text-[11px] text-white/55 italic max-w-[240px] mt-1 leading-snug">
                "{flavor}"
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
