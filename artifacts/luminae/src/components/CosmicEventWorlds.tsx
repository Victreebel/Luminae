import type { CSSProperties } from 'react';
import type { CivilizationEventInstance, CivilizationEventPlayerOutcome, GamePlayerState } from '@workspace/api-client-react';
import type { CivilizationEventEffectProfile } from '@workspace/game-types';
import { getAvatarForPlayer } from '@/lib/avatars';

/** Visual response comes only from the public receipt, never from guessed targets. */
export function cosmicWorldResponse(profile: CivilizationEventEffectProfile, outcome?: CivilizationEventPlayerOutcome) {
  if (!outcome) return 'quiet';
  if (outcome.damagedArtifactIds?.length) return 'damaged';
  if (outcome.appliedConditionType || outcome.stabilityPressure > 0) return 'strained';
  if (outcome.outcomeId === 'exposed') return 'affected';
  if ((profile === 'containment_cascade' && outcome.outcomeId === 'protected') ||
    outcome.targetEvidence?.some(evidence => evidence.role === 'mitigator')) return 'shielded';
  if (['affinity_bloom', 'terminus_tide', 'signal_clarity'].includes(profile)) return 'resonant';
  return 'quiet';
}

/** Symbolic civilization worlds; an Artifact fault never cracks or destroys a planet. */
export function CosmicEventWorlds({ event, players, profile }: {
  event: CivilizationEventInstance;
  players: GamePlayerState[];
  profile: CivilizationEventEffectProfile;
}) {
  const count = event.affectedPlayerIds.length;
  return (
    <div className="cosmic-event-worlds" aria-hidden="true" data-testid="cosmic-event-worlds">
      {event.affectedPlayerIds.map((playerId, index) => {
        const player = players.find(candidate => candidate.playerId === playerId);
        const avatar = getAvatarForPlayer(player?.avatarId);
        const sideCount = Math.ceil(count / 2);
        const x = index < sideCount ? 14 + index * 17 : 86 - (count - index - 1) * 17;
        return (
          <figure key={playerId} className="cosmic-event-world" data-player-id={playerId}
            data-response={cosmicWorldResponse(profile, event.outcomesByPlayerId[playerId])}
            style={{ '--world-x': `${x}%`, '--world-mobile-x': `${(index + 0.5) / count * 100}%`, '--world-tint': avatar.accent, '--world-arrival': `${1.1 + Math.abs(50 - x) / 40 * 0.7}s` } as CSSProperties}>
            <div className="cosmic-event-world__body">
              <div className="cosmic-event-world__orbit" />
              <div className="cosmic-event-world__shield" />
              <div className="cosmic-event-world__impact" />
              <div className="cosmic-event-world__planet">
                <svg viewBox="0 0 100 100" className="cosmic-event-world__terrain" fill="currentColor">
                  <path d="M12 25Q19 13 27 16L31 13Q36 24 44 20L42 29Q53 34 37 41L41 47Q34 51 35 59L28 62Q25 53 21 47L14 46Q19 36 9 42ZM62 18Q72 26 81 24L78 31Q86 30 89 40L79 46Q82 54 75 61L68 58Q66 68 60 66L59 54Q49 48 63 38L59 30ZM38 75Q48 79 56 73L60 81Q71 86 49 94L43 87Q35 92 31 87Z" />
                  <g fill="none" stroke="#deedf2" strokeWidth="1.5" opacity=".22">
                    <path d="M9 31Q29 18 51 26T92 29M3 61Q23 49 44 57T96 56M18 81Q33 70 60 79" />
                  </g>
                  {[ [28, 35], [35, 43], [29, 50], [65, 32], [70, 45], [64, 55], [46, 80] ].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="0.7" fill="#fff1c4" />)}
                </svg>
                <div className="cosmic-event-world__shadow" />
                <div className="cosmic-event-world__aurora" />
              </div>
              <svg className="cosmic-event-world__infrastructure" viewBox="0 0 100 100" fill="none">
                <path d="M12 68 33 57 54 71 84 56M33 57l6-24 31 5 14 18M54 71l16-33" />
                {[ [12, 68], [33, 57], [54, 71], [84, 56], [39, 33], [70, 38] ].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2" />)}
              </svg>
              {player?.avatarId && <img className="cosmic-event-world__avatar" src={avatar.image} alt="" />}
            </div>
            <figcaption>{player?.civName || `${player?.playerName ?? 'Unknown'}’s civilization`}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
