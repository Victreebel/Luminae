const configuredOrigin = (import.meta.env.VITE_LUMINAE_API_ORIGIN as string | undefined)?.trim();
export const LUMINAE_API_ORIGIN = configuredOrigin?.replace(/\/+$/, "") ?? "";
const BASE_PATH = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${LUMINAE_API_ORIGIN}${BASE_PATH}/api${normalized}`;
}

export function absoluteServiceUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${LUMINAE_API_ORIGIN}${normalized}`;
}

export function gameWebSocketUrl(roomId: string, sessionToken: string): string {
  const origin = LUMINAE_API_ORIGIN || window.location.origin;
  const url = new URL("/ws", origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("roomId", roomId);
  url.searchParams.set("sessionToken", sessionToken);
  return url.toString();
}
