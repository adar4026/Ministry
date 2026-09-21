// TASK_081 — the one card surface of the «Статистика» section: the DS card
// used by /appearance and /participation (white / graphite, radius 22, the
// near-invisible shadow), optionally with the uppercase group title those
// screens put above a card. Every block of the section sits on this, so the
// screen reads as one family with the rest of Ministry.
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { DS } from "@/components/dashboard/tokens";
import { useThemedStyles } from "@/theme";

export function StatsCard({
  title,
  children,
  style,
  padded = true,
  testID,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  // Off for list-style cards whose rows carry their own insets.
  padded?: boolean;
  testID?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.group} testID={testID}>
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
    </View>
  );
}

export const makeStatsCardStyles = () => StyleSheet.create({
  group: { gap: 6 },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: DS.subInk,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
  },
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: DS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  padded: { padding: 16 },
});
const makeStyles = makeStatsCardStyles;
