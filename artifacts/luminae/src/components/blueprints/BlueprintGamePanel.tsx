import { Check, Circle, Hammer, LockKeyhole, RadioTower, Shield } from "lucide-react";
import type {
  ArtifactCard,
  BlueprintPrivateState,
  CardLoreCatalog,
  GamePlayerState,
  ManifestedDevicePublicState,
  ScenarioProtocolPublicState,
} from "@workspace/api-client-react";
import {
  BLUEPRINT_DEFINITIONS,
  type BlueprintId,
} from "@workspace/game-types";
import ignitionKernelArtwork from "@/assets/cards/runtime/t1r01.webp";
import magneticBottleArtwork from "@/assets/cards/runtime/t1p04.webp";
import causalSparkCoilArtwork from "@/assets/cards/runtime/t1r04.webp";
import horizonExtractorArtwork from "@/assets/cards/runtime/t2o01.webp";
import foundryHeatArtwork from "@/assets/cards/runtime/t1r07.webp";
import foundryLiftArtwork from "@/assets/cards/runtime/t1s02.webp";
import foundryVacuumArtwork from "@/assets/cards/runtime/t1o05.webp";
import shieldWarningArtwork from "@/assets/cards/runtime/t1s01.webp";
import shieldConcealmentArtwork from "@/assets/cards/runtime/t1o01.webp";
import shieldRepairArtwork from "@/assets/cards/runtime/t1p06.webp";
import registryLensArtwork from "@/assets/cards/runtime/t1p05.webp";
import registryAnchorArtwork from "@/assets/cards/runtime/t1s03.webp";
import registryIgniterArtwork from "@/assets/cards/runtime/t1r08.webp";

const COMPONENT_ART: Record<string, string> = {
  t1r01: ignitionKernelArtwork,
  t1p04: magneticBottleArtwork,
  t1r04: causalSparkCoilArtwork,
  t2o01: horizonExtractorArtwork,
  t1r07: foundryHeatArtwork,
  t1s02: foundryLiftArtwork,
  t1o05: foundryVacuumArtwork,
  t1s01: shieldWarningArtwork,
  t1o01: shieldConcealmentArtwork,
  t1p06: shieldRepairArtwork,
  t1p05: registryLensArtwork,
  t1s03: registryAnchorArtwork,
  t1r08: registryIgniterArtwork,
};

const FAMILY_LABELS: Record<BlueprintId, string> = {
  bp_antimatter_detonator: "Catastrophe Engine",
  bp_mantle_to_orbit_foundry: "Industrial Chain",
  bp_ascension_registry: "Institution",
  bp_worldshield_covenant: "Covenant",
};

function PrivateAssembly({
  state,
  loreCatalog,
  owner,
  onOpenArtifact,
}: {
  state: BlueprintPrivateState;
  loreCatalog?: CardLoreCatalog;
  owner: GamePlayerState;
  onOpenArtifact: (card: ArtifactCard) => void;
}) {
  const definition = BLUEPRINT_DEFINITIONS[state.blueprintId];
  const matched = new Set(state.matchedComponentIds);

  return (
    <article className="overflow-hidden border border-amber-300/20 bg-black/35" data-blueprint-private={state.blueprintId}>
      <header className="flex items-start justify-between gap-3 border-b border-white/8 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase text-amber-300/65">
            Slot {state.slotIndex + 1} // {FAMILY_LABELS[state.blueprintId]}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-white">{definition.name}</h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 border border-white/10 bg-white/[0.035] px-1.5 py-1 text-[8px] font-bold uppercase text-white/50">
          <LockKeyhole className="h-3 w-3" aria-hidden="true" />
          Owner only
        </span>
      </header>

      <div className="grid grid-cols-2 gap-px bg-white/8 sm:grid-cols-4" aria-label={`${definition.name} assembly components`}>
        {definition.components.map((component) => {
          const complete = matched.has(component.artifactId);
          const artifact = owner.forgedArtifacts.find((card) => card.id === component.artifactId);
          const lore = loreCatalog?.[component.artifactId];
          return (
            <button
              key={component.artifactId}
              type="button"
              disabled={!artifact}
              onClick={() => artifact && onOpenArtifact(artifact)}
              className="group min-w-0 bg-[#090d12] p-2 text-left enabled:hover:bg-white/[0.055]"
              aria-label={`${complete ? "Matched" : "Required"}: ${lore?.name ?? component.artifactId}, ${component.function}`}
            >
              <span className="relative block aspect-[1.4] overflow-hidden border border-white/10 bg-black">
                <img
                  src={COMPONENT_ART[component.artifactId]}
                  alt=""
                  className={`h-full w-full object-cover transition-opacity ${complete ? "opacity-90" : "opacity-30 grayscale"}`}
                  draggable={false}
                />
                <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center border border-black/50 bg-black/75">
                  {complete
                    ? <Check className="h-3 w-3 text-amber-300" aria-hidden="true" />
                    : <Circle className="h-3 w-3 text-white/35" aria-hidden="true" />}
                </span>
              </span>
              <strong className={`mt-1.5 block truncate text-[10px] ${complete ? "text-amber-200" : "text-white/50"}`}>
                {lore?.name ?? component.artifactId}
              </strong>
              <small className="block truncate text-[8px] uppercase text-white/35">{component.stage}</small>
            </button>
          );
        })}
      </div>

      <footer className="flex items-center justify-between gap-3 px-3 py-2 text-[9px]">
        <span className="text-white/45">Components remain in your civilization.</span>
        <strong className="font-mono text-amber-200">{matched.size} / {definition.components.length}</strong>
      </footer>
    </article>
  );
}

function PublicDevice({
  device,
  ownerName,
  privateState,
  loreCatalog,
  canUseCoreAction,
  onRecoverFoundryComponent,
}: {
  device: ManifestedDevicePublicState;
  ownerName: string;
  privateState?: BlueprintPrivateState;
  loreCatalog?: CardLoreCatalog;
  canUseCoreAction: boolean;
  onRecoverFoundryComponent: (cardId: string) => void;
}) {
  const definition = BLUEPRINT_DEFINITIONS[device.blueprintId];
  const recoveryIds = privateState?.foundryRecoveryComponentIds ?? [];
  return (
    <article className="grid gap-3 border border-red-300/20 bg-red-950/[0.08] p-3 sm:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)]" data-blueprint-public={device.blueprintId}>
      <div>
        <p className="flex items-center gap-1 text-[8px] font-black uppercase text-red-200/65">
          <RadioTower className="h-3 w-3" aria-hidden="true" /> Manifested Project
        </p>
        <h3 className="mt-1 font-serif text-base font-semibold text-white">{definition.name}</h3>
        <span className="mt-1 block text-[9px] text-white/45">
          {ownerName} // {device.covenantState} Covenant // {device.presentationVariant}
        </span>
      </div>
      <div className="border-l border-white/8 pl-3">
        <p className="text-[10px] leading-relaxed text-white/70">{definition.publicEffect}</p>
        <span className="mt-2 inline-flex items-center gap-1 border border-red-200/20 bg-black/30 px-2 py-1 text-[8px] font-black uppercase text-red-100/75">
          <Shield className="h-3 w-3" aria-hidden="true" />
          {device.state}
        </span>
        {device.blueprintId === "bp_mantle_to_orbit_foundry" && (
          <span className="ml-1 mt-2 inline-flex border border-white/10 bg-black/30 px-2 py-1 text-[8px] font-black uppercase text-white/55">
            Uses {device.foundryUses ?? 0}/2
          </span>
        )}
        {device.blueprintId === "bp_ascension_registry" && (
          <span className="ml-1 mt-2 inline-flex border border-white/10 bg-black/30 px-2 py-1 text-[8px] font-black uppercase text-white/55">
            Deferral {device.ascensionDeferral ?? 0}/2
          </span>
        )}
        {device.blueprintId === "bp_mantle_to_orbit_foundry" && recoveryIds.length > 0 && (
          <div className="mt-3 border-t border-white/8 pt-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] font-black uppercase text-amber-200/70">Private recovery</span>
              <span className="text-[8px] text-white/40">Free normal Forge actions</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {recoveryIds.map((cardId) => (
                <button
                  key={cardId}
                  type="button"
                  disabled={!canUseCoreAction}
                  onClick={() => onRecoverFoundryComponent(cardId)}
                  className="group min-w-0 border border-amber-200/15 bg-black/35 p-1.5 text-left transition-colors enabled:hover:border-amber-200/45 enabled:hover:bg-amber-200/[0.07] disabled:opacity-45"
                  title={canUseCoreAction
                    ? `Re-Forge ${loreCatalog?.[cardId]?.name ?? cardId} for free`
                    : "Recovery requires your unused core action"}
                >
                  <span className="relative block aspect-[1.5] overflow-hidden border border-white/10 bg-black">
                    <img
                      src={COMPONENT_ART[cardId]}
                      alt=""
                      className="h-full w-full object-cover opacity-80"
                      draggable={false}
                    />
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center border border-black/50 bg-black/75">
                      <Hammer className="h-3 w-3 text-amber-200" aria-hidden="true" />
                    </span>
                  </span>
                  <strong className="mt-1 block truncate text-[9px] text-amber-100/80">
                    {loreCatalog?.[cardId]?.name ?? cardId}
                  </strong>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function SealedProtocol({
  protocol,
  ownerName,
}: {
  protocol: ScenarioProtocolPublicState;
  ownerName: string;
}) {
  return (
    <article className="grid gap-3 border border-white/15 bg-black/35 p-3 sm:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)]">
      <div>
        <p className="flex items-center gap-1 text-[8px] font-black uppercase text-white/45">
          <RadioTower className="h-3 w-3" aria-hidden="true" /> Manifested protocol
        </p>
        <h3 className="mt-1 font-mono text-sm font-semibold text-white">
          SEALED PROTOCOL // {String(protocol.slotIndex + 1).padStart(2, "0")}
        </h3>
        <span className="mt-1 block text-[9px] text-white/40">{ownerName} // IDENTITY REDACTED</span>
      </div>
      <div className="border-l border-white/8 pl-3">
        <p className="text-[10px] leading-relaxed text-white/70">{protocol.publicEffect}</p>
        <span className="mt-2 inline-flex items-center gap-1 border border-white/15 bg-white/[0.035] px-2 py-1 text-[8px] font-black uppercase text-white/55">
          <Shield className="h-3 w-3" aria-hidden="true" />
          {protocol.state}
        </span>
      </div>
    </article>
  );
}

export function BlueprintGamePanel({
  me,
  players,
  scenarioProtocols = [],
  loreCatalog,
  onOpenArtifact,
  canUseCoreAction = false,
  onRecoverFoundryComponent,
}: {
  me?: GamePlayerState;
  players: GamePlayerState[];
  scenarioProtocols?: ScenarioProtocolPublicState[];
  loreCatalog?: CardLoreCatalog;
  onOpenArtifact: (card: ArtifactCard) => void;
  canUseCoreAction?: boolean;
  onRecoverFoundryComponent: (cardId: string) => void;
}) {
  const privateStates = (me?.blueprintPrivateStates ?? []).filter((state) => !state.manifested);
  const publicDevices = players.flatMap((player) =>
    (player.manifestedBlueprintProjects ?? player.manifestedBlueprintDevices ?? [])
      .map((device) => ({ device, owner: player })),
  );
  if (privateStates.length === 0 && publicDevices.length === 0 && scenarioProtocols.length === 0) return null;

  return (
    <section className="space-y-2.5" aria-label="Blueprint assembly and manifested devices">
      <header className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-[10px] font-semibold uppercase text-muted-foreground">Blueprint Systems</h2>
        {privateStates.length > 0 && <span className="text-[8px] font-mono uppercase text-amber-300/55">Private assembly</span>}
      </header>
      {privateStates.map((privateState) => (
        <PrivateAssembly
          key={privateState.blueprintId}
          state={privateState}
          loreCatalog={loreCatalog}
          owner={me!}
          onOpenArtifact={onOpenArtifact}
        />
      ))}
      {publicDevices.map(({ device, owner }) => (
        <PublicDevice
          key={`${device.ownerPlayerId}:${device.blueprintId}`}
          device={device}
          ownerName={owner.playerName}
          privateState={owner.playerId === me?.playerId
            ? me.blueprintPrivateStates?.find((state) => state.blueprintId === device.blueprintId)
            : undefined}
          loreCatalog={loreCatalog}
          canUseCoreAction={canUseCoreAction}
          onRecoverFoundryComponent={onRecoverFoundryComponent}
        />
      ))}
      {scenarioProtocols.map((protocol) => (
        <SealedProtocol
          key={protocol.protocolId}
          protocol={protocol}
          ownerName={players.find((player) => player.playerId === protocol.ownerPlayerId)?.playerName ?? "Unknown civilization"}
        />
      ))}
    </section>
  );
}
