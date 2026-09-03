import recursiveLensArtwork from "@/assets/cards/runtime/t1p05.webp";
import nullLoopAnchorArtwork from "@/assets/cards/runtime/t1s03.webp";
import oathfireIgniterArtwork from "@/assets/cards/runtime/t1r08.webp";
import ascensionRegistryArtwork from "@/assets/blueprints/ascension/ascension-registry-card.webp";
import {
  HorizontalBlueprintCard,
  type HorizontalBlueprintComponentRecord,
} from "./HorizontalBlueprintCard";

export type AscensionRegistryBlueprintState = "assembling" | "manifested";

type AscensionRegistryBlueprintCardProps = {
  state?: AscensionRegistryBlueprintState;
  matchedSockets?: number;
};

const components = [
  {
    artifactId: "t1p05",
    artifactName: "Recursive Lens",
    affinity: "radiance",
    artwork: recursiveLensArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "continuum", amount: 2 },
      { affinity: "radiance", amount: 2 },
    ],
    requirement: "1 Tier I Radiance Readiness Instrument",
    flavor:
      "Before examining the world, this lens examines its own bias. Occasionally it refuses to show the observer.",
    artifactForm: "Sensor / Protocol",
    blueprintRole: "Self-auditing readiness verification",
    blueprintFamilies: "Ascension Registry; Causality Audit Court precursor",
    civilizationLane: "Self-correcting optics culture",
    engineeringScale: "Planetary",
    hotspot: { left: "50%", top: "27%" },
  },
  {
    artifactId: "t1s03",
    artifactName: "Null-Loop Anchor",
    affinity: "continuum",
    artwork: nullLoopAnchorArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 1 },
      { affinity: "abyss", amount: 1 },
      { affinity: "radiance", amount: 1 },
    ],
    requirement: "1 Tier I Continuum Deferral Boundary",
    flavor:
      "It stops machines trapped in endless repetition. Afterward, the anchor keeps counting cycles that never happened.",
    artifactForm: "Control Instrument / Stabilization",
    blueprintRole: "Recursive delay boundary",
    blueprintFamilies: "Ascension Registry; Causality Audit Court precursor",
    civilizationLane: "Recursion-safety civilization",
    engineeringScale: "Planetary",
    hotspot: { left: "18%", top: "57%" },
  },
  {
    artifactId: "t1r08",
    artifactName: "Oathfire Igniter",
    affinity: "flare",
    artwork: oathfireIgniterArtwork,
    tier: "Tier I",
    eminence: 1,
    cost: [{ affinity: "radiance", amount: 4 }],
    requirement: "1 Tier I Flare Public-Witness Instrument",
    flavor:
      "The igniter opens only before witnesses, turning flame into a public promise. Unrecorded fires will not answer it.",
    artifactForm: "Civic Signal Object / Power Component",
    blueprintRole: "Witnessed public judgment",
    blueprintFamilies: "Ascension Registry; Galactic Concordance precursor",
    civilizationLane: "Solar civic forge culture",
    engineeringScale: "Planetary",
    hotspot: { left: "51%", top: "57%" },
  },
] as const satisfies readonly HorizontalBlueprintComponentRecord[];

export function AscensionRegistryBlueprintCard({
  state = "assembling",
  matchedSockets = 0,
}: AscensionRegistryBlueprintCardProps) {
  return (
    <HorizontalBlueprintCard
      blueprintId="bp_ascension_registry"
      state={state}
      matchedComponents={matchedSockets}
      artwork={ascensionRegistryArtwork}
      artworkAlt="The Ascension Registry linking a recursive lens, null-loop anchor, and oathfire witness above an inhabited world"
      category="Ascension Institution"
      publicStateLabel="Active"
      publicLabel="Public Registry"
      components={components}
      testId="ascension-registry-blueprint-card"
      componentPanelTestId="ascension-registry-component-panel"
      tone="institution"
    />
  );
}
