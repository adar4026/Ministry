import { SafeAreaView, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { COLORS } from "@/data/constants";

export default function StatsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>Ã¢ÂÂ¹ ÃÂÃÂ°ÃÂ·ÃÂ°ÃÂ´</Text>
        </Pressable>
        <Text style={styles.title}>ÃÂ¡ÃÂÃÂ°ÃÂÃÂ¸ÃÂÃÂÃÂ¸ÃÂºÃÂ°</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>ÃÂ¡ÃÂÃÂ°ÃÂÃÂ¸ÃÂÃÂÃÂ¸ÃÂºÃÂ°</Text>
          <Text style={styles.placeholderSubtitle}>
            ÃÂÃÂ¾ÃÂÃÂ²ÃÂ¸ÃÂÃÂÃÂ ÃÂ² TASK_005E
          </Text>
          <Text style={styles.placeholderDetails}>
            ÃÂÃÂºÃÂ»ÃÂÃÂÃÂ¸ÃÂ: ÃÂ¼ÃÂµÃÂÃÂÃÂÃÂ½ÃÂÃÂ ÃÂ¸ ÃÂÃÂ»ÃÂÃÂ¶ÃÂµÃÂ±ÃÂ½ÃÂÃÂ ÃÂÃÂÃÂ°ÃÂÃÂ¸ÃÂÃÂÃÂ¸ÃÂºÃÂ, ÃÂ³ÃÂÃÂ°ÃÂÃÂ¸ÃÂº ÃÂÃÂÃÂµÃÂ½ÃÂ´ÃÂ° ÃÂ·ÃÂ° 12 ÃÂ¼ÃÂµÃÂÃÂÃÂÃÂµÃÂ²,{'\n'}
            ÃÂ¿ÃÂ¾ÃÂ»ÃÂ½ÃÂÃÂ ÃÂÃÂµÃÂ¿ÃÂ»ÃÂ¾ÃÂ²ÃÂÃÂ ÃÂºÃÂ°ÃÂÃÂÃÂ, ÃÂÃÂµÃÂ¼ÃÂ¿ ÃÂ¸ ÃÂ¿ÃÂÃÂ¾ÃÂ³ÃÂ½ÃÂ¾ÃÂ· ÃÂºÃÂ¾ÃÂ½ÃÂÃÂ° ÃÂ¼ÃÂµÃÂÃÂÃÂÃÂ°.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: { paddingVertical: 6, paddingRight: 12 },
  backText: { fontSize: 14, fontWeight: "600", color: COLORS.blue },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  content: { padding: 16, paddingTop: 4 },
  placeholderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholderTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  placeholderSubtitle: { fontSize: 16, fontWeight: "600", color: COLORS.accent, marginBottom: 16 },
  placeholderDetails: { fontSize: 13, color: COLORS.muted, textAlign: "center", lineHeight: 20 },
});