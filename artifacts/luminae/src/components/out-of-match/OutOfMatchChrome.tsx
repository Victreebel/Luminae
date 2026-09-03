import type { ReactNode } from "react";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import {
  useOutOfMatchAmbience,
  useOutOfMatchSounds,
} from "@/components/out-of-match/outOfMatchSounds";
import type { OutOfGameAmbientMood } from "@/lib/outOfGameAudio";

export function OutOfMatchBackdrop({ audioMood = "menu" }: { audioMood?: OutOfGameAmbientMood | null }) {
  useOutOfMatchSounds();
  useOutOfMatchAmbience(audioMood);

  return (
    <div className="oom-backdrop" aria-hidden="true">
      <div
        className="oom-backdrop__cosmos"
        style={{ backgroundImage: `url(${backgroundCosmos})` }}
      />
      <div className="oom-backdrop__scrim" />
      <div className="oom-backdrop__horizon" />
    </div>
  );
}

export function LuminaeWordmark({
  onClick,
  className = "",
}: {
  onClick?: () => void;
  className?: string;
}) {
  const wordmark = (
    <span className={`oom-wordmark ${className}`} role="img" aria-label="Luminae">
      <span className="oom-wordmark__aura" aria-hidden="true" />
      <span className="oom-wordmark__rule oom-wordmark__rule--top" aria-hidden="true">
        <span />
      </span>
      <span className="oom-wordmark__text" aria-hidden="true">LUMINAE</span>
      <span className="oom-wordmark__rule oom-wordmark__rule--bottom" aria-hidden="true">
        <span />
      </span>
    </span>
  );

  if (!onClick) return wordmark;

  return (
    <button type="button" onClick={onClick} className="oom-wordmark-button" aria-label="Luminae home">
      {wordmark}
    </button>
  );
}

export function OutOfMatchHeader({
  left,
  center,
  right,
}: {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="oom-topbar">
      <div className="oom-topbar__inner">
        <div className="oom-topbar__side oom-topbar__side--left">{left}</div>
        <div className="oom-topbar__center">{center}</div>
        <div className="oom-topbar__side oom-topbar__side--right">{right}</div>
      </div>
    </header>
  );
}

export function OutOfMatchSectionHeading({
  eyebrow,
  title,
  detail,
  titleId,
}: {
  eyebrow?: string;
  title: string;
  detail?: ReactNode;
  titleId?: string;
}) {
  return (
    <div className="oom-section-heading">
      <div className="min-w-0">
        {eyebrow && <p className="oom-kicker">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
      </div>
      {detail && <div className="oom-section-heading__detail">{detail}</div>}
    </div>
  );
}
