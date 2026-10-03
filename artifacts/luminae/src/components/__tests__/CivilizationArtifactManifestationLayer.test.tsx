import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ArtifactCard } from '@workspace/api-client-react';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_PLACEMENT_FAMILIES,
  CIVILIZATION_CAMERA_SCALES,
  CIVILIZATION_DYAD_DEFINITIONS,
  createInitialCivilizationState,
  reconcileCivilizationDerivedState,
  type ArtifactPlacementFamily,
  type ArtifactId,
} from '@workspace/game-types';
import {
  buildCivilizationArtifactWorldAnchors,
  CivilizationArtifactManifestationLayer,
} from '@/components/CivilizationArtifactManifestationLayer';
import { getArtifactManifestationProfile } from '@/lib/civilizationArtifactManifestations';
import { buildCivilizationDeploymentSites } from '@/lib/civilizationDeploymentSites';
import {
  getCivilizationEnvironmentSocket,
} from '@/lib/civilizationEnvironmentSockets';
import { getCivilizationManifestationArt } from '@/lib/civilizationManifestationArtRegistry';
import {
  getCivilizationSurfaceArtifactAttachmentTransform,
  getCivilizationSurfaceDistrictParcelsForFamily,
} from '@/lib/civilizationSurfaceDistrictPlan';
import { getCivilizationDistrictPresentation } from '@/lib/civilizationDistrictPresentation';
import { getCivilizationSaturatedPreviewIds } from '@/lib/civilizationArtifactProof';

const SATURATED_CARDS: ArtifactCard[] = ARTIFACT_CATALOG.map((definition) => ({
  ...definition,
  name: definition.id,
  flavor: '',
}));

const SATURATED_SITES = buildCivilizationDeploymentSites({
  forgedArtifacts: SATURATED_CARDS,
  tier: 3,
});

function persistedDistrictFixture(ids: readonly ArtifactId[]) {
  let state = createInitialCivilizationState();
  ids.forEach((artifactId, index) => {
    state.artifacts[artifactId] = {
      artifactId, firstMasteredTurnCount: index + 1, masteryCount: 1,
      implementationState: 'operational', implementationStateChangedTurnCount: index + 1,
      implementationChangeSource: null, historyEvidence: 'recorded',
    };
    state = reconcileCivilizationDerivedState(state, [], index + 1, {}, { commitPresentation: true });
  });
  return {
    districts: Object.values(state.districtIdentity.districts),
    sites: buildCivilizationDeploymentSites({
      forgedArtifacts: ids.map((id) => SATURATED_CARDS.find((card) => card.id === id)!),
      tier: 3, manifestationAssignments: Object.values(state.manifestationAssignments),
    }),
  };
}

function placementMatchesScene(
  placement: ArtifactPlacementFamily,
  scene: (typeof CIVILIZATION_CAMERA_SCALES)[number],
): boolean {
  const placementIndex = ARTIFACT_PLACEMENT_FAMILIES.indexOf(placement);
  if (scene === 'surface') return placementIndex >= 0 && placementIndex < 10;
  if (scene === 'orbit') return placementIndex >= 10 && placementIndex < 16;
  if (scene === 'stellar') return placementIndex >= 16 && placementIndex < 22;
  return placementIndex >= 22;
}

describe('CivilizationArtifactManifestationLayer', () => {
  afterEach(cleanup);

  it('does not restamp individual structures over the integrated terminal city plate', () => {
    render(
      <CivilizationArtifactManifestationLayer
        sites={SATURATED_SITES}
        scene="surface"
        dyad="chrysalis"
        scanActive={false}
        compact={false}
        bakedIntoPlate
      />,
    );

    const layer = screen.getByTestId('civilization-artifact-manifestation-layer');
    expect(layer).toHaveAttribute('data-structure-rendering', 'baked-terminal-plate');
    expect(layer).toHaveAttribute('data-artifact-count', String(ARTIFACT_CATALOG.length));
    expect(layer.querySelectorAll('[data-testid="civilization-artifact-structure"]'))
      .toHaveLength(0);
  });

  it.each(CIVILIZATION_CAMERA_SCALES)(
    'represents every %s-native Artifact in the saturated Chrysalis portrait',
    (scene) => {
      const expectedNativeIds = ARTIFACT_CATALOG
        .map(({ id }) => id)
        .filter((artifactId) => getArtifactManifestationProfile(artifactId).nativeCameraScale === scene)
        .sort();

      render(
        <CivilizationArtifactManifestationLayer
          sites={SATURATED_SITES}
          scene={scene}
          dyad="chrysalis"
          scanActive={false}
          compact={false}
        />,
      );

      const layer = screen.getByTestId('civilization-artifact-manifestation-layer');
      const representedNativeIds = Array.from(
        layer.querySelectorAll<HTMLElement>('[data-testid="civilization-artifact-structure"]'),
      )
        .map((element) => element.dataset.artifactUnit as ArtifactId)
        .sort();
      const structureSignatures = Array.from(
        layer.querySelectorAll<HTMLElement>('[data-artifact-structure-signature]'),
      ).map((element) => element.dataset.artifactStructureSignature);
      const shells = Array.from(
        layer.querySelectorAll<HTMLElement>('[data-render-medium="dyad-authored-artifact-shell"]'),
      );

      expect(layer).toHaveAttribute('data-artifact-count', String(ARTIFACT_CATALOG.length));
      expect(layer).toHaveAttribute('data-scene', scene);
      expect(layer).toHaveAttribute('data-native-artifact-count', String(expectedNativeIds.length));
      expect(Number(layer.dataset.crossScaleArtifactCount))
        .toBe(ARTIFACT_CATALOG.length - expectedNativeIds.length);
      expect(Number(layer.dataset.renderItemCount)).toBeGreaterThan(0);
      expect(Number(layer.dataset.renderItemCount)).toBeLessThanOrEqual(
        ARTIFACT_PLACEMENT_FAMILIES.filter((placement) => placementMatchesScene(placement, scene)).length,
      );
      expect(representedNativeIds).toEqual(expectedNativeIds);
      expect(structureSignatures).toHaveLength(expectedNativeIds.length);
      expect(new Set(structureSignatures).size).toBe(expectedNativeIds.length);
      expect(Array.from(
        layer.querySelectorAll<HTMLElement>('[data-testid="civilization-artifact-structure"]'),
      ).every((structure) => (
        structure.dataset.visualRole === 'primary-artifact-identity' &&
        Number.parseFloat(structure.style.opacity) === 1 &&
        !structure.style.filter.includes('blur')
      ))).toBe(true);
      expect(shells.reduce(
        (total, shell) => total + Number(shell.dataset.artifactOccupancy ?? 0),
        0,
      )).toBe(scene === 'surface' || scene === 'stellar' ? 0 : expectedNativeIds.length);
      if (scene === 'surface' || scene === 'stellar') {
        expect(shells).toHaveLength(0);
      } else {
        expect(shells.length).toBeGreaterThan(0);
      }
      expect(shells.every((shell) => shell.dataset.visualRole === 'contextual-dyad-foundation'))
        .toBe(true);
      expect(shells.every((shell) => (
        shell.style.opacity === '1' && shell.style.mixBlendMode === ''
      ))).toBe(true);
      expect(layer.querySelector('[data-visual-role="physical-distant-consequence"]')).toBeNull();
      expect(layer.querySelectorAll('[data-render-medium="authored-environmental-sprite"]'))
        .toHaveLength(0);
      if (scene === 'surface') {
        expect(layer).toHaveAttribute('data-density-treatment', 'depth-scaled');
        const supportingStructures = Array.from(
          layer.querySelectorAll<HTMLElement>(
            '[data-testid="civilization-artifact-structure"][data-portrait-prominence="supporting"]',
          ),
        );
        expect(supportingStructures.length).toBeGreaterThan(0);
        expect(supportingStructures.every((structure) => (
          Number(structure.dataset.densityScale) <= 0.56
        ))).toBe(true);
      }
    },
  );

  it.each([
    ['orbit', 'orbital', 0.62],
    ['stellar', 'system', 0.46],
    ['galaxy', 'galactic', 0.3],
  ] as const)(
    'keeps %s-scale infrastructure subordinate to its astronomical context',
    (scene, implementationScale, maximumScale) => {
      render(
        <CivilizationArtifactManifestationLayer
          sites={SATURATED_SITES}
          scene={scene}
          dyad="chrysalis"
          scanActive={false}
          compact={false}
        />,
      );

      const structures = Array.from(
        screen.getByTestId('civilization-artifact-manifestation-layer')
          .querySelectorAll<HTMLElement>(
            `[data-testid="civilization-artifact-structure"][data-implementation-scale="${implementationScale}"]`,
          ),
      );
      expect(structures.length).toBeGreaterThan(0);
      expect(structures.every((structure) => {
        const match = structure.style.transform.match(/scale\(([\d.]+)\)/);
        return match !== null && Number(match[1]) <= maximumScale;
      })).toBe(true);
    },
  );

  it.each(
    CIVILIZATION_DYAD_DEFINITIONS.flatMap(({ id: dyad }) => (
      CIVILIZATION_CAMERA_SCALES.map((scene) => ({ dyad, scene }))
    )),
  )('keeps Artifact-specific $scene art distinct from $dyad city fabric', ({ dyad, scene }) => {
    render(
      <CivilizationArtifactManifestationLayer
        sites={SATURATED_SITES}
        scene={scene}
        dyad={dyad}
        scanActive={false}
        compact={false}
      />,
    );

    const layer = screen.getByTestId('civilization-artifact-manifestation-layer');
    const expectedCount = ARTIFACT_CATALOG.filter(({ id }) => (
      getArtifactManifestationProfile(id).nativeCameraScale === scene
    )).length;
    const structures = Array.from(
      layer.querySelectorAll<HTMLElement>('[data-testid="civilization-artifact-structure"]'),
    );
    const shells = Array.from(
      layer.querySelectorAll<HTMLElement>('[data-render-medium="dyad-authored-artifact-shell"]'),
    );
    const shellHostKeys = new Set(shells.map((shell) => shell.dataset.worldHostKey));

    expect(layer.querySelectorAll('[data-render-medium="authored-standalone-artifact-sprite"]'))
      .toHaveLength(expectedCount);
    if (scene === 'surface' || scene === 'stellar') {
      expect(shells).toHaveLength(0);
    } else {
      expect(shells.length).toBeGreaterThan(0);
      expect(shells.length).toBeLessThanOrEqual(expectedCount);
    }
    expect(shells.every((shell) => shell.dataset.styleDyad === dyad)).toBe(true);
    expect(structures.every((structure) => (
      scene === 'surface' || scene === 'stellar' || shellHostKeys.has(structure.dataset.worldHostKey)
    ))).toBe(true);
    expect(shells.reduce(
      (total, shell) => total + Number(shell.dataset.artifactOccupancy ?? 0),
      0,
    )).toBe(scene === 'surface' || scene === 'stellar' ? 0 : expectedCount);
    expect(layer.querySelector('[data-render-medium="authored-environmental-sprite"]')).toBeNull();
    expect(layer.querySelector('[data-render-medium="procedural-environmental-unit"]')).toBeNull();
    if (scene === 'stellar') {
      expect(getCivilizationManifestationArt(dyad, scene, 'lagrange_network')?.src)
        .toMatch(/\.(webp|png)(\?|$)/);
    }
  });

  it.each(
    CIVILIZATION_DYAD_DEFINITIONS.flatMap(({ id: dyad }) => (
      CIVILIZATION_CAMERA_SCALES.map((scene) => ({ dyad, scene }))
    )),
  )('provides a complete, distributed $scene geography for the $dyad dyad', ({ dyad, scene }) => {
    const scenePlacements = ARTIFACT_PLACEMENT_FAMILIES.filter((placement) => (
      placementMatchesScene(placement, scene)
    ));
    const anchors = scenePlacements.map((placement) => (
      getCivilizationManifestationArt(dyad, scene, placement)?.anchor
    ));

    expect(anchors.every(Boolean)).toBe(true);
    expect(new Set(anchors.map((anchor) => `${anchor!.x},${anchor!.y}`)).size)
      .toBe(scenePlacements.length);
  });

  it.each(
    CIVILIZATION_DYAD_DEFINITIONS.flatMap(({ id: dyad }) => (
      CIVILIZATION_CAMERA_SCALES.map((scene) => ({ dyad, scene }))
    )),
  )('assigns every saturated $scene Artifact a unique stable site for $dyad', ({ dyad, scene }) => {
    const nativeSites = SATURATED_SITES.filter((site) => (
      site.artifactId && getArtifactManifestationProfile(site.artifactId).nativeCameraScale === scene
    ));
    const anchors = buildCivilizationArtifactWorldAnchors(nativeSites, scene, dyad);
    const coordinates = [...anchors.values()].map(({ x, y }) => `${x},${y}`);

    expect(anchors.size).toBe(nativeSites.length);
    expect(new Set(coordinates).size).toBe(nativeSites.length);
  });

  it.each(CIVILIZATION_CAMERA_SCALES)(
    'keeps the authored %s world invariant when Scan is enabled',
    (scene) => {
      const expectedNativeIds = ARTIFACT_CATALOG
        .map(({ id }) => id)
        .filter((artifactId) => getArtifactManifestationProfile(artifactId).nativeCameraScale === scene)
        .sort();

      const { rerender } = render(
        <CivilizationArtifactManifestationLayer
          sites={SATURATED_SITES}
          scene={scene}
          dyad="chrysalis"
          scanActive={false}
          compact={false}
        />,
      );

      const getArtifactSnapshot = () => Array.from(
        screen.getByTestId('civilization-artifact-manifestation-layer')
          .querySelectorAll<HTMLElement>('[data-testid="civilization-artifact-structure"]'),
      ).map((element) => ({
        artifactId: element.dataset.artifactUnit,
        host: element.dataset.worldHostKey,
        anchor: element.dataset.worldAnchor,
        left: element.style.left,
        top: element.style.top,
        width: element.style.width,
        opacity: element.style.opacity,
        transform: element.style.transform,
      }));
      const artifactPortraitSnapshot = getArtifactSnapshot();
      const getHostSnapshot = () => Array.from(
        screen.getByTestId('civilization-artifact-manifestation-layer')
          .querySelectorAll<HTMLElement>('[data-testid="civilization-authored-host"]'),
      ).map((element) => ({
        key: element.dataset.worldHostKey,
        anchor: element.dataset.worldAnchor,
        left: element.style.left,
        top: element.style.top,
        width: element.style.width,
        opacity: element.style.opacity,
        transform: element.style.transform,
      }));
      const hostPortraitSnapshot = getHostSnapshot();

      rerender(
        <CivilizationArtifactManifestationLayer
          sites={SATURATED_SITES}
          scene={scene}
          dyad="chrysalis"
          scanActive
          compact={false}
        />,
      );

      const layer = screen.getByTestId('civilization-artifact-manifestation-layer');
      const representedNativeIds = Array.from(
        layer.querySelectorAll<HTMLElement>('[data-testid="civilization-artifact-structure"]'),
      ).map((element) => element.dataset.artifactUnit as ArtifactId).sort();

      expect(layer).toHaveAttribute('data-render-mode', 'scan-annotation');
      expect(layer).toHaveAttribute('data-world-layout', 'invariant');
      expect(getArtifactSnapshot()).toEqual(artifactPortraitSnapshot);
      expect(getHostSnapshot()).toEqual(hostPortraitSnapshot);
      expect(representedNativeIds).toEqual(expectedNativeIds);
      expect(layer.querySelectorAll('[data-render-medium="authored-environmental-sprite"]'))
        .toHaveLength(0);

      rerender(
        <CivilizationArtifactManifestationLayer
          sites={SATURATED_SITES}
          scene={scene}
          dyad="chrysalis"
          scanActive
          compact={false}
          focusedSiteId={SATURATED_SITES.find((site) => (
            site.artifactId && getArtifactManifestationProfile(site.artifactId).nativeCameraScale === scene
          ))?.id}
        />,
      );

      expect(getArtifactSnapshot()).toEqual(artifactPortraitSnapshot);
      expect(getHostSnapshot()).toEqual(hostPortraitSnapshot);
    },
  );

  it('gives every Artifact a stable installation inside a shared environmental district', () => {
    const surfaceSites = SATURATED_SITES.filter((site) => (
      site.artifactId && getArtifactManifestationProfile(site.artifactId).nativeCameraScale === 'surface'
    ));
    const anchors = buildCivilizationArtifactWorldAnchors(surfaceSites, 'surface', 'chrysalis');
    const ignition = surfaceSites.find((site) => site.artifactId === 't1r01');
    const baffle = surfaceSites.find((site) => site.artifactId === 't1r07');

    expect(anchors.size).toBe(surfaceSites.length);
    expect(ignition).toBeTruthy();
    expect(baffle).toBeTruthy();
    expect(anchors.get(ignition!.id)?.hostKey)
      .toBe('native:chrysalis:industrial_district');
    expect(anchors.get(baffle!.id)?.hostKey)
      .toBe('native:chrysalis:industrial_district');
    expect(anchors.get(ignition!.id)).not.toMatchObject({
      x: anchors.get(baffle!.id)?.x,
      y: anchors.get(baffle!.id)?.y,
    });

    const ignitionAlone = buildCivilizationArtifactWorldAnchors(
      [ignition!],
      'surface',
      'chrysalis',
    ).get(ignition!.id);
    expect(ignitionAlone).toEqual(anchors.get(ignition!.id));

    for (const site of surfaceSites) {
      const profile = getArtifactManifestationProfile(site.artifactId!);
      expect(profile.compatiblePlacementFamilies).toContain(anchors.get(site.id)?.placement);
    }
  });

  it('keeps surface installations near their authored district campuses and depth roles', () => {
    const surfaceSites = SATURATED_SITES.filter((site) => (
      site.artifactId && getArtifactManifestationProfile(site.artifactId).nativeCameraScale === 'surface'
    ));
    const anchors = buildCivilizationArtifactWorldAnchors(
      surfaceSites,
      'surface',
      'chrysalis',
      'aurora_basin',
    );
    const depths = new Set([...anchors.values()].map((anchor) => anchor.authoredDepth));

    expect(depths).toEqual(new Set(['distance', 'midground', 'foreground']));
    for (const anchor of anchors.values()) {
      const attachment = anchor.placement
        ? getCivilizationSurfaceArtifactAttachmentTransform(
            anchor.placement as Parameters<typeof getCivilizationSurfaceArtifactAttachmentTransform>[0],
            anchor.memberIndex,
            false,
          )
        : null;
      expect(attachment).toBeTruthy();
      const { bounds } = getCivilizationDistrictPresentation(attachment!.parcel.id)!;
      expect(anchor.districtParcelId).toBe(attachment!.parcel.id);
      expect(anchor.authoredDepth).toBe(attachment!.parcel.depth);
      expect(anchor.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(anchor.x).toBeLessThanOrEqual(bounds.maxX);
      expect(anchor.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(anchor.y).toBeLessThanOrEqual(bounds.maxY);
      expect(anchor.hostKey).toContain(anchor.placement ?? 'missing');
    }
  });

  it.each([
    { order: 'catalog', compact: false }, { order: 'catalog', compact: true },
    { order: 'reverse', compact: false }, { order: 'reverse', compact: true },
    { order: 'chrysalis-priority', compact: false }, { order: 'chrysalis-priority', compact: true },
  ])('anchors persisted residents to their authored parcels ($order, compact=$compact)', ({ order, compact }) => {
    const ids = order === 'chrysalis-priority' ? getCivilizationSaturatedPreviewIds('chrysalis', true)
      : order === 'reverse' ? [...ARTIFACT_CATALOG].reverse().map(({ id }) => id) : ARTIFACT_CATALOG.map(({ id }) => id);
    const { sites, districts } = persistedDistrictFixture(ids.filter((id) =>
      getArtifactManifestationProfile(id).nativeCameraScale === 'surface'));
    const anchors = buildCivilizationArtifactWorldAnchors(sites, 'surface', 'chrysalis', 'aurora_basin', [], compact, districts);
    const expectedCount = districts.reduce((sum, district) => sum + district.residentArtifactIds.length, 0);
    expect(anchors.size).toBe(expectedCount);
    const supportedDistricts = districts.filter((district) => getCivilizationSurfaceDistrictParcelsForFamily(district.family)
      .some(({ instance }) => instance === district.instance));
    expect(districts.filter((district) => !supportedDistricts.includes(district)).map(({ districtId }) => districtId))
      .toEqual([]);
    const misplaced = supportedDistricts.flatMap((district) => {
      const parcel = getCivilizationSurfaceDistrictParcelsForFamily(district.family)
        .find(({ instance }) => instance === district.instance)!;
      return district.residentArtifactIds.flatMap((artifactId) => {
        const site = sites.find((candidate) => candidate.artifactId === artifactId)!;
        const actual = anchors.get(site.id)?.districtParcelId;
        const expected = parcel.id;
        return actual === expected ? [] : [{ artifactId, expected, actual }];
      });
    });
    expect(misplaced).toEqual([]);
    if (order === 'chrysalis-priority') {
      // A legal soft-capacity history leaves room in the first harbor while
      // three later residents belong to the second. Family-wide packing fails.
      expect(districts.filter(({ family }) => family === 'coastal_margin')
        .sort((a, b) => a.instance - b.instance).map(({ residentArtifactIds }) => residentArtifactIds.length)).toEqual([2, 3]);
    }
    for (const district of supportedDistricts) {
      const parcel = getCivilizationSurfaceDistrictParcelsForFamily(district.family)
        .find(({ instance }) => instance === district.instance)!;
      expect(parcel, district.districtId).toBeDefined();
      const fit = getCivilizationDistrictPresentation(parcel.id, compact)!;
      for (const [slotIndex, artifactId] of district.residentArtifactIds.entries()) {
        const site = sites.find((candidate) => candidate.artifactId === artifactId)!;
        const anchor = anchors.get(site.id)!;
        expect(anchor, artifactId).toMatchObject({
          placement: district.family, districtParcelId: parcel.id, hostKey: district.districtId,
          authoredDepth: parcel.depth, memberIndex: slotIndex, memberCount: district.residentArtifactIds.length,
        });
        expect(anchor.x, artifactId).toBeGreaterThanOrEqual(fit.bounds.minX);
        expect(anchor.x, artifactId).toBeLessThanOrEqual(fit.bounds.maxX);
        expect(anchor.y, artifactId).toBeGreaterThanOrEqual(fit.bounds.minY);
        expect(anchor.y, artifactId).toBeLessThanOrEqual(fit.bounds.maxY);
      }
    }
    const changed = buildCivilizationArtifactWorldAnchors(sites.map((site) => ({ ...site, implementationState: 'damaged' })),
      'surface', 'echo', 'aurora_basin', [], compact, districts);
    for (const district of supportedDistricts) for (const id of district.residentArtifactIds) {
      const site = sites.find((candidate) => candidate.artifactId === id)!;
      expect(changed.get(site.id)).toEqual(anchors.get(site.id));
    }
    const oneResident = sites.find((site) => districts.some((district) => district.instance > 0 && district.residentArtifactIds.includes(site.artifactId!)))!;
    expect(buildCivilizationArtifactWorldAnchors([oneResident], 'surface', 'echo', 'aurora_basin', [], compact, districts)
      .get(oneResident.id)).toEqual(anchors.get(oneResident.id));
  });

  it('keeps unassigned Artifact sites on the shared Surface socket contract', () => {
    const surfaceSites = SATURATED_SITES.filter((site) => (
      site.artifactId && getArtifactManifestationProfile(site.artifactId).nativeCameraScale === 'surface'
    ));
    const aurora = buildCivilizationArtifactWorldAnchors(
      surfaceSites,
      'surface',
      'chrysalis',
      'aurora_basin',
    );
    const oceanic = buildCivilizationArtifactWorldAnchors(
      surfaceSites,
      'surface',
      'chrysalis',
      'oceanic_scar',
    );
    const site = surfaceSites.find((candidate) => candidate.artifactId === 't1r01')!;
    const placement = aurora.get(site.id)!.placement!;
    const socketId = `surface:${placement}:${aurora.get(site.id)!.memberIndex}`;
    const oceanicSocket = getCivilizationEnvironmentSocket('oceanic_scar', socketId)!;

    expect(aurora.get(site.id)).toMatchObject({
      x: oceanic.get(site.id)?.x,
      y: oceanic.get(site.id)?.y,
    });
    expect(oceanic.get(site.id)).toMatchObject({
      x: oceanicSocket.desktopTransform.x,
      y: oceanicSocket.desktopTransform.y,
    });
  });

  it.each([false, true])('mounts persisted rooftop fixtures without terrain supports or clipped feet (compact=%s)', (compact) => {
    const { sites, districts } = persistedDistrictFixture(getCivilizationSaturatedPreviewIds('chrysalis', true)
      .filter((id) => getArtifactManifestationProfile(id).nativeCameraScale === 'surface'));
    const props = { sites, districtInstances: districts, scene: 'surface' as const, dyad: 'chrysalis' as const, compact };
    const { rerender } = render(<CivilizationArtifactManifestationLayer {...props} scanActive={false} />);
    const structures = screen.getAllByTestId('civilization-artifact-structure');
    const roofs = structures.filter((element) => element.dataset.districtAttachmentRole === 'roof-module');
    expect(roofs.length).toBeGreaterThan(0);
    const anchors = buildCivilizationArtifactWorldAnchors(sites, 'surface', 'chrysalis', 'aurora_basin', [], compact, districts);

    for (const roof of roofs) {
      const artifactId = roof.dataset.artifactUnit!;
      const district = districts.find(({ residentArtifactIds }) => residentArtifactIds.includes(artifactId))!;
      const parcels = getCivilizationSurfaceDistrictParcelsForFamily(district.family);
      const ordinal = parcels.filter(({ instance }) => instance < district.instance)
        .reduce((total, parcel) => total + parcel.capacity, 0) + district.residentArtifactIds.indexOf(artifactId);
      const socket = getCivilizationEnvironmentSocket('aurora_basin', `surface:${district.family}:${ordinal}`)!;
      const transform = compact ? socket.mobileTransform : socket.desktopTransform;
      const site = sites.find((candidate) => candidate.artifactId === artifactId)!;
      expect(socket.districtAttachmentRole).toBe('roof-module');
      expect(anchors.get(site.id)).toMatchObject({
        x: transform.x, y: transform.y, socketScale: transform.scale,
        districtAttachmentRole: 'roof-module', requiredSupport: socket.requiredSupport,
      });
      expect(roof).toHaveAttribute('data-grounding-mode', 'roof_mount');
      expect(roof).toHaveAttribute('data-elevation-mode', 'roof-mounted');
      const support = roof.querySelector('[data-testid="civilization-artifact-physical-support"]')!;
      expect(support).toHaveAttribute('data-support-form', 'roof-mounting-collar');
      expect(support.querySelectorAll('path')).toHaveLength(2);
      for (const face of support.querySelectorAll('path')) {
        expect(face.getAttribute('fill')).toMatch(/^#[a-f0-9]{6}$/);
      }
      const art = roof.querySelector<HTMLElement>('[data-construction-phase]')!;
      expect(art.style.clipPath).toBe('');
      expect(art).toHaveAttribute('data-terrain-occlusion', 'none');
      expect(art.querySelector('[data-render-medium="authored-standalone-artifact-sprite"]')).not.toBeNull();
    }
    for (const structure of structures.filter((element) => !roofs.includes(element))) {
      expect(structure.dataset.groundingMode).toBe(structure.dataset.requiredSupport);
      expect(structure.querySelector('[data-support-form="roof-mounting-collar"]')).toBeNull();
    }

    const positions = structures.map((structure) => [structure.dataset.artifactUnit, structure.getAttribute('style')]);
    rerender(<CivilizationArtifactManifestationLayer {...props} scanActive />);
    expect(screen.getAllByTestId('civilization-artifact-structure')
      .map((structure) => [structure.dataset.artifactUnit, structure.getAttribute('style')])).toEqual(positions);
    expect(document.querySelectorAll('[data-support-form="roof-mounting-collar"]')).toHaveLength(roofs.length);

    // Existing games without persistent districts keep their established supports.
    rerender(<CivilizationArtifactManifestationLayer {...props} districtInstances={[]} scanActive={false} />);
    expect(document.querySelector('[data-support-form="roof-mounting-collar"]')).toBeNull();
  });

  it.each([false, true])('preserves complete district-mounted silhouettes and access bases at depth (compact=%s)', (compact) => {
    const { sites, districts } = persistedDistrictFixture(getCivilizationSaturatedPreviewIds('chrysalis', true)
      .filter((id) => getArtifactManifestationProfile(id).nativeCameraScale === 'surface'));
    const props = { sites, districtInstances: districts, scene: 'surface' as const, dyad: 'chrysalis' as const, compact };
    const { rerender } = render(<CivilizationArtifactManifestationLayer {...props} scanActive={false} />);
    const affected = screen.getAllByTestId('civilization-artifact-structure').filter((element) =>
      element.dataset.authoredDepth !== 'foreground' && element.dataset.districtAttachmentRole !== 'roof-module');
    // Both tall atlas fixtures and square units with authored access platforms
    // must survive the old mask, at their existing midground/distance sockets.
    expect(affected.map((element) => element.dataset.artifactUnit).sort()).toEqual([
      't1p01', 't1r09', 't1r03', 't1p05', 't1r02', 't1o09', 't1e05',
      't1p08', 't1s06', 't1r05', 't1e01', 't1p02', 't1o02', 't1r06',
      't1s09', 't1p03', 't1e09', 't1s02', 't1e04',
    ].sort());
    expect(new Set(affected.map((element) => element.dataset.authoredDepth))).toEqual(new Set(['midground', 'distance']));
    const retained = new Map(affected.map((element) => {
      const wrapper = element.querySelector<HTMLElement>('[data-construction-phase]')!;
      const sprite = wrapper.querySelector<HTMLElement>('[data-render-medium="authored-standalone-artifact-sprite"]')!;
      expect(wrapper.style.clipPath).toBe('');
      expect(wrapper).toHaveAttribute('data-terrain-occlusion', 'none');
      expect(sprite.style.clipPath).toMatch(/^inset\(0 0 [\d.]+% 0\)$/);
      expect(Number(sprite.dataset.artifactGroundLine)).toBeLessThan(1);
      return [element.dataset.artifactUnit!, {
        position: element.getAttribute('style'),
        sprite: sprite.outerHTML,
        support: element.querySelector('[data-testid="civilization-artifact-physical-support"]')!.outerHTML,
      }];
    }));
    rerender(<CivilizationArtifactManifestationLayer {...props} scanActive />);
    for (const element of screen.getAllByTestId('civilization-artifact-structure')) {
      const before = retained.get(element.dataset.artifactUnit!);
      if (!before) continue;
      expect(element.getAttribute('style')).toBe(before.position);
      expect(element.querySelector('[data-render-medium="authored-standalone-artifact-sprite"]')!.outerHTML).toBe(before.sprite);
      expect(element.querySelector('[data-testid="civilization-artifact-physical-support"]')!.outerHTML).toBe(before.support);
    }

    rerender(<CivilizationArtifactManifestationLayer {...props} districtInstances={[]} scanActive={false} />);
    for (const element of screen.getAllByTestId('civilization-artifact-structure')) {
      const wrapper = element.querySelector<HTMLElement>('[data-construction-phase]')!;
      if (element.dataset.authoredDepth === 'foreground') {
        expect(wrapper.style.clipPath).toBe('');
      } else {
        expect(wrapper.style.clipPath).toMatch(/^polygon\(/);
        expect(wrapper).toHaveAttribute('data-terrain-occlusion', element.dataset.authoredDepth);
      }
    }
  });

  it('grounds every surface Artifact directly without duplicate district proxies', () => {
    render(
      <CivilizationArtifactManifestationLayer
        sites={SATURATED_SITES}
        scene="surface"
        dyad="chrysalis"
        scanActive={false}
        compact={false}
      />,
    );

    const layer = screen.getByTestId('civilization-artifact-manifestation-layer');
    const surfaceArtifactCount = ARTIFACT_CATALOG.filter(({ id }) => (
      getArtifactManifestationProfile(id).nativeCameraScale === 'surface'
    )).length;
    expect(layer.querySelectorAll('[data-testid="civilization-artifact-ground-contact"]'))
      .toHaveLength(surfaceArtifactCount);
    expect(layer.querySelector('[data-render-medium="authored-environmental-sprite"]')).toBeNull();
    for (const structure of layer.querySelectorAll<HTMLElement>(
      '[data-testid="civilization-artifact-structure"]',
    )) {
      expect(structure).toHaveAttribute('data-elevation-mode', 'integrated-ground');
      expect(structure.dataset.groundingMode).toMatch(
        /^(district_foundation|terrain_integrated|terraced_foundation|subsurface_anchor|shore_pylons)$/,
      );
      expect(structure).toHaveAttribute('data-physical-validity', 'authored');
      expect(structure.dataset.authoredDepth).toMatch(/^(distance|midground|foreground)$/);
      expect(structure.dataset.depthBand).toBe(structure.dataset.authoredDepth);
      expect(structure.dataset.occlusion).toMatch(/^(terrain|architecture|atmosphere|none)$/);
      expect(structure.dataset.district).toBeTruthy();
      expect(structure.dataset.substrate).toBeTruthy();
      expect(structure.dataset.requiredSupport).toBe(structure.dataset.groundingMode);
      expect(structure.querySelector('[data-testid="civilization-artifact-physical-support"]'))
        .not.toBeNull();
      const contact = structure.querySelector<HTMLElement>(
        '[data-testid="civilization-artifact-ground-contact"]',
      );
      expect(contact?.style.background).toContain('rgba(0, 0, 0');
      const art = structure.querySelector<HTMLElement>('[data-construction-phase]');
      if (structure.dataset.authoredDepth === 'foreground') {
        expect(art).toHaveAttribute('data-terrain-occlusion', 'none');
      } else {
        expect(art).toHaveAttribute('data-terrain-occlusion', structure.dataset.authoredDepth);
      }
    }
  });

  it('keeps construction feedback on the unique Artifact instead of a duplicate host shell', () => {
    const recentSite = SATURATED_SITES.find((site) => (
      site.artifactId && getArtifactManifestationProfile(site.artifactId).nativeCameraScale === 'surface'
    ));
    expect(recentSite).toBeTruthy();

    const { rerender } = render(
      <CivilizationArtifactManifestationLayer
        sites={SATURATED_SITES}
        scene="surface"
        dyad="chrysalis"
        scanActive={false}
        compact={false}
      />,
    );

    expect(screen.queryByTestId('civilization-authored-host')).toBeNull();
    expect(Array.from(
      screen.getAllByTestId('civilization-artifact-identity-glow'),
    ).every((glow) => glow.classList.contains('opacity-0'))).toBe(true);

    rerender(
      <CivilizationArtifactManifestationLayer
        sites={SATURATED_SITES}
        scene="surface"
        dyad="chrysalis"
        scanActive={false}
        compact={false}
        recentSiteIds={[recentSite!.id]}
      />,
    );

    const recentStructure = screen.getAllByTestId('civilization-artifact-structure')
      .find((structure) => structure.dataset.artifactUnit === recentSite!.artifactId);
    expect(recentStructure).toHaveAttribute('data-construction-transition', 'assembling');
    expect(recentStructure?.querySelector('[data-construction-phase="bottom-up-assembly"]'))
      .not.toBeNull();
    expect(recentStructure?.querySelector('[data-testid="civilization-artifact-arrival-ring"]'))
      .not.toBeNull();
  });

  it('does not run Artifact identity glow animation until that Artifact is focused', () => {
    const focusedSite = SATURATED_SITES.find((site) => (
      site.artifactId && getArtifactManifestationProfile(site.artifactId).nativeCameraScale === 'surface'
    ));
    expect(focusedSite).toBeTruthy();

    const { rerender } = render(
      <CivilizationArtifactManifestationLayer
        sites={SATURATED_SITES}
        scene="surface"
        dyad="chrysalis"
        scanActive={false}
        compact={false}
      />,
    );

    expect(screen.getAllByTestId('civilization-artifact-identity-glow').every((glow) => (
      !glow.classList.contains('civ-artifact-identity-glow') && glow.classList.contains('opacity-0')
    ))).toBe(true);

    rerender(
      <CivilizationArtifactManifestationLayer
        sites={SATURATED_SITES}
        scene="surface"
        dyad="chrysalis"
        scanActive
        compact={false}
        focusedSiteId={focusedSite!.id}
      />,
    );

    const focusedStructure = screen.getByTestId('civilization-artifact-manifestation-layer')
      .querySelector<HTMLElement>(
        `[data-testid="civilization-artifact-structure"][data-artifact-unit="${focusedSite!.artifactId}"]`,
      );
    expect(focusedStructure?.querySelector('[data-testid="civilization-artifact-identity-glow"]'))
      .toHaveClass('civ-artifact-identity-glow', 'opacity-100');
  });

  it.each(CIVILIZATION_CAMERA_SCALES)(
    'distributes the saturated %s catalog across compatible physical regions',
    (scene) => {
      const nativeSites = SATURATED_SITES.filter((site) => (
        site.artifactId && getArtifactManifestationProfile(site.artifactId).nativeCameraScale === scene
      ));
      const anchors = buildCivilizationArtifactWorldAnchors(nativeSites, scene, 'chrysalis');
      const placementCounts = new Map<string, number>();

      for (const site of nativeSites) {
        const placement = anchors.get(site.id)?.placement;
        expect(placement).toBeTruthy();
        placementCounts.set(placement!, (placementCounts.get(placement!) ?? 0) + 1);
      }

      const counts = [...placementCounts.values()];
      expect(placementCounts.size).toBeGreaterThanOrEqual(scene === 'surface' ? 8 : 5);
      expect(Math.max(...counts)).toBeLessThanOrEqual(scene === 'surface' ? 7 : 5);
    },
  );

  it.each(CIVILIZATION_CAMERA_SCALES)(
    'renders every %s-native Artifact as authored physical art',
    (scene) => {
      const expectedIds = ARTIFACT_CATALOG
        .map(({ id }) => id)
        .filter((artifactId) => getArtifactManifestationProfile(artifactId).nativeCameraScale === scene)
        .sort();

      render(
        <CivilizationArtifactManifestationLayer
          sites={SATURATED_SITES}
          scene={scene}
          dyad="chrysalis"
          scanActive={false}
          compact={false}
        />,
      );

      const layer = screen.getByTestId('civilization-artifact-manifestation-layer');
      const renderedIds = Array.from(
        layer.querySelectorAll<HTMLElement>(
          '[data-render-medium="authored-standalone-artifact-sprite"]',
        ),
      )
        .map((element) => (
          element.closest<HTMLElement>('[data-testid="civilization-artifact-structure"]')
            ?.dataset.artifactUnit as ArtifactId
        ))
        .sort();

      expect(renderedIds).toEqual(expectedIds);
      expect(layer.querySelectorAll('[data-artifact-structure-form="authored-standalone"]'))
        .toHaveLength(expectedIds.length);
    },
  );

  it('focuses only the exact physical Artifact installation selected by Scan', () => {
    const site = SATURATED_SITES.find((candidate) => candidate.artifactId === 't3r04');
    expect(site).toBeTruthy();

    render(
      <CivilizationArtifactManifestationLayer
        sites={[site!]}
        scene="galaxy"
        dyad="chrysalis"
        scanActive
        compact={false}
        focusedSiteId={site!.id}
      />,
    );

    const structure = screen.getByTestId('civilization-artifact-structure');
    expect(structure).toHaveAttribute('data-artifact-unit', 't3r04');
    expect(structure).toHaveAttribute('data-scan-link-state', 'linked');
    expect(structure.querySelector('[data-testid="civilization-artifact-identity-glow"]'))
      .toHaveClass('opacity-100');
    expect(structure.querySelector('[data-render-medium="authored-standalone-artifact-sprite"]'))
      .not.toBeNull();
  });

  it('retains a damaged implementation as a subdued historical imprint', () => {
    const source = SATURATED_SITES.find((candidate) => candidate.artifactId === 't1r01');
    expect(source).toBeTruthy();
    const historicalSite = {
      ...source!,
      implementationState: 'damaged' as const,
      manifestationAssignment: {
        sourceId: 't1r01',
        sourceType: 'artifact' as const,
        nativeScene: 'surface' as const,
        placementFamily: 'industrial_district' as const,
        socketId: 'surface:industrial_district:0',
        assignmentTurnCount: 2,
        historyEvidence: 'recorded' as const,
      },
    };

    render(
      <CivilizationArtifactManifestationLayer
        sites={[historicalSite]}
        scene="surface"
        dyad="bloom"
        environmentVariantId="terminator_reach"
        scanActive={false}
        compact={false}
      />,
    );

    expect(screen.getByTestId('civilization-artifact-structure'))
      .toHaveAttribute('data-operational-state', 'historical-imprint');
    expect(screen.getByTestId('civilization-artifact-structure').style.opacity).toBe('1');
    expect(screen.queryByTestId('civilization-authored-host')).toBeNull();
  });

  it('does not stamp duplicate celestial composites into the Stellar scene', () => {
    render(
      <CivilizationArtifactManifestationLayer
        sites={SATURATED_SITES}
        scene="stellar"
        dyad="echo"
        scanActive={false}
        compact={false}
      />,
    );

    const layer = screen.getByTestId('civilization-artifact-manifestation-layer');
    expect(layer).toHaveAttribute('data-contextual-host-count', '0');
    expect(screen.queryByTestId('civilization-authored-host')).toBeNull();
    expect(screen.getAllByTestId('civilization-artifact-structure').length).toBeGreaterThan(0);
  });

  it('keeps a persisted environment socket fixed when Scan is toggled', () => {
    const source = SATURATED_SITES.find((candidate) => candidate.artifactId === 't1r01');
    expect(source).toBeTruthy();
    const assignedSite = {
      ...source!,
      manifestationAssignment: {
        sourceId: 't1r01',
        sourceType: 'artifact' as const,
        nativeScene: 'surface' as const,
        placementFamily: 'industrial_district' as const,
        socketId: 'surface:industrial_district:0',
        assignmentTurnCount: 2,
        historyEvidence: 'recorded' as const,
      },
    };
    const { rerender } = render(
      <CivilizationArtifactManifestationLayer
        sites={[assignedSite]}
        scene="surface"
        dyad="bloom"
        environmentVariantId="oceanic_scar"
        scanActive={false}
        compact={false}
      />,
    );
    const portraitAnchor = screen.getByTestId('civilization-artifact-structure')
      .getAttribute('data-world-anchor');

    rerender(
      <CivilizationArtifactManifestationLayer
        sites={[assignedSite]}
        scene="surface"
        dyad="bloom"
        environmentVariantId="oceanic_scar"
        scanActive
        compact={false}
      />,
    );

    expect(screen.getByTestId('civilization-artifact-structure'))
      .toHaveAttribute('data-world-anchor', portraitAnchor);
  });
});
