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
      <Text style={styles.name}>Ткач Алексей Викторович</Text>
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
  wrap: { backgroundColor: COLORS.navy, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 },
  kicker: { fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.5)", marginBottom: 6 },
  name: { color: "#fff", fontSize: 22, fontWeight: "800" },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginTop: 14 },
  factLabel: { fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.55)" },
  factValue: { fontSize: 13, fontWeight: "700", color: "#fff", marginTop: 1 },
});
