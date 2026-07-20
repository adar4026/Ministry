// TASK_039 — LegacyMonthRow gains a credit caption: the caller passes an
// already credit-excluded `hours` (matching "Итого") plus the raw
// `creditHours`, and this component renders both — the real total as the
// primary value, credit as a small secondary line, never merged into one
// number.
import { create, act } from "react-test-renderer";
import { LegacyMonthRow } from "../LegacyMonthRow";

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

describe("LegacyMonthRow — credit caption (TASK_039)", () => {
  it("shows only the total when there is no credit", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<LegacyMonthRow hours={44} onPress={() => {}} />);
    });
    const texts: string[] = [];
    collectText(renderer!.toJSON(), texts);
    expect(texts.some((t) => t.includes("44"))).toBe(true);
    expect(texts.some((t) => t.includes("кредит"))).toBe(false);
  });

  it("shows the credit caption underneath the total when creditHours > 0", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<LegacyMonthRow hours={0} creditHours={30} onPress={() => {}} />);
    });
    const texts: string[] = [];
    collectText(renderer!.toJSON(), texts);
    expect(texts.some((t) => t.includes("кредит"))).toBe(true);
    expect(texts.some((t) => t.includes("30"))).toBe(true);
  });

  it("does not show a credit caption when creditHours is exactly 0", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<LegacyMonthRow hours={44} creditHours={0} onPress={() => {}} />);
    });
    const texts: string[] = [];
    collectText(renderer!.toJSON(), texts);
    expect(texts.some((t) => t.includes("кредит"))).toBe(false);
  });

  it("mentions the credit amount in accessibilityLabel when present", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<LegacyMonthRow hours={0} creditHours={30} onPress={() => {}} />);
    });
    const pressable = renderer!.root.findByProps({ accessibilityRole: "button" });
    expect(pressable.props.accessibilityLabel).toEqual(expect.stringContaining("кредит"));
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<LegacyMonthRow hours={44} onPress={onPress} />);
    });
    act(() => {
      renderer!.root.findByProps({ accessibilityRole: "button" }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
