import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ARTIFACT_CATALOG,
  createInitialCivilizationState,
  reconcileCivilizationDerivedState,
  type CivilizationDistrictInstance,
} from '@workspace/game-types';
import { CivilizationDistrictResidents } from '@/components/CivilizationDistrictResidents';
import {
  buildCivilizationArtifactWorldAnchors,
  CivilizationArtifactManifestationLayer,
} from '@/components/CivilizationArtifactManifestationLayer';
import { buildCivilizationDeploymentSites } from '@/lib/civilizationDeploymentSites';
import { getCivilizationDistrictPresentation } from '@/lib/civilizationDistrictPresentation';
import { CIVILIZATION_DISTRICT_DYAD_PROOF_IDS } from '@/lib/civilizationArtifactProof';
import { getCivilizationDistrictResidents } from '@/lib/civilizationDistrictResidents';

const SITES = buildCivilizationDeploymentSites({
  forgedArtifacts: ARTIFACT_CATALOG.map((card) => ({ ...card, name: card.id, flavor: '' })),
  tier: 3,
});
const INDUSTRY: CivilizationDistrictInstance = {
  districtId: 'district:industrial_district:0',
  family: 'industrial_district', instance: 0,
  residentArtifactIds: ['t1r01', 't1r07', 't1o05'],
  residentAffinities: ['flare', 'abyss'], foundingAffinities: ['flare', 'abyss'],
  permanentDyad: 'chrysalis', softCapacity: 2, hardCapacity: 3, influence: 3,
  establishedTurnCount: 1, committedTurnCount: 3, historyEvidence: 'recorded',
};
const resident = (id: string) => document.querySelector<HTMLElement>(`[data-artifact-id="${id}"]`)!;

function stateAtProofStep(step: number) {
  let state = createInitialCivilizationState();
  CIVILIZATION_DISTRICT_DYAD_PROOF_IDS.slice(0, step).forEach((artifactId, index) => {
    const turnCount = index + 1;
    state.artifacts[artifactId] = {
      artifactId, firstMasteredTurnCount: turnCount, masteryCount: 1,
      implementationState: 'operational', implementationStateChangedTurnCount: turnCount,
      implementationChangeSource: null, historyEvidence: 'recorded',
    };
    state = reconcileCivilizationDerivedState(state, [], turnCount, {}, { commitPresentation: false });
    state = reconcileCivilizationDerivedState(state, [], turnCount, {}, { commitPresentation: true });
  });
  return state;
}

const CIVIC = stateAtProofStep(9).districtIdentity.districts['district:civic_core:0']!;
const PROOF_DISTRICTS = Object.values(stateAtProofStep(14).districtIdentity.districts);

describe('district resident integration', () => {
  afterEach(cleanup);

  it('adds residents without moving earlier bays or leaving the fitted district footprint', () => {
    const { rerender } = render(<CivilizationDistrictResidents
      district={{ ...INDUSTRY, residentArtifactIds: ['t1r01'] }} sites={SITES}
    />);
    const first = resident('t1r01');
    const firstStyle = first.getAttribute('style');
    rerender(<CivilizationDistrictResidents district={{ ...INDUSTRY, residentArtifactIds: ['t1r01', 't1r07'] }} sites={SITES} />);
    const second = resident('t1r07');
    const secondStyle = second.getAttribute('style');
    rerender(<CivilizationDistrictResidents district={INDUSTRY} sites={SITES} />);
    expect(resident('t1r01')).toBe(first);
    expect(first.getAttribute('style')).toBe(firstStyle);
    expect(resident('t1r07')).toBe(second);
    expect(second.getAttribute('style')).toBe(secondStyle);
    const boxes = screen.getAllByTestId('civilization-district-resident').map(({ style }) => {
      const [imageWidth, imageHeight] = style.aspectRatio.split('/').map(Number);
      const width = Number.parseFloat(style.width), height = width * imageHeight! / imageWidth!;
      const x = Number.parseFloat(style.left), y = Number.parseFloat(style.top);
      return { left: x - width / 2, right: x + width / 2, top: y - height, bottom: y };
    });
    boxes.forEach((box, index) => {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(100);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(94);
      boxes.slice(index + 1).forEach((other) => expect(box.right <= other.left || other.right <= box.left ||
        box.bottom <= other.top || other.bottom <= box.top).toBe(true));
    });
  });

  it('localizes damage and repair to one resident without replacing its bay or the healthy neighbor', () => {
    const { rerender } = render(<CivilizationDistrictResidents district={INDUSTRY} sites={SITES} />);
    const first = resident('t1r01'), firstStyle = first.getAttribute('style');
    const healthy = resident('t1r07').outerHTML;
    const damagedSites = SITES.map((site) => site.artifactId === 't1r01'
      ? { ...site, implementationState: 'damaged' as const } : site);
    rerender(<CivilizationDistrictResidents district={INDUSTRY} sites={damagedSites} />);
    expect(resident('t1r01')).toBe(first);
    expect(first.getAttribute('style')).toBe(firstStyle);
    expect(first.querySelector('[data-resident-condition="damaged"]')).toHaveStyle({
      filter: 'saturate(0.22) brightness(0.52) contrast(1.18)',
    });
    expect(first).toContainElement(screen.getByTestId('civilization-resident-damage-smoke'));
    expect(resident('t1r07').outerHTML).toBe(healthy);
    rerender(<CivilizationDistrictResidents district={INDUSTRY} sites={SITES} />);
    expect(resident('t1r01')).toBe(first);
    expect(first.getAttribute('style')).toBe(firstStyle);
    expect(screen.queryByTestId('civilization-resident-damage-smoke')).toBeNull();
    expect(first.querySelector<HTMLElement>('[data-resident-condition]')!.style.filter).toBe('');
    expect(resident('t1r07').outerHTML).toBe(healthy);
  });

  it('preserves original architecture for other residents and legacy games without district state', () => {
    const district = { ...INDUSTRY, residentArtifactIds: ['t1r01', 't1r02', 't1o05', 't1r01'] };
    const sites = SITES.filter((site) => district.residentArtifactIds.includes(site.artifactId!));
    const { rerender } = render(<>
      <CivilizationDistrictResidents district={district} sites={sites} />
      <CivilizationArtifactManifestationLayer sites={sites} scene="surface" compact={false}
        scanActive={false} districtInstances={[district]} />
    </>);
    expect(screen.getAllByTestId('civilization-district-resident')).toHaveLength(2);
    expect(resident('t1o05')).toHaveAttribute('data-resident-slot', '2');
    expect(screen.getByTestId('civilization-artifact-structure')).toHaveAttribute('data-artifact-unit', 't1r02');
    rerender(<CivilizationArtifactManifestationLayer sites={sites} scene="surface" compact={false} scanActive />);
    expect(screen.queryByTestId('civilization-district-resident')).toBeNull();
    expect(screen.getAllByTestId('civilization-artifact-structure')).toHaveLength(3);
  });

  it('integrates the legal Civic founders without duplicating their standalone structures or moving the first annex', () => {
    const neutral = stateAtProofStep(4).districtIdentity.districts['district:civic_core:0']!;
    expect(neutral.permanentDyad).toBeNull();
    expect(CIVIC.permanentDyad).toBe('echo');
    expect(CIVIC.residentArtifactIds).toEqual(['t1s04', 't1o08']);
    const sitesFor = (district: CivilizationDistrictInstance) => SITES.filter((site) =>
      district.residentArtifactIds.includes(site.artifactId!));
    const scene = (district: CivilizationDistrictInstance, scanActive = false) => <>
      <CivilizationDistrictResidents district={district} sites={sitesFor(district)} />
      <CivilizationArtifactManifestationLayer sites={sitesFor(district)} scene="surface" compact={false}
        scanActive={scanActive} districtInstances={[district]} />
    </>;
    const { rerender } = render(scene(neutral));
    const first = resident('t1s04'), firstStyle = first.getAttribute('style');
    expect(screen.getAllByTestId('civilization-district-resident')).toHaveLength(1);
    rerender(scene(CIVIC, true));
    expect(resident('t1s04')).toBe(first);
    expect(first.getAttribute('style')).toBe(firstStyle);
    expect(screen.getAllByTestId('civilization-district-resident')).toHaveLength(2);
    expect(screen.queryByTestId('civilization-artifact-structure')).toBeNull();
    // The two-cell source must not inherit the earlier six-cell atlas geometry.
    for (const id of CIVIC.residentArtifactIds) {
      expect(resident(id).querySelector('img')).toHaveAttribute('src', expect.stringContaining('civic-service-bays-v1'));
      expect(resident(id).querySelector('img')).toHaveStyle({ width: '200%', height: '100%' });
    }
    expect(resident('t1o08').querySelector('img')).toHaveStyle({ left: '-100%' });
    rerender(<CivilizationArtifactManifestationLayer sites={sitesFor(CIVIC)} scene="surface" compact={false} scanActive />);
    expect(screen.getAllByTestId('civilization-artifact-structure')).toHaveLength(2);
  });

  it('damages and restores only the sealed-records annex while keeping its Civic slot', () => {
    const { rerender } = render(<CivilizationDistrictResidents district={CIVIC} sites={SITES} />);
    const seal = resident('t1o08'), style = seal.getAttribute('style');
    const scaffold = resident('t1s04').outerHTML;
    rerender(<CivilizationDistrictResidents district={CIVIC} sites={SITES.map((site) => site.artifactId === 't1o08'
      ? { ...site, implementationState: 'damaged' } : site)} />);
    expect(resident('t1o08')).toBe(seal);
    expect(seal.getAttribute('style')).toBe(style);
    expect(seal).toContainElement(screen.getByTestId('civilization-resident-damage-smoke'));
    expect(resident('t1s04').outerHTML).toBe(scaffold);
    rerender(<CivilizationDistrictResidents district={CIVIC} sites={SITES} />);
    expect(resident('t1o08')).toBe(seal);
    expect(seal.getAttribute('style')).toBe(style);
    expect(screen.queryByTestId('civilization-resident-damage-smoke')).toBeNull();
    expect(seal.querySelector<HTMLElement>('[data-resident-condition]')!.style.filter).toBe('');
  });

  it('integrates every resident in the complete legal proof without moving earlier additions', () => {
    const originalResidents = new Map<string, { node: HTMLElement; style: string | null; district: string }>();
    const { rerender } = render(<></>);
    for (let step = 1; step <= CIVILIZATION_DISTRICT_DYAD_PROOF_IDS.length; step += 1) {
      const state = stateAtProofStep(step);
      const districts = Object.values(state.districtIdentity.districts);
      const sites = SITES.filter((site) => CIVILIZATION_DISTRICT_DYAD_PROOF_IDS.slice(0, step)
        .some((id) => site.artifactId === id));
      rerender(<>
        {districts.map((district) => <CivilizationDistrictResidents key={district.districtId} district={district} sites={sites} />)}
        <CivilizationArtifactManifestationLayer sites={sites} scene="surface" compact={false}
          scanActive={step % 2 === 0} districtInstances={districts} dyad={state.districtIdentity.presentationDyad} />
      </>);
      expect(screen.getAllByTestId('civilization-district-resident')).toHaveLength(step);
      expect(screen.queryByTestId('civilization-artifact-structure')).toBeNull();
      for (const district of districts) for (const id of district.residentArtifactIds) {
        const element = resident(id), previous = originalResidents.get(id);
        if (previous) {
          expect(element).toBe(previous.node);
          expect(element.getAttribute('style')).toBe(previous.style);
          expect(element).toHaveAttribute('data-resident-district', previous.district);
        } else {
          originalResidents.set(id, { node: element, style: element.getAttribute('style'), district: district.districtId });
        }
      }
    }
    expect(originalResidents.size).toBe(14);
    expect(stateAtProofStep(14).districtIdentity.presentationDyad).toBe('echo');
    expect(PROOF_DISTRICTS.find(({ family }) => family === 'industrial_district')!.permanentDyad).toBe('chrysalis');
  });

  it('fits every complete proof annex within its district, including all three Subsurface residents', () => {
    for (const district of PROOF_DISTRICTS) {
      const residents = getCivilizationDistrictResidents(district, SITES);
      expect(residents).toHaveLength(district.residentArtifactIds.length);
      const boxes = residents.map(({ slot, art }) => ({
        left: slot.x - slot.width / 2, right: slot.x + slot.width / 2,
        top: slot.groundY - slot.width * art.crop.height / art.crop.width, bottom: slot.groundY,
      }));
      boxes.forEach((box, index) => {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(100);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.bottom).toBeLessThanOrEqual(94);
        for (const other of boxes.slice(index + 1)) expect(box.right <= other.left || other.right <= box.left ||
          box.bottom <= other.top || other.bottom <= box.top).toBe(true);
      });
    }
    expect(PROOF_DISTRICTS.find(({ family }) => family === 'subsurface_works')!.residentArtifactIds)
      .toEqual(['t1e02', 't1o03', 't1o06']);
  });

  it('keeps the two healthy Subsurface neighbors intact through Decay Network damage and repair', () => {
    const district = PROOF_DISTRICTS.find(({ family }) => family === 'subsurface_works')!;
    const { rerender } = render(<CivilizationDistrictResidents district={district} sites={SITES} />);
    const network = resident('t1o06'), originalStyle = network.getAttribute('style');
    const healthy = ['t1e02', 't1o03'].map((id) => resident(id).outerHTML);
    rerender(<CivilizationDistrictResidents district={district} sites={SITES.map((site) => site.artifactId === 't1o06'
      ? { ...site, implementationState: 'damaged' } : site)} />);
    expect(network).toContainElement(screen.getByTestId('civilization-resident-damage-smoke'));
    expect(network.getAttribute('style')).toBe(originalStyle);
    expect(['t1e02', 't1o03'].map((id) => resident(id).outerHTML)).toEqual(healthy);
    rerender(<CivilizationDistrictResidents district={district} sites={SITES} />);
    expect(resident('t1o06')).toBe(network);
    expect(network.getAttribute('style')).toBe(originalStyle);
    expect(screen.queryByTestId('civilization-resident-damage-smoke')).toBeNull();
    expect(network.querySelector<HTMLElement>('[data-resident-condition]')!.style.filter).toBe('');
  });

  it.each(PROOF_DISTRICTS.flatMap((district) => [
    { compact: false, district }, { compact: true, district },
  ]))('keeps Scan at $district.family bay footings through identity changes and damage (compact=$compact)', ({ compact, district }) => {
    render(<CivilizationDistrictResidents district={district} sites={SITES} />);
    const before = buildCivilizationArtifactWorldAnchors(SITES, 'surface', 'chrysalis', 'aurora_basin', [], compact, [district]);
    const after = buildCivilizationArtifactWorldAnchors(SITES.map((site) => ({ ...site, implementationState: 'damaged' })),
      'surface', 'echo', 'aurora_basin', [], compact, [district]);
    for (const element of screen.getAllByTestId('civilization-district-resident')) {
      const anchor = before.get(element.dataset.siteId!)!;
      expect(after.get(element.dataset.siteId!)).toEqual(anchor);
      const fit = getCivilizationDistrictPresentation(anchor.districtParcelId!, compact)!;
      const aspectRatio = compact ? 4 / 5 : 16 / 9;
      expect(anchor.x).toBeCloseTo(fit.bounds.minX + fit.width * Number.parseFloat(element.style.left) / 100);
      expect(anchor.y).toBeCloseTo(fit.bounds.minY + fit.width * aspectRatio * Number.parseFloat(element.style.top) / 100);
      expect(anchor.scanX).toBe(anchor.x);
      expect(anchor.scanY).toBe(anchor.y);
    }
  });
});
