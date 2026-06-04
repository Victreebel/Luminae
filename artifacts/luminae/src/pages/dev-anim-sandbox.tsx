import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import {
  LuminarySummonCutscene,
  LuminaryIdleOverlay,
  getLuminaryVisuals,
  getLuminaryImageAssets,
} from '@/lib/luminaryAssets';

// ─── Sandbox Luminary Catalog ─────────────────────────────────────────────────
// summonColor is no longer stored here — it is derived from getLuminaryVisuals()
// which is now the single source of truth (LUMINARY_VISUALS in luminaryAssets.tsx).
// Only display-only fields that are not part of the visual asset map live here.

interface SandboxLuminary {
  id: string;
  name: string;
  domain: string;
  lumens: number;
  flavor: string;
}

const SANDBOX_LUMINARIES: SandboxLuminary[] = [
  { id: 'lum_ember',   name: 'The Ember Sovereign',     domain: 'Flame',        lumens: 4, flavor: 'What cannot survive the fire is granted the mercy of disappearance.' },
  { id: 'lum_tide',    name: 'The Tide Architect',      domain: 'Tides',        lumens: 2, flavor: 'Possibility collapses to its bias.' },
  { id: 'lum_verdant', name: 'The Verdant Oracle',      domain: 'Verdance',     lumens: 2, flavor: 'It answers only after the question has taken root.' },
  { id: 'lum_void',    name: 'The Void Warden',         domain: 'Void',         lumens: 0, flavor: 'In the space between stars, something watches without eyes.' },
  { id: 'lum_radiant', name: 'Concordance Mandala',     domain: 'Coherence',    lumens: 2, flavor: 'Truth is not revealed. It is aligned.' },
  { id: 'lum_astral',  name: 'Phoenix Paradox',         domain: 'Recurrence',   lumens: 3, flavor: 'Every ending becomes fuel. Every return comes back less innocent.' },
  { id: 'lum_bloom',   name: 'Catalyst Bloom',          domain: 'Aftergrowth',  lumens: 3, flavor: 'It waits for the nova to wound the world, then flowers in the scar.' },
  { id: 'lum_forge',   name: 'The Iron Harbinger',      domain: 'Ruin',         lumens: 3, flavor: 'The hammer falls only after the future has already broken.' },
  { id: 'lum_compass', name: '???',                     domain: 'Erasure',      lumens: 3, flavor: 'Everyone remembered something happened, but no one can recall what was lost.' },
  { id: 'lum_pale',    name: 'The Pale Merchant',       domain: 'Balance',      lumens: 3, flavor: 'Every bargain reveals one truth and buries another.' },
  { id: 'lum_oracle',  name: 'The Cosmic Oracle',       domain: 'Prophecy',     lumens: 4, flavor: 'She sees what will be, and what might have been, and cannot tell the difference.' },
  { id: 'lum_null',    name: 'The Null Sovereign',      domain: 'Transcendence',lumens: 0, flavor: 'Past the last observable star, entire futures fall silent without being destroyed.' },
  { id: 'lum_hunger',  name: 'The First Hunger',        domain: 'Assimilation', lumens: 2, flavor: 'Its first act is consumption. Its second is perfect repetition.' },
  { id: 'lum_moth',    name: 'Red Moth',                domain: 'Rupture',      lumens: 2, flavor: 'Where it passes, the universe is divided into before and after.' },
  { id: 'lum_seed',    name: 'The Seed Beyond Seasons', domain: 'Propagation',  lumens: 3, flavor: 'It leaves its avatars where tomorrow has already begun to remember.' },
  { id: 'lum_orchard', name: 'Glass Orchard',           domain: 'Replication',  lumens: 3, flavor: 'It learned to copy itself perfectly, and called the absence of error peace.' },
];

// ─── Mode ─────────────────────────────────────────────────────────────────────

type SandboxMode = 'summon' | 'idle' | 'aura';

const MODES: { id: SandboxMode; label: string }[] = [
  { id: 'summon', label: 'Summon Flash' },
  { id: 'idle',   label: 'Idle Portal' },
  { id: 'aura',   label: 'Aura Layer' },
];

// Mock card dimensions matching the game board (BOARD_CARD_W × BOARD_CARD_H approx)
const MOCK_CARD_W = 112;
const MOCK_CARD_H = 160;

// ─── Idle Portal Preview ──────────────────────────────────────────────────────
// Renders a visible mock card with [data-luminary-id] so LuminaryIdleOverlay
// can measure its position and paint itself over it via fixed positioning.

function IdlePortalPreview({ lum, idleKey }: { lum: SandboxLuminary; idleKey: number }) {
  const vis = getLuminaryVisuals(lum.id);
  const [replayKey, setReplayKey] = useState(0);

  // Reset local replay counter whenever the parent selects a new Luminary
  useEffect(() => { setReplayKey(0); }, [idleKey]);

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
        Entity returns to card · idle aura pulses after 1.2 s
      </p>

      {/* Mock card — the [data-luminary-id] anchor that LuminaryIdleOverlay tracks */}
      <div
        style={{
          width: MOCK_CARD_W,
          height: MOCK_CARD_H,
          position: 'relative',
          borderRadius: 8,
          background: '#0d0d1a',
          border: `1px solid ${vis.primaryColor}40`,
          boxShadow: `0 0 18px ${vis.glowColor}22`,
          flexShrink: 0,
        }}
      >
        {/* ID badge anchors the overlay */}
        <div
          data-luminary-id={lum.id}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
          }}
        />
        {/* Minimal card label visible beneath the entity overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '4px 6px',
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#e2e8f0',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {lum.name}
          </div>
          <div style={{ fontSize: 8, color: vis.primaryColor, marginTop: 1 }}>
            {lum.domain}
          </div>
        </div>
      </div>

      {/* The overlay mounts fresh on each key change (outer idleKey = new selection, inner replayKey = replay) */}
      <LuminaryIdleOverlay key={`${idleKey}-${replayKey}`} luminaryId={lum.id} />

      {/* Replay button — re-keys the overlay so the return-flight runs again from scratch */}
      <button
        type="button"
        onClick={() => setReplayKey(k => k + 1)}
        className="text-[11px] font-mono px-3 py-1.5 rounded border transition-colors"
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderColor: `${vis.primaryColor}50`,
          color: vis.primaryColor,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
      >
        ↺ Replay
      </button>

      <p className="text-[10px] text-muted-foreground/40 text-center max-w-xs">
        {lum.flavor}
      </p>
    </div>
  );
}

// ─── Aura Layer Preview ───────────────────────────────────────────────────────

function AuraLayerPreview({ lum }: { lum: SandboxLuminary }) {
  const vis = getLuminaryVisuals(lum.id);
  const { auraLayer: auraUrl } = getLuminaryImageAssets(lum.id);

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
        Aura PNG · screen blend · mid-tone swatch
      </p>

      {/* Three background swatches to check fringing */}
      <div className="flex gap-4 items-start flex-wrap justify-center">
        {(['#1e1e2e', '#2d2d45', '#3a3a5c'] as const).map((bg, i) => (
          <div key={bg} className="flex flex-col items-center gap-1">
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 10,
                background: bg,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {auraUrl ? (
                <img
                  src={auraUrl}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    mixBlendMode: 'screen',
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 10, color: '#64748b', textAlign: 'center', padding: 8 }}>
                    No aura asset
                  </span>
                </div>
              )}
            </div>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#475569' }}>
              {bg} {i === 0 ? '(dark)' : i === 1 ? '(mid)' : '(lighter)'}
            </span>
          </div>
        ))}
      </div>

      {/* Procedural glow reference */}
      <div className="flex flex-col items-center gap-1 mt-2">
        <p className="text-[10px] text-muted-foreground/40">Procedural radial glow (in-engine fallback)</p>
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 10,
            background: '#1e1e2e',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -20,
              borderRadius: 22,
              background: `radial-gradient(ellipse at 50% 42%, ${vis.glowColor}3a 0%, ${vis.primaryColor}1c 42%, ${vis.glowColor}0d 66%, transparent 84%)`,
            }}
          />
        </div>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#475569' }}>
          {vis.glowColor} / {vis.primaryColor}
        </span>
      </div>
    </div>
  );
}

// ─── Luminary Grid Card ───────────────────────────────────────────────────────

function LuminaryGridCard({
  lum,
  isActive,
  mode,
  onClick,
}: {
  lum: SandboxLuminary;
  isActive: boolean;
  mode: SandboxMode;
  onClick: () => void;
}) {
  const vis = getLuminaryVisuals(lum.id);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-lg overflow-hidden border border-border/30 hover:border-border/60 transition-colors text-left group"
      style={{ background: '#0a0a14' }}
    >
      {/* Color swatch strip — summonColor sourced from LUMINARY_VISUALS */}
      <div
        className="h-1.5 w-full"
        style={{ background: mode === 'summon' ? vis.summonColor : vis.primaryColor }}
      />

      <div className="p-3 flex flex-col gap-1">
        {/* Glow dot + ID */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: vis.primaryColor,
              boxShadow: `0 0 6px ${vis.glowColor}`,
            }}
          />
          <span className="text-[10px] font-mono text-muted-foreground/60 leading-none">{lum.id}</span>
        </div>

        {/* Name */}
        <span className="text-xs font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-white transition-colors">
          {lum.name}
        </span>

        {/* Domain + lumens */}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-muted-foreground">{lum.domain}</span>
          {lum.lumens > 0 && (
            <span className="text-[10px] font-mono text-amber-400">{lum.lumens}✦</span>
          )}
        </div>

        {/* Mode-specific info row */}
        {mode === 'summon' && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0 border border-white/10"
              style={{ background: vis.summonColor }}
            />
            <span className="text-[9px] font-mono text-muted-foreground/50">{vis.summonColor}</span>
          </div>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{ boxShadow: `inset 0 0 0 2px ${mode === 'summon' ? vis.summonColor : vis.primaryColor}` }}
        />
      )}
    </button>
  );
}

// ─── DevAnimSandbox ───────────────────────────────────────────────────────────

export default function DevAnimSandbox() {
  const [, setLocation] = useLocation();

  // Summon mode state
  const [active, setActive] = useState<SandboxLuminary | null>(null);
  const [summonKey, setSummonKey] = useState(0);

  // Idle / Aura mode state
  const [mode, setMode] = useState<SandboxMode>('summon');
  const [selected, setSelected] = useState<SandboxLuminary | null>(null);
  const [idleKey, setIdleKey] = useState(0);

  function handleGridClick(lum: SandboxLuminary) {
    if (mode === 'summon') {
      setActive(lum);
      setSummonKey(k => k + 1);
    } else {
      setSelected(lum);
      // Re-key the overlay so it mounts fresh (new return-flight animation)
      setIdleKey(k => k + 1);
    }
  }

  function handleSummonComplete() {
    setActive(null);
  }

  const instructions: Record<SandboxMode, string> = {
    summon: 'Click any Luminary to preview its full summon cutscene with its correct flash tint.',
    idle:   'Click any Luminary to preview its idle portal overlay — entity return-flight + looping aura glow.',
    aura:   'Click any Luminary to preview its aura PNG asset on mid-tone backgrounds to check fringing.',
  };

  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground flex flex-col">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/60 shrink-0 flex-wrap gap-y-2">
        <button
          type="button"
          onClick={() => setLocation('/')}
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border/30 hover:border-border/60"
        >
          ← home
        </button>
        <span className="text-sm font-semibold tracking-wide">DevAnimSandbox</span>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 ml-2 bg-black/30 rounded-md p-0.5 border border-border/20">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setSelected(null);
              }}
              className="text-[11px] font-mono px-2.5 py-1 rounded transition-colors"
              style={{
                background: mode === m.id ? 'rgba(255,255,255,0.10)' : 'transparent',
                color:      mode === m.id ? '#e2e8f0' : '#64748b',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">DEV ONLY</span>
      </div>

      {/* ── Instructions ──────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground text-center pt-4 pb-2 px-4">
        {instructions[mode]}
      </p>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* Luminary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-3xl mx-auto">
          {SANDBOX_LUMINARIES.map(lum => (
            <LuminaryGridCard
              key={lum.id}
              lum={lum}
              isActive={
                mode === 'summon'
                  ? active?.id === lum.id
                  : selected?.id === lum.id
              }
              mode={mode}
              onClick={() => handleGridClick(lum)}
            />
          ))}
        </div>

        {/* ── Idle Portal Preview ────────────────────────────────────────── */}
        {mode === 'idle' && selected && (
          <div className="max-w-3xl mx-auto mt-6 border-t border-border/20 pt-4">
            <IdlePortalPreview lum={selected} idleKey={idleKey} />
          </div>
        )}
        {mode === 'idle' && !selected && (
          <p className="text-center text-[11px] text-muted-foreground/30 mt-8">
            ↑ select a Luminary above to preview its idle portal
          </p>
        )}

        {/* ── Aura Layer Preview ─────────────────────────────────────────── */}
        {mode === 'aura' && selected && (
          <div className="max-w-3xl mx-auto mt-6 border-t border-border/20 pt-4">
            <AuraLayerPreview lum={selected} />
          </div>
        )}
        {mode === 'aura' && !selected && (
          <p className="text-center text-[11px] text-muted-foreground/30 mt-8">
            ↑ select a Luminary above to preview its aura layer
          </p>
        )}
      </div>

      {/* ── Summon Cutscene (overlay) ──────────────────────────────────────── */}
      <AnimatePresence>
        {mode === 'summon' && active && (
          <div key={summonKey} className="fixed inset-0 z-50">
            <LuminarySummonCutscene
              luminaryId={active.id}
              luminaryName={active.name}
              domain={active.domain}
              lumens={active.lumens}
              flavor={active.flavor}
              overrideColor={getLuminaryVisuals(active.id).summonColor}
              onComplete={handleSummonComplete}
              onSkip={handleSummonComplete}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
