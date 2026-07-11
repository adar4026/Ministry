import { createContext, useContext, type ReactNode } from "react";
import { SEED_RECORDS, SEED_EVENTS, SEED_TALKS } from "@/data/seed";
import { usePersistentState } from "@/hooks/useStorage";
import { uid } from "@/data/constants";
import type { HourRecord, MinistryEvent, Talk } from "@/types";

// AsyncStorage keys — see ARCHITECTURE.md. Bump the version + write a migration
// if the shape of any of these arrays ever changes.
const KEYS = {
  records: "mj_records_v1",
  events: "mj_events_v1",
  talks: "mj_talks_v1",
} as const;

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

type StoreValue = {
  records: HourRecord[];
  events: MinistryEvent[];
  talks: Talk[];
  loaded: boolean;
  saveRecord: (input: RecordInput) => void;
  deleteRecord: (id: string) => void;
  saveEvent: (input: EventInput) => void;
  deleteEvent: (id: string) => void;
  saveTalk: (input: TalkInput) => void;
  deleteTalk: (id: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords, rLoaded] = usePersistentState<HourRecord[]>(KEYS.records, SEED_RECORDS);
  const [events, setEvents, eLoaded] = usePersistentState<MinistryEvent[]>(KEYS.events, SEED_EVENTS);
  const [talks, setTalks, tLoaded] = usePersistentState<Talk[]>(KEYS.talks, SEED_TALKS);

  const loaded = rLoaded && eLoaded && tLoaded;

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

  const value: StoreValue = {
    records,
    events,
    talks,
    loaded,
    saveRecord,
    deleteRecord,
    saveEvent,
    deleteEvent,
    saveTalk,
    deleteTalk,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
