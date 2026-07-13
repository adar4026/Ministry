// Component-level tests for the TASK_005B legacy-entry Product Rule
// enforcement in RecordForm — see docs/TASKS/TASK_005_ARCHITECTURE.md §10
// (resolved: "blocked, not warned") and legacyEntryBlockReason() in
// src/data/constants.ts. The pure predicate itself is unit-tested in
// src/data/__tests__/aggregation.test.ts; this covers the UI integration
// (inline message shown, save actually refused).
import { act, create } from "react-test-renderer";
import { TextInput } from "react-native";
import { RecordForm } from "@/components/forms/RecordForm";
import { PrimaryButton } from "@/components/ui";
import type { Session } from "@/types";

jest.setTimeout(30000);

function session(date: string, durationMinutes = 60): Session {
  return {
    id: `s-${date}`,
    date,
    durationMinutes,
    source: "manual",
    note: "",
    createdAt: date,
    updatedAt: date,
  };
}

// RecordForm defaults to the current year/month; changing only the Year
// field (index 0 of the three TextInputs: Год, Часы, Заметка) is enough to
// move the form between past/current/future without touching ChipSelector.
function yearInput(root: ReturnType<typeof create>["root"]) {
  return root.findAllByType(TextInput)[0];
}

describe("RecordForm — legacy entry Product Rule", () => {
  const now = new Date();
  const nowYear = now.getFullYear();

  it("blocks the current month by default and does not call onSave", () => {
    const onSave = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<RecordForm sessions={[]} onSave={onSave} />);
    });
    const texts: string[] = [];
    const collect = (n: unknown): void => {
      if (typeof n === "string") texts.push(n);
      else if (Array.isArray(n)) n.forEach(collect);
      else if (n && typeof n === "object" && "children" in (n as any)) collect((n as any).children);
    };
    collect(renderer!.toJSON());
    expect(texts.some((t) => t.includes("Текущий месяц"))).toBe(true);

    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks a future month and does not call onSave", () => {
    const onSave = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<RecordForm sessions={[]} onSave={onSave} />);
    });
    act(() => {
      yearInput(renderer.root).props.onChangeText(String(nowYear + 1));
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks a past month that already has a Session and does not call onSave", () => {
    const pastYear = nowYear - 2;
    const thisMonth = now.getMonth() + 1;
    const onSave = jest.fn();
    const sessions = [session(`${pastYear}-${String(thisMonth).padStart(2, "0")}-05`)];
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<RecordForm sessions={sessions} onSave={onSave} />);
    });
    act(() => {
      yearInput(renderer.root).props.onChangeText(String(pastYear));
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("allows a past month with zero Sessions (legitimate historical backfill)", () => {
    const pastYear = nowYear - 2;
    const onSave = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<RecordForm sessions={[]} onSave={onSave} />);
    });
    act(() => {
      yearInput(renderer.root).props.onChangeText(String(pastYear));
    });
    const hoursInputInstance = renderer!.root.findAllByType(TextInput)[1];
    act(() => {
      hoursInputInstance.props.onChangeText("42");
    });
    act(() => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ year: pastYear, hours: 42 });
  });
});
