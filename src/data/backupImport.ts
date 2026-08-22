// Application-level snapshot-and-rollback restore of a validated Ministry
// backup into AsyncStorage (TASK_013, extended in TASK_062). AsyncStorage's
// multiSet/multiRemove are not physically atomic — this module does not claim
// otherwise; it snapshots the prior values and restores them on any
// write/verification failure. Writes only keys listed in STORAGE_KEYS, and
// only those the backup actually carries; never touches mj_timer_v1 or any
// other key. See docs/TASKS/TASK_062_BACKUP_V2_AND_RESTORE.md §5.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/store/StoreContext";
import type { MinistryBackup, MinistryBackupData } from "./backup";
import { APP_VERSION } from "./backup";

export class BackupImportError extends Error {}

// Storage keys owned by the backup subsystem itself (not app data, never
// part of a backup file, never restored from one).
export const BACKUP_META_KEYS = {
  /** Pre-restore copy of the device's own data — the safety net for §5.2. */
  safety: "mj_backup_safety_v1",
  /** ISO datetime of the last backup FILE the owner created. */
  lastBackupAt: "mj_last_backup_v1",
} as const;

// The four collections every backup (v1 and v2) carries.
const CORE_CATEGORIES = ["records", "events", "talks", "sessions"] as const;
// v2-only collections. A v1 file has no notion of them, so restoring one
// leaves whatever the device already holds untouched rather than wiping it
// — the alternative would silently delete the owner's event topics and
// profile whenever they restore an older copy.
const OPTIONAL_CATEGORIES = ["customCategories", "profile"] as const;

type CoreCategory = (typeof CORE_CATEGORIES)[number];
type OptionalCategory = (typeof OPTIONAL_CATEGORIES)[number];
type Category = CoreCategory | OptionalCategory;

const ALL_CATEGORIES: readonly Category[] = [...CORE_CATEGORIES, ...OPTIONAL_CATEGORIES];

const CATEGORY_LABEL: Record<Category, string> = {
  records: "записи часов",
  events: "события",
  talks: "речи",
  sessions: "сессии",
  customCategories: "темы событий",
  profile: "профиль",
};

function allKeys(): string[] {
  return ALL_CATEGORIES.map((c) => STORAGE_KEYS[c]);
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

export type SafetyCopy = {
  createdAt: string;
  appVersion: string;
  data: MinistryBackupData;
};

/**
 * Writes a full copy of the device's current data to
 * `mj_backup_safety_v1` before anything is replaced. This is deliberately
 * separate from the in-memory rollback snapshot: the snapshot only survives
 * for the duration of the call, while this copy survives a crash, a reload,
 * or the owner realising a day later that they restored the wrong file.
 */
export async function writeSafetyCopy(now: Date = new Date()): Promise<SafetyCopy> {
  const data = await readCurrentData();
  const copy: SafetyCopy = { createdAt: now.toISOString(), appVersion: APP_VERSION, data };
  await AsyncStorage.setItem(BACKUP_META_KEYS.safety, JSON.stringify(copy));
  return copy;
}

/** Reads back the safety copy written by the last restore, if any. */
export async function readSafetyCopy(): Promise<SafetyCopy | null> {
  const raw = await AsyncStorage.getItem(BACKUP_META_KEYS.safety);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SafetyCopy) : null;
  } catch {
    return null;
  }
}

/** Records that a backup file was created just now (for "Последняя копия: …"). */
export async function markBackupCreated(now: Date = new Date()): Promise<void> {
  await AsyncStorage.setItem(BACKUP_META_KEYS.lastBackupAt, now.toISOString());
}

/** ISO datetime of the last backup file created on this device, or null. */
export async function readLastBackupAt(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(BACKUP_META_KEYS.lastBackupAt);
  if (!raw) return null;
  return isNaN(new Date(raw).getTime()) ? null : raw;
}

function parseArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/**
 * Replaces the app's data in AsyncStorage with the contents of `backup`.
 *
 * The sequence is the one TASK_062 §5 specifies:
 *   1. snapshot the current values (in-memory rollback source);
 *   2. write a durable safety copy of the current data to the device;
 *   3. write the backup's data through the app's own storage keys;
 *   4. read everything back and compare it byte-for-byte AND by entity count
 *      against the counts the backup declares;
 *   5. apply to the live store as the final step of the same transaction;
 *   6. on any failure, roll the snapshot back so nothing is half-restored.
 *
 * `applyToLiveStore`, when given, is called with the verified data as the
 * final step of the SAME transaction — this is how a successful restore
 * reaches the already-mounted app (StoreContext.replaceAllData) without
 * requiring a page reload. If it throws, that is treated exactly like a
 * write/verification failure: the storage snapshot is rolled back and a
 * BackupImportError is thrown, so storage and the live app can never end up
 * disagreeing (storage holding the restore while the UI still shows stale
 * data, or vice versa) — see docs/TASKS/TASK_013_BACKUP_EXPORT_IMPORT.md §12
 * for the production bug this fixes.
 */
export async function performImport(
  backup: MinistryBackup,
  applyToLiveStore?: (data: MinistryBackupData) => void,
): Promise<void> {
  const snapshot = (await AsyncStorage.multiGet(allKeys())) as [string, string | null][];

  try {
    await writeSafetyCopy();
  } catch {
    throw new BackupImportError(
      "Не удалось сохранить страховочную копию текущих данных. Восстановление отменено, текущие данные не изменены.",
    );
  }

  // Only the categories the file actually carries are written.
  const serialized = new Map<Category, string>();
  for (const c of CORE_CATEGORIES) serialized.set(c, JSON.stringify(backup.data[c]));
  for (const c of OPTIONAL_CATEGORIES) {
    const value = backup.data[c];
    if (value !== undefined) serialized.set(c, JSON.stringify(value));
  }

  const written = [...serialized.keys()];
  const pairs: [string, string][] = written.map((c) => [STORAGE_KEYS[c], serialized.get(c)!]);

  let failure: string | null = null;
  try {
    await AsyncStorage.multiSet(pairs);

    const verify = (await AsyncStorage.multiGet(written.map((c) => STORAGE_KEYS[c]))) as [
      string,
      string | null,
    ][];
    const verifyMap = new Map(verify);

    for (const c of written) {
      if (verifyMap.get(STORAGE_KEYS[c]) !== serialized.get(c)) {
        failure = `Проверка после восстановления не удалась: раздел «${CATEGORY_LABEL[c]}» сохранён не полностью.`;
        throw new BackupImportError(failure);
      }
    }

    // Independent count check — re-reads what is now on the device and
    // compares it with the counts the backup itself declares, so a restore
    // can never report success on a partially written collection.
    for (const c of CORE_CATEGORIES) {
      const actual = parseArray(verifyMap.get(STORAGE_KEYS[c])).length;
      const expected = backup.counts[c];
      if (actual !== expected) {
        failure = `Проверка после восстановления не удалась: раздел «${CATEGORY_LABEL[c]}» — ожидалось ${expected}, сохранено ${actual}.`;
        throw new BackupImportError(failure);
      }
    }
    if (serialized.has("customCategories")) {
      const actual = parseArray(verifyMap.get(STORAGE_KEYS.customCategories)).length;
      if (actual !== backup.counts.customCategories) {
        failure = `Проверка после восстановления не удалась: раздел «${CATEGORY_LABEL.customCategories}» — ожидалось ${backup.counts.customCategories}, сохранено ${actual}.`;
        throw new BackupImportError(failure);
      }
    }

    if (applyToLiveStore) {
      try {
        applyToLiveStore(backup.data);
      } catch {
        failure = "Не удалось применить восстановленные данные в приложении.";
        throw new BackupImportError(failure);
      }
    }
  } catch {
    try {
      await restoreSnapshot(snapshot);
    } catch {
      // Storage failed on the way back out too. Never claim the previous
      // data is intact when it might not be — the durable safety copy
      // written in step 2 is what the owner still has.
      throw new BackupImportError(
        `${failure ?? "Не удалось сохранить восстановленные данные."} Откат тоже не удался: данные могли остаться в промежуточном состоянии. Страховочная копия прежних данных сохранена на устройстве.`,
      );
    }
    throw new BackupImportError(
      `${failure ?? "Не удалось сохранить восстановленные данные."} Изменения отменены, прежние данные на месте.`,
    );
  }
}

/** Reads every supported key directly from AsyncStorage (not via React state). */
export async function readCurrentData(): Promise<MinistryBackupData> {
  const pairs = (await AsyncStorage.multiGet(allKeys())) as [string, string | null][];
  const map = new Map(pairs);
  const list = <T,>(key: string): T[] => parseArray(map.get(key)) as T[];

  const data: MinistryBackupData = {
    records: list(STORAGE_KEYS.records),
    events: list(STORAGE_KEYS.events),
    talks: list(STORAGE_KEYS.talks),
    sessions: list(STORAGE_KEYS.sessions),
    customCategories: list(STORAGE_KEYS.customCategories),
  };

  const rawProfile = map.get(STORAGE_KEYS.profile);
  if (rawProfile) {
    try {
      const parsed = JSON.parse(rawProfile);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data.profile = parsed;
    } catch {
      // A corrupt profile blob is simply left out of the backup rather than
      // failing the export — the four core collections matter far more.
    }
  }

  return data;
}

export type StorageKeyDiagnostic = {
  key: string;
  exists: boolean;
  byteLength: number;
  /** Parsed array length, or null if the value isn't valid JSON / not an array. */
  itemCount: number | null;
};

/**
 * Content-free diagnostics for the supported keys — existence, serialized
 * byte length, and parsed item count only. Never returns or logs actual
 * record/event/talk/session field values (dates, notes, titles, locations).
 * Intended for diagnosing storage/restore issues (e.g. TASK_013's
 * production "import succeeded but Home stayed empty" bug) without risking
 * exposure of personal data — see the "no backup content is logged"
 * requirement in docs/TASKS/TASK_013_BACKUP_EXPORT_IMPORT.md §7.
 */
export async function diagnoseStorageKeys(): Promise<StorageKeyDiagnostic[]> {
  const pairs = (await AsyncStorage.multiGet(allKeys())) as [string, string | null][];
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
