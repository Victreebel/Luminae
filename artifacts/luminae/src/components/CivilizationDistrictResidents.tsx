import type { CivilizationDistrictInstance } from '@workspace/api-client-react';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import {
  getCivilizationDistrictResidents,
} from '@/lib/civilizationDistrictResidents';

export const CIVILIZATION_DISTRICT_RESIDENT_STYLES = `
  .civ-district-resident-smoke {
    position: absolute;
    left: 50%; bottom: 50%;
    width: max(30%, 8px); height: max(36%, 10px);
    translate: -50% 0;
    transform-origin: center bottom;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(48,43,42,.86), rgba(67,61,59,.62) 42%, transparent 73%);
    animation: civ-district-resident-smoke 3.8s ease-in-out infinite;
  }
  @keyframes civ-district-resident-smoke {
    0%, 100% { transform: translate(0, 0) scale(.8); opacity: .7; }
    55% { transform: translate(12%, -40%) scale(1.15); opacity: .95; }
  }
  [data-civilization-motion="paused"] .civ-district-resident-smoke {
    animation-play-state: paused;
  }
  @media (prefers-reduced-motion: reduce) {
    .civ-district-resident-smoke { animation: none; }
  }
`;

/** Small authored working bays belong to the district's footprint and depth. */
export function CivilizationDistrictResidents({ district, sites }: {
  district: CivilizationDistrictInstance;
  sites: readonly CivilizationDeploymentSite[];
}) {
  return getCivilizationDistrictResidents(district, sites).map(({ artifactId, site, slot, slotIndex, art }) => {
    const { crop } = art;
    const state = site.implementationState ?? 'operational';
    const damaged = state === 'damaged';
    return (
      <span
        key={artifactId}
        className="pointer-events-none absolute z-[2] block"
        style={{
          left: `${slot.x}%`,
          top: `${slot.groundY}%`,
          width: `${slot.width}%`,
          aspectRatio: `${crop.width} / ${crop.height}`,
          transform: 'translate(-50%, -100%)',
        }}
        data-testid="civilization-district-resident"
        data-artifact-id={artifactId}
        data-site-id={site.id}
        data-resident-district={district.districtId}
        data-resident-slot={slotIndex}
        data-implementation-state={state}
        data-grounding="district-service-bay"
        aria-hidden="true"
      >
        <span
          className="absolute inset-0 block overflow-hidden"
          style={{
            transform: `translateY(${(1 - art.groundLine) * 100}%)`,
            clipPath: `inset(0 0 ${(1 - art.groundLine) * 100}% 0)`,
            filter: damaged
              ? 'saturate(0.22) brightness(0.52) contrast(1.18)'
              : state === 'annihilated'
                ? 'grayscale(1) brightness(0.28)'
                : undefined,
          }}
          data-resident-condition={state}
        >
          <img
            src={art.src}
            alt=""
            className="absolute max-w-none"
            style={{
              width: `${art.atlasSize.width / crop.width * 100}%`,
              height: `${art.atlasSize.height / crop.height * 100}%`,
              left: `${-crop.x / crop.width * 100}%`,
              top: `${-crop.y / crop.height * 100}%`,
            }}
            draggable={false}
            decoding="async"
          />
        </span>
        {damaged && (
          <span className="civ-district-resident-smoke" data-testid="civilization-resident-damage-smoke" />
        )}
      </span>
    );
  });
}
