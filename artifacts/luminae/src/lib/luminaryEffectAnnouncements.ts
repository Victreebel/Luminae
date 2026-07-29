export type LuminaryAnnouncementPart = 'source' | 'resolution';
export const MAX_LUMINARY_ANNOUNCEMENT_LENGTH = 110;

interface LuminaryAnnouncementCopy {
  source: string;
  resolution: string;
}

const ANNOUNCEMENTS: Record<string, LuminaryAnnouncementCopy> = {
  lum_moth: {
    source: 'Rupture marks Tier III Artifacts costing 4 or less Flare.',
    resolution: 'Marked Tier III Artifacts are burned and redrawn.',
  },
  lum_tide: {
    source: 'The Observer Effect searches the Tier II and III Archives.',
    resolution: 'Continuum Artifacts rise to the top.',
  },
  lum_verdant: {
    source: 'Early Bloom takes root.',
    resolution: 'Your future Forges gain +1 Verdance.',
  },
  lum_void: {
    source: 'Oblivion raises the victory threshold.',
    resolution: 'The shared victory requirement increases by 5.',
  },
  lum_radiant: {
    source: 'Perfect Coherence watches the Forge.',
    resolution: 'Gain +2 Eminence at 8 Radiance Artifacts.',
  },
  lum_astral: {
    source: 'Eternal Recurrence opens the Archives.',
    resolution: 'Burned Artifacts return to their Archives.',
  },
  lum_bloom: {
    source: 'Aftergrowth counts the burns since your last turn.',
    resolution: 'Gain +1 Eminence per burn effect.',
  },
  lum_forge: {
    source: 'Impact Extinction targets Tier III.',
    resolution: 'All face-up Tier III Artifacts are burned.',
  },
  lum_compass: {
    source: 'The Forgotten Hour opens.',
    resolution: 'All face-up Forge Artifacts become Forgotten; victory rises by 1.',
  },
  lum_seed: {
    source: 'Avatar Seeds enter the Archives.',
    resolution: 'The next Artifact in each Archive is seeded.',
  },
  lum_orchard: {
    source: 'Perfect Replication prepares a copy.',
    resolution: 'A copy of your cheapest Tier I Artifact is added.',
  },
  lum_pale: {
    source: 'Balance Due measures Affinity holdings.',
    resolution: 'Excess Affinity returns to the Well.',
  },
  lum_ember: {
    source: 'Cinder Mandate marks the Forge.',
    resolution: 'Eligible Forge Artifacts are marked Condemned.',
  },
  lum_hunger: {
    source: 'Assimilation replaces the Forge action.',
    resolution: 'Assimilation is ready this turn.',
  },
  lum_null: {
    source: 'Black Domain descends on Tier III.',
    resolution: 'Eligible Tier III Artifacts are marked Nullified.',
  },
  lum_oracle: {
    source: 'Selective Amnesia reveals two Artifacts.',
    resolution: 'One revealed Artifact joins your collection.',
  },
  lum_scholar: {
    source: 'Selective Amnesia reveals two Artifacts.',
    resolution: 'One revealed Artifact joins your collection.',
  },
};

function firstSentence(value?: string): string | undefined {
  const sentence = value?.match(/^\s*(.*?[.!?])(?:\s|$)/)?.[1]?.trim();
  return sentence || value?.trim();
}

function keepAnnouncementReadable(value: string): string {
  if (value.length <= MAX_LUMINARY_ANNOUNCEMENT_LENGTH) return value;
  const clipped = value
    .slice(0, MAX_LUMINARY_ANNOUNCEMENT_LENGTH - 1)
    .replace(/\s+\S*$/, '')
    .trim();
  return `${clipped}…`;
}

export function getLuminaryAnnouncementCopy(
  luminaryId: string,
  part: LuminaryAnnouncementPart,
  fallback?: { effectName?: string; effectDescription?: string },
  effectType?: 'summon' | 'end_of_turn' | 'start_of_turn',
): string {
  if (luminaryId === 'lum_ember' && effectType === 'end_of_turn') {
    return part === 'source'
      ? 'Cinder Mandate executes its sentence.'
      : 'All condemned Artifacts are burned.';
  }

  if (luminaryId === 'lum_compass' && effectType === 'end_of_turn') {
    return part === 'source'
      ? 'The Forgotten Hour returns.'
      : 'The Forge is marked Forgotten again.';
  }

  const copy = ANNOUNCEMENTS[luminaryId];
  if (copy) return copy[part];

  if (part === 'source') {
    return `${fallback?.effectName ?? 'Luminary effect'} is resolving.`;
  }

  return keepAnnouncementReadable(
    firstSentence(fallback?.effectDescription) ??
      `${fallback?.effectName ?? 'The effect'} resolves.`,
  );
}
