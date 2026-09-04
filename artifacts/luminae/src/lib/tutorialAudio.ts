import type { AffinityKey } from "@workspace/game-types";

export type TutorialSoundCue =
  | "lumii-contact"
  | "lumii-locate"
  | "lumii-presence"
  | "interface-reveal"
  | "archive-memory"
  | "affinity-introduction"
  | "affinity-reveal"
  | "simulation-open"
  | "well-infusion"
  | "forge-reveal"
  | "focus"
  | "permanent-capability"
  | "signature-imprint"
  | "signature-interference"
  | "encryption-principle"
  | "eminence-threshold"
  | "time-skip"
  | "luminary-signal"
  | "choice-presented";

export interface TutorialSoundMoment {
  cue: TutorialSoundCue;
  affinity?: AffinityKey;
  delayMs?: number;
}

export const TUTORIAL_ASSEMBLY_SOUND_TIMING = {
  full: {
    interfaceMs: 280,
    wellMs: 2_700,
  },
  reduced: {
    interfaceMs: 0,
    wellMs: 120,
  },
} as const;

/**
 * Stable narrative sound points keyed by authored beat ID and sentence index.
 * Mechanical actions keep their production SFX; this map supplies only the
 * story and doctrine beats that would otherwise arrive in silence.
 */
const TUTORIAL_SOUND_MOMENTS = {
  "b0_contact:0": { cue: "lumii-contact", delayMs: 120 },
  "b1_locate:0": { cue: "lumii-locate", delayMs: 520 },
  "b2_lumii_intro:0": { cue: "lumii-presence", delayMs: 100 },
  "b5_luminae_interface:0": { cue: "interface-reveal", delayMs: 120 },
  "b5a_luminae_origin:0": { cue: "archive-memory", delayMs: 100 },
  "b5_affinities:0": { cue: "affinity-introduction", delayMs: 180 },
  "b6_forge_appears:0": { cue: "forge-reveal", delayMs: 220 },
  "b7_artifact_cost:0": { cue: "focus", delayMs: 160 },
  "b9b_forge_complete:0": {
    cue: "permanent-capability",
    affinity: "verdance",
    delayMs: 120,
  },
  "b9d_signature:0": { cue: "signature-imprint", delayMs: 100 },
  "b9e_interference:0": { cue: "signature-interference", delayMs: 100 },
  "b10_encrypt_principle:0": { cue: "encryption-principle", delayMs: 120 },
  "b14_win_condition:1": { cue: "eminence-threshold", delayMs: 100 },
  "b15_fast_forward:0": { cue: "time-skip", delayMs: 120 },
  "b15b_luminary_signal:0": { cue: "luminary-signal", delayMs: 120 },
} as const satisfies Record<string, TutorialSoundMoment>;

export function getTutorialSoundMoment(
  beatId: string,
  dialogueLine: number,
): TutorialSoundMoment | null {
  return TUTORIAL_SOUND_MOMENTS[`${beatId}:${dialogueLine}` as keyof typeof TUTORIAL_SOUND_MOMENTS]
    ?? null;
}
