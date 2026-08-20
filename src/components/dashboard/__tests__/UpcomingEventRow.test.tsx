// TASK_050 — "Через N дней" rows: the words ("Через" / "дней"/"дня"/"день")
// render in the interface's main dark navy, only the bare number is orange,
// and the whole phrase still exposes one combined accessibilityLabel
// ("Через 15 дней") instead of reading as three fragmented pieces.
// "Сегодня" / "Завтра" / "Просрочено" are untouched by this task — covered
// here only as a regression check that they keep their single-color TASK_049
// rendering.
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";
import { UpcomingEventRow } from "@/components/dashboard/UpcomingEventRow";
import { DS } from "@/components/dashboard/tokens";
import type { UpcomingItem } from "@/data/constants";

function renderRow(item: UpcomingItem) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(<UpcomingEventRow item={item} />);
  });
  return renderer!.root;
}

function futureISO(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function color(style: unknown): string | undefined {
  return (StyleSheet.flatten(style as never) as { color?: string }).color;
}

// React Native concatenates a Text node's string/nested-Text children
// directly (no separator inserted between them) — walk the JSON tree the
// same way to reconstruct exactly what a reader would see.
function flattenText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (typeof node === "object" && "children" in (node as Record<string, unknown>)) {
    return flattenText((node as { children: unknown }).children);
  }
  return "";
}

describe("UpcomingEventRow — TASK_050 'Через N дней' two-tone styling", () => {
  it("colors the words navy and the number orange, as two distinct Text styles", () => {
    const root = renderRow({ kind: "event", id: "e15", date: futureISO(15), title: "Конгресс" });

    const outer = root.findByProps({ accessibilityLabel: "Через 15 дней" });
    expect(color(outer.props.style)).toBe(DS.navy);

    // The number must be a nested Text with its own (different) color —
    // not baked into the same styled run as the surrounding words.
    const nested = outer.findAllByType(Text).filter((n) => n !== outer);
    const numberNode = nested.find((n) => color(n.props.style) === DS.todayInk);
    expect(numberNode).toBeDefined();
    expect(color(numberNode!.props.style)).not.toBe(color(outer.props.style));
  });

  it("keeps one combined accessibilityLabel matching the full relative phrase, for both 1- and 2-digit day counts", () => {
    expect(() =>
      renderRow({ kind: "event", id: "e3", date: futureISO(3), title: "A" }).findByProps({
        accessibilityLabel: "Через 3 дня",
      })
    ).not.toThrow();
    expect(() =>
      renderRow({ kind: "event", id: "e22", date: futureISO(22), title: "B" }).findByProps({
        accessibilityLabel: "Через 22 дня",
      })
    ).not.toThrow();
  });

  it("renders the visible text as one continuous, correctly spaced phrase (no leftover markers from the split)", () => {
    const root = renderRow({ kind: "event", id: "e15", date: futureISO(15), title: "Конгресс" });
    const outer = root.findByProps({ accessibilityLabel: "Через 15 дней" });
    // Not "Через15дней" (missing spaces) and not "Через  15  дней"
    // (doubled spaces) — exactly the same phrase the accessibilityLabel
    // states.
    expect(flattenText(outer)).toBe("Через 15 дней");
  });

  it("leaves 'Сегодня' / 'Завтра' / 'Просрочено' as single-color text, unaffected by the split", () => {
    const todayText = renderRow({ kind: "event", id: "t0", date: futureISO(0), title: "A" }).findByProps({
      children: "Сегодня",
    });
    expect(color(todayText.props.style)).toBe(DS.todayInk);

    const tomorrowText = renderRow({ kind: "event", id: "t1", date: futureISO(1), title: "B" }).findByProps({
      children: "Завтра",
    });
    expect(color(tomorrowText.props.style)).toBe(DS.warnInk);

    const overdueText = renderRow({ kind: "event", id: "t-1", date: futureISO(-3), title: "C" }).findByProps({
      children: "Просрочено",
    });
    expect(color(overdueText.props.style)).toBe(DS.danger);
  });

  it("keeps the absolute date after the separator in the existing muted color, unaffected by the split", () => {
    const root = renderRow({ kind: "event", id: "e15", date: futureISO(15), title: "Конгресс" });
    const dateNodes = root.findAllByType(Text).filter((n) => color(n.props.style) === DS.subInk);
    expect(dateNodes.length).toBeGreaterThan(0);
  });
});

// TASK_051 — direct regression test for the status-row element order: date
// first, then "·", then the relative phrase. Anchored to a fixed system
// clock (2026-08-20, the same fixture date TASK_048/049/050 use) so the
// event 15 days out lands on a specific, literal "4 сентября" instead of a
// date that drifts with whenever the suite happens to run — this lets the
// test assert the exact literal strings from the spec ("4 сентября · Через
// 15 дней") rather than only re-deriving them from the same production
// code under test. Checks the three status-row children directly (by
// position and by targeted findByProps/findAllByType lookups), not a full
// tree/snapshot comparison, so it stays robust to unrelated markup changes.
describe("UpcomingEventRow — TASK_051 metadata order ('дата · относительный срок')", () => {
  const FIXED_NOW = new Date(2026, 7, 20); // 20 August 2026

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders '4 сентября · Через 15 дней' in that exact order for a future event with both metadata", () => {
    const root = renderRow({ kind: "event", id: "e15", date: "2026-09-04", title: "Конгресс" }); // 15 days out
    const relative = root.findByProps({ accessibilityLabel: "Через 15 дней" });

    // 1. The absolute date is the first status-row child.
    const statusRow = relative.parent as ReactTestInstance;
    const children = statusRow.children as ReactTestInstance[];
    expect(children).toHaveLength(3);
    const [dateNode, separatorNode, relativeNode] = children;

    expect(flattenText(dateNode)).toBe("4 сентября");
    expect(color(dateNode.props.style)).toBe(DS.subInk);

    // 2. Then the "·" separator.
    expect(flattenText(separatorNode)).toBe("·");

    // 3. Then the relative phrase, carrying the full accessibilityLabel.
    expect(relativeNode).toBe(relative);
    expect(relative.props.accessibilityLabel).toBe("Через 15 дней");
    expect(flattenText(relative)).toBe("Через 15 дней");
  });

  it("colors the number orange and the surrounding 'Через'/'дней' words navy inside that same phrase", () => {
    const root = renderRow({ kind: "event", id: "e15b", date: "2026-09-04", title: "Конгресс" });
    const relative = root.findByProps({ accessibilityLabel: "Через 15 дней" });

    // Words ("Через " / " дней") sit directly on the outer Text, navy.
    expect(color(relative.props.style)).toBe(DS.navy);

    // The number is a nested Text, orange, distinct from the words' color.
    const numberNode = relative.findAllByType(Text).find((n) => n !== relative && color(n.props.style) === DS.todayInk);
    expect(numberNode).toBeDefined();
    expect(flattenText(numberNode)).toBe("15");
  });

  it("keeps the absolute date muted gray-blue even with the new date-first order", () => {
    const root = renderRow({ kind: "event", id: "e15c", date: "2026-09-04", title: "Конгресс" });
    const relative = root.findByProps({ accessibilityLabel: "Через 15 дней" });
    const statusRow = relative.parent as ReactTestInstance;
    const dateNode = (statusRow.children as ReactTestInstance[])[0];

    expect(flattenText(dateNode)).toBe("4 сентября");
    expect(color(dateNode.props.style)).toBe(DS.subInk);
  });
});

// TASK_052 — the same established style (date muted, "Через"/plural word
// navy, number orange, date-first order) now applies to EVERY future event,
// not just the first couple of cards within the old 30-day horizon. Anchored
// to the same fixed clock as the TASK_051 block above so the exact spec
// examples ("22 сентября · Через 33 дня", "11 октября · Через 52 дня",
// "28 ноября · Через 100 дней", "9 января 2027 · Через 142 дня") can be
// asserted literally, including a date that rolls into the next calendar
// year.
describe("UpcomingEventRow — TASK_052 no day-count cap on the relative phrase", () => {
  const FIXED_NOW = new Date(2026, 7, 20); // 20 August 2026

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function assertDateThenRelative(
    root: ReactTestInstance,
    expectedDate: string,
    expectedLabel: string,
    expectedNumber: string
  ) {
    const relative = root.findByProps({ accessibilityLabel: expectedLabel });

    const statusRow = relative.parent as ReactTestInstance;
    const children = statusRow.children as ReactTestInstance[];
    expect(children).toHaveLength(3);
    const [dateNode, separatorNode, relativeNode] = children;

    expect(flattenText(dateNode)).toBe(expectedDate);
    expect(color(dateNode.props.style)).toBe(DS.subInk);
    expect(flattenText(separatorNode)).toBe("·");
    expect(relativeNode).toBe(relative);

    expect(color(relative.props.style)).toBe(DS.navy);
    const numberNode = relative.findAllByType(Text).find((n) => n !== relative && color(n.props.style) === DS.todayInk);
    expect(numberNode).toBeDefined();
    expect(flattenText(numberNode)).toBe(expectedNumber);
  }

  it("renders '22 сентября · Через 33 дня' for an event 33 days out", () => {
    const root = renderRow({ kind: "event", id: "d33", date: "2026-09-22", title: "A" });
    assertDateThenRelative(root, "22 сентября", "Через 33 дня", "33");
  });

  it("renders '11 октября · Через 52 дня' for an event 52 days out", () => {
    const root = renderRow({ kind: "event", id: "d52", date: "2026-10-11", title: "B" });
    assertDateThenRelative(root, "11 октября", "Через 52 дня", "52");
  });

  it("renders '28 ноября · Через 100 дней' for an event 100 days out", () => {
    const root = renderRow({ kind: "event", id: "d100", date: "2026-11-28", title: "C" });
    assertDateThenRelative(root, "28 ноября", "Через 100 дней", "100");
  });

  it("renders '9 января 2027 · Через 142 дня' for an event that rolls into next year", () => {
    const root = renderRow({ kind: "event", id: "dNextYear", date: "2027-01-09", title: "D" });
    assertDateThenRelative(root, "9 января 2027", "Через 142 дня", "142");
  });

  it("still switches at 31 days — no cap, so it keeps the relative phrase where TASK_048 used to fall back to a bare date", () => {
    const root = renderRow({ kind: "event", id: "d31", date: "2026-09-20", title: "E" }); // 31 days out
    assertDateThenRelative(root, "20 сентября", "Через 31 день", "31");
  });
});
