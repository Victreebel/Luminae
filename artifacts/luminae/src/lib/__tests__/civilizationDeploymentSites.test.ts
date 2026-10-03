import { describe, expect, it } from 'vitest';
import type { ArtifactCard, CardLoreCatalog } from '@workspace/api-client-react';
import { BLUEPRINT_DEFINITIONS } from '@workspace/game-types';
import {
  buildCivilizationArtifactHistoryCards,
  buildCivilizationDeploymentSites,
  getCivilizationDeploymentSiteSignatureMap,
  getCivilizationDeploymentSiteSignature,
  getRecentCivilizationDeploymentSiteIds,
  prioritizeRecentCivilizationSiteIds,
} from '@/lib/civilizationDeploymentSites';

function artifact(
  id: string,
  tier: number,
  bonusAffinity: ArtifactCard['bonusAffinity'],
  name = id,
  eminence = tier,
): ArtifactCard {
  return {
    id,
    tier,
    bonusAffinity,
    eminence,
    name,
    flavor: '',
    cost: {
      flare: 0,
      continuum: 0,
      verdance: 0,
      abyss: 0,
      radiance: 0,
      singularity: 0,
    },
  };
}

const loreCatalog: CardLoreCatalog = {
  t1r01: {
    name: 'Ignition Kernel',
    flavor: '',
    artifactForm: 'Power Component / Control Instrument',
    practicalCapability: 'controlled ignition and thermal regulation',
    civLane: 'planetary forge culture',
    engineeringScale: 'Planetary',
    depictionScale: 'macro',
  },
  t1r02: {
    name: 'Ashroot Bloom',
    flavor: '',
    artifactForm: 'Biotech Module / Catalyst',
    practicalCapability: 'post-burn ecological recovery',
    civLane: 'phoenix biosphere',
    engineeringScale: 'Planetary',
    depictionScale: 'macro',
  },
  t1s02: {
    name: 'Mantlelift Driver Coil',
    flavor: '',
    artifactForm: 'Transit Component / Power Component',
    practicalCapability: 'planetary-to-orbit mass acceleration',
    civLane: 'orbital logistics civilization',
    engineeringScale: 'Planetary',
    depictionScale: 'room',
  },
  t1p04: {
    name: 'Magnetic Bottle',
    flavor: '',
    artifactForm: 'Containment / Power Component',
    practicalCapability: 'plasma or field containment',
    civLane: 'field-containment culture',
    engineeringScale: 'Planetary',
    depictionScale: 'tabletop',
  },
  t1r07: {
    name: 'Entropy Pyre Baffle',
    flavor: '',
    artifactForm: 'Containment / Thermal Control',
    practicalCapability: 'waste heat and decay routing',
    civLane: 'entropy-tolerant industrial culture',
    engineeringScale: 'Planetary',
    depictionScale: 'tabletop',
  },
  t2o01: {
    name: 'Horizon Extractor',
    flavor: '',
    artifactForm: 'Sensor / Containment',
    practicalCapability: 'boundary-energy sampling',
    civLane: 'horizon engineer civilization',
    engineeringScale: 'Star-system',
    depictionScale: 'tabletop',
  },
};

describe('civilization deployment sites', () => {
  it('represents small artifacts as civilization-scale traces, not visible giant objects', () => {
    const [site] = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t1r02', 1, 'verdance', 'Ashroot Bloom')],
      loreCatalog,
      tier: 3,
    });

    expect(site?.scaleBand).toBe('planetary');
    expect(site?.artifactTier).toBe(1);
    expect(site?.representationMode).toBe('civilization_infrastructure');
    expect(site?.sourceQuality).toBe('authored');
    expect(site?.artifactForm).toBe('Biotech Module / Catalyst');
    expect(site?.blueprintRole).toBe('post-burn ecological recovery');
    expect(site?.engineeringScale).toBe('Planetary');
    expect(site?.depictionScale).toBe('macro');
    expect(site?.scalePresence).toBe('artifact_pin');
    expect(site?.nativeArtworkLayer).toBe('surface');
    expect(site?.nativeArtworkLabel).toBe('Surface work');
    expect(site?.scalePolicyCopy).toContain('deployment site');
    expect(site?.artifactVisualMotif).toBe('seed');
    expect(site?.artifactSceneTreatment).toBe('ashroot_recovery');
    expect(site?.artifactManifestation?.artifactId).toBe('t1r02');
    expect(site?.artifactManifestation?.lineage).toBe('ecology');
    expect(site?.artifactManifestation?.manifestationFamily).toBe('biological_catalyst');
    expect(site?.artifactManifestation?.implementationScale).toBe('civic');
    expect(site?.artifactManifestation?.nativeCameraScale).toBe('surface');
    expect(site?.artifactManifestation?.visualIdentity).toBeTruthy();
    expect(site?.consequenceLabel).toBe('Living Recovery');
    expect(site?.visualCue).toContain('green recovery threads');
    expect(site?.synergySummary).toContain('solitary trace');
    expect(site?.title).toBe('Ashroot Bloom Work');
    expect(site?.summary).toContain('shown on its card at macro scale as a biotech module');
    expect(site?.summary).toContain('charred recovery nurseries');
    expect(site?.summary).toContain('physical consequence');
    expect(site?.summary.toLowerCase()).not.toContain('giant');
    expect(site?.visibleAs).toContain('worldroot corridors');
    expect(site?.laneLabel).toContain('Phoenix biosphere');
  });

  it('uses distinct deployment language for planetary, stellar, and galactic tiers', () => {
    const forgedArtifacts = [artifact('t1r02', 1, 'verdance', 'Ashroot Bloom')];

    const planetary = buildCivilizationDeploymentSites({ forgedArtifacts, loreCatalog, tier: 1 })[0]!;
    const stellar = buildCivilizationDeploymentSites({ forgedArtifacts, loreCatalog, tier: 2 })[0]!;
    const galactic = buildCivilizationDeploymentSites({ forgedArtifacts, loreCatalog, tier: 3 })[0]!;

    expect(planetary.visibleAs).toContain('green recovery belts');
    expect(stellar.visibleAs).toContain('habitat ecology chains');
    expect(galactic.visibleAs).toContain('worldroot corridors');
  });

  it('represents duplicate mastery as one persistent physical manifestation', () => {
    const sites = buildCivilizationDeploymentSites({
      forgedArtifacts: [
        artifact('t1r02', 1, 'verdance', 'Ashroot Bloom'),
        artifact('t1r02', 1, 'verdance', 'Ashroot Bloom'),
      ],
      loreCatalog,
      tier: 1,
    });

    expect(sites.map((site) => site.id)).toEqual(['artifact:t1r02']);
    expect(sites[0]?.title).toBe('Ashroot Bloom Work');
    expect(sites[0]?.masteryCount).toBe(2);
  });

  it('uses card-art depiction scale instead of tier for main visual placement', () => {
    const roomScale = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t1s02', 1, 'continuum', 'Mantlelift Driver Coil')],
      loreCatalog,
      tier: 3,
    })[0]!;
    const planetaryScale = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t1-planetary-art', 1, 'radiance', 'Horizon City Engine')],
      loreCatalog: {
        't1-planetary-art': {
          name: 'Horizon City Engine',
          flavor: '',
          artifactForm: 'Planetary Infrastructure',
          practicalCapability: 'visible horizon-scale civic work',
          civLane: 'horizon civic culture',
          engineeringScale: 'Planetary',
          depictionScale: 'planetary',
        },
      },
      tier: 3,
    })[0]!;

    expect(roomScale.artifactTier).toBe(1);
    expect(roomScale.depictionScale).toBe('room');
    expect(roomScale.scalePresence).toBe('deployment_site');
    expect(roomScale.nativeArtworkLayer).toBe('surface');
    expect(roomScale.nativeArtworkLabel).toBe('Surface work');
    expect(roomScale.artifactVisualMotif).toBe('coil');
    expect(roomScale.artifactSceneTreatment).toBe('mantlelift_driver');
    expect(roomScale.representationMode).toBe('civilization_infrastructure');
    expect(planetaryScale.artifactTier).toBe(1);
    expect(planetaryScale.depictionScale).toBe('planetary');
    expect(planetaryScale.scalePresence).toBe('planetary_infrastructure');
    expect(planetaryScale.nativeArtworkLayer).toBe('orbit');
    expect(planetaryScale.nativeArtworkLabel).toBe('Planet feature');
    expect(planetaryScale.artifactVisualMotif).toBe('aperture');
    expect(planetaryScale.representationMode).toBe('civilization_infrastructure');
    expect(planetaryScale.summary).toContain('unclassified instrument');
  });

  it('assigns authored scene treatments to first-pool Blueprint component artifacts', () => {
    const sites = buildCivilizationDeploymentSites({
      forgedArtifacts: [
        artifact('t1r01', 1, 'flare', 'Ignition Kernel'),
        artifact('t1p04', 1, 'radiance', 'Magnetic Bottle'),
        artifact('t2o01', 2, 'abyss', 'Horizon Extractor'),
        artifact('t1r07', 1, 'flare', 'Entropy Pyre Baffle'),
      ],
      loreCatalog,
      tier: 2,
    });

    expect(sites.find((site) => site.artifactId === 't1r01')?.artifactSceneTreatment)
      .toBe('ignition_kernel');
    expect(sites.find((site) => site.artifactId === 't1r01')?.visibleAs)
      .toContain('controlled ignition relays');
    expect(sites.find((site) => site.artifactId === 't1p04')?.artifactSceneTreatment)
      .toBe('magnetic_bottle');
    expect(sites.find((site) => site.artifactId === 't1p04')?.visibleAs)
      .toContain('quarantine containment shells');
    expect(sites.find((site) => site.artifactId === 't2o01')?.artifactSceneTreatment)
      .toBe('horizon_extractor');
    expect(sites.find((site) => site.artifactId === 't2o01')?.visibleAs)
      .toContain('boundary-energy samplers');
    expect(sites.find((site) => site.artifactId === 't1r07')?.artifactSceneTreatment)
      .toBe('entropy_baffle');
    expect(sites.find((site) => site.artifactId === 't1r07')?.visualCue)
      .toContain('heat-sink');
  });

  it('derives usable site metadata when authored lore is unavailable', () => {
    const [site] = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('custom-pocket-device', 1, 'abyss', 'Pocket Null')],
      tier: 2,
    });

    expect(site?.sourceQuality).toBe('derived');
    expect(site?.representationMode).toBe('local_trace');
    expect(site?.artifactVisualMotif).toBe('containment');
    expect(site?.artifactForm).toBeTruthy();
    expect(site?.blueprintRole).toBeTruthy();
    expect(site?.consequenceLabel).toBeTruthy();
    expect(site?.visualCue).toBeTruthy();
    expect(site?.engineeringScale).toBe('Star-system');
    expect(site?.summary).toContain('Pocket Null is shown on its card at tabletop scale as a concealment device');
    expect(site?.summary).toContain('physical consequence');
  });

  it('explains how related artifacts combine into civilization projects', () => {
    const sites = buildCivilizationDeploymentSites({
      forgedArtifacts: [
        artifact('t1s02', 1, 'continuum', 'Mantlelift Driver Coil'),
        artifact('t1r07', 1, 'flare', 'Entropy Pyre Baffle'),
      ],
      loreCatalog,
      tier: 1,
    });

    const mantlelift = sites.find((site) => site.artifactId === 't1s02');

    expect(mantlelift?.supportingArtifactNames).toContain('Entropy Pyre Baffle');
    expect(mantlelift?.synergySummary).toContain('orbital logistics civilization');
    expect(mantlelift?.synergySummary).toContain('civilizational consequence');
    expect(mantlelift?.priority).toBeGreaterThan(100);
  });

  it('marks artifact components with a completed Blueprint only after that Blueprint manifests', () => {
    const withoutBlueprint = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t1s02', 1, 'continuum', 'Mantlelift Driver Coil')],
      loreCatalog,
      tier: 2,
    }).find((site) => site.artifactId === 't1s02');

    const withBlueprint = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t1s02', 1, 'continuum', 'Mantlelift Driver Coil')],
      loreCatalog,
      tier: 2,
      manifestedBlueprintDevices: [{
        blueprintId: 'bp_mantle_to_orbit_foundry',
        definition: BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry as never,
        ownerPlayerId: 'local',
        slotIndex: 0,
        state: 'armed',
        presentationVariant: 'armored',
      }],
    }).find((site) => site.artifactId === 't1s02');

    expect(withoutBlueprint?.completedBlueprintId).toBeUndefined();
    expect(withBlueprint?.completedBlueprintId).toBe('bp_mantle_to_orbit_foundry');
    expect(getCivilizationDeploymentSiteSignature(withoutBlueprint!))
      .not.toBe(getCivilizationDeploymentSiteSignature(withBlueprint!));
  });

  it('derives visual motifs from card identity when lore is sparse', () => {
    const sites = buildCivilizationDeploymentSites({
      forgedArtifacts: [
        artifact('custom-magnetic-bottle', 1, 'abyss', 'Magnetic Bottle'),
        artifact('custom-glass-prism', 1, 'radiance', 'Glass Prism'),
        artifact('custom-archive-ledger', 1, 'radiance', 'Chronicle Ledger'),
      ],
      tier: 1,
    });

    expect(sites.find((site) => site.artifactId === 'custom-magnetic-bottle')?.artifactVisualMotif)
      .toBe('vessel');
    expect(sites.find((site) => site.artifactId === 'custom-glass-prism')?.artifactVisualMotif)
      .toBe('prism');
    expect(sites.find((site) => site.artifactId === 'custom-archive-ledger')?.artifactVisualMotif)
      .toBe('archive');
  });

  it('prioritizes manifested Blueprints as major environmental consequences', () => {
    const [site] = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t1r02', 1, 'verdance', 'Ashroot Bloom')],
      loreCatalog,
      tier: 2,
      manifestedBlueprintDevices: [{
        blueprintId: 'bp_antimatter_detonator',
        definition: BLUEPRINT_DEFINITIONS.bp_antimatter_detonator as never,
        ownerPlayerId: 'local',
        slotIndex: 0,
        state: 'armed',
        presentationVariant: 'armored',
      }],
    });

    expect(site?.kind).toBe('blueprint');
    expect(site?.representationMode).toBe('blueprint_consequence');
    expect(site?.componentSummary).toContain('Reaction Core');
    expect(site?.gameplayEffect).toContain('Annihilate');
    expect(site?.capabilityIds).toEqual(['project:claim_annihilation']);
    expect(site?.consequenceLabel).toBe('Blueprint Project');
    expect(site?.blueprintManifestationScale).toBe('satellite');
    expect(site?.blueprintManifestationMotion).toBe('gimbaled_orbit');
    expect(site?.synergySummary).toContain('completed civilization project');
    expect(site?.title).toBe('Antimatter Quarantine Orbit');
    expect(site?.visibleAs).toContain('exclusion path');
  });

  it('carries canonical Artifact capabilities without deriving rules from visual traits', () => {
    const [site] = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t1r01', 1, 'flare', 'Ignition Kernel')],
      loreCatalog,
      tier: 1,
    });

    expect(site?.kind).toBe('artifact');
    expect(site?.capabilityIds).toEqual(['artifact:controlled_energy']);
  });

  it('keeps lost implementations as historical sites while removing their active capabilities', () => {
    const history = [{
      artifactId: 't1r01',
      firstMasteredTurnCount: 2,
      masteryCount: 1,
      implementationState: 'annihilated' as const,
      implementationStateChangedTurnCount: 7,
      changeSourceType: 'blueprint' as const,
      historyEvidence: 'recorded' as const,
    }];
    const historyCards = buildCivilizationArtifactHistoryCards([], history, loreCatalog);
    const [site] = buildCivilizationDeploymentSites({
      forgedArtifacts: historyCards,
      loreCatalog,
      tier: 1,
      civilizationArtifacts: history,
      activeCapabilityIds: [],
    });

    expect(historyCards).toHaveLength(1);
    expect(historyCards[0]?.id).toBe('t1r01');
    expect(site).toMatchObject({
      artifactId: 't1r01',
      implementationState: 'annihilated',
      implementationStateChangedTurnCount: 7,
      masteryCount: 1,
      historyEvidence: 'recorded',
      capabilityIds: ['artifact:controlled_energy'],
      activeCapabilityIds: [],
    });
  });

  it('marks only server-projected capabilities active for Artifact and Project dossiers', () => {
    const sites = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t1r01', 1, 'flare', 'Ignition Kernel')],
      loreCatalog,
      tier: 2,
      civilizationArtifacts: [{
        artifactId: 't1r01',
        firstMasteredTurnCount: 1,
        masteryCount: 1,
        implementationState: 'operational',
        implementationStateChangedTurnCount: 1,
        changeSourceType: 'artifact',
        historyEvidence: 'recorded',
      }],
      manifestedBlueprintDevices: [{
        blueprintId: 'bp_antimatter_detonator',
        definition: BLUEPRINT_DEFINITIONS.bp_antimatter_detonator as never,
        ownerPlayerId: 'local',
        slotIndex: 0,
        state: 'armed',
        presentationVariant: 'armored',
      }],
      activeCapabilityIds: ['artifact:controlled_energy'],
    });

    expect(sites.find((site) => site.kind === 'artifact')?.activeCapabilityIds)
      .toEqual(['artifact:controlled_energy']);
    expect(sites.find((site) => site.kind === 'blueprint')?.activeCapabilityIds)
      .toEqual([]);
  });

  it('keeps Luminary and sealed protocol representation non-literal and anonymous', () => {
    const sites = buildCivilizationDeploymentSites({
      forgedArtifacts: [],
      tier: 3,
      ownerPlayerId: 'local',
      turnCount: 8,
      luminaryAffinities: [{
        luminaryId: 'lum_verdant',
        ownerId: 'local',
        activeAffinity: 'verdance',
        summonedAtTurnCount: 5,
      }],
      scenarioProtocols: [{
        protocolId: 'sealed_protocol_01',
        ownerPlayerId: 'local',
        slotIndex: 0,
        state: 'armed',
        publicEffect: 'A sealed consequence is active.',
      }],
    });

    expect(sites.some((site) => site.summary.includes('not as a body hovering'))).toBe(true);
    expect(sites.some((site) => site.title === 'Sealed Protocol 01')).toBe(true);
    expect(sites.map((site) => `${site.title} ${site.summary}`).join(' '))
      .not.toContain('Antimatter Detonator');
  });

  it('surfaces public Luminary influence on the summon turn instead of delaying the civilization response', () => {
    const sites = buildCivilizationDeploymentSites({
      forgedArtifacts: [],
      tier: 2,
      ownerPlayerId: 'local',
      turnCount: 8,
      luminaryAffinities: [{
        luminaryId: 'lum_flare',
        ownerId: 'local',
        activeAffinity: 'flare',
        summonedAtTurnCount: 8,
      }],
    });

    expect(sites).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'luminary:lum_flare',
        kind: 'luminary',
        representationMode: 'luminary_influence',
        title: 'Flare Luminary Pressure',
      }),
    ]));
  });

  it('orders newly added civilization sites before changed older sites for recent trace presentation', () => {
    const [oldSite] = buildCivilizationDeploymentSites({
      forgedArtifacts: [artifact('t3s01', 3, 'continuum', 'Starway Spine')],
      tier: 2,
    });
    const newSite = {
      ...oldSite!,
      id: 'artifact:t1r01',
      artifactId: 't1r01',
      title: 'Ignition Kernel Trace',
      priority: 10,
    };
    const sites = [oldSite!, newSite];
    const previousSignatures = new Map([[oldSite!.id, 'before-synergy']]);
    const nextSignatures = getCivilizationDeploymentSiteSignatureMap(sites);

    expect(getRecentCivilizationDeploymentSiteIds(previousSignatures, nextSignatures, sites))
      .toEqual(['artifact:t1r01', oldSite!.id]);
  });

  it('keeps newest recent civilization traces in front while retaining older pending traces', () => {
    expect(prioritizeRecentCivilizationSiteIds(
      ['artifact:new', 'blueprint:bp_mantle_to_orbit_foundry'],
      ['artifact:old', 'artifact:new', 'luminary:lum_flare'],
    )).toEqual([
      'artifact:new',
      'blueprint:bp_mantle_to_orbit_foundry',
      'artifact:old',
      'luminary:lum_flare',
    ]);
  });

  it('slots future Chronicle records into the civilization view without treating them as sealed protocols', () => {
    const [site] = buildCivilizationDeploymentSites({
      forgedArtifacts: [],
      tier: 1,
      ownerPlayerId: 'local',
      chronicleRecords: [{
        chronicleId: 'outer_vault_access',
        ownerPlayerId: 'local',
        title: 'Outer Vault Access',
        summary: 'The recovered thread changes how the civilization remembers the first opened threshold.',
        visibleAs: 'a restored archive signal threaded through civic memory and threshold records',
        laneLabel: 'Recovered story thread',
        publicEffect: 'A recovered story-mode thread is available for future campaign context.',
        scaleBand: 'planetary',
        affinity: 'radiance',
        trait: 'archive',
      }],
    });

    expect(site).toMatchObject({
      id: 'chronicle:outer_vault_access',
      kind: 'chronicle',
      chronicleId: 'outer_vault_access',
      representationMode: 'chronicle_record',
      consequenceLabel: 'Chronicle Thread',
      title: 'Outer Vault Access',
      laneLabel: 'Recovered story thread',
      sourceQuality: 'authored',
    });
    expect(site?.summary).toContain('first opened threshold');
    expect(site?.visibleAs).toContain('restored archive signal');
    expect(site?.synergySummary).toContain('story context');
  });
});
