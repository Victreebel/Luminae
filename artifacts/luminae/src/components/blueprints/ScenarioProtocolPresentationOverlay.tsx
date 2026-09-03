import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { EyeOff, RadioTower, ShieldAlert } from "lucide-react";
import type {
  ScenarioProtocolEvent,
} from "@workspace/api-client-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

const DISPLAY_MS = 5_200;
const INPUT_GUARD_MS = 360;

function protocolLabel(slotIndex: number): string {
  return `SEALED PROTOCOL // ${String(slotIndex + 1).padStart(2, "0")}`;
}

function consequenceText(event: ScenarioProtocolEvent): string | null {
  if (event.kind === "manifestation") return "A protocol has manifested on the board.";
  if (event.intercepted) return "The hostile consequence was intercepted.";
  const effect = event.hostileEffect?.replaceAll("_", " ");
  if (!effect) return null;
  return `${effect.toUpperCase()}${event.trigger ? ` ON ${event.trigger.toUpperCase()}` : ""}`;
}

export function ScenarioProtocolPresentationOverlay({
  event,
  reducedMotion,
  onComplete,
}: {
  event: ScenarioProtocolEvent;
  reducedMotion: boolean;
  onComplete: () => void;
}) {
  const completeRef = useRef(onComplete);
  const completedRef = useRef(false);
  const guardUntilRef = useRef(Date.now() + INPUT_GUARD_MS);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetName = event.targetArtifact?.name ?? null;
  const collateralCount = event.collateralArtifacts?.length ?? event.collateralCardIds?.length ?? 0;
  const consequence = consequenceText(event);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = false;
    guardUntilRef.current = Date.now() + (reducedMotion ? 80 : INPUT_GUARD_MS);
    const timer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      completeRef.current();
    }, reducedMotion ? 1_400 : DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [event.eventId, reducedMotion]);

  const finish = () => {
    if (completedRef.current || Date.now() < guardUntilRef.current) return;
    completedRef.current = true;
    completeRef.current();
  };

  useFocusTrap(containerRef, true, () => undefined, { handleEscape: false });

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-[12000] grid cursor-pointer place-items-center bg-black/78 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${protocolLabel(event.slotIndex)} ${event.kind}`}
      tabIndex={0}
      onClick={finish}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") finish();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.08 : 0.28 }}
    >
      <motion.section
        className="relative w-full max-w-lg overflow-hidden border border-white/20 bg-[#05070b]/95 px-5 py-6 text-center shadow-[0_0_70px_rgba(202,225,255,0.12)] sm:px-8 sm:py-8"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0.08 : 0.34 }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0 4px, rgba(220,235,255,.12) 5px)",
        }} />
        <div className="relative">
          <span className="mx-auto grid h-12 w-12 place-items-center border border-white/25 bg-white/[0.04] text-white/75">
            {event.kind === "manifestation"
              ? <RadioTower className="h-6 w-6" aria-hidden="true" />
              : <ShieldAlert className="h-6 w-6" aria-hidden="true" />}
          </span>
          <p className="mt-5 font-mono text-[10px] font-bold uppercase text-white/50">
            {event.kind === "manifestation" ? "PROTOCOL MANIFESTATION" : "PROTOCOL CONSEQUENCE"}
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-white sm:text-3xl">
            {protocolLabel(event.slotIndex)}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/72">{event.publicEffect}</p>
          {consequence && <strong className="mt-4 block text-xs uppercase text-red-100/80">{consequence}</strong>}
          {(targetName || collateralCount > 0) && (
            <div className="mt-4 border-y border-white/10 py-3 text-[11px] text-white/62">
              {targetName && <p>Target: {targetName}</p>}
              {collateralCount > 0 && <p>Tier I collateral: {collateralCount}</p>}
            </div>
          )}
          <p className="mt-5 flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase text-white/34">
            <EyeOff className="h-3 w-3" aria-hidden="true" /> Identity redacted
          </p>
        </div>
      </motion.section>
    </motion.div>
  );
}
