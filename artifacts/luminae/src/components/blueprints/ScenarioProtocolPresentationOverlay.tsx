import { lazy, Suspense, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { EyeOff, Loader2, Orbit, RadioTower, ShieldCheck } from "lucide-react";
import type { ArtifactCard, ScenarioProtocolEvent } from "@workspace/api-client-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { ANTIMATTER_DETONATION_TIMING } from "@/lib/antimatterDetonationTimeline";
import "./ScenarioProtocolPresentationOverlay.css";

const AntimatterDetonationAnimation = lazy(async () => {
  const module = await import("./AntimatterDetonationAnimation");
  return { default: module.AntimatterDetonationAnimation };
});

const INPUT_GUARD_MS = 360;
const COLLAPSE_RINGS = [0, 1, 2, 3] as const;
const COLLAPSE_RAYS = Array.from({ length: 12 }, (_, index) => index);
const ASCENT_PACKETS = Array.from({ length: 10 }, (_, index) => index);

type ProtocolProfile = "collapse" | "ascent" | "bastion";

function protocolLabel(slotIndex: number): string {
  return `SEALED PROTOCOL // ${String(slotIndex + 1).padStart(2, "0")}`;
}

function protocolProfile(event: ScenarioProtocolEvent): ProtocolProfile {
  if (event.protocolId === "sealed_protocol_02") return "ascent";
  if (event.protocolId === "sealed_protocol_03") return "bastion";
  return "collapse";
}

function artifactFallback(event: ScenarioProtocolEvent): ArtifactCard {
  return {
    id: event.targetCardId ?? "sealed-protocol-target",
    name: "Marked Tier II Artifact",
    flavor: "Its public record ends here.",
    tier: 2,
    bonusAffinity: "radiance",
    eminence: 1,
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

function consequenceText(event: ScenarioProtocolEvent): string | null {
  if (event.kind === "manifestation") return "A sealed protocol has manifested on the board.";
  if (event.slotIndex === 1) {
    const tier = event.targetArtifact?.tier;
    const reduction = tier === 3 ? 3 : 2;
    return `TIER ${tier === 3 ? "III" : "II"} FORGE COST REDUCED BY ${reduction}`;
  }
  if (event.intercepted) return "HOSTILE CONSEQUENCE INTERCEPTED";
  const effect = event.hostileEffect?.replaceAll("_", " ");
  if (!effect) return null;
  return `${effect.toUpperCase()}${event.trigger ? ` ON ${event.trigger.toUpperCase()}` : ""}`;
}

function ProtocolKineticField({
  profile,
  reducedMotion,
}: {
  profile: ProtocolProfile;
  reducedMotion: boolean;
}) {
  const speed = reducedMotion ? 0.3 : 1;
  if (profile === "collapse") {
    return (
      <div className="scenario-protocol-presentation__kinetic scenario-protocol-presentation__kinetic--collapse" aria-hidden="true">
        {COLLAPSE_RINGS.map((ring) => (
          <motion.i
            key={ring}
            className="scenario-protocol-presentation__collapse-ring"
            initial={{ opacity: 0, scale: 2.8 + ring * 0.44, rotate: ring % 2 === 0 ? -28 : 28 }}
            animate={{ opacity: [0, 0.82, 0.46], scale: [2.8 + ring * 0.44, 1.24, 0.88], rotate: 0 }}
            transition={{ delay: ring * 0.11 * speed, duration: 1.55 * speed, ease: "easeIn" }}
          />
        ))}
        {COLLAPSE_RAYS.map((ray) => (
          <motion.i
            key={ray}
            className="scenario-protocol-presentation__collapse-ray"
            style={{ rotate: ray * 30 }}
            initial={{ opacity: 0, scaleX: 0.12 }}
            animate={{ opacity: [0, 0.82, 0.12], scaleX: [0.12, 1, 0.08] }}
            transition={{ delay: (0.18 + (ray % 4) * 0.08) * speed, duration: 1.1 * speed, ease: "easeIn" }}
          />
        ))}
        <motion.b
          className="scenario-protocol-presentation__collapse-core"
          initial={{ opacity: 0, scale: 0.1 }}
          animate={{ opacity: [0, 1, 0.52], scale: [0.1, 1.2, 0.84] }}
          transition={{ delay: 0.9 * speed, duration: 0.72 * speed }}
        />
      </div>
    );
  }

  if (profile === "ascent") {
    return (
      <div className="scenario-protocol-presentation__kinetic scenario-protocol-presentation__kinetic--ascent" aria-hidden="true">
        <motion.i
          className="scenario-protocol-presentation__orbit scenario-protocol-presentation__orbit--outer"
          initial={{ opacity: 0, scale: 0.55, rotateX: 68 }}
          animate={{ opacity: [0, 0.7, 0.38], scale: 1, rotate: 150, rotateX: 68 }}
          transition={{ duration: 2.8 * speed, ease: "easeOut" }}
        />
        <motion.i
          className="scenario-protocol-presentation__orbit scenario-protocol-presentation__orbit--inner"
          initial={{ opacity: 0, scale: 0.4, rotateX: 68 }}
          animate={{ opacity: [0, 0.8, 0.42], scale: 1, rotate: -190, rotateX: 68 }}
          transition={{ delay: 0.16 * speed, duration: 2.5 * speed, ease: "easeOut" }}
        />
        <span className="scenario-protocol-presentation__ascent-rail scenario-protocol-presentation__ascent-rail--left" />
        <span className="scenario-protocol-presentation__ascent-rail scenario-protocol-presentation__ascent-rail--right" />
        {ASCENT_PACKETS.map((packet) => (
          <motion.i
            key={packet}
            className="scenario-protocol-presentation__ascent-packet"
            style={{ marginLeft: `${((packet % 5) - 2) * 23}px` }}
            initial={{ opacity: 0, y: 190 + (packet % 3) * 42, scaleY: 0.55 }}
            animate={{ opacity: [0, 0.9, 0], y: -180 - (packet % 4) * 34, scaleY: [0.55, 1.5, 0.3] }}
            transition={{ delay: (packet % 5) * 0.12 * speed, duration: (1.35 + (packet % 3) * 0.16) * speed, ease: "easeOut" }}
          />
        ))}
        <motion.b
          className="scenario-protocol-presentation__ascent-core"
          initial={{ opacity: 0, scaleX: 0.2 }}
          animate={{ opacity: [0, 1, 0.58], scaleX: [0.2, 1.18, 1] }}
          transition={{ delay: 0.72 * speed, duration: 0.8 * speed }}
        />
      </div>
    );
  }

  return (
    <div className="scenario-protocol-presentation__kinetic scenario-protocol-presentation__kinetic--bastion" aria-hidden="true">
      <motion.svg viewBox="0 0 420 420" focusable="false">
        {[0, 1, 2].map((layer) => (
          <motion.path
            key={layer}
            d={`M210 ${30 + layer * 33} L${355 - layer * 27} ${114 + layer * 18} L${355 - layer * 27} ${278 - layer * 12} L210 ${390 - layer * 31} L${65 + layer * 27} ${278 - layer * 12} L${65 + layer * 27} ${114 + layer * 18} Z`}
            initial={{ opacity: 0, pathLength: 0, scale: 0.72 }}
            animate={{ opacity: [0, 0.82 - layer * 0.14, 0.38], pathLength: 1, scale: 1 }}
            transition={{ delay: layer * 0.14 * speed, duration: 1.35 * speed, ease: "easeOut" }}
          />
        ))}
        {[55, 110, 165].map((offset, index) => (
          <motion.line
            key={offset}
            x1={210 - offset}
            y1={210}
            x2={210 + offset}
            y2={210}
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0, 0.75, 0.2], pathLength: 1 }}
            transition={{ delay: (0.36 + index * 0.1) * speed, duration: 0.9 * speed }}
          />
        ))}
      </motion.svg>
      <motion.b
        className="scenario-protocol-presentation__bastion-core"
        initial={{ opacity: 0, scale: 0.35 }}
        animate={{ opacity: [0, 1, 0.64], scale: [0.35, 1.12, 1] }}
        transition={{ delay: 0.7 * speed, duration: 0.72 * speed }}
      >
        <ShieldCheck />
      </motion.b>
    </div>
  );
}

export function ScenarioProtocolPresentationOverlay({
  event,
  reducedMotion,
  onComplete,
}: {
  event: ScenarioProtocolEvent;
  reducedMotion: boolean;
  onComplete: () => void;
}) {
  const completeRef = useRef(onComplete);
  const completedRef = useRef(false);
  const guardUntilRef = useRef(Date.now() + INPUT_GUARD_MS);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetName = event.targetArtifact?.name ?? null;
  const collateralCount = event.collateralArtifacts?.length ?? event.collateralCardIds?.length ?? 0;
  const consequence = consequenceText(event);
  const profile = protocolProfile(event);
  const isAnnihilation = event.kind === "effect" && profile === "collapse";
  const displayMs = isAnnihilation
    ? ANTIMATTER_DETONATION_TIMING.duration * (reducedMotion ? 0.34 : 1) * 1000
    : reducedMotion ? 1_400 : event.kind === "manifestation" ? 5_200 : 4_200;

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = false;
    guardUntilRef.current = Date.now() + (reducedMotion ? 80 : INPUT_GUARD_MS);
    const timer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      completeRef.current();
    }, displayMs);
    return () => window.clearTimeout(timer);
  }, [displayMs, event.eventId, reducedMotion]);

  const finish = (respectGuard = true) => {
    if (completedRef.current || (respectGuard && Date.now() < guardUntilRef.current)) return;
    completedRef.current = true;
    completeRef.current();
  };

  useFocusTrap(containerRef, true, () => undefined, { handleEscape: false });

  if (isAnnihilation) {
    const targetCard = event.targetArtifact ?? artifactFallback(event);
    const collateralArtifacts = event.collateralArtifacts ?? [];
    return (
      <motion.div
        ref={containerRef}
        className="scenario-protocol-presentation scenario-protocol-presentation--detonation"
        role="dialog"
        aria-modal="true"
        aria-label={`${protocolLabel(event.slotIndex)} effect`}
        tabIndex={0}
        onClick={() => finish()}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") finish();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Suspense fallback={<Loader2 className="scenario-protocol-presentation__loader" aria-label="Loading protocol effect" />}>
          <AntimatterDetonationAnimation
            animKey={event.createdAt}
            card={targetCard}
            trigger={event.trigger ?? "forged"}
            covenantBroken={collateralCount > 0}
            covenantArtifacts={collateralArtifacts}
            variant="armored"
            detonatorOwnerName="Lumii"
            eminenceTargetSelector={`[data-eminence-sigil="opponent-${event.ownerPlayerId}"]`}
            reducedMotion={reducedMotion}
            identityRedacted
            onComplete={() => finish(false)}
          />
        </Suspense>
        <div className="scenario-protocol-presentation__redaction-stamp">
          <RadioTower aria-hidden="true" />
          <span>{protocolLabel(event.slotIndex)}</span>
          <small><EyeOff aria-hidden="true" /> Identity redacted</small>
        </div>
      </motion.div>
    );
  }

  const Icon = profile === "ascent" ? Orbit : profile === "bastion" ? ShieldCheck : RadioTower;
  return (
    <motion.div
      ref={containerRef}
      className="scenario-protocol-presentation"
      data-profile={profile}
      data-kind={event.kind}
      role="dialog"
      aria-modal="true"
      aria-label={`${protocolLabel(event.slotIndex)} ${event.kind}`}
      tabIndex={0}
      onClick={() => finish()}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") finish();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.08 : 0.28 }}
    >
      <div className="scenario-protocol-presentation__scrim" />
      <ProtocolKineticField profile={profile} reducedMotion={reducedMotion} />
      <motion.section
        className="scenario-protocol-presentation__copy"
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.72, duration: reducedMotion ? 0.08 : 0.42 }}
      >
        <span className="scenario-protocol-presentation__icon"><Icon aria-hidden="true" /></span>
        <p>{event.kind === "manifestation" ? "PROTOCOL MANIFESTATION" : "PROTOCOL CONSEQUENCE"}</p>
        <h2>{protocolLabel(event.slotIndex)}</h2>
        <div className="scenario-protocol-presentation__rule" />
        <blockquote>{event.publicEffect}</blockquote>
        {consequence && <strong>{consequence}</strong>}
        {(targetName || collateralCount > 0) && (
          <div className="scenario-protocol-presentation__targets">
            {targetName && <span>Target // {targetName}</span>}
            {collateralCount > 0 && <span>Tier I collateral // {collateralCount}</span>}
          </div>
        )}
        <small><EyeOff aria-hidden="true" /> Identity redacted</small>
      </motion.section>
    </motion.div>
  );
}
