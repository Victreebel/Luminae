export const UX_REVIEW_CHECKPOINT_IDS = [
  "fresh",
  "post_tutorial",
  "trace_ready",
  "recurrence_ready",
  "triangulation_ready",
  "vault_ready",
  "vault_reveal",
  "vault_hub",
] as const;

export type UxReviewCheckpointId = (typeof UX_REVIEW_CHECKPOINT_IDS)[number];

export interface UxReviewCheckpointRecipe {
  id: UxReviewCheckpointId;
  completedChronicleCount: 0 | 1 | 2 | 3;
  tutorialCompleted: boolean;
  vaultState: "none" | "ready" | "reveal" | "opened";
  seeded: boolean;
}

export const UX_REVIEW_CHECKPOINT_RECIPES: Readonly<
  Record<UxReviewCheckpointId, UxReviewCheckpointRecipe>
> = {
  fresh: {
    id: "fresh",
    completedChronicleCount: 0,
    tutorialCompleted: false,
    vaultState: "none",
    seeded: false,
  },
  post_tutorial: {
    id: "post_tutorial",
    completedChronicleCount: 0,
    tutorialCompleted: true,
    vaultState: "none",
    seeded: true,
  },
  trace_ready: {
    id: "trace_ready",
    completedChronicleCount: 0,
    tutorialCompleted: true,
    vaultState: "none",
    seeded: true,
  },
  recurrence_ready: {
    id: "recurrence_ready",
    completedChronicleCount: 1,
    tutorialCompleted: true,
    vaultState: "none",
    seeded: true,
  },
  triangulation_ready: {
    id: "triangulation_ready",
    completedChronicleCount: 2,
    tutorialCompleted: true,
    vaultState: "none",
    seeded: true,
  },
  vault_ready: {
    id: "vault_ready",
    completedChronicleCount: 3,
    tutorialCompleted: true,
    vaultState: "ready",
    seeded: true,
  },
  vault_reveal: {
    id: "vault_reveal",
    completedChronicleCount: 3,
    tutorialCompleted: true,
    vaultState: "reveal",
    seeded: true,
  },
  vault_hub: {
    id: "vault_hub",
    completedChronicleCount: 3,
    tutorialCompleted: true,
    vaultState: "opened",
    seeded: true,
  },
};

export function isUxReviewCheckpointId(value: unknown): value is UxReviewCheckpointId {
  return typeof value === "string" &&
    (UX_REVIEW_CHECKPOINT_IDS as readonly string[]).includes(value);
}

export function uxReviewServerAllowed(input: {
  nodeEnv: string | undefined;
  explicitEnable: string | undefined;
  loopback: boolean;
}): boolean {
  if (input.nodeEnv === "production") return false;
  return input.explicitEnable === "1" || (input.nodeEnv === "development" && input.loopback);
}
