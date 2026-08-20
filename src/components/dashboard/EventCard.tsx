import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { categoryMeta } from "@/data/constants";
import { calendarElapsed, formatDateHuman, formatElapsedRu } from "@/data/dateFormat";
import type { CustomCategory, MinistryEvent } from "@/types";
import { DS } from "./tokens";
import { SummaryCard } from "./SummaryCard";

// A single ministry event as its own card (TASK_007). Vertically stacked by
// the caller. `onPress` is part of the API now so a future Event Details
// screen can wire navigation without changing this component; when omitted,
// the card is non-interactive.
//
// Layout (TASK_018): title sits on its own full-width row so it can truncate
// without contending for space with the badge; date + exact elapsed time
// sit below it; the category badge is pinned bottom-right, visually
// subordinate to title and metadata per the section's hierarchy.
//
// TASK_048: the date is rendered in the same human form as the upcoming
// cards ("15 июля 2026", not "15-07-2026") so Home speaks one date language,
// and date + elapsed share one wrapping row again instead of two hard-stacked
// lines — that was the single largest block of empty vertical space on these
// cards. TASK_027's actual constraint (the elapsed label must read at the
// date's size, never the title's) is unchanged; its reason for stacking was
// collision on narrow screens, which `flexWrap` now handles properly: the
// row degrades to two lines only when it genuinely does not fit.
export function EventCard({
  event,
  customCategories = [],
  onPress,
}: {
  event: MinistryEvent;
  // Optional/defaults to `[]` (TASK_045) — existing callers that only ever
  // rendered system-category events keep working unchanged.
  customCategories?: CustomCategory[];
  onPress?: (event: MinistryEvent) => void;
}) {
  const dotColor = categoryMeta(event.category, customCategories).dot;
  const elapsed = formatElapsedRu(calendarElapsed(event.date));
  return (
    <SummaryCard onPress={onPress ? () => onPress(event) : undefined} style={styles.card}>
      <View style={styles.titleRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaText}>
          <Text style={styles.date}>{formatDateHuman(event.date)}</Text>
          {/* The separator is nested INSIDE the elapsed Text, not a sibling
              of it: as a sibling it becomes its own flex item and can be
              left stranded at the end of the first line when the row wraps
              on a 320pt screen. */}
          {elapsed ? (
            <Text style={styles.elapsed}>
              <Text style={styles.separator}>· </Text>
              {elapsed}
            </Text>
          ) : null}
        </View>
        <Badge category={event.category} customCategories={customCategories} />
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  // Radius unified with the rest of the Home card system (TASK_017): no
  // override here anymore — SummaryCard's default (22) applies directly
  // (was a one-off 18 before).
  card: { padding: 13, gap: 5 },
  titleRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: "600", color: DS.navy },
  // Centered (was flex-end, TASK_027): metaText is now two stacked lines
  // instead of one, so centering keeps the badge visually balanced next to
  // the taller text block regardless of how many lines the duration wraps
  // to — badge stays in its own column, never overlapping the text.
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  // One wrapping row (TASK_048): date · elapsed side by side when they fit,
  // falling back to two lines automatically on a narrow screen or with a
  // long label. `flex: 1` keeps the badge in its own column either way.
  metaText: { flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 6 },
  // Unified with UpcomingEventRow's date typography (TASK_025) — same
  // fontSize/fontWeight/lineHeight across both event-card designs; color
  // unchanged (DS.metaText, distinct from UpcomingEventRow's COLORS.muted).
  // DS.subInk / DS.warnInk (TASK_048): the previous DS.metaText (3.03:1)
  // and DS.durationAccent (3.18:1) both failed WCAG AA on the white card.
  date: { fontSize: 14, fontWeight: "400", lineHeight: 18, color: DS.subInk },
  separator: { fontSize: 14, lineHeight: 18, color: DS.chevron },
  // Same fontSize/lineHeight as `date` (TASK_027 — owner's explicit
  // requirement: duration must read at the same size as the date, never as
  // large as the title); distinguished only by weight and the warm amber
  // accent color instead of a red that would read as an error/overdue state.
  elapsed: { fontSize: 14, fontWeight: "600", lineHeight: 18, color: DS.warnInk },
});
