import ignitionKernelArtwork from "@/assets/cards/runtime/t1r01.webp";
import causalSparkCoilArtwork from "@/assets/cards/runtime/t1r04.webp";
import magneticBottleArtwork from "@/assets/cards/runtime/t1p04.webp";
import horizonExtractorArtwork from "@/assets/cards/runtime/t2o01.webp";
import antimatterDetonatorDevice from "@/assets/blueprints/antimatter/antimatter-detonator-card.webp";
import {
  HorizontalBlueprintCard,
  type HorizontalBlueprintComponentRecord,
} from "./HorizontalBlueprintCard";

export type AntimatterBlueprintState = "assembling" | "manifested";
export type AntimatterBlueprintPresentation = "dossier" | "card";

type AntimatterBlueprintCardProps = {
  state?: AntimatterBlueprintState;
  /** Retained for old Vault links; all Blueprint records now use one card framework. */
  presentation?: AntimatterBlueprintPresentation;
  matchedSockets?: number;
  assigned?: boolean;
  covenantBroken?: boolean;
};

const components = [
  {
    artifactId: "t1r01",
    artifactName: "Ignition Kernel",
    affinity: "flare",
    artwork: ignitionKernelArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "verdance", amount: 1 },
      { affinity: "abyss", amount: 1 },
      { affinity: "radiance", amount: 1 },
    ],
    requirement: "1 Flare Power Component",
    flavor:
      "The first fire a city learns to trust. Pressed into deep-bore channels and launch cradles alike, it ignites on command and refuses to consume beyond its charter. Civilizations that master it stop fearing fire and start building with it.",
    artifactForm: "Power Component / Control Instrument",
    blueprintRole: "Controlled ignition and thermal regulation",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Planetary Cradle Engine",
    civilizationLane: "Planetary forge culture",
    engineeringScale: "Planetary",
    hotspot: { left: "50%", top: "51%" },
  },
  {
    artifactId: "t1p04",
    artifactName: "Magnetic Bottle",
    affinity: "radiance",
    artwork: magneticBottleArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 2 },
      { affinity: "radiance", amount: 1 },
    ],
    requirement: "1 Containment Artifact",
    flavor:
      "A bottle made of discipline more than matter. It holds fire by persuading every field in the vicinity to agree. What it contains presses against geometry rather than walls, which holds better.",
    artifactForm: "Containment / Power Component",
    blueprintRole: "Plasma or field containment",
    blueprintFamilies: "Starlift Foundry precursor; Mantle-to-Orbit Foundry",
    civilizationLane: "Field-containment culture",
    engineeringScale: "Planetary",
    hotspot: { left: "57%", top: "35%" },
  },
  {
    artifactId: "t1r04",
    artifactName: "Causal Spark Coil",
    affinity: "flare",
    artwork: causalSparkCoilArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [{ affinity: "continuum", amount: 2 }],
    requirement: "1 Control Instrument or Protocol",
    flavor:
      "Before it fires, it asks what will happen three steps later. Industrial triggers and irreversible ignitions wait on its judgment: not the operator's desire, but a formal account of consequences.",
    artifactForm: "Control Instrument / Protocol Object",
    blueprintRole: "Safe trigger sequencing",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Causality Audit Court precursor",
    civilizationLane: "Experimental causal engineer civilization",
    engineeringScale: "Planetary",
    hotspot: { left: "31%", top: "51%" },
  },
  {
    artifactId: "t2o01",
    artifactName: "Horizon Extractor",
    affinity: "abyss",
    artwork: horizonExtractorArtwork,
    tier: "Tier II",
    eminence: 1,
    cost: [
      { affinity: "continuum", amount: 2 },
      { affinity: "verdance", amount: 2 },
      { affinity: "radiance", amount: 3 },
    ],
    requirement: "1 Abyss Artifact",
    flavor:
      "An extractor that samples the edge of forbidden physics without inviting the edge inside. It harvests what is available at boundaries where ordinary instruments would be destroyed.",
    artifactForm: "Sensor / Containment",
    blueprintRole: "Boundary-energy sampling",
    blueprintFamilies: "Dark-Sector Observatory; Starlift Foundry",
    civilizationLane: "Horizon engineer civilization",
    engineeringScale: "Star-system",
    hotspot: { left: "82%", top: "52%" },
  },
] as const satisfies readonly HorizontalBlueprintComponentRecord[];

export function AntimatterBlueprintCard({
  state = "assembling",
  matchedSockets = 3,
  covenantBroken = false,
}: AntimatterBlueprintCardProps) {
  return (
    <HorizontalBlueprintCard
      blueprintId="bp_antimatter_detonator"
      state={state}
      matchedComponents={matchedSockets}
      artwork={antimatterDetonatorDevice}
      artworkAlt="The Antimatter Detonator suspended above a planet"
      category="Catastrophe Engine"
      publicStateLabel="Armed"
      publicLabel="Public Device"
      components={components}
      testId="antimatter-blueprint-card"
      componentPanelTestId="antimatter-component-panel"
      tone="catastrophe"
      secondaryRule={covenantBroken ? {
        label: "Broken Covenant",
        text: "Annihilate 2 of the Forger's Tier I Artifacts as well.",
      } : null}
    />
  );
}
