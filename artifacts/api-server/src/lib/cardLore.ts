// ─── Luminae Card Lore ──────────────────────────────────────────────────────
// All tiers derive from the shared, scope-audited artifact-canon.ts registry.
// Technology owns lineage and artwork-subject scale, independently of operational reach.
//
// artPrompt variety slots: see docs/card_art_variety_matrix.md
// Format: [Scale/Shot] — [Background] — [Subject] — [Palette] — [Exclusions]

import {
  ARTIFACT_DEPICTION_SCALE_BY_ID,
  ARTIFACT_CANON,
  type ArtifactId,
} from '@workspace/game-types';
import { ARTIFACT_BLUEPRINT_FAMILIES } from './artifactBlueprintFamilies';

export interface CardLore {
  name: string;
  flavor: string;
  artifactForm?: string;
  blueprintRole?: string;
  blueprintFamilies?: string;
  civLane?: string;
  engineeringScale?: "Planetary" | "Star-system" | "Galactic";
  depictionScale?:
    | "macro"
    | "tabletop"
    | "room"
    | "installation"
    | "planetary"
    | "stellar"
    | "galactic";
  artPrompt?: string;
}

export type ArtifactDepictionScale = NonNullable<CardLore["depictionScale"]>;

export interface PublicCardLore {
  name: string;
  flavor: string;
  artifactForm?: string;
  practicalCapability?: string;
  civLane?: string;
  engineeringScale?: "Planetary" | "Star-system" | "Galactic";
  depictionScale: ArtifactDepictionScale;
  artPrompt?: string;
}

export function getArtifactDepictionScale(lore: CardLore): ArtifactDepictionScale {
  if (lore.depictionScale) return lore.depictionScale;

  const prompt = lore.artPrompt?.toLowerCase() ?? "";
  const form = lore.artifactForm?.toLowerCase() ?? "";

  if (/galactic-scale|galactic industrial scene|galactic network|galactic region|galactic civic|galactic-arm|wide galactic|deep galactic|interstellar necrobiome|many star systems|several star systems|across systems|spiral arm/.test(prompt)) {
    return "galactic";
  }
  if (/stellar-scale|star-system|system-scale|heliosphere|several stars|around a star|around different stars/.test(prompt)) {
    return "stellar";
  }
  if (/extreme macro|macro close-up|macro cross-section|grain-|marble-sized|thumbnail-sized/.test(prompt)) {
    return "macro";
  }
  if (/room-scale|space large enough to walk through|wall-mounted|console-sized/.test(prompt)) {
    return "room";
  }
  if (/tabletop|handheld|palm-sized|finger-length|fingertip-sized|coin-sized|matchbox-sized|forearm-sized|hand-sized/.test(prompt)) {
    return "tabletop";
  }
  if (/installation-scale|facility-scale|building-scale|warehouse|tower|facade/.test(prompt)) {
    return "installation";
  }
  if (/galaxy-wide|galaxy|interstellar/.test(prompt)) {
    return "galactic";
  }
  if (/planetary-scale|planet-wide|planet surface|horizon|world-scale/.test(prompt)) {
    return "planetary";
  }
  if (/galactic/.test(form) || lore.engineeringScale === "Galactic") return "galactic";
  if (/stellar|star-system|heliosphere/.test(form) || lore.engineeringScale === "Star-system") return "stellar";
  if (/planetary|world/.test(form) || lore.engineeringScale === "Planetary") return "planetary";
  return "tabletop";
}

export const CARD_LORE: Record<string, CardLore> = Object.fromEntries(
  Object.entries(ARTIFACT_CANON).map(([id, canon]) => [id, {
    name: canon.name,
    flavor: `${canon.functionalText} ${canon.mystery}`,
    artifactForm: canon.forms.join(' / '),
    blueprintRole: canon.practicalCapability,
    blueprintFamilies: ARTIFACT_BLUEPRINT_FAMILIES[id as ArtifactId] ?? '',
    civLane: canon.civLane,
    engineeringScale: canon.engineeringScale,
    depictionScale: ARTIFACT_DEPICTION_SCALE_BY_ID[id as ArtifactId],
    artPrompt: canon.artPrompt,
  } satisfies CardLore]),
);

export function getCardLore(id: string): CardLore {
  return CARD_LORE[id] ?? { name: "Unnamed Artifact", flavor: "" };
}

export function getPublicCardLoreCatalog(): Record<string, PublicCardLore> {
  return Object.fromEntries(
    Object.entries(CARD_LORE).map(([id, lore]) => [
      id,
      {
        name: lore.name,
        flavor: lore.flavor,
        ...(lore.artifactForm !== undefined && { artifactForm: lore.artifactForm }),
        ...(lore.blueprintRole !== undefined && { practicalCapability: lore.blueprintRole }),
        ...(lore.civLane !== undefined && { civLane: lore.civLane }),
        ...(lore.engineeringScale !== undefined && { engineeringScale: lore.engineeringScale }),
        depictionScale: getArtifactDepictionScale(lore),
        ...(lore.artPrompt !== undefined && { artPrompt: lore.artPrompt }),
      },
    ]),
  );
}
