// Component-level render test for HoursHeroCard ("Ministry Calm" redesign,
// TASK_014; pace-status label TASK_015). Verifies the card renders real
// month-progress data end-to-end through StoreContext: the 5-minute-rounded
// primary metric (stored data itself stays exact), the two-item info row
// (Осталось / До конца), the pace-deviation label, the "Детали" action
// (existing Month Details route), and the "Добавить часы" action (existing
// Manual Time Entry route) — not the timer. TASK_015 removed the visible
// month/year label from this card per the approved design (it remains only
// in the spoken accessibility label); a cumulative line-chart direction was
// also tried during TASK_015 and rejected in favor of keeping the original
// horizontal progress bar — see
// docs/TASKS/TASK_015_HOME_MONTHLY_PACE_STATUS.md §6.
//
// TASK_048 added the "one graphical progress indicator" contract below: the
// ring is gone from this card and the percentage is text.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { HoursHeroCard } from "@/components/dashboard/HoursHeroCard";
import { HeroProgressRing } from "@/components/dashboard/HeroProgressRing";
import { StoreProvider, useStore } from "@/store/StoreContext";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as { router: { push: jest.Mock } };

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

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

async function renderCard(): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <HoursHeroCard />
      </StoreProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return {
    store: () => latest as unknown as Store,
    texts: () => {
      const out: string[] = [];
      collectText(renderer.toJSON(), out);
      return out;
    },
    root: () => renderer.root,
  };
}

function setLegacyHours(store: Store, year: number, month: number, hours: number) {
  const existing = store.records.find((r) => r.year === year && r.month === month);
  store.saveRecord({ id: existing?.id, year, month, hours });
}

function storedHours(store: Store, year: number, month: number): number | undefined {
  return store.records.find((r) => r.year === year && r.month === month)?.hours;
}

function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Adds a real Session — the current-month path monthProgress()/
// computePaceDeviation() actually read, unlike setLegacyHours() above which
// exercises the legacy-fallback branch that real users can't reach for the
// current month (legacyEntryBlockReason() refuses it).
function addSession(store: Store, date: string, durationMinutes: number) {
  store.saveSession({ date, durationMinutes, source: "manual" });
}

const MONTHS_NOM = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("HoursHeroCard — TASK_014 Ministry Calm redesign", () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  it("does not render a visible month/year label or 'Этот месяц' (TASK_015 removed both)", async () => {
    const { texts } = await renderCard();
    const rendered = texts();
    expect(rendered).not.toContain("Этот месяц");
    expect(rendered.join(" ")).not.toContain(`${MONTHS_NOM[now.getMonth()]} ${year}`);
  });

  it("renders normal progress: 5-minute-rounded hours done, goal label, and percentage", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 33);
    });
    const rendered = texts();
    expect(rendered).toContain("33 ч");
    expect(rendered.join(" ")).toContain("из цели 50 часов");
    // TASK_048: the percentage is stated in words next to the headline
    // figure, not drawn a second time inside a ring.
    expect(rendered.join(" ")).toContain("66% выполнено");
  });

  it("applies 5-minute display rounding to the primary metric without altering stored data", async () => {
    const { store, texts } = await renderCard();
    // 33h37m rounds down for display to 33h35m, but the stored HourRecord
    // itself must keep the exact fractional-hours value.
    await act(async () => {
      setLegacyHours(store(), year, month, 33 + 37 / 60);
    });
    expect(storedHours(store(), year, month)).toBeCloseTo(33 + 37 / 60, 5);
    const rendered = texts();
    expect(rendered).toContain("33 ч 35 м");
    expect(rendered.join(" ")).not.toContain("33 ч 37 м");
  });

  it("renders the two-item info row: Осталось and days remaining, without the removed В среднем item (TASK_016)", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 12);
    });
    const rendered = texts();
    expect(rendered).toContain("Осталось");
    expect(rendered).not.toContain("В среднем");
    expect(rendered.some((t) => /^\d+ (день|дня|дней)$/.test(t))).toBe(true);
  });

  it("labels the days-remaining column 'До конца' for symmetry with 'Осталось' (TASK_028)", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 12);
    });
    expect(texts()).toContain("До конца");
  });

  it("renders zero progress without a false percentage or crash", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 0);
    });
    const rendered = texts();
    expect(rendered).toContain("0 ч");
    expect(rendered.join(" ")).toContain("0% выполнено");
  });

  it("shows 'Цель достигнута' when the goal is reached, with hours still visible", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 50);
    });
    const rendered = texts();
    expect(rendered).toContain("50 ч");
    expect(rendered).toContain("Цель достигнута");
  });

  it("caps the bar visually when the goal is exceeded, while text stays non-negative", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 65);
    });
    const rendered = texts();
    expect(rendered).toContain("65 ч");
    expect(rendered).toContain("Цель достигнута");
    expect(rendered.some((t) => t.includes("-"))).toBe(false);
  });

  it("never renders the removed 'Этот месяц' label or the timer action", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 33);
    });
    const rendered = texts();
    expect(rendered).not.toContain("Начать служение");
    expect(rendered).not.toContain("Этот месяц");
  });

  it("renders the contextual 'Добавить часы' action and navigates to the existing Manual Time Entry route", async () => {
    mockRouter.push.mockClear();
    const { root, texts } = await renderCard();
    const button = root().findByProps({ accessibilityLabel: "Добавить часы" });
    expect(button.props.accessibilityRole).toBe("button");
    await act(async () => {
      button.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/entry");
    expect(mockRouter.push).not.toHaveBeenCalledWith(expect.stringContaining("timer"));
    // TASK_048 §2.5 — the visible label must disambiguate this contextual
    // "add hours" action from the tab bar's global "+" (which opens /add).
    expect(texts()).toContain("Добавить часы");
    expect(texts()).not.toContain("Добавить");
    expect(mockRouter.push).not.toHaveBeenCalledWith("/add");
  });

  // --- TASK_048 -----------------------------------------------------------

  it("renders exactly one graphical progress indicator: the bar, never the ring", async () => {
    const { store, root, texts } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 33);
    });
    // No ring component, and — the structural check that would still catch a
    // hand-rolled replacement — no arc: `strokeDasharray` is what turns a
    // circle into a progress ring, and nothing else in this card (the plain
    // clock/calendar/plus/chevron icons included) uses it.
    expect(root().findAllByType(HeroProgressRing)).toHaveLength(0);
    expect(root().findAll((n) => n.props?.strokeDasharray !== undefined, { deep: true })).toHaveLength(0);
    // The percentage still exists, once, as text.
    const rendered = texts().join(" ");
    expect(rendered).toContain("66% выполнено");
    expect(rendered.match(/66%/g)).toHaveLength(1);
  });

  it("still renders the horizontal progress bar, width-clamped to the goal", async () => {
    const { store, root } = await renderCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 65); // 130% of the goal
    });
    const fills = root().findAll(
      (n) => Array.isArray(n.props?.style) && JSON.stringify(n.props.style).includes('"width":"100%"'),
      { deep: true },
    );
    expect(fills.length).toBeGreaterThan(0);
  });

  it("colors the pace status green only when genuinely ahead, and warns when behind", async () => {
    const { store, root } = await renderCard();
    // Behind: nothing logged yet.
    // Host elements only — react-test-renderer also surfaces the composite
    // <Text> wrapper with identical props.
    const behind = root().findAll(
      (n) => (n.type as unknown) === "Text" && typeof n.props?.children === "string" && n.props.children.startsWith("Отставание"),
    );
    expect(behind).toHaveLength(1);
    expect(JSON.stringify(behind[0].props.style)).toContain("#dc2626");

    await act(async () => {
      addSession(store(), toISODate(now), 51 * 60);
    });
    const ahead = root().findAll(
      (n) => (n.type as unknown) === "Text" && typeof n.props?.children === "string" && n.props.children.startsWith("Опережение"),
    );
    expect(ahead).toHaveLength(1);
    expect(JSON.stringify(ahead[0].props.style)).toContain("#15803d");
  });

  it("shows an ahead-of-pace deviation label when cumulative hours clear the ideal pace (TASK_015)", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      // 51h in a single day is above any possible ideal-at-today value
      // (max is the goal itself, 50h, on the month's last day) — ahead
      // regardless of which real calendar day the test runs on.
      addSession(store(), toISODate(now), 51 * 60);
    });
    const rendered = texts().join(" ");
    expect(rendered).toContain("Опережение на");
    expect(rendered).not.toContain("Отставание на");
  });

  it("shows a behind-of-pace deviation label when no hours have been logged yet (TASK_015)", async () => {
    const { texts } = await renderCard();
    const rendered = texts().join(" ");
    // With 0 hours done, the ideal pace at any day >= 1 of a 50h goal is
    // > 0, so this is deterministically "behind" regardless of today's date.
    expect(rendered).toContain("Отставание на");
    expect(rendered).not.toContain("Опережение на");
  });

  it("sums same-day Session entries into the displayed total correctly (TASK_015)", async () => {
    const { store, texts } = await renderCard();
    await act(async () => {
      addSession(store(), toISODate(now), 60);
      addSession(store(), toISODate(now), 30);
    });
    const rendered = texts();
    expect(rendered).toContain("1 ч 30 м");
  });

  it("renders the 'Детали' action and navigates to the existing Month Details route", async () => {
    mockRouter.push.mockClear();
    const { root } = await renderCard();
    const button = root().findByProps({ accessibilityLabel: "Детали месяца" });
    expect(button.props.accessibilityRole).toBe("button");
    await act(async () => {
      button.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith(`/hours/month/${monthKey}`);
  });
});
