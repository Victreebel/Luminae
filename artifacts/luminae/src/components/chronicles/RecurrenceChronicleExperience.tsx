import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { RecurrenceCustodyMethod, RecurrenceScenarioState } from '@workspace/game-types';
import { ArrowLeft, BookOpen, Check, KeyRound, Split } from 'lucide-react';
import { gameAudio } from '@/lib/audio';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useChroniclePresentationGate, type ChroniclePresentationGateProps } from '@/hooks/use-chronicle-presentation-gate';
import eidoPlate from '@/assets/civilization/civilization-plate-planetary-v2-neutral_runtime.webp';
import './RecurrenceChronicleExperience.css';

const SETUP_LINES = [
  'The Deep Index is genuine.',
  'It records how the Meridian Houses survived the last White Return.',
  'The shield did not consume an empty field.',
  'It forced the Oru Current into one conductive pattern.',
  'Three of their remembered generations end there.',
  'The final layer claims it can protect both civilizations without repeating that loss.',
  'Neither civilization can prove the claim.',
  'The same layer contains the grammar that made the first erasure possible.',
] as const;

const ARRIVAL_LINES = [
  'Eido turns one face toward its star.',
  'The Meridian Houses live in the narrow country between fire and ice.',
  'Beneath the dark glass, the Oru remember through motion.',
  'The White Return is approaching.',
] as const;

const CHOICES: Record<RecurrenceCustodyMethod, {
  label: string;
  detail: string;
  confirmation: string[];
  commit: string;
  response: string;
  tone: 'publish' | 'seal' | 'dual';
  icon: typeof BookOpen;
}> = {
  publish_complete_index: {
    label: 'Give both civilizations the whole Archive.',
    detail: 'Every warning, gap, and control relation becomes public.',
    confirmation: ['No authority can monopolize it.', 'No authority can recall it.'],
    commit: 'PUBLISH THE DEEP INDEX',
    response: 'Then responsibility will be distributed with the danger.',
    tone: 'publish',
    icon: BookOpen,
  },
  seal_operational_grammar: {
    label: 'Preserve the warning. Seal the control grammar.',
    detail: 'Everyone will know what happened and what may return.',
    confirmation: ['No living reader will retain the complete method.', 'The strongest defense may be lost with it.'],
    commit: 'PRESERVE THE WARNING',
    response: 'You are preserving the fear without the answer.',
    tone: 'seal',
    icon: KeyRound,
  },
  establish_dual_custody: {
    label: 'Divide the Archive. Require both civilizations.',
    detail: 'One Meridian reader and one Oru reader must consent.',
    confirmation: ['Neither civilization can use the method alone.', 'Neither public can inspect the complete method.'],
    commit: 'ESTABLISH TWO-READER CUSTODY',
    response: 'Then trust becomes part of the mechanism.',
    tone: 'dual',
    icon: Split,
  },
};

const OUTCOMES: Record<NonNullable<RecurrenceScenarioState['outcomeId']>, { title: string; lines: string[] }> = {
  recurrence_published_victory: { title: 'The Open Index', lines: ['They kept their memories.', 'The command that once erased them now belongs to everyone.'] },
  recurrence_published_defeat: { title: 'The Unbounded Grammar', lines: ['No one owns the truth.', 'No one owns what it can now become.'] },
  recurrence_sealed_victory: { title: 'The Warning Without A Key', lines: ['They survived without repeating the erasure.', 'They will have to trust that the missing answer deserved to remain missing.'] },
  recurrence_sealed_defeat: { title: 'The Empty Interval', lines: ['You left them a warning and no proof.', 'Defeat made the absence look like a lie.'] },
  recurrence_conditional_victory: { title: 'The Two-Reader Dawn', lines: ['Neither could use the answer without being answered by the other.'] },
  recurrence_conditional_defeat: { title: 'The Withheld Half', lines: ['The mechanism held.', 'Their trust did not.'] },
};

type Props = ChroniclePresentationGateProps & {
  state: RecurrenceScenarioState;
  gameStatus: 'lobby' | 'playing' | 'finished';
  localPlayerId: string;
  winnerId?: string | null;
  submitting?: boolean;
  reduceMotion?: boolean;
  disableFocusTrap?: boolean;
  instanceId?: string | number;
  forceArrival?: boolean;
  onChoose: (method: RecurrenceCustodyMethod) => void | Promise<void>;
  onReturn?: () => void;
};

function DeepIndex({ method, active = false }: { method: RecurrenceCustodyMethod | null; active?: boolean }) {
  return (
    <svg className={`recurrence-index recurrence-index--${method ?? 'unresolved'} ${active ? 'is-active' : ''}`} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="38" />
      <circle cx="50" cy="50" r="27" />
      <path d="M50 12V88M12 50H88M23 23 77 77M77 23 23 77" />
      <path className="recurrence-index__grammar" d="M31 50 42 39 58 39 69 50 58 61 42 61Z" />
      <circle className="recurrence-index__core" cx="50" cy="50" r="6" />
    </svg>
  );
}

export function RecurrenceChronicleExperience({
  state, gameStatus, localPlayerId, winnerId, submitting = false, reduceMotion,
  disableFocusTrap = false, instanceId, forceArrival = false, onChoose, onReturn,
  presentationEnabled, onPresentationActiveChange,
}: Props) {
  const systemReducedMotion = useReducedMotion();
  const calmer = reduceMotion ?? !!systemReducedMotion;
  const [lineIndex, setLineIndex] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<RecurrenceCustodyMethod | null>(null);
  const arrivalStorageKey = instanceId ? `luminae:recurrence-arrival:${instanceId}` : null;
  const [arrivalLineIndex, setArrivalLineIndex] = useState(0);
  const [arrivalOpen, setArrivalOpen] = useState(() => forceArrival || Boolean(
    arrivalStorageKey &&
    gameStatus === 'playing' &&
    state.phase === 'playing' &&
    localStorage.getItem(arrivalStorageKey) !== 'seen',
  ));
  const decisionRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const custodyOpen = state.phase === 'awaiting_custody';
  const isArchitect = state.architectPlayerId === localPlayerId;
  const outcome = state.outcomeId ? OUTCOMES[state.outcomeId] : null;
  const { presentationVisible, completePresentationExit, holdPresentationForSound } = useChroniclePresentationGate({
    requested: arrivalOpen || custodyOpen || (gameStatus === 'finished' && !!outcome),
    presentationEnabled,
    onPresentationActiveChange,
  });
  const arrivalVisible = presentationVisible && arrivalOpen;
  const custodyVisible = presentationVisible && !arrivalOpen && custodyOpen;
  const outcomeVisible = presentationVisible && !arrivalOpen && gameStatus === 'finished' && !!outcome;
  const actionCount = Math.min(state.architectCoreActionCount, state.custodyDueAfterCoreActions);
  const selectedChoice = selectedMethod ? CHOICES[selectedMethod] : null;
  const setupComplete = lineIndex >= SETUP_LINES.length - 1;
  const runLabel = state.runKind === 'rehearsal' ? 'REHEARSAL' : 'PRIMARY HISTORY';

  useFocusTrap(decisionRef, custodyVisible && !disableFocusTrap, () => undefined);
  useFocusTrap(outcomeRef, outcomeVisible && !disableFocusTrap, () => undefined);

  useEffect(() => {
    if (!custodyVisible) return;
    setLineIndex(0);
    setSelectedMethod(null);
    holdPresentationForSound(1_300);
    gameAudio.playWhiteReturnSignal('presence');
  }, [custodyVisible, holdPresentationForSound]);
  useEffect(() => {
    if (outcomeVisible) {
      holdPresentationForSound(1_300);
      gameAudio.playWhiteReturnSignal('closure');
    }
  }, [outcomeVisible, holdPresentationForSound]);

  useEffect(() => {
    if (arrivalVisible) {
      holdPresentationForSound(1_300);
      gameAudio.playWhiteReturnSignal('presence');
    }
  }, [arrivalVisible, holdPresentationForSound]);

  const status = useMemo(() => {
    if (custodyOpen) return 'CUSTODY REQUIRED';
    if (state.custodyMethod) return 'CUSTODY RECORDED';
    return 'WHITE RETURN APPROACHING';
  }, [custodyOpen, state.custodyMethod]);

  const confirm = async () => {
    if (!selectedMethod || submitting) return;
    holdPresentationForSound(1_300);
    gameAudio.playWhiteReturnSignal(CHOICES[selectedMethod].tone);
    await onChoose(selectedMethod);
  };
  const advanceArrival = () => {
    if (arrivalLineIndex < ARRIVAL_LINES.length - 1) {
      setArrivalLineIndex(index => index + 1);
      return;
    }
    if (arrivalStorageKey) localStorage.setItem(arrivalStorageKey, 'seen');
    setArrivalOpen(false);
  };

  return (
    <>
      <AnimatePresence onExitComplete={completePresentationExit}>
        {arrivalVisible && (
          <motion.div className="recurrence-arrival" role="dialog" aria-modal="true" aria-label="Arrival at Eido" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={advanceArrival}>
            <img src={eidoPlate} alt="" className="recurrence-decision__plate" />
            <div className="recurrence-decision__star" /><div className="recurrence-decision__ice" /><div className="recurrence-decision__oru" /><div className="recurrence-decision__veil" />
            <section><span>THE RECURRENCE</span><h1>{arrivalLineIndex === ARRIVAL_LINES.length - 1 ? 'THE WHITE RETURN' : 'EIDO'}</h1><p>{ARRIVAL_LINES[arrivalLineIndex]}</p><button type="button" onClick={(event) => { event.stopPropagation(); advanceArrival(); }}>{arrivalLineIndex === ARRIVAL_LINES.length - 1 ? 'Enter the record' : 'Continue'}</button></section>
          </motion.div>
        )}
      </AnimatePresence>
      {gameStatus !== 'finished' && (
        <section className="recurrence-hud" data-testid="recurrence-chronicle-hud" aria-label="The Recurrence Chronicle status">
          <div className="recurrence-hud__identity"><DeepIndex method={state.custodyMethod} active={custodyOpen} /><span><strong>WHITE RETURN</strong><small>{runLabel}</small></span></div>
          <div className="recurrence-hud__meter"><span>CUSTODY WINDOW</span><div aria-label={`${actionCount} of ${state.custodyDueAfterCoreActions} actions`}>{Array.from({ length: state.custodyDueAfterCoreActions }, (_, index) => <i key={index} className={index < actionCount ? 'is-filled' : ''} />)}</div></div>
          <div className="recurrence-hud__reader"><span>INDEPENDENT READER</span><strong>{state.preparednessObjectiveMet ? 'PREPARED' : 'UNPREPARED'}</strong></div>
          <div className="recurrence-hud__status"><span>{status}</span><strong>{state.custodyMethod ? CHOICES[state.custodyMethod].commit : 'DEEP INDEX'}</strong></div>
        </section>
      )}

      <AnimatePresence onExitComplete={completePresentationExit}>
        {custodyVisible && (
          <motion.div ref={decisionRef} className="recurrence-decision" role="dialog" aria-modal="true" aria-label="Deep Index custody decision" initial={calmer ? { opacity: 0 } : { opacity: 0, scale: 1.012 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <img src={eidoPlate} alt="" className="recurrence-decision__plate" />
            <div className="recurrence-decision__star" /><div className="recurrence-decision__ice" /><div className="recurrence-decision__oru" />
            <div className="recurrence-decision__veil" />
            <div className="recurrence-decision__index"><DeepIndex method={selectedMethod} active /></div>
            <header><span>THE RECURRENCE</span><strong>THE DEEP INDEX</strong><small>{runLabel} · CONSEQUENTIAL CUSTODY</small></header>
            <motion.section key={selectedMethod ?? lineIndex} className="recurrence-dialogue" initial={{ opacity: 0, y: calmer ? 0 : 7 }} animate={{ opacity: 1, y: 0 }}>
              {!selectedChoice ? <>
                <span className="recurrence-dialogue__speaker">LUMII</span><p>{SETUP_LINES[lineIndex]}</p>
                {!setupComplete ? <button type="button" className="recurrence-dialogue__continue" onClick={() => setLineIndex(index => index + 1)}>Continue</button>
                  : isArchitect ? <div className="recurrence-choices">{(Object.keys(CHOICES) as RecurrenceCustodyMethod[]).map(method => { const choice = CHOICES[method]; const Icon = choice.icon; return <button type="button" key={method} onClick={() => setSelectedMethod(method)}><Icon aria-hidden="true" /><span><strong>{choice.label}</strong><small>{choice.detail}</small></span></button>; })}</div>
                    : <p className="recurrence-dialogue__waiting">The Architect is deciding custody of the Deep Index.</p>}
              </> : <div className="recurrence-confirmation">
                <button type="button" className="recurrence-confirmation__back" onClick={() => setSelectedMethod(null)} aria-label="Choose another custody method"><ArrowLeft aria-hidden="true" /></button>
                <span className="recurrence-dialogue__speaker">ARCHITECT CUSTODY</span><h2>{selectedChoice.label}</h2><p>{selectedChoice.detail}</p>
                <div>{selectedChoice.confirmation.map(line => <span key={line}>{line}</span>)}</div><blockquote>{selectedChoice.response}</blockquote>
                <button type="button" className="recurrence-confirmation__commit" onClick={confirm} disabled={submitting}><Check aria-hidden="true" />{submitting ? 'RECORDING...' : selectedChoice.commit}</button>
              </div>}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={completePresentationExit}>
        {outcomeVisible && outcome && (
          <motion.div ref={outcomeRef} className="recurrence-outcome" role="dialog" aria-modal="true" aria-label={outcome.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <img src={eidoPlate} alt="" className="recurrence-decision__plate" /><div className="recurrence-outcome__veil" />
            <section><DeepIndex method={state.custodyMethod} active /><span className="recurrence-outcome__eyebrow">THE RECURRENCE · {winnerId === state.architectPlayerId ? 'MERIDIAN REFERENCE' : 'ORU REFERENCE'}</span><h1>{outcome.title}</h1>
              <div className="recurrence-outcome__lines">{outcome.lines.map(line => <p key={line}>{line}</p>)}</div>
              <div className="recurrence-outcome__seal"><strong>RECURRENCE STABLE</strong><span>{state.runKind === 'rehearsal' ? 'COUNTERFACTUAL COMPLETE' : 'HISTORY RECORDED'}</span></div>
              {onReturn && <button type="button" onClick={onReturn}>Return to Chronicle Archive</button>}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
