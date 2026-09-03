export type TutorialCameraFocus = "overview" | "well" | "tier1" | "tier2";

export type TutorialCompactSurface = "forge" | "luminary";

export interface TutorialCameraState {
  beatId: string;
  isActionInstructionVisible: boolean;
  finalDeliveryComplete: boolean;
}

export function getTutorialCameraFocus({
  beatId,
  isActionInstructionVisible,
  finalDeliveryComplete,
}: TutorialCameraState): TutorialCameraFocus {
  if ([
    "b6b_root_lattice",
    "b7_artifact_cost",
    "b8_first_harness",
    "b9_first_forge",
    "b10_reserve",
    "b11a_lumii_forge",
  ].includes(beatId)) return "tier1";

  if ([
    "b9b_forge_complete",
    "b8a_lumii_harness_three",
    "b9a_lumii_harness_two",
    "b10a_lumii_harness_three",
    "b10b_reserve_granted",
    "b11_forge_reserved",
    "b11b_forge_reserved",
    "b11c_lumii_harness_three",
    "b14_win_condition",
  ].includes(beatId)) return "well";

  if (beatId === "b16_final_forge") {
    if (!isActionInstructionVisible) return "overview";
    return finalDeliveryComplete ? "tier2" : "well";
  }

  return "overview";
}

export function getTutorialCompactSurface(beatId: string): TutorialCompactSurface {
  return beatId === "b15b_luminary_signal" ? "luminary" : "forge";
}

export function usesStaticTutorialCamera(viewport: { width: number; height: number }): boolean {
  const width = Math.max(0, viewport.width);
  const height = Math.max(0, viewport.height);
  const isLandscape = width > height;
  return isLandscape ? height <= 520 : width <= 600;
}

export interface TutorialCameraMetrics {
  maxScroll: number;
  tier1Top?: number;
  tier2Top?: number;
}

function clampScrollTop(value: number, maxScroll: number): number {
  return Math.min(Math.max(0, value), Math.max(0, maxScroll));
}

export function getTutorialCameraScrollTop(
  focus: TutorialCameraFocus,
  metrics: TutorialCameraMetrics,
  staticCamera: boolean,
): number {
  const maxScroll = Math.max(0, metrics.maxScroll);
  if (staticCamera || focus === "overview") return 0;
  if (focus === "well") return maxScroll;
  if (focus === "tier1") {
    return clampScrollTop(metrics.tier1Top ?? maxScroll, maxScroll);
  }
  return clampScrollTop((metrics.tier2Top ?? maxScroll / 2) - 48, maxScroll);
}

export function getTutorialCameraScrollBehavior(
  focus: TutorialCameraFocus,
  staticCamera: boolean,
): "auto" | "smooth" {
  return staticCamera || focus === "tier1" ? "auto" : "smooth";
}
