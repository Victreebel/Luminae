import { ARTIFACT_CANON } from '@workspace/game-types';

// Production, tutorial snapshots, and offline review share the same authored identity.
export const CARD_NAME_FALLBACK: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(ARTIFACT_CANON).map(([id, canon]) => [id, canon.name])),
);
