import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CivilizationPublicState } from '@workspace/api-client-react';
import { ARTIFACT_CATALOG } from '@workspace/game-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DevCivilizationScene from './dev-civilization-scene';
import { CIVILIZATION_PARCEL_PROOFS } from '@/lib/civilizationParcelProof';

const sceneRender = vi.hoisted(() => vi.fn());

vi.mock('@/components/CivilizationScenePanel', () => ({
  CivilizationScenePanel: ({ civilization }: { civilization: CivilizationPublicState }) => {
    sceneRender(civilization);
    return <div data-testid="preview-scene" />;
  },
}));

vi.mock('@/pages/game-civilization-preview', () => ({
  BoardCivilizationTraceNotice: () => null,
}));

function latestCivilization(): CivilizationPublicState {
  return sceneRender.mock.calls.at(-1)?.[0];
}

function expectPreviewBudget() {
  const artifactIds = latestCivilization().artifacts.map((artifact) => artifact.artifactId);
  expect(artifactIds).toHaveLength(90);
  expect(new Set(artifactIds).size).toBe(90);
  expect([1, 2, 3].map((tier) => ARTIFACT_CATALOG.filter(
    (artifact) => artifact.tier === tier && artifactIds.includes(artifact.id),
  ).length)).toEqual([40, 30, 20]);
  expect(screen.getByTestId('civilization-proof-roster').querySelectorAll('[data-artifact-id]')).toHaveLength(90);
}

describe('DevCivilizationScene saturated dyad priority', () => {
  beforeEach(() => {
    sceneRender.mockClear();
    window.history.replaceState(null, '', '/dev/civilization-scene?proof=saturated&dyad=chrysalis');
  });

  afterEach(cleanup);

  it('keeps the preview budget when toggled and reports the actual permanent district counts', () => {
    render(<DevCivilizationScene />);
    const checkbox = screen.getByRole('checkbox', { name: 'Prioritize Chrysalis districts' });
    expect(checkbox).not.toBeChecked();
    expectPreviewBudget();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(new URLSearchParams(window.location.search).get('dyadPriority')).toBe('1');
    expectPreviewBudget();

    const districts = Object.values(latestCivilization().districtIdentity.districts)
      .filter((district) => district.residentArtifactIds.length > 0);
    const matching = districts.filter((district) => district.permanentDyad === 'chrysalis').length;
    const neutral = districts.filter((district) => district.permanentDyad === null).length;
    const counts = document.getElementById('civilization-saturated-district-count');
    expect(counts).toHaveTextContent(
      `${matching} of ${districts.length} districts permanently founded as Chrysalis; ${neutral} neutral`,
    );
    expect(matching).toBeGreaterThan(0);
    expect(matching).toBeLessThan(districts.length);

    fireEvent.click(checkbox);
    expect(new URLSearchParams(window.location.search).has('dyadPriority')).toBe(false);
    expectPreviewBudget();
  });

  it('restores priority for Galactic Metropolis and follows the existing dyad selector', () => {
    window.history.replaceState(null, '', '/dev/civilization-scene?proof=galactic-city&dyad=chrysalis&dyadPriority=1');
    render(<DevCivilizationScene />);
    expect(screen.getByRole('checkbox', { name: 'Prioritize Chrysalis districts' })).toBeChecked();
    expectPreviewBudget();

    fireEvent.change(screen.getByRole('combobox', { name: 'Preview Dyad' }), { target: { value: 'echo' } });
    expect(screen.getByRole('checkbox', { name: 'Prioritize Echo districts' })).toBeChecked();
    expect(new URLSearchParams(window.location.search).get('dyad')).toBe('echo');
    expect(new URLSearchParams(window.location.search).get('dyadPriority')).toBe('1');
    expectPreviewBudget();

    fireEvent.click(screen.getByRole('button', { name: 'Loadout A' }));
    expect(screen.queryByRole('checkbox', { name: /Prioritize .* districts/ })).not.toBeInTheDocument();
    expect(latestCivilization().artifacts).toHaveLength(16);
  });

  it.each(CIVILIZATION_PARCEL_PROOFS)('replays the $family parcel witness through its final founding forge', ({ family, artifactIds }) => {
    window.history.replaceState(null, '', `/dev/civilization-scene?proof=parcel-coverage&parcelWitness=${family}&parcelStep=${artifactIds.length - 1}`);
    render(<DevCivilizationScene />);
    const before = latestCivilization().districtIdentity;
    const districtId = `district:${family}:2`;
    expect(before.districts[districtId]).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Next forge' }));
    const after = latestCivilization().districtIdentity;
    expect(after.districts[districtId]).toMatchObject({
      family, instance: 2, permanentDyad: null, residentArtifactIds: [artifactIds.at(-1)],
    });
    for (const [artifactId, assignment] of Object.entries(before.artifactAssignments)) {
      expect(after.artifactAssignments[artifactId]).toBe(assignment);
    }
    for (const [id, district] of Object.entries(before.districts)) {
      if (district.permanentDyad) expect(after.districts[id].permanentDyad).toBe(district.permanentDyad);
    }
    expect(screen.getByRole('button', { name: 'Next forge' })).toBeDisabled();
    expect(new URLSearchParams(window.location.search).get('parcelStep')).toBe(String(artifactIds.length));
    fireEvent.click(screen.getByRole('button', { name: 'Previous forge' }));
    expect(latestCivilization().districtIdentity.districts[districtId]).toBeUndefined();
  });

  it('clamps a restored parcel step and resets the step when selecting another witness', () => {
    window.history.replaceState(null, '', '/dev/civilization-scene?proof=parcel-coverage&parcelWitness=invalid&parcelStep=999');
    render(<DevCivilizationScene />);
    expect(screen.getByRole('combobox', { name: 'Parcel history' })).toHaveValue('wilderness_margin');
    expect(screen.getByTestId('civilization-parcel-proof-step')).toHaveTextContent('18 / 18');
    fireEvent.change(screen.getByRole('combobox', { name: 'Parcel history' }), { target: { value: 'coastal_margin' } });
    expect(screen.getByTestId('civilization-parcel-proof-step')).toHaveTextContent('30 / 30');
    expect(latestCivilization().districtIdentity.districts['district:coastal_margin:2']).toBeDefined();
    expect(new URLSearchParams(window.location.search).get('parcelWitness')).toBe('coastal_margin');
  });

  it('repairs the final resident without changing the forged roster, district history or influence', () => {
    window.history.replaceState(null, '', '/dev/civilization-scene?proof=district-dyad&districtStep=14');
    render(<DevCivilizationScene />);
    const healthy = latestCivilization();
    expect(healthy.districtIdentity.presentationDyad).toBe('echo');
    expect(healthy.districtIdentity.districts['district:industrial_district:0'].permanentDyad).toBe('chrysalis');
    expect(healthy.artifacts.every(({ implementationState }) => implementationState === 'operational')).toBe(true);

    fireEvent.click(screen.getByTestId('civilization-district-step-15'));
    const damaged = latestCivilization();
    expect(damaged.artifacts.filter(({ implementationState }) => implementationState === 'damaged')
      .map(({ artifactId }) => artifactId)).toEqual(['t1o01']);
    expect(damaged.districtIdentity).toEqual(healthy.districtIdentity);

    fireEvent.click(screen.getByTestId('civilization-district-step-16'));
    const repaired = latestCivilization();
    expect(repaired.artifacts).toEqual(healthy.artifacts);
    expect(repaired.districtIdentity).toEqual(healthy.districtIdentity);
    expect(repaired.manifestationAssignments).toEqual(healthy.manifestationAssignments);
    expect(new URLSearchParams(window.location.search).get('districtStep')).toBe('16');

    cleanup();
    render(<DevCivilizationScene />);
    expect(latestCivilization().artifacts).toEqual(healthy.artifacts);
    expect(screen.getByTestId('civilization-district-step-16')).toHaveAttribute('aria-pressed', 'true');
  });
});
