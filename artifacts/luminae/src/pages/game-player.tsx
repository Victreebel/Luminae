import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAvatarForPlayer } from '@/lib/avatars';
import { opponentTurnVariants } from './game-constants';
import { GEM_META, GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import { EminenceDiamond } from './game-card';

const NON_FLUX_KEYS = GEM_KEYS.filter(k => k !== 'flux');

export const PlayerAvatar = React.memo(function PlayerAvatar({ avatarId, name, size = 28 }: { avatarId?: string | null; name: string; size?: number }) {
  const avatar = getAvatarForPlayer(avatarId);
  return (
    <div
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
  effectiveTotals,
  isExpanded,
  onToggle,
}: {
  player: { playerId: string; playerName: string; avatarId?: string | null; lumens: number; isAi?: boolean };
  isActive: boolean;
  isLocalTurn: boolean;
  affinityTotals?: Partial<Record<GemKey, number>>;
  artifactTotals?: Partial<Record<GemKey, number>>;
  effectiveTotals?: Partial<Record<GemKey, number>>;
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  const dimmed = !isActive && !isLocalTurn;
  return (
    <div className="flex flex-col items-center gap-0 shrink-0">
      <motion.div
        data-opponent-chip={player.playerId}
        initial={false}
        animate={isActive ? 'active' : 'idle'}
        variants={opponentTurnVariants}
        onClick={onToggle}
        className={`relative flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
          onToggle ? 'cursor-pointer' : ''
        } ${
          isActive
            ? 'ring-1 ring-primary bg-primary/10 text-foreground'
            : dimmed
            ? 'bg-secondary/40 text-muted-foreground/50'
            : 'bg-secondary/60 text-muted-foreground'
        }`}
      >
        <PlayerAvatar avatarId={player.avatarId} name={player.playerName} size={20} />
        {isActive && player.isAi ? (
          <svg className="h-2.5 w-2.5 animate-spin text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isActive ? (
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
        ) : null}
        <span className="truncate max-w-[60px]">{player.playerName}</span>
        <span className={`shrink-0 flex items-center gap-0.5 text-[10px] font-bold tabular-nums leading-none ${isActive ? 'text-amber-300/90' : dimmed ? 'text-amber-400/35' : 'text-amber-400/60'}`}>
          {player.lumens}<EminenceDiamond size={7} />
        </span>
      </motion.div>

      {isExpanded && affinityTotals && (
        <div
          style={{
            marginTop: 3,
            padding: '4px 7px',
            borderRadius: 5,
            background: 'rgba(0,0,0,0.40)',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* Row 1: artifact counts per affinity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Hollow rectangle icon — card silhouette */}
            <svg
              width={10}
              height={8}
              viewBox="0 0 10 8"
              style={{ flexShrink: 0, opacity: 0.55 }}
            >
              <rect x={0.5} y={0.5} width={9} height={7} rx={1} fill="none" stroke="white" strokeWidth={1} />
            </svg>
            {NON_FLUX_KEYS.map(key => {
              const meta = GEM_META[key];
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

          {/* Row 2: crystal token counts per affinity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Filled circle icon — token */}
            <svg
              width={10}
              height={10}
              viewBox="0 0 10 10"
              style={{ flexShrink: 0, opacity: 0.55 }}
            >
              <circle cx={5} cy={5} r={4} fill="white" />
            </svg>
            {NON_FLUX_KEYS.map(key => {
              const meta = GEM_META[key];
              const val = affinityTotals[key] ?? 0;
              return (
                <span
                  key={key}
                  title={`${meta.name} crystals: ${val}`}
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

          {/* Row 3: effective production (crystals + card bonuses + active Luminary bonus) */}
          {effectiveTotals && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Lightning bolt icon — effective production */}
              <svg
                width={10}
                height={10}
                viewBox="0 0 10 10"
                style={{ flexShrink: 0, opacity: 0.7 }}
              >
                <polygon points="6,1 3,5.5 5.5,5.5 4,9 7,4.5 4.5,4.5" fill="white" />
              </svg>
              {NON_FLUX_KEYS.map(key => {
                const meta = GEM_META[key];
                const val = effectiveTotals[key] ?? 0;
                return (
                  <span
                    key={key}
                    title={`${meta.name} effective production: ${val}`}
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
          )}
        </div>
      )}
    </div>
  );
}

export function RematchCountdown({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, endsAt - Date.now());
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [endsAt]);
  const secs = Math.ceil(remaining / 1000);
  const pct = Math.min(100, (remaining / 5000) * 100);
  return (
    <div className="space-y-1">
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Starting in {secs}s…
      </p>
    </div>
  );
}
