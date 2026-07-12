import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/data/constants";

// Biographical header shown above every tab (values are static profile facts,
// matching the web prototype).
const FACTS: [string, string][] = [
  ["Крещён", "12.04.1992"],
  ["Пионер с", "Март 2008"],
  ["Стаж", "17 лет 9 мес."],
  ["G-8", "до 12.03.2027"],
];

export function Header() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>ЖУРНАЛ СЛУЖЕНИЯ</Text>
      <Text style={styles.name}>Алексей Ткач</Text>
      <View style={styles.facts}>
        {FACTS.map(([label, value]) => (
          <View key={label}>
            <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
            <Text style={styles.factValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  kicker: { fontSize: 10, letterSpacing: 3, color: COLORS.muted, marginBottom: 6 },
  name: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginTop: 14 },
  factLabel: { fontSize: 9, letterSpacing: 1, color: COLORS.muted },
  factValue: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginTop: 1 },
});
