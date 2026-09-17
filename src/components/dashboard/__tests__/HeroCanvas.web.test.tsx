/**
 * @jest-environment jsdom
 *
 * TASK_065 — the WebGL hero layer's lifecycle, with a scripted WebGL context
 * and a hand-driven requestAnimationFrame/clock. What matters here is not
 * the picture but the contract: draws only while visible and in view, at
 * most ~30 fps, a synchronous redraw on resize, fallback on any failure or
 * lost context, and a clean teardown that frees every GPU resource and
 * removes every listener.
 */
import { act, create } from "react-test-renderer";
import {
  DPR_CAP,
  HeroCanvas,
  ON_CLASS,
  TARGET_FPS,
  isLowEndDevice,
  prefersReducedMotion,
  readPalette,
  startHero,
} from "@/components/dashboard/HeroCanvas.web";
import { MINISTRY } from "@/components/dashboard/tokens";

// ---- scripted WebGL ----
type FakeGL = WebGLRenderingContext & {
  draws: number;
  freed: { buffers: number; programs: number; shaders: number };
  uniforms: Record<string, unknown>;
  lost: boolean;
  failCompile: boolean;
};

function makeGL(opts: { failCompile?: boolean } = {}): FakeGL {
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, TRIANGLES: 8,
    draws: 0, freed: { buffers: 0, programs: 0, shaders: 0 }, uniforms: {}, lost: false,
    failCompile: !!opts.failCompile,
    isContextLost: () => gl.lost,
    createShader: () => ({}), shaderSource: () => {}, compileShader: () => {},
    getShaderParameter: () => !gl.failCompile, getShaderInfoLog: () => "boom",
    deleteShader: () => { gl.freed.shaders++; },
    createProgram: () => ({}), attachShader: () => {}, linkProgram: () => {},
    getProgramParameter: () => true, getProgramInfoLog: () => "", useProgram: () => {},
    deleteProgram: () => { gl.freed.programs++; },
    createBuffer: () => ({}), bindBuffer: () => {}, bufferData: () => {},
    deleteBuffer: () => { gl.freed.buffers++; },
    getAttribLocation: () => 0, enableVertexAttribArray: () => {}, vertexAttribPointer: () => {},
    getUniformLocation: (_p: unknown, name: string) => name,
    uniform3fv: (loc: string, v: unknown) => { gl.uniforms[loc] = Array.from(v as number[]); },
    uniform1f: (loc: string, v: number) => { gl.uniforms[loc] = v; },
    uniform2f: (loc: string, a: number, b: number) => { gl.uniforms[loc] = [a, b]; },
    viewport: () => {},
    drawArrays: () => { gl.draws++; },
    getExtension: () => null,
  } as unknown as FakeGL;
  return gl;
}

function makeCanvas(gl: FakeGL | null, size = { w: 390, h: 300 }): HTMLCanvasElement {
  const host = document.createElement("div");
  Object.defineProperty(host, "clientWidth", { get: () => size.w, configurable: true });
  Object.defineProperty(host, "clientHeight", { get: () => size.h, configurable: true });
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  document.body.appendChild(host);
  canvas.getContext = jest.fn(() => gl) as unknown as HTMLCanvasElement["getContext"];
  return canvas;
}

// ---- hand-driven rAF + clock ----
let clock = 0;
let queue: Array<{ id: number; cb: FrameRequestCallback }> = [];
let nextId = 1;
function flushFrame(advanceMs: number) {
  clock += advanceMs;
  const pending = queue;
  queue = [];
  for (const { cb } of pending) cb(clock);
}

let hidden = false;
// Every instance started in a test is stopped in afterEach, so a failing
// assertion can never leak a document listener into the next test.
const started: Array<() => void> = [];
function start(canvas: HTMLCanvasElement, onActive: (on: boolean) => void = () => {}) {
  const inner = startHero(canvas, onActive);
  if (!inner) return null;
  const stop = () => {
    const i = started.indexOf(stop);
    if (i >= 0) started.splice(i, 1);
    inner();
  };
  started.push(stop);
  return stop;
}
const originalRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
const originalIO = (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;

beforeEach(() => {
  clock = 0; queue = []; nextId = 1; hidden = false;
  window.requestAnimationFrame = (cb) => { const id = nextId++; queue.push({ id, cb }); return id; };
  window.cancelAnimationFrame = (id) => { queue = queue.filter((q) => q.id !== id); };
  jest.spyOn(performance, "now").mockImplementation(() => clock);
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  // No observers in this suite: resize goes through window "resize", and
  // in-view stays true — exactly the code path a browser without them takes.
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  window.devicePixelRatio = 3;
});

afterEach(() => {
  while (started.length) started.pop()!();
  jest.restoreAllMocks();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("style");
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = originalRO;
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = originalIO;
});

describe("startHero — setup and fallback", () => {
  it("draws the first frame synchronously and reports active", () => {
    const gl = makeGL();
    const onActive = jest.fn();
    const stop = start(makeCanvas(gl), onActive);
    expect(stop).toBeInstanceOf(Function);
    expect(gl.draws).toBe(1);
    expect(onActive).toHaveBeenCalledWith(true);
    stop!();
  });

  it("caps the backing store at DPR_CAP and reports the resolution to the shader", () => {
    const gl = makeGL();
    const canvas = makeCanvas(gl, { w: 390, h: 300 });
    const stop = start(canvas);
    expect(DPR_CAP).toBe(2);
    expect(canvas.width).toBe(390 * 2); // devicePixelRatio 3 → capped to 2
    expect(canvas.height).toBe(300 * 2);
    expect(gl.uniforms.u_res).toEqual([780, 600]);
    stop!();
  });

  it("returns null (fallback stays) when WebGL is unavailable", () => {
    const onActive = jest.fn();
    expect(start(makeCanvas(null), onActive)).toBeNull();
    expect(onActive).not.toHaveBeenCalled();
  });

  it("returns null (fallback stays) when the shader fails to compile", () => {
    const gl = makeGL({ failCompile: true });
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const onActive = jest.fn();
    expect(start(makeCanvas(gl), onActive)).toBeNull();
    expect(gl.draws).toBe(0);
    expect(onActive).not.toHaveBeenCalled();
  });

  it("returns null when the context is already lost", () => {
    const gl = makeGL();
    gl.lost = true;
    expect(start(makeCanvas(gl))).toBeNull();
  });

  it("feeds the Ministry palette to the shader (from CSS vars, else the TS tokens)", () => {
    const gl = makeGL();
    const stop = start(makeCanvas(gl));
    const [r, g, b] = gl.uniforms.u_c1 as number[];
    const hex = "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
    expect(hex).toBe(MINISTRY.heroA);
    expect(gl.uniforms.u_light).toBe(MINISTRY.heroLight);
    stop!();
  });
});

describe("startHero — frame pacing and visibility", () => {
  it("renders at most ~TARGET_FPS: a frame closer than 1000/fps ms is skipped", () => {
    const gl = makeGL();
    const stop = start(makeCanvas(gl));
    expect(TARGET_FPS).toBe(30);
    gl.draws = 0;
    flushFrame(10);   // too soon → no draw, rAF re-queued
    flushFrame(10);   // still 20 ms → no draw
    expect(gl.draws).toBe(0);
    flushFrame(20);   // 40 ms since last draw → draw
    expect(gl.draws).toBe(1);
    stop!();
  });

  it("stops requesting frames while the document is hidden and resumes on return, continuing its own time", () => {
    const gl = makeGL();
    const stop = start(makeCanvas(gl));
    flushFrame(50);
    const tBefore = gl.uniforms.u_t as number;
    expect(tBefore).toBeGreaterThan(0);

    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(queue).toHaveLength(0);           // rAF cancelled
    gl.draws = 0;
    flushFrame(5000);                        // nothing pending → nothing drawn
    expect(gl.draws).toBe(0);

    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(queue).toHaveLength(1);           // re-armed
    flushFrame(40);
    // Time advanced by at most a clamped delta (3 frames), not by the 5 s
    // spent hidden — the fabric continues, it does not jump.
    const tAfter = gl.uniforms.u_t as number;
    expect(tAfter - tBefore).toBeLessThanOrEqual((1000 / TARGET_FPS) * 3 / 1000 + 1e-6);
    expect(tAfter).toBeGreaterThan(tBefore);
    stop!();
  });

  it("redraws synchronously on resize so a buffer reset never shows a black frame", () => {
    const gl = makeGL();
    const size = { w: 390, h: 300 };
    const canvas = makeCanvas(gl, size);
    const stop = start(canvas);
    gl.draws = 0;
    size.w = 320;
    window.dispatchEvent(new Event("resize"));
    expect(canvas.width).toBe(640);
    expect(gl.draws).toBe(1);
    // Same size again → no work at all.
    window.dispatchEvent(new Event("resize"));
    expect(gl.draws).toBe(1);
    stop!();
  });
});

describe("startHero — lost context and teardown", () => {
  it("on webglcontextlost stops drawing and reports inactive; on restore rebuilds and resumes", () => {
    const gl = makeGL();
    const canvas = makeCanvas(gl);
    const onActive = jest.fn();
    const stop = start(canvas, onActive);
    onActive.mockClear();
    gl.lost = true;
    const lostEvt = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lostEvt);
    expect(lostEvt.defaultPrevented).toBe(true);
    expect(onActive).toHaveBeenCalledWith(false);
    expect(queue).toHaveLength(0);
    gl.draws = 0;
    flushFrame(100);
    expect(gl.draws).toBe(0);

    gl.lost = false;
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(onActive).toHaveBeenLastCalledWith(true);
    expect(gl.draws).toBe(1);               // immediate frame after rebuild
    expect(queue).toHaveLength(1);          // loop re-armed
    stop!();
  });

  it("stop() cancels the frame, removes listeners, frees GPU resources and reports inactive", () => {
    const gl = makeGL();
    const canvas = makeCanvas(gl);
    const onActive = jest.fn();
    const removeDoc = jest.spyOn(document, "removeEventListener");
    const removeCanvas = jest.spyOn(canvas, "removeEventListener");
    const removeWin = jest.spyOn(window, "removeEventListener");
    const stop = start(canvas, onActive)!;
    expect(queue).toHaveLength(1);
    stop();
    expect(queue).toHaveLength(0);
    expect(removeDoc).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(removeCanvas).toHaveBeenCalledWith("webglcontextlost", expect.any(Function));
    expect(removeCanvas).toHaveBeenCalledWith("webglcontextrestored", expect.any(Function));
    expect(removeWin).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(gl.freed).toEqual({ buffers: 1, programs: 1, shaders: 2 });
    expect(onActive).toHaveBeenLastCalledWith(false);
    // Nothing draws after teardown even if something fires.
    gl.draws = 0;
    document.dispatchEvent(new Event("visibilitychange"));
    flushFrame(100);
    expect(gl.draws).toBe(0);
  });
});

describe("readPalette", () => {
  it("prefers the --ministry-* CSS variables when present", () => {
    document.documentElement.style.setProperty("--ministry-hero-a", "#ff0000");
    document.documentElement.style.setProperty("--ministry-hero-alpha", "0.1 0.2 0.3");
    document.documentElement.style.setProperty("--ministry-hero-light", "0.9");
    const pal = readPalette();
    expect(pal.c1).toEqual([1, 0, 0]);
    expect(pal.alpha).toEqual([0.1, 0.2, 0.3]);
    expect(pal.light).toBe(0.9);
  });

  it("falls back to the MINISTRY tokens for anything missing or malformed", () => {
    document.documentElement.style.setProperty("--ministry-hero-b", "not a color");
    const pal = readPalette();
    const [r, g, b] = pal.c2;
    const hex = "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
    expect(hex).toBe(MINISTRY.heroB);
    expect(pal.alpha).toEqual(MINISTRY.heroAlpha);
    expect(pal.light).toBe(MINISTRY.heroLight);
  });
});

describe("HeroCanvas component — gating", () => {
  function mountWith(canvas: HTMLCanvasElement | null) {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HeroCanvas />, { createNodeMock: () => canvas });
    });
    return renderer;
  }
  function mockMatchMedia(matches: boolean) {
    const listeners: Array<() => void> = [];
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches,
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;
    return listeners;
  }

  it("activates (class hero-canvas--on, opacity 1) once WebGL draws", () => {
    mockMatchMedia(false);
    const gl = makeGL();
    const renderer = mountWith(makeCanvas(gl));
    const el = renderer.root.findByType("canvas");
    expect(el.props.className).toContain(ON_CLASS);
    expect(el.props.style.opacity).toBe(1);
    expect(el.props.style.pointerEvents).toBe("none");
    expect(el.props["aria-hidden"]).toBe("true");
    act(() => renderer.unmount());
    expect(gl.freed.programs).toBe(1);
  });

  it("stays inactive under prefers-reduced-motion (the SVG fallback is what the user sees)", () => {
    mockMatchMedia(true);
    const gl = makeGL();
    const renderer = mountWith(makeCanvas(gl));
    expect(prefersReducedMotion()).toBe(true);
    expect(gl.draws).toBe(0);
    const el = renderer.root.findByType("canvas");
    expect(el.props.className).not.toContain(ON_CLASS);
    expect(el.props.style.opacity).toBe(0);
    act(() => renderer.unmount());
  });

  it("stays inactive on a known-weak device", () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 2 });
    expect(isLowEndDevice()).toBe(true);
    const gl = makeGL();
    const renderer = mountWith(makeCanvas(gl));
    expect(gl.draws).toBe(0);
    act(() => renderer.unmount());
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 8 });
  });

  it("stays inactive when there is no WebGL at all", () => {
    mockMatchMedia(false);
    const renderer = mountWith(makeCanvas(null));
    expect(renderer.root.findByType("canvas").props.className).not.toContain(ON_CLASS);
    act(() => renderer.unmount());
  });
});
