import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_CATALOG,
  createInitialCivilizationState,
  reconcileCivilizationDerivedState,
} from '@workspace/game-types';
import { getArtifactManifestationProfile } from '@/lib/civilizationArtifactManifestations';
import { CIVILIZATION_PARCEL_PROOFS } from '@/lib/civilizationParcelProof';
import { buildCivilizationDistrictPresentation, getCivilizationDistrictPresentation } from '@/lib/civilizationDistrictPresentation';
import {
  buildCivilizationSurfaceArtifactDistrictAssignments,
  CHRYSALIS_SURFACE_DISTRICT_PARCELS,
  CIVILIZATION_DISTRICT_DESIGN_CONTRACTS,
  CIVILIZATION_SURFACE_DISTRICT_FAMILIES,
  getCivilizationSurfaceArtifactAttachmentTransform,
  getCivilizationSurfaceDistrictCapacity,
  getCivilizationSurfaceDistrictParcelsForStage,
  getCivilizationSurfaceDistrictParcelsForStageAndOccupancy,
  validateCivilizationSurfaceDistrictPlan,
} from '@/lib/civilizationSurfaceDistrictPlan';

describe('Chrysalis district-first city plan', () => {
  it('provides thirty stable parcels across every Surface district family', () => {
    expect(CHRYSALIS_SURFACE_DISTRICT_PARCELS).toHaveLength(30);
    expect(new Set(CHRYSALIS_SURFACE_DISTRICT_PARCELS.map(({ id }) => id)).size).toBe(30);

    for (const family of CIVILIZATION_SURFACE_DISTRICT_FAMILIES) {
      expect(CHRYSALIS_SURFACE_DISTRICT_PARCELS.some((parcel) => parcel.family === family), family)
        .toBe(true);
      expect(CIVILIZATION_DISTRICT_DESIGN_CONTRACTS[family].genericForm.length).toBeGreaterThan(24);
      expect(CIVILIZATION_DISTRICT_DESIGN_CONTRACTS[family].chrysalisForm.length).toBeGreaterThan(24);
      expect(CIVILIZATION_DISTRICT_DESIGN_CONTRACTS[family].artifactIntegration.length)
        .toBeGreaterThan(24);
    }
  });

  it('fills the city progressively instead of withholding the cityscape', () => {
    expect(getCivilizationSurfaceDistrictParcelsForStage(0)).toHaveLength(0);
    expect(getCivilizationSurfaceDistrictParcelsForStage(1)).toHaveLength(3);
    expect(getCivilizationSurfaceDistrictParcelsForStage(2)).toHaveLength(5);
    expect(getCivilizationSurfaceDistrictParcelsForStage(3)).toHaveLength(7);
    expect(getCivilizationSurfaceDistrictParcelsForStage(5)).toHaveLength(10);
    expect(getCivilizationSurfaceDistrictParcelsForStage(7)).toHaveLength(14);
    expect(getCivilizationSurfaceDistrictParcelsForStage(9)).toHaveLength(30);
  });

  it('places first family instances nearest the viewer on both compositions', () => {
    for (const family of CIVILIZATION_SURFACE_DISTRICT_FAMILIES) {
      const parcels = CHRYSALIS_SURFACE_DISTRICT_PARCELS.filter((parcel) => parcel.family === family);
      const first = parcels.find((parcel) => parcel.instance === 0)!;
      for (const later of parcels.filter((parcel) => parcel.instance > 0)) {
        expect(first.desktopTransform.y, `${family} desktop foreground priority`)
          .toBeGreaterThanOrEqual(later.desktopTransform.y);
        expect(first.mobileTransform.y, `${family} mobile foreground priority`)
          .toBeGreaterThanOrEqual(later.mobileTransform.y);
      }
    }
  });

  it('opens an assigned parcel before its visual stage rather than orphaning its Artifacts', () => {
    const occupied = getCivilizationSurfaceDistrictParcelsForStageAndOccupancy(8, {
      observatory_ridge: 6,
    });

    expect(occupied).toHaveLength(16);
    expect(occupied.some(({ id }) => id === 'observatory-northeast')).toBe(true);
  });

  it('gives every city-scale Artifact one grounded district attachment', () => {
    const surfaceArtifactIds = ARTIFACT_CATALOG
      .filter(({ id }) => getArtifactManifestationProfile(id).nativeCameraScale === 'surface')
      .map(({ id }) => id);
    const assignments = buildCivilizationSurfaceArtifactDistrictAssignments();

    expect(surfaceArtifactIds).toHaveLength(45);
    expect(assignments.size).toBe(surfaceArtifactIds.length);
    expect(new Set([...assignments.values()].map(({ artifactId }) => artifactId)).size)
      .toBe(surfaceArtifactIds.length);

    const assignedByFamily = new Map<string, number>();
    assignments.forEach((assignment) => {
      assignedByFamily.set(
        assignment.placement,
        (assignedByFamily.get(assignment.placement) ?? 0) + 1,
      );
      const parcel = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find(({ id }) => (
        id === assignment.parcelId
      ));
      expect(parcel, assignment.artifactId).toBeTruthy();
      expect(parcel?.family).toBe(assignment.placement);
      expect(assignment.parcelMemberIndex).toBeLessThan(parcel?.capacity ?? 0);
    });

    for (const family of CIVILIZATION_SURFACE_DISTRICT_FAMILIES) {
      expect(assignedByFamily.get(family) ?? 0).toBeLessThanOrEqual(
        getCivilizationSurfaceDistrictCapacity(family),
      );
    }
  });

  it('provides a visual parcel for every district in the saturated state model', () => {
    let state = createInitialCivilizationState();
    ARTIFACT_CATALOG.forEach((artifact, index) => {
      state.artifacts[artifact.id] = {
        artifactId: artifact.id,
        firstMasteredTurnCount: index + 1,
        masteryCount: 1,
        implementationState: 'operational',
        implementationStateChangedTurnCount: index + 1,
        implementationChangeSource: null,
        historyEvidence: 'recorded',
      };
    });
    state = reconcileCivilizationDerivedState(state, [], ARTIFACT_CATALOG.length);

    expect(Object.keys(state.districtIdentity.artifactAssignments)).toHaveLength(45);
    const missingDistrictParcels = Object.values(state.districtIdentity.districts)
      .filter((district) => !CHRYSALIS_SURFACE_DISTRICT_PARCELS.some((parcel) => (
        parcel.family === district.family && parcel.instance === district.instance
      )))
      .map(({ districtId }) => districtId);

    expect(missingDistrictParcels).toEqual([]);
  });

  it.each(CIVILIZATION_PARCEL_PROOFS)('gives every district in the $family history a distinct physical parcel', ({ artifactIds, family }) => {
    let state = createInitialCivilizationState();
    for (const [index, artifactId] of artifactIds.entries()) {
      state.artifacts[artifactId] = {
        artifactId, firstMasteredTurnCount: index + 1, masteryCount: 1,
        implementationState: 'operational', implementationStateChangedTurnCount: index + 1,
        implementationChangeSource: null, historyEvidence: 'recorded',
      };
      state = reconcileCivilizationDerivedState(state, [], index + 1, {}, { commitPresentation: true });
    }
    expect(state.districtIdentity.districts[`district:${family}:2`]).toBeDefined();
    const districts = Object.values(state.districtIdentity.districts);
    const parcels = districts.map((district) => CHRYSALIS_SURFACE_DISTRICT_PARCELS.find((parcel) =>
      parcel.family === district.family && parcel.instance === district.instance));
    expect(parcels.every(Boolean)).toBe(true);
    expect(new Set(parcels.map((parcel) => parcel!.id)).size).toBe(districts.length);
    for (const parcel of parcels) {
      expect(parcel!.capacity).toBe(3);
      expect(parcel!.attachmentSockets.length).toBeGreaterThanOrEqual(parcel!.capacity);
    }
  });

  it.each([
    { family: 'coastal_margin', firstParcel: 'coastal-east', nextParcel: 'coastal-northeast',
      desktop: { x: 85.6, y: 27.1 }, mobile: { x: 85.84, y: 25.1 } },
    { family: 'transit_terminus', firstParcel: 'transit-west-gate', nextParcel: 'transit-inland-ridge',
      desktop: { x: 26.08, y: 69.3 }, mobile: { x: 17.2, y: 46.3 } },
    { family: 'observatory_ridge', firstParcel: 'observatory-northwest', nextParcel: 'observatory-northeast',
      desktop: { x: 80.64, y: 46.3 }, mobile: { x: 23.6, y: 30.3 } },
  ] as const)('gives the fourth $family resident a new parcel while preserving its historical anchor', (entry) => {
    for (const compact of [false, true]) {
      const first = getCivilizationSurfaceArtifactAttachmentTransform(entry.family, 0, compact)!;
      const fourth = getCivilizationSurfaceArtifactAttachmentTransform(entry.family, 3, compact)!;
      expect(first.parcel.id).toBe(entry.firstParcel);
      expect(first.x).toBeCloseTo((compact ? entry.mobile : entry.desktop).x);
      expect(first.y).toBeCloseTo((compact ? entry.mobile : entry.desktop).y);
      expect(fourth.parcel.id).toBe(entry.nextParcel);
      expect(fourth.parcel.instance).toBe(1);
      expect(Math.abs(first.x - fourth.x) >= 3.2 || Math.abs(first.y - fourth.y) >= 4.2).toBe(true);
    }
  });

  it.each([false, true])('reserves late parcels before fitting any growth stage (compact %s)', (compact) => {
    const fullPlan = buildCivilizationDistrictPresentation(compact);
    for (const stage of [1, 3, 5, 9] as const) {
      for (const parcel of getCivilizationSurfaceDistrictParcelsForStage(stage)) {
        expect(getCivilizationDistrictPresentation(parcel.id, compact), `${stage}:${parcel.id}`)
          .toEqual(fullPlan.get(parcel.id));
      }
    }
  });

  it('keeps every authored attachment inside a usable desktop and mobile canvas', () => {
    for (const family of CIVILIZATION_SURFACE_DISTRICT_FAMILIES) {
      const count = getCivilizationSurfaceDistrictCapacity(family);
      for (let ordinal = 0; ordinal < count; ordinal += 1) {
        const desktop = getCivilizationSurfaceArtifactAttachmentTransform(family, ordinal, false);
        const mobile = getCivilizationSurfaceArtifactAttachmentTransform(family, ordinal, true);
        expect(desktop, `${family}:${ordinal}:desktop`).toBeTruthy();
        expect(mobile, `${family}:${ordinal}:mobile`).toBeTruthy();
        expect(desktop?.x).toBeGreaterThanOrEqual(5);
        expect(desktop?.x).toBeLessThanOrEqual(98);
        expect(desktop?.y).toBeGreaterThanOrEqual(5);
        expect(desktop?.y).toBeLessThanOrEqual(95);
        expect(mobile?.x).toBeGreaterThanOrEqual(5);
        expect(mobile?.x).toBeLessThanOrEqual(98);
        expect(mobile?.y).toBeGreaterThanOrEqual(5);
        expect(mobile?.y).toBeLessThanOrEqual(95);
      }
    }
  });

  it('passes the production district-plan audit', () => {
    expect(validateCivilizationSurfaceDistrictPlan()).toEqual([]);
  });
});
