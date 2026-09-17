// TASK_065 — HeroScene: the hero background layer (SVG fallback + canvas).
import { Ellipse, Stop } from "react-native-svg";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { HeroScene, HERO_HEIGHT } from "@/components/dashboard/HeroScene";
import { HeroCanvas } from "@/components/dashboard/HeroCanvas";
import { MINISTRY } from "@/components/dashboard/tokens";

function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

function render(height: number): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<HeroScene height={height} />);
  });
  return renderer;
}

describe("HeroScene", () => {
  it("is an absolutely positioned, clipped, non-interactive layer of the given height", () => {
    const renderer = render(HERO_HEIGHT + 59);
    const scene = renderer.root.findByProps({ testID: "hero-scene" });
    const style = flat(scene.props.style);
    expect(style.position).toBe("absolute");
    expect(style.top).toBe(0);
    expect(style.overflow).toBe("hidden");
    expect(style.pointerEvents).toBe("none");
    expect(style.height).toBe(HERO_HEIGHT + 59);
  });

  it("falls back to a mint → page-ground gradient in the Ministry palette (no card, no white)", () => {
    const renderer = render(300);
    const stops = renderer.root.findAllByType(Stop).map((s) => s.props.stopColor);
    expect(stops[0]).toBe(MINISTRY.heroTop);
    expect(stops).toContain(MINISTRY.bg);
    expect(stops).not.toContain("#ffffff");
  });

  it("adds three soft folds in hero-a / hero-b / hero-c, wider than tall", () => {
    const renderer = render(300);
    const blobs = renderer.root.findAllByType(Ellipse);
    expect(blobs).toHaveLength(3);
    for (const b of blobs) expect(Number(b.props.rx)).toBeGreaterThan(Number(b.props.ry));
    const stops = renderer.root.findAllByType(Stop).map((s) => s.props.stopColor);
    expect(stops).toContain(MINISTRY.heroA);
    expect(stops).toContain(MINISTRY.heroB);
    expect(stops).toContain(MINISTRY.heroC);
  });

  it("dissolves into MINISTRY.bg at the bottom, from 58% down — same curve as the shader", () => {
    const renderer = render(300);
    const stops = renderer.root.findAllByType(Stop).filter((s) => s.props.stopOpacity === undefined);
    expect(stops.map((s) => [s.props.offset, s.props.stopColor])).toEqual([
      [0, MINISTRY.heroTop],
      [0.58, MINISTRY.heroTop],
      [1, MINISTRY.bg],
    ]);
  });

  it("two instances never share SVG gradient ids", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <>
          <HeroScene height={300} />
          <HeroScene height={300} />
        </>,
      );
    });
    const ids = renderer.root
      .findAll((n) => !!n.props && typeof n.props.id === "string" && n.props.id.startsWith("heroGrad-"))
      .map((n) => n.props.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});

// TASK_066 — the Home drawer reuses the scene as a STATIC panel background.
describe("HeroScene — animated={false} (TASK_066)", () => {
  it("renders the SVG fallback but no HeroCanvas when animated is false", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<HeroScene height={600} animated={false} />);
    });
    expect(renderer.root.findAllByType(Stop).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByType(HeroCanvas)).toHaveLength(0);
    expect(renderer.root.findAllByType(Ellipse)).toHaveLength(3);
  });

  it("still mounts HeroCanvas by default (Home is unchanged)", () => {
    const renderer = render(300);
    expect(renderer.root.findAllByType(HeroCanvas)).toHaveLength(1);
  });
});
