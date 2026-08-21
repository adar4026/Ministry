import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { NotificationToggleRow } from "@/components/settings/NotificationToggleRow";
import { ProfileSettingsRow } from "@/components/profile/ProfileSettingsRow";
import { DS, HomeBackground, SectionHeader, SummaryCard } from "@/components/dashboard";
import { BellIcon, MoonIcon, SunIcon } from "@/components/icons";
import { REMINDER_TIMES } from "@/data/notifications";
import {
  getNotificationSupport,
  getPermissionState,
  requestNotificationPermission,
  sendTestNotification,
  type NotificationPermissionState,
  type NotificationSupport,
} from "@/utils/localNotifications";
import { useStore } from "@/store/StoreContext";

// TASK_059 — "Профиль → Уведомления". A root-Stack route (outside the
// `(tabs)` group), same placement as app/upcoming-events.tsx: the bottom tab
// bar is rendered only by the Tabs navigator, so it simply isn't here and
// nothing (least of all the centre "Добавить" button) needs hiding.
//
// Visuals reuse the existing card system with no new tokens: HomeBackground +
// DS + SummaryCard(padding 0, overflow hidden) + SectionHeader + BackButton,
// exactly as /upcoming-events and Profile already do.

const TEST_DELAY_SECONDS = 5;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
const DAY_BEFORE_AT = `В ${pad(REMINDER_TIMES.dayBefore.hour)}:${pad(REMINDER_TIMES.dayBefore.minute)}`;
const SAME_DAY_AT = `В ${pad(REMINDER_TIMES.sameDay.hour)}:${pad(REMINDER_TIMES.sameDay.minute)}`;

// Copy for the permission block. Each variant names the exact next action —
// a "denied" browser silently ignores a repeated requestPermission(), so
// offering that button again would be a dead end.
const PERMISSION_COPY: Record<string, { title: string; body: string; action?: string }> = {
  default: {
    title: "Нужно разрешение",
    body: "Чтобы напоминания приходили, разрешите Ministry отправлять уведомления.",
    action: "Разрешить уведомления",
  },
  denied: {
    title: "Уведомления запрещены",
    body:
      "Разрешение было отклонено, и запросить его повторно из приложения уже нельзя. " +
      "Откройте «Настройки» → «Уведомления» → Ministry и включите «Допуск уведомлений».",
  },
  "needs-standalone": {
    title: "Добавьте Ministry на экран «Домой»",
    body:
      "В обычной вкладке Safari iOS не выдаёт уведомления веб-приложениям. " +
      "Нажмите «Поделиться» → «На экран „Домой“» и откройте Ministry с иконки — " +
      "после этого уведомления можно будет включить.",
  },
  "no-api": {
    title: "Уведомления недоступны",
    body: "Этот браузер не поддерживает системные уведомления. Откройте Ministry в Safari на iPhone или в Chrome.",
  },
};

export default function NotificationsScreen() {
  const { notificationSettings, saveNotificationSettings } = useStore();
  // Resolved after mount, never during the first render: the web build is
  // statically pre-rendered (`web.output: "static"`, app.json), and the
  // notification APIs exist only in the browser — reading them in a useState
  // initializer would make the client's first render disagree with the
  // pre-rendered HTML and flash the "unsupported" notice before correcting
  // itself. `null` means "not known yet" and renders the same on both sides.
  const [platform, setPlatform] = useState<{ support: NotificationSupport; permission: NotificationPermissionState } | null>(
    null,
  );
  const [testSent, setTestSent] = useState(false);

  // The user can grant/revoke the permission in system settings while this
  // screen is mounted; re-read it whenever the app comes back to the front.
  const refresh = useCallback(() => {
    setPlatform({ support: getNotificationSupport(), permission: getPermissionState() });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const support = platform?.support;
  const permission = platform?.permission ?? "unsupported";
  const granted = permission === "granted";
  const canEnable = support?.supported === true;

  async function handleMasterToggle(next: boolean) {
    if (!next) {
      saveNotificationSettings({ ...notificationSettings, enabled: false });
      return;
    }
    if (!canEnable) return;

    // Turning the master switch ON is the only place permission is ever
    // requested, and the switch flips only if it was actually granted — it
    // can never sit "on" without a real OS permission behind it.
    let state = permission;
    if (state !== "granted") state = await requestNotificationPermission();
    setPlatform({ support: getNotificationSupport(), permission: state });
    if (state === "granted") saveNotificationSettings({ ...notificationSettings, enabled: true });
  }

  async function handleTest() {
    await sendTestNotification(TEST_DELAY_SECONDS);
    setTestSent(true);
  }

  // No notice at all until the platform has been probed — see `platform` above.
  const permissionKey = !support ? null : !support.supported ? support.reason : granted ? null : permission;
  const permissionCopy = permissionKey ? PERMISSION_COPY[permissionKey] : undefined;
  // Sub-switches follow the master switch; the master switch itself is only
  // interactive where the platform can actually deliver something.
  const subDisabled = !notificationSettings.enabled || !granted;

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

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Ministry напомнит о приближающихся событиях, чтобы ничего не потерялось: накануне вечером и утром в
            день события.
          </Text>

          {permissionCopy ? (
            <SummaryCard style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{permissionCopy.title}</Text>
              <Text style={styles.noticeBody}>{permissionCopy.body}</Text>
              {permissionCopy.action ? (
                <Pressable
                  onPress={() => void handleMasterToggle(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.noticeButton, pressed && styles.noticeButtonPressed]}
                >
                  <Text style={styles.noticeButtonLabel}>{permissionCopy.action}</Text>
                </Pressable>
              ) : null}
            </SummaryCard>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="Напоминания" />
            <SummaryCard style={styles.listCard}>
              <NotificationToggleRow
                icon={BellIcon}
                title="Уведомления о событиях"
                subtitle="Напоминания о предстоящих событиях"
                value={notificationSettings.enabled && granted}
                onValueChange={(next) => void handleMasterToggle(next)}
                disabled={!canEnable}
              />
              <NotificationToggleRow
                icon={MoonIcon}
                title="За день до события"
                subtitle={DAY_BEFORE_AT}
                value={notificationSettings.dayBefore}
                onValueChange={(next) => saveNotificationSettings({ ...notificationSettings, dayBefore: next })}
                disabled={subDisabled}
              />
              <NotificationToggleRow
                icon={SunIcon}
                title="В день события"
                subtitle={SAME_DAY_AT}
                value={notificationSettings.sameDay}
                onValueChange={(next) => saveNotificationSettings({ ...notificationSettings, sameDay: next })}
                disabled={subDisabled}
                last
              />
            </SummaryCard>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Проверка" />
            <SummaryCard style={styles.listCard}>
              <ProfileSettingsRow
                icon={BellIcon}
                title="Проверить уведомление"
                subtitle={
                  testSent
                    ? `Отправлено — придёт через ${TEST_DELAY_SECONDS} сек.`
                    : `Придёт через ${TEST_DELAY_SECONDS} секунд`
                }
                onPress={() => void handleTest()}
                disabled={!granted}
                last
              />
            </SummaryCard>
            <Text style={styles.hint}>
              Сверните приложение сразу после нажатия — уведомление придёт как обычный системный баннер.
            </Text>
          </View>
        </ScrollView>
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
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 4, paddingBottom: 40, gap: 24 },
  intro: { fontSize: 14, lineHeight: 20, color: DS.onTintInk, paddingHorizontal: 4 },
  section: { gap: 10 },
  listCard: { padding: 0, overflow: "hidden" },
  noticeCard: { gap: 10 },
  noticeTitle: { fontSize: 16, fontWeight: "700", color: DS.navy },
  noticeBody: { fontSize: 14, lineHeight: 20, color: DS.subInk },
  noticeButton: {
    marginTop: 2,
    alignSelf: "flex-start",
    backgroundColor: DS.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  noticeButtonPressed: { opacity: 0.85 },
  noticeButtonLabel: { color: DS.onAccent, fontSize: 15, fontWeight: "700" },
  hint: { fontSize: 13, lineHeight: 18, color: DS.onTintInk, paddingHorizontal: 4 },
});
