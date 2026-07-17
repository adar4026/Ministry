import type { ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { BackupSection } from "@/components/settings/BackupSection";
import { COLORS } from "@/data/constants";

const PROFILE = {
  name: "Пользователь",
  facts: [
    ["Крещён", "—"],
    ["Пионер с", "—"],
    ["Стаж", "—"],
    ["G-8", "—"],
  ] as [string, string][],
};

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
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar size={72} />
        <Text style={styles.name}>{PROFILE.name}</Text>
        <View style={styles.facts}>
          {PROFILE.facts.map(([label, value]) => (
            <View key={label} style={styles.fact}>
              <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
              <Text style={styles.factValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

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
  header: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  name: { fontSize: 20, fontWeight: "800", color: COLORS.text, marginTop: 12 },
  facts: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20, marginTop: 14 },
  fact: { alignItems: "center" },
  factLabel: { fontSize: 9, letterSpacing: 1, color: COLORS.muted },
  factValue: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  section: {},
  sectionTitle: { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 8, marginLeft: 4, textTransform: "uppercase", letterSpacing: 1 },
  sectionBody: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 14, color: COLORS.text },
  rowSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  rowValue: { fontSize: 13, color: COLORS.muted },
  chevron: { fontSize: 20, color: COLORS.muted, fontWeight: "600" },
  pressed: { opacity: 0.6 },
});
