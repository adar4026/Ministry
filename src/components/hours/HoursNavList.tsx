import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { ChartIcon, ChevronRightIcon, ListIcon, PencilIcon } from "@/components/icons";
import { HOURS_COLORS as C } from "./hoursTokens";

type NavItem = {
  key: string;
  label: string;
  subtitle: string;
  Icon: typeof PencilIcon;
  onPress: () => void;
  disabled?: boolean;
};

// Compact grouped vertical action list (TASK_031) — replaces the old row
// of four narrow cards (QuickActionsRow). Same three destinations/routes
// as before (Таймер is no longer a nav item — it's now the hero card
// above), same "История" disabled-when-empty behavior as the previous
// QuickActionsRow had.
export function HoursNavList() {
  const { sessions } = useStore();

  const items: NavItem[] = [
    {
      key: "entry",
      label: "Добавить время",
      subtitle: "Записать часы вручную",
      Icon: PencilIcon,
      onPress: () => router.push("/entry" as any),
    },
    {
      key: "history",
      label: "История",
      subtitle: "Все записи времени",
      Icon: ListIcon,
      onPress: () => router.push("/hours/history" as any),
      disabled: sessions.length === 0,
    },
    {
      key: "stats",
      label: "Статистика",
      subtitle: "Аналитика и отчёты",
      Icon: ChartIcon,
      onPress: () => router.push("/hours/stats" as any),
    },
  ];

  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        {items.map((item, i) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            disabled={item.disabled}
            style={({ pressed }) => [
              styles.row,
              i < items.length - 1 && styles.rowDivider,
              item.disabled && styles.rowDisabled,
              pressed && !item.disabled && styles.rowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}. ${item.subtitle}`}
            accessibilityState={{ disabled: !!item.disabled }}
          >
            <View style={styles.iconBg}>
              <item.Icon size={19} color={C.accent} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
            <ChevronRightIcon size={18} color={C.tertiaryText} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // TASK_046: shadow lives on an outer, non-clipping wrapper — a shadow and
  // overflow:"hidden" on the same View clip the shadow away on iOS. Same
  // soft shadow as Home's cards (HoursHeroCard/SummaryCard,
  // src/components/dashboard) so this card reads consistently against the
  // now-shared HomeBackground gradient instead of its own flat gray.
  cardShadow: {
    borderRadius: 22,
    shadowColor: "#3c5090",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  card: {
    backgroundColor: C.cardBackground,
    borderRadius: 22,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 64,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  rowPressed: { backgroundColor: "#F7F7F9" },
  rowDisabled: { opacity: 0.4 },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  label: { fontSize: 16, fontWeight: "600", color: C.primaryText },
  subtitle: { fontSize: 13, color: C.secondaryText, marginTop: 2 },
});
