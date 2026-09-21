// TASK_081 — the quiet empty state for a year (or a lifetime) with no
// entries: no zeroed grid, no empty chart — one card with a sentence and a
// button into the existing service calendar (/hours/history), where time
// is actually recorded.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { DS, MINISTRY } from "@/components/dashboard/tokens";
import { CalendarIcon } from "@/components/icons";
import { useThemedStyles } from "@/theme";

export function StatsEmptyState({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card} testID="stats-empty">
      <View style={styles.iconWrap}>
        <CalendarIcon size={22} color={MINISTRY.primary} />
      </View>
      <Text style={styles.title}>Пока нет статистики</Text>
      <Text style={styles.text}>{text}</Text>
      <Pressable
        onPress={() => router.push("/hours/history" as never)}
        accessibilityRole="button"
        accessibilityLabel="Открыть календарь"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        testID="stats-open-calendar"
      >
        <Text style={styles.buttonText}>Открыть календарь</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MINISTRY.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: { fontSize: 17, fontWeight: "700", color: DS.navy, textAlign: "center" },
  text: { fontSize: 14, lineHeight: 20, color: DS.subInk, textAlign: "center", maxWidth: 300 },
  button: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: MINISTRY.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 15, fontWeight: "700", color: MINISTRY.primary },
  pressed: { opacity: 0.7 },
});
