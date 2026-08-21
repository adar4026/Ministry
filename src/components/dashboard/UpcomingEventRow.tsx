import { Badge } from "@/components/Badge";
import { EventListCard } from "@/components/timeline/EventListCard";
import { StaticCardShell } from "@/components/timeline/StaticCardShell";
import { TalkBadge } from "@/components/timeline/TalkBadge";
import { categoryMeta, TALK_CATEGORY, type UpcomingItem } from "@/data/constants";
import type { CustomCategory } from "@/types";

// TASK_056: thin adapter over the shared EventListCard (the "События"
// screen's card, see src/components/timeline/EventListCard.tsx) for a
// combined event+talk UpcomingItem — used by Home's "Ближайшие события"
// and the dedicated /upcoming-events screen, so both share the exact same
// card as the Events timeline instead of their own previous title-only
// design (dot, edit icon, badge, DD-MM-YYYY date and the
// через/прошло-N-мес.-N-дн. relative format all come from EventListCard
// now).
export function UpcomingEventRow({
  item,
  customCategories = [],
  onEdit,
}: {
  item: UpcomingItem;
  customCategories?: CustomCategory[];
  // TASK_056 — opens EventForm/TalkForm in a Modal at the call site;
  // omitted means no edit icon.
  onEdit?: (item: UpcomingItem) => void;
}) {
  const isTalk = item.kind === "talk";
  const dotColor = isTalk ? TALK_CATEGORY.dot : categoryMeta(item.event.category, customCategories).dot;
  const badge = isTalk ? (
    <TalkBadge />
  ) : (
    <Badge category={item.event.category} customCategories={customCategories} />
  );
  const metaSuffix = isTalk
    ? `${item.talk.location ? `  —  ${item.talk.location}` : ""}${item.talk.number ? `  ·  №${item.talk.number}` : ""}`
    : "";

  return (
    <StaticCardShell>
      <EventListCard
        dotColor={dotColor}
        title={item.title}
        date={item.date}
        metaSuffix={metaSuffix}
        badge={badge}
        onEdit={onEdit ? () => onEdit(item) : undefined}
        editAccessibilityLabel={`Редактировать: ${item.title}`}
      />
    </StaticCardShell>
  );
}
