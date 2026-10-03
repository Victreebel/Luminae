import {
  Check,
  ChevronDown,
  CircleDashed,
  Landmark,
  LockKeyhole,
  Orbit,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type {
  BlueprintPrivateState,
  CivilizationPublicProjectState,
  GamePlayerState,
  ManifestedDevicePublicState,
} from "@workspace/api-client-react";
import {
  BLUEPRINT_DEFINITIONS,
  getCivilizationLegacyProgress,
  LEGACY_BLUEPRINT_REQUIREMENT,
  type BlueprintId,
  type CivilizationLegacyCriterionId,
} from "@workspace/game-types";

interface LegacySlot {
  slotIndex: number;
  privateState?: BlueprintPrivateState;
  device?: ManifestedDevicePublicState;
  project?: CivilizationPublicProjectState;
}

const CRITERION_ICONS: Record<CivilizationLegacyCriterionId, LucideIcon> = {
  great_works: Landmark,
  galactic_identity: Orbit,
  continuity: ShieldCheck,
  defining_trial: Sparkles,
};

function slotBlueprintId(slot: LegacySlot): BlueprintId | undefined {
  return slot.project?.blueprintId ?? slot.device?.blueprintId ?? slot.privateState?.blueprintId;
}

function projectName(slot: LegacySlot): string {
  const blueprintId = slotBlueprintId(slot);
  return blueprintId ? BLUEPRINT_DEFINITIONS[blueprintId].name : "Sealed project";
}

function projectProgress(slot: LegacySlot): { matched: number; required: number } {
  const blueprintId = slotBlueprintId(slot);
  const definition = blueprintId ? BLUEPRINT_DEFINITIONS[blueprintId] : null;
  return {
    matched: slot.device || slot.project
      ? (definition?.components.length ?? 1)
      : (slot.privateState?.matchedComponentIds.length ?? 0),
    required: definition?.components.length ?? 0,
  };
}

export function CivilizationLegacyProgress({
  player,
  requirement = LEGACY_BLUEPRINT_REQUIREMENT,
  legacyWinnerId,
}: {
  player?: GamePlayerState;
  requirement?: number;
  legacyWinnerId?: string | null;
}) {
  const normalizedRequirement = Math.max(1, Math.floor(requirement));
  const privateStates = player?.blueprintPrivateStates ?? [];
  const devices = player?.manifestedBlueprintDevices ?? [];
  const projects = player?.civilization?.projects ?? [];
  const progress = getCivilizationLegacyProgress(
    player?.civilization ?? (player ? {
      projects: devices.map((device) => ({
        blueprintId: device.blueprintId,
        status: "manifested" as const,
      })),
      scale: { historicalMaturity: "planetary" as const },
      stability: { band: "stable" as const },
      events: [],
    } : null),
    normalizedRequirement,
  );
  const slotCount = Math.max(
    normalizedRequirement,
    ...privateStates.map((state) => state.slotIndex + 1),
    ...devices.map((device) => device.slotIndex + 1),
    ...projects.map((project) => project.slotIndex + 1),
  );
  const slots: LegacySlot[] = Array.from({ length: slotCount }, (_, slotIndex) => ({
    slotIndex,
    privateState: privateStates.find((state) => state.slotIndex === slotIndex),
    device: devices.find((device) => device.slotIndex === slotIndex),
    project: projects.find((project) => project.slotIndex === slotIndex),
  }));
  const isLegacyVictor = !!player && legacyWinnerId === player.playerId;

  return (
    <section
      className="border-t border-white/10 pt-3"
      style={{ minWidth: 210 }}
      aria-label={`Legacy Path: ${progress.completedCriterionCount} of ${progress.requiredCriterionCount} conditions complete`}
      data-civilization-legacy-progress
    >
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/45">
            Legacy Path
          </div>
          {isLegacyVictor && (
            <div className="mt-0.5 text-[10px] font-semibold text-cyan-50/75">
              Legacy Victory
            </div>
          )}
        </div>
        <strong className="font-serif text-lg tabular-nums text-cyan-50">
          {progress.completedCriterionCount}
          <span className="text-xs text-cyan-100/35">/{progress.requiredCriterionCount}</span>
        </strong>
      </div>

      <div className="grid grid-cols-2 gap-1.5" aria-label="Legacy conditions">
        {progress.criteria.map((criterion) => {
          const Icon = CRITERION_ICONS[criterion.id];
          return (
            <div
              key={criterion.id}
              className="grid min-h-12 items-center gap-2 border px-2 py-1.5"
              style={criterion.achieved
                ? {
                    gridTemplateColumns: '24px minmax(0, 1fr)',
                    borderColor: 'rgba(165, 243, 252, 0.36)',
                    background: 'rgba(103, 232, 249, 0.075)',
                  }
                : {
                    gridTemplateColumns: '24px minmax(0, 1fr)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.22)',
                  }}
              data-legacy-criterion={criterion.id}
              data-achieved={criterion.achieved ? "true" : "false"}
            >
              <span
                className={`grid h-6 w-6 place-items-center border ${
                  criterion.achieved ? 'text-cyan-100' : 'border-white/12 text-white/30'
                }`}
                style={criterion.achieved ? { borderColor: 'rgba(207, 250, 254, 0.48)' } : undefined}
              >
                {criterion.achieved
                  ? <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span
                  className={`block truncate text-[9px] font-semibold ${
                    criterion.achieved ? '' : 'text-white/55'
                  }`}
                  style={criterion.achieved ? { color: 'rgba(236, 254, 255, 0.92)' } : undefined}
                >
                  {criterion.label}
                </span>
                <span className="block text-[8px] font-black tabular-nums text-white/32">
                  {Math.min(criterion.current, criterion.required)}/{criterion.required}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5" aria-label="Blueprint project cards">
        {slots.slice(0, normalizedRequirement).map((slot) => {
          const blueprintId = slotBlueprintId(slot);
          const definition = blueprintId ? BLUEPRINT_DEFINITIONS[blueprintId] : null;
          const manifested = !!slot.project || !!slot.device;
          const known = !!slot.privateState || manifested;
          const project = projectProgress(slot);

          return (
            <div
              key={slot.slotIndex}
              className="relative overflow-hidden border p-2"
              style={{
                aspectRatio: '1.55',
                minHeight: 62,
                borderColor: manifested ? 'rgba(165, 243, 252, 0.42)' : 'rgba(255, 255, 255, 0.1)',
                background: manifested
                  ? 'radial-gradient(circle at 75% 20%, rgba(125,211,252,0.16), transparent 42%), rgba(8,25,39,0.78)'
                  : 'linear-gradient(145deg, rgba(16,25,45,0.72), rgba(3,6,14,0.9))',
              }}
              title={known ? projectName(slot) : `Legacy project ${slot.slotIndex + 1}`}
              data-legacy-project={blueprintId ?? "sealed"}
              data-blueprint-card-state={manifested ? "manifested" : known ? "assembling" : "sealed"}
            >
              <div className="flex items-center justify-between gap-1 text-[7px] font-black uppercase tracking-[0.13em] text-white/34">
                <span>{definition?.presentation.serialCode ?? `Project ${slot.slotIndex + 1}`}</span>
                {known
                  ? <span>{manifested ? "Manifested" : `${project.matched}/${project.required}`}</span>
                  : <LockKeyhole className="h-3 w-3" aria-hidden="true" />}
              </div>
              <div className={`mt-2 line-clamp-2 font-serif text-[10px] font-semibold leading-tight ${
                manifested ? "text-cyan-50/92" : known ? "text-white/58" : "text-white/28"
              }`}>
                {projectName(slot)}
              </div>
              <div className="absolute inset-x-2 flex items-center gap-1" style={{ bottom: '0.375rem' }}>
                <CircleDashed className="h-2.5 w-2.5 text-white/25" aria-hidden="true" />
                <div className="h-px flex-1 bg-white/10">
                  <div
                    className="h-px transition-[width] duration-500"
                    style={{
                      backgroundColor: 'rgba(165, 243, 252, 0.75)',
                      width: manifested
                        ? "100%"
                        : project.required > 0
                          ? `${Math.round((project.matched / project.required) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <details className="group mt-2 border-t border-white/8 pt-2">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[8px] font-black uppercase tracking-[0.13em] text-white/34 hover:text-white/60 [&::-webkit-details-marker]:hidden">
          <span>Legacy conditions</span>
          <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-2 grid gap-1.5">
          {progress.criteria.map((criterion) => (
            <p key={criterion.id} className="text-[9px] leading-relaxed text-white/48">
              <span className="font-semibold text-white/68">{criterion.label}: </span>
              {criterion.detail}
            </p>
          ))}
        </div>
      </details>

      {progress.achieved && (
        <div className="mt-2 text-[8px] font-black uppercase tracking-[0.13em] text-cyan-100">
          Legacy complete
        </div>
      )}
    </section>
  );
}
