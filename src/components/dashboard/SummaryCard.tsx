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
  accessibilityLabel,
}: {
  title?: string;
  accent?: string;
  meta?: string;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  // TASK_042 — optional a11y label for the pressable card as a whole (e.g.
  // Profile's hero card, which has no `title` header to derive one from).
  // Only applied when `onPress` is set; existing callers that don't pass it
  // are unaffected.
  accessibilityLabel?: string;
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
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
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  metaWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  // DS.subInk, not DS.metaText (TASK_048): the only consumer of `meta` is
  // Home's service-year card, where the old token measured 2.96:1 on the
  // white surface — below WCAG AA for 16px text.
  meta: { fontSize: 16, color: DS.subInk, fontWeight: "600" },
  chev: { fontSize: 19, color: DS.chevron, fontWeight: "700" },
});
