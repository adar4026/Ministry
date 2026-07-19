import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { roundDurationToNearestFive, toISODate } from "@/data/constants";
import { formatDateDMY } from "@/data/dateFormat";
import type { SessionInput } from "@/store/StoreContext";
import type { Session } from "@/types";
import { Card, DangerButton, TextField } from "@/components/ui";
import { DurationWheelPicker } from "@/components/forms/DurationWheelPicker";
import { MonthCalendarModal } from "@/components/forms/MonthCalendarModal";
import { ADD_TIME_COLORS } from "@/components/forms/entryTokens";
import { COLORS } from "@/data/constants";

// The wheel's only granularity is 5-minute steps (0/5/…/55) — no other
// value may ever appear as a row (owner-clarified product rule). An
// existing record whose stored duration isn't itself a multiple of 5 (e.g.
// a timer session, durationMinutes = ceil(bankedSeconds/60)) is normalized
// to the nearest 5-minute step once, at mount, before seeding the wheel
// state — never displayed as a non-standard value. The hours wheel only
// supports 0–24; a normalized duration whose hour part would exceed that
// is clamped so the visible selection always exists as an actual row.
// react-native-web renders TextInput as a real <input>/<textarea>, which
// picks up the browser's default blue focus ring — `outlineStyle` is a
// web-only style property with no native RN equivalent (deliberately kept
// out of the typed StyleSheet.create block below and cast locally instead),
// scoped to just this one field rather than the shared TextField/ui.tsx
// default used by other forms (RecordForm/EventForm/TalkForm).
const noteWebOutlineReset = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

function initialWheelState(durationMinutes: number): { hours: number; minutes: number } {
  const normalized = roundDurationToNearestFive(durationMinutes);
  return {
    hours: Math.min(Math.floor(normalized / 60), 24),
    minutes: normalized % 60,
  };
}

// Parallel to RecordForm, not a replacement — creates/edits a Session
// (source: "manual"). No startTime/endTime: manual entry must never
// require the user to invent or remember exact start/end times (see
// docs/TASKS/TASK_005_ARCHITECTURE.md §6).
//
// The submit/cancel actions live in the screen header (TASK_011), not in
// this component, so validity and the submit trigger are reported upward
// via `onStateChange` rather than rendered here.
export function SessionForm({
  initial,
  onSave,
  onDelete,
  onStateChange,
}: {
  initial?: Session;
  onSave: (input: SessionInput) => void;
  onDelete?: () => void;
  onStateChange?: (state: { canSubmit: boolean; submit: () => void }) => void;
}) {
  // Date is selected only via the full-month calendar (TASK_030) — no
  // free-text entry, so the stored value is always a valid ISO day; the
  // DD-MM-YYYY string (TASK_022) is derived only for display, in the pill.
  const [dateISO, setDateISO] = useState(initial?.date ?? toISODate(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [note, setNote] = useState(initial?.note ?? "");

  const initialDuration = initial?.durationMinutes ?? 0;
  const initialWheel = initialWheelState(initialDuration);
  const [hours, setHours] = useState(initialWheel.hours);
  const [minutes, setMinutes] = useState(initialWheel.minutes);
  // Whether the record being edited was normalized on load — a historical
  // fact about the initial value, not a live validation state, so it's
  // derived once from the prop rather than tracked as its own state.
  const wasRounded = initialDuration % 5 !== 0;

  // Always derived directly from the two visible wheel selections — the
  // wheel is the only source of truth, so what's displayed and what gets
  // saved can never disagree.
  const durationMinutes = hours * 60 + minutes;

  // Selected via calendar, always a real calendar day — the only remaining
  // invalid state is a zero duration, guarded here so a zero-length record
  // can never be saved programmatically (e.g. a stray submit() call before
  // either wheel has been touched), independent of the header button's
  // disabled state.
  const canSubmit = durationMinutes > 0;

  function submit() {
    if (!canSubmit) return;
    onSave({ id: initial?.id, date: dateISO, durationMinutes, note, source: "manual" });
  }

  useEffect(() => {
    onStateChange?.({ canSubmit, submit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, dateISO, durationMinutes, note]);

  return (
    <View>
      <Card style={styles.dateCard}>
        <Text style={styles.dateLabel}>Дата</Text>
        <Pressable
          onPress={() => setCalendarOpen(true)}
          style={styles.datePill}
          accessibilityRole="button"
          accessibilityLabel={`Дата: ${formatDateDMY(dateISO)}. Открыть календарь`}
        >
          <Text style={styles.datePillText}>{formatDateDMY(dateISO)}</Text>
        </Pressable>
      </Card>
      <MonthCalendarModal
        visible={calendarOpen}
        selectedDate={dateISO}
        onSelect={(iso) => {
          setDateISO(iso);
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />

      <Text style={styles.sectionHeading}>Время</Text>
      <Card style={styles.durationCard}>
        <DurationWheelPicker
          hours={hours}
          minutes={minutes}
          onChangeHours={setHours}
          onChangeMinutes={setMinutes}
        />
      </Card>
      {wasRounded && (
        <Text style={styles.roundedNotice}>Время округлено до ближайших 5 минут</Text>
      )}

      <Text style={styles.sectionHeading}>Заметка</Text>
      <Card style={styles.noteCard}>
        <TextField
          value={note}
          onChangeText={setNote}
          placeholder="Напишите здесь…"
          multiline
          style={[styles.noteInput, noteWebOutlineReset]}
        />
      </Card>

      {onDelete && (
        <View style={styles.deleteRow}>
          <DangerButton label="Удалить" onPress={onDelete} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    backgroundColor: ADD_TIME_COLORS.cardBackground,
    marginBottom: 20,
  },
  dateLabel: { fontSize: 17, fontWeight: "700", color: ADD_TIME_COLORS.primaryText },
  datePill: {
    backgroundColor: ADD_TIME_COLORS.datePillBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 140,
    alignItems: "center",
  },
  datePillText: { fontSize: 16, fontWeight: "600", color: ADD_TIME_COLORS.primaryText },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: ADD_TIME_COLORS.primaryText,
    marginBottom: 10,
    marginTop: 2,
  },
  durationCard: { borderRadius: 24, paddingHorizontal: 4, backgroundColor: ADD_TIME_COLORS.cardBackground },
  roundedNotice: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginTop: 8, marginLeft: 4 },
  noteCard: { borderRadius: 20, backgroundColor: ADD_TIME_COLORS.cardBackground },
  noteInput: {
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: 56,
    textAlignVertical: "top",
    paddingHorizontal: 0,
  },
  deleteRow: { marginTop: 24 },
});
