import { useMemo, useRef, useState } from 'react';
import { LUMINARY_IDS, type LuminaryId } from '@workspace/game-types';
import {
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Play,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getLuminaryVisuals } from '@/lib/luminaryAssets';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export type DevSequencePlaybackMode = 'canonical' | 'fast' | 'instant';

const LUMINARY_NAMES: Record<LuminaryId, string> = {
  lum_ember: 'The Ember Sovereign',
  lum_tide: 'The Tide Architect',
  lum_verdant: 'The Verdant Oracle',
  lum_void: 'The Void Warden',
  lum_radiant: 'Concordance Mandala',
  lum_astral: 'Phoenix Paradox',
  lum_bloom: 'Catalyst Bloom',
  lum_forge: 'The Iron Harbinger',
  lum_compass: '???',
  lum_seed: 'The Seed Beyond Seasons',
  lum_orchard: 'The Glass Orchard',
  lum_pale: 'The Pale Merchant',
  lum_hunger: 'The Final Hunger',
  lum_moth: 'Red Moth',
  lum_null: 'The Null Sovereign',
  lum_oracle: 'The Cosmic Oracle',
  lum_scholar: 'The Celestial Scholar',
};

interface DevLuminarySequencePanelProps {
  roomId: string;
  sessionToken: string;
  presentationActive: boolean;
  onPrepareRun: (playbackMode: DevSequencePlaybackMode) => void;
  onRunQueued: (playbackMode: DevSequencePlaybackMode) => void;
  onRestore: () => void;
  onClose: () => void;
}

interface DevSequenceResponse {
  error?: string;
  summonEventIds?: string[];
  activationEventIds?: string[];
}

async function readResponse(response: Response): Promise<DevSequenceResponse> {
  try {
    return await response.json() as DevSequenceResponse;
  } catch {
    return {};
  }
}

export function DevLuminarySequencePanel({
  roomId,
  sessionToken,
  presentationActive,
  onPrepareRun,
  onRunQueued,
  onRestore,
  onClose,
}: DevLuminarySequencePanelProps) {
  const [orderedIds, setOrderedIds] = useState<LuminaryId[]>([]);
  const [includeEndOfTurnEffects, setIncludeEndOfTurnEffects] = useState(true);
  const [includeStartOfTurnEffects, setIncludeStartOfTurnEffects] = useState(false);
  const [repeatFromBaseline, setRepeatFromBaseline] = useState(true);
  const [playbackMode, setPlaybackMode] =
    useState<DevSequencePlaybackMode>('canonical');
  const [busy, setBusy] = useState<'run' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  useFocusTrap(panelRef, true, onClose);

  const orderById = useMemo(
    () => new Map(orderedIds.map((id, index) => [id, index + 1])),
    [orderedIds],
  );
  const controlsDisabled = busy !== null || presentationActive;

  const toggleLuminary = (id: LuminaryId) => {
    setError(null);
    setOrderedIds((current) => (
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : [...current, id]
    ));
  };

  const moveLuminary = (index: number, direction: -1 | 1) => {
    setOrderedIds((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const runSequence = async () => {
    if (orderedIds.length === 0 || controlsDisabled) return;
    setBusy('run');
    setError(null);
    onPrepareRun(playbackMode);
    try {
      const response = await fetch(`/api/dev/rooms/${roomId}/luminary-sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          luminaryIds: orderedIds,
          includeEndOfTurnEffects,
          includeStartOfTurnEffects,
          repeatFromBaseline,
        }),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(data.error ?? `Sequence failed (${response.status})`);
      }
      onRunQueued(playbackMode);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sequence failed');
      setBusy(null);
    }
  };

  const restoreBaseline = async () => {
    if (controlsDisabled) return;
    setBusy('restore');
    setError(null);
    try {
      const response = await fetch(`/api/dev/rooms/${roomId}/rewind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(data.error ?? `Restore failed (${response.status})`);
      }
      onRestore();
      setBusy(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Restore failed');
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[8500] flex items-end justify-end bg-black/45 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Developer Luminary sequence laboratory"
    >
      <section
        ref={panelRef}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-lg border border-amber-300/35 bg-[#070a0f]/[0.98] shadow-[0_24px_80px_rgba(0,0,0,0.72)]"
      >
        <header className="flex min-h-12 items-center gap-3 border-b border-amber-300/20 px-3">
          <FlaskConical className="h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-amber-100">Luminary Sequence Lab</h2>
            <p className="truncate text-[10px] uppercase text-amber-200/55">
              Local development only
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={onClose}
            aria-label="Close sequence laboratory"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase text-white/55">
              Arrival order
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-amber-200"
                disabled={controlsDisabled}
                onClick={() => setOrderedIds([...LUMINARY_IDS])}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/55"
                disabled={controlsDisabled || orderedIds.length === 0}
                onClick={() => setOrderedIds([])}
                aria-label="Clear selected Luminaries"
                title="Clear selection"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {LUMINARY_IDS.map((id) => {
              const visuals = getLuminaryVisuals(id);
              const order = orderById.get(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => toggleLuminary(id)}
                  className={[
                    'relative flex min-h-11 min-w-0 items-center gap-2 overflow-hidden rounded border px-2 py-1.5 text-left transition-colors',
                    order
                      ? 'border-amber-300/65 bg-amber-300/10 text-white'
                      : 'border-white/10 bg-white/[0.035] text-white/65 hover:border-white/25 hover:text-white',
                  ].join(' ')}
                  style={order ? { boxShadow: `inset 3px 0 0 ${visuals.primaryColor}` } : undefined}
                  aria-pressed={!!order}
                  aria-label={`${LUMINARY_NAMES[id]}${order ? `, position ${order}` : ''}`}
                >
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold"
                    style={{
                      borderColor: order ? visuals.primaryColor : 'rgba(255,255,255,0.16)',
                      color: order ? visuals.primaryColor : 'rgba(255,255,255,0.42)',
                    }}
                  >
                    {order ?? ''}
                  </span>
                  <span className="min-w-0 truncate text-[11px] font-medium">
                    {LUMINARY_NAMES[id]}
                  </span>
                </button>
              );
            })}
          </div>

          {orderedIds.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-2">
              {orderedIds.map((id, index) => (
                <div
                  key={id}
                  className="flex min-h-8 items-center gap-2 border-b border-white/[0.06] last:border-b-0"
                >
                  <span className="w-5 text-center text-[11px] font-bold text-amber-300">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white/75">
                    {LUMINARY_NAMES[id]}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white/45"
                    disabled={controlsDisabled || index === 0}
                    onClick={() => moveLuminary(index, -1)}
                    aria-label={`Move ${LUMINARY_NAMES[id]} earlier`}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white/45"
                    disabled={controlsDisabled || index === orderedIds.length - 1}
                    onClick={() => moveLuminary(index, 1)}
                    aria-label={`Move ${LUMINARY_NAMES[id]} later`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold uppercase text-white/55">
                Playback
              </span>
              <div
                className="grid grid-cols-3 overflow-hidden rounded border border-white/15"
                role="group"
                aria-label="Sequence playback speed"
              >
                {([
                  ['canonical', '1x'],
                  ['fast', 'Fast'],
                  ['instant', 'Instant'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={controlsDisabled}
                    aria-pressed={playbackMode === mode}
                    onClick={() => setPlaybackMode(mode)}
                    className={[
                      'h-8 border-r border-white/10 text-[11px] font-semibold last:border-r-0',
                      playbackMode === mode
                        ? 'bg-amber-300/18 text-amber-100'
                        : 'bg-white/[0.025] text-white/50 hover:text-white/80',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex min-h-9 items-center gap-3">
              <Switch
                checked={includeEndOfTurnEffects}
                disabled={controlsDisabled}
                onCheckedChange={setIncludeEndOfTurnEffects}
                aria-label="Include staged end-of-turn effects"
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-white/85">End-turn effects</span>
                <span className="block text-[10px] text-white/45">
                  Stage eligible delayed payoffs after arrival effects
                </span>
              </span>
            </label>
            <label className="flex min-h-9 items-center gap-3">
              <Switch
                checked={includeStartOfTurnEffects}
                disabled={controlsDisabled}
                onCheckedChange={setIncludeStartOfTurnEffects}
                aria-label="Include staged start-of-turn effects"
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-white/85">Next-turn effects</span>
                <span className="block text-[10px] text-white/45">
                  Stage Phoenix Archive return in the same test queue
                </span>
              </span>
            </label>
            <label className="flex min-h-9 items-center gap-3">
              <Switch
                checked={repeatFromBaseline}
                disabled={controlsDisabled}
                onCheckedChange={setRepeatFromBaseline}
                aria-label="Repeat from captured baseline"
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-white/85">Repeat baseline</span>
                <span className="block text-[10px] text-white/45">
                  Reuse the same pre-sequence board on every run
                </span>
              </span>
            </label>
          </div>

          {presentationActive && (
            <p className="mt-3 rounded border border-sky-300/20 bg-sky-300/[0.06] px-2 py-1.5 text-[11px] text-sky-100/70">
              The current presentation must finish before another sequence can begin.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">
              {error}
            </p>
          )}
        </div>

        <footer className="grid grid-cols-[auto_1fr] gap-2 border-t border-amber-300/20 p-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-white/15 bg-white/[0.035] text-white/70"
            disabled={controlsDisabled}
            onClick={restoreBaseline}
            title="Restore the state captured immediately before the last test run"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {busy === 'restore' ? 'Restoring' : 'Restore'}
          </Button>
          <Button
            type="button"
            className="h-10 border border-amber-200/40 bg-amber-300/15 text-amber-50 hover:bg-amber-300/25"
            disabled={controlsDisabled || orderedIds.length === 0}
            onClick={runSequence}
          >
            <Play className="mr-2 h-4 w-4 fill-current" />
            {busy === 'run'
              ? 'Queuing sequence'
              : `Run ${orderedIds.length || ''} Luminar${orderedIds.length === 1 ? 'y' : 'ies'}`}
          </Button>
        </footer>
      </section>
    </div>
  );
}
