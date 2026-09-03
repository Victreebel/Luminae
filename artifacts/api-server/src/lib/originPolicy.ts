const LOOPBACK_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

export interface OriginPolicyOptions {
  configuredOrigins: ReadonlySet<string>;
  allowLoopback: boolean;
}

export function parseConfiguredOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function isOriginAllowed(
  origin: string | undefined,
  { configuredOrigins, allowLoopback }: OriginPolicyOptions,
): boolean {
  return !origin
    || configuredOrigins.has(origin)
    || (allowLoopback && LOOPBACK_ORIGIN.test(origin));
}

const runtimePolicy: OriginPolicyOptions = {
  configuredOrigins: parseConfiguredOrigins(process.env.CORS_ORIGINS),
  allowLoopback: process.env.NODE_ENV !== "production",
};

export function isRuntimeOriginAllowed(origin: string | undefined): boolean {
  return isOriginAllowed(origin, runtimePolicy);
}
