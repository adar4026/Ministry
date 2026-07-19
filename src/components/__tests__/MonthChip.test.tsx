// Regression test: a Session-authoritative month's hours
// (monthTotal() = sum(durationMinutes)/60, see serviceYearAggregation() in
// src/data/constants.ts) can be a long-tail float like 38.166666666666664
// for an in-progress month — MonthChip previously rendered record.hours raw,
// exposing that decimal on the "Текущий служебный год" grid in production.
// This tile has always shown a bare whole number with no unit suffix; the
// fix rounds for display only.
import { act, create } from "react-test-renderer";
import { MonthChip } from "@/components/MonthChip";
import type { ServiceYearMonth } from "@/data/constants";

function record(overrides: Partial<ServiceYearMonth> = {}): ServiceYearMonth {
  return {
    id: "2026-07",
    year: 2026,
    month: 7,
    hours: 44,
    source: "legacy",
    ...overrides,
  };
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

async function renderTexts(rec: ServiceYearMonth): Promise<string[]> {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<MonthChip record={rec} onPress={() => {}} />);
    await Promise.resolve();
  });
  const out: string[] = [];
  collectText(renderer.toJSON(), out);
  return out;
}

describe("MonthChip", () => {
  it("never renders a raw decimal for a Session-authoritative fractional total", async () => {
    // 2290 minutes / 60 = 38.166666666666664 — the exact value from the
    // production bug report.
    const texts = await renderTexts(record({ hours: 2290 / 60, source: "session" }));
    expect(texts).not.toContain("38.166666666666664");
    expect(texts.some((t) => /\d+\.\d+/.test(t))).toBe(false);
  });

  it("rounds a fractional total to the nearest whole hour for display", async () => {
    const texts = await renderTexts(record({ hours: 38.166666666666664, source: "session" }));
    expect(texts).toContain("38");
  });

  it("rounds up when the fractional remainder is >= 0.5", async () => {
    const texts = await renderTexts(record({ hours: 38.6, source: "session" }));
    expect(texts).toContain("39");
  });

  it("renders the hours value exactly once, with no duplicate numeric text", async () => {
    const texts = await renderTexts(record({ year: 2026, month: 7, hours: 44, source: "legacy" }));
    const hoursOccurrences = texts.filter((t) => t === "44");
    expect(hoursOccurrences).toHaveLength(1);
  });

  it("still renders a whole-number legacy total unchanged", async () => {
    const texts = await renderTexts(record({ hours: 50, source: "legacy" }));
    expect(texts).toContain("50");
    expect(texts).not.toContain("50.0");
  });

  it("renders the full month label (no year) alongside the rounded hours", async () => {
    const texts = await renderTexts(record({ year: 2026, month: 7, hours: 38.166666666666664, source: "session" }));
    const normalized = texts.join(" ").replace(/\s+/g, " ").trim();
    expect(normalized).toContain("Июль");
    expect(normalized).not.toContain("2026");
    expect(texts).toContain("38");
  });

  it("renders full, unabbreviated names for the longest months (September, February)", async () => {
    const sepTexts = await renderTexts(record({ year: 2025, month: 9, hours: 44, source: "legacy" }));
    expect(sepTexts).toContain("Сентябрь");
    const febTexts = await renderTexts(record({ year: 2026, month: 2, hours: 44, source: "legacy" }));
    expect(febTexts).toContain("Февраль");
  });
});
