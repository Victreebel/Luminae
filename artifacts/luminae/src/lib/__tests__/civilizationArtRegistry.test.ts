import { describe, expect, it } from 'vitest';
import {
  getCivilizationArchetypeArtSlot,
  getCivilizationArtifactTreatmentArtSlot,
  getCivilizationBlueprintArtSlot,
  getCivilizationChronicleArtSlot,
  getCivilizationPlateArtSlot,
  getCivilizationSiteArtSlot,
  listCivilizationArtSlots,
} from '@/lib/civilizationArtRegistry';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';

describe('civilizationArtRegistry', () => {
  it('exposes bitmap plate slots for cinematic and scan scenes', () => {
    const cinematic = getCivilizationPlateArtSlot('surface', false);
    const scan = getCivilizationPlateArtSlot('surface', true);

    expect(cinematic.id).toBe('civilization.plate.surface.cinematic');
    expect(cinematic.resolution).toBe('bitmap');
    expect(cinematic.src).toBeTruthy();
    expect(cinematic.notes).toContain('Dedicated market-ready city/surface');
    expect(scan.id).toBe('civilization.plate.surface.scan');
    expect(scan.resolution).toBe('bitmap');
    expect(scan.src).toBeTruthy();
    expect(scan.notes).toContain('Dedicated scan-ready city plate');
    expect(scan.src).toBe(cinematic.src);
    expect(scan.scanScale).toBeLessThan(1.1);
  });

  it('uses cleaner high-scale plates where scan overlays compete with the scene', () => {
    const stellar = getCivilizationPlateArtSlot('stellar', false);
    const galaxy = getCivilizationPlateArtSlot('galaxy', false);

    expect(stellar.notes).toContain('Cleaner');
    expect(galaxy.notes).toContain('Cleaner');
  });

  it('selects bespoke archetype plates when they exist and falls back safely otherwise', () => {
    const genericSurface = getCivilizationPlateArtSlot('surface', true);
    const livingSurface = getCivilizationPlateArtSlot('surface', true, 'living_arcology');
    const routeSurface = getCivilizationPlateArtSlot('surface', true, 'route_network');
    const containmentSurface = getCivilizationPlateArtSlot('surface', true, 'containment_sentinel');
    const forgeSurface = getCivilizationPlateArtSlot('surface', true, 'forge_spine');
    const archiveSurface = getCivilizationPlateArtSlot('surface', true, 'archive_lattice');
    const livingOrbit = getCivilizationPlateArtSlot('orbit', false, 'living_arcology');
    const forgeOrbit = getCivilizationPlateArtSlot('orbit', true, 'forge_spine');
    const routeOrbit = getCivilizationPlateArtSlot('orbit', true, 'route_network');
    const containmentOrbit = getCivilizationPlateArtSlot('orbit', true, 'containment_sentinel');
    const accordOrbit = getCivilizationPlateArtSlot('orbit', true, 'accord_beacon');
    const accordGalaxy = getCivilizationPlateArtSlot('galaxy', true, 'accord_beacon');
    const livingStellar = getCivilizationPlateArtSlot('stellar', false, 'living_arcology');
    const forgeStellar = getCivilizationPlateArtSlot('stellar', true, 'forge_spine');
    const routeStellar = getCivilizationPlateArtSlot('stellar', true, 'route_network');
    const containmentStellar = getCivilizationPlateArtSlot('stellar', true, 'containment_sentinel');
    const archiveStellar = getCivilizationPlateArtSlot('stellar', true, 'archive_lattice');
    const livingGalaxy = getCivilizationPlateArtSlot('galaxy', false, 'living_arcology');
    const forgeGalaxy = getCivilizationPlateArtSlot('galaxy', false, 'forge_spine');
    const routeGalaxy = getCivilizationPlateArtSlot('galaxy', true, 'route_network');
    const containmentGalaxy = getCivilizationPlateArtSlot('galaxy', true, 'containment_sentinel');
    const archiveGalaxy = getCivilizationPlateArtSlot('galaxy', true, 'archive_lattice');
    const archiveOrbit = getCivilizationPlateArtSlot('orbit', false, 'archive_lattice');

    expect(livingSurface.id).toBe('civilization.plate.surface.living_arcology.scan');
    expect(livingSurface.src).toBeTruthy();
    expect(livingSurface.src).not.toBe(genericSurface.src);
    expect(livingSurface.notes).toContain('Dedicated scan-ready living city plate');
    expect(livingOrbit.id).toBe('civilization.plate.orbit.living_arcology.cinematic');
    expect(livingStellar.id).toBe('civilization.plate.stellar.living_arcology.cinematic');
    expect(forgeSurface.id).toBe('civilization.plate.surface.forge_spine.scan');
    expect(forgeSurface.src).not.toBe(genericSurface.src);
    expect(forgeOrbit.id).toBe('civilization.plate.orbit.forge_spine.scan');
    expect(forgeStellar.id).toBe('civilization.plate.stellar.forge_spine.scan');
    expect(forgeGalaxy.id).toBe('civilization.plate.galaxy.forge_spine.cinematic');
    expect(routeSurface.id).toBe('civilization.plate.surface.route_network.scan');
    expect(routeSurface.src).not.toBe(genericSurface.src);
    expect(routeOrbit.id).toBe('civilization.plate.orbit.route_network.scan');
    expect(accordOrbit.id).toBe('civilization.plate.orbit.accord_beacon.scan');
    expect(accordGalaxy.id).toBe('civilization.plate.galaxy.accord_beacon.scan');
    expect(routeStellar.id).toBe('civilization.plate.stellar.route_network.scan');
    expect(routeGalaxy.id).toBe('civilization.plate.galaxy.route_network.scan');
    expect(containmentSurface.id).toBe('civilization.plate.surface.containment_sentinel.scan');
    expect(containmentSurface.src).not.toBe(genericSurface.src);
    expect(containmentOrbit.id).toBe('civilization.plate.orbit.containment_sentinel.scan');
    expect(containmentStellar.id).toBe('civilization.plate.stellar.containment_sentinel.scan');
    expect(archiveStellar.id).toBe('civilization.plate.stellar.archive_lattice.scan');
    expect(livingGalaxy.id).toBe('civilization.plate.galaxy.living_arcology.cinematic');
    expect(containmentGalaxy.id).toBe('civilization.plate.galaxy.containment_sentinel.scan');
    expect(archiveGalaxy.id).toBe('civilization.plate.galaxy.archive_lattice.scan');
    expect(archiveSurface.id).toBe(genericSurface.id);
    expect(archiveSurface.src).toBe(genericSurface.src);
    expect(archiveOrbit.id).toBe('civilization.plate.orbit.cinematic');
  });

  it('provides stable procedural slots for archetypes, Blueprints, and artifact treatments', () => {
    expect(getCivilizationArchetypeArtSlot('forge_spine', 'surface')).toMatchObject({
      id: 'civilization.archetype.forge_spine.surface',
      layer: 'archetype',
      resolution: 'procedural',
    });
    expect(getCivilizationBlueprintArtSlot('bp_antimatter_detonator')).toMatchObject({
      id: 'civilization.blueprint.bp_antimatter_detonator',
      layer: 'blueprint',
      resolution: 'procedural',
    });
    expect(getCivilizationArtifactTreatmentArtSlot('mantlelift_driver')).toMatchObject({
      id: 'civilization.artifact-treatment.mantlelift_driver',
      layer: 'artifact-treatment',
      resolution: 'procedural',
    });
  });

  it('reserves planned chronicle slots without live render cost', () => {
    expect(getCivilizationChronicleArtSlot('Chronicle Outer Vault Access')).toMatchObject({
      id: 'civilization.chronicle.chronicle_outer_vault_access',
      layer: 'chronicle',
      resolution: 'planned',
    });

    expect(getCivilizationSiteArtSlot({
      id: 'chronicle:outer_vault_access',
      kind: 'chronicle',
      scaleBand: 'planetary',
      trait: 'archive',
      chronicleId: 'outer_vault_access',
      representationMode: 'chronicle_record',
      sourceQuality: 'authored',
      affinity: 'radiance',
      consequenceLabel: 'Chronicle Thread',
      visualCue: 'archive signals',
      anchor: { x: 50, y: 50 },
      priority: 680,
      title: 'Outer Vault Access',
      summary: 'Recovered story context.',
      visibleAs: 'a restored archive signal',
      laneLabel: 'Recovered story thread',
      relatedArtifactIds: [],
    } satisfies CivilizationDeploymentSite)).toMatchObject({
      id: 'civilization.chronicle.outer_vault_access',
      layer: 'chronicle',
      resolution: 'planned',
    });
  });

  it('lists unique replaceable slots for future art packs', () => {
    const slots = listCivilizationArtSlots();
    const ids = slots.map((slot) => slot.id);

    expect(ids).toContain('civilization.plate.orbit.cinematic');
    expect(ids).toContain('civilization.plate.orbit.living_arcology.scan');
    expect(ids).toContain('civilization.plate.orbit.forge_spine.scan');
    expect(ids).toContain('civilization.plate.orbit.route_network.scan');
    expect(ids).toContain('civilization.plate.orbit.containment_sentinel.scan');
    expect(ids).toContain('civilization.plate.orbit.accord_beacon.scan');
    expect(ids).toContain('civilization.plate.surface.living_arcology.scan');
    expect(ids).toContain('civilization.plate.surface.forge_spine.scan');
    expect(ids).toContain('civilization.plate.surface.route_network.scan');
    expect(ids).toContain('civilization.plate.surface.containment_sentinel.scan');
    expect(ids).toContain('civilization.plate.stellar.living_arcology.scan');
    expect(ids).toContain('civilization.plate.stellar.forge_spine.scan');
    expect(ids).toContain('civilization.plate.stellar.route_network.scan');
    expect(ids).toContain('civilization.plate.stellar.containment_sentinel.scan');
    expect(ids).toContain('civilization.plate.stellar.archive_lattice.scan');
    expect(ids).toContain('civilization.plate.galaxy.living_arcology.scan');
    expect(ids).toContain('civilization.plate.galaxy.forge_spine.scan');
    expect(ids).toContain('civilization.plate.galaxy.route_network.scan');
    expect(ids).toContain('civilization.plate.galaxy.containment_sentinel.scan');
    expect(ids).toContain('civilization.plate.galaxy.accord_beacon.scan');
    expect(ids).toContain('civilization.plate.galaxy.archive_lattice.scan');
    expect(ids).toContain('civilization.archetype.living_arcology.orbit');
    expect(ids).toContain('civilization.blueprint.bp_mantle_to_orbit_foundry');
    expect(ids).toContain('civilization.artifact-treatment.horizon_extractor');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
