import { useMemo, useState } from "react";
import { RotateCcw, SlidersHorizontal, Volume2, VolumeX, X } from "lucide-react";
import type { GamePlayerState } from "@workspace/api-client-react";
import {
  BLUEPRINT_DEFINITIONS,
  type BlueprintId,
  type BlueprintManifestationEvent,
} from "@workspace/game-types";
import { BlueprintPresentationOverlay } from "@/components/blueprints/BlueprintPresentationOverlay";
import { gameAudio } from "@/lib/audio";

type PreviewBlueprint = Extract<
  BlueprintId,
  "bp_mantle_to_orbit_foundry" | "bp_worldshield_covenant"
>;

const PLAYERS = [{ playerId: "architect", playerName: "Architect" }] as GamePlayerState[];

function initialBlueprint(): PreviewBlueprint {
  return new URLSearchParams(window.location.search).get("blueprint") === "worldshield"
    ? "bp_worldshield_covenant"
    : "bp_mantle_to_orbit_foundry";
}

export default function DevBlueprintPresentation() {
  const [blueprintId, setBlueprintId] = useState<PreviewBlueprint>(initialBlueprint);
  const [reducedMotion, setReducedMotion] = useState(
    () => new URLSearchParams(window.location.search).get("motion") === "reduced",
  );
  const [muted, setMuted] = useState(() => gameAudio.isMuted());
  const [controlsOpen, setControlsOpen] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  const manifestation = useMemo<BlueprintManifestationEvent>(() => {
    const definition = BLUEPRINT_DEFINITIONS[blueprintId];
    return {
      eventId: `dev-${blueprintId}-${replayKey}`,
      blueprintId,
      ownerPlayerId: "architect",
      slotIndex: 0,
      presentationVariant: "armored",
      createdAt: replayKey + 1,
      definition: {
        name: definition.name,
        publicEffect: definition.publicEffect,
        initialDeviceState: definition.initialDeviceState,
      },
    };
  }, [blueprintId, replayKey]);

  const updateQuery = (nextBlueprint: PreviewBlueprint, reduced: boolean) => {
    const url = new URL(window.location.href);
    url.searchParams.set(
      "blueprint",
      nextBlueprint === "bp_worldshield_covenant" ? "worldshield" : "foundry",
    );
    url.searchParams.set("motion", reduced ? "reduced" : "full");
    window.history.replaceState(null, "", url);
  };

  const chooseBlueprint = (next: PreviewBlueprint) => {
    setBlueprintId(next);
    setReplayKey((value) => value + 1);
    updateQuery(next, reducedMotion);
  };

  const toggleMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    setReplayKey((value) => value + 1);
    updateQuery(blueprintId, next);
  };

  return (
    <main className="min-h-[100dvh] bg-[#020408] text-white">
      <BlueprintPresentationOverlay
        key={manifestation.eventId}
        manifestation={manifestation}
        players={PLAYERS}
        reducedMotion={reducedMotion}
        onComplete={() => undefined}
      />

      <button
        type="button"
        className="fixed right-2 top-2 z-[13002] grid h-9 w-9 place-items-center rounded border border-white/20 bg-[#061016]/95 text-white shadow-xl"
        aria-label={controlsOpen ? "Close preview controls" : "Open preview controls"}
        onClick={() => setControlsOpen((value) => !value)}
      >
        {controlsOpen ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
      </button>

      <nav
        aria-label="Blueprint manifestation preview controls"
        className={`${controlsOpen ? "flex" : "hidden"} fixed left-2 right-12 top-2 z-[13001] flex-wrap justify-end gap-1 rounded border border-white/15 bg-[#061016]/95 p-1.5 shadow-xl`}
      >
        <button
          type="button"
          className="h-8 rounded bg-white/7 px-2 text-[9px] font-black uppercase data-[active=true]:bg-amber-100 data-[active=true]:text-black"
          data-active={blueprintId === "bp_mantle_to_orbit_foundry"}
          onClick={() => chooseBlueprint("bp_mantle_to_orbit_foundry")}
        >
          Foundry
        </button>
        <button
          type="button"
          className="h-8 rounded bg-white/7 px-2 text-[9px] font-black uppercase data-[active=true]:bg-cyan-100 data-[active=true]:text-black"
          data-active={blueprintId === "bp_worldshield_covenant"}
          onClick={() => chooseBlueprint("bp_worldshield_covenant")}
        >
          Worldshield
        </button>
        <button type="button" className="h-8 rounded bg-white/7 px-2 text-[9px] uppercase" onClick={toggleMotion}>
          {reducedMotion ? "Reduced" : "Full motion"}
        </button>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded bg-white/7"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={() => {
            const next = !muted;
            gameAudio.setMuted(next);
            setMuted(next);
          }}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded bg-white/7"
          aria-label="Replay presentation"
          onClick={() => setReplayKey((value) => value + 1)}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </nav>
    </main>
  );
}
