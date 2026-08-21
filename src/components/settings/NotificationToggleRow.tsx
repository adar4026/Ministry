// TASK_059 — settings row with a trailing switch, for the "Уведомления"
// screen.
//
// Deliberately a sibling of ProfileSettingsRow rather than a new `trailing`
// prop on it: that component's trailing slot is a closed three-way choice
// (spinner / value / chevron) and it is shared by Profile and BackupSection,
// which this task must not touch. The row metrics below (18/14 padding,
// 60 min height, 36px icon chip, hairline divider) are copied from it on
// purpose so both cards line up pixel-for-pixel inside a SummaryCard.
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { IconProps } from "@/components/icons";
import { DS } from "@/components/dashboard";

export function NotificationToggleRow({
  icon: Icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  last,
}: {
  icon?: ComponentType<IconProps>;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const toggle = () => {
    if (!disabled) onValueChange(!value);
  };

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={({ pressed }) => [pressed && !disabled && styles.pressed]}
    >
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
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: DS.segOff, true: DS.accent }}
          thumbColor={DS.onAccent}
          ios_backgroundColor={DS.segOff}
        />
      </View>
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
  subtitle: { fontSize: 13, color: DS.subInk, marginTop: 2 },
});
