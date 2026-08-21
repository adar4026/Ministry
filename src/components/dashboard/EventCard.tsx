import { Badge } from "@/components/Badge";
import { EventListCard } from "@/components/timeline/EventListCard";
import { StaticCardShell } from "@/components/timeline/StaticCardShell";
import { categoryMeta } from "@/data/constants";
import type { CustomCategory, MinistryEvent } from "@/types";

// TASK_056: thin adapter over the shared EventListCard (the "События"
// screen's card, see src/components/timeline/EventListCard.tsx) for a plain
// MinistryEvent — used by Home's "Последние события". Structure, date
// format, relative-time format/color and edit icon now come from that one
// shared implementation instead of this component's own (removed) styling.
export function EventCard({
  event,
  customCategories = [],
  onEdit,
}: {
  event: MinistryEvent;
  // Optional/defaults to `[]` (TASK_045) — existing callers that only ever
  // rendered system-category events keep working unchanged.
  customCategories?: CustomCategory[];
  // TASK_056 — opens EventForm in a Modal at the call site; omitted means
  // no edit icon (matches EventListCard's own onEdit contract).
  onEdit?: (event: MinistryEvent) => void;
}) {
  return (
    <StaticCardShell>
      <EventListCard
        dotColor={categoryMeta(event.category, customCategories).dot}
        title={event.title}
        date={event.date}
        badge={<Badge category={event.category} customCategories={customCategories} />}
        onEdit={onEdit ? () => onEdit(event) : undefined}
        editAccessibilityLabel={`Редактировать событие: ${event.title}`}
      />
    </StaticCardShell>
  );
}
