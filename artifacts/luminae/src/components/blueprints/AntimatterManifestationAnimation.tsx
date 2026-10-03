import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import ignitionKernelArtwork from "@/assets/cards/runtime/t1r01.webp";
import causalSparkCoilArtwork from "@/assets/cards/runtime/t1r04.webp";
import magneticBottleArtwork from "@/assets/cards/runtime/t1p04.webp";
import horizonExtractorArtwork from "@/assets/cards/runtime/t2o01.webp";
import { BlueprintModelControls } from "@/components/blueprints/BlueprintModelControls";
import {
  createBlueprintModelViewController,
  type BlueprintModelViewController,
} from "@/components/blueprints/blueprintModelViewController";
import { gameAudio } from "@/lib/audio";
import {
  ANTIMATTER_CINEMATIC_TIMING,
  getAntimatterCinematicPhase,
  type AntimatterCinematicPhase,
} from "@/lib/antimatterCinematicTimeline";

type AssemblyPart = {
  group: THREE.Group;
  start: THREE.Vector3;
  end: THREE.Vector3;
  startRotation: THREE.Quaternion;
  endRotation: THREE.Quaternion;
  entersAt: number;
  locksAt: number;
};

type ImplosionWave = {
  mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  startsAt: number;
};

type SubsystemDeployment = {
  object: THREE.Object3D;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startScale: THREE.Vector3;
  endScale: THREE.Vector3;
  startRotation: THREE.Quaternion;
  endRotation: THREE.Quaternion;
  startsAt: number;
  settlesAt: number;
};

export type AntimatterVisualVariant = "original" | "asymmetric" | "lattice" | "armored";

type AntimatterVisualProfile = {
  id: AntimatterVisualVariant;
  label: string;
  model: "original" | "component-derived";
  armored: boolean;
  extractorLayout: "single" | "mirrored";
  useReflectionEnvironment: boolean;
  eventCenterX: number;
  cameraTargetX: number;
  coreRadius: number;
  crackRadius: number;
  rootYaw: number;
  rootPitch: number;
  livingRotation: number;
  lighting: {
    ambient: number;
    inspection: number;
    rim: number;
  };
  materials: {
    metal: { color: number; roughness: number };
    paleMetal: {
      color: number;
      metalness: number;
      roughness: number;
      emissive: number;
      emissiveIntensity: number;
    };
    gold: { color: number; roughness: number };
  };
};

const ANTIMATTER_VISUAL_PROFILES: Record<
  AntimatterVisualVariant,
  AntimatterVisualProfile
> = {
  original: {
    id: "original",
    label: "Original",
    model: "original",
    armored: false,
    extractorLayout: "single",
    useReflectionEnvironment: false,
    eventCenterX: 0.44,
    cameraTargetX: 1,
    coreRadius: 0.74,
    crackRadius: 0.755,
    rootYaw: 0,
    rootPitch: -0.08,
    livingRotation: 0.035,
    lighting: {
      ambient: 0.7,
      inspection: 0,
      rim: 0,
    },
    materials: {
      metal: { color: 0x424b58, roughness: 0.2 },
      paleMetal: {
        color: 0xc4d1dc,
        metalness: 0.92,
        roughness: 0.16,
        emissive: 0x33536b,
        emissiveIntensity: 0.24,
      },
      gold: { color: 0xe8a94c, roughness: 0.2 },
    },
  },
  asymmetric: {
    id: "asymmetric",
    label: "Asymmetric",
    model: "component-derived",
    armored: false,
    extractorLayout: "single",
    useReflectionEnvironment: false,
    eventCenterX: -0.46,
    cameraTargetX: 0.24,
    coreRadius: 0.74,
    crackRadius: 0.755,
    rootYaw: -0.38,
    rootPitch: -0.08,
    livingRotation: 0.025,
    lighting: {
      ambient: 0.7,
      inspection: 2.8,
      rim: 1.8,
    },
    materials: {
      metal: { color: 0x424b58, roughness: 0.2 },
      paleMetal: {
        color: 0xe5e0d4,
        metalness: 0.74,
        roughness: 0.2,
        emissive: 0x4a3018,
        emissiveIntensity: 0.18,
      },
      gold: { color: 0xe8a94c, roughness: 0.2 },
    },
  },
  lattice: {
    id: "lattice",
    label: "Lattice",
    model: "component-derived",
    armored: false,
    extractorLayout: "mirrored",
    useReflectionEnvironment: false,
    eventCenterX: -0.46,
    cameraTargetX: 0.24,
    coreRadius: 0.74,
    crackRadius: 0.755,
    rootYaw: -0.38,
    rootPitch: -0.08,
    livingRotation: 0.025,
    lighting: {
      ambient: 0.7,
      inspection: 2.8,
      rim: 1.8,
    },
    materials: {
      metal: { color: 0x424b58, roughness: 0.2 },
      paleMetal: {
        color: 0xe5e0d4,
        metalness: 0.74,
        roughness: 0.2,
        emissive: 0x4a3018,
        emissiveIntensity: 0.18,
      },
      gold: { color: 0xe8a94c, roughness: 0.2 },
    },
  },
  armored: {
    id: "armored",
    label: "Armored",
    model: "component-derived",
    armored: true,
    extractorLayout: "mirrored",
    useReflectionEnvironment: true,
    eventCenterX: -0.46,
    cameraTargetX: -0.46,
    coreRadius: 0.82,
    crackRadius: 0.835,
    rootYaw: -0.46,
    rootPitch: -0.11,
    livingRotation: 0,
    lighting: {
      ambient: 0.92,
      inspection: 3.7,
      rim: 2.6,
    },
    materials: {
      metal: { color: 0x242a31, roughness: 0.26 },
      paleMetal: {
        color: 0xd4d7d4,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x28231a,
        emissiveIntensity: 0.08,
      },
      gold: { color: 0xd0a049, roughness: 0.22 },
    },
  },
};

function getInitialVisualVariant(): AntimatterVisualVariant {
  if (typeof window === "undefined") return "armored";
  const requestedVariant = new URLSearchParams(window.location.search).get("variant");
  return requestedVariant === "original" ||
    requestedVariant === "asymmetric" ||
    requestedVariant === "lattice" ||
    requestedVariant === "armored"
    ? requestedVariant
    : "armored";
}

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);

const progressBetween = (time: number, start: number, end: number) =>
  clamp01((time - start) / (end - start));

function getMechanicalRingMotionTime(elapsed: number) {
  const activationStartsAt = ANTIMATTER_CINEMATIC_TIMING.flash.startsAt;
  const activationCompletesAt = ANTIMATTER_CINEMATIC_TIMING.flash.endsAt;
  if (elapsed <= activationStartsAt) return 0;

  const activationDuration = activationCompletesAt - activationStartsAt;
  if (elapsed < activationCompletesAt) {
    const progress = (elapsed - activationStartsAt) / activationDuration;
    const integratedSpeed = progress ** 3 - 0.5 * progress ** 4;
    return activationDuration * integratedSpeed;
  }

  return activationDuration * 0.5 + elapsed - activationCompletesAt;
}

const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function getArmoredBreathExpansion(time: number) {
  const cycle = ((time % 4.2) + 4.2) % 4.2;
  if (cycle < 0.35) return 1;
  if (cycle < 1.6) return 1 - smoothstep((cycle - 0.35) / 1.25);
  if (cycle < 1.95) return 0;
  if (cycle < 3.5) return smoothstep((cycle - 1.95) / 1.55);
  return 1;
}

const easeOutBack = (value: number) => {
  const t = clamp01(value);
  const c1 = 1.3;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.Texture();
  }

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.1, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.32, "rgba(255,255,255,0.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type CoreVeinBranch = {
  depth: number;
  points: Array<{ x: number; y: number }>;
};

function createCoreVeinTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (!context) return new THREE.Texture();

  const random = seededRandom(9173);
  const branches: CoreVeinBranch[] = [];
  const junctions: Array<{ x: number; y: number }> = [];
  let branchCount = 0;

  const growBranch = (
    startX: number,
    startY: number,
    initialAngle: number,
    length: number,
    depth: number,
  ) => {
    if (depth > 2 || branchCount >= 64 || length < 24) return;
    branchCount += 1;

    const segmentCount = depth === 0 ? 7 : depth === 1 ? 5 : 4;
    const forkSteps = depth === 0 ? [2, 4, 6] : depth === 1 ? [3] : [];
    const points = [{ x: startX, y: startY }];
    let x = startX;
    let y = startY;
    let angle = initialAngle;

    for (let step = 1; step <= segmentCount; step += 1) {
      angle += (random() - 0.5) * (depth === 0 ? 0.42 : 0.66);
      const segmentLength =
        (length / segmentCount) * (0.82 + random() * 0.34);
      x = THREE.MathUtils.clamp(
        x + Math.cos(angle) * segmentLength,
        18,
        canvas.width - 18,
      );
      y = THREE.MathUtils.clamp(
        y + Math.sin(angle) * segmentLength,
        18,
        canvas.height - 18,
      );
      points.push({ x, y });

      if (forkSteps.includes(step)) {
        const direction = random() < 0.5 ? -1 : 1;
        junctions.push({ x, y });
        growBranch(
          x,
          y,
          angle + direction * (0.56 + random() * 0.5),
          length * (depth === 0 ? 0.48 : 0.4) * (0.84 + random() * 0.24),
          depth + 1,
        );
      }
    }

    branches.push({ depth, points });
  };

  const trunkPoints = Array.from({ length: 19 }, (_, index) => {
    const progress = index / 18;
    return {
      x: progress * canvas.width,
      y: 256 +
        Math.sin(progress * Math.PI * 2) * 54 +
        Math.sin(progress * Math.PI * 6) * 20,
    };
  });
  branches.push({ depth: 0, points: trunkPoints });

  [1, 3, 5, 7, 9, 11, 13, 15, 17].forEach((pointIndex, index) => {
    const point = trunkPoints[pointIndex];
    const previous = trunkPoints[pointIndex - 1];
    const next = trunkPoints[pointIndex + 1];
    const tangent = Math.atan2(next.y - previous.y, next.x - previous.x);
    const direction = index % 2 === 0 ? -1 : 1;
    junctions.push(point);
    growBranch(
      point.x,
      point.y,
      tangent + direction * (1.02 + random() * 0.22),
      178 + random() * 52,
      0,
    );
  });

  const strokeLayer = (
    color: string,
    widthScale: number,
    shadowBlur: number,
  ) => {
    context.save();
    context.globalCompositeOperation = "lighter";
    context.strokeStyle = color;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = color;
    context.shadowBlur = shadowBlur;

    branches.forEach(({ depth, points }) => {
      const branchWidth = [5.8, 3.2, 1.65][depth] * widthScale;
      context.lineWidth = branchWidth;
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    });
    context.restore();
  };

  strokeLayer("rgba(118, 4, 0, 0.26)", 2.5, 10);
  strokeLayer("rgba(255, 25, 12, 0.88)", 1.05, 4);
  strokeLayer("rgba(255, 74, 38, 0.94)", 0.28, 1.5);

  junctions.filter((_, index) => index % 2 === 0).slice(0, 16).forEach(({ x, y }) => {
    const nodeGlow = context.createRadialGradient(x, y, 0, x, y, 8);
    nodeGlow.addColorStop(0, "rgba(255,190,120,0.95)");
    nodeGlow.addColorStop(0.28, "rgba(255,60,20,0.78)");
    nodeGlow.addColorStop(1, "rgba(120,0,0,0)");
    context.fillStyle = nodeGlow;
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.needsUpdate = true;
  return texture;
}

function createStars(random: () => number) {
  const count = 900;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cool = new THREE.Color(0x8cc8ff);
  const warm = new THREE.Color(0xffc87a);
  const white = new THREE.Color(0xf5f7ff);

  for (let index = 0; index < count; index += 1) {
    const radius = 13 + random() * 27;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const positionOffset = index * 3;
    positions[positionOffset] = radius * Math.sin(phi) * Math.cos(theta);
    positions[positionOffset + 1] = radius * Math.cos(phi);
    positions[positionOffset + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const selectedColor = random() > 0.88 ? warm : random() > 0.72 ? cool : white;
    const brightness = 0.28 + random() * 0.72;
    colors[positionOffset] = selectedColor.r * brightness;
    colors[positionOffset + 1] = selectedColor.g * brightness;
    colors[positionOffset + 2] = selectedColor.b * brightness;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.055,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.82,
    vertexColors: true,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function createAssemblyDust(random: () => number) {
  const count = 180;
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 2.2 + random() * 4.4;
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = (random() - 0.5) * 5.5;
    positions[offset + 2] = Math.sin(angle) * radius * 0.48;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xbad7ff,
    size: 0.045,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function addCylinderBetween(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 12);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  group.add(mesh);
  return mesh;
}

function createFlatAnnulusGeometry(
  innerRadius: number,
  outerRadius: number,
  depth: number,
) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 72,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createLayeredContainmentRing(
  name: string,
  paleMetal: THREE.Material,
  gold: THREE.Material,
  grooveMaterial: THREE.Material,
) {
  const ring = new THREE.Group();
  ring.name = name;

  const solidBody = new THREE.Mesh(
    createFlatAnnulusGeometry(1.56, 1.77, 0.16),
    gold,
  );
  solidBody.name = `${name}-solid-gold-body`;
  ring.add(solidBody);

  [
    { innerRadius: 1.595, outerRadius: 1.66, suffix: "inner" },
    { innerRadius: 1.69, outerRadius: 1.745, suffix: "outer" },
  ].forEach(({ innerRadius, outerRadius, suffix }) => {
    const paleRail = new THREE.Mesh(
      createFlatAnnulusGeometry(innerRadius, outerRadius, 0.205),
      paleMetal,
    );
    paleRail.name = `${name}-${suffix}-pale-rail`;
    ring.add(paleRail);
  });

  const recessedGroove = new THREE.Mesh(
    createFlatAnnulusGeometry(1.665, 1.685, 0.17),
    grooveMaterial,
  );
  recessedGroove.name = `${name}-paired-ring-groove`;
  ring.add(recessedGroove);

  return ring;
}

function attachArtifactScan(
  group: THREE.Group,
  texture: THREE.Texture,
  accent: number,
  scale = 1,
) {
  const geometry = new THREE.PlaneGeometry(1.2, 1.6);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  const scan = new THREE.Mesh(geometry, material);
  scan.name = "artifact-scan";
  scan.position.z = 0.12;
  scan.scale.setScalar(scale);
  scan.renderOrder = 8;

  const frameMaterial = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthTest: false,
  });
  const frame = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.64, -0.84, 0.015),
      new THREE.Vector3(0.64, -0.84, 0.015),
      new THREE.Vector3(0.64, 0.84, 0.015),
      new THREE.Vector3(-0.64, 0.84, 0.015),
    ]),
    frameMaterial,
  );
  scan.add(frame);
  scan.userData.baseScale = scale;
  scan.userData.frame = frame;
  group.userData.artScan = scan;
  group.add(scan);
}

function registerSubsystemDeployment(
  root: THREE.Group,
  object: THREE.Object3D,
  options: {
    startPosition?: THREE.Vector3;
    startScale?: THREE.Vector3;
    startRotation?: THREE.Euler;
    timing: { startsAt: number; settlesAt: number };
  },
) {
  const deployment: SubsystemDeployment = {
    object,
    startPosition: options.startPosition?.clone() ?? object.position.clone(),
    endPosition: object.position.clone(),
    startScale: options.startScale?.clone() ?? new THREE.Vector3(0.04, 0.04, 0.04),
    endScale: object.scale.clone(),
    startRotation: new THREE.Quaternion().setFromEuler(
      options.startRotation ?? object.rotation,
    ),
    endRotation: object.quaternion.clone(),
    startsAt: options.timing.startsAt,
    settlesAt: options.timing.settlesAt,
  };
  object.position.copy(deployment.startPosition);
  object.scale.copy(deployment.startScale);
  object.quaternion.copy(deployment.startRotation);
  const deployments = (root.userData.deployments ?? []) as SubsystemDeployment[];
  deployments.push(deployment);
  root.userData.deployments = deployments;
}

function createOriginalIgnitionKernel(
  glowTexture: THREE.Texture,
  metal: THREE.MeshStandardMaterial,
  gold: THREE.MeshStandardMaterial,
  flare: THREE.MeshStandardMaterial,
) {
  const group = new THREE.Group();
  const random = seededRandom(401);
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x17181d,
    metalness: 0.52,
    roughness: 0.68,
    emissive: 0x2a0302,
    emissiveIntensity: 0.35,
  });
  const crackMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3b21,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.74, 48, 36), shellMaterial);
  core.name = "flare-core";
  group.add(core);

  for (let crackIndex = 0; crackIndex < 16; crackIndex += 1) {
    const points: THREE.Vector3[] = [];
    let theta = random() * Math.PI * 2;
    let phi = 0.28 + random() * 0.45;
    const steps = 4 + Math.floor(random() * 3);
    for (let step = 0; step <= steps; step += 1) {
      theta += (random() - 0.5) * 0.5;
      phi += 0.13 + random() * 0.18;
      points.push(new THREE.Vector3().setFromSphericalCoords(0.755, phi, theta));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    group.add(
      new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.012, 5, false), crackMaterial),
    );
  }

  [
    { radius: 1.02, tube: 0.045, rotation: new THREE.Euler(0.42, 0.24, -0.28) },
  ].forEach(({ radius, tube, rotation }) => {
    const housing = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 12, 96),
      gold,
    );
    housing.rotation.copy(rotation);
    group.add(housing);
    const energy = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube * 0.32, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0xff3524,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
      }),
    );
    energy.rotation.copy(rotation);
    group.add(energy);
  });

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.1), metal);
    plate.position.set(
      Math.cos(angle) * 0.56,
      0.72 + random() * 0.04,
      Math.sin(angle) * 0.56,
    );
    plate.rotation.y = -angle;
    plate.rotation.z = (random() - 0.5) * 0.14;
    group.add(plate);
  }

  [-0.3, 0.04, 0.34].forEach((x, index) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.55, 0.03),
      new THREE.Vector3(x + (index - 1) * 0.12, 0.9, 0.08),
      new THREE.Vector3(x + (random() - 0.5) * 0.24, 1.32, -0.02),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.018, 6, false), flare));
  });

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xff351c,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.name = "flare-glow";
  glow.scale.setScalar(2.65);
  group.add(glow);
  return group;
}

function createOriginalHorizonExtractor(
  glowTexture: THREE.Texture,
  metal: THREE.MeshStandardMaterial,
  paleMetal: THREE.MeshStandardMaterial,
) {
  const group = new THREE.Group();
  const housingMaterial = new THREE.MeshStandardMaterial({
    color: 0x171d27,
    metalness: 0.92,
    roughness: 0.25,
  });
  const indicatorMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4e2d,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const boundaryMaterial = new THREE.MeshBasicMaterial({
    color: 0x9fdcff,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.66, 1.42, 20),
    housingMaterial,
  );
  body.position.x = 0.52;
  body.rotation.z = Math.PI / 2;
  group.add(body);

  [-0.16, 0.28, 0.78, 1.2].forEach((x, index) => {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(
        index === 0 ? 0.57 : 0.62,
        index === 0 ? 0.09 : 0.055,
        10,
        48,
      ),
      index === 0 ? paleMetal : metal,
    );
    collar.position.x = x;
    collar.rotation.y = Math.PI / 2;
    group.add(collar);
  });

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const module = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.2, 0.28),
      housingMaterial,
    );
    module.position.set(
      0.56 + (index % 2) * 0.38,
      Math.cos(angle) * 0.59,
      Math.sin(angle) * 0.59,
    );
    module.rotation.x = angle;
    group.add(module);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.06), indicatorMaterial);
    slit.position.set(module.position.x - 0.1, module.position.y * 1.05, module.position.z * 1.05);
    slit.rotation.x = angle;
    group.add(slit);
  }

  const probe = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 1.05, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0xcfeeff,
      emissive: 0x438fba,
      emissiveIntensity: 0.72,
      metalness: 0.12,
      roughness: 0.08,
      transmission: 0.28,
      transparent: true,
      opacity: 0.88,
    }),
  );
  probe.position.x = -0.66;
  probe.rotation.z = Math.PI / 2;
  group.add(probe);

  const horizonShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.075, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x000002,
      metalness: 0.84,
      roughness: 0.035,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    }),
  );
  horizonShell.name = "abyss-core";
  horizonShell.position.x = -1.24;
  horizonShell.rotation.z = Math.PI / 2;
  group.add(horizonShell);

  const eventHorizon = new THREE.Mesh(
    new THREE.TorusGeometry(0.37, 0.022, 8, 72),
    boundaryMaterial,
  );
  eventHorizon.name = "event-horizon";
  eventHorizon.position.x = -1.29;
  eventHorizon.rotation.y = Math.PI / 2;
  group.add(eventHorizon);

  const hotBoundary = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.012, 8, 72),
    indicatorMaterial,
  );
  hotBoundary.position.x = -1.27;
  hotBoundary.rotation.y = Math.PI / 2;
  hotBoundary.rotation.z = 0.34;
  group.add(hotBoundary);

  const beam = addCylinderBetween(
    group,
    new THREE.Vector3(-3.75, 0, 0),
    new THREE.Vector3(-1.28, 0, 0),
    0.016,
    boundaryMaterial,
  );
  beam.name = "extractor-beam";

  const rim = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xa7e1ff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  rim.name = "abyss-rim";
  rim.position.x = -1.38;
  rim.scale.setScalar(1.55);
  group.add(rim);

  group.userData.abyssCores = [horizonShell];
  group.userData.abyssRims = [rim];
  group.userData.eventHorizons = [eventHorizon];
  return group;
}

function createOriginalMagneticBottle(
  paleMetal: THREE.MeshStandardMaterial,
  gold: THREE.MeshStandardMaterial,
) {
  const group = new THREE.Group();
  const rings: THREE.Mesh[] = [];
  // Distinct radial shells keep the moving gimbals clear at every orientation.
  const ringShells = [
    {
      radius: 1.56,
      tube: 0.045,
      rotation: new THREE.Euler(0.16, 0.08, -0.1),
      material: gold,
    },
    {
      radius: 1.76,
      tube: 0.04,
      rotation: new THREE.Euler(0.92, 0.18, 0.48),
      material: paleMetal,
    },
    {
      radius: 1.96,
      tube: 0.035,
      rotation: new THREE.Euler(-0.7, 0.36, -0.4),
      material: gold,
    },
  ];

  ringShells.forEach(({ radius, tube, rotation, material }, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 10, 96),
      material,
    );
    ring.rotation.copy(rotation);
    ring.name = `containment-ring-${index}`;
    ring.userData.baseRotation = ring.rotation.clone();
    for (let clampIndex = 0; clampIndex < 4; clampIndex += 1) {
      const angle = (clampIndex / 4) * Math.PI * 2 + index * 0.28;
      const clamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.08, 0.12),
        index % 2 === 0 ? paleMetal : gold,
      );
      clamp.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      clamp.rotation.z = angle + Math.PI / 2;
      ring.add(clamp);
    }
    rings.push(ring);
    group.add(ring);
  });

  group.userData.rings = rings;
  return group;
}

function createOriginalCausalSparkCoil(copper: THREE.MeshStandardMaterial) {
  const group = new THREE.Group();
  const housingMaterial = new THREE.MeshStandardMaterial({
    color: 0x11151c,
    metalness: 0.9,
    roughness: 0.34,
    emissive: 0x260401,
    emissiveIntensity: 0.22,
  });
  const sparkMaterial = new THREE.MeshBasicMaterial({
    color: 0xff5535,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });

  const outerRail = new THREE.Group();
  const primaryHousing = new THREE.Mesh(
    new THREE.TorusGeometry(2.18, 0.14, 14, 112),
    housingMaterial,
  );
  outerRail.add(primaryHousing);

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const segment = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.16, 0.24),
      index % 6 === 0 ? copper : housingMaterial,
    );
    segment.position.set(Math.cos(angle) * 2.18, Math.sin(angle) * 2.18, 0);
    segment.rotation.z = angle + Math.PI / 2;
    outerRail.add(segment);
  }
  outerRail.rotation.set(0.24, 0.44, -0.18);
  group.add(outerRail);

  const coils: THREE.Mesh[] = [];
  [
    { radius: 1.16, rotation: new THREE.Euler(0.12, 0.42, 0) },
    { radius: 1.31, rotation: new THREE.Euler(0.88, -0.2, 0.4) },
    { radius: 1.46, rotation: new THREE.Euler(-0.72, 0.55, -0.2) },
  ].forEach(({ radius, rotation }, index) => {
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.025, 8, 72),
      index % 2 === 0 ? sparkMaterial : copper,
    );
    coil.rotation.copy(rotation);
    coil.userData.baseRotation = coil.rotation.clone();
    coils.push(coil);
    group.add(coil);
  });

  group.userData.coils = coils;
  group.userData.prongs = [];
  return group;
}

function createIgnitionKernel(
  glowTexture: THREE.Texture,
  metal: THREE.MeshStandardMaterial,
  gold: THREE.MeshStandardMaterial,
  flare: THREE.MeshStandardMaterial,
  profile: AntimatterVisualProfile,
) {
  const group = new THREE.Group();
  const ignitionNetwork = new THREE.Group();
  group.add(ignitionNetwork);
  const random = seededRandom(401);
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x050507,
    metalness: 0.32,
    roughness: 0.9,
    emissive: 0x2a0302,
    emissiveIntensity: profile.armored ? 0.3 : 0.22,
  });

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(
      profile.coreRadius,
      profile.armored ? 40 : 48,
      profile.armored ? 28 : 36,
    ),
    shellMaterial,
  );
  core.name = "flare-core";
  group.add(core);

  if (profile.armored) {
    const breathRim = new THREE.Mesh(
      new THREE.SphereGeometry(profile.coreRadius * 1.016, 40, 28),
      new THREE.MeshBasicMaterial({
        color: 0xa9c2cf,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    breathRim.name = "flare-breath-rim";
    breathRim.visible = false;
    group.add(breathRim);
  }

  const veinTexture = createCoreVeinTexture();
  const veinShell = new THREE.Mesh(
    new THREE.SphereGeometry(
      profile.crackRadius,
      profile.armored ? 48 : 40,
      profile.armored ? 32 : 28,
    ),
    new THREE.MeshBasicMaterial({
      map: veinTexture,
      transparent: true,
      opacity: profile.armored ? 0.98 : 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  veinShell.name = "flare-vein-network";
  veinShell.rotation.y = 0.35;
  group.add(veinShell);
  group.userData.veinTexture = veinTexture;

  const orbitalRings = profile.armored
    ? []
    : [
        { radius: 1.06, tube: 0.055, rotation: new THREE.Euler(0.42, 0.24, -0.28) },
        { radius: 1.12, tube: 0.035, rotation: new THREE.Euler(1.08, -0.38, 0.35) },
      ];
  orbitalRings.forEach(({ radius, tube, rotation }, index) => {
    const housing = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 12, 96),
      index === 0 ? metal : gold,
    );
    housing.rotation.copy(rotation);
    ignitionNetwork.add(housing);

    const energy = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube * 0.32, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0xff3524,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
      }),
    );
    energy.rotation.copy(rotation);
    ignitionNetwork.add(energy);
  });

  const ignitionPlateCount = profile.armored ? 0 : 12;
  for (let index = 0; index < ignitionPlateCount; index += 1) {
    const angle = (index / ignitionPlateCount) * Math.PI * 2;
    const plate = new THREE.Mesh(
      profile.armored
        ? new THREE.BoxGeometry(0.1, 0.16, 0.08)
        : new THREE.BoxGeometry(0.17, 0.3, 0.13),
      metal,
    );
    plate.position.set(
      Math.cos(angle) * (profile.armored ? 0.48 : 0.42),
      (profile.armored ? 0.7 : 0.67) + random() * (profile.armored ? 0.025 : 0.08),
      Math.sin(angle) * (profile.armored ? 0.48 : 0.42),
    );
    plate.rotation.y = -angle;
    plate.rotation.z = (random() - 0.5) * 0.14;
    ignitionNetwork.add(plate);
  }

  if (!profile.armored) {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      addCylinderBetween(
        ignitionNetwork,
        new THREE.Vector3(Math.cos(angle) * 0.82, Math.sin(angle) * 0.82, -0.18),
        new THREE.Vector3(Math.cos(angle) * 1.92, Math.sin(angle) * 1.92, -0.18),
        0.022,
        flare,
      );
    }

    const distributionTrack = new THREE.Mesh(
      new THREE.TorusGeometry(1.66, 0.024, 8, 96),
      flare,
    );
    distributionTrack.position.z = -0.18;
    ignitionNetwork.add(distributionTrack);
  }

  if (!profile.armored) {
    [-0.3, 0.04, 0.34].forEach((x, index) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.55, 0.03),
        new THREE.Vector3(x + (index - 1) * 0.12, 0.9, 0.08),
        new THREE.Vector3(x + (random() - 0.5) * 0.24, 1.32, -0.02),
      ]);
      ignitionNetwork.add(
        new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.018, 6, false), flare),
      );
    });
  }

  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xff351c,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.name = "flare-glow";
  glow.scale.setScalar(2.65);
  group.add(glow);

  registerSubsystemDeployment(group, ignitionNetwork, {
    startScale: new THREE.Vector3(0.12, 0.12, 0.12),
    timing: ANTIMATTER_CINEMATIC_TIMING.deployments.ignitionNetwork,
  });

  return group;
}

function createHorizonExtractor(
  glowTexture: THREE.Texture,
  metal: THREE.MeshStandardMaterial,
  paleMetal: THREE.MeshStandardMaterial,
  gold: THREE.MeshStandardMaterial,
  profile: AntimatterVisualProfile,
) {
  const group = new THREE.Group();
  const housingMaterial = new THREE.MeshStandardMaterial({
    color: profile.armored ? 0x14181e : 0x252d39,
    metalness: 0.94,
    roughness: profile.armored ? 0.26 : 0.2,
  });
  const indicatorMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4e2d,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const boundaryMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd2aa,
    transparent: true,
    opacity: profile.armored ? 0.35 : 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const abyssCores: THREE.Mesh[] = [];
  const abyssRims: THREE.Sprite[] = [];
  const eventHorizons: THREE.Mesh[] = [];

  const createExtractorPod = (direction: -1 | 1) => {
    const pod = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(
        profile.armored ? 0.9 : 0.78,
        profile.armored ? 0.98 : 0.9,
        1.58,
        24,
      ),
      housingMaterial,
    );
    body.rotation.z = Math.PI / 2;
    pod.add(body);

    if (profile.armored) {
      const outerDrum = new THREE.Mesh(
        new THREE.CylinderGeometry(1.08, 0.94, 0.5, 24),
        housingMaterial,
      );
      outerDrum.position.x = direction * 0.63;
      outerDrum.rotation.z = Math.PI / 2;
      pod.add(outerDrum);
    }

    [-0.58, 0, 0.58].forEach((x, index) => {
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(
          profile.armored ? 0.92 - index * 0.045 : 0.82 - index * 0.055,
          index === 1 ? (profile.armored ? 0.12 : 0.11) : profile.armored ? 0.075 : 0.07,
          profile.armored ? 10 : 12,
          profile.armored ? 48 : 56,
        ),
        index === 1 ? (profile.armored ? gold : paleMetal) : metal,
      );
      collar.position.x = x;
      collar.rotation.y = Math.PI / 2;
      pod.add(collar);
    });

    if (profile.armored) {
      [0.48, 0.78].forEach((distance, index) => {
        const outerCollar = new THREE.Mesh(
          new THREE.TorusGeometry(1.01 - index * 0.04, 0.085, 10, 48),
          index === 0 ? metal : gold,
        );
        outerCollar.position.x = direction * distance;
        outerCollar.rotation.y = Math.PI / 2;
        pod.add(outerCollar);
      });
    }

    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const module = new THREE.Mesh(
        new THREE.BoxGeometry(
          profile.armored ? 0.5 : 0.46,
          profile.armored ? 0.25 : 0.22,
          profile.armored ? 0.42 : 0.34,
        ),
        housingMaterial,
      );
      module.position.set(
        (index % 2 === 0 ? -0.28 : 0.28),
        Math.cos(angle) * (profile.armored ? 0.9 : 0.78),
        Math.sin(angle) * (profile.armored ? 0.9 : 0.78),
      );
      module.rotation.x = angle;
      pod.add(module);

      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.02, 0.07), indicatorMaterial);
      slit.position.set(module.position.x, module.position.y * 1.04, module.position.z * 1.04);
      slit.rotation.x = angle;
      pod.add(slit);
    }

    const throat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.7, 0.86, 32, 1, true),
      housingMaterial,
    );
    throat.position.x = -direction * 1.02;
    throat.rotation.z = Math.PI / 2;
    pod.add(throat);

    const horizonShell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.09, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x000002,
        metalness: 0.86,
        roughness: 0.025,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
      }),
    );
    horizonShell.name = "abyss-core";
    horizonShell.position.x = direction * 0.96;
    horizonShell.rotation.z = Math.PI / 2;
    pod.add(horizonShell);
    abyssCores.push(horizonShell);

    const eventHorizon = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.028, 8, 72),
      boundaryMaterial,
    );
    eventHorizon.name = "event-horizon";
    eventHorizon.position.x = direction * 1.02;
    eventHorizon.rotation.y = Math.PI / 2;
    pod.add(eventHorizon);
    eventHorizons.push(eventHorizon);

    const rim = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffb98f,
      transparent: true,
      opacity: profile.armored ? 0.18 : 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    rim.name = "abyss-rim";
    rim.position.x = direction * 1.08;
    rim.scale.setScalar(profile.armored ? 1.08 : 1.52);
    pod.add(rim);
    abyssRims.push(rim);

    if (profile.armored) {
      const apertureGlint = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xdff6ff,
        transparent: true,
        opacity: direction === 1 ? 0.68 : 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      apertureGlint.position.x = direction * 1.13;
      apertureGlint.scale.setScalar(direction === 1 ? 0.075 : 0.045);
      pod.add(apertureGlint);
    }

    return pod;
  };

  const rightPod = createExtractorPod(1);
  if (profile.armored) rightPod.position.x = 0.9;
  group.add(rightPod);

  if (profile.extractorLayout === "mirrored") {
    const leftPod = createExtractorPod(-1);
    leftPod.position.x = profile.armored ? -5.34 : -4.44;
    group.add(leftPod);
    registerSubsystemDeployment(group, leftPod, {
      startPosition: new THREE.Vector3(0, 0, 0),
      startScale: new THREE.Vector3(0.2, 0.2, 0.2),
      startRotation: new THREE.Euler(0, Math.PI, 0),
      timing: ANTIMATTER_CINEMATIC_TIMING.deployments.horizonMirror,
    });

    if (!profile.armored) {
      const axialSpine = new THREE.Group();
      axialSpine.position.x = -2.22;
      [
        { y: -0.58, z: -0.56 },
        { y: 0.58, z: -0.56 },
      ].forEach(({ y, z }) => {
        addCylinderBetween(
          axialSpine,
          new THREE.Vector3(-1.72, y, z),
          new THREE.Vector3(1.72, y, z),
          0.085,
          metal,
        );
      });
      [-1.58, 1.58].forEach((x) => {
        const coupler = new THREE.Mesh(
          new THREE.CylinderGeometry(0.58, 0.35, 0.72, 28, 1, true),
          housingMaterial,
        );
        coupler.position.x = x;
        coupler.rotation.z = Math.PI / 2;
        axialSpine.add(coupler);
      });
      group.add(axialSpine);
      registerSubsystemDeployment(group, axialSpine, {
        startScale: new THREE.Vector3(0.03, 0.2, 0.2),
        timing: ANTIMATTER_CINEMATIC_TIMING.deployments.horizonSpine,
      });
    }
  }

  group.userData.abyssCores = abyssCores;
  group.userData.abyssRims = abyssRims;
  group.userData.eventHorizons = eventHorizons;

  return group;
}

function createMagneticBottle(
  paleMetal: THREE.MeshStandardMaterial,
  gold: THREE.MeshStandardMaterial,
  profile: AntimatterVisualProfile,
) {
  const group = new THREE.Group();
  const deployedCage = new THREE.Group();
  group.add(deployedCage);
  const rings: THREE.Mesh[] = [];
  const seamMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd4a1,
    emissive: 0xff5a22,
    emissiveIntensity: 1.7,
    transparent: true,
    opacity: 0.78,
    roughness: 0.18,
  });
  const pairedRingGrooveMaterial = new THREE.MeshStandardMaterial({
    color: 0x211d18,
    metalness: 0.86,
    roughness: 0.3,
    emissive: 0x2a1205,
    emissiveIntensity: 0.12,
  });

  const cageRotations = [
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(Math.PI / 2, 0, 0),
    new THREE.Euler(0, Math.PI / 2, 0),
    new THREE.Euler(0.72, 0.5, 0.18),
    new THREE.Euler(-0.68, 0.42, -0.26),
    new THREE.Euler(0.28, -0.82, 0.34),
  ];
  const cageDefinitions = profile.armored
    ? [
        {
          radius: 1.22,
          tube: 0.055,
          rotation: new THREE.Euler(0.72, 0.18, 0.78),
          material: gold,
          spinSpeed: -1.84,
        },
        {
          radius: 1.41,
          tube: 0.05,
          rotation: new THREE.Euler(-0.58, 0.38, -0.42),
          material: gold,
          spinSpeed: 2.05,
        },
      ]
    : cageRotations.map((rotation, index) => ({
        radius: 1.18,
        tube: index >= 3 ? 0.035 : 0.075,
        rotation,
        material: index >= 3
          ? seamMaterial
          : index % 2 === 0 ? paleMetal : gold,
        spinSpeed: 0,
      }));

  cageDefinitions.forEach(
    ({ radius, tube, rotation, material, spinSpeed }, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 12, profile.armored ? 80 : 96),
        material,
      );
      ring.rotation.copy(rotation);
      ring.userData.baseRotation = ring.rotation.clone();
      ring.userData.baseQuaternion = ring.quaternion.clone();
      ring.userData.spinSpeed = spinSpeed;
      ring.userData.revealAt = profile.armored
        ? ANTIMATTER_CINEMATIC_TIMING.parts.magneticBottle.locksAt + index * 0.08
        : 0;
      ring.name = `containment-ring-${index}`;

      if (profile.armored) {
        const inlay = new THREE.Mesh(
          new THREE.TorusGeometry(radius + tube * 0.65, 0.012, 6, 80),
          seamMaterial,
        );
        ring.add(inlay);

        [-1, 1].forEach((direction) => {
          const pivot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.065, 0.075, 0.14, 12),
            index % 2 === 0 ? paleMetal : gold,
          );
          pivot.position.x = direction * radius;
          pivot.rotation.z = Math.PI / 2;
          ring.add(pivot);
        });
      }

      rings.push(ring);
      (index === 0 ? group : deployedCage).add(ring);
    },
  );

  if (profile.armored) {
    const stationaryCradle = new THREE.Group();
    stationaryCradle.name = "stationary-containment-cradle";

    const xyRing = createLayeredContainmentRing(
      "xy-containment-ring",
      paleMetal,
      gold,
      pairedRingGrooveMaterial,
    );
    const xzRing = createLayeredContainmentRing(
      "xz-containment-ring",
      paleMetal,
      gold,
      pairedRingGrooveMaterial,
    );
    xzRing.rotation.x = Math.PI / 2;
    const yzRing = createLayeredContainmentRing(
      "yz-containment-ring",
      paleMetal,
      gold,
      pairedRingGrooveMaterial,
    );
    yzRing.rotation.y = Math.PI / 2;
    stationaryCradle.add(xyRing, xzRing, yzRing);

    const junctionGeometry = new THREE.BoxGeometry(0.28, 0.34, 0.38);
    [
      { position: new THREE.Vector3(1.665, 0, 0), rotation: new THREE.Euler() },
      { position: new THREE.Vector3(-1.665, 0, 0), rotation: new THREE.Euler() },
      {
        position: new THREE.Vector3(0, 1.665, 0),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
      },
      {
        position: new THREE.Vector3(0, -1.665, 0),
        rotation: new THREE.Euler(0, 0, Math.PI / 2),
      },
      {
        position: new THREE.Vector3(0, 0, 1.665),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
      },
      {
        position: new THREE.Vector3(0, 0, -1.665),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
      },
    ].forEach(({ position, rotation }, index) => {
      const junction = new THREE.Mesh(junctionGeometry, gold);
      junction.name = `containment-ring-junction-${index}`;
      junction.position.copy(position);
      junction.rotation.copy(rotation);
      stationaryCradle.add(junction);
    });

    deployedCage.add(stationaryCradle);
  }

  if (!profile.armored) {
    addCylinderBetween(
      deployedCage,
      new THREE.Vector3(-1.32, 0, 0),
      new THREE.Vector3(1.32, 0, 0),
      0.075,
      paleMetal,
    );
    addCylinderBetween(
      deployedCage,
      new THREE.Vector3(0, -1.32, 0),
      new THREE.Vector3(0, 1.32, 0),
      0.055,
      gold,
    );

    [
      new THREE.Vector3(-1.28, 0, 0),
      new THREE.Vector3(1.28, 0, 0),
      new THREE.Vector3(0, -1.28, 0),
      new THREE.Vector3(0, 1.28, 0),
    ].forEach((position, index) => {
      const lock = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.42),
        gold,
      );
      lock.position.copy(position);
      lock.rotation.z = index > 1 ? Math.PI / 2 : 0;
      deployedCage.add(lock);
    });
  }

  group.userData.rings = rings;
  registerSubsystemDeployment(group, deployedCage, {
    startScale: new THREE.Vector3(0.2, 0.2, 0.2),
    startRotation: new THREE.Euler(0.7, -0.45, 0.5),
    timing: ANTIMATTER_CINEMATIC_TIMING.deployments.magneticCage,
  });
  return group;
}

function createCausalSparkCoil(
  metal: THREE.MeshStandardMaterial,
  copper: THREE.MeshStandardMaterial,
  profile: AntimatterVisualProfile,
) {
  const group = new THREE.Group();
  const deployedCircumference = new THREE.Group();
  group.add(deployedCircumference);
  const outerRadius = profile.armored ? 2.3 : 2.18;
  const housingMaterial = new THREE.MeshStandardMaterial({
    color: profile.armored ? 0x13171d : 0x4a515d,
    metalness: 0.9,
    roughness: profile.armored ? 0.28 : 0.23,
    emissive: 0x210301,
    emissiveIntensity: 0.22,
  });
  const sparkMaterial = new THREE.MeshBasicMaterial({
    color: 0xff5535,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });

  const primaryHousing = new THREE.Mesh(
    new THREE.TorusGeometry(
      outerRadius,
      profile.armored ? 0.32 : 0.28,
      profile.armored ? 12 : 16,
      profile.armored ? 80 : 112,
    ),
    housingMaterial,
  );
  primaryHousing.name = "outer-sequencing-ring";
  deployedCircumference.add(primaryHousing);

  const secondaryHousing = new THREE.Mesh(
    new THREE.TorusGeometry(
      profile.armored ? 1.93 : 1.84,
      profile.armored ? 0.14 : 0.12,
      profile.armored ? 10 : 12,
      profile.armored ? 72 : 96,
    ),
    metal,
  );
  deployedCircumference.add(secondaryHousing);

  [-0.36, 0.36].forEach((z) => {
    const depthRail = new THREE.Mesh(
      new THREE.TorusGeometry(
        outerRadius,
        profile.armored ? 0.12 : 0.11,
        10,
        profile.armored ? 72 : 96,
      ),
      metal,
    );
    depthRail.position.z = z;
    deployedCircumference.add(depthRail);
  });

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(
        profile.armored ? 0.44 : 0.34,
        profile.armored ? 0.78 : 0.7,
        profile.armored ? 0.92 : 0.86,
      ),
      profile.armored && index % 3 === 0 ? metal : housingMaterial,
    );
    bridge.position.set(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius, 0);
    bridge.rotation.z = angle;
    deployedCircumference.add(bridge);

    const faceplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.42, 0.055),
      profile.armored
        ? index % 3 === 0 ? copper : housingMaterial
        : index % 3 === 0 ? copper : metal,
    );
    faceplate.position.set(
      Math.cos(angle) * outerRadius,
      Math.sin(angle) * outerRadius,
      0.47,
    );
    faceplate.rotation.z = angle;
    deployedCircumference.add(faceplate);
  }

  const energyTrack = new THREE.Mesh(
    new THREE.TorusGeometry(
      outerRadius,
      profile.armored ? 0.072 : 0.052,
      8,
      profile.armored ? 80 : 112,
    ),
    sparkMaterial,
  );
  energyTrack.position.z = profile.armored ? 0.41 : 0.31;
  deployedCircumference.add(energyTrack);

  const rearEnergyTrack = energyTrack.clone();
  rearEnergyTrack.position.z = profile.armored ? -0.41 : -0.31;
  deployedCircumference.add(rearEnergyTrack);

  if (profile.armored) {
    [-0.24, 0.24].forEach((z) => {
      const innerEnergyTrack = new THREE.Mesh(
        new THREE.TorusGeometry(2.08, 0.035, 6, 80),
        sparkMaterial,
      );
      innerEnergyTrack.position.z = z;
      deployedCircumference.add(innerEnergyTrack);
    });

    addCylinderBetween(
      deployedCircumference,
      new THREE.Vector3(-2.45, 0, 0.52),
      new THREE.Vector3(-1.72, 0, 0.52),
      0.095,
      metal,
    );
    addCylinderBetween(
      deployedCircumference,
      new THREE.Vector3(1.72, 0, 0.52),
      new THREE.Vector3(2.45, 0, 0.52),
      0.095,
      metal,
    );

    const axisCouplerGeometry = new THREE.TorusGeometry(0.18, 0.052, 8, 20);
    [-2.05, 2.05].forEach((position) => {
      const horizontalCoupler = new THREE.Mesh(axisCouplerGeometry, copper);
      horizontalCoupler.position.set(position, 0, 0.52);
      horizontalCoupler.rotation.y = Math.PI / 2;
      deployedCircumference.add(horizontalCoupler);
    });

    const meridianRadius = 2.44;
    const armatureSegmentCount = 10;
    const armatureSegmentArc = (Math.PI * 2 / armatureSegmentCount) * 0.72;
    const armatureSegmentGeometry = new THREE.TorusGeometry(
      meridianRadius,
      0.19,
      8,
      10,
      armatureSegmentArc,
    );
    const meridianRotation = new THREE.Euler(0, Math.PI / 2, 0);
    const armatureSegments = new THREE.InstancedMesh(
      armatureSegmentGeometry,
      housingMaterial,
      armatureSegmentCount,
    );
    const armatureTransform = new THREE.Object3D();
    const meridianQuaternion = new THREE.Quaternion().setFromEuler(meridianRotation);
    for (let segmentIndex = 0; segmentIndex < armatureSegmentCount; segmentIndex += 1) {
      const angle = (segmentIndex / armatureSegmentCount) * Math.PI * 2;
      armatureTransform.quaternion.copy(meridianQuaternion).multiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, angle - armatureSegmentArc / 2),
        ),
      );
      armatureTransform.updateMatrix();
      armatureSegments.setMatrixAt(segmentIndex, armatureTransform.matrix);
    }
    armatureSegments.instanceMatrix.needsUpdate = true;
    deployedCircumference.add(armatureSegments);

    const meridianBackbone = new THREE.Mesh(
      new THREE.TorusGeometry(meridianRadius, 0.075, 8, 80),
      metal,
    );
    meridianBackbone.rotation.copy(meridianRotation);
    deployedCircumference.add(meridianBackbone);

    const meridianNormal = new THREE.Vector3(0, 0, 1).applyEuler(meridianRotation);
    [-0.17, 0.17].forEach((offset) => {
      const channel = new THREE.Mesh(
        new THREE.TorusGeometry(meridianRadius, 0.026, 6, 80),
        sparkMaterial,
      );
      channel.position.copy(meridianNormal).multiplyScalar(offset);
      channel.rotation.copy(meridianRotation);
      deployedCircumference.add(channel);
    });

    const meridianLocks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.5, 0.52, 0.76),
      housingMaterial,
      2,
    );
    const meridianLockInlays = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.12, 0.58, 0.055),
      copper,
      2,
    );
    const lockTransform = new THREE.Object3D();
    [-1, 1].forEach((direction, index) => {
      lockTransform.position.set(0, direction * 2.3, 0);
      lockTransform.rotation.set(0, 0, 0);
      lockTransform.updateMatrix();
      meridianLocks.setMatrixAt(index, lockTransform.matrix);

      lockTransform.position.z = 0.405;
      lockTransform.updateMatrix();
      meridianLockInlays.setMatrixAt(index, lockTransform.matrix);
    });
    meridianLocks.instanceMatrix.needsUpdate = true;
    meridianLockInlays.instanceMatrix.needsUpdate = true;
    deployedCircumference.add(meridianLocks, meridianLockInlays);
  }

  const armorSegmentCount = 16;
  const armorSegmentArc =
    (Math.PI * 2 / armorSegmentCount) * (profile.armored ? 0.68 : 0.74);
  for (let index = 0; index < armorSegmentCount; index += 1) {
    const angle = (index / armorSegmentCount) * Math.PI * 2;
    const segment = new THREE.Mesh(
      new THREE.TorusGeometry(
        outerRadius,
        profile.armored ? 0.48 : 0.34,
        profile.armored ? 10 : 12,
        8,
        armorSegmentArc,
      ),
      index % 4 === 0 ? metal : housingMaterial,
    );
    segment.rotation.z = angle - armorSegmentArc / 2;
    deployedCircumference.add(segment);

    if (index % 2 === 0) {
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.58), copper);
      latch.position.set(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius, 0);
      latch.rotation.z = angle;
      deployedCircumference.add(latch);
    }
  }

  const coils: THREE.Mesh[] = [];
  const coilDefinitions = profile.armored
    ? [
        {
          radius: 0.96,
          tube: 0.018,
          rotation: new THREE.Euler(0.34, -0.3, 0.15),
          material: sparkMaterial,
          spinSpeed: -2.5,
        },
        {
          radius: 1.07,
          tube: 0.016,
          rotation: new THREE.Euler(-0.52, 0.46, -0.28),
          material: sparkMaterial,
          spinSpeed: 2.11,
        },
      ]
    : [
        {
          radius: 1.42,
          tube: 0.026,
          rotation: new THREE.Euler(0.58, 0.2, 0.08),
          material: sparkMaterial,
          spinSpeed: 0,
        },
        {
          radius: 1.465,
          tube: 0.026,
          rotation: new THREE.Euler(-0.46, 0.52, -0.1),
          material: copper,
          spinSpeed: 0,
        },
        {
          radius: 1.51,
          tube: 0.026,
          rotation: new THREE.Euler(0.34, -0.62, 0.2),
          material: sparkMaterial,
          spinSpeed: 0,
        },
      ];
  coilDefinitions.forEach(
    ({ radius, tube, rotation, material, spinSpeed }, index) => {
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 72),
      material,
    );
    coil.rotation.copy(rotation);
    coil.userData.baseRotation = coil.rotation.clone();
    coil.userData.baseQuaternion = coil.quaternion.clone();
    coil.userData.spinSpeed = spinSpeed;

    if (profile.armored) {
      [-1, 1].forEach((direction) => {
        const pivot = new THREE.Mesh(
          new THREE.SphereGeometry(index === 0 ? 0.04 : 0.03, 12, 8),
          copper,
        );
        pivot.position.x = direction * radius;
        coil.add(pivot);
      });
    }

    coils.push(coil);
    (profile.armored || index === 0 ? group : deployedCircumference).add(coil);
    },
  );

  const braceBodyGeometry = profile.armored
    ? new THREE.CylinderGeometry(0.17, 0.2, 0.7, 12)
    : new THREE.BoxGeometry(0.38, 0.92, 0.48);
  const braceClampGeometry = profile.armored
    ? new THREE.CylinderGeometry(0.29, 0.27, 0.18, 12)
    : new THREE.BoxGeometry(0.56, 0.22, 0.58);
  const braceBandGeometry = profile.armored
    ? new THREE.TorusGeometry(0.235, 0.038, 8, 18)
    : null;
  const braceSeamGeometry = new THREE.BoxGeometry(
    profile.armored ? 0.065 : 0.08,
    profile.armored ? 0.5 : 0.7,
    profile.armored ? 0.42 : 0.5,
  );
  const prongs = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => {
    const pylon = new THREE.Group();
    const pylonRadius = profile.armored ? 2.12 : 1.72;
    pylon.position.set(
      Math.cos(angle) * pylonRadius,
      Math.sin(angle) * pylonRadius,
      profile.armored ? 0.34 : 0,
    );
    pylon.rotation.z = angle - Math.PI / 2;

    const body = new THREE.Mesh(braceBodyGeometry, housingMaterial);
    pylon.add(body);

    (profile.armored ? [-0.24, 0.24] : [-0.3]).forEach((y) => {
      const clamp = new THREE.Mesh(
        braceClampGeometry,
        profile.armored ? housingMaterial : metal,
      );
      clamp.position.y = y;
      pylon.add(clamp);
    });

    if (braceBandGeometry) {
      [-0.23, 0.23].forEach((y) => {
        const band = new THREE.Mesh(braceBandGeometry, copper);
        band.position.y = y;
        band.rotation.x = Math.PI / 2;
        pylon.add(band);
      });
    }

    const liveSeam = new THREE.Mesh(braceSeamGeometry, sparkMaterial);
    liveSeam.position.z = 0.02;
    pylon.add(liveSeam);
    deployedCircumference.add(pylon);
    return pylon;
  });

  group.userData.coils = coils;
  group.userData.prongs = prongs;
  registerSubsystemDeployment(group, deployedCircumference, {
    startScale: new THREE.Vector3(0.16, 0.16, 0.16),
    startRotation: new THREE.Euler(0.55, 0.35, -0.7),
    timing: ANTIMATTER_CINEMATIC_TIMING.deployments.causalCircumference,
  });
  return group;
}

function createAssemblyPart(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  startEuler: THREE.Euler,
  entersAt: number,
  locksAt: number,
): AssemblyPart {
  const startRotation = new THREE.Quaternion().setFromEuler(startEuler);
  const endRotation = new THREE.Quaternion();
  group.position.copy(start);
  group.quaternion.copy(startRotation);
  group.scale.setScalar(0.82);

  return {
    group,
    start,
    end,
    startRotation,
    endRotation,
    entersAt,
    locksAt,
  };
}

export interface AntimatterManifestationAnimationProps {
  variant?: AntimatterVisualVariant;
  runtime?: boolean;
  reducedMotion?: boolean;
  onComplete?: () => void;
}

export function AntimatterManifestationAnimation({
  variant,
  runtime = false,
  reducedMotion,
  onComplete,
}: AntimatterManifestationAnimationProps) {
  const [, navigate] = useLocation();
  const captureMode =
    !runtime &&
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("capture") === "1";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<AntimatterCinematicPhase>("RECOVERY");
  const restartRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  const modelViewControllerRef = useRef<BlueprintModelViewController | null>(null);
  const [phase, setPhase] = useState<AntimatterCinematicPhase>("RECOVERY");
  const [muted, setMuted] = useState(() => gameAudio.isMuted());
  const [renderError, setRenderError] = useState(false);
  const [visualVariant, setVisualVariant] = useState<AntimatterVisualVariant>(
    () => variant ?? getInitialVisualVariant(),
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (variant) setVisualVariant(variant);
  }, [variant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const profile = ANTIMATTER_VISUAL_PROFILES[visualVariant];

    setRenderError(false);
    setPhase("RECOVERY");
    phaseRef.current = "RECOVERY";

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      });
    } catch (error) {
      console.error("Unable to initialize the antimatter cinematic", error);
      setRenderError(true);
      const fallbackTimer = window.setTimeout(() => onCompleteRef.current?.(), 350);
      return () => window.clearTimeout(fallbackTimer);
    }

    renderer.setClearColor(0x010207, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010207);
    scene.fog = new THREE.FogExp2(0x010207, 0.028);

    let environmentTarget: THREE.WebGLRenderTarget | null = null;
    if (profile.useReflectionEnvironment) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      environmentTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.035);
      scene.environment = environmentTarget.texture;
      pmremGenerator.dispose();
    }

    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 90);
    camera.position.set(profile.cameraTargetX, 0.25, 14.8);

    const random = seededRandom(1719);
    const glowTexture = createGlowTexture();
    const textureLoader = new THREE.TextureLoader();
    const artifactTextures = [
      ignitionKernelArtwork,
      magneticBottleArtwork,
      causalSparkCoilArtwork,
      horizonExtractorArtwork,
    ].map((source) => {
      const texture = textureLoader.load(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      return texture;
    });
    const stars = createStars(random);
    scene.add(stars);

    const assemblyDust = createAssemblyDust(random);
    scene.add(assemblyDust);

    const ambientLight = new THREE.HemisphereLight(
      profile.armored ? 0x8fb4d7 : 0x7aa2ce,
      0x17070a,
      profile.lighting.ambient,
    );
    scene.add(ambientLight);

    const redLight = new THREE.PointLight(0xff3a0a, 26, 13, 2);
    redLight.position.set(-3.4, 1.2, 2.4);
    scene.add(redLight);

    const blueLight = new THREE.PointLight(0x75c7ff, 21, 12, 2);
    blueLight.position.set(3.2, -0.8, 2.4);
    scene.add(blueLight);

    const goldLight = new THREE.PointLight(0xffc86a, 11, 10, 2);
    goldLight.position.set(0, 3.2, 2.6);
    scene.add(goldLight);

    const inspectionLight = new THREE.DirectionalLight(
      0xffe8d0,
      profile.lighting.inspection,
    );
    inspectionLight.position.set(-2.2, 3.6, 7.5);
    scene.add(inspectionLight);

    const armorRimLight = new THREE.DirectionalLight(
      profile.armored ? 0x78b9ef : 0x6fa9df,
      profile.lighting.rim,
    );
    armorRimLight.position.set(4.5, -1.2, -3.5);
    scene.add(armorRimLight);

    const annihilationLight = new THREE.PointLight(0xffffff, 0, 18, 1.6);
    annihilationLight.position.set(profile.eventCenterX, 0, 1.1);
    scene.add(annihilationLight);

    const metal = new THREE.MeshStandardMaterial({
      color: profile.materials.metal.color,
      metalness: 0.94,
      roughness: profile.materials.metal.roughness,
    });
    const paleMetal = new THREE.MeshStandardMaterial({
      color: profile.materials.paleMetal.color,
      metalness: profile.materials.paleMetal.metalness,
      roughness: profile.materials.paleMetal.roughness,
      emissive: profile.materials.paleMetal.emissive,
      emissiveIntensity: profile.materials.paleMetal.emissiveIntensity,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: profile.materials.gold.color,
      metalness: 0.88,
      roughness: profile.materials.gold.roughness,
      emissive: 0x5b2704,
      emissiveIntensity: 0.45,
    });
    const copper = new THREE.MeshStandardMaterial({
      color: 0xb5532e,
      metalness: 0.84,
      roughness: 0.25,
      emissive: 0x6d1607,
      emissiveIntensity: 0.6,
    });
    const flare = new THREE.MeshStandardMaterial({
      color: 0xff6c2e,
      emissive: 0xff2700,
      emissiveIntensity: 3.1,
      roughness: 0.28,
      metalness: 0.18,
    });
    const deviceRoot = new THREE.Group();
    deviceRoot.rotation.x = profile.rootPitch;
    scene.add(deviceRoot);

    let ignitionKernel: THREE.Group;
    let magneticBottle: THREE.Group;
    let causalSparkCoil: THREE.Group;
    let horizonExtractor: THREE.Group;
    let parts: AssemblyPart[];

    if (profile.model === "original") {
      ignitionKernel = createOriginalIgnitionKernel(glowTexture, metal, gold, flare);
      magneticBottle = createOriginalMagneticBottle(paleMetal, gold);
      causalSparkCoil = createOriginalCausalSparkCoil(copper);
      horizonExtractor = createOriginalHorizonExtractor(glowTexture, metal, paleMetal);

      attachArtifactScan(ignitionKernel, artifactTextures[0], 0xff4f32, 0.94);
      attachArtifactScan(magneticBottle, artifactTextures[1], 0xffd26f, 1.02);
      attachArtifactScan(causalSparkCoil, artifactTextures[2], 0xff5b38, 1.02);
      attachArtifactScan(horizonExtractor, artifactTextures[3], 0x94dcff, 0.96);
      deviceRoot.add(ignitionKernel, magneticBottle, causalSparkCoil, horizonExtractor);

      parts = [
        createAssemblyPart(
          ignitionKernel,
          new THREE.Vector3(-6.4, 2.35, -2.2),
          new THREE.Vector3(-0.46, 0, 0),
          new THREE.Euler(0.9, -0.5, -1.2),
          ANTIMATTER_CINEMATIC_TIMING.parts.ignitionKernel.entersAt,
          ANTIMATTER_CINEMATIC_TIMING.parts.ignitionKernel.locksAt,
        ),
        createAssemblyPart(
          magneticBottle,
          new THREE.Vector3(0.3, 6.25, -2.6),
          new THREE.Vector3(-0.46, 0, 0),
          new THREE.Euler(1.2, 0.75, -0.6),
          ANTIMATTER_CINEMATIC_TIMING.parts.magneticBottle.entersAt,
          ANTIMATTER_CINEMATIC_TIMING.parts.magneticBottle.locksAt,
        ),
        createAssemblyPart(
          causalSparkCoil,
          new THREE.Vector3(-1.5, -5.8, 1.6),
          new THREE.Vector3(-0.46, 0, 0),
          new THREE.Euler(0.8, -0.9, 0.45),
          ANTIMATTER_CINEMATIC_TIMING.parts.causalSparkCoil.entersAt,
          ANTIMATTER_CINEMATIC_TIMING.parts.causalSparkCoil.locksAt,
        ),
        createAssemblyPart(
          horizonExtractor,
          new THREE.Vector3(7.1, -1.45, -1.8),
          new THREE.Vector3(3.55, 0, 0),
          new THREE.Euler(-0.7, 0.8, 1.05),
          ANTIMATTER_CINEMATIC_TIMING.parts.horizonExtractor.entersAt,
          ANTIMATTER_CINEMATIC_TIMING.parts.horizonExtractor.locksAt,
        ),
      ];
    } else {
      ignitionKernel = createIgnitionKernel(glowTexture, metal, gold, flare, profile);
      magneticBottle = createMagneticBottle(paleMetal, gold, profile);
      causalSparkCoil = createCausalSparkCoil(metal, copper, profile);
      horizonExtractor = createHorizonExtractor(
        glowTexture,
        metal,
        paleMetal,
        gold,
        profile,
      );

      attachArtifactScan(ignitionKernel, artifactTextures[0], 0xff4f32, 0.94);
      attachArtifactScan(magneticBottle, artifactTextures[1], 0xffd26f, 1.02);
      attachArtifactScan(causalSparkCoil, artifactTextures[2], 0xff5b38, 1.02);
      attachArtifactScan(horizonExtractor, artifactTextures[3], 0x94dcff, 0.96);
      deviceRoot.add(ignitionKernel, magneticBottle, causalSparkCoil, horizonExtractor);

      parts = [
        createAssemblyPart(
          ignitionKernel,
          new THREE.Vector3(-3.6, 1.75, -1.3),
          new THREE.Vector3(-0.46, 0, 0),
          new THREE.Euler(0.9, -0.5, -1.2),
          ANTIMATTER_CINEMATIC_TIMING.parts.ignitionKernel.entersAt,
          ANTIMATTER_CINEMATIC_TIMING.parts.ignitionKernel.locksAt,
        ),
        createAssemblyPart(
          magneticBottle,
          new THREE.Vector3(0.2, 3.45, -1.6),
          new THREE.Vector3(-0.46, 0, 0),
          new THREE.Euler(1.2, 0.75, -0.6),
          ANTIMATTER_CINEMATIC_TIMING.parts.magneticBottle.entersAt,
          ANTIMATTER_CINEMATIC_TIMING.parts.magneticBottle.locksAt,
        ),
        createAssemblyPart(
          causalSparkCoil,
          new THREE.Vector3(-1.2, -3.35, 1.2),
          new THREE.Vector3(-0.46, 0, 0),
          new THREE.Euler(0.8, -0.9, 0.45),
          ANTIMATTER_CINEMATIC_TIMING.parts.causalSparkCoil.entersAt,
          ANTIMATTER_CINEMATIC_TIMING.parts.causalSparkCoil.locksAt,
        ),
        createAssemblyPart(
          horizonExtractor,
          new THREE.Vector3(3.65, -1.25, -1.2),
          new THREE.Vector3(1.76, 0, 0),
          new THREE.Euler(-0.7, 0.8, 1.05),
          ANTIMATTER_CINEMATIC_TIMING.parts.horizonExtractor.entersAt,
          ANTIMATTER_CINEMATIC_TIMING.parts.horizonExtractor.locksAt,
        ),
      ];
    }

    const guideLines = parts.map((part, index) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([part.start, part.end]);
      const material = new THREE.LineBasicMaterial({
        color:
          index === 0 ? 0xff6a2c : index === 1 ? 0xf2c56f : index === 2 ? 0xff5432 : 0x7ecbff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      return line;
    });

    const annihilationMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const annihilationPoint = new THREE.Sprite(annihilationMaterial);
    annihilationPoint.scale.setScalar(0.25);
    annihilationPoint.position.set(profile.eventCenterX, 0, 0.08);
    deviceRoot.add(annihilationPoint);

    const implosionWaves: ImplosionWave[] = ANTIMATTER_CINEMATIC_TIMING.implosionWaves.map((startsAt, index) => {
      const waveMaterial = new THREE.MeshBasicMaterial({
        color: index === 1 ? 0xffb759 : 0xd5efff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.018, 8, 96),
        waveMaterial,
      );
      mesh.position.set(profile.eventCenterX, 0, 0.16);
      deviceRoot.add(mesh);
      return { mesh, startsAt };
    });

    const aftershockMaterial = new THREE.MeshBasicMaterial({
      color: 0xd5efff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const aftershockRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.022, 8, 96),
      aftershockMaterial,
    );
    aftershockRing.position.set(profile.eventCenterX, 0, 0.16);
    aftershockRing.visible = false;
    deviceRoot.add(aftershockRing);

    const flareCore = ignitionKernel.getObjectByName("flare-core") as THREE.Mesh;
    const flareCoreMaterial = flareCore.material as THREE.MeshStandardMaterial;
    const flareBreathRim = ignitionKernel.getObjectByName(
      "flare-breath-rim",
    ) as THREE.Mesh | undefined;
    const flareBreathRimMaterial = flareBreathRim?.material as
      | THREE.MeshBasicMaterial
      | undefined;
    const expandedCoreColor = new THREE.Color(0x050507);
    const contractedCoreColor = new THREE.Color(0x191b20);
    const flareVeinNetwork = ignitionKernel.getObjectByName(
      "flare-vein-network",
    ) as THREE.Mesh | undefined;
    const flareVeinMaterial = flareVeinNetwork?.material as
      | THREE.MeshBasicMaterial
      | undefined;
    const flareGlow = ignitionKernel.getObjectByName("flare-glow") as THREE.Sprite;
    const abyssCores = horizonExtractor.userData.abyssCores as THREE.Mesh[];
    const abyssRims = horizonExtractor.userData.abyssRims as THREE.Sprite[];
    const eventHorizons = horizonExtractor.userData.eventHorizons as THREE.Mesh[];
    const cageRings = magneticBottle.userData.rings as THREE.Mesh[];
    const triggerCoils = causalSparkCoil.userData.coils as THREE.Mesh[];
    const localGimbalAxis = new THREE.Vector3(1, 0, 0);
    const gimbalMotion = new THREE.Quaternion();
    const modelViewController = createBlueprintModelViewController();
    modelViewControllerRef.current = modelViewController;

    const prefersReducedMotion = reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let startedAt = performance.now() - (
      prefersReducedMotion ? ANTIMATTER_CINEMATIC_TIMING.reducedMotionStart : 0
    ) * 1000;
    let animationFrame = 0;
    let completionTimer = 0;
    let frameCount = 0;
    let cameraBaseZ = 14.8;
    let cameraTravel = 3.5;
    let previousFrameAt = performance.now();

    const resize = () => {
      const width = Math.max(root.clientWidth, 1);
      const height = Math.max(root.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      if (camera.aspect < 0.72) {
        cameraBaseZ = profile.armored ? 30 : 28;
        cameraTravel = 3;
      } else if (camera.aspect < 1) {
        cameraBaseZ = 19.2;
        cameraTravel = 3.1;
      } else {
        cameraBaseZ = profile.model === "original" ? 13.8 : 14.8;
        cameraTravel = profile.model === "original" ? 3.7 : 3.5;
      }
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    const restart = () => {
      gameAudio.playAntimatterBlueprintCinematic({ abridged: prefersReducedMotion });
      window.clearTimeout(completionTimer);
      startedAt = performance.now() - (
        prefersReducedMotion ? ANTIMATTER_CINEMATIC_TIMING.reducedMotionStart : 0
      ) * 1000;
      previousFrameAt = performance.now();
      frameCount = 0;
      modelViewController.reset();
      canvas.classList.remove("is-dragging");
      phaseRef.current = "RECOVERY";
      setPhase("RECOVERY");
      root.dataset.phase = "RECOVERY";
      root.dataset.progress = "0.000";
      root.dataset.frameCount = "0";
      if (progressRef.current) progressRef.current.style.transform = "scaleX(0)";
      if (timerRef.current) {
        timerRef.current.textContent = `0.00 / ${ANTIMATTER_CINEMATIC_TIMING.duration.toFixed(2)}`;
      }
      if (flashRef.current) flashRef.current.style.opacity = "0";
      if (revealRef.current) {
        revealRef.current.style.opacity = "0";
        revealRef.current.style.transform = "translate3d(0, 18px, 0)";
      }
      if (onCompleteRef.current) {
        const remainingDuration = runtime
          ? ANTIMATTER_CINEMATIC_TIMING.duration
          : prefersReducedMotion
            ? ANTIMATTER_CINEMATIC_TIMING.duration - ANTIMATTER_CINEMATIC_TIMING.reducedMotionStart
            : ANTIMATTER_CINEMATIC_TIMING.duration;
        completionTimer = window.setTimeout(
          () => onCompleteRef.current?.(),
          Math.max(remainingDuration, 0.2) * 1000,
        );
      }
    };
    restartRef.current = restart;
    restart();

    const dragState: { pointerId: number | null; x: number; y: number } = {
      pointerId: null,
      x: 0,
      y: 0,
    };
    const canInspect = () => phaseRef.current === "MANIFESTED";
    const onPointerDown = (event: PointerEvent) => {
      if (!canInspect() || event.button !== 0) return;
      dragState.pointerId = event.pointerId;
      dragState.x = event.clientX;
      dragState.y = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-dragging");
      canvas.focus({ preventScroll: true });
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragState.pointerId !== event.pointerId) return;
      event.preventDefault();
      const deltaX = event.clientX - dragState.x;
      const deltaY = event.clientY - dragState.y;
      dragState.x = event.clientX;
      dragState.y = event.clientY;
      modelViewController.orbitBy(deltaX * 0.008, deltaY * 0.008);
    };
    const finishPointer = (event: PointerEvent) => {
      if (dragState.pointerId !== event.pointerId) return;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      dragState.pointerId = null;
      canvas.classList.remove("is-dragging");
    };
    const onWheel = (event: WheelEvent) => {
      if (!canInspect()) return;
      event.preventDefault();
      modelViewController.zoomBy(-event.deltaY * 0.0015);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!canInspect()) return;
      let handled = true;
      switch (event.key) {
        case "ArrowLeft":
          modelViewController.orbitBy(-0.14, 0);
          break;
        case "ArrowRight":
          modelViewController.orbitBy(0.14, 0);
          break;
        case "ArrowUp":
          modelViewController.orbitBy(0, -0.12);
          break;
        case "ArrowDown":
          modelViewController.orbitBy(0, 0.12);
          break;
        case "+":
        case "=":
          modelViewController.zoomBy(0.16);
          break;
        case "-":
        case "_":
          modelViewController.zoomBy(-0.16);
          break;
        case "Home":
          modelViewController.reset();
          break;
        default:
          handled = false;
      }
      if (handled) event.preventDefault();
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", finishPointer);
    canvas.addEventListener("pointercancel", finishPointer);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKeyDown);

    const animate = (now: number) => {
      const frameDelta = Math.min((now - previousFrameAt) / 1000, 0.08);
      previousFrameAt = now;
      const modelView = modelViewController.update(frameDelta);
      const elapsed = (now - startedAt) / 1000;
      const cinematicTime = Math.min(elapsed, ANTIMATTER_CINEMATIC_TIMING.duration);
      if (timerRef.current) {
        timerRef.current.textContent = `${cinematicTime.toFixed(2)} / ${ANTIMATTER_CINEMATIC_TIMING.duration.toFixed(2)}`;
      }
      const timelineProgress = clamp01(cinematicTime / ANTIMATTER_CINEMATIC_TIMING.duration);
      const currentPhase = getAntimatterCinematicPhase(cinematicTime);
      frameCount += 1;

      if (currentPhase !== phaseRef.current) {
        phaseRef.current = currentPhase;
        setPhase(currentPhase);
      }

      root.dataset.phase = currentPhase;
      root.dataset.progress = timelineProgress.toFixed(3);
      root.dataset.frameCount = String(frameCount);
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${timelineProgress})`;
      }

      parts.forEach((part, index) => {
        const rawProgress = progressBetween(cinematicTime, part.entersAt, part.locksAt);
        const movementProgress = easeOutBack(rawProgress);
        const rotationProgress = smoothstep(rawProgress);
        part.group.position.lerpVectors(part.start, part.end, movementProgress);
        part.group.quaternion.slerpQuaternions(
          part.startRotation,
          part.endRotation,
          rotationProgress,
        );
        part.group.scale.setScalar(0.82 + smoothstep(rawProgress) * 0.18);

        const deployments = (part.group.userData.deployments ?? []) as SubsystemDeployment[];
        deployments.forEach((deployment) => {
          const deploymentProgress = smoothstep(progressBetween(
            cinematicTime,
            deployment.startsAt,
            deployment.settlesAt,
          ));
          deployment.object.position.lerpVectors(
            deployment.startPosition,
            deployment.endPosition,
            deploymentProgress,
          );
          deployment.object.scale.lerpVectors(
            deployment.startScale,
            deployment.endScale,
            deploymentProgress,
          );
          deployment.object.quaternion.slerpQuaternions(
            deployment.startRotation,
            deployment.endRotation,
            deploymentProgress,
          );
        });

        const artScan = part.group.userData.artScan as
          | THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
          | undefined;
        if (artScan) {
          const scanFade = smoothstep((rawProgress - 0.08) / 0.62);
          const baseScale = artScan.userData.baseScale as number;
          const frame = artScan.userData.frame as
            | THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
            | undefined;
          artScan.visible = rawProgress < 0.78;
          artScan.material.opacity = (1 - scanFade) * 0.9;
          artScan.scale.setScalar(baseScale * (1 + Math.sin(elapsed * 4 + index) * 0.018));
          artScan.quaternion.copy(part.group.quaternion).invert();
          if (frame) frame.material.opacity = (1 - scanFade) * 0.68;
        }

        const guideMaterial = guideLines[index].material as THREE.LineBasicMaterial;
        guideMaterial.opacity = Math.sin(rawProgress * Math.PI) * 0.42;
      });

      const containment = smoothstep(progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.containment.startsAt,
        ANTIMATTER_CINEMATIC_TIMING.containment.stabilizesAt,
      ));
      const ignition = smoothstep(progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.ignition.startsAt,
        ANTIMATTER_CINEMATIC_TIMING.ignition.peaksAt,
      ));
      const implosion = smoothstep(progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.implosion.startsAt,
        ANTIMATTER_CINEMATIC_TIMING.implosion.pinchesAt,
      ));
      const implosionRelease = smoothstep(progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.implosion.pinchesAt,
        ANTIMATTER_CINEMATIC_TIMING.flash.peaksAt,
      ));
      const implosionCompression = implosion * (1 - implosionRelease);
      const cameraRelease = smoothstep(progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.implosion.pinchesAt,
        ANTIMATTER_CINEMATIC_TIMING.flash.endsAt,
      ));
      const cameraPull = implosion * (1 - cameraRelease);
      const reveal = smoothstep(progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.reveal.startsAt,
        ANTIMATTER_CINEMATIC_TIMING.reveal.completesAt,
      ));
      const flashProgress = progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.flash.startsAt,
        ANTIMATTER_CINEMATIC_TIMING.flash.endsAt,
      );
      const flash = Math.pow(Math.sin(flashProgress * Math.PI), 3);
      const aftershockProgress = progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.aftershock.startsAt,
        ANTIMATTER_CINEMATIC_TIMING.aftershock.endsAt,
      );
      const aftershockEnvelope = Math.sin(aftershockProgress * Math.PI);
      const veinConsumption = profile.armored
        ? smoothstep(progressBetween(
            cinematicTime,
            ANTIMATTER_CINEMATIC_TIMING.flash.startsAt,
            ANTIMATTER_CINEMATIC_TIMING.flash.endsAt,
          ))
        : 0;
      const livingTime = Math.max(
        elapsed - ANTIMATTER_CINEMATIC_TIMING.livingDeviceStartsAt,
        0,
      );
      const mechanicalRingMotionTime = getMechanicalRingMotionTime(elapsed);

      assemblyDust.rotation.y = elapsed * 0.1;
      assemblyDust.rotation.z = Math.sin(elapsed * 0.23) * 0.12;
      assemblyDust.position.x = profile.model === "original" ? 0 : implosion * 0.44;
      (assemblyDust.material as THREE.PointsMaterial).opacity =
        containment * 0.6 * (1 - implosion);
      assemblyDust.scale.setScalar(
        (1 - containment * 0.18 + Math.sin(elapsed * 1.7) * 0.015) *
          THREE.MathUtils.lerp(1, 0.08, implosion),
      );
      stars.rotation.y = elapsed * 0.004;

      cageRings.forEach((ring, index) => {
        if (profile.model === "original") {
          const baseRotation = ring.userData.baseRotation as THREE.Euler;
          ring.rotation.copy(baseRotation);
          ring.rotation.x +=
            Math.sin(mechanicalRingMotionTime * 0.38 + index * 1.7) * 0.1;
          ring.rotation.y +=
            Math.cos(mechanicalRingMotionTime * 0.31 + index * 1.3) * 0.08;
          return;
        }
        if (profile.armored) {
          const baseQuaternion = ring.userData.baseQuaternion as THREE.Quaternion;
          const spinSpeed = ring.userData.spinSpeed as number;
          const revealAt = ring.userData.revealAt as number;
          const bearingEngagement = smoothstep(progressBetween(
            cinematicTime,
            revealAt,
            revealAt + 0.16,
          ));
          ring.visible = index === 0 || cinematicTime >= revealAt;
          ring.scale.setScalar(THREE.MathUtils.lerp(0.96, 1, bearingEngagement));
          gimbalMotion.setFromAxisAngle(
            localGimbalAxis,
            mechanicalRingMotionTime * spinSpeed,
          );
          ring.quaternion.copy(baseQuaternion).multiply(gimbalMotion);
          return;
        }
        const baseRotation = ring.userData.baseRotation as THREE.Euler;
        ring.rotation.copy(baseRotation);
        ring.rotation.y +=
          Math.sin(mechanicalRingMotionTime * 0.42 + index) * 0.045;
        ring.rotation.z +=
          Math.sin(mechanicalRingMotionTime * 0.3 + index * 0.7) * 0.022;
      });
      triggerCoils.forEach((coil, index) => {
        if (profile.model === "original") {
          const baseRotation = coil.userData.baseRotation as THREE.Euler;
          coil.rotation.copy(baseRotation);
          coil.rotation.z +=
            Math.sin(
              mechanicalRingMotionTime * (0.54 + index * 0.07) + index,
            ) * 0.16;
          return;
        }
        if (profile.armored) {
          const baseQuaternion = coil.userData.baseQuaternion as THREE.Quaternion;
          const spinSpeed = coil.userData.spinSpeed as number;
          const bearingEngagement = smoothstep(progressBetween(
            cinematicTime,
            ANTIMATTER_CINEMATIC_TIMING.phases.assembly,
            ANTIMATTER_CINEMATIC_TIMING.phases.assembly + 0.16,
          ));
          coil.visible =
            cinematicTime >= ANTIMATTER_CINEMATIC_TIMING.phases.assembly;
          coil.scale.setScalar(THREE.MathUtils.lerp(0.96, 1, bearingEngagement));
          gimbalMotion.setFromAxisAngle(
            localGimbalAxis,
            mechanicalRingMotionTime * spinSpeed,
          );
          coil.quaternion.copy(baseQuaternion).multiply(gimbalMotion);
          return;
        }
        const baseRotation = coil.userData.baseRotation as THREE.Euler;
        coil.rotation.copy(baseRotation);
        coil.rotation.z +=
          mechanicalRingMotionTime *
          (0.08 + index * 0.018) *
          (index % 2 === 0 ? 1 : -1);
      });

      flareCore.rotation.x = elapsed * 1.25;
      flareCore.rotation.y = elapsed * 1.7;
      const flarePulse = profile.model === "original"
        ? 0.035 + ignition * 0.05
        : 0.012 + ignition * 0.018;
      const coreEngulfment = profile.armored
        ? smoothstep(progressBetween(
            cinematicTime,
            ANTIMATTER_CINEMATIC_TIMING.flash.startsAt,
            ANTIMATTER_CINEMATIC_TIMING.flash.endsAt,
          ))
        : 0;
      const manifestedCoreScale = 1 + coreEngulfment * 0.095;
      const coreBreathingTime = Math.max(
        elapsed - ANTIMATTER_CINEMATIC_TIMING.phases.manifested,
        0,
      );
      const coreBreathingActivation = smoothstep(progressBetween(
        cinematicTime,
        ANTIMATTER_CINEMATIC_TIMING.phases.manifested,
        ANTIMATTER_CINEMATIC_TIMING.phases.manifested + 0.2,
      ));
      const armoredBreathExpansion = coreBreathingTime > 0
        ? getArmoredBreathExpansion(coreBreathingTime)
        : 1;
      const breathingCoreScale = profile.armored
        ? coreBreathingTime > 0
          ? THREE.MathUtils.lerp(0.84, 1.095, armoredBreathExpansion)
          : manifestedCoreScale
        : manifestedCoreScale +
          Math.sin(coreBreathingTime * 5.2) *
            flarePulse *
            coreBreathingActivation;
      flareCore.scale.setScalar(
        breathingCoreScale * (1 - implosionCompression * 0.5),
      );
      if (profile.armored) {
        flareCoreMaterial.color.lerpColors(
          contractedCoreColor,
          expandedCoreColor,
          armoredBreathExpansion,
        );
        flareCoreMaterial.emissiveIntensity = coreBreathingTime > 0
          ? THREE.MathUtils.lerp(0.34, 0.16, armoredBreathExpansion)
          : 0.3;
        if (flareBreathRim && flareBreathRimMaterial) {
          flareBreathRim.visible = coreBreathingTime > 0;
          flareBreathRim.scale.setScalar(breathingCoreScale);
          flareBreathRimMaterial.opacity = THREE.MathUtils.lerp(
            0.32,
            0.14,
            armoredBreathExpansion,
          );
        }
        if (flareVeinNetwork && flareVeinMaterial) {
          flareVeinNetwork.visible = veinConsumption < 1;
          flareVeinMaterial.opacity = 0.98 * (1 - veinConsumption);
        }
      }
      const armoredGlowBreath = profile.armored && coreBreathingTime > 0
        ? THREE.MathUtils.lerp(-0.26, 0.2, armoredBreathExpansion)
        : Math.sin(elapsed * 3.8) * 0.24;
      flareGlow.scale.setScalar(
        (2.45 + armoredGlowBreath + ignition * 0.5) *
          (1 - implosionCompression * 0.56),
      );
      (flareGlow.material as THREE.SpriteMaterial).opacity =
        (0.42 + ignition * 0.34) * (1 - implosionCompression * 0.78);

      abyssCores.forEach((abyssCore, index) => {
        abyssCore.rotation.y = elapsed * 0.48 * (index === 0 ? -1 : 1);
        abyssCore.scale.setScalar(1 - implosionCompression * 0.48);
      });
      abyssRims.forEach((abyssRim, index) => {
        const rimBaseScale = profile.model === "original"
          ? 2.25
          : profile.armored ? 0.34 : 1.42;
        const rimDrift = profile.model === "original"
          ? 0.14
          : profile.armored ? 0.012 : 0.1;
        const rimIgnitionScale = profile.model === "original"
          ? 0.35
          : profile.armored ? 0.025 : 0.3;
        abyssRim.scale.setScalar(
          (rimBaseScale +
            Math.sin(elapsed * 2.9 + index * 1.2) * rimDrift +
            ignition * rimIgnitionScale) *
            (1 - implosionCompression * 0.58),
        );
        const rimBaseOpacity = profile.armored ? 0.02 : 0.3;
        const rimIgnitionOpacity = profile.armored ? 0.025 : 0.28;
        (abyssRim.material as THREE.SpriteMaterial).opacity =
          (rimBaseOpacity + ignition * rimIgnitionOpacity) *
          (1 - implosionCompression * 0.8);
      });
      eventHorizons.forEach((eventHorizon, index) => {
        eventHorizon.rotation.x =
          Math.sin(mechanicalRingMotionTime * 0.7 + index) * 0.22;
        eventHorizon.rotation.z =
          mechanicalRingMotionTime * 0.72 * (index === 0 ? -1 : 1);
      });

      const preImplosionCoreScale = 0.18 + ignition * 1.15;
      annihilationMaterial.opacity =
        ignition * 0.55 * (1 - implosionCompression * 0.96) + flash * 0.45;
      annihilationPoint.scale.setScalar(
        THREE.MathUtils.lerp(preImplosionCoreScale, 0.035, implosionCompression) +
          flash * 2.8,
      );
      annihilationLight.intensity =
        ignition * 8 * (1 - implosionCompression * 0.94) + flash * 130;
      redLight.intensity = 21 + ignition * 22 * (1 - implosionCompression * 0.64);
      blueLight.intensity = 18 + ignition * 25 * (1 - implosionCompression * 0.64);

      implosionWaves.forEach(({ mesh, startsAt }, index) => {
        const waveProgress = smoothstep(progressBetween(
          cinematicTime,
          startsAt,
          ANTIMATTER_CINEMATIC_TIMING.implosion.pinchesAt,
        ));
        mesh.visible = cinematicTime >= startsAt &&
          cinematicTime < ANTIMATTER_CINEMATIC_TIMING.implosion.pinchesAt;
        mesh.scale.setScalar(THREE.MathUtils.lerp(6.4, 0.18, waveProgress));
        mesh.material.opacity =
          Math.sin(waveProgress * Math.PI) * (0.42 + index * 0.07);
        mesh.rotation.z = (1 - waveProgress) * (0.52 + index * 0.14);
      });

      aftershockRing.visible = aftershockProgress > 0 && aftershockProgress < 1;
      aftershockRing.scale.setScalar(
        THREE.MathUtils.lerp(0.36, 7.6, smoothstep(aftershockProgress)),
      );
      aftershockMaterial.opacity = aftershockEnvelope * 0.62;
      aftershockRing.rotation.z = aftershockProgress * 0.22;

      const automaticSwayWeight = profile.armored ? 1 - reveal : 1;
      deviceRoot.rotation.y =
        profile.rootYaw +
        Math.sin(elapsed * 0.36) *
          (profile.model === "original" ? 0.09 : profile.armored ? 0.05 : 0.055) *
          automaticSwayWeight +
        reveal * (livingTime * profile.livingRotation + modelView.yaw);
      deviceRoot.rotation.x =
        profile.rootPitch +
        Math.sin(elapsed * 0.42) * 0.025 * automaticSwayWeight +
        reveal * modelView.pitch;
      deviceRoot.position.y = Math.sin(livingTime * 0.8) * reveal * 0.045;

      camera.position.z =
        cameraBaseZ - smoothstep(progressBetween(cinematicTime, 0.4, 5.2)) * cameraTravel;
      camera.position.z -= cameraPull * 0.52;
      camera.position.z += aftershockEnvelope * 0.13;
      camera.position.z *= 1 - reveal * modelView.zoom * 0.2;
      camera.position.x =
        profile.cameraTargetX +
        Math.sin(elapsed * 0.28) * 0.24 * automaticSwayWeight +
        Math.sin(aftershockProgress * Math.PI * 6) * aftershockEnvelope * 0.05;
      camera.position.y =
        0.28 +
        Math.cos(elapsed * 0.31) * 0.11 * automaticSwayWeight +
        Math.cos(aftershockProgress * Math.PI * 5) * aftershockEnvelope * 0.038;
      camera.lookAt(profile.cameraTargetX, 0, 0);

      if (flashRef.current) {
        flashRef.current.style.opacity = String(flash * 0.78);
      }
      if (revealRef.current) {
        revealRef.current.style.opacity = String(reveal);
        revealRef.current.style.transform = `translate3d(0, ${(1 - reveal) * 18}px, 0)`;
      }

      renderer.toneMappingExposure =
        1.08 - implosionCompression * 0.2 + flash * 0.82;
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(completionTimer);
      gameAudio.stopAntimatterBlueprintCinematic();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.classList.remove("is-dragging");
      if (restartRef.current === restart) restartRef.current = null;
      if (modelViewControllerRef.current === modelViewController) {
        modelViewControllerRef.current = null;
      }
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh;
        if (renderable.geometry) renderable.geometry.dispose();
        if (renderable.material) {
          const materials = Array.isArray(renderable.material)
            ? renderable.material
            : [renderable.material];
          materials.forEach((material) => material.dispose());
        }
      });
      glowTexture.dispose();
      (ignitionKernel.userData.veinTexture as THREE.Texture | undefined)?.dispose();
      artifactTextures.forEach((texture) => texture.dispose());
      environmentTarget?.dispose();
      renderer.dispose();
    };
  }, [reducedMotion, runtime, visualVariant]);

  const selectVisualVariant = (nextVariant: AntimatterVisualVariant) => {
    if (nextVariant === visualVariant) return;
    const url = new URL(window.location.href);
    url.searchParams.set("variant", nextVariant);
    window.history.replaceState(null, "", url);
    setVisualVariant(nextVariant);
  };

  const toggleAudio = () => {
    const nextMuted = !muted;
    gameAudio.setMuted(nextMuted);
    setMuted(nextMuted);
    if (!nextMuted) restartRef.current?.();
  };

  return (
    <div
      ref={rootRef}
      className={`antimatter-cinematic${captureMode ? " antimatter-cinematic--capture" : ""}${runtime ? " antimatter-cinematic--runtime" : ""}`}
      data-testid="antimatter-cinematic"
      data-phase={phase}
      data-visual-variant={visualVariant}
    >
      <canvas
        ref={canvasRef}
        className="antimatter-canvas"
        aria-label={
          phase === "MANIFESTED"
            ? "Interactive 3D Antimatter Detonator"
            : "Antimatter Detonator blueprint manifestation cinematic"
        }
        tabIndex={0}
      />

      <div className="antimatter-vignette" aria-hidden="true" />
      <div ref={flashRef} className="antimatter-flash" aria-hidden="true" />

      {!runtime && <header className="antimatter-controls">
        <button
          type="button"
          className="antimatter-icon-button"
          onClick={() => navigate("/")}
          aria-label="Return to Luminae"
          title="Return to Luminae"
        >
          <ArrowLeft aria-hidden="true" />
        </button>

        <div className="antimatter-status">
          <div className="antimatter-phase" aria-live="polite">
            <span className="antimatter-phase-mark" aria-hidden="true" />
            <span>{phase}</span>
          </div>
          {import.meta.env.DEV && (
            <span
              ref={timerRef}
              className="antimatter-dev-timer"
              data-testid="antimatter-dev-timer"
              aria-label="Cinematic timecode"
            >
              {`0.00 / ${ANTIMATTER_CINEMATIC_TIMING.duration.toFixed(2)}`}
            </span>
          )}
        </div>

        <div className="antimatter-control-actions">
          <button
            type="button"
            className="antimatter-icon-button"
            onClick={toggleAudio}
            aria-label={muted ? "Enable cinematic audio" : "Mute cinematic audio"}
            aria-pressed={!muted}
            title={muted ? "Enable cinematic audio" : "Mute cinematic audio"}
          >
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>

          <button
            type="button"
            className="antimatter-icon-button"
            onClick={() => restartRef.current?.()}
            aria-label="Replay cinematic"
            title="Replay cinematic"
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </header>}

      {!runtime && import.meta.env.DEV && (
        <div
          className="antimatter-variant-switch"
          role="radiogroup"
          aria-label="Device presentation"
        >
          {(["original", "asymmetric", "lattice", "armored"] as const).map(
            (variant) => (
            <button
              key={variant}
              type="button"
              role="radio"
              aria-checked={visualVariant === variant}
              data-active={visualVariant === variant}
              onClick={() => selectVisualVariant(variant)}
            >
              {ANTIMATTER_VISUAL_PROFILES[variant].label}
            </button>
            ),
          )}
        </div>
      )}

      <BlueprintModelControls
        visible={!runtime && phase === "MANIFESTED"}
        onRotate={() => modelViewControllerRef.current?.orbitBy(Math.PI / 5, 0)}
        onZoomOut={() => modelViewControllerRef.current?.zoomBy(-0.22)}
        onZoomIn={() => modelViewControllerRef.current?.zoomBy(0.22)}
        onReset={() => modelViewControllerRef.current?.reset()}
      />

      <div className="antimatter-index" aria-hidden="true">
        <span>CANONICAL LOADOUT // 04</span>
        <span>ARTIFACT FORMS VERIFIED</span>
      </div>

      <div ref={revealRef} className="antimatter-reveal">
        <p>BLUEPRINT MANIFESTATION</p>
        <h1>ANTIMATTER DETONATOR</h1>
        <div className="antimatter-armed-line">
          <span>CONTAINMENT STABLE</span>
          <span className="antimatter-armed-pulse" aria-hidden="true" />
          <strong>ARMED</strong>
        </div>
      </div>

      {renderError && (
        <div className="antimatter-error" role="alert">
          <strong>VISUALIZATION OFFLINE</strong>
          <span>WebGL is unavailable on this device.</span>
        </div>
      )}

      <div className="antimatter-progress" aria-hidden="true">
        <span ref={progressRef} />
      </div>

      <style>{`
        .antimatter-cinematic {
          position: relative;
          width: 100%;
          min-height: 100dvh;
          overflow: hidden;
          background: #010207;
          color: #f6f8fb;
          isolation: isolate;
          letter-spacing: 0;
        }

        .antimatter-cinematic--runtime {
          position: fixed;
          inset: 0;
          z-index: 12000;
          width: 100vw;
          height: 100dvh;
          min-height: 0;
        }

        .antimatter-cinematic--capture > :not(.antimatter-canvas):not(.antimatter-vignette):not(style) {
          display: none !important;
        }

        .antimatter-canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          touch-action: none;
        }

        .antimatter-cinematic[data-phase="MANIFESTED"] .antimatter-canvas {
          cursor: grab;
        }

        .antimatter-cinematic[data-phase="MANIFESTED"] .antimatter-canvas.is-dragging {
          cursor: grabbing;
        }

        .antimatter-canvas:focus-visible {
          outline: 2px solid #f0bd63;
          outline-offset: -4px;
        }

        .antimatter-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(1, 2, 7, 0.72) 0%, transparent 24%, transparent 66%, rgba(1, 2, 7, 0.8) 100%),
            linear-gradient(90deg, rgba(1, 2, 7, 0.38) 0%, transparent 25%, transparent 75%, rgba(1, 2, 7, 0.38) 100%);
          z-index: 1;
        }

        .antimatter-flash {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          opacity: 0;
          background: #f7fbff;
          mix-blend-mode: screen;
        }

        .antimatter-controls {
          position: absolute;
          top: max(18px, env(safe-area-inset-top));
          left: max(18px, env(safe-area-inset-left));
          right: max(18px, env(safe-area-inset-right));
          z-index: 4;
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 12px;
        }

        .antimatter-icon-button {
          display: inline-flex;
          width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(213, 232, 255, 0.24);
          border-radius: 4px;
          background: rgba(4, 7, 14, 0.62);
          color: rgba(239, 247, 255, 0.88);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
        }

        .antimatter-icon-button:hover {
          border-color: rgba(255, 196, 96, 0.72);
          background: rgba(13, 17, 26, 0.82);
          color: #ffffff;
        }

        .antimatter-icon-button:focus-visible {
          outline: 2px solid #f0bd63;
          outline-offset: 3px;
        }

        .antimatter-icon-button svg {
          width: 18px;
          height: 18px;
        }

        .antimatter-control-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .antimatter-phase {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: rgba(224, 235, 247, 0.68);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10px;
          font-weight: 600;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .antimatter-status {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .antimatter-dev-timer {
          min-width: 76px;
          padding-left: 10px;
          border-left: 1px solid rgba(159, 231, 255, 0.24);
          color: rgba(191, 235, 248, 0.72);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", monospace;
          font-size: 10px;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          letter-spacing: 0;
          white-space: nowrap;
        }

        .antimatter-phase-mark {
          width: 5px;
          height: 5px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #f2bd62;
          box-shadow: 0 0 12px rgba(242, 189, 98, 0.75);
        }

        .antimatter-variant-switch {
          position: absolute;
          top: max(74px, calc(env(safe-area-inset-top) + 62px));
          left: 50%;
          z-index: 4;
          display: grid;
          grid-template-columns: repeat(4, minmax(66px, 1fr));
          overflow: hidden;
          border: 1px solid rgba(213, 232, 255, 0.2);
          border-radius: 3px;
          background: rgba(4, 7, 14, 0.68);
          transform: translateX(-50%);
          backdrop-filter: blur(8px);
        }

        .antimatter-variant-switch button {
          height: 26px;
          padding: 0 10px;
          border: 0;
          border-right: 1px solid rgba(213, 232, 255, 0.16);
          background: transparent;
          color: rgba(205, 217, 230, 0.54);
          cursor: pointer;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 9px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .antimatter-variant-switch button:last-child {
          border-right: 0;
        }

        .antimatter-variant-switch button[data-active="true"] {
          background: rgba(240, 189, 99, 0.12);
          color: #f0bd63;
        }

        .antimatter-variant-switch button:focus-visible {
          position: relative;
          z-index: 1;
          outline: 2px solid #f0bd63;
          outline-offset: -2px;
        }

        .antimatter-index {
          position: absolute;
          top: max(78px, calc(env(safe-area-inset-top) + 64px));
          left: max(20px, env(safe-area-inset-left));
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: rgba(194, 209, 226, 0.42);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 9px;
          line-height: 1.25;
          letter-spacing: 0;
        }

        .antimatter-reveal {
          position: absolute;
          left: max(24px, env(safe-area-inset-left));
          right: max(24px, env(safe-area-inset-right));
          bottom: max(42px, calc(env(safe-area-inset-bottom) + 30px));
          z-index: 3;
          opacity: 0;
          pointer-events: none;
          text-align: center;
          will-change: transform, opacity;
        }

        .antimatter-reveal p {
          margin: 0 0 8px;
          color: #efbd68;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: 0;
        }

        .antimatter-reveal h1 {
          margin: 0;
          color: #f8fafc;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 48px;
          font-weight: 500;
          line-height: 1.03;
          letter-spacing: 0;
          text-wrap: balance;
          text-shadow: 0 0 28px rgba(173, 213, 255, 0.22);
        }

        .antimatter-armed-line {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 12px;
          color: rgba(219, 230, 241, 0.65);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 9px;
          line-height: 1;
          letter-spacing: 0;
        }

        .antimatter-armed-line strong {
          color: #ff7b45;
          font-weight: 800;
        }

        .antimatter-armed-pulse {
          width: 4px;
          height: 4px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #ff5a27;
          box-shadow: 0 0 12px rgba(255, 74, 30, 0.9);
          animation: antimatterPulse 1.4s ease-in-out infinite;
        }

        .antimatter-progress {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 4;
          height: 2px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
        }

        .antimatter-progress span {
          display: block;
          width: 100%;
          height: 100%;
          transform: scaleX(0);
          transform-origin: left center;
          background: linear-gradient(90deg, #ff5227 0%, #f1bd62 48%, #b7e0ff 100%);
          will-change: transform;
        }

        .antimatter-error {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 5;
          display: flex;
          width: min(320px, calc(100% - 48px));
          transform: translate(-50%, -50%);
          flex-direction: column;
          gap: 8px;
          border-left: 2px solid #ff6f39;
          padding: 12px 16px;
          background: rgba(3, 5, 11, 0.88);
          color: rgba(236, 242, 248, 0.72);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          line-height: 1.4;
          letter-spacing: 0;
        }

        .antimatter-error strong {
          color: #ffffff;
        }

        @keyframes antimatterPulse {
          0%, 100% { opacity: 0.48; transform: scale(0.82); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        @media (min-width: 900px) {
          .antimatter-controls {
            top: 26px;
            left: 30px;
            right: 30px;
          }

          .antimatter-index {
            top: 92px;
            left: 32px;
          }

          .antimatter-reveal {
            bottom: 54px;
          }

          .antimatter-reveal h1 {
            font-size: 64px;
          }
        }

        @media (max-width: 560px) {
          .antimatter-variant-switch {
            top: max(70px, calc(env(safe-area-inset-top) + 58px));
            grid-template-columns: repeat(4, minmax(56px, 1fr));
          }

          .antimatter-variant-switch button {
            height: 24px;
            padding: 0 7px;
            font-size: 8px;
          }

          .antimatter-status {
            gap: 7px;
          }

          .antimatter-dev-timer {
            min-width: 69px;
            padding-left: 7px;
            font-size: 9px;
          }

          .antimatter-reveal {
            left: 18px;
            right: 18px;
            bottom: max(32px, calc(env(safe-area-inset-bottom) + 24px));
          }

          .antimatter-reveal h1 {
            font-size: 29px;
            line-height: 1.08;
          }

          .antimatter-armed-line {
            gap: 7px;
            font-size: 8px;
          }

          .antimatter-index {
            display: none;
          }
        }

        @media (max-height: 560px) {
          .antimatter-reveal {
            bottom: 22px;
          }

          .antimatter-reveal p {
            margin-bottom: 4px;
          }

          .antimatter-reveal h1 {
            font-size: 30px;
          }

          .antimatter-armed-line {
            margin-top: 7px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .antimatter-armed-pulse {
            animation: none;
          }

          .antimatter-icon-button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

export default function DevAntimatterCinematic() {
  const reducedMotion =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("motion") === "reduced"
      ? true
      : undefined;

  return <AntimatterManifestationAnimation reducedMotion={reducedMotion} />;
}
