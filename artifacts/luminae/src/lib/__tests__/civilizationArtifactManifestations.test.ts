import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_IMPLEMENTATION_SCALES,
  ARTIFACT_MANIFESTATION_FAMILIES,
  ARTIFACT_PLACEMENT_FAMILIES,
  ARTIFACT_CATALOG,
  ARTIFACT_LINEAGE_BY_ID,
  CIVILIZATION_CAMERA_SCALES,
  CIVILIZATION_DYAD_DEFINITIONS,
  getArtifactPlacementPhysicalContract,
  type ArtifactId,
  type ArtifactPlacementFamily,
} from '@workspace/game-types';
import {
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  getArtifactManifestationProfile,
} from '@/lib/civilizationArtifactManifestations';
import {
  CIVILIZATION_PROOF_LOADOUT_A_IDS,
  CIVILIZATION_PROOF_LOADOUT_B_IDS,
  CIVILIZATION_PROOF_SATURATED_IDS,
} from '@/lib/civilizationArtifactProof';
import {
  DEFAULT_CIVILIZATION_ARTIFACT_RENDERING_ID,
  getCivilizationArtifactRendering,
  getCivilizationManifestationArt,
  getCivilizationNeutralSettlementArt,
  getCivilizationSurfaceDistrictArt,
  getCivilizationStandaloneArtifactArt,
  listCivilizationArtifactRenderings,
} from '@/lib/civilizationManifestationArtRegistry';

const SURFACE_PLACEMENT_FAMILIES: readonly ArtifactPlacementFamily[] = [
  'industrial_district',
  'civic_core',
  'habitat_district',
  'wilderness_margin',
  'subsurface_works',
  'observatory_ridge',
  'transit_terminus',
  'archive_quarter',
  'coastal_margin',
  'containment_zone',
];

const ORBIT_PLACEMENT_FAMILIES: readonly ArtifactPlacementFamily[] = [
  'low_orbit',
  'high_orbit',
  'orbital_yard',
  'habitat_orbit',
  'moonward_lane',
  'atmosphere_edge',
];

const STELLAR_PLACEMENT_FAMILIES: readonly ArtifactPlacementFamily[] = [
  'inner_system',
  'habitable_orbits',
  'lagrange_network',
  'outer_system',
  'heliopause',
  'distributed_systems',
];

const GALAXY_PLACEMENT_FAMILIES: readonly ArtifactPlacementFamily[] = [
  'spiral_arm',
  'coreward_region',
  'rimward_region',
  'dark_sector',
  'distributed_clusters',
  'interarm_void',
];

describe('civilization Artifact manifestations', () => {
  it('maps every playable Artifact to a deterministic physical identity', () => {
    const catalogIds = ARTIFACT_CATALOG.map((definition) => definition.id);
    const mappedIds = Object.keys(ARTIFACT_MANIFESTATION_PROFILE_BY_ID).sort();

    expect(mappedIds).toEqual([...catalogIds].sort());
    expect(mappedIds).toHaveLength(catalogIds.length);

    for (const artifactId of catalogIds) {
      const profile = ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifactId];
      expect(profile.artifactId).toBe(artifactId);
      expect(profile.lineage).toBe(ARTIFACT_LINEAGE_BY_ID[artifactId]);
      expect(profile.cardSubjectScale).toBeTruthy();
      expect(ARTIFACT_IMPLEMENTATION_SCALES).toContain(profile.implementationScale);
      expect(CIVILIZATION_CAMERA_SCALES).toContain(profile.nativeCameraScale);
      expect(ARTIFACT_MANIFESTATION_FAMILIES).toContain(profile.manifestationFamily);
      expect(profile.nativeRepresentation.length).toBeGreaterThan(24);
      expect(profile.compatiblePlacementFamilies.length).toBeGreaterThan(0);
      profile.compatiblePlacementFamilies.forEach((placement) => {
        expect(ARTIFACT_PLACEMENT_FAMILIES).toContain(placement);
        const physical = getArtifactPlacementPhysicalContract(placement);
        expect(physical.nativeScene).toBe(profile.nativeCameraScale);
        expect(profile.validSubstrates).toContain(physical.substrate);
        expect(profile.requiredSupportModes).toContain(physical.requiredSupport);
      });
      expect(profile.validSubstrates.length).toBeGreaterThan(0);
      expect(profile.requiredSupportModes.length).toBeGreaterThan(0);
      expect(profile.requiresVisibleSupport).toBe(profile.nativeCameraScale === 'surface');
      expect(profile.visibilityByCameraScale[profile.nativeCameraScale]).toBe('landmark');
      expect(profile.visualIdentity).toBeTruthy();
      expect(getArtifactManifestationProfile(artifactId)).toBe(profile);
    }
  });

  it('keeps every catalog Artifact visually distinguishable', () => {
    const signatures = ARTIFACT_CATALOG.map(({ id }) => (
      ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id].visualIdentity
    ));

    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('gives every Artifact its own authored physical silhouette', () => {
    for (const { id } of ARTIFACT_CATALOG) {
      const art = getCivilizationStandaloneArtifactArt(id);

      expect(art?.src, id).toBeTruthy();
      expect(art?.scale, id).toBeGreaterThan(0);
      expect(art?.cellAspectRatio, id).toBeGreaterThan(0);
      expect(art?.groundLine, id).toBeGreaterThan(0);
      expect(art?.groundLine, id).toBeLessThanOrEqual(1);
      expect(art?.atlas, id).toBeTruthy();
    }
  });

  it('preserves the native geometry of each square Artifact atlas cell', () => {
    expect(getCivilizationStandaloneArtifactArt('t1r01')?.cellAspectRatio).toBe(1 / 2);
    expect(getCivilizationStandaloneArtifactArt('t1r01')?.groundLine).toBe(0.866);
    expect(getCivilizationStandaloneArtifactArt('t2r01')?.cellAspectRatio).toBe(2 / 3);
    expect(getCivilizationStandaloneArtifactArt('t3r01')?.cellAspectRatio).toBe(1);
  });

  it('keeps cosmetic rendering identity separate from Artifact gameplay identity', () => {
    const canonical = getCivilizationArtifactRendering('t1r01');
    const unavailableEdition = getCivilizationArtifactRendering('t1r01', 'future-premium-edition');

    expect(canonical?.id).toBe(DEFAULT_CIVILIZATION_ARTIFACT_RENDERING_ID);
    expect(canonical?.availability).toBe('included');
    expect(unavailableEdition).toEqual(canonical);
    expect(listCivilizationArtifactRenderings('t1r01')).toEqual([canonical]);
    expect(getCivilizationArtifactRendering('missing-artifact')).toBeNull();
  });

  it('never substitutes card-subject scale for implementation scale', () => {
    const boundedTierThreeSubjects = ARTIFACT_CATALOG
      .filter(({ tier }) => tier === 3)
      .map(({ id }) => ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id]);

    expect(boundedTierThreeSubjects.every((profile) => profile.implementationScale === 'galactic')).toBe(true);
    expect(boundedTierThreeSubjects.some((profile) => profile.cardSubjectScale !== 'galactic')).toBe(true);
    expect(boundedTierThreeSubjects.every((profile) => profile.nativeCameraScale === 'galaxy')).toBe(true);
  });

  it('uses comparable but disjoint 16-Artifact proof loadouts', () => {
    const loadoutA = new Set<ArtifactId>(CIVILIZATION_PROOF_LOADOUT_A_IDS);
    const loadoutB = new Set<ArtifactId>(CIVILIZATION_PROOF_LOADOUT_B_IDS);
    const tierCounts = (ids: readonly ArtifactId[]) => ids.reduce<Record<number, number>>((counts, id) => {
      const tier = ARTIFACT_CATALOG.find((definition) => definition.id === id)?.tier ?? 0;
      counts[tier] = (counts[tier] ?? 0) + 1;
      return counts;
    }, {});
    const affinityCounts = (ids: readonly ArtifactId[]) => ids.reduce<Record<string, number>>((counts, id) => {
      const affinity = ARTIFACT_CATALOG.find((definition) => definition.id === id)?.bonusAffinity ?? 'missing';
      counts[affinity] = (counts[affinity] ?? 0) + 1;
      return counts;
    }, {});

    expect(loadoutA.size).toBe(16);
    expect(loadoutB.size).toBe(16);
    expect([...loadoutA].filter((id) => loadoutB.has(id))).toEqual([]);
    expect(tierCounts(CIVILIZATION_PROOF_LOADOUT_A_IDS)).toEqual(tierCounts(CIVILIZATION_PROOF_LOADOUT_B_IDS));
    expect(affinityCounts(CIVILIZATION_PROOF_LOADOUT_A_IDS)).toEqual(affinityCounts(CIVILIZATION_PROOF_LOADOUT_B_IDS));
  });

  it('derives the saturated proof collection from the complete live catalog', () => {
    const catalogIds = ARTIFACT_CATALOG.map(({ id }) => id);

    expect(CIVILIZATION_PROOF_SATURATED_IDS).toEqual(catalogIds);
    expect(new Set(CIVILIZATION_PROOF_SATURATED_IDS).size).toBe(catalogIds.length);
  });

  it('covers every placement at every scale for every dyad with authored environmental art', () => {
    const placementsByScene = {
      surface: SURFACE_PLACEMENT_FAMILIES,
      orbit: ORBIT_PLACEMENT_FAMILIES,
      stellar: STELLAR_PLACEMENT_FAMILIES,
      galaxy: GALAXY_PLACEMENT_FAMILIES,
    } as const;

    for (const { id: dyad } of CIVILIZATION_DYAD_DEFINITIONS) {
      for (const scene of CIVILIZATION_CAMERA_SCALES) {
        for (const placement of placementsByScene[scene]) {
          const art = getCivilizationManifestationArt(dyad, scene, placement);

          expect(art?.src, `${dyad}/${scene}/${placement}`).toBeTruthy();
          expect(art?.scale).toBeGreaterThan(0);
          expect(art?.anchor.x).toBeGreaterThanOrEqual(0);
          expect(art?.anchor.x).toBeLessThanOrEqual(100);
          expect(art?.anchor.y).toBeGreaterThanOrEqual(0);
          expect(art?.anchor.y).toBeLessThanOrEqual(100);
          if (dyad === 'chrysalis') {
            expect(art?.atlas).toBeUndefined();
          } else {
            expect(art?.atlas).toBeTruthy();
          }
        }
      }
    }

    for (const scene of CIVILIZATION_CAMERA_SCALES) {
      for (const placement of placementsByScene[scene]) {
        const art = getCivilizationNeutralSettlementArt(scene, placement);

        expect(art?.src, `neutral/${scene}/${placement}`).toContain('/neutral/');
        expect(art?.atlas, `neutral/${scene}/${placement}`).toBeTruthy();
      }
    }

    expect(getCivilizationManifestationArt('vortex', 'surface', 'civic_core')?.atlas)
      .toEqual({ columns: 5, rows: 2, column: 1, row: 0 });
    expect(getCivilizationManifestationArt('echo', 'orbit', 'atmosphere_edge')?.atlas)
      .toEqual({ columns: 3, rows: 2, column: 2, row: 1 });
    expect(getCivilizationSurfaceDistrictArt('chrysalis', 'civic_core', 0)?.atlas)
      .toBeUndefined();
    expect(getCivilizationSurfaceDistrictArt('chrysalis', 'civic_core', 1)?.atlas)
      .toEqual({ columns: 3, rows: 2, column: 0, row: 0 });
    expect(getCivilizationSurfaceDistrictArt('chrysalis', 'observatory_ridge', 1)?.atlas)
      .toEqual({ columns: 3, rows: 2, column: 2, row: 1 });
  });
});
