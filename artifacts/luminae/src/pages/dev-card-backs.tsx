import { useParams } from "wouter";
import { CardBackTier1, CardBackTier2, CardBackTier3 } from "@/components/ArtifactCardBack";

const TIERS = [
  { Component: CardBackTier1, label: "TIER I — PLANETARY CIVILIZATION",  sub: "Shard Relic" },
  { Component: CardBackTier2, label: "TIER II — STELLAR CIVILIZATION",   sub: "Stellar Engine" },
  { Component: CardBackTier3, label: "TIER III — GALACTIC CIVILIZATION", sub: "Galactic Aperture" },
] as const;

export default function DevCardBacks() {
  const params = useParams<{ tier: string }>();
  const tierIdx = Math.max(0, Math.min(2, parseInt(params.tier ?? "1", 10) - 1));
  const { Component, label } = TIERS[tierIdx];

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#060810 0%,#0a0c1e 60%,#040608 100%)" }}
    >
      <div className="flex flex-col items-center gap-10">
        <div className="flex items-end gap-10">
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 210, height: 300 }}>
              <Component />
            </div>
            <span style={{ color: "#6070a0", fontSize: 11, letterSpacing: "0.08em", fontFamily: "system-ui" }}>
              large (review)
            </span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 112, height: 160 }}>
              <Component />
            </div>
            <span style={{ color: "#6070a0", fontSize: 11, letterSpacing: "0.08em", fontFamily: "system-ui" }}>
              in-game market
            </span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 36, height: 51 }}>
              <Component />
            </div>
            <span style={{ color: "#6070a0", fontSize: 11, letterSpacing: "0.08em", fontFamily: "system-ui" }}>
              deck tile
            </span>
          </div>
        </div>
        <div
          style={{
            color: "#c4a85a",
            fontFamily: "Georgia, serif",
            fontSize: 13,
            letterSpacing: "0.18em",
            opacity: 0.85,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
