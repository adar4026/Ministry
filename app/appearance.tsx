import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { DS, HomeBackground } from "@/components/dashboard";
import { MINISTRY } from "@/components/dashboard/tokens";
import { CheckIcon } from "@/components/icons";
import { THEME_DESCRIPTION, THEME_LABEL, THEME_PREFERENCES } from "@/data/ministryMode";
import { useTheme, useThemedStyles } from "@/theme";
import type { ThemePreference } from "@/types";

// TASK_078 — «Оформление», opened from the Home drawer (☰ → Приложение →
// Оформление) and from the Profile page's settings card. The same three
// choices Finance's toggleTheme() cycles through, laid out as radio cards
// on the DS card system exactly like «Мой режим служения» in /settings.
//
//   ОФОРМЛЕНИЕ
//   Тема      ○ Светлая тема / ○ Тёмная тема / ● Системная тема
//
// The preference is `settings.theme` (mj_settings_v1); the drawer's ☼/☾
// button writes the same field, so the two stay in step.
export default function AppearanceScreen() {
  const styles = useThemedStyles(makeStyles);
  const { preference, scheme, setPreference } = useTheme();

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <BackButton fallbackHref="/" background={DS.cardBg} color={DS.navy} style={styles.back} />
          <Text style={styles.title} pointerEvents="none">
            Оформление
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.groupTitle} accessibilityRole="header">
            Тема
          </Text>

          <View style={styles.card} testID="theme-card">
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Цветовая тема</Text>
              <Text style={styles.cardHint}>
                {preference === "system"
                  ? `Сейчас по настройке устройства: ${scheme === "dark" ? "тёмная" : "светлая"}`
                  : "Действует во всём приложении"}
              </Text>
            </View>
            <View style={styles.radioGroup} accessibilityRole="radiogroup">
              {THEME_PREFERENCES.map((theme: ThemePreference) => {
                const selected = preference === theme;
                return (
                  <Pressable
                    key={theme}
                    onPress={() => setPreference(theme)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected }}
                    accessibilityLabel={`${THEME_LABEL[theme]}. ${THEME_DESCRIPTION[theme]}`}
                    style={({ pressed }) => [styles.radio, selected && styles.radioSelected, pressed && styles.pressed]}
                    testID={`theme-${theme}`}
                  >
                    <View style={[styles.radioDot, selected && styles.radioDotOn]}>
                      {selected && <CheckIcon size={14} color="#fff" />}
                    </View>
                    <View style={styles.radioText}>
                      <Text style={[styles.radioLabel, selected && styles.radioLabelOn]}>{THEME_LABEL[theme]}</Text>
                      <Text style={styles.radioDesc}>{THEME_DESCRIPTION[theme]}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
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
});
