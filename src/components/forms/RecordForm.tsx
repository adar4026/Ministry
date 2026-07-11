import { useState } from "react";
import { View } from "react-native";
import { MF } from "@/data/constants";
import type { RecordInput } from "@/store/StoreContext";
import type { HourRecord } from "@/types";
import { ChipSelector, DangerButton, Field, PrimaryButton, TextField } from "@/components/ui";

const MONTH_OPTIONS = MF.map((label, i) => ({ value: i + 1, label }));

export function RecordForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: HourRecord;
  onSave: (input: RecordInput) => void;
  onDelete?: () => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(String(initial?.year ?? now.getFullYear()));
  const [month, setMonth] = useState<number>(initial?.month ?? now.getMonth() + 1);
  const [hours, setHours] = useState(initial ? String(initial.hours) : "");
  const [note, setNote] = useState(initial?.note ?? "");

  function submit() {
    const y = parseInt(year, 10);
    const h = parseInt(hours, 10);
    if (!Number.isFinite(y) || !Number.isFinite(h)) return;
    onSave({ id: initial?.id, year: y, month, hours: h, note });
  }

  return (
    <View>
      <Field label="Год">
        <TextField value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
      </Field>
      <Field label="Месяц">
        <ChipSelector options={MONTH_OPTIONS} value={month} onChange={setMonth} />
      </Field>
      <Field label="Часы">
        <TextField
          value={hours}
          onChangeText={setHours}
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
