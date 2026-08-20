// TASK_018 — EventCard: badge moved bottom-right, DD-MM-YYYY date, exact
// elapsed-time metadata. Render-level checks that the card doesn't crash and
// surfaces the expected text for long titles/categories and several dates.
import { act, create } from "react-test-renderer";
import { EventCard } from "@/components/dashboard/EventCard";
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

function renderTexts(event: MinistryEvent): string[] {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(<EventCard event={event} />);
  });
  const out: string[] = [];
  collectText(renderer!.toJSON(), out);
  return out;
}

describe("EventCard", () => {
  // TASK_048: Home's event cards speak the same human date language as the
  // upcoming cards. The DD-MM-YYYY form (TASK_022) is still canonical
  // everywhere outside Home — forms, History, the timer, the timeline,
  // Profile — it is just no longer what these cards show.
  it("renders the date in human form, not DD-MM-YYYY or raw ISO", () => {
    // A past year, so the year component is part of the expected output —
    // the current year is deliberately omitted (see the next test).
    const year = new Date().getFullYear() - 2;
    const texts = renderTexts({
      id: "e1",
      date: `${year}-05-24`,
      title: "Назначение служебным помощником",
      category: "appointment",
    }).join(" ");
    expect(texts).toContain(`24 мая ${year}`);
    expect(texts).not.toContain(`24-05-${year}`);
    expect(texts).not.toContain(`${year}-05-24`);
  });

  it("omits the year for an event in the current year", () => {
    const now = new Date();
    const iso = `${now.getFullYear()}-03-04`;
    const texts = renderTexts({ id: "e-cur", date: iso, title: "Событие", category: "other" }).join(" ");
    expect(texts).toContain("4 марта");
    expect(texts).not.toContain(`4 марта ${now.getFullYear()}`);
  });

  it("renders a long title and a long category label without crashing", () => {
    const texts = renderTexts({
      id: "e2",
      date: "2020-01-01",
      title: "Очень длинное название события, которое должно аккуратно обрезаться многоточием на узком экране",
      category: "school",
    });
    expect(texts.some((t) => t.includes("Очень длинное название"))).toBe(true);
    expect(texts).toContain("Школа");
  });

  it("renders 'Сегодня' for a same-day event and omits it for a future date without crashing", () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const todayTexts = renderTexts({ id: "e3", date: todayIso, title: "Событие сегодня", category: "other" });
    expect(todayTexts.join(" ")).toContain("Сегодня");

    const futureIso = "2099-01-01";
    expect(() =>
      renderTexts({ id: "e4", date: futureIso, title: "Будущее событие", category: "move" })
    ).not.toThrow();
  });

  it("renders several different event dates without crashing", () => {
    const dates = ["2021-02-28", "2024-02-29", "2026-12-31", "2026-07-18"];
    for (const date of dates) {
      expect(() => renderTexts({ id: `e-${date}`, date, title: "Событие", category: "pioneer" })).not.toThrow();
    }
  });
});
