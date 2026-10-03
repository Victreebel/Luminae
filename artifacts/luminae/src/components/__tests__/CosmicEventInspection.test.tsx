import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CosmicEventTargetEvidence } from '../CosmicEventTargetEvidence';
import { CosmicEventPoolReference } from '../CosmicEventPoolReference';

afterEach(cleanup);

describe('Event targeting inspection', () => {
  it('shows the recorded reason even when the Artifact is no longer currently forged', () => {
    render(<CosmicEventTargetEvidence evidence={[{
      artifactId: 't1s04',
      match: { kind: 'event_fact', id: 'dependency:distributed_synchronization' },
      role: 'target',
      reason: 'Distributed synchronization matched at activation.',
    }]} />);
    const evidence = screen.getByRole('list', { name: 'Why these Artifacts were affected' });
    expect(within(evidence).getByText(/Targeted:/)).toBeInTheDocument();
    expect(within(evidence).getByText(/Distributed synchronization matched at activation/)).toBeInTheDocument();
    expect(screen.queryByText('t1s04')).not.toBeInTheDocument();
  });

  it('shows only the announced match pool and hides inactive pilot Events', () => {
    render(<CosmicEventPoolReference eventContentProfile="general_v1" eventCardPool={[
      'event_stellar_system_shock', 'event_galactic_fracture_wave', 'event_stellar_system_shock',
    ]} />);
    expect(screen.getByText('Events in this match')).toBeInTheDocument();
    expect(screen.getByText('System Shock.')).toBeInTheDocument();
    expect(screen.getByText('Fracture Wave.')).toBeInTheDocument();
    expect(screen.queryByText('Signal Clarity.')).not.toBeInTheDocument();
    expect(screen.queryByText('Synchronization Shear.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(2);
  });

  it('does not fabricate a pool for a legacy game that has not announced one', () => {
    const { container } = render(<CosmicEventPoolReference />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces an explicitly disabled Event selection', () => {
    render(<CosmicEventPoolReference eventFrequency="off" eventCardPool={[]} />);
    expect(screen.getByText('Events in this match')).toBeInTheDocument();
    expect(screen.getByText('Event frequency: Off')).toBeInTheDocument();
    expect(screen.getByText(/No Event cards were added/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem', { hidden: true })).toHaveLength(0);
  });

  it('shows the actual included count and setting without promising encounters', () => {
    render(<CosmicEventPoolReference eventFrequency="standard" eventCardPool={[
      'event_planetary_affinity_bloom', 'event_stellar_system_shock', 'event_galactic_fracture_wave',
    ]} />);
    expect(screen.getByText('Event frequency: Standard')).toBeInTheDocument();
    expect(screen.getByText(/3 unique Event cards were included at match creation/)).toBeInTheDocument();
    expect(screen.getByText(/Encounters are not guaranteed/)).toBeInTheDocument();
  });

  it('describes a scheduled pool as candidates without claiming all cards were selected', () => {
    render(<CosmicEventPoolReference eventDelivery="scheduled_forge_v1" eventFrequency="standard" eventCardPool={[
      'event_planetary_affinity_bloom', 'event_planetary_forge_drift', 'event_stellar_system_shock',
      'event_stellar_affinity_inversion', 'event_galactic_fracture_wave', 'event_galactic_entropy_storm', 'event_galactic_terminus_tide',
    ]} />);
    expect(screen.getByText('Possible Events')).toBeInTheDocument();
    expect(screen.getByText(/selected cards and their order stay hidden/)).toBeInTheDocument();
    expect(screen.getByText(/Events use a separate deck/)).toBeInTheDocument();
    expect(screen.queryByText(/7 unique Event cards were included/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('civilization-event-forecast')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(7);
  });
});
