import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { Alert, Text } from "react-native";
import { BackupSection } from "@/components/settings/BackupSection";
import { StoreProvider, STORAGE_KEYS, useStore } from "@/store/StoreContext";
import { buildBackup } from "@/data/backup";
import { PrimaryButton, DangerButton } from "@/components/ui";
import type { HourRecord, MinistryEvent, Session, Talk } from "@/types";

jest.mock("@/data/backupFile");
import { pickBackupFile, saveBackupFile, reloadApp } from "@/data/backupFile";

jest.spyOn(Alert, "alert").mockImplementation(() => {});

const RECORD: HourRecord = { id: "r1", year: 2026, month: 6, hours: 12, note: "" };
const EVENT: MinistryEvent = { id: "e1", date: "2026-06-01", title: "Test event", category: "personal" };
const TALK: Talk = { id: "t1", date: "2026-06-02", number: 3, title: "Talk", location: "Hall" };
const SESSION: Session = {
  id: "s1",
  date: "2026-06-03",
  durationMinutes: 90,
  note: "",
  source: "manual",
  createdAt: "2026-06-03T10:00:00.000Z",
  updatedAt: "2026-06-03T10:00:00.000Z",
};

function Harness() {
  useStore(); // ensures the provider is mounted before children read from it
  return <BackupSection />;
}

async function renderSection() {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

// react-native's Pressable doesn't reliably match findAllByType across this
// project's RN/jest-expo setup, so locate it structurally instead: any node
// exposing both the accessibilityLabel and an onPress handler.
function pressableFor(root: ReturnType<typeof create>["root"], label: string) {
  return root
    .findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")
    .at(0);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe("BackupSection — export", () => {
  it("has an accessible export button that triggers saveBackupFile", async () => {
    const renderer = await renderSection();
    const btn = pressableFor(renderer.root, "Экспортировать данные");
    expect(btn).toBeTruthy();
    await act(async () => {
      btn!.props.onPress();
      await Promise.resolve();
    });
    expect(saveBackupFile).toHaveBeenCalledTimes(1);
    const [filename, json] = (saveBackupFile as jest.Mock).mock.calls[0];
    expect(filename).toMatch(/^ministry-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    expect(JSON.parse(json).format).toBe("ministry-backup");
  });
});

describe("BackupSection — import preview", () => {
  it("shows correct counts in the preview and performs no writes until confirmed", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([RECORD]));
    const backup = buildBackup({ records: [], events: [EVENT], talks: [TALK], sessions: [SESSION] });
    (pickBackupFile as jest.Mock).mockResolvedValue(JSON.stringify(backup));

    const renderer = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Preview shows incoming counts (1 event, 1 talk, 1 session, 0 records).
    const ones = renderer.root.findAllByType(Text).filter((n) => String(n.props.children) === "1");
    expect(ones.length).toBeGreaterThanOrEqual(3);

    // No writes happened yet — records key still holds the pre-existing value.
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
  });

  it("cancel performs no writes and dismisses the preview", async () => {
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    (pickBackupFile as jest.Mock).mockResolvedValue(JSON.stringify(backup));

    const renderer = await renderSection();
    // StoreProvider seeds mj_records_v1 with "[]" on first hydration — capture
    // that baseline so we can prove cancel writes nothing, rather than
    // asserting the key stays absent (it never was).
    const before = await AsyncStorage.getItem(STORAGE_KEYS.records);

    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      renderer.root.findByType(PrimaryButton).props.onPress();
    });

    expect(await AsyncStorage.getItem(STORAGE_KEYS.records)).toBe(before);
  });

  it("confirmed import replaces supported keys and reloads the app", async () => {
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    (pickBackupFile as jest.Mock).mockResolvedValue(JSON.stringify(backup));

    const renderer = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      renderer.root.findByType(DangerButton).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    expect(reloadApp).toHaveBeenCalledTimes(0); // reload fires from the Alert's OK callback, not immediately
    expect(Alert.alert).toHaveBeenCalledWith(
      "Импорт завершён",
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: "ОК" })]),
    );
  });

  it("rejects invalid JSON without showing a preview or writing anything", async () => {
    (pickBackupFile as jest.Mock).mockResolvedValue("{not valid json");

    const renderer = await renderSection();
    const before = await AsyncStorage.getItem(STORAGE_KEYS.records);
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(Alert.alert).toHaveBeenCalledWith("Не удалось импортировать", expect.any(String));
    expect(await AsyncStorage.getItem(STORAGE_KEYS.records)).toBe(before);
  });

  it("silently ignores a cancelled file picker (no error alert)", async () => {
    (pickBackupFile as jest.Mock).mockRejectedValue(new Error("no-file-selected"));

    const renderer = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("re-enables the import button after a cancelled pick (fallback cancellation doesn't strand the UI)", async () => {
    // Simulates backupFile.web.ts's focus-fallback rejecting with
    // "cancelled" once the native picker is dismissed without a `change`.
    (pickBackupFile as jest.Mock).mockRejectedValueOnce(new Error("cancelled"));

    const renderer = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The button must not stay disabled/stuck in a "picking" state.
    const importBtnAfter = pressableFor(renderer.root, "Импортировать данные");
    expect(importBtnAfter!.props.disabled).toBe(false);

    // And it must be usable again immediately — a second pick attempt works.
    const backup = buildBackup({ records: [RECORD], events: [], talks: [], sessions: [] });
    (pickBackupFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(backup));
    await act(async () => {
      importBtnAfter!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer.root.findByType(DangerButton)).toBeTruthy();
  });
});
