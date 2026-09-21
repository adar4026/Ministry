import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { SEED_RECORDS, SEED_EVENTS, SEED_TALKS } from "@/data/seed";
import { usePersistentState } from "@/hooks/useStorage";
import { CAT, toISODate, uid } from "@/data/constants";
import { DEFAULT_MINISTRY_SETTINGS, isThemePreference, isValidMonthlyGoal, normalizeMinistrySettings, settingsEqual } from "@/data/ministryMode";
import { isFutureDate, isISODay } from "@/data/participation";
import type {
  CustomCategory,
  HourRecord,
  MinistryEvent,
  MinistryMode,
  MinistrySettings,
  ThemePreference,
  ProfileEvent,
  ServiceParticipation,
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
  // TASK_073 — two NEW keys, added beside the existing ones. Nothing above
  // is read, renamed or rewritten because of them: an installation that
  // predates them simply gets the seeds below written once, and looks
  // exactly as it did (pioneer, 50-hour goal) until the user changes mode.
  settings: "mj_settings_v1",
  participation: "mj_participation_v1",
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

// TASK_073 — an existing (or brand-new) installation starts as a pioneer
// with the historical fixed goal; participation starts empty.
const SEED_SETTINGS: MinistrySettings = DEFAULT_MINISTRY_SETTINGS;
const SEED_PARTICIPATION: ServiceParticipation[] = [];

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
  // TASK_062 — carried by v2 backups only. Absent (undefined) means the
  // restored file has no notion of them (a legacy v1 copy), and the values
  // already on this device are deliberately left alone rather than cleared.
  customCategories?: CustomCategory[];
  profile?: UserProfile;
};

// TASK_073 — outcome of a participation write. "future" — the date is after
// today; "duplicate" — another record already holds that date (only for a
// date change: a fresh mark of an already-marked day is `ok` with
// `created: false`, i.e. a no-op, never a second record); "invalid" — not a
// real "YYYY-MM-DD" day.
export type ParticipationWriteResult =
  | { ok: true; created: boolean; item: ServiceParticipation }
  | { ok: false; error: "future" | "duplicate" | "invalid" | "missing" };

type StoreValue = {
  records: HourRecord[];
  events: MinistryEvent[];
  talks: Talk[];
  sessions: Session[];
  profile: UserProfile;
  customCategories: CustomCategory[];
  settings: MinistrySettings;
  participation: ServiceParticipation[];
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
  replaceAllData: (data: ReplaceAllDataInput) => void;
  setMinistryMode: (mode: MinistryMode) => void;
  setMonthlyHourGoal: (goal: number | null) => void;
  // TASK_078 — colour theme preference (light / dark / system).
  setThemePreference: (theme: ThemePreference) => void;
  markParticipation: (dateISO: string, now?: Date) => ParticipationWriteResult;
  updateParticipationDate: (id: string, dateISO: string, now?: Date) => ParticipationWriteResult;
  deleteParticipation: (id: string) => void;
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

  const [rawSettings, setSettings, stLoaded] = usePersistentState<MinistrySettings>(KEYS.settings, SEED_SETTINGS);
  const [rawParticipation, setParticipation, ptLoaded] = usePersistentState<ServiceParticipation[]>(
    KEYS.participation,
    SEED_PARTICIPATION,
  );
  // A non-array under the key (corrupt storage) reads as empty rather than
  // crashing every consumer; it is not rewritten until the first real write.
  const participation = useMemo(() => (Array.isArray(rawParticipation) ? rawParticipation : []), [rawParticipation]);

  const loaded = rLoaded && eLoaded && tLoaded && sLoaded && pLoaded && ccLoaded && stLoaded && ptLoaded;

  // TASK_073 — what screens read is always a COMPLETE settings object: a
  // stored value with a missing/unknown mode or a bad goal is coerced to the
  // safe defaults (pioneer, 50) here, and written back once after hydration
  // — same guard-on-loaded pattern as the profile cap below. Additive only:
  // no other key is touched.
  const settings = useMemo(() => normalizeMinistrySettings(rawSettings), [rawSettings]);
  useEffect(() => {
    if (stLoaded && !settingsEqual(settings, rawSettings as MinistrySettings)) setSettings(settings);
  }, [stLoaded, settings, rawSettings]);

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

  // TASK_073 — mode and goal are two independent fields: changing the mode
  // never clears the goal (Pioneer 50 → Publisher → Pioneer is still 50),
  // and setting the goal never changes the mode.
  function setMinistryMode(mode: MinistryMode) {
    setSettings((s) => ({ ...normalizeMinistrySettings(s), ministryMode: mode }));
  }
  function setMonthlyHourGoal(goal: number | null) {
    if (!isValidMonthlyGoal(goal)) return;
    setSettings((s) => ({ ...normalizeMinistrySettings(s), monthlyHourGoal: goal }));
  }
  // TASK_078 — same shape as the two above: one field, the rest untouched.
  function setThemePreference(theme: ThemePreference) {
    if (!isThemePreference(theme)) return;
    setSettings((s) => ({ ...normalizeMinistrySettings(s), theme }));
  }

  // TASK_073 — participation is keyed by calendar day. The uniqueness and
  // no-future rules live HERE, not only in the sheet's UI, so no caller can
  // persist a duplicate or a future day. Both writes compute against the
  // current `participation` (not a functional update) so the result can be
  // returned synchronously to the caller.
  function markParticipation(dateISO: string, now: Date = new Date()): ParticipationWriteResult {
    if (!isISODay(dateISO)) return { ok: false, error: "invalid" };
    if (isFutureDate(dateISO, toISODate(now))) return { ok: false, error: "future" };
    const existing = participation.find((p) => p.date === dateISO);
    if (existing) return { ok: true, created: false, item: existing };
    const iso = now.toISOString();
    const item: ServiceParticipation = { id: uid(), date: dateISO, participated: true, createdAt: iso, updatedAt: iso };
    setParticipation((ps) => (ps.some((p) => p.date === dateISO) ? ps : [...ps, item]));
    return { ok: true, created: true, item };
  }
  function updateParticipationDate(id: string, dateISO: string, now: Date = new Date()): ParticipationWriteResult {
    const current = participation.find((p) => p.id === id);
    if (!current) return { ok: false, error: "missing" };
    if (!isISODay(dateISO)) return { ok: false, error: "invalid" };
    if (isFutureDate(dateISO, toISODate(now))) return { ok: false, error: "future" };
    if (current.date === dateISO) return { ok: true, created: false, item: current };
    if (participation.some((p) => p.id !== id && p.date === dateISO)) return { ok: false, error: "duplicate" };
    const item: ServiceParticipation = { ...current, date: dateISO, updatedAt: now.toISOString() };
    setParticipation((ps) => ps.map((p) => (p.id === id ? item : p)));
    return { ok: true, created: false, item };
  }
  function deleteParticipation(id: string) {
    setParticipation((ps) => ps.filter((p) => p.id !== id));
  }

  function replaceAllData(data: ReplaceAllDataInput) {
    setRecords(data.records);
    setEvents(data.events);
    setTalks(data.talks);
    setSessions(data.sessions);
    if (data.customCategories) setCustomCategories(data.customCategories);
    if (data.profile) {
      // Same MAX_PROFILE_EVENTS cap the per-item saveProfile() enforces — a
      // restore is not a way around it.
      setProfile({ ...data.profile, events: (data.profile.events ?? []).slice(0, MAX_PROFILE_EVENTS) });
    }
  }

  const value: StoreValue = {
    records,
    events,
    talks,
    sessions,
    profile,
    customCategories,
    settings,
    participation,
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
    replaceAllData,
    setMinistryMode,
    setMonthlyHourGoal,
    setThemePreference,
    markParticipation,
    updateParticipationDate,
    deleteParticipation,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
