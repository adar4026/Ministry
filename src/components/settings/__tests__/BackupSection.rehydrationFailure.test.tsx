// TASK_013 production bug fix — regression coverage for the failure branch:
// if applying imported data to the live StoreContext fails for any reason,
// performImport treats that exactly like a storage write/verification
// failure (see src/data/backupImport.ts) — it must roll back the AsyncStorage
// write, never show success, and never leave storage and the live app
// disagreeing. This is exercised here by mocking @/store/StoreContext's
// useStore() to supply a replaceAllData that throws, since a real
// StoreContext.replaceAllData (plain setState calls) has no natural failure
// mode to trigger organically.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import { BackupSection } from "@/components/settings/BackupSection";
import { STORAGE_KEYS } from "@/store/StoreContext";
import { buildBackup } from "@/data/backup";
import { DangerButton } from "@/components/ui";
import type { HourRecord } from "@/types";

jest.mock("@/data/backupFile");
import { pickBackupFile } from "@/data/backupFile";
import type { PickBackupFileCallbacks } from "@/data/backupFile.web";

const mockReplaceAllData = jest.fn(() => {
  throw new Error("simulated rehydration failure");
});

jest.mock("@/store/StoreContext", () => {
  const actual = jest.requireActual("@/store/StoreContext");
  return {
    ...actual,
    useStore: () => ({
      records: [],
      events: [],
      talks: [],
      sessions: [],
      loaded: true,
      saveRecord: jest.fn(),
      deleteRecord: jest.fn(),
      saveEvent: jest.fn(),
      deleteEvent: jest.fn(),
      saveTalk: jest.fn(),
      deleteTalk: jest.fn(),
      saveSession: jest.fn(),
      deleteSession: jest.fn(),
      replaceAllData: mockReplaceAllData,
    }),
  };
});

const EXISTING_RECORD: HourRecord = { id: "existing-r1", year: 2026, month: 5, hours: 3, note: "" };
const IMPORTED_RECORD: HourRecord = { id: "imported-r1", year: 2026, month: 6, hours: 12, note: "" };

function pressableFor(root: ReturnType<typeof create>["root"], label: string) {
  return root
    .findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")
    .at(0);
}

function feedbackTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .filter((c): c is string => typeof c === "string");
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test("rehydration failure: rolls back storage, does not show success, shows a clear error", async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify([EXISTING_RECORD]));
  const backup = buildBackup({ records: [IMPORTED_RECORD], events: [], talks: [], sessions: [] });
  (pickBackupFile as jest.Mock).mockImplementation((callbacks: PickBackupFileCallbacks) => {
    callbacks.onSelected(JSON.stringify(backup));
  });

  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<BackupSection />);
    await Promise.resolve();
  });

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

  // replaceAllData was actually invoked with the verified imported data.
  expect(mockReplaceAllData).toHaveBeenCalledWith({ records: [IMPORTED_RECORD], events: [], talks: [], sessions: [] });

  // Storage was rolled back to the pre-import snapshot — not left holding
  // the imported data while the live app failed to pick it up.
  expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([EXISTING_RECORD]);

  // Unrelated keys untouched.
  expect(await AsyncStorage.getItem("mj_timer_v1")).toBeNull();

  const texts = feedbackTexts(renderer);
  expect(texts).not.toContain("Импорт завершён");
  expect(texts).toContain("Импорт не выполнен");
});
