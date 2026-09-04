import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoardAuxModules,
  BoardCivilizationTraceNotice,
  type CivilizationPreviewModel,
} from '@/pages/game-civilization-preview';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';

vi.mock('@/components/CivilizationScenePanel', () => ({
  CivilizationMiniatureScene: ({
    presentation = 'standard',
    recentSiteIds,
  }: {
    presentation?: string;
    recentSiteIds: readonly string[];
  }) => (
    <div
      data-testid="civilization-miniature-scene"
      data-presentation={presentation}
      data-recent-site-ids={recentSiteIds.join(',')}
    />
  ),
}));

const model: CivilizationPreviewModel = {
  name: 'Verdant Continuum',
  tier: 2,
  palette: { primary: '#4ade80', secondary: '#14532d', accent: '#bbf7d0' },
  profile: {
    key: 'preview',
    seed: 1,
    artifactCount: 2,
    affinityCounts: { flare: 0, continuum: 1, verdance: 1, abyss: 0, radiance: 0 },
    traitCounts: {},
    traitWeights: {},
    dominantTraits: ['transit'],
    landmarks: [],
  },
  forgedCount: 2,
};

const deploymentSite: CivilizationDeploymentSite = {
  id: 'artifact:t1s02',
  kind: 'artifact',
  scaleBand: 'stellar',
  trait: 'transit',
  artifactId: 't1s02',
  affinity: 'continuum',
  artifactTier: 1,
  artifactForm: 'Transit Component',
  blueprintRole: 'planetary-to-orbit mass acceleration',
  engineeringScale: 'Planetary',
  representationMode: 'civilization_infrastructure',
  sourceQuality: 'authored',
  consequenceLabel: 'Orbital logistics',
  visualCue: 'freight lanes crossing the upper atmosphere',
  synergySummary: 'This trace is combining with related civic work.',
  supportingArtifactNames: [],
  anchor: { x: 46, y: 54 },
  depictionScale: 'room',
  artifactVisualMotif: 'coil',
  priority: 100,
  title: 'Mantlelift Driver Coil Trace',
  summary: 'The room-scale coil registers through the routes it enables.',
  visibleAs: 'freight lanes crossing the upper atmosphere',
  laneLabel: 'Orbital logistics',
  relatedArtifactIds: ['t1s02'],
};

const contextSite: CivilizationDeploymentSite = {
  ...deploymentSite,
  id: 'artifact:t1r02',
  artifactId: 't1r02',
  affinity: 'verdance',
  trait: 'biosphere',
  artifactForm: 'Recovery Seed',
  consequenceLabel: 'Habitat ecology',
  priority: 90,
  title: 'Ashroot Bloom Trace',
  summary: 'The recovery seed registers through habitat ecology.',
  visibleAs: 'living habitat bands between worlds',
  laneLabel: 'Habitat ecology',
  relatedArtifactIds: ['t1r02'],
};

const blueprintSite: CivilizationDeploymentSite = {
  ...deploymentSite,
  id: 'blueprint:bp_antimatter_detonator',
  kind: 'blueprint',
  artifactId: undefined,
  blueprintId: 'bp_antimatter_detonator',
  representationMode: 'blueprint_consequence',
  priority: 130,
  title: 'Antimatter Quarantine Orbit',
  summary: 'The recovered Blueprint registers as controlled annihilation infrastructure.',
  visibleAs: 'a cold red exclusion path around the inhabited system',
  laneLabel: 'Recovered Blueprint',
  relatedArtifactIds: [],
};

const luminarySite: CivilizationDeploymentSite = {
  ...deploymentSite,
  id: 'luminary:lum_continuum',
  kind: 'luminary',
  artifactId: undefined,
  representationMode: 'luminary_influence',
  priority: 120,
  title: 'Continuum Luminary Pressure',
  summary: 'The allied Luminary alters civilization behavior instead of appearing as a body.',
  visibleAs: 'Continuum pressure in the civilization weather, light, and civic rhythm',
  laneLabel: 'Luminary influence',
  relatedArtifactIds: [],
};

const protocolSite: CivilizationDeploymentSite = {
  ...deploymentSite,
  id: 'protocol:sealed_protocol_01',
  kind: 'protocol',
  artifactId: undefined,
  representationMode: 'sealed_protocol',
  priority: 125,
  title: 'Sealed Protocol 01',
  summary: 'The civilization can read only the active scar left by a sealed protocol.',
  visibleAs: 'a redacted signal scar in the deployment intelligence layer',
  laneLabel: 'Sealed protocol',
  relatedArtifactIds: [],
};

const chronicleSite: CivilizationDeploymentSite = {
  ...deploymentSite,
  id: 'chronicle:outer_vault_access',
  kind: 'chronicle',
  artifactId: undefined,
  chronicleId: 'outer_vault_access',
  representationMode: 'chronicle_record',
  priority: 118,
  title: 'Outer Vault Access',
  summary: 'The recovered thread changes how the civilization remembers the first opened threshold.',
  visibleAs: 'a restored archive signal threaded through civic memory and threshold records',
  laneLabel: 'Recovered story thread',
  relatedArtifactIds: [],
};

describe('BoardAuxModules', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a recent civilization trace visible briefly, then acknowledges it', () => {
    vi.useFakeTimers();
    const onRecentSiteIdsSeen = vi.fn();
    const onOpenCivilization = vi.fn();

    render(
      <BoardAuxModules
        placement="rail"
        playerEminence={4}
        civilizationModel={model}
        deploymentSites={[deploymentSite, contextSite]}
        recentSiteIds={['artifact:t1s02']}
        progressFraction={1}
        onRecentSiteIdsSeen={onRecentSiteIdsSeen}
        onOpenCivilization={onOpenCivilization}
      />,
    );

    expect(screen.getAllByText('Mantlelift Driver Coil Trace')).toHaveLength(1);
    expect(screen.getByTestId('civilization-preview-registration')).toHaveTextContent('Artifact trace integrated');
    expect(screen.getByTestId('civilization-preview-registration')).toHaveTextContent('Mantlelift Driver Coil Trace');
    expect(screen.getByTestId('civilization-preview-registration')).toHaveTextContent('freight lanes crossing the upper atmosphere');
    expect(screen.getByTestId('civilization-preview-registration')).toHaveAttribute('data-impact-kind', 'artifact');
    expect(screen.getByTestId('civilization-preview-registration-sweep')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-preview-header-pulse')).toHaveTextContent('New');
    expect(screen.getByTestId('civilization-preview-impact-ledger')).not.toHaveTextContent('Mantlelift Driver Coil Trace');
    expect(screen.getByTestId('civilization-preview-impact-ledger')).toHaveTextContent('Ashroot Bloom Trace');
    expect(screen.getByText('1 new trace')).toBeInTheDocument();
    const scanButton = screen.getByRole('button', { name: 'Open Civilization scan for new traces' });
    fireEvent.click(scanButton);
    expect(onOpenCivilization).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Civilization preview')).toHaveAttribute('data-civilization-recent', 'true');
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute(
      'data-recent-site-ids',
      'artifact:t1s02',
    );
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute('data-presentation', 'standard');

    act(() => {
      vi.advanceTimersByTime(6_500);
    });

    expect(onRecentSiteIdsSeen).not.toHaveBeenCalled();
    expect(screen.getByTestId('civilization-preview-registration')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    expect(onRecentSiteIdsSeen).toHaveBeenCalledWith(['artifact:t1s02']);
    expect(screen.getByText('2 forged')).toBeInTheDocument();
    expect(screen.queryByTestId('civilization-preview-registration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-preview-registration-sweep')).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-preview-header-pulse')).not.toBeInTheDocument();
    expect(screen.getByTestId('civilization-preview-impact-ledger')).toHaveTextContent('Mantlelift Driver Coil Trace');
    expect(screen.getByLabelText('Civilization preview')).not.toHaveAttribute('data-civilization-recent');
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute('data-recent-site-ids', '');
  });

  it('offers a steady scan entry point when no recent trace is active', () => {
    const onOpenCivilization = vi.fn();

    render(
      <BoardAuxModules
        placement="rail"
        playerEminence={4}
        civilizationModel={model}
        deploymentSites={[deploymentSite, contextSite]}
        recentSiteIds={[]}
        progressFraction={1}
        onOpenCivilization={onOpenCivilization}
      />,
    );

    expect(screen.getByText('2 forged')).toBeInTheDocument();
    const scanButton = screen.getByRole('button', { name: 'Open Civilization scan' });
    fireEvent.click(scanButton);
    expect(onOpenCivilization).toHaveBeenCalledTimes(1);
  });

  it('labels non-artifact civilization registrations by impact type', () => {
    const cases: Array<{
      site: CivilizationDeploymentSite;
      recentSiteId: string;
      impactKind: string;
      kicker: string;
      badge: string;
    }> = [
      {
        site: blueprintSite,
        recentSiteId: 'blueprint:bp_antimatter_detonator',
        impactKind: 'blueprint',
        kicker: 'Blueprint reshapes civilization',
        badge: 'BP',
      },
      {
        site: luminarySite,
        recentSiteId: 'luminary:lum_continuum',
        impactKind: 'luminary',
        kicker: 'Luminary pressure detected',
        badge: 'LUM',
      },
      {
        site: protocolSite,
        recentSiteId: 'protocol:sealed_protocol_01',
        impactKind: 'protocol',
        kicker: 'Sealed protocol active',
        badge: 'SEAL',
      },
      {
        site: chronicleSite,
        recentSiteId: 'chronicle:outer_vault_access',
        impactKind: 'chronicle',
        kicker: 'Chronicle thread restored',
        badge: 'CHR',
      },
    ];

    const { rerender } = render(
      <BoardAuxModules
        placement="rail"
        playerEminence={4}
        civilizationModel={model}
        deploymentSites={[cases[0]!.site, deploymentSite]}
        recentSiteIds={[cases[0]!.recentSiteId]}
        progressFraction={1}
      />,
    );

    for (const entry of cases) {
      rerender(
        <BoardAuxModules
          placement="rail"
          playerEminence={4}
          civilizationModel={model}
          deploymentSites={[entry.site, deploymentSite]}
          recentSiteIds={[entry.recentSiteId]}
          progressFraction={1}
        />,
      );

      const registration = screen.getByTestId('civilization-preview-registration');
      expect(registration).toHaveAttribute('data-impact-kind', entry.impactKind);
      expect(registration).toHaveTextContent(entry.kicker);
      expect(registration).toHaveTextContent(entry.badge);
      expect(registration).toHaveTextContent(entry.site.visibleAs!);
    }
  });
});

describe('BoardCivilizationTraceNotice', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('surfaces a base-board civilization registration and opens the scan tab on click', () => {
    vi.useFakeTimers();
    const onOpenCivilization = vi.fn();
    const onRecentSiteIdsSeen = vi.fn();

    render(
      <BoardCivilizationTraceNotice
        deploymentSites={[deploymentSite, contextSite]}
        recentSiteIds={['artifact:t1s02']}
        palette={model.palette}
        civilizationModel={model}
        progressFraction={1}
        onRecentSiteIdsSeen={onRecentSiteIdsSeen}
        onOpenCivilization={onOpenCivilization}
      />,
    );

    const notice = screen.getByTestId('board-civilization-trace-notice');
    expect(notice).toHaveTextContent('New artifact trace');
    expect(notice).toHaveTextContent('Mantlelift Driver Coil Trace');
    expect(notice).toHaveTextContent('freight lanes crossing the upper atmosphere');
    expect(notice).toHaveAttribute('data-impact-kind', 'artifact');
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute(
      'data-recent-site-ids',
      'artifact:t1s02',
    );
    expect(screen.getByTestId('civilization-miniature-scene')).toHaveAttribute('data-presentation', 'thumbnail');

    fireEvent.click(notice);
    expect(onOpenCivilization).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(8_000);
    });

    expect(screen.queryByTestId('board-civilization-trace-notice')).not.toBeInTheDocument();
    expect(onRecentSiteIdsSeen).toHaveBeenCalledWith(['artifact:t1s02']);
  });

  it('honors recent trace order over deployment priority in the base-board notice', () => {
    vi.useFakeTimers();
    const onOpenCivilization = vi.fn();

    render(
      <BoardCivilizationTraceNotice
        deploymentSites={[blueprintSite, deploymentSite]}
        recentSiteIds={['artifact:t1s02', 'blueprint:bp_antimatter_detonator']}
        palette={model.palette}
        civilizationModel={model}
        progressFraction={1}
        onOpenCivilization={onOpenCivilization}
      />,
    );

    const notice = screen.getByTestId('board-civilization-trace-notice');
    expect(notice).toHaveTextContent('New artifact trace');
    expect(notice).toHaveTextContent('Mantlelift Driver Coil Trace');
    expect(notice).not.toHaveTextContent('Antimatter Quarantine Orbit');
  });

  it('surfaces non-artifact base-board registrations with category badges', () => {
    vi.useFakeTimers();
    const onOpenCivilization = vi.fn();

    const { rerender } = render(
      <BoardCivilizationTraceNotice
        deploymentSites={[blueprintSite]}
        recentSiteIds={['blueprint:bp_antimatter_detonator']}
        palette={model.palette}
        onOpenCivilization={onOpenCivilization}
      />,
    );

    const cases: Array<{
      site: CivilizationDeploymentSite;
      recentSiteId: string;
      impactKind: string;
      kicker: string;
      badge: string;
    }> = [
      {
        site: blueprintSite,
        recentSiteId: 'blueprint:bp_antimatter_detonator',
        impactKind: 'blueprint',
        kicker: 'Blueprint online',
        badge: 'BP',
      },
      {
        site: luminarySite,
        recentSiteId: 'luminary:lum_continuum',
        impactKind: 'luminary',
        kicker: 'Luminary pressure',
        badge: 'LUM',
      },
      {
        site: protocolSite,
        recentSiteId: 'protocol:sealed_protocol_01',
        impactKind: 'protocol',
        kicker: 'Protocol sealed',
        badge: 'SEAL',
      },
      {
        site: chronicleSite,
        recentSiteId: 'chronicle:outer_vault_access',
        impactKind: 'chronicle',
        kicker: 'Chronicle restored',
        badge: 'CHR',
      },
    ];

    for (const entry of cases) {
      rerender(
        <BoardCivilizationTraceNotice
          deploymentSites={[entry.site]}
          recentSiteIds={[entry.recentSiteId]}
          palette={model.palette}
          onOpenCivilization={onOpenCivilization}
        />,
      );

      const notice = screen.getByTestId('board-civilization-trace-notice');
      expect(notice).toHaveAttribute('data-impact-kind', entry.impactKind);
      expect(notice).toHaveTextContent(entry.kicker);
      expect(notice).toHaveTextContent(entry.badge);
      expect(notice).toHaveTextContent(entry.site.visibleAs!);
    }
  });
});
