import { ARTIFACT_CATALOG } from "@workspace/game-types";

// Derived from the shared Technology v2 registry so offline development views
// use the same names as the engine and Archive.
export const CARD_NAME_FALLBACK: Readonly<Record<string, string>> =
  Object.freeze(Object.fromEntries(
    ARTIFACT_CATALOG.map((artifact) => [artifact.id, artifact.name]),
  ));
