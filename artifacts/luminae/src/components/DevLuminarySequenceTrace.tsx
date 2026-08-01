import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  LuminarySequenceRunState,
  LuminarySequenceSignals,
  LuminarySequenceStatus,
} from '@/lib/luminarySequenceController';

interface DevLuminarySequenceTraceProps {
  status: LuminarySequenceStatus;
  signals: LuminarySequenceSignals;
  ingressQueuedCount: number;
  run: LuminarySequenceRunState;
}

export function DevLuminarySequenceTrace({
  status,
  signals,
  ingressQueuedCount,
  run,
}: DevLuminarySequenceTraceProps) {
  const [expanded, setExpanded] = useState(false);

  if (run.status === 'idle') return null;

  const resultTone = run.status === 'passed'
    ? 'border-emerald-300/35 text-emerald-100'
    : run.status === 'failed'
      ? 'border-red-300/40 text-red-100'
      : 'border-sky-300/30 text-sky-100';

  return (
    <aside
      className={[
        'pointer-events-none fixed right-2 top-2 z-[12000] w-[min(250px,calc(100vw-1rem))]',
        'rounded border bg-[#05070c]/95 px-2.5 py-2 font-mono text-[10px] shadow-2xl',
        resultTone,
      ].join(' ')}
      aria-live="polite"
      data-testid="luminary-sequence-trace"
    >
      <button
        type="button"
        className={[
          'pointer-events-auto flex w-full items-center justify-between gap-2',
          'font-mono text-[10px] text-current',
        ].join(' ')}
        aria-expanded={expanded}
        aria-controls="luminary-sequence-trace-details"
        onClick={() => setExpanded(current => !current)}
      >
        <span className="font-bold uppercase tracking-[0.12em]">Sequence trace</span>
        <span className="flex items-center gap-1.5">
          <span className="font-bold uppercase">{run.status}</span>
          {expanded
            ? <ChevronUp className="h-3 w-3" aria-hidden="true" />
            : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
        </span>
      </button>
      {expanded && (
        <div id="luminary-sequence-trace-details" className="mt-1">
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-white/70">
            <span>phase</span><span className="text-white">{status.phase}</span>
            <span>server summon / effect</span>
            <span>{signals.pendingSummonCount} / {signals.pendingActivationCount}</span>
            <span>local effect / payoff</span>
            <span>{signals.activationQueueLength} / {signals.delayedResultQueueLength}</span>
            <span>state ingress</span><span>{ingressQueuedCount}</span>
            <span>camera</span>
            <span className={status.cameraControlled ? 'text-amber-200' : 'text-emerald-200'}>
              {status.cameraControlled ? 'leased' : 'released'}
            </span>
          </div>
          {run.failure && (
            <p className="mt-1 border-t border-current/20 pt-1 leading-snug">{run.failure}</p>
          )}
        </div>
      )}
    </aside>
  );
}
