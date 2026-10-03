import type {
  CivilizationSceneKind,
  CivilizationVisualState,
} from '@/lib/civilizationVisualState';

export function CivilizationScaleTransition({
  from,
  to,
  primaryTone,
}: {
  from: CivilizationSceneKind;
  to: CivilizationSceneKind;
  primaryTone: string;
}) {
  const zoomingOut = ['surface', 'orbit', 'stellar', 'galaxy'].indexOf(to) > ['surface', 'orbit', 'stellar', 'galaxy'].indexOf(from);
  return (
    <div
      className="civ-scale-transition pointer-events-none absolute inset-0 z-[84] grid place-items-center overflow-hidden"
      data-testid="civilization-scale-transition"
      data-direction={zoomingOut ? 'out' : 'in'}
      aria-hidden="true"
    >
      <div className="civ-scale-transition-shutter absolute inset-0 bg-[#02050b]/72" />
      <div
        className="civ-scale-transition-reticle relative grid aspect-square w-[min(58vw,260px)] place-items-center rounded-full border"
        style={{ borderColor: `${primaryTone}99`, boxShadow: `0 0 42px ${primaryTone}38, inset 0 0 34px ${primaryTone}24` }}
      >
        <span className="absolute inset-[14%] rounded-full border border-white/22" />
        <span className="font-serif text-lg text-white/92">{to.charAt(0).toUpperCase() + to.slice(1)}</span>
      </div>
    </div>
  );
}

export function CivilizationMaturityCinematic({
  maturity,
  tone,
}: {
  maturity: CivilizationVisualState['historicalMaturity'];
  tone: string;
}) {
  return (
    <div
      className="civ-maturity-cinematic pointer-events-none absolute inset-0 z-[86] grid place-items-center bg-[#02040a]/58"
      data-testid="civilization-maturity-cinematic"
      aria-live="polite"
    >
      <div className="civ-maturity-cinematic-mark text-center" style={{ color: tone }}>
        <span className="block text-[10px] font-black uppercase tracking-[0.28em] text-white/58">Civilization ascends</span>
        <strong className="mt-2 block font-serif text-3xl font-semibold text-white sm:text-4xl">
          {maturity.charAt(0).toUpperCase() + maturity.slice(1)}
        </strong>
        <span className="mx-auto mt-3 block h-px w-32" style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }} />
      </div>
    </div>
  );
}

export function CivilizationMorphologyStyles() {
  return (
    <style>{`
      @keyframes civScaleShutter {
        0% { opacity: 0; }
        22%, 55% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes civScaleReticleOut {
        0% { opacity: 0; transform: scale(1.72); }
        24% { opacity: 1; }
        100% { opacity: 0; transform: scale(0.44); }
      }
      @keyframes civScaleReticleIn {
        0% { opacity: 0; transform: scale(0.38); }
        24% { opacity: 1; }
        100% { opacity: 0; transform: scale(1.68); }
      }
      @keyframes civMaturityReveal {
        0% { opacity: 0; transform: scale(0.92); }
        18%, 72% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.035); }
      }
      .civ-scale-transition { animation: civScaleShutter 1.05s ease-in-out both; }
      .civ-scale-transition-reticle { animation: civScaleReticleOut 1.05s cubic-bezier(.2,.7,.2,1) both; }
      .civ-scale-transition[data-direction="in"] .civ-scale-transition-reticle { animation-name: civScaleReticleIn; }
      .civ-maturity-cinematic { animation: civScaleShutter 2.25s ease-in-out both; }
      .civ-maturity-cinematic-mark { animation: civMaturityReveal 2.25s ease-out both; }
      @media (prefers-reduced-motion: reduce) {
        .civ-scale-transition,
        .civ-scale-transition-reticle,
        .civ-maturity-cinematic,
        .civ-maturity-cinematic-mark { animation-duration: 120ms !important; }
      }
    `}</style>
  );
}
