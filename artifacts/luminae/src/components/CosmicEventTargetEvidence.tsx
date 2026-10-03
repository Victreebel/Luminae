import type { CivilizationEventTargetEvidence } from '@workspace/api-client-react';
import { CARD_NAME_FALLBACK } from '@/lib/cardNameFallback';

const ROLE_LABEL = { responder: 'Responded', target: 'Targeted', mitigator: 'Protected' } as const;

export function CosmicEventTargetEvidence({
  evidence,
  artifactNames = {},
}: {
  evidence?: readonly CivilizationEventTargetEvidence[];
  artifactNames?: Record<string, string>;
}) {
  if (!evidence?.length) return null;
  return (
    <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground" aria-label="Why these Artifacts were affected">
      {evidence.map((item, index) => (
        <li key={`${item.artifactId}:${item.role}:${item.match.id}:${index}`}>
          <span className="font-semibold text-white/80">{ROLE_LABEL[item.role]}: {artifactNames[item.artifactId] ?? CARD_NAME_FALLBACK[item.artifactId] ?? item.artifactId}.</span>{' '}
          {item.reason}
        </li>
      ))}
    </ul>
  );
}
