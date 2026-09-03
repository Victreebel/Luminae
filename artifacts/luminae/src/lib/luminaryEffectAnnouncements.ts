export type LuminaryAnnouncementPart = 'source' | 'resolution';
export const MAX_LUMINARY_ANNOUNCEMENT_LENGTH = 110;
export const MAX_LUMINARY_ANNOUNCEMENT_WORDS = 10;

interface LuminaryAnnouncementCopy {
  source: string;
  resolution: string;
}

export interface LuminaryResultReceiptEvent {
  luminaryId: string;
  effectType: 'summon' | 'action' | 'end_of_turn' | 'start_of_turn';
  targetCardIds?: string[];
  targetSlotIds?: string[];
  affinityType?: string;
  affinityAmount?: number;
  affinityReturns?: Array<{
    affinityAmount: number;
  }>;
}

const ANNOUNCEMENTS: Record<string, LuminaryAnnouncementCopy> = {
  lum_moth: {
    source: 'Burn Tier III Artifacts without a 5+ Flare cost.',
    resolution: 'Artifacts below 5 Flare burn, then immediately redraw.',
  },
  lum_tide: {
    source: 'The Observer Effect opens all three Archives to its ally.',
    resolution: 'Archive tops revealed. One may be Forged directly.',
  },
  lum_verdant: {
    source: 'Gain 1 Verdance from the Affinity Well.',
    resolution: 'Gain 1 Verdance from the Affinity Well.',
  },
  lum_void: {
    source: 'Raise the shared victory requirement by 8.',
    resolution: 'Victory rises by 8.',
  },
  lum_radiant: {
    source: 'Reach a Radiance milestone to gain 2 Eminence.',
    resolution: 'Radiance milestone reached. Gain +2 Eminence.',
  },
  lum_astral: {
    source: 'Return future Burned Artifacts to their Archives.',
    resolution: 'Future Burned Artifacts return to their Archives.',
  },
  lum_bloom: {
    source: 'Gain 1 Eminence per Burn effect since your last turn.',
    resolution: 'Gain +1 Eminence for each recorded Burn effect.',
  },
  lum_forge: {
    source: 'Return Forge Artifacts, randomize Archives, then refill the Forge.',
    resolution: 'Artifacts return, Archives randomize, and the Forge refills.',
  },
  lum_compass: {
    source: 'Brand Forge Artifacts Forgotten; raise victory by 1.',
    resolution: 'Forge Artifacts become Forgotten; victory rises by 1.',
  },
  lum_seed: {
    source: 'Permanently seed one random mold in each tier.',
    resolution: 'Three Forge molds are permanently marked.',
  },
  lum_orchard: {
    source: 'Your first eligible Forge grants another bonus Affinity.',
    resolution: 'That Artifact grants a second permanent bonus Affinity.',
  },
  lum_pale: {
    source: 'Players holding half an Affinity supply return 2 tokens.',
    resolution: 'Qualifying holdings return 2 tokens per Affinity.',
  },
  lum_ember: {
    source: 'Brand eligible Forge Artifacts as Condemned.',
    resolution: 'Eligible Forge Artifacts are marked Condemned.',
  },
  lum_hunger: {
    source: 'Assimilate an Artifact to gain only its permanent Affinity.',
    resolution: 'Gain its permanent Affinity bonus; gain no Eminence.',
  },
  lum_null: {
    source: 'Brand eligible Tier III Artifacts as Nullified.',
    resolution: 'Eligible Tier III Artifacts are marked Nullified.',
  },
  lum_oracle: {
    source: 'Reveal 2 Artifacts; add 1 to your collection.',
    resolution: 'One revealed Artifact joins your collection.',
  },
  lum_scholar: {
    source: 'Reveal 2 Artifacts; add 1 to your collection.',
    resolution: 'One revealed Artifact joins your collection.',
  },
};

function firstSentence(value?: string): string | undefined {
  const sentence = value?.match(/^\s*(.*?[.!?])(?:\s|$)/)?.[1]?.trim();
  return sentence || value?.trim();
}

function keepAnnouncementReadable(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const wordClipped = words.length > MAX_LUMINARY_ANNOUNCEMENT_WORDS
    ? `${words.slice(0, MAX_LUMINARY_ANNOUNCEMENT_WORDS).join(' ')}...`
    : value;
  if (wordClipped.length <= MAX_LUMINARY_ANNOUNCEMENT_LENGTH) {
    return wordClipped;
  }
  const clipped = wordClipped
    .slice(0, MAX_LUMINARY_ANNOUNCEMENT_LENGTH - 3)
    .replace(/\s+\S*$/, '')
    .trim();
  return `${clipped}...`;
}

export function getLuminaryAnnouncementCopy(
  luminaryId: string,
  part: LuminaryAnnouncementPart,
  fallback?: { effectName?: string; effectDescription?: string },
  effectType?: 'summon' | 'action' | 'end_of_turn' | 'start_of_turn',
): string {
  if (luminaryId === 'lum_ember' && effectType === 'end_of_turn') {
    return part === 'source'
      ? 'Burn all Condemned Artifacts.'
      : 'All condemned Artifacts are burned.';
  }

  if (luminaryId === 'lum_compass' && effectType === 'end_of_turn') {
    return part === 'source'
      ? 'Brand Forge Artifacts Forgotten again.'
      : 'The Forge is marked Forgotten again.';
  }

  if (luminaryId === 'lum_seed' && effectType === 'end_of_turn') {
    return part === 'source'
      ? 'Brand unseeded Artifacts in seeded molds as Seeded.'
      : 'Unseeded Artifacts on those molds become Seeded.';
  }

  if (luminaryId === 'lum_seed' && effectType === 'action') {
    return part === 'source'
      ? 'Gain the forged Seeded Artifact’s permanent Affinity.'
      : 'Its Affinity permanently imbues the allied player.';
  }

  if (luminaryId === 'lum_astral' && effectType === 'start_of_turn') {
    return part === 'source'
      ? 'Return the Burn Pile; refill empty Forge positions.'
      : 'Those Artifacts return; empty Forge positions refill.';
  }

  const copy = ANNOUNCEMENTS[luminaryId];
  if (copy) return keepAnnouncementReadable(copy[part]);

  if (part === 'source') {
    return keepAnnouncementReadable(
      `${fallback?.effectName ?? 'Luminary effect'} is resolving.`,
    );
  }

  return keepAnnouncementReadable(
    firstSentence(fallback?.effectDescription) ??
      `${fallback?.effectName ?? 'The effect'} resolves.`,
  );
}

function affinityLabel(value?: string): string {
  if (!value) return 'Affinity';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function affectedArtifactCopy(
  count: number,
  affected: string,
  empty: string,
): string {
  if (count === 0) return /[.!?]$/.test(empty) ? empty : `${empty}.`;
  return `${count} Artifact${count === 1 ? '' : 's'} ${affected}.`;
}

export function getLuminaryEffectResultReceiptCopy(
  event: LuminaryResultReceiptEvent,
  fallback?: { effectName?: string; effectDescription?: string },
): string {
  const targetCount = event.targetCardIds?.length ?? 0;

  if (event.luminaryId === 'lum_moth') {
    return keepAnnouncementReadable(affectedArtifactCopy(
      targetCount,
      'burned; their Forge slots immediately redrew',
      'No Tier III Artifacts were below 5 Flare',
    ));
  }

  if (event.luminaryId === 'lum_verdant') {
    const amount = event.affinityAmount ?? 1;
    return keepAnnouncementReadable(`+${amount} Verdance gained from the Affinity Well.`);
  }

  if (event.luminaryId === 'lum_forge') {
    return keepAnnouncementReadable(affectedArtifactCopy(
      targetCount,
      'returned; Archives randomized; Forge refilled',
      'Archives randomized; the Forge refilled',
    ));
  }

  if (event.luminaryId === 'lum_compass') {
    if (event.effectType === 'end_of_turn') {
      return keepAnnouncementReadable(affectedArtifactCopy(
        targetCount,
        'became Forgotten again',
        'No additional Artifacts became Forgotten',
      ));
    }
    return keepAnnouncementReadable(
      `${targetCount} Artifact${targetCount === 1 ? '' : 's'} became Forgotten. ` +
      'Victory condition increased by 1.',
    );
  }

  if (event.luminaryId === 'lum_seed') {
    if (event.effectType === 'summon') {
      const moldCount = event.targetSlotIds?.length ?? 3;
      return keepAnnouncementReadable(`${moldCount} Forge molds gained permanent Avatar Seeds.`);
    }
    if (event.effectType === 'end_of_turn') {
      return keepAnnouncementReadable(affectedArtifactCopy(
        targetCount,
        'became Seeded',
        'No unseeded Artifacts occupied seeded molds',
      ));
    }
    return keepAnnouncementReadable(
      `${affinityLabel(event.affinityType)} permanently imbued the allied player.`,
    );
  }

  if (event.luminaryId === 'lum_pale') {
    const holdings = event.affinityReturns?.length ?? 0;
    const tokenCount = (event.affinityReturns ?? []).reduce(
      (total, result) => total + result.affinityAmount,
      0,
    );
    if (holdings === 0) return 'No player had a qualifying Affinity holding.';
    return keepAnnouncementReadable(
      `${holdings} holding${holdings === 1 ? '' : 's'} returned ${tokenCount} Affinity tokens to the Well.`,
    );
  }

  if (event.luminaryId === 'lum_ember') {
    return keepAnnouncementReadable(affectedArtifactCopy(
      targetCount,
      event.effectType === 'end_of_turn' ? 'burned' : 'became Condemned',
      event.effectType === 'end_of_turn'
        ? 'No Condemned Artifacts remained to burn'
        : 'No eligible Artifacts became Condemned',
    ));
  }

  if (event.luminaryId === 'lum_hunger' && event.effectType === 'action') {
    return keepAnnouncementReadable(
      `${affinityLabel(event.affinityType)} became permanent Affinity; no Eminence gained.`,
    );
  }

  if (event.luminaryId === 'lum_null') {
    return keepAnnouncementReadable(affectedArtifactCopy(
      targetCount,
      'became Nullified',
      'No eligible Tier III Artifacts became Nullified',
    ));
  }

  if (event.luminaryId === 'lum_astral' && event.effectType === 'start_of_turn') {
    return keepAnnouncementReadable(affectedArtifactCopy(
      targetCount,
      'returned to their Archives; empty Forge slots refilled',
      'No Burned Artifacts were waiting to return',
    ));
  }

  return getLuminaryAnnouncementCopy(
    event.luminaryId,
    'resolution',
    fallback,
    event.effectType,
  );
}
