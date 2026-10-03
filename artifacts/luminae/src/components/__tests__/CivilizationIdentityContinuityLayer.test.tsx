import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CivilizationDistrictInstance,
  CivilizationDyadId,
  CivilizationIdentityLayer,
} from '@workspace/game-types';
import { CivilizationIdentityContinuityLayer } from '@/components/CivilizationIdentityContinuityLayer';
import { getCivilizationDistrictPresentation } from '@/lib/civilizationDistrictPresentation';
import * as civilianArtRegistry from '@/lib/civilizationCivilianArtRegistry';
import type { CivilizationSurfaceDistrictParcel } from '@/lib/civilizationSurfaceDistrictPlan';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  createInitialCivilizationState,
  reconcileCivilizationDerivedState,
} from '@workspace/game-types';
import { buildCivilizationDeploymentSites } from '@/lib/civilizationDeploymentSites';
import { getCivilizationSaturatedPreviewIds } from '@/lib/civilizationArtifactProof';
import type {
  CivilizationCityDevelopmentStage,
  CivilizationComplexityStage,
  CivilizationSceneKind,
  CivilizationSceneProgress,
  CivilizationVisualIdentity,
} from '@/lib/civilizationVisualState';

const SCENES: CivilizationSceneKind[] = ['surface', 'orbit', 'stellar', 'galaxy'];

const LAYER_BY_SCENE: Record<CivilizationSceneKind, CivilizationIdentityLayer> = {
  surface: 'city',
  orbit: 'planet',
  stellar: 'system',
  galaxy: 'galaxy',
};

function identity(
  scene: CivilizationSceneKind,
  dyad: CivilizationDyadId | null,
): CivilizationVisualIdentity {
  return {
    layer: LAYER_BY_SCENE[scene],
    status: dyad ? 'committed' : 'plain',
    form: dyad ? 'dyad' : 'unformed',
    key: `${scene}:${dyad ?? 'plain'}`,
    label: dyad ? `${dyad} civilization` : 'Unformed Civilization',
    morphologyId: dyad ?? 'unformed',
    dyad,
    primaryAffinity: dyad ? 'flare' : null,
    secondaryAffinity: dyad ? 'verdance' : null,
    thirdAffinity: null,
    primaryTone: '#f26a4f',
    secondaryTone: '#4bc979',
    thirdTone: null,
    plateArchetype: dyad ? 'living_arcology' : null,
    seed: 1,
  };
}

function identities(overrides: Partial<Record<CivilizationSceneKind, CivilizationDyadId>> = {}) {
  return Object.fromEntries(SCENES.map((scene) => (
    [scene, identity(scene, overrides[scene] ?? null)]
  ))) as Record<CivilizationSceneKind, CivilizationVisualIdentity>;
}

function formingIdentity(scene: CivilizationSceneKind): CivilizationVisualIdentity {
  return {
    ...identity(scene, null),
    status: 'forming',
    form: 'plural',
    label: 'Forming Civilization',
  };
}

function progress(
  stage: CivilizationComplexityStage,
  artifactCount = stage === 0 ? 0 : stage * 3,
  cityStageOverride?: CivilizationCityDevelopmentStage,
): CivilizationSceneProgress {
  const settlementPhase = artifactCount <= 0
    ? 'wilderness'
    : artifactCount === 1
      ? 'nucleus'
      : artifactCount < 7
        ? 'city'
        : 'metropolis';
  const cityDevelopmentStage: CivilizationCityDevelopmentStage = cityStageOverride ?? (artifactCount <= 0
    ? 0
    : artifactCount >= 8
      ? 4
      : artifactCount >= 5
        ? 3
        : artifactCount >= 2
          ? 2
          : 1);
  const cityDevelopmentLabel = [
    'Non-Artifact Landscape',
    'First Civic Nucleus',
    'Young City',
    'Expanding City',
    'Established City',
    'Planetary Metropolis',
    'Stellar Conversion',
    'Stellar Metropolis',
    'Galactic Conversion',
    'Galactic Metropolis',
  ][cityDevelopmentStage] as CivilizationSceneProgress['cityDevelopmentLabel'];
  return {
    stage,
    label: ['Foundation', 'Established', 'Integrated', 'Ascendant'][stage] as CivilizationSceneProgress['label'],
    score: stage * 10,
    artifactCount,
    settlementPhase,
    cityDevelopmentStage,
    cityDevelopmentLabel,
    unlocked: true,
    reach: 'operational',
  };
}

describe('CivilizationIdentityContinuityLayer', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('leaves terminal Chrysalis construction inside its integrated city plate', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'chrysalis' })}
        progress={progress(3, 40, 9)}
        maturity="galactic"
        bakedIntoPlate
      />,
    );

    expect(screen.getByTestId('civilization-identity-continuity'))
      .toHaveAttribute('data-identity-rendering', 'baked-terminal-plate');
    expect(screen.queryByTestId('civilization-active-identity-infrastructure')).toBeNull();
    expect(document.querySelectorAll('[data-city-skyline-district]')).toHaveLength(0);
  });

  it('builds a readable neutral nucleus above the persistent environment plate', () => {
    const sceneIdentities = identities();
    sceneIdentities.surface = formingIdentity('surface');
    render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={sceneIdentities}
        progress={progress(1, 1)}
        maturity="planetary"
        settlementAnchors={[{ x: 31, y: 76 }]}
      />,
    );

    const layer = screen.getByTestId('civilization-identity-continuity');
    expect(layer).toHaveAttribute('data-continuity-mode', 'physical-nesting');
    expect(layer).not.toHaveAttribute('data-history-layer');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-visual-role', 'physical-settlement-growth');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-style', 'neutral-forming');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-phase', 'nucleus');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-count', '3');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-anchor-source', 'artifact-cluster');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-city-fabric-source', 'physical-district-layer');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-composition-model', 'authored-modular-kit');
    expect(document.querySelectorAll('[data-settlement-structure]')).toHaveLength(3);
    expect(document.querySelector('[data-city-settlement-footprint="built-environment"]'))
      .not.toBeNull();
  });

  it('extends two-Artifact neutral growth into a modest city before Dyad commitment', () => {
    const sceneIdentities = identities();
    sceneIdentities.surface = formingIdentity('surface');
    render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={sceneIdentities}
        progress={progress(1, 2)}
        maturity="planetary"
        environmentVariantId="terminator_reach"
        settlementAnchors={[{ x: 38, y: 73 }, { x: 62, y: 73 }]}
      />,
    );

    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-style', 'neutral-forming');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-phase', 'city');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-count', '5');
    expect(document.querySelectorAll('[data-settlement-structure]')).toHaveLength(5);
    expect(document.querySelector('[data-city-settlement-footprint="built-environment"]'))
      .not.toBeNull();
  });

  it.each([0, 1])('renders occupied neutral instance %s without a legacy cluster or occupancy summary', (instance) => {
    const sceneIdentities = identities();
    sceneIdentities.surface = formingIdentity('surface');
    render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={sceneIdentities}
        progress={progress(1, 1)}
        maturity="planetary"
        districtInstances={[{
          districtId: `district:industrial_district:${instance}`,
          family: 'industrial_district',
          instance,
          residentArtifactIds: ['t1r01'],
          residentAffinities: ['flare'],
          foundingAffinities: ['flare'],
          permanentDyad: null,
          softCapacity: 2,
          hardCapacity: 3,
          influence: 0,
          establishedTurnCount: 1,
          committedTurnCount: null,
          historyEvidence: 'recorded',
        }]}
      />,
    );

    const district = document.querySelector(`[data-district-id="district:industrial_district:${instance}"]`);
    expect(district).toHaveAttribute('data-district-presentation', 'neutral-residents');
    expect(district).toHaveAttribute('data-district-dyad', 'neutral');
    expect(document.querySelector('.civ-settlement-structure')).toBeNull();
    expect(document.querySelector('[data-city-settlement-footprint]')).toBeNull();
  });

  it('colonizes a forming Galaxy without inventing a Dyad identity', () => {
    const sceneIdentities = identities({ stellar: 'lineage' });
    sceneIdentities.galaxy = formingIdentity('galaxy');

    render(
      <CivilizationIdentityContinuityLayer
        scene="galaxy"
        identities={sceneIdentities}
        progress={progress(3, 9, 9)}
        maturity="galactic"
      />,
    );

    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-style', 'neutral-forming');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-count', '3');
    expect(document.querySelectorAll('[data-galactic-region-scale="stellar-neighborhood"]'))
      .toHaveLength(3);
    expect(document.querySelectorAll('[data-colonized-system="true"]')).toHaveLength(4);
    expect(screen.getByTestId('civilization-nested-system'))
      .toHaveAttribute('data-child-dyad', 'lineage');
  });

  it('turns an Ascendant surface into layered urban fabric', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'bloom' })}
        progress={progress(3, 9, 9)}
        maturity="galactic"
      />,
    );

    const infrastructure = screen.getByTestId('civilization-active-identity-infrastructure');
    expect(infrastructure).toHaveAttribute('data-settlement-count', '10');
    expect(infrastructure).toHaveAttribute('data-fabric-composition', 'incandescent-branching');
    expect(infrastructure).toHaveAttribute('data-settlement-anchor-source', 'environment-fabric-sockets');
    expect(document.querySelectorAll('[data-city-skyline-district]')).toHaveLength(10);
    expect(Array.from(document.querySelectorAll('[data-settlement-structure]')).every((structure) => (
      Boolean(structure.getAttribute('data-city-fabric-position'))
    ))).toBe(true);
  });

  it('changes the ordinary built fabric with the committed Dyad', () => {
    const { rerender } = render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'chrysalis' })}
        progress={progress(2)}
        maturity="stellar"
        environmentVariantId="terminator_reach"
      />,
    );

    const chrysalisInfrastructure = screen.getByTestId('civilization-active-identity-infrastructure');
    const chrysalisRoles = Array.from(document.querySelectorAll('[data-settlement-structure]'))
      .map((structure) => structure.getAttribute('data-infrastructure-role'));
    const chrysalisFabric = Array.from(document.querySelectorAll('[data-city-skyline-district]'))
      .map((district) => district.getAttribute('data-city-fabric-position'));
    expect(chrysalisInfrastructure).toHaveAttribute('data-fabric-composition', 'armored-metamorphosis');
    expect(chrysalisInfrastructure).toHaveAttribute('data-city-fabric-layout', 'chrysalis');
    expect(chrysalisRoles[0]).toBe('civic_core');

    rerender(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'bloom' })}
        progress={progress(2)}
        maturity="stellar"
        environmentVariantId="terminator_reach"
      />,
    );

    const bloomInfrastructure = screen.getByTestId('civilization-active-identity-infrastructure');
    const bloomRoles = Array.from(document.querySelectorAll('[data-settlement-structure]'))
      .map((structure) => structure.getAttribute('data-infrastructure-role'));
    const bloomFabric = Array.from(document.querySelectorAll('[data-city-skyline-district]'))
      .map((district) => district.getAttribute('data-city-fabric-position'));
    expect(bloomInfrastructure).toHaveAttribute('data-fabric-composition', 'incandescent-branching');
    expect(bloomInfrastructure).toHaveAttribute('data-city-fabric-layout', 'bloom');
    expect(bloomRoles[0]).toBe('wilderness_margin');
    expect(bloomRoles).not.toEqual(chrysalisRoles);
    expect(bloomFabric).not.toEqual(chrysalisFabric);
  });

  it('keeps the fitted primary districts stable as development and technology reach the complete city', () => {
    const { rerender } = render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'chrysalis' })}
        progress={progress(1, 2, 1)}
        maturity="planetary"
        environmentVariantId="aurora_basin"
      />,
    );
    const readFittedParcels = () => Array.from(document.querySelectorAll<HTMLElement>('[data-city-district-parcel]'))
      .map((element) => {
        const id = element.dataset.cityDistrictParcel!;
        expect(element.style.getPropertyValue('--city-fabric-width')).toBe(`${getCivilizationDistrictPresentation(id)!.width}%`);
        expect(element.style.getPropertyValue('--city-fabric-mobile-width')).toBe(`${getCivilizationDistrictPresentation(id, true)!.width}%`);
        expect(element.style.getPropertyValue('--city-fabric-scale')).toBe('1');
        expect(element.style.getPropertyValue('--city-fabric-mobile-scale')).toBe('1');
        expect(element.style.aspectRatio).toBe('1 / 1');
        return { id, element, style: element.getAttribute('style') };
      });
    const primaryParcels = readFittedParcels();
    expect(primaryParcels.map(({ id }) => id)).toEqual(['civic-central', 'industry-west', 'habitat-east']);

    rerender(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'chrysalis' })}
        progress={progress(3, 40, 9)}
        maturity="galactic"
        environmentVariantId="aurora_basin"
      />,
    );

    const completeCity = readFittedParcels();
    expect(completeCity).toHaveLength(30);
    for (const primary of primaryParcels) {
      const mature = completeCity.find(({ id }) => id === primary.id)!;
      expect(mature.element).toBe(primary.element);
      expect(mature.style).toBe(primary.style);
    }
  });

  it('adds short entrance aprons only to the three Chrysalis reference districts without moving their architecture', () => {
    const districts: CivilizationDistrictInstance[] = ([
      ['civic_core', ['t1r04', 't1o08']],
      ['subsurface_works', ['t1o03', 't1r07']],
      ['transit_terminus', ['t1r08', 't1o09']],
    ] as const).map(([family, residents]) => ({
      districtId: `district:${family}:0`, family, instance: 0,
      residentArtifactIds: [...residents], residentAffinities: ['flare', 'abyss'],
      foundingAffinities: ['flare', 'abyss'], permanentDyad: 'chrysalis',
      softCapacity: 2, hardCapacity: 3, influence: 2,
      establishedTurnCount: 1, committedTurnCount: 2, historyEvidence: 'recorded',
    }));
    type Props = React.ComponentProps<typeof CivilizationIdentityContinuityLayer>;
    const city = (overrides: Partial<Props> = {}) => (
      <CivilizationIdentityContinuityLayer
        scene="surface" identities={identities({ surface: 'chrysalis' })}
        progress={progress(3, 40, 9)} maturity="galactic"
        environmentVariantId="aurora_basin" districtInstances={districts}
        {...overrides}
      />
    );
    const geometryAndArt = () => Array.from(document.querySelectorAll<HTMLElement>('[data-city-district-parcel]'))
      .map((parcel) => ({
        id: parcel.getAttribute('data-city-district-parcel'),
        occupied: parcel.hasAttribute('data-district-id'),
        desktop: parcel.getAttribute('data-city-fabric-position'),
        mobile: parcel.getAttribute('data-city-fabric-mobile-position'),
        style: parcel.getAttribute('style')?.replace(/filter:[^;]+;/, ''),
        lighting: parcel.style.filter,
        art: parcel.querySelector('img')?.getAttribute('src'),
      }));
    const { rerender } = render(city({ environmentVariantId: 'oceanic_scar' }));
    const before = geometryAndArt();
    expect(document.querySelectorAll('[data-city-district-entrance]')).toHaveLength(0);

    rerender(city());

    expect(geometryAndArt().map(({ art: _art, lighting: _lighting, ...geometry }) => geometry))
      .toEqual(before.map(({ art: _art, lighting: _lighting, ...geometry }) => geometry));
    expect(geometryAndArt().filter(({ occupied }) => occupied)).toEqual(before.filter(({ occupied }) => occupied));
    const entrances = Array.from(document.querySelectorAll('[data-city-district-entrance]'));
    expect(entrances.map((entrance) => [
      entrance.closest('[data-city-district-parcel]')?.getAttribute('data-city-district-parcel'),
      entrance.getAttribute('data-city-district-entrance'),
    ])).toEqual([
      ['civic-central', 'civic'],
      ['transit-west-gate', 'transit'],
      ['underworks-southwest', 'forge'],
    ]);
    expect(entrances.every((entrance) => entrance.getAttribute('viewBox') === '0 0 100 100')).toBe(true);

    const outsideScope: Partial<Props>[] = [
      { environmentVariantId: 'oceanic_scar' },
      { progress: progress(3, 40, 8) },
      { identities: identities({ surface: 'echo' }) },
      { districtInstances: districts.map((district) => ({
        ...district, permanentDyad: 'echo',
        residentAffinities: ['continuum', 'abyss'], foundingAffinities: ['continuum', 'abyss'],
      })) },
      { districtInstances: districts.map((district) => ({
        ...district, permanentDyad: null, residentArtifactIds: district.residentArtifactIds.slice(0, 1),
        residentAffinities: ['abyss'], foundingAffinities: ['abyss'], influence: 0,
        committedTurnCount: null,
      })) },
    ];
    for (const overrides of outsideScope) {
      rerender(city(overrides));
      expect(document.querySelectorAll('[data-city-district-entrance]')).toHaveLength(0);
    }
  });

  it('selects exclusive civilian occupants for empty reference parcels while preserving resident districts and every address', () => {
    const civilianArt = vi.spyOn(civilianArtRegistry, 'getCivilizationCivilianParcelArt').mockReturnValue(null);
    let state = createInitialCivilizationState();
    const ids = getCivilizationSaturatedPreviewIds('chrysalis', true)
      .filter((id) => ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id].nativeCameraScale === 'surface');
    ids.forEach((artifactId, index) => {
      state.artifacts[artifactId] = {
        artifactId, firstMasteredTurnCount: index + 1, masteryCount: 1,
        implementationState: 'operational', implementationStateChangedTurnCount: index + 1,
        implementationChangeSource: null, historyEvidence: 'recorded',
      };
      state = reconcileCivilizationDerivedState(state, [], index + 1, {}, { commitPresentation: true });
    });
    const districts = Object.values(state.districtIdentity.districts);
    const residentSites = buildCivilizationDeploymentSites({
      forgedArtifacts: ids.map((id) => ({ ...ARTIFACT_CATALOG.find((card) => card.id === id)!, name: id, flavor: '' })),
      tier: 3,
    });
    type Props = React.ComponentProps<typeof CivilizationIdentityContinuityLayer>;
    const city = (overrides: Partial<Props> = {}) => (
      <CivilizationIdentityContinuityLayer
        scene="surface" identities={identities({ surface: 'chrysalis' })}
        progress={progress(3, 40, 9)} maturity="galactic"
        environmentVariantId="aurora_basin" districtInstances={districts} residentSites={residentSites}
        {...overrides}
      />
    );
    const parcels = () => Array.from(document.querySelectorAll<HTMLElement>('[data-city-district-parcel]'));
    const geometry = () => parcels().map((element) => ({
      id: element.dataset.cityDistrictParcel,
      style: element.getAttribute('style')?.replace(/filter:[^;]+;/, ''),
    }));
    const occupiedArtwork = () => parcels().filter((element) => element.dataset.districtId).map((element) => ({
      id: element.dataset.districtId, dyad: element.dataset.districtDyad,
      count: element.dataset.districtArtifactCount,
      lighting: element.style.filter,
      art: element.querySelector('[data-city-district-terrain-occlusion] img')!.outerHTML,
      artBounds: element.querySelector('[data-city-district-terrain-occlusion]')!.getAttribute('style'),
      residents: Array.from(element.querySelectorAll('[data-testid="civilization-district-resident"]')).map((resident) => resident.outerHTML),
    }));
    const { rerender } = render(city({ environmentVariantId: 'oceanic_scar' }));
    const beforeGeometry = geometry(), beforeOccupied = occupiedArtwork();
    expect(parcels()).toHaveLength(30);
    expect(beforeOccupied).toHaveLength(17);
    expect(beforeOccupied.filter(({ dyad }) => dyad === 'neutral')).toHaveLength(4);

    rerender(city());

    expect(geometry()).toEqual(beforeGeometry);
    expect(occupiedArtwork()).toEqual(beforeOccupied);
    const reserves = parcels().filter((element) => element.dataset.districtPresentation === 'reserve-foundation');
    expect(reserves).toHaveLength(13);
    expect(parcels().filter((element) => element.dataset.slotOccupant === 'specialist')).toHaveLength(17);
    for (const reserve of reserves) {
      expect(reserve).toHaveAttribute('data-slot-occupant', 'civilian');
      expect(reserve).toHaveAttribute('data-civilian-theme', 'chrysalis');
      expect(reserve).toHaveAttribute('data-civilian-tier', 'galactic');
      expect(reserve).not.toHaveAttribute('data-district-id');
      expect(reserve).not.toHaveAttribute('data-district-dyad');
      expect(reserve).toHaveAttribute('data-district-artifact-count', '0');
      expect(reserve.querySelector('img')).toBeNull();
      expect(reserve.querySelector('[data-city-district-support]')).not.toBeNull();
      expect(reserve.querySelector('[data-testid="civilization-district-resident"]')).toBeNull();
    }
    for (const id of ['civic-northwest', 'habitat-far-east', 'underworks-central-cut']) {
      expect(reserves.some((element) => element.dataset.cityDistrictParcel === id)).toBe(true);
    }
    const emptyHarbor = reserves.find((element) => element.dataset.cityDistrictParcel === 'coastal-breakwater')!;
    const quay = emptyHarbor.querySelector('[data-city-district-support="shore-pylons"]')!;
    expect(quay).toHaveAttribute('data-shore-form', 'bearing-deck');
    expect(quay).toHaveAttribute('viewBox', '0 0 100 135');
    expect(quay.querySelector('[data-shore-deck="bearing"]')).toHaveAttribute('fill', '#4f5d5d');
    expect(quay.querySelector('[data-shore-connection="approach"]')).not.toBeNull();
    expect(document.querySelector('[data-city-district-parcel="coastal-east"] [data-city-district-support]'))
      .toHaveAttribute('data-shore-form', 'open-spillway');
    expect(screen.getAllByTestId('civilization-district-resident')).toHaveLength(13);

    civilianArt.mockImplementation((_theme, _maturity, variant) => ({
      src: `/civilian/${variant}.webp`, anchor: { x: 50, y: 94 }, scale: 1, aspectRatio: 1, groundLine: 0.94,
    }));
    rerender(city());

    expect(geometry()).toEqual(beforeGeometry);
    expect(occupiedArtwork()).toEqual(beforeOccupied);
    const civilians = parcels().filter((element) => element.dataset.slotOccupant === 'civilian');
    expect(civilians).toHaveLength(13);
    for (const civilian of civilians) {
      expect(civilian).toHaveAttribute('data-district-presentation', 'civilian-filler');
      expect(civilian).not.toHaveAttribute('data-district-id');
      expect(civilian).not.toHaveAttribute('data-district-dyad');
      expect(civilian).toHaveAttribute('data-district-artifact-count', '0');
      expect(civilian.querySelectorAll('img')).toHaveLength(1);
      expect(civilian.querySelector('img')).toHaveAttribute('src', `/civilian/${civilian.dataset.civilianVariant}.webp`);
      expect(civilian.querySelector('[data-city-district-support]')).not.toBeNull();
      expect(civilian.querySelector('[data-testid="civilization-district-resident"]')).toBeNull();
      expect(civilian.style.filter).toBe('saturate(0.98) contrast(1.04) brightness(0.98)');
    }
    expect(document.querySelector('[data-district-presentation="generic-filler"]')).toBeNull();
    expect(document.querySelector('[data-district-presentation="reserve-foundation"]')).toBeNull();
    expect(civilianArt.mock.calls.every(([theme, maturity]) => theme === 'chrysalis' && maturity === 'galactic')).toBe(true);
    expect(screen.getAllByTestId('civilization-district-resident')).toHaveLength(13);

    const outsideScope: Partial<Props>[] = [
      { environmentVariantId: 'oceanic_scar' },
      { progress: progress(3, 40, 8) },
      { identities: identities({ surface: 'echo' }) },
      { districtInstances: [] },
    ];
    for (const overrides of outsideScope) {
      rerender(city(overrides));
      expect(document.querySelector('[data-slot-occupant]')).toBeNull();
      expect(document.querySelector('[data-district-presentation="reserve-foundation"]')).toBeNull();
      expect(parcels().every((element) => element.querySelector('img'))).toBe(true);
    }
  });

  it('crops each real civilian atlas cell before aligning its foundation to the parcel ground line', () => {
    const district: CivilizationDistrictInstance = {
      districtId: 'district:civic_core:0', family: 'civic_core', instance: 0,
      residentArtifactIds: ['t1r08'], residentAffinities: ['flare'], foundingAffinities: ['flare'],
      permanentDyad: null, softCapacity: 2, hardCapacity: 3, influence: 0,
      establishedTurnCount: 1, committedTurnCount: null, historyEvidence: 'recorded',
    };
    render(<CivilizationIdentityContinuityLayer
      scene="surface" identities={identities({ surface: 'chrysalis' })}
      progress={progress(3, 40, 9)} maturity="galactic" environmentVariantId="aurora_basin"
      districtInstances={[district]}
    />);
    const civilians = Array.from(document.querySelectorAll<HTMLElement>('[data-slot-occupant="civilian"]'));
    expect(civilians).toHaveLength(29);
    expect(new Set(civilians.map((parcel) => parcel.dataset.civilianVariant)).size).toBe(5);
    for (const parcel of civilians) {
      const art = civilianArtRegistry.getCivilizationCivilianParcelArt(
        'chrysalis', 'galactic', parcel.dataset.civilianVariant as CivilizationSurfaceDistrictParcel['genericFillerVariant'],
      )!;
      const cell = parcel.querySelector<HTMLElement>('[data-civilian-cell-crop]')!;
      const frame = cell.parentElement!;
      const groundOffset = Number(cell.dataset.civilianGroundOffset);
      expect(Number(cell.dataset.civilianGroundLine) + groundOffset / 100).toBeCloseTo(0.94, 7);
      expect(cell).toHaveClass('overflow-hidden');
      expect(cell.style.transform).toBe(`translateY(${groundOffset}%)`);
      expect(frame).toHaveClass('overflow-hidden');
      expect(frame.style.clipPath).toBe('');
      expect(cell.querySelector('img')).toHaveAttribute('src', art.src);
      expect(cell.querySelector('img')).toHaveStyle({
        width: '300%', height: '200%',
        left: `${-art.atlas!.column * 100}%`, top: `${-art.atlas!.row * 100}%`,
      });
      expect(parcel.style.filter).not.toContain('drop-shadow');
    }
    expect(document.querySelector('[data-slot-occupant="specialist"] [data-civilian-cell-crop]')).toBeNull();
    expect(document.querySelector('[data-slot-occupant="specialist"] img')?.getAttribute('src')).toContain('neutral/surface-settlement-atlas');
  });

  it('supports the two desktop road-crossing parcels with open decks inside their existing frames', () => {
    const district: CivilizationDistrictInstance = {
      districtId: 'district:transit_terminus:0', family: 'transit_terminus', instance: 0,
      residentArtifactIds: ['t1o09', 't1r01'], residentAffinities: ['abyss', 'flare'],
      foundingAffinities: ['abyss', 'flare'], permanentDyad: 'chrysalis',
      softCapacity: 2, hardCapacity: 3, influence: 2,
      establishedTurnCount: 1, committedTurnCount: 2, historyEvidence: 'recorded',
    };
    type Props = React.ComponentProps<typeof CivilizationIdentityContinuityLayer>;
    const city = (overrides: Partial<Props> = {}) => <CivilizationIdentityContinuityLayer
      scene="surface" identities={identities({ surface: 'chrysalis' })}
      progress={progress(3, 40, 9)} maturity="galactic" environmentVariantId="aurora_basin"
      districtInstances={[district]} {...overrides}
    />;
    const { rerender } = render(city());
    const deck = document.querySelector<SVGElement>('[data-city-district-support="road-spanning-deck"]')!;
    const parcel = deck.closest<HTMLElement>('[data-city-district-parcel]')!;
    const parcelStyle = parcel.getAttribute('style');
    const artwork = parcel.querySelector('img')!.outerHTML;
    expect(document.querySelectorAll('[data-city-district-support="road-spanning-deck"]')).toHaveLength(2);
    expect(parcel).toHaveAttribute('data-city-district-parcel', 'transit-west-gate');
    expect(deck).toHaveAttribute('viewBox', '0 0 100 100');
    expect(deck).toHaveAttribute('data-road-deck-portal', 'open');
    expect(deck.querySelectorAll('[data-road-deck-abutment]')).toHaveLength(2);
    expect(deck.querySelector('[data-road-deck-floor]')).toHaveAttribute('fill', '#494b49');
    for (const path of deck.querySelectorAll('path')) {
      expect((path.getAttribute('d')!.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
        .every((coordinate) => coordinate >= 0 && coordinate <= 100)).toBe(true);
    }
    const mobileFoundation = parcel.querySelector<HTMLElement>('span.civ-city-road-deck-mobile-foundation')!;
    const apron = parcel.querySelector<SVGElement>('[data-city-district-entrance="transit"]')!;
    expect(getComputedStyle(deck).display).toBe('block');
    expect(getComputedStyle(mobileFoundation).display).toBe('none');
    expect(getComputedStyle(apron).display).toBe('none');
    const archive = document.querySelector<HTMLElement>('[data-city-district-parcel="archive-east-court"]')!;
    const archiveDeck = archive.querySelector<SVGElement>('[data-city-district-support="road-spanning-deck"]')!;
    const archiveFoundation = archive.querySelector<HTMLElement>('span.civ-city-road-deck-mobile-foundation')!;
    const archiveStyle = archive.getAttribute('style');
    const archiveArtwork = archive.querySelector('img')!.outerHTML;
    expect(archive).toHaveAttribute('data-slot-occupant', 'civilian');
    expect(archiveDeck).toHaveAttribute('viewBox', '0 0 100 100');
    expect(archiveDeck).toHaveAttribute('data-road-deck-portal', 'open');
    expect(getComputedStyle(archiveDeck).display).toBe('block');
    expect(getComputedStyle(archiveFoundation).display).toBe('none');

    rerender(city({ compact: true }));
    expect(getComputedStyle(deck).display).toBe('none');
    expect(getComputedStyle(mobileFoundation).display).toBe('block');
    expect(getComputedStyle(apron).display).toBe('block');
    expect(parcel.getAttribute('style')).toBe(parcelStyle);
    expect(parcel.querySelector('img')!.outerHTML).toBe(artwork);
    expect(getComputedStyle(archiveDeck).display).toBe('none');
    expect(getComputedStyle(archiveFoundation).display).toBe('block');
    expect(archive.getAttribute('style')).toBe(archiveStyle);
    expect(archive.querySelector('img')!.outerHTML).toBe(archiveArtwork);

    rerender(city({ districtInstances: [district, {
      ...district, districtId: 'district:archive_quarter:2', family: 'archive_quarter', instance: 2,
      residentArtifactIds: ['t1s06', 't1p08'], permanentDyad: 'orbit',
      residentAffinities: ['continuum', 'radiance'], foundingAffinities: ['continuum', 'radiance'],
    }] }));
    expect(archive).toHaveAttribute('data-slot-occupant', 'specialist');
    expect(archive.querySelector('[data-city-district-support="road-spanning-deck"]')).not.toBeNull();

    for (const overrides of [
      { environmentVariantId: 'oceanic_scar' },
      { progress: progress(3, 40, 8) },
      { identities: identities({ surface: 'echo' }) },
      { districtInstances: [] },
    ] satisfies Partial<Props>[]) {
      rerender(city(overrides));
      expect(document.querySelector('[data-city-district-support="road-spanning-deck"]')).toBeNull();
      expect(document.querySelector('[data-city-district-parcel="transit-west-gate"] [data-city-district-support]')).not.toBeNull();
    }
  });

  it('changes surrounding districts to Echo without moving parcels or replacing resident architecture', () => {
    const districts: CivilizationDistrictInstance[] = [{
      districtId: 'district:industrial_district:0',
      family: 'industrial_district',
      instance: 0,
      residentArtifactIds: ['t1r01', 't1o05'],
      residentAffinities: ['flare', 'abyss'],
      foundingAffinities: ['flare', 'abyss'],
      permanentDyad: 'chrysalis',
      softCapacity: 2,
      hardCapacity: 3,
      influence: 2,
      establishedTurnCount: 1,
      committedTurnCount: 2,
      historyEvidence: 'recorded',
    }, {
      districtId: 'district:archive_quarter:0',
      family: 'archive_quarter',
      instance: 0,
      residentArtifactIds: ['t1s05'],
      residentAffinities: ['continuum'],
      foundingAffinities: ['continuum'],
      permanentDyad: null,
      softCapacity: 2,
      hardCapacity: 3,
      influence: 0,
      establishedTurnCount: 5,
      committedTurnCount: null,
      historyEvidence: 'recorded',
    }];
    const renderDirection = (dyad: CivilizationDyadId) => (
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: dyad })}
        progress={progress(3, 9, 9)}
        maturity="galactic"
        environmentVariantId="aurora_basin"
        districtInstances={districts}
        residentSites={buildCivilizationDeploymentSites({
          forgedArtifacts: ARTIFACT_CATALOG.map((card) => ({ ...card, name: card.id, flavor: '' })),
          tier: 3,
        })}
        districtOccupancyCounts={{ industrial_district: 2, archive_quarter: 1 }}
      />
    );
    const { rerender } = render(renderDirection('chrysalis'));
    const parcelGeometry = () => Array.from(document.querySelectorAll('[data-city-district-parcel]'))
      .map((parcel) => ({
        id: parcel.getAttribute('data-city-district-parcel'),
        desktop: parcel.getAttribute('data-city-fabric-position'),
        mobile: parcel.getAttribute('data-city-fabric-mobile-position'),
        support: parcel.getAttribute('data-required-support'),
        style: parcel.getAttribute('style'),
      }));
    const residents = () => Array.from(document.querySelectorAll('[data-district-id]'))
      .map((district) => ({
        id: district.getAttribute('data-district-id'),
        art: district.querySelector('img')?.getAttribute('src'),
      }));
    const beforeGeometry = parcelGeometry();
    const beforeResidents = residents();
    const residentBays = screen.getAllByTestId('civilization-district-resident').map((bay) => bay.outerHTML);
    const fillerArt = document.querySelector('[data-district-presentation="generic-filler"] img')
      ?.getAttribute('src');

    rerender(renderDirection('echo'));

    // Resident style (including scale and lighting) is invariant; the generic
    // districts change their dyad lighting as well as their actual artwork.
    expect(parcelGeometry().map(({ style: _style, ...geometry }) => geometry))
      .toEqual(beforeGeometry.map(({ style: _style, ...geometry }) => geometry));
    expect(parcelGeometry().filter(({ id }) => id === 'industry-west' || id === 'archive-northwest'))
      .toEqual(beforeGeometry.filter(({ id }) => id === 'industry-west' || id === 'archive-northwest'));
    expect(residents()).toEqual(beforeResidents);
    expect(screen.getAllByTestId('civilization-district-resident').map((bay) => bay.outerHTML)).toEqual(residentBays);
    expect(document.querySelector('[data-district-presentation="generic-filler"] img')?.getAttribute('src'))
      .not.toBe(fillerArt);

    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-city-fabric-layout', 'echo');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-city-fabric-context', 'integrated-urban-fabric');
    expect(document.querySelector('[data-district-id="district:industrial_district:0"]'))
      .toHaveAttribute('data-district-dyad', 'chrysalis');
    expect(document.querySelector('[data-district-id="district:archive_quarter:0"]'))
      .toHaveAttribute('data-district-presentation', 'neutral-residents');
    expect(document.querySelector('[data-district-id="district:archive_quarter:0"]'))
      .toHaveAttribute('data-district-dyad', 'neutral');
    expect(document.querySelector('[data-district-presentation="generic-filler"]'))
      .toHaveAttribute('data-district-dyad', 'echo');
  });

  it.each([null, 'chrysalis', 'echo'] as const)(
    'preserves the complete waterfront base and structural support for a %s Coastal district',
    (dyad) => {
      const district: CivilizationDistrictInstance = {
        districtId: 'district:coastal_margin:0', family: 'coastal_margin', instance: 0,
        residentArtifactIds: dyad === 'chrysalis' ? ['t1o02', 't1r06', 't1r09']
          : dyad === 'echo' ? ['t1o02', 't1s09', 't1s01'] : ['t1o02'],
        residentAffinities: dyad ? ['abyss', dyad === 'chrysalis' ? 'flare' : 'continuum'] : ['abyss'],
        foundingAffinities: dyad ? ['abyss', dyad === 'chrysalis' ? 'flare' : 'continuum'] : ['abyss'],
        permanentDyad: dyad, softCapacity: 2, hardCapacity: 3,
        influence: dyad ? 3 : 0, establishedTurnCount: 1,
        committedTurnCount: dyad ? 2 : null, historyEvidence: 'recorded',
      };
      render(
        <CivilizationIdentityContinuityLayer
          scene="surface" identities={identities({ surface: 'echo' })}
          progress={progress(3, 40, 9)} maturity="galactic"
          environmentVariantId="aurora_basin" districtInstances={[district]}
        />,
      );
      const coastal = document.querySelector('[data-district-id="district:coastal_margin:0"]')!;
      expect(coastal).toHaveAttribute('data-district-dyad', dyad ?? 'neutral');
      expect(coastal).toHaveAttribute('data-district-artifact-count', dyad ? '3' : '1');
      // All harbor instances retain their own authored piles/spillways. The
      // former distance-terrain polygon cut them at 85–93% of image height.
      const harbors = document.querySelectorAll('[data-city-skyline-district="coastal_margin"]');
      expect(harbors).toHaveLength(3);
      for (const harbor of harbors) {
        const art = harbor.querySelector<HTMLElement>('[data-city-district-terrain-occlusion]')!;
        expect(art.style.clipPath).toBe('');
        expect(art).toHaveAttribute('data-city-district-terrain-occlusion', 'architecture');
        expect(harbor.querySelector('[data-shore-deck="bearing"]')).not.toBeNull();
        expect(harbor.querySelector('[data-shore-connection="approach"]')).not.toBeNull();
        // The breakwater needs longer driven piles than the two near-shore pads.
        expect(harbor.querySelector('svg[data-city-district-support]')).toHaveAttribute('viewBox',
          harbor.getAttribute('data-city-district-parcel') === 'coastal-breakwater' ? '0 0 100 135' : '0 0 100 110');
      }
      expect(document.querySelector<HTMLElement>(
        '[data-city-district-parcel="industry-west"] [data-city-district-terrain-occlusion]',
      )!.style.clipPath).toContain('polygon');
    },
  );

  it('resolves a complete authored district kit for every Dyad', () => {
    const dyads: CivilizationDyadId[] = [
      'vortex',
      'flux',
      'bloom',
      'chrysalis',
      'orbit',
      'canopy',
      'eclipse',
      'lineage',
      'echo',
      'spore',
    ];

    for (const dyad of dyads) {
      const { unmount } = render(
        <CivilizationIdentityContinuityLayer
          scene="surface"
          identities={identities({ surface: dyad })}
          progress={progress(3, 12, 9)}
          maturity="galactic"
          environmentVariantId="aurora_basin"
        />,
      );

      const infrastructure = screen.getByTestId('civilization-active-identity-infrastructure');
      const districts = Array.from(document.querySelectorAll('[data-city-skyline-district]'));
      expect(infrastructure).toHaveAttribute('data-city-fabric-layout', dyad);
      expect(infrastructure).toHaveAttribute('data-composition-model', 'authored-modular-kit');
      const expectedDistrictCount = dyad === 'chrysalis' ? 30 : 10;
      expect(infrastructure).toHaveAttribute('data-settlement-count', String(expectedDistrictCount));
      expect(districts).toHaveLength(expectedDistrictCount);
      expect(new Set(districts.map((district) => district.getAttribute('data-infrastructure-role'))).size)
        .toBe(10);
      expect(new Set(districts.map((district) => district.getAttribute('data-fabric-socket'))).size)
        .toBe(expectedDistrictCount);
      expect(districts.every((district) => (
        district.getAttribute('data-fabric-grounding') === (
          dyad === 'chrysalis' ? 'district-master-plan' : 'environment-authored'
        )
      ))).toBe(true);
      expect(districts.every((district) => district.querySelector('img'))).toBe(true);
      unmount();
    }
  });

  it('grounds one Dyad kit on the shared plan without changing its authored structures', () => {
    const { rerender } = render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'lineage' })}
        progress={progress(3, 12, 9)}
        maturity="galactic"
        environmentVariantId="terminator_reach"
      />,
    );

    const terminatorDistricts = Array.from(document.querySelectorAll('[data-city-skyline-district]'));
    const terminatorPositions = terminatorDistricts.map((district) => (
      district.getAttribute('data-city-fabric-position')
    ));
    const terminatorArtwork = terminatorDistricts.map((district) => (
      district.querySelector('img')?.getAttribute('src')
    ));
    expect(terminatorDistricts.every((district) => (
      district.getAttribute('data-structural-adaptation') === 'native-grounding'
    ))).toBe(true);

    rerender(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'lineage' })}
        progress={progress(3, 12, 9)}
        maturity="galactic"
        environmentVariantId="oceanic_scar"
      />,
    );

    const oceanicDistricts = Array.from(document.querySelectorAll('[data-city-skyline-district]'));
    expect(oceanicDistricts.map((district) => district.getAttribute('data-city-fabric-position')))
      .toEqual(terminatorPositions);
    expect(oceanicDistricts.map((district) => district.querySelector('img')?.getAttribute('src')))
      .toEqual(terminatorArtwork);
    expect(oceanicDistricts.every((district) => (
      district.getAttribute('data-structural-adaptation') === 'native-grounding'
    ))).toBe(true);
    expect(oceanicDistricts.every((district) => (
      district.getAttribute('data-fabric-grounding') === 'environment-authored'
    ))).toBe(true);
  });

  it('assembles mature Chrysalis landmarks within the authored urban fabric', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'chrysalis' })}
        progress={progress(3, 10, 5)}
        maturity="planetary"
        environmentVariantId="aurora_basin"
      />,
    );

    const infrastructure = screen.getByTestId('civilization-active-identity-infrastructure');
    expect(infrastructure).toHaveAttribute('data-city-fabric-source', 'physical-district-layer');
    expect(infrastructure).toHaveAttribute('data-city-fabric-context', 'integrated-urban-fabric');
    expect(infrastructure).toHaveAttribute('data-composition-model', 'authored-modular-kit');
    expect(infrastructure).toHaveAttribute('data-settlement-count', '10');
    expect(document.querySelectorAll('[data-city-skyline-district]')).toHaveLength(10);
    expect(Array.from(document.querySelectorAll('[data-city-skyline-district]')).every((district) => (
      district.getAttribute('data-construction-phase') === 'mature' &&
      district.getAttribute('data-city-technology-maturity') === 'planetary'
    ))).toBe(true);
  });

  it('advances Aurora Basin from neutral construction into committed Chrysalis districts', () => {
    const { rerender } = render(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={{ ...identities(), surface: formingIdentity('surface') }}
        progress={progress(1, 1, 1)}
        maturity="planetary"
        environmentVariantId="aurora_basin"
      />,
    );

    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-city-fabric-source', 'physical-district-layer');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-count', '3');
    expect(document.querySelectorAll('[data-settlement-structure]')).toHaveLength(3);
    expect(document.querySelector('[data-city-settlement-footprint]')).toBeNull();

    rerender(
      <CivilizationIdentityContinuityLayer
        scene="surface"
        identities={identities({ surface: 'chrysalis' })}
        progress={progress(2, 5, 3)}
        maturity="planetary"
        environmentVariantId="aurora_basin"
      />,
    );

    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-city-fabric-source', 'physical-district-layer');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-count', '7');
    expect(document.querySelectorAll('[data-city-skyline-district]')).toHaveLength(7);
    expect(document.querySelector('[data-city-settlement-footprint]')).toBeNull();
  });

  it('keeps mature Chrysalis scale continuity as independently nested physical objects', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="stellar"
        identities={identities({ surface: 'chrysalis', orbit: 'chrysalis', stellar: 'chrysalis' })}
        progress={progress(3, 10, 9)}
        maturity="galactic"
        environmentVariantId="aurora_basin"
      />,
    );

    expect(screen.getByTestId('civilization-identity-continuity'))
      .toHaveAttribute('data-continuity-source', 'layered-physical-objects');
    expect(screen.getByTestId('civilization-identity-continuity'))
      .toHaveAttribute('data-composition-model', 'authored-modular-kit');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-construction-model', 'distributed-system-infrastructure');
    expect(screen.getByTestId('civilization-nested-planet')).toHaveAttribute(
      'data-child-dyad',
      'chrysalis',
    );
  });

  it('renders committed Galactic identity as physical infrastructure around the inherited system', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="galaxy"
        identities={identities({ stellar: 'lineage', galaxy: 'echo' })}
        progress={progress(3)}
        maturity="galactic"
      />,
    );

    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-identity-dyad', 'echo');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-visual-role', 'physical-settlement-growth');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-count', '3');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-fabric-composition', 'recursive-echo');
    expect(document.querySelectorAll('[data-colonized-system="true"]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-galactic-region-scale="stellar-neighborhood"]'))
      .toHaveLength(3);
    expect(document.querySelectorAll('[data-colony-system-source="physical-stellar-manifestation"]'))
      .toHaveLength(3);
    expect(document.querySelectorAll('[data-system-body="colony-star"]'))
      .toHaveLength(3);
    expect(screen.getByTestId('civilization-nested-system'))
      .toHaveAttribute('data-child-dyad', 'lineage');
  });

  it('nests a committed city physically into the planet scene', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="orbit"
        identities={identities({ surface: 'bloom', orbit: 'echo' })}
        progress={progress(2)}
        maturity="stellar"
        environmentVariantId="oceanic_scar"
      />,
    );

    expect(screen.getByTestId('civilization-nested-city-region'))
      .toHaveAttribute('data-child-dyad', 'bloom');
    expect(screen.getByTestId('civilization-nested-city-region'))
      .toHaveAttribute('data-visible-districts', '4');
    expect(Array.from(document.querySelectorAll('[data-city-district]'))).toHaveLength(4);
    expect(document.querySelector('[data-city-urban-footprint="inhabited-districts"]'))
      .not.toBeNull();
    expect(Array.from(document.querySelectorAll('[data-city-district]')).every((district) => (
      district.classList.contains('overflow-hidden')
    ))).toBe(true);
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-identity-dyad', 'echo');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-count', '5');
    expect(document.querySelector('[data-planetary-settlement-lights="inhabited-regions"]'))
      .not.toBeNull();
    expect(screen.getByTestId('civilization-identity-continuity'))
      .toHaveAttribute('data-continuity-socket', 'orbit:city-region:0');
  });

  it('nests a committed planet physically into the system scene', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="stellar"
        identities={identities({ surface: 'bloom', orbit: 'echo', stellar: 'vortex' })}
        progress={progress(3)}
        maturity="galactic"
      />,
    );

    expect(screen.getByTestId('civilization-nested-planet'))
      .toHaveAttribute('data-child-dyad', 'echo');
    expect(screen.getByTestId('civilization-nested-planet'))
      .toHaveAttribute('data-environment-variant', 'aurora_basin');
    expect(document.querySelector('[data-planet-limb="physical-sphere"]')).not.toBeNull();
    expect(document.querySelector('[data-planet-terminator="physical-lighting"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-planet-identity-work]')).toHaveLength(2);
    expect(screen.getByTestId('civilization-nested-planet-city-socket'))
      .toHaveAttribute('data-city-dyad', 'bloom');
    expect(screen.getByTestId('civilization-nested-planet-city-socket'))
      .toHaveAttribute('data-continuity-socket', 'orbit:city-region:0');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-identity-dyad', 'vortex');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-settlement-count', '3');
    expect(document.querySelectorAll('[data-infrastructure-source-scene="stellar"]'))
      .toHaveLength(3);
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-construction-model', 'distributed-system-infrastructure');
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-physical-host', 'home-star');
    expect(document.querySelectorAll('[data-stellar-development="relay-habitat-network"]'))
      .toHaveLength(3);
    expect(document.querySelector('[data-system-field="physical-orbital-infrastructure"]'))
      .toHaveAttribute('data-star-rendering', 'authored-plate');
    expect(document.querySelector('[data-system-body="home-star"]')).toBeNull();
    expect(document.querySelectorAll('[data-system-orbital-zone]'))
      .toHaveLength(3);
    expect(document.querySelectorAll('[data-celestial-anchor="home-star"]'))
      .toHaveLength(2);
    expect(document.querySelectorAll('[data-celestial-anchor="system-orbit"]'))
      .toHaveLength(2);
    expect(document.querySelector('[data-megastructure-status="ordinary-infrastructure"]'))
      .not.toBeNull();
    expect(document.querySelector('[data-canonical-star-visibility="preserved"]'))
      .not.toBeNull();
    expect(document.querySelector('[data-celestial-anchor="home-star"]')
      ?.getAttribute('data-host-body-preserved')).toBe('true');
    expect(screen.getByTestId('civilization-identity-continuity')
      .querySelector('[data-celestial-anchor="homeworld"]'))
      .toHaveAttribute('data-replaces-background-body', 'true');
  });

  it('preserves the complete city-to-planet-to-system history inside the Galactic scene', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="galaxy"
        identities={identities({
          surface: 'bloom',
          orbit: 'echo',
          stellar: 'vortex',
          galaxy: 'lineage',
        })}
        progress={progress(3)}
        maturity="galactic"
      />,
    );

    const nestedSystem = screen.getByTestId('civilization-nested-system');
    expect(nestedSystem).toHaveAttribute(
      'data-child-dyad',
      'vortex',
    );
    expect(nestedSystem).toHaveAttribute(
      'data-planet-dyad',
      'echo',
    );
    expect(nestedSystem).toHaveAttribute(
      'data-city-dyad',
      'bloom',
    );
    const systemInfrastructure = Array.from(
      nestedSystem.querySelectorAll<HTMLElement>('[data-system-infrastructure]'),
    );
    expect(systemInfrastructure).toHaveLength(1);
    expect(systemInfrastructure.every((structure) => (
      structure.dataset.systemDyad === 'vortex' &&
      structure.classList.contains('overflow-hidden')
    ))).toBe(true);
    expect(screen.getByTestId('civilization-nested-system-homeworld-socket')).toHaveAttribute(
      'data-planet-dyad',
      'echo',
    );
    expect(screen.getByTestId('civilization-nested-system-homeworld-socket')).toHaveAttribute(
      'data-continuity-socket',
      'stellar:home-planet:0',
    );
    expect(screen.getByTestId('civilization-nested-planet-city-socket')).toHaveAttribute(
      'data-city-dyad',
      'bloom',
    );
    expect(screen.getByTestId('civilization-nested-planet-city-socket')).toHaveAttribute(
      'data-continuity-socket',
      'orbit:city-region:0',
    );
    expect(document.querySelector('[data-infrastructure-role="dark_sector"]')).not.toBeNull();
    expect(document.querySelector('[data-infrastructure-role="distributed_clusters"]')).not.toBeNull();
    expect(document.querySelector('[data-infrastructure-role="spiral_arm"]')).not.toBeNull();
    expect(document.querySelector('[data-infrastructure-role="coreward_region"]')).toBeNull();
    expect(screen.getByTestId('civilization-active-identity-infrastructure'))
      .toHaveAttribute('data-fabric-composition', 'braided-lineage');
  });

  it('never renders the retired full-frame or translucent history roles', () => {
    render(
      <CivilizationIdentityContinuityLayer
        scene="galaxy"
        identities={identities({ stellar: 'vortex', galaxy: 'lineage' })}
        progress={progress(3)}
        maturity="galactic"
      />,
    );

    expect(screen.queryByTestId('civilization-active-identity-architecture')).toBeNull();
    expect(screen.queryByTestId('civilization-nested-history')).toBeNull();
    expect(screen.queryByTestId('civilization-forming-identity-infrastructure')).toBeNull();
    expect(screen.getByTestId('civilization-nested-system'))
      .toHaveAttribute('data-continuity-form', 'physical-stellar-neighbourhood');
  });
});
