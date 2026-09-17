// TASK_065 — HomeHero: the month figures laid directly on the hero, no card.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, STORAGE_KEYS } from "@/store/StoreContext";
import { HomeHero } from "@/components/dashboard/HomeHero";
import { DS, MINISTRY } from "@/components/dashboard/tokens";
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
  it("shows eyebrow (month + year), the headline figure and its goal caption", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([sessionToday(90)]));
    const renderer = await render();
    const all = texts(renderer);
    const now = new Date();
    expect(all.some((t) => new RegExp(`^[А-Я][а-я]+ ${now.getFullYear()}$`).test(t))).toBe(true);
    expect(all).toContain("1 ч 30 м");
    expect(all.some((t) => t.startsWith(`из цели ${MONTHLY_GOAL} ч`) && t.includes("% выполнено"))).toBe(true);
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

  it("uses the hero inks (not DS.navy / DS.subInk) for the figure and captions", async () => {
    const renderer = await render();
    const figure = renderer.root.findAll((n) => n.type === Text && flat(n.props.style).fontSize === 46)[0];
    expect(flat(figure.props.style).color).toBe(MINISTRY.ink);
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
