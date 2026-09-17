// TASK_065 — WebGL background of the Home hero: "liquid silk" waves.
//
// Web-only (Metro resolves this file on web; HeroCanvas.tsx is the native
// no-op, which leaves HeroScene's SVG fallback visible). The mechanics are
// the ones already proven in Alex Finance (js/ui/hero_canvas.js) and Lexcar
// (src/components/HeroCanvas.js): one <canvas>, one fullscreen triangle, a
// fragment shader that builds three height-field folds (simplex noise +
// curved crest lines), derives a pseudo-normal by finite differences and
// lights it (diffuse → volume, specular → the bright edge of a fold, the far
// side sinks into a deep shade). Time is continuous — no visible loop seam.
//
// Only the PALETTE is Ministry's own (green-teal, see MINISTRY in tokens.ts):
// it is read from the --ministry-* CSS variables that app/+html.tsx
// publishes, with the TS object as fallback, so the shader never carries a
// second copy of the colors.
//
// Performance (PWA on iPhone): DPR capped, ~30 fps, a single draw per frame,
// low-power context, paused while the tab is hidden or the hero is out of
// the viewport. If WebGL is unavailable, the shader fails to compile, the
// device is known-weak, prefers-reduced-motion is on, or the context is
// lost, the canvas simply never becomes active and the SVG fallback stays.

import { useEffect, useRef, useState } from "react";
import { MINISTRY } from "./tokens";

// The task caps DPR at 2 (sharper than the siblings' 1.5, which was chosen
// for very old iPhones); the fill-rate cost of the shader is modest.
export const DPR_CAP = 2;
export const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;
export const ON_CLASS = "hero-canvas--on";

type Vec3 = readonly [number, number, number];
type Palette = {
  top: Vec3; bot: Vec3; c1: Vec3; c2: Vec3; c3: Vec3; deep: Vec3;
  alpha: Vec3; light: number;
};

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform vec2  u_res;
uniform float u_t;
uniform vec3  u_top, u_bot, u_c1, u_c2, u_c3, u_deep;
uniform vec3  u_alpha;
uniform float u_light;

// 2D simplex noise (Ashima Arts / Ian McEwan, MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// One wave = one large shape (height field), not a sine: a crest line whose
// curvature and width drift slowly with time, a gaussian crest minus a
// gaussian valley on one flank (asymmetric, "fabric" rather than "ripple"),
// travelling across the scene along its own direction. The across-crest
// distance is periodised through sin, so successive waves join seamlessly.
float waveShape(vec2 p, float t, float ang, float speed, float per, float w0, float seed) {
  vec2 q = rot(ang) * p;
  float y = q.y - t * speed;
  float c = 0.30 * sin(q.x * 0.9 + seed * 2.1 + t * 0.045)
          + 0.42 * snoise(vec2(q.x * 0.55 + seed * 5.0, t * 0.035 + seed * 3.0));
  float w = w0 * (1.0 + 0.40 * snoise(vec2(q.x * 0.7 + seed * 3.0, t * 0.025 - seed * 2.0)));
  float d = (per / 3.14159) * sin(3.14159 * (y - c) / per) / w;
  float crest  = exp(-pow(abs(d), 1.5));
  float valley = exp(-(d - 1.6) * (d - 1.6) * 0.9);
  return crest - 0.55 * valley;
}

float relief(vec2 p, float t, out float h1, out float h2, out float h3) {
  h1 = 1.00 * waveShape(p, t, -0.78, 0.055, 1.6, 0.17, 0.0);
  h2 = 0.85 * waveShape(p, t, -0.50, 0.042, 1.8, 0.24, 1.0);
  h3 = 0.45 * waveShape(p, t, -1.05, 0.070, 1.4, 0.13, 2.0);
  return h1 + h2 + h3;
}

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 1.15;
  float t = u_t;

  const float e = 0.04;
  float h1, h2, h3, d1, d2, d3;
  float H  = relief(p, t, h1, h2, h3);
  float Hx = relief(p + vec2(e, 0.0), t, d1, d2, d3);
  float Hy = relief(p + vec2(0.0, e), t, d1, d2, d3);
  vec3 N = normalize(vec3(-(Hx - H) / e * 0.50, -(Hy - H) / e * 0.50, 1.0));

  vec3 L = normalize(vec3(-0.50, 0.62, 0.60));
  vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));
  float diff = clamp(dot(N, L), 0.0, 1.0);
  float lit    = clamp(diff - L.z, 0.0, 1.0);
  float shadow = clamp(L.z - diff, 0.0, 1.0);
  float spec   = pow(clamp(dot(N, Hv), 0.0, 1.0), 8.0);
  float rim    = pow(1.0 - N.z, 1.3) * (0.4 + 0.6 * diff);
  float valley = smoothstep(0.0, -0.40, H);

  vec3 col = mix(u_top, u_bot, uv.y);
  col = mix(col, u_c1, clamp(h1, 0.0, 1.0) * u_alpha.x);
  col = mix(col, u_c2, clamp(h2, 0.0, 1.0) * u_alpha.y);
  col = mix(col, u_c3, clamp(h3, 0.0, 1.0) * u_alpha.z);
  col *= 1.0 + 0.45 * lit;
  col = mix(col, u_deep, shadow * 0.65 + valley * 0.25);
  col = mix(col, u_c3, (spec * 0.9 + rim * 0.35) * u_light);

  // Dissolve into the page ground toward the bottom edge — this IS the
  // hero → content transition (no hard line), and it lightens the zone
  // where the figures sit.
  col = mix(col, u_bot, smoothstep(0.58, 1.0, uv.y));
  gl_FragColor = vec4(col, 1.0);
}`;

// ---- palette: CSS variables first, MINISTRY as the fallback ----
function hexToVec3(hex: string): Vec3 {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function parseColor(str: string): Vec3 | null {
  const s = str.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return hexToVec3(s);
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255];
  return null;
}
function parseFloats(str: string, n: number): number[] | null {
  const trimmed = str.trim();
  if (!trimmed) return null; // "" would otherwise parse as [0]
  const arr = trimmed.split(/[\s,]+/).map(Number);
  if (arr.length < n || arr.some((v) => !Number.isFinite(v))) return null;
  return arr.slice(0, n);
}

const FALLBACK: Palette = {
  top: hexToVec3(MINISTRY.heroTop),
  bot: hexToVec3(MINISTRY.bg),
  c1: hexToVec3(MINISTRY.heroA),
  c2: hexToVec3(MINISTRY.heroB),
  c3: hexToVec3(MINISTRY.heroC),
  deep: hexToVec3(MINISTRY.heroDeep),
  alpha: MINISTRY.heroAlpha,
  light: MINISTRY.heroLight,
};

/** Reads the --ministry-* variables; any missing/invalid one falls back to MINISTRY. */
export function readPalette(): Palette {
  let cs: CSSStyleDeclaration | null = null;
  try {
    cs = getComputedStyle(document.documentElement);
  } catch {
    cs = null;
  }
  const get = (k: string) => (cs ? cs.getPropertyValue(`--ministry-${k}`) : "");
  const color = (k: string, fb: Vec3) => parseColor(get(k)) ?? fb;
  const alpha = parseFloats(get("hero-alpha"), 3);
  const light = parseFloats(get("hero-light"), 1);
  return {
    top: color("hero-top", FALLBACK.top),
    bot: color("bg", FALLBACK.bot),
    c1: color("hero-a", FALLBACK.c1),
    c2: color("hero-b", FALLBACK.c2),
    c3: color("hero-c", FALLBACK.c3),
    deep: color("hero-deep", FALLBACK.deep),
    alpha: alpha ? (alpha as unknown as Vec3) : FALLBACK.alpha,
    light: light ? light[0] : FALLBACK.light,
  };
}

// ---- gating ----
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
// A known-weak device never starts the shader (the SVG fallback is plenty).
export function isLowEndDevice(): boolean {
  const nav = (typeof navigator !== "undefined" ? navigator : {}) as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return true;
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2) return true;
  return false;
}

// ---- GL helpers ----
function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("HeroCanvas shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

type Program = {
  prog: WebGLProgram; vs: WebGLShader; fs: WebGLShader; buf: WebGLBuffer;
  uRes: WebGLUniformLocation | null; uT: WebGLUniformLocation | null;
  uTop: WebGLUniformLocation | null; uBot: WebGLUniformLocation | null;
  uC1: WebGLUniformLocation | null; uC2: WebGLUniformLocation | null;
  uC3: WebGLUniformLocation | null; uDeep: WebGLUniformLocation | null;
  uAlpha: WebGLUniformLocation | null; uLight: WebGLUniformLocation | null;
};

// Program + fullscreen triangle + uniform locations. Built at start and
// again after a context restore (GPU resources are gone after a loss).
function buildProgram(gl: WebGLRenderingContext): Program | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const prog = gl.createProgram();
  const buf = gl.createBuffer();
  if (!prog || !buf) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("HeroCanvas link:", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
    return null;
  }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  return {
    prog, vs, fs, buf,
    uRes: u("u_res"), uT: u("u_t"),
    uTop: u("u_top"), uBot: u("u_bot"), uC1: u("u_c1"), uC2: u("u_c2"),
    uC3: u("u_c3"), uDeep: u("u_deep"), uAlpha: u("u_alpha"), uLight: u("u_light"),
  };
}
function applyPalette(gl: WebGLRenderingContext, P: Program, pal: Palette) {
  gl.uniform3fv(P.uTop, pal.top as unknown as Float32List);
  gl.uniform3fv(P.uBot, pal.bot as unknown as Float32List);
  gl.uniform3fv(P.uC1, pal.c1 as unknown as Float32List);
  gl.uniform3fv(P.uC2, pal.c2 as unknown as Float32List);
  gl.uniform3fv(P.uC3, pal.c3 as unknown as Float32List);
  gl.uniform3fv(P.uDeep, pal.deep as unknown as Float32List);
  gl.uniform3fv(P.uAlpha, pal.alpha as unknown as Float32List);
  gl.uniform1f(P.uLight, pal.light);
}
function freeProgram(gl: WebGLRenderingContext, P: Program | null) {
  if (!P) return;
  try {
    gl.deleteBuffer(P.buf);
    gl.deleteProgram(P.prog);
    gl.deleteShader(P.vs);
    gl.deleteShader(P.fs);
  } catch {
    // context already lost — the driver has released everything
  }
}

/**
 * Starts the render loop on `canvas`. Returns a stop() handle, or null when
 * WebGL could not be set up (the caller then leaves the fallback visible).
 * `onActive(false)` fires on context loss so the fallback shows through.
 */
export function startHero(canvas: HTMLCanvasElement, onActive: (on: boolean) => void): (() => void) | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl || gl.isContextLost()) return null;

  let P = buildProgram(gl);
  if (!P) return null;
  applyPalette(gl, P, readPalette());

  // Loop state (declared before resize() so it can redraw synchronously).
  let lost = false;
  let t = 0;
  const draw = () => {
    if (!P) return;
    gl.uniform1f(P.uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // Resize only on a real CSS-size / DPR change — never per frame.
  let w = 0, h = 0, dpr = 0;
  const resize = () => {
    if (!P) return;
    const host = canvas.parentElement ?? canvas;
    const cw = Math.round(host.clientWidth);
    const ch = Math.round(host.clientHeight);
    const d = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    if (cw < 2 || ch < 2) return;
    if (cw === w && ch === h && d === dpr) return;
    const first = w === 0;
    w = cw; h = ch; dpr = d;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(P.uRes, canvas.width, canvas.height);
    // Setting width/height wipes the drawing buffer; redraw at once so an
    // orientation change never shows a black frame before the next rAF.
    // (The very first sizing is followed by the explicit first frame below.)
    if (!first && !lost) draw();
  };
  resize();
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas.parentElement ?? canvas);
  else window.addEventListener("resize", resize);

  // Draw only while the tab is visible and the hero is in the viewport.
  // Shader time accumulates over RENDERED frames with a clamped delta, so
  // after the tab returns from the background the fabric continues from
  // where it was instead of jumping ahead.
  let raf = 0;
  let running = false;
  let visible = !document.hidden;
  let inView = true;
  let last = 0;
  const frame = (now: number) => {
    raf = 0;
    if (!running || lost) return;
    if (now - last >= FRAME_MS) {
      t += Math.min(now - last, FRAME_MS * 3) / 1000;
      last = now;
      draw();
    }
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    const shouldRun = visible && inView && !lost;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    } else if (!shouldRun && running) {
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  };
  const onVisibility = () => { visible = !document.hidden; sync(); };
  document.addEventListener("visibilitychange", onVisibility);
  const io = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver((entries) => {
      inView = entries.some((en) => en.isIntersecting);
      sync();
    }, { threshold: 0 })
    : null;
  if (io) io.observe(canvas);

  // Context loss: hide the canvas (fallback shows); on restore rebuild the
  // program and continue from the same t.
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    sync();
    onActive(false);
  };
  const onRestored = () => {
    P = buildProgram(gl);
    if (!P) return; // stay on the fallback
    applyPalette(gl, P, readPalette());
    w = 0; h = 0; dpr = 0; resize();
    draw();
    lost = false;
    onActive(true);
    sync();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  // First frame synchronously, so there is never an empty canvas mid-fade.
  draw();
  onActive(true);
  sync();

  return () => {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    if (io) io.disconnect();
    if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
    freeProgram(gl, P);
    P = null;
    onActive(false);
  };
}

/**
 * The hero canvas. Absolutely fills its parent (HeroScene's clipped box),
 * never receives pointer events, fades in once the first frame is drawn.
 * Reacts to prefers-reduced-motion changes without a reload.
 */
export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    if (isLowEndDevice()) return undefined;

    const mq = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    let stop: (() => void) | null = null;
    const tryStart = () => {
      if (stop || (mq && mq.matches)) return;
      try {
        stop = startHero(canvas, setActive);
      } catch (e) {
        console.warn("HeroCanvas:", e);
        stop = null;
      }
    };
    const tryStop = () => { if (stop) { stop(); stop = null; } };
    const onMq = () => { if (mq && mq.matches) tryStop(); else tryStart(); };
    if (mq) {
      if (mq.addEventListener) mq.addEventListener("change", onMq);
      else mq.addListener(onMq);
    }
    tryStart();

    return () => {
      tryStop();
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener("change", onMq);
        else mq.removeListener(onMq);
      }
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={`hero-canvas${active ? ` ${ON_CLASS}` : ""}`}
      aria-hidden="true"
      data-testid="hero-canvas"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
        opacity: active ? 1 : 0,
        transition: "opacity 0.9s ease",
      }}
    />
  );
}
