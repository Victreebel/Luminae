import { Check, Circle, LockKeyhole, RadioTower, Shield } from "lucide-react";
import type {
  ArtifactCard,
  CardLoreCatalog,
  GamePlayerState,
  ScenarioProtocolPublicState,
} from "@workspace/api-client-react";
import type {
  BlueprintPrivateState,
  ManifestedDevicePublicState,
} from "@workspace/api-client-react";
import { CARD_ART } from "@/lib/cardArtManifest";

const FAMILY_LABELS = {
  catastrophe_engine: "Catastrophe Engine",
  industrial_chain: "Industrial Chain",
  institution: "Stellar Institution",
  covenant: "Covenant",
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
  const definition = state.definition;
  if (!definition) return null;
  const matched = new Set(state.matchedComponentIds);

  return (
    <article className="overflow-hidden border border-amber-300/20 bg-black/35" data-blueprint-private={state.blueprintId}>
      <header className="flex items-start justify-between gap-3 border-b border-white/8 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase text-amber-300/65">
            Slot {state.slotIndex + 1} // {FAMILY_LABELS[definition.family]}
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
                  src={CARD_ART[component.artifactId]}
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
}: {
  device: ManifestedDevicePublicState;
  ownerName: string;
  privateState?: BlueprintPrivateState;
}) {
  const definition = device.definition;
  if (!definition) return null;
  const storedIds = privateState?.foundryStoredArtifactIds ??
    privateState?.foundryRecoveryArtifactIds ?? [];
  return (
    <article className="grid gap-3 border border-red-300/20 bg-red-950/[0.08] p-3 sm:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)]" data-blueprint-public={device.blueprintId}>
      <div>
        <p className="flex items-center gap-1 text-[8px] font-black uppercase text-red-200/65">
          <RadioTower className="h-3 w-3" aria-hidden="true" /> Public device
        </p>
        <h3 className="mt-1 font-serif text-base font-semibold text-white">{definition.name}</h3>
        <span className="mt-1 block text-[9px] text-white/45">{ownerName} // {device.presentationVariant}</span>
      </div>
      <div className="border-l border-white/8 pl-3">
        <p className="text-[10px] leading-relaxed text-white/70">{definition.publicEffect}</p>
        <span className="mt-2 inline-flex items-center gap-1 border border-red-200/20 bg-black/30 px-2 py-1 text-[8px] font-black uppercase text-red-100/75">
          <Shield className="h-3 w-3" aria-hidden="true" />
          {device.state}
        </span>
        {device.blueprintId === "bp_mantle_to_orbit_foundry" && (
          <p className="mt-2 font-mono text-[9px] uppercase text-amber-200/70">
            {device.state === "recovering"
              ? `${storedIds.length} component${storedIds.length === 1 ? "" : "s"} awaiting recovery`
              : (device.foundryUsesRemaining ?? 0) > 0
                ? `${device.foundryUsesRemaining} sustainable use${device.foundryUsesRemaining === 1 ? "" : "s"} remaining`
                : device.state === "ready"
                  ? "Overdrive available"
                  : storedIds.length > 0
                    ? `${storedIds.length} component${storedIds.length === 1 ? "" : "s"} in Cipher storage`
                    : "Foundry inactive"}
          </p>
        )}
        {device.blueprintId === "bp_ascension_registry" && (
          <div className="mt-2 flex items-center gap-2" aria-label={`${device.ascensionDeferrals ?? 0} of 2 Deferrals`}>
            <span className="text-[8px] font-black uppercase text-white/45">Deferrals</span>
            {[0, 1].map((index) => (
              <span
                key={index}
                className={`h-2 w-5 border ${index < (device.ascensionDeferrals ?? 0) ? "border-amber-200/60 bg-amber-300/70" : "border-white/15 bg-white/[0.035]"}`}
              />
            ))}
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
        {protocol.foundryUsesRemaining !== undefined && (
          <span className="ml-2 font-mono text-[8px] uppercase text-white/45">
            {protocol.foundryUsesRemaining > 0
              ? `${protocol.foundryUsesRemaining} uses`
              : protocol.state === "ready"
                ? "Overdrive ready"
                : protocol.state}
          </span>
        )}
        {protocol.ascensionDeferrals !== undefined && (
          <span className="ml-2 font-mono text-[8px] uppercase text-white/45">
            Deferral {protocol.ascensionDeferrals}/2
          </span>
        )}
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
}: {
  me?: GamePlayerState;
  players: GamePlayerState[];
  scenarioProtocols?: ScenarioProtocolPublicState[];
  loreCatalog?: CardLoreCatalog;
  onOpenArtifact: (card: ArtifactCard) => void;
}) {
  const privateStates = (me?.blueprintPrivateStates ?? []).filter((state) => !state.manifested);
  const publicDevices = players.flatMap((player) =>
    (player.manifestedBlueprintDevices ?? []).map((device) => ({ device, owner: player })),
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
            ? me.blueprintPrivateStates?.find((entry) => entry.blueprintId === device.blueprintId)
            : undefined}
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
