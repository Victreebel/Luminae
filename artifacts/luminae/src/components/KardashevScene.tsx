import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { KardashevTier, AffinityPalette } from '@/lib/kardashev';
import { getCivilizationName, getSecondaryAffinityColor } from '@/lib/kardashev';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRuntimePerformanceState } from '@/lib/runtimePerformance';
import { AFFINITY_META } from '@/lib/affinityMeta';
import { useCosmetics } from '@/contexts/CosmeticsContext';
import {
  EMPTY_CIVILIZATION_PROFILE,
  type CivilizationLandmark,
  type CivilizationProfile,
  type CivilizationTrait,
} from '@/lib/civilizationProfile';

// ── Seeded PRNG ──────────────────────────────────────────────────────────────
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 17), 0x45d9f3b) >>> 0;
    s = Math.imul(s ^ (s >>> 31), 0x1b873593) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0xffffffff;
  };
}

function mixSceneSeed(base: number, civilizationSeed: number): number {
  if (civilizationSeed === 0) return base;
  return Math.imul((base ^ civilizationSeed) >>> 0, 0x45d9f3b) >>> 0;
}

// ── Hex to RGBA helper ───────────────────────────────────────────────────────
function hexAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// ── Scene data types ─────────────────────────────────────────────────────────
interface Star {
  x: number;     // 0–1 normalized
  y: number;
  r: number;     // radius px
  phase: number; // twinkle phase
  spd: number;   // twinkle speed
  alpha: number; // base alpha
}

interface GalaxyPoint {
  x: number;     // -1 to 1
  y: number;
  r: number;     // dot radius
  alpha: number;
}

interface PlanetPatch {
  dx: number;   // relative to center, -1..1
  dy: number;
  rx: number;   // ellipse rx, as fraction of planet radius
  ry: number;
  hue: number;  // brightness shift
}

interface OrbitPlanet {
  orbitR: number;
  angle0: number;   // starting angle
  angSpd: number;   // rad/s
  radius: number;   // planet radius px
  colorIdx: number; // 0=primary, 1=secondary, 2=accent
}

interface DysonSatellite {
  angle0: number; // starting angle on the elliptical swarm path
  angSpd: number; // rad/s (slight variance around a base speed)
  alpha: number;  // base alpha for pulse animation
}

// ── Animation timing constants (exported for timing-guard tests) ─────────────

/** Duration (s) of the tier-crossfade enter/exit animation on the canvas layer. */
export const TIER_CROSSFADE_DURATION_S = 0.75;

/** Delay (s) after a tier/palette change before the civ-name label starts fading in.
 *  Intentionally less than TIER_CROSSFADE_DURATION_S so the label is visible
 *  by the time the canvas crossfade completes. */
export const CIV_LABEL_DELAY_S = 0.4;

/** Duration (s) of the civ-name label fade-in. */
export const CIV_LABEL_DURATION_S = 0.35;

/** Duration (s) of the civ-name label fade-out (exit). Faster than entry. */
export const CIV_LABEL_EXIT_S = 0.2;

// Satellite count limits — shared between the render loop (for bornAt stamping)
// and drawDysonSwarm so both always agree on which slots are visible.
export const SWARM_MIN = 20;
export const SWARM_MAX = 60; // must match genDysonSwarm count
export const SWARM_FADE_DURATION = 1.5; // seconds

interface CityLight {
  dx: number;    // relative to planet center, -1..1; positive = shadow hemisphere
  dy: number;
  size: number;  // base dot radius (scales with planet radius)
  alpha: number; // base opacity
  phase: number; // individual twinkle phase offset
}

// ── Precomputed scene data ───────────────────────────────────────────────────
function genStars(rng: () => number, count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x:     rng(),
    y:     rng() * 0.88,
    r:     0.4 + rng() * 1.4,
    phase: rng() * Math.PI * 2,
    spd:   0.4 + rng() * 1.6,
    alpha: 0.35 + rng() * 0.65,
  }));
}

function genGalaxy(rng: () => number, arms = 2): GalaxyPoint[] {
  const pts: GalaxyPoint[] = [];
  const perArm = Math.floor(440 / arms);
  for (let a = 0; a < arms; a++) {
    const baseAngle = (a / arms) * Math.PI * 2;
    for (let i = 0; i < perArm; i++) {
      const t = (i / perArm);
      const theta = t * Math.PI * 4 + baseAngle;
      const radius = 0.06 + t * 0.44;
      const scatter = 0.03 + t * 0.07;
      const sx = rng() * scatter * 2 - scatter;
      const sy = rng() * scatter * 2 - scatter;
      pts.push({
        x: Math.cos(theta) * radius + sx,
        y: Math.sin(theta) * radius * 0.55 + sy,
        r: 0.5 + rng() * (1.2 - t * 0.8),
        alpha: 0.2 + rng() * 0.7 * (1 - t * 0.4),
      });
    }
  }
  // Dense core
  for (let i = 0; i < 80; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * 0.08;
    pts.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.55,
      r: 0.6 + rng() * 1.2,
      alpha: 0.5 + rng() * 0.5,
    });
  }
  return pts;
}

function genPlanetPatches(rng: () => number, count = 6): PlanetPatch[] {
  return Array.from({ length: count }, (_, i) => ({
    dx: rng() * 1.6 - 0.8,
    dy: rng() * 1.2 - 0.6,
    rx: 0.18 + rng() * 0.30,
    ry: 0.12 + rng() * 0.22,
    hue: i % 2 === 0 ? 0.18 : -0.12,
  }));
}

function genOrbits(rng: () => number, count: number): OrbitPlanet[] {
  return Array.from({ length: count }, (_, i) => ({
    orbitR:  52 + i * 22 + rng() * 8,
    angle0:  rng() * Math.PI * 2,
    angSpd:  0.12 + (0.3 / (i + 1)) + rng() * 0.05,
    radius:  4 + rng() * 4.5,
    colorIdx: i % 3,
  }));
}

function genDysonSwarm(rng: () => number, count: number): DysonSatellite[] {
  return Array.from({ length: count }, () => ({
    angle0: rng() * Math.PI * 2,
    angSpd: 0.07 + rng() * 0.04, // slight variance around a base crawl speed
    alpha:  0.35 + rng() * 0.45,
  }));
}

/**
 * Generates stable city-light positions pre-screened to the shadow hemisphere
 * (dx > 0.10, within 80% of planet radius).  Uses rejection sampling so all
 * `count` entries are valid shadow-side positions.
 */
function genCityLights(rng: () => number, count: number): CityLight[] {
  const lights: CityLight[] = [];
  while (lights.length < count) {
    const angle = rng() * Math.PI * 2;
    const dist  = Math.sqrt(rng()) * 0.80; // sqrt → uniform disc distribution
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    // Accept only shadow-side points (positive x) inside the planet disc
    if (dx > 0.10 && dx * dx + dy * dy < 0.64) {
      lights.push({
        dx,
        dy,
        size:  0.35 + rng() * 0.75,
        alpha: 0.50 + rng() * 0.50,
        phase: rng() * Math.PI * 2,
      });
    }
  }
  return lights;
}

// ── Drawing primitives ───────────────────────────────────────────────────────

/**
 * Shared helper: draws 2–3 scrolling latitude band stripes and a specular
 * highlight inside whatever clip region is currently active.  Must be called
 * while the canvas is already clipped to the planet disc.
 */
/**
 * Draws subtle terrain variation (noise blobs) and small crater marks inside
 * the current canvas clip region (expected: a planet disc clip is already active).
 * Uses a seeded LCG so positions are deterministic per planet and don't jitter.
 */
function drawPlanetSurfaceDetail(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  palette: AffinityPalette,
  craterCount: number,
  blobCount: number,
  stableSeed: number,
  scroll: number,  // horizontal scroll offset matching the banding rotation
) {
  // LCG seeded from caller-provided stable value (must NOT use animated cx/cy for moving planets)
  let seed = (stableSeed | 0) >>> 0;
  const rng = () => {
    seed = ((seed * 1664525 + 1013904223) >>> 0);
    return seed / 0xffffffff;
  };

  // --- Terrain noise blobs (highlands / plains variation) ---
  ctx.globalAlpha = 0.11;
  for (let i = 0; i < blobCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * radius * 0.80;
    const baseX = cx + Math.cos(angle) * dist;
    const by    = cy + Math.sin(angle) * dist;
    const rx = radius * (0.07 + rng() * 0.13);
    const ry = rx * (0.45 + rng() * 0.55);
    const rot = rng() * Math.PI;
    const col = rng() > 0.5 ? palette.accent : palette.secondary;
    // Three copies so blobs wrap seamlessly as the planet rotates
    for (const xOff of [-(radius * 2), 0, radius * 2]) {
      ctx.beginPath();
      ctx.ellipse(baseX + scroll + xOff, by, rx, ry, rot, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(col, 0.6);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // --- Crater marks: dark filled ellipse + faint bright ejecta rim ---
  for (let i = 0; i < craterCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * radius * 0.70;
    const baseX = cx + Math.cos(angle) * dist;
    const by    = cy + Math.sin(angle) * dist;
    // Cap crater radius at 15% of planet radius so small planets aren't over-cratered
    const cr = Math.min(radius * (0.05 + rng() * 0.09), radius * 0.15);
    const rot = rng() * Math.PI;

    // Three copies so craters wrap seamlessly as the planet rotates
    for (const xOff of [-(radius * 2), 0, radius * 2]) {
      const bx = baseX + scroll + xOff;

      // Dark crater bowl
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.ellipse(bx, by, cr, cr * 0.62, rot, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fill();

      // Faint bright ejecta rim (slightly offset toward the lit side)
      ctx.globalAlpha = 0.09;
      ctx.beginPath();
      ctx.ellipse(bx - cr * 0.10, by - cr * 0.08, cr * 1.12, cr * 0.72, rot, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = Math.max(0.5, radius * 0.011);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPlanetBandingAndHighlight(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  t: number,
  palette: AffinityPalette,
  bandCount: number,
) {
  const scroll = ((t * 0.05) % 1) * (radius * 2); // scrolls one full diameter per 20s

  ctx.globalAlpha = 0.32;
  for (let i = 0; i < bandCount; i++) {
    // Distribute bands evenly across the lit hemisphere, skip polar extremes
    const yFrac = (i + 1) / (bandCount + 1);
    const yOff  = (yFrac * 2 - 1) * radius * 0.68;
    // Half-width of the band at this latitude (chord of the circle)
    const bw = Math.sqrt(Math.max(0, radius * radius - yOff * yOff));
    const bh = radius * (i % 2 === 0 ? 0.13 : 0.09);
    const col = i % 2 === 0 ? palette.accent : palette.secondary;

    // Three copies so horizontal scrolling wraps seamlessly inside the clip
    for (const xOff of [-(radius * 2), 0, radius * 2]) {
      ctx.beginPath();
      ctx.ellipse(cx + scroll + xOff, cy + yOff, bw, bh, 0, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(col, 0.6);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Specular highlight — small bright gradient at the lit-hemisphere pole
  const hx = cx - radius * 0.26;
  const hy = cy - radius * 0.30;
  const hr = radius * 0.40;
  const spec = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
  spec.addColorStop(0,   'rgba(255,255,255,0.24)');
  spec.addColorStop(0.4, 'rgba(255,255,255,0.09)');
  spec.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, tier: KardashevTier) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.4, h * 0.05, w * 0.5, h * 0.6, h * 1.1);
  if (tier === 0) {
    g.addColorStop(0, '#010a1a');
    g.addColorStop(0.6, '#000712');
    g.addColorStop(1, '#000000');
  } else if (tier === 1) {
    g.addColorStop(0, '#000510');
    g.addColorStop(0.7, '#000208');
    g.addColorStop(1, '#000000');
  } else if (tier === 2) {
    g.addColorStop(0, '#000308');
    g.addColorStop(1, '#000000');
  } else {
    g.addColorStop(0, '#010008');
    g.addColorStop(1, '#000000');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
  scaleFactor = 1,
) {
  for (const s of stars) {
    const alpha = s.alpha * (0.55 + 0.45 * Math.sin(t * s.spd + s.phase)) * scaleFactor;
    if (alpha < 0.02) continue;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,235,255,${alpha.toFixed(3)})`;
    ctx.fill();
  }
}

const MOON_PALETTE: AffinityPalette = {
  primary:   '#b8cce8',
  secondary: '#7a9abf',
  accent:    '#ddeaff',
};

function drawMoon(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const mx = w * 0.74;
  const my = h * 0.19;
  const mr = Math.min(w, h) * 0.075;

  // Outer atmosphere glow
  const glo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.2);
  glo.addColorStop(0, 'rgba(180,210,255,0.13)');
  glo.addColorStop(0.4, 'rgba(120,160,220,0.05)');
  glo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glo;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Clip to moon disc so banding stays inside
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.clip();

  // Moon disc base gradient
  const disc = ctx.createRadialGradient(mx - mr * 0.25, my - mr * 0.25, mr * 0.05, mx, my, mr);
  disc.addColorStop(0, 'rgba(235,245,255,0.96)');
  disc.addColorStop(0.6, 'rgba(200,220,245,0.92)');
  disc.addColorStop(0.9, 'rgba(150,170,210,0.85)');
  disc.addColorStop(1, 'rgba(100,120,170,0.7)');
  ctx.fillStyle = disc;
  ctx.fill(); // fills the already-clipped disc path

  // Banding + specular (same helper as Tier-1 planets, bandCount=2)
  drawPlanetBandingAndHighlight(ctx, mx, my, mr, t, MOON_PALETTE, 2);

  ctx.restore(); // remove disc clip

  // Subtle craters layered on top of banding
  const craterAlpha = 0.09 + 0.03 * Math.sin(t * 0.05);
  ctx.fillStyle = `rgba(80,100,140,${craterAlpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(mx + mr * 0.22, my + mr * 0.1, mr * 0.18, mr * 0.14, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(mx - mr * 0.3, my - mr * 0.15, mr * 0.1, mr * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHorizonGlow(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, h * 0.65, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.4, 'rgba(4,18,48,0.3)');
  g.addColorStop(0.75, 'rgba(8,30,80,0.45)');
  g.addColorStop(1, 'rgba(6,22,60,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);
}

function drawPlanetClouds(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  t: number,
) {
  // Cloud layer scrolls ~1.4× faster than the surface (higher altitude)
  const cloudScroll = (t * 0.22 * 1.4) % (radius * 2);
  // Deterministic streak layout seeded from planet center coords
  const seed = (cx * 3571 + cy * 4999) | 0;
  const rng = (n: number) => {
    const x = Math.sin(seed + n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };
  const count = 5;
  for (let i = 0; i < count; i++) {
    // Vertical spread: keep streaks roughly in the upper/mid hemisphere
    const dy = (rng(i * 3) - 0.5) * 1.4 * radius;
    // Horizontal offset (scrolling)
    const dx = (rng(i * 3 + 1) - 0.5) * radius * 0.4 + cloudScroll;
    // Streak dimensions: very wide, very thin
    const rx = radius * (0.55 + rng(i * 3 + 2) * 0.45);
    const ry = radius * (0.022 + rng(i * 3 + 2) * 0.018);
    const alpha = 0.12 + rng(i * 3 + 1) * 0.06;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    // Draw streak + two wrapped copies so scrolling is seamless
    for (const xoff of [-radius * 2, 0, radius * 2]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx + xoff, cy + dy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Draws warm city-light specks on the shadow hemisphere of the planet.
 * Must be called while the canvas clip is already restricted to the planet disc.
 * Renders 0 → MAX lights as progressFraction rises from 0 → 1.
 */
function drawCityLights(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  t: number,
  lights: CityLight[],
  progressFraction: number,
) {
  if (progressFraction <= 0) return;
  const visibleCount = Math.round(lights.length * progressFraction);
  if (visibleCount === 0) return;

  for (let i = 0; i < visibleCount; i++) {
    const light = lights[i]!;
    const lx = cx + light.dx * radius;
    const ly = cy + light.dy * radius;
    const pulse = 0.72 + 0.28 * Math.sin(t * 0.9 + light.phase);
    const a = light.alpha * pulse;
    // Dot radius scales proportionally with the planet
    const r = Math.max(0.5, light.size * (radius / 90));

    // Warm amber/white dot
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,232,140,${a.toFixed(3)})`;
    ctx.fill();

    // Faint warm glow halo around each light cluster
    const glo = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 4);
    glo.addColorStop(0, `rgba(255,210,90,${(a * 0.35).toFixed(3)})`);
    glo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(lx, ly, r * 4, 0, Math.PI * 2);
    ctx.fillStyle = glo;
    ctx.fill();
  }
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  t: number,
  palette: AffinityPalette,
  patches: PlanetPatch[],
  secondaryColor: string | null,
  cityLights: CityLight[],
  progressFraction: number,
) {
  ctx.save();

  // Atmosphere outer glow
  const atmR = radius * 1.38;
  const atm = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, atmR);
  atm.addColorStop(0, hexAlpha(palette.primary, 0.35));
  atm.addColorStop(0.5, hexAlpha(palette.primary, 0.12));
  atm.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, atmR, 0, Math.PI * 2);
  ctx.fillStyle = atm;
  ctx.fill();

  // Clip to planet circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Base color fill
  const baseGrad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
  baseGrad.addColorStop(0, hexAlpha(palette.secondary, 0.9));
  baseGrad.addColorStop(0.45, hexAlpha(palette.primary, 0.85));
  baseGrad.addColorStop(1, hexAlpha(palette.secondary, 0.8));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Latitude banding + specular highlight (inside clip)
  drawPlanetBandingAndHighlight(ctx, cx, cy, radius, t, palette, 3);

  // Surface patches (scroll = rotation)
  // When dual-palette, even-index patches tint in the secondary affinity color
  const scroll = (t * 0.22) % (radius * 2);
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < patches.length; i++) {
    const p = patches[i]!;
    const px = cx + p.dx * radius + scroll;
    const py = cy + p.dy * radius;
    const defaultColor = p.hue > 0 ? palette.accent : palette.secondary;
    const bright = (secondaryColor && i % 2 === 1) ? secondaryColor : defaultColor;
    ctx.fillStyle = hexAlpha(bright, 0.7);
    // Draw patch and two wrapped copies
    for (const xoff of [-radius * 2, 0, radius * 2]) {
      ctx.beginPath();
      ctx.ellipse(px + xoff, py, p.rx * radius, p.ry * radius, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Surface detail: terrain blobs + craters (inside clip, above patches)
  // Seed from cx/cy which are fixed for the main planet (it doesn't orbit).
  // Scroll matches the banding rate so craters move with the rotating surface.
  const surfaceScroll = ((t * 0.05) % 1) * (radius * 2);
  drawPlanetSurfaceDetail(ctx, cx, cy, radius, palette, 3, 10, (cx * 7919 + cy * 6271) | 0, surfaceScroll);

  // Cloud streaks — wispy semi-transparent ellipses scrolling faster than surface
  drawPlanetClouds(ctx, cx, cy, radius, t);

  // Hemisphere shading (terminator)
  const shad = ctx.createRadialGradient(
    cx + radius * 0.35, cy + radius * 0.3, radius * 0.1,
    cx + radius * 0.6, cy + radius * 0.4, radius * 1.6,
  );
  shad.addColorStop(0, 'rgba(0,0,0,0)');
  shad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
  shad.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = shad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // City lights: drawn on top of the shadow, inside the planet disc clip
  drawCityLights(ctx, cx, cy, radius, t, cityLights, progressFraction);

  ctx.restore();

  // Primary atmosphere rim
  const rim = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.04);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(0.7, hexAlpha(palette.accent, 0.18));
  rim.addColorStop(1, hexAlpha(palette.accent, 0.35));
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.04, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();

  // Secondary affinity rim tint — a faint halo in the secondary color offset to one side
  if (secondaryColor) {
    const rim2 = ctx.createRadialGradient(
      cx - radius * 0.15, cy + radius * 0.15, radius * 0.88,
      cx - radius * 0.1, cy + radius * 0.1, radius * 1.08,
    );
    rim2.addColorStop(0, 'rgba(0,0,0,0)');
    rim2.addColorStop(0.65, hexAlpha(secondaryColor, 0.11));
    rim2.addColorStop(1, hexAlpha(secondaryColor, 0.24));
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
    ctx.fillStyle = rim2;
    ctx.fill();
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  t: number,
  scale = 1,
) {
  const pulse = 1 + 0.06 * Math.sin(t * 1.8);
  const coreR = 18 * scale * pulse;
  const glowR = 78 * scale * pulse;

  const glo = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  glo.addColorStop(0, 'rgba(255,252,220,0.95)');
  glo.addColorStop(0.06, 'rgba(255,240,160,0.80)');
  glo.addColorStop(0.18, 'rgba(255,200,80,0.40)');
  glo.addColorStop(0.45, 'rgba(255,170,40,0.15)');
  glo.addColorStop(0.7, 'rgba(255,140,20,0.06)');
  glo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glo;
  ctx.fill();

  // Bright core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.5, 'rgba(255,250,200,0.95)');
  core.addColorStop(1, 'rgba(255,220,120,0.7)');
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();
}

function drawOrbitPlanet(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  orbit: OrbitPlanet,
  t: number,
  palette: AffinityPalette,
  secondaryColor: string | null,
  isOutermost: boolean,
) {
  const angle = orbit.angle0 + orbit.angSpd * t;
  const px = cx + Math.cos(angle) * orbit.orbitR;
  const py = cy + Math.sin(angle) * orbit.orbitR * 0.48;

  // Outermost orbit uses secondary affinity color when dual-palette is active
  const useSecondary = isOutermost && secondaryColor !== null;
  const secCol = secondaryColor ?? palette.secondary;

  const colors = [palette.primary, palette.secondary, palette.accent];
  const col = useSecondary ? secCol : (colors[orbit.colorIdx % colors.length] ?? palette.primary);

  // Tiny atmosphere glow
  const glo = ctx.createRadialGradient(px, py, orbit.radius * 0.5, px, py, orbit.radius * 2.2);
  glo.addColorStop(0, hexAlpha(col, 0.4));
  glo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(px, py, orbit.radius * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = glo;
  ctx.fill();

  // Planet disc + banding (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, orbit.radius, 0, Math.PI * 2);
  ctx.clip();

  const disc = ctx.createRadialGradient(
    px - orbit.radius * 0.3, py - orbit.radius * 0.3, 0,
    px, py, orbit.radius,
  );
  disc.addColorStop(0, hexAlpha(useSecondary ? secCol : palette.accent, 0.95));
  disc.addColorStop(0.5, hexAlpha(col, 0.90));
  disc.addColorStop(1, hexAlpha(useSecondary ? secCol : palette.secondary, 0.75));
  ctx.beginPath();
  ctx.arc(px, py, orbit.radius, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();

  // 1–2 scrolling latitude bands + specular highlight (small planet, fewer bands)
  drawPlanetBandingAndHighlight(ctx, px, py, orbit.radius, t, palette, 2);

  // Surface detail: crater/blob counts scale with planet radius to avoid
  // over-cratering tiny discs.  Thresholds tuned for the 5–12 px radius range
  // generated by genOrbits.  The Tier-1 main-planet call (3 craters, 10 blobs)
  // is separate and not affected by this path.
  // Seed from stable orbit params (NOT px/py — those change every frame and would cause jitter).
  // Scroll matches the banding rate so craters move with the rotating surface.
  const orbitCraters = orbit.radius < 7 ? 0 : orbit.radius < 9 ? 1 : 2;
  const orbitBlobs   = orbit.radius < 7 ? 3 : orbit.radius < 9 ? 4 : 5;
  const orbitSurfaceScroll = ((t * 0.05) % 1) * (orbit.radius * 2);
  drawPlanetSurfaceDetail(ctx, px, py, orbit.radius, palette, orbitCraters, orbitBlobs,
    (orbit.angle0 * 9999 + orbit.orbitR * 6271 + orbit.colorIdx * 997) | 0, orbitSurfaceScroll);

  ctx.restore();
}

function drawOrbitPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  orbit: OrbitPlanet,
) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, orbit.orbitR, orbit.orbitR * 0.48, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(180,200,255,0.055)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

/**
 * Draws the Tier-2 Dyson swarm: satellite dots orbiting the star on a tight
 * elliptical path (orbitR ≈ 28), plus 3 partial arc segments suggesting
 * incomplete megastructure panels.  All rendering uses the primary affinity
 * palette color at low alpha so it does not obscure the star glow.
 *
 * @param progressFraction  0–1 representing advancement within Tier 2.
 *   0 → sparse (20 visible satellites, short arc spans);
 *   1 → dense  (60 visible satellites, full arc spans).
 *   The full 60-satellite array is always passed in; only the first
 *   `visibleCount` entries are rendered so seeded positions stay stable.
 */
function drawDysonSwarm(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  t: number,
  swarm: DysonSatellite[],
  palette: AffinityPalette,
  progressFraction: number,
  bornAt: Float32Array,
  scale = 1,
) {
  const orbitR  = 34 * scale;
  const orbitRY = orbitR * 0.48; // same ellipse aspect ratio as planet orbits

  // Arc span scale: short arcs at sparse end, longer arcs at dense end
  const arcScale = 0.35 + 0.65 * progressFraction;

  // Partial arc segments — suggest incomplete megastructure panels
  const arcDefs: [number, number][] = [
    [0.2 + t * 0.012, 0.65 * arcScale],  // panel A — rotates slowly
    [2.0 + t * 0.009, 0.50 * arcScale],  // panel B
    [3.9 + t * 0.015, 0.42 * arcScale],  // panel C
  ];
  ctx.save();
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  for (const [startA, spanR] of arcDefs) {
    const pulseA = 0.10 + 0.06 * Math.sin(t * 0.9 + startA);
    ctx.beginPath();
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const a = startA + (i / steps) * spanR;
      const x = cx + Math.cos(a) * orbitR;
      const y = cy + Math.sin(a) * orbitRY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hexAlpha(palette.primary, pulseA);
    ctx.stroke();
  }
  ctx.restore();

  // Satellite count: interpolate SWARM_MIN → SWARM_MAX as progressFraction rises.
  // Slicing the stable seeded array keeps positions consistent across frames.
  const visibleCount = Math.round(SWARM_MIN + (SWARM_MAX - SWARM_MIN) * progressFraction);

  // Satellite dots — tiny 1 px filled circles pulsing with alpha.
  // Each satellite fades in over SWARM_FADE_DURATION seconds from the moment its
  // slot index crossed the visible boundary (recorded in bornAt by the render loop).
  // Slots stamped long before t (bornAt ≪ t) resolve to fadeAlpha = 1 immediately.
  for (let i = 0; i < visibleCount; i++) {
    const sat = swarm[i];
    if (!sat) continue; // guard: empty swarm array on mobile or malformed state
    const fadeAlpha = Math.min(1, Math.max(0, (t - bornAt[i]!) / SWARM_FADE_DURATION));
    if (fadeAlpha < 0.01) continue;
    const angle = sat.angle0 + sat.angSpd * t;
    const x = cx + Math.cos(angle) * orbitR;
    const y = cy + Math.sin(angle) * orbitRY;
    const a = sat.alpha * (0.55 + 0.45 * Math.sin(t * 1.4 + sat.angle0 * 3)) * fadeAlpha;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, 1.1 * scale), 0, Math.PI * 2);
    ctx.fillStyle = hexAlpha(palette.primary, a);
    ctx.fill();
  }
}

function drawGalaxy(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  t: number,
  points: GalaxyPoint[],
  palette: AffinityPalette,
  scale: number,
  secondaryColor: string | null,
  progressFraction: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.018);

  // Nebula glow behind arms — outer stop blends secondary affinity color when dual
  const outerNebColor = secondaryColor ?? palette.accent;
  const neb = ctx.createRadialGradient(0, 0, scale * 0.04, 0, 0, scale * 0.52);
  neb.addColorStop(0, hexAlpha(palette.primary, 0.25));
  neb.addColorStop(0.3, hexAlpha(palette.secondary, 0.12));
  neb.addColorStop(0.65, hexAlpha(outerNebColor, secondaryColor ? 0.08 : 0.05));
  neb.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(0, 0, scale * 0.52, scale * 0.30, 0, 0, Math.PI * 2);
  ctx.fillStyle = neb;
  ctx.fill();

  // Arm particles — outer arm (frac >= 0.65) uses secondary affinity color when dual
  const outerArmColor = secondaryColor ?? palette.secondary;
  const visiblePoints = Math.round(points.length * (0.22 + 0.78 * progressFraction));
  for (const p of points.slice(0, visiblePoints)) {
    const ax = p.x * scale;
    const ay = p.y * scale;
    const frac = Math.sqrt(p.x * p.x + p.y * p.y) / 0.5;
    const col = frac < 0.3
      ? hexAlpha(palette.accent, p.alpha)
      : frac < 0.65
        ? hexAlpha(palette.primary, p.alpha * 0.85)
        : hexAlpha(outerArmColor, p.alpha * 0.65);
    ctx.beginPath();
    ctx.arc(ax, ay, p.r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  }

  // Bright core
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 0.12);
  core.addColorStop(0, 'rgba(255,255,255,0.95)');
  core.addColorStop(0.15, hexAlpha(palette.accent, 0.75));
  core.addColorStop(0.5, hexAlpha(palette.primary, 0.30));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(0, 0, scale * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();

  ctx.restore();
}

interface CivilizationLandmarkPoint {
  x: number;
  y: number;
  size: number;
  rotation: number;
  depth: number;
}

const LANDMARK_MATERIALS = {
  flare: { hull: '#21191a', trimAlpha: 0.72, lightAlpha: 0.9, pulseSpeed: 1.55 },
  continuum: { hull: '#161c28', trimAlpha: 0.62, lightAlpha: 0.82, pulseSpeed: 0.72 },
  verdance: { hull: '#17221d', trimAlpha: 0.64, lightAlpha: 0.84, pulseSpeed: 0.9 },
  abyss: { hull: '#171521', trimAlpha: 0.5, lightAlpha: 0.68, pulseSpeed: 0.5 },
  radiance: { hull: '#22211d', trimAlpha: 0.74, lightAlpha: 0.92, pulseSpeed: 0.64 },
} as const;

function getCivilizationLandmarkPoint(
  landmark: CivilizationLandmark,
  tier: KardashevTier,
  index: number,
  count: number,
  w: number,
  h: number,
  t: number,
): CivilizationLandmarkPoint {
  const rng = seededRng(mixSceneSeed(landmark.seed, 301 + tier * 97));
  const minDimension = Math.min(w, h);
  const tierScale = 0.82 + landmark.tier * 0.13;
  const size = Math.min(46, Math.max(16, minDimension * 0.12 * tierScale));
  const direction = index % 2 === 0 ? 1 : -1;
  const drift = t * (0.004 + (landmark.seed % 5) * 0.001) * direction;

  if (tier === 0) {
    const slot = (index + 1) / (count + 1);
    const jitter = (rng() - 0.5) * Math.min(22, w / Math.max(3, count) * 0.24);
    const densityScale = count === 1 ? 1.55 : count === 2 ? 1.3 : count <= 4 ? 1.08 : 0.86;
    return {
      x: w * (0.07 + slot * 0.86) + jitter,
      y: h * (0.76 + 0.05 * rng()),
      size: size * 1.08 * densityScale,
      rotation: 0,
      depth: 1,
    };
  }

  if (tier === 1) {
    const angle = (index / Math.max(1, count)) * Math.PI * 2 + rng() * 0.32 + drift;
    return {
      x: w * 0.5 + Math.cos(angle) * minDimension * (0.29 + rng() * 0.045),
      y: h * 0.52 + Math.sin(angle) * minDimension * (0.19 + rng() * 0.035),
      size: size * 0.78,
      rotation: angle + Math.PI * 0.5,
      depth: Math.sin(angle),
    };
  }

  if (tier === 2) {
    const lane = count <= 1 ? 0.36 : 0.27 + (index / (count - 1)) * 0.16;
    const angle = (index / Math.max(1, count)) * Math.PI * 2 + rng() * 0.45 + drift * 1.8;
    return {
      x: w * 0.5 + Math.cos(angle) * minDimension * lane,
      y: h * 0.5 + Math.sin(angle) * minDimension * lane * 0.48,
      size: size * 0.56,
      rotation: angle + Math.PI * 0.5,
      depth: Math.sin(angle),
    };
  }

  const angle = (index / Math.max(1, count)) * Math.PI * 2 + rng() * 0.6 + drift * 0.8;
  const distance = minDimension * (0.16 + rng() * 0.27);
  return {
    x: w * 0.5 + Math.cos(angle) * distance,
    y: h * 0.5 + Math.sin(angle) * distance * 0.57,
    size: size * 0.42,
    rotation: angle,
    depth: Math.sin(angle),
  };
}

function drawStructurePolygon(
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
  fillStyle: string,
  strokeStyle: string,
  lineWidth: number,
) {
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!;
    ctx.lineTo(point[0], point[1]);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawStructureLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.fillStyle = hexAlpha(color, alpha);
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * 4;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWindowGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  columns: number,
  rows: number,
  color: string,
  seed: number,
) {
  const gapX = width / Math.max(1, columns);
  const gapY = height / Math.max(1, rows);
  ctx.fillStyle = hexAlpha(color, 0.56);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if ((seed + row * 5 + column * 3) % 7 === 0) continue;
      ctx.fillRect(
        x + column * gapX + gapX * 0.25,
        y + row * gapY + gapY * 0.28,
        Math.max(0.6, gapX * 0.42),
        Math.max(0.45, gapY * 0.28),
      );
    }
  }
}

function drawRadiatorPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  lineWidth: number,
) {
  ctx.fillStyle = 'rgba(7,11,18,0.94)';
  ctx.strokeStyle = hexAlpha(color, 0.48);
  ctx.lineWidth = lineWidth;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  for (let division = 1; division < 4; division += 1) {
    const panelX = x + width * division / 4;
    ctx.beginPath();
    ctx.moveTo(panelX, y);
    ctx.lineTo(panelX, y + height);
    ctx.stroke();
  }
}

function drawLandmarkPlatform(
  ctx: CanvasRenderingContext2D,
  size: number,
  sceneTier: KardashevTier,
  hull: string,
  accent: string,
  outline: string,
  lineWidth: number,
) {
  if (sceneTier <= 1) {
    const groundGlow = ctx.createRadialGradient(0, size * 0.62, 0, 0, size * 0.62, size * 1.05);
    groundGlow.addColorStop(0, hexAlpha(accent, 0.12));
    groundGlow.addColorStop(1, hexAlpha(accent, 0));
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.62, size * 1.05, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    drawStructurePolygon(ctx, [
      [-size * 0.82, size * 0.45],
      [size * 0.82, size * 0.45],
      [size * 0.66, size * 0.7],
      [-size * 0.66, size * 0.7],
    ], hull, outline, lineWidth);
    ctx.strokeStyle = hexAlpha(accent, 0.38);
    ctx.beginPath();
    ctx.moveTo(-size * 0.58, size * 0.49);
    ctx.lineTo(size * 0.58, size * 0.49);
    ctx.stroke();
    return;
  }

  ctx.strokeStyle = 'rgba(165,185,205,0.34)';
  ctx.lineWidth = lineWidth * 1.4;
  ctx.beginPath();
  ctx.moveTo(-size * 0.92, size * 0.48);
  ctx.lineTo(size * 0.92, size * 0.48);
  ctx.stroke();
  drawStructurePolygon(ctx, [
    [-size * 0.42, size * 0.31],
    [size * 0.42, size * 0.31],
    [size * 0.56, size * 0.58],
    [-size * 0.56, size * 0.58],
  ], hull, outline, lineWidth);
}

function drawCivilizationLandmarkStructure(
  ctx: CanvasRenderingContext2D,
  landmark: CivilizationLandmark,
  point: CivilizationLandmarkPoint,
  t: number,
  sceneTier: KardashevTier,
) {
  const color = AFFINITY_META[landmark.affinity].hex;
  const material = LANDMARK_MATERIALS[landmark.affinity];
  const phase = (landmark.seed % 1000) / 1000 * Math.PI * 2;
  const pulse = 0.82 + 0.18 * Math.sin(t * material.pulseSpeed + phase);
  const size = point.size;
  const variant = 0.9 + (landmark.seed % 7) * 0.028;
  const complexity = Math.min(3, Math.max(1, landmark.tier));
  const orbital = sceneTier >= 2;
  const hull = material.hull;
  const outline = 'rgba(168,188,210,0.34)';
  const hardOutline = 'rgba(190,208,224,0.46)';
  const accent = hexAlpha(color, material.trimAlpha);
  const accentDim = hexAlpha(color, material.trimAlpha * 0.42);
  const glass = hexAlpha(color, 0.16 + pulse * 0.08);
  const lightAlpha = material.lightAlpha * pulse;
  const lineWidth = Math.max(0.55, size * 0.035);

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(point.rotation);
  ctx.globalAlpha = sceneTier === 0 ? 0.98 : 0.66 + (point.depth + 1) * 0.15;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawLandmarkPlatform(ctx, size, sceneTier, hull, color, outline, lineWidth);

  switch (landmark.trait) {
    case 'energy': {
      if (orbital) {
        drawRadiatorPanel(ctx, -size * 0.94, -size * 0.16, size * 0.46, size * 0.36, color, lineWidth);
        drawRadiatorPanel(ctx, size * 0.48, -size * 0.16, size * 0.46, size * 0.36, color, lineWidth);
        ctx.strokeStyle = hardOutline;
        ctx.lineWidth = size * 0.16;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        drawStructureLight(ctx, 0, 0, size * 0.14, color, lightAlpha);
      } else {
        for (const side of [-1, 1]) {
          const x = side * size * 0.53;
          drawStructurePolygon(ctx, [
            [x - size * 0.14, size * 0.43],
            [x - size * 0.1, -size * 0.5 * variant],
            [x + size * 0.1, -size * 0.5 * variant],
            [x + size * 0.14, size * 0.43],
          ], hull, outline, lineWidth);
          ctx.strokeStyle = accentDim;
          ctx.beginPath();
          ctx.moveTo(x, -size * 0.49 * variant);
          ctx.lineTo(x, -size * 0.72 * variant);
          ctx.stroke();
        }
        ctx.fillStyle = hull;
        ctx.strokeStyle = hardOutline;
        ctx.fillRect(-size * 0.3, -size * 0.48, size * 0.6, size * 0.92);
        ctx.strokeRect(-size * 0.3, -size * 0.48, size * 0.6, size * 0.92);
        ctx.fillStyle = glass;
        ctx.fillRect(-size * 0.18, -size * 0.3, size * 0.36, size * 0.56);
        drawStructureLight(ctx, 0, -size * 0.02, size * 0.09, color, lightAlpha);
      }
      break;
    }
    case 'ecology': {
      if (orbital) {
        ctx.strokeStyle = hardOutline;
        ctx.lineWidth = size * 0.14;
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.03, size * 0.7, size * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        for (const x of [-0.42, 0, 0.42]) {
          ctx.fillStyle = hexAlpha(color, 0.22);
          ctx.beginPath();
          ctx.arc(size * x, -size * 0.03, size * 0.17, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = outline;
          ctx.stroke();
        }
        ctx.strokeStyle = hardOutline;
        ctx.beginPath();
        ctx.moveTo(-size * 0.95, -size * 0.03);
        ctx.lineTo(size * 0.95, -size * 0.03);
        ctx.stroke();
      } else {
        ctx.fillStyle = hexAlpha(color, 0.11);
        ctx.strokeStyle = hardOutline;
        ctx.lineWidth = lineWidth * 1.3;
        ctx.beginPath();
        ctx.moveTo(-size * 0.78, size * 0.42);
        ctx.quadraticCurveTo(0, -size * 1.02 * variant, size * 0.78, size * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        for (const x of [-0.42, -0.12, 0.18, 0.48]) {
          const towerHeight = size * (0.3 + ((landmark.seed + Math.round(x * 100)) % 4) * 0.08);
          ctx.fillStyle = hull;
          ctx.fillRect(size * x - size * 0.07, size * 0.39 - towerHeight, size * 0.14, towerHeight);
          ctx.fillStyle = accentDim;
          ctx.fillRect(size * x - size * 0.03, size * 0.42 - towerHeight, size * 0.06, towerHeight * 0.72);
        }
        ctx.strokeStyle = accentDim;
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, size * 0.13);
        ctx.quadraticCurveTo(0, -size * 0.42, size * 0.5, size * 0.13);
        ctx.stroke();
      }
      break;
    }
    case 'causality': {
      ctx.fillStyle = hull;
      ctx.strokeStyle = hardOutline;
      ctx.fillRect(-size * 0.16, -size * 0.52, size * 0.32, size * 0.96);
      ctx.strokeRect(-size * 0.16, -size * 0.52, size * 0.32, size * 0.96);
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(0, -size * 0.83 * variant);
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * size * 0.46, -size * (0.12 + (side > 0 ? 0.12 : 0)));
        ctx.rotate(side * 0.36);
        ctx.fillStyle = 'rgba(10,15,23,0.96)';
        ctx.strokeStyle = outline;
        ctx.beginPath();
        ctx.moveTo(-size * 0.28, 0);
        ctx.quadraticCurveTo(0, size * 0.24, size * 0.28, 0);
        ctx.lineTo(0, size * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, size * 0.05);
        ctx.lineTo(0, size * 0.24);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = accentDim;
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.23, size * 0.34, size * 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();
      drawStructureLight(ctx, 0, -size * 0.84 * variant, size * 0.055, color, lightAlpha);
      break;
    }
    case 'transit': {
      if (!orbital) {
        ctx.strokeStyle = 'rgba(100,116,132,0.35)';
        ctx.beginPath();
        ctx.moveTo(-size * 0.18, size * 0.46);
        ctx.lineTo(-size * 0.48, size * 0.9);
        ctx.moveTo(size * 0.18, size * 0.46);
        ctx.lineTo(size * 0.48, size * 0.9);
        ctx.stroke();
      }
      for (const side of [-1, 1]) {
        const x = side * size * 0.56;
        drawStructurePolygon(ctx, [
          [x - size * 0.14, size * 0.43],
          [x - size * 0.1, -size * 0.56 * variant],
          [x + size * 0.1, -size * 0.66 * variant],
          [x + size * 0.16, size * 0.43],
        ], hull, outline, lineWidth);
        drawStructureLight(ctx, x, -size * 0.48 * variant, size * 0.045, color, lightAlpha * 0.8);
      }
      ctx.strokeStyle = hardOutline;
      ctx.lineWidth = size * 0.13;
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.08, size * 0.48, size * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([size * 0.16, size * 0.09]);
      ctx.stroke();
      ctx.setLineDash([]);
      const transitProgress = (t * 0.12 + (landmark.seed % 101) / 101) % 1;
      drawStructureLight(
        ctx,
        -size * 0.35 + size * 0.7 * transitProgress,
        -size * 0.08,
        size * 0.045,
        color,
        lightAlpha,
      );
      break;
    }
    case 'memory': {
      const towerCount = 2 + complexity;
      for (let tower = 0; tower < towerCount; tower += 1) {
        const normalized = towerCount === 1 ? 0 : tower / (towerCount - 1);
        const x = (normalized - 0.5) * size * 1.24;
        const towerHeight = size * (0.54 + ((landmark.seed + tower * 3) % 5) * 0.08);
        const towerWidth = size * (0.2 + ((landmark.seed + tower) % 3) * 0.025);
        drawStructurePolygon(ctx, [
          [x - towerWidth, size * 0.43],
          [x - towerWidth * 0.82, size * 0.43 - towerHeight],
          [x, size * 0.36 - towerHeight],
          [x + towerWidth * 0.82, size * 0.43 - towerHeight],
          [x + towerWidth, size * 0.43],
        ], hull, outline, lineWidth);
        drawWindowGrid(
          ctx,
          x - towerWidth * 0.6,
          size * 0.5 - towerHeight,
          towerWidth * 1.2,
          towerHeight * 0.7,
          2,
          4,
          color,
          landmark.seed + tower,
        );
      }
      ctx.strokeStyle = accentDim;
      ctx.beginPath();
      ctx.moveTo(-size * 0.72, size * 0.18);
      ctx.lineTo(size * 0.72, size * 0.18);
      ctx.stroke();
      drawStructureLight(ctx, 0, -size * 0.68 * variant, size * 0.05, color, lightAlpha);
      break;
    }
    case 'infrastructure': {
      const towers = [
        { x: -0.55, height: 0.63 },
        { x: 0, height: 0.9 * variant },
        { x: 0.55, height: 0.7 },
      ];
      for (const tower of towers) {
        ctx.fillStyle = hull;
        ctx.strokeStyle = outline;
        ctx.fillRect(
          size * (tower.x - 0.13),
          size * (0.43 - tower.height),
          size * 0.26,
          size * tower.height,
        );
        ctx.strokeRect(
          size * (tower.x - 0.13),
          size * (0.43 - tower.height),
          size * 0.26,
          size * tower.height,
        );
        drawWindowGrid(
          ctx,
          size * (tower.x - 0.09),
          size * (0.49 - tower.height),
          size * 0.18,
          size * tower.height * 0.72,
          2,
          4,
          color,
          landmark.seed + Math.round(tower.x * 10),
        );
      }
      for (const height of [-0.05, 0.22]) {
        ctx.strokeStyle = 'rgba(15,20,28,0.96)';
        ctx.lineWidth = size * 0.13;
        ctx.beginPath();
        ctx.moveTo(-size * 0.54, size * height);
        ctx.lineTo(size * 0.54, size * height);
        ctx.stroke();
        ctx.strokeStyle = accentDim;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
      break;
    }
    case 'concealment': {
      ctx.fillStyle = 'rgba(3,5,9,0.46)';
      ctx.beginPath();
      ctx.moveTo(-size * 0.92, size * 0.38);
      ctx.lineTo(0, -size * 0.96);
      ctx.lineTo(size * 0.92, size * 0.38);
      ctx.closePath();
      ctx.fill();
      for (const side of [-1, 0, 1]) {
        const x = side * size * 0.58;
        const mastHeight = size * (0.58 + (side === 0 ? 0.24 : 0));
        drawStructurePolygon(ctx, [
          [x - size * 0.1, size * 0.43],
          [x - size * 0.04, size * 0.43 - mastHeight],
          [x + size * 0.04, size * 0.43 - mastHeight],
          [x + size * 0.1, size * 0.43],
        ], '#0a0b11', 'rgba(94,105,126,0.35)', lineWidth);
        ctx.strokeStyle = accentDim;
        ctx.beginPath();
        ctx.arc(x, size * 0.4 - mastHeight, size * 0.15, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
        drawStructureLight(ctx, x, size * 0.42 - mastHeight, size * 0.035, color, lightAlpha * 0.55);
      }
      break;
    }
    case 'containment': {
      if (orbital) {
        ctx.fillStyle = hull;
        ctx.strokeStyle = hardOutline;
        ctx.lineWidth = lineWidth;
        ctx.fillRect(-size * 0.58, -size * 0.35, size * 1.16, size * 0.7);
        ctx.strokeRect(-size * 0.58, -size * 0.35, size * 1.16, size * 0.7);
        for (const x of [-0.38, 0, 0.38]) {
          ctx.strokeStyle = outline;
          ctx.lineWidth = size * 0.1;
          ctx.beginPath();
          ctx.moveTo(size * x, -size * 0.42);
          ctx.lineTo(size * x, size * 0.42);
          ctx.stroke();
        }
        ctx.fillStyle = glass;
        ctx.fillRect(-size * 0.15, -size * 0.22, size * 0.3, size * 0.44);
        drawStructureLight(ctx, 0, 0, size * 0.06, color, lightAlpha);
      } else {
        drawStructurePolygon(ctx, [
          [-size * 0.82, size * 0.42],
          [-size * 0.62, -size * 0.28],
          [-size * 0.36, -size * 0.5 * variant],
          [size * 0.36, -size * 0.5 * variant],
          [size * 0.62, -size * 0.28],
          [size * 0.82, size * 0.42],
        ], '#14181e', hardOutline, lineWidth * 1.2);
        for (const side of [-1, 1]) {
          ctx.strokeStyle = outline;
          ctx.lineWidth = size * 0.1;
          ctx.beginPath();
          ctx.moveTo(side * size * 0.55, -size * 0.27);
          ctx.lineTo(side * size * 0.68, size * 0.4);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(3,6,10,0.92)';
        ctx.strokeStyle = accent;
        ctx.lineWidth = lineWidth;
        ctx.fillRect(-size * 0.25, -size * 0.16, size * 0.5, size * 0.58);
        ctx.strokeRect(-size * 0.25, -size * 0.16, size * 0.5, size * 0.58);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.12);
        ctx.lineTo(0, size * 0.38);
        ctx.stroke();
        drawStructureLight(ctx, 0, size * 0.11, size * 0.045, color, lightAlpha * 0.75);
      }
      break;
    }
    case 'fabrication': {
      ctx.strokeStyle = hardOutline;
      ctx.lineWidth = size * 0.12;
      ctx.beginPath();
      ctx.moveTo(-size * 0.68, size * 0.42);
      ctx.lineTo(-size * 0.68, -size * 0.46 * variant);
      ctx.lineTo(size * 0.68, -size * 0.46 * variant);
      ctx.lineTo(size * 0.68, size * 0.42);
      ctx.stroke();
      ctx.strokeStyle = accentDim;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(-size * 0.58, -size * 0.31 * variant);
      ctx.lineTo(size * 0.58, -size * 0.31 * variant);
      ctx.stroke();
      ctx.fillStyle = hull;
      ctx.strokeStyle = outline;
      ctx.fillRect(-size * 0.34, -size * 0.18, size * 0.68, size * 0.6);
      ctx.strokeRect(-size * 0.34, -size * 0.18, size * 0.68, size * 0.6);
      for (const side of [-1, 1]) {
        ctx.fillStyle = 'rgba(10,14,20,0.96)';
        ctx.fillRect(side * size * 0.52 - size * 0.13, size * 0.14, size * 0.26, size * 0.22);
        ctx.strokeRect(side * size * 0.52 - size * 0.13, size * 0.14, size * 0.26, size * 0.22);
      }
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.02);
      ctx.lineTo(size * 0.2, -size * 0.02);
      ctx.stroke();
      drawStructureLight(ctx, 0, size * 0.2, size * 0.055, color, lightAlpha);
      break;
    }
    case 'accord': {
      drawStructurePolygon(ctx, [
        [-size * 0.75, size * 0.42],
        [-size * 0.67, -size * 0.48 * variant],
        [-size * 0.38, -size * 0.68 * variant],
        [-size * 0.27, size * 0.42],
      ], hull, outline, lineWidth);
      drawStructurePolygon(ctx, [
        [size * 0.27, size * 0.42],
        [size * 0.38, -size * 0.68 * variant],
        [size * 0.67, -size * 0.48 * variant],
        [size * 0.75, size * 0.42],
      ], hull, outline, lineWidth);
      drawWindowGrid(ctx, -size * 0.62, -size * 0.38, size * 0.22, size * 0.58, 2, 4, color, landmark.seed);
      drawWindowGrid(ctx, size * 0.4, -size * 0.38, size * 0.22, size * 0.58, 2, 4, color, landmark.seed + 1);
      ctx.strokeStyle = 'rgba(20,25,33,0.96)';
      ctx.lineWidth = size * 0.13;
      ctx.beginPath();
      ctx.moveTo(-size * 0.4, -size * 0.05);
      ctx.lineTo(size * 0.4, -size * 0.05);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.fillStyle = glass;
      ctx.strokeStyle = hardOutline;
      ctx.beginPath();
      ctx.moveTo(-size * 0.27, size * 0.4);
      ctx.quadraticCurveTo(0, -size * 0.19, size * 0.27, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'reclamation': {
      for (const x of [-0.66, -0.48, 0.48, 0.66]) {
        ctx.fillStyle = hull;
        ctx.strokeStyle = outline;
        ctx.fillRect(size * x - size * 0.07, -size * 0.29, size * 0.14, size * 0.64);
        ctx.strokeRect(size * x - size * 0.07, -size * 0.29, size * 0.14, size * 0.64);
      }
      ctx.fillStyle = hull;
      ctx.strokeStyle = hardOutline;
      ctx.fillRect(-size * 0.38, -size * 0.5 * variant, size * 0.76, size * (0.93 + 0.5 * (variant - 1)));
      ctx.strokeRect(-size * 0.38, -size * 0.5 * variant, size * 0.76, size * (0.93 + 0.5 * (variant - 1)));
      for (let vent = 0; vent < 3; vent += 1) {
        const y = -size * 0.28 + vent * size * 0.22;
        ctx.fillStyle = hexAlpha(color, 0.18 + pulse * 0.14);
        ctx.fillRect(-size * 0.24, y, size * 0.48, size * 0.09);
      }
      if (orbital) {
        drawRadiatorPanel(ctx, -size * 1.02, -size * 0.2, size * 0.5, size * 0.42, color, lineWidth);
        drawRadiatorPanel(ctx, size * 0.52, -size * 0.2, size * 0.5, size * 0.42, color, lineWidth);
      }
      drawStructureLight(ctx, 0, size * 0.02, size * 0.07, color, lightAlpha);
      break;
    }
    case 'boundary_science': {
      for (const side of [-1, 1]) {
        const x = side * size * 0.63;
        drawStructurePolygon(ctx, [
          [x - size * 0.14, size * 0.43],
          [x - size * 0.1, -size * 0.43],
          [x + size * 0.1, -size * 0.43],
          [x + size * 0.14, size * 0.43],
        ], hull, outline, lineWidth);
      }
      ctx.strokeStyle = hardOutline;
      ctx.lineWidth = size * 0.17;
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.07, size * 0.51, size * 0.62 * variant, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = lineWidth * 1.4;
      ctx.setLineDash([size * 0.2, size * 0.09]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(1,2,5,0.96)';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.07, size * 0.38, size * 0.48 * variant, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accentDim;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(-size * 0.62, -size * 0.3);
      ctx.lineTo(size * 0.62, -size * 0.3);
      ctx.stroke();
      drawStructureLight(ctx, 0, -size * (0.07 + 0.48 * variant), size * 0.045, color, lightAlpha * 0.8);
      break;
    }
  }

  if (landmark.tier >= 2) {
    const antennaX = ((landmark.seed % 5) - 2) * size * 0.12;
    ctx.beginPath();
    ctx.moveTo(antennaX, -size * 0.56);
    ctx.lineTo(antennaX, -size * 0.85);
    ctx.strokeStyle = outline;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    drawStructureLight(ctx, antennaX, -size * 0.87, size * 0.035, color, lightAlpha * 0.65);
  }

  ctx.restore();
}

function drawCivilizationLandmarks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  tier: KardashevTier,
  profile: CivilizationProfile,
  palette: AffinityPalette,
) {
  if (profile.landmarks.length === 0) return;
  const minDimension = Math.min(w, h);
  const visibleLimit = minDimension < 170 ? 3 : minDimension < 260 ? 4 : 6;
  const landmarks = profile.landmarks.slice(0, visibleLimit);
  const points = landmarks.map((landmark, index) => (
    getCivilizationLandmarkPoint(landmark, tier, index, landmarks.length, w, h, t)
  ));
  const connectedTraits: CivilizationTrait[] = ['transit', 'infrastructure', 'accord', 'memory'];
  const connectionWeight = connectedTraits.reduce(
    (sum, trait) => sum + profile.traitWeights[trait],
    0,
  );

  if (points.length > 1 && connectionWeight > 0) {
    ctx.save();
    const orderedPoints = tier === 0 ? [...points].sort((left, right) => left.x - right.x) : points;
    ctx.strokeStyle = hexAlpha(palette.primary, Math.min(0.18, 0.05 + connectionWeight * 0.003));
    ctx.lineWidth = Math.max(0.6, minDimension * 0.0025);
    for (let index = 0; index < orderedPoints.length - (tier === 0 ? 1 : 0); index += 1) {
      const current = orderedPoints[index]!;
      const next = orderedPoints[(index + 1) % orderedPoints.length]!;
      ctx.beginPath();
      if (tier === 0) {
        ctx.moveTo(current.x, current.y + current.size * 0.64);
        ctx.quadraticCurveTo(
          (current.x + next.x) * 0.5,
          h * 0.88,
          next.x,
          next.y + next.size * 0.64,
        );
      } else {
        ctx.moveTo(current.x, current.y);
        ctx.quadraticCurveTo(w * 0.5, h * 0.5, next.x, next.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  landmarks.forEach((landmark, index) => {
    drawCivilizationLandmarkStructure(ctx, landmark, points[index]!, t, tier);
  });
}

// ── Per-tier render functions ────────────────────────────────────────────────

function renderTier0(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
  profile: CivilizationProfile,
  palette: AffinityPalette,
) {
  drawBackground(ctx, w, h, 0);
  drawStars(ctx, w, h, t, stars);
  drawMoon(ctx, w, h, t);
  drawHorizonGlow(ctx, w, h);
  drawCivilizationLandmarks(ctx, w, h, t, 0, profile, palette);
}

function renderTier1(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
  patches: PlanetPatch[],
  palette: AffinityPalette,
  secondaryColor: string | null,
  cityLights: CityLight[],
  progressFraction: number,
  profile: CivilizationProfile,
) {
  drawBackground(ctx, w, h, 1);
  drawStars(ctx, w, h, t, stars, 0.55);
  const pr = Math.min(w, h) * 0.265;
  drawPlanet(ctx, w * 0.5, h * 0.52, pr, t, palette, patches, secondaryColor, cityLights, progressFraction);
  drawCivilizationLandmarks(ctx, w, h, t, 1, profile, palette);
}

function renderTier2(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
  orbits: OrbitPlanet[],
  dysonSwarm: DysonSatellite[],
  palette: AffinityPalette,
  secondaryColor: string | null,
  progressFraction: number,
  bornAt: Float32Array,
  profile: CivilizationProfile,
) {
  drawBackground(ctx, w, h, 2);
  drawStars(ctx, w, h, t, stars, 0.42);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const systemScale = Math.min(2.45, Math.max(1.15, Math.min(w, h) / 230));
  const scaledOrbits = orbits.map((orbit) => ({
    ...orbit,
    orbitR: orbit.orbitR * systemScale,
    radius: orbit.radius * systemScale,
  }));

  for (const o of scaledOrbits) drawOrbitPath(ctx, cx, cy, o);
  drawStar(ctx, cx, cy, t, systemScale);
  // Dyson swarm sits just outside the star glow, inside the innermost planet orbit
  drawDysonSwarm(ctx, cx, cy, t, dysonSwarm, palette, progressFraction, bornAt, systemScale);
  // Draw planets back-to-front (further first using y-sorted trick with orbit angle)
  const sortedOrbits = [...scaledOrbits].sort((a, b) => {
    const ay = Math.sin(a.angle0 + a.angSpd * t);
    const by = Math.sin(b.angle0 + b.angSpd * t);
    return ay - by;
  });
  // Identify the outermost orbit so we can tint it in the secondary affinity color
  const maxOrbitR = Math.max(...scaledOrbits.map((o) => o.orbitR));
  for (const o of sortedOrbits) {
    drawOrbitPlanet(ctx, cx, cy, o, t, palette, secondaryColor, o.orbitR === maxOrbitR);
  }
  drawCivilizationLandmarks(ctx, w, h, t, 2, profile, palette);
}

function renderTier3(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
  galaxyPoints: GalaxyPoint[],
  palette: AffinityPalette,
  secondaryColor: string | null,
  progressFraction: number,
  profile: CivilizationProfile,
) {
  drawBackground(ctx, w, h, 3);
  drawStars(ctx, w, h, t, stars, 0.3);
  const scale = Math.min(w, h) * 0.47;
  drawGalaxy(ctx, w * 0.5, h * 0.5, t, galaxyPoints, palette, scale, secondaryColor, progressFraction);
  drawCivilizationLandmarks(ctx, w, h, t, 3, profile, palette);
}

// ── Error boundary ───────────────────────────────────────────────────────────
interface EBState { error: boolean }
class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EBState
> {
  state: EBState = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="h-[220px] rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center">
          <span className="text-xs text-white/20">observatory offline</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Inner canvas component ───────────────────────────────────────────────────
interface KardashevCanvasProps {
  tier: KardashevTier;
  palette: AffinityPalette;
  profile: CivilizationProfile;
  /** 0–1 fraction of advancement within the current tier.
   *  - Tier 1: interpolates night-side city-light dot count (0 → ~80).
   *  - Tier 2: interpolates Dyson swarm density (satellite count + arc span).
   *  - Tiers 0 and 3: ignored.
   *  Defaults to 1 (full density / fully lit). */
  progressFraction?: number;
  /** Draw one stable frame and stop the RAF loop. Used under full-screen cinematics. */
  paused?: boolean;
  /** Optional frame-rate cap for decorative/background scene instances. */
  fps?: number;
  /** Optional device-pixel-ratio cap for decorative/background scene instances. */
  maxDpr?: number;
  /** Allows the RAF loop during a short, controlled mobile cinematic. */
  allowMobileMotion?: boolean;
}

const TIER_LABELS: Record<KardashevTier, string> = {
  0: 'Terrestrial',
  1: 'Planetary',
  2: 'Stellar',
  3: 'Galactic',
};

function KardashevCanvas({
  tier,
  palette,
  profile,
  progressFraction = 1,
  paused = false,
  fps,
  maxDpr = 2,
  allowMobileMotion = false,
}: KardashevCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  const runtime = useRuntimePerformanceState();
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const frameCountRef = useRef(0);
  const lastRenderAtRef = useRef(0);
  const palettePrimary = palette.primary;
  const paletteSecondary = palette.secondary;
  const paletteAccent = palette.accent;
  const stablePalette = useMemo(
    () => ({ primary: palettePrimary, secondary: paletteSecondary, accent: paletteAccent }),
    [palettePrimary, paletteSecondary, paletteAccent],
  );
  const civilizationSeed = profile.artifactCount > 0 ? profile.seed : 0;
  const organicWeight = profile.traitCounts.ecology + profile.traitCounts.fabrication;
  const networkWeight = (
    profile.traitCounts.transit +
    profile.traitCounts.infrastructure +
    profile.traitCounts.accord
  );
  const patchCount = Math.min(10, 6 + Math.floor(organicWeight / 2));
  const orbitCount = Math.min(5, 3 + Math.floor(networkWeight / 3));
  const galaxyArmCount = networkWeight >= 5 ? 4 : networkWeight >= 2 ? 3 : 2;

  // Generate stable scene data (seeded, won't change between renders).
  // dysonSwarm is always generated at max count (60); drawDysonSwarm slices it.
  // On mobile, use a reduced geometry budget to stay within GPU/CPU limits.
  const stars = useMemo(
    () => genStars(seededRng(mixSceneSeed(42, civilizationSeed)), isMobile ? 145 : 360),
    [civilizationSeed, isMobile],
  );
  const galaxyPoints = useMemo(() => {
    const all = genGalaxy(
      seededRng(mixSceneSeed(137, civilizationSeed)),
      galaxyArmCount,
    );
    return isMobile ? all.slice(0, 210) : all;
  }, [civilizationSeed, galaxyArmCount, isMobile]);
  const patches = useMemo(
    () => genPlanetPatches(seededRng(mixSceneSeed(99, civilizationSeed)), patchCount),
    [civilizationSeed, patchCount],
  );
  const orbits = useMemo(
    () => genOrbits(seededRng(mixSceneSeed(77, civilizationSeed)), orbitCount),
    [civilizationSeed, orbitCount],
  );
  const dysonSwarm = useMemo(
    () => genDysonSwarm(seededRng(mixSceneSeed(13, civilizationSeed)), 60),
    [civilizationSeed],
  );
  // Always generated at max count (80 desktop / 32 mobile); drawCityLights slices based on progressFraction
  const cityLights = useMemo(
    () => genCityLights(
      seededRng(mixSceneSeed(55, civilizationSeed)),
      isMobile ? 32 : 80,
    ),
    [civilizationSeed, isMobile],
  );

  // Per-slot born-timestamps for Dyson swarm fade-in.
  // Initialized to a large negative value so all pre-existing satellites resolve
  // to fadeAlpha = 1 immediately (no fade on first render).
  // When progressFraction increases and new slots cross the visibility boundary,
  // the render loop stamps those indices with the current animation time `t`.
  const bornAtRef = useRef<Float32Array>(new Float32Array(SWARM_MAX).fill(-1000));
  const prevVisibleCountRef = useRef<number>(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, maxDpr);

    const syncSize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
    };
    syncSize();

    let rafId = 0;
    const startTime = performance.now();

    // Guard: bornAt is sized to SWARM_MAX; assert it matches the generated array
    // so a future change to genDysonSwarm's count is caught immediately in dev.
    if (import.meta.env.DEV && dysonSwarm.length !== SWARM_MAX) {
      console.error(
        `[KardashevScene] dysonSwarm.length (${dysonSwarm.length}) !== SWARM_MAX (${SWARM_MAX})` +
        ' — update SWARM_MAX to match genDysonSwarm count or bornAt will be incorrectly sized',
      );
    }

    const secondaryColor = getSecondaryAffinityColor(stablePalette);
    const clampedFraction = Math.min(1, Math.max(0, progressFraction));

    const shouldAnimate = !paused
      && runtime.visible
      && (!runtime.mobile || allowMobileMotion);
    const minFrameMs = shouldAnimate && fps && fps > 0 ? 1000 / fps : 0;

    const render = (now: number) => {
      if (shouldAnimate && minFrameMs > 0 && now - lastRenderAtRef.current < minFrameMs) {
        rafId = requestAnimationFrame(render);
        return;
      }
      lastRenderAtRef.current = now;

      // On mobile skip every other frame to halve the GPU workload.
      if (shouldAnimate && isMobileRef.current) {
        frameCountRef.current++;
        if (frameCountRef.current % 2 !== 0) {
          rafId = requestAnimationFrame(render);
          return;
        }
      }
      syncSize();
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const t = (now - startTime) / 1000;

      // Track which satellite slots are newly visible and stamp their born-time.
      // On the first frame (prevVisibleCountRef = -1) we skip stamping so all
      // initially-visible satellites appear at full alpha without a fade-in.
      if (tier === 2) {
        const visibleNow = Math.round(SWARM_MIN + (SWARM_MAX - SWARM_MIN) * clampedFraction);
        const prev = prevVisibleCountRef.current;
        if (prev >= 0 && visibleNow > prev) {
          for (let i = prev; i < visibleNow; i++) {
            bornAtRef.current[i] = t;
          }
        }
        prevVisibleCountRef.current = visibleNow;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (tier === 0) renderTier0(ctx, w, h, t, stars, profile, stablePalette);
      else if (tier === 1) renderTier1(ctx, w, h, t, stars, patches, stablePalette, secondaryColor, cityLights, clampedFraction, profile);
      else if (tier === 2) renderTier2(ctx, w, h, t, stars, orbits, isMobileRef.current ? [] : dysonSwarm, stablePalette, secondaryColor, clampedFraction, bornAtRef.current, profile);
      else renderTier3(ctx, w, h, t, stars, galaxyPoints, stablePalette, secondaryColor, clampedFraction, profile);

      if (shouldAnimate) {
        rafId = requestAnimationFrame(render);
      }
    };

    if (shouldAnimate) {
      rafId = requestAnimationFrame(render);
    } else {
      render(performance.now());
    }
    return () => cancelAnimationFrame(rafId);
  }, [tier, stablePalette, profile, progressFraction, paused, fps, maxDpr, allowMobileMotion, runtime.mobile, runtime.visible, stars, galaxyPoints, patches, orbits, dysonSwarm, cityLights]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />
      {/* Tier label */}
      <div
        className="absolute bottom-2 right-3 text-[9px] font-mono tracking-widest uppercase select-none pointer-events-none"
        style={{ color: 'rgba(180,200,255,0.28)' }}
      >
        {TIER_LABELS[tier]}
      </div>
    </>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
export interface KardashevSceneProps {
  tier: KardashevTier;
  palette: AffinityPalette;
  /** Forged-artifact signature that shapes scene geometry and landmarks. */
  profile?: CivilizationProfile;
  className?: string;
  /** 0–1 fraction of advancement within the current tier.
   *  - Tier 1: interpolates night-side city-light dot count (0 → ~80).
   *  - Tier 2: interpolates Dyson swarm density (satellite count + arc span).
   *  - Tiers 0 and 3: ignored.
   *  Defaults to 1 (full density / fully lit). */
  progressFraction?: number;
  /** Stops the internal canvas RAF and removes scene crossfade motion. */
  paused?: boolean;
  /** Optional frame-rate cap for decorative/background scene instances. */
  fps?: number;
  /** Optional device-pixel-ratio cap for decorative/background scene instances. */
  maxDpr?: number;
  /** Keeps this scene animated on mobile when it is itself a controlled cinematic. */
  allowMobileMotion?: boolean;
}

export function KardashevScene({
  tier,
  palette,
  profile = EMPTY_CIVILIZATION_PROFILE,
  className,
  progressFraction,
  paused = false,
  fps,
  maxDpr,
  allowMobileMotion = false,
}: KardashevSceneProps) {
  const voidRadianceEquipped = useCosmetics().equippedItemIds.civilization_ambience ===
    'cosmetic.civilizationAmbience.voidRadianceObservatory.v1';
  const runtime = useRuntimePerformanceState();
  const runtimePaused = paused || !runtime.visible || (runtime.mobile && !allowMobileMotion);
  const civName = getCivilizationName(palette, tier);
  const civKey = `${tier}-${palette.primary}-${palette.secondary}`;
  const sceneKey = `${tier}-${profile.key}`;
  const secondaryColor = getSecondaryAffinityColor(palette);

  // Dual-affinity: two stacked inset rings — 1 px of primary color, then 1 px of secondary.
  // Single-affinity: no special ring.
  const ringBoxShadow = secondaryColor
    ? `inset 0 0 0 1px ${hexAlpha(palette.primary, 0.45)}, inset 0 0 0 2px ${hexAlpha(secondaryColor, 0.3)}`
    : undefined;

  return (
    <SceneErrorBoundary>
      <div
        className={className ?? "relative h-[220px] rounded-2xl overflow-hidden bg-black"}
        data-cosmetic-ambience={voidRadianceEquipped ? "void-radiance-observatory" : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sceneKey}
            className="absolute inset-0"
            initial={runtimePaused ? false : { opacity: 0, scale: 0.97 }}
            animate={runtimePaused ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
            exit={runtimePaused ? undefined : { opacity: 0, scale: 1.03 }}
            transition={runtimePaused ? { duration: 0 } : { duration: TIER_CROSSFADE_DURATION_S, ease: 'easeInOut' }}
          >
            <KardashevCanvas
              tier={tier}
              palette={palette}
              profile={profile}
              progressFraction={progressFraction}
              paused={runtimePaused}
              fps={fps}
              maxDpr={maxDpr}
              allowMobileMotion={allowMobileMotion}
            />
          </motion.div>
        </AnimatePresence>

        {voidRadianceEquipped && (
          <div className="civ-ambience-void-radiance" aria-hidden="true">
            <span className="civ-ambience-aurora civ-ambience-aurora--left" />
            <span className="civ-ambience-aurora civ-ambience-aurora--right" />
            <span className="civ-ambience-observatory">
              <span className="civ-ambience-observatory-core" />
              <span className="civ-ambience-observatory-orbit civ-ambience-observatory-orbit--outer" />
              <span className="civ-ambience-observatory-orbit civ-ambience-observatory-orbit--inner" />
            </span>
          </div>
        )}

        {/* Civilization name — crossfades on tier or dominant affinity change */}
        <AnimatePresence initial={false}>
          <motion.div
            key={civKey}
            className="absolute bottom-2 left-3 text-[9px] font-mono tracking-widest uppercase select-none pointer-events-none"
            style={{ color: 'rgba(180,200,255,0.28)' }}
            initial={runtimePaused ? false : { opacity: 0 }}
            animate={runtimePaused ? { opacity: 1 } : { opacity: 1, transition: { delay: CIV_LABEL_DELAY_S, duration: CIV_LABEL_DURATION_S, ease: 'easeInOut' } }}
            exit={runtimePaused ? undefined : { opacity: 0, transition: { duration: CIV_LABEL_EXIT_S, ease: 'easeInOut' } }}
          >
            {civName}
          </motion.div>
        </AnimatePresence>

        {/* Dual-affinity accent ring — fades in/out when dual-affinity status changes.
            The key includes `tier` so the ring exits and re-enters with every tier
            crossfade (preventing it from sitting at full opacity while the new scene
            fades in beneath it), and encodes the palette colors so a color-only shift
            while dual-affinity is already active also crossfades rather than snapping. */}
        <AnimatePresence initial={false}>
          {ringBoxShadow && (
            <motion.div
              key={`accent-ring-${tier}-${palette.primary}-${secondaryColor ?? ''}`}
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ boxShadow: ringBoxShadow }}
              initial={paused ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={paused ? undefined : { opacity: 0 }}
              transition={paused ? { duration: 0 } : { duration: CIV_LABEL_DURATION_S, delay: CIV_LABEL_DELAY_S, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
      </div>
    </SceneErrorBoundary>
  );
}
