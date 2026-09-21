import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground } from "@/components/dashboard";
import { MINISTRY } from "@/components/dashboard/tokens";
import { CheckIcon } from "@/components/icons";
import {
  MAX_MONTHLY_GOAL,
  MIN_MONTHLY_GOAL,
  MINISTRY_MODES,
  MODE_DESCRIPTION,
  MODE_LABEL,
  isHoursMode,
  parseMonthlyGoalInput,
} from "@/data/ministryMode";
import { useStore } from "@/store/StoreContext";
import type { MinistryMode } from "@/types";
import { useThemedStyles } from "@/theme";

// TASK_073 — «Настройки», opened from the Home drawer (☰ → Приложение →
// Настройки). The app's own settings live HERE, not in Profile.
//
//   СЛУЖЕНИЕ
//   Мой режим служения      ○ Возвещатель / ● Пионер / ○ Специальный пионер
//   Цель часов              [ 50 ] ч        (pioneer / special pioneer only)
//
// Radio cards on the DS card system (same frame as /notifications and
// /upcoming-events). The mode and the goal are two independent store
// fields: picking «Возвещатель» hides the goal row but never clears the
// value, so switching back restores it.
export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { settings, setMinistryMode, setMonthlyHourGoal } = useStore();
  const hours = isHoursMode(settings.ministryMode);

  // The field is free text while typing; it commits on blur / submit. An
  // invalid value (letters, 0, a fraction, > 9999) is not saved — the stored
  // goal stays, a hint explains, and the field snaps back on blur.
  const [goalText, setGoalText] = useState(settings.monthlyHourGoal === null ? "" : String(settings.monthlyHourGoal));
  const [goalHint, setGoalHint] = useState<string | null>(null);
  useEffect(() => {
    setGoalText(settings.monthlyHourGoal === null ? "" : String(settings.monthlyHourGoal));
  }, [settings.monthlyHourGoal]);

  function commitGoal() {
    const parsed = parseMonthlyGoalInput(goalText);
    if (parsed === undefined) {
      setGoalHint(`Введите целое число от ${MIN_MONTHLY_GOAL} до ${MAX_MONTHLY_GOAL} или оставьте поле пустым`);
      setGoalText(settings.monthlyHourGoal === null ? "" : String(settings.monthlyHourGoal));
      return;
    }
    setGoalHint(null);
    if (parsed !== settings.monthlyHourGoal) setMonthlyHourGoal(parsed);
  }

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none">
            Настройки
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.groupTitle} accessibilityRole="header">
            Служение
          </Text>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Мой режим служения</Text>
              <Text style={styles.cardHint}>Определяет, что показывает Главная: часы и цель или дни участия</Text>
            </View>
            <View style={styles.radioGroup} accessibilityRole="radiogroup">
              {MINISTRY_MODES.map((mode: MinistryMode) => {
                const selected = settings.ministryMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setMinistryMode(mode)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected }}
                    accessibilityLabel={`${MODE_LABEL[mode]}. ${MODE_DESCRIPTION[mode]}`}
                    style={({ pressed }) => [styles.radio, selected && styles.radioSelected, pressed && styles.pressed]}
                    testID={`mode-${mode}`}
                  >
                    <View style={[styles.radioDot, selected && styles.radioDotOn]}>
                      {selected && <CheckIcon size={14} color="#fff" />}
                    </View>
                    <View style={styles.radioText}>
                      <Text style={[styles.radioLabel, selected && styles.radioLabelOn]}>{MODE_LABEL[mode]}</Text>
                      <Text style={styles.radioDesc}>{MODE_DESCRIPTION[mode]}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {hours && (
            <View style={styles.card} testID="goal-card">
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Цель часов</Text>
                <Text style={styles.cardHint}>Ваша собственная месячная цель. Пусто — цель не задана.</Text>
              </View>
              <View style={styles.goalRow}>
                <TextInput
                  value={goalText}
                  onChangeText={(t) => {
                    setGoalText(t);
                    setGoalHint(null);
                  }}
                  onBlur={commitGoal}
                  onSubmitEditing={commitGoal}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  returnKeyType="done"
                  maxLength={4}
                  placeholder="50"
                  placeholderTextColor={DS.metaText}
                  accessibilityLabel="Цель часов в месяц"
                  style={styles.goalInput}
                  testID="goal-input"
                />
                <Text style={styles.goalUnit}>ч в месяц</Text>
              </View>
              {goalHint ? (
                <Text style={styles.goalError} accessibilityLiveRegion="polite">
                  {goalHint}
                </Text>
              ) : null}
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
  groupTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: DS.subInk,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardHead: { gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: DS.navy },
  cardHint: { fontSize: 13, lineHeight: 18, color: DS.subInk },
  radioGroup: { gap: 8 },
  radio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: DS.divider,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  radioSelected: { borderColor: MINISTRY.accent, backgroundColor: MINISTRY.accentSoft },
  pressed: { opacity: 0.85 },
  radioDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DS.chevron,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDotOn: { backgroundColor: MINISTRY.accent, borderColor: MINISTRY.accent },
  radioText: { flex: 1, minWidth: 0 },
  radioLabel: { fontSize: 16, fontWeight: "600", color: DS.navy },
  radioLabelOn: { color: MINISTRY.primary },
  radioDesc: { fontSize: 13, lineHeight: 17, color: DS.subInk, marginTop: 1 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  goalInput: {
    width: 112,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: DS.divider,
    backgroundColor: DS.homeMintBase,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: "700",
    color: DS.navy,
    textAlign: "center",
  },
  goalUnit: { fontSize: 15, fontWeight: "600", color: DS.subInk },
  goalError: { fontSize: 13, fontWeight: "600", color: DS.danger },
});
