import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface Props {
  hasProgress: boolean;
  savedBeat?: number;
  totalBeats?: number;
  onChoice: (choice: "begin" | "resume" | "start-over" | "cancel") => void;
}

export function TutorialStartModal({ hasProgress, savedBeat, totalBeats, onChoice }: Props) {
  const modalRef = useRef<HTMLElement | null>(null);
  useFocusTrap(modalRef, true, () => onChoice("cancel"));

  const stepDisplay =
    hasProgress && savedBeat != null && totalBeats != null
      ? `Step ${savedBeat + 1} of ${totalBeats}`
      : null;
  return (
    <AnimatePresence>
      <motion.div
        key="tutorial-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
        onClick={() => onChoice("cancel")}
      >
        <motion.div
          key="tutorial-modal-content"
          ref={(el) => { modalRef.current = el; }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-modal-title"
          initial={{ opacity: 0, scale: 0.88, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 28 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="relative w-full max-w-sm mx-5 rounded-3xl border border-white/10 bg-[#0c0c1a] p-7 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onChoice("cancel")}
            className="absolute top-4 right-4 text-white/35 hover:text-white/65 transition-colors"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex justify-center mb-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{
                background: "radial-gradient(circle, rgba(245,200,66,0.18) 0%, rgba(245,200,66,0.04) 100%)",
                border: "1px solid rgba(245,200,66,0.35)",
                boxShadow: "0 0 24px rgba(245,200,66,0.12)",
              }}
            >
              ✦
            </div>
          </div>

          <h2 id="tutorial-modal-title" className="text-center text-lg font-bold text-white mb-1.5">
            {hasProgress ? "Continue Your Journey" : "Enter the Threshold"}
          </h2>
          <p className="text-center text-xs text-white/45 mb-1 leading-relaxed">
            {hasProgress
              ? "Pick up where you left off, or start the journey anew."
              : "Lumii is waiting. Your civilization is ready to begin."}
          </p>
          {stepDisplay && (
            <p className="text-center text-xs font-semibold mb-6" style={{ color: "rgba(245,200,66,0.75)" }}>
              {stepDisplay}
            </p>
          )}
          {!stepDisplay && <div className="mb-6" />}

          <div className="flex flex-col gap-3">
            {hasProgress ? (
              <>
                <button
                  onClick={() => onChoice("resume")}
                  className="w-full py-3 rounded-2xl font-semibold text-sm transition-all"
                  style={{
                    background: "rgba(245,200,66,0.14)",
                    border: "1px solid rgba(245,200,66,0.38)",
                    color: "#f5c842",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,200,66,0.22)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,200,66,0.14)"; }}
                >
                  Resume Progress
                </button>
                <button
                  onClick={() => onChoice("start-over")}
                  className="w-full py-3 rounded-2xl font-semibold text-sm text-white/65 hover:text-white/85 hover:bg-white/10 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Start Over
                </button>
              </>
            ) : (
              <button
                onClick={() => onChoice("begin")}
                className="w-full py-3 rounded-2xl font-semibold text-sm transition-all"
                style={{
                  background: "rgba(245,200,66,0.14)",
                  border: "1px solid rgba(245,200,66,0.38)",
                  color: "#f5c842",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,200,66,0.22)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,200,66,0.14)"; }}
              >
                Begin Tutorial
              </button>
            )}
            <button
              onClick={() => onChoice("cancel")}
              className="w-full py-2 rounded-xl text-white/35 text-sm hover:text-white/60 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
