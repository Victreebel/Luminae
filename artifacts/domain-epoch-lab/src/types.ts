export const AFFINITIES = ["flare", "continuum", "verdance", "abyss", "radiance"] as const;
export type Affinity = (typeof AFFINITIES)[number];
export type AffinityCounts = Record<Affinity, number>;
export type Scale = "planetary" | "stellar" | "galactic";
export type Format = "quick" | "standard" | "epic";
export type VictoryModel = "eminence" | "legacy" | "keystone";
export type CatalogMode = "micro" | "core";
export type BotStrategy = "random" | "greedy" | "lineage" | "denial" | "domain";
export type LegacyAxis = "reach" | "network" | "resilience";

export interface ArtifactDefinition {
  id: string;
  name: string;
  affinity: Affinity;
  scale: Scale;
  requirements: AffinityCounts;
  builtOn: string[];
  tags: string[];
  eminence: number;
}

export interface DomainCondition {
  id: string;
  name: string;
  requiredTag: string;
  targetPerPlayer: number;
}

export interface CivilizationImperative {
  id: string;
  name: string;
  tag: string;
  target: number;
}

export interface ProgramState {
  artifactId: string;
  committed: AffinityCounts;
  inheritedAffinity: Affinity | null;
}

export interface CivilizationState {
  id: string;
  name: string;
  eminence: number;
  legacy: Record<LegacyAxis, number>;
  programs: [ProgramState | null, ProgramState | null];
  implemented: string[];
  exhausted: string[];
  domainContribution: number;
  imperative: CivilizationImperative;
  imperativeComplete: boolean;
  maxOccupiedSlots: number;
}

export interface Ruleset {
  seed: number;
  playerCount: 2 | 3 | 4;
  format: Format;
  victoryModel: VictoryModel;
  catalog: CatalogMode;
  optionalModules: string[];
}

export interface EpochResult {
  epoch: number;
  conditionId: string;
  contribution: number;
  target: number;
  success: boolean;
}

export interface LogEntry {
  turn: number;
  epoch: number;
  playerId: string;
  action: PrototypeAction["type"] | "system";
  detail: string;
}

export interface GameState {
  schema: "domain-epoch-lab/v0.1";
  ruleset: Ruleset;
  phase: "playing" | "complete";
  rngState: number;
  epoch: number;
  turnsInEpoch: number;
  totalTurns: number;
  activePlayerIndex: number;
  openingPlayerIndex: number;
  closingAfterEpoch: number | null;
  well: AffinityCounts;
  frontier: Record<Affinity, string | null>;
  decks: Record<Affinity, string[]>;
  discard: string[];
  tension: number;
  condition: DomainCondition;
  epochContribution: number;
  epochResults: EpochResult[];
  domainOutcome: "pending" | "flourishing" | "strained" | "fractured";
  players: CivilizationState[];
  winnerIds: string[];
  log: LogEntry[];
  actionCounts: Record<PrototypeAction["type"], number>;
  wellStarvationTurns: number;
  forcedPasses: number;
}

export interface InitiateAction {
  type: "initiate";
  sector: Affinity;
  slot: 0 | 1;
  startingAffinity: Affinity;
  inheritedAffinity: Affinity | null;
}

export interface ChannelPlacement {
  slot: 0 | 1;
  affinity: Affinity;
}

export interface ChannelAction {
  type: "channel";
  placements: [ChannelPlacement, ChannelPlacement];
}

export interface PivotAction {
  type: "pivot";
  slot: 0 | 1;
}

export interface CoordinateAction {
  type: "coordinate";
  artifactId: string;
}

export type PrototypeAction = InitiateAction | ChannelAction | PivotAction | CoordinateAction;

export interface SimulationReport {
  schema: "domain-epoch-report/v0.1";
  generatedAt: string;
  games: number;
  configurations: number;
  completedGames: number;
  deadlocks: number;
  averageTurns: number;
  completionRate: number;
  seatWinRates: number[];
  seatParityByPlayerCount: Record<2 | 3 | 4, number>;
  openerRelativeSpread: number;
  actionShares: Record<PrototypeAction["type"], number>;
  maxActionShare: number;
  wellStarvationRate: number;
  forcedPassRate: number;
  twoSlotUseRate: number;
  averageTension: number;
  domainOutcomes: Record<"flourishing" | "strained" | "fractured", number>;
  victoryModels: Record<VictoryModel, { games: number; completionRate: number; averageTurns: number }>;
  gates: Record<string, { passed: boolean; value: number; threshold: string }>;
  notes: string[];
}

export const emptyAffinityCounts = (): AffinityCounts => ({
  flare: 0,
  continuum: 0,
  verdance: 0,
  abyss: 0,
  radiance: 0,
});
