// Central mapping for the 6 cosmic resources.
// Internal data keys (ruby, sapphire, etc.) are kept stable so the game engine,
// database, and AI logic don't need to change. The UI displays cosmic names,
// matching the Cosmic Affinity art reference.

import gemRadiance from "@assets/luminae_radiance_emblem_v1.png";
import gemFlare from "@assets/generated_images/gem_flare.png";
import gemContinuum from "@assets/generated_images/gem_continuum.png";
import gemVerdance from "@assets/generated_images/gem_verdance.png";
import gemAbyss from "@assets/generated_images/gem_abyss.png";
import gemSingularity from "@assets/luminae_singularity_emblem_v1.png";

export type GemKey = "ruby" | "sapphire" | "emerald" | "onyx" | "pearl" | "flux";

export interface GemMeta {
  key: GemKey;
  name: string;
  shortName: string;
  hex: string;
  glowHex: string;
  image: string;
  tagline: string;
  /** Optional CSS filter applied to the base image pixels before any glow/shadow. */
  imageFilter?: string;
}

export const GEM_META: Record<GemKey, GemMeta> = {
  pearl: {
    key: "pearl",
    name: "Radiance",
    shortName: "Radiance",
    hex: "#DFC878",
    glowHex: "#F5E8B8",
    image: gemRadiance,
    tagline: "Clarity \u00b7 Protection",
  },
  ruby: {
    key: "ruby",
    name: "Flare",
    shortName: "Flare",
    hex: "#FF5A3C",
    glowHex: "#FF8A6A",
    image: gemFlare,
    tagline: "Energy \u00b7 Passion",
  },
  sapphire: {
    key: "sapphire",
    name: "Continuum",
    shortName: "Continuum",
    hex: "#3D6BFF",
    glowHex: "#7090FF",
    image: gemContinuum,
    tagline: "Time \u00b7 Order",
  },
  emerald: {
    key: "emerald",
    name: "Verdance",
    shortName: "Verdance",
    hex: "#2ECC71",
    glowHex: "#5BE197",
    image: gemVerdance,
    tagline: "Life \u00b7 Growth",
  },
  onyx: {
    key: "onyx",
    name: "Abyss",
    shortName: "Abyss",
    hex: "#A832D4",
    glowHex: "#CC70F0",
    image: gemAbyss,
    tagline: "Void \u00b7 Gravity",
  },
  flux: {
    key: "flux",
    name: "Singularity",
    shortName: "Singularity",
    hex: "#E8E4FF",
    glowHex: "#C8C0FF",
    image: gemSingularity,
    tagline: "Wild \u00b7 Rare",
  },
};

// Display order: Radiance, Flare, Continuum, Verdance, Abyss, Singularity
export const GEM_KEYS: GemKey[] = [
  "pearl",
  "ruby",
  "sapphire",
  "emerald",
  "onyx",
  "flux",
];
