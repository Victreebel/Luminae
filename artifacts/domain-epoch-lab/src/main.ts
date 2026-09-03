import "./style.css";
import { chooseBotAction, mixedStrategyForSeat } from "./bots";
import { getCatalog } from "./catalog";
import { applyAction, createGame, legalActions } from "./engine";
import { AFFINITIES, type Affinity, type Format, type GameState, type PrototypeAction, type Ruleset, type VictoryModel } from "./types";

const rootElement = document.querySelector<HTMLElement>("#app");
if (!rootElement) throw new Error("Missing #app");
const root: HTMLElement = rootElement;

const CARD_ART: Record<string, string> = {
  t1r01: new URL("../../luminae/src/assets/cards/runtime/t1r01.webp", import.meta.url).href,
  t1s01: new URL("../../luminae/src/assets/cards/runtime/t1s01.webp", import.meta.url).href,
  t1e01: new URL("../../luminae/src/assets/cards/runtime/t1e01.webp", import.meta.url).href,
  t1o01: new URL("../../luminae/src/assets/cards/runtime/t1o01.webp", import.meta.url).href,
  t1p01: new URL("../../luminae/src/assets/cards/runtime/t1p01.webp", import.meta.url).href,
  t2r01: new URL("../../luminae/src/assets/cards/runtime/t2r01.webp", import.meta.url).href,
  t2s01: new URL("../../luminae/src/assets/cards/runtime/t2s01.webp", import.meta.url).href,
  t2e01: new URL("../../luminae/src/assets/cards/runtime/t2e01.webp", import.meta.url).href,
  t2o01: new URL("../../luminae/src/assets/cards/runtime/t2o01.webp", import.meta.url).href,
  t2p01: new URL("../../luminae/src/assets/cards/runtime/t2p01.webp", import.meta.url).href,
  t3r01: new URL("../../luminae/src/assets/cards/runtime/t3r01.webp", import.meta.url).href,
  t3s01: new URL("../../luminae/src/assets/cards/runtime/t3s01.webp", import.meta.url).href,
  t3e01: new URL("../../luminae/src/assets/cards/runtime/t3e01.webp", import.meta.url).href,
  t3o01: new URL("../../luminae/src/assets/cards/runtime/t3o01.webp", import.meta.url).href,
  t3p01: new URL("../../luminae/src/assets/cards/runtime/t3p01.webp", import.meta.url).href,
};
const AFFINITY_ART: Record<Affinity, string> = {
  flare: new URL("../../luminae/src/assets/affinity/home/flare.png", import.meta.url).href,
  continuum: new URL("../../luminae/src/assets/affinity/home/continuum.png", import.meta.url).href,
  verdance: new URL("../../luminae/src/assets/affinity/home/verdance.png", import.meta.url).href,
  abyss: new URL("../../luminae/src/assets/affinity/home/abyss.png", import.meta.url).href,
  radiance: new URL("../../luminae/src/assets/affinity/home/radiance.png", import.meta.url).href,
};

let state: GameState = createGame({ seed: 17, playerCount: 3, format: "standard", victoryModel: "eminence", catalog: "micro", optionalModules: [] });
let briefingOpen = true;
let settingsOpen = false;
let lastMoment = "LUMINAe has established a bounded view into this Domain.";
let selectedActionIndex: number | null = null;
let resolutionMoment: { title: string; effects: string[]; rivals: number } | null = null;

const artifact = (id: string | null) => id ? getCatalog(state.ruleset.catalog).find((candidate) => candidate.id === id) ?? null : null;
const pretty = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function actionLabel(action: PrototypeAction): string {
  if (action.type === "initiate") return `Initiate ${artifact(state.frontier[action.sector])?.name} in Program ${action.slot + 1}`;
  if (action.type === "channel") return `Channel ${action.placements.map((placement) => pretty(placement.affinity)).join(" + ")}`;
  if (action.type === "pivot") return `Pivot away from Program ${action.slot + 1}`;
  return `Coordinate ${artifact(action.artifactId)?.name}`;
}

function actionDetail(action: PrototypeAction): string {
  if (action.type === "initiate") {
    const inherited = action.inheritedAffinity ? ` Lineage also satisfies one ${pretty(action.inheritedAffinity)} requirement.` : "";
    return `Commit one ${pretty(action.startingAffinity)} from the Well.${inherited}`;
  }
  if (action.type === "channel") {
    const concentrated = action.placements[0].affinity === action.placements[1].affinity;
    return `Commit two addressability units to active Programs.${concentrated ? " Concentration raises Domain Tension." : ""}`;
  }
  if (action.type === "pivot") return "Recover committed addressability, discard the acceleration window, and raise Tension.";
  const direct = artifact(action.artifactId)?.tags.includes(state.condition.requiredTag);
  return direct ? `Directly address ${state.condition.name}: +2 Domain progress and +1 Eminence.` : `Improvise support against ${state.condition.name}: +1 Domain progress.`;
}

function previewEffects(action: PrototypeAction): string[] {
  const player = state.players[0];
  const projected = applyAction(state, action);
  const effects: string[] = [];
  if (action.type === "initiate") {
    const card = artifact(state.frontier[action.sector]);
    effects.push(`Program ${action.slot + 1}: Empty → ${card?.name ?? "new capability"}`);
    effects.push(`${pretty(action.startingAffinity)} Well: ${state.well[action.startingAffinity]} → ${projected.well[action.startingAffinity]}`);
    if (action.inheritedAffinity) effects.push(`Lineage: one ${pretty(action.inheritedAffinity)} requirement is already satisfied`);
  } else if (action.type === "channel") {
    const changes = new Map<Affinity, number>();
    for (const placement of action.placements) changes.set(placement.affinity, (changes.get(placement.affinity) ?? 0) + 1);
    for (const [affinity, amount] of changes) effects.push(`${pretty(affinity)} Well: ${state.well[affinity]} → ${state.well[affinity] - amount}`);
    for (const slot of [...new Set(action.placements.map((placement) => placement.slot))]) {
      const before = player.programs[slot];
      const after = projected.players[0].programs[slot];
      const card = before ? artifact(before.artifactId) : null;
      const additions = action.placements.filter((placement) => placement.slot === slot).map((placement) => pretty(placement.affinity)).join(" + ");
      effects.push(after ? `Program ${slot + 1}: add ${additions}` : `${card?.name ?? `Program ${slot + 1}`} becomes operational; its committed units return to the Well`);
    }
    if (projected.tension > state.tension) effects.push(`Domain Tension: ${state.tension} → ${projected.tension}`);
  } else if (action.type === "pivot") {
    const program = player.programs[action.slot];
    effects.push(`Program ${action.slot + 1}: ${artifact(program?.artifactId ?? null)?.name ?? "active capability"} → abandoned`);
    effects.push("All committed addressability in that Program returns to the Well");
    effects.push(`Domain Tension: ${state.tension} → ${projected.tension}`);
  } else {
    effects.push(`Domain progress: ${state.epochContribution} → ${projected.epochContribution}`);
    if (projected.players[0].eminence > player.eminence) effects.push(`Eminence: ${player.eminence} → ${projected.players[0].eminence}`);
    effects.push(`${artifact(action.artifactId)?.name ?? "Capability"}: Operational → Deployed this epoch`);
  }
  return effects;
}

function recommendation(actions: PrototypeAction[]): { index: number; action: PrototypeAction; reason: string } | null {
  if (actions.length === 0) return null;
  const player = state.players[0];
  const ranked = actions.map((action, index) => {
    let score = 0;
    let reason = "Maintain operational momentum.";
    if (action.type === "channel") {
      const projected = applyAction(state, action);
      const completes = projected.players[0].implemented.length > player.implemented.length;
      score = completes ? 130 : 80;
      reason = completes ? "Complete a Program and bring a new capability online." : "Advance active development by two requirements.";
    } else if (action.type === "coordinate") {
      const direct = artifact(action.artifactId)?.tags.includes(state.condition.requiredTag);
      score = direct ? 140 : 55;
      reason = direct ? "Deploy the right capability against the Domain crisis." : "Provide improvised support to the Domain.";
    } else if (action.type === "initiate") {
      const candidate = artifact(state.frontier[action.sector]);
      score = player.programs.every((program) => program === null) ? 100 : 60;
      if (candidate?.tags.includes(player.imperative.tag)) score += 8;
      if (action.inheritedAffinity) score += 6;
      if (action.slot === 0) score += 2;
      reason = action.inheritedAffinity ? "Exploit an established lineage to accelerate a more advanced capability." : "Open a new path of technological development.";
    } else {
      score = 5;
      reason = "Clear a blocked Program and recover its committed addressability.";
    }
    return { index, action, reason, score };
  });
  const best = ranked.sort((left, right) => right.score - left.score)[0];
  return { index: best.index, action: best.action, reason: best.reason };
}

function affinityIcon(affinity: Affinity, stateClass = ""): string {
  return `<span class="affinity-pip ${affinity} ${stateClass}" title="${pretty(affinity)}"><img src="${AFFINITY_ART[affinity]}" alt=""></span>`;
}
function requirementPips(id: string, committed?: Record<Affinity, number>, inherited?: Affinity | null): string {
  const card = artifact(id);
  if (!card) return "";
  return AFFINITIES.flatMap((affinity) => Array.from({ length: card.requirements[affinity] }, (_, index) => {
    const committedCount = committed?.[affinity] ?? 0;
    const inheritedCount = inherited === affinity ? 1 : 0;
    return affinityIcon(affinity, index < committedCount ? "filled" : index < committedCount + inheritedCount ? "lineage-filled" : "");
  })).join("");
}
function attachedActionPanel(index: number, actions: PrototypeAction[], placement: "below" | "above"): string {
  if (selectedActionIndex !== index) return "";
  const action = actions[index];
  if (!action) return "";
  return `<section class="object-action-panel ${placement}" aria-label="Selected intervention"><p class="kicker">Before you commit</p><b>${actionLabel(action)}</b><ul>${previewEffects(action).map((effect) => `<li>${effect}</li>`).join("")}</ul><div><button type="button" id="cancel-selection">Cancel</button><button type="button" class="confirm-action" data-confirm-action>Confirm</button></div></section>`;
}
function frontierCard(sector: Affinity, actions: PrototypeAction[], suggestedIndex: number | null): string {
  const id = state.frontier[sector];
  const card = artifact(id);
  if (!card || !id) return `<div class="object-action-wrap"><article class="frontier-card exhausted ${sector}"><span class="sector-name">${pretty(sector)}</span><p>Frontier quiet</p></article></div>`;
  const candidates = actions.map((action, index) => ({ action, index })).filter(({ action }) => action.type === "initiate" && action.sector === sector);
  const choice = candidates.sort((left, right) => (left.action.type === "initiate" && left.action.slot === 0 ? -1 : 0) - (right.action.type === "initiate" && right.action.slot === 0 ? -1 : 0))[0];
  const selectable = choice ? `data-select-action="${choice.index}"` : "disabled";
  const classes = `${choice ? "selectable" : "unavailable"} ${choice?.index === selectedActionIndex ? "selected" : ""} ${choice?.index === suggestedIndex ? "suggested" : ""}`;
  return `<div class="object-action-wrap"><button type="button" class="frontier-card ${sector} ${classes}" ${selectable}><img class="card-art" src="${CARD_ART[id]}" alt=""><div class="card-shade"></div><div class="card-content"><div class="card-topline"><span>${pretty(card.scale)}</span><b>${card.eminence} ◆</b></div><h3>${card.name}</h3><div class="requirements">${requirementPips(id)}</div><p>${choice ? "Select to initiate" : "No open Program slot"}</p></div></button>${choice ? attachedActionPanel(choice.index, actions, "below") : ""}</div>`;
}
function programSlot(slot: 0 | 1, actions: PrototypeAction[]): string {
  const program = state.players[0].programs[slot];
  if (!program) return `<article class="program-slot empty"><span class="slot-index">0${slot + 1}</span><div><b>Program ${slot + 1}</b><p>Awaiting initiation</p></div></article>`;
  const card = artifact(program.artifactId)!;
  const candidates = actions.map((action, index) => ({ action, index })).filter(({ action }) => action.type === "channel" && action.placements.some((placement) => placement.slot === slot));
  const choice = candidates.sort((left, right) => {
    const leftComplete = applyAction(state, left.action).players[0].programs[slot] === null ? 1 : 0;
    const rightComplete = applyAction(state, right.action).players[0].programs[slot] === null ? 1 : 0;
    return rightComplete - leftComplete;
  })[0];
  const classes = `${choice ? "selectable" : "unavailable"} ${choice?.index === selectedActionIndex ? "selected" : ""}`;
  return `<div class="object-action-wrap"><button type="button" class="program-slot active-program ${classes}" ${choice ? `data-select-action="${choice.index}"` : "disabled"}><img src="${CARD_ART[program.artifactId]}" alt=""><div class="program-overlay"><span class="slot-index">0${slot + 1}</span><div><b>${card.name}</b><p>${choice ? "Select to channel" : `${pretty(card.scale)} Program`}</p><div class="requirements">${requirementPips(card.id, program.committed, program.inheritedAffinity)}</div></div></div></button>${choice ? attachedActionPanel(choice.index, actions, "above") : ""}</div>`;
}
function operationalCard(id: string, actions: PrototypeAction[]): string {
  const card = artifact(id)!;
  const exhausted = state.players[0].exhausted.includes(id);
  const choice = actions.map((action, index) => ({ action, index })).find(({ action }) => action.type === "coordinate" && action.artifactId === id);
  return `<div class="object-action-wrap operational-wrap"><button type="button" class="operational-card ${exhausted ? "exhausted" : "selectable"} ${choice?.index === selectedActionIndex ? "selected" : ""}" ${choice ? `data-select-action="${choice.index}"` : "disabled"}><img src="${CARD_ART[id]}" alt=""><div><b>${card.name}</b><span>${exhausted ? "Deployed" : "Select to coordinate"}</span></div></button>${choice ? attachedActionPanel(choice.index, actions, "above") : ""}</div>`;
}
function runBots(): number {
  let count = 0;
  let safety = 100;
  while (state.phase === "playing" && state.activePlayerIndex !== 0 && safety-- > 0) {
    const action = chooseBotAction(state, mixedStrategyForSeat(state.activePlayerIndex, state.ruleset.seed));
    if (!action) break;
    state = applyAction(state, action);
    count += 1;
  }
  return count;
}
function exportRun(): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
  link.download = `domain-epoch-${state.ruleset.seed}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function executeAction(index: number): void {
  if (state.phase !== "playing" || state.activePlayerIndex !== 0) return;
  const actions = legalActions(state);
  const chosen = actions[index];
  if (!chosen) return;
  const label = actionLabel(chosen);
  const effects = previewEffects(chosen);
  state = applyAction(state, chosen);
  const rivals = runBots();
  lastMoment = `${label}. ${rivals} rival ${rivals === 1 ? "interval" : "intervals"} followed.`;
  selectedActionIndex = null;
  resolutionMoment = { title: label, effects, rivals };
  render();
}

function render(): void {
  const player = state.players[0];
  const actions = state.activePlayerIndex === 0 ? legalActions(state) : [];
  const recommended = recommendation(actions);
  if (selectedActionIndex !== null && !actions[selectedActionIndex]) selectedActionIndex = null;
  const selected = selectedActionIndex === null ? null : actions[selectedActionIndex];
  const target = Math.ceil(state.condition.targetPerPlayer * state.ruleset.playerCount);
  const progress = Math.min(100, (state.epochContribution / target) * 100);
  const winnerNames = state.winnerIds.map((id) => state.players.find((candidate) => candidate.id === id)?.name ?? id).join(" · ");
  root.innerHTML = `<div class="game-shell">
    <header class="game-header"><div class="brand"><span class="brand-mark">L</span><div><b>LUMINAe</b><small>Domain Epoch // isolated playtest</small></div></div><div class="epoch-clock"><span>Epoch ${state.epoch}</span><b>Interval ${state.totalTurns + 1}</b></div><div class="header-actions"><button id="settings" class="icon-button">Configure</button><button id="new-game" class="icon-button">Restart</button></div></header>
    ${settingsOpen ? `<section class="settings-panel"><label>Seed <input id="seed" type="number" value="${state.ruleset.seed}"></label><label>Civilizations <select id="players">${[2,3,4].map((value) => `<option ${state.ruleset.playerCount === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Format <select id="format">${["quick","standard","epic"].map((value) => `<option ${state.ruleset.format === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Evaluation <select id="victory">${["eminence","legacy","keystone"].map((value) => `<option ${state.ruleset.victoryModel === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><button id="apply-settings">Begin configured Domain</button><button id="export">Export replay</button></section>` : ""}
    <main class="board">
      <aside class="domain-rail"><section class="condition-panel"><p class="kicker">Domain condition</p><h2>${state.condition.name}</h2><p>Operational capabilities can be deployed to stabilize this epoch.</p><div class="progress-track"><i style="width:${progress}%"></i></div><div class="condition-score"><b>${state.epochContribution}</b><span>/ ${target} required</span></div></section><section class="tension-panel"><div><p class="kicker">Domain tension</p><b>${state.tension}</b></div><div class="tension-meter">${Array.from({ length: 8 }, (_, index) => `<i class="${index < state.tension ? "lit" : ""}"></i>`).join("")}</div><small>Concentrated Channeling and abandoned Programs strain regional addressability.</small></section><section class="well-panel"><div class="well-core"><span>Regional</span><b>WELL</b></div><div class="well-orbit">${AFFINITIES.map((affinity) => `<div class="well-node ${affinity}">${affinityIcon(affinity)}<b>${state.well[affinity]}</b><span>${pretty(affinity)}</span></div>`).join("")}</div></section></aside>
      <section class="playfield"><div class="section-heading"><div><p class="kicker">Comparative possibility frontier</p><h2>Five addressable sectors</h2></div><span>Select a visible Artifact to begin a Program</span></div><div class="frontier-row">${AFFINITIES.map((affinity) => frontierCard(affinity, actions, recommended?.index ?? null)).join("")}</div><div class="civilization-heading"><div><p class="kicker">Your civilization</p><h2>${player.name}</h2></div><div class="civ-score"><span>Eminence</span><b>${player.eminence}</b><span>Legacy ${player.legacy.reach} · ${player.legacy.network} · ${player.legacy.resilience}</span></div></div><div class="development-grid"><section><div class="subheading"><b>Active Programs</b><span>Select one to commit addressability</span></div><div class="program-grid">${programSlot(0, actions)}${programSlot(1, actions)}</div></section><section><div class="subheading"><b>Operational lineage</b><span>${player.imperative.name}${player.imperativeComplete ? " · fulfilled" : ""}</span></div><div class="lineage-row">${player.implemented.length ? player.implemented.map((id) => operationalCard(id, actions)).join("") : `<div class="lineage-empty"><span>◇</span><p>Your first operational capability will establish this civilization’s lineage.</p></div>`}</div></section></div></section>
      <aside class="rival-rail"><div class="section-heading compact"><div><p class="kicker">Cohort telemetry</p><h2>Other civilizations</h2></div></div>${state.players.slice(1).map((rival, index) => `<article class="rival-card ${state.activePlayerIndex === index + 1 ? "acting" : ""}"><div class="rival-head"><span>0${index + 2}</span><div><b>${rival.name}</b><small>${pretty(mixedStrategyForSeat(index + 1, state.ruleset.seed))} cognition</small></div><strong>${rival.eminence} ◆</strong></div><div class="rival-programs">${rival.programs.map((program) => `<i class="${program ? "occupied" : ""}"></i>`).join("")}<span>${rival.implemented.length} operational</span></div><p>${rival.imperative.name}${rival.imperativeComplete ? " · fulfilled" : ""}</p></article>`).join("")}<section class="moment-log"><p class="kicker">Last interval</p><p>${lastMoment}</p><details><summary>Observation log</summary><ol>${state.log.slice(-12).reverse().map((entry) => `<li>${entry.detail}</li>`).join("")}</ol></details></section></aside>
    </main>
    <footer class="action-dock"><div class="turn-beacon"><i></i><div><span>${state.phase === "complete" ? "Observation complete" : selected ? "Intervention selected" : "Your intervention"}</span><b>${state.phase === "complete" ? `Most consequential: ${winnerNames}` : selected ? "Confirm or cancel directly on the selected object" : "Choose a highlighted object on the board"}</b></div></div>${state.phase === "complete" ? `<button id="new-domain" class="primary-action"><span>Observe another Domain</span><small>Begin a new seeded comparison without changing history.</small></button>` : `<section class="choice-guidance"><b>${selected ? actionLabel(selected) : recommended?.action.type === "coordinate" ? "Select an operational capability to Coordinate" : recommended?.action.type === "channel" ? "Select an active Program to Channel" : "Select a frontier Artifact to Initiate"}</b><span>${selected ? "The action and its consequences are attached to that object." : recommended ? `Suggested: ${actionLabel(recommended.action)}` : "No intervention is currently available."}</span></section>`}<div class="legal-count"><b>${actions.length}</b><span>legal interventions</span></div></footer>
    ${resolutionMoment ? `<div class="resolution-backdrop"><section class="resolution-card"><p class="kicker">Intervention resolved</p><h2>${resolutionMoment.title}</h2><ul>${resolutionMoment.effects.map((effect) => `<li>${effect}</li>`).join("")}</ul><p>${resolutionMoment.rivals} rival ${resolutionMoment.rivals === 1 ? "interval has" : "intervals have"} now passed. The updated board remains visible behind this record.</p><button type="button" id="dismiss-resolution">Continue observation</button></section></div>` : ""}
    ${briefingOpen ? `<div class="briefing-backdrop"><section class="briefing"><p class="kicker">LUMINAe observation ready</p><div class="briefing-sigil">L</div><h1>Enter the Domain Epoch</h1><p>Centuries of history will be translated into a sequence of consequential interventions. Accelerate technology, establish lineage, and decide how much your civilization contributes to the Domain it shares.</p><div class="briefing-pillars"><div><b>Build</b><span>Fill two Programs from the regional Well.</span></div><div><b>Connect</b><span>Use established lineage to satisfy later requirements.</span></div><div><b>Respond</b><span>Deploy capabilities against shared Domain conditions.</span></div></div><button id="enter-domain">Begin observation</button><small>This is an isolated prototype. No account or production history is affected.</small></section></div>` : ""}
  </div>`;

  root.querySelector("#enter-domain")?.addEventListener("click", () => { briefingOpen = false; render(); });
  root.querySelector("#settings")?.addEventListener("click", () => { settingsOpen = !settingsOpen; render(); });
  root.querySelector("#new-game")?.addEventListener("click", () => { state = createGame(state.ruleset); briefingOpen = true; selectedActionIndex = null; resolutionMoment = null; lastMoment = "A fresh observation has been prepared."; render(); });
  root.querySelector("#new-domain")?.addEventListener("click", () => { state = createGame({ ...state.ruleset, seed: state.ruleset.seed + 1 }); briefingOpen = true; selectedActionIndex = null; resolutionMoment = null; lastMoment = "A new Domain has entered operational reach."; render(); });
  root.querySelector("#apply-settings")?.addEventListener("click", () => { const next: Ruleset = { seed: Number((root.querySelector("#seed") as HTMLInputElement).value), playerCount: Number((root.querySelector("#players") as HTMLSelectElement).value) as 2 | 3 | 4, format: (root.querySelector("#format") as HTMLSelectElement).value as Format, victoryModel: (root.querySelector("#victory") as HTMLSelectElement).value as VictoryModel, catalog: "micro", optionalModules: [] }; state = createGame(next); settingsOpen = false; briefingOpen = true; selectedActionIndex = null; resolutionMoment = null; lastMoment = "The configured observation is ready."; render(); });
  root.querySelector("#export")?.addEventListener("click", exportRun);
  root.querySelector("#bots")?.addEventListener("click", () => { const rivals = runBots(); lastMoment = `${rivals} cohort intervals resolved.`; render(); });
}

root.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("[data-confirm-action]") && selectedActionIndex !== null) { executeAction(selectedActionIndex); return; }
  if (target.closest("#cancel-selection")) { selectedActionIndex = null; render(); return; }
  const selection = target.closest<HTMLButtonElement>("button[data-select-action]");
  if (selection) { selectedActionIndex = Number(selection.dataset.selectAction); render(); return; }
  if (target.closest("#dismiss-resolution")) { resolutionMoment = null; render(); }
});
render();
