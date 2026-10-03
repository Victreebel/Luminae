import { getArtifactFunctionTags } from '@workspace/game-types';

/** Public Artifact identity, available before forging and without a lore request. */
export function ArtifactFunctionTags({
  artifactId,
  compact = false,
  className = '',
}: {
  artifactId: string;
  compact?: boolean;
  className?: string;
}) {
  const tags = getArtifactFunctionTags(artifactId);
  if (tags.length === 0) return null;

  return (
    <section
      className={`min-w-0 space-y-1.5 ${className}`}
      aria-label="Artifact functions"
      data-testid="artifact-function-tags"
    >
      <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold leading-relaxed text-cyan-100/85`}>
        Functions
      </p>
      <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Function tags">
        {tags.map((tag) => (
          <li
            key={tag.id}
            className={`max-w-full rounded border border-cyan-200/25 bg-cyan-200/[0.07] px-2 py-1 ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium leading-tight text-cyan-50`}
            title={tag.description}
            data-function-id={tag.id}
          >
            {tag.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
