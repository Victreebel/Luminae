import type { ArtifactCard, CivilizationDistrictInstance, CivilizationPublicArtifactState } from '@workspace/api-client-react';
import { ARTIFACT_CATALOG, CIVILIZATION_DYAD_DEFINITIONS } from '@workspace/game-types';
import { AFFINITY_META } from '@/lib/affinityMeta';
import { CARD_NAME_FALLBACK } from '@/lib/cardNameFallback';

/** District membership comes from the persisted assignment, never lore similarity. */
export function CivilizationDistrictReadout({ district, forgedArtifacts, artifacts }: {
  district: CivilizationDistrictInstance;
  forgedArtifacts: readonly ArtifactCard[];
  artifacts: readonly CivilizationPublicArtifactState[];
}) {
  const residents = [...new Set(district.residentArtifactIds)];
  const family = district.family.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
  const dyad = CIVILIZATION_DYAD_DEFINITIONS.find(definition => definition.id === district.permanentDyad);

  return <div
    className="mt-2 border border-white/14 bg-[#080d18] p-2 text-[10px] leading-relaxed text-white/70"
    data-testid="civilization-dossier-district-membership"
    data-district-id={district.districtId}
  >
    <p className="font-semibold text-white/90">{family} {district.instance + 1} · {dyad?.name ?? 'Neutral'}</p>
    <p className="text-white/55">
      {residents.length}/{district.hardCapacity} residents · Influence {district.influence}
      {dyad ? ' · Dyad locked' : ''}
    </p>
    <ul className="mt-1 space-y-1" aria-label="District residents">
      {residents.map(id => {
        const card = forgedArtifacts.find(candidate => candidate.id === id);
        const affinity = (card ?? ARTIFACT_CATALOG.find(candidate => candidate.id === id))?.bonusAffinity;
        const state = artifacts.find(artifact => artifact.artifactId === id)?.implementationState;
        return <li key={id} data-artifact-id={id}>
          <span className="text-white/85">{card?.name ?? CARD_NAME_FALLBACK[id] ?? 'Artifact'}</span>
          {affinity && <span className="ml-1 text-white/55">· {AFFINITY_META[affinity].shortName}</span>}
          {state === 'damaged' && <span className="ml-1 text-amber-200">· Damaged</span>}
        </li>;
      })}
    </ul>
  </div>;
}
