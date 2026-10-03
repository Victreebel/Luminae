import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES,
  CIVILIZATION_ENVIRONMENT_VARIANTS,
  CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID,
  createInitialCivilizationState,
  getCivilizationManifestationSocketCapacities,
  getArtifactPlacementPhysicalContract,
  isCivilizationManifestationAssignmentCompatible,
  reconcileCivilizationManifestationAssignments,
  type BlueprintId,
} from '@workspace/game-types';
import {
  getCivilizationContinuitySocket,
  getCivilizationContinuitySocketContract,
  getCivilizationEnvironmentSocket,
  getCivilizationEnvironmentSocketContract,
  getCivilizationSurfaceDistrictAnchor,
  getCivilizationSurfaceBuildableZones,
  getCivilizationScenePhysicalContract,
  getCivilizationStellarAnchor,
} from '@/lib/civilizationEnvironmentSockets';
import { getCivilizationEnvironmentPlateArtSlot } from '@/lib/civilizationArtRegistry';
import { createCivilizationEnvironmentIdentity } from '@workspace/game-types';
import { getCivilizationSurfaceDistrictParcelForMember } from '@/lib/civilizationSurfaceDistrictPlan';
import { getCivilizationDistrictPresentation } from '@/lib/civilizationDistrictPresentation';

describe('Civilization environment socket contracts', () => {
  it('shares one Surface substrate while preserving distinct authored outer scales', () => {
    for (const scene of ['surface', 'orbit', 'stellar', 'galaxy'] as const) {
      const plates = CIVILIZATION_ENVIRONMENT_VARIANTS.map((variant) => (
        getCivilizationEnvironmentPlateArtSlot(
          scene,
          false,
          createCivilizationEnvironmentIdentity('visual-proof', variant.id),
          1,
          scene === 'galaxy' ? 'galactic' : scene === 'stellar' ? 'stellar' : 'planetary',
        )
      ));
      expect(new Set(plates.map((plate) => plate.src)).size).toBe(scene === 'surface' ? 1 : 4);
      expect(new Set(plates.map((plate) => plate.id)).size).toBe(4);
      if (scene === 'surface') {
        expect(plates.every((plate) => (
          plate.constructionPlanId === CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID
        ))).toBe(true);
      }
    }
  });

  it('uses the shared authored portrait composition and mobile sockets for every dressing', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const identity = createCivilizationEnvironmentIdentity('mobile-proof', variant.id);
      const plate = getCivilizationEnvironmentPlateArtSlot(
        'surface',
        false,
        identity,
        3,
        'galactic',
      );
      const socket = getCivilizationEnvironmentSocket(variant.id, 'surface:civic_core:0');

      expect(plate.mobileSrc).toBeTruthy();
      expect(plate.mobileSrc).not.toBe(plate.src);
      expect(plate.mobileSrc).toContain('aurora-basin-empty-mobile-v1.webp');
      expect(getCivilizationSurfaceDistrictAnchor(variant.id, 'civic_core', true))
        .toEqual({ x: 55, y: 83 });
      expect(socket?.depth).toBe('foreground');
    }
  });

  it('keeps every Surface socket invariant across environment dressings', () => {
    const canonical = getCivilizationEnvironmentSocketContract('aurora_basin')
      .filter((socket) => socket.nativeScene === 'surface');

    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const contract = getCivilizationEnvironmentSocketContract(variant.id)
        .filter((socket) => socket.nativeScene === 'surface');
      expect(contract).toHaveLength(canonical.length);
      contract.forEach((socket, index) => {
        const expected = canonical[index]!;
        expect(socket.socketId).toBe(expected.socketId);
        expect(socket.desktopTransform).toEqual(expected.desktopTransform);
        expect(socket.mobileTransform).toEqual(expected.mobileTransform);
        expect(socket.district).toBe(expected.district);
        expect(socket.substrate).toBe(expected.substrate);
        expect(socket.requiredSupport).toBe(expected.requiredSupport);
        expect(socket.structuralAdaptation).toBe(expected.structuralAdaptation);
        expect(socket.environmentVariantId).toBe(variant.id);
      });
    }
  });

  it('keeps every Aurora Basin Surface socket inside an authored buildable parcel', () => {
    const contract = getCivilizationEnvironmentSocketContract('aurora_basin')
      .filter((socket) => socket.nativeScene === 'surface');

    for (const compact of [false, true]) {
      const zones = getCivilizationSurfaceBuildableZones('aurora_basin', compact);
      for (const socket of contract) {
        const transform = compact ? socket.mobileTransform : socket.desktopTransform;
        const containingZone = zones.find((zone) => (
          zone.depth === socket.depth &&
          transform.x >= zone.minX && transform.x <= zone.maxX &&
          transform.y >= zone.minY && transform.y <= zone.maxY
        ));
        expect(
          containingZone,
          `${compact ? 'mobile' : 'desktop'} ${socket.socketId} is outside the Aurora master plan`,
        ).toBeTruthy();
      }
    }
  });

  it('keeps the protected Surface district footprints from overlapping', () => {
    for (const compact of [false, true]) {
      const zones = getCivilizationSurfaceBuildableZones('aurora_basin', compact);
      for (let leftIndex = 0; leftIndex < zones.length; leftIndex += 1) {
        const left = zones[leftIndex]!;
        for (let rightIndex = leftIndex + 1; rightIndex < zones.length; rightIndex += 1) {
          const right = zones[rightIndex]!;
          const overlapWidth = Math.max(0, Math.min(left.maxX, right.maxX) - Math.max(left.minX, right.minX));
          const overlapHeight = Math.max(0, Math.min(left.maxY, right.maxY) - Math.max(left.minY, right.minY));
          expect(
            overlapWidth * overlapHeight,
            `${compact ? 'mobile' : 'desktop'} ${left.id} overlaps ${right.id}`,
          ).toBe(0);
        }
      }
    }
  });

  it('authors every required socket plus reserve in every environment', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const contract = getCivilizationEnvironmentSocketContract(variant.id);
      for (const capacity of getCivilizationManifestationSocketCapacities()) {
        const compatible = contract.filter((socket) => (
          socket.nativeScene === capacity.nativeScene &&
          socket.semanticRole === capacity.placementFamily
        ));
        expect(compatible).toHaveLength(capacity.authoredCapacity);
      }
    }
  });

  it('places the complete saturated catalog compatibly in every environment', () => {
    const state = createInitialCivilizationState();
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
    (Object.keys(CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES) as BlueprintId[])
      .forEach((blueprintId, slotIndex) => {
        state.projects[`project:${slotIndex}:${blueprintId}`] = {
          projectId: `project:${slotIndex}:${blueprintId}`,
          blueprintId,
          slotIndex,
          status: 'manifested',
          matchedComponentIds: [],
          deviceState: 'ready',
          presentationVariant: 'armored',
          manifestedTurnCount: ARTIFACT_CATALOG.length + slotIndex + 1,
          stateChangedTurnCount: ARTIFACT_CATALOG.length + slotIndex + 1,
          historyEvidence: 'recorded',
        };
      });
    const assignments = Object.values(
      reconcileCivilizationManifestationAssignments(state, ARTIFACT_CATALOG.length + 4),
    );

    expect(assignments).toHaveLength(
      ARTIFACT_CATALOG.length + Object.keys(CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES).length,
    );
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      for (const assignment of assignments) {
        const socket = getCivilizationEnvironmentSocket(variant.id, assignment.socketId);
        expect(socket, `${variant.id} is missing ${assignment.socketId}`).not.toBeNull();
        expect(socket?.nativeScene).toBe(assignment.nativeScene);
        expect(socket?.physicalValidation).toBe('authored');
        expect(socket?.district).toBeTruthy();
        const physical = getArtifactPlacementPhysicalContract(assignment.placementFamily);
        expect(socket?.district).toBe(physical.district);
        expect(isCivilizationManifestationAssignmentCompatible(assignment)).toBe(true);
        if (assignment.sourceType === 'artifact') {
          const profile = ARTIFACT_MANIFESTATION_PROFILE_BY_ID[assignment.sourceId];
          expect(profile?.compatiblePlacementFamilies)
            .toContain(assignment.placementFamily);
          expect(profile?.validSubstrates).toContain(socket?.substrate);
          expect(profile?.requiredSupportModes).toContain(socket?.requiredSupport);
        } else {
          expect(CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES[assignment.sourceId as BlueprintId].validSocketClasses)
            .toContain(assignment.placementFamily);
        }
      }
    }
  });

  it('keeps saturated residents distinct and inside their own fitted district', () => {
    const state = createInitialCivilizationState();
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
    const surfaceAssignments = Object.values(
      reconcileCivilizationManifestationAssignments(state, ARTIFACT_CATALOG.length),
    ).filter((assignment) => assignment.nativeScene === 'surface');

    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      for (const compact of [false, true]) {
        const points = surfaceAssignments.map((assignment) => {
          const socket = getCivilizationEnvironmentSocket(variant.id, assignment.socketId)!;
          const transform = compact ? socket.mobileTransform : socket.desktopTransform;
          const ordinal = Number(assignment.socketId.split(':').at(-1));
          const parcel = getCivilizationSurfaceDistrictParcelForMember(
            assignment.placementFamily as Parameters<typeof getCivilizationSurfaceDistrictParcelForMember>[0], ordinal,
          )!.parcel;
          const zone = getCivilizationSurfaceBuildableZones(variant.id, compact)
            .find(({ id }) => id === parcel.id)!;
          expect(transform.x, assignment.sourceId).toBeGreaterThan(zone.minX);
          expect(transform.x, assignment.sourceId).toBeLessThan(zone.maxX);
          expect(transform.y, assignment.sourceId).toBeGreaterThan(zone.minY);
          expect(transform.y, assignment.sourceId).toBeLessThan(zone.maxY);
          return { assignment, x: transform.x, y: transform.y };
        });
        for (let leftIndex = 0; leftIndex < points.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < points.length; rightIndex += 1) {
            const left = points[leftIndex]!;
            const right = points[rightIndex]!;
            // These are district-local attachment points, not standalone
            // fixed-size cutouts. District bounds and Scan hitboxes have their
            // own collision checks; no two residents may share an anchor.
            const directlyOverlapping = Math.abs(left.x - right.x) < 0.01 &&
              Math.abs(left.y - right.y) < 0.01;
            expect(
              directlyOverlapping,
              `${variant.id} ${compact ? 'mobile' : 'desktop'} overlaps ` +
                `${left.assignment.sourceId}@${left.assignment.socketId}(${left.x},${left.y}) and ` +
                `${right.assignment.sourceId}@${right.assignment.socketId}(${right.x},${right.y})`,
            ).toBe(false);
          }
        }
        const xSpan = Math.max(...points.map((point) => point.x)) -
          Math.min(...points.map((point) => point.x));
        const ySpan = Math.max(...points.map((point) => point.y)) -
          Math.min(...points.map((point) => point.y));
        expect(xSpan, `${variant.id} ${compact ? 'mobile' : 'desktop'} horizontal span`)
          .toBeGreaterThanOrEqual(compact ? 72 : 76);
        expect(
          ySpan,
          `${variant.id} ${compact ? 'mobile' : 'desktop'} depth span ` +
            `(${Math.min(...points.map((point) => point.y))}–${Math.max(...points.map((point) => point.y))})`,
        )
          .toBeGreaterThanOrEqual(compact ? 42 : 40);
        const depthCounts = surfaceAssignments.reduce((counts, assignment) => {
          const depth = getCivilizationEnvironmentSocket(variant.id, assignment.socketId)!.depth;
          counts[depth] += 1;
          return counts;
        }, { foreground: 0, midground: 0, distance: 0 });
        expect(depthCounts.foreground).toBeGreaterThan(0);
        // Primary districts now favor foreground sites while repeats recede.
        expect(depthCounts.foreground + depthCounts.midground)
          .toBeGreaterThanOrEqual(Math.floor(points.length * 0.5));
        expect(depthCounts.distance).toBeGreaterThanOrEqual(Math.floor(points.length * 0.2));
      }
    }
  });

  it('reallocates a persisted assignment that violates the Artifact physical contract', () => {
    const state = createInitialCivilizationState();
    state.artifacts.t1r01 = {
      artifactId: 't1r01',
      firstMasteredTurnCount: 1,
      masteryCount: 1,
      implementationState: 'operational',
      implementationStateChangedTurnCount: 1,
      implementationChangeSource: null,
      historyEvidence: 'recorded',
    };
    state.manifestationAssignments['artifact:t1r01'] = {
      sourceId: 't1r01',
      sourceType: 'artifact',
      nativeScene: 'surface',
      placementFamily: 'coastal_margin',
      socketId: 'surface:coastal_margin:0',
      assignmentTurnCount: 1,
      historyEvidence: 'recorded',
    };

    const assignment = reconcileCivilizationManifestationAssignments(state, 2)['artifact:t1r01']!;
    expect(assignment.placementFamily).toBe('industrial_district');
    expect(assignment.socketId).toBe('surface:industrial_district:0');
    expect(isCivilizationManifestationAssignmentCompatible(assignment)).toBe(true);
  });

  it('keeps Portrait and Scan attached to the same immutable socket', () => {
    const socketId = 'surface:civic_core:0';
    const socket = getCivilizationEnvironmentSocket('aurora_basin', socketId);
    expect(socket).not.toBeNull();
    expect(socket?.socketId).toBe(socketId);
    expect(socket?.scanAttachment.x).toBe(socket?.desktopTransform.x);
    expect(socket?.mobileTransform.x).not.toBeNaN();
    expect(socket?.desktopTransform).toEqual(
      getCivilizationEnvironmentSocket('aurora_basin', socketId)?.desktopTransform,
    );
  });

  it('uses authored responsive transforms without changing socket identity', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const contract = getCivilizationEnvironmentSocketContract(variant.id);
      for (const socket of contract) for (const compact of [false, true]) {
        const transform = compact ? socket.mobileTransform : socket.desktopTransform;
        const bounds = socket.nativeScene === 'surface' && socket.districtParcelId
          ? getCivilizationDistrictPresentation(socket.districtParcelId, compact)!.bounds
          : { minX: 6, maxX: 94, minY: 6, maxY: 94 };
        expect(transform.x, socket.socketId).toBeGreaterThanOrEqual(bounds.minX);
        expect(transform.x, socket.socketId).toBeLessThanOrEqual(bounds.maxX);
        expect(transform.y, socket.socketId).toBeGreaterThanOrEqual(bounds.minY);
        expect(transform.y, socket.socketId).toBeLessThanOrEqual(bounds.maxY);
      }
      expect(new Set(contract.map((socket) => socket.socketId)).size).toBe(contract.length);
    }
  });

  it.each([false, true])('keeps three distinct harbor attachments inside the edge parcel (compact %s)', (compact) => {
    const sockets = [6, 7, 8].map((ordinal) => getCivilizationEnvironmentSocket('aurora_basin', `surface:coastal_margin:${ordinal}`)!);
    const positions = sockets.map((socket) => compact ? socket.mobileTransform : socket.desktopTransform);
    expect(sockets.every((socket) => socket.districtParcelId === 'coastal-breakwater')).toBe(true);
    expect(new Set(positions.map(({ x, y }) => `${x}:${y}`)).size).toBe(3);
    expect(positions.some(({ x }) => x > 94)).toBe(true);
  });

  it('provides one physical nested-continuity socket at every parent scale', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const contract = getCivilizationContinuitySocketContract(variant.id);
      expect(contract.map((socket) => socket.parentScene)).toEqual([
        'orbit',
        'stellar',
        'galaxy',
      ]);
      expect(contract.map((socket) => socket.child)).toEqual([
        'city',
        'planet',
        'system',
      ]);
      for (const parentScene of ['orbit', 'stellar', 'galaxy'] as const) {
        const socket = getCivilizationContinuitySocket(variant.id, parentScene);
        expect(socket.desktopTransform.width).toBeGreaterThan(0);
        expect(socket.mobileTransform.width).toBeGreaterThan(0);
        expect(socket.desktopTransform.x).toBeGreaterThanOrEqual(6);
        expect(socket.desktopTransform.x).toBeLessThanOrEqual(94);
        expect(socket.scanAttachment).toMatchObject({
          x: socket.desktopTransform.x,
        });
      }
    }
  });

  it('anchors Stellar development to one authored star and one existing homeworld', () => {
    for (const variant of CIVILIZATION_ENVIRONMENT_VARIANTS) {
      const star = getCivilizationStellarAnchor(variant.id);
      const homeworld = getCivilizationContinuitySocket(variant.id, 'stellar');

      expect(star.body).toBe('home-star');
      expect(star.desktopTransform.width).toBeGreaterThan(0);
      expect(star.mobileTransform.width).toBeGreaterThan(0);
      expect(homeworld.child).toBe('planet');
      expect(homeworld.desktopTransform.width).toBeLessThanOrEqual(10);
      expect(homeworld.mobileTransform.width).toBeLessThanOrEqual(12);
      expect(star.desktopTransform.x).not.toBe(homeworld.desktopTransform.x);
    }
  });

  it('gives every camera scale one lore-coherent physical host', () => {
    expect(getCivilizationScenePhysicalContract('surface')).toMatchObject({
      host: 'terrain',
      constructionModel: 'grounded-districts',
      maxIdentityStructures: 20,
      preservesHostBody: true,
    });
    expect(getCivilizationScenePhysicalContract('orbit')).toMatchObject({
      host: 'homeworld',
      constructionModel: 'orbital-works',
      maxIdentityStructures: 6,
      preservesHostBody: true,
    });
    expect(getCivilizationScenePhysicalContract('stellar')).toMatchObject({
      host: 'home-star',
      constructionModel: 'distributed-system-infrastructure',
      maxIdentityStructures: 3,
      preservesHostBody: true,
    });
    expect(getCivilizationScenePhysicalContract('galaxy')).toMatchObject({
      host: 'galactic-region',
      constructionModel: 'colonized-stellar-neighborhoods',
      maxIdentityStructures: 3,
      preservesHostBody: true,
    });
  });
});
