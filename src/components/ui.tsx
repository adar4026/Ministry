import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { COLORS } from "@/data/constants";

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function TextField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={COLORS.muted}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function DangerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
    >
      <Text style={styles.dangerBtnText}>{label}</Text>
    </Pressable>
  );
}

export type Option<T> = { value: T; label: string };

export function ChipSelector<T extends string | number>({
  options,
  value,
  onChange,
  idleTextColor,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  // TASK_041 — optional override for the idle (unselected) chip's text
  // color. Omitted by every existing caller (EventForm, RecordForm), so
  // their appearance is unchanged; the Events page passes its own blue.
  idleTextColor?: string;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.chipText,
                idleTextColor && !active ? { color: idleTextColor } : null,
                active && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.blue, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: "#fff",
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: COLORS.blue,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  dangerBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 8,
    alignItems: "center",
  },
  dangerBtnText: { color: COLORS.danger, fontWeight: "600", fontSize: 15 },
  pressed: { opacity: 0.75 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  // maxWidth (TASK_045) caps a single chip so a long label (e.g. a
  // user-created event topic) ellipsizes instead of overflowing the row —
  // existing labels here are all short system words, well under this cap,
  // so no visible change for them.
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, maxWidth: 200 },
  chipIdle: { backgroundColor: "#fff", borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  chipText: { fontSize: 13, color: COLORS.muted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
});
