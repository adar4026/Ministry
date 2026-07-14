import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { DS } from "./tokens";

// Generic dashboard card primitive (TASK_007) — white rounded surface with a
// soft shadow and an optional header (accent title + right-side meta +
// chevron). Presentational only. Reused by the service-year card, event
// cards, and future dashboard screens (Statistics, Profile, …).
//
// The header (and its chevron) render only when `title` is provided, so a
// bare `<SummaryCard onPress=…>{children}</SummaryCard>` is just a pressable
// surface with no chrome — that's what EventCard builds on.
export function SummaryCard({
  title,
  accent = DS.navy,
  meta,
  onPress,
  children,
  style,
}: {
  title?: string;
  accent?: string;
  meta?: string;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: accent }]}>{title}</Text>
          <View style={styles.metaWrap}>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
            {onPress ? <Text style={styles.chev}>›</Text> : null}
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  pressed: { opacity: 0.9 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 19, fontWeight: "800", letterSpacing: -0.2 },
  metaWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 16, color: DS.metaText, fontWeight: "600" },
  chev: { fontSize: 19, color: DS.chevron, fontWeight: "700" },
});
