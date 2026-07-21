import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, toISODate } from "@/data/constants";
import { calendarElapsed, formatDateDMY } from "@/data/dateFormat";
import { MonthCalendarModal } from "@/components/forms/MonthCalendarModal";
import { DangerButton, Field, PrimaryButton, TextField } from "@/components/ui";
import type { ProfileEvent } from "@/types";

const TITLE_MAX_LENGTH = 60;

export type ProfileEventFormInput = { id?: string; title: string; date: string };

// Add/edit form for a single Profile hero card event (TASK_042). Same
// Save/Delete layout as EventForm/TalkForm — Cancel is the wrapping Modal's
// ✕, not a button here. Unlike EventForm's free-typed "DD-MM-YYYY" text
// field, the date here goes through the existing MonthCalendarModal calendar
// picker per the task's requirement, and future dates are rejected before
// save using calendarElapsed()'s already-existing isFuture flag — no new
// date-comparison logic.
export function ProfileEventForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: ProfileEvent;
  onSave: (input: ProfileEventFormInput) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? toISODate(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Введите название события");
      return;
    }
    if (calendarElapsed(date).isFuture) {
      setError("Дата события не может быть в будущем");
      return;
    }
    setError(null);
    onSave({ id: initial?.id, title: trimmed, date });
  }

  return (
    <View>
      <Field label="Название события">
        <TextField
          value={title}
          onChangeText={setTitle}
          placeholder="Название события"
          maxLength={TITLE_MAX_LENGTH}
          accessibilityLabel="Название события"
        />
      </Field>
      <Field label="Дата">
        <Pressable
          onPress={() => setCalendarOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Выбрать дату события"
          style={styles.dateButton}
        >
          <Text style={styles.dateButtonText}>{formatDateDMY(date)}</Text>
        </Pressable>
      </Field>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <PrimaryButton label="Сохранить" onPress={submit} />
        {onDelete && <DangerButton label="Удалить" onPress={onDelete} />}
      </View>

      <MonthCalendarModal
        visible={calendarOpen}
        selectedDate={date}
        onSelect={(iso) => {
          setDate(iso);
          setCalendarOpen(false);
          setError(null);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dateButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  dateButtonText: { fontSize: 15, color: COLORS.text },
  error: { fontSize: 13, color: COLORS.danger, marginBottom: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
});
