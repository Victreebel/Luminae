import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarForPlayer } from '@/lib/avatars';
import { opponentTurnVariants } from './game-constants';

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
  absorbPulse = 0,
}: {
  player: { playerId: string; playerName: string; avatarId?: string | null; lumens: number; isAi?: boolean };
  isActive: boolean;
  isLocalTurn: boolean;
  absorbPulse?: number;
}) {
  const dimmed = !isActive && !isLocalTurn;
  return (
    <motion.div
      data-opponent-chip={player.playerId}
      initial={false}
      animate={isActive ? 'active' : 'idle'}
      variants={opponentTurnVariants}
      className={`relative flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${
        isActive
          ? 'ring-1 ring-primary bg-primary/10 text-foreground'
          : dimmed
          ? 'bg-secondary/40 text-muted-foreground/50'
          : 'bg-secondary/60 text-muted-foreground'
      }`}
    >
      <AnimatePresence>
        {absorbPulse > 0 && (
          <motion.span
            key={absorbPulse}
            className="pointer-events-none absolute inset-[-2px] rounded-full"
            initial={{ boxShadow: '0 0 0 2px rgba(99,102,241,0.75), 0 0 14px 5px rgba(99,102,241,0.45)' }}
            animate={{ boxShadow: '0 0 0 5px rgba(99,102,241,0), 0 0 20px 10px rgba(99,102,241,0)' }}
            exit={{}}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
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
    </motion.div>
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
