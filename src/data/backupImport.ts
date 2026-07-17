// Application-level snapshot-and-rollback restore of a validated Ministry
// backup into AsyncStorage (TASK_013). AsyncStorage's multiSet/multiRemove
// are not physically atomic — this module does not claim otherwise; it
// snapshots the prior values and restores them on any write/verification
// failure. Writes only the 4 supported keys in STORAGE_KEYS; never touches
// mj_timer_v1 or any other key. See docs/TASKS/TASK_013_BACKUP_EXPORT_IMPORT.md §6.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/store/StoreContext";
import type { MinistryBackup, MinistryBackupData } from "./backup";

export class BackupImportError extends Error {}

const CATEGORY_KEY_ORDER = ["records", "events", "talks", "sessions"] as const;
type CategoryName = (typeof CATEGORY_KEY_ORDER)[number];

function keysInOrder(): string[] {
  return CATEGORY_KEY_ORDER.map((c) => STORAGE_KEYS[c]);
}

async function restoreSnapshot(snapshot: readonly [string, string | null][]): Promise<void> {
  const toSet: [string, string][] = [];
  const toRemove: string[] = [];
  for (const [key, value] of snapshot) {
    if (value === null) toRemove.push(key);
    else toSet.push([key, value]);
  }
  if (toSet.length) await AsyncStorage.multiSet(toSet);
  if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
}

/**
 * Replaces records/events/talks/sessions in AsyncStorage with the contents
 * of `backup`. Snapshots the previous values first and rolls back on any
 * write or verification failure — success is only reported once the
 * written values have been read back and confirmed to match.
 *
 * `applyToLiveStore`, when given, is called with the verified data as the
 * final step of the SAME transaction — this is how a successful import
 * reaches the already-mounted app (StoreContext.replaceAllData) without
 * requiring a page reload. If it throws, that is treated exactly like a
 * write/verification failure: the storage snapshot is rolled back and a
 * BackupImportError is thrown, so storage and the live app can never end up
 * disagreeing (storage holding the import while the UI still shows stale
 * data, or vice versa) — see docs/TASKS/TASK_013_BACKUP_EXPORT_IMPORT.md §12
 * for the production bug this fixes.
 */
export async function performImport(
  backup: MinistryBackup,
  applyToLiveStore?: (data: MinistryBackupData) => void,
): Promise<void> {
  const keys = keysInOrder();
  const snapshot = (await AsyncStorage.multiGet(keys)) as [string, string | null][];

  const serialized: Record<CategoryName, string> = {
    records: JSON.stringify(backup.data.records),
    events: JSON.stringify(backup.data.events),
    talks: JSON.stringify(backup.data.talks),
    sessions: JSON.stringify(backup.data.sessions),
  };

  const pairs: [string, string][] = CATEGORY_KEY_ORDER.map((c) => [STORAGE_KEYS[c], serialized[c]]);

  try {
    await AsyncStorage.multiSet(pairs);

    const verify = (await AsyncStorage.multiGet(keys)) as [string, string | null][];
    const verifyMap = new Map(verify);
    for (const c of CATEGORY_KEY_ORDER) {
      if (verifyMap.get(STORAGE_KEYS[c]) !== serialized[c]) {
        throw new BackupImportError("Проверка после импорта не удалась.");
      }
    }

    if (applyToLiveStore) {
      try {
        applyToLiveStore(backup.data);
      } catch {
        throw new BackupImportError("Не удалось применить импортированные данные в приложении.");
      }
    }
  } catch {
    await restoreSnapshot(snapshot);
    throw new BackupImportError(
      "Не удалось сохранить импортированные данные. Изменения отменены, текущие данные не пострадали.",
    );
  }
}

/** Reads the 4 supported keys directly from AsyncStorage (not via React state). */
export async function readCurrentData(): Promise<MinistryBackupData> {
  const keys = keysInOrder();
  const pairs = (await AsyncStorage.multiGet(keys)) as [string, string | null][];
  const map = new Map(pairs);
  const parse = <T,>(key: string): T[] => {
    const raw = map.get(key);
    if (!raw) return [];
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  return {
    records: parse(STORAGE_KEYS.records),
    events: parse(STORAGE_KEYS.events),
    talks: parse(STORAGE_KEYS.talks),
    sessions: parse(STORAGE_KEYS.sessions),
  };
}

export type StorageKeyDiagnostic = {
  key: string;
  exists: boolean;
  byteLength: number;
  /** Parsed array length, or null if the value isn't valid JSON / not an array. */
  itemCount: number | null;
};

/**
 * Content-free diagnostics for the 4 supported keys — existence, serialized
 * byte length, and parsed item count only. Never returns or logs actual
 * record/event/talk/session field values (dates, notes, titles, locations).
 * Intended for diagnosing storage/import issues (e.g. TASK_013's
 * production "import succeeded but Home stayed empty" bug) without risking
 * exposure of personal data — see the "no backup content is logged"
 * requirement in docs/TASKS/TASK_013_BACKUP_EXPORT_IMPORT.md §7.
 */
export async function diagnoseStorageKeys(): Promise<StorageKeyDiagnostic[]> {
  const keys = keysInOrder();
  const pairs = (await AsyncStorage.multiGet(keys)) as [string, string | null][];
  return pairs.map(([key, raw]) => {
    if (raw == null) return { key, exists: false, byteLength: 0, itemCount: null };
    let itemCount: number | null = null;
    try {
      const parsed = JSON.parse(raw);
      itemCount = Array.isArray(parsed) ? parsed.length : null;
    } catch {
      itemCount = null;
    }
    return { key, exists: true, byteLength: raw.length, itemCount };
  });
}
