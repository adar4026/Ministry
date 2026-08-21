// TASK_056 — UpcomingEventRow is now a thin adapter over the shared
// "События"-style EventListCard: DD-MM-YYYY date (+ talk location/№),
// "через/прошло N мес. N дн." relative time (red only for a past,
// non-today date — these items are normally future-only, but the shared
// card logic is still exercised directly here), category dot + Badge (or
// the talk badge), and an optional functional edit icon.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";
import { UpcomingEventRow } from "@/components/dashboard/UpcomingEventRow";
import { TIMELINE_COLORS } from "@/components/timeline/timelineTokens";
import type { UpcomingItem } from "@/data/constants";
import type { MinistryEvent, Talk } from "@/types";

function render(item: UpcomingItem, onEdit?: (item: UpcomingItem) => void): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<UpcomingEventRow item={item} onEdit={onEdit} />);
  });
  return renderer;
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

function texts(renderer: ReactTestRenderer): string[] {
  const out: string[] = [];
  collectText(renderer.toJSON(), out);
  return out;
}

function color(style: unknown): string | undefined {
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  return (flat as { color?: string } | undefined)?.color;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isoDaysFromNow(n: number): string {
  return isoDaysAgo(-n);
}

function eventItem(overrides: Partial<MinistryEvent> & { id: string; date: string; title: string }): UpcomingItem {
  const event: MinistryEvent = { category: "other", ...overrides };
  return { kind: "event", id: event.id, date: event.date, title: event.title, event };
}

function talkItem(overrides: Partial<Talk> & { id: string; date: string }): UpcomingItem {
  const talk: Talk = { number: null, title: "", location: "", ...overrides };
  const title = talk.title || (talk.number ? `Речь №${talk.number}` : "Специальная речь");
  return { kind: "talk", id: talk.id, date: talk.date, title, talk };
}

describe("UpcomingEventRow — structure (TASK_056)", () => {
  it("renders the date as DD-MM-YYYY, never a human/ISO form", () => {
    const renderer = render(eventItem({ id: "e1", date: "2026-09-04", title: "Конгресс" }));
    const t = texts(renderer).join(" ");
    expect(t).toContain("04-09-2026");
    expect(t).not.toContain("2026-09-04");
    expect(t).not.toContain("4 сентября");
  });

  it("renders the unified relative-time format, not 'Через N дней'", () => {
    const renderer = render(eventItem({ id: "e2", date: isoDaysFromNow(15), title: "Конгресс" }));
    const t = texts(renderer).join(" ");
    expect(t).toMatch(/^через |через /);
    expect(t).not.toContain("Через 15 дней");
  });

  it("colors a past (non-today) item's relative time red, future stays amber", () => {
    const past = render(eventItem({ id: "e3", date: isoDaysAgo(6), title: "Прошедшее" }));
    const pastNode = past.root.findByProps({ children: "прошло 6 дн." });
    expect(color(pastNode.props.style)).toBe(TIMELINE_COLORS.danger);

    const future = render(eventItem({ id: "e4", date: isoDaysFromNow(6), title: "Будущее" }));
    const futureNode = future.root.findByProps({ children: "через 6 дн." });
    expect(color(futureNode.props.style)).toBe(TIMELINE_COLORS.durationAccent);
  });

  it("renders a talk's location and number on the date line, with the talk badge", () => {
    const renderer = render(
      talkItem({ id: "t1", date: "2026-09-04", number: 75, location: "Зал царства" }),
    );
    const t = texts(renderer).join(" ");
    expect(t).toContain("04-09-2026");
    expect(t).toContain("Зал царства");
    expect(t).toContain("№75");
    expect(t).toContain("Публичная речь");
  });

  it("shows no edit icon when onEdit is omitted, and calls onEdit with the item when provided", () => {
    const noEdit = render(eventItem({ id: "e5", date: "2026-01-01", title: "A" }));
    expect(noEdit.root.findAllByType(Text).some((n) => n.props.children === "✏")).toBe(false);

    const onEdit = jest.fn();
    const item = eventItem({ id: "e6", date: "2026-01-01", title: "B" });
    const withEdit = render(item, onEdit);
    const editBtn = withEdit.root.findByProps({ accessibilityLabel: "Редактировать: B" });
    act(() => {
      editBtn.props.onPress();
    });
    expect(onEdit).toHaveBeenCalledWith(item);
  });
});
