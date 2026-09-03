import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { RadioTower } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  apiAcknowledgeArchitectRecordPresentation,
  apiGetArchitectRecord,
  type ArchitectRecordState,
} from "@/lib/accountSession";
import { LumiiOrb } from "@/components/LumiiTutorial";
import { trackFirstPartyEvent } from "@/lib/firstPartyTelemetry";

export function ArchitectRecordContinuity() {
  const [location] = useLocation();
  const { account, token } = useAccount();
  const [record, setRecord] = useState<ArchitectRecordState | null>(null);
  const [pending, setPending] = useState(false);
  const [acknowledgementError, setAcknowledgementError] = useState<string | null>(null);
  const [deferredPresentationIds, setDeferredPresentationIds] = useState<Set<string>>(() => new Set());
  const dialogRef = useRef<HTMLElement | null>(null);
  const activePresentation = record?.pendingPresentations.find(
    (presentation) => !deferredPresentationIds.has(presentation.id),
  ) ?? null;
  const canPresent = !location.startsWith("/game/") && location !== "/tutorial";

  const refresh = useCallback(async () => {
    if (!token || !account) {
      setRecord(null);
      return;
    }
    const next = await apiGetArchitectRecord(token);
    setRecord(next);
  }, [account, token]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [location, refresh]);

  useEffect(() => {
    setDeferredPresentationIds(new Set());
    setAcknowledgementError(null);
  }, [account?.id]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useFocusTrap(dialogRef, Boolean(activePresentation && canPresent), () => undefined, {
    handleEscape: false,
  });

  const acknowledge = async () => {
    if (!token || !activePresentation || pending) return;
    setPending(true);
    setAcknowledgementError(null);
    try {
      await apiAcknowledgeArchitectRecordPresentation(token, activePresentation.id);
      trackFirstPartyEvent({
        eventName: "interlude_acknowledged",
        outcome: "accepted",
        ordinal: activePresentation.ordinal,
      });
      setRecord((current) => current ? {
        ...current,
        pendingPresentations: current.pendingPresentations.filter(
          (presentation) => presentation.id !== activePresentation.id,
        ),
      } : current);
    } catch {
      setAcknowledgementError("The signal could not be recorded. Try again, or return to it later in the Vault.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AnimatePresence>
      {activePresentation && canPresent && (
        <motion.div
          className="fixed inset-0 z-[14000] flex items-center justify-center bg-black/80 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            ref={(element) => { dialogRef.current = element; }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="architect-record-interlude-title"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="w-full max-w-sm rounded-lg border border-white/15 bg-[#070916] p-5 shadow-2xl"
          >
            <header className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                <LumiiOrb size={34} excited={activePresentation.ordinal >= 4} highlightZone={null} />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-cyan-200/65">
                  <RadioTower className="h-3 w-3" aria-hidden="true" /> Architect Record
                </p>
                <h2 id="architect-record-interlude-title" className="mt-1 text-lg font-semibold text-white">
                  {activePresentation.title}
                </h2>
              </div>
            </header>
            <div className="space-y-3 text-sm leading-relaxed text-white/80">
              {activePresentation.lines.map((line) => <p key={line}>{line}</p>)}
            </div>
            {acknowledgementError && (
              <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs leading-relaxed text-rose-100/80" role="alert">
                {acknowledgementError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void acknowledge()}
              disabled={pending}
              className="mt-6 w-full rounded-md bg-cyan-100 px-4 py-3 text-sm font-bold text-[#071019] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Recording..." : "Record signal"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDeferredPresentationIds((current) => new Set(current).add(activePresentation.id));
                setAcknowledgementError(null);
              }}
              disabled={pending}
              className="mt-2 w-full rounded-md px-4 py-2 text-sm font-semibold text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/75 disabled:opacity-40"
            >Later</button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
