import { useMemo, useRef, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { getGameState } from '@workspace/api-client-react';
import {
  buildCreatorPairDecisionRecord,
  buildCreatorPlaytestRecord,
  CREATOR_PAIR_DECISION_SCHEMA,
  isCreatorPlaytestPairSession,
  type CreatorAssessment,
  type CreatorPairOrder,
  type CreatorPairedPreference,
  type CreatorPlaytestNotes,
  type CreatorPlaytestRatings,
} from '@/lib/balancePlaytestRecord';
import { getSession } from '@/lib/session';

const METRICS: ReadonlyArray<[keyof CreatorPlaytestRatings, string]> = [
  ['clarity', 'Clarity'],
  ['interaction', 'Meaningful interaction'],
  ['lateGameTension', 'Late-game tension'],
  ['opponentAgency', 'Opponent agency'],
  ['repetitiveTurns', 'Repetition (1 none · 5 constant)'],
  ['reversals', 'Meaningful reversals'],
  ['endingSatisfaction', 'Ending satisfaction'],
  ['replay', 'Desire to replay'],
];

const STORAGE_KEY = 'luminae_balance_playtests_v1';

const INITIAL_RATINGS: CreatorPlaytestRatings = {
  clarity: 3,
  interaction: 3,
  lateGameTension: 3,
  opponentAgency: 3,
  repetitiveTurns: 3,
  reversals: 3,
  endingSatisfaction: 3,
  replay: 3,
};

const INITIAL_NOTES: CreatorPlaytestNotes = {
  repetitiveTurns: '',
  friction: '',
  decisiveMoment: '',
  endingEarned: 'unclear',
  rulesChangedDecision: 'unclear',
  rulesChangedDecisionNotes: '',
  preferredVersion: '',
  general: '',
};

interface ConfiguredBalanceRoom {
  roomId: string;
  candidateId: string;
  persistent: false;
}

interface ApiBuildIdentity {
  buildLabel: string;
  startedAt: string;
}

function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `creator-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? fallbackMessage);
  }
  return response.json() as Promise<T>;
}

function storedRecords(): unknown[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Saved creator playtests are not a JSON array; export or clear them before recording another session.');
  }
  return parsed;
}

function AssessmentSelect({
  value,
  onChange,
}: {
  value: CreatorAssessment;
  onChange: (value: CreatorAssessment) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as CreatorAssessment)}
      className="mt-1 w-full border border-white/15 bg-background px-2 py-1.5 text-xs normal-case tracking-normal text-foreground"
    >
      <option value="unclear">Unclear</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

export function BalanceLabOverlay({
  candidateId,
  format,
  playerCount,
}: {
  candidateId: string;
  format: string;
  playerCount: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pairDecisionSaved, setPairDecisionSaved] = useState(false);
  const [savingPairDecision, setSavingPairDecision] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<string | null>(null);
  const [ratings, setRatings] = useState<CreatorPlaytestRatings>(INITIAL_RATINGS);
  const [notes, setNotes] = useState<CreatorPlaytestNotes>(INITIAL_NOTES);
  const [pairId, setPairId] = useState('');
  const [pairOrder, setPairOrder] = useState<CreatorPairOrder>('unpaired');
  const [pairedPreference, setPairedPreference] = useState<CreatorPairedPreference | ''>('');
  const [interrupted, setInterrupted] = useState(false);
  const [interruptionNotes, setInterruptionNotes] = useState('');
  const [valid, setValid] = useState(true);
  const [invalidReason, setInvalidReason] = useState('');
  const sessionIdRef = useRef(makeSessionId());
  const label = useMemo(() => candidateId.replaceAll('-', ' '), [candidateId]);

  if (!import.meta.env.DEV) return null;

  function updateNote<Key extends keyof CreatorPlaytestNotes>(
    key: Key,
    value: CreatorPlaytestNotes[Key],
  ): void {
    setNotes((previous) => ({ ...previous, [key]: value }));
  }

  async function save(): Promise<void> {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    setSavedSummary(null);
    try {
      const session = getSession();
      if (!session) throw new Error('The balance-room guest session is unavailable.');
      const normalizedPairId = pairId.trim() || null;
      if (normalizedPairId && pairOrder === 'unpaired') {
        throw new Error('Choose control first or candidate first for a paired record.');
      }
      if (!normalizedPairId && pairOrder !== 'unpaired') {
        throw new Error('Enter a Pair ID or set the order to unpaired.');
      }
      if (!valid && !invalidReason.trim()) {
        throw new Error('Give a reason when marking the session invalid.');
      }

      const roomId = session.roomId;
      const [state, configured, apiBuild] = await Promise.all([
        getGameState(roomId, { sessionToken: session.sessionToken }),
        fetch(`/api/dev/balance/rooms/${roomId}`, { cache: 'no-store' })
          .then((response) => readJson<ConfiguredBalanceRoom>(response, 'Could not verify the configured ruleset.')),
        fetch('/api/meta/build', { cache: 'no-store' })
          .then((response) => readJson<ApiBuildIdentity>(response, 'Could not verify the API build identity.')),
      ]);
      const recordedAt = Date.now();
      const record = buildCreatorPlaytestRecord({
        state,
        localPlayerId: session.playerId,
        requestedCandidateId: candidateId,
        configuredCandidateId: configured.candidateId,
        format,
        configuredPlayerCount: playerCount,
        sessionId: sessionIdRef.current,
        recordedAt,
        apiBuildLabel: apiBuild.buildLabel,
        apiBuildStartedAt: apiBuild.startedAt,
        webBuildLabel: __LUMINAE_BUILD_LABEL__,
        webBuildStamp: __LUMINAE_BUILD_STAMP__,
        pairId: normalizedPairId,
        pairOrder,
        pairedPreference: null,
        interrupted,
        interruptionNotes,
        valid,
        invalidReason,
        ratings,
        notes,
      });
      const previous = storedRecords();
      const existingIndex = previous.findIndex((entry) => (
        isCreatorPlaytestPairSession(entry) && entry.sessionId === record.sessionId
      ));
      if (existingIndex >= 0) previous[existingIndex] = record;
      else previous.push(record);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previous));
      setSaved(true);
      setSavedSummary(
        `${record.result} · ${record.finishReason} · ${record.turnCount} turns · ${record.playerCount} civilizations`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The creator session could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  function savePairDecision(): void {
    if (savingPairDecision) return;
    setSavingPairDecision(true);
    setPairDecisionSaved(false);
    setError(null);
    try {
      const normalizedPairId = pairId.trim();
      if (!normalizedPairId) throw new Error('Enter the Pair ID shared by both saved matches.');
      if (pairOrder === 'unpaired') throw new Error('Choose the pair’s counterbalanced order.');
      if (!pairedPreference) throw new Error('Choose the explicit preference after both matches.');
      if (!notes.preferredVersion.trim()) throw new Error('Explain the paired preference before finalizing it.');
      const previous = storedRecords();
      const sessions = previous.filter(isCreatorPlaytestPairSession)
        .filter((entry) => entry.pairId === normalizedPairId);
      if (sessions.length < 2) {
        throw new Error('Save both individual match records before finalizing the pair decision.');
      }
      if (sessions.length > 2) {
        throw new Error('This Pair ID has more than two match records; resolve the duplicate records before finalizing.');
      }
      if (sessions.some((entry) => entry.pairOrder !== pairOrder)) {
        throw new Error('The saved match records do not share this counterbalanced order.');
      }
      const controlSessions = sessions.filter((entry) => entry.candidateId === 'control');
      const candidateSessions = sessions.filter((entry) => entry.candidateId !== 'control');
      if (controlSessions.length !== 1 || candidateSessions.length !== 1) {
        throw new Error('A valid pair needs one corrected-control record and one candidate record.');
      }
      const decision = buildCreatorPairDecisionRecord({
        pairId: normalizedPairId,
        recordedAt: Date.now(),
        pairOrder,
        pairedPreference,
        preferenceReason: notes.preferredVersion,
        sessions,
      });
      const existingDecisionIndex = previous.findIndex((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const candidate = entry as { schema?: unknown; pairId?: unknown };
        return candidate.schema === CREATOR_PAIR_DECISION_SCHEMA && candidate.pairId === normalizedPairId;
      });
      if (existingDecisionIndex >= 0) previous[existingDecisionIndex] = decision;
      else previous.push(decision);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previous));
      setPairDecisionSaved(true);
      setSavedSummary(`Pair ${normalizedPairId} finalized · ${pairedPreference.replaceAll('_', ' ')}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The pair decision could not be saved.');
    } finally {
      setSavingPairDecision(false);
    }
  }

  return (
    <div className="fixed right-3 top-20 z-[130] font-sans">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setSaved(false);
          setError(null);
        }}
        className="flex items-center gap-2 rounded-sm border border-cyan-300/40 bg-[#07141d]/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-100 shadow-2xl"
      >
        <FlaskConical className="h-3.5 w-3.5" /> {label} · {format}
      </button>
      {open && (
        <section className="mt-2 max-h-[calc(100dvh-7rem)] w-[min(26rem,calc(100vw-1.5rem))] overflow-y-auto border border-cyan-300/35 bg-[#07111a]/[.98] p-4 text-foreground shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[.2em] text-cyan-200">Creator playtest record</p>
              <h2 className="mt-1 font-display text-xl capitalize">{label}</h2>
            </div>
            <button type="button" aria-label="Close playtest record" onClick={() => setOpen(false)} className="p-1 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Format, target, exact configured ruleset/build, players, opener, scores, turns, ending,
            duration, and board identity are read from the developer room when you save.
          </p>

          <div className="mt-4 grid gap-2">
            {METRICS.map(([id, metric]) => (
              <label key={id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs text-muted-foreground">
                {metric}
                <select
                  aria-label={metric}
                  value={ratings[id]}
                  onChange={(event) => setRatings((value) => ({ ...value, [id]: Number(event.target.value) }))}
                  className="border border-white/15 bg-background px-2 py-1 text-foreground"
                >
                  {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
                </select>
              </label>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <label>Pair ID
              <input value={pairId} onChange={(event) => setPairId(event.target.value)} placeholder="optional" className="mt-1 w-full border border-white/15 bg-background px-2 py-1.5 text-xs normal-case tracking-normal text-foreground" />
            </label>
            <label>Counterbalanced order
              <select value={pairOrder} onChange={(event) => setPairOrder(event.target.value as CreatorPairOrder)} className="mt-1 w-full border border-white/15 bg-background px-2 py-1.5 text-xs normal-case tracking-normal text-foreground">
                <option value="unpaired">Unpaired</option>
                <option value="control_first">Control first</option>
                <option value="candidate_first">Candidate first</option>
              </select>
            </label>
            <label className="col-span-2">Pair decision preference
              <select value={pairedPreference} onChange={(event) => setPairedPreference(event.target.value as CreatorPairedPreference | '')} className="mt-1 w-full border border-white/15 bg-background px-2 py-1.5 text-xs normal-case tracking-normal text-foreground">
                <option value="">Pending · select after both matches</option>
                <option value="corrected_control">Corrected control</option>
                <option value="candidate">Candidate</option>
                <option value="no_preference">No preference</option>
              </select>
            </label>
            <p className="col-span-2 normal-case tracking-normal text-muted-foreground">
              Save match one with preference pending. After match two is also saved, select the preference and finalize one pair-decision record below.
            </p>
            <label>Ending felt earned?
              <AssessmentSelect value={notes.endingEarned} onChange={(value) => updateNote('endingEarned', value)} />
            </label>
            <label>Rule changed a decision?
              <AssessmentSelect value={notes.rulesChangedDecision} onChange={(value) => updateNote('rulesChangedDecision', value)} />
            </label>
          </div>

          <div className="mt-4 grid gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <label>Repetitive turns
              <textarea value={notes.repetitiveTurns} onChange={(event) => updateNote('repetitiveTurns', event.target.value)} rows={2} className="mt-1 w-full resize-y border border-white/15 bg-background p-2 text-xs normal-case tracking-normal text-foreground" />
            </label>
            <label>Friction or confusing rules
              <textarea value={notes.friction} onChange={(event) => updateNote('friction', event.target.value)} rows={2} className="mt-1 w-full resize-y border border-white/15 bg-background p-2 text-xs normal-case tracking-normal text-foreground" />
            </label>
            <label>Decisive moment or reversal
              <textarea value={notes.decisiveMoment} onChange={(event) => updateNote('decisiveMoment', event.target.value)} rows={2} className="mt-1 w-full resize-y border border-white/15 bg-background p-2 text-xs normal-case tracking-normal text-foreground" />
            </label>
            <label>How the tested rule changed a decision
              <textarea value={notes.rulesChangedDecisionNotes} onChange={(event) => updateNote('rulesChangedDecisionNotes', event.target.value)} rows={2} className="mt-1 w-full resize-y border border-white/15 bg-background p-2 text-xs normal-case tracking-normal text-foreground" />
            </label>
            <label>Preferred version and why
              <textarea value={notes.preferredVersion} onChange={(event) => updateNote('preferredVersion', event.target.value)} rows={2} className="mt-1 w-full resize-y border border-white/15 bg-background p-2 text-xs normal-case tracking-normal text-foreground" />
            </label>
            <label>Other notes
              <textarea value={notes.general} onChange={(event) => updateNote('general', event.target.value)} rows={3} className="mt-1 w-full resize-y border border-white/15 bg-background p-2 text-xs normal-case tracking-normal text-foreground" />
            </label>
          </div>

          <div className="mt-4 space-y-3 border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={interrupted} onChange={(event) => setInterrupted(event.target.checked)} />
              Technical interruption occurred
            </label>
            {interrupted && (
              <label className="block text-[10px] uppercase tracking-wider">Interruption details
                <textarea value={interruptionNotes} onChange={(event) => setInterruptionNotes(event.target.value)} rows={2} className="mt-1 w-full resize-y border border-white/15 bg-background p-2 text-xs normal-case tracking-normal text-foreground" />
              </label>
            )}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={valid} onChange={(event) => setValid(event.target.checked)} />
              Count this as a valid session
            </label>
            {!valid && (
              <label className="block text-[10px] uppercase tracking-wider">Invalidation reason
                <textarea value={invalidReason} onChange={(event) => setInvalidReason(event.target.value)} rows={2} className="mt-1 w-full resize-y border border-white/15 bg-background p-2 text-xs normal-case tracking-normal text-foreground" />
              </label>
            )}
          </div>

          {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-red-300">{error}</p>}
          {savedSummary && <p role="status" className="mt-3 text-xs leading-relaxed text-cyan-100">{savedSummary}</p>}
          <button
            type="button"
            disabled={saving || saved}
            onClick={() => void save()}
            className="mt-3 w-full border border-cyan-200/50 bg-cyan-200/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-50 disabled:opacity-50"
          >
            {saving ? 'Reading authoritative match…' : saved ? 'Session saved locally' : 'Save complete session record'}
          </button>
          <button
            type="button"
            disabled={savingPairDecision}
            onClick={savePairDecision}
            className="mt-2 w-full border border-violet-200/40 bg-violet-200/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-violet-50 disabled:opacity-50"
          >
            {savingPairDecision ? 'Checking saved pair…' : pairDecisionSaved ? 'Pair decision saved locally' : 'Finalize pair decision after match two'}
          </button>
          <a href="/dev/balance-lab" className="mt-3 block text-center text-[10px] uppercase tracking-wider text-muted-foreground hover:text-cyan-100">Return to balance laboratory</a>
        </section>
      )}
    </div>
  );
}
