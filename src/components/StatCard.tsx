import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/data/constants";

export function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 130,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  value: { fontSize: 24, fontWeight: "700", color: COLORS.text },
});
