export type BlueprintModelView = {
  yaw: number;
  pitch: number;
  zoom: number;
};

export type BlueprintModelViewController = {
  orbitBy: (yawDelta: number, pitchDelta: number) => void;
  zoomBy: (delta: number) => void;
  reset: () => void;
  update: (deltaSeconds: number) => BlueprintModelView;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const wrapAngle = (angle: number) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));

const shortestAngleDelta = (from: number, to: number) =>
  wrapAngle(to - from);

export function createBlueprintModelViewController(): BlueprintModelViewController {
  const current: BlueprintModelView = { yaw: 0, pitch: 0, zoom: 0 };
  const target: BlueprintModelView = { yaw: 0, pitch: 0, zoom: 0 };

  return {
    orbitBy(yawDelta, pitchDelta) {
      target.yaw = wrapAngle(target.yaw + yawDelta);
      target.pitch = clamp(target.pitch + pitchDelta, -0.68, 0.68);
    },
    zoomBy(delta) {
      target.zoom = clamp(target.zoom + delta, -1, 1);
    },
    reset() {
      target.yaw = 0;
      target.pitch = 0;
      target.zoom = 0;
    },
    update(deltaSeconds) {
      const blend = 1 - Math.exp(-12 * clamp(deltaSeconds, 0, 0.08));
      current.yaw = wrapAngle(
        current.yaw + shortestAngleDelta(current.yaw, target.yaw) * blend,
      );
      current.pitch += (target.pitch - current.pitch) * blend;
      current.zoom += (target.zoom - current.zoom) * blend;
      return current;
    },
  };
}
