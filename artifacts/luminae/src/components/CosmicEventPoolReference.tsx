import { CIVILIZATION_EVENT_CARD_DEFINITIONS, EVENT_FREQUENCY_LABELS, type CivilizationEventCardId, type EventDelivery, type EventFrequency } from '@workspace/game-types';

/** Membership is public; deck order, location, and remaining card counts are not. */
export function CosmicEventPoolReference({
  eventCardPool,
  eventContentProfile,
  eventFrequency,
  eventDelivery,
}: {
  eventCardPool?: readonly CivilizationEventCardId[];
  eventContentProfile?: 'general_v1' | 'general_v2' | 'lore_pilot_v1';
  eventFrequency?: EventFrequency;
  eventDelivery?: EventDelivery;
}) {
  if (!eventCardPool?.length && !eventFrequency) return null;
  const definitions = [...new Set(eventCardPool ?? [])].map((id) => CIVILIZATION_EVENT_CARD_DEFINITIONS[id]);
  const scheduled = eventDelivery === 'scheduled_forge_v1';
  return (
    <details className="rounded-2xl border border-border/50 bg-card/85 p-4" data-testid="cosmic-event-pool-reference">
      <summary className="cursor-pointer text-xs font-semibold text-white/80">{scheduled ? 'Possible Events' : 'Events in this match'}</summary>
      <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
        {eventFrequency && <p className="font-semibold text-white/85">Event frequency: {EVENT_FREQUENCY_LABELS[eventFrequency]}</p>}
        {eventFrequency === 'off' && definitions.length === 0 ? (
          <p>{scheduled ? 'Random Events are off for this match.' : 'Random Events are off. No Event cards were added to this match’s decks.'}</p>
        ) : scheduled ? (
          <>
            <p>Events are selected randomly without duplicates from the eligible collection below. The selected cards and their order stay hidden until revealed.</p>
            <p>Events use a separate deck. Once the countdown is ready, the next Artifact forged reveals an Event in the Forge after current effects finish. Inspect the forecast in Civilization.</p>
          </>
        ) : (
          <>
            <p>{eventContentProfile === 'lore_pilot_v1' ? 'This match includes the lore Event pilot. Inspect an Artifact’s Event interactions to see its response capabilities and targeting properties.' : 'This match uses the general Event collection.'} Events activate automatically when revealed in the Forge, after current effects finish.</p>
            <p>{definitions.length} unique Event {definitions.length === 1 ? 'card was' : 'cards were'} included at match creation. This list does not reveal draw order or which cards remain. Encounters are not guaranteed.</p>
          </>
        )}
        {([1, 2, 3] as const).map((tier) => {
          const cards = definitions.filter((definition) => definition.tier === tier);
          if (cards.length === 0) return null;
          return (
            <section key={tier} aria-label={`${['Planetary', 'Stellar', 'Galactic'][tier - 1]} Events`}>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-cyan-100/70">{['Planetary', 'Stellar', 'Galactic'][tier - 1]}</h3>
              <ul className="mt-2 space-y-3">
                {cards.map((definition) => <li key={definition.id}><span className="font-semibold text-white/85">{definition.title}.</span> {definition.rulesText}</li>)}
              </ul>
            </section>
          );
        })}
      </div>
    </details>
  );
}
