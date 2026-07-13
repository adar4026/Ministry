import { useState } from "react";
import { View } from "react-native";
import { toISODate } from "@/data/constants";
import type { SessionInput } from "@/store/StoreContext";
import type { Session } from "@/types";
import { DangerButton, Field, PrimaryButton, TextField } from "@/components/ui";

// Parallel to RecordForm, not a replacement — creates/edits a Session
// (source: "manual"). No startTime/endTime: manual entry must never
// require the user to invent or remember exact start/end times (see
// docs/TASKS/TASK_005_ARCHITECTURE.md §6).
export function SessionForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: Session;
  onSave: (input: SessionInput) => void;
  onDelete?: () => void;
}) {
  const [date, setDate] = useState(initial?.date ?? toISODate(new Date()));
  const [durationMinutes, setDurationMinutes] = useState(initial ? String(initial.durationMinutes) : "");
  const [note, setNote] = useState(initial?.note ?? "");

  function submit() {
    const minutes = parseInt(durationMinutes, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(minutes) || minutes <= 0) return;
    onSave({ id: initial?.id, date, durationMinutes: minutes, note, source: "manual" });
  }

  return (
    <View>
      <Field label="Дата">
        <TextField value={date} onChangeText={setDate} placeholder="ГГГГ-ММ-ДД" />
      </Field>
      <Field label="Длительность (мин)">
        <TextField
          value={durationMinutes}
          onChangeText={setDurationMinutes}
          keyboardType="number-pad"
          placeholder="0"
        />
      </Field>
      <Field label="Заметка">
        <TextField value={note} onChangeText={setNote} placeholder="Необязательно" />
      </Field>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <PrimaryButton label="Сохранить" onPress={submit} />
        {onDelete && <DangerButton label="Удалить" onPress={onDelete} />}
      </View>
    </View>
  );
}
