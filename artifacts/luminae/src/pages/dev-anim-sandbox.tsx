import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LuminarySummonCutscene,
  LuminaryIdleOverlay,
  getLuminaryVisuals,
} from '@/lib/luminaryAssets';
import { LuminaryActivationCinematic } from '@/components/LuminaryActivationCinematic';
import { CipherApertureAnimation, PHASE_DUR } from '@/components/CipherApertureAnimation';
import { ForgeAnimation, OpponentForgeAnimation, FORGE_PHASE_MS } from './game-forge-animation';
import { BurnPileParticle } from './game-luminary-effects';
import { CIPHER_MODE_TOTAL_MS, type CipherApertureMode, DEAL_ANIM_MS } from './game-constants';
import { ArtifactCardView, EminenceDiamond } from './game-card';
import { CardBackTier1, CardBackTier2, CardBackTier3 } from '@/components/ArtifactCardBack';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { type ArtifactCard, ArtifactCardBonusColor } from '@workspace/api-client-react';
import { gameAudio } from '@/lib/audio';

// ─── Sandbox Luminary Catalog ─────────────────────────────────────────────────

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
  { id: 'lum_orchard', name: 'The Glass Orchard',        domain: 'Replication',  lumens: 3, flavor: 'It learned to copy itself perfectly, and called the absence of error peace.' },
];

// ─── Luminary Mode ────────────────────────────────────────────────────────────

type SandboxMode = 'summon' | 'idle' | 'activation';

const MODES: { id: SandboxMode; label: string }[] = [
  { id: 'summon',     label: 'Summon Flash' },
  { id: 'activation', label: 'Activation' },
  { id: 'idle',       label: 'Idle Portal' },
];

// ─── Card FX Mode ─────────────────────────────────────────────────────────────

type CardFxMode = 'cipher_reserve' | 'forge_burst' | 'opponent_forge' | 'reserved_forge_ring' | 'market_deal_flip' | 'burn_pile_particle';

const CARD_FX_MODES: { id: CardFxMode; label: string }[] = [
  { id: 'cipher_reserve',       label: 'Cipher Reserve' },
  { id: 'forge_burst',          label: 'Forge Burst' },
  { id: 'opponent_forge',       label: 'Opponent Forge' },
  { id: 'reserved_forge_ring',  label: 'Reserved Ring' },
  { id: 'market_deal_flip',     label: 'Market Flip' },
  { id: 'burn_pile_particle',   label: 'Burn → Pile' },
];

// ─── Card FX Helpers ──────────────────────────────────────────────────────────

const AFFINITY_OPTIONS: { key: GemKey; label: string }[] = GEM_KEYS.map(k => ({
  key: k,
  label: GEM_META[k].name,
}));

function makeMockCard(tier: 1 | 2 | 3, affinity: GemKey): ArtifactCard {
  const names: Record<GemKey, string> = {
    ruby:     'Ember Conduit',
    pearl:    'Crystal Lens',
    emerald:  'Root Nexus',
    sapphire: 'Time Lattice',
    onyx:     'Void Shard',
    flux:     'Singularity Node',
  };
  const cost: Record<GemKey, number> = { ruby: 0, pearl: 0, emerald: 0, sapphire: 0, onyx: 0, flux: 0 };
  if (affinity === 'flux') { cost.flux = 1; cost.ruby = tier; }
  else { cost[affinity] = 2 + tier; }

  // flux is not a valid ArtifactCardBonusColor (cards can't give flux as a bonus);
  // fall back to ruby for the mock so the card renders correctly.
  const bonusColor = affinity === 'flux'
    ? ArtifactCardBonusColor.ruby
    : ArtifactCardBonusColor[affinity as keyof typeof ArtifactCardBonusColor];

  return {
    id: `mock-${affinity}-t${tier}`,
    tier,
    bonusColor,
    lumens: tier,
    cost,
    name: names[affinity],
    flavor: 'A mock artifact for sandbox testing.',
  };
}

// ─── Shared control primitives ────────────────────────────────────────────────

function AffinityPicker({ value, onChange }: { value: GemKey; onChange: (k: GemKey) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {AFFINITY_OPTIONS.map(({ key, label }) => {
        const meta = GEM_META[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
            style={{
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: active ? meta.hex : 'rgba(255,255,255,0.15)',
              background:  active ? `${meta.hex}22` : 'transparent',
              color:       active ? meta.hex : '#64748b',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TierPicker({ value, onChange }: { value: 1 | 2 | 3; onChange: (t: 1 | 2 | 3) => void }) {
  return (
    <div className="flex gap-1.5 items-center">
      {([1, 2, 3] as const).map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className="text-[10px] font-mono px-2.5 py-0.5 rounded border transition-colors"
          style={{
            borderColor: value === t ? '#a78bfa' : 'rgba(255,255,255,0.15)',
            background:  value === t ? 'rgba(167,139,250,0.12)' : 'transparent',
            color:       value === t ? '#a78bfa' : '#64748b',
          }}
        >
          T{t}
        </button>
      ))}
    </div>
  );
}

function ReplayButton({ onClick, accentHex }: { onClick: () => void; accentHex?: string }) {
  const color = accentHex ?? '#a78bfa';
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-mono px-4 py-1.5 rounded border transition-colors"
      style={{
        background:  'rgba(255,255,255,0.04)',
        borderColor: `${color}60`,
        color,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
    >
      ▶ Play
    </button>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest min-w-[72px]">{label}</span>
      {children}
    </div>
  );
}

// ─── TimingBar ────────────────────────────────────────────────────────────────
// Displays a proportional phase bar + per-phase labels sourced directly from
// the animation constants so they stay in sync automatically.
// When `playing` is true a RAF loop drives a cursor that moves proportional to
// elapsed time, and the active phase segment pulses at full opacity while
// inactive segments dim. The cursor resets when `playing` goes false.

interface PhaseSegment {
  label: string;
  ms: number;
}

const TIMING_COLORS = [
  '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185',
];

function TimingBar({
  totalMs,
  phases,
  playing = false,
  playKey = 0,
}: {
  totalMs: number;
  phases: PhaseSegment[];
  playing?: boolean;
  playKey?: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!playing) {
      setElapsed(0);
      return;
    }
    startTsRef.current = performance.now();
    function tick() {
      const e = Math.min(performance.now() - startTsRef.current, totalMs);
      setElapsed(e);
      if (e < totalMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, playKey, totalMs]);

  const cursorPct = totalMs > 0 ? (elapsed / totalMs) * 100 : 0;

  // Determine which phase is currently active based on cumulative ms
  let cumulative = 0;
  let activePhaseIdx = -1;
  for (let i = 0; i < phases.length; i++) {
    const start = cumulative;
    cumulative += phases[i].ms;
    if (elapsed >= start && elapsed < cumulative) {
      activePhaseIdx = i;
      break;
    }
  }
  // After the last phase completes keep highlighting it briefly
  if (activePhaseIdx === -1 && elapsed >= totalMs && phases.length > 0) {
    activePhaseIdx = phases.length - 1;
  }

  return (
    <div className="flex flex-col gap-1.5 pt-3 border-t border-border/10">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">timing</span>
        <span className="text-[10px] font-mono text-muted-foreground/60 tabular-nums">
          {playing
            ? <span>{Math.round(elapsed)}&thinsp;<span className="opacity-40">/</span>&thinsp;{totalMs} ms</span>
            : `${totalMs} ms total`
          }
        </span>
      </div>
      {/* Proportional phase bar with live cursor */}
      <div className="relative flex h-2.5 w-full rounded overflow-hidden gap-px">
        {phases.map((p, i) => {
          const isActive = playing && i === activePhaseIdx;
          return (
            <div
              key={p.label}
              title={`${p.label}: ${p.ms} ms`}
              style={{
                width: `${(p.ms / totalMs) * 100}%`,
                background: TIMING_COLORS[i % TIMING_COLORS.length],
                opacity: playing ? (isActive ? 1 : 0.22) : 0.65,
                minWidth: 1,
                transition: playing ? 'opacity 80ms linear' : 'opacity 0.3s',
                boxShadow: isActive
                  ? `0 0 6px 1px ${TIMING_COLORS[i % TIMING_COLORS.length]}99`
                  : 'none',
              }}
            />
          );
        })}
        {/* Playhead cursor */}
        {playing && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${cursorPct}%`,
              width: 2,
              background: 'rgba(255,255,255,0.95)',
              transform: 'translateX(-50%)',
              borderRadius: 1,
              boxShadow: '0 0 5px rgba(255,255,255,0.7)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {/* Per-phase labels — active label brightens */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {phases.map((p, i) => {
          const isActive = playing && i === activePhaseIdx;
          return (
            <span
              key={p.label}
              className="text-[9px] font-mono tabular-nums"
              style={{
                color: TIMING_COLORS[i % TIMING_COLORS.length],
                opacity: playing ? (isActive ? 1 : 0.3) : 0.85,
                fontWeight: isActive ? 700 : 400,
                transition: 'opacity 80ms linear, font-weight 0ms',
              }}
            >
              {p.label}&nbsp;{p.ms}ms
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── CardFxPreviewShell ───────────────────────────────────────────────────────
// Two-section layout: top = controls, bottom = bounded preview area.
// Full-screen animations mount on top of the page with a floating Skip button.

function CardFxPreviewShell({
  controls,
  previewArea,
  note,
}: {
  controls: React.ReactNode;
  previewArea: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="mt-4 max-w-2xl mx-auto flex flex-col gap-3">
      {/* Controls section */}
      <div className="rounded-xl border border-border/20 bg-black/30 p-5 flex flex-col gap-4">
        {controls}
      </div>
      {/* Bounded preview area */}
      <div
        className="rounded-xl border border-border/15 overflow-hidden"
        style={{ background: 'rgba(5,5,15,0.7)', minHeight: 200 }}
      >
        {previewArea}
      </div>
      {note && (
        <p className="text-[10px] text-muted-foreground/35 text-center px-4">{note}</p>
      )}
    </div>
  );
}

// ─── ScaledViewportContainer ─────────────────────────────────────────────────
// Renders any animation that uses position:fixed + window.innerWidth/Height
// coordinates WITHIN a bounded preview box, without modifying the animation
// component itself.
//
// CSS stacking-context rule: a parent with a non-none `transform` becomes the
// containing block for position:fixed descendants. By sizing the inner div to
// exactly window.innerWidth × window.innerHeight and applying
// `transform: scale(SCALE)`, all fixed-position elements inside are positioned
// relative to the inner div — whose coordinate space matches the viewport
// dimensions the animation already targets. The outer div clips with
// overflow:hidden to the visible preview area.
//
// Result: Cipher/Forge/OpponentForge animations play fully contained within
// the preview box with zero coordinate modifications.

const PREVIEW_W = 480;
const PREVIEW_H = 300;

function ScaledViewportContainer({
  playing,
  idleLabel,
  children,
}: {
  playing: boolean;
  idleLabel?: string;
  children: React.ReactNode;
}) {
  const scale = PREVIEW_W / window.innerWidth;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: PREVIEW_W,
        height: PREVIEW_H,
        overflow: 'hidden',
        background: 'rgba(3,4,12,0.95)',
        borderRadius: 12,
        margin: '0 auto',
      }}
    >
      {/* Idle label */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">
            {idleLabel ?? 'Press Play to preview'}
          </span>
        </div>
      )}
      {/* Scaled viewport layer — becomes the fixed-positioning containing block */}
      {playing && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Cipher Reserve Preview ───────────────────────────────────────────────────

type CipherDestSide = 'left' | 'center' | 'right';

function CipherReservePreview() {
  const [affinity, setAffinity]         = useState<GemKey>('ruby');
  const [tier, setTier]                 = useState<1 | 2 | 3>(1);
  const [destSide, setDestSide]         = useState<CipherDestSide>('center');
  const [cipherMode, setCipherMode]     = useState<CipherApertureMode>('game');
  const [animKey, setAnimKey]           = useState(0);
  const [playing, setPlaying]           = useState(false);

  const meta = GEM_META[affinity];
  const card = makeMockCard(tier, affinity);

  function play() {
    setAnimKey(k => k + 1);
    setPlaying(true);
  }

  // All coordinates in window.innerWidth/Height space — ScaledViewportContainer
  // scales these to fit correctly within the preview area.
  const sourceRect = {
    x: Math.round(window.innerWidth / 2 - 56),
    y: Math.round(window.innerHeight * 0.32),
    w: 112, h: 160,
  };
  const destPosMap: Record<CipherDestSide, { x: number; y: number }> = {
    left:   { x: Math.round(window.innerWidth * 0.15), y: Math.round(window.innerHeight * 0.88) },
    center: { x: Math.round(window.innerWidth / 2),    y: Math.round(window.innerHeight * 0.88) },
    right:  { x: Math.round(window.innerWidth * 0.85), y: Math.round(window.innerHeight * 0.88) },
  };

  const modeTotalMs = CIPHER_MODE_TOTAL_MS[cipherMode];

  return (
    <CardFxPreviewShell
      note="Cipher sigil forms over the card then collapses to the chosen hand slot. Contained in the preview area below via CSS stacking-context scaling."
      controls={
        <>
          <ControlRow label="Affinity"><AffinityPicker value={affinity} onChange={setAffinity} /></ControlRow>
          <ControlRow label="Tier"><TierPicker value={tier} onChange={setTier} /></ControlRow>
          <ControlRow label="Mode">
            {(['game', 'tutorial'] as CipherApertureMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setCipherMode(m)}
                className="text-[10px] font-mono px-3 py-0.5 rounded border transition-colors capitalize"
                style={{
                  borderColor: cipherMode === m ? meta.hex : 'rgba(255,255,255,0.15)',
                  background:  cipherMode === m ? `${meta.hex}18` : 'transparent',
                  color:       cipherMode === m ? meta.hex : '#64748b',
                }}
              >
                {m}
              </button>
            ))}
          </ControlRow>
          <ControlRow label="Destination">
            {(['left', 'center', 'right'] as CipherDestSide[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setDestSide(s)}
                className="text-[10px] font-mono px-3 py-0.5 rounded border transition-colors"
                style={{
                  borderColor: destSide === s ? meta.hex : 'rgba(255,255,255,0.15)',
                  background:  destSide === s ? `${meta.hex}18` : 'transparent',
                  color:       destSide === s ? meta.hex : '#64748b',
                }}
              >
                {s}
              </button>
            ))}
          </ControlRow>
          <div className="flex justify-center pt-1">
            <ReplayButton onClick={play} accentHex={meta.hex} />
          </div>
          <TimingBar
            totalMs={modeTotalMs}
            phases={[
              { label: 'forefront', ms: PHASE_DUR[cipherMode].forefront },
              { label: 'circuit',   ms: PHASE_DUR[cipherMode].circuit   },
              { label: 'compress',  ms: PHASE_DUR[cipherMode].compress  },
              { label: 'travel',    ms: PHASE_DUR[cipherMode].travel    },
              { label: 'arrive',    ms: PHASE_DUR[cipherMode].arrive    },
            ]}
            playing={playing}
            playKey={animKey}
          />
        </>
      }
      previewArea={
        <ScaledViewportContainer playing={playing} idleLabel="Select affinity & destination, then press Play">
          <CipherApertureAnimation
            key={animKey}
            animKey={animKey}
            mode={cipherMode}
            sourceRect={sourceRect}
            affinityHex={meta.hex}
            cardName={card.name}
            cardFace={<ArtifactCardView card={card} tier={tier} />}
            destPos={destPosMap[destSide]}
            ownerName="Sandbox Player"
            onComplete={() => setPlaying(false)}
          />
        </ScaledViewportContainer>
      }
    />
  );
}

// ─── Forge Burst Preview ──────────────────────────────────────────────────────

function ForgeBurstPreview() {
  const [affinity, setAffinity]   = useState<GemKey>('ruby');
  const [tier, setTier]           = useState<1 | 2 | 3>(1);
  const [eminence, setEminence]   = useState(2);
  // cardName is user-editable; seeded from affinity/tier but never overwritten by Play
  const [cardName, setCardName]   = useState(() => makeMockCard(1, 'ruby').name);
  const [animKey, setAnimKey]     = useState(0);
  const [playing, setPlaying]     = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update default name when affinity/tier changes but only if user hasn't typed a custom value
  const lastAutoNameRef = useRef(makeMockCard(1, 'ruby').name);
  useEffect(() => {
    const autoName = makeMockCard(tier, affinity).name;
    if (cardName === lastAutoNameRef.current) {
      setCardName(autoName);
    }
    lastAutoNameRef.current = autoName;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affinity, tier]);

  const FORGE_FULL_MS = 1150;

  function play() {
    setAnimKey(k => k + 1);
    setPlaying(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setPlaying(false), FORGE_FULL_MS + 400);
  }
  useEffect(() => () => { if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); }, []);

  const card = { ...makeMockCard(tier, affinity), lumens: eminence, name: cardName };
  const meta = GEM_META[affinity];

  const startRect = {
    x: Math.round(window.innerWidth / 2 - 56),
    y: Math.round(window.innerHeight * 0.32),
    w: 112, h: 160,
  };
  const destPos = { x: Math.round(window.innerWidth * 0.85), y: Math.round(window.innerHeight * 0.88) };

  return (
    <CardFxPreviewShell
      note="Stamp + affinity streams → card arcs to civilization tab. Affinity streams require in-game wells (empty in sandbox)."
      controls={
        <>
          <ControlRow label="Affinity"><AffinityPicker value={affinity} onChange={setAffinity} /></ControlRow>
          <ControlRow label="Tier"><TierPicker value={tier} onChange={setTier} /></ControlRow>
          <ControlRow label="Eminence">
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2, 3, 4].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setEminence(v)}
                  className="text-[10px] font-mono w-7 h-6 rounded border transition-colors"
                  style={{
                    borderColor: eminence === v ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                    background:  eminence === v ? 'rgba(251,191,36,0.15)' : 'transparent',
                    color:       eminence === v ? '#fbbf24' : '#64748b',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </ControlRow>
          <ControlRow label="Card Name">
            <input
              type="text"
              value={cardName}
              onChange={e => setCardName(e.target.value)}
              className="text-[11px] font-mono px-2 py-0.5 rounded border bg-transparent text-foreground"
              style={{ borderColor: 'rgba(255,255,255,0.15)', width: 160 }}
            />
          </ControlRow>
          <div className="flex justify-center pt-1">
            <ReplayButton onClick={play} accentHex={meta.hex} />
          </div>
          <TimingBar
            totalMs={FORGE_PHASE_MS.total}
            phases={[
              { label: 'lift',    ms: FORGE_PHASE_MS.lift    },
              { label: 'streams', ms: FORGE_PHASE_MS.streams },
              { label: 'stamp',   ms: FORGE_PHASE_MS.stamp   },
              { label: 'hold',    ms: FORGE_PHASE_MS.hold    },
              { label: 'arc',     ms: FORGE_PHASE_MS.arc     },
            ]}
            playing={playing}
            playKey={animKey}
          />
        </>
      }
      previewArea={
        <ScaledViewportContainer playing={playing} idleLabel="Select affinity & eminence, then press Play">
          <AnimatePresence>
            <ForgeAnimation
              key={animKey}
              animKey={animKey}
              card={card}
              tier={tier}
              startRect={startRect}
              destPos={destPos}
              spentColors={[affinity]}
              lumens={eminence}
              gotFlux={false}
              playerName="Sandbox Player"
            />
          </AnimatePresence>
        </ScaledViewportContainer>
      }
    />
  );
}

// ─── Opponent Forge Preview ───────────────────────────────────────────────────

type DestSide = 'left' | 'center' | 'right';

function OpponentForgePreview() {
  const [affinity, setAffinity]   = useState<GemKey>('sapphire');
  const [tier, setTier]           = useState<1 | 2 | 3>(1);
  const [destSide, setDestSide]   = useState<DestSide>('center');
  const [animKey, setAnimKey]     = useState(0);
  const [playing, setPlaying]     = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FORGE_FULL_MS = 1150;

  function play() {
    setAnimKey(k => k + 1);
    setPlaying(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setPlaying(false), FORGE_FULL_MS + 400);
  }
  useEffect(() => () => { if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); }, []);

  const card = makeMockCard(tier, affinity);
  const meta = GEM_META[affinity];

  const startRect = {
    x: Math.round(window.innerWidth / 2 - 56),
    y: Math.round(window.innerHeight * 0.32),
    w: 112, h: 160,
  };
  const chipCenterMap: Record<DestSide, { x: number; y: number }> = {
    left:   { x: Math.round(window.innerWidth * 0.18), y: Math.round(window.innerHeight * 0.12) },
    center: { x: Math.round(window.innerWidth * 0.50), y: Math.round(window.innerHeight * 0.12) },
    right:  { x: Math.round(window.innerWidth * 0.82), y: Math.round(window.innerHeight * 0.12) },
  };

  return (
    <CardFxPreviewShell
      note="Stamp animation — card arcs to the chosen opponent avatar chip (top of preview area)."
      controls={
        <>
          <ControlRow label="Affinity"><AffinityPicker value={affinity} onChange={setAffinity} /></ControlRow>
          <ControlRow label="Tier"><TierPicker value={tier} onChange={setTier} /></ControlRow>
          <ControlRow label="Destination">
            {(['left', 'center', 'right'] as DestSide[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setDestSide(s)}
                className="text-[10px] font-mono px-3 py-0.5 rounded border transition-colors"
                style={{
                  borderColor: destSide === s ? meta.hex : 'rgba(255,255,255,0.15)',
                  background:  destSide === s ? `${meta.hex}18` : 'transparent',
                  color:       destSide === s ? meta.hex : '#64748b',
                }}
              >
                {s}
              </button>
            ))}
          </ControlRow>
          <div className="flex justify-center pt-1">
            <ReplayButton onClick={play} accentHex={meta.hex} />
          </div>
          <TimingBar
            totalMs={FORGE_PHASE_MS.total}
            phases={[
              { label: 'lift',    ms: FORGE_PHASE_MS.lift    },
              { label: 'streams', ms: FORGE_PHASE_MS.streams },
              { label: 'stamp',   ms: FORGE_PHASE_MS.stamp   },
              { label: 'hold',    ms: FORGE_PHASE_MS.hold    },
              { label: 'arc',     ms: FORGE_PHASE_MS.arc     },
            ]}
            playing={playing}
            playKey={animKey}
          />
        </>
      }
      previewArea={
        <ScaledViewportContainer playing={playing} idleLabel="Select affinity & destination, then press Play">
          <AnimatePresence>
            <OpponentForgeAnimation
              key={animKey}
              animKey={animKey}
              card={card}
              tier={tier}
              startRect={startRect}
              chipCenter={chipCenterMap[destSide]}
              ownerName="Opponent Player"
              spentColors={[affinity]}
            />
          </AnimatePresence>
        </ScaledViewportContainer>
      }
    />
  );
}

// ─── Reserved Forge Ring Preview ──────────────────────────────────────────────
// Rendered inside a bounded container — no fixed/viewport overlay.

// Ring animation layer durations (ms) — extracted here so TimingBar and setTimeout stay in sync.
const RING_OUTER_MS   = 800;   // outer ring expand + fade
const RING_INNER_MS   = 730;   // inner ring (650 ms + 80 ms delay)
const RING_LABEL_MS   = 1100;  // "Forged!" label float + fade
const RING_FADE_MS    = 1300;  // full container opacity fade
const RING_DISMISS_MS = 1700;  // setTimeout dismiss guard (matches RESERVED_FORGE_FULL_MS + buffer)

function ReservedForgeRingPreview() {
  const [eminence, setEminence] = useState(2);
  const [animKey, setAnimKey]   = useState(0);
  const [playing, setPlaying]   = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function play() {
    setAnimKey(k => k + 1);
    setPlaying(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setPlaying(false), RING_DISMISS_MS);
  }
  useEffect(() => () => { if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); }, []);

  return (
    <CardFxPreviewShell
      note="Expanding-ring 'Forged!' overlay shown when a reserved card is purchased. Contained within the preview area below."
      controls={
        <>
          <ControlRow label="Eminence">
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2, 3, 4].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setEminence(v)}
                  className="text-[10px] font-mono w-7 h-6 rounded border transition-colors"
                  style={{
                    borderColor: eminence === v ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                    background:  eminence === v ? 'rgba(251,191,36,0.15)' : 'transparent',
                    color:       eminence === v ? '#fbbf24' : '#64748b',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </ControlRow>
          <div className="flex justify-center pt-1">
            <ReplayButton onClick={play} accentHex="#a78bfa" />
          </div>
          <TimingBar
            totalMs={RING_DISMISS_MS}
            phases={[
              { label: 'outer ring', ms: RING_OUTER_MS   },
              { label: 'inner ring', ms: RING_INNER_MS   },
              { label: 'label float',ms: RING_LABEL_MS   },
              { label: 'fade',       ms: RING_FADE_MS    },
              { label: 'guard',      ms: RING_DISMISS_MS - RING_FADE_MS },
            ]}
            playing={playing}
            playKey={animKey}
          />
        </>
      }
      previewArea={
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{ height: 260 }}
        >
          {/* Idle state label */}
          {!playing && (
            <p className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">
              Press Play to preview
            </p>
          )}

          <AnimatePresence>
            {playing && (
              <motion.div
                key={animKey}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.3, ease: 'easeOut' }}
              >
                {/* Rings — sized to fit in the 260px-tall container */}
                <motion.div
                  className="absolute rounded-full border-2 border-primary"
                  initial={{ width: 40, height: 40, opacity: 0.9 }}
                  animate={{ width: 220, height: 220, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute rounded-full border border-primary/50"
                  initial={{ width: 24, height: 24, opacity: 0.7 }}
                  animate={{ width: 160, height: 160, opacity: 0 }}
                  transition={{ duration: 0.65, ease: 'easeOut', delay: 0.08 }}
                />
                {/* Label */}
                <motion.div
                  className="flex flex-col items-center gap-1"
                  initial={{ y: 0, opacity: 1, scale: 0.8 }}
                  animate={{ y: -60, opacity: 0, scale: 1.1 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                >
                  <span className="text-2xl font-serif font-black text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
                    Forged!
                  </span>
                  {eminence > 0 && (
                    <span className="flex items-center gap-1 text-base font-bold" style={{ color: GEM_META.flux.hex }}>
                      <EminenceDiamond size={14} /> +{eminence} eminence
                    </span>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
    />
  );
}

// ─── Market Deal Flip Preview ─────────────────────────────────────────────────

// Flip animation durations (ms) — extracted so TimingBar and setTimeout share the same source.
const FLIP_SETTLE_MS = 60;    // brief settle before the rotateY starts
const FLIP_DUR_MS    = 1500;  // rotateY duration (1.5 s)
// DEAL_ANIM_MS (imported from game-constants) is the full game-side lock (1700 ms),
// which includes FLIP_SETTLE_MS + FLIP_DUR_MS plus a trailing settle buffer.

function MarketDealFlipPreview() {
  const [tier, setTier]       = useState<1 | 2 | 3>(1);
  const [flipKey, setFlipKey] = useState(0);
  const [phase, setPhase]     = useState<'back' | 'flipping' | 'face'>('back');
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function play() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('back');
    setPlaying(true);
    setFlipKey(k => k + 1);
    timerRef.current = setTimeout(() => {
      setPhase('flipping');
      timerRef.current = setTimeout(() => {
        setPhase('face');
        setPlaying(false);
      }, FLIP_DUR_MS);
    }, FLIP_SETTLE_MS);
  }
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const card = makeMockCard(tier, 'ruby');
  const CARD_W = 112;
  const CARD_H = 160;

  return (
    <CardFxPreviewShell
      note="rotateY flip from card back to card face — the same animation used when the market refills after a purchase."
      controls={
        <>
          <ControlRow label="Tier"><TierPicker value={tier} onChange={setTier} /></ControlRow>
          <div className="flex justify-center pt-1">
            <ReplayButton onClick={play} accentHex="#a78bfa" />
          </div>
          <TimingBar
            totalMs={DEAL_ANIM_MS}
            phases={[
              { label: 'settle',       ms: FLIP_SETTLE_MS },
              { label: 'flip',         ms: FLIP_DUR_MS    },
              { label: 'trail buffer', ms: DEAL_ANIM_MS - FLIP_SETTLE_MS - FLIP_DUR_MS },
            ]}
            playing={playing}
            playKey={flipKey}
          />
        </>
      }
      previewArea={
        <div className="flex flex-col items-center gap-3 py-6 px-4">
          <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">
            {phase === 'back' ? 'card back' : phase === 'flipping' ? 'flipping…' : 'card face revealed'}
          </p>
          <div
            style={{
              width: CARD_W,
              height: CARD_H,
              perspective: '800px',
            }}
          >
            <motion.div
              key={flipKey}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
              }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: phase === 'back' ? 0 : phase === 'flipping' ? 180 : 180 }}
              transition={{
                duration: phase === 'flipping' ? 1.5 : 0,
                ease: 'easeInOut',
              }}
            >
              {/* Card back face */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  overflow: 'hidden',
                  borderRadius: 10,
                }}
              >
                <div className="w-full h-full relative rounded-xl bg-[#030509] border border-[#c4a85a]/30">
                  {tier === 1 && <CardBackTier1 />}
                  {tier === 2 && <CardBackTier2 />}
                  {tier === 3 && <CardBackTier3 />}
                </div>
              </div>
              {/* Card face */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  overflow: 'hidden',
                  borderRadius: 10,
                }}
              >
                <ArtifactCardView card={card} tier={tier} />
              </div>
            </motion.div>
          </div>
        </div>
      }
    />
  );
}

// ─── Burn Pile Particle Preview ───────────────────────────────────────────────
// Uses ScaledViewportContainer because BurnPileParticle renders via a fixed-
// position body portal.  Source rect = simulated market slot (center-upper
// viewport); destination rect = simulated burn-pile chip (lower-right viewport).

// Self-destructs after 950 ms (matches the setTimeout in BurnPileParticle).
const BURN_PILE_PARTICLE_MS = 950;

function BurnPileParticlePreview() {
  const [animKey, setAnimKey]   = useState(0);
  const [playing, setPlaying]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function play() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnimKey(k => k + 1);
    setPlaying(true);
    timerRef.current = setTimeout(() => setPlaying(false), BURN_PILE_PARTICLE_MS + 100);
  }
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // All coordinates in window.innerWidth/Height space — ScaledViewportContainer
  // scales them to fit correctly inside the preview area.
  const fromRect = {
    left:   Math.round(window.innerWidth  * 0.50 - 56),
    top:    Math.round(window.innerHeight * 0.35),
    width:  112,
    height: 160,
  } as DOMRect;

  const toRect = {
    left:   Math.round(window.innerWidth  * 0.74 - 16),
    top:    Math.round(window.innerHeight * 0.70 - 16),
    width:  32,
    height: 32,
  } as DOMRect;

  return (
    <CardFxPreviewShell
      note="Charred card fragment that arcs from the burned market slot (center) to the burn-pile chip (lower-right) after BurnFlash completes. Contained via CSS stacking-context scaling."
      controls={
        <>
          <div className="flex justify-center pt-1">
            <ReplayButton onClick={play} accentHex="#ff6820" />
          </div>
          <TimingBar
            totalMs={BURN_PILE_PARTICLE_MS}
            phases={[
              { label: 'flight', ms: 780 },
              { label: 'guard',  ms: BURN_PILE_PARTICLE_MS - 780 },
            ]}
            playing={playing}
            playKey={animKey}
          />
        </>
      }
      previewArea={
        <ScaledViewportContainer playing={playing} idleLabel="Press Play to preview">
          {playing && (
            <BurnPileParticle
              key={animKey}
              from={fromRect}
              to={toRect}
              onDone={() => setPlaying(false)}
            />
          )}
        </ScaledViewportContainer>
      }
    />
  );
}

// ─── Card FX total durations ──────────────────────────────────────────────────
// Single source of truth for the comparison strip — sourced from the same
// constants used by each preview component's TimingBar so they stay in sync.

const CARD_FX_TOTALS: Record<CardFxMode, number> = {
  cipher_reserve:      CIPHER_MODE_TOTAL_MS['game'],
  forge_burst:         FORGE_PHASE_MS.total,
  opponent_forge:      FORGE_PHASE_MS.total,
  reserved_forge_ring: RING_DISMISS_MS,
  market_deal_flip:    DEAL_ANIM_MS,
  burn_pile_particle:  BURN_PILE_PARTICLE_MS,
};

// ─── Mock card dimensions ─────────────────────────────────────────────────────

const MOCK_CARD_W = 112;
const MOCK_CARD_H = 160;

// ─── Idle Portal Preview ──────────────────────────────────────────────────────

function IdlePortalPreview({ lum, idleKey }: { lum: SandboxLuminary; idleKey: number }) {
  const vis = getLuminaryVisuals(lum.id);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => { setReplayKey(0); }, [idleKey]);

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
        Entity returns to card · idle aura pulses after 1.2 s
      </p>

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
        <div
          data-luminary-id={lum.id}
          style={{ position: 'absolute', inset: 0, borderRadius: 8 }}
        />
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '4px 6px',
            borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lum.name}
          </div>
          <div style={{ fontSize: 8, color: vis.primaryColor, marginTop: 1 }}>{lum.domain}</div>
        </div>
      </div>

      <LuminaryIdleOverlay key={`${idleKey}-${replayKey}`} luminaryId={lum.id} />

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

      <p className="text-[10px] text-muted-foreground/40 text-center max-w-xs">{lum.flavor}</p>
    </div>
  );
}


// ─── Luminary Grid Card ───────────────────────────────────────────────────────

function LuminaryGridCard({
  lum, isActive, mode, onClick,
}: {
  lum: SandboxLuminary; isActive: boolean; mode: SandboxMode; onClick: () => void;
}) {
  const vis = getLuminaryVisuals(lum.id);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-lg overflow-hidden border border-border/30 hover:border-border/60 transition-colors text-left group"
      style={{ background: '#0a0a14' }}
    >
      <div className="h-1.5 w-full" style={{ background: mode === 'summon' ? vis.summonColor : vis.primaryColor }} />

      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: vis.primaryColor, boxShadow: `0 0 6px ${vis.glowColor}` }}
          />
          <span className="text-[10px] font-mono text-muted-foreground/60 leading-none">{lum.id}</span>
        </div>
        <span className="text-xs font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-white transition-colors">
          {lum.name}
        </span>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-muted-foreground">{lum.domain}</span>
          {lum.lumens > 0 && <span className="text-[10px] font-mono text-amber-400">{lum.lumens}✦</span>}
        </div>
        {mode === 'summon' && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-block w-3 h-3 rounded-sm shrink-0 border border-white/10" style={{ background: vis.summonColor }} />
            <span className="text-[9px] font-mono text-muted-foreground/50">{vis.summonColor}</span>
          </div>
        )}
      </div>

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

type SandboxGroup = 'luminary' | 'cardFx' | 'sfx';

export default function DevAnimSandbox() {
  const [, setLocation] = useLocation();

  // ── Group selection ────────────────────────────────────────────────────────
  const [group, setGroup] = useState<SandboxGroup>('luminary');

  // ── Luminary group state ───────────────────────────────────────────────────
  const [active, setActive] = useState<SandboxLuminary | null>(null);
  const [summonKey, setSummonKey] = useState(0);
  const [activationKey, setActivationKey] = useState(0);
  const [activationEffectType, setActivationEffectType] = useState<'summon' | 'end_of_turn' | 'start_of_turn'>('summon');
  const [mode, setMode] = useState<SandboxMode>('summon');
  const [selected, setSelected] = useState<SandboxLuminary | null>(null);
  const [idleKey, setIdleKey] = useState(0);

  // ── Card FX group state ────────────────────────────────────────────────────
  const [cardFxMode, setCardFxMode] = useState<CardFxMode>('cipher_reserve');

  // ── SFX group state ────────────────────────────────────────────────────────
  const [sfxHarvestAffinity, setSfxHarvestAffinity] = useState<GemKey>('ruby');

  // ── Shared UI state ────────────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(false);

  function handleGridClick(lum: SandboxLuminary) {
    if (mode === 'summon') {
      setActive(lum);
      setSummonKey(k => k + 1);
    } else if (mode === 'activation') {
      setActive(lum);
      setActivationKey(k => k + 1);
    } else {
      setSelected(lum);
      setIdleKey(k => k + 1);
    }
  }

  function handleSummonComplete() { setActive(null); }

  const luminaryInstructions: Record<SandboxMode, string> = {
    summon:     'Click any Luminary to preview its full summon cutscene with its correct flash tint.',
    activation: 'Click any Luminary to preview the ~4 s activation cinematic (arrival / end-of-turn / start-of-turn effect).',
    idle:       'Click any Luminary to preview its idle portal overlay — entity return-flight + looping aura glow.',
  };

  const cardFxInstructions: Record<CardFxMode, string> = {
    cipher_reserve:      'Press Play to preview the Cipher Reserve animation (sigil forms on card → arcs to hand).',
    forge_burst:         'Press Play to preview the Forge animation (stamp + affinity streams → arcs to civilization tab).',
    opponent_forge:      'Press Play to preview the Opponent Forge animation (stamp + streams from chip → arcs to avatar).',
    reserved_forge_ring: 'Press Play to preview the expanding-ring "Forged!" overlay shown for reserved-card purchases.',
    market_deal_flip:    'Press Play to preview the card-back → card-face flip when the market refills after a purchase.',
    burn_pile_particle:  'Press Play to preview the BurnPileParticle — a charred fragment that arcs from the burned slot to the burn-pile chip.',
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

        {!collapsed && (
          <>
            {/* Group selector */}
            <div className="flex items-center gap-1 ml-2 bg-black/30 rounded-md p-0.5 border border-border/20">
              {(['luminary', 'cardFx', 'sfx'] as SandboxGroup[]).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className="text-[11px] font-mono px-2.5 py-1 rounded transition-colors"
                  style={{
                    background: group === g ? 'rgba(255,255,255,0.13)' : 'transparent',
                    color:      group === g ? '#e2e8f0' : '#64748b',
                  }}
                >
                  {g === 'luminary' ? 'Luminary FX' : g === 'cardFx' ? 'Card FX' : 'Audio SFX'}
                </button>
              ))}
            </div>

            {/* Mode tabs — different per group */}
            {group === 'luminary' && (
              <div className="flex items-center gap-1 bg-black/20 rounded-md p-0.5 border border-border/15">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setMode(m.id); setSelected(null); }}
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
            )}

            {group === 'cardFx' && (
              <div className="flex items-center gap-1 bg-black/20 rounded-md p-0.5 border border-border/15">
                {CARD_FX_MODES.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCardFxMode(m.id)}
                    className="text-[11px] font-mono px-2.5 py-1 rounded transition-colors"
                    style={{
                      background: cardFxMode === m.id ? 'rgba(255,255,255,0.10)' : 'transparent',
                      color:      cardFxMode === m.id ? '#e2e8f0' : '#64748b',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="text-[11px] font-mono px-2 py-1 rounded border border-border/30 hover:border-border/60 transition-colors"
          style={{ color: '#64748b' }}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? '▶ expand' : '▼ collapse'}
        </button>

        <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">DEV ONLY</span>
      </div>

      {/* ── Instructions ──────────────────────────────────────────────────── */}
      {!collapsed && group !== 'sfx' && (
        <p className="text-xs text-muted-foreground text-center pt-4 pb-2 px-4">
          {group === 'luminary' ? luminaryInstructions[mode] : cardFxInstructions[cardFxMode]}
        </p>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 py-3">

          {/* ════════════════ LUMINARY FX GROUP ════════════════ */}
          {group === 'luminary' && (
            <>
              {/* Luminary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-3xl mx-auto">
                {SANDBOX_LUMINARIES.map(lum => (
                  <LuminaryGridCard
                    key={lum.id}
                    lum={lum}
                    isActive={mode === 'summon' ? active?.id === lum.id : selected?.id === lum.id}
                    mode={mode}
                    onClick={() => handleGridClick(lum)}
                  />
                ))}
              </div>

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

            </>
          )}

          {/* ════════════════ AUDIO SFX GROUP ════════════════ */}
          {group === 'sfx' && (
            <div className="max-w-xl mx-auto py-6 space-y-6">

              {/* ── Card actions ─────────────────────────────────── */}
              <div>
                <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">
                  Card Actions
                </p>
                <div className="flex flex-wrap gap-3">
                  {/* Purchase */}
                  <button
                    type="button"
                    onClick={() => { void gameAudio.playCardPurchased(); }}
                    className="text-sm font-mono px-4 py-2 rounded border transition-colors"
                    style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.35)', color: '#eab308' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,179,8,0.16)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,179,8,0.08)'; }}
                  >
                    ✨ Purchase
                  </button>

                  {/* Reserve */}
                  <button
                    type="button"
                    onClick={() => { void gameAudio.playCardReserved(); }}
                    className="text-sm font-mono px-4 py-2 rounded border transition-colors"
                    style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.35)', color: '#818cf8' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.16)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)'; }}
                  >
                    📌 Reserve
                  </button>

                  {/* Card Draw */}
                  <button
                    type="button"
                    onClick={() => { void gameAudio.playCardDraw(); }}
                    className="text-sm font-mono px-4 py-2 rounded border transition-colors"
                    style={{ background: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.3)', color: '#94a3b8' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(148,163,184,0.16)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(148,163,184,0.08)'; }}
                  >
                    🃏 Card Draw
                  </button>

                  {/* Burn */}
                  <button
                    type="button"
                    onClick={() => { void gameAudio.playCardBurn(); }}
                    className="text-sm font-mono px-4 py-2 rounded border transition-colors"
                    style={{ background: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.35)', color: '#fb923c' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251,146,60,0.16)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251,146,60,0.08)'; }}
                  >
                    🔥 Burn
                  </button>
                </div>
              </div>

              {/* ── Harvest sounds (affinity-pitched) ────────────── */}
              <div>
                <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">
                  Harvest Sounds
                </p>
                {/* Affinity pill selector */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {GEM_KEYS.map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSfxHarvestAffinity(k)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded border transition-colors"
                      style={{
                        borderColor: sfxHarvestAffinity === k ? GEM_META[k].hex : 'rgba(255,255,255,0.12)',
                        color:       sfxHarvestAffinity === k ? GEM_META[k].hex : '#64748b',
                        background:  sfxHarvestAffinity === k ? `${GEM_META[k].hex}22` : 'transparent',
                      }}
                    >
                      {GEM_META[k].name}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  {/* Harvest Land */}
                  <button
                    type="button"
                    onClick={() => { void gameAudio.playHarvestLand(sfxHarvestAffinity); }}
                    className="text-sm font-mono px-4 py-2 rounded border transition-colors"
                    style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.35)', color: '#34d399' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(52,211,153,0.16)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(52,211,153,0.08)'; }}
                  >
                    💎 Harvest Land
                  </button>

                  {/* Crystal Picked */}
                  <button
                    type="button"
                    onClick={() => { void gameAudio.playCrystalPicked(sfxHarvestAffinity); }}
                    className="text-sm font-mono px-4 py-2 rounded border transition-colors"
                    style={{ background: 'rgba(34,211,238,0.08)', borderColor: 'rgba(34,211,238,0.35)', color: '#22d3ee' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,211,238,0.16)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,211,238,0.08)'; }}
                  >
                    🔮 Crystal Picked
                  </button>

                  {/* Harvest Blocked */}
                  <button
                    type="button"
                    onClick={() => { void gameAudio.playHarvestBlocked(sfxHarvestAffinity); }}
                    className="text-sm font-mono px-4 py-2 rounded border transition-colors"
                    style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.16)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
                  >
                    🚫 Harvest Blocked
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/30 mt-2">
                  Pitch varies by selected affinity.
                </p>
              </div>

              <p className="text-[10px] text-muted-foreground/30">
                All calls go to <span className="font-mono">gameAudio</span> directly — no game state required.
              </p>
            </div>
          )}

          {/* ════════════════ CARD FX GROUP ════════════════ */}
          {group === 'cardFx' && (
            <>
              {/* ── Comparison strip ────────────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mb-5 px-1">
                {CARD_FX_MODES.map((m, i) => (
                  <span key={m.id} className="flex items-center gap-x-1">
                    {i > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground/25 select-none mx-0.5">·</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCardFxMode(m.id)}
                      className="text-[10px] font-mono tabular-nums transition-colors"
                      style={{
                        color:      cardFxMode === m.id ? '#e2e8f0' : '#64748b',
                        fontWeight: cardFxMode === m.id ? 600 : 400,
                      }}
                    >
                      {m.label}&nbsp;<span style={{ opacity: 0.7 }}>{CARD_FX_TOTALS[m.id]}ms</span>
                    </button>
                  </span>
                ))}
              </div>

              {cardFxMode === 'cipher_reserve'       && <CipherReservePreview />}
              {cardFxMode === 'forge_burst'           && <ForgeBurstPreview />}
              {cardFxMode === 'opponent_forge'        && <OpponentForgePreview />}
              {cardFxMode === 'reserved_forge_ring'   && <ReservedForgeRingPreview />}
              {cardFxMode === 'market_deal_flip'      && <MarketDealFlipPreview />}
              {cardFxMode === 'burn_pile_particle'    && <BurnPileParticlePreview />}
            </>
          )}
        </div>
      )}

      {/* Collapsed placeholder */}
      {collapsed && (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-muted-foreground/40 text-center">
            Panel collapsed.
            <br />
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
            >
              Click to expand
            </button>
          </p>
        </div>
      )}

      {/* ── Activation effect-type selector (luminary / activation mode only) ── */}
      {!collapsed && group === 'luminary' && mode === 'activation' && (
        <div className="flex items-center justify-center gap-2 px-4 pb-2">
          <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Effect type:</span>
          {(['summon', 'end_of_turn', 'start_of_turn'] as const).map(et => (
            <button
              key={et}
              type="button"
              onClick={() => setActivationEffectType(et)}
              className="text-[10px] font-mono px-2 py-0.5 rounded border transition-colors"
              style={{
                borderColor: activationEffectType === et ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                color:       activationEffectType === et ? '#a78bfa' : '#64748b',
                background:  activationEffectType === et ? 'rgba(167,139,250,0.12)' : 'transparent',
              }}
            >
              {et}
            </button>
          ))}
        </div>
      )}

      {/* ── Summon Cutscene (overlay) ──────────────────────────────────────── */}
      <AnimatePresence>
        {group === 'luminary' && mode === 'summon' && active && (
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

      {/* ── Activation Cinematic (overlay) ─────────────────────────────────── */}
      {group === 'luminary' && mode === 'activation' && active && (
        <LuminaryActivationCinematic
          key={activationKey}
          luminaryId={active.id}
          effectType={activationEffectType}
          luminaryName={active.name}
          triggeringPlayerName="Preview Player"
          onComplete={() => setActive(null)}
        />
      )}
    </div>
  );
}
