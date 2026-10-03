import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { EventDelivery, EventForecast } from '@workspace/game-types';
import { createCosmicEventAudio } from '@/lib/cosmicEventAudio';

const TIER_NAMES = { 1: 'Planetary', 2: 'Stellar', 3: 'Galactic' } as const;
const heardTurnWarnings = new Set<string>();

export interface EventTurnWarningState {
  dotsRemaining: number;
  armed: boolean;
}

/** Capture this from the incoming turn state, before a presentation delay. */
export function getEventTurnWarning(
  delivery: EventDelivery | undefined,
  forecast: EventForecast | undefined,
  playerId: string,
): EventTurnWarningState | null {
  if (delivery !== 'scheduled_forge_v1' || !forecast) return null;
  if (forecast.status === 'armed') return { dotsRemaining: 0, armed: true };
  if (forecast.status !== 'countdown') return null;
  const remaining = forecast.turnsRemainingByPlayerId[playerId];
  if (remaining === undefined || !Number.isInteger(remaining) || remaining < 0 || remaining > 3) return null;
  return { dotsRemaining: remaining, armed: false };
}

/** The complete forecast belongs to the Civilization layer only. */
export function CivilizationEventForecast({ forecast }: { forecast?: EventForecast }) {
  if (!forecast) return null;
  const tier = forecast.tier ? TIER_NAMES[forecast.tier] : null;
  const remaining = forecast.roundsRemaining ?? 0;
  const descriptions: Record<EventForecast['status'], string> = {
    off: 'Random Events are off for this match.',
    countdown: 'The countdown advances after every player completes a turn. Once it is empty, a successful Forge readies an Event for the next vacated Forge slot.',
    armed: 'A successful Forge readies the Event to fill the next vacated Forge slot, after current effects finish.',
    resolving: 'An Event is resolving. Play resumes after its effects and presentation finish.',
    complete: 'Every scheduled Event has been revealed.',
    closed: 'This match is closing. No further Events will be revealed.',
  };
  const headline = forecast.status === 'countdown'
    ? `Within ${remaining} ${remaining === 1 ? 'round' : 'rounds'}`
    : { off: 'Events off', armed: 'Event ready', resolving: 'Event in progress', complete: 'Event sequence complete', closed: 'Event sequence closed' }[forecast.status];
  return (
    <section
      className="rounded-xl border border-indigo-200/15 bg-indigo-950/20 px-4 py-3"
      data-testid="civilization-event-forecast"
      data-event-status={forecast.status}
      aria-label="Cosmic Event forecast"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-100/65">Cosmic Event forecast</h2>
        {tier && <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-100/80">Next: {tier}</span>}
      </div>
      <p className="mt-1 text-sm font-semibold text-white/85">{headline}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/50">{descriptions[forecast.status]}</p>
    </section>
  );
}

/** Only the final three personal turns surface outside Civilization. */
export function EventTurnWarning({ warning, turnIdentity, reducedMotion = false, muted = false }: {
  warning: EventTurnWarningState;
  turnIdentity: string;
  reducedMotion?: boolean;
  muted?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const still = reducedMotion || prefersReducedMotion;
  useEffect(() => {
    if (muted || document.hidden || heardTurnWarnings.has(turnIdentity)) return;
    const key = `luminae_event_warning:${turnIdentity}`;
    try { if (sessionStorage.getItem(key) === '1') return; } catch { /* Storage is optional. */ }
    const audio = createCosmicEventAudio('system_shock');
    // The short delay lets the warning settle below the existing turn cue.
    // Claim only when playing, so StrictMode's rehearsal never consumes it.
    const timer = window.setTimeout(() => {
      if (document.hidden || heardTurnWarnings.has(turnIdentity)) return;
      heardTurnWarnings.add(turnIdentity);
      try { sessionStorage.setItem(key, '1'); } catch { /* In-memory dedupe remains. */ }
      audio.play('forecast');
    }, 280);
    return () => { window.clearTimeout(timer); audio.dispose(); };
  }, [muted, turnIdentity]);

  const label = warning.armed
    ? 'Cosmic Event ready'
    : warning.dotsRemaining === 0
      ? 'Awaiting the round'
      : 'Cosmic Event approaching';
  return (
    <div className="turn-announcement__event-warning" data-testid="event-turn-warning">
      <div
        className="flex items-center gap-3"
        role="img"
        aria-label={warning.armed ? 'Event ready; countdown empty' : `${warning.dotsRemaining} of your turns remain before the Event countdown is ready`}
      >
        {[0, 1, 2].map((index) => {
          const filled = index < warning.dotsRemaining;
          const wasFilled = index < Math.min(3, warning.dotsRemaining + 1);
          return <motion.span
            key={index}
            aria-hidden="true"
            data-event-dot={filled ? 'filled' : 'empty'}
            className="block h-3 w-3 rounded-full border border-indigo-200/75"
            initial={still || warning.armed ? false : { backgroundColor: wasFilled ? '#a5b4fc' : '#ffffff00' }}
            animate={{ backgroundColor: filled ? '#a5b4fc' : '#ffffff00' }}
            transition={{ delay: still ? 0 : 0.28, duration: still ? 0 : 0.65 }}
          />;
        })}
      </div>
      <span className="turn-announcement__event-label">{label}</span>
    </div>
  );
}
