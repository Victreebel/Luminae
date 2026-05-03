// Central mapping for the 6 cosmic resources.
// Internal data keys (ruby, sapphire, etc.) are kept stable so the game engine,
// database, and AI logic don't need to change. The UI displays cosmic names,
// matching the Cosmic Affinity art reference.

import gemRadiance from "@assets/generated_images/gem_radiance.png";
import gemFlare from "@assets/generated_images/gem_flare.png";
import gemContinuum from "@assets/generated_images/gem_continuum.png";
import gemVerdance from "@assets/generated_images/gem_verdance.png";
import gemAbyss from "@assets/generated_images/gem_abyss.png";
import gemSingularity from "@assets/generated_images/gem_singularity.png";

export type GemKey = "ruby" | "sapphire" | "emerald" | "onyx" | "pearl" | "flux";

export interface GemMeta {
  key: GemKey;
  name: string;
  shortName: string;
  hex: string;
  glowHex: string;
  image: string;
  tagline: string;
}

export const GEM_META: Record<GemKey, GemMeta> = {
  pearl: {
    key: "pearl",
    name: "Radiance",
    shortName: "Radiance",
    hex: "#F2F5FF",
    glowHex: "#A8B8E8",
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
    hex: "#7B1FA2",
    glowHex: "#B14FD8",
    image: gemAbyss,
    tagline: "Void \u00b7 Gravity",
  },
  flux: {
    key: "flux",
    name: "Singularity",
    shortName: "Singularity",
    hex: "#FFC43D",
    glowHex: "#FFE08A",
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
