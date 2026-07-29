import {
  BrandStrikeAura,
  CardKeywordOverlay,
  type MarkerType,
  type PersistentMarkerType,
} from './game-luminary-effects';

export interface ForgeMarkerLayerProps {
  markerType?: string | null;
  markerTypes?: readonly string[];
  brandDelay?: number;
  strikeAura?: { type: MarkerType; delay?: number };
  suppressed: boolean;
  suppressedMarkerTypes?: readonly string[];
  compact?: boolean;
}

export function ForgeMarkerLayer({
  markerType,
  markerTypes,
  brandDelay,
  strikeAura,
  suppressed,
  suppressedMarkerTypes = [],
  compact = false,
}: ForgeMarkerLayerProps) {
  const allMarkerTypes = (markerTypes?.length ? markerTypes : markerType ? [markerType] : [])
    .filter((type): type is PersistentMarkerType => (
      type === 'forgotten' ||
      type === 'condemned' ||
      type === 'nullified' ||
      type === 'avatar_seed'
    ))
    .filter((type, index, types) => types.indexOf(type) === index);
  const presentationSuppressedTypes = new Set(suppressedMarkerTypes);
  // Legacy card-level suppression applies only to the newest brand. Older
  // persistent brands remain visible while a second brand waits for its strike.
  const visibleMarkerTypes = allMarkerTypes.filter((type, index) => (
    !presentationSuppressedTypes.has(type) &&
    !(suppressed && index === allMarkerTypes.length - 1)
  ));

  return (
    <div
      className="forge-marker-layer pointer-events-none"
      style={{ position: 'absolute', inset: 0, zIndex: 14 }}
    >
      {visibleMarkerTypes.map((type, index) => (
        <CardKeywordOverlay
          key={type}
          type={type}
          brandDelay={index === visibleMarkerTypes.length - 1 ? brandDelay : undefined}
          compact={compact}
          stackIndex={index}
          stackCount={visibleMarkerTypes.length}
          showSurfaceTreatment={index === visibleMarkerTypes.length - 1}
        />
      ))}
      {strikeAura && <BrandStrikeAura type={strikeAura.type} delay={strikeAura.delay ?? 0} />}
    </div>
  );
}
