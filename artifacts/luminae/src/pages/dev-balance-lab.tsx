import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { addAiPlayer, startGame } from "@workspace/api-client-react";
import { saveSession } from "@/lib/session";
import {
  LuminaeWordmark,
  OutOfMatchBackdrop,
  OutOfMatchHeader,
  OutOfMatchSectionHeading,
} from "@/components/out-of-match/OutOfMatchChrome";

const CANDIDATES = [
  ["control", "Corrected control", "Production rules plus equal-turn frontier exhaustion."],
  ["reach", "Reach-gated ending", "Standard requires one Tier III; Epic requires two."],
  ["luminary-relationship", "Relationship Luminaries", "Effects and bonds without printed arrival Eminence."],
  ["luminary-artifact-eligibility", "Artifact eligibility", "Artifact bonuses alone qualify one alliance per action."],
  ["luminary-nonexclusive-contact", "Nonexclusive contact", "Each civilization may establish its own relationship after global arrival."],
  ["focus", "Card-bound Focus", "Encrypt accelerates only the encrypted Artifact."],
  ["encrypt-none", "Encrypt without reward", "Concealment and denial without a payment resource."],
  ["payment-floor", "Advanced payment floor", "Tier II and III require one external natural Affinity."],
  ["lineage-floor", "Lineage payment", "Built On lineage can satisfy or waive the advanced payment."],
  ["integrated", "Discarded integrated bundle", "Retained for comparison only; the current bundle failed the automated gates."],
] as const;

type Format = "quick" | "standard" | "epic";
const FORMAT_TARGET: Record<Format, 15 | 20 | 25> = { quick: 15, standard: 20, epic: 25 };
const PLAYTEST_STORAGE_KEY = "luminae_balance_playtests_v1";

type CreatedBalanceRoom = {
  room: {
    id: string;
    inviteCode: string;
  };
  player: {
    id: string;
    name: string;
    avatarId: string | null;
  };
  sessionToken: string;
};

export default function DevBalanceLab() {
  const [, navigate] = useLocation();
  const [candidateId, setCandidateId] = useState("control");
  const [format, setFormat] = useState<Format>("standard");
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [status, setStatus] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const selected = useMemo(() => CANDIDATES.find(([id]) => id === candidateId)!, [candidateId]);

  async function launch(): Promise<void> {
    if (launching) return;
    setLaunching(true);
    setStatus("Creating an isolated guest room…");
    try {
      const response = await fetch('/api/dev/balance/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: "Balance Architect",
          maxPlayers: playerCount,
          victoryRequirement: FORMAT_TARGET[format],
          cinematicMode: "standard",
          candidateId,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Could not create the in-memory balance room');
      }
      const created = await response.json() as CreatedBalanceRoom;
      saveSession({
        roomId: created.room.id,
        inviteCode: created.room.inviteCode,
        playerId: created.player.id,
        sessionToken: created.sessionToken,
        playerName: created.player.name,
        isHost: true,
        avatarId: created.player.avatarId ?? undefined,
      });
      setStatus("Adding rival civilizations…");
      for (let seat = 1; seat < playerCount; seat += 1) {
        await addAiPlayer(created.room.id, { sessionToken: created.sessionToken, difficulty: "hard" });
      }
      setStatus("Opening the production board…");
      await startGame(created.room.id, { sessionToken: created.sessionToken });
      navigate(`/game/${created.room.id}?balanceLab=${encodeURIComponent(candidateId)}&balanceFormat=${format}&balancePlayers=${playerCount}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The balance room could not be launched");
      setLaunching(false);
    }
  }

  function exportPlaytests(): void {
    const contents = localStorage.getItem(PLAYTEST_STORAGE_KEY) ?? "[]";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    link.download = `luminae-creator-playtests-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="oom-shell min-h-[100dvh] text-foreground">
      <OutOfMatchBackdrop />
      <OutOfMatchHeader left={<LuminaeWordmark />} />
      <main className="oom-frame relative z-10 py-8 sm:py-12">
        <section className="oom-panel mx-auto max-w-5xl p-5 sm:p-8">
          <OutOfMatchSectionHeading eyebrow="Developer-only · no account history" title="Production Balance Laboratory" />
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Launch the existing Luminae board with one experimental rule family. The room uses a guest identity,
            the selection lives only in this server process, and no match can enter an Architect Record.
          </p>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              {CANDIDATES.map(([id, name, description]) => (
                <button
                  key={id}
                  type="button"
                  data-active={candidateId === id}
                  onClick={() => setCandidateId(id)}
                  className="rounded-sm border border-white/10 bg-black/20 p-4 text-left transition hover:border-primary/50 data-[active=true]:border-primary data-[active=true]:bg-primary/10"
                >
                  <span className="block font-display text-lg text-foreground">{name}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>

            <aside className="rounded-sm border border-white/10 bg-black/25 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">Selected experiment</p>
              <h2 className="mt-2 font-display text-2xl">{selected[1]}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selected[2]}</p>

              <label className="mt-6 block text-xs uppercase tracking-wider text-muted-foreground">
                Format
                <select value={format} onChange={(event) => setFormat(event.target.value as Format)} className="mt-2 w-full border border-white/15 bg-background p-3 text-foreground">
                  <option value="quick">Quick · 15 Eminence</option>
                  <option value="standard">Standard · 20 Eminence</option>
                  <option value="epic">Epic · 25 Eminence</option>
                </select>
              </label>
              <label className="mt-4 block text-xs uppercase tracking-wider text-muted-foreground">
                Civilizations
                <select value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value) as 2 | 3 | 4)} className="mt-2 w-full border border-white/15 bg-background p-3 text-foreground">
                  <option value={2}>2 · one rival</option>
                  <option value={3}>3 · two rivals</option>
                  <option value={4}>4 · three rivals</option>
                </select>
              </label>

              <button type="button" disabled={launching} onClick={launch} className="oom-action-primary mt-6 h-12 w-full disabled:opacity-50">
                {launching ? "Preparing Domain…" : "Launch in Luminae"}
              </button>
              {status && <p role="status" className="mt-3 text-xs leading-relaxed text-muted-foreground">{status}</p>}
              <button type="button" onClick={exportPlaytests} className="mt-4 w-full border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[.15em] text-muted-foreground hover:border-primary/40 hover:text-foreground">
                Export saved playtest records
              </button>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
