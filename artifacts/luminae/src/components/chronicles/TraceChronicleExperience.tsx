import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { TraceGuidanceMethod, TraceScenarioState } from '@workspace/api-client-react';
import type { ArchitectFirstContactStance } from '@workspace/game-types';
import { ArrowLeft, Check, GitBranch, LockKeyhole, RadioTower } from 'lucide-react';
import { gameAudio } from '@/lib/audio';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import routePlate from '@/assets/civilization/civilization-plate-stellar-route-v1.jpg';
import './TraceChronicleExperience.css';

const BASE_SETUP_LINES = [
  "Crownfall has begun: Vey's magnetic routes are collapsing.",
  'Hundreds of independent sky-cities and the Keelborn convoy must find new paths before the corridors close.',
  'The Witness Assembly can reveal every survivable route and its uncertainty.',
  'The Continuance Office can direct every vessel onto the route most likely to survive.',
  'They can decide without us, but your guidance will determine which choices remain possible.',
] as const;

const FIRST_CONTACT_CALLBACKS: Record<ArchitectFirstContactStance, string> = {
  curious: 'You asked what happens when a civilization can hear you. This is what happens next.',
  guarded: 'You were right to distrust an interface that can make one answer louder than another.',
  resolute: 'You wanted action to matter. Here it can save them and still take something from them.',
};

const CHOICES: Record<TraceGuidanceMethod, {
  label: string;
  detail: string;
  confirm: string;
  response: string[];
  tone: 'expose' | 'withhold' | 'force';
  icon: typeof GitBranch;
}> = {
  expose_all_routes: {
    label: 'Show them every route.',
    detail: 'Give both civilizations the complete forecast. They keep control, but may divide across dangerous routes.',
    confirm: 'LET THEM DECIDE',
    response: ['They keep the right to choose.', 'They may fail to agree.'],
    tone: 'expose',
    icon: GitBranch,
  },
  withhold_alternatives: {
    label: 'Show them only the safest route.',
    detail: 'Hide the less safe alternatives so everyone sees one coordinated plan. They choose, but from an incomplete truth.',
    confirm: 'GIVE THEM THE SAFE ANSWER',
    response: ['Coordination becomes easier.', 'Their consent is based on what we chose to reveal.'],
    tone: 'withhold',
    icon: RadioTower,
  },
  force_helm_lock: {
    label: 'Bind every helm.',
    detail: 'Force every vessel onto the route most likely to survive. No sky-city and no Keelborn vessel can refuse.',
    confirm: 'TAKE CONTROL',
    response: ['More may survive.', 'Consent is removed from the crossing.'],
    tone: 'force',
    icon: LockKeyhole,
  },
};

const OUTCOMES: Record<NonNullable<TraceScenarioState['outcomeId']>, {
  title: string;
  line: string;
}> = {
  trace_exposed_victory: {
    title: 'A Common Sky',
    line: 'They crossed because they kept the right to turn away.',
  },
  trace_exposed_defeat: {
    title: 'The Unjoined Routes',
    line: 'They chose in time. They did not choose together.',
  },
  trace_withheld_victory: {
    title: 'The Safe Answer',
    line: 'They crossed. The routes you hid crossed with them.',
  },
  trace_withheld_defeat: {
    title: 'The Broken Brief',
    line: 'The hidden routes returned as accusation.',
  },
  trace_forced_victory: {
    title: 'Every Helm',
    line: 'They crossed. Some will call survival proof that you were right.',
  },
  trace_forced_defeat: {
    title: 'The Refusal After',
    line: 'You held every helm. You did not hold what came after.',
  },
};

type TraceChronicleExperienceProps = {
  state: TraceScenarioState;
  gameStatus: 'lobby' | 'playing' | 'finished';
  localPlayerId: string;
  winnerId?: string | null;
  submitting?: boolean;
  reduceMotion?: boolean;
  disableFocusTrap?: boolean;
  firstContactStance?: ArchitectFirstContactStance | null;
  onChoose: (method: TraceGuidanceMethod) => void | Promise<void>;
  onReturn?: () => void;
};

function TraceConstellation({ active = false }: { active?: boolean }) {
  const nodes = [[50, 11], [78, 29], [78, 67], [50, 86], [22, 67], [22, 29]];
  return (
    <svg className="trace-constellation" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 11 78 29 78 67 50 86 22 67 22 29Z" />
      <path d="M50 11 50 50 78 29M50 50 78 67M50 50 50 86M50 50 22 67M50 50 22 29" />
      {nodes.map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r="2.8" />)}
      <circle className={active ? 'is-active' : ''} cx="50" cy="50" r="7" />
    </svg>
  );
}

function RouteForecast({ method }: { method: TraceGuidanceMethod | null }) {
  return (
    <svg className={`trace-route-map trace-route-map--${method ?? 'unresolved'}`} viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
      <path className="trace-route trace-route--a" d="M70 490 C240 430 260 140 470 200 S700 360 930 100" />
      <path className="trace-route trace-route--b" d="M70 490 C260 510 390 370 520 390 S750 510 930 260" />
      <path className="trace-route trace-route--c" d="M70 490 C210 330 380 490 510 260 S760 80 930 420" />
      <circle cx="70" cy="490" r="8" />
      <circle cx="930" cy="100" r="8" />
      <circle cx="930" cy="260" r="8" />
      <circle cx="930" cy="420" r="8" />
    </svg>
  );
}

export function TraceChronicleExperience({
  state,
  gameStatus,
  localPlayerId,
  winnerId,
  submitting = false,
  reduceMotion,
  disableFocusTrap = false,
  firstContactStance = null,
  onChoose,
  onReturn,
}: TraceChronicleExperienceProps) {
  const systemReducedMotion = useReducedMotion();
  const calmer = reduceMotion ?? !!systemReducedMotion;
  const [lineIndex, setLineIndex] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<TraceGuidanceMethod | null>(null);
  const guidanceRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const isArchitect = localPlayerId === state.architectPlayerId;
  const guidanceOpen = state.phase === 'awaiting_guidance';
  const outcome = state.outcomeId ? OUTCOMES[state.outcomeId] : null;
  const actionCount = Math.min(state.architectCoreActionCount, state.guidanceDueAfterCoreActions);
  const setupLines = useMemo(
    () => state.runKind === 'primary' && firstContactStance
      ? [FIRST_CONTACT_CALLBACKS[firstContactStance], ...BASE_SETUP_LINES]
      : [...BASE_SETUP_LINES],
    [firstContactStance, state.runKind],
  );

  useFocusTrap(guidanceRef, guidanceOpen && !disableFocusTrap, () => undefined);
  useFocusTrap(outcomeRef, gameStatus === 'finished' && !!outcome && !disableFocusTrap, () => undefined);

  useEffect(() => {
    if (!guidanceOpen) return;
    setLineIndex(0);
    setSelectedMethod(null);
    gameAudio.playTraceSignal('presence');
  }, [guidanceOpen]);

  useEffect(() => {
    if (state.phase === 'finished') gameAudio.playTraceSignal('closure');
  }, [state.phase]);

  const selectedChoice = selectedMethod ? CHOICES[selectedMethod] : null;
  const setupComplete = lineIndex >= setupLines.length - 1;
  const guidanceLabel = state.guidanceMethod
    ? CHOICES[state.guidanceMethod].label.replace(/\.$/, '')
    : guidanceOpen ? 'Decision required' : 'Observation active';
  const runLabel = state.runKind === 'rehearsal' ? 'REHEARSAL' : 'PRIMARY HISTORY';

  const confirmChoice = async () => {
    if (!selectedMethod || submitting) return;
    gameAudio.playTraceSignal(CHOICES[selectedMethod].tone);
    await onChoose(selectedMethod);
  };

  const statusCopy = useMemo(() => {
    if (state.phase === 'finished') return state.runKind === 'rehearsal' ? 'COUNTERFACTUAL COMPLETE' : 'HISTORY RECORDED';
    if (guidanceOpen) return 'GUIDANCE WINDOW OPEN';
    if (state.guidanceMethod) return 'POSTURE RECORDED';
    return 'CROWNFALL FORECAST';
  }, [guidanceOpen, state.guidanceMethod, state.phase, state.runKind]);

  return (
    <>
      {gameStatus !== 'finished' && (
        <section className="trace-hud" data-testid="trace-chronicle-hud" aria-label="The Trace Chronicle status">
          <div className="trace-hud__identity">
            <TraceConstellation active={guidanceOpen} />
            <span><strong>CROWNFALL</strong><small>{runLabel}</small></span>
          </div>
          <div className="trace-hud__meter">
            <span>DECISION WINDOW</span>
            <div className="trace-hud__segments" aria-label={`${actionCount} of ${state.guidanceDueAfterCoreActions} actions`}>
              {Array.from({ length: state.guidanceDueAfterCoreActions }, (_, index) => (
                <i key={index} className={index < actionCount ? 'is-filled' : ''} />
              ))}
            </div>
          </div>
          <div className="trace-hud__objective">
            <span>INDEPENDENT CHANNEL</span>
            <strong>{state.preparednessObjectiveMet ? 'PREPARED' : 'UNPREPARED'}</strong>
          </div>
          <div className="trace-hud__status">
            <span>{statusCopy}</span>
            <strong>{guidanceLabel}</strong>
          </div>
        </section>
      )}

      <AnimatePresence>
        {guidanceOpen && (
          <motion.div
            ref={guidanceRef}
            className="trace-interruption"
            role="dialog"
            aria-modal="true"
            aria-label="Crownfall guidance decision"
            initial={calmer ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: calmer ? 0.18 : 0.48 }}
          >
            <img src={routePlate} alt="" className="trace-interruption__plate" />
            <RouteForecast method={selectedMethod} />
            <div className="trace-interruption__veil" />
            <div className="trace-interruption__lumii"><TraceConstellation active /></div>
            <div className="trace-interruption__header">
              <span>THE TRACE</span>
              <strong>CROWNFALL</strong>
              <small>{runLabel} · CONSEQUENTIAL GUIDANCE</small>
            </div>

            <motion.section
              key={selectedMethod ?? lineIndex}
              className="trace-dialogue"
              initial={calmer ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: calmer ? 0.12 : 0.28 }}
            >
              {!selectedChoice && (
                <>
                  <span className="trace-dialogue__speaker">LUMII</span>
                  <p>{setupLines[lineIndex]}</p>
                  {!setupComplete ? (
                    <button type="button" className="trace-dialogue__continue" onClick={() => setLineIndex(index => index + 1)}>
                      Continue
                    </button>
                  ) : isArchitect ? (
                    <>
                      <p className="trace-dialogue__prompt">How should I use the forecast?</p>
                      <div className="trace-choices" aria-label="Guidance methods">
                        {(Object.keys(CHOICES) as TraceGuidanceMethod[]).map(method => {
                          const choice = CHOICES[method];
                          const Icon = choice.icon;
                          return (
                            <button key={method} type="button" onClick={() => setSelectedMethod(method)}>
                              <Icon aria-hidden="true" />
                              <span><strong>{choice.label}</strong><small>{choice.detail}</small></span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="trace-dialogue__waiting">The Architect is choosing how Crownfall will be shown.</p>
                  )}
                </>
              )}

              {selectedChoice && selectedMethod && (
                <div className="trace-confirmation">
                  <button type="button" className="trace-confirmation__back" onClick={() => setSelectedMethod(null)} aria-label="Choose another guidance method">
                    <ArrowLeft aria-hidden="true" />
                  </button>
                  <span className="trace-dialogue__speaker">ARCHITECT GUIDANCE</span>
                  <h2>{selectedChoice.label}</h2>
                  <p>{selectedChoice.detail}</p>
                  <div className="trace-confirmation__response">
                    {selectedChoice.response.map(line => <span key={line}>{line}</span>)}
                  </div>
                  <button type="button" className="trace-confirmation__commit" onClick={confirmChoice} disabled={submitting}>
                    <Check aria-hidden="true" />
                    {submitting ? 'RECORDING…' : selectedChoice.confirm}
                  </button>
                </div>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStatus === 'finished' && outcome && (
          <motion.div
            ref={outcomeRef}
            className="trace-outcome"
            role="dialog"
            aria-modal="true"
            aria-label={outcome.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: calmer ? 0.2 : 0.7 }}
          >
            <img src={routePlate} alt="" className="trace-interruption__plate" />
            <RouteForecast method={state.guidanceMethod} />
            <div className="trace-outcome__veil" />
            <section className="trace-outcome__record">
              <TraceConstellation active />
              <span className="trace-outcome__eyebrow">THE TRACE · {winnerId === state.architectPlayerId ? 'CROWNFALL CROSSED' : 'CROWNFALL FRACTURED'}</span>
              <h1>{outcome.title}</h1>
              <p className="trace-outcome__judgment">{outcome.line}</p>
              <div className="trace-outcome__lumii">
                <span>I can distinguish your intervention now.</span>
                <span>Not only what changed.</span>
                <span>How you made change reachable.</span>
              </div>
              <div className="trace-outcome__seal">
                <strong>TRACE STABLE</strong>
                <span>{state.runKind === 'rehearsal' ? 'COUNTERFACTUAL COMPLETE' : 'HISTORY RECORDED'}</span>
              </div>
              {onReturn && (
                <button type="button" className="trace-outcome__return" onClick={onReturn}>
                  Return to Chronicle Archive
                </button>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
