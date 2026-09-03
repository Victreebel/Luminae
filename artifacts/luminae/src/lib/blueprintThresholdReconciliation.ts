import type {
  BlueprintVaultState,
  BlueprintVaultThresholdAction,
} from "@/lib/accountSession";

function dialoguePathStartsWith(
  path: readonly string[],
  prefix: readonly string[],
): boolean {
  return path.length >= prefix.length && prefix.every((entry, index) => path[index] === entry);
}

export function reconciledThresholdDialoguePath(
  action: Extract<BlueprintVaultThresholdAction, { action: "record_dialogue_path" }>,
  vault: BlueprintVaultState,
): BlueprintVaultState["clearance"]["thresholdDialoguePath"] | null {
  const authoritativePath = vault.clearance.thresholdDialoguePath;
  if (dialoguePathStartsWith(authoritativePath, action.path)) return authoritativePath;

  const priorPath = action.path.slice(0, -1);
  const continuedElsewhere = authoritativePath.length > priorPath.length &&
    dialoguePathStartsWith(authoritativePath, priorPath);
  if (continuedElsewhere || vault.clearance.status === "challenge_active") {
    return authoritativePath;
  }
  return null;
}

export function thresholdActionWasApplied(
  action: BlueprintVaultThresholdAction,
  vault: BlueprintVaultState,
): boolean {
  const { clearance } = vault;
  if (action.action === "deactivate_cipher") {
    return clearance.cipherDeactivated ||
      clearance.decryptionKeyBypassActive ||
      clearance.thresholdApproach !== null ||
      clearance.status === "challenge_active";
  }
  if (action.action === "choose_approach") {
    return clearance.thresholdApproach === action.approach;
  }
  if (action.action === "record_dialogue_path") {
    return reconciledThresholdDialoguePath(action, vault) !== null;
  }
  return clearance.thresholdDialogueResolution === "left" || clearance.status === "classified";
}
