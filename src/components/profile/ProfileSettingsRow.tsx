// TASK_044 — shared settings-list row for the redesigned Profile page.
// Same visual pattern as the Hours screen's HoursNavList
// (src/components/hours/HoursNavList.tsx: icon chip, title/subtitle,
// trailing chevron, hairline divider between rows), but on the DS token set
// (src/components/dashboard/tokens.ts) so it matches Home's card system
// instead of Hours' own local palette. Renders bare rows only — the caller
// supplies the white rounded card (a SummaryCard with padding:0,
// overflow:"hidden").
//
// TASK_066 — a second look, "drawer", for the Home drawer's glass cards on
// the mint hero scene: a thin MINISTRY.ink line icon with no coloured tile
// (Finance's graphite drawer rows), ink/ink2 text, a softer chevron and a
// divider indented past the icon. Chosen through ProfileRowVariantContext,
// not a prop, so composite consumers such as BackupSection render the right
// look wherever they are placed without threading anything through.
import { createContext, useContext, type ComponentType } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRightIcon, type IconProps } from "@/components/icons";
import { DS, MINISTRY } from "@/components/dashboard/tokens";

export type ProfileRowVariant = "card" | "drawer";
export const ProfileRowVariantContext = createContext<ProfileRowVariant>("card");

// Chevron tint on the drawer's translucent surface — ink at 35 % reads as
// a quiet affordance on every band of the mint gradient.
const DRAWER_CHEVRON = "rgba(15,42,38,0.35)";

export function ProfileSettingsRow({
  icon: Icon,
  title,
  subtitle,
  value,
  onPress,
  disabled,
  busy,
  last,
  tone = "default",
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
  // TASK_062 — "danger" paints the icon chip and title in the app's warning
  // red, for a destructive action (restoring a backup replaces every record
  // on this device). Purely visual; the row behaves identically.
  tone?: "default" | "danger";
  accessibilityLabel?: string;
}) {
  const variant = useContext(ProfileRowVariantContext);
  const drawer = variant === "drawer";
  const danger = tone === "danger";
  const iconColor = danger ? DS.danger : drawer ? MINISTRY.ink : DS.accent;
  const trailing = busy ? (
    <ActivityIndicator size="small" color={danger ? DS.danger : drawer ? MINISTRY.primary : DS.accent} />
  ) : value ? (
    <Text style={[styles.value, drawer && styles.valueDrawer]}>{value}</Text>
  ) : onPress ? (
    <ChevronRightIcon size={18} color={drawer ? DRAWER_CHEVRON : DS.chevron} />
  ) : null;

  const content = (
    <View
      style={[
        styles.row,
        drawer && styles.rowDrawer,
        !last && (drawer ? styles.rowDividerDrawer : styles.rowDivider),
        disabled && styles.disabled,
      ]}
    >
      {Icon ? (
        drawer ? (
          <View style={styles.iconPlain}>
            <Icon size={21} color={iconColor} />
          </View>
        ) : (
          <View style={[styles.iconBg, danger && styles.iconBgDanger]}>
            <Icon size={19} color={iconColor} />
          </View>
        )
      ) : null}
      <View style={styles.textWrap}>
        {/* Drawer rows are narrower (86 % panel): let a long title such as
            «Создать резервную копию» wrap to a second line rather than
            truncate — the row is allowed to grow, nothing is clipped. */}
        <Text style={[styles.title, drawer && styles.titleDrawer, danger && styles.titleDanger]} numberOfLines={drawer ? 2 : 1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, drawer && styles.subtitleDrawer]} numberOfLines={2}>
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
      style={({ pressed }) => [pressed && !disabled && (drawer ? styles.pressedDrawer : styles.pressed)]}
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
  // Drawer rows: a touch tighter horizontally (the panel is 86 % of the
  // screen) but never below 56 pt tall — comfortably above the 44 pt
  // touch-target floor.
  rowDrawer: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 56, gap: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DS.divider },
  rowDividerDrawer: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(15,42,38,0.12)" },
  pressed: { backgroundColor: "#F5F7FB" },
  pressedDrawer: { backgroundColor: "rgba(255,255,255,0.55)" },
  disabled: { opacity: 0.5 },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: DS.heroBg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBgDanger: { backgroundColor: "#fee2e2" },
  // No tile in the drawer — just a fixed-width slot so titles align.
  iconPlain: { width: 30, height: 30, alignItems: "center", justifyContent: "center", opacity: 0.82 },
  textWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "600", color: DS.navy },
  titleDrawer: { color: MINISTRY.ink, letterSpacing: -0.15 },
  titleDanger: { color: DS.danger },
  subtitle: { fontSize: 13, color: DS.subText, marginTop: 2 },
  subtitleDrawer: { color: MINISTRY.ink2 },
  value: { fontSize: 14, color: DS.subText, fontWeight: "600" },
  valueDrawer: { color: MINISTRY.ink2 },
});
