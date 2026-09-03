import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Hammer,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useLocation } from "wouter";
import type { ArtifactCard } from "@workspace/api-client-react";
import { AntimatterDetonationAnimation } from "@/components/blueprints/AntimatterDetonationAnimation";
import { EminenceSigil } from "@/components/EminenceSigil";
import { gameAudio } from "@/lib/audio";
import {
  ANTIMATTER_DETONATION_EMINENCE_REWARD,
  ANTIMATTER_DETONATION_TIMING,
  ANTIMATTER_DETONATION_VARIANTS,
  type AntimatterDetonationTrigger,
  type AntimatterDetonationVariant,
} from "@/lib/antimatterDetonationTimeline";
import { ArtifactCardView } from "@/pages/game-card";
import "./dev-antimatter-detonation.css";

const MARKED_TARGET: ArtifactCard = {
  id: "t2p02",
  tier: 2,
  bonusAffinity: "radiance",
  eminence: 2,
  name: "Null-Convergence Prism",
  flavor: "Every possible path arrives at the same impossible absence.",
  cost: {
    flare: 0,
    continuum: 2,
    verdance: 1,
    abyss: 4,
    radiance: 0,
    singularity: 0,
  },
} as ArtifactCard;

const COVENANT_ARTIFACTS: readonly ArtifactCard[] = [
  {
    id: "t1r01",
    tier: 1,
    bonusAffinity: "flare",
    eminence: 0,
    name: "Ignition Kernel",
    flavor: "Controlled fire becomes infrastructure.",
    cost: {
      flare: 0,
      continuum: 0,
      verdance: 1,
      abyss: 1,
      radiance: 1,
      singularity: 0,
    },
  } as ArtifactCard,
  {
    id: "t1s01",
    tier: 1,
    bonusAffinity: "continuum",
    eminence: 0,
    name: "Echo Splinter",
    flavor: "A warning preserved just ahead of disaster.",
    cost: {
      flare: 1,
      continuum: 0,
      verdance: 1,
      abyss: 0,
      radiance: 1,
      singularity: 0,
    },
  } as ArtifactCard,
];

const VARIANT_LABELS: Record<AntimatterDetonationVariant, string> = {
  original: "Original",
  asymmetric: "Asymmetric",
  lattice: "Lattice",
  armored: "Armored",
};

function getInitialVariant(): AntimatterDetonationVariant {
  if (typeof window === "undefined") return "armored";
  const requested = new URLSearchParams(window.location.search).get("variant");
  return ANTIMATTER_DETONATION_VARIANTS.includes(
    requested as AntimatterDetonationVariant,
  )
    ? (requested as AntimatterDetonationVariant)
    : "armored";
}

function DevTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      setElapsed(
        Math.min(
          ANTIMATTER_DETONATION_TIMING.duration,
          (performance.now() - startedAt) / 1000,
        ),
      );
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [startedAt]);

  return (
    <span className="dev-detonation__timer">
      {elapsed.toFixed(2)} / {ANTIMATTER_DETONATION_TIMING.duration.toFixed(2)}
    </span>
  );
}

export default function DevAntimatterDetonation() {
  const [, setLocation] = useLocation();
  const reducedMotion =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("motion") === "reduced"
      ? true
      : undefined;
  const [trigger, setTrigger] = useState<AntimatterDetonationTrigger>("forged");
  const [covenantBroken, setCovenantBroken] = useState(false);
  const [variant, setVariant] =
    useState<AntimatterDetonationVariant>(getInitialVariant);
  const [animKey, setAnimKey] = useState(1);
  const [startedAt, setStartedAt] = useState(() => performance.now());
  const [playing, setPlaying] = useState(true);
  const [detonated, setDetonated] = useState(false);
  const [eminence, setEminence] = useState(7);
  const [muted, setMuted] = useState(() => gameAudio.isMuted());

  const replay = useCallback(() => {
    setEminence(7);
    setDetonated(false);
    setStartedAt(performance.now());
    setAnimKey((value) => value + 1);
    setPlaying(true);
  }, []);

  const selectTrigger = (nextTrigger: AntimatterDetonationTrigger) => {
    setTrigger(nextTrigger);
    window.setTimeout(replay, 0);
  };

  const toggleCovenant = () => {
    setCovenantBroken((value) => !value);
    window.setTimeout(replay, 0);
  };

  const selectVariant = (nextVariant: AntimatterDetonationVariant) => {
    if (nextVariant === variant) {
      replay();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("variant", nextVariant);
    window.history.replaceState(null, "", url);
    setVariant(nextVariant);
    window.setTimeout(replay, 0);
  };

  return (
    <main className="dev-detonation">
      <div className="dev-detonation__grid" aria-hidden="true" />
      <header className="dev-detonation__toolbar">
        <button
          type="button"
          onClick={() => setLocation("/")}
          aria-label="Back to main menu"
          title="Back"
        >
          <ArrowLeft />
        </button>
        <div className="dev-detonation__resolution-controls">
          <div
            className="dev-detonation__trigger-control"
            role="radiogroup"
            aria-label="Detonation trigger"
          >
            {(["forged", "encrypted"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                className={trigger === value ? "is-active" : ""}
                onClick={() => selectTrigger(value)}
                aria-checked={trigger === value}
                title={value === "forged" ? "Forge trigger" : "Encrypt trigger"}
              >
                {value === "forged" ? <Hammer /> : <LockKeyhole />}
                <span>{value === "forged" ? "Forge" : "Encrypt"}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`dev-detonation__covenant-toggle${covenantBroken ? " is-broken" : ""}`}
            onClick={toggleCovenant}
            aria-pressed={covenantBroken}
            title={
              covenantBroken ? "Broken Covenant declared" : "Covenant intact"
            }
          >
            {covenantBroken ? <ShieldOff /> : <ShieldCheck />}
            <span>
              {covenantBroken ? "Covenant Broken" : "Covenant Intact"}
            </span>
          </button>
        </div>
        <div className="dev-detonation__tools">
          {playing && <DevTimer startedAt={startedAt} />}
          <button
            type="button"
            onClick={() => {
              const nextMuted = gameAudio.toggleMute();
              setMuted(nextMuted);
            }}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            type="button"
            onClick={replay}
            aria-label="Replay detonation"
            title="Replay"
          >
            <RotateCcw />
          </button>
        </div>
      </header>

      <div
        className="dev-detonation__variant-control"
        role="radiogroup"
        aria-label="Detonator form"
      >
        {ANTIMATTER_DETONATION_VARIANTS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={variant === value}
            className={variant === value ? "is-active" : ""}
            onClick={() => selectVariant(value)}
          >
            {VARIANT_LABELS[value]}
          </button>
        ))}
      </div>

      <section
        className="dev-detonation__board"
        aria-label="Antimatter Detonator effect preview"
      >
        <div
          className="dev-detonation__owner-hud"
          data-dev-eminence-target="true"
        >
          <span>Detonator owner</span>
          <div>
            <EminenceSigil size={38} />
            <b>{eminence}</b>
          </div>
        </div>

        <div className="dev-detonation__forge-rails" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="dev-detonation__mold">
          <span className="dev-detonation__mold-label">
            {detonated
              ? covenantBroken
                ? "3 Artifacts annihilated"
                : "Marked Tier II annihilated"
              : `Secretly marked Tier II · ${trigger === "forged" ? "Forge" : "Encrypt"} trigger`}
          </span>
          {!playing && !detonated && (
            <ArtifactCardView card={MARKED_TARGET} tier={2} />
          )}
        </div>
      </section>

      {playing && (
        <AntimatterDetonationAnimation
          animKey={animKey}
          card={MARKED_TARGET}
          trigger={trigger}
          covenantBroken={covenantBroken}
          covenantArtifacts={COVENANT_ARTIFACTS}
          variant={variant}
          detonatorOwnerName="The Veiled Architect"
          eminenceReward={ANTIMATTER_DETONATION_EMINENCE_REWARD}
          eminenceTargetSelector="[data-dev-eminence-target='true']"
          reducedMotion={reducedMotion}
          onEminenceImpact={(amount) => setEminence(7 + amount)}
          onComplete={() => {
            setDetonated(true);
            setPlaying(false);
          }}
        />
      )}
    </main>
  );
}
