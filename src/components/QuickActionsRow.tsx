import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { COLORS, formatHM, dayWord, MONTHLY_GOAL, monthProgress } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

interface QuickActionsRowProps {
  style?: any;
}

export function QuickActionsRow({ style }: QuickActionsRowProps) {
  const { records, sessions } = useStore();
  const p = monthProgress(records, new Date(), sessions);
  const hoursRemaining = Math.max(0, MONTHLY_GOAL - p.hoursDone);

  const actions = [
    {
      key: "timer",
      label: "Таймер",
      subtitle: "Начать служение",
      icon: "⏱",
      color: COLORS.accent,
      bg: "#dbeafe",
      onPress: () => router.push("/hours/timer" as any),
      disabled: false,
    },
    {
      key: "entry",
      label: "Добавить время",
      subtitle: "Ручной ввод",
      icon: "✏️",
      color: COLORS.green,
      bg: "#dcfce7",
      onPress: () => router.push("/hours/entry" as any),
      disabled: false,
    },
    {
      key: "history",
      label: "История",
      subtitle: `${sessions.length} сессий`,
      icon: "📋",
      color: COLORS.warn,
      bg: "#fef9c3",
      onPress: () => router.push("/hours/history" as any),
      disabled: sessions.length === 0,
    },
    {
      key: "stats",
      label: "Статистика",
      subtitle: "Появится в TASK_005E",
      icon: "📊",
      color: COLORS.accent,
      bg: "#dbeafe",
      onPress: () => router.push("/hours/stats" as any),
      disabled: false,
    },
  ];

  return (
    <View style={[styles.row, style]}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={a.onPress}
          disabled={a.disabled}
          style={({ pressed }) => [
            styles.btn,
            a.disabled && styles.btnDisabled,
            pressed && !a.disabled && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          <View style={[styles.iconBg, { backgroundColor: a.bg }]}>
            <Text style={styles.iconText}>{a.icon}</Text>
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.btnLabel, { color: a.color }]}>{a.label}</Text>
            <Text style={[styles.btnSub, { color: a.color }]}>{a.subtitle}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.5 },
  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 18 },
  textWrap: { flex: 1 },
  btnLabel: { fontSize: 14, fontWeight: "700" },
  btnSub: { fontSize: 11, fontWeight: "500", marginTop: 1 },
});