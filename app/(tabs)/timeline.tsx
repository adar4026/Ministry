import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { ChipSelector, TextField } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { EventForm } from "@/components/forms/EventForm";
import { TalkForm } from "@/components/forms/TalkForm";
import { SwipeableDeleteRow } from "@/components/timeline/SwipeableDeleteRow";
import { TIMELINE_COLORS } from "@/components/timeline/timelineTokens";
import { DS, HomeBackground } from "@/components/dashboard";
import {
  CAT,
  CATEGORY_KEYS,
  TALK_CATEGORY,
  formatDateDMY,
  talkTitle,
  timeElapsed,
} from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { MinistryEvent, Talk } from "@/types";

// "talk" is a synthetic filter/category for public talks in the combined
// timeline; it is not part of the MinistryEvent category enum.
const TALK_FILTER = "talk";

// TASK_041 — these label overrides are local to this page's top filter row.
// The shared CAT dictionary (src/data/constants.ts) keeps its original
// singular labels, since it also drives Badge (shown on this same page and
// on the Home dashboard) and EventForm's category picker (shown on this page
// AND on /add) — renaming CAT itself would silently reskin those other
// surfaces too. A plural filter label next to a singular per-item badge is
// already an existing pattern here: "Публичные речи" (filter) vs
// "Публичная речь" (TALK_CATEGORY.label, the per-item badge).
const FILTER_LABEL_OVERRIDES: Partial<Record<string, string>> = {
  appointment: "Назначения",
  school: "Школы",
};

const FILTER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: TALK_FILTER, label: "Публичные" },
  ...CATEGORY_KEYS.map((k) => ({
    value: k as string,
    label: FILTER_LABEL_OVERRIDES[k] ?? CAT[k].label,
  })),
];

type TimelineItem =
  | { kind: "event"; id: string; date: string; ev: MinistryEvent }
  | { kind: "talk"; id: string; date: string; talk: Talk };

export default function TimelineScreen() {
  const { events, talks, saveEvent, deleteEvent, saveTalk, deleteTalk } = useStore();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [editEv, setEditEv] = useState<MinistryEvent | null>(null);
  const [editTalk, setEditTalk] = useState<Talk | null>(null);

  // Combine events + talks at the UI layer only; both collections stay separate.
  const items = useMemo<TimelineItem[]>(() => {
    const q = query.trim().toLowerCase();
    const eventItems: TimelineItem[] =
      filter === TALK_FILTER
        ? []
        : events
            .filter((e) => filter === "all" || e.category === filter)
            .map((e) => ({ kind: "event", id: e.id, date: e.date, ev: e }));
    const talkItems: TimelineItem[] =
      filter === "all" || filter === TALK_FILTER
        ? talks.map((t) => ({ kind: "talk", id: t.id, date: t.date, talk: t }))
        : [];

    return [...eventItems, ...talkItems]
      .filter((it) => {
        if (!q) return true;
        const title = it.kind === "event" ? it.ev.title : talkTitle(it.talk);
        return title.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [events, talks, filter, query]);

  function confirmDeleteEvent(id: string) {
    Alert.alert("Удалить событие?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteEvent(id); setEditEv(null); } },
    ]);
  }

  function confirmDeleteTalk(id: string) {
    Alert.alert("Удалить речь?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteTalk(id); setEditTalk(null); } },
    ]);
  }

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск..."
          style={styles.search}
        />
        <View style={styles.filter}>
          <ChipSelector
            options={FILTER_OPTIONS}
            value={filter}
            onChange={setFilter}
            idleTextColor={TIMELINE_COLORS.topicText}
          />
        </View>

        <View style={styles.list}>
          {items.length === 0 ? <Text style={styles.empty}>Нет событий</Text> : null}
          {items.map((it) =>
            it.kind === "event" ? (
              <SwipeableDeleteRow
                key={`e-${it.id}`}
                onDelete={() => deleteEvent(it.id)}
                deleteAccessibilityLabel={`Удалить событие: ${it.ev.title}`}
              >
                <View style={styles.card}>
                  <View style={styles.titleRow}>
                    <View style={[styles.dot, { backgroundColor: (CAT[it.ev.category] ?? CAT.other).dot }]} />
                    <Text style={styles.title} numberOfLines={1}>{it.ev.title}</Text>
                    <Pressable onPress={() => setEditEv(it.ev)} hitSlop={8}>
                      <Text style={styles.edit}>✏</Text>
                    </Pressable>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaText}>
                      <Text style={styles.date}>{formatDateDMY(it.date)}</Text>
                      <Text style={styles.elapsed}>{timeElapsed(it.date)}</Text>
                    </View>
                    <Badge category={it.ev.category} />
                  </View>
                </View>
              </SwipeableDeleteRow>
            ) : (
              <SwipeableDeleteRow
                key={`t-${it.id}`}
                onDelete={() => deleteTalk(it.id)}
                deleteAccessibilityLabel={`Удалить речь: ${talkTitle(it.talk)}`}
              >
                <View style={styles.card}>
                  <View style={styles.titleRow}>
                    <View style={[styles.dot, { backgroundColor: TALK_CATEGORY.dot }]} />
                    <Text style={styles.title} numberOfLines={1}>{talkTitle(it.talk)}</Text>
                    <Pressable onPress={() => setEditTalk(it.talk)} hitSlop={8}>
                      <Text style={styles.edit}>✏</Text>
                    </Pressable>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaText}>
                      <Text style={styles.date}>
                        {formatDateDMY(it.date)}
                        {it.talk.location ? `  —  ${it.talk.location}` : ""}
                        {it.talk.number ? `  ·  №${it.talk.number}` : ""}
                      </Text>
                      <Text style={styles.elapsed}>{timeElapsed(it.date)}</Text>
                    </View>
                    <View style={[styles.talkBadge, { backgroundColor: TALK_CATEGORY.bg }]}>
                      <Text style={[styles.talkBadgeText, { color: TALK_CATEGORY.tx }]}>{TALK_CATEGORY.label}</Text>
                    </View>
                  </View>
                </View>
              </SwipeableDeleteRow>
            ),
          )}
        </View>

        <Modal visible={editEv !== null} title="Редактировать событие" onClose={() => setEditEv(null)}>
          {editEv && (
            <EventForm
              initial={editEv}
              onSave={(input) => { saveEvent(input); setEditEv(null); }}
              onDelete={() => confirmDeleteEvent(editEv.id)}
            />
          )}
        </Modal>

        <Modal visible={editTalk !== null} title="Редактировать речь" onClose={() => setEditTalk(null)}>
          {editTalk && (
            <TalkForm
              initial={editTalk}
              onSave={(input) => { saveTalk(input); setEditTalk(null); }}
              onDelete={() => confirmDeleteTalk(editTalk.id)}
            />
          )}
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // TASK_041 (revised) — same background mechanism as Home
  // (app/(tabs)/index.tsx): DS.homeBase as the flat base color, with
  // <HomeBackground /> layering its gradient on top. No page-local
  // background color — this page no longer has one of its own.
  screen: { flex: 1, backgroundColor: DS.homeBase },
  content: { padding: 16, paddingBottom: 32 },
  search: { marginBottom: 10 },
  filter: { marginBottom: 14 },
  list: { gap: 12 },
  empty: { textAlign: "center", color: DS.subText, fontSize: 14, marginTop: 24 },
  card: {
    backgroundColor: TIMELINE_COLORS.cardBackground,
    padding: 14,
    gap: 8,
  },
  titleRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontSize: 16, fontWeight: "600", color: TIMELINE_COLORS.primaryText },
  edit: { fontSize: 15, color: TIMELINE_COLORS.secondaryText, paddingLeft: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  metaText: { flex: 1, flexDirection: "column", gap: 2 },
  date: { fontSize: 14, color: TIMELINE_COLORS.secondaryText },
  elapsed: { fontSize: 14, fontWeight: "600", color: TIMELINE_COLORS.durationAccent },
  talkBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20, alignSelf: "flex-start" },
  talkBadgeText: { fontSize: 11, fontWeight: "700" },
});
