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

describe("HistorySessionRow — TASK_035 note display", () => {
  it("shows the note text when present", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HistorySessionRow session={session({ note: "Снежа" })} showDivider={false} />);
    });
    const noteText = renderer!.root.findAll((n) => n.children?.includes("Снежа"));
    expect(noteText.length).toBeGreaterThan(0);
  });

  it("does not render a second line when there is no note", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HistorySessionRow session={session({ note: "" })} showDivider={false} />);
    });
    const texts = renderer!.root.findAllByType("Text" as never).length;
    // Only duration + date Text nodes should exist — no third (note) Text.
    expect(texts).toBe(2);
  });

  it("treats a whitespace-only note as empty", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HistorySessionRow session={session({ note: "   " })} showDivider={false} />);
    });
    const texts = renderer!.root.findAllByType("Text" as never).length;
    expect(texts).toBe(2);
  });

  it("caps a long note at 2 lines with ellipsis truncation", () => {
    const longNote = "Служение утром ".repeat(20).trim();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HistorySessionRow session={session({ note: longNote })} showDivider={false} />);
    });
    const noteNode = renderer!.root.findAll((n) => n.children?.includes(longNote))[0];
    expect(noteNode.props.numberOfLines).toBe(2);
    expect(noteNode.props.ellipsizeMode).toBe("tail");
  });

  it("tapping a row with a note still calls onPress with that row's session.id", () => {
    const onPress = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <HistorySessionRow session={session({ id: "note-id", note: "Повторное посещение" })} showDivider={false} onPress={onPress} />,
      );
    });
    act(() => {
      renderer!.root.findByProps({ accessibilityRole: "button" }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith("note-id");
  });

  it("two same-day rows show their own distinct notes", () => {
    const a = session({ id: "a", date: "2026-07-19", note: "Служение утром" });
    const b = session({ id: "b", date: "2026-07-19", note: "Повторное посещение" });
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <>
          <HistorySessionRow session={a} showDivider onPress={jest.fn()} />
          <HistorySessionRow session={b} showDivider={false} onPress={jest.fn()} />
        </>,
      );
    });
    expect(renderer!.root.findAll((n) => n.children?.includes("Служение утром")).length).toBeGreaterThan(0);
    expect(renderer!.root.findAll((n) => n.children?.includes("Повторное посещение")).length).toBeGreaterThan(0);
  });

  it("accessibility label includes the note but stays bounded for long notes", () => {
    const longNote = "Служение утром ".repeat(20).trim();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HistorySessionRow session={session({ note: longNote })} showDivider={false} />);
    });
    const label: string = renderer!.root.findByProps({ accessibilityRole: "button" }).props.accessibilityLabel;
    expect(label).toContain("заметка");
    expect(label.length).toBeLessThan(longNote.length);
  });

  it("accessibility label has no note mention when the note is empty", () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<HistorySessionRow session={session({ note: "" })} showDivider={false} />);
    });
    const label: string = renderer!.root.findByProps({ accessibilityRole: "button" }).props.accessibilityLabel;
    expect(label).not.toContain("заметка");
  });
});
