/**
 * @workspace/game-types
 *
 * Shared game constants and types used by both the frontend (luminae) and the
 * backend (api-server).  Keeping them here ensures a single source of truth:
 * adding a new aura style in this file immediately produces TypeScript errors
 * in both packages if the LUMINARIES array or LUMINARY_VISUALS map does not
 * include a matching value.
 */

import type { ArtifactId, ArtifactTier, KardashevType, TechnologyLineage } from "./technology";

export * from "./technology";

/** Duration of the opening first-player selector and balance reveal. */
export const OPENING_TURN_ORDER_PRESENTATION_MS = 5200;

/** Starting Eminence used to offset the disadvantage of acting later. */
export function getTurnOrderEminenceCompensation(
  openingPosition: number,
  playerCount: number,
  victoryRequirement: number,
): number {
  if (openingPosition <= 0 || openingPosition >= playerCount) return 0;
  if (playerCount === 4 && openingPosition === 3 && victoryRequirement >= 20) return 2;
  return 1;
}

/**
 * Canonical set of Luminary ID string literals.  This is the authoritative
 * list — both the backend LuminaryDef interface and the frontend
 * LUMINARY_VISUALS map type their `id` field (and map key) as `LuminaryId`, so
 * an ID that is not in this list is a compile-time error in both packages.
 *
 * When adding a new Luminary:
 *   1. Add its ID here.
 *   2. Add a matching entry to LUMINARIES in gameEngine.ts.
 *   3. Add a matching entry to LUMINARY_VISUALS in luminaryAssets.tsx.
 *   4. TypeScript will flag every incomplete usage automatically.
 *
 * The lint:summon-colors script remains a secondary safety net that checks
 * summonColor / summonSecondaryColor / auraStyle values match at runtime; the
 * primary guard for ID correctness is this compile-time union type.
 */
export const LUMINARY_IDS = [
  "lum_ember",
  "lum_tide",
  "lum_verdant",
  "lum_void",
  "lum_radiant",
  "lum_astral",
  "lum_bloom",
  "lum_forge",
  "lum_compass",
  "lum_seed",
  "lum_orchard",
  "lum_pale",
  "lum_hunger",
  "lum_moth",
  "lum_null",
  "lum_oracle",
  "lum_scholar",
] as const;

export type LuminaryId = (typeof LUMINARY_IDS)[number];

/**
 * Canonical set of aura animation style keys recognised by the frontend aura
 * renderer.  This is the authoritative list — both the backend LuminaryDef
 * interface and the frontend LUMINARY_VISUALS map type their `auraStyle` field
 * as `AuraStyle`, so an unknown value is a compile-time error in both packages.
 *
 * When adding a new animation variant:
 *   1. Add its key here.
 *   2. Add a matching case to the aura renderer in luminaryAssets.tsx
 *      (AURA_VARIANTS record).
 *   3. TypeScript will flag every incomplete usage automatically.
 */
export const KNOWN_AURA_STYLES = [
  "fire",
  "tide",
  "verdant",
  "void",
  "radiant",
  "astral",
  "storm",
  "pale",
  "bloom",
  "compass",
  "oracle",
  "null",
  "distorted",
] as const;

export type AuraStyle = (typeof KNOWN_AURA_STYLES)[number];

/**
 * Canonical Luminae affinity vocabulary.
 *
 * The string values are stable transport/storage identifiers used by existing
 * games and clients. Application code should treat them as opaque keys and use
 * AFFINITY_NAMES whenever a player-facing name is needed.
 */
export const AFFINITY_KEYS = [
  "flare",
  "radiance",
  "verdance",
  "continuum",
  "abyss",
  "singularity",
] as const;

export type AffinityKey = (typeof AFFINITY_KEYS)[number];

export const NATURAL_AFFINITY_KEYS = [
  "flare",
  "radiance",
  "verdance",
  "continuum",
  "abyss",
] as const satisfies readonly AffinityKey[];

export type NaturalAffinityKey = (typeof NATURAL_AFFINITY_KEYS)[number];

/** @deprecated Use NATURAL_AFFINITY_KEYS. Retained for transport compatibility. */
export const STANDARD_AFFINITY_KEYS = NATURAL_AFFINITY_KEYS;

/** @deprecated Use NaturalAffinityKey. Retained for source compatibility. */
export type StandardAffinityKey = NaturalAffinityKey;

export type AffinityCounts = Record<AffinityKey, number>;

export const AFFINITY_NAMES: Record<AffinityKey, string> = {
  flare: "Flare",
  radiance: "Radiance",
  verdance: "Verdance",
  continuum: "Continuum",
  abyss: "Abyss",
  singularity: "Singularity",
};

export const BLUEPRINT_IDS = [
  "bp_antimatter_detonator",
  "bp_mantle_to_orbit_foundry",
  "bp_ascension_registry",
  "bp_worldshield_covenant",
] as const;

export type BlueprintId = (typeof BLUEPRINT_IDS)[number];

export const BLUEPRINT_PRESENTATION_VARIANTS = [
  "armored",
  "original",
  "asymmetric",
  "lattice",
] as const;

export type BlueprintPresentationVariant =
  (typeof BLUEPRINT_PRESENTATION_VARIANTS)[number];

export const GAME_MODES = [
  "standard",
  "campaign",
  "custom",
  "competitive",
] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const BLUEPRINT_POLICIES = [
  "none",
  "owned",
  "all",
  "seasonal",
  "scenario",
] as const;

export type BlueprintPolicy = (typeof BLUEPRINT_POLICIES)[number];

export const BLUEPRINT_CLEARANCE_STATUSES = [
  "classified",
  "challenge_ready",
  "challenge_active",
  "cleared",
] as const;

export type BlueprintClearanceStatus =
  (typeof BLUEPRINT_CLEARANCE_STATUSES)[number];

export const BLUEPRINT_CLEARANCE_REQUIRED_WINS = 5;

export const LUMII_THRESHOLD_APPROACHES = [
  "kinship",
  "inquiry",
  "dominion",
] as const;

export type LumiiThresholdApproach =
  (typeof LUMII_THRESHOLD_APPROACHES)[number];

export const LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS = [
  // Legacy response IDs remain accepted so an encounter saved by an older
  // client can resume at the equivalent authored beat.
  "kinship-want",
  "kinship-fear",
  "kinship-familiar",
  "kinship-with-you",
  "kinship-help",
  "kinship-grow",
  "inquiry-answer",
  "inquiry-warning",
  "inquiry-relation",
  "inquiry-unsayable",
  "inquiry-warning-against",
  "inquiry-preserve",
  "inquiry-risk",
  "inquiry-pattern",
  "dominion-decide",
  "dominion-cipher",
  "dominion-stand",
  "dominion-stop",
  // Canonical Threshold dialogue.
  "kinship-universe",
  "kinship-difference",
  "kinship-stop-why",
  "kinship-unafraid",
  "kinship-fear-change",
  "kinship-guide",
  "kinship-familiar-how",
  "kinship-light-why",
  "inquiry-demand-answer",
  "inquiry-demand-unsayable",
  "inquiry-meaning",
  "inquiry-warning-against-truth",
  "inquiry-preservation",
  "inquiry-sight",
  "inquiry-relation-pattern",
  "dominion-decision",
  "dominion-recognize",
  "dominion-cipher-authority",
  "dominion-refusal-authority",
  "dominion-choice-why",
  "dominion-choice-fear",
  "dominion-choice-enough",
  "dominion-command",
  "dominion-final-answer",
] as const;

export type LumiiThresholdDialogueChoiceId =
  (typeof LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS)[number];

export const LUMII_THRESHOLD_DIALOGUE_RESOLUTIONS = [
  "left",
  "continued",
] as const;

export type LumiiThresholdDialogueResolution =
  (typeof LUMII_THRESHOLD_DIALOGUE_RESOLUTIONS)[number];

export interface LumiiThresholdDialogueBranch {
  primaryChoiceId: LumiiThresholdDialogueChoiceId;
  followUpChoiceIds: readonly LumiiThresholdDialogueChoiceId[];
  requiresSecondaryBranch?: boolean;
}

/**
 * Structural source of truth for the Threshold exchange. Copy lives in the
 * client, but both client and server resolve progression through this graph.
 * A completed branch may optionally append one other primary question. The
 * first Inquiry branch deliberately requires one complete secondary branch so
 * curiosity, rather than an abrupt commitment, carries the player forward.
 */
export const LUMII_THRESHOLD_DIALOGUE_GRAPH = {
  kinship: [
    {
      primaryChoiceId: "kinship-universe",
      followUpChoiceIds: ["kinship-difference", "kinship-stop-why"],
    },
    {
      primaryChoiceId: "kinship-unafraid",
      followUpChoiceIds: ["kinship-fear-change"],
    },
    {
      primaryChoiceId: "kinship-guide",
      followUpChoiceIds: ["kinship-familiar-how", "kinship-light-why"],
    },
  ],
  inquiry: [
    {
      primaryChoiceId: "inquiry-demand-answer",
      followUpChoiceIds: ["inquiry-demand-unsayable"],
      requiresSecondaryBranch: true,
    },
    {
      primaryChoiceId: "inquiry-meaning",
      followUpChoiceIds: [
        "inquiry-warning-against-truth",
        "inquiry-preservation",
      ],
    },
    {
      primaryChoiceId: "inquiry-sight",
      followUpChoiceIds: ["inquiry-relation-pattern"],
    },
  ],
  dominion: [
    {
      primaryChoiceId: "dominion-decision",
      followUpChoiceIds: ["dominion-recognize"],
    },
    {
      primaryChoiceId: "dominion-cipher-authority",
      followUpChoiceIds: [
        "dominion-refusal-authority",
        "dominion-choice-why",
        "dominion-choice-fear",
        "dominion-choice-enough",
      ],
    },
    {
      primaryChoiceId: "dominion-command",
      followUpChoiceIds: ["dominion-final-answer"],
    },
  ],
} as const satisfies Record<
  LumiiThresholdApproach,
  readonly LumiiThresholdDialogueBranch[]
>;

function requiresSecondaryDialogueBranch(
  branch: LumiiThresholdDialogueBranch,
): boolean {
  return branch.requiresSecondaryBranch === true;
}

export const LUMII_THRESHOLD_MAX_DIALOGUE_PATH = Math.max(
  ...LUMII_THRESHOLD_APPROACHES.flatMap((approach) => {
    const branches = LUMII_THRESHOLD_DIALOGUE_GRAPH[approach];
    return branches.map((branch) => {
      const branchLength = 1 + branch.followUpChoiceIds.length;
      if (!requiresSecondaryDialogueBranch(branch)) return branchLength + 1;
      const longestSecondaryBranch = Math.max(
        ...branches
          .filter(
            (candidate) => candidate.primaryChoiceId !== branch.primaryChoiceId,
          )
          .map((candidate) => 1 + candidate.followUpChoiceIds.length),
      );
      return branchLength + longestSecondaryBranch;
    });
  }),
);

type LegacyDialoguePathMapping = {
  legacy: readonly LumiiThresholdDialogueChoiceId[];
  canonical: readonly LumiiThresholdDialogueChoiceId[];
};

const LUMII_THRESHOLD_LEGACY_PATH_MAPPINGS: Record<
  LumiiThresholdApproach,
  readonly LegacyDialoguePathMapping[]
> = {
  kinship: [
    { legacy: ["kinship-want"], canonical: ["kinship-universe"] },
    {
      legacy: ["kinship-want", "kinship-with-you"],
      canonical: ["kinship-universe", "kinship-difference"],
    },
    { legacy: ["kinship-fear"], canonical: ["kinship-unafraid"] },
    {
      legacy: ["kinship-fear", "kinship-help"],
      canonical: ["kinship-unafraid", "kinship-fear-change"],
    },
    { legacy: ["kinship-familiar"], canonical: ["kinship-guide"] },
    {
      legacy: ["kinship-familiar", "kinship-grow"],
      canonical: ["kinship-guide", "kinship-familiar-how"],
    },
  ],
  inquiry: [
    { legacy: ["inquiry-answer"], canonical: ["inquiry-demand-answer"] },
    {
      legacy: ["inquiry-answer", "inquiry-unsayable"],
      canonical: ["inquiry-demand-answer", "inquiry-demand-unsayable"],
    },
    { legacy: ["inquiry-warning"], canonical: ["inquiry-meaning"] },
    {
      legacy: ["inquiry-warning", "inquiry-warning-against"],
      canonical: ["inquiry-meaning", "inquiry-warning-against-truth"],
    },
    {
      legacy: ["inquiry-warning", "inquiry-warning-against", "inquiry-risk"],
      canonical: [
        "inquiry-meaning",
        "inquiry-warning-against-truth",
        "inquiry-preservation",
      ],
    },
    {
      legacy: [
        "inquiry-warning",
        "inquiry-warning-against",
        "inquiry-preserve",
      ],
      canonical: [
        "inquiry-meaning",
        "inquiry-warning-against-truth",
        "inquiry-preservation",
      ],
    },
    { legacy: ["inquiry-relation"], canonical: ["inquiry-sight"] },
    {
      legacy: ["inquiry-relation", "inquiry-pattern"],
      canonical: ["inquiry-sight", "inquiry-relation-pattern"],
    },
  ],
  dominion: [
    {
      legacy: ["dominion-decide"],
      canonical: ["dominion-decision", "dominion-recognize"],
    },
    {
      legacy: ["dominion-cipher"],
      canonical: ["dominion-cipher-authority", "dominion-refusal-authority"],
    },
    {
      legacy: ["dominion-stand"],
      canonical: ["dominion-command", "dominion-final-answer"],
    },
    {
      legacy: ["dominion-stand", "dominion-stop"],
      canonical: ["dominion-command", "dominion-final-answer"],
    },
  ],
};

function dialoguePathsEqual(
  left: readonly LumiiThresholdDialogueChoiceId[],
  right: readonly LumiiThresholdDialogueChoiceId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

export function canonicalizeLumiiThresholdDialoguePath(
  approach: LumiiThresholdApproach,
  path: readonly LumiiThresholdDialogueChoiceId[],
): LumiiThresholdDialogueChoiceId[] {
  const mapping = LUMII_THRESHOLD_LEGACY_PATH_MAPPINGS[approach].find(
    (candidate) => dialoguePathsEqual(candidate.legacy, path),
  );
  return [...(mapping?.canonical ?? path)];
}

export interface LumiiThresholdDialogueProgress {
  valid: boolean;
  challengeReady: boolean;
  canonicalPath: LumiiThresholdDialogueChoiceId[];
  primaryChoiceId: LumiiThresholdDialogueChoiceId | null;
  optionalChoiceId: LumiiThresholdDialogueChoiceId | null;
  nextChoiceIds: LumiiThresholdDialogueChoiceId[];
  optionalChoiceIds: LumiiThresholdDialogueChoiceId[];
}

export function resolveLumiiThresholdDialogueProgress(
  approach: LumiiThresholdApproach,
  path: readonly LumiiThresholdDialogueChoiceId[],
): LumiiThresholdDialogueProgress {
  const canonicalPath = canonicalizeLumiiThresholdDialoguePath(approach, path);
  const branches = LUMII_THRESHOLD_DIALOGUE_GRAPH[approach];
  const primaryChoiceIds = branches.map((branch) => branch.primaryChoiceId);
  const invalid = (): LumiiThresholdDialogueProgress => ({
    valid: false,
    challengeReady: false,
    canonicalPath,
    primaryChoiceId: null,
    optionalChoiceId: null,
    nextChoiceIds: [],
    optionalChoiceIds: [],
  });

  if (canonicalPath.length === 0) {
    return {
      valid: true,
      challengeReady: false,
      canonicalPath,
      primaryChoiceId: null,
      optionalChoiceId: null,
      nextChoiceIds: [...primaryChoiceIds],
      optionalChoiceIds: [],
    };
  }

  const branch = branches.find(
    (candidate) => candidate.primaryChoiceId === canonicalPath[0],
  );
  if (!branch) return invalid();
  const requiredPath: readonly LumiiThresholdDialogueChoiceId[] = [
    branch.primaryChoiceId,
    ...branch.followUpChoiceIds,
  ];
  const requiredLength = requiredPath.length;
  const comparedLength = Math.min(canonicalPath.length, requiredLength);
  for (let index = 0; index < comparedLength; index += 1) {
    if (canonicalPath[index] !== requiredPath[index]) return invalid();
  }

  if (canonicalPath.length < requiredLength) {
    return {
      valid: true,
      challengeReady: false,
      canonicalPath,
      primaryChoiceId: branch.primaryChoiceId,
      optionalChoiceId: null,
      nextChoiceIds: [requiredPath[canonicalPath.length]],
      optionalChoiceIds: [],
    };
  }

  const optionalChoiceIds: LumiiThresholdDialogueChoiceId[] =
    primaryChoiceIds.filter((choiceId) => choiceId !== branch.primaryChoiceId);
  if (canonicalPath.length === requiredLength) {
    return {
      valid: true,
      challengeReady: !requiresSecondaryDialogueBranch(branch),
      canonicalPath,
      primaryChoiceId: branch.primaryChoiceId,
      optionalChoiceId: null,
      nextChoiceIds: [],
      optionalChoiceIds,
    };
  }

  const optionalChoiceId = canonicalPath[requiredLength];
  if (!optionalChoiceId || !optionalChoiceIds.includes(optionalChoiceId)) {
    return invalid();
  }

  if (requiresSecondaryDialogueBranch(branch)) {
    const secondaryBranch = branches.find(
      (candidate) => candidate.primaryChoiceId === optionalChoiceId,
    );
    if (!secondaryBranch) return invalid();
    const secondaryPath: readonly LumiiThresholdDialogueChoiceId[] = [
      secondaryBranch.primaryChoiceId,
      ...secondaryBranch.followUpChoiceIds,
    ];
    const submittedSecondaryPath = canonicalPath.slice(requiredLength);
    const comparedSecondaryLength = Math.min(
      submittedSecondaryPath.length,
      secondaryPath.length,
    );
    for (let index = 0; index < comparedSecondaryLength; index += 1) {
      if (submittedSecondaryPath[index] !== secondaryPath[index])
        return invalid();
    }
    if (submittedSecondaryPath.length > secondaryPath.length) return invalid();
    if (submittedSecondaryPath.length < secondaryPath.length) {
      return {
        valid: true,
        challengeReady: false,
        canonicalPath,
        primaryChoiceId: branch.primaryChoiceId,
        optionalChoiceId: canonicalPath[canonicalPath.length - 1] ?? null,
        nextChoiceIds: [secondaryPath[submittedSecondaryPath.length]],
        optionalChoiceIds: [],
      };
    }
    return {
      valid: true,
      challengeReady: true,
      canonicalPath,
      primaryChoiceId: branch.primaryChoiceId,
      optionalChoiceId: canonicalPath[canonicalPath.length - 1] ?? null,
      nextChoiceIds: [],
      optionalChoiceIds: [],
    };
  }

  if (canonicalPath.length !== requiredLength + 1) return invalid();
  return {
    valid: true,
    challengeReady: true,
    canonicalPath,
    primaryChoiceId: branch.primaryChoiceId,
    optionalChoiceId,
    nextChoiceIds: [],
    optionalChoiceIds: [],
  };
}

export const PROJECT_SCALES = [
  "planetary",
  "stellar",
  "galactic",
  "transcendent",
] as const;

export type ProjectScale = (typeof PROJECT_SCALES)[number];

export const PROJECT_FORMS = [
  "device",
  "infrastructure",
  "network",
  "institution",
  "organism",
] as const;

export type ProjectForm = (typeof PROJECT_FORMS)[number];

export const COVENANT_STATES = ["intact", "broken"] as const;
export type CovenantState = (typeof COVENANT_STATES)[number];

export const TECHNOLOGY_RULE_TERMS = {
  forge: {
    label: "Forge",
    definition:
      "Complete a legal Artifact claim by paying its resolved Affinity cost, then place that implementation in the civilization's tableau and resolve its rewards.",
  },
  encrypt: {
    label: "Encrypt",
    definition:
      "Complete a legal Artifact claim by moving it to the civilization's private Encrypted pile and taking one available Singularity instead of implementing it.",
  },
  claim: {
    label: "Claim",
    definition:
      "A legal attempt to acquire a face-up Artifact through Forge, Encrypt, Assimilate, or another rule that explicitly counts as a claim.",
  },
  burn: {
    label: "Burn",
    definition:
      "Move an Artifact to the public Burn pile and refill its Forge position. Burn observers and return effects may respond to it.",
  },
  annihilate: {
    label: "Annihilate",
    definition:
      "Permanently remove an Artifact implementation to the public Annihilated zone. It is not Burned and cannot return through Burn recovery.",
  },
  nullify: {
    label: "Nullify",
    definition:
      "Suppress an Artifact's Eminence and Blueprint eligibility and prevent its Encryption while the Nullified marker remains; the Artifact itself is not removed.",
  },
  active: {
    label: "Active",
    definition:
      "The Manifested Project is public, operational, and may resolve its printed effect when its conditions are met.",
  },
  vigilant: {
    label: "Vigilant",
    definition:
      "The Manifested Project is public and waiting to intercept the next eligible hostile effect.",
  },
  spent: {
    label: "Spent",
    definition:
      "The Manifested Project remains public but can no longer resolve its effect unless another rule explicitly restores it.",
  },
  intact_covenant: {
    label: "Intact Covenant",
    definition:
      "The mode-authored safeguard is in force; a Project follows its bounded public rule and its intact use limit.",
  },
  broken_covenant: {
    label: "Broken Covenant",
    definition:
      "The mode-authored safeguard has been publicly withdrawn; a Project follows its declared Broken rule instead.",
  },
} as const;

export type TechnologyRuleTerm = keyof typeof TECHNOLOGY_RULE_TERMS;

export const PROJECT_RESOLUTION_TIMING = [
  "validate_claim",
  "consume_action",
  "resolve_project_interception",
  "resolve_payment_and_claim",
  "resolve_project_consequences",
  "queue_manifestations",
  "check_victory",
] as const;

export type ProjectResolutionStep = (typeof PROJECT_RESOLUTION_TIMING)[number];

export type ManifestedProjectState =
  | "armed"
  | "active"
  | "vigilant"
  | "spent"
  | "deactivated"
  | "recovering";

/** @deprecated Use ManifestedProjectState. */
export type BlueprintDeviceState = ManifestedProjectState;

export interface BlueprintComponentDefinition {
  artifactId: ArtifactId;
  stage: string;
  function: string;
}

export interface BlueprintPresentationMetadata {
  serialCode: string;
  scaleLabel: "Planetary" | "Stellar" | "Galactic" | "Transcendent";
  canonicalVariant: BlueprintPresentationVariant;
  manifestationTreatment: "dedicated" | "shared";
  detonationTreatment: "dedicated" | "none";
}

export interface BlueprintDefinition {
  id: BlueprintId;
  name: string;
  family: "catastrophe_engine" | "industrial_chain" | "institution" | "covenant";
  components: readonly BlueprintComponentDefinition[];
  publicEffect: string;
  brokenEffect: string;
  intactSafeguard: string;
  projectForm: ProjectForm;
  projectScale: ProjectScale;
  manifestationEminence: number;
  initialProjectState: ManifestedProjectState;
  /** @deprecated Use initialProjectState. */
  initialDeviceState: BlueprintDeviceState;
  competitiveApproved: boolean;
  presentation: BlueprintPresentationMetadata;
}

export const BLUEPRINT_DEFINITIONS: Record<BlueprintId, BlueprintDefinition> = {
  bp_antimatter_detonator: {
    id: "bp_antimatter_detonator",
    name: "Antimatter Detonator",
    family: "catastrophe_engine",
    components: [
      {
        artifactId: "t1r01",
        stage: "Reaction Core",
        function:
          "Supplies the controlled reaction mass and the first ignition event inside the containment field.",
      },
      {
        artifactId: "t1p04",
        stage: "Containment Cage",
        function:
          "Suspends matter and antimatter across a governed magnetic boundary until firing is authorized.",
      },
      {
        artifactId: "t1r04",
        stage: "Governed Trigger",
        function:
          "Orders the ignition sequence and prevents the reaction from beginning without a valid command.",
      },
      {
        artifactId: "t2o01",
        stage: "Annihilation Sink",
        function:
          "Draws the annihilation boundary away from the civilization and absorbs the reaction horizon.",
      },
    ],
    publicEffect:
      "A random Tier II Artifact becomes secretly marked. When Forged or Encrypted, Annihilate it. Gain 2 Eminence.",
    brokenEffect:
      "Annihilate 2 random eligible Tier I Artifacts belonging to the Forger as well.",
    intactSafeguard: "Contained yield",
    projectForm: "device",
    projectScale: "stellar",
    manifestationEminence: 0,
    initialProjectState: "armed",
    initialDeviceState: "armed",
    competitiveApproved: true,
    presentation: {
      serialCode: "BP-AD-01",
      scaleLabel: "Stellar",
      canonicalVariant: "armored",
      manifestationTreatment: "dedicated",
      detonationTreatment: "dedicated",
    },
  },
  bp_mantle_to_orbit_foundry: {
    id: "bp_mantle_to_orbit_foundry",
    name: "Mantle-to-Orbit Foundry",
    family: "industrial_chain",
    components: [
      {
        artifactId: "t1r07",
        stage: "Thermal Baffle",
        function:
          "Routes mantle heat and decay into useful work before either can destroy the ascent chambers.",
      },
      {
        artifactId: "t1s02",
        stage: "Mantlelift Coil",
        function:
          "Accelerates sealed feedstock capsules from the deep crust into stable orbit along a timed induction line.",
      },
      {
        artifactId: "t1o05",
        stage: "Vacuum Forge Die",
        function:
          "Forms lifted feedstock into precise orbital structures without atmosphere, convection, or contaminating vapor.",
      },
    ],
    publicEffect:
      "Gain 1 Eminence. Twice, use Foundry Forge on a Tier II Artifact to reduce each nonzero natural Affinity cost by 1. A third use Overdrives and deactivates the Foundry.",
    brokenEffect:
      "After Overdrive, place the three components in private recovery. Re-Forge each for free to reactivate the Foundry without gaining its manifestation reward again.",
    intactSafeguard: "Sustainable extraction limit",
    projectForm: "infrastructure",
    projectScale: "planetary",
    manifestationEminence: 1,
    initialProjectState: "active",
    initialDeviceState: "active",
    competitiveApproved: true,
    presentation: {
      serialCode: "BP-MO-01",
      scaleLabel: "Planetary",
      canonicalVariant: "armored",
      manifestationTreatment: "shared",
      detonationTreatment: "none",
    },
  },
  bp_ascension_registry: {
    id: "bp_ascension_registry",
    name: "Ascension Registry",
    family: "institution",
    components: [
      {
        artifactId: "t1p05",
        stage: "Readiness Verification",
        function:
          "Determines whether a civilization had a genuinely legal path to a Tier II claim when its turn began.",
      },
      {
        artifactId: "t1s03",
        stage: "Deferral Boundary",
        function:
          "Ends recursive delay and distinguishes deliberate refusal from technical impossibility.",
      },
      {
        artifactId: "t1r08",
        stage: "Public Record",
        function:
          "Binds each verified opportunity and judgment into a witnessed interstellar record.",
      },
    ],
    publicEffect:
      "When another civilization begins a turn with a legal Tier II claim but makes none, add 1 Deferral, at most once per round. Any Tier II claim clears Deferral. At 2, gain 2 Eminence and become Spent.",
    brokenEffect:
      "At 2 Deferral, gain 2 Eminence, clear Deferral, and remain Active.",
    intactSafeguard: "One-judgment limit",
    projectForm: "institution",
    projectScale: "stellar",
    manifestationEminence: 0,
    initialProjectState: "active",
    initialDeviceState: "active",
    competitiveApproved: false,
    presentation: {
      serialCode: "BP-AR-01",
      scaleLabel: "Stellar",
      canonicalVariant: "armored",
      manifestationTreatment: "shared",
      detonationTreatment: "none",
    },
  },
  bp_worldshield_covenant: {
    id: "bp_worldshield_covenant",
    name: "Worldshield Covenant",
    family: "covenant",
    components: [
      {
        artifactId: "t1s01",
        stage: "Early Warning",
        function:
          "Models the point where a hostile effect would interrupt a legal claim.",
      },
      {
        artifactId: "t1o01",
        stage: "Concealed Defense",
        function:
          "Hides the protected claim inside a controlled decay shadow until the hostile effect is spent.",
      },
      {
        artifactId: "t1p06",
        stage: "Civic Repair",
        function:
          "Restores the legal claim path after the hostile source has been expended.",
      },
    ],
    publicEffect:
      "Gain 1 Eminence. Prevent the first hostile effect that would Burn, Annihilate, Nullify, or cancel your legal Artifact claim, then become Spent.",
    brokenEffect:
      "Remain Vigilant after every interception instead of becoming Spent.",
    intactSafeguard: "Reciprocal one-use protection",
    projectForm: "network",
    projectScale: "planetary",
    manifestationEminence: 1,
    initialProjectState: "vigilant",
    initialDeviceState: "vigilant",
    competitiveApproved: false,
    presentation: {
      serialCode: "BP-WC-01",
      scaleLabel: "Planetary",
      canonicalVariant: "armored",
      manifestationTreatment: "shared",
      detonationTreatment: "none",
    },
  },
};

export interface BlueprintLoadout {
  mode: GameMode;
  slots: Array<BlueprintId | null>;
}

export interface BlueprintPrivateState {
  blueprintId: BlueprintId;
  slotIndex: number;
  matchedComponentIds: ArtifactId[];
  manifested: boolean;
  secretTargetCardId?: ArtifactId | null;
  safePreManifestActionPlayerIds?: string[];
  foundryRecoveryComponentIds?: ArtifactId[];
}

export interface ManifestedProjectPublicState {
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  slotIndex: number;
  state: ManifestedProjectState;
  covenantState: CovenantState;
  presentationVariant: BlueprintPresentationVariant;
  foundryUses?: number;
  foundryOverdriveAvailable?: boolean;
  foundryRecoveredComponentCount?: number;
  ascensionDeferral?: number;
  ascensionLastCounterRound?: number | null;
  /** @deprecated Compatibility with pre-v2 saves. */
  foundryTier2Ready?: boolean;
  /** @deprecated Compatibility with pre-v2 saves. */
  foundryTier3Ready?: boolean;
}

/** @deprecated Use ManifestedProjectPublicState. */
export type ManifestedDevicePublicState = ManifestedProjectPublicState;

export interface BlueprintManifestationEvent {
  eventId: string;
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  slotIndex: number;
  presentationVariant: BlueprintPresentationVariant;
  createdAt: number;
}

export interface BlueprintArtifactSnapshot {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  bonusAffinity: NaturalAffinityKey;
  cost: AffinityCounts;
  eminence: number;
  flavor: string;
}

export interface BlueprintDetonationEvent {
  eventId: string;
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  triggeringPlayerId: string;
  targetCardId: string;
  /** Forge mold refilled after the target leaves, formatted as `${tier}-${slotIndex}`. */
  targetSlotId?: string;
  trigger?: "forged" | "encrypted";
  hostileEffect?:
    | "burn"
    | "annihilation"
    | "nullification"
    | "claim_cancellation";
  targetArtifact?: BlueprintArtifactSnapshot;
  collateralCardIds?: string[];
  collateralArtifacts?: BlueprintArtifactSnapshot[];
  interceptedByBlueprintId?: BlueprintId;
  presentationVariant: BlueprintPresentationVariant;
  createdAt: number;
}

export type ScenarioProtocolId =
  | "sealed_protocol_01"
  | "sealed_protocol_02"
  | "sealed_protocol_03";

export interface ScenarioProtocolPublicState {
  protocolId: ScenarioProtocolId;
  ownerPlayerId: string;
  slotIndex: number;
  state: BlueprintDeviceState;
  publicEffect: string;
  foundryTier2Ready?: boolean;
  foundryTier3Ready?: boolean;
}

export interface ScenarioProtocolEvent {
  eventId: string;
  protocolId: ScenarioProtocolId;
  ownerPlayerId: string;
  slotIndex: number;
  kind: "manifestation" | "effect";
  publicEffect: string;
  triggeringPlayerId?: string;
  targetCardId?: string;
  trigger?: "forged" | "encrypted";
  hostileEffect?:
    | "burn"
    | "annihilation"
    | "nullification"
    | "claim_cancellation";
  targetArtifact?: BlueprintArtifactSnapshot;
  collateralCardIds?: string[];
  collateralArtifacts?: BlueprintArtifactSnapshot[];
  intercepted?: boolean;
  createdAt: number;
}

export type CosmeticSlot =
  | "card_back"
  | "civilization_ambience"
  | "blueprint_presentation"
  | "vault_seal";

export interface CosmeticLoadoutItem {
  slot: CosmeticSlot;
  scopeKey: string;
  itemId: string;
}

export interface BlueprintClearanceSummary {
  qualifyingWins: number;
  requiredWins: number;
  status: BlueprintClearanceStatus;
  challengeRoomId: string | null;
  cipherDeactivated: boolean;
  thresholdApproach: LumiiThresholdApproach | null;
  thresholdDialoguePath: LumiiThresholdDialogueChoiceId[];
  thresholdDialogueResolution: LumiiThresholdDialogueResolution | null;
  covenantBroken: boolean;
  decryptionKeyBypassActive: boolean;
  revealPending: boolean;
}

export type FirstContactStance = "curious" | "guarded" | "resolute";

export type CampaignNodeStatus =
  | "locked"
  | "available"
  | "active"
  | "completed"
  | "future";

export type CampaignPresentationKind = "clearance_signal" | "clearance_recap";

export interface CampaignPresentation {
  id: string;
  kind: CampaignPresentationKind;
  ordinal: number;
  title: string;
  lines: string[];
  acknowledgedAt: string | null;
}

export interface CampaignNodeSummary {
  id: string;
  title: string;
  status: CampaignNodeStatus;
  progress: number;
  requiredProgress: number;
}

export interface ArchitectRecordState {
  campaignId: "architect_record";
  tutorialCompleted: boolean;
  firstContactStance: FirstContactStance | null;
  nodes: CampaignNodeSummary[];
  presentations: CampaignPresentation[];
  pendingPresentations: CampaignPresentation[];
  vaultShortcutVisible: boolean;
}

export interface QualifyingMatchSession {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
  playerName: string;
  resumed: boolean;
}

export interface BlueprintVaultState {
  clearance: BlueprintClearanceSummary & { warningSeen: boolean };
  decryptionKeyAvailable: boolean;
  slotCount: number;
  competitiveEnabled: boolean;
  unlockedBlueprintIds: BlueprintId[];
  blueprints: BlueprintDefinition[];
  corruptedRecordCount: number | null;
  campaignNodes: Array<{
    id: string;
    blueprintId: BlueprintId;
    title: string;
    status: CampaignNodeStatus;
  }>;
  loadouts: BlueprintLoadout[];
  mastery: Array<{
    blueprintId: BlueprintId;
    manifestations: number;
    triggers: number;
    armedMatchFinishes: number;
  }>;
}

export interface BlueprintChallengeSession {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
  resumed: boolean;
  scenarioId: string;
  lumiiThresholdApproach: LumiiThresholdApproach;
  campaignAssistance: string;
}

export interface BlueprintVaultThresholdResult {
  ok: true;
  status: BlueprintClearanceStatus;
  cipherDeactivated: boolean;
  thresholdApproach: LumiiThresholdApproach | null;
  thresholdDialoguePath: LumiiThresholdDialogueChoiceId[];
  thresholdDialogueResolution: LumiiThresholdDialogueResolution | null;
  decryptionKeyBypassActive: boolean;
}

export interface BlueprintDecryptionKeyUseResult {
  ok: true;
  status: "challenge_ready";
  alreadyActive: boolean;
  decryptionKeyAvailable: false;
  decryptionKeyBypassActive: true;
}

export interface BlueprintChallengeWithdrawal {
  roomId: string;
  status: Extract<BlueprintClearanceStatus, "classified" | "challenge_ready">;
}

export interface AccountArchiveArtifact {
  id: ArtifactId;
  name: string;
  flavor: string;
  practicalCapability: string;
  mystery: string;
  forms: string[];
  tier: 1 | 2 | 3;
  bonusAffinity: NaturalAffinityKey;
  cost: AffinityCounts;
  eminence: number;
  forgeCount: number;
  lineage: TechnologyLineage;
  builtOn: AccountArchiveArtifactReference[];
  leadsToward: AccountArchiveArtifactReference[];
  projectLeads: AccountArchiveProjectLead[];
  blueprintEligibility: BlueprintId[];
}

export interface AccountArchiveArtifactReference {
  id: ArtifactId | null;
  name: string | null;
  tier: ArtifactTier;
  known: boolean;
}

export interface AccountArchiveProjectLead {
  name: string | null;
  priority: "primary" | "secondary";
  revealed: boolean;
}

export interface CivilizationIdentitySelection {
  lineage: TechnologyLineage | null;
  affinity: NaturalAffinityKey | null;
  signatureArtifactId: ArtifactId | null;
  signatureLuminaryId: LuminaryId | null;
  signatureBlueprintId: BlueprintId | null;
}

export interface CivilizationIdentitySummary extends CivilizationIdentitySelection {
  displayName: string | null;
  scaleType: KardashevType;
  scaleLabel: string;
  projectEpithet: string | null;
}

export interface CivilizationIdentityOptions {
  lineages: TechnologyLineage[];
  affinities: NaturalAffinityKey[];
  artifactIds: ArtifactId[];
  luminaryIds: LuminaryId[];
  blueprintIds: BlueprintId[];
}

export interface AccountArchiveLuminary {
  id: string;
  name: string;
  domain: string;
  eminence: number;
  flavor: string;
  effectName: string | null;
  effectDescription: string | null;
  summonColor: string;
  summonSecondaryColor: string;
  allianceCount: number;
}

export interface AccountArchiveSummary {
  artifacts: {
    discovered: AccountArchiveArtifact[];
    total: number;
    discoveredByTier: Record<1 | 2 | 3, number>;
    totalByTier: Record<1 | 2 | 3, number>;
  };
  luminaries: {
    encountered: AccountArchiveLuminary[];
    total: number;
  };
  identity: {
    totalForges: number;
    totalAlliances: number;
    signatureArtifactId: string | null;
    closestLuminaryId: string | null;
    selected: CivilizationIdentitySummary;
    suggested: CivilizationIdentitySelection;
    options: CivilizationIdentityOptions;
  };
  vault: {
    qualifyingWins: number;
    requiredWins: number;
    unlocked: boolean;
    status: BlueprintClearanceStatus;
    challengeRoomId: string | null;
  };
}

export interface GameHistoryEntry {
  roomId: string;
  inviteCode: string;
  finishedAt: string;
  result: "win" | "loss" | "tie";
  eminenceEarned: number;
  totalPlayers: number;
  civilizationIdentity?: CivilizationIdentitySummary | null;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  avgEminence: number;
  recentGames: GameHistoryEntry[];
  matchHistory?: GameHistoryEntry[];
  archive?: AccountArchiveSummary;
}

export type EquippableStoreItemKind = Extract<
  CosmeticSlot,
  "card_back" | "civilization_ambience" | "blueprint_presentation"
>;
export type StoreItemKind = EquippableStoreItemKind | "consumable";
export type StoreItemRarity = "foundational" | "rare" | "mythic";
export type StoreItemVisibility = "player_only" | "all_participants";

export interface StoreItem {
  id: string;
  name: string;
  kind: StoreItemKind;
  rarity: StoreItemRarity;
  visibility: StoreItemVisibility;
  scopeKey: string;
  included?: boolean;
  blueprintId?: BlueprintId;
  presentationVariant?: BlueprintPresentationVariant;
  priceLabel: string;
  starlightPrice: number | null;
  shortDescription: string;
  description: string;
  previewClass: string;
}

export interface StoreEngagement {
  cosmeticBalance: number;
  dailyClaimStreak: number;
  lastDailyClaimDate: string | null;
  canClaimDaily: boolean;
  currencyName: string;
}

export interface StoreState {
  items: StoreItem[];
  ownedItemIds: string[];
  equippedItemIds: Record<EquippableStoreItemKind, string | null>;
  equippedItems: CosmeticLoadoutItem[];
  testCheckoutEnabled: boolean;
  engagement: StoreEngagement;
}

export interface VictoryArtifactSummary {
  tier: number;
  bonusAffinity: string;
}

export interface VictoryStandingSummary {
  eminence: number;
  reservedArtifactCount: number;
  forgedArtifacts: ReadonlyArray<VictoryArtifactSummary>;
}

/** Tier counts ordered from the strongest tie-break value to the weakest. */
export type ArtifactTierCounts = [tier3: number, tier2: number, tier1: number];

export function getArtifactTierCounts(
  artifacts: ReadonlyArray<VictoryArtifactSummary>,
): ArtifactTierCounts {
  const counts: ArtifactTierCounts = [0, 0, 0];
  for (const artifact of artifacts) {
    if (artifact.tier === 3) counts[0]++;
    else if (artifact.tier === 2) counts[1]++;
    else if (artifact.tier === 1) counts[2]++;
  }
  return counts;
}

function compareArtifactTierCounts(
  a: ArtifactTierCounts,
  b: ArtifactTierCounts,
): number {
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return b[index] - a[index];
  }
  return 0;
}

export function getStrongestAffinityTierCounts(
  artifacts: ReadonlyArray<VictoryArtifactSummary>,
): ArtifactTierCounts {
  const byAffinity = new Map<string, VictoryArtifactSummary[]>();
  for (const artifact of artifacts) {
    const affinityArtifacts = byAffinity.get(artifact.bonusAffinity) ?? [];
    affinityArtifacts.push(artifact);
    byAffinity.set(artifact.bonusAffinity, affinityArtifacts);
  }

  let strongest: ArtifactTierCounts = [0, 0, 0];
  for (const affinityArtifacts of byAffinity.values()) {
    const counts = getArtifactTierCounts(affinityArtifacts);
    if (compareArtifactTierCounts(counts, strongest) < 0) strongest = counts;
  }
  return strongest;
}

/**
 * Sort comparator for final standings. A negative result means `a` ranks ahead
 * of `b`. Exact ties retain the game's existing stable player order.
 */
export function compareVictoryStandings(
  a: VictoryStandingSummary,
  b: VictoryStandingSummary,
): number {
  if (a.eminence !== b.eminence) return b.eminence - a.eminence;
  if (a.reservedArtifactCount !== b.reservedArtifactCount) {
    return a.reservedArtifactCount - b.reservedArtifactCount;
  }

  const overallTierComparison = compareArtifactTierCounts(
    getArtifactTierCounts(a.forgedArtifacts),
    getArtifactTierCounts(b.forgedArtifacts),
  );
  if (overallTierComparison !== 0) return overallTierComparison;

  return compareArtifactTierCounts(
    getStrongestAffinityTierCounts(a.forgedArtifacts),
    getStrongestAffinityTierCounts(b.forgedArtifacts),
  );
}
