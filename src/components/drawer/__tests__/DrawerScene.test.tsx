// TASK_077 — DrawerScene: Finance's drawer light reproduced — the four
// background layers and the two drifting blobs. SVG only — never a canvas.
import { Animated } from "react-native";
import { Circle, Ellipse, Rect, Stop } from "react-native-svg";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { DrawerScene, DRIFT_SCALE, DRIFT_X, DRIFT_Y, blueBlobGeometry, skyBlobGeometry } from "../DrawerScene";
import { HeroCanvas } from "@/components/dashboard/HeroCanvas";
import { DRAWER_ICE, MINISTRY } from "@/components/dashboard/tokens";

jest.mock("@/utils/motion", () => ({ prefersReducedMotion: () => mockReduced() }));
const mockReduced = jest.fn(() => false);

function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

const mounted: ReactTestRenderer[] = [];
// The host View under the Animated wrapper — its style is the flattened
// result, not an AnimatedStyle node.
function host(renderer: ReactTestRenderer, testID: string) {
  const all = renderer.root.findAll((n) => (n.type as unknown) === "View" && n.props.testID === testID);
  return all[all.length - 1];
}

function render(width = 335, height = 844): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<DrawerScene width={width} height={height} />);
  });
  mounted.push(renderer);
  return renderer;
}

describe("DrawerScene", () => {
  // The drift loops are 22 s / 27 s long: fake timers so they never keep
  // the worker alive, and unmount so the effect cleanup stops them.
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduced.mockReturnValue(false);
  });
  afterEach(() => {
    for (const r of mounted.splice(0)) act(() => r.unmount());
    jest.useRealTimers();
  });

  it("is an absolutely positioned, clipped, non-interactive layer of the panel's size", () => {
    const renderer = render(335, 844);
    const scene = renderer.root.findByProps({ testID: "drawer-scene" });
    const style = flat(scene.props.style);
    expect(style.position).toBe("absolute");
    expect(style.top).toBe(0);
    expect(style.overflow).toBe("hidden");
    expect(style.pointerEvents).toBe("none");
    expect(style.width).toBe(335);
    expect(style.height).toBe(844);
    expect(style.backgroundColor).toBe(DRAWER_ICE.bottom);
  });

  it("ground: hero-top → hero-bottom at 58 %, then flat (Finance's linear-gradient)", () => {
    const renderer = render();
    const stops = renderer.root.findAllByType(Stop).filter((s) => s.props.stopOpacity === undefined);
    expect(stops.map((s) => [s.props.offset, s.props.stopColor])).toEqual([
      [0, DRAWER_ICE.top],
      [0.58, DRAWER_ICE.bottom],
      [1, DRAWER_ICE.bottom],
    ]);
    expect(renderer.root.findAllByType(Rect)).toHaveLength(1);
  });

  it("three static light layers in Finance's geometry, painted turquoise → cyan → white glow on top, each fading at 60 %", () => {
    const renderer = render();
    const ellipses = renderer.root.findAllByType(Ellipse).map((e) => [e.props.cx, e.props.cy, e.props.rx, e.props.ry]);
    expect(ellipses).toEqual([
      ["0", "92", "80", "36"], // --hero-b3 turquoise, 80%×36% at 0% 92%
      ["100", "62", "90", "40"], // --hero-b2 cyan, 90%×40% at 100% 62%
      ["50", "10", "120", "50"], // --hero-glow, 120%×50% at 50% 10%
    ]);
    const fades = renderer.root.findAllByType(Stop).filter((s) => s.props.stopOpacity !== undefined);
    const peak = (color: string) => fades.find((s) => s.props.stopColor === color && s.props.offset === 0)!.props.stopOpacity;
    const end = (color: string) => fades.find((s) => s.props.stopColor === color && s.props.stopOpacity === 0)!.props.offset;
    expect(peak(DRAWER_ICE.glow.color)).toBe(0.55);
    expect(peak(DRAWER_ICE.poolCyan.color)).toBe(0.55);
    expect(peak(DRAWER_ICE.poolTurquoise.color)).toBe(0.5);
    expect(end(DRAWER_ICE.glow.color)).toBe(0.6);
    expect(end(DRAWER_ICE.poolCyan.color)).toBe(0.6);
    expect(end(DRAWER_ICE.poolTurquoise.color)).toBe(0.6);
  });

  it("two blobs: sky min(130vw,460) at −40%/−24%, blue min(110vw,400) at right −46%/top 6%, fading at 64 %", () => {
    expect(skyBlobGeometry(335, 844)).toEqual({ size: 435.5, left: -134, top: -202.56 });
    expect(skyBlobGeometry(360, 800).size).toBe(460);
    const blueGeo = blueBlobGeometry(335, 844);
    expect(blueGeo.size).toBeCloseTo(368.5);
    expect(blueGeo.left).toBeCloseTo(335 - 368.5 + 0.46 * 335);
    expect(blueGeo.top).toBeCloseTo(50.64);
    expect(blueBlobGeometry(390, 800).size).toBe(400);
    const renderer = render(335, 844);
    const sky = host(renderer, "drawer-blob-sky");
    const blue = host(renderer, "drawer-blob-blue");
    expect(flat(sky.props.style).width).toBeCloseTo(435.5);
    expect(flat(blue.props.style).width).toBeCloseTo(368.5);
    expect(renderer.root.findAllByType(Circle)).toHaveLength(2);
    const fades = renderer.root.findAllByType(Stop).filter((s) => s.props.stopOpacity !== undefined);
    expect(fades.find((s) => s.props.stopColor === DRAWER_ICE.blobSky.color && s.props.offset === 0)!.props.stopOpacity).toBe(0.72);
    expect(fades.find((s) => s.props.stopColor === DRAWER_ICE.blobBlue.color && s.props.offset === 0)!.props.stopOpacity).toBe(0.52);
    expect(fades.filter((s) => s.props.stopOpacity === 0 && s.props.offset === 0.64)).toHaveLength(2);
  });

  it("blobs drift on the transform (translate 34/28, scale 1.08) and hold still under reduced motion", () => {
    expect([DRIFT_X, DRIFT_Y, DRIFT_SCALE]).toEqual([34, 28, 1.08]);
    const loop = jest.spyOn(Animated, "loop");
    render();
    expect(loop).toHaveBeenCalledTimes(2);
    loop.mockClear();
    mockReduced.mockReturnValue(true);
    const renderer = render();
    expect(loop).not.toHaveBeenCalled();
    // Still positioned and sized — only the motion is gone.
    const sky = host(renderer, "drawer-blob-sky");
    expect(flat(sky.props.style).position).toBe("absolute");
    expect(flat(sky.props.style).width).toBeCloseTo(435.5);
    loop.mockRestore();
  });

  it("uses none of the hero's green palette and never mounts a WebGL canvas", () => {
    const renderer = render();
    const colors = renderer.root.findAllByType(Stop).map((s) => s.props.stopColor);
    for (const c of [MINISTRY.heroTop, MINISTRY.heroA, MINISTRY.heroB, MINISTRY.heroC, MINISTRY.heroDeep, MINISTRY.bg]) {
      expect(colors).not.toContain(c);
    }
    expect(renderer.root.findAllByType(HeroCanvas)).toHaveLength(0);
  });
});
