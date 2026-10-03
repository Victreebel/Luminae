import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactCard, CivilizationPublicState } from '@workspace/api-client-react';
import {
  ARTIFACT_CATALOG,
  CIVILIZATION_STATE_VERSION,
  CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID,
  createCivilizationEnvironmentIdentity,
  createInitialCivilizationDistrictIdentityState,
  createInitialCivilizationNestedIdentityState,
  createInitialCivilizationState,
  reconcileCivilizationDerivedState,
} from '@workspace/game-types';
import type { CivilizationDyadId } from '@workspace/game-types';
import {
  CivilizationMiniatureScene,
  CivilizationScenePanel,
  resolveCivilizationScanMarkerAnchors,
} from '@/components/CivilizationScenePanel';
import { buildCivilizationDeploymentSites, type CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import { getArtifactManifestationProfile } from '@/lib/civilizationArtifactManifestations';
import { buildCivilizationProfile } from '@/lib/civilizationProfile';
import { CARD_NAME_FALLBACK } from '@/lib/cardNameFallback';
import { getCivilizationSaturatedPreviewIds } from '@/lib/civilizationArtifactProof';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mobileState.isMobile,
}));

function artifact(id: string, name: string): ArtifactCard {
  return {
    id,
    name,
    tier: 1,
    eminence: 1,
    bonusAffinity: 'verdance',
    flavor: '',
    cost: {
      flare: 0,
      continuum: 0,
      verdance: 0,
      abyss: 0,
      radiance: 0,
      singularity: 0,
    },
  };
}

function site(index: number, overrides: Partial<CivilizationDeploymentSite> = {}): CivilizationDeploymentSite {
  return {
    id: `artifact:t1r0${index}`,
    kind: 'artifact',
    scaleBand: 'stellar',
    trait: 'biosphere',
    artifactId: `t1r0${index}`,
    affinity: 'verdance',
    artifactTier: 1,
    artifactForm: 'Biotech Module',
    blueprintRole: 'habitat ecology support',
    engineeringScale: 'Star-system',
    representationMode: 'local_trace',
    sourceQuality: 'authored',
    consequenceLabel: 'Living Recovery',
    visualCue: 'living habitat bands between worlds',
    synergySummary: 'This trace is combining with related civic work.',
    supportingArtifactNames: [],
    anchor: { x: 20 + index * 8, y: 35 + index * 3 },
    depictionScale: 'macro',
    scalePresence: 'artifact_pin',
    nativeArtworkLayer: 'surface',
    nativeArtworkLabel: 'Local site',
    scalePolicyCopy: 'The card art is close-up object scale. The scene marks the deployment site and its consequences, not a giant version of the object.',
    artifactVisualMotif: 'seed',
    priority: 100 - index,
    title: `Deployment Site ${index}`,
    summary: 'A civilization-scale trace explains the local artifact without making it a giant object.',
    visibleAs: 'habitat ecology chains threaded between worlds',
    laneLabel: 'Habitat ecology',
    relatedArtifactIds: [`t1r0${index}`],
    ...overrides,
  };
}

function getScanMapPin(siteId: string): HTMLElement {
  const pin = screen.getAllByTestId('civilization-scan-map-pin')
    .find((element) => element.dataset.siteId === siteId);
  expect(pin).toBeDefined();
  return pin!;
}

function civilizationTransitionFixture(
  presentationDyad: CivilizationDyadId,
  committedTurnCount: number,
  retiredScaleDyad: CivilizationDyadId,
): CivilizationPublicState {
  const identityScales = createInitialCivilizationNestedIdentityState();
  for (const layer of Object.keys(identityScales) as (keyof typeof identityScales)[]) {
    identityScales[layer] = {
      ...identityScales[layer],
      status: 'committed',
      candidateDyad: retiredScaleDyad,
      committedDyad: retiredScaleDyad,
      committedTurnCount,
    };
  }
  const districtIdentity = {
    ...createInitialCivilizationDistrictIdentityState(),
    rawDominantDyad: presentationDyad,
    presentationDyad,
    calculatedTurnCount: committedTurnCount,
    presentationCommittedTurnCount: committedTurnCount,
  };
  const counts = { flare: 3, radiance: 0, verdance: 0, continuum: 0, abyss: 2 };
  const shares = { flare: 0.6, radiance: 0, verdance: 0, continuum: 0, abyss: 0.4 };

  return {
    version: CIVILIZATION_STATE_VERSION,
    environmentIdentity: createCivilizationEnvironmentIdentity('transition-authority-test'),
    artifacts: [],
    affinityIdentity: {
      policyId: 'provisional-ratio-v1',
      form: 'dyad',
      historicalCounts: counts,
      operationalCounts: counts,
      rankedAffinities: [
        { affinity: 'flare', historicalWeight: 3, operationalWeight: 3 },
        { affinity: 'abyss', historicalWeight: 2, operationalWeight: 2 },
        { affinity: 'radiance', historicalWeight: 0, operationalWeight: 0 },
        { affinity: 'verdance', historicalWeight: 0, operationalWeight: 0 },
        { affinity: 'continuum', historicalWeight: 0, operationalWeight: 0 },
      ],
      dominantAffinity: 'flare',
      dominantDyad: presentationDyad,
      foundingDyad: 'chrysalis',
      presentationDyad,
      identityEpochs: [{
        epochIndex: 0,
        dyad: presentationDyad,
        startedTurnCount: committedTurnCount,
        endedTurnCount: null,
        historicalSharesAtStart: shares,
        historyEvidence: 'recorded',
      }],
      normalizedHistoricalShares: shares,
      normalizedOperationalShares: shares,
      thirdAffinity: null,
      dominantShare: 0.6,
      secondaryToPrimaryRatio: 2 / 3,
      thirdToPrimaryRatio: 0,
    },
    districtIdentity,
    identityScales,
    scale: {
      historicalMaturity: 'galactic',
      currentReach: 'galactic',
      currentReachCondition: 'intact',
      literalKardashevType: 3,
      literalKardashevEvidence: 'recorded',
    },
    stability: {
      band: 'stable',
      score: 100,
      calibrationId: null,
      contributors: [],
      calculatedTurnCount: committedTurnCount,
      historyEvidence: 'recorded',
    },
    activeConditions: [],
    projects: [],
    activeCapabilityIds: [],
    manifestationAssignments: [],
    events: [],
    legacy: { completedTurnCount: null, historyEvidence: 'recorded' },
  };
}

describe('CivilizationScenePanel', () => {
  beforeEach(() => {
    mobileState.isMobile = false;
  });

  it('sources evolution notices from the live district direction instead of retired scale locks', () => {
    sessionStorage.clear();
    const renderPanel = (civilization: CivilizationPublicState) => (
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#ff6a28', secondary: '#a832d4', accent: '#ffba8e' }}
        profile={buildCivilizationProfile([])}
        progressFraction={1}
        paused
        defaultScene="surface"
        civilization={civilization}
        deploymentSites={[]}
        forgedArtifacts={[]}
        onOpenArtifact={vi.fn()}
      />
    );
    const { rerender } = render(renderPanel(
      civilizationTransitionFixture('chrysalis', 3, 'flux'),
    ));

    expect(screen.getByTestId('civilization-identity-transition'))
      .toHaveTextContent('Chrysalis architecture now leads');
    expect(screen.getByTestId('civilization-identity-transition')).not.toHaveTextContent('Flux');

    rerender(renderPanel(civilizationTransitionFixture('echo', 9, 'bloom')));

    expect(screen.getByTestId('civilization-identity-transition'))
      .toHaveTextContent('Echo architecture now leads');
    expect(screen.getByTestId('civilization-identity-transition')).not.toHaveTextContent('Bloom');
  });

  it('defaults planetary civilizations to the neutral authored world and preserves scale navigation', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={[site(1, { artifactSceneTreatment: 'ashroot_recovery' })]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('civilization-scene-details')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planet' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getAllByTestId('civilization-scale-active-indicator')).toHaveLength(1);
    expect(screen.getByTestId('civilization-scene-panel')).toHaveAttribute('data-render-generation', 'authored-world');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.environment.aurora_basin.orbit.cinematic');
    expect(screen.queryByTestId('civilization-evolved-plate-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scale-theater')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-archetype-atmosphere')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));

    expect(screen.getByTestId('civilization-artifact-structure-markers')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-command-frame')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-project-washes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'City' }));

    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.environment.aurora_basin.surface.city-1.neutral.cinematic');
    expect(screen.getByTestId('civilization-artifact-structure'))
      .toHaveAttribute('data-artifact-unit', 't1r01');

    fireEvent.click(screen.getByRole('button', { name: 'Planet' }));

    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.environment.aurora_basin.orbit.cinematic');
  });

  it('starts planetary Scan at the native City layer without changing the authored world', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#f97316', secondary: '#7c2d12', accent: '#fed7aa' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 1, continuum: 0, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['ignition'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'artifact:t1r01',
            artifactId: 't1r01',
            title: 'Ignition Kernel Trace',
            trait: 'ignition',
            affinity: 'flare',
            artifactVisualMotif: 'forge',
            artifactSceneTreatment: 'ignition_kernel',
          }),
        ]}
        forgedArtifacts={[artifact('t1r01', 'Ignition Kernel')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getByRole('button', { name: 'Scan' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('civilization-scan-map-pin'))
      .toHaveAttribute('data-artifact-id', 't1r01');
    expect(screen.getByTestId('civilization-scan-map-pin'))
      .toHaveAttribute('data-pin-presentation', 'artifact-structure');
    expect(screen.getByTestId('civilization-artifact-structure'))
      .toHaveAttribute('data-artifact-unit', 't1r01');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.environment.aurora_basin.surface.city-1.neutral.cinematic');
  });

  it('keeps physical Artifacts stable while Scan adds annotation-only identity pins', () => {
    const sites = [
      site(1, { artifactId: 't1r01', id: 'artifact:t1r01', affinity: 'flare' }),
      site(2, { artifactId: 't1r02', id: 'artifact:t1r02', affinity: 'verdance' }),
    ];

    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([
          artifact('t1r01', 'Ignition Kernel'),
          artifact('t1r02', 'Ashroot Bloom'),
        ])}
        progressFraction={1}
        paused
        defaultScene="surface"
        deploymentSites={sites}
        forgedArtifacts={[
          artifact('t1r01', 'Ignition Kernel'),
          artifact('t1r02', 'Ashroot Bloom'),
        ]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-artifact-manifestation-layer'))
      .toHaveAttribute('data-render-mode', 'portrait');
    expect(screen.getAllByTestId('civilization-artifact-structure')).toHaveLength(2);
    expect(screen.queryByTestId('civilization-artifact-structure-markers')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));

    expect(screen.getByTestId('civilization-artifact-manifestation-layer'))
      .toHaveAttribute('data-render-mode', 'scan-annotation');
    expect(screen.getAllByTestId('civilization-artifact-structure')).toHaveLength(2);
    expect(screen.getAllByTestId('civilization-scan-map-pin')).toHaveLength(2);
    expect(screen.getAllByTestId('civilization-scan-map-pin').map((pin) => pin.dataset.artifactId))
      .toEqual(expect.arrayContaining(['t1r01', 't1r02']));
    expect(screen.getAllByTestId('civilization-artifact-map-pin-art')).toHaveLength(2);
    expect(screen.queryByTestId('civilization-command-frame')).not.toBeInTheDocument();
  });

  it('uses the persistent environment and authored Artifact path without requiring the full Civilization state', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([artifact('t1r01', 'Ignition Kernel')])}
        progressFraction={1}
        paused
        defaultScene="surface"
        environmentIdentity={createCivilizationEnvironmentIdentity(
          'tutorial-environment-proof',
          'aurora_basin',
          'recorded',
        )}
        deploymentSites={[
          site(1, {
            id: 'artifact:t1r01',
            artifactId: 't1r01',
            affinity: 'flare',
            nativeArtworkLayer: 'surface',
            artifactManifestation: getArtifactManifestationProfile('t1r01'),
          }),
        ]}
        forgedArtifacts={[artifact('t1r01', 'Ignition Kernel')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-plate-art')).toHaveAttribute(
      'data-art-slot',
      'civilization.environment.aurora_basin.surface.city-1.neutral.cinematic',
    );
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-substrate', 'inhabited-growth');
    expect(screen.getByTestId('civilization-plate-art'))
      .not.toHaveAttribute('data-atlas-cell');
    expect(screen.getByTestId('civilization-artifact-manifestation-layer'))
      .toHaveAttribute('data-world-layout', 'invariant');
    expect(screen.getByTestId('civilization-artifact-structure'))
      .toHaveAttribute('data-artifact-unit', 't1r01');
    expect(screen.getByTestId('civilization-scene-panel'))
      .toHaveAttribute('data-render-generation', 'authored-world');
    expect(screen.queryByTestId('civilization-materialized-sites')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scale-theater')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-project-washes')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-command-frame')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scan-focus')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));

    expect(screen.queryByTestId('civilization-scale-theater')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-project-washes')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-command-frame')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scan-focus')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-scan-map-pin')).toBeInTheDocument();
  });

  it('changes Surface atmosphere without moving the shared construction plan', () => {
    const renderPanel = (variantId: 'aurora_basin' | 'obsidian_steppe') => (
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([artifact('t1r01', 'Ignition Kernel')])}
        progressFraction={1}
        paused
        defaultScene="surface"
        environmentIdentity={createCivilizationEnvironmentIdentity(
          `shared-plan:${variantId}`,
          variantId,
          'recorded',
        )}
        deploymentSites={[
          site(1, {
            id: 'artifact:t1r01',
            artifactId: 't1r01',
            affinity: 'flare',
            nativeArtworkLayer: 'surface',
            artifactManifestation: getArtifactManifestationProfile('t1r01'),
          }),
        ]}
        forgedArtifacts={[artifact('t1r01', 'Ignition Kernel')]}
        onOpenArtifact={vi.fn()}
      />
    );
    const { rerender } = render(renderPanel('aurora_basin'));
    const auroraPlate = screen.getByTestId('civilization-plate-art');
    const auroraSrc = auroraPlate.getAttribute('src');
    const auroraPosition = auroraPlate.style.objectPosition;
    const auroraFilter = auroraPlate.style.filter;

    expect(auroraPlate).toHaveAttribute(
      'data-construction-plan',
      CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID,
    );
    expect(screen.getByTestId('civilization-environment-dressing'))
      .toHaveAttribute('data-environment-dressing', 'aurora_basin');

    rerender(renderPanel('obsidian_steppe'));

    const obsidianPlate = screen.getByTestId('civilization-plate-art');
    expect(obsidianPlate.getAttribute('src')).toBe(auroraSrc);
    expect(obsidianPlate.style.objectPosition).toBe(auroraPosition);
    expect(obsidianPlate.style.filter).not.toBe(auroraFilter);
    expect(obsidianPlate).toHaveAttribute(
      'data-construction-plan',
      CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID,
    );
    expect(screen.getByTestId('civilization-environment-dressing'))
      .toHaveAttribute('data-environment-dressing', 'obsidian_steppe');
  });

  it('links each annotation-only Scan pin to its matching physical Artifact manifestation', () => {
    const sites = [
      site(1, { artifactId: 't1r01', id: 'artifact:t1r01', affinity: 'flare' }),
      site(2, { artifactId: 't1r02', id: 'artifact:t1r02', affinity: 'verdance' }),
    ];

    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([
          artifact('t1r01', 'Ignition Kernel'),
          artifact('t1r02', 'Ashroot Bloom'),
        ])}
        progressFraction={1}
        paused
        defaultScene="surface"
        defaultScanActive
        deploymentSites={sites}
        forgedArtifacts={[
          artifact('t1r01', 'Ignition Kernel'),
          artifact('t1r02', 'Ashroot Bloom'),
        ]}
        onOpenArtifact={vi.fn()}
      />,
    );

    const secondPin = screen.getAllByTestId('civilization-scan-map-pin')
      .find((element) => element.dataset.artifactId === 't1r02');
    const secondManifestation = screen.getAllByTestId('civilization-artifact-structure')
      .find((element) => element.dataset.artifactUnit === 't1r02');
    const firstManifestation = screen.getAllByTestId('civilization-artifact-structure')
      .find((element) => element.dataset.artifactUnit === 't1r01');

    expect(secondPin).toHaveAttribute('data-pin-link-state', 'available');
    expect(firstManifestation).toHaveAttribute('data-scan-link-state', 'available');
    expect(secondManifestation).toHaveAttribute('data-scan-link-state', 'available');

    fireEvent.pointerEnter(secondPin!);

    expect(secondPin).toHaveAttribute('data-pin-link-state', 'linked');
    expect(firstManifestation).toHaveAttribute('data-scan-link-state', 'available');
    expect(secondManifestation).toHaveAttribute('data-scan-link-state', 'linked');
    expect(screen.getByTestId('civilization-artifact-pin-host-link'))
      .toHaveAttribute('data-site-id', 'artifact:t1r02');
  });

  it('can expose every real Artifact identity pin in the comparison lab', () => {
    const sites = Array.from({ length: 7 }, (_, index) => site(index + 1));

    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile(sites.map((entry) => artifact(entry.artifactId!, entry.title)))}
        progressFraction={1}
        paused
        defaultScene="surface"
        defaultScanActive
        showAllArtifactPins
        deploymentSites={sites}
        forgedArtifacts={sites.map((entry) => artifact(entry.artifactId!, entry.title))}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId('civilization-scan-map-pin')).toHaveLength(7);
    expect(screen.getAllByTestId('civilization-scan-map-pin').every((marker) => (
      marker.getAttribute('data-marker-mode') === 'artifact-structure'
    ))).toBe(true);
  });

  it('keeps compact Scan annotations individually separated around their physical hosts', () => {
    const crowdedSites = Array.from({ length: 12 }, (_, index) => site(index + 1, {
      id: `artifact:crowded-${index}`,
      artifactId: ARTIFACT_CATALOG[index]!.id,
      anchor: { x: 50, y: 50 },
    }));
    const anchors = [...resolveCivilizationScanMarkerAnchors(crowdedSites, undefined, true).values()];

    expect(anchors).toHaveLength(12);
    expect(new Set(anchors.map((anchor) => `${anchor.x}:${anchor.y}`)).size).toBe(12);
    anchors.forEach((anchor, index) => {
      anchors.slice(index + 1).forEach((other) => {
        expect(
          Math.abs(anchor.x - other.x) >= 14 ||
          Math.abs(anchor.y - other.y) >= 12,
        ).toBe(true);
      });
    });
  });

  it.each([
    { width: 498, height: 280, hitSize: 32 },
    { width: 818, height: 460, hitSize: 44 },
    { width: 293, height: 366, hitSize: 32 },
  ])('fits all 45 resident markers at $width×$height with clearance even when selected', dimensions => {
    const crowdedSites = Array.from({ length: 45 }, (_, index) => site(index, {
      anchor: { x: 20 + (index % 5) * 15, y: 60 + (index % 3) * 10 },
    }));
    const resolved = resolveCivilizationScanMarkerAnchors(crowdedSites, undefined, false, false, dimensions);
    expect(resolved.size).toBe(45);
    const points = [...resolved.values()].map(point => ({
      x: point.x * dimensions.width / 100, y: point.y * dimensions.height / 100,
    }));
    const halfSize = dimensions.hitSize * 1.16 / 2;
    points.forEach((point, index) => {
      expect(point.x - halfSize).toBeGreaterThanOrEqual(0);
      expect(point.x + halfSize).toBeLessThanOrEqual(dimensions.width);
      expect(point.y - halfSize).toBeGreaterThanOrEqual(0);
      expect(point.y + halfSize).toBeLessThanOrEqual(dimensions.height);
      points.slice(index + 1).forEach(other => {
        expect(Math.abs(point.x - other.x) >= halfSize * 2 || Math.abs(point.y - other.y) >= halfSize * 2).toBe(true);
      });
    });
    expect(resolveCivilizationScanMarkerAnchors([...crowdedSites].reverse(), undefined, false, false, dimensions)).toEqual(resolved);
  });

  it('keeps dense compact Scan annotations close while preserving marker clearance', () => {
    const crowdedSites = Array.from({ length: 40 }, (_, index) => site(index + 1, {
      id: `artifact:dense-${index}`,
      anchor: { x: 50, y: 50 },
    }));
    const anchors = [...resolveCivilizationScanMarkerAnchors(crowdedSites, undefined, true).values()];

    expect(anchors).toHaveLength(40);
    expect(Math.max(...anchors.map((anchor) => Math.hypot(anchor.x - 50, anchor.y - 50))))
      .toBeLessThanOrEqual(62);
    anchors.forEach((anchor, index) => {
      anchors.slice(index + 1).forEach((other) => {
        expect(
          Math.abs(anchor.x - other.x) >= 12.79 ||
          Math.abs(anchor.y - other.y) >= 10.59,
        ).toBe(true);
      });
    });
  });

  it('opens and closes Scan without adding a blocking guidance overlay', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([artifact('t1r01', 'Ignition Kernel')])}
        progressFraction={1}
        paused
        guidanceEnabled
        deploymentSites={[site(1, { id: 'artifact:t1r01', artifactId: 't1r01' })]}
        forgedArtifacts={[artifact('t1r01', 'Ignition Kernel')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    const portraitTransform = screen.getByTestId('civilization-plate-art').style.transform;
    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));
    expect(screen.getByTestId('civilization-artifact-structure-markers')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-plate-art')).toHaveAttribute('data-scan-geometry', 'invariant');
    expect(screen.getByTestId('civilization-plate-art').style.transform).toBe(portraitTransform);
    expect(screen.queryByTestId('civilization-scan-guide')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));
    expect(screen.queryByTestId('civilization-artifact-structure-markers')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-plate-art').style.transform).toBe(portraitTransform);
    expect(screen.queryByTestId('civilization-scan-guide')).not.toBeInTheDocument();
  });


  it('keeps Artifact dossiers hidden until annotation-only Scan is opened', () => {
    const card = artifact('t1r01', 'Ashroot Bloom');
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([card])}
        progressFraction={1}
        paused
        defaultScene="surface"
        deploymentSites={[site(1)]}
        forgedArtifacts={[card]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-artifact-structure')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Inspect Deployment Site 1/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Deployment Site 1 dossier')).not.toBeInTheDocument();
    const restingCameraTransform = screen.getByTestId('civilization-scene-camera').style.transform;

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));

    expect(getScanMapPin('artifact:t1r01')).toBeInTheDocument();
    fireEvent.click(getScanMapPin('artifact:t1r01'));

    expect(getScanMapPin('artifact:t1r01')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('civilization-artifact-selection-toolbar')).toHaveTextContent('1 selected');
    expect(screen.queryByLabelText('Deployment Site 1 dossier')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-scene-camera')).toHaveAttribute('data-camera-shift', 'resting');

    fireEvent.doubleClick(getScanMapPin('artifact:t1r01'));

    const dossier = screen.getByLabelText('Deployment Site 1 dossier');
    expect(dossier).toBeInTheDocument();
    expect(dossier).toHaveAttribute('data-dossier-side');
    expect(dossier).toHaveAttribute('data-dossier-vertical-side');
    expect(screen.getByTestId('civilization-dossier-district')).toHaveTextContent(/district/i);
    expect(screen.getByTestId('civilization-dossier-details')).not.toHaveAttribute('open');
    expect(screen.getByTestId('civilization-dossier-scale-kicker'))
      .toHaveTextContent('Native City detail');
    expect(screen.getByTestId('civilization-scene-camera')).toHaveAttribute('data-camera-shift', 'artifact-focus');
    expect(screen.getByTestId('civilization-scene-camera')).not.toHaveAttribute('data-camera-focus-offset', '0,0');
    expect(screen.getByTestId('civilization-scene-camera').style.transform).not.toBe(restingCameraTransform);
    expect(screen.getByTestId('civilization-return-overview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ashroot Bloom/i })).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-focused-deployment-projection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-command-frame')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('civilization-return-overview'));

    expect(screen.queryByLabelText('Deployment Site 1 dossier')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-scene-camera')).toHaveAttribute('data-camera-shift', 'resting');
  });

  it('multi-selects damaged Artifacts and offers free queued repair in both selection and dossier views', async () => {
    const repairArtifacts = vi.fn();
    const sites = [
      site(1, { id: 'artifact:t1r01', artifactId: 't1r01', implementationState: 'damaged' }),
      site(2, { id: 'artifact:t1r02', artifactId: 't1r02', implementationState: 'damaged' }),
    ];

    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([
          artifact('t1r01', 'Ignition Kernel'),
          artifact('t1r02', 'Ashroot Bloom'),
        ])}
        progressFraction={1}
        paused
        defaultScene="surface"
        defaultScanActive
        deploymentSites={sites}
        forgedArtifacts={[
          artifact('t1r01', 'Ignition Kernel'),
          artifact('t1r02', 'Ashroot Bloom'),
        ]}
        onRepairArtifacts={repairArtifacts}
        onOpenArtifact={vi.fn()}
      />,
    );

    fireEvent.click(getScanMapPin('artifact:t1r01'));
    fireEvent.click(getScanMapPin('artifact:t1r02'));

    expect(screen.getByTestId('civilization-artifact-selection-toolbar')).toHaveTextContent('2 selected');
    expect(screen.getByTestId('civilization-repair-action')).toHaveAttribute('data-repair-state', 'ready');
    expect(screen.getByTestId('civilization-repair-action')).toHaveTextContent('Repair 2 Artifacts');

    await act(async () => {
      fireEvent.click(screen.getByTestId('civilization-repair-action'));
    });

    expect(repairArtifacts).toHaveBeenCalledWith(['t1r01', 't1r02']);

    fireEvent.doubleClick(getScanMapPin('artifact:t1r01'));

    expect(screen.queryByTestId('civilization-artifact-selection-toolbar')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Deployment Site 1 dossier')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-repair-action')).toHaveTextContent('Repair Artifact');
  });

  it('distinguishes damaged, queued, and restored Artifact states without overstating repair eligibility', async () => {
    const healthySite = site(1, {
      id: 'artifact:t1r01',
      artifactId: 't1r01',
      implementationState: 'operational',
    });
    const damagedSite = site(2, {
      id: 'artifact:t1r02',
      artifactId: 't1r02',
      implementationState: 'damaged',
    });
    const sharedProps = {
      tier: 1 as const,
      palette: { primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' },
      profile: buildCivilizationProfile([
        artifact('t1r01', 'Ignition Kernel'),
        artifact('t1r02', 'Ashroot Bloom'),
      ]),
      progressFraction: 1,
      paused: true,
      defaultScene: 'surface' as const,
      defaultScanActive: true,
      forgedArtifacts: [
        artifact('t1r01', 'Ignition Kernel'),
        artifact('t1r02', 'Ashroot Bloom'),
      ],
      onRepairArtifacts: vi.fn(),
      onOpenArtifact: vi.fn(),
    };
    const { rerender } = render(
      <CivilizationScenePanel
        {...sharedProps}
        deploymentSites={[healthySite, damagedSite]}
        pendingRepairArtifactIds={[]}
      />,
    );

    expect(getScanMapPin('artifact:t1r02')).toHaveAttribute('data-operational-state', 'damaged');
    expect(screen.getByTestId('civilization-artifact-damaged-badge')).toBeInTheDocument();
    fireEvent.click(getScanMapPin('artifact:t1r01'));
    expect(screen.getByTestId('civilization-artifact-selection-toolbar'))
      .toHaveTextContent('1 selected · 0 repairable');
    expect(screen.getByTestId('civilization-repair-action'))
      .toHaveTextContent('No damaged Artifacts selected');
    expect(screen.getByTestId('civilization-repair-action')).toBeDisabled();

    rerender(
      <CivilizationScenePanel
        {...sharedProps}
        deploymentSites={[healthySite, damagedSite]}
        pendingRepairArtifactIds={['t1r02']}
      />,
    );
    expect(getScanMapPin('artifact:t1r02')).toHaveAttribute('data-repair-state', 'queued');
    expect(screen.getByTestId('civilization-artifact-repair-queued-badge')).toBeInTheDocument();

    rerender(
      <CivilizationScenePanel
        {...sharedProps}
        deploymentSites={[healthySite, { ...damagedSite, implementationState: 'operational' }]}
        pendingRepairArtifactIds={[]}
      />,
    );
    expect(await screen.findByTestId('civilization-repair-complete-notice'))
      .toHaveTextContent('1 Artifact restored');
    expect(screen.getByTestId('civilization-artifact-repair-ring')).toBeInTheDocument();
    expect(getScanMapPin('artifact:t1r02')).toHaveAttribute('data-repair-state', 'restored');
  });

  it('restores the originating scale after native-scale inspection', () => {
    const blueprintSite = site(1, {
      id: 'blueprint:bp_antimatter_detonator',
      kind: 'blueprint',
      blueprintId: 'bp_antimatter_detonator',
      artifactId: undefined,
      scaleBand: 'stellar',
      title: 'Antimatter Quarantine Orbit',
      relatedArtifactIds: [],
    });
    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([])}
        progressFraction={1}
        paused
        defaultScene="galaxy"
        deploymentSites={[blueprintSite]}
        forgedArtifacts={[]}
        onOpenArtifact={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));
    expect(screen.getByRole('button', { name: 'Galaxy' })).toHaveAttribute('data-active-scale', 'true');
    fireEvent.click(getScanMapPin('blueprint:bp_antimatter_detonator'));
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('data-active-scale', 'true');
    fireEvent.click(screen.getByTestId('civilization-return-overview'));
    expect(screen.getByRole('button', { name: 'Galaxy' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getByTestId('civilization-scene-camera')).toHaveAttribute('data-camera-shift', 'resting');
  });

  it('uses Space for multi-select and Enter for inspection on Artifact pins', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([artifact('t1r01', 'Ashroot Bloom')])}
        progressFraction={1}
        paused
        defaultScene="surface"
        defaultScanActive
        deploymentSites={[site(1, { id: 'artifact:t1r01', artifactId: 't1r01' })]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    const pin = getScanMapPin('artifact:t1r01');
    fireEvent.keyDown(pin, { key: ' ' });
    expect(pin).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(pin, { key: 'Enter' });
    expect(screen.getByLabelText('Deployment Site 1 dossier')).toBeInTheDocument();
  });


  it('opens recent local-scale work at its native authored layer', async () => {
    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={buildCivilizationProfile([artifact('t1r01', 'Ashroot Bloom')])}
        progressFraction={1}
        paused
        deploymentSites={[site(1, { title: 'Ashroot Bloom Trace' })]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        externalRecentSiteIds={['artifact:t1r01']}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(await screen.findByText(/New work realized \/\/ Ashroot Bloom Trace/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.environment.aurora_basin.surface.city-1.neutral.cinematic');
    expect(screen.queryByTestId('civilization-trace-reveal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Scan/i }));
    fireEvent.doubleClick(getScanMapPin('artifact:t1r01'));

    expect(screen.getByLabelText('Ashroot Bloom Trace dossier')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-dossier-scale-kicker'))
      .toHaveTextContent('Native City detail');
  });

  it('keeps manifested Blueprint structures stable while Scan adds identification only', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#f87171', secondary: '#3f0f1a', accent: '#fecdd3' }}
        profile={buildCivilizationProfile([artifact('t1p04', 'Magnetic Bottle')])}
        progressFraction={1}
        paused
        deploymentSites={[
          site(1, {
            id: 'blueprint:bp_antimatter_detonator',
            kind: 'blueprint',
            blueprintId: 'bp_antimatter_detonator',
            blueprintManifestationScale: 'satellite',
            blueprintManifestationMotion: 'gimbaled_orbit',
            artifactId: undefined,
            representationMode: 'blueprint_consequence',
            sourceQuality: 'authored',
            priority: 1000,
            title: 'Antimatter Quarantine Orbit',
            relatedArtifactIds: [],
          }),
          site(2, {
            id: 'artifact:t1p04',
            artifactId: 't1p04',
            artifactTier: 1,
            blueprintFamilies: 'Antimatter Detonator',
            title: 'Magnetic Bottle Trace',
          }),
        ]}
        forgedArtifacts={[artifact('t1p04', 'Magnetic Bottle')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    const portraitDevice = screen.getByTestId('civilization-blueprint-antimatter-device');
    expect(screen.getByTestId('civilization-blueprint-antimatter-native'))
      .toHaveAttribute('data-manifestation-scale', 'satellite');
    expect(screen.getByTestId('civilization-blueprint-antimatter-native'))
      .toHaveAttribute('data-manifestation-socket', 'stellar:outer_system:0');
    expect(screen.queryByTestId('civilization-project-zones')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /scan/i }));

    expect(screen.getByTestId('civilization-blueprint-antimatter-device')).toBe(portraitDevice);
    expect(screen.queryByTestId('civilization-project-zones')).not.toBeInTheDocument();
    expect(getScanMapPin('blueprint:bp_antimatter_detonator')).toBeInTheDocument();
    expect(getScanMapPin('blueprint:bp_antimatter_detonator'))
      .toHaveAttribute(
        'data-world-anchor',
        screen.getByTestId('civilization-blueprint-antimatter-native')
          .getAttribute('data-world-anchor'),
      );
    expect(Number(getScanMapPin('blueprint:bp_antimatter_detonator').getAttribute('data-pin-offset')))
      .toBeGreaterThan(0);
    expect(screen.queryByTestId('civilization-environment-signatures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-trait-signatures')).not.toBeInTheDocument();
  });

  it('keeps every manifested Blueprint physically present when Scan is toggled', () => {
    const blueprintSites = [
      site(1, {
        id: 'blueprint:bp_antimatter_detonator',
        kind: 'blueprint',
        blueprintId: 'bp_antimatter_detonator',
        blueprintManifestationScale: 'satellite',
        blueprintManifestationMotion: 'gimbaled_orbit',
        artifactId: undefined,
        scaleBand: 'stellar',
        representationMode: 'blueprint_consequence',
        sourceQuality: 'authored',
        title: 'Antimatter Quarantine Orbit',
        relatedArtifactIds: [],
      }),
      site(2, {
        id: 'blueprint:bp_mantle_to_orbit_foundry',
        kind: 'blueprint',
        blueprintId: 'bp_mantle_to_orbit_foundry',
        artifactId: undefined,
        scaleBand: 'planetary',
        representationMode: 'blueprint_consequence',
        sourceQuality: 'authored',
        title: 'Mantle-to-Orbit Foundry',
        relatedArtifactIds: [],
      }),
      site(3, {
        id: 'blueprint:bp_ascension_registry',
        kind: 'blueprint',
        blueprintId: 'bp_ascension_registry',
        blueprintManifestationScale: 'distributed',
        blueprintManifestationMotion: 'signal_constellation',
        artifactId: undefined,
        scaleBand: 'stellar',
        representationMode: 'blueprint_consequence',
        sourceQuality: 'authored',
        title: 'Ascension Registry',
        relatedArtifactIds: [],
      }),
      site(4, {
        id: 'blueprint:bp_worldshield_covenant',
        kind: 'blueprint',
        blueprintId: 'bp_worldshield_covenant',
        artifactId: undefined,
        scaleBand: 'planetary',
        representationMode: 'blueprint_consequence',
        sourceQuality: 'authored',
        title: 'Worldshield Covenant',
        relatedArtifactIds: [],
      }),
    ];

    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#dfb86b', secondary: '#5f3417', accent: '#ffe4a3' }}
        profile={{
          key: 'all-blueprints-test',
          seed: 1,
          artifactCount: 0,
          affinityCounts: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['accord'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="galaxy"
        showAllArtifactPins
        deploymentSites={blueprintSites}
        forgedArtifacts={[]}
        onOpenArtifact={vi.fn()}
      />,
    );

    const blueprintTestIds = [
      'civilization-blueprint-antimatter-native',
      'civilization-blueprint-mantle-native',
      'civilization-blueprint-ascension-native',
      'civilization-blueprint-worldshield-native',
    ];
    const physicalBlueprints = blueprintTestIds.map((testId) => screen.getByTestId(testId));
    const physicalStyles = physicalBlueprints.map((element) => element.getAttribute('style'));
    expect(screen.getByTestId('civilization-blueprint-mantle-native'))
      .toHaveAttribute('data-representation-mode', 'distant-consequence');
    expect(screen.getByTestId('civilization-blueprint-worldshield-native'))
      .toHaveAttribute('data-representation-mode', 'distant-consequence');

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));

    blueprintTestIds.forEach((testId, index) => {
      const manifestation = screen.getByTestId(testId);
      expect(manifestation).toBe(physicalBlueprints[index]);
      expect(manifestation.getAttribute('style')).toBe(physicalStyles[index]);
      expect(manifestation.querySelector('img')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('civilization-project-zones')).not.toBeInTheDocument();
  });

  it('renders Ascension Registry as a physical distributed stellar institution', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#dfb86b', secondary: '#4b3f1f', accent: '#fff4c2' }}
        profile={{
          key: 'ascension-registry-test',
          seed: 3,
          artifactCount: 0,
          affinityCounts: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 3 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['accord'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="stellar"
        deploymentSites={[
          site(1, {
            id: 'blueprint:bp_ascension_registry',
            kind: 'blueprint',
            blueprintId: 'bp_ascension_registry',
            blueprintManifestationScale: 'distributed',
            blueprintManifestationMotion: 'signal_constellation',
            artifactId: undefined,
            scaleBand: 'stellar',
            representationMode: 'blueprint_consequence',
            sourceQuality: 'authored',
            title: 'Ascension Registry Beacon',
            relatedArtifactIds: [],
          }),
        ]}
        forgedArtifacts={[]}
        onOpenArtifact={vi.fn()}
      />,
    );

    const registry = screen.getByTestId('civilization-blueprint-ascension-native');
    expect(registry).toHaveAttribute('data-manifestation-scale', 'distributed');
    expect(registry).toHaveAttribute('data-manifestation-motion', 'signal_constellation');
    expect(registry.querySelector('img')).toBeInTheDocument();
    expect(registry.querySelector('svg')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /scan/i }));
    expect(screen.getByTestId('civilization-blueprint-ascension-native')).toBe(registry);
    expect(screen.queryByTestId('civilization-project-zones')).not.toBeInTheDocument();
  });

  it('reveals major Blueprint work at its authored scale before civilization maturity catches up', () => {
    const antimatterSite = site(1, {
      id: 'blueprint:bp_antimatter_detonator',
      kind: 'blueprint',
      scaleBand: 'stellar',
      blueprintId: 'bp_antimatter_detonator',
      artifactId: undefined,
      representationMode: 'blueprint_consequence',
      sourceQuality: 'authored',
      priority: 1000,
      title: 'Antimatter Quarantine Orbit',
      relatedArtifactIds: [],
    });

    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#f87171', secondary: '#3f0f1a', accent: '#fecdd3' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 0,
          affinityCounts: { flare: 0, continuum: 0, verdance: 0, abyss: 1, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['containment'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        showAllArtifactPins
        deploymentSites={[antimatterSite]}
        forgedArtifacts={[]}
        externalRecentSiteIds={[antimatterSite.id]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Scan/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('civilization-blueprint-antimatter-native')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-blueprint-antimatter-device')).toBeInTheDocument();
  });




  it('keeps the compact portrait clean until Scan is opened', () => {
    mobileState.isMobile = true;
    const sites: CivilizationDeploymentSite[] = [
      site(1, {
        id: 'blueprint:bp_mantle_to_orbit_foundry',
        kind: 'blueprint',
        blueprintId: 'bp_mantle_to_orbit_foundry',
        artifactId: undefined,
        relatedArtifactIds: [],
        representationMode: 'blueprint_consequence',
        priority: 1000,
        title: 'Mantle-to-Orbit Freight Lane',
      }),
      site(2, {
        id: 'luminary:lum_flare',
        kind: 'luminary',
        artifactId: undefined,
        relatedArtifactIds: [],
        representationMode: 'luminary_influence',
        priority: 900,
        title: 'Flare Luminary Pressure',
      }),
      site(3, {
        id: 'artifact:t1s02',
        artifactId: 't1s02',
        artifactTier: 1,
        depictionScale: 'room',
        scalePresence: 'deployment_site',
        nativeArtworkLayer: 'surface',
        representationMode: 'civilization_infrastructure',
        artifactVisualMotif: 'coil',
        priority: 110,
        title: 'Mantlelift Driver Coil Trace',
        visibleAs: 'interplanetary freight lanes fed by city lift coils',
        laneLabel: 'Orbital logistics',
      }),
    ];

    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#dfb86b', secondary: '#3f2d12', accent: '#ffe4a3' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 3,
          affinityCounts: { flare: 1, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit', 'ignition'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={sites}
        forgedArtifacts={[artifact('t1s02', 'Mantlelift Driver Coil')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('civilization-scene-deployment-ledger')).not.toBeInTheDocument();
    expect(screen.queryByText('Mantle-to-Orbit Freight Lane')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));
    expect(screen.getByRole('button', { name: /Inspect Blueprint Mantle-to-Orbit Freight Lane/i }))
      .toBeInTheDocument();
    expect(screen.getByTestId('civilization-blueprint-map-pin-art')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-blueprint-paper-badge')).toBeInTheDocument();
  });

  it('announces newly realized work without covering the physical manifestation', () => {
    const firstSite = site(1, { title: 'Ashroot Bloom Trace' });
    const secondSite = site(2, {
      id: 'artifact:t1s02',
      artifactId: 't1s02',
      title: 'Mantlelift Driver Coil Trace',
    });
    const firstCard = artifact('t1r01', 'Ashroot Bloom');
    const secondCard = artifact('t1s02', 'Mantlelift Driver Coil');
    const props = {
      tier: 2 as const,
      palette: { primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' },
      profile: buildCivilizationProfile([firstCard]),
      progressFraction: 1,
      paused: true,
      onOpenArtifact: vi.fn(),
    };

    const { rerender } = render(
      <CivilizationScenePanel
        {...props}
        deploymentSites={[firstSite]}
        forgedArtifacts={[firstCard]}
      />,
    );

    rerender(
      <CivilizationScenePanel
        {...props}
        profile={buildCivilizationProfile([firstCard, secondCard])}
        deploymentSites={[firstSite, secondSite]}
        forgedArtifacts={[firstCard, secondCard]}
      />,
    );

    expect(screen.getByText(/New work realized \/\/ Mantlelift Driver Coil Trace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Scan/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByTestId('civilization-artifact-structure')).toHaveLength(2);
    expect(screen.queryByTestId('civilization-trace-reveal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Scan/i }));

    expect(getScanMapPin('artifact:t1s02'))
      .toHaveAttribute('data-pin-state', 'focused');
  });


  it('opens non-Artifact recent work on its native scale without a decorative reveal overlay', () => {
    const blueprintSite = site(1, {
      id: 'blueprint:bp_mantle_to_orbit_foundry',
      kind: 'blueprint',
      scaleBand: 'planetary',
      artifactId: undefined,
      blueprintId: 'bp_mantle_to_orbit_foundry',
      representationMode: 'blueprint_consequence',
      title: 'Mantle-to-Orbit Freight Lane',
      visibleAs: 'a forged ascent corridor connecting deep crust to orbital industry',
      relatedArtifactIds: [],
    });

    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#dfb86b', secondary: '#5f3813', accent: '#fff0b8' }}
        profile={buildCivilizationProfile([])}
        progressFraction={1}
        paused
        defaultScanActive
        defaultScene="surface"
        deploymentSites={[blueprintSite]}
        externalRecentSiteIds={[blueprintSite.id]}
        forgedArtifacts={[]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByText(/New work realized \/\/ Mantle-to-Orbit Freight Lane/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planet' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.queryByTestId('civilization-trace-reveal')).not.toBeInTheDocument();

    fireEvent.click(getScanMapPin('blueprint:bp_mantle_to_orbit_foundry'));

    expect(screen.getByLabelText('Mantle-to-Orbit Freight Lane dossier')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-dossier-scale-kicker'))
      .toHaveAttribute('data-native-scale', 'orbit');
  });

  it('keeps externally pending work highlighted until it is acknowledged', () => {
    vi.useFakeTimers();
    const acknowledge = vi.fn();

    try {
      render(
        <CivilizationScenePanel
          tier={2}
          palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
          profile={buildCivilizationProfile([
            artifact('t1r01', 'Ashroot Bloom'),
            artifact('t1s02', 'Mantlelift Driver Coil'),
          ])}
          progressFraction={1}
          paused
          deploymentSites={[
            site(1, { title: 'Ashroot Bloom Trace' }),
            site(2, {
              id: 'artifact:t1s02',
              artifactId: 't1s02',
              title: 'Mantlelift Driver Coil Trace',
              trait: 'transit',
              affinity: 'continuum',
              artifactSceneTreatment: 'mantlelift_driver',
            }),
          ]}
          forgedArtifacts={[
            artifact('t1r01', 'Ashroot Bloom'),
            artifact('t1s02', 'Mantlelift Driver Coil'),
          ]}
          externalRecentSiteIds={['artifact:t1s02']}
          onRecentSiteIdsSeen={acknowledge}
          onOpenArtifact={vi.fn()}
        />,
      );

      expect(screen.getByText(/New work realized \/\/ Mantlelift Driver Coil Trace/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^Scan/i }));

      expect(getScanMapPin('artifact:t1s02'))
        .toHaveAttribute('data-pin-state', 'focused');
      expect(acknowledge).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(6_500);
      });

      expect(acknowledge).toHaveBeenCalledWith(['artifact:t1s02']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens related Artifact sheets from an authored Scan dossier', () => {
    const handleOpenArtifact = vi.fn();
    const card = artifact('t1r01', 'Ashroot Bloom');

    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([card])}
        progressFraction={1}
        paused
        defaultScanActive
        defaultScene="surface"
        deploymentSites={[site(1)]}
        forgedArtifacts={[card]}
        onOpenArtifact={handleOpenArtifact}
      />,
    );

    fireEvent.doubleClick(getScanMapPin('artifact:t1r01'));
    fireEvent.click(screen.getByRole('button', { name: /Ashroot Bloom/i }));

    expect(handleOpenArtifact).toHaveBeenCalledWith(card);
  });

  it('presents selected physical Artifacts as source-to-civilization intelligence', () => {
    const card = artifact('t1r01', 'Ashroot Bloom');

    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile([card])}
        progressFraction={1}
        paused
        defaultScanActive
        defaultScene="surface"
        deploymentSites={[site(1)]}
        forgedArtifacts={[card]}
        onOpenArtifact={vi.fn()}
      />,
    );

    fireEvent.doubleClick(getScanMapPin('artifact:t1r01'));

    expect(screen.getByTestId('civilization-dossier-source-label')).toHaveTextContent('Ashroot Bloom');
    expect(screen.getByTestId('civilization-dossier-source-artifacts')).toHaveTextContent('Inspect artifact record');
    expect(screen.getByTestId('civilization-dossier-intelligence')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Function tags' })).toBeVisible();
    expect(screen.getByTestId('artifact-function-tags')).toHaveTextContent('Energy');
  });

  it('reports each Coastal parcel occupancy from its actual persisted residents', () => {
    const ids = getCivilizationSaturatedPreviewIds('chrysalis', true);
    const cards = ids.map((id) => ({ ...ARTIFACT_CATALOG.find((card) => card.id === id)!, name: id, flavor: '' }));
    let state = createInitialCivilizationState();
    ids.forEach((artifactId, index) => {
      state.artifacts[artifactId] = {
        artifactId, firstMasteredTurnCount: index + 1, masteryCount: 1,
        implementationState: 'operational', implementationStateChangedTurnCount: index + 1,
        implementationChangeSource: null, historyEvidence: 'recorded',
      };
      state = reconcileCivilizationDerivedState(state, [], index + 1, {}, { commitPresentation: true });
    });
    const civilization = civilizationTransitionFixture('chrysalis', ids.length, 'chrysalis');
    civilization.districtIdentity = state.districtIdentity;
    civilization.manifestationAssignments = Object.values(state.manifestationAssignments);
    civilization.artifacts = Object.values(state.artifacts).map((artifact) => ({
      ...artifact, changeSourceType: null,
    }));
    const sites = buildCivilizationDeploymentSites({
      forgedArtifacts: cards, tier: 3, manifestationAssignments: civilization.manifestationAssignments,
    });
    render(<CivilizationScenePanel
      tier={3} palette={{ primary: '#f97316', secondary: '#7c3aed', accent: '#fde68a' }}
      profile={buildCivilizationProfile(cards)} progressFraction={1} paused placementProof
      defaultScanActive defaultScene="surface" deploymentSites={sites} forgedArtifacts={cards}
      civilization={civilization}
    />);
    const envelopes = screen.getAllByTestId('civilization-district-socket-envelope');
    expect(envelopes.find((element) => element.dataset.parcelId === 'coastal-east'))
      .toHaveAttribute('data-occupancy', '2');
    expect(envelopes.find((element) => element.dataset.parcelId === 'coastal-northeast'))
      .toHaveAttribute('data-occupancy', '3');
    expect(document.querySelector('[data-artifact-unit="t1s09"]'))
      .toHaveAttribute('data-district-parcel', 'coastal-northeast');
    expect(getScanMapPin('artifact:t1s09')).toBeInTheDocument();
  });

  it('reads the persistent district rather than inferring residents or dyad from the surrounding city', () => {
    const cards = ['t1r02', 't1p08', 't1s09'].map(id => ({
      ...ARTIFACT_CATALOG.find(card => card.id === id)!, name: CARD_NAME_FALLBACK[id], flavor: '',
    }));
    const civilization = civilizationTransitionFixture('echo', 12, 'chrysalis');
    const districtId = 'district:wilderness_margin:0';
    civilization.districtIdentity!.artifactAssignments = { t1r02: districtId, t1p08: districtId };
    civilization.districtIdentity!.districts[districtId] = {
      districtId, family: 'wilderness_margin', instance: 0,
      residentArtifactIds: ['t1r02', 't1p08'], residentAffinities: ['flare', 'radiance'],
      foundingAffinities: ['flare', 'radiance'], permanentDyad: 'vortex',
      softCapacity: 2, hardCapacity: 3, influence: 2,
      establishedTurnCount: 2, committedTurnCount: 4, historyEvidence: 'recorded',
    };
    civilization.artifacts = cards.map(card => ({
      artifactId: card.id, firstMasteredTurnCount: 2, masteryCount: 1,
      implementationState: card.id === 't1r02' ? 'damaged' : 'operational',
      implementationStateChangedTurnCount: 12, changeSourceType: null, historyEvidence: 'recorded',
    }));
    const sites = cards.map((card, index) => site(index + 1, {
      id: `artifact:${card.id}`, artifactId: card.id, title: card.name,
      affinity: card.bonusAffinity, relatedArtifactIds: [card.id],
      synergySummary: 'Unsupported city-wide partnership', supportingArtifactNames: ['Landfall Loom'],
    }));
    const props = {
      tier: 2 as const, palette: { primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' },
      profile: buildCivilizationProfile(cards), progressFraction: 1, paused: true,
      defaultScanActive: true, defaultScene: 'surface' as const,
      deploymentSites: sites, forgedArtifacts: cards, civilization, onOpenArtifact: vi.fn(),
    };
    const { rerender } = render(<CivilizationScenePanel {...props} />);
    fireEvent.doubleClick(getScanMapPin('artifact:t1p08'));
    const readout = screen.getByTestId('civilization-dossier-district-membership');
    expect(readout).toHaveAttribute('data-district-id', districtId);
    expect(readout).toHaveTextContent('Wilderness Margin 1 · Vortex');
    expect(readout).toHaveTextContent('2/3 residents · Influence 2 · Dyad locked');
    expect(within(readout).getAllByRole('listitem')).toHaveLength(2);
    expect(readout).toHaveTextContent('Ashroot Bloom');
    expect(readout).toHaveTextContent('Petrified Bloom');
    expect(readout).toHaveTextContent('Damaged');
    expect(readout).not.toHaveTextContent('Landfall Loom');
    expect(screen.queryByTestId('civilization-dossier-district')).not.toBeInTheDocument();
    expect(screen.queryByText('Unsupported city-wide partnership')).not.toBeInTheDocument();

    rerender(<CivilizationScenePanel {...props} civilization={{
      ...civilization,
      artifacts: civilization.artifacts.map(artifact => ({ ...artifact, implementationState: 'operational' })),
    }} />);
    expect(readout).not.toHaveTextContent('Damaged');
    expect(readout).toHaveTextContent('Influence 2 · Dyad locked');
    expect(within(readout).getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows Blueprint component and effect context in authored Scan dossiers', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={buildCivilizationProfile([])}
        progressFraction={1}
        paused
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'blueprint:bp_antimatter_detonator',
            kind: 'blueprint',
            blueprintId: 'bp_antimatter_detonator',
            artifactId: undefined,
            representationMode: 'blueprint_consequence',
            sourceQuality: 'authored',
            blueprintRole: 'Antimatter Detonator',
            componentSummary: 'Reaction Core / Containment Cage',
            gameplayEffect: 'A random Tier II Artifact becomes secretly marked.',
            title: 'Antimatter Quarantine Orbit',
            visibleAs: 'a cold red exclusion path around the inhabited system',
            relatedArtifactIds: [],
          }),
        ]}
        forgedArtifacts={[]}
        onOpenArtifact={vi.fn()}
      />,
    );

    fireEvent.click(getScanMapPin('blueprint:bp_antimatter_detonator'));

    expect(screen.getByTestId('civilization-dossier-source-label')).toHaveTextContent('Antimatter Detonator');
    expect(screen.getByText(/Reaction Core \/ Containment Cage/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier II Artifact becomes secretly marked/i)).toBeInTheDocument();
    expect(screen.getByTestId('civilization-site-art-slot'))
      .toHaveAttribute('data-art-slot', 'civilization.blueprint.bp_antimatter_detonator');
    expect(screen.queryByTestId('artifact-function-tags')).not.toBeInTheDocument();
  });







  it('renders the Mantle-to-Orbit Foundry as a stable authored lift and foundry chain', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#dfb86b', secondary: '#5f3417', accent: '#ffe4a3' }}
        profile={buildCivilizationProfile([])}
        progressFraction={1}
        paused
        deploymentSites={[
          site(1, {
            id: 'blueprint:bp_mantle_to_orbit_foundry',
            kind: 'blueprint',
            blueprintId: 'bp_mantle_to_orbit_foundry',
            artifactId: undefined,
            scaleBand: 'planetary',
            representationMode: 'blueprint_consequence',
            sourceQuality: 'authored',
            componentSummary: 'Ignition / Coil / Die',
            gameplayEffect: 'Artifacts can be assembled into a civilization-scale launch project.',
            title: 'Mantle-to-Orbit Freight Lane',
            visibleAs: 'a forged ascent corridor connecting deep crust to orbital industry',
            relatedArtifactIds: [],
          }),
        ]}
        forgedArtifacts={[]}
        onOpenArtifact={vi.fn()}
      />,
    );

    const foundry = screen.getByTestId('civilization-blueprint-mantle-native');
    expect(screen.queryByTestId('civilization-project-zones')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));

    expect(screen.getByTestId('civilization-blueprint-mantle-native')).toBe(foundry);
    expect(screen.queryByTestId('civilization-project-zones')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scale-theater')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inspect Blueprint Mantle-to-Orbit Freight Lane/i }))
      .toBeInTheDocument();
    expect(screen.getByTestId('civilization-blueprint-map-pin-art')).toBeInTheDocument();
  });





  it('keeps dense mobile Scan identities individually visible with one focused readout', () => {
    mobileState.isMobile = true;
    const catalogArtifacts = ARTIFACT_CATALOG.slice(0, 12);
    const sites = catalogArtifacts.map((entry, index) => site(index + 1, {
      id: `artifact:${entry.id}`,
      artifactId: entry.id,
      relatedArtifactIds: [entry.id],
    }));

    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={buildCivilizationProfile(
          sites.map((entry, index) => artifact(entry.artifactId!, `Artifact ${index + 1}`)),
        )}
        progressFraction={1}
        paused
        defaultScene="surface"
        defaultScanActive
        deploymentSites={sites}
        forgedArtifacts={sites.map((entry, index) => artifact(entry.artifactId!, `Artifact ${index + 1}`))}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('civilization-mobile-scan-rail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-mobile-scan-dock')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('civilization-scan-map-pin')).toHaveLength(12);
    expect(screen.queryByTestId('civilization-scan-district-stack')).not.toBeInTheDocument();
    fireEvent.click(getScanMapPin(`artifact:${catalogArtifacts[11]!.id}`));
    expect(screen.getByTestId('civilization-mobile-scan-dock')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-mobile-scan-rail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('civilization-mobile-scan-command-primary'));
    expect(screen.getByLabelText('Deployment Site 12 dossier')).toBeInTheDocument();
  });

  it('keeps the mobile portrait free of deployment ledgers', () => {
    mobileState.isMobile = true;

    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="surface"
        deploymentSites={[site(1)]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('civilization-mobile-deployment-dock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scene-deployment-ledger')).not.toBeInTheDocument();
  });

  it('keeps the new trace marker visible in the mobile scan readout after the dossier closes', () => {
    vi.useFakeTimers();
    mobileState.isMobile = true;

    try {
      render(
        <CivilizationScenePanel
          tier={2}
          palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
          profile={{
            key: 'test',
            seed: 1,
            artifactCount: 2,
            affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
            traitCounts: {},
            traitWeights: {},
            dominantTraits: [],
            landmarks: [],
          }}
          progressFraction={1}
          paused
          deploymentSites={[
            site(1, {
              title: 'Ashroot Bloom Trace',
              nativeArtworkLayer: 'surface',
              nativeArtworkLabel: 'City site',
            }),
          ]}
          forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
          externalRecentSiteIds={['artifact:t1r01']}
          onOpenArtifact={vi.fn()}
        />,
      );

      expect(screen.queryByLabelText('Ashroot Bloom Trace dossier')).not.toBeInTheDocument();
      expect(screen.queryByTestId('civilization-mobile-scan-command-primary')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^Scan/i }));

      expect(screen.getByTestId('civilization-mobile-scan-command-primary'))
        .toHaveAttribute('data-recent-trace', 'true');
      expect(screen.getByTestId('civilization-mobile-scan-command-primary'))
        .toHaveTextContent(/New/i);

      fireEvent.click(screen.getByRole('button', { name: /Inspect primary mobile scan readout/i }));
      expect(screen.getByLabelText('Ashroot Bloom Trace dossier')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders a lightweight board miniature focused to the native scale of recent small artifact work', () => {
    render(
      <CivilizationMiniatureScene
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 2,
          affinityCounts: { flare: 0, continuum: 0, verdance: 2, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit', 'biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={[
          site(1, { title: 'Ashroot Bloom Trace' }),
          site(2, {
            id: 'artifact:t1s02',
            artifactId: 't1s02',
            title: 'Mantlelift Driver Coil Trace',
            trait: 'transit',
            affinity: 'continuum',
            artifactVisualMotif: 'coil',
            artifactSceneTreatment: 'mantlelift_driver',
          }),
        ]}
        recentSiteIds={['artifact:t1s02']}
      />,
    );

    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute('data-scene', 'surface');
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute('data-root-scene', 'stellar');
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute(
      'data-recent-focus-site',
      'artifact:t1s02',
    );
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute('data-archetype', 'living_arcology');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.environment.aurora_basin.surface.city-2.neutral.cinematic');
    expect(screen.getByTestId('civilization-miniature-trace-pulse')).toBeInTheDocument();
    expect(screen.getAllByTestId('civilization-miniature-registration-ring')).toHaveLength(2);
    expect(screen.getByTestId('civilization-artifact-manifestation-layer'))
      .toHaveAttribute('data-world-layout', 'invariant');
    expect(screen.getAllByTestId('civilization-artifact-structure')).toHaveLength(2);
    expect(screen.queryByTestId('civilization-miniature-work-ledger')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-plate-identity-grade')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-evolved-plate-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-plate-dialect')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-signature-atmosphere')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-environment-signatures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-integrated-consequences')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-materialized-sites')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-artifact-substructures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-native-work-layer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-integrated-lift')).not.toBeInTheDocument();
    expect(screen.getByText('Civilization updated')).toBeInTheDocument();
    expect(screen.getByText('Mantlelift Driver Coil')).toBeInTheDocument();
    expect(screen.getByText('Lift Driver')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scale-context')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-trait-dialect')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scale-frame')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-trait-signatures')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /scan/i })).not.toBeInTheDocument();
  });

  it('uses the authored Chrysalis world in the board miniature without legacy overlay proxies', () => {
    render(
      <CivilizationMiniatureScene
        tier={1}
        palette={{ primary: '#f97316', secondary: '#7e22ce', accent: '#fed7aa' }}
        profile={{
          key: 'chrysalis-miniature',
          seed: 7,
          artifactCount: 1,
          affinityCounts: { flare: 1, continuum: 0, verdance: 0, abyss: 1, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['foundry'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={[
          site(1, {
            id: 'artifact:t1r01',
            artifactId: 't1r01',
            affinity: 'flare',
            nativeArtworkLayer: 'surface',
            artifactManifestation: getArtifactManifestationProfile('t1r01'),
          }),
        ]}
        recentSiteIds={['artifact:t1r01']}
      />,
    );

    expect(screen.getByTestId('civilization-living-world')).toHaveAttribute('data-dyad', 'chrysalis');
    expect(screen.getByTestId('civilization-artifact-manifestation-layer'))
      .toHaveAttribute('data-world-layout', 'invariant');
    expect(screen.getByTestId('civilization-artifact-structure'))
      .toHaveAttribute('data-artifact-unit', 't1r01');
    expect(screen.getByTestId('civilization-artifact-arrival-ring')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-authored-host')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-miniature-work-ledger')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-evolved-plate-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-plate-dialect')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-materialized-sites')).not.toBeInTheDocument();
  });

  it('renders notice thumbnails without miniature ledger or readout clutter', () => {
    render(
      <CivilizationMiniatureScene
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 2,
          affinityCounts: { flare: 0, continuum: 0, verdance: 2, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit', 'biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={[
          site(1, { title: 'Ashroot Bloom Trace' }),
          site(2, {
            id: 'artifact:t1s02',
            artifactId: 't1s02',
            title: 'Mantlelift Driver Coil Trace',
            trait: 'transit',
            affinity: 'continuum',
            artifactVisualMotif: 'coil',
            artifactSceneTreatment: 'mantlelift_driver',
          }),
        ]}
        recentSiteIds={['artifact:t1s02']}
        presentation="thumbnail"
        showRecentCard={false}
      />,
    );

    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute('data-presentation', 'thumbnail');
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute('data-scene', 'surface');
    expect(screen.getByTestId('civilization-artifact-manifestation-layer')).toBeInTheDocument();
    expect(screen.getAllByTestId('civilization-artifact-structure')).toHaveLength(2);
    expect(screen.queryByTestId('civilization-materialized-sites')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-integrated-lift')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-miniature-work-ledger')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-miniature-trace-pulse')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-plate-dialect')).not.toBeInTheDocument();
    expect(screen.queryByText('Civilization updated')).not.toBeInTheDocument();
  });

  it('freezes ambient scene loops when rendered as a paused preview', () => {
    const { container, unmount } = render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScanActive
        deploymentSites={[site(1)]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-scene-panel'))
      .toHaveAttribute('data-civilization-motion', 'paused');
    const styleText = container.querySelector('style')?.textContent ?? '';
    expect(styleText).toContain('[data-civilization-motion="paused"] .civ-artifact-deployment');
    expect(styleText).toContain('[data-civilization-motion="paused"] .civ-materialized-site');
    expect(styleText).toContain('[data-civilization-motion="paused"] .civ-map-pin::before');
    expect(styleText).toContain('will-change: auto !important');
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styleText).toContain('.civ-focused-projection-local-site');

    unmount();

    render(
      <CivilizationMiniatureScene
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={[site(1)]}
        recentSiteIds={['artifact:t1r01']}
      />,
    );

    expect(screen.getByTestId('civilization-miniature-scene'))
      .toHaveAttribute('data-civilization-motion', 'paused');
  });

  it('renders Stability and active Conditions as a low-cost scene state layer', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="surface"
        deploymentSites={[site(1)]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        stabilityBand="crisis"
        activeConditions={['damaged', 'quarantined']}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-scene-panel')).toHaveAttribute('data-stability', 'crisis');
    expect(screen.getByTestId('civilization-system-state')).toHaveAttribute('data-conditions', 'damaged,quarantined');
    expect(screen.getByTestId('civilization-system-state')).toHaveAttribute('data-state-composition', 'localized-physical');
    expect(screen.getByTestId('civilization-attention-state')).toHaveTextContent('2 active conditions');
    expect(screen.getByTestId('civilization-system-state')
      .querySelector('[data-state-treatment="environmental"]')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-system-state')
      .querySelectorAll('[data-state-treatment="power-fault"]')).toHaveLength(3);
    expect(screen.getByTestId('civilization-system-state')
      .querySelectorAll('[data-state-treatment="structural-damage"]')).toHaveLength(3);
    expect(screen.getByTestId('civilization-system-state')
      .querySelectorAll('[data-state-treatment="damage-ember"]')).toHaveLength(3);
    expect(screen.getByTestId('civilization-system-state')
      .querySelectorAll('[data-state-treatment="quarantine-beacon"]')).toHaveLength(3);
    expect(screen.getByTestId('civilization-artifact-damage-smoke')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-artifact-quarantine-beacon')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-system-state').querySelector('[class*="border"]'))
      .not.toBeInTheDocument();
  });

  it('expresses Isolation and Disruption through localized physical operation changes', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="surface"
        deploymentSites={[site(1)]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        stabilityBand="unstable"
        activeConditions={['isolated', 'disrupted']}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-living-world'))
      .toHaveAttribute('data-condition-motion', 'suspended');
    expect(screen.getByTestId('civilization-system-state')
      .querySelectorAll('[data-state-treatment="operational-blackout"]')).toHaveLength(3);
    expect(screen.getByTestId('civilization-system-state')
      .querySelectorAll('[data-state-treatment="power-disruption"]')).toHaveLength(3);
    expect(screen.getByTestId('civilization-artifact-disruption')).toBeInTheDocument();
    expect(screen.getAllByTestId('civilization-artifact-structure')[0])
      .toHaveAttribute('data-condition-treatment', 'localized-physical');
    expect(screen.getAllByTestId('civilization-artifact-structure')[0]?.style.opacity).toBe('1');
    expect(screen.getAllByTestId('civilization-artifact-structure')[0]?.style.filter)
      .not.toContain('grayscale');
  });

  it('uses canonical dyad identity, Reach, history, and scale transitions when Civilization state is available', () => {
    const civilization = {
      version: 2,
      artifacts: [{
        artifactId: 't1r01',
        firstMasteredTurnCount: 2,
        masteryCount: 1,
        implementationState: 'operational',
        implementationStateChangedTurnCount: null,
        changeSourceType: 'artifact',
        historyEvidence: 'recorded',
      }],
      affinityIdentity: {
        policyId: 'provisional-ratio-v1',
        form: 'dyad',
        historicalCounts: { flare: 0, radiance: 5, verdance: 0, continuum: 0, abyss: 4 },
        operationalCounts: { flare: 0, radiance: 5, verdance: 0, continuum: 0, abyss: 4 },
        rankedAffinities: [
          { affinity: 'radiance', historicalWeight: 5, operationalWeight: 5 },
          { affinity: 'abyss', historicalWeight: 4, operationalWeight: 4 },
          { affinity: 'flare', historicalWeight: 0, operationalWeight: 0 },
          { affinity: 'verdance', historicalWeight: 0, operationalWeight: 0 },
          { affinity: 'continuum', historicalWeight: 0, operationalWeight: 0 },
        ],
        dominantAffinity: 'radiance',
        dominantDyad: 'eclipse',
        thirdAffinity: null,
        dominantShare: 5 / 9,
        secondaryToPrimaryRatio: 0.8,
        thirdToPrimaryRatio: 0,
      },
      scale: {
        historicalMaturity: 'galactic',
        currentReach: 'planetary',
        currentReachCondition: 'fractured',
        literalKardashevType: 1,
        literalKardashevEvidence: 'recorded',
      },
      stability: {
        band: 'unstable',
        score: 42,
        calibrationId: null,
        contributors: [],
        calculatedTurnCount: 3,
        historyEvidence: 'recorded',
      },
      activeConditions: [],
      activeCapabilityIds: [],
      events: [],
    } satisfies CivilizationPublicState;

    const renderPanel = (civilizationState: CivilizationPublicState) => (
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#dfc878', secondary: '#a832d4', accent: '#f5e8b8' }}
        profile={buildCivilizationProfile([artifact('t1r01', 'Ignition Kernel')])}
        progressFraction={1}
        paused
        civilizationName="The Eclipse Archive"
        civilization={civilizationState}
        deploymentSites={[site(1)]}
        forgedArtifacts={[artifact('t1r01', 'Ignition Kernel')]}
        onOpenArtifact={vi.fn()}
      />
    );
    const { rerender } = render(renderPanel(civilization));

    expect(screen.getByTestId('civilization-scene-panel')).toHaveAttribute('data-visual-identity', 'eclipse');
    expect(screen.getByTestId('civilization-scene-panel')).toHaveAttribute('data-global-complexity', '3');
    expect(screen.queryByTestId('civilization-canonical-morphology')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-complexity-atmosphere')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Eclipse Archive' })).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scene-details')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Civilization portrait where artifacts/i })).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-reach-layer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-history-ribbon')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));
    expect(screen.queryByTestId('civilization-canonical-morphology')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-complexity-atmosphere')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-reach-layer')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-history-ribbon')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-history-artifact-thumbnail'))
      .toHaveAttribute('data-artifact-id', 't1r01');

    const stellarCivilization = {
      ...civilization,
      scale: {
        ...civilization.scale,
        historicalMaturity: 'stellar',
        currentReach: 'stellar',
        currentReachCondition: 'intact',
        literalKardashevType: 2,
      },
    } satisfies CivilizationPublicState;
    rerender(renderPanel(stellarCivilization));
    expect(screen.getByTestId('civilization-maturity-cinematic')).toHaveTextContent('Civilization ascendsStellar');

    rerender(renderPanel(civilization));

    fireEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(screen.getByTestId('civilization-scale-transition')).toHaveAttribute('data-direction', 'in');
    expect(screen.getByTestId('civilization-scene-panel')).toHaveAttribute('data-current-reach', 'historical');
  });


  it('keeps Chrysalis city Scan on the portrait world and annotates only local physical Artifacts', () => {
    const deploymentSites = [
      site(1, {
        id: 'artifact:t1r01',
        artifactId: 't1r01',
        affinity: 'flare',
        scaleBand: 'planetary',
        nativeArtworkLayer: 'surface',
        artifactManifestation: getArtifactManifestationProfile('t1r01'),
      }),
      site(7, {
        id: 'artifact:t1r07',
        artifactId: 't1r07',
        affinity: 'flare',
        scaleBand: 'planetary',
        nativeArtworkLayer: 'surface',
        artifactManifestation: getArtifactManifestationProfile('t1r07'),
      }),
      site(9, {
        id: 'artifact:t2r01',
        artifactId: 't2r01',
        affinity: 'abyss',
        artifactTier: 2,
        scaleBand: 'planetary',
        nativeArtworkLayer: 'orbit',
        artifactManifestation: getArtifactManifestationProfile('t2r01'),
      }),
    ];
    const profile = {
      key: 'chrysalis-test',
      seed: 7,
      artifactCount: 3,
      affinityCounts: { flare: 2, continuum: 0, verdance: 0, abyss: 1, radiance: 0 },
      traitCounts: {},
      traitWeights: {},
      dominantTraits: [],
      landmarks: [],
    };
    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#f97316', secondary: '#7e22ce', accent: '#fed7aa' }}
        profile={profile}
        progressFraction={1}
        paused
        defaultScene="surface"
        showAllArtifactPins
        deploymentSites={deploymentSites}
        forgedArtifacts={[
          artifact('t1r01', 'Ignition Kernel'),
          artifact('t1r07', 'Entropy Pyre Baffle'),
          artifact('t2r01', 'Orbital Crucible'),
        ]}
        onOpenArtifact={vi.fn()}
      />,
    );

    const plate = screen.getByTestId('civilization-plate-art');
    const portraitPlate = { src: plate.getAttribute('src'), style: plate.getAttribute('style') };
    const getHostGeometry = () => Array.from(
      document.querySelectorAll<HTMLElement>('[data-manifestation-kind="dyad-artifact-composite"]'),
    ).map((host) => ({
      key: host.dataset.worldHostKey,
      anchor: host.dataset.worldAnchor,
      left: host.style.left,
      top: host.style.top,
      width: host.style.width,
      height: host.style.height,
    }));
    const portraitHosts = getHostGeometry();

    fireEvent.click(screen.getByRole('button', { name: /^Scan$/i }));

    expect(screen.getByTestId('civilization-scene-panel')).toHaveAttribute('data-visual-identity', 'chrysalis');
    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('aria-pressed', 'true');
    const restingMarkers = screen.getAllByTestId('civilization-scan-map-pin');
    expect(restingMarkers).toHaveLength(2);
    expect(restingMarkers.every((marker) => marker.getAttribute('data-marker-mode') === 'artifact-structure'))
      .toBe(true);
    expect(restingMarkers.every((marker) => marker.classList.contains('opacity-100')))
      .toBe(true);
    const markerHostKeys = restingMarkers.map((marker) => marker.getAttribute('data-world-host-key'));
    expect(markerHostKeys.every((key) => key?.startsWith('native:chrysalis:')))
      .toBe(true);
    expect(markerHostKeys.every(Boolean)).toBe(true);
    expect(restingMarkers[0]).not.toHaveAttribute(
      'data-world-anchor',
      restingMarkers[1]!.getAttribute('data-world-anchor'),
    );
    expect(screen.queryByTestId('civilization-scan-host-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-artifact-pin-host-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-artifact-index')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Artifact index'));
    const artifactIndex = screen.getByTestId('civilization-artifact-index');
    const artifactIndexButtons = artifactIndex.querySelectorAll('button');
    expect(artifactIndexButtons).toHaveLength(2);
    const selectedArtifactStructure = document.querySelector<HTMLElement>(
      '[data-testid="civilization-artifact-structure"][data-artifact-unit="t1r07"]',
    );
    const selectedArtifactHostKey = selectedArtifactStructure?.dataset.worldHostKey;
    expect(selectedArtifactHostKey).toBeTruthy();

    fireEvent.click(artifactIndexButtons[1]!);

    expect(screen.getByTestId('civilization-artifact-pin-host-link')).toHaveAttribute(
      'data-world-host-key',
      selectedArtifactHostKey,
    );
    expect(screen.getByTestId('civilization-artifact-pin-host-link')).toHaveAttribute(
      'data-site-id',
      'artifact:t1r07',
    );
    const selectedMarker = screen.getAllByTestId('civilization-scan-map-pin')
      .find((marker) => marker.getAttribute('data-pin-state') === 'selected');
    expect(screen.getAllByTestId('civilization-scan-map-pin').every((marker) => (
      marker.classList.contains('opacity-100')
    ))).toBe(true);
    expect(selectedMarker).toHaveAttribute(
      'data-site-id',
      'artifact:t1r07',
    );
    expect(selectedMarker).toHaveAttribute('data-pin-link-state', 'linked');
    expect(Number(selectedMarker?.getAttribute('data-pin-offset'))).toBeGreaterThan(0);
    const connectorCoordinates = screen.getByTestId('civilization-artifact-pin-host-link')
      .getAttribute('d')!
      .match(/-?\d+(?:\.\d+)?/g)!
      .map(Number);
    expect(connectorCoordinates[1]).toBeLessThan(connectorCoordinates.at(-1)!);
    expect(screen.queryByTestId('civilization-materialized-sites')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-artifact-deployments')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scan-focus')).not.toBeInTheDocument();
    expect(getHostGeometry()).toEqual(portraitHosts);
    expect({ src: plate.getAttribute('src'), style: plate.getAttribute('style') }).toEqual(portraitPlate);
  });
});
