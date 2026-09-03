import entropyPyreBaffleArtwork from "@/assets/cards/runtime/t1r07.webp";
import mantleliftDriverCoilArtwork from "@/assets/cards/runtime/t1s02.webp";
import blackglassForgeDieArtwork from "@/assets/cards/runtime/t1o05.webp";
import mantleToOrbitFoundryArtwork from "@/assets/blueprints/mantle-to-orbit/mantle-to-orbit-foundry-card.webp";
import {
  HorizontalBlueprintCard,
  type HorizontalBlueprintComponentRecord,
} from "./HorizontalBlueprintCard";

export type MantleToOrbitBlueprintState = "assembling" | "manifested";

type MantleToOrbitBlueprintCardProps = {
  state?: MantleToOrbitBlueprintState;
  matchedSockets?: number;
};

const components = [
  {
    artifactId: "t1r07",
    artifactName: "Entropy Pyre Baffle",
    affinity: "flare",
    artwork: entropyPyreBaffleArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "verdance", amount: 2 },
      { affinity: "abyss", amount: 2 },
    ],
    requirement: "1 Tier I Flare Thermal-Control Component",
    flavor:
      "Waste heat has a destination before it has a catastrophe. Industrial installations ring themselves with baffles that route entropy into useful work before it teaches the city how to die.",
    artifactForm: "Containment / Thermal Control",
    blueprintRole: "Waste heat and decay routing",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Worldshield Covenant",
    civilizationLane: "Entropy-tolerant industrial culture",
    engineeringScale: "Planetary",
    hotspot: { left: "66%", top: "81%" },
  },
  {
    artifactId: "t1s02",
    artifactName: "Mantlelift Driver Coil",
    affinity: "continuum",
    artwork: mantleliftDriverCoilArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 2 },
      { affinity: "verdance", amount: 1 },
    ],
    requirement: "1 Tier I Continuum Transit Component",
    flavor:
      "Each coil is one link in the ascent line, but its timing must agree with every link above it. Once mass moves upward cheaply, orbit becomes a place of manufacture rather than visitation.",
    artifactForm: "Transit Component / Power Component",
    blueprintRole: "Planetary-to-orbit mass acceleration",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Arkseed Migration Fleet precursor",
    civilizationLane: "Orbital logistics civilization",
    engineeringScale: "Planetary",
    hotspot: { left: "50%", top: "52%" },
  },
  {
    artifactId: "t1o05",
    artifactName: "Blackglass Forge Die",
    affinity: "abyss",
    artwork: blackglassForgeDieArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 2 },
      { affinity: "continuum", amount: 1 },
    ],
    requirement: "1 Tier I Abyss Fabrication Tool",
    flavor:
      "Blackglass holds its geometry in vacuum, swallowing stray radiation while imprinting feedstock with surfaces precise enough for orbital assembly.",
    artifactForm: "Fabrication Tool / Material",
    blueprintRole: "Vacuum-stable precision forming",
    blueprintFamilies: "Mantle-to-Orbit Foundry; Galactic Relic Forge precursor",
    civilizationLane: "Vacuum manufacturing civilization",
    engineeringScale: "Planetary",
    hotspot: { left: "51%", top: "20%" },
  },
] as const satisfies readonly HorizontalBlueprintComponentRecord[];

export function MantleToOrbitBlueprintCard({
  state = "assembling",
  matchedSockets = 2,
}: MantleToOrbitBlueprintCardProps) {
  return (
    <HorizontalBlueprintCard
      blueprintId="bp_mantle_to_orbit_foundry"
      state={state}
      matchedComponents={matchedSockets}
      artwork={mantleToOrbitFoundryArtwork}
      artworkAlt="The Mantle-to-Orbit Foundry connecting a planetary mantle furnace to an orbital fabrication ring"
      category="Ascension Industry"
      publicStateLabel="Ready"
      publicLabel="Public Foundry"
      components={components}
      testId="mantle-to-orbit-blueprint-card"
      componentPanelTestId="mantle-to-orbit-component-panel"
      tone="industry"
    />
  );
}
