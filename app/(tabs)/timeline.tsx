import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { ChipSelector, TextField } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { EventForm } from "@/components/forms/EventForm";
import { TalkForm } from "@/components/forms/TalkForm";
import {
  CAT,
  CATEGORY_KEYS,
  COLORS,
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

const FILTER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: TALK_FILTER, label: "Публичные речи" },
  ...CATEGORY_KEYS.map((k) => ({ value: k as string, label: CAT[k].label })),
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
    <ScrollView contentContainerStyle={styles.content}>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Поиск..."
        style={styles.search}
      />
      <View style={styles.filter}>
        <ChipSelector options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      </View>

      <View style={styles.timeline}>
        <View style={styles.rail} />
        {items.map((it) =>
          it.kind === "event" ? (
            <View key={`e-${it.id}`} style={styles.row}>
              <View style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: (CAT[it.ev.category] ?? CAT.other).dot, borderColor: (CAT[it.ev.category] ?? CAT.other).dot }]} />
              </View>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{it.ev.title}</Text>
                  <View style={styles.cardActions}>
                    <Badge category={it.ev.category} />
                    <Pressable onPress={() => setEditEv(it.ev)} hitSlop={8}>
                      <Text style={styles.edit}>✏</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.date}>{formatDateDMY(it.date)}</Text>
                <Text style={styles.elapsed}>{timeElapsed(it.date)}</Text>
              </View>
            </View>
          ) : (
            <View key={`t-${it.id}`} style={styles.row}>
              <View style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: TALK_CATEGORY.dot, borderColor: TALK_CATEGORY.dot }]} />
              </View>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{talkTitle(it.talk)}</Text>
                  <View style={styles.cardActions}>
                    <View style={[styles.talkBadge, { backgroundColor: TALK_CATEGORY.bg }]}>
                      <Text style={[styles.talkBadgeText, { color: TALK_CATEGORY.tx }]}>{TALK_CATEGORY.label}</Text>
                    </View>
                    <Pressable onPress={() => setEditTalk(it.talk)} hitSlop={8}>
                      <Text style={styles.edit}>✏</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.date}>
                  {formatDateDMY(it.date)}
                  {it.talk.location ? `  —  ${it.talk.location}` : ""}
                  {it.talk.number ? `  ·  №${it.talk.number}` : ""}
                </Text>
                <Text style={styles.elapsed}>{timeElapsed(it.date)}</Text>
              </View>
            </View>
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
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  search: { marginBottom: 10 },
  filter: { marginBottom: 14 },
  timeline: { position: "relative" },
  rail: { position: "absolute", left: 14, top: 4, bottom: 4, width: 2, backgroundColor: COLORS.border },
  row: { flexDirection: "row", gap: 14, marginBottom: 14 },
  dotCol: { width: 30, alignItems: "center", paddingTop: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  title: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.text },
  edit: { fontSize: 15, color: COLORS.muted },
  date: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  elapsed: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  talkBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20, alignSelf: "flex-start" },
  talkBadgeText: { fontSize: 11, fontWeight: "700" },
});
