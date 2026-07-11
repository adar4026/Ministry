import { useState } from "react";
import { View } from "react-native";
import type { TalkInput } from "@/store/StoreContext";
import type { Talk } from "@/types";
import { DangerButton, Field, PrimaryButton, TextField } from "@/components/ui";

const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export function TalkForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: Talk;
  onSave: (input: TalkInput) => void;
  onDelete?: () => void;
}) {
  const [date, setDate] = useState(initial?.date ?? "");
  const [number, setNumber] = useState(initial?.number ? String(initial.number) : "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");

  function submit() {
    if (!isISODate(date)) return;
    const n = parseInt(number, 10);
    onSave({
      id: initial?.id,
      date,
      number: Number.isFinite(n) ? n : null,
      title,
      location,
    });
  }

  return (
    <View>
      <Field label="Дата (ГГГГ-ММ-ДД)">
        <TextField
          value={date}
          onChangeText={setDate}
          placeholder="2026-06-28"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
      </Field>
      <Field label="Номер речи (пусто = специальная)">
        <TextField value={number} onChangeText={setNumber} keyboardType="number-pad" placeholder="Напр. 75" />
      </Field>
      <Field label="Название речи">
        <TextField value={title} onChangeText={setTitle} placeholder="Необязательно" />
      </Field>
      <Field label="Место / Собрание">
        <TextField value={location} onChangeText={setLocation} placeholder="Напр. Хихон" />
      </Field>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <PrimaryButton label="Сохранить" onPress={submit} />
        {onDelete && <DangerButton label="Удалить" onPress={onDelete} />}
      </View>
    </View>
  );
}
