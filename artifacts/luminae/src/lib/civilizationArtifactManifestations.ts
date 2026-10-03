import {
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID as SHARED_ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  type ArtifactId,
  type ArtifactManifestationProfile as SharedArtifactManifestationProfile,
} from '@workspace/game-types';

/** Allows developer-only synthetic cards while keeping every playable Artifact exhaustive. */
export type ArtifactManifestationProfile = Omit<
  SharedArtifactManifestationProfile,
  'artifactId'
> & {
  artifactId: string;
};

export const ARTIFACT_MANIFESTATION_PROFILE_BY_ID =
  SHARED_ARTIFACT_MANIFESTATION_PROFILE_BY_ID;

const FALLBACK_PROFILE: Omit<ArtifactManifestationProfile, 'artifactId' | 'visualIdentity'> = {
  lineage: 'boundary_science',
  cardSubjectScale: 'tabletop',
  implementationScale: 'local',
  nativeCameraScale: 'surface',
  manifestationFamily: 'observation_system',
  nativeRepresentation: 'an unclassified instrument inside a protected observation site',
  physicalFootprint: 'installation',
  environmentalConstraints: ['observatory_ridge', 'containment_zone'],
  motionBehavior: 'grounded_ambient',
  nonNativeRepresentationPolicy: {
    surface: 'distant_consequence',
    orbit: 'distant_consequence',
    stellar: 'distant_consequence',
    galaxy: 'distant_consequence',
  },
  higherScaleConsequences: {
    orbit: ['observation_activity'],
    stellar: ['observation_activity', 'distributed_presence'],
    galaxy: ['distributed_presence'],
  },
  visibilityByCameraScale: {
    surface: 'landmark',
    orbit: 'regional',
    stellar: 'aggregate',
    galaxy: 'aggregate',
  },
  standaloneAssetRequired: false,
  compatiblePlacementFamilies: ['observatory_ridge', 'containment_zone'],
  districtPlacementStrengthByFamily: {
    observatory_ridge: 'native',
    containment_zone: 'natural',
  },
  districtAnchorFamily: null,
  validSubstrates: ['ridge', 'developed_land'],
  requiredSupportModes: ['terraced_foundation', 'district_foundation'],
  requiresVisibleSupport: true,
};

export function getArtifactManifestationProfile(
  artifactId: string,
): ArtifactManifestationProfile {
  const catalogProfile = SHARED_ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifactId as ArtifactId];
  if (catalogProfile) return catalogProfile;

  return {
    ...FALLBACK_PROFILE,
    artifactId,
    visualIdentity: `unclassified:${artifactId}`,
  };
}
