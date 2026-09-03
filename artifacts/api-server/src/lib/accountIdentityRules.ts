import {
  AFFINITY_IDENTITY_ADJECTIVES,
  BLUEPRINT_DEFINITIONS,
  KARDASHEV_TYPE_LABELS,
  TECHNOLOGY_LINEAGE_NOUNS,
  type CivilizationIdentityOptions,
  type CivilizationIdentitySelection,
  type CivilizationIdentitySummary,
  type KardashevType,
} from "@workspace/game-types";

function asKardashevType(value: number | null | undefined): KardashevType {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

export function summarizeCivilizationIdentity(
  selection: CivilizationIdentitySelection,
  highestKardashevType: number = 0,
): CivilizationIdentitySummary {
  const scaleType = asKardashevType(highestKardashevType);
  return {
    ...selection,
    displayName: selection.lineage && selection.affinity
      ? `The ${AFFINITY_IDENTITY_ADJECTIVES[selection.affinity]} ${TECHNOLOGY_LINEAGE_NOUNS[selection.lineage]}`
      : null,
    scaleType,
    scaleLabel: KARDASHEV_TYPE_LABELS[scaleType],
    projectEpithet: selection.signatureBlueprintId
      ? BLUEPRINT_DEFINITIONS[selection.signatureBlueprintId].name
      : null,
  };
}

export function validateCivilizationIdentitySelection(
  selection: CivilizationIdentitySelection,
  options: CivilizationIdentityOptions,
): string | null {
  if (selection.lineage && !options.lineages.includes(selection.lineage)) {
    return "That lineage has not been earned.";
  }
  if (selection.affinity && !options.affinities.includes(selection.affinity)) {
    return "That Affinity ethos has not been earned.";
  }
  if (selection.signatureArtifactId && !options.artifactIds.includes(selection.signatureArtifactId)) {
    return "That signature Artifact has not been forged.";
  }
  if (selection.signatureLuminaryId && !options.luminaryIds.includes(selection.signatureLuminaryId)) {
    return "That signature Luminary has not allied with this civilization.";
  }
  if (selection.signatureBlueprintId && !options.blueprintIds.includes(selection.signatureBlueprintId)) {
    return "That signature Project has not manifested.";
  }
  return null;
}
