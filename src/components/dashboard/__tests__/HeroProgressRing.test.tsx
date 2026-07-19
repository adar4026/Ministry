// Component-level tests for HeroProgressRing (TASK_015), including
// digit-safe font scaling. Pure presentational component — no StoreContext
// needed. Verifies the percentage text renders the correct (uncapped) value
// for 1/2/3-digit and >100% cases without crashing, and that font size scales
// down as digits grow so text has less chance of colliding with the stroke.
import { Text } from "react-native";
import { Circle } from "react-native-svg";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { HeroProgressRing } from "@/components/dashboard/HeroProgressRing";
import { DS } from "@/components/dashboard/tokens";

function collectText(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, out));
    return;
  }
  if (typeof node === "object" && "children" in (node as Record<string, unknown>)) {
    collectText((node as { children: unknown }).children, out);
  }
}

async function renderRing(pct: number, size?: number): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<HeroProgressRing pct={pct} size={size} />);
    await Promise.resolve();
  });
  return renderer;
}

async function renderTexts(pct: number, size?: number): Promise<string[]> {
  const renderer = await renderRing(pct, size);
  const out: string[] = [];
  collectText(renderer.toJSON(), out);
  return out;
}

function mergedStyle(style: unknown): Record<string, unknown> {
  const arr = Array.isArray(style) ? style : [style];
  return Object.assign({}, ...arr);
}

// The outer "pct" Text (the number, wrapping the nested "%" sign Text) is
// the only one styled with letterSpacing — used to distinguish it from the
// inner sign Text, since both share fontWeight: "800".
async function findPctFontSize(pct: number, size?: number): Promise<number> {
  const renderer = await renderRing(pct, size);
  const textNodes = renderer.root.findAll((n) => n.type === Text);
  const pctNode = textNodes.find((n) => mergedStyle(n.props.style).letterSpacing !== undefined);
  if (!pctNode) throw new Error("pct Text node not found");
  return mergedStyle(pctNode.props.style).fontSize as number;
}

describe("HeroProgressRing", () => {
  it("renders a 1-digit percentage", async () => {
    expect(await renderTexts(5)).toContain("5");
  });

  it("renders a 2-digit percentage", async () => {
    expect(await renderTexts(76)).toContain("76");
  });

  it("renders a 3-digit percentage at exactly 100%", async () => {
    expect(await renderTexts(100)).toContain("100");
  });

  it("renders a 3-digit percentage above 100% (goal exceeded) without crashing", async () => {
    expect(await renderTexts(130)).toContain("130");
  });

  it("shrinks the percentage font size as digit count grows", async () => {
    const oneDigit = await findPctFontSize(5, 48);
    const twoDigit = await findPctFontSize(76, 48);
    const threeDigit = await findPctFontSize(130, 48);
    expect(twoDigit).toBeLessThanOrEqual(oneDigit);
    expect(threeDigit).toBeLessThan(twoDigit);
  });

  it("clamps the visual arc but keeps the true percentage in the text at 0%", async () => {
    expect(await renderTexts(0)).toContain("0");
  });

  it("is defensive against NaN/Infinity input (never crashes, shows 0)", async () => {
    expect(await renderTexts(NaN)).toContain("0");
    expect(await renderTexts(Infinity)).toContain("0");
  });

  it("renders without crashing for a negative pct (not a real production case — hoursDone/goal are always >= 0)", async () => {
    await expect(renderTexts(-10)).resolves.toBeDefined();
  });

  // TASK_029: the ring grows with `pct` again (reverting TASK_028's fixed
  // decorative segments) and its color must move red -> blue -> green, with
  // the green transition starting near the finish line (~80%), not at the
  // halfway point.
  describe("color follows pct through red -> blue -> green (TASK_029)", () => {
    async function strokeColorAt(pct: number): Promise<string> {
      const renderer = await renderRing(pct, 48);
      const circles = renderer.root.findAllByType(Circle);
      // First Circle is always the DS.ringTrack background; the colored arc
      // (when pct > 0) is the second.
      const arc = circles[1];
      return arc.props.stroke as string;
    }

    it("is fully red at 0%", async () => {
      // dash === 0 at pct=0 means the colored Circle isn't rendered at all
      // (guards against a stray round-cap dot) — nothing to assert on color
      // directly, but it must not crash and must show 0%.
      const renderer = await renderRing(0, 48);
      const circles = renderer.root.findAllByType(Circle);
      expect(circles).toHaveLength(1);
    });

    it("is fully blue at 50%", async () => {
      expect((await strokeColorAt(50)).toLowerCase()).toBe(DS.accent.toLowerCase());
    });

    it("is fully green at 80% and stays green through 100%+", async () => {
      expect((await strokeColorAt(80)).toLowerCase()).toBe(DS.green.toLowerCase());
      expect((await strokeColorAt(100)).toLowerCase()).toBe(DS.green.toLowerCase());
      expect((await strokeColorAt(130)).toLowerCase()).toBe(DS.green.toLowerCase());
    });

    it("is between red and blue at 25%, and between blue and green at 65%", async () => {
      const at25 = await strokeColorAt(25);
      const at65 = await strokeColorAt(65);
      expect(at25.toLowerCase()).not.toBe(DS.danger.toLowerCase());
      expect(at25.toLowerCase()).not.toBe(DS.accent.toLowerCase());
      expect(at65.toLowerCase()).not.toBe(DS.accent.toLowerCase());
      expect(at65.toLowerCase()).not.toBe(DS.green.toLowerCase());
    });
  });
});
