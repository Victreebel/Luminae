import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssimilateButton, EncryptButton, ForgeButton } from '../ForgeEncryptButton';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

describe('AssimilateButton', () => {
  it('shows a nanomachine-style Assimilation symbol and communicates that the action is free', () => {
    render(
      <AssimilateButton
        onClick={vi.fn()}
        label="Assimilate"
        subtitle="Free · +1 verdance · 0 Eminence"
        bonusAffinity="verdance"
      />,
    );

    expect(screen.getByTestId('assimilate-symbol')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assimilate/i })).toBeEnabled();
    expect(screen.getByText(/Free · \+1 verdance · 0 Eminence/)).toBeInTheDocument();
  });
});

describe('artifact action buttons', () => {
  it('exposes shared responsive hooks for the primary and secondary labels', () => {
    render(
      <div>
        <ForgeButton onClick={vi.fn()} label="Forge" subtitle="Forge Artifact" />
        <EncryptButton onClick={vi.fn()} label="Encrypt" subtitle="Reserve Artifact" />
      </div>,
    );

    const forgeButton = screen.getByRole('button', { name: /^Forge/i });
    const encryptButton = screen.getByRole('button', { name: /^Encrypt/i });

    expect(forgeButton).toHaveClass('btn-forge-idle');
    expect(forgeButton.querySelector('.artifact-action-label')).toHaveTextContent('Forge');
    expect(forgeButton.querySelector('.artifact-action-subtitle')).toHaveTextContent('Forge Artifact');

    expect(encryptButton).toHaveClass('btn-encrypt-idle');
    expect(encryptButton.querySelector('.artifact-action-label')).toHaveTextContent('Encrypt');
    expect(encryptButton.querySelector('.artifact-action-subtitle')).toHaveTextContent('Reserve Artifact');
  });
});
