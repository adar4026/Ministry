import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground, SummaryCard } from "@/components/dashboard";
import { BellIcon } from "@/components/icons";

// TASK_060 — "Профиль → Уведомления". Deliberately an information-only
// placeholder, not a working settings screen: TASK_059's version looked
// functional (switches, a "check now" button, a permission flow) but relied
// on a Service Worker setTimeout for background delivery, which iOS cannot
// be trusted to run while the PWA is closed — the one case the feature
// exists for. Rather than ship something that LOOKS like it works, this
// screen says plainly that it doesn't yet. The real implementation (Web
// Push via a small server — see docs/TASKS/TASK_060_NOTIFICATIONS_STUB_ROLLBACK.md
// §"Проблема") is a separate, larger task pending the owner's infrastructure
// choice.
//
// Root-Stack route (outside the `(tabs)` group), same placement as
// app/upcoming-events.tsx — the bottom tab bar and centre "Добавить" button
// are rendered only by the Tabs navigator, so neither is affected here.
//
// Visuals reuse the existing card system with no new tokens: HomeBackground +
// DS + SummaryCard + BackButton, exactly as /upcoming-events and Profile
// already do.
export default function NotificationsScreen() {
  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/profile" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none">
            Уведомления
          </Text>
        </View>

        <View style={styles.content}>
          <SummaryCard style={styles.card}>
            <View style={styles.iconBg}>
              <BellIcon size={26} color={DS.accent} />
            </View>
            <Text style={styles.cardTitle}>Уведомления о событиях</Text>
            <Text style={styles.cardBody}>
              Здесь можно будет настроить напоминания о предстоящих событиях. Функция появится в будущем.
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Скоро появится</Text>
            </View>
          </SummaryCard>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.homeBase },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, justifyContent: "center", minHeight: 52 },
  back: { position: "absolute", left: 16 },
  title: { fontSize: 20, fontWeight: "700", color: DS.navy, textAlign: "center", letterSpacing: -0.2 },
  content: { padding: 16, paddingTop: 4 },
  card: { alignItems: "center", gap: 10, paddingVertical: 28 },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: DS.heroBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: DS.navy, textAlign: "center" },
  cardBody: { fontSize: 14, lineHeight: 20, color: DS.subInk, textAlign: "center", paddingHorizontal: 8 },
  // Deliberately not a Pressable — this reads as an inert status label, not
  // as an interactive control the owner might tap expecting something to
  // happen.
  badge: {
    marginTop: 6,
    backgroundColor: DS.segOff,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeLabel: { fontSize: 13, fontWeight: "600", color: DS.subInk },
});
