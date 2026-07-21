import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BackupSection } from "@/components/settings/BackupSection";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

const APP_VERSION = "0.4.4";

const SETTINGS = ["Уведомления", "Цели", "Календарь служения", "Статистика", "Оформление", "Язык"];

function soon(label: string) {
  Alert.alert(label, "Появится позже");
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  subtitle,
  onPress,
  last,
}: {
  label: string;
  value?: string;
  subtitle?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { profile, saveProfile } = useStore();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.content}>
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

      <SectionCard title="Настройки">
        {SETTINGS.map((label, i) => (
          <Row key={label} label={label} onPress={() => soon(label)} last={i === SETTINGS.length - 1} />
        ))}
      </SectionCard>

      <SectionCard title="Данные">
        <Row label="Синхронизация" subtitle="Скоро — через A-Lex Core" last />
      </SectionCard>

      <SectionCard title="Резервная копия данных">
        <BackupSection />
      </SectionCard>

      <SectionCard title="О приложении">
        <Row label="Версия приложения" value={APP_VERSION} />
        <Row label="История изменений" onPress={() => soon("История изменений")} />
        <Row label="Обратная связь" onPress={() => soon("Обратная связь")} last />
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  section: {},
  sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.muted, marginBottom: 8, marginLeft: 4, textTransform: "uppercase", letterSpacing: 1 },
  sectionBody: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 15, color: COLORS.text },
  rowSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  rowValue: { fontSize: 14, color: COLORS.muted },
  chevron: { fontSize: 20, color: COLORS.muted, fontWeight: "600" },
  pressed: { opacity: 0.6 },
});
