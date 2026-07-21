// TASK_044 — shared settings-list row for the redesigned Profile page.
// Same visual pattern as the Hours screen's HoursNavList
// (src/components/hours/HoursNavList.tsx: icon chip, title/subtitle,
// trailing chevron, hairline divider between rows), but on the DS token set
// (src/components/dashboard/tokens.ts) so it matches Home's card system
// instead of Hours' own local palette. Renders bare rows only — the caller
// supplies the white rounded card (a SummaryCard with padding:0,
// overflow:"hidden").
import type { ComponentType } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRightIcon, type IconProps } from "@/components/icons";
import { DS } from "@/components/dashboard";

export function ProfileSettingsRow({
  icon: Icon,
  title,
  subtitle,
  value,
  onPress,
  disabled,
  busy,
  last,
  accessibilityLabel,
}: {
  icon?: ComponentType<IconProps>;
  title: string;
  subtitle?: string;
  // Static trailing text (e.g. app version) — mutually exclusive in
  // practice with a chevron, since a row with a fixed value isn't a
  // navigation target.
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
  // Shows a spinner in place of the trailing chevron/value while an async
  // action (e.g. export/import) triggered by this row is in flight.
  busy?: boolean;
  // Omits the bottom hairline divider — set on the last row of a card.
  last?: boolean;
  accessibilityLabel?: string;
}) {
  const trailing = busy ? (
    <ActivityIndicator size="small" color={DS.accent} />
  ) : value ? (
    <Text style={styles.value}>{value}</Text>
  ) : onPress ? (
    <ChevronRightIcon size={18} color={DS.chevron} />
  ) : null;

  const content = (
    <View style={[styles.row, !last && styles.rowDivider, disabled && styles.disabled]}>
      {Icon ? (
        <View style={styles.iconBg}>
          <Icon size={19} color={DS.accent} />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [pressed && !disabled && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 60,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DS.divider },
  pressed: { backgroundColor: "#F5F7FB" },
  disabled: { opacity: 0.5 },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: DS.heroBg,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "600", color: DS.navy },
  subtitle: { fontSize: 13, color: DS.subText, marginTop: 2 },
  value: { fontSize: 14, color: DS.subText, fontWeight: "600" },
});
