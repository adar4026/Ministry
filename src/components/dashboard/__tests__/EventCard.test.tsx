// TASK_056 — EventCard is now a thin adapter over the shared "События"-style
// EventListCard: DD-MM-YYYY date, "через/прошло N мес. N дн." relative time
// (red for a past, non-today date), category dot + Badge, and an optional
// functional edit icon.
import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import { EventCard } from "@/components/dashboard/EventCard";
import { TIMELINE_COLORS } from "@/components/timeline/timelineTokens";
import type { MinistryEvent } from "@/types";

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

function render(event: MinistryEvent, onEdit?: (event: MinistryEvent) => void) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(<EventCard event={event} onEdit={onEdit} />);
  });
  return renderer!;
}

function texts(renderer: ReturnType<typeof create>): string[] {
  const out: string[] = [];
  collectText(renderer.toJSON(), out);
  return out;
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

function color(style: unknown): string | undefined {
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  return (flat as { color?: string } | undefined)?.color;
}

describe("EventCard", () => {
  it("renders the date as DD-MM-YYYY, never a human/ISO form", () => {
    const t = texts(render({ id: "e1", date: "2026-05-24", title: "Назначение", category: "appointment" })).join(" ");
    expect(t).toContain("24-05-2026");
    expect(t).not.toContain("2026-05-24");
    expect(t).not.toContain("24 мая");
  });

  it("colors a past (non-today) event's relative time red", () => {
    const renderer = render({ id: "e2", date: isoDaysAgo(12), title: "Старое", category: "other" });
    const t = texts(renderer).join(" ");
    expect(t).toContain("прошло 12 дн.");
    const node = renderer.root.findByProps({ children: "прошло 12 дн." });
    expect(color(node.props.style)).toBe(TIMELINE_COLORS.danger);
  });

  it("keeps a future event's relative time in the original amber, not red", () => {
    const renderer = render({ id: "e3", date: isoDaysFromNow(12), title: "Новое", category: "other" });
    const node = renderer.root.findByProps({ children: "через 12 дн." });
    expect(color(node.props.style)).toBe(TIMELINE_COLORS.durationAccent);
  });

  it("renders 'Сегодня' (not red) for a same-day event", () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const renderer = render({ id: "e4", date: todayIso, title: "Сегодняшнее", category: "other" });
    const node = renderer.root.findByProps({ children: "Сегодня" });
    expect(color(node.props.style)).toBe(TIMELINE_COLORS.durationAccent);
  });

  it("shows no edit icon when onEdit is omitted, and a functional one when provided", () => {
    const noEdit = render({ id: "e5", date: "2026-01-01", title: "A", category: "other" });
    expect(noEdit.root.findAllByType(Text).some((n) => n.props.children === "✏")).toBe(false);

    const onEdit = jest.fn();
    const withEdit = render({ id: "e6", date: "2026-01-01", title: "B", category: "other" }, onEdit);
    const editBtn = withEdit.root.findByProps({ accessibilityLabel: "Редактировать событие: B" });
    act(() => {
      editBtn.props.onPress();
    });
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "e6" }));
  });

  it("renders a long title and category badge without crashing", () => {
    const t = texts(
      render({
        id: "e7",
        date: "2020-01-01",
        title: "Очень длинное название события, которое должно аккуратно обрезаться многоточием на узком экране",
        category: "school",
      }),
    );
    expect(t.some((s) => s.includes("Очень длинное название"))).toBe(true);
    expect(t).toContain("Школа");
  });
});
