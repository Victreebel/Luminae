import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Play, RotateCcw, X } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { BEAT_INDEX, getTutorialChapter, TUTORIAL_CHAPTERS } from "@/lib/tutorialData";
import { OutOfMatchSectionHeading } from "@/components/out-of-match/OutOfMatchChrome";

interface Props {
  hasProgress: boolean;
  savedBeat?: number;
  totalBeats?: number;
  completed?: boolean;
  onChoice: (choice: "begin" | "resume" | "start-over" | "cancel") => void;
  onSelectChapter?: (beat: number) => void;
}

export function TutorialStartModal({ hasProgress, savedBeat, totalBeats, completed = false, onChoice, onSelectChapter }: Props) {
  const modalRef = useRef<HTMLElement | null>(null);
  useFocusTrap(modalRef, true, () => onChoice("cancel"));

  const chapter = hasProgress && savedBeat != null ? getTutorialChapter(savedBeat) : null;
  const stepDisplay = chapter
    ? `Lesson ${chapter.chapterNumber} of ${chapter.totalChapters} · ${chapter.label}`
    : hasProgress && savedBeat != null && totalBeats != null
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
        onClick={() => onChoice("cancel")}
      >
        <motion.div
          key="tutorial-modal-content"
          ref={(el) => { modalRef.current = el; }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-start-title"
          initial={{ opacity: 0, scale: 0.88, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 28 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="oom-panel oom-panel--gold relative w-full max-w-sm p-5 shadow-2xl sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onChoice("cancel")}
            className="oom-icon-button absolute right-4 top-4 h-8 w-8"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-5 flex items-start gap-3 pr-10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#e5c56f]/35 bg-[#e5c56f]/10 text-[#e5c56f]">
              <BookOpen className="h-5 w-5" />
            </span>
            <OutOfMatchSectionHeading
              eyebrow="Guided Match"
              title={completed ? "Replay Tutorial" : hasProgress ? "Continue Tutorial" : "Learn Luminae"}
              titleId="tutorial-start-title"
            />
          </div>

          <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
            {completed
              ? "Choose a chapter to revisit, or continue a replay already in progress."
              : hasProgress
              ? "Resume your current lesson, or restart from the beginning."
              : "Practice the four core actions on a playable board with Lumii."}
          </p>
          {stepDisplay && (
            <p className="mb-6 mt-2 text-xs font-semibold text-[#e5c56f]/80">
              {stepDisplay}
            </p>
          )}
          {!stepDisplay && <div className="mb-6" />}

          <div className="flex flex-col gap-3">
            {completed ? (
              <>
                {hasProgress && (
                  <button
                    onClick={() => onChoice("resume")}
                    className="oom-action-primary h-12"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Resume Replay
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2" aria-label="Tutorial chapters">
                  {TUTORIAL_CHAPTERS.map((tutorialChapter, index) => (
                    <button
                      key={tutorialChapter.id}
                      type="button"
                      onClick={() => onSelectChapter?.(BEAT_INDEX[tutorialChapter.startBeatId] ?? 0)}
                      className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-3 text-left transition-colors hover:border-[#e5c56f]/35 hover:bg-[#e5c56f]/[0.07]"
                    >
                      <span className="block text-[10px] font-bold uppercase text-[#e5c56f]/70">Chapter {index + 1}</span>
                      <span className="mt-1 block text-xs font-semibold text-foreground">{tutorialChapter.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : hasProgress ? (
              <>
                <button
                  onClick={() => onChoice("resume")}
                  className="oom-action-primary h-12"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Resume Progress
                </button>
                <button
                  onClick={() => onChoice("start-over")}
                  className="oom-action-secondary h-12"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start Over
                </button>
              </>
            ) : (
              <button
                onClick={() => onChoice("begin")}
                className="oom-action-primary h-12"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Tutorial
              </button>
            )}
            <button
              onClick={() => onChoice("cancel")}
              className="w-full rounded-md py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
