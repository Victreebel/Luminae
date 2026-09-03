import { lazy, Suspense, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Check, Factory, Loader2, RadioTower, Shield, ShieldCheck } from "lucide-react";
import type {
  ArtifactCard,
  BlueprintDetonationEvent,
  BlueprintManifestationEvent,
  GamePlayerState,
} from "@workspace/api-client-react";
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

function revealedDefinition(event: BlueprintManifestationEvent) {
  return event.definition ?? {
    name: "Blueprint Project",
    publicEffect: "A completed Project has manifested in the civilization.",
    initialDeviceState: "ready",
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
  const definition = revealedDefinition(event);
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

const NODE_POSITIONS = [
  { left: "18%", top: "72%", delay: 0.1 },
  { left: "50%", top: "78%", delay: 0.28 },
  { left: "82%", top: "72%", delay: 0.46 },
] as const;

function ManifestationTitle({
  label,
  name,
  effect,
  ownerName,
  state,
}: {
  label: string;
  name: string;
  effect: string;
  ownerName: string;
  state: string;
}) {
  return (
    <div className="relative z-30 mx-auto w-[min(88vw,690px)] border-y border-white/12 bg-black/68 px-5 py-5 text-center backdrop-blur-sm sm:px-8 sm:py-7">
      <p className="text-[9px] font-black uppercase text-white/58">{label}</p>
      <h2 className="mt-1 font-serif text-3xl font-semibold text-white sm:text-5xl">{name}</h2>
      <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-white/67 sm:text-sm">{effect}</p>
      <p className="mt-4 text-[9px] font-black uppercase text-white/68">{ownerName} // {state}</p>
    </div>
  );
}

function FoundryManifestation({
  event,
  ownerName,
  reducedMotion,
}: {
  event: BlueprintManifestationEvent;
  ownerName: string;
  reducedMotion: boolean;
}) {
  const definition = revealedDefinition(event);
  const transitionScale = reducedMotion ? 0.3 : 1;
  return (
    <div
      className="fixed inset-0 z-[12000] grid place-items-center overflow-hidden bg-[#030609] text-white"
      role="img"
      aria-label={`${definition.name} manifested for ${ownerName}`}
      data-testid="foundry-manifestation"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_72%,rgba(244,171,73,0.19),transparent_34%),linear-gradient(180deg,#030609_0%,#07101a_58%,#020305_100%)]" />
      <motion.svg
        className="pointer-events-none absolute left-1/2 top-[5%] h-[72%] w-[min(98vw,920px)] -translate-x-1/2 overflow-visible"
        viewBox="0 0 720 600"
        fill="none"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 * transitionScale }}
      >
        <ellipse cx="360" cy="170" rx="212" ry="92" stroke="rgba(255,226,164,0.18)" strokeWidth="1" />
        <ellipse cx="360" cy="170" rx="176" ry="68" stroke="rgba(251,191,36,0.22)" strokeWidth="1" strokeDasharray="10 14" />
        <motion.ellipse
          cx="360"
          cy="170"
          rx="196"
          ry="80"
          stroke="rgba(255,241,200,0.62)"
          strokeWidth="2"
          strokeDasharray="64 38 18 46"
          initial={{ pathLength: reducedMotion ? 1 : 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.92, 0.52] }}
          transition={{ delay: 0.42 * transitionScale, duration: 1.35 * transitionScale, ease: "easeOut" }}
        />
        {[
          "M 92 520 C 168 456 222 316 314 208",
          "M 360 548 C 360 430 360 302 360 196",
          "M 628 520 C 552 456 498 316 406 208",
        ].map((path, index) => (
          <motion.path
            key={path}
            d={path}
            stroke={index === 1 ? "rgba(255,235,184,0.78)" : "rgba(251,191,36,0.52)"}
            strokeWidth={index === 1 ? 2 : 1.4}
            strokeLinecap="round"
            initial={{ pathLength: reducedMotion ? 1 : 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 0.62] }}
            transition={{ delay: (0.18 + index * 0.14) * transitionScale, duration: 1.25 * transitionScale, ease: "easeOut" }}
          />
        ))}
        <path d="M 62 528 Q 360 450 658 528" stroke="rgba(251,146,60,0.24)" strokeWidth="1" />
        <path d="M 112 548 Q 360 486 608 548" stroke="rgba(255,226,164,0.16)" strokeWidth="1" strokeDasharray="8 12" />
      </motion.svg>
      <motion.div
        className="absolute left-1/2 top-[7%] h-[72%] w-px origin-bottom bg-gradient-to-t from-amber-300 via-orange-100 to-transparent shadow-[0_0_22px_rgba(251,191,36,0.62)]"
        initial={{ scaleY: reducedMotion ? 1 : 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: [0, 0.9, 0.55] }}
        transition={{ duration: 1.35 * transitionScale, ease: "easeOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-[22%] h-[min(42vw,310px)] w-[min(72vw,520px)] -translate-x-1/2 rounded-[50%] border border-amber-100/38 shadow-[0_0_34px_rgba(245,158,11,0.22)]"
        initial={{ scale: reducedMotion ? 1 : 0.72, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 0.9, 0.48] }}
        transition={{ delay: 0.58 * transitionScale, duration: 1.15 * transitionScale }}
      />
      <motion.div
        className="absolute bottom-[14%] left-1/2 h-20 w-[min(86vw,720px)] -translate-x-1/2 border-x border-t border-orange-200/22 bg-[radial-gradient(ellipse_at_50%_100%,rgba(251,146,60,0.34),rgba(120,53,15,0.13)_42%,transparent_72%)] shadow-[0_-18px_48px_rgba(251,146,60,0.1)]"
        style={{ clipPath: "polygon(12% 100%, 22% 0, 78% 0, 88% 100%)" }}
        initial={{ opacity: 0, scaleX: reducedMotion ? 1 : 0.55 }}
        animate={{ opacity: [0, 0.82, 0.5], scaleX: 1 }}
        transition={{ delay: 0.36 * transitionScale, duration: 1.1 * transitionScale, ease: "easeOut" }}
        aria-hidden="true"
      />
      {NODE_POSITIONS.map((node, index) => (
        <motion.div
          key={node.left}
          className="absolute z-20 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center border border-amber-100/45 bg-[#120d08]/90 text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.26)]"
          style={{ left: node.left, top: node.top }}
          initial={{ y: reducedMotion ? 0 : 70, opacity: 0, scale: reducedMotion ? 1 : 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: node.delay * transitionScale, duration: 0.7 * transitionScale, ease: "easeOut" }}
        >
          {index === 1 ? <Factory className="h-5 w-5" aria-hidden="true" /> : <ArrowUp className="h-5 w-5" aria-hidden="true" />}
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-x-0 bottom-[17%] z-20"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15 * transitionScale, duration: 0.5 * transitionScale }}
      >
        <ManifestationTitle
          label="Industrial chain online"
          name={definition.name}
          effect={definition.publicEffect}
          ownerName={ownerName}
          state={definition.initialDeviceState}
        />
      </motion.div>
    </div>
  );
}

function WorldshieldManifestation({
  event,
  ownerName,
  reducedMotion,
}: {
  event: BlueprintManifestationEvent;
  ownerName: string;
  reducedMotion: boolean;
}) {
  const definition = revealedDefinition(event);
  const transitionScale = reducedMotion ? 0.3 : 1;
  const nodes = [
    { left: "50%", top: "18%", delay: 0.06 },
    { left: "23%", top: "66%", delay: 0.25 },
    { left: "77%", top: "66%", delay: 0.44 },
  ] as const;
  return (
    <div
      className="fixed inset-0 z-[12000] grid place-items-center overflow-hidden bg-[#02070b] text-white"
      role="img"
      aria-label={`${definition.name} manifested for ${ownerName}`}
      data-testid="worldshield-manifestation"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(111,221,255,0.17),transparent_38%),radial-gradient(circle_at_50%_65%,rgba(250,204,21,0.08),transparent_48%)]" />
      <motion.div
        className="absolute left-1/2 top-[10%] h-[min(64vw,470px)] w-[min(64vw,470px)] -translate-x-1/2 rounded-full border border-cyan-100/38 shadow-[inset_0_0_42px_rgba(103,232,249,0.11),0_0_42px_rgba(103,232,249,0.16)]"
        initial={{ scale: reducedMotion ? 1 : 0.42, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 1, 0.66] }}
        transition={{ duration: 1.15 * transitionScale, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-[15%] border border-amber-100/24"
          style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.66 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 * transitionScale, duration: 0.75 * transitionScale }}
        />
        {nodes.map((node) => (
          <motion.span
            key={`${node.left}-${node.top}`}
            className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-50/55 bg-[#06131a] text-cyan-50 shadow-[0_0_20px_rgba(103,232,249,0.42)]"
            style={{ left: node.left, top: node.top }}
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: node.delay * transitionScale, duration: 0.5 * transitionScale }}
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
          </motion.span>
        ))}
        <motion.div
          className="absolute inset-0 grid place-items-center"
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.92 * transitionScale, duration: 0.65 * transitionScale }}
        >
          <ShieldCheck className="h-20 w-20 text-cyan-50 drop-shadow-[0_0_22px_rgba(165,243,252,0.64)]" aria-hidden="true" />
        </motion.div>
      </motion.div>
      <motion.div
        className="absolute inset-x-0 bottom-[14%] z-20"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 * transitionScale, duration: 0.5 * transitionScale }}
      >
        <ManifestationTitle
          label="Covenant network established"
          name={definition.name}
          effect={definition.publicEffect}
          ownerName={ownerName}
          state={definition.initialDeviceState}
        />
      </motion.div>
    </div>
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
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const duration = manifestation?.blueprintId === "bp_antimatter_detonator"
    ? ANTIMATTER_CINEMATIC_TIMING.duration
    : manifestation?.blueprintId === "bp_mantle_to_orbit_foundry" || manifestation?.blueprintId === "bp_worldshield_covenant"
      ? reducedMotion ? 1.8 : 4.8
    : detonation && !detonation.interceptedByBlueprintId
      ? ANTIMATTER_DETONATION_TIMING.duration
      : 3.2;
  const eventId = event?.eventId;

  useEffect(() => {
    if (!eventId) return;
    const timer = window.setTimeout(() => onCompleteRef.current(), duration * 1000);
    return () => window.clearTimeout(timer);
  }, [duration, eventId]);

  useEffect(() => {
    if (!manifestation || manifestation.blueprintId === "bp_antimatter_detonator") return;
    gameAudio.playBlueprintManifestationCue(manifestation.blueprintId, { reducedMotion });
  }, [eventId, manifestation, reducedMotion]);

  if (!event) return null;
  const ownerName = players.find((player) => player.playerId === event.ownerPlayerId)?.playerName ?? "Unknown civilization";

  if (manifestation) {
    if (manifestation.blueprintId === "bp_antimatter_detonator") {
      return (
        <Suspense fallback={<div className="fixed inset-0 z-[12000] grid place-items-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-amber-200" aria-label="Loading manifestation" /></div>}>
          <AntimatterManifestationAnimation
            runtime
            variant={manifestation.presentationVariant}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      );
    }
    if (manifestation.blueprintId === "bp_mantle_to_orbit_foundry") {
      return <FoundryManifestation event={manifestation} ownerName={ownerName} reducedMotion={reducedMotion} />;
    }
    if (manifestation.blueprintId === "bp_worldshield_covenant") {
      return <WorldshieldManifestation event={manifestation} ownerName={ownerName} reducedMotion={reducedMotion} />;
    }
    return <LightweightManifestation event={manifestation} ownerName={ownerName} reducedMotion={reducedMotion} />;
  }

  if (!detonation) return null;
  const triggeringName = players.find((player) => player.playerId === detonation.triggeringPlayerId)?.playerName ?? "the claimant";
  if (detonation.interceptedByBlueprintId) {
    return (
      <InterceptionPresentation
        ownerName={ownerName}
        triggeringName={triggeringName}
        hostileEffect={detonation.hostileEffect}
        reducedMotion={reducedMotion}
      />
    );
  }

  const targetCard = detonation.targetArtifact ?? artifactFallback(detonation.targetCardId, 2);
  const collateralCards = detonation.collateralArtifacts ??
    (detonation.collateralCardIds ?? []).map((cardId) => artifactFallback(cardId, 1));
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[12000] grid place-items-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-red-200" aria-label="Loading detonation" /></div>}>
      <AntimatterDetonationAnimation
        animKey={detonation.createdAt}
        card={targetCard}
        trigger={detonation.trigger ?? "forged"}
        covenantBroken={collateralCards.length > 0}
        covenantArtifacts={collateralCards}
        variant={detonation.presentationVariant}
        detonatorOwnerName={ownerName}
        reducedMotion={reducedMotion}
      />
    </Suspense>
  );
}
