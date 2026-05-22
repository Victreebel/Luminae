import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { KardashevTier, AffinityPalette } from '@/lib/kardashev';
import { getCivilizationName } from '@/lib/kardashev';

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

function genGalaxy(rng: () => number): GalaxyPoint[] {
  const pts: GalaxyPoint[] = [];
  const arms = 2;
  const perArm = 220;
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

function genPlanetPatches(rng: () => number): PlanetPatch[] {
  return Array.from({ length: 6 }, (_, i) => ({
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
    radius:  5 + rng() * 7,
    colorIdx: i % 3,
  }));
}

// ── Drawing primitives ───────────────────────────────────────────────────────

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

  // Moon disc
  const disc = ctx.createRadialGradient(mx - mr * 0.25, my - mr * 0.25, mr * 0.05, mx, my, mr);
  disc.addColorStop(0, 'rgba(235,245,255,0.96)');
  disc.addColorStop(0.6, 'rgba(200,220,245,0.92)');
  disc.addColorStop(0.9, 'rgba(150,170,210,0.85)');
  disc.addColorStop(1, 'rgba(100,120,170,0.7)');
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();

  // Subtle craters
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

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  t: number,
  palette: AffinityPalette,
  patches: PlanetPatch[],
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

  // Surface patches (scroll = rotation)
  const scroll = (t * 0.22) % (radius * 2);
  ctx.globalAlpha = 0.55;
  for (const p of patches) {
    const px = cx + p.dx * radius + scroll;
    const py = cy + p.dy * radius;
    const bright = p.hue > 0 ? palette.accent : palette.secondary;
    ctx.fillStyle = hexAlpha(bright, 0.7);
    // Draw patch and two wrapped copies
    for (const xoff of [-radius * 2, 0, radius * 2]) {
      ctx.beginPath();
      ctx.ellipse(px + xoff, py, p.rx * radius, p.ry * radius, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

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

  ctx.restore();

  // Thin atmosphere rim
  const rim = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.04);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(0.7, hexAlpha(palette.accent, 0.18));
  rim.addColorStop(1, hexAlpha(palette.accent, 0.35));
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.04, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  t: number,
) {
  const pulse = 1 + 0.06 * Math.sin(t * 1.8);
  const coreR = 10 * pulse;
  const glowR = 58 * pulse;

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
) {
  const angle = orbit.angle0 + orbit.angSpd * t;
  const px = cx + Math.cos(angle) * orbit.orbitR;
  const py = cy + Math.sin(angle) * orbit.orbitR * 0.48;

  const colors = [palette.primary, palette.secondary, palette.accent];
  const col = colors[orbit.colorIdx % colors.length] ?? palette.primary;

  // Tiny atmosphere glow
  const glo = ctx.createRadialGradient(px, py, orbit.radius * 0.5, px, py, orbit.radius * 2.2);
  glo.addColorStop(0, hexAlpha(col, 0.4));
  glo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(px, py, orbit.radius * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = glo;
  ctx.fill();

  // Planet disc
  const disc = ctx.createRadialGradient(
    px - orbit.radius * 0.3, py - orbit.radius * 0.3, 0,
    px, py, orbit.radius,
  );
  disc.addColorStop(0, hexAlpha(palette.accent, 0.95));
  disc.addColorStop(0.5, hexAlpha(col, 0.90));
  disc.addColorStop(1, hexAlpha(palette.secondary, 0.75));
  ctx.beginPath();
  ctx.arc(px, py, orbit.radius, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();
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

function drawGalaxy(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  t: number,
  points: GalaxyPoint[],
  palette: AffinityPalette,
  scale: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.018);

  // Nebula glow behind arms
  const neb = ctx.createRadialGradient(0, 0, scale * 0.04, 0, 0, scale * 0.52);
  neb.addColorStop(0, hexAlpha(palette.primary, 0.25));
  neb.addColorStop(0.3, hexAlpha(palette.secondary, 0.12));
  neb.addColorStop(0.65, hexAlpha(palette.accent, 0.05));
  neb.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(0, 0, scale * 0.52, scale * 0.30, 0, 0, Math.PI * 2);
  ctx.fillStyle = neb;
  ctx.fill();

  // Arm particles
  for (const p of points) {
    const ax = p.x * scale;
    const ay = p.y * scale;
    const frac = Math.sqrt(p.x * p.x + p.y * p.y) / 0.5;
    const col = frac < 0.3
      ? hexAlpha(palette.accent, p.alpha)
      : frac < 0.65
        ? hexAlpha(palette.primary, p.alpha * 0.85)
        : hexAlpha(palette.secondary, p.alpha * 0.65);
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

// ── Per-tier render functions ────────────────────────────────────────────────

function renderTier0(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
) {
  drawBackground(ctx, w, h, 0);
  drawStars(ctx, w, h, t, stars);
  drawMoon(ctx, w, h, t);
  drawHorizonGlow(ctx, w, h);
}

function renderTier1(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
  patches: PlanetPatch[],
  palette: AffinityPalette,
) {
  drawBackground(ctx, w, h, 1);
  drawStars(ctx, w, h, t, stars, 0.55);
  const pr = Math.min(w, h) * 0.265;
  drawPlanet(ctx, w * 0.5, h * 0.52, pr, t, palette, patches);
}

function renderTier2(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
  orbits: OrbitPlanet[],
  palette: AffinityPalette,
) {
  drawBackground(ctx, w, h, 2);
  drawStars(ctx, w, h, t, stars, 0.42);
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (const o of orbits) drawOrbitPath(ctx, cx, cy, o);
  drawStar(ctx, cx, cy, t);
  // Draw planets back-to-front (further first using y-sorted trick with orbit angle)
  const sortedOrbits = [...orbits].sort((a, b) => {
    const ay = Math.sin(a.angle0 + a.angSpd * t);
    const by = Math.sin(b.angle0 + b.angSpd * t);
    return ay - by;
  });
  for (const o of sortedOrbits) drawOrbitPlanet(ctx, cx, cy, o, t, palette);
}

function renderTier3(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  stars: Star[],
  galaxyPoints: GalaxyPoint[],
  palette: AffinityPalette,
) {
  drawBackground(ctx, w, h, 3);
  drawStars(ctx, w, h, t, stars, 0.3);
  const scale = Math.min(w, h) * 0.47;
  drawGalaxy(ctx, w * 0.5, h * 0.5, t, galaxyPoints, palette, scale);
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
}

const TIER_LABELS: Record<KardashevTier, string> = {
  0: 'Terrestrial',
  1: 'Planetary',
  2: 'Stellar',
  3: 'Galactic',
};

function KardashevCanvas({ tier, palette }: KardashevCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate stable scene data (seeded, won't change between renders)
  const stars = useMemo(() => genStars(seededRng(42), 360), []);
  const galaxyPoints = useMemo(() => genGalaxy(seededRng(137)), []);
  const patches = useMemo(() => genPlanetPatches(seededRng(99)), []);
  const orbits = useMemo(() => genOrbits(seededRng(77), 3), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

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

    const render = (now: number) => {
      syncSize();
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const t = (now - startTime) / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (tier === 0) renderTier0(ctx, w, h, t, stars);
      else if (tier === 1) renderTier1(ctx, w, h, t, stars, patches, palette);
      else if (tier === 2) renderTier2(ctx, w, h, t, stars, orbits, palette);
      else renderTier3(ctx, w, h, t, stars, galaxyPoints, palette);

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [tier, palette, stars, galaxyPoints, patches, orbits]);

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
}

export function KardashevScene({ tier, palette }: KardashevSceneProps) {
  const civName = getCivilizationName(palette, tier);
  const civKey = `${tier}-${palette.primary}-${palette.secondary}`;

  return (
    <SceneErrorBoundary>
      <div className="relative h-[220px] rounded-2xl overflow-hidden bg-black">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tier}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeInOut' }}
          >
            <KardashevCanvas tier={tier} palette={palette} />
          </motion.div>
        </AnimatePresence>

        {/* Civilization name — crossfades on tier or dominant affinity change */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={civKey}
            className="absolute bottom-2 left-3 text-[9px] font-mono tracking-widest uppercase select-none pointer-events-none"
            style={{ color: 'rgba(180,200,255,0.28)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            {civName}
          </motion.div>
        </AnimatePresence>
      </div>
    </SceneErrorBoundary>
  );
}
