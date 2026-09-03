import {
  type CivilizationCampaignLumePolicy,
  type CivilizationHistoricalContext,
  type GameMode,
} from "@workspace/game-types";

export interface CivilizationScenarioPolicy {
  historicalContext: CivilizationHistoricalContext;
  campaignLumePolicy?: CivilizationCampaignLumePolicy;
  explanation: string;
}

const CAMPAIGN_SCENARIO_POLICIES: Readonly<Record<string, CivilizationScenarioPolicy>> = {
  blueprint_clearance_lumii: {
    historicalContext: "forecast",
    campaignLumePolicy: "record_only",
    explanation: "Lumii's Defense Forecast is a simulated test, not a historical civilization.",
  },
  chronicle_trace_v1: {
    historicalContext: "historical",
    campaignLumePolicy: "award",
    explanation: "The Trace records a real two-civilization Crownfall history.",
  },
  chronicle_recurrence_v1: {
    historicalContext: "historical",
    campaignLumePolicy: "award",
    explanation: "The Recurrence records two civilizations confronting the White Return.",
  },
  chronicle_triangulation_v1: {
    historicalContext: "historical",
    campaignLumePolicy: "award",
    explanation: "The Triangulation records three civilizations confronting Blind Transit.",
  },
};

export function getCivilizationScenarioPolicy(
  gameMode: GameMode,
  scenarioId: string | null,
): CivilizationScenarioPolicy {
  if (gameMode !== "campaign") {
    return {
      historicalContext: "historical",
      explanation: "Ordinary matches represent a historical civilization.",
    };
  }
  if (scenarioId && CAMPAIGN_SCENARIO_POLICIES[scenarioId]) {
    return CAMPAIGN_SCENARIO_POLICIES[scenarioId];
  }
  return {
    historicalContext: "unknown",
    explanation: "This campaign has not authored its Civilization history policy.",
  };
}
