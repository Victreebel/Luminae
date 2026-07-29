import { useEffect, useState } from 'react';

interface ApiBuildIdentity {
  buildLabel: string;
  startedAt: string;
}

function shortIdentity(value: string | null): string {
  if (!value) return 'unavailable';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  return value.length > 18 ? value.slice(0, 18) : value;
}

export function DevBuildIdentity() {
  const [apiBuild, setApiBuild] = useState<ApiBuildIdentity | null>(null);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const response = await fetch('/api/meta/build', { cache: 'no-store' });
        if (!response.ok) return;
        const next = await response.json() as ApiBuildIdentity;
        if (!cancelled) setApiBuild(next);
      } catch {
        if (!cancelled) setApiBuild(null);
      }
    };
    void read();
    const timer = setInterval(() => void read(), 5_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div
      className="px-2 py-1.5 font-mono text-[9px] leading-relaxed text-muted-foreground"
      title={`Web: ${__LUMINAE_BUILD_LABEL__}\nAPI: ${apiBuild?.buildLabel ?? 'unavailable'}`}
      data-testid="dev-build-identity"
    >
      <div className="flex justify-between gap-4">
        <span>WEB</span>
        <span>{shortIdentity(__LUMINAE_BUILD_STAMP__)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>API</span>
        <span>{shortIdentity(apiBuild?.startedAt ?? null)}</span>
      </div>
    </div>
  );
}
