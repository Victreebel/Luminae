import { useState } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { LuminarySummonCutscene, getLuminaryVisuals } from '@/lib/luminaryAssets';

// ─── Sandbox Luminary Catalog ─────────────────────────────────────────────────
// summonColor is synced from gameEngine.ts summonColor field.
// This data lives here so the sandbox stays fully self-contained and the
// production bundle is never touched (this page is DEV-only lazy-loaded).

interface SandboxLuminary {
  id: string;
  name: string;
  domain: string;
  lumens: number;
  summonColor: string;
  flavor: string;
}

const SANDBOX_LUMINARIES: SandboxLuminary[] = [
  { id: 'lum_ember',   name: 'The Ember Sovereign',     domain: 'Flame',        lumens: 4, summonColor: '#ff5a3c', flavor: 'What cannot survive the fire is granted the mercy of disappearance.' },
  { id: 'lum_tide',    name: 'The Tide Architect',      domain: 'Tides',        lumens: 2, summonColor: '#60a5fa', flavor: 'Possibility collapses to its bias.' },
  { id: 'lum_verdant', name: 'The Verdant Oracle',      domain: 'Verdance',     lumens: 2, summonColor: '#4ade80', flavor: 'It answers only after the question has taken root.' },
  { id: 'lum_void',    name: 'The Void Warden',         domain: 'Void',         lumens: 0, summonColor: '#4c1d95', flavor: 'In the space between stars, something watches without eyes.' },
  { id: 'lum_radiant', name: 'Concordance Mandala',     domain: 'Coherence',    lumens: 2, summonColor: '#fef9c3', flavor: 'Truth is not revealed. It is aligned.' },
  { id: 'lum_astral',  name: 'Phoenix Paradox',         domain: 'Recurrence',   lumens: 3, summonColor: '#f43f5e', flavor: 'Every ending becomes fuel. Every return comes back less innocent.' },
  { id: 'lum_bloom',   name: 'Catalyst Bloom',          domain: 'Aftergrowth',  lumens: 3, summonColor: '#86efac', flavor: 'It waits for the nova to wound the world, then flowers in the scar.' },
  { id: 'lum_forge',   name: 'The Iron Harbinger',      domain: 'Ruin',         lumens: 3, summonColor: '#ef4444', flavor: 'The hammer falls only after the future has already broken.' },
  { id: 'lum_compass', name: '???',                     domain: 'Erasure',      lumens: 3, summonColor: '#38bdf8', flavor: 'Everyone remembered something happened, but no one can recall what was lost.' },
  { id: 'lum_pale',    name: 'The Pale Merchant',       domain: 'Balance',      lumens: 3, summonColor: '#cbd5e1', flavor: 'Every bargain reveals one truth and buries another.' },
  { id: 'lum_oracle',  name: 'The Cosmic Oracle',       domain: 'Prophecy',     lumens: 4, summonColor: '#fbbf24', flavor: 'She sees what will be, and what might have been, and cannot tell the difference.' },
  { id: 'lum_null',    name: 'The Null Sovereign',      domain: 'Transcendence',lumens: 0, summonColor: '#0f172a', flavor: 'Past the last observable star, entire futures fall silent without being destroyed.' },
  { id: 'lum_hunger',  name: 'The First Hunger',        domain: 'Assimilation', lumens: 2, summonColor: '#fbbf24', flavor: 'Its first act is consumption. Its second is perfect repetition.' },
  { id: 'lum_moth',    name: 'Red Moth',                domain: 'Rupture',      lumens: 2, summonColor: '#ef4444', flavor: 'Where it passes, the universe is divided into before and after.' },
  { id: 'lum_seed',    name: 'The Seed Beyond Seasons', domain: 'Propagation',  lumens: 3, summonColor: '#38bdf8', flavor: 'It leaves its avatars where tomorrow has already begun to remember.' },
  { id: 'lum_orchard', name: 'Glass Orchard',           domain: 'Replication',  lumens: 3, summonColor: '#4ade80', flavor: 'It learned to copy itself perfectly, and called the absence of error peace.' },
];

// ─── DevAnimSandbox ───────────────────────────────────────────────────────────

export default function DevAnimSandbox() {
  const [, setLocation] = useLocation();
  const [active, setActive] = useState<SandboxLuminary | null>(null);
  const [key, setKey] = useState(0);

  function trigger(lum: SandboxLuminary) {
    setActive(lum);
    setKey(k => k + 1);
  }

  function handleComplete() {
    setActive(null);
  }

  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground flex flex-col">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/60 shrink-0">
        <button
          type="button"
          onClick={() => setLocation('/')}
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border/30 hover:border-border/60"
        >
          ← home
        </button>
        <span className="text-sm font-semibold tracking-wide">DevAnimSandbox · Summon Flashes</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">DEV ONLY</span>
      </div>

      {/* ── Instructions ──────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground text-center pt-4 pb-2 px-4">
        Click any Luminary to preview its full summon cutscene with its correct flash tint.
      </p>

      {/* ── Luminary Grid ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-3xl mx-auto">
          {SANDBOX_LUMINARIES.map(lum => {
            const vis = getLuminaryVisuals(lum.id);
            const isActive = active?.id === lum.id;
            return (
              <button
                key={lum.id}
                type="button"
                onClick={() => trigger(lum)}
                className="relative rounded-lg overflow-hidden border border-border/30 hover:border-border/60 transition-colors text-left group"
                style={{ background: '#0a0a14' }}
              >
                {/* Flash color swatch strip */}
                <div
                  className="h-1.5 w-full"
                  style={{ background: lum.summonColor }}
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

                  {/* Flash hex preview */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="inline-block w-3 h-3 rounded-sm shrink-0 border border-white/10"
                      style={{ background: lum.summonColor }}
                    />
                    <span className="text-[9px] font-mono text-muted-foreground/50">{lum.summonColor}</span>
                  </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-lg"
                    style={{ boxShadow: `inset 0 0 0 2px ${lum.summonColor}` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Summon Cutscene ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <div key={key} className="fixed inset-0 z-50">
            <LuminarySummonCutscene
              luminaryId={active.id}
              luminaryName={active.name}
              domain={active.domain}
              lumens={active.lumens}
              flavor={active.flavor}
              overrideColor={active.summonColor}
              onComplete={handleComplete}
              onSkip={handleComplete}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
