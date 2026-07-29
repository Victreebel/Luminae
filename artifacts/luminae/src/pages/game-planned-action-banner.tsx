import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarX } from 'lucide-react';
import type { GamePlayerState, GameState } from '@workspace/api-client-react';
import { getPlannedActionSummary } from './game-action-summary';

export interface PlannedActionBannerProps {
  plannedAction: Record<string, unknown> | null;
  state: GameState;
  player: GamePlayerState | null | undefined;
  onCancelPlan: () => void | Promise<void>;
}

export function PlannedActionBanner({ plannedAction, state, player, onCancelPlan }: PlannedActionBannerProps) {
  return (
    <>
      {/* ── Pending action banner — slides down from the header ── */}
      <AnimatePresence>
        {plannedAction && (
          <motion.div
            key="pending-action-box"
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-0 right-0 z-[19] pointer-events-auto"
            style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
          >
            <div
              className="flex items-center gap-3 px-4 py-2.5 border-b"
              style={{
                background: 'rgba(45, 24, 4, 0.93)',
                borderColor: 'rgba(251, 191, 36, 0.28)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(251, 191, 36, 0.6)' }}>Pending action</span>
                <span className="text-xs font-medium text-amber-100/90 truncate leading-snug">
                  {getPlannedActionSummary(plannedAction, state, player)}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancelPlan}
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                <CalendarX className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </>
  );
}
