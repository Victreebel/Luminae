import { useLocation } from "wouter";
import { Compass, House } from "lucide-react";
import {
  LuminaeWordmark,
  OutOfMatchBackdrop,
  OutOfMatchHeader,
  OutOfMatchSectionHeading,
} from "@/components/out-of-match/OutOfMatchChrome";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="oom-shell min-h-[100dvh] flex flex-col">
      <OutOfMatchBackdrop />
      <OutOfMatchHeader left={<LuminaeWordmark onClick={() => setLocation("/")} />} />
      <main className="oom-frame relative z-10 flex flex-1 items-center justify-center py-8">
        <section className="oom-panel w-full max-w-md p-5 sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <Compass className="h-5 w-5" />
            </span>
            <OutOfMatchSectionHeading eyebrow="Uncharted Space" title="This Route Leads Nowhere" />
          </div>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            The destination may have moved or no longer exists. Your account and active matches are unaffected.
          </p>
          <button type="button" className="oom-action-primary h-12" onClick={() => setLocation("/")}>
            <House className="h-4 w-4" />
            Return to Main Menu
          </button>
        </section>
      </main>
    </div>
  );
}
