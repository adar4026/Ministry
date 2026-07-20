// TASK_032 — redesigned "История": current-month calendar grid + flat
// session list, replacing the old all-service-years buildHistory() model
// (see the removed app/__tests__/history.test.ts). "Today" is pinned via
// jest.setSystemTime so the current-month grid/heading are deterministic.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { StoreProvider } from "@/store/StoreContext";
import type { Session } from "@/types";
import HistoryScreen from "../history";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { router: mockRouter } = jest.requireMock("expo-router") as {
  router: { back: jest.Mock; canGoBack: jest.Mock; replace: jest.Mock };
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
