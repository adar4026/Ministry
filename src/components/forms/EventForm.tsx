import { useState } from "react";
import { View } from "react-native";
import { CAT, CATEGORY_KEYS } from "@/data/constants";
import type { EventInput } from "@/store/StoreContext";
import type { Category, MinistryEvent } from "@/types";
import { ChipSelector, DangerButton, Field, PrimaryButton, TextField } from "@/components/ui";

const CATEGORY_OPTIONS = CATEGORY_KEYS.map((k) => ({ value: k, label: CAT[k].label }));

// Accepts an ISO calendar date: YYYY-MM-DD.
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export function EventForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: MinistryEvent;
  onSave: (input: EventInput) => void;
  onDelete?: () => void;
}) {
  const [date, setDate] = useState(initial?.date ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "other");

  function submit() {
    if (!isISODate(date) || !title.trim()) return;
    onSave({ id: initial?.id, date, title: title.trim(), category });
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
      <Field label="Название">
        <TextField value={title} onChangeText={setTitle} placeholder="Что произошло?" />
      </Field>
      <Field label="Категория">
        <ChipSelector options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      </Field>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <PrimaryButton label="Сохранить" onPress={submit} />
        {onDelete && <DangerButton label="Удалить" onPress={onDelete} />}
      </View>
    </View>
  );
}
