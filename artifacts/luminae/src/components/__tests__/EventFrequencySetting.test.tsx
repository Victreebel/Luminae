import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EventFrequency } from '@workspace/game-types';
import { EventFrequencySetting } from '../EventFrequencySetting';

afterEach(cleanup);

describe('Event frequency settings', () => {
  it('lets the host choose Off and Frequent independently of other match settings', () => {
    function HostSetting() {
      const [value, setValue] = useState<EventFrequency>('standard');
      return <EventFrequencySetting value={value} onChange={setValue} />;
    }
    render(<HostSetting />);
    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();
    expect(screen.getByText(/3 random Events: 1 per tier in a separate Event deck/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Frequent' }));
    expect(screen.getByRole('radio', { name: 'Frequent' })).toBeChecked();
    expect(screen.getByText(/6 random Events: 2 per tier in a separate Event deck/)).toBeInTheDocument();
    expect(screen.getByText(/Encounters depend on match length/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Off' }));
    expect(screen.getByRole('radio', { name: 'Off' })).toBeChecked();
    expect(screen.getByText(/No random Events occur/)).toBeInTheDocument();
  });

  it('shows joiners the same setting without editable controls', () => {
    render(<EventFrequencySetting value="frequent" />);
    expect(screen.getByRole('group', { name: 'Events: Frequent' })).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText(/6 random Events/)).toBeInTheDocument();
  });

  it('disables every option while a room setting is being saved', () => {
    render(<EventFrequencySetting value="standard" onChange={vi.fn()} disabled />);
    for (const option of screen.getAllByRole('radio')) expect(option).toBeDisabled();
  });
});
