import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { MONTHLY_GOAL, dayWord, formatHM, monthProgress } from "@/data/constants";
import { PlusIcon } from "@/components/icons";
import { DS } from "./tokens";
import { GoalRing } from "./GoalRing";

// Home monthly-progress card (TASK_010: compact redesign; TASK_010 amendment
// adds a quick "+" manual-entry shortcut). Sole purpose is to communicate
// progress toward the monthly goal — no duplicate percentage text, no
// color-coded chips. Starting ministry (the timer) lives on the Hours screen
// (QuickActionsRow's "Таймер" action), which already existed there before
// this task — the "+" here routes to the existing Manual Time Entry screen
// (`/hours/entry`, TASK_005B), not the timer. Reads only through
// useStore()/monthProgress()/MONTHLY_GOAL — no new calculation, no new form.
export function HoursHeroCard() {
  const { records, sessions } = useStore();
  const p = monthProgress(records, new Date(), sessions);
  const hasGoal = MONTHLY_GOAL > 0;
  const pct = hasGoal ? (p.hoursDone / MONTHLY_GOAL) * 100 : 0;

  const remainingText = !hasGoal
    ? null
    : p.hoursRemaining > 0
      ? `Осталось ${formatHM(p.hoursRemaining)}`
      : "Цель достигнута";
  const daysText = `${p.daysLeft} ${dayWord(p.daysLeft)} до конца месяца`;

  const a11yLabel = hasGoal
    ? `За текущий месяц внесено ${formatHM(p.hoursDone)} из ${MONTHLY_GOAL}. Выполнено ${Math.round(pct)} процентов. ${remainingText === "Цель достигнута" ? "Цель достигнута." : `Осталось ${formatHM(p.hoursRemaining)}.`} ${daysText}.`
    : `За текущий месяц внесено ${formatHM(p.hoursDone)}. Месячная цель не задана.`;

  return (
    <View style={styles.card}>
      <View accessible accessibilityLabel={a11yLabel}>
        <Text style={styles.label} importantForAccessibility="no">Этот месяц</Text>

        <View style={styles.top}>
          <View style={styles.left}>
            <Text style={styles.total} importantForAccessibility="no">{formatHM(p.hoursDone)}</Text>
            <Text style={styles.sub} importantForAccessibility="no">
              {hasGoal ? `из ${MONTHLY_GOAL} ч` : "Месячная цель не задана"}
            </Text>
          </View>

          {hasGoal && (
            <GoalRing pct={pct} goalHours={MONTHLY_GOAL} size={96} showGoalLabel={false} tone="accent" />
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerTextWrap} importantForAccessibility="no">
          {hasGoal && (
            <>
              <Text style={styles.footerText} numberOfLines={1}>{remainingText}</Text>
              <Text style={styles.footerText} numberOfLines={1}>{daysText}</Text>
            </>
          )}
        </View>

        {/* Quick manual time entry (TASK_010 amendment) — reuses the existing
            Manual Time Entry screen/route/form/save flow; not the timer. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить часы"
          hitSlop={8}
          onPress={() => router.push("/hours/entry" as any)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          <PlusIcon size={18} color={DS.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.divider,
    shadowColor: DS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  label: { fontSize: 13, color: DS.metaText, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  left: { flex: 1 },
  total: { fontSize: 30, fontWeight: "800", color: DS.navy, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: DS.subText, fontWeight: "600", marginTop: 2 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  // Column stack (not the earlier row+dot) so the two lines never collide
  // with the "+" button's reserved width on narrow phones (TASK_010 amendment).
  footerTextWrap: { flex: 1, gap: 2, marginRight: 12 },
  footerText: { fontSize: 13, color: DS.metaText, fontWeight: "600" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnPressed: { opacity: 0.85 },
});
