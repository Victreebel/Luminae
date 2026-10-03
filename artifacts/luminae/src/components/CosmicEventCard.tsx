import type { CivilizationEventCardDefinition } from '@workspace/game-types';
import { COSMIC_EVENT_ART } from '@/lib/cosmicEventArt';
import './CosmicEventCard.css';

interface CosmicEventCardProps {
  definition: CivilizationEventCardDefinition;
  titleId?: string;
  testId?: string;
}

/** The same illustrated card face travels from its Forge slot into activation. */
export function CosmicEventCard({ definition, titleId, testId }: CosmicEventCardProps) {
  const tierLabel = definition.tier === 1 ? 'Planetary' : definition.tier === 2 ? 'Stellar' : 'Galactic';
  const tierNumeral = definition.tier === 1 ? 'I' : definition.tier === 2 ? 'II' : 'III';

  return (
    <article className="cosmic-event-card" data-testid={testId} data-event-art={definition.effectProfile} aria-labelledby={titleId}>
      <img className="cosmic-event-card__art" src={COSMIC_EVENT_ART[definition.effectProfile]} alt="" draggable={false} decoding="async" />
      <div className="cosmic-event-card__veil" aria-hidden="true" />
      <div className="cosmic-event-card__content">
        <div className="cosmic-event-card__top">
          <span className="cosmic-event-card__label">Event</span>
          <span className="cosmic-event-card__scale" aria-label={`Tier ${definition.tier}`}>{tierNumeral}</span>
        </div>
        <div className="cosmic-event-card__identity">
          <h2 id={titleId} className="cosmic-event-card__title">{definition.title}</h2>
          <div className="cosmic-event-card__tier">{tierLabel}</div>
        </div>
      </div>
    </article>
  );
}
