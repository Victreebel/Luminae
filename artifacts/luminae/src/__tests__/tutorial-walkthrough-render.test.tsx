import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TutorialDirector } from "@/components/tutorial/TutorialDirector";

const audioSpies = vi.hoisted(() => ({
  playAffinityDelivery: vi.fn(),
  playAffinitySelected: vi.fn(),
  playHarnessLand: vi.fn(),
  playLuminaryEligibility: vi.fn(),
  playOpponentTurnStart: vi.fn(),
}));

vi.mock("@/contexts/AccountContext", () => ({
  useAccount: () => ({ account: null, token: null, isLoading: false }),
}));

vi.mock("@/lib/audio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audio")>();
  return {
    ...actual,
    gameAudio: new Proxy({}, {
      get: (_target, property) => {
        if (property === "isMuted") return () => true;
        if (property in audioSpies) return audioSpies[property as keyof typeof audioSpies];
        return () => undefined;
      },
    }),
  };
});

function mediaQueryMatches(query: string): boolean {
  if (query.includes("prefers-reduced-motion")) return true;
  return query.split(",").some((candidate) => {
    const part = candidate.trim();
    const maxWidth = part.match(/max-width:\s*(\d+)px/);
    const minWidth = part.match(/min-width:\s*(\d+)px/);
    const maxHeight = part.match(/max-height:\s*(\d+)px/);
    const minHeight = part.match(/min-height:\s*(\d+)px/);
    if (maxWidth && window.innerWidth > Number(maxWidth[1])) return false;
    if (minWidth && window.innerWidth < Number(minWidth[1])) return false;
    if (maxHeight && window.innerHeight > Number(maxHeight[1])) return false;
    if (minHeight && window.innerHeight < Number(minHeight[1])) return false;
    if (part.includes("orientation: landscape") && window.innerWidth <= window.innerHeight) return false;
    if (part.includes("orientation: portrait") && window.innerWidth > window.innerHeight) return false;
    return true;
  });
}

async function expectBeat(id: string): Promise<HTMLElement> {
  let beat: HTMLElement | null = null;
  await waitFor(() => {
    beat = document.querySelector<HTMLElement>(`[data-tutorial-beat="${id}"]`);
    expect(beat).toBeInTheDocument();
  }, { timeout: 3_000 });
  return beat!;
}

async function clickDialogue(text: string) {
  const line = await screen.findByText((_content, element) => (
    element?.classList.contains("tutorial-dialogue-text") === true
    && element.textContent === text
  ), {}, { timeout: 3_000 });
  const card = line.closest<HTMLElement>(".tutorial-dialogue-card");
  expect(card).toBeTruthy();
  fireEvent.click(card!);
}

async function chooseButton(name: string | RegExp) {
  const button = await screen.findByRole("button", { name }, { timeout: 3_000 });
  fireEvent.click(button);
}

beforeEach(() => {
  localStorage.clear();
  Object.values(audioSpies).forEach(spy => spy.mockClear());
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 568 });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: mediaQueryMatches(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => null),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

describe("rendered tutorial walkthrough", () => {
  it("plays from first contact through explicit completion on a small phone", async () => {
    const { container } = render(<TutorialDirector startBeat={0} />);

    await expectBeat("b0_contact");
    await clickDialogue("Hello...");
    await chooseButton("Who's there?");

    await expectBeat("b1_locate");
    await expectBeat("b2_lumii_intro");
    await clickDialogue("There you are.");
    await clickDialogue("Hello, Architect.");
    await clickDialogue("My name is Lumii.");
    await chooseButton("Hold on... Architect??");

    await expectBeat("b3_architect");
    await clickDialogue("In my Universe, that is what we call those who have the power to shape cosmic society.");
    await clickDialogue("They determine what my people reach for, and what we become.");
    await chooseButton("So I'm in your universe now?");

    await expectBeat("b3c_border");
    await clickDialogue("Almost. You've been wandering along the border.");
    await chooseButton("Show me what lies beyond.");

    await expectBeat("b4_shatter");
    await expectBeat("b5_affinities");
    await clickDialogue("Welcome to LUMINAe.");
    await clickDialogue("Here, both the nature and technology of all life are determined by certain Affinities.");
    await clickDialogue("They are the elemental forces of existence - the energy behind everything you will build.");
    await clickDialogue("The five Affinities are...");

    const affinitySequence = await expectBeat("b5b_affinity_tokens");
    const sequenceTarget = (await within(affinitySequence).findByText("tap to continue")).parentElement;
    expect(sequenceTarget).toBeTruthy();
    for (let step = 0; step < 5; step += 1) fireEvent.click(sequenceTarget!);
    await waitFor(() => expect(audioSpies.playAffinitySelected).toHaveBeenCalledTimes(5));
    expect(audioSpies.playAffinitySelected.mock.calls.map(([affinity]) => affinity)).toEqual([
      "flare", "radiance", "verdance", "continuum", "abyss",
    ]);

    await expectBeat("b5c_architect_assembly");
    await clickDialogue("Let me show you how to use them.");

    await expectBeat("b6_forge_appears");
    await waitFor(() => expect(audioSpies.playHarnessLand).toHaveBeenCalledTimes(5));
    expect(audioSpies.playHarnessLand.mock.calls.map(([affinity]) => affinity)).toEqual([
      "flare", "radiance", "verdance", "continuum", "abyss",
    ]);
    await clickDialogue("In a match, the Forge holds 12 Artifacts across three tiers. Here, I'll reveal only the Artifact we're learning.");
    await clickDialogue("The Affinity Well shows what you hold and what remains for everyone.");
    await clickDialogue("I'll take the other seat and play gently. After each of your actions, watch what I do before your next turn.");

    await expectBeat("b6b_root_lattice");
    await clickDialogue("This is Replication Spore, your first Artifact.");

    await expectBeat("b7_artifact_cost");
    await clickDialogue("Read an Artifact in this order: cost at the base, the Affinity bonus it grants when Forged, then its Eminence.");
    await clickDialogue("Replication Spore costs 1 Flare, 1 Continuum, and 1 Radiance.");

    const firstHarness = await expectBeat("b8_first_harness");
    expect(firstHarness).toHaveAttribute("data-tutorial-camera", "static");
    expect(firstHarness).toHaveAttribute("data-tutorial-surface", "forge");
    expect(firstHarness.querySelectorAll("[data-lumii-presence]")).toHaveLength(1);
    expect(firstHarness.querySelector("img[alt='Lumii']")).toBeNull();
    expect(firstHarness.querySelector("[data-tutorial-pointer-zone='well']")).toBeTruthy();
    await clickDialogue("In the Well, the large number shows the Affinity tokens you can spend. After you Forge, a smaller +number shows permanent bonuses. The pips show what remains for everyone.");
    for (const affinity of ["flare", "continuum", "radiance"]) {
      const cell = firstHarness.querySelector<HTMLButtonElement>(`[data-affinity-well="${affinity}"]`);
      expect(cell).toBeEnabled();
      fireEvent.click(cell!);
    }
    fireEvent.click(within(firstHarness).getByTestId("harness-button"));

    const firstLumiiTurn = await expectBeat("b8a_lumii_harness_three");
    expect(firstLumiiTurn.querySelectorAll("[data-lumii-presence]")).toHaveLength(1);
    expect(firstLumiiTurn.querySelector("[data-tutorial-opponent-active='true']")).toBeTruthy();
    expect(firstLumiiTurn.querySelector("img[alt='Lumii']")).toBeNull();

    const firstForge = await expectBeat("b9_first_forge");
    await clickDialogue("You now hold exactly what Replication Spore costs.");
    fireEvent.click(within(firstForge).getByRole("button", { name: /Replication Spore, Tier 1 Artifact/ }));
    let actionSheet = await screen.findByRole("dialog", { name: "Artifact actions" });
    fireEvent.click(within(actionSheet).getByRole("button", { name: /^FORGE/i }));
    fireEvent.click(within(actionSheet).getByRole("button", { name: /^CONFIRM/i }));

    await expectBeat("b9a_lumii_harness_two");
    await expectBeat("b9b_forge_complete");
    const collection = await screen.findByRole("dialog", { name: "Your collection" }, { timeout: 3_000 });
    fireEvent.click(within(collection).getByRole("button", { name: "Close collection" }));
    expect(document.querySelector("[data-affinity-bonus='verdance']")).toHaveTextContent("+1");
    expect(document.querySelector("[data-tutorial-pointer-zone='verdance-bonus']")).toBeTruthy();
    await clickDialogue("See +1 beside Verdance in the Well. That is a permanent bonus, not a token: it is never spent.");
    await clickDialogue("It stays in your Civilization and automatically lowers every future Verdance cost by 1.");

    const reserveBeat = await expectBeat("b10_reserve");
    fireEvent.click(within(reserveBeat).getByRole("button", { name: /Root Memory Valve, Tier 1 Artifact/ }));
    actionSheet = await screen.findByRole("dialog", { name: "Artifact actions" });
    fireEvent.click(within(actionSheet).getByRole("button", { name: /^ENCRYPT/i }));
    fireEvent.click(within(actionSheet).getByRole("button", { name: /^CONFIRM/i }));

    await expectBeat("b10a_lumii_harness_three");
    await expectBeat("b10b_reserve_granted");
    await clickDialogue("There it is... The current answers you quickly.");
    await clickDialogue("When an Architect Encrypts an Artifact, the five Affinities converge around it. The resulting current is called Singularity.");
    await clickDialogue("The Artifact waits behind the Singularity cell for you alone. Singularity can cover any one missing Affinity.");
    await clickDialogue("Replication Spore lowers Root Memory Valve's 4 Verdance cost to 3. Harness 2 Verdance; Singularity will cover the last one.");

    const reservedForge = await expectBeat("b11_forge_reserved");
    const wrongTakeTwo = within(reservedForge).getByRole("button", { name: "Take 2 Continuum" });
    expect(wrongTakeTwo).toBeDisabled();
    fireEvent.click(wrongTakeTwo);
    expect(reservedForge).toHaveAttribute("data-tutorial-beat", "b11_forge_reserved");
    fireEvent.click(within(reservedForge).getByRole("button", { name: "Take 2 Verdance" }));
    fireEvent.click(within(reservedForge).getByTestId("harness-button"));

    await expectBeat("b11a_lumii_forge");
    await expectBeat("b11b_forge_reserved");
    const encryptedPanel = await screen.findByRole("region", { name: "Encrypted artifacts" }, { timeout: 3_000 });
    fireEvent.click(within(encryptedPanel).getByRole("button", { name: "Root Memory Valve, encrypted Artifact" }));
    actionSheet = await screen.findByRole("dialog", { name: "Artifact actions" });
    fireEvent.click(within(actionSheet).getByRole("button", { name: /^FORGE/i }));
    fireEvent.click(within(actionSheet).getByRole("button", { name: /^CONFIRM/i }));

    await expectBeat("b11c_lumii_harness_three");
    await expectBeat("b14_win_condition");
    expect(audioSpies.playOpponentTurnStart).toHaveBeenCalledTimes(5);
    await clickDialogue("Artifacts with Eminence advance your score. Reaching 15 triggers the final round so every civilization receives equal turns.");
    await clickDialogue("Build enough matching permanent Artifact bonuses and a Luminary can awaken. Let's jump ahead a few turns.");

    await expectBeat("b15_fast_forward");
    const luminarySignal = await expectBeat("b15b_luminary_signal");
    expect(audioSpies.playLuminaryEligibility).toHaveBeenCalledTimes(1);
    expect(luminarySignal).toHaveAttribute("data-tutorial-camera", "static");
    expect(luminarySignal).toHaveAttribute("data-tutorial-surface", "luminary");
    expect(luminarySignal.querySelector(".board-forge")).toHaveAttribute("hidden");
    await chooseButton("Let's forge it.");

    const finalForge = await expectBeat("b16_final_forge");
    expect(finalForge).toHaveAttribute("data-tutorial-surface", "forge");
    expect(finalForge.querySelector(".tutorial-secondary-board")).toHaveAttribute("hidden");
    await clickDialogue("I'll supply 4 Continuum. Your permanent bonus covers the fifth cost.");
    const finalCard = await within(finalForge).findByRole(
      "button",
      { name: /Epoch Graft Ledger, Tier 2 Artifact/ },
      { timeout: 3_000 },
    );
    await waitFor(() => expect(finalCard).toHaveAttribute("data-affordable", "true"));
    expect(audioSpies.playAffinityDelivery.mock.calls).toEqual([
      ["continuum", 0, 4],
      ["continuum", 1, 4],
      ["continuum", 2, 4],
      ["continuum", 3, 4],
    ]);
    fireEvent.click(finalCard);
    actionSheet = await screen.findByRole("dialog", { name: "Artifact actions" });
    fireEvent.click(within(actionSheet).getByRole("button", { name: /^FORGE/i }));
    fireEvent.click(within(actionSheet).getByRole("button", { name: /^CONFIRM/i }));

    await expectBeat("b17_luminary");
    await expectBeat("b18_victory");
    await clickDialogue("The Verdant Oracle answered your civilization.");
    await clickDialogue("Your four core actions are: take 3 different Affinities, take 2 of one Affinity, Forge an Artifact, and Encrypt an Artifact into private storage.");
    await clickDialogue("The Verdant Oracle grants 1 Eminence and immediately draws 1 Verdance from the Well.");
    await clickDialogue("Build matching bonuses to awaken Luminaries. After the final round, the civilization with the most Eminence wins.");
    await chooseButton("Complete first contact");

    expect(await screen.findByRole("button", { name: "Establish Architect Record" })).toBeEnabled();
    expect(container).toHaveTextContent("15 / 15 Eminence");
    expect(container).toHaveTextContent("Lumii 9");
    expect(container).toHaveTextContent("Tutorial complete");
  }, 30_000);
});
