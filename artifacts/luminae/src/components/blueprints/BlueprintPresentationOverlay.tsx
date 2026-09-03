import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, Loader2, RadioTower, ShieldCheck } from "lucide-react";
import type { ArtifactCard, GamePlayerState } from "@workspace/api-client-react";
import {
  BLUEPRINT_DEFINITIONS,
  type BlueprintDetonationEvent,
  type BlueprintManifestationEvent,
} from "@workspace/game-types";
import { ANTIMATTER_CINEMATIC_TIMING } from "@/lib/antimatterCinematicTimeline";
import { ANTIMATTER_DETONATION_TIMING } from "@/lib/antimatterDetonationTimeline";
import { gameAudio } from "@/lib/audio";

const AntimatterManifestationAnimation = lazy(async () => {
  const module = await import("./AntimatterManifestationAnimation");
  return { default: module.AntimatterManifestationAnimation };
});

const AntimatterDetonationAnimation = lazy(async () => {
  const module = await import("./AntimatterDetonationAnimation");
  return { default: module.AntimatterDetonationAnimation };
});

const TRAP_PRELUDE_DURATION_SECONDS = 0.96;
const TRAP_PRELUDE_REDUCED_SECONDS = 0.48;

function artifactFallback(cardId: string, tier: 1 | 2 | 3): ArtifactCard {
  return {
    id: cardId,
    name: tier === 2 ? "Marked Tier II Artifact" : "Annihilated Artifact",
    flavor: "Its record ends here.",
    tier,
    bonusAffinity: "abyss",
    eminence: tier === 2 ? 1 : 0,
    cost: {
      flare: 0,
      continuum: 0,
      verdance: 0,
      abyss: 0,
      radiance: 0,
      singularity: 0,
    },
  };
}

function LightweightManifestation({
  event,
  ownerName,
  reducedMotion,
}: {
  event: BlueprintManifestationEvent;
  ownerName: string;
  reducedMotion: boolean;
}) {
  const definition = BLUEPRINT_DEFINITIONS[event.blueprintId];
  return (
    <div className="fixed inset-0 z-[12000] grid place-items-center overflow-hidden bg-[#020408] text-white" role="img" aria-label={`${definition.name} manifested for ${ownerName}`}>
      <motion.div
        className="absolute h-[min(68vw,520px)] w-[min(68vw,520px)] rounded-full border border-amber-200/20"
        initial={{ scale: reducedMotion ? 1 : 0.35, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 0.7, 0.28] }}
        transition={{ duration: reducedMotion ? 0.3 : 2.2, ease: "easeOut" }}
      />
      <motion.div
        className="relative z-10 w-[min(88vw,680px)] border-y border-white/10 bg-black/55 px-6 py-9 text-center"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.55, duration: 0.5 }}
      >
        <p className="flex items-center justify-center gap-2 text-[9px] font-black uppercase text-amber-200/70">
          <RadioTower className="h-4 w-4" aria-hidden="true" /> Blueprint manifestation
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-5xl">{definition.name}</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/65">{definition.publicEffect}</p>
        <div className="mt-5 flex items-center justify-center gap-2 text-[9px] font-black uppercase text-amber-200/80">
          <Check className="h-4 w-4" aria-hidden="true" />
          {ownerName} // {definition.initialDeviceState}
        </div>
      </motion.div>
    </div>
  );
}

function TrapSprungPrelude({
  eventId,
  reducedMotion,
  onDone,
}: {
  eventId: string;
  reducedMotion: boolean;
  onDone: () => void;
}) {
  const duration = reducedMotion
    ? TRAP_PRELUDE_REDUCED_SECONDS
    : TRAP_PRELUDE_DURATION_SECONDS;

  useEffect(() => {
    gameAudio.playTrapTrigger({ volume: 0.58 });
    const timer = window.setTimeout(onDone, duration * 1000);
    return () => window.clearTimeout(timer);
  }, [duration, eventId, onDone]);

  return (
    <motion.div
      key={eventId}
      className="absolute inset-0 z-[1] grid place-items-center overflow-hidden bg-[#030005]"
      role="img"
      aria-label="Trap sprung"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.06 : 0.12 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,45,35,0.26), transparent 24%), linear-gradient(90deg, rgba(255,42,34,0.13), transparent 18%, transparent 82%, rgba(255,42,34,0.13))",
        }}
        animate={reducedMotion ? undefined : { opacity: [0.24, 0.76, 0.2] }}
        transition={{ duration, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[min(68vw,520px)] w-[min(68vw,520px)] rounded-full border border-red-300/30"
        initial={{ scale: reducedMotion ? 0.82 : 2.7, opacity: 0 }}
        animate={{
          scale: reducedMotion ? 1 : [2.7, 1.02, 0.78],
          opacity: reducedMotion ? 0.64 : [0, 0.86, 0],
        }}
        transition={{ duration, times: reducedMotion ? undefined : [0, 0.62, 1], ease: "easeIn" }}
      />
      <motion.div
        className="absolute h-[min(46vw,350px)] w-[min(46vw,350px)] rounded-full border border-white/25"
        initial={{ scale: reducedMotion ? 1 : 0.34, opacity: 0 }}
        animate={{
          scale: reducedMotion ? 1 : [0.34, 1.28, 1.02],
          opacity: reducedMotion ? 0.42 : [0, 0.55, 0],
        }}
        transition={{ duration: duration * 0.72, ease: "easeOut" }}
      />
      <motion.div
        className="relative z-10 grid place-items-center gap-3 text-center"
        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }}
        animate={{
          opacity: reducedMotion ? 1 : [0, 1, 1, 0],
          scale: reducedMotion ? 1 : [0.92, 1.02, 1, 0.96],
        }}
        transition={{
          duration,
          times: reducedMotion ? undefined : [0, 0.22, 0.72, 1],
          ease: "easeOut",
        }}
      >
        <div className="relative h-20 w-20">
          <motion.span
            className="absolute inset-0 rounded-full border border-red-200/55"
            animate={reducedMotion ? undefined : { rotate: 180 }}
            transition={{ duration, ease: "linear" }}
          />
          <motion.span
            className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-red-100/70"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: reducedMotion ? 0.08 : 0.22, ease: "easeOut" }}
          />
          <motion.span
            className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-red-100/70"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reducedMotion ? 0.08 : 0.22, ease: "easeOut" }}
          />
          <span className="absolute inset-[34%] rounded-full bg-red-200 shadow-[0_0_34px_rgba(255,65,45,0.95)]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-red-100/80">
            Trap sprung
          </p>
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-white/42">
            Hidden mechanism
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InterceptionPresentation({
  ownerName,
  triggeringName,
  hostileEffect,
  reducedMotion,
}: {
  ownerName: string;
  triggeringName: string;
  hostileEffect?: BlueprintDetonationEvent["hostileEffect"];
  reducedMotion: boolean;
}) {
  const presentation = {
    annihilation: {
      title: "Charge Intercepted",
      copy: "The marked claim proceeds. Both devices are Spent. No Eminence is awarded.",
    },
    burn: {
      title: "Burn Prevented",
      copy: "The protected claim remains in the Forge. Worldshield Covenant is now Spent.",
    },
    nullification: {
      title: "Nullification Prevented",
      copy: "The protected Artifact remains unmarked. Worldshield Covenant is now Spent.",
    },
    claim_cancellation: {
      title: "Claim Protected",
      copy: "The Forge resets around the protected Artifact. Worldshield Covenant is now Spent.",
    },
  }[hostileEffect ?? "annihilation"];
  return (
    <div className="fixed inset-0 z-[12000] grid place-items-center bg-[#020609]/95 text-white" role="img" aria-label={`Worldshield Covenant protected ${ownerName} from ${triggeringName}'s ${hostileEffect?.replace("_", " ") ?? "annihilation"}`}>
      <motion.div
        className="relative grid h-[min(66vw,440px)] w-[min(66vw,440px)] place-items-center rounded-full border-2 border-cyan-100/35"
        initial={{ scale: reducedMotion ? 1 : 0.45, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.25 : 0.85, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-[12%] rounded-full border border-amber-200/25"
          animate={reducedMotion ? undefined : { rotate: 180 }}
          transition={{ duration: 2.4, ease: "linear" }}
        />
        <div className="relative z-10 max-w-[290px] px-5 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-cyan-100" aria-hidden="true" />
          <p className="mt-4 text-[9px] font-black uppercase text-cyan-100/60">Covenant response</p>
          <h2 className="mt-1 font-serif text-3xl">{presentation.title}</h2>
          <p className="mt-3 text-xs leading-relaxed text-white/55">{presentation.copy}</p>
        </div>
      </motion.div>
    </div>
  );
}

export function BlueprintPresentationOverlay({
  manifestation,
  detonation,
  players,
  reducedMotion,
  onComplete,
}: {
  manifestation?: BlueprintManifestationEvent | null;
  detonation?: BlueprintDetonationEvent | null;
  players: GamePlayerState[];
  reducedMotion: boolean;
  onComplete: () => void;
}) {
  const event = manifestation ?? detonation;
  const isTrapPresentation = Boolean(detonation);
  const trapPreludeDuration = isTrapPresentation
    ? reducedMotion
      ? TRAP_PRELUDE_REDUCED_SECONDS
      : TRAP_PRELUDE_DURATION_SECONDS
    : 0;
  const [completedTrapPreludeEventId, setCompletedTrapPreludeEventId] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const duration = manifestation?.blueprintId === "bp_antimatter_detonator"
    ? ANTIMATTER_CINEMATIC_TIMING.duration
    : detonation && !detonation.interceptedByBlueprintId
      ? ANTIMATTER_DETONATION_TIMING.duration
      : 3.2;
  const eventId = event?.eventId;
  const trapPreludeDone = !isTrapPresentation || completedTrapPreludeEventId === eventId;
  const totalDuration = duration + trapPreludeDuration;
  const completeTrapPrelude = useCallback(() => {
    if (!eventId) return;
    setCompletedTrapPreludeEventId(eventId);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const timer = window.setTimeout(() => onCompleteRef.current(), totalDuration * 1000);
    return () => window.clearTimeout(timer);
  }, [eventId, totalDuration]);

  useEffect(() => {
    if (!eventId || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [eventId]);

  if (!event) return null;
  const ownerName = players.find((player) => player.playerId === event.ownerPlayerId)?.playerName ?? "Unknown civilization";

  let content: React.ReactNode = null;

  if (manifestation) {
    if (manifestation.blueprintId === "bp_antimatter_detonator") {
      content = (
        <Suspense fallback={<div className="fixed inset-0 z-[12000] grid place-items-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-amber-200" aria-label="Loading manifestation" /></div>}>
          <AntimatterManifestationAnimation
            runtime
            variant={manifestation.presentationVariant}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      );
    } else {
      content = (
        <LightweightManifestation
          event={manifestation}
          ownerName={ownerName}
          reducedMotion={reducedMotion}
        />
      );
    }
  } else if (detonation) {
    const triggeringName = players.find((player) => player.playerId === detonation.triggeringPlayerId)?.playerName ?? "the claimant";
    if (detonation.interceptedByBlueprintId) {
      content = (
        <InterceptionPresentation
          ownerName={ownerName}
          triggeringName={triggeringName}
          hostileEffect={detonation.hostileEffect}
          reducedMotion={reducedMotion}
        />
      );
    } else {
      const targetCard = detonation.targetArtifact ?? artifactFallback(detonation.targetCardId, 2);
      const collateralCards = detonation.collateralArtifacts ??
        (detonation.collateralCardIds ?? []).map((cardId) => artifactFallback(cardId, 1));
      content = (
        <Suspense fallback={<div className="fixed inset-0 z-[12000] grid place-items-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-red-200" aria-label="Loading detonation" /></div>}>
          <AntimatterDetonationAnimation
            key={`${detonation.eventId}:detonation`}
            animKey={detonation.createdAt}
            card={targetCard}
            trigger={detonation.trigger ?? "forged"}
            covenantBroken={collateralCards.length > 0}
            covenantArtifacts={collateralCards}
            variant={detonation.presentationVariant}
            detonatorOwnerName={ownerName}
            reducedMotion={reducedMotion}
            trapPreludePlayed
          />
        </Suspense>
      );
    }
  }

  if (!content) return null;
  const takeover = (
    <div className="fixed inset-0 z-[13000] overflow-hidden bg-black text-white">
      {isTrapPresentation && !trapPreludeDone && eventId ? (
        <TrapSprungPrelude
          eventId={eventId}
          reducedMotion={reducedMotion}
          onDone={completeTrapPrelude}
        />
      ) : (
        content
      )}
    </div>
  );
  if (typeof document === "undefined") return takeover;
  return createPortal(takeover, document.body);
}
