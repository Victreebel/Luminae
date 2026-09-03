import { useMemo, useState } from 'react';
import type { RecurrenceCustodyMethod, RecurrenceScenarioState } from '@workspace/game-types';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import { RecurrenceChronicleExperience } from '@/components/chronicles/RecurrenceChronicleExperience';
import { gameAudio } from '@/lib/audio';

type PreviewPhase = 'arrival' | 'playing' | 'decision' | 'resolved' | 'victory' | 'defeat';
type PreviewRun = 'primary' | 'rehearsal';
const METHODS: RecurrenceCustodyMethod[] = ['publish_complete_index', 'seal_operational_grammar', 'establish_dual_custody'];

function initialParam<T extends string>(name: string, fallback: T, values: readonly T[]): T {
  const value = new URLSearchParams(window.location.search).get(name) as T | null;
  return value && values.includes(value) ? value : fallback;
}
function updateQuery(values: Record<string, string | number | boolean>) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(values).forEach(([key, value]) => params.set(key, String(value)));
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

export default function DevRecurrenceChronicle() {
  const [phase, setPhaseState] = useState<PreviewPhase>(() => initialParam('phase', 'decision', ['arrival', 'playing', 'decision', 'resolved', 'victory', 'defeat'] as const));
  const [method, setMethodState] = useState<RecurrenceCustodyMethod>(() => initialParam('method', 'establish_dual_custody', METHODS));
  const [runKind, setRunKindState] = useState<PreviewRun>(() => initialParam('run', 'primary', ['primary', 'rehearsal'] as const));
  const [reducedMotion, setReducedMotion] = useState(() => new URLSearchParams(window.location.search).get('motion') === 'reduced');
  const [prepared, setPrepared] = useState(() => new URLSearchParams(window.location.search).get('prepared') === '1');
  const [muted, setMuted] = useState(() => gameAudio.isMuted());
  const setPhase = (value: PreviewPhase) => { setPhaseState(value); updateQuery({ phase: value }); };
  const setMethod = (value: RecurrenceCustodyMethod) => { setMethodState(value); updateQuery({ method: value }); };
  const setRunKind = (value: PreviewRun) => { setRunKindState(value); updateQuery({ run: value }); };

  const scenario = useMemo<RecurrenceScenarioState>(() => {
    const result = phase === 'victory' ? 'victory' : 'defeat';
    const outcomeId = phase === 'victory' || phase === 'defeat'
      ? method === 'publish_complete_index' ? `recurrence_published_${result}`
        : method === 'seal_operational_grammar' ? `recurrence_sealed_${result}`
          : `recurrence_conditional_${result}`
      : null;
    return {
      chronicleId: 'chronicle_recurrence', scenarioId: 'chronicle_recurrence_v1', definitionVersion: 1,
      runKind, architectPlayerId: 'architect', autonomousPlayerId: 'oru',
      phase: phase === 'decision' ? 'awaiting_custody' : phase === 'resolved' ? 'custody_resolved' : phase === 'victory' || phase === 'defeat' ? 'finished' : 'playing',
      architectCoreActionCount: phase === 'playing' ? 3 : 5, custodyDueAfterCoreActions: 5,
      custodyMethod: phase === 'playing' || phase === 'decision' ? null : method,
      custodyResolvedAtTurnCount: phase === 'playing' || phase === 'decision' ? null : 9,
      preparednessObjectiveMet: prepared, preparednessArtifactId: prepared ? 't1p03' : null,
      outcomeId: outcomeId as RecurrenceScenarioState['outcomeId'],
    };
  }, [method, phase, prepared, runKind]);

  const toggleMute = () => { const next = !muted; gameAudio.setMuted(next); setMuted(next); updateQuery({ audio: next ? 'off' : 'on' }); };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#030713] text-white">
      <img src={backgroundCosmos} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="relative z-10 flex h-14 items-center border-b border-white/10 bg-black/75 px-4 font-serif text-sm font-bold text-cyan-50">LUMINAe · Recurrence Chronicle Preview</div>
      <RecurrenceChronicleExperience state={scenario} gameStatus={phase === 'victory' || phase === 'defeat' ? 'finished' : 'playing'} localPlayerId="architect" winnerId={phase === 'victory' ? 'architect' : phase === 'defeat' ? 'oru' : null} reduceMotion={reducedMotion} disableFocusTrap forceArrival={phase === 'arrival'} onChoose={(next) => { setMethod(next); setPhase('resolved'); }} onReturn={() => setPhase('playing')} />
      <div className="relative z-10 grid min-h-[calc(100dvh-6.875rem)] place-items-center p-8 text-center text-cyan-50/45"><div><p className="font-serif text-3xl text-cyan-50/65">Meridian Houses of Eido</p><p className="mt-2 text-xs">Production board remains live beneath the Chronicle presentation.</p></div></div>
      <aside className="fixed bottom-2 left-2 right-2 z-[500] flex flex-nowrap items-center gap-1 overflow-x-auto rounded-md border border-white/15 bg-[#061016]/95 p-2 shadow-2xl sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 sm:flex-wrap">
        {(['arrival','playing','decision','resolved','victory','defeat'] as PreviewPhase[]).map(value => <button key={value} type="button" onClick={() => setPhase(value)} className={`h-8 rounded px-2 text-[10px] uppercase ${phase === value ? 'bg-cyan-100 text-[#071214]' : 'bg-white/5 text-cyan-50/75'}`}>{value}</button>)}
        <select aria-label="Custody method" value={method} onChange={event => setMethod(event.target.value as RecurrenceCustodyMethod)} className="h-8 rounded border border-white/10 bg-[#0b1c22] px-2 text-[10px] text-cyan-50"><option value="publish_complete_index">Publish</option><option value="seal_operational_grammar">Seal</option><option value="establish_dual_custody">Dual custody</option></select>
        <button type="button" onClick={() => setRunKind(runKind === 'primary' ? 'rehearsal' : 'primary')} className="h-8 rounded bg-white/5 px-2 text-[10px] uppercase text-cyan-50/75">{runKind}</button>
        <button type="button" onClick={() => { const next = !prepared; setPrepared(next); updateQuery({ prepared: next ? 1 : 0 }); }} className="h-8 rounded bg-white/5 px-2 text-[10px] text-cyan-50/75">Reader {prepared ? 'ready' : 'open'}</button>
        <button type="button" onClick={() => { const next = !reducedMotion; setReducedMotion(next); updateQuery({ motion: next ? 'reduced' : 'full' }); }} className="h-8 rounded bg-white/5 px-2 text-[10px] text-cyan-50/75">{reducedMotion ? 'Reduced' : 'Full motion'}</button>
        <button type="button" onClick={toggleMute} className="grid h-8 w-8 place-items-center rounded bg-white/5 text-cyan-50/75" aria-label={muted ? 'Unmute preview' : 'Mute preview'}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
        <button type="button" onClick={() => window.location.reload()} className="grid h-8 w-8 place-items-center rounded bg-white/5 text-cyan-50/75" aria-label="Replay current state"><RotateCcw className="h-4 w-4" /></button>
      </aside>
    </main>
  );
}
