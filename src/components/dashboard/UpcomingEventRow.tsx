import { StyleSheet, Text, View } from "react-native";
import { COLORS, formatDateDMY, relativeDays, type UpcomingItem } from "@/data/constants";
import { DS } from "./tokens";
import { SummaryCard } from "./SummaryCard";

// One combined event+talk upcoming item (TASK_007's UpcomingEventsCard
// preview, TASK_019's dedicated /upcoming-events screen). Presentational
// only — extracted so both call sites share the exact same card instead of
// duplicating this JSX/styling.
// Independent card (TASK_021): built on the same SummaryCard primitive as
// "Последние события"'s EventCard, instead of a plain row separated from
// its neighbor by a bottom border — the caller stacks these with a small
// gap, no divider between items.
// Three stacked lines (TASK_027, was title + one row with date/duration side
// by side): title, then date, then the remaining-time label directly below
// it, sharing the date's left edge — each line has the full card width to
// itself, so a long calendar-based label ("Через 11 месяцев 29 дней") wraps
// on its own instead of needing a width cap to avoid colliding with the date.
export function UpcomingEventRow({ item }: { item: UpcomingItem }) {
  return (
    <SummaryCard>
      <Text style={styles.itemTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={styles.date}>{formatDateDMY(item.date)}</Text>
        <Text style={styles.relative}>{relativeDays(item.date)}</Text>
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  itemTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  bottomRow: { flexDirection: "column", marginTop: 4, gap: 2 },
  // Reference typography for the full DD-MM-YYYY date across event cards
  // (TASK_025) — EventCard's date is unified to match this exactly.
  date: { fontSize: 14, fontWeight: "400", lineHeight: 19, color: COLORS.muted },
  // Same fontSize/lineHeight as `date` (TASK_027 — owner's explicit
  // requirement: duration must read at the same size as the date, never as
  // large as the title); distinguished only by weight and the warm amber
  // accent color instead of the previous bold blue, which read too close to
  // a link/primary-action color for a passive countdown label.
  relative: { fontSize: 14, fontWeight: "600", lineHeight: 19, color: DS.durationAccent },
});
