import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ArtifactCard } from "@workspace/api-client-react";
import armoredDeviceArt from "@/assets/blueprints/antimatter/detonation/armored.webp";
import asymmetricDeviceArt from "@/assets/blueprints/antimatter/detonation/asymmetric.webp";
import latticeDeviceArt from "@/assets/blueprints/antimatter/detonation/lattice.webp";
import originalDeviceArt from "@/assets/blueprints/antimatter/detonation/original.webp";
import { EminenceSigil } from "@/components/EminenceSigil";
import { gameAudio } from "@/lib/audio";
import {
  ANTIMATTER_DETONATION_EMINENCE_REWARD,
  ANTIMATTER_DETONATION_TARGET_TIER,
  ANTIMATTER_DETONATION_TIMING,
  type AntimatterDetonationTrigger,
  type AntimatterDetonationVariant,
} from "@/lib/antimatterDetonationTimeline";
import { ArtifactCardView } from "@/pages/game-card";
import "./AntimatterDetonationAnimation.css";

type ViewportRect = { x: number; y: number; w: number; h: number };

export interface AntimatterDetonationAnimationProps {
  animKey: number;
  card: ArtifactCard;
  trigger?: AntimatterDetonationTrigger;
  covenantBroken?: boolean;
  covenantArtifacts?: readonly ArtifactCard[];
  variant?: AntimatterDetonationVariant;
  detonatorOwnerName: string;
  startRect?: ViewportRect | null;
  eminenceReward?: number;
  eminenceTargetSelector?: string | null;
  reducedMotion?: boolean;
  identityRedacted?: boolean;
  trapPreludePlayed?: boolean;
  onEminenceImpact?: (amount: number) => void;
  onComplete?: () => void;
}

const PARTICLES = Array.from({ length: 22 }, (_, index) => {
  const angle = (index / 22) * Math.PI * 2 + (index % 3) * 0.12;
  const radius = 150 + (index % 5) * 26;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.72,
    delay: (index % 4) * 0.035,
    rotate: Math.round((angle * 180) / Math.PI),
  };
});

const DEVICE_ART: Record<AntimatterDetonationVariant, string> = {
  original: originalDeviceArt,
  asymmetric: asymmetricDeviceArt,
  lattice: latticeDeviceArt,
  armored: armoredDeviceArt,
};

function readTargetCenter(selector?: string | null) {
  if (!selector || typeof document === "undefined") return null;
  const rect = document
    .querySelector<HTMLElement>(selector)
    ?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function AntimatterDetonationAnimation({
  animKey,
  card,
  trigger = "forged",
  covenantBroken = false,
  covenantArtifacts = [],
  variant = "armored",
  detonatorOwnerName,
  startRect,
  eminenceReward = ANTIMATTER_DETONATION_EMINENCE_REWARD,
  eminenceTargetSelector,
  reducedMotion,
  identityRedacted = false,
  trapPreludePlayed = false,
  onEminenceImpact,
  onComplete,
}: AntimatterDetonationAnimationProps) {
  const systemReducedMotion = useReducedMotion();
  const isReducedMotion = reducedMotion ?? Boolean(systemReducedMotion);
  const speed = isReducedMotion ? 0.34 : 1;
  const timing = ANTIMATTER_DETONATION_TIMING;
  const seconds = (value: number) => value * speed;
  const collateralArtifacts = covenantBroken
    ? covenantArtifacts.slice(0, 2)
    : [];
  const triggerLabel = trigger === "encrypted" ? "Encryption" : "Forge";
  const covenantDuration =
    timing.covenant.artifactsVanishAt - timing.covenant.artifactsAppearAt;
  const covenantLockProgress =
    (timing.covenant.artifactsLockAt - timing.covenant.artifactsAppearAt) /
    covenantDuration;
  const covenantAnnihilationProgress =
    (timing.covenant.artifactsAnnihilateAt -
      timing.covenant.artifactsAppearAt) /
    covenantDuration;
  const [rewardTarget, setRewardTarget] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const onEminenceImpactRef = useRef(onEminenceImpact);
  const onCompleteRef = useRef(onComplete);

  const viewport = {
    width: typeof window === "undefined" ? 1200 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  };
  const startCenter = startRect
    ? { x: startRect.x + startRect.w / 2, y: startRect.y + startRect.h / 2 }
    : { x: viewport.width / 2, y: viewport.height / 2 + 48 };
  const startScale = startRect
    ? Math.min(
        1,
        Math.max(0.34, startRect.w / Math.min(248, viewport.width * 0.32)),
      )
    : 0.82;

  useLayoutEffect(() => {
    setRewardTarget(readTargetCenter(eminenceTargetSelector));
  }, [animKey, eminenceTargetSelector]);

  useEffect(() => {
    onEminenceImpactRef.current = onEminenceImpact;
    onCompleteRef.current = onComplete;
  }, [onComplete, onEminenceImpact]);

  useEffect(() => {
    gameAudio.playAntimatterDetonation({
      speed,
      includeTrapTrigger: !trapPreludePlayed,
    });
    const impactTimer = window.setTimeout(
      () => onEminenceImpactRef.current?.(eminenceReward),
      timing.reward.impactsAt * speed * 1000,
    );
    const completeTimer = window.setTimeout(
      () => onCompleteRef.current?.(),
      timing.duration * speed * 1000,
    );
    return () => {
      window.clearTimeout(impactTimer);
      window.clearTimeout(completeTimer);
    };
  }, [
    animKey,
    eminenceReward,
    speed,
    trapPreludePlayed,
    timing.duration,
    timing.reward.impactsAt,
  ]);

  const rewardTravel = rewardTarget
    ? {
        x: rewardTarget.x - viewport.width / 2,
        y: rewardTarget.y - viewport.height / 2,
      }
    : { x: 0, y: Math.min(132, viewport.height * 0.2) };

  return (
    <div
      key={animKey}
      className={`antimatter-detonation antimatter-detonation--${variant}${isReducedMotion ? " antimatter-detonation--reduced" : ""}`}
      role="img"
      aria-label={`${identityRedacted ? "A sealed protocol marks" : "Secretly marked"} Tier II Artifact ${card.name}, which is annihilated when ${trigger}. ${covenantBroken ? "The broken Covenant also annihilates two of the Forger's Tier I Artifacts. " : ""}${detonatorOwnerName} gains ${eminenceReward} Eminence.`}
      data-testid="antimatter-detonation"
      data-visual-variant={variant}
      data-trigger={trigger}
      data-covenant-state={covenantBroken ? "broken" : "intact"}
      data-identity-redacted={identityRedacted || undefined}
    >
      <motion.div
        className="antimatter-detonation__veil"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.88, 0.94, 0.58, 0] }}
        transition={{
          duration: seconds(timing.duration),
          times: [0, 0.1, 0.4, 0.73, 1],
          ease: "easeInOut",
        }}
      />

      <div className="antimatter-detonation__focal" aria-hidden="true">
        {!identityRedacted && (
          <motion.div
            className="antimatter-detonation__device"
            initial={{ opacity: 0, scale: 1.16, rotate: -3 }}
            animate={{
              opacity: [0, 0.78, 0.78, 0],
              scale: [1.16, 1, 0.94, 0.03],
              rotate: [-3, 0, 0, 8],
            }}
            transition={{
              delay: seconds(timing.device.revealsAt),
              duration: seconds(
                timing.device.vanishesAt - timing.device.revealsAt,
              ),
              times: [0, 0.2, 0.84, 1],
              ease: ["easeOut", "linear", "easeIn"],
            }}
          >
            <img src={DEVICE_ART[variant]} alt="" draggable={false} />
          </motion.div>
        )}

        {timing.implosionWaves.map((startsAt, index) => (
          <motion.span
            key={startsAt}
            className="antimatter-detonation__implosion-ring"
            style={{ rotate: index === 1 ? 58 : index === 2 ? -58 : 0 }}
            initial={{ opacity: 0, scale: 3.7 + index * 0.42 }}
            animate={{
              opacity: [0, 0.78, 0.96, 0],
              scale: [3.7 + index * 0.42, 2.4, 0.72, 0.025],
            }}
            transition={{
              delay: seconds(startsAt),
              duration: seconds(timing.implosion.pinchesAt - startsAt),
              times: [0, 0.14, 0.72, 1],
              ease: "easeIn",
            }}
          />
        ))}

        {PARTICLES.map((particle, index) => (
          <motion.span
            key={index}
            className="antimatter-detonation__particle"
            style={{ rotate: particle.rotate }}
            initial={{ x: particle.x, y: particle.y, opacity: 0, scaleX: 0.45 }}
            animate={{
              x: [particle.x, particle.x * 0.76, 0, 0],
              y: [particle.y, particle.y * 0.76, 0, 0],
              opacity: [0, 0.74, 1, 0],
              scaleX: [0.45, 1.1, 0.2, 0],
            }}
            transition={{
              delay: seconds(timing.implosion.startsAt + particle.delay),
              duration: seconds(
                timing.implosion.pinchesAt -
                  timing.implosion.startsAt -
                  particle.delay,
              ),
              times: [0, 0.3, 0.92, 1],
              ease: "easeIn",
            }}
          />
        ))}

        <motion.div
          className="antimatter-detonation__card-anchor"
          initial={{
            x: startCenter.x - viewport.width / 2,
            y: startCenter.y - viewport.height / 2,
            scale: startScale,
            opacity: 1,
            filter: "grayscale(0) brightness(1)",
          }}
          animate={{
            x: [startCenter.x - viewport.width / 2, 0, 0, 0],
            y: [startCenter.y - viewport.height / 2, 0, 0, 0],
            scale: [startScale, 1, 0.96, 0.01],
            opacity: [1, 1, 0.96, 0],
            filter: [
              "grayscale(0) brightness(1)",
              "grayscale(0) brightness(1)",
              "grayscale(0.85) brightness(0.54)",
              "grayscale(1) brightness(0)",
            ],
          }}
          transition={{
            duration: seconds(timing.target.vanishesAt),
            times: [
              0,
              timing.target.locksAt / timing.target.vanishesAt,
              timing.target.darkensAt / timing.target.vanishesAt,
              1,
            ],
            ease: ["easeOut", "linear", "easeIn"],
          }}
        >
          <ArtifactCardView
            card={card}
            tier={ANTIMATTER_DETONATION_TARGET_TIER}
          />
          <motion.span
            className="antimatter-detonation__card-lock"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.86, 0] }}
            transition={{
              delay: seconds(0.28),
              duration: seconds(0.78),
              times: [0, 0.18, 1],
            }}
          />
        </motion.div>

        <motion.span
          className="antimatter-detonation__pinch"
          initial={{ opacity: 0, scale: 0.04 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.04, 5.4, 0.05, 0] }}
          transition={{
            delay: seconds(timing.target.darkensAt),
            duration: seconds(timing.flash.endsAt - timing.target.darkensAt),
            times: [0, 0.74, 0.82, 1],
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.div
        className="antimatter-detonation__flash"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.46, 0] }}
        transition={{
          delay: seconds(timing.flash.startsAt),
          duration: seconds(timing.flash.endsAt - timing.flash.startsAt),
          times: [0, 0.25, 0.54, 1],
          ease: "easeOut",
        }}
        aria-hidden="true"
      />

      <motion.span
        className="antimatter-detonation__aftershock"
        initial={{ opacity: 0, scale: 0.06 }}
        animate={{ opacity: [0, 0.9, 0.36, 0], scale: [0.06, 0.34, 2.8, 5.2] }}
        transition={{
          delay: seconds(timing.aftershock.startsAt),
          duration: seconds(
            timing.aftershock.endsAt - timing.aftershock.startsAt,
          ),
          times: [0, 0.12, 0.6, 1],
          ease: "easeOut",
        }}
        aria-hidden="true"
      />

      {collateralArtifacts.map((artifact, index) => (
        <div
          key={artifact.id}
          className={`antimatter-detonation__covenant-slot antimatter-detonation__covenant-slot--${index === 0 ? "left" : "right"}`}
          aria-hidden="true"
        >
          <motion.div
            className="antimatter-detonation__covenant-card"
            initial={{
              opacity: 0,
              scale: 0.72,
              y: 12,
              filter: "grayscale(0) brightness(0.82)",
            }}
            animate={{
              opacity: [0, 1, 1, 0.92, 0],
              scale: [0.72, 1, 1, 0.58, 0.02],
              y: [12, 0, 0, 0, 0],
              filter: [
                "grayscale(0) brightness(0.82)",
                "grayscale(0) brightness(1)",
                "grayscale(0) brightness(1)",
                "grayscale(0.9) brightness(0.28)",
                "grayscale(1) brightness(0)",
              ],
            }}
            transition={{
              delay: seconds(timing.covenant.artifactsAppearAt + index * 0.045),
              duration: seconds(covenantDuration - index * 0.045),
              times: [
                0,
                covenantLockProgress,
                0.58,
                covenantAnnihilationProgress,
                1,
              ],
              ease: ["easeOut", "linear", "easeIn", "easeIn"],
            }}
          >
            <span className="antimatter-detonation__covenant-label">
              Broken Covenant · Tier I
            </span>
            <ArtifactCardView card={artifact} tier={1} />
            <motion.span
              className="antimatter-detonation__covenant-lock"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.92, 0.92, 0] }}
              transition={{
                delay: seconds(timing.covenant.artifactsLockAt + index * 0.045),
                duration: seconds(
                  timing.covenant.artifactsVanishAt -
                    timing.covenant.artifactsLockAt -
                    index * 0.045,
                ),
                times: [0, 0.12, 0.56, 1],
              }}
            />
          </motion.div>
          <motion.span
            className="antimatter-detonation__covenant-burst"
            initial={{ opacity: 0, scale: 0.08 }}
            animate={{ opacity: [0, 0.86, 0], scale: [0.08, 0.5, 3.6] }}
            transition={{
              delay: seconds(
                timing.covenant.artifactsAnnihilateAt + index * 0.045,
              ),
              duration: seconds(
                timing.covenant.artifactsVanishAt -
                  timing.covenant.artifactsAnnihilateAt -
                  index * 0.045,
              ),
              times: [0, 0.16, 1],
              ease: "easeOut",
            }}
          />
        </div>
      ))}

      <motion.div
        className="antimatter-detonation__outcome"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -8] }}
        transition={{
          delay: seconds(timing.outcome.startsAt),
          duration: seconds(timing.outcome.endsAt - timing.outcome.startsAt),
          times: [0, 0.18, 0.8, 1],
          ease: "easeOut",
        }}
      >
        <span className="antimatter-detonation__eyebrow">
          {triggerLabel} trigger · marked Tier II annihilated
        </span>
        <strong>{card.name}</strong>
        {covenantBroken && (
          <motion.span
            className="antimatter-detonation__covenant-outcome"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: [0, 1, 1, 0], y: [5, 0, 0, -3] }}
            transition={{
              delay: seconds(timing.covenant.artifactsAnnihilateAt),
              duration: seconds(
                timing.outcome.endsAt - timing.covenant.artifactsAnnihilateAt,
              ),
              times: [0, 0.14, 0.76, 1],
            }}
          >
            Broken Covenant · 2 of the Forger&apos;s Tier I Artifacts
            annihilated
          </motion.span>
        )}
        <span className="antimatter-detonation__owner">
          {detonatorOwnerName} · +{eminenceReward} Eminence
        </span>
      </motion.div>

      <motion.div
        className="antimatter-detonation__reward"
        initial={{ x: 0, y: 0, opacity: 0, scale: 0.62 }}
        animate={{
          x: [0, 0, rewardTravel.x],
          y: [0, 0, rewardTravel.y],
          opacity: [0, 1, rewardTarget ? 0.24 : 0],
          scale: [0.62, 1.12, rewardTarget ? 0.52 : 0.82],
        }}
        transition={{
          delay: seconds(timing.reward.appearsAt),
          duration: seconds(
            timing.reward.completesAt - timing.reward.appearsAt,
          ),
          times: [0, 0.34, 1],
          ease: ["easeOut", "easeIn"],
        }}
        aria-hidden="true"
      >
        <EminenceSigil size={72} />
        <b>+{eminenceReward}</b>
      </motion.div>
    </div>
  );
}
