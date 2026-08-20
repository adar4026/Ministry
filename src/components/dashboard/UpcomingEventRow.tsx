import { StyleSheet, Text, View } from "react-native";
import type { UpcomingItem } from "@/data/constants";
import { pluralDaysRu, upcomingDateLabel, type UpcomingUrgency } from "@/data/dateFormat";
import { DS } from "./tokens";
import { SummaryCard } from "./SummaryCard";

// Urgency -> color. Every one of these is AA-contrast on the white card
// (see tokens.ts), and — importantly — color is never the only signal: the
// label text itself ("Просрочено" / "Сегодня" / "Завтра" / "Через N дней")
// states the urgency in words.
// TASK_049 — 5-tier owner scale: overdue (red) / today (orange) /
// tomorrow+soon, i.e. 1-7 days (amber) / upcoming, i.e. 8-30 days (brand
// accent blue) / later, i.e. >30 days (neutral gray-blue).
// TASK_050: "soon"/"upcoming" no longer read this map — a "Через N дней"
// row (label.days != null) always renders navy words + an orange number
// instead (see render below), regardless of urgency tier. The two entries
// stay for Record<UpcomingUrgency, string> completeness (every urgency the
// type can produce needs a fallback color) but are unreachable in practice.
const URGENCY_COLOR: Record<UpcomingUrgency, string> = {
  overdue: DS.danger, // red
  today: DS.todayInk, // orange
  tomorrow: DS.warnInk, // amber
  soon: DS.warnInk, // unreachable — see TASK_050 note above
  upcoming: DS.accentInk, // unreachable — see TASK_050 note above
  later: DS.subInk, // neutral gray-blue
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
        {/* TASK_051: absolute date first, then "·", then the relative
            phrase — e.g. "4 сентября · Через 15 дней", not the reverse. */}
        {label.secondary ? (
          <>
            <Text style={styles.date} numberOfLines={1}>
              {label.secondary}
            </Text>
            <Text style={styles.separator}>·</Text>
          </>
        ) : null}
        {label.days != null ? (
          // TASK_050: "Через N дней" — the words stay the interface's main
          // dark navy (not an urgency accent), only the number is orange.
          // The literal "Через "/pluralDaysRu(...) wording here must match
          // upcomingDateLabel()'s `primary` string exactly — accessibility
          // relies on that (see accessibilityLabel below), not on re-parsing.
          <Text style={[styles.relative, styles.relativeWords]} accessibilityLabel={label.primary}>
            {"Через "}
            <Text style={styles.relativeNumber}>{String(label.days)}</Text>
            {` ${pluralDaysRu(label.days)}`}
          </Text>
        ) : (
          <Text style={[styles.relative, { color: URGENCY_COLOR[label.urgency] }]}>{label.primary}</Text>
        )}
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
  // flexWrap so a long "19 сентября · Через 30 дней" degrades to two lines
  // on a narrow screen instead of clipping the date.
  statusRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 3, columnGap: 6 },
  relative: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
  // TASK_050: main interface dark navy for the "Через"/plural-day words in
  // a "Через N дней" row — distinct from the orange used on the number.
  relativeWords: { color: DS.navy },
  relativeNumber: { color: DS.todayInk },
  separator: { fontSize: 14, lineHeight: 19, color: DS.chevron },
  date: { fontSize: 14, lineHeight: 19, fontWeight: "400", color: DS.subInk },
});
