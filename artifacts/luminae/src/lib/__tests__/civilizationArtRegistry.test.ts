import { describe, expect, it } from 'vitest';
import {
  CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID,
  CIVILIZATION_ENVIRONMENT_VARIANTS,
  CIVILIZATION_DYAD_DEFINITIONS,
  createCivilizationEnvironmentIdentity,
} from '@workspace/game-types';
import {
  getCivilizationArchetypeArtSlot,
  getCivilizationArtifactTreatmentArtSlot,
  getCivilizationBlueprintArtSlot,
  getCivilizationChronicleArtSlot,
  getCivilizationEnvironmentPlateArtSlot,
  getCivilizationEnvironmentDressing,
  getCivilizationPlateArtSlot,
  getCivilizationSiteArtSlot,
  listCivilizationArtSlots,
} from '@/lib/civilizationArtRegistry';
import type { CivilizationCityDevelopmentStage } from '@/lib/civilizationVisualState';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';

const SCENES = ['surface', 'orbit', 'stellar', 'galaxy'] as const;

describe('civilizationArtRegistry', () => {
  it('keeps cinematic and Scan on the same neutral physical substrate', () => {
    for (const scene of SCENES) {
      const cinematic = getCivilizationPlateArtSlot(scene, false);
      const scan = getCivilizationPlateArtSlot(scene, true);

      expect(cinematic.id).toBe(`civilization.plate.${scene}.cinematic`);
      expect(scan.id).toBe(`civilization.plate.${scene}.scan`);
      expect(cinematic.resolution).toBe('bitmap');
      expect(scan.src).toBe(cinematic.src);
      expect(`${cinematic.notes} ${scan.notes}`).toMatch(/substrate/i);
    }
  });

  it('does not let dyad or archetype replace the world plate', () => {
    const neutral = getCivilizationPlateArtSlot('surface', false);
    const bloom = getCivilizationPlateArtSlot(
      'surface',
      false,
      'living_arcology',
      'bloom',
      2,
      'galactic',
    );
    const vortex = getCivilizationPlateArtSlot(
      'surface',
      false,
      'route_network',
      'vortex',
      2,
      'galactic',
    );

    expect(bloom.src).toBe(neutral.src);
    expect(vortex.src).toBe(neutral.src);
    expect(bloom.id).toBe(neutral.id);
    expect(vortex.id).toBe(neutral.id);
  });

  it('shares one Surface construction plan while preserving authored identities beyond it', () => {
    for (const scene of SCENES) {
      const slots = CIVILIZATION_ENVIRONMENT_VARIANTS.map((variant) => (
        getCivilizationEnvironmentPlateArtSlot(
          scene,
          false,
          createCivilizationEnvironmentIdentity(`registry:${variant.id}`, variant.id),
        )
      ));

      expect(new Set(slots.map((entry) => entry.src)).size)
        .toBe(scene === 'surface' ? 1 : CIVILIZATION_ENVIRONMENT_VARIANTS.length);
      expect(slots.every((entry) => Boolean(entry.mobileSrc))).toBe(true);
      expect(new Set(slots.map((entry) => entry.mobileSrc)).size)
        .toBe(scene === 'surface' ? 1 : CIVILIZATION_ENVIRONMENT_VARIANTS.length);
      expect(slots.every((entry) => entry.notes.includes('Match-persistent'))).toBe(true);
      if (scene === 'surface') {
        expect(slots.every((entry) => (
          entry.constructionPlanId === CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID
        ))).toBe(true);
        expect(new Set(slots.map((entry) => entry.position)).size).toBe(1);
        expect(new Set(slots.map((entry) => entry.transformOrigin)).size).toBe(1);
      }
    }
  });

  it('keeps four legible nonstructural environment dressings', () => {
    const dressings = CIVILIZATION_ENVIRONMENT_VARIANTS.map((variant) => (
      getCivilizationEnvironmentDressing(variant.id)
    ));

    expect(new Set(dressings.map((dressing) => dressing.id)).size).toBe(4);
    expect(new Set(dressings.map((dressing) => dressing.label)).size).toBe(4);
    expect(new Set(dressings.map((dressing) => dressing.artFilter)).size).toBe(4);
    expect(new Set(dressings.map((dressing) => dressing.surfaceAtmosphere)).size).toBe(4);
  });

  it('keeps each environment composition invariant when Scan opens', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const identity = createCivilizationEnvironmentIdentity(
        `scan-parity:${variant.id}`,
        variant.id,
      );
      for (const scene of SCENES) {
        const cinematic = getCivilizationEnvironmentPlateArtSlot(scene, false, identity);
        const scan = getCivilizationEnvironmentPlateArtSlot(scene, true, identity);

        expect(scan.src).toBe(cinematic.src);
        expect(scan.mobileSrc).toBe(cinematic.mobileSrc);
        expect(scan.position).toBe(cinematic.position);
        expect(scan.transformOrigin).toBe(cinematic.transformOrigin);
        expect(scan.atlasCell).toEqual(cinematic.atlasCell);
      }
    }
  });

  it('expresses maturity without replacing persistent geography', () => {
    const identity = createCivilizationEnvironmentIdentity('maturity', 'oceanic_scar');
    const foundation = getCivilizationEnvironmentPlateArtSlot(
      'surface',
      false,
      identity,
      0,
      'planetary',
    );
    const ascendant = getCivilizationEnvironmentPlateArtSlot(
      'surface',
      false,
      identity,
      3,
      'galactic',
    );

    expect(ascendant.src).toBe(foundation.src);
    expect(ascendant.mobileSrc).toBe(foundation.mobileSrc);
    expect(foundation.cinematicScale).toBe(1);
    expect(ascendant.cinematicScale).toBe(foundation.cinematicScale);
    expect(foundation.contrast).not.toBe(ascendant.contrast);
    expect(ascendant.evolutionLabel).toBe('Ascendant');
  });

  it('keeps every growth stage on the same persistent environment substrate', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const identity = createCivilizationEnvironmentIdentity(`growth:${variant.id}`, variant.id);
      const nucleus = getCivilizationEnvironmentPlateArtSlot(
        'surface', false, identity, 1, 'planetary', 'nucleus',
      );
      const typeOneCity = getCivilizationEnvironmentPlateArtSlot(
        'surface', false, identity, 1, 'planetary', 'city',
      );
      const typeTwoCity = getCivilizationEnvironmentPlateArtSlot(
        'surface', false, identity, 2, 'stellar', 'metropolis',
      );
      const typeThreeCity = getCivilizationEnvironmentPlateArtSlot(
        'surface', false, identity, 3, 'galactic', 'metropolis',
      );
      const typeTwoSystem = getCivilizationEnvironmentPlateArtSlot(
        'stellar', false, identity, 2, 'stellar', 'metropolis',
      );
      const typeThreeGalaxy = getCivilizationEnvironmentPlateArtSlot(
        'galaxy', false, identity, 3, 'galactic', 'metropolis',
      );
      const scan = getCivilizationEnvironmentPlateArtSlot(
        'surface', true, identity, 3, 'galactic', 'metropolis',
      );

      expect(new Set([nucleus.src, typeOneCity.src, typeTwoCity.src, typeThreeCity.src]).size).toBe(1);
      expect(new Set([nucleus.id, typeOneCity.id, typeTwoCity.id, typeThreeCity.id]).size).toBe(1);
      expect(typeTwoSystem.notes).toContain('Match-persistent world identity');
      expect(typeThreeGalaxy.notes).toContain('assembled above this plate');
      expect(typeThreeCity.notes).toContain('neutral settlement kit');
      expect(scan.src).toBe(typeThreeCity.src);
      expect(scan.mobileSrc).toBe(typeThreeCity.mobileSrc);
    }
  });

  it('keeps Dyad commitment in the modular architecture layer', () => {
    const identity = createCivilizationEnvironmentIdentity('committed-fabric', 'aurora_basin');
    const forming = getCivilizationEnvironmentPlateArtSlot(
      'surface', false, identity, 3, 'galactic', 'metropolis', null,
    );
    const committed = getCivilizationEnvironmentPlateArtSlot(
      'surface', false, identity, 3, 'galactic', 'metropolis', 'chrysalis',
    );
    expect(committed.id).toBe(forming.id);
    expect(committed.src).toBe(forming.src);
    expect(committed.mobileSrc).toBe(forming.mobileSrc);
    expect(committed.contrast).toBe(forming.contrast);
    expect(forming.notes).toContain('neutral settlement kit');
    expect(committed.notes).toContain('chrysalis architecture');
    expect(committed.notes).toContain('modular district kit');
  });

  it('keeps Aurora Basin geography continuous while its authored city fabric advances', () => {
    const identity = createCivilizationEnvironmentIdentity('early-city', 'aurora_basin');
    const wilderness = getCivilizationEnvironmentPlateArtSlot(
      'surface', false, identity, 0, 'planetary', 'wilderness', null, 0,
    );
    const nucleus = getCivilizationEnvironmentPlateArtSlot(
      'surface', false, identity, 0, 'planetary', 'nucleus', null, 1,
    );
    const emergingCity = getCivilizationEnvironmentPlateArtSlot(
      'surface', false, identity, 0, 'planetary', 'city', null, 2,
    );
    const chrysalisCity = getCivilizationEnvironmentPlateArtSlot(
      'surface', false, identity, 0, 'planetary', 'city', 'chrysalis', 3,
    );
    const scan = getCivilizationEnvironmentPlateArtSlot(
      'surface', true, identity, 0, 'planetary', 'city', 'chrysalis', 3,
    );

    expect(new Set([
      wilderness.id,
      nucleus.id,
      emergingCity.id,
      chrysalisCity.id,
    ]).size).toBe(4);
    expect(new Set([
      wilderness.src,
      nucleus.src,
      emergingCity.src,
      chrysalisCity.src,
    ]).size).toBe(4);
    expect(new Set([
      wilderness.position,
      nucleus.position,
      emergingCity.position,
      chrysalisCity.position,
    ]).size).toBe(1);
    expect(new Set([
      wilderness.transformOrigin,
      nucleus.transformOrigin,
      emergingCity.transformOrigin,
      chrysalisCity.transformOrigin,
    ]).size).toBe(1);
    expect(wilderness.src).toContain('aurora-basin-empty-desktop-v1.webp');
    expect(wilderness.mobileSrc).toContain('aurora-basin-empty-mobile-v1.webp');
    expect(nucleus.src).toContain('aurora-basin-sparse-desktop-v1.webp');
    expect(nucleus.mobileSrc).toContain('aurora-basin-sparse-mobile-v1.webp');
    expect(emergingCity.src).toContain('aurora-basin-young-desktop-v1.webp');
    expect(emergingCity.mobileSrc).toContain('aurora-basin-young-mobile-v1.webp');
    expect(chrysalisCity.mobileSrc).toContain('aurora-basin-young-chrysalis-mobile-v1.webp');
    expect(chrysalisCity.src).toContain('aurora-basin-young-chrysalis-desktop-v1.webp');
    for (const plate of [wilderness, nucleus, emergingCity, chrysalisCity, scan]) {
      expect(plate.cinematicScale).toBe(1);
      expect(plate.scanScale).toBe(1);
      expect(plate.constructionPlanId).toBe(wilderness.constructionPlanId);
    }
    expect(nucleus.notes).toContain('continuous city fabric at stage 1');
    expect(emergingCity.notes).toContain('continuous city fabric at stage 2');
    expect(chrysalisCity.notes).toContain('continuous city fabric at stage 3');
    expect(chrysalisCity.notes).toContain('terrain topology, camera, districts, and sockets remain invariant');
    expect(scan.src).toBe(chrysalisCity.src);
    expect(scan.position).toBe(chrysalisCity.position);
  });

  it('retains stellar infrastructure until the saturated Chrysalis Tier III endpoint', () => {
    const identity = createCivilizationEnvironmentIdentity('chrysalis-city', 'aurora_basin');
    const stages = ([
      { cityDevelopmentStage: 4, evolutionStage: 0, maturity: 'planetary' },
      { cityDevelopmentStage: 5, evolutionStage: 1, maturity: 'planetary' },
      { cityDevelopmentStage: 6, evolutionStage: 2, maturity: 'stellar' },
      { cityDevelopmentStage: 7, evolutionStage: 2, maturity: 'stellar' },
      { cityDevelopmentStage: 8, evolutionStage: 3, maturity: 'galactic' },
      { cityDevelopmentStage: 9, evolutionStage: 3, maturity: 'galactic' },
    ] as const).map(({ cityDevelopmentStage, evolutionStage, maturity }) => (
      getCivilizationEnvironmentPlateArtSlot(
        'surface',
        false,
        identity,
        evolutionStage,
        maturity,
        'metropolis',
        'chrysalis',
        cityDevelopmentStage,
      )
    ));

    expect(new Set(stages.map((plate) => plate.src)).size).toBe(3);
    expect(new Set(stages.map((plate) => plate.mobileSrc)).size).toBe(3);
    expect(stages[1]?.src).toBe(stages[0]?.src);
    expect(stages[2]?.src).not.toBe(stages[1]?.src);
    expect(stages[5]?.src).not.toBe(stages[4]?.src);
    expect(stages[5]?.mobileSrc).not.toBe(stages[4]?.mobileSrc);
    expect(stages.map((plate) => plate.id)).toEqual([
      'civilization.environment.aurora_basin.surface.city-4.chrysalis.cinematic',
      'civilization.environment.aurora_basin.surface.city-5.chrysalis.cinematic',
      'civilization.environment.aurora_basin.surface.city-6.chrysalis.cinematic',
      'civilization.environment.aurora_basin.surface.city-7.chrysalis.cinematic',
      'civilization.environment.aurora_basin.surface.city-8.chrysalis.cinematic',
      'civilization.environment.aurora_basin.surface.city-9.chrysalis.cinematic',
    ]);
    expect(stages[0]?.src).toContain('district-fabric-chrysalis-v1.webp');
    expect(stages[0]?.mobileSrc).toContain('district-fabric-chrysalis-mobile-v1.webp');
    for (const plate of stages.slice(2, 5)) {
      expect(plate.src).toContain('stellar-chrysalis-desktop-v1.webp');
      expect(plate.mobileSrc).toContain('stellar-chrysalis-mobile-v1.webp');
    }
    expect(stages[5]?.src).toContain('galactic-chrysalis-desktop-v7.webp');
    expect(stages[5]?.mobileSrc).toContain('galactic-chrysalis-mobile-v6.webp');
    for (const plate of stages.slice(2)) {
      expect(plate.position).toBe(stages[0]?.position);
      expect(plate.transformOrigin).toBe(stages[0]?.transformOrigin);
      expect(plate.cinematicScale).toBe(1);
      expect(plate.scanScale).toBe(1);
      expect(plate.constructionPlanId).toBe(stages[0]?.constructionPlanId);
    }
    expect(stages.every((plate) => plate.notes.includes('continuous city fabric'))).toBe(true);
  });

  it('isolates the galactic city reference while preserving the camera and Scan composition', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const environment = createCivilizationEnvironmentIdentity('galactic-reference', variant.id);
      for (const scene of SCENES) {
        const priorStage = getCivilizationEnvironmentPlateArtSlot(
          scene, false, environment, 3, 'galactic', 'metropolis', 'chrysalis', 8,
        );
        const cinematic = getCivilizationEnvironmentPlateArtSlot(
          scene, false, environment, 3, 'galactic', 'metropolis', 'chrysalis', 9,
        );
        const scan = getCivilizationEnvironmentPlateArtSlot(
          scene, true, environment, 3, 'galactic', 'metropolis', 'chrysalis', 9,
        );

        if (scene === 'surface') {
          const desktopVersion = variant.id === 'aurora_basin' ? 'v7' : 'v1';
          const mobileVersion = variant.id === 'aurora_basin' ? 'v6' : 'v1';
          expect(cinematic.src).toContain(`galactic-chrysalis-desktop-${desktopVersion}.webp`);
          expect(cinematic.mobileSrc).toContain(`galactic-chrysalis-mobile-${mobileVersion}.webp`);
        } else {
          expect(cinematic.src).toBe(priorStage.src);
          expect(cinematic.mobileSrc).toBe(priorStage.mobileSrc);
        }
        expect(cinematic).toMatchObject({
          position: priorStage.position,
          transformOrigin: priorStage.transformOrigin,
          cinematicScale: priorStage.cinematicScale,
          scanScale: priorStage.scanScale,
          constructionPlanId: priorStage.constructionPlanId,
          atlasCell: priorStage.atlasCell,
        });
        expect(scan).toMatchObject({
          src: cinematic.src,
          mobileSrc: cinematic.mobileSrc,
          position: cinematic.position,
          transformOrigin: cinematic.transformOrigin,
          cinematicScale: cinematic.cinematicScale,
          scanScale: cinematic.scanScale,
          constructionPlanId: cinematic.constructionPlanId,
          atlasCell: cinematic.atlasCell,
        });
      }
    }
  });

  it('preserves the construction plan and camera while authored city fabric follows the presented dyad', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const environment = createCivilizationEnvironmentIdentity('district-transition', variant.id);
      for (let stage = 0; stage <= 9; stage += 1) {
        const cityStage = stage as CivilizationCityDevelopmentStage;
        const incumbent = getCivilizationEnvironmentPlateArtSlot(
          'surface', false, environment, 3, 'galactic', 'metropolis', 'chrysalis', cityStage,
        );
        for (const dyad of [null, ...CIVILIZATION_DYAD_DEFINITIONS.map(({ id }) => id)]) {
          for (const scan of [false, true]) {
            const successor = getCivilizationEnvironmentPlateArtSlot(
              'surface', scan, environment, 3, 'galactic', 'metropolis', dyad, cityStage,
            );
            expect(successor).toMatchObject({
              atlasCell: incumbent.atlasCell,
              position: incumbent.position,
              transformOrigin: incumbent.transformOrigin,
              cinematicScale: incumbent.cinematicScale,
              scanScale: incumbent.scanScale,
              constructionPlanId: incumbent.constructionPlanId,
            });
            const authoredDyad = dyad === 'chrysalis' || dyad === 'echo';
            const expected = stage === 0
              ? ['empty-desktop-v1.webp', 'empty-mobile-v1.webp']
              : stage === 1
                ? ['sparse-desktop-v1.webp', 'sparse-mobile-v1.webp']
                : stage < 4
                  ? [`young-${authoredDyad ? `${dyad}-` : ''}desktop-v1.webp`, `young-${authoredDyad ? `${dyad}-` : ''}mobile-v1.webp`]
                  : stage === 9 && dyad === 'chrysalis'
                    ? [
                        `galactic-chrysalis-desktop-${variant.id === 'aurora_basin' ? 'v7' : 'v1'}.webp`,
                        `galactic-chrysalis-mobile-${variant.id === 'aurora_basin' ? 'v6' : 'v1'}.webp`,
                      ]
                  : stage >= 6
                    ? [`stellar-${authoredDyad ? dyad : 'neutral'}-desktop-v1.webp`, `stellar-${authoredDyad ? dyad : 'neutral'}-mobile-v1.webp`]
                    : authoredDyad
                      ? [`district-fabric-${dyad}-v1.webp`, `district-fabric-${dyad}-mobile-v1.webp`]
                      : ['district-master-v1.webp', 'district-master-mobile-v1.webp'];
            expect(successor.src).toContain(expected[0]);
            expect(successor.mobileSrc).toContain(expected[1]);
            const cinematic = getCivilizationEnvironmentPlateArtSlot(
              'surface', false, environment, 3, 'galactic', 'metropolis', dyad, cityStage,
            );
            expect(successor.src).toBe(cinematic.src);
            expect(successor.mobileSrc).toBe(cinematic.mobileSrc);
          }
        }
      }
    }
  });

  it('keeps mature Chrysalis infrastructure independent from every scale plate', () => {
    const identity = createCivilizationEnvironmentIdentity('mature-scales', 'aurora_basin');
    const scenes = (['orbit', 'stellar', 'galaxy'] as const).map((scene) => (
      getCivilizationEnvironmentPlateArtSlot(
        scene, false, identity, 3, 'galactic', 'metropolis', 'chrysalis', 9,
      )
    ));
    const neutralSystem = getCivilizationEnvironmentPlateArtSlot(
      'stellar', false, identity, 3, 'galactic', 'metropolis', null, 9,
    );

    expect(scenes.every((plate) => plate.id.includes('civilization.environment.aurora_basin'))).toBe(true);
    expect(new Set(scenes.map((plate) => plate.src)).size).toBe(3);
    expect(scenes[1]?.src).toBe(neutralSystem.src);
    expect(scenes[1]?.id).toBe(neutralSystem.id);
    expect(scenes[1]?.notes).toContain('chrysalis architecture');
    expect(scenes[1]?.notes).toContain('modular district kit');
  });

  it('describes construction layers as physical architecture and Great Works', () => {
    expect(getCivilizationArchetypeArtSlot('forge_spine', 'surface')).toMatchObject({
      id: 'civilization.archetype.forge_spine.surface',
      layer: 'archetype',
      resolution: 'procedural',
    });
    expect(getCivilizationArchetypeArtSlot('forge_spine', 'surface').notes)
      .toContain('Physical dyad host architecture');
    expect(getCivilizationBlueprintArtSlot('bp_antimatter_detonator').notes)
      .toContain('physical Great Work');
    expect(getCivilizationArtifactTreatmentArtSlot('mantlelift_driver').notes)
      .toContain('never as scene geometry');
  });

  it('maps deployment sites to the appropriate physical art contract', () => {
    const blueprintSite = {
      id: 'blueprint:antimatter',
      kind: 'blueprint',
      blueprintId: 'bp_antimatter_detonator',
      blueprintRole: 'Antimatter Detonator',
    } as CivilizationDeploymentSite;
    const artifactSite = {
      id: 'artifact:mantlelift',
      kind: 'artifact',
      artifactSceneTreatment: 'mantlelift_driver',
    } as CivilizationDeploymentSite;

    expect(getCivilizationSiteArtSlot(blueprintSite)).toMatchObject({
      id: 'civilization.blueprint.bp_antimatter_detonator',
      layer: 'blueprint',
    });
    expect(getCivilizationSiteArtSlot(artifactSite)).toMatchObject({
      id: 'civilization.artifact-treatment.mantlelift_driver',
      layer: 'artifact-treatment',
    });
    expect(getCivilizationChronicleArtSlot('Outer Vault Access')).toMatchObject({
      id: 'civilization.chronicle.outer_vault_access',
      resolution: 'planned',
    });
  });

  it('lists only current substrates and construction-layer slots', () => {
    const slots = listCivilizationArtSlots();
    const ids = slots.map((entry) => entry.id);

    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      for (const scene of SCENES) {
        expect(ids).toContain(`civilization.environment.${variant.id}.${scene}.cinematic`);
        expect(ids).toContain(`civilization.environment.${variant.id}.${scene}.scan`);
      }
    }
    expect(ids).toContain('civilization.archetype.living_arcology.surface');
    expect(ids).toContain('civilization.blueprint.bp_mantle_to_orbit_foundry');
    expect(ids).toContain('civilization.artifact-treatment.horizon_extractor');
    expect(ids.some((id) => /^civilization\.plate\.[^.]+\.(?:bloom|echo|vortex)\./.test(id)))
      .toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
