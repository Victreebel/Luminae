import {
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID,
  ARTIFACT_EVENT_FACT_DEFINITIONS,
  getArtifactEventFacts,
  type ArtifactId,
} from '@workspace/game-types';
import { ArtifactFunctionTags } from '@/components/ArtifactFunctionTags';

/** Keep functions scannable and the exact rules available on demand. */
export function ArtifactEventFactsDetails({ artifactId }: { artifactId: string }) {
  if (!Object.hasOwn(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID, artifactId)) return null;
  const capabilities = ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[artifactId as ArtifactId];
  const facts = getArtifactEventFacts(artifactId);
  const matchingFacts = ARTIFACT_EVENT_FACT_DEFINITIONS.filter((fact) => facts?.factReviews[fact.id].matches);

  return (
    <section className="space-y-2 border-t border-border/30 pt-2 text-[11px] leading-relaxed" aria-label="Artifact Event properties" data-testid="artifact-event-facts">
      <ArtifactFunctionTags artifactId={artifactId} />
      <details key={artifactId}>
        <summary className="cursor-pointer text-[11px] font-semibold text-cyan-100/80">
          Rules
        </summary>
        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>Current Event and progression rules can refer to these specific capabilities and dependencies.</p>
          <p className="font-semibold text-white/80">Specific capabilities</p>
          <ul className="space-y-2" aria-label="Current rule capabilities">
            {capabilities.map((id) => {
              const capability = ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID[id];
              return <li key={id}><strong className="font-semibold text-white/80">{capability.label}.</strong> {capability.description}</li>;
            })}
          </ul>
          {matchingFacts.length > 0 && (
            <div>
              <p className="font-semibold text-white/80">Dependencies</p>
              <ul className="mt-1 space-y-2" aria-label="Artifact dependencies">
                {matchingFacts.map((fact) => <li key={fact.id}><strong className="font-semibold text-white/80">{fact.label}.</strong> {fact.description}</li>)}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
