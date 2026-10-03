import { ARTIFACT_CANON } from '@workspace/game-types';
import { CARD_ART } from '@/lib/cardArtManifest';
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
  matchedComponentIds?: readonly string[];
  publicStateLabel?: string;
  assigned?: boolean;
  covenantBroken?: boolean;
  knownComponentIds?: readonly string[];
};

const components = [
  {
    artifactId: "t1r01",
    artifactName: ARTIFACT_CANON.t1r01.name,
    affinity: "flare",
    artwork: CARD_ART.t1r01,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "verdance", amount: 1 },
      { affinity: "abyss", amount: 1 },
      { affinity: "radiance", amount: 1 },
    ],
    requirement: "1 Flare Power Component",
    flavor: `${ARTIFACT_CANON.t1r01.functionalText} ${ARTIFACT_CANON.t1r01.mystery}`,
    artifactForm: ARTIFACT_CANON.t1r01.forms.join(" / "),
    blueprintRole: ARTIFACT_CANON.t1r01.practicalCapability,
    blueprintFamilies: "Antimatter Detonator",
    civilizationLane: ARTIFACT_CANON.t1r01.civLane,
    engineeringScale: ARTIFACT_CANON.t1r01.engineeringScale,
    hotspot: { left: "50%", top: "51%" },
  },
  {
    artifactId: "t1p04",
    artifactName: ARTIFACT_CANON.t1p04.name,
    affinity: "radiance",
    artwork: CARD_ART.t1p04,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 2 },
      { affinity: "radiance", amount: 1 },
    ],
    requirement: "1 Containment Artifact",
    flavor: `${ARTIFACT_CANON.t1p04.functionalText} ${ARTIFACT_CANON.t1p04.mystery}`,
    artifactForm: ARTIFACT_CANON.t1p04.forms.join(" / "),
    blueprintRole: ARTIFACT_CANON.t1p04.practicalCapability,
    blueprintFamilies: "Antimatter Detonator",
    civilizationLane: ARTIFACT_CANON.t1p04.civLane,
    engineeringScale: ARTIFACT_CANON.t1p04.engineeringScale,
    hotspot: { left: "57%", top: "35%" },
  },
  {
    artifactId: "t1r04",
    artifactName: ARTIFACT_CANON.t1r04.name,
    affinity: "flare",
    artwork: CARD_ART.t1r04,
    tier: "Tier I",
    eminence: 0,
    cost: [{ affinity: "continuum", amount: 2 }],
    requirement: "1 Control Instrument or Protocol",
    flavor: `${ARTIFACT_CANON.t1r04.functionalText} ${ARTIFACT_CANON.t1r04.mystery}`,
    artifactForm: ARTIFACT_CANON.t1r04.forms.join(" / "),
    blueprintRole: ARTIFACT_CANON.t1r04.practicalCapability,
    blueprintFamilies: "Antimatter Detonator",
    civilizationLane: ARTIFACT_CANON.t1r04.civLane,
    engineeringScale: ARTIFACT_CANON.t1r04.engineeringScale,
    hotspot: { left: "31%", top: "51%" },
  },
  {
    artifactId: "t2o01",
    artifactName: ARTIFACT_CANON.t2o01.name,
    affinity: "abyss",
    artwork: CARD_ART.t2o01,
    tier: "Tier II",
    eminence: 1,
    cost: [
      { affinity: "continuum", amount: 2 },
      { affinity: "verdance", amount: 2 },
      { affinity: "radiance", amount: 3 },
    ],
    requirement: "1 Abyss Artifact",
    flavor: `${ARTIFACT_CANON.t2o01.functionalText} ${ARTIFACT_CANON.t2o01.mystery}`,
    artifactForm: ARTIFACT_CANON.t2o01.forms.join(" / "),
    blueprintRole: ARTIFACT_CANON.t2o01.practicalCapability,
    blueprintFamilies: "Antimatter Detonator",
    civilizationLane: ARTIFACT_CANON.t2o01.civLane,
    engineeringScale: ARTIFACT_CANON.t2o01.engineeringScale,
    hotspot: { left: "82%", top: "52%" },
  },
] as const satisfies readonly HorizontalBlueprintComponentRecord[];

const definition = {
  name: "Antimatter Detonator",
  publicEffect:
    "Uniformly mark a face-up Tier II Artifact. A legal Forge or Encrypt Annihilates it before payment; gain 2 Eminence and become Spent.",
  presentation: {
    scaleLabel: "Stellar",
    serialCode: "BP-AD-01",
    manifestationScale: "satellite",
  },
  components: [
    { artifactId: "t1r01", stage: "Reaction Core", function: "Supplies the controlled reaction mass and the first ignition event inside the containment field." },
    { artifactId: "t1p04", stage: "Containment Cage", function: "Suspends matter and antimatter across a governed magnetic boundary until firing is authorized." },
    { artifactId: "t1r04", stage: "Governed Trigger", function: "Orders the ignition sequence and prevents the reaction from beginning without a valid command." },
    { artifactId: "t2o01", stage: "Annihilation Sink", function: "Draws the annihilation boundary away from the civilization and absorbs the reaction horizon." },
  ],
} as const;

export function AntimatterBlueprintCard({
  state = "assembling",
  matchedSockets = 3,
  matchedComponentIds,
  publicStateLabel = "Armed",
  covenantBroken = false,
  knownComponentIds,
}: AntimatterBlueprintCardProps) {
  return (
    <HorizontalBlueprintCard
      definition={definition}
      state={state}
      matchedComponents={matchedSockets}
      matchedComponentIds={matchedComponentIds}
      artwork={antimatterDetonatorDevice}
      artworkAlt="The Antimatter Detonator suspended above a planet"
      category="Catastrophe Engine"
      publicStateLabel={publicStateLabel}
      publicLabel="Public Device"
      components={components}
      knownComponentIds={knownComponentIds}
      testId="antimatter-blueprint-card"
      componentPanelTestId="antimatter-component-panel"
      tone="catastrophe"
      secondaryRule={
        covenantBroken
          ? {
              label: "Broken Covenant",
              text: "Annihilate 2 of the Forger's Tier I Artifacts as well.",
            }
          : null
      }
    />
  );
}
