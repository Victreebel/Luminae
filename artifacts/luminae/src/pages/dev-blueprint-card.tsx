import { useState } from "react";
import { ArrowLeft, Film } from "lucide-react";
import { useLocation } from "wouter";
import {
  AntimatterBlueprintCard,
  type AntimatterBlueprintState,
} from "@/components/blueprints/AntimatterBlueprintCard";
import { AscensionRegistryBlueprintCard } from "@/components/blueprints/AscensionRegistryBlueprintCard";
import { MantleToOrbitBlueprintCard } from "@/components/blueprints/MantleToOrbitBlueprintCard";
import {
  LuminaeWordmark,
  OutOfMatchBackdrop,
  OutOfMatchHeader,
} from "@/components/out-of-match/OutOfMatchChrome";

export default function DevBlueprintCard() {
  const [, navigate] = useLocation();
  const [blueprint, setBlueprint] = useState<"antimatter" | "foundry" | "ascension">(() => {
    if (typeof window === "undefined") return "antimatter";
    const requested = new URLSearchParams(window.location.search).get("blueprint");
    return requested === "foundry" || requested === "ascension" ? requested : "antimatter";
  });
  const [state, setState] = useState<AntimatterBlueprintState>("assembling");
  const [covenantBroken, setCovenantBroken] = useState(false);

  const selectBlueprint = (nextBlueprint: "antimatter" | "foundry" | "ascension") => {
    setBlueprint(nextBlueprint);
    const url = new URL(window.location.href);
    if (nextBlueprint === "antimatter") {
      url.searchParams.delete("blueprint");
    } else {
      url.searchParams.set("blueprint", nextBlueprint);
    }
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className="blueprint-card-preview min-h-[100dvh]">
      <OutOfMatchBackdrop />
      <OutOfMatchHeader
        left={<LuminaeWordmark />}
        center={<span className="blueprint-card-preview__section">Blueprint Vault</span>}
        right={blueprint === "antimatter" ? (
          <button
            type="button"
            className="blueprint-card-preview__icon-button"
            onClick={() => navigate("/dev/antimatter-cinematic")}
            aria-label="View manifestation cinematic"
            title="View manifestation cinematic"
          >
            <Film aria-hidden="true" />
          </button>
        ) : undefined}
      />

      <main className="blueprint-card-preview__main">
        <div className="blueprint-card-preview__toolbar">
          {blueprint === "antimatter" ? (
            <button
              type="button"
              className="blueprint-card-preview__back"
              onClick={() => navigate("/dev/antimatter-cinematic")}
            >
              <ArrowLeft aria-hidden="true" />
              Manifestation
            </button>
          ) : (
            <span className="blueprint-card-preview__classification">
              {blueprint === "foundry"
                ? "Ascension Industry / Planetary"
                : "Ascension Institution / Planetary"}
            </span>
          )}

          <div className="blueprint-card-preview__view-controls">
            <div
              className="blueprint-card-preview__segments blueprint-card-preview__segments--blueprint"
              aria-label="Blueprint"
            >
              <button
                type="button"
                data-active={blueprint === "antimatter"}
                onClick={() => selectBlueprint("antimatter")}
              >
                Antimatter
              </button>
              <button
                type="button"
                data-active={blueprint === "foundry"}
                onClick={() => selectBlueprint("foundry")}
              >
                Mantle Foundry
              </button>
              <button
                type="button"
                data-active={blueprint === "ascension"}
                onClick={() => selectBlueprint("ascension")}
              >
                Ascension
              </button>
            </div>

            <div className="blueprint-card-preview__segments" aria-label="Blueprint state">
              <button
                type="button"
                data-active={state === "assembling"}
                onClick={() => setState("assembling")}
              >
                Assembling
              </button>
              <button
                type="button"
                data-active={state === "manifested"}
                onClick={() => setState("manifested")}
              >
                Manifested
              </button>
            </div>

            {blueprint === "antimatter" && (
              <div className="blueprint-card-preview__segments" aria-label="Covenant state">
                <button
                  type="button"
                  data-active={!covenantBroken}
                  onClick={() => setCovenantBroken(false)}
                >
                  Covenant Intact
                </button>
                <button
                  type="button"
                  data-active={covenantBroken}
                  onClick={() => setCovenantBroken(true)}
                >
                  Covenant Broken
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="blueprint-card-preview__stage">
          {blueprint === "antimatter" ? (
            <AntimatterBlueprintCard
              state={state}
              matchedSockets={3}
              covenantBroken={covenantBroken}
            />
          ) : blueprint === "foundry" ? (
            <MantleToOrbitBlueprintCard state={state} matchedSockets={2} />
          ) : (
            <AscensionRegistryBlueprintCard state={state} matchedSockets={2} />
          )}
        </div>
      </main>

      <style>{`
        .blueprint-card-preview {
          position: relative;
          overflow-x: hidden;
          color: #edf2f5;
          background: #060910;
        }

        .blueprint-card-preview__section {
          color: rgba(226, 235, 242, 0.66);
          font-family: var(--app-font-mono);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .blueprint-card-preview__icon-button {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          color: rgba(229, 238, 244, 0.72);
          border: 1px solid rgba(206, 222, 234, 0.16);
          border-radius: 4px;
          background: rgba(8, 13, 20, 0.76);
        }

        .blueprint-card-preview__icon-button:hover { color: white; border-color: rgba(206, 222, 234, 0.34); }
        .blueprint-card-preview__icon-button:focus-visible,
        .blueprint-card-preview__back:focus-visible,
        .blueprint-card-preview__segments button:focus-visible { outline: 2px solid #83c8ee; outline-offset: 2px; }
        .blueprint-card-preview__icon-button svg { width: 17px; height: 17px; }

        .blueprint-card-preview__main {
          position: relative;
          z-index: 2;
          display: flex;
          width: min(1180px, calc(100% - 40px));
          min-height: calc(100dvh - 74px);
          margin: 0 auto;
          flex-direction: column;
          justify-content: center;
          padding: 36px 0 54px;
        }

        .blueprint-card-preview__toolbar {
          display: flex;
          width: min(1080px, 100%);
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin: 0 auto 16px;
        }

        .blueprint-card-preview__back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 0;
          color: rgba(220, 231, 238, 0.58);
          background: transparent;
          font-family: var(--app-font-mono);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .blueprint-card-preview__back:hover { color: #f2f5f7; }
        .blueprint-card-preview__back svg { width: 14px; height: 14px; }

        .blueprint-card-preview__classification {
          color: rgba(220, 231, 238, 0.48);
          font-family: var(--app-font-mono);
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .blueprint-card-preview__segments {
          display: inline-grid;
          grid-template-columns: repeat(2, 1fr);
          padding: 3px;
          border: 1px solid rgba(203, 221, 234, 0.14);
          border-radius: 5px;
          background: rgba(5, 9, 14, 0.84);
        }

        .blueprint-card-preview__view-controls {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .blueprint-card-preview__segments button {
          min-width: 94px;
          padding: 7px 10px;
          color: rgba(220, 231, 238, 0.52);
          border-radius: 3px;
          font-family: var(--app-font-mono);
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .blueprint-card-preview__segments button[data-active="true"] {
          color: #f4efe7;
          background: rgba(117, 154, 180, 0.2);
          box-shadow: inset 0 0 0 1px rgba(168, 205, 229, 0.16);
        }

        .blueprint-card-preview__segments--blueprint button { min-width: 112px; }
        .blueprint-card-preview__segments--blueprint { grid-template-columns: repeat(3, 1fr); }

        .blueprint-card-preview__stage {
          display: flex;
          width: 100%;
          justify-content: center;
          padding: 26px;
          border-top: 1px solid rgba(204, 220, 231, 0.08);
          border-bottom: 1px solid rgba(204, 220, 231, 0.08);
          background: rgba(4, 7, 12, 0.34);
        }

        .blueprint-card-preview__stage > .antimatter-blueprint-face {
          width: min(960px, 100%, calc((100dvh - 200px) * 1.5));
        }

        .blueprint-card-preview__stage > .foundry-blueprint-face {
          width: min(960px, 100%, calc((100dvh - 200px) * 1.5));
        }

        @media (max-width: 760px) {
          .blueprint-card-preview__main { width: min(100% - 20px, 680px); padding: 22px 0 38px; }
          .blueprint-card-preview__stage { padding: 10px; }
          .blueprint-card-preview__toolbar { margin-bottom: 10px; }
          .blueprint-card-preview__back { font-size: 7px; }
          .blueprint-card-preview__view-controls { flex-wrap: wrap; }
          .blueprint-card-preview__segments button { min-width: 68px; padding: 6px 7px; font-size: 7px; }
        }

        @media (max-width: 430px) {
          .blueprint-card-preview__main { width: calc(100% - 12px); }
          .blueprint-card-preview__stage { padding: 6px; }
          .blueprint-card-preview__toolbar { align-items: flex-start; flex-direction: column; }
          .blueprint-card-preview__back { font-size: 0; }
          .blueprint-card-preview__back svg { width: 18px; height: 18px; }
          .blueprint-card-preview__view-controls { width: 100%; justify-content: center; gap: 5px; }
          .blueprint-card-preview__segments { padding: 2px; }
          .blueprint-card-preview__segments button { min-width: 55px; padding: 6px 4px; font-size: 6px; }
        }
      `}</style>
    </div>
  );
}
