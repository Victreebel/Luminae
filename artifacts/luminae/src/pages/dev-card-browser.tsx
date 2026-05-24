import { useEffect, useState, useCallback, useRef } from 'react';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { useGetCardLoreCatalog } from '@workspace/api-client-react';
import type { CardLoreEntry } from '@workspace/api-client-react';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';

const CARD_ART_MODULES = import.meta.glob(
  '../assets/cards/*.png',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;
const CARD_ART: Record<string, string> = {};
for (const [path, url] of Object.entries(CARD_ART_MODULES)) {
  const id = path.split('/').pop()!.replace('.png', '');
  CARD_ART[id] = url;
}

const TIER_BACKDROPS: Record<number, string> = { 1: cardTier1Bg, 3: cardTier3Bg };
const GEM_CARD_GRADIENTS: Record<string, string> = {
  ruby:     'linear-gradient(175deg, #1a0404 0%, #3d0808 35%, #220505 70%, #100202 100%)',
  sapphire: 'linear-gradient(175deg, #020510 0%, #071840 35%, #040a28 70%, #020510 100%)',
  emerald:  'linear-gradient(175deg, #021005 0%, #063020 35%, #041a10 70%, #020c04 100%)',
  onyx:     'linear-gradient(175deg, #060606 0%, #181818 35%, #0e0e0e 70%, #050505 100%)',
  pearl:    'linear-gradient(175deg, #100c02 0%, #2a2008 35%, #1c1606 70%, #0c0a02 100%)',
  flux:     'linear-gradient(175deg, #08080f 0%, #141428 35%, #0e0e1e 70%, #08080f 100%)',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1, Planetary',
  2: 'Tier 2, Stellar',
  3: 'Tier 3, Galactic',
};

interface CardEntry {
  id: string;
  tier: 1 | 2 | 3;
  bonusColor: GemKey;
  lumens: number;
  cost: Record<GemKey, number>;
}

function c(ruby: number, sapphire: number, emerald: number, onyx: number, pearl: number): Record<GemKey, number> {
  return { ruby, sapphire, emerald, onyx, pearl, flux: 0 };
}

const CATALOG: CardEntry[] = [
  // ── Tier 1 · Flare ──────────────────────────────────────────────────────────
  { id: "t1r01", tier: 1, bonusColor: "ruby",     lumens: 0, cost: c(0,0,1,1,1) },
  { id: "t1r02", tier: 1, bonusColor: "ruby",     lumens: 0, cost: c(0,0,1,2,0) },
  { id: "t1r03", tier: 1, bonusColor: "ruby",     lumens: 0, cost: c(0,1,1,0,1) },
  { id: "t1r04", tier: 1, bonusColor: "ruby",     lumens: 0, cost: c(0,2,0,0,0) },
  { id: "t1r05", tier: 1, bonusColor: "ruby",     lumens: 0, cost: c(0,0,0,2,2) },
  { id: "t1r06", tier: 1, bonusColor: "ruby",     lumens: 0, cost: c(0,2,1,0,0) },
  { id: "t1r07", tier: 1, bonusColor: "ruby",     lumens: 0, cost: c(0,0,2,2,0) },
  { id: "t1r08", tier: 1, bonusColor: "ruby",     lumens: 1, cost: c(0,0,0,0,4) },
  // ── Tier 1 · Continuum ──────────────────────────────────────────────────────
  { id: "t1s01", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,1,0,1) },
  { id: "t1s02", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(2,0,1,0,0) },
  { id: "t1s03", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,0,1,1) },
  { id: "t1s04", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,0,0,2) },
  { id: "t1s05", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(0,0,0,2,2) },
  { id: "t1s06", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(1,0,2,0,0) },
  { id: "t1s07", tier: 1, bonusColor: "sapphire", lumens: 0, cost: c(2,0,0,2,0) },
  { id: "t1s08", tier: 1, bonusColor: "sapphire", lumens: 1, cost: c(0,0,4,0,0) },
  // ── Tier 1 · Verdance ───────────────────────────────────────────────────────
  { id: "t1e01", tier: 1, bonusColor: "emerald",  lumens: 0, cost: c(1,1,0,0,1) },
  { id: "t1e02", tier: 1, bonusColor: "emerald",  lumens: 0, cost: c(0,2,0,1,0) },
  { id: "t1e03", tier: 1, bonusColor: "emerald",  lumens: 0, cost: c(1,1,0,1,0) },
  { id: "t1e04", tier: 1, bonusColor: "emerald",  lumens: 0, cost: c(0,3,0,0,0) },
  { id: "t1e05", tier: 1, bonusColor: "emerald",  lumens: 0, cost: c(2,0,0,0,2) },
  { id: "t1e06", tier: 1, bonusColor: "emerald",  lumens: 0, cost: c(0,1,0,1,2) },
  { id: "t1e07", tier: 1, bonusColor: "emerald",  lumens: 0, cost: c(0,0,0,2,1) },
  { id: "t1e08", tier: 1, bonusColor: "emerald",  lumens: 1, cost: c(0,0,0,4,0) },
  // ── Tier 1 · Abyss ──────────────────────────────────────────────────────────
  { id: "t1o01", tier: 1, bonusColor: "onyx",     lumens: 0, cost: c(0,1,1,0,1) },
  { id: "t1o02", tier: 1, bonusColor: "onyx",     lumens: 0, cost: c(0,1,0,0,2) },
  { id: "t1o03", tier: 1, bonusColor: "onyx",     lumens: 0, cost: c(1,0,1,0,1) },
  { id: "t1o04", tier: 1, bonusColor: "onyx",     lumens: 0, cost: c(0,0,2,1,0) },
  { id: "t1o05", tier: 1, bonusColor: "onyx",     lumens: 0, cost: c(2,1,0,0,0) },
  { id: "t1o06", tier: 1, bonusColor: "onyx",     lumens: 0, cost: c(0,2,2,0,0) },
  { id: "t1o07", tier: 1, bonusColor: "onyx",     lumens: 0, cost: c(1,0,0,1,2) },
  { id: "t1o08", tier: 1, bonusColor: "onyx",     lumens: 1, cost: c(0,4,0,0,0) },
  // ── Tier 1 · Radiance ───────────────────────────────────────────────────────
  { id: "t1p01", tier: 1, bonusColor: "pearl",    lumens: 0, cost: c(1,1,0,1,0) },
  { id: "t1p02", tier: 1, bonusColor: "pearl",    lumens: 0, cost: c(0,1,0,2,0) },
  { id: "t1p03", tier: 1, bonusColor: "pearl",    lumens: 0, cost: c(1,0,1,1,0) },
  { id: "t1p04", tier: 1, bonusColor: "pearl",    lumens: 0, cost: c(2,0,0,0,1) },
  { id: "t1p05", tier: 1, bonusColor: "pearl",    lumens: 0, cost: c(0,2,0,0,2) },
  { id: "t1p06", tier: 1, bonusColor: "pearl",    lumens: 0, cost: c(1,0,1,0,2) },
  { id: "t1p07", tier: 1, bonusColor: "pearl",    lumens: 0, cost: c(0,0,1,2,1) },
  { id: "t1p08", tier: 1, bonusColor: "pearl",    lumens: 1, cost: c(0,0,4,0,0) },

  // ── Tier 2 · Flare ──────────────────────────────────────────────────────────
  { id: "t2r01", tier: 2, bonusColor: "ruby",     lumens: 1, cost: c(0,2,0,3,2) },
  { id: "t2r02", tier: 2, bonusColor: "ruby",     lumens: 2, cost: c(0,1,4,2,0) },
  { id: "t2r03", tier: 2, bonusColor: "ruby",     lumens: 2, cost: c(3,0,0,0,3) },
  { id: "t2r04", tier: 2, bonusColor: "ruby",     lumens: 1, cost: c(2,0,2,0,2) },
  { id: "t2r05", tier: 2, bonusColor: "ruby",     lumens: 2, cost: c(0,3,0,2,2) },
  { id: "t2r06", tier: 2, bonusColor: "ruby",     lumens: 2, cost: c(0,0,0,5,0) },
  // ── Tier 2 · Continuum ──────────────────────────────────────────────────────
  { id: "t2s01", tier: 2, bonusColor: "sapphire", lumens: 1, cost: c(2,0,3,0,2) },
  { id: "t2s02", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(4,0,0,2,1) },
  { id: "t2s03", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(0,3,0,0,3) },
  { id: "t2s04", tier: 2, bonusColor: "sapphire", lumens: 1, cost: c(0,0,2,0,3) },
  { id: "t2s05", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(5,0,0,0,0) },
  { id: "t2s06", tier: 2, bonusColor: "sapphire", lumens: 2, cost: c(2,0,0,3,2) },
  // ── Tier 2 · Verdance ───────────────────────────────────────────────────────
  { id: "t2e01", tier: 2, bonusColor: "emerald",  lumens: 1, cost: c(3,2,0,0,2) },
  { id: "t2e02", tier: 2, bonusColor: "emerald",  lumens: 2, cost: c(2,4,0,1,0) },
  { id: "t2e03", tier: 2, bonusColor: "emerald",  lumens: 2, cost: c(0,0,3,3,0) },
  { id: "t2e04", tier: 2, bonusColor: "emerald",  lumens: 1, cost: c(0,2,0,2,2) },
  { id: "t2e05", tier: 2, bonusColor: "emerald",  lumens: 2, cost: c(0,5,0,0,0) },
  { id: "t2e06", tier: 2, bonusColor: "emerald",  lumens: 2, cost: c(2,0,0,2,3) },
  // ── Tier 2 · Abyss ──────────────────────────────────────────────────────────
  { id: "t2o01", tier: 2, bonusColor: "onyx",     lumens: 1, cost: c(0,2,2,0,3) },
  { id: "t2o02", tier: 2, bonusColor: "onyx",     lumens: 2, cost: c(1,0,2,0,4) },
  { id: "t2o03", tier: 2, bonusColor: "onyx",     lumens: 2, cost: c(3,0,0,3,0) },
  { id: "t2o04", tier: 2, bonusColor: "onyx",     lumens: 1, cost: c(2,0,3,0,2) },
  { id: "t2o05", tier: 2, bonusColor: "onyx",     lumens: 2, cost: c(0,0,5,0,0) },
  { id: "t2o06", tier: 2, bonusColor: "onyx",     lumens: 2, cost: c(2,3,0,0,2) },
  // ── Tier 2 · Radiance ───────────────────────────────────────────────────────
  { id: "t2p01", tier: 2, bonusColor: "pearl",    lumens: 1, cost: c(2,3,0,2,0) },
  { id: "t2p02", tier: 2, bonusColor: "pearl",    lumens: 2, cost: c(0,2,1,4,0) },
  { id: "t2p03", tier: 2, bonusColor: "pearl",    lumens: 2, cost: c(0,0,4,0,3) },
  { id: "t2p04", tier: 2, bonusColor: "pearl",    lumens: 2, cost: c(0,0,0,3,4) },
  { id: "t2p05", tier: 2, bonusColor: "pearl",    lumens: 2, cost: c(3,1,3,0,0) },
  { id: "t2p06", tier: 2, bonusColor: "pearl",    lumens: 2, cost: c(0,3,0,0,5) },

  // ── Tier 3 · Flare ──────────────────────────────────────────────────────────
  { id: "t3r01", tier: 3, bonusColor: "ruby",     lumens: 3, cost: c(3,3,5,3,0) },
  { id: "t3r02", tier: 3, bonusColor: "ruby",     lumens: 4, cost: c(0,0,7,3,3) },
  { id: "t3r03", tier: 3, bonusColor: "ruby",     lumens: 4, cost: c(6,0,0,0,6) },
  { id: "t3r04", tier: 3, bonusColor: "ruby",     lumens: 5, cost: c(0,0,0,0,7) },
  // ── Tier 3 · Continuum ──────────────────────────────────────────────────────
  { id: "t3s01", tier: 3, bonusColor: "sapphire", lumens: 3, cost: c(3,0,3,3,3) },
  { id: "t3s02", tier: 3, bonusColor: "sapphire", lumens: 4, cost: c(0,0,5,0,7) },
  { id: "t3s03", tier: 3, bonusColor: "sapphire", lumens: 4, cost: c(5,3,0,3,0) },
  { id: "t3s04", tier: 3, bonusColor: "sapphire", lumens: 5, cost: c(0,0,0,7,0) },
  // ── Tier 3 · Verdance ───────────────────────────────────────────────────────
  { id: "t3e01", tier: 3, bonusColor: "emerald",  lumens: 3, cost: c(0,3,3,0,5) },
  { id: "t3e02", tier: 3, bonusColor: "emerald",  lumens: 4, cost: c(0,7,0,3,0) },
  { id: "t3e03", tier: 3, bonusColor: "emerald",  lumens: 4, cost: c(3,0,5,0,3) },
  { id: "t3e04", tier: 3, bonusColor: "emerald",  lumens: 5, cost: c(0,0,7,0,0) },
  // ── Tier 3 · Abyss ──────────────────────────────────────────────────────────
  { id: "t3o01", tier: 3, bonusColor: "onyx",     lumens: 3, cost: c(3,3,0,3,3) },
  { id: "t3o02", tier: 3, bonusColor: "onyx",     lumens: 4, cost: c(3,0,3,0,5) },
  { id: "t3o03", tier: 3, bonusColor: "onyx",     lumens: 4, cost: c(5,3,0,0,3) },
  { id: "t3o04", tier: 3, bonusColor: "onyx",     lumens: 5, cost: c(0,7,0,0,0) },
  // ── Tier 3 · Radiance ───────────────────────────────────────────────────────
  { id: "t3p01", tier: 3, bonusColor: "pearl",    lumens: 3, cost: c(0,3,3,3,3) },
  { id: "t3p02", tier: 3, bonusColor: "pearl",    lumens: 4, cost: c(0,0,3,7,0) },
  { id: "t3p03", tier: 3, bonusColor: "pearl",    lumens: 4, cost: c(3,3,0,3,3) },
  { id: "t3p04", tier: 3, bonusColor: "pearl",    lumens: 5, cost: c(0,0,0,0,9) },
];

const ALL_TIERS = [1, 2, 3] as const;
const ALL_AFFINITIES: GemKey[] = ['ruby', 'sapphire', 'emerald', 'onyx', 'pearl'];

function CostPip({ gemKey, count }: { gemKey: GemKey; count: number }) {
  const meta = GEM_META[gemKey];
  return (
    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5">
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

function DevDetails({ lore }: { lore: CardLoreEntry }) {
  const [open, setOpen] = useState(false);

  const toSentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const rows: { label: string; value: string | undefined }[] = [
    { label: 'Artifact Form', value: lore.artifactForm },
    { label: 'Blueprint Role', value: lore.blueprintRole },
    { label: 'Blueprint Families', value: lore.blueprintFamilies },
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
  const [filterTier, setFilterTier] = useState<1 | 2 | 3 | null>(null);
  const [filterAffinity, setFilterAffinity] = useState<GemKey | null>(null);
  const [idx, setIdx] = useState(0);

  const { data: loreData } = useGetCardLoreCatalog();

  const filtered = CATALOG.filter(card => {
    if (filterTier !== null && card.tier !== filterTier) return false;
    if (filterAffinity !== null && card.bonusColor !== filterAffinity) return false;
    return true;
  });

  const clamp = useCallback((i: number) => Math.max(0, Math.min(filtered.length - 1, i)), [filtered.length]);

  const go = useCallback((delta: number) => {
    setIdx(prev => Math.max(0, Math.min(filtered.length - 1, prev + delta)));
  }, [filtered.length]);

  useEffect(() => { setIdx(0); }, [filterTier, filterAffinity]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   go(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go]);

  const card = filtered[clamp(idx)];

  if (!card) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#060810' }}>
        <p style={{ color: '#6070a0', fontFamily: 'system-ui' }}>No cards match the current filter.</p>
      </div>
    );
  }

  const lore = loreData?.[card.id];
  const cardName = lore?.name ?? card.id;
  const bonusMeta = GEM_META[card.bonusColor];
  const specificArt = CARD_ART[card.id];
  const artLayerStyle: React.CSSProperties = {
    backgroundImage: specificArt
      ? `url(${specificArt})`
      : card.tier === 2
        ? (GEM_CARD_GRADIENTS[card.bonusColor] ?? GEM_CARD_GRADIENTS.pearl)
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
          const m = GEM_META[key];
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
              {card.lumens > 0 ? card.lumens : ''}
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
              {GEM_KEYS.map(k => {
                const n = card.cost[k];
                if (!n) return null;
                return <CostPip key={k} gemKey={k} count={n} />;
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
            {card.id}.png
          </span>
          <span style={{ fontFamily: 'system-ui', fontSize: 11, color: '#8090b0', background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
            {TIER_LABELS[card.tier]}
          </span>
          <span style={{ fontFamily: 'system-ui', fontSize: 11, color: bonusMeta.hex, background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
            {bonusMeta.name}
          </span>
          {card.lumens > 0 && (
            <span style={{ fontFamily: 'system-ui', fontSize: 11, color: '#ffd700', background: '#10142a', padding: '2px 8px', borderRadius: 4 }}>
              {card.lumens} Eminence
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
            {GEM_KEYS.map(k => {
              const n = card.cost[k];
              if (!n) return null;
              const m = GEM_META[k];
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#10142a', borderRadius: 6, padding: '4px 8px' }}>
                  <img src={m.image} alt={m.name} style={{ width: 14, height: 14, objectFit: 'contain' }} />
                  <span style={{ color: m.hex, fontFamily: 'system-ui', fontSize: 12, fontWeight: 600 }}>{n}</span>
                  <span style={{ color: '#505878', fontFamily: 'system-ui', fontSize: 11 }}>{m.name}</span>
                </div>
              );
            })}
            {GEM_KEYS.every(k => !card.cost[k]) && (
              <span style={{ color: '#404870', fontFamily: 'system-ui', fontSize: 12 }}>Free</span>
            )}
          </div>
        </div>

        {lore ? (
          <>
            <div style={{ fontFamily: 'system-ui', fontSize: 12, color: '#7080a0', lineHeight: 1.6, fontStyle: 'italic' }}>
              {lore.flavor}
            </div>

            <DevDetails lore={lore} />
          </>
        ) : (
          <div style={{ fontFamily: 'system-ui', fontSize: 12, color: '#404870', lineHeight: 1.6, fontStyle: 'italic' }}>
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
