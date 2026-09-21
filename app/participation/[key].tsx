import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground } from "@/components/dashboard";
import { ParticipationMiniCalendar } from "@/components/dashboard/ParticipationMiniCalendar";
import { ParticipationRow } from "@/components/participation/ParticipationRow";
import { ParticipationSheet } from "@/components/participation/ParticipationSheet";
import { MF, dayWord, toISODate } from "@/data/constants";
import { participationDaySetForMonth, participationForMonth } from "@/data/participation";
import { useStore } from "@/store/StoreContext";
import type { ServiceParticipation } from "@/types";
import { useThemedStyles } from "@/theme";

// TASK_073 — one month of participation: the month calendar with the
// marked days, then the list of marks (tap → move the date / delete).
export default function ParticipationMonthScreen() {
  const styles = useThemedStyles(makeStyles);
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { participation } = useStore();
  const [editing, setEditing] = useState<ServiceParticipation | null>(null);

  const [yearStr, monthStr] = (key ?? "").split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const valid = Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12;

  const now = new Date();
  const todayISO = toISODate(now);
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month;
  const markedDays = useMemo(() => participationDaySetForMonth(participation, year, month), [participation, year, month]);
  const rows = useMemo(() => participationForMonth(participation, year, month), [participation, year, month]);

  if (!valid) return null;
  const days = markedDays.size;

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/participation" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none">
            {`${MF[month - 1]} ${year}`}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.days} testID="participation-month-days">{`${days} ${dayWord(days)} служения`}</Text>
            <ParticipationMiniCalendar year={year} month={month} markedDays={markedDays} today={isCurrent ? now.getDate() : undefined} />
          </View>
          {rows.length > 0 && (
            <View style={styles.listCard}>
              {rows.map((item, i) => (
                <ParticipationRow key={item.id} item={item} showDivider={i < rows.length - 1} onPress={setEditing} todayISO={todayISO} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <ParticipationSheet visible={editing !== null} existing={editing ?? undefined} onClose={() => setEditing(null)} />
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
  card: { backgroundColor: DS.cardBg, borderRadius: 22, padding: 16, paddingTop: 14 },
  days: { fontSize: 18, fontWeight: "700", color: DS.navy },
  listCard: { backgroundColor: DS.cardBg, borderRadius: 18, paddingHorizontal: 16 },
});
