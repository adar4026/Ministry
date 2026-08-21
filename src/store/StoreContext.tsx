import { createContext, useContext, useEffect, type ReactNode } from "react";
import { SEED_RECORDS, SEED_EVENTS, SEED_TALKS } from "@/data/seed";
import { usePersistentState } from "@/hooks/useStorage";
import { CAT, uid } from "@/data/constants";
import { DEFAULT_NOTIFICATION_SETTINGS, planReminders } from "@/data/notifications";
import { isNotificationSupported, syncReminders } from "@/utils/localNotifications";
import type {
  CustomCategory,
  HourRecord,
  MinistryEvent,
  NotificationSettings,
  ProfileEvent,
  Session,
  Talk,
  UserProfile,
} from "@/types";

// AsyncStorage keys — see ARCHITECTURE.md. Bump the version + write a migration
// if the shape of any of these arrays ever changes.
const KEYS = {
  records: "mj_records_v1",
  events: "mj_events_v1",
  talks: "mj_talks_v1",
  sessions: "mj_sessions_v1",
  profile: "mj_profile_v1",
  customCategories: "mj_custom_categories_v1",
  notifications: "mj_notifications_v1",
} as const;

// Re-exported for src/data/backupImport.ts (TASK_013) — single source of
// truth for the storage keys the backup/restore flow is allowed to touch.
export const STORAGE_KEYS = KEYS;

const SEED_SESSIONS: Session[] = [];

// TASK_042 — empty profile, no pre-filled name/photo/events. Same
// locally-defined-seed pattern as SEED_SESSIONS above (not src/data/seed.js
// — that file's empty-array contract is specifically about the four
// original collections, see CLAUDE.md).
const SEED_PROFILE: UserProfile = { events: [] };

// TASK_045 — no user-created event topics on first run.
const SEED_CUSTOM_CATEGORIES: CustomCategory[] = [];

// TASK_059 — how often the reminder plan is recomputed and pushed to the
// service worker while the app is open. The worker arms its own timers, but
// the OS can unload it (and them) at any point; this re-ping is what makes a
// reminder still fire for an app that has been sitting open past 19:00.
const REMINDER_REFRESH_MS = 60_000;

// Hard cap on profile events (TASK_042 revision — was 4, now 3) — enforced
// here, not just in the UI, so no caller (including a future backup-restore
// path) can ever persist a 4th event.
const MAX_PROFILE_EVENTS = 3;

// Inputs accepted by the save* functions (id absent => create, id present => update).
export type RecordInput = {
  id?: string;
  year: number;
  month: number;
  hours: number;
  creditHours?: number; // TASK_039 — see HourRecord.creditHours
  note?: string;
};
export type EventInput = {
  id?: string;
  date: string;
  title: string;
  category: MinistryEvent["category"];
};
export type TalkInput = {
  id?: string;
  date: string;
  number: number | null;
  title?: string;
  location?: string;
};
export type SessionInput = {
  id?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  note?: string;
  source: Session["source"];
};

// TASK_042 — full-replace input for the Profile edit sheet. `events` missing
// an `id` are treated as new; saveProfile() below is the single place that
// generates ids and enforces the 4-event cap, mirroring backupImport's
// "one place applies the write" convention.
export type ProfileEventInput = {
  id?: string;
  title: string;
  date: string;
};
export type ProfileInput = {
  displayName?: string;
  profilePhotoUri?: string;
  events: ProfileEventInput[];
};

// TASK_045 — result of an addCustomCategory() attempt. "empty" is a
// blank/whitespace-only name; "duplicate" matches an existing system or
// custom topic case/whitespace-insensitively.
export type AddCustomCategoryResult =
  | { ok: true; category: CustomCategory }
  | { ok: false; error: "empty" | "duplicate" };

// Full-replace input for TASK_013 backup restore (see
// src/data/backupImport.ts / src/components/settings/BackupSection.tsx).
// Bypasses the per-item save*() helpers — the caller has already validated
// and persisted these exact arrays to AsyncStorage; this only needs to make
// the *live* context match what's on disk so already-mounted screens
// (Home, Hours, etc.) re-render with the restored data immediately, without
// requiring a page reload.
export type ReplaceAllDataInput = {
  records: HourRecord[];
  events: MinistryEvent[];
  talks: Talk[];
  sessions: Session[];
};

type StoreValue = {
  records: HourRecord[];
  events: MinistryEvent[];
  talks: Talk[];
  sessions: Session[];
  profile: UserProfile;
  customCategories: CustomCategory[];
  notificationSettings: NotificationSettings;
  loaded: boolean;
  saveRecord: (input: RecordInput) => void;
  deleteRecord: (id: string) => void;
  saveEvent: (input: EventInput) => void;
  deleteEvent: (id: string) => void;
  saveTalk: (input: TalkInput) => void;
  deleteTalk: (id: string) => void;
  saveSession: (input: SessionInput) => void;
  deleteSession: (id: string) => void;
  saveProfile: (input: ProfileInput) => void;
  addCustomCategory: (name: string) => AddCustomCategoryResult;
  saveNotificationSettings: (settings: NotificationSettings) => void;
  replaceAllData: (data: ReplaceAllDataInput) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords, rLoaded] = usePersistentState<HourRecord[]>(KEYS.records, SEED_RECORDS);
  const [events, setEvents, eLoaded] = usePersistentState<MinistryEvent[]>(KEYS.events, SEED_EVENTS);
  const [talks, setTalks, tLoaded] = usePersistentState<Talk[]>(KEYS.talks, SEED_TALKS);
  const [sessions, setSessions, sLoaded] = usePersistentState<Session[]>(KEYS.sessions, SEED_SESSIONS);
  const [profile, setProfile, pLoaded] = usePersistentState<UserProfile>(KEYS.profile, SEED_PROFILE);
  const [customCategories, setCustomCategories, ccLoaded] = usePersistentState<CustomCategory[]>(
    KEYS.customCategories,
    SEED_CUSTOM_CATEGORIES,
  );

  const [notificationSettings, setNotificationSettings, nLoaded] = usePersistentState<NotificationSettings>(
    KEYS.notifications,
    DEFAULT_NOTIFICATION_SETTINGS,
  );

  const loaded = rLoaded && eLoaded && tLoaded && sLoaded && pLoaded && ccLoaded && nLoaded;

  // TASK_042 revision — normalizes a profile persisted by the previous
  // (uncommitted, never-shipped) 4-event limit down to the current 3-event
  // cap, once, right after hydration. Never touches storage before `pLoaded`
  // (same hydration-guard convention as every other collection here) and is
  // a no-op for any profile already within the limit.
  useEffect(() => {
    if (pLoaded && profile.events.length > MAX_PROFILE_EVENTS) {
      setProfile((p) => ({ ...p, events: p.events.slice(0, MAX_PROFILE_EVENTS) }));
    }
  }, [pLoaded, profile.events.length]);

  // TASK_059 — the ONLY place event reminders are (re)scheduled. Keeping it
  // here rather than in the screens is what makes every requirement fall out
  // of one expression instead of five call sites: creating, editing and
  // deleting an event all mutate `events`; flipping a switch mutates
  // `notificationSettings`; restoring a backup goes through replaceAllData(),
  // which mutates `events` too. Each of those re-runs this effect, which
  // hands the channel the complete desired set — and the worker cancels
  // whatever is no longer in it. Matches ADR-003's rule that StoreContext is
  // the single place data work happens.
  useEffect(() => {
    if (!loaded) return;
    // Native/jest have no notification channel; skip the interval entirely
    // rather than leaving a timer running for a no-op sync.
    if (!isNotificationSupported()) return;

    const run = () => {
      void syncReminders(planReminders(events, notificationSettings, new Date()));
    };
    run();
    const timer = setInterval(run, REMINDER_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loaded, events, notificationSettings]);

  function saveRecord(input: RecordInput) {
    const rec: HourRecord = {
      id: input.id || uid(),
      year: input.year,
      month: input.month,
      hours: input.hours,
      creditHours: input.creditHours,
      note: input.note ?? "",
    };
    setRecords((rs) => (input.id ? rs.map((x) => (x.id === input.id ? rec : x)) : [...rs, rec]));
  }
  function deleteRecord(id: string) {
    setRecords((rs) => rs.filter((x) => x.id !== id));
  }

  function saveEvent(input: EventInput) {
    const ev: MinistryEvent = {
      id: input.id || uid(),
      date: input.date,
      title: input.title,
      category: input.category,
    };
    setEvents((es) => (input.id ? es.map((x) => (x.id === input.id ? ev : x)) : [...es, ev]));
  }
  function deleteEvent(id: string) {
    setEvents((es) => es.filter((x) => x.id !== id));
  }

  function saveTalk(input: TalkInput) {
    const t: Talk = {
      id: input.id || uid(),
      date: input.date,
      number: input.number,
      title: input.title ?? "",
      location: input.location ?? "",
    };
    setTalks((ts) => (input.id ? ts.map((x) => (x.id === input.id ? t : x)) : [...ts, t]));
  }
  function deleteTalk(id: string) {
    setTalks((ts) => ts.filter((x) => x.id !== id));
  }

  function saveSession(input: SessionInput) {
    const now = new Date().toISOString();
    setSessions((ss) => {
      const existing = input.id ? ss.find((x) => x.id === input.id) : undefined;
      const s: Session = {
        id: input.id || uid(),
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes,
        note: input.note ?? "",
        source: input.source,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      return input.id ? ss.map((x) => (x.id === input.id ? s : x)) : [...ss, s];
    });
  }
  function deleteSession(id: string) {
    setSessions((ss) => ss.filter((x) => x.id !== id));
  }

  function saveProfile(input: ProfileInput) {
    const name = input.displayName?.trim();
    const events: ProfileEvent[] = input.events.slice(0, MAX_PROFILE_EVENTS).map((e) => ({
      id: e.id || uid(),
      title: e.title.trim(),
      date: e.date,
    }));
    setProfile({
      displayName: name ? name : undefined,
      profilePhotoUri: input.profilePhotoUri,
      events,
    });
  }

  // TASK_045 — trims + collapses internal whitespace runs before both the
  // empty check and the duplicate check, per the product rule ("не
  // учитывать регистр и лишние пробелы"). Checked against system category
  // labels too (not just other custom topics) so a custom "Пионер" can't
  // shadow the built-in one.
  function addCustomCategory(name: string): AddCustomCategoryResult {
    const normalized = name.trim().replace(/\s+/g, " ");
    if (!normalized) return { ok: false, error: "empty" };

    const key = normalized.toLowerCase();
    const systemLabels = Object.values(CAT).map((c) => c.label.toLowerCase());
    const customNames = customCategories.map((c) => c.name.toLowerCase());
    if (systemLabels.includes(key) || customNames.includes(key)) {
      return { ok: false, error: "duplicate" };
    }

    const category: CustomCategory = { id: uid(), name: normalized };
    setCustomCategories((cs) => [...cs, category]);
    return { ok: true, category };
  }

  function saveNotificationSettings(settings: NotificationSettings) {
    setNotificationSettings({
      enabled: settings.enabled,
      dayBefore: settings.dayBefore,
      sameDay: settings.sameDay,
    });
  }

  function replaceAllData(data: ReplaceAllDataInput) {
    setRecords(data.records);
    setEvents(data.events);
    setTalks(data.talks);
    setSessions(data.sessions);
  }

  const value: StoreValue = {
    records,
    events,
    talks,
    sessions,
    profile,
    customCategories,
    notificationSettings,
    loaded,
    saveRecord,
    deleteRecord,
    saveEvent,
    deleteEvent,
    saveTalk,
    deleteTalk,
    saveSession,
    deleteSession,
    saveProfile,
    addCustomCategory,
    saveNotificationSettings,
    replaceAllData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
