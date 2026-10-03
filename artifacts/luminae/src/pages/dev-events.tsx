import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CivilizationEventInstance, GamePlayerState } from '@workspace/api-client-react';
import {
  CIVILIZATION_EVENT_CARD_DEFINITIONS,
  CIVILIZATION_EVENT_CARD_IDS,
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  ARTIFACT_EVENT_FACTS_BY_ID,
  LORE_PILOT_CIVILIZATION_EVENT_CARD_IDS,
  artifactHasEventFact,
  type ArtifactId,
  type CivilizationEventCardId,
  type CivilizationEventCardDefinition,
  type CivilizationEventEffectProfile,
  type CivilizationEventTargetEvidence,
} from '@workspace/game-types';
import { RotateCcw, SlidersHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import {
  CosmicEventPresentationOverlay,
  type CosmicEventSourceRect,
} from '@/components/CosmicEventPresentationOverlay';
import { ForgeMoldCavity } from '@/components/ForgeReplacementDealAnimation';
import { gameAudio } from '@/lib/audio';

const PLAYERS = [
  { playerId: 'architect', avatarId: 'forgemaster', playerName: 'Architect', civName: 'Meridian Houses', forgedArtifacts: [{ id: 't1r01', name: 'Ignition Kernel', tier: 1 }, { id: 't2r01', name: 'Stellar Crucible', tier: 2 }] },
  { playerId: 'oru', avatarId: 'archivist', playerName: 'Oru', civName: 'The Deep Index', forgedArtifacts: [{ id: 't2s05', name: 'Mnemosyne Star-Index', tier: 2 }] },
  { playerId: 'myria', avatarId: 'cultivator', playerName: 'Myria', civName: 'The Myrian Continuity', forgedArtifacts: [] },
  { playerId: 'vesper', avatarId: 'voidcaller', playerName: 'Vesper', civName: 'Vesper Assembly', forgedArtifacts: [{ id: 't1r02', name: 'Ashroot Bloom', tier: 1 }, { id: 't2e01', name: 'Solar Immune Organ', tier: 2 }] },
] as GamePlayerState[];

const LORE_PLAYERS = PLAYERS.map((player, index) => ({
  ...player,
  forgedArtifacts: [
    [{ id: 't1p03', name: 'Prismatic Hollow', tier: 1 }, { id: 't1s04', name: 'Time-Crystal Scaffold', tier: 1 }],
    [{ id: 't2p05', name: 'Error-Correcting Core', tier: 2 }],
    [],
    [{ id: 't1p08', name: 'Petrified Bloom', tier: 1 }],
  ][index],
})) as GamePlayerState[];

const SUMMARIES: Record<CivilizationEventEffectProfile, readonly string[]> = {
  affinity_bloom: ['Gained 1 Verdance from the Well.', 'Gained 1 Flare from the Well.', 'Gained 1 Continuum from the Well.', 'At the Affinity limit; no change.'],
  forge_drift: ['The Planetary Forge revealed a new Artifact.', 'The Planetary Forge revealed a new Artifact.', 'The Planetary Forge revealed a new Artifact.', 'The Planetary Forge revealed a new Artifact.'],
  containment_cascade: ['Containment systems absorbed the cascade.', 'Partial protection reduced the disruption.', 'The cascade disrupted the civilization.', 'Containment systems absorbed the cascade.'],
  affinity_inversion: ['Returned 2 Flare to the Well.', 'Gained 1 Verdance from the Well.', 'Returned 2 Continuum to the Well.', 'Gained 1 Abyss from the Well.'],
  entropy_storm: ['Returned 3 Flare and the oldest Encrypted Artifact to its Archive.', 'Returned 2 Radiance; no ordinary Encrypted Artifact was held.', 'Returned 3 Continuum and the oldest Encrypted Artifact to its Archive.', 'Returned 1 Abyss; Foundry storage remained intact.'],
  terminus_tide: ['Gained 1 Singularity. Burned Artifacts returned to the Forge.', 'Gained 1 Singularity. Burned Artifacts returned to the Forge.', 'At the Affinity limit. Burned Artifacts returned to the Forge.', 'Gained 1 Singularity. Burned Artifacts returned to the Forge.'],
  system_shock: ['The most recently forged operational Artifact was damaged.', 'The most recently forged operational Artifact was damaged.', 'No operational Artifacts to damage.', 'The most recently forged operational Artifact was damaged.'],
  fracture_wave: ['Two operational Artifacts were damaged, highest tier first.', 'The only operational Artifact was damaged.', 'No operational Artifacts to damage.', 'Two operational Artifacts were damaged, highest tier first.'],
  signal_clarity: ['Gained 1 Flare from the Well through signal interpretation.', 'No operational signal interpreter; no Affinity gained.', 'No operational signal interpreter; no Affinity gained.', 'No operational signal interpreter; no Affinity gained.'],
  synchronization_shear: ['Time-Crystal Scaffold was damaged; it coordinates distant machines.', 'Error-Correcting Core protected itself through resilient computation.', 'No susceptible operational Artifacts; nothing was damaged.', 'No susceptible operational Artifacts; nothing was damaged.'],
};

/** Public, illustrative inputs only. Authoritative selection is tested in the server. */
function lorePreviewEvidence(definition: CivilizationEventCardDefinition, player: GamePlayerState): CivilizationEventTargetEvidence[] {
  const rule = definition.targeting;
  if (!rule) return [];
  const matches = [...player.forgedArtifacts].reverse().filter(card => {
    const artifactId = card.id as ArtifactId;
    return rule.selector.kind === 'capability'
      ? (ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[artifactId] as readonly string[]).includes(rule.selector.id)
      : artifactHasEventFact(artifactId, rule.selector.id);
  });
  const evidence: CivilizationEventTargetEvidence[] = [];
  let selected = false;
  for (const card of matches) {
    const capabilities: readonly string[] = ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[card.id as ArtifactId];
    const protectedBy = rule.protectedByOwnCapability && capabilities.includes(rule.protectedByOwnCapability);
    if (protectedBy) {
      evidence.push({ artifactId: card.id, match: { kind: 'capability', id: rule.protectedByOwnCapability! }, role: 'mitigator', reason: 'Its own resilient computation protects this implementation from disrupted coordination.' });
    } else if (!selected) {
      selected = true;
      evidence.push({ artifactId: card.id, match: rule.selector, role: rule.selector.kind === 'capability' ? 'responder' : 'target', reason: ARTIFACT_EVENT_FACTS_BY_ID[card.id as ArtifactId].practicalCapability });
    }
  }
  return evidence;
}

function damageTargets(profile: CivilizationEventEffectProfile, player: GamePlayerState): string[] {
  if (profile === 'system_shock') return player.forgedArtifacts.slice(-1).map(card => card.id);
  if (profile === 'fracture_wave') return [...player.forgedArtifacts].reverse().sort((a, b) => b.tier - a.tier).slice(0, 2).map(card => card.id);
  return [];
}

function initialDefinition(): CivilizationEventCardId {
  const query = new URLSearchParams(window.location.search).get('event');
  return CIVILIZATION_EVENT_CARD_IDS.find(id => id === query || CIVILIZATION_EVENT_CARD_DEFINITIONS[id].effectProfile === query)
    ?? 'event_planetary_affinity_bloom';
}

export default function DevEvents() {
  const [definitionId, setDefinitionId] = useState(initialDefinition);
  const [reducedMotion, setReducedMotion] = useState(() => new URLSearchParams(window.location.search).get('motion') === 'reduced');
  const [muted, setMuted] = useState(() => gameAudio.isMuted());
  const [controlsOpen, setControlsOpen] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [active, setActive] = useState(true);
  const [sourceRect, setSourceRect] = useState<CosmicEventSourceRect | null>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const definition: CivilizationEventCardDefinition = CIVILIZATION_EVENT_CARD_DEFINITIONS[definitionId];
  const pilot = (LORE_PILOT_CIVILIZATION_EVENT_CARD_IDS as readonly string[]).includes(definitionId);
  const players = pilot ? LORE_PLAYERS : PLAYERS;

  useLayoutEffect(() => {
    const rect = sourceRef.current?.getBoundingClientRect();
    if (rect) setSourceRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  }, [definitionId, replayKey]);

  const event = useMemo<CivilizationEventInstance>(() => ({
    eventId: `dev-event-${definitionId}-${replayKey}`,
    definitionId,
    rulesVersion: pilot ? 'lore-events-v1' : 'general-events-v1',
    rulesText: definition.rulesText,
    triggerWindow: 'deck_reveal',
    triggerTurnCount: 12,
    sourceCard: { id: definitionId, tier: definition.tier, origin: 'scheduled', forgeSlotIndex: 1 },
    phase: 'reveal',
    affectedPlayerIds: players.map(player => player.playerId),
    outcomesByPlayerId: Object.fromEntries(players.map((player, index) => {
      const targetEvidence = lorePreviewEvidence(definition, player);
      const damagedArtifactIds = pilot ? targetEvidence.filter(entry => entry.role === 'target').map(entry => entry.artifactId) : damageTargets(definition.effectProfile, player);
      const damagingEvent = definition.effectProfile === 'system_shock' || definition.effectProfile === 'fracture_wave' || definition.effectProfile === 'synchronization_shear';
      return [player.playerId, {
      playerId: player.playerId,
      outcomeId: damagingEvent ? damagedArtifactIds.length ? 'exposed' : 'protected' : definition.effectProfile === 'containment_cascade' && index === 2 ? 'exposed' : index === 1 ? 'partial' : 'protected',
      capabilityCoverage: index === 2 ? 'none' : index === 1 ? 'partial' : 'strong',
      respondingCapabilityIds: [],
      respondingManifestations: [],
      appliedConditionType: definition.effectProfile === 'containment_cascade' && index === 2 ? 'disrupted' : null,
      stabilityPressure: definition.effectProfile === 'containment_cascade' ? index === 2 ? 10 : index === 1 ? 3 : 0 : 0,
      summary: SUMMARIES[definition.effectProfile][index],
      damagedArtifactIds,
      targetEvidence,
    }];
    })),
    createdAt: replayKey + 1,
  }), [definition, definitionId, replayKey, pilot, players]);

  const replay = (nextId = definitionId, reduced = reducedMotion) => {
    setDefinitionId(nextId);
    setReducedMotion(reduced);
    setReplayKey(value => value + 1);
    setActive(true);
    const url = new URL(window.location.href);
    url.searchParams.set('event', CIVILIZATION_EVENT_CARD_DEFINITIONS[nextId].effectProfile);
    url.searchParams.set('motion', reduced ? 'reduced' : 'full');
    window.history.replaceState(null, '', url);
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#030713] px-4 py-12 text-slate-100 [@media(max-height:520px)]:py-4">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[.3em] text-slate-500">LUMINAe · Event preview</p>
        <h1 className="mt-3 font-serif text-3xl">The Forge</h1>
        <p className="mt-2 text-sm text-slate-400">{CIVILIZATION_EVENT_CARD_IDS.length} cosmic Events, with four sample player outcomes.</p>
        {pilot && <p className="mt-2 max-w-2xl text-sm text-cyan-200">Lore pilot · Unpublished test pool. These Events are not in ordinary matches or Chronicles. Sample inputs below are operational; the preview uses temporary card illustrations.</p>}
        <section className="mt-12 grid grid-cols-3 gap-3 sm:gap-5 [@media(max-height:520px)]:mt-4" aria-label="Preview Forge">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} ref={index === 1 ? sourceRef : undefined} data-slot-key={`${definition.tier}-${index}`} className={`relative grid aspect-[.7] w-full max-w-56 place-items-center justify-self-center overflow-hidden rounded-xl bg-slate-900/70 text-center [@media(max-height:520px)]:max-w-[134px] ${index === 1 ? 'forge-depth-mold forge-foundry-mold--empty' : ''}`}>
              {index === 1 ? <ForgeMoldCavity /> : <span className="font-serif text-sm text-slate-500">Artifact</span>}
            </div>
          ))}
        </section>
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Preview players">
          {players.map(player => <div key={player.playerId} className="rounded-lg border border-white/10 bg-white/5 p-3"><strong className="text-sm">{player.playerName}</strong><p className="mt-1 text-xs text-slate-400">{player.civName}</p>{pilot && <p className="mt-2 text-xs text-slate-300">{player.forgedArtifacts.map(card => card.name).join(' · ') || 'No operational Artifacts'}</p>}</div>)}
        </section>
        {!active && <button type="button" className="mt-8 rounded border border-cyan-200/40 bg-cyan-100/10 px-5 py-3 text-sm" onClick={() => replay()}>Replay {definition.title}</button>}
      </div>

      {active && sourceRect && <CosmicEventPresentationOverlay event={event} players={players} reducedMotion={reducedMotion} sourceRect={sourceRect} onComplete={() => setActive(false)} />}

      <button type="button" className="fixed right-2 top-2 z-[14002] grid h-9 w-9 place-items-center rounded border border-white/20 bg-[#061016]/95 text-white shadow-xl" aria-label={controlsOpen ? 'Close Event preview controls' : 'Open Event preview controls'} onClick={() => setControlsOpen(value => !value)}>{controlsOpen ? <X size={16} /> : <SlidersHorizontal size={16} />}</button>
      {controlsOpen && <nav aria-label="Event preview controls" className="fixed left-2 right-12 top-2 z-[14001] flex flex-wrap justify-end gap-2 rounded border border-white/15 bg-[#061016]/95 p-2 text-xs shadow-xl">
        <select aria-label="Event" value={definitionId} onChange={change => replay(change.target.value as CivilizationEventCardId)} className="min-w-0 max-w-full rounded border border-white/15 bg-slate-900 p-2">
          {CIVILIZATION_EVENT_CARD_IDS.map(id => <option key={id} value={id}>{CIVILIZATION_EVENT_CARD_DEFINITIONS[id].tier === 1 ? 'Planetary' : CIVILIZATION_EVENT_CARD_DEFINITIONS[id].tier === 2 ? 'Stellar' : 'Galactic'} · {CIVILIZATION_EVENT_CARD_DEFINITIONS[id].title}{(LORE_PILOT_CIVILIZATION_EVENT_CARD_IDS as readonly string[]).includes(id) ? ' · Pilot' : ''}</option>)}
        </select>
        <button type="button" className="rounded bg-white/10 px-3" onClick={() => replay(definitionId, !reducedMotion)}>{reducedMotion ? 'Reduced motion' : 'Full motion'}</button>
        <button type="button" className="grid h-9 w-9 place-items-center rounded bg-white/10" aria-label={muted ? 'Unmute preview' : 'Mute preview'} onClick={() => { gameAudio.setMuted(!muted); setMuted(!muted); }}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
        <button type="button" className="grid h-9 w-9 place-items-center rounded bg-white/10" aria-label="Replay Event" onClick={() => replay()}><RotateCcw size={16} /></button>
      </nav>}
    </main>
  );
}
