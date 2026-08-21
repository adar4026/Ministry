// TASK_059 — switch row used by the "Уведомления" screen.
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Switch } from "react-native";
import { BellIcon } from "@/components/icons";
import { NotificationToggleRow } from "../NotificationToggleRow";

async function render(props: Partial<Parameters<typeof NotificationToggleRow>[0]> = {}) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <NotificationToggleRow
        icon={BellIcon}
        title="За день до события"
        subtitle="В 19:00"
        value={false}
        onValueChange={jest.fn()}
        {...props}
      />,
    );
  });
  return renderer;
}

describe("NotificationToggleRow — TASK_059", () => {
  it("renders the title, subtitle and a real Switch", async () => {
    const renderer = await render();
    const texts = renderer.root
      .findAllByType("Text" as never)
      .map((n) => n.props.children)
      .filter((t): t is string => typeof t === "string");
    expect(texts).toContain("За день до события");
    expect(texts).toContain("В 19:00");
    expect(renderer.root.findAllByType(Switch)).toHaveLength(1);
  });

  it("exposes the switch role and its checked state to assistive tech", async () => {
    const renderer = await render({ value: true });
    const row = renderer.root.findByProps({ accessibilityRole: "switch" });
    expect(row.props.accessibilityState.checked).toBe(true);
    expect(row.props.accessibilityLabel).toBe("За день до события. В 19:00");
  });

  it("toggles to the opposite value when the whole row is tapped", async () => {
    const onValueChange = jest.fn();
    const renderer = await render({ value: false, onValueChange });
    await act(async () => renderer.root.findByProps({ accessibilityRole: "switch" }).props.onPress());
    expect(onValueChange).toHaveBeenCalledWith(true);

    onValueChange.mockClear();
    const on = await render({ value: true, onValueChange });
    await act(async () => on.root.findByProps({ accessibilityRole: "switch" }).props.onPress());
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it("does not fire while disabled — no toggling behind a switched-off master", async () => {
    const onValueChange = jest.fn();
    const renderer = await render({ disabled: true, onValueChange });
    const row = renderer.root.findByProps({ accessibilityRole: "switch" });
    await act(async () => row.props.onPress());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(row.props.accessibilityState.disabled).toBe(true);
    expect(renderer.root.findByType(Switch).props.disabled).toBe(true);
  });
});
