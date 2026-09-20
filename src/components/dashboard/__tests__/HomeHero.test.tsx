// TASK_065 — HomeHero: the month figures laid directly on the hero, no card.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS } from "@/store/StoreContext";
import { HomeHero, figureGlassStyles, splitDuration } from "@/components/dashboard/HomeHero";
import { DS, FIGURE_GLASS, MINISTRY } from "@/components/dashboard/tokens";
import { MONTHLY_GOAL } from "@/data/constants";
import type { Session } from "@/types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .flat()
    .filter((c): c is string => typeof c === "string");
}

async function render(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <HomeHero />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return renderer;
}

function sessionToday(minutes: number, id = "s1"): Session {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const iso = now.toISOString();
  return { id, date, durationMinutes: minutes, note: "", source: "manual", createdAt: iso, updatedAt: iso };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPush.mockClear();
});

describe("HomeHero — structure", () => {
  it("shows the headline figure (as number + unit pieces) and its goal caption", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([sessionToday(90)]));
    const renderer = await render();
    const figure = renderer.root.findByProps({ testID: "home-hero-figure" });
    const pieces = figure.findAllByType(Text).map((n) => n.props.children).filter((c): c is string => typeof c === "string");
    expect(pieces).toEqual(["1", "ч", "30", "м"]);
    const all = texts(renderer);
    expect(all.some((t) => t.startsWith(`из цели ${MONTHLY_GOAL} ч`) && t.includes("% выполнено"))).toBe(true);
  });

  // TASK_070 — the month eyebrow ("СЕНТЯБРЬ 2026") is gone: the header's
  // date line already names the month. It survives only in the spoken summary.
  it("shows no month/year eyebrow above the figure (but keeps it in the a11y summary)", async () => {
    const renderer = await render();
    const now = new Date();
    const monthYear = new RegExp(`^[А-Яа-я]+ ${now.getFullYear()}$`);
    expect(texts(renderer).some((t) => monthYear.test(t))).toBe(false);
    expect(renderer.root.findAllByType(Text).some((n) => flat(n.props.style).textTransform === "uppercase")).toBe(false);
    const summary = renderer.root.findAll(
      (n) => typeof n.type === "string" && typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.includes("внесено"),
    )[0];
    expect(summary.props.accessibilityLabel).toMatch(new RegExp(`^[А-Я][а-я]+ ${now.getFullYear()}:`));
  });

  it("has no top padding of its own — the header→figure distance is the screen's", async () => {
    const renderer = await render();
    const wrap = renderer.root.findByProps({ testID: "home-hero" });
    expect(flat(wrap.props.style).paddingTop).toBe(0);
  });

  it("has no card surface of its own — the wrapper carries no background, radius or shadow", async () => {
    const renderer = await render();
    const wrap = renderer.root.findByProps({ testID: "home-hero" });
    const style = flat(wrap.props.style);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderRadius).toBeUndefined();
    expect(style.shadowOpacity).toBeUndefined();
    expect(style.elevation).toBeUndefined();
  });

  it("uses the glass fill for the figure and the hero ink (not DS.navy / DS.subInk) for captions", async () => {
    const renderer = await render();
    const figure = renderer.root.findAll((n) => n.type === Text && flat(n.props.style).fontSize === 60)[0];
    // jest-expo runs as iOS: the native (single-layer) frosted fill.
    expect(flat(figure.props.style).color).toBe(FIGURE_GLASS.bodySolid);
    const caption = renderer.root.findAll((n) => n.type === Text && String(n.props.children).startsWith("из цели"))[0];
    expect(flat(caption.props.style).color).toBe(MINISTRY.ink2);
    const colors = renderer.root.findAllByType(Text).map((n) => flat(n.props.style).color);
    expect(colors).not.toContain(DS.navy);
    expect(colors).not.toContain(DS.subInk);
  });

  it("renders the progress fill in the Ministry accent at the clamped percentage", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([sessionToday(MONTHLY_GOAL * 60 * 2)]));
    const renderer = await render();
    const fill = renderer.root.findAll((n) => flat(n.props.style).backgroundColor === MINISTRY.accent)[0];
    expect(flat(fill.props.style).width).toBe("100%");
  });

  it("exposes one spoken summary for the figures", async () => {
    const renderer = await render();
    // Host nodes only — RN's composite View and its host "View" carry the same props.
    const summary = renderer.root.findAll(
      (n) => typeof n.type === "string" && typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.includes("внесено"),
    );
    expect(summary).toHaveLength(1);
    expect(summary[0].props.accessibilityLabel).toContain(`из цели ${MONTHLY_GOAL}`);
  });
});

// TASK_070 — the headline is set like an iOS dashboard figure: a large,
// not-too-heavy number and a clearly secondary unit on the same baseline.
describe("HomeHero — headline typography", () => {
  it("splitDuration() breaks formatHMRounded() output into (number, unit) pairs", () => {
    expect(splitDuration("37 ч")).toEqual([["37", "ч"]]);
    expect(splitDuration("1 ч 30 м")).toEqual([["1", "ч"], ["30", "м"]]);
    expect(splitDuration("0 ч")).toEqual([["0", "ч"]]);
    expect(splitDuration("—")).toEqual([["—", ""]]);
  });

  it("the digits are 60 pt / weight 600 (medium, not bold); the unit is 24 pt / weight 500 — both in the glass fill", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([sessionToday(37 * 60)]));
    const renderer = await render();
    const figure = renderer.root.findByProps({ testID: "home-hero-figure" });
    const [num, unit] = figure.findAllByType(Text);
    const n = flat(num.props.style);
    const u = flat(unit.props.style);
    expect(num.props.children).toBe("37");
    expect(unit.props.children).toBe("ч");
    expect(n.fontSize).toBeGreaterThanOrEqual(58);
    expect(n.fontSize).toBeLessThanOrEqual(64);
    expect(n.lineHeight).toBe(64);
    expect(n.fontWeight).toBe("600");           // a KPI, not a bold heading (TASK_065 was 800)
    expect(n.letterSpacing).toBeLessThan(0);
    expect(n.color).toBe(FIGURE_GLASS.bodySolid);
    expect(n.fontVariant).toEqual(["tabular-nums"]);
    expect(u.fontSize).toBeGreaterThanOrEqual(22);
    expect(u.fontSize).toBeLessThanOrEqual(26);
    expect(u.fontWeight).toBe("500");
    expect(u.color).toBe(FIGURE_GLASS.unitBodySolid);
    // The unit is tucked against the digits: "37 ч" is one unit, not "37" + a stray "ч".
    expect(u.marginLeft as number).toBeLessThanOrEqual(3);
  });

  it("uses only the platform's system face — a rounded system alias on web, the default on native, no font dependency", async () => {
    const renderer = await render();
    const figure = renderer.root.findByProps({ testID: "home-hero-figure" });
    for (const t of figure.findAllByType(Text)) {
      const ff = flat(t.props.style).fontFamily as string | undefined;
      if (ff !== undefined) {
        expect(ff.startsWith("ui-rounded")).toBe(true);
        expect(ff).toMatch(/system-ui|-apple-system/);
      }
    }
  });

  it("number and unit share one baseline-aligned row exactly one line tall", async () => {
    const renderer = await render();
    const figure = renderer.root.findByProps({ testID: "home-hero-figure" });
    const style = flat(figure.props.style);
    expect(style.flexDirection).toBe("row");
    expect(style.alignItems).toBe("baseline");
    expect(style.flexWrap).toBe("nowrap");
    // No pair element adds vertical padding/margin — the row is the number's line height.
    for (const pair of figure.findAll((n) => flat(n.props.style).alignItems === "baseline" && n !== figure)) {
      const ps = flat(pair.props.style);
      expect(ps.marginTop).toBeUndefined();
      expect(ps.paddingTop).toBeUndefined();
    }
  });

  // The figure is the hero's ONE centred element — the dashboard's focal
  // point. The caption and everything below stay on the left grid.
  it("centres the figure in a full-width wrapper while the caption and the rest stay left-aligned", async () => {
    const renderer = await render();
    const wrap = renderer.root.findByProps({ testID: "home-hero-figure-wrap" });
    const ws = flat(wrap.props.style);
    expect(ws.width).toBe("100%");
    expect(ws.alignItems).toBe("center");
    expect(ws.justifyContent).toBe("center");
    expect(wrap.findByProps({ testID: "home-hero-figure" })).toBeTruthy();
    // Nothing else in the hero is centred (host nodes only — RN's composite
    // View and its host "View" carry the same props).
    const centred = renderer.root
      .findByProps({ testID: "home-hero" })
      .findAll((n) => typeof n.type === "string" && n.props.testID !== "home-hero-figure-wrap"
        && flat(n.props.style).alignItems === "center" && flat(n.props.style).width === "100%");
    expect(centred).toHaveLength(0);
    for (const t of renderer.root.findAllByType(Text)) expect(flat(t.props.style).textAlign).toBeUndefined();
  });
});

// TASK_071 — the figure is frosted glass, and the GLYPHS are the glass: no
// plate behind them, nothing else in the hero gets the treatment.
describe("HomeHero — glass figure", () => {
  it("web: the body is a translucent gradient clipped to the text, with a soft teal shadow layer, a dark depth edge and a white rim", () => {
    const g = figureGlassStyles("web");
    for (const role of ["number", "unit"] as const) {
      const body = g[role].body as Record<string, string>;
      expect(body.backgroundClip).toBe("text");
      expect(body.color).toBe("transparent");
      expect(body.WebkitTextFillColor).toBe("transparent");
      expect(body.backgroundImage).toMatch(/^linear-gradient\(180deg, rgba\(255,255,255,0\.9\d\) 0%/);
      // Translucent, never an opaque white block; ends on the pale mint, not pure white.
      expect(body.backgroundImage).toMatch(/rgba\(214,240,231,0\.\d+\) 100%\)$/);
      const shadow = g[role].shadow as Record<string, string>;
      expect(shadow.color).toBe("transparent");
      expect(shadow.textShadow).toMatch(/^0 \d+px \d+px rgba\(10,87,72,0\.\d+\), 0 1px \dpx rgba\(10,87,72,0\.\d+\)$/);
      const depth = g[role].depth as Record<string, string>;
      expect(depth.color).toMatch(/^rgba\(10,87,72,0\.\d+\)$/);
      const rim = g[role].rim as Record<string, string>;
      expect(rim.color).toBe("transparent");
      expect(rim.WebkitTextStroke).toBe(`${FIGURE_GLASS.rimWidth}px ${FIGURE_GLASS.rim}`);
    }
    // The unit is the same glass at lower strength — secondary, not a second headline.
    const alpha = (s: string, i = 0) => Number((s.match(/0\.\d+/g) ?? [])[i]);
    expect(alpha((g.unit.shadow as any).textShadow)).toBeLessThan(alpha((g.number.shadow as any).textShadow));
    expect(alpha((g.unit.depth as any).color)).toBeLessThan(alpha((g.number.depth as any).color));
  });

  it("native: only the body carries anything — a flat frosted fill with a soft teal shadow, no overlay styles", () => {
    const g = figureGlassStyles("ios");
    expect(g.number.body).toEqual({
      color: FIGURE_GLASS.bodySolid,
      textShadowColor: FIGURE_GLASS.shadowFar,
      textShadowOffset: { width: 0, height: 6 },
      textShadowRadius: 14,
    });
    expect((g.unit.body as any).color).toBe(FIGURE_GLASS.unitBodySolid);
    for (const role of ["number", "unit"] as const) {
      expect(g[role].shadow).toEqual({});
      expect(g[role].depth).toEqual({});
      expect(g[role].rim).toEqual({});
    }
  });

  it("renders no overlay layers on native and no plate behind the figure — the stack is bare", async () => {
    const renderer = await render();
    // jest-expo runs as iOS → no shadow/depth/rim copies of the row.
    expect(renderer.root.findAll((n) => typeof n.props.testID === "string" && /^home-hero-figure-(shadow|depth|rim)$/.test(n.props.testID))).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: "home-hero-figure" }).filter((n) => typeof n.type === "string")).toHaveLength(1);
    // No glass plate: neither the wrapper nor the stack has a fill, border, radius or blur.
    for (const id of ["home-hero-figure-wrap", "home-hero-figure-stack"]) {
      const style = flat(renderer.root.findByProps({ testID: id }).props.style) as Record<string, unknown>;
      expect(style.backgroundColor).toBeUndefined();
      expect(style.backgroundImage).toBeUndefined();
      expect(style.borderWidth).toBeUndefined();
      expect(style.borderRadius).toBeUndefined();
      expect(style.backdropFilter).toBeUndefined();
      expect(style.shadowOpacity).toBeUndefined();
    }
  });

  it("the glass stays on the figure only — caption, pace, metrics and pill labels keep plain inks", async () => {
    const renderer = await render();
    const figure = renderer.root.findByProps({ testID: "home-hero-figure" });
    const inFigure = new Set(figure.findAllByType(Text));
    for (const t of renderer.root.findAllByType(Text)) {
      if (inFigure.has(t)) continue;
      const st = flat(t.props.style) as Record<string, unknown>;
      expect(st.backgroundClip).toBeUndefined();
      expect(st.textShadowColor).toBeUndefined();
      expect(String(st.color)).not.toMatch(/^rgba\(255,255,255/);
    }
  });
});

describe("HomeHero — actions keep their routes", () => {
  it("'Детали' opens this month's details, 'Добавить часы' opens /entry — never /add", async () => {
    const renderer = await render();
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Детали месяца" }).props.onPress();
    });
    const now = new Date();
    expect(mockPush).toHaveBeenCalledWith(`/hours/month/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Добавить часы" }).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/entry");
    expect(mockPush).not.toHaveBeenCalledWith("/add");
  });

  it("the pills are light glass — translucent white, no border", async () => {
    const renderer = await render();
    const pill = renderer.root.findByProps({ accessibilityLabel: "Детали месяца" });
    const style = flat(typeof pill.props.style === "function" ? pill.props.style({ pressed: false }) : pill.props.style);
    expect(String(style.backgroundColor)).toMatch(/^rgba\(255,255,255,0\.\d+\)$/);
    expect(style.borderWidth).toBeUndefined();
  });
});
