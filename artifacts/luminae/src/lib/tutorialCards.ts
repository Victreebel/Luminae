import type { AffinityKey } from "@/lib/affinityMeta";
import {
  ARTIFACT_DEFINITIONS,
  type ArtifactId,
} from "@workspace/game-types";

export interface TutorialCard {
  id: string;
  name: string;
  flavor: string;
  tier: 1 | 2 | 3;
  bonusAffinity: AffinityKey;
  eminence: number;
  cost: Partial<Record<AffinityKey, number>>;
}

const TUTORIAL_CARD_IDS = [
  "t1r01",
  "t1s03",
  "t1s01",
  "t1e01",
  "t1e07",
  "t1s08",
  "t1o01",
  "t1p01",
  "t2r01",
  "t2e03",
  "t2o01",
  "t2p01",
  "t3e01",
  "t3e02",
  "t3e03",
  "t3s01",
  "t3s04",
  "t3r01",
  "t2e05",
] as const satisfies readonly ArtifactId[];

function buildTutorialCard(artifactId: ArtifactId): TutorialCard {
  const artifact = ARTIFACT_DEFINITIONS[artifactId];
  return {
    id: artifact.id,
    name: artifact.name,
    flavor: artifact.flavor,
    tier: artifact.tier,
    bonusAffinity: artifact.bonusAffinity,
    eminence: artifact.eminence,
    cost: { ...artifact.cost },
  };
}

export const TUTORIAL_CARDS: Record<string, TutorialCard> = Object.fromEntries(
  TUTORIAL_CARD_IDS.map((artifactId) => [artifactId, buildTutorialCard(artifactId)]),
);
