import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

// ── Types (mirrors SimulationOutput from simulate.ts) ──────────────────────

interface SimTimingEntry {
  medianTurn: number | null;
  p25: number | null;
  p75: number | null;
  earlyPct: number | null;
  midPct: number | null;
  latePct: number | null;
  verdict: string;
}

interface SimHistogramBucket {
  bucket: string;
  count: number;
  pct: number;
}

interface SimLuminaryEntry {
  id: string;
  name: string;
  tier: number;
  tierLabel: string;
  requirements: string;
  claimCount: number;
  claimRatePct: number;
  timing: SimTimingEntry;
  histogram: SimHistogramBucket[];
}

interface SimDifficultyResult {
  difficulty: string;
  games: number;
  players: number;
  pacing: {
    avgTurns: number;
    minTurns: number;
    maxTurns: number;
    avgWinnerEminence: number;
    avgClaimsPerGame: number;
    gamesWithClaimsPct: number;
  };
  balance: {
    monoAvgRatePct: number;
    dualAvgRatePct: number;
    tripleAvgRatePct: number;
  };
  tierSummary: Array<{
    tier: number;
    tierLabel: string;
    luminaryCount: number;
    totalClaims: number;
    avgClaimsPerGame: number;
    claimSharePct: number;
  }>;
  luminaries: SimLuminaryEntry[];
  actionDistribution: Array<{ action: string; count: number; sharePct: number }>;
  warnings: string[];
}

interface SimulationOutput {
  $schema: "luminae-simulation/v1";
  meta: {
    timestamp: string;
    games: number;
    playerCounts: number[];
    difficulties: string[];
  };
  results: SimDifficultyResult[];
}

// ── Color palette ──────────────────────────────────────────────────────────

const TIER_COLORS: Record<number, string> = {
  1: "#C8D4F8",
  2: "#96A8E8",
  3: "#FF9C52",
  4: "#CC72EE",
};

const DIFF_COLORS: Record<string, string> = {
  easy: "#2ECC71",
  medium: "#FFC43D",
  hard: "#FF6B52",
};

const TIMING_COLORS = {
  early: "#2ECC71",
  mid: "#FFC43D",
  late: "#FF6B52",
};

function fmt1(n: number): string {
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#96A8E8",
      borderBottom: "1px solid #2a2a3a",
      paddingBottom: 6,
      marginBottom: 14,
      marginTop: 28,
    }}>
      {children}
    </h2>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "#1a1a2e",
      border: "1px solid #2a2a3a",
      borderRadius: 8,
      padding: "12px 16px",
      minWidth: 110,
      flex: "1 1 110px",
    }}>
      <div style={{ fontSize: 11, color: "#96A8E8", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f8" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#666" }}>{sub}</div>}
    </div>
  );
}

function PacingCards({ r }: { r: SimDifficultyResult }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <StatCard label="Avg turns" value={fmt1(r.pacing.avgTurns)} sub={`${r.pacing.minTurns}–${r.pacing.maxTurns} range`} />
      <StatCard label="Avg winner Eminence" value={fmt1(r.pacing.avgWinnerEminence)} />
      <StatCard label="Avg claims/game" value={fmt1(r.pacing.avgClaimsPerGame)} />
      <StatCard label="Games with ≥1 claim" value={fmtPct(r.pacing.gamesWithClaimsPct)} />
      <StatCard label="Players" value={String(r.players)} />
      <StatCard label="Games simulated" value={String(r.games)} />
    </div>
  );
}

function ClaimRateChart({ result }: { result: SimDifficultyResult }) {
  const data = result.luminaries.map((lum) => ({
    name: lum.name.length > 16 ? lum.name.slice(0, 15) + "…" : lum.name,
    fullName: lum.name,
    claimRatePct: +lum.claimRatePct.toFixed(2),
    tier: lum.tier,
    tierLabel: lum.tierLabel,
    requirements: lum.requirements,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 60, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#aaa", fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => v + "%"}
          tick={{ fill: "#888", fontSize: 10 }}
          domain={[0, "dataMax + 5"]}
        />
        <Tooltip
          contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 6 }}
          labelStyle={{ color: "#f0f0f8" }}
          formatter={(value: number, _name: string, props) => {
            const lum = props.payload as typeof data[0];
            return [`${value.toFixed(1)}%`, `${lum.fullName} (${lum.tierLabel}, ${lum.requirements})`];
          }}
        />
        <Bar dataKey="claimRatePct" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={TIER_COLORS[entry.tier] ?? "#888"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TimingChart({ result }: { result: SimDifficultyResult }) {
  const data = result.luminaries
    .filter((lum) => lum.timing.medianTurn !== null)
    .map((lum) => ({
      name: lum.name.length > 16 ? lum.name.slice(0, 15) + "…" : lum.name,
      fullName: lum.name,
      earlyPct: +(lum.timing.earlyPct ?? 0).toFixed(1),
      midPct: +(lum.timing.midPct ?? 0).toFixed(1),
      latePct: +(lum.timing.latePct ?? 0).toFixed(1),
      medianTurn: lum.timing.medianTurn ?? 0,
      tier: lum.tier,
    }));

  if (data.length === 0) {
    return <div style={{ color: "#666", padding: 16 }}>No claims recorded.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 60, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#aaa", fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => v + "%"}
          tick={{ fill: "#888", fontSize: 10 }}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 6 }}
          labelStyle={{ color: "#f0f0f8" }}
          formatter={(value: number, name: string, props) => {
            const entry = props.payload as typeof data[0];
            const label = name === "earlyPct" ? "Early" : name === "midPct" ? "Mid" : "Late";
            return [`${value.toFixed(1)}%  (median t${entry.medianTurn.toFixed(0)})`, label];
          }}
        />
        <Legend
          wrapperStyle={{ color: "#aaa", fontSize: 11 }}
          formatter={(value) => value === "earlyPct" ? "Early" : value === "midPct" ? "Mid" : "Late"}
        />
        <Bar dataKey="earlyPct" stackId="a" fill={TIMING_COLORS.early} />
        <Bar dataKey="midPct" stackId="a" fill={TIMING_COLORS.mid} />
        <Bar dataKey="latePct" stackId="a" fill={TIMING_COLORS.late} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TierSummaryChart({ result }: { result: SimDifficultyResult }) {
  const data = result.tierSummary.map((t) => ({
    name: t.tierLabel,
    avgClaimsPerGame: +t.avgClaimsPerGame.toFixed(3),
    claimSharePct: +t.claimSharePct.toFixed(1),
    tier: t.tier,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis dataKey="name" tick={{ fill: "#aaa", fontSize: 11 }} />
        <YAxis tick={{ fill: "#888", fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 6 }}
          labelStyle={{ color: "#f0f0f8" }}
          formatter={(value: number, name: string) => {
            return [value, name === "avgClaimsPerGame" ? "Avg claims/game" : "Claim share %"];
          }}
        />
        <Legend wrapperStyle={{ color: "#aaa", fontSize: 11 }} />
        <Bar dataKey="avgClaimsPerGame" name="avgClaimsPerGame" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={TIER_COLORS[entry.tier] ?? "#888"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActionDistChart({ result }: { result: SimDifficultyResult }) {
  const data = result.actionDistribution.slice(0, 8).map((a) => ({
    name: a.action.replace(/_/g, " "),
    sharePct: +a.sharePct.toFixed(1),
    count: a.count,
  }));

  const COLORS = ["#607AFF", "#2ECC71", "#FFC43D", "#FF6B52", "#96A8E8", "#B14FD8", "#FF9C52", "#C8D4F8"];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 100 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis
          type="number"
          tickFormatter={(v) => v + "%"}
          tick={{ fill: "#888", fontSize: 10 }}
          domain={[0, "dataMax + 2"]}
        />
        <YAxis dataKey="name" type="category" tick={{ fill: "#aaa", fontSize: 10 }} width={100} />
        <Tooltip
          contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 6 }}
          labelStyle={{ color: "#f0f0f8" }}
          formatter={(value: number, _name: string, props) => {
            return [`${value.toFixed(1)}% (${(props.payload as typeof data[0]).count.toLocaleString()} actions)`, "share"];
          }}
        />
        <Bar dataKey="sharePct" radius={[0, 3, 3, 0]}>
          {data.map((_entry, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function BalanceRadar({ results }: { results: SimDifficultyResult[] }) {
  const data = [
    { metric: "Mono rate" },
    { metric: "Dual rate" },
    { metric: "Triple rate" },
    { metric: "Claims/game" },
    { metric: "Claim coverage" },
  ];

  const maxValues = {
    mono: Math.max(...results.map((r) => r.balance.monoAvgRatePct), 1),
    dual: Math.max(...results.map((r) => r.balance.dualAvgRatePct), 1),
    triple: Math.max(...results.map((r) => r.balance.tripleAvgRatePct), 1),
    claims: Math.max(...results.map((r) => r.pacing.avgClaimsPerGame), 1),
    coverage: 100,
  };

  const enriched = data.map((d, i) => {
    const entry: Record<string, number | string> = { metric: d.metric };
    for (const r of results) {
      const key = r.difficulty;
      if (i === 0) entry[key] = (r.balance.monoAvgRatePct / maxValues.mono) * 100;
      if (i === 1) entry[key] = (r.balance.dualAvgRatePct / maxValues.dual) * 100;
      if (i === 2) entry[key] = (r.balance.tripleAvgRatePct / maxValues.triple) * 100;
      if (i === 3) entry[key] = (r.pacing.avgClaimsPerGame / maxValues.claims) * 100;
      if (i === 4) entry[key] = r.pacing.gamesWithClaimsPct;
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={enriched}>
        <PolarGrid stroke="#2a2a3a" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#aaa", fontSize: 11 }} />
        {results.map((r) => (
          <Radar
            key={r.difficulty}
            name={r.difficulty}
            dataKey={r.difficulty}
            stroke={DIFF_COLORS[r.difficulty] ?? "#aaa"}
            fill={DIFF_COLORS[r.difficulty] ?? "#aaa"}
            fillOpacity={0.15}
          />
        ))}
        <Legend wrapperStyle={{ color: "#aaa", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 6 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function MultiDiffClaimRates({ results }: { results: SimDifficultyResult[] }) {
  const allLums = results[0]?.luminaries ?? [];
  const data = allLums.map((lum) => {
    const row: Record<string, number | string> = {
      name: lum.name.length > 14 ? lum.name.slice(0, 13) + "…" : lum.name,
      fullName: lum.name,
    };
    for (const r of results) {
      const found = r.luminaries.find((l) => l.id === lum.id);
      row[r.difficulty] = +(found?.claimRatePct ?? 0).toFixed(1);
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 64, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#aaa", fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => v + "%"}
          tick={{ fill: "#888", fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 6 }}
          labelStyle={{ color: "#f0f0f8" }}
          formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
        />
        <Legend wrapperStyle={{ color: "#aaa", fontSize: 11 }} />
        {results.map((r) => (
          <Bar
            key={r.difficulty}
            dataKey={r.difficulty}
            fill={DIFF_COLORS[r.difficulty] ?? "#aaa"}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function WarningsPanel({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return (
      <div style={{
        background: "#0d1f15",
        border: "1px solid #1a3a22",
        borderRadius: 6,
        padding: "10px 14px",
        color: "#2ECC71",
        fontSize: 12,
      }}>
        ✓ PASS — no balance concerns detected
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {warnings.map((w, i) => (
        <div key={i} style={{
          background: "#1f1507",
          border: "1px solid #3a2a0d",
          borderRadius: 6,
          padding: "9px 14px",
          color: "#FFC43D",
          fontSize: 12,
        }}>
          ⚠ {w}
        </div>
      ))}
    </div>
  );
}

function TierLegend() {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "#aaa", marginBottom: 12 }}>
      {Object.entries(TIER_COLORS).map(([tier, color]) => (
        <span key={tier} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
          {{1:"mono-1L",2:"mono-2L",3:"dual-3L",4:"triple-4L"}[+tier]}
        </span>
      ))}
    </div>
  );
}

function DifficultyView({ result }: { result: SimDifficultyResult }) {
  return (
    <div>
      <PacingCards r={result} />

      <SectionTitle>Luminary Claim Rates by Tier</SectionTitle>
      <TierLegend />
      <ClaimRateChart result={result} />

      <SectionTitle>Claim Timing Breakdown (Early / Mid / Late)</SectionTitle>
      <p style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>
        Early = first ⅓ of avg game length · Mid = middle ⅓ · Late = final ⅓
      </p>
      <TimingChart result={result} />

      <SectionTitle>Tier Claim Summary</SectionTitle>
      <TierSummaryChart result={result} />

      <SectionTitle>AI Action Distribution</SectionTitle>
      <ActionDistChart result={result} />

      <SectionTitle>Balance Verdict</SectionTitle>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <StatCard label="Mono avg rate/Lum" value={fmtPct(result.balance.monoAvgRatePct)} />
        <StatCard label="Dual avg rate/Lum" value={fmtPct(result.balance.dualAvgRatePct)} />
        <StatCard label="Triple avg rate/Lum" value={fmtPct(result.balance.tripleAvgRatePct)} />
      </div>
      <WarningsPanel warnings={result.warnings} />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

function DropZone({ onData }: { onData: (data: SimulationOutput) => void }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed = JSON.parse(raw) as SimulationOutput;
        if (!parsed.$schema || parsed.$schema !== "luminae-simulation/v1") {
          throw new Error("Not a valid luminae-simulation/v1 JSON file.");
        }
        onData(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse JSON");
      }
    };
    reader.readAsText(file);
  }, [onData]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      padding: 32,
    }}>
      <div style={{ textAlign: "center", maxWidth: 520 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#C8D4F8", marginBottom: 12 }}>
          Luminae Simulation Results
        </div>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 28 }}>
          Generate a results file with the simulate script, then drop it here to visualise.
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? "#607AFF" : "#2a2a3a"}`,
            borderRadius: 12,
            padding: "40px 32px",
            background: dragging ? "#12122a" : "#0f0f1e",
            transition: "all 0.15s",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
          <p style={{ color: "#96A8E8", fontSize: 14, marginBottom: 14 }}>
            Drop a <code style={{ background: "#1a1a2e", padding: "1px 6px", borderRadius: 4 }}>simulation-output.json</code> file here
          </p>
          <label style={{
            display: "inline-block",
            padding: "8px 20px",
            background: "#1e1e3a",
            border: "1px solid #3a3a5a",
            borderRadius: 6,
            color: "#C8D4F8",
            fontSize: 13,
            cursor: "pointer",
          }}>
            Browse file
            <input type="file" accept=".json" style={{ display: "none" }} onChange={onFileInput} />
          </label>
        </div>
        <div style={{ color: "#555", fontSize: 12, fontFamily: "monospace", textAlign: "left" }}>
          <div style={{ marginBottom: 6, color: "#444" }}># Generate the file first:</div>
          <div style={{ color: "#96A8E8" }}>pnpm --filter @workspace/api-server run simulate -- \</div>
          <div style={{ color: "#96A8E8" }}>  --games 200 --difficulty all --output results.json</div>
        </div>
        {error && (
          <div style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "#1f0d0d",
            border: "1px solid #3a1a1a",
            borderRadius: 6,
            color: "#FF6B52",
            fontSize: 12,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export function SimResults() {
  const [data, setData] = useState<SimulationOutput | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleData = useCallback((d: SimulationOutput) => {
    setData(d);
    setActiveTab(d.results[0]?.difficulty ?? null);
  }, []);

  if (!data) {
    return <DropZone onData={handleData} />;
  }

  const activeResult = data.results.find((r) => r.difficulty === activeTab) ?? data.results[0];
  const isMulti = data.results.length > 1;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a14",
      color: "#f0f0f8",
      fontFamily: "system-ui, sans-serif",
      padding: "24px 28px",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#C8D4F8", margin: 0 }}>
            Luminae Simulation Results
          </h1>
          <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0 0" }}>
            {data.meta.games} games · {data.meta.playerCounts.join("/")}-player ·{" "}
            {new Date(data.meta.timestamp).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => setData(null)}
          style={{
            padding: "5px 12px",
            background: "#1a1a2e",
            border: "1px solid #2a2a3a",
            borderRadius: 6,
            color: "#96A8E8",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Load different file
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #1e1e30", paddingBottom: 0 }}>
        {data.results.map((r) => (
          <button
            key={r.difficulty}
            onClick={() => setActiveTab(r.difficulty)}
            style={{
              padding: "7px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === r.difficulty ? `2px solid ${DIFF_COLORS[r.difficulty] ?? "#96A8E8"}` : "2px solid transparent",
              color: activeTab === r.difficulty ? (DIFF_COLORS[r.difficulty] ?? "#C8D4F8") : "#666",
              fontSize: 13,
              fontWeight: activeTab === r.difficulty ? 600 : 400,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.15s",
            }}
          >
            {r.difficulty}
          </button>
        ))}
        {isMulti && (
          <button
            onClick={() => setActiveTab("__compare")}
            style={{
              padding: "7px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "__compare" ? "2px solid #96A8E8" : "2px solid transparent",
              color: activeTab === "__compare" ? "#96A8E8" : "#666",
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Compare all
          </button>
        )}
      </div>

      {activeTab === "__compare" ? (
        <div>
          <SectionTitle>Balance Shape Comparison (normalized)</SectionTitle>
          <BalanceRadar results={data.results} />

          <SectionTitle>Claim Rates by Difficulty</SectionTitle>
          <TierLegend />
          <MultiDiffClaimRates results={data.results} />

          <SectionTitle>Per-difficulty verdicts</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {data.results.map((r) => (
              <div key={r.difficulty}>
                <div style={{ fontSize: 12, color: DIFF_COLORS[r.difficulty] ?? "#aaa", fontWeight: 600, marginBottom: 6, textTransform: "capitalize" }}>
                  {r.difficulty}
                </div>
                <WarningsPanel warnings={r.warnings} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        activeResult && <DifficultyView result={activeResult} />
      )}
    </div>
  );
}

export default SimResults;
