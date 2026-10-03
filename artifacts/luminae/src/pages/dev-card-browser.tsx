import { ARTIFACT_CATALOG, ARTIFACT_TIER_AUDIT_BY_ID, type ArtifactId } from '@workspace/game-types';
import { CARD_ART } from '@/lib/cardArtManifest';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { AFFINITY_META, AFFINITY_KEYS, type AffinityKey } from '@/lib/affinityMeta';
import { useGetCardLoreCatalog } from '@workspace/api-client-react';
import type { CardLoreEntry } from '@workspace/api-client-react';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';
import { CARD_NAME_FALLBACK } from '@/lib/cardNameFallback';
import { ArtifactEventFactsDetails } from '@/components/ArtifactEventFactsDetails';

const TIER_BACKDROPS: Record<number, string> = { 1: cardTier1Bg, 3: cardTier3Bg };
const AFFINITY_CARD_GRADIENTS: Record<string, string> = {
  flare:     'linear-gradient(175deg, #1a0404 0%, #3d0808 35%, #220505 70%, #100202 100%)',
  continuum: 'linear-gradient(175deg, #020510 0%, #071840 35%, #040a28 70%, #020510 100%)',
  verdance:  'linear-gradient(175deg, #021005 0%, #063020 35%, #041a10 70%, #020c04 100%)',
  abyss:     'linear-gradient(175deg, #060606 0%, #181818 35%, #0e0e0e 70%, #050505 100%)',
  radiance:    'linear-gradient(175deg, #100c02 0%, #2a2008 35%, #1c1606 70%, #0c0a02 100%)',
  singularity:     'linear-gradient(175deg, #08080f 0%, #141428 35%, #0e0e1e 70%, #08080f 100%)',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1, Planetary',
  2: 'Tier 2, Stellar',
  3: 'Tier 3, Galactic',
};

interface CardEntry {
  id: string;
  tier: 1 | 2 | 3;
  bonusAffinity: AffinityKey;
  eminence: number;
  cost: Record<AffinityKey, number>;
}

// Review the same costs, bonuses, Eminence, and artwork that the game uses.
const CATALOG: readonly CardEntry[] = ARTIFACT_CATALOG;

const ALL_TIERS = [1, 2, 3] as const;
const ALL_AFFINITIES: AffinityKey[] = ['flare', 'continuum', 'verdance', 'abyss', 'radiance'];

function CostPip({ affinityKey, count }: { affinityKey: AffinityKey; count: number }) {
  const meta = AFFINITY_META[affinityKey];
  return (
    <div className="flex items-center gap-1 bg-black/50 rounded px-1.5 py-0.5">
      <span className="text-xs font-bold text-white">{count}</span>
      <img src={meta.image} alt={meta.name} className="w-3.5 h-3.5 object-contain" />
    </div>
  );
}

function ArtPromptBox({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    void navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ position: 'relative', background: '#080e22', borderRadius: 8, border: '1px solid #1a2450', padding: '10px 12px' }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: copied ? '#1a3a1a' : '#10142a',
          border: `1px solid ${copied ? '#2a6a2a' : '#2a3060'}`,
          borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
          color: copied ? '#60c060' : '#6080d0', fontSize: 10,
          fontFamily: 'system-ui', letterSpacing: '0.07em',
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <p style={{ fontFamily: 'system-ui', fontSize: 11, color: '#7090c0', lineHeight: 1.7, margin: 0, paddingRight: 56, whiteSpace: 'pre-wrap' }}>
        {prompt}
      </p>
    </div>
  );
}

function DevDetails({ lore, artifactId }: { lore: CardLoreEntry; artifactId: string }) {
  const [open, setOpen] = useState(false);
  const tierReview = ARTIFACT_TIER_AUDIT_BY_ID[artifactId as ArtifactId];

  const toSentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const rows: { label: string; value: string | undefined }[] = [
    { label: 'Artifact Form', value: lore.artifactForm },
    { label: 'Practical Capability', value: lore.practicalCapability },
    { label: 'Why this tier', value: tierReview?.confinementTest },
    { label: 'Culture', value: lore.civLane },
  ];
  const hasDetails = rows.some(r => r.value) || lore.artPrompt;

  if (!hasDetails) return null;

  return (
    <div style={{ borderTop: '1px solid #1a2040', paddingTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ fontFamily: 'system-ui', fontSize: 10, color: '#404870', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Dev Details
        </span>
        <span style={{ color: '#404870', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.filter(r => r.value).map(r => (
            <div key={r.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'system-ui', fontSize: 10, color: '#404870', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {r.label}
              </span>
              <span style={{ fontFamily: 'system-ui', fontSize: 12, color: '#8090b0', lineHeight: 1.5 }}>
                {toSentenceCase(r.value!)}
              </span>
            </div>
          ))}

          {lore.artPrompt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'system-ui', fontSize: 10, color: '#404870', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Art Prompt
              </span>
              <ArtPromptBox prompt={lore.artPrompt} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DevCardBrowser() {
  const search = useSearch();
  const [, setLocation] = useLocation();

  const [filterTier, setFilterTier] = useState<1 | 2 | 3 | null>(null);
  const [filterAffinity, setFilterAffinity] = useState<AffinityKey | null>(null);

  const initialIdx = useRef(() => {
    const id = new URLSearchParams(search).get('id');
    if (!id) return 0;
    const i = CATALOG.findIndex(c => c.id === id);
    return i >= 0 ? i : 0;
  }).current();

  const [idx, setIdx] = useState(initialIdx);
  const previousFilters = useRef({ tier: filterTier, affinity: filterAffinity });

  const { data: loreData } = useGetCardLoreCatalog();

  const filtered = CATALOG.filter(card => {
    if (filterTier !== null && card.tier !== filterTier) return false;
    if (filterAffinity !== null && card.bonusAffinity !== filterAffinity) return false;
    return true;
  });

  const clamp = useCallback((i: number) => Math.max(0, Math.min(filtered.length - 1, i)), [filtered.length]);

  const go = useCallback((delta: number) => {
    setIdx(prev => Math.max(0, Math.min(filtered.length - 1, prev + delta)));
  }, [filtered.length]);

  useEffect(() => {
    // Effect replay and hot reload must preserve the Artifact selected by URL.
    if (previousFilters.current.tier === filterTier && previousFilters.current.affinity === filterAffinity) return;
    previousFilters.current = { tier: filterTier, affinity: filterAffinity };
    setIdx(0);
  }, [filterTier, filterAffinity]);

  const card = filtered[clamp(idx)];

  useEffect(() => {
    if (!card) return;
    const params = new URLSearchParams(search);
    if (params.get('id') === card.id) return;
    setLocation(`/dev/card-browser?id=${card.id}`, { replace: true });
  }, [card?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   go(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go]);

  if (!card) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#060810' }}>
        <p style={{ color: '#6070a0', fontFamily: 'system-ui' }}>No cards match the current filter.</p>
      </div>
    );
  }

  const lore = loreData?.[card.id];
  const cardName = lore?.name ?? CARD_NAME_FALLBACK[card.id] ?? card.id;
  const bonusMeta = AFFINITY_META[card.bonusAffinity];
  const specificArt = CARD_ART[card.id];
  const artLayerStyle: React.CSSProperties = {
    backgroundImage: specificArt
      ? `url(${specificArt})`
      : card.tier === 2
        ? (AFFINITY_CARD_GRADIENTS[card.bonusAffinity] ?? AFFINITY_CARD_GRADIENTS.radiance)
        : `url(${TIER_BACKDROPS[card.tier] ?? cardTier1Bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #0a0c1e 60%, #040608 100%)', padding: '24px 16px 40px' }}
    >
      {/* Dev badge */}
      <div className="w-full max-w-lg flex items-center justify-between mb-5">
        <span style={{ color: '#6070a0', fontSize: 11, letterSpacing: '0.1em', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
          /dev/card-browser
        </span>
        <span style={{ background: '#1a0a30', color: '#a070f0', fontSize: 10, fontFamily: 'system-ui', letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 4, border: '1px solid #4020a0' }}>
          DEV ONLY
        </span>
      </div>

      {/* Tier filter */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setFilterTier(null)}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'system-ui',
            letterSpacing: '0.07em', cursor: 'pointer', border: 'none',
            background: filterTier === null ? '#3040a0' : '#10142a',
            color: filterTier === null ? '#ffffff' : '#6070a0',
          }}
        >All Tiers</button>
        {ALL_TIERS.map(t => (
          <button
            key={t}
            onClick={() => setFilterTier(filterTier === t ? null : t)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'system-ui',
              letterSpacing: '0.07em', cursor: 'pointer', border: 'none',
              background: filterTier === t ? '#3040a0' : '#10142a',
              color: filterTier === t ? '#ffffff' : '#6070a0',
            }}
          >T{t}</button>
        ))}
      </div>

      {/* Affinity filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterAffinity(null)}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'system-ui',
            letterSpacing: '0.07em', cursor: 'pointer', border: 'none',
            background: filterAffinity === null ? '#2a2a40' : '#10142a',
            color: filterAffinity === null ? '#c0c0d0' : '#6070a0',
          }}
        >All</button>
        {ALL_AFFINITIES.map(key => {
          const m = AFFINITY_META[key];
          const active = filterAffinity === key;
          return (
            <button
              key={key}
              onClick={() => setFilterAffinity(active ? null : key)}
              title={m.name}
              style={{
                width: 28, height: 28, borderRadius: '50%', padding: 3, cursor: 'pointer',
                border: active ? `2px solid ${m.hex}` : '2px solid transparent',
                background: active ? `${m.hex}22` : '#10142a',
              }}
            >
              <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          );
        })}
      </div>

      {/* Card face — large review size */}
      <div style={{ position: 'relative', width: 224, height: 320, borderRadius: 16, overflow: 'hidden', boxShadow: `0 0 40px ${bonusMeta.glowHex}44, 0 8px 32px rgba(0,0,0,0.8)` }}>
        <div style={{ position: 'absolute', inset: 0, ...artLayerStyle }} />
        {!specificArt && (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${bonusMeta.glowHex}22 0%, transparent 70%)` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.92) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 700, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,1)' }}>
              {card.eminence > 0 ? card.eminence : ''}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px rgba(0,0,0,0.6)', background: '#000' }}>
              <img src={bonusMeta.image} alt={bonusMeta.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,1)', lineHeight: 1.3 }}>
              {cardName}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {AFFINITY_KEYS.map(k => {
                const n = card.cost[k];
                if (!n) return null;
                return <CostPip key={k} affinityKey={k} count={n} />;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24 }}>
        <button
          onClick={() => go(-1)}
          disabled={clamp(idx) === 0}
          style={{
            width: 40, height: 40, borderRadius: 8, border: 'none', cursor: clamp(idx) === 0 ? 'default' : 'pointer',
            background: clamp(idx) === 0 ? '#10142a' : '#1e2450',
            color: clamp(idx) === 0 ? '#303050' : '#a0b0ff', fontSize: 18,
          }}
        >‹</button>
        <span style={{ color: '#6070a0', fontFamily: 'system-ui', fontSize: 12, minWidth: 60, textAlign: 'center' }}>
          {clamp(idx) + 1} / {filtered.length}
        </span>
        <button
          onClick={() => go(1)}
          disabled={clamp(idx) >= filtered.length - 1}
          style={{
            width: 40, height: 40, borderRadius: 8, border: 'none', cursor: clamp(idx) >= filtered.length - 1 ? 'default' : 'pointer',
            background: clamp(idx) >= filtered.length - 1 ? '#10142a' : '#1e2450',
            color: clamp(idx) >= filtered.length - 1 ? '#303050' : '#a0b0ff', fontSize: 18,
          }}
        >›</button>
      </div>

      <p style={{ color: '#303858', fontFamily: 'system-ui', fontSize: 10, marginTop: 8, letterSpacing: '0.05em' }}>
        ← → arrow keys also navigate
      </p>

      {/* Card detail panel */}
      <div style={{
        marginTop: 24, width: '100%', maxWidth: 480,
        background: '#0c1020', borderRadius: 12, border: '1px solid #1e2440',
        padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4060c0', background: '#0a1030', padding: '2px 8px', borderRadius: 4 }}>
            {card.id}.webp
          </span>
          <span style={{ fontFamily: 'system-ui', fontSize: 11, color: '#8090b0', background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
            {TIER_LABELS[card.tier]}
          </span>
          <span style={{ fontFamily: 'system-ui', fontSize: 11, color: bonusMeta.hex, background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
            {bonusMeta.name}
          </span>
          {card.eminence > 0 && (
            <span style={{ fontFamily: 'system-ui', fontSize: 11, color: '#ffd700', background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
              {card.eminence} Eminence
            </span>
          )}
        </div>

        <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#d0d8f0', fontWeight: 600 }}>
          {cardName}
        </div>

        <div style={{ borderTop: '1px solid #1a2040', paddingTop: 10 }}>
          <div style={{ fontFamily: 'system-ui', fontSize: 10, color: '#404870', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Cost
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {AFFINITY_KEYS.map(k => {
              const n = card.cost[k];
              if (!n) return null;
              const m = AFFINITY_META[k];
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#10142a', borderRadius: 6, padding: '4px 8px' }}>
                  <img src={m.image} alt={m.name} style={{ width: 14, height: 14, objectFit: 'contain' }} />
                  <span style={{ color: m.hex, fontFamily: 'system-ui', fontSize: 12, fontWeight: 600 }}>{n}</span>
                  <span style={{ color: '#505878', fontFamily: 'system-ui', fontSize: 11 }}>{m.name}</span>
                </div>
              );
            })}
            {AFFINITY_KEYS.every(k => !card.cost[k]) && (
              <span style={{ color: '#404870', fontFamily: 'system-ui', fontSize: 12 }}>Free</span>
            )}
          </div>
        </div>

        {lore ? (
          <div style={{ fontFamily: 'system-ui', fontSize: 12, color: '#7080a0', lineHeight: 1.6, fontStyle: 'italic' }}>
            {lore.flavor}
          </div>
        ) : (
          <div style={{ fontFamily: 'system-ui', fontSize: 12, color: '#404870', lineHeight: 1.6, fontStyle: 'italic' }}>
            Loading…
          </div>
        )}
        <ArtifactEventFactsDetails artifactId={card.id} />
        {lore && <DevDetails lore={lore} artifactId={card.id} />}
      </div>
    </div>
  );
}
