import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  TutorialSemanticText,
  tokenizeTutorialSemanticText,
} from "./TutorialSemanticText";

describe("TutorialSemanticText", () => {
  it("preserves the authored sentence while styling Affinity quantities", () => {
    const text = "Replication Spore gives your civilization +1 Verdance.";
    const { container } = render(
      <TutorialSemanticText
        text={text}
        beatId="b9b_forge_complete"
        lineIndex={0}
      />,
    );

    expect(container.textContent).toBe(text);
    const value = container.querySelector('[data-semantic-id="value:+1:verdance"]');
    expect(value).toHaveAttribute("data-introduction", "true");
    expect(value).toHaveClass("tutorial-semantic-term--value");
    expect(value?.querySelector("img")).not.toBeNull();
    expect(value?.querySelector(".tutorial-semantic-term__emblem")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("gives the cost comparison two ordered semantic values", () => {
    const text = "Therefore, if an Artifact used to cost 3 Verdance, it now only costs 2.";
    const { container } = render(
      <TutorialSemanticText
        text={text}
        beatId="b9b_forge_complete"
        lineIndex={2}
      />,
    );

    const originalCost = container.querySelector('[data-semantic-id="value:3:verdance"]');
    expect(originalCost).toHaveAttribute(
      "data-introduction",
      "true",
    );
    expect(originalCost).toHaveAttribute("aria-label", "3 Verdance");
    expect(originalCost).toHaveTextContent("3");
    expect(originalCost).not.toHaveTextContent("Verdance");
    expect(originalCost?.querySelector("img")).not.toBeNull();
    const reducedCost = container.querySelector('[data-semantic-id="value:2"]');
    expect(reducedCost).toHaveAttribute(
      "data-introduction",
      "true",
    );
    expect(reducedCost).toHaveAttribute("aria-label", "2 Verdance");
    expect(reducedCost?.querySelector("img")).not.toBeNull();
  });

  it("uses a distinct first-use treatment for Encryption and Singularity", () => {
    const encryption = render(
      <TutorialSemanticText
        text="The second option is called Encryption."
        beatId="b10_encrypt_principle"
        lineIndex={0}
      />,
    );
    const encryptionTerm = encryption.container.querySelector(
      '[data-semantic-id="mechanic:encryption"]',
    );
    expect(encryptionTerm).toHaveClass("tutorial-semantic-term--encryption");
    expect(encryptionTerm).toHaveAttribute("data-introduction", "true");
    encryption.unmount();

    const singularity = render(
      <TutorialSemanticText
        text="Encrypted Artifacts are stored behind the Singularity cell."
        beatId="b10b_reserve_granted"
        lineIndex={0}
      />,
    );
    const singularityTerm = singularity.container.querySelector(
      '[data-semantic-id="affinity:singularity"]',
    );
    expect(singularityTerm).toHaveClass("tutorial-semantic-term--singularity");
    expect(singularityTerm).toHaveAttribute("data-introduction", "true");
  });

  it("keeps later mentions styled without replaying their introduction", () => {
    const { container } = render(
      <TutorialSemanticText
        text="You can gather what it needs and Forge it."
        beatId="b9c_transition"
        lineIndex={1}
      />,
    );

    const forge = container.querySelector('[data-semantic-id="mechanic:forge"]');
    expect(forge).toHaveClass("tutorial-semantic-term--mechanic");
    expect(forge).not.toHaveAttribute("data-introduction");
  });

  it("can suppress kinetic introductions without removing semantic styling", () => {
    const { container } = render(
      <TutorialSemanticText
        text="Hello, Architect."
        beatId="b2_lumii_intro"
        lineIndex={1}
        animateIntroductions={false}
      />,
    );

    const architect = container.querySelector('[data-semantic-id="role:architect"]');
    expect(architect).toHaveClass("tutorial-semantic-term--role");
    expect(architect).not.toHaveAttribute("data-introduction");
  });

  it("tokenizes Artifact possessives without changing visible copy", () => {
    const text = "An Artifact's cost shows which Affinities must be held in readiness.";
    const parts = tokenizeTutorialSemanticText(text);

    expect(parts.map((part) => part.text).join("")).toBe(text);
    expect(parts.find((part) => part.token?.semanticId === "concept:artifact")?.text).toBe(
      "Artifact",
    );
    expect(parts.find((part) => part.token?.semanticId === "concept:affinity")?.text).toBe(
      "Affinities",
    );
  });
});
