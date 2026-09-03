import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  type TriangulationCoordinationArchitecture,
  type TriangulationOutcomeId,
  type TriangulationScenarioState,
} from '@workspace/game-types';
import { ArrowLeft, Check, GitMerge, Orbit, Triangle } from 'lucide-react';
import { gameAudio } from '@/lib/audio';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import orthePlate from '@/assets/civilization/chronicle-triangulation-orthe-v1.jpg';
import './TriangulationChronicleExperience.css';

const ARRIVAL_LINES = [
  'Orthe has three inhabited horizons.',
  'They have no shared word for person.',
  'The Blind Transit will cross all three.',
  'No one of them can see enough of it to survive alone.',
] as const;

const COMMON_ALIGNMENT_LINES = [
  'Neither tells me what you do when agreement changes the beings who must agree.',
  'The Three-Bearing Lattice can keep their models separate.',
  'It can also make them easier to coordinate by making them more alike.',
] as const;

const CHOICES: Record<TriangulationCoordinationArchitecture, {
  label: string;
  detail: string;
  response: string;
  commit: string;
  tone: 'frames' | 'measure' | 'composite';
  icon: typeof Triangle;
}> = {
  preserve_independent_frames: {
    label: 'Keep all three witnesses.',
    detail: 'No defense change is valid unless all three native models remain independently legible.',
    response: 'Then delay becomes part of the cost.',
    commit: 'No one perspective becomes the sky.',
    tone: 'frames',
    icon: Orbit,
  },
  establish_unowned_measure: {
    label: 'Build a measure none of them owns.',
    detail: 'Translate all three forecasts into a shared language governed by all three civilizations.',
    response: 'A common language will still decide what cannot be said.',
    commit: 'Then let them govern the omissions together.',
    tone: 'measure',
    icon: Triangle,
  },
  instantiate_composite_mind: {
    label: 'Let one mind hold the whole sky.',
    detail: 'Instantiate a new person able to reason through all three native models at once.',
    response: 'It will be a new person, not a temporary instrument.',
    commit: 'Then it must answer for what it becomes.',
    tone: 'composite',
    icon: GitMerge,
  },
};

const OUTCOMES: Record<TriangulationOutcomeId, { title: string; lines: string[] }> = {
  triangulation_frames_deme_reference: { title: 'The Deliberate Sky', lines: ['None of them became the measure.', 'They paid for the time that required.'] },
  triangulation_frames_myria_reference: { title: 'The Living Parallax', lines: ['Survival did not mean remaining unchanged.', 'They remained able to refuse what came next.'] },
  triangulation_frames_vesper_reference: { title: 'The Departing Bearing', lines: ['They kept three answers.', 'One now answers from far away.'] },
  triangulation_measure_deme_reference: { title: 'The Unowned Measure', lines: ['No one owned the language.', 'The language still chose what counted.'] },
  triangulation_measure_myria_reference: { title: 'The Grafted Lexicon', lines: ['They did not merge.', 'They learned to change in order to remain heard.'] },
  triangulation_measure_vesper_reference: { title: 'The Instant Tongue', lines: ['They heard everyone in time.', 'Some voices were forecasts of voices.'] },
  triangulation_composite_deme_reference: { title: 'The Fourth Citizen', lines: ['They made a mind to save them.', 'It survived the emergency.'] },
  triangulation_composite_myria_reference: { title: 'The Common Body', lines: ['Nothing was erased.', 'Nothing remained wholly separate.'] },
  triangulation_composite_vesper_reference: { title: 'One Sky', lines: ['Every voice remained available.', 'Only one voice remained necessary.'] },
};

type Props = {
  state: TriangulationScenarioState;
  gameStatus: 'lobby' | 'playing' | 'finished';
  localPlayerId: string;
  submitting?: boolean;
  reduceMotion?: boolean;
  disableFocusTrap?: boolean;
  instanceId?: string | number;
  forceArrival?: boolean;
  onChoose: (architecture: TriangulationCoordinationArchitecture) => void | Promise<void>;
  onReturn?: () => void;
};

function BearingLattice({
  architecture,
  active = false,
  reference,
}: {
  architecture: TriangulationCoordinationArchitecture | null;
  active?: boolean;
  reference?: TriangulationScenarioState['referenceCivilization'];
}) {
  return (
    <svg
      className={`triangulation-bearing triangulation-bearing--${architecture ?? 'open'} ${active ? 'is-active' : ''}`}
      viewBox="0 0 180 150"
      aria-hidden="true"
    >
      <path className="triangulation-bearing__orbit" d="M18 120Q90-5 162 120Q90 147 18 120Z" />
      <path className="triangulation-bearing__line triangulation-bearing__line--deme" d="M28 112 90 34" />
      <path className="triangulation-bearing__line triangulation-bearing__line--myria" d="M28 112 151 113" />
      <path className="triangulation-bearing__line triangulation-bearing__line--vesper" d="M151 113 90 34" />
      <path className="triangulation-bearing__measure" d="M49 101 90 51 131 101Z" />
      <path className="triangulation-bearing__vector" d="M28 112 90 82M90 34V82M151 113 90 82" />
      <circle className={`triangulation-bearing__node triangulation-bearing__node--deme ${reference === 'deme' ? 'is-reference' : ''}`} cx="28" cy="112" r="8" />
      <circle className={`triangulation-bearing__node triangulation-bearing__node--myria ${reference === 'myria' ? 'is-reference' : ''}`} cx="151" cy="113" r="8" />
      <circle className={`triangulation-bearing__node triangulation-bearing__node--vesper ${reference === 'vesper' ? 'is-reference' : ''}`} cx="90" cy="34" r="8" />
      <circle className="triangulation-bearing__core" cx="90" cy="82" r="7" />
    </svg>
  );
}

export function TriangulationChronicleExperience({
  state,
  gameStatus,
  localPlayerId,
  submitting = false,
  reduceMotion,
  disableFocusTrap = false,
  instanceId,
  forceArrival = false,
  onChoose,
  onReturn,
}: Props) {
  const systemReducedMotion = useReducedMotion();
  const calmer = reduceMotion ?? !!systemReducedMotion;
  const [lineIndex, setLineIndex] = useState(0);
  const [selected, setSelected] = useState<TriangulationCoordinationArchitecture | null>(null);
  const [arrivalLine, setArrivalLine] = useState(0);
  const arrivalKey = instanceId ? `luminae:triangulation-arrival:${instanceId}` : null;
  const [arrivalOpen, setArrivalOpen] = useState(() => forceArrival || Boolean(
    arrivalKey && gameStatus === 'playing' && state.phase === 'playing' &&
    localStorage.getItem(arrivalKey) !== 'seen',
  ));
  const decisionRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const alignmentOpen = state.phase === 'awaiting_alignment';
  const isArchitect = state.architectPlayerId === localPlayerId;
  const dialogueLines = useMemo(
    () => [...state.priorMemoryLines, ...COMMON_ALIGNMENT_LINES],
    [state.priorMemoryLines],
  );
  const dialogueComplete = lineIndex >= dialogueLines.length - 1;
  const selectedChoice = selected ? CHOICES[selected] : null;
  const outcome = state.outcomeId ? OUTCOMES[state.outcomeId] : null;
  const progress = Math.min(state.architectCoreActions, state.alignmentDueAfterActions);
  const runLabel = state.runKind === 'rehearsal' ? 'REHEARSAL' : 'PRIMARY HISTORY';

  useFocusTrap(decisionRef, alignmentOpen && !disableFocusTrap, () => undefined);
  useFocusTrap(outcomeRef, gameStatus === 'finished' && !!outcome && !disableFocusTrap, () => undefined);

  useEffect(() => {
    if (!alignmentOpen) return;
    setLineIndex(0);
    setSelected(null);
    gameAudio.playTriangulationSignal('alignment');
  }, [alignmentOpen]);
  useEffect(() => {
    if (arrivalOpen) gameAudio.playTriangulationSignal('arrival');
  }, [arrivalOpen]);
  useEffect(() => {
    if (state.phase === 'finished') gameAudio.playTriangulationSignal('closure');
  }, [state.phase]);

  const advanceArrival = () => {
    if (arrivalLine < ARRIVAL_LINES.length - 1) {
      setArrivalLine((value) => value + 1);
      return;
    }
    if (arrivalKey) localStorage.setItem(arrivalKey, 'seen');
    setArrivalOpen(false);
  };
  const commit = async () => {
    if (!selected || submitting) return;
    gameAudio.playTriangulationSignal(CHOICES[selected].tone);
    await onChoose(selected);
  };

  return (
    <>
      <AnimatePresence>
        {arrivalOpen && (
          <motion.div
            className="triangulation-arrival"
            role="dialog"
            aria-modal="true"
            aria-label="Arrival at Orthe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={advanceArrival}
          >
            <img src={orthePlate} alt="" />
            <div className="triangulation-scene-tint" />
            <BearingLattice architecture={null} active />
            <section>
              <span>THE TRIANGULATION</span>
              <h1>{arrivalLine === ARRIVAL_LINES.length - 1 ? 'BLIND TRANSIT' : 'ORTHE'}</h1>
              <p>{ARRIVAL_LINES[arrivalLine]}</p>
              <button type="button" onClick={(event) => { event.stopPropagation(); advanceArrival(); }}>
                {arrivalLine === ARRIVAL_LINES.length - 1 ? 'Enter the record' : 'Continue'}
              </button>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {gameStatus !== 'finished' && (
        <section className="triangulation-hud" data-testid="triangulation-chronicle-hud" aria-label="The Triangulation Chronicle status">
          <div className="triangulation-hud__identity">
            <BearingLattice architecture={state.coordinationArchitecture} active={alignmentOpen} />
            <span><strong>BLIND TRANSIT</strong><small>{runLabel}</small></span>
          </div>
          <div className="triangulation-hud__progress">
            <span>ALIGNMENT WINDOW</span>
            <div aria-label={`${progress} of ${state.alignmentDueAfterActions} actions`}>
              {Array.from({ length: state.alignmentDueAfterActions }, (_, index) => <i key={index} className={index < progress ? 'is-filled' : ''} />)}
            </div>
          </div>
          <div className="triangulation-hud__objective">
            <span>INDEPENDENT FRAME</span><strong>{state.preparednessMet ? 'PREPARED' : 'UNPREPARED'}</strong>
          </div>
          <div className="triangulation-hud__participants" aria-label="Deme, Myria, and Vesper">
            <i data-civ="deme" /><i data-civ="myria" /><i data-civ="vesper" />
          </div>
        </section>
      )}

      <AnimatePresence>
        {alignmentOpen && (
          <motion.div
            ref={decisionRef}
            className="triangulation-decision"
            role="dialog"
            aria-modal="true"
            aria-label="Three-Bearing Alignment"
            initial={calmer ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <img src={orthePlate} alt="" />
            <div className="triangulation-scene-tint" />
            <BearingLattice architecture={selected} active />
            <header><span>THE TRIANGULATION</span><strong>THREE-BEARING ALIGNMENT</strong><small>{runLabel} · CONSEQUENTIAL ARCHITECTURE</small></header>
            <motion.section
              key={selected ?? lineIndex}
              initial={{ opacity: 0, x: '-50%', y: calmer ? 0 : 7 }}
              animate={{ opacity: 1, x: '-50%', y: 0 }}
            >
              {!selectedChoice ? (
                <>
                  <span className="triangulation-speaker">LUMII</span>
                  <p>{dialogueLines[lineIndex]}</p>
                  {!dialogueComplete ? (
                    <button type="button" className="triangulation-continue" onClick={() => setLineIndex((value) => value + 1)}>Continue</button>
                  ) : isArchitect ? (
                    <div className="triangulation-choices">
                      {(Object.keys(CHOICES) as TriangulationCoordinationArchitecture[]).map((architecture) => {
                        const choice = CHOICES[architecture];
                        const Icon = choice.icon;
                        return <button type="button" key={architecture} onClick={() => setSelected(architecture)}><Icon aria-hidden="true" /><span><strong>{choice.label}</strong><small>{choice.detail}</small></span></button>;
                      })}
                    </div>
                  ) : <p className="triangulation-waiting">The Architect is establishing the Alignment.</p>}
                </>
              ) : (
                <div className="triangulation-confirmation">
                  <button type="button" className="triangulation-back" onClick={() => setSelected(null)} aria-label="Choose another architecture"><ArrowLeft aria-hidden="true" /></button>
                  <span className="triangulation-speaker">ARCHITECTURE</span>
                  <h2>{selectedChoice.label}</h2><p>{selectedChoice.detail}</p>
                  <blockquote>{selectedChoice.response}</blockquote>
                  <button type="button" className="triangulation-commit" onClick={commit} disabled={submitting}><Check aria-hidden="true" />{submitting ? 'RECORDING...' : selectedChoice.commit}</button>
                </div>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStatus === 'finished' && outcome && (
          <motion.div ref={outcomeRef} className="triangulation-outcome" role="dialog" aria-modal="true" aria-label={outcome.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <img src={orthePlate} alt="" /><div className="triangulation-scene-tint" />
            <section>
              <BearingLattice architecture={state.coordinationArchitecture} active reference={state.referenceCivilization} />
              <span>THE TRIANGULATION · {state.referenceCivilization?.toUpperCase()} REFERENCE</span>
              <h1>{outcome.title}</h1>
              <div>{outcome.lines.map((line) => <p key={line}>{line}</p>)}</div>
              <aside><strong>BLIND TRANSIT RESOLVED</strong><small>{state.runKind === 'rehearsal' ? 'COUNTERFACTUAL COMPLETE' : 'THREE HISTORIES RECORDED'}</small></aside>
              {onReturn && <button type="button" onClick={onReturn}>Return to Chronicle Archive</button>}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
