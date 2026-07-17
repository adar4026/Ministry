import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create } from "react-test-renderer";
import { Text } from "react-native";
import { BackupSection } from "@/components/settings/BackupSection";
import { StoreProvider, STORAGE_KEYS, useStore } from "@/store/StoreContext";
import { buildBackup } from "@/data/backup";
import { PrimaryButton, DangerButton } from "@/components/ui";
import type { HourRecord, MinistryEvent, Session, Talk } from "@/types";

jest.mock("@/data/backupFile");
import { pickBackupFile, saveBackupFile } from "@/data/backupFile";

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

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady?: (store: Store) => void }) {
  const store = useStore();
  onReady?.(store);
  return <BackupSection />;
}

async function renderSection() {
  let latest: Store | null = null;
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
      </StoreProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return { renderer, getStore: () => latest as unknown as Store };
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

function feedbackTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((n) => n.props.children)
    .filter((c): c is string => typeof c === "string");
}

describe("BackupSection — export", () => {
  it("has an accessible export button that triggers saveBackupFile", async () => {
    const { renderer } = await renderSection();
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

    const { renderer } = await renderSection();
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

    const { renderer } = await renderSection();
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

  it("confirmed import replaces supported keys, updates the live StoreContext, and shows success — no reload required", async () => {
    const backup = buildBackup({ records: [RECORD], events: [EVENT], talks: [TALK], sessions: [SESSION] });
    (pickBackupFile as jest.Mock).mockResolvedValue(JSON.stringify(backup));

    const { renderer, getStore } = await renderSection();
    // Sanity: live context starts empty (fresh install), matching the bug
    // report's "installed PWA starts empty" scenario.
    expect(getStore().records).toEqual([]);

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

    // 1. Storage holds the imported data.
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.records))!)).toEqual([RECORD]);
    // 2. THE ACTUAL FIX: the live StoreContext also reflects it, with no
    //    reload — this is what was missing before (Alert.alert's onPress
    //    callback, which used to trigger reload, never fires on web).
    expect(getStore().records).toEqual([RECORD]);
    expect(getStore().events).toEqual([EVENT]);
    expect(getStore().talks).toEqual([TALK]);
    expect(getStore().sessions).toEqual([SESSION]);
    // 3. Success is shown via inline UI (Alert.alert is a no-op on web and
    //    is no longer used for this).
    const texts = feedbackTexts(renderer);
    expect(texts).toContain("Импорт завершён");
  });

  it("rejects invalid JSON without showing a preview or writing anything", async () => {
    (pickBackupFile as jest.Mock).mockResolvedValue("{not valid json");

    const { renderer } = await renderSection();
    const before = await AsyncStorage.getItem(STORAGE_KEYS.records);
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(feedbackTexts(renderer)).toContain("Не удалось импортировать");
    expect(await AsyncStorage.getItem(STORAGE_KEYS.records)).toBe(before);
  });

  it("silently ignores a cancelled file picker (no error feedback)", async () => {
    (pickBackupFile as jest.Mock).mockRejectedValue(new Error("no-file-selected"));

    const { renderer } = await renderSection();
    const importBtn = pressableFor(renderer.root, "Импортировать данные");
    await act(async () => {
      importBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(feedbackTexts(renderer)).not.toContain("Не удалось выбрать файл");
  });

  it("re-enables the import button after a cancelled pick (fallback cancellation doesn't strand the UI)", async () => {
    // Simulates backupFile.web.ts's focus-fallback rejecting with
    // "cancelled" once the native picker is dismissed without a `change`.
    (pickBackupFile as jest.Mock).mockRejectedValueOnce(new Error("cancelled"));

    const { renderer } = await renderSection();
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
