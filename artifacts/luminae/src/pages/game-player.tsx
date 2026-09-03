import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { getAvatarForPlayer, LUMII_AVATAR_ID } from '@/lib/avatars';
import { opponentTurnVariants } from './game-constants';
import { AFFINITY_META, AFFINITY_KEYS, type AffinityKey } from '@/lib/affinityMeta';
import { EminenceDiamond } from './game-card';
import { LumiiOrb } from '@/components/LumiiTutorial';

const NON_FLUX_KEYS = AFFINITY_KEYS.filter(k => k !== 'singularity');

export const PlayerAvatar = React.memo(function PlayerAvatar({
  avatarId,
  name,
  size = 28,
  opponentRecipientId,
}: {
  avatarId?: string | null;
  name: string;
  size?: number;
  opponentRecipientId?: string;
}) {
  const avatar = getAvatarForPlayer(avatarId);
  if (avatarId === LUMII_AVATAR_ID) {
    return (
      <div
        data-opponent-avatar={opponentRecipientId}
        className="grid shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-[#050719]"
        style={{ width: size, height: size, borderColor: `${avatar.accent}88` }}
        title={name}
        role="img"
        aria-label={name}
      >
        <LumiiOrb size={size * 0.88} highlightZone={null} />
      </div>
    );
  }
  return (
    <div
      data-opponent-avatar={opponentRecipientId}
      className="rounded-full overflow-hidden shrink-0 border-2"
      style={{ width: size, height: size, borderColor: `${avatar.accent}88` }}
      title={name}
    >
      <img
        src={avatar.image}
        alt={name}
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />
    </div>
  );
});

export function OpponentChip({
  player,
  isActive,
  isLocalTurn,
  affinityTotals,
  artifactTotals,
  isExpanded,
  onToggle,
  eminenceImpact,
}: {
  player: { playerId: string; playerName: string; avatarId?: string | null; eminence: number; isAi?: boolean };
  isActive: boolean;
  isLocalTurn: boolean;
  affinityTotals?: Partial<Record<AffinityKey, number>>;
  artifactTotals?: Partial<Record<AffinityKey, number>>;
  isExpanded?: boolean;
  onToggle?: () => void;
  eminenceImpact?: { key: number; amount: number } | null;
}) {
  const dimmed = !isActive && !isLocalTurn;
  return (
    <div className={`opponent-chip-shell flex flex-col items-center gap-0 shrink-0 ${isExpanded ? 'opponent-chip-shell--detailed' : ''}`}>
      <motion.div
        data-opponent-chip={player.playerId}
        initial={false}
        animate={isActive ? 'active' : 'idle'}
        variants={opponentTurnVariants}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (!onToggle || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          onToggle();
        }}
        role={onToggle ? 'button' : undefined}
        tabIndex={onToggle ? 0 : undefined}
        aria-expanded={onToggle ? Boolean(isExpanded) : undefined}
        aria-label={onToggle ? `${isExpanded ? 'Collapse' : 'Expand'} ${player.playerName} details` : undefined}
        className={`relative flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
          onToggle ? 'cursor-pointer' : ''
        } ${
          eminenceImpact ? 'opponent-chip-eminence-impact' : ''
        } ${
          isActive
            ? 'ring-1 ring-primary bg-primary/10 text-foreground'
            : dimmed
            ? 'bg-secondary/40 text-muted-foreground/50'
            : 'bg-secondary/60 text-muted-foreground'
        }`}
      >
        <PlayerAvatar
          avatarId={player.avatarId}
          name={player.playerName}
          size={20}
          opponentRecipientId={player.playerId}
        />
        {isActive && player.isAi ? (
          <svg className="h-2.5 w-2.5 animate-spin text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isActive ? (
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
        ) : null}
        <span className="opponent-chip-name truncate max-w-[60px]" title={player.playerName}>{player.playerName}</span>
        <span className={`opponent-chip-eminence shrink-0 flex items-center gap-0.5 text-[10px] font-bold tabular-nums leading-none ${isActive ? 'text-amber-300/90' : dimmed ? 'text-amber-400/35' : 'text-amber-400/60'}`}>
          {player.eminence}
          <span
            key={`opponent-eminence-sigil-${player.playerId}-${eminenceImpact?.key ?? 'idle'}`}
            data-eminence-sigil={`opponent-${player.playerId}`}
            className={`opponent-chip-eminence-sigil ${eminenceImpact ? 'opponent-chip-eminence-sigil--impact' : ''}`}
          >
            <EminenceDiamond size={7} />
          </span>
        </span>
        {eminenceImpact && (
          <span key={eminenceImpact.key} className="opponent-chip-eminence-label">
            +{eminenceImpact.amount}
          </span>
        )}
        {onToggle && (
          <ChevronDown
            aria-hidden="true"
            className={`opponent-chip-disclosure absolute bottom-0.5 right-0.5 h-2 w-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        )}
      </motion.div>

      {isExpanded && affinityTotals && (
        <div
          className="opponent-chip-details"
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Row 1: artifact counts per affinity */}
          <div className="opponent-chip-detail-row" data-opponent-stat-row="artifacts">
            {NON_FLUX_KEYS.map(key => {
              const meta = AFFINITY_META[key];
              const val = artifactTotals?.[key] ?? 0;
              return (
                <span
                  key={key}
                  title={`${meta.name} artifacts: ${val}`}
                  style={{
                    color: val > 0 ? meta.hex : 'rgba(255,255,255,0.15)',
                    fontSize: 9,
                    fontWeight: 700,
                    lineHeight: 1,
                    minWidth: 9,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {val}
                </span>
              );
            })}
          </div>

          {/* Row 2: affinity token counts */}
          <div className="opponent-chip-detail-row" data-opponent-stat-row="affinities">
            {NON_FLUX_KEYS.map(key => {
              const meta = AFFINITY_META[key];
              const val = affinityTotals[key] ?? 0;
              return (
                <span
                  key={key}
                  title={`${meta.name} affinity tokens: ${val}`}
                  style={{
                    color: val > 0 ? meta.hex : 'rgba(255,255,255,0.15)',
                    fontSize: 9,
                    fontWeight: 700,
                    lineHeight: 1,
                    minWidth: 9,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {val}
                </span>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
