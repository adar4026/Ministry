import { createContext, useContext, type ReactNode } from "react";
import { SEED_RECORDS, SEED_EVENTS, SEED_TALKS } from "@/data/seed";
import { usePersistentState } from "@/hooks/useStorage";
import { uid } from "@/data/constants";
import type { HourRecord, MinistryEvent, Session, Talk } from "@/types";

// AsyncStorage keys — see ARCHITECTURE.md. Bump the version + write a migration
// if the shape of any of these arrays ever changes.
const KEYS = {
  records: "mj_records_v1",
  events: "mj_events_v1",
  talks: "mj_talks_v1",
  sessions: "mj_sessions_v1",
} as const;

// Re-exported for src/data/backupImport.ts (TASK_013) — single source of
// truth for the storage keys the backup/restore flow is allowed to touch.
export const STORAGE_KEYS = KEYS;

const SEED_SESSIONS: Session[] = [];

// Inputs accepted by the save* functions (id absent => create, id present => update).
export type RecordInput = {
  id?: string;
  year: number;
  month: number;
  hours: number;
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
  loaded: boolean;
  saveRecord: (input: RecordInput) => void;
  deleteRecord: (id: string) => void;
  saveEvent: (input: EventInput) => void;
  deleteEvent: (id: string) => void;
  saveTalk: (input: TalkInput) => void;
  deleteTalk: (id: string) => void;
  saveSession: (input: SessionInput) => void;
  deleteSession: (id: string) => void;
  replaceAllData: (data: ReplaceAllDataInput) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords, rLoaded] = usePersistentState<HourRecord[]>(KEYS.records, SEED_RECORDS);
  const [events, setEvents, eLoaded] = usePersistentState<MinistryEvent[]>(KEYS.events, SEED_EVENTS);
  const [talks, setTalks, tLoaded] = usePersistentState<Talk[]>(KEYS.talks, SEED_TALKS);
  const [sessions, setSessions, sLoaded] = usePersistentState<Session[]>(KEYS.sessions, SEED_SESSIONS);

  const loaded = rLoaded && eLoaded && tLoaded && sLoaded;

  function saveRecord(input: RecordInput) {
    const rec: HourRecord = {
      id: input.id || uid(),
      year: input.year,
      month: input.month,
      hours: input.hours,
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
    loaded,
    saveRecord,
    deleteRecord,
    saveEvent,
    deleteEvent,
    saveTalk,
    deleteTalk,
    saveSession,
    deleteSession,
    replaceAllData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
