import { describe, expect, it } from "vitest";
import {
  getTutorialSoundMoment,
  TUTORIAL_ASSEMBLY_SOUND_TIMING,
} from "../tutorialAudio";

describe("tutorial sound map", () => {
  it("anchors narrative cues to semantic beat IDs and sentence indices", () => {
    expect(getTutorialSoundMoment("b0_contact", 0)?.cue).toBe("lumii-contact");
    expect(getTutorialSoundMoment("b5_universe_concession", 0)).toMatchObject({
      cue: "lumii-presence",
      delayMs: 80,
    });
    expect(getTutorialSoundMoment("b5_luminae_interface", 0)?.cue).toBe("interface-reveal");
    expect(getTutorialSoundMoment("b10_encrypt_principle", 0)?.cue).toBe("encryption-principle");
    expect(getTutorialSoundMoment("b15b_luminary_signal", 0)?.cue).toBe("luminary-signal");
  });

  it("places causal accents on the sentence that explains the consequence", () => {
    expect(getTutorialSoundMoment("b9b_forge_complete", 0)).toMatchObject({
      cue: "permanent-capability",
      affinity: "verdance",
    });
    expect(getTutorialSoundMoment("b14_win_condition", 0)).toBeNull();
    expect(getTutorialSoundMoment("b14_win_condition", 1)?.cue).toBe("eminence-threshold");
  });

  it("keeps interface assembly audio on its visual phases instead of a dialogue line", () => {
    expect(getTutorialSoundMoment("b5c_architect_assembly", 0)).toBeNull();
    expect(TUTORIAL_ASSEMBLY_SOUND_TIMING.full).toEqual({
      interfaceMs: 280,
      wellMs: 2_700,
    });
    expect(TUTORIAL_ASSEMBLY_SOUND_TIMING.reduced.wellMs).toBeGreaterThan(
      TUTORIAL_ASSEMBLY_SOUND_TIMING.reduced.interfaceMs,
    );
  });

  it("leaves ordinary connective dialogue silent", () => {
    expect(getTutorialSoundMoment("b3_architect", 1)).toBeNull();
    expect(getTutorialSoundMoment("b5a2_luminae_reassurance", 0)).toBeNull();
    expect(getTutorialSoundMoment("unknown", 0)).toBeNull();
  });
});
