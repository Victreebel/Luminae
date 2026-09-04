import { useMemo, useState } from 'react';
import {
  triangulationOutcomeId,
  type TriangulationCoordinationArchitecture,
  type TriangulationReferenceCivilization,
  type TriangulationScenarioState,
} from '@workspace/game-types';
import { RotateCcw, SlidersHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import { TriangulationChronicleExperience } from '@/components/chronicles/TriangulationChronicleExperience';
import { gameAudio } from '@/lib/audio';

type PreviewPhase = 'arrival' | 'playing' | 'alignment' | 'resolved' | 'outcome';
const ARCHITECTURES: TriangulationCoordinationArchitecture[] = [
  'preserve_independent_frames', 'establish_unowned_measure', 'instantiate_composite_mind',
];
const REFERENCES: TriangulationReferenceCivilization[] = ['deme', 'myria', 'vesper'];

function param<T extends string>(name: string, fallback: T, values: readonly T[]): T {
  const value = new URLSearchParams(window.location.search).get(name) as T | null;
  return value && values.includes(value) ? value : fallback;
}
function query(values: Record<string, string | number>) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(values).forEach(([key, value]) => params.set(key, String(value)));
  window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
}

export default function DevTriangulationChronicle() {
  const [phase, setPhaseState] = useState<PreviewPhase>(() => param('phase', 'alignment', ['arrival', 'playing', 'alignment', 'resolved', 'outcome'] as const));
  const [architecture, setArchitectureState] = useState(() => param('architecture', 'establish_unowned_measure', ARCHITECTURES));
  const [reference, setReferenceState] = useState(() => param('reference', 'deme', REFERENCES));
  const [runKind, setRunKind] = useState<'primary' | 'rehearsal'>(() => param('run', 'primary', ['primary', 'rehearsal'] as const));
  const [prepared, setPrepared] = useState(() => new URLSearchParams(window.location.search).get('prepared') === '1');
  const [memory, setMemory] = useState(() => new URLSearchParams(window.location.search).get('memory') !== 'off');
  const [reduced, setReduced] = useState(() => new URLSearchParams(window.location.search).get('motion') === 'reduced');
  const [muted, setMuted] = useState(() => gameAudio.isMuted());
  const [controlsOpen, setControlsOpen] = useState(false);
  const setPhase = (value: PreviewPhase) => { setPhaseState(value); query({ phase: value }); };
  const setArchitecture = (value: TriangulationCoordinationArchitecture) => { setArchitectureState(value); query({ architecture: value }); };
  const setReference = (value: TriangulationReferenceCivilization) => { setReferenceState(value); query({ reference: value }); };

  const scenario = useMemo<TriangulationScenarioState>(() => ({
    chronicleId: 'chronicle_triangulation', scenarioId: 'chronicle_triangulation_v1', definitionVersion: 1,
    runKind, architectPlayerId: 'architect', myriaPlayerId: 'myria', vesperPlayerId: 'vesper',
    phase: phase === 'alignment' ? 'awaiting_alignment' : phase === 'resolved' ? 'alignment_resolved' : phase === 'outcome' ? 'finished' : 'playing',
    architectCoreActions: phase === 'playing' ? 3 : 5, alignmentDueAfterActions: 5,
    coordinationArchitecture: phase === 'playing' || phase === 'alignment' ? null : architecture,
    choiceResolvedAtTurn: phase === 'playing' || phase === 'alignment' ? null : 12,
    preparednessMet: prepared,
    preparednessCapabilityId: prepared ? 'artifact:signal_interpretation' : null,
    preparednessArtifactId: prepared ? 't1p03' : null,
    priorMemoryLines: memory ? ['At Vey, you made uncertainty public.', 'At Eido, you made the answer depend on another voice.'] : [],
    referenceCivilization: phase === 'outcome' ? reference : null,
    outcomeId: phase === 'outcome' ? triangulationOutcomeId(architecture, reference) : null,
  }), [architecture, memory, phase, prepared, reference, runKind]);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#02060d] text-white">
      <img src={backgroundCosmos} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="relative z-10 flex h-14 items-center border-b border-white/10 bg-black/75 px-4 font-serif text-sm font-bold text-cyan-50">LUMINAe · Triangulation Chronicle Preview</div>
      <TriangulationChronicleExperience
        state={scenario}
        gameStatus={phase === 'outcome' ? 'finished' : 'playing'}
        localPlayerId="architect"
        reduceMotion={reduced}
        disableFocusTrap
        forceArrival={phase === 'arrival'}
        onChoose={(value) => { setArchitecture(value); setPhase('resolved'); }}
        onReturn={() => setPhase('playing')}
      />
      <div className="relative z-10 grid min-h-[calc(100dvh-3.5rem)] place-items-center p-8 text-center"><div><p className="font-serif text-4xl text-cyan-50/65">Orthe System</p><p className="mt-2 text-xs text-cyan-50/35">Production board remains live beneath the Chronicle presentation.</p></div></div>
      <button
        type="button"
        className="fixed right-2 top-2 z-[501] grid h-9 w-9 place-items-center rounded border border-white/15 bg-[#061016]/95 text-cyan-50 shadow-xl"
        aria-label={controlsOpen ? 'Close preview controls' : 'Open preview controls'}
        onClick={() => setControlsOpen((value) => !value)}
      >
        {controlsOpen ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
      </button>
      <aside className={`${controlsOpen ? 'flex' : 'hidden'} fixed bottom-2 left-2 right-2 z-[500] flex-nowrap items-center gap-1 overflow-x-auto rounded-md border border-white/15 bg-[#061016]/95 p-2 pr-12 shadow-2xl sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 sm:max-w-[34rem] sm:flex-wrap sm:pr-12`}>
        {(['arrival','playing','alignment','resolved','outcome'] as PreviewPhase[]).map((value) => <button key={value} type="button" onClick={() => setPhase(value)} className={`h-8 rounded px-2 text-[10px] uppercase ${phase === value ? 'bg-cyan-100 text-[#071214]' : 'bg-white/5 text-cyan-50/75'}`}>{value}</button>)}
        <select aria-label="Architecture" value={architecture} onChange={(event) => setArchitecture(event.target.value as TriangulationCoordinationArchitecture)} className="h-8 rounded border border-white/10 bg-[#0b1c22] px-2 text-[10px]"><option value="preserve_independent_frames">Frames</option><option value="establish_unowned_measure">Measure</option><option value="instantiate_composite_mind">Composite</option></select>
        <select aria-label="Reference civilization" value={reference} onChange={(event) => setReference(event.target.value as TriangulationReferenceCivilization)} className="h-8 rounded border border-white/10 bg-[#0b1c22] px-2 text-[10px]"><option value="deme">Deme</option><option value="myria">Myria</option><option value="vesper">Vesper</option></select>
        <button type="button" onClick={() => { const value = runKind === 'primary' ? 'rehearsal' : 'primary'; setRunKind(value); query({ run: value }); }} className="h-8 rounded bg-white/5 px-2 text-[10px] uppercase">{runKind}</button>
        <button type="button" onClick={() => { const value = !prepared; setPrepared(value); query({ prepared: value ? 1 : 0 }); }} className="h-8 rounded bg-white/5 px-2 text-[10px]">Frame {prepared ? 'ready' : 'open'}</button>
        <button type="button" onClick={() => { const value = !memory; setMemory(value); query({ memory: value ? 'on' : 'off' }); }} className="h-8 rounded bg-white/5 px-2 text-[10px]">Memory {memory ? 'on' : 'off'}</button>
        <button type="button" onClick={() => { const value = !reduced; setReduced(value); query({ motion: value ? 'reduced' : 'full' }); }} className="h-8 rounded bg-white/5 px-2 text-[10px]">{reduced ? 'Reduced' : 'Full motion'}</button>
        <button type="button" onClick={() => { const value = !muted; gameAudio.setMuted(value); setMuted(value); }} className="grid h-8 w-8 place-items-center rounded bg-white/5" aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
        <button type="button" onClick={() => window.location.reload()} className="grid h-8 w-8 place-items-center rounded bg-white/5" aria-label="Replay"><RotateCcw className="h-4 w-4" /></button>
      </aside>
    </main>
  );
}
