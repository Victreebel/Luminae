import { FlaskConical, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BalanceLabFinishedControls({
  onReturnToLab,
  onViewBoard,
}: {
  onReturnToLab: () => void;
  onViewBoard: () => void;
}) {
  return (
    <section aria-label="Balance laboratory match complete" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/70">
          Laboratory
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <div className="rounded-md border border-cyan-300/30 bg-cyan-300/[0.07] p-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100">
          <FlaskConical className="h-4 w-4" />
          In-memory match complete
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Laboratory matches do not create persistent rooms, so ordinary rematches are unavailable.
          Save the playtest record, then return to launch the next experiment.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          size="lg"
          className="h-12 rounded-md bg-cyan-200 font-bold text-slate-950 shadow-[0_0_28px_rgba(103,232,249,0.24)] hover:bg-cyan-100"
          onClick={onReturnToLab}
        >
          <FlaskConical className="mr-2 h-4 w-4" />
          Return to Balance Lab
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 rounded-md border-white/30 bg-white/10 font-bold text-foreground hover:bg-white/15 hover:text-foreground"
          onClick={onViewBoard}
        >
          <LayoutGrid className="mr-2 h-4 w-4" />
          View Board
        </Button>
      </div>
    </section>
  );
}
