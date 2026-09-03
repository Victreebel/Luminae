import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DevLuminarySequencePanel } from '@/components/DevLuminarySequencePanel';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DevLuminarySequencePanel', () => {
  it('submits the selected order and delayed-effect options to the live-game route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        summonEventIds: ['lum_moth-v1', 'lum_null-v1'],
        activationEventIds: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onPrepareRun = vi.fn();
    const onRunQueued = vi.fn();
    const onClose = vi.fn();

    render(
      <DevLuminarySequencePanel
        roomId="room-1"
        sessionToken="session-1"
        presentationActive={false}
        onPrepareRun={onPrepareRun}
        onRunQueued={onRunQueued}
        onRestore={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /The Null Sovereign/ }));
    fireEvent.click(screen.getByRole('button', { name: /Red Moth/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Red Moth earlier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run 2 Luminaries' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(onPrepareRun).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dev/rooms/room-1/luminary-sequence',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          sessionToken: 'session-1',
          luminaryIds: ['lum_moth', 'lum_null'],
          includeNextTurnEffects: true,
          repeatFromBaseline: true,
        }),
      }),
    );
    expect(onPrepareRun).toHaveBeenCalledWith('canonical');
    await waitFor(() => expect(onRunQueued).toHaveBeenCalledTimes(1));
    expect(onRunQueued).toHaveBeenCalledWith('canonical');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('blocks another run while a presentation is active', () => {
    render(
      <DevLuminarySequencePanel
        roomId="room-1"
        sessionToken="session-1"
        presentationActive
        onPrepareRun={vi.fn()}
        onRunQueued={vi.fn()}
        onRestore={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/current presentation must finish/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeDisabled();
  });
});
