export const LUMINAE_WEBSOCKET_PROTOCOL = "luminae-v1";
const SESSION_PROTOCOL_PREFIX = "luminae-session-";
const SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function websocketSessionProtocol(sessionToken: string): string {
  if (!SESSION_TOKEN_PATTERN.test(sessionToken)) {
    throw new Error("Invalid game session token");
  }
  return `${SESSION_PROTOCOL_PREFIX}${sessionToken}`;
}

export function sessionTokenFromProtocolHeader(
  header: string | string[] | undefined,
): string | null {
  const values = Array.isArray(header) ? header : [header ?? ""];
  for (const value of values.flatMap((entry) => entry.split(","))) {
    const protocol = value.trim();
    if (!protocol.startsWith(SESSION_PROTOCOL_PREFIX)) continue;
    const token = protocol.slice(SESSION_PROTOCOL_PREFIX.length);
    if (SESSION_TOKEN_PATTERN.test(token)) return token;
  }
  return null;
}
