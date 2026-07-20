// TASK_032 — redesigned "История": current-month calendar grid + flat
// session list, replacing the old all-service-years buildHistory() model
// (see the removed app/__tests__/history.test.ts). "Today" is pinned via
// jest.setSystemTime so the current-month grid/heading are deterministic.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider, useStore } from "@/store/StoreContext";
import type { Session } from "@/types";
import HistoryScreen from "../history";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn(), push: jest.fn() },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as {
  router: { back: jest.Mock; canGoBack: jest.Mock; replace: jest.Mock; push: jest.Mock };
};

jest.setTimeout(30000);

const NOW = new Date("2026-07-19T12:00:00.000Z");

function session(date: string, durationMinutes: number, id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    date,
    durationMinutes,
    source: "manual",
    note: "",
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    ...overrides,
  };
}

function collectText(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
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

async function renderScreen(): Promise<{ texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <HistoryScreen />
      </StoreProvider>,
    );
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
  return {
    texts: () => {
      const out: string[] = [];
      collectText(renderer.toJSON(), out);
      return out;
    },
    root: () => renderer.root,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("History screen — TASK_032", () => {
  it("renders the title and a Monday-first weekday header", async () => {
    const { texts } = await renderScreen();
    const t = texts();
    expect(t).toContain("История");
    expect(t.indexOf("ПН")).toBeLessThan(t.indexOf("ВС"));
  });

  it("shows the current month/year heading", async () => {
    const { texts } = await renderScreen();
    // The heading renders as separate JSX children ("Июль", " ", "2026"),
    // so a naive join(" ") introduces extra spaces — assert adjacency in
    // the flattened text list instead of a single joined substring.
    const t = texts().filter((s) => s.trim() !== "");
    const idx = t.indexOf("Июль");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(t[idx + 1]).toBe("2026");
  });

  it("shows an empty-state message and no session rows when the month has no data", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Нет записей за этот месяц");
  });

  it("highlights today's calendar cell even with zero minutes logged", async () => {
    const { root } = await renderScreen();
    // react-test-renderer's findAll matches both the composite View wrapper
    // and its underlying host node for the same element, so >0 (not ===1)
    // is the correct assertion here.
    expect(root().findAll((n) => n.props.accessibilityLabel === "19: 0:00").length).toBeGreaterThan(0);
  });

  it("sums same-day sessions into one calendar cell", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([session("2026-07-19", 60, "a"), session("2026-07-19", 30, "b")]),
    );
    const { root } = await renderScreen();
    expect(root().findAll((n) => n.props.accessibilityLabel === "19: 1:30").length).toBeGreaterThan(0);
    expect(root().findAll((n) => n.props.accessibilityLabel === "19: 0:00").length).toBe(0);
  });

  it("lists sessions of the current month in reverse-chronological order", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([session("2026-07-05", 60, "s1"), session("2026-07-19", 30, "s2"), session("2026-07-12", 45, "s3")]),
    );
    const { texts } = await renderScreen();
    const t = texts();
    const i19 = t.findIndex((s) => s.startsWith("19 июл"));
    const i12 = t.findIndex((s) => s.startsWith("12 июл"));
    const i5 = t.findIndex((s) => s.startsWith("5 июл"));
    expect(i19).toBeGreaterThanOrEqual(0);
    expect(i19).toBeLessThan(i12);
    expect(i12).toBeLessThan(i5);
  });

  it("shows the start time for a timer session", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([
        session("2026-07-19", 210, "t1", {
          source: "timer",
          startTime: "2026-07-19T15:34:00.000",
          endTime: "2026-07-19T19:04:00.000",
        }),
      ]),
    );
    const { texts } = await renderScreen();
    expect(texts()).toContain("19 июл. 2026, 15:34");
  });

  it("shows only the date, never a fabricated time, for a manual session", async () => {
    await AsyncStorage.setItem("mj_sessions_v1", JSON.stringify([session("2026-07-18", 80, "m1")]));
    const { texts } = await renderScreen();
    expect(texts()).toContain("18 июл. 2026");
  });

  it("excludes sessions from other months from the list", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([session("2026-06-30", 60, "prev"), session("2026-08-01", 60, "next")]),
    );
    const { texts } = await renderScreen();
    expect(texts()).toContain("Нет записей за этот месяц");
  });

  it("does not group by service year or show legacy monthly rows (old buildHistory model is gone)", async () => {
    const { texts } = await renderScreen();
    const t = texts();
    expect(t.some((s) => /^\d{4}–\d{4}$/.test(s))).toBe(false);
    expect(t.some((s) => s.includes("Записано по месяцу"))).toBe(false);
  });

  it("the back button navigates back", async () => {
    const { root } = await renderScreen();
    const backBtn = root().findAll((n) => n.props.accessibilityLabel === "Назад")[0];
    await act(async () => {
      backBtn.props.onPress();
    });
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

// TASK_033 — period switcher (Месяц/Год/Всё время), «Итого» card, and
// edit-by-tapping-a-day. Reuses the same NOW-pinned renderScreen() helper
// above; each test seeds only the sessions it needs via AsyncStorage.
describe("History screen — TASK_033 period filters, Итого, day tap-to-edit", () => {
  function findByLabel(root: ReactTestRenderer["root"], label: string) {
    return root.findAll((n) => n.props.accessibilityLabel === label)[0];
  }

  it("defaults to the Month period, selected in the switcher", async () => {
    const { root } = await renderScreen();
    const monthSeg = findByLabel(root(), "Месяц");
    const yearSeg = findByLabel(root(), "Год");
    expect(monthSeg.props.accessibilityState?.selected).toBe(true);
    expect(yearSeg.props.accessibilityState?.selected).toBe(false);
  });

  it("shows the current month and «Текущий месяц» subtitle by default", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Июль 2026");
    expect(texts()).toContain("Текущий месяц");
  });

  it("switches to the Year period and shows the current year with its subtitle", async () => {
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Год").props.onPress();
    });
    expect(texts()).toContain("2026");
    expect(texts()).toContain("Текущий год");
  });

  it("switches to the All-time period, shows «Весь период», and disables the nav arrows", async () => {
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Всё время").props.onPress();
    });
    expect(texts()).toContain("Весь период");
    expect(findByLabel(root(), "Предыдущий период").props.accessibilityState?.disabled).toBe(true);
    expect(findByLabel(root(), "Следующий период").props.accessibilityState?.disabled).toBe(true);
  });

  it("navigates to the previous and next month", async () => {
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Предыдущий период").props.onPress();
    });
    expect(texts()).toContain("Июнь 2026");

    await act(async () => {
      findByLabel(root(), "Следующий период").props.onPress();
    });
    await act(async () => {
      findByLabel(root(), "Следующий период").props.onPress();
    });
    expect(texts()).toContain("Август 2026");
  });

  it("wraps December to January of the next year", async () => {
    jest.setSystemTime(new Date("2026-12-15T12:00:00.000Z"));
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Следующий период").props.onPress();
    });
    expect(texts()).toContain("Январь 2027");
  });

  it("wraps January to December of the previous year", async () => {
    jest.setSystemTime(new Date("2027-01-15T12:00:00.000Z"));
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Предыдущий период").props.onPress();
    });
    expect(texts()).toContain("Декабрь 2026");
  });

  it("navigates between years in the Year period", async () => {
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Год").props.onPress();
    });
    await act(async () => {
      findByLabel(root(), "Предыдущий период").props.onPress();
    });
    expect(texts()).toContain("2025");
  });

  it("computes the Month total from only the displayed month's sessions", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([
        session("2026-07-05", 60, "a"),
        session("2026-07-19", 30, "b"),
        session("2026-06-30", 999, "c"),
      ]),
    );
    const { texts } = await renderScreen();
    expect(texts()).toContain("1 час 30 минут");
  });

  it("computes the Year total across every month of the displayed year", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([
        session("2026-01-10", 60, "a"),
        session("2026-07-19", 30, "b"),
        session("2025-12-31", 999, "c"),
      ]),
    );
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Год").props.onPress();
    });
    expect(texts()).toContain("1 час 30 минут");
  });

  it("computes the All-time total across every stored session", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([session("2020-01-10", 60, "a"), session("2026-07-19", 30, "b")]),
    );
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Всё время").props.onPress();
    });
    expect(texts()).toContain("1 час 30 минут");
  });

  it("shows «0 часов 0 минут» for an empty period", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("0 часов 0 минут");
  });

  it("never shows a «Изучения Библии» line or metric", async () => {
    const { texts } = await renderScreen();
    const t = texts();
    expect(t.some((s) => s.includes("Библии"))).toBe(false);
    expect(t.some((s) => s.includes("Bible"))).toBe(false);
  });

  it("tapping a day with one session opens it for editing via /entry?id=", async () => {
    await AsyncStorage.setItem("mj_sessions_v1", JSON.stringify([session("2026-07-19", 90, "solo")]));
    const { root } = await renderScreen();
    const cell = findByLabel(root(), "19: 1:30");
    await act(async () => {
      cell.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/entry?id=solo");
  });

  it("tapping a day with no session does not navigate", async () => {
    const { root } = await renderScreen();
    const cell = findByLabel(root(), "19: 0:00");
    expect(cell.props.onPress).toBeUndefined();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("tapping a day with multiple sessions opens a picker; selecting one navigates to that exact record", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([session("2026-07-19", 60, "first"), session("2026-07-19", 45, "second")]),
    );
    const { root } = await renderScreen();
    const cell = findByLabel(root(), "19: 1:45");
    await act(async () => {
      cell.props.onPress();
    });

    const firstRow = findByLabel(root(), "Запись: 1:00");
    await act(async () => {
      firstRow.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/entry?id=first");
  });

  it("recomputes the Итого total after a session is saved elsewhere (e.g. via /entry)", async () => {
    let save: ((input: { date: string; durationMinutes: number; source: "manual" | "timer" }) => void) | null = null;
    function Harness() {
      const store = useStore();
      save = store.saveSession;
      return <HistoryScreen />;
    }
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <StoreProvider>
          <Harness />
        </StoreProvider>,
      );
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
    const textsOf = (): string[] => {
      const out: string[] = [];
      collectText(renderer.toJSON(), out);
      return out;
    };
    expect(textsOf()).toContain("0 часов 0 минут");

    await act(async () => {
      save!({ date: "2026-07-19", durationMinutes: 90, source: "manual" });
      for (let i = 0; i < 4; i++) await Promise.resolve();
    });
    expect(textsOf()).toContain("1 час 30 минут");
  });
});

// TASK_034 — reconnect legacy HourRecord into History (Session-first),
// clickable list rows, and legacy-month navigation to the existing
// /hours/month/[key] editor. See
// docs/TASKS/TASK_034_HISTORY_DATA_RECOVERY_AND_CRUD.md.
describe("History screen — TASK_034 legacy data recovery and row clicks", () => {
  function findByLabel(root: ReactTestRenderer["root"], label: string) {
    return root.findAll((n) => n.props.accessibilityLabel === label)[0];
  }

  it("tapping a list row navigates to /entry?id=<session.id>", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([session("2026-07-05", 60, "row-a"), session("2026-07-19", 30, "row-b")]),
    );
    const { root } = await renderScreen();
    const row = root().findAll(
      (n) => typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Запись") && typeof n.props.onPress === "function",
    )[0];
    await act(async () => {
      row.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringMatching(/^\/entry\?id=(row-a|row-b)$/));
  });

  it("two rows on different days each open their own exact session id", async () => {
    await AsyncStorage.setItem(
      "mj_sessions_v1",
      JSON.stringify([session("2026-07-05", 60, "row-a"), session("2026-07-19", 60, "row-b")]),
    );
    const { root } = await renderScreen();
    const rows = root().findAll(
      (n) => typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Запись") && typeof n.props.onPress === "function",
    );
    expect(rows).toHaveLength(2);
    await act(async () => rows[0].props.onPress());
    expect(mockRouter.push).toHaveBeenCalledWith("/entry?id=row-b"); // reverse-chronological: 19th first
    await act(async () => rows[1].props.onPress());
    expect(mockRouter.push).toHaveBeenCalledWith("/entry?id=row-a");
  });

  it("shows the legacy monthly total and the no-daily-breakdown caption when the month has a HourRecord but no Session", async () => {
    await AsyncStorage.setItem(
      "mj_records_v1",
      JSON.stringify([{ id: "r1", year: 2026, month: 3, hours: 46, note: "" }]),
    );
    const { root, texts } = await renderScreen();
    // navigate from July to March 2026 (4 months back) — one act() per
    // press, since state updates batched inside a single act() would all
    // read the same pre-render closure and net out to a single month move.
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        findByLabel(root(), "Предыдущий период").props.onPress();
      });
    }
    const t = texts();
    expect(t).toContain("Сохранён месячный итог без разбивки по дням");
    expect(t.some((s) => s.includes("46 ч"))).toBe(true);
    expect(t).not.toContain("Нет записей за этот месяц");
  });

  it("tapping the legacy month row navigates to /hours/month/<year>-<month>", async () => {
    await AsyncStorage.setItem(
      "mj_records_v1",
      JSON.stringify([{ id: "r1", year: 2026, month: 3, hours: 46, note: "" }]),
    );
    const { root } = await renderScreen();
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        findByLabel(root(), "Предыдущий период").props.onPress();
      });
    }
    const legacyRow = root().findAll(
      (n) => typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Месячный итог"),
    )[0];
    await act(async () => {
      legacyRow.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/hours/month/2026-03");
  });

  it("prefers Session over a legacy HourRecord for the same month (Session-first) — shows the session list, not the legacy row", async () => {
    await AsyncStorage.setItem(
      "mj_records_v1",
      JSON.stringify([{ id: "r1", year: 2026, month: 7, hours: 999, note: "" }]),
    );
    await AsyncStorage.setItem("mj_sessions_v1", JSON.stringify([session("2026-07-19", 30, "real")]));
    const { texts } = await renderScreen();
    const t = texts();
    expect(t).not.toContain("Сохранён месячный итог без разбивки по дням");
    expect(t.some((s) => s.includes("999 ч"))).toBe(false);
  });

  it("still shows the plain empty state for a month with neither Session nor HourRecord", async () => {
    const { texts } = await renderScreen();
    expect(texts()).toContain("Нет записей за этот месяц");
    expect(texts()).not.toContain("Сохранён месячный итог без разбивки по дням");
  });

  it("Итого for Year period includes legacy HourRecord months alongside Session months", async () => {
    await AsyncStorage.setItem(
      "mj_records_v1",
      JSON.stringify([{ id: "r1", year: 2026, month: 1, hours: 10, note: "" }]),
    );
    await AsyncStorage.setItem("mj_sessions_v1", JSON.stringify([session("2026-07-19", 30, "s")]));
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Год").props.onPress();
    });
    // 10h (Jan, legacy) + 30min (Jul, session) = 10ч 30мин
    expect(texts()).toContain("10 часов 30 минут");
  });

  it("Итого for All-time includes every legacy HourRecord month, even ones far outside the current view", async () => {
    await AsyncStorage.setItem(
      "mj_records_v1",
      JSON.stringify([{ id: "old", year: 2003, month: 9, hours: 5, note: "" }]),
    );
    const { root, texts } = await renderScreen();
    await act(async () => {
      findByLabel(root(), "Всё время").props.onPress();
    });
    expect(texts()).toContain("5 часов 0 минут");
  });

  it("navigating Prev repeatedly in Month period reaches years far before 2026 (no lower bound)", async () => {
    const { root, texts } = await renderScreen();
    for (let i = 0; i < 12 * 23; i++) {
      await act(async () => {
        findByLabel(root(), "Предыдущий период").props.onPress();
      });
    }
    expect(texts()).toContain("2003");
  });
});
