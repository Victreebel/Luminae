import React from 'react';
import type {
  CivilizationCameraScale,
  CivilizationCoreCondition,
  CivilizationDyadId,
  StandardAffinityKey,
} from '@workspace/game-types';
import { AFFINITY_META } from '@/lib/affinityMeta';

const LIVING_WORLD_STYLES = `
  .civ-living-world { contain: layout paint style; }
  .civ-physical-motion { animation-play-state: running; will-change: transform, opacity; }
  .civ-ground-vehicle {
    position: absolute;
    left: var(--vehicle-start-x);
    top: var(--vehicle-y);
    width: 7px;
    height: 2px;
    border-radius: 1px;
    background: rgba(231,242,255,0.88);
    box-shadow: 0 0 3px var(--vehicle-tone);
    opacity: 0;
    animation: civ-ground-vehicle 10.5s linear infinite;
  }
  .civ-ground-vehicle:nth-child(3) { animation-delay: -5.25s; animation-duration: 12.8s; }
  .civ-orbital-body {
    position: absolute;
    left: 50%;
    top: 51%;
    width: var(--orbit-radius);
    height: 1px;
    transform-origin: 0 50%;
    animation: civ-orbital-body var(--orbit-duration) linear infinite;
  }
  .civ-orbital-body > span {
    position: absolute;
    right: 0;
    top: -2px;
    width: var(--body-size);
    height: var(--body-size);
    border-radius: 50%;
    background: radial-gradient(circle at 36% 32%, rgba(255,255,255,0.92), var(--body-tone) 42%, rgba(3,8,16,0.94) 78%);
    box-shadow: 0 0 4px var(--body-tone);
  }
  .civ-distant-vessel {
    position: absolute;
    left: 12%;
    top: var(--vessel-y);
    width: 9px;
    height: 2px;
    border-radius: 1px;
    background: rgba(225,239,255,0.86);
    box-shadow: 0 0 4px var(--vessel-tone);
    opacity: 0;
    animation: civ-distant-vessel 16s ease-in-out infinite;
  }
  .civ-distant-vessel:nth-child(3) { animation-delay: -8s; animation-duration: 19s; }
  @keyframes civ-ground-vehicle {
    0% { transform: translate3d(0, 0, 0) scale(0.72); opacity: 0; }
    12% { opacity: 0.82; }
    86% { opacity: 0.7; }
    100% { transform: translate3d(54vw, -5px, 0) scale(0.9); opacity: 0; }
  }
  @keyframes civ-orbital-body { to { transform: rotate(360deg); } }
  @keyframes civ-distant-vessel {
    0% { transform: translate3d(0, 0, 0) scale(0.68); opacity: 0; }
    15% { opacity: 0.68; }
    82% { opacity: 0.56; }
    100% { transform: translate3d(70vw, -18px, 0) scale(0.9); opacity: 0; }
  }
  [data-civilization-motion="paused"] .civ-physical-motion,
  [data-civilization-visibility="offscreen"] .civ-physical-motion {
    animation-play-state: paused !important;
  }
  .civ-living-world[data-condition-motion="suspended"] .civ-physical-motion {
    display: none;
  }
  .civ-living-world[data-condition-motion="intermittent"] .civ-physical-motion {
    animation-timing-function: steps(6, end);
  }
  @media (max-width: 640px) {
    .civ-ground-vehicle:nth-child(3),
    .civ-distant-vessel:nth-child(3) { display: none; }
    .civ-ground-vehicle { animation-duration: 15s; }
    .civ-distant-vessel { animation-duration: 22s; }
  }
  @media (prefers-reduced-motion: reduce) {
    .civ-physical-motion { animation: none !important; opacity: 0.54; }
  }
`;

function PhysicalSurfaceTraffic({ tones }: { tones: readonly string[] }) {
  return (
    <>
      <span
        className="civ-physical-motion civ-ground-vehicle"
        style={{
          '--vehicle-start-x': '16%',
          '--vehicle-y': '78%',
          '--vehicle-tone': tones[0] ?? '#dfb86b',
        } as React.CSSProperties}
        data-motion-object="ground-transport"
      />
      <span
        className="civ-physical-motion civ-ground-vehicle"
        style={{
          '--vehicle-start-x': '24%',
          '--vehicle-y': '69%',
          '--vehicle-tone': tones[1] ?? tones[0] ?? '#82ddff',
        } as React.CSSProperties}
        data-motion-object="ground-transport"
      />
    </>
  );
}

function PhysicalOrbitalTraffic({
  scene,
  tones,
}: {
  scene: 'orbit' | 'stellar';
  tones: readonly string[];
}) {
  return (
    <>
      <span
        className="civ-physical-motion civ-orbital-body"
        style={{
          '--orbit-radius': scene === 'orbit' ? '32%' : '39%',
          '--orbit-duration': scene === 'orbit' ? '29s' : '48s',
          '--body-size': scene === 'orbit' ? '4px' : '5px',
          '--body-tone': tones[0] ?? '#82ddff',
        } as React.CSSProperties}
        data-motion-object={scene === 'orbit' ? 'orbital-craft' : 'system-vessel'}
      >
        <span />
      </span>
      {scene === 'stellar' && (
        <span
          className="civ-physical-motion civ-orbital-body"
          style={{
            '--orbit-radius': '25%',
            '--orbit-duration': '37s',
            '--body-size': '3px',
            '--body-tone': tones[1] ?? tones[0] ?? '#dfb86b',
            transform: 'rotate(146deg)',
          } as React.CSSProperties}
          data-motion-object="system-vessel"
        >
          <span />
        </span>
      )}
    </>
  );
}

function PhysicalGalacticTraffic({ tones }: { tones: readonly string[] }) {
  return (
    <>
      <span
        className="civ-physical-motion civ-distant-vessel"
        style={{ '--vessel-y': '42%', '--vessel-tone': tones[0] ?? '#dfb86b' } as React.CSSProperties}
        data-motion-object="interstellar-vessel"
      />
      <span
        className="civ-physical-motion civ-distant-vessel"
        style={{ '--vessel-y': '68%', '--vessel-tone': tones[1] ?? tones[0] ?? '#82ddff' } as React.CSSProperties}
        data-motion-object="interstellar-vessel"
      />
    </>
  );
}

export function CivilizationLivingWorldLayer({
  scene,
  dyad,
  operationalShares,
  activeConditions = [],
}: {
  scene: CivilizationCameraScale;
  dyad?: CivilizationDyadId | null;
  operationalShares?: Partial<Record<StandardAffinityKey, number>>;
  activeConditions?: readonly CivilizationCoreCondition[];
}) {
  const conditionMotion = activeConditions.includes('isolated')
    ? 'suspended'
    : activeConditions.includes('disrupted')
      ? 'intermittent'
      : 'active';
  const activeTones = (Object.entries(operationalShares ?? {}) as Array<[
    StandardAffinityKey,
    number,
  ]>)
    .filter(([, share]) => share > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([affinity]) => AFFINITY_META[affinity].hex);

  return (
    <div
      className="civ-living-world pointer-events-none absolute inset-0 z-[11] overflow-hidden"
      data-testid="civilization-living-world"
      data-scene={scene}
      data-dyad={dyad ?? 'unknown'}
      data-motion-language="physical-objects"
      data-condition-motion={conditionMotion}
      aria-hidden="true"
    >
      <style>{LIVING_WORLD_STYLES}</style>
      {scene === 'surface' && <PhysicalSurfaceTraffic tones={activeTones} />}
      {scene === 'orbit' && <PhysicalOrbitalTraffic scene="orbit" tones={activeTones} />}
      {scene === 'stellar' && <PhysicalOrbitalTraffic scene="stellar" tones={activeTones} />}
      {scene === 'galaxy' && <PhysicalGalacticTraffic tones={activeTones} />}
    </div>
  );
}
