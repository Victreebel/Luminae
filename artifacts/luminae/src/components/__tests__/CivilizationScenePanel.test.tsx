import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactCard } from '@workspace/api-client-react';
import {
  CivilizationMiniatureScene,
  CivilizationScenePanel,
} from '@/components/CivilizationScenePanel';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import { buildCivilizationProfile } from '@/lib/civilizationProfile';

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

describe('CivilizationScenePanel', () => {
  beforeEach(() => {
    mobileState.isMobile = false;
  });

  it('defaults planetary civilizations to planet view and zooms into city detail', () => {
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

    expect(screen.getByText('Planet View')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planet' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Planet' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getAllByTestId('civilization-scale-active-indicator')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'City' })).not.toHaveAttribute('data-active-scale');
    expect(screen.getByTestId('civilization-zoom-hotspot')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-evolved-plate-state')).toHaveAttribute('data-state-flags', 'living');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.orbit.living_arcology.cinematic');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-resolution', 'bitmap');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-plate-focus', 'biosphere-bands');
    expect(screen.getByTestId('civilization-scale-theater')).toHaveAttribute('data-scene', 'orbit');
    expect(screen.getByTestId('civilization-scale-theater')).toHaveAttribute('data-aggregate-count', '1');
    expect(screen.getByTestId('civilization-scale-theater-aggregate')).toHaveAttribute('data-native-scene', 'surface');
    expect(screen.getByTestId('civilization-archetype-atmosphere'))
      .toHaveAttribute('data-archetype', 'living_arcology');
    expect(screen.getByTestId('civilization-archetype-atmosphere'))
      .toHaveAttribute('data-composition-key', 'bio-canopy');
    expect(screen.getByTestId('civilization-archetype-composition')).toHaveAttribute('data-archetype', 'living_arcology');
    expect(screen.getByTestId('civilization-archetype-composition'))
      .toHaveAttribute('data-asset-slot', 'civilization.archetype.living_arcology.orbit');
    expect(screen.getByTestId('civilization-archetype-composition'))
      .toHaveAttribute('data-art-resolution', 'procedural');
    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Living Arcology');

    fireEvent.click(screen.getByTestId('civilization-zoom-hotspot'));

    expect(screen.getByText(/City \/ surface detail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.surface.living_arcology.cinematic');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-plate-focus', 'living-district');
    expect(screen.getByTestId('civilization-evolved-surface-state')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-scale-theater')).toHaveAttribute('data-scene', 'surface');
    expect(screen.getByTestId('civilization-scale-theater-native')).toHaveAttribute('data-native-scene', 'surface');
    expect(screen.getByTestId('civilization-integrated-consequences')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-integrated-recovery')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-native-work-layer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Planet' }));

    expect(screen.getByText('Planet View')).toBeInTheDocument();
  });

  it('starts planetary scan mode at city detail when local work is present', () => {
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

    expect(screen.getByText(/City \/ surface detail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getByRole('button', { name: 'Scan' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.surface.forge_spine.scan');
  });

  it('keeps higher-scale projects visible as scan context when zoomed into local work', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#dfb86b', secondary: '#5f3813', accent: '#fff0b8' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 2,
          affinityCounts: { flare: 1, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit', 'ignition'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'artifact:t1s02',
            artifactId: 't1s02',
            title: 'Mantlelift Driver Coil Trace',
            trait: 'transit',
            affinity: 'continuum',
            artifactVisualMotif: 'coil',
            artifactSceneTreatment: 'mantlelift_driver',
            depictionScale: 'room',
            scalePresence: 'deployment_site',
            nativeArtworkLayer: 'surface',
            nativeArtworkLabel: 'City site',
          }),
          site(2, {
            id: 'blueprint:bp_mantle_to_orbit_foundry',
            kind: 'blueprint',
            artifactId: undefined,
            completedBlueprintId: undefined,
            blueprintId: 'bp_mantle_to_orbit_foundry',
            title: 'Mantle-to-Orbit Freight Lane',
            representationMode: 'blueprint_consequence',
            scaleBand: 'planetary',
            trait: 'transit',
            relatedArtifactIds: [],
            priority: 1000,
          }),
        ]}
        forgedArtifacts={[artifact('t1s02', 'Mantlelift Driver Coil')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByText(/City \/ surface detail/i)).toBeInTheDocument();
    expect(screen.getByTestId('civilization-scan-scale-context')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-scan-scale-context-item'))
      .toHaveAttribute('data-native-scene', 'orbit');
    expect(screen.getByText('Mantle-to-Orbit Freight Lane')).toBeInTheDocument();
    expect(screen.getByText(/Native layer \/\/ Planet view/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('civilization-scan-scale-context-item'));

    expect(screen.getByRole('button', { name: 'Planet' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getByTestId('civilization-focused-deployment-projection'))
      .toHaveAttribute('data-site-id', 'blueprint:bp_mantle_to_orbit_foundry');
  });

  it('keeps deployment details hidden until scan mode is opened', () => {
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
        deploymentSites={[site(1)]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByText('Civilization Portrait')).toBeInTheDocument();
    expect(screen.getByText(/Local artifact traces \/\/ Ashroot Bloom/i)).toBeInTheDocument();
    expect(screen.getByTestId('civilization-scene-deployment-ledger')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-plate-identity-grade')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-evolved-plate-state')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-archetype-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-archetype-composition')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-plate-dialect')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-scale-context')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-depth-composition')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-trait-dialect')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-signature-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-environment-signatures')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-artifact-substructures')).toBeInTheDocument();
    expect(screen.getAllByTestId('civilization-artifact-motif').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('civilization-trait-signatures')).not.toBeInTheDocument();
    expect(screen.getAllByText('Living Recovery Trace').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('civilization-scene-deployment-ledger')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-scene-deployment-ledger-item'))
      .toHaveAttribute('data-impact-kind', 'artifact');
    expect(screen.queryByText('Deployment Site 1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /scan/i }));

    expect(screen.getByTestId('civilization-focused-deployment-projection'))
      .toHaveAttribute('data-scale-relation', 'magnified');
    expect(screen.getByTestId('civilization-focused-deployment-projection'))
      .toHaveAttribute('data-scale-presence', 'artifact_pin');
    expect(screen.getByTestId('civilization-trait-signatures')).toBeInTheDocument();
    expect(screen.getAllByText('Deployment Site 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Living Recovery').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('macro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Native city \/\/ habitat ecology chains threaded between worlds/i)).toBeInTheDocument();
    expect(screen.getByTestId('civilization-scan-focus')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-command-frame'))
      .toHaveAttribute('data-scan-active', 'true');
    expect(screen.getByTestId('civilization-command-frame'))
      .toHaveAttribute('data-frame-scene', 'stellar');
    expect(screen.getByTestId('civilization-scan-command-primary'))
      .toHaveAttribute('data-impact-kind', 'artifact');
    expect(screen.getByTestId('civilization-scan-command-primary'))
      .toHaveAttribute('data-native-scene', 'surface');
    expect(screen.getByTestId('civilization-desktop-scan-rail')).toBeInTheDocument();
    expect(screen.queryByText(/Visible as/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Deployment Site 1/i }));

    expect(screen.getByTestId('civilization-scan-focus')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-desktop-scan-rail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-artifact-substructures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-environment-signatures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-trait-dialect')).not.toBeInTheDocument();
    expect(screen.getByText(/close-up object scale/i)).toBeInTheDocument();
    expect(screen.getByText(/City \/ surface detail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'City' })).toHaveAttribute('data-active-scale', 'true');
    expect(screen.getByTestId('civilization-dossier-scale-kicker'))
      .toHaveTextContent('Artifact deployment // Native City detail');
    expect(screen.getByTestId('civilization-dossier-scale-kicker'))
      .toHaveAttribute('data-view-scale', 'surface');
    expect(screen.getByTestId('civilization-dossier-scale-kicker'))
      .toHaveAttribute('data-native-scale', 'surface');
    expect(screen.getByTestId('civilization-dossier-scale-context'))
      .toHaveAccessibleName('Native: City detail; Influence: Stellar system');
    expect(screen.getByText('Native: City detail')).toBeInTheDocument();
    expect(screen.getByText('Influence: Stellar system')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-dossier-site-report')).toHaveTextContent('Site report');
    expect(screen.getByTestId('civilization-dossier-site-report')).toHaveTextContent('macro');
    expect(screen.getByTestId('civilization-dossier-site-report'))
      .toHaveTextContent('Native city // habitat ecology chains threaded between worlds');
    expect(screen.getByTestId('civilization-dossier-intelligence')).toHaveTextContent('Local trace integrated');
    expect(screen.getByTestId('civilization-dossier-source-label')).toHaveTextContent('Ashroot Bloom');
    expect(screen.getByTestId('civilization-dossier-readout-label')).toHaveTextContent('Pin plus consequence layer');
    expect(screen.getByTestId('civilization-dossier-intelligence')).toHaveTextContent('Authored card lore');
    expect(screen.queryByText('Pin layer')).not.toBeInTheDocument();
    expect(screen.queryByText('Art macro')).not.toBeInTheDocument();
    expect(screen.queryByText('Motif Seed-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ashroot Bloom/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('civilization-scale-active-indicator')).toHaveLength(1);
    expect(screen.getByTestId('civilization-focused-deployment-projection'))
      .toHaveAttribute('data-scale-relation', 'native');
    expect(screen.getByTestId('civilization-focused-deployment-projection'))
      .toHaveAttribute('data-native-presentation', 'local-site');
    expect(screen.getByRole('button', { name: /Deployment Site 1/i })).toBeInTheDocument();
  });

  it('lets the default cinematic ledger open the matching scan focus', () => {
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
        deploymentSites={[site(1)]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /^Scan$/i })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: /Focus deployment Deployment Site 1/i }));

    expect(screen.getByRole('button', { name: /^Scan$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('civilization-focused-deployment-projection'))
      .toHaveAttribute('data-site-id', 'artifact:t1r01');
  });

  it('opens recent local-scale work at its native zoom layer', async () => {
    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
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
        deploymentSites={[site(1, { title: 'Ashroot Bloom Trace' })]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        externalRecentSiteIds={['artifact:t1r01']}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(await screen.findByText(/New trace recorded \/\/ Ashroot Bloom Trace/i))
      .toBeInTheDocument();
    expect(screen.getByText(/City \/ surface detail \/\/ 1 trace recorded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Scan$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Ashroot Bloom Trace dossier')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-dossier-scale-kicker'))
      .toHaveTextContent('Native City detail');
    expect(screen.queryByTestId('civilization-zoom-hotspot')).not.toBeInTheDocument();
  });

  it('promotes completed Blueprints into the default cinematic consequence layer', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#f87171', secondary: '#3f0f1a', accent: '#fecdd3' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 0, abyss: 1, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit', 'biosphere'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={[
          site(1, {
            id: 'blueprint:bp_antimatter_detonator',
            kind: 'blueprint',
            blueprintId: 'bp_antimatter_detonator',
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

    expect(screen.getByTestId('civilization-dominant-blueprints')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-blueprint-antimatter-native')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-artifact-substructures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-environment-signatures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-trait-signatures')).not.toBeInTheDocument();
    expect(screen.getByText(/Local artifact traces \/\/ Magnetic Bottle/i)).toBeInTheDocument();
    expect(screen.getAllByText('Antimatter Quarantine Orbit').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /scan/i }));

    expect(screen.getByTestId('civilization-environment-signatures')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-trait-signatures')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Magnetic Bottle Trace/i })).toBeInTheDocument();
  });

  it('preserves accord and archive identities instead of flattening them into living or route scenes', () => {
    const accordArtifact = {
      ...artifact('t2p03', 'Living Treaty Organ'),
      tier: 2,
      eminence: 2,
      bonusAffinity: 'radiance' as const,
    };
    const { unmount } = render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#facc15', secondary: '#8a6f1e', accent: '#fef3c7' }}
        profile={buildCivilizationProfile([accordArtifact])}
        progressFraction={1}
        paused
        deploymentSites={[site(1, {
          id: 'artifact:t2p03',
          artifactId: 't2p03',
          trait: 'accord',
          affinity: 'radiance',
          title: 'Living Treaty Organ Trace',
          laneLabel: 'Civic order',
          visibleAs: 'public treaty beacons in civic centers',
        })]}
        forgedArtifacts={[accordArtifact]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-archetype-atmosphere'))
      .toHaveAttribute('data-archetype', 'accord_beacon');
    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Accord Beacon');
    expect(screen.getByTestId('civilization-archetype-composition'))
      .toHaveAttribute('data-asset-slot', 'civilization.archetype.accord_beacon.orbit');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.orbit.accord_beacon.cinematic');

    unmount();

    const archiveArtifact = {
      ...artifact('t3s03', 'Extinction Signal Decoder'),
      tier: 3,
      eminence: 3,
      bonusAffinity: 'continuum' as const,
    };

    const { unmount: unmountArchive } = render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={buildCivilizationProfile([archiveArtifact])}
        progressFraction={1}
        paused
        defaultScene="galaxy"
        deploymentSites={[site(1, {
          id: 'artifact:t3s03',
          artifactId: 't3s03',
          trait: 'archive',
          affinity: 'continuum',
          scaleBand: 'galactic',
          title: 'Extinction Archive Trace',
          laneLabel: 'Memory',
          visibleAs: 'archive spines preserving dead-system records',
        })]}
        forgedArtifacts={[archiveArtifact]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-archetype-atmosphere'))
      .toHaveAttribute('data-archetype', 'archive_lattice');
    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Archive Lattice');
    expect(screen.getByTestId('civilization-archetype-composition'))
      .toHaveAttribute('data-asset-slot', 'civilization.archetype.archive_lattice.galaxy');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.galaxy.archive_lattice.cinematic');

    unmountArchive();

    const { unmount: unmountAccordGalaxy } = render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#facc15', secondary: '#8a6f1e', accent: '#fef3c7' }}
        profile={buildCivilizationProfile([accordArtifact])}
        progressFraction={1}
        paused
        defaultScene="galaxy"
        deploymentSites={[site(1, {
          id: 'artifact:t2p03',
          artifactId: 't2p03',
          trait: 'accord',
          affinity: 'radiance',
          scaleBand: 'galactic',
          title: 'Living Treaty Organ Trace',
          laneLabel: 'Civic order',
          visibleAs: 'treaty paths between witness constellations',
        })]}
        forgedArtifacts={[accordArtifact]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.galaxy.accord_beacon.cinematic');

    unmountAccordGalaxy();

    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={buildCivilizationProfile([archiveArtifact])}
        progressFraction={1}
        paused
        defaultScene="stellar"
        deploymentSites={[site(1, {
          id: 'artifact:t3s03',
          artifactId: 't3s03',
          trait: 'archive',
          affinity: 'continuum',
          scaleBand: 'stellar',
          title: 'Extinction Archive Trace',
          laneLabel: 'Memory',
          visibleAs: 'storm-memory filaments and system warning relays',
        })]}
        forgedArtifacts={[archiveArtifact]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.stellar.archive_lattice.cinematic');
  });

  it('caps visible desktop influences and clusters overflow sites by lane', () => {
    const sites = Array.from({ length: 8 }, (_, index) => site(index + 1, {
      laneLabel: index < 6 ? 'Habitat ecology' : 'Controlled catastrophe',
      scaleBand: index === 7 ? 'galactic' : 'stellar',
    }));

    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 7,
          affinityCounts: { flare: 0, continuum: 0, verdance: 7, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: [],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={sites}
        forgedArtifacts={sites.map((entry, index) => artifact(entry.artifactId!, `Artifact ${index + 1}`))}
        onOpenArtifact={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /scan/i }));

    expect(screen.getByText('+2 clustered')).toBeInTheDocument();
    expect(screen.getAllByText(/small artifact trace/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /Deployment Site/i })).toHaveLength(6);
  });

  it('keeps at least one small artifact trace visible when stronger events compete for scan slots', () => {
    const sites: CivilizationDeploymentSite[] = [
      site(1, {
        id: 'blueprint:bp_antimatter_detonator',
        kind: 'blueprint',
        blueprintId: 'bp_antimatter_detonator',
        artifactId: undefined,
        relatedArtifactIds: [],
        priority: 1000,
        title: 'Antimatter Quarantine Orbit',
      }),
      site(2, {
        id: 'protocol:sealed_protocol_01',
        kind: 'protocol',
        artifactId: undefined,
        relatedArtifactIds: [],
        priority: 900,
        title: 'Sealed Protocol 01',
      }),
      site(3, {
        id: 'luminary:lum_verdant',
        kind: 'luminary',
        artifactId: undefined,
        relatedArtifactIds: [],
        priority: 800,
        title: 'Verdance Luminary Pressure',
      }),
      site(4, {
        id: 'artifact:t3r01',
        artifactId: 't3r01',
        artifactTier: 3,
        priority: 500,
        title: 'Great Engine Trace',
      }),
      site(5, {
        id: 'artifact:t3r02',
        artifactId: 't3r02',
        artifactTier: 3,
        priority: 490,
        title: 'Orbital Ark Trace',
      }),
      site(6, {
        id: 'artifact:t3r03',
        artifactId: 't3r03',
        artifactTier: 3,
        priority: 480,
        title: 'Sky Furnace Trace',
      }),
      site(7, {
        id: 'artifact:t1r01',
        artifactId: 't1r01',
        artifactTier: 1,
        priority: 110,
        title: 'Ashroot Bloom Trace',
      }),
    ];

    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 4,
          affinityCounts: { flare: 0, continuum: 0, verdance: 4, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: [],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        deploymentSites={sites}
        forgedArtifacts={[
          artifact('t3r01', 'Great Engine'),
          artifact('t3r02', 'Orbital Ark'),
          artifact('t3r03', 'Sky Furnace'),
          artifact('t1r01', 'Ashroot Bloom'),
        ]}
        onOpenArtifact={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /scan/i }));
    fireEvent.click(screen.getByRole('button', { name: /city/i }));

    expect(screen.getByRole('button', { name: /Ashroot Bloom Trace/i })).toBeInTheDocument();
  });

  it('reserves compact default ledger space for a small artifact trace', () => {
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

    const ledger = screen.getByTestId('civilization-scene-deployment-ledger');
    expect(ledger).toHaveTextContent('Mantle-to-Orbit Freight Lane');
    expect(ledger).toHaveTextContent('Mantlelift Driver Coil Trace');
    expect(ledger).not.toHaveTextContent('Flare Luminary Pressure');
  });

  it('announces newly recorded traces and nudges scan after forged artifacts change', () => {
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
      profile: {
        key: 'test',
        seed: 1,
        artifactCount: 1,
        affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
        traitCounts: {},
        traitWeights: {},
        dominantTraits: [],
        landmarks: [],
      },
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

    expect(screen.queryByText(/New trace recorded/i)).not.toBeInTheDocument();

    rerender(
      <CivilizationScenePanel
        {...props}
        profile={{ ...props.profile, artifactCount: 2 }}
        deploymentSites={[firstSite, secondSite]}
        forgedArtifacts={[firstCard, secondCard]}
      />,
    );

    expect(screen.getByText(/New trace recorded \/\/ Mantlelift Driver Coil Trace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Scan$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Artifact absorbed')).not.toBeInTheDocument();
    expect(screen.queryByText('ART')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-trace-reveal')).toHaveAttribute('data-impact-kind', 'artifact');
    expect(screen.getByTestId('civilization-trace-reveal')).toHaveAttribute('data-primary-title', 'Mantlelift Driver Coil');
    expect(screen.queryByTestId('civilization-trace-reveal-title')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Mantlelift Driver Coil Trace/i })).toBeInTheDocument();
  });

  it('categorizes non-artifact recent trace reveals', () => {
    const baseProps = {
      tier: 2 as const,
      palette: { primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' },
      profile: {
        key: 'test',
        seed: 1,
        artifactCount: 1,
        affinityCounts: { flare: 0, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
        traitCounts: {},
        traitWeights: {},
        dominantTraits: [],
        landmarks: [],
      },
      progressFraction: 1,
      paused: true,
      defaultScanActive: true,
      forgedArtifacts: [],
      onOpenArtifact: vi.fn(),
    };
    const cases: Array<{
      site: CivilizationDeploymentSite;
      impactKind: string;
    }> = [
      {
        site: site(1, {
          id: 'blueprint:bp_antimatter_detonator',
          kind: 'blueprint',
          artifactId: undefined,
          blueprintId: 'bp_antimatter_detonator',
          representationMode: 'blueprint_consequence',
          title: 'Antimatter Quarantine Orbit',
          relatedArtifactIds: [],
        }),
        impactKind: 'blueprint',
      },
      {
        site: site(2, {
          id: 'luminary:lum_continuum',
          kind: 'luminary',
          artifactId: undefined,
          representationMode: 'luminary_influence',
          title: 'Continuum Luminary Pressure',
          relatedArtifactIds: [],
        }),
        impactKind: 'luminary',
      },
      {
        site: site(3, {
          id: 'protocol:sealed_protocol_01',
          kind: 'protocol',
          artifactId: undefined,
          representationMode: 'sealed_protocol',
          title: 'Sealed Protocol 01',
          relatedArtifactIds: [],
        }),
        impactKind: 'protocol',
      },
      {
        site: site(4, {
          id: 'chronicle:outer_vault_access',
          kind: 'chronicle',
          artifactId: undefined,
          chronicleId: 'outer_vault_access',
          representationMode: 'chronicle_record',
          title: 'Outer Vault Access',
          relatedArtifactIds: [],
        }),
        impactKind: 'chronicle',
      },
    ];

    const { rerender } = render(
      <CivilizationScenePanel
        {...baseProps}
        deploymentSites={[cases[0]!.site]}
        externalRecentSiteIds={[cases[0]!.site.id]}
      />,
    );

    for (const entry of cases) {
      rerender(
        <CivilizationScenePanel
          {...baseProps}
          deploymentSites={[entry.site]}
          externalRecentSiteIds={[entry.site.id]}
        />,
      );

      expect(screen.getByTestId('civilization-trace-reveal')).toHaveAttribute('data-impact-kind', entry.impactKind);
      expect(screen.getByTestId('civilization-trace-reveal')).toHaveAttribute('data-primary-title', entry.site.title);
      expect(screen.getByLabelText(`${entry.site.title} dossier`)).toBeInTheDocument();
      expect(screen.queryByTestId('civilization-trace-reveal-title')).not.toBeInTheDocument();
    }
  });

  it('opens non-artifact recent work on its native scale with category-aware reveal copy', () => {
    const baseProps = {
      tier: 1 as const,
      palette: { primary: '#dfb86b', secondary: '#5f3813', accent: '#fff0b8' },
      profile: {
        key: 'test',
        seed: 1,
        artifactCount: 0,
        affinityCounts: { flare: 1, continuum: 0, verdance: 0, abyss: 0, radiance: 0 },
        traitCounts: {},
        traitWeights: {},
        dominantTraits: [],
        landmarks: [],
      },
      progressFraction: 1,
      paused: true,
      defaultScanActive: true,
      defaultScene: 'surface' as const,
      forgedArtifacts: [],
      onOpenArtifact: vi.fn(),
    };
    const cases: Array<{
      site: CivilizationDeploymentSite;
      impactKind: string;
    }> = [
      {
        site: site(1, {
          id: 'blueprint:bp_mantle_to_orbit_foundry',
          kind: 'blueprint',
          scaleBand: 'planetary',
          artifactId: undefined,
          blueprintId: 'bp_mantle_to_orbit_foundry',
          representationMode: 'blueprint_consequence',
          title: 'Mantle-to-Orbit Freight Lane',
          visibleAs: 'a forged ascent corridor connecting deep crust to orbital industry',
          relatedArtifactIds: [],
        }),
        impactKind: 'blueprint',
      },
      {
        site: site(2, {
          id: 'luminary:lum_continuum',
          kind: 'luminary',
          scaleBand: 'planetary',
          artifactId: undefined,
          representationMode: 'luminary_influence',
          title: 'Continuum Luminary Pressure',
          visibleAs: "Continuum pressure in the civilization's weather, light, and civic rhythm",
          relatedArtifactIds: [],
        }),
        impactKind: 'luminary',
      },
      {
        site: site(3, {
          id: 'protocol:sealed_protocol_01',
          kind: 'protocol',
          scaleBand: 'planetary',
          artifactId: undefined,
          representationMode: 'sealed_protocol',
          title: 'Sealed Protocol 01',
          visibleAs: 'a redacted signal scar in the deployment intelligence layer',
          relatedArtifactIds: [],
        }),
        impactKind: 'protocol',
      },
      {
        site: site(4, {
          id: 'chronicle:outer_vault_access',
          kind: 'chronicle',
          scaleBand: 'planetary',
          artifactId: undefined,
          chronicleId: 'outer_vault_access',
          representationMode: 'chronicle_record',
          title: 'Outer Vault Access',
          visibleAs: 'a restored archive signal threaded through civic memory and threshold records',
          relatedArtifactIds: [],
        }),
        impactKind: 'chronicle',
      },
    ];

    const { rerender } = render(
      <CivilizationScenePanel
        {...baseProps}
        deploymentSites={[cases[0]!.site]}
        externalRecentSiteIds={[cases[0]!.site.id]}
      />,
    );

    for (const entry of cases) {
      rerender(
        <CivilizationScenePanel
          {...baseProps}
          deploymentSites={[entry.site]}
          externalRecentSiteIds={[entry.site.id]}
        />,
      );

      expect(screen.getByText(new RegExp(`New trace recorded // ${entry.site.title}`, 'i')))
        .toBeInTheDocument();
      expect(screen.getByText(/Planetary scale \/\/ 1 trace recorded/i)).toBeInTheDocument();
      expect(screen.getByTestId('civilization-trace-reveal')).toHaveAttribute('data-impact-kind', entry.impactKind);
      expect(screen.getByTestId('civilization-trace-reveal')).toHaveAttribute('data-primary-title', entry.site.title);
      expect(screen.queryByTestId('civilization-trace-reveal-title')).not.toBeInTheDocument();
      expect(screen.getByLabelText(`${entry.site.title} dossier`)).toBeInTheDocument();
      expect(screen.queryByTestId('civilization-scale-recent-target-indicator')).not.toBeInTheDocument();
    }
  });

  it('displays externally pending recent traces when mounted after a game update', () => {
    vi.useFakeTimers();
    const acknowledge = vi.fn();

    try {
      render(
        <CivilizationScenePanel
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
              depictionScale: 'room',
              scalePresence: 'deployment_site',
              nativeArtworkLabel: 'City site',
              representationMode: 'civilization_infrastructure',
              artifactVisualMotif: 'coil',
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

      expect(screen.getByText(/New trace recorded \/\/ Mantlelift Driver Coil Trace/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Scan$/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /Mantlelift Driver Coil Trace/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Mantlelift Driver Coil Trace dossier')).toBeInTheDocument();
      expect(screen.getByTestId('civilization-dossier-site-report')).toHaveTextContent('room-scale');
      expect(acknowledge).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Close scan dossier/i }));

      expect(screen.getByTestId('civilization-scan-command-primary'))
        .toHaveAttribute('data-recent-trace', 'true');
      expect(screen.getByTestId('civilization-scan-command-primary'))
        .toHaveTextContent(/New trace/i);

      act(() => {
        vi.advanceTimersByTime(6_500);
      });

      expect(acknowledge).toHaveBeenCalledWith(['artifact:t1s02']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens related artifact sheets from a dossier component chip', () => {
    const handleOpenArtifact = vi.fn();
    const card = artifact('t1r01', 'Ashroot Bloom');

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
          dominantTraits: [],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScanActive
        deploymentSites={[site(1)]}
        forgedArtifacts={[card]}
        onOpenArtifact={handleOpenArtifact}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Deployment Site 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ashroot Bloom/i }));

    expect(handleOpenArtifact).toHaveBeenCalledWith(card);
  });

  it('presents selected artifact traces as source-to-civilization intelligence', () => {
    const card = artifact('t1r01', 'Ashroot Bloom');

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
          dominantTraits: [],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScanActive
        deploymentSites={[site(1)]}
        forgedArtifacts={[card]}
        onOpenArtifact={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Deployment Site 1/i }));

    expect(screen.getByTestId('civilization-dossier-intelligence')).toHaveTextContent('Local trace integrated');
    expect(screen.getByTestId('civilization-dossier-source-label')).toHaveTextContent('Ashroot Bloom');
    expect(screen.getByTestId('civilization-dossier-readout-label')).toHaveTextContent('Pin plus consequence layer');
    expect(screen.getByTestId('civilization-dossier-source-artifacts')).toHaveTextContent('Inspect artifact record');
  });

  it('shows Blueprint component and effect context in scan dossiers', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 1, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: [],
          landmarks: [],
        }}
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

    fireEvent.click(screen.getByRole('button', { name: /Antimatter Quarantine Orbit/i }));

    expect(screen.getByText(/Components/i)).toBeInTheDocument();
    expect(screen.getByTestId('civilization-dossier-source-label')).toHaveTextContent('Antimatter Detonator');
    expect(screen.getByTestId('civilization-dossier-intelligence')).toHaveTextContent('Blueprint state');
    expect(screen.getByText(/Reaction Core \/ Containment Cage/i)).toBeInTheDocument();
    expect(screen.getByText(/Effect/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier II Artifact becomes secretly marked/i)).toBeInTheDocument();
    expect(screen.getByTestId('civilization-site-art-slot'))
      .toHaveAttribute('data-art-slot', 'civilization.blueprint.bp_antimatter_detonator');
    expect(screen.getByTestId('civilization-site-art-slot'))
      .toHaveAttribute('data-art-resolution', 'procedural');
  });

  it('renders lost implementations as historical scars with inactive capability dossiers', () => {
    const { container } = render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#ef7777', secondary: '#4b1520', accent: '#ffc2c2' }}
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
        deploymentSites={[site(1, {
          title: 'Ignition Kernel Trace',
          affinity: 'flare',
          trait: 'ignition',
          implementationState: 'annihilated',
          implementationStateChangedTurnCount: 8,
          masteryCount: 1,
          capabilityIds: ['artifact:controlled_energy'],
          activeCapabilityIds: [],
        })]}
        forgedArtifacts={[artifact('t1r01', 'Ignition Kernel')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-artifact-lifecycle-scars')).toBeInTheDocument();
    expect(container.querySelector('[data-artifact-state="annihilated"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ignition Kernel Trace/i }));
    expect(screen.getByTestId('civilization-dossier-operational-status')).toHaveTextContent('Annihilated');
    expect(screen.getByTestId('civilization-dossier-capabilities')).toHaveTextContent('Controlled energy');
    expect(screen.getByTestId('civilization-dossier-capabilities')).toHaveTextContent('Inactive');
    expect(screen.queryByTestId('civilization-focused-deployment-projection')).not.toBeInTheDocument();
  });

  it('renders authored first-pool artifact treatment glyphs in scan mode', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#f87171', secondary: '#7f1d1d', accent: '#fecaca' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 2,
          affinityCounts: { flare: 1, continuum: 0, verdance: 0, abyss: 1, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['containment', 'aperture'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'artifact:t1p04',
            artifactId: 't1p04',
            title: 'Magnetic Bottle Trace',
            trait: 'containment',
            affinity: 'radiance',
            artifactVisualMotif: 'containment',
            artifactSceneTreatment: 'magnetic_bottle',
          }),
          site(2, {
            id: 'artifact:t2o01',
            artifactId: 't2o01',
            artifactTier: 2,
            title: 'Horizon Extractor Trace',
            trait: 'aperture',
            affinity: 'abyss',
            artifactVisualMotif: 'aperture',
            artifactSceneTreatment: 'horizon_extractor',
          }),
        ]}
        forgedArtifacts={[
          artifact('t1p04', 'Magnetic Bottle'),
          artifact('t2o01', 'Horizon Extractor'),
        ]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId('civilization-artifact-treatment-magnetic_bottle').length)
      .toBeGreaterThan(0);
    expect(screen.getAllByTestId('civilization-artifact-treatment-horizon_extractor').length)
      .toBeGreaterThan(0);
    expect(screen.getAllByTestId('civilization-artifact-treatment-influence-magnetic_bottle').length)
      .toBeGreaterThan(0);
    expect(screen.getByTestId('civilization-focused-artifact-magnetic_bottle'))
      .toBeInTheDocument();
    expect(screen.queryByTestId('civilization-artifact-treatment-influence-horizon_extractor'))
      .not.toBeInTheDocument();
    expect(screen.getAllByText('Containment Bottle').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Horizon Sampler').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /Horizon Extractor Trace/i })[0]);

    expect(screen.queryByTestId('civilization-artifact-treatment-influence-horizon_extractor'))
      .not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-focused-artifact-horizon_extractor'))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Magnetic Bottle Trace/i }));

    expect(screen.getByTestId('civilization-dossier-readout-label')).toHaveTextContent('Pin plus consequence layer');
    expect(screen.queryByText('Signature Containment Bottle')).not.toBeInTheDocument();
  });

  it('uses the bespoke containment surface plate for hazard city views', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#f87171', secondary: '#7f1d1d', accent: '#fecaca' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 0, verdance: 0, abyss: 1, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['containment'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="surface"
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'artifact:t1p04',
            artifactId: 't1p04',
            title: 'Magnetic Bottle Trace',
            trait: 'containment',
            affinity: 'abyss',
            artifactVisualMotif: 'containment',
            artifactSceneTreatment: 'magnetic_bottle',
          }),
        ]}
        forgedArtifacts={[artifact('t1p04', 'Magnetic Bottle')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Containment Sentinel');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.surface.containment_sentinel.scan');
  });

  it('uses treatment-specific native deployment silhouettes in city detail', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#dfb86b', secondary: '#3f2d12', accent: '#ffe4a3' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 2,
          affinityCounts: { flare: 1, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit', 'ignition'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="surface"
        deploymentSites={[
          site(1, {
            id: 'artifact:t1s02',
            artifactId: 't1s02',
            title: 'Mantlelift Driver Coil Trace',
            trait: 'transit',
            affinity: 'continuum',
            depictionScale: 'room',
            scalePresence: 'deployment_site',
            nativeArtworkLabel: 'City site',
            representationMode: 'civilization_infrastructure',
            artifactVisualMotif: 'coil',
            artifactSceneTreatment: 'mantlelift_driver',
            visibleAs: 'orbital freight lanes rising from a city-scale driver site',
            laneLabel: 'Orbital logistics / Launch district',
          }),
          site(2, {
            id: 'artifact:t1r01',
            artifactId: 't1r01',
            title: 'Ignition Kernel Trace',
            trait: 'ignition',
            affinity: 'flare',
            artifactVisualMotif: 'forge',
            artifactSceneTreatment: 'ignition_kernel',
            visibleAs: 'thermal forge districts around controlled ignition sites',
            laneLabel: 'Planetary forge culture / Thermal district',
          }),
        ]}
        forgedArtifacts={[
          artifact('t1s02', 'Mantlelift Driver Coil'),
          artifact('t1r01', 'Ignition Kernel'),
        ]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-artifact-deployments')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-materialized-sites'))
      .toHaveAttribute('data-render-mode', 'solid-local-forms');
    expect(screen.getByTestId('civilization-materialized-site-mantlelift_driver'))
      .toHaveAttribute('data-solid-form', 'local-city-site');
    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Forge Spine');
    expect(screen.getByTestId('civilization-archetype-atmosphere'))
      .toHaveAttribute('data-archetype', 'forge_spine');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-plate-focus', 'forge-spine');
    const mantleliftDeployment = screen.getAllByTestId('civilization-artifact-treatment-deployment-mantlelift_driver')[0];
    expect(mantleliftDeployment).toBeInTheDocument();
    expect(mantleliftDeployment).toHaveAttribute('data-native-work-scale', 'local-site');
    expect(screen.queryByTestId('civilization-artifact-treatment-deployment-ignition_kernel'))
      .not.toBeInTheDocument();
  });

  it('classifies standalone transit infrastructure as Route Network instead of Forge Spine', () => {
    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="surface"
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'artifact:t1s02',
            artifactId: 't1s02',
            title: 'Mantlelift Driver Coil Trace',
            trait: 'transit',
            affinity: 'continuum',
            depictionScale: 'room',
            scalePresence: 'deployment_site',
            nativeArtworkLabel: 'City site',
            representationMode: 'civilization_infrastructure',
            artifactVisualMotif: 'coil',
            artifactSceneTreatment: 'mantlelift_driver',
            visibleAs: 'interplanetary freight lanes fed by planetary lift coils and orbital handoff stations',
            laneLabel: 'Orbital logistics / Interplanetary freight lane',
          }),
        ]}
        forgedArtifacts={[artifact('t1s02', 'Mantlelift Driver Coil')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Route Network');
    expect(screen.getByTestId('civilization-archetype-atmosphere'))
      .toHaveAttribute('data-archetype', 'route_network');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.surface.route_network.scan');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-plate-focus', 'route-grid');
  });

  it('keeps focused scan projections out of the lower-right influence tray', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#dfb86b', secondary: '#3f2d12', accent: '#ffe4a3' }}
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
        defaultScene="surface"
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'artifact:t1r01',
            artifactId: 't1r01',
            title: 'Ignition Kernel Trace',
            trait: 'ignition',
            affinity: 'flare',
            anchor: { x: 76, y: 64 },
            depictionScale: 'macro',
            artifactVisualMotif: 'forge',
            artifactSceneTreatment: 'ignition_kernel',
          }),
        ]}
        forgedArtifacts={[artifact('t1r01', 'Ignition Kernel')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-focused-deployment-projection'))
      .toHaveAttribute('data-layout-zone', 'scene-reserved');
    expect(screen.queryByLabelText('Ignition Kernel Trace dossier')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ignition Kernel Trace/i }));

    expect(screen.getByLabelText('Ignition Kernel Trace dossier'))
      .toHaveAttribute('data-dossier-side', 'left');
  });

  it('renders the Mantle-to-Orbit Foundry as an authored lift and foundry chain', () => {
    render(
      <CivilizationScenePanel
        tier={1}
        palette={{ primary: '#dfb86b', secondary: '#5f3417', accent: '#ffe4a3' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 1, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit'],
          landmarks: [],
        }}
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

    expect(screen.getByTestId('civilization-dominant-blueprints')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-blueprint-mantle-native')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-scale-theater')).toHaveAttribute('data-scene', 'orbit');
    expect(screen.getByTestId('civilization-scale-theater-native')).toHaveAttribute('data-native-scene', 'orbit');
    expect(screen.getAllByText('Mantle-to-Orbit Freight Lane').length).toBeGreaterThanOrEqual(1);
  });

  it('uses the Forge Spine orbit plate for ignition-dominant planetary views', () => {
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
        defaultScene="orbit"
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
            visibleAs: 'thermal forge districts and mantle-to-orbit ignition spines',
            laneLabel: 'Planetary forge culture / Ignition district',
          }),
        ]}
        forgedArtifacts={[artifact('t1r01', 'Ignition Kernel')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Forge Spine');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.orbit.forge_spine.scan');
  });

  it('collapses lower-scale Blueprint structures into aggregate signals at galaxy scale', () => {
    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#dfb86b', secondary: '#5f3417', accent: '#ffe4a3' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 1, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="galaxy"
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

    expect(screen.getByTestId('civilization-scale-theater')).toHaveAttribute('data-scene', 'galaxy');
    expect(screen.getByTestId('civilization-scale-theater-aggregate')).toHaveAttribute('data-native-scene', 'orbit');
    expect(screen.getByTestId('civilization-integrated-aggregate')).toHaveAttribute('data-native-scene', 'orbit');
    expect(screen.queryByTestId('civilization-integrated-lift')).not.toBeInTheDocument();
  });

  it('uses the galactic Route Network plate for route-heavy galaxy scenes', () => {
    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 1,
          affinityCounts: { flare: 0, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="galaxy"
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'artifact:t1s02',
            artifactId: 't1s02',
            title: 'Mantlelift Driver Coil Trace',
            trait: 'transit',
            affinity: 'continuum',
            artifactVisualMotif: 'coil',
            artifactSceneTreatment: 'mantlelift_driver',
            visibleAs: 'spiral-arm freight lanes anchored by distant wormgate approaches',
            laneLabel: 'Galactic logistics / Route network',
          }),
        ]}
        forgedArtifacts={[artifact('t1s02', 'Mantlelift Driver Coil')]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Route Network');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.galaxy.route_network.scan');
  });

  it('keeps forge-plus-route galaxy scenes on the Forge Spine plate', () => {
    render(
      <CivilizationScenePanel
        tier={3}
        palette={{ primary: '#dfb86b', secondary: '#5f3417', accent: '#ffe4a3' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 2,
          affinityCounts: { flare: 1, continuum: 1, verdance: 0, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: ['transit', 'ignition'],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScene="galaxy"
        defaultScanActive
        deploymentSites={[
          site(1, {
            id: 'artifact:t1s02',
            artifactId: 't1s02',
            title: 'Mantlelift Driver Coil Trace',
            trait: 'transit',
            affinity: 'continuum',
            artifactVisualMotif: 'coil',
            artifactSceneTreatment: 'mantlelift_driver',
            visibleAs: 'galactic freight lanes fed by planetary lift coils and orbital handoff stations',
            laneLabel: 'Galactic logistics / Launch corridor',
          }),
          site(2, {
            id: 'artifact:t1r01',
            artifactId: 't1r01',
            title: 'Ignition Kernel Trace',
            trait: 'ignition',
            affinity: 'flare',
            artifactVisualMotif: 'forge',
            artifactSceneTreatment: 'ignition_kernel',
            visibleAs: 'starbirth foundry sectors and controlled ignition wakes',
            laneLabel: 'Cosmic forge culture / Thermal sector',
          }),
        ]}
        forgedArtifacts={[
          artifact('t1s02', 'Mantlelift Driver Coil'),
          artifact('t1r01', 'Ignition Kernel'),
        ]}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-archetype-label')).toHaveTextContent('Visual identity // Forge Spine');
    expect(screen.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-slot', 'civilization.plate.galaxy.forge_spine.scan');
  });

  it('caps mobile scan influences at four', () => {
    mobileState.isMobile = true;
    const sites = Array.from({ length: 6 }, (_, index) => site(index + 1));

    render(
      <CivilizationScenePanel
        tier={2}
        palette={{ primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' }}
        profile={{
          key: 'test',
          seed: 1,
          artifactCount: 6,
          affinityCounts: { flare: 0, continuum: 0, verdance: 6, abyss: 0, radiance: 0 },
          traitCounts: {},
          traitWeights: {},
          dominantTraits: [],
          landmarks: [],
        }}
        progressFraction={1}
        paused
        defaultScanActive
        deploymentSites={sites}
        forgedArtifacts={sites.map((entry, index) => artifact(entry.artifactId!, `Artifact ${index + 1}`))}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: /Deployment Site/i })).toHaveLength(4);
    expect(screen.getByTestId('civilization-mobile-scan-rail')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-mobile-scan-command-primary'))
      .toHaveAttribute('data-impact-kind', 'artifact');
    expect(screen.getByTestId('civilization-mobile-scan-command-primary'))
      .toHaveAttribute('data-native-scene', 'surface');
    expect(screen.getAllByRole('button', { name: /Inspect scan site/i })).toHaveLength(4);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.getByText('+2 clustered')).toBeInTheDocument();
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

      expect(screen.getByLabelText('Ashroot Bloom Trace dossier')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Close scan dossier/i }));

      expect(screen.getByTestId('civilization-mobile-scan-command-primary'))
        .toHaveAttribute('data-recent-trace', 'true');
      expect(screen.getByTestId('civilization-mobile-scan-command-primary'))
        .toHaveTextContent(/New/i);
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
      .toHaveAttribute('data-art-slot', 'civilization.plate.surface.living_arcology.cinematic');
    expect(screen.getByTestId('civilization-miniature-trace-pulse')).toBeInTheDocument();
    expect(screen.getAllByTestId('civilization-miniature-registration-ring')).toHaveLength(2);
    expect(screen.getByTestId('civilization-miniature-work-ledger')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-plate-identity-grade')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-evolved-plate-state')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-plate-dialect')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-signature-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-environment-signatures')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-integrated-consequences')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-materialized-sites')).toHaveAttribute('data-render-mode', 'solid-local-forms');
    expect(screen.queryByTestId('civilization-artifact-substructures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-native-work-layer')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-integrated-lift')).toBeInTheDocument();
    expect(screen.getByText('Civilization updated')).toBeInTheDocument();
    expect(screen.getByText('Mantlelift Driver Coil')).toBeInTheDocument();
    expect(screen.getByText('Lift Driver')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scale-context')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-trait-dialect')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-scale-frame')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-trait-signatures')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /scan/i })).not.toBeInTheDocument();
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
    expect(screen.getByTestId('civilization-materialized-sites')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-integrated-lift')).toBeInTheDocument();
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
        deploymentSites={[site(1)]}
        forgedArtifacts={[artifact('t1r01', 'Ashroot Bloom')]}
        stabilityBand="crisis"
        activeConditions={['damaged', 'quarantined']}
        onOpenArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('civilization-scene-panel')).toHaveAttribute('data-stability', 'crisis');
    expect(screen.getByTestId('civilization-system-state')).toHaveAttribute('data-conditions', 'damaged,quarantined');
    expect(screen.getByTestId('civilization-system-state-label')).toHaveTextContent('Stability // Crisis // 2 active conditions');
  });
});
