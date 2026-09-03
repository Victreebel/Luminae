import { eq } from "drizzle-orm";
import {
  accountArchiveSummaryTable,
  accountCivilizationIdentityTable,
  db,
} from "@workspace/db";
import {
  ARTIFACT_IDS,
  BLUEPRINT_IDS,
  LUMINARY_IDS,
  NATURAL_AFFINITY_KEYS,
  TECHNOLOGY_LINEAGES,
  type CivilizationIdentitySelection,
  type CivilizationIdentitySummary,
} from "@workspace/game-types";
import {
  summarizeCivilizationIdentity,
} from "./accountIdentityRules";

export {
  summarizeCivilizationIdentity,
  validateCivilizationIdentitySelection,
} from "./accountIdentityRules";

export const EMPTY_CIVILIZATION_IDENTITY: CivilizationIdentitySelection = {
  lineage: null,
  affinity: null,
  signatureArtifactId: null,
  signatureLuminaryId: null,
  signatureBlueprintId: null,
};

export async function readAccountCivilizationIdentity(accountId: string): Promise<CivilizationIdentitySummary> {
  const [identityRows, summaryRows] = await Promise.all([
    db
      .select()
      .from(accountCivilizationIdentityTable)
      .where(eq(accountCivilizationIdentityTable.accountId, accountId))
      .limit(1),
    db
      .select({ highestKardashevType: accountArchiveSummaryTable.highestKardashevType })
      .from(accountArchiveSummaryTable)
      .where(eq(accountArchiveSummaryTable.accountId, accountId))
      .limit(1),
  ]);
  const row = identityRows[0];
  const selection: CivilizationIdentitySelection = row ? {
    lineage: TECHNOLOGY_LINEAGES.includes(row.lineage as typeof TECHNOLOGY_LINEAGES[number])
      ? row.lineage as typeof TECHNOLOGY_LINEAGES[number]
      : null,
    affinity: NATURAL_AFFINITY_KEYS.includes(row.affinity as typeof NATURAL_AFFINITY_KEYS[number])
      ? row.affinity as typeof NATURAL_AFFINITY_KEYS[number]
      : null,
    signatureArtifactId: ARTIFACT_IDS.includes(row.signatureArtifactId as typeof ARTIFACT_IDS[number])
      ? row.signatureArtifactId as CivilizationIdentitySelection["signatureArtifactId"]
      : null,
    signatureLuminaryId: LUMINARY_IDS.includes(row.signatureLuminaryId as typeof LUMINARY_IDS[number])
      ? row.signatureLuminaryId as CivilizationIdentitySelection["signatureLuminaryId"]
      : null,
    signatureBlueprintId: BLUEPRINT_IDS.includes(row.signatureBlueprintId as typeof BLUEPRINT_IDS[number])
      ? row.signatureBlueprintId as CivilizationIdentitySelection["signatureBlueprintId"]
      : null,
  } : EMPTY_CIVILIZATION_IDENTITY;
  return summarizeCivilizationIdentity(selection, summaryRows[0]?.highestKardashevType ?? 0);
}

export async function writeAccountCivilizationIdentity(
  accountId: string,
  selection: CivilizationIdentitySelection,
): Promise<void> {
  await db
    .insert(accountCivilizationIdentityTable)
    .values({ accountId, ...selection })
    .onConflictDoUpdate({
      target: accountCivilizationIdentityTable.accountId,
      set: { ...selection, updatedAt: new Date() },
    });
}
