import echoSplinterArtwork from "@/assets/cards/runtime/t1s01.webp";
import entropyVeilArtwork from "@/assets/cards/runtime/t1o01.webp";
import livingLatticeNodeArtwork from "@/assets/cards/runtime/t1p06.webp";
import worldshieldCovenantArtwork from "@/assets/blueprints/worldshield/worldshield-covenant-card.webp";
import {
  HorizontalBlueprintCard,
  type HorizontalBlueprintComponentRecord,
} from "./HorizontalBlueprintCard";

export type WorldshieldBlueprintState = "assembling" | "manifested";

type WorldshieldBlueprintCardProps = {
  state?: WorldshieldBlueprintState;
  matchedSockets?: number;
};

const components = [
  {
    artifactId: "t1s01",
    artifactName: "Echo Splinter",
    affinity: "continuum",
    artwork: echoSplinterArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 1 },
      { affinity: "verdance", amount: 1 },
      { affinity: "radiance", amount: 1 },
    ],
    requirement: "1 Tier I Continuum Early-Warning Instrument",
    flavor:
      "A crystal splinter that hears a structure fail moments before it breaks. Each warning sounds faintly like a voice.",
    artifactForm: "Archive / Sensor",
    blueprintRole: "Pre-failure event detection",
    blueprintFamilies: "Spiral-Arm Archive precursor; Worldshield Covenant",
    civilizationLane: "Planetary memory culture",
    engineeringScale: "Planetary",
    hotspot: { left: "80%", top: "24%" },
  },
  {
    artifactId: "t1o01",
    artifactName: "Entropy Veil",
    affinity: "abyss",
    artwork: entropyVeilArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "continuum", amount: 1 },
      { affinity: "verdance", amount: 1 },
      { affinity: "radiance", amount: 1 },
    ],
    requirement: "1 Tier I Abyss Concealment Defense",
    flavor:
      "The veil hides the heat of failing machines until repairs arrive. Used too long, it also hides the failure from its owners.",
    artifactForm: "Defense / Shielding",
    blueprintRole: "Controlled decay masking",
    blueprintFamilies: "Worldshield Covenant; Heliopause Bastion precursor",
    civilizationLane: "Hidden-survival civilization",
    engineeringScale: "Planetary",
    hotspot: { left: "52%", top: "48%" },
  },
  {
    artifactId: "t1p06",
    artifactName: "Living Lattice Node",
    affinity: "radiance",
    artwork: livingLatticeNodeArtwork,
    tier: "Tier I",
    eminence: 0,
    cost: [
      { affinity: "flare", amount: 1 },
      { affinity: "verdance", amount: 1 },
      { affinity: "radiance", amount: 2 },
    ],
    requirement: "1 Tier I Radiance Civic-Repair Node",
    flavor:
      "A living junction that lets buildings coordinate their own repair. Unused nodes sometimes begin healing nearby ruins.",
    artifactForm: "Biotech Module / Civic Signal",
    blueprintRole: "Distributed civic repair and claim restoration",
    blueprintFamilies: "Worldshield Covenant; Ecumenopolis Lattice",
    civilizationLane: "Dense civic ecology",
    engineeringScale: "Planetary",
    hotspot: { left: "29%", top: "72%" },
  },
] as const satisfies readonly HorizontalBlueprintComponentRecord[];

export function WorldshieldBlueprintCard({
  state = "assembling",
  matchedSockets = 0,
}: WorldshieldBlueprintCardProps) {
  return (
    <HorizontalBlueprintCard
      blueprintId="bp_worldshield_covenant"
      state={state}
      matchedComponents={matchedSockets}
      artwork={worldshieldCovenantArtwork}
      artworkAlt="The Worldshield Covenant spanning an inhabited planet as it intercepts a hostile strike"
      category="Planetary Covenant"
      publicStateLabel="Vigilant"
      publicLabel="Public Worldshield"
      components={components}
      testId="worldshield-blueprint-card"
      componentPanelTestId="worldshield-component-panel"
      tone="covenant"
    />
  );
}
