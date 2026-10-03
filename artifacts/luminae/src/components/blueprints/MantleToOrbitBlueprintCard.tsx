import { ARTIFACT_CANON } from '@workspace/game-types';
import { CARD_ART } from '@/lib/cardArtManifest';
import mantleToOrbitFoundryArtwork from "@/assets/blueprints/mantle-to-orbit/mantle-to-orbit-foundry-card.webp";
import {
  HorizontalBlueprintCard,
  type HorizontalBlueprintComponentRecord,
} from "./HorizontalBlueprintCard";

export type MantleToOrbitBlueprintState = "assembling" | "manifested";

type MantleToOrbitBlueprintCardProps = {
  state?: MantleToOrbitBlueprintState;
  matchedSockets?: number;
  matchedComponentIds?: readonly string[];
  publicStateLabel?: string;
  knownComponentIds?: readonly string[];
};

const components = [
  {
    artifactId: "t1r07",
    artifactName: ARTIFACT_CANON.t1r07.name,
    affinity: "flare",
    artwork: CARD_ART.t1r07,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "verdance", amount: 2 },
      { affinity: "abyss", amount: 2 },
    ],
    requirement: "1 Tier I Flare Thermal-Control Component",
    flavor: `${ARTIFACT_CANON.t1r07.functionalText} ${ARTIFACT_CANON.t1r07.mystery}`,
    artifactForm: ARTIFACT_CANON.t1r07.forms.join(" / "),
    blueprintRole: ARTIFACT_CANON.t1r07.practicalCapability,
    blueprintFamilies: "Mantle-to-Orbit Foundry",
    civilizationLane: ARTIFACT_CANON.t1r07.civLane,
    engineeringScale: ARTIFACT_CANON.t1r07.engineeringScale,
    hotspot: { left: "66%", top: "81%" },
  },
  {
    artifactId: "t1s02",
    artifactName: ARTIFACT_CANON.t1s02.name,
    affinity: "continuum",
    artwork: CARD_ART.t1s02,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 2 },
      { affinity: "verdance", amount: 1 },
    ],
    requirement: "1 Tier I Continuum Transit Component",
    flavor: `${ARTIFACT_CANON.t1s02.functionalText} ${ARTIFACT_CANON.t1s02.mystery}`,
    artifactForm: ARTIFACT_CANON.t1s02.forms.join(" / "),
    blueprintRole: ARTIFACT_CANON.t1s02.practicalCapability,
    blueprintFamilies: "Mantle-to-Orbit Foundry",
    civilizationLane: ARTIFACT_CANON.t1s02.civLane,
    engineeringScale: ARTIFACT_CANON.t1s02.engineeringScale,
    hotspot: { left: "50%", top: "52%" },
  },
  {
    artifactId: "t1o05",
    artifactName: ARTIFACT_CANON.t1o05.name,
    affinity: "abyss",
    artwork: CARD_ART.t1o05,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 2 },
      { affinity: "continuum", amount: 1 },
    ],
    requirement: "1 Tier I Abyss Fabrication Tool",
    flavor: `${ARTIFACT_CANON.t1o05.functionalText} ${ARTIFACT_CANON.t1o05.mystery}`,
    artifactForm: ARTIFACT_CANON.t1o05.forms.join(" / "),
    blueprintRole: ARTIFACT_CANON.t1o05.practicalCapability,
    blueprintFamilies: "Mantle-to-Orbit Foundry",
    civilizationLane: ARTIFACT_CANON.t1o05.civLane,
    engineeringScale: ARTIFACT_CANON.t1o05.engineeringScale,
    hotspot: { left: "51%", top: "20%" },
  },
] as const satisfies readonly HorizontalBlueprintComponentRecord[];

const definition = {
  name: "Mantle-to-Orbit Foundry",
  publicEffect:
    "Gain 1 Eminence. Twice, Foundry Forge a face-up Tier II Artifact with each nonzero printed natural Affinity cost reduced by 1. Then Overdrive may repeat the discount and seal this Project's components.",
  presentation: {
    scaleLabel: "Planetary",
    serialCode: "BP-MO-01",
    manifestationScale: "planetary",
  },
  components: [
    { artifactId: "t1r07", stage: "Thermal Baffle", function: "Routes mantle heat and decay into useful work before either can destroy the ascent chambers." },
    { artifactId: "t1s02", stage: "Mantlelift Coil", function: "Accelerates sealed feedstock capsules from the deep crust into stable orbit along a timed induction line." },
    { artifactId: "t1o05", stage: "Vacuum Forge Die", function: "Forms lifted feedstock into precise orbital structures without atmosphere, convection, or contaminating vapor." },
  ],
} as const;

export function MantleToOrbitBlueprintCard({
  state = "assembling",
  matchedSockets = 2,
  matchedComponentIds,
  publicStateLabel = "Ready",
  knownComponentIds,
}: MantleToOrbitBlueprintCardProps) {
  return (
    <HorizontalBlueprintCard
      definition={definition}
      state={state}
      matchedComponents={matchedSockets}
      matchedComponentIds={matchedComponentIds}
      artwork={mantleToOrbitFoundryArtwork}
      artworkAlt="The Mantle-to-Orbit Foundry connecting a planetary mantle furnace to an orbital fabrication ring"
      category="Ascension Industry"
      publicStateLabel={publicStateLabel}
      publicLabel="Public Foundry"
      components={components}
      knownComponentIds={knownComponentIds}
      testId="mantle-to-orbit-blueprint-card"
      componentPanelTestId="mantle-to-orbit-component-panel"
      tone="industry"
      secondaryRule={{
        label: "Foundry Seal",
        text: "Overdrive completes the Forge, archives all three components, and seals them in Foundry storage. Intact Covenant: paid re-Forge; the Foundry remains Spent. Broken Covenant: free recovery; restoring all three returns it Ready with 0 sustainable uses. Foundry storage does not consume ordinary Encryption capacity.",
      }}
      secondaryRulePlacement="back"
    />
  );
}
