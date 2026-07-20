// Pure, props-only component — no StoreProvider needed (TASK_032).
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { View } from "react-native";
import { WEEKDAYS_SHORT } from "@/data/calendarGrid";
import { HistoryCalendar } from "../HistoryCalendar";

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

async function renderCalendar(props: {
  year: number;
  monthIndex0: number;
  dailyMinutes: Map<number, number>;
  todayISO: string;
  onDayPress?: (dateISO: string) => void;
}): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<HistoryCalendar {...props} />);
  });
  return renderer!;
}

function cellFor(root: ReactTestRenderer["root"], day: number, label: string) {
  return root.findAll((n) => n.props.accessibilityLabel === `${day}: ${label}`)[0];
}

describe("HistoryCalendar — TASK_032", () => {
  it("renders the weekday header Monday-first, matching the shared WEEKDAYS_SHORT", async () => {
    const renderer = await renderCalendar({ year: 2026, monthIndex0: 6, dailyMinutes: new Map(), todayISO: "2026-07-19" });
    const texts: string[] = [];
    collectText(renderer.toJSON(), texts);
    const expected = WEEKDAYS_SHORT.map((w) => w.toUpperCase());
    expected.forEach((w) => expect(texts).toContain(w));
    expect(texts.indexOf("ПН")).toBeLessThan(texts.indexOf("ВС"));
  });

  it("shows the full grid for July 2026 (31 days), each cell defaulting to 0:00", async () => {
    const renderer = await renderCalendar({ year: 2026, monthIndex0: 6, dailyMinutes: new Map(), todayISO: "2026-07-01" });
    for (let d = 1; d <= 31; d++) {
      expect(cellFor(renderer.root, d, "0:00")).toBeTruthy();
    }
  });

  it("handles February in a leap year (29 days) without error", async () => {
    const renderer = await renderCalendar({ year: 2028, monthIndex0: 1, dailyMinutes: new Map(), todayISO: "2028-02-01" });
    expect(cellFor(renderer.root, 29, "0:00")).toBeTruthy();
  });

  it("sums minutes for a day into the H:MM cell label", async () => {
    const renderer = await renderCalendar({
      year: 2026,
      monthIndex0: 6,
      dailyMinutes: new Map([[19, 210]]),
      todayISO: "2026-07-01",
    });
    expect(cellFor(renderer.root, 19, "3:30")).toBeTruthy();
  });

  it("gives a day with logged time a distinct background from an empty day", async () => {
    const renderer = await renderCalendar({
      year: 2026,
      monthIndex0: 6,
      dailyMinutes: new Map([[5, 80]]),
      todayISO: "2026-07-01",
    });
    const filled = cellFor(renderer.root, 5, "1:20");
    const empty = cellFor(renderer.root, 6, "0:00");
    expect(Boolean(filled.props.style[1])).toBe(true);
    expect(Boolean(empty.props.style[1])).toBe(false);
  });

  // findAllByType(View) on the cell node walks its own descendants, which
  // includes the cell's own host-level render output before the nested
  // day-badge View — so the badge is the *second* View match, not the
  // first (the first shares the cell's own [cell, cellFilled] style).
  it("gives today's day-number a distinct badge, other days none", async () => {
    const renderer = await renderCalendar({ year: 2026, monthIndex0: 6, dailyMinutes: new Map(), todayISO: "2026-07-19" });
    const todayBadge = cellFor(renderer.root, 19, "0:00").findAllByType(View)[1];
    const otherBadge = cellFor(renderer.root, 18, "0:00").findAllByType(View)[1];
    expect(Boolean(todayBadge.props.style[1])).toBe(true);
    expect(Boolean(otherBadge.props.style[1])).toBe(false);
  });

  it("combines the today accent and the filled-day background on the same cell", async () => {
    const renderer = await renderCalendar({
      year: 2026,
      monthIndex0: 6,
      dailyMinutes: new Map([[19, 210]]),
      todayISO: "2026-07-19",
    });
    const cell = cellFor(renderer.root, 19, "3:30");
    expect(Boolean(cell.props.style[1])).toBe(true);
    const badge = cell.findAllByType(View)[1];
    expect(Boolean(badge.props.style[1])).toBe(true);
  });

  it("calls onDayPress with the tapped day's ISO date when the day has logged time (TASK_033)", async () => {
    const onDayPress = jest.fn();
    const renderer = await renderCalendar({
      year: 2026,
      monthIndex0: 6,
      dailyMinutes: new Map([[19, 90]]),
      todayISO: "2026-07-01",
      onDayPress,
    });
    const cell = cellFor(renderer.root, 19, "1:30");
    await act(async () => {
      cell.props.onPress();
    });
    expect(onDayPress).toHaveBeenCalledWith("2026-07-19");
  });

  it("does not attach onPress to a day with zero logged minutes", async () => {
    const onDayPress = jest.fn();
    const renderer = await renderCalendar({
      year: 2026,
      monthIndex0: 6,
      dailyMinutes: new Map(),
      todayISO: "2026-07-01",
      onDayPress,
    });
    const cell = cellFor(renderer.root, 19, "0:00");
    expect(cell.props.onPress).toBeUndefined();
  });
});
