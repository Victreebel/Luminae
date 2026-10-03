import { useEffect, useLayoutEffect, useRef } from "react";

interface ForgeMoltenSurfaceProps {
  durationMs: number;
  delayMs: number;
  primary: string;
  secondary: string;
  width: number;
  height: number;
  seed?: string | number;
  /** Let a presentation clock suspend condensation without rebuilding its GPU material. */
  paused?: boolean;
  /** Resume a newly mounted surface when its owning mold DOM node was replaced. */
  initialElapsedMs?: number;
}

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * .5 + .5;
    gl_Position = vec4(aPosition, 0., 1.);
  }
`;

const FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  varying vec2 vUv;
  uniform float uProgress;
  uniform vec2 uSize;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec2 uSeed;

  float gaussian(float x) { return exp(-x * x); }

  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * .1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
               mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
  }

  // The domain moves through a few broad eddies. There is no rigid rotation
  // of the surface: the clouds, wisps and near stars share these currents.
  vec2 flow(vec2 p, float t) {
    vec2 q = p + vec2(.16 * t, -.12 * t);
    q += .39 * sin(vec2(p.y * 1.9 - t, p.x * 1.6 + .7 * t));
    q += .3 * vec2(noise(p * .9 + vec2(t * .12, 4.2)),
                  noise(p * .9 + vec2(9.1, -t * .14)));
    return q;
  }

  // Subpixel star cores and a soft halo, carried by the same flow as the mist.
  float starlight(vec2 p, float seed) {
    vec2 cell = floor(p);
    vec2 offset = vec2(hash(cell + seed), hash(cell + seed + 7.3));
    vec2 delta = fract(p) - (.18 + offset * .64);
    float strength = hash(cell + seed + 19.1);
    float radius = .04 + strength * .035;
    float distanceSquared = dot(delta, delta);
    float core = exp(-distanceSquared / (radius * radius));
    float halo = exp(-distanceSquared / .035) * .12;
    return (core + halo) * smoothstep(.87, .99, strength);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - .5) * vec2(3.1, 3.1 * uSize.y / uSize.x);
    float edge = min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y)) * 2.;
    edge = clamp(edge + (noise(p * 3.8 + vec2(7.3, 1.8)) - .5) * .06, 0., 1.);
    // Condensation overlaps the reveal; there is no pause between materials.
    float condensed = smoothstep(.36 + edge * .09, .86 + edge * .09, uProgress);
    float reveal = smoothstep(.49 + edge * .04, .92 + edge * .06, uProgress);
    float t = 1.9 * (2. * uProgress - uProgress * uProgress);
    vec2 q = flow(p + uSeed * .38, t);

    // Two drifting cloud layers give the fluid internal depth. Dark gaps remain
    // between luminous wisps, so it reads as nebula rather than reflective foil.
    float cloud = noise(q * .8) * .64
                + noise(q * 1.7 + vec2(4.6, -t * .16)) * .36;
    float backCloud = noise(p * .9 - vec2(t * .045, t * .09) + 5.7 + uSeed * .27);
    float folds = q.x * 2.7 + q.y * 1.6 + noise(q * 1.25) * 4.5;
    float wisp = pow(1. - abs(sin(folds)), 3.);
    vec3 primaryMist = mix(uPrimary, vec3(.52, .38, .9), .28);
    vec3 secondaryMist = mix(uSecondary, vec3(.22, .62, .92), .3);
    vec3 pigment = mix(primaryMist, secondaryMist, smoothstep(.22, .78, noise(q * .65 + 12.)));
    vec3 pearl = mix(pigment, vec3(.78, .85, 1.), .58);
    float density = smoothstep(.18, .82, cloud);

    vec3 color = vec3(.018, .016, .058);
    color += vec3(.13, .07, .3) * backCloud * .65;
    color += pigment * (density * .72 + wisp * .44) * (1. - condensed * .32);
    color += pearl * pow(wisp, 3.) * .16;
    color += mix(secondaryMist, vec3(.38, .68, .96), .35)
           * gaussian((cloud - .64) / .19) * .14;

    // Near stars travel with the fluid; a dimmer distant layer gives parallax.
    float stars = starlight(q * 3.4, 2.7 + uSeed.x)
                + starlight(p * 5.2 + vec2(t * .035, -t * .055), 11.3 + uSeed.y) * .28;
    color += vec3(.82, .9, 1.) * stars * (1. - condensed * .72);

    float edgePixels = min(min(uv.x, 1. - uv.x) * uSize.x,
                           min(uv.y, 1. - uv.y) * uSize.y);
    float meniscus = smoothstep(.1, 3.8, edgePixels);
    color *= mix(.54, 1., meniscus);
    color += pearl * gaussian((edgePixels - 1.3) / .9) * .12 * (1. - condensed);
    // The matter thins to an iridescent veil as the tablet resolves beneath it.
    vec3 veil = mix(vec3(.035, .05, .115), pigment * .24, .4);
    color = mix(color, veil, condensed * .46);
    float translucency = mix(.84, .97, density) * mix(.66, 1., meniscus);
    gl_FragColor = vec4(color, translucency * (1. - reveal));
  }

`;

function hexColor(hex: string): [number, number, number] {
  const value = hex.replace(/^#/, "");
  const expanded = value.length === 3 ? [...value].map(part => part + part).join("") : value;
  if (!/^[\da-f]{6}$/i.test(expanded)) return [.66, .73, .78];
  const rgb = Number.parseInt(expanded, 16);
  return [(rgb >> 16) / 255, ((rgb >> 8) & 255) / 255, (rgb & 255) / 255];
}

function materialSeed(seed: string | number | undefined): [number, number] {
  if (seed === undefined) return [0, 0];
  // Keep each cast stable while moving its clouds through a small nearby region.
  let hash = 2166136261;
  for (const character of String(seed)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  hash ^= hash >>> 16;
  return [((hash >>> 0) & 0xffff) / 32767.5 - 1, (hash >>> 16) / 32767.5 - 1];
}

/** A small procedural material; the parent owns the mold and its lifetime. */
export function ForgeMoltenSurface({ durationMs, delayMs, primary, secondary, width, height, seed, paused = false, initialElapsedMs = 0 }: ForgeMoltenSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const materialRef = useRef({ durationMs, delayMs, primary, secondary, width, height, seed, paused });
  const redrawRef = useRef<(() => void) | null>(null);
  const pauseRef = useRef<((paused: boolean) => void) | null>(null);
  const initialElapsedRef = useRef(initialElapsedMs);

  useLayoutEffect(() => {
    materialRef.current = { durationMs, delayMs, primary, secondary, width, height, seed, paused };
    pauseRef.current?.(paused);
    redrawRef.current?.();
  }, [delayMs, durationMs, height, primary, secondary, width, seed, paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof WebGLRenderingContext === "undefined") return;
    canvas.dataset.ready = "false";

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    if (!gl) return;
    const context = gl;
    let animationFrame = 0;
    let startTimer = 0;
    let disposed = false;
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;

    const release = () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(startTimer);
      if (buffer) context.deleteBuffer(buffer);
      if (program) context.deleteProgram(program);
      shaders.forEach(shader => context.deleteShader(shader));
      buffer = null;
      program = null;
      shaders.length = 0;
    };
    const fail = () => {
      canvas.dataset.ready = "false";
      release();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      fail();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    const compile = (type: number, source: string) => {
      const shader = context.createShader(type);
      if (!shader) throw new Error("Shader unavailable");
      shaders.push(shader);
      context.shaderSource(shader, source);
      context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) throw new Error("Shader compilation failed");
      return shader;
    };

    try {
      program = context.createProgram();
      if (!program) throw new Error("Program unavailable");
      context.attachShader(program, compile(context.VERTEX_SHADER, VERTEX_SHADER));
      context.attachShader(program, compile(context.FRAGMENT_SHADER, FRAGMENT_SHADER));
      context.linkProgram(program);
      if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error("Program linking failed");
      context.useProgram(program);
      buffer = context.createBuffer();
      if (!buffer) throw new Error("Buffer unavailable");
      context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), context.STATIC_DRAW);
      const position = context.getAttribLocation(program, "aPosition");
      context.enableVertexAttribArray(position);
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
      const sizeUniform = context.getUniformLocation(program, "uSize");
      const primaryUniform = context.getUniformLocation(program, "uPrimary");
      const secondaryUniform = context.getUniformLocation(program, "uSecondary");
      const seedUniform = context.getUniformLocation(program, "uSeed");
      const progressUniform = context.getUniformLocation(program, "uProgress");
      let resumedAt = performance.now();
      let elapsed = Math.max(0, initialElapsedRef.current);
      let suspended = materialRef.current.paused;
      const elapsedAt = (now: number) => elapsed + (suspended ? 0 : now - resumedAt);
      const progressAt = (now: number) => Math.min(1, Math.max(0,
        (elapsedAt(now) - Math.max(0, materialRef.current.delayMs)) / Math.max(1, materialRef.current.durationMs),
      ));
      let lastWidth = 0;
      let lastHeight = 0;
      let lastPrimary = "";
      let lastSecondary = "";
      let lastSeed: string | number | undefined;
      let hasSeed = false;
      const draw = (progress: number) => {
        const material = materialRef.current;
        const safeWidth = Math.max(1, material.width);
        const safeHeight = Math.max(1, material.height);
        const pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
        const pixelWidth = Math.max(1, Math.round(safeWidth * pixelRatio));
        const pixelHeight = Math.max(1, Math.round(safeHeight * pixelRatio));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
          context.viewport(0, 0, pixelWidth, pixelHeight);
        }
        if (safeWidth !== lastWidth || safeHeight !== lastHeight) {
          context.uniform2f(sizeUniform, safeWidth, safeHeight);
          lastWidth = safeWidth;
          lastHeight = safeHeight;
        }
        if (material.primary !== lastPrimary) {
          context.uniform3fv(primaryUniform, hexColor(material.primary));
          lastPrimary = material.primary;
        }
        if (material.secondary !== lastSecondary) {
          context.uniform3fv(secondaryUniform, hexColor(material.secondary));
          lastSecondary = material.secondary;
        }
        if (!hasSeed || material.seed !== lastSeed) {
          context.uniform2f(seedUniform, ...materialSeed(material.seed));
          lastSeed = material.seed;
          hasSeed = true;
        }
        context.uniform1f(progressUniform, progress);
        context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
      };
      draw(progressAt(performance.now()));
      // Keep the CSS material visible if even the first actual draw failed.
      if (context.getError() !== context.NO_ERROR || context.isContextLost()) throw new Error("Surface draw failed");
      canvas.dataset.ready = "true";
      redrawRef.current = () => {
        if (!disposed) draw(progressAt(performance.now()));
      };
      const tick = (now: number) => {
        if (disposed || suspended) return;
        const progress = progressAt(now);
        draw(progress);
        if (progress < 1) animationFrame = window.requestAnimationFrame(tick);
      };
      // A staggered Cinder refill should not consume frames while waiting.
      const schedule = () => {
        if (disposed || suspended || progressAt(performance.now()) >= 1) return;
        startTimer = window.setTimeout(() => {
          if (!disposed && !suspended) animationFrame = window.requestAnimationFrame(tick);
        }, Math.max(0, materialRef.current.delayMs - elapsedAt(performance.now())));
      };
      pauseRef.current = (nextPaused) => {
        if (nextPaused === suspended || disposed) return;
        const now = performance.now();
        elapsed = elapsedAt(now);
        resumedAt = now;
        suspended = nextPaused;
        window.cancelAnimationFrame(animationFrame);
        window.clearTimeout(startTimer);
        if (!suspended) schedule();
      };
      schedule();
    } catch {
      fail();
    }

    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      redrawRef.current = null;
      pauseRef.current = null;
      release();
      // Repeated refills can otherwise leave discarded contexts waiting for
      // garbage collection and displace another active mold's context.
      // React may replay effect setup on the same mounted canvas in StrictMode.
      // Release the context only after a real removal, once refs have settled.
      void Promise.resolve().then(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- The current ref intentionally distinguishes removal from effect replay.
        if (canvasRef.current !== canvas && !context.isContextLost()) context.getExtension("WEBGL_lose_context")?.loseContext();
      });
    };
  }, []);

  return <canvas ref={canvasRef} className="forge-molten-refill__surface" data-ready="false" aria-hidden="true" />;
}
