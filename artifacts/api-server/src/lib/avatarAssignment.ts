export const PLAYER_AVATAR_IDS = [
  "stargazer",
  "forgemaster",
  "voidcaller",
  "archivist",
  "cultivator",
  "sentinel",
  "oracle",
  "sovereign",
] as const;

export const GUIDED_LUMII_AVATAR_ID = "lumii";

export function pickUniqueAvatar(
  requestedAvatarId: string | null | undefined,
  takenAvatarIds: Iterable<string | null | undefined>,
  randomizeFallback = false,
): string {
  const taken = new Set(
    [...takenAvatarIds].filter((id): id is string => typeof id === "string"),
  );
  if (
    requestedAvatarId &&
    PLAYER_AVATAR_IDS.includes(requestedAvatarId as (typeof PLAYER_AVATAR_IDS)[number]) &&
    !taken.has(requestedAvatarId)
  ) {
    return requestedAvatarId;
  }

  const available = PLAYER_AVATAR_IDS.filter((id) => !taken.has(id));
  if (available.length === 0) {
    throw new Error("No unique player avatars remain");
  }
  return randomizeFallback
    ? available[Math.floor(Math.random() * available.length)]
    : available[0];
}
