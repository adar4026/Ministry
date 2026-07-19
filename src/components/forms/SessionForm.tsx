import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { roundDurationToNearestFive, toISODate } from "@/data/constants";
import { formatDateDMY, isValidDMY, parseDMYToISO } from "@/data/dateFormat";
import type { SessionInput } from "@/store/StoreContext";
import type { Session } from "@/types";
import { Card, DangerButton, SectionTitle, TextField } from "@/components/ui";
import { DurationWheelPicker } from "@/components/forms/DurationWheelPicker";
import { COLORS } from "@/data/constants";

// The wheel's only granularity is 5-minute steps (0/5/…/55) — no other
// value may ever appear as a row (owner-clarified product rule). An
// existing record whose stored duration isn't itself a multiple of 5 (e.g.
// a timer session, durationMinutes = ceil(bankedSeconds/60)) is normalized
// to the nearest 5-minute step once, at mount, before seeding the wheel
// state — never displayed as a non-standard value. The hours wheel only
// supports 0–24; a normalized duration whose hour part would exceed that
// is clamped so the visible selection always exists as an actual row.
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
  // Visible/editable value is DD-MM-YYYY (TASK_022) — the internal ISO
  // value only exists momentarily, built at submit() from this field.
  const [date, setDate] = useState(formatDateDMY(initial?.date ?? toISODate(new Date())));
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

  const dateValid = isValidDMY(date);
  const canSubmit = dateValid && durationMinutes > 0;

  function submit() {
    if (!canSubmit) return;
    onSave({ id: initial?.id, date: parseDMYToISO(date), durationMinutes, note, source: "manual" });
  }

  useEffect(() => {
    onStateChange?.({ canSubmit, submit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, date, durationMinutes, note]);

  return (
    <View>
      <Card style={styles.dateCard}>
        <Text style={styles.dateLabel}>Дата</Text>
        <TextField
          value={date}
          onChangeText={setDate}
          placeholder="ДД-ММ-ГГГГ"
          style={styles.datePill}
        />
      </Card>

      <SectionTitle>Время</SectionTitle>
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
      {durationMinutes <= 0 && (
        <Text style={styles.hint} accessibilityRole="alert">
          Укажите длительность больше 0
        </Text>
      )}

      <SectionTitle>Заметка</SectionTitle>
      <Card style={styles.noteCard}>
        <TextField
          value={note}
          onChangeText={setNote}
          placeholder="Напишите здесь…"
          multiline
          style={styles.noteInput}
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
    marginBottom: 20,
  },
  dateLabel: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  datePill: {
    backgroundColor: COLORS.groupedBg,
    borderWidth: 0,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: "center",
    minWidth: 140,
  },
  durationCard: { borderRadius: 24, paddingHorizontal: 4 },
  roundedNotice: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginTop: 8, marginLeft: 4 },
  hint: { color: COLORS.danger, fontSize: 13, fontWeight: "600", marginTop: 8, marginLeft: 4 },
  noteCard: { borderRadius: 20 },
  noteInput: {
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: 72,
    textAlignVertical: "top",
    paddingHorizontal: 0,
  },
  deleteRow: { marginTop: 24 },
});
