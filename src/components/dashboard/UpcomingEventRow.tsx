import { StyleSheet, Text, View } from "react-native";
import type { UpcomingItem } from "@/data/constants";
import { upcomingDateLabel, type UpcomingUrgency } from "@/data/dateFormat";
import { DS } from "./tokens";
import { SummaryCard } from "./SummaryCard";

// Urgency -> color. Every one of these is AA-contrast on the white card
// (see tokens.ts), and — importantly — color is never the only signal: the
// label text itself ("Просрочено" / "Сегодня" / "Завтра" / "Через N дней")
// states the urgency in words.
const URGENCY_COLOR: Record<UpcomingUrgency, string> = {
  overdue: DS.danger, // error
  today: DS.warnInk, // warning accent
  tomorrow: DS.tealInk, // softer accent
  soon: DS.tealInk,
  later: DS.subInk, // neutral secondary
};

// One combined event+talk upcoming item (TASK_007's UpcomingEventsCard
// preview, TASK_019's dedicated /upcoming-events screen). Presentational
// only — extracted so both call sites share the exact same card instead of
// duplicating this JSX/styling.
// Independent card (TASK_021): built on the same SummaryCard primitive as
// "Последние события"'s EventCard, instead of a plain row separated from
// its neighbor by a bottom border — the caller stacks these with a small
// gap, no divider between items.
//
// TASK_048 — two lines instead of three:
//   1. the event's own title, and nothing else. The title is never
//      concatenated with a date or an amount, and nothing is ever parsed
//      back out of it (MinistryEvent has no amount/currency fields —
//      see TASK_048 §3.2 — and regex-scraping a free-text title was
//      explicitly ruled out).
//   2. one status line: a human relative phrase, plus the calendar date
//      only when it adds something the phrase doesn't already say.
// The technical "20-08-2026" form is gone from this card; formatDateDMY()
// stays canonical everywhere outside Home (TASK_022).
export function UpcomingEventRow({ item }: { item: UpcomingItem }) {
  const label = upcomingDateLabel(item.date);
  return (
    <SummaryCard style={styles.card}>
      <Text style={styles.itemTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.statusRow}>
        <Text style={[styles.relative, { color: URGENCY_COLOR[label.urgency] }]}>{label.primary}</Text>
        {label.secondary ? (
          <>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.date} numberOfLines={1}>
              {label.secondary}
            </Text>
          </>
        ) : null}
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  // Tighter than SummaryCard's default 16 (TASK_048 density pass) — the
  // card lost a whole text line, so it no longer needs the extra padding to
  // look balanced.
  card: { padding: 14 },
  itemTitle: { fontSize: 16, lineHeight: 21, fontWeight: "600", color: DS.navy },
  // flexWrap so a long "Через 30 дней · 19 сентября" degrades to two lines
  // on a narrow screen instead of clipping the date.
  statusRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 3, columnGap: 6 },
  relative: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
  separator: { fontSize: 14, lineHeight: 19, color: DS.chevron },
  date: { fontSize: 14, lineHeight: 19, fontWeight: "400", color: DS.subInk },
});
