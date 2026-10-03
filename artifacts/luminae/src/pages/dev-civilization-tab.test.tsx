import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DevCivilizationTab from './dev-civilization-tab';

vi.mock('@/components/CivilizationScenePanel', () => ({
  CivilizationScenePanel: ({
    civilization,
  }: {
    civilization?: { affinityIdentity?: { dominantDyad?: string | null } };
  }) => (
    <div
      data-testid="civilization-scene"
      data-dyad={civilization?.affinityIdentity?.dominantDyad ?? 'none'}
    />
  ),
}));

vi.mock('@/pages/game-affinity-well-panel', () => ({
  AffinityWellPanel: () => <div data-testid="affinity-well-panel" />,
}));

vi.mock('@/components/blueprints/BlueprintPresentationOverlay', () => ({
  BlueprintPresentationOverlay: ({
    manifestation,
    detonation,
    onComplete,
  }: {
    manifestation?: { blueprintId: string } | null;
    detonation?: { blueprintId: string; interceptedByBlueprintId?: string } | null;
    onComplete: () => void;
  }) => (
    <div
      data-testid={manifestation ? 'blueprint-manifestation' : 'blueprint-operation'}
      data-blueprint-id={manifestation?.blueprintId ?? detonation?.blueprintId}
      data-intercepted-by={detonation?.interceptedByBlueprintId}
    >
      <button type="button" onClick={onComplete}>Finish presentation</button>
    </div>
  ),
}));

vi.mock('@/components/CivilizationEventPresentationOverlay', () => ({
  CivilizationEventPresentationOverlay: ({
    event,
    onComplete,
  }: {
    event: { definitionId: string; outcomesByPlayerId: Record<string, { respondingManifestations: unknown[] }> };
    onComplete: () => void;
  }) => (
    <div
      data-testid="civilization-event-presentation"
      data-event-definition={event.definitionId}
      data-response-count={event.outcomesByPlayerId['blueprint-lab-player']?.respondingManifestations.length ?? 0}
    >
      <button type="button" onClick={onComplete}>Finish Event presentation</button>
    </div>
  ),
}));

describe('DevCivilizationTab', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/dev/civilization-tab');
  });

  function openLabControls() {
    const toggle = screen.getByRole('button', { name: /toggle civilization blueprint lab controls/i });
    if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
    return toggle;
  }

  it('assembles both loadout slots and requires the remaining civilization Legacy conditions', async () => {
    const { container } = render(<DevCivilizationTab />);

    openLabControls();

    const privateAssembly = await waitFor(() => {
      const element = container.querySelector('[data-blueprint-private="bp_antimatter_detonator"]');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    expect(within(privateAssembly).getByText('0 / 4')).toBeInTheDocument();
    expect(privateAssembly.querySelector('[data-blueprint-presentation="card"]')).toHaveAttribute(
      'data-blueprint-state',
      'assembling',
    );
    expect(container.querySelector('[data-blueprint-public="bp_antimatter_detonator"]')).toBeNull();

    expect(screen.getByRole('button', { name: /toggle civilization blueprint lab controls/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: /forge next/i }));
    }

    expect(await screen.findByTestId('blueprint-manifestation')).toHaveAttribute(
      'data-blueprint-id',
      'bp_antimatter_detonator',
    );
    expect(container.querySelector('[data-blueprint-private="bp_antimatter_detonator"]')).toBeNull();
    await waitFor(() => {
      expect(container.querySelector('[data-blueprint-public="bp_antimatter_detonator"]')).not.toBeNull();
    });
    const manifestedProject = container.querySelector(
      '[data-blueprint-public="bp_antimatter_detonator"]',
    ) as HTMLElement;
    expect(manifestedProject.querySelector('[data-blueprint-presentation="card"]')).toHaveAttribute(
      'data-blueprint-state',
      'manifested',
    );
    expect(within(manifestedProject).getByText('Armed')).toBeInTheDocument();
    expect(within(manifestedProject).queryByText(/Capability (online|dormant)/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Legacy Path: 1 of 4 conditions complete/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /finish presentation/i }));
    fireEvent.click(screen.getByRole('button', { name: /select blueprint slot 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /complete recipe/i }));

    expect(await screen.findByTestId('blueprint-manifestation')).toHaveAttribute(
      'data-blueprint-id',
      'bp_mantle_to_orbit_foundry',
    );
    fireEvent.click(screen.getByRole('button', { name: /finish presentation/i }));

    expect(await screen.findByLabelText(/Legacy Path: 2 of 4 conditions complete/i)).toBeInTheDocument();
    expect(container.querySelector('[data-blueprint-public="bp_mantle_to_orbit_foundry"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: /galactic identity/i }));
    expect(screen.getByLabelText(/Legacy Path: 3 of 4 conditions complete/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /defining trial/i }));

    expect(screen.getByLabelText(/Legacy Path: 4 of 4 conditions complete/i)).toBeInTheDocument();
    expect(screen.getAllByText('Legacy complete').length).toBeGreaterThan(0);
  });

  it('plays the manifestation when the completed fixture is opened directly', async () => {
    window.history.replaceState(null, '', '/dev/civilization-tab?assembly=4');

    const { container } = render(<DevCivilizationTab />);

    openLabControls();

    expect(await screen.findByTestId('blueprint-manifestation')).toHaveAttribute(
      'data-blueprint-id',
      'bp_antimatter_detonator',
    );
    expect(screen.getByTestId('civilization-scene')).toHaveAttribute('data-dyad', 'chrysalis');
    expect(container.querySelector('[data-blueprint-public="bp_antimatter_detonator"]')).not.toBeNull();
  });

  it('runs the first-contact Event through the production-shaped Civilization presentation', () => {
    render(<DevCivilizationTab />);

    openLabControls();
    fireEvent.click(screen.getByRole('button', { name: /test first-contact event/i }));

    expect(screen.getByTestId('civilization-event-presentation'))
      .toHaveAttribute('data-event-definition', 'event_stellar_containment_cascade');
    expect(screen.getByTestId('civilization-event-presentation'))
      .toHaveAttribute('data-response-count', '1');

    fireEvent.click(screen.getByRole('button', { name: /finish event presentation/i }));
    expect(screen.getByText(/entered the Civilization Record/i)).toBeInTheDocument();
  });

  it('tests Foundry uses, Overdrive storage, Broken Covenant recovery, and player-facing state', async () => {
    const { container } = render(<DevCivilizationTab />);

    openLabControls();

    fireEvent.click(screen.getByRole('button', { name: /select blueprint slot 2/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /broken covenant/i }));
    fireEvent.click(screen.getByRole('button', { name: /complete recipe/i }));
    fireEvent.click(await screen.findByRole('button', { name: /finish presentation/i }));

    const foundry = container.querySelector(
      '[data-blueprint-public="bp_mantle_to_orbit_foundry"]',
    ) as HTMLElement;
    expect(within(foundry).getByText('2 sustainable uses remaining')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /test sustainable forge/i }));
    expect(within(foundry).getByText('1 sustainable use remaining')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /test sustainable forge/i }));
    expect(within(foundry).getByText('Overdrive available')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /test foundry overdrive/i }));

    await waitFor(() => {
      expect(within(foundry).getByText('Recovering')).toBeInTheDocument();
      expect(within(foundry).getByText('3 components awaiting recovery')).toBeInTheDocument();
    });
    expect(screen.getByText(/Foundry Overdrive resolved/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /recover next component/i }));
    expect(within(foundry).getByText('2 components awaiting recovery')).toBeInTheDocument();
  });

  it('can swap a slot to Worldshield and test its real interception presentation', async () => {
    const { container } = render(<DevCivilizationTab />);

    openLabControls();

    fireEvent.change(screen.getByRole('combobox', { name: /blueprint in slot 1/i }), {
      target: { value: 'bp_worldshield_covenant' },
    });
    fireEvent.click(screen.getByRole('button', { name: /complete recipe/i }));
    fireEvent.click(await screen.findByRole('button', { name: /finish presentation/i }));

    const worldshield = container.querySelector(
      '[data-blueprint-public="bp_worldshield_covenant"]',
    ) as HTMLElement;
    expect(within(worldshield).getByText('Vigilant')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /test hostile interception/i }));
    expect(await screen.findByTestId('blueprint-operation')).toHaveAttribute(
      'data-intercepted-by',
      'bp_worldshield_covenant',
    );
    expect(within(worldshield).getByText('Spent')).toBeInTheDocument();
  });

  it('collapses developer controls and resets the projected runtime state', async () => {
    const { container } = render(<DevCivilizationTab />);

    const shell = container.querySelector('[data-dev-civilization-tab="true"]');
    expect(shell).toHaveAttribute('data-board-layout', 'base');
    expect(shell).toHaveAttribute('data-board-density', 'stacked');
    expect(screen.getByTestId('game-board')).toHaveAttribute('data-active-tab', 'hand');
    expect(container.querySelector('.game-header')).not.toBeNull();
    expect(shell).toHaveAttribute('data-civilization-slice', 'chrysalis');
    expect(screen.getByTestId('civilization-scene')).toHaveAttribute('data-dyad', 'chrysalis');
    expect(screen.getByRole('button', { name: /toggle civilization blueprint lab controls/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    const toggle = openLabControls();

    fireEvent.click(screen.getByRole('button', { name: /complete recipe/i }));
    fireEvent.click(await screen.findByRole('button', { name: /finish presentation/i }));
    expect(container.querySelector('[data-blueprint-public="bp_antimatter_detonator"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /reset lab/i }));
    expect(container.querySelector('[data-blueprint-public="bp_antimatter_detonator"]')).toBeNull();
    expect(container.querySelector('[data-blueprint-private="bp_antimatter_detonator"]')).not.toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /complete recipe/i })).toBeNull();
    expect(screen.getByTestId('civilization-scene')).toBeInTheDocument();
  });
});
