// TASK_034 — HistorySessionRow becomes Pressable so a tap in the History
// list can open the exact record, matching what tapping a calendar day
// already did (TASK_033). Session identity must always resolve via
// session.id, never date/duration (two same-day, same-duration entries are
// a legal state — see history.test.tsx's day-picker tests).
import { create, act } from "react-test-renderer";
import type { Session } from "@/types";
import { HistorySessionRow } from "../HistorySessionRow";

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    date: "2026-07-19",
    durationMinutes: 90,
    source: "manual",
    note: "",
    createdAt: "2026-07-19T10:00:00.000Z",
    updatedAt: "2026-07-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("HistorySessionRow — TASK_034", () => {
  it("is a Pressable with accessibilityRole=button and a non-empty label", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HistorySessionRow session={session()} showDivider={false} />);
    });
    const pressable = renderer!.root.findByProps({ accessibilityRole: "button" });
    expect(pressable.props.accessibilityLabel).toEqual(expect.stringContaining("19 июл"));
  });

  it("calls onPress with the row's own session.id when tapped", () => {
    const onPress = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HistorySessionRow session={session({ id: "exact-id" })} showDivider={false} onPress={onPress} />);
    });
    act(() => {
      renderer!.root.findByProps({ accessibilityRole: "button" }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith("exact-id");
  });

  it("two rows with the same date/duration but different ids resolve independently", () => {
    const onPress = jest.fn();
    const a = session({ id: "first", date: "2026-07-19", durationMinutes: 60 });
    const b = session({ id: "second", date: "2026-07-19", durationMinutes: 60 });
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <>
          <HistorySessionRow session={a} showDivider onPress={onPress} />
          <HistorySessionRow session={b} showDivider={false} onPress={onPress} />
        </>,
      );
    });
    const pressables = renderer!.root.findAll(
      (n) => n.props && n.props.accessibilityRole === "button" && typeof n.props.onPress === "function",
    );
    act(() => pressables[0].props.onPress());
    act(() => pressables[1].props.onPress());
    expect(onPress).toHaveBeenNthCalledWith(1, "first");
    expect(onPress).toHaveBeenNthCalledWith(2, "second");
  });
});
