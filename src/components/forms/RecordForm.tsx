import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, LEGACY_ENTRY_BLOCK_MESSAGE, MF, legacyEntryBlockReason } from "@/data/constants";
import type { RecordInput } from "@/store/StoreContext";
import type { HourRecord, Session } from "@/types";
import { ChipSelector, DangerButton, Field, PrimaryButton, TextField } from "@/components/ui";

const MONTH_OPTIONS = MF.map((label, i) => ({ value: i + 1, label }));

// `sessions` is required (not optional/defaulted) so every call site must
// explicitly supply it — see the TASK_005B product rule: the legacy
// HourRecord workflow must never save for a Session-authoritative,
// current, or future month. See legacyEntryBlockReason() in
// src/data/constants.ts for the single shared predicate this enforces.
export function RecordForm({
  initial,
  sessions,
  onSave,
  onDelete,
}: {
  initial?: HourRecord;
  sessions: Session[];
  onSave: (input: RecordInput) => void;
  onDelete?: () => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(String(initial?.year ?? now.getFullYear()));
  const [month, setMonth] = useState<number>(initial?.month ?? now.getMonth() + 1);
  const [hours, setHours] = useState(initial ? String(initial.hours) : "");
  const [note, setNote] = useState(initial?.note ?? "");

  const blockReason = useMemo(() => {
    const y = parseInt(year, 10);
    if (!Number.isFinite(y)) return null;
    return legacyEntryBlockReason(sessions, y, month, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, sessions]);

  function submit() {
    if (blockReason) return;
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
      {blockReason && (
        <Text style={styles.blockNotice}>{LEGACY_ENTRY_BLOCK_MESSAGE[blockReason]}</Text>
      )}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <PrimaryButton label="Сохранить" onPress={submit} />
        {onDelete && <DangerButton label="Удалить" onPress={onDelete} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blockNotice: {
    fontSize: 13,
    color: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
});
