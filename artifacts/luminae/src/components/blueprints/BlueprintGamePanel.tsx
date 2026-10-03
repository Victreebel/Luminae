import { RadioTower, Shield } from "lucide-react";
import type {
  ArtifactCard,
  BlueprintPrivateState,
  CardLoreCatalog,
  CivilizationPublicProjectState,
  GamePlayerState,
  ManifestedDevicePublicState,
  ScenarioProtocolPublicState,
} from "@workspace/api-client-react";
import {
  ARTIFACT_DEFINITION_BY_ID,
  BLUEPRINT_DEFINITIONS,
  type BlueprintDefinition,
  type BlueprintId,
  type StandardAffinityKey,
} from "@workspace/game-types";
import { CARD_ART } from "@/lib/cardArtManifest";
import { CARD_NAME_FALLBACK } from "@/lib/cardNameFallback";
import { AntimatterBlueprintCard } from "./AntimatterBlueprintCard";
import {
  HorizontalBlueprintCard,
  type HorizontalBlueprintComponentRecord,
  type HorizontalBlueprintCardState,
} from "./HorizontalBlueprintCard";
import { MantleToOrbitBlueprintCard } from "./MantleToOrbitBlueprintCard";

const STANDARD_AFFINITIES = [
  "flare",
  "continuum",
  "verdance",
  "abyss",
  "radiance",
] as const satisfies readonly StandardAffinityKey[];

const COMPONENT_HOTSPOTS = [
  { left: "28%", top: "43%" },
  { left: "50%", top: "30%" },
  { left: "72%", top: "46%" },
  { left: "51%", top: "66%" },
] as const;

const BLUEPRINT_CARD_META: Record<
  BlueprintId,
  { category: string; tone: "catastrophe" | "industry" | "covenant" }
> = {
  bp_antimatter_detonator: {
    category: "Catastrophe Engine",
    tone: "catastrophe",
  },
  bp_mantle_to_orbit_foundry: {
    category: "Ascension Industry",
    tone: "industry",
  },
  bp_ascension_registry: {
    category: "Stellar Institution",
    tone: "covenant",
  },
  bp_worldshield_covenant: {
    category: "Civic Covenant",
    tone: "covenant",
  },
};

function titleCaseState(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildComponentRecords(
  definition: BlueprintDefinition,
  loreCatalog?: CardLoreCatalog,
): HorizontalBlueprintComponentRecord[] {
  return definition.components.map((component, index) => {
    const artifact = ARTIFACT_DEFINITION_BY_ID[
      component.artifactId as keyof typeof ARTIFACT_DEFINITION_BY_ID
    ];
    const lore = loreCatalog?.[component.artifactId];
    const tier = artifact?.tier ?? 1;

    return {
      artifactId: component.artifactId,
      artifactName:
        lore?.name ?? CARD_NAME_FALLBACK[component.artifactId] ?? component.artifactId,
      artwork: CARD_ART[component.artifactId],
      affinity: artifact?.bonusAffinity ?? definition.civilization.affinity,
      tier: `Tier ${tier === 1 ? "I" : tier === 2 ? "II" : "III"}`,
      eminence: artifact?.eminence ?? 0,
      cost: STANDARD_AFFINITIES.flatMap((affinity) => {
        const amount = artifact?.cost[affinity] ?? 0;
        return amount > 0 ? [{ affinity, amount }] : [];
      }),
      requirement: component.stage,
      flavor: lore?.flavor ?? component.function,
      artifactForm: lore?.artifactForm ?? "Blueprint component",
      blueprintRole: component.function,
      blueprintFamilies: definition.name,
      civilizationLane:
        lore?.civLane ?? definition.civilization.laneLabel,
      engineeringScale:
        lore?.engineeringScale ?? definition.presentation.scaleLabel,
      hotspot: COMPONENT_HOTSPOTS[index % COMPONENT_HOTSPOTS.length],
    };
  });
}

function BlueprintProjectCard({
  blueprintId,
  state,
  matchedComponentIds,
  publicStateLabel,
  loreCatalog,
}: {
  blueprintId: BlueprintId;
  state: HorizontalBlueprintCardState;
  matchedComponentIds: readonly string[];
  publicStateLabel: string;
  loreCatalog?: CardLoreCatalog;
}) {
  const definition = BLUEPRINT_DEFINITIONS[blueprintId];
  const knownComponentIds = definition.components.map(
    (component) => component.artifactId,
  );

  if (blueprintId === "bp_antimatter_detonator") {
    return (
      <AntimatterBlueprintCard
        state={state}
        matchedSockets={matchedComponentIds.length}
        matchedComponentIds={matchedComponentIds}
        knownComponentIds={knownComponentIds}
        publicStateLabel={publicStateLabel}
      />
    );
  }

  if (blueprintId === "bp_mantle_to_orbit_foundry") {
    return (
      <MantleToOrbitBlueprintCard
        state={state}
        matchedSockets={matchedComponentIds.length}
        matchedComponentIds={matchedComponentIds}
        knownComponentIds={knownComponentIds}
        publicStateLabel={publicStateLabel}
      />
    );
  }

  const components = buildComponentRecords(definition, loreCatalog);
  const meta = BLUEPRINT_CARD_META[blueprintId];

  return (
    <HorizontalBlueprintCard
      definition={{
        name: definition.name,
        publicEffect: definition.publicEffect,
        presentation: {
          scaleLabel: definition.presentation.scaleLabel,
          serialCode: definition.presentation.serialCode,
          manifestationScale: definition.civilization.manifestationScale,
        },
        components: definition.components,
      }}
      state={state}
      matchedComponents={matchedComponentIds.length}
      matchedComponentIds={matchedComponentIds}
      artwork={components.map((component) => component.artwork)}
      artworkAlt={`${definition.name} Blueprint components`}
      category={meta.category}
      publicStateLabel={publicStateLabel}
      components={components}
      knownComponentIds={knownComponentIds}
      testId={`${blueprintId}-blueprint-card`}
      componentPanelTestId={`${blueprintId}-component-panel`}
      tone={meta.tone}
    />
  );
}

function PrivateAssembly({
  state,
  loreCatalog,
}: {
  state: BlueprintPrivateState;
  loreCatalog?: CardLoreCatalog;
}) {
  const definition = BLUEPRINT_DEFINITIONS[state.blueprintId];
  if (!definition) return null;

  return (
    <article
      className="mx-auto w-full"
      data-blueprint-private={state.blueprintId}
    >
      <BlueprintProjectCard
        blueprintId={state.blueprintId}
        state="assembling"
        matchedComponentIds={state.matchedComponentIds}
        publicStateLabel="Assembling"
        loreCatalog={loreCatalog}
      />
    </article>
  );
}

function foundryTelemetry(
  device: ManifestedDevicePublicState,
  privateState?: BlueprintPrivateState,
) {
  const storedIds =
    privateState?.foundryStoredArtifactIds ??
    privateState?.foundryRecoveryArtifactIds ??
    [];

  if (device.state === "recovering") {
    return `${storedIds.length} component${storedIds.length === 1 ? "" : "s"} awaiting recovery`;
  }
  if ((device.foundryUsesRemaining ?? 0) > 0) {
    return `${device.foundryUsesRemaining} sustainable use${device.foundryUsesRemaining === 1 ? "" : "s"} remaining`;
  }
  if (device.state === "ready") return "Overdrive available";
  if (storedIds.length > 0) {
    return `${storedIds.length} component${storedIds.length === 1 ? "" : "s"} in Cipher storage`;
  }
  return "Foundry inactive";
}

function PublicDevice({
  device,
  project,
  ownerName,
  privateState,
  loreCatalog,
}: {
  device: ManifestedDevicePublicState;
  project?: CivilizationPublicProjectState;
  ownerName: string;
  privateState?: BlueprintPrivateState;
  loreCatalog?: CardLoreCatalog;
}) {
  const definition = BLUEPRINT_DEFINITIONS[device.blueprintId];
  if (!definition) return null;
  const publicState = project?.deviceState ?? device.state;
  const telemetry =
    device.blueprintId === "bp_mantle_to_orbit_foundry"
      ? foundryTelemetry(device, privateState)
      : null;

  return (
    <article
      className="mx-auto w-full"
      data-blueprint-public={device.blueprintId}
    >
      <BlueprintProjectCard
        blueprintId={device.blueprintId}
        state="manifested"
        matchedComponentIds={definition.components.map(
          (component) => component.artifactId,
        )}
        publicStateLabel={titleCaseState(publicState)}
        loreCatalog={loreCatalog}
      />

      <div
        className="flex min-h-9 items-center justify-between gap-3 border-x border-b border-white/10 bg-black/45 px-3 py-2 text-[9px]"
        data-blueprint-runtime-status={device.blueprintId}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold uppercase text-white/55">
          <RadioTower className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">Owner: {ownerName}</span>
        </span>
        {telemetry && (
          <strong className="text-right font-mono uppercase text-amber-200/75">
            {telemetry}
          </strong>
        )}
        {device.blueprintId === "bp_ascension_registry" && (
          <span
            className="inline-flex items-center gap-1.5"
            aria-label={`${device.ascensionDeferrals ?? 0} of 2 Deferrals`}
          >
            <span className="font-black uppercase text-white/45">Deferrals</span>
            {[0, 1].map((index) => (
              <i
                key={index}
                className={`h-2 w-5 border not-italic ${
                  index < (device.ascensionDeferrals ?? 0)
                    ? "border-amber-200/60 bg-amber-300/70"
                    : "border-white/15 bg-white/[0.035]"
                }`}
              />
            ))}
          </span>
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
  void onOpenArtifact;
  const privateStates = (me?.blueprintPrivateStates ?? []).filter(
    (state) => !state.manifested,
  );
  const publicDevices = players.flatMap((player) =>
    (player.manifestedBlueprintDevices ?? []).map((device) => ({
      device,
      owner: player,
    })),
  );
  if (
    privateStates.length === 0 &&
    publicDevices.length === 0 &&
    scenarioProtocols.length === 0
  ) {
    return null;
  }

  return (
    <section className="space-y-2.5" aria-label="Blueprint assembly and manifested devices">
      <header className="px-1">
        <h2 className="text-[10px] font-semibold uppercase text-muted-foreground">
          Blueprint Projects
        </h2>
      </header>
      <div className="grid gap-3 xl:grid-cols-2">
        {privateStates.map((privateState) => (
          <PrivateAssembly
            key={privateState.blueprintId}
            state={privateState}
            loreCatalog={loreCatalog}
          />
        ))}
        {publicDevices.map(({ device, owner }) => (
          <PublicDevice
            key={`${device.ownerPlayerId}:${device.blueprintId}`}
            device={device}
            project={owner.civilization?.projects?.find(
              (project) =>
                project.blueprintId === device.blueprintId &&
                project.slotIndex === device.slotIndex,
            )}
            ownerName={owner.playerName}
            privateState={
              owner.playerId === me?.playerId
                ? me.blueprintPrivateStates?.find(
                    (entry) => entry.blueprintId === device.blueprintId,
                  )
                : undefined
            }
            loreCatalog={loreCatalog}
          />
        ))}
      </div>
      {scenarioProtocols.map((protocol) => (
        <SealedProtocol
          key={protocol.protocolId}
          protocol={protocol}
          ownerName={
            players.find((player) => player.playerId === protocol.ownerPlayerId)
              ?.playerName ?? "Unknown civilization"
          }
        />
      ))}
    </section>
  );
}
