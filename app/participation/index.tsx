import { useMemo } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground } from "@/components/dashboard";
import { MINISTRY } from "@/components/dashboard/tokens";
import { ChevronRightIcon } from "@/components/icons";
import { MF, dayWord } from "@/data/constants";
import { participationByMonth } from "@/data/participation";
import { useStore } from "@/store/StoreContext";
import { useThemedStyles } from "@/theme";

// TASK_073 — «Детали» for a PUBLISHER: participation statistics by month.
//
//   Сентябрь 2026   8 дней служения  ›
//   Август 2026    11 дней служения  ›
//
// Neutral figures only — no norm, no percentage, no "good/bad". Tapping a
// month opens /participation/[key] with that month's calendar and marks.
// Root-Stack route (outside `(tabs)`), same placement as /upcoming-events
// and /notifications, so the tab bar is not mounted under it.
export default function ParticipationStatsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { participation } = useStore();
  const months = useMemo(() => participationByMonth(participation), [participation]);
  const total = useMemo(() => months.reduce((n, m) => n + m.days, 0), [months]);

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none">
            Участие в служении
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.total} testID="participation-total">
            {months.length === 0 ? "Отметок пока нет" : `Всего: ${total} ${dayWord(total)} служения`}
          </Text>
          {months.length > 0 && (
            <View style={styles.card}>
              {months.map((m, i) => (
                <Pressable
                  key={m.key}
                  onPress={() => router.push(`/participation/${m.key}` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`${MF[m.month - 1]} ${m.year}: ${m.days} ${dayWord(m.days)} служения`}
                  style={({ pressed }) => [styles.row, i < months.length - 1 && styles.divider, pressed && styles.pressed]}
                  testID={`participation-month-${m.key}`}
                >
                  <View style={styles.textWrap}>
                    <Text style={styles.month}>{`${MF[m.month - 1]} ${m.year}`}</Text>
                    <Text style={styles.days}>{`${m.days} ${dayWord(m.days)} служения`}</Text>
                  </View>
                  <ChevronRightIcon size={18} color={DS.chevron} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.homeBase },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, justifyContent: "center", minHeight: 52 },
  back: { position: "absolute", left: 16 },
  title: { fontSize: 20, fontWeight: "700", color: DS.navy, textAlign: "center", letterSpacing: -0.2 },
  content: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 40 },
  total: { fontSize: 15, fontWeight: "600", color: DS.subInk, paddingHorizontal: 4 },
  card: { backgroundColor: DS.cardBg, borderRadius: 22, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14, minHeight: 64 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DS.divider },
  pressed: { backgroundColor: DS.pressedBg },
  textWrap: { flex: 1 },
  month: { fontSize: 16, fontWeight: "700", color: DS.navy },
  days: { fontSize: 14, fontWeight: "600", color: MINISTRY.primary, marginTop: 2 },
});
