import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { BackupSection } from "@/components/settings/BackupSection";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { ProfileSettingsRow } from "@/components/profile/ProfileSettingsRow";
import { DS, HomeBackground, SectionHeader, SummaryCard } from "@/components/dashboard";
import { useTabBarContentInset } from "@/components/TabBar";
import {
  BellIcon,
  CalendarIcon,
  ChartIcon,
  ClockIcon,
  CloudIcon,
  GlobeIcon,
  InfoIcon,
  MessageIcon,
  PaletteIcon,
  TargetIcon,
} from "@/components/icons";
import { useStore } from "@/store/StoreContext";

const APP_VERSION = "0.4.4";

const SETTINGS = [
  { label: "Уведомления", icon: BellIcon },
  { label: "Цели", icon: TargetIcon },
  { label: "Календарь служения", icon: CalendarIcon },
  { label: "Статистика", icon: ChartIcon },
  { label: "Оформление", icon: PaletteIcon },
  { label: "Язык", icon: GlobeIcon },
];

function soon(label: string) {
  Alert.alert(label, "Появится позже");
}

export default function ProfileScreen() {
  const { profile, saveProfile } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  // TASK_054 — clearance now lives on this ScrollView's own content instead
  // of the shared Tabs scene padding (see app/(tabs)/_layout.tsx).
  const bottomInset = useTabBarContentInset();

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Профиль</Text>
          <Text style={styles.subtitle}>Личные данные и настройки</Text>
        </View>

        <ProfileHeroCard
          profile={profile}
          onPress={() => setEditOpen(true)}
          onInvalidPhoto={() =>
            saveProfile({ displayName: profile.displayName, events: profile.events, profilePhotoUri: undefined })
          }
        />
        <ProfileEditSheet
          visible={editOpen}
          profile={profile}
          onSave={saveProfile}
          onClose={() => setEditOpen(false)}
        />

        <View style={styles.section}>
          <SectionHeader title="Настройки" />
          <SummaryCard style={styles.listCard}>
            {SETTINGS.map((item, i) => (
              <ProfileSettingsRow
                key={item.label}
                icon={item.icon}
                title={item.label}
                onPress={() => soon(item.label)}
                last={i === SETTINGS.length - 1}
              />
            ))}
          </SummaryCard>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Данные и резервные копии" />
          <SummaryCard style={styles.listCard}>
            <BackupSection last={false} />
            <ProfileSettingsRow
              icon={CloudIcon}
              title="Синхронизация"
              subtitle="Скоро — через A-Lex Core"
              last
            />
          </SummaryCard>
        </View>

        <View style={styles.section}>
          <SectionHeader title="О приложении" />
          <SummaryCard style={styles.listCard}>
            <ProfileSettingsRow icon={InfoIcon} title="Версия приложения" value={APP_VERSION} />
            <ProfileSettingsRow icon={ClockIcon} title="История изменений" onPress={() => soon("История изменений")} />
            <ProfileSettingsRow icon={MessageIcon} title="Обратная связь" onPress={() => soon("Обратная связь")} last />
          </SummaryCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same background mechanism as Home/Timeline (TASK_041/TASK_007):
  // DS.homeBase as the flat base color under HomeBackground's gradient —
  // no page-local background color.
  screen: { flex: 1, backgroundColor: DS.homeBase },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 28 },
  header: { paddingHorizontal: 4 },
  title: { fontSize: 28, fontWeight: "700", color: DS.navy, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: DS.subText, marginTop: 2 },
  section: { gap: 10 },
  // Rows draw their own background/dividers — the card only supplies the
  // white rounded surface + shadow, so its default padding is zeroed and
  // corners clip the rows' pressed/hover backgrounds.
  listCard: { padding: 0, overflow: "hidden" },
});
