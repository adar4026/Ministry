// Pure, props-only component — no StoreProvider needed (TASK_033).
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { HistoryPeriod } from "@/data/stats";
import { PeriodSwitcher } from "../PeriodSwitcher";

async function renderSwitcher(period: HistoryPeriod, onChange: (p: HistoryPeriod) => void): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<PeriodSwitcher period={period} onChange={onChange} />);
  });
  return renderer!;
}

describe("PeriodSwitcher — TASK_033", () => {
  it("renders the three Russian segment labels", async () => {
    const renderer = await renderSwitcher("month", jest.fn());
    const labels = renderer.root.findAll((n) => typeof n.props.accessibilityLabel === "string").map((n) => n.props.accessibilityLabel);
    expect(labels).toContain("Месяц");
    expect(labels).toContain("Год");
    expect(labels).toContain("Всё время");
  });

  it("marks the active period as selected", async () => {
    const renderer = await renderSwitcher("year", jest.fn());
    const monthSeg = renderer.root.findAll((n) => n.props.accessibilityLabel === "Месяц")[0];
    const yearSeg = renderer.root.findAll((n) => n.props.accessibilityLabel === "Год")[0];
    expect(monthSeg.props.accessibilityState?.selected).toBe(false);
    expect(yearSeg.props.accessibilityState?.selected).toBe(true);
  });

  it("calls onChange with the tapped segment's key", async () => {
    const onChange = jest.fn();
    const renderer = await renderSwitcher("month", onChange);
    const allSeg = renderer.root.findAll((n) => n.props.accessibilityLabel === "Всё время")[0];
    await act(async () => {
      allSeg.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith("all");
  });
});
