import { describe, expect, it } from 'vitest';
import {
  ANTIMATTER_CINEMATIC_TIMING,
  getAntimatterCinematicPhase,
} from '../antimatterCinematicTimeline';

describe('Antimatter cinematic timeline', () => {
  it('keeps phase boundaries stable for picture and sound', () => {
    const { phases } = ANTIMATTER_CINEMATIC_TIMING;
    expect(getAntimatterCinematicPhase(0)).toBe('RECOVERY');
    expect(getAntimatterCinematicPhase(phases.assembly)).toBe('ASSEMBLY');
    expect(getAntimatterCinematicPhase(phases.containment)).toBe('CONTAINMENT');
    expect(getAntimatterCinematicPhase(phases.annihilation)).toBe('ANNIHILATION');
    expect(getAntimatterCinematicPhase(phases.manifested)).toBe('MANIFESTED');
  });

  it('locks all four source Artifacts before the implosion begins', () => {
    const timing = ANTIMATTER_CINEMATIC_TIMING;
    const locks = Object.values(timing.parts).map((part) => part.locksAt);
    expect(locks).toEqual([...locks].sort((left, right) => left - right));
    expect(Math.max(...locks)).toBeLessThan(timing.implosion.startsAt);
  });

  it('begins containment only after the final assembly lock', () => {
    const timing = ANTIMATTER_CINEMATIC_TIMING;
    const finalLock = Math.max(
      ...Object.values(timing.parts).map((part) => part.locksAt),
    );
    expect(timing.containment.startsAt).toBeGreaterThan(finalLock);
    expect(timing.phases.containment).toBeGreaterThan(finalLock);
    expect(timing.phases.containment).toBeGreaterThanOrEqual(
      timing.containment.startsAt,
    );
  });

  it('keeps every subsystem deployment inside its source Artifact lock window', () => {
    const { deployments, parts } = ANTIMATTER_CINEMATIC_TIMING;
    const deploymentWindows = [
      [deployments.ignitionNetwork, parts.ignitionKernel],
      [deployments.magneticCage, parts.magneticBottle],
      [deployments.causalCircumference, parts.causalSparkCoil],
      [deployments.horizonMirror, parts.horizonExtractor],
      [deployments.horizonSpine, parts.horizonExtractor],
    ] as const;

    for (const [deployment, part] of deploymentWindows) {
      expect(deployment.startsAt).toBeGreaterThan(part.entersAt);
      expect(deployment.settlesAt).toBeGreaterThan(deployment.startsAt);
      expect(deployment.settlesAt).toBeLessThanOrEqual(part.locksAt);
    }
  });

  it('provides uninterrupted mechanical coverage from entry through final deployment', () => {
    const timing = ANTIMATTER_CINEMATIC_TIMING;
    const entryTimes = Object.values(timing.parts)
      .map((part) => part.entersAt)
      .sort((left, right) => left - right);
    for (let index = 1; index < entryTimes.length; index += 1) {
      expect(entryTimes[index]).toBeLessThanOrEqual(
        entryTimes[index - 1] + timing.assemblyAudio.entryStrokeDuration,
      );
    }

    const deploymentWindows = Object.values(timing.deployments)
      .sort((left, right) => left.startsAt - right.startsAt);
    expect(deploymentWindows[0].startsAt).toBeLessThanOrEqual(
      entryTimes.at(-1)! + timing.assemblyAudio.entryStrokeDuration,
    );
    for (let index = 1; index < deploymentWindows.length; index += 1) {
      expect(deploymentWindows[index].startsAt).toBeLessThanOrEqual(
        deploymentWindows[index - 1].settlesAt,
      );
    }
  });

  it('converges all three implosion waves at the pinch point', () => {
    const timing = ANTIMATTER_CINEMATIC_TIMING;
    expect(timing.implosionWaves).toHaveLength(3);
    expect(timing.implosionWaves[0]).toBe(timing.implosion.startsAt);
    for (const startsAt of timing.implosionWaves) {
      expect(startsAt).toBeGreaterThanOrEqual(timing.implosion.startsAt);
      expect(startsAt).toBeLessThan(timing.implosion.pinchesAt);
    }
    expect(timing.flash.startsAt).toBe(timing.implosion.pinchesAt);
  });

  it('orders the flash, restrained aftershock, and reveal', () => {
    const timing = ANTIMATTER_CINEMATIC_TIMING;
    expect(timing.flash.peaksAt).toBeGreaterThan(timing.flash.startsAt);
    expect(timing.flash.peaksAt).toBeLessThan(timing.flash.endsAt);
    expect(timing.aftershock.startsAt).toBeGreaterThanOrEqual(timing.flash.peaksAt);
    expect(timing.aftershock.endsAt).toBeLessThan(timing.phases.manifested);
    expect(timing.reveal.startsAt).toBeGreaterThan(timing.flash.peaksAt);
    expect(timing.reveal.completesAt).toBeLessThan(timing.duration);
  });

  it('schedules exactly three beats after manifestation', () => {
    const timing = ANTIMATTER_CINEMATIC_TIMING;
    expect(timing.manifestedPulses).toEqual([6.42, 7.08, 7.82]);
    expect(timing.manifestedPulses).toHaveLength(3);
    for (const pulseAt of timing.manifestedPulses) {
      expect(pulseAt).toBeGreaterThan(timing.phases.manifested);
      expect(pulseAt).toBeLessThan(timing.duration);
    }
  });
});
