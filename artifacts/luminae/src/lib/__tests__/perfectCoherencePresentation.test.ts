import { describe, expect, it } from 'vitest';
import { createPerfectCoherenceBestowals } from '../perfectCoherencePresentation';

const unreached = {
  concordanceMandalaTriggered: false,
  concordanceMandalaFinalTriggered: false,
};

describe('Perfect Coherence milestone presentation', () => {
  it('bestows 2 Eminence when the 8-Artifact milestone is reached', () => {
    const results = createPerfectCoherenceBestowals(
      unreached,
      { ...unreached, concordanceMandalaTriggered: true },
      ['eight-artifacts'],
      100,
    );

    expect(results).toEqual([{
      id: 'mandala-100-0',
      luminaryId: 'lum_radiant',
      activationEventId: 'eight-artifacts',
      amount: 2,
      color: '#d4af37',
      label: 'Eminence',
    }]);
  });

  it('bestows 2 Eminence when the 10-Artifact milestone is reached', () => {
    const results = createPerfectCoherenceBestowals(
      { ...unreached, concordanceMandalaTriggered: true },
      {
        concordanceMandalaTriggered: true,
        concordanceMandalaFinalTriggered: true,
      },
      ['ten-artifacts'],
      200,
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      activationEventId: 'ten-artifacts',
      amount: 2,
    });
  });

  it('keeps simultaneous milestones as two ordered bestowals', () => {
    const results = createPerfectCoherenceBestowals(
      unreached,
      {
        concordanceMandalaTriggered: true,
        concordanceMandalaFinalTriggered: true,
      },
      ['eight-artifacts', 'ten-artifacts'],
      300,
    );

    expect(results.map(result => [result.activationEventId, result.amount])).toEqual([
      ['eight-artifacts', 2],
      ['ten-artifacts', 2],
    ]);
  });

  it('does not repeat an already reached milestone', () => {
    const reached = {
      concordanceMandalaTriggered: true,
      concordanceMandalaFinalTriggered: true,
    };

    expect(createPerfectCoherenceBestowals(reached, reached, [], 400)).toEqual([]);
  });
});
