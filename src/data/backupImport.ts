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
 */
export async function performImport(backup: MinistryBackup): Promise<void> {
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
