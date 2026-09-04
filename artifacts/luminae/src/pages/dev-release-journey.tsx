import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  Clipboard,
  ExternalLink,
  Flag,
  Gauge,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { saveSession } from "@/lib/session";
import { apiUrl } from "@/lib/network";
import {
  appendUxReviewEvent,
  beginCheckpointUxReview,
  beginSignedOutUxReview,
  clearUxReviewCapture,
  createUxReviewSession,
  formatUxReviewFeedbackContext,
  getUxReviewContext,
  getUxReviewCoverage,
  getUxReviewEvents,
  getUxReviewRun,
  markUxReviewCoverage,
  openUxReviewPlayer,
  type UxReviewCheckpointId,
  type UxReviewContext,
  type UxReviewEvent,
  type UxReviewRun,
  type UxReviewSessionResponse,
} from "@/lib/uxReview";
import "./dev-release-journey.css";

type ChronicleKind = "trace" | "recurrence" | "triangulation";

interface JourneyStage {
  id: string;
  title: string;
  stateLabel: string;
  checkpointId: UxReviewCheckpointId | "signed_out";
  leadInPath: string;
  directPath?: string;
  chronicle?: ChronicleKind;
  description: string;
  focus: string;
}

const JOURNEY_STAGES: readonly JourneyStage[] = [
  {
    id: "first-launch",
    title: "First launch and account entry",
    stateLabel: "Authentic",
    checkpointId: "signed_out",
    leadInPath: "/",
    description: "No session, tutorial memory, hints, or cached progression.",
    focus: "Can a new player understand what Luminae is and what to do first?",
  },
  {
    id: "tutorial",
    title: "Lumii tutorial",
    stateLabel: "Fresh account",
    checkpointId: "fresh",
    leadInPath: "/",
    directPath: "/tutorial",
    description: "A disposable account with untouched preferences and no progress.",
    focus: "Do the rules, language, pacing, and Civilization introduction make sense?",
  },
  {
    id: "standard-play",
    title: "Dashboard and standard play",
    stateLabel: "Post-tutorial",
    checkpointId: "post_tutorial",
    leadInPath: "/dashboard",
    description: "Tutorial complete; no Chronicle or Vault history has been added.",
    focus: "Is the next meaningful action obvious without feeling over-directed?",
  },
  {
    id: "trace",
    title: "The Trace",
    stateLabel: "Chronicle 01",
    checkpointId: "trace_ready",
    leadInPath: "/dashboard/archive",
    chronicle: "trace",
    description: "The first Chronicle is available with no authored history behind it.",
    focus: "Can a general audience understand the crisis, their role, and the consequences?",
  },
  {
    id: "recurrence",
    title: "The Recurrence",
    stateLabel: "Chronicle 02",
    checkpointId: "recurrence_ready",
    leadInPath: "/dashboard/archive",
    chronicle: "recurrence",
    description: "The Trace is recorded through a representative fail-forward outcome.",
    focus: "Does the story remember prior history while remaining comprehensible on its own?",
  },
  {
    id: "triangulation",
    title: "The Triangulation",
    stateLabel: "Chronicle 03",
    checkpointId: "triangulation_ready",
    leadInPath: "/dashboard/archive",
    chronicle: "triangulation",
    description: "The first two Chronicles are present; Triangulation is ready to enter.",
    focus: "Are the three societies, the coordination problem, and each choice legible?",
  },
  {
    id: "threshold",
    title: "The Threshold and Defense Forecast",
    stateLabel: "Boss lead-in",
    checkpointId: "vault_ready",
    leadInPath: "/dashboard/archive/vault",
    description: "All three Chronicles and the five-win access condition are present.",
    focus: "Do Lumii's behavior, dialogue routes, escalation, and conflict feel inevitable?",
  },
  {
    id: "vault-reveal",
    title: "Vault opening and Antimatter reveal",
    stateLabel: "Unseen victory",
    checkpointId: "vault_reveal",
    leadInPath: "/dashboard/archive/vault",
    description: "Lumii has yielded, but the victory opening has not yet been acknowledged.",
    focus: "Does the reward sequence feel earned, cinematic, and mechanically clear?",
  },
  {
    id: "vault-hub",
    title: "Stable post-Lumii Vault hub",
    stateLabel: "Launch endpoint",
    checkpointId: "vault_hub",
    leadInPath: "/dashboard/archive/vault",
    description: "Antimatter is recovered and later story records remain deliberately sealed.",
    focus: "Does the release endpoint feel complete while making future story inviting?",
  },
] as const;

interface ChronicleSession {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
}

async function startChronicle(
  kind: ChronicleKind,
  review: UxReviewSessionResponse,
): Promise<string> {
  const response = await fetch(apiUrl(`/chronicles/${kind}/start`), {
    method: "POST",
    headers: { Authorization: `Bearer ${review.session.token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `Could not start ${kind}` }));
    throw new Error(body.error ?? `Could not start ${kind}`);
  }
  const chronicle = await response.json() as ChronicleSession;
  saveSession({
    roomId: chronicle.roomId,
    inviteCode: chronicle.inviteCode,
    playerId: chronicle.playerId,
    sessionToken: chronicle.sessionToken,
    playerName: review.session.account.username,
    isHost: true,
    isGuidedMatch: true,
  });
  return `/game/${chronicle.roomId}`;
}

function eventSummary(event: UxReviewEvent): string {
  if (event.type === "navigation") return `Opened ${String(event.detail.route ?? "a route")}`;
  if (event.type === "mark") return `Marked ${String(event.detail.route ?? "the current moment")}`;
  if (event.type === "network") return event.detail.online ? "Connection restored" : "Connection lost";
  if (event.type === "visibility") return `Player tab ${String(event.detail.state ?? "changed")}`;
  return String(event.detail.message ?? event.type);
}

export default function DevReleaseJourney() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [run, setRun] = useState<UxReviewRun | null>(() => getUxReviewRun());
  const [context, setContext] = useState<UxReviewContext | null>(() => getUxReviewContext());
  const [events, setEvents] = useState<UxReviewEvent[]>(() => getUxReviewEvents());
  const [coverage, setCoverage] = useState<string[]>(() => getUxReviewCoverage());
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRun(getUxReviewRun());
      setContext(getUxReviewContext());
      setEvents(getUxReviewEvents());
      setCoverage(getUxReviewCoverage());
    }, 750);
    return () => window.clearInterval(timer);
  }, []);

  const completedCount = useMemo(
    () => JOURNEY_STAGES.filter((stage) => coverage.includes(stage.id)).length,
    [coverage],
  );

  const openPlayer = (path: string) => {
    const player = openUxReviewPlayer(path);
    if (!player) throw new Error("The player tab was blocked. Allow pop-ups for localhost and try again.");
    player.focus();
  };

  const beginSignedOut = async (stage: JourneyStage) => {
    setBusy(stage.id);
    setError(null);
    setStatus(null);
    try {
      const nextRun = await beginSignedOutUxReview();
      markUxReviewCoverage(stage.id);
      setCoverage(getUxReviewCoverage());
      setCredentials(null);
      setRun(nextRun);
      openPlayer(stage.leadInPath);
      setStatus("Signed-out player tab opened with Luminae client state cleared.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not begin the audit");
    } finally {
      setBusy(null);
    }
  };

  const openStage = async (stage: JourneyStage, direct = false) => {
    if (stage.checkpointId === "signed_out") {
      await beginSignedOut(stage);
      return;
    }
    const actionId = `${stage.id}:${direct ? "direct" : "lead"}`;
    setBusy(actionId);
    setError(null);
    setStatus(null);
    try {
      const review = await createUxReviewSession(stage.checkpointId);
      const nextRun = await beginCheckpointUxReview(review);
      let destination = direct && stage.directPath ? stage.directPath : stage.leadInPath;
      if (direct && stage.chronicle) destination = await startChronicle(stage.chronicle, review);
      markUxReviewCoverage(stage.id);
      setCoverage(getUxReviewCoverage());
      setCredentials(review.credentials);
      setRun(nextRun);
      openPlayer(destination);
      setStatus(`${stage.title} opened in the dedicated player tab.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : `Could not open ${stage.title}`);
    } finally {
      setBusy(null);
    }
  };

  const markCurrentMoment = () => {
    appendUxReviewEvent("mark", {
      route: context?.route ?? null,
      label: "Marked from review console",
    });
    setEvents(getUxReviewEvents());
    setStatus("Moment marked. Tell Codex what felt wrong while the player screen remains open.");
  };

  const copyContext = async () => {
    const text = formatUxReviewFeedbackContext(context, events);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Feedback context copied.");
    } catch {
      setError("Clipboard access was unavailable. Keep the player tab open and describe the moment directly.");
    }
  };

  const clearCapture = () => {
    clearUxReviewCapture();
    setContext(null);
    setEvents([]);
    setStatus("Captured events cleared. Journey coverage was preserved.");
  };

  return (
    <div className="ux-review-root">
      <header className="ux-review-header">
        <div className="ux-review-brand">
          <span className="ux-review-brand-mark" aria-hidden="true"><Gauge size={18} /></span>
          <div>
            <h1>LUMINAe Release Journey</h1>
            <p>Development-only UI/UX review console</p>
          </div>
        </div>
        <div className="ux-review-build">
          <div>{completedCount}/{JOURNEY_STAGES.length} stages opened</div>
          <div>{__LUMINAE_BUILD_LABEL__}</div>
        </div>
      </header>

      <main className="ux-review-main">
        <section className="ux-review-intro" aria-labelledby="ux-review-title">
          <div>
            <p className="ux-review-eyebrow">Fresh-player audit through the Vault release</p>
            <h2 id="ux-review-title">Experience the game. Mark the friction. Keep the player screen clean.</h2>
            <p className="ux-review-intro-copy">
              The player opens in a separate tab with production components and no review overlay. Checkpoints
              create disposable local accounts; they accelerate review without rewriting any played account history.
            </p>
          </div>
          <div className="ux-review-actions">
            <button
              type="button"
              className="ux-review-button ux-review-button-primary"
              onClick={() => void beginSignedOut(JOURNEY_STAGES[0])}
              disabled={busy !== null}
            >
              <Play size={15} /> Begin at first launch
            </button>
            <button
              type="button"
              className="ux-review-button"
              onClick={() => openPlayer(context?.route ?? "/")}
            >
              <ExternalLink size={15} /> Open player tab
            </button>
          </div>
        </section>

        <section className="ux-review-tutorial" aria-labelledby="audit-tutorial-title">
          <div className="ux-review-section-heading">
            <h3 id="audit-tutorial-title">Three-minute audit tutorial</h3>
            <span>No forms required</span>
          </div>
          <div className="ux-review-tutorial-grid">
            <div className="ux-tutorial-step">
              <span className="ux-tutorial-number">1</span>
              <strong>Play as a new customer</strong>
              <p>Use the separate player tab normally. Resist explaining the interface to yourself or hunting for intended behavior.</p>
            </div>
            <div className="ux-tutorial-step">
              <span className="ux-tutorial-number">2</span>
              <strong>Stop at the feeling</strong>
              <p>Leave the screen exactly where it is. For a fleeting problem, press <b>Cmd/Ctrl + Shift + M</b> to mark the moment.</p>
            </div>
            <div className="ux-tutorial-step">
              <span className="ux-tutorial-number">3</span>
              <strong>Tell Codex naturally</strong>
              <p>Say what you tried, expected, saw, and felt. Example: “I chose this because I expected X, but Y happened and I felt lost.”</p>
            </div>
          </div>
        </section>

        {error && <div className="ux-review-error" role="alert">{error}</div>}
        {status && <p className="ux-review-status" role="status">{status}</p>}

        <div className="ux-review-layout">
          <section aria-labelledby="journey-heading">
            <div className="ux-review-section-heading">
              <h3 id="journey-heading">Release journey</h3>
              <span>Lead-in preserves context; Direct opens the playable beat</span>
            </div>
            <div className="ux-journey-list">
              {JOURNEY_STAGES.map((stage, index) => {
                const complete = coverage.includes(stage.id);
                const leadBusy = busy === stage.id || busy === `${stage.id}:lead`;
                const directBusy = busy === `${stage.id}:direct`;
                const hasDirect = Boolean(stage.directPath || stage.chronicle);
                return (
                  <article key={stage.id} className={`ux-stage ${complete ? "ux-stage-complete" : ""}`}>
                    <span className="ux-stage-index" aria-label={complete ? "Opened" : `Stage ${index + 1}`}>
                      {complete ? <Check size={15} /> : String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="ux-stage-copy">
                      <div className="ux-stage-title-line">
                        <h4>{stage.title}</h4>
                        <span className="ux-stage-tag">{stage.stateLabel}</span>
                      </div>
                      <p>{stage.description}</p>
                      <p className="ux-stage-focus"><b>Audit:</b> {stage.focus}</p>
                    </div>
                    <div className="ux-stage-actions">
                      <button
                        type="button"
                        className="ux-review-button"
                        onClick={() => void openStage(stage)}
                        disabled={busy !== null}
                      >
                        {leadBusy ? <Activity size={14} /> : <ArrowUpRight size={14} />}
                        {stage.checkpointId === "signed_out" ? "Start" : "Lead-in"}
                      </button>
                      {hasDirect && (
                        <button
                          type="button"
                          className="ux-review-button ux-review-button-subtle"
                          onClick={() => void openStage(stage, true)}
                          disabled={busy !== null}
                        >
                          {directBusy ? <Activity size={14} /> : <Play size={14} />}
                          Direct
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="ux-review-side" aria-label="Review context">
            <section className="ux-side-section">
              <p className="ux-side-label">Current run</p>
              <div className="ux-run-state">
                {run ? (
                  <>
                    <strong>{run.checkpointId.replaceAll("_", " ")}</strong><br />
                    {run.username ?? "Signed out"}<br />
                    Started {new Date(run.startedAt).toLocaleTimeString()}
                    {run.syntheticState && (
                      <div className="ux-synthetic-warning">
                        <ShieldCheck size={15} />
                        <span>Checkpoint history is synthetic and exists only on this disposable review account.</span>
                      </div>
                    )}
                  </>
                ) : "No audit run is active."}
              </div>
              {credentials && (
                <div className="ux-credentials" aria-label="Disposable review credentials">
                  <span>user: {credentials.username}</span>
                  <span>pass: {credentials.password}</span>
                </div>
              )}
            </section>

            <section className="ux-side-section">
              <p className="ux-side-label">Live player context</p>
              <div className="ux-context-state">
                {context ? (
                  <>
                    <strong>{context.route}</strong><br />
                    {context.viewport.width} x {context.viewport.height}<br />
                    {context.online ? "Online" : "Offline"}
                    {context.performance && <> · {context.performance.sampledFps} fps sample</>}
                  </>
                ) : "Open a player stage to begin capture."}
              </div>
              <div className="ux-context-actions" style={{ marginTop: 12 }}>
                <button type="button" className="ux-review-button" onClick={markCurrentMoment} disabled={!context}>
                  <Flag size={14} /> Mark moment
                </button>
                <button type="button" className="ux-review-button" onClick={() => void copyContext()}>
                  <Clipboard size={14} /> Copy context
                </button>
                <button type="button" className="ux-review-button ux-review-button-subtle" onClick={clearCapture}>
                  <RotateCcw size={14} /> Clear
                </button>
              </div>
            </section>

            <section className="ux-side-section">
              <p className="ux-side-label">Recent signals</p>
              {events.length > 0 ? (
                <ul className="ux-event-list">
                  {events.slice(-7).reverse().map((event) => (
                    <li key={event.id} className={`ux-event ${event.type === "mark" ? "ux-event-mark" : ""}`}>
                      {new Date(event.at).toLocaleTimeString()} · {eventSummary(event)}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="ux-context-state">Navigation, marked moments, errors, and connection changes appear here.</div>
              )}
            </section>

            <section className="ux-side-section">
              <p className="ux-side-label">Useful shortcuts</p>
              <div className="ux-context-state">
                <BookOpenCheck size={14} style={{ display: "inline", marginRight: 7 }} />
                <b>Cmd/Ctrl + Shift + U</b> opens this console.<br />
                <Sparkles size={14} style={{ display: "inline", marginRight: 7, marginTop: 9 }} />
                <b>Cmd/Ctrl + Shift + M</b> marks a fleeting player moment.
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
